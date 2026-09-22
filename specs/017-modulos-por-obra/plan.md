# Plan técnico — Spec 017

> Módulos por obra: Almacén y Control Cantera (RF-1 a RF-18).

## Lo que ya está y no hay que tocar

- **La tabla de permisos** (`src/shared/rules/permisos.ts`) ya decide qué módulo ve cada rol, y
  `requerirPermiso` ya es la única puerta de las rutas del panel. Esta spec no cambia quién ve
  qué por su cargo: **añade una segunda condición**, la obra.
- **El alcance por obra** (`src/features/servidor/alcance.ts`) ya filtra por obra cada consulta.
- **El aviso de «su cuenta no tiene obra»** (`sinObraAsignada` + `marco.tsx`) ya es el sitio
  donde una persona ve por qué su módulo no le sirve: el aviso de RF-8 va al lado.

## Módulos y archivos

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `src/db/servidor/esquema.ts` | `obras.almacen_activo` y `obras.cantera_activo`, boolean **not null default `true`**. Migración `0014`; el default deja encendidas las obras que ya existen. | RF-1, RF-2 |
| `src/shared/rules/permisos.ts` | Tipo `ModulosDeObra = { almacen: boolean; cantera: boolean }`. `moduloApagado(modulo, modulos)`; `modulosVisibles(rol, modulos)` filtra además por eso; `avisoDeModuloApagado(modulo)` («Su obra no tiene el módulo …»); `motivoParaNoDarRolEnObra(rolDestino, modulos)`. La gerencia no se filtra: no está adscrita a una obra. | RF-7, RF-8, RF-9, RF-11 |
| `src/features/auth/servidor/sesion.ts` | `PersonaEnSesion.modulosDeObra`: sale del `join` con `obras` que la lectura de sesión ya podría hacer. `{ almacen: true, cantera: true }` para quien no tiene obra (la gerencia). | RF-7 a RF-9 |
| `src/features/servidor/guardia.ts` | `requerirPermiso` rechaza con **403** si el módulo está apagado en la obra de quien pide, con el texto de la regla. Es la puerta que ya pasan todas las rutas del panel: no hay que tocarlas una a una. | RF-9 |
| `src/features/servidor/alcance.ts` | `filtroDeModulo(modulo)`: la condición sobre `obras` que deja fuera las obras con ese módulo apagado. La usan los listados de Almacén y Cantera de la gerencia. | RF-10 |
| `src/features/almacen-obra/servidor/materiales.ts` y `.../excel.ts` | Sus consultas ya juntan `obras`: se les añade `filtroDeModulo('almacen')`, así la descarga y la tabla de «todas» dejan fuera las apagadas. | RF-10 |
| `src/features/cantera/servidor/*` | Lo mismo con `filtroDeModulo('cantera')` en los listados y opciones. | RF-10 |
| `src/app/api/panel/obras+api.ts` y `obras/[id]+api.ts` | `GET` devuelve los dos interruptores; `POST` y `PATCH` los guardan (solo gerencia, como el resto de la ficha). | RF-1, RF-3, RF-4, RF-5 |
| `src/app/api/panel/personas*` | Al dar o cambiar el rol, rechaza almacenista o encargado de planta si la obra tiene ese módulo apagado, con `motivoParaNoDarRolEnObra`. | RF-11 |
| `src/app/api/panel/partes/[id]/cerrar+api.ts` | Con Cantera apagada en la obra, cierra con `cantera: []` en vez de `viajesParaFijarAlCerrar()`. | RF-13 |
| `src/features/panel/contratos.ts` | `ObraFila` con los dos interruptores; `obraNueva` con ellos (por defecto encendidos) y `obraEditada` con ellos opcionales. `PersonaEnSesionFila` con `modulosDeObra`, para que el panel decida el menú. | RF-1, RF-3, RF-4, RF-7 |
| `src/features/panel/barra-navegacion.tsx` | El menú sale de `modulosVisibles(rol, modulosDeObra)`. | RF-7 |
| `src/features/panel/marco.tsx` | Si el módulo de la pantalla está apagado en su obra, el aviso de RF-8 en vez de la pantalla, junto al de «sin obra». | RF-8 |
| `src/features/panel/pantalla-obras.tsx` y `ventana-obra.tsx` | Dos casillas, «Lleva almacén» y «Lleva control de cantera», en el alta y en la corrección. Al apagar una con gente en ese rol, el aviso de RF-6 **antes de guardar**, con los nombres: salen de `api.personas.listar()`, que la gerencia ya puede pedir. | RF-3, RF-4, RF-6 |
| `src/features/panel/pantalla-almacen.tsx` y `pantalla-cantera.tsx` | El selector de obra de la gerencia solo ofrece las obras con ese módulo encendido. | RF-10 |
| `src/features/panel/pantalla-partes.tsx` | La sección Control Cantera no se pinta en un parte **abierto** de una obra con Cantera apagada; en uno cerrado o anulado se sigue viendo con lo que fijó. | RF-12, RF-16 |
| `scripts/verificar-reglas.ts` | Los casos de las reglas nuevas (ver *Verificación*). | RF-7 a RF-11 |

**Lo que se reutiliza:** la tabla de permisos y `requerirPermiso` (una sola puerta), `filtroDeObra`,
el aviso de `marco.tsx`, `Casilla` (016) para los interruptores y el listado de personas para el
aviso de RF-6.

## Modelo de datos

- **Servidor:** dos columnas nuevas en `obras`, boolean not null con default `true`. El default
  **es** RF-2: las obras que ya existen quedan encendidas sin tocar ninguna fila. Migración
  `0014` con `db:generate:servidor`; `db:migrar:servidor` **solo con visto bueno de Diego**.
