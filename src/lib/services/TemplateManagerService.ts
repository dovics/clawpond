import * as fs from 'fs';
import * as path from 'path';
import { DockerContainerService } from './DockerContainerService';
import { ConfigManagerService } from './ConfigManagerService';
import { InstanceStateManagerService } from './InstanceStateManagerService';
import {
  TemplateNotFoundError,
  TemplateCreationError,
  ConfigValidationError,
  ContainerNotRunningError,
  ContainerOperationError,
} from '@/lib/errors';
import { ZeroClawInstance, ZeroClawConfig } from '@/types';

/**
 * Template structure
 */
export interface Template {
  id: string;
  name: string;
  description?: string;
  config: ZeroClawConfig;
  createdAt: string;
  updatedAt: string;
}

/**
 * Create template from instance options
 */
export interface CreateTemplateOptions {
  name: string;
  description?: string;
  config: ZeroClawConfig;
}

/**
 * TemplateManagerService handles template operations and config application
 * Responsibilities:
 * - Template creation and storage
 * - Template retrieval and deletion
 * - Asynchronous config application to instances
 */
export class TemplateManagerService {
  private templatesDir: string;

  constructor(
    private containerService: DockerContainerService,
    private configService: ConfigManagerService,
    private stateService: InstanceStateManagerService,
    workspaceRoot: string = process.cwd()
  ) {
    this.templatesDir = path.join(workspaceRoot, 'templates');
    this.ensureTemplatesDir();
  }

  /**
   * Ensure templates directory exists
   */
  private ensureTemplatesDir(): void {
    if (!fs.existsSync(this.templatesDir)) {
      fs.mkdirSync(this.templatesDir, { recursive: true });
    }
  }

  /**
   * Get template file path
   */
  private getTemplatePath(templateId: string): string {
    return path.join(this.templatesDir, `${templateId}.json`);
  }

  /**
   * Generate template ID from name
   */
  private generateTemplateId(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
  }

  /**
   * List all templates
   */
  listTemplates(): Template[] {
    if (!fs.existsSync(this.templatesDir)) {
      return [];
    }

    const files = fs.readdirSync(this.templatesDir)
      .filter(f => f.endsWith('.json'));

    const templates: Template[] = [];
    for (const file of files) {
      try {
        const templatePath = path.join(this.templatesDir, file);
        const content = fs.readFileSync(templatePath, 'utf-8');
        templates.push(JSON.parse(content));
      } catch (error) {
        console.warn(`Failed to read template ${file}:`, error);
      }
    }

    return templates;
  }

