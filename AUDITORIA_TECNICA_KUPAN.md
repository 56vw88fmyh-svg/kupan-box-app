# Auditoria Tecnica KUPAN Box App

Fecha: 2026-06-19  
Rama de trabajo: `auditoria/kupan-tecnica-2026-06-19`  
Repositorio revisado: `/Users/arismor/Desktop/kupan app`  
Deploy informado: `https://kupan-box-app.vercel.app/`

## Alcance

Se reviso la arquitectura actual del proyecto antes de modificar logica funcional. Esta auditoria no elimina datos, no cambia credenciales, no modifica variables de entorno y no altera flujos de reservas, alumnos, pagos, WOD, perfiles ni administracion.

El repositorio ya tenia cambios locales antes de esta auditoria en:

- `package.json`
- `package-lock.json`
- `public/sw.js`
- `src/assets/brand/colors/palette.js`
- `src/components/AppShell.jsx`
- `src/components/PwaUpdateBanner.jsx`
- `tailwind.config.js`

No se revirtio ni se sobrescribio ninguno de esos cambios.

## Arquitectura Detectada

### Framework y base tecnica

- Framework: React `19.0.0`.
- Build tool: Vite `6.4.2`.
- Lenguaje app: JavaScript / JSX.
- TypeScript: solo presente en Supabase Edge Functions (`supabase/functions/*/index.ts`), no en la app React.
- Estilos: Tailwind CSS `3.4.17` + CSS global en `src/styles.css`.
- Animaciones: `framer-motion`.
- Rutas: `react-router-dom` `7.15.1` con `BrowserRouter`.
- Backend: Supabase Auth, Supabase Database, RPC SQL y Edge Functions.
- PWA: manifest + service worker propio.

### Sistema de rutas

Definido principalmente en:

- `src/main.jsx`
- `src/App.jsx`
- `src/data/pages.js`

Rutas principales:

- `/` Home.
- `/reservas` Sistema de reservas.
- `/wod` WOD del dia.
- `/planes` Planes y pago/contacto.
- `/comunidad` Noticias, cumpleanos, ranking social y PR recientes.
- `/perfil` Perfil del alumno.
- `/mis-pr` PR personales.
- `/ranking` Ranking publico interno.
- `/login` Login / registro.
- `/admin` Panel admin.
- `/coach` Modo coach.
- `/horarios` redirige a `/reservas`.

Las paginas se cargan con `lazy()` y `Suspense`, lo que ayuda al rendimiento inicial.

### Componentes principales

- `src/components/AppShell.jsx`: layout principal, header, area de contenido, version de app y boton manual de actualizacion.
- `src/components/BottomNav.jsx`: navegacion inferior movil/fija.
- `src/components/PwaUpdateBanner.jsx`: registro del service worker y banner de nueva version.
- `src/components/NotificationBell.jsx`: notificaciones.
- `src/components/LoadingScreen.jsx`: pantalla de carga.
- `src/components/ClassCard.jsx`: cards de clases.
- `src/components/Motion.jsx`: wrappers de animacion.
- `src/components/SectionTitle.jsx`: titulos de seccion.

### Autenticacion

Definida en:

- `src/lib/supabase.js`
- `src/utils/auth.js`

La app usa Supabase Auth con `signInWithPassword`, `signUp`, `getUser`, `signOut` y `updateUser` para cambio de password.

Observacion importante:

- El cliente Supabase se crea sin configuracion explicita de `auth.storage`, por lo que Supabase JS usa persistencia de sesion en storage del navegador por defecto, normalmente `localStorage`.
- La app no usa directamente `localStorage`, pero Supabase Auth si puede usarlo internamente para mantener la sesion.

### Integracion Supabase

Archivo central:

- `src/lib/supabase.js`

Variables publicas esperadas:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Correcto:

- No se detecto `SUPABASE_SERVICE_ROLE_KEY` dentro del frontend.
- El README indica que `SUPABASE_SERVICE_ROLE_KEY` debe vivir solo como secreto de Edge Functions.

