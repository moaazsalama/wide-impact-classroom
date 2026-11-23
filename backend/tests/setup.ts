import { afterAll, beforeEach } from 'vitest';
import { pool } from '../src/db/pool.js';

beforeEach(async () => {
  await pool.query('TRUNCATE users, refresh_tokens, classrooms, enrollments CASCADE');
});

afterAll(async () => {
  await pool.end();
});
