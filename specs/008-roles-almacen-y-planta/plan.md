# Plan técnico — Spec 008

> Lee antes `docs/constitucion.md` y el `spec.md` de esta carpeta.
> Aquí va el CÓMO. Si algo de esto cambia el comportamiento acordado, no se resuelve
> en el plan: se vuelve a la spec.

## Lo que ya está y no hay que tocar

Tres cosas del código actual resuelven requisitos de esta spec sin cambiarlas, y conviene
saberlo antes de empezar para no reescribirlas:

- **El filtro por obra ya es para «todo el que no es gerencia».** `veTodasLasObras` pregunta
  por `admin` y `filtroDeObra` / `alcanzaLaObra` tratan igual a cualquier otro rol: con
  `obraId`, su obra; sin `obraId`, nada (001/RF-10). El almacenista y el encargado de planta
  quedan limitados a su obra por construcción (RF-5, RF-6).
- **El permiso se relee en cada petición.** `personaDeLaPeticion` lee el rol de la base cada
  vez (001/RF-12), así que un cambio de acceso rige en la siguiente acción (RF-9).
- **El celular guarda el rol como texto.** En SQLite, `usuarios.rol` es una columna `text`; el
  `enum` de Drizzle solo existe en TypeScript y no crea ninguna restricción, y el pull no
  valida el rol. Un teléfono sin actualizar recibe «almacenista» y lo guarda sin quejarse
  (RF-19). Además, el celular solo deja entrar a quien tiene rol `operador`.

## Módulos y archivos

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `src/shared/rules/permisos.ts` | `ROLES` + `almacenista`, `encargado_planta`. `MODULOS` + `almacen`, `cantera`. Filas nuevas en `TABLA`. `puedeCambiarRol` con los roles nuevos reservados a gerencia. Funciones puras nuevas: `moduloDeEntrada(rol)` y `avisoDeModuloAjeno(rol, modulo)` | 1–3, 7, 8, 11–13, 17 |
| `src/shared/catalogos/cargos.ts` | Cargos `almacenista` y `encargado_planta`, con su acceso sugerido y `operaVehiculos: false` | 10, 14–16 |
| `src/db/servidor/esquema.ts` + migración | `rol_usuario` con los dos valores nuevos (`ALTER TYPE … ADD VALUE`) | 1 |
| `src/db/local/schema.ts` | La lista del `enum` de TypeScript con los dos valores; **no genera SQL** (ver «Modelo de datos») | 19 |
| `src/features/auth/servidor/sesion.ts`, `src/features/auth/servicio.ts` | El tipo del rol pasa a `Rol`, de `permisos.ts`, en lugar de la unión escrita a mano | 1 |
| `src/features/panel/contratos.ts` | `ETIQUETA_ROL` con «Almacenista» y «Encargado de Planta»; se corrige el comentario «no se amplía» | 1, 14 |
| `src/app/api/panel/personas+api.ts`, `personas/[id]+api.ts` | El alta también usa `puedeCambiarRol` (hoy solo mira `admin`) | 17 |
| `src/app/api/panel/personas/[id]/activacion+api.ts` | Sin cambio de código: ya rechaza a quien no tiene rol `operador`. Se comprueba | 10 |
| `src/features/panel/barra-navegacion.tsx` | Enlaces «Almacén» (`/panel/almacen`) y «Control Cantera» (`/panel/cantera`) | 2, 3, 11, 12 |
| `src/app/panel/almacen.tsx`, `src/app/panel/cantera.tsx` + `src/app/panel/_layout.tsx` | **Nuevas.** Rutas de una línea hacia pantallas provisionales | 2, 3, 11, 12 |
| `src/features/panel/pantalla-almacen.tsx`, `pantalla-cantera.tsx` | **Nuevas y provisionales.** `MarcoPantalla` con su `modulo`, aviso de cuenta sin obra y un estado vacío que dice que el módulo llega con la spec 009 / 010 | 6, 11, 12 |
| `src/features/panel/pantalla-inicio.tsx` | Quien no alcanza «inicio» va a `moduloDeEntrada(rol)` | 4 |
| `src/features/panel/marco.tsx` | El aviso de módulo ajeno sale de `avisoDeModuloAjeno`, no escrito a mano | 7 |
| `AGENTS.md` | Se reescribe la regla «el enum de `usuarios.rol` no se amplía», con el motivo | — |
| `scripts/verificar-reglas.ts` | Casos de la tabla, de `puedeCambiarRol`, de `moduloDeEntrada`, del aviso y de los cargos | 2, 3, 7, 10–17 |