- **Móvil (`src/db/local/schema.ts`): no cambia.** Los dos módulos son del panel y el celular no
  sabe que existen; el snapshot que baja el teléfono no lleva estos campos. Un teléfono sin
  actualizar no se entera de nada, que es lo correcto (RF-17).

## Decisiones técnicas

- **Dos columnas boolean y no una lista de módulos activos.** *Descartado:* una columna con los
  módulos encendidos (texto o `jsonb`). Son dos interruptores fijos y conocidos; una lista
  admitiría valores que no existen y obligaría a validar en cada lectura lo que el tipo ya
  garantiza.
- **Los módulos de la obra viajan en la sesión, no se consultan por ruta.** *Descartado:* que
  cada ruta lea la obra. La lectura de la sesión ya va a la base en cada petición y puede traer
  los dos flags en el mismo `join`; repartir la consulta por veinte rutas es la forma de que un
  día falte en una.
- **El rechazo va en `requerirPermiso`, no en cada ruta.** *Descartado:* comprobarlo dentro de
  cada endpoint de almacén y cantera. Es la misma razón por la que la guardia existe: una ruta
  que se olvide de comprobarlo no se nota hasta que alguien entra por fuera del panel.
- **La gerencia nunca se filtra por módulo de obra; se le filtran las obras.** *Descartado:*
  apagarle el módulo entero a la gerencia cuando alguna obra lo tenga apagado. La gerencia lleva
  todas las obras: lo que debe desaparecer son las obras apagadas dentro del módulo (RF-10), no
  el módulo.
- **El aviso de RF-6 se arma en el panel con el listado de personas.** *Descartado:* que el
  `GET` de obras devuelva cuántas personas tiene cada módulo. Sería un dato más que mantener en
  un endpoint que ya usan cuatro pantallas, y la gerencia ya puede pedir el listado de personas.
- **Un parte cerrado conserva su sección porque lo que enseña es lo fijado.** *Descartado:*
  esconder la sección en todos los partes de la obra. Lo fijado al cerrar es evidencia
  (RF-16), y es el mismo criterio del horario congelado de la spec 016.

## Impacto en la sincronización

Ninguno. Ni el pull, ni la outbox, ni el orden de `seq`, ni la ingesta cambian: los dos módulos
son del panel y nada de esto viaja al celular (RF-17).

## Contrato de API

- `GET /api/panel/obras` — cada obra con `almacenActivo` y `canteraActivo`.
- `POST /api/panel/obras` y `PATCH /api/panel/obras/:id` — los aceptan; solo gerencia
  (`requerirPermiso('obras', 'escribir')`), como el resto de la ficha. En el `PATCH` son
  opcionales: lo que no viene no se toca.
- `POST`/`PATCH` de personas — **400** «Esa obra no lleva almacén.» (o cantera) al intentar dar
  ese rol en una obra con el módulo apagado, con el campo `rol`.
- Cualquier ruta de `almacen` o `cantera` — **403** con «Su obra no tiene el módulo …» cuando
  quien pide tiene obra y ese módulo está apagado. Sin cambios de código en cada ruta: lo hace
  la guardia.
- Los listados de Almacén y Cantera de la gerencia dejan fuera las obras apagadas (RF-10).
- Solo lecturas y escrituras de una fila: nada que necesite transacción interactiva (Neon).

## Estrategia de verificación

En `scripts/verificar-reglas.ts`:

- **`modulosVisibles(rol, modulos)`**: el almacenista con Almacén encendido ve su módulo y con
  apagado no ve ninguno; el encargado de planta igual con Cantera; el residente pierde Almacén
  pero conserva Bitácoras; la gerencia ve los nueve módulos siempre.
- **`moduloApagado`**: solo mira `almacen` y `cantera`; los demás módulos nunca están apagados.
- **`motivoParaNoDarRolEnObra`**: almacenista en obra sin almacén → el texto; en obra con
  almacén → `null`; encargado de planta igual; los demás roles, `null` en cualquier caso.
- **`avisoDeModuloApagado`**: nombra el módulo.

Demo en Chrome, sobre PRUEBA-016: apagar Cantera y ver que el parte abierto pierde la sección y
que un parte cerrado la conserva; que el selector de obra de Control Cantera ya no la ofrece;
que un `POST` a una ruta de cantera de esa obra responde 403; intentar dar el rol de encargado
de planta en esa obra y ver el rechazo; volver a encenderla y ver que todo vuelve, con los
viajes registrados. Lo mismo con Almacén, comprobando además que la descarga en Excel de «todas»
deja de traerla.

## Riesgos

- **Que una ruta de almacén o cantera se salte la guardia.** Sería una puerta abierta a otra
  obra. Se evita porque el rechazo vive en `requerirPermiso`; se comprueba con el `POST` de la
  demo y con una lectura de que ninguna ruta de esos módulos llama a `requerirSesion` a secas.
- **Dejar a alguien encerrado**: un almacenista cuyo módulo se apaga no tendría a dónde entrar.
  Por eso el aviso de RF-8 se pinta en el marco y no se le manda a una pantalla vacía. Se ve en
  la demo entrando con esa cuenta si hay credenciales; si no, por lectura del marco.
- **Que apagar esconda datos y parezca que se borraron.** El texto de las casillas y el aviso
  dicen que lo registrado se conserva; la demo lo comprueba encendiendo otra vez (RF-15).
- **La migración en producción.** Dos columnas con default `true`: no toca filas ni cambia lo
  que hoy se ve. Si hubiera que revertir, basta con dejar las columnas: nadie las exige en la
  base.
- **Sesiones abiertas.** Los flags se leen en cada petición, así que el cambio se nota al
  recargar el panel; no hace falta cerrar la sesión de nadie.
