# Tareas — Spec 049

Tareas de menos de 30 minutos, ordenadas por dependencia. Cada una lleva los RF que
cubre y una línea `Hecho cuando:` que se pueda comprobar sin interpretar.

**Se implementa una tarea cada vez** (`/sdd:implementar T1`), y al terminarla se para.
Ninguna tarea se marca sin `npm run verificar`, `npm run typecheck` y `npm run lint`
en verde.

### Base: textos de marca y títulos

- [x] T1. Crear `src/shared/catalogos/marca.ts` (GRUPO, SISTEMA, LOGOTIPO, LEMA, AUTOR, PIE, ENCABEZADO) y
      pasar a leerlo `SISTEMA` de `modulos.ts` y los dos títulos de `marco-sesion.tsx`. Actualizar los casos de
      `tituloDeLaPestana` en `scripts/verificar-reglas.ts` y añadir los de `tituloDelLugar` (empresa, obra,
      lista de obras). (RF-10, RF-11, RF-12, RF-13, RF-39, RF-43, RF-50)
      Hecho cuando: los tres comandos en verde, con casos que esperan «Obras · Kontrola», «Tesorería ·
      Elemental», «Resumen del día · Proyectos» y «Proyectos».
- [x] T2. Encabezado de los archivos del Asistente e instrucciones de la IA: `grupo: ENCABEZADO` en
      `archivos-del-asistente.ts` y las `INSTRUCCIONES` de `conversacion.ts` presentando a Kontrola del Grupo HS
      como dueño de Elemental, OCC, GeoLab y las obras; caso en la verificación para `encabezadoDelArchivo`.
      (RF-31, RF-34, RF-35)
      Hecho cuando: los tres comandos en verde y la verificación comprueba que `grupo` es «Grupo HS · Kontrola».

### Archivos generados

- [x] T3. `src/features/servidor/marca-de-archivos.ts` con `marcarLibro(libro)` (autor y pie de página de
      impresión en cada hoja) y su caso en la verificación: libro de 2 hojas y 3 filas, escrito y vuelto a
      leer. (RF-30, RF-46, RF-47)
      Hecho cuando: los tres comandos en verde y la verificación confirma pie en las 2 hojas, `creator` =
      «Kontrola · Grupo HS», 3 filas al releer y ninguna celda con «Kontrola».
- [x] T4. Llamar `marcarLibro` en los 7 Excel que se descargan (almacén, plan semanal, planificación,
      presupuestos, reportes, requisición de OCC, Excel del Asistente) quitando sus `creator` propios; añadir a
      la verificación el conteo «cada `new ExcelJS.Workbook()` de descarga va con `marcarLibro`». (RF-29, RF-30,
      RF-33, RF-37)
      Hecho cuando: los tres comandos en verde y `grep -rn "libro.creator" src` sale vacío.
- [x] T5. PDF y Word del Asistente: autor `AUTOR` y pie `PIE` en cada página (pdf-lib; `core.xml` y
      `footer1.xml` en el Word). (RF-30, RF-48)
      Hecho cuando: los tres comandos en verde y un PDF y un Word generados por un guion temporal muestran el
      pie en cada página y «Kontrola · Grupo HS» en Propiedades (el guion se borra al terminar).
- [x] T6. Páginas para imprimir: título «Asistente · Kontrola» y pie en `asistente/imprimir.ts`; pie en la
      página de `reportes/exportar.ts`; pie en `laboratorio/pantalla-informe.tsx` (al fondo de la hoja y fijo
      en cada página al imprimir), conservando el logo de GeoLab. (RF-28, RF-29, RF-32, RF-33, RF-48)
      Hecho cuando: los tres comandos en verde y la vista previa de impresión del informe de granulometría de
      un ensayo de prueba muestra el logo de GeoLab y «Generado con Kontrola · Grupo HS» en cada página, sin
      tapar la última línea.

### Panel: marca del grupo

