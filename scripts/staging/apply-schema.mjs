import { existsSync } from 'node:fs'
import { getEnvironment } from './lib/environment.mjs'

const dryRun = process.argv.includes('--dry-run')
const environment = getEnvironment()

if (!environment.isValid) {
  console.log('Schema apply: BLOCKED')
  for (const error of environment.errors) console.log(`- ${error}`)
  process.exit(1)
}

if (!existsSync('supabase/baseline/kupan-public-schema.sql')) {
  console.log('Schema apply: BLOCKED, missing validated baseline')
  process.exit(1)
}

if (dryRun) {
  console.log('Schema apply dry-run: READY')
  console.log('Target: disposable staging only')
  console.log('Baseline: supabase/baseline/kupan-public-schema.sql')
  process.exit(0)
}

console.log('Schema apply: BLOCKED, real application requires manual approval after dry-run')
process.exit(1)
