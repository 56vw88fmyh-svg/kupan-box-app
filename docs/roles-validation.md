# Validación de Roles KUPAN

Fecha: 2026-07-01

## Sin sesión

Resultado esperado:
- La app debe permitir navegar en pantallas públicas.
- Las acciones privadas deben pedir inicio de sesión.

Estado:
- Validación automática pública incluida en E2E.
- Prueba manual pendiente para flujo completo en dispositivo real.
- E2E validó que `/admin` y `/coach` sin sesión redirigen a login sin exponer paneles privados.

## Alumno

Resultado esperado:
- Puede iniciar sesión, ver perfil, plan, tokens, reservas y PR propios.
- No puede entrar a Admin ni Coach si su perfil no tiene rol permitido.
- No puede editar rol, email, estado ni membresías.

Estado:
- Contratos de frontend y rutas protegidas revisados.
- Prueba autenticada completa pendiente si no existen credenciales de prueba disponibles en entorno local.
- E2E de alumno autenticado quedó saltado por falta de credenciales seguras en el entorno de prueba.

## Coach

Resultado esperado:
- Puede entrar a `/coach` solo si su rol/permisos lo permiten.
- Puede marcar asistencia o no show sin devolver token.
- Puede cancelar reservas con reglas actuales.

Estado:
- Modo Coach no fue refactorizado ni cambiado.
- Prueba manual pendiente con usuario coach/admin real.
- E2E de coach autenticado quedó saltado por falta de credenciales seguras en el entorno de prueba.

## Admin

Resultado esperado:
- Puede entrar a `/admin` solo con perfil `role = admin` y `status = active`.
- Puede gestionar alumnos, membresías, reservas, planes, WOD, horarios y comunidad.

Estado:
- Carga admin ya estaba funcional antes de esta validación.
- No se cambió la lógica de roles ni RLS.
- E2E de admin autenticado quedó saltado por falta de credenciales seguras en el entorno de prueba.
