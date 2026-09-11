# Spec 006 — Un panel que se lee de un vistazo

> Estado: Aprobada · Fecha: 2026-09-11

## Contexto y objetivo

El panel hace lo que se acordó. La spec 001 se comprobó en pantalla: una cuenta de
residente ve exactamente sus cuatro módulos y nada más. Pero tres cosas del uso diario
delatan que hacer lo correcto y **dejarlo ver** no son lo mismo.

La primera es de un segundo: los módulos arrancan pegados al nombre del proyecto, contra
el borde izquierdo, en vez de estar centrados. Con cuatro módulos se nota más que con
siete, así que el residente ve una barra peor compuesta que la gerencia.

La segunda es del trabajo de cada tarde. El parte diario son nueve bloques blancos
apilados en una columna larga. Quien lo llena no sabe en qué punto va, ni cuántas
secciones quedan, ni qué le falta para poder cerrarlo — lo descubre pulsando «Cerrar» y
recibiendo un rechazo. Un documento de nueve partes necesita decir de un vistazo por dónde
va.

La tercera se descubrió mirando la base de datos, y es la que más caro sale. Un
preoperacional que un operador firmó en obra el 3 de septiembre llegó al servidor el 7,
porque el celular tardó cuatro días en agarrar señal — que es exactamente para lo que se
diseñó el sistema. Está guardado, íntegro, con su firma. Y **es invisible en el panel**: la
pantalla abre siempre en el día de hoy y solo sabe mirar veinticuatro horas, sobre la fecha
en que el operador empezó el formulario. Para encontrarlo hay que pulsar «día anterior»
ocho veces sospechando que existe. Nadie lo va a hacer, y el resultado práctico es que la
administración cree que ese preoperacional nunca se hizo.

El objetivo de esta spec es que el panel no esconda nada de lo que ya tiene, y que lo que
enseña se entienda sin explicación.

## Usuarios / actores

- **Residente / director de obra** — llena el parte diario cada tarde y consulta los
  preoperacionales de su obra. Es quien más sufre las tres carencias.
- **Gerencia** — revisa los preoperacionales de todas las obras y es quien tiene que
  enterarse de que una máquina rodó sin inspeccionar.
- **Operador** — **no interviene**. Nada de esta spec cambia lo que ve ni lo que hace en el
  celular; aparece aquí solo porque el acta que firma es la que tiene que llegar a verse.

## Historias de usuario

- H1: Como residente quiero que la barra se vea igual de compuesta con mis cuatro módulos
  que con los siete de gerencia, para no tener la sensación de estar usando una versión a
  medio hacer.
- H2: Como residente quiero ver de un vistazo por dónde voy en el parte y qué me falta para
  cerrarlo, para no descubrir lo que falta cuando ya creía haber terminado.
- H3: Como gerencia quiero que un preoperacional que llegó con retraso se vea sin tener que
  sospechar que existe, para no dar por incumplido un trabajo que sí se hizo.
- H4: Como residente quiero entender por qué una lista está vacía, para saber si es que no
  hay nada o es que no me corresponde verlo.

## Requisitos funcionales (criterios de aceptación en EARS)

### Lo primero que se ve: la barra (H1)

- RF-1: EL SISTEMA mostrará los enlaces de los módulos centrados respecto a la barra de
  navegación.
- RF-2: EL SISTEMA mantendrá los enlaces centrados sea cual sea el número de módulos que le
  correspondan a quien entra.
- RF-3: SI la ventana no da para la marca, los enlaces y la cuenta en una sola línea,
  ENTONCES EL SISTEMA los repartirá en más de una línea sin que los enlaces dejen de estar
  centrados.
- RF-4: EL SISTEMA permitirá recorrer los enlaces con el teclado, señalando cuál está
  enfocado.

### El parte diario se lee como un solo documento (H2)

- RF-5: EL SISTEMA presentará las secciones del parte diario dentro de un solo marco.
- RF-6: EL SISTEMA separará cada sección de la siguiente con una divisoria visible que cruce
  ese marco de lado a lado.
- RF-7: EL SISTEMA mostrará junto al parte un índice con sus secciones, en el mismo orden en
  que aparecen en el documento.
- RF-8: EL SISTEMA indicará en el índice, para cada sección, si tiene algo registrado y
  cuánto.
- RF-9: EL SISTEMA dará por registrado únicamente lo que ya se haya guardado, y no lo que
  esté escrito en pantalla sin guardar.
- RF-10: CUANDO se elija una sección en el índice, EL SISTEMA llevará la vista a esa sección
  del parte.
