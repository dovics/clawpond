// src/components/ConfigEditor/forms/AdvancedConfigForm.tsx
'use client'

import { DynamicForm } from '../DynamicForm'
import { preprocessSchema, ResolvedSchemaNode } from '@/lib/config/schema/preprocessor'
import configSchema from '@/../../public/config.schema.json'
import { ConfigCategoryFormProps } from '../types'

export function AdvancedConfigForm({ config, onChange, errors, disabled }: ConfigCategoryFormProps) {
  const resolvedSchema = preprocessSchema(configSchema)

  // Advanced category fields
  const advancedFields = [
    'auth', 'session', 'system', 'filesystem', 'llm', 'serper', 'stories',
    'agents', 'status', 'cache', 'database', 'experimental', 'server', 'debug'
  ]
  const advancedSchema: { type: 'object'; properties: Record<string, ResolvedSchemaNode> } = {
    type: 'object',
    properties: {}
  }

  advancedFields.forEach(field => {
    if (resolvedSchema.properties && resolvedSchema.properties[field]) {
      advancedSchema.properties[field] = resolvedSchema.properties[field]
    }
  })

  const handleChange = (updates: Record<string, any>) => {
    onChange(updates)
  }

  return (
    <DynamicForm
      schema={advancedSchema}
      value={config || {}}
      onChange={handleChange}
      disabled={disabled}
    />
  )
}