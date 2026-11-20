# Tareas — Spec 051

Tareas de menos de 30 minutos, ordenadas por dependencia. Cada una lleva los RF que
cubre y una línea `Hecho cuando:` que se pueda comprobar sin interpretar.

**Se implementa una tarea cada vez** (`/sdd:implementar T1`), y al terminarla se para.
Ninguna tarea se marca sin `npm run verificar`, `npm run typecheck` y `npm run lint`
en verde.

Lo que se ve en pantalla se revisa en el navegador de Diego: la extensión de Claude, una sola
pestaña y sin recargar en bucle. Para el celular se usa un recuadro de 390 px dentro de la página.
Si hay que forzar una respuesta, se intercepta la petición; nunca se guardan datos reales.

### Antes de tocar nada

- [x] T1. Fotos de «antes» de Documentos de OCC y de una obra a 1366 y a 390 px. Se suman la ficha
      de una persona, una requisición y un pago, para comparar al final que no cambiaron (RF-2).
      Se guardan en `specs/051-documentos-en-carpetas/fotos/antes/`. (RF: —)
      Hecho cuando: la carpeta tiene las fotos `pantalla-ancho.jpg` y su lista está en las Notas de
      ejecución.

### Reglas puras, con su caso en la verificación

- [x] T2. `carpetasDe(lugar, documentos)` en `src/shared/rules/documentos.ts`. Una carpeta por clase
      de `clasesDe`, en su orden; las retiradas van antes de «Otro», en orden alfabético y con su
      nombre guardado; cuenta `vigentes`, `vencidos` y `porVencer` sin anulados, y marca
      `tieneAnulados`. Lleva sus casos «051/…» en `scripts/verificar-reglas.ts`: lugar vacío,
      mezcla con anulado, dos retiradas, y la suma igual a `resumenDeVencimientos`. (RF-4 a RF-10,
      RF-13, RF-54, RF-57, RF-68)
      Hecho cuando: los cuatro casos pasan y los tres comandos están en verde.
- [x] T3. `tamanoLegible(bytes)` y `formatoDeArchivo(mime)` en la misma regla, con sus casos: 850 KB,
      1.048.575 y 1.048.576 bytes, 4,2 MB, `null`, y cada mime de `EXTENSIONES`. (RF-26, RF-33,
      RF-69)
      Hecho cuando: `tamanoLegible(null)` da `null`, `1.048.576` da «1,0 MB», los casos pasan y los
      tres comandos están en verde.

### Las piezas del panel que lo hacen posible

- [x] T4. **Prueba del riesgo principal del plan**: que «atrás» funcione con la carpeta en la
      dirección. Se probó primero con `pushState`/`popstate` en `useParametroDeDireccion` y falló;
      la salida probada es `router.push` a la misma ruta con `?carpeta=`, leída de
      `useLocalSearchParams` (ver Notas). Lo provisional y el cambio al ayudante se retiraron, y el
      plan quedó corregido. (RF-19, RF-20, RF-21)
      Hecho cuando: en el navegador, abrir la carpeta cambia la dirección; «atrás» la quita sin
      volver a pedir la lista; abrir la dirección con `?carpeta=rut` la lee; y lo provisional se
      retira.
- [x] T5. `alVolverDelRegistro` en `MarcoPantalla` y `Migas`: con `registro`, el paso del módulo
      llama a esa función en vez de navegar. Sin ella, todo igual. (RF-17)
      Hecho cuando: los tres comandos están en verde y la ficha de una persona conserva su ruta
      con enlace (se mira en el navegador).
- [x] T6. El título de la pestaña con registro: `titulo-del-registro.tsx` (proveedor y
      `useTituloDelRegistro`), el proveedor en `src/app/panel/_layout.tsx` y
      `tituloDeLaPestana(ruta, registro?)` en `modulos.ts`, con su caso en la verificación. (RF-58)
      Hecho cuando: el caso da «Pólizas y seguros · Documentos · OCC», sin registro el
      título no cambia en ninguna pantalla, y los tres comandos están en verde.
- [x] T7. Exportar `VentanaDeSubir` con `claseInicial` opcional y `alGuardar(clase)`. La clase
      sigue siendo editable, y `CarpetaDeDocumentos` la llama igual que hoy. (RF-49, RF-50, RF-51)
      Hecho cuando: los tres comandos están en verde y, en la ficha de una persona, la ventana se
      abre sin clase, como antes.
      Notas (20-nov): `VentanaDeSubir` exportada desde `pantalla-documentos.tsx`; `claseInicial`
      solo da el valor inicial del selector (sigue editable) y `alGuardar` recibe la clase con que
      se guardó. `CarpetaDeDocumentos` no cambió de llamada. Visto en la ficha de ADRIAN ALEJANDRO
      SOTO: «Elija la clase», sin subir nada. 1105 verificaciones.

