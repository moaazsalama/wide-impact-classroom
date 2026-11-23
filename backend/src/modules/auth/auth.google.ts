import { OAuth2Client } from 'google-auth-library';
import { AppError } from '../../lib/AppError.js';

export interface GoogleIdentity {
  sub: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
}

/** Abstraction over Google ID-token verification so tests can inject a stub. */
export interface GoogleTokenVerifier {
  /** Resolves with a verified identity or throws 401 INVALID_GOOGLE_TOKEN. */
  verify(idToken: string): Promise<GoogleIdentity>;
}

const invalidToken = (message: string) => new AppError(401, 'INVALID_GOOGLE_TOKEN', message);

export function createGoogleTokenVerifier(clientIds: string[]): GoogleTokenVerifier {
  const client = new OAuth2Client();

  return {
    async verify(idToken) {
      if (clientIds.length === 0) {
        throw invalidToken('Google sign-in is not configured on this server (GOOGLE_CLIENT_IDS is empty)');
      }

      let payload;
      try {
        const ticket = await client.verifyIdToken({ idToken, audience: clientIds });
        payload = ticket.getPayload();
      } catch {
        throw invalidToken('Google ID token could not be verified');
      }

      if (!payload?.sub || !payload.email) throw invalidToken('Google ID token is missing required claims');
      if (payload.email_verified !== true) throw invalidToken('Google account email is not verified');

      const email = payload.email.toLowerCase();
      return {
        sub: payload.sub,
        email,
        fullName: payload.name?.trim() || email.split('@')[0]!,
        avatarUrl: payload.picture ?? null,
      };
    },
  };
}
