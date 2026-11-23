import { pino } from 'pino';
import { env } from '../config/env.js';

const usePrettyTransport = env.NODE_ENV === 'development';

export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : env.LOG_LEVEL,
  redact: ['req.headers.authorization', 'req.headers.cookie'],
  ...(usePrettyTransport
    ? { transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } } }
    : {}),
});
