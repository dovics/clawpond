// src/components/ConfigEditor/types.ts
import { ZeroClawConfig } from '@/types'

export interface ConfigCategoryFormProps {
  config: ZeroClawConfig
  onChange: (updates: Partial<ZeroClawConfig>) => void
  errors: Record<string, string | undefined>
  disabled?: boolean
}
