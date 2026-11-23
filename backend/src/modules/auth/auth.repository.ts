import { pool, type Queryable } from '../../db/pool.js';

export interface RefreshTokenRecord {
  id: string;
  userId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedBy: string | null;
}

interface RefreshTokenRow {
  id: string;
  user_id: string;
  expires_at: Date;
  revoked_at: Date | null;
  replaced_by: string | null;
}

function toRefreshToken(row: RefreshTokenRow): RefreshTokenRecord {
  return {
    id: row.id,
    userId: row.user_id,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    replacedBy: row.replaced_by,
  };
}

export const authRepository = {
  async insertRefreshToken(userId: string, tokenHash: string, expiresAt: Date, db: Queryable = pool) {
    const { rows } = await db.query<{ id: string }>(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3) RETURNING id`,
      [userId, tokenHash, expiresAt],
    );
    return rows[0]!.id;
  },

  /** Locks the row so concurrent refreshes of the same token are serialised. */
  async findByHashForUpdate(tokenHash: string, db: Queryable): Promise<RefreshTokenRecord | null> {
    const { rows } = await db.query<RefreshTokenRow>(
      `SELECT id, user_id, expires_at, revoked_at, replaced_by
       FROM refresh_tokens WHERE token_hash = $1 FOR UPDATE`,
      [tokenHash],
    );
    return rows[0] ? toRefreshToken(rows[0]) : null;
  },

  async markRotated(id: string, replacedBy: string, db: Queryable) {
    await db.query(`UPDATE refresh_tokens SET revoked_at = now(), replaced_by = $2 WHERE id = $1`, [id, replacedBy]);
  },

  async revokeByHash(tokenHash: string, db: Queryable = pool) {
    await db.query(
      `UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL`,
      [tokenHash],
    );
  },

  async revokeAllForUser(userId: string, db: Queryable = pool) {
    await db.query(`UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL`, [userId]);
  },
};
