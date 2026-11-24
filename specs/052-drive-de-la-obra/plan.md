# Plan técnico — Spec 052, el Drive de la obra

> Lee antes `docs/constitucion.md` y el `spec.md` de esta carpeta.
> Aquí va el CÓMO. Si algo de esto cambia el comportamiento acordado, no se resuelve
> en el plan: se vuelve a la spec.

Estado: **aprobado** por Diego el 2026-11-20, con el cambio D12 en la spec (más de 50 MB no se copia).

## Lo que ya está y se reutiliza

- **La guardia de la integración** (`src/features/servidor/guardia-integracion.ts`): token Bearer comparado en
  tiempo constante contra su SHA-256, cerrada por defecto. Hoy lee `TOKEN_INTEGRACION_WHATSAPP`. Se generaliza
  para recibir qué variable leer, sin cambiar el comportamiento de WhatsApp. `scripts/token-integracion.ts` sirve
  igual para emitir el token del Drive.
- **El pulso de WhatsApp** (`integraciones/whatsapp/pulso+api.ts`): n8n llama cada cierto tiempo y el servidor
  avanza el trabajo pendiente. Se copia la idea para las lecturas.
- **La subida de bytes de WhatsApp** (`integraciones/whatsapp/mensajes/[id]/archivo+api.ts`):
  - `PUT` con los bytes y su `content-type`;
  - primero el almacén (R2), después la fila;
  - la huella SHA-256 para no duplicar.
- **El almacén** (`features/media/servidor/almacen.ts`, `claveDeObjeto`, `guardar`), la tabla `media`, y la
  salida única por `/api/panel/media/[id]`, con su comprobación por dueño.
- **Los lectores sin dependencias:**
  - `leerWord` (`asistente/servidor/leer-word.ts`) para el Word;
  - `hojasDelLibro` (`presupuestos/servidor/leer-excel.ts`) para el Excel;
  - `paginasDelPdf`, `esPdf` y `esZip` (`shared/rules/archivos-subidos.ts`) para revisar los archivos;
  - `pdf-lib`, que ya está en el proyecto, para partir un PDF por páginas.
- **La IA:**
  - `clienteDeIa`, `MODELO_DE_IA` y `mensajeDeFalloDeIa` (`features/servidor/ia.ts`);
  - la salida estructurada con zod, como en `planificacion/servidor/leer-con-ia.ts`;
  - `costoEstimado` (`shared/rules/asistente.ts`) para llevar la cuenta.
- **El asistente:**
  - `herramientas.ts` con `herramientasPara` y `ejecutarHerramienta`, que vuelve a comprobar el alcance;
  - `alcanceDelAsistente` y `obraAlAlcance` (`shared/rules/asistente.ts`);
  - las fuentes con ruta.
- **Permisos y alcance:** `shared/rules/permisos.ts` (la tabla, `alcanza`, `rolVeTodasLasObras`) y
  `features/servidor/alcance.ts` (`alcanzaLaObra`, `alcanzaLaImagen`).
- **`normalizar`** (`shared/rules/texto.ts`), para buscar sin tildes ni mayúsculas.
- **El panel:**
  - `MarcoPantalla`, `BarraDeListado`, `Tabla` (que pasa a tarjetas), `ListaVacia` y `Cifras` (spec 050);
  - el menú de la obra (`shared/rules/empresas.ts`, `features/panel/modulos.ts`).

