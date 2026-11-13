# Plan técnico — Spec 042, Importar documentos al Almacén con IA

> Lee antes `docs/constitucion.md` y el `spec.md` de esta carpeta.
> Aquí va el CÓMO. Si algo de esto cambia el comportamiento acordado, no se resuelve
> en el plan: se vuelve a la spec.

La importación junta piezas que ya existen y se probaron en otras specs:

- **Leer el archivo:** la revisión de archivos del asistente (028/040). Toma fotos, PDF, Excel y Word,
  comprueba que cada uno sea lo que dice ser y cuenta las páginas.
- **Citar y comprobar:** la cita por hoja y fila de la planificación (043), y la comprobación de que la
  cifra esté en la fila citada.
- **La llamada a la IA:** `llamarConEsquema`, una sola llamada con salida estructurada, sin reintentos y
  con tope de tiempo. Si la IA se corta, ya responde con el motivo.
- **La lectura por detrás:** la de la 044. La ruta responde 202, el trabajo sigue en el mismo proceso y
  queda escrito en una fila con su vencimiento.
- **El registro «todo o nada»:** el del almacén por WhatsApp (023). Es un lote serializable con los
  materiales nuevos y una sola sentencia para los movimientos, con ids fijos para el reintento.
- **El almacén de archivos y su entrega:** `guardar` y `leer` (R2 privado), y la ruta `media/[id]` con
  su guardia.

No se añaden dependencias.

## Módulos y archivos

### Reglas puras

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `src/shared/rules/permisos.ts` | Acción nueva `importar` en el módulo `almacen`: Gerencia, Almacenista, Director de Obra y Director de Proyectos. El Director de Obra no gana `escribir` | RF-1, RF-2, RF-78 |
| `src/shared/rules/almacen-importacion.ts` (nuevo) | Conversión de unidades (la del documento y las universales), el estado de cada renglón (qué bloquea y qué es aviso), la clave del documento repetido, el valor sacado del total, lo que la IA dejó por fuera, los límites del archivo y el armado de lo que se confirma | RF-9 a RF-17, RF-19 a RF-37, RF-43 a RF-45, RF-59, RF-60, RF-67 a RF-77, RF-79 a RF-85, RF-88 a RF-91 |
| `src/shared/rules/almacen-importacion-ia.ts` (nuevo) | Qué se le manda a la IA y qué se acepta de vuelta: texto con cita (Excel por hoja y fila, Word por línea numerada), comprobación de la cifra citada (`estaEnLaFila`) y las instrucciones | RF-7, RF-10 a RF-17, RF-19, RF-20, RF-25, RF-68, RF-72, RF-74, RF-75 |
| `src/shared/rules/almacen.ts` | Sin cambios de comportamiento. Se reutiliza `unidadDeTexto` (RF-79) y `aCentesimas` para los dos decimales (D31) | RF-79 |

### Servidor

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `src/features/almacen-obra/servidor/importaciones.ts` (nuevo) | Recibir el archivo, guardarlo, reservar la fila, correr la lectura por detrás, descartar las vencidas y listar las pendientes de quien importa | RF-3 a RF-9, RF-59 a RF-68, RF-94, RF-98 |
| `src/features/almacen-obra/servidor/con-ia.ts` (nuevo) | La llamada a la IA con el esquema de la propuesta, con `llamarConEsquema` y los bloques de `leerAdjuntos` | RF-7, RF-10 a RF-17, RF-62, RF-67 |
| `src/features/almacen-obra/servidor/confirmar.ts` (nuevo) | El lote «todo o nada»: materiales nuevos, ingresos, la importación marcada `confirmada` y el aviso de repetido mirado otra vez | RF-18, RF-38 a RF-46, RF-86 a RF-89 |
| `src/features/almacen-obra/servidor/estado-de-importacion.ts` (nuevo) | Consultar en qué va una lectura sin arrastrar el lector ni la IA (lo aprendido en la 044, T16) | RF-8, RF-65 |
| `src/features/almacen-obra/servidor/movimientos.ts` | El historial trae proveedor, tipo y número de documento, valor con su unidad y el id del documento original | RF-49, RF-50, RF-52 |
| `src/features/almacen-obra/servidor/excel.ts` y `src/features/almacen-obra/exportar.ts` | La hoja Movimientos suma cinco columnas | RF-51, RF-52 |
| `src/features/asistente/servidor/adjuntos.ts` | Se exporta la revisión de **un** archivo (hoy es privada) y se deja el número de páginas a la vista. Sin cambiar lo que hace para el asistente | RF-3 a RF-6, RF-59, RF-61 |
| `src/app/api/panel/media/[id]+api.ts` | Rama nueva para el dueño `almacen`: solo si la importación está confirmada y la obra está al alcance con permiso de ver el Almacén | RF-47, RF-92, RF-93, RF-95 |
| `src/features/servidor/respuestas.ts` | `duplicadoDe` explica el choque de una confirmación repetida | RF-89 |

