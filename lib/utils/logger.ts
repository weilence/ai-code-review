import { pino, type Logger } from 'pino';

type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error';

const isDev = process.env.NODE_ENV !== 'production';
const isServer = typeof window === 'undefined';

function getLogLevel(): LogLevel {
  return (process.env.LOG_LEVEL as LogLevel) || 'info';
}

function createPinoLogger(): Logger {
  const level = getLogLevel();

  if (isServer) {
    return pino({
      level,
      formatters: {
        level: (label) => ({ level: label }),
      },
      timestamp: pino.stdTimeFunctions.isoTime,
      transport: isDev
        ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
            singleLine: false,
          },
        }
        : undefined,
    });
  }

  return pino({
    level,
    browser: {
      asObject: true,
    },
  });
}

export const logger = createPinoLogger();

export function createLogger(name: string, additionalContext?: Record<string, unknown>): Logger {
  return logger.child({
    name,
    ...additionalContext,
  });
}

export function setLogLevel(level: LogLevel | string): void {
  logger.level = level;
}

export function getCurrentLogLevel(): string {
  return logger.level;
}

export const devLog = {
  debug: (...args: unknown[]) => {
    if (isDev) logger.debug(args);
  },
  info: (...args: unknown[]) => {
    if (isDev) logger.info(args);
  },
  warn: (...args: unknown[]) => {
    if (isDev) logger.warn(args);
  },
  error: (...args: unknown[]) => {
    if (isDev) logger.error(args);
  },
};

export const prodLog = {
  debug: (...args: unknown[]) => {
    if (!isDev) logger.debug(args);
  },
  info: (...args: unknown[]) => {
    if (!isDev) logger.info(args);
  },
  warn: (...args: unknown[]) => {
    if (!isDev) logger.warn(args);
  },
  error: (...args: unknown[]) => {
    if (!isDev) logger.error(args);
  },
};

export function logError(
  error: Error | unknown,
  context?: Record<string, unknown>
): void {
  const errorObj = error instanceof Error ? {
    message: error.message,
    stack: error.stack,
    name: error.name,
  } : error;

  logger.error({ error: errorObj, ...context }, 'An error occurred');
}

export function logErrorWithContext(
  error: Error | unknown,
  name: string,
  additionalContext?: Record<string, unknown>
): void {
  const contextLogger = createLogger(name);
  const errorObj = error instanceof Error ? {
    message: error.message,
    stack: error.stack,
    name: error.name,
  } : error;

  contextLogger.error({ error: errorObj, ...additionalContext }, 'An error occurred');
}
