# Spec 050 — Kontrola: una interfaz ordenada y para cualquier pantalla

> Estado: **Cumplida el 2026-11-18** (`validacion.md`: 90/90 RF en verde) · **Aprobada** por Diego el 2026-11-18 (D1–D4) y clarificada el mismo día (D5–D11) · Fecha: 2026-11-18 · Segunda de la tanda de UI/UX (049 marca, 050 interfaz, 051 documentos en carpetas) · **Modifica la 026** (RF-36: las listas dejan de desplazarse a lo ancho y pasan a tarjetas; las cuadrículas siguen desplazándose) · **Modifica la 033 y la 049** (la portada de cada empresa y obra pasa a ser el Asistente; el Resumen del día de la obra se retira) · **Modifica la 008, la 034, la 035 y la 046** (el cargo de un solo módulo ya no entra directo a él, sino al Asistente: D12) · **Modifica la 022** (RF-25: las tarjetas llevan sombra en lugar de borde)

## Contexto y objetivo

Kontrola creció módulo a módulo y se nota. El menú de una obra es una lista plana de dieciséis entradas sin
orden aparente. Los formularios están armados cada uno a su manera: el de la requisición de compra pone cada
etiqueta a una altura distinta y el renglón no se lee como una fila. El botón principal de cada pantalla
aparece donde cupo. En el celular las tablas obligan a desplazarse de lado para ver los botones. Y en un
monitor grande el contenido se queda en una franja angosta en medio de la pantalla. El objetivo es que
cualquier persona del grupo encuentre lo que busca sin aprender cada pantalla por separado: el mismo orden en
el menú, los mismos formularios, el botón principal siempre en el mismo sitio y una lectura cómoda desde
un celular de 360 px hasta un monitor de 1920 px. Además, que se note cuando algo se guardó. Todo eso con la
misma paleta de siempre, sin tocar datos, permisos ni la app del operador.

## Usuarios / actores

- **Toda persona con cuenta en el panel** (Gerencia, residente, director de obra, director de proyectos,
  almacenista, encargado de planta, auxiliar y administradora de Elemental, laboratorista…): usa el panel
  desde un computador o desde su celular. Ve el menú por secciones, los formularios alineados, el
  encabezado nuevo, las tablas como tarjetas en el celular y los avisos al guardar.
- **Operador** (móvil): no interviene. La app del celular no cambia.

## Historias de usuario

- H1: Como persona del panel quiero el menú ordenado en secciones con título, para encontrar un módulo sin
  leer la lista entera.
- H2: Como persona del panel quiero que todos los formularios se vean y se llenen igual, con los campos de
  un renglón alineados, para no tener que entender cada uno.
- H3: Como persona del panel quiero saber en qué pantalla estoy y tener el botón principal siempre en el
  mismo sitio, para no buscarlo.
- H4: Como persona que entra desde el celular quiero ver cada fila de una tabla como una tarjeta completa,
  para no desplazarme de lado.
- H5: Como persona con un monitor grande quiero que el panel use el espacio, para ver más filas y columnas
  sin franjas vacías a los lados.
- H6: Como persona del panel quiero que los listados me resuman y me dejen filtrar de un toque, que las
  listas vacías me digan qué hacer y que el sistema me confirme lo que guardé, para trabajar con
  confianza.
- H7: Como persona que cancela el cambio de contraseña quiero volver a donde estaba.
- H8: Como persona del panel quiero que al entrar a una empresa o a una obra se abra el Asistente, para
  empezar preguntando lo que necesito.

## Requisitos funcionales (criterios de aceptación en EARS)

### Menú por secciones (H1)

- RF-1: EL SISTEMA agrupa las entradas del menú lateral en secciones con título.
- RF-2: EL SISTEMA muestra las secciones siempre abiertas, sin que haya que desplegarlas.
- RF-3: EL SISTEMA asigna cada entrada del menú, salvo el Asistente, a una sola sección.
- RF-4: DONDE el lugar es una obra, EL SISTEMA ordena el menú en las secciones «Día a día» (Bitácoras,
  Preoperacionales, Asignaciones, Reportes de WhatsApp), «Planeación y contrato» (Contrato y Presupuesto,
  Planificación, Plan semanal, Cumplimiento), «Materiales y calidad» (Requisiciones, Almacén, Control
  Cantera, Calidad) y «Personal y archivo» (Recursos Humanos, Documentos, Reportes e informes), en ese
  orden.
