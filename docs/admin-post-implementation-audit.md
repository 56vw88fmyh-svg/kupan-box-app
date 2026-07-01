# Auditoría Post Implementación Admin KUPAN

Fecha: 2026-06-30  
Alcance: `/admin`, navegación interna, dashboard, persistencia, Supabase, PWA y experiencia mobile-first.

## Inventario

### Rutas administrativas

- `/admin`: panel administrador protegido por `role = admin` y `status = active`.
- `/coach`: modo coach protegido por `role = admin` o `role = coach`.

### Rutas antiguas / compatibilidad

La navegación pública mantiene aliases en `src/navigation/routes.js`:

- `/horarios` -> `/reservas`
- `/calendario` -> `/reservas`
- `/mis-reservas` -> `/reservas`
- `/historial-reservas` -> `/reservas`
- `/wod-hoy` -> `/wod`
- `/resultados` -> `/wod`
- `/actividad` -> `/comunidad`
- `/eventos` -> `/comunidad`
- `/noticias` -> `/comunidad`
- `/cumpleanos` -> `/comunidad`
- `/configuracion` -> `/perfil`
- `/ayuda` -> `/perfil`

No existen rutas separadas para módulos internos del Admin; son secciones SPA dentro de `/admin`.

### Componentes nuevos

- `src/components/admin/AdminDashboard.jsx`
  - `AdminPageHeader`
  - `AdminStatCard`
  - `AdminAlertCard`
  - `AdminClassCard`
  - `AdminStudentCard`
  - `AdminRecentActivity`
  - `AdminMobileModuleNav`

### Componentes antiguos todavía utilizados

- `AdminSidebar`
- `QuickActionButton`
- `Field`
- `TextArea`
- `SelectField`
- `ToggleField`
- `AdminSection`
- `SmallRow`

### Servicios de Supabase usados por Admin

RPCs de carga:

- `admin_get_profiles`
- `admin_get_plans`
- `admin_get_memberships`
- `admin_get_reservations`
- `admin_get_wod`
- `admin_get_schedule`
- `admin_get_community_posts`
- `admin_get_app_settings`
- `birthdays_this_month`
- `admin_get_personal_records`
- `admin_get_token_movements`

RPCs o mutaciones operativas:

- `admin_activate_membership`
- `admin_update_membership`
- `admin_renew_membership`
- `admin_extend_membership`
- `admin_adjust_tokens`
- `admin_mark_reservation`
- `admin_reserve_for_student`
- `cancel_reservation`
- Upsert/update/insert sobre `plans`, `wod`, `class_schedule`, `community_posts`, `app_settings`.

### Uso de localStorage/sessionStorage

- PR offline/migración legada:
  - `src/services/personalRecordsService.ts`
  - `src/services/prMigrationService.js`
- Preferencia de nivel WOD:
  - `src/pages/Wod.jsx`
- Service worker/cache:
  - `public/sw.js`
  - `src/components/AppShell.jsx`
  - `src/components/PwaUpdateBanner.jsx`

No se detectó que datos administrativos críticos del Admin dependan únicamente de `localStorage`.

## Hallazgos

| Pantalla | Archivo/componente | Problema | Impacto | Prioridad | Solución | Riesgo | Criterio de aceptación |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Admin Inicio | `src/pages/Admin.jsx` | Métricas podían mostrar `0` cuando una consulta parcial fallaba. | El admin podía interpretar un error de carga como ausencia real de datos. | Alto | Mostrar `Sin cargar` y estados de atención cuando falla una sección. | Bajo: solo afecta presentación. | Si falla una RPC, no se muestra cero engañoso. |
| Admin navegación | `AdminSidebar` | Módulos duplicados podían aparecer activos cuando una sección existe en más de un grupo. | Confusión en navegación. | Medio | Destacar por `activeModuleId` en lugar de comparar solo `activeSection`. | Bajo. | Solo un módulo aparece como activo. |
| Admin móvil | `AdminMobileModuleNav` | El menú “Más” podía quedar abierto tras seleccionar una opción. | Estorba contenido en celular. | Medio | Cerrar el `<details>` al seleccionar una opción. | Bajo. | Al tocar una opción de “Más”, el menú se cierra. |
| Admin dashboard | `Admin.jsx` | Al fallar WOD, podía generarse alerta falsa de WOD pendiente. | Alerta no accionable basada en error, no en datos reales. | Medio | No crear alerta de WOD pendiente si la consulta WOD falló. | Bajo. | Alertas dependen de datos cargados correctamente. |
| Mobile Admin | `Admin.jsx` | Buscadores tenían fuente menor a 16px. | Safari iOS puede hacer zoom automático. | Bajo | Subir inputs de búsqueda a `text-base`. | Bajo. | Inputs no provocan zoom inesperado. |

## Datos simulados

No se agregaron datos simulados al Admin. El dashboard usa únicamente `adminData` cargado desde Supabase RPCs.

## Acciones no conectadas

No se detectaron botones principales sin `onClick` o acción. Las acciones del nuevo dashboard llevan a secciones existentes; algunas son accesos directos a módulos internos, no ejecutan mutaciones por sí mismas.

## Persistencia

Clasificación:

- Temporal:
  - Cola offline de PR (`kupan_pr_pending_v1`).
- Preferencia de interfaz:
  - Nivel seleccionado en WOD (`kupan_wod_level`).
- Borrador recuperable:
  - No implementado aún para WOD admin.
- Dato administrativo crítico:
  - Planes, pagos, reservas, asistencia, WOD, horarios, noticias, eventos y alumnos: Supabase.

## Seguridad

- No se agregó `service_role` al frontend.
- Admin sigue protegido por `currentUser` y revalidación con `getCurrentSupabaseUser()`.
- Las funciones sensibles siguen usando RPCs Supabase ya existentes.

## Móvil

Correcciones aplicadas:

- Navegación inferior interna para Admin.
- Menú “Más” se cierra al seleccionar opción.
- Inputs de búsqueda con 16px.
- Botones táctiles principales con altura mínima cercana o superior a 44px.

Riesgo pendiente:

- Validación visual real en dispositivos físicos sigue recomendada antes de liberar masivamente cambios del Admin.
