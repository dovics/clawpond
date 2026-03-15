// src/lib/config/validation.ts
import { ValidationRules, ValidationErrors, ZeroClawConfig } from '@/types/config'

export const validationRules: ValidationRules = {
  // Basic Configuration
  'default_temperature': {
    min: 0,
    max: 2
  },

  // Security Configuration
  'autonomy.max_actions_per_hour': {
    min: 1,
    max: 1000
  },

  'autonomy.allowed_commands': {
    maxItems: 100,
    custom: (value: string[]) => {
      for (const cmd of value) {
        if (!cmd.trim()) {
          return '命令不能为空'
        }
      }
      return undefined
    }
  },

  'autonomy.forbidden_paths': {
    maxItems: 100,
    custom: (value: string[]) => {
      for (const path of value) {
        if (!path.startsWith('/') && !path.startsWith('~')) {
          return `路径 "${path}" 必须是绝对路径`
        }
      }
      return undefined
    }
  },

  // Network Configuration
  'web_search.max_results': {
    min: 1,
    max: 50
  },

  'web_search.timeout_secs': {
    min: 1,
    max: 300
  },

  'proxy.http_proxy': {
    pattern: /^https?:\/\/.+\:\d+$/,
    custom: (value: string) => {
      try {
        new URL(value)
        return undefined
      } catch {
        return '请输入有效的代理 URL'
      }
    }
  },

  // Runtime Configuration
  'gateway.port': {
    min: 1024,
    max: 65535
  },

  'runtime.docker.memory_limit_mb': {
    min: 128,
    max: 32768
  },

  // Enums
  'web_search.provider': {
    enum: ['duckduckgo', 'brave']
  },

  'agent.tool_dispatcher': {
    enum: ['auto', 'sequential', 'parallel']
  }
}

export function validateField(
  fieldPath: string,
  value: any,
  rules: ValidationRules = validationRules
): string | undefined {
  const rule = rules[fieldPath]
  if (!rule) return undefined

  // Skip if empty and not required
  if (!rule.required && (value === undefined || value === null || value === '')) {
    return undefined
  }

  // Required check
  if (rule.required && (value === undefined || value === null || value === '')) {
    return '此字段为必填项'
  }

  // Type-specific validations
  if (typeof value === 'number') {
    if (rule.min !== undefined && value < rule.min) {
      return `最小值为 ${rule.min}`
    }
    if (rule.max !== undefined && value > rule.max) {
      return `最大值为 ${rule.max}`
    }
  }

  if (typeof value === 'string') {
    if (rule.minLength !== undefined && value.length < rule.minLength) {
      return `最少需要 ${rule.minLength} 个字符`
    }
    if (rule.pattern && !rule.pattern.test(value)) {
      return '格式不正确'
    }
    if (rule.enum && !rule.enum.includes(value)) {
      return `必须是以下值之一: ${rule.enum.join(', ')}`
    }
  }

  if (Array.isArray(value)) {
    if (rule.minItems !== undefined && value.length < rule.minItems) {
      return `至少需要 ${rule.minItems} 项`
    }
    if (rule.maxItems !== undefined && value.length > rule.maxItems) {
      return `最多允许 ${rule.maxItems} 项`
    }
  }

  // Custom validation
  if (rule.custom) {
    return rule.custom(value, value as ZeroClawConfig)
  }

  return undefined
}

export function validateConfig(
  config: ZeroClawConfig,
  rules: ValidationRules = validationRules
): ValidationErrors {
  const errors: ValidationErrors = {}

  for (const fieldPath in rules) {
    const value = getNestedValue(config, fieldPath)
    const error = validateField(fieldPath, value, rules)
    if (error) {
      errors[fieldPath] = error
    }
  }

  return errors
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj)
}
