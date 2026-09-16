# Plan técnico — Spec 010

> Lee antes `docs/constitucion.md` y el `spec.md` de esta carpeta.
> Aquí va el CÓMO. Si algo de esto cambia el comportamiento acordado, no se resuelve
> en el plan: se vuelve a la spec.

## Lo que ya está y no hay que tocar

- **Permisos.** La spec 008 dejó la fila `cantera`: gerencia y encargado de planta con `ver`,
  `listar`, `escribir` y `anular`; residente con `ver` y `listar`. El 403 dice quién puede
  (008/RF-13). Cubre RF-32 y RF-33.
- **Ruta y pantalla.** `/panel/cantera`, su enlace y `pantalla-cantera.tsx` provisional (008). Se
  llena la pantalla; la ruta no se mueve.
- **Alcance por obra** (`alcance.ts`), **nombres sin tildes** (`normalizar`), **duplicado bajo su
  campo** (`duplicadoDe`), **cargos que conducen** (`operaVehiculos` en `catalogos/cargos.ts`),
  **tipo volqueta** (slug `volqueta` en `catalogos/tipos-vehiculo.ts`), **día de la obra**
  (`fechaDeJornada`), selector del panel con buscador (007), `Celda` con `lineas` (009).
- **El patrón del almacén (009)**: catálogo por obra con nombre normalizado e índice único
  parcial, movimientos que no se editan y se anulan con motivo, historial con quién y cuándo,
  pantalla con alta, corrección, baja y tabla. Se repite la forma; no se reutiliza el código del
  almacén, que es de otro dominio.

## Módulos y archivos

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `src/shared/rules/cantera.ts` | **Nuevo, puro.** Abscisa: `OPCIONES_DE_PR` (0–25), `OPCIONES_DE_METROS` (0–975 de 25 en 25), `validarAbscisa`, `formatearAbscisa`. `validarViaje` con todas las faltas por campo. `volquetaElegible` y `conductorElegible`. `filtrarViajes`. `estadoCanteraDelParte` para la sección de la bitácora | 8, 11–19, 21, 31, 34, 35, 37 |
| `src/shared/rules/parte.ts` | `ConteosDelParte.cantera` y la sección `cantera` en `IDS_DE_SECCION` y `seccionesDelParte`, **sin** tocar `bloqueosDelCierre` | 28, 36 |
| `src/db/servidor/esquema.ts` + migración `0011_…` | Tablas `cantera_sitios`, `cantera_materiales`, `cantera_viajes`; enum `tipo_sitio_cantera`; columna `partes_de_obra.cantera` (jsonb, **nula**) | 1–7, 15, 16, 18, 22–25, 29, 34, 37 |
| `src/features/bitacoras/tipos.ts` | `ViajeDelParte`: la forma fijada en el parte | 29 |
| `src/features/servidor/respuestas.ts` | `duplicadoDe` conoce los índices de sitios y materiales (campo `nombre`) | 3 |
| `src/features/panel/contratos.ts` | `sitioNuevo`/`sitioEditado`, `materialDeCanteraNuevo`/`Editado`, `viajeNuevo` (destino obra con PR y metros, o destino sitio sin ellos), filas y `OpcionesDeCantera` | 1–4, 7, 10–16, 34 |
| `src/features/panel/cliente-api.ts` | `api.cantera.{opciones, sitios, materiales, viajes}` y `api.partes.cantera` | — |
| `src/features/cantera/servidor/*.ts` | **Nuevo.** Lectura al alcance de sitios, materiales y viajes; la consulta de viajes con nombres; el aviso de bitácora cerrada | 5, 6, 20, 22, 30 |
| `src/app/api/panel/cantera/opciones+api.ts` | **Nueva.** `GET` sitios y materiales vigentes, volquetas elegibles y conductores elegibles de la obra | 6, 8–10, 35 |
| `src/app/api/panel/cantera/sitios+api.ts`, `sitios/[id]+api.ts`, `sitios/[id]/baja+api.ts` | **Nuevas.** Listar, registrar, corregir nombre (y tipo), dar de baja | 1, 3–6 |
| `src/app/api/panel/cantera/materiales+api.ts`, `materiales/[id]+api.ts`, `materiales/[id]/baja+api.ts` | **Nuevas.** Igual, para materiales | 2–6 |
| `src/app/api/panel/cantera/viajes+api.ts` | **Nueva.** `GET` por periodo; `POST` registra y avisa si la bitácora del día ya está cerrada | 7–22, 30, 34, 35 |
| `src/app/api/panel/cantera/viajes/[id]/anular+api.ts` | **Nueva.** Anular con motivo, con el mismo aviso | 23–25, 30 |
| `src/app/api/panel/partes/[id]/cantera+api.ts` | **Nueva.** Los viajes del parte: los vigentes si está abierto, los fijados si está cerrado | 26, 27, 29, 31, 37 |
| `src/app/api/panel/partes/[id]/cerrar+api.ts` | La sentencia que cierra el parte fija también sus viajes vigentes | 29, 36, 37 |
| `src/features/panel/pantalla-cantera.tsx` + `ventana-viaje.tsx` + `catalogos-cantera.tsx` | Deja de ser provisional: registrar viaje, listado con periodo y filtros, anular; sitios y materiales con alta, corrección y baja | 1–25, 32, 33 |
| `src/features/panel/pantalla-partes.tsx` | Sección «Control Cantera» de solo lectura y su entrada en el índice | 26–28, 31, 37 |
| `scripts/verificar-reglas.ts` | Casos de la regla, de los contratos y del índice; las tablas nuevas entran en la prueba de ancho | todas las de reglas |

