import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchExpenses,
  fetchExpense,
  createExpense,
  updateExpense,
  deleteExpense,
} from "@/services/expenses";
import type { ExpenseInsert, ExpenseUpdate } from "@/services/expenses";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";

export function useExpenses() {
  const { membership } = useOrganization();
  const { user } = useAuth();
  const role = membership?.role;
  const userId = user?.id;

  return useQuery({
    queryKey: ["expenses", role, userId],
    queryFn: fetchExpenses,
    select: (data) => {
      // Owner sees all org expenses; others see only their own
      if (role === "owner") return data;
      if (!userId) return [];
      return data.filter((e) => e.submitted_by_user_id === userId);
    },
  });
}

export function useExpense(id: string) {
  return useQuery({
    queryKey: ["expenses", id],
    queryFn: () => fetchExpense(id),
    enabled: !!id,
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  const { membership } = useOrganization();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (data: ExpenseInsert) =>
      createExpense({
        ...data,
        organization_id: data.organization_id ?? membership?.organizationId ?? null,
        submitted_by_user_id: data.submitted_by_user_id ?? user?.id ?? null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
    },
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: ExpenseUpdate }) =>
      updateExpense(id, updates),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["expenses", vars.id] });
    },
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteExpense(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
    },
  });
}
