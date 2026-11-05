# Plan técnico — Spec 040 Auxiliar Administrativa, asistente ampliado y archivos

> Estado: Aprobado (2026-11-05) · Spec aprobada el 2026-11-05. El usuario confirmó también: entrada a Compras, Pagos y gasto visibles, recibir sin pedir.
> Lee antes `docs/constitucion.md` y el `spec.md` de esta carpeta.
> Dependencias aprobadas por el usuario el 2026-11-05 (constitución, principio 8): `pdf-lib` (nueva) y `jszip` (ya instalada por `exceljs`; se declara en `package.json`).

## Idea general

Son tres frentes y van en este orden, porque cada uno se apoya en el anterior:

1. **El acceso.** Se renombra `auxiliar_rrhh` a `auxiliar_administrativa` y se abre su fila en la tabla de permisos. Casi todo el panel ya decide con `alcanza(...)`, así que el trabajo es la tabla, cuatro reglas que todavía preguntan `rol === 'admin'` y la regla del lugar de los cortes (D3).
2. **El alcance del asistente.** El alcance deja de ser solo «obras + módulos de obra» y suma las **empresas** y los módulos de empresa (compras, tesorería, finanzas, rrhh, documentos, solicitudes, bitácora de empresa). Se agregan las consultas nuevas, que reutilizan las funciones de servidor de cada pantalla.
3. **Archivos y UX.** Hay una consulta nueva, `generar_archivo`, que arma el PDF, el Excel o el Word con los datos que ya trajeron las consultas del turno, sin que la IA los copie. También se mejoran la pantalla del inicio, las aclaraciones con opciones y el aviso de qué se está consultando.

## Módulos y archivos

### 1. Auxiliar Administrativa (RF-1 a RF-11)

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `src/shared/rules/permisos.ts` | `auxiliar_rrhh` → `auxiliar_administrativa` en `ROLES`, `ETIQUETA_ROL` («Auxiliar Administrativa»), `QUIEN_ES` («la auxiliar administrativa»), `PUEDE_DAR` (sigue `['operador']`, D5), `MODULO_DEL_ROL`, `rolVeTodasLasObras`. En `TABLA`: `compras` y `tesoreria` pasan a `['ver','listar','escribir','anular','aprobar']`; `finanzas`, a `['ver','listar','escribir','anular']` (el lugar lo cierra la regla nueva, D3); `documentos` suma `anular`; `asistente` pasa a `['ver','listar']`. Se actualizan los comentarios del porqué. | RF-1, RF-3 a RF-8, RF-11, RF-12 |
| `src/shared/rules/compras.ts` | `PERMISO.recibir` acepta `solicitudes·escribir` **o** `compras·escribir` (la auxiliar no pide solicitudes, pero sí recibe desde Compras). `veElGasto` → gerencia y auxiliar. | RF-5 |
| `src/shared/rules/pagos.ts` | `veLosPagos` → gerencia y auxiliar: sin la pestaña Pagos no puede anular un pago. | RF-6 |
| `src/shared/rules/finanzas.ts` (**nuevo**, o dentro de `empresas.ts` si allí cabe) | `porQueNoPuedeTocarElCorte(rol, lugar)`: la gerencia, cualquiera; la auxiliar, solo `{ empresaId: 'elemental' }`; 403 con «Solo la gerencia registra o anula los cortes de …». | RF-7 (D3) |
| `src/app/api/panel/cortes+api.ts`, `cortes/[id]/anular+api.ts` | Después de `requerirPermiso`, se llama a la regla del lugar. En anular, primero se lee el lugar del corte. | RF-7 |
| `src/features/empresas/pantalla-finanzas.tsx` | `registra`/`anula` también consultan la regla del lugar: en OCC, Geolab y las obras, la auxiliar ve sin botones. | RF-7 |
| `src/shared/rules/ficha.ts` | `veElSalario`: el rol renombrado. | D4 |
| `src/shared/rules/empresas.ts` | El rol renombrado en `EMPRESAS_DEL_ROL`, `EMPRESA_DEL_ROL`, `ACCESOS_SIN_OBRA` («La Auxiliar Administrativa», «en Elemental lleva lo administrativo de todas») y las rutas de entrada. **Entra a Compras** (es donde está su bandeja) y ya no a Recursos Humanos. La ruta `asistente` también la lleva a Elemental. | RF-1, RF-3, RF-12 |
| `src/shared/catalogos/cargos.ts` | El cargo `auxiliar_rrhh` → `auxiliar_administrativa`, «Auxiliar Administrativa». | RF-1 |
| `src/features/compras/*`, `src/features/tesoreria/*`, `src/features/documentos/*` | Solo se revisan: los botones ya salen de `alcanza`/`puedeDar`. Se buscan con grep `'admin'` y textos «gerencia» que ahora mientan («Lo aprueba la gerencia»). | RF-4 a RF-6, RF-9 |
| `src/features/compras/servidor/solicitudes.ts`, `src/features/tesoreria/servidor/*` | Se revisa que el historial guarde `sesion.id` y que aprobar dos veces responda 409 con «ya fue aprobada por …». La versión ya lo cubre (036/037), así que solo se agrega el nombre al mensaje. | RF-9, casos límite |

