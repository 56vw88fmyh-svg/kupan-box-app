# Auditoría de Entorno QA E2E

Fecha: 2026-07-01

## Herramientas detectadas antes de instalar

- Playwright: no existía.
- Cypress: no detectado.
- Vitest: no detectado.
- Testing Library: no detectado.
- jsdom: no detectado.
- happy-dom: no detectado.
- react-test-renderer: no detectado.
- Tests Node existentes: sí, mediante `node` + `assert`.

## Herramientas instaladas

- `@playwright/test` como dependencia de desarrollo.
- Chromium mediante `npx playwright install chromium`.

## Configuración existente

- Bundler: Vite.
- Framework: React.
- Rutas: React Router en `src/App.jsx` y `src/navigation/routes.js`.
- PWA: `public/sw.js` y `public/manifest.webmanifest`.
- Supabase: cliente frontend con variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.

## Entorno Supabase

No se detectó ni se ejecutó Supabase local durante esta intervención.

No se encontraron fixtures de usuarios de prueba versionados.

Variables esperadas para E2E:

- `E2E_ADMIN_EMAIL`
- `E2E_ADMIN_PASSWORD`
- `E2E_COACH_EMAIL`
- `E2E_COACH_PASSWORD`
- `E2E_STUDENT_EMAIL`
- `E2E_STUDENT_PASSWORD`
- `E2E_BASE_URL`
- `E2E_ALLOW_MUTATIONS`

## Seguridad

Se creó `.env.e2e.example` con valores ficticios.  
`.env.e2e` quedó agregado a `.gitignore`.

## Limitaciones iniciales

- Sin cuentas de prueba no se pueden aprobar flujos admin autenticados.
- Sin staging seguro no se ejecutan mutaciones reales.
- Sin dispositivos físicos no se puede aprobar iPhone/Android/tablet real.
