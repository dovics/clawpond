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
import { Template } from '@/lib/template.service';
import { ZeroClawConfig, ZeroClawInstance } from '@/types';
import { api } from '@/lib/api-client';
import { useToast } from '@/components/ui/toaster';

interface TemplateManagerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onTemplatesChange: () => void;
  instances?: ZeroClawInstance[]; // Pass instances for "Save as Template" feature
}

interface FormData {
  name: string;
  description: string;
}

type ViewMode = 'list' | 'createFromInstance';

export function TemplateManagerDialog({
  isOpen,
  onClose,
  onTemplatesChange,
  instances = [],
}: TemplateManagerDialogProps) {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedInstance, setSelectedInstance] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
  });

  const fetchTemplates = async () => {
    try {
      const response = await api.get('/api/templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
      setViewMode('list');
    }
  }, [isOpen]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
    });
    setSelectedInstance('');
    setViewMode('list');
  };

  const handleCreateFromInstance = () => {
    setViewMode('createFromInstance');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      const response = await api.delete(`/api/templates/${id}`);

      if (response.ok) {
        await fetchTemplates();
        onTemplatesChange();
      }
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Name is required",
        variant: "destructive",
      });
      return;
    }

    if (!selectedInstance) {
      toast({
        title: "Validation Error",
        description: "Please select an instance",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const instance = instances.find(i => i.containerId === selectedInstance);
      if (!instance) {
        toast({
          title: "Error",
          description: "Instance not found",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Remove gateway.port from config when saving as template
      const configToSave = { ...instance.config };
      if (configToSave.gateway) {
        const { port, ...gatewayWithoutPort } = configToSave.gateway;
        configToSave.gateway = gatewayWithoutPort;
      }

      const response = await api.post('/api/templates', {
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          config: configToSave,
          sourceInstanceId: instance.containerId,
        }),
      });

      if (response.ok) {
        await fetchTemplates();
        onTemplatesChange();
        resetForm();
        toast({
          title: "Success",
          description: "Template created successfully!",
          variant: "success",
        });
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: `Failed to create template: ${error.error}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to save template:', error);
      toast({
        title: "Error",
        description: "Failed to save template",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    resetForm();
  };

  const getConfigPreview = (config: ZeroClawConfig) => {
    const parts: string[] = [];
    if (config.default_provider) parts.push(`Provider: ${config.default_provider}`);
    if (config.default_model) parts.push(`Model: ${config.default_model}`);
    if (config.autonomy?.level) parts.push(`Autonomy: ${config.autonomy.level}`);
    if (config.memory?.backend) parts.push(`Memory: ${config.memory.backend}`);
    if (config.observability?.backend) parts.push(`Observability: ${config.observability.backend}`);
    if (config.runtime?.docker?.image) parts.push(`Image: ${config.runtime.docker.image}`);
    return parts.join(' | ') || 'No configuration';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <span style={{ color: '#ff3b30' }}>›</span>
            Manage Templates
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Save existing instances as templates for quick agent creation
          </DialogDescription>
        </DialogHeader>

        {viewMode === 'list' && (
          <div className="space-y-4 py-4">
            <Button
              onClick={handleCreateFromInstance}
              variant="outline"
              className="text-gray-300 border-gray-600 hover:bg-gray-800 w-full"
              disabled={instances.length === 0}
            >
              Save Instance as Template
            </Button>

            {instances.length === 0 && (
              <div className="text-center text-gray-400 py-4">
                No instances available. Create an instance first to save it as a template.
              </div>
            )}

            {instances.length > 0 && templates.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                No templates yet. Select an instance to save as a template.
              </div>
            ) : templates.length === 0 ? null : (
              <div className="space-y-3">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="bg-gray-800 rounded-lg p-4 border border-gray-700"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-semibold text-white">
                          📦 {template.name}
                        </div>
                        {template.description && (
                          <div className="text-sm text-gray-400 mt-1">
                            {template.description}
                          </div>
                        )}
                        <div className="text-xs text-gray-500 mt-2">
                          {getConfigPreview(template.config)}
                        </div>
                        {template.sourceInstanceId && (
                          <div className="text-xs text-gray-600 mt-1">
                            From instance: {template.sourceInstanceId.slice(0, 8)}...
                          </div>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(template.id)}
                        className="text-red-400 border-red-900 hover:bg-red-900/20"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {viewMode === 'createFromInstance' && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="instance" className="text-white">Select Instance</Label>
              <select
                id="instance"
                value={selectedInstance}
                onChange={(e) => setSelectedInstance(e.target.value)}
                className="w-full bg-gray-800 text-white border border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">-- Select an instance --</option>
                {instances.filter(i => i.status === 'running' || i.status === 'stopped').map((instance) => (
                  <option key={instance.containerId} value={instance.containerId}>
                    {instance.name} ({instance.status})
                  </option>
                ))}
              </select>
            </div>

            {selectedInstance && (
              <div className="bg-gray-800 rounded p-3 text-sm">
                <div className="text-gray-400 mb-2">Instance configuration will be saved to template</div>
                {(() => {
                  const instance = instances.find(i => i.containerId === selectedInstance);
                  return instance ? (
                    <div className="text-xs text-gray-500">
                      {getConfigPreview(instance.config)}
                    </div>
                  ) : null;
                })()}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name" className="text-white">Template Name</Label>
              <Input
                id="name"
                placeholder="My Template"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-white">Description</Label>
              <Input
                id="description"
                placeholder="Description for this template"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="text-white"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          {viewMode === 'list' ? (
            <Button
              onClick={onClose}
              style={{ backgroundColor: '#ff3b30', color: 'white' }}
            >
              Close
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                className="text-gray-300 border-gray-600 hover:bg-gray-800"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading || !formData.name.trim() || !selectedInstance}
                style={{ backgroundColor: '#ff3b30', color: 'white' }}
              >
                {loading ? 'Saving...' : 'Create Template'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
