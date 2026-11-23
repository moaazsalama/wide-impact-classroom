import type { Request, Response } from 'express';
import { devLoginSchema, googleLoginSchema, refreshTokenSchema } from './auth.schemas.js';
import type { AuthService } from './auth.service.js';

export function createAuthController(authService: AuthService) {
  return {
    async google(req: Request, res: Response) {
      const { idToken } = googleLoginSchema.parse(req.body);
      res.json(await authService.loginWithGoogle(idToken));
    },

    async devLogin(req: Request, res: Response) {
      const { email, fullName } = devLoginSchema.parse(req.body);
      res.json(await authService.devLogin(email, fullName));
    },

    async refresh(req: Request, res: Response) {
      const { refreshToken } = refreshTokenSchema.parse(req.body);
      res.json(await authService.refresh(refreshToken));
    },

    async logout(req: Request, res: Response) {
      const { refreshToken } = refreshTokenSchema.parse(req.body);
      await authService.logout(refreshToken);
      res.status(204).end();
    },
  };
}
