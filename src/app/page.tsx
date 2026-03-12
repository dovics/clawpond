'use client';

import { useState, useEffect } from 'react';
import { Plus, RefreshCw, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InstanceCard } from '@/components/InstanceCard';
import { ConfigEditor } from '@/components/ConfigEditor';
import { CreateInstanceDialog } from '@/components/CreateInstanceDialog';
import { TemplateManagerDialog } from '@/components/TemplateManagerDialog';
import { LogsViewer } from '@/components/LogsViewer';
import { ZeroClawInstance, CreateInstanceOptions } from '@/types';
import { List } from 'lucide-react';
import { AuthGate } from '@/components/AuthGate';

export default function Dashboard() {
  const [instances, setInstances] = useState<ZeroClawInstance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInstance, setSelectedInstance] = useState<ZeroClawInstance | null>(null);
  const [logsInstance, setLogsInstance] = useState<ZeroClawInstance | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false);
  const [templateChangeTrigger, setTemplateChangeTrigger] = useState(0);

  // Fetch instances
  const fetchInstances = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/containers');
      if (response.ok) {
        const data = await response.json();
        setInstances(data);
      }
    } catch (error) {
      console.error('Error fetching instances:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Instance actions
  const handleInstanceAction = async (containerId: string, action: string) => {
    try {
      const response = await fetch(`/api/containers/${containerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        fetchInstances();
      }
    } catch (error) {
      console.error(`Error ${action} instance:`, error);
    }
  };

  const handleDelete = async (containerId: string) => {
    if (!confirm('Are you sure you want to delete this instance? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/containers/${containerId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchInstances();
      }
    } catch (error) {
      console.error('Error deleting instance:', error);
    }
  };

  const handleConfigSave = async (config: any, resourceLimits?: { memoryLimit?: number; cpuLimit?: number }) => {
    if (!selectedInstance?.containerId) return;

    try {
      // First, update the config file
      const response = await fetch(`/api/containers/${selectedInstance.containerId}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error('Failed to update config');
      }

      // Get the new container ID (may be different if container was recreated)
      const { containerId: newContainerId } = await response.json();

      // Then, update resource limits if they changed
      // Only call the API if limits are actually different
      const memoryChanged = resourceLimits?.memoryLimit !== undefined &&
                          resourceLimits.memoryLimit !== selectedInstance.memoryLimit;
      const cpuChanged = resourceLimits?.cpuLimit !== undefined &&
                        resourceLimits.cpuLimit !== selectedInstance.cpuLimit;

      if (memoryChanged || cpuChanged) {
        console.log(`Resource limits changed - Memory: ${selectedInstance.memoryLimit} -> ${resourceLimits?.memoryLimit}, CPU: ${selectedInstance.cpuLimit} -> ${resourceLimits?.cpuLimit}`);
        // Use the new container ID for resource limits update
        const limitsResponse = await fetch(`/api/containers/${newContainerId}/limits`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(resourceLimits),
        });

        if (!limitsResponse.ok) {
          console.warn('Failed to update resource limits, but config was updated');
        }
      } else {
        console.log('Resource limits unchanged, skipping API call');
      }

      fetchInstances();
      setSelectedInstance(null);
    } catch (error) {
      console.error('Error updating config:', error);
      alert('Failed to update config. Please check your connection.');
    }
  };

  const handleCreateInstance = async (options: CreateInstanceOptions) => {
    try {
      const response = await fetch('/api/containers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
      });

      if (response.ok) {
        fetchInstances();
        setIsCreateDialogOpen(false);
      } else {
        const error = await response.json();
        alert(`Failed to create instance: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating instance:', error);
      alert('Failed to create instance. Please check your Docker connection.');
    }
  };

  // Auto-refresh
  useEffect(() => {
    fetchInstances();
    const interval = setInterval(fetchInstances, 5000);
    return () => clearInterval(interval);
  }, []);

  // Handle templates change (triggered by TemplateManagerDialog)
  const handleTemplatesChange = () => {
    setTemplateChangeTrigger(prev => prev + 1);
  };

  const runningCount = instances.filter(i => i.status === 'running').length;
  const stoppedCount = instances.filter(i => i.status === 'stopped' || i.status === 'exited').length;

  return (
    <AuthGate>
      <div className="min-h-screen relative bg-background">
        <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
              <span className="text-primary text-2xl">›</span>
              ClawPond
            </h1>
            <p className="text-gray-400 mt-1">
              AI Agent Instance Management Dashboard
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={fetchInstances}
              disabled={isLoading}
              className="text-gray-300 border-gray-600 hover:bg-gray-800"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsTemplateManagerOpen(true)}
              className="text-gray-300 border-gray-600 hover:bg-gray-800"
            >
              <List className="h-4 w-4 mr-2" />
              Manage Templates
            </Button>
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-primary text-primary-foreground"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Instance
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white">Total Instances</CardTitle>
              <Activity className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{instances.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white">Running</CardTitle>
              <div className="h-2 w-2 rounded-full bg-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{runningCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white">Stopped</CardTitle>
              <div className="h-2 w-2 rounded-full bg-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stoppedCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Instances Grid */}
        {instances.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <span className="text-primary">›</span>
                No Instances Found
              </CardTitle>
              <CardDescription className="text-gray-400">
                Create your first AI Agent instance to get started.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                className="bg-primary text-primary-foreground"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Instance
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {instances.map((instance) => (
              <InstanceCard
                key={instance.id}
                instance={instance}
                onStart={(id) => handleInstanceAction(id, 'start')}
                onStop={(id) => handleInstanceAction(id, 'stop')}
                onRestart={(id) => handleInstanceAction(id, 'restart')}
                onDelete={handleDelete}
                onConfig={setSelectedInstance}
                onLogs={setLogsInstance}
              />
            ))}
          </div>
        )}
      </div>

      {/* Dialogs */}
      {selectedInstance && (
        <ConfigEditor
          isOpen={!!selectedInstance}
          onClose={() => setSelectedInstance(null)}
          onSave={handleConfigSave}
          onTemplatesChange={handleTemplatesChange}
          config={selectedInstance.config}
          instanceName={selectedInstance.name}
          containerId={selectedInstance.containerId!}
          memoryLimit={selectedInstance.memoryLimit}
          cpuLimit={selectedInstance.cpuLimit}
        />
      )}

      {logsInstance && (
        <LogsViewer
          isOpen={!!logsInstance}
          onClose={() => setLogsInstance(null)}
          containerId={logsInstance.containerId!}
          containerName={logsInstance.name}
        />
      )}

      <CreateInstanceDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onCreate={handleCreateInstance}
        templateChangeTrigger={templateChangeTrigger}
      />

      <TemplateManagerDialog
        isOpen={isTemplateManagerOpen}
        onClose={() => setIsTemplateManagerOpen(false)}
        onTemplatesChange={handleTemplatesChange}
        instances={instances}
      />
    </div>
    </AuthGate>
  );
}