### Las tarjetas

- [x] T8. `TarjetaDeCarpeta` en `src/features/documentos/tarjetas.tsx`: ícono `documentos`, nombre,
      número de vigentes, vencidos en tono malo y por vencer en tono atención (los dos con texto),
      gris con «0» cuando está vacía, y «Subir el primero» solo si se puede subir. (RF-6 a RF-9,
      RF-11, RF-47, RF-48)
      Hecho cuando: los tres comandos están en verde y la tarjeta se ve en el navegador montada de
      forma provisional en Documentos de OCC, con una carpeta vacía y una con documentos.
      Notas (20-nov): `src/features/documentos/tarjetas.tsx` con `TarjetaDeCarpeta` (carpeta,
      alAbrir, alSubir opcional). Toda la tarjeta abre salvo el botón, que va fuera de la zona
      pulsable (botón dentro de botón no vale en HTML). Vacía: fondo `fondoCabecera`, sin sombra,
      texto de apoyo, «Sin documentos». Singular «1 vencido». Vista montada provisionalmente en
      Documentos de **Elemental** (OCC no tiene ningún documento): RUP con 1 en blanco, cinco
      vacías en gris con «Subir el primero»; las cifras de vencidos/por vencer se vieron forzando
      valores en el montaje (no hay datos vencidos). Montaje retirado. 1105 verificaciones.
- [x] T9. `TarjetaDeDocumento` en el mismo archivo:
      - tipo con ícono y texto;
      - nombre hasta dos renglones con «…»;
      - archivo, proveedor o «—», fecha y vence o «No vence»;
      - aviso con color e ícono;
      - quién lo subió y cuándo;
      - el tamaño, solo si lo hay;
      - «Abrir» o «Descargar», y «Anular» solo para gerencia;
      - la marca de anulado, con quién lo anuló y el motivo;
      - el nombre de la carpeta, opcional, para la búsqueda.

      (RF-25 a RF-36, RF-40, RF-61 a RF-65, RF-69)
      Hecho cuando: los tres comandos están en verde y, en el navegador, se ve una tarjeta de PDF
      vigente, una vencida y una anulada (la anulada con «Ver anulados»).
      Notas (20-nov): `TarjetaDeDocumento` (documento, carpeta?, alAbrir(descargar), alAnular?) en
      `tarjetas.tsx`; íconos nuevos `archivo` e `imagen` en `panel/iconos.tsx` (no había); aviso con
      símbolo ✕/◷ más texto, anulado con ⊘. Vista montada provisionalmente en Documentos de
      Elemental: el PDF real vigente y, a su lado, dos copias inventadas solo en pantalla (Word
      vencido de nombre largo con «Carpeta: RUP», y una imagen anulada sin tamaño). La casilla
      «Ver anulados» es de la T12; aquí la anulada se pintó directo. Montaje retirado. 1105
      verificaciones.

### El archivador

- [x] T10. `ArchivadorDeDocumentos` en `src/features/documentos/archivador.tsx`, con las carpetas.
      Lleva las cifras de arriba, que no se pulsan; la cuadrícula de `carpetasDe`; una sola columna
      por debajo de 768 px; y montarlo en `PantallaDocumentos` en lugar de `CarpetaDeDocumentos`.
      (RF-1, RF-4, RF-5, RF-12, RF-14, RF-56)
      Hecho cuando: en el navegador, Documentos de OCC muestra todas sus carpetas en el orden del
      catálogo con «Otro» al final, y a 390 px van en una sola columna.
      Notas (20-nov): `archivador.tsx` con cifras (sin pulsar), cuadrícula medida con onLayout
      (columnas según `AnchoMinimoCarpeta` 220, nuevo en `medidas.ts`; ancho redondeado hacia abajo
      porque con decimales la quinta saltaba de fila) y la ventana de subir del encabezado.
      `PantallaDocumentos` monta el archivador; `CarpetaDeDocumentos` sigue para ficha, requisición y
      pago. Mientras llegan T11–T13, en Documentos no se abren carpetas, no hay búsqueda ni
      «Subir el primero», y ya no se ve la lista (el subir del encabezado sí). Visto en OCC: 15
      carpetas en el orden del catálogo con «Otro» al final, 5 por fila a 1536; a 390 una columna y
      sin desplazamiento lateral. 1105 verificaciones.
