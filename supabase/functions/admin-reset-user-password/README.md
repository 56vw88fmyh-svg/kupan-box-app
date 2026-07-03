# admin-reset-user-password

Edge Function segura para que un administrador KUPAN reasigne una contraseña temporal a un alumno.

## Secretos requeridos

Configurar solo en Supabase Edge Functions:

```bash
supabase secrets set SUPABASE_URL=...
supabase secrets set SUPABASE_ANON_KEY=...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
```

`SUPABASE_SERVICE_ROLE_KEY` nunca debe estar en React, Vercel, Netlify ni variables `VITE_`.

## Deploy

```bash
supabase functions deploy admin-reset-user-password
```

La función valida el JWT del solicitante, confirma `profiles.role = 'admin'` y `profiles.status = 'active'`, exige que el usuario objetivo sea `profiles.role = 'student'`, bloquea auto-reset del admin, conserva metadatos existentes y agrega `force_password_change: true`.