### 2. Alcance y consultas del asistente (RF-12 a RF-17)

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `src/shared/rules/asistente.ts` | `ROLES_DEL_ASISTENTE` suma la auxiliar. `MODULOS_CONSULTABLES` suma `solicitudes`, `compras`, `tesoreria`, `finanzas`, `rrhh`, `documentos` y `bitacora_empresa` (el tipo pasa a `ModuloConPermiso`). `AlcanceDelAsistente` suma `empresas: EmpresaId[]` y cambia `bitacoraDeOcc` por `bitacorasDeEmpresa: EmpresaId[]`. `alcanceDelAsistente` se arma por rol, como dice RF-15 (ver «Algoritmo»). `LoQueConsulto` y `conversacionVisible` suman `empresas`. `ejemplosDePregunta` pasa a recibir el alcance. | RF-12 a RF-16 |
| `src/features/asistente/servidor/herramientas.ts` | `ejecutar` recibe también la sesión, para llamar a las mismas funciones de servidor que las pantallas, con el mismo filtro de lugar. Consultas nuevas: `solicitudes_de_compra` (con sus compras), `solicitudes_de_pago` (con sus pagos), `cortes_financieros` (cortes de un lugar y consolidado), `recursos_humanos` (personal, fichas, contratos por terminar, documentos por vencer; el salario solo si `veElSalario`), `documentos_del_grupo`. `bitacora_de_occ` se generaliza a `bitacora_de_empresa` con `empresa: 'occ' \| 'geolab'`. | RF-13 a RF-16, RF-20 |
| `src/features/compras/servidor/solicitudes.ts`, `tesoreria/servidor/*`, `empresas/servidor/cortes.ts`, `rrhh/servidor/*`, `documentos/servidor/documentos.ts`, `empresas/servidor/bitacora-occ.ts` | Si alguna lectura está pegada a la ruta, se saca a una función que reciba la sesión y los filtros, y la usan la ruta y la consulta. No se duplica ninguna lectura. | RF-20 |
| `src/features/asistente/servidor/conversacion.ts` | Las instrucciones de la IA explican las consultas nuevas, las reglas de los archivos y cuándo pedir una aclaración. Las consultas que se ofrecen siguen saliendo de `herramientasPara(alcance)`. | RF-13 a RF-18, RF-27 |
| `src/features/asistente/servidor/conversaciones.ts` | Guarda y lee `empresas` de la conversación. | RF-16 |

