import { withTransaction, type Queryable } from '../../db/pool.js';
import { AppError } from '../../lib/AppError.js';
import { generateRefreshToken, hashRefreshToken, refreshTokenExpiry, type TokenService } from '../../lib/tokens.js';
import { usersRepository } from '../users/users.repository.js';
import { toPublicUser, type User, type UserRecord } from '../users/users.types.js';
import type { GoogleIdentity, GoogleTokenVerifier } from './auth.google.js';
import { authRepository } from './auth.repository.js';

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface AuthServiceDeps {
  tokens: TokenService;
  googleVerifier: GoogleTokenVerifier;
  refreshTokenTtlDays: number;
}

export type AuthService = ReturnType<typeof createAuthService>;

export function createAuthService({ tokens, googleVerifier, refreshTokenTtlDays }: AuthServiceDeps) {
  async function issueSession(user: UserRecord, db?: Queryable): Promise<AuthResponse & { refreshTokenId: string }> {
    const refreshToken = generateRefreshToken();
    const refreshTokenId = await authRepository.insertRefreshToken(
      user.id,
      hashRefreshToken(refreshToken),
      refreshTokenExpiry(refreshTokenTtlDays),
      db,
    );
    return { accessToken: tokens.signAccessToken(user.id), refreshToken, user: toPublicUser(user), refreshTokenId };
  }

  async function startSession(user: UserRecord, db?: Queryable): Promise<AuthResponse> {
    const { refreshTokenId: _id, ...session } = await issueSession(user, db);
    return session;
  }

  /** Finds the user by Google `sub`, else links an existing account with the same email, else creates one. */
  async function resolveGoogleUser(identity: GoogleIdentity, db: Queryable): Promise<UserRecord> {
    const bySub = await usersRepository.findByGoogleSub(identity.sub, db);
    if (bySub) {
      return identity.avatarUrl && identity.avatarUrl !== bySub.avatarUrl
        ? usersRepository.updateAvatar(bySub.id, identity.avatarUrl, db)
        : bySub;
    }

    const byEmail = await usersRepository.findByEmailForUpdate(identity.email, db);
    if (byEmail) {
      if (byEmail.googleSub) {
        throw new AppError(409, 'CONFLICT', 'This email is already linked to a different Google account');
      }
      return usersRepository.linkGoogleAccount(byEmail.id, identity.sub, identity.avatarUrl, db);
    }

    return usersRepository.create(
      { email: identity.email, fullName: identity.fullName, avatarUrl: identity.avatarUrl, googleSub: identity.sub },
      db,
    );
  }

  return {
    async loginWithGoogle(idToken: string): Promise<AuthResponse> {
      const identity = await googleVerifier.verify(idToken);
      return withTransaction(async (client) => startSession(await resolveGoogleUser(identity, client), client));
    },

    async devLogin(email: string, fullName?: string): Promise<AuthResponse> {
      const fallbackName = email.split('@')[0]!;
      return withTransaction(async (client) =>
        startSession(await usersRepository.upsertByEmail(email, fullName, fallbackName, client), client),
      );
    },

    /**
     * Rotates a refresh token. Replaying an already-rotated token is treated as theft:
     * every session of that user is revoked and 401 REFRESH_TOKEN_REUSED is returned.
     */
    async refresh(refreshToken: string): Promise<AuthResponse> {
      const outcome = await withTransaction(async (client) => {
        const stored = await authRepository.findByHashForUpdate(hashRefreshToken(refreshToken), client);
        if (!stored) return { kind: 'invalid' as const };

        if (stored.revokedAt) {
          if (!stored.replacedBy) return { kind: 'invalid' as const }; // logged out
          await authRepository.revokeAllForUser(stored.userId, client);
          return { kind: 'reused' as const };
        }
        if (stored.expiresAt.getTime() <= Date.now()) return { kind: 'invalid' as const };

        const user = await usersRepository.findById(stored.userId, client);
        if (!user) return { kind: 'invalid' as const };

        const { refreshTokenId, ...session } = await issueSession(user, client);
        await authRepository.markRotated(stored.id, refreshTokenId, client);
        return { kind: 'rotated' as const, session };
      });

      // Throw after commit so the reuse revocation is persisted.
      switch (outcome.kind) {
        case 'rotated':
          return outcome.session;
        case 'reused':
          throw new AppError(401, 'REFRESH_TOKEN_REUSED', 'Refresh token was already used; all sessions were revoked');
        case 'invalid':
          throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token is invalid or expired');
      }
    },

    /** Idempotent: unknown or already-revoked tokens are ignored. */
    async logout(refreshToken: string): Promise<void> {
      await authRepository.revokeByHash(hashRefreshToken(refreshToken));
    },
  };
}
