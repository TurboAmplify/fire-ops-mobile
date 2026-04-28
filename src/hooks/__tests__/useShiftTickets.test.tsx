import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { createWrapper } from "@/test/utils";

vi.mock("@/lib/offline-guard", () => ({ assertOnlineForWrite: vi.fn() }));
vi.mock("@/services/shift-tickets", () => ({
  fetchShiftTickets: vi.fn(),
  fetchShiftTicket: vi.fn(),
  createShiftTicket: vi.fn(),
  updateShiftTicket: vi.fn(),
  deleteShiftTicket: vi.fn(),
  duplicateShiftTicket: vi.fn(),
}));

import * as svc from "@/services/shift-tickets";
import {
  useShiftTickets,
  useShiftTicket,
  useCreateShiftTicket,
  useUpdateShiftTicket,
  useDeleteShiftTicket,
} from "@/hooks/useShiftTickets";

beforeEach(() => vi.clearAllMocks());

describe("useShiftTickets", () => {
  it("fetches tickets by incident_truck_id", async () => {
    (svc.fetchShiftTickets as any).mockResolvedValue([{ id: "t1" }]);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useShiftTickets("it-1"), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(svc.fetchShiftTickets).toHaveBeenCalledWith("it-1");
  });

  it("disables when truck id missing", () => {
    const { Wrapper } = createWrapper();
    renderHook(() => useShiftTickets(""), { wrapper: Wrapper });
    expect(svc.fetchShiftTickets).not.toHaveBeenCalled();
  });

  it("single ticket query disabled without id", () => {
    const { Wrapper } = createWrapper();
    renderHook(() => useShiftTicket(""), { wrapper: Wrapper });
    expect(svc.fetchShiftTicket).not.toHaveBeenCalled();
  });

  it("create invalidates list, recent, and daily-crew caches", async () => {
    (svc.createShiftTicket as any).mockResolvedValue({ id: "new" });
    const { Wrapper, client } = createWrapper();
    const spy = vi.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useCreateShiftTicket("it-1"), { wrapper: Wrapper });
    await act(async () => {
      await result.current.mutateAsync({ incident_truck_id: "it-1" } as any);
    });
    expect(spy).toHaveBeenCalledWith({ queryKey: ["shift-tickets", "it-1"] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ["shift-tickets-recent"] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ["incident-daily-crew"] });
  });

  it("update + delete call through to service", async () => {
    (svc.updateShiftTicket as any).mockResolvedValue({ id: "t1" });
    (svc.deleteShiftTicket as any).mockResolvedValue(undefined);
    const { Wrapper } = createWrapper();

    const upd = renderHook(() => useUpdateShiftTicket("t1", "it-1"), { wrapper: Wrapper });
    await act(async () => {
      await upd.result.current.mutateAsync({ notes: "x" } as any);
    });
    expect(svc.updateShiftTicket).toHaveBeenCalledWith("t1", { notes: "x" });

    const del = renderHook(() => useDeleteShiftTicket("it-1"), { wrapper: Wrapper });
    await act(async () => {
      await del.result.current.mutateAsync("t1");
    });
    expect(svc.deleteShiftTicket).toHaveBeenCalledWith("t1");
  });
});
