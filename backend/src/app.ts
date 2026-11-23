import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { env, type Env } from './config/env.js';
import { pool } from './db/pool.js';
import { logger } from './lib/logger.js';
import { createTokenService } from './lib/tokens.js';
import { createAuthenticate } from './middleware/authenticate.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import { createRateLimiters, DEFAULT_RATE_LIMITS, type RateLimitOptions } from './middleware/rateLimiters.js';
import { createGoogleTokenVerifier, type GoogleTokenVerifier } from './modules/auth/auth.google.js';
import { createAuthRouter } from './modules/auth/auth.routes.js';
import { createAuthService } from './modules/auth/auth.service.js';
import { createClassroomsRouter } from './modules/classrooms/classrooms.routes.js';
import { createUsersRouter } from './modules/users/users.routes.js';

export interface AppDeps {
  config: Env;
  googleVerifier: GoogleTokenVerifier;
  rateLimits: RateLimitOptions;
}

// Rate limits are effectively disabled in tests unless a test opts in explicitly.
const TEST_RATE_LIMITS: RateLimitOptions = { authPerIp: 10_000, joinPerUser: 10_000 };

/** Builds the Express app. Every dependency can be overridden (used by tests). */
export function createApp(overrides: Partial<AppDeps> = {}): Express {
  const config = overrides.config ?? env;
  const googleVerifier = overrides.googleVerifier ?? createGoogleTokenVerifier(config.GOOGLE_CLIENT_IDS);
  const rateLimits = overrides.rateLimits ?? (config.NODE_ENV === 'test' ? TEST_RATE_LIMITS : DEFAULT_RATE_LIMITS);

  const tokens = createTokenService({
    accessSecret: config.JWT_ACCESS_SECRET,
    accessTtl: config.JWT_ACCESS_TTL,
  });
  const authService = createAuthService({
    tokens,
    googleVerifier,
    refreshTokenTtlDays: config.REFRESH_TOKEN_TTL_DAYS,
  });
  const authenticate = createAuthenticate(tokens);
  const limiters = createRateLimiters(rateLimits);

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.TRUST_PROXY);

  app.use(helmet());
  app.use(cors({ origin: parseCorsOrigins(config.CORS_ORIGINS) }));
  app.use(express.json({ limit: '100kb' }));
  app.use(
    pinoHttp({
      logger,
      autoLogging: { ignore: (req) => req.url === '/health' },
      customLogLevel: (_req, res, error) => (error || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'),
    }),
  );

  app.get('/health', async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ok', db: 'ok' });
    } catch {
      res.status(503).json({ status: 'degraded', db: 'down' });
    }
  });

  const api = express.Router();
  api.use(
    '/auth',
    createAuthRouter({ authService, rateLimiter: limiters.auth, enableDevLogin: config.ENABLE_DEV_LOGIN }),
  );
  api.use('/me', createUsersRouter(authenticate));
  api.use('/classrooms', createClassroomsRouter({ authenticate, joinRateLimiter: limiters.join }));
  app.use('/api/v1', api);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

function parseCorsOrigins(value: string): string | string[] {
  if (value.trim() === '*') return '*';
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}
