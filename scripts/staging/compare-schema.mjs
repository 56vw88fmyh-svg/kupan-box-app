import { existsSync } from 'node:fs'
import { getEnvironment } from './lib/environment.mjs'

const environment = getEnvironment()

if (!environment.isValid) {
  console.log('Schema comparison: NOT EXECUTED')
  for (const error of environment.errors) console.log(`- ${error}`)
  process.exit(1)
}

if (!existsSync('supabase/baseline/kupan-public-schema.sql')) {
  console.log('Schema comparison: NOT EXECUTED, missing baseline')
  process.exit(1)
}

console.log('Schema comparison: NOT EXECUTED, reconstructed database target is not configured')
process.exit(1)