### Rutas

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `src/app/api/panel/almacen/importaciones+api.ts` (nuevo) | `POST`: sube el archivo y arranca la lectura (202). `GET`: las propuestas pendientes de quien pregunta en esa obra | RF-1 a RF-9, RF-56, RF-59 a RF-66, RF-98 |
| `src/app/api/panel/almacen/importaciones/[id]+api.ts` (nuevo) | `GET`: estado y propuesta. `DELETE` no existe: descartar es `POST …/descartar` | RF-8, RF-65 |
| `src/app/api/panel/almacen/importaciones/[id]/confirmar+api.ts` (nuevo) | `POST`: la propuesta corregida, con `confirmarRepetido` | RF-28 a RF-46, RF-81 a RF-91 |
| `src/app/api/panel/almacen/importaciones/[id]/descartar+api.ts` (nuevo) | `POST`: la propuesta queda `descartada` y su archivo también | RF-48, RF-95 |

### Panel

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `src/features/panel/almacen-importacion.ts` (nuevo) | Esquemas Zod y tipos de peticiones y respuestas | Transversal |
| `src/features/panel/cliente-api.ts` | `api.almacen.importaciones` | Transversal |
| `src/features/almacen-obra/importar-documento.tsx` (nuevo) | Botón «Importar documento», escoger el archivo, progreso y la lista de pendientes | RF-3, RF-8, RF-64, RF-65, RF-98 |
| `src/features/almacen-obra/revisar-importacion.tsx` (nuevo) | La propuesta: datos del documento, renglones con su material, cantidad, unidad, conversión, valor y marcas; lo dejado por fuera; aviso de repetido; confirmar o descartar | RF-10 a RF-37, RF-43, RF-44, RF-58, RF-69 a RF-77, RF-81 a RF-91 |
| `src/features/panel/pantalla-almacen.tsx` | Monta el botón y la lista de pendientes donde lo permita `importar` | RF-1, RF-65 |
| `src/features/panel/historial-almacen.tsx` | Proveedor, documento, valor con su unidad y «Ver documento» dentro de la columna de detalle, sin columnas nuevas, para que la tabla siga cabiendo | RF-47, RF-49, RF-50, RF-52, RF-58 |

## Modelo de datos

- **Local** (`src/db/local/schema.ts`): sin cambios. El Almacén no baja al teléfono.
- **Servidor** (`src/db/servidor/esquema.ts`):
  - `dueno_media` gana el valor `almacen`, con `dueno_id` = la importación.
  - Enum nuevo `estado_importacion_almacen`: `en_curso | lista | fallida | confirmada | descartada`.
  - Tabla nueva `almacen_importaciones`:
    - `id`, `obra_id`, `media_id` (el archivo), `nombre_archivo`;
    - `estado`, `error`, `propuesta` (jsonb, lo que volvió de la IA ya pasado por la regla), `version`;
    - `vence_lectura_en` (la reserva de la lectura) y `vence_propuesta_en` (un día, RF-66);
    - `creado_por`, `creado_en`, `actualizado_en`;
    - `confirmada_en`, `confirmada_por`, `descartada_en`.
    - Índice `(obra_id, creado_por, estado)` para listar las pendientes (RF-65, RF-98).
    - Sin índice único por obra: se permiten varias a la vez (D32).
  - `almacen_movimientos` gana, todas nulas porque los movimientos anteriores no las tienen (RF-52, RF-57):
    - `proveedor`, `documento_tipo` (texto: `factura | remision | otro`), `documento_numero`;
    - `documento_clave`: proveedor y número normalizados, para el aviso de repetido (RF-45);
    - `valor_unitario` (`numeric(16,2)`) y `valor_unidad` (texto, la unidad del documento, RF-29, RF-58);
    - `importacion_id`, que apunta a `almacen_importaciones`.
    - Índice `(obra_id, documento_clave)`.
  - **No cambia** `cantidad numeric(14,2)`: dos decimales, como todo el Almacén (D31).
