import { createApp } from './app.js';
import { env } from './config/env.js';
import { pool } from './db/pool.js';
import { logger } from './lib/logger.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(
    { port: env.PORT, env: env.NODE_ENV, devLogin: env.ENABLE_DEV_LOGIN, googleClients: env.GOOGLE_CLIENT_IDS.length },
    'Classroom API listening',
  );
});

const SHUTDOWN_TIMEOUT_MS = 10_000;
let shuttingDown = false;

function shutdown(signal: NodeJS.Signals) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'Shutting down gracefully');

  // Force-exit if in-flight requests don't drain in time.
  const forceExit = setTimeout(() => {
    logger.error('Graceful shutdown timed out, forcing exit');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExit.unref();

  server.close((error) => {
    if (error) logger.error({ err: error }, 'Error while closing HTTP server');
    pool
      .end()
      .catch((poolError: unknown) => logger.error({ err: poolError }, 'Error while closing database pool'))
      .finally(() => process.exit(error ? 1 : 0));
  });
  server.closeIdleConnections();
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Unhandled promise rejection');
});
