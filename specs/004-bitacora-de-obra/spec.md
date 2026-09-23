# Spec 004 — Bitácora de obra

> Estado: En curso · Fecha: 2026-09-09 · Cambio: 2026-09-14 (Req2 a Req5, RF-45 a RF-57), 2026-09-15 (RF-52 corregido, RF-58 a RF-60), 2026-09-16 (catálogos reales de OCC, RF-61 a RF-74), 2026-09-17 (la actividad sin número de ítem, RF-75 a RF-77) y 2026-09-22 (vuelve el número de ítem; hora, responsable y ubicación de cada ensayo, RF-78 a RF-89) y 2026-09-23 (se llama «bitácora» en toda la interfaz, y gerencia ve las de todas las obras del día, RF-90 a RF-96), **cumplido el 2026-09-23**

## Contexto y objetivo

Hoy la bitácora del sistema registra una sola cosa: cuántas horas trabajó una máquina. Es
la **bitácora por máquina** —una por equipo y por día— y sirve para el control de la
maquinaria.

Pero lo que el residente lleva de verdad cada tarde es la **bitácora diaria de la obra**: qué
máquinas trabajaron y cuánto, quién estuvo y desde qué hora hasta cuál, qué actividades se
ejecutaron y con qué dimensiones, qué clima hizo y en qué franjas, qué se usó del
laboratorio, qué hay que dejar anotado, y la fotografía del día. La maquinaria es una
sección de esa bitácora, no la bitácora entera.

> **Sobre las dos palabras** *(2026-09-23)*. Durante el desarrollo, a este documento se le
> llamó «parte» en la interfaz para distinguirlo de la bitácora por máquina. No funcionó: en
> la obra nadie lo llama así, y en el panel convivían «Bitácoras» en el menú y «parte» dentro
> de la pantalla. Desde ahora el documento nuevo es **la bitácora** a secas y al viejo se le
> dice **bitácora por máquina** (RF-90, RF-91).

Esta spec convierte la bitácora en lo que la obra necesita. Es el cambio más grande de esta
tanda: no añade campos, cambia de qué habla el documento.

## Usuarios / actores

- **Residente / director de obra** — llena la bitácora cada día, desde el panel web.
- **Gerencia** — la consulta para saber qué se hizo, con qué rendimiento y a qué costo de
  horas.
- **Personal de obra** — aparece registrado, con sus horas; no entra al sistema.

## Historias de usuario

- H1: Como residente quiero llevar una sola bitácora diaria de mi obra, para no llenar un
  documento por cada máquina y tener el día completo en un sitio.
  *(decía «parte diario» hasta el 2026-09-23; ver RF-90)*
- H2: Como residente quiero registrar quién trabajó y en qué horario, para saber las horas
  de cada persona y cuáles fueron extras.
- H3: Como residente quiero registrar las actividades con sus dimensiones y una fotografía,
  para dejar constancia de lo ejecutado y poder medir el avance.
- H4: Como residente quiero registrar el clima por franjas horarias, para justificar los
  tiempos muertos cuando llovió.
- H5: Como gerencia quiero consultar la bitácora de cualquier día y obra, para revisar sin
  tener que pedirlo por teléfono.
  *(decía «el parte» hasta el 2026-09-23; ver RF-90)*

## Requisitos funcionales (criterios de aceptación en EARS)

### La bitácora diaria (H1)

- RF-1: EL SISTEMA llevará una bitácora por obra y por día.
- RF-2: SI ya existe una bitácora viva de esa obra y ese día, ENTONCES EL SISTEMA no creará
  una segunda y abrirá la existente.
- RF-3: CUANDO el residente abra el módulo, EL SISTEMA mostrará la bitácora del día en curso
  de su obra, y permitirá desplazarse a días anteriores.
- RF-4: EL SISTEMA no permitirá abrir la bitácora de un día futuro.
- RF-5: CUANDO el residente guarde, EL SISTEMA conservará lo escrito aunque la bitácora esté
  incompleta, para poder llenarla a lo largo del día.
- RF-6: CUANDO el residente cierre la bitácora, EL SISTEMA la dejará como registro
  definitivo y no permitirá seguir editándola.
- RF-7: SI hay que corregir una bitácora cerrada, ENTONCES EL SISTEMA exigirá anularla con
  un motivo escrito y abrir otra, sin borrar la anulada.
- RF-8: SI se intenta cerrar una bitácora sin ninguna máquina, ninguna persona y ninguna
  actividad, ENTONCES EL SISTEMA lo rechazará indicando qué falta.
  > **Reemplazado por RF-50 a RF-55 el 2026-09-14.** OCC pidió que no se pueda cerrar sin
  > haber diligenciado todo el parte: bastaba una de las tres secciones, ahora hacen falta
  > las siete. El día sin trabajo, que RF-8 dejaba sin salida, la tiene en RF-53 y RF-54.

### El cierre exige la bitácora completa (cambio 2026-09-14)

- RF-50: SI se intenta cerrar una bitácora a la que le falta alguna de estas secciones
  —maquinaria, personal, actividades, clima, control calidad de obra, notas o fotografía del
  día—, ENTONCES EL SISTEMA lo rechazará nombrando todas las que faltan.
- RF-51: SI se intenta cerrar una bitácora con una máquina sin observaciones, ENTONCES EL
  SISTEMA lo rechazará nombrando esa máquina.
- RF-52: SI se intenta cerrar una bitácora en la que ninguna actividad tiene fotografía,
  ENTONCES EL SISTEMA lo rechazará indicando que falta la foto de al menos una actividad.
  > **Corregido el 2026-09-15.** La redacción del 14 exigía foto en cada actividad; OCC
  > aclaró que basta con una.
- RF-53: CUANDO el residente marque que ese día no se trabajó, EL SISTEMA exigirá que escriba
  el motivo.
