# Diagnostico PR KUPAN Box App

Fecha: 2026-06-19  
Rama: `auditoria/kupan-tecnica-2026-06-19`  
Repositorio: `/Users/arismor/Desktop/kupan app`

## Problema Reportado

Los alumnos registran sus PR en su perfil, pero despues de actualizar o desplegar una nueva version de la aplicacion, los PR parecen desaparecer.

## Resumen Ejecutivo

La implementacion actual de PR no usa `localStorage`, `sessionStorage` ni `IndexedDB` para guardar las marcas. El flujo principal guarda y lee los PR desde Supabase en la tabla `personal_records`, vinculando cada registro al alumno mediante `profile_id`.

La causa mas probable no es que el despliegue borre datos locales, sino una de estas situaciones:

1. **Service Worker/PWA cacheando respuestas dinamicas o versiones antiguas**. El archivo `public/sw.js` cachea cualquier `GET` con status `200`, lo que puede dejar a la PWA usando codigo viejo o respuestas obsoletas despues de un deploy.
2. **El alumno queda autenticado con otro usuario Supabase (`auth.uid()`)**. Los PR se filtran por `profile_id = currentUser.id`; si el usuario inicia sesion con otra cuenta o se recreo el usuario Auth, la consulta devuelve vacio aunque existan PR antiguos asociados al UUID anterior.
3. **Tabla/politicas reales de Supabase no estan completamente versionadas en el repo**. El repositorio contiene politicas y consultas sobre `personal_records`, pero no se encontro un script que cree la tabla base. Si produccion/staging no tienen el mismo esquema/RLS, la lectura o escritura puede comportarse distinto.
4. **El estado React se reemplaza con lista vacia cuando Supabase devuelve cero filas**. En `PersonalRecords.jsx`, si `loadPersonalRecords()` retorna `ok: true` con `records: []`, se ejecuta `setRecords(result.records)`. Esto no borra la base de datos, pero hace que la interfaz muestre cero PR.

## Archivos Relacionados

### Flujo principal PR

- `src/pages/PersonalRecords.jsx`
- `src/utils/personalRecords.js`
- `src/data/movements.js`

### Perfil del alumno y ultimos PR

- `src/pages/Profile.jsx`
- `src/utils/profileData.js`

### Ranking y comunidad

- `src/pages/Ranking.jsx`
- `src/utils/ranking.js`
- `src/pages/Community.jsx`
- `src/utils/communityFeed.js`
- `supabase/sql/pr-ranking.sql`
- `supabase/sql/community-public-feed.sql`

### Auth / identificacion de alumno

- `src/lib/supabase.js`
- `src/utils/auth.js`
- `supabase/sql/get-my-profile.sql`
- `supabase/sql/sync-auth-users-profiles.sql`
- `supabase/sql/admin-rls-fix.sql`

### PWA / cache

- `public/sw.js`
- `src/components/PwaUpdateBanner.jsx`
- `src/components/AppShell.jsx`

## Referencias de Almacenamiento Detectadas

Busqueda realizada sobre `src`, `public` y `supabase` para:

- `localStorage`
- `sessionStorage`
- `indexedDB`
- `JSON.parse`
- `JSON.stringify`
- `removeItem`
- `clear`
- claves relacionadas con PR
- datos mock
- inicializadores

Resultado:

- No se detecto uso directo de `localStorage` para PR.
- No se detecto uso directo de `sessionStorage` para PR.
- No se detecto uso directo de IndexedDB para PR.
- No se detectaron claves locales tipo `prs`, `personal_records`, `records`, `kupan-pr`.
- No hay rutina local que haga `removeItem` o `clear` de PR.
- Supabase Auth puede persistir la sesion internamente en storage del navegador porque el cliente se crea sin configuracion explicita de storage.
- `AppShell.forceAppUpdate()` borra service workers y caches, pero no borra `localStorage` ni datos de Supabase.