## Módulos y archivos

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `src/shared/rules/drive.ts` | **Nuevo, puro.** `cambiosDelInventario(registrados, inventario)` → qué pedir, qué retirar, qué vuelve, qué se renombró o movió. `inventarioAceptable` (la protección contra listados incompletos). `versionVigente` (la de fecha de modificación en Drive más reciente). `claseDeArchivoDelDrive(mime, nombre)` → `pdf` \| `imagen` \| `word` \| `excel` \| `texto` \| `no_admitido`. `fragmentar(paginas)` → trozos de ~1 500 caracteres que respetan los renglones y llevan su página. `estadoDelDocumento` → «Leído», «Leyendo», «No se pudo leer» o «Retirado del Drive». `TAMANO_MAXIMO_DE_LECTURA` (50 MB) e `INTENTOS_DE_LECTURA` (3) | 1, 4, 12, 15–21, 25, 26, 30, 35 |
| `src/shared/rules/permisos.ts` | Módulo nuevo `drive` en `MODULOS_DE_EMPRESA`, solo en el menú de la obra. Gerencia: `ver`, `listar`, `escribir`, `activar`. Director de proyectos, director de obra y residente: `ver`, `listar`, `escribir`. Los demás, nada. `escribir` es «volver a leer» y `activar` es asociar la carpeta | 9, 33, 36, 37 |
| `src/shared/rules/empresas.ts`, `src/features/panel/modulos.ts` | «Drive» en el menú de la obra, para quien tiene `ver` | 29 |
| `src/shared/rules/asistente.ts` | `drive` en `MODULOS_CONSULTABLES`. El alcance sale de la tabla de permisos, sin regla aparte | 22, 28 |
| `src/db/servidor/esquema.ts` + migración `0051_…` | Tablas `drive_carpetas`, `drive_archivos`, `drive_versiones` y `drive_fragmentos`; enum `estado_lectura_drive`; valor `drive` en `dueno_media` (ver Modelo de datos) | 1–21 |
| `src/features/servidor/guardia-integracion.ts` | `requerirIntegracion(peticion, variable = 'TOKEN_INTEGRACION_WHATSAPP')`: la del Drive lee `TOKEN_INTEGRACION_DRIVE`. Un token no abre la otra integración | 2, 3 |
| `src/features/panel/contratos.ts` | `inventarioDelDrive` (lo que manda n8n), `carpetaAsociada`, y las formas de respuesta de la lista | 1, 8, 29–35 |
| `src/app/api/integraciones/drive/inventario+api.ts` | **Nueva.** `POST`: registra la carpeta, aplica los cambios y responde qué archivos tiene que mandar n8n | 1, 4, 6, 8, 10, 19–21, 34 |
| `src/app/api/integraciones/drive/archivos+api.ts` | **Nueva.** `PUT ?carpeta=&archivo=&modificado=`: los bytes de una versión → almacén + `media` + versión en «pendiente» | 1, 4, 5, 7, 17, 18 |
| `src/app/api/integraciones/drive/pulso+api.ts` | **Nueva.** `POST`: lee versiones pendientes durante unos 4 minutos y reintenta las fallidas | 12–16 |
| `src/features/drive/servidor/inventario.ts` | **Nuevo.** Aplica `cambiosDelInventario` a la base con sentencias que resisten el reintento | 1, 4, 6, 19–21 |
| `src/features/drive/servidor/leer.ts` | **Nuevo.** La lectura de una versión:<br>· **PDF:** se parte en piezas de 20 páginas con `pdf-lib`, y la IA transcribe cada pieza página por página.<br>· **Imagen:** la transcribe la IA.<br>· **Word y Excel:** con los lectores locales, sin IA.<br>· **Texto:** tal cual.<br>Al final, un resumen con la IA. Guarda los fragmentos y los tokens | 7, 12–16 |
| `src/features/drive/servidor/buscar.ts` | **Nuevo.** `buscarEnElDrive(obraId, texto, { conVersiones, conRetirados })` → los fragmentos que más coinciden, con su documento, subcarpeta, página y `mediaId`. La usan el asistente y, después, la 053 | 22–28, 38 |
| `src/features/drive/servidor/lista.ts` | **Nuevo.** La lista de la obra para el panel, con búsqueda; las carpetas sin obra para la gerencia; asociar; volver a leer | 8–10, 29–35 |
| `src/app/api/panel/drive/documentos+api.ts` | **Nueva.** `GET ?buscar=`, filtrado por la obra en uso con `alcance.ts` | 29–31, 34–37 |
| `src/app/api/panel/drive/carpetas+api.ts`, `carpetas/[id]+api.ts` | **Nuevas.** `GET`: las carpetas sin obra (gerencia). `PATCH`: asociar o cambiar la obra (`activar`) | 8–10 |
| `src/app/api/panel/drive/versiones/[id]/releer+api.ts` | **Nueva.** `POST`: una versión «No se pudo leer» vuelve a «pendiente», con los intentos en 0 | 33 |
| `src/app/api/panel/media/[id]+api.ts` | Dueño `drive`: la obra de la carpeta, comprobada con `alcanzaLaImagen` y el módulo `drive` | 5, 24, 32, 37 |
| `src/features/asistente/servidor/herramientas.ts` | Consulta nueva `drive_de_la_obra(obra, pregunta, versiones?, retirados?)`. Llama a `buscarEnElDrive` y devuelve fragmentos con su fuente, que abre la copia | 22–28 |
| Instrucciones del asistente (`conversacion.ts`) | Una línea: lo del Drive se cita con documento y subcarpeta; si no está, se dice; los retirados se marcan | 23, 26, 27 |
| `src/app/panel/[obra]/drive.tsx` (o la ruta equivalente del menú de la obra) | **Nueva**, de una línea: reexporta la pantalla | 29 |
| `src/features/drive/pantalla-drive.tsx` | **Nuevo.** Encabezado con la carpeta y la última entrega; cifras (leídos, leyendo, no se pudo leer, retirados); `BarraDeListado`; lista en tarjetas con nombre, subcarpeta, fecha, resumen y estado; Abrir y Descargar, también las versiones viejas; «Volver a leer». A la gerencia, en una obra sin carpeta, «Conectar carpeta» con las que no tienen obra | 8–10, 29–35 |
| `src/features/panel/cliente-api.ts` | `api.drive.{documentos, carpetas, asociar, releer}` | — |
| `scripts/verificar-reglas.ts` | Casos de `drive.ts`, de las filas nuevas de permisos, de la guardia con dos variables y del contrato del inventario | ver Verificación |
| `docs/integracion-drive.md` + `docs/n8n/drive-de-la-obra.json` | **Nuevos.** El flujo de n8n para importar, con los pasos para conectar la cuenta de Google y la carpeta | 1, 6, 7 |
| `.env.ejemplo`, `docs/despliegue.md` | `TOKEN_INTEGRACION_DRIVE` (el hash); subir `client_max_body_size` a 55m en la ruta de integraciones | 2, 5 |