- [x] T7. Tokens nuevos en el tema (`TextoPanel.logotipo`, `TextoPanel.logotipoGrande`, tamaños de logo de
      card y de menú) y el componente `LogotipoGrupo` con variantes `barra` y `tarjeta`. (RF-39, RNF)
      Hecho cuando: los tres comandos en verde y el componente no escribe ningún color, tamaño ni fuente a mano.
- [x] T8. Barra superior y tarjeta de acceso usan `LogotipoGrupo`; sale el logo de OCC de las dos. (RF-1–RF-9)
      Hecho cuando: los tres comandos en verde y en el navegador el ingreso muestra «Grupo HS», «KONTROLA» y
      «Gestión de obras y empresas», y la barra «Grupo HS · KONTROLA» a 1366 px y solo «Grupo HS» a 390 px.
- [x] T9. Ícono de la pestaña: `IconoDeLaPestana` en `src/app/panel/_layout.tsx`, fuera de `MarcoSesion`, con
      la K amarilla sobre grafito en SVG en línea. (RF-14)
      Hecho cuando: los tres comandos en verde, `npx expo export --platform web` sin errores (y `dist` borrado)
      y en una ventana privada la pestaña del ingreso muestra la K.

### Panel: logos de las empresas

- [x] T10. `src/features/empresas/logos.ts` (`logoDeEmpresa`) y `marca-de-empresa.tsx` (`MarcaDeEmpresa` con
      tamaños `card`, `menu`, `menuPlegado`: imagen contenida, logotipo de texto o ícono de Proyectos).
      (RF-16, RF-17, RF-18, RF-19, RF-27, RNF)
      Hecho cuando: los tres comandos en verde y `logoDeEmpresa` devuelve imagen solo para OCC.
- [x] T11. Cards del inicio de Gerencia con `MarcaDeEmpresa` encima del nombre. (RF-15–RF-20)
      Hecho cuando: los tres comandos en verde y, como Gerencia, la card de OCC muestra su logo sin deformarse,
      Elemental y GeoLab su nombre como logotipo, Proyectos el ícono, y las cuatro conservan saldo y obras.
- [x] T12. Cabecera del menú lateral: marca de la empresa (abierto y plegado), ícono y nombre de la obra en
      hasta 2 líneas, ícono y «Proyectos» en la lista de obras, «Empresas» en la portada de Gerencia.
      (RF-21–RF-26, RF-42, RF-44)
      Hecho cuando: los tres comandos en verde y en el navegador se ve cada uno de esos cinco casos, incluido
      un nombre de obra que no cabe en dos líneas terminado en «…».

### Cierre

- [x] T13. Marcar la 040, la 045 y la 047 «Modificada por la 049» y añadir a la verificación el barrido de
      cadenas: ningún archivo de `src/` fuera de la app del operador contiene «Control de Obra OCC»,
      «PreOperaOCC» ni «Grupo OCC» en una cadena. (RF-36, RF-37, RF-38, RF-41, D14)
      Hecho cuando: los tres comandos en verde, el barrido pasa y la app del operador sigue con «PreOpera OCC».
- [x] T14. Validación final: recorrido RF por RF de la spec + demo manual del plan (8 pasos), en
      `validacion.md`. (Todos)
      Hecho cuando: cada RF tiene su comprobación con resultado, los tres comandos
      están en verde y la spec queda marcada como Cumplida.

### Cambio del 2026-11-18: logos, ícono de Proyectos y cards centradas

- [x] T15. Recortar los logos de Elemental y OCC a archivos nuevos (Pillow, guion en la carpeta temporal) y poner
      las tres imágenes en `logos.ts`; caja del menú a 184×56; actualizar la prueba «049/RF-16 a RF-19». (RF-16,
      RF-51, RF-52, RF-57)
      Hecho cuando: los tres comandos en verde, la medida de los recortados da menos de 5 % de blanco por lado y
      el menú de cada empresa muestra su logo en el navegador.
- [x] T16. Ícono `proyectos` en `iconos.tsx`, usado por la marca de Proyectos, el menú y «Cambiar de obra».
      (RF-19, RF-53)
      Hecho cuando: los tres comandos en verde y en el navegador el mismo ícono sale en la card de Proyectos, en
      la cabecera del menú de una obra y en «Cambiar de obra».