- RF-54: MIENTRAS una bitácora esté marcada como día sin trabajo, EL SISTEMA permitirá
  cerrarla con solo el clima, las notas y la fotografía del día.
- RF-55: SI se marca como día sin trabajo una bitácora que ya tiene máquinas, personas o
  actividades registradas, ENTONCES EL SISTEMA lo rechazará indicando que un día con trabajo
  registrado se cierra completo.
- RF-56: EL SISTEMA no volverá a evaluar con estas exigencias las bitácoras cerradas antes de
  este cambio.

### Maquinaria (H1)

- RF-9: EL SISTEMA permitirá registrar varias máquinas en la bitácora, cada una con su
  lectura de medidor al iniciar y al terminar la jornada.
- RF-10: CUANDO se registren las dos lecturas de una máquina, EL SISTEMA calculará su avance
  del día en la unidad que corresponda a ese equipo: horas de motor en la maquinaria
  amarilla, kilómetros recorridos en camionetas y volquetas.
- RF-11: SI la lectura final es menor que la inicial, ENTONCES EL SISTEMA rechazará el
  registro de esa máquina.
- RF-12: SI el avance de una máquina supera lo posible en un día —24 horas de motor, u 800
  kilómetros—, ENTONCES EL SISTEMA rechazará el registro de esa máquina.
- RF-43: EL SISTEMA pedirá a cada máquina únicamente el medidor que le corresponde, y al
  cerrar actualizará ese mismo medidor del equipo.
- RF-13: CUANDO se cierre la bitácora, EL SISTEMA actualizará el medidor de cada máquina
  registrada, sin hacerlo retroceder nunca.
- RF-14: EL SISTEMA ofrecerá para elegir únicamente las máquinas de la obra de esa bitácora.
- RF-15: SI se intenta registrar dos veces la misma máquina en la misma bitácora, ENTONCES
  EL SISTEMA lo rechazará.
- RF-45: EL SISTEMA permitirá escribir, para cada máquina registrada en la bitácora, sus
  observaciones del día en un cuadro de texto de varias líneas. *(cambio 2026-09-14)*
- RF-46: EL SISTEMA mostrará las observaciones de cada máquina junto a ella al consultar una
  bitácora cerrada o anulada. *(cambio 2026-09-14)*

### Personal (H2)

- RF-16: EL SISTEMA permitirá registrar varias personas en la bitácora, cada una con su hora
  de entrada y su hora de salida.
- RF-17: CUANDO se registren las dos horas de una persona, EL SISTEMA calculará las horas
  trabajadas, descontando el descanso de almuerzo.
- RF-18: SI la hora de salida es igual a la de entrada, o la jornada resultante supera las
  16 horas seguidas, ENTONCES EL SISTEMA rechazará el registro de esa persona.
- RF-42: CUANDO la hora de salida sea anterior a la de entrada, EL SISTEMA entenderá que la
  jornada cruzó la medianoche y la contará entera.
- RF-19: SI se intenta registrar dos veces a la misma persona en la misma bitácora, ENTONCES
  EL SISTEMA lo rechazará.
- RF-20: EL SISTEMA mostrará el cargo de cada persona al elegirla, para distinguir entre
  nombres parecidos.
- RF-38: EL SISTEMA tomará como jornada ordinaria la de 7:30 a 12:00 y de 13:30 a 17:00, y
  contará como extra lo que la pase.
- RF-39: EL SISTEMA señalará cuántas de las horas trabajadas fueron nocturnas, entendiendo
  por nocturnas las trabajadas entre las 7:00 p.m. y las 6:00 a.m.
- RF-40: EL SISTEMA señalará si el día de la bitácora fue domingo o festivo, calculando los
  festivos de Colombia sin depender de una lista escrita a mano.
- RF-41: EL SISTEMA no convertirá esas horas a dinero.
- RF-44: EL SISTEMA dejará en blanco las horas de entrada y salida del personal y las de los
  tramos de clima, para que se escriban en vez de corregir un valor puesto de antemano.

### Actividades (H3)

- RF-21: EL SISTEMA permitirá registrar varias actividades, cada una elegida de una lista, y
  añadir tantas como haga falta.
  > **Precisado por RF-64 y RF-65 el 2026-09-16.** La lista deja de ser la propuesta de
  > prueba y pasa a ser el presupuesto de la obra.
- RF-22: CUANDO se elija una actividad, EL SISTEMA habilitará el registro de sus
  dimensiones: longitud, ancho, alto, área y volumen, cada una escrita a mano.
  > **Ampliado por RF-67 a RF-69 el 2026-09-16.** Las dimensiones se conservan y se añade la
  > cantidad —cuánto se hizo— en la unidad de la actividad.
- RF-23: EL SISTEMA permitirá adjuntar una fotografía a cada actividad.
  > **Ampliado por RF-47 y RF-48 el 2026-09-14.** Hoy la foto solo se ofrece después de
  > guardar la actividad, y en la práctica no se encuentra.
- RF-47: EL SISTEMA permitirá adjuntar la fotografía de una actividad mientras se está
  llenando, sin exigir que la actividad se haya guardado antes. *(cambio 2026-09-14)*
- RF-48: SI se adjunta la fotografía de una actividad que luego se descarta sin guardar,
  ENTONCES EL SISTEMA no la mostrará en la bitácora. *(cambio 2026-09-14)*
- RF-24: SI la actividad elegida no está en la lista, ENTONCES EL SISTEMA exigirá que se
  escriba cuál fue.
- RF-25: EL SISTEMA aceptará una actividad sin dimensiones, porque no todas se miden.
- RF-58: CUANDO una actividad tenga longitud y ancho, EL SISTEMA calculará su área
  multiplicando la longitud por el ancho. *(cambio 2026-09-15)*
