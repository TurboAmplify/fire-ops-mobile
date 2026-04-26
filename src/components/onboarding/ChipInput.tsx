import { useState, type KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";

interface ChipInputProps {
  /** Current chips (controlled). */
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  /** Optional helper to show under the input. */
  hint?: string;
  /** aria-label for the input. */
  ariaLabel?: string;
  /** Auto-focus the input on mount. */
  autoFocus?: boolean;
}

/**
 * Type a name, press Enter (or tap +), and it joins a chip list. Tap × to remove.
 * Used in onboarding for bulk-adding engines, crews, and crew members.
 */
export function ChipInput({
  value,
  onChange,
  placeholder = "Type a name and press Enter",
  hint,
  ariaLabel,
  autoFocus,
}: ChipInputProps) {
  const [draft, setDraft] = useState("");

  const commit = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onChange([...value, trimmed]);
    setDraft("");
  };

  const remove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit();
    } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label={ariaLabel}
          autoFocus={autoFocus}
          className="flex-1"
        />
        <button
          type="button"
          onClick={commit}
          disabled={!draft.trim()}
          className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground disabled:opacity-40 touch-target"
          aria-label="Add"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((chip, i) => (
            <span
              key={`${chip}-${i}`}
              className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground"
            >
              {chip}
              <button
                type="button"
                onClick={() => remove(i)}
                className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-background/50"
                aria-label={`Remove ${chip}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
