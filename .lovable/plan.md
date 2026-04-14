

# Offline Tolerance for FireOps HQ (App Store Compliant)

## Summary

Add offline data caching, write queuing, and connectivity indicators using IndexedDB (not localStorage) to handle iOS WKWebView storage limits and meet App Store requirements.

## Technical Details

### 1. Dependencies

Install `idb-keyval`, `@tanstack/react-query-persist-client`, and `@tanstack/query-async-storage-persister`.

### 2. Query Client with IndexedDB Persistence

**New file: `src/lib/query-client.ts`**
- Create `QueryClient` with `networkMode: "offlineFirst"`, `staleTime: 5min`, `gcTime: 24h`
- Create an async IndexedDB persister using `idb-keyval` + `@tanstack/query-async-storage-persister`
- Export both for use in `App.tsx`

### 3. Offline Mutation Queue

**New file: `src/lib/offline-queue.ts`**
- Store failed mutations in IndexedDB via `idb-keyval` (table, operation, payload, timestamp)
- On `online` event, replay queued mutations in order with toast feedback
- Expire mutations older than 72 hours

**New file: `src/lib/offline-mutations.ts`**
- `useOfflineMutation` hook wrapping `useMutation` — if offline, optimistically update cache and queue the write

### 4. Network Status Hook

**New file: `src/hooks/useNetworkStatus.ts`**
- Returns `{ isOnline, pendingCount }`
- Listens to `online`/`offline` events, reads queue length from IndexedDB

### 5. Offline Banner

**New file: `src/components/OfflineBanner.tsx`**
- Thin amber banner: "Offline -- changes will sync when connected" with pending count
- Brief green "Back online" message on reconnect, auto-dismisses after 3 seconds
- No emoji per project rules

### 6. Wire It Up

**`src/App.tsx`**
- Replace `QueryClientProvider` with `PersistQueryClientProvider` from the persist-client package
- Import client and persister from `src/lib/query-client.ts`

**`src/components/AppShell.tsx`**
- Add `<OfflineBanner />` between header spacer and main content

### 7. App Store Compliance Notes

- IndexedDB provides 250MB+ storage on iOS WKWebView (vs 5MB localStorage cap)
- App gracefully degrades: cached reads work offline, writes queue and sync
- Clear visual indicator of connectivity state (Apple requires graceful offline handling)
- No crashes or blank screens when offline
- No service worker needed — this is data-layer resilience only

## Files Changed

| File | Action |
|------|--------|
| `package.json` | Add 3 dependencies |
| `src/lib/query-client.ts` | New |
| `src/lib/offline-queue.ts` | New |
| `src/lib/offline-mutations.ts` | New |
| `src/hooks/useNetworkStatus.ts` | New |
| `src/components/OfflineBanner.tsx` | New |
| `src/App.tsx` | Use PersistQueryClientProvider |
| `src/components/AppShell.tsx` | Add OfflineBanner |