## Modelo de datos

- **Local** (`src/db/local/schema.ts`): **sin cambios.** El celular no ve nada de esto.
- **Servidor** (`src/db/servidor/esquema.ts`):
  - `drive_carpetas`:
    - `id` (el id de la carpeta raíz en Drive), `nombre`;
    - `obra_id` nulo, `asociado_por`, `asociado_en`;
    - `ultima_entrega_en`, `archivos_en_la_ultima_entrega`;
    - fechas de creado y actualizado.
    - Una carpeta, una obra, como `whatsapp_grupos` (RF-8 a RF-11).
  - `drive_archivos`:
    - `id` uuid, `carpeta_id`, `drive_id`, con índice único (`carpeta_id`, `drive_id`) (RF-21);
    - `enlace`, la dirección del archivo en Drive, para abrir lo que no tiene copia (RF-41);
    - `nombre`, `subcarpeta` (la ruta dentro de la raíz, «Oficios/2026»), `mime`;
    - `retirado_en` nulo (RF-19, RF-20);
    - fechas.
  - `drive_versiones`:
    - `id` uuid, `archivo_id`;
    - `modificado_en_drive`, con índice único (`archivo_id`, `modificado_en_drive`) (RF-4);
    - `media_id` nulo (sin copia cuando pasa de 50 MB, RF-40), `bytes`;
    - `estado` (`pendiente` \| `leyendo` \| `leido` \| `no_se_pudo`), `motivo`, `intentos`, `leyendo_desde`;
    - `resumen`, `paginas`;
    - `tokens_entrada`, `tokens_salida`, `leido_en`;
    - fechas.
    - Nunca se borra ni se sobrescribe una versión leída (RF-18, principio 4).
  - `drive_fragmentos`:
    - `id`, `version_id`, `orden`, `pagina`, `texto`;
    - `buscable tsvector`, calculado al insertar como `to_tsvector('spanish', <texto normalizado>)`, con índice
      GIN.
  - `dueno_media` gana `drive`: el dueño de la copia es la versión.
