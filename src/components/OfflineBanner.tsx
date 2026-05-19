import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { WifiOff } from "lucide-react";

/**
 * Renders an amber banner only while the (debounced) network status is
 * offline. The "Back online" celebration was removed because navigator.onLine
 * flickers in iOS WebView / Despia wrappers and produced a visible flash on
 * every reconnect, which made the app feel like it was jumping.
 */
export function OfflineBanner() {
  const { isOnline } = useNetworkStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-amber-600 text-white text-center text-sm py-1.5 px-4 flex items-center justify-center gap-2"
    >
      <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
      <span>Offline — saved data is available. Shift tickets save on this device and sync when reconnected.</span>
    </div>
  );
}