## Modelo de datos

- **Local** (`src/db/local/schema.ts`): sin cambios. Nada de esto viaja al celular.
- **Servidor** (`src/db/servidor/esquema.ts`):
  - `tipo_sitio_cantera` = `cantera | planta | otro`.
  - `cantera_sitios`: `id`, `obra_id`, `nombre`, `nombre_normalizado`, `tipo`, `creado_por`,
    `creado_en`, `actualizado_en`, `eliminado_en`. Índice único parcial
    `ux_cantera_sitio_nombre` sobre `(obra_id, nombre_normalizado) where eliminado_en is null`.
  - `cantera_materiales`: igual sin `tipo`; índice `ux_cantera_material_nombre`.
  - `cantera_viajes`: `id`, `obra_id`, `fecha` (date), `hora` (texto `HH:MM`), `material_id`,
    `vehiculo_id`, `conductor_id`, `origen_id`, `destino_id` (nulo si el destino es la obra),
    `destino_obra` (boolean), `pr` y `metros` (enteros, nulos si no), `registrado_por`,
    `creado_en`, `anulado_en`, `anulado_por`, `motivo_anulacion`. Sin `actualizado_en`: no se
    edita (RF-23). Índice por `(obra_id, fecha)`. Dos `check`:
    - destino obra ⇒ sin `destino_id`, `pr` entre 0 y 25, `metros` entre 0 y 975 y múltiplo de
      25; destino sitio ⇒ con `destino_id` y sin `pr` ni `metros` (RF-11, RF-15, RF-16);
    - `origen_id <> destino_id` (RF-18).
  - `partes_de_obra.cantera`: jsonb **nulo por defecto**. `null` = todavía no se fijó; lista
    (vacía o no) = lo que quedó al cerrar.
- **Migraciones**: `db:generate:servidor` deja `drizzle/servidor/0011_*.sql` con el tipo, tres
  tablas, sus llaves, índices y `check`, y un `ADD COLUMN` nulo en `partes_de_obra`; nada más.
  `db:migrar:servidor` la aplica.
- **Compatibilidad**: los partes ya cerrados quedan con `cantera` nulo y la sección lo dice
  («Esta bitácora se cerró antes de que existiera el control de cantera»), en vez de afirmar que
  ese día no hubo viajes (RF-37 solo habla de lo que se fija al cerrar).

## Algoritmo / reglas

