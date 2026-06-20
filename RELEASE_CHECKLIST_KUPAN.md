# RELEASE CHECKLIST KUPAN

Responsable de release: KUPAN App  
Fecha de preparacion: 2026-06-19  
Version candidata: `v1.0.10`  
Service Worker: `v14`  
Estado: preparado para preview. No publicar produccion hasta completar la prueba critica de PR en preview.

## 1. Estado antes del despliegue

| Control | Estado | Nota |
| --- | --- | --- |
| Cambios sin revisar | Pendiente antes de publicar | Existen cambios locales sin commit. Deben revisarse, commitearse y quedar como punto de rollback. |
| Version identificable | OK | `package.json`, `package-lock.json` y footer muestran `v1.0.10`. |
| Cache PWA renovada | OK | `public/sw.js` usa `CACHE_VERSION = 'v14'`. |
| Build | OK | `npm run build` ejecutado correctamente. |
| Linter | OK | `npm run lint` ejecutado correctamente. |
| TypeScript | OK parcial | No existe script `tsc`; los archivos TS actuales compilan dentro de Vite y las pruebas TS pasan. |
| Pruebas unitarias/servicios | OK | `npm test` ejecutado correctamente. |
| Pruebas de rutas | OK | Incluidas en `npm test` mediante `src/navigation/routes.test.js`. |
| Accesibilidad | OK parcial | Revision estatica: labels, alt, botones principales y focus states. Ejecutar Lighthouse/axe en preview antes de produccion. |
| Variables de entorno locales | OK | `.env.local` existe y contiene las variables necesarias. No se deben publicar valores en documentacion ni consola. |
| Variables Vercel | Pendiente verificar en Vercel | Confirmar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en Project Settings. |
| Service role en frontend | OK | No aparece en `src` ni `public`. Solo en Edge Functions y documentacion de secretos. |
| Claves privadas en repositorio | OK | Git solo trackea `.env.example`; `.env.local` y `.env.functions` estan ignorados. |
| Manifest PWA | OK | `public/manifest.webmanifest` presente con nombre KUPAN, iconos y tema oscuro. |
| Service Worker | OK | No cachea Supabase/auth/perfiles/reservas/membresias/PR/notificaciones/admin. |
| Rutas SPA en Vercel | OK | `vercel.json` reescribe `/(.*)` a `/index.html`. |
| Rutas SPA en Netlify | OK | `netlify.toml` redirige `/*` a `/index.html`. |
| PR en Supabase | Pendiente prueba viva | Confirmar en preview con usuario de prueba y otro dispositivo. |
| RLS | OK documentado, pendiente prueba viva | SQL contiene RLS y policies; confirmar con usuario alumno/admin en Supabase productivo. |

## 2. Migraciones SQL documentadas

Las migraciones y funciones Supabase estan documentadas en `supabase/sql/`:

1. `supabase/sql/admin-rls-fix.sql`
2. `supabase/sql/tokens-payments-reservations.sql`
3. `supabase/sql/admin-manual-reservations.sql`
4. `supabase/sql/coach-mode.sql`
5. `supabase/sql/app-settings.sql`
6. `supabase/sql/community-public-feed.sql`
7. `supabase/sql/birthdays-functions.sql`
8. `supabase/sql/notifications.sql`
9. `supabase/sql/pr-ranking.sql`
10. `supabase/sql/personal-records-exercises-migration.sql`
11. `supabase/sql/get-my-profile.sql`
12. `supabase/sql/sync-auth-users-profiles.sql`
13. `supabase/sql/security-audit.sql`

Antes de produccion, ejecutar `supabase/sql/security-audit.sql` en Supabase SQL Editor y guardar captura/resultados internos. No aplicar migraciones destructivas durante el release.

## 3. Variables necesarias

### Vercel

Configurar en Vercel sin mostrar valores:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Supabase Edge Functions

