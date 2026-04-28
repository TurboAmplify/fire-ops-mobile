import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { createWrapper } from "@/test/utils";

vi.mock("@/lib/offline-guard", () => ({ assertOnlineForWrite: vi.fn() }));
vi.mock("@/services/expenses", () => ({
  fetchExpenses: vi.fn(),
  fetchExpense: vi.fn(),
  createExpense: vi.fn(),
  updateExpense: vi.fn(),
  deleteExpense: vi.fn(),
}));

const orgState = { role: "owner" as "owner" | "member", userId: "user-1" };
vi.mock("@/hooks/useOrganization", () => ({
  useOrganization: () => ({ membership: { organizationId: "org-1", role: orgState.role } }),
}));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: orgState.userId } }),
}));

import * as svc from "@/services/expenses";
import { useExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense } from "@/hooks/useExpenses";

beforeEach(() => {
  vi.clearAllMocks();
  orgState.role = "owner";
  orgState.userId = "user-1";
});

describe("useExpenses", () => {
  it("owner sees all org expenses", async () => {
    (svc.fetchExpenses as any).mockResolvedValue([
      { id: "e1", submitted_by_user_id: "user-1" },
      { id: "e2", submitted_by_user_id: "user-2" },
    ]);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useExpenses(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
  });

  it("non-owner sees only their own expenses", async () => {
    orgState.role = "member";
    (svc.fetchExpenses as any).mockResolvedValue([
      { id: "e1", submitted_by_user_id: "user-1" },
      { id: "e2", submitted_by_user_id: "user-2" },
    ]);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useExpenses(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ id: "e1", submitted_by_user_id: "user-1" }]);
  });

  it("createExpense injects org and submitter", async () => {
    (svc.createExpense as any).mockResolvedValue({ id: "new" });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateExpense(), { wrapper: Wrapper });
    await act(async () => {
      await result.current.mutateAsync({ amount: 10 } as any);
    });
    expect(svc.createExpense).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 10,
        organization_id: "org-1",
        submitted_by_user_id: "user-1",
      })
    );
  });

  it("update + delete invalidate cache", async () => {
    (svc.updateExpense as any).mockResolvedValue({ id: "e1" });
    (svc.deleteExpense as any).mockResolvedValue(undefined);
    const { Wrapper, client } = createWrapper();
    const spy = vi.spyOn(client, "invalidateQueries");

    const upd = renderHook(() => useUpdateExpense(), { wrapper: Wrapper });
    await act(async () => {
      await upd.result.current.mutateAsync({ id: "e1", updates: {} as any });
    });
    expect(spy).toHaveBeenCalledWith({ queryKey: ["expenses"] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ["expenses", "e1"] });

    const del = renderHook(() => useDeleteExpense(), { wrapper: Wrapper });
    await act(async () => {
      await del.result.current.mutateAsync("e1");
    });
    expect(svc.deleteExpense).toHaveBeenCalledWith("e1");
  });
});
