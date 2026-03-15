import { describe, it, expect } from '@jest/globals'
import { produce } from 'immer'
import { setByPath, getByPath } from './immer'

describe('Immer State Updates', () => {
  it('updates simple nested path', () => {
    const config = { autonomy: { level: 'supervised' } }
    const updated = produce(config, (draft) => {
      setByPath(draft, 'autonomy.level', 'auto')
    })

    expect(updated.autonomy.level).toBe('auto')
    expect(config.autonomy.level).toBe('supervised') // Original unchanged
  })

  it('updates deeply nested path (4 levels)', () => {
    const config = {
      security: {
        resources: {
          limits: {
            memory: '512m'
          }
        }
      }
    }

    const updated = produce(config, (draft) => {
      setByPath(draft, 'security.resources.limits.memory', '1g')
    })

    expect(updated.security.resources.limits.memory).toBe('1g')
    expect(config.security.resources.limits.memory).toBe('512m')
  })

  it('creates intermediate objects if missing', () => {
    const config: any = {}
    const updated: any = produce(config, (draft: any) => {
      setByPath(draft, 'new.nested.path', 'value')
    })

    expect(updated.new.nested.path).toBe('value')
  })

  it('gets value from nested path', () => {
    const config = {
      autonomy: {
        level: 'supervised',
        allowed_commands: ['git', 'ls']
      }
    }

    expect(getByPath(config, 'autonomy.level')).toBe('supervised')
    expect(getByPath(config, 'autonomy.allowed_commands')).toEqual(['git', 'ls'])
  })

  it('returns undefined for missing path', () => {
    const config = { autonomy: { level: 'supervised' } }
    expect(getByPath(config, 'autonomy.missing')).toBeUndefined()
    expect(getByPath(config, 'missing.path')).toBeUndefined()
  })

  it('handles null intermediate values', () => {
    const config = { autonomy: null }
    expect(getByPath(config, 'autonomy.level')).toBeUndefined()
  })

  it('updates array items by path', () => {
    const config = {
      autonomy: {
        allowed_commands: ['git', 'ls', 'cat']
      }
    }

    const updated = produce(config, (draft) => {
      const commands = getByPath(draft, 'autonomy.allowed_commands')
      commands[1] = 'npm'
    })

    expect(updated.autonomy.allowed_commands).toEqual(['git', 'npm', 'cat'])
  })

  it('preserves immutability across multiple updates', () => {
    const config: any = { a: { b: { c: 1 } } }
    let updated = config

    updated = produce(updated, (draft: any) => {
      setByPath(draft, 'a.b.c', 2)
    })

    updated = produce(updated, (draft: any) => {
      setByPath(draft, 'a.b.d', 3)
    })

    expect(updated.a.b.c).toBe(2)
    expect(updated.a.b.d).toBe(3)
    expect(config.a.b.c).toBe(1)
    expect(config.a.b.d).toBeUndefined()
  })
})