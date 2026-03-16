// src/components/ConfigEditor/forms/BasicConfigForm.tsx
'use client'

import { useMemo } from 'react'
import { DynamicForm } from '../DynamicForm'
import { preprocessSchema, ResolvedSchemaNode } from '@/lib/config/schema/preprocessor'
import { getFieldUI } from '@/lib/config/schema/fieldMetadata'
import configSchema from '@/../../public/config.schema.json'
import { ConfigCategoryFormProps } from '../types'

export function BasicConfigForm({ config, onChange, errors, disabled }: ConfigCategoryFormProps) {
  const resolvedSchema = preprocessSchema(configSchema)

  // Parse custom URL from provider if in custom mode
  const currentProvider = config?.default_provider || ''
  const customUrl = useMemo(() => {
    if (currentProvider?.startsWith('custom:')) {
      return currentProvider.replace('custom:', '')
    }
    return ''
  }, [currentProvider])

  // Basic category fields - always include api_url
  const basicFields = ['default_provider', 'default_model', 'default_temperature', 'api_key', 'api_url']

  const basicSchema: { type: 'object'; properties: Record<string, ResolvedSchemaNode> } = {
    type: 'object',
    properties: {}
  }

  basicFields.forEach(field => {
    if (resolvedSchema.properties && resolvedSchema.properties[field]) {
      const fieldSchema = { ...resolvedSchema.properties[field] }

      // Add custom metadata for each field
      const uiOptions = getFieldUI(field, fieldSchema)

      // For api_url, add label metadata
      if (field === 'api_url') {
        fieldSchema.description = 'API URL'
      }

      basicSchema.properties[field] = fieldSchema
    }
  })

  // Create effective config value
  // Show custom URL in api_url field if provider is in custom:URL format
  const effectiveConfig = useMemo(() => {
    const base = config || {}

    // If api_url is already set, use it as-is
    if (base.api_url && base.api_url.trim()) {
      return base
    }

    // Otherwise, populate from provider if in custom mode
    if (customUrl) {
      return { ...base, api_url: customUrl }
    }

    return base
  }, [config, customUrl])

  // Handle change - pass through directly without modifying provider
  const handleChange = (updates: Record<string, any>) => {
    onChange(updates)
  }

  return (
    <DynamicForm
      schema={basicSchema}
      value={effectiveConfig}
      onChange={handleChange}
      disabled={disabled}
    />
  )
}
