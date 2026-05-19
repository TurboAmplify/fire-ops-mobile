import { useState, useEffect, useCallback, useRef } from "react";
import { getQueueLength } from "@/lib/offline-queue";

// Don't trust a transient navigator.onLine===false flicker. Only flip to
// "offline" after we've been offline continuously for this long. Going back
// online is reflected immediately.
const OFFLINE_DEBOUNCE_MS = 2500;

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [pendingCount, setPendingCount] = useState(0);
  const offlineTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshPending = useCallback(async () => {
    try {
      const count = await getQueueLength();
      setPendingCount(count);
    } catch {
      // IndexedDB may not be available
    }
  }, []);

  useEffect(() => {
    const clearOfflineTimer = () => {
      if (offlineTimer.current) {
        clearTimeout(offlineTimer.current);
        offlineTimer.current = null;
      }
    };

    const goOnline = () => {
      clearOfflineTimer();
      setIsOnline(true);
    };
    const goOffline = () => {
      clearOfflineTimer();
      offlineTimer.current = setTimeout(() => {
        // Re-check before flipping — the flag may have already recovered.
        if (typeof navigator === "undefined" || navigator.onLine === false) {
          setIsOnline(false);
        }
      }, OFFLINE_DEBOUNCE_MS);
    };

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    refreshPending();
    const interval = setInterval(refreshPending, 5000);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      clearInterval(interval);
      clearOfflineTimer();
    };
  }, [refreshPending]);

  return { isOnline, pendingCount };
}
