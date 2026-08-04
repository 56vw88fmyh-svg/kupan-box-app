# Monitoreo operativo KUPAN

El workflow `Disponibilidad KUPAN` comprueba cada 30 minutos:

- La ruta pública `/login` en Vercel.
- La disponibilidad de Supabase Auth.
- La conexión a PostgreSQL mediante `kupan_health_check()`, sin leer datos privados.

Si una comprobación falla, GitHub abre o actualiza el incidente `Alerta disponibilidad KUPAN` y marca la ejecución como fallida. Cuando el servicio vuelve, comenta y cierra el incidente.

## Configuración requerida

Agregar en GitHub, dentro de `Settings > Secrets and variables > Actions`:

- `KUPAN_SUPABASE_URL`
- `KUPAN_SUPABASE_ANON_KEY`

La clave usada es la clave pública `anon`, nunca `service_role`.

Para recibir el aviso por correo, el responsable del repositorio debe tener activadas las notificaciones por email para Actions e Issues en GitHub.

## Prueba manual

1. Abrir `Actions > Disponibilidad KUPAN`.
2. Presionar `Run workflow`.
3. Confirmar que los tres controles terminan correctamente.
4. Revisar que no exista un incidente abierto llamado `Alerta disponibilidad KUPAN`.

Este monitoreo es una capa de aviso. No reemplaza un plan Supabase de producción, respaldos ni monitoreo externo con SLA.
