import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const hooksRoot = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(hooksRoot, 'useAdminWodDraft.js'), 'utf8')

assert.match(source, /export function useAdminWodDraft/, 'debe exportar useAdminWodDraft')
assert.match(source, /WOD_DRAFT_STORAGE_KEY/, 'debe usar la clave oficial del borrador WOD')
assert.match(source, /window\.setTimeout/, 'debe implementar debounce con setTimeout')
assert.match(source, /window\.clearTimeout/, 'debe limpiar el debounce anterior')
assert.match(source, /beforeunload/, 'debe persistir antes de recarga o cierre')
assert.match(source, /storage/, 'debe escuchar cambios de storage entre pestañas')
assert.match(source, /hasMeaningfulWodDraftContent/, 'debe evitar guardar borradores vacíos')
assert.match(source, /classifyStoredWodDraft/, 'debe comparar el borrador contra WOD remoto')
assert.match(source, /identical_to_remote/, 'debe ocultar borradores idénticos al remoto')
assert.match(source, /markRemoteSaveSuccessful/, 'debe exponer limpieza tras guardado remoto exitoso')
assert.match(source, /storageError/, 'debe exponer errores de almacenamiento de forma controlada')
assert.equal(/supabase|\.rpc\(|\.from\(|functions\.invoke|service_role/i.test(source), false, 'no debe tocar Supabase ni claves sensibles')

const autoRecoverPattern = /useEffect\([^)]*=>[\s\S]*recoverStoredDraft\(\)/
assert.equal(autoRecoverPattern.test(source), false, 'no debe recuperar borradores automáticamente desde efectos')
