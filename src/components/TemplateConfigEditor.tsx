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

interface TemplateConfigEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  templateId: string | null;
  initialConfig?: ZeroClawConfig;
  initialName?: string;
  initialDescription?: string;
}

const DEFAULT_IMAGE = 'dovics1/zeroclaw:v0.1.7-beta.30-local-0.1.3-fea53a8';

export function TemplateConfigEditor({
  isOpen,
  onClose,
  onSave,
  templateId,
  initialConfig,
  initialName,
  initialDescription,
}: TemplateConfigEditorProps) {
  const { toast } = useToast();
  const [config, setConfig] = useState<ZeroClawConfig>(initialConfig || {});
  const [name, setName] = useState(initialName || '');
  const [description, setDescription] = useState(initialDescription || '');
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
        }
      } catch (error) {
        console.error('Failed to fetch config:', error);
      }
    };

    fetchConfig();
  }, []);

  useEffect(() => {
    if (isOpen) {
      setConfig(initialConfig || {});
      setName(initialName || '');
      setDescription(initialDescription || '');
    }
  }, [isOpen, initialConfig, initialName, initialDescription]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: "Validation Error",
        description: "Template name is required",
        variant: "destructive",
      });
      return;
    }

    if (!templateId) {
      toast({
        title: "Error",
        description: "Template ID is required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await api.put(`/api/templates/${templateId}`, {
        body: JSON.stringify({
          name,
          description,
          config,
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Template updated successfully!",
          variant: "success",
        });
        onSave();
        onClose();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: `Failed to update template: ${error.error}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to update template:', error);
      toast({
        title: "Error",
        description: "Failed to update template",
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <span style={{ color: '#ff3b30' }}>›</span>
            Edit Template Configuration
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Modify template settings and configuration
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
              <Label htmlFor="templateName" className="text-white">Template Name</Label>
              <Input
                id="templateName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-white"
                placeholder="My Template"
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
          </TabsContent>

          <TabsContent value="model" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="defaultProvider" className="text-white">Default Provider</Label>
              <Input
                id="defaultProvider"
                value={getConfigValue('default_provider', '')}
                onChange={(e) => updateConfig('default_provider', e.target.value)}
                className="text-white"
                placeholder="openrouter"
              />
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
              <Label htmlFor="workspaceOnly" className="text-white">Workspace Only</Label>
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
                value={getConfigValue('autonomy.max_actions_per_hour', 0)}
                onChange={(e) => updateConfig('autonomy.max_actions_per_hour', parseInt(e.target.value) || 0)}
                className="text-white"
                placeholder="0 = unlimited"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="requireApproval" className="text-white">Require Approval for Medium Risk</Label>
              <Switch
                id="requireApproval"
                checked={getConfigValue('autonomy.require_approval_for_medium_risk', true)}
                onCheckedChange={(checked) => updateConfig('autonomy.require_approval_for_medium_risk', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="blockHighRisk" className="text-white">Block High Risk Commands</Label>
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
              <Input
                value={getConfigValue('memory.backend', '')}
                onChange={(e) => updateConfig('memory.backend', e.target.value)}
                className="text-white"
                placeholder="auto"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="autoSaveMemory" className="text-white">Auto Save Memory</Label>
              <Switch
                id="autoSaveMemory"
                checked={getConfigValue('memory.auto_save', true)}
                onCheckedChange={(checked) => updateConfig('memory.auto_save', checked)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="observabilityBackend" className="text-white">Observability Backend</Label>
              <Input
                id="observabilityBackend"
                value={getConfigValue('observability.backend', '')}
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
            onClick={onClose}
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
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
