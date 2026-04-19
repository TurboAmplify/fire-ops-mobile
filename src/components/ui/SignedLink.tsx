import { AnchorHTMLAttributes, MouseEvent } from "react";
import { getViewableUrl } from "@/lib/storage-url";

interface SignedLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  href: string | null | undefined;
}

/**
 * <a> wrapper that resolves to a short-lived signed URL on click.
 * Use for opening receipts, agreements, documents, etc. in a new tab.
 */
export function SignedLink({ href, onClick, children, ...rest }: SignedLinkProps) {
  const handleClick = async (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented) return;
    if (!href) return;
    e.preventDefault();
    const signed = await getViewableUrl(href);
    if (signed) {
      window.open(signed, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <a href={href ?? "#"} onClick={handleClick} target="_blank" rel="noopener noreferrer" {...rest}>
      {children}
    </a>
  );
}
