# Orden de Aplicacion Schema KUPAN

Estado: PENDIENTE DE BASELINE.

## 1. Baseline

- Nombre: `20260701000100_kupan_baseline.sql`
- Dependencias: fuente autorizada y dump schema-only aprobado.
- Objetos creados: tablas base, funciones, constraints, FK, RLS, policies, triggers e indices presentes en fuente.
- Verificacion posterior: `npm run staging:schema:check`.
- Reaplicacion: no garantizada; migracion inicial.
- Rollback: recrear staging descartable.

## 2. Modulos estructurales posteriores

Orden tentativo derivado de dependencias:

1. `tokens-payments-reservations.sql`
2. `admin-rls-fix.sql`
3. `get-my-profile.sql`
4. `admin-manual-reservations.sql`
5. `coach-mode.sql`
6. `app-settings.sql`
7. `community-public-feed.sql`
8. `birthdays-functions.sql`
9. `personal-records-exercises-migration.sql`
10. `pr-ranking.sql`
11. `notifications.sql`

## SQL manuales excluidos

- `promote-admin.sql`
- `sync-auth-users-profiles.sql` como backfill masivo
- `security-audit.sql`

## Nota

Este orden debe revisarse despues del baseline real. Si un modulo duplica objetos del baseline con definiciones distintas, detener y crear migracion explicita.
