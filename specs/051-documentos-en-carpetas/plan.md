# Plan técnico — Spec 051

> Lee antes `docs/constitucion.md` y el `spec.md` de esta carpeta.
> Aquí va el CÓMO. Si algo de esto cambia el comportamiento acordado, no se resuelve
> en el plan: se vuelve a la spec.

Estado: **aprobado** por Diego el 2026-11-19. **Cambio del 2026-11-20** (las carpetas nacen al subir, RF-70 a RF-79): aprobado por Diego el mismo día; va en la sección «Cambio del 2026-11-20», al final, y manda sobre lo de arriba donde choquen.

La spec cambia **solo cómo se presenta** la lista que ya llega. Todo lo necesario viene ya en cada
`DocumentoDelLugar` (`src/features/panel/contratos.ts`): `clase`, `claseNombre`, `aviso`, `mime`,
`bytes`, `anulado`, `subidoPor` y `subidoEn`. Por eso no hay esquema, API ni permisos que tocar.

## Módulos y archivos

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `src/shared/rules/documentos.ts` | Tres funciones puras nuevas. `carpetasDe(lugar, documentos)` arma una carpeta por clase de `clasesDe(lugar)` en ese orden, añade las clases retiradas en orden alfabético antes de «Otro», y cuenta vigentes (no anulados), vencidos y por vencer según `aviso.estado`. `tamanoLegible(bytes)` escribe KB sin decimales por debajo de 1.024 KB y MB con un decimal con coma desde ahí. `formatoDeArchivo(mime)` da `'pdf' \| 'imagen' \| 'word' \| 'excel'` | RF-4 a RF-10, RF-13, RF-57, RF-33, RF-26, RF-54 |
| `src/features/documentos/archivador.tsx` (nuevo) | `ArchivadorDeDocumentos`, solo para empresas y obras. Tiene las cifras de arriba, que se quedan informativas; la cuadrícula de carpetas; la carpeta abierta; la búsqueda entre carpetas; las dos casillas; y el vacío de la 050 en una carpeta sin nada que mostrar | RF-1, RF-4 a RF-24, RF-38 a RF-46, RF-56, RF-59, RF-60, RF-66 a RF-68 |
| `src/features/documentos/tarjetas.tsx` (nuevo) | `TarjetaDeCarpeta`, con el ícono `documentos` de `iconos.tsx`, el gris cuando está vacía y «Subir el primero». `TarjetaDeDocumento`, con tipo, nombre a dos renglones, archivo, proveedor, fechas, aviso, quién lo subió, tamaño, botones y la marca de anulado. Las dos usan `Tarjeta`, `Etiqueta` y `Boton` de `panel/componentes.tsx` | RF-6 a RF-11, RF-25 a RF-37, RF-40, RF-47, RF-48, RF-61 a RF-65 |
| `src/features/documentos/pantalla-documentos.tsx` | `PantallaDocumentos` monta el `ArchivadorDeDocumentos` en lugar de `CarpetaDeDocumentos`. «Subir documento» sigue en el encabezado. `CarpetaDeDocumentos` **no cambia** para la ficha, la requisición y el pago. `VentanaDeSubir` se exporta y gana dos cosas: `claseInicial`, y que `alGuardar` devuelva la clase con que quedó el documento | RF-2, RF-49 a RF-53 |
| `src/features/documentos/archivador.tsx` (carpeta abierta) | **Cambiado en la T4:** la carpeta abierta es un parámetro de expo-router. Se lee con `useLocalSearchParams`, se abre con `router.push(ruta?carpeta=…)` y se vuelve a las carpetas con `router.back()` cuando la pantalla de abajo son las carpetas (con `router.replace` si se llegó por un enlace directo). `useParametroDeDireccion` no se toca | RF-19 a RF-21 |
| `src/features/panel/marco.tsx` y `migas.tsx` | `MarcoPantalla` gana `alVolverDelRegistro`. Cuando hay `registro`, el paso del módulo («Documentos») llama a esa función en vez de navegar a la misma dirección. La pantalla que no la pasa sigue igual | RF-17 |
| `src/features/panel/modulos.ts`, `src/app/panel/_layout.tsx` y `src/features/panel/titulo-del-registro.tsx` (nuevo) | Un contexto pequeño: la pantalla publica el nombre del registro con `useTituloDelRegistro(nombre)`, y `TituloDeLaPestana` arma «Pólizas y seguros · Documentos · OCC · Kontrola» con `tituloDeLaPestana(ruta, registro)`. Solo Documentos lo usa | RF-58 |
| `scripts/verificar-reglas.ts` | Casos «051/…» (ver Verificación) | RF-4 a RF-13, RF-26, RF-33, RF-54, RF-57 |
| `specs/034-documentos/spec.md` y `specs/050-…/spec.md` | La marca «Modificada por la spec 051» en el estado | — |