Tablas/RPC usados por la app:

- `profiles`
- `plans`
- `memberships`
- `class_schedule`
- `reservations`
- `personal_records`
- `wod`
- `community_posts`
- `app_settings`
- `notifications`
- RPC: `get_my_profile`, `get_my_reservations`, `get_active_membership`, `membership_remaining_tokens`, `available_spots`, `reserve_class`, `cancel_reservation`, `admin_reserve_for_student`, `get_public_pr_ranking`, `birthdays_this_month`, `upcoming_birthdays`, `admin_*`, `coach_*`.

### Estado global

No se detecta Redux, Zustand ni Context API global.

El estado principal esta en React con `useState`, `useEffect` y props:

- `src/App.jsx`: `currentUser`, `appContent`, `pendingReservation`, `isLoading`.
- Cada pagina maneja su propio estado local.

Riesgo:

- Al no existir store global ni invalidacion centralizada de datos, cada vista refresca por su cuenta. Esto esta bien para una app pequena, pero puede generar datos desactualizados entre pantallas si una accion admin cambia informacion y otra vista conserva estado anterior.

## Persistencia y Datos Locales

### localStorage

No se detecto uso directo de `localStorage` en el codigo fuente de la app.

Persistencia indirecta:

- Supabase Auth probablemente guarda la sesion en storage del navegador por defecto.

Riesgo:

- Medio. Es comportamiento normal de Supabase, pero conviene documentarlo y configurarlo explicitamente para evitar ambiguedad.

### sessionStorage

No se detecto uso de `sessionStorage`.

### IndexedDB

No se detecto uso directo de IndexedDB.

### Cache API / Service Worker

Uso detectado en:

- `public/sw.js`
- `src/components/AppShell.jsx`

`AppShell` permite borrar service workers y caches manualmente con el boton `Actualizar app`.

### Datos mock/locales

Archivo principal:

- `src/data/mockData.js`

Datos locales detectados:

- Estadisticas home: `todayStats`.
- Horarios fallback: `schedule`, `weeklySchedule`.
- Reservas fallback: `reservations`.
- WOD fallback: `wod`.
- Planes fallback: `plans`.
- Datos de transferencia: `transferInfo`.
- Comunidad fallback: `communityPosts`, `communityEvents`, `communityRanking`, `communityBirthdays`.
- Perfil mock: `profile`.

Tambien hay fallback administrativo en:

- `src/utils/adminContent.js`

Problema:

- Los datos mock se usan como respaldo cuando Supabase no esta configurado, falla o devuelve vacio.
- Esto evita pantallas vacias, pero puede ocultar problemas reales de Supabase y mostrar datos que no corresponden a la operacion real.

Datos que deberian persistirse o administrarse desde Supabase:

- `transferInfo`, porque es informacion operativa de pago/transferencia.
- `todayStats`, si se muestran como datos reales del box.
- Textos comerciales y de home, aunque parte ya esta en `app_settings`.
- URLs de pago de planes, porque `mapPlans()` actualmente asigna `paymentUrl: '#'` cuando los planes vienen desde Supabase.
- Frases y contenidos fallback de comunidad, si se espera que sean reales.

## PWA y Service Worker

### Archivos PWA

- `public/manifest.webmanifest`
- `public/sw.js`
- `public/icons/*`
- `src/components/PwaUpdateBanner.jsx`
- `src/components/AppShell.jsx`

### Manifest

El manifest esta bien estructurado:

- `display: standalone`
- `orientation: portrait-primary`
- `lang: es-CL`
- Iconos `192`, `512` y `maskable`.
- Shortcuts a reservas y WOD.

### Problema critico: cache demasiado agresiva

Archivo: `public/sw.js`

El service worker actualmente cachea cualquier `GET` exitoso con status `200`:

