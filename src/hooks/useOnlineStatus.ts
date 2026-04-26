/**
 * Convenience hook for checking online status. This is a thin wrapper around
 * useNetworkStatus so that future code can use the more idiomatic name and we
 * have a single import path for online-state in screens / components.
 */
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

export function useOnlineStatus() {
  const { isOnline, pendingCount } = useNetworkStatus();
  return {
    isOnline,
    isOffline: !isOnline,
    pendingCount,
  };
}
