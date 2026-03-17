'use client'

import { useState, useCallback, useRef } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ResolvedSchemaNode } from '@/lib/config/schema/preprocessor'
import { FieldRenderer } from '../FieldRenderer'
import { memo } from 'react'

interface TabbedObjectFieldProps {
  schema: ResolvedSchemaNode
  value: Record<string, any>
  onChange: (value: any) => void
  path: string
  disabled?: boolean
}

export const TabbedObjectField = memo(function TabbedObjectField({
  schema,
  value,
  onChange,
  path,
  disabled = false
}: TabbedObjectFieldProps) {
  const [activeTab, setActiveTab] = useState('telegram')
  const switchTimes = useRef<number[]>([])

  const properties = schema.properties || {}
  const propertyKeys = Object.keys(properties)

  const handleTabChange = useCallback((newTab: string) => {
    const start = performance.now()
    setActiveTab(newTab)
    const end = performance.now()

    switchTimes.current.push(end - start)

    // Keep only last 100 measurements
    if (switchTimes.current.length > 100) {
      switchTimes.current.shift()
    }

    // Log average every 10 switches
    if (switchTimes.current.length % 10 === 0) {
      const avg = switchTimes.current.reduce((a, b) => a + b, 0) / switchTimes.current.length
      console.log(`[TabbedObjectField] Average switch time: ${avg.toFixed(2)}ms`)
    }
  }, [])

  const handleFieldChange = useCallback((fieldPath: string, fieldValue: any, fieldError?: string) => {
    // Handle nested paths like "telegram.bot_token" by creating nested objects
    const updated = { ...(value || {}) }

    // Split the path into parts
    const parts = fieldPath.split('.')

    if (parts.length === 1) {
      // Simple field - direct update
      updated[parts[0]] = fieldValue
    } else {
      // Nested field - create nested structure
      let current = updated
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i]
        if (!(part in current) || typeof current[part] !== 'object') {
          current[part] = {}
        }
        current = current[part]
      }
      current[parts[parts.length - 1]] = fieldValue
    }

    onChange(updated)
  }, [value, onChange])

  if (propertyKeys.length === 0) {
    return <div className="text-sm text-muted-foreground">无配置项</div>
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-5 lg:grid-cols-10 h-auto p-1 gap-1 bg-transparent">
        {propertyKeys.map(key => (
          <TabsTrigger
            key={key}
            value={key}
            className="text-base font-semibold py-3 px-4 border-2 border-transparent data-[state=active]:border-red-500 data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400 rounded-lg transition-all"
          >
            {key}
          </TabsTrigger>
        ))}
      </TabsList>

      {propertyKeys.map(key => {
        const fieldSchema = properties[key]
        const fieldValue = value?.[key]

        return (
          <TabsContent key={key} value={key} className="mt-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold capitalize">{key}</h3>

              {fieldSchema.type === 'object' && fieldSchema.properties ? (
                // Nested object - render its properties
                <div className="space-y-4">
                  {Object.entries(fieldSchema.properties).map(([subKey, subSchema]) => (
                    <FieldRenderer
                      key={subKey}
                      schema={subSchema as ResolvedSchemaNode}
                      value={fieldValue?.[subKey]}
                      onChange={(v, e) => handleFieldChange(`${key}.${subKey}`, v, e)}
                      disabled={disabled}
                      path={`${path}.${key}.${subKey}`}
                    />
                  ))}
                </div>
              ) : (
                // Simple field
                <FieldRenderer
                  schema={fieldSchema}
                  value={fieldValue}
                  onChange={(v, e) => handleFieldChange(key, v, e)}
                  disabled={disabled}
                  path={`${path}.${key}`}
                />
              )}
            </div>
          </TabsContent>
        )
      })}
    </Tabs>
  )
})