### 3. Archivos (RF-18 a RF-24) y UX (RF-25 a RF-29)

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `src/shared/rules/archivos-del-asistente.ts` (**nuevo**, puro) | El tipo `PedidoDeArchivo` (formato, título, bloques de texto y de tabla), `faltasDelPedido` (formato válido, sin tablas vacías, máximo `FILAS_MAXIMAS_POR_ARCHIVO = 5000`), `nombreDelArchivo` (título + fecha, sin caracteres raros), `encabezadoDelArchivo` (grupo, quién, fecha, fuentes), `aTabla(datos)` (convierte un arreglo de objetos planos en encabezados y filas, con su formato por columna), `venceEl(creado)` (+30 días) y `vigente`. | RF-18, RF-20 a RF-24 |
| `src/features/asistente/servidor/archivos/excel.ts` (**nuevo**) | Arma el libro con `exceljs` y reutiliza `escribirHojas` de `features/reportes/servidor/excel.ts`, que se saca a una función compartida si hoy no lo es: una hoja por tabla, números como números y fechas como fechas. | RF-21 |
| `src/features/asistente/servidor/archivos/pdf.ts` (**nuevo**) | `pdf-lib` con Helvetica: encabezado, texto, tablas que pasan de página repitiendo los títulos, número de página y la leyenda de `LEYENDA_DEL_PDF`. | RF-22 |
| `src/features/asistente/servidor/archivos/word.ts` (**nuevo**) | `.docx` escrito a mano (`document.xml`, `styles.xml`, `[Content_Types].xml`, `_rels`) y comprimido con `jszip`: encabezado, párrafos, títulos y tablas. | RF-22 |
| `src/features/asistente/servidor/archivos/generar.ts` (**nuevo**) | La consulta `generar_archivo`: resuelve las tablas a partir de los resultados del turno (ver «Algoritmo»), arma el archivo, lo sube a R2 con dueño `asistente` y propósito `archivo_generado` y devuelve `{ id, nombre, formato, filas }`. | RF-18 a RF-23 |
| `src/features/asistente/servidor/conversacion.ts` | Guarda los resultados del turno por `consultaId`, emite el evento `archivo` y el evento `aclaracion`, y describe la consulta en curso con `descripcionDeLaConsulta`. | RF-19, RF-27, RF-29 |
| `src/shared/rules/asistente.ts` | `loQueConsulta(alcance)`: las frases cortas por cargo (RF-25). `EJEMPLOS` por módulo y por cargo, con al menos uno que pida un archivo (RF-26). `descripcionDeLaConsulta(nombre, entrada)`: «Leyendo las solicitudes de compra de octubre…» (RF-29). | RF-25, RF-26, RF-29 |
| `src/app/api/panel/media/[id]+api.ts` | En la rama `asistente` con propósito `archivo_generado`, además de que la conversación sea suya, se exige que siga visible (`conversacionVisible`) y `vigente` (30 días). Si no cumple, 404 con «Ese archivo ya no está disponible». | RF-24, casos límite |
| `src/features/panel/contratos.ts` | `EventoDelAsistente` suma `archivo` y `aclaracion`. `MensajeDelAsistente` suma `archivos` y `aclaracion`. | RF-19, RF-27 |
| `src/features/asistente/tarjeta-de-archivo.tsx` (**nuevo**) | Ícono del formato, nombre, filas y «Descargar». Si venció: «Venció el …; pídalo de nuevo». | RF-19, RF-24 |
| `src/features/asistente/pantalla-asistente.tsx` | Inicio sin conversación: «Puede consultar…» con `loQueConsulta`, y ejemplos que **escriben** en el campo en vez de enviar. Las tarjetas de archivo van bajo la respuesta. Las opciones de aclaración salen como botones que envían esa opción. El aviso de espera usa la descripción. | RF-19, RF-25 a RF-27, RF-29 |
| `src/features/asistente/recuadro-del-inicio.tsx` | El mismo texto por cargo, en corto. | RF-25 |

### Fuera del código de la app

- `package.json`: `pdf-lib` y `jszip` en `dependencies`.
- n8n: sin cambios.

## Modelo de datos

La migración **0039**, escrita a mano porque drizzle-kit, ante un valor de enum renombrado, propone borrar y crear el tipo:

