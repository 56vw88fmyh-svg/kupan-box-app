# Migraciones KUPAN

## Estado

No existe migracion baseline aprobada todavia.

## Estrategia

1. Exportar y auditar baseline estructural `public` sin datos.
2. Sanitizar sin cambiar semantica.
3. Probar baseline en base vacia descartable.
4. Crear migracion `20260701000100_kupan_baseline.sql` solo despues de aprobar el baseline.
5. Aplicar modulos SQL posteriores segun `supabase/baseline/apply-order.md`.

## SQL excluidos de aplicacion automatica

- `promote-admin.sql`
- backfills de datos existentes
- `sync-auth-users-profiles.sql` como sincronizacion masiva
- `security-audit.sql`

Los archivos originales de `supabase/sql/` se conservan por trazabilidad.
