# Plan técnico — Spec 031

> Lee antes `docs/constitucion.md` y el `spec.md` de esta carpeta.
> Aquí va el CÓMO. Si algo de esto cambia el comportamiento acordado, no se resuelve
> en el plan: se vuelve a la spec.

## Módulos y archivos

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `src/shared/rules/contrato.ts` (nuevo) | `TIPOS_DE_CONTRATO` (los 13, en 3 grupos), `IMPUESTOS_SUGERIDOS`, `BASES_DE_IMPUESTO`, `plazoEnDias`, `faltasParaAprobarContrato` (contratante, tipo, número, fechas, valor, suma de integrantes = 100), `porcentajeValido`, `diferenciaConPresupuesto` | RF-8 a RF-22 |
| `src/shared/rules/polizas.ts` (nuevo) | `AMPAROS`, `estadoDePoliza(hasta, hoy)` → `vigente`/`por_vencer` (≤ 30 días)/`vencida`, `polizasConAviso` | RF-23 a RF-26 |
| `src/shared/rules/presupuesto.ts` (nuevo) | Tipos `EstructuraDePresupuesto` (grupos → capítulos → ítems, rubros, AIU); `totalDelItem` (redondeo al peso), `resumenDelPresupuesto` (subtotales por capítulo y grupo, obras, rubros, valor), `faltasParaAprobarPresupuesto`, `copiarParaNuevaVersion` (conserva ids), `itemsQueDesaparecen`, `unidadDelPresupuesto` (texto del Excel → unidad) | RF-31 a RF-40, RF-47 a RF-57, RF-69 |
| `src/shared/rules/formulario-presupuesto.ts` (nuevo) | `leerFormulario(filas)`, puro sobre una matriz de celdas: encabezados, grupos, capítulos, ítems, subtotales ignorados, rubros, AIU, «VALOR TOTAL»; devuelve estructura + diferencias (RF-45) + error explicado (RF-46) | RF-41 a RF-46 |
| `src/shared/rules/actividades-de-obra.ts` (nuevo) | `CatalogoDeActividades` (el fijo o el del presupuesto vigente, con capítulo y grupo), `catalogoDelPresupuesto(estructura)`, `etiquetaDeActividad` («4.1.8 · Alcantarillas · Vía La Ye–Yondo»), `buscarActividad` (sin tildes), `capitulosDelItem`, `reconocerCapitulo(texto, opciones)` | RF-58 a RF-60, RF-64 a RF-67 |
| `src/shared/catalogos/presupuesto.ts` | `actividadPorItem` sigue para el catálogo fijo; las reglas dejan de importarlo directamente y reciben el catálogo | RF-58 |
| `src/features/bitacoras/tipos.ts` | `ActividadDelParte`: `capituloId?`, `capitulo?`, `grupo?` (nombres congelados, como `unidad`) | RF-60, RF-62 |
| `src/features/bitacoras/parte.ts`, `bitacoras/servidor/secciones.ts` | `construirActividadDelParte(pedida, catalogo)`: con presupuesto vigente exige ítem + capítulo del presupuesto; sin él, el catálogo fijo | RF-58 a RF-63 |
| `src/features/presupuestos/servidor/*.ts` (nuevo) | Leer el vigente de una obra (`catalogoDeLaObra`), crear, importar, guardar con versión, aprobar, nueva versión, descartar; `leer-excel.ts` (libro → matrices, hecho en la T4) y `excel.ts` (exportar con `exceljs`) | RF-31 a RF-57, RF-73 |
| `src/features/contratos/servidor/*.ts` (nuevo) | Contrato (leer, guardar con versión, aprobar, volver a borrador), pólizas, documentos | RF-7 a RF-30 |
| `src/app/api/panel/contrato/…+api.ts` (nuevos) | `GET/PUT contrato?obraId=`, `POST …/aprobar`, `POST …/borrador`, `POST/… polizas`, `…/[id]/anular`, `…/[id]/reemplazar`, `POST documentos` (bytes), `…/[id]/anular` | RF-7 a RF-30 |
| `src/app/api/panel/presupuestos/…+api.ts` (nuevos) | `GET` lista y uno; `POST` en blanco; `POST importar` (bytes, `?confirmar=1`); `PUT [id]` (estructura + versión); `POST [id]/aprobar`, `[id]/nueva-version`, `[id]/descartar`; `GET [id]/exportar` | RF-31 a RF-57, RF-73 |
| `src/app/api/panel/media/[id]+api.ts` | Alcance de los archivos con dueño `contrato` (pólizas y documentos) por la obra del contrato | RF-23, RF-28 |
| `src/shared/rules/permisos.ts`, `menu.ts`, `features/panel/modulos.ts`, `iconos.tsx` | Módulo `contrato`: admin y supervisor `ver`, `listar`, `escribir`; `aprobar` solo admin. Grupo «Cliente» en el menú | RF-1 a RF-4 |
| `src/features/contratos/*.tsx`, `src/features/presupuestos/*.tsx` (nuevos), `src/app/panel/contrato.tsx` | Pantalla con selector de obra y pestañas Contrato y Presupuesto; formularios, listas, editor, vista previa de importación, versiones | RF-4 a RF-57, RF-70 a RF-72 |
| `src/features/panel/pantalla-partes.tsx` | Selector de actividad con capítulo y grupo cuando hay presupuesto vigente; sin precios | RF-58 a RF-63 |
| `src/app/api/panel/resumen+api.ts`, `pantalla-inicio.tsx` | Aviso de pólizas por vencer o vencidas | RF-25 |
| `src/shared/rules/whatsapp.ts`, `features/panel/contratos.ts` | `items_pago[].capitulo` en `propuestaDeIa`; `resolverPropuesta` con el catálogo de la obra: un solo capítulo → ese; si no, `reconocerCapitulo`; faltas «varios capítulos» y «no está en el presupuesto» | RF-64 a RF-67 |
| `src/features/whatsapp/servidor/catalogos.ts`, `excepciones.ts`, `no-se-pudo-guardar.tsx` | El catálogo de la obra en los catálogos; elegir el capítulo al atender la excepción | RF-66, RF-67 |
| `src/shared/rules/reportes.ts`, `reportes/servidor/datos.ts`, `pestanas-de-obra.tsx`, `exportar.ts` | `cantidadesPorItem` por ítem + capítulo, con contratado y % acumulado (lo reportado desde el primer día hasta el fin del periodo) | RF-68 |
| `C:/dev/n8n-evolutionapi/scripts/generar_workflow_clasificar.py` | `capitulo` (texto, `""` si no lo dice) en cada `items_pago`, con su instrucción | RF-64 |