- [x] T11. Abrir una carpeta con `router.push(ruta?carpeta=…)` y leerla de `useLocalSearchParams`, como se probó en
      la T4. Para volver a las carpetas: `router.back()` si la pantalla de abajo son las carpetas, `router.replace` si
      se llegó por un enlace directo.
      - el título y la ruta de T5 llevan el nombre de la carpeta, y la pestaña el de T6;
      - un botón «Todas las carpetas»;
      - las tarjetas de T9 ordenadas por fecha y paginadas con `POR_PAGINA`;
      - una carpeta inexistente en la dirección muestra todas las carpetas;
      - una carpeta solo con anulados se puede abrir.

      (RF-15 a RF-24, RF-37, RF-58, RF-68)
      Hecho cuando: en el navegador, abrir «RUT» cambia el título, la ruta y la pestaña; «atrás»,
      el paso «Documentos» de la ruta y «Todas las carpetas» vuelven a las carpetas; y
      `?carpeta=inventada` muestra las carpetas.
      Notas (20-nov): `PantallaDocumentos` lee `carpeta` de `useLocalSearchParams`, arma las carpetas
      con `carpetasDe` y pasa título, `registro`, `alVolverDelRegistro` y `useTituloDelRegistro`.
      Volver: `router.back()` si la ruta de abajo en el Stack es la misma pantalla sin `carpeta`
      (`useNavigation().getState()`), si no `router.replace(ruta)`. El archivador gana
      `CarpetaAbierta` (fecha desc, `POR_PAGINA`, anular con `VentanaDeAnular`) y una `Cuadricula`
      común (token nuevo `AnchoMinimoTarjetaDeDocumento` 320). Los anulados aún no se ven y el vacío
      es una frase: «Ver anulados» y el vacío de la 050 son de la T12. RF-68: toda carpeta se puede
      pulsar. Visto en el navegador: abrir RUT en OCC → `?carpeta=rut`, ruta «OCC › Documentos ›
      RUT», título «RUT», pestaña «RUT · Documentos · OCC»; vuelven «atrás», el paso «Documentos» y
      «Todas las carpetas»; `?carpeta=inventada` muestra las 15; enlace directo a `?carpeta=rup` de
      Elemental muestra la tarjeta del PDF, y «Todas las carpetas» reemplaza (history.length igual).
      1105 verificaciones.
- [x] T12. La búsqueda y las casillas.
      - Con texto, se buscan los documentos de todas las carpetas por fecha, con el nombre de la
        carpeta, aunque haya una abierta.
      - Al borrar el texto se vuelve a donde se estaba.
      - Si no se encuentra nada, se ofrece limpiar.
      - «Solo vencidos o por vencer» filtra las carpetas o los documentos.
      - «Ver anulados» no cambia los números.
      - Una carpeta abierta sin nada que mostrar enseña el vacío de la 050.
      - Se retira el selector de clase.

      (RF-38 a RF-46, RF-59, RF-60, RF-66, RF-67)
      Hecho cuando: en el navegador, buscar dentro de «RUT» muestra documentos de otras carpetas con
      su nombre; al borrar el texto se vuelve a «RUT»; y con la casilla marcada solo quedan las
      carpetas con vencidos o por vencer.
      Notas (20-nov): en `archivador.tsx`, buscador (`useParametroDeDireccion('buscar')`, el mismo
      `coincideBusqueda` de la 034) y las dos casillas; `ListaDeDocumentos` común para carpeta y
      búsqueda (fecha desc, `POR_PAGINA`, «Carpeta: …» en la búsqueda). El vacío de la 050 salió de
      `Tabla` a `ListaVacia` en `panel/componentes.tsx` (Tabla la usa igual) para que el archivador
      enseñe el mismo. Sin selector de clase. Vista en Elemental: dentro de RUT el vacío con «Subir
      documento»; buscar «rup» desde RUT muestra el PDF con «Carpeta: RUP»; borrar vuelve a RUT; el
      riesgo de la T4 no se dio: «atrás» tras buscar dentro de RUT vuelve a las 13 carpetas con el
      buscador vacío. Casilla de vencidos probada cambiando la respuesta en la página (RUP como
      vencido, nada guardado): solo queda RUP con «1 vencido». 1105 verificaciones.
      **Para la T15 / Diego:** mientras se busca con una carpeta abierta, el título y la ruta
      siguen diciendo la carpeta («RUT») aunque los resultados son de todas; la spec no dice lo
      contrario (RF-16 habla de carpeta abierta), pero puede confundir.
