import { existsSync } from 'node:fs'

const dryRun = process.argv.includes('--dry-run')
const baselinePath = 'supabase/baseline/kupan-public-schema.sql'

if (dryRun) {
  console.log('Baseline test dry-run')
  console.log(`Baseline present: ${existsSync(baselinePath) ? 'YES' : 'NO'}`)
  console.log('Target: empty disposable database required')
  console.log('Seeds: DISABLED')
  process.exit(existsSync(baselinePath) ? 0 : 1)
}

console.log('Baseline test: BLOCKED, no disposable database runner configured')
process.exit(1)