## Modelo de datos

**Local** (`src/db/local/schema.ts`): sin cambios. El módulo es solo del panel.

**Servidor** (`esquema.ts`, migración `0028_*` con `npm run db:generate:servidor`):
- Enums nuevos:
  - `estado_contrato` (`borrador`, `aprobado`);
  - `estado_presupuesto` (`borrador`, `vigente`, `reemplazado`, `descartado`);
  - `estado_poliza_registro` (`activa`, `reemplazada`, `anulada`).
- Valor nuevo `contrato` en `dueno_media`. `ALTER TYPE … ADD VALUE` es aditivo.
- **`contratos`**:
  - una fila por obra (`obra_id` único);
  - columnas:
    - `estado`;
    - el contratante, en columnas (nombre, NIT, dirección, ciudad, correo, teléfono, representante e identificación);
    - `es_consorcio`, `nombre_consorcio`, `integrantes` (jsonb `[{nombre, nit, porcentaje}]`);
    - `tipo`, `numero`, `objeto`, `fecha_inicio`, `fecha_fin`, `plazo_dias`, `valor` (bigint);
    - `anticipo_porcentaje` y `retencion_porcentaje` (numeric 5,2);
    - `impuestos` (jsonb `[{id, nombre, porcentaje, base}]`);
    - `version` (int);
    - `aprobado_en` y `aprobado_por`;
    - `actualizado_por` y `actualizado_en`.
- **`contrato_eventos`** (RF-6 y RF-19): `id`, `contrato_id`, `accion` (`guardado` | `aprobado` | `a_borrador`), `motivo`, `usuario_id`, `en`.
- **`contrato_polizas`**:
  - `id`, `contrato_id`, `amparo`, `aseguradora`, `numero`, `valor` (bigint), `desde`, `hasta`;
  - `media_id` (nula);
  - `estado`, `reemplazada_por`;
  - `anulada_en`, `anulada_por`, `motivo_anulacion`;
  - `creada_por`, `creada_en`;
  - check: anulada ⇒ motivo.