- [x] T13. Subir desde una carpeta.
      - «Subir el primero» y la carpeta abierta pasan `claseInicial`; el encabezado sin carpeta la
        deja vacía.
      - Al guardar se abre la carpeta de la clase final, sin texto en el buscador.
      - Se recargan los números y las cifras.

      (RF-47, RF-49 a RF-53)
      Hecho cuando: en el navegador, gerencia sube un PDF «PRUEBA-051 RUT» desde la carpeta vacía de
      RUT (con la clase ya puesta), la carpeta se abre con la tarjeta y cuenta «1»; al subir otro
      cambiando la clase en la ventana, se abre la carpeta de esa otra clase.
      Notas (20-nov): en `archivador.tsx`, `subirEn(clase)` para «Subir el primero» y el vacío de una
      carpeta abierta; el encabezado pasa `claseInicial = abierta?.id` (sin carpeta, ninguna). Al
      guardar: aviso, búsqueda vacía, recarga y, si la clase final no es la abierta, `alAbrir(clase)`.
      Probado como gerencia en Elemental (desarrollo, `neondb`): el archivo lo armó la página (un PDF
      mínimo en un `File`, sustituyendo el `click` del input de archivo para no abrir el selector del
      sistema). «Subir el primero» en RUT → ventana con RUT → «PRUEBA-051 RUT» → se abrió RUT con la
      tarjeta y vigentes 2. Desde RUT abierta, encabezado → ventana con RUT, cambiada a Cámara de
      comercio → «PRUEBA-051 camara» → se abrió Cámara de comercio, vigentes 3. Las carpetas cuentan
      RUT 1 y Cámara de comercio 1. **Quedan en desarrollo los dos documentos PRUEBA-051** (nada se
      borra; se anulan si estorban). 1105 verificaciones.

### Cierre

- [x] T14. Barrido final.
      - Las fotos de «después» se comparan con T1; la ficha, la requisición y el pago deben verse
        igual.
      - Documentos de una obra con sus clases; una prueba como residente con la petición
        interceptada, sin «Anular».
      - Se anula «PRUEBA-051» y se comprueba el número.
      - Limpieza acotada de lo PRUEBA-051.
      - «Modificada por la spec 051» en las specs 034 y 050.
      - `npx expo export --platform web` sin errores.

      (RF-2, RF-3, RF-10, RF-35, RF-55)
      Hecho cuando: las fotos de «después» están en `fotos/despues/`, la ficha, la requisición y el
      pago coinciden con las de «antes», no queda nada PRUEBA-051 en desarrollo, y el export y los
      tres comandos están en verde.
      Notas (20-nov):
      - **Anular y número (RF-10):** como gerencia se anuló «PRUEBA-051 camara» con motivo; la carpeta
        Cámara de comercio volvió a 0 en gris, arriba «2 vigentes · y 1 anulados», y con «Ver
        anulados» la tarjeta salió tachada con quién la anuló. Era una carpeta solo con anulados y se
        pudo abrir (RF-68).
      - **Residente (RF-35):** en un recuadro con `/api/auth/yo` cambiado en la página (rol
        `residente` y su obra Consorcio Antioquia; el servidor siguió viendo a Gerencia): las
        carpetas de la obra (Planos, Estudios y diseños, Permisos y licencias, Actas de obra…) con
        «Subir documento» y «Subir el primero»; con un documento inventado en la respuesta, su
        tarjeta solo trae «Abrir». «Pólizas de la obra» es una clase de Documentos desde la 034; las
        pólizas del contrato siguen en Contrato y Presupuesto (RF-3).
      - **Fotos:** 10 en `fotos/despues/`, con los mismos nombres que en `antes/`. Se tomaron antes de
        la limpieza (Elemental muestra RUT con 1 y «y 1 anulados»). La ficha de ADRIAN ALEJANDRO SOTO,
        los Adjuntos de RQ-0018 y los del pago RQ-0005 (id 01a1e7d1-…) se ven como en T1: lista, selector
        de clase y vacío con «Subir documento» (RF-2).
      - **Limpieza acotada:** script temporal contra `neondb` (se negaba a otra base): 2 documentos
        PRUEBA-051, sin referencias en recepciones ni pagos; R2 DELETE de sus 2 objetos → 204 y 204;
        filas de documentos y media borradas; quedan 0 y 0. Script borrado.
      - Specs 034 y 050 marcadas «Modificada por la spec 051».
      - `npx expo export --platform web` sin errores y sin secretos en `dist/client` (borrado).
        1105 verificaciones; typecheck y lint en verde.
- [x] T15. Validación final: recorrido RF por RF de la spec, más la demo manual de los criterios de
      finalización. (Todos)
      Hecho cuando: `validacion.md` tiene cada RF del 1 al 69 con su comprobación y su resultado,
      los tres comandos están en verde y la spec queda marcada como Cumplida.
      Notas (20-nov): `validacion.md` con 69/69 en verde (RF-23, RF-24, RF-48 y RF-66 por código) y la
      demo de los criterios en OCC: «PRUEBA-051 cámara de comercio», que vence a 10 días, subido desde su
      carpeta vacía; la tarjeta completa; buscar desde RUT; «atrás»; dirección copiada; carpeta y búsqueda
      en la dirección; 390 px; anular y «Ver anulados». GeoLab con sus 15 carpetas. Limpieza: 1 documento,
      R2 204, quedan 0. Spec marcada **Cumplida**. Observaciones: ciclo de imports
      pantalla-documentos ↔ archivador (avisa Metro, funciona) y la duda del título mientras se busca.
      1105 verificaciones; typecheck y lint en verde.

