# Spec 051 — Documentos en carpetas

> Estado: **Cumplida el 2026-11-20, con su cambio** (`validacion.md`: 77/77 RF vigentes en verde; RF-47 y RF-48 retirados) · Cambio del 2026-11-20 (las carpetas nacen al subir: RF-70 a RF-79, D20–D22; RF-4, RF-5, RF-9, RF-22, RF-49, RF-57 y RF-67 modificados), revalidado el mismo día · Primera validación: 69/69 · **Aprobada** por Diego el 2026-11-19 y clarificada el mismo día (D7–D18); D19 al aprobar el plan · Fecha: 2026-11-19 · Tercera de la tanda de UI/UX (049 marca, 050 interfaz, 051 documentos en carpetas) · Entrevista del 18 y el 19-nov: D1 a D6, abajo · **Modifica la 034** (RF-31, RF-32, RF-33 y RF-37: la lista con selector de clase pasa a carpetas con tarjetas) · **Toca la 050** (RF-53 en Documentos: sin documentos se ve el vacío de las listas con «Subir documento»; desde el cambio del 2026-11-20 ya no hay carpetas vacías)

## Contexto y objetivo

Documentos de cada empresa y de cada obra (spec 034) es hoy una sola lista larga, con un selector de
clase para filtrar. Cuando una empresa junta decenas de papeles, cuesta ver qué hay y, sobre todo,
qué falta: una clase sin ningún documento no aparece por ningún lado, y la única manera de notarlo es
abrir el selector y probar clase por clase.

Esta spec organiza Documentos como un archivador:
- primero se ven **las carpetas que tienen documentos**, una por cada clase, con cuántos tiene cada una
  y cuántos están vencidos o por vencer;
- las carpetas **nacen al subir**: se elige una de las clases de siempre o se crea una carpeta nueva ahí
  mismo, y no se ven cajas vacías (cambio del 2026-11-20);
- al entrar a una carpeta se ven sus documentos en **tarjetas**, con lo necesario para reconocerlos
  sin abrirlos;
- el buscador sigue buscando en todo.

No cambia quién ve, sube ni anula documentos, ni qué se guarda de cada uno: cambia cómo se
encuentran.

## Usuarios / actores

Los mismos de la spec 034, con los mismos permisos:
- **Gerencia** (panel web): ve las carpetas de Elemental, OCC, GeoLab y todas las obras; sube y anula.
- **Residente / director de obra** (panel web): ve y sube en las carpetas de su obra.
- **Encargado de OCC** (panel web): ve y sube en las carpetas de OCC.
- **Laboratorista** (panel web): ve y sube en las carpetas de GeoLab.
- **Operador**: no interviene; la app del celular no cambia.

## Historias de usuario

- H1: Como gerencia, residente, encargado de OCC o laboratorista quiero ver de un vistazo todas las
  carpetas de documentos de mi empresa u obra, con cuántos hay en cada una, para saber qué tengo y
  qué me falta.
- H2: Como cualquiera de ellos quiero entrar a una carpeta y reconocer cada documento sin abrirlo,
  para encontrar rápido el que me piden.
- H3: Como cualquiera de ellos quiero buscar un documento sin saber en qué carpeta está, para no
  tener que revisarlas una por una.
- H4: Como quien puede subir quiero subir un documento desde su carpeta, sin volver a escoger la
  clase, para que quede donde lo estoy viendo.
- H5: Como quien puede subir quiero crear una carpeta nueva en el momento de subir un documento, para
  ordenar los papeles que no encajan en las clases de siempre sin pedírselo a nadie (cambio del
  2026-11-20).

## Requisitos funcionales (criterios de aceptación en EARS)

### Dónde aplica

