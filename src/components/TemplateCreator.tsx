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
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { ZeroClawConfig } from '@/types';
import { api } from '@/lib/api-client';
import { useToast } from '@/components/ui/toaster';

interface TemplateCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

// 默认配置模板（镜像配置会通过 API 获取）
const DEFAULT_IMAGE = 'dovics1/zeroclaw:v0.1.7-beta.30-local-0.1.3-fea53a8';

const DEFAULT_CONFIG: ZeroClawConfig = {
  default_provider: 'openrouter',
  default_model: 'anthropic/claude-sonnet-4',
  default_temperature: 0.7,
  autonomy: {
    level: 'supervised',
    workspace_only: false,
    require_approval_for_medium_risk: true,
    block_high_risk_commands: true,
  },
  memory: {
    backend: 'auto',
    auto_save: true,
    hygiene_enabled: true,
  },
  runtime: {
    kind: 'docker',
    docker: {
      image: DEFAULT_IMAGE,
      network: 'bridge',
      mount_workspace: true,
    },
  },
};

export function TemplateCreator({
  isOpen,
  onClose,
  onSave,
}: TemplateCreatorProps) {
  const { toast } = useToast();
  const [config, setConfig] = useState<ZeroClawConfig>(DEFAULT_CONFIG);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [defaultImage, setDefaultImage] = useState(DEFAULT_IMAGE);

  // 获取默认镜像配置
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/config');
        if (response.ok) {
          const data = await response.json();
          setDefaultImage(data.zeroclaw_image || DEFAULT_IMAGE);
          // 更新默认配置中的镜像
          setConfig(prev => ({
            ...prev,
            runtime: {
              ...prev.runtime,
              docker: {
                ...prev.runtime?.docker,
                image: data.zeroclaw_image || DEFAULT_IMAGE,
              } as any,
            },
          }));
        }
      } catch (error) {
        console.error('Failed to fetch config:', error);
      }
    };

    fetchConfig();
  }, []);

  const handleClose = () => {
    // Reset form
    setName('');
    setDescription('');
    setConfig(DEFAULT_CONFIG);
    onClose();
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: "Validation Error",
        description: "Template name is required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/api/templates', {
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          config,
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Template created successfully!",
          variant: "success",
        });
        handleClose();
        onSave();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: `Failed to create template: ${error.error}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to create template:', error);
      toast({
        title: "Error",
        description: "Failed to create template",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = (path: string, value: any) => {
    setConfig((prev) => {
      const newConfig = { ...prev };
      const keys = path.split('.');
      let current: any = newConfig;

      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }

      current[keys[keys.length - 1]] = value;
      return newConfig;
    });
  };

  const getConfigValue = (path: string, defaultValue: any = ''): any => {
    const keys = path.split('.');
    let current: any = config;

    for (const key of keys) {
      if (current?.[key] === undefined) {
        return defaultValue;
      }
      current = current[key];
    }

    return current;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <span style={{ color: '#ff3b30' }}>›</span>
            Create New Template
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Create a custom template from scratch
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-gray-800">
            <TabsTrigger value="basic" className="data-[state=active]:bg-gray-700">Basic</TabsTrigger>
            <TabsTrigger value="model" className="data-[state=active]:bg-gray-700">Model</TabsTrigger>
            <TabsTrigger value="autonomy" className="data-[state=active]:bg-gray-700">Autonomy</TabsTrigger>
            <TabsTrigger value="advanced" className="data-[state=active]:bg-gray-700">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="templateName" className="text-white">Template Name *</Label>
              <Input
                id="templateName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-white"
                placeholder="My Custom Template"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="templateDescription" className="text-white">Description</Label>
              <Textarea
                id="templateDescription"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="text-white min-h-[80px]"
                placeholder="Describe this template..."
              />
            </div>

            <div className="bg-blue-900/20 border border-blue-900 rounded-lg p-4">
              <h4 className="text-blue-400 font-semibold mb-2">💡 Tip</h4>
              <p className="text-sm text-gray-300">
                Templates allow you to save pre-configured settings for quickly creating new agent instances.
                Configure the settings below to create a custom template.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="model" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="defaultProvider" className="text-white">Default Provider</Label>
              <select
                id="defaultProvider"
                value={getConfigValue('default_provider', 'openrouter')}
                onChange={(e) => updateConfig('default_provider', e.target.value)}
                className="w-full bg-gray-800 text-white border border-gray-600 rounded-md px-3 py-2"
              >
                <option value="openrouter">OpenRouter</option>
                <option value="anthropic">Anthropic</option>
                <option value="openai">OpenAI</option>
                <option value="azure">Azure OpenAI</option>
                <option value="google">Google AI</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultModel" className="text-white">Default Model</Label>
              <Input
                id="defaultModel"
                value={getConfigValue('default_model', '')}
                onChange={(e) => updateConfig('default_model', e.target.value)}
                className="text-white"
                placeholder="anthropic/claude-sonnet-4"
              />
              <p className="text-xs text-gray-500">Example: anthropic/claude-sonnet-4, openai/gpt-4</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultTemperature" className="text-white">Default Temperature</Label>
              <Input
                id="defaultTemperature"
                type="number"
                step="0.1"
                min="0"
                max="2"
                value={getConfigValue('default_temperature', 0.7)}
                onChange={(e) => updateConfig('default_temperature', parseFloat(e.target.value))}
                className="text-white"
              />
              <p className="text-xs text-gray-500">Range: 0.0 - 2.0 (higher = more creative)</p>
            </div>
          </TabsContent>

          <TabsContent value="autonomy" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="autonomyLevel" className="text-white">Autonomy Level</Label>
              <select
                id="autonomyLevel"
                value={getConfigValue('autonomy.level', 'supervised')}
                onChange={(e) => updateConfig('autonomy.level', e.target.value)}
                className="w-full bg-gray-800 text-white border border-gray-600 rounded-md px-3 py-2"
              >
                <option value="readonly">Readonly - No actions allowed</option>
                <option value="supervised">Supervised - Requires approval</option>
                <option value="full">Full - Autonomous actions</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="workspaceOnly" className="text-white">Workspace Only</Label>
                <p className="text-xs text-gray-500">Restrict agent to workspace directory</p>
              </div>
              <Switch
                id="workspaceOnly"
                checked={getConfigValue('autonomy.workspace_only', false)}
                onCheckedChange={(checked) => updateConfig('autonomy.workspace_only', checked)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxActionsPerHour" className="text-white">Max Actions Per Hour</Label>
              <Input
                id="maxActionsPerHour"
                type="number"
                min="0"
                value={getConfigValue('autonomy.max_actions_per_hour', 0)}
                onChange={(e) => updateConfig('autonomy.max_actions_per_hour', parseInt(e.target.value) || 0)}
                className="text-white"
                placeholder="0 = unlimited"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxCostPerDay" className="text-white">Max Cost Per Day (cents)</Label>
              <Input
                id="maxCostPerDay"
                type="number"
                min="0"
                value={getConfigValue('autonomy.max_cost_per_day_cents', 0)}
                onChange={(e) => updateConfig('autonomy.max_cost_per_day_cents', parseInt(e.target.value) || 0)}
                className="text-white"
                placeholder="0 = unlimited"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="requireApproval" className="text-white">Require Approval for Medium Risk</Label>
                <p className="text-xs text-gray-500">Ask before medium-risk operations</p>
              </div>
              <Switch
                id="requireApproval"
                checked={getConfigValue('autonomy.require_approval_for_medium_risk', true)}
                onCheckedChange={(checked) => updateConfig('autonomy.require_approval_for_medium_risk', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="blockHighRisk" className="text-white">Block High Risk Commands</Label>
                <p className="text-xs text-gray-500">Prevent dangerous operations</p>
              </div>
              <Switch
                id="blockHighRisk"
                checked={getConfigValue('autonomy.block_high_risk_commands', true)}
                onCheckedChange={(checked) => updateConfig('autonomy.block_high_risk_commands', checked)}
              />
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-white">Memory Backend</Label>
              <select
                value={getConfigValue('memory.backend', 'auto')}
                onChange={(e) => updateConfig('memory.backend', e.target.value)}
                className="w-full bg-gray-800 text-white border border-gray-600 rounded-md px-3 py-2"
              >
                <option value="auto">Auto</option>
                <option value="sqlite">SQLite</option>
                <option value="postgres">PostgreSQL</option>
                <option value="none">None</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="autoSaveMemory" className="text-white">Auto Save Memory</Label>
                <p className="text-xs text-gray-500">Automatically save agent memories</p>
              </div>
              <Switch
                id="autoSaveMemory"
                checked={getConfigValue('memory.auto_save', true)}
                onCheckedChange={(checked) => updateConfig('memory.auto_save', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="memoryHygiene" className="text-white">Memory Hygiene</Label>
                <p className="text-xs text-gray-500">Clean up old memories automatically</p>
              </div>
              <Switch
                id="memoryHygiene"
                checked={getConfigValue('memory.hygiene_enabled', true)}
                onCheckedChange={(checked) => updateConfig('memory.hygiene_enabled', checked)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="observabilityBackend" className="text-white">Observability Backend</Label>
              <Input
                id="observabilityBackend"
                value={getConfigValue('observability.backend', 'none')}
                onChange={(e) => updateConfig('observability.backend', e.target.value)}
                className="text-white"
                placeholder="none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="runtimeKind" className="text-white">Runtime Kind</Label>
              <select
                id="runtimeKind"
                value={getConfigValue('runtime.kind', 'docker')}
                onChange={(e) => updateConfig('runtime.kind', e.target.value)}
                className="w-full bg-gray-800 text-white border border-gray-600 rounded-md px-3 py-2"
              >
                <option value="docker">Docker</option>
                <option value="local">Local</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dockerImage" className="text-white">Docker Image</Label>
              <Input
                id="dockerImage"
                value={getConfigValue('runtime.docker.image', '')}
                onChange={(e) => updateConfig('runtime.docker.image', e.target.value)}
                className="text-white"
                placeholder={defaultImage}
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            className="text-gray-300 border-gray-600 hover:bg-gray-800"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || !name.trim()}
            style={{ backgroundColor: '#ff3b30', color: 'white' }}
          >
            {loading ? 'Creating...' : 'Create Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
