'use client'

import { ResolvedSchemaNode } from '@/lib/config/schema/preprocessor'
import { getFieldUI } from '@/lib/config/schema/fieldMetadata'
import { FieldRendererProps } from './types'
import { StringField } from './fields/StringField'
import { NumberField } from './fields/NumberField'
import { BooleanField } from './fields/BooleanField'
import { ArrayField } from './fields/ArrayField'
import { EnumField } from './fields/EnumField'
import { ObjectField } from './fields/ObjectField'
import { KeyValueField } from './fields/KeyValueField'
import { PlaceholderField } from './fields/PlaceholderField'

export function FieldRenderer({ schema, value, onChange, error, disabled, path }: FieldRendererProps) {
  const uiOptions = getFieldUI(path, schema)

  // Apply metadata overrides
  const effectiveSchema = {
    ...schema,
    ...(uiOptions.label && { description: uiOptions.label }),
    ...(uiOptions.minValue !== undefined && { minimum: uiOptions.minValue }),
    ...(uiOptions.maxValue !== undefined && { maximum: uiOptions.maxValue }),
    ...(uiOptions.step !== undefined && { multipleOf: uiOptions.step }),
    ...(uiOptions.options && { enum: Object.keys(uiOptions.options) })
  }

  // Use widget from metadata if specified
  const effectiveWidget = uiOptions.widget || getFieldType(effectiveSchema, path)

  if (uiOptions.hidden) {
    return <PlaceholderField schema={effectiveSchema} value={value} path={path} />
  }

  switch (effectiveWidget) {
    case 'enum':
    case 'select':
      return (
        <EnumField
          schema={effectiveSchema}
          value={value}
          onChange={onChange}
          error={error}
          disabled={disabled || uiOptions.disabled}
          path={path}
        />
      )

    case 'string':
      return (
        <StringField
          schema={effectiveSchema}
          value={value}
          onChange={onChange}
          error={error}
          disabled={disabled || uiOptions.disabled}
          placeholder={uiOptions.placeholder}
          path={path}
        />
      )

    case 'number':
    case 'slider':
      return (
        <NumberField
          schema={effectiveSchema}
          value={value}
          onChange={onChange}
          error={error}
          disabled={disabled || uiOptions.disabled}
          path={path}
        />
      )

    case 'boolean':
      return (
        <BooleanField
          schema={effectiveSchema}
          value={value}
          onChange={onChange}
          disabled={disabled || uiOptions.disabled}
          path={path}
        />
      )

    case 'array':
      return (
        <ArrayField
          schema={effectiveSchema}
          value={value}
          onChange={onChange}
          error={error}
          disabled={disabled || uiOptions.disabled}
          path={path}
        />
      )

    case 'object':
      return (
        <ObjectField
          schema={effectiveSchema}
          value={value}
          onChange={onChange}
          error={error}
          disabled={disabled || uiOptions.disabled}
          path={path}
        />
      )

    case 'keyValue':
      return (
        <KeyValueField
          schema={effectiveSchema}
          value={value}
          onChange={onChange}
          error={error}
          disabled={disabled || uiOptions.disabled}
          path={path}
        />
      )

    default:
      return <PlaceholderField schema={effectiveSchema} value={value} path={path} />
  }
}

function getFieldType(schema: ResolvedSchemaNode, path?: string): string | null {
  if (!schema.type) {
    return null
  }

  // Handle enum values first (before type check)
  if (schema.enum && schema.enum.length > 0) {
    return 'enum'
  }

  // Check for object type
  if (schema.type === 'object' && schema.properties) {
    return 'object'
  }

  return schema.type
}