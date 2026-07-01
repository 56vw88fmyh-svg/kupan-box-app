# Resultado Refactor Admin KUPAN

## Etapa 1: Constantes y Helpers Puros

Estado: completada.

Fecha: 2026-06-30.

## Objetivo

Reducir el tamaño y la complejidad visual de `src/pages/Admin.jsx` sin alterar la lógica principal del panel administrador.

## Archivos creados

- `src/config/adminNavigation.js`
- `src/constants/adminConstants.js`
- `src/utils/adminFormatters.js`
- `src/utils/adminMetrics.js`
- `src/utils/adminUtilities.test.js`

## Archivos modificados

- `src/pages/Admin.jsx`
- `package.json`
- `docs/admin-refactor-plan.md`

## Elementos extraídos

Navegación:

- `adminSectionMeta`
- `adminNavigationModules`
- `getAdminModuleId`
- `getAdminNavigationItemIds`

Factories y constantes:

- `createEmptyPlanDraft`
- `createEmptyMembershipDraft`
- `createEmptyMembershipEditDraft`
- `createEmptyWodDraft`
- `createEmptyScheduleDraft`
- `createEmptyPostDraft`
- `createEmptyStudentDraft`
- `createEmptyManualReservationDraft`
- `settingKeys`
- `studentFilters`
- `weekdayLabels`

Formateadores:

- `formatDate`
- `getChileDateString`
- `formatMoney`
- `toTime`
- `getDateTimeValue`

Métricas y cálculos:

- `addDays`
- `calculateDaysBetween`
- `getPlanTokenTotal`
- `getMembershipTokens`
- `getChileDayOfWeek`

## Medición

- `src/pages/Admin.jsx` antes: 2501 líneas.
- `src/pages/Admin.jsx` después: 2270 líneas.
- Reducción: 231 líneas.

## Pruebas agregadas

Se agregó `src/utils/adminUtilities.test.js` para validar:

- Integridad de navegación admin.
- Factories de drafts sin referencias compartidas.
- Formateo de fechas, moneda y hora.
- Cálculo de días y tokens.
- Detección de día en zona horaria de Chile.

## Límites respetados

- No se modificaron contratos de Supabase.
- No se tocaron RPC ni políticas RLS.
- No se alteraron payloads de reservas, tokens, membresías o alumnos.
- No se extrajeron hooks.
- No se extrajeron mutaciones.
- No se extrajeron formularios.
- No se modificó el diseño.

## Comportamiento preservado

- Misma navegación visible por módulos.
- Mismos IDs de secciones.
- Mismos valores iniciales de formularios.
- Misma lectura visual de fechas, horas, montos y tokens.
- Misma operación del panel administrador.

## Riesgos y pendientes

- `Admin.jsx` aún mantiene estado, mutaciones y formularios. Es intencional para no mezclar etapas.
- Hay accesos rápidos que reutilizan la misma sección con distinto `target` interno. Se mantuvo el patrón actual.
- La siguiente reducción importante vendrá al separar lectura de datos y componentes, pero eso corresponde a Etapa 2 o posterior.

## Siguiente etapa sugerida

Etapa 2: extracción de lectura admin (`useAdminData`) solo después de validar esta etapa en producción o en preview.

## Etapa 2: Lectura Administrativa useAdminData

Estado: completada.

Fecha: 2026-06-30.

## Objetivo

Extraer desde `src/pages/Admin.jsx` la carga, refresco, errores parciales y estados de lectura del panel administrador, sin mover mutaciones ni formularios.

## Archivos creados

- `src/hooks/admin/useAdminData.js`
- `src/hooks/admin/useAdminData.test.js`

## Archivos modificados

- `src/pages/Admin.jsx`
- `package.json`
- `docs/admin-refactor-plan.md`
- `docs/admin-refactor-result.md`

## API final del hook

- `data`
- `isLoading`
- `isRefreshing`
- `sectionLoading`
- `sectionErrors`
- `lastUpdated`
- `reloadAll`
- `reloadSection`
- `updateSectionData`

