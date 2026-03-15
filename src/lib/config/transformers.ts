// src/lib/config/transformers.ts
import TOML from '@iarna/toml'
import { ZeroClawConfig } from '@/types/index'

export function configToToml(config: ZeroClawConfig): string {
  try {
    return TOML.stringify(config)
  } catch (error) {
    console.error('Error converting config to TOML:', error)
    throw new Error('Failed to convert config to TOML format')
  }
}

export function mergeConfig(
  base: ZeroClawConfig,
  updates: Partial<ZeroClawConfig>
): ZeroClawConfig {
  const merged = { ...base }

  for (const key in updates) {
    const value = updates[key]
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      merged[key] = {
        ...(merged[key] as object || {}),
        ...value
      }
    } else {
      merged[key] = value
    }
  }

  return merged
}