- RF-5: DONDE el lugar es OCC, EL SISTEMA ordena el menú en las secciones «Día a día» (Bitácora,
  Preoperacionales, Asignaciones, Reportes de WhatsApp), «Flota» (Vehículos, Reportes de vehículos y
  maquinaria) y «Administración» (Requisiciones, Recursos Humanos, Documentos), en ese orden.
- RF-6: DONDE el lugar es GeoLab, EL SISTEMA ordena el menú en las secciones «Laboratorio» (Laboratorio,
  Reportes de laboratorio, Bitácora, Reportes de WhatsApp) y «Administración» (Requisiciones, Recursos
  Humanos, Documentos), en ese orden.
- RF-7: DONDE el lugar es Elemental, EL SISTEMA ordena el menú en las secciones «Gestión» (Requisiciones,
  Tesorería, Licitaciones) y «Personal y archivo» (Recursos Humanos, Documentos), en ese orden.
- RF-8: EL SISTEMA muestra el Asistente como la primera entrada del menú, antes de las secciones y sin
  título de sección (D9; reemplaza lo que decía el borrador: «al final»).
- RF-9: SI el cargo de la persona no puede ver ninguna entrada de una sección, ENTONCES EL SISTEMA no
  muestra esa sección ni su título.
- RF-10: SI un módulo está apagado en la obra, ENTONCES EL SISTEMA lo oculta del menú como hoy, y la
  sección que queda vacía no aparece (RF-9).
- RF-11: MIENTRAS el menú está plegado, EL SISTEMA separa las secciones con una raya en lugar del título.
- RF-12: MIENTRAS el menú está plegado, EL SISTEMA muestra «Sección · Entrada» al pasar el puntero sobre
  una entrada, o al mantenerla pulsada en una pantalla táctil.
- RF-67: EL SISTEMA muestra arriba del menú, antes del Asistente, la marca de la empresa o el nombre de la
  obra de la spec 049.
- RF-68: DONDE el lugar es una obra, EL SISTEMA muestra el enlace «Cambiar de obra» debajo del nombre de
  la obra, antes del Asistente.

### Formularios alineados (H2)

- RF-13: EL SISTEMA muestra la etiqueta de cada campo encima del campo.
- RF-14: EL SISTEMA muestra la ayuda de un campo debajo del campo, nunca entre la etiqueta y el campo.
- RF-15: MIENTRAS varios campos comparten un renglón, EL SISTEMA alinea sus etiquetas a una misma altura.
- RF-16: MIENTRAS varios campos comparten un renglón, EL SISTEMA alinea los recuadros de los campos a una
  misma altura, aunque solo uno de ellos tenga ayuda o mensaje de error.
- RF-17: EL SISTEMA da a los campos de todos los formularios del panel un ancho tomado de una misma escala
  de tres medidas (corto, mediano y a lo ancho).
- RF-18: EL SISTEMA marca los campos obligatorios de la misma forma en todos los formularios del panel.
- RF-19: SI al guardar falta o está mal un campo, ENTONCES EL SISTEMA muestra el mensaje debajo de ese
  campo.
- RF-20: SI al guardar falta o está mal un campo que no está a la vista, ENTONCES EL SISTEMA lleva la
  vista hasta el primer campo con error.
- RF-21: MIENTRAS una ventana con formulario es más alta que la pantalla, EL SISTEMA mantiene sus botones
  (Guardar, Cancelar) fijos al pie de la ventana.
- RF-22: EL SISTEMA muestra cada renglón del formulario de requisición como una tarjeta con la cabecera
  «Renglón N» y el botón Quitar.
- RF-23: EL SISTEMA muestra dentro de cada renglón de la requisición los campos alineados en filas: qué,
  cantidad y unidad en la primera; para cuándo, para qué y valor en la segunda; y «Va a» a lo ancho.
