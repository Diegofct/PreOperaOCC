# Plan técnico — Spec NNN

> Lee antes `docs/constitucion.md` y el `spec.md` de esta carpeta.
> Aquí va el CÓMO. Si algo de esto cambia el comportamiento acordado, no se resuelve
> en el plan: se vuelve a la spec.

## Módulos y archivos

Qué se toca y qué RF cubre cada parte. Un archivo por línea.

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `src/shared/rules/<x>.ts` | <función pura nueva o modificada> | RF-1, RF-2 |
| `src/features/<dominio>/…` | <…> | RF-3 |
| `src/app/api/<panel\|movil>/<ruta>+api.ts` | <…> | RF-4 |

## Modelo de datos

- **Local** (`src/db/local/schema.ts`): <columnas o tablas; réplica o captura>
- **Servidor** (`src/db/servidor/esquema.ts`): <columnas, tablas, índices>
- **Migraciones**: <`npm run db:generate` / `db:generate:servidor`; qué archivo debe aparecer>
- **Compatibilidad**: <qué pasa con los teléfonos que aún no han actualizado>

<Si no cambia el esquema, escríbelo explícitamente: «Sin cambios de esquema.»>

## Algoritmo / reglas

<Pseudocódigo o pasos numerados de la lógica no obvia, con el RF que implementa cada
paso. Si es una regla de negocio, vive en `src/shared/rules/` y es pura.>

## Decisiones técnicas

Cada una con **la alternativa que se descartó y por qué**. Sin eso, no es una decisión;
es una preferencia sin registro.

- <Decisión> → se descartó <alternativa> porque <razón, atada a la constitución si aplica>.

## Impacto en la sincronización

- **Pull**: <filas nuevas en el snapshot; recuerda que el pull nunca borra>
- **Push / outbox**: <tipos de registro nuevos, orden de `seq`, dependencias>
- **Idempotencia**: <clave con la que el servidor descarta un reenvío>
- **Reevaluación en servidor**: <qué revalida el servidor al ingerir>

<Si no toca la sincronización, escríbelo: «Sin impacto en la sincronización.»>

## Contrato de API

<Método, ruta, forma de la petición y de la respuesta, códigos de estado. Recuerda:
toda ruta de `panel/` abre con `requerirSesion` y filtra con `alcance.ts`; las de
`movil/` se autentican con token. Sin transacciones interactivas en Neon.>

## Estrategia de verificación

- **`scripts/verificar-reglas.ts`**: <qué casos se añaden, RF por RF>
- **Demo manual**: <recorrido concreto: qué pantalla, qué dato, qué se debe ver>
- **Comprobaciones extra**: <fuga de secretos con `grep` sobre `dist/client` si se lee
  un secreto; `npx expo export --platform web` si se añadió una ruta al operador>

## Riesgos

- <Qué puede salir mal, cómo se detecta y cómo se revierte.>
