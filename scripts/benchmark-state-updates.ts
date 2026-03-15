import { produce } from 'immer'
import { setByPath, getByPath, updateConfig } from '../src/lib/config/state/immer'

function benchmark(iterations = 1000): void {
  // Create a realistic config structure
  const baseConfig = {
    default_provider: 'openrouter',
    default_model: 'anthropic/claude-sonnet-4.6',
    default_temperature: 0.7,
    autonomy: {
      level: 'supervised',
      allowed_commands: ['git', 'ls', 'cat'],
      max_actions_per_hour: 20
    },
    security: {
      sandbox: { backend: 'auto' },
      resources: { max_memory_mb: 512 }
    }
  }

  console.log(`Running ${iterations} iterations...\n`)

  // Benchmark single update
  const singleUpdateTimes: number[] = []
  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    const updated = produce(baseConfig, (draft) => {
      setByPath(draft, 'autonomy.level', 'auto')
    })
    const end = performance.now()
    singleUpdateTimes.push(end - start)
  }

  const avgSingle = singleUpdateTimes.reduce((a, b) => a + b, 0) / singleUpdateTimes.length

  // Benchmark multiple updates in one produce call
  const multiUpdateTimes: number[] = []
  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    const updated = updateConfig(baseConfig, {
      'autonomy.level': 'auto',
      'default_temperature': 0.8,
      'security.sandbox.backend': 'firejail'
    })
    const end = performance.now()
    multiUpdateTimes.push(end - start)
  }

  const avgMulti = multiUpdateTimes.reduce((a, b) => a + b, 0) / multiUpdateTimes.length

  // Benchmark getByPath
  const getTimes: number[] = []
  for (let i = 0; i < iterations * 10; i++) {
    const start = performance.now()
    const value = getByPath(baseConfig, 'autonomy.level')
    const end = performance.now()
    getTimes.push(end - start)
  }

  const avgGet = getTimes.reduce((a, b) => a + b, 0) / getTimes.length

  console.log('=== State Update Benchmark ===')
  console.log(`Single update: ${avgSingle.toFixed(4)}ms`)
  console.log(`Multi update (3 fields): ${avgMulti.toFixed(4)}ms`)
  console.log(`Get nested value: ${avgGet.toFixed(4)}ms`)
  console.log('\nTarget: < 1ms per update')
  console.log(avgSingle < 1 ? '✅ PASS' : '❌ FAIL')
}

benchmark(1000)