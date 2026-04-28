import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { createWrapper } from "@/test/utils";

vi.mock("@/lib/offline-guard", () => ({ assertOnlineForWrite: vi.fn() }));
vi.mock("@/services/incidents", () => ({
  fetchIncidents: vi.fn(),
  fetchIncident: vi.fn(),
  createIncident: vi.fn(),
  updateIncident: vi.fn(),
  deleteIncident: vi.fn(),
}));
vi.mock("@/hooks/useOrganization", () => ({
  useOrganization: () => ({ membership: { organizationId: "org-1", role: "owner" } }),
}));

import * as svc from "@/services/incidents";
import {
  useIncidents,
  useIncident,
  useCreateIncident,
  useUpdateIncident,
  useDeleteIncident,
} from "@/hooks/useIncidents";

beforeEach(() => vi.clearAllMocks());

describe("useIncidents", () => {
  it("fetches incidents scoped to org", async () => {
    (svc.fetchIncidents as any).mockResolvedValue([{ id: "i1" }]);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useIncidents(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(svc.fetchIncidents).toHaveBeenCalledWith("org-1");
    expect(result.current.data).toEqual([{ id: "i1" }]);
  });

  it("disables single-incident query when id is empty", () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useIncident(""), { wrapper: Wrapper });
    expect(result.current.fetchStatus).toBe("idle");
    expect(svc.fetchIncident).not.toHaveBeenCalled();
  });

  it("createIncident injects organization_id and invalidates", async () => {
    (svc.createIncident as any).mockResolvedValue({ id: "new" });
    const { Wrapper, client } = createWrapper();
    const spy = vi.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useCreateIncident(), { wrapper: Wrapper });
    await act(async () => {
      await result.current.mutateAsync({ name: "Fire" } as any);
    });
    expect(svc.createIncident).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Fire", organization_id: "org-1" })
    );
    expect(spy).toHaveBeenCalledWith({ queryKey: ["incidents"] });
  });

  it("updateIncident invalidates list and detail", async () => {
    (svc.updateIncident as any).mockResolvedValue({ id: "i1" });
    const { Wrapper, client } = createWrapper();
    const spy = vi.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useUpdateIncident(), { wrapper: Wrapper });
    await act(async () => {
      await result.current.mutateAsync({ id: "i1", updates: { name: "X" } as any });
    });
    expect(spy).toHaveBeenCalledWith({ queryKey: ["incidents"] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ["incidents", "i1"] });
  });

  it("deleteIncident calls service", async () => {
    (svc.deleteIncident as any).mockResolvedValue(undefined);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useDeleteIncident(), { wrapper: Wrapper });
    await act(async () => {
      await result.current.mutateAsync("i1");
    });
    expect(svc.deleteIncident).toHaveBeenCalledWith("i1");
  });
});
