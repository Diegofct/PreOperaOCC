# Spec 049 — Marca Kontrola y logos de las empresas

> Estado: **Cumplida** el 2026-11-18 (`validacion.md`, 56/56 RF vigentes; RF-18 retirado) · Cambio del 2026-11-18 (logos de Elemental y GeoLab, ícono de Proyectos y cards centradas: RF-51 a RF-57, D15–D18) revalidado el mismo día · Aprobada por Diego el 2026-11-18, con la clarificación del mismo día (D11–D14) · Fecha: 2026-11-18 · Primera de la tanda de UI/UX (049 marca, 050 responsive e intuitiva, 051 documentos en carpetas) · **Modifica la 040, la 045 y la 047** (archivos generados) · **Modificada por la spec 050** (2026-11-18): la portada de cada empresa y obra pasa a ser el Asistente y se retira el Resumen del día (RF-43 ajustado en la T5) — ver `specs/050-interfaz-ordenada-y-responsive/spec.md`

## Contexto y objetivo

El sistema nació como el control de la maquinaria de OCC y se sigue presentando así: «Control de Obra OCC»,
con el logo de OCC en la barra y en el ingreso, y el Asistente dice ser «del grupo de OCC». Hoy cubre a todo
el grupo —Elemental, OCC, GeoLab y las obras—, y el dueño de todo eso es el **Grupo HS**. El sistema pasa a
llamarse **Kontrola**, del Grupo HS, para que nadie de Elemental o de GeoLab sienta que trabaja dentro de una
herramienta de OCC. Además, cada empresa se reconoce por su logo: en las cards con que Gerencia escoge la
empresa y en el menú de quien está dentro de ella. El Grupo HS todavía no tiene logo, y Elemental tampoco; el
de GeoLab que existe es demasiado pequeño. Mientras lleguen, su lugar lo ocupa el nombre escrito como
logotipo de texto.

## Usuarios / actores

- **Gerencia** (panel web, rol `admin`): ve la marca nueva en la barra y en el ingreso, y las cards de las
  empresas con su logo.
- **Toda persona con cuenta en el panel** (residente, director de obra, director de proyectos, almacenista,
  encargado de planta, auxiliar y administradora de Elemental, laboratorista…): ve la marca nueva y, en el
  menú, el logo de la empresa o el ícono de la obra donde está.
- **Terceros que reciben documentos** (interventoría, clientes, proveedores): reciben los archivos
  generados con el logo de su empresa de siempre y una línea de Kontrola al pie.
- **Operador** (móvil): no interviene. La app del celular no cambia.

## Historias de usuario

- H1: Como persona del Grupo HS quiero que el sistema se llame Kontrola y muestre «Grupo HS», para que se
  reconozca como la herramienta de todo el grupo y no solo de OCC.
- H2: Como Gerencia quiero ver el logo de cada empresa en su card, para reconocerla de un vistazo.
- H3: Como persona dentro de una empresa o de una obra quiero ver en el menú dónde estoy, con el logo de la
  empresa o el nombre de la obra.
- H4: Como Gerencia quiero que los documentos que salen del sistema conserven la marca de la empresa que los
  emite y digan que se generaron con Kontrola.
- H5: Como persona que pregunta al Asistente quiero que se presente como el asistente de Kontrola del Grupo
  HS, para que hable del grupo completo.

## Requisitos funcionales (criterios de aceptación en EARS)

### Barra superior (H1)

- RF-1: EL SISTEMA muestra en la barra superior del panel el logotipo de texto «Grupo HS».
- RF-2: EL SISTEMA muestra en la barra superior el nombre «KONTROLA» a la derecha del logotipo del grupo.
- RF-3: MIENTRAS la ventana mide menos de 768 px de ancho, EL SISTEMA muestra en la barra superior solo el
  logotipo «Grupo HS».
- RF-4: EL SISTEMA no muestra el logo de OCC en la barra superior.

### Ingreso y cambio de contraseña (H1)

- RF-5: CUANDO alguien abre la pantalla de ingreso, EL SISTEMA muestra «Grupo HS» como logotipo principal.
- RF-6: CUANDO alguien abre la pantalla de ingreso, EL SISTEMA muestra «KONTROLA» debajo del logotipo del
  grupo.
