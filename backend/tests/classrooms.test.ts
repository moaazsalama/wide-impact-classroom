import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { buildApp, createClassroom, loginAs, type Session } from './helpers.js';

const app = buildApp();
const api = '/api/v1/classrooms';

let teacher: Session;
let student: Session;

beforeEach(async () => {
  teacher = await loginAs(app, 'teacher@test.com', 'teacher');
  student = await loginAs(app, 'student@test.com', 'student');
});

async function join(session: Session, code: string, method: 'qr' | 'code' = 'code') {
  return request(app).post(`${api}/join`).set(session.auth).send({ code, method });
}

describe('teacher classroom management', () => {
  it('creates a classroom with a 6-digit join code and lists it', async () => {
    const res = await request(app)
      .post(api)
      .set(teacher.auth)
      .send({ name: '  Physics  ', subject: 'Science', description: '' });

    expect(res.status).toBe(201);
    expect(res.body.classroom).toMatchObject({
      name: 'Physics',
      subject: 'Science',
      description: null,
      studentCount: 0,
    });
    expect(res.body.classroom.joinCode).toMatch(/^[0-9]{6}$/);

    const list = await request(app).get(api).set(teacher.auth);
    expect(list.status).toBe(200);
    expect(list.body.classrooms).toHaveLength(1);
    expect(list.body.classrooms[0]).toMatchObject({ id: res.body.classroom.id, studentCount: 0 });
  });

  it('lists classrooms newest first', async () => {
    const older = await createClassroom(app, teacher, { name: 'Older' });
    const newer = await createClassroom(app, teacher, { name: 'Newer' });
    const list = await request(app).get(api).set(teacher.auth);
    expect(list.body.classrooms.map((c: { id: string }) => c.id)).toEqual([newer.id, older.id]);
  });

  it('forbids students from creating classrooms', async () => {
    const res = await request(app).post(api).set(student.auth).send({ name: 'Nope' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('validates the body', async () => {
    const res = await request(app).post(api).set(teacher.auth).send({ name: '   ', description: 'x'.repeat(501) });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const paths = res.body.error.details.map((d: { path: string }) => d.path);
    expect(paths).toEqual(expect.arrayContaining(['name', 'description']));
  });

  it('rejects non-UUID ids with 400', async () => {
    const res = await request(app).get(`${api}/not-a-uuid`).set(teacher.auth);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('updates a subset of fields and requires at least one', async () => {
    const classroom = await createClassroom(app, teacher);
    const res = await request(app).patch(`${api}/${classroom.id}`).set(teacher.auth).send({ subject: 'Algebra' });
    expect(res.status).toBe(200);
    expect(res.body.classroom).toMatchObject({ name: 'Math 101', subject: 'Algebra' });

    const empty = await request(app).patch(`${api}/${classroom.id}`).set(teacher.auth).send({});
    expect(empty.status).toBe(400);
  });

  it('hides other teachers classrooms behind 404', async () => {
    const classroom = await createClassroom(app, teacher);
    const other = await loginAs(app, 'other.teacher@test.com', 'teacher');

    for (const res of [
      await request(app).get(`${api}/${classroom.id}`).set(other.auth),
      await request(app).patch(`${api}/${classroom.id}`).set(other.auth).send({ name: 'Hijacked' }),
      await request(app).delete(`${api}/${classroom.id}`).set(other.auth),
      await request(app).get(`${api}/${classroom.id}/students`).set(other.auth),
      await request(app).post(`${api}/${classroom.id}/join-code`).set(other.auth),
    ]) {
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    }
  });
});

describe('joining a classroom', () => {
  it('looks up a classroom by code before joining', async () => {
    const classroom = await createClassroom(app, teacher, { name: 'Math 101', subject: 'Math' });
    const res = await request(app).get(`${api}/lookup`).query({ code: classroom.joinCode }).set(student.auth);

    expect(res.status).toBe(200);
    expect(res.body.classroom).toEqual({
      id: classroom.id,
      name: 'Math 101',
      subject: 'Math',
      description: null,
      teacher: { id: teacher.user.id, fullName: teacher.user.fullName, avatarUrl: null },
      studentCount: 0,
      isEnrolled: false,
    });
  });

  it('joins via code (201), then is idempotent (200 alreadyEnrolled)', async () => {
    const classroom = await createClassroom(app, teacher);

    const first = await join(student, classroom.joinCode, 'qr');
    expect(first.status).toBe(201);
    expect(first.body.alreadyEnrolled).toBe(false);
    expect(first.body.classroom).toMatchObject({ id: classroom.id, joinedVia: 'qr', studentCount: 1 });
    expect(first.body.classroom).not.toHaveProperty('joinCode');

    const second = await join(student, classroom.joinCode, 'code');
    expect(second.status).toBe(200);
    expect(second.body.alreadyEnrolled).toBe(true);
    expect(second.body.classroom.joinedVia).toBe('qr');

    const lookup = await request(app).get(`${api}/lookup?code=${classroom.joinCode}`).set(student.auth);
    expect(lookup.body.classroom.isEnrolled).toBe(true);
  });

  it('returns 404 INVALID_JOIN_CODE for unknown codes and 400 for malformed ones', async () => {
    const classroom = await createClassroom(app, teacher);
    const unknown = classroom.joinCode === '000000' ? '000001' : '000000';

    const notFound = await join(student, unknown);
    expect(notFound.status).toBe(404);
    expect(notFound.body.error.code).toBe('INVALID_JOIN_CODE');

    const lookup = await request(app).get(`${api}/lookup?code=${unknown}`).set(student.auth);
    expect(lookup.status).toBe(404);
    expect(lookup.body.error.code).toBe('INVALID_JOIN_CODE');

    const malformed = await join(student, '12ab56');
    expect(malformed.status).toBe(400);
    expect(malformed.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('forbids teachers from joining', async () => {
    const classroom = await createClassroom(app, teacher);
    const res = await join(teacher, classroom.joinCode);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('rate limits lookups and joins per user', async () => {
    const limited = buildApp({ rateLimits: { authPerIp: 100, joinPerUser: 2 } });
    for (let i = 0; i < 2; i++) {
      await request(limited).get(`${api}/lookup?code=000000`).set(student.auth);
    }
    const blocked = await request(limited).post(`${api}/join`).set(student.auth).send({ code: '000000', method: 'code' });
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('RATE_LIMITED');

    // A different user has an independent budget.
    const other = await loginAs(limited, 'other.student@test.com', 'student');
    const allowed = await request(limited).get(`${api}/lookup?code=000000`).set(other.auth);
    expect(allowed.status).toBe(404);
  });
});

describe('after a student joins', () => {
  let classroom: { id: string; joinCode: string };

  beforeEach(async () => {
    classroom = await createClassroom(app, teacher);
    await join(student, classroom.joinCode);
  });

  it('teacher sees the student and studentCount 1', async () => {
    const students = await request(app).get(`${api}/${classroom.id}/students`).set(teacher.auth);
    expect(students.status).toBe(200);
    expect(students.body.students).toEqual([
      {
        id: student.user.id,
        fullName: student.user.fullName,
        email: 'student@test.com',
        avatarUrl: null,
        joinedAt: expect.any(String),
        joinedVia: 'code',
      },
    ]);

    const detail = await request(app).get(`${api}/${classroom.id}`).set(teacher.auth);
    expect(detail.body.classroom.studentCount).toBe(1);
    expect(detail.body.classroom.joinCode).toBe(classroom.joinCode);
  });

  it('student sees the classroom without the join code', async () => {
    const detail = await request(app).get(`${api}/${classroom.id}`).set(student.auth);
    expect(detail.status).toBe(200);
    expect(detail.body.classroom).not.toHaveProperty('joinCode');
    expect(detail.body.classroom.teacher).toEqual({ id: teacher.user.id, fullName: teacher.user.fullName, avatarUrl: null });

    const list = await request(app).get(api).set(student.auth);
    expect(list.body.classrooms).toHaveLength(1);
    expect(list.body.classrooms[0]).not.toHaveProperty('joinCode');
  });

  it('a student who is not enrolled gets 404', async () => {
    const outsider = await loginAs(app, 'outsider@test.com', 'student');
    const res = await request(app).get(`${api}/${classroom.id}`).set(outsider.auth);
    expect(res.status).toBe(404);
  });

  it('regenerating the code invalidates the old one', async () => {
    const res = await request(app).post(`${api}/${classroom.id}/join-code`).set(teacher.auth);
    expect(res.status).toBe(200);
    const newCode = res.body.classroom.joinCode;
    expect(newCode).toMatch(/^[0-9]{6}$/);
    expect(newCode).not.toBe(classroom.joinCode);

    const newcomer = await loginAs(app, 'newcomer@test.com', 'student');
    const old = await join(newcomer, classroom.joinCode);
    expect(old.status).toBe(404);
    expect(old.body.error.code).toBe('INVALID_JOIN_CODE');

    const fresh = await join(newcomer, newCode);
    expect(fresh.status).toBe(201);
  });

  it('teacher removes a student (204), then 404 on repeat', async () => {
    const path = `${api}/${classroom.id}/students/${student.user.id}`;
    const removed = await request(app).delete(path).set(teacher.auth);
    expect(removed.status).toBe(204);

    const students = await request(app).get(`${api}/${classroom.id}/students`).set(teacher.auth);
    expect(students.body.students).toEqual([]);

    const again = await request(app).delete(path).set(teacher.auth);
    expect(again.status).toBe(404);
  });

  it('student leaves the classroom (204)', async () => {
    const res = await request(app).post(`${api}/${classroom.id}/leave`).set(student.auth);
    expect(res.status).toBe(204);

    const list = await request(app).get(api).set(student.auth);
    expect(list.body.classrooms).toEqual([]);

    const again = await request(app).post(`${api}/${classroom.id}/leave`).set(student.auth);
    expect(again.status).toBe(404);
  });

  it('deleting a classroom cascades to enrollments', async () => {
    const res = await request(app).delete(`${api}/${classroom.id}`).set(teacher.auth);
    expect(res.status).toBe(204);

    const list = await request(app).get(api).set(student.auth);
    expect(list.body.classrooms).toEqual([]);

    const detail = await request(app).get(`${api}/${classroom.id}`).set(teacher.auth);
    expect(detail.status).toBe(404);
  });
});
