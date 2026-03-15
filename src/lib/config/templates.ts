// src/lib/config/templates.ts
import { ConfigTemplate } from '@/types/config'

export const presetTemplates: ConfigTemplate[] = [
  {
    id: 'basic-minimal',
    name: '基础配置',
    description: '适用于简单使用场景的基础配置',
    category: 'basic',
    config: {
      default_provider: 'openrouter',
      default_model: 'anthropic/claude-3-5-sonnet',
      default_temperature: 0.7
    }
  },
  {
    id: 'network-enabled',
    name: '网络功能启用',
    description: '启用网络搜索和网页抓取',
    category: 'basic',
    config: {
      web_search: {
        enabled: true,
        provider: 'duckduckgo',
        max_results: 10,
        timeout_secs: 30
      },
      web_fetch: {
        enabled: true,
        max_response_size: 1048576,
        timeout_secs: 60
      }
    }
  },
  {
    id: 'security-strict',
    name: '严格安全',
    description: '启用安全限制的配置',
    category: 'security',
    config: {
      autonomy: {
        level: 'low',
        workspace_only: true,
        block_high_risk_commands: true
      }
    }
  },
  {
    id: 'performance-optimized',
    name: '性能优化',
    description: '优化性能的配置',
    category: 'performance',
    config: {
      agent: {
        compact_context: true,
        max_history_messages: 50,
        parallel_tools: true
      }
    }
  }
]
