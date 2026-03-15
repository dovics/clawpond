'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { ZeroClawInstance, CreateInstanceOptions } from '@/types';
import { ContainerCreationError, ContainerNotFoundError } from '@/lib/errors';

/**
 * Instance context value
 */
interface InstanceContextValue {
  instances: ZeroClawInstance[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  createInstance: (options: CreateInstanceOptions) => Promise<ZeroClawInstance | null>;
  updateInstance: (id: string, updates: Partial<ZeroClawInstance>) => void;
  removeInstance: (id: string) => void;
  getInstanceById: (id: string) => ZeroClawInstance | null;
}

const InstanceContext = createContext<InstanceContextValue | undefined>(undefined);

/**
 * InstanceProvider component
 * Manages instance state across the application
 */
export function InstanceProvider({ children }: { children: React.ReactNode }) {
  const [instances, setInstances] = useState<ZeroClawInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Fetch all instances
   */
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/containers');

      if (!response.ok) {
        throw new Error('Failed to fetch instances');
      }

      const data = await response.json();
      setInstances(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      console.error('Failed to fetch instances:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create a new instance
   */
  const createInstance = useCallback(async (
    options: CreateInstanceOptions
  ): Promise<ZeroClawInstance | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/containers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ContainerCreationError(
          errorData.error || 'Failed to create instance'
        );
      }

      const newInstance = await response.json();

      // Add to instances list
      setInstances(prev => [newInstance, ...prev]);

      return newInstance;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      console.error('Failed to create instance:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update instance in state
   */
  const updateInstance = useCallback((id: string, updates: Partial<ZeroClawInstance>) => {
    setInstances(prev =>
      prev.map(instance =>
        instance.id === id ? { ...instance, ...updates } : instance
      )
    );
  }, []);

  /**
   * Remove instance from state
   */
  const removeInstance = useCallback((id: string) => {
    setInstances(prev => prev.filter(instance => instance.id !== id));
  }, []);

  /**
   * Get instance by ID
   */
  const getInstanceById = useCallback((id: string): ZeroClawInstance | null => {
    return instances.find(instance => instance.id === id) || null;
  }, [instances]);

  /**
   * Fetch instances on mount
   */
  useEffect(() => {
    refresh();
  }, [refresh]);

  /**
   * Auto-refresh instances every 10 seconds
   */
  useEffect(() => {
    const interval = setInterval(() => {
      refresh();
    }, 10000);

    return () => clearInterval(interval);
  }, [refresh]);

  const value: InstanceContextValue = {
    instances,
    loading,
    error,
    refresh,
    createInstance,
    updateInstance,
    removeInstance,
    getInstanceById,
  };

  return (
    <InstanceContext.Provider value={value}>
      {children}
    </InstanceContext.Provider>
  );
}

/**
 * Hook to use instance context
 */
export function useInstances(): InstanceContextValue {
  const context = useContext(InstanceContext);

  if (context === undefined) {
    throw new Error('useInstances must be used within an InstanceProvider');
  }

  return context;
}