- RF-59: CUANDO una actividad tenga longitud, ancho y alto, EL SISTEMA calculará su volumen
  multiplicando las tres medidas. *(cambio 2026-09-15)*
- RF-60: SI a una actividad le falta alguna de las medidas que hacen falta para calcular su
  área o su volumen, ENTONCES EL SISTEMA permitirá escribir ese valor a mano.
  *(cambio 2026-09-15)*

#### Actividades del presupuesto (cambio 2026-09-16)

- RF-64: EL SISTEMA ofrecerá como lista de actividades los ítems del presupuesto de obra
  (Anexo B), la misma para todas las obras, cada uno con su número de ítem de pago, su
  descripción y su unidad de medida, y sin repetir los que el presupuesto trae en varios
  capítulos o en varias vías.
- RF-65: EL SISTEMA mostrará cada actividad de la lista con su número de ítem delante de la
  descripción, y permitirá encontrarla escribiendo el número o palabras de la descripción.
  > **Reemplazado por RF-75 y RF-76 el 2026-09-17.** El número de ítem no se muestra ni se
  > busca: la actividad se reconoce por su descripción.
  > **Vuelve en RF-78 y RF-79 el 2026-09-22.**
- RF-66: CUANDO se elija una actividad de la lista, EL SISTEMA mostrará junto a ella su
  unidad de medida.
- RF-67: EL SISTEMA permitirá registrar, para cada actividad, la cantidad —cuánto se hizo
  de ella ese día— en la unidad de esa actividad, además de sus dimensiones.
- RF-68: CUANDO la unidad de la actividad sea m³ y tenga volumen, m² y tenga área, o m y
  tenga longitud, EL SISTEMA tomará ese valor como cantidad, igual que calcula el área y el
  volumen (RF-58, RF-59).
- RF-69: SI la unidad de la actividad es kg, Und o m³-km, o le falta la medida de la que se
  toma según RF-68, ENTONCES EL SISTEMA permitirá escribir la cantidad a mano.
- RF-70: CUANDO se elija «Otra actividad», EL SISTEMA exigirá escribir cuál fue (RF-24) y
  elegir su unidad de la lista de unidades del presupuesto —m³, m², m, kg, Und o m³-km—, y
  le pedirá los mismos datos que a una actividad de la lista.
- RF-71: EL SISTEMA mostrará las actividades registradas antes de este cambio con el nombre
  que tenían al guardarse, sin unidad ni cantidad, y sin alterar ningún parte existente.
- RF-74: EL SISTEMA aceptará una actividad sin cantidad, igual que la acepta sin
  dimensiones (RF-25).

#### La actividad se lee por su descripción (cambio 2026-09-17)

> **Retirados el 2026-09-22 (RF-75 a RF-77).** OCC pidió que vuelva el número de ítem: es como
> la obra habla del presupuesto. Los reemplazan RF-78, RF-79 y RF-81.

- ~~RF-75: EL SISTEMA mostrará cada actividad únicamente con su descripción, sin el número de
  ítem, tanto al elegirla de la lista como en la actividad ya registrada y en el parte.~~
  *(cambio 2026-09-17; retirado el 2026-09-22, reemplazado por RF-78)*
- ~~RF-76: EL SISTEMA permitirá encontrar una actividad escribiendo palabras de su
  descripción, y no por su número de ítem.~~ *(cambio 2026-09-17; retirado el 2026-09-22,
  reemplazado por RF-79)*
- ~~RF-77: EL SISTEMA conservará las actividades registradas antes de este cambio tal como se
  guardaron, y las mostrará también sin el número de ítem.~~ *(cambio 2026-09-17; retirado el
  2026-09-22, reemplazado por RF-81)*

#### Vuelve el número de ítem (cambio 2026-09-22)

- RF-78: EL SISTEMA mostrará cada actividad del presupuesto con su número de ítem delante de
  la descripción («4.1.8 · Excavación para estructuras…»), al elegirla de la lista, en la
  actividad ya registrada y en el parte cerrado o anulado. *(cambio 2026-09-22)*
- RF-79: EL SISTEMA permitirá encontrar una actividad escribiendo su número de ítem o
  palabras de su descripción. *(cambio 2026-09-22)*
- RF-80: EL SISTEMA ofrecerá «Otra actividad» como primera opción de la lista, antes de los
  ítems del presupuesto. *(cambio 2026-09-22)*
- RF-81: EL SISTEMA mostrará con su número de ítem también las actividades del presupuesto
  registradas antes de este cambio, y las anteriores al presupuesto (RF-71) con el nombre que
  tenían al guardarse, sin alterar ningún parte existente. *(cambio 2026-09-22)*
- RF-82: CUANDO se añada una actividad, EL SISTEMA la dejará sin actividad elegida, en vez
  de proponer una de antemano. *(cambio 2026-09-22)*
- RF-83: SI se guarda una actividad sin haber elegido cuál es, ENTONCES EL SISTEMA la
  rechazará diciendo que falta elegirla. *(cambio 2026-09-22)*

### Clima (H4)

- RF-26: EL SISTEMA permitirá registrar varias franjas de clima en el mismo día, cada una
  con su condición (soleado, parcialmente nublado, nublado o lloviendo) y su hora de inicio
  y de fin, de forma que entre todas puedan cubrir la jornada completa.
- RF-27: SI la hora de fin de una franja es anterior a su hora de inicio, ENTONCES EL
  SISTEMA la rechazará.
- RF-28: SI dos franjas del mismo día se solapan en el tiempo, ENTONCES EL SISTEMA lo
  rechazará indicando cuáles.

### Control Calidad de Obra, notas y fotografía (H3, H5)

> **Renombrada el 2026-09-14** (antes «Laboratorio»). RF-29 y RF-30 siguen en pie con el
> nombre nuevo.

