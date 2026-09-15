# Spec 007 — Selectores que no se esconden y un panel más claro

> Estado: Cumplida · Fecha: 2026-09-14 · Aprobada: 2026-09-15 · Cambio: 2026-09-15 (RF-25 a RF-30, RF-16 corregido) · Cumplida: 2026-09-15

## Contexto y objetivo

Los selectores del panel —las listas desplegables donde se elige una máquina, una persona,
una obra o un filtro— se abren y su lista **queda tapada** por lo que viene después: la
sección siguiente del parte, la tabla de abajo, el borde de la ventana de edición. Quien
llena el formulario ve media lista, o ninguna, y no puede elegir. Pasa en la bitácora, en
asignaciones, en los filtros de los listados y en las ventanas de edición.

Además, OCC pidió que el panel se vea «más moderno e intuitivo». Esas dos palabras no se
pueden comprobar —la spec 005 ya lo explicó—, así que aquí se traducen a cosas que sí se
pueden mirar y decir sí o no. La traducción es una propuesta y queda abierta a ajuste.

El objetivo es que elegir de una lista funcione siempre, en cualquier pantalla, y que todos
los formularios se comporten igual.

## Usuarios / actores

- **Residente / director de obra** — llena la bitácora y las asignaciones, que es donde más
  selectores hay.
- **Gerencia** — usa los selectores en las ventanas de edición y en los filtros.
- **Almacenista** y **Encargado de Planta** (spec 008) — usarán los mismos selectores en sus
  módulos.
- **Operador** — no interviene: nada de esto cambia la app del celular.

## Historias de usuario

- H1: Como residente quiero ver la lista completa de un selector al abrirlo, para elegir sin
  tener que adivinar qué opción quedó tapada.
- H2: Como cualquiera que usa el panel quiero manejar los selectores con el teclado y
  buscar escribiendo, para no recorrer a mano una lista de cincuenta vehículos.
- H3: Como cualquiera que usa el panel quiero que todos los formularios se vean y respondan
  igual, para no tener que aprender cada pantalla por separado.

## Requisitos funcionales (criterios de aceptación en EARS)

### La lista siempre se ve (H1)

- RF-1: CUANDO se abra un selector, EL SISTEMA mostrará su lista por encima de cualquier otro
  elemento de la pantalla, incluidas las secciones, tablas y tarjetas que estén después de él.
- RF-2: SI el selector está dentro de una ventana emergente, ENTONCES EL SISTEMA mostrará la
  lista completa aunque sobrepase el borde de esa ventana.
- RF-3: SI la lista no cabe debajo del selector dentro de la parte visible de la pantalla,
  ENTONCES EL SISTEMA la abrirá hacia arriba.
- RF-4: EL SISTEMA mantendrá abierta como máximo una lista a la vez.
- RF-5: CUANDO se desplace la página con una lista abierta, EL SISTEMA cerrará la lista sin
  cambiar el valor elegido.
- RF-6: EL SISTEMA aplicará este comportamiento a todos los selectores del panel: bitácora,
  asignaciones, filtros de listados, ventanas de edición y los módulos que se añadan.

### Se maneja sin ratón y se busca escribiendo (H2)

- RF-7: CUANDO se pulse fuera de una lista abierta, EL SISTEMA la cerrará sin cambiar el
  valor elegido.
- RF-8: CUANDO se pulse la tecla Esc con una lista abierta, EL SISTEMA la cerrará sin cambiar
  el valor elegido.
- RF-9: CUANDO se cierre una lista, EL SISTEMA devolverá el foco del teclado a su selector.
- RF-10: MIENTRAS una lista esté abierta, EL SISTEMA permitirá recorrer sus opciones con las
  flechas del teclado.
- RF-11: MIENTRAS una lista esté abierta, EL SISTEMA elegirá con la tecla Enter la opción
  señalada.
- RF-12: DONDE un selector tenga más de ocho opciones, EL SISTEMA ofrecerá dentro de la lista
  un campo para filtrarlas escribiendo.
- RF-13: EL SISTEMA filtrará esas opciones sin distinguir tildes ni mayúsculas, igual que la
  búsqueda de los listados (005/RF-12).
- RF-14: SI el filtro escrito no deja ninguna opción, ENTONCES EL SISTEMA lo dirá dentro de la
  lista, en lugar de mostrarla vacía.