- RF-1: EL SISTEMA muestra las carpetas en la pantalla Documentos de Elemental, OCC, GeoLab y cada obra.
- RF-2: EL SISTEMA deja los documentos de la ficha de una persona, de una requisición de compra y de una solicitud de pago como están, en su lista (D1).
- RF-3: EL SISTEMA deja los documentos del contrato y las pólizas en Contrato y Presupuesto, como están, sin carpetas en Documentos de la obra (D2; 034/RF-11).

### Las carpetas (H1)

- RF-4 (cambio del 2026-11-20): CUANDO alguien entra a Documentos, EL SISTEMA muestra una carpeta por cada clase o carpeta que tiene al menos un documento vigente en esa empresa u obra, salvo lo que dicen RF-44 y RF-67. *Decía: una carpeta por cada clase que ofrece esa empresa u obra, tuviera o no documentos.*
- RF-5 (cambio del 2026-11-20): EL SISTEMA ordena las carpetas así: primero las de las clases del catálogo, en su orden; después las creadas por los usuarios y las de clases retiradas, juntas; y «Otro» al final. *Decía: siempre en el orden del catálogo, con «Otro» al final (D3).*
- RF-6: EL SISTEMA muestra en cada carpeta su nombre y cuántos documentos vigentes tiene; vigente es no anulado, aunque esté vencido (D8).
- RF-7: MIENTRAS una carpeta tiene documentos vencidos, EL SISTEMA muestra en ella cuántos son, en el tono de «malo» y con el texto «vencidos».
- RF-8: MIENTRAS una carpeta tiene documentos que vencen en los próximos 30 días, EL SISTEMA muestra en ella cuántos son, en el tono de «atención» y con el texto «por vencer».
- RF-9 (cambio del 2026-11-20): MIENTRAS «Ver anulados» está marcada, EL SISTEMA muestra en gris, con «0», las carpetas que solo tienen documentos anulados. *Decía: una carpeta sin documentos vigentes se muestra en gris, con «0».*
- RF-10: EL SISTEMA no cuenta los documentos anulados en el número de una carpeta.
- RF-11: EL SISTEMA muestra el mismo dibujo de carpeta en todas las carpetas (D5).
- RF-12: EL SISTEMA conserva arriba de las carpetas las cifras de la empresa u obra: vencidos, por vencer en 30 días y vigentes (034/RF-41).
- RF-56: EL SISTEMA muestra esas cifras solo como información: pulsarlas no filtra (D10).
- RF-13: SI un documento tiene una clase que ya no está en el catálogo de ese lugar, ENTONCES EL SISTEMA lo muestra en una carpeta con el nombre de clase guardado con el documento (034/RF-23), antes de «Otro».
- RF-57 (cambio del 2026-11-20): SI hay varias carpetas creadas por los usuarios o de clases retiradas, ENTONCES EL SISTEMA las ordena entre ellas por orden alfabético, sin distinguir tildes ni mayúsculas. *Decía: solo las de clases retiradas (D12).*
- RF-14: MIENTRAS el ancho de la pantalla es menor de 768 px, EL SISTEMA muestra las carpetas en una sola columna.

### Entrar a una carpeta (H2)

