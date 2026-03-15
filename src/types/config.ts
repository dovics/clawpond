// src/types/config.ts
import { ZeroClawConfig } from './index'

export type { ZeroClawConfig }

export type ConfigCategory =
  | 'basic'
  | 'security'
  | 'channels'
  | 'network'
  | 'runtime'
  | 'advanced'

export interface ValidationRule {
  required?: boolean
  min?: number
  max?: number
  step?: number
  pattern?: RegExp
  enum?: string[]
  minItems?: number
  maxItems?: number
  minLength?: number
  custom?: (value: any, allValues: ZeroClawConfig) => string | undefined
}

export type ValidationErrors = Record<string, string | undefined>

export interface ValidationRules {
  [fieldPath: string]: ValidationRule
}

export interface ConfigTemplate {
  id: string
  name: string
  description: string
  category: 'basic' | 'security' | 'performance' | 'custom'
  config: Partial<ZeroClawConfig>
}

export interface ConfigState {
  config: ZeroClawConfig | null
  originalConfig: ZeroClawConfig | null
  currentCategory: ConfigCategory
  previewOpen: boolean
  templatesOpen: boolean
  dirty: boolean
  saving: boolean
  loading: boolean
  errors: ValidationErrors
  successMessage: string | null
  errorMessage: string | null
}

export type ConfigAction =
  | { type: 'LOAD_CONFIG'; payload: ZeroClawConfig }
  | { type: 'UPDATE_CONFIG'; payload: Partial<ZeroClawConfig> }
  | { type: 'SET_CATEGORY'; payload: ConfigCategory }
  | { type: 'SET_ERRORS'; payload: ValidationErrors }
  | { type: 'SET_SAVING'; payload: boolean }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SUCCESS'; payload: string | null }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_PREVIEW_OPEN'; payload: boolean }
  | { type: 'SET_TEMPLATES_OPEN'; payload: boolean }
  | { type: 'RESET' }

export interface ConfigContextValue {
  state: ConfigState
  updateConfig: (updates: Partial<ZeroClawConfig>) => void
  setCategory: (category: ConfigCategory) => void
  saveConfig: () => Promise<void>
  resetConfig: () => void
  setErrors: (errors: ValidationErrors) => void
  setPreviewOpen: (open: boolean) => void
  setTemplatesOpen: (open: boolean) => void
}