- RF-24: MIENTRAS el ancho es menor de 768 px, EL SISTEMA muestra los campos de todo formulario uno debajo
  de otro, a lo ancho (como 026/RF-35).
- RF-25: EL SISTEMA aplica RF-13 a RF-21 a todos los formularios del panel, sin excepción.

### Encabezado de pantalla (H3)

- RF-26: EL SISTEMA muestra en cada pantalla del panel un encabezado con su título.
- RF-27: EL SISTEMA muestra encima del título la ruta de la pantalla, con un paso por nivel (empresa u
  obra › módulo › registro) y «›» entre cada paso.
- RF-28: CUANDO alguien pulsa un paso anterior de la ruta, EL SISTEMA lo lleva a esa pantalla, sea cual sea el paso (D4).
- RF-29: SI el nombre de la obra en la ruta no cabe, ENTONCES EL SISTEMA lo recorta con «…».
- RF-69: MIENTRAS un nombre de la ruta está recortado, EL SISTEMA lo muestra completo al pasar el puntero o
  al mantenerlo pulsado.
- RF-30: DONDE la pantalla tiene una acción principal (Nueva requisición, Subir documento, Registrar…), EL
  SISTEMA la muestra a la derecha del título.
- RF-31: MIENTRAS el ancho es menor de 768 px, EL SISTEMA muestra la acción principal debajo del título, a
  lo ancho.
- RF-32: SI el cargo de la persona no puede hacer la acción principal, ENTONCES EL SISTEMA no la muestra.

### Tablas como tarjetas en el celular (H4)

- RF-33: MIENTRAS el ancho es menor de 768 px, EL SISTEMA muestra cada fila de una lista del panel como
  una tarjeta, en lugar de la tabla con desplazamiento horizontal de 026/RF-36.
- RF-70: MIENTRAS el ancho es de 768 px o más y una lista no cabe entera con todas sus columnas y sus
  botones, EL SISTEMA muestra sus filas como tarjetas (D6).
- RF-71: EL SISTEMA muestra como cuadrícula, en cualquier ancho, las tablas que se llenan celda por celda o
  que son matrices: la granulometría, los renglones del almacén, el presupuesto del contrato, el cronograma
  de la planificación y la maquinaria del parte (D5).
- RF-72: MIENTRAS una cuadrícula no cabe en el ancho, EL SISTEMA la desplaza a lo ancho dentro de su marco,
  sin que la página se desplace (como 026/RF-36).
- RF-34: EL SISTEMA muestra en la parte de arriba de la tarjeta el dato principal de la fila, en letra más
  grande que la del resto de la tarjeta.
- RF-35: EL SISTEMA muestra en la tarjeta todos los demás datos de la fila, cada uno con el nombre de su
  columna.
- RF-36: EL SISTEMA muestra los botones de la fila al pie de la tarjeta.
- RF-37: SI una fila no tiene botones, ENTONCES EL SISTEMA muestra la tarjeta sin pie.
- RF-38: MIENTRAS las filas se muestran como tarjetas, EL SISTEMA conserva el orden, la búsqueda y los
  filtros que tiene la tabla.
- RF-39: MIENTRAS las filas se muestran como tarjetas, EL SISTEMA ofrece escoger la columna por la que se
  ordena.
- RF-40: CUANDO cambia el ancho de la ventana (al girar el celular o al cambiar su tamaño), EL SISTEMA
  pasa cada lista a tabla o a tarjetas según RF-33, RF-41 y RF-70.
- RF-73: CUANDO una lista pasa de tabla a tarjetas, o al revés, EL SISTEMA conserva la búsqueda, los
  filtros y el orden.
- RF-41: MIENTRAS el ancho es de 768 px o más y una lista cabe entera con sus columnas y sus botones, EL
  SISTEMA la muestra como tabla.

### Pantallas grandes (H5)

- RF-42: MIENTRAS el ancho es mayor que el de un portátil de 1366 px, EL SISTEMA amplía los listados y los
  tableros hasta un ancho máximo de 1600 px (D1).
