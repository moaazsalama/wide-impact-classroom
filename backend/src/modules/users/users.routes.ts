import { Router, type RequestHandler } from 'express';
import { usersController } from './users.controller.js';

/** `/me` routes work before a role is chosen, so they only require authentication. */
export function createUsersRouter(authenticate: RequestHandler): Router {
  const router = Router();
  router.use(authenticate);
  router.get('/', usersController.getMe);
  router.patch('/role', usersController.setRole);
  return router;
}
