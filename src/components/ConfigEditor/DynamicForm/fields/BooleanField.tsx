'use client'

import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { FieldProps } from '../types'
import { memo } from 'react'

export const BooleanField = memo(function BooleanField({
  schema,
  value,
  onChange,
  disabled,
  path
}: FieldProps) {
  const handleChange = (checked: boolean) => {
    onChange(checked)
  }

  return (
    <div className="flex items-center justify-between py-2">
      <Label htmlFor={path} className="cursor-pointer">
        {schema.description || path}
      </Label>

      <Switch
        id={path}
        checked={value ?? schema.default ?? false}
        onCheckedChange={handleChange}
        disabled={disabled}
      />
    </div>
  )
})