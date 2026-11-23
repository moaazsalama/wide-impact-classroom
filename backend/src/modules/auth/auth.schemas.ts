import { z } from 'zod';

export const googleLoginSchema = z.object({
  idToken: z.string().min(1).max(4096),
});

export const devLoginSchema = z.object({
  email: z.email().max(254).transform((email) => email.toLowerCase()),
  fullName: z.string().trim().min(1).max(100).optional(),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1).max(512),
});