## Modelo de datos

**Sin cambios de esquema.** Ni en el móvil ni en el servidor; sin migraciones. El teléfono no
interviene.

## Algoritmo / reglas

`carpetasDe(lugar, documentos)`:

1. `catalogo = clasesDe(lugar)`. «Otro» ya va al final. → RF-4, RF-5.
2. Por cada documento se agrupa por `clase`. Si la clase no está en `catalogo`, se guarda como
   retirada con su `claseNombre`. Si dos documentos traen nombres distintos para la misma clave,
   manda el del más reciente. → RF-13.
3. Las retiradas se ordenan por nombre con `localeCompare('es')` y se insertan justo antes de
   «Otro». → RF-57.
4. Por carpeta, sin contar anulados:
   - `vigentes` son los documentos sin `anulado`;
   - `vencidos` son los que tienen `aviso.estado === 'vencido'`;
   - `porVencer` son los que tienen `aviso.estado === 'por_vencer'`.

   El `aviso` ya lo calcula el servidor con `estadoDelVencimiento`, que nunca avisa de un anulado.
   Por eso las carpetas y las cifras de arriba suman lo mismo. → RF-6 a RF-10, RF-54.
5. `vacia = vigentes === 0`, que se pinta en gris. `tieneAnulados` sirve para dejarla abrir
   (RF-68).

La pantalla, en orden:

- **Con texto en el buscador:** resultados de todas las carpetas, ordenados por `fecha`
  descendente, con el nombre de su carpeta y las casillas aplicadas. Es así aunque la dirección
  traiga `carpeta`. → RF-38 a RF-41, RF-59, RF-66.
- **Sin texto y con `carpeta` válida en la dirección:** la carpeta abierta, con el título y el
  registro en la ruta, «Todas las carpetas», paginada con `POR_PAGINA` y ordenada por fecha. →
  RF-15 a RF-24, RF-60.
- **Sin texto y con una `carpeta` que no existe en ese lugar:** las carpetas. → RF-22.
- **Sin texto y sin carpeta:** la cuadrícula de carpetas. Con «Solo vencidos o por vencer»
  marcada, solo las que tienen `vencidos + porVencer > 0`. → RF-4, RF-44, RF-67.
- **Al guardar:** `VentanaDeSubir` devuelve la clase final, se abre su carpeta como en RF-19
  (si ya es la abierta, solo se recarga), se borra la búsqueda y se recarga la lista. → RF-52,
  RF-53.

## Decisiones técnicas

- **Componente nuevo `ArchivadorDeDocumentos` y `CarpetaDeDocumentos` intacta.** Se descartó
  meter un modo «carpetas» dentro de `CarpetaDeDocumentos`, porque ya la montan cuatro sitios con
  variantes (`sinPrecio`, `subida`, `claveDeBusqueda`). Un modo más multiplicaría los caminos, y
  la spec pide expresamente que los otros tres no cambien (RF-2). Lo que se comparte —la ventana
  de subir, la de anular y las reglas— se importa, no se copia.
