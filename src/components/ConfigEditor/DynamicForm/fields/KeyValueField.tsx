'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2, Key } from 'lucide-react'
import { FieldProps } from '../types'
import { ResolvedSchemaNode } from '@/lib/config/schema/preprocessor'
import { FieldRenderer } from '../FieldRenderer'
import { memo } from 'react'

export const KeyValueField = memo(function KeyValueField({
  schema,
  value = {},
  onChange,
  error,
  disabled,
  path
}: FieldProps) {
  const [newKeyId, setNewKeyId] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  // Determine the type based on path for appropriate UI text
  const isAgents = path.startsWith('agents')
  const itemLabel = isAgents ? '代理' : '提供者'
  const placeholder = isAgents ? '代理 ID (例如: coder)' : '提供者 ID (例如: openrouter)'

  const entries = Object.entries(value || {})

  const handleRemove = useCallback((key: string) => {
    const updated = { ...value }
    delete updated[key]
    onChange(updated, undefined)
  }, [value, onChange])

  const handleAdd = useCallback(() => {
    if (newKeyId.trim() && !(newKeyId in value)) {
      const updated = { ...value }
      updated[newKeyId.trim()] = {}
      onChange(updated, undefined)
      setNewKeyId('')
      setIsAdding(false)
    }
  }, [value, newKeyId, onChange])

  const handleValueChange = useCallback((key: string, newValue: any) => {
    const updated = { ...value }
    updated[key] = newValue
    onChange(updated, undefined)
  }, [value, onChange])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className={error ? 'text-destructive' : ''}>
          {schema.description || path}
        </Label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{entries.length} 个{itemLabel}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAdding(!isAdding)}
            disabled={disabled}
          >
            <Plus className="h-4 w-4 mr-2" />
            添加
          </Button>
        </div>
      </div>

      {isAdding && (
        <Card className="border-dashed">
          <CardContent className="pt-4">
            <div className="flex gap-2 items-center">
              <Key className="h-4 w-4 text-muted-foreground" />
              <Input
                value={newKeyId}
                onChange={(e) => setNewKeyId(e.target.value)}
                placeholder={placeholder}
                onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
                disabled={disabled}
                className="flex-1"
              />
              <Button onClick={handleAdd} disabled={disabled || !newKeyId.trim()}>
                确认
              </Button>
              <Button variant="ghost" onClick={() => setIsAdding(false)}>
                取消
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {entries.map(([key, value]) => (
          <ProviderCard
            key={key}
            providerId={key}
            value={value}
            onChange={(newValue) => handleValueChange(key, newValue)}
            onRemove={() => handleRemove(key)}
            disabled={disabled}
            basePath={`${path}.${key}`}
          />
        ))}
      </div>

      {entries.length === 0 && !isAdding && (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <Key className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">还没有配置任何{itemLabel}</p>
          <p className="text-xs text-muted-foreground mt-1">点击"添加"按钮开始添加</p>
        </div>
      )}

      {error && (
        <div className="text-destructive text-sm">{error}</div>
      )}
    </div>
  )
})

interface ProviderCardProps {
  providerId: string
  value: any
  onChange: (value: any) => void
  onRemove: () => void
  disabled?: boolean
  basePath: string
}

function ProviderCard({ providerId, value, onChange, onRemove, disabled, basePath }: ProviderCardProps) {
  // Get the value schema from parent schema's additionalProperties or items
  // For model_providers, values are objects with api_key, base_url, etc.
  // For agents, values are DelegateAgentConfig objects

  // Define value schemas for different paths
  const isAgents = basePath.startsWith('agents')
  const isModelProviders = basePath.startsWith('model_providers')

  let valueSchema: ResolvedSchemaNode

  if (isAgents) {
    // DelegateAgentConfig schema
    valueSchema = {
      type: 'object',
      properties: {
        agentic: { type: 'boolean', description: '启用代理子代理模式' },
        allowed_tools: { type: 'array', description: '允许的工具列表', items: { type: 'string' } },
        api_key: { type: 'string', description: 'API 密钥覆盖' },
        max_depth: { type: 'integer', description: '最大递归深度' },
        max_iterations: { type: 'integer', description: '最大迭代次数' },
        model: { type: 'string', description: '模型名称' },
        provider: { type: 'string', description: '提供商名称' },
        system_prompt: { type: 'string', description: '系统提示词' }
      }
    }
  } else {
    // Default: model_providers schema
    valueSchema = {
      type: 'object',
      properties: {
        api_key: { type: 'string', description: 'API 密钥' },
        base_url: { type: 'string', description: '基础 URL' },
        models: { type: 'array', description: '支持的模型', items: { type: 'string' } }
      }
    }
  }

  const renderField = (key: string, schema: ResolvedSchemaNode) => {
    const fieldValue = value?.[key]
    const fieldPath = `${basePath}.${key}`

    // Skip rendering if the value is not defined and we have a simple field
    if (fieldValue === undefined && schema.type !== 'object') {
      return null
    }

    return (
      <FieldRenderer
        key={key}
        schema={schema}
        value={fieldValue}
        onChange={(v) => onChange({ ...value, [key]: v })}
        disabled={disabled}
        path={fieldPath}
      />
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Key className="h-5 w-5" />
            {providerId}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            disabled={disabled}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Object.entries(valueSchema.properties || {}).map(([key, fieldSchema]) =>
            renderField(key, fieldSchema as ResolvedSchemaNode)
          )}
        </div>
      </CardContent>
    </Card>
  )
}