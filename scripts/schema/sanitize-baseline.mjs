import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const rawPath = 'supabase/baseline/kupan-public-schema.raw.sql'
const finalPath = 'supabase/baseline/kupan-public-schema.sql'
const reportPath = 'docs/schema-baseline-sanitization.md'

if (!existsSync(rawPath)) {
  writeFileSync(reportPath, '# Sanitizacion Baseline\n\nEstado: REQUIRES REVIEW\n\nNo existe baseline raw.\n')
  console.log('Baseline sanitization: BLOCKED, missing raw baseline')
  process.exit(1)
}

const raw = readFileSync(rawPath, 'utf8')
const reviewPatterns = [/INSERT\s+INTO/i, /\bCOPY\s+public\./i, /postgres(ql)?:\/\//i, /service_role/i]
const needsReview = reviewPatterns.some((pattern) => pattern.test(raw))

if (needsReview) {
  writeFileSync(reportPath, '# Sanitizacion Baseline\n\nEstado: REQUIRES REVIEW\n\nEl baseline contiene statements sensibles o datos. No se genero final.\n')
  console.log('Baseline sanitization: REQUIRES REVIEW')
  process.exit(1)
}

const sanitized = raw
  .split(/\r?\n/)
  .filter((line) => !/^-- Dumped (from|by)/.test(line))
  .filter((line) => !/^ALTER .* OWNER TO /i.test(line))
  .join('\n')

writeFileSync(finalPath, `${sanitized.trim()}\n`)
writeFileSync(reportPath, '# Sanitizacion Baseline\n\nEstado: SAFE\n\nSe eliminaron owners especificos y ruido de herramienta. No se modifico semantica estructural.\n')
console.log(`Baseline sanitization: SAFE ${finalPath}`)
