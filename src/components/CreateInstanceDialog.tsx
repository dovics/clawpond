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
import { CreateInstanceOptions } from '@/types';
import { Template } from '@/lib/template.service';

type CreateMode = 'template' | 'custom';

interface CreateInstanceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (options: CreateInstanceOptions) => void;
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

  // Instance name (always required)
  const [name, setName] = useState('');

  // Port (optional)
  const [port, setPort] = useState<number | undefined>();

  // Fetch templates
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await fetch('/api/templates');
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
    }
  }, [isOpen]);

  const handleCreate = () => {
    if (!name.trim()) return;

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
      }
    }
    // Custom mode uses default config - no additional config needed

    onCreate(options);
  };

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <span style={{ color: '#ff3b30' }}>›</span>
            Create New Instance
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Create a new AI Agent instance from a template or with custom configuration.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Mode Selection */}
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="mode"
                checked={mode === 'template'}
                onChange={() => setMode('template')}
                className="accent-red-500"
              />
              <span className="text-white">From Template</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="mode"
                checked={mode === 'custom'}
                onChange={() => setMode('custom')}
                className="accent-red-500"
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
                      className="w-full bg-gray-800 text-white border border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
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
                          {selectedTemplate.config.default_provider && (
                            <div className="flex">
                              <span className="text-gray-400 w-24">Provider:</span>
                              <span className="text-white">{selectedTemplate.config.default_provider}</span>
                            </div>
                          )}
                          {selectedTemplate.config.default_model && (
                            <div className="flex">
                              <span className="text-gray-400 w-24">Model:</span>
                              <span className="text-white">{selectedTemplate.config.default_model}</span>
                            </div>
                          )}
                          {(selectedTemplate.config as any).api_key && (
                            <div className="flex">
                              <span className="text-gray-400 w-24">API Key:</span>
                              <span className="text-white">••••••••</span>
                            </div>
                          )}
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
              placeholder="Auto-assign"
              value={port || ''}
              onChange={(e) => setPort(e.target.value ? parseInt(e.target.value) : undefined)}
              className="text-white"
            />
            <p className="text-xs text-gray-500">
              Leave empty to auto-assign. Default resources: 0.2 cores, 100MB RAM
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="text-gray-300 border-gray-600 hover:bg-gray-800"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!name.trim() || (mode === 'template' && templates.length === 0)}
            style={{ backgroundColor: '#ff3b30', color: 'white' }}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