- RF-29: EL SISTEMA permitirá registrar varios materiales consumidos del laboratorio, cada
  uno elegido de una lista y con la cantidad utilizada y su unidad.
  > **Reemplazado por RF-61 y RF-62 el 2026-09-16.** OCC envió los ítems: la sección registra
  > ensayos y controles practicados, no materiales consumidos.
- RF-30: SI se registra un elemento de laboratorio sin cantidad, ENTONCES EL SISTEMA lo
  rechazará.
  > **Obsoleto desde el 2026-09-16.** Un ensayo no lleva cantidad (RF-62).
- RF-61: EL SISTEMA permitirá registrar en Control Calidad de Obra varios ensayos o
  controles, cada uno elegido de la lista de ensayos de OCC (Anexo A) y con una observación o
  resultado escrito. *(cambio 2026-09-16)*
- RF-62: EL SISTEMA no pedirá cantidad ni unidad para un ensayo. *(cambio 2026-09-16)*
- RF-72: SI se registra un ensayo sin observación, ENTONCES EL SISTEMA lo rechazará
  indicando que, si no hay nada que anotar, se escriba «Sin observaciones».
  *(cambio 2026-09-16)*
- RF-73: EL SISTEMA permitirá registrar el mismo ensayo varias veces en la misma bitácora.
  *(cambio 2026-09-16)*
- RF-63: EL SISTEMA mostrará tal como se guardaron —material, cantidad y unidad— los
  elementos registrados en esta sección antes de este cambio, sin alterar ningún parte
  existente. *(cambio 2026-09-16)*
- RF-49: EL SISTEMA llamará «Control Calidad de Obra» a la sección que hasta ahora se llamaba
  Laboratorio, tanto en el parte como en su índice. *(cambio 2026-09-14)*
- RF-57: EL SISTEMA mostrará con el nombre nuevo lo ya registrado en esa sección, sin alterar
  ningún parte existente. *(cambio 2026-09-14)*
- RF-31: EL SISTEMA permitirá escribir notas u observaciones libres del día.
- RF-32: EL SISTEMA permitirá adjuntar una fotografía del día a la bitácora.
- RF-33: EL SISTEMA mostrará las fotografías de la bitácora solo a quien tenga acceso a esa
  obra, sin exponerlas públicamente.

#### Cuándo, quién y dónde de cada ensayo (cambio 2026-09-22)

- RF-84: EL SISTEMA pedirá, para cada ensayo, su hora de inicio y su hora de fin, elegidas con
  los desplegables de hora del panel (016/RF-30). *(cambio 2026-09-22)*
- RF-85: SI la hora de fin de un ensayo es igual o anterior a su hora de inicio, ENTONCES EL
  SISTEMA lo rechazará. *(cambio 2026-09-22)*
- RF-86: EL SISTEMA pedirá, para cada ensayo, el nombre del responsable, escrito a mano.
  *(cambio 2026-09-22)*
- RF-87: EL SISTEMA pedirá la ubicación de cada ensayo como el PR y los metros donde se hizo,
  elegidos de las mismas listas que el viaje de cantera (010/RF-12, RF-13), o, si no aplica
  un PR, como un lugar escrito a mano. *(cambio 2026-09-22)*
- RF-88: SI se registra un ensayo sin hora de inicio, sin hora de fin, sin responsable o sin
  ubicación, ENTONCES EL SISTEMA lo rechazará diciendo qué le falta. *(cambio 2026-09-22)*
- RF-89: EL SISTEMA conservará y mostrará tal como se guardaron los ensayos registrados antes
  de este cambio, sin exigirles hora, responsable ni ubicación, y sin impedir por eso guardar
  ni cerrar el parte que los tiene. *(cambio 2026-09-22)*

### Consulta (H5)

- RF-34: EL SISTEMA permitirá a la gerencia consultar la bitácora de cualquier obra y
  cualquier día.
- RF-35: EL SISTEMA permitirá al residente consultar únicamente las bitácoras de su obra.
- RF-36: EL SISTEMA conservará y mostrará como registro histórico de solo lectura las
  bitácoras por máquina registradas antes de este cambio.
  > **Estrechado por 006/RF-28 el 2026-09-11.** Se muestran únicamente las que estén
  > **cerradas**. Al planificar la spec 006 se miró la base: las seis que existen están
  > abiertas y son de la misma semana en que se probaba este formato, así que no son trabajo
  > registrado sino borradores a medias, y arrastrarlos al pie del parte nuevo todos los días
  > no conservaba nada. Lo que RF-36 promete —que el trabajo ya registrado no desaparezca—
  > sigue en pie: una bitácora cerrada se seguiría viendo. **Las filas no se borran.**
- RF-37: EL SISTEMA permitirá al residente anular una bitácora cerrada de su obra, a
  diferencia del preoperacional, cuya anulación es de la gerencia (001/RF-14).

### Cómo se llama y cómo se consultan varias obras *(cambio 2026-09-23)*

> **Este bloque no pide nada nuevo: arregla dos desviaciones.** La primera es de palabras —la
> spec dijo «bitácora» desde el principio y la interfaz acabó diciendo «parte»—. La segunda es
> un **defecto**: RF-34 prometía consultar la bitácora de *cualquier* obra y la pantalla solo
> deja ver una por día.

- RF-90: EL SISTEMA nombrará **«bitácora»** a este documento en toda la interfaz del módulo
  —título, descripción, botones, avisos, confirmaciones y mensajes de error— y no usará la
  palabra «parte» en ninguno de ellos. *(cambio 2026-09-23)*
- RF-91: EL SISTEMA nombrará **«bitácora por máquina»** al formato anterior, el de una por
  equipo y día que se conserva de solo lectura, allí donde se muestre o se mencione.
  *(cambio 2026-09-23, precisa RF-36)*
