# Checklist Activacion Staging KUPAN

## Supabase

- [ ] Proyecto staging creado.
- [ ] Project Ref registrado en documento privado.
- [ ] Confirmado que no es produccion.
- [ ] Esquema aplicado.
- [ ] RPC disponibles.
- [ ] Triggers disponibles.
- [ ] Indices disponibles.
- [ ] RLS disponible y activo.
- [ ] Edge Functions disponibles.
- [ ] Datos ficticios creados.
- [ ] Produccion no modificada.

## Vercel

- [ ] Proyecto staging creado o preview dedicado definido.
- [ ] Rama correcta conectada.
- [ ] `VITE_SUPABASE_URL` apunta a staging.
- [ ] `VITE_SUPABASE_ANON_KEY` corresponde a staging.
- [ ] No existe `service_role` en Vercel.
- [ ] Deploy aprobado.
- [ ] URL registrada.
- [ ] Commit registrado.
- [ ] Deployment ID registrado.

## Usuarios

- [ ] Admin E2E creado.
- [ ] Coach E2E creado.
- [ ] Alumno E2E creado.
- [ ] Roles correctos.
- [ ] Estados activos.
- [ ] Login admin verificado.
- [ ] Login coach verificado.
- [ ] Login alumno verificado.
- [ ] Accesos restringidos verificados.

## E2E

- [ ] `.env.e2e` local creado.
- [ ] `.env.e2e` no versionado.
- [ ] `npm run qa:e2e:validate` aprobado.
- [ ] `npm run test:e2e` aprobado.
- [ ] Pruebas autenticadas aprobadas.
- [ ] Responsive autenticado aprobado.
- [ ] Consola limpia.
- [ ] WOD draft aprobado.
- [ ] PWA autenticada aprobada.

## Mutaciones

- [ ] Cleanup evaluado.
- [ ] Dry run aprobado.
- [ ] Staging confirmado.
- [ ] `E2E_ALLOW_MUTATIONS=true` configurado solo para staging.
- [ ] `E2E_STAGING_CONFIRMATION=I_CONFIRM_THIS_IS_NOT_PRODUCTION`.
- [ ] Mutaciones habilitadas.
- [ ] Cleanup final con cero recursos pendientes.

## Piloto

- [ ] Responsable operativo definido.
- [ ] Responsable tecnico definido.
- [ ] Canal de incidentes definido.
- [ ] Hora diaria de revision definida.
- [ ] Responsable de congelamiento definido.
- [ ] Responsable revision Supabase definido.
- [ ] Commit estable definido.
- [ ] Deploy anterior definido.
- [ ] Rollback confirmado.
- [ ] Usuarios piloto identificados.