- **Migraciones:**
  - `npm run db:generate:servidor` genera `drizzle/servidor/0051_…`. El `ALTER TYPE … ADD VALUE` del enum va
    aparte, como en las migraciones anteriores que ampliaron enums.
  - Se aplica en desarrollo con `db:migrar:servidor`. En producción, al desplegar, con
    `scripts/migrar-produccion.ts`.
- **Compatibilidad:** sin efecto en los teléfonos.

## Algoritmo / reglas

**Inventario** (cada 5 minutos, n8n → `POST inventario`):
1. n8n recorre la carpeta raíz y sus subcarpetas en Drive, y manda el inventario:
   - la carpeta, con su id y nombre;
   - `completo: true` solo si listó todas las subcarpetas sin error;
   - de cada archivo: `driveId`, `nombre`, `ruta`, `mime`, `modificadoEn`, `tamano` y `enlace` (la dirección del archivo en Drive, RF-41).
   Los documentos y hojas de Google van con el mime de su exportación (RF-7).
2. El servidor crea la carpeta si no existía (sin obra, RF-10) y anota la entrega (RF-34).
3. `cambiosDelInventario` compara con lo registrado:
   - **nuevo** (`driveId` sin registrar) → pedir (RF-1, RF-6);
   - **cambiado** (`modificadoEn` posterior a todas sus versiones) → pedir (RF-17). Una fecha igual o anterior
     a una versión que ya existe no pide nada (RF-4);
   - **renombrado o movido** → actualizar `nombre` y `subcarpeta`, sin versión nueva (RF-21);
   - **ya no está** → `retirado_en = ahora` (RF-19), **solo si `inventarioAceptable`**;
   - **vuelve a estar** → `retirado_en = null` (RF-20).
4. `inventarioAceptable` responde no si:
   - el inventario no viene `completo`;
   - o retiraría más de la mitad de los vigentes de una sola vez (y más de 10).
   En ese caso se aplican las altas y los cambios, pero no los retiros, y se escribe en el log del servidor. Es
   la protección contra un listado a medias de la API de Google (riesgo 1).
5. Un archivo nuevo o cambiado de más de 50 MB **no se pide**: se registra su versión sin copia, en
   `no_se_pudo` con «demasiado grande» (RF-40, D12).
6. La respuesta dice qué pedir: una lista de `{ driveId, modificadoEn }`. Si la carpeta no tiene obra, igual se
   pide: se guardan y se leen, pero solo los ve la gerencia (RF-10, RF-39).

**Subida** (n8n → `PUT archivos`, uno por archivo pedido):
1. Se guardan en R2 los bytes de la versión, se crea la fila en `media` (dueño `drive`) y la versión en
   `pendiente`.
2. Si esa versión ya existe, responde 200 y no hace nada (RF-4).
3. Si llega algo de más de 50 MB (n8n no debería mandarlo), se rechaza con 413 sin guardar nada (D12).

**Lectura** (n8n → `POST pulso`, cada 5 minutos, después del inventario):
1. Toma versiones `pendiente`, o `leyendo` con `leyendo_desde` de hace más de 10 minutos (una lectura cortada),
   de la más antigua a la más nueva. Va de a una hasta gastar unos 4 minutos.