- RF-92: CUANDO la gerencia consulte un día en el que **varias obras** tengan bitácora, EL
  SISTEMA las mostrará todas y permitirá elegir cuál se está viendo, sin salir de ese día.
  *(cambio 2026-09-23, cumple RF-34, que no se cumplía)*
- RF-93: MIENTRAS se esté viendo una bitácora, EL SISTEMA dirá de qué obra es, incluso cuando
  ese día solo haya una. *(cambio 2026-09-23)*
- RF-94: SI la gerencia abre un día en el que **ninguna** obra tiene bitácora, ENTONCES EL
  SISTEMA seguirá pidiendo de qué obra es antes de abrirla, como hoy. *(cambio 2026-09-23)*
- RF-95: SI la gerencia abre un día en el que **algunas** obras ya tienen bitácora y otras no,
  ENTONCES EL SISTEMA dejará ver las que hay **y** abrir la de una obra que todavía no la
  tenga. *(cambio 2026-09-23)*
  > Hoy esto es imposible: en cuanto existe una bitácora ese día, el selector de obra
  > desaparece de la pantalla.
- RF-96: EL SISTEMA mostrará las bitácoras **anuladas** de ese día junto a las vivas, marcadas
  como anuladas, y no las esconderá detrás de una viva de otra obra. *(cambio 2026-09-23)*

## Superficies afectadas

- [x] **Móvil** — se retira la bitácora del celular; el jefe de obra pasa a llevarla en el
  panel. El operador no se ve afectado: nunca tuvo bitácora.
- [x] **Panel web** — el módulo de Bitácoras se rehace por completo.
- [x] **API** — las rutas de bitácora del panel se rehacen; se retira la de subida desde el
  celular.
- [x] **Sincronización** — la bitácora deja de viajar en la cola de subida del celular.
- [x] **Datos** — la bitácora pasa de estar ligada a un vehículo a estarlo a una obra, con
  sus secciones; migración en las dos bases.
- [x] **Reglas** — se conservan las de horas de máquina y lecturas; se añaden las de horario
  de personal y franjas de clima.

Cambio 2026-09-14: **Panel web** (observaciones por máquina, foto de actividad sin guardar
antes, marca de día sin trabajo, nombre de la sección); **API** (guardar esos datos, cierre
más exigente); **Datos** (las observaciones de cada máquina y la marca de día sin trabajo con
su motivo); **Reglas** (lo que impide cerrar, con sus casos nuevos en el guion de
verificación). **Móvil** y **Sincronización**: sin impacto.

Cambio 2026-09-16: **Panel web** (lista de actividades con número de ítem y unidad, cantidad
y observación obligatoria en cada ensayo de Control Calidad de Obra); **API** (guardar esos
datos y seguir leyendo los de antes); **Datos** (unidad y cantidad en cada
actividad; ensayo y observación en Control Calidad de Obra, conviviendo con los materiales ya
registrados); **Reglas** (de qué medida sale la cantidad de una actividad, con sus casos). **Móvil**
y **Sincronización**: sin impacto.

Cambio 2026-09-17: **Panel web** (la actividad se muestra y se busca solo por su
descripción). **API**, **Datos**, **Reglas**, **Móvil** y **Sincronización**: sin impacto —
no cambia lo que se guarda, solo lo que se lee en pantalla.

Cambio 2026-09-22: **Panel web** (el número de ítem vuelve a la lista, a la fila y al parte;
«Otra actividad» primero; la actividad nueva arranca sin elegir; cada ensayo con horas en
desplegables, responsable y PR + metros o lugar); **API** (guardar esos datos del ensayo y
rechazar la actividad sin elegir); **Datos** (horas, responsable y ubicación en cada ensayo,
conviviendo con los ensayos ya guardados sin ellos); **Reglas** (qué le falta a un ensayo, con
sus casos en el guion). **Móvil** y **Sincronización**: sin impacto.

## Requisitos no funcionales

- Guardar no puede perder lo escrito si el residente cierra el navegador: el parte se llena
  a lo largo del día, no de una sentada.
- Las fotografías se guardan en el almacén privado que ya usa el sistema para las firmas y
  fotos de preoperacional, y se sirven con el mismo control de acceso.
- La bitácora es evidencia del trabajo ejecutado: nada se borra, se anula con motivo.

## Casos límite

- **Sin señal**: no aplica. La bitácora pasa a ser exclusivamente del panel web, que
  siempre tiene red. Esta decisión es deliberada: llevar siete secciones con fotografías
  funcionando sin conexión cuesta varias veces más que la versión web, y quien la llena
  —el residente— trabaja con computador.
- **Evidencia firmada**: una bitácora cerrada no se edita (RF-7). Las bitácoras por máquina
  anteriores se conservan intactas (RF-36).
- **Primer arranque**: una obra sin nada registrado muestra la bitácora del día vacía y
  lista para llenar, no un error.
- Un día en que **no se trabajó** (domingo, paro por lluvia): debe poder cerrarse dejando
  constancia de por qué. RF-8 exige al menos una máquina, una persona o una actividad, así
  que este caso necesita una salida explícita.
- **Dos personas llenando** la misma bitácora a la vez desde dos computadores.
- Una máquina que trabajó en **dos obras** el mismo día.
- Una persona que trabajó **cruzando la medianoche**.
- Una máquina cuyo medidor ya avanzó por un preoperacional del mismo día: RF-13 nunca lo
  hace retroceder.
- *(cambio 2026-09-14)* Un parte **cerrado antes del cambio** con secciones vacías: sigue
  cerrado y válido (RF-56). Las exigencias nuevas rigen para lo que se cierre de aquí en
  adelante.
- *(cambio 2026-09-14)* Un día en que **se trabajó la mañana y llovió la tarde**: no es día
  sin trabajo; se cierra completo y la lluvia queda en las franjas de clima (RF-55).