```js
caches.match(event.request).then((cached) => {
  if (cached) return cached

  return fetch(event.request).then((response) => {
    if (!response || response.status !== 200) return response
    const copy = response.clone()
    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy))
    return response
  })
})
```

Impacto:

- Puede cachear respuestas dinamicas.
- Puede devolver datos antiguos despues de un deploy.
- Puede provocar que un alumno/admin vea informacion aparentemente desactualizada.
- Puede cachear respuestas privadas si pasan como `GET` y son cacheables por la logica actual.
- Puede ocultar cambios de Supabase o de contenido publicado.
- Puede explicar perdida aparente de datos o carga de versiones antiguas en PWA.

Recomendacion segura:

- Cambiar estrategia a network-first para navegacion.
- Cache-first solo para assets estaticos versionados: JS, CSS, imagenes, iconos, manifest.
- No cachear URLs de Supabase, endpoints con Authorization, respuestas de API, ni requests con query dinamica.
- Agregar filtro por origen y tipo de recurso.
- Versionar `CACHE_NAME` de forma ligada al build/version real.

### Actualizaciones PWA

`PwaUpdateBanner.jsx` revisa actualizaciones cada 60 segundos y permite `SKIP_WAITING`.

Correcto:

- Hay banner de actualizacion.
- Hay boton manual para limpiar caches.

Riesgo:

- Si el cache guarda respuestas dinamicas, el boton de actualizar ayuda, pero no resuelve el origen del problema.

## Roles y Permisos

### Usuario no autenticado

Puede acceder a paginas publicas:

- Home.
- WOD.
- Planes.
- Comunidad.
- Ranking.
- Login/registro.

Acciones como reservar, perfil y PR requieren iniciar sesion desde la propia pantalla.

### Alumno

Puede:

- Ver perfil.
- Ver plan/membresia.
- Reservar clases si tiene membresia activa/pagada.
- Cancelar reservas propias.
- Crear, editar y eliminar PR personales.
- Ver ranking/comunidad.

### Coach

Puede entrar a `/coach` si `currentUser.role` es `coach` o `admin`.

Puede:

- Ver clases del dia.
- Ver reservas.
- Marcar asistencia / no show.
- Cancelar reservas.
- Agregar alumno manualmente segun permisos.

### Admin

Puede entrar a `/admin` solo si el perfil en Supabase tiene `role = admin`.

La pagina vuelve a verificar usuario actual con `getCurrentSupabaseUser()` antes de abrir panel.

Puede:

- Gestionar alumnos.
- Crear alumnos por Edge Function.
- Gestionar planes.
- Activar/editar/renovar/extender membresias.
- Ajustar tokens.
- Gestionar reservas manuales.
- Editar WOD.
- Editar horarios.
- Editar comunidad.
- Editar textos globales.
- Simular pagos por Edge Function.

Observacion:

- La proteccion de rutas es principalmente a nivel componente, no hay guard centralizado de rutas.
- Esto no expone datos por si solo si RLS/RPC estan bien, pero conviene centralizar guards para reducir errores futuros.

## Sistemas Funcionales Revisados

### Reservas

Archivos:

- `src/pages/Reservations.jsx`
- `src/utils/supabaseReservations.js`

Persistencia:

- Supabase `class_schedule`, `reservations`, `memberships` y RPC.

Hallazgos:

- Reserva validada con membresia activa y tokens.
- Cupos calculados con RPC `available_spots`.
- Cancelacion por RPC `cancel_reservation`.
- Riesgo medio: muchas llamadas `available_spots` por cada clase cargada; puede crecer si hay muchos horarios.

### WOD

Archivos:

- `src/pages/Wod.jsx`
- `src/utils/sharedContent.js`
- `src/utils/communityFeed.js`

Persistencia:

- Supabase `wod`.

Hallazgos:

- Carga el ultimo WOD en contenido compartido.
- Existe RPC para WOD publico del dia en community feed.
- Fallback local si no hay datos.

### Perfiles

Archivos:

- `src/pages/Profile.jsx`
- `src/utils/profileData.js`

Persistencia:

- Supabase `profiles`, `memberships`, `reservations`, `personal_records`.

Hallazgos:

- El alumno solo edita nombre, telefono, nacimiento y nivel.
- Email, rol y estado quedan protegidos.

### PR personales

Archivos:

- `src/pages/PersonalRecords.jsx`
- `src/utils/personalRecords.js`
- `src/data/movements.js`

Persistencia:

- Supabase `personal_records`.

Hallazgos:

- CRUD completo.
- Validacion de movimiento contra lista local.
- Riesgo bajo/medio: la lista de movimientos esta local; si el box quiere editarla sin deploy, conviene moverla a Supabase.

### Ranking

Archivos:

- `src/pages/Ranking.jsx`
- `src/utils/ranking.js`

Persistencia:

- Supabase RPC `get_public_pr_ranking`.

Hallazgos:

- Ranking publico interno por movimiento y nivel.
- Muestra nombre del alumno; revisar consentimiento/comunicacion interna si aplica.

### Comunidad / Noticias / Eventos

Archivos:

- `src/pages/Community.jsx`
- `src/utils/communityFeed.js`
- `src/utils/birthdays.js`

Persistencia:

- Supabase `community_posts`, `profiles`, `reservations`, `personal_records`, RPC de cumpleanos/ranking.

Hallazgos:

- Usa `Promise.allSettled`, por lo que una seccion puede fallar sin romper toda la pagina.
- Correcto para resiliencia.

### Planes

Archivos:

- `src/pages/Plans.jsx`
- `src/utils/sharedContent.js`
- `src/data/mockData.js`

Persistencia:

- Planes vienen desde Supabase si esta disponible.
- Datos bancarios vienen desde `mockData.js`.

Problema:

- Cuando planes vienen desde Supabase, `paymentUrl` se mapea como `'#'`, por lo que el boton `Pagar ahora` puede no servir para planes reales.

### Admin

Archivo:

- `src/pages/Admin.jsx`

Persistencia:

- Supabase y Edge Functions.

Hallazgos:

- Panel robusto y amplio.
- Valida rol admin antes de cargar.
- Usa RPCs admin para separar logica sensible.
- Riesgo UX: archivo muy grande y con muchas responsabilidades; dificil de mantener y testear.

### Coach

Archivos:

- `src/pages/Coach.jsx`
- `src/utils/coachData.js`

Persistencia:

- Supabase RPCs coach/admin.

Hallazgos:

- Acceso limitado a admin/coach.
- Puede operar asistencia sin entrar al admin completo.

## Seguridad

### Correcto

- No se detecta service role key en frontend.
- Edge Function `create-student` valida token de usuario, perfil admin y estado activo.
- Edge Function `payment-webhook` exige secreto para pagos reales y sesion admin para simulaciones.
- Acciones sensibles se apoyan en RPC/Edge Functions.

### Riesgos

#### Alto: CORS abierto en Edge Functions

Archivos:

- `supabase/functions/create-student/index.ts`
- `supabase/functions/payment-webhook/index.ts`

Ambas funciones usan:

```ts
'Access-Control-Allow-Origin': '*'
```

Impacto:

- No permite por si solo saltar autenticacion, pero aumenta superficie de abuso desde otros origenes.

Recomendacion:

- Restringir origenes a dominios permitidos cuando el despliegue este estable.

#### Medio: sesiones persistidas implicitamente

Supabase Auth persiste sesion en storage del navegador por defecto.

Recomendacion:

- Configurar explicitamente el cliente Supabase con politica de persistencia documentada.

#### Medio: datos operativos hardcodeados

`transferInfo` esta en `src/data/mockData.js`.

Recomendacion:

- Mover a Supabase `app_settings` o tabla de configuracion de pagos.

## Diseno, UX y Accesibilidad

### Fortalezas