- RF-11: MIENTRAS se recorra el parte, EL SISTEMA mantendrá el índice a la vista.
- RF-12: EL SISTEMA indicará en el índice si el parte ya está cerrado o si falta cerrarlo.
- RF-13: SI falta algo para poder cerrar el parte, ENTONCES EL SISTEMA lo nombrará en el
  índice, antes de que se intente cerrarlo.
- RF-14: EL SISTEMA no usará el color como única señal del estado de una sección.
- RF-15: EL SISTEMA conservará el guardado independiente de cada sección del parte.
- RF-16: SI la ventana no tiene ancho para el índice y el parte a la vez, ENTONCES EL SISTEMA
  seguirá mostrando los dos, reordenándolos.
- RF-17: EL SISTEMA permitirá recorrer el índice con el teclado, señalando cuál está enfocado.
- RF-28: EL SISTEMA mostrará al pie del parte las bitácoras por máquina de ese día únicamente
  si están cerradas.
- RF-29: CUANDO el parte muestre bitácoras por máquina de ese día, EL SISTEMA las incluirá en
  el índice como una entrada más, sin contarlas entre lo que falta para cerrar.

### Ningún preoperacional se queda escondido (H3)

- RF-18: EL SISTEMA permitirá consultar los preoperacionales de un periodo de varios días.
- RF-19: CUANDO se abra el módulo de preoperacionales sin elegir periodo, EL SISTEMA mostrará
  el de la última semana.
- RF-20: EL SISTEMA incluirá en el periodo consultado todo preoperacional que se haya
  iniciado dentro de él **o** que haya llegado al servidor dentro de él.
- RF-21: EL SISTEMA mostrará, junto al día de trabajo de cada preoperacional, el día en que
  el servidor lo recibió.
- RF-22: SI un preoperacional llegó en un día distinto de aquel en que se inició, ENTONCES EL
  SISTEMA lo señalará en su fila.
- RF-23: EL SISTEMA seguirá avisando de las máquinas sin preoperacional **del día de hoy**,
  sea cual sea el periodo que se esté consultando.
- RF-30: EL SISTEMA conservará el periodo consultado al recargar la página y al compartir la
  dirección con otra persona.

### Una lista vacía dice por qué lo está (H4)

- RF-24: SI quien consulta no alcanza ninguna obra, ENTONCES EL SISTEMA se lo dirá, en lugar
  de mostrarle un listado vacío indistinguible de uno sin datos.
- RF-25: SI un listado queda vacío por un filtro de búsqueda aplicado, ENTONCES EL SISTEMA lo
  advertirá y ofrecerá quitarlo.

### Reglas transversales

- RF-26: EL SISTEMA no cambiará nada de lo que ve ni de lo que hace el operador en el celular.
- RF-27: EL SISTEMA no modificará ningún preoperacional ni ningún parte ya registrado.

## Superficies afectadas

- [ ] **Móvil** — ninguna. El operador no entra al panel y su app no cambia (RF-26).
- [x] **Panel web** — barra de navegación, pantalla del parte diario y pantalla de
  preoperacionales.
- [x] **API** — solo el listado de preoperacionales: periodo y fecha de recepción.
- [ ] **Sincronización** — sin impacto. No hay tipos nuevos, ni cola, ni bajada.
- [ ] **Datos** — sin cambios de esquema. Todo lo que hace falta ya está guardado.
- [x] **Reglas** — el estado de las secciones del parte y la aritmética de periodos son
  funciones puras, con sus casos en `scripts/verificar-reglas.ts`.

## Requisitos no funcionales

- Todas las columnas de cada tabla siguen cabiendo en un portátil de 1366 puntos de ancho,
  sin que ninguna quede fuera de la vista (sigue en pie 005/RF-20).
- Relación de contraste mínima de 4.5:1 entre texto y fondo, también en el índice nuevo
  (sigue en pie 005/RF-22).
- Ninguna pantalla define un color, un tamaño de letra ni un espaciado por su cuenta (sigue
  en pie 005/RF-23).
- El periodo más largo que se ofrece es de un mes: más allá, consultar un día concreto.
- Los textos que explican un vacío dicen qué se registra ahí y qué hacer, en español y sin
  códigos técnicos.

## Casos límite

- **Sin señal**: no aplica al panel, que es de escritorio y siempre tiene red. Pero es el
  origen de esta spec: un acta que viajó cuatro días en el celular sin señal tiene que
  poder verse cuando llega, y hoy no se ve (RF-20, RF-21, RF-22).
- **Evidencia firmada**: ninguna se toca. Esta spec cambia **cómo se enseña** lo registrado,
  nunca lo registrado (RF-27). Un preoperacional anulado se sigue mostrando como anulado.
- **Primer arranque / parte recién abierto**: las nueve secciones están vacías y el índice
  tiene que verse bien así, diciendo que falta todo, sin parecer un error de carga.
