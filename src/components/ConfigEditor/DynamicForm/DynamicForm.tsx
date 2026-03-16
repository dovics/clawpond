'use client'

import { ResolvedSchemaNode } from '@/lib/config/schema/preprocessor'
import { FieldRenderer } from './FieldRenderer'
import { updateConfig, getByPath } from '@/lib/config/state/immer'
import { memo, useCallback } from 'react'

export interface DynamicFormProps {
  schema: ResolvedSchemaNode
  value: Record<string, any>
  onChange: (value: Record<string, any>) => void
  disabled?: boolean
  basePath?: string
  errors?: Record<string, string | undefined>
}

export const DynamicForm = memo(function DynamicForm({
  schema,
  value,
  onChange,
  disabled = false,
  basePath = ''
}: DynamicFormProps) {
  const handleChange = useCallback((fieldPath: string, fieldValue: any, fieldError?: string) => {
    const fullPath = basePath ? `${basePath}.${fieldPath}` : fieldPath
    const updated = updateConfig(value, { [fullPath]: fieldValue })
    onChange(updated)
  }, [value, onChange, basePath])

  if (!schema.properties || Object.keys(schema.properties).length === 0) {
    return (
      <div className="text-sm text-muted-foreground p-4 border rounded-dashed border-dashed">
        无配置项
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {Object.entries(schema.properties).map(([key, fieldSchema]) => {
        const fieldValue = value?.[key]
        const fieldPath = basePath ? `${basePath}.${key}` : key
        const error = undefined // TODO: Add error state management

        return (
          <div key={fieldPath} className="space-y-2">
            <FieldRenderer
              schema={fieldSchema as ResolvedSchemaNode}
              value={fieldValue}
              rootValue={value}
              onChange={(v, e) => handleChange(key, v, e)}
              error={error}
              disabled={disabled}
              path={fieldPath}
            />
          </div>
        )
      })}
    </div>
  )
})