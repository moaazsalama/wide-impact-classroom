import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { AppError } from '../lib/AppError.js';
import type { UserRole } from '../modules/users/users.types.js';
import { currentUser } from './authenticate.js';

/** 403 ROLE_REQUIRED until a role is chosen, then 403 FORBIDDEN for roles not in `allowed`. */
export function requireRole(...allowed: UserRole[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const { role } = currentUser(req);
    if (!role) throw new AppError(403, 'ROLE_REQUIRED', 'Choose a role (teacher or student) first');
    if (!allowed.includes(role)) {
      throw AppError.forbidden(`This action is only available to: ${allowed.join(', ')}`);
    }
    next();
  };
}
