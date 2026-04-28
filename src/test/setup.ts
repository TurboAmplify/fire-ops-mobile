import "@testing-library/jest-dom";
import { vi } from "vitest";

// jsdom polyfills
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

if (typeof (globalThis as any).ResizeObserver === "undefined") {
  (globalThis as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

if (typeof (globalThis as any).IntersectionObserver === "undefined") {
  (globalThis as any).IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  };
}

// Vite env vars used by the Supabase client
(import.meta as any).env = {
  ...(import.meta as any).env,
  VITE_SUPABASE_URL: "https://test.supabase.co",
  VITE_SUPABASE_PUBLISHABLE_KEY: "test-anon-key",
  VITE_SUPABASE_PROJECT_ID: "test",
};

// Default Supabase client mock — chainable query builder that resolves to empty data.
// Individual tests can override with vi.mock(...) at the top of the file.
vi.mock("@/integrations/supabase/client", () => {
  const makeBuilder = (): any => {
    const builder: any = {};
    const chain = [
      "select", "insert", "update", "delete", "upsert",
      "eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike",
      "in", "is", "or", "and", "not", "filter", "match",
      "order", "limit", "range", "single", "maybeSingle",
    ];
    for (const m of chain) builder[m] = vi.fn(() => builder);
    builder.then = (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve);
    return builder;
  };
  return {
    supabase: {
      from: vi.fn(() => makeBuilder()),
      auth: {
        getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
        getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
        onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
        signInWithPassword: vi.fn(() => Promise.resolve({ data: {}, error: null })),
        signOut: vi.fn(() => Promise.resolve({ error: null })),
      },
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn(() => Promise.resolve({ data: {}, error: null })),
          remove: vi.fn(() => Promise.resolve({ data: {}, error: null })),
          getPublicUrl: vi.fn(() => ({ data: { publicUrl: "" } })),
        })),
      },
      functions: {
        invoke: vi.fn(() => Promise.resolve({ data: null, error: null })),
      },
      channel: vi.fn(() => ({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
        unsubscribe: vi.fn(),
      })),
      removeChannel: vi.fn(),
    },
  };
});