2. La marca `leyendo` con un `UPDATE … WHERE estado = …`, para que dos pulsos no lean la misma.
3. Según `claseDeArchivoDelDrive`:
   - **PDF:** con `pdf-lib` se parte en piezas de hasta 20 páginas. Cada pieza va a la IA como bloque
     `document`, con salida estructurada `{ paginas: [{ pagina, texto }] }` y la instrucción de transcribir
     tal cual, sin resumir; un escaneado se lee igual (RF-14). Una pieza que falla corta la versión.
   - **Imagen:** un bloque `image`, con la misma salida.
   - **Word y Excel:** `leerWord` y `hojasDelLibro`, sin IA. Una «página» por hoja del Excel.
   - **Texto:** se decodifica como UTF-8.
   - **No admitido** (video, audio, zip…): `no_se_pudo` con «tipo no admitido».
4. Si no sale texto, `no_se_pudo` con «sin texto». Si sale texto, `fragmentar` y se insertan los fragmentos con
   su `tsvector`.
5. Un resumen: la IA recibe hasta 60 000 caracteres del texto y devuelve unas 3 a 5 frases. Pasa a `leido`, con
   los tokens.
6. Si la lectura falla:
   - **causa pasajera** (red, IA ocupada, tiempo agotado): `intentos + 1`, y vuelve a `pendiente` hasta 3 veces
     (RF-16);
   - **causa definitiva** (archivo dañado o protegido con contraseña, que `pdf-lib` no abre): `no_se_pudo` con
     el motivo, sin reintentos (RF-15).
   Los fragmentos de un intento fallido se borran antes de reintentar. Son datos derivados de la versión, no
   evidencia: el archivo y la versión no se tocan.

**Búsqueda** (asistente y 053):
1. `buscarEnElDrive` normaliza la pregunta y consulta los fragmentos de la obra con
   `websearch_to_tsquery('spanish', …)`, ordenados por `ts_rank`.
2. Por defecto filtra la versión vigente de cada archivo no retirado (RF-25, RF-26). Con las opciones,
   incluye las versiones viejas o los retirados, marcados como tales.
3. Devuelve hasta 8 fragmentos, sin pasar de unos 12 000 caracteres, cada uno con su documento, subcarpeta,
   página, `mediaId` y estado. El asistente cita con eso (RF-23, RF-24). Sin coincidencias, devuelve vacío, y
   las instrucciones dicen que lo diga (RF-27).
4. Quién ve qué: el alcance lo comprueba `ejecutarHerramienta` con `obraAlAlcance`, más el módulo `drive` en la
   tabla de permisos (RF-28, RF-36).

## Decisiones técnicas

- **Inventario completo cada 5 minutos, en vez de los disparadores de Google Drive en n8n.** Se descartaron los
  disparadores «archivo creado» y «archivo cambiado» porque vigilan una sola carpeta, sin sus subcarpetas, y no
  avisan de los borrados. Con el inventario completo, el servidor ve las altas, los cambios, los movimientos y
  los retiros con una sola regla pura, y n8n no guarda estado. Lo que cuesta son las llamadas de listado a
  Google: unas pocas por subcarpeta cada 5 minutos, dentro de su cuota gratuita.
- **La IA transcribe los PDF y las imágenes, en vez de un extractor de texto de PDF.** Se descartó una
  librería como `pdfjs-dist`: es una dependencia nueva (principio 8) y no lee los escaneados (RF-14), que
  igual necesitarían la IA. Lo que se paga es el costo por página. Por eso se guardan los tokens de cada
  versión: con la carpeta real se ve el costo, y si resulta alto, se propone la librería para los PDF con
  texto, con aprobación.
- **Word y Excel con los lectores que ya existen, sin IA**, porque ya leen bien esos formatos, gratis. Se
  descartó mandarlos a la IA.
- **Búsqueda con el texto completo de Postgres (`tsvector` en español, sobre el texto normalizado), en vez de
  búsqueda por significado con «embeddings».** Los embeddings necesitan otro servicio y una extensión de base
  nuevos (principio 8), y para preguntas sobre oficios, actas y plazos las palabras alcanzan. Se normaliza con
  `normalizar` antes de indexar, para no depender de la extensión `unaccent`. Si un día no alcanza, se cambia
  solo `buscar.ts`.
