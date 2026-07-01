# Validación de Reservas KUPAN

Fecha: 2026-07-01

## Flujo alumno

Resultado esperado:
- Reservar clase llama a `reserve_class`.
- Cancelar reserva llama a `cancel_reservation`.
- Se respetan cupos, membresía activa, tokens disponibles y reserva duplicada.
- La interfaz refresca cupos, reservas y tokens después de reservar o cancelar.

Estado:
- Se mantuvieron nombres de RPC, payloads y contratos existentes.
- Se reforzó la prevención de doble cancelación desde la interfaz.
- La protección quedó cubierta por `npm test`.

## Cancelaciones

Corrección aplicada:
- La función de confirmación ahora ignora un segundo intento si la misma clase ya está procesando.
- El botón de confirmación queda deshabilitado mientras se ejecuta la cancelación.

Riesgo reducido:
- Evita doble toque accidental en mobile.
- Evita llamadas duplicadas innecesarias a Supabase.

## Pruebas pendientes

- Alumno con plan activo reserva una clase.
- Alumno cancela una clase antes de asistencia.
- Admin marca `attended`.
- Admin marca `no_show`.
- Clase llena bloquea reserva.
- Alumno sin tokens queda bloqueado.

Estas pruebas requieren credenciales reales o un staging aislado con mutaciones permitidas.
