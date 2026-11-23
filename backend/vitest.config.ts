import { defineConfig } from 'vitest/config';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgres://localhost:5432/wide_impact_test';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globalSetup: ['tests/globalSetup.ts'],
    setupFiles: ['tests/setup.ts'],
    // All files share one database, so they must not run concurrently.
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: TEST_DATABASE_URL,
      JWT_ACCESS_SECRET: 'test-secret-that-is-definitely-at-least-32-chars',
      ENABLE_DEV_LOGIN: 'true',
      GOOGLE_CLIENT_IDS: 'test-client-id',
      LOG_LEVEL: 'silent',
    },
  },
});
