/**
 * Service layer exports
 * All business logic services are exported from here
 */

// Container operations
export {
  DockerContainerService,
  dockerContainerService,
} from './DockerContainerService';

// Configuration management
export {
  ConfigManagerService,
  configManagerService,
} from './ConfigManagerService';

export type { ZeroClawConfig } from '@/types';

// Instance state management
export {
  InstanceStateManagerService,
  instanceStateManagerService,
} from './InstanceStateManagerService';

// Template management
export {
  TemplateManagerService,
  templateManagerService,
} from './TemplateManagerService';

export type { Template, CreateTemplateOptions } from './TemplateManagerService';
