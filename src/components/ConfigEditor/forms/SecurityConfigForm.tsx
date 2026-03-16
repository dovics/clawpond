// src/components/ConfigEditor/forms/SecurityConfigForm.tsx
'use client'

import { DynamicForm } from '../DynamicForm'
import { preprocessSchema, ResolvedSchemaNode } from '@/lib/config/schema/preprocessor'
import configSchema from '@/../../public/config.schema.json'
import { ConfigCategoryFormProps } from '../types'

export function SecurityConfigForm({ config, onChange, errors, disabled }: ConfigCategoryFormProps) {
  const resolvedSchema = preprocessSchema(configSchema)

  // Security category fields
  const securityFields = ['autonomy', 'security']
  const securitySchema: { type: 'object'; properties: Record<string, ResolvedSchemaNode> } = {
    type: 'object',
    properties: {}
  }

  securityFields.forEach(field => {
    if (resolvedSchema.properties && resolvedSchema.properties[field]) {
      securitySchema.properties[field] = resolvedSchema.properties[field]
    }
  })

  const handleChange = (updates: Record<string, any>) => {
    onChange(updates)
  }

  return (
    <DynamicForm
      schema={securitySchema}
      value={config || {}}
      onChange={handleChange}
      disabled={disabled}
    />
  )
}