- RF-15: CUANDO alguien pulsa una carpeta, EL SISTEMA muestra solo los documentos de esa clase.
- RF-16: MIENTRAS hay una carpeta abierta, EL SISTEMA muestra su nombre en el título de la pantalla.
- RF-58: MIENTRAS hay una carpeta abierta, EL SISTEMA muestra su nombre en el título de la pestaña del navegador (049/RF-13; D11).
- RF-17: MIENTRAS hay una carpeta abierta, EL SISTEMA muestra en la ruta de arriba el paso «Documentos», con enlace para volver a todas las carpetas (050/RF-27, RF-28).
- RF-18: MIENTRAS hay una carpeta abierta, EL SISTEMA muestra un botón «Todas las carpetas» que vuelve a ellas.
- RF-19: CUANDO alguien abre una carpeta, EL SISTEMA guarda la carpeta en la dirección de la página.
- RF-20: CUANDO alguien usa «atrás» del navegador desde una carpeta, EL SISTEMA vuelve a todas las carpetas.
- RF-21: CUANDO alguien abre la dirección de una carpeta, EL SISTEMA muestra esa carpeta abierta.
- RF-59: SI la dirección trae a la vez una carpeta y un texto de búsqueda, ENTONCES EL SISTEMA muestra los resultados de la búsqueda en todas las carpetas (D17).
- RF-22 (cambio del 2026-11-20): SI la dirección pide una carpeta de la que ese lugar no tiene ningún documento, vigente ni anulado, ENTONCES EL SISTEMA muestra todas las carpetas. *Decía: una carpeta que no existe en ese lugar.*
- RF-23: EL SISTEMA muestra los documentos de una carpeta del más reciente al más antiguo por fecha del documento (034/RF-31).
- RF-24: EL SISTEMA reparte los documentos de una carpeta en páginas del mismo tamaño que las demás listas del panel.
- RF-60: SI una carpeta abierta no tiene ningún documento que mostrar (solo anulados ocultos, o ninguno vencido con la casilla marcada), ENTONCES EL SISTEMA muestra el vacío de las listas del panel, con su botón para subir a quien puede (050/RF-53, RF-54; D16).

### La tarjeta del documento (H2)

- RF-25: EL SISTEMA muestra cada documento de una carpeta en una tarjeta (D4).
- RF-26: EL SISTEMA muestra en la tarjeta el tipo de archivo con su ícono y su texto: PDF, imagen, Word o Excel.
- RF-27: EL SISTEMA muestra en la tarjeta el nombre del documento.
- RF-61: EL SISTEMA muestra en la tarjeta el nombre original del archivo.
- RF-62: SI el nombre del documento no cabe en dos renglones, ENTONCES EL SISTEMA lo recorta con «…» (D18).
- RF-28: EL SISTEMA muestra en la tarjeta el proveedor o tercero, o «—» si no tiene.
- RF-29: EL SISTEMA muestra en la tarjeta la fecha del documento.
- RF-30: EL SISTEMA muestra en la tarjeta la fecha de vencimiento, o «No vence».
- RF-31: MIENTRAS el documento está vencido o vence en 30 días o menos, EL SISTEMA muestra en la tarjeta «Vencido» o «Vence en N días» con su color y su ícono (034/RF-38, RF-39).
- RF-32: EL SISTEMA muestra en la tarjeta quién subió el documento y cuándo.
- RF-33: EL SISTEMA muestra en la tarjeta el tamaño del archivo: en KB sin decimales por debajo de 1.024 KB, y en MB con un decimal desde ahí (D14).
- RF-69: SI el documento no tiene guardado su tamaño, ENTONCES EL SISTEMA no muestra la línea del tamaño en la tarjeta (D19).
- RF-34: EL SISTEMA muestra en la tarjeta el botón «Abrir» para un PDF o una imagen, y «Descargar» para un Word o un Excel (034/RF-35, RF-36).
- RF-35: MIENTRAS quien mira es gerencia y el documento no está anulado, EL SISTEMA muestra en la tarjeta el botón «Anular» (034/RF-48).
- RF-36: MIENTRAS el documento está anulado, EL SISTEMA muestra la tarjeta marcada «Anulado» (034/RF-46).
- RF-63: MIENTRAS el documento está anulado, EL SISTEMA muestra en la tarjeta quién lo anuló.
- RF-64: MIENTRAS el documento está anulado, EL SISTEMA muestra en la tarjeta el motivo de la anulación.
- RF-65: MIENTRAS el documento está anulado, EL SISTEMA deja abrirlo o descargarlo.
- RF-37: MIENTRAS el ancho de la pantalla es menor de 768 px, EL SISTEMA muestra las tarjetas de los documentos en una sola columna.

### Buscar y filtrar (H3)