- **Fragmentos de unos 1 500 caracteres, en vez de documentos enteros.** Al asistente se le dan los pedazos
  que responden, con su página, y no un documento de 80 páginas por pregunta. Así sale más barato y la cita es
  precisa.
- **La lectura corre en el pulso de n8n, no al recibir el archivo.** Leer un PDF largo toma minutos. Si se
  hiciera dentro del `PUT`, n8n esperaría y el proxy cortaría la petición. Así lo hace WhatsApp desde la 024. Se
  descartó un proceso aparte en el VPS: sería otra pieza que vigilar.
- **Una tabla de carpetas con obra, en vez de una variable de entorno con el id de la carpeta de Magdalena.**
  Así conectar otra obra no exige desplegar (D6, D9), igual que los grupos de WhatsApp.
- **Token propio del Drive (`TOKEN_INTEGRACION_DRIVE`), no el de WhatsApp.** Si se filtra uno, el otro no
  queda abierto, y cada uno se revoca por su lado (RF-2).
- **Permiso como módulo `drive` en la tabla, y no una lista de roles escrita en la ruta.** Así lo deciden
  `alcanza` y el alcance por obra, como todo lo demás (principio 3).

## Impacto en la sincronización

Sin impacto en la sincronización: no hay pull, push ni outbox. Todo ocurre entre Drive, n8n y el servidor.

## Contrato de API

Ninguna transacción interactiva (Neon HTTP). Cada paso es una sentencia, o resiste el reintento.

**Integración**: guardia `requerirIntegracion(peticion, 'TOKEN_INTEGRACION_DRIVE')`. Sin token o con uno
inválido, 401. Sin la variable, siempre 401.
- `POST /api/integraciones/drive/inventario`
  - cuerpo: `{ carpeta: { id, nombre }, completo, archivos: [{ driveId, nombre, ruta, mime, modificadoEn, tamano, enlace }] }`;
  - responde 200 con `{ pedir: [{ driveId, modificadoEn }], retirados, renombrados, sinRetirar? }`;
  - 400 si la forma es inválida.
- `PUT /api/integraciones/drive/archivos?carpeta=&archivo=&modificado=`
  - cuerpo: los bytes, con su `content-type` y `x-nombre`;
  - responde 201 con `{ versionId }`, o 200 con `{ estado: 'ya_estaba' }`;
  - 404 si el archivo no vino en un inventario; 413 si pasa de 50 MB.
- `POST /api/integraciones/drive/pulso`
  - responde 200 con `{ leidas, fallidas, pendientes }`.
  - Si falta `ANTHROPIC_API_KEY`, no lee y lo dice.

**Panel**: abren con `requerirSesion` y `requerirPermiso(…, 'drive', …)`; la obra se filtra con `alcance.ts`.
- `GET /api/panel/drive/documentos?buscar=`
  - con `listar`, sobre la obra en uso;
  - devuelve la carpeta (nombre, última entrega) y los documentos con sus versiones;
  - responde 404 «esa obra» si no la alcanza (RF-37).
- `GET /api/panel/drive/carpetas` y `PATCH /api/panel/drive/carpetas/:id { obraId }`
  - con `activar` (solo gerencia);
  - el `PATCH` responde 409 si la obra ya tiene otra carpeta.
- `POST /api/panel/drive/versiones/:id/releer`
  - con `escribir`, solo una versión `no_se_pudo` de una obra que se alcanza;
  - 409 si la versión está en otro estado.
- `GET /api/panel/media/:id` (ya existe): para el dueño `drive`, la obra de la carpeta con `alcanzaLaImagen` y
  el permiso `drive` → `ver`.

## Estrategia de verificación

