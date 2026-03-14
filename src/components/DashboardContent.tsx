'use client';

import { useState, useEffect } from 'react';
import { Plus, RefreshCw, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InstanceCard } from '@/components/InstanceCard';
import { ConfigEditor } from '@/components/ConfigEditor';
import { CreateInstanceDialog } from '@/components/CreateInstanceDialog';
import { TemplateManagerDialog } from '@/components/TemplateManagerDialog';
import { DeleteInstanceDialog } from '@/components/DeleteInstanceDialog';
import { LogsViewer } from '@/components/LogsViewer';
import { ConsoleDialog } from '@/components/ConsoleDialog';
import { ZeroClawInstance, CreateInstanceOptions } from '@/types';
import { List } from 'lucide-react';
import { AuthGate } from '@/components/AuthGate';
import { api } from '@/lib/api-client';
import { useToast } from '@/components/ui/toaster';

export function DashboardContent() {
  const { toast } = useToast();
  const [instances, setInstances] = useState<ZeroClawInstance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInstance, setSelectedInstance] = useState<ZeroClawInstance | null>(null);
  const [logsInstance, setLogsInstance] = useState<ZeroClawInstance | null>(null);
  const [consoleInstance, setConsoleInstance] = useState<ZeroClawInstance | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false);
  const [templateChangeTrigger, setTemplateChangeTrigger] = useState(0);
  const [deletingInstance, setDeletingInstance] = useState<ZeroClawInstance | null>(null);

  // Fetch instances
  const fetchInstances = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/api/containers');
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
      const response = await api.patch(`/api/containers/${containerId}`, { action });
      if (response.ok) {
        fetchInstances();
      }
    } catch (error) {
      console.error(`Error ${action} instance:`, error);
    }
  };

  const handleDeleteClick = (instance: ZeroClawInstance) => {
    setDeletingInstance(instance);
  };

  const handleDeleteConfirm = async (deleteWorkspace: boolean) => {
    if (!deletingInstance) return;

    try {
      const response = await api.delete(`/api/containers/${deletingInstance.containerId}`, {
        deleteWorkspace,
      });

      if (response.ok) {
        const result = await response.json();
        if (deleteWorkspace && result.workspaceDeleted) {
          console.log('Workspace folder deleted successfully');
        } else if (deleteWorkspace) {
          console.warn('Failed to delete workspace folder');
        }
        fetchInstances();
        toast({
          title: "Success",
          description: deleteWorkspace
            ? "Instance and workspace deleted successfully"
            : "Instance deleted successfully",
          variant: "success",
        });
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: `Failed to delete instance: ${error.error}`,
          variant: "destructive",
        });
        throw new Error(error.error);
      }
    } catch (error) {
      console.error('Error deleting instance:', error);
      if (!(error instanceof Error)) {
        toast({
          title: "Error",
          description: "Failed to delete instance. Please try again.",
          variant: "destructive",
        });
      }
      throw error;
    } finally {
      setDeletingInstance(null);
    }
  };

  const handleConfigSave = async (config: any, resourceLimits?: { memoryLimit?: number; cpuLimit?: number; port?: number }) => {
    if (!selectedInstance?.containerId) return;

    try {
      // First, update the config file
      const response = await api.put(`/api/containers/${selectedInstance.containerId}/config`, config);

      if (!response.ok) {
        throw new Error('Failed to update config');
      }

      // Get the new container ID (may be different if container was recreated)
      const { containerId: newContainerId } = await response.json();

      // Check if any resource limits or port changed
      const memoryChanged = resourceLimits?.memoryLimit !== undefined &&
                          resourceLimits.memoryLimit !== selectedInstance.memoryLimit;
      const cpuChanged = resourceLimits?.cpuLimit !== undefined &&
                        resourceLimits.cpuLimit !== selectedInstance.cpuLimit;
      const portChanged = resourceLimits?.port !== undefined &&
                         resourceLimits.port !== selectedInstance.port;

      if (memoryChanged || cpuChanged || portChanged) {
        console.log(`Resource settings changed - Memory: ${selectedInstance.memoryLimit} -> ${resourceLimits?.memoryLimit}, CPU: ${selectedInstance.cpuLimit} -> ${resourceLimits?.cpuLimit}, Port: ${selectedInstance.port} -> ${resourceLimits?.port}`);
        // Use the new container ID for resource limits update
        const limitsResponse = await api.put(`/api/containers/${newContainerId}/limits`, resourceLimits);

        if (!limitsResponse.ok) {
          console.warn('Failed to update resource limits, but config was updated');
        }
      } else {
        console.log('Resource limits unchanged, skipping API call');
      }

      fetchInstances();
      setSelectedInstance(null);
      toast({
        title: "Success",
        description: "Configuration updated successfully",
        variant: "success",
      });
    } catch (error) {
      console.error('Error updating config:', error);
      toast({
        title: "Error",
        description: "Failed to update config. Please check your connection.",
        variant: "destructive",
      });
    }
  };

  const handleCreateInstance = async (options: CreateInstanceOptions) => {
    try {
      const response = await api.post('/api/containers', options);

      if (response.ok) {
        await fetchInstances();
        setIsCreateDialogOpen(false);
        toast({
          title: "Success",
          description: "Instance created successfully",
          variant: "success",
        });
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: `Failed to create instance: ${error.error}`,
          variant: "destructive",
        });
        throw new Error(error.error);
      }
    } catch (error) {
      console.error('Error creating instance:', error);
      // Only show toast if not already shown above
      if (!(error instanceof Error)) {
        toast({
          title: "Error",
          description: "Failed to create instance. Please check your Docker connection.",
          variant: "destructive",
        });
      }
      throw error; // Re-throw to let dialog handle error state
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
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <img
                src="/logo.png"
                alt="ClawPond Logo"
                className="w-10 h-10"
              />
              <span>ClawPond</span>
            </h1>
            <p className="text-gray-400 mt-1 ml-14">
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
                onDelete={handleDeleteClick}
                onConfig={setSelectedInstance}
                onLogs={setLogsInstance}
                onConsole={setConsoleInstance}
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
          port={selectedInstance.port}
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

      {consoleInstance && (
        <ConsoleDialog
          instance={consoleInstance}
          open={!!consoleInstance}
          onClose={() => setConsoleInstance(null)}
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

      {deletingInstance && (
        <DeleteInstanceDialog
          isOpen={!!deletingInstance}
          instanceName={deletingInstance.name}
          onClose={() => setDeletingInstance(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
    </AuthGate>
  );
}
