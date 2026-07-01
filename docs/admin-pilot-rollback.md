# Rollback Piloto Admin KUPAN

Fecha: 2026-07-01

## Objetivo

Volver rápidamente a una versión estable si el piloto detecta problemas críticos.

## Identificar versión estable

1. Revisar el deploy anterior estable en Vercel.
2. Registrar commit actual y commit anterior.
3. Confirmar qué migraciones SQL fueron aplicadas antes del piloto.

Campos obligatorios antes de iniciar:

- Commit validado: pendiente.
- Deploy validado: pendiente.
- Deploy anterior estable: pendiente.
- Responsable de rollback: pendiente.
- Tiempo maximo esperado: 15 a 30 minutos una vez tomada la decision.

## Revertir deploy en Vercel

1. Entrar al proyecto en Vercel.
2. Ir a Deployments.
3. Seleccionar el deploy anterior estable.
4. Usar Promote to Production.
5. Verificar rutas principales.

Verificacion posterior:

- Login alumno.
- Login admin.
- Panel admin.
- Reservas.
- WOD.
- Modo coach.
- Perfil alumno.

## Revertir código

Usar Git solo si se necesita preparar una rama correctiva:

```bash
git revert <commit>
npm run lint
npm test
npm run build
```

## Deshabilitar acceso piloto

Opciones operativas:

- Cambiar temporalmente roles admin/coach de usuarios piloto en Supabase.
- Pausar comunicación del enlace.
- Volver a deploy anterior.

No borrar usuarios ni datos sin respaldo.

## Preservar datos

Antes de tocar datos:

- Exportar reservas afectadas.
- Exportar membresías afectadas.
- Exportar movimientos de tokens.
- Registrar WOD/posts creados durante incidente.
- Guardar capturas y hora exacta del incidente.
- Registrar usuario, rol y accion ejecutada.
- Mantener ids parciales de registros afectados.

## Evitar repetir mutaciones

- No reintentar reservas, renovaciones o pagos sin confirmar estado en Supabase.
- Revisar movimientos de token antes de ajustar manualmente.
- Si hay duda, registrar incidente y decidir una corrección única.

## Qué no hacer

- No ejecutar `git reset --hard` sin respaldo.
- No borrar tablas.
- No modificar RLS durante incidente sin análisis.
- No usar service_role en frontend.
- No repetir pagos simulados con referencias distintas para corregir una falla.

## Uso interno supervisado

Antes de iniciar, completar:

- Deploy actual validado.
- Deploy anterior estable identificado.
- Responsable de rollback definido.
- Respaldo Supabase confirmado.

El baseline reproducible queda pendiente como deuda tecnica posterior y no debe usarse para improvisar restauraciones durante el piloto interno.
