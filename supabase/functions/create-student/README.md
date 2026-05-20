# Edge Function `create-student`

Esta funcion crea alumnos KUPAN de forma segura desde el panel admin.

El frontend nunca debe usar `SUPABASE_SERVICE_ROLE_KEY`. Esa llave vive solo como secreto dentro de Supabase.

## Que hace

- Recibe los datos del nuevo alumno.
- Verifica que quien llama tenga sesion valida.
- Verifica que el perfil del usuario tenga `role = 'admin'` y `status = 'active'`.
- Crea el usuario en Supabase Auth usando `service_role` en entorno seguro.
- Crea o actualiza su registro en `public.profiles`.
- Crea una `membership` activa si se envia `plan_id`.
- Devuelve email y contraseña temporal generada o ingresada.

## Variables necesarias

Supabase entrega automaticamente:

```bash
SUPABASE_URL
SUPABASE_ANON_KEY
```

Debes agregar manualmente:

```bash
SUPABASE_SERVICE_ROLE_KEY
```

Comando:

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=TU_SERVICE_ROLE_KEY
```

## Deploy

Desde la raiz del proyecto:

```bash
supabase login
supabase link --project-ref TU_PROJECT_REF
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=TU_SERVICE_ROLE_KEY
supabase functions deploy create-student
```

## Ejemplo de llamada desde React

```js
import { supabase } from './src/lib/supabase'

const { data, error } = await supabase.functions.invoke('create-student', {
  body: {
    full_name: 'Camila Rojas',
    email: 'camila@correo.cl',
    phone: '+56912345678',
    birth_date: '1994-08-21',
    level: 'Iniciado',
    status: 'active',
    temporary_password: '',
    internal_notes: 'Alumno creado desde panel admin',
    plan_id: 'UUID_DEL_PLAN',
    membership_start_date: '2026-05-20',
    membership_end_date: '2026-06-20',
  },
})

if (error || !data?.ok) {
  console.error(data?.message || 'No se pudo crear el alumno.')
} else {
  console.log('Email:', data.email)
  console.log('Clave temporal:', data.temporary_password)
}
```

## Respuesta exitosa

```json
{
  "ok": true,
  "profile_id": "uuid",
  "email": "camila@correo.cl",
  "phone": "+56912345678",
  "temporary_password": "Kupan-abc123def4!"
}
```

## Errores en espanol

La funcion responde con:

```json
{
  "ok": false,
  "message": "Mensaje claro para mostrar en la app."
}
```

Ejemplos:

- `Sesion admin requerida.`
- `Acceso denegado. Solo admins KUPAN pueden crear alumnos.`
- `Nombre, email, fecha de nacimiento, nivel y estado son obligatorios.`
- `Para asignar plan inicial debes enviar inicio y vencimiento.`
- `Ese email ya existe en Supabase Auth. Usa otro correo o revisa el alumno existente.`

## Notas de seguridad

- No poner `SUPABASE_SERVICE_ROLE_KEY` en `.env.local`, Vercel, Netlify ni React.
- Solo guardar `SUPABASE_SERVICE_ROLE_KEY` como secreto de Supabase Edge Functions.
- El panel admin del frontend debe seguir validando `currentUser.role === 'admin'`, pero la autorizacion real esta dentro de esta Edge Function.
