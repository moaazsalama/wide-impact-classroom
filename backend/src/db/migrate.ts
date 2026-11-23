import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type pg from 'pg';

// Works from both src/db (tsx) and dist/db (compiled): the project root is two levels up.
export const MIGRATIONS_DIR = fileURLToPath(new URL('../../migrations/', import.meta.url));

// Arbitrary constant key so concurrent deploys never run migrations twice.
const MIGRATION_LOCK_KEY = 727_001;

/**
 * Applies every `migrations/*.sql` file not yet recorded in `schema_migrations`,
 * in filename order, each inside its own transaction. Safe to run repeatedly.
 */
export async function runMigrations(
  pool: pg.Pool,
  log: (message: string) => void = console.log,
): Promise<string[]> {
  const client = await pool.connect();
  const applied: string[] = [];
  try {
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_KEY]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name       text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )`);

    const { rows } = await client.query<{ name: string }>('SELECT name FROM schema_migrations');
    const done = new Set(rows.map((row) => row.name));
    const files = (await readdir(MIGRATIONS_DIR)).filter((file) => file.endsWith('.sql')).sort();

    for (const file of files) {
      if (done.has(file)) continue;
      const sql = await readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${file} failed: ${(error as Error).message}`, { cause: error });
      }
      applied.push(file);
      log(`Applied migration ${file}`);
    }
    if (applied.length === 0) log('Database schema is up to date');
    return applied;
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_KEY]).catch(() => undefined);
    client.release();
  }
}

const isEntryPoint = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isEntryPoint) {
  const { pool } = await import('./pool.js');
  try {
    await runMigrations(pool);
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
