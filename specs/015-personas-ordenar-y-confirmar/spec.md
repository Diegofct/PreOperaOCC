# Spec 015 — Personas: ordenar la tabla y confirmar en una ventana

> Estado: **Cumplida** · Fecha: 2026-09-21 · Cumplida: 2026-09-21 · Cambio: 2026-09-22 (el
> resultado de una acción se ve en la ventana, RF-25 a RF-33), cumplido el 2026-09-22

## Contexto y objetivo

OCC pidió dos cosas del módulo de Personas: poder «eliminar» un registro y que la tabla
«tenga una organización». Al revisarlo con Diego el 2026-09-21 quedó claro que **dar de baja
ya hace lo que se necesita**: la persona sale de la lista, pierde el acceso al panel y al
celular, y los preoperacionales, partes y movimientos que registró siguen mostrando su
nombre como responsable. Borrarla de verdad rompería esa evidencia (principio 4 de la
constitución), así que **no se borra nada**.

Lo que sí falla es la forma. El aviso que pide confirmar la baja aparece arriba de la
pantalla, lejos del botón que se pulsó, y con la tabla al fondo se pasa por alto: parece que
el botón no hizo nada. Y la tabla solo se ordena por nombre, así que encontrar a todos los de
un cargo o una obra obliga a buscar uno por uno.

Aparte, al revisarlo apareció un hueco: a un operador con el celular activado **no se le
puede dar de baja** —el sistema lo rechaza y pide desactivar un celular que el panel no deja
desactivar—. Esta spec lo cierra.

## Usuarios / actores

- **Gerencia** (panel web) — es quien da de baja personas y quien más usa la tabla de
  Personas; también confirma bajas y anulaciones en los demás módulos.
- **Residente / director de obra** (panel web) — confirma bajas en los módulos que tiene
  (vehículos, almacén, cantera). No ve el módulo de Personas en el menú.
- **Almacenista** y **Encargado de Planta** (panel web) — confirman bajas en su módulo.
- **Operador** (móvil) — no usa nada de esto; solo lo afecta que, al darlo de baja, su
  celular deja de servirle.

## Historias de usuario

- H1: Como gerencia quiero que la confirmación de una baja salga en una ventana delante de
  todo para no pasarla por alto ni confirmar sin leer.
- H2: Como gerencia quiero ordenar la tabla de Personas por cualquier columna para encontrar
  de un vistazo a los de un cargo, una obra o un tipo de acceso.
- H3: Como gerencia quiero dar de baja a un operador aunque tenga el celular activado para no
  quedarme con personas que ya no trabajan en OCC y siguen pudiendo entrar.
- H4: Como gerencia quiero que, cuando algo no se pueda hacer, el sistema me lo diga en la
  misma ventana donde lo pedí, para no quedarme mirando un botón que parece no hacer nada.
  *(cambio 2026-09-22)*
- H5: Como gerencia quiero leer la contraseña temporal en la misma ventana donde la pedí, para
  copiarla sin buscarla por la pantalla. *(cambio 2026-09-22)*

## Requisitos funcionales (criterios de aceptación en EARS)

### Confirmar en una ventana (H1)

- RF-1: CUANDO alguien pida dar de baja, anular o cualquier otra acción que el panel hace
  confirmar, EL SISTEMA mostrará la confirmación en una ventana centrada delante de la
  pantalla, con el fondo oscurecido.
- RF-2: EL SISTEMA aplicará RF-1 en todos los módulos del panel que piden confirmación:
  Obras, Personas (dar de baja y generar contraseña nueva), Vehículos, Almacén (dar de baja
  un material) y los catálogos de Control Cantera (sitios y materiales). Asignaciones no pide
  confirmación hoy y no se le añade.
- RF-3: EL SISTEMA mostrará en la ventana el mismo texto que hoy explica qué pasa al
  confirmar, con el nombre de la persona o del registro afectado.
- RF-4: EL SISTEMA ofrecerá en la ventana dos botones, el de la acción (con su nombre, por
  ejemplo «Dar de baja») y «Cancelar».
- RF-5: CUANDO se pulse «Cancelar», se cierre la ventana o se pulse fuera de ella, EL SISTEMA
  no hará la acción.
- RF-6: MIENTRAS la ventana de confirmación esté abierta, EL SISTEMA no dejará usar la
  pantalla de detrás.
- RF-7: SI la acción confirmada falla, ENTONCES EL SISTEMA mostrará el motivo en la pantalla,
  como hoy.
  > **Reemplazado por RF-25 el 2026-09-22.** El motivo se ve en la ventana: en la pantalla
  > queda detrás de ella, y parece que no pasó nada.

