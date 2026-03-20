"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";

type ActionFn = (...args: never[]) => Promise<{ error?: string }>;

/**
 * Wraps a server action with busy-state tracking, error toasting,
 * and an optional success callback.
 *
 * Returns `[execute, isBusy]` — call `execute(action, successMsg, onSuccess?)`
 * inside your handler.
 */
export function useServerAction() {
  const [busyId, setBusyId] = useState<string | null>(null);

  const execute = useCallback(
    async <T extends ActionFn>(
      /** A unique key for this operation (item id, or a fixed string). */
      id: string,
      action: T,
      args: Parameters<T>,
      successMessage: string,
      onSuccess?: () => void,
    ) => {
      if (busyId) return;
      setBusyId(id);
      try {
        const result = await (action as unknown as (...a: unknown[]) => Promise<{ error?: string }>)(...args);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success(successMessage);
        onSuccess?.();
      } finally {
        setBusyId(null);
      }
    },
    [busyId],
  );

  return { execute, busyId } as const;
}
