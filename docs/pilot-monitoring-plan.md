# Plan de Monitoreo Piloto KUPAN

Fecha: 2026-07-01

## Objetivo

Supervisar un piloto controlado del panel KUPAN con pocos administradores, detectando errores operativos antes de abrir el uso general.

## Responsables y canal

- Responsable operativo: por definir antes del piloto.
- Responsable tecnico: por definir antes del piloto.
- Canal de incidentes: grupo interno KUPAN o canal acordado antes de iniciar.
- Horario de revision: al cierre de cada bloque operativo y una revision diaria final.
- Responsable de congelamiento: pendiente.
- Responsable de revision Supabase: pendiente.

## Qué revisar diariamente

- Errores de consola reportados por usuarios.
- Errores Supabase.
- Fallos de RPC.
- Reservas duplicadas.
- Membresías duplicadas.
- Movimientos de token inconsistentes.
- WOD no guardados.
- Fallos de login.
- Fallos PWA o versión antigua.
- Reservas del dia.
- Membresias creadas, renovadas, pausadas o canceladas.
- Movimientos de token del dia.
- WOD publicado.
- Errores de login.
- Usuarios afectados.
- Hora aproximada.
- Navegador y dispositivo.
- Acción ejecutada.

## Severidad

### Crítico

- Acceso no autorizado.
- Pérdida de datos.
- Duplicación de tokens, reservas o membresías.
- Imposibilidad de reservar o administrar clases.

### Alto

- Error recurrente en mutación admin.
- WOD no se guarda.
- Sesión expira y borra formularios.
- PWA muestra versión antigua que afecta operación.

### Medio

- Error visual que dificulta una acción.
- Falla puntual recuperable con reintento.
- Mensaje confuso en operación crítica.

### Bajo

- Texto menor.
- Ajuste visual no bloqueante.
- Warning no funcional.

## Procedimiento de reporte

Registrar:

- Usuario.
- Rol.
- Fecha y hora.
- Acción.
- Resultado esperado.
- Resultado obtenido.
- Captura si existe.
- Navegador/dispositivo.
- Si se repitió la acción.
- Severidad asignada.
- Captura o video si existe.
- Registro relacionado en Supabase si aplica, sin exponer secretos.
- Decision tomada: observar, corregir, revertir o congelar piloto.

## Tiempo de respuesta esperado

- Critico: detener operacion afectada de inmediato y revisar antes de continuar.
- Alto: revisar durante el mismo bloque operativo.
- Medio: revisar en la revision diaria.
- Bajo: registrar para backlog posterior.

## Congelamiento del piloto

Congelar el piloto si ocurre cualquiera de estos puntos:

- Acceso no autorizado.
- Perdida o mezcla de datos entre alumnos.
- Reserva duplicada con doble descuento.
- Devolucion doble de tokens.
- Membresia superpuesta no esperada.
- Pago simulado tratado como pago real.

Durante el congelamiento:

- No repetir mutaciones criticas.
- Preservar capturas, hora, usuario y datos afectados.
- Revisar Supabase antes de corregir manualmente.
- Decidir rollback o correccion puntual.

## Reglas operativas durante piloto

- No repetir una mutación crítica si hay duda del resultado.
- Revisar datos antes de reintentar reservas, tokens o membresías.
- Mantener registro manual de cambios críticos.
- Ejecutar revisión diaria de reservas/membresías/tokens.
- Mantener rollback disponible.

## Uso interno supervisado

- Baseline reproducible Supabase: pendiente como deuda tecnica posterior.
- No bloquea el uso interno limitado si roles, reservas, tokens, respaldo y rollback se validan manualmente.
- Mantener acceso limitado: 1 admin, 1 o 2 coaches y 5 a 10 alumnos.
- Duracion inicial recomendada: 5 dias habiles.