- RF-43: MIENTRAS el ancho es mayor que el de un portátil de 1366 px, EL SISTEMA limita los formularios y
  las fichas de lectura a un ancho máximo de 1100 px (D2).
- RF-44: EL SISTEMA no deja los botones de una fila de una lista fuera de la vista en ningún ancho
  (reemplaza lo que decía el borrador, que prometía «como hoy» algo que hoy no se cumple).
- RF-74: MIENTRAS el ancho es mayor de 1366 px, EL SISTEMA reparte el ancho ganado entre las columnas de la
  tabla, sin añadir columnas nuevas.

### Aspecto: tarjetas, cifras, listas vacías y avisos (H6)

- RF-45: EL SISTEMA usa solo los colores de la paleta actual del panel (crema, grafito y el amarillo de
  fondo, con los colores de estado).
- RF-46: EL SISTEMA muestra las tarjetas del panel con sombra en lugar de borde.
- RF-47: CUANDO el puntero pasa sobre una tarjeta que se puede pulsar, EL SISTEMA aumenta su sombra.
- RF-48: DONDE una lista tiene un filtro por estado, EL SISTEMA muestra encima de la lista una cifra por
  cada estado, con su ícono, su nombre y cuántos registros hay en él.
- RF-75: DONDE una lista muestra cifras de estado, EL SISTEMA no muestra el selector de estado que tenía
  (D7).
- RF-76: EL SISTEMA conserva como están las casillas de «vencidos» y de «anulados».
- RF-77: MIENTRAS la lista está cargando, EL SISTEMA no muestra ningún número en las cifras de estado.
- RF-49: CUANDO alguien pulsa una cifra de estado, EL SISTEMA filtra la lista por ese estado.
- RF-50: CUANDO alguien pulsa la cifra del estado que ya está filtrado, EL SISTEMA quita el filtro.
- RF-51: MIENTRAS una cifra de estado está filtrando, EL SISTEMA la muestra marcada con algo más que el
  color (borde, ícono o texto).
- RF-52: EL SISTEMA cuenta en las cifras de estado todos los registros de la lista que cumplen la búsqueda
  y los demás filtros activos, no solo los de la página que se ve.
- RF-53: SI una lista no tiene ningún registro, ENTONCES EL SISTEMA muestra un ícono, una frase que dice
  qué va ahí y, si el cargo puede crearlo, el botón para crear el primero.
- RF-54: SI una lista tiene registros pero la búsqueda o los filtros no dejan ver ninguno, ENTONCES EL
  SISTEMA dice que no hay resultados con esos filtros.
- RF-78: MIENTRAS RF-54 se cumple, EL SISTEMA ofrece un botón para quitar la búsqueda y los filtros.
- RF-55: CUANDO se guarda, se sube, se cierra, se envía, se asigna, se anula, se aprueba o se rechaza algo
  con éxito, EL SISTEMA muestra un aviso
  corto que dice qué pasó (por ejemplo «Requisición guardada»).
- RF-56: CUANDO pasan 4 segundos (D3) desde que apareció un aviso de éxito,
  EL SISTEMA lo quita.
- RF-57: SI una acción falla por una causa que no es de un campo (sin conexión, otra persona ya lo cambió,
  un fallo del servidor), ENTONCES EL SISTEMA muestra un aviso de error que se queda hasta que alguien lo
  cierra (D8).
- RF-79: SI una acción falla por un campo, ENTONCES EL SISTEMA muestra el error solo debajo del campo
  (RF-19), sin aviso.
- RF-80: SI una acción falla, ENTONCES EL SISTEMA deja abierta la ventana con lo que se había escrito.
- RF-81: CUANDO guardar lleva a otra pantalla, EL SISTEMA muestra el aviso en la pantalla a la que llega.
- RF-82: EL SISTEMA muestra los avisos abajo de la pantalla, sin tapar los botones fijos al pie de una
  ventana (RF-21).
- RF-58: SI aparece un aviso mientras otro está a la vista, ENTONCES EL SISTEMA muestra los dos, el más
  nuevo encima.
- RF-59: EL SISTEMA no ofrece «Deshacer» en los avisos.
- RF-60: EL SISTEMA muestra cada aviso con un ícono y un texto, además del color.

