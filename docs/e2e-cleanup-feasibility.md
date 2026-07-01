# Viabilidad Cleanup E2E KUPAN

## Estado general

El repositorio cuenta con registro de recursos E2E y script dry-run. No existe aun un cleanup destructivo aprobado para todos los recursos, por lo que las mutaciones siguen bloqueadas.

## Reglas de seguridad

- Solo staging confirmado.
- Solo recursos registrados durante la corrida.
- Solo datos con prefijo `kupan-e2e` o `KUPAN E2E`.
- Dry run obligatorio antes de borrar.
- No usar service_role en navegador.
- No borrar datos reales.

## Recursos

| Recurso | Estado | UI | RPC admin | Edge Function | Requiere servidor | Orden | Riesgo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Planes | CLEANUP PARCIAL | Posible activar/desactivar | No confirmado | No | No si se desactiva | Despues de membresias | Medio |
| Posts | CLEANUP PARCIAL | Posible editar/desactivar | No confirmado | No | No si se desactiva | Independiente | Bajo |
| Horarios | CLEANUP PARCIAL | Posible editar/desactivar | No confirmado | No | No si se desactiva | Despues de reservas | Medio |
| WOD | CLEANUP PARCIAL | Posible upsert por fecha | No confirmado | No | No si se elimina | Independiente | Bajo |
| Reservas | CLEANUP PARCIAL | Posible cancelar | `cancel_reservation` existente para reglas normales | No | No | Antes de membresias | Medio |
| Membresias | CLEANUP PARCIAL | Posible cancelar/pausar | Funciones admin existentes segun SQL | No | No | Despues de reservas | Alto |
| Movimientos de token | CLEANUP NO DISPONIBLE | No debe editarse manualmente | No confirmado | No | Si se requiere borrado fisico | Despues de reservas/membresias | Alto |
| Pagos simulados | CLEANUP NO DISPONIBLE | No confirmado | No confirmado | `payment-webhook` activa, no limpia | Si se requiere borrado fisico | Antes de membresias si aplica | Alto |
| Profiles | CLEANUP NO DISPONIBLE | No borrar desde UI normal | No confirmado | `create-student` crea, no limpia | Si se borra Auth/profile | Despues de todo | Alto |
| Usuarios Auth | CLEANUP NO DISPONIBLE | No | No | No existe cleanup dedicado | Si | Ultimo | Critico |

## Estrategia recomendada actual

1. Para pruebas no destructivas: ejecutar sin mutaciones.
2. Para mutaciones de bajo riesgo: preferir crear recursos con prefijo y desactivarlos por UI si existe accion normal.
3. Para Auth/profile: no crear alumnos E2E hasta tener cleanup servidor aprobado o procedimiento manual documentado.
4. Para token movements: no borrar manualmente; validar con staging aislado y limpiar el entorno completo si es necesario.

## Decision

Cleanup destructivo completo: no aprobado.

Mutaciones E2E: bloqueadas hasta tener staging confirmado y procedimiento de cleanup autorizado por recurso.