- **Migración**: `npm run db:generate:servidor` produce la `0044_*.sql`, solo con valores de enum,
  columnas nulas, la tabla y los índices nuevos. Se aplica a desarrollo (`neondb`). Producción la recibe
  después de la `0042` y la `0043`, con `scripts/migrar-produccion.ts`.
- **Compatibilidad**: sin teléfonos de por medio. Los movimientos anteriores quedan con las columnas
  nuevas vacías y se muestran como hoy.

## Algoritmo / reglas

**Subir (RF-1 a RF-9, RF-59 a RF-63, RF-94, RF-98).** Pasos en la ruta, antes de pagar a la IA:

1. Guardia: `requerirPermiso('almacen', 'importar')`. La obra sale del alcance, y del módulo Almacén
   activo (RF-56, RF-63).
2. Revisión del archivo con la de `adjuntos.ts`: tipo, que sea lo que dice ser, 20 MB, `.xls` y `.doc`
   viejos (RF-3 a RF-6). Luego los límites de esta spec, con la regla:
   - PDF de más de 10 páginas (RF-59);
   - Excel de más de 200 renglones con datos (RF-60);
   - PDF cifrado, si trae `/Encrypt` (RF-61).
3. El archivo se sube a R2, y la fila de `media` y la de `almacen_importaciones` (`en_curso`) se crean en
   un lote (RF-94).
4. Se responde 202 con el id. La lectura sigue por detrás, como en la 044.

**Leer (RF-7, RF-9 a RF-17, RF-62, RF-67, RF-68, RF-72 a RF-75).** Con el archivo ya revisado:

1. El contenido para la IA depende del formato:
   - **Foto o PDF:** van tal cual. El PDF escaneado lo lee el modelo como imagen, sin pasos aparte
     (RF-62).
   - **Excel:** va como texto con «H<hoja>F<fila>», con `textoParaLeer` de la 043.
   - **Word:** va con sus líneas numeradas «L<n>».
2. Junto al contenido van los materiales vigentes de la obra y las unidades de la lista. Así la IA escoge
   un material existente por su id, o propone uno nuevo (RF-19, RF-20).
3. La IA devuelve:
   - los datos del documento: proveedor, tipo, número, fecha, a quién va dirigido, conductor y
     transportador;
   - los renglones, cada uno con su cita, el nombre como viene, cantidad, unidad, valor unitario o total,
     moneda, factor de conversión con su texto, y el id del material o el nombre del nuevo;
   - lo que dejó por fuera, con el motivo;
   - cuántos proveedores y números vio.
4. La regla `propuestaDeLaLectura` arma la propuesta (lista con su orden):
   - Si ve más de un proveedor o número, no hay propuesta (RF-68). Si la IA se cortó, lo dice
     `llamarConEsquema` (RF-67). Sin renglones, `fallida` con el motivo (RF-9).
   - En Excel y Word, cada cifra se busca en su fila o línea. Si no está, se descarta y el renglón
     queda «Revisar» (RF-16).
   - La cantidad negativa va a «dejado por fuera» (RF-74). La moneda distinta deja el valor vacío, con
     aviso (RF-71).
   - Sin unitario y con total, el unitario es total ÷ cantidad, marcado «Calculado del total»
     (RF-69, RF-70).
   - La unidad se reconoce con `unidadDeTexto` (RF-79). Si no es la del material, la marca es «Unidad
     distinta» (RF-24). La cantidad convertida sale con el factor del documento o con la tabla de
     universales; si no hay ninguno, queda vacía (RF-25, RF-27, RF-80). Siempre se redondea a dos
     decimales (D31).
   - Un material dado de baja o inexistente que proponga la IA se trata como «Otro» nuevo (RF-22).
   - «Entregado por» es el conductor; si no hay, el transportador; si no hay ninguno, vacío (RF-13,
     RF-14, RF-72). La fecha es la del documento, o la de hoy en Colombia (RF-32, RF-33).
   - El destino distinto de la obra queda como aviso (RF-75).
