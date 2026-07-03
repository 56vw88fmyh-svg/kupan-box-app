# Recuperación y reasignación de contraseña KUPAN

## Flujo implementado

Admin puede abrir `Admin > Alumnos > Gestionar contraseña` y elegir:

- Enviar correo de recuperación al email registrado del alumno.
- Asignar contraseña temporal mediante Edge Function segura.

La contraseña actual nunca se muestra ni se recupera.

La Edge Function restringe CORS a:

- `https://kupan-box-app.vercel.app`
- `http://localhost:5173`

## Edge Function

Nombre:

```bash
admin-reset-user-password
```

Ubicación:

```bash
supabase/functions/admin-reset-user-password
```

Despliegue:

```bash
supabase functions deploy admin-reset-user-password
```

## Secretos requeridos

Configurar solo en Supabase Edge Functions:

```bash
supabase secrets set SUPABASE_URL=...
supabase secrets set SUPABASE_ANON_KEY=...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
```

No configurar `SUPABASE_SERVICE_ROLE_KEY` en React, Vercel, Netlify ni variables `VITE_`.

## Migración oficial

La fuente oficial y versionada de auditoría es:

```bash
supabase/migrations/20260703162500_admin_security_audit.sql
```

Aplicar migraciones con una sola vía:

```bash
supabase login
supabase link --project-ref TU_PROJECT_REF
supabase db push
```

No ejecutar un SQL manual adicional después de `supabase db push`.

La tabla `admin_security_audit` registra acciones sin guardar contraseñas, tokens ni enlaces.

## Verificación de función

```bash
supabase functions list
```

## URLs permitidas en Supabase Auth

Agregar en Authentication > URL Configuration:

```text
Site URL:
https://kupan-box-app.vercel.app

Redirect URLs:
https://kupan-box-app.vercel.app/actualizar-password
http://localhost:5173/actualizar-password
```

Si se mantiene un alias adicional, agregarlo también:

```text
https://DOMINIO-PRODUCCION/actualizar-password
```

## Prueba manual mínima

- Admin ve el botón `Gestionar contraseña`.
- Alumno y coach no ven la acción.
- Admin envía correo de recuperación.
- El enlace abre `/actualizar-password`.
- Admin asigna contraseña temporal.
- La función rechaza cuentas admin/coach y auto-reset del propio admin.
- Alumno inicia sesión con temporal.
- Alumno queda obligado a `/cambio-password-obligatorio`.
- Al cambiar contraseña, vuelve a Perfil y `force_password_change` queda en `false`.
