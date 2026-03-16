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

  // Get current provider value
  const currentProvider = config?.default_provider || ''

  // Determine if we should show api_url field (only for custom provider)
  const isCustomProvider = currentProvider === 'custom' || currentProvider?.startsWith('custom:')

  // Parse custom URL from provider if in custom mode
  const customUrl = useMemo(() => {
    if (currentProvider?.startsWith('custom:')) {
      return currentProvider.replace('custom:', '')
    }
    return ''
  }, [currentProvider])

  // Basic category fields - conditionally include api_url
  const basicFields = isCustomProvider
    ? ['default_provider', 'default_model', 'default_temperature', 'api_key', 'api_url']
    : ['default_provider', 'default_model', 'default_temperature', 'api_key']

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

  // Create effective config value with custom URL if in custom mode
  const effectiveConfig = useMemo(() => {
    const base = config || {}
    if (isCustomProvider) {
      return { ...base, api_url: customUrl }
    }
    return base
  }, [config, isCustomProvider, customUrl])

  const handleChange = (updates: Record<string, any>) => {
    const finalUpdates = { ...updates }

    // Handle api_url change - combine with custom prefix
    if (updates.api_url !== undefined) {
      const apiUrl = updates.api_url
      delete finalUpdates.api_url

      if (apiUrl && apiUrl.trim()) {
        // Set provider to custom:URL format
        finalUpdates.default_provider = `custom:${apiUrl.trim()}`
      } else if (currentProvider?.startsWith('custom:')) {
        // If URL is empty, reset to just 'custom'
        finalUpdates.default_provider = 'custom'
      }
    }

    // Handle provider change
    if (updates.default_provider !== undefined) {
      const newProvider = updates.default_provider
      if (newProvider === 'custom' && customUrl) {
        // If switching to custom and we have a URL, preserve it
        finalUpdates.default_provider = `custom:${customUrl}`
      } else if (newProvider !== 'custom' && currentProvider?.startsWith('custom:')) {
        // If switching away from custom, also clear api_url from config
        // This will be handled by the next render
      }
    }

    onChange(finalUpdates)
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
