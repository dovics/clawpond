'use client'

import { SensitiveField, isSensitiveField } from './SensitiveField'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle } from 'lucide-react'
import { FieldProps } from '../types'
import { memo } from 'react'
import { ResolvedSchemaNode } from '@/lib/config/schema/preprocessor'

export const StringField = memo(function StringField({
  schema,
  value,
  onChange,
  error,
  disabled,
  path
}: FieldProps) {
  // Skip rendering if this is an enum (handled by EnumField)
  if (schema.enum && schema.enum.length > 0) {
    return null
  }

  // Delegate to SensitiveField for sensitive paths
  if (isSensitiveField(path)) {
    return (
      <SensitiveField
        schema={schema}
        value={value}
        onChange={onChange}
        error={error}
        disabled={disabled}
        path={path}
      />
    )
  }

  const handleChange = (newValue: string) => {
    const validationError = validateString(schema, newValue)
    onChange(newValue || null, validationError)
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={path} className={error ? 'text-destructive' : ''}>
        <div className="flex items-center gap-2">
          {schema.description || path}
          {schema.nullable === false && <span className="text-destructive">*</span>}
        </div>
      </Label>

      <Input
        id={path}
        type="text"
        value={value || ''}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange(e.target.value)}
        disabled={disabled}
        className={error ? 'border-destructive' : ''}
        placeholder={schema.default || ''}
      />

      {error && (
        <div className="flex items-center gap-2 text-destructive text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {schema.description && !error && (
        <p className="text-sm text-muted-foreground">{schema.description}</p>
      )}
    </div>
  )
})

function validateString(schema: ResolvedSchemaNode, value: string): string | undefined {
  if (schema.nullable === false && !value) {
    return '此字段为必填项'
  }

  // Note: minLength is not available in ResolvedSchemaNode, removed validation

  if (schema.pattern) {
    try {
      const regex = new RegExp(schema.pattern)
      if (!regex.test(value)) {
        return '格式不正确'
      }
    } catch (e) {
      console.error('Invalid pattern:', schema.pattern)
    }
  }

  if (schema.enum && !schema.enum.includes(value)) {
    return `必须是以下值之一: ${schema.enum.join(', ')}`
  }

  return undefined
}