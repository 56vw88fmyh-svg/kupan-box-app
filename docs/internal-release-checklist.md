# Checklist Uso Interno Supervisado KUPAN

Fecha: 2026-07-01

Estados: APROBADO, PENDIENTE, FALLIDO, NO APLICA.

## Entorno

| Item | Estado | Evidencia |
| --- | --- | --- |
| App compila | APROBADO | `npm run build` |
| Lint | APROBADO | `npm run lint` |
| Tests Node | APROBADO | `npm test` |
| E2E publico | APROBADO | 10 passed, 0 failed |
| Supabase configurado | APROBADO | `.env.local` presente |
| Baseline reproducible | PENDIENTE | Deuda tecnica posterior |
| Respaldo operativo | PENDIENTE | Confirmar en Supabase |
| Rollback Vercel | PENDIENTE | Confirmar deploy anterior |

## Roles

| Item | Estado |
| --- | --- |
| Sin sesion protege `/admin` | APROBADO |
| Sin sesion protege `/coach` | APROBADO |
| Admin interno | PENDIENTE |
| Coach interno | PENDIENTE |
| Alumno de prueba | PENDIENTE |

## Operacion critica

| Item | Estado |
| --- | --- |
| Reserva unica | PENDIENTE |
| Cancelacion con devolucion correcta | PENDIENTE |
| Tokens consistentes | PENDIENTE |
| Membresia activa visible | PENDIENTE |
| WOD guardar/editar | PENDIENTE |
| Coach marca asistencia | PENDIENTE |
| Admin navega secciones | PENDIENTE |

## Movil/PWA

| Item | Estado |
| --- | --- |
| iPhone Safari | PENDIENTE |
| Android Chrome | PENDIENTE |
| PWA instalada | PENDIENTE |
| Actualizacion de app | PENDIENTE |

## Decision

No abrir acceso masivo. Puede avanzar a uso interno limitado solo despues de validar manualmente roles, reservas, tokens, respaldo y rollback.
