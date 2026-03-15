// src/components/ConfigEditor/UnsavedChangesDialog.tsx
'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

interface UnsavedChangesDialogProps {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
  onSave?: () => void
}

export function UnsavedChangesDialog({
  open,
  onConfirm,
  onCancel,
  onSave
}: UnsavedChangesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <DialogTitle>未保存的更改</DialogTitle>
          </div>
          <DialogDescription>
            您有未保存的配置更改。如果继续，这些更改将会丢失。
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2">
          {onSave && (
            <Button variant="outline" onClick={onSave}>
              保存更改
            </Button>
          )}
          <Button variant="secondary" onClick={onCancel}>
            取消
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            放弃更改
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