## Loaders trasladados

- `profiles`: `admin_get_profiles`
- `plans`: `admin_get_plans`
- `memberships`: `admin_get_memberships`
- `reservations`: `admin_get_reservations`
- `wod`: `admin_get_wod`
- `schedule`: `admin_get_schedule`
- `posts`: `admin_get_community_posts`
- `settings`: `admin_get_app_settings`
- `birthdays`: `birthdays_this_month`
- `prs`: `admin_get_personal_records`
- `tokenMovements`: `admin_get_token_movements`
- `upcomingBirthdays`: `loadUpcomingBirthdays(30)`

## Estados trasladados

- `adminData`
- `isLoading`
- `lastUpdated`
- `sectionErrors`

## Errores parciales

`reloadAll` conserva datos anteriores para secciones fallidas y actualiza solo secciones exitosas. Los errores quedan asociados a la clave de sección para mostrar detalle y permitir reintento individual.

## Control de concurrencia

El hook usa IDs incrementales de solicitud global y por sección para evitar que respuestas antiguas sobrescriban datos más recientes.

## Protección ante desmontaje

El hook usa `mountedRef` y evita aplicar estado si el componente se desmonta durante una carga.

## Protección de textos

`textDraft` sigue en `Admin.jsx`, pero se hidrata solo en carga inicial o después de guardar textos correctamente. Una recarga normal ya no pisa cambios locales sin guardar.

## Pruebas creadas

`src/hooks/admin/useAdminData.test.js` cubre:

- Carga completa exitosa.
- Fallas parciales.
- Múltiples fallas.
- Resultado vacío válido.
- Conservación de datos anteriores en secciones fallidas.
- Loader individual por sección.
- Factories de datos independientes.
- Estado inicial de carga por sección.

## Medición

- `src/pages/Admin.jsx` antes de Etapa 2: 2270 líneas.
- `src/pages/Admin.jsx` después de Etapa 2: 2207 líneas.
- `src/hooks/admin/useAdminData.js`: 323 líneas.
- Reducción neta de `Admin.jsx`: 63 líneas.

## Riesgos y pendientes

- Las mutaciones siguen dentro de `Admin.jsx`.
- Los formularios siguen dentro de `Admin.jsx`.
- Las recargas post-mutación siguen usando recarga global por seguridad.
- `useAdminFeedback` queda pendiente para una etapa posterior.

## Contratos preservados

- No se cambiaron nombres de RPC.
- No se cambiaron payloads.
- No se cambiaron tablas.
- No se cambiaron políticas RLS.
- No se expuso `service_role`.
- No se cambió la UI.
- No se avanzó a Etapa 3.

## Etapa 3: Sistema de Feedback useAdminFeedback

Estado: completada.

Fecha: 2026-06-30.

## Objetivo

Extraer desde `src/pages/Admin.jsx` el estado y control del feedback global del panel administrador, sin mover mutaciones ni formularios.

## Archivos creados

- `src/hooks/admin/useAdminFeedback.js`
- `src/hooks/admin/useAdminFeedback.test.js`

## Archivos modificados

- `src/pages/Admin.jsx`
- `package.json`
- `docs/admin-refactor-plan.md`
- `docs/admin-refactor-result.md`

## API final del hook

- `feedback`
- `message`
- `messageType`
- `showSuccess`
- `showError`
- `showInfo`
- `showWarning`
- `clearFeedback`

## Tipos admitidos

- `success`
- `error`
- `info`
- `warning`

## Limpieza automática

El comportamiento por defecto preserva la app existente: los mensajes no se limpian automáticamente. El hook permite `autoDismiss` y `duration`, cancela temporizadores anteriores y evita que un temporizador antiguo borre un mensaje nuevo.

## Errores persistentes

Los errores importantes permanecen visibles por defecto. `showError` acepta strings, `Error`, errores Supabase o valores desconocidos.

## Prevención de duplicados

Las mutaciones que muestran éxito ahora llaman `refreshData({ silent: true })`, evitando que el mensaje de acción sea reemplazado por “Datos actualizados desde Supabase.”

