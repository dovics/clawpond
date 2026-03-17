'use client';

import React, { useState } from 'react';
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
import { useInstances } from '@/components/providers';

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

  const [name, setName] = useState('');
  const [port, setPort] = useState<string>('');
  const [memoryLimit, setMemoryLimit] = useState(500);
  const [cpuLimit, setCpuLimit] = useState(0.5);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      return;
    }

    setLoading(true);

    try {
      await createInstance({
        name: name.trim(),
        port: port ? parseInt(port) : undefined,
        memoryLimit,
        cpuLimit,
      });

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
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? 'Creating...' : 'Create Instance'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
