import { useEffect, useState } from "react";
import { Check } from "lucide-react";

interface SuccessOverlayProps {
  message: string;
  show: boolean;
  onDone?: () => void;
  duration?: number;
}

export function SuccessOverlay({ message, show, onDone, duration = 1500 }: SuccessOverlayProps) {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      setFading(false);
      const fadeTimer = setTimeout(() => setFading(true), duration - 300);
      const hideTimer = setTimeout(() => {
        setVisible(false);
        setFading(false);
        onDone?.();
      }, duration);
      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [show, duration, onDone]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center pointer-events-none transition-opacity duration-300 ${
        fading ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-background/95 backdrop-blur-md shadow-2xl border border-border px-8 py-6 animate-scale-in">
        <div className="flex items-center justify-center h-14 w-14 rounded-full bg-green-500/15">
          <Check className="h-8 w-8 text-green-500" strokeWidth={3} />
        </div>
        <p className="text-sm font-semibold text-foreground">{message}</p>
      </div>
    </div>
  );
}
