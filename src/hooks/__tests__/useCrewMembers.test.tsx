import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { createWrapper } from "@/test/utils";

vi.mock("@/lib/offline-guard", () => ({ assertOnlineForWrite: vi.fn() }));
vi.mock("@/services/crew", () => ({
  fetchCrewMembers: vi.fn(),
  fetchCrewMember: vi.fn(),
  createCrewMember: vi.fn(),
  updateCrewMember: vi.fn(),
  uploadCrewPhoto: vi.fn(),
  deleteCrewPhoto: vi.fn(),
}));
vi.mock("@/hooks/useOrganization", () => ({
  useOrganization: () => ({ membership: { organizationId: "org-1" } }),
}));

import * as svc from "@/services/crew";
import {
  useCrewMembers,
  useCreateCrewMember,
  useUpdateCrewMember,
} from "@/hooks/useCrewMembers";

beforeEach(() => vi.clearAllMocks());

describe("useCrewMembers", () => {
  it("fetches scoped to org", async () => {
    (svc.fetchCrewMembers as any).mockResolvedValue([{ id: "c1" }]);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCrewMembers(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(svc.fetchCrewMembers).toHaveBeenCalledWith("org-1");
  });

  it("create injects organization_id when missing", async () => {
    (svc.createCrewMember as any).mockResolvedValue({ id: "new" });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateCrewMember(), { wrapper: Wrapper });
    await act(async () => {
      await result.current.mutateAsync({ name: "Smith" } as any);
    });
    expect(svc.createCrewMember).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Smith", organization_id: "org-1" })
    );
  });

  it("update invalidates both list and detail", async () => {
    (svc.updateCrewMember as any).mockResolvedValue({ id: "c1" });
    const { Wrapper, client } = createWrapper();
    const spy = vi.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useUpdateCrewMember(), { wrapper: Wrapper });
    await act(async () => {
      await result.current.mutateAsync({ id: "c1", updates: { name: "X" } as any });
    });
    expect(spy).toHaveBeenCalledWith({ queryKey: ["crew_members"] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ["crew_members", "c1"] });
  });
});
