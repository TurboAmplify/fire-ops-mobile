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

export function useExpenses() {
  return useQuery({
    queryKey: ["expenses"],
    queryFn: fetchExpenses,
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
  return useMutation({
    mutationFn: (data: ExpenseInsert) =>
      createExpense({
        ...data,
        organization_id: data.organization_id ?? membership?.organizationId ?? null,
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