Se reutiliza: `alcanza` y `modulosVisibles` (el menú ya se construye con la tabla),
`requerirPermiso`, `filtroDeObra` / `alcanzaLaObra`, `rolSugerido`, `operaVehiculos` y
`MarcoPantalla`.

## Modelo de datos

- **Servidor**: `rol_usuario` pasa de 3 a 5 valores. `npm run db:generate:servidor` debe dejar
  un `ALTER TYPE "rol_usuario" ADD VALUE …` por valor, y `npm run db:migrar:servidor` lo aplica.
  Es aditivo: ninguna fila cambia (RF-18).
- **Local (celular)**: `usuarios.rol` es `text`. Se actualiza la lista del `enum` en
  TypeScript para que los tipos digan la verdad, pero `npm run db:generate` no tiene nada que
  generar. Se ejecuta igual y se deja escrito que no produjo migración.
- **Catálogo de cargos**: vive en código (`shared/catalogos/cargos.ts`), sin tabla.
- **Compatibilidad**: los teléfonos que no se actualicen reciben los roles nuevos en el pull y
  los guardan como texto. Ninguna pantalla del celular filtra por esos valores.

## Algoritmo / reglas

**La tabla (RF-2, RF-3, RF-8, RF-11 a RF-13).**

| Módulo | admin | supervisor | almacenista | encargado_planta |
| --- | --- | --- | --- | --- |
| inicio | ver | ver | — | — |
| obras, personas, vehiculos, asignaciones, bitacoras, preoperacionales | como hoy | como hoy | — | — |
| **almacen** | ver, listar, escribir, anular | ver, listar | ver, listar, escribir, anular | — |
| **cantera** | ver, listar, escribir, anular | ver, listar | — | ver, listar, escribir, anular |

El operador sigue sin nada. Lo que la spec 010 necesite listar (volquetas y conductores de la
obra) se añade en su propio plan, no aquí.

**`puedeCambiarRol(quien, destino)` (RF-17).** Gerencia puede dar cualquier rol. Nadie más
puede dar `admin`, `almacenista` ni `encargado_planta`. El resto sigue como hoy: el residente
puede dar `supervisor` u `operador`, aunque la tabla ya le cierra Personas (segunda cerradura,
001/RF-9). Deja de ser un rango lineal, porque los roles nuevos no están «por encima» del
residente: son otros.

**`moduloDeEntrada(rol)` (RF-4).** El primero de `modulosVisibles(rol)`: «inicio» para gerencia
y residente, «almacen» para el almacenista, «cantera» para el encargado de planta.

**`avisoDeModuloAjeno(rol, modulo)` (RF-7).** Si el rol no ve el módulo:
- módulos del maestro de la empresa y residente → el texto de hoy («Este módulo es de la
  gerencia…»), para no cambiar 001/RF-3;
- almacenista o encargado de planta → «Este módulo no es de su cargo. Su trabajo está en
  Almacén» (o «en Control Cantera»).

## Decisiones técnicas

- **Dos niveles de acceso nuevos en el enum** → se descartó dar el permiso por cargo: la spec
  002 separó cargo y acceso a propósito, y la tabla de permisos está indexada por rol. Meter
  permisos en el cargo haría que cambiar el oficio de alguien le cambiara el acceso sin que
  gerencia lo decidiera.
