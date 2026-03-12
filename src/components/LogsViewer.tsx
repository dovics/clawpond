'use client';

import { useState, useEffect, useRef } from 'react';
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
import { RefreshCw, Download, Search, X } from 'lucide-react';
import { api } from '@/lib/api-client';

interface LogsViewerProps {
  isOpen: boolean;
  onClose: () => void;
  containerId: string;
  containerName: string;
}

export function LogsViewer({
  isOpen,
  onClose,
  containerId,
  containerName,
}: LogsViewerProps) {
  const [logs, setLogs] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [tailLines, setTailLines] = useState(100);
  const [searchTerm, setSearchTerm] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const autoRefreshRef = useRef<NodeJS.Timeout | null>(null);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/api/containers/${containerId}/logs?tail=${tailLines}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || '');
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
      setLogs('Error fetching logs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
    return () => {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
      }
    };
  }, [isOpen, tailLines]);

  useEffect(() => {
    if (autoRefresh && isOpen) {
      autoRefreshRef.current = setInterval(fetchLogs, 3000);
    } else if (autoRefreshRef.current) {
      clearInterval(autoRefreshRef.current);
      autoRefreshRef.current = null;
    }

    return () => {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
      }
    };
  }, [autoRefresh, isOpen]);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const handleDownload = () => {
    const blob = new Blob([logs], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${containerName}-logs.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const highlightSearchTerm = (text: string) => {
    if (!searchTerm) return text;

    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-primary/30 text-red-400">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const filteredLogs = searchTerm
    ? logs.split('\n').filter(line => line.toLowerCase().includes(searchTerm.toLowerCase())).join('\n')
    : logs;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col bg-card border-primary/20"
      >
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <span className="text-primary">›</span>
            Container Logs: {containerName}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            View real-time container logs
          </DialogDescription>
        </DialogHeader>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Label htmlFor="tailLines" className="text-white text-sm">Lines:</Label>
            <Input
              id="tailLines"
              type="number"
              min="10"
              max="10000"
              value={tailLines}
              onChange={(e) => setTailLines(parseInt(e.target.value) || 100)}
              className="w-20 text-white bg-muted border-input"
            />
          </div>

          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-white bg-muted border-input"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-gray-400"
                onClick={() => setSearchTerm('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchLogs}
            disabled={isLoading}
            className="text-gray-300 border-gray-600 hover:bg-gray-800"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={!logs}
            className="text-gray-300 border-gray-600 hover:bg-gray-800"
          >
            <Download className="h-4 w-4 mr-1" />
            Download
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'text-green-400 border-green-600' : 'text-gray-300 border-gray-600 hover:bg-gray-800'}
          >
            Auto-refresh: {autoRefresh ? 'On' : 'Off'}
          </Button>
        </div>

        {/* Logs Display */}
        <div className="flex-1 overflow-auto mt-3">
          <pre
            className="p-4 rounded-md text-xs font-mono whitespace-pre-wrap break-words h-full bg-black/40 text-muted-foreground border-border"
            style={{ minHeight: '400px' }}
          >
            {isLoading ? 'Loading logs...' : filteredLogs || 'No logs available'}
            <div ref={logsEndRef} />
          </pre>
        </div>

        {/* Status Bar */}
        <div className="flex justify-between items-center py-2 text-xs text-gray-400 border-t border-border">
          <span>
            Showing {filteredLogs.split('\n').length} lines
            {searchTerm && ` (filtered from ${logs.split('\n').length} total lines)`}
          </span>
          <span>
            {autoRefresh && 'Auto-refreshing every 3 seconds'}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
