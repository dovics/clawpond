// src/components/ConfigEditor/SensitiveField.tsx
'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff, Copy } from 'lucide-react'
import { useToast } from '@/components/ui/toaster'

interface SensitiveFieldProps {
  fieldPath: string
  value: string
  onChange: (value: string) => void
  label: string
  placeholder?: string
  disabled?: boolean
}

export function SensitiveField({
  fieldPath,
  value,
  onChange,
  label,
  placeholder = '••••••••',
  disabled = false
}: SensitiveFieldProps) {
  const [visible, setVisible] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const { toast } = useToast()

  const handleCopy = async () => {
    if (!value) return

    try {
      await navigator.clipboard.writeText(value)
      toast({
        title: '已复制',
        description: '已复制到剪贴板'
      })
    } catch (error) {
      toast({
        title: '复制失败',
        description: '无法复制到剪贴板',
        variant: 'destructive'
      })
    }
  }

  const handleSaveEdit = () => {
    onChange(editValue)
    setEditing(false)
  }

  const handleCancelEdit = () => {
    setEditValue(value)
    setEditing(false)
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={fieldPath}>{label}</Label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            id={fieldPath}
            type={visible ? 'text' : 'password'}
            value={editing ? editValue : value}
            onChange={(e) => {
              if (editing) {
                setEditValue(e.target.value)
              } else {
                onChange(e.target.value)
              }
            }}
            placeholder={placeholder}
            disabled={disabled}
            className="pr-20"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
            {value && !editing && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setVisible(!visible)}
                  title={visible ? '隐藏' : '显示'}
                >
                  {visible ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleCopy}
                  title="复制"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        {editing ? (
          <>
            <Button
              variant="outline"
              size="icon"
              onClick={handleCancelEdit}
              title="取消"
            >
              ✕
            </Button>
            <Button
              size="icon"
              onClick={handleSaveEdit}
              title="保存"
            >
              ✓
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditing(true)}
            disabled={disabled}
          >
            编辑
          </Button>
        )}
      </div>
    </div>
  )
}
