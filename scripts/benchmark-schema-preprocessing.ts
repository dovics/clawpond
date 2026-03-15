import configSchema from '../docs/config.schema.json'
import { preprocessSchema } from '../src/lib/config/schema/preprocessor'

function benchmark(iterations = 100): void {
  const times: number[] = []

  console.log(`Running ${iterations} iterations...`)

  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    const resolved = preprocessSchema(configSchema)
    const end = performance.now()

    times.push(end - start)

    // Force GC in Node.js (if available)
    if (global.gc) {
      global.gc()
    }
  }

  const avg = times.reduce((a, b) => a + b, 0) / times.length
  const min = Math.min(...times)
  const max = Math.max(...times)
  const p95 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)]

  console.log('\n=== Schema Preprocessing Benchmark ===')
  console.log(`Iterations: ${iterations}`)
  console.log(`Average: ${avg.toFixed(2)}ms`)
  console.log(`Min: ${min.toFixed(2)}ms`)
  console.log(`Max: ${max.toFixed(2)}ms`)
  console.log(`P95: ${p95.toFixed(2)}ms`)
  console.log('\nTarget: < 100ms')
  console.log(avg < 100 ? '✅ PASS' : '❌ FAIL')
}

benchmark(100)