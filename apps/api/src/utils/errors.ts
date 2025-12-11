/**
 * Standardized Error Handling
 * Custom error classes with error codes for consistent error handling
 */

import { createLogger } from './logger.js'./logger.js';

const log = createLogger('error-handling');

export enum ErrorCode {
  // Database errors (1000-1999)
  DATABASE_CONNECTION_ERROR = 'DATABASE_CONNECTION_ERROR',
  DATABASE_QUERY_ERROR = 'DATABASE_QUERY_ERROR',
  RECORD_NOT_FOUND = 'RECORD_NOT_FOUND',
  DUPLICATE_RECORD = 'DUPLICATE_RECORD',

  // AI/OpenAI errors (2000-2999)
  AI_API_ERROR = 'AI_API_ERROR',
  AI_TIMEOUT_ERROR = 'AI_TIMEOUT_ERROR',
  AI_INVALID_RESPONSE = 'AI_INVALID_RESPONSE',
  AI_QUOTA_EXCEEDED = 'AI_QUOTA_EXCEEDED',

  // Property errors (3000-3999)
  PROPERTY_NOT_FOUND = 'PROPERTY_NOT_FOUND',
  PROPERTY_VALIDATION_ERROR = 'PROPERTY_VALIDATION_ERROR',
  PROPERTY_EVALUATION_ERROR = 'PROPERTY_EVALUATION_ERROR',

  // File/Upload errors (4000-4999)
  FILE_UPLOAD_ERROR = 'FILE_UPLOAD_ERROR',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  FILE_INVALID_FORMAT = 'FILE_INVALID_FORMAT',
  PDF_PARSING_ERROR = 'PDF_PARSING_ERROR',
  IMAGE_PROCESSING_ERROR = 'IMAGE_PROCESSING_ERROR',

  // Authentication/Authorization errors (5000-5999)
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_TOKEN = 'INVALID_TOKEN',

  // Validation errors (6000-6999)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_INPUT = 'INVALID_INPUT',

  // External API errors (7000-7999)
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
  EXTERNAL_API_TIMEOUT = 'EXTERNAL_API_TIMEOUT',

  // Generic errors (9000-9999)
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Base application error class
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.INTERNAL_SERVER_ERROR,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, unknown>
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);

    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;
    this.name = this.constructor.name;

    Error.captureStackTrace(this);
  }
}

/**
 * Database-related errors
 */
export class DatabaseError extends AppError {
  constructor(message: string, code: ErrorCode = ErrorCode.DATABASE_QUERY_ERROR, context?: Record<string, unknown>) {
    super(message, code, 500, true, context);
  }
}

/**
 * Not found errors (404)
 */
export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(message, ErrorCode.RECORD_NOT_FOUND, 404, true);
  }
}

/**
 * AI/OpenAI related errors
 */
export class AIError extends AppError {
  constructor(message: string, code: ErrorCode = ErrorCode.AI_API_ERROR, context?: Record<string, unknown>) {
    super(message, code, 500, true, context);
  }
}

/**
 * Validation errors (400)
 */
export class ValidationError extends AppError {
  constructor(message: string, fields?: string[], context?: Record<string, unknown>) {
    super(
      message,
      ErrorCode.VALIDATION_ERROR,
      400,
      true,
      { ...context, fields }
    );
  }
}

/**
 * File processing errors
 */
export class FileError extends AppError {
  constructor(message: string, code: ErrorCode = ErrorCode.FILE_UPLOAD_ERROR, context?: Record<string, unknown>) {
    super(message, code, 400, true, context);
  }
}

/**
 * Authentication/Authorization errors
 */
export class AuthError extends AppError {
  constructor(message: string, code: ErrorCode = ErrorCode.UNAUTHORIZED) {
    super(message, code, code === ErrorCode.FORBIDDEN ? 403 : 401, true);
  }
}

/**
 * Check if error is an operational error (expected errors vs programming errors)
 */
export function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Format error for logging
 */
export function formatErrorForLogging(error: Error): Record<string, unknown> {
  if (error instanceof AppError) {
    return {
      name: error.name,
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      context: error.context,
      stack: error.stack,
    };
  }

  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
  };
}

/**
 * Wrap unknown errors in AppError
 */
export function wrapError(error: unknown, defaultMessage: string = 'An unexpected error occurred'): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(
      error.message || defaultMessage,
      ErrorCode.UNKNOWN_ERROR,
      500,
      false,
      { originalError: error.name }
    );
  }

  return new AppError(
    defaultMessage,
    ErrorCode.UNKNOWN_ERROR,
    500,
    false,
    { originalError: String(error) }
  );
}

/**
 * Safe error logging (won't throw)
 */
export function logError(error: Error, context?: Record<string, unknown>): void {
  try {
    const errorInfo = formatErrorForLogging(error);
    log.error('Application error', {
      ...errorInfo,
      ...context,
    });
  } catch (loggingError) {
    log.error('Failed to log error', {
      originalError: error.message,
      loggingError: loggingError instanceof Error ? loggingError.message : String(loggingError),
    });
  }
}

/**
 * Handle async errors with consistent error handling
 * Usage: const result = await handleAsync(() => someAsyncFunction())
 */
export async function handleAsync<T>(
  fn: () => Promise<T>,
  errorMessage?: string
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const wrappedError = wrapError(error, errorMessage);
    logError(wrappedError);
    throw wrappedError;
  }
}
