# Plan técnico — Spec 049

> Lee antes `docs/constitucion.md` y el `spec.md` de esta carpeta.
> Aquí va el CÓMO. Si algo de esto cambia el comportamiento acordado, no se resuelve
> en el plan: se vuelve a la spec.

## Módulos y archivos

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `src/shared/catalogos/marca.ts` (nuevo) | Los textos de la marca, en un solo sitio: `GRUPO = 'Grupo HS'`, `SISTEMA = 'Kontrola'`, `LOGOTIPO = 'KONTROLA'`, `LEMA = 'Gestión de obras y empresas'`, `AUTOR = 'Kontrola · Grupo HS'`, `PIE = 'Generado con Kontrola · Grupo HS'`, `ENCABEZADO = 'Grupo HS · Kontrola'`. Lo leen el panel y el servidor. | RF-1, RF-2, RF-5–RF-7, RF-29–RF-33, RF-39 |
| `src/constants/theme.ts` | Tokens nuevos: `TextoPanel.logotipo` (barra) y `TextoPanel.logotipoGrande` (ingreso), y el tamaño de logo de card y de menú (abierto y plegado) en `medidas.ts`. | RNF (tokens) |
| `src/features/panel/logotipo-grupo.tsx` (nuevo) | `LogotipoGrupo` con variante `barra` (amarillo de acento sobre grafito; «KONTROLA» al lado, salvo en celular) y `tarjeta` («Grupo HS» grande, «KONTROLA» y el lema debajo). Es el único lugar que cambia cuando llegue el logo del grupo. | RF-1–RF-3, RF-5–RF-8, RNF |
| `src/features/panel/barra-superior.tsx` | Sale el logo de OCC y su pastilla clara; entra `LogotipoGrupo variante="barra"`. | RF-1–RF-4 |
| `src/features/panel/tarjeta-de-acceso.tsx` | Sale el logo de OCC y «Control de Obra»; entra `LogotipoGrupo variante="tarjeta"`. La usan el ingreso y el cambio de contraseña. | RF-5–RF-9 |
| `src/features/panel/modulos.ts` | `SISTEMA` pasa a leer `marca.ts` → «… · Kontrola». | RF-10 |
| `src/features/panel/marco-sesion.tsx` | «Ingresar · Kontrola» y «Cambiar contraseña · Kontrola». | RF-12, RF-13 |
| `src/shared/rules/empresas.ts` | Sin cambios: `tituloDelLugar` ya da «<página> · <empresa>», «<página> · Proyectos» y «Proyectos». Solo se añaden sus casos a la verificación. | RF-11, RF-43, RF-50 |
| `src/app/panel/_layout.tsx` | Componente `IconoDeLaPestana` montado fuera de `MarcoSesion` (vale también sin sesión): pone en el `<head>` un `<link rel="icon">` con un SVG en línea (K amarilla sobre grafito, colores de `Panel`). | RF-14 |
| `src/features/empresas/logos.ts` (nuevo) | `logoDeEmpresa(id)`: devuelve la imagen (`require`) o `null`. Hoy solo OCC tiene imagen; Elemental y GeoLab `null`; Proyectos usa el ícono `obras`. El único catálogo que leen la card y el menú. | RF-16–RF-19, RF-27, RNF |
| `src/features/empresas/marca-de-empresa.tsx` (nuevo) | `MarcaDeEmpresa`: pinta el logo con `resizeMode="contain"` dentro de una caja fija, o el nombre como logotipo de texto si no hay imagen, o el ícono de Proyectos. Tamaños `card`, `menu`, `menuPlegado`. | RF-15–RF-19, RF-21–RF-25, RNF (2048 px sin deformar) |
| `src/features/empresas/pantalla-empresas.tsx` | `MarcaDeEmpresa tamano="card"` encima del nombre en cada `TarjetaDeEmpresa`; el resto de la card igual. | RF-15–RF-20 |
| `src/features/panel/menu-lateral.tsx` | La cabecera del bloque de páginas: dentro de Elemental, OCC o GeoLab, `MarcaDeEmpresa`; dentro de una obra, ícono de Proyectos y nombre de la obra en hasta 2 líneas (`numberOfLines={2}`); en la lista de obras, ícono y «Proyectos»; en la portada de Gerencia, «Empresas» como hoy. Plegado: la marca en tamaño `menuPlegado` en lugar de la raya. | RF-21–RF-26, RF-42, RF-44 |
| `src/features/servidor/marca-de-archivos.ts` (nuevo, solo servidor) | `marcarLibro(libro)`: pone `creator`/`lastModifiedBy` = `AUTOR` y, en **cada hoja**, `headerFooter.oddFooter` y `evenFooter` = `&C` + `PIE`. Se llama justo antes de escribir el archivo. | RF-29, RF-30, RF-33, RF-46, RF-47 |
| `src/features/{almacen-obra,plan-semanal,planificacion,presupuestos,reportes,requisiciones}/servidor/*.ts` (los 6 que crean un `Workbook` para descargar) | Quitan su `libro.creator = …` y llaman `marcarLibro(libro)`. | RF-30, RF-37 |
| `src/features/asistente/servidor/archivos/excel.ts` | Igual: `marcarLibro`. | RF-30, RF-33 |
| `src/features/asistente/servidor/archivos/pdf.ts` | `setCreator`/`setAuthor`/`setProducer` = `AUTOR`; el pie `PIE` en gris al fondo de **cada página** (ya recorre las páginas para numerarlas, si no, un bucle al final). | RF-30, RF-48 |
| `src/features/asistente/servidor/archivos/word.ts` | `docProps/core.xml` con `dc:creator` = `AUTOR` y un `word/footer1.xml` con `PIE`, referenciado desde el `sectPr` y su relación. Sin librería nueva (se sigue escribiendo el XML a mano con `jszip`). | RF-30, RF-48 |
| `src/shared/rules/archivos-del-asistente.ts` | `grupo: ENCABEZADO` («Grupo HS · Kontrola»). | RF-31 |
| `src/features/asistente/servidor/conversacion.ts` | `INSTRUCCIONES`: «Usted es el Asistente de Kontrola, el sistema del Grupo HS, dueño de Elemental (…), OCC (…), GeoLab (…) y las obras». | RF-34, RF-35, RF-49 |
| `src/features/asistente/imprimir.ts` | Título «Asistente · Kontrola» y pie `PIE` fijo al fondo de cada página impresa. | RF-32, RF-48 |
| `src/features/reportes/exportar.ts` | La página para imprimir lleva el pie `PIE`, fijo al fondo de cada página. | RF-33, RF-48 |
| `src/features/laboratorio/pantalla-informe.tsx` | Conserva el logo de GeoLab; añade el pie `PIE` al fondo de la hoja (y fijo en cada página al imprimir, dentro del `@media print` que ya existe). El ensayo usa este mismo informe. | RF-28, RF-29, RF-48 |
| `specs/040-…/spec.md`, `specs/045-…/spec.md`, `specs/047-…/spec.md` | Línea en el encabezado: «Modificada por la 049 (marca Kontrola en los archivos generados)». | D14 |
| `scripts/verificar-reglas.ts` | Casos nuevos y actualizados (ver Verificación). | RF-10–RF-13, RF-31, RF-43, RF-46, RF-47, RF-50 |