- **`contrato_documentos`**:
  - `id`, `contrato_id`, `clase`, `fecha`, `descripcion`, `media_id`;
  - `anulado_en`, `anulado_por`, `motivo_anulacion`;
  - `subido_por`, `subido_en`.
- **`presupuestos`**:
  - `id`, `obra_id`, `nombre`, `numero_version` (int), `nota_version`, `estado`;
  - `estructura` (jsonb, el documento entero);
  - `valor` (bigint, copia de `resumen().valor` para listar sin leer la estructura);
  - `valor_excel` (bigint, nulo), `revisar` (bool, RF-44), `origen` (`excel` | `blanco` | `copia`);
  - `version` (int, para choques);
  - `aprobado_en/por`, `descartado_en/por`, `motivo_descarte`;
  - `creado_por/en`, `actualizado_por/en`.
  - Índices únicos parciales:
    - uno `vigente` por obra;
    - uno `borrador` por obra (RF-57).
  - Unique `(obra_id, numero_version)`.

`estructura` (en `shared/rules/presupuesto.ts`):

```ts
{
  aiu: { administracion: number; imprevistos: number; utilidad: number }, // fracciones: 0.2623
  grupos: [{ id, nombre, capitulos: [{ id, codigo, nombre,
    items: [{ id, renglon, item, icociv, especificaciones, descripcion, unidad,
              cantidad, valorUnitario, valorTotal, totalDelExcel? }] }] }],
  rubros: [{ id, grupoId?, nombre, unidad, cantidad?, valorUnitario?, valor }],
}
```

Sin grupos (RF-33): un único grupo con `nombre: ''` que la pantalla no muestra.

**Compatibilidad:**
- Todo es nuevo salvo tres campos opcionales en el jsonb de `actividades` del parte.
- Las actividades viejas no los traen y se leen igual (RF-62).
- La imagen anterior ignora las tablas nuevas.
- La migración es aditiva y va antes de la imagen.

## Algoritmo / reglas

**Leer el formulario** (`leerFormulario`, RF-41 a RF-46). Entrada: matriz de valores, la de la primera hoja que tenga la fila de encabezados.
1. Buscar la fila con «ÍTEM DE PAGO», «UND», «CANTIDAD» y «VALOR UNITARIO» (sin tildes ni mayúsculas, recortando espacios). La posición de cada encabezado da su columna. Sin esa fila → error «No encontré la fila de encabezados…».
2. Recorrer las filas siguientes:
   - número entero en la columna «Nº» y valor en «VALOR TOTAL» → **ítem** del capítulo actual;
   - texto en «Nº» o «ÍTEM DE PAGO» que empieza por «Subtotal» o «TOTAL» → se ignora;
   - texto en «Nº» sin número ni ítem de pago es un **título**. Si la siguiente fila con contenido es otro título, este es **grupo**; si es un ítem, es **capítulo**. En el Excel: la fila 12 es el grupo «Circuito Remedios…», la 13 el capítulo «CONSTRUCCIÓN DE ALCANTARILLAS» y la 65 el grupo «VIA LA YE-YONDO». No depende de palabras como «CONSTRUCCIÓN»;
   - fila «VÍA …» o título en la columna de descripción después de «SUBTOTAL OBRAS» → grupo de los rubros;
   - después de «SUBTOTAL OBRAS» y antes de «VALOR TOTAL», con descripción y valor → **rubro**, con su grupo si lo hay;
   - «VALOR TOTAL» → `valorDelExcel`;
   - «A=», «I=», «U=» → AIU.
3. Validar:
   - si no hay ítems → error «No encontré ítems…»;
   - si no hay «VALOR TOTAL» → error;
   - un ítem con `|cantidad × unitario − total| > 1` → diferencia de RF-45. El ítem se crea con el total calculado y `totalDelExcel` guardado.
