# Auditoría de Idempotencia Admin KUPAN

Fecha: 2026-07-01

## Criterio

La protección frontend contra doble clic no equivale a idempotencia. Esta auditoría clasifica cada operación según protección observada en frontend, RPC/Edge Function y documentación SQL disponible.

## Renovar membresía

- Operación: `admin_renew_membership`.
- Protección actual: frontend bloquea doble operación por clave; RPC esperada en Supabase.
- Riesgo: dos pestañas o dos admins podrían renovar dos veces si la RPC no valida ciclo duplicado.
- Severidad: media.
- Recomendación futura: agregar identificador idempotente o validación transaccional de ciclo activo reciente por alumno/plan/fecha.

## Ajustar tokens

- Operación: `admin_adjust_tokens`.
- Protección actual: frontend bloquea operación por membresía; RPC registra movimiento manual.
- Riesgo: dos ajustes simultáneos pueden dejar movimientos contradictorios si ambos parten de valores antiguos.
- Severidad: media.
- Recomendación futura: usar comparación contra valor esperado o versión `updated_at`.

## Activar membresía

- Operación: `admin_activate_membership`.
- Protección actual: frontend bloquea doble submit; RPC debe validar admin activo.
- Riesgo: activaciones duplicadas del mismo alumno/plan en la misma fecha si se ejecuta desde dos pestañas.
- Severidad: alta si la RPC no impide membresías activas superpuestas.
- Recomendación futura: restricción o RPC transaccional que cierre/evite ciclos activos superpuestos.

## Extender membresía

- Operación: `admin_extend_membership`.
- Protección actual: frontend bloquea por operación.
- Riesgo: doble extensión suma días dos veces.
- Severidad: media.
- Recomendación futura: registrar operación con referencia idempotente o requerir confirmación basada en fecha actual esperada.

## Crear reserva

- Operaciones: `reserve_class`, `admin_reserve_for_student`.
- Protección actual: RPC transaccional esperada; frontend recarga reservas/membresías/tokens.
- Riesgo: doble reserva misma clase/fecha si la función o constraint no lo bloquea.
- Severidad: alta.
- Recomendación futura: asegurar constraint único parcial por `profile_id`, `class_schedule_id`, `reservation_date` cuando `status <> 'cancelled'`.

## Cancelar reserva

- Operación: `cancel_reservation`.
- Protección actual: RPC debe validar status y devolución de token.
- Riesgo: doble cancelación podría devolver token dos veces si RPC no revisa status previo.
- Severidad: alta.
- Recomendación futura: cancelación transaccional con condición `status = reserved` y token refund solo una vez.

## Simular pago

- Operación: Edge Function `payment-webhook` con `payment_reference`.
- Protección actual: payload incluye referencia `test-profile-plan-Date.now()`.
- Riesgo: si se ejecuta dos veces con referencias distintas, activa más de un ciclo.
- Severidad: media en modo prueba.
- Recomendación futura: modo simulado solo admin y con referencia estable opcional para reintentos.

## Webhook de pago

- Operación: `payment-webhook`.
- Protección actual: documentación indica evitar duplicar activaciones por `payment_reference`.
- Riesgo: reintento real del proveedor con mismo pago.
- Severidad: alta si no hay índice único/validación por `payment_reference`.
- Recomendación futura: índice único sobre referencia de pago o tabla de eventos procesados.

## Conclusión

El frontend reduce doble clic, pero las garantías definitivas deben estar en RPC, constraints o Edge Functions. No se modificó base de datos en esta auditoría.