### Cambio de contraseña (H7)

- RF-61: CUANDO alguien cancela el cambio de contraseña que pidió por gusto, EL SISTEMA lo regresa a la
  pantalla donde estaba antes de abrirlo.
- RF-62: SI no hay pantalla anterior (se abrió el cambio de contraseña con un enlace directo), ENTONCES EL
  SISTEMA lo lleva al inicio.
- RF-83: MIENTRAS el cambio de contraseña es obligatorio, EL SISTEMA no ofrece «Cancelar», como hoy.

### El Asistente como portada (H8)

- RF-84: CUANDO alguien entra a una empresa o a una obra, EL SISTEMA abre el Asistente de ese lugar (D9).
- RF-85: SI el cargo de la persona no puede ver el Asistente, ENTONCES EL SISTEMA abre la primera entrada
  de su menú.
- RF-86: EL SISTEMA no muestra el Resumen del día de la obra, ni en el menú ni al entrar (D10).
- RF-87: CUANDO alguien abre una dirección guardada del Resumen del día, EL SISTEMA lo lleva al Asistente
  de esa obra.
- RF-88: CUANDO Gerencia inicia sesión, EL SISTEMA le muestra las tarjetas de las empresas, como hoy (D11).
- RF-89: CUANDO alguien que trabaja en una sola obra inicia sesión, EL SISTEMA abre el Asistente de su obra.
- RF-90: CUANDO alguien cuyo cargo tiene un módulo propio inicia sesión (almacenista, encargado de planta,
  laboratorista, encargado de OCC, Auxiliar Administrativa, Administradora de Elemental), EL SISTEMA abre el
  Asistente del lugar donde trabaja, no su módulo (D12).

### Reglas transversales

- RF-63: EL SISTEMA no cambia lo que cada cargo puede ver ni hacer.
- RF-64: EL SISTEMA no tiene desplazamiento horizontal de la página en ningún ancho desde 360 px
  (como 026/RF-39).
- RF-65: EL SISTEMA da a los botones y controles que se tocan al menos 40 px de alto en el celular (como
  026/RF-40).
- RF-66: EL SISTEMA no ofrece modo oscuro.

## Superficies afectadas

- [ ] **Móvil** — sin cambios. La app del operador queda como está.
- [x] **Panel web** — menú lateral (abierto y plegado), la portada de cada empresa y obra, todos los
  formularios y ventanas, el encabezado de todas las pantallas, todas las tablas, las listas con filtro por
  estado, los avisos y el cambio de contraseña.
- [ ] **API** — sin cambios. Si alguna lista llega por páginas, RF-52 puede pedir los conteos por estado al
  servidor; lo confirma el plan.
- [ ] **Sincronización** — sin cambios.
- [ ] **Datos** — sin cambios de esquema ni de datos.
- [x] **Reglas** — a qué sección pertenece cada entrada del menú y qué secciones quedan para cada cargo
  (RF-3 a RF-10). Lleva su caso nuevo en la verificación.

## Requisitos no funcionales

- Se comprueba en tres anchos: 390 px (celular), 1366 px (portátil) y 1920 px (monitor).
- Ninguna pantalla se ve peor en 1366 px que antes de esta spec. Se compara con las fotos de «antes».
- El color nunca es la única señal: siempre va con ícono o texto (principio 7).
- Sin dependencias nuevas (principio 8).

## Casos límite

- **Sin señal**: no aplica; es el panel web. Si el panel pierde la conexión al guardar, el aviso de error
  de RF-57 lo dice y se queda.
- **Evidencia firmada**: no cambia nada. Un preoperacional firmado o un parte cerrado se siguen anulando
  con motivo; por eso no hay «Deshacer» (RF-59, principio 4).
- **Primer arranque**: una empresa u obra sin registros muestra las listas vacías de RF-53.

Y los de esta spec:

- Un cargo que solo ve un módulo (almacenista, encargado de planta): el menú muestra una sola sección con
  una entrada, más el Asistente si lo tiene (RF-9).
- Una tabla de una sola columna: la tarjeta lleva solo el dato principal.
- Una lista de pocas columnas en un celular: pasa igual a tarjetas, porque por debajo de 768 px siempre son
  tarjetas (RF-33).
