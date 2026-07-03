import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateTemporaryPassword, validateSecurePassword } from './passwordSecurity.js'

assert.equal(validateSecurePassword('abc', 'abc', 'alumno@kupan.cl').ok, false)
assert.equal(validateSecurePassword('Password1', 'Password2', 'alumno@kupan.cl').errors.confirmation, 'Las contraseñas no coinciden.')
assert.equal(validateSecurePassword(' alumnoA1', ' alumnoA1', 'alumno@kupan.cl').ok, false)
assert.equal(validateSecurePassword('AlumnoA1', 'AlumnoA1', 'alumno@kupan.cl').ok, true)
assert.equal(validateSecurePassword('AlumnoA1', 'AlumnoA1', 'alumno@kupan.cl', { requireSymbol: true }).ok, false)
assert.equal(validateSecurePassword('AlumnoA1!', 'AlumnoA1!', 'alumno@kupan.cl', { requireSymbol: true }).ok, true)
assert.equal(validateSecurePassword('alumno@kupan.cl', 'alumno@kupan.cl', 'alumno@kupan.cl').ok, false)

const generated = generateTemporaryPassword()
assert.equal(generated.length >= 12 && generated.length <= 16, true)
assert.match(generated, /[A-Z]/)
assert.match(generated, /[a-z]/)
assert.match(generated, /\d/)
assert.match(generated, /[!@#$%*\-_]/)

const testRoot = dirname(fileURLToPath(import.meta.url))
const appRoot = join(testRoot, '..', '..')
const edgeSource = readFileSync(join(appRoot, 'supabase/functions/admin-reset-user-password/index.ts'), 'utf8')
const frontendPasswordSource = readFileSync(join(appRoot, 'src/utils/adminPassword.js'), 'utf8')
const modalSource = readFileSync(join(appRoot, 'src/components/admin/AdminPasswordModal.jsx'), 'utf8')

assert.match(edgeSource, /auth\.admin\.getUserById/, 'Edge Function debe recuperar metadata actual')
assert.match(edgeSource, /\.\.\.currentMetadata/, 'Edge Function debe conservar metadata existente')
assert.match(edgeSource, /force_password_change:\s*true/, 'Edge Function debe marcar cambio obligatorio')
assert.match(edgeSource, /\.from\('profiles'\)/, 'Edge Function debe consultar profiles')
assert.match(edgeSource, /\.eq\('id', userData\.user\.id\)/, 'Edge Function debe validar el perfil del usuario autenticado')
assert.match(edgeSource, /adminProfile\?\.role !== 'admin'/, 'Edge Function debe exigir role admin')
assert.match(edgeSource, /adminProfile\?\.status !== 'active'/, 'Edge Function debe exigir admin activo')
assert.match(edgeSource, /isUuid\(targetUserId\)/, 'Edge Function debe validar UUID objetivo')
assert.match(edgeSource, /targetUserId === userData\.user\.id/, 'Edge Function debe bloquear auto-reset del admin')
assert.match(edgeSource, /targetProfile\.role !== 'student'/, 'Edge Function debe limitarse a alumnos')
assert.match(edgeSource, /method: 'temporary_password'/, 'Edge Function debe registrar metodo sin secretos')
assert.match(frontendPasswordSource, /https:\/\/kupan-box-app\.vercel\.app/, 'Recuperación debe usar el dominio productivo KUPAN esperado')
assert.doesNotMatch(frontendPasswordSource, /https:\/\/kupan-app\.vercel\.app/, 'Recuperación no debe usar el dominio antiguo kupan-app')
assert.equal(/SUPABASE_SERVICE_ROLE_KEY/.test(frontendPasswordSource), false, 'Frontend no debe mencionar service role')
assert.equal(/localStorage|sessionStorage/.test(modalSource), false, 'Modal no debe persistir contraseñas temporales')
