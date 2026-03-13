import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ZeroClawConfig } from '@/types';

export interface TemplateMetadata {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  sourceInstanceId?: string; // If created from an existing instance
}

export interface Template extends TemplateMetadata {
  config: ZeroClawConfig;
}

export interface TemplatesIndex {
  templates: TemplateMetadata[];
}

// 确保使用绝对路径
const TEMPLATES_DIR = path.resolve(process.cwd(), 'templates');
const INDEX_FILE = path.join(TEMPLATES_DIR, 'templates.json');

export function getTemplatesDir(): string {
  return TEMPLATES_DIR;
}

export function ensureTemplatesDir(): void {
  if (!fs.existsSync(TEMPLATES_DIR)) {
    fs.mkdirSync(TEMPLATES_DIR, { recursive: true });
  }

  if (!fs.existsSync(INDEX_FILE)) {
    const index: TemplatesIndex = { templates: [] };
    fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2), 'utf-8');
  }
}

export function listTemplates(): Template[] {
  ensureTemplatesDir();

  const indexContent = fs.readFileSync(INDEX_FILE, 'utf-8');
  const index: TemplatesIndex = JSON.parse(indexContent);

  return index.templates.map((meta) => {
    const configPath = path.join(TEMPLATES_DIR, `${meta.id}.json`);
    const configContent = fs.readFileSync(configPath, 'utf-8');
    const config: ZeroClawConfig = JSON.parse(configContent);

    return {
      ...meta,
      config,
    };
  });
}

export function getTemplate(id: string): Template | null {
  ensureTemplatesDir();

  const indexContent = fs.readFileSync(INDEX_FILE, 'utf-8');
  const index: TemplatesIndex = JSON.parse(indexContent);

  const meta = index.templates.find((t) => t.id === id);
  if (!meta) {
    return null;
  }

  const configPath = path.join(TEMPLATES_DIR, `${id}.json`);
  if (!fs.existsSync(configPath)) {
    return null;
  }

  const configContent = fs.readFileSync(configPath, 'utf-8');
  const config: ZeroClawConfig = JSON.parse(configContent);

  return {
    ...meta,
    config,
  };
}

export function createTemplate(template: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>): Template {
  ensureTemplatesDir();

  const id = uuidv4();
  const now = new Date().toISOString();

  const newTemplate: Template = {
    id,
    ...template,
    createdAt: now,
    updatedAt: now,
  };

  // Write config file
  const configPath = path.join(TEMPLATES_DIR, `${id}.json`);
  fs.writeFileSync(configPath, JSON.stringify(newTemplate.config, null, 2), 'utf-8');

  // Update index
  const indexContent = fs.readFileSync(INDEX_FILE, 'utf-8');
  const index: TemplatesIndex = JSON.parse(indexContent);

  const meta: TemplateMetadata = {
    id,
    name: newTemplate.name,
    description: newTemplate.description,
    sourceInstanceId: newTemplate.sourceInstanceId,
    createdAt: now,
    updatedAt: now,
  };

  index.templates.push(meta);
  fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2), 'utf-8');

  return newTemplate;
}

export function updateTemplate(id: string, updates: Partial<Omit<Template, 'id' | 'createdAt' | 'config'>> & { config?: ZeroClawConfig }): Template | null {
  ensureTemplatesDir();

  const indexContent = fs.readFileSync(INDEX_FILE, 'utf-8');
  const index: TemplatesIndex = JSON.parse(indexContent);

  const metaIndex = index.templates.findIndex((t) => t.id === id);
  if (metaIndex === -1) {
    return null;
  }

  const existingMeta = index.templates[metaIndex];
  const configPath = path.join(TEMPLATES_DIR, `${id}.json`);

  if (!fs.existsSync(configPath)) {
    return null;
  }

  // Read existing config
  const configContent = fs.readFileSync(configPath, 'utf-8');
  const existingConfig: ZeroClawConfig = JSON.parse(configContent);

  // Merge updates
  const updatedMeta: TemplateMetadata = {
    ...existingMeta,
    name: updates.name ?? existingMeta.name,
    description: updates.description ?? existingMeta.description,
    sourceInstanceId: updates.sourceInstanceId ?? existingMeta.sourceInstanceId,
    updatedAt: new Date().toISOString(),
  };

  const updatedConfig: ZeroClawConfig = updates.config ?? existingConfig;

  // Write updated config
  fs.writeFileSync(configPath, JSON.stringify(updatedConfig, null, 2), 'utf-8');

  // Update index
  index.templates[metaIndex] = updatedMeta;
  fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2), 'utf-8');

  return {
    ...updatedMeta,
    config: updatedConfig,
  };
}

export function deleteTemplate(id: string): boolean {
  ensureTemplatesDir();

  const indexContent = fs.readFileSync(INDEX_FILE, 'utf-8');
  const index: TemplatesIndex = JSON.parse(indexContent);

  const metaIndex = index.templates.findIndex((t) => t.id === id);
  if (metaIndex === -1) {
    return false;
  }

  // Delete config file
  const configPath = path.join(TEMPLATES_DIR, `${id}.json`);
  if (fs.existsSync(configPath)) {
    fs.unlinkSync(configPath);
  }

  // Update index
  index.templates.splice(metaIndex, 1);
  fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2), 'utf-8');

  return true;
}
