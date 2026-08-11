# Políticas KUPAN 2.1

## Membresías

- El pago confirmado es el día 1; el ciclo termina 29 días después y cubre 30 días corridos.
- Tokens no usados vencen y no se acumulan ni transfieren.
- Plan 8 entrega 8 tokens; Plan 12 entrega 12; Full no descuenta tokens y permite una reserva diaria de lunes a viernes.
- Renovar crea un ciclo nuevo desde el nuevo pago.
- Acuerdos antiguos se registran en la membresía con `agreed_price` y vigencia, nunca como plan público alternativo.
- Suspensión solo médica, acreditada y aprobada por administración, con historial.

## Reservas

- Agenda disponible con 7 días de anticipación y hasta 15 minutos antes.
- Cupo máximo predeterminado: 12.
- Con 45 minutos o más, cancelar devuelve token.
- Con menos de 45 minutos, cancelar consume token.
- Attended y no-show mantienen el token consumido.
- Cancelación por KUPAN devuelve token siempre.
- Cobro y devolución son transaccionales e idempotentes.

## Privacidad y roles

- Alumno: ve y modifica solo sus datos permitidos, reservas y PR.
- Coach: opera asistencia y notas privadas; no recibe permisos administrativos generales.
- Admin: gestiona operación, alumnos, membresías, contenido y configuración.
- `service_role` permanece exclusivamente en Edge Functions.