`src/shared/rules/cantera.ts`, puro:

1. `OPCIONES_DE_PR` = 0…25; `OPCIONES_DE_METROS` = 0, 25, …, 975 (RF-12, RF-13).
2. `validarAbscisa(pr, metros)` → faltas: falta el PR / faltan los metros (RF-14); fuera de rango
   o no múltiplo de 25 (RF-16).
3. `formatearAbscisa(pr, metros)` → «PR 5 + 300»; los metros con tres cifras («PR 5 + 050»),
   como se escribe una abscisa (RF-17).
4. `validarViaje(viaje, hoy)` → todas las faltas por campo: fecha mal escrita o posterior a hoy
   (RF-19), hora `HH:MM` válida, material, volqueta, conductor (RF-34), origen, destino; si el
   destino es la obra, la abscisa; si es un sitio, que no sea el mismo que el origen (RF-18) y
   que no traiga PR ni metros (RF-15).
5. `volquetaElegible(vehiculo, obraId)`: de esa obra, tipo `volqueta`, estado `operativo` y sin
   baja (RF-8 y sus casos límite).
6. `conductorElegible(persona, obraId)`: de esa obra, activa, sin baja y con un cargo que
   `operaVehiculos` (RF-35).
7. `filtrarViajes(viajes, { vehiculoId, materialId, origenId, destino })` (RF-21), sin esconder
   los anulados (RF-25).
8. `estadoCanteraDelParte({ cerrado, fijados, vigentes })` → qué mostrar: los vigentes si está
   abierto; los fijados si está cerrado; «no se registraron viajes» si la lista es vacía (RF-31,
   RF-37); «se cerró antes del control de cantera» si está cerrado y no hay nada fijado.

En el índice del parte (`parte.ts`), la sección `cantera` va después de Control Calidad de Obra,
con su conteo (RF-28). **No es exigible**: con cero viajes el índice dice «Sin viajes», no «Sin
registrar», y `bloqueosDelCierre` no la mira (RF-36).

## Decisiones técnicas

- **Los viajes se fijan en el parte dentro de la misma sentencia que lo cierra**, con un
  `jsonb_agg` de los viajes vigentes de esa obra y ese día, con los nombres de material, volqueta,
  conductor, origen y destino tal como están en ese momento. → Se descartó leerlos en la ruta y
  escribirlos después: por HTTP no hay transacción interactiva, y un viaje registrado entre la
  lectura y el cierre quedaría fuera sin que nadie lo notara.
- **Se fijan nombres, no ids.** → Se descartó guardar solo los ids: corregir después el nombre de
  un sitio cambiaría lo que dice una bitácora cerrada (RF-4 con RF-29).
- **`cantera` nulo y no lista vacía por defecto.** → Se descartó el `default '[]'`: los partes
  cerrados antes de esta spec dirían «no se registraron viajes», que es falso: nadie los contó.
- **La pantalla pide sus opciones a una ruta propia del módulo** (`cantera/opciones`). → Se
  descartó abrir al encargado de planta las filas de Vehículos y Personas en la tabla de
  permisos: vería la flota y el personal enteros, que la spec 008 le cierra.
- **Viaje con `fecha` y `hora` separadas**, como texto de la obra. → Se descartó un instante con
  zona horaria: el viaje «cuenta en el día de la fecha y hora que se escriba» (caso límite), y un
  instante se correría de día en la frontera de la medianoche, igual que la jornada del parte.
- **El destino obra es una marca, no un sitio más.** → Se descartó crear un sitio «Obra» por
  obra: se podría dar de baja, renombrar o elegir como origen (fuera de alcance), y el `check` de
  la abscisa no tendría de qué colgarse.
- **Registrar un viaje no va en lote serializable.** A diferencia del stock del almacén, ninguna
  regla depende de la suma de otros viajes. Se comprueba al registrar que el material, los sitios,
  la volqueta y el conductor sean vigentes y de la obra; si alguien da de baja un sitio en el
  mismo segundo, el viaje queda con ese sitio, que es lo que pasó. → Se descartó la
  serialización: no protege ningún invariante de esta spec.
