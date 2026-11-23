import type { Request, Response } from 'express';
import { currentUser } from '../../middleware/authenticate.js';
import { setRoleSchema } from './users.schemas.js';
import { usersService } from './users.service.js';

export const usersController = {
  getMe(req: Request, res: Response) {
    res.json({ user: currentUser(req) });
  },

  async setRole(req: Request, res: Response) {
    const { role } = setRoleSchema.parse(req.body);
    const user = await usersService.chooseRole(currentUser(req).id, role);
    res.json({ user });
  },
};
