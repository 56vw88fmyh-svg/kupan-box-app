import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const baselinePath = 'supabase/baseline/kupan-public-schema.raw.sql'
const reportPath = 'docs/schema-baseline-security-audit.md'

const forbiddenPatterns = [
  ['COPY public', /\bCOPY\s+public\./i],
  ['INSERT INTO', /\bINSERT\s+INTO\b/i],
  ['email', /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i],
  ['telefono', /(\+?56)?\s?9\s?\d{4}\s?\d{4}/],
  ['JWT', /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/],
  ['bearer token', /bearer\s+[A-Za-z0-9._-]+/i],
  ['Supabase key', /sb_[A-Za-z0-9_]+|SUPABASE_SERVICE|service_role/i],
  ['connection string', /postgres(ql)?:\/\/[^;\s]+/i],
  ['password', /password\s*=/i],
  ['DROP DATABASE', /\bDROP\s+DATABASE\b/i],
  ['TRUNCATE', /\bTRUNCATE\b/i],
  ['auth.users data', /\bauth\.users\b.*(insert|copy|update)/i],
  ['promote admin', /promote-admin|role\s*=\s*'admin'/i],
]

if (!existsSync(baselinePath)) {
  writeFileSync(reportPath, '# Auditoria Seguridad Baseline\n\nEstado: REQUIRES REVIEW\n\nNo existe baseline raw para auditar.\n')
  console.log('Baseline audit: BLOCKED, missing raw baseline')
  process.exit(1)
}

const content = readFileSync(baselinePath, 'utf8')
const findings = forbiddenPatterns
  .filter(([, pattern]) => pattern.test(content))
  .map(([label]) => label)

const uuidLiterals = content.match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi) || []
if (uuidLiterals.length) findings.push(`UUID literales: ${uuidLiterals.length}`)

const state = findings.length ? 'REJECTED' : 'SAFE'
writeFileSync(reportPath, `# Auditoria Seguridad Baseline\n\nEstado: ${state}\n\n## Hallazgos\n\n${findings.length ? findings.map((item) => `- ${item}`).join('\n') : '- Sin hallazgos bloqueantes.'}\n`)
console.log(`Baseline audit: ${state}`)
process.exit(findings.length ? 1 : 0)
