# Plan técnico — Spec 018

> Laboratorio: ensayo de granulometría LAB-FR-01-2025 (RF-1 a RF-112).
> Lee antes `docs/constitucion.md` y el `spec.md` de esta carpeta.

## Lo que ya está y se reutiliza

- **Permisos por módulo** (`src/shared/rules/permisos.ts`) y la única puerta del panel,
  `requerirPermiso` (`src/features/servidor/guardia.ts`), que ya rechaza por cargo **y** por
  módulo apagado en la obra (017/RF-9). Añadir el módulo a la tabla basta para que todas las
  rutas nuevas queden cerradas.
- **Módulos por obra** (spec 017): `ModulosDeObra`, `moduloApagado`, `filtroDeModulo`,
  `modulosDeLaObra`, `motivoParaNoDarRolEnObra`, las casillas de `modulos-de-obra.tsx`. Se
  amplían con un tercer interruptor; no se escribe un mecanismo nuevo.
- **La sección de cantera en el parte** (`src/features/cantera/servidor/parte.ts`): una sola
  consulta SQL que sirve para mostrar en el parte abierto y para fijar **dentro de la misma
  sentencia** que cierra. Los ensayos del día siguen exactamente ese patrón.
- **Alcance por obra** (`filtroDeObra`, `alcanzaLaObra`, `veTodasLasObras`) y el registro de la
  gerencia en una obra ajena (`obraParaRegistrar`, en `cantera/servidor/catalogos.ts`).
- **Respuestas y choques** (`src/features/servidor/respuestas.ts`): `responder`, `ok`,
  `errorDePeticion`, `noEncontrado` y la detección del 23505.
- **Día en la obra**: `fechaDeJornada` (`src/shared/rules/jornada.ts`) para «no posterior a hoy».
- **Dibujo**: `react-native-svg` ya está instalado (lo usa `src/components/ui/pad-firma.tsx`).
  La curva no necesita dependencia nueva.

## Módulos y archivos

### Reglas y catálogos (puros, compartidos)

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `src/shared/catalogos/tamices.ts` *(nuevo)* | La serie del anexo B: `id` estable (`t_2`, `t_1_1_2`… `t_200`, `fondo`), nombre U.S., mm. Los id no se renombran: los ensayos guardan masas por id. | RF-26, RF-65 |
| `src/shared/catalogos/franjas-granulometricas.ts` *(nuevo)* | Catálogo: `id`, nombre, norma, límites por id de tamiz. Solo `sbg_50` (anexo A) hasta que OCC confirme las demás (RF-19). | RF-17, RF-18, RF-19 |
| `src/shared/rules/granulometria.ts` *(nuevo)* | `calcularGranulometria(entrada, franja)`: humedad, masa sin tara, % retenido, acumulado, pasa, TM, TMN, diferencia de lavado y su aviso, veredicto por tamiz y global, lo que falta. `validarEnsayo(entrada, hoy, modo)` con `modo: 'borrador' \| 'envio'`. `claveDeInforme(numero)`. `transicionPermitida(estado, accion)`. | RF-33 a RF-63, RF-70 a RF-93 |
| `src/shared/rules/permisos.ts` | Rol `laboratorista` en `ROLES`, `ETIQUETA_ROL`, `QUIEN_ES`, `PUEDE_DAR` (solo admin). Módulo `laboratorio` al final de `MODULOS`, con su fila. Acción nueva `aprobar` (aprobar y devolver). `ModulosDeObra.laboratorio`, `TODOS_LOS_MODULOS`, `moduloApagado`, `motivoParaNoDarRolEnObra`, `NOMBRE_DE_MODULO`. El laboratorista no tiene nada en las demás filas. | RF-1, RF-2, RF-4, RF-5, RF-9, RF-10, RF-14, RF-92 |
| `src/shared/catalogos/cargos.ts` | Cargo `laboratorista`, `rolSugerido: 'laboratorista'`, sin vehículo. `control_calidad` se queda como está. | RF-3 |
| `src/shared/rules/parte.ts` | `ParteEvaluable.ensayosDelModulo?: number` y `ConteosDelParte` igual: la sección Control Calidad cuenta sus filas más los ensayos del módulo. | RF-110 |

