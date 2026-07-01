# Auditoría de Preparación Piloto KUPAN

Fecha: 2026-07-01

## Estado inicial

El proyecto cuenta con Playwright, suite E2E no destructiva y documentación de release. La clasificación previa era APTO PARA PREVIEW.

## Suites existentes

- `public-routes.spec.js`: no requiere credenciales.
- `admin-access.spec.js`: parte sin sesión; roles requieren credenciales.
- `admin-navigation.spec.js`: requiere admin.
- `admin-responsive.spec.js`: requiere admin.
- `admin-wod-draft.spec.js`: requiere admin.
- `admin-forms.spec.js`: requiere admin.
- `admin-partial-errors.spec.js`: pendiente de admin y mocks por sección.
- `admin-mutations.spec.js`: requiere staging confirmado y cleanup.
- `pwa.spec.js`: no requiere credenciales.
- `accessibility-basic.spec.js`: no requiere credenciales.
- `session-expiry.spec.js`: pendiente de admin y estrategia de invalidación.

## Variables requeridas

- `E2E_BASE_URL`
- `E2E_ADMIN_EMAIL`
- `E2E_ADMIN_PASSWORD`
- `E2E_COACH_EMAIL`
- `E2E_COACH_PASSWORD`
- `E2E_STUDENT_EMAIL`
- `E2E_STUDENT_PASSWORD`
- `E2E_ALLOW_MUTATIONS`
- `E2E_STAGING_CONFIRMATION`
- `E2E_TEST_PREFIX`

## Seguridad de mutaciones

Las mutaciones reales se bloquean salvo que:

- `E2E_ALLOW_MUTATIONS=true`
- `E2E_STAGING_CONFIRMATION=I_CONFIRM_THIS_IS_NOT_PRODUCTION`
- `E2E_BASE_URL` no parezca producción
- exista prefijo E2E

## Datos requeridos

Para pruebas completas se requieren cuentas ficticias:

- Admin E2E activo.
- Coach E2E activo.
- Alumno E2E activo.

Para mutaciones se requieren datos aislados o capacidad de crearlos/limpiarlos:

- Alumno E2E.
- Plan E2E.
- Membresía E2E.
- Clase E2E.
- Reserva E2E.

## Cleanup

No existe todavía un cleanup automatizado seguro contra staging. Por esto las mutaciones destructivas deben permanecer omitidas hasta contar con una vía autorizada.

## Resultado

El sistema está preparado para pruebas no destructivas y autenticadas si se agregan credenciales. No está habilitado para mutaciones reales hasta configurar staging seguro y cleanup.
