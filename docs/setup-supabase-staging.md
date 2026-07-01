# Setup Supabase Staging KUPAN

## Objetivo

Crear un proyecto Supabase separado para pruebas E2E y piloto controlado, sin copiar datos personales ni tocar produccion.

## Crear proyecto

1. Entrar a Supabase con la cuenta del proyecto.
2. Crear un proyecto nuevo y nombrarlo con una marca clara, por ejemplo `kupan-staging`.
3. Elegir una region cercana a Chile o la misma region operativa prevista.
4. Registrar el Project Ref en un documento privado del equipo, sin publicarlo en Git.
5. Confirmar que el Project Ref no coincide con produccion.

## Estrategia disponible en este repositorio

- Migraciones versionadas Supabase CLI: no disponibles.
- Dump de esquema completo: no disponible.
- Archivos SQL por modulo: disponibles en `supabase/sql/`.
- Edge Functions: disponibles en `supabase/functions/create-student` y `supabase/functions/payment-webhook`.
- Estrategia recomendada actual: aplicar SQL por modulo en staging y desplegar Edge Functions contra el proyecto staging.

## Replicar estructura

Aplicar en staging, revisando errores tras cada archivo:

1. `supabase/sql/tokens-payments-reservations.sql`
2. `supabase/sql/admin-rls-fix.sql`
3. `supabase/sql/get-my-profile.sql`
4. `supabase/sql/sync-auth-users-profiles.sql`
5. `supabase/sql/admin-manual-reservations.sql`
6. `supabase/sql/coach-mode.sql`
7. `supabase/sql/app-settings.sql`
8. `supabase/sql/community-public-feed.sql`
9. `supabase/sql/birthdays-functions.sql`
10. `supabase/sql/pr-ranking.sql`
11. `supabase/sql/personal-records-exercises-migration.sql`
12. `supabase/sql/notifications.sql`
13. `supabase/sql/security-audit.sql`

Si un archivo depende de objetos ya existentes, aplicar primero el esquema base que contiene esas tablas. No aplicar SQL en produccion durante esta preparacion.

## Auth

1. Configurar Site URL con la URL Vercel staging.
2. Configurar Redirect URLs para staging.
3. Confirmar que registro/login funcionen en staging.
4. Crear solo usuarios ficticios E2E.

## Edge Functions

Desplegar las funciones contra staging:

- `create-student`
- `payment-webhook`

Configurar secretos solo dentro de Supabase staging:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

No usar `SUPABASE_SERVICE_ROLE_KEY` en React, Vercel ni `.env.local`.

## Datos ficticios minimos

Crear solo datos de prueba:

- Admin: `KUPAN E2E ADMIN`
- Coach: `KUPAN E2E COACH`
- Alumno: `KUPAN E2E STUDENT`
- Un plan tokenizado.
- Un plan Full si se quiere probar ilimitado.
- Un horario activo.
- Una membresia pagada.
- Una reserva de prueba.
- Un WOD de fecha segura.
- Un post/comunicacion E2E.
- Settings minimos.

Todos los nombres, notas y referencias deben usar prefijo `kupan-e2e` o `KUPAN E2E`.

## Validacion

1. Confirmar RLS activo en tablas sensibles.
2. Confirmar `is_admin()` o equivalente funcionando para el admin E2E.
3. Confirmar que alumno no accede a `/admin`.
4. Confirmar que coach accede a `/coach`.
5. Confirmar que los datos ficticios se pueden limpiar sin tocar datos reales.

## Prohibiciones

- No copiar perfiles reales.
- No copiar reservas reales.
- No copiar membresias reales.
- No usar pagos reales.
- No reutilizar cuentas reales.
