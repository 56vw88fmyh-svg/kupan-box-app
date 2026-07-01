# Workflow Operativo Staging KUPAN

## Primera activacion

```bash
npm run staging:validate
npm run staging:schema:check
npm run staging:bootstrap:dry
npm run staging:bootstrap
npm run staging:status
```

## Antes de E2E autenticado

```bash
npm run staging:seed:dry
npm run staging:seed
npm run qa:e2e:validate
npm run qa:e2e:authenticated
```

Mantener `E2E_ALLOW_MUTATIONS=false`.

## Antes de mutaciones

```bash
npm run staging:reset:dry
```

Revisar que el reset pueda revertir todos los datos E2E que se crearán. Solo despues de aprobar el dry-run se puede usar `E2E_RESET_VALIDATED=true`.

## Despues de E2E con mutaciones

```bash
npm run staging:reset:dry
npm run staging:reset
npm run staging:status
```

## Resultado esperado

- Cero recursos criticos pendientes.
- Cuentas base E2E segun politica definida.
- Staging reutilizable o listo para recreacion.
- Ningun dato real afectado.
