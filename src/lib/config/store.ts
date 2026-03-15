// src/lib/config/store.ts
import { ConfigState, ConfigAction } from '@/types/config'

export const initialState: ConfigState = {
  config: null,
  originalConfig: null,
  currentCategory: 'basic',
  previewOpen: false,
  templatesOpen: false,
  dirty: false,
  saving: false,
  loading: false,
  errors: {},
  successMessage: null,
  errorMessage: null
}

export function configReducer(state: ConfigState, action: ConfigAction): ConfigState {
  switch (action.type) {
    case 'LOAD_CONFIG':
      return {
        ...state,
        config: action.payload,
        originalConfig: action.payload,
        loading: false,
        dirty: false,
        errors: {},
        errorMessage: null
      }

    case 'UPDATE_CONFIG':
      return {
        ...state,
        config: state.config ? { ...state.config, ...action.payload } : null,
        dirty: true
      }

    case 'SET_CATEGORY':
      return {
        ...state,
        currentCategory: action.payload
      }

    case 'SET_ERRORS':
      return {
        ...state,
        errors: action.payload
      }

    case 'SET_SAVING':
      return {
        ...state,
        saving: action.payload
      }

    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload
      }

    case 'SET_SUCCESS':
      return {
        ...state,
        successMessage: action.payload,
        errorMessage: null
      }

    case 'SET_ERROR':
      return {
        ...state,
        errorMessage: action.payload,
        successMessage: null
      }

    case 'SET_PREVIEW_OPEN':
      return {
        ...state,
        previewOpen: action.payload
      }

    case 'SET_TEMPLATES_OPEN':
      return {
        ...state,
        templatesOpen: action.payload
      }

    case 'RESET':
      return {
        ...state,
        config: state.originalConfig,
        dirty: false,
        errors: {}
      }

    default:
      return state
  }
}
