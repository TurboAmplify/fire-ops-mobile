import { useMutation, useQueryClient, type UseMutationOptions } from "@tanstack/react-query";
import { enqueue, type QueuedMutation } from "./offline-queue";
import { toast } from "sonner";

interface OfflineMutationOptions<TData, TVariables> extends Omit<UseMutationOptions<TData, Error, TVariables>, "mutationFn"> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  /** Table name for the offline queue */
  table: string;
  /** Operation type */
  operation: QueuedMutation["operation"];
  /** Extract the row id from variables (for update/delete) */
  getRowId?: (variables: TVariables) => string;
  /** Extract the payload to queue (defaults to variables as-is) */
  getPayload?: (variables: TVariables) => Record<string, unknown>;
  /** Query keys to invalidate on success */
  invalidateKeys?: string[][];
}

export function useOfflineMutation<TData = unknown, TVariables = unknown>({
  mutationFn,
  table,
  operation,
  getRowId,
  getPayload,
  invalidateKeys,
  ...options
}: OfflineMutationOptions<TData, TVariables>) {
  const queryClient = useQueryClient();

  return useMutation<TData, Error, TVariables>({
    ...options,
    mutationFn: async (variables) => {
      if (!navigator.onLine) {
        // Queue the mutation for later
        const payload = getPayload ? getPayload(variables) : (variables as unknown as Record<string, unknown>);
        await enqueue({
          table,
          operation,
          payload,
          rowId: getRowId?.(variables),
        });
        toast("Saved offline -- will sync when connected");
        // Return a fake result so the UI can proceed
        throw new OfflineQueuedError("Mutation queued for offline sync");
      }
      return mutationFn(variables);
    },
    onSuccess: (data, variables, context) => {
      if (invalidateKeys) {
        invalidateKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
      }
      options.onSuccess?.(data, variables, context);
    },
  });
}

export class OfflineQueuedError extends Error {
  readonly isOfflineQueued = true;
  constructor(message: string) {
    super(message);
    this.name = "OfflineQueuedError";
  }
}
