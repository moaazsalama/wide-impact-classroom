import { pool, type Queryable } from '../../db/pool.js';
import type {
  ClassroomInput,
  ClassroomPreview,
  EnrolledStudent,
  JoinMethod,
  StudentClassroom,
  TeacherClassroom,
} from './classrooms.types.js';

// ---------- Row types & mappers (snake_case -> camelCase) ----------

interface TeacherClassroomRow {
  id: string;
  name: string;
  subject: string | null;
  description: string | null;
  join_code: string;
  join_code_updated_at: Date;
  student_count: number;
  created_at: Date;
  updated_at: Date;
}

interface ClassroomWithTeacherRow {
  id: string;
  name: string;
  subject: string | null;
  description: string | null;
  student_count: number;
  created_at: Date;
  teacher_id: string;
  teacher_full_name: string;
  teacher_avatar_url: string | null;
}

interface StudentClassroomRow extends ClassroomWithTeacherRow {
  joined_at: Date;
  joined_via: JoinMethod;
}

interface PreviewRow extends ClassroomWithTeacherRow {
  is_enrolled: boolean;
}

interface EnrolledStudentRow {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  joined_at: Date;
  joined_via: JoinMethod;
}

const toTeacherClassroom = (row: TeacherClassroomRow): TeacherClassroom => ({
  id: row.id,
  name: row.name,
  subject: row.subject,
  description: row.description,
  joinCode: row.join_code,
  joinCodeUpdatedAt: row.join_code_updated_at.toISOString(),
  studentCount: row.student_count,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
});

const toTeacherSummary = (row: ClassroomWithTeacherRow) => ({
  id: row.teacher_id,
  fullName: row.teacher_full_name,
  avatarUrl: row.teacher_avatar_url,
});

const toStudentClassroom = (row: StudentClassroomRow): StudentClassroom => ({
  id: row.id,
  name: row.name,
  subject: row.subject,
  description: row.description,
  teacher: toTeacherSummary(row),
  studentCount: row.student_count,
  joinedAt: row.joined_at.toISOString(),
  joinedVia: row.joined_via,
  createdAt: row.created_at.toISOString(),
});

const toPreview = (row: PreviewRow): ClassroomPreview => ({
  id: row.id,
  name: row.name,
  subject: row.subject,
  description: row.description,
  teacher: toTeacherSummary(row),
  studentCount: row.student_count,
  isEnrolled: row.is_enrolled,
});

const toEnrolledStudent = (row: EnrolledStudentRow): EnrolledStudent => ({
  id: row.id,
  fullName: row.full_name,
  email: row.email,
  avatarUrl: row.avatar_url,
  joinedAt: row.joined_at.toISOString(),
  joinedVia: row.joined_via,
});

// ---------- SQL fragments ----------

const STUDENT_COUNT = `(SELECT count(*)::int FROM enrollments e WHERE e.classroom_id = c.id) AS student_count`;

const TEACHER_COLUMNS = `t.id AS teacher_id, t.full_name AS teacher_full_name, t.avatar_url AS teacher_avatar_url`;

const TEACHER_CLASSROOM_SELECT = `
  SELECT c.id, c.name, c.subject, c.description, c.join_code, c.join_code_updated_at,
         c.created_at, c.updated_at, ${STUDENT_COUNT}
  FROM classrooms c`;

const STUDENT_CLASSROOM_SELECT = `
  SELECT c.id, c.name, c.subject, c.description, c.created_at, ${STUDENT_COUNT},
         ${TEACHER_COLUMNS}, en.joined_at, en.joined_via
  FROM enrollments en
  JOIN classrooms c ON c.id = en.classroom_id
  JOIN users t ON t.id = c.teacher_id`;

/** Whitelisted updatable columns: DTO field -> column. Never interpolate user input. */
const UPDATABLE_COLUMNS = { name: 'name', subject: 'subject', description: 'description' } as const;

// ---------- Queries ----------

