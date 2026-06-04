import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface PdfPreviewProps {
  url: string;
}

export function PdfPreview({ url }: PdfPreviewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = "";
    setLoading(true);
    setError(null);

    const task = pdfjsLib.getDocument(url);
    (async () => {
      const pdf = await task.promise;
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        if (cancelled) return;
        const page = await pdf.getPage(pageNumber);
        const baseViewport = page.getViewport({ scale: 1 });
        const width = Math.max(280, Math.min(container.clientWidth - 24, 900));
        const scale = width / baseViewport.width;
        const viewport = page.getViewport({ scale });
        const dpr = window.devicePixelRatio || 1;
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Could not render PDF");
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        canvas.className = "mx-auto mb-4 rounded-md bg-background shadow-sm";
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        container.appendChild(canvas);
        await page.render({ canvasContext: context, viewport }).promise;
      }
      if (!cancelled) setLoading(false);
    })().catch((err) => {
      if (!cancelled) {
        setError(err?.message || "Could not render PDF preview");
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      container.innerHTML = "";
      task.destroy();
    };
  }, [url]);

  return (
    <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border bg-muted/30 p-3">
      {loading && <p className="py-12 text-center text-sm text-muted-foreground">Loading PDF…</p>}
      {error && <p className="py-12 text-center text-sm text-destructive">{error}</p>}
      <div ref={containerRef} className="min-h-full" />
    </div>
  );
}