### El resultado se ve donde se pidió (H4, H5, cambio 2026-09-22)

- RF-25: SI una acción pedida desde una ventana falla, ENTONCES EL SISTEMA mostrará el motivo
  **en esa misma ventana**, sin cerrarla, y dejará volver a intentarlo o cancelar.
  *(cambio 2026-09-22, reemplaza RF-7)*
- RF-26: EL SISTEMA aplicará RF-25 tanto a las ventanas de confirmación como a las de
  formulario —registrar o corregir— de todos los módulos del panel. *(cambio 2026-09-22)*
- RF-27: SI el motivo del rechazo señala un campo del formulario de esa ventana, ENTONCES EL
  SISTEMA lo mostrará además bajo ese campo, como ya hacen el movimiento de almacén y el
  viaje de cantera. *(cambio 2026-09-22)*
- RF-28: CUANDO se genere una contraseña temporal, EL SISTEMA la mostrará en la ventana desde
  la que se pidió, con el usuario al que pertenece y la advertencia de que solo se ve una vez.
  *(cambio 2026-09-22)*
- RF-29: EL SISTEMA mantendrá abierta esa ventana hasta que se cierre a propósito, para dar
  tiempo a copiar la contraseña. *(cambio 2026-09-22)*
- RF-30: EL SISTEMA aplicará RF-28 y RF-29 también a los códigos de activación del celular,
  que se generan igual y hoy se muestran en el mismo sitio. *(cambio 2026-09-22)*
- RF-31: EL SISTEMA cerrará la ventana que muestra una contraseña temporal o unos códigos de
  activación **únicamente con su botón de cerrar**: ni la tecla Esc ni un clic fuera la
  cerrarán. Es la única ventana del panel con esa excepción, y la tiene porque lo que muestra
  no se puede volver a ver: un clic distraído obliga a generar otra, y la anterior ya dejó de
  servir. *(cambio 2026-09-22)*
- RF-32: CUANDO la acción se pidiera desde una ventana de confirmación, EL SISTEMA mostrará la
  contraseña o los códigos **reemplazando el contenido de esa misma ventana**, sin cerrarla y
  sin abrir otra. *(cambio 2026-09-22, precisa RF-28)*
- RF-33: EL SISTEMA **no repetirá el mismo texto** arriba de la ventana y bajo un campo. Cuando
  el rechazo señale un solo campo, el motivo se leerá arriba y el campo no lo repetirá; cuando
  señale varios, cada uno llevará el suyo debajo y arriba se leerá que hay campos que corregir.
  *(cambio 2026-09-22, precisa RF-27)*
  > Se vio en la demo del 2026-09-22 con el rechazo de 017/RF-11: el mismo «Esa obra no lleva el
  > módulo Almacén.» salía dos veces, y la segunda bajo «Acceso», un campo que no se había
  > tocado —lo que se cambió fue la obra—. Leer dos veces lo mismo no informa más, y señalar un
  > campo ajeno despista.

### Ordenar la tabla de Personas (H2)

- RF-8: EL SISTEMA permitirá ordenar la tabla de Personas por cualquiera de estas columnas:
  Usuario, Nombre completo, Documento, Cargo, Acceso y Obra.
- RF-9: CUANDO se pulse el título de una columna ordenable, EL SISTEMA ordenará la tabla por
  esa columna de la A a la Z.
- RF-10: CUANDO se pulse otra vez el título de la columna por la que ya está ordenada, EL
  SISTEMA invertirá el orden (de la Z a la A).
- RF-11: EL SISTEMA marcará en el título de la columna por la que está ordenada la tabla el
  sentido del orden con una flecha (▲ de la A a la Z, ▼ de la Z a la A).
- RF-12: EL SISTEMA ordenará sin distinguir mayúsculas de minúsculas ni tildes.
- RF-13: EL SISTEMA dejará al final, en cualquier sentido, las filas que no tienen dato en la
  columna ordenada (por ejemplo, una persona sin obra o sin documento).
- RF-14: EL SISTEMA mantendrá el orden elegido al buscar, al filtrar por obra o por acceso y al
  cambiar de página.
- RF-15: EL SISTEMA ordenará la lista completa antes de repartirla en páginas, de modo que la
  página 2 sigue a la última fila de la página 1.
- RF-16: CUANDO alguien vuelva a Personas desde el mismo navegador, EL SISTEMA mostrará la
  tabla con el último orden que eligió.
- RF-17: MIENTRAS no se haya elegido un orden, EL SISTEMA ordenará la tabla por nombre
  completo de la A a la Z, como hoy.

