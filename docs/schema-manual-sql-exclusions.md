# Exclusiones SQL Manuales KUPAN

Fecha: 2026-07-01

## Excluidos de migracion automatica

### `supabase/sql/promote-admin.sql`

- Estado: EXCLUIDO.
- Motivo: modifica datos/roles de usuarios existentes.
- Riesgo: promocionar usuario incorrecto o tocar entorno no autorizado.
- Tratamiento: ejecutar solo manualmente en staging/produccion con autorizacion especifica.

### `supabase/sql/security-audit.sql`

- Estado: EXCLUIDO.
- Motivo: archivo de auditoria/consulta, no migracion estructural.
- Tratamiento: usar solo para revision manual.

### `supabase/sql/sync-auth-users-profiles.sql`

- Estado: REQUIERE SEPARACION CONCEPTUAL.
- Parte estructural permitida: definicion segura de funcion/trigger si no duplica baseline.
- Parte excluida: backfill o sincronizacion masiva de usuarios existentes.
- Tratamiento: no ejecutar como backfill automatico.

## Backfills

Cualquier script que actualice datos existentes, cree usuarios, inserte filas o sincronice perfiles queda excluido de aplicacion automatica.

## Seeds

Los seeds E2E se ejecutan solo desde scripts staging, despues de `STAGING_SCHEMA_VALIDATED=true`, nunca como parte del baseline.
