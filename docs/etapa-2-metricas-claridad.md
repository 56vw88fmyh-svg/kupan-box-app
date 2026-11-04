# Etapa 2 — métricas, claridad y privacidad

> Actualización 04-11-2026: integrada y publicada con KUPAN 2.2.1. El estado local y los pasos pendientes descritos originalmente abajo quedan resueltos en [el registro de publicación](publicacion-2026-11-04.md).

Implementada sobre la etapa 1 en `fix/etapa-2-metricas-claridad`. No desplegada ni aplicada a bases remotas.

## Puntos 8–15

8. Ranking de asistencia: solo `attended`, dentro del mes y hasta hoy en Chile. `reserved` y `no_show` quedan fuera. Ausencias: `no_show / (attended + no_show)` del mes; denominador vacío muestra «Sin datos».
9. Renovaciones: alumnos activos (excluyendo cuentas admin/coach), un conteo por alumno, cuyo último ciclo terminó y que no tienen ciclo pagado activo ni renovación programada. No cuentan todas las membresías históricas. Alumnos que nunca tuvieron plan no se etiquetan como renovaciones vencidas.
10. Ocupación: capacidad de horarios activos limitados de la semana lunes–domingo y reservas de esa misma semana (`reserved`, `attended`, `no_show`). Acceso ilimitado no participa. Sin capacidad devuelve «Sin datos»; no se ocultan excesos con un tope artificial de 100 %.
11. Meta semanal: opcional, 1–14 sesiones, guardada por usuario. No se impone la meta anterior de seis días. Cuenta sesiones confirmadas e incluye domingo y sesiones múltiples en un día; el calendario señala días asistidos.
12. Formatos: tiempo minutos:segundos, rondas/repeticiones y unidades compartidos entre Comunidad, ranking, Perfil, WOD, PR y módulos administrativos. Fechas calendario estables y timestamps mostrados en Chile. Estados de membresías/pagos/actividad traducidos.
13. Estados: invitado recibe una acción de inicio de sesión; errores y carga no se representan como ceros reales. Sin programa del día se informa «WOD aún no publicado», distinto de una programación oculta. Un error de cupos no fabrica disponibilidad. Las preferencias fallidas permiten reintentar sin habilitar guardados vacíos.
14. Privacidad: Comunidad requiere sesión de miembro activo. Tabla de preferencias con permisos por propietario, alias explícito y tres autorizaciones independientes, desactivadas inicialmente: asistencia, marcas y cumpleaños. El feed muestra alias, no nombre completo del perfil, y cumpleaños sin año/edad/contacto. Cuentas admin/coach no entran en reconocimientos. Retirar autorización excluye datos de la siguiente lectura del feed. Esto no retira capturas o copias que otros ya hubieran realizado.
15. Feed: «Marca registrada» en lugar de afirmar un nuevo récord sin comprobarlo; fecha real de creación del registro. El ranking es un resumen separado, sin fabricar una actividad diaria con la fecha actual. Marcas históricas `WOD:` no se publican como PR comparables.

## Privacidad también en base

`20261104140000_metrics_and_member_privacy.sql` crea `athlete_preferences` y `get_member_community_feed()`. Restringe además las rutas RPC antiguas de ranking, PR y cumpleaños; no basta con ocultar pestañas en el frontend.

Para mantener las firmas existentes, las implementaciones antiguas pasan a funciones `stage2_private_*` sin permisos para anon/authenticated. Los envoltorios controlan autorización y alias; los cumpleaños completos y próximos cumpleaños quedan para administración. Las firmas se conservan incluso cuando una instalación tiene distinta proyección de cumpleaños. La migración puede repetirse.

La revisión cubre los caminos de lectura de Comunidad identificados en este repositorio. No sustituye una revisión completa de todas las políticas y funciones instaladas en una base remota.

## Pruebas

- `npm run lint`, suite general y compilación.
- `npm run test:stage2`: renovación deduplicada, renovación futura, semana y capacidad del mismo período, reservas fuera de semana, exclusión de acceso ilimitado, asistencias frente a reservas, denominador sin datos, sesiones múltiples y formatos.
- PostgreSQL temporal: migración ejecutada dos veces, preferencias aisladas por usuario, autorización explícita, alias sin datos privados, retirada de autorización, denegación de anónimos e inactivos y cierre de RPC antiguas. Administración conserva su consulta de cumpleaños.
- Cuatro pruebas de navegador entre etapas 1 y 2: estabilidad de React, variantes WOD, guardado/retiro de preferencias, estados de invitado y etiquetas/tiempo del feed. Respuestas de red simuladas; sin escrituras en producción.
- Seis pruebas existentes de nómina aprobadas durante esta etapa.

## Activación pendiente

Se mantiene la limitación de la etapa 1: producción declara 2.1.3 y esta base local 2.1.2. Integrar el cambio sobre la fuente exacta vigente antes de desplegar, preservando la consulta agrupada de horarios y la nómina privada.

Orden: migración etapa 1 → migración etapa 2 → frontend actualizado → pruebas por rol en staging → publicación y verificación real. Si las migraciones de funciones antiguas se ejecutan de nuevo, aplicar después la migración de privacidad para restablecer sus restricciones.

El ranking/comunidad puede quedar vacío inicialmente hasta que los atletas elijan participar. El frontend anterior pierde el acceso anónimo a datos personales al aplicar la privacidad; es una consecuencia prevista. Revertir solo el frontend no debe reabrir las funciones privadas ni borrar las preferencias.
