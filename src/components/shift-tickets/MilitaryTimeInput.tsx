import { useState, useEffect, useRef } from "react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

/**
 * Text-based time input that always displays and accepts 24-hour (military) format.
 * Accepts HH:MM format. Validates on blur.
 */
export function MilitaryTimeInput({ value, onChange, className = "", placeholder = "HH:MM" }: Props) {
  const [display, setDisplay] = useState(value || "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDisplay(value || "");
  }, [value]);

  const formatAndEmit = (raw: string) => {
    // Strip non-digits
    const digits = raw.replace(/\D/g, "");
    if (digits.length === 0) {
      onChange("");
      setDisplay("");
      return;
    }

    let h = "";
    let m = "";

    if (digits.length <= 2) {
      h = digits.padStart(2, "0");
      m = "00";
    } else if (digits.length === 3) {
      h = "0" + digits[0];
      m = digits.slice(1, 3);
    } else {
      h = digits.slice(0, 2);
      m = digits.slice(2, 4);
    }

    const hNum = Math.min(parseInt(h, 10), 23);
    const mNum = Math.min(parseInt(m, 10), 59);
    const formatted = `${String(hNum).padStart(2, "0")}:${String(mNum).padStart(2, "0")}`;
    setDisplay(formatted);
    onChange(formatted);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Allow typing digits and colon freely
    if (/^[\d:]*$/.test(val) && val.length <= 5) {
      setDisplay(val);
    }
  };

  const handleBlur = () => {
    if (display) {
      formatAndEmit(display);
    } else {
      onChange("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      formatAndEmit(display);
      inputRef.current?.blur();
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      value={display}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className={className}
      maxLength={5}
    />
  );
}
