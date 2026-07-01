# Validacion Entorno Staging KUPAN

Fecha: 2026-06-30

## Resultado

- Estado: no confirmado para piloto controlado.
- Tipo de entorno validado: local por defecto.
- URL de aplicacion: `http://127.0.0.1:5177` cuando no existe `E2E_BASE_URL`.
- Proyecto Supabase no productivo: no confirmado desde variables E2E.
- Indicadores de produccion en URL E2E: no evaluables sin `E2E_BASE_URL`.
- Responsable de aprobacion: pendiente.

## Variables E2E

- `E2E_BASE_URL`: no configurada.
- `E2E_ADMIN_EMAIL`: no configurada.
- `E2E_ADMIN_PASSWORD`: no configurada.
- `E2E_COACH_EMAIL`: no configurada.
- `E2E_COACH_PASSWORD`: no configurada.
- `E2E_STUDENT_EMAIL`: no configurada.
- `E2E_STUDENT_PASSWORD`: no configurada.
- `E2E_ALLOW_MUTATIONS`: no configurada.
- `E2E_STAGING_CONFIRMATION`: no configurada.
- `E2E_TEST_PREFIX`: no configurada, fallback `kupan-e2e`.
- IDs opcionales E2E: no configurados.

## Roles

- Admin E2E: no disponible.
- Coach E2E: no disponible.
- Alumno E2E: no disponible.

## Mutaciones y cleanup

- Mutaciones: bloqueadas.
- Confirmacion requerida: `E2E_STAGING_CONFIRMATION=I_CONFIRM_THIS_IS_NOT_PRODUCTION`.
- Cleanup disponible: estructura de registro y dry-run disponible.
- Cleanup destructivo: no disponible sin handler autorizado por UI/RPC/Edge Function de staging.
- Prefijo requerido: `kupan-e2e`.

## Seguridad

- No se imprimieron passwords, access tokens ni refresh tokens.
- No se escribio `.env.e2e`.
- `playwright/.auth/` esta ignorado por Git.
- `service_role` no aparece en frontend; solo en Edge Functions y documentacion de despliegue.

## Decision

El entorno actual permite validacion no destructiva. No permite declarar piloto controlado porque faltan staging confirmado, credenciales E2E, roles verificables y cleanup destructivo autorizado.

## Validacion autenticada 2026-07-01

- Estado: STAGING BLOQUEADO POR CONFIGURACION.
- Prueba publica: APROBADO AUTOMÁTICAMENTE.
- Prueba autenticada: PENDIENTE.
- Mutaciones: PENDIENTE y bloqueadas.
- Dispositivo fisico: PENDIENTE.
- Backend staging: PENDIENTE.
- Cleanup: PENDIENTE para recursos criticos.
- Commit validado localmente: `ad7b080`.
- Deploy validado: PENDIENTE.
- URL staging anonimizada: no disponible.
- Project Ref parcial: no disponible.
- Evidencia de no produccion: no confirmada porque falta `E2E_BASE_URL`.
