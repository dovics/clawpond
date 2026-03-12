'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ZeroClawInstance } from '@/types';
import { Play, Pause, RotateCcw, Trash2, Settings, Activity, Cpu, HardDrive, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildInstanceUrl } from '@/lib/config';

interface InstanceCardProps {
  instance: ZeroClawInstance;
  onStart: (id: string) => void;
  onStop: (id: string) => void;
  onRestart: (id: string) => void;
  onDelete: (id: string) => void;
  onConfig: (instance: ZeroClawInstance) => void;
  onLogs: (instance: ZeroClawInstance) => void;
}

export function InstanceCard({
  instance,
  onStart,
  onStop,
  onRestart,
  onDelete,
  onConfig,
  onLogs,
}: InstanceCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const isRunning = instance.status === 'running';
  const isStopped = instance.status === 'stopped' || instance.status === 'exited';

  const handleAction = async (action: () => void) => {
    setIsLoading(true);
    try {
      await action();
    } finally {
      setTimeout(() => setIsLoading(false), 1000);
    }
  };

  const statusColors = {
    running: 'bg-green-500',
    stopped: 'bg-red-500',
    paused: 'bg-yellow-500',
    restarting: 'bg-blue-500',
    exited: 'bg-gray-500',
    created: 'bg-purple-500',
    unknown: 'bg-gray-400',
  };

  return (
    <Card
      className="overflow-hidden transition-all duration-300 hover:shadow-xl"
      style={{
        backgroundColor: '#1a1f2e',
        borderColor: 'rgba(255, 59, 48, 0.2)',
      }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2 text-white">
              {instance.name}
              <span
                className={cn(
                  'w-2 h-2 rounded-full',
                  statusColors[instance.status]
                )}
                style={{
                  backgroundColor: isRunning ? '#22c55e' : '#ff3b30',
                }}
              />
            </CardTitle>
            <CardDescription className="text-xs" style={{ color: '#a0a0a0' }}>
              {instance.port ? `Port: ${instance.port}` : 'Port: Not exposed'}
            </CardDescription>
            <CardDescription className="text-xs" style={{ color: '#a0a0a0' }}>
              Created: {new Date(instance.createdAt).toLocaleString()}
            </CardDescription>
            <CardDescription className="text-xs" style={{ color: '#a0a0a0' }}>
              Last Active: {instance.lastActive ? new Date(instance.lastActive).toLocaleString() : 'Never'}
            </CardDescription>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-400 hover:text-white"
              onClick={() => onLogs(instance)}
              title="View Logs"
            >
              <FileText className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-400 hover:text-white"
              onClick={() => onConfig(instance)}
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              style={{ color: '#ff3b30' }}
              onClick={() => handleAction(() => onDelete(instance.containerId!))}
              disabled={isLoading}
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Model Info */}
          <div className="text-sm">
            <div className="font-medium text-white">Model</div>
            <div className="text-xs" style={{ color: '#a0a0a0' }}>
              {instance.config.default_model || 'Not configured'}
            </div>
          </div>

          {/* Resource Limits */}
          {(instance.cpuLimit || instance.memoryLimit) && (
            <div className="text-xs p-2 rounded" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
              <div className="flex justify-between">
                {instance.cpuLimit && (
                  <span style={{ color: '#a0a0a0' }}>
                    CPU: {instance.cpuLimit} cores
                  </span>
                )}
                {instance.memoryLimit && (
                  <span style={{ color: '#a0a0a0' }}>
                    Memory: {instance.memoryLimit}MB
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Stats */}
          {isRunning && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div
                className="flex items-center gap-2 p-2 rounded"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
              >
                <Cpu className="h-3 w-3" style={{ color: '#ff3b30' }} />
                <div>
                  <div className="font-medium text-white">CPU</div>
                  <div style={{ color: '#a0a0a0' }}>
                    {instance.cpu?.usage ? `${instance.cpu.usage.toFixed(1)}%` : 'N/A'}
                  </div>
                </div>
              </div>
              <div
                className="flex items-center gap-2 p-2 rounded"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
              >
                <HardDrive className="h-3 w-3" style={{ color: '#ff3b30' }} />
                <div>
                  <div className="font-medium text-white">Memory</div>
                  <div style={{ color: '#a0a0a0' }}>
                    {instance.memory?.usage && instance.memory?.limit
                      ? `${(instance.memory.usage / 1024 / 1024).toFixed(0)}MB`
                      : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {isStopped ? (
              <Button
                size="sm"
                className="flex-1"
                onClick={() => handleAction(() => onStart(instance.containerId!))}
                disabled={isLoading}
                style={{ backgroundColor: '#ff3b30', color: 'white' }}
              >
                <Play className="h-4 w-4 mr-1" />
                Start
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-gray-300 border-gray-600 hover:bg-gray-800"
                  onClick={() => handleAction(() => onStop(instance.containerId!))}
                  disabled={isLoading}
                >
                  <Pause className="h-4 w-4 mr-1" />
                  Stop
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-gray-300 border-gray-600 hover:bg-gray-800"
                  onClick={() => handleAction(() => onRestart(instance.containerId!))}
                  disabled={isLoading}
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Restart
                </Button>
              </>
            )}
            {instance.port && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-gray-300 border-gray-600 hover:bg-gray-800"
                onClick={() => window.open(buildInstanceUrl(instance.port!), '_blank')}
                disabled={!isRunning}
              >
                <Activity className="h-4 w-4 mr-1" />
                Connect
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
