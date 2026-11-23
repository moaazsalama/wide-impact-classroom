import { pool, type Queryable } from '../../db/pool.js';
import type { UserRecord, UserRole } from './users.types.js';

interface UserRow {
  id: string;
  google_sub: string | null;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: UserRole | null;
  created_at: Date;
}

const USER_COLUMNS = 'id, google_sub, email, full_name, avatar_url, role, created_at';

function toUser(row: UserRow): UserRecord {
  return {
    id: row.id,
    googleSub: row.google_sub,
    email: row.email,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    role: row.role,
    createdAt: row.created_at.toISOString(),
  };
}

async function findOne(db: Queryable, sql: string, params: unknown[]): Promise<UserRecord | null> {
  const { rows } = await db.query<UserRow>(sql, params);
  return rows[0] ? toUser(rows[0]) : null;
}

export const usersRepository = {
  findById(id: string, db: Queryable = pool) {
    return findOne(db, `SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [id]);
  },

  findByGoogleSub(googleSub: string, db: Queryable = pool) {
    return findOne(db, `SELECT ${USER_COLUMNS} FROM users WHERE google_sub = $1`, [googleSub]);
  },

  findByEmailForUpdate(email: string, db: Queryable) {
    return findOne(db, `SELECT ${USER_COLUMNS} FROM users WHERE email = $1 FOR UPDATE`, [email]);
  },

  async create(
    input: { email: string; fullName: string; avatarUrl?: string | null; googleSub?: string | null; role?: UserRole | null },
    db: Queryable = pool,
  ): Promise<UserRecord> {
    const user = await findOne(
      db,
      `INSERT INTO users (email, full_name, avatar_url, google_sub, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING ${USER_COLUMNS}`,
      [input.email, input.fullName, input.avatarUrl ?? null, input.googleSub ?? null, input.role ?? null],
    );
    return user!;
  },

  /** Links a Google account to an existing user and fills in a missing avatar. */
  async linkGoogleAccount(id: string, googleSub: string, avatarUrl: string | null, db: Queryable = pool) {
    const user = await findOne(
      db,
      `UPDATE users SET google_sub = $2, avatar_url = COALESCE(avatar_url, $3)
       WHERE id = $1
       RETURNING ${USER_COLUMNS}`,
      [id, googleSub, avatarUrl],
    );
    return user!;
  },

  /** Keeps the profile picture in sync with Google on every sign-in. */
  async updateAvatar(id: string, avatarUrl: string, db: Queryable = pool) {
    const user = await findOne(
      db,
      `UPDATE users SET avatar_url = $2 WHERE id = $1 RETURNING ${USER_COLUMNS}`,
      [id, avatarUrl],
    );
    return user!;
  },

  /** Inserts or returns the user with this email; `fullName` (if given) overwrites the stored name. */
  async upsertByEmail(email: string, fullName: string | undefined, fallbackName: string, db: Queryable = pool) {
    const user = await findOne(
      db,
      `INSERT INTO users (email, full_name) VALUES ($1, COALESCE($2, $3))
       ON CONFLICT (email) DO UPDATE SET full_name = COALESCE($2, users.full_name)
       RETURNING ${USER_COLUMNS}`,
      [email, fullName ?? null, fallbackName],
    );
    return user!;
  },

  /** Sets the role only if none is set yet. Returns null when a role already existed. */
  setRoleIfUnset(id: string, role: UserRole, db: Queryable = pool) {
    return findOne(
      db,
      `UPDATE users SET role = $2 WHERE id = $1 AND role IS NULL RETURNING ${USER_COLUMNS}`,
      [id, role],
    );
  },
};
