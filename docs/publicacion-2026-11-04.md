# KUPAN 2.2.0 — integración y publicación

## Fuente e integración

Rama `release/etapas-1-4`. La implementación de las cuatro etapas se integra con los archivos originales del despliegue 2.1.3 del 30 de octubre de 2026: `dpl_6hQvVwp3k4YaXvNccM12n95BbnPy`, URL `https://kupan-box-mm91bluwo-kupan-s-projects.vercel.app`.

Se recuperaron 176 archivos del despliegue y se verificó el SHA-1 de cada uno contra su identificador de Vercel. El inventario está en `production-source-20261104.json`. La recuperación conserva la consulta agrupada de cupos, CrossFit/Hybrid y capacidad predeterminada de diez alumnos, correos de bienvenida, corrección de scroll de diálogos, telemetría sin datos sensibles y cabeceras de seguridad. Se mantienen las mejoras de las cuatro etapas.

Se restaura además la compilación y ruta independiente de `/nomina`, sus cabeceras privadas y exclusión de caché, y su acceso en Alumnos. Sus funciones ya estaban presentes en la base de producción; no se vuelve a aplicar la migración de nómina.

La versión de interfaz, paquete y telemetría pasa a 2.2.0. El worker usa `v20261104-stage4`. No se modifican ni despliegan las Edge Functions existentes ni se altera FITTEST.

## Verificación antes de activar

- Lint, suite general, seis pruebas PostgreSQL/modelo de nómina y compilación aprobados.
- Diecisiete recorridos de navegador entre las cuatro etapas, PWA y nómina. La simulación de reservas se actualiza al contrato agrupado vigente; el texto móvil permite ver el botón Reservar antes de la navegación inferior.
- La suite general incluye los tests recuperados de horarios, capacidad, scroll, disponibilidad agrupada y telemetría. Los comandos de tests de `deliver-registration-emails` se conservan en `test:registration-worker`: esos archivos de servidor no estaban incluidos en la fuente subida a Vercel y no se declara su ejecución en esta publicación del frontend.
- Las tres migraciones se validan primero sobre producción dentro de una transacción finalizada con `ROLLBACK`. Se comprueba compatibilidad con funciones existentes y acceso anónimo denegado.
- Una compilación inicial sin asignación de dominios no se promociona. La activación debe usar el despliegue final del código revisado.

## Base de datos

Aplicación atómica de `supabase/releases/20261104_etapas_1_4.sql`: entrenamiento, preferencias/privacidad y campos opcionales de esfuerzo/duración. Registra las versiones `20261104120000`, `20261104140000` y `20261104160000` en el historial de migraciones. No ejecuta el resto de migraciones históricas.

El procedimiento comprueba permisos antes de confirmar. No actualiza ni elimina resultados históricos, reservas, membresías o preferencias. La primera ejecución fue rechazada por un delimitador SQL incorrecto en el bloque de registro; se corrigió y se repitió la validación reversible antes de confirmar.

## Activación y comprobación posterior

Pendiente de registrar el identificador del despliegue final y sus comprobaciones remotas.

## Reversión

El despliegue anterior queda conservado para volver a asignar el dominio si aparece una regresión. No borrar las nuevas tablas o preferencias al revertir el frontend: pueden contener registros de alumnos. Las funciones antiguas de comunidad quedan protegidas por las preferencias de privacidad de la etapa 2.