- RF-38: CUANDO alguien escribe en el buscador, esté o no dentro de una carpeta, EL SISTEMA muestra los documentos de todas las carpetas que coinciden (D6).
- RF-39: EL SISTEMA busca en el nombre, el proveedor o tercero, la descripción y el nombre del archivo, sin distinguir mayúsculas ni tildes (034/RF-34).
- RF-40: MIENTRAS hay texto en el buscador, EL SISTEMA muestra en cada tarjeta el nombre de su carpeta.
- RF-66: MIENTRAS hay texto en el buscador, EL SISTEMA ordena los resultados del más reciente al más antiguo por fecha del documento (D15).
- RF-41: CUANDO alguien borra el texto del buscador, EL SISTEMA vuelve a donde estaba: a todas las carpetas o a la carpeta abierta.
- RF-42: SI la búsqueda no encuentra nada, ENTONCES EL SISTEMA lo dice y ofrece limpiar la búsqueda (050/RF-54).
- RF-43: EL SISTEMA conserva la casilla «Solo vencidos o por vencer», que aplica dentro de una carpeta y en la búsqueda (034/RF-40).
- RF-44: MIENTRAS la casilla «Solo vencidos o por vencer» está marcada y no hay carpeta abierta ni búsqueda, EL SISTEMA muestra solo las carpetas que tienen documentos vencidos o por vencer.
- RF-45: EL SISTEMA conserva la casilla «Ver anulados», que aplica dentro de una carpeta y en la búsqueda (034/RF-45).
- RF-67 (cambio del 2026-11-20): MIENTRAS «Ver anulados» está marcada y no hay carpeta abierta ni búsqueda, EL SISTEMA muestra también las carpetas que solo tienen anulados (RF-9), y deja los números de todas como están, sin contar los anulados (D9, D22). *Decía: solo que los números no cambian.*
- RF-68: EL SISTEMA deja abrir una carpeta que solo tiene anulados, aunque se vea en gris (D9).
- RF-46: EL SISTEMA retira el selector de clase de Documentos, porque cada carpeta es una clase (cambia 034/RF-33).

### Subir desde una carpeta (H4)

- ~~RF-47~~: *Retirado por el cambio del 2026-11-20 (D20): ya no hay carpetas vacías donde poner el botón; para el primer documento está el vacío de RF-70.* Decía: MIENTRAS quien mira puede subir, EL SISTEMA muestra en cada carpeta vacía el botón «Subir el primero».
- ~~RF-48~~: *Retirado por el cambio del 2026-11-20 (D20), por lo mismo que RF-47.* Decía: MIENTRAS quien mira no puede subir, EL SISTEMA muestra las carpetas vacías sin botón.
- RF-49 (cambio del 2026-11-20): CUANDO alguien sube desde una carpeta abierta, EL SISTEMA abre la ventana de subir con esa carpeta ya escogida. *Decía: desde una carpeta, vacía o abierta.*
- RF-50: EL SISTEMA deja cambiar la clase en la ventana de subir aunque venga escogida.
- RF-51: CUANDO alguien pulsa «Subir documento» en el encabezado sin carpeta abierta, EL SISTEMA abre la ventana sin clase escogida (050/RF-30).
- RF-52: CUANDO se sube un documento, EL SISTEMA actualiza los números de su carpeta y las cifras de arriba sin recargar la página.
- RF-53: CUANDO se sube un documento, desde donde sea, EL SISTEMA abre la carpeta de la clase con que quedó el documento, con el documento nuevo (D7).

### Las carpetas nacen al subir (H5, cambio del 2026-11-20)

