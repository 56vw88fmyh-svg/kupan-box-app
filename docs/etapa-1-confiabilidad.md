# Etapa 1 — funcionamiento y confiabilidad

> Actualización 04-11-2026: integrada y publicada con KUPAN 2.2.1. El estado local y los pasos pendientes descritos originalmente abajo quedan resueltos en [el registro de publicación](publicacion-2026-11-04.md).

Implementación en la rama `fix/etapa-1-confiabilidad`, basada en `5ccc239` de `kupan-roster-release`. No publicada en producción.

## Cambios

1. Administración: API de temporizadores y callbacks estables; los hooks restauran su estado de montaje con StrictMode. Una prueba con React verifica carga inicial y actualización manual sin recargas continuas.
2. Pendientes: operaciones identificadas por propietario; una sesión diferente nunca ejecuta operaciones ajenas. Se conserva la cola anterior v1 sin asignarle dueño automáticamente. Su recuperación requiere acreditar la procedencia; no se borra ni se importa a la sesión actual.
3. Idempotencia: el UUID se guarda antes de transmitir el alta; una respuesta perdida se reconcilia consultando ese mismo UUID y propietario. Reintentos concurrentes comparten ejecución; al limpiar se relee la cola para conservar operaciones incorporadas durante una solicitud. El evento online y el cambio de sesión disparan un reintento.
4. Validaciones: rondas/repeticiones enteras, ceros válidos con resultado total positivo y tiempos con componentes válidos. El formulario de PR comparte la validación temporal del WOD.
5. Sesiones separadas: nuevas sesiones WOD en `workout_results`; no se convierten automáticamente en PR ni alteran las marcas históricas. La pantalla permite consultar los resultados de la prescripción actual. Se permiten intentos distintos; reintentos de una operación pendiente conservan su identidad.
6. Comparación por contexto: ID de WOD, prescripción exacta (versión), nivel y tipo de puntuación. Solo se anuncia mejora cuando existe una marca anterior comparable.
7. Programación: editor para Iniciado, Rookie, Scaled y RX, técnica, tipo y vuelta a la calma; persistencia del borrador y proyección explícita de API hasta la vista atleta. Los WOD existentes pueden cargarse para edición. Variantes vacías no se presentan como prescripciones reales.

## Verificación

- Lint, suite general, compilación y seis pruebas de nómina aprobadas.
- `npm run test:stage1`: validaciones, separación de contextos, cambio A/B, respuesta perdida después de guardar, reintentos concurrentes y preservación de cola antigua.
- Base PostgreSQL temporal: migración aplicable dos veces, inserción propia, lectura aislada por dueño, rechazo de inserción ajena, denegación anónima y proyección pública WOD.
- `npm run test:e2e -- stage1-feedback`: 2 pruebas aprobadas; React StrictMode sin ciclo y editor/vista atleta de los cuatro niveles. Datos simulados; sin acceso a datos reales.

## Activación pendiente

La app publicada declara 2.1.3; esta copia local declara 2.1.2. El trabajo no debe desplegarse reemplazando a ciegas producción: trasladar el cambio a la fuente exacta del despliegue actual y preservar especialmente la consulta agrupada de cupos y el panel privado de nómina.

1. Integrar esta rama sobre la fuente vigente.
2. Aplicar `supabase/migrations/20261104120000_training_reliability.sql` en staging. Es aditiva: no actualiza ni elimina PR/WOD existentes. Crea `workout_results`, RLS y RPC v2; añade `wod.training_details`.
3. Verificar con alumnos A/B y un administrador: publicar variantes, registrar dos intentos, cambiar nivel, simular desconexión/cambio de cuenta y pérdida de respuesta. Las sesiones nuevas quedan fuera del feed/ranking antiguo de PR por diseño.
4. Aplicar la migración antes del frontend en producción. La RPC original sigue disponible para el frontend anterior.
5. Publicar frontend y verificar actualización PWA, nómina y horarios. No eliminar la tabla nueva al revertir frontend: contiene sesiones de atletas.

No se aplicó la migración a ninguna base remota ni se desplegó el frontend. Las pruebas descritas no certifican integración con el despliegue remoto actual.