- [x] T17. Cards centradas: marca centrada en una franja del mismo alto, nombre y función centrados debajo;
      GeoLab como insignia sin agrandar. (RF-52, RF-54, RF-55, RF-56, RF-20)
      Hecho cuando: los tres comandos en verde y en el navegador, a 1366 px y en un recuadro de 390 px, las cuatro
      cards tienen la marca centrada y los nombres a la misma altura, con su saldo y sus obras.
- [x] T18. Revalidación del cambio: filas de RF-16 a RF-19 y de RF-51 a RF-57 en `validacion.md`, y la spec de
      vuelta a Cumplida. (RF-16 a RF-19, RF-51 a RF-57)
      Hecho cuando: cada RF del cambio tiene su comprobación con resultado y los tres comandos en verde.

## Notas de ejecución

- Tras tocar pantallas o rutas `+api.ts`, Diego reinicia su servidor (puerto 8081) con `npm run web -- --clear`;
  no se enciende otro.
- Las revisiones en navegador van con una sola pestaña, para no saturar el servidor de desarrollo.
- T4: el «Hecho cuando» pedía que `grep -rn "libro.creator" src` saliera vacío; queda una sola
  coincidencia, la de `marca-de-archivos.ts`, que es la que pone el autor por todos. La verificación lo
  comprueba así: ningún archivo salvo ese asigna `.creator`, y los 7 Excel que se escriben llaman `marcarLibro`.
- T5: la comprobación quedó fija en la verificación (autor del PDF y del Word, pie contado página por página
  en el PDF, pie de página referenciado por la sección en el Word) en vez de un guion temporal. El guion de
  muestra se usó solo para dejarle a Diego un PDF y un Word de prueba, y se borró. El pie del PDF también lo
  llevan los informes de cumplimiento de la planificación (spec 043), que usan el mismo armador.
- T6: revisado en el navegador de Diego (extensión de Chrome, servidor 8081) con el informe del ensayo
  aprobado 01a0d8d7…: logo de GeoLab arriba, «Generado con Kontrola · Grupo HS» centrado bajo las firmas, hoja
  de 926 px contra 980 px útiles de una carta (una sola página). No se abrió el diálogo de impresión, porque
  bloquea el navegador; el pie de los reportes y del Asistente va en el margen de `@page` (Chrome y Edge), y
  Firefox lo deja solo al final en pantalla.
- T7: el plan decía «Grupo HS en el amarillo de acento sobre el grafito». La paleta (spec 022, RF-20) dice
  que el amarillo va siempre de fondo, con grafito encima, nunca como letra. Se resolvió dentro de esa regla:
  «Grupo» en la letra de la superficie y «HS» en una pastilla amarilla con letra grafito, igual en la barra y
  en la tarjeta. La K del ícono de la pestaña (D6) sigue siendo amarilla sobre grafito: es decisión de Diego
  y es un ícono, no texto del panel. Tokens nuevos: `TextoPanel.logotipo` (22), `TextoPanel.logotipoGrande`
  (40) y `CajaDeLogo` (card 160×64, menú 184×48, plegado 40×40) en `medidas.ts`.
- T8: revisado en el navegador de Diego. Barra a 1366: «Grupo [HS] │ KONTROLA». A 390 (en un recuadro de 390
  dentro de la página, porque la ventana maximizada no se dejó achicar): ☰, «Grupo [HS]» y los botones solo con
  ícono. La tarjeta se vio por «Cambiar contraseña» (la misma `TarjetaDeAcceso` del ingreso), sin cerrar la
  sesión de Diego: «Grupo [HS]», «KONTROLA» y «Gestión de obras y empresas». El ingreso en sí se ve en la demo
  de la T14, en una ventana privada.
- Para la T14 (RF-13): al cambiar la contraseña **por gusto** (botón de la barra) la pestaña conserva el título
  de la pantalla de la que se venía; «Cambiar contraseña · Kontrola» solo sale cuando el cambio es obligatorio.
  Era así antes de la 049; decidir en la validación si RF-13 lo cubre o si se precisa.