### Cambio del 2026-11-20: las carpetas nacen al subir

- [x] T16. Reglas, con los casos primero: `esLugarConCarpetas`, `claseParaNombre`, `esClaseDe` y
      `faltasDelDocumento` con carpetas propias, `carpetasDe(…, { conAnulados })` sin vacías y con el orden
      nuevo, `opcionesDeCarpeta`. Se ajustan los casos 051 de RF-4/5/9 y RF-13/57. (RF-4, RF-5, RF-9, RF-57,
      RF-67, RF-70, RF-71, RF-73, RF-74, RF-76, RF-78, RF-79)
      Hecho cuando: los casos nuevos fallaron antes de la regla y ahora pasan, y los tres comandos están en
      verde.
      Notas (20-nov): primero los casos (fallaron: `carpetasDe('occ', [])` daba las 15 vacías), después la
      regla. En `rules/documentos.ts`: `PREFIJO_DE_CARPETA`, `LARGO_MAXIMO_DE_CARPETA` (60),
      `VALOR_NUEVA_CARPETA`, `esLugarConCarpetas`, `esCarpetaPropia`, `claseParaNombre`, `opcionesDeCarpeta`;
      `esClaseDe` y `faltasDelDocumento` aceptan `carpeta:<clave>` solo en empresas y obras (con
      `claseNombre` en `DatosDelDocumento`); `carpetasDe(…, { conAnulados })` sin vacías, con `propia` en la
      carpeta y el orden catálogo → propias y retiradas (`localeCompare` con `sensitivity: 'base'`) → «Otro».
      La clave se compara contra la clave del nombre de cada clase de siempre, así que los espacios repetidos
      no cuentan (`normalizar` solo quita los de los bordes). 5 casos nuevos y 3 ajustados (RF-4/70,
      RF-9/67/76 y el de las retiradas). 1110 verificaciones. Desde ya el archivador deja de pintar las
      carpetas vacías y «Subir el primero», porque usa `carpetasDe`; el vacío del lugar llega en la T19.
- [x] T17. API: `claseNombre` en `documentoDelGrupoNuevo`; `subirDocumento` recalcula la clase propia con
      `claseParaNombre` y guarda lo del servidor; la respuesta devuelve la `clase` guardada; el cliente manda
      el campo. (RF-72, RF-79)
      Hecho cuando: los tres comandos están en verde y el export web sale sin secretos en `dist/client`.
      Notas (20-nov): la decisión de con qué clase y nombre se guarda salió a una regla pura,
      `claseAGuardar(lugar, { clase, claseNombre })` en `rules/documentos.ts`, con su caso primero
      («051/RF-79 … T17»: la clave sale del nombre aunque la pantalla mande otra; «PLANOS» cae en Planos;
      una clase de siempre se guarda con el nombre del catálogo). `documentoDelGrupoNuevo` gana `claseNombre`
      (máx. 60), la ruta `documentos+api.ts` lo lee del formulario, `subirDocumento` guarda lo que da
      `claseAGuardar` (antes: `nombreDeClase(...) ?? datos.clase`) y responde `{ id, clase }`;
      `api.documentos.subir` tipa la respuesta. La pantalla todavía no manda `claseNombre`: eso es la T18.
      Probado solo con la verificación; en el navegador se prueba en la T18 y la T20. 1111 verificaciones;
      export web sin errores ni secretos en `dist/client` (borrado).
- [x] T18. `VentanaDeSubir` a `ventana-de-subir.tsx` (con `DocumentosCargados`), sin ciclo de imports; con
      `carpetas`, el selector de `opcionesDeCarpeta` y el campo «Nombre de la carpeta»; `alGuardar` con la
      clase que respondió el servidor. (RF-71, RF-72, RF-78)
      Hecho cuando: los tres comandos están en verde, el servidor de desarrollo ya no avisa «Require cycle»
      por estos archivos, y la ficha de una persona abre la ventana sin «＋ Nueva carpeta…».
      Notas (20-nov): `src/features/documentos/ventana-de-subir.tsx` nuevo con `VentanaDeSubir`; con `carpetas`
      el selector se llama «Carpeta», usa `opcionesDeCarpeta` y «＋ Nueva carpeta…» abre «Nombre de la
      carpeta» (con `faltaDelNombreDeCarpeta`, que se exportó de la regla), y avisa «Ya existe: el documento
      va a «…»» cuando `claseParaNombre` cae en una carpeta o clase que hay. Manda `clase` y `claseNombre`, y
      `alGuardar` recibe la clase que respondió el servidor. Una `claseInicial` que no está entre las opciones
      no se preselecciona. **Cambio respecto del plan:** `DocumentosCargados` no se movió; el archivador lo
      toma con `import type`, que no queda en el paquete, y eso basta para cortar el ciclo. El archivador ya
      le pasa sus `carpetas`. Visto en el navegador: en OCC la lista dice «Carpeta», trae las clases de
      siempre y «＋ Nueva carpeta…»; «camara  de COMERCIO» avisa que va a Cámara de comercio (cerrado sin
      subir); en la ficha de ADRIAN ALEJANDRO SOTO sigue «Clase» y «nueva» no encuentra ninguna opción. En el
      registro del servidor ya no hay ciclo de Documentos; **queda uno que ya existía**, fuera de esta spec:
      `compras/vista-de-la-solicitud.tsx` ↔ `requisiciones/cadena-y-decision.tsx`. 1111 verificaciones.
