'use client';

import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
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
import { CreateInstanceOptions } from '@/types';
import { Template } from '@/lib/template.service';
import { api } from '@/lib/api-client';

type CreateMode = 'template' | 'custom';

interface CreateInstanceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (options: CreateInstanceOptions) => Promise<void>;
  templateChangeTrigger?: number;
}

export function CreateInstanceDialog({
  isOpen,
  onClose,
  onCreate,
  templateChangeTrigger = 0,
}: CreateInstanceDialogProps) {
  const [mode, setMode] = useState<CreateMode>('template');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);

  // Instance name (always required)
  const [name, setName] = useState('');

  // Port (optional)
  const [port, setPort] = useState<number | undefined>();

  // Web permissions (default to disabled for security)
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [webFetchEnabled, setWebFetchEnabled] = useState(false);

  // Fetch templates
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await api.get('/api/templates');
        if (response.ok) {
          const data = await response.json();
          setTemplates(data);
          if (data.length > 0) {
            setSelectedTemplateId(data[0].id);
          }
        }
      } catch (error) {
        console.error('Failed to fetch templates:', error);
      }
    };

    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen, templateChangeTrigger]);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setName('');
      setPort(undefined);
      setWebSearchEnabled(false);
      setWebFetchEnabled(false);
    }
  }, [isOpen]);

  const handleCreate = async () => {
    if (!name.trim() || isCreating) return;

    setIsCreating(true);

    const options: CreateInstanceOptions = {
      name: name.trim(),
      port,
      memoryLimit: 100, // Default: 100MB
      cpuLimit: 0.2,    // Default: 0.2 cores
    };

    if (mode === 'template') {
      const template = templates.find((t) => t.id === selectedTemplateId);
      if (template) {
        // Use the complete config from template
        options.config = template.config;

        // Override web permissions with user selection
        if (options.config) {
          options.config.web_search = {
            enabled: webSearchEnabled,
            provider: 'duckduckgo', // Default provider
            max_results: 5,
            timeout_secs: 15,
          };
          options.config.web_fetch = {
            enabled: webFetchEnabled,
            allowed_domains: ['*'], // Allow all domains by default
            blocked_domains: [],
            max_response_size: 500000,
            timeout_secs: 30,
          };
        }
      }
    } else {
      // Custom mode - add web permissions config
      options.config = {
        web_search: {
          enabled: webSearchEnabled,
          provider: 'duckduckgo',
          max_results: 5,
          timeout_secs: 15,
        },
        web_fetch: {
          enabled: webFetchEnabled,
          allowed_domains: ['*'],
          blocked_domains: [],
          max_response_size: 500000,
          timeout_secs: 30,
        },
      };
    }

    try {
      await onCreate(options);
    } finally {
      setIsCreating(false);
    }
  };

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <span className="text-primary">›</span>
            Create New Instance
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Create a new AI Agent instance from a template or with custom configuration.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Mode Selection */}
          <div className="flex gap-4">
            <label className={`flex items-center gap-2 ${isCreating ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
              <input
                type="radio"
                name="mode"
                checked={mode === 'template'}
                onChange={() => setMode('template')}
                className="accent-red-500"
                disabled={isCreating}
              />
              <span className="text-white">From Template</span>
            </label>
            <label className={`flex items-center gap-2 ${isCreating ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
              <input
                type="radio"
                name="mode"
                checked={mode === 'custom'}
                onChange={() => setMode('custom')}
                className="accent-red-500"
                disabled={isCreating}
              />
              <span className="text-white">Custom Config</span>
            </label>
          </div>

          <div className="border-t border-gray-700" />

          {/* Instance Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-white">Instance Name</Label>
            <Input
              id="name"
              placeholder="my-agent"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-white"
              disabled={isCreating}
            />
          </div>

          {mode === 'template' ? (
            <>
              {/* Template Mode */}
              {templates.length === 0 ? (
                <div className="text-center py-4 text-gray-400">
                  No templates available. Create templates first or use custom configuration.
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="template" className="text-white">Select Template</Label>
                    <select
                      id="template"
                      value={selectedTemplateId}
                      onChange={(e) => setSelectedTemplateId(e.target.value)}
                      className="w-full bg-gray-800 text-white border border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                      disabled={isCreating}
                    >
                      {templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name} {template.description ? `- ${template.description}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Template Config Preview */}
                  {selectedTemplate && (
                    <>
                      <div className="border-t border-gray-700 my-2" />
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-gray-300">Template Configuration</div>
                        <div className="bg-gray-800 rounded p-3 text-sm space-y-1">
                          {selectedTemplate.config.autonomy?.level && (
                            <div className="flex">
                              <span className="text-gray-400 w-24">Autonomy:</span>
                              <span className="text-white">{selectedTemplate.config.autonomy.level}</span>
                            </div>
                          )}
                          {selectedTemplate.config.memory?.backend && (
                            <div className="flex">
                              <span className="text-gray-400 w-24">Memory:</span>
                              <span className="text-white">{selectedTemplate.config.memory.backend}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </>
          ) : (
            <>
              {/* Custom Mode - simplified */}
              <div className="border-t border-gray-700 my-2" />
              <div className="text-sm text-gray-400">
                Custom configuration will use default settings. You can configure the agent after creation.
              </div>
            </>
          )}

          <div className="border-t border-gray-700 my-2" />

          {/* Port (optional) */}
          <div className="space-y-2">
            <Label htmlFor="port" className="text-white text-sm">Port (optional)</Label>
            <Input
              id="port"
              type="number"
              placeholder="Do not expose port"
              value={port || ''}
              onChange={(e) => setPort(e.target.value ? parseInt(e.target.value) : undefined)}
              className="text-white"
              disabled={isCreating}
            />
            <p className="text-xs text-gray-500">
              Leave empty to not expose port externally. Default resources: 0.2 cores, 100MB RAM
            </p>
          </div>

          {/* Web Permissions */}
          <div className="border-t border-gray-700 my-2" />
          <div className="space-y-3">
            <Label className="text-white text-sm">Web Permissions</Label>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="web-search" className="text-white text-sm">Web Search</Label>
                <p className="text-xs text-gray-500">Allow agent to search the web</p>
              </div>
              <Switch
                id="web-search"
                checked={webSearchEnabled}
                onCheckedChange={setWebSearchEnabled}
                disabled={isCreating}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="web-fetch" className="text-white text-sm">Web Fetch</Label>
                <p className="text-xs text-gray-500">Allow agent to fetch web pages</p>
              </div>
              <Switch
                id="web-fetch"
                checked={webFetchEnabled}
                onCheckedChange={setWebFetchEnabled}
                disabled={isCreating}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          {isCreating && (
            <div className="flex-1 text-center">
              <p className="text-sm text-gray-400">Creating instance... Please wait.</p>
            </div>
          )}
          <Button
            variant="outline"
            onClick={onClose}
            className="text-gray-300 border-gray-600 hover:bg-gray-800"
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!name.trim() || (mode === 'template' && templates.length === 0) || isCreating}
            className="bg-primary text-primary-foreground"
          >
            {isCreating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