## Donde Se Guardan Actualmente Los PR

Archivo: `src/utils/personalRecords.js`

### Lectura

```js
supabase
  .from('personal_records')
  .select('id, profile_id, movement, value, unit, record_date, notes, created_at, updated_at')
  .eq('profile_id', profileId)
  .order('record_date', { ascending: false })
```

### Creacion

```js
supabase
  .from('personal_records')
  .insert({ ...record, profile_id: profileId })
  .select('id, profile_id, movement, value, unit, record_date, notes, created_at, updated_at')
  .single()
```

### Edicion

```js
supabase
  .from('personal_records')
  .update(record)
  .eq('id', recordId)
```

### Eliminacion

```js
supabase
  .from('personal_records')
  .delete()
  .eq('id', recordId)
```

Conclusion:

- El destino actual de persistencia es Supabase, no el navegador.
- Si se guardan correctamente, un despliegue frontend no deberia borrarlos.

## Como Se Identifica Al Alumno

Archivo: `src/App.jsx` + `src/utils/auth.js`

1. La app obtiene el usuario con `supabase.auth.getUser()`.
2. Luego obtiene el perfil usando RPC `get_my_profile()` o fallback a `profiles`.
3. `mapSupabaseUser()` genera `currentUser`.
4. `currentUser.id` se usa como `profileId` en PR.

En PR:

```js
const result = await loadPersonalRecords(currentUser.id)
```

RLS esperado:

```sql
profile_id = auth.uid()
```

Conclusion:

- El vinculo esperado es 1:1 entre `profiles.id`, `auth.users.id` y `personal_records.profile_id`.
- Si se crea un nuevo usuario Auth con el mismo correo, pero distinto UUID, los PR anteriores quedan asociados al UUID antiguo.

## Que Ocurre Al Cerrar Sesion

Archivo: `src/utils/auth.js`

```js
await supabase.auth.signOut()
```

Efecto:

- Se borra la sesion Supabase del navegador.
- No se borran PR en Supabase.
- No se ejecuta limpieza local de PR.

Al volver a iniciar sesion:

- Si el usuario es el mismo UUID, los PR deberian volver a aparecer.
- Si el usuario Auth es otro UUID, la consulta devuelve vacio.

## Que Ocurre Al Actualizar La App

Hay dos tipos de actualizacion:

### Recargar pagina / nuevo deploy

La app vuelve a montar `PersonalRecords.jsx` y ejecuta:

```js
loadPersonalRecords(currentUser.id)
```

Si Supabase responde con datos, aparecen. Si responde con `[]`, la pantalla queda vacia.

### Boton manual `Actualizar app`

Archivo: `src/components/AppShell.jsx`

```js
const registrations = await navigator.serviceWorker.getRegistrations()
await Promise.all(registrations.map((registration) => registration.unregister()))

const cacheKeys = await window.caches.keys()
await Promise.all(cacheKeys.map((key) => window.caches.delete(key)))

window.location.reload()
```

Efecto:

- Borra caches y service workers.
- No borra Supabase ni storage de auth explicitamente.
- No deberia borrar PR reales.

## Que Ocurre Al Cambiar De Dispositivo

- Los PR deberian aparecer si el alumno inicia sesion con la misma cuenta Supabase.
- Si no aparecen en otro dispositivo, eso indica problema de persistencia real, RLS, cuenta distinta o datos guardados en otra tabla/proyecto.
- Si aparecen en un dispositivo pero no en otro, puede ser cache/PWA/sesion.

## Que Ocurre Al Instalar o Desinstalar La PWA

- Instalar PWA no deberia mover ni borrar PR.
- Desinstalar PWA puede borrar caches y storage local del navegador/app instalada.
- Como los PR no se guardan localmente, deberian seguir en Supabase.
- Si desaparecen solo de la PWA instalada, pero aparecen en Chrome normal, el problema apunta al service worker/cache/sesion de esa instalacion.