- **Las carpetas y los conteos van en `shared/rules`, y se cuenta con el `aviso` que manda el
  servidor.** Se descartó calcular en la pantalla con la fecha del navegador. Una computadora con
  la fecha mal puesta mostraría en las carpetas números distintos de las cifras de arriba, que
  vienen del servidor. El principio 3 pide un solo criterio.
- **La carpeta abierta es una pantalla nueva de expo-router (`router.push` a la misma ruta con
  `?carpeta=`), y se lee de sus parámetros.** Cambiado en la T4, tras probarlo en el navegador.
  La decisión original era `pushState` y `popstate` en `useParametroDeDireccion`, y se descartó
  porque expo-router trata como navegación ajena toda entrada del historial que no creó él: al
  volver a ella con «atrás» o «adelante» monta la pantalla otra vez, pide la lista, y en ese
  instante la dirección dice `?pagina=documentos`, así que la carpeta no se lee. Copiar su
  `history.state` en la entrada nueva fue peor: cada paso volvía a montar. También se descartó
  `router.setParams`, que reemplaza la entrada (expo-router solo agrega una cuando crece la
  pila) y deja «atrás» sin nada que deshacer (RF-20).

  El costo aceptado: abrir una carpeta, o volver a ella con «adelante», pide la lista una vez,
  como cualquier pantalla del panel. «Atrás» no pide nada, porque la pantalla de abajo sigue
  montada. La búsqueda sigue con `replace`, para no llenar el historial de letras.
- **La ruta de arriba vuelve con una función y no con un enlace a la misma dirección.** Se
  descartó dejar el enlace normal: navegar a la ruta en la que ya se está no reinicia el estado
  de la pantalla, y la carpeta seguiría abierta.
- **El título de la pestaña por un contexto que llena la pantalla.** Se descartó que
  `TituloDeLaPestana` lea el parámetro `carpeta`: el layout tendría que conocer el catálogo de
  clases de Documentos. También se descartó que la pantalla escriba `document.title` por su
  cuenta: el efecto del layout corre en otro orden y lo pisa.
- **El mismo ícono `documentos` en todas las carpetas (D5)**, reutilizado de `iconos.tsx`. Se
  descartó dibujar uno por clase.

## Impacto en la sincronización

**Sin impacto en la sincronización.** Es solo el panel web.

## Contrato de API

**Sin cambios.** Se usa `api.documentos.listar`, `subir`, `anular` y `urlDelArchivo` como están.
La guardia y el alcance por obra de esas rutas no se tocan.

## Estrategia de verificación

- **`scripts/verificar-reglas.ts`**:
  - `carpetasDe('occ', [])`: tantas carpetas como `clasesDe('occ')`, en ese orden, todas vacías y
    con «Otro» al final (RF-4, RF-5, RF-9).
  - Un vencido, un por vencer, uno vigente sin aviso y un anulado en la misma clase:
    `vigentes 3, vencidos 1, porVencer 1`; el anulado no cuenta y `tieneAnulados` es verdadero
    (RF-6 a RF-10, RF-68; D8).
  - Dos clases retiradas («Zeta», «Acta vieja»): van antes de «Otro», en orden alfabético y con
    su nombre guardado (RF-13, RF-57).
  - La suma de vencidos y por vencer de todas las carpetas es igual a `resumenDeVencimientos`
    sobre los mismos documentos (RF-54).
  - `tamanoLegible`: 850 KB → «850 KB»; 1.048.575 bytes → «1.024 KB»; 1.048.576 → «1,0 MB»;
    4,2 MB → «4,2 MB» (RF-33; D14).
  - `tipoDeArchivo` con los mimes de `EXTENSIONES` (RF-26).
- **Demo manual en Chrome:** la de los criterios de finalización de la spec, en OCC y en una obra,
  a 1366 px y en un recuadro de 390 px. Lo que se sube lleva PRUEBA-051 y se limpia al final. El
  residente se prueba con la petición interceptada, como en la 050.
