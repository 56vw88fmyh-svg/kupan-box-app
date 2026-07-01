# Auditoría UX/Técnica Admin KUPAN

Fecha: 2026-06-30  
Alcance: panel `/admin`, datos Supabase usados por administración, navegación interna, formularios y experiencia mobile-first.

## Resumen

El panel administra funciones reales y críticas de KUPAN, pero concentra demasiadas tareas en `src/pages/Admin.jsx`. La lógica de negocio ya está conectada a Supabase mediante RPCs y tablas, por lo que la refactorización debe ser progresiva: mejorar navegación, jerarquía, visibilidad de acciones frecuentes y lectura diaria sin reescribir reservas, tokens ni membresías.

## Mapa Actual

Rutas administrativas existentes:

- `/admin`: panel principal protegido por `role = admin`.
- `/coach`: modo coach protegido por `role = admin` o `coach`.

Secciones internas actuales dentro de `/admin`:

- Resumen.
- Crear alumno.
- Alumnos.
- Planes.
- Membresías.
- Reservas.
- WOD.
- Horarios.
- Comunidad.
- Textos.
- Cumpleaños.
- PR destacados.

Servicios/RPCs relacionados:

- `admin_get_profiles`
- `admin_get_plans`
- `admin_get_memberships`
- `admin_get_reservations`
- `admin_get_wod`
- `admin_get_schedule`
- `admin_get_community_posts`
- `admin_get_app_settings`
- `admin_get_personal_records`
- `admin_get_token_movements`
- `birthdays_this_month`
- `admin_activate_membership`
- `admin_update_membership`
- `admin_renew_membership`
- `admin_adjust_tokens`
- `admin_extend_membership`
- `admin_mark_reservation`
- `admin_reserve_for_student`
- `cancel_reservation`

Persistencia:

- Datos críticos admin: Supabase.
- PR offline temporal: `localStorage` mediante `kupan_pr_pending_v1` y migración legada de PR.
- Estado visual del panel: React local state.
- No se detectó dependencia crítica admin exclusiva de `localStorage`.

## Hallazgos

| Prioridad | Problema | Ubicación | Solución propuesta | Archivos involucrados | Riesgos técnicos | Criterio de aceptación |
| --- | --- | --- | --- | --- | --- | --- |
| Alto | El dashboard inicial no responde claramente “qué ocurre hoy”. | `src/pages/Admin.jsx`, sección `overview`. | Crear resumen diario con clases de hoy, pendientes, vencimientos y actividad reciente desde datos reales. | `src/pages/Admin.jsx`, `src/components/admin/AdminDashboard.jsx`. | Mostrar datos incompletos si alguna RPC falla. | Admin ve estado del día sin bajar por el panel. |
| Alto | Navegación interna tiene demasiados grupos y nombres no alineados al trabajo diario. | `adminNavigationModules`. | Reorganizar en Inicio, Clases, Entrenamientos, Alumnos, Planes y pagos, Comunicaciones, Configuración. | `src/pages/Admin.jsx`. | Enlaces internos antiguos deben seguir funcionando. | Las acciones frecuentes quedan a uno o dos toques. |
| Medio | `Admin.jsx` tiene demasiadas responsabilidades. | Archivo completo. | Extraer componentes visuales de dashboard sin mover la lógica Supabase. | `src/components/admin/AdminDashboard.jsx`. | Refactor amplio puede romper guardados si se mueve lógica. | Componentes nuevos reciben props y no cambian mutaciones. |
| Medio | Botones de acción frecuente compiten visualmente con acciones secundarias. | Header interno y tarjetas de membresías/reservas. | Priorizar acciones rápidas visibles y mover contexto a tarjetas. | `src/pages/Admin.jsx`, `src/components/admin/AdminDashboard.jsx`. | Saturar mobile con demasiados botones. | No más de tres acciones principales por bloque. |
| Medio | Textos informativos usan demasiado acento rojo/naranjo y pueden leerse como error. | Chips, metas, encabezados internos. | Usar naranjo para acción/marca; rojo solo destructivo/crítico. | `src/pages/Admin.jsx`, componentes admin. | Mantener identidad visual sin perder jerarquía. | Información normal no aparece en rojo crítico. |
| Medio | Formularios largos no tienen suficiente ayuda contextual. | Crear alumno, membresías, WOD, reservas manuales. | Añadir textos de ayuda y mantener secciones de configuración avanzada cerradas en iteraciones futuras. | `src/pages/Admin.jsx`. | Requiere cambios por formulario. | Admin sabe qué está editando y qué se guardará. |
| Medio | Algunas tareas requieren recordar dónde están. | Reservas manuales, activar membresía, WOD. | Agregar buscador de acciones, acciones rápidas y navegación contextual. | `src/pages/Admin.jsx`. | Acciones duplicadas si no se ordenan. | Buscar alumno/WOD/pago lleva directo al módulo. |
| Bajo | Tablas/listas largas son tarjetas, pero faltan resúmenes de filtro más claros. | Alumnos, reservas, membresías. | Mantener tarjetas móviles y reforzar contadores/filtros. | `src/pages/Admin.jsx`. | Ninguno relevante. | Pantallas de 360 px no requieren tabla horizontal. |
| Bajo | Falta documentación viva del alcance admin. | `docs/`. | Crear este documento y actualizarlo por etapas. | `docs/admin-ux-audit.md`. | Puede quedar obsoleto si no se mantiene. | Auditoría disponible en repo. |

## Funciones Duplicadas o Repetidas

- Formularios usan componentes locales `Field`, `TextArea`, `SelectField`, `ToggleField`.
- Tarjetas usan `SmallRow` para múltiples dominios.
- Estados de éxito/error se manejan con `message`, `messageType` y errores por sección.
- No se duplicó lógica Supabase crítica; la mayoría de mutaciones vive como funciones internas de `Admin.jsx`.

## Acciones con Más de Tres Clics

- Activar membresía si el admin no recuerda que está bajo “Membresías”.
- Agregar alumno a clase si se entra desde un módulo distinto.
- Editar textos principales.
- Revisar cumpleaños y copiar saludo.
- Revisar token movements desde historial.

Solución aplicada/propuesta: navegación por módulos, acciones rápidas, dashboard inicial y buscador de acciones.

## Riesgos Pendientes

- La gestión avanzada de series recurrentes de clases no existe como modelo separado; actualmente se administra `class_schedule`.
- WOD no tiene aún flujo completo de borrador/programado/publicado en frontend. Requiere columnas/estado si se implementa con persistencia real.
- Registro de pagos detallado depende de estructura de membresías y webhook; no se debe simular como pago real.

## Criterios de Aceptación de Esta Etapa

- El Admin carga sin romper RPCs existentes.
- La navegación muestra los siete módulos solicitados.
- El dashboard inicial muestra información real: clases de hoy, pendientes, métricas, vencimientos y actividad reciente.
- Las acciones rápidas principales están visibles en mobile.
- No se modifica la lógica de reservas/tokens/membresías.
- `npm run lint`, `npm test` y `npm run build` pasan.