- *(cambio 2026-09-14)* Una foto de actividad **elegida y abandonada** sin guardar: no
  aparece en el parte (RF-48). No se borra del almacén: nada se borra.
- *(cambio 2026-09-16)* Un parte **abierto** que ya tiene actividades o materiales de las
  listas de prueba: lo guardado se sigue viendo como se guardó (RF-63, RF-71); lo que se
  añada desde ahora usa las listas nuevas.
- *(cambio 2026-09-16)* Una actividad de **m³ con longitud y ancho pero sin alto**: no hay
  volumen calculado, así que la cantidad se escribe a mano (RF-69).
- *(cambio 2026-09-16)* **Otra actividad en m³** con sus tres medidas: la cantidad sale del
  volumen, como en una actividad de la lista (RF-68, RF-70).
- *(cambio 2026-09-16)* **Dos densidades en campo** el mismo día, de lotes distintos: dos
  filas del mismo ensayo, cada una con su observación (RF-73).
- *(cambio 2026-09-16)* El presupuesto escribe la misma unidad de dos formas («m3-Km» y
  «m3-km»): es una sola unidad, m³-km.
- *(cambio 2026-09-16)* Una misma actividad aparece en el presupuesto bajo varios capítulos
  (la 4.1.8 en alcantarillas y en cunetas) y en las dos vías: sale una sola vez (RF-64).
- *(cambio 2026-09-17)* **Dos excavaciones que solo se distinguen al final de la frase**
  («con entibado» / «sin entibado»): sin el número delante, lo que las separa es la
  descripción completa, que se muestra entera (RF-75).
- *(cambio 2026-09-17)* Quien conoce el presupuesto y **escribe «4.1.8» en el buscador**: no
  encuentra nada; busca por palabras de la descripción (RF-76).
  **Deja de valer el 2026-09-22:** «4.1.8» la encuentra (RF-79).
- *(cambio 2026-09-22)* Escribir **«4.1.9»** encuentra la 4.1.9 y también la 4.1.96, porque
  empieza igual. Las dos se distinguen a simple vista por su descripción, que va al lado.
- *(cambio 2026-09-22)* Se pulsa «Añadir actividad» y se guarda **sin elegir nada**: se rechaza
  diciendo que falta elegir la actividad (RF-83). Nada se guarda a medias.
- *(cambio 2026-09-22)* Un ensayo **en la vía, a la altura de un PR**: se eligen el PR y los
  metros. Uno **en la planta o en el laboratorio**: se escribe el lugar (RF-87).
- *(cambio 2026-09-22)* Un ensayo que **pasa la medianoche**: no se admite (RF-85); se
  registra en dos filas, una por día.
- *(cambio 2026-09-22)* Un parte **abierto** que ya tiene ensayos guardados sin horas ni
  responsable: se siguen viendo y guardando así, y el parte se cierra igual (RF-89); los que
  se añadan desde ahora los piden.

Cambio 2026-09-23: **Panel web** — la palabra «bitácora» en toda la interfaz del módulo
(RF-90, RF-91) y el selector de obra cuando el día tiene varias (RF-92 a RF-96). **API** — solo
los **textos** de sus mensajes de rechazo, que el panel muestra tal cual y hoy dicen «parte»
(RF-90); ninguna ruta, forma ni código de estado cambia. **Reglas** — el texto de
`bloqueosDelCierre`, por lo mismo, y su caso en el guion de verificación. **Datos**, **Móvil**
y **Sincronización**: sin impacto.

> **Corregido el 2026-09-23, al planificar.** Este párrafo decía «**API** … sin impacto» y era
> falso: hay 15 mensajes del servidor que la persona lee y nombran el documento. Lo que no
> cambia es el contrato —rutas, forma de las respuestas, códigos—, no los textos.

El `GET` de un día ya devuelve las bitácoras de todas las obras del alcance de la sesión,
ordenadas por obra; lo que falla es que la pantalla se queda con la primera y tira el resto.

## Fuera de alcance

- Llenar la bitácora desde el celular. Se retira en esta iteración y se retomará, si hace
  falta, en una spec posterior y con el modelo de datos ya asentado.
- Migrar las bitácoras por máquina ya registradas al formato nuevo: se conservan como
  histórico de solo lectura (RF-36).
- Informes, exportación a hoja de cálculo o PDF, y firmas sobre la bitácora.
- *(cambio 2026-09-23)* **Renombrar tablas, columnas o archivos de código.** `partes_de_obra`
  se queda como está: hay filas escritas apuntándole y renombrar una tabla no cambia nada de
  lo que ve OCC. Lo que cambia es la interfaz.
- *(cambio 2026-09-23)* **Anular una bitácora abierta sin cerrarla antes.** El servidor ya lo
  permite y la pantalla lo esconde; se miró al preparar este cambio y Diego lo dejó fuera.
  Sigue siendo un defecto conocido, sin spec.
- *(cambio 2026-09-23)* Cambiar quién figura como responsable («Lo lleva …») de una bitácora
  ya abierta.
- *(cambio 2026-09-23)* Un listado de bitácoras de varios días. Se sigue consultando un día a
  la vez, avanzando y retrocediendo.
- ~~**Calcular solos el área y el volumen**~~ — **entra en alcance el 2026-09-15** (RF-58
  a RF-60). OCC decidió que se multiplica lo que se escribe, en la unidad en que se escriba.
- El tope de **42 horas semanales**: esta bitácora clasifica el día, no la semana.
- Cálculo de nómina o de costos a partir de las horas del personal.
- Comparar lo ejecutado contra lo programado, y cualquier medida de avance de obra.
- Que las horas del personal alimenten otro módulo.
- *(cambio 2026-09-14)* Reevaluar o reabrir los partes cerrados antes del cambio (RF-56).
- ~~*(cambio 2026-09-14)* Cambiar los ítems de Control Calidad de Obra~~ — **entra en alcance
  el 2026-09-16** (RF-61 a RF-63): OCC envió la lista.