- RF-70: MIENTRAS una empresa u obra no tiene ningún documento vigente (o solo tiene anulados y «Ver anulados» no está marcada), EL SISTEMA muestra en lugar de las carpetas el vacío de las listas del panel, con «Subir documento» a quien puede subir (050/RF-53).
- RF-71: CUANDO alguien sube un documento en Documentos de una empresa u obra, EL SISTEMA le ofrece como carpeta: las que ya tiene ese lugar, las clases de siempre de ese lugar como sugerencia (D20) y, al final, «＋ Nueva carpeta…».
- RF-72: CUANDO alguien elige «＋ Nueva carpeta…», EL SISTEMA le pide el nombre de la carpeta, obligatorio y de hasta 60 caracteres.
- RF-73: SI el nombre de la carpeta nueva coincide con una clase de siempre de ese lugar, sin distinguir tildes, mayúsculas ni espacios de más, ENTONCES EL SISTEMA guarda el documento en esa clase, sin crear otra carpeta.
- RF-74: SI el nombre de la carpeta nueva coincide de la misma forma con una carpeta ya creada en ese lugar, ENTONCES EL SISTEMA guarda el documento en esa carpeta, sin crear otra.
- RF-75: CUANDO se sube el primer documento de una clase o de una carpeta nueva, EL SISTEMA muestra esa carpeta entre las demás y la abre (RF-53).
- RF-76: MIENTRAS todos los documentos de una carpeta están anulados, EL SISTEMA no la muestra entre las carpetas, salvo con «Ver anulados» (RF-9, D22).
- RF-77: EL SISTEMA deja crear una carpeta a todo el que puede subir documentos en ese lugar, y a nadie más (D21; los permisos no cambian, RF-55).
- RF-78: EL SISTEMA no ofrece «＋ Nueva carpeta…» en la ficha de una persona, en la requisición de compra ni en la solicitud de pago: allí se sigue eligiendo solo entre las clases de siempre (RF-2).
- RF-79: EL SISTEMA vuelve a revisar al guardar el nombre de la carpeta nueva y su coincidencia con las clases de siempre y con las carpetas existentes, con la misma regla de la pantalla (principio 3).

### Reglas transversales

- RF-54: EL SISTEMA reparte los documentos en carpetas y cuenta vigentes, vencidos y por vencer con el mismo criterio de vencimiento de cada documento (034/RF-38, RF-39, RF-42). Se comprueba con las pruebas de reglas, no en pantalla (principio 3).
- RF-55: EL SISTEMA deja como están los permisos de ver, subir, abrir y anular, los tipos y el tamaño de archivo admitidos, y lo que se guarda de cada documento (034/RF-4 a RF-10, RF-24 a RF-30).

## Superficies afectadas

- [ ] **Móvil**: no cambia.
- [x] **Panel web**: la pantalla Documentos de Elemental, OCC, GeoLab y cada obra (carpetas, carpeta abierta, tarjetas de documento, búsqueda, subir desde una carpeta). La ficha de persona, la requisición, el pago y Contrato y Presupuesto no cambian.
- [x] **API**: la subida de un documento recibe además el nombre de la carpeta nueva (cambio del 2026-11-20); misma ruta, misma guardia y mismos permisos. La lista que ya llega trae todo lo demás.
- [ ] **Sincronización**: no cambia.
- [ ] **Datos**: no cambian; una carpeta creada se guarda en el documento, en la clase y el nombre de clase que ya existen.
- [x] **Reglas**: la clave y el nombre de una carpeta nueva y su coincidencia con las existentes (cambio del 2026-11-20); reparto en carpetas en el orden del catálogo, carpetas de clases retiradas, conteo de vigentes, vencidos y por vencer sin anulados, y tamaño legible del archivo; con casos en `verificar-reglas.ts`.

## Requisitos no funcionales

- Con 500 documentos, las carpetas aparecen en menos de 2 s; abrir una carpeta y cada letra del buscador responden en menos de 300 ms (como 034).
- Se ve completo, sin desplazarse a lo ancho, en 390 px, 1366 px y 1920 px (050).
- Todo el texto en español; las fechas como «19 nov 2026»; el tamaño como «850 KB» o «4,2 MB».
- El color nunca es la única señal: cada número de vencidos o por vencer, y cada aviso de vencimiento, lleva texto o ícono.

