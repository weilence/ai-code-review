import { pino, type Logger } from 'pino';

// ============================================================================
// Type Definitions
// ============================================================================

type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error';

// ============================================================================
// Logger Configuration
// ============================================================================

const isDev = process.env.NODE_ENV !== 'production';
const isServer = typeof window === 'undefined';

/**
 * 获取日志级别
 */
function getLogLevel(): LogLevel {
  // 从环境变量获取日志级别，默认为 info
  return (process.env.LOG_LEVEL as LogLevel) || 'info';
}

/**
 * 创建 Pino 日志器
 */
function createPinoLogger(): Logger {
  const level = getLogLevel();

  if (isServer) {
    // 服务端：使用完整的 Pino 日志器
    return pino({
      level,
      formatters: {
        level: (label) => ({ level: label }),
      },
      timestamp: pino.stdTimeFunctions.isoTime,
      // 开发环境使用 pino-pretty
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
      // 生产环境不使用 transport（直接输出 JSON）
    });
  } else {
    // 客户端：简化版日志器
    return pino({
      level,
      browser: {
        asObject: true,
      },
    });
  }
}

// ============================================================================
// Global Logger Instance
// ============================================================================

export const logger = createPinoLogger();

/**
 * 创建带有上下文的日志器
 */
export function createLogger(name: string, additionalContext?: Record<string, unknown>): Logger {
  return logger.child({
    name,
    ...additionalContext,
  });
}

// ============================================================================
// Log Level Helpers
// ============================================================================

/**
 * 设置日志级别
 */
export function setLogLevel(level: LogLevel | string): void {
  logger.level = level;
}

/**
 * 获取当前日志级别
 */
export function getCurrentLogLevel(): string {
  return logger.level;
}

// ============================================================================
// Conditional Logging
// ============================================================================

/**
 * 仅在开发环境输出日志
 */
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

/**
 * 仅在生产环境输出日志
 */
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

// ============================================================================
// Error Logging
// ============================================================================

/**
 * 记录错误详情
 */
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

/**
 * 记录带上下文的错误
 */
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
