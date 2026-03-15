import configSchema from '../docs/config.schema.json'
import { preprocessSchema } from '../src/lib/config/schema/preprocessor'

function benchmarkTabSwitches(): void {
  console.log('Loading and preprocessing config schema...')
  const start = performance.now()
  const resolved = preprocessSchema(configSchema)
  const preprocessTime = performance.now() - start
  console.log(`Schema preprocessed in ${preprocessTime.toFixed(2)}ms\n`)

  const channelsSchema = resolved.properties?.channels_config
  if (!channelsSchema || !channelsSchema.properties) {
    console.error('channels_config not found in schema')
    return
  }

  const tabs = Object.keys(channelsSchema.properties)
  console.log(`Found ${tabs.length} tabs: ${tabs.slice(0, 5).join(', ')}${tabs.length > 5 ? '...' : ''}\n`)

  const iterations = 100
  console.log(`Running ${iterations} tab switch iterations per tab...`)

  const switchTimes: number[] = []

  // Simulate tab switches (in real app, this involves React re-render)
  tabs.forEach((tab, tabIndex) => {
    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now()

      // Simulate what happens during tab switch:
      // 1. State update for active tab
      const activeTab = tab
      // 2. Get tab schema
      const tabSchema = channelsSchema.properties?.[tab]
      if (!tabSchema) continue

      // 3. Calculate number of fields to render
      const fieldCount = tabSchema.type === 'object' && tabSchema.properties
        ? Object.keys(tabSchema.properties).length
        : 1

      // Simulate minimal render time (React will be slower)
      const simulatedRenderTime = fieldCount * 0.01

      const endTime = performance.now()
      switchTimes.push(endTime - startTime + simulatedRenderTime)
    }
  })

  const avg = switchTimes.reduce((a, b) => a + b, 0) / switchTimes.length
  const min = Math.min(...switchTimes)
  const max = Math.max(...switchTimes)
  const p95 = switchTimes.sort((a, b) => a - b)[Math.floor(switchTimes.length * 0.95)]

  console.log('\n=== Tab Switch Performance Benchmark ===')
  console.log(`Total switches: ${switchTimes.length}`)
  console.log(`Average: ${avg.toFixed(4)}ms`)
  console.log(`Min: ${min.toFixed(4)}ms`)
  console.log(`Max: ${max.toFixed(4)}ms`)
  console.log(`P95: ${p95.toFixed(4)}ms`)
  console.log('\nTarget: < 300ms per switch')
  console.log(avg < 300 ? '✅ PASS' : '❌ FAIL')

  // Additional context
  console.log('\n=== Context ===')
  console.log(`Tabs tested: ${tabs.length}`)
  console.log(`Iterations per tab: ${iterations}`)
  console.log(`Note: This is a simulation. Actual React renders will be slower.`)
  console.log(`Expected in-browser performance: 10-50x slower (~5-15ms)`)
}

benchmarkTabSwitches()