- RF-7: CUANDO alguien abre la pantalla de ingreso, EL SISTEMA muestra la frase «Gestión de obras y
  empresas» debajo de «KONTROLA».
- RF-8: CUANDO alguien abre la pantalla de cambio de contraseña, EL SISTEMA muestra la misma cabecera de
  RF-5 a RF-7.
- RF-9: EL SISTEMA no muestra el logo de OCC en el ingreso ni en el cambio de contraseña.

### Pestaña del navegador (H1)

- RF-10: MIENTRAS la persona está fuera de Elemental, OCC, GeoLab y Proyectos, EL SISTEMA titula la pestaña
  «<página> · Kontrola».
- RF-11: MIENTRAS la persona está dentro de Elemental, OCC o GeoLab, EL SISTEMA titula la pestaña «<página> ·
  <nombre de la empresa>».
- RF-43: MIENTRAS la persona está dentro de una obra, EL SISTEMA titula la pestaña «<página> · Proyectos»
  (D11).
- RF-50: MIENTRAS la persona está en la lista de obras de Proyectos, EL SISTEMA titula la pestaña «Proyectos»
  (D11).
- RF-12: MIENTRAS no hay sesión iniciada, EL SISTEMA titula la pestaña «Ingresar · Kontrola».
- RF-13: MIENTRAS la persona cambia su contraseña, EL SISTEMA titula la pestaña «Cambiar contraseña ·
  Kontrola».
- RF-14: EL SISTEMA muestra como ícono de la pestaña una «K» amarilla sobre fondo grafito.

### Cards de las empresas (H2)

- RF-15: CUANDO Gerencia abre el inicio, EL SISTEMA muestra en cada card de empresa el logo de esa empresa
  encima de su nombre.
- RF-16: EL SISTEMA muestra en la card de OCC el logo de OCC que ya existe.
- RF-17: SI una empresa no tiene archivo de logo, ENTONCES EL SISTEMA muestra en su card el nombre de la
  empresa como logotipo de texto.
- ~~RF-18~~: *Retirado por el cambio del 2026-11-18 (D15): GeoLab ya tiene logo (RF-52).* Decía: MIENTRAS
  Diego no entregue un archivo nuevo de logo de GeoLab, EL SISTEMA muestra GeoLab con su logotipo de texto.
- RF-19: EL SISTEMA muestra en la card de Proyectos el ícono de Proyectos (desde el cambio del 2026-11-18, el
  de RF-53).
- RF-51: EL SISTEMA muestra en la card y en el menú de Elemental el logo de Elemental que entregó Diego (D15).
- RF-52: EL SISTEMA muestra en la card y en el menú de GeoLab el logo de GeoLab que entregó Diego, con su fondo
  oscuro y las esquinas redondeadas (D15, D17).
- RF-53: EL SISTEMA representa a Proyectos con un ícono propio de obra en construcción, el mismo en la card, en
  la cabecera del menú y en el enlace «Cambiar de obra» (D16).
- RF-54: CUANDO Gerencia abre el inicio, EL SISTEMA muestra la marca de cada empresa centrada a lo ancho de su
  card (D16).
- RF-55: EL SISTEMA reserva para la marca de las cuatro cards una franja del mismo alto, de modo que los nombres
  de las cuatro empiecen a la misma altura.
- RF-56: EL SISTEMA muestra centrados bajo la marca el nombre y la función de cada card.
- RF-57: EL SISTEMA muestra cada logo sin franjas en blanco alrededor del dibujo de más del 5 % de su ancho o
  de su alto (D18).
- RF-20: EL SISTEMA conserva en cada card la información que muestra hoy (función, saldo del último corte,
  obras activas).

### Menú lateral (H3)

- RF-21: MIENTRAS la persona está dentro de Elemental, OCC o GeoLab, EL SISTEMA muestra el logo de esa
  empresa en la cabecera del menú lateral.
- RF-22: SI la empresa donde está la persona no tiene archivo de logo, ENTONCES EL SISTEMA muestra en la
  cabecera del menú el nombre de la empresa como logotipo de texto.
- RF-23: MIENTRAS la persona está dentro de una obra, EL SISTEMA muestra el ícono de Proyectos en la cabecera
  del menú lateral.
- RF-24: MIENTRAS la persona está dentro de una obra, EL SISTEMA muestra el nombre de la obra debajo del
  ícono de Proyectos.
