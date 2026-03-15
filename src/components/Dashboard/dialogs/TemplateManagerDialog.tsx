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
import { Template, CreateTemplateOptions } from '@/lib/services';

interface TemplateManagerDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * TemplateManagerDialog component
 * Dialog for managing templates
 */
export function TemplateManagerDialog({ open, onClose }: TemplateManagerDialogProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDesc, setNewTemplateDesc] = useState('');
  const [newTemplateConfig, setNewTemplateConfig] = useState('');

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
    }
  }, [open]);

  // Create template
  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newTemplateName.trim()) {
      return;
    }

    try {
      const config = newTemplateConfig
        ? JSON.parse(newTemplateConfig)
        : {};

      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTemplateName.trim(),
          description: newTemplateDesc.trim(),
          config,
        } as CreateTemplateOptions),
      });

      if (response.ok) {
        await fetchTemplates();
        setShowCreateForm(false);
        setNewTemplateName('');
        setNewTemplateDesc('');
        setNewTemplateConfig('');
      }
    } catch (error) {
      console.error('Failed to create template:', error);
    }
  };

  // Delete template
  const handleDeleteTemplate = async (templateId: string) => {
    try {
      const response = await fetch(`/api/templates/${templateId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchTemplates();
      }
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Template Manager</DialogTitle>
          <DialogDescription>
            Create and manage instance templates
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {showCreateForm ? (
            <form onSubmit={handleCreateTemplate} className="space-y-4 py-4">
              <div>
                <Label htmlFor="templateName">Template Name *</Label>
                <Input
                  id="templateName"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="My Template"
                  required
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

              <div>
                <Label htmlFor="templateConfig">Configuration (JSON)</Label>
                <Textarea
                  id="templateConfig"
                  value={newTemplateConfig}
                  onChange={(e) => setNewTemplateConfig(e.target.value)}
                  placeholder='{"default_provider": "openrouter", ...}'
                  rows={10}
                  className="font-mono text-sm"
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit">Create Template</Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4 py-4">
              <Button onClick={() => setShowCreateForm(true)}>
                Create New Template
              </Button>

              {loading ? (
                <p>Loading templates...</p>
              ) : templates.length === 0 ? (
                <p className="text-muted-foreground">No templates found</p>
              ) : (
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
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteTemplate(template.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
