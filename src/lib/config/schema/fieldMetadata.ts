import { ResolvedSchemaNode } from './preprocessor'

export type FieldWidgetType =
  | 'input'
  | 'slider'
  | 'switch'
  | 'select'
  | 'textarea'
  | 'tabs'
  | 'accordion'
  | 'keyValue'
  | 'array'

export interface FieldUIOptions {
  widget?: FieldWidgetType
  label?: string
  description?: string
  placeholder?: string
  minValue?: number
  maxValue?: number
  step?: number
  options?: Record<string, string>  // For select: value -> label mapping
  sensitive?: boolean
  disabled?: boolean
  hidden?: boolean
  condition?: {
    field: string
    value: any
  }
}

/**
 * Get UI metadata for a specific field path
 */
export function getFieldUI(path: string, schema: ResolvedSchemaNode): FieldUIOptions {
  // Check if we have explicit metadata for this path
  const explicitMetadata = fieldMetadata[path]
  if (explicitMetadata) {
    return { ...explicitMetadata }
  }

  // Auto-detect from schema
  const autoDetected: FieldUIOptions = {}

  // Detect slider candidates (numeric with min/max range <= 100)
  if (schema.type === 'number' && schema.minimum !== undefined && schema.maximum !== undefined) {
    const range = schema.maximum - schema.minimum
    if (range > 0 && range <= 100) {
      autoDetected.widget = 'slider'
    }
  }

  // Detect select options from enum
  if (schema.enum && schema.enum.length > 0) {
    autoDetected.widget = 'select'
    // Create value->label mapping
    autoDetected.options = {}
    schema.enum.forEach((value: any) => {
      autoDetected.options![String(value)] = formatEnumLabel(value)
    })
  }

  return autoDetected
}

/**
 * Format enum values to human-readable labels
 */
function formatEnumLabel(value: any): string {
  if (typeof value === 'boolean') {
    return value ? '是' : '否'
  }

  if (typeof value === 'string') {
    // Convert snake_case to Title Case
    return value
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  return String(value)
}

/**
 * Explicit field metadata configuration
 * Maps field paths to their UI options
 */
export const fieldMetadata: Record<string, FieldUIOptions> = {
  // Temperature fields
  'default_temperature': {
    widget: 'slider',
    minValue: 0,
    maxValue: 2,
    step: 0.01,
    label: '默认温度'
  },

  // Basic configuration fields
  'default_provider': {
    widget: 'select',
    label: '默认提供商',
    placeholder: '选择提供商',
    options: {
      'openrouter': 'OpenRouter',
      'anthropic': 'Anthropic',
      'openai': 'OpenAI',
      'ollama': 'Ollama',
      'google': 'Google',
      'bedrock': 'AWS Bedrock',
      'vertex': 'Google Vertex',
      'custom': '自定义'
    }
  },

  'default_model': {
    label: '默认模型',
    placeholder: '例如: anthropic/claude-sonnet-4-6'
  },

  'api_key': {
    label: 'API 密钥',
    placeholder: '输入 API 密钥',
    sensitive: true
  },

  'api_url': {
    label: 'API URL',
    placeholder: '例如: http://10.0.0.1:11434',
    condition: {
      field: 'default_provider',
      value: 'custom'
    }
  },

  // Autonomy configuration
  'autonomy.level': {
    widget: 'select',
    options: {
      'disabled': '禁用',
      'supervised': '受监督',
      'auto': '自动'
    },
    label: '自主级别'
  },

  'autonomy.max_actions_per_hour': {
    widget: 'slider',
    minValue: 1,
    maxValue: 100,
    step: 1,
    label: '每小时最大操作数'
  },

  // Gateway configuration
  'gateway.port': {
    widget: 'input',
    minValue: 1024,
    maxValue: 65535,
    label: '网关端口'
  },

  // Runtime configuration
  'runtime.kind': {
    widget: 'select',
    options: {
      'native': '原生',
      'docker': 'Docker'
    },
    label: '运行时类型'
  },

  // Security fields
  'security.sandbox.backend': {
    widget: 'select',
    options: {
      'auto': '自动选择',
      'firejail': 'Firejail',
      'chroot': 'Chroot'
    },
    label: '沙箱后端'
  },

  // Resource limits
  'security.resources.max_memory_mb': {
    widget: 'slider',
    minValue: 128,
    maxValue: 8192,
    step: 128,
    label: '最大内存 (MB)'
  },

  // Model providers - should use KeyValueField
  'model_providers': {
    widget: 'keyValue',
    label: '模型提供商配置'
  },

  // Agents - should use KeyValueField for multi-agent workflows
  'agents': {
    widget: 'keyValue',
    label: '代理配置 (多代理工作流)'
  },

  // Channels - should use TabbedObjectField
  'channels_config': {
    widget: 'tabs',
    label: '消息通道配置'
  }
}