- RF-25: MIENTRAS el menú lateral está plegado, EL SISTEMA muestra en su cabecera el logo de la empresa, o el
  ícono de Proyectos, en tamaño reducido.
- RF-26: MIENTRAS Gerencia está en el inicio de las empresas, EL SISTEMA muestra en la cabecera del menú el
  título «Empresas», sin logo de empresa.
- RF-44: MIENTRAS la persona está en la lista de obras de Proyectos, sin obra escogida, EL SISTEMA muestra en la
  cabecera del menú el ícono de Proyectos con el título «Proyectos» (D11).
- RF-27: EL SISTEMA muestra para cada empresa el mismo logo en su card y en el menú lateral.
- RF-42: SI el nombre de la obra no cabe en dos líneas de la cabecera del menú, ENTONCES EL SISTEMA lo corta
  al final de la segunda línea con «…».

### Documentos generados (H4)

- RF-28: CUANDO el sistema genera un documento que lleva el logo o el nombre de una empresa del grupo, EL
  SISTEMA conserva ese logo o ese nombre.
- RF-29: CUANDO el sistema genera un documento que lleva el logo o el nombre de una empresa del grupo, EL
  SISTEMA añade al pie la línea «Generado con Kontrola · Grupo HS».
- RF-30: CUANDO el sistema genera un archivo Excel, PDF o Word, EL SISTEMA registra «Kontrola · Grupo HS» como
  su autor.
- RF-31: CUANDO el Asistente genera un archivo, EL SISTEMA pone en su encabezado «Grupo HS · Kontrola» (el
  orden es a propósito: en un encabezado va primero el grupo, como iba antes «Grupo OCC»).
- RF-32: CUANDO alguien imprime una conversación del Asistente, EL SISTEMA la titula «Asistente · Kontrola».
- RF-33: SI el documento generado no lleva el logo ni el nombre de una empresa del grupo, ENTONCES EL SISTEMA
  añade igualmente al pie la línea «Generado con Kontrola · Grupo HS» (D9).
- RF-45: EL SISTEMA entiende por «documento generado» todo archivo Excel, PDF o Word que el panel o el
  Asistente producen para descargar, y toda página del panel preparada para imprimir (informe de
  granulometría, ensayo, reportes, conversación del Asistente) (D13).
- RF-46: EL SISTEMA pone la línea de RF-29 y RF-33 de un archivo Excel en el pie de página de impresión de cada
  hoja, nunca como una fila o celda de datos (D13).
- RF-47: CUANDO alguien vuelve a subir al sistema un Excel que el sistema generó, EL SISTEMA lo lee igual que
  antes de esta spec, sin tomar la línea de Kontrola como dato (D13).
- RF-48: EL SISTEMA pone la línea de RF-29 y RF-33 de un PDF, de un Word y de una página para imprimir al pie
  de cada página (D13).

### Asistente (H5)

- RF-34: EL SISTEMA presenta al Asistente como el asistente de Kontrola, del Grupo HS.
- RF-35: EL SISTEMA describe al Grupo HS ante el Asistente como el dueño de Elemental, OCC, GeoLab y las
  obras.
- RF-49: CUANDO alguien pregunta al Asistente quién es, EL SISTEMA responde con un texto que nombra a Kontrola
  y al Grupo HS (comprobación de RF-34 y RF-35).

### Reglas transversales

- RF-36: EL SISTEMA no muestra «Control de Obra OCC», «PreOperaOCC» ni «Grupo OCC» como nombre del sistema en
  ninguna pantalla del panel.
- RF-37: EL SISTEMA no escribe «Control de Obra OCC», «PreOperaOCC» ni «Grupo OCC» como nombre del sistema en
  ningún archivo generado desde el panel.
- RF-38: EL SISTEMA sigue llamando «OCC» a la empresa OCC en todas las pantallas y documentos donde se habla
  de ella.
- RF-39: EL SISTEMA escribe el nombre como «KONTROLA» en los logotipos y como «Kontrola» dentro de un texto.
- RF-40: EL SISTEMA no modifica el contenido de ningún registro (preoperacional, parte, requisición,
  documento subido) por el cambio de marca.
- RF-41: EL SISTEMA no cambia el nombre ni el ícono de la app del celular.

## Superficies afectadas

