import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { getSchemaSourceEnvironment, mask, printSourceGuard } from './schema-source-env.mjs'

const dryRun = process.argv.includes('--dry-run')
const baselineDir = 'supabase/baseline'
const rawPath = `${baselineDir}/kupan-public-schema.raw.sql`
const finalPath = `${baselineDir}/kupan-public-schema.sql`
const reportPath = `${baselineDir}/export-report.json`

function run(command, args, options = {}) {
  return spawnSync(command, args, { encoding: 'utf8', ...options })
}

function getSupabaseVersion() {
  const result = run('supabase', ['--version'], { env: { ...process.env, HOME: `${process.cwd()}/.tools/supabase-home` } })
  return result.status === 0 ? result.stdout.trim() : 'unavailable'
}

function getDumpHelp() {
  const result = run('supabase', ['db', 'dump', '--help'], { env: { ...process.env, HOME: `${process.cwd()}/.tools/supabase-home` } })
  return result.status === 0 ? result.stdout : ''
}

const environment = getSchemaSourceEnvironment()
const guardOk = printSourceGuard(environment)
mkdirSync(baselineDir, { recursive: true })

const version = getSupabaseVersion()
const help = getDumpHelp()
const supportsDbUrl = help.includes('--db-url')
const args = ['db', 'dump', '--schema', 'public', '--file', rawPath]
if (environment.databaseUrl) args.push('--db-url', '[REDACTED_DATABASE_URL]')
else args.push('--linked')

const report = {
  version: 1,
  date: new Date().toISOString(),
  exportedAt: null,
  sourceType: environment.sourceType || 'missing',
  sourceProjectRefMasked: mask(environment.sourceRef),
  schema: 'public',
  schemaOnly: true,
  dataIncluded: false,
  tool: 'supabase-cli',
  rawPath,
  finalPath,
  toolVersion: version,
  rawFile: 'kupan-public-schema.raw.sql',
  sha256: null,
  bytes: null,
  supportsDbUrl,
  dryRun,
  executed: false,
  status: guardOk ? 'READY' : 'BLOCKED',
}

if (dryRun || !guardOk) {
  console.log('Schema baseline export dry-run')
  console.log(`Tool: supabase ${version}`)
  console.log(`Source type: ${environment.sourceType || 'missing'}`)
  console.log(`Project ref: ${mask(environment.sourceRef)}`)
  console.log('Schema: public')
  console.log(`Destination: ${rawPath}`)
  console.log('Schema-only: YES')
  console.log(`Export allowed: ${guardOk ? 'YES' : 'NO'}`)
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`)
  process.exit(guardOk ? 0 : 1)
}

if (!environment.databaseUrl && !existsSync('supabase/config.toml')) {
  report.status = 'BLOCKED_NO_LINKED_PROJECT'
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`)
  console.log('Schema export: BLOCKED, falta supabase/config.toml o SCHEMA_SOURCE_DATABASE_URL')
  process.exit(1)
}

const realArgs = ['db', 'dump', '--schema', 'public', '--file', rawPath]
if (environment.databaseUrl) realArgs.push('--db-url', environment.databaseUrl)
else realArgs.push('--linked')

const result = run('supabase', realArgs, { env: { ...process.env, HOME: `${process.cwd()}/.tools/supabase-home` } })
report.executed = result.status === 0
report.status = result.status === 0 ? 'EXPORTED' : 'FAILED'
if (result.status === 0 && existsSync(rawPath)) {
  const file = readFileSync(rawPath)
  report.exportedAt = new Date().toISOString()
  report.bytes = statSync(rawPath).size
  report.sha256 = createHash('sha256').update(file).digest('hex')
}
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`)
if (result.status !== 0) {
  console.log('Schema export: FAILED')
  process.exit(result.status || 1)
}
console.log(`Schema export: EXPORTED ${rawPath}`)