5. La propuesta se guarda en la fila, que pasa a `lista`, con `vence_propuesta_en` = ahora + 24 h.

**Revisar (RF-28, RF-37, RF-43 a RF-45, RF-81 a RF-85, RF-90, RF-91).** `estadoDelRenglon(renglon,
material)` devuelve las marcas, cada una como **bloquea** o **aviso** (D12). Las usan la pantalla, para
señalar, y el servidor, para rechazar. `claveDelDocumento(proveedor, numero)` normaliza para el
repetido (RF-45) y vale `null` si falta uno de los dos (RF-90). El repetido se busca entre los
movimientos **vigentes** de la obra con esa clave; si están todos anulados, no hay aviso (RF-91).

**Confirmar (RF-34 a RF-46, RF-86 a RF-89).**

1. La regla vuelve a revisar lo que llega: fecha no futura en Colombia, cantidades mayores que cero,
   «Entregado por», nada que bloquee y material escogido. Responde con las faltas por renglón (RF-40).
2. Si hay repetido y no llegó `confirmarRepetido`, 409 con quién y cuándo (RF-43, RF-44).
3. Lote serializable, como el de WhatsApp:
   - los materiales nuevos, con id fijo de la importación y el índice único del nombre (RF-39, RF-41);
   - una sola sentencia de ingresos, que comprueba en la base que cada material siga vigente (RF-86) y
     que la importación siga `lista` con su `version` (RF-88). Si no, lanza a propósito y el lote se
     deshace;
   - la importación pasa a `confirmada`, con quién y cuándo (RF-42, RF-87).
4. Los ids de los movimientos salen de la importación y del renglón. Un reintento encuentra los suyos
   y no inserta nada; una segunda confirmación se encuentra la fila `confirmada` y responde 409 con
   quién y cuándo (RF-89).
5. Los ingresos no necesitan comprobar el stock: un ingreso nunca deja un saldo negativo.

**Lo que no cambia (RF-53 a RF-55, RF-57, RF-96, RF-97).** Un ingreso importado es una fila más de
`almacen_movimientos`, así que no se toca nada de esto:

- el stock lo sigue sumando `stockEnSql`;
- se anula con la ruta y la regla de la 009 (`rechazoDeAnulacion`), una fila a la vez;
- los movimientos siguen sin ruta para editarlos.

Se comprueba en la demo anulando uno de los ingresos de un documento.

**Vencer (RF-48, RF-66).** Nada corre solo. Cada vez que se lista o se abre una importación de la obra,
una sentencia marca `descartada` las `lista` con `vence_propuesta_en` pasado, y `fallida` las `en_curso`
con `vence_lectura_en` pasado. El archivo no se borra (RF-48); la ruta de medios no lo entrega (RF-95).

## Decisiones técnicas

- **La propuesta vive en una fila con su estado**, y la lectura corre por detrás, como en la 044 →
  se descartó devolver la propuesta en la misma petición, porque el proxy del VPS corta a 120 s y la
  lectura de una foto puede pasar de eso. Además RF-64 y RF-65 piden que sobreviva a cerrar la página.
- **Sentencia propia de ingresos en `confirmar.ts`** → se descartó generalizar la de WhatsApp
  (`escribirReporteDeAlmacen`) para que la usen las dos. Esa sentencia mezcla salidas con su guarda de
  stock y queda atada al mensaje; cambiarla pone en riesgo la bandeja de la 023 sin necesidad. Los
  ingresos solo necesitan la guarda de material vigente y la de la importación. Se copia el patrón
  (lote serializable, ids fijos, error a propósito), no el texto.
- **Acción nueva `importar` en la tabla de permisos** → se descartó dar `escribir` al Director de Obra,
  porque le abriría el registro a mano, que la spec niega (D4, D28). También se descartó comprobar el
  cargo dentro de la ruta: el principio 3 pide que el acceso se decida en un solo sitio.