- Mobile-first con bottom navigation.
- Botones grandes, tactiles y consistentes.
- Uso frecuente de labels en formularios.
- Estados de carga y mensajes de error presentes.
- `MotionConfig reducedMotion="user"` respeta preferencia de reduccion de movimiento.
- `aria-label` en navegacion inferior.

### Riesgos

#### Medio: heading duplicado/jerarquia

`AppShell` renderiza un `h1` global con el titulo de pagina y muchas paginas usan `h2` como titulo principal. Esto puede ser aceptable, pero conviene revisar SEO/accesibilidad si la app necesita indexacion publica por pagina.

#### Medio: panel admin muy denso

`src/pages/Admin.jsx` concentra demasiadas funciones en un archivo muy grande. Riesgo de mantenimiento, errores visuales y dificultad de test.

#### Bajo/medio: contraste variable en textos secundarios

La app usa bastante `text-white/45`, `text-white/50`, `text-white/55`, `text-white/60`. En fondos oscuros algunos textos pueden quedar bajos para usuarios con vision reducida.

#### Bajo: iconos como letras

Algunos iconos de navegacion son letras (`A`, `C`, etc.) o texto corto. Funciona, pero se puede mejorar con iconos semanticos y `aria-hidden` cuando corresponda.

## Manejo de Errores y Carga

### Fortalezas

- Muchos modulos retornan `{ ok, message }`.
- Pantallas muestran mensajes de carga.
- Comunidad usa carga parcial con `Promise.allSettled`.

### Riesgos

- Algunos errores se reducen a mensajes genericos, lo que dificulta diagnostico.
- `PwaUpdateBanner` silencia errores de registro/update con `.catch(() => {})`.
- `loadSharedContent()` vuelve a contenido default si una consulta falla, lo que puede ocultar errores operativos.

## Problemas Criticos

### CRITICO 1: Service worker cachea respuestas dinamicas

Archivo: `public/sw.js`  
Impacto: versiones antiguas, datos desactualizados, posible cache de respuestas privadas, conflictos PWA.  
Estado: detectado, no corregido en esta fase.  
Accion recomendada: reemplazar por estrategia cache-first solo para assets estaticos y network-first/no-store para datos dinamicos.

## Problemas de Persistencia

### ALTO: datos de transferencia hardcodeados

Archivo: `src/data/mockData.js` y `src/pages/Plans.jsx`.  
Impacto: cambios de banco/cuenta requieren deploy y pueden quedar desalineados.  
Accion: mover a Supabase `app_settings` o tabla `payment_settings`.

### ALTO: URLs de pago reales no persistidas en planes Supabase

Archivo: `src/utils/sharedContent.js`.  
Impacto: si los planes vienen de Supabase, `paymentUrl` queda como `'#'`.  
Accion: agregar columna `payment_url` en `plans` o manejar pago 100% via WhatsApp/Edge Function.

### MEDIO: movimientos PR definidos localmente

Archivo: `src/data/movements.js`.  
Impacto: cambios de catalogo requieren deploy.  
Accion: mover a tabla `pr_movements` si se requiere edicion admin.

### MEDIO: fallback local puede ocultar fallas

Archivos: `src/data/mockData.js`, `src/utils/adminContent.js`, `src/utils/sharedContent.js`.  
Impacto: usuarios podrian ver datos default en lugar de datos reales si Supabase falla.  
Accion: diferenciar visualmente estado fallback o registrar error persistente para admin.

## Problemas PWA

### CRITICO: cache dinamico inseguro

Ya descrito arriba.

### MEDIO: version de cache manual

Archivo: `public/sw.js`.  
`CACHE_NAME = 'kupan-v11'` esta desacoplado de `package.json` y del texto visible `KUPAN App v1.0.8`.

Accion:

- Automatizar version de cache por build o actualizarla con cada release.

### MEDIO: boton manual borra todas las caches

Archivo: `src/components/AppShell.jsx`.  
Es util para soporte, pero borra todas las caches de la app. Mantener por ahora, pero idealmente resolver causa raiz en SW.