No se tocan: `app.json` (RF-41), la app del operador (`layout-operador.tsx` sigue «PreOpera OCC»), `assets/logo-geolab.jpeg` (lo sigue usando el informe; no entra al catálogo de logos, RF-18).

## Modelo de datos

**Sin cambios de esquema.** Ni local ni servidor; no hay migración. La marca es presentación (RF-40).

## Algoritmo / reglas

1. **Pie de Excel (RF-46, RF-47).** `marcarLibro` recorre `libro.worksheets` y escribe el pie de página de
   impresión. El pie vive en la configuración de página de la hoja, no en sus celdas: quien lee el archivo
   (`leer-excel.ts`, la importación de la planificación, el plan semanal, las planillas del almacén) recorre
   filas y celdas y nunca lo ve. Se llama **después** de crear todas las hojas: una hoja añadida después
   quedaría sin pie.
2. **Pie en páginas impresas (RF-48).** Un `<div>` con el pie y, en `@media print`, `position: fixed;
   bottom: 0`, que el navegador repite en cada página. Se reserva el alto con un margen inferior en
   `@page` para que no tape el contenido.
3. **Cabecera del menú (RF-21–RF-26, RF-44).** Según `lugarDeLaRuta`:
   - `empresa` → `MarcaDeEmpresa` de esa empresa;
   - `obra` → ícono de Proyectos + nombre (2 líneas, «…»);
   - `proyectos` → ícono + «Proyectos»;
   - `null` → título «Empresas» (Gerencia) o nada, como hoy.
