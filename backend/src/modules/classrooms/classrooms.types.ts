export const JOIN_METHODS = ['qr', 'code'] as const;
export type JoinMethod = (typeof JOIN_METHODS)[number];

export interface TeacherSummary {
  id: string;
  fullName: string;
  avatarUrl: string | null;
}

/** Returned to the owning teacher (includes the join code). */
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

/** Returned to an enrolled student (never includes the join code). */
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

/** Preview shown to a student before joining. */
export interface ClassroomPreview {
  id: string;
  name: string;
  subject: string | null;
  description: string | null;
  teacher: TeacherSummary;
  studentCount: number;
  isEnrolled: boolean;
}

/** Enrollment as seen by the teacher. */
export interface EnrolledStudent {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  joinedAt: string;
  joinedVia: JoinMethod;
}

export interface ClassroomInput {
  name: string;
  subject?: string | null;
  description?: string | null;
}