- **Pantallas provisionales para Almacén y Control Cantera** → se descartó esconder los enlaces
  hasta las specs 009 y 010, porque RF-2, RF-3, RF-11 y RF-12 exigen que el módulo aparezca, y
  un almacenista que entra y no ve nada no sabe si su cuenta está mal. La pantalla provisional
  dice qué es el módulo y que todavía no tiene contenido. Sus rutas y su `modulo` son los
  definitivos.
- **La redirección de entrada vive en la pantalla de inicio** → se descartó hacerla en el
  ingreso, porque también hace falta cuando alguien escribe `/panel` a mano o recarga.
- **El aviso de módulo ajeno se calcula en `shared/rules`** → se descartó una condición más en
  el JSX de `marco.tsx`, porque es texto que depende de la tabla de permisos y así queda en el
  guion de verificación.
- **`puedeCambiarRol` explícito** → se descartó añadir los roles nuevos al `RANGO` numérico: con
  rango 2 un residente podría dar el acceso de almacenista, y con rango 3 figurarían por encima
  del residente, que no es lo que son.

## Impacto en la sincronización

- **Pull**: las personas con roles nuevos viajan como cualquier otra persona de la obra. El
  celular las guarda; no hay migración local.
- **Push / outbox**: sin cambios.
- **Idempotencia y reevaluación**: sin cambios.

## Contrato de API

Sin rutas nuevas. Cambian las respuestas de rechazo:

- `POST /api/panel/personas` y `PATCH /api/panel/personas/:id` con `rol` `almacenista` o
  `encargado_planta` desde una sesión que no es de gerencia → **403** «Solo la gerencia puede
  dar ese acceso.»
- `POST /api/panel/personas/:id/activacion` para esos roles → **400**, el rechazo que ya existe
  para quien no es operador.
- Cualquier ruta de módulo que la tabla no alcance → **403** de `requerirPermiso`, como hoy.

## Estrategia de verificación

- **`scripts/verificar-reglas.ts`**: `modulosVisibles('almacenista')` es `['almacen']` y
  `modulosVisibles('encargado_planta')` es `['cantera']`; ninguno de los dos alcanza nada de los
  módulos existentes; el residente ve Almacén y Control Cantera sin escribir ni anular; la
  gerencia escribe en los dos; `puedeCambiarRol` rechaza `supervisor → almacenista` y `supervisor
  → encargado_planta` y acepta `admin → …`; `moduloDeEntrada` de cada rol; el texto de
  `avisoDeModuloAjeno`; los dos cargos nuevos sugieren su acceso y no llevan máquina. Se ajusta
  el caso que cuenta quince cargos.
- **Demo manual** (escribe en la base real, así que se pide permiso antes): registrar desde
  gerencia un Almacenista y un Encargado de Planta en Consorcio Antioquia, darles contraseña,
  entrar con cada uno y comprobar el menú, el destino al entrar y el aviso en `/panel/bitacoras`;
  entrar como residente y ver los dos módulos nuevos; intentar el código de activación de un
  almacenista. Como nada se borra, esas dos personas quedan registradas: se proponen nombres de
  prueba reconocibles, o hacer la demo con dos personas reales que vayan a ocupar esos cargos.
- **Comprobaciones extra**: `npx expo export --platform web` por las rutas nuevas del panel.

## Riesgos

- **`ALTER TYPE … ADD VALUE` y las transacciones**: en Postgres, el valor nuevo no se puede
  usar dentro de la misma transacción que lo crea. La migración solo lo añade y no lo usa, así
  que no debería afectar; si `db:migrar:servidor` falla, se aplica cada `ADD VALUE` por separado.
- **Un rol que se escapa del `switch`**: en algún sitio se preguntó `rol === 'supervisor'` para
  decir «no es gerencia», y un almacenista caería en el lado equivocado. Se revisan los usos
  (`preoperacionales+api.ts` usa `supervisor && !obraId` para el aviso de sin obra) y el
  typecheck marca los `Record<Rol, …>` incompletos.
- **Personas de prueba que no se pueden borrar**: ver la demo manual.
