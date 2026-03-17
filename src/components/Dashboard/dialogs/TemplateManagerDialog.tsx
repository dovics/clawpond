'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Template } from '@/lib/services';
import { ZeroClawInstance } from '@/types';
import { api } from '@/lib/api-client';
import { useToast } from '@/components/ui/toaster';
import { Save, X, Eye, Pencil, Trash2 } from 'lucide-react';

interface TemplateManagerDialogProps {
  open: boolean;
  onClose: () => void;
  instances?: ZeroClawInstance[];
  onTemplatesChange?: () => void;
}

type ViewMode = 'list' | 'createFromInstance' | 'view' | 'edit';

/**
 * TemplateManagerDialog component
 * Dialog for managing templates - supports creating from instances and viewing/editing JSON
 */
export function TemplateManagerDialog({
  open,
  onClose,
  instances = [],
  onTemplatesChange,
}: TemplateManagerDialogProps) {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDesc, setNewTemplateDesc] = useState('');

  // For "Create from Instance" mode
  const [selectedInstanceId, setSelectedInstanceId] = useState('');

  // For view/edit mode
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [templateJson, setTemplateJson] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');

  // Fetch templates
  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchTemplates();
      setViewMode('list');
    }
  }, [open]);

  // Reset form when switching to create mode
  useEffect(() => {
    if (viewMode === 'createFromInstance') {
      setSelectedInstanceId('');
      setNewTemplateName('');
      setNewTemplateDesc('');
    } else if (viewMode === 'view' || viewMode === 'edit') {
      // Reset is handled by the open handlers
    }
  }, [viewMode]);

  // Get selected instance for preview
  const selectedInstance = instances.find(i => i.containerId === selectedInstanceId);

  // Open view mode
  const handleViewTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setTemplateJson(JSON.stringify(template.config, null, 2));
    setTemplateName(template.name);
    setTemplateDesc(template.description || '');
    setViewMode('view');
  };

  // Open edit mode
  const handleEditTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setTemplateJson(JSON.stringify(template.config, null, 2));
    setTemplateName(template.name);
    setTemplateDesc(template.description || '');
    setViewMode('edit');
  };

  // Save template changes
  const handleSaveTemplate = async () => {
    if (!selectedTemplate) return;

    try {
      // Validate JSON
      const parsedConfig = JSON.parse(templateJson);

      const response = await api.put(`/api/templates/${selectedTemplate.id}`, {
        name: templateName.trim(),
        description: templateDesc.trim(),
        config: parsedConfig,
      });

      if (response.ok) {
        await fetchTemplates();
        onTemplatesChange?.();
        setViewMode('list');
        toast({
          title: 'Success',
          description: 'Template updated successfully',
          variant: 'success',
        });
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to update template',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to save template:', error);
      toast({
        title: 'Error',
        description: 'Invalid JSON format',
        variant: 'destructive',
      });
    }
  };

  // Create template from instance
  const handleCreateFromInstance = async () => {
    if (!newTemplateName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Template name is required',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedInstanceId) {
      toast({
        title: 'Validation Error',
        description: 'Please select an instance',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const instance = instances.find(i => i.containerId === selectedInstanceId);
      if (!instance) {
        throw new Error('Instance not found');
      }

      // Remove gateway.port from config when saving as template
      const configToSave = { ...instance.config };
      if (configToSave.gateway) {
        const { port, ...gatewayWithoutPort } = configToSave.gateway as { port?: number; [key: string]: unknown };
        configToSave.gateway = gatewayWithoutPort;
      }

      const response = await api.post('/api/templates', {
        name: newTemplateName.trim(),
        description: newTemplateDesc.trim(),
        config: configToSave,
        sourceInstanceId: instance.containerId,
      });

      if (response.ok) {
        await fetchTemplates();
        setViewMode('list');
        onTemplatesChange?.();
        toast({
          title: 'Success',
          description: 'Template created from instance',
          variant: 'success',
        });
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to create template',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to create template from instance:', error);
      toast({
        title: 'Error',
        description: 'Failed to create template from instance',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Delete template
  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      const response = await fetch(`/api/templates/${templateId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchTemplates();
        onTemplatesChange?.();
        toast({
          title: 'Success',
          description: 'Template deleted',
          variant: 'success',
        });
      }
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  const getConfigPreview = (config: Record<string, unknown>) => {
    const parts: string[] = [];
    if (config.default_provider) parts.push(`Provider: ${config.default_provider}`);
    if (config.default_model) parts.push(`Model: ${config.default_model}`);
    if (config.autonomy) parts.push(`Autonomy: ${(config.autonomy as { level?: string }).level}`);
    if (config.memory) parts.push(`Memory: ${(config.memory as { backend?: string }).backend}`);
    return parts.join(' | ') || 'No configuration';
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Template Manager</DialogTitle>
          <DialogDescription>
            Save existing instances as templates for quick agent creation
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {/* List View */}
          {viewMode === 'list' && (
            <div className="space-y-4 py-4">
              <Button
                onClick={() => setViewMode('createFromInstance')}
                variant="outline"
                disabled={instances.length === 0}
                className="w-full border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Instance as Template
              </Button>

              {instances.length === 0 && templates.length === 0 && (
                <p className="text-muted-foreground text-center py-8">
                  No templates yet and no instances available. Create an instance first, then save it as a template.
                </p>
              )}

              {instances.length === 0 && templates.length > 0 && (
                <p className="text-muted-foreground text-center py-4">
                  No instances available to create new templates. Create an instance first.
                </p>
              )}

              {loading ? (
                <p>Loading templates...</p>
              ) : templates.length === 0 ? null : (
                <div className="space-y-2">
                  {templates.map(template => (
                    <div
                      key={template.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold">{template.name}</h3>
                        {template.description && (
                          <p className="text-sm text-muted-foreground">
                            {template.description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {getConfigPreview(template.config as Record<string, unknown>)}
                        </p>
                        {template.sourceInstanceId && (
                          <p className="text-xs text-muted-foreground mt-1">
                            From instance: {String(template.sourceInstanceId).slice(0, 8)}...
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewTemplate(template)}
                          title="View template"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditTemplate(template)}
                          title="Edit template"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteTemplate(template.id)}
                          className="text-red-400 border-red-900 hover:bg-red-900/20"
                          title="Delete template"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Create from Instance View */}
          {viewMode === 'createFromInstance' && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Save Instance as Template</h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div>
                <Label htmlFor="instanceSelect">Select Instance</Label>
                <select
                  id="instanceSelect"
                  value={selectedInstanceId}
                  onChange={(e) => setSelectedInstanceId(e.target.value)}
                  className="w-full mt-1 flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">-- Select an instance --</option>
                  {instances.map((instance) => (
                    <option key={instance.containerId} value={instance.containerId}>
                      {instance.name} ({instance.status})
                    </option>
                  ))}
                </select>
              </div>

              {selectedInstance && (
                <div className="bg-muted rounded p-3 text-sm">
                  <p className="text-muted-foreground mb-2">Instance configuration preview:</p>
                  <p className="text-xs font-mono">
                    {getConfigPreview(selectedInstance.config as Record<string, unknown>)}
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="templateName">Template Name *</Label>
                <Input
                  id="templateName"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="My Template"
                />
              </div>

              <div>
                <Label htmlFor="templateDesc">Description</Label>
                <Input
                  id="templateDesc"
                  value={newTemplateDesc}
                  onChange={(e) => setNewTemplateDesc(e.target.value)}
                  placeholder="Description of this template"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleCreateFromInstance}
                  disabled={loading || !newTemplateName.trim() || !selectedInstanceId}
                >
                  {loading ? 'Saving...' : 'Create Template'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setViewMode('list')}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* View Template JSON */}
          {viewMode === 'view' && selectedTemplate && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{selectedTemplate.name}</h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {selectedTemplate.description && (
                <p className="text-sm text-muted-foreground">{selectedTemplate.description}</p>
              )}

              <div className="space-y-2">
                <Label>Template JSON</Label>
                <Textarea
                  value={templateJson}
                  readOnly
                  rows={20}
                  className="font-mono text-sm bg-gray-900"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => setViewMode('edit')}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit JSON
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setViewMode('list')}
                >
                  Close
                </Button>
              </div>
            </div>
          )}

          {/* Edit Template JSON */}
          {viewMode === 'edit' && selectedTemplate && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Edit Template</h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div>
                <Label htmlFor="editName">Template Name *</Label>
                <Input
                  id="editName"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Template name"
                />
              </div>

              <div>
                <Label htmlFor="editDesc">Description</Label>
                <Input
                  id="editDesc"
                  value={templateDesc}
                  onChange={(e) => setTemplateDesc(e.target.value)}
                  placeholder="Description"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editJson">Template JSON *</Label>
                <Textarea
                  id="editJson"
                  value={templateJson}
                  onChange={(e) => setTemplateJson(e.target.value)}
                  placeholder='{"key": "value"}'
                  rows={20}
                  className="font-mono text-sm"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSaveTemplate}
                >
                  Save Changes
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleViewTemplate(selectedTemplate)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
