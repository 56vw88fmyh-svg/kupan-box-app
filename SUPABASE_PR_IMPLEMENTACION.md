# Implementacion Supabase PR KUPAN

Fecha: 2026-06-19  
Archivo SQL: `supabase/sql/personal-records-exercises-migration.sql`

## Objetivo

Crear una base persistente, segura y escalable para guardar records personales de alumnos en Supabase, sin borrar datos actuales ni reemplazar la implementacion existente de golpe.

## Tablas

### `public.exercises`

Catalogo editable de ejercicios/movimientos.

Campos principales:

- `id`: UUID primario.
- `name`: nombre visible del ejercicio.
- `normalized_name`: nombre normalizado para busqueda y matching.
- `category`: fuerza, cardio, benchmark, gymnastics, etc.
- `default_unit`: unidad recomendada.
- `record_type`: tipo de record esperado.
- `comparison_type`: criterio para comparar marcas.
- `is_active`: permite desactivar ejercicios sin borrar historico.
- `created_at`, `updated_at`.

Valores permitidos para `comparison_type`:

- `higher_is_better`
- `lower_is_better`
- `rounds_reps`
- `distance`
- `calories`
- `custom`

### `public.personal_records`

Tabla de PR por alumno.

Campos nuevos principales:

- `user_id`: usuario de Supabase Auth. Es la identidad propietaria del PR.
- `exercise_id`: referencia opcional al catalogo `exercises`.
- `exercise_name`: respaldo historico del nombre del ejercicio.
- `record_type`: tipo de record.
- `value`: valor numerico opcional.
- `value_text`: valor flexible opcional.
- `unit`: unidad visible.
- `rounds`, `reps`, `time_seconds`: campos especificos para resultados compuestos.
- `achieved_at`: fecha del PR.
- `notes`: notas opcionales.
- `source`: origen del dato (`app`, `legacy_app`, etc.).
- `created_at`, `updated_at`.

## Compatibilidad Con La Tabla Anterior

La app actual usa una estructura previa con campos como:

- `profile_id`
- `movement`
- `value`
- `unit`
- `record_date`
- `notes`

La migracion no borra esos campos. Si existen, hace backfill seguro:

- `user_id = profile_id`
- `exercise_name = movement`
- `achieved_at = record_date`
- `record_type` se infiere desde `unit`
- `source = legacy_app`

Esto permite mantener compatibilidad mientras se actualiza el frontend de forma gradual.

## Restricciones

La migracion agrega restricciones razonables:

- No permitir nombre de ejercicio vacio.
- No permitir tipo de record vacio.
- No permitir registros completamente vacios.
- `value`, `time_seconds`, `rounds` y `reps` no pueden ser negativos.
- `achieved_at` debe estar entre `1900-01-01` y manana.

Para tablas existentes, varias restricciones se agregan como `NOT VALID`. Esto evita romper datos historicos que pudieran estar incompletos, pero aplica reglas a nuevas escrituras o actualizaciones.

## Indices

La migracion crea indices para:

- `personal_records.user_id`
- `personal_records.exercise_id`
- `personal_records.achieved_at`
- `personal_records.user_id + exercise_id`
- busqueda por nombre normalizado de ejercicio
- `exercises.normalized_name`
- `exercises.is_active + normalized_name`

## Updated At

Se crea/reutiliza la funcion:

```sql
public.set_updated_at()
```

Y triggers:

- `set_exercises_updated_at`
- `set_personal_records_updated_at`

## Seguridad RLS

RLS queda habilitado en:

- `public.exercises`
- `public.personal_records`

### Alumno autenticado

Puede:

- Leer sus propios PR.
- Crear sus propios PR.
- Modificar sus propios PR.
- Eliminar sus propios PR.

La condicion es:

```sql
user_id = auth.uid()
```

### Administrador

La migracion no inventa roles.

Si existe la funcion segura actual del proyecto:

```sql
public.is_admin()
```

Entonces crea policies admin para:

- Leer todos los PR.
- Gestionar todos los PR.
- Gestionar ejercicios.
- Leer todos los ejercicios, incluidos inactivos.

Si `public.is_admin()` no existe, esas policies admin no se crean. En ese caso queda pendiente aplicar el sistema de roles existente antes de abrir acceso global.

### Ejercicios

Usuarios autenticados pueden leer ejercicios activos.

Solo admin, si existe `public.is_admin()`, puede crear, editar o desactivar ejercicios.

## Procedimiento Para Aplicar

1. Crear backup desde Supabase antes de ejecutar.
2. Abrir Supabase SQL Editor.
3. Pegar el contenido de:

```text
supabase/sql/personal-records-exercises-migration.sql
```

4. Ejecutar una sola vez.
5. Revisar que no existan errores.
6. Ejecutar las pruebas SQL recomendadas.
7. Recien despues actualizar el frontend para usar `user_id`, `exercise_id`, `exercise_name` y `achieved_at`.

## Pruebas SQL Recomendadas

### Confirmar columnas

```sql
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in ('exercises', 'personal_records')
order by table_name, ordinal_position;
```

### Confirmar RLS

```sql
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('exercises', 'personal_records');
```

### Confirmar policies

```sql
select tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('exercises', 'personal_records')
order by tablename, policyname;
```

### Confirmar backfill

```sql
select
  count(*) as total,
  count(user_id) as con_user_id,
  count(exercise_name) as con_exercise_name,
  count(achieved_at) as con_achieved_at
from public.personal_records;
```

### Detectar registros historicos incompletos

```sql
select id, user_id, exercise_name, record_type, value, value_text, rounds, reps, time_seconds, achieved_at
from public.personal_records
where user_id is null
   or exercise_name is null
   or achieved_at is null
   or (
    value is null
    and nullif(btrim(coalesce(value_text, '')), '') is null
    and rounds is null
    and reps is null
    and time_seconds is null
   )
limit 50;
```

### Confirmar ejercicios cargados

```sql
select category, count(*)
from public.exercises
where is_active = true
group by category
order by category;
```

## Procedimiento Para Revertir Sin Perder Datos

No usar `drop table`.

Rollback seguro recomendado:

1. No borrar tablas ni columnas.
2. Si hay problema de acceso, desactivar temporalmente policies nuevas especificas y conservar datos.
3. Mantener columnas antiguas (`profile_id`, `movement`, `record_date`) hasta que el frontend este migrado.
4. Para volver visualmente al comportamiento anterior, revertir solo el codigo frontend y dejar la migracion aplicada.

Rollback de policies nuevas, si fuera necesario:

```sql
drop policy if exists "Students read own PR" on public.personal_records;
drop policy if exists "Students insert own PR" on public.personal_records;
drop policy if exists "Students update own PR" on public.personal_records;
drop policy if exists "Students delete own PR" on public.personal_records;
drop policy if exists "Authenticated read active exercises" on public.exercises;
```

No ejecutar esto si ya se esta usando el nuevo frontend sin reemplazar por policies equivalentes.

## Siguiente Paso Recomendado

Despues de aplicar y validar la migracion:

1. Actualizar `src/utils/personalRecords.js` para escribir en los campos nuevos.
2. Mantener lectura compatible con campos antiguos durante una version.
3. Cambiar `src/data/movements.js` para leer ejercicios activos desde Supabase con fallback local.
4. Corregir el service worker para evitar cache de respuestas dinamicas de Supabase.
