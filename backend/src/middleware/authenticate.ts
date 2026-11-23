import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { AppError } from '../lib/AppError.js';
import type { TokenService } from '../lib/tokens.js';
import { usersRepository } from '../modules/users/users.repository.js';
import { toPublicUser, type User } from '../modules/users/users.types.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Set by `authenticate`: the freshly loaded user row for this request. */
      user?: User;
    }
  }
}

/**
 * Verifies the Bearer access token and loads the user on every request,
 * so role changes and deleted accounts take effect immediately.
 */
export function createAuthenticate(tokens: TokenService): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const header = req.get('authorization');
    const match = header?.match(/^Bearer\s+(\S+)$/i);
    if (!match?.[1]) throw AppError.unauthenticated('Missing Bearer access token');

    const userId = tokens.verifyAccessToken(match[1]);
    const user = await usersRepository.findById(userId);
    if (!user) throw AppError.unauthenticated('User no longer exists');

    req.user = toPublicUser(user);
    next();
  };
}

/** The authenticated user; only call from handlers mounted behind `authenticate`. */
export function currentUser(req: Request): User {
  if (!req.user) throw AppError.unauthenticated();
  return req.user;
}