- Una cuadrícula en el celular: se desplaza a lo ancho dentro de su marco (RF-72).
- Un estado «Anulada» en las cifras y la casilla «Ver anulados» en la misma lista: el plan debe evitar que
  digan cosas distintas.
- Alguien abre la dirección vieja del Resumen del día (RF-87).
- Las páginas para imprimir no llevan menú, encabezado nuevo ni tarjetas.
- Una fila sin botones: la tarjeta va sin pie (RF-37).
- Girar el celular de vertical a horizontal sin pasar de 768 px: siguen las tarjetas.
- Un nombre de obra largo en la ruta (RF-29).
- Un error mientras otro aviso está a la vista (RF-58).
- Una lista vacía por los filtros, distinta de una lista sin datos (RF-53 y RF-54).
- Una lista con filtro por estado pero sin registros en un estado: su cifra muestra 0 y sigue pudiéndose
  pulsar.

## Fuera de alcance

- La app del operador (PreOpera OCC en el celular).
- Documentos en carpetas: es la spec 051.
- Cambiar los colores de la paleta, y el modo oscuro.
- Permisos, cargos, datos y esquema.
- «Deshacer» en los avisos.
- Cifras de estado en listas que hoy no tienen filtro por estado.
- Un tablero nuevo en el inicio de cada empresa u obra (el Resumen del día se retira y no se reemplaza).
- Lo que el Asistente sabe responder: no cambia, solo pasa a ser la portada.
- Las páginas para imprimir.
- Cambiar el texto o el orden de las columnas de las tablas en el computador.
- Animaciones más allá del realce de RF-47 y la entrada y salida de los avisos.

## Criterios de finalización

- La sección de cada entrada del menú y las secciones que quedan para cada cargo tienen su caso en la
  verificación de reglas.
- Fotos «antes» y «después» en 390, 1366 y 1920 px de: el menú de una obra y de las tres empresas (abierto
  y plegado), el formulario de requisición, la ficha de persona, el contrato, una tabla larga, una lista
  con cifras de estado y una lista vacía.
- `npm run verificar`, `npm run typecheck` y `npm run lint` en verde, y el export web sin errores.
- Demo manual: entrar como residente a una obra desde el celular. Abrir el menú y ver las secciones.
  Abrir Requisiciones, filtrar por la cifra «Pendientes», ver las filas como tarjetas, crear una
  requisición con dos renglones, ver el aviso «Requisición guardada», y repetir en un computador de 1366 px
  y en uno de 1920 px.

## Dudas abiertas

Ninguna. Las del borrador las cerró Diego el 2026-11-18:

- D1: los listados y tableros llegan hasta 1600 px de ancho (RF-42).
- D2: los formularios y fichas llegan hasta 1100 px (RF-43).
- D3: el aviso de éxito dura 4 segundos (RF-56).
- D4: todos los pasos anteriores de la ruta llevan enlace (RF-28).

Y las de la clarificación, el mismo día:

- D5: las tablas que se llenan celda por celda y las matrices siguen como cuadrícula en cualquier ancho
  (RF-71, RF-72).
- D6: de 768 px en adelante, una lista que no cabe entera pasa a tarjetas; los botones nunca quedan fuera
  de la vista (RF-41, RF-44, RF-70).
- D7: las cifras de estado reemplazan al selector de estado; las casillas de vencidos y anulados se quedan
  (RF-75, RF-76).
- D8: el error de un campo va debajo del campo y la ventana sigue abierta; el que no es de un campo va en
  el aviso que se queda (RF-57, RF-79, RF-80).
- D9: el Asistente es la primera entrada del menú y la portada de todas las empresas y obras (RF-8,
  RF-84).
- D10: el Resumen del día de la obra se retira del todo (RF-86).
- D11: Gerencia sigue entrando por las tarjetas de las empresas (RF-88).

Y la que salió al planificar, el mismo día:

- D12: todos los cargos entran al Asistente, también los que hoy entran directo a su módulo; el módulo queda
  a un toque en el menú (RF-90).
