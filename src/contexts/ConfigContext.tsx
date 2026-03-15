// src/contexts/ConfigContext.tsx
'use client'

import { createContext, useContext, useReducer, useCallback, useEffect, ReactNode } from 'react'
import { configReducer, initialState } from '@/lib/config/store'
import { ConfigState, ConfigAction, ConfigContextValue, ZeroClawConfig } from '@/types/config'

const ConfigContext = createContext<ConfigContextValue | undefined>(undefined)

interface ConfigProviderProps {
  children: ReactNode
  instanceId: string
}

export function ConfigProvider({ children, instanceId }: ConfigProviderProps) {
  const [state, dispatch] = useReducer(configReducer, initialState)

  // Load config on mount
  useEffect(() => {
    const loadConfig = async () => {
      dispatch({ type: 'SET_LOADING', payload: true })

      try {
        const response = await fetch(`/api/containers/${instanceId}/config`)
        if (!response.ok) {
          throw new Error('Failed to load config')
        }

        const data = await response.json()
        dispatch({ type: 'LOAD_CONFIG', payload: data.config })
      } catch (error) {
        dispatch({
          type: 'SET_ERROR',
          payload: error instanceof Error ? error.message : 'Failed to load config'
        })
      }
    }

    loadConfig()
  }, [instanceId])

  const updateConfig = useCallback((updates: Partial<ZeroClawConfig>) => {
    dispatch({ type: 'UPDATE_CONFIG', payload: updates })
  }, [])

  const setCategory = useCallback((category: ConfigState['currentCategory']) => {
    dispatch({ type: 'SET_CATEGORY', payload: category })
  }, [])

  const saveConfig = useCallback(async () => {
    if (!state.config) return

    dispatch({ type: 'SET_SAVING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: null })

    try {
      const response = await fetch(`/api/containers/${instanceId}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: state.config })
      })

      if (!response.ok) {
        throw new Error('Failed to save config')
      }

      const data = await response.json()

      dispatch({
        type: 'LOAD_CONFIG',
        payload: state.config
      })

      dispatch({
        type: 'SET_SUCCESS',
        payload: '配置已保存'
      })

      return data
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to save config'
      })
      throw error
    } finally {
      dispatch({ type: 'SET_SAVING', payload: false })
    }
  }, [instanceId, state.config])

  const resetConfig = useCallback(() => {
    dispatch({ type: 'RESET' })
  }, [])

  const setErrors = useCallback((errors: ConfigState['errors']) => {
    dispatch({ type: 'SET_ERRORS', payload: errors })
  }, [])

  const setPreviewOpen = useCallback((open: boolean) => {
    dispatch({ type: 'SET_PREVIEW_OPEN', payload: open })
  }, [])

  const setTemplatesOpen = useCallback((open: boolean) => {
    dispatch({ type: 'SET_TEMPLATES_OPEN', payload: open })
  }, [])

  const value: ConfigContextValue = {
    state,
    updateConfig,
    setCategory,
    saveConfig,
    resetConfig,
    setErrors,
    setPreviewOpen,
    setTemplatesOpen
  }

  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  )
}

export function useConfigContext() {
  const context = useContext(ConfigContext)
  if (!context) {
    throw new Error('useConfigContext must be used within ConfigProvider')
  }
  return context
}
