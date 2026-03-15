// src/components/ConfigEditor/forms/PlaceholderForm.tsx
'use client'

import { ConfigCategoryFormProps } from '../types'

interface PlaceholderFormProps extends ConfigCategoryFormProps {
  categoryName: string
  description?: string
}

export function PlaceholderForm({
  categoryName,
  description = '此配置类别的表单正在开发中'
}: PlaceholderFormProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-8">
      <div className="text-6xl mb-4">🚧</div>
      <h3 className="text-xl font-semibold mb-2">{categoryName}</h3>
      <p className="text-muted-foreground">{description}</p>
      <p className="text-sm text-muted-foreground mt-4">
        请使用 TOML 预览功能直接编辑配置文件
      </p>
    </div>
  )
}
