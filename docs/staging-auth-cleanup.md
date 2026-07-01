# Cleanup Auth y Profiles Staging

## Reglas

- Solo staging confirmado.
- Solo usuarios registrados en `.staging-e2e-resources.json`.
- Email, nombre o referencia debe contener `KUPAN E2E` o `kupan-e2e`.
- Eliminar dependencias antes de tocar Auth/profile.
- No eliminar usuarios reales.
- No imprimir passwords ni tokens.

## Orden

1. Reservas E2E.
2. Movimientos/dependencias E2E.
3. Membresias E2E.
4. Posts, horarios, WOD y planes E2E.
5. Profile E2E.
6. Usuario Auth E2E con Admin API.

## Trigger de sincronizacion

El trigger `handle_new_user` puede crear profiles al registrar usuarios. Al borrar Auth, verificar si el profile desaparece por cascade. Si no desaparece, eliminar profile solo si:

- esta en manifiesto;
- el email coincide;
- el nombre contiene `KUPAN E2E`;
- no tiene dependencias restantes.

## Estado actual

Cleanup Auth/profile: disponible solo como operacion local staging con service role y manifiesto. No aprobado para produccion ni para datos sin prefijo.
