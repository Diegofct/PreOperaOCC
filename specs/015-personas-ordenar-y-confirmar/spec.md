# Spec 015 — Personas: ordenar la tabla y confirmar en una ventana

> Estado: Cumplida · Fecha: 2026-09-21

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

## Criterios de finalización

- Esta spec no añade reglas puras: los RF se comprueban con demo manual.
- `npm run verificar`, `npm run typecheck` y `npm run lint` en verde.
- Demo manual: como gerencia, en Personas ordenar por Cargo (▲), otra vez (▼), buscar, cambiar
  de página y salir y volver (el orden se mantiene); dar de baja a una persona de prueba desde
  la ventana, cancelar una vez y confirmar otra; dar de baja a un operador de prueba con celular
  activado y comprobar que su celular ya no sincroniza; abrir un preoperacional suyo y ver su
  nombre. Repetir la ventana de confirmación en Obras, Vehículos, Almacén y
  Cantera, cancelando.

## Dudas abiertas

- Ninguna. Decisiones de Diego del 2026-09-21: no se borra nada; la ventana va en todo el
  panel; se ordenan todas las columnas de Personas, con A→Z / Z→A y recordado en el
  navegador; solo Personas; la baja corta también el celular.
