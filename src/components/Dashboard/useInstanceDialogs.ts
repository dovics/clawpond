'use client';

import { useState, useCallback } from 'react';
import { ZeroClawInstance } from '@/types';

/**
 * Hook to manage instance dialog state
 */
export function useInstanceDialogs() {
  const [openDialog, setOpenDialog] = useState<string | null>(null);
  const [selectedInstance, setSelectedInstance] = useState<ZeroClawInstance | null>(null);

  const openCreateDialog = useCallback(() => {
    setOpenDialog('create');
  }, []);

  const openTemplateDialog = useCallback(() => {
    setOpenDialog('template');
  }, []);

  const openConfigDialog = useCallback((instance: ZeroClawInstance) => {
    setSelectedInstance(instance);
    setOpenDialog('config');
  }, []);

  const openLogsDialog = useCallback((instance: ZeroClawInstance) => {
    setSelectedInstance(instance);
    setOpenDialog('logs');
  }, []);

  const openConsoleDialog = useCallback((instance: ZeroClawInstance) => {
    setSelectedInstance(instance);
    setOpenDialog('console');
  }, []);

  const closeDialog = useCallback(() => {
    setOpenDialog(null);
    setSelectedInstance(null);
  }, []);

  return {
    openDialog,
    selectedInstance,
    openCreateDialog,
    openTemplateDialog,
    openConfigDialog,
    openLogsDialog,
    openConsoleDialog,
    closeDialog,
  };
}
