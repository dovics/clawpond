import { AppError } from './AppError';

/**
 * Authentication error
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(
      message,
      'AUTHENTICATION_ERROR',
      401
    );
  }
}

/**
 * Authorization error
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Unauthorized access') {
    super(
      message,
      'AUTHORIZATION_ERROR',
      403
    );
  }
}
