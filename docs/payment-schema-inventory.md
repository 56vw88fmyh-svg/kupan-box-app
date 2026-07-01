# Inventario Schema Pagos KUPAN

Fecha: 2026-07-01

## Hallazgos en repositorio

- `memberships.payment_status`
- `memberships.payment_provider`
- `memberships.payment_reference`
- `memberships.activated_at`
- `memberships.auto_activated`
- Edge Function `payment-webhook`
- Referencias `kupan-e2e-payment-*` en datos de prueba

## Persistencia observada

La referencia de pago se persiste en `memberships.payment_reference`.

## Idempotencia observada

El SQL de membresias y la Edge Function deben revisarse con baseline real para confirmar si existe unique constraint efectivo sobre `payment_reference`. Con la informacion actual, no se puede afirmar idempotencia estructural completa.

## Tablas dedicadas de pagos

No se identifico tabla versionada `payments`, `payment_events` o `processed_events`.

## Riesgo

Si la unica persistencia de idempotencia es `memberships.payment_reference`, el baseline debe confirmar constraint unique o la Edge Function debe proteger duplicados a nivel transaccional.

No se crea una tabla nueva en esta intervencion.
