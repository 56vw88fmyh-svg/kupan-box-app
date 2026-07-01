# Setup Usuarios E2E KUPAN

## Objetivo

Crear cuentas ficticias por rol para validar autenticacion, permisos y navegacion en staging.

## Reglas

- Usar solo staging.
- No usar correos reales de alumnos.
- No documentar contrasenas.
- No reutilizar cuentas reales.
- Usar nombres con prefijo `KUPAN E2E`.
- Mantener `status = active`.

## Admin E2E

- Nombre: `KUPAN E2E ADMIN`
- Email sugerido: `admin-e2e@example.test`
- Rol: `admin`
- Estado: `active`

Verificar:

- Existe usuario en Supabase Auth.
- Existe profile asociado.
- Puede iniciar sesion.
- Puede entrar a `/admin`.
- Puede entrar a `/coach` solo si la app lo permite para admin.
- Puede cerrar sesion.

## Coach E2E

- Nombre: `KUPAN E2E COACH`
- Email sugerido: `coach-e2e@example.test`
- Rol: `coach`
- Estado: `active`

Verificar:

- Existe usuario Auth.
- Existe profile asociado.
- Puede iniciar sesion.
- Puede entrar a `/coach`.
- No puede entrar a secciones exclusivas de admin si el sistema diferencia ambos roles.
- No ve acciones administrativas exclusivas.

## Alumno E2E

- Nombre: `KUPAN E2E STUDENT`
- Email sugerido: `student-e2e@example.test`
- Rol: el rol real de alumno usado por la app, normalmente `student`.
- Estado: `active`

Verificar:

- Existe usuario Auth.
- Existe profile asociado.
- Puede iniciar sesion.
- Puede ver perfil.
- No puede entrar a `/admin`.
- No puede entrar a `/coach`, salvo regla explicita distinta.

## Validacion de roles

1. Login admin: confirmar acceso `/admin`.
2. Login coach: confirmar acceso `/coach`.
3. Login alumno: confirmar restriccion `/admin` y `/coach`.
4. Confirmar que no aparece navegacion administrativa al alumno.
5. Confirmar que los mensajes de acceso denegado son claros.

## Registro en `.env.e2e`

Guardar solo localmente:

```bash
E2E_ADMIN_EMAIL=admin-e2e@example.test
E2E_ADMIN_PASSWORD=...
E2E_COACH_EMAIL=coach-e2e@example.test
E2E_COACH_PASSWORD=...
E2E_STUDENT_EMAIL=student-e2e@example.test
E2E_STUDENT_PASSWORD=...
```

No subir `.env.e2e` a Git.
