import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const files = [
  'supabase/baseline/kupan-public-schema.raw.sql',
  'supabase/baseline/kupan-public-schema.sql',
].filter((file) => existsSync(file))

const forbidden = [
  /\bCOPY\s+public\./i,
  /\bINSERT\s+INTO\b/i,
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/,
  /bearer\s+[A-Za-z0-9._-]+/i,
  /postgres(ql)?:\/\/[^;\s]+/i,
  /\bDROP\s+DATABASE\b/i,
  /\bTRUNCATE\b/i,
  /promote-admin/i,
]

for (const file of files) {
  const content = readFileSync(file, 'utf8')
  for (const pattern of forbidden) {
    assert.equal(pattern.test(content), false, `${file} contiene patron prohibido ${pattern}`)
  }
}

const applyOrder = readFileSync('supabase/baseline/apply-order.md', 'utf8')
assert.equal(applyOrder.includes('promote-admin.sql'), true)
assert.equal(applyOrder.includes('sync-auth-users-profiles.sql'), true)

console.log('schema security tests: OK')
