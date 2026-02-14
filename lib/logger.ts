/**
 * Logger utility - replaces console.log in production
 * Only logs in development mode to prevent info leakage
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogOptions {
  /** Additional context data */
  meta?: Record<string, unknown>;
  /** Force log even in production */
  force?: boolean;
}

const isDev = process.env.NODE_ENV === 'development';

function formatMessage(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
}

export const logger = {
  /**
   * Debug level - only in development
   */
  debug(message: string, options?: LogOptions): void {
    if (isDev || options?.force) {
      console.log(formatMessage('debug', message, options?.meta));
    }
  },

  /**
   * Info level - only in development
   */
  info(message: string, options?: LogOptions): void {
    if (isDev || options?.force) {
      console.log(formatMessage('info', message, options?.meta));
    }
  },

  /**
   * Warning level - logs in all environments
   */
  warn(message: string, options?: LogOptions): void {
    console.warn(formatMessage('warn', message, options?.meta));
  },

  /**
   * Error level - logs in all environments
   * In production, you could send to error tracking service
   */
  error(message: string, error?: unknown, options?: LogOptions): void {
    const meta = {
      ...options?.meta,
      ...(error instanceof Error
        ? { errorMessage: error.message, stack: isDev ? error.stack : undefined }
        : { error }),
    };
    console.error(formatMessage('error', message, meta));
    
    // TODO: In production, send to error tracking service like Sentry
    // if (!isDev) {
    //   sendToErrorTracker(message, meta);
    // }
  },
};

export default logger;