- **Comprobaciones extra:**
  - `npx expo export --platform web` sin errores al cerrar;
  - no se lee ningún secreto nuevo;
  - la ficha de una persona, una requisición y un pago se ven igual que antes (RF-2).

## Riesgos

- ~~**expo-router puede reaccionar al `popstate` de la misma ruta.**~~ Pasó, y se resolvió en la
  T4 con `router.push` (ver Decisiones). Queda uno derivado: la búsqueda escribe en la dirección
  con `replaceState(null)`, que borra la marca de expo-router de esa entrada. Hay que probar en la
  T12 que «atrás» después de buscar dentro de una carpeta siga funcionando.
- **Que la carpeta se rompa en la ficha, la requisición o el pago** al exportar `VentanaDeSubir`
  con parámetros nuevos. Los dos parámetros son opcionales y se revisan esas tres pantallas en la
  demo.
- **Números distintos entre las carpetas y las cifras de arriba.** Lo atrapa la prueba de RF-54.
- **Vuelta atrás:** no hay datos de por medio, así que revertir los commits basta.

## Cambio del 2026-11-20: las carpetas nacen al subir

Lo que cambia respecto de lo de arriba. Lo demás (tarjetas, buscador, casillas, carpeta en la dirección,
ruta, pestaña, anular) sigue igual.

### Modelo de datos

**Sigue sin cambios de esquema ni migración.** `documentos_del_grupo` ya tiene `clase` (texto, hasta 64 en la
entrada) y `clase_nombre` (texto). Una carpeta creada por un usuario es una clase propia:

- `clase = 'carpeta:' + slug`, donde `slug` es el nombre con `normalizar` (sin tildes, minúsculas), los
  signos y espacios convertidos en `_`, sin `_` repetidos ni en los bordes, y recortado para que el total
  quepa en 64.
- `clase_nombre` = el nombre como se escribió, recortado y con los espacios de más quitados (máx. 60).

Como el slug sale del nombre, dos escrituras del mismo nombre caen en la misma carpeta (RF-74) sin consultar
la base. Una carpeta existe mientras tenga algún documento; no hay tabla de carpetas.

### Reglas (`src/shared/rules/documentos.ts`)

- `esLugarConCarpetas(lugar)`: `elemental`, `occ`, `geolab` y `obra` (no `persona`, `solicitud`, `pago`; RF-78).
- `claseParaNombre(lugar, nombre)` → `{ clase, claseNombre } | null`:
  1. limpia el nombre; si queda vacío o el slug queda vacío, `null` (se pide otro);
  2. si coincide normalizado con el nombre de una clase de `clasesDe(lugar)`, devuelve esa clase con su
     nombre (RF-73);
  3. si no, `carpeta:<slug>` con el nombre escrito (RF-74 por construcción).
- `esClaseDe(lugar, id)` acepta también `carpeta:<slug>` con slug válido cuando `esLugarConCarpetas(lugar)`.
- `faltasDelDocumento` sigue igual en lo demás; con una clase propia, exige `claseNombre` válido.
- `carpetasDe(lugar, documentos, { conAnulados } = {})`:
  - una carpeta por cada clase presente en los documentos; sin documentos, ninguna (RF-4, RF-70);
  - las que solo tienen anulados salen solo con `conAnulados` (RF-9, RF-67, RF-76);
  - orden: las del catálogo en su orden; después las propias y las retiradas juntas, con
    `localeCompare('es', { sensitivity: 'base' })`; «Otro» al final (RF-5, RF-57);
  - el nombre de una propia es el `claseNombre` del documento más reciente, como ya hace con las retiradas.
- Las opciones de la ventana de subir salen de una función pura `opcionesDeCarpeta(lugar, carpetas)`:
  primero las carpetas que ya tiene el lugar, después las clases del catálogo que todavía no tienen carpeta,
  y al final la opción «＋ Nueva carpeta…» (RF-71).

### API

