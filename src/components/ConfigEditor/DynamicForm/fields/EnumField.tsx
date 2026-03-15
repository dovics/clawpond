'use client'

import { Label } from '@/components/ui/label'
import { AlertCircle } from 'lucide-react'
import { FieldProps } from '../types'
import { ResolvedSchemaNode } from '@/lib/config/schema/preprocessor'
import { getFieldUI } from '@/lib/config/schema/fieldMetadata'
import { memo } from 'react'

export const EnumField = memo(function EnumField({
  schema,
  value,
  onChange,
  error,
  disabled,
  path
}: FieldProps) {
  const uiOptions = getFieldUI(path, schema)
  const customOptions = uiOptions.options || {}
  const enumValues = schema.enum || []
  const hasEnums = enumValues.length > 0

  if (!hasEnums) {
    return (
      <div className="text-sm text-destructive">
        No enum values defined for {path}
      </div>
    )
  }

  const handleChange = (newValue: string) => {
    onChange(newValue, undefined)
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={path} className={error ? 'text-destructive' : ''}>
        {uiOptions.label || schema.description || path}
        {schema.nullable === false && <span className="text-destructive ml-1">*</span>}
      </Label>

      <select
        id={path}
        value={value ?? schema.default ?? ''}
        onChange={(e) => handleChange(e.target.value)}
        disabled={disabled}
        className={`
          w-full px-3 py-2 rounded-md border bg-background
          focus:outline-none focus:ring-2 focus:ring-ring
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error ? 'border-destructive' : 'border-input'}
        `}
      >
        {schema.nullable !== false && (
          <option value="">-- 选择 --</option>
        )}
        {enumValues.map((enumValue) => (
          <option key={String(enumValue)} value={String(enumValue)}>
            {customOptions[String(enumValue)] || getEnumLabel(enumValue)}
          </option>
        ))}
      </select>

      {error && (
        <div className="flex items-center gap-2 text-destructive text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {(uiOptions.description || schema.description) && !error && (
        <p className="text-sm text-muted-foreground">
          {uiOptions.description || schema.description}
        </p>
      )}
    </div>
  )
})

function getEnumLabel(value: any): string {
  // Convert enum values to human-readable labels
  if (typeof value === 'boolean') {
    return value ? '是' : '否'
  }

  // Handle snake_case -> Title Case
  if (typeof value === 'string') {
    return value
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  return String(value)
}