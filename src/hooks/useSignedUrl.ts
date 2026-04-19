import { useEffect, useState } from "react";
import { getViewableUrl } from "@/lib/storage-url";

/**
 * Resolve a stored file URL to a viewable URL.
 *
 * - For private-bucket URLs, returns a short-lived signed URL.
 * - For blob:/external/null URLs, returns the input as-is.
 * - Returns null while loading or if signing fails.
 */
export function useSignedUrl(url: string | null | undefined): {
  url: string | null;
  loading: boolean;
} {
  const [resolved, setResolved] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(!!url);

  useEffect(() => {
    let cancelled = false;
    if (!url) {
      setResolved(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    getViewableUrl(url)
      .then((signed) => {
        if (!cancelled) {
          setResolved(signed);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResolved(null);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return { url: resolved, loading };
}