- [x] T19. Archivador y tarjeta: sin carpetas vacías, el vacío del lugar con «Subir documento», «Ver anulados»
      con las carpetas solo de anulados, la carpeta de la dirección buscada con anulados, y sin «Subir el
      primero». (RF-4, RF-9, RF-22, RF-47, RF-48, RF-67, RF-68, RF-70, RF-76)
      Hecho cuando: en el navegador, OCC sin documentos muestra solo el vacío con «Subir documento», y los
      tres comandos están en verde.
      Notas (20-nov): `TarjetaDeCarpeta` sin `alSubir` ni «Subir el primero»; la que solo tiene anulados dice
      «Solo anulados». En el archivador, con «Ver anulados» la cuadrícula usa `carpetasDe(…, { conAnulados:
      true })`; sin carpetas que mostrar sale `ListaVacia` con «Todavía no hay documentos aquí. Al subir el
      primero se crea su carpeta.» y «Subir documento» (sin clase) a quien puede, o «No hay resultados con
      estos filtros» si las esconde la casilla de vencidos. `PantallaDocumentos` busca la carpeta de la
      dirección entre todas (con anulados) y pasa al archivador solo las que tienen vigentes. También se
      corrigió la descripción de la pantalla, que hablaba de carpetas grises. Visto en el navegador: OCC sin
      documentos muestra solo el vacío con «Subir documento». «Ver anulados» con carpetas solo de anulados se
      prueba en la demo de la T20 (hoy no hay anulados en desarrollo). 1111 verificaciones.
- [x] T20. Barrido y demo: la de los criterios de finalización de la spec (carpeta de catálogo, carpeta
      nueva, misma carpeta con otra escritura, nombre que coincide con el catálogo, anular todo y «Ver
      anulados», 390 px, residente con la sesión cambiada en un recuadro); fotos de «después» nuevas de
      Documentos y de la ficha, la requisición y el pago; limpieza acotada PRUEBA-051. (RF-2, RF-75, RF-77, y
      los de la demo)
      Hecho cuando: la demo pasa entera, no queda nada PRUEBA-051 en desarrollo y los tres comandos están en
      verde.
      Notas (20-nov), en OCC como Gerencia contra `neondb`:
      - OCC sin documentos: solo el vacío con «Subir documento» (T19).
      - «PRUEBA-051 cámara de comercio» con la carpeta Cámara de comercio y vence el 30-nov → se creó la carpeta
        y se abrió (pestaña «Cámara de comercio · Documentos · OCC»).
      - «PRUEBA-051 manual» con «＋ Nueva carpeta…» «Manuales de obra» → `?carpeta=carpeta:manuales_de_obra`,
        abierta. En las carpetas: Cámara de comercio primero y Manuales de obra después (RF-5).
      - «PRUEBA-051 manual 2» con «manuales DE obra» → la ventana avisó «Ya existe: el documento va a
        «Manuales de obra»» y cayó en la misma carpeta (RF-74).
      - «PRUEBA-051 camara 2» con la carpeta nueva «camara de comercio» → avisó y cayó en Cámara de comercio
        (RF-73).
      - Anulados los dos de Manuales de obra → la carpeta dejó de verse; con «Ver anulados», en gris «0 · Solo
        anulados» (RF-9, RF-76). Arriba «2 vigentes · y 2 anulados».
      - Residente (recuadro con `/api/auth/yo` cambiado a residente de Consorcio Antioquia): la obra sin
        documentos muestra el vacío y la ventana ofrece «＋ Nueva carpeta…» (RF-77). No se subió nada.
      - 390 px: las carpetas en una columna. Fotos de «después» rehechas (10, mismos nombres; `-390` y
        `-390-fila` de Elemental son la misma toma). La ficha, la requisición y el pago, iguales que en T1.
      - Limpieza acotada con script temporal contra `neondb`: 4 documentos, R2 204 ×4, quedan 0; script borrado.

      **Dos defectos encontrados en la demo y arreglados aquí:**
      1. La carpeta cambiaba de nombre al subir con otra escritura («manuales DE obra» renombraba «Manuales de
         obra» para todos), porque manda el nombre del documento más reciente. Ahora la ventana manda el nombre
         que ya tiene la carpeta cuando el nombre escrito cae en una existente (`nombreQueSeManda` en
         `ventana-de-subir.tsx`). Se borró «PRUEBA-051 manual 2», se repitió y la carpeta conservó su nombre.
      2. Al volver a las carpetas con «atrás» o «Todas las carpetas», los números eran los de antes de subir o
         anular dentro de una carpeta: la pantalla de abajo del Stack no pedía la lista otra vez. **Venía desde
         la T11**; no se vio porque esas pruebas no cambiaban datos. `PantallaDocumentos` recarga con
         `useFocusEffect` cada vez que vuelve a quedar delante (no la primera), sin la ruedita. Probado: anular
         «PRUEBA-051 camara 2» y volver bajó Cámara de comercio de 2 a 1 sin recargar la página.
      1111 verificaciones; typecheck y lint en verde.