4. **Ícono de la pestaña (RF-14).** Un SVG 32×32 en `data:image/svg+xml`: fondo grafito (`Panel.barra`) con
   radio, «K» en `Panel.acento`, fuente de rótulo con respaldo `sans-serif`. Al montar, si existe un
   `link[rel~="icon"]` se le cambia el `href`; si no, se crea.

## Decisiones técnicas

- **Textos de marca en `src/shared/catalogos/marca.ts`** → se descartó dejarlos repetidos en cada archivo
  (hoy hay 8 `creator` con tres nombres distintos: así fue como divergieron). Va en `catalogos/` y no en
  `rules/` porque es un dato compartido literal, no una decisión.
- **Ícono de la pestaña puesto desde el layout del panel, como SVG en línea** → se descartó (a) añadir
  `src/app/+html.tsx`, porque cambia el HTML raíz de toda la app web, rutas del operador incluidas, para
  algo que solo necesita el panel; y (b) reemplazar `assets/images/favicon.png`, porque rasterizar la K sin
  una herramienta de imágenes pediría una dependencia nueva (principio 8) y además obliga a tocar `app.json`
  si cambia el nombre. Costo asumido: en la primera carga, antes de que corra el JavaScript, puede verse la
  flecha vieja un instante.
- **Logotipo de texto como componente** (`LogotipoGrupo`) → se descartó una imagen PNG con el texto
  «Grupo HS»: sería otro archivo que rehacer cuando llegue el logo y no escalaría con la fuente del panel.
  Cuando llegue el logo, el componente pinta la imagen y ninguna pantalla cambia (RNF).
- **Catálogo de logos en `src/features/empresas/logos.ts`, no en `shared/rules/empresas.ts`** → la regla es
  pura y la comparte el servidor; un `require` de una imagen ahí la arrastraría al servidor y a la
  verificación en Node.
- **El pie de Excel en el pie de página de impresión** → se descartó una fila al final de la hoja porque
  rompe la reimportación (D13, RF-47) y las sumas por columna que los usuarios hacen sobre la hoja.
- **El Word sigue escribiéndose a mano** (como decidió la 040) → se descartó la librería `docx`: el pie es un
  XML más y no justifica una dependencia.
- ~~**La imagen de 85×84 de GeoLab no entra al catálogo** (D12)~~ → *superada por el cambio del 2026-11-18
  (D15, D17)*: reducida a la caja (64 o 56 px de alto) se ve nítida; lo que la volvía borrosa era agrandarla.

## Impacto en la sincronización

Sin impacto en la sincronización. No cambia el móvil, el pull, el push ni la `outbox`.

## Contrato de API

Sin endpoints nuevos ni cambios de forma. Las rutas que devuelven archivos (descargas de Excel, archivos del
Asistente) devuelven los mismos datos con otro autor y otro pie; guardias y alcance sin cambios.

## Estrategia de verificación

