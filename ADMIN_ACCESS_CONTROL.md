# ADMIN_ACCESS_CONTROL.md

## Objetivo

Separar la experiencia del alumno y el panel administrativo de Kupan Box App, evitando que un alumno vea controles administrativos o cargue bundles de administracion innecesarios.

## Arquitectura aplicada

### Experiencia alumno

La navegacion principal del alumno se mantiene en cinco areas:

- Inicio.
- Reservas.
- WOD.
- Comunidad.
- Perfil.

Estas rutas no requieren rol administrativo y no muestran accesos de administracion.

### Panel administrativo

El panel administrativo vive en:

- `/admin`

El modo coach vive en:

- `/coach`

Ambas rutas usan `ProtectedRoute` antes de renderizar el componente lazy. Esto evita que un alumno cargue el bundle administrativo cuando no tiene permiso.

Archivo involucrado:

- `src/navigation/ProtectedRoute.jsx`
- `src/App.jsx`
- `src/navigation/routes.js`

## Fuente de verdad del rol

La app no usa emails hardcodeados ni `localStorage` como fuente de permisos en runtime.

La fuente de verdad es Supabase:

- `auth.users` entrega la sesion autenticada.
- `public.profiles.role` define el rol.
- `public.profiles.status` debe estar en `active` para operar como admin o coach.

El frontend obtiene el rol real mediante:

- `src/utils/auth.js`
- RPC `public.get_my_profile()` cuando existe.
- Fallback seguro a `public.profiles` por `id = auth.uid()`.

## Proteccion de rutas frontend

Rutas con rol:

- `/admin`: requiere `role = admin` y `status = active`.
- `/coach`: requiere `role = admin` o `role = coach`, y `status = active`.

Si el usuario no tiene permiso:

- Usuario autenticado: redirige a `/perfil?access=restricted`.
- Usuario sin sesion: redirige a `/login?access=required`.

El perfil muestra un mensaje no tecnico y no revela informacion administrativa.

## Proteccion antes de acciones sensibles

El panel admin vuelve a consultar `getCurrentSupabaseUser()` antes de acciones sensibles como:

- Crear alumno.
- Modificar planes.
- Activar, pausar, renovar o extender membresias.
- Ajustar tokens.
- Crear reservas manuales.
- Confirmar o cancelar reservas.
- Guardar WOD.
- Guardar horarios.
- Publicar noticias o eventos.
- Guardar textos de la app.

Si el rol cambio durante la sesion, la accion se detiene y se muestra un mensaje.

Archivo involucrado:

- `src/pages/Admin.jsx`

## Separacion visual del admin

La navegacion del panel administrativo queda separada del alumno y organizada en:

- Resumen.
- WOD.
- Horarios.
- Reservas.
- Usuarios.
- Eventos.
- Noticias.
- Planes.
- Configuracion.

Esto reduce mezcla conceptual con la experiencia diaria del alumno.

## Auditoria RLS Supabase

Archivos revisados:

- `supabase/sql/admin-rls-fix.sql`
- `supabase/sql/coach-mode.sql`
- `supabase/sql/tokens-payments-reservations.sql`
- `supabase/sql/personal-records-exercises-migration.sql`
- `supabase/sql/app-settings.sql`
- `supabase/sql/notifications.sql`
- `supabase/sql/security-audit.sql`

### profiles

RLS habilitado en `admin-rls-fix.sql`.

- Usuario lee su propio perfil.
- Admin lee y gestiona perfiles si `public.is_admin()` es verdadero.

### reservations

RLS habilitado.

- Alumno lee sus propias reservas.
- Admin gestiona reservas.
- El SQL de tokens declara que los alumnos no tienen insert/update/delete directo sobre `reservations`; las reservas pasan por RPC.

### horarios / class_schedule

RLS habilitado.

- Alumno lee clases activas.
- Admin gestiona horarios.

### WOD

RLS habilitado.

- Lectura general.
- Escritura solo admin mediante `public.is_admin()`.

### noticias / eventos / community_posts

RLS habilitado.

- Usuario lee publicaciones activas.
- Admin gestiona publicaciones.

### planes / plans

RLS habilitado.

- Usuario lee planes activos.
- Admin gestiona planes.

### PR / personal_records

RLS habilitado.

- Alumno lee y gestiona sus propios PR.
- Admin puede revisar PR si `public.is_admin()` existe y esta activo.

## Funciones de rol

`public.is_admin()` valida:

- `profiles.id = auth.uid()`
- `role = 'admin'`
- `status = 'active'`

`public.is_coach_or_admin()` valida:

- `profiles.id = auth.uid()`
- `role in ('admin', 'coach')`
- `status = 'active'`

## Service role

No se usa `service_role` en el frontend.

Uso permitido detectado:

- Edge Functions de Supabase para operaciones servidor, por ejemplo creacion de alumnos o webhooks de pago.

Esto es correcto siempre que la clave service role permanezca solo en variables seguras del backend/Supabase.

## Riesgos detectados

### Riesgo medio: SQL historico con email hardcodeado

Archivo:

- `supabase/sql/sync-auth-users-profiles.sql`

Existe una regla historica que asigna admin por email durante sincronizacion. No es el control runtime actual de la app, pero se recomienda reemplazar esa practica por asignacion manual y auditada en `public.profiles.role`.

Recomendacion:

- No promover usuarios por email hardcodeado en nuevas migraciones.
- Promover administradores desde Supabase con revision manual.
- Mantener registro de quien cambia roles.

## Pruebas recomendadas

### Alumno accediendo a `/admin`

Resultado esperado:

- No carga el bundle admin.
- Redirige a perfil.
- Muestra mensaje de acceso restringido.

### Administrador valido

Resultado esperado:

- Entra a `/admin`.
- Carga datos desde Supabase.
- Puede guardar cambios.

### Sesion expirada

Resultado esperado:

- Redirige a login o bloquea la accion.
- No muestra datos administrativos.

### Cambio de rol durante sesion

Resultado esperado:

- La siguiente accion sensible consulta el rol actual.
- Si ya no es admin activo, detiene la accion.

### Acceso directo a rutas

Resultado esperado:

- `/admin` y `/coach` siempre pasan por `ProtectedRoute`.

### Manipulacion del frontend

Resultado esperado:

- Aunque se muestren botones manualmente, RLS/RPC de Supabase bloquea acciones sin permiso.

### Usuario sin perfil

Resultado esperado:

- No obtiene rol admin.
- No puede entrar a rutas protegidas.

## Rollback

Para revertir los cambios de frontend:

1. Restaurar `src/App.jsx` para renderizar `/admin` y `/coach` directamente.
2. Eliminar `src/navigation/ProtectedRoute.jsx`.
3. Restaurar `userCanAccessRoute` en `src/navigation/routes.js`.
4. Quitar el aviso `access=restricted` de `src/pages/Profile.jsx`.
5. Quitar `ensureFreshAdmin()` y sus llamadas en `src/pages/Admin.jsx`.

No se aplicaron migraciones destructivas ni cambios directos en la base de datos.