## Problemas de Seguridad

### ALTO: CORS abierto en Edge Functions

Estado: detectado.  
Accion: restringir origenes luego de confirmar dominios finales.

### MEDIO: ruta admin protegida dentro del componente

Estado: detectado.  
Accion: crear componente `ProtectedRoute` o guard centralizado en etapa posterior. No reemplaza RLS/RPC.

### MEDIO: ranking publico expone nombres

Estado: detectado.  
Accion: confirmar que es esperado por la comunidad y considerar alias/opt-in si se necesita privacidad.

## Problemas de Diseno y Accesibilidad

### MEDIO: contraste de textos secundarios

Accion: revisar tokens `text-white/45` a `text-white/60` en textos criticos.

### MEDIO: admin monolitico

Accion: separar por modulos en una fase futura: alumnos, membresias, reservas, WOD, horarios, comunidad, textos.

### BAJO: letras usadas como iconos

Accion: incorporar libreria de iconos liviana si se requiere mas claridad.

## Archivos Involucrados

### Arquitectura y rutas

- `src/main.jsx`
- `src/App.jsx`
- `src/data/pages.js`

### Supabase / auth / datos

- `src/lib/supabase.js`
- `src/utils/auth.js`
- `src/utils/sharedContent.js`
- `src/utils/supabaseReservations.js`
- `src/utils/profileData.js`
- `src/utils/personalRecords.js`
- `src/utils/ranking.js`
- `src/utils/communityFeed.js`
- `src/utils/coachData.js`
- `src/utils/notifications.js`
- `src/utils/birthdays.js`
- `src/utils/adminContent.js`

### Paginas

- `src/pages/Home.jsx`
- `src/pages/Reservations.jsx`
- `src/pages/Wod.jsx`
- `src/pages/Plans.jsx`
- `src/pages/Community.jsx`
- `src/pages/Profile.jsx`
- `src/pages/PersonalRecords.jsx`
- `src/pages/Ranking.jsx`
- `src/pages/Auth.jsx`
- `src/pages/Admin.jsx`
- `src/pages/Coach.jsx`

### PWA

- `public/sw.js`
- `public/manifest.webmanifest`
- `src/components/PwaUpdateBanner.jsx`
- `src/components/AppShell.jsx`

### Estilos

- `src/styles.css`
- `tailwind.config.js`
- `src/assets/brand/colors/palette.js`

### Supabase Edge Functions y SQL

- `supabase/functions/create-student/index.ts`
- `supabase/functions/payment-webhook/index.ts`
- `supabase/sql/*.sql`

## Riesgos Antes de Modificar

1. Cambiar el service worker puede afectar instalacion PWA si no se prueba en Chrome Android/iOS.
2. Mover datos hardcodeados a Supabase requiere migracion y fallback temporal.
3. Cambiar rutas o guards puede bloquear admins si el perfil/rol no esta correctamente sincronizado.
4. Separar el admin en componentes es deseable, pero no debe hacerse en la misma fase que cambios de logica.
5. Ajustar cache debe coordinarse con deploy para que los usuarios reciban la nueva version.

## Plan de Correccion por Etapas

### Etapa 1: Estabilizacion PWA y datos dinamicos

Objetivo: evitar versiones antiguas y datos desactualizados.

Acciones:

- Reescribir `public/sw.js` para no cachear Supabase ni respuestas dinamicas.
- Mantener cache solo para shell/assets estaticos.
- Versionar cache por release.
- Mantener `PwaUpdateBanner` y boton de actualizacion.
- Probar instalacion PWA, actualizacion y navegacion offline basica.

### Etapa 2: Persistencia operativa en Supabase

Objetivo: que todo dato operativo editable viva en base de datos.

Acciones:

- Mover `transferInfo` a Supabase.
- Agregar `payment_url` a `plans` si se mantendra boton `Pagar ahora`.
- Definir si `todayStats` debe ser real o decorativo.
- Revisar fallback para que no oculte fallas criticas.