- `documentoDelGrupoNuevo` (`src/features/panel/contratos.ts`) gana `claseNombre: z.string().trim().max(60).default('')`.
- `subirDocumento` (`src/features/documentos/servidor/documentos.ts`): si la clase es propia, recalcula con
  `claseParaNombre(dueno.lugar, datos.claseNombre)` y guarda **lo que da el servidor** (clase y nombre), no lo
  que mandó la pantalla (RF-79). Si es del catálogo, como hoy. Misma ruta y misma guardia.
- `api.documentos.subir` (`cliente-api.ts`) ya manda un `Record<string, string>`: solo se agrega el campo.

### Panel

- `VentanaDeSubir` sale de `pantalla-documentos.tsx` a `src/features/documentos/ventana-de-subir.tsx`, junto
  con el tipo `DocumentosCargados` que el archivador necesita. Quita el ciclo de imports anotado en la
  validación.
- Con la prop opcional `carpetas` (solo el archivador la pasa): el selector usa `opcionesDeCarpeta`; al elegir
  «＋ Nueva carpeta…» aparece el campo obligatorio «Nombre de la carpeta» (máx. 60). Antes de guardar, la
  pantalla resuelve con `claseParaNombre` y manda `clase` y `claseNombre`. Sin la prop (ficha, requisición,
  pago), igual que hoy (RF-78).
- `alGuardar(clase)` devuelve la clase que respondió el servidor; para eso la subida devuelve también la
  `clase` guardada. Se abre esa carpeta (RF-75, que ya cumple el `alAbrir` de la T13).
- `ArchivadorDeDocumentos`: `carpetasDe(..., { conAnulados: verAnulados })`; sin carpetas que mostrar y sin
  búsqueda → `ListaVacia` con «Subir documento» a quien puede (RF-70); sin `alSubir` en las tarjetas.
- `PantallaDocumentos`: la carpeta de la dirección se busca en `carpetasDe(..., { conAnulados: true })`, para
  que una carpeta solo con anulados se pueda abrir por su dirección (RF-22, RF-68).
- `TarjetaDeCarpeta` pierde `alSubir` y el botón «Subir el primero» (RF-47 y RF-48 retirados).

### Verificación

- Casos nuevos en `scripts/verificar-reglas.ts`, escritos antes que las reglas:
  - `claseParaNombre`: «Manuales de obra» → `carpeta:manuales_de_obra`; «  manuales DE  obra » → la misma clave;
    «cámara de comercio» y «CAMARA DE COMERCIO» en OCC → `camara_de_comercio` con su nombre; «—» → `null`;
    en `persona` no hay carpetas propias;
  - `faltasDelDocumento` acepta `carpeta:…` en OCC y la rechaza en `persona` y `pago`;
  - `carpetasDe`: sin documentos, ninguna; solo las clases con documentos; la carpeta solo con anulados sale
    solo con `conAnulados`; orden catálogo → propias y retiradas alfabéticas → «Otro»;
  - `opcionesDeCarpeta`: existentes primero, sugerencias sin repetir, «＋ Nueva carpeta…» al final.
- Los casos 051 de RF-4/5/9 y RF-13/57 se ajustan a la regla nueva.
- Demo en Chrome: la de los criterios de finalización de la spec cambiada, con limpieza PRUEBA-051.
- `npx expo export --platform web` sin secretos en `dist/client` (se toca una ruta de API).

### Riesgos

- **Una carpeta propia con el nombre de una clase que se agregue después al catálogo:** sus documentos
  quedarían en dos carpetas («carpeta:polizas_de_obra» y la nueva clase). Hoy no pasa; si un día se agrega una
  clase, se revisa antes con una consulta. Queda anotado, no se resuelve ahora.
- **La ventana de subir de la ficha, la requisición y el pago** cambia de archivo: se revisan las tres en el
  barrido (fotos de «después»).

## Pendiente de la spec

Ninguno: los documentos sin tamaño quedaron resueltos como D19 / RF-69 (no se muestra la línea del tamaño).
