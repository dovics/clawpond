import * as TOML from '@iarna/toml';
import * as fs from 'fs';
import * as path from 'path';
import {
  ConfigNotFoundError,
  ConfigParseError,
  ConfigValidationError,
} from '@/lib/errors';
import type { ZeroClawConfig } from '@/types';

/**
 * ConfigManagerService handles configuration file operations
 * Responsibilities:
 * - Reading TOML configuration files
 * - Writing configuration files
 * - Merging configurations
 * - Configuration validation
 */
export class ConfigManagerService {
  private workspaceRoot: string;

  constructor(workspaceRoot: string = process.cwd()) {
    this.workspaceRoot = workspaceRoot;
  }

  /**
   * Get the config directory path for a container instance
   */
  getConfigDir(instanceName: string): string {
    const sanitized = instanceName.toLowerCase().replace(/[^a-z0-9_.-]/g, '-');
    return path.join(this.workspaceRoot, `openclaw-${sanitized}`, '.zeroclaw');
  }

  /**
   * Get the config file path
   */
  getConfigPath(instanceName: string): string {
    return path.join(this.getConfigDir(instanceName), 'config.toml');
  }

  /**
   * Check if config file exists
   */
  configExists(instanceName: string): boolean {
    const configPath = this.getConfigPath(instanceName);
    return fs.existsSync(configPath);
  }

  /**
   * Read configuration from file
   */
  readConfig(instanceName: string): ZeroClawConfig {
    const configPath = this.getConfigPath(instanceName);

    if (!fs.existsSync(configPath)) {
      throw new ConfigNotFoundError(instanceName, configPath);
    }

    try {
      const content = fs.readFileSync(configPath, 'utf-8');
      return TOML.parse(content) as ZeroClawConfig;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new ConfigParseError(configPath, error.message);
      }
      throw new ConfigParseError(configPath, String(error));
    }
  }

  /**
   * Write configuration to file
   */
  writeConfig(instanceName: string, config: ZeroClawConfig): void {
    const configDir = this.getConfigDir(instanceName);
    const configPath = this.getConfigPath(instanceName);

    // Create directory if it doesn't exist
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    try {
      const tomlString = TOML.stringify(config);
      fs.writeFileSync(configPath, tomlString, 'utf-8');
    } catch (error) {
      throw new ConfigParseError(configPath, `Failed to write config: ${error}`);
    }
  }

  /**
   * Merge two configurations
   * Override takes precedence over base
   */
  mergeConfigs(base: ZeroClawConfig, override: ZeroClawConfig): ZeroClawConfig {
    const merged = { ...base };

    for (const key in override) {
      const overrideValue = override[key];
      const baseValue = merged[key];

      if (
        overrideValue &&
        typeof overrideValue === 'object' &&
        !Array.isArray(overrideValue) &&
        baseValue &&
        typeof baseValue === 'object' &&
        !Array.isArray(baseValue)
      ) {
        // Recursively merge nested objects
        merged[key] = this.mergeConfigs(baseValue, overrideValue);
      } else {
        // Override with new value
        merged[key] = overrideValue;
      }
    }

    return merged;
  }

  /**
   * Update specific configuration keys
   */
  updateConfig(instanceName: string, updates: Partial<ZeroClawConfig>): void {
    const existing = this.configExists(instanceName)
      ? this.readConfig(instanceName)
      : {};

    const updated = this.mergeConfigs(existing, updates);
    this.writeConfig(instanceName, updated);
  }

  /**
   * Validate configuration
   */
  validateConfig(config: any): config is ZeroClawConfig {
    if (typeof config !== 'object' || config === null) {
      throw new ConfigValidationError('Configuration must be an object');
    }

    // Validate known nested objects
    const knownSections = [
      'gateway', 'observability', 'autonomy', 'memory',
      'reliability', 'web_search', 'web_fetch', 'runtime'
    ];

    for (const section of knownSections) {
      if (config[section] && typeof config[section] !== 'object') {
        throw new ConfigValidationError(
          `Invalid configuration: ${section} must be an object`
        );
      }
    }

    return true;
  }

  /**
   * Get default configuration
   */
  getDefaultConfig(): ZeroClawConfig {
    return {
      default_provider: 'openrouter',
      default_model: 'anthropic/claude-sonnet-4.6',
      default_temperature: 0.7,
      observability: {
        backend: 'none',
        runtime_trace_mode: 'none',
      },
      autonomy: {
        level: 'supervised',
        workspace_only: true,
      },
      gateway: {
        port: 42617,
        host: '0.0.0.0',
        require_pairing: false,
        allow_public_bind: true,
      },
      memory: {
        backend: 'sqlite',
        auto_save: true,
      },
      reliability: {
        provider_retries: 2,
        provider_backoff_ms: 500,
      },
      web_search: {
        enabled: false,
        provider: 'duckduckgo',
        max_results: 5,
        timeout_secs: 15,
      },
      web_fetch: {
        enabled: false,
        allowed_domains: ['*'],
        blocked_domains: [],
        max_response_size: 500000,
        timeout_secs: 30,
      },
    };
  }

  /**
   * Ensure config directory exists
   */
  ensureConfigDir(instanceName: string): void {
    const configDir = this.getConfigDir(instanceName);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
  }

  /**
   * Delete configuration
   */
  deleteConfig(instanceName: string): void {
    const configPath = this.getConfigPath(instanceName);
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
    }
  }
}

// Export singleton instance
export const configManagerService = new ConfigManagerService(
  path.join(process.cwd(), 'workspace')
);
