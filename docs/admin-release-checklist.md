# Checklist de Release Admin KUPAN

Fecha: 2026-07-01

Estados permitidos:

- APROBADO AUTOMÁTICAMENTE
- APROBADO MANUALMENTE
- FALLIDO
- PENDIENTE
- NO APLICA

## Automatización local

| Ítem | Estado | Evidencia |
| --- | --- | --- |
| Lint | APROBADO AUTOMÁTICAMENTE | `npm run lint` código 0 |
| Tests Node | APROBADO AUTOMÁTICAMENTE | `npm test` código 0 |
| Build | APROBADO AUTOMÁTICAMENTE | `npm run build` código 0 |
| Check | APROBADO AUTOMÁTICAMENTE | `npm run check` código 0 |
| E2E no destructivo | APROBADO AUTOMÁTICAMENTE | 10 passed, 0 failed, 15 skipped |
| Consola básica | APROBADO AUTOMÁTICAMENTE | `consoleGuard` sin errores inesperados en tests ejecutados |

## Browser automatizado

| Ítem | Estado | Evidencia |
| --- | --- | --- |
| Rutas públicas | APROBADO AUTOMÁTICAMENTE | `/`, `/login`, `/admin`, `/coach`, `/reservas`, `/wod` |
| Protección sin sesión | APROBADO AUTOMÁTICAMENTE | `/admin` y `/coach` redirigen a login |
| PWA service worker | APROBADO AUTOMÁTICAMENTE | `navigator.serviceWorker.ready` OK |
| Accesibilidad básica login | APROBADO AUTOMÁTICAMENTE | labels y botones con nombre |
| Admin autenticado | PENDIENTE | Requiere `E2E_ADMIN_EMAIL/PASSWORD` |
| Coach autenticado | PENDIENTE | Requiere `E2E_COACH_EMAIL/PASSWORD` |
| Alumno bloqueado en admin | PENDIENTE | Requiere `E2E_STUDENT_EMAIL/PASSWORD` |
| Responsive admin | PENDIENTE | Requiere admin de prueba |
| Borrador WOD browser real | PENDIENTE | Requiere admin de prueba |

## Staging real

| Ítem | Estado | Evidencia |
| --- | --- | --- |
| Crear alumno | PENDIENTE | Requiere staging seguro y cleanup |
| Planes | PENDIENTE | Requiere staging seguro y cleanup |
| Membresías | PENDIENTE | Requiere staging seguro y cleanup |
| Reservas | PENDIENTE | Requiere staging seguro y cleanup |
| Tokens | PENDIENTE | Requiere staging seguro y datos aislados |
| WOD remoto | PENDIENTE | Requiere staging seguro |
| Sesión vencida | PENDIENTE | Requiere invalidar sesión de prueba |

## Dispositivos físicos

| Ítem | Estado | Evidencia |
| --- | --- | --- |
| iPhone Safari | PENDIENTE | No ejecutado por Codex |
| Android Chrome | PENDIENTE | No ejecutado por Codex |
| Tablet | PENDIENTE | No ejecutado por Codex |

## Seguridad backend

| Ítem | Estado | Evidencia |
| --- | --- | --- |
| service_role ausente en frontend | APROBADO AUTOMÁTICAMENTE | búsqueda en `src` |
| RLS real | PENDIENTE | Requiere pruebas Supabase con roles |
| Idempotencia backend | PENDIENTE | Requiere staging y verificación de datos |

## Clasificación

APTO PARA PREVIEW.  
No apto para producción final hasta completar roles, mutaciones staging, responsive autenticado y dispositivos físicos.

## Actualizacion staging autenticado 2026-07-01

| Categoria | Estado | Evidencia |
| --- | --- | --- |
| Prueba publica | APROBADO AUTOMÁTICAMENTE | `npm run test:e2e`: 10 passed |
| Prueba autenticada | PENDIENTE | `.env.e2e` ausente |
| Mutacion | PENDIENTE | Bloqueada por regla de fase |
| Dispositivo fisico | PENDIENTE | No ejecutado |
| Backend staging | PENDIENTE | Supabase staging no confirmado |
| Cleanup | PENDIENTE | Criticos sin cleanup destructivo aprobado |

Clasificacion: STAGING BLOQUEADO POR CONFIGURACION.
