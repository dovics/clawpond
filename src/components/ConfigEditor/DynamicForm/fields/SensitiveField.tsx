'use client'

import { useState, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff, Copy, Check } from 'lucide-react'
import { FieldProps } from '../types'
import { ResolvedSchemaNode } from '@/lib/config/schema/preprocessor'
import { memo } from 'react'

export const SensitiveField = memo(function SensitiveField({
  schema,
  value,
  onChange,
  error,
  disabled,
  path
}: FieldProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [copied, setCopied] = useState(false)

  const inputType = isVisible ? 'text' : 'password'
  const displayValue = value || ''

  const handleChange = useCallback((newValue: string) => {
    onChange(newValue || null, undefined)
  }, [onChange])

  const handleCopy = useCallback(async () => {
    if (displayValue) {
      await navigator.clipboard.writeText(displayValue)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [displayValue])

  const toggleVisibility = useCallback(() => {
    setIsVisible(prev => !prev)
  }, [])

  return (
    <div className="space-y-2">
      <Label htmlFor={path} className={error ? 'text-destructive' : ''}>
        <div className="flex items-center gap-2">
          {schema.description || path}
          {schema.nullable === false && <span className="text-destructive">*</span>}
        </div>
      </Label>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            id={path}
            type={inputType}
            value={displayValue}
            onChange={(e) => handleChange(e.target.value)}
            disabled={disabled}
            className={error ? 'border-destructive pr-20' : 'pr-20'}
            placeholder={schema.default ? '••••••••' : ''}
          />

          {/* Visibility toggle */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
            onClick={toggleVisibility}
            disabled={disabled}
            tabIndex={-1}
          >
            {isVisible ? (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Eye className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>

        {/* Copy button */}
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleCopy}
          disabled={disabled || !displayValue}
          className="flex-shrink-0"
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-600" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-destructive text-sm">
          <span>{error}</span>
        </div>
      )}

      {schema.description && !error && (
        <p className="text-sm text-muted-foreground">{schema.description}</p>
      )}

      {/* Security notice */}
      {!error && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Eye className="h-3 w-3" />
          此字段包含敏感信息，请妥善保管
        </p>
      )}
    </div>
  )
})

// Helper function to detect if a field is sensitive
export function isSensitiveField(path: string): boolean {
  const sensitiveKeywords = ['key', 'secret', 'token', 'password', 'credential']
  const lowerPath = path.toLowerCase()
  return sensitiveKeywords.some(keyword => lowerPath.includes(keyword))
}