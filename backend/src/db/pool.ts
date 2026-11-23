import pg from 'pg';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

/** Anything that can run a query: the pool itself or a checked-out transaction client. */
export type Queryable = Pick<pg.Pool | pg.PoolClient, 'query'>;

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.DATABASE_SSL ? { rejectUnauthorized: true } : undefined,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (error) => {
  // Idle client errors (e.g. server restarts) must not crash the process.
  logger.error({ err: error }, 'Unexpected PostgreSQL pool error');
});

export async function withTransaction<T>(work: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
