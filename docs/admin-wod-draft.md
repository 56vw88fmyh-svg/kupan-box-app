# Borrador Local WOD Admin

Fecha: 2026-06-30

## Objetivo

Evitar pérdida accidental del formulario WOD del panel admin por recarga, cierre del navegador, actualización PWA, pérdida temporal de conexión, sesión vencida o error al guardar en Supabase.

## Persistencia

- Clave: `kupan_admin_wod_draft_v1`
- Versión: `1`
- Medio: `localStorage`
- Alcance: solo este dispositivo y navegador.
- Persistencia definitiva: Supabase mediante `wod.upsert(..., { onConflict: 'date' })`.

## Estructura

```json
{
  "version": 1,
  "savedAt": "2026-06-30T21:00:00.000Z",
  "date": "2026-07-01",
  "draft": {
    "date": "2026-07-01",
    "title": "",
    "warmup": "",
    "strength": "",
    "workout": "",
    "time_cap": "",
    "notes": ""
  },
  "remoteReference": {
    "id": "remote-id",
    "date": "2026-07-01",
    "updated_at": "2026-06-30T20:00:00.000Z",
    "created_at": "2026-06-30T19:00:00.000Z"
  }
}
```

No se almacenan tokens de sesión, claves Supabase, datos de usuario, funciones ni refs.

## Contenido significativo

La fecha no cuenta como contenido suficiente porque el formulario siempre la incluye. Se considera borrador válido cuando alguno de estos campos tiene texto real:

- `title`
- `warmup`
- `strength`
- `workout`
- `time_cap`
- `notes`

## Expiración

Los borradores vencen después de 14 días (`WOD_DRAFT_MAX_AGE_MS`). La antigüedad se calcula con timestamps UTC y no depende de zona horaria.

## Autoguardado

El hook usa debounce de 700 ms con `setTimeout`. Si el draft cambia, cancela el temporizador anterior y guarda solo la última versión significativa.

## Recuperación

La app nunca recupera automáticamente. Si existe un borrador recuperable, el módulo WOD muestra un aviso con fecha, último respaldo y acciones:

- Recuperar
- Descartar

Si el formulario actual tiene cambios distintos, `Admin.jsx` pide confirmación antes de reemplazarlo.

## Descarte

Descartar elimina solo `kupan_admin_wod_draft_v1`. No modifica Supabase ni borra el formulario actual.

## Guardado remoto exitoso

Después de que Supabase confirma éxito, `Admin.jsx` limpia el borrador local y mantiene el comportamiento actual de reiniciar el formulario.

## Error remoto

Si falla el guardado en Supabase, el borrador local se mantiene y el formulario no se limpia.

## Comparación con remoto

El hook compara el borrador con el WOD remoto de la misma fecha cuando existe:

- Si es idéntico al remoto, lo limpia y no ofrece recuperación.
- Si es diferente, lo muestra como recuperable.
- Si no hay datos suficientes, lo muestra como recuperable.
- Si está vencido o corrupto, lo descarta de forma segura.

## Cambio de fecha

Se usa una sola clave con fecha interna. El borrador guarda el draft completo, incluida su fecha, para evitar mezclar campos entre días distintos. No se crean múltiples claves por fecha en esta etapa.

## PWA

El borrador no se guarda en Cache Storage ni se envía por red. Las actualizaciones PWA pueden recargar la app, pero el hook intenta persistir antes de `beforeunload`.

## Storage bloqueado

Si `localStorage` no existe, está bloqueado, está corrupto o lanza error de cuota, el Admin sigue funcionando y el WOD puede guardarse en Supabase. El hook expone `storageError` para mostrar un aviso no invasivo.

## Contratos preservados

- No cambia la tabla `wod`.
- No agrega columnas.
- No cambia payloads.
- No cambia RPC.
- No toca RLS.
- No agrega `service_role`.
- No cambia `/coach`.
- No agrega publicación programada.
