import * as React from "react";

import { cn } from "@/lib/utils";

// Default hard cap for any text-like input. Backstop only — Zod schemas and
// DB CHECK constraints enforce stricter, field-specific limits. Callers can
// override by passing an explicit `maxLength`.
const DEFAULT_INPUT_MAX_LENGTH = 500;
const TEXT_LIKE_TYPES = new Set([
  undefined,
  "text",
  "search",
  "url",
  "tel",
  "email",
  "password",
]);

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, maxLength, ...props }, ref) => {
    const effectiveMaxLength =
      maxLength ?? (TEXT_LIKE_TYPES.has(type as string | undefined) ? DEFAULT_INPUT_MAX_LENGTH : undefined);
    return (
      <input
        type={type}
        maxLength={effectiveMaxLength}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