## Pruebas creadas

`src/hooks/admin/useAdminFeedback.test.js` cubre:

- Estado inicial.
- `showSuccess`.
- `showError`.
- `showInfo`.
- `showWarning`.
- `clearFeedback`.
- Reemplazo de mensajes.
- Cancelación de temporizadores previos.
- Limpieza con duración.
- Error persistente.
- `autoDismiss: false`.
- Temporizador antiguo que no borra mensaje nuevo.
- Unmount sin actualizaciones posteriores.

## Medición

- `src/pages/Admin.jsx` antes de Etapa 3: 2207 líneas.
- `src/pages/Admin.jsx` después de Etapa 3: 2179 líneas.
- `src/hooks/admin/useAdminFeedback.js`: 169 líneas.
- `src/hooks/admin/useAdminFeedback.test.js`: 119 líneas.

## Riesgos y pendientes

- `warning` e `info` usan el bloque visual existente. No se agregaron estilos nuevos para no cambiar la UI.
- `showInfo` queda disponible para futuras etapas, aunque `Admin.jsx` no lo usa todavía.

## Contratos preservados

- No se cambiaron nombres de RPC.
- No se cambiaron payloads.
- No se cambiaron tablas.
- No se cambiaron políticas RLS.
- No se expuso `service_role`.
- No se cambió la UI.
- No se avanzó a Etapa 4.

## Etapa 4: Componentes Presentacionales por Módulo

Estado: completada.

Fecha: 2026-06-30.

## Objetivo

Extraer el renderizado de las secciones del panel admin a componentes presentacionales, manteniendo en `src/pages/Admin.jsx` la coordinación de estado, refs, validaciones, mutaciones, RPC y feedback.

## Archivos creados

- `src/components/admin/AdminUi.jsx`
- `src/components/admin/modules/AdminOverviewModule.jsx`
- `src/components/admin/modules/AdminCreateStudentModule.jsx`
- `src/components/admin/modules/AdminStudentsModule.jsx`
- `src/components/admin/modules/AdminPlansModule.jsx`
- `src/components/admin/modules/AdminMembershipsModule.jsx`
- `src/components/admin/modules/AdminReservationsModule.jsx`
- `src/components/admin/modules/AdminWodModule.jsx`
- `src/components/admin/modules/AdminScheduleModule.jsx`
- `src/components/admin/modules/AdminCommunicationsModule.jsx`
- `src/components/admin/modules/AdminSettingsModule.jsx`
- `src/components/admin/modules/AdminBirthdaysModule.jsx`
- `src/components/admin/modules/AdminPersonalRecordsModule.jsx`
- `src/components/admin/modules/adminModules.test.js`

## Archivos modificados

- `src/pages/Admin.jsx`
- `package.json`
- `docs/admin-refactor-result.md`

## Componentes auxiliares extraídos

`src/components/admin/AdminUi.jsx` concentra componentes visuales reutilizados por los módulos:

- `Field`
- `TextArea`
- `SelectField`
- `ToggleField`
- `AdminSection`
- `SmallRow`
- `AdminSidebar`
- `QuickActionButton`

## Secciones extraídas

Se extrajeron las 12 secciones controladas por `activeSection`:

- `overview`
- `create-student`
- `students`
- `plans`
- `memberships`
- `reservations`
- `wod`
- `schedule`
- `community`
- `texts`
- `birthdays`
- `prs`

## Responsabilidades que permanecen en Admin.jsx

- Login/validación de acceso admin.
- `useAdminData`.
- `useAdminFeedback`.
- Filtros y cálculos derivados.
- Estados de drafts.
- Refs de scroll/focus.
- Todas las mutaciones.
- Todas las llamadas Supabase.
- Construcción de payloads RPC/Edge Function.
- Feedback post-mutación.

## Pruebas creadas

`src/components/admin/modules/adminModules.test.js` valida que:

