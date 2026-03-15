'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, Plus, Trash2, GripVertical } from 'lucide-react'
import { FieldProps } from '../types'
import { ResolvedSchemaNode } from '@/lib/config/schema/preprocessor'
import { memo } from 'react'

export const ArrayField = memo(function ArrayField({
  schema,
  value = [],
  onChange,
  error,
  disabled,
  path
}: FieldProps) {
  const [newItemValue, setNewItemValue] = useState('')

  const items = Array.isArray(value) ? value : []

  const handleAdd = useCallback(() => {
    if (newItemValue.trim()) {
      const updated = [...items, newItemValue.trim()]
      onChange(updated, undefined)
      setNewItemValue('')
    }
  }, [items, newItemValue, onChange])

  const handleRemove = useCallback((index: number) => {
    const updated = items.filter((_, i) => i !== index)
    onChange(updated, undefined)
  }, [items, onChange])

  const handleUpdate = useCallback((index: number, newValue: string) => {
    const updated = [...items]
    updated[index] = newValue
    onChange(updated, undefined)
  }, [items, onChange])

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }, [handleAdd])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className={error ? 'text-destructive' : ''}>
          {schema.description || path}
          {schema.nullable === false && <span className="text-destructive ml-1">*</span>}
        </Label>
        <span className="text-sm text-muted-foreground">{items.length} 项</span>
      </div>

      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex gap-2 items-center group">
            <div className="flex-shrink-0 cursor-grab opacity-50 group-hover:opacity-100">
              <GripVertical className="h-4 w-4" />
            </div>
            <Input
              value={item}
              onChange={(e) => handleUpdate(index, e.target.value)}
              disabled={disabled}
              className={error ? 'border-destructive' : ''}
              placeholder={`项目 ${index + 1}`}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleRemove(index)}
              disabled={disabled}
              className="flex-shrink-0"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          value={newItemValue}
          onChange={(e) => setNewItemValue(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={disabled}
          placeholder="添加新项目..."
          className="flex-1"
        />
        <Button
          onClick={handleAdd}
          disabled={disabled || !newItemValue.trim()}
          type="button"
        >
          <Plus className="h-4 w-4 mr-2" />
          添加
        </Button>
      </div>

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