Configurar como secretos de Supabase, nunca en React/Vercel:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PAYMENT_WEBHOOK_SECRET`

## 4. Pruebas ejecutadas localmente

```bash
npm run lint
npm test
npm run build
```

Resultado: OK.

Build generado en `dist/` con manifest, service worker e iconos PWA.

## 5. Pruebas obligatorias en preview

No promover a produccion hasta completar:

1. Abrir preview Vercel en iPhone/Android.
2. Login alumno.
3. Login admin.
4. Logout y recuperacion de sesion.
5. Ruta directa `/perfil` recargada desde navegador.
6. Ruta directa `/reservas` recargada desde navegador.
7. Ruta directa `/admin` con admin.
8. Alumno entrando a `/admin`, debe ver acceso denegado o redireccion segura.
9. Reserva con plan activo y tokens.
10. Cancelacion de reserva y devolucion de token cuando corresponda.
11. Clase llena bloqueada.
12. Registro, edicion y eliminacion de PR.
13. WOD del dia.
14. Comunidad, ranking y ultimos PR.
15. Modo Coach.
16. Banner "Nueva version disponible" al desplegar version posterior.
17. PWA instalada abre sin pantalla blanca.
18. Sin conexion muestra aviso y no pierde datos visibles.

## 6. Prueba critica de PR

Estado: pendiente en preview. No publicar produccion hasta que pase completa.

Pasos:

1. Iniciar sesion con usuario de prueba.
2. Ir a `Mis PR`.
3. Registrar un PR nuevo con movimiento, valor, unidad y fecha.
4. Cerrar la app o el navegador.
5. Abrir nuevamente el preview.
6. Confirmar que el PR sigue visible.
7. Desplegar una nueva version preview o forzar actualizacion PWA.
8. Abrir la app y confirmar que el PR sigue visible.
9. Iniciar sesion desde otro dispositivo.
10. Confirmar que el PR existe.
11. Verificar en Supabase `personal_records` que el registro pertenece al usuario correcto.

Resultado esperado:

- El PR no desaparece.
- El PR no queda solo en localStorage.
- El PR aparece en otro dispositivo.
- Otro alumno no puede verlo como propio.

## 7. Plan de release

1. Revisar cambios locales:
   ```bash
   git status
   ```
2. Crear commit de release:
   ```bash
   git add .
   git commit -m "Release KUPAN v1.0.10"
   ```
3. Crear tag de rollback:
   ```bash
   git tag kupan-v1.0.10
   ```
4. Subir a GitHub:
   ```bash
   git push origin HEAD
   git push origin kupan-v1.0.10
   ```
5. Vercel generara preview automaticamente.
6. Ejecutar las pruebas obligatorias de preview.
7. Si todo pasa, promover preview a produccion desde Vercel.
8. Abrir produccion en modo normal y PWA instalada.
9. Confirmar footer `KUPAN App v1.0.10`.
10. Confirmar que aparece el aviso de actualizacion si habia una version anterior instalada.
11. Confirmar datos antiguos: perfil, reservas, membresia, tokens y PR.

## 8. Plan de rollback

### Volver al despliegue anterior en Vercel

1. Entrar a Vercel.
2. Ir a Project > Deployments.
3. Elegir el despliegue anterior estable.
4. Usar "Promote to Production".
5. Verificar que la app vuelve a abrir y que Supabase conserva datos.

### Revertir codigo

Opcion segura si el commit de release falla:

```bash
git revert <commit_release>
git push origin HEAD
```

No usar `reset --hard` si hay trabajo local sin revisar.

### Revertir migraciones sin borrar datos

Regla: no eliminar tablas ni registros en caliente.

1. Crear una migracion correctiva nueva.
2. Desactivar temporalmente constraints/policies defectuosas solo si bloquean operacion.
3. Mantener columnas nuevas aunque no se usen.
4. Si una funcion RPC falla, reemplazarla con `create or replace function`.
5. Guardar respaldo o export de tablas sensibles antes de cambios:
   - `profiles`
   - `memberships`
   - `reservations`
   - `membership_token_movements`
   - `personal_records`

### Desactivar temporalmente una funcion defectuosa

- Frontend: volver al despliegue anterior en Vercel.
- RPC Supabase: reemplazar funcion por version anterior usando SQL guardado.
- Edge Function: redeploy de version anterior o desactivar uso desde Admin temporalmente con rollback frontend.
- Pagos: no aceptar pagos reales si `payment-webhook` falla; usar activacion manual admin hasta corregir.

### Recuperar registros pendientes

PR pendientes/offline:

1. Pedir al alumno que no borre datos del navegador.
2. Volver a abrir la app con internet.
3. Entrar a `Mis PR` para disparar reintento de sincronizacion.
4. Si no aparece, revisar backup local documentado en `REGISTRO_MIGRACION_PR_KUPAN.md`.
5. Reingresar manualmente en Admin o con cuenta del alumno solo si se valida el dato.

Reservas/tokens:

1. Revisar `reservations` por alumno y fecha.
2. Revisar `membership_token_movements`.
3. Ajustar tokens desde Admin con movimiento `manual_adjustment`, no editando directo desde tabla salvo emergencia.

## 9. Criterio de publicacion

Publicar produccion solo si:

- `npm run lint` pasa.
- `npm test` pasa.
- `npm run build` pasa.
- Preview Vercel abre rutas directas.
- Variables Vercel estan configuradas.
- Prueba critica de PR pasa completa.
- Admin puede ver alumnos y reservas.
- Alumno puede reservar y cancelar.
- PWA instalada muestra `v1.0.10`.
- No hay errores visibles en consola del preview.

Si falla una prueba critica, no publicar produccion. Corregir, crear nueva version y repetir preview.
