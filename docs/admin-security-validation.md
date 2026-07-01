# Validación de Seguridad Admin KUPAN

Fecha: 2026-07-01

## Protección de rutas

`ProtectedRoute` usa `userCanAccessRoute()`:

- `/admin`: roles permitidos `admin`, perfil `active`.
- `/coach`: roles permitidos `admin`, `coach`, perfil `active`.

Si no hay sesión redirige a `/login?access=required`.  
Si hay usuario sin rol suficiente redirige a `/perfil?access=restricted`.

## Revalidación de rol

`Admin.jsx` ejecuta `ensureFreshAdmin()` antes de mutaciones. Esta función consulta `getCurrentSupabaseUser()` y bloquea la acción si el rol admin ya no está activo.

## Supabase y secretos

Resultado de búsqueda:

- No se encontró `service_role` en `src`.
- `SUPABASE_SERVICE_ROLE_KEY` aparece solo en Edge Functions y documentación.
- El frontend usa `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.

## Edge Functions

- `create-student`: usa service role dentro de Supabase Edge Function.
- `payment-webhook`: usa service role dentro de Supabase Edge Function.

No se movió ninguna clave secreta al frontend.

## Caché PWA

`public/sw.js` excluye de cache:

- `supabase.co`
- `/auth/v1/`
- `/rest/v1/`
- `/functions/v1/`
- `apikey=`
- `authorization=`
- `profiles`
- `reservations`
- `memberships`
- `notifications`
- `admin_`

Esto reduce riesgo de cachear respuestas administrativas privadas.

## Logs y credenciales

Se detectó que el panel muestra credenciales temporales creadas para alumnos en UI y permite copiarlas/enviarlas por WhatsApp. Eso es comportamiento esperado del flujo admin, pero debe usarse con cuidado operativo.

No se detectaron `console.log` de credenciales en `src`. En README de Edge Function hay ejemplos de consola, no forman parte del bundle frontend.

## Errores

Las utilidades usan mensajes humanos (`getHumanErrorMessage`) para evitar exponer detalles técnicos al usuario final. Los errores se registran mediante `logAppError`.

## Validaciones no ejecutadas

No se ejecutaron pruebas reales con:

- Usuario alumno intentando entrar a `/admin`.
- Usuario coach intentando acciones exclusivas de admin.
- Sesión expirada durante una mutación.
- RPC llamada sin sesión desde Supabase.
- Respuesta 403 real desde Edge Function.

Estas validaciones requieren ambiente Supabase con usuarios reales de prueba.

## Resultado

No se detectó exposición de `service_role` en frontend ni caché inseguro de Supabase. La autorización depende correctamente de roles y RLS/RPC, pero falta validación operativa real con usuarios de prueba.
