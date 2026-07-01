# Esquema Base Faltante Staging KUPAN

Fecha: 2026-07-01

## Clasificacion por objeto

| Objeto | Estado |
| --- | --- |
| `profiles` | REFERENCIADO PERO NO CREADO |
| `plans` | REFERENCIADO PERO NO CREADO |
| `memberships` | SOLO ALTERADO |
| `class_schedule` | REFERENCIADO PERO NO CREADO |
| `reservations` | SOLO ALTERADO |
| `wod` | REFERENCIADO PERO NO CREADO |
| `community_posts` | REFERENCIADO PERO NO CREADO |
| `app_settings` | CREADO POR SQL VERSIONADO |
| `personal_records` | CREADO POR SQL VERSIONADO |
| `exercises` | CREADO POR SQL VERSIONADO |
| `membership_token_movements` | CREADO POR SQL VERSIONADO |
| `notifications` | CREADO POR SQL VERSIONADO |
| tablas de pagos dedicadas | NO IDENTIFICADO |

## Resultado

El staging no puede recrearse de forma garantizada desde cero solo con los SQL actuales porque faltan tablas base de negocio. No se reconstruyen columnas por suposicion.

## Exportar solo esquema desde proyecto autorizado

Cuando el responsable confirme un proyecto fuente autorizado y no productivo, usar una exportacion de esquema sin datos personales. Ejemplo orientativo:

```bash
supabase db dump --schema public --schema-only > supabase/schema-staging-base.sql
```

No ejecutar contra produccion sin autorizacion manual explicita. Revisar el dump antes de aplicarlo en staging y eliminar cualquier dato o secreto accidental.