- [x] T21. Revalidación: `validacion.md` rehecho para los RF vigentes (1 a 79, sin RF-47 ni RF-48) y la spec
      otra vez «Cumplida». (Todos)
      Hecho cuando: cada RF vigente tiene su comprobación y su resultado, los tres comandos están en verde y
      el export web sale sin secretos.
      Notas (20-nov): `validacion.md` rehecho: 77/77 RF vigentes en verde (RF-47 y RF-48 retirados; RF-24 y RF-66
      por código). Export web sin errores (197 rutas de API) y sin secretos en `dist/client`; permisos y esquema
      sin cambios. Spec marcada **Cumplida, con su cambio**. 1111 verificaciones; typecheck y lint en verde.

## Notas de ejecución

**T1 (19-nov).** 10 fotos en `fotos/antes/`, tomadas con un recuadro de 1366×768 y 390×844 dentro de la
página (`window.ver`, reducido para caber en la ventana) y la sesión de Gerencia en desarrollo:
- Documentos de OCC a 1366 y 390 (sin documentos: el vacío de la 050);
- Documentos de Elemental a 1366 y 390, más 390 bajando hasta la tarjeta (`-390-fila`): es el único lugar
  con un documento en desarrollo («Rup Elemental_12 Marzo», RUP);
- Documentos de la obra Consorcio Antioquia a 1366 y 390 (vacía);
- la sección Documentos de la ficha de ADRIAN ALEJANDRO SOTO, los Adjuntos de la requisición RQ-0018 de
  Consorcio Antioquia y los del pago RQ-0005 de Tesorería, a 1366 (las tres vacías). Son las que T14 compara
  para RF-2.

Para la T4, algo que ya existe: `pantalla-requisiciones.tsx` abre una requisición por dirección con
`useParametroDeDireccion('requisicion')` **y además** `useLocalSearchParams` de expo-router, porque al llegar
por un enlace interno la dirección todavía no cambió (spec 048, RF-52). Es un antecedente de cómo convive el
ayudante con expo-router; la T4 tiene que tenerlo en cuenta.

**T2 (19-nov).** `carpetasDe` y los tipos `CarpetaDelArchivador` y `DocumentoParaCarpeta` en
`src/shared/rules/documentos.ts`. El tipo se llama «del archivador» porque `CarpetaDeDocumentos` ya es la lista
de la ficha, la requisición y el pago. `DocumentoParaCarpeta` es lo mínimo que hace falta, y `DocumentoDelLugar`
lo cumple tal cual. Primero se escribieron los cuatro casos «051/…», que fallaron, y después la regla. Quedan
1101 verificaciones.

**T3 (19-nov).** `tamanoLegible` y `formatoDeArchivo`, con el tipo `FormatoDeArchivo`, en la regla de documentos.
**El nombre cambió:** el plan decía `tipoDeArchivo`, pero ese nombre ya lo usa `rules/whatsapp.ts` con otro
significado (el tipo de contenido de un adjunto) y chocaba en la verificación. Se cambió en el plan y en las
tareas. Decisiones menores dentro de la spec:
- un archivo de unos pocos bytes dice «1 KB», porque «0 KB» se leería como vacío;
- `formatoDeArchivo` da `null` para un tipo que no es de documentos;
- un caso comprueba que todo tipo admitido (`MIMES_DE_DOCUMENTOS`) tenga su formato.

Quedan 1103 verificaciones.

