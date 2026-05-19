import * as React from "react";

/**
 * Visually hides content while keeping it accessible to assistive tech.
 * Use to satisfy Radix Dialog/Sheet/Drawer's required `Title` (and
 * recommended `Description`) without affecting layout.
 */
export const VisuallyHidden = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    {...props}
    className={["sr-only", className].filter(Boolean).join(" ")}
  />
));
VisuallyHidden.displayName = "VisuallyHidden";