### Etapa 3: Seguridad y permisos

Objetivo: reducir superficie de error.

Acciones:

- Restringir CORS de Edge Functions a dominios permitidos.
- Crear `ProtectedRoute` para admin/coach/alumno.
- Confirmar RLS de tablas principales con scripts SQL.
- Revisar si ranking publico requiere opt-in o alias.

### Etapa 4: Mantenibilidad admin

Objetivo: bajar riesgo de cambios futuros.

Acciones:

- Separar `Admin.jsx` por modulos.
- Mantener contratos de datos actuales.
- Agregar pruebas de smoke para roles y carga de panel.

### Etapa 5: Accesibilidad y UX movil

Objetivo: mejorar lectura y operacion diaria.

Acciones:

- Revisar contraste de textos secundarios.
- Revisar jerarquia de headings.
- Mejorar iconografia de bottom nav si se requiere.
- Test tactil en 390px, 430px, tablet y desktop.

## Validaciones Recomendadas Antes de Cambios Funcionales

- Login alumno.
- Registro alumno.
- Reserva con plan activo.
- Reserva sin plan activo.
- Cancelacion de reserva.
- Crear PR.
- Editar PR.
- Ranking publico.
- Comunidad.
- Login admin.
- Crear alumno desde admin.
- Activar membresia.
- Ajustar tokens.
- Modo coach.
- Marcar asistencia.
- Instalar PWA.
- Actualizar PWA despues de deploy.

## Estado Final de Esta Auditoria

- No se modifico logica funcional.
- Se creo esta auditoria como documentacion.
- Se creo una rama de trabajo para aislar la revision.
- Queda pendiente ejecutar build, linter y pruebas disponibles luego de guardar el informe.

## Verificaciones Ejecutadas

### Linter

Comando ejecutado:

```bash
npm run lint
```

Resultado:

- Estado: aprobado.
- ESLint termino sin errores.

### Build de produccion

Comando ejecutado:

```bash
npm run build
```

Resultado:

- Estado: aprobado.
- Vite compilo correctamente.
- Modulos transformados: 518.
- Tiempo de build informado: 1.91s.

Advertencia detectada:

- `dist/assets/index-Ctd2YAGR.js` queda en 603.17 kB minificado y 181.17 kB gzip.
- Vite advierte que algunos chunks superan 500 kB.

Impacto:

- No bloquea el deploy.
- Puede afectar carga inicial, especialmente movil.

Recomendacion:

- En etapa posterior, separar manualmente vendors pesados como React/Supabase/Framer Motion o revisar carga de animaciones si PageSpeed movil lo exige.

### TypeScript check

Resultado:

- No se ejecuto TypeScript check porque no existe `tsconfig` ni script `typecheck` en `package.json`.
- La app principal esta en JS/JSX.
- Solo hay TypeScript en Edge Functions de Supabase.

Recomendacion:

- Si se quiere validacion formal de Edge Functions, agregar flujo separado con tooling de Deno/Supabase.

### Pruebas automatizadas

Resultado:

- No se ejecutaron pruebas porque `package.json` no contiene script `test` y no se detectaron archivos `*.test.*`, `*.spec.*` ni carpeta `__tests__`.

Recomendacion:

- Agregar smoke tests minimos para login, reservas, perfil, PR y admin/coach antes de refactors grandes.

## Estado Git Despues de la Auditoria

Rama actual:

```text
auditoria/kupan-tecnica-2026-06-19
```

Archivo nuevo creado por esta auditoria:

- `AUDITORIA_TECNICA_KUPAN.md`

Cambios previos existentes antes de la auditoria y no modificados deliberadamente:

- `package-lock.json`
- `package.json`
- `public/sw.js`
- `src/assets/brand/colors/palette.js`
- `src/components/AppShell.jsx`
- `src/components/PwaUpdateBanner.jsx`
- `tailwind.config.js`