- Existan los 12 módulos esperados.
- Cada archivo exporte un módulo admin.
- Ningún módulo importe Supabase.
- Ningún módulo use `useAdminData` ni `useAdminFeedback`.
- Ningún módulo llame `.rpc()` ni `.from()`.
- Ningún módulo use funciones de mutación/usuario admin del frontend.

## Medición

- `src/pages/Admin.jsx` antes de Etapa 4: 2179 líneas.
- `src/pages/Admin.jsx` después de Etapa 4: 1503 líneas.
- Reducción neta de `Admin.jsx`: 676 líneas.

## Contratos preservados

- No se cambiaron nombres de RPC.
- No se cambiaron payloads.
- No se cambiaron tablas.
- No se cambiaron políticas RLS.
- No se movieron mutaciones a hooks.
- No se extrajeron formularios inteligentes.
- No se cambió la UI aprobada.
- No se avanzó a Etapa 5 en esa intervención.

## Etapa 5: Formularios Controlados

Estado: completada.

Fecha: 2026-06-30.

## Objetivo

Extraer los formularios visuales desde módulos admin a componentes independientes, manteniendo los drafts, validaciones, mutaciones y callbacks en `src/pages/Admin.jsx`.

## Archivos creados

- `src/components/admin/forms/AdminWodForm.jsx`
- `src/components/admin/forms/AdminScheduleForm.jsx`
- `src/components/admin/forms/AdminCommunityPostForm.jsx`
- `src/components/admin/forms/AdminSettingsForm.jsx`
- `src/components/admin/forms/AdminManualReservationForm.jsx`
- `src/components/admin/forms/AdminPlanForm.jsx`
- `src/components/admin/forms/AdminMembershipActivationForm.jsx`
- `src/components/admin/forms/AdminMembershipEditForm.jsx`
- `src/components/admin/forms/AdminCreateStudentForm.jsx`
- `src/components/admin/forms/adminForms.test.js`

## Archivos modificados

- `src/components/admin/modules/AdminWodModule.jsx`
- `src/components/admin/modules/AdminScheduleModule.jsx`
- `src/components/admin/modules/AdminCommunicationsModule.jsx`
- `src/components/admin/modules/AdminSettingsModule.jsx`
- `src/components/admin/modules/AdminReservationsModule.jsx`
- `src/components/admin/modules/AdminPlansModule.jsx`
- `src/components/admin/modules/AdminMembershipsModule.jsx`
- `src/components/admin/modules/AdminCreateStudentModule.jsx`
- `package.json`
- `docs/admin-refactor-plan.md`
- `docs/admin-refactor-result.md`

## Formularios extraídos

- WOD.
- Horarios.
- Publicaciones de comunidad.
- Textos principales.
- Reserva manual.
- Planes.
- Activación de membresía.
- Edición de membresía.
- Crear alumno.

## Contratos de props

Todos los formularios reciben `draft`, callback de cambio, callback de submit y props visuales opcionales como `isSubmitting`/`disabled`. Los formularios con refs reciben `formRef`. Los formularios con opciones reciben listas ya cargadas desde el módulo.

## Drafts que permanecen en Admin.jsx

- `planDraft`
- `membershipDraft`
- `membershipEditDraft`
- `wodDraft`
- `scheduleDraft`
- `postDraft`
- `studentDraft`
- `manualReservationDraft`
- `textDraft`

## Validaciones y mutaciones preservadas

Las validaciones de negocio, normalización final, payloads, llamadas RPC, llamadas Edge Function, feedback y recargas permanecen en `Admin.jsx`.

## Manejo de submit y doble envío

Cada formulario usa `form onSubmit={onSubmit}` y botones `type="submit"`. No se agregó `onClick` duplicado en botones principales. Los formularios aceptan `isSubmitting` y `disabled`; los estados existentes como `isCreatingStudent` e `isSavingManualReservation` se siguen usando.

## Refs, scroll y foco

Los refs de crear alumno, reserva manual, activar membresía y editar membresía se mantienen en `Admin.jsx` y se pasan al formulario o wrapper correspondiente. No se cambiaron IDs ni targets de navegación.

