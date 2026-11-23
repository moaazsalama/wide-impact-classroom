/** Types mirror docs/API.md (v1) exactly. Timestamps are ISO-8601 strings. */

export type Role = 'teacher' | 'student';
export type JoinMethod = 'qr' | 'code';

export interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: Role | null;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface TeacherSummary {
  id: string;
  fullName: string;
  avatarUrl: string | null;
}

export interface TeacherClassroom {
  id: string;
  name: string;
  subject: string | null;
  description: string | null;
  joinCode: string;
  joinCodeUpdatedAt: string;
  studentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface StudentClassroom {
  id: string;
  name: string;
  subject: string | null;
  description: string | null;
  teacher: TeacherSummary;
  studentCount: number;
  joinedAt: string;
  joinedVia: JoinMethod;
  createdAt: string;
}

export interface ClassroomPreview {
  id: string;
  name: string;
  subject: string | null;
  description: string | null;
  teacher: TeacherSummary;
  studentCount: number;
  isEnrolled: boolean;
}

export interface Student {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  joinedAt: string;
  joinedVia: JoinMethod;
}

// ---- Request bodies ----

export interface GoogleLoginBody {
  idToken: string;
}

export interface DevLoginBody {
  email: string;
  fullName?: string;
}

export interface ClassroomInput {
  name: string;
  subject?: string | null;
  description?: string | null;
}

export type ClassroomPatch = Partial<ClassroomInput>;

export interface JoinBody {
  code: string;
  method: JoinMethod;
}

// ---- Response envelopes ----

export interface UserEnvelope {
  user: User;
}

export interface ClassroomsEnvelope<T> {
  classrooms: T[];
}

export interface ClassroomEnvelope<T> {
  classroom: T;
}

export interface StudentsEnvelope {
  students: Student[];
}

export interface JoinResponse {
  classroom: StudentClassroom;
  alreadyEnrolled: boolean;
}

// ---- Errors ----

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'INVALID_GOOGLE_TOKEN'
  | 'INVALID_REFRESH_TOKEN'
  | 'REFRESH_TOKEN_REUSED'
  | 'ROLE_REQUIRED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'INVALID_JOIN_CODE'
  | 'ROLE_ALREADY_SET'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export interface ApiErrorDetail {
  path: string;
  message: string;
}

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode | (string & {});
    message: string;
    details?: ApiErrorDetail[];
  };
}