### Dar de baja a un operador con celular activado (H3)

- RF-18: SI la persona que se va a dar de baja tiene un celular activado, ENTONCES EL SISTEMA
  lo dirá en la ventana de confirmación, avisando que ese celular deja de servirle y que lo
  que aún no haya subido desde él ya no llegará.
- RF-19: CUANDO se confirme la baja de una persona con celular activado, EL SISTEMA
  desactivará ese celular.
- RF-20: CUANDO se confirme la baja de una persona con celular activado, EL SISTEMA dará de
  baja a la persona en la misma acción, sin pedir un segundo paso.
- RF-21: SI la desactivación del celular o la baja no se pueden completar, ENTONCES EL SISTEMA
  no dejará a la persona a medias: o queda dada de baja y sin celular, o queda como estaba.

### Reglas transversales

- RF-22: EL SISTEMA no borrará a ninguna persona: dar de baja la retira de la lista y le quita
  el acceso, y nada más.
- RF-23: EL SISTEMA seguirá mostrando el nombre de una persona dada de baja en los
  preoperacionales, partes, movimientos de almacén y viajes de cantera que registró o que se
  le registraron.
- RF-24: EL SISTEMA seguirá impidiendo que alguien se dé de baja a sí mismo.

## Superficies afectadas

- [ ] **Móvil** — sin cambios de código. Un celular desactivado ya queda fuera con el
  comportamiento actual (RF-19).
- [x] **Panel web** — la confirmación en todos los módulos (RF-1 a RF-7); la tabla de
  Personas (RF-8 a RF-17); la ventana de baja de Personas (RF-18).
- [x] **API** — la baja de una persona desactiva también su celular (RF-19 a RF-21).
- [ ] **Sincronización** — sin cambios. Lo que el celular desactivado tenga sin subir se
  rechaza como hoy se rechaza cualquier petición de un celular desactivado.
- [ ] **Datos** — sin cambios de esquema.
- [ ] **Reglas** — sin reglas de negocio nuevas.

Cambio 2026-09-22: **Panel web** — el fallo de una acción se lee dentro de la ventana desde la
que se pidió (RF-25 a RF-27), y la contraseña temporal y los códigos de activación se muestran
ahí mismo (RF-28 a RF-32). **API**, **Datos**, **Reglas**, **Móvil** y **Sincronización**: sin
impacto; no cambia nada de lo que el servidor responde.

## Requisitos no funcionales

- Ordenar una tabla de hasta 500 personas se ve de inmediato (sin volver a pedir datos al
  servidor).
- La ventana de confirmación se usa también con el teclado: la tecla Escape equivale a
  «Cancelar».

## Casos límite

- **Sin señal**: no aplica al panel. En el celular de la persona dada de baja: mientras no
  tenga señal puede seguir desbloqueándolo con su PIN y llenando preoperacionales, pero esos
  registros no llegarán al servidor. Por eso la ventana lo avisa (RF-18).
- **Evidencia firmada**: no se toca. Los preoperacionales y partes de la persona dada de baja
  se conservan y siguen mostrando su nombre (RF-23).
- **Primer arranque / equipo recién activado**: si se da de baja a un operador cuyo celular se
  activó pero todavía no bajó sus datos, el celular queda igual de desactivado.

Y los del caso:

- **Persona con dos celulares activados** (cambió de teléfono sin desactivar el viejo): se
  desactivan todos.
- **Dos personas de gerencia dando de baja a la misma persona a la vez**: la segunda recibe
  que ya no existe en la lista, sin error grave.
- **Confirmación abierta y la sesión caducada**: al confirmar, el panel lleva a iniciar sesión
  como en cualquier otra acción.
- **Columna ordenada con valores iguales** (dos personas con el mismo cargo): dentro de ellas
  se mantiene el orden por nombre completo.

- *(cambio 2026-09-22)* Corregir a una persona para moverla a una obra que no lleva su módulo
  (017/RF-11): el servidor lo rechaza, y lo que cambia aquí es que el motivo **se lee** en la
  ventana en vez de quedar detrás de ella.
- *(cambio 2026-09-22)* Un fallo de red con la ventana abierta: el «no se pudo contactar al
  servidor» se lee igual, en la ventana (RF-25).
- *(cambio 2026-09-22)* Cerrar la ventana con la contraseña temporal a la vista: no se vuelve a
  mostrar; hay que generar otra (RF-28, RF-29).

## Fuera de alcance

- **Borrar personas de la base de datos.** Descartado con Diego el 2026-09-21: rompe la
  evidencia (principio 4).