- Un día **sin bitácoras del formato viejo**: esa sección no existe ese día, y el índice no
  puede ofrecer una sección que no está.
- Un parte **anulado**: ya no se edita, así que el índice informa pero no invita a llenar.
- Un preoperacional **iniciado y recibido el mismo día**, que es el caso normal: no lleva
  marca de retraso, para que la marca signifique algo cuando aparece (RF-22).
- Un **periodo sin ningún preoperacional**: hay que distinguirlo de un periodo que sí los
  tiene pero que quien mira no alcanza (RF-24).
- El **reloj del celular corrido**: el día de trabajo que llega puede ser cualquiera. El
  panel no lo corrige —eso sería reescribir evidencia— pero deja de esconder el acta,
  porque el periodo también mira la fecha de llegada (RF-20).
- Una **sección escrita a medias y sin guardar** cuando alguien mira el índice: cuenta como
  vacía (RF-9).

## Fuera de alcance

- **El cambio de nombre del proyecto.** Está en espera de que gerencia decida cuál, y
  cuando llegue es una tarea aparte con su propio alcance.
- **Todo lo que sea del lado del celular.** Incluye la cola de subida, sus reintentos y el
  aviso al operador de que algo quedó sin subir. Va en la tanda de requerimientos del móvil.
- **Cambiar de dónde sale la fecha de inicio de un preoperacional.** Hoy es el reloj del
  teléfono al abrir el borrador, y corregir eso es del móvil.
- **Reordenar las secciones del parte, ni añadir ni quitar ninguna.** Son las mismas nueve
  que ya hay; lo que cambia es cómo se presentan.
- **Rehacer las otras pantallas del panel** (obras, vehículos, personas, asignaciones,
  inicio). Comparten piezas con estas dos y no pueden romperse, pero no se rediseñan aquí.
- **Modo oscuro** y cualquier cambio en la app del operador.
- **Unificar en tokens los grosores de borde del resto del panel.** Es un barrido que
  merece su propia tarea.

## Criterios de finalización

- Cada RF tiene su comprobación: las de regla pura, como caso en
  `scripts/verificar-reglas.ts`; las de pantalla, como paso de demo manual descrito.
- `npm run verificar`, `npm run typecheck` y `npm run lint` en verde.
- Demo manual del flujo principal:
  1. Entrar como gerencia y ver los siete módulos centrados; salir, entrar como residente y
     ver los cuatro **igual de centrados**; estrechar la ventana y comprobar que siguen
     centrados; recorrerlos con el tabulador.
  2. Abrir el parte de un día vacío: el índice muestra las nueve secciones sin registrar y
     dice qué falta para cerrar. Añadir una máquina y **guardar**: esa sección se enciende
     en el índice. Escribir una persona **sin guardar**: el índice no se enciende. Pulsar
     una sección del índice y comprobar que la vista salta. Desplazarse y ver que el índice
     se queda. Estrechar la ventana y comprobar que el índice sigue estando.
  3. **El caso real**: abrir Preoperacionales sin tocar nada y comprobar que aparece el acta
     de VOL-01 de Pedro Cartagena —iniciada el 2026-09-03, recibida el 2026-09-07— con su
     fecha de llegada y su marca de retraso, sin haber pulsado «día anterior» ni una vez.
  4. Entrar con una cuenta de supervisor sin obra y comprobar que el panel dice por qué no
     ve nada.

## Dudas abiertas

Ninguna. Las dos se resolvieron el 2026-09-11, al planificar:

- **Las bitácoras por máquina solo se muestran si están cerradas** (RF-28). Se miró la base
  antes de decidir: hay seis, las seis **abiertas**, todas de la misma semana en que se
  probaba el formato viejo. Una bitácora abierta no es evidencia, es un borrador a medias, y
  arrastrarlo al pie del parte todos los días ensucia el documento nuevo sin conservar nada.
  Las filas **no se borran** —siguen en la base, como manda el principio 4 de la
  constitución—; lo que cambia es qué enseña el panel. Esto **estrecha 004/RF-36**, que pedía
  mostrarlas todas: la promesa de conservar el trabajo ya registrado sigue en pie, porque una
  bitácora cerrada de verdad se seguiría viendo.
- **Cuando ese bloque aparezca, entra en el índice** (RF-29), por la misma razón que las
  demás: si ocupa sitio en la pantalla, el índice tiene que poder llevar hasta él. No cuenta
  como pendiente para cerrar, porque es de otro formato y no se puede llenar.
- **El periodo viaja en la dirección** (RF-30), igual que ya hace la búsqueda desde
  005/RF-15, y con la misma pieza.
