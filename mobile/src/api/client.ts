import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

import { env } from '@/config/env';
import { tokenStorage } from '@/features/auth/tokenStorage';
import type { AuthResponse } from '@/types/api';

import { toApiError } from './errors';

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Do not attempt a token refresh when this request returns 401 (auth endpoints). */
    skipAuthRefresh?: boolean;
    /** Internal: set once the request has been retried after a refresh. */
    _retried?: boolean;
  }
}

const REQUEST_TIMEOUT_MS = 15_000;

export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: REQUEST_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

// ---------------------------------------------------------------------------
// Session hooks — registered by the auth store to avoid an import cycle.
// ---------------------------------------------------------------------------

type SessionHandlers = {
  /** Called with the new AuthResponse after a successful silent refresh. */
  onRefreshed?: (auth: AuthResponse) => void | Promise<void>;
  /** Called when the refresh token is rejected — the session cannot be recovered. */
  onSessionExpired?: () => void | Promise<void>;
};

let sessionHandlers: SessionHandlers = {};

export function registerSessionHandlers(handlers: SessionHandlers): void {
  sessionHandlers = handlers;
}

// ---------------------------------------------------------------------------
// Single-flight refresh: concurrent 401s share one /auth/refresh call.
// ---------------------------------------------------------------------------

let refreshPromise: Promise<string> | null = null;

async function performRefresh(): Promise<string> {
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) {
    await sessionHandlers.onSessionExpired?.();
    throw toApiError(new Error('No refresh token'));
  }

  try {
    // Bare axios call: must not go through our interceptors (no recursion).
    const { data } = await axios.post<AuthResponse>(
      `${env.apiBaseUrl}/auth/refresh`,
      { refreshToken },
      { timeout: REQUEST_TIMEOUT_MS },
    );
    await tokenStorage.save({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    await sessionHandlers.onRefreshed?.(data);
    return data.accessToken;
  } catch (error) {
    const apiError = toApiError(error);
    // Only a definitive rejection ends the session; network blips keep the tokens.
    if (apiError.status === 401 || apiError.status === 400) {
      await sessionHandlers.onSessionExpired?.();
    }
    throw apiError;
  }
}

export function refreshAccessToken(): Promise<string> {
  refreshPromise ??= performRefresh().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

// ---------------------------------------------------------------------------
// Interceptors
// ---------------------------------------------------------------------------

function setAuthHeader(config: InternalAxiosRequestConfig, token: string): void {
  config.headers.set('Authorization', `Bearer ${token}`);
}

apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.getAccessToken();
  if (token && !config.headers.has('Authorization')) setAuthHeader(config, token);
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const apiError = toApiError(error);
    const config = error.config;

    const shouldRefresh =
      config !== undefined &&
      apiError.status === 401 &&
      apiError.code === 'UNAUTHENTICATED' &&
      !config.skipAuthRefresh &&
      !config._retried &&
      tokenStorage.getRefreshToken() !== null;

    if (!shouldRefresh) throw apiError;

    config._retried = true;
    const usedToken = config.headers.get('Authorization');
    const currentToken = tokenStorage.getAccessToken();

    // Another request already refreshed while this one was in flight: just retry.
    const newToken =
      currentToken && usedToken !== `Bearer ${currentToken}` ? currentToken : await refreshAccessToken();

    setAuthHeader(config, newToken);
    try {
      return await apiClient.request(config);
    } catch (retryError) {
      throw toApiError(retryError);
    }
  },
);