- **El aviso de bitácora cerrada viaja en la respuesta** (`aviso`) y no bloquea (RF-30).

## Impacto en la sincronización

Sin impacto en la sincronización.

## Contrato de API

Todas abren con `requerirPermiso(peticion, 'cantera', …)` —salvo la del parte, con
`'bitacoras', 'listar'`— y filtran con `alcance.ts`. La gerencia manda `obraId` en consultas y
altas; a los demás se les usa la suya. Errores como en el almacén: 400 con `campos`, 403, 404,
409 duplicado.

| Método y ruta | Acción | Respuesta |
| --- | --- | --- |
| `GET cantera/opciones?obraId=` | `listar` | `{ sitios, materiales, volquetas, conductores }` vigentes y elegibles |
| `GET/POST cantera/sitios`, `PATCH sitios/[id]`, `POST sitios/[id]/baja` | `listar` / `escribir` | filas; 409 bajo `nombre` |
| `GET/POST cantera/materiales`, `PATCH materiales/[id]`, `POST materiales/[id]/baja` | igual | igual |
| `GET cantera/viajes?obraId=&desde=&hasta=` | `listar` | viajes del periodo, del más reciente al más antiguo, con nombres, abscisa, quién y cuándo |
| `POST cantera/viajes` | `escribir` | 201 `{ viaje, aviso }`; 400 con todas las faltas |
| `POST cantera/viajes/[id]/anular` | `anular` | 200 `{ id, aviso }`; 409 si ya estaba anulado |
| `GET partes/[id]/cantera` | `bitacoras` `listar` | `{ viajes, estado }` según `estadoCanteraDelParte` |

## Estrategia de verificación

- **`scripts/verificar-reglas.ts`**: opciones de PR (26) y metros (40); «PR 5 + 300», «PR 25 +
  975», «PR 0 + 050»; falta PR, faltan metros, PR 26, metros 980 y 310 rechazados; destino sitio
  con PR rechazado; origen igual al destino rechazado; fecha de mañana rechazada; sin conductor
  rechazado; volqueta de otra obra, en mantenimiento, dada de baja o camioneta no elegible;
  cargo `cadenero_1` no conduce y `conductor` sí; filtro por volqueta, material, origen y
  destino; estado de la sección abierta, cerrada con viajes, cerrada sin viajes y cerrada antes
  del cambio; índice con la sección «Control Cantera» y su conteo, y que cero viajes no bloquea el
  cierre; contratos que rechazan destino obra sin metros; duplicados bajo `nombre`.
- **Demo manual** (la de la spec), con `prueba.planta` y `residente1` (las entradas las hace
  Diego): cantera «La Esperanza», material «Afirmado», viaje de VOL-01 con su conductor a la obra
  en PR 5 + 300; verlo en el listado; como residente, verlo en la bitácora del día con su conteo;
  cerrar la bitácora; anular el viaje y ver el aviso y que la bitácora cerrada lo sigue mostrando.
  **Escribe en la base real y la bitácora cerrada es evidencia: se pide permiso y se elige un día
  de prueba con Diego.**
- **Comprobaciones extra**: `expo export` y `grep DATABASE_URL dist/client` vacío.

## Riesgos

- **Cerrar una bitácora de prueba** deja un parte cerrado para siempre en ese día y esa obra (se
  puede anular y abrir otro). Se detecta antes de hacerlo: se acuerda el día con Diego.
- **VOL-01 tiene que estar en «Consorcio Antioquia», operativa, y tiene que haber un conductor**
  con cargo que conduzca en esa obra; si no, la demo no tiene volqueta ni conductor que ofrecer.
  Se revisa al empezar la demo, no se inventan datos.
- **El `jsonb_agg` del cierre** escribe los nombres en SQL; si una columna de nombre cambia, el
  cierre falla con error y no cierra (no guarda algo a medias). Lo cubre la prueba de cierre.
- **Migración**: crea tablas y añade una columna nula; no toca datos existentes.
