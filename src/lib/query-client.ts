import { QueryClient } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { get, set, del } from "idb-keyval";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: "offlineFirst",
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      retry: (failureCount, error) => {
        // Don't retry if offline
        if (!navigator.onLine) return false;
        return failureCount < 3;
      },
    },
    mutations: {
      networkMode: "offlineFirst",
    },
  },
});

export const asyncPersister = createAsyncStoragePersister({
  storage: {
    getItem: async (key: string) => {
      const value = await get(key);
      return value ?? null;
    },
    setItem: async (key: string, value: string) => {
      await set(key, value);
    },
    removeItem: async (key: string) => {
      await del(key);
    },
  },
  // Serialize/deserialize handled automatically
  key: "fireops-query-cache",
});