### Servidor

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `src/db/servidor/esquema.ts` | Enum `rol_usuario` + `laboratorista`. `obras.laboratorio_activo` boolean not null **default `false`**. Enum `estado_ensayo`. Tabla `ensayos_granulometria`. `partes_de_obra.granulometrias` jsonb **nula, sin default** (como `cantera`). Ver *Modelo de datos*. | RF-1, RF-11, RF-12, RF-70 a RF-94, RF-111 |
| `src/features/auth/servidor/sesion.ts` | `modulosDeObra.laboratorio` desde el mismo `join` con `obras`. | RF-4, RF-14 |
| `src/features/servidor/modulos-de-obra.ts` | Lee también `laboratorio_activo`. | RF-14 |
| `src/features/servidor/alcance.ts` | `filtroDeModulo` acepta `'laboratorio'`. | RF-8, RF-14 |
| `src/features/laboratorio/servidor/ensayos.ts` *(nuevo)* | Lectura del listado y del detalle, armado de filas, `obraParaRegistrar`, la sentencia de cambio de estado con condición sobre el estado leído y anexo a la historia. | RF-6 a RF-8, RF-23, RF-70 a RF-94, RF-101 a RF-105 |
| `src/features/laboratorio/servidor/parte.ts` *(nuevo)* | `granulometriasDelDiaEnSql(obra, fecha)`, `granulometriasParaFijarAlCerrar()`, `granulometriasDeUnParte(sesion, parteId)`. Mismo patrón que cantera. | RF-15, RF-106, RF-107, RF-111, RF-112 |
| `src/app/api/panel/laboratorio/granulometrias+api.ts` *(nuevo)* | `GET` listado, `POST` alta en borrador. | RF-20, RF-23 a RF-41, RF-101 a RF-105 |
| `src/app/api/panel/laboratorio/granulometrias/[id]+api.ts` *(nuevo)* | `GET` detalle, `PATCH` parcial de un borrador/devuelto. | RF-22, RF-31, RF-71, RF-76, RF-85 |
| `…/granulometrias/[id]/enviar+api.ts`, `aprobar+api.ts`, `devolver+api.ts`, `anular+api.ts`, `descartar+api.ts` *(nuevos)* | Una transición por ruta. | RF-72 a RF-93 |
| `src/app/api/panel/partes/[id]/granulometrias+api.ts` *(nuevo)* | Sección del parte, solo lectura, con permiso de **bitácora** (como `cantera+api.ts`). | RF-106 a RF-109 |
| `src/app/api/panel/partes/[id]/cerrar+api.ts` | Cuenta los ensayos del día para `bloqueosDelCierre` y fija `granulometrias` en la misma sentencia que cierra. | RF-110, RF-111 |
| `src/app/api/panel/obras+api.ts`, `obras/[id]+api.ts` | Leen y guardan `laboratorioActivo`. | RF-11, RF-13 |
| `src/app/api/panel/personas*` | Nada nuevo: ya llaman a `motivoParaNoDarRolEnObra` y `motivoParaNoDarRol`, que cubren el rol nuevo. | RF-2, RF-14 |

### Panel

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `src/features/panel/contratos.ts` | `ObraFila.laboratorioActivo`, `obraNueva` (por defecto `true`), `obraEditada` (opcional). Zod de `ensayoNuevo`, `ensayoEditado` (parcial), `devolucion`, `anulacion`; tipos `EnsayoFila`, `EnsayoDetalle`, `GranulometriaDelParteFila`. `ETIQUETA_ROL` se reexporta y trae el rol nuevo solo. | RF-11, RF-13, RF-23 a RF-32 |
| `src/features/panel/cliente-api.ts` | `api.laboratorio.*` y `api.partes.granulometrias(id)`. | — |
| `src/features/panel/modulos.ts` | `laboratorio: { ruta: '/panel/laboratorio', titulo: 'Laboratorio' }` (el `satisfies` obliga). | RF-4 |
| `src/features/panel/modulos-de-obra.tsx`, `ventana-obra.tsx`, `pantalla-obras.tsx` | Tercera casilla «Lleva laboratorio», con el aviso de a quién deja sin módulo. | RF-11, RF-13, RF-14 |
| `src/app/panel/laboratorio.tsx`, `src/app/panel/laboratorio/[id].tsx` *(nuevos, una línea)* | Reexportan las pantallas. | — |
| `src/features/laboratorio/pantalla-laboratorio.tsx` *(nuevo)* | Listado con filtros, contador de pendientes, botón «Nuevo ensayo». | RF-101 a RF-105 |
| `src/features/laboratorio/pantalla-ensayo.tsx` *(nuevo)* | Formulario (encabezado, masas, tabla de tamices), resultados en vivo con la misma regla, curva, estado e historia, botones según estado y rol. | RF-20 a RF-94 |
| `src/features/laboratorio/acciones-ensayo.tsx` *(nuevo)* | Los pasos del flujo en sus ventanas y la historia. «Enviar» se desactiva mientras haya cambios sin guardar: se compara lo que hay en pantalla con lo guardado (añadido en `/sdd:cambio` del 2026-09-25). | RF-70 a RF-94, RF-113 |
| `src/features/laboratorio/tabla-tamices.tsx` *(nuevo)* | Tabla de 16 renglones: retenido editable, % calculados, marca ▲/▼ fuera de franja. | RF-26, RF-52, RF-55, RF-61 |
| `src/features/laboratorio/curva-granulometrica.tsx` *(nuevo)* | SVG: eje X log (0,05–100 mm), Y 0–100, curva del ensayo, dos límites punteados, puntos fuera con forma distinta, leyenda. | RF-64 a RF-69 |
| `src/features/laboratorio/informe.tsx` *(nuevo)* | Vista del informe con el encabezado del formato, logo, marca de estado, y botón «Imprimir / PDF». | RF-95 a RF-100 |
| `assets/images/logo-geolab.jpeg` *(nuevo)* | La imagen tal cual sale del Excel (`xl/media/image1.jpeg`). | RF-95 |
| `src/features/panel/pantalla-partes.tsx` | En `SeccionLaboratorio`, debajo de las filas a mano, los ensayos del módulo (solo lectura, enlace al ensayo); los conteos suman. En un parte cerrado, los fijados. | RF-106 a RF-110, RF-112 |
| `scripts/verificar-reglas.ts` | Casos (ver *Verificación*). | todos los de reglas |

