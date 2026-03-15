// src/components/ConfigEditor/ConfigPreview.tsx
'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Copy, Download } from 'lucide-react'
import { useToast } from '@/components/ui/toaster'
import { ZeroClawConfig } from '@/types'

interface ConfigPreviewProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  config: ZeroClawConfig | null
}

export function ConfigPreview({ open, onOpenChange, config }: ConfigPreviewProps) {
  const [tomlContent, setTomlContent] = useState('')
  const { toast } = useToast()

  useEffect(() => {
    if (config) {
      // Convert config to TOML-like format
      const toml = configToToml(config)
      setTomlContent(toml)
    }
  }, [config])

  const configToToml = (config: ZeroClawConfig): string => {
    let toml = ''

    // Basic settings
    if (config.default_provider) {
      toml += `default_provider = "${config.default_provider}"\n`
    }
    if (config.default_model) {
      toml += `default_model = "${config.default_model}"\n`
    }
    if (config.default_temperature !== undefined) {
      toml += `default_temperature = ${config.default_temperature}\n`
    }

    // Web search
    if (config.web_search) {
      toml += '\n[web_search]\n'
      if (config.web_search.enabled !== undefined) {
        toml += `enabled = ${config.web_search.enabled}\n`
      }
      if (config.web_search.provider) {
        toml += `provider = "${config.web_search.provider}"\n`
      }
      if (config.web_search.brave_api_key) {
        toml += `brave_api_key = "${config.web_search.brave_api_key}"\n`
      }
      if (config.web_search.max_results !== undefined) {
        toml += `max_results = ${config.web_search.max_results}\n`
      }
      if (config.web_search.timeout_secs !== undefined) {
        toml += `timeout_secs = ${config.web_search.timeout_secs}\n`
      }
    }

    // Web fetch
    if (config.web_fetch) {
      toml += '\n[web_fetch]\n'
      if (config.web_fetch.enabled !== undefined) {
        toml += `enabled = ${config.web_fetch.enabled}\n`
      }
      if (config.web_fetch.max_response_size !== undefined) {
        toml += `max_response_size = ${config.web_fetch.max_response_size}\n`
      }
      if (config.web_fetch.timeout_secs !== undefined) {
        toml += `timeout_secs = ${config.web_fetch.timeout_secs}\n`
      }
    }

    // Autonomy
    if (config.autonomy) {
      toml += '\n[autonomy]\n'
      if (config.autonomy.level) {
        toml += `level = "${config.autonomy.level}"\n`
      }
      if (config.autonomy.workspace_only !== undefined) {
        toml += `workspace_only = ${config.autonomy.workspace_only}\n`
      }
      if (config.autonomy.max_actions_per_hour) {
        toml += `max_actions_per_hour = ${config.autonomy.max_actions_per_hour}\n`
      }
      if (config.autonomy.max_cost_per_day_cents) {
        toml += `max_cost_per_day_cents = ${config.autonomy.max_cost_per_day_cents}\n`
      }
    }

    // Security
    if (config.security) {
      toml += '\n[security]\n'

      if (config.security.sandbox) {
        toml += '\n[security.sandbox]\n'
        if (config.security.sandbox.backend) {
          toml += `backend = "${config.security.sandbox.backend}"\n`
        }
      }

      if (config.security.resources) {
        toml += '\n[security.resources]\n'
        if (config.security.resources.max_memory_mb) {
          toml += `max_memory_mb = ${config.security.resources.max_memory_mb}\n`
        }
        if (config.security.resources.max_cpu_time_seconds) {
          toml += `max_cpu_time_seconds = ${config.security.resources.max_cpu_time_seconds}\n`
        }
      }
    }

    // Runtime
    if (config.runtime) {
      toml += '\n[runtime]\n'
      if (config.runtime.kind) {
        toml += `kind = "${config.runtime.kind}"\n`
      }

      if (config.runtime.docker) {
        toml += '\n[runtime.docker]\n'
        if (config.runtime.docker.image) {
          toml += `image = "${config.runtime.docker.image}"\n`
        }
        if (config.runtime.docker.network) {
          toml += `network = "${config.runtime.docker.network}"\n`
        }
        if (config.runtime.docker.memory_limit_mb) {
          toml += `memory_limit_mb = ${config.runtime.docker.memory_limit_mb}\n`
        }
        if (config.runtime.docker.cpu_limit) {
          toml += `cpu_limit = ${config.runtime.docker.cpu_limit}\n`
        }
      }
    }

    return toml
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(tomlContent)
      toast({
        title: '已复制',
        description: 'TOML 配置已复制到剪贴板'
      })
    } catch (error) {
      toast({
        title: '复制失败',
        description: '无法复制到剪贴板',
        variant: 'destructive'
      })
    }
  }

  const handleDownload = () => {
    const blob = new Blob([tomlContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'zeroclaw-config.toml'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: '已下载',
      description: '配置文件已下载'
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>配置预览 (TOML)</DialogTitle>
          <DialogDescription>
            这是当前配置的 TOML 格式预览。您可以直接复制或下载。
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          <Button onClick={handleCopy} variant="outline" size="sm">
            <Copy className="h-4 w-4 mr-2" />
            复制
          </Button>
          <Button onClick={handleDownload} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            下载
          </Button>
        </div>

        <Textarea
          value={tomlContent}
          readOnly
          className="font-mono text-sm h-[500px] resize-none"
        />
      </DialogContent>
    </Dialog>
  )
}
