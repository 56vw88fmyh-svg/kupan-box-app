# Readiness Staging KUPAN

## Estado

Clasificacion actual: APTO PARA PREVIEW.

No se puede declarar staging configurado porque faltan URL staging, cuentas E2E, confirmacion de entorno y cleanup destructivo aprobado.

## Automatizado

- Validador local E2E: `npm run qa:e2e:validate`.
- Cleanup dry-run: `npm run qa:e2e:cleanup:dry`.
- Suite autenticada sin mutaciones: `npm run qa:e2e:authenticated`.
- Suite piloto sin secretos en scripts: `npm run qa:pilot`.
- Registro de recursos E2E.
- Reporte de cleanup dry-run.

## Manual pendiente

- Crear Supabase staging separado.
- Aplicar SQL del repositorio en staging.
- Desplegar Edge Functions en staging.
- Crear Vercel staging.
- Configurar variables Vercel staging.
- Crear cuentas E2E ficticias.
- Crear `.env.e2e` local.
- Confirmar roles.
- Aprobar cleanup por recurso.

## Variables faltantes

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

## Cuentas faltantes

- Admin E2E.
- Coach E2E.
- Alumno E2E.

## Cleanup

- Dry-run disponible.
- Cleanup destructivo no aprobado.
- Mutaciones bloqueadas.

## Comando siguiente exacto

Despues de crear `.env.e2e` local con staging:

```bash
npm run qa:e2e:validate
```

Si aprueba:

```bash
npm run qa:e2e:authenticated
```

Mantener `E2E_ALLOW_MUTATIONS=false` hasta aprobar cleanup.