- **Los datos del documento se repiten en cada movimiento** (proveedor, número, valor) → se descartó
  dejarlos solo en la importación y unir en cada consulta. El historial, el Excel y el repetido los leen
  por movimiento, y los ingresos de un documento pueden anularse por separado (RF-96). La importación
  queda para el archivo y la trazabilidad.
- **`documento_clave` como columna** → se descartó normalizar en cada consulta. La regla calcula la clave
  una vez (RF-45), y un índice hace barato el aviso (RF-43).
- **La propuesta, como `jsonb` en la fila** → se descartó una tabla de renglones. La propuesta es un
  borrador de un día que nunca se consulta por renglón. Lo que vale como evidencia son los movimientos.
- **El valor unitario no se convierte** (D8) y se guarda con `valor_unidad` en texto, porque la unidad
  del documento puede no estar en la lista («viaje»). Se descartó un enum por la misma razón.
- **Cita en Word por línea numerada** → se descartó citar «el párrafo» sin número, porque no se podría
  comprobar. El Word ya se lee línea por línea; aquí solo se numeran.
- **Vencer al consultar, sin tarea programada** → se descartó un temporizador: el servidor no tiene
  cron, y la 044 ya vence sus lecturas así.
- **El archivo se guarda con dueño `almacen` desde la subida** (D18) → se descartó guardarlo solo al
  confirmar, porque la lectura por detrás necesita leerlo de nuevo si el proceso se reinicia. Descartar
  no lo borra (principio 4).
- **El original sale por `media/[id]`**, con una rama para `almacen` → se descartó una ruta propia, como
  la del Excel de la planificación (043). Allá el archivo lleva costos que el Residente no debe ver;
  aquí el Residente ve los valores (D3), y la guardia genérica con el permiso de ver el Almacén basta
  (RF-92, RF-93).

## Impacto en la sincronización

Sin impacto en la sincronización. El Almacén es solo del servidor y del panel: nada baja al teléfono ni
sube de él.

## Contrato de API

Todas abren con `requerirPermiso` y filtran la obra con el alcance (principio 6). Una importación de
otra obra responde 404, nunca 403.

- **`POST /api/panel/almacen/importaciones?obraId=…`**
  - Cuerpo: los bytes del archivo, con su `Content-Type`, y su nombre en `X-Nombre-Archivo`.
  - Permiso: `almacen/importar`.
  - Respuestas:
    - 202 `{ importacionId }`;
    - 403 a Residente y demás cargos (RF-2);
    - 404 si la obra está fuera del alcance o el Almacén está apagado (RF-56, RF-63);
    - 413 si pasa de 20 MB (RF-6);
    - 422 si es `.xls` o `.doc`, si el contenido no es lo que dice, si tiene más de 10 páginas o 200
      renglones, o si es un PDF cifrado (RF-4, RF-5, RF-59 a RF-61).
- **`GET /api/panel/almacen/importaciones?obraId=…`**
  - Las de quien pregunta en esa obra que están `en_curso`, `lista` o `fallida` (RF-65, RF-98).
- **`GET /api/panel/almacen/importaciones/:id`**
  - Estado, error y, si está `lista`, la propuesta con `version`, marcas, dejado por fuera, avisos y
    el repetido calculado al momento.
  - La ve quien la creó; los demás con `importar` en esa obra reciben 404.
- **`POST /api/panel/almacen/importaciones/:id/confirmar`**
  - Cuerpo: `{ version, documento, renglones, confirmarRepetido }`.
  - Respuestas:
    - 200 `{ ingresos, materialesNuevos }`;
    - 400 con `faltas` por renglón (RF-34 a RF-37, RF-81 a RF-84);
    - 409 con `repetido` si falta confirmarlo (RF-43, RF-44);
    - 409 si ya se confirmó, con quién y cuándo (RF-89);
    - 409 si la versión cambió, si un material dejó de estar vigente, si un nombre nuevo choca o si la
      propuesta venció (RF-41, RF-86).
