# Validación Autenticada Final KUPAN

Fecha: 2026-07-01

## Estado general

La validación autenticada completa queda pendiente porque no hay credenciales E2E autorizadas cargadas en el entorno local.

## Sin sesión

Estado: aprobado automáticamente.

Evidencia:
- `/admin` redirige a login sin exponer panel.
- `/coach` redirige a login sin exponer asistencia.
- Rutas públicas/protegidas no muestran pantalla blanca.

## Alumno

Estado: pendiente manual.

Falta validar con una cuenta autorizada:
- Login.
- Persistencia.
- Perfil.
- Membresía.
- Tokens.
- Reservas.
- Bloqueo de `/admin` y `/coach`.

## Coach

Estado: pendiente manual.

Falta validar con una cuenta autorizada:
- Login.
- Acceso a `/coach`.
- Clases del día.
- Alumnos reservados.
- Marcado de asistencia/no show en una reserva autorizada.
- Restricción de acciones administrativas.

## Admin

Estado: pendiente manual.

Falta validar con una cuenta autorizada:
- Login.
- Acceso a `/admin`.
- Recarga.
- Navegación completa.
- Secciones de alumnos, planes, membresías, reservas, WOD, horarios, comunidad, textos, cumpleaños y PR.

