'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ZeroClawConfig } from '@/types';
import * as TOML from '@iarna/toml';

interface EnvVar {
  key: string;
  value: string;
}

interface ConfigEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: ZeroClawConfig, resourceLimits?: { memoryLimit?: number; cpuLimit?: number }) => void;
  onTemplatesChange?: () => void;
  config: ZeroClawConfig;
  instanceName: string;
  containerId: string;
  memoryLimit?: number;
  cpuLimit?: number;
}

export function ConfigEditor({
  isOpen,
  onClose,
  onSave,
  onTemplatesChange,
  config,
  instanceName,
  containerId,
  memoryLimit: initialMemoryLimit,
  cpuLimit: initialCpuLimit,
}: ConfigEditorProps) {
  const [localConfig, setLocalConfig] = useState<ZeroClawConfig>(config);
  const [tomlPreview, setTomlPreview] = useState('');
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [providerType, setProviderType] = useState('openrouter');
  const [baseUrl, setBaseUrl] = useState('');
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [proxyEnabled, setProxyEnabled] = useState(false);
  const [noProxyList, setNoProxyList] = useState<string[]>([]);
  const [proxyServices, setProxyServices] = useState<string[]>([]);
  const [memoryLimit, setMemoryLimit] = useState(initialMemoryLimit || 500);
  const [cpuLimit, setCpuLimit] = useState(initialCpuLimit || 0.5);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);

  useEffect(() => {
    const loadConfigAndEnv = async () => {
      // Parse provider from config
      const providerValue = config.default_provider || 'openrouter';
      let parsedProviderType = 'openrouter';
      let parsedBaseUrl = '';

      if (providerValue.startsWith('custom:')) {
        parsedProviderType = 'openai-compatible';
        parsedBaseUrl = providerValue.replace('custom:', '');
      } else if (providerValue.startsWith('custom:https://') || providerValue.startsWith('custom:http://')) {
        parsedProviderType = 'openai-compatible';
        parsedBaseUrl = providerValue.replace('custom:', '');
      } else {
        parsedProviderType = providerValue;
      }

      setProviderType(parsedProviderType);
      setBaseUrl(parsedBaseUrl || (config as any).base_url || '');

      // Make a copy of config with normalized provider format
      const normalizedConfig = { ...config };
      if (parsedProviderType === 'openai-compatible') {
        (normalizedConfig as any).base_url = parsedBaseUrl;
      }

      // Initialize Telegram enabled state
      const telegramConfig = normalizedConfig.channels_config?.telegram;
      setTelegramEnabled(!!telegramConfig && (telegramConfig.bot_token !== undefined && telegramConfig.bot_token !== ''));

      // Initialize Proxy state
      const proxyConfig = normalizedConfig.proxy;
      setProxyEnabled(proxyConfig?.enabled || false);
      setNoProxyList(proxyConfig?.no_proxy || []);
      setProxyServices(proxyConfig?.services || []);

      setLocalConfig(normalizedConfig);
      try {
        setTomlPreview(TOML.stringify(normalizedConfig));
      } catch (error) {
        console.error('Error converting config to TOML:', error);
      }

      // 从容器中获取环境变量
      try {
        const response = await fetch(`/api/containers/${containerId}/env`);
        if (response.ok) {
          const data = await response.json();
          const containerEnv = data.env || [];

          // 系统环境变量列表
          const systemKeys = new Set([
            'ZEROCLAW_GATEWAY_PORT',
            'ZEROCLAW_GATEWAY_HOST',
            'ZEROCLAW_ALLOW_PUBLIC_BIND',
            'ZEROCLAW_WORKSPACE',
            'PATH',
            'HOSTNAME',
            'HOME',
            'TERM',
            'SSL_CERT_FILE'
          ]);

          // 过滤出用户自定义的环境变量
          const customEnv = containerEnv.filter((envStr: string) => {
            const eqIndex = envStr.indexOf('=');
            if (eqIndex > 0) {
              const key = envStr.substring(0, eqIndex).trim();
              return !systemKeys.has(key);
            }
            return false;
          });

          const parsedEnvVars: EnvVar[] = customEnv.map(envStr => {
            const eqIndex = envStr.indexOf('=');
            if (eqIndex > 0) {
              return {
                key: envStr.substring(0, eqIndex).trim(),
                value: envStr.substring(eqIndex + 1).trim(),
              };
            }
            return { key: envStr, value: '' };
          });
          setEnvVars(parsedEnvVars.length > 0 ? parsedEnvVars : [{ key: '', value: '' }]);
        } else {
          // 如果获取失败，从配置文件加载
          const existingEnv = normalizedConfig.runtime?.docker?.env || [];
          const parsedEnvVars: EnvVar[] = existingEnv.map(envStr => {
            const eqIndex = envStr.indexOf('=');
            if (eqIndex > 0) {
              return {
                key: envStr.substring(0, eqIndex).trim(),
                value: envStr.substring(eqIndex + 1).trim(),
              };
            }
            return { key: envStr, value: '' };
          });
          setEnvVars(parsedEnvVars.length > 0 ? parsedEnvVars : [{ key: '', value: '' }]);
        }
      } catch (error) {
        console.error('Error loading container env:', error);
        // 如果获取失败，从配置文件加载
        const existingEnv = normalizedConfig.runtime?.docker?.env || [];
        const parsedEnvVars: EnvVar[] = existingEnv.map(envStr => {
          const eqIndex = envStr.indexOf('=');
          if (eqIndex > 0) {
            return {
              key: envStr.substring(0, eqIndex).trim(),
              value: envStr.substring(eqIndex + 1).trim(),
            };
          }
          return { key: envStr, value: '' };
        });
        setEnvVars(parsedEnvVars.length > 0 ? parsedEnvVars : [{ key: '', value: '' }]);
      }
    };

    loadConfigAndEnv();
  }, [config, isOpen, containerId]);

  const updateConfig = (path: string[], value: any) => {
    const newConfig = { ...localConfig };
    let current: any = newConfig;

    for (let i = 0; i < path.length - 1; i++) {
      if (!current[path[i]]) {
        current[path[i]] = {};
      }
      current = current[path[i]];
    }

    current[path[path.length - 1]] = value;
    setLocalConfig(newConfig);

    try {
      setTomlPreview(TOML.stringify(newConfig));
    } catch (error) {
      console.error('Error converting config to TOML:', error);
    }
  };

  const updateEnvVars = (newEnvVars: EnvVar[]) => {
    setEnvVars(newEnvVars);

    // 转换为配置格式并更新
    const envArray = newEnvVars
      .filter(env => env.key.trim().length > 0)
      .map(env => `${env.key.trim()}=${env.value.trim()}`);

    updateConfig(['runtime', 'docker', 'env'], envArray);
  };

  const addEnvVar = () => {
    updateEnvVars([...envVars, { key: '', value: '' }]);
  };

  const removeEnvVar = (index: number) => {
    if (envVars.length > 1) {
      const newEnvVars = envVars.filter((_, i) => i !== index);
      updateEnvVars(newEnvVars);
    }
  };

  const updateEnvVar = (index: number, field: 'key' | 'value', value: string) => {
    const newEnvVars = [...envVars];
    newEnvVars[index][field] = value;
    updateEnvVars(newEnvVars);
  };

  const handleSave = () => {
    // Validate and set minimum limits
    const finalMemoryLimit = isNaN(memoryLimit)
      ? (initialMemoryLimit || 500)
      : Math.max(50, memoryLimit); // Minimum 50MB
    const finalCpuLimit = isNaN(cpuLimit)
      ? (initialCpuLimit || 0.5)
      : Math.max(0.1, cpuLimit); // Minimum 0.1 cores
    onSave(localConfig, { memoryLimit: finalMemoryLimit, cpuLimit: finalCpuLimit });
    onClose();
  };

  const handleSaveAsTemplate = async () => {
    if (!templateName.trim()) {
      alert('Template name is required');
      return;
    }

    setSavingTemplate(true);

    try {
      // Remove gateway.port from config when saving as template
      const configToSave = { ...localConfig };
      if (configToSave.gateway) {
        const { port, ...gatewayWithoutPort } = configToSave.gateway;
        configToSave.gateway = gatewayWithoutPort;
      }

      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: templateName,
          description: templateDescription,
          config: configToSave,
          sourceInstanceId: containerId,
        }),
      });

      if (response.ok) {
        setShowTemplateDialog(false);
        setTemplateName('');
        setTemplateDescription('');
        if (onTemplatesChange) {
          onTemplatesChange();
        }
        alert('Template saved successfully!');
      } else {
        const error = await response.json();
        alert(`Failed to save template: ${error.error}`);
      }
    } catch (error) {
      console.error('Failed to save template:', error);
      alert('Failed to save template');
    } finally {
      setSavingTemplate(false);
    }
  };

  const openTemplateDialog = () => {
    setTemplateName(`${instanceName} Template`);
    setTemplateDescription(`Template created from ${instanceName}`);
    setShowTemplateDialog(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-3xl max-h-[80vh] overflow-y-auto"
        style={{
          backgroundColor: '#1a1f2e',
          borderColor: 'rgba(255, 59, 48, 0.2)',
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <span style={{ color: '#ff3b30' }}>›</span>
            Configuration: {instanceName}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Modify the AI Agent configuration. Changes will be applied after restart.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-5" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
            <TabsTrigger value="general" className="data-[state=active]:text-white data-[state=active]:bg-transparent" style={{ color: '#a0a0a0' }}>General</TabsTrigger>
            <TabsTrigger value="autonomy" className="data-[state=active]:text-white data-[state=active]:bg-transparent" style={{ color: '#a0a0a0' }}>Autonomy</TabsTrigger>
            <TabsTrigger value="channels" className="data-[state=active]:text-white data-[state=active]:bg-transparent" style={{ color: '#a0a0a0' }}>Channels</TabsTrigger>
            <TabsTrigger value="security" className="data-[state=active]:text-white data-[state=active]:bg-transparent" style={{ color: '#a0a0a0' }}>Security</TabsTrigger>
            <TabsTrigger value="advanced" className="data-[state=active]:text-white data-[state=active]:bg-transparent" style={{ color: '#a0a0a0' }}>Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="provider" className="text-white">Default Provider</Label>
              <select
                id="provider"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-white"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)' }}
                value={providerType}
                onChange={(e) => {
                  setProviderType(e.target.value);
                  if (e.target.value !== 'openai-compatible') {
                    updateConfig(['default_provider'], e.target.value);
                  } else {
                    updateConfig(['default_provider'], `custom:${baseUrl}`);
                  }
                }}
              >
                <option value="openrouter">OpenRouter</option>
                <option value="anthropic">Anthropic</option>
                <option value="openai">OpenAI</option>
                <option value="google">Google</option>
                <option value="openai-compatible">Custom (OpenAI-compatible)</option>
              </select>
            </div>

            {providerType === 'openai-compatible' && (
              <div className="space-y-2">
                <Label htmlFor="baseUrl" className="text-white">Base URL</Label>
                <Input
                  id="baseUrl"
                  value={baseUrl}
                  onChange={(e) => {
                    const newBaseUrl = e.target.value;
                    setBaseUrl(newBaseUrl);
                    updateConfig(['default_provider'], `custom:${newBaseUrl}`);
                    (localConfig as any).base_url = newBaseUrl;
                  }}
                  placeholder="https://api.example.com/v1"
                  className="text-white"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)' }}
                />
                <p className="text-xs" style={{ color: '#a0a0a0' }}>
                  Enter the base URL of your OpenAI-compatible API
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="apiKey" className="text-white">API Key (optional)</Label>
              <Input
                id="apiKey"
                type="password"
                value={(localConfig as any).api_key || ''}
                onChange={(e) => updateConfig(['api_key'], e.target.value)}
                placeholder="••••••••"
                className="text-white"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)' }}
              />
              <p className="text-xs" style={{ color: '#a0a0a0' }}>
                Leave empty to use environment variables
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="model" className="text-white">Default Model</Label>
              <Input
                id="model"
                value={localConfig.default_model || ''}
                onChange={(e) => updateConfig(['default_model'], e.target.value)}
                placeholder="anthropic/claude-sonnet-4.6"
                className="text-white"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)' }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="temperature" className="text-white">Temperature</Label>
              <Input
                id="temperature"
                type="number"
                step="0.1"
                min="0"
                max="2"
                value={localConfig.default_temperature || 0.7}
                onChange={(e) => updateConfig(['default_temperature'], parseFloat(e.target.value))}
                className="text-white"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)' }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="port" className="text-white">Gateway Port</Label>
              <Input
                id="port"
                type="number"
                value={localConfig.gateway?.port || 42617}
                onChange={(e) => updateConfig(['gateway', 'port'], parseInt(e.target.value))}
                className="text-white"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)' }}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="publicBind" className="text-white">Allow Public Bind</Label>
              <Switch
                id="publicBind"
                checked={localConfig.gateway?.allow_public_bind || false}
                onCheckedChange={(checked) => updateConfig(['gateway', 'allow_public_bind'], checked)}
              />
            </div>
          </TabsContent>

          <TabsContent value="autonomy" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="autonomyLevel" className="text-white">Autonomy Level</Label>
              <select
                id="autonomyLevel"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-white"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)' }}
                value={localConfig.autonomy?.level || 'supervised'}
                onChange={(e) => updateConfig(['autonomy', 'level'], e.target.value)}
              >
                <option value="supervised">Supervised</option>
                <option value="moderate">Moderate</option>
                <option value="autonomous">Autonomous</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="workspaceOnly" className="text-white">Workspace Only</Label>
              <Switch
                id="workspaceOnly"
                checked={localConfig.autonomy?.workspace_only !== false}
                onCheckedChange={(checked) => updateConfig(['autonomy', 'workspace_only'], checked)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxActions" className="text-white">Max Actions Per Hour</Label>
              <Input
                id="maxActions"
                type="number"
                value={localConfig.autonomy?.max_actions_per_hour || 20}
                onChange={(e) => updateConfig(['autonomy', 'max_actions_per_hour'], parseInt(e.target.value))}
                className="text-white"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)' }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxCost" className="text-white">Max Cost Per Day (cents)</Label>
              <Input
                id="maxCost"
                type="number"
                value={localConfig.autonomy?.max_cost_per_day_cents || 500}
                onChange={(e) => updateConfig(['autonomy', 'max_cost_per_day_cents'], parseInt(e.target.value))}
                className="text-white"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)' }}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="approvalMedium" className="text-white">Require Approval for Medium Risk</Label>
              <Switch
                id="approvalMedium"
                checked={localConfig.autonomy?.require_approval_for_medium_risk !== false}
                onCheckedChange={(checked) => updateConfig(['autonomy', 'require_approval_for_medium_risk'], checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="blockHighRisk" className="text-white">Block High Risk Commands</Label>
              <Switch
                id="blockHighRisk"
                checked={localConfig.autonomy?.block_high_risk_commands !== false}
                onCheckedChange={(checked) => updateConfig(['autonomy', 'block_high_risk_commands'], checked)}
              />
            </div>
          </TabsContent>

          <TabsContent value="channels" className="space-y-4 mt-4">
            {/* Telegram Channel Configuration */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-md" style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <div>
                  <h3 className="text-white font-medium">Telegram Channel</h3>
                  <p className="text-xs" style={{ color: '#a0a0a0' }}>Enable Telegram bot integration</p>
                </div>
                <Switch
                  id="telegramEnabled"
                  checked={telegramEnabled}
                  onCheckedChange={(checked) => {
                    setTelegramEnabled(checked);
                    if (checked) {
                      updateConfig(['channels_config', 'telegram', 'bot_token'], '');
                    } else {
                      updateConfig(['channels_config', 'telegram'], {});
                    }
                  }}
                />
              </div>

              {telegramEnabled && (
                <div className="space-y-3 pl-4">
                  <div className="space-y-2">
                    <Label htmlFor="telegramBotToken" className="text-white">Bot Token</Label>
                    <Input
                      id="telegramBotToken"
                      type="password"
                      value={localConfig.channels_config?.telegram?.bot_token || ''}
                      onChange={(e) => updateConfig(['channels_config', 'telegram', 'bot_token'], e.target.value)}
                      placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                      className="text-white"
                      style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)' }}
                    />
                    <p className="text-xs" style={{ color: '#a0a0a0' }}>
                      Get your bot token from @BotFather on Telegram
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telegramAllowedUsers" className="text-white">Allowed Users</Label>
                    <Input
                      id="telegramAllowedUsers"
                      value={localConfig.channels_config?.telegram?.allowed_users?.join(', ') || '*'}
                      onChange={(e) => {
                        const users = e.target.value.split(',').map(u => u.trim()).filter(u => u.length > 0);
                        updateConfig(['channels_config', 'telegram', 'allowed_users'], users.length > 0 ? users : ['*']);
                      }}
                      placeholder="* or username1, username2, 123456789"
                      className="text-white"
                      style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)' }}
                    />
                    <p className="text-xs" style={{ color: '#a0a0a0' }}>
                      Comma-separated list of usernames or user IDs. Use * to allow all users.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telegramStreamMode" className="text-white">Stream Mode</Label>
                    <select
                      id="telegramStreamMode"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-white"
                      style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)' }}
                      value={localConfig.channels_config?.telegram?.stream_mode || 'off'}
                      onChange={(e) => updateConfig(['channels_config', 'telegram', 'stream_mode'], e.target.value)}
                    >
                      <option value="off">Off</option>
                      <option value="partial">Partial</option>
                    </select>
                    <p className="text-xs" style={{ color: '#a0a0a0' }}>
                      Off: no streaming, Partial: edit messages in-place with updates
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telegramDraftInterval" className="text-white">Draft Update Interval (ms)</Label>
                    <Input
                      id="telegramDraftInterval"
                      type="number"
                      value={localConfig.channels_config?.telegram?.draft_update_interval_ms || 1000}
                      onChange={(e) => updateConfig(['channels_config', 'telegram', 'draft_update_interval_ms'], parseInt(e.target.value))}
                      className="text-white"
                      style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)' }}
                    />
                    <p className="text-xs" style={{ color: '#a0a0a0' }}>
                      Edit throttle for partial streaming (default: 1000ms)
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="telegramMentionOnly" className="text-white">Mention Only</Label>
                      <p className="text-xs" style={{ color: '#a0a0a0' }}>
                        Only respond to mentions in groups
                      </p>
                    </div>
                    <Switch
                      id="telegramMentionOnly"
                      checked={localConfig.channels_config?.telegram?.mention_only || false}
                      onCheckedChange={(checked) => updateConfig(['channels_config', 'telegram', 'mention_only'], checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="telegramInterrupt" className="text-white">Interrupt on New Message</Label>
                      <p className="text-xs" style={{ color: '#a0a0a0' }}>
                        Cancel in-flight requests on new message
                      </p>
                    </div>
                    <Switch
                      id="telegramInterrupt"
                      checked={localConfig.channels_config?.telegram?.interrupt_on_new_message || false}
                      onCheckedChange={(checked) => updateConfig(['channels_config', 'telegram', 'interrupt_on_new_message'], checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="telegramAckEnabled" className="text-white">Acknowledgment Reactions</Label>
                      <p className="text-xs" style={{ color: '#a0a0a0' }}>
                        Send emoji reaction acknowledgments
                      </p>
                    </div>
                    <Switch
                      id="telegramAckEnabled"
                      checked={localConfig.channels_config?.telegram?.ack_enabled !== false}
                      onCheckedChange={(checked) => updateConfig(['channels_config', 'telegram', 'ack_enabled'], checked)}
                    />
                  </div>

                  {/* Group Reply Settings */}
                  <div className="space-y-3 pt-3 border-t" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                    <h4 className="text-sm font-medium text-white">Group Reply Settings</h4>

                    <div className="space-y-2">
                      <Label htmlFor="groupReplyMode" className="text-white">Reply Mode</Label>
                      <select
                        id="groupReplyMode"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-white"
                        style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)' }}
                        value={localConfig.channels_config?.telegram?.group_reply?.mode || 'all_messages'}
                        onChange={(e) => updateConfig(['channels_config', 'telegram', 'group_reply', 'mode'], e.target.value)}
                      >
                        <option value="all_messages">All Messages</option>
                        <option value="mention_only">Mention Only</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="groupReplyAllowedSenders" className="text-white">Allowed Sender IDs</Label>
                      <Input
                        id="groupReplyAllowedSenders"
                        value={localConfig.channels_config?.telegram?.group_reply?.allowed_sender_ids?.join(', ') || ''}
                        onChange={(e) => {
                          const ids = e.target.value.split(',').map(id => id.trim()).filter(id => id.length > 0);
                          updateConfig(['channels_config', 'telegram', 'group_reply', 'allowed_sender_ids'], ids);
                        }}
                        placeholder="123456789, 987654321"
                        className="text-white"
                        style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)' }}
                      />
                      <p className="text-xs" style={{ color: '#a0a0a0' }}>
                        Comma-separated list of sender IDs that bypass mention gate (optional)
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* CLI Channel Settings */}
            <div className="space-y-4 pt-4 border-t" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
              <h3 className="text-white font-medium">CLI Channel Settings</h3>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="cliEnabled" className="text-white">CLI Enabled</Label>
                  <p className="text-xs" style={{ color: '#a0a0a0' }}>
                    Enable CLI channel interface
                  </p>
                </div>
                <Switch
                  id="cliEnabled"
                  checked={localConfig.channels_config?.cli !== false}
                  onCheckedChange={(checked) => updateConfig(['channels_config', 'cli'], checked)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="messageTimeout" className="text-white">Message Timeout (seconds)</Label>
                <Input
                  id="messageTimeout"
                  type="number"
                  value={localConfig.channels_config?.message_timeout_secs || 300}
                  onChange={(e) => updateConfig(['channels_config', 'message_timeout_secs'], parseInt(e.target.value))}
                  className="text-white"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)' }}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="security" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="maxMemory" className="text-white">Max Memory (MB)</Label>
              <Input
                id="maxMemory"
                type="number"
                value={localConfig.security?.resources?.max_memory_mb || 512}
                onChange={(e) => updateConfig(['security', 'resources', 'max_memory_mb'], parseInt(e.target.value))}
                className="text-white"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)' }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxCpuTime" className="text-white">Max CPU Time (seconds)</Label>
              <Input
                id="maxCpuTime"
                type="number"
                value={localConfig.security?.resources?.max_cpu_time_seconds || 60}
                onChange={(e) => updateConfig(['security', 'resources', 'max_cpu_time_seconds'], parseInt(e.target.value))}
                className="text-white"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)' }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxSubprocesses" className="text-white">Max Subprocesses</Label>
              <Input
                id="maxSubprocesses"
                type="number"
                value={localConfig.security?.resources?.max_subprocesses || 10}
                onChange={(e) => updateConfig(['security', 'resources', 'max_subprocesses'], parseInt(e.target.value))}
                className="text-white"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)' }}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="memoryMonitoring" className="text-white">Memory Monitoring</Label>
              <Switch
                id="memoryMonitoring"
                checked={localConfig.security?.resources?.memory_monitoring !== false}
                onCheckedChange={(checked) => updateConfig(['security', 'resources', 'memory_monitoring'], checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="auditEnabled" className="text-white">Audit Logging</Label>
              <Switch
                id="auditEnabled"
                checked={localConfig.security?.audit?.enabled !== false}
                onCheckedChange={(checked) => updateConfig(['security', 'audit', 'enabled'], checked)}
              />
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="memoryBackend" className="text-white">Memory Backend</Label>
              <select
                id="memoryBackend"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-white"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)' }}
                value={localConfig.memory?.backend || 'sqlite'}
                onChange={(e) => updateConfig(['memory', 'backend'], e.target.value)}
              >
                <option value="sqlite">SQLite</option>
                <option value="postgres">PostgreSQL</option>
                <option value="mysql">MySQL</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="autoSave" className="text-white">Auto Save Memory</Label>
              <Switch
                id="autoSave"
                checked={localConfig.memory?.auto_save !== false}
                onCheckedChange={(checked) => updateConfig(['memory', 'auto_save'], checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="hygieneEnabled" className="text-white">Memory Hygiene</Label>
              <Switch
                id="hygieneEnabled"
                checked={localConfig.memory?.hygiene_enabled !== false}
                onCheckedChange={(checked) => updateConfig(['memory', 'hygiene_enabled'], checked)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="archiveDays" className="text-white">Archive After (days)</Label>
              <Input
                id="archiveDays"
                type="number"
                value={localConfig.memory?.archive_after_days || 7}
                onChange={(e) => updateConfig(['memory', 'archive_after_days'], parseInt(e.target.value))}
                className="text-white"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)' }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="purgeDays" className="text-white">Purge After (days)</Label>
              <Input
                id="purgeDays"
                type="number"
                value={localConfig.memory?.purge_after_days || 30}
                onChange={(e) => updateConfig(['memory', 'purge_after_days'], parseInt(e.target.value))}
                className="text-white"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)' }}
              />
            </div>

            {/* Proxy Configuration */}
            <div className="mt-6 space-y-4 pt-4 border-t" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
              <h3 className="text-white font-medium">Proxy Configuration</h3>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="proxyEnabled" className="text-white">Enable Proxy</Label>
                  <p className="text-xs" style={{ color: '#a0a0a0' }}>
                    Enable proxy support for network requests
                  </p>
                </div>
                <Switch
                  id="proxyEnabled"
                  checked={proxyEnabled}
                  onCheckedChange={(checked) => {
                    setProxyEnabled(checked);
                    updateConfig(['proxy', 'enabled'], checked);
                  }}
                />
              </div>

              {proxyEnabled && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="proxyScope" className="text-white">Scope</Label>
                    <select
                      id="proxyScope"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-white"
                      style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)' }}
                      value={localConfig.proxy?.scope || 'zeroclaw'}
                      onChange={(e) => updateConfig(['proxy', 'scope'], e.target.value)}
                    >
                      <option value="zeroclaw">ZeroClaw (internal traffic only)</option>
                      <option value="services">Services (selected services only)</option>
                      <option value="environment">Environment (process-wide)</option>
                    </select>
                    <p className="text-xs" style={{ color: '#a0a0a0' }}>
                      zeroclaw: internal clients only | services: specific services | environment: process-wide
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="httpProxy" className="text-white">HTTP Proxy</Label>
                    <Input
                      id="httpProxy"
                      value={(localConfig.proxy as any)?.http_proxy || ''}
                      onChange={(e) => updateConfig(['proxy', 'http_proxy'], e.target.value)}
                      placeholder="http://127.0.0.1:7890"
                      className="text-white"
                      style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)' }}
                    />
                    <p className="text-xs" style={{ color: '#a0a0a0' }}>
                      HTTP proxy URL (supports http, https, socks5, socks5h)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="httpsProxy" className="text-white">HTTPS Proxy</Label>
                    <Input
                      id="httpsProxy"
                      value={(localConfig.proxy as any)?.https_proxy || ''}
                      onChange={(e) => updateConfig(['proxy', 'https_proxy'], e.target.value)}
                      placeholder="http://127.0.0.1:7890"
                      className="text-white"
                      style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)' }}
                    />
                    <p className="text-xs" style={{ color: '#a0a0a0' }}>
                      HTTPS proxy URL (optional, defaults to http_proxy)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="allProxy" className="text-white">All Proxy</Label>
                    <Input
                      id="allProxy"
                      value={(localConfig.proxy as any)?.all_proxy || ''}
                      onChange={(e) => updateConfig(['proxy', 'all_proxy'], e.target.value)}
                      placeholder="socks5h://127.0.0.1:1080"
                      className="text-white"
                      style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)' }}
                    />
                    <p className="text-xs" style={{ color: '#a0a0a0' }}>
                      Universal proxy URL for all protocols (optional)
                    </p>
                  </div>

                  {(localConfig.proxy?.scope === 'services') && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-white">Service Selectors</Label>
                          <p className="text-xs" style={{ color: '#a0a0a0' }}>
                            Select which services use the proxy (scope: services only)
                          </p>
                        </div>
                        <Button
                          type="button"
                          onClick={() => {
                            const newServices = [...proxyServices, ''];
                            setProxyServices(newServices);
                            updateConfig(['proxy', 'services'], newServices);
                          }}
                          className="text-xs px-2 py-1"
                          style={{ backgroundColor: 'rgba(255, 59, 48, 0.8)', color: 'white' }}
                        >
                          + Add
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {proxyServices.map((service, index) => (
                          <div key={index} className="flex gap-2 items-center">
                            <Input
                              placeholder="provider.openai, tool.http_request, channel.telegram"
                              value={service}
                              onChange={(e) => {
                                const newServices = [...proxyServices];
                                newServices[index] = e.target.value;
                                setProxyServices(newServices);
                                updateConfig(['proxy', 'services'], newServices);
                              }}
                              className="text-white flex-1"
                              style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)' }}
                            />
                            <Button
                              type="button"
                              onClick={() => {
                                const newServices = proxyServices.filter((_, i) => i !== index);
                                setProxyServices(newServices);
                                updateConfig(['proxy', 'services'], newServices);
                              }}
                              variant="outline"
                              className="px-2 py-1 text-red-400 border-red-900 hover:bg-red-950"
                            >
                              ✕
                            </Button>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs" style={{ color: '#a0a0a0' }}>
                        Service selectors: provider.*, tool.*, channel.* (e.g., provider.openai, provider.*)
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-white">No Proxy List</Label>
                      <Button
                        type="button"
                        onClick={() => {
                          const newList = [...noProxyList, ''];
                          setNoProxyList(newList);
                          updateConfig(['proxy', 'no_proxy'], newList);
                        }}
                        className="text-xs px-2 py-1"
                        style={{ backgroundColor: 'rgba(255, 59, 48, 0.8)', color: 'white' }}
                      >
                        + Add
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {noProxyList.map((item, index) => (
                        <div key={index} className="flex gap-2 items-center">
                          <Input
                            placeholder="localhost, 127.0.0.1, .internal"
                            value={item}
                            onChange={(e) => {
                              const newList = [...noProxyList];
                              newList[index] = e.target.value;
                              setNoProxyList(newList);
                              updateConfig(['proxy', 'no_proxy'], newList);
                            }}
                            className="text-white flex-1"
                            style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)' }}
                          />
                          <Button
                            type="button"
                            onClick={() => {
                              const newList = noProxyList.filter((_, i) => i !== index);
                              setNoProxyList(newList);
                              updateConfig(['proxy', 'no_proxy'], newList);
                            }}
                            variant="outline"
                            className="px-2 py-1 text-red-400 border-red-900 hover:bg-red-950"
                          >
                            ✕
                          </Button>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs" style={{ color: '#a0a0a0' }}>
                      Domains and IPs that bypass the proxy
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="mt-6 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-white">Docker Environment Variables</Label>
                <Button
                  type="button"
                  onClick={addEnvVar}
                  className="text-xs px-2 py-1"
                  style={{ backgroundColor: 'rgba(255, 59, 48, 0.8)', color: 'white' }}
                >
                  + Add Variable
                </Button>
              </div>
              <div className="space-y-2">
                {envVars.map((envVar, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Input
                      placeholder="KEY"
                      value={envVar.key}
                      onChange={(e) => updateEnvVar(index, 'key', e.target.value)}
                      className="text-white flex-1"
                      style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)' }}
                    />
                    <span className="text-gray-400">=</span>
                    <Input
                      placeholder="VALUE"
                      value={envVar.value}
                      onChange={(e) => updateEnvVar(index, 'value', e.target.value)}
                      className="text-white flex-1"
                      style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)' }}
                    />
                    <Button
                      type="button"
                      onClick={() => removeEnvVar(index)}
                      variant="outline"
                      className="px-2 py-1 text-red-400 border-red-900 hover:bg-red-950"
                      disabled={envVars.length === 1}
                    >
                      ✕
                    </Button>
                  </div>
                ))}
              </div>
              <p className="text-xs" style={{ color: '#a0a0a0' }}>
                Environment variables to pass to the Docker container. Click "+ Add Variable" to add more.
              </p>
            </div>

            <div className="mt-6 space-y-4">
              <div className="p-3 rounded-md" style={{ backgroundColor: 'rgba(255, 59, 48, 0.1)', border: '1px solid rgba(255, 59, 48, 0.3)' }}>
                <Label className="text-white font-semibold">Docker Resource Limits</Label>
                <p className="text-xs mt-1" style={{ color: '#a0a0a0' }}>
                  Configure CPU and memory limits for the container. Minimum values: CPU 0.1 cores, Memory 50MB. Requires container restart to apply.
                </p>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="dockerMemory" className="text-white">Memory Limit (MB)</Label>
                    <Input
                      id="dockerMemory"
                      type="number"
                      step="1"
                      value={isNaN(memoryLimit) ? '' : memoryLimit}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '') {
                          setMemoryLimit(NaN);
                        } else {
                          const parsed = parseInt(value);
                          setMemoryLimit(isNaN(parsed) ? NaN : parsed);
                        }
                      }}
                      className="text-white"
                      style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)' }}
                    />
                    <p className="text-xs" style={{ color: '#a0a0a0' }}>
                      Memory limit in megabytes (min: 50MB, recommended: 256-16384)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dockerCpu" className="text-white">CPU Limit (cores)</Label>
                    <Input
                      id="dockerCpu"
                      type="number"
                      step="0.01"
                      value={isNaN(cpuLimit) ? '' : cpuLimit}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '') {
                          setCpuLimit(NaN);
                        } else {
                          const parsed = parseFloat(value);
                          setCpuLimit(isNaN(parsed) ? NaN : parsed);
                        }
                      }}
                      className="text-white"
                      style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)' }}
                    />
                    <p className="text-xs" style={{ color: '#a0a0a0' }}>
                      CPU cores, supports decimals (min: 0.1, recommended: 0.25-16)
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <Label className="text-white">TOML Preview</Label>
              <pre
                className="mt-2 p-4 rounded-md text-xs"
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  color: '#a0a0a0',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                  width: '100%',
                  maxWidth: '100%',
                  height: '300px',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  overflowX: 'hidden'
                }}
              >
                {tomlPreview}
              </pre>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="text-gray-300 border-gray-600 hover:bg-gray-800"
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={openTemplateDialog}
            className="text-gray-300 border-gray-600 hover:bg-gray-800 mr-auto"
          >
            Save as Template
          </Button>
          <Button
            onClick={handleSave}
            style={{ backgroundColor: '#ff3b30', color: 'white' }}
          >
            Save Changes
          </Button>
        </DialogFooter>

        {/* Save as Template Dialog */}
        {showTemplateDialog && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-700">
              <h3 className="text-white text-lg font-semibold mb-4">Save as Template</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="templateName" className="text-white">Template Name</Label>
                  <Input
                    id="templateName"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="text-white mt-1"
                    placeholder="My Template"
                  />
                </div>
                <div>
                  <Label htmlFor="templateDescription" className="text-white">Description</Label>
                  <Input
                    id="templateDescription"
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                    className="text-white mt-1"
                    placeholder="Description for this template"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowTemplateDialog(false)}
                  className="text-gray-300 border-gray-600 hover:bg-gray-800 flex-1"
                  disabled={savingTemplate}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveAsTemplate}
                  disabled={savingTemplate || !templateName.trim()}
                  style={{ backgroundColor: '#ff3b30', color: 'white' }}
                  className="flex-1"
                >
                  {savingTemplate ? 'Saving...' : 'Save Template'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
