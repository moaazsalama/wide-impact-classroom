import { withTransaction } from '../../db/pool.js';
import { AppError } from '../../lib/AppError.js';
import { withUniqueJoinCode } from '../../lib/joinCode.js';
import type { User } from '../users/users.types.js';
import { classroomsRepository as repo } from './classrooms.repository.js';
import type {
  ClassroomInput,
  ClassroomPreview,
  EnrolledStudent,
  JoinMethod,
  StudentClassroom,
  TeacherClassroom,
} from './classrooms.types.js';

// Classrooms the caller cannot access are reported as 404 to avoid leaking their existence.
const classroomNotFound = () => AppError.notFound('Classroom not found');
const invalidJoinCode = () => new AppError(404, 'INVALID_JOIN_CODE', 'No classroom matches this join code');

async function getOwnedClassroom(id: string, teacherId: string): Promise<TeacherClassroom> {
  const classroom = await repo.findForTeacher(id, teacherId);
  if (!classroom) throw classroomNotFound();
  return classroom;
}

async function assertOwned(id: string, teacherId: string): Promise<void> {
  if (!(await repo.isOwnedBy(id, teacherId))) throw classroomNotFound();
}

export const classroomsService = {
  listForUser(user: User): Promise<TeacherClassroom[] | StudentClassroom[]> {
    return user.role === 'teacher' ? repo.listForTeacher(user.id) : repo.listForStudent(user.id);
  },

  async getForUser(id: string, user: User): Promise<TeacherClassroom | StudentClassroom> {
    const classroom =
      user.role === 'teacher' ? await repo.findForTeacher(id, user.id) : await repo.findForStudent(id, user.id);
    if (!classroom) throw classroomNotFound();
    return classroom;
  },

  /** Creates a classroom with a fresh, unique 6-digit join code (retried on collision). */
  async create(teacherId: string, input: ClassroomInput): Promise<TeacherClassroom> {
    const id = await withUniqueJoinCode((code) => repo.insert(teacherId, input, code));
    return getOwnedClassroom(id, teacherId);
  },

  async update(id: string, teacherId: string, changes: Partial<ClassroomInput>): Promise<TeacherClassroom> {
    if (!(await repo.update(id, teacherId, changes))) throw classroomNotFound();
    return getOwnedClassroom(id, teacherId);
  },

  async remove(id: string, teacherId: string): Promise<void> {
    if (!(await repo.remove(id, teacherId))) throw classroomNotFound();
  },

  /** Issues a new join code; the previous one stops working immediately. */
  async regenerateJoinCode(id: string, teacherId: string): Promise<TeacherClassroom> {
    const updated = await withUniqueJoinCode((code) => repo.updateJoinCode(id, teacherId, code));
    if (!updated) throw classroomNotFound();
    return getOwnedClassroom(id, teacherId);
  },

  async listStudents(id: string, teacherId: string): Promise<EnrolledStudent[]> {
    await assertOwned(id, teacherId);
    return repo.listStudents(id);
  },

  async removeStudent(id: string, teacherId: string, studentId: string): Promise<void> {
    await assertOwned(id, teacherId);
    if (!(await repo.unenroll(id, studentId))) throw AppError.notFound('Student is not enrolled in this classroom');
  },

  async lookupByCode(code: string, studentId: string): Promise<ClassroomPreview> {
    const preview = await repo.findPreviewByCode(code, studentId);
    if (!preview) throw invalidJoinCode();
    return preview;
  },

  /** Idempotent join: a repeat join returns the existing enrollment with `alreadyEnrolled: true`. */
  async join(
    code: string,
    studentId: string,
    method: JoinMethod,
  ): Promise<{ classroom: StudentClassroom; alreadyEnrolled: boolean }> {
    return withTransaction(async (client) => {
      // FOR SHARE keeps the classroom from being deleted (or its code rotated) mid-join.
      const classroomId = await repo.findIdByCode(code, client, { lock: true });
      if (!classroomId) throw invalidJoinCode();
      const created = await repo.enroll(classroomId, studentId, method, client);
      const classroom = await repo.findForStudent(classroomId, studentId, client);
      if (!classroom) throw invalidJoinCode();
      return { classroom, alreadyEnrolled: !created };
    });
  },

  async leave(id: string, studentId: string): Promise<void> {
    if (!(await repo.unenroll(id, studentId))) throw classroomNotFound();
  },
};
