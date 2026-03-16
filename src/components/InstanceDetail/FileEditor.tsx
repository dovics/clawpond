'use client';

import { useState, useEffect, useCallback } from 'react';
import { Save, RotateCcw, Loader2, FileText, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/toaster';
import { api } from '@/lib/api-client';

interface FileEditorProps {
  instanceId: string;
  instanceName: string;
  fileName: string;
  fileLabel: string;
}

export function FileEditor({ instanceId, instanceName, fileName, fileLabel }: FileEditorProps) {
  const { toast } = useToast();
  const [content, setContent] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Determine API endpoint based on file name
  const apiEndpoint = fileName === 'AGENTS.md' ? 'agents' : 'soul';

  // Fetch file content
  const fetchContent = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/containers/${instanceId}/${apiEndpoint}`);
      if (response.ok) {
        const data = await response.json();
        const fileContent = data.content || '';
        setContent(fileContent);
        setOriginalContent(fileContent);
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || `Failed to load ${fileName}`,
          variant: 'destructive',
        });
        setContent('');
        setOriginalContent('');
      }
    } catch (error) {
      console.error(`Error loading ${fileName}:`, error);
      toast({
        title: 'Error',
        description: `Failed to load ${fileName}`,
        variant: 'destructive',
      });
      setContent('');
      setOriginalContent('');
    } finally {
      setLoading(false);
    }
  }, [instanceId, fileName, apiEndpoint, toast]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  // Check for changes
  useEffect(() => {
    setHasChanges(content !== originalContent);
  }, [content, originalContent]);

  // Handle save
  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await api.put(`/api/containers/${instanceId}/${apiEndpoint}`, {
        content,
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `${fileName} saved successfully`,
          variant: 'success',
        });
        setOriginalContent(content);
        setHasChanges(false);
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || `Failed to save ${fileName}`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error(`Error saving ${fileName}:`, error);
      toast({
        title: 'Error',
        description: `Failed to save ${fileName}`,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle reset
  const handleReset = () => {
    setContent(originalContent);
    toast({
      title: 'Reset',
      description: 'Content has been reset to saved version',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{fileLabel} Management</h2>
          <p className="text-sm text-muted-foreground">
            Edit {fileName} for {instanceName}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            File path: ./workspace/openclaw-{instanceName}/workspace/{fileName}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasChanges && (
            <>
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={saving}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Warning for unsaved changes */}
      {hasChanges && (
        <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-500">Unsaved Changes</p>
            <p className="text-sm text-muted-foreground">
              You have unsaved changes. Click "Save" to persist them.
            </p>
          </div>
        </div>
      )}

      {/* Editor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {fileName} Content
          </CardTitle>
          <CardDescription>
            Edit the content below. This file is used by the AI agent.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-[500px] min-h-[300px] p-4 rounded-md border bg-background font-mono text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder={`# ${fileName}\n\nStart editing here...`}
          />
        </CardContent>
      </Card>
    </div>
  );
}