- **`scripts/verificar-reglas.ts`**:
  - Actualizar los casos de `tituloDeLaPestana` («· Control de Obra OCC» → «· Kontrola») (RF-10).
  - `tituloDelLugar`: «Tesorería · Elemental», «<página> · Proyectos» dentro de una obra y «Proyectos» en la
    lista (RF-11, RF-43, RF-50).
  - `encabezadoDelArchivo(...).grupo === 'Grupo HS · Kontrola'` (RF-31).
  - `marcarLibro`: un libro con dos hojas y 3 filas de datos; tras marcarlo, cada hoja tiene el pie, `creator`
    es `AUTOR`, y al escribirlo y volverlo a leer con ExcelJS sigue teniendo 3 filas de datos y ninguna celda
    contiene «Kontrola» (RF-30, RF-46, RF-47).
  - Barrido de cadenas: ningún archivo de `src/` fuera de la app del operador contiene «Control de Obra OCC»,
    «PreOperaOCC» o «Grupo OCC» en una cadena (RF-36, RF-37).
- **Demo manual** (ventana privada para el ícono, servidor de Diego en 8081 tras reiniciarlo con `--clear`):
  1. Ingreso: «Grupo HS», «KONTROLA», «Gestión de obras y empresas»; pestaña «Ingresar · Kontrola» con la K
     (RF-5–RF-9, RF-12, RF-14).
  2. Gerencia: barra con Grupo HS y KONTROLA; cards con logo de OCC, texto en Elemental y GeoLab, ícono en
     Proyectos, con su saldo y obras (RF-1–RF-4, RF-15–RF-20).
  3. Entrar a OCC: logo en el menú, abierto y plegado; pestaña «… · OCC» (RF-11, RF-21, RF-25, RF-27).
  4. Lista de obras y una obra con nombre largo (PRUEBA-043 renombrada temporalmente o una obra real larga):
     ícono, «Proyectos», nombre en 2 líneas con «…» (RF-23, RF-24, RF-42, RF-43, RF-44, RF-50).
  5. Descargar el Excel de la requisición de OCC y el de la planificación: pie en la vista de impresión,
     autor en Propiedades, volver a importar la planificación sin cambios (RF-29, RF-30, RF-46, RF-47).
  6. Informe de granulometría: logo de GeoLab y pie de Kontrola al imprimir (RF-28, RF-29, RF-48).
  7. Asistente: «¿quién eres?» nombra a Kontrola y al Grupo HS; pedir un PDF, un Excel y un Word: encabezado
     «Grupo HS · Kontrola» y pie en cada página; imprimir una respuesta: «Asistente · Kontrola» (RF-31–RF-35,
     RF-49).
  8. Barra e ingreso a 390 px (RF-3, RNF).
- **Comprobaciones extra**: `npx expo export --platform web` sin errores (el layout del panel cambia); sin
  secretos nuevos, así que no hace falta el `grep` de fugas.

## Riesgos

- **El pie de Excel no se ve en pantalla**, solo en la vista de impresión y al imprimir: alguien puede creer
  que falta. Se detecta en la demo (paso 5). Es lo decidido en D13; si Diego lo quiere visible, es un
  `/sdd:cambio`.
- **Pie fijo que tapa la última línea al imprimir** el informe o los reportes. Se detecta en la demo (paso 6)
  imprimiendo un informe de varias páginas; se corrige con el margen de `@page`.
- **El ícono SVG no se aplica en algún navegador** (Safari antiguo ignora SVG como favicon). Se detecta en la
  demo; el respaldo es la flecha de siempre, sin romper nada. Se revierte quitando `IconoDeLaPestana`.
- **La IA sigue diciendo «grupo de OCC»** en conversaciones guardadas: el historial viejo no cambia (RF-40);
  las respuestas nuevas usan las instrucciones nuevas.
