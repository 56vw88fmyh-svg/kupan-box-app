# Validacion Operativa Interna KUPAN

Fecha: 2026-07-01

## Clasificacion

USO INTERNO LIMITADO CON RESTRICCIONES.

## Evidencia automatica

- Lint: aprobado.
- Tests Node: aprobado.
- Build: aprobado.
- Check: aprobado.
- E2E publico: aprobado.
- Proteccion sin sesion `/admin`: aprobada.
- Proteccion sin sesion `/coach`: aprobada.
- PWA publica basica: aprobada.

## No ejecutado en esta fase

- Login con admin real.
- Login con coach real.
- Login con alumno real.
- Reserva real.
- Cancelacion real.
- Ajustes de membresia.
- Marcado de asistencia.
- Pruebas fisicas iPhone/Android.
- Instalacion PWA real.

## Requisitos antes de iniciar

- Responsable operativo definido.
- Responsable tecnico definido.
- Canal de incidentes definido.
- Persona autorizada para rollback.
- Respaldo Supabase confirmado.
- Deploy anterior estable identificado.
- Cuenta admin interna autorizada.
- Cuenta coach interna autorizada.
- Cuenta alumno de prueba autorizada.

## Restricciones de uso

- Maximo 1 admin.
- Maximo 1 o 2 coaches.
- Maximo 5 a 10 alumnos.
- Duracion inicial: 5 dias habiles.
- No operar pagos reales desde la app durante el piloto.
- No repetir reservas/cancelaciones dudosas sin revisar Supabase.
- Revisar reservas, tokens y membresias diariamente.

## Semaforo

AMARILLO: no hay fallos criticos automatizados, pero faltan pruebas manuales operativas y moviles.

## Baseline

El baseline reproducible se mantiene como deuda tecnica posterior al lanzamiento interno. No se ejecutaron comandos `schema:export`.
