import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError, errorBody } from '../lib/AppError.js';
import { logger } from '../lib/logger.js';

interface HttpParserError {
  type: string;
  status: number;
}

function isBodyParserError(error: unknown): error is HttpParserError {
  return typeof error === 'object' && error !== null && 'type' in error && 'status' in error;
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === '23505';
}

/** Single place that turns any thrown error into the contract's error shape. */
export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction) {
  if (res.headersSent) {
    req.log?.error({ err: error }, 'Error after response was sent');
    return;
  }

  if (error instanceof ZodError) {
    const details = error.issues.map((issue) => ({
      path: issue.path.map(String).join('.'),
      message: issue.message,
    }));
    res.status(400).json(errorBody('VALIDATION_ERROR', 'Request validation failed', details));
    return;
  }

  if (error instanceof AppError) {
    res.status(error.status).json(errorBody(error.code, error.message, error.details));
    return;
  }

  if (isBodyParserError(error)) {
    if (error.type === 'entity.too.large') {
      res.status(413).json(errorBody('PAYLOAD_TOO_LARGE', 'Request body is too large'));
      return;
    }
    if (error.type === 'entity.parse.failed') {
      res.status(400).json(errorBody('VALIDATION_ERROR', 'Request body is not valid JSON'));
      return;
    }
  }

  if (isUniqueViolation(error)) {
    res.status(409).json(errorBody('CONFLICT', 'Resource already exists'));
    return;
  }

  (req.log ?? logger).error({ err: error }, 'Unhandled error');
  res.status(500).json(errorBody('INTERNAL_ERROR', 'Something went wrong'));
}