**T4 (19-nov). La decisión del plan no funcionó y se cambió**; las medidas son del navegador, con un botón
provisional en Documentos de OCC que contaba montajes y peticiones de `/api/panel/documentos`:
1. **`pushState(null)` + `popstate`** (el plan). El primer «atrás» iba perfecto: sin montar otra vez y sin
   pedir nada. Pero «adelante», y cualquier «atrás» hacia una entrada creada así, hacían que expo-router
   montara la pantalla de nuevo y pidiera la lista, y la carpeta no se leía. Al montarse, la dirección decía
   `?pagina=documentos`. La causa está en `node_modules/expo-router/build/fork/useLinking.js`: si la entrada
   no es suya (`record.path === path && record.state`), la trata como un enlace nuevo y monta.
2. **`pushState(history.state)`**, es decir, copiar su marca. Fue peor: cada «atrás» y «adelante» montaba
   otra vez.
3. **`router.push(ruta?carpeta=x)`**, leyendo con `useLocalSearchParams`. Abrir monta una pantalla y pide la
   lista una vez. «Atrás» vuelve a la de abajo, que sigue montada, sin pedir nada. «Adelante» monta y pide
   una vez. La carpeta se lee bien en todos los pasos, y también al abrir `?carpeta=rut` directo. Es lo que
   queda.

`router.setParams` no sirve: `useLinking` solo hace `push` cuando crece la pila; si solo cambian los
parámetros, hace `replace`. Se corrigieron el plan (módulos, algoritmo, decisión y riesgos) y la T11. No
queda código de esta tarea: `useParametroDeDireccion` y la pantalla volvieron a como estaban. Riesgo nuevo
para la T12: la búsqueda escribe con `replaceState(null)` y borra la marca de expo-router de esa entrada; hay
que probar «atrás» después de buscar dentro de una carpeta.

**T5 (19-nov).** `alVolverDelRegistro` en `MarcoPantalla` y `Migas`: solo el penúltimo paso (el módulo), con
registro y con la función, la llama en vez de ir por un `Link`. Lleva el caso «051/RF-17 (T5)», y la aserción de
«050/RF-26 a RF-32» se ajustó a la línea nueva del marco. En el navegador, la ficha de ADRIAN ALEJANDRO SOTO
sigue con su ruta: «Elemental › Recursos Humanos» como enlace a `/panel/elemental/recursos-humanos`, y el nombre
como paso actual. Quedan 1104 verificaciones.

**Falla que ya existía, encontrada aquí y fuera de esta spec:** desde la ficha de una persona, el paso «Recursos
Humanos» cambia la dirección al listado, **pero la ficha se queda abierta**. Se comprobó volviendo un momento al
código de antes de la T5: pasa igual. Es lo que la 051 previó para Documentos: un enlace a la misma pantalla no
reinicia su estado (`?persona=` vive en `useParametroDeDireccion`, que se lee una sola vez). Incumple
050/RF-28 en la ficha, y seguramente en la requisición (`?requisicion=`) y en el pago (`?solicitud=`). Se arregla
con `alVolverDelRegistro` en esas tres pantallas, pero no es de esta spec (RF-2 dice que no se tocan). Hay que
decirle a Diego y decidir si va por `/sdd:cambio` a la 050.

Decisión de Diego (19-nov): A — al cerrar la 051, /sdd:cambio a la 050 para arreglar la ruta de arriba en la ficha, la requisición y el pago (usando alVolverDelRegistro).

**T6 (19-nov).**
- **Qué se hizo:** `src/features/panel/titulo-del-registro.tsx` (`ProveedorTituloDelRegistro`,
  `useTituloDelRegistro`, `useRegistroDeLaPestana`); `tituloDeLaPestana(ruta, registro?)`; el proveedor y el
  registro en `src/app/panel/_layout.tsx`. Al irse, cada pantalla quita solo **su** nombre, porque con
  `router.push` (T4) la pantalla de abajo sigue montada. Lleva el caso «051/RF-58 (T6, D11)».
- **El formato cambió respecto de la tarea:** dentro de una empresa la pestaña ya decía «Documentos · OCC», sin
  «Kontrola», y se conserva. Con carpeta queda «Pólizas y seguros · Documentos · OCC», y se corrigió el
  «Hecho cuando».
- **Formateo:** Prettier cambió las comillas del layout a dobles y se devolvieron a mano a simples. El diff de
  `_layout.tsx` es la sangría del proveedor nuevo más 5 líneas.
- **Prueba en el navegador:** a medias. La pestaña del grupo estaba en uso (Requisiciones de OCC) y no se movió;
  su título, ya con el código nuevo, sigue siendo «Requisiciones · OCC». El título con carpeta se verá en la T11,
  que es la primera que publica un registro.
- Quedan 1105 verificaciones.

