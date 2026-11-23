/**
 * Idempotent seed for reviewer test accounts (use with ENABLE_DEV_LOGIN=true):
 *   teacher@test.com  (Ms. Rivera, teacher)
 *   student1@test.com (Alex Kim, student, enrolled in "Mathematics 101")
 *   student2@test.com (Sara Ali, student, not enrolled)
 */
import { classroomsRepository } from '../modules/classrooms/classrooms.repository.js';
import { classroomsService } from '../modules/classrooms/classrooms.service.js';
import type { UserRole } from '../modules/users/users.types.js';
import { pool } from './pool.js';

interface SeedUser {
  email: string;
  fullName: string;
  role: UserRole;
}

const TEACHER: SeedUser = { email: 'teacher@test.com', fullName: 'Ms. Rivera', role: 'teacher' };
const STUDENTS: SeedUser[] = [
  { email: 'student1@test.com', fullName: 'Alex Kim', role: 'student' },
  { email: 'student2@test.com', fullName: 'Sara Ali', role: 'student' },
];
const SAMPLE_CLASSROOM = {
  name: 'Mathematics 101',
  subject: 'Mathematics',
  description: 'Algebra, geometry and problem solving fundamentals.',
};

async function upsertUser({ email, fullName, role }: SeedUser): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO users (email, full_name, role) VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role
     RETURNING id`,
    [email, fullName, role],
  );
  return rows[0]!.id;
}

async function seed() {
  const teacherId = await upsertUser(TEACHER);
  const [student1Id] = await Promise.all(STUDENTS.map(upsertUser));

  const existingId = await classroomsRepository.findIdByTeacherAndName(teacherId, SAMPLE_CLASSROOM.name);
  const classroomId = existingId ?? (await classroomsService.create(teacherId, SAMPLE_CLASSROOM)).id;
  await classroomsRepository.enroll(classroomId, student1Id!, 'code');

  const classroom = await classroomsRepository.findForTeacher(classroomId, teacherId);
  console.log('Seed complete:');
  console.log(`  teacher:  ${TEACHER.email} (${TEACHER.fullName})`);
  for (const student of STUDENTS) console.log(`  student:  ${student.email} (${student.fullName})`);
  console.log(`  classroom "${classroom!.name}" join code: ${classroom!.joinCode} (${classroom!.studentCount} student)`);
}

try {
  await seed();
} catch (error) {
  console.error('Seed failed:', error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
