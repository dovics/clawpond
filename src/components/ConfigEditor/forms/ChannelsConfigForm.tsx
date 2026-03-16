// src/components/ConfigEditor/forms/ChannelsConfigForm.tsx
'use client'

import { preprocessSchema, ResolvedSchemaNode } from '@/lib/config/schema/preprocessor'
import configSchema from '@/../../public/config.schema.json'
import { TabbedObjectField } from '../DynamicForm/fields/TabbedObjectField'
import { ConfigCategoryFormProps } from '../types'

// Only show these channels
const ALLOWED_CHANNELS = ['telegram', 'qq', 'discord', 'slack', 'feishu']

export function ChannelsConfigForm({ config, onChange, errors, disabled }: ConfigCategoryFormProps) {
  const resolvedSchema = preprocessSchema(configSchema)
  const channelsSchema = resolvedSchema.properties?.channels_config as ResolvedSchemaNode | undefined

  const handleChange = (value: any) => {
    onChange({ channels_config: value })
  }

  if (!channelsSchema || !channelsSchema.properties) {
    return <div className="text-muted-foreground">加载中...</div>
  }

  // Filter to only show allowed channels
  const filteredProperties: Record<string, ResolvedSchemaNode> = {}
  for (const [key, value] of Object.entries(channelsSchema.properties)) {
    if (ALLOWED_CHANNELS.includes(key)) {
      filteredProperties[key] = value
    }
  }

  const filteredSchema: ResolvedSchemaNode = {
    ...channelsSchema,
    properties: filteredProperties
  }

  return (
    <TabbedObjectField
      schema={filteredSchema}
      value={config?.channels_config || {}}
      onChange={handleChange}
      disabled={disabled}
      path="channels_config"
    />
  )
}