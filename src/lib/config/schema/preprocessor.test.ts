import { describe, it, expect } from '@jest/globals'
import { preprocessSchema, loadDefaults } from './preprocessor'

describe('SchemaPreprocessor', () => {
  it('resolves simple $ref references', () => {
    const schema = {
      $defs: {
        Foo: { type: 'string', description: 'A foo' }
      },
      properties: {
        bar: { $ref: '#/$defs/Foo' }
      }
    }

    const resolved = preprocessSchema(schema)
    expect(resolved.properties?.bar.type).toBe('string')
    expect(resolved.properties?.bar.description).toBe('A foo')
  })

  it('resolves nested $ref chains', () => {
    const schema = {
      $defs: {
        String: { type: 'string' },
        ObjectWithRef: {
          properties: {
            value: { $ref: '#/$defs/String' }
          }
        }
      },
      properties: {
        nested: { $ref: '#/$defs/ObjectWithRef' }
      }
    }

    const resolved = preprocessSchema(schema)
    expect(resolved.properties?.nested?.properties?.value?.type).toBe('string')
  })

  it('handles anyOf with nullable types', () => {
    const schema = {
      type: 'string',
      anyOf: [
        { type: 'string' },
        { type: 'null' }
      ]
    }

    const resolved = preprocessSchema(schema)
    expect(resolved.nullable).toBe(true)
    expect(resolved.type).toBe('string')
  })

  it('handles anyOf with non-null primary type', () => {
    const schema = {
      anyOf: [
        { type: 'number', minimum: 0 },
        { type: 'null' }
      ]
    }

    const resolved = preprocessSchema(schema)
    expect(resolved.nullable).toBe(true)
    expect(resolved.type).toBe('number')
    expect(resolved.minimum).toBe(0)
  })

  it('detects circular references', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

    const schema = {
      $defs: {
        Foo: {
          properties: {
            bar: { $ref: '#/$defs/Bar' }
          }
        },
        Bar: {
          properties: {
            foo: { $ref: '#/$defs/Foo' }
          }
        }
      },
      properties: {
        circular: { $ref: '#/$defs/Foo' }
      }
    }

    const resolved = preprocessSchema(schema)
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Circular reference'))

    consoleSpy.mockRestore()
  })

  it('recursively processes object properties', () => {
    const schema = {
      properties: {
        level1: {
          properties: {
            level2: {
              type: 'string'
            }
          }
        }
      }
    }

    const resolved = preprocessSchema(schema)
    expect(resolved.properties?.level1?.properties?.level2?.type).toBe('string')
  })

  it('recursively processes array items', () => {
    const schema = {
      items: {
        type: 'string'
      }
    }

    const resolved = preprocessSchema(schema)
    expect(resolved.items?.type).toBe('string')
  })

  it('loads default values from schema', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        name: { type: 'string', default: 'test' },
        age: { type: 'number', default: 0 },
        enabled: { type: 'boolean', default: false }
      }
    }

    const defaults = loadDefaults(schema)
    expect(defaults).toEqual({
      name: 'test',
      age: 0,
      enabled: false
    })
  })

  it('loads nested default values', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        config: {
          properties: {
            timeout: { type: 'number', default: 30 }
          },
          default: {}
        }
      }
    }

    const defaults = loadDefaults(schema)
    expect(defaults.config.timeout).toBe(30)
  })

  it('returns empty array for array type defaults', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        items: { type: 'array' }
      }
    }

    const defaults = loadDefaults(schema)
    expect(defaults.items).toEqual([])
  })
})