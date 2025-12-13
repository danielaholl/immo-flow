/**
 * Sentry Error Tracking
 * Centralized error monitoring and reporting
 */
import * as Sentry from '@sentry/node';
import { getEnv } from '../config/env.js';
import { createLogger } from './logger.js';

const log = createLogger('sentry');

let sentryInitialized = false;

/**
 * Initialize Sentry error tracking
 * Should be called early in application startup
 */
export function initializeSentry() {
  if (sentryInitialized) {
    log.warn('Sentry already initialized');
    return;
  }

  const env = getEnv();

  // Only initialize if DSN is provided
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    log.warn('Sentry DSN not configured - error tracking disabled');
    return;
  }

  Sentry.init({
    dsn,
    environment: env.NODE_ENV,

    // Performance Monitoring
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Release tracking
    release: process.env.npm_package_version || 'unknown',

    // Filter sensitive data
    beforeSend(event, hint) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
      }

      // Remove sensitive body data
      if (event.request?.data && typeof event.request.data === 'object') {
        const data = event.request.data as Record<string, unknown>;
        if ('password' in data) data.password = '[REDACTED]';
        if ('passwordHash' in data) data.passwordHash = '[REDACTED]';
        if ('token' in data) data.token = '[REDACTED]';
      }

      return event;
    },

    // Ignore certain errors
    ignoreErrors: [
      // Browser extensions
      /^Non-Error promise rejection captured/,
      // Network errors that aren't our fault
      'Network request failed',
      'NetworkError',
      // Common user errors
      'Invalid credentials',
      'User already exists',
      'Property not found',
    ],
  });

  sentryInitialized = true;
  log.info('Sentry error tracking initialized');
}

/**
 * Capture an exception with context
 */
export function captureException(
  error: Error,
  context?: {
    user?: { id: string; email: string };
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
  }
) {
  if (!sentryInitialized) return;

  Sentry.withScope(scope => {
    if (context?.user) {
      scope.setUser({
        id: context.user.id,
        email: context.user.email,
      });
    }

    if (context?.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }

    if (context?.extra) {
      Object.entries(context.extra).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }

    Sentry.captureException(error);
  });
}

/**
 * Capture a message (non-error event)
 */
export function captureMessage(
  message: string,
  level: 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug' = 'info',
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
  }
) {
  if (!sentryInitialized) return;

  Sentry.withScope(scope => {
    if (context?.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }

    if (context?.extra) {
      Object.entries(context.extra).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }

    Sentry.captureMessage(message, level);
  });
}

/**
 * Express error handler middleware
 * Should be added AFTER all routes and other error handlers
 * Note: In Sentry SDK v8+, use Sentry.setupExpressErrorHandler() instead
 */
export const sentryErrorHandler = (err: Error, req: any, res: any, next: any) => {
  Sentry.captureException(err);
  next(err);
};

/**
 * Express request handler middleware
 * Should be added BEFORE all routes
 * Note: In Sentry SDK v8+, auto-instrumentation handles this
 */
export const sentryRequestHandler = (req: any, res: any, next: any) => {
  next();
};

/**
 * Express tracing middleware
 * Should be added BEFORE all routes
 * Note: In Sentry SDK v8+, auto-instrumentation handles this
 */
export const sentryTracingHandler = (req: any, res: any, next: any) => {
  next();
};

// Export Sentry for direct usage if needed
export { Sentry };
