# PWA Update Strategy - Kupan Box App

## Objetivo

Evitar que la PWA quede atrapada en versiones antiguas, mezcle archivos incompatibles o almacene respuestas privadas. La estrategia mantiene datos personales fuera del cache del Service Worker y permite actualizar la app con confirmacion del usuario.

## Diagnostico del Service Worker anterior

Archivo revisado: public/sw.js

Problemas detectados:

- Cache generico kupan-v11 para demasiadas respuestas GET.
- El runtime cache podia guardar respuestas dinamicas si retornaban 200.
- No existia exclusion explicita para Supabase Auth, Supabase REST ni datos privados.
- index.html podia quedar servido desde cache sin intentar red reciente.
- La limpieza de caches antiguas existia, pero bajo un unico nombre de cache.
- El flujo de actualizacion dependia de SKIP_WAITING, pero el aviso no diferenciaba estado offline.

Riesgo principal: la app podia mostrar archivos antiguos despues de un deploy o reutilizar respuestas no apropiadas en una sesion autenticada.

## Estrategia implementada

### 1. Versionado de caches

El Service Worker ahora usa caches separados:

- kupan-static-v12: assets estaticos seguros.
- kupan-html-v12: ultimo shell HTML valido para fallback.

Durante activate se eliminan solamente caches antiguas que comienzan con kupan-. No se elimina almacenamiento del usuario.

No se ejecuta:

- localStorage.clear()
- sessionStorage.clear()
- indexedDB.deleteDatabase()

### 2. Que se puede cachear

Se cachean solamente recursos apropiados:

- Manifest PWA.
- Logos e iconos.
- Fuentes.
- Imagenes estaticas del mismo origen.
- JavaScript y CSS versionados.
- Assets dentro de /assets/, /icons/ y /brand/.

### 3. Que no se cachea

El Service Worker evita cachear solicitudes privadas o sensibles:

- Supabase Auth.
- Supabase REST.
- Supabase Storage.
- Supabase Functions.
- URLs o headers con apikey.
- URLs o headers con authorization.
- personal_records.
- profiles.
- reservations.
- memberships.
- notifications.
- rutas administrativas.

Estas solicitudes se envian directo a red mediante fetch(request) y no pasan por Cache Storage.

### 4. Estrategia para navegacion e index.html

Para navegaciones se usa estrategia network-first:

1. Intenta cargar desde red con cache no-store.
2. Si la red responde correctamente, guarda una copia de /index.html como fallback.
3. Si no hay conexion, usa la copia guardada.
4. Si tampoco existe copia, responde con estado offline.

Esto permite que los deploys en Vercel sean visibles sin obligar al usuario a borrar cache manualmente.

### 5. Actualizacion de version

Archivo revisado: src/components/PwaUpdateBanner.jsx

Flujo implementado:

1. La app registra el Service Worker.
2. Revisa si hay registration.waiting.
3. Detecta updatefound.
4. Muestra aviso: Nueva version disponible.
5. El usuario decide cuando pulsar Actualizar ahora.
6. Se envia SKIP_WAITING al Service Worker nuevo.
7. Al detectar controllerchange, la app recarga una sola vez.

Se evita un bucle de recargas usando una bandera interna de control.

### 6. Estado offline

El banner tambien muestra:

Estas sin conexion. Algunas acciones se sincronizaran cuando vuelva internet.

El aviso no bloquea la app y no intenta forzar actualizacion sin red.

### 7. Boton manual de actualizacion

Archivo revisado: src/components/AppShell.jsx

El boton manual ahora elimina solamente caches propios de KUPAN, es decir kupan-*. No borra caches de otros origenes ni almacenamiento personal del usuario.

## Manifest PWA

Archivo revisado: public/manifest.webmanifest

Configuracion actual observada:

- name: KUPAN Box App.
- short_name: KUPAN.
- start_url: /.
- scope: /.
- display: standalone.
- theme_color: negro.
- background_color: negro.
- Iconos 192, 512 y maskable 512.
- Shortcuts internos para reservas, WOD y perfil.

No se modifico la identidad visual porque la configuracion es coherente con la app actual.

## Compatibilidad esperada

### Vercel

Los assets generados por Vite usan nombres versionados. El Service Worker cachea esos assets versionados y actualiza el shell por red, evitando mezcla persistente de versiones.

### Safari iOS

La estrategia evita depender de APIs no esenciales. El update prompt funciona cuando el navegador soporta Service Worker. El estado offline depende de navigator.onLine, que puede ser conservador en iOS, por eso se usa solo como aviso y no como bloqueo.

### PWA instalada

Cuando hay una nueva version, el usuario recibe aviso y decide cuando actualizar. La recarga ocurre una sola vez tras activar el Service Worker nuevo.

## Pruebas recomendadas

1. Instalar la PWA desde cero.
2. Abrir app, iniciar sesion y navegar por perfil, PR y reservas.
3. Publicar una nueva version en Vercel.
4. Verificar que aparece Nueva version disponible.
5. Pulsar Actualizar ahora.
6. Confirmar una sola recarga.
7. Confirmar que la sesion y los datos personales siguen disponibles.
8. Probar sin conexion y verificar aviso offline.
9. Volver a conectar y verificar que la app recupera datos desde Supabase.
10. Revisar DevTools > Application > Cache Storage: no debe haber respuestas de Supabase ni tablas privadas.

## Rollback

Para volver al comportamiento anterior:

1. Restaurar public/sw.js desde Git.
2. Restaurar src/components/PwaUpdateBanner.jsx desde Git.
3. Restaurar src/components/AppShell.jsx desde Git.
4. Ejecutar build.
5. Desplegar nuevamente en Vercel.

No hay migraciones de base de datos ni cambios destructivos asociados a esta correccion.

## Archivos modificados

- public/sw.js
- src/components/PwaUpdateBanner.jsx
- src/components/AppShell.jsx
- PWA_UPDATE_STRATEGY.md
