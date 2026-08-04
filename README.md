# KUPAN

App web progresiva para el box de CrossFit KUPAN. Incluye reservas, horarios, WOD del día, planes, comunidad, perfil de alumno, PRs y panel admin conectado a Supabase.

## Estado Actual

- Frontend: React + Vite + Tailwind CSS.
- Backend: Supabase Auth, tablas con RLS, RPC SQL y Edge Functions seguras.
- PWA instalable con manifest, iconos y service worker.
- Producción en `https://kupan-box-app.vercel.app`.
- Recuperación de contraseña disponible desde Login y Administración.
- Monitoreo periódico de web, Auth y base de datos mediante GitHub Actions.

## Variables De Entorno

Crea `.env.local` a partir de `.env.example`:

```bash
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_clave_anon_publica
```

No guardes `SUPABASE_SERVICE_ROLE_KEY` en React, Vercel, Netlify ni `.env.local`.
Esa llave se configura solo como secreto de Supabase Edge Functions:

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=TU_SERVICE_ROLE_KEY
```

## Ejecutar Local

```bash
npm install
npm run dev
```

Luego abre la URL que indique la terminal, normalmente:

```bash
http://localhost:5173/
```

## Verificar

```bash
npm run lint
npm test
npm run build
```

O todo junto:

```bash
npm run check
```

## Migraciones Supabase

El historial oficial está en `supabase/migrations/`. Para aplicar solo las migraciones pendientes:

```bash
supabase link --project-ref TU_PROJECT_REF
supabase migration list --linked
supabase db push --linked
```

No ejecutes nuevamente scripts antiguos de `supabase/sql/` si la función o política ya está migrada. Antes de producción confirma:

- RLS activo en tablas públicas.
- `profiles`, `plans`, `memberships`, `class_schedule`, `reservations`, `personal_records`, `wod`, `community_posts`.
- Funciones `is_admin()`, `has_active_membership()`, `available_spots()`, `birthdays_this_month()`.
- Trigger `handle_new_user()` para crear `profiles`.
- Función pública `kupan_health_check()` para monitoreo sin datos privados.

## Edge Function

Las funciones seguras están en `supabase/functions/`, entre ellas:

```text
supabase/functions/create-student/index.ts
supabase/functions/payment-webhook/index.ts
supabase/functions/admin-reset-user-password/index.ts
```

Deploy:

```bash
supabase login
supabase link --project-ref TU_PROJECT_REF
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=TU_SERVICE_ROLE_KEY
supabase functions deploy create-student
supabase functions deploy payment-webhook
supabase functions deploy admin-reset-user-password
```

`SUPABASE_SERVICE_ROLE_KEY` se mantiene únicamente en los secretos de Supabase.

## Monitoreo

El workflow `.github/workflows/uptime.yml` comprueba KUPAN cada 30 minutos. Configura estos secretos públicos de cliente en GitHub Actions:

```text
KUPAN_SUPABASE_URL
KUPAN_SUPABASE_ANON_KEY
```

Consulta [MONITORING_KUPAN.md](./MONITORING_KUPAN.md) para activar alertas y ejecutar una prueba manual.

## Publicar En Vercel

1. Sube el proyecto a GitHub.
2. Crea proyecto en Vercel.
3. Configura:

```text
Build Command: npm run build
Output Directory: dist
```

4. Agrega variables:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_APP_URL=https://kupan-box-app.vercel.app
```

5. Deploy.

`vercel.json` ya incluye rewrite a `index.html` para que React Router funcione al recargar rutas como `/admin`, `/perfil` o `/reservas`.

## Publicar En Netlify

Config:

```text
Build command: npm run build
Publish directory: dist
```

`netlify.toml` ya incluye redirect SPA a `index.html`.

## PWA

Archivos:

```text
public/manifest.webmanifest
public/sw.js
public/icons/
```

Para probar instalación:

1. Publica en HTTPS, por ejemplo Vercel.
2. Abre Chrome DevTools.
3. Revisa `Application > Manifest`.
4. En móvil, abre la web y usa “Agregar a pantalla principal”.