- **`POST /api/panel/almacen/importaciones/:id/descartar`**
  - 200. Descartar una que ya está confirmada responde 409.
- **`GET /api/panel/media/:id`** (rama nueva)
  - Entrega el original de una importación `confirmada` a quien puede ver el Almacén de esa obra.
  - En cualquier otro caso, 404 (RF-92, RF-95).
- **`GET /api/panel/almacen/movimientos`** y **`/almacen/exportar`**
  - Suman los campos nuevos; el resto de su contrato no cambia.

Sin transacciones interactivas: confirmar es un lote, y cada paso de la lectura es una sentencia
condicionada por estado.

## Estrategia de verificación

- **`scripts/verificar-reglas.ts`**, pruebas «042/» escritas antes de cada regla:
  - quién importa, por cargo (RF-1, RF-2, RF-78);
  - la clave del documento con tildes, espacios y guiones, `null` sin proveedor o número, y que los
    anulados no cuentan (RF-45, RF-90, RF-91);
  - las conversiones: «bulto x 50 kg», toneladas a kilos, sin factor, redondeo a dos decimales y el
    valor que no se convierte (RF-25 a RF-29, RF-80, D31);
  - las formas de escribir una unidad (RF-79);
  - qué marcas bloquean y cuáles avisan (RF-28, RF-37, RF-83 a RF-85);
  - el unitario sacado del total (RF-69, RF-70); la moneda distinta (RF-71); las cantidades negativas
    (RF-74);
  - la cifra que no está en la fila o la línea citada (RF-16);
  - más de un proveedor (RF-68); «Entregado por» con conductor, transportador o nada (RF-13, RF-14,
    RF-72);
  - la fecha de hoy en Colombia y la fecha futura (RF-33, RF-34);
  - los límites del archivo (RF-59, RF-60);
  - el Excel del Almacén con las columnas nuevas, y los movimientos viejos sin ellas (RF-51, RF-52).
- **Contra el servidor** (8082, base de desarrollo, obra de prueba):
  - cada código de estado del contrato;
  - el lote que se deshace entero con un material dado de baja o un nombre repetido;
  - dos confirmaciones a la vez;
  - el vencimiento;
  - el original que solo sale confirmado;
  - un Director de Obra de otra obra con 404.
- **Demo manual** en Chrome: los seis pasos de la spec, con una factura en PDF (bultos y un material
  nuevo), un Excel, un Word y una foto de remisión, y con Almacenista, Director de Obra y Residente.
- **Comprobaciones extra**: la IA lee un secreto, así que se exporta el web y se revisa con `grep` que
  `DATABASE_URL` y `ANTHROPIC_API_KEY` no aparezcan en `dist/client`. Además se mide el tiempo de una
  lectura de 3 páginas (requisito no funcional de 3 minutos).

## Riesgos

- **La IA empareja mal un material** («Cemento» con «Cemento blanco»).
  - Se detecta porque cada renglón muestra el nombre del documento junto al propuesto (RF-76).
  - Si pasa mucho, se ajustan las instrucciones de `almacen-importacion-ia.ts`, sin tocar el esquema.
- **Fotos borrosas con cifras mal leídas.** En foto y PDF no hay fila que comprobar.
  - Lo cubre la revisión humana antes de confirmar, con el documento a la vista.
  - Si la demo muestra errores frecuentes, se puede proponer un cambio: marcar «Revisar» todo renglón
    leído de una foto.
- **El servidor de desarrollo pierde memoria** si la consulta del estado arrastra la IA, como pasó en la
  044 (T16). Por eso el estado va aparte, en `estado-de-importacion.ts`.
- **Cambiar `adjuntos.ts` rompe el asistente.**
  - Solo se exporta lo que ya hace, sin cambiarlo.
  - Lo cubren la prueba de humo de archivos de la 040 y la demo de la 028.
- **El lote choca a menudo** con salidas simultáneas del mismo material: lo absorbe `conReintentoSiChoca`,
  igual que en WhatsApp.
- **Producción**:
  - La migración `0044` va después de la `0042` y la `0043`, antes de la imagen.
  - Si algo falla, las columnas nuevas son nulas y la tabla es nueva: la versión anterior sigue
    funcionando contra el esquema nuevo.
