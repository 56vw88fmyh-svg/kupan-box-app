import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/* global console, process */

const appRoot = process.cwd()
const authSource = readFileSync(join(appRoot, 'src/pages/Auth.jsx'), 'utf8')
const authUtilsSource = readFileSync(join(appRoot, 'src/utils/auth.js'), 'utf8')

assert.match(authSource, /Olvidé mi contraseña/, 'login debe mostrar recuperación visible')
assert.match(authSource, /Enviar enlace de recuperación/, 'recuperación debe tener una acción clara')
assert.match(authSource, /Reintentar/, 'errores recuperables deben ofrecer reintento')
assert.match(authUtilsSource, /resetPasswordForEmail/, 'recuperación debe usar Supabase Auth')
assert.match(authUtilsSource, /\/actualizar-password/, 'recuperación debe volver a la ruta segura')
assert.match(authUtilsSource, /Si el correo está registrado/, 'respuesta no debe permitir enumerar usuarios')

console.log('Auth recovery tests passed')
