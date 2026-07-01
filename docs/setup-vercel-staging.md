# Setup Vercel Staging KUPAN

## Objetivo

Crear un deploy separado para staging, conectado a Supabase staging y sin afectar produccion.

## Proyecto Vercel

1. Crear un proyecto Vercel separado o configurar un entorno Preview dedicado.
2. Conectar la rama de staging que se usara para QA.
3. Confirmar framework `Vite`.
4. Confirmar build command: `npm run build`.
5. Confirmar output directory: `dist`.
6. Confirmar que `vercel.json` mantiene rewrites SPA hacia `/index.html`.

## Variables requeridas

Configurar solo variables staging:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

No agregar:

- `SUPABASE_SERVICE_ROLE_KEY`
- claves privadas;
- tokens personales;
- secretos de Edge Functions.

## Comprobaciones antes de deploy

- La URL de Supabase corresponde al proyecto staging.
- El Project Ref no coincide con produccion.
- No hay variables heredadas desde produccion.
- La rama corresponde a staging o preview controlado.
- El commit esta registrado.

## Deploy

1. Ejecutar deploy en Vercel staging.
2. Registrar Deployment ID.
3. Registrar commit.
4. Guardar la URL resultante como `E2E_BASE_URL` en `.env.e2e` local.

## Rutas a validar

- `/`
- `/login`
- `/admin`
- `/coach`
- `/reservas`
- `/wod`

Las rutas protegidas deben redirigir a login si no hay sesion. No debe aparecer informacion privada antes de redirigir.

## Configuracion E2E local

Crear `.env.e2e` local, no versionado:

```bash
E2E_BASE_URL=https://tu-staging.vercel.app
E2E_ADMIN_EMAIL=admin-e2e@example.test
E2E_ADMIN_PASSWORD=...
E2E_COACH_EMAIL=coach-e2e@example.test
E2E_COACH_PASSWORD=...
E2E_STUDENT_EMAIL=student-e2e@example.test
E2E_STUDENT_PASSWORD=...
E2E_ALLOW_MUTATIONS=false
E2E_STAGING_CONFIRMATION=
E2E_TEST_PREFIX=kupan-e2e
```

## Validacion inicial

Ejecutar:

```bash
npm run qa:e2e:validate
npm run test:e2e
```

Mantener `E2E_ALLOW_MUTATIONS=false` hasta tener cleanup aprobado.

## Produccion

No promover staging a produccion durante esta etapa. Produccion queda sin cambios.