- **Un `Workbook` nuevo que alguien cree después sin `marcarLibro`** quedaría sin marca. El barrido de cadenas
  no lo detecta; se deja escrito en el comentario de cabecera de `marca-de-archivos.ts` y en la verificación
  se cuenta que cada `new ExcelJS.Workbook()` de descarga va seguido de `marcarLibro`.
- Reversión general: todo es presentación y no hay migración; se revierte el commit.

## Cambio del 2026-11-18 — logos de las tres empresas, ícono de Proyectos y cards centradas (RF-51 a RF-57)

### Módulos y archivos

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `assets/elemental-recortado.jpg`, `assets/occ-recortado.png` (nuevos) | Los logos de Elemental y de OCC sin el blanco de alrededor (un 1 % de aire a cada lado). Elemental se reduce a 1200 px de ancho: más no se ve en ninguna caja y pesa menos en el paquete. Los originales se quedan en `assets/` sin tocar (nada se borra). | RF-51, RF-57 |
| `src/features/empresas/logos.ts` | `elemental` → `elemental-recortado.jpg`, `occ` → `occ-recortado.png`, `geolab` → `logo-geolab.jpeg`. `proyectos` sigue en `null` (va con ícono). | RF-16, RF-51, RF-52 |
| `src/constants/medidas.ts` | `CajaDeLogo.menu` pasa de 184×48 a 184×56: el dibujo de OCC, que es apaisado, quedaba de 83 px de ancho. | RF-21, RF-57 |
| `src/features/panel/iconos.tsx` | Dibujo nuevo `proyectos`: un edificio en obra con su grúa, en el trazo de 24 px y 1,75 de los demás íconos. | RF-53 |
| `src/features/empresas/marca-de-empresa.tsx` | Proyectos usa el ícono `proyectos`, más grande en la card. La imagen se centra en su caja (`card`) o va a la izquierda (`menu`). Una imagen más pequeña que su caja se muestra a su tamaño, nunca agrandada (GeoLab: 85×84 cabe en 64 de alto reducido, y en el plegado de 40). GeoLab, esquinas con `Radio.sm`. | RF-52, RF-53, RF-54 |
| `src/features/panel/menu-lateral.tsx` | `cambiar-obra` y `proyectos` → ícono `proyectos`. | RF-53 |
| `src/features/empresas/pantalla-empresas.tsx` | La card centra la marca en su franja (`CajaDeLogo.card.alto`, la misma en las cuatro), y debajo el nombre y la función, también centrados. El saldo y las obras activas quedan centrados debajo. | RF-54, RF-55, RF-56, RF-20 |
| `scripts/verificar-reglas.ts` | La prueba «049/RF-16 a RF-19» pasa a esperar imagen en OCC, Elemental y GeoLab, y ninguna para Proyectos; se comprueba el uso del ícono `proyectos` y el centrado. | RF-51 a RF-56 |

### Decisiones técnicas

- **Recortar con Pillow, una sola vez, desde la carpeta temporal de la sesión** → se descartó añadir una librería
  de imágenes al proyecto (principio 8) y recortar en pantalla con márgenes negativos: dependería de cada
  imagen y se rompería al cambiar el archivo. Pillow ya está instalado en la máquina de Diego; el guion no entra
  al repositorio.
- **Archivos recortados nuevos, sin sobrescribir los originales** → se descartó reemplazarlos: son los archivos
  que entregó Diego, y si el recorte saliera mal se vuelve a partir de ellos.
- **GeoLab sin recortar** → su fondo negro es parte de la insignia; RF-57 habla de blanco alrededor del dibujo,
  y GeoLab no tiene.

### Verificación

- Medir con Pillow los recortados: blanco o transparente alrededor de menos del 5 % en cada lado (RF-57).
- En el navegador de Diego: cards (las cuatro centradas, los nombres a la misma altura), el menú abierto y
  plegado en Elemental, OCC y GeoLab, «Cambiar de obra» y una obra con el ícono nuevo, y las cards en un
  recuadro de 390 px.
