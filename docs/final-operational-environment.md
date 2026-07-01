# Entorno Operativo Final KUPAN

Fecha: 2026-07-01

## Estado

Validación técnica local completada. El entorno queda apto para piloto interno supervisado, pero no para apertura masiva hasta completar credenciales reales, deploy operativo y pruebas físicas.

## Datos registrados

- URL operativa a compartir: pendiente de confirmar.
- Rama desplegada esperada: `auditoria/kupan-tecnica-2026-06-19`.
- Commit validado localmente: `ad7b080`.
- Deployment ID Vercel: pendiente de confirmar en Vercel.
- Fecha de deploy: pendiente de confirmar.
- Supabase Project Ref parcial: `eihk…fxui`.
- Deploy anterior estable: pendiente de confirmar.
- Acceso a Vercel: pendiente de confirmación del responsable.
- Acceso a Supabase: pendiente de confirmación del responsable.
- Estado del respaldo: pendiente de confirmación.
- Responsable de rollback: pendiente de completar.

## Variables

- `VITE_SUPABASE_URL`: presente en entorno local.
- `VITE_SUPABASE_ANON_KEY`: presente en entorno local.
- `service_role`: no presente en frontend ni en `.env.local`.
- Credenciales E2E: no presentes en frontend; existen solo variables esperadas en archivos de ejemplo/tests.

## Pendiente Vercel

- Confirmar variables reales en el proyecto de Vercel sin exponer valores.
- Confirmar URL productiva en Supabase Auth.
- Confirmar redirects de login.
- Confirmar recarga directa de rutas SPA en producción.