export const classroomsRepository = {
  async listForTeacher(teacherId: string): Promise<TeacherClassroom[]> {
    const { rows } = await pool.query<TeacherClassroomRow>(
      `${TEACHER_CLASSROOM_SELECT} WHERE c.teacher_id = $1 ORDER BY c.created_at DESC, c.id`,
      [teacherId],
    );
    return rows.map(toTeacherClassroom);
  },

  async findForTeacher(id: string, teacherId: string, db: Queryable = pool): Promise<TeacherClassroom | null> {
    const { rows } = await db.query<TeacherClassroomRow>(
      `${TEACHER_CLASSROOM_SELECT} WHERE c.id = $1 AND c.teacher_id = $2`,
      [id, teacherId],
    );
    return rows[0] ? toTeacherClassroom(rows[0]) : null;
  },

  async listForStudent(studentId: string): Promise<StudentClassroom[]> {
    const { rows } = await pool.query<StudentClassroomRow>(
      `${STUDENT_CLASSROOM_SELECT} WHERE en.student_id = $1 ORDER BY en.joined_at DESC, c.id`,
      [studentId],
    );
    return rows.map(toStudentClassroom);
  },

  async findForStudent(id: string, studentId: string, db: Queryable = pool): Promise<StudentClassroom | null> {
    const { rows } = await db.query<StudentClassroomRow>(
      `${STUDENT_CLASSROOM_SELECT} WHERE c.id = $1 AND en.student_id = $2`,
      [id, studentId],
    );
    return rows[0] ? toStudentClassroom(rows[0]) : null;
  },

  async findPreviewByCode(code: string, studentId: string): Promise<ClassroomPreview | null> {
    const { rows } = await pool.query<PreviewRow>(
      `SELECT c.id, c.name, c.subject, c.description, c.created_at, ${STUDENT_COUNT}, ${TEACHER_COLUMNS},
              EXISTS (SELECT 1 FROM enrollments e WHERE e.classroom_id = c.id AND e.student_id = $2) AS is_enrolled
       FROM classrooms c
       JOIN users t ON t.id = c.teacher_id
       WHERE c.join_code = $1`,
      [code, studentId],
    );
    return rows[0] ? toPreview(rows[0]) : null;
  },

  async findIdByCode(code: string, db: Queryable = pool, { lock = false } = {}): Promise<string | null> {
    const { rows } = await db.query<{ id: string }>(
      `SELECT id FROM classrooms WHERE join_code = $1${lock ? ' FOR SHARE' : ''}`,
      [code],
    );
    return rows[0]?.id ?? null;
  },

  async findIdByTeacherAndName(teacherId: string, name: string, db: Queryable = pool): Promise<string | null> {
    const { rows } = await db.query<{ id: string }>(
      `SELECT id FROM classrooms WHERE teacher_id = $1 AND name = $2 ORDER BY created_at LIMIT 1`,
      [teacherId, name],
    );
    return rows[0]?.id ?? null;
  },

  async insert(teacherId: string, input: ClassroomInput, joinCode: string, db: Queryable = pool): Promise<string> {
    const { rows } = await db.query<{ id: string }>(
      `INSERT INTO classrooms (teacher_id, name, subject, description, join_code)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [teacherId, input.name, input.subject ?? null, input.description ?? null, joinCode],
    );
    return rows[0]!.id;
  },

  /** Updates only the provided fields. Returns false if the teacher does not own the classroom. */
  async update(id: string, teacherId: string, changes: Partial<ClassroomInput>): Promise<boolean> {
    const assignments: string[] = [];
    const values: unknown[] = [id, teacherId];
    for (const [field, column] of Object.entries(UPDATABLE_COLUMNS)) {
      const value = changes[field as keyof ClassroomInput];
      if (value === undefined) continue;
      values.push(value);
      assignments.push(`${column} = $${values.length}`);
    }
    if (assignments.length === 0) return classroomsRepository.isOwnedBy(id, teacherId);

    const { rowCount } = await pool.query(
      `UPDATE classrooms SET ${assignments.join(', ')} WHERE id = $1 AND teacher_id = $2`,
      values,
    );
    return rowCount === 1;
  },

  async updateJoinCode(id: string, teacherId: string, joinCode: string): Promise<boolean> {
    const { rowCount } = await pool.query(
      `UPDATE classrooms SET join_code = $3, join_code_updated_at = now() WHERE id = $1 AND teacher_id = $2`,
      [id, teacherId, joinCode],
    );
    return rowCount === 1;
  },

  /** Enrollments are removed by ON DELETE CASCADE. */
  async remove(id: string, teacherId: string): Promise<boolean> {
    const { rowCount } = await pool.query(`DELETE FROM classrooms WHERE id = $1 AND teacher_id = $2`, [id, teacherId]);
    return rowCount === 1;
  },

  async isOwnedBy(id: string, teacherId: string): Promise<boolean> {
    const { rowCount } = await pool.query(`SELECT 1 FROM classrooms WHERE id = $1 AND teacher_id = $2`, [id, teacherId]);
    return rowCount === 1;
  },

  /** Returns true if a new enrollment was created, false if the student was already enrolled. */
  async enroll(classroomId: string, studentId: string, method: JoinMethod, db: Queryable = pool): Promise<boolean> {
    const { rowCount } = await db.query(
      `INSERT INTO enrollments (classroom_id, student_id, joined_via) VALUES ($1, $2, $3)
       ON CONFLICT (classroom_id, student_id) DO NOTHING`,
      [classroomId, studentId, method],
    );
    return rowCount === 1;
  },

  async unenroll(classroomId: string, studentId: string): Promise<boolean> {
    const { rowCount } = await pool.query(
      `DELETE FROM enrollments WHERE classroom_id = $1 AND student_id = $2`,
      [classroomId, studentId],
    );
    return rowCount === 1;
  },

  async listStudents(classroomId: string): Promise<EnrolledStudent[]> {
    const { rows } = await pool.query<EnrolledStudentRow>(
      `SELECT u.id, u.full_name, u.email, u.avatar_url, en.joined_at, en.joined_via
       FROM enrollments en
       JOIN users u ON u.id = en.student_id
       WHERE en.classroom_id = $1
       ORDER BY en.joined_at DESC, u.id`,
      [classroomId],
    );
    return rows.map(toEnrolledStudent);
  },
};