## Modelo de datos

**Servidor** (`src/db/servidor/esquema.ts`), migración `0015` con `npm run db:generate:servidor`:

1. `alter type rol_usuario add value 'laboratorista'` — sale solo al añadirlo a `ROLES`, igual que
   en la spec 008 (migración `0009`).
2. `obras.laboratorio_activo boolean not null default false`. El default **es** RF-12: las obras
   que existen quedan apagadas sin tocar filas. El «propuesto encendido» de RF-13 lo pone el
   contrato de alta, no la base.
3. `estado_ensayo` enum: `borrador | enviado | devuelto | aprobado`.
4. Tabla `ensayos_granulometria`:
   - `id` text PK (uuidv7), `obra_id` → obras.
   - Encabezado: `material` text, `fuente` text, `localizacion` text, `numero_informe` text,
     `clave_informe` text (salida de `claveDeInforme`: minúsculas, sin espacios),
     `fecha_recepcion` date, `fecha_ejecucion` date. **Todos nulos** mientras es borrador (RF-31).
   - `franja` jsonb nullable: la franja **completa copiada** del catálogo al escogerla (RF-21).
     `franja_id` text para filtrar.
   - `masas` jsonb: `{ humeda, seca, tara, lavada }`, cada una `number | null`.
   - `retenidos` jsonb: `{ [idTamiz]: number | null }`.
   - `observaciones` text.
   - `resultado` jsonb nullable y `veredicto` text nullable (`cumple | no_cumple`): **los calcula
     el servidor** al guardar (RF-42); el veredicto va en columna para filtrar.
   - `estado` estado_ensayo not null default `borrador`.
   - `registrado_por`, `revisado_por` / `revisado_en`, `aprobado_por` / `aprobado_en`,
     `comentario_devolucion`, `descartado_en`, `anulado_en` / `anulado_por` / `motivo_anulacion`.
   - `historia` jsonb not null default `[]`: `{ accion, usuarioId, nombre, cargo, en, texto? }`.
   - `creado_en`, `actualizado_en`.
   - Índice único **parcial** `(obra_id, clave_informe)` donde `anulado_en is null and
     descartado_en is null and clave_informe is not null` (RF-40, RF-41).
   - Índice `(obra_id, fecha_ejecucion)` para el listado y el parte.
   - `check`: `anulado_en` solo con estado `aprobado`; `descartado_en` solo con `borrador` o
     `devuelto`; `anulado_en ⇒ motivo_anulacion` no vacío; nunca descartado y anulado a la vez.
5. `partes_de_obra.granulometrias jsonb` **nula, sin default**: `null` = nunca fijado (abierto, o
   cerrado antes de esta spec); `[]` = cerrado sin ensayos. Mismo razonamiento que `cantera`.

