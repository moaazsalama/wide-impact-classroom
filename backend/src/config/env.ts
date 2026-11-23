import { z } from 'zod';

// Load .env if present (never overrides real env vars). Tests inject their env via vitest.config.ts.
if (process.env.NODE_ENV !== 'test') {
  await import('dotenv/config');
}

const booleanFromString = z
  .enum(['true', 'false', '1', '0'])
  .transform((value) => value === 'true' || value === '1');

const commaSeparatedList = z
  .string()
  .transform((value) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0),
  );

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DATABASE_SSL: booleanFromString.default(false),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_ACCESS_TTL: z
    .string()
    .regex(/^\d+[smhd]$/, 'JWT_ACCESS_TTL must look like 15m, 1h, 30s or 7d')
    .default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  GOOGLE_CLIENT_IDS: commaSeparatedList.default([]),
  ENABLE_DEV_LOGIN: booleanFromString.default(false),
  CORS_ORIGINS: z.string().default('*'),
  // Number of reverse-proxy hops to trust for client IPs (1 on Render/Heroku-style platforms).
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    // Fail fast: a misconfigured server must never start.
    console.error(`Invalid environment configuration:\n${problems}`);
    process.exit(1);
  }
  return result.data;
}

export const env: Env = loadEnv();
