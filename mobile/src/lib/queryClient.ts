import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query';
import { AppState, Platform, type AppStateStatus } from 'react-native';

import { toApiError } from '@/api/errors';

const MAX_RETRIES = 2;

/** Retry only transient failures (network/5xx); 4xx answers will not change on retry. */
function shouldRetry(failureCount: number, error: unknown): boolean {
  const apiError = toApiError(error);
  if (apiError.status !== null && apiError.status < 500) return false;
  return failureCount < MAX_RETRIES;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: shouldRetry,
    },
    mutations: {
      retry: false,
    },
  },
});

/** Refetch stale queries when the app returns to the foreground. */
export function subscribeAppStateFocus(): () => void {
  const onChange = (status: AppStateStatus) => {
    if (Platform.OS !== 'web') focusManager.setFocused(status === 'active');
  };
  const subscription = AppState.addEventListener('change', onChange);
  return () => subscription.remove();
}

export { onlineManager };