## Casos límite

- **Sin señal**: no aplica; es el panel web. Si la lista no carga, la pantalla muestra el error en su lugar, como cualquier lista del panel (050).
- **Evidencia firmada**: no cambia nada de lo guardado. Un documento no se edita ni se mueve de carpeta; para corregir la clase, gerencia lo anula y se sube de nuevo (034/RF-47).
- **Primer arranque** (cambio del 2026-11-20): una empresa u obra sin documentos muestra el vacío de las listas con «Subir documento» (RF-70); la primera carpeta aparece con el primer documento.
- **Dos personas crean la misma carpeta con distinta escritura** («Pólizas de obra» y «polizas DE OBRA»): quedan en una sola (RF-74).
- **Un nombre de carpeta que no deja nada al quitar tildes y signos** («—», «...»): se pide otro.
- **Una carpeta creada con un error de dedo**: no se renombra; se anula lo subido y se sube de nuevo en la carpeta correcta, y la carpeta mal escrita deja de verse cuando todo queda anulado (RF-76).
- **Clase retirada del catálogo**: sus documentos no se pierden; aparecen en su propia carpeta con el nombre guardado (RF-13).
- **Una carpeta solo con anulados** (cambio del 2026-11-20): no se ve; con «Ver anulados» aparece en gris con «0», y al abrirla salen sus anulados.
- **Dirección con una carpeta inventada o de otro lugar**: se ven todas las carpetas (RF-22).
- **Buscar dentro de una carpeta**: busca en todas (RF-38); al borrar la búsqueda se vuelve a la carpeta (RF-41).
- **Dos personas a la vez**: si otra persona sube o anula mientras se mira, los números se ponen al día al volver a cargar, como hoy.
- **Clase del documento distinta de la carpeta desde la que se subió** (se cambió en la ventana): el documento queda en la carpeta de su clase, y es esa la que se abre (RF-53).
- **Pruebas en desarrollo**: lo que se suba lleva el prefijo PRUEBA-051 y se borra al final con la limpieza acotada.

## Fuera de alcance

- Renombrar, borrar, fusionar o reordenar carpetas a mano, y crear una carpeta vacía, sin documento: una carpeta existe mientras tiene documentos (cambio del 2026-11-20). *Decía: crear, renombrar, borrar o reordenar carpetas.*
- Subcarpetas o carpetas por año.
- Mover un documento de una carpeta a otra.
- Un dibujo propio para cada clase (D5).
- Carpetas en la ficha de la persona, en la requisición de compra y en la solicitud de pago (D1).
- Los documentos del contrato y las pólizas de la obra (D2).
- Vista previa del archivo dentro de la tarjeta.
- Cambios en las clases de siempre, en los permisos o en lo que se guarda de cada documento.
- Carpetas compartidas entre lugares: una carpeta creada en OCC no aparece en GeoLab ni en una obra.
- La app del operador.

## Criterios de finalización

