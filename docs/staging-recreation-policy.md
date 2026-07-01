# Politica de Recreacion Staging KUPAN

| Estrategia | Ventajas | Riesgos | Requisitos |
| --- | --- | --- | --- |
| Cleanup parcial | Mas rapido | Puede dejar auditoria inconsistente | Dependencias claras y manifiesto completo |
| Reset completo | Estado limpio | Requiere esquema reproducible | Bootstrap completo y SQL base |
| Proyecto temporal | Maximo aislamiento | Mayor costo operativo | Automatizacion y variables por entorno |

## Evaluacion

Actualmente no existe esquema integral garantizado para recrear todo desde cero solo con archivos versionados. Por eso, el cleanup parcial tampoco puede considerarse completo para recursos auditables como movimientos de tokens.

## Recomendacion

Para mutaciones destructivas, usar staging descartable o proyecto temporal hasta contar con esquema base reproducible. El reset parcial queda permitido solo para recursos E2E registrados y con prefijo, sin declararlo como garantia total de limpieza.