- *(cambio 2026-09-16)* Los rubros del presupuesto que no son trabajo de obra: planes de
  manejo ambiental y de tránsito, caracterización vial, primas de garantías y actualización
  de precios.
- *(cambio 2026-09-16)* Cargar o editar el presupuesto desde el panel: la lista se actualiza
  desde el documento de OCC.
- *(cambio 2026-09-16)* Comparar la cantidad de una actividad contra la cantidad del presupuesto, y
  el precio de cada ítem.
- *(cambio 2026-09-16)* Registrar los valores de un ensayo como datos (resultados numéricos,
  norma, lote) o decidir si cumple lo exigido: la observación es texto.
- *(cambio 2026-09-17)* Cruzar el parte con el presupuesto por número de ítem: el número
  deja de verse y de buscarse (RF-75, RF-76).
  **Sigue fuera el 2026-09-22**, aunque el número vuelva a verse (RF-78): verlo no es cruzarlo.
- *(cambio 2026-09-22)* Elegir el responsable de un ensayo de la lista de personas del
  sistema: se escribe a mano (RF-86).
- *(cambio 2026-09-22)* Completar las horas, el responsable o la ubicación de los ensayos ya
  guardados (RF-89).

- *(cambio 2026-09-23)* **Un día con dos obras con bitácora**: gerencia las ve las dos y elige
  cuál mira; ninguna queda escondida detrás de la otra (RF-92).
- *(cambio 2026-09-23)* **Un día con una obra con bitácora y otra sin ella**: se ve la que hay
  y se puede abrir la que falta (RF-95).
- *(cambio 2026-09-23)* **Un día con una bitácora anulada y otra viva de otra obra**: se ven
  las dos, la anulada marcada como tal (RF-96). Hoy la viva tapa a la anulada.
- *(cambio 2026-09-23)* **Un residente**: sigue viendo solo la de su obra, sin selector
  (RF-35). El cambio es de gerencia; a él no le cambia nada salvo las palabras.

## Criterios de finalización

- Cada RF con su comprobación: las reglas de cálculo y rechazo (RF-10 a RF-12, RF-17,
  RF-18, RF-27, RF-28) como casos en el guion de verificación; el resto, como paso de demo
  manual.
- Las migraciones existen en las dos bases y las bitácoras anteriores siguen consultándose.
- Demo manual: llenar la bitácora de un día completo con dos máquinas, tres personas, dos
  actividades con fotografía, tres franjas de clima, un ensayo de control de calidad con su
  observación *(cambio 2026-09-16; antes «un elemento de laboratorio»)* —con sus horas,
  su responsable y su PR y metros *(cambio 2026-09-22)*—, una nota y
  la foto del día; cerrarlo; comprobar que el medidor de las máquinas avanzó; anularlo con
  motivo y abrir otro para el mismo día.

## Dudas abiertas

Resueltas el 2026-09-09:

- **Anular una bitácora cerrada** es del residente (RF-37). No sigue la regla del
  preoperacional porque la bitácora la llena él mismo cada día.
- **Jornada y extras**: la ordinaria es de 7:30 a 12:00 y de 13:30 a 17:00 —ocho horas—, y
  lo que la pase es extra (RF-38). Se marcan además las nocturnas y los domingos y festivos
  (RF-39, RF-40), pero no se convierte nada a dinero (RF-41): eso es una nómina.
- **Laboratorio**: es el material consumido, no el ensayo practicado (RF-29). La lista de
  materiales queda **pendiente de validación por OCC**, igual que la de actividades.
- **Área y volumen**: se escriben a mano por ahora. Calcularlos exige saber qué unidad usa
  cada actividad, y esa decisión está pendiente.
- **Clima**: las franjas deben poder cubrir la jornada completa (RF-26), sin solaparse
  (RF-28).
- **Casos límite**: se implementan como están descritos arriba.

Resueltas el 2026-09-14 (entrevista de los Req2 a Req5):

- **Observaciones de maquinaria**: una por máquina, no una para toda la sección (RF-45).
- **Día sin trabajo**: se marca «no se trabajó» con motivo, y entonces solo se exigen clima,
  notas y fotografía del día (RF-53, RF-54). Cierra la duda que dejaba RF-8.
- **Cierre**: exige las siete secciones llenas (RF-50).

Resueltas el 2026-09-15:

- **Control Calidad de Obra** cambia de nombre y también de ítems. Los ítems los enviará OCC;
  mientras tanto se hace solo el cambio de nombre (RF-49).
- **Foto para cerrar**: basta con que una actividad la tenga (RF-52, corregido).
- **Dimensiones**: siguen siendo opcionales (RF-25), pero el área y el volumen se calculan
  multiplicando, y se escriben a mano solo cuando falta alguna medida (RF-58 a RF-60). Con
  esto se cierra también la duda de la unidad de medida de cada actividad.

Resueltas el 2026-09-16 (Diego, con los documentos de OCC):

- **Ítems de Control Calidad de Obra**: los 17 ensayos de la guía de OCC (Anexo A). Se anota
  el ensayo y una observación, sin cantidad (RF-61, RF-62). Deja sin efecto la resolución del
  2026-09-09 que definía la sección como material consumido.
- **Actividades**: los ítems del presupuesto de obra, con número de ítem y unidad (Anexo B,
  RF-64 a RF-66). Se conservan las dimensiones y se añade la cantidad: cuánto se hizo, en la
  unidad de la actividad. Con m³, m² y m sale sola del volumen, el área o la longitud; con kg,
  Und y m³-km (acero, señales, transporte), que las medidas no dan, se escribe a mano (RF-67
  a RF-69). «Otra actividad» se conserva (RF-24, RF-70).
