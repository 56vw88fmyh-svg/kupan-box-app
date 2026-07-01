# Validación Final de Membresías y Tokens KUPAN

Fecha: 2026-07-01

## Estado

Pendiente de validación real con alumno dedicado y membresía autorizada.

## Reglas a verificar manualmente

- Plan activo permite reservar.
- Plan vencido bloquea reserva.
- Sin tokens bloquea reserva.
- Plan Full no descuenta token.
- Cancelación devuelve token cuando corresponde.
- `attended` y `no_show` no devuelven token.
- Ajuste manual registra movimiento.
- Extensión no modifica tokens.
- Renovación crea ciclo correcto de 30 días.

## Restricción

No se ejecutaron mutaciones de membresía ni pagos reales durante esta validación.

