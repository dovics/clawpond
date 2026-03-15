// src/components/ConfigEditor/ConfigTemplates.tsx
'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ConfigTemplate } from '@/types/config'

interface ConfigTemplatesProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectTemplate: (template: ConfigTemplate) => void
}

const templates: ConfigTemplate[] = [
  {
    id: 'minimal',
    name: '最小配置',
    description: '仅包含基本的提供商和模型设置',
    category: 'basic',
    config: {
      default_provider: 'openai',
      default_model: 'gpt-4',
      default_temperature: 0.7
    }
  },
  {
    id: 'balanced',
    name: '均衡配置',
    description: '适合大多数使用场景的均衡配置',
    category: 'basic',
    config: {
      default_provider: 'openai',
      default_model: 'gpt-4',
      default_temperature: 0.7,
      web_search: {
        enabled: true,
        provider: 'duckduckgo',
        max_results: 10,
        timeout_secs: 30
      },
      web_fetch: {
        enabled: true,
        max_response_size: 10,
        timeout_secs: 30
      },
      autonomy: {
        level: 'medium',
        workspace_only: true,
        max_actions_per_hour: 100,
        max_cost_per_day_cents: 500
      }
    }
  },
  {
    id: 'web-enabled',
    name: 'Web 增强配置',
    description: '启用了 Web 搜索和获取功能',
    category: 'basic',
    config: {
      default_provider: 'openai',
      default_model: 'gpt-4',
      default_temperature: 0.7,
      web_search: {
        enabled: true,
        provider: 'duckduckgo',
        max_results: 15,
        timeout_secs: 30
      },
      web_fetch: {
        enabled: true,
        max_response_size: 20,
        timeout_secs: 60
      }
    }
  },
  {
    id: 'secure',
    name: '安全配置',
    description: '严格的安全限制和沙箱设置',
    category: 'security',
    config: {
      default_provider: 'openai',
      default_model: 'gpt-4',
      default_temperature: 0.7,
      autonomy: {
        level: 'low',
        workspace_only: true,
        max_actions_per_hour: 50,
        max_cost_per_day_cents: 200,
        require_approval_for_medium_risk: true,
        block_high_risk_commands: true
      },
      security: {
        sandbox: {
          backend: 'firejail'
        },
        resources: {
          max_memory_mb: 4096,
          max_cpu_time_seconds: 300,
          max_subprocesses: 10,
          memory_monitoring: true
        },
        audit: {
          enabled: true,
          log_path: '/var/log/zeroclaw/audit.log',
          max_size_mb: 100,
          sign_events: true
        }
      }
    }
  },
  {
    id: 'performance',
    name: '性能优化配置',
    description: '优化资源使用和性能',
    category: 'performance',
    config: {
      default_provider: 'openai',
      default_model: 'gpt-4',
      default_temperature: 0.7,
      agent: {
        compact_context: true,
        max_tool_iterations: 50,
        max_history_messages: 100,
        parallel_tools: true,
        tool_dispatcher: 'auto'
      },
      memory: {
        backend: 'sqlite',
        auto_save: true,
        hygiene_enabled: true,
        archive_after_days: 30,
        purge_after_days: 90
      }
    }
  },
  {
    id: 'development',
    name: '开发环境配置',
    description: '适合开发和测试的配置',
    category: 'custom',
    config: {
      default_provider: 'openai',
      default_model: 'gpt-4',
      default_temperature: 0.7,
      autonomy: {
        level: 'high',
        workspace_only: false,
        max_actions_per_hour: 1000,
        max_cost_per_day_cents: 10000
      },
      observability: {
        backend: 'console',
        runtime_trace_mode: 'full',
        runtime_trace_max_entries: 1000
      }
    }
  }
]

export function ConfigTemplates({ open, onOpenChange, onSelectTemplate }: ConfigTemplatesProps) {
  const handleSelectTemplate = (template: ConfigTemplate) => {
    onSelectTemplate(template)
    onOpenChange(false)
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'basic':
        return 'default'
      case 'security':
        return 'destructive'
      case 'performance':
        return 'secondary'
      case 'custom':
        return 'outline'
      default:
        return 'default'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>配置模板</DialogTitle>
          <DialogDescription>
            选择一个模板作为起点，然后根据需要自定义配置
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {templates.map((template) => (
            <Card
              key={template.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleSelectTemplate(template)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <Badge variant={getCategoryColor(template.category) as any}>
                    {template.category}
                  </Badge>
                </div>
                <CardDescription>{template.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  使用此模板
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
