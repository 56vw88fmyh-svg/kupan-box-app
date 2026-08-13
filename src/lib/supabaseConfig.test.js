import assert from 'node:assert/strict'
import { isSupabaseBindingCompatible } from './supabase.js'

/* global console */

assert.equal(isSupabaseBindingCompatible('kupan'), true, 'KUPAN conserva compatibilidad con su entorno actual')
assert.equal(isSupabaseBindingCompatible('fittest'), false, 'FITTEST no puede heredar credenciales sin vinculacion')
assert.equal(isSupabaseBindingCompatible('fittest', 'kupan'), false)
assert.equal(isSupabaseBindingCompatible('fittest', 'fittest'), true)

console.log('supabase config isolation tests passed')