4. `unidadDelPresupuesto`: «un»→`und`, «m3-Km»→`m3_km`, «Km»→`km` (unidad nueva en `UNIDADES_DE_ACTIVIDAD`), «m2», «m3», «m», «kg». Desconocida → se conserva el texto y el ítem queda con la falta «unidad» (RF-50).
5. Prueba con `docs/preupuesto.xlsx` en el verificador: hay que leer el Excel con `exceljs` en el guion y pasar la matriz a la regla pura. Resultado: 2 grupos, 14 capítulos, 76 ítems, 8 rubros, $54.441.800.920 sin diferencia.

**Resumen** (RF-35, RF-40):
- `valorTotal = round(cantidad × valorUnitario)`.
- Subtotal de capítulo = Σ ítems. Subtotal de grupo = Σ capítulos. Obras = Σ grupos.
- Valor = obras + Σ rubros.
- El AIU solo se muestra (D2).
- Cantidades redondeadas a 3 decimales al guardar (RF-69).

**Nueva versión** (RF-52, RF-53):
- `copiarParaNuevaVersion` copia la estructura **con los mismos ids** de grupos, capítulos e ítems.
- La identidad entre versiones es `item + capituloId`: un capítulo copiado conserva su id aunque se renombre.
- Un capítulo nuevo nace con id nuevo.
- `itemsQueDesaparecen(vigente, borrador, cantidadesReportadas)` lista los `item + capituloId` del vigente que no están en el borrador y tienen cantidad reportada (RF-54).

**Actividad de la bitácora con presupuesto** (RF-58 a RF-63):
- `catalogoDeLaObra(obraId)`: con vigente → entradas `{item, capituloId, capitulo, grupo, descripcion, unidad}`; sin vigente → el fijo, sin capítulo.
- La pantalla y el servidor usan el mismo catálogo.
- `construirActividadDelParte(pedida, catalogo)`:
  - con capítulo, busca `item + capituloId` en el catálogo y congela nombre, unidad, capítulo y grupo;
  - si la obra tiene vigente y la pedida no trae capítulo → 400 «Elija el capítulo».
- Una actividad ya guardada que vuelve sin cambios conserva lo que tenía, aunque no traiga capítulo (RF-62): se compara por `id`, como hoy las fotos.

**WhatsApp** (RF-64 a RF-67), en `resolverPropuesta` con el catálogo de la obra:
1. Si el ítem no está en el catálogo → falta «no está en el presupuesto» (RF-67).
2. Si `capitulosDelItem(item)` da uno → ese (RF-65).
3. Si da varios → `reconocerCapitulo(capituloEscrito + descripción, opciones)`. Se gana por palabras en común con el nombre del capítulo y del grupo, sin tildes: «alcantarilla», «Ye–Yondo»… Exactamente uno con más coincidencias → ese; si no → falta con los posibles (RF-66).

**Póliza** (RF-24):
- `vencida` si `hasta < hoy`.
- `por_vencer` si `hasta − hoy ≤ 30`.
- `vigente` en otro caso.
- Las reemplazadas y anuladas no avisan.

**Reportes → Actividades** (RF-68):
- Además de lo del periodo, una lectura de las cantidades por `item + capituloId` de todos los partes no anulados de la obra hasta el fin del periodo: el acumulado.
- % = acumulado / contratado del vigente.
- Lo sin capítulo va aparte, como «sin capítulo».

## Decisiones técnicas

- **La estructura del presupuesto en un jsonb por versión**, actualizada entera con `where version = ?`. Se descartaron las tablas de capítulos e ítems:
  - Neon por HTTP no da transacciones interactivas, y un cambio del editor tocaría muchas filas sin atomicidad;
  - copiar una versión serían cientos de inserts;
  - nadie consulta un ítem suelto en SQL: la bitácora, Reportes y la 032 leen el presupuesto entero, que pesa unos 40 KB con 76 ítems.
  - La bitácora referencia `item + capituloId`, que son estables entre versiones.