- Cada RF tiene cómo comprobarse: caso en `scripts/verificar-reglas.ts` (reparto en el orden del catálogo, clase retirada antes de «Otro», conteos sin anulados, tamaño legible) o paso de demo manual descrito.
- `npm run verificar`, `npm run typecheck` y `npm run lint` en verde.
- Demo manual en Chrome:
  - Documentos de OCC a 1366 px sin documentos: el vacío con «Subir documento», sin carpetas (cambio del 2026-11-20);
  - gerencia sube «PRUEBA-051 cámara de comercio» eligiendo Cámara de comercio, con vencimiento en 10 días: aparece esa carpeta, se abre con la tarjeta y cuenta «1» y «1 por vencer»;
  - gerencia sube «PRUEBA-051 manual» con «＋ Nueva carpeta…» «Manuales de obra»: aparece esa carpeta después de las del catálogo; otro con «manuales DE obra» cae en la misma; otro con la carpeta nueva «camara de comercio» cae en Cámara de comercio;
  - la ventana de subir de la ficha de una persona no ofrece «＋ Nueva carpeta…»;
  - la tarjeta muestra PDF, nombre, archivo, fecha, «Vence en 10 días», quién lo subió, tamaño y Abrir; gerencia ve Anular;
  - desde otra carpeta se busca «PRUEBA-051» y sale con el nombre de su carpeta; al borrar la búsqueda se vuelve a esa carpeta;
  - «atrás» del navegador vuelve a todas las carpetas, y la dirección copiada abre la misma carpeta;
  - gerencia anula todo lo de una carpeta: la carpeta deja de verse y, con «Ver anulados», vuelve en gris con «0» y la tarjeta aparece marcada;
  - lo mismo a 390 px, en una sola columna; y en una obra, con sus clases;
  - un residente ve las carpetas de su obra sin Anular, y puede crear una carpeta al subir;
  - al final, limpieza acotada de lo PRUEBA-051.

## Dudas resueltas (2026-11-18 y 2026-11-19)

- D1: las carpetas van solo en Documentos de Elemental, OCC, GeoLab y cada obra; la ficha de persona, la requisición y el pago siguen con su lista (RF-1, RF-2).
- D2: el contrato y las pólizas se quedan en Contrato y Presupuesto (RF-3).
- D3: siempre el orden del catálogo, con «Otro» al final; se ven todas, también las vacías en gris con «0» (RF-4, RF-5, RF-9).
- D4: dentro de una carpeta, tarjetas (RF-25).
- D5: el mismo dibujo de carpeta para todas (RF-11).
- D6: el buscador busca en todas las carpetas aunque haya una abierta (RF-38).

## Dudas resueltas en la clarificación (2026-11-19)

- D7: después de subir, se abre la carpeta donde quedó el documento, venga de donde venga (RF-53).
- D8: vigente es no anulado; un vencido cuenta y su carpeta no va en gris (RF-6).
- D9: «Ver anulados» no cambia los números de las carpetas, y una carpeta con solo anulados se puede abrir (RF-67, RF-68).
- D10: las cifras de arriba siguen siendo informativas (RF-56).
- D11: el nombre de la carpeta también va en la pestaña del navegador (RF-58).
- D12: varias clases retiradas, entre ellas por orden alfabético (RF-57).
- D13: RF-17 citaba mal la 050; la ruta es 050/RF-27 y RF-28.
- D14: tamaño en KB sin decimales hasta 1.024 KB, y en MB con un decimal desde ahí (RF-33).
- D15: resultados de la búsqueda del más reciente al más antiguo (RF-66).
- D16: carpeta abierta sin nada que mostrar → el vacío de la 050 con su botón (RF-60).
- D17: si la dirección trae carpeta y búsqueda, manda la búsqueda (RF-59).
- D18: el nombre del documento hasta dos renglones, luego «…» (RF-62).
- D19 (plan, 2026-11-19): un documento sin tamaño guardado no muestra la línea del tamaño (RF-69).

## Cambio del 2026-11-20 (Diego, antes del commit)

Al ver la 051 cumplida, Diego prefirió que no hubiera carpetas vacías y que las carpetas se crearan al subir.
Reemplaza a D3 en lo de mostrar todas las carpetas y las vacías en gris (el orden del catálogo sigue para
las clases de siempre), y retira RF-47 y RF-48.
- D20: al subir se siguen ofreciendo las clases de siempre de ese lugar, como sugerencia, junto a las
  carpetas ya creadas y «＋ Nueva carpeta…» (RF-71, RF-73).
- D21: crea carpetas todo el que puede subir en ese lugar; no cambia ningún permiso (RF-77).
- D22: una carpeta cuyos documentos están todos anulados deja de verse, y vuelve con «Ver anulados» (RF-9,
  RF-67, RF-76).

## Dudas abiertas

Ninguna.
