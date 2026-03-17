'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Save, RotateCcw, FileCode } from 'lucide-react'
import { useToast } from '@/components/ui/toaster'
import { api } from '@/lib/api-client'
import { ConfigLayout } from './ConfigLayout'
import { ConfigPreview } from './ConfigPreview'
import { UnsavedChangesDialog } from './UnsavedChangesDialog'
import { ConfigProvider, useConfigContext } from '@/contexts/ConfigContext'

interface ConfigPageProps {
  instanceIdPromise: Promise<{ id: string }>
}

export function ConfigPage({ instanceIdPromise }: ConfigPageProps) {
  const router = useRouter()
  const [instanceId, setInstanceId] = useState<string | null>(null)
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)

  // Resolve instance ID from promise
  useEffect(() => {
    instanceIdPromise.then(params => setInstanceId(params.id))
  }, [instanceIdPromise])

  // Handle browser back button with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // This will be checked by the ConfigProvider's dirty state
      e.preventDefault()
      e.returnValue = ''
    }

    const handlePopState = () => {
      // Check for dirty state before allowing navigation
      setShowUnsavedDialog(true)
      // Push state back to prevent actual navigation until confirmed
      window.history.pushState(null, '', window.location.href)
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  if (!instanceId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">加载中...</div>
      </div>
    )
  }

  return (
    <ConfigProvider instanceId={instanceId}>
      <ConfigPageContent
        instanceId={instanceId}
        onBack={() => router.back()}
        showUnsavedDialog={showUnsavedDialog}
        setShowUnsavedDialog={setShowUnsavedDialog}
        onConfirmNavigation={() => router.back()}
      />
    </ConfigProvider>
  )
}

interface ConfigPageContentProps {
  instanceId: string
  onBack: () => void
  showUnsavedDialog: boolean
  setShowUnsavedDialog: (show: boolean) => void
  onConfirmNavigation: () => void
}

function ConfigPageContent({
  instanceId,
  onBack,
  showUnsavedDialog,
  setShowUnsavedDialog,
  onConfirmNavigation
}: ConfigPageContentProps) {
  const router = useRouter()
  const { toast } = useToast()
  const {
    state,
    saveConfig,
    resetConfig,
    setPreviewOpen
  } = useConfigContext()

  const handleSave = async () => {
    try {
      await saveConfig()

      // Restart container to apply new config
      const restartResponse = await api.patch(`/api/containers/${instanceId}`, { action: 'restart' })
      if (!restartResponse.ok) {
        toast({
          title: '保存成功',
          description: '配置已保存，但容器重启失败，请手动重启'
        })
      } else {
        toast({
          title: '保存成功',
          description: '配置已保存并重启应用'
        })
      }

      // Navigate back to home page
      router.push('/')
    } catch (error) {
      toast({
        title: '保存失败',
        description: state.errorMessage || '保存配置时出错',
        variant: 'destructive'
      })
    }
  }

  const handleReset = () => {
    resetConfig()
    toast({
      title: '已重置',
      description: '配置已恢复到原始状态'
    })
  }

  const handleBack = () => {
    if (state.dirty) {
      setShowUnsavedDialog(true)
    } else {
      onBack()
    }
  }

  return (
    <>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBack}
                  title="返回"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="text-2xl font-bold">实例配置</h1>
                  <p className="text-sm text-muted-foreground">
                    {state.dirty && '● '}编辑实例配置
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPreviewOpen(true)}
                  disabled={!state.config || state.loading}
                >
                  <FileCode className="h-4 w-4 mr-2" />
                  预览 TOML
                </Button>
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={!state.dirty || state.loading || state.saving}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  重置
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!state.dirty || state.loading || state.saving}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {state.saving ? '保存中...' : '保存'}
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <ConfigLayout state={state} />
      </div>

      {/* Dialogs */}
      {state.config && (
        <ConfigPreview
          config={state.config}
          open={state.previewOpen}
          onOpenChange={setPreviewOpen}
        />
      )}

      <UnsavedChangesDialog
        open={showUnsavedDialog}
        onConfirm={onConfirmNavigation}
        onCancel={() => setShowUnsavedDialog(false)}
      />
    </>
  )
}
