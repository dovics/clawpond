/**
 * Error handling exports
 */

// Base error class
export { AppError } from './AppError';

// Container errors
export {
  ContainerNotFoundError,
  ContainerOperationError,
  ContainerNotRunningError,
  ContainerCreationError,
} from './ContainerErrors';

// Configuration errors
export {
  ConfigValidationError,
  ConfigNotFoundError,
  ConfigParseError,
  TemplateNotFoundError,
  TemplateCreationError,
} from './ConfigErrors';

// Authentication errors
export {
  AuthenticationError,
  AuthorizationError,
} from './AuthErrors';

// Error handlers
export {
  toAppError,
  formatErrorResponse,
  logError,
} from './errorHandler';