## Medición

- `src/pages/Admin.jsx` antes de Etapa 5: 1503 líneas.
- `src/pages/Admin.jsx` después de Etapa 5: 1503 líneas.
- Formularios extraídos: 9.
- Pruebas agregadas: 1 archivo.

## Formularios no extraídos

No se creó `AdminMembershipTokenAdjustmentForm` porque no existe un bloque de formulario independiente. El ajuste de tokens se activa desde acciones rápidas de membresía y la lógica permanece en `Admin.jsx`.

## Contratos preservados

- No se cambiaron nombres de RPC.
- No se cambiaron payloads.
- No se cambiaron tablas.
- No se cambiaron políticas RLS.
- No se agregó `service_role`.
- No se cambió `/coach`.
- No se cambió la UI aprobada.
- No se avanzó a Etapa 6.

## Etapa 6: Mutaciones por Dominio

Estado: completada.

Fecha: 2026-06-30.

## Objetivo

Extraer persistencia y operaciones Supabase/Edge Function desde `src/pages/Admin.jsx` hacia hooks por dominio, manteniendo en `Admin.jsx` los wrappers de coordinación, validaciones de negocio, feedback, drafts, refs, navegación y recargas.

## Archivos creados

- `src/hooks/admin/useAdminWod.js`
- `src/hooks/admin/useAdminSchedule.js`
- `src/hooks/admin/useAdminCommunications.js`
- `src/hooks/admin/useAdminSettings.js`
- `src/hooks/admin/useAdminPlans.js`
- `src/hooks/admin/useAdminStudents.js`
- `src/hooks/admin/useAdminReservations.js`
- `src/hooks/admin/useAdminMemberships.js`
- `src/hooks/admin/useAdminMutationState.js`
- `src/hooks/admin/adminMutations.test.js`
- `src/utils/adminMutationBuilders.js`
- `docs/admin-mutations-map.md`

## Archivos modificados

- `src/pages/Admin.jsx`
- `src/components/admin/modules/AdminWodModule.jsx`
- `src/components/admin/modules/AdminScheduleModule.jsx`
- `src/components/admin/modules/AdminCommunicationsModule.jsx`
- `src/components/admin/modules/AdminSettingsModule.jsx`
- `src/components/admin/modules/AdminPlansModule.jsx`
- `src/components/admin/modules/AdminMembershipsModule.jsx`
- `package.json`
- `docs/admin-refactor-plan.md`
- `docs/admin-refactor-result.md`

## Mutaciones extraídas

- `saveWod`
- `saveSchedule`
- `toggleSchedule`
- `savePost`
- `togglePost`
- `saveTexts`
- `savePlan`
- `togglePlan`
- `createStudent`
- `saveManualReservation`
- `updateReservationStatus`
- `saveMembership`
- `saveMembershipEdit`
- `updateMembershipStatus`
- `renewMembership`
- `extendMembershipSevenDays`
- `adjustMembershipTokens`
- `simulateApprovedPayment`

## API de hooks

Cada hook devuelve operaciones del dominio, estado de envío y resultados estructurados `{ success, data, error, affectedSections }`. Los hooks no muestran feedback, no navegan, no manipulan drafts y no controlan componentes visuales.

## Builders creados

- `buildPlanPayload`
- `buildSchedulePayload`
- `buildCommunityPostPayload`
- `buildMembershipActivationPayload`
- `buildMembershipUpdatePayload`
- `buildMembershipStatusPayload`
- `buildCreateStudentBody`
- `buildManualReservationInput`
- `buildPaymentSimulationBody`

## Estados de envío

- `isSavingWod`
- `isSavingSchedule`
- `isSavingPost`
- `isSavingSettings`
- `isSavingPlan`
- `isCreatingStudent`
- `isSavingManualReservation`
- `isSavingMembership`
- `isSavingMembershipEdit`
- `isSimulatingPayment`
- Estados por clave para toggles y acciones por ID.

## Recargas