```sql
ALTER TYPE rol_usuario RENAME VALUE 'auxiliar_rrhh' TO 'auxiliar_administrativa';
UPDATE usuarios SET cargo = 'auxiliar_administrativa' WHERE cargo = 'auxiliar_rrhh';
ALTER TYPE proposito_media ADD VALUE IF NOT EXISTS 'archivo_generado';
ALTER TABLE asistente_conversaciones ADD COLUMN empresas jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE asistente_mensajes ADD COLUMN archivos jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE asistente_mensajes ADD COLUMN aclaracion jsonb;
```

- `RENAME VALUE` conserva cada fila: las auxiliares siguen con su acceso, su contraseña y su sesión (RF-2). Se corre `npm run db:generate:servidor` para que el snapshot quede al día y se reemplaza el SQL generado por este.
- `archivos`: `{ mediaId, nombre, formato: 'pdf'|'xlsx'|'docx', filas, creadoEn }[]`. Los bytes van a R2, como los adjuntos.
- `aclaracion`: `{ pregunta, opciones: string[] } | null`.
- `asistente_conversaciones.modulos` guarda ya los nombres nuevos, porque es jsonb y no hace falta migrarlo.
- **Móvil**: sin cambios de esquema. El rol del operador no se toca, y el celular no conoce este acceso.
- **R2**: los archivos vencidos no se borran del almacén. La ruta deja de entregarlos. Limpiarlos sería un trabajo aparte y con cuidado, porque R2 se comparte con producción.

## Algoritmo / reglas

### Alcance por cargo (RF-12 a RF-15)

```
admin                 obras: todas · empresas: las 4 · módulos: los de modulosVisibles + los 7 de empresa · bitácoras: occ, geolab
auxiliar_administr.   obras: todas* · empresas: [elemental] · módulos: solicitudes, compras, tesoreria, finanzas, rrhh, documentos
                      *solo para filtrar solicitudes, cortes y personal por obra; no ve bitácoras ni módulos de obra
supervisor            como hoy + solicitudes (de su obra; valores sí)
almacenista           como hoy + solicitudes (de su obra; sin valores: veLosValores)
encargado_planta      como hoy
laboratorista         como hoy + bitacora_empresa [geolab] + solicitudes (de Geolab)
encargado_occ         como hoy + bitacora_empresa [occ] + solicitudes (de OCC)
```

Cada módulo de empresa sale de `alcanza(rol, modulo, 'listar')` y cada empresa de `alcanzaLaEmpresa`, para no escribir una segunda tabla. Lo que no cuadra con eso (la auxiliar sin módulos de obra aunque `rolVeTodasLasObras`) se dice explícito en la función, con su RF.

### Archivos sin que la IA copie cifras (RF-20, RF-23)

1. Cada consulta del turno se guarda en memoria con un `consultaId` (`c1`, `c2`, …), que también va en lo que recibe la IA. Las consultas aceptan `para_archivo: true`. Con eso, si el resultado pasa de los 80 000 caracteres, a la IA le llega solo `{ filas, columnas, muestra: las primeras 20 }` en vez del error de hoy, y el servidor se queda con todo.
2. La IA llama a `generar_archivo({ formato, titulo, bloques })`. Cada bloque es `{ tipo: 'texto', markdown }` o `{ tipo: 'tabla', consulta: 'c2', tabla?: 'viajes', columnas?: [...] }`.
3. El servidor arma cada tabla con `aTabla(resultado.datos[tabla])` sacada del resultado guardado. **Las cifras salen de la consulta, no del texto de la IA.** Una tabla de una consulta que no está en el turno, o de otra persona, no existe: responde «Primero consulte esos datos».
4. `faltasDelPedido` revisa que haya formato, que el total de filas no pase de 5 000 (RF-23) y que no haya tablas vacías (caso límite). Si algo falta, se le devuelve a la IA, que se lo dice a la persona y propone acotar.
5. Se genera, se sube y se emite `archivo`. El mensaje guarda `{ mediaId, … }`.
6. Para Reportes, `aTabla` no adivina columnas: usa las `HojaDeReporte` de `reportes/exportar.ts`, así el Excel del asistente es igual al de Reportes.

### Aclaraciones (RF-27)

