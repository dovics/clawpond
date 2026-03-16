// src/components/ConfigEditor/forms/NetworkConfigForm.tsx
'use client'

import { DynamicForm } from '../DynamicForm'
import { preprocessSchema, ResolvedSchemaNode } from '@/lib/config/schema/preprocessor'
import configSchema from '@/../../public/config.schema.json'
import { ConfigCategoryFormProps } from '../types'

export function NetworkConfigForm({ config, onChange, errors, disabled }: ConfigCategoryFormProps) {
  const resolvedSchema = preprocessSchema(configSchema)

  // Network category fields
  const networkFields = ['web_search', 'web_fetch']
  const networkSchema: { type: 'object'; properties: Record<string, ResolvedSchemaNode> } = {
    type: 'object',
    properties: {}
  }

  networkFields.forEach(field => {
    if (resolvedSchema.properties && resolvedSchema.properties[field]) {
      networkSchema.properties[field] = resolvedSchema.properties[field]
    }
  })

  const handleChange = (updates: Record<string, any>) => {
    onChange(updates)
  }
  return (
    <DynamicForm
      schema={networkSchema}
      value={config || {}}
      onChange={handleChange}
      disabled={disabled}
    />
  )
}
