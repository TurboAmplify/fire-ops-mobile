import { useEffect, useState } from "react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { WifiOff, Wifi } from "lucide-react";

export function OfflineBanner() {
  const { isOnline, pendingCount } = useNetworkStatus();
  const [showReconnected, setShowReconnected] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
    } else if (wasOffline) {
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
        setWasOffline(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  if (isOnline && !showReconnected) return null;

  if (showReconnected) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="bg-green-600 text-white text-center text-sm py-1.5 px-4 flex items-center justify-center gap-2"
      >
        <Wifi className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Back online</span>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-amber-600 text-white text-center text-sm py-1.5 px-4 flex items-center justify-center gap-2"
    >
      <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
      <span>
        Offline -- changes will sync when connected
        {pendingCount > 0 && ` (${pendingCount} pending)`}
      </span>
    </div>
  );
}
