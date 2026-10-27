'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Result<T> {
  key: string;
  data?: T;
  error?: Error;
}

// Runs load() whenever key changes, aborting the previous run. A null key skips loading.
// Data from the previous key stays available while the next one loads.
export function useAsync<T>(key: string | null, load: (signal: AbortSignal) => Promise<T>) {
  const [result, setResult] = useState<Result<T> | null>(null);

  useEffect(() => {
    if (key == null) return;
    const controller = new AbortController();
    load(controller.signal).then(
      (data) => setResult({ key, data }),
      (error: Error) => { if (!controller.signal.aborted) setResult((prev) => ({ key, data: prev?.data, error })); },
    );
    return () => controller.abort();
    // load is keyed by `key`; callers pass inline functions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const current = result?.key === key;
  return {
    data: result?.data,
    error: current ? result?.error : undefined,
    loading: key != null && !current,
  };
}

export function useApi<T>(path: string | null) {
  return useAsync<T>(path, (signal) => api<T>(path!, signal));
}
