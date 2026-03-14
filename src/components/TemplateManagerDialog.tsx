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
import { TemplateConfigViewer } from '@/components/TemplateConfigViewer';
import { TemplateConfigEditor } from '@/components/TemplateConfigEditor';
import { TemplateCreator } from '@/components/TemplateCreator';
import { Eye, Pencil, Plus } from 'lucide-react';

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
  const [viewingTemplate, setViewingTemplate] = useState<Template | null>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [isConfigViewerOpen, setIsConfigViewerOpen] = useState(false);
  const [isConfigEditorOpen, setIsConfigEditorOpen] = useState(false);
  const [isTemplateCreatorOpen, setIsTemplateCreatorOpen] = useState(false);

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

  const handleViewConfig = (template: Template) => {
    setViewingTemplate(template);
    setIsConfigViewerOpen(true);
  };

  const handleEditTemplate = (template: Template) => {
    setEditingTemplateId(template.id);
    setIsConfigEditorOpen(true);
  };

  const handleConfigEditorClose = () => {
    setIsConfigEditorOpen(false);
    setEditingTemplateId(null);
  };

  const handleConfigEditorSave = async () => {
    await fetchTemplates();
    onTemplatesChange();
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
            Create templates from scratch or save existing instances for quick agent creation
          </DialogDescription>
        </DialogHeader>

        {viewMode === 'list' && (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => setIsTemplateCreatorOpen(true)}
                variant="outline"
                className="text-green-400 border-green-900 hover:bg-green-900/20"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
              <Button
                onClick={handleCreateFromInstance}
                variant="outline"
                className="text-gray-300 border-gray-600 hover:bg-gray-800"
                disabled={instances.length === 0}
              >
                Save Instance as Template
              </Button>
            </div>

            {instances.length === 0 && templates.length === 0 && (
              <div className="text-center text-gray-400 py-8">
                No templates yet. Click "Create Template" to create one from scratch.
              </div>
            )}

            {instances.length === 0 && templates.length > 0 ? null : instances.length > 0 && templates.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                No templates yet. Create one from scratch or save an existing instance as a template.
              </div>
            ) : templates.length === 0 ? null : (
              <div className="space-y-3">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="bg-gray-800 rounded-lg p-4 border border-gray-700"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white flex items-center gap-2">
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
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewConfig(template)}
                          className="text-blue-400 border-blue-900 hover:bg-blue-900/20"
                          title="View configuration"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditTemplate(template)}
                          className="text-green-400 border-green-900 hover:bg-green-900/20"
                          title="Edit template"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(template.id)}
                          className="text-red-400 border-red-900 hover:bg-red-900/20"
                          title="Delete template"
                        >
                          Delete
                        </Button>
                      </div>
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

        <TemplateConfigViewer
          isOpen={isConfigViewerOpen}
          onClose={() => setIsConfigViewerOpen(false)}
          template={viewingTemplate}
        />

        {editingTemplateId && (
          <TemplateConfigEditor
            isOpen={isConfigEditorOpen}
            onClose={handleConfigEditorClose}
            onSave={handleConfigEditorSave}
            templateId={editingTemplateId}
            initialConfig={templates.find(t => t.id === editingTemplateId)?.config}
            initialName={templates.find(t => t.id === editingTemplateId)?.name}
            initialDescription={templates.find(t => t.id === editingTemplateId)?.description}
          />
        )}

        <TemplateCreator
          isOpen={isTemplateCreatorOpen}
          onClose={() => setIsTemplateCreatorOpen(false)}
          onSave={async () => {
            await fetchTemplates();
            onTemplatesChange();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
