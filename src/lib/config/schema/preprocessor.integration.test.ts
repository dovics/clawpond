import { describe, it, expect } from '@jest/globals'
import { preprocessSchema, loadDefaults } from './preprocessor'
import configSchema from '../../../../docs/config.schema.json'

describe('SchemaPreprocessor Integration', () => {
  it('preprocesses actual config.schema.json without errors', () => {
    expect(() => preprocessSchema(configSchema)).not.toThrow()
  })

  it('resolves all top-level properties', () => {
    const resolved = preprocessSchema(configSchema)

    expect(resolved.properties).toBeDefined()
    expect(Object.keys(resolved.properties!).length).toBeGreaterThan(20)
  })

  it('has expected top-level properties', () => {
    const resolved = preprocessSchema(configSchema)

    expect(resolved.properties?.default_provider).toBeDefined()
    expect(resolved.properties?.default_model).toBeDefined()
    expect(resolved.properties?.autonomy).toBeDefined()
    expect(resolved.properties?.security).toBeDefined()
    expect(resolved.properties?.channels_config).toBeDefined()
  })

  it('loads all default values', () => {
    const resolved = preprocessSchema(configSchema)
    const defaults = loadDefaults(resolved)

    // Check some known defaults
    expect(defaults.default_temperature).toBe(0.7)
    expect(defaults.autonomy.level).toBe('supervised')
    expect(defaults.runtime.kind).toBe('native')
  })

  it('handles autonomy config structure', () => {
    const resolved = preprocessSchema(configSchema)
    const autonomy = resolved.properties?.autonomy

    expect(autonomy?.properties).toBeDefined()
    expect(autonomy?.properties?.level).toBeDefined()
    expect(autonomy?.properties?.allowed_commands).toBeDefined()
  })

  it('handles channels_config nested structure', () => {
    const resolved = preprocessSchema(configSchema)
    const channels = resolved.properties?.channels_config

    expect(channels?.properties).toBeDefined()
    expect(channels?.properties?.cli).toBeDefined()
    expect(channels?.properties?.telegram).toBeDefined()
  })

  it('handles security nested sections', () => {
    const resolved = preprocessSchema(configSchema)
    const security = resolved.properties?.security

    expect(security?.properties).toBeDefined()
    expect(security?.properties?.sandbox).toBeDefined()
    expect(security?.properties?.resources).toBeDefined()
    expect(security?.properties?.otp).toBeDefined()
  })

  it('preprocesses within performance budget (< 100ms)', () => {
    const start = performance.now()
    preprocessSchema(configSchema)
    const end = performance.now()

    expect(end - start).toBeLessThan(100)
  })
})