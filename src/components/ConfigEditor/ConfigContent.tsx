// src/components/ConfigEditor/ConfigContent.tsx
'use client'

import { ConfigCategory } from '@/types/config'
import { ZeroClawConfig } from '@/types'
import { BasicConfigForm } from './forms/BasicConfigForm'
import { SecurityConfigForm } from './forms/SecurityConfigForm'
import { ChannelsConfigForm } from './forms/ChannelsConfigForm'
import { RuntimeConfigForm } from './forms/RuntimeConfigForm'
import { NetworkConfigForm } from './forms/NetworkConfigForm'
import { AdvancedConfigForm } from './forms/AdvancedConfigForm'
import { PlaceholderForm } from './forms/PlaceholderForm'

interface ConfigContentProps {
  category: ConfigCategory
  config: ZeroClawConfig | null
  onChange: (updates: Partial<ZeroClawConfig>) => void
  errors: Record<string, string | undefined>
  disabled?: boolean
}

export function ConfigContent({
  category,
  config,
  onChange,
  errors,
  disabled = false
}: ConfigContentProps) {
  if (!config) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">加载配置中...</p>
      </div>
    )
  }

  const renderForm = () => {
    switch (category) {
      case 'basic':
        return (
          <BasicConfigForm
            config={config}
            onChange={onChange}
            errors={errors}
            disabled={disabled}
          />
        )

      case 'network':
        return (
          <NetworkConfigForm
            config={config}
            onChange={onChange}
            errors={errors}
            disabled={disabled}
          />
        )

      case 'security':
        return (
          <SecurityConfigForm
            config={config}
            onChange={onChange}
            errors={errors}
            disabled={disabled}
          />
        )

      case 'channels':
        return (
          <ChannelsConfigForm
            config={config}
            onChange={onChange}
            errors={errors}
            disabled={disabled}
          />
        )

      case 'runtime':
        return (
          <RuntimeConfigForm
            config={config}
            onChange={onChange}
            errors={errors}
            disabled={disabled}
          />
        )

      case 'advanced':
        return (
          <AdvancedConfigForm
            config={config}
            onChange={onChange}
            errors={errors}
            disabled={disabled}
          />
        )

      default:
        return (
          <PlaceholderForm
            config={config}
            onChange={onChange}
            errors={errors}
            disabled={disabled}
            categoryName="未知类别"
            description="此配置类别尚未实现"
          />
        )
    }
  }

  return (
    <div className={disabled ? 'opacity-50 pointer-events-none' : ''}>
      {renderForm()}
    </div>
  )
}