**Móvil** (`src/db/local/schema.ts`): **sin cambios de esquema.** El único efecto es el rol nuevo:
la columna `rol` es texto en SQLite y un teléfono sin actualizar que reciba `laboratorista` en el
pull lo guarda igual (008/RF-19). El laboratorista no lleva máquina ni recibe celular.

## Algoritmo / reglas

`calcularGranulometria` (en `granulometria.ts`), todo con precisión completa y redondeo solo al
presentar y al comparar:

1. Faltantes (RF-56, RF-63, RF-69): si falta `seca`, o `seca − tara ≤ 0`, o algún retenido es
   nulo → `{ completo: false, faltan: [...] }` y nada más.
2. `humedad = (humeda − seca) / seca × 100` (RF-44), `null` si falta la húmeda.
3. `sinTara = seca − tara` (RF-45).
4. Por tamiz en orden de la serie (sin fondo): `ret% = masa / sinTara × 100`; `acum` corrido;
   `pasa = 100 − acum` (RF-46 a RF-48). El fondo lleva `ret%` y `acum`, **sin `pasa`** (RF-52).
5. TM (RF-49): el tamiz más pequeño con `acum = 0` (por él pasa el 100 %). Si el primero ya
   retiene → `{ mayorQue: '2"' }` (RF-51).
6. TMN (RF-50): el primer tamiz, de mayor a menor, con masa retenida > 0.
7. Lavado (RF-53, RF-54): `dif = lavada − Σretenidos` (fondo incluido); `%dif = |dif| / lavada ×
   100`; `aviso = %dif > 0,3`. Sin `lavada`, no hay dato ni aviso.
8. Veredicto (RF-57 a RF-60): por cada tamiz que controla la franja, `p = round2(pasa)`;
   `debajo` si `p < min`, `encima` si `p > max`. Global `no_cumple` si alguno; `cumple` si ninguno.

`validarEnsayo(entrada, hoy, modo)` devuelve la lista de errores con su campo: negativas (RF-33),
seca > húmeda (RF-34), tara ≥ seca (RF-35), lavada > seca (RF-36), Σretenidos > sinTara (RF-37),
ejecución < recepción (RF-38), fechas > hoy (RF-39). En modo `'envio'` además exige todo lo
obligatorio y franja (RF-73). La unicidad del informe (RF-40) la decide el índice.

`transicionPermitida(estado, accion)`: `enviar` desde `borrador|devuelto`; `aprobar` y `devolver`
desde `enviado`; `anular` desde `aprobado`; `descartar` desde `borrador|devuelto`; `editar`
desde `borrador|devuelto`. Todo lo demás, `false` (RF-71 a RF-90).

## Decisiones técnicas

- **Un rol nuevo `laboratorista` y no un cargo con rol `supervisor` u `operador`.** *Descartado:*
  el cargo solo. Como supervisor vería la obra entera; como operador no entra al panel. Es
  exactamente el caso por el que AGENTS.md permite ampliar el enum.
- **Una acción `aprobar` en la tabla de permisos.** *Descartado:* reutilizar `anular` o
  `escribir`. El residente aprueba pero no escribe ensayos, y el laboratorista escribe pero no
  aprueba: con las acciones existentes no se puede decir las dos cosas.
- **Masas y retenidos en `jsonb` por id de tamiz; encabezado y filtros en columnas.**
  *Descartado:* una columna por tamiz (dieciséis columnas y una migración si cambia la serie) y
  una tabla hija de renglones (dos sentencias por guardado sin transacción en Neon). Lo que se
  filtra —fecha, franja, estado, veredicto, obra— sí va en columna.
- **El servidor recalcula y guarda `resultado` y `veredicto`.** *Descartado:* calcular solo al
  leer. El listado filtra por veredicto (RF-103) y el parte muestra el veredicto sin cargar
  masas; calcularlo por fila en cada lectura sería repartir la regla. Es la misma función
  pura que usa la pantalla (constitución, principio 3), así que no pueden discrepar.
- **La franja se copia entera al ensayo.** *Descartado:* guardar solo el id. RF-21 exige que un
  cambio del catálogo no altere los ensayos hechos.
- **Catálogo de franjas en código.** *Descartado:* una tabla editable. Editar franjas desde el
  panel está fuera de alcance, y en código se verifica con `verificar-reglas`.
- **Historia en `jsonb` anexada en la misma sentencia que cambia el estado.** *Descartado:* una
  tabla de eventos. Serían dos escrituras sin transacción: si la segunda fallara, quedaría un
  estado sin su evento. `historia = historia || jsonb_build_array(...)` va en el mismo `UPDATE`.
