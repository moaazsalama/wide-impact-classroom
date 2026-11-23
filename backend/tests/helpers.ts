import request from 'supertest';
import { createApp, type AppDeps } from '../src/app.js';

export type TestApp = ReturnType<typeof createApp>;

export function buildApp(overrides: Partial<AppDeps> = {}): TestApp {
  return createApp(overrides);
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; fullName: string; role: string | null };
  auth: { Authorization: string };
}

export async function devLogin(app: TestApp, email: string, fullName?: string): Promise<Session> {
  const res = await request(app).post('/api/v1/auth/dev-login').send({ email, fullName });
  if (res.status !== 200) throw new Error(`dev-login failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { ...res.body, auth: { Authorization: `Bearer ${res.body.accessToken}` } };
}

export async function loginAs(app: TestApp, email: string, role: 'teacher' | 'student'): Promise<Session> {
  const session = await devLogin(app, email);
  const res = await request(app).patch('/api/v1/me/role').set(session.auth).send({ role });
  if (res.status !== 200) throw new Error(`set role failed: ${res.status}`);
  return { ...session, user: res.body.user };
}

export async function createClassroom(app: TestApp, teacher: Session, body: Record<string, unknown> = { name: 'Math 101' }) {
  const res = await request(app).post('/api/v1/classrooms').set(teacher.auth).send(body);
  if (res.status !== 201) throw new Error(`create classroom failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.classroom as { id: string; joinCode: string; name: string };
}