- RF-15: EL SISTEMA señalará en la lista la opción elegida con una marca visible además del
  color.

### Todos los formularios se comportan igual (H3)

- RF-16: EL SISTEMA dará la misma altura, el mismo borde y el mismo redondeado a los campos
  de texto, número, hora, área de texto y selector.
  > **Corregido el 2026-09-15** (validación T9): la altura común es la de los campos de una
  > línea —texto, número, hora y selector—. El área de texto comparte borde y redondeado, y su
  > altura la fija RF-30. Tal como estaba escrito, RF-16 y RF-30 no se podían cumplir a la vez.
- RF-17: EL SISTEMA marcará en la etiqueta de cada campo si es obligatorio, antes de que se
  intente guardar.
- RF-18: SI al guardar un campo tiene un error, ENTONCES EL SISTEMA mostrará el motivo debajo
  de ese mismo campo.
- RF-19: EL SISTEMA mostrará en cada formulario y en cada ventana una sola acción principal
  destacada, con las demás acciones en un estilo secundario.
- RF-20: CUANDO el puntero pase sobre un botón, una opción de lista o una fila de tabla que
  se pueda pulsar, EL SISTEMA la resaltará.
- RF-23: EL SISTEMA alineará por su borde superior, y con la misma altura, los campos que
  compartan una fila de formulario. *(2026-09-15)*
- RF-24: EL SISTEMA presentará los campos de observaciones como un área de texto con al menos
  cuatro líneas visibles. *(2026-09-15)*
  > **Ampliado por RF-30 el 2026-09-15.** En el navegador, cuatro renglones se quedaron
  > cortos para Diego.
- RF-30: EL SISTEMA presentará como área de texto de al menos seis líneas visibles las
  observaciones de cada máquina, las de cada actividad, las notas del día y los motivos que se
  escriben al marcar o anular un parte. *(cambio 2026-09-15)*

### Ventanas, avisos y datos fijos (cambio 2026-09-15, tras el recorrido en el navegador)

- RF-25: CUANDO se abra una ventana emergente, EL SISTEMA la mostrará centrada en la parte
  visible de la pantalla, con su fondo oscurecido cubriendo la pantalla entera, barra de
  navegación incluida.
- RF-26: MIENTRAS haya una ventana emergente abierta, EL SISTEMA la mantendrá entera a la vista,
  aunque la página de detrás sea más larga que la pantalla.
- RF-27: EL SISTEMA mostrará completo el nombre de cada sección en el índice del parte diario.
- RF-28: SI se rechaza guardar una sección del parte o cerrarlo, ENTONCES EL SISTEMA mostrará el
  motivo dentro de esa misma sección, a la vista de quien pulsó el botón.
- RF-29: EL SISTEMA presentará los datos que no se pueden cambiar dentro de un formulario —como
  el equipo de una máquina ya añadida al parte— con un aspecto distinto al de un campo que se
  puede escribir, y no permitirá escribir en ellos.

### Reglas transversales

- RF-21: EL SISTEMA no cambiará nada de lo que ve ni de lo que hace el operador en el celular.
- RF-22: EL SISTEMA no modificará ningún dato registrado: esta spec cambia cómo se elige y
  cómo se ve, no qué se guarda.

## Superficies afectadas

- [ ] **Móvil** — ninguna (RF-21).
- [x] **Panel web** — el selector compartido y todas las pantallas que lo usan; los campos y
  botones compartidos de los formularios.
- [x] **API** — *(2026-09-15, T10)* el rechazo por duplicado añade `campos` con el campo culpable. Aditivo: quien solo lee `error` sigue igual.
- [ ] **Sincronización** — sin impacto.
- [ ] **Datos** — sin cambios de esquema.
- [x] **Reglas** — el filtrado de opciones sin tildes reutiliza la regla de búsqueda que ya
  existe; si se amplía, lleva su caso en el guion de verificación.

## Requisitos no funcionales

- Sin dependencias nuevas (constitución §8).
- Ningún color, tamaño de letra ni espaciado escrito a mano: todo sale del sistema de diseño
  (sigue en pie 005/RF-23).
- Contraste mínimo de 4.5:1 entre texto y fondo en la lista y en los campos (005/RF-22).
- Una lista abierta muestra al menos seis opciones sin desplazarse, cuando la pantalla lo
  permite.
