'use client'

import { useState, useCallback } from 'react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Label } from '@/components/ui/label'
import { ChevronRight } from 'lucide-react'
import { FieldProps } from '../types'
import { ResolvedSchemaNode } from '@/lib/config/schema/preprocessor'
import { FieldRenderer } from '../FieldRenderer'
import { memo } from 'react'

export const ObjectField = memo(function ObjectField({
  schema,
  value,
  onChange,
  error,
  disabled,
  path
}: FieldProps) {
  const [isOpen, setIsOpen] = useState(true)
  const properties = schema.properties || {}
  const propertyKeys = Object.keys(properties)

  if (propertyKeys.length === 0) {
    return (
      <div className="text-sm text-muted-foreground p-2">
        {schema.description || path}: (空对象)
      </div>
    )
  }

  const handleFieldChange = useCallback((fieldPath: string, fieldValue: any, fieldError?: string) => {
    const updated = {
      ...(value || {}),
      [fieldPath]: fieldValue
    }
    onChange(updated, fieldError)
  }, [value, onChange])

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border rounded-lg">
      <CollapsibleTrigger className="flex w-full items-center justify-between p-4 hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-2">
          <ChevronRight className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
          <Label className="cursor-pointer font-medium">
            {schema.description || path}
          </Label>
          {schema.nullable === false && <span className="text-destructive">*</span>}
        </div>
        <span className="text-sm text-muted-foreground">{propertyKeys.length} 个字段</span>
      </CollapsibleTrigger>

      <CollapsibleContent className="px-4 pb-4">
        <div className="pt-4 space-y-4 pl-4 border-l-2 border-muted">
          {Object.entries(properties).map(([key, fieldSchema]) => {
            const fieldValue = value?.[key]
            const fieldPath = `${path}.${key}`

            return (
              <div key={fieldPath} className="space-y-2">
                <FieldRenderer
                  schema={fieldSchema as ResolvedSchemaNode}
                  value={fieldValue}
                  onChange={(v, e) => handleFieldChange(key, v, e)}
                  error={undefined}
                  disabled={disabled}
                  path={fieldPath}
                />
              </div>
            )
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
})