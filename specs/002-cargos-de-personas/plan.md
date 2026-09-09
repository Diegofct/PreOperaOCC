# Plan técnico — Spec 002

> Lee antes `docs/constitucion.md` y el `spec.md` de esta carpeta.

## La decisión de fondo

El campo que la pantalla llama «Cargo» es hoy el `rol`, y el `rol` es el acceso. Mezclar
las dos cosas es lo que deja fuera del sistema a media obra: un topógrafo no es «operador»
en ningún sentido útil, pero es la única casilla donde cabe.

Se separan en dos columnas con dos trabajos distintos: **`cargo` dice qué hace la persona
en la obra** —dato de negocio, 15 valores, se muestra en todas partes— y **`rol` dice qué
puede hacer en el sistema** —tres valores, no se amplía, es lo que lee la tabla de permisos
de la spec 001—.

El catálogo de cargos va a `src/shared/catalogos/`, junto al de tipos de equipo y por el
mismo motivo: es una lista que las dos bases tienen que compartir literalmente, y si
divergen, el panel y el celular hablan de cosas distintas sin que nada falle a la vista.

## Módulos y archivos

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `src/shared/catalogos/cargos.ts` | **Nuevo.** Los 15 cargos, su rótulo, el rol que sugiere cada uno y si opera vehículos | RF-2, RF-3, RF-6, RF-8 |
| `src/db/servidor/esquema.ts` | columna `cargo` en `usuarios`, nullable | RF-1, RF-5 |
| `src/db/local/schema.ts` | la misma columna en la réplica | RF-11 |
| `drizzle/servidor/`, `drizzle/local/` | migraciones generadas | RF-1, RF-5 |
| `src/app/api/movil/pull+api.ts` | el cargo viaja al celular | RF-11 |
| `src/features/panel/contratos.ts` | `cargo` en alta, edición y fila de lectura | RF-1, RF-3 |
| `src/app/api/panel/personas+api.ts` y `personas/[id]+api.ts` | aceptan y devuelven el cargo | RF-1, RF-4 |
| `src/app/api/panel/personas/[id]/activacion+api.ts` | solo emite códigos si el cargo opera vehículos | RF-8 |
| `src/features/panel/pantalla-personas.tsx` | dos campos donde había uno; el cargo en la tabla; el rol se propone al elegir cargo | RF-2, RF-4, RF-6, RF-7, RF-10 |
| `scripts/verificar-reglas.ts` | casos del catálogo | RF-3, RF-6, RF-8 |

Se reutiliza: `Selector` y `Etiqueta` de `componentes.tsx`, los ayudantes `textoOpcional` /
`idOpcional` de `contratos.ts`, y la forma del catálogo de `tipos-vehiculo.ts`.

## Modelo de datos

- **Servidor**: `cargo text` nullable en `usuarios`. **No es un `pgEnum`**: se descartó
  porque cada cargo nuevo obligaría a una migración de tipo, y porque el enum viviría en la
  base en vez de en el catálogo compartido, que es justo lo que la constitución prohíbe para
  los tipos de equipo. Se tipa con `$type<Cargo>()` y lo valida Zod en el borde.
- **Local**: la misma columna, misma decisión.
- **Migraciones**: `npm run db:generate` y `npm run db:generate:servidor`.
- **Compatibilidad**: nullable, así que las personas ya registradas quedan con el cargo sin
  definir y **conservan intacto su rol** (RF-5). Un celular que aún no ha actualizado no ve
  la columna y sigue funcionando: el cargo no participa en ninguna decisión del móvil.

## El catálogo

```ts
// src/shared/catalogos/cargos.ts — puro
export interface DefinicionCargo {
  id: Cargo;              // slug estable, llave en las dos bases
  nombre: string;         // como lo dice OCC: "Residente 1", "Cadenero 2"
  rolSugerido: Rol;       // lo que el formulario propone
  operaVehiculos: boolean;// si puede recibir código de activación
}
```

Director, Residente 1 y Residente 2 sugieren `supervisor`. Conductor y Operador sugieren
`operador` y son los dos únicos con `operaVehiculos`. Los diez restantes sugieren `operador`
y no operan nada: existen para que la bitácora registre su trabajo, y **no reciben código de
activación jamás** (RF-8, RF-9).

Que `rol: 'operador'` signifique a la vez «usa el celular» y «no entra a ninguna parte» no
es elegante, pero el enum no se amplía y la puerta real es el código de activación: sin él,
un cargo sin acceso no tiene forma de entrar.

## Decisiones técnicas

- **El cargo sugiere el rol, no lo impone** (RF-6, RF-7) → se descartó deducirlo, que dejaría
  sin salida el caso raro —un Auxiliar que sí debe entrar al panel— y obligaría a inventar un
  cargo falso para resolverlo.
- **La sugerencia se aplica solo al elegir el cargo**, no en cada render: si gerencia cambia
  el rol a mano después, no se le pisa.
- **Texto tipado en vez de `pgEnum`** → ver arriba.
- **El cargo viaja al celular aunque hoy no lo use** (RF-11) → se descartó dejarlo para
  cuando haga falta, porque el pull es lo que la spec 004 va a necesitar para mostrar el
  cargo al elegir personal, y añadirlo después obliga a otra migración del celular.

## Impacto en la sincronización

El cargo se añade al `select` de usuarios del pull y viaja tal cual. **No entra en la cola de
subida**: las personas son réplica, nacen en el servidor y el celular nunca las escribe.

## Contrato de API

`cargo` es opcional en el alta y en la edición, y sale en el listado. La única ruta que
cambia de comportamiento es la de activación: si el cargo no opera vehículos, responde 409
explicando que ese cargo no lleva máquina.

## Estrategia de verificación

En `scripts/verificar-reglas.ts`, contra el catálogo puro:

- Los 15 cargos, con slugs y rótulos únicos (RF-2, RF-3).
- Director y los dos residentes sugieren `supervisor`; el resto, `operador` (RF-6).
- Solo Conductor y Operador operan vehículos (RF-8).
- Un cargo que no existe no está en el catálogo (RF-3).

Demo manual: registrar un Topógrafo y comprobar que no aparece el botón de códigos;
registrar un Residente 2 y comprobar que el formulario propone acceso al panel.

## Riesgos

- **La tabla de personas se pasa de ancho** al añadir una columna. Presupuesto actual: 1192
  de 1280. Hay que recortar anchos, no añadir y ya — si se pasa, la columna de botones sale
  de la vista, que es justo la que hay que pulsar.
- **Dos migraciones a la vez**, una por base. Si solo se genera una, el celular y el servidor
  dejan de cuadrar en el siguiente pull.
