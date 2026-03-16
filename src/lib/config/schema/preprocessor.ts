export interface ResolvedSchemaNode {
  type?: string
  nullable?: boolean
  description?: string
  default?: any
  enum?: any[]
  minimum?: number
  maximum?: number
  pattern?: string
  properties?: Record<string, ResolvedSchemaNode>
  items?: ResolvedSchemaNode
  anyOf?: any[]
  widget?: FieldWidgetType
  condition?: FieldCondition
  original?: any
  required?: boolean
}

export type FieldWidgetType =
  | 'input'
  | 'slider'
  | 'switch'
  | 'select'
  | 'textarea'
  | 'tabs'
  | 'accordion'
  | 'keyValue'
  | 'array'

export interface FieldCondition {
  field: string
  value: any
  operator?: '$eq' | '$ne' | '$gt' | '$lt' | '$in' | '$regex'
}

export interface ResolvedSchema {
  type: string
  properties?: Record<string, ResolvedSchemaNode>
  items?: ResolvedSchemaNode
  [key: string]: any
}

/**
 * Preprocess JSON Schema to resolve $ref, anyOf, and other complexities
 */
export function preprocessSchema(schema: any): ResolvedSchema {
  const defs = schema.$defs || {}

  function resolve(node: any, visited = new Set<string>()): ResolvedSchemaNode {
    // Resolve $ref with circular reference detection
    if (node.$ref) {
      if (visited.has(node.$ref)) {
        // Circular reference detected - preserve original node structure
        console.warn(`Circular reference detected: ${node.$ref}`)
        const result = { ...node }
        delete result.$ref
        return result
      }
      visited.add(node.$ref)

      const refPath = node.$ref.replace('#/', '').split('/')
      let resolved: any = schema
      for (const key of refPath) {
        if (!resolved || resolved[key] === undefined) {
          console.warn(`Reference not found: ${node.$ref}`)
          return { type: 'null' }
        }
        resolved = resolved[key]
      }

      // Merge current node's properties (like default) with resolved schema
      const merged = { ...resolved, ...node }
      delete merged.$ref // Remove $ref after resolution
      return resolve(merged, visited)
    }

    // Handle anyOf (nullable/union types)
    if (node.anyOf) {
      const nonNull = node.anyOf.find((s: any) => s.type !== 'null')
      const nullable = node.anyOf.some((s: any) => s.type === 'null')
      return {
        ...(nonNull ? resolve(nonNull, visited) : resolve(node.anyOf[0], visited)),
        nullable,
        original: node
      }
    }

    // Handle type as array (JSON Schema 2020-12 format for nullable types)
    // e.g., type: ["string", "null"]
    if (Array.isArray(node.type)) {
      const nonNullType = node.type.find((t: string) => t !== 'null')
      const nullable = node.type.includes('null')
      return {
        ...node,
        type: nonNullType || 'string',
        nullable,
        // Remove the original array type
        original: node
      }
    }

    // Recurse into properties - create a fresh visited set for each property
    // to properly detect circular references only within each branch
    if (node.properties) {
      return {
        ...node,
        properties: Object.fromEntries(
          Object.entries(node.properties).map(([k, v]) => [k, resolve(v, new Set(visited))])
        )
      }
    }

    // Recurse into array items - create a fresh visited set
    if (node.items) {
      return {
        ...node,
        items: resolve(node.items, new Set(visited))
      }
    }

    return node
  }

  const result = resolve(schema)
  // Ensure the result always has a type property for ResolvedSchema compatibility
  if (!result.type) {
    result.type = schema.type || 'object'
  }
  return result as ResolvedSchema
}

/**
 * Load default values from schema
 */
export function loadDefaults(schema: ResolvedSchema): any {
  function loadNode(node: ResolvedSchemaNode): any {
    if (node.default !== undefined) {
      // If there's a default, also merge in nested defaults
      const result = node.default
      if (node.properties) {
        for (const [key, prop] of Object.entries(node.properties)) {
          if (!(key in result)) {
            result[key] = loadNode(prop)
          }
        }
      }
      return result
    }

    if (node.properties) {
      const obj: any = {}
      for (const [key, prop] of Object.entries(node.properties)) {
        obj[key] = loadNode(prop)
      }
      return obj
    }

    if (node.type === 'array') {
      return []
    }

    return null
  }

  const result: any = {}
  if (schema.properties) {
    for (const [key, prop] of Object.entries(schema.properties)) {
      result[key] = loadNode(prop)
    }
  }
  return result
}

/**
 * Get nested value by path (e.g., "autonomy.level")
 */
export function getByPath(obj: any, path: string): any {
  const keys = path.split('.')
  let current = obj
  for (const key of keys) {
    if (current == null) return undefined
    current = current[key]
  }
  return current
}

/**
 * Set nested value by path (e.g., "autonomy.level")
 */
export function setByPath(obj: any, path: string, value: any): void {
  const keys = path.split('.')
  let current = obj
  for (let i = 0; i < keys.length - 1; i++) {
    if (!(keys[i] in current)) {
      current[keys[i]] = {}
    }
    current = current[keys[i]]
  }
  current[keys[keys.length - 1]] = value
}