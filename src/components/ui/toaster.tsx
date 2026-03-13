"use client"

import * as React from "react"
import { Toast } from "./toast"

type ToasterToast = {
  id: string
  title?: string
  description?: string
  variant?: "default" | "destructive" | "success"
  action?: React.ReactNode
}

const TOAST_LIMIT = 3
const TOAST_REMOVE_DELAY = 5000

type ToasterContextType = {
  toasts: ToasterToast[]
  addToast: (toast: Omit<ToasterToast, "id">) => void
  removeToast: (id: string) => void
}

const ToasterContext = React.createContext<ToasterContextType | undefined>(
  undefined
)

export function ToasterProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToasterToast[]>([])

  const addToast = React.useCallback(
    (toast: Omit<ToasterToast, "id">) => {
      const id = Math.random().toString(36).substr(2, 9)

      setToasts((prev) => {
        const newToasts = [({ ...toast, id }) as ToasterToast, ...prev].slice(
          0,
          TOAST_LIMIT
        )
        return newToasts
      })

      setTimeout(() => {
        removeToast(id)
      }, TOAST_REMOVE_DELAY)
    },
    []
  )

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  return (
    <ToasterContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div className="fixed bottom-0 right-0 z-[100] flex flex-col gap-2 p-4 md:max-w-[420px]">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            variant={toast.variant}
            title={toast.title}
            description={toast.description}
            action={toast.action}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToasterContext.Provider>
  )
}

export function useToast() {
  const context = React.useContext(ToasterContext)

  if (!context) {
    throw new Error("useToast must be used within a ToasterProvider")
  }

  return {
    toast: context.addToast,
    dismiss: context.removeToast,
  }
}
