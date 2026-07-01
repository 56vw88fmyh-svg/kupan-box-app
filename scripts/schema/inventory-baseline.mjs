import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const baselinePath = 'supabase/baseline/kupan-public-schema.sql'
const reportPath = 'docs/schema-baseline-inventory.md'
const requiredTables = ['profiles', 'plans', 'memberships', 'class_schedule', 'reservations', 'wod', 'community_posts', 'app_settings', 'personal_records', 'exercises', 'membership_token_movements', 'notifications']

if (!existsSync(baselinePath)) {
  writeFileSync(reportPath, '# Inventario Baseline\n\nEstado: PENDIENTE\n\nNo existe baseline final.\n')
  console.log('Baseline inventory: BLOCKED, missing final baseline')
  process.exit(1)
}

const sql = readFileSync(baselinePath, 'utf8')
const tables = [...sql.matchAll(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?public\.([a-zA-Z0-9_]+)/gi)].map((match) => match[1])
const functions = [...sql.matchAll(/CREATE(?: OR REPLACE)? FUNCTION\s+public\.([a-zA-Z0-9_]+)/gi)].map((match) => match[1])
const policies = [...sql.matchAll(/CREATE POLICY\s+"?([^"\n]+)"?\s+ON\s+public\.([a-zA-Z0-9_]+)/gi)].map((match) => `${match[2]}: ${match[1]}`)
const triggers = [...sql.matchAll(/CREATE TRIGGER\s+([a-zA-Z0-9_]+)/gi)].map((match) => match[1])
const indexes = [...sql.matchAll(/CREATE(?: UNIQUE)? INDEX(?: IF NOT EXISTS)?\s+([a-zA-Z0-9_]+)/gi)].map((match) => match[1])

writeFileSync(reportPath, `# Inventario Baseline\n\n## Tablas requeridas\n\n${requiredTables.map((table) => `- ${table}: ${tables.includes(table) ? 'INCLUDED IN BASELINE' : 'MISSING'}`).join('\n')}\n\n## Tablas\n\n${tables.map((item) => `- ${item}`).join('\n') || '- Ninguna'}\n\n## Funciones\n\n${functions.map((item) => `- ${item}`).join('\n') || '- Ninguna'}\n\n## Policies\n\n${policies.map((item) => `- ${item}`).join('\n') || '- Ninguna'}\n\n## Triggers\n\n${triggers.map((item) => `- ${item}`).join('\n') || '- Ninguno'}\n\n## Indices\n\n${indexes.map((item) => `- ${item}`).join('\n') || '- Ninguno'}\n`)
console.log('Baseline inventory: OK')