- **Concurrencia: cada transición es `UPDATE … WHERE id = $1 AND estado = $esperado AND
  descartado_en IS NULL AND anulado_en IS NULL`.** Si no devuelve fila, se relee y se responde
  409 con el estado actual (RF-93). *Descartado:* leer, comprobar y escribir: entre la lectura y
  la escritura otro residente pudo actuar.
- **Anulado y descartado como marcas de tiempo, no como estados del enum.** *Descartado:* seis
  estados. Es la convención del proyecto (`anulado_en`, `eliminado_en`), deja el índice parcial
  de unicidad con la misma forma que los demás y conserva en `estado` en qué punto se anuló.
- **Ensayos del parte con la consulta SQL compartida, fijados en la sentencia de cierre.**
  *Descartado:* leerlos en la ruta y escribirlos después: un ensayo enviado entre medias
  quedaría fuera. Copia exacta del patrón de cantera (010/RF-29).
- **El cierre cuenta los ensayos del día antes de decidir, y el `UPDATE` lo vuelve a exigir.**
  Si la sección a mano está vacía, el `WHERE` del cierre añade `jsonb_array_length(laboratorio) >
  0 OR exists (ensayo vigente del día)`. *Descartado:* confiar en el conteo previo: un
  descarte entre el conteo y el cierre dejaría un parte cerrado con la sección vacía.
- **Informe como vista del panel con `window.print()` y una hoja de estilos de impresión.**
  *Descartado:* generar PDF en el servidor (dependencia nueva, principio 8) y exportar a Excel
  (fuera de alcance). El navegador ya guarda como PDF; `@page size: letter` fija la carta de
  RF-100 mientras no se aclare el papel.
- **La curva en `react-native-svg`.** *Descartado:* una librería de gráficas (dependencia nueva
  para tres líneas) y dibujar en `<canvas>` (no imprime nítido). SVG imprime vectorial.
- **Rutas `src/app/panel/laboratorio.tsx` y `laboratorio/[id].tsx`.** *Descartado:* una ventana dentro
  del listado. El ensayo necesita dirección propia para abrirlo desde el parte (RF-109) y para
  imprimirlo.
- **½" a 12,7 mm, como el Excel**, hasta que se aclare. Vive en un solo sitio (`tamices.ts`).
  Tamices y franja se unen por **id**, no por milímetros, así que cambiar el número no rompe
  nada.

## Impacto en la sincronización

Sin impacto en la sincronización. Pull, outbox, orden de `seq` e ingesta no cambian: el módulo es
del panel. El único dato que puede viajar al teléfono es el valor `laboratorista` en el rol de
una persona, que el esquema local ya acepta como texto (008/RF-19).

## Contrato de API

Todas abren con `requerirPermiso(peticion, 'laboratorio', acción)`, que ya incluye la guardia de
sesión y el rechazo por módulo apagado (403). Alcance con `filtroDeObra` / `alcanzaLaObra`; la
gerencia además con `filtroDeModulo('laboratorio', …)`. Un ensayo de otra obra responde 404, igual
que uno que no existe.

- `GET /api/panel/laboratorio/granulometrias?desde&hasta&obraId` (estado, franja, veredicto y
  material se filtran en la pantalla, como en Control Cantera; ver notas de T11)
  (`listar`) → `{ ensayos: EnsayoFila[], pendientes: number }`. Periodo obligatorio, máx. un año,
  sobre fecha de ejecución; los borradores sin fecha salen siempre. Sin descartados (RF-91).
- `POST /api/panel/laboratorio/granulometrias` (`escribir`) → 201 con el ensayo en borrador. La
  gerencia manda `obraId`; debe tener el módulo encendido.
- `GET /api/panel/laboratorio/granulometrias/:id` (`listar`) → `EnsayoDetalle` con resultado e
  historia.
- `PATCH /api/panel/laboratorio/granulometrias/:id` (`escribir`), parcial con los `*Parcial`:
  ausente = sin cambio, `null` = borrar. 409 si no está en borrador/devuelto.
- `POST …/:id/enviar` (`escribir`) · `…/aprobar` (`aprobar`) · `…/devolver` (`aprobar`, cuerpo
  `{ comentario }`) · `…/anular` (`anular`, `{ motivo }`) · `…/descartar` (`escribir`).
- `GET /api/panel/partes/:id/granulometrias` (`bitacoras`, `listar`) → vigentes del día si el
  parte está abierto, fijados si está cerrado, nada si el módulo está apagado en un parte abierto.

