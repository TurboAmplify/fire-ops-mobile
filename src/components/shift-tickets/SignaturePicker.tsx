import "@fontsource/dancing-script/700.css";
import "@fontsource/great-vibes/400.css";
import "@fontsource/satisfy/400.css";
import "@fontsource/pacifico/400.css";
import { useRef, useState, useEffect, useCallback } from "react";
import { X, RotateCcw, Check, PenLine } from "lucide-react";

const FONT_OPTIONS = [
  { family: "Dancing Script", label: "Script", weight: 700 },
  { family: "Great Vibes", label: "Elegant", weight: 400 },
  { family: "Satisfy", label: "Casual", weight: 400 },
  { family: "Pacifico", label: "Bold", weight: 400 },
] as const;

export interface SignatureMetadata {
  method: "typed" | "drawn";
  font?: string;
}

interface SignaturePickerProps {
  open: boolean;
  onClose: () => void;
  onSave: (blob: Blob, metadata: SignatureMetadata) => void;
  title: string;
  defaultName?: string;
}

export function SignaturePicker({ open, onClose, onSave, title, defaultName = "" }: SignaturePickerProps) {
  const [mode, setMode] = useState<"type" | "draw">("type");
  const [name, setName] = useState(defaultName);
  const [selectedFont, setSelectedFont] = useState<string | null>(null);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const canvasRefs = useRef<Record<string, HTMLCanvasElement | null>>({});

  // Drawing state
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasStroke, setHasStroke] = useState(false);

  // Load bundled fonts
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setMode("type");
    setName(defaultName);
    setSelectedFont(null);
    setHasStroke(false);
    setFontsLoaded(false);

    const loadFonts = async () => {
      try {
        await document.fonts.ready;
        await Promise.all(
          FONT_OPTIONS.map(async (font) => {
            await document.fonts.load(`${font.weight} 32px "${font.family}"`, defaultName || "Signature");
            await document.fonts.load(`${font.weight} 32px "${font.family}"`, "Signature");
          })
        );
      } catch {
        // If font loading fails, draw mode still works
      }

      if (!cancelled) {
        setFontsLoaded(true);
      }
    };

    void loadFonts();

    return () => {
      cancelled = true;
    };
  }, [open, defaultName]);

  // Render typed signature previews
  useEffect(() => {
    if (!open || mode !== "type" || !fontsLoaded || !name.trim()) return;

    const renderTimeout = setTimeout(() => {
      FONT_OPTIONS.forEach((font) => {
        const canvas = canvasRefs.current[font.family];
        if (!canvas) return;
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = "hsl(0 0% 100%)";
        ctx.fillRect(0, 0, rect.width, rect.height);
        ctx.fillStyle = "hsl(222 47% 11%)";
        ctx.font = `${font.weight} 32px "${font.family}", cursive`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(name.trim(), rect.width / 2, rect.height / 2);
      });
    }, 100);

    return () => clearTimeout(renderTimeout);
  }, [open, mode, fontsLoaded, name]);

  // Init draw canvas
  useEffect(() => {
    if (!open || mode !== "draw") return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;

    const initTimeout = setTimeout(() => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = "hsl(0 0% 100%)";
        ctx.fillRect(0, 0, rect.width, rect.height);
        ctx.strokeStyle = "hsl(222 47% 11%)";
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      }
      setHasStroke(false);
    }, 50);

    return () => clearTimeout(initTimeout);
  }, [open, mode]);

  const getPos = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = drawCanvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  };

  const getCtx = useCallback(() => drawCanvasRef.current?.getContext("2d") ?? null, []);

  const startDraw = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    const ctx = getCtx();
    if (!ctx) return;
    setDrawing(true);
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    if (!drawing) return;
    e.preventDefault();
    const ctx = getCtx();
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasStroke(true);
  };

  const endDraw = () => setDrawing(false);

  const clearDraw = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "hsl(0 0% 100%)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    setHasStroke(false);
  };

  const handleSelectFont = (fontFamily: string) => {
    setSelectedFont(fontFamily);
  };

  const handleConfirmTyped = () => {
    if (!selectedFont) return;
    const canvas = canvasRefs.current[selectedFont];
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (blob) onSave(blob, { method: "typed", font: selectedFont });
    }, "image/png");
  };

  const handleConfirmDrawn = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (blob) onSave(blob, { method: "drawn" });
    }, "image/png");
  };

  if (!open) return null;

  const canConfirm = mode === "type" ? !!selectedFont : hasStroke;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <button onClick={onClose} className="touch-target flex items-center gap-1 text-sm text-muted-foreground">
          <X className="h-5 w-5" /> Cancel
        </button>
        <span className="text-sm font-bold">{title}</span>
        <button
          onClick={mode === "type" ? handleConfirmTyped : handleConfirmDrawn}
          disabled={!canConfirm}
          className="touch-target flex items-center gap-1 text-sm font-bold text-primary disabled:opacity-40"
        >
          <Check className="h-5 w-5" /> Save
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {mode === "type" ? (
          <>
            {/* Name input */}
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">Type your name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setSelectedFont(null);
                }}
                placeholder="Full name"
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-ring touch-target"
                autoFocus
              />
            </div>

            {/* Font previews */}
            {name.trim() && (
              <div className="space-y-3">
                <p className="text-[11px] text-muted-foreground">Select a signature style</p>
                {FONT_OPTIONS.map((font) => (
                  <button
                    key={font.family}
                    type="button"
                    onClick={() => handleSelectFont(font.family)}
                    className={`w-full rounded-xl border-2 p-1 transition-colors touch-target ${
                      selectedFont === font.family
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card"
                    }`}
                  >
                    <div className="flex items-center justify-between px-2 mb-1">
                      <span className="text-[10px] text-muted-foreground">{font.label}</span>
                      {selectedFont === font.family && (
                        <Check className="h-3.5 w-3.5 text-primary" />
                      )}
                    </div>
                    <canvas
                      ref={(el) => { canvasRefs.current[font.family] = el; }}
                      className="w-full rounded-lg bg-card"
                      style={{ height: 60 }}
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Draw my own button */}
            <button
              type="button"
              onClick={() => setMode("draw")}
              className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-4 text-sm text-muted-foreground touch-target"
            >
              <PenLine className="h-4 w-4" />
              Draw My Own
            </button>
          </>
        ) : (
          <>
            {/* Draw mode */}
            <p className="text-xs text-muted-foreground text-center">Sign below</p>
            <canvas
              ref={drawCanvasRef}
              className="w-full border border-border rounded-xl bg-card"
              style={{ height: 200, touchAction: "none" }}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={endDraw}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
            />
            <div className="flex items-center justify-center gap-6">
              <button onClick={clearDraw} className="flex items-center gap-1.5 text-sm text-muted-foreground touch-target">
                <RotateCcw className="h-4 w-4" /> Clear
              </button>
              <button
                type="button"
                onClick={() => setMode("type")}
                className="flex items-center gap-1.5 text-sm text-primary font-medium touch-target"
              >
                Use typed signature
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
