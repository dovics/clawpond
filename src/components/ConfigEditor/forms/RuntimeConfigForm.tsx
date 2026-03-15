// src/components/ConfigEditor/forms/RuntimeConfigForm.tsx
'use client'

import { DynamicForm } from '../DynamicForm'
import { preprocessSchema, ResolvedSchemaNode } from '@/lib/config/schema/preprocessor'
import configSchema from '@/../../docs/config.schema.json'
import { ConfigCategoryFormProps } from '../types'

export function RuntimeConfigForm({ config, onChange, errors, disabled }: ConfigCategoryFormProps) {
  const resolvedSchema = preprocessSchema(configSchema)

  // Runtime category fields
  const runtimeFields = [
    'agent', 'tools', 'model', 'prompts', 'features', 'files', 'plugins'
  ]
  const runtimeSchema: { type: 'object'; properties: Record<string, ResolvedSchemaNode> } = {
    type: 'object',
    properties: {}
  }

  runtimeFields.forEach(field => {
    if (resolvedSchema.properties && resolvedSchema.properties[field]) {
      runtimeSchema.properties[field] = resolvedSchema.properties[field]
    }
  })

  const handleChange = (updates: Record<string, any>) => {
    onChange(updates)
  }

  return (
    <DynamicForm
      schema={runtimeSchema}
      value={config || {}}
      onChange={handleChange}
      disabled={disabled}
    />
  )
}