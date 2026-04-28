import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { createWrapper } from "@/test/utils";

vi.mock("@/lib/offline-guard", () => ({ assertOnlineForWrite: vi.fn() }));
vi.mock("@/services/incident-trucks", () => ({
  fetchIncidentTrucks: vi.fn(),
  fetchAvailableTrucks: vi.fn(),
  assignTruckToIncident: vi.fn(),
  updateIncidentTruckStatus: vi.fn(),
  removeTruckFromIncident: vi.fn(),
}));

import * as svc from "@/services/incident-trucks";
import {
  useIncidentTrucks,
  useAvailableTrucks,
  useAssignTruck,
  useUpdateTruckStatus,
  useRemoveTruck,
} from "@/hooks/useIncidentTrucks";

beforeEach(() => vi.clearAllMocks());

describe("useIncidentTrucks", () => {
  it("fetches by incident id", async () => {
    (svc.fetchIncidentTrucks as any).mockResolvedValue([{ id: "it1" }]);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useIncidentTrucks("inc-1"), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(svc.fetchIncidentTrucks).toHaveBeenCalledWith("inc-1");
  });

  it("does not fetch when incident id missing", () => {
    const { Wrapper } = createWrapper();
    renderHook(() => useIncidentTrucks(""), { wrapper: Wrapper });
    expect(svc.fetchIncidentTrucks).not.toHaveBeenCalled();
  });

  it("available trucks query disabled without org", () => {
    const { Wrapper } = createWrapper();
    renderHook(() => useAvailableTrucks(undefined), { wrapper: Wrapper });
    expect(svc.fetchAvailableTrucks).not.toHaveBeenCalled();
  });

  it("assignTruck calls service and invalidates", async () => {
    (svc.assignTruckToIncident as any).mockResolvedValue({ id: "it1" });
    const { Wrapper, client } = createWrapper();
    const spy = vi.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useAssignTruck("inc-1"), { wrapper: Wrapper });
    await act(async () => {
      await result.current.mutateAsync("truck-9");
    });
    expect(svc.assignTruckToIncident).toHaveBeenCalledWith("inc-1", "truck-9");
    expect(spy).toHaveBeenCalledWith({ queryKey: ["incident-trucks", "inc-1"] });
  });

  it("updateTruckStatus + removeTruck call services", async () => {
    (svc.updateIncidentTruckStatus as any).mockResolvedValue({ id: "it1" });
    (svc.removeTruckFromIncident as any).mockResolvedValue(undefined);
    const { Wrapper } = createWrapper();

    const upd = renderHook(() => useUpdateTruckStatus("inc-1"), { wrapper: Wrapper });
    await act(async () => {
      await upd.result.current.mutateAsync({ id: "it1", status: "active" as any });
    });
    expect(svc.updateIncidentTruckStatus).toHaveBeenCalledWith("it1", "active");

    const rm = renderHook(() => useRemoveTruck("inc-1"), { wrapper: Wrapper });
    await act(async () => {
      await rm.result.current.mutateAsync("it1");
    });
    expect(svc.removeTruckFromIncident).toHaveBeenCalledWith("it1");
  });
});