- Funciona en un portátil de 1366 puntos de ancho y en una pantalla de escritorio.

## Casos límite

- **Sin señal**: no aplica; el panel es de escritorio y siempre tiene red.
- **Evidencia firmada**: no se toca ningún registro (RF-22). En un parte cerrado los
  selectores no se muestran para editar, y eso no cambia.
- **Primer arranque**: un selector sin opciones todavía (una obra sin vehículos) sigue
  diciendo que no hay nada que elegir, sin romperse.
- Un selector en **la última sección del parte**, pegado al fondo de la pantalla (RF-3).
- Un selector dentro de una **ventana emergente pequeña** (RF-2).
- Una lista de **cien opciones** (RF-12).
- Una lista **abierta mientras se hace scroll** con la rueda (RF-5).
- **Dos selectores seguidos**: abrir el segundo con el primero abierto (RF-4).
- *(cambio 2026-09-15)* Una **ventana emergente abierta con la página desplazada** hasta el
  fondo: se ve entera y centrada (RF-25, RF-26).
- *(cambio 2026-09-15)* Un **selector dentro de una ventana emergente** que a su vez está sobre
  una lista: la lista del selector va por encima de la ventana (RF-1, RF-2).
- *(cambio 2026-09-15)* Un **rechazo al cerrar** con veinte faltas: se lee entero dentro de la
  sección de cierre (RF-28).
- Casos vistos en el recorrido del 2026-09-15 que motivan el cambio: el botón «Añadir
  actividad» encima de la lista de actividades; la lista de vehículos de Asignaciones cortada
  por la tabla; la ventana «Corregir» con la cabecera bajo la barra; «Control Calidad …» cortado
  en el índice; el rechazo del cierre arriba de la página; el campo «Equipo» que parece
  editable.

## Fuera de alcance

- Modo oscuro.
- Cambiar la paleta de colores, la tipografía o la marca del panel.
- Rediseñar la estructura de las pantallas (qué secciones hay, en qué orden): eso lo
  decidieron las specs 005 y 006.
- Selección múltiple en un mismo selector.
- Cualquier cambio en la app del celular.
- Animaciones de apertura y cierre.

## Criterios de finalización

- Cada RF tiene su comprobación: el filtrado sin tildes como caso en el guion de
  verificación; el resto, como paso de demo manual.
- `npm run verificar`, `npm run typecheck` y `npm run lint` en verde.
- Demo manual, en el navegador:
  1. En la bitácora, abrir el selector de máquina de la primera sección: la lista se ve
     entera por encima de Personal. Abrir el selector de la última sección con la página
     abajo del todo: la lista se abre hacia arriba.
  2. En la ventana de edición de un vehículo, abrir el selector de obra: la lista se ve
     completa aunque sobrepase la ventana.
  3. En Asignaciones y en un filtro de listado, repetir lo mismo.
  4. Con el teclado: tabulador hasta un selector, abrir, flechas, Enter, Esc; el foco vuelve
     al selector. Escribir «camion» y encontrar «Camión».
  5. Recorrer los formularios de Obras, Vehículos, Personas y la bitácora y comprobar que los
     campos miden igual, que los obligatorios están marcados y que el error sale bajo el
     campo.
  6. *(cambio 2026-09-15)* Con la página de Vehículos desplazada al fondo, abrir «Corregir»:
     la ventana sale centrada, entera y con el fondo oscurecido sobre toda la pantalla.
  7. *(cambio 2026-09-15)* En el parte, leer «Control Calidad de Obra» completo en el índice;
     pulsar «Cerrar el parte» vacío y leer el rechazo dentro de la sección de cierre; ver que
     «Equipo» de una máquina no se deja escribir; escribir seis renglones en las observaciones
     de una máquina, de una actividad y en las notas sin que aparezca barra de desplazamiento.

## Dudas abiertas

Resueltas el 2026-09-15:

- **Referencia visual**: no hay. RF-16 a RF-20 se quedan como traducción de «moderno e
  intuitivo», y OCC añadió lo que más le importa: que ningún selector quede tapado, que los
  campos estén alineados (RF-23) y que las observaciones tengan un área de texto grande
  (RF-24).
- **Umbral de búsqueda**: se quedan las ocho opciones (RF-12).

Ninguna abierta.