- **`scripts/verificar-reglas.ts`:**
  - `cambiosDelInventario`:
    - un archivo nuevo, uno cambiado y uno igual (RF-1, RF-4, RF-17);
    - uno renombrado y uno movido de subcarpeta, que no piden versión (RF-21);
    - uno que falta y se retira, y uno retirado que vuelve (RF-19, RF-20);
    - una fecha más vieja que la registrada, que no pide nada (caso límite).
  - `inventarioAceptable`: incompleto → no retira; una caída de más de la mitad → no retira.
  - `versionVigente`: gana la fecha de Drive más reciente, no la que llegó de última (caso límite).
  - `claseDeArchivoDelDrive`: los mimes de PDF, imagen, Word, Excel y las exportaciones de Google; video y zip →
    no admitido (RF-7, RF-15).
  - `fragmentar`: ningún trozo pasa del tope, no corta renglones, y cada uno conserva su página.
  - `estadoDelDocumento`: los cuatro estados (RF-30).
  - Permisos: las filas `drive` de cada rol (RF-36), y `drive` solo en el menú de la obra.
  - La guardia: el token de WhatsApp no abre el Drive, y al revés (RF-2, RF-3).
  - El contrato del inventario: forma válida e inválida.
- **Demo manual** (desarrollo, `neondb`), con una carpeta «PRUEBA-052» en un Drive de prueba y el flujo de n8n
  apuntando a `localhost` por un túnel, o al servidor de desarrollo que diga Diego. Es la de los criterios de
  finalización de la spec, y además:
  - una entrega con un token inválido da 401;
  - un PDF de 30 páginas se lee en dos piezas;
  - la lista muestra la última entrega;
  - se miran los tokens de la primera carpeta para estimar el costo de Magdalena.
- **Comprobaciones extra:** `npx expo export --platform web`, y `grep` de `TOKEN_INTEGRACION_DRIVE`,
  `DATABASE_URL` y `ANTHROPIC_API_KEY` sobre `dist/client`, que debe salir vacío.
- **Limpieza:** se borran los datos PRUEBA-052 con un script acotado a `neondb`, como en la 051.

## Riesgos

1. **Un listado de Google a medias retira documentos que siguen en el Drive.**
   - **Mitigación:** `inventarioAceptable` (completo, sin caída grande).
   - **Cómo se nota:** documentos «Retirado del Drive» que siguen en el Drive.
   - **Cómo se revierte:** el siguiente inventario completo los vuelve a marcar vigentes (RF-20); no se pierde
     nada.
2. **El costo de la primera lectura de Magdalena**, porque todavía no se sabe cuántos archivos tiene.
   - **Mitigación:** se conecta primero en desarrollo, con una muestra. Se miran los tokens y se le muestra el
     estimado a Diego antes de conectar la carpeta real. Como freno, `DRIVE_LECTURA_ACTIVA=1`: sin esa variable,
     el pulso no lee y la lista lo dice.
3. **El proxy del VPS corta las subidas grandes** (`client_max_body_size 25m` hoy; lo de más de 50 MB ya no se manda, D12).
   - **Mitigación:** se sube a 55m solo en `/api/integraciones/`, como paso del despliegue.
   - **Cómo se nota:** un 413 en n8n con archivos de más de 25 MB.
4. **Instrucciones escondidas dentro de un documento del Drive.**
   - **Mitigación:** el texto va a la IA marcado como contenido de un archivo, no como instrucciones, como los
     adjuntos de la 028. La consulta es de solo lectura y no amplía el alcance (RF-28).
5. **Una transcripción de la IA con errores.**
   - **Mitigación:** el asistente cita el documento y deja abrir la copia original (RF-23, RF-24), y quien
     pregunta puede comprobarlo.
6. **El pulso se encima con otro pulso.**
   - **Mitigación:** el cambio a `leyendo` con condición de estado, y una lectura de más de 10 minutos que se
     retoma.
7. **Se agota la memoria del servidor de desarrollo con PDFs grandes** (ya pasó con otras cosas).
   - **Mitigación:** se lee de a una versión y de a 20 páginas, y el pulso dura como máximo unos 4 minutos.

**Vuelta atrás:**
- quitar el flujo de n8n, o vaciar `TOKEN_INTEGRACION_DRIVE`, corta la entrada;
- quitar `DRIVE_LECTURA_ACTIVA` corta el gasto de IA;
- las tablas nuevas no tocan nada existente.
