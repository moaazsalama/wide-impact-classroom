import { isAxiosError } from 'axios';

import type { ApiErrorBody, ApiErrorCode, ApiErrorDetail } from '@/types/api';

/** Codes produced on the client when no API error body is available. */
export type ClientErrorCode = 'NETWORK_ERROR' | 'TIMEOUT' | 'UNKNOWN';
export type ErrorCode = ApiErrorCode | ClientErrorCode;

export class ApiError extends Error {
  readonly code: ErrorCode | (string & {});
  readonly status: number | null;
  readonly details: ApiErrorDetail[];

  constructor(params: {
    code: ApiError['code'];
    message: string;
    status?: number | null;
    details?: ApiErrorDetail[];
  }) {
    super(params.message);
    this.name = 'ApiError';
    this.code = params.code;
    this.status = params.status ?? null;
    this.details = params.details ?? [];
  }

  get isNetworkError(): boolean {
    return this.code === 'NETWORK_ERROR' || this.code === 'TIMEOUT';
  }
}

function isApiErrorBody(data: unknown): data is ApiErrorBody {
  if (typeof data !== 'object' || data === null || !('error' in data)) return false;
  const error = (data as { error: unknown }).error;
  return (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as { code?: unknown }).code === 'string' &&
    typeof (error as { message?: unknown }).message === 'string'
  );
}

/** Normalises anything thrown by axios (or elsewhere) into an ApiError. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (isAxiosError(error)) {
    const status = error.response?.status ?? null;
    const data: unknown = error.response?.data;

    if (isApiErrorBody(data)) {
      return new ApiError({
        code: data.error.code,
        message: data.error.message,
        status,
        details: data.error.details,
      });
    }
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new ApiError({ code: 'TIMEOUT', message: 'Request timed out' });
    }
    if (!error.response) {
      return new ApiError({ code: 'NETWORK_ERROR', message: error.message || 'Network error' });
    }
    if (status === 429) {
      return new ApiError({ code: 'RATE_LIMITED', message: 'Too many requests', status });
    }
    return new ApiError({
      code: status !== null && status >= 500 ? 'INTERNAL_ERROR' : 'UNKNOWN',
      message: error.message,
      status,
    });
  }

  return new ApiError({
    code: 'UNKNOWN',
    message: error instanceof Error ? error.message : 'Unexpected error',
  });
}

export function isApiError(error: unknown, code?: ErrorCode): error is ApiError {
  return error instanceof ApiError && (code === undefined || error.code === code);
}

const FRIENDLY_MESSAGES: Partial<Record<ErrorCode, string>> = {
  NETWORK_ERROR: "Can't reach the server. Check your connection and try again.",
  TIMEOUT: 'The server took too long to respond. Please try again.',
  INVALID_JOIN_CODE: 'No classroom found with that code.',
  RATE_LIMITED: 'Too many attempts. Please wait a few minutes and try again.',
  INVALID_GOOGLE_TOKEN: "We couldn't verify your Google account. Please try again.",
  UNAUTHENTICATED: 'Your session has expired. Please sign in again.',
  INVALID_REFRESH_TOKEN: 'Your session has expired. Please sign in again.',
  REFRESH_TOKEN_REUSED: 'For your security you were signed out. Please sign in again.',
  ROLE_REQUIRED: 'Please choose whether you are a teacher or a student first.',
  FORBIDDEN: "You don't have permission to do that.",
  NOT_FOUND: "This classroom doesn't exist or you no longer have access to it.",
  ROLE_ALREADY_SET: 'Your role has already been set.',
  INTERNAL_ERROR: 'Something went wrong on our side. Please try again.',
};

/** User-facing message for any error. */
export function getErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const apiError = toApiError(error);
  if (apiError.code === 'VALIDATION_ERROR') {
    return apiError.details[0]?.message ?? apiError.message ?? fallback;
  }
  return FRIENDLY_MESSAGES[apiError.code as ErrorCode] ?? (apiError.message || fallback);
}
