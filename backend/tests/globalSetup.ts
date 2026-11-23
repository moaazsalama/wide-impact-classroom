import pg from 'pg';
import { runMigrations } from '../src/db/migrate.js';

/** Applies migrations to the test database once before the whole run. */
export default async function setup() {
  const pool = new pg.Pool({
    connectionString: process.env.TEST_DATABASE_URL ?? 'postgres://localhost:5432/wide_impact_test',
  });
  try {
    await runMigrations(pool, () => undefined);
  } finally {
    await pool.end();
  }
}