Las mutaciones devuelven `affectedSections` y `Admin.jsx` coordina `reloadSection`. Queda fallback a `refreshData({ silent: true })` si una operación no declara secciones.

## Medición

- `src/pages/Admin.jsx` antes de Etapa 6: 1503 líneas.
- `src/pages/Admin.jsx` después de Etapa 6: 1439 líneas.

## Contratos preservados

- No se cambiaron nombres de RPC.
- No se cambiaron payloads.
- No se cambiaron tablas.
- No se cambiaron políticas RLS.
- No se agregó `service_role`.
- No se implementó borrador WOD.
- No se cambió la UI aprobada.
- No se avanzó a Etapa 7.

## Etapa 7: Borrador Local Recuperable del WOD Admin

Estado: completada.

Fecha: 2026-06-30.

## Objetivo

Proteger el formulario WOD admin contra pérdida accidental por recarga, cierre del navegador, actualización PWA, pérdida temporal de conexión, sesión vencida o error al guardar en Supabase.

## Archivos creados

- `src/hooks/admin/useAdminWodDraft.js`
- `src/utils/adminWodDraft.js`
- `src/utils/adminWodDraft.test.js`
- `src/hooks/admin/useAdminWodDraft.test.js`
- `docs/admin-wod-draft.md`

## Archivos modificados

- `src/pages/Admin.jsx`
- `src/components/admin/modules/AdminWodModule.jsx`
- `package.json`
- `docs/admin-refactor-plan.md`
- `docs/admin-refactor-result.md`

## Clave de persistencia

Se usa exactamente:

- `kupan_admin_wod_draft_v1`

## Estructura del borrador

El borrador local se guarda versionado con:

- `version`
- `savedAt`
- `date`
- `draft`
- `remoteReference`

No se guardan tokens, sesión, claves Supabase, datos de usuario, funciones ni refs.

## API del hook

`useAdminWodDraft` expone:

- `hasStoredDraft`
- `storedDraft`
- `storedDraftMetadata`
- `isDraftDirty`
- `saveDraftNow`
- `discardStoredDraft`
- `recoverStoredDraft`
- `clearStoredDraft`
- `markRemoteSaveSuccessful`

## Reglas aplicadas

- No se recupera automáticamente.
- No se sincroniza automáticamente con Supabase.
- No se reemplaza un WOD remoto sin confirmación.
- No se guarda un draft completamente vacío.
- La fecha sola no cuenta como contenido significativo.
- El borrador permanece si falla el guardado remoto.
- El borrador se borra después de guardado remoto exitoso.
- El borrador vence a los 14 días.
- Un borrador idéntico al WOD remoto se limpia y no se ofrece recuperación.
- La estrategia de cambio de fecha usa una sola clave con fecha interna y guarda el draft completo.

## Integración visual

`AdminWodModule` muestra un aviso pequeño cuando existe borrador local, con acciones explícitas para recuperar o descartar. El formulario WOD mantiene los mismos campos, labels, placeholders y orden.

## Pruebas agregadas

`src/utils/adminWodDraft.test.js` valida:

- Clave exacta de persistencia.
- Versión.
- Detección de contenido significativo.
- Fecha sola como contenido insuficiente.
- Estructura versionada.
- Parseo seguro.
- Rechazo de versiones inválidas y JSON inválido.
- Expiración.
- Comparación con WOD remoto.
- Igualdad entre draft local y remoto.

`src/hooks/admin/useAdminWodDraft.test.js` valida estáticamente:

- Debounce.
- Limpieza de temporizadores.
- Uso de `beforeunload`.
- Ausencia de Supabase y claves sensibles.
- Ausencia de recuperación automática desde efectos.

## Contratos preservados

- No se cambiaron nombres de RPC.
- No se cambiaron payloads.
- No se cambiaron tablas.
- No se cambiaron políticas RLS.
- No se agregó `service_role`.
- No se cambió `/coach`.
- No se cambió la vista alumno.
- No se agregó dependencia externa.
- No se agregó sincronización en segundo plano.
- No se avanzó a Etapa 8.