- T9: la extensión de Claude en Chrome pone su propio ícono (una flecha naranja) en las pestañas que controla,
  encima del de la página: ahí la K no se ve nunca. Se revisó el dibujo con la misma función a 128, 32 y 16 px,
  y Diego confirmó la K en una pestaña suya (18-nov). La exportación web pasó.
- T10: `MarcaDeEmpresa` sin logo y con el menú plegado muestra la inicial de la empresa en un cuadro (la «E» de
  Elemental, la «G» de Geolab): en 40×40 no cabe el nombre. El nombre completo va en la etiqueta accesible.
- T11: en la card de una empresa sin logo (Elemental, Geolab) el nombre como logotipo **reemplaza** al nombre
  normal: repetirlo diría lo mismo dos veces. Ese logotipo ocupa todo el ancho de la card (en 160 px se cortaba
  «Elemental Ingeniería y …»). OCC y Proyectos llevan marca y nombre. Revisado en el navegador de Diego.
- T12: la decisión de la cabecera quedó en una regla pura, `cabeceraDelMenu` (`shared/rules/empresas.ts`), con
  sus casos en la verificación. Revisado en el navegador de Diego: OCC abierto (logo) y plegado (logo pequeño),
  Elemental abierto (nombre como logotipo) y plegado («E»), lista de obras (ícono y «PROYECTOS»), obra (ícono y
  nombre debajo) y un nombre largo puesto a mano solo en la página (dos líneas y «…»). El menú quedó abierto,
  como Diego lo tenía. El logo de OCC se ve pequeño en el menú porque el PNG trae mucho aire alrededor; se
  arregla con un recorte del archivo cuando llegue el logo definitivo.
- T13: el barrido no encontró nada que cambiar en el código: lo quitaron las tareas anteriores. Distingue
  mayúsculas a propósito: «preoperaocc» (nombre de la base del celular y claves del navegador) es el
  identificador interno, fuera de alcance, y «el grupo de OCC» en la ventana de vehículos es el grupo de WhatsApp
  de la empresa (RF-38). La 040, la 045 y la 047 llevan «Modificada por la spec 049» en su estado.
- T14: RF-13 no se cumplía en el cambio de contraseña por gusto; se corrigió en `marco-sesion.tsx` y se
  comprobó en el navegador. `validacion.md`: 50/50 RF, con cuatro observaciones.
- T15: recortes con Pillow (guion `recortar-logos.py` en la carpeta temporal; Pillow está instalado para el
  usuario, así que se corre sin `-I`, sobre archivos del propio proyecto). Elemental 2304×896 → 1200×424 (43 KB),
  márgenes 1,0/2,8/0,9/2,8 %; OCC 2048×1184 → 1200×675 (223 KB), 1,0/1,8/1,0/1,8 %. En el navegador, los tres logos
  salen en el menú. El JPG de Elemental se ve como un rectángulo blanco sobre el crema del menú: va en la T17.
- T16: el dibujo `proyectos` es una grúa torre (mástil, pluma, tirante y cable) sobre un edificio a medio
  levantar con dos ventanas. Revisado en el navegador: card de Proyectos, cabecera del menú de PRUEBA-043 y
  «Cambiar de obra». El dibujo `obras` (el casco) se queda para lo que ya lo usaba.
- T17: el catálogo de logos guarda el tamaño de cada archivo (`ancho`, `alto`): en el navegador la imagen no
  siempre lo informa, y sin él no se puede garantizar que GeoLab no se agrande. El logo se multiplica con el fondo
  (`mixBlendMode: 'multiply'`) para que el blanco del JPG de Elemental no se vea; en el menú eso solo funcionó al
  darle a la envoltura del logo el fondo del menú (`Panel.fondo`), porque una capa transparente de arriba aislaba la
  mezcla. Revisado en el navegador: cuatro cards centradas a 1366 y apiladas a 390, nombres a la misma altura,
  GeoLab como insignia nítida y Elemental sin rectángulo blanco en el menú.
