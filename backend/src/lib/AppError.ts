export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'INVALID_GOOGLE_TOKEN'
  | 'INVALID_REFRESH_TOKEN'
  | 'REFRESH_TOKEN_REUSED'
  | 'ROLE_REQUIRED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'INVALID_JOIN_CODE'
  | 'ROLE_ALREADY_SET'
  | 'CONFLICT'
  | 'PAYLOAD_TOO_LARGE'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export interface ErrorDetail {
  path: string;
  message: string;
}

/** An expected, client-facing error. Anything else is treated as a 500. */
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
    readonly details?: ErrorDetail[],
  ) {
    super(message);
    this.name = 'AppError';
  }

  static unauthenticated(message = 'Authentication required') {
    return new AppError(401, 'UNAUTHENTICATED', message);
  }

  static forbidden(message = 'You do not have permission to perform this action') {
    return new AppError(403, 'FORBIDDEN', message);
  }

  static notFound(message = 'Resource not found') {
    return new AppError(404, 'NOT_FOUND', message);
  }
}

export interface ErrorBody {
  error: { code: ErrorCode; message: string; details?: ErrorDetail[] };
}

export function errorBody(code: ErrorCode, message: string, details?: ErrorDetail[]): ErrorBody {
  return { error: details ? { code, message, details } : { code, message } };
}