- **El catálogo de actividades se inyecta en las reglas** (`construirActividadDelParte`, `faltasDelReporte`, `resolverPropuesta`). Se descartó que las reglas lean el presupuesto: la constitución (principio 3) las quiere puras. El catálogo fijo pasa a ser una de las dos fuentes.
- **Capítulo y grupo congelados por nombre en la actividad**, además del `capituloId`, como ya se hace con `nombre` y `unidad`. Se descartó guardar solo el id: una bitácora cerrada debe seguir diciendo lo que decía, aunque la v3 renombre el capítulo (principio 4).
- **Importar en dos pasos con el mismo archivo** (`POST importar` → vista previa; `POST importar?confirmar=1` → crea). Se descartó que el navegador mande la estructura ya leída para crear: el servidor vuelve a leer y manda él, como con las medidas de la bitácora.
- **Leer el Excel con `exceljs`**, que ya está desde la 030, y la regla pura sobre la matriz. Se descartó otra librería, porque el principio 8 pide no sumar dependencias. Se descartó convertir a CSV en el navegador: se pierden los valores de las fórmulas.
- **Integrantes e impuestos como jsonb del contrato.** Se descartaron tablas propias: se editan con el formulario entero, son listas cortas y la 032 las lee completas. Las pólizas y los documentos sí tienen tabla, porque tienen vida propia (anular, reemplazar, archivo).
- **Choques por `version`** en contrato y presupuesto, con 409 «Otra persona cambió…; vuelva a cargar», como la bandeja de la 021. Se descartó «gana el último», porque la spec pide no pisar en silencio.
- **Archivos con dueño `contrato` en `media`**, reutilizando el almacén de R2 y la ruta `media/[id]`. Se descartó una ruta propia de archivos, que habría duplicado el alcance y la caché privada.
- **Aprobar = `aprobar` del módulo `contrato`**, solo para admin. Se descartó comprobar el rol a mano en la ruta: el permiso queda en la tabla de permisos, con su prueba.
- **Montos en `bigint` (pesos)** y porcentajes en numeric 5,2; los de AIU como fracción en el jsonb. Se descartó double para dinero.

## Impacto en la sincronización

- **Pull / push / outbox:** no cambian. El celular no ve el módulo ni el catálogo.
- **Idempotencia:** aprobar dos veces responde 409 la segunda, porque ya está vigente. La importación confirmada lleva un id derivado del sha256 del archivo y la obra, así que un doble clic no crea dos borradores; además, RF-57 lo impide con el índice parcial.
- **El servidor reevalúa** la actividad de la bitácora con el catálogo de la obra (RF-60) y el resumen del presupuesto al guardar. `valor` lo calcula él.

## Contrato de API

Todas con la guardia del panel (cookie), módulo `contrato`, y el alcance por obra de `alcanzaLaObra`: el residente solo la suya, gerencia con `obraId`.

| Ruta | Permiso | Respuestas |
| --- | --- | --- |
| `GET /api/panel/contrato?obraId=` | ver | 200 con contrato (o `null`), pólizas con estado, documentos |
| `PUT /api/panel/contrato` | escribir | 200; 400 validación (RF-14, RF-22); 409 si está aprobado (RF-18) o la versión cambió |
| `POST …/contrato/aprobar` | aprobar | 200; 400 con las faltas (RF-11, RF-17); 403 residente |
| `POST …/contrato/borrador` | aprobar | 200; 400 sin motivo |
| `POST …/contrato/polizas`, `…/polizas/[id]/anular`, `…/[id]/reemplazar` | escribir | 201 / 200; 400 sin motivo |
| `POST …/contrato/archivos?obraId=` (bytes) → `{ mediaId }`; `POST …/contrato/documentos` (JSON con `mediaId`) | escribir | 201; 413 > 20 MB; 415 mime (RF-30); 404/409 si el archivo es de otro contrato o ya está citado. *(Cambio en la T9: una sola ruta de subida para pólizas y documentos.)* |
| `POST …/contrato/documentos/[id]/anular` | escribir | 200; 400 sin motivo |
| `GET /api/panel/presupuestos?obraId=` | listar | lista sin estructura |
| `GET /api/panel/presupuestos/[id]` | ver | estructura + resumen + avisos |
| `POST /api/panel/presupuestos` (en blanco) | escribir | 201; 409 si ya hay borrador (RF-57) |
| `POST /api/panel/presupuestos/importar?obraId=[&confirmar=1]` | escribir | 200 vista previa / 201 creado; 422 formato (RF-46) |
| `PUT /api/panel/presupuestos/[id]` | escribir | 200; 409 no borrador o versión cambiada |
| `POST …/[id]/aprobar` | aprobar | 200; 400 faltas (RF-50); 409 con `desaparecen` sin `confirmar` (RF-54) |
| `POST …/[id]/nueva-version` | escribir | 201; 409 ya hay borrador |
| `POST …/[id]/descartar` | escribir | 200; 400 sin motivo; 409 si no es borrador |
| `GET …/[id]/exportar` | ver | `.xlsx` |

