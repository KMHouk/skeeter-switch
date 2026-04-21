import { useCallback, useEffect, useMemo, useState } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { fetchPlan } from '../api/client';
import { AppConfig, PlanBlock } from '../types';

interface DateRange {
  start: Date;
  end: Date;
}

interface UseCalendarResult {
  blocks: PlanBlock[];
  actuals: Record<string, number>;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

const getDefaultRange = (): DateRange => {
  const now = new Date();
  const start = startOfMonth(now);
  const end = endOfMonth(now);
  return { start, end };
};

export const useCalendar = (range?: DateRange, config?: AppConfig | null): UseCalendarResult => {
  const [blocks, setBlocks] = useState<PlanBlock[]>([]);
  const [actuals, setActuals] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const defaultRange = useMemo(() => getDefaultRange(), []);
  const activeRange = range ?? defaultRange;

  // Stabilize date strings to prevent infinite re-render loop
  const fromStr = format(activeRange.start, 'yyyy-MM-dd');
  const toStr = format(activeRange.end, 'yyyy-MM-dd');

  const loadPlan = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetchPlan(fromStr, toStr);
      setBlocks(response.blocks);
      setActuals(response.actuals ?? {});
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load plan');
    } finally {
      setIsLoading(false);
    }
  }, [fromStr, toStr]);

  useEffect(() => {
    void loadPlan();
  }, [loadPlan, config?.runWindowStart, config?.runWindowEnd, config?.dryRun]);

  return { blocks, actuals, isLoading, error, refetch: loadPlan };
};