## Que Ocurre Cuando Cambia La Version Del Service Worker

Archivo: `public/sw.js`

`CACHE_NAME = 'kupan-v11'`.

El service worker elimina caches antiguas cuando cambia `CACHE_NAME`, pero tambien cachea cualquier `GET` 200.

Riesgo:

- Puede servir una app vieja despues del deploy.
- Puede servir respuestas antiguas si alguna request dinamica fue cacheada.
- Puede crear la percepcion de que los datos desaparecen porque se esta ejecutando un bundle viejo o una sesion vieja.

## Rutinas Que Pueden Sobrescribir Datos

### React state

Archivo: `src/pages/PersonalRecords.jsx`

```js
setRecords(result.records)
```

Esto reemplaza el estado visual con lo que devuelve Supabase. Si Supabase devuelve `[]`, se ven cero PR.

Importante:

- Esto no borra la tabla.
- Solo reemplaza el estado en memoria.

### Update PR

Archivo: `src/utils/personalRecords.js`

```js
.update(record).eq('id', recordId)
```

Riesgo:

- La actualizacion no filtra explicitamente por `profile_id` en el cliente.
- La seguridad depende de RLS (`profile_id = auth.uid()`), lo cual esta bien si RLS esta aplicado.

### Delete PR

Archivo: `src/utils/personalRecords.js`

```js
.delete().eq('id', recordId)
```

Riesgo:

- Igual que update: depende de RLS para impedir borrar registros ajenos.

## Uso De Datos Mock

No se encontro mock especifico de PR personales persistentes.

Si existen datos mock relacionados:

- `src/data/mockData.js` incluye `profile.prs`, pero no se usa como persistencia real del modulo `PersonalRecords`.
- `src/data/movements.js` define la lista de movimientos permitidos.
- `src/utils/communityFeed.js` y ranking leen `personal_records` desde Supabase.

Conclusion:

- El sistema de PR no parece caer a mock local al guardar.
- El problema no apunta a JSON local como fuente primaria.

## Tabla Supabase Para PR

La app espera una tabla llamada:

```text
public.personal_records
```

Columnas usadas por el frontend:

- `id`
- `profile_id`
- `movement`
- `value`
- `unit`
- `record_date`
- `notes`
- `created_at`
- `updated_at`

Hallazgo critico de versionado:

- En los SQL del repo no se encontro un `create table public.personal_records`.
- Si la tabla existe en Supabase, fue creada fuera de los scripts versionados o en una migracion no incluida.
- Esto aumenta el riesgo de diferencias entre entornos y despliegues.

## RLS Detectado Para PR

Archivo: `supabase/sql/admin-rls-fix.sql`

```sql
alter table public.personal_records enable row level security;

create policy "PR read own or admin"
on public.personal_records
for select
to authenticated
using (profile_id = auth.uid() or public.is_admin());

create policy "PR manage own or admin"
on public.personal_records
for all
to authenticated
using (profile_id = auth.uid() or public.is_admin())
with check (profile_id = auth.uid() or public.is_admin());
```

Conclusion:

- La politica esperada es correcta.
- Los alumnos solo ven y administran PR cuyo `profile_id` coincide con `auth.uid()`.
- Admin puede ver/gestionar todos si `public.is_admin()` funciona.

Riesgo:

- Si estas policies no estan aplicadas en Supabase real, el comportamiento puede variar.
- Si `profile_id` no coincide con el usuario Auth actual, el alumno vera cero PR.

## Causa Exacta o Causas Probables

### Causa probable 1: Service Worker cachea contenido dinamico

Probabilidad: Alta  
Impacto: Alto

El SW cachea cualquier `GET` exitoso. Esto puede mantener versiones antiguas de la app y provocar lecturas inconsistentes despues de deploy.

Evidencia:

- `public/sw.js` cachea `event.request` para todo GET 200.
- La auditoria previa ya marco este punto como critico.

