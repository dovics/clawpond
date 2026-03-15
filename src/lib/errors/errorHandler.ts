import { AppError } from './AppError';
import { ContainerNotFoundError, ContainerOperationError } from './ContainerErrors';
import { ConfigParseError, ConfigNotFoundError } from './ConfigErrors';

/**
 * Convert unknown error to AppError
 */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    // Try to match common error patterns
    const message = error.message.toLowerCase();

    if (message.includes('not found') || message.includes('no such')) {
      if (message.includes('container')) {
        return new ContainerNotFoundError('unknown');
      }
      if (message.includes('config')) {
        return new ConfigNotFoundError('unknown', 'unknown');
      }
    }

    if (message.includes('already running')) {
      return new ContainerOperationError('unknown', 'start', 'Container already running');
    }

    if (message.includes('not running')) {
      return new ContainerOperationError('unknown', 'operation', 'Container is not running');
    }

    // Generic error
    return new AppError(
      error.message,
      'UNKNOWN_ERROR',
      500,
      { originalError: error.name }
    );
  }

  // Non-Error objects
  return new AppError(
    String(error),
    'UNKNOWN_ERROR',
    500
  );
}

/**
 * Format error for API response
 */
export function formatErrorResponse(error: unknown) {
  const appError = toAppError(error);
  return appError.toJSON();
}

/**
 * Log error with context
 */
export function logError(error: unknown, context?: Record<string, any>) {
  const appError = toAppError(error);
  console.error(`[${appError.code}] ${appError.message}`, {
    ...context,
    ...appError.details,
    stack: appError.stack,
  });
}
