# Tooling Exportacion Schema KUPAN

Fecha: 2026-07-01

## Herramientas

- Supabase CLI: disponible, version `2.100.1`.
- `supabase db dump --help`: disponible usando HOME temporal del workspace.
- `pg_dump`: no disponible en PATH.
- Docker: no disponible en PATH.
- Supabase local: no confirmado.
- `supabase/config.toml`: no existe.
- `supabase/migrations/`: creado con README, sin migracion baseline aprobada.
- Dumps previos: no encontrados.

## Observacion de sandbox

Supabase CLI intento escribir telemetria en `~/.supabase/telemetry.json` y fue bloqueado por permisos. Se uso `HOME=.tools/supabase-home` para consultar version/help sin tocar secretos.

## Comando soportado por CLI

La CLI soporta:

- `supabase db dump --schema public --file <destino>`
- `--db-url`
- `--linked`
- `--dry-run`

No se ejecuto dump real porque falta fuente autorizada.