La bitácora (`PATCH partes/[id]`) acepta `capituloId` en cada actividad. Responde 400 si la obra tiene vigente y falta, o si `item + capituloId` no existe.

## Estrategia de verificación

En `scripts/verificar-reglas.ts`, con «031/»:
- **Contrato:** plazo, faltas para aprobar, suma ≠ 100, porcentaje fuera de rango, diferencia con el presupuesto.
- **Póliza:** vigente, por vencer a los 30 y 31 días, vencida, reemplazada sin aviso.
- **Presupuesto:** total del ítem redondeado, resumen con y sin grupos, faltas para aprobar, nueva versión con los mismos ids, ítems que desaparecen.
- **Formulario:**
  - el Excel real (2 / 14 / 76 / 8 / $54.441.800.920);
  - una matriz sin encabezados (error);
  - un ítem con total distinto (RF-45);
  - las unidades.
- **Actividades:**
  - catálogo del presupuesto;
  - etiqueta y búsqueda sin tildes;
  - `construirActividadDelParte` con capítulo, sin capítulo con vigente (null) y sin vigente (fijo);
  - una actividad vieja intacta.
- **WhatsApp:** un capítulo → ese; varios con «alcantarilla Ye-Yondo» → el correcto; varios sin pista → falta con los posibles; ítem fuera → falta; mensaje viejo sin `capitulo`.
- **Reportes:** por ítem + capítulo con contratado y %.
- **Permisos:** `contrato` admin y supervisor, y `aprobar` solo admin.

Demo en Chrome (dev, «Pruebas spec 018 (laboratorio)»): el recorrido de los criterios de finalización de la spec. La IA se prueba en el PC con un reporte que diga «alcantarilla vía Ye-Yondo».

## Riesgos

- **El Excel de otra obra con otra forma.** Se detecta en la vista previa: los conteos y la diferencia con el «VALOR TOTAL». Se corrige la regla con su caso, y mientras tanto se puede crear el presupuesto en blanco.
- **El selector de actividad con 76 ítems × capítulo** puede volverse pesado. Se mide contra el RNF de 300 ms; el catálogo se carga una vez por parte.
- **Aprobar el primer presupuesto de MAGDALENA cambia lo que exige la bitácora y WhatsApp.** Más actividades irán a «No se pudo guardar» por capítulo ambiguo. Se mide después de aprobar. Se revierte poniendo el presupuesto en `reemplazado`, sin borrarlo: la obra vuelve al catálogo fijo.
- **El esquema de la IA** está en el máximo de 16 `anyOf`. `capitulo` va como texto con `""`, no como nulo, para no sumar otro.
- **Despliegue:** migración 0028 (aditiva y con `ADD VALUE` al enum) antes de la imagen; clasificador después de probarlo en el PC.

## Cambio del 2026-10-21: leer con IA un Excel de otra forma (RF-74 a RF-87)

**Archivos:**
- `src/shared/rules/formulario-presupuesto.ts`:
  - «VALOR TOTAL» en una fila de encabezados no corta la lectura (la 2.ª fila de encabezado del Excel de planificación);
  - nueva `hojasDelPresupuesto(hojas)`: las que tienen la fila de encabezados (RF-76).
- `src/shared/rules/formulario-presupuesto-ia.ts`, regla pura con sus casos «031/IA»:
  - `textoParaLaIa(hojas)`: solo filas con contenido, cada una como `F<n>` + celdas separadas por tabulador, con el número de fila real; `null` si pasa de 1 500 filas (RF-77);
  - `LecturaDeIa`: la forma que devuelve la IA (grupos con nombre ya unido vía · sección, capítulos, ítems con `fila`, rubros con `grupo` por nombre o `null`, AIU y `valorTotalDelExcel`);
  - `estructuraDeLaIa(lectura, hojas, nuevoId)`: comprueba cada ítem contra su fila (RF-80, RF-81: la cantidad y el valor unitario tienen que estar entre los números de esa fila, con tolerancia de redondeo), arma la estructura con `normalizarEstructura`, calcula `diferencias` y `cuadra` como `leerFormulario` y devuelve `FormularioLeido & { rechazados }`.
