import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { Check, Loader2, PenLine, Send, X } from "lucide-react";
import { SignaturePicker, type SignatureMetadata } from "@/components/shift-tickets/SignaturePicker";
import { type BoxRect, type PageAnchors, getOf286PageAnchorsFromUrl } from "@/lib/pdf-sign";

type FieldKey = "signature" | "date" | "name";

interface OF286SigningReviewProps {
  open: boolean;
  sourceUrl: string | null;
  defaultName: string;
  returningToSender: boolean;
  onClose: () => void;
  onComplete: (payload: {
    signatureBlob: Blob;
    metadata: SignatureMetadata;
    signerName: string;
    dateText: string;
    placements: { signatureBox: BoxRect; dateBox: BoxRect; nameBox: BoxRect };
    placementsByPage: { signatureBox: BoxRect; dateBox: BoxRect; nameBox: BoxRect }[];
  }) => void;
}

function formatToday() {
  return new Date().toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
}

function overlayStyle(box: BoxRect, page: PageAnchors, scale: number) {
  return {
    left: box.x * scale,
    top: (page.pageHeight - box.y - box.h) * scale,
    width: box.w * scale,
    height: box.h * scale,
  };
}

export function OF286SigningReview({
  open,
  sourceUrl,
  defaultName,
  returningToSender,
  onClose,
  onComplete,
}: OF286SigningReviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRefs = useRef<Record<number, HTMLCanvasElement | null>>({});
  const [loading, setLoading] = useState(false);
  const [anchors, setAnchors] = useState<PageAnchors[]>([]);
  const [scales, setScales] = useState<Record<number, number>>({});
  const [signerName, setSignerName] = useState(defaultName);
  const [dateText, setDateText] = useState(formatToday());
  const [signatureBlob, setSignatureBlob] = useState<Blob | null>(null);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [activeField, setActiveField] = useState<FieldKey | null>(null);
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [metadata, setMetadata] = useState<SignatureMetadata>({ method: "typed", name: defaultName });

  useEffect(() => {
    if (!open) return;
    setSignerName(defaultName);
    setDateText(formatToday());
    setSignatureBlob(null);
    setSignatureUrl(null);
    setActiveField(null);
    setMetadata({ method: "typed", name: defaultName });
  }, [open, defaultName]);

  useEffect(() => {
    if (!open || !sourceUrl) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [pdf, foundAnchors] = await Promise.all([
          pdfjsLib.getDocument({ url: sourceUrl }).promise,
          getOf286PageAnchorsFromUrl(sourceUrl),
        ]);
        if (cancelled) return;
        setAnchors(foundAnchors);
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        if (cancelled) return;

        const availableWidth = Math.max(320, (containerRef.current?.clientWidth ?? 640) - 24);
        const nextScales: Record<number, number> = {};
        for (let i = 0; i < pdf.numPages; i++) {
          const page = await pdf.getPage(i + 1);
          const baseViewport = page.getViewport({ scale: 1 });
          const scale = Math.min(1.75, availableWidth / baseViewport.width);
          nextScales[i] = scale;
          const viewport = page.getViewport({ scale });
          const canvas = canvasRefs.current[i];
          if (!canvas) continue;
          const dpr = window.devicePixelRatio || 1;
          canvas.width = viewport.width * dpr;
          canvas.height = viewport.height * dpr;
          canvas.style.width = `${viewport.width}px`;
          canvas.style.height = `${viewport.height}px`;
          const ctx = canvas.getContext("2d");
          if (!ctx) continue;
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          await page.render({ canvas, canvasContext: ctx, viewport }).promise;
        }
        if (!cancelled) setScales(nextScales);
      } catch (err) {
        console.error("OF-286 preview failed", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [open, sourceUrl]);

  useEffect(() => {
    return () => {
      if (signatureUrl) URL.revokeObjectURL(signatureUrl);
    };
  }, [signatureUrl]);

  if (!open) return null;

  const firstPage = anchors[0];
  const canSend = !!signatureBlob && signerName.trim().length > 0 && dateText.trim().length > 0 && !!firstPage?.signatureBox && !!firstPage?.dateBox && !!firstPage?.nameBox;

  const handleSignatureSave = (blob: Blob, sigMetadata: SignatureMetadata) => {
    if (signatureUrl) URL.revokeObjectURL(signatureUrl);
    setSignatureBlob(blob);
    setSignatureUrl(URL.createObjectURL(blob));
    setMetadata(sigMetadata);
    setSignatureOpen(false);
    setActiveField(null);
  };

  const handleComplete = () => {
    if (!signatureBlob || !firstPage?.signatureBox || !firstPage.dateBox || !firstPage.nameBox) return;
    const placementsByPage = anchors
      .filter((page) => page.signatureBox && page.dateBox && page.nameBox)
      .map((page) => ({
        signatureBox: page.signatureBox!,
        dateBox: page.dateBox!,
        nameBox: page.nameBox!,
      }));
    onComplete({
      signatureBlob,
      metadata,
      signerName: signerName.trim(),
      dateText: dateText.trim(),
      placements: {
        signatureBox: firstPage.signatureBox,
        dateBox: firstPage.dateBox,
        nameBox: firstPage.nameBox,
      },
      placementsByPage,
    });
  };

  const allFilled = !!signatureBlob && signerName.trim().length > 0 && dateText.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background pt-[var(--app-safe-top)] pb-[var(--app-safe-bottom)]">
      <div className="flex min-h-14 items-center justify-between border-b border-border px-3 py-2">
        <button onClick={onClose} className="flex min-h-11 items-center gap-1 rounded-lg pr-2 text-sm text-muted-foreground active:bg-accent/30">
          <X className="h-5 w-5" /> Cancel
        </button>
        <div className="text-center">
          <p className="text-sm font-bold">Review & sign OF-286</p>
          <p className="text-[10px] text-muted-foreground">
            {allFilled ? "Review your entries below, then return" : "Tap the highlighted fields"}
          </p>
        </div>
        <div className="min-w-[64px]" />
      </div>

      <div ref={containerRef} className="flex-1 overflow-y-auto bg-muted/40 px-3 py-4">
        {loading && (
          <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading OF-286…
          </div>
        )}
        <div className="mx-auto space-y-4">
          {(anchors.length > 0 ? anchors : [{ pageIndex: 0, pageWidth: 612, pageHeight: 792 } as PageAnchors]).map((page) => {
            const scale = scales[page.pageIndex] ?? 1;
            return (
              <div key={page.pageIndex} className="mx-auto w-fit overflow-hidden rounded-sm bg-card shadow-lg">
                <div className="relative">
                  <canvas ref={(el) => { canvasRefs.current[page.pageIndex] = el; }} className="block bg-card" />

                  {page.signatureBox && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveField("signature");
                        setSignatureOpen(true);
                      }}
                      className={`absolute border-2 border-primary bg-primary/10 text-left active:bg-primary/20 ${activeField === "signature" ? "ring-2 ring-primary" : ""}`}
                      style={overlayStyle(page.signatureBox, page, scale)}
                    >
                      {signatureUrl ? (
                        <img src={signatureUrl} alt="Signature preview" className="h-full w-full object-contain" />
                      ) : (
                        <span className="flex h-full items-center justify-center gap-1 text-[10px] font-bold text-primary">
                          <PenLine className="h-3 w-3" /> Sign
                        </span>
                      )}
                    </button>
                  )}

                  {page.dateBox && (
                    <button
                      type="button"
                      onClick={() => setActiveField("date")}
                      className={`absolute border-2 border-primary bg-primary/10 px-1 text-left text-[11px] font-semibold text-foreground active:bg-primary/20 ${activeField === "date" ? "ring-2 ring-primary" : ""}`}
                      style={overlayStyle(page.dateBox, page, scale)}
                    >
                      {dateText || "Date"}
                    </button>
                  )}

                  {page.nameBox && (
                    <button
                      type="button"
                      onClick={() => setActiveField("name")}
                      className={`absolute border-2 border-primary bg-primary/10 px-1 text-left text-[11px] font-semibold text-foreground active:bg-primary/20 ${activeField === "name" ? "ring-2 ring-primary" : ""}`}
                      style={overlayStyle(page.nameBox, page, scale)}
                    >
                      {signerName || "Printed name"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {activeField && activeField !== "signature" && (
        <div className="border-t border-border bg-card p-3 shadow-2xl">
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
            {activeField === "name" ? "Printed name" : "Date"}
          </label>
          <input
            type="text"
            value={activeField === "name" ? signerName : dateText}
            onChange={(e) => activeField === "name" ? setSignerName(e.target.value) : setDateText(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-ring touch-target"
            autoFocus
          />
          <button
            onClick={() => setActiveField(null)}
            className="mt-2 w-full rounded-xl bg-secondary py-2 text-sm font-semibold text-secondary-foreground active:opacity-80"
          >
            Done
          </button>
        </div>
      )}

      {(!activeField || activeField === "signature") && (
        <div className="border-t border-border bg-card p-3 shadow-2xl">
          <div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground">
            <span className={signerName.trim() ? "text-foreground font-semibold" : ""}>
              {signerName.trim() ? `✓ Name: ${signerName}` : "1. Tap printed-name box"}
            </span>
            <span className={signatureBlob ? "text-foreground font-semibold" : ""}>
              {signatureBlob ? "✓ Signed" : "2. Tap signature box"}
            </span>
            <span className={dateText.trim() ? "text-foreground font-semibold" : ""}>
              {dateText.trim() ? `✓ ${dateText}` : "3. Tap date box"}
            </span>
          </div>
          <button
            onClick={handleComplete}
            disabled={!allFilled}
            className="flex w-full min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-40 active:opacity-90"
          >
            {returningToSender ? (
              <>
                <Send className="h-4 w-4" /> Return to sender
              </>
            ) : (
              <>
                <Check className="h-4 w-4" /> Save signed copy
              </>
            )}
          </button>
          {allFilled && (
            <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
              {returningToSender
                ? "This will email the signed OF-286 back to the sender."
                : "This will save and download the signed OF-286."}
            </p>
          )}
        </div>
      )}

      <SignaturePicker
        open={signatureOpen}
        onClose={() => setSignatureOpen(false)}
        onSave={handleSignatureSave}
        title="Sign OF-286"
        defaultName={signerName || defaultName}
      />
    </div>
  );
}