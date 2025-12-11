/**
 * Centralized Logging Utility
 * Uses Winston for structured logging
 */
import winston from 'winston';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(colors);

// Custom format for console output
const consoleFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;

  // Add metadata if present
  if (Object.keys(metadata).length > 0) {
    // Remove stack trace from metadata for cleaner output
    const { stack, ...rest } = metadata;
    if (Object.keys(rest).length > 0) {
      msg += ` ${JSON.stringify(rest)}`;
    }
  }

  return msg;
});

// Determine log level from environment
const level = () => {
  const env = process.env.LOG_LEVEL || process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : process.env.LOG_LEVEL || 'info';
};

// Create the logger instance
export const logger = winston.createLogger({
  level: level(),
  levels,
  format: combine(
    errors({ stack: true }), // Log stack traces for errors
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.json()
  ),
  transports: [
    // Console transport
    new winston.transports.Console({
      format: combine(
        colorize({ all: true }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        consoleFormat
      ),
    }),
  ],
});

// Add file transports in production
if (process.env.NODE_ENV === 'production') {
  // Error log file
  logger.add(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true,
    })
  );

  // Combined log file
  logger.add(
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
      tailable: true,
    })
  );
}

/**
 * Context-aware logger creator
 * Creates a child logger with a specific context
 */
export function createLogger(context: string) {
  return logger.child({ context });
}

/**
 * Log database queries (development only)
 */
export function logQuery(duration: number, query: string) {
  if (process.env.NODE_ENV === 'development' || process.env.ENABLE_QUERY_LOGGING === 'true') {
    if (duration > 100) {
      logger.warn('Slow query detected', {
        duration: `${duration}ms`,
        query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
      });
    } else if (process.env.ENABLE_QUERY_LOGGING === 'true') {
      logger.debug('Database query', {
        duration: `${duration}ms`,
        query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
      });
    }
  }
}

/**
 * Log API requests
 */
export function logRequest(method: string, path: string, statusCode: number, duration: number) {
  const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'http';
  logger.log(level, `${method} ${path} ${statusCode}`, {
    method,
    path,
    statusCode,
    duration: `${duration}ms`,
  });
}

/**
 * Log authentication events
 */
export function logAuth(event: 'login' | 'logout' | 'register' | 'failed_login', userId?: string, email?: string) {
  logger.info(`Auth event: ${event}`, {
    event,
    userId,
    email,
  });
}

// Export default logger
export default logger;
