import { spawnSync } from 'node:child_process'

const dryRun = process.argv.includes('--dry-run')
const node = process.execPath
const steps = [
  ['validate', ['scripts/staging/validate-environment.mjs']],
  ['schema', ['scripts/staging/check-schema.mjs']],
  ['users', ['scripts/staging/create-e2e-users.mjs', ...(dryRun ? ['--dry-run'] : [])]],
  ['seed', ['scripts/staging/seed-e2e-data.mjs', ...(dryRun ? ['--dry-run'] : [])]],
]

console.log(`KUPAN staging bootstrap${dryRun ? ' dry-run' : ''}`)
for (const [label, args] of steps) {
  const result = spawnSync(node, args, { stdio: 'inherit' })
  if (result.status !== 0) {
    console.log(`Bootstrap detenido en paso: ${label}`)
    process.exit(result.status || 1)
  }
}

console.log('Bootstrap completo. Copia manualmente variables E2E a .env.e2e; no se escriben passwords automaticamente.')