Hay otra consulta, `pedir_aclaracion({ pregunta, opciones })`, con 2 a 6 opciones que salen de una consulta. Por ejemplo, las obras sale de `obras_a_mi_alcance`. Cierra el turno sin gastar otra vuelta: el mensaje se guarda con `aclaracion`, y la pantalla pinta las opciones. Tocar una envía ese texto como pregunta nueva.

## Decisiones técnicas

- **Renombrar el valor del enum** (`auxiliar_administrativa`) en vez de dejar `auxiliar_rrhh` por dentro con otra etiqueta. Se descartó la etiqueta sola porque el código diría «RR. HH.» en cada `rol === ...` de alguien que aprueba compras y pagos, y AGENTS.md pide que el enum diga el acceso. `RENAME VALUE` es una sola sentencia y no toca filas.
- **La auxiliar aprueba por la tabla, sin un rol nuevo ni un tope** (D2). Se descartó un `aprobar_hasta` porque D2 lo descartó.
- **El lugar del corte en una regla aparte** (D3), en vez de partir `finanzas` en dos módulos. Se descartó partir el módulo porque el permiso es el mismo y lo que cambia es dónde, como pasa con `alcanzaLaEmpresa` en documentos.
- **`recibir` acepta `compras·escribir`** en vez de darle a la auxiliar `solicitudes·escribir`. Se descartó lo segundo porque la dejaría **pedir** compras a nombre de cualquier lugar, y eso no está en la spec.
- **Entrada de la auxiliar a Compras** en vez de Recursos Humanos. Se descartó quedarse en RR. HH. porque ahí no ve lo pendiente de aprobar, que es lo que pide el caso límite «Primer arranque».
- **Las consultas reciben la sesión** en vez de reescribir el filtro de lugar dentro del asistente. Se descartó reescribirlo porque serían dos copias de la misma regla (constitución, principio 3).
- **Las tablas de los archivos salen de los resultados guardados del turno** en vez de que la IA escriba las filas. Se descartó que las escriba porque no alcanzan los tokens de salida para 5 000 filas y porque una cifra copiada puede cambiar (RF-20).
- **El PDF con `pdf-lib`** en vez de reutilizar «imprimir» del navegador. Se descartó imprimir porque no deja un archivo que se pueda guardar 30 días ni volver a descargar (RF-24, D7).
- **El Word con `jszip` y XML a mano** en vez de la librería `docx`. Se descartó `docx` porque es otra dependencia y `jszip` ya está instalada y aprobada, y solo hacen falta párrafos, títulos y tablas.
- **Los archivos en R2 con `media`**, igual que los adjuntos, en vez de una tabla nueva. Se descartó la tabla nueva porque la ruta `media/[id]` ya resuelve dueño, permiso y descarga.
- **Vencer sin borrar**: después de 30 días el archivo deja de entregarse, pero el objeto sigue en R2. Se descartó borrarlo porque R2 se comparte con producción y la constitución pide no borrar (principio 4).

## Impacto en la sincronización

Sin impacto en la sincronización. El móvil no conoce este acceso ni el asistente.

## Contrato de API

- Las rutas de compras, pagos, cortes y documentos **no cambian de forma**. Aceptan a la auxiliar porque la tabla la deja pasar.
- `POST /api/panel/cortes` y `POST /api/panel/cortes/:id/anular`: 403 si la auxiliar intenta tocar un corte que no es de Elemental.
- `POST /api/panel/asistente/preguntar` (`text/event-stream`) suma dos eventos:
  - `archivo`: `{ id, nombre, formato, filas }`;
  - `aclaracion`: `{ pregunta, opciones }`.
  - `consultando` ahora trae una frase («Leyendo…») en vez del nombre de la consulta.
- `GET /api/panel/asistente/conversaciones/:id` devuelve en cada mensaje `archivos` y `aclaracion`.
- `GET /api/panel/media/:id` para un archivo generado: 200 con `Content-Disposition: attachment; filename="…"`; 404 si no es suyo, si la conversación ya no está a su alcance o si pasaron 30 días.
- Sin transacciones interactivas: subir el archivo y guardar el mensaje son dos pasos. Si el mensaje no se guarda, el objeto queda huérfano en R2 sin ruta que lo entregue. Es el mismo trato que reciben hoy los adjuntos.

