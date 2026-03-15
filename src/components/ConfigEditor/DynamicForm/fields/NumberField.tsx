'use client'

import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { AlertCircle } from 'lucide-react'
import { FieldProps } from '../types'
import { memo } from 'react'
import { ResolvedSchemaNode } from '@/lib/config/schema/preprocessor'

export const NumberField = memo(function NumberField({
  schema,
  value,
  onChange,
  error,
  disabled,
  path
}: FieldProps) {
  const useSlider = shouldUseSlider(schema)

  const handleChange = (newValue: number) => {
    const validationError = validateNumber(schema, newValue)
    onChange(newValue, validationError)
  }

  if (useSlider) {
    return (
      <div className="space-y-2">
        <Label htmlFor={path} className={error ? 'text-destructive' : ''}>
          {schema.description || path}: {value?.toFixed(2) || schema.default?.toFixed(2) || '0.00'}
        </Label>

        <Slider
          id={path}
          min={schema.minimum ?? 0}
          max={schema.maximum ?? 100}
          step={0.01}
          value={[value ?? schema.default ?? 0]}
          onValueChange={([newValue]) => handleChange(newValue)}
          disabled={disabled}
          className="mt-4"
        />

        {error && (
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={path} className={error ? 'text-destructive' : ''}>
        {schema.description || path}
        {schema.nullable === false && <span className="text-destructive ml-1">*</span>}
      </Label>

      <Input
        id={path}
        type="number"
        value={value ?? schema.default ?? 0}
        onChange={(e) => handleChange(parseFloat(e.target.value))}
        disabled={disabled}
        min={schema.minimum}
        max={schema.maximum}
        step={1}
        className={error ? 'border-destructive' : ''}
      />

      {error && (
        <div className="flex items-center gap-2 text-destructive text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
})

function shouldUseSlider(schema: ResolvedSchemaNode): boolean {
  if (schema.minimum !== undefined && schema.maximum !== undefined) {
    const range = schema.maximum - schema.minimum
    return range <= 100 && range > 0
  }
  return false
}

function validateNumber(schema: ResolvedSchemaNode, value: number): string | undefined {
  if (schema.nullable === false && (value === undefined || value === null)) {
    return '此字段为必填项'
  }

  if (schema.minimum !== undefined && value < schema.minimum) {
    return `最小值为 ${schema.minimum}`
  }

  if (schema.maximum !== undefined && value > schema.maximum) {
    return `最大值为 ${schema.maximum}`
  }

  return undefined
}