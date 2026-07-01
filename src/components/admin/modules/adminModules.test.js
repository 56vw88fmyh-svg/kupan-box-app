import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const moduleNames = [
  'AdminOverviewModule.jsx',
  'AdminCreateStudentModule.jsx',
  'AdminStudentsModule.jsx',
  'AdminPlansModule.jsx',
  'AdminMembershipsModule.jsx',
  'AdminReservationsModule.jsx',
  'AdminWodModule.jsx',
  'AdminScheduleModule.jsx',
  'AdminCommunicationsModule.jsx',
  'AdminSettingsModule.jsx',
  'AdminBirthdaysModule.jsx',
  'AdminPersonalRecordsModule.jsx',
]

const forbiddenPatterns = [
  /from ['"].*supabase/,
  /useAdminData/,
  /useAdminFeedback/,
  /adminReserveForStudent/,
  /getCurrentSupabaseUser/,
  /\.rpc\s*\(/,
  /\.from\s*\(/,
]

const moduleRoot = dirname(fileURLToPath(import.meta.url))

for (const moduleName of moduleNames) {
  const source = readFileSync(join(moduleRoot, moduleName), 'utf8')
  assert.match(source, /export function Admin.*Module/, `${moduleName} debe exportar un modulo presentacional`)

  for (const pattern of forbiddenPatterns) {
    assert.equal(
      pattern.test(source),
      false,
      `${moduleName} no debe importar datos ni ejecutar consultas/mutaciones`,
    )
  }
}
