import { AppError } from './AppError';

/**
 * Configuration validation error
 */
export class ConfigValidationError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(
      message,
      'CONFIG_VALIDATION_ERROR',
      400,
      details
    );
  }
}

/**
 * Configuration file not found error
 */
export class ConfigNotFoundError extends AppError {
  constructor(containerId: string, configPath: string) {
    super(
      `Configuration file not found for container ${containerId}: ${configPath}`,
      'CONFIG_NOT_FOUND',
      404,
      { containerId, configPath }
    );
  }
}

/**
 * Configuration parse error (TOML parsing)
 */
export class ConfigParseError extends AppError {
  constructor(
    configPath: string,
    parseError: string
  ) {
    super(
      `Failed to parse configuration file: ${parseError}`,
      'CONFIG_PARSE_ERROR',
      400,
      { configPath, parseError }
    );
  }
}

/**
 * Template not found error
 */
export class TemplateNotFoundError extends AppError {
  constructor(templateId: string) {
    super(
      `Template not found: ${templateId}`,
      'TEMPLATE_NOT_FOUND',
      404,
      { templateId }
    );
  }
}

/**
 * Template creation error
 */
export class TemplateCreationError extends AppError {
  constructor(reason: string, details?: Record<string, any>) {
    super(
      `Failed to create template: ${reason}`,
      'TEMPLATE_CREATION_ERROR',
      500,
      details
    );
  }
}
