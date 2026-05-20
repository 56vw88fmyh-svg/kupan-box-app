# KUPAN

App web progresiva para el box de CrossFit KUPAN. Incluye reservas, horarios, WOD del día, planes, comunidad, perfil de alumno, PRs y panel admin conectado a Supabase.

## Estado Actual

- Frontend: React + Vite + Tailwind CSS.
- Backend: Supabase Auth, tablas con RLS, RPC SQL y Edge Function `create-student`.
- PWA instalable con manifest, iconos y service worker.
- Deploy listo para Vercel y Netlify.

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
npm run build
```

O todo junto:

```bash
npm run check
```

## Supabase

Ejecuta en Supabase SQL Editor los scripts SQL del proyecto:

```text
supabase/sql/app-settings.sql
supabase/sql/birthdays-functions.sql
```

Además, el esquema principal debe tener:

- RLS activo en tablas públicas.
- `profiles`, `plans`, `memberships`, `class_schedule`, `reservations`, `personal_records`, `wod`, `community_posts`.
- Funciones `is_admin()`, `has_active_membership()`, `available_spots()`, `birthdays_this_month()`.
- Trigger `handle_new_user()` para crear `profiles`.

## Edge Function

La función segura para crear alumnos está en:

```text
supabase/functions/create-student/index.ts
```

Deploy:

```bash
supabase login
supabase link --project-ref TU_PROJECT_REF
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=TU_SERVICE_ROLE_KEY
supabase functions deploy create-student
```

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