- [ ] **Móvil** — sin cambios (RF-41). La app del celular sigue como «PreOpera OCC».
- [x] **Panel web** — barra superior, ingreso, cambio de contraseña, título e ícono de la pestaña, inicio de
  Gerencia (cards de empresas, centradas desde el cambio del 2026-11-18), cabecera del menú lateral (con los
  logos de las tres empresas y el ícono nuevo de Proyectos), impresión del Asistente.
- [x] **Archivos de logo** — `assets/` (cambio del 2026-11-18): los logos de Elemental y de OCC se recortan
  para quitarles el blanco de alrededor (RF-57); el dibujo no se toca.
- [x] **API** — los documentos que genera el servidor (Excel, PDF, archivos del Asistente) y la presentación
  del Asistente.
- [ ] **Sincronización** — sin cambios.
- [ ] **Datos** — sin cambios de esquema; la marca es presentación.
- [x] **Reglas** — los títulos de pestaña y el encabezado de los archivos del Asistente; si cambian, llevan
  su caso en la verificación.
- [x] **Specs anteriores** — la 049 modifica comportamientos fijados por la 040 (archivos del Asistente), la
  045 (descargas de la planificación) y la 047 (Excel de la requisición de OCC); cada una lleva en su
  encabezado «Modificada por la 049» (D14).

## Requisitos no funcionales

- Cuando llegue el logo del Grupo HS, o el de una empresa, aparece en todos los lugares donde va (barra,
  ingreso, card, menú) con una sola entrega del archivo, sin rehacer pantallas.
- Un logo de empresa de hasta 2048 px se muestra sin deformarse: conserva su proporción dentro del espacio
  de la card y del menú.
- La marca nueva se lee completa a 390 px de ancho (celular), sin cortarse ni salirse de la barra.

## Casos límite

- **Sin señal**: no aplica. El panel web necesita red como siempre y la app del celular no cambia.
- **Evidencia firmada**: un preoperacional firmado, un parte cerrado o una requisición aprobada no cambian de
  contenido (RF-40). Lo que cambia es la marca de los documentos que se generen **desde ahora**; los archivos
  ya descargados quedan como estaban.
- **Primer arranque / equipo recién activado**: no aplica al móvil. En el panel, la primera visita ya muestra
  la marca nueva.

Y los del caso concreto:

- **Empresa sin logo**: su nombre como logotipo de texto, en la card y en el menú (RF-17, RF-22). Desde el cambio
  del 2026-11-18 ninguna de las tres está en ese caso; la regla queda para una empresa nueva.
- **Logo con fondo propio** (GeoLab, fondo negro): se muestra como una insignia con las esquinas redondeadas,
  sin cambiarle el fondo (RF-52, D17).
- **Logo pequeño** (GeoLab, 85×84 px): en la card y en el menú se muestra igual o más pequeño que su tamaño
  original, nunca agrandado, para que no se vea borroso (D17).
- **Llega el logo después**: aparece en la card y en el menú a la vez, sin tocar pantallas (RF-27 y RNF).
- **Nombre de obra muy largo** en la cabecera del menú: ocupa hasta dos líneas y lo que no cabe se corta con
  «…» (RF-42, D10).
- **Persona sin empresa ni obra** (Gerencia en el inicio): cabecera del menú con «Empresas» (RF-26).
- **Lista de obras sin obra escogida**: ícono de Proyectos y «Proyectos» (RF-44).
- **Excel generado que se vuelve a subir** (planificación, plan semanal, planillas): la línea de Kontrola va
  en el pie de página de impresión y no altera la lectura (RF-46, RF-47).
- **Informe que se vuelve a imprimir** (por ejemplo, una granulometría ya entregada): sale con el pie nuevo;
  su contenido es el mismo, porque el registro no cambia (RF-40).
- **Ícono de la pestaña en caché**: el navegador puede mostrar la flecha vieja un tiempo; RF-14 se comprueba
  en una ventana privada.
- **Mensajes de WhatsApp**: hoy no nombran el sistema; si alguno lo hiciera, aplica RF-36.
- **Pestaña de un navegador que ya estaba abierta**: toma el título nuevo al navegar o recargar.

## Fuera de alcance