- `src/features/servidor/ia.ts`: el cliente de Anthropic, uno solo para el panel (la 028 lo reutiliza). Lee `ANTHROPIC_API_KEY`; sin ella, la IA queda apagada y RF-87 responde «no se pudo leer con IA».
- `src/features/presupuestos/servidor/leer-con-ia.ts`:
  - llamada con `client.beta.messages.stream(...).finalMessage()`, modelo `claude-opus-5-5`, effort `medium`, salida estructurada con `zodOutputFormat` (zod ya está en el proyecto) y `fallbacks: "default"` (beta `server-side-fallback-2026-07-01`);
  - `timeout` de 3 min y `maxRetries` 1;
  - errores tipados del SDK (saldo, límite, conexión) → mensaje de RF-87;
  - `stop_reason` `refusal` o `max_tokens` → RF-87;
  - devuelve la lectura y los tokens.
- `src/features/presupuestos/servidor/importar.ts`: `leer()` intenta primero `leerFormulario`. Si falla o `!cuadra`, busca por huella en `presupuesto_lecturas_ia` (RF-84, RF-85) y, si no está, llama a la IA y guarda. `VistaPrevia` y el borrador ganan `leidoPor` y `rechazados`; con IA, `origen = 'excel_ia'` y `revisar = true` (RF-83).
- Migración 0029 en `src/db/servidor/esquema.ts`:
  - `origen_presupuesto` + `'excel_ia'`;
  - tabla `presupuesto_lecturas_ia` (`huella` pk, `lectura` jsonb, `modelo`, `tokens_entrada`, `tokens_salida`, `creado_por`, `creado_en`).
- Panel, `pestana-presupuesto.tsx`: el texto de espera (RF-86), el aviso «Leído con IA, revíselo» y la lista de no encontrados (RF-82), y la etiqueta «Excel (IA)» en las versiones.
- `compose.yaml`: `ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY:-}`, opcional como la de WhatsApp.

**Decisiones:**
- **Lector primero y la IA solo de respaldo.** Se descartó «siempre IA»: el formulario de OCC ya se lee exacto y gratis.
- **La IA no inventa ítems: cada uno cita su fila y se comprueba.** Se descartó confiar en la suma total. Un número mal leído y un ítem omitido se compensan y pueden cuadrar por casualidad.
- **La IA devuelve los nombres de grupo ya unidos (vía · sección).** Se descartó un tercer nivel en la estructura, que habría cambiado la bitácora, los reportes, WhatsApp y el editor (031 entera).
- **Salida estructurada (`output_config.format`) y no tool use**, porque se quiere un JSON, no una acción. El esquema no lleva uniones: lo vacío va como `""` o `0`.
- **Lectura guardada por huella del archivo.** Confirmar y volver a subir no cobran (RF-84, RF-85). Además, la vista previa y el borrador son idénticos.

**Verificación:**
- Casos «031/IA» en el verificador:
  - texto de la hoja con número de fila;
  - tope de 1 500;
  - ítem con número que no está en su fila → rechazado;
  - grupo «VÍA · SECCIÓN»;
  - IVA como rubro de su grupo;
  - el formulario de OCC sigue saliendo por el lector.
- La llamada real se prueba en dev con el Excel de planificación: conteo, valor contra «VALOR TOTAL DEL CONTRATO» y una sola fila en `presupuesto_lecturas_ia` tras vista previa + confirmar.

**Riesgos:**
- **Tiempo:** una lectura de unos 100 ítems puede tardar de 1 a 3 min. Hay que comprobar que el proxy del VPS no corte la petición antes; si corta, se sube su tiempo de espera solo para `presupuestos/importar`.
- **Costo:** unas 20 000 fichas de entrada y 15 000 de salida por archivo (≈ US$0,40 con Opus 5.5), una sola vez por archivo.
