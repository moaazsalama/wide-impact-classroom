import { createHash, randomBytes } from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { z } from 'zod';
import { AppError } from './AppError.js';

export interface TokenConfig {
  accessSecret: string;
  accessTtl: string;
}

export interface TokenService {
  signAccessToken(userId: string): string;
  /** Returns the user id (`sub`) or throws 401 UNAUTHENTICATED. */
  verifyAccessToken(token: string): string;
}

const accessPayloadSchema = z.object({ sub: z.uuid() });

export function createTokenService(config: TokenConfig): TokenService {
  return {
    signAccessToken(userId) {
      return jwt.sign({}, config.accessSecret, {
        algorithm: 'HS256',
        subject: userId,
        expiresIn: config.accessTtl as SignOptions['expiresIn'],
      });
    },
    verifyAccessToken(token) {
      try {
        const payload = jwt.verify(token, config.accessSecret, { algorithms: ['HS256'] });
        return accessPayloadSchema.parse(payload).sub;
      } catch {
        throw AppError.unauthenticated('Invalid or expired access token');
      }
    },
  };
}

/** Opaque refresh token: 48 random bytes, base64url. Only its hash is persisted. */
export function generateRefreshToken(): string {
  return randomBytes(48).toString('base64url');
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function refreshTokenExpiry(ttlDays: number, from = new Date()): Date {
  return new Date(from.getTime() + ttlDays * 24 * 60 * 60 * 1000);
}