- La app del celular: nombre, ícono, pantalla de arranque y textos (siguen como «PreOpera OCC»).
- El identificador interno del proyecto, el dominio del VPS y el nombre de la cuenta de EAS.
- Diseñar el logo del Grupo HS: esta spec deja el lugar listo y usa texto mientras llegue.
- Rediseñar, recolorear o cambiarle el fondo a los logos de Elemental, OCC o GeoLab: solo se recorta el blanco
  de alrededor (RF-57).
- Volver a generar o marcar documentos ya descargados.
- Cambiar los colores del panel o crear una paleta por empresa.
- Responsive general, formularios y documentos en carpetas: specs 050 y 051.
- El nombre del repositorio y los mensajes de los commits anteriores.

## Criterios de finalización

- Cada RF tiene cómo comprobarse: caso en `scripts/verificar-reglas.ts` (si es regla pura) o paso de demo
  manual descrito.
- `npm run verificar`, `npm run typecheck` y `npm run lint` en verde.
- Búsqueda en el código de «Control de Obra OCC», «PreOperaOCC» y «Grupo OCC» en textos de interfaz y de
  archivos generados: solo quedan en la app del celular y en comentarios.
- Demo manual del flujo principal: abrir el ingreso (cabecera nueva, pestaña «Ingresar · Kontrola», ícono K),
  entrar como Gerencia (barra con Grupo HS y KONTROLA, cards con los logos de Elemental, OCC y GeoLab y el ícono
  nuevo de Proyectos, todo centrado y con los nombres a la misma altura), entrar a cada empresa (su logo en el
  menú, abierto y plegado), entrar a una obra como residente
  (ícono de Proyectos y nombre de la obra), descargar un Excel de requisición de OCC y abrir el informe de
  granulometría de GeoLab (conservan su marca y llevan la línea de Kontrola al pie), pedir un archivo al
  Asistente (encabezado «Grupo HS · Kontrola»), y repetir la barra y el ingreso a 390 px de ancho.

## Dudas abiertas

Ninguna. Las dos del borrador se cerraron el 2026-11-18 (D9, D10).

## Decisiones de Diego (2026-11-18)

- D1: Kontrola solo en el panel web; el celular no cambia.
- D2: Logotipo de texto «Grupo HS» grande + «KONTROLA» en la barra y el ingreso, mientras no haya logo.
- D3: El Grupo HS es el dueño de Elemental, OCC, GeoLab y las obras; en todas partes dice Grupo HS y
  Kontrola.
- D4: Los documentos con marca de empresa la conservan y llevan al pie «Generado con Kontrola · Grupo HS».
- D5: Dentro de una obra, el menú muestra el ícono de Proyectos con el nombre de la obra.
- D6: El ícono de la pestaña es una «K» amarilla sobre grafito.
- D7: La frase bajo KONTROLA es «Gestión de obras y empresas».
- D8: Logos de Elemental y de GeoLab (más grande): los entrega Diego después; mientras, texto.
- D9: La línea «Generado con Kontrola · Grupo HS» va en todos los documentos generados, tengan o no marca de
  empresa.
- D10: Un nombre de obra largo ocupa hasta dos líneas en la cabecera del menú.

Clarificación (2026-11-18, Diego aceptó las recomendaciones):

- D11: En Proyectos (lista de obras y dentro de una obra) la pestaña dice «<página> · Proyectos»; en la lista
  de obras la cabecera del menú muestra el ícono y «Proyectos».
- D12: El logo de GeoLab se usa cuando Diego entregue un archivo nuevo; la imagen de 85×84 px no se usa.
- D13: «Documento generado» = Excel, PDF o Word para descargar y páginas para imprimir. En Excel la línea va en
  el pie de página de impresión, nunca en una celda, para no estorbar al reimportar.
- D14: La 040, la 045 y la 047 quedan marcadas «Modificada por la 049».

Cambio del 2026-11-18 (Diego, tras ver la primera versión):

- D15: Se usan los logos que Diego dejó en `assets/`: el de Elemental y el de GeoLab (el de 85×84 px sí sirve
  reducido). Reemplaza a D8 y a D12; RF-18 queda retirado.
- D16: Proyectos lleva un ícono propio, más claro que el actual, y las marcas van centradas en las cards del
  inicio de Gerencia.
- D17: GeoLab se muestra con su fondo oscuro, como insignia, nunca más grande que su archivo.
- D18: Se recorta el blanco de alrededor de los logos, sin añadir dependencias (constitución, principio 8).
