import { useCallback, useEffect, useState } from 'react';
import { fetchStatus } from '../api/client';
import { StatusResponse } from '../types';

interface UseStatusResult {
  status: StatusResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useStatus = (): UseStatusResult => {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const data = await fetchStatus();
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load status');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
    const interval = window.setInterval(() => {
      void loadStatus();
    }, 30000);
    return () => window.clearInterval(interval);
  }, [loadStatus]);

  return { status, isLoading, error, refetch: loadStatus };
};
