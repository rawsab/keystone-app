import { useEffect, useRef, useCallback } from "react";
import { UseMutationResult } from "@tanstack/react-query";

interface UseAutosaveOptions<T> {
  data: T;
  mutation: UseMutationResult<unknown, Error, T, unknown>;
  delay?: number;
  enabled?: boolean;
}

export function useAutosave<T extends Record<string, unknown>>({
  data,
  mutation,
  delay = 1000,
  enabled = true,
}: UseAutosaveOptions<T>) {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const lastSavedRef = useRef<string | undefined>(undefined);
  const sequenceRef = useRef(0);

  const save = useCallback(() => {
    if (!enabled) return;

    const dataJson = JSON.stringify(data);

    if (dataJson === lastSavedRef.current) {
      return;
    }

    const currentSequence = ++sequenceRef.current;

    mutation.mutate(data, {
      onSuccess: () => {
        if (currentSequence === sequenceRef.current) {
          lastSavedRef.current = dataJson;
        }
      },
    });
  }, [data, mutation, enabled]);

  useEffect(() => {
    if (!enabled) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(save, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, delay, save, enabled]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    isSaving: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    forceSave: save,
  };
}
