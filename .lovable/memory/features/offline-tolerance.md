---
name: Offline tolerance
description: IndexedDB-backed query cache persistence, offline mutation queue, and connectivity banner
type: feature
---
- React Query configured with `networkMode: "offlineFirst"`, 5min staleTime, 24h gcTime
- Query cache persisted to IndexedDB via `idb-keyval` + `@tanstack/query-async-storage-persister`
- `PersistQueryClientProvider` wraps the app in `App.tsx`
- Offline mutation queue in `src/lib/offline-queue.ts` stores failed writes in IndexedDB, replays on reconnect
- `useOfflineMutation` hook in `src/lib/offline-mutations.ts` for offline-aware mutations
- `useNetworkStatus` hook returns `{ isOnline, pendingCount }`
- `OfflineBanner` in AppShell shows amber "Offline" banner + green "Back online" on reconnect
- 72-hour expiry on queued mutations
- IndexedDB chosen over localStorage for iOS App Store compliance (250MB+ vs 5MB cap)