## Estrategia de verificación

- **`scripts/verificar-reglas.ts`**:
  - Permisos: la tabla de la auxiliar módulo por módulo, `puedeDar` de cada paso de compra y pago con su rol, `recibir` con `compras·escribir`, la regla del lugar del corte (Elemental sí; OCC, Geolab y una obra no; la gerencia sí en todos), `PUEDE_DAR` sigue siendo solo `operador`, `veElSalario`, `veLosPagos`, `veElGasto`, y la etiqueta «Auxiliar Administrativa» en `ETIQUETA_ROL` y en el cargo (RF-1 a RF-11).
  - Alcance del asistente: un caso por cargo con sus módulos y empresas, `conversacionVisible` con empresas, y que la auxiliar no alcance bitácoras ni almacén (RF-12 a RF-16).
  - Archivos: `faltasDelPedido` (5 000 filas, tabla vacía, formato), `aTabla` (números siguen siendo números, fechas siguen siendo fechas), `nombreDelArchivo`, `vigente` en el día 30 y en el 31 (RF-18 a RF-24).
  - UX: `loQueConsulta` y `ejemplosDePregunta` por cargo, y `descripcionDeLaConsulta` (RF-25, RF-26, RF-29).
  - Se cambia el caso de la línea ~4517, que hoy nombra a la «Auxiliar de Recursos Humanos».
- **Prueba de humo de archivos** (un guion en `scripts/`, sin IA): genera un PDF, un Excel y un Word de 5 000 filas con tildes, ñ, «m³» y pesos. Los tiempos tienen que quedar por debajo de 20 s, y los tres se abren con su programa (RNF).
- **Demo manual** (la de la spec): una auxiliar `PRUEBA-040`:
  - aprueba una solicitud de compra de una obra y una de pago de OCC;
  - registra la compra y el pago;
  - anula un corte de Elemental y ve sin botón el de OCC;
  - en el asistente pide «las compras por aprobar» y un Excel con ellas.

  Después, un residente pide un PDF de la bitácora de su semana y no logra ver las compras de otra obra. Al terminar se borra solo lo `PRUEBA-040`.
- **Chrome** a 1366 px y a 390 px: inicio del asistente, ejemplos, tarjeta de archivo y opciones de aclaración.
- `npm run verificar`, `npm run typecheck` y `npm run lint` en verde.

## Riesgos

- **Que el renombre se escape en algún texto o consulta.** Se detecta con `grep -rn "auxiliar_rrhh\|Recursos Humanos" src scripts` al cerrar la T del acceso. Se revierte con `RENAME VALUE` al revés.
- **Producción con el código viejo y la base nueva, o al revés.** El rol renombrado rompe `TABLA[modulo][rol]`. La 0039 y el código se despliegan juntos en la T23 de la 033. Hasta entonces la 0039 queda **solo en dev**, como pasó con la 0037 y la 0038.
- **`pdf-lib` con Helvetica no dibuja caracteres fuera de WinAnsi** (emojis, algunos símbolos). `textoParaPdf` cambia lo que no se puede dibujar por un equivalente («-», «?») antes de escribirlo, y la prueba de humo incluye tildes, ñ, «m³», «°» y «±». Si no alcanza, se incrusta una fuente TTF, y eso pediría `@pdf-lib/fontkit`: otra aprobación.
- **La IA pide un archivo sin haber consultado antes.** `generar_archivo` lo rechaza y la IA consulta primero. Así está en sus instrucciones y en la prueba con una conversación real.
- **El turno con muchos resultados guardados ocupa memoria.** Son como máximo 5 000 filas por consulta y unas pocas consultas por turno, y se sueltan al terminar el turno.
- **La auxiliar ve más de lo que debe en el asistente** (bitácoras, almacén). El caso de alcance en `verificar-reglas.ts` lo cierra, y la segunda cerradura es `ejecutarHerramienta`, que vuelve a revisar el alcance.
