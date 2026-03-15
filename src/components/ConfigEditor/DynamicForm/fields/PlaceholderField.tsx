'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ResolvedSchemaNode } from '@/lib/config/schema/preprocessor'

interface PlaceholderFieldProps {
  schema: ResolvedSchemaNode
  value: any
  path: string
}

export function PlaceholderField({ schema, value, path }: PlaceholderFieldProps) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline">未实现</Badge>
          <span className="text-sm">{path}</span>
          <span className="text-xs text-muted-foreground">
            (类型: {schema.type || 'unknown'})
          </span>
        </div>
        {value !== undefined && (
          <div className="mt-2 text-xs text-muted-foreground">
            当前值: {JSON.stringify(value)}
          </div>
        )}
      </CardContent>
    </Card>
  )
}