### Causa probable 2: Identidad Supabase distinta despues de login/reinstalacion

Probabilidad: Alta  
Impacto: Alto

Los PR se filtran por `profile_id = currentUser.id`. Si el alumno usa otra cuenta, se recreo el usuario en Supabase Auth, o se sincronizo un perfil nuevo con el mismo correo, los PR antiguos quedan asociados al UUID anterior.

Senal esperada:

- Los PR existen en tabla, pero con otro `profile_id`.
- El alumno actual tiene el mismo correo pero otro `id`.

### Causa probable 3: Tabla `personal_records` no versionada en repo

Probabilidad: Media  
Impacto: Alto

No hay script de creacion de tabla en el repo. Si se despliega otro entorno o se reconstruye Supabase, se puede perder o no crear correctamente la estructura.

### Causa probable 4: Consulta devuelve lista vacia y React reemplaza estado

Probabilidad: Media  
Impacto: Medio

`setRecords(result.records)` reemplaza el estado con `[]`. Esto no borra datos, pero visualmente parece perdida.

### Causa poco probable: PR guardados en localStorage y borrados por deploy

Probabilidad: Baja

No se encontro almacenamiento local de PR.

## Riesgo De Perdida De Datos

### Riesgo real de borrado por frontend

Bajo.

El frontend solo borra PR cuando el usuario toca `Eliminar`, llamando a:

```js
.delete().eq('id', recordId)
```

No hay rutina automatica que elimine PR al deploy.

### Riesgo de perdida aparente

Alto.

Puede ocurrir por:

- Cache PWA.
- Usuario Auth distinto.
- RLS no coincidente.
- Tabla/proyecto Supabase distinto.
- Consulta retornando `[]`.

### Riesgo de perdida en migraciones

Medio/alto.

Como no hay migracion versionada para crear `personal_records`, reconstruir el backend o cambiar de proyecto Supabase puede dejar los datos fuera.

## Verificaciones Recomendadas En Supabase

Ejecutar en Supabase SQL Editor, sin borrar nada:

### 1. Confirmar tabla y columnas

```sql
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'personal_records'
order by ordinal_position;
```

### 2. Confirmar cantidad de PR

```sql
select count(*) as total_pr
from public.personal_records;
```

### 3. Detectar PR por alumno/correo

```sql
select
  pr.id,
  pr.profile_id,
  p.email,
  p.full_name,
  pr.movement,
  pr.value,
  pr.unit,
  pr.record_date,
  pr.created_at
from public.personal_records pr
left join public.profiles p on p.id = pr.profile_id
order by pr.created_at desc
limit 100;
```

### 4. Buscar perfiles duplicados por email

```sql
select lower(email) as email, count(*) as perfiles
from public.profiles
group by lower(email)
having count(*) > 1
order by perfiles desc;
```

### 5. Verificar RLS y policies

```sql
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename = 'personal_records';

select policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'personal_records'
order by policyname;
```

## Propuesta De Tabla Supabase Versionada

Agregar una migracion SQL formal, si la tabla no esta versionada:

```sql
create table if not exists public.personal_records (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  movement text not null,
  value numeric not null check (value > 0),
  unit text not null check (unit in ('kg', 'reps', 'tiempo', 'metros', 'calorias')),
  record_date date not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists personal_records_profile_date_idx
on public.personal_records(profile_id, record_date desc);

create index if not exists personal_records_movement_value_idx
on public.personal_records(movement, unit, value);
```

## Propuesta De Seguridad RLS

```sql
alter table public.personal_records enable row level security;

create policy "PR read own or admin"
on public.personal_records
for select
to authenticated
using (profile_id = auth.uid() or public.is_admin());

create policy "PR insert own or admin"
on public.personal_records
for insert
to authenticated
with check (profile_id = auth.uid() or public.is_admin());

create policy "PR update own or admin"
on public.personal_records
for update
to authenticated
using (profile_id = auth.uid() or public.is_admin())
with check (profile_id = auth.uid() or public.is_admin());

create policy "PR delete own or admin"
on public.personal_records
for delete
to authenticated
using (profile_id = auth.uid() or public.is_admin());
```

