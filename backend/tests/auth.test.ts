import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { env } from '../src/config/env.js';
import { AppError } from '../src/lib/AppError.js';
import type { GoogleIdentity, GoogleTokenVerifier } from '../src/modules/auth/auth.google.js';
import { buildApp, devLogin } from './helpers.js';

const app = buildApp();

describe('POST /auth/dev-login', () => {
  it('creates a user with role null and returns a token pair', async () => {
    const res = await request(app).post('/api/v1/auth/dev-login').send({ email: 'New.User@Test.com', fullName: 'New User' });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.refreshToken).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({ email: 'new.user@test.com', fullName: 'New User', role: null, avatarUrl: null });
    expect(res.body.user).not.toHaveProperty('googleSub');
  });

  it('is idempotent per email (returns the same user)', async () => {
    const first = await devLogin(app, 'same@test.com');
    const second = await devLogin(app, 'SAME@test.com');
    expect(second.user.id).toBe(first.user.id);
    expect(second.user.fullName).toBe('same');
  });

  it('returns the contract validation error shape', async () => {
    const res = await request(app).post('/api/v1/auth/dev-login').send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual([{ path: 'email', message: expect.any(String) }]);
  });

  it('is 404 NOT_FOUND when ENABLE_DEV_LOGIN is false', async () => {
    const prodLike = buildApp({ config: { ...env, ENABLE_DEV_LOGIN: false } });
    const res = await request(prodLike).post('/api/v1/auth/dev-login').send({ email: 'a@test.com' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe('POST /auth/refresh', () => {
  it('rotates the refresh token', async () => {
    const session = await devLogin(app, 'rotate@test.com');
    const res = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: session.refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.refreshToken).not.toBe(session.refreshToken);
    expect(res.body.user.id).toBe(session.user.id);

    const me = await request(app).get('/api/v1/me').set('Authorization', `Bearer ${res.body.accessToken}`);
    expect(me.status).toBe(200);
  });

  it('detects reuse of a rotated token and revokes every session', async () => {
    const session = await devLogin(app, 'reuse@test.com');
    const rotated = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: session.refreshToken });
    expect(rotated.status).toBe(200);

    const replay = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: session.refreshToken });
    expect(replay.status).toBe(401);
    expect(replay.body.error.code).toBe('REFRESH_TOKEN_REUSED');

    const newer = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: rotated.body.refreshToken });
    expect(newer.status).toBe(401);
    expect(newer.body.error.code).toBe('INVALID_REFRESH_TOKEN');
  });

  it('rejects unknown tokens', async () => {
    const res = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: 'nope' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_REFRESH_TOKEN');
  });
});

describe('POST /auth/logout', () => {
  it('revokes the refresh token and is idempotent', async () => {
    const session = await devLogin(app, 'logout@test.com');

    const first = await request(app).post('/api/v1/auth/logout').send({ refreshToken: session.refreshToken });
    const second = await request(app).post('/api/v1/auth/logout').send({ refreshToken: session.refreshToken });
    expect(first.status).toBe(204);
    expect(second.status).toBe(204);

    const refresh = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: session.refreshToken });
    expect(refresh.status).toBe(401);
    expect(refresh.body.error.code).toBe('INVALID_REFRESH_TOKEN');
  });
});

describe('POST /auth/google', () => {
  const identity: GoogleIdentity = {
    sub: 'google-sub-123',
    email: 'jane@gmail.com',
    fullName: 'Jane Doe',
    avatarUrl: 'https://example.com/jane.png',
  };
  const stubVerifier: GoogleTokenVerifier = {
    async verify(idToken) {
      if (idToken !== 'valid-token') throw new AppError(401, 'INVALID_GOOGLE_TOKEN', 'bad token');
      return identity;
    },
  };
  const googleApp = buildApp({ googleVerifier: stubVerifier });

  it('creates a user on first login and reuses it afterwards', async () => {
    const first = await request(googleApp).post('/api/v1/auth/google').send({ idToken: 'valid-token' });
    expect(first.status).toBe(200);
    expect(first.body.user).toMatchObject({ email: 'jane@gmail.com', fullName: 'Jane Doe', role: null, avatarUrl: identity.avatarUrl });

    const second = await request(googleApp).post('/api/v1/auth/google').send({ idToken: 'valid-token' });
    expect(second.body.user.id).toBe(first.body.user.id);
  });

  it('links the Google account to an existing user with the same email', async () => {
    const existing = await devLogin(app, 'jane@gmail.com', 'Seeded Jane');
    const res = await request(googleApp).post('/api/v1/auth/google').send({ idToken: 'valid-token' });
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ id: existing.user.id, fullName: 'Seeded Jane', avatarUrl: identity.avatarUrl });
  });

  it('rejects tokens the verifier refuses', async () => {
    const res = await request(googleApp).post('/api/v1/auth/google').send({ idToken: 'forged' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_GOOGLE_TOKEN');
  });

  it('explains when the server has no Google client ids configured', async () => {
    const unconfigured = buildApp({ config: { ...env, GOOGLE_CLIENT_IDS: [] } });
    const res = await request(unconfigured).post('/api/v1/auth/google').send({ idToken: 'anything' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_GOOGLE_TOKEN');
    expect(res.body.error.message).toMatch(/not configured/);
  });
});

describe('rate limiting', () => {
  it('returns 429 RATE_LIMITED with the contract error shape', async () => {
    const limited = buildApp({ rateLimits: { authPerIp: 2, joinPerUser: 100 } });
    for (let i = 0; i < 2; i++) {
      await request(limited).post('/api/v1/auth/refresh').send({ refreshToken: 'x' });
    }
    const res = await request(limited).post('/api/v1/auth/refresh').send({ refreshToken: 'x' });
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
    expect(res.headers).toHaveProperty('ratelimit-policy');
  });
});
