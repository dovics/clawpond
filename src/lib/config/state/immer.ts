import { produce } from 'immer'

/**
 * Get nested value by dot-notation path
 * @example getByPath({ a: { b: 1 } }, 'a.b') // returns 1
 */
export function getByPath<T = any>(obj: any, path: string): T {
  const keys = path.split('.')
  let current = obj

  for (const key of keys) {
    if (current == null) {
      return undefined as T
    }
    current = current[key]
  }

  return current as T
}

/**
 * Set nested value by dot-notation path using immer
 * Creates intermediate objects if they don't exist
 * @example setByPath({ a: {} }, 'a.b.c', 1) // returns { a: { b: { c: 1 } } }
 */
export function setByPath<T>(obj: T, path: string, value: any): void {
  const keys = path.split('.')
  let current: any = obj

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    if (!(key in current) || current[key] == null) {
      current[key] = {}
    }
    current = current[key]
  }

  current[keys[keys.length - 1]] = value
}

/**
 * Update config using immer for immutability
 * @returns New config object with updates applied
 */
export function updateConfig<T>(config: T, updates: Record<string, any>): T {
  return produce(config, (draft) => {
    for (const [path, value] of Object.entries(updates)) {
      setByPath(draft, path, value)
    }
  })
}

/**
 * Create a debounced config updater
 */
export function createDebouncedUpdater<T>(
  updateFn: (updates: Record<string, any>) => void,
  delay = 300
): (path: string, value: any) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  const pendingUpdates: Record<string, any> = {}

  return (path: string, value: any) => {
    pendingUpdates[path] = value

    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      updateFn({ ...pendingUpdates })
      Object.keys(pendingUpdates).forEach(key => delete pendingUpdates[key])
      timeoutId = null
    }, delay)
  }
}