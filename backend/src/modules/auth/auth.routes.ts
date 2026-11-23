import { Router, type RequestHandler } from 'express';
import { createAuthController } from './auth.controller.js';
import type { AuthService } from './auth.service.js';

export interface AuthRouterDeps {
  authService: AuthService;
  rateLimiter: RequestHandler;
  enableDevLogin: boolean;
}

export function createAuthRouter({ authService, rateLimiter, enableDevLogin }: AuthRouterDeps): Router {
  const controller = createAuthController(authService);
  const router = Router();

  router.use(rateLimiter);
  router.post('/google', controller.google);
  // When disabled the route is simply not registered, so it falls through to 404 NOT_FOUND.
  if (enableDevLogin) router.post('/dev-login', controller.devLogin);
  router.post('/refresh', controller.refresh);
  router.post('/logout', controller.logout);

  return router;
}
