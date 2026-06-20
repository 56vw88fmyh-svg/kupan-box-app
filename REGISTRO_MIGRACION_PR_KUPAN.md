# Registro Tecnico Migracion PR Local A Supabase

Fecha: 2026-06-19

## Objetivo

Detectar PR antiguos guardados en el dispositivo del alumno, normalizarlos y subirlos a Supabase una sola vez por usuario autenticado, sin borrar las claves antiguas.

## Archivos Implementados

- `src/services/prMigrationService.js`
- `src/services/prMigrationService.test.js`
- `src/pages/PersonalRecords.jsx`
- `src/lib/supabase.js`
- `package.json`

## Claves Revisadas

Claves explicitas:

- `personalRecords`
- `prs`
- `kupan_prs`
- `personal_records`
- `records`
- `userPRs`
- `kupan_personal_records`
- `kupanPersonalRecords`
- `kupan_records`
- `kupanUserPRs`

Ademas, el servicio escanea claves que contengan patrones compatibles con PR, pero solo procesa valores JSON que tengan forma valida de registros.

## Claves Nuevas

- `kupan_pr_migration_v1`: estado versionado por usuario.
- `kupan_pr_migration_v1_backup`: respaldo temporal tecnico por usuario.

## Seguridad

- La migracion solo corre con sesion autenticada confirmada por `supabase.auth.getUser()`.
- Verifica que `auth.user.id` coincida con el usuario actual de la app.
- Inserta usando la sesion del alumno, nunca `service_role`.
- No registra emails, nombres, tokens ni notas personales en consola.
- No borra claves antiguas.

## Deduccion De Duplicados

La huella estable usa:

- usuario
- ejercicio normalizado
- valor
- unidad
- fecha
- tipo de registro

## Estados De UI

En `Mis PR` se muestra un aviso discreto:

- `Migrando tus récords`
- `Récords sincronizados`
- `No fue posible sincronizar algunos récords`
- boton `Reintentar`

## Retiro Futuro Del Respaldo Local

En una version posterior, cuando Search/soporte confirme que no quedan migraciones pendientes:

1. Mantener el servicio pero dejarlo en modo lectura de estado.
2. Esperar al menos una version completa con `kupan_pr_migration_v1.status = completed` para la mayoria de usuarios.
3. Crear una accion admin/soporte o rutina versionada para borrar `kupan_pr_migration_v1_backup`.
4. Solo despues considerar limpiar claves antiguas conocidas.
5. Nunca borrar claves antiguas en la misma version que hace la migracion.

## Pruebas Cubiertas

- Usuario sin PR local.
- Usuario con un PR.
- Usuario con varios PR.
- Datos corruptos.
- Sesion expirada.
- Supabase sin conexion.
- Migracion repetida.
- Duplicados.
- Cambio de dispositivo.
- Nueva version desplegada.
