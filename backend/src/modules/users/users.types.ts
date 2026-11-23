export const USER_ROLES = ['teacher', 'student'] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** Public user DTO (camelCase), exactly as returned by the API. */
export interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: UserRole | null;
  createdAt: string;
}

/** Internal representation that also carries the linked Google account. */
export interface UserRecord extends User {
  googleSub: string | null;
}

export function toPublicUser({ googleSub: _googleSub, ...user }: UserRecord): User {
  return user;
}