  /**
   * Get template by ID
   */
  getTemplate(templateId: string): Template | null {
    const templatePath = this.getTemplatePath(templateId);

    if (!fs.existsSync(templatePath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(templatePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error(`Failed to read template ${templateId}:`, error);
      return null;
    }
  }

  /**
   * Create template from options
   */
  createTemplate(options: CreateTemplateOptions): Template {
    const templateId = this.generateTemplateId(options.name);
    const now = new Date().toISOString();

    // Validate config
    this.configService.validateConfig(options.config);

    const template: Template = {
      id: templateId,
      name: options.name,
      description: options.description,
      config: options.config,
      createdAt: now,
      updatedAt: now,
    };

    const templatePath = this.getTemplatePath(templateId);

    try {
      fs.writeFileSync(templatePath, JSON.stringify(template, null, 2), 'utf-8');
      return template;
    } catch (error) {
      throw new TemplateCreationError(
        `Failed to save template: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Create template from existing instance
   */
  async createTemplateFromInstance(
    instanceId: string,
    name: string,
    description?: string
  ): Promise<Template> {
    const instance = await this.stateService.getInstanceById(instanceId);

    if (!instance) {
      throw new TemplateNotFoundError(`Instance ${instanceId} not found`);
    }

    return this.createTemplate({
      name,
      description,
      config: instance.config,
    });
  }

  /**
   * Update template
   */
  updateTemplate(templateId: string, updates: Partial<Template>): Template {
    const template = this.getTemplate(templateId);

    if (!template) {
      throw new TemplateNotFoundError(templateId);
    }

    const updated: Template = {
      ...template,
      ...updates,
      id: templateId, // Don't change ID
      updatedAt: new Date().toISOString(),
    };

    if (updates.config) {
      this.configService.validateConfig(updates.config);
    }

    const templatePath = this.getTemplatePath(templateId);

    try {
      fs.writeFileSync(templatePath, JSON.stringify(updated, null, 2), 'utf-8');
      return updated;
    } catch (error) {
      throw new TemplateCreationError(
        `Failed to update template: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Delete template
   */
  deleteTemplate(templateId: string): void {
    const templatePath = this.getTemplatePath(templateId);

    if (!fs.existsSync(templatePath)) {
      throw new TemplateNotFoundError(templateId);
    }

    fs.unlinkSync(templatePath);
  }

  /**
   * Apply config to instance asynchronously
   * This method waits for the container to be ready before applying config
   */
  async applyConfigAsync(
    containerId: string,
    config: ZeroClawConfig,
    instanceName: string
  ): Promise<void> {
    try {
      // Wait for container to be ready
      await this.waitForContainer(containerId);

      // Apply the config
      this.configService.updateConfig(instanceName, config);

      // Restart container to apply new config
      await this.containerService.restartContainer(containerId);

      console.log(`Config applied successfully to ${instanceName}`);
    } catch (error) {
      console.error(`Failed to apply config to ${instanceName}:`, error);
      throw error;
    }
  }

  /**
   * Wait for container to be ready (healthy)
   */
  private async waitForContainer(
    containerId: string,
    maxAttempts: number = 30,
    interval: number = 2000
  ): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const isRunning = await this.containerService.isContainerRunning(containerId);

        if (isRunning) {
          // Additional check: try to inspect container
          await this.containerService.inspectContainer(containerId);
          return; // Container is ready
        }
      } catch (error) {
        // Container not ready yet, continue waiting
      }

      await new Promise(resolve => setTimeout(resolve, interval));
    }

    throw new ContainerOperationError(
      containerId,
      'wait for ready',
      'Container did not become ready in time'
    );
  }

  /**
   * Apply template to instance (returns immediately, applies in background)
   */
  applyTemplateInBackground(
    containerId: string,
    template: Template,
    instanceName: string
  ): void {
    // Don't await - let it run in background
    this.applyConfigAsync(containerId, template.config, instanceName)
      .catch(error => {
        console.error(`Background config application failed for ${instanceName}:`, error);
      });
  }

  /**
   * Validate template config
   */
  validateTemplate(template: Template): boolean {
    try {
      this.configService.validateConfig(template.config);
      return true;
    } catch (error) {
      throw new ConfigValidationError(
        `Invalid template config: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Export template to JSON string
   */
  exportTemplate(templateId: string): string {
    const template = this.getTemplate(templateId);

    if (!template) {
      throw new TemplateNotFoundError(templateId);
    }

    return JSON.stringify(template, null, 2);
  }

  /**
   * Import template from JSON string
   */
  importTemplate(jsonString: string): Template {
    try {
      const template = JSON.parse(jsonString) as Template;

      // Validate template structure
      if (!template.id || !template.name || !template.config) {
        throw new ConfigValidationError('Invalid template structure');
      }

      this.validateTemplate(template);

      // Save with new ID to avoid conflicts
      const newTemplate = this.createTemplate({
        name: template.name,
        description: template.description,
        config: template.config,
      });

      return newTemplate;
    } catch (error) {
      throw new TemplateCreationError(
        `Failed to import template: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

// Export singleton instance
import { dockerContainerService } from './DockerContainerService';
import { configManagerService } from './ConfigManagerService';
import { instanceStateManagerService } from './InstanceStateManagerService';

export const templateManagerService = new TemplateManagerService(
  dockerContainerService,
  configManagerService,
  instanceStateManagerService
);
