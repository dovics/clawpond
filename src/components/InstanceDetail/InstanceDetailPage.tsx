'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, RotateCcw, Play, Pause, RotateCcw as Restart, Trash2, Loader2, RefreshCw, Cpu, HardDrive, Network, Terminal, FileText, Settings, AlertTriangle, Activity, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/toaster';
import { ZeroClawInstance } from '@/types';
import { cn, formatDate } from '@/lib/utils';
import { api } from '@/lib/api-client';
import { useInstances } from '@/components/providers/InstanceProvider';
import { SkillsManager } from './SkillsManager';
import { FileEditor } from './FileEditor';

// Environment variable type
interface EnvVar {
  key: string;
  value: string;
}

interface InstanceDetailPageProps {
  instanceIdPromise: Promise<{ id: string }>;
}

// 分离状态数据，用于高频更新
interface InstanceStatus {
  status: string;
  cpu?: { usage: number };
  memory?: { usage: number; limit: number };
}

export default function InstanceDetailPage({ instanceIdPromise }: InstanceDetailPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { refresh: refreshInstances } = useInstances();
  const [instanceId, setInstanceId] = useState<string | null>(null);
  const [instance, setInstance] = useState<ZeroClawInstance | null>(null);
  const [status, setStatus] = useState<InstanceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  // Form state - 单独管理，不受自动刷新影响
  const [port, setPort] = useState<number | undefined>(undefined);
  const [cpuLimit, setCpuLimit] = useState<number | undefined>(undefined);
  const [memoryLimit, setMemoryLimit] = useState<number | undefined>(undefined);
  const [image, setImage] = useState<string | undefined>(undefined);
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [originalValues, setOriginalValues] = useState<{
    port?: number;
    cpuLimit?: number;
    memoryLimit?: number;
    image?: string;
    envVars?: EnvVar[];
  }>({});

  // 标记是否需要初始化表单
  const formInitialized = useRef(false);

  // Resolve instance ID from promise
  useEffect(() => {
    instanceIdPromise.then(params => setInstanceId(params.id));
  }, [instanceIdPromise]);

  // Fetch instance details (完整数据，只在初始加载时获取)
  const fetchInstance = useCallback(async () => {
    if (!instanceId) return;

    setLoading(true);
    try {
      const response = await api.get(`/api/containers/${instanceId}`);
      if (response.ok) {
        const data = await response.json();
        setInstance(data);

        // 只在首次加载时初始化表单值
        if (!formInitialized.current) {
          setPort(data.port);
          setCpuLimit(data.cpuLimit);
          setMemoryLimit(data.memoryLimit);
          setImage(data.image);

          // Fetch environment variables
          let envVars: EnvVar[] = [];
          try {
            const envResponse = await api.get(`/api/containers/${data.containerId}/env`);
            if (envResponse.ok) {
              const envData = await envResponse.json();
              const envArray = envData.env || [];
              // Filter out system env vars and parse to key-value pairs
              const systemEnvKeys = new Set([
                'PATH', 'HOME', 'USER', 'SHELL', 'LANG', 'LC_ALL',
                'PYTHONPATH', 'NODE_PATH', 'GOPATH', 'CARGO_HOME',
                'TZ', 'TERM', 'HOSTNAME', 'PWD', 'SHLVL', 'MOUNT_WORKSPACE_ROOT'
              ]);
              envVars = envArray
                .filter((env: string) => {
                  const eqIndex = env.indexOf('=');
                  if (eqIndex > 0) {
                    const key = env.substring(0, eqIndex);
                    return !systemEnvKeys.has(key);
                  }
                  return false;
                })
                .map((env: string) => {
                  const eqIndex = env.indexOf('=');
                  return {
                    key: env.substring(0, eqIndex),
                    value: env.substring(eqIndex + 1)
                  };
                });
            }
          } catch (envError) {
            console.error('Error fetching env vars:', envError);
          }

          setEnvVars(envVars);
          setOriginalValues({
            port: data.port,
            cpuLimit: data.cpuLimit,
            memoryLimit: data.memoryLimit,
            image: data.image,
            envVars: envVars,
          });
          formInitialized.current = true;
        }
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to fetch instance details',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching instance:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch instance details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [instanceId, toast]);

  // Fetch instance status (仅状态数据，高频刷新)
  const fetchStatus = useCallback(async () => {
    if (!instanceId) return;

    setStatusLoading(true);
    try {
      const response = await api.get(`/api/containers/${instanceId}`);
      if (response.ok) {
        const data = await response.json();
        // 只更新需要高频刷新的状态数据
        setStatus({
          status: data.status,
          cpu: data.cpu,
          memory: data.memory,
        });
      }
    } catch (error) {
      console.error('Error fetching status:', error);
    } finally {
      setStatusLoading(false);
    }
  }, [instanceId]);

  useEffect(() => {
    if (instanceId) {
      fetchInstance();
    }
  }, [instanceId, fetchInstance]);

  // Auto-refresh only status data (every 5 seconds)
  useEffect(() => {
    if (!instanceId || !instance) return;

    // 立即获取一次状态
    fetchStatus();

    const interval = setInterval(() => {
      fetchStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, [instanceId, instance, fetchStatus]);

  // Check if form has unsaved changes
  // Check if env vars have changed
  const hasEnvChanges = JSON.stringify(envVars) !== JSON.stringify(originalValues.envVars);

  const hasChanges = instance && (
    port !== originalValues.port ||
    cpuLimit !== originalValues.cpuLimit ||
    memoryLimit !== originalValues.memoryLimit ||
    image !== originalValues.image ||
    hasEnvChanges
  );

  // Handle add environment variable
  const handleAddEnvVar = () => {
    setEnvVars([...envVars, { key: '', value: '' }]);
  };

  // Handle remove environment variable
  const handleRemoveEnvVar = (index: number) => {
    const newEnvVars = [...envVars];
    newEnvVars.splice(index, 1);
    setEnvVars(newEnvVars);
  };

  // Handle update environment variable
  const handleEnvVarChange = (index: number, field: 'key' | 'value', newValue: string) => {
    const newEnvVars = [...envVars];
    newEnvVars[index][field] = newValue;
    setEnvVars(newEnvVars);
  };

  // Handle save and rebuild
  const handleSave = async () => {
    if (!instance?.containerId) return;

    setSaving(true);
    setRebuilding(true);

    // Convert env vars to array format
    const envVarsArray = envVars
      .filter(e => e.key.trim() !== '')
      .map(e => `${e.key}=${e.value}`);

    try {
      const response = await api.put(`/api/containers/${instance.containerId}/limits`, {
        memoryLimit,
        cpuLimit,
        port,
        image,
        envVars: envVarsArray,
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Container configuration updated and rebuilt successfully',
          variant: 'success',
        });
        // Refresh instance list and navigate back to homepage
        await refreshInstances();
        router.push('/');
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to update container configuration',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast({
        title: 'Error',
        description: 'Failed to update container configuration',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
      setRebuilding(false);
    }
  };

  // Handle reset
  const handleReset = () => {
    setPort(originalValues.port);
    setCpuLimit(originalValues.cpuLimit);
    setMemoryLimit(originalValues.memoryLimit);
    setImage(originalValues.image);
    setEnvVars(originalValues.envVars || []);
    toast({
      title: 'Reset',
      description: 'Configuration has been reset to original values',
    });
  };

  // Handle container actions
  const handleContainerAction = async (action: 'start' | 'stop' | 'restart') => {
    if (!instance?.containerId) return;

    try {
      const response = await api.patch(`/api/containers/${instance.containerId}`, { action });
      if (response.ok) {
        toast({
          title: 'Success',
          description: `Container ${action}ed successfully`,
          variant: 'success',
        });
        await fetchInstance();
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || `Failed to ${action} container`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error(`Error ${action}ing container:`, error);
      toast({
        title: 'Error',
        description: `Failed to ${action} container`,
        variant: 'destructive',
      });
    }
  };

  const statusColors: Record<string, string> = {
    running: 'bg-green-500',
    stopped: 'bg-red-500',
    paused: 'bg-yellow-500',
    restarting: 'bg-blue-500',
    exited: 'bg-gray-500',
    created: 'bg-purple-500',
    unknown: 'bg-gray-400',
  };

  if (!instanceId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
                title="Back"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  {loading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <>
                      {instance?.name || 'Instance Details'}
                      {instance && (
                        <span className={cn(
                          'w-3 h-3 rounded-full',
                          statusColors[status?.status || instance.status] || 'bg-gray-400'
                        )} />
                      )}
                    </>
                  )}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {instance && (
                    <>
                      Status: <Badge variant={status?.status === 'running' ? 'default' : 'secondary'}>
                        {status?.status || instance.status}
                      </Badge>
                      {hasChanges && <span className="text-yellow-500 ml-2">● Unsaved changes</span>}
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {instance && (
                <>
                  {(status?.status || instance.status) === 'running' ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleContainerAction('stop')}
                        disabled={saving || rebuilding}
                      >
                        <Pause className="h-4 w-4 mr-2" />
                        Stop
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleContainerAction('restart')}
                        disabled={saving || rebuilding}
                      >
                        <Restart className="h-4 w-4 mr-2" />
                        Restart
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleContainerAction('start')}
                      disabled={saving || rebuilding}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Start
                    </Button>
                  )}
                </>
              )}
              <Button
                variant="outline"
                onClick={() => router.push(`/instances/${instanceId}/config`)}
                disabled={!instance}
              >
                <Settings className="h-4 w-4 mr-2" />
                Config Editor
              </Button>
              {hasChanges && (
                <>
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    disabled={saving || rebuilding}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saving || rebuilding}
                  >
                    {saving || rebuilding ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    {saving || rebuilding ? 'Rebuilding...' : 'Save & Rebuild'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : instance ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Column - Fixed Status Cards */}
            <div className="space-y-6">
              {/* Status Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <RefreshCw className="h-5 w-5" />
                    Instance Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge variant={status?.status === 'running' ? 'default' : 'secondary'}>
                      {status?.status || instance.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">ID</span>
                    <span className="text-sm font-mono">{instance.id}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Container ID</span>
                    <span className="text-sm font-mono truncate max-w-[150px]">
                      {instance.containerId}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Port</span>
                    <span className="text-sm">{instance.port || 'Not exposed'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Created</span>
                    <span className="text-sm">
                      {formatDate(instance.createdAt)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Last Active</span>
                    <span className="text-sm">
                      {formatDate(instance.lastActive)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Resource Usage */}
              {(status?.status || instance.status) === 'running' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Resource Usage
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* CPU */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm flex items-center gap-2">
                          <Cpu className="h-4 w-4" />
                          CPU Usage
                        </span>
                        <span className="text-sm font-medium">
                          {status?.cpu?.usage?.toFixed(1) || instance.cpu?.usage?.toFixed(1) || '0.0'}%
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${Math.min(status?.cpu?.usage || instance.cpu?.usage || 0, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Memory */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm flex items-center gap-2">
                          <HardDrive className="h-4 w-4" />
                          Memory Usage
                        </span>
                        <span className="text-sm font-medium">
                          {(() => {
                            const usage = status?.memory?.usage ?? instance.memory?.usage;
                            const limit = status?.memory?.limit ?? instance.memory?.limit;
                            return usage
                              ? `${(usage / 1024 / 1024).toFixed(0)}MB`
                              : '0MB';
                          })()} / {(() => {
                            const limit = status?.memory?.limit ?? instance.memory?.limit;
                            return limit
                              ? `${(limit / 1024 / 1024).toFixed(0)}MB`
                              : 'N/A';
                          })()}
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{
                            width: `${(() => {
                              const limit = status?.memory?.limit ?? instance.memory?.limit;
                              const usage = status?.memory?.usage ?? instance.memory?.usage ?? 0;
                              return limit ? (usage / limit * 100) : 0;
                            })()}%`
                          }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => window.open(`/instances/${instanceId}/config`, '_blank')}
                    disabled={!instance.port}
                  >
                    <Terminal className="h-4 w-4 mr-2" />
                    Open Console
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => router.push(`/instances/${instanceId}/logs`)}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    View Logs
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => router.push(`/instances/${instanceId}/config`)}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Edit Configuration
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Tabbed Content */}
            <div className="lg:col-span-3">
              <Tabs defaultValue="config" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3 h-auto p-1 gap-1 bg-transparent">
                  <TabsTrigger value="config" className="text-base font-semibold py-3 px-4 border-2 border-transparent data-[state=active]:border-red-500 data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400 rounded-lg transition-all">
                    Container Configuration
                  </TabsTrigger>
                  <TabsTrigger value="workspace" className="text-base font-semibold py-3 px-4 border-2 border-transparent data-[state=active]:border-red-500 data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400 rounded-lg transition-all">
                    Workspace
                  </TabsTrigger>
                  <TabsTrigger value="skills" className="text-base font-semibold py-3 px-4 border-2 border-transparent data-[state=active]:border-red-500 data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400 rounded-lg transition-all">
                    Skills
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="config" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Container Configuration
                      </CardTitle>
                      <CardDescription>
                        Adjust container settings. Changes will require a container rebuild to take effect.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Rebuild Warning */}
                      {hasChanges && (
                        <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                          <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium text-yellow-500">Unsaved Changes</p>
                            <p className="text-sm text-muted-foreground">
                              You have unsaved changes. Click "Save & Rebuild" to apply them.
                              The container will be stopped, rebuilt, and restarted automatically.
                            </p>
                          </div>
                        </div>
                      )}

                      <Separator />

                      {/* Image Configuration */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <HardDrive className="h-5 w-5" />
                          <h3 className="font-medium">Container Image</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Change the Docker image used by this container. The container will be recreated with the new image.
                        </p>
                        <div className="space-y-2">
                          <Label htmlFor="image">Docker Image</Label>
                          <Input
                            id="image"
                            placeholder="zeroclaw/zeroclaw:latest"
                            value={image ?? ''}
                            onChange={(e) => setImage(e.target.value || undefined)}
                          />
                          <p className="text-xs text-muted-foreground">
                            Example: zeroclaw/zeroclaw:latest, zeroclaw/zeroclaw:v1.2.3
                          </p>
                        </div>
                        {image !== originalValues.image && (
                          <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                            <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                            <p className="text-sm text-yellow-500">
                              Container image has been changed. Click "Save & Rebuild" to apply the new image.
                            </p>
                          </div>
                        )}
                      </div>

                      <Separator />

                      {/* Port Configuration */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Network className="h-5 w-5" />
                          <h3 className="font-medium">Network</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="port">Container Port</Label>
                            <Input
                              id="port"
                              type="number"
                              placeholder="8080"
                              value={port ?? ''}
                              onChange={(e) => setPort(e.target.value ? parseInt(e.target.value) : undefined)}
                            />
                            <p className="text-xs text-muted-foreground">
                              The port inside the container (default: 8080)
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label>Exposed Port</Label>
                            <div className="h-10 flex items-center px-3 rounded-md border bg-muted text-muted-foreground">
                              {port ? `Host: ${port} -> Container: ${port}` : 'Not exposed'}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Same as container port when exposed
                            </p>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* Resource Limits */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <HardDrive className="h-5 w-5" />
                          <h3 className="font-medium">Resource Limits</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="cpuLimit">CPU Cores</Label>
                            <Input
                              id="cpuLimit"
                              type="number"
                              step="0.5"
                              min="0.5"
                              max="32"
                              placeholder="2"
                              value={cpuLimit ?? ''}
                              onChange={(e) => setCpuLimit(e.target.value ? parseFloat(e.target.value) : undefined)}
                            />
                            <p className="text-xs text-muted-foreground">
                              Number of CPU cores (e.g., 0.5 for half a core, 2 for two cores)
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="memoryLimit">Memory (MB)</Label>
                            <Input
                              id="memoryLimit"
                              type="number"
                              min="256"
                              max="65536"
                              placeholder="4096"
                              value={memoryLimit ?? ''}
                              onChange={(e) => setMemoryLimit(e.target.value ? parseInt(e.target.value) : undefined)}
                            />
                            <p className="text-xs text-muted-foreground">
                              Memory limit in megabytes (e.g., 4096 for 4GB)
                            </p>
                          </div>
                        </div>

                        {/* Current Limits Display */}
                        <div className="p-4 bg-muted rounded-lg">
                          <h4 className="font-medium mb-2">Current Configuration</h4>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">CPU Limit:</span>
                              <span className="ml-2 font-medium">{instance.cpuLimit ?? 'Default'} cores</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Memory Limit:</span>
                              <span className="ml-2 font-medium">{instance.memoryLimit ?? 'Default'} MB</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Port:</span>
                              <span className="ml-2 font-medium">{instance.port ?? 'Not exposed'}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* Environment Variables */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <HardDrive className="h-5 w-5" />
                            <h3 className="font-medium">Environment Variables</h3>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleAddEnvVar}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Variable
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Configure custom environment variables for the container. Changes will require a container rebuild.
                        </p>

                        {envVars.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                            <p>No environment variables configured</p>
                            <p className="text-sm">Click "Add Variable" to add one</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {envVars.map((envVar, index) => (
                              <div key={index} className="flex items-center gap-3">
                                <div className="flex-1 grid grid-cols-2 gap-3">
                                  <Input
                                    placeholder="KEY"
                                    value={envVar.key}
                                    onChange={(e) => handleEnvVarChange(index, 'key', e.target.value)}
                                    className="font-mono"
                                  />
                                  <Input
                                    placeholder="Value"
                                    value={envVar.value}
                                    onChange={(e) => handleEnvVarChange(index, 'value', e.target.value)}
                                  />
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveEnvVar(index)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}

                        {hasEnvChanges && (
                          <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                            <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                            <p className="text-sm text-yellow-500">
                              Environment variables have been modified. Click "Save & Rebuild" to apply changes.
                            </p>
                          </div>
                        )}
                      </div>

                      <Separator />

                      {/* Instance Configuration */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Settings className="h-5 w-5" />
                          <h3 className="font-medium">Instance Configuration</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-sm text-muted-foreground">Default Provider</span>
                            <p className="font-medium">{instance.config?.default_provider || 'Not set'}</p>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">Default Model</span>
                            <p className="font-medium">{instance.config?.default_model || 'Not set'}</p>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">Temperature</span>
                            <p className="font-medium">{instance.config?.default_temperature ?? 'Default'}</p>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">Gateway Port</span>
                            <p className="font-medium">{instance.config?.gateway?.port ?? 'Not set'}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="workspace">
                  <div className="space-y-6">
                    <FileEditor
                      instanceId={instanceId!}
                      instanceName={instance.name}
                      fileName="AGENTS.md"
                      fileLabel="AGENTS"
                    />
                    <FileEditor
                      instanceId={instanceId!}
                      instanceName={instance.name}
                      fileName="SOUL.md"
                      fileLabel="SOUL"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="skills">
                  <SkillsManager
                    instanceId={instanceId!}
                    instanceName={instance.name}
                    containerId={instance.containerId}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">Instance not found</p>
            <Button onClick={() => router.back()} className="mt-4">
              Go Back
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
