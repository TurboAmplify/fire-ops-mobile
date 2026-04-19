import { ImgHTMLAttributes } from "react";
import { useSignedUrl } from "@/hooks/useSignedUrl";
import { cn } from "@/lib/utils";

interface SignedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
  src: string | null | undefined;
  /** Element rendered while the signed URL is being fetched. */
  fallback?: React.ReactNode;
}

/**
 * <img> wrapper that loads files from private storage buckets via short-lived
 * signed URLs. For blob:/external URLs, behaves identically to <img>.
 */
export function SignedImage({ src, fallback, className, alt = "", ...rest }: SignedImageProps) {
  const { url, loading } = useSignedUrl(src);

  if (loading) {
    return (
      <div className={cn("bg-secondary animate-pulse", className)} aria-hidden>
        {fallback}
      </div>
    );
  }

  if (!url) return <>{fallback ?? null}</>;

  return <img src={url} alt={alt} className={className} {...rest} />;
}
