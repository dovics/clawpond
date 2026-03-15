import { ResolvedSchemaNode } from '@/lib/config/schema/preprocessor'

export interface FieldProps {
  schema: ResolvedSchemaNode
  value: any
  onChange: (value: any, error?: string) => void
  error?: string
  disabled?: boolean
  path: string
  placeholder?: string
}

export interface FieldRendererProps {
  schema: ResolvedSchemaNode
  value: any
  onChange: (value: any, error?: string) => void
  error?: string
  disabled?: boolean
  path: string
}

export interface FormState {
  values: Record<string, any>
  errors: Record<string, string>
  touched: Record<string, boolean>
}

export interface FormContextValue {
  state: FormState
  setValue: (path: string, value: any) => void
  setError: (path: string, error: string | undefined) => void
  setTouched: (path: string, touched: boolean) => void
}