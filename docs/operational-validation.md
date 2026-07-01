# Validación Operativa KUPAN

Fecha: 2026-07-01

## Estado

KUPAN queda validada para uso interno supervisado, con pruebas automáticas completas en frontend y sin cambios de baseline Supabase en esta etapa.

## Evidencia automática

- Lint: OK (`npm run lint`).
- Tests: OK (`npm test`).
- Build: OK (`npm run build`).
- Check: OK (`npm run check`).
- E2E: OK parcial (`npm run test:e2e`): 10 pasaron, 15 saltados por falta de entorno autenticado/staging seguro.

## Alcance validado

- La aplicación usa variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
- No se debe usar `service_role` en frontend.
- Revisión frontend: no se encontró `service_role` real en `src`, `public`, `index.html`, `vite.config.js`, `vercel.json` ni `netlify.toml`.
- El baseline reproducible de Supabase queda tratado como deuda técnica post-lanzamiento y no bloquea el uso interno diario.
- No se ejecutaron seeds, pagos reales, migraciones destructivas ni deploy desde esta validación.

## Corrección aplicada

- Se reforzó la confirmación de cancelación de reservas para evitar doble ejecución mientras una cancelación está procesando.
- Se agregó prueba de regresión para proteger ese comportamiento.

## Pendiente manual

- Validar en dispositivo real iPhone/Android con alumno, coach y admin reales.
- Confirmar URL final de producción y variables configuradas en Vercel antes de compartir masivamente.
