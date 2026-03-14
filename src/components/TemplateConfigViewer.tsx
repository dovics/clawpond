'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ZeroClawConfig } from '@/types';
import { Template } from '@/lib/template.service';

interface TemplateConfigViewerProps {
  isOpen: boolean;
  onClose: () => void;
  template: Template | null;
}

export function TemplateConfigViewer({
  isOpen,
  onClose,
  template,
}: TemplateConfigViewerProps) {
  if (!template) return null;

  const config = template.config;

  const formatConfigValue = (value: any): string => {
    if (value === undefined || value === null) return 'Not set';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (Array.isArray(value)) return value.join(', ') || 'Empty';
    return String(value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <span style={{ color: '#ff3b30' }}>›</span>
            Template Configuration: {template.name}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {template.description || 'No description'}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-gray-800">
            <TabsTrigger value="overview" className="data-[state=active]:bg-gray-700">Overview</TabsTrigger>
            <TabsTrigger value="model" className="data-[state=active]:bg-gray-700">Model</TabsTrigger>
            <TabsTrigger value="autonomy" className="data-[state=active]:bg-gray-700">Autonomy</TabsTrigger>
            <TabsTrigger value="security" className="data-[state=active]:bg-gray-700">Security</TabsTrigger>
            <TabsTrigger value="runtime" className="data-[state=active]:bg-gray-700">Runtime</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="bg-gray-800 rounded-lg p-4 space-y-3">
              <h3 className="text-lg font-semibold text-white">Template Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">ID:</span>
                  <span className="text-white ml-2 font-mono">{template.id.slice(0, 8)}...</span>
                </div>
                <div>
                  <span className="text-gray-400">Created:</span>
                  <span className="text-white ml-2">{new Date(template.createdAt).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-gray-400">Updated:</span>
                  <span className="text-white ml-2">{new Date(template.updatedAt).toLocaleDateString()}</span>
                </div>
                {template.sourceInstanceId && (
                  <div>
                    <span className="text-gray-400">Source Instance:</span>
                    <span className="text-white ml-2 font-mono">{template.sourceInstanceId.slice(0, 8)}...</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-4 space-y-3">
              <h3 className="text-lg font-semibold text-white">Quick Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Provider:</span>
                  <span className="text-white">{formatConfigValue(config.default_provider)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Model:</span>
                  <span className="text-white">{formatConfigValue(config.default_model)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Temperature:</span>
                  <span className="text-white">{formatConfigValue(config.default_temperature)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Autonomy Level:</span>
                  <span className="text-white">{formatConfigValue(config.autonomy?.level)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Memory Backend:</span>
                  <span className="text-white">{formatConfigValue(config.memory?.backend)}</span>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="model" className="space-y-4 mt-4">
            <div className="bg-gray-800 rounded-lg p-4 space-y-3">
              <h3 className="text-lg font-semibold text-white">Model Configuration</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Default Provider:</span>
                  <span className="text-white font-mono">{formatConfigValue(config.default_provider)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Default Model:</span>
                  <span className="text-white font-mono">{formatConfigValue(config.default_model)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Temperature:</span>
                  <span className="text-white">{formatConfigValue(config.default_temperature)}</span>
                </div>
              </div>
            </div>

            {config.model_routes && config.model_routes.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-4 space-y-3">
                <h3 className="text-lg font-semibold text-white">Model Routes</h3>
                <pre className="text-xs text-gray-300 overflow-x-auto bg-gray-900 p-3 rounded">
                  {JSON.stringify(config.model_routes, null, 2)}
                </pre>
              </div>
            )}

            {config.embedding_routes && config.embedding_routes.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-4 space-y-3">
                <h3 className="text-lg font-semibold text-white">Embedding Routes</h3>
                <pre className="text-xs text-gray-300 overflow-x-auto bg-gray-900 p-3 rounded">
                  {JSON.stringify(config.embedding_routes, null, 2)}
                </pre>
              </div>
            )}
          </TabsContent>

          <TabsContent value="autonomy" className="space-y-4 mt-4">
            <div className="bg-gray-800 rounded-lg p-4 space-y-3">
              <h3 className="text-lg font-semibold text-white">Autonomy Settings</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Level:</span>
                  <span className="text-white">{formatConfigValue(config.autonomy?.level)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Workspace Only:</span>
                  <span className="text-white">{formatConfigValue(config.autonomy?.workspace_only)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Max Actions/Hour:</span>
                  <span className="text-white">{formatConfigValue(config.autonomy?.max_actions_per_hour)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Max Cost/Day:</span>
                  <span className="text-white">{formatConfigValue(config.autonomy?.max_cost_per_day_cents)}¢</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Require Approval (Medium Risk):</span>
                  <span className="text-white">{formatConfigValue(config.autonomy?.require_approval_for_medium_risk)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Block High Risk:</span>
                  <span className="text-white">{formatConfigValue(config.autonomy?.block_high_risk_commands)}</span>
                </div>
              </div>
            </div>

            {config.autonomy?.allowed_commands && config.autonomy.allowed_commands.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-4 space-y-3">
                <h3 className="text-lg font-semibold text-white">Allowed Commands</h3>
                <div className="flex flex-wrap gap-2">
                  {config.autonomy.allowed_commands.map((cmd, i) => (
                    <span key={i} className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                      {cmd}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="security" className="space-y-4 mt-4">
            <div className="bg-gray-800 rounded-lg p-4 space-y-3">
              <h3 className="text-lg font-semibold text-white">Security Configuration</h3>

              {config.security?.sandbox && (
                <div className="space-y-2">
                  <h4 className="text-md font-medium text-white">Sandbox</h4>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Backend:</span>
                      <span className="text-white">{formatConfigValue(config.security.sandbox.backend)}</span>
                    </div>
                  </div>
                </div>
              )}

              {config.security?.resources && (
                <div className="space-y-2">
                  <h4 className="text-md font-medium text-white">Resources</h4>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Max Memory:</span>
                      <span className="text-white">{formatConfigValue(config.security.resources.max_memory_mb)} MB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Max CPU Time:</span>
                      <span className="text-white">{formatConfigValue(config.security.resources.max_cpu_time_seconds)}s</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Memory Monitoring:</span>
                      <span className="text-white">{formatConfigValue(config.security.resources.memory_monitoring)}</span>
                    </div>
                  </div>
                </div>
              )}

              {config.security?.audit && (
                <div className="space-y-2">
                  <h4 className="text-md font-medium text-white">Audit</h4>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Enabled:</span>
                      <span className="text-white">{formatConfigValue(config.security.audit.enabled)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Log Path:</span>
                      <span className="text-white font-mono">{formatConfigValue(config.security.audit.log_path)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="runtime" className="space-y-4 mt-4">
            <div className="bg-gray-800 rounded-lg p-4 space-y-3">
              <h3 className="text-lg font-semibold text-white">Runtime Configuration</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Kind:</span>
                  <span className="text-white">{formatConfigValue(config.runtime?.kind)}</span>
                </div>
              </div>

              {config.runtime?.docker && (
                <div className="space-y-2 mt-4">
                  <h4 className="text-md font-medium text-white">Docker Settings</h4>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Image:</span>
                      <span className="text-white font-mono">{formatConfigValue(config.runtime.docker.image)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Network:</span>
                      <span className="text-white">{formatConfigValue(config.runtime.docker.network)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Memory Limit:</span>
                      <span className="text-white">{formatConfigValue(config.runtime.docker.memory_limit_mb)} MB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">CPU Limit:</span>
                      <span className="text-white">{formatConfigValue(config.runtime.docker.cpu_limit)} cores</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Read-only RootFS:</span>
                      <span className="text-white">{formatConfigValue(config.runtime.docker.read_only_rootfs)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Mount Workspace:</span>
                      <span className="text-white">{formatConfigValue(config.runtime.docker.mount_workspace)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {config.observability && (
              <div className="bg-gray-800 rounded-lg p-4 space-y-3">
                <h3 className="text-lg font-semibold text-white">Observability</h3>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Backend:</span>
                    <span className="text-white">{formatConfigValue(config.observability.backend)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Trace Mode:</span>
                    <span className="text-white">{formatConfigValue(config.observability.runtime_trace_mode)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Trace Path:</span>
                    <span className="text-white font-mono">{formatConfigValue(config.observability.runtime_trace_path)}</span>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