- **Un presupuesto para todas las obras** (RF-64).
- **Observación del ensayo obligatoria**; si no hay nada, «Sin observaciones» (RF-72).
- **El mismo ensayo puede repetirse** el mismo día (RF-73).
- **La cantidad no es obligatoria**, como las dimensiones (RF-74). Diego avisa que puede
  cambiar más adelante según lo que pida OCC.
- **Otra actividad** lleva cuál fue, su unidad elegida de la lista de unidades del
  presupuesto y los mismos datos que las demás (RF-70).

Resueltas el 2026-09-17 (Diego, petición de gerencia):

- **El número de ítem no se muestra**: la actividad se lee por su descripción, en la lista y
  en el parte (RF-75). Tampoco se busca por él (RF-76). Las 31 descripciones del presupuesto
  son distintas entre sí, así que ninguna queda sin forma de reconocerse.

Resueltas el 2026-09-22 (Diego, requerimientos 3 y 7 de OCC):

- **Vuelve el número de ítem**, en la lista, en la fila y en el parte, y se busca por él
  (RF-78, RF-79). Revierte el cambio del 2026-09-17.
- **«Otra actividad» va primero** (RF-80), y la actividad nueva **arranca sin elegir** (RF-82).
- **Cada ensayo lleva hora de inicio y de fin, responsable escrito, y PR + metros o lugar**
  (RF-84 a RF-88). Obligatorios en los nuevos; los guardados siguen valiendo (RF-89).

Siguen abiertas: ninguna.

## Anexo A — Ensayos de Control Calidad de Obra *(2026-09-16)*

Fuente: guía «Tabla práctica de ensayos y controles — material tratado con cemento» de OCC,
primera tabla, columna «Ensayo / Control». Se incluyen en este orden:

1. Granulometría
2. Límite líquido
3. Índice de plasticidad
4. Equivalente de arena
5. Azul de metileno
6. Materia orgánica
7. Proctor / compactación
8. CBR sin cemento
9. Sulfatos solubles
10. Contenido de cemento
11. Muestreo para resistencia
12. Moldeo de probetas
13. Compresión simple
14. Densidad en campo
15. Compactación
16. Espesor
17. Planicidad

## Anexo B — Actividades del presupuesto *(2026-09-16)*

Fuente: presupuesto de obra de OCC (Formulario 1, propuesta económica): columna «Ítem de
pago», «Descripción» y «Und.». Las descripciones de abajo están **resumidas**; en la lista se
usa la descripción completa del presupuesto.

> **Desde el 2026-09-17** el número de ítem se queda en esta tabla y en el documento de OCC:
> sirve para saber de dónde sale cada actividad, pero no se muestra en el panel (RF-75).
> **Desde el 2026-09-22 vuelve a mostrarse** delante de la descripción (RF-78).

| Ítem | Actividad | Unidad |
| --- | --- | --- |
| 2.8 | Demolición de estructuras (concreto reforzado) | m³ |
| 2.14.1 | Retiro de tubería existente de 36", sin excavación | m |
| 4.1.1 | Excavación en material común de la explanación, canales y préstamos | m³ |
| 4.1.2 | Excavación manual en material común | m³ |
| 4.1.8 | Excavación para estructuras varias en material común en seco, con entibado | m³ |
| 4.1.9 | Excavación para estructuras varias en material común en seco, sin entibado | m³ |
| 4.1.96 | Excavación en material común de la explanación con motoniveladora | m³ |
| 4.2.2 | Lleno manual compactado con material proveniente de la excavación | m³ |
| 4.3.8 | Disposición de material para conformación de la calzada | m³ |
| 5.1.2 | Afirmado para bacheo | m³ |
| 5.1.7 | Subbase granular para cimentación de tubería y lleno de zanjas | m³ |
| 5.1.15 | Suministro de sub-base granular, medido suelto | m³ |
| 5.2.13 | Estabilización con material tratado con cal | m³ |
| 5.2.16 | Estabilización con material tratado con cemento | m³ |
| 6.1.18.1 | Concreto Clase F (14 MPa). Solados de E=0.05 m | m² |
| 6.2.4 | Concreto Clase E (17.5 MPa). Elementos varios | m³ |
| 6.2.24 | Concreto Clase C (28 MPa) para muros, disipadores, aletas y estribos | m³ |
| 6.2.50 | Concreto Clase C (28 MPa). Cunetas | m³ |
| 7.1.1 | Emulsión asfáltica C.R.L. para imprimación | m² |
| 7.1.12.2 | Tratamiento superficial doble con emulsión CRR-2M | m² |
| 8.1 | Mantenimiento de obras de drenaje existentes | m |
| 8.13.1 | Dren francés de zanja de 0.4 m × 0.9 m | m |
| 8.18 | Disipadores de energía y sedimentador en concreto ciclópeo | m³ |
| 8.27 | Tubería PVC alcantarillado de 900 mm (36") | m |
| 10.1 | Acero de refuerzo fy=420 MPa (Grado 60) | kg |
| 12.1 | Pintura acrílica reflectorizada para línea de demarcación | m |
| 12.9 | Señal vertical de 75 × 75 cm doble | Und |
| 13.1 | Transporte de afirmado, sub-base, base y mezcla asfáltica a más de 1000 m | m³-km |
| 13.2 | Transporte de sobrantes de excavación, canales y préstamos a más de 1000 m | m³-km |
| 13.9 | Transporte de materiales pétreos a más de 1000 m, medido en planta | m³-km |
| 14.3 | Bordillo barrera recto 15 × 35 × 80 prefabricado | m |

> **Corregido el 2026-09-16 (T21).** La tabla se escribió con 30 filas y le faltaba la 14.3,
> aunque el texto ya decía 31. La importación del presupuesto la encontró.