Códigos: **400** validación (con campo y mensaje) · **403** permiso o módulo apagado · **404** no
existe o de otra obra · **409** número de informe repetido (23505) o estado cambiado, con el
estado actual. Cada operación es **una sola sentencia**: no hay transacciones interactivas en Neon.

## Estrategia de verificación

**`scripts/verificar-reglas.ts`:**

- *Anexo C* (RF-44 a RF-50, RF-55): con las masas del Excel, los 15 `% pasa` a dos decimales
  (100,00 · 86,48 · 69,94 · 61,41 · 49,81 · 44,14 · 32,17 · 25,45 · 23,79 · 20,03 · 13,84 · 8,26 ·
  5,52 · 4,01 · 3,39), humedad 3,2, TM `2"`, TMN `1½"`, fondo sin `pasa`, veredicto `cumple`
  contra SBG-50.
- TM mayor que la serie cuando el 2" retiene (RF-51). División por cero y retenido faltante →
  `completo: false` con lo que falta (RF-56).
- Lavado: diferencia de 0,3 % exacto sin aviso; de 0,31 % con aviso; sin M2 sin aviso (RF-54).
- Veredicto: límite exacto cumple; 69,995 redondea a 70,00 y cumple contra mínimo 70 (RF-57,
  RF-58); un tamiz por debajo → `no_cumple` con `debajo` (RF-59, RF-61).
- `validarEnsayo`: cada rechazo de RF-33 a RF-39; borrador incompleto válido y envío incompleto
  rechazado (RF-31, RF-73).
- `claveDeInforme('No. 6 ') === claveDeInforme('no.6')` (RF-40).
- `transicionPermitida`: la tabla completa (RF-71 a RF-90).
- Permisos: el laboratorista solo ve `laboratorio`, entra por él, no aprueba ni anula; el
  residente aprueba y anula pero no escribe; solo la gerencia da el rol; con el módulo apagado
  nadie de la obra lo ve; `motivoParaNoDarRolEnObra('laboratorista', apagado)` da el texto
  (RF-1 a RF-10, RF-14, RF-92).
- Parte: `bloqueosDelCierre` con sección a mano vacía y `ensayosDelModulo: 1` no bloquea; con 0
  sí (RF-110).
- Catálogos: cada franja apunta a ids de tamiz existentes; límites `0 ≤ min ≤ max ≤ 100`.

**Demo manual** (Chrome, obra de prueba): el recorrido de *Criterios de finalización* de la spec,
añadiendo: un `POST` a una ruta de laboratorio con el módulo apagado responde 403; dos pestañas
de residente aprueban y devuelven a la vez y la segunda recibe 409; el informe impreso a PDF cabe
en una carta y la curva se ve nítida.

**Comprobaciones extra:** `npx expo export --platform web` (rutas nuevas del panel); no se toca
ningún secreto.

## Riesgos

- **`react-native-svg` en web.** Se usa en el celular; en el panel no se ha usado todavía. Se
  comprueba en la primera tarea de la curva con un dibujo mínimo en `npm run web`; si fallara, el
  plan se detiene y se pregunta antes de meter nada.
- **Impresión desde React Native Web.** El marco del panel (barra, menú) se imprimiría con el
  informe. Se mitiga con una hoja `@media print` que oculta todo menos el informe; se comprueba
  en la demo.
- **`ALTER TYPE … ADD VALUE` en producción.** No se puede revertir quitando el valor. Es
  inofensivo si nadie lo usa; si hubiera que revertir la spec, el valor se queda. Migrar con
  `scripts/migrar-produccion.ts` **antes** de la imagen nueva (base `preoperaocc`).
- **Error de fórmula.** Un redondeo distinto al del Excel haría desconfiar del módulo entero. Lo
  cubre el caso del anexo C, que exige los quince valores exactos.
- **Carrera en el cierre del parte.** La cubre la condición en el `WHERE` del cierre (ver
  decisiones); se prueba descartando un ensayo mientras se cierra, por lectura del SQL si la demo
  no alcanza a provocarlo.
- **Franjas sin confirmar.** Con solo SBG-50, un material de base no se puede ensayar contra su
  franja. No bloquea la implementación: añadir una franja es un dato en el catálogo y su prueba.
- **Dudas abiertas de la spec** (tara en húmeda y M2, definición de TM/TMN, papel, ½"): cada una
  vive en un solo sitio (`granulometria.ts`, `tamices.ts`, la hoja de impresión), así que la
  respuesta cambia una línea y su prueba, no la estructura.
