import type { Request, RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import { errorBody } from '../lib/AppError.js';

const FIFTEEN_MINUTES = 15 * 60 * 1000;

export interface RateLimitOptions {
  /** Max auth requests per IP per 15 minutes. */
  authPerIp: number;
  /** Max join-code lookups + joins per user per 15 minutes. */
  joinPerUser: number;
}

export const DEFAULT_RATE_LIMITS: RateLimitOptions = { authPerIp: 30, joinPerUser: 20 };

export interface RateLimiters {
  auth: RequestHandler;
  join: RequestHandler;
}

function limiter(limit: number, keyGenerator?: (req: Request) => string): RequestHandler {
  return rateLimit({
    windowMs: FIFTEEN_MINUTES,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    ...(keyGenerator ? { keyGenerator } : {}),
    handler: (_req, res) => {
      res.status(429).json(errorBody('RATE_LIMITED', 'Too many requests, please try again later'));
    },
  });
}

export function createRateLimiters(options: RateLimitOptions): RateLimiters {
  return {
    // Default key generator: client IP (IPv6 normalised to a /56 subnet).
    auth: limiter(options.authPerIp),
    // Mounted after `authenticate`, so join-code guessing is throttled per account.
    join: limiter(options.joinPerUser, (req) => `user:${req.user?.id ?? 'anonymous'}`),
  };
}
