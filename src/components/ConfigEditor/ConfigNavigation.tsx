// src/components/ConfigEditor/ConfigNavigation.tsx
'use client'

import { ConfigCategory } from '@/types/config'
import { cn } from '@/lib/utils'
import {
  Settings,
  Shield,
  MessageSquare,
  Globe,
  Zap,
  Sliders
} from 'lucide-react'

interface ConfigNavigationProps {
  currentCategory: ConfigCategory
  onCategoryChange: (category: ConfigCategory) => void
  disabled?: boolean
}

const categories: Array<{
  id: ConfigCategory
  label: string
  icon: React.ReactNode
  description: string
}> = [
  {
    id: 'basic',
    label: '基础设置',
    icon: <Settings className="h-5 w-5" />,
    description: '提供商、模型和温度'
  },
  {
    id: 'security',
    label: '安全设置',
    icon: <Shield className="h-5 w-5" />,
    description: '沙箱和权限控制'
  },
  {
    id: 'channels',
    label: '消息通道',
    icon: <MessageSquare className="h-5 w-5" />,
    description: 'Telegram、QQ 等'
  },
  {
    id: 'network',
    label: '网络设置',
    icon: <Globe className="h-5 w-5" />,
    description: 'Web 搜索和代理'
  },
  {
    id: 'runtime',
    label: '运行时',
    icon: <Zap className="h-5 w-5" />,
    description: 'Docker 和执行环境'
  },
  {
    id: 'advanced',
    label: '高级设置',
    icon: <Sliders className="h-5 w-5" />,
    description: '性能和调试选项'
  }
]

export function ConfigNavigation({
  currentCategory,
  onCategoryChange,
  disabled = false
}: ConfigNavigationProps) {
  return (
    <nav className="space-y-1">
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onCategoryChange(category.id)}
          disabled={disabled}
          className={cn(
            'w-full flex items-start gap-3 px-4 py-3 text-left rounded-lg transition-colors',
            'hover:bg-accent hover:text-accent-foreground',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            currentCategory === category.id
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <div className={cn(
            'mt-0.5',
            currentCategory === category.id
              ? 'text-primary'
              : 'text-muted-foreground'
          )}>
            {category.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium">{category.label}</div>
            <div className="text-sm text-muted-foreground">
              {category.description}
            </div>
          </div>
        </button>
      ))}
    </nav>
  )
}
