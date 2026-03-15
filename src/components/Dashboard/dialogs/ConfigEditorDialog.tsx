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
import { Textarea } from '@/components/ui/textarea';
import { ZeroClawInstance } from '@/types';

interface ConfigEditorDialogProps {
  open: boolean;
  instance: ZeroClawInstance;
  onClose: () => void;
}

/**
 * ConfigEditorDialog component
 * Dialog for editing instance configuration
 */
export function ConfigEditorDialog({ open, instance, onClose }: ConfigEditorDialogProps) {
  const [config, setConfig] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load config
  useEffect(() => {
    const loadConfig = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/containers/${instance.id}/config`);
        if (response.ok) {
          const data = await response.text();
          setConfig(data);
        }
      } catch (error) {
        console.error('Failed to load config:', error);
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      loadConfig();
    }
  }, [open, instance.id]);

  // Save config
  const handleSave = async () => {
    setSaving(true);

    try {
      const response = await fetch(`/api/containers/${instance.id}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'text/plain' },
        body: config,
      });

      if (response.ok) {
        onClose();
      }
    } catch (error) {
      console.error('Failed to save config:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Edit Configuration</DialogTitle>
          <DialogDescription>
            Edit TOML configuration for {instance.name}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center">Loading configuration...</div>
        ) : (
          <Textarea
            value={config}
            onChange={(e) => setConfig(e.target.value)}
            className="font-mono text-sm min-h-[400px]"
            spellCheck={false}
          />
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              window.location.href = `/instances/${instance.id}/config`
            }}
          >
            打开完整编辑器
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
