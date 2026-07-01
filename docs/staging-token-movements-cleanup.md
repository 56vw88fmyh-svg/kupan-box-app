# Cleanup Token Movements Staging

## Decision recomendada

Opcion C: marcar staging como descartable y recrearlo regularmente despues de pruebas destructivas.

## Motivo

`membership_token_movements` es una tabla de auditoria. Borrar movimientos aislados puede romper la trazabilidad entre reservas, cancelaciones, membresias y ajustes manuales.

## Politica

- No borrar movimientos reales.
- No borrar movimientos sin prefijo o sin manifiesto.
- Para pruebas destructivas, usar staging descartable.
- Si se requiere limpieza parcial, borrar toda la cadena E2E dentro del staging y solo con manifiesto.
- Si quedan movimientos pendientes, no declarar cleanup aprobado.

## Estado actual

Cleanup individual: CLEANUP NO DISPONIBLE como garantia completa.
