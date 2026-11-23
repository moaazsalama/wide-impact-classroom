import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { pool } from '../src/db/pool.js';
import { buildApp, devLogin } from './helpers.js';

const app = buildApp();

describe('authentication', () => {
  it('rejects missing and malformed access tokens', async () => {
    const missing = await request(app).get('/api/v1/me');
    const malformed = await request(app).get('/api/v1/me').set('Authorization', 'Bearer not-a-jwt');
    expect(missing.status).toBe(401);
    expect(missing.body.error.code).toBe('UNAUTHENTICATED');
    expect(malformed.status).toBe(401);
  });

  it('rejects tokens of deleted users', async () => {
    const session = await devLogin(app, 'gone@test.com');
    await pool.query('DELETE FROM users WHERE id = $1', [session.user.id]);
    const res = await request(app).get('/api/v1/me').set(session.auth);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });
});

describe('/me', () => {
  it('returns the current user', async () => {
    const session = await devLogin(app, 'me@test.com', 'Me Myself');
    const res = await request(app).get('/api/v1/me').set(session.auth);
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ id: session.user.id, fullName: 'Me Myself', role: null });
  });

  it('requires a role before using classroom endpoints', async () => {
    const session = await devLogin(app, 'norole@test.com');
    const res = await request(app).get('/api/v1/classrooms').set(session.auth);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ROLE_REQUIRED');
  });

  it('sets the role once, then 409 ROLE_ALREADY_SET', async () => {
    const session = await devLogin(app, 'role@test.com');
    const first = await request(app).patch('/api/v1/me/role').set(session.auth).send({ role: 'teacher' });
    expect(first.status).toBe(200);
    expect(first.body.user.role).toBe('teacher');

    const second = await request(app).patch('/api/v1/me/role').set(session.auth).send({ role: 'student' });
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('ROLE_ALREADY_SET');
  });

  it('validates the role value', async () => {
    const session = await devLogin(app, 'badrole@test.com');
    const res = await request(app).patch('/api/v1/me/role').set(session.auth).send({ role: 'admin' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details[0].path).toBe('role');
  });
});

describe('misc', () => {
  it('GET /health reports the database status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', db: 'ok' });
  });

  it('unknown routes return 404 NOT_FOUND', async () => {
    const res = await request(app).get('/api/v1/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('malformed JSON returns 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/v1/auth/dev-login')
      .set('Content-Type', 'application/json')
      .send('{"email":');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
