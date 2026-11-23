import { useCallback, useState } from 'react';

/**
 * Pull-to-refresh state that only reflects user-initiated refreshes
 * (background refetches should not show the spinner).
 */
export function useManualRefresh(refetch: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);
  return { refreshing, onRefresh };
}
