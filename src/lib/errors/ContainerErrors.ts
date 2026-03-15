import { AppError } from './AppError';

/**
 * Container not found error
 */
export class ContainerNotFoundError extends AppError {
  constructor(containerId: string) {
    super(
      `Container not found: ${containerId}`,
      'CONTAINER_NOT_FOUND',
      404,
      { containerId }
    );
  }
}

/**
 * Container operation error (start, stop, restart, etc.)
 */
export class ContainerOperationError extends AppError {
  constructor(
    containerId: string,
    operation: string,
    reason?: string
  ) {
    super(
      `Failed to ${operation} container${containerId}: ${reason || 'Unknown error'}`,
      'CONTAINER_OPERATION_ERROR',
      500,
      { containerId, operation, reason }
    );
  }
}

/**
 * Container not running error
 */
export class ContainerNotRunningError extends AppError {
  constructor(containerId: string) {
    super(
      `Container is not running: ${containerId}`,
      'CONTAINER_NOT_RUNNING',
      400,
      { containerId }
    );
  }
}

/**
 * Container creation error
 */
export class ContainerCreationError extends AppError {
  constructor(reason: string, details?: Record<string, any>) {
    super(
      `Failed to create container: ${reason}`,
      'CONTAINER_CREATION_ERROR',
      500,
      details
    );
  }
}
