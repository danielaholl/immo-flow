/**
 * Simple Logger Utility
 * Provides structured logging for the application
 */

export interface Logger {
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
  debug: (message: string, meta?: Record<string, unknown>) => void;
}

/**
 * Creates a logger instance with a specific context/module name
 */
export function createLogger(context: string): Logger {
  const formatMessage = (level: string, message: string, meta?: Record<string, unknown>) => {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] [${context}] ${message}${metaStr}`;
  };

  return {
    info: (message: string, meta?: Record<string, unknown>) => {
      console.log(formatMessage('info', message, meta));
    },
    warn: (message: string, meta?: Record<string, unknown>) => {
      console.warn(formatMessage('warn', message, meta));
    },
    error: (message: string, meta?: Record<string, unknown>) => {
      console.error(formatMessage('error', message, meta));
    },
    debug: (message: string, meta?: Record<string, unknown>) => {
      if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
        console.debug(formatMessage('debug', message, meta));
      }
    },
  };
}
