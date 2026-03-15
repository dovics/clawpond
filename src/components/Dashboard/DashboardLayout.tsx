'use client';

import React from 'react';
import { useInstances } from '@/components/providers';
import { Button } from '@/components/ui/button';
import { Plus, Layers } from 'lucide-react';
import { InstanceCard } from '@/components/InstanceCard';
import { useInstanceDialogs } from './useInstanceDialogs';
import { CreateInstanceDialog } from './dialogs/CreateInstanceDialog';
import { TemplateManagerDialog } from './dialogs/TemplateManagerDialog';
import { LogsViewerDialog } from './dialogs/LogsViewerDialog';
import { ConsoleDialog } from '@/components/ConsoleDialog';

/**
 * DashboardLayout component
 * Main dashboard layout with instance management
 */
export function DashboardLayout() {
  const { instances, loading, error, refresh } = useInstances();
  const {
    openDialog,
    selectedInstance,
    openCreateDialog,
    openTemplateDialog,
    openLogsDialog,
    openConsoleDialog,
    closeDialog,
  } = useInstanceDialogs();

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">ClawPond</h1>
          <p className="text-muted-foreground">
            AI Agent Instance Management Dashboard
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={openTemplateDialog}
          >
            <Layers className="mr-2 h-4 w-4" />
            Templates
          </Button>

          <Button
            onClick={openCreateDialog}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Instance
          </Button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-4 p-4 bg-destructive/10 text-destructive rounded-lg">
          <p className="font-semibold">Error loading instances</p>
          <p className="text-sm">{error.message}</p>
        </div>
      )}

      {/* Loading state */}
      {loading && instances.length === 0 && (
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading instances...</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && instances.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🐋</div>
          <h2 className="text-2xl font-semibold mb-2">No instances yet</h2>
          <p className="text-muted-foreground mb-6">
            Create your first AI agent instance to get started
          </p>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Create Instance
          </Button>
        </div>
      )}

      {/* Instances grid */}
      {instances.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {instances.map(instance => (
            <InstanceCard
              key={instance.id}
              instance={instance}
              onStart={async (id) => {
                await fetch(`/api/containers/${id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'start' }),
                });
                refresh();
              }}
              onStop={async (id) => {
                await fetch(`/api/containers/${id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'stop' }),
                });
                refresh();
              }}
              onRestart={async (id) => {
                await fetch(`/api/containers/${id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'restart' }),
                });
                refresh();
              }}
              onDelete={async (inst) => {
                if (confirm(`Delete instance ${inst.name}?`)) {
                  await fetch(`/api/containers/${inst.id}`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ deleteWorkspace: true }),
                  });
                  refresh();
                }
              }}
              onLogs={() => openLogsDialog(instance)}
              onConsole={() => openConsoleDialog(instance)}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      {openDialog === 'create' && (
        <CreateInstanceDialog
          open={true}
          onClose={closeDialog}
        />
      )}

      {openDialog === 'template' && (
        <TemplateManagerDialog
          open={true}
          onClose={closeDialog}
        />
      )}

      {openDialog === 'logs' && selectedInstance && (
        <LogsViewerDialog
          open={true}
          instance={selectedInstance}
          onClose={closeDialog}
        />
      )}

      {openDialog === 'console' && selectedInstance && (
        <ConsoleDialog
          open={true}
          instance={selectedInstance}
          onClose={closeDialog}
        />
      )}
    </div>
  );
}
