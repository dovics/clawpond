'use client';

import React, { useState, useEffect } from 'react';
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
import { useInstances } from '@/components/providers';
import { Template } from '@/lib/template.service';
import { api } from '@/lib/api-client';
import { CreateInstanceOptions } from '@/types';

type CreateMode = 'template' | 'custom';

interface CreateInstanceDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * CreateInstanceDialog component
 * Dialog for creating new instances
 */
export function CreateInstanceDialog({ open, onClose }: CreateInstanceDialogProps) {
  const { createInstance } = useInstances();

  // Mode selection
  const [mode, setMode] = useState<CreateMode>('template');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  // Instance form
  const [name, setName] = useState('');
  const [port, setPort] = useState<string>('');
  const [memoryLimit, setMemoryLimit] = useState(500);
  const [cpuLimit, setCpuLimit] = useState(0.5);

  // Web permissions
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [webFetchEnabled, setWebFetchEnabled] = useState(false);

  const [loading, setLoading] = useState(false);

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

    if (open) {
      fetchTemplates();
    }
  }, [open]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setName('');
      setPort('');
      setMemoryLimit(500);
      setCpuLimit(0.5);
      setWebSearchEnabled(false);
      setWebFetchEnabled(false);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      return;
    }

    setLoading(true);

    const options: CreateInstanceOptions = {
      name: name.trim(),
      port: port ? parseInt(port) : undefined,
      memoryLimit,
      cpuLimit,
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
            provider: 'duckduckgo',
            max_results: 5,
            timeout_secs: 15,
          };
          options.config.web_fetch = {
            enabled: webFetchEnabled,
            allowed_domains: ['*'],
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
      await createInstance(options);

      // Reset form
      setName('');
      setPort('');
      setMemoryLimit(500);
      setCpuLimit(0.5);

      onClose();
    } catch (error) {
      console.error('Failed to create instance:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Instance</DialogTitle>
          <DialogDescription>
            Create a new AI agent instance with custom configuration.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Mode Selection */}
            <div className="flex gap-6">
              <label className={`flex items-center gap-2 ${loading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                <input
                  type="radio"
                  name="mode"
                  checked={mode === 'template'}
                  onChange={() => setMode('template')}
                  className="accent-primary"
                  disabled={loading}
                />
                <span>From Template</span>
              </label>
              <label className={`flex items-center gap-2 ${loading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                <input
                  type="radio"
                  name="mode"
                  checked={mode === 'custom'}
                  onChange={() => setMode('custom')}
                  className="accent-primary"
                  disabled={loading}
                />
                <span>Custom Config</span>
              </label>
            </div>

            {mode === 'template' && (
              <>
                {/* Template Selection */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="template" className="text-right">
                    Template
                  </Label>
                  <select
                    id="template"
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={loading || templates.length === 0}
                  >
                    {templates.length === 0 ? (
                      <option value="">No templates available</option>
                    ) : (
                      templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name} {template.description ? `- ${template.description}` : ''}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                {templates.length === 0 && (
                  <p className="text-sm text-muted-foreground col-span-4 text-center">
                    No templates available. Create templates first or use custom configuration.
                  </p>
                )}
              </>
            )}

            {/* Name */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name *
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
                placeholder="my-agent"
                required
              />
            </div>

            {/* Port */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="port" className="text-right">
                Port
              </Label>
              <Input
                id="port"
                type="number"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                className="col-span-3"
                placeholder="42617"
                min="1"
                max="65535"
              />
            </div>

            {/* Memory Limit */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="memory" className="text-right">
                Memory (MB)
              </Label>
              <Input
                id="memory"
                type="number"
                value={memoryLimit}
                onChange={(e) => setMemoryLimit(parseInt(e.target.value) || 500)}
                className="col-span-3"
                min="128"
                max="4096"
                step="128"
              />
            </div>

            {/* CPU Limit */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cpu" className="text-right">
                CPU Cores
              </Label>
              <Input
                id="cpu"
                type="number"
                value={cpuLimit}
                onChange={(e) => setCpuLimit(parseFloat(e.target.value) || 0.5)}
                className="col-span-3"
                min="0.1"
                max="4"
                step="0.1"
              />
            </div>

            {/* Web Permissions */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Web Permissions</Label>
              <div className="col-span-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="web-search" className="text-sm">Web Search</Label>
                    <p className="text-xs text-muted-foreground">Allow agent to search the web</p>
                  </div>
                  <Switch
                    id="web-search"
                    checked={webSearchEnabled}
                    onCheckedChange={setWebSearchEnabled}
                    disabled={loading}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="web-fetch" className="text-sm">Web Fetch</Label>
                    <p className="text-xs text-muted-foreground">Allow agent to fetch web pages</p>
                  </div>
                  <Switch
                    id="web-fetch"
                    checked={webFetchEnabled}
                    onCheckedChange={setWebFetchEnabled}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !name.trim() || (mode === 'template' && templates.length === 0)}>
              {loading ? 'Creating...' : 'Create Instance'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
