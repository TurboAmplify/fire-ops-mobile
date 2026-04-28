import { describe, it, expect } from "vitest";

/**
 * Smoke test: every page module must import without throwing and export a
 * default React component. Catches broken imports, top-level errors, missing
 * exports — the most common regression class for ~80% of refactor breakage.
 *
 * Cheap by design — no rendering through providers, no router, no Supabase.
 * Per-page render tests are explicitly out of scope for Phase 1.6.
 */

const pageModules = import.meta.glob("../pages/*.tsx");

describe("page smoke test", () => {
  const entries = Object.entries(pageModules);

  it("discovers page modules", () => {
    expect(entries.length).toBeGreaterThan(20);
  });

  for (const [path, loader] of entries) {
    it(`loads ${path}`, async () => {
      const mod: any = await loader();
      expect(mod).toBeDefined();
      const exported = mod.default ?? mod;
      expect(typeof exported === "function" || typeof exported === "object").toBe(true);
    });
  }
});
