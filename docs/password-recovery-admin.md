# Recuperación y reasignación de contraseña KUPAN

## Flujo implementado

Admin puede abrir `Admin > Alumnos > Gestionar contraseña` y elegir:

- Enviar correo de recuperación al email registrado del alumno.
- Asignar contraseña temporal mediante Edge Function segura.

La contraseña actual nunca se muestra ni se recupera.

## Edge Function

Nombre:

```bash
admin-reset-user-password
```

Ubicación:

```bash
supabase/functions/admin-reset-user-password
```

Deploy:

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

## SQL requerido

Ejecutar en Supabase SQL Editor:

```bash
supabase/sql/admin-security-audit.sql
```

La tabla `admin_security_audit` registra acciones sin guardar contraseñas, tokens ni enlaces.

## URLs permitidas en Supabase Auth

Agregar en Authentication > URL Configuration:

```text
https://kupan-app.vercel.app/actualizar-password
http://localhost:5173/actualizar-password
```

Si se usa otro dominio final, agregar también:

```text
https://DOMINIO-PRODUCCION/actualizar-password
```

## Prueba manual mínima

- Admin ve el botón `Gestionar contraseña`.
- Alumno y coach no ven la acción.
- Admin envía correo de recuperación.
- El enlace abre `/actualizar-password`.
- Admin asigna contraseña temporal.
- Alumno inicia sesión con temporal.
- Alumno queda obligado a `/cambio-password-obligatorio`.
- Al cambiar contraseña, vuelve a Perfil y `force_password_change` queda en `false`.