- **Reactivar a una persona dada de baja** o ver las personas dadas de baja en la tabla.
- **Ordenar por columna las demás tablas del panel** (Obras, Vehículos, Asignaciones,
  Preoperacionales, Almacén, Cantera). Solo Personas por ahora; se extiende con un cambio a
  esta spec.
- **Agrupar la tabla** por obra o por cargo.
- **Un botón para desactivar el celular sin dar de baja** a la persona (por ejemplo, porque
  perdió el teléfono). Hoy eso se resuelve de otra forma y no lo pidió OCC.
- Cambiar los textos de los avisos de confirmación, salvo el de RF-18.

- *(cambio 2026-09-22)* Copiar la contraseña al portapapeles con un botón: se lee y se copia a
  mano, como hoy.
- *(cambio 2026-09-22)* Cambiar lo que el servidor responde, o sus textos de rechazo: solo
  cambia dónde se leen.
- *(cambio 2026-09-22)* Guardar la contraseña temporal en algún sitio para volver a verla.

## Criterios de finalización

- Esta spec no añade reglas puras: los RF se comprueban con demo manual.
- `npm run verificar`, `npm run typecheck` y `npm run lint` en verde.
- Demo manual: como gerencia, en Personas ordenar por Cargo (▲), otra vez (▼), buscar, cambiar
  de página y salir y volver (el orden se mantiene); dar de baja a una persona de prueba desde
  la ventana, cancelar una vez y confirmar otra; dar de baja a un operador de prueba con celular
  activado y comprobar que su celular ya no sincroniza; abrir un preoperacional suyo y ver su
  nombre. Repetir la ventana de confirmación en Obras, Vehículos, Almacén y
  Cantera, cancelando.

Del cambio del 2026-09-22:

- Demo manual: corregir una persona para moverla a una obra sin su módulo y leer el motivo
  **dentro de la ventana**, sin que se cierre; corregirla luego a una obra válida y ver que
  guarda; generar una contraseña temporal y leerla en la ventana desde la que se pidió, con su
  usuario; lo mismo con los códigos de activación.

## Dudas abiertas

Ninguna abierta.

Decisiones de Diego del 2026-09-21: no se borra nada; la ventana va en todo el panel; se
ordenan todas las columnas de Personas, con A→Z / Z→A y recordado en el navegador; solo
Personas; la baja corta también el celular.

Resueltas el 2026-09-22 (Diego, usando el panel):

- **El fallo se lee donde se pidió** (RF-25 a RF-27). Se vio con el rechazo de 017/RF-11: la
  ventana decía «Guardando…» y no pasaba nada, porque el motivo salía detrás de ella.
- **La contraseña temporal y los códigos de activación** se muestran en la ventana desde la que
  se pidieron (RF-28 a RF-30).

Aprobada por Diego el 2026-09-22, **viendo la demo** (RF-33):

- **El motivo no se repite arriba y bajo el campo.** Se descartó dejarlo repetido, que era lo
  que RF-27 pedía al pie de la letra con su «además»: en pantalla el mismo texto dos veces no
  informa más, y en este caso el de abajo colgaba de «Acceso» mientras lo que se había cambiado
  era la obra. Se descartó también corregir al servidor para que señale `obraId` en vez de
  `rol`: eso es de la spec 017 y cambiaría lo que responde la API, que esta spec declara fuera
  de alcance.

Aprobadas por Diego el 2026-09-22, al planificar (aparecieron al leer el código, y la spec no
las contemplaba):

- **La ventana de la contraseña se cierra solo con su botón** (RF-31). Se descartó dejarla como
  el resto de ventanas del panel —Esc y clic fuera— porque esa consistencia se paga con una
  contraseña perdida cada vez que alguien pulsa fuera sin querer, y la anterior ya no sirve.
- **La contraseña sale en la misma ventana de confirmación** (RF-32), reemplazando su contenido.
  Se descartó cerrar la confirmación y abrir otra ventana: son dos pasos del mismo gesto y la
  pantalla pestañearía entre las dos.

Aprobadas por Diego el 2026-09-22, al revisar el diff del cambio:

- **El mensaje de error no cierra la ventana** (RF-25). Se queda dentro, con lo escrito
  intacto, y deja corregir y reintentar o cancelar. La alternativa —cerrarla y dejar el aviso
  detrás— es justo el comportamiento que causó el problema.
- **No hay botón de «copiar» la contraseña**: se lee y se teclea. Es una función que OCC no
  pidió, y el portapapeles del navegador no es fiable en todos los casos. Queda en «Fuera de
  alcance»; si más adelante se quiere, entra como RF nuevo, no dentro de este cambio.
