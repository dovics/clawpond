'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ZeroClawInstance } from '@/types';

interface LogsViewerDialogProps {
  open: boolean;
  instance: ZeroClawInstance;
  onClose: () => void;
}

/**
 * LogsViewerDialog component
 * Dialog for viewing instance logs
 */
export function LogsViewerDialog({ open, instance, onClose }: LogsViewerDialogProps) {
  const [logs, setLogs] = useState('');
  const [loading, setLoading] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Load logs
  const loadLogs = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/containers/${instance.id}/logs?tail=100`);
      if (response.ok) {
        const data = await response.text();
        setLogs(data);
      }
    } catch (error) {
      console.error('Failed to load logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadLogs();

      // Auto-refresh logs every 2 seconds
      const interval = setInterval(loadLogs, 2000);
      return () => clearInterval(interval);
    }
  }, [open, instance.id]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Container Logs</DialogTitle>
          <DialogDescription>
            Logs for {instance.name} (auto-refreshing)
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {loading && !logs && (
            <div className="py-8 text-center">Loading logs...</div>
          )}

          <pre className="bg-muted p-4 rounded-lg h-[400px] overflow-auto font-mono text-xs">
            {logs || 'No logs available'}
            <div ref={logsEndRef} />
          </pre>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={loadLogs}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={() => setAutoScroll(!autoScroll)}
          >
            {autoScroll ? 'Disable' : 'Enable'} Auto-Scroll
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