Notas:

- Separar policies por accion mejora diagnostico.
- Mantener `profile_id = auth.uid()` asegura pertenencia del dato.

## Propuesta De Migracion / Compatibilidad Con Registros Antiguos

Si existen PR antiguos asociados a usuarios duplicados:

1. No borrar nada.
2. Identificar perfiles duplicados por email.
3. Definir perfil canonico: el UUID que actualmente usa Supabase Auth al login.
4. Reasignar PR del perfil antiguo al perfil canonico solo despues de validar manualmente.
5. Registrar respaldo antes de cualquier update.

SQL de diagnostico, no destructivo:

```sql
select
  p.email,
  p.id as profile_id,
  p.full_name,
  count(pr.id) as pr_count
from public.profiles p
left join public.personal_records pr on pr.profile_id = p.id
group by p.email, p.id, p.full_name
order by lower(p.email), pr_count desc;
```

Migracion segura propuesta, solo tras confirmacion:

```sql
-- Ejemplo: mover PR desde perfil antiguo a perfil actual.
-- No ejecutar sin reemplazar UUIDs y respaldo previo.
update public.personal_records
set profile_id = 'UUID_PERFIL_ACTUAL'
where profile_id = 'UUID_PERFIL_ANTIGUO';
```

## Logs De Desarrollo Seguros Recomendados

No se implementaron logs en esta fase porque el flujo se pudo diagnosticar por codigo.

Si se requiere verificar en navegador sin exponer datos personales, agregar temporalmente logs sanitizados solo en desarrollo:

```js
if (import.meta.env.DEV) {
  console.info('[KUPAN PR]', {
    hasUser: Boolean(currentUser?.id),
    userIdSuffix: currentUser?.id ? currentUser.id.slice(-6) : null,
    loadedCount: result.records?.length ?? 0,
  })
}
```

No loguear:

- Email.
- Nombre.
- Token.
- Notas de PR.
- Valores personales si no es necesario.

## Plan De Correccion Recomendado

### Fase 1: Validar datos reales

- Ejecutar queries de diagnostico en Supabase.
- Confirmar si los PR existen en `personal_records`.
- Confirmar si hay perfiles duplicados por email.
- Confirmar RLS aplicado.

### Fase 2: Corregir PWA/cache

- Modificar `public/sw.js` para no cachear requests a Supabase ni respuestas dinamicas.
- Cachear solo assets estaticos versionados.
- Forzar update limpio de PWA.

### Fase 3: Versionar tabla PR

- Agregar migracion SQL formal para `personal_records`.
- Agregar indices.
- Separar policies por accion.

### Fase 4: Mejorar robustez frontend

- Mostrar mensaje distinto cuando Supabase responde `[]` versus error.
- Agregar diagnostico interno admin para ver PR por alumno.
- Opcional: filtrar update/delete tambien por `profile_id` en el cliente para trazabilidad, manteniendo RLS como defensa real.

### Fase 5: Compatibilidad con PR antiguos

- Si hay duplicados, mapear PR antiguos al perfil activo.
- Mantener respaldo antes de cualquier reasignacion.

## Conclusion

La app esta disenada para guardar PR en Supabase, no en almacenamiento local. Un despliegue frontend no deberia eliminar esos datos.

La causa mas probable de la desaparicion reportada es una combinacion de PWA/cache agresivo y/o diferencia de identidad Supabase (`auth.uid`) entre el usuario que guardo los PR y el usuario que intenta verlos despues. La ausencia de una migracion versionada para crear `personal_records` aumenta el riesgo de inconsistencias entre entornos.
