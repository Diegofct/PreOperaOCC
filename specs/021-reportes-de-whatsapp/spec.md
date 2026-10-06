# Spec 021 — Reportes de WhatsApp

> Estado: **Cumplida** (2026-10-06) · Aprobada (2026-10-05) · Fecha: 2026-10-02 · Cambio: 2026-10-05 (el reporte diario con plantilla
> llena todas las secciones de la bitácora, RF-60 a RF-95; todas las dudas resueltas; el conductor de
> cada viaje sale del operador de su volqueta, RF-94 y RF-95; con la bitácora cerrada se
> aprueban solo los viajes, RF-96 a RF-98) · Cambio: 2026-10-05 (la cantidad escrita de una
> actividad gana al cálculo, en toda la bitácora, RF-99 a RF-103; reemplaza 004/RF-68)

## Contexto y objetivo

Lo que pasa en la obra se cuenta primero en los grupos de WhatsApp. El tecnólogo manda cada
noche el reporte de actividades con abscisas, cantidades, ítems de pago y viajes por volqueta.
El laboratorio avisa de densidades, humedades y resistencias. La SISO reporta cierres viales y
novedades, y la residente ambiental los incumplimientos del PMA. Todo llega con fotos. Después,
alguien vuelve a teclear eso a mano en la bitácora y en Control Cantera, o no lo teclea y se
pierde.

Fuera de este sistema ya se captura todo lo que se escribe en los grupos autorizados de la
obra, y una IA lo lee y propone qué registro debería crearse, con sus datos extraídos. Se
probó con los mensajes reales del grupo de Puerto Berrío (Consorcio Magdalena): acierta en la
clasificación y en las cifras, y además señala lo que no cuadra.

Esta spec lleva esas propuestas al panel como una **bandeja de reportes de WhatsApp**. La IA
**propone** y una persona **aprueba**: nada de lo que dice la IA entra en la bitácora ni en los
módulos sin que el residente lo revise, lo corrija si hace falta y lo apruebe. Así la bitácora
sigue siendo evidencia firmada por una persona, y deja de depender de que alguien transcriba
el chat.

*(cambio 2026-10-05)* OCC va a repartir en la obra una **plantilla del reporte diario** para
que quien el residente designe, o el propio residente, la mande por el grupo cada día. La
plantilla sigue las secciones de la bitácora: clima, actividades con sus ítems, vehículos y
maquinaria con su operador, sus medidores y sus observaciones, personal con sus horas, viajes
de cantera, control calidad de obra y notas. **El propósito del reporte es llenar la
bitácora del día completa**, no solo sus actividades, y llevar los viajes a Control Cantera,
que ya se ven en la bitácora (010/RF-26). La plantilla la mantiene OCC fuera del sistema; la
IA la lee aunque se escriba con variaciones, y lo que no entienda queda para que el residente
lo complete.

## Usuarios / actores

- **Residente / director de obra** (panel web, rol `supervisor`): revisa la bandeja de su
  obra, corrige las propuestas, elige las fotos que pasan como evidencia, y aprueba o descarta
  cada propuesta.
- **Gerencia** (panel web, rol `admin`): todo lo anterior en cualquier obra. Además asocia
  cada grupo de WhatsApp a una obra.
- **Integración de WhatsApp** (sistema externo, sin persona detrás): entrega al sistema cada
  mensaje capturado, con la propuesta de la IA y sus fotos o documentos.
- **Personas del grupo** (tecnólogo, laboratorio, SISO, ambiental, etc.): escriben en
  WhatsApp. No entran al sistema por esta vía y pueden no estar registradas en él. El
  reporte diario lo manda quien el residente designe, o él mismo; el sistema no lleva la
  lista de designados: cualquier mensaje del grupo llega a la bandeja y decide el residente.
  *(cambio 2026-10-05)*
- **Operador** (móvil): no interviene. Nada de esto cambia la app del celular.
- **Laboratorista y encargado de planta**: no ven la bandeja. Lo aprobado les aparece en sus
  módulos como cualquier otro registro. Los viajes de un reporte los aprueba el residente
  desde la bandeja, sin pasar por el encargado de planta (RF-84). *(cambio 2026-10-05)*

## Historias de usuario

- H1: Como gerencia quiero asociar cada grupo de WhatsApp a su obra, para que sus reportes
  lleguen a la bandeja de esa obra y no a otra.
- H2: Como residente quiero ver en una bandeja lo que se reportó por WhatsApp en mi obra, con
  lo que la IA entendió y las fotos, para no tener que releer el chat.
- H3: Como residente quiero corregir y completar una propuesta antes de aprobarla, para que lo
  que entra en la bitácora sea exacto aunque la IA haya dejado huecos.
- H4: Como residente quiero que al aprobar se cree el registro en la bitácora del día o en
  Control Cantera, para no teclear dos veces lo que ya se reportó.
- H5: Como residente quiero elegir qué fotos del reporte quedan como evidencia, para no llenar
  la bitácora con veinte fotos casi iguales.
- H6: Como residente quiero descartar con un motivo lo que no sirve, para que la bandeja quede
  limpia y quede constancia de por qué no se registró.
- H7: Como residente quiero que el reporte diario mandado con la plantilla llene todas las
  secciones de la bitácora —clima, actividades, maquinaria, personal, control calidad, notas
  y fotografía—, para solo revisar, completar lo que falte y cerrarla. *(cambio 2026-10-05)*
- H8: Como gerencia quiero saber qué operador manejó cada máquina cada día, para poder
  consultarlo después por máquina y por periodo. *(cambio 2026-10-05)*

## Requisitos funcionales (criterios de aceptación en EARS)

### Recepción desde la integración

- RF-1: EL SISTEMA recibirá de la integración de WhatsApp cada mensaje capturado con su grupo,
  su autor, su fecha y hora, su texto, sus fotos o documentos y la propuesta de la IA.
- RF-2: EL SISTEMA aceptará entregas de la integración únicamente con una credencial propia de
  la integración, distinta de la sesión del panel y del token del celular.
- RF-3: SI una entrega llega sin esa credencial o con una credencial inválida, ENTONCES EL
  SISTEMA la rechazará sin guardar nada.
- RF-4: SI llega dos veces el mismo mensaje, ENTONCES EL SISTEMA conservará uno solo.
- RF-5: CUANDO llegue de nuevo un mensaje ya recibido con una propuesta distinta de la IA,
  EL SISTEMA reemplazará la propuesta únicamente si ese mensaje sigue pendiente.
- RF-6: SI el mensaje que llega de nuevo ya fue aprobado o descartado, ENTONCES EL SISTEMA
  conservará la decisión y la propuesta tal como estaban.
- RF-7: EL SISTEMA guardará las fotos y documentos recibidos en el almacén privado de imágenes,
  sin exponerlos públicamente.

### Grupos y obras (H1)

- RF-8: EL SISTEMA permitirá asociar cada grupo de WhatsApp recibido a una obra.
- RF-9: EL SISTEMA permitirá asociar o cambiar la obra de un grupo únicamente a la gerencia.
- RF-10: EL SISTEMA mostrará a la gerencia los grupos que han enviado mensajes y todavía no
  tienen obra.
- RF-11: MIENTRAS un grupo no tenga obra, EL SISTEMA guardará sus mensajes sin mostrarlos en
  ninguna bandeja.
- RF-12: CUANDO la gerencia asocie un grupo a una obra, EL SISTEMA mostrará en la bandeja de
  esa obra los mensajes pendientes que el grupo ya había enviado.
- RF-13: SI la gerencia cambia la obra de un grupo, ENTONCES EL SISTEMA moverá a la nueva obra
  solo los mensajes todavía pendientes.

### La bandeja (H2)

- RF-14: EL SISTEMA mostrará al residente la bandeja de su obra, y a la gerencia la de
  cualquier obra.
- RF-15: EL SISTEMA no mostrará la bandeja al operador, al laboratorista, al almacenista ni al
  encargado de planta.
- RF-16: EL SISTEMA listará las propuestas pendientes de la más antigua a la más reciente.
- RF-17: EL SISTEMA mostrará en cada propuesta el texto original del mensaje, su autor, su
  fecha y hora, y lo que propone la IA.
- RF-18: EL SISTEMA mostrará en cada propuesta la categoría que le dio la IA: reporte de
  actividades, inicio de actividades, laboratorio, vehículo o maquinaria, suministro o
  cantera, incidente, administrativo o seguimiento.
- RF-19: EL SISTEMA mostrará en cada propuesta el motivo de revisión que dejó la IA cuando lo
  haya.
- RF-20: CUANDO la IA indique que un mensaje complementa a otro, EL SISTEMA mostrará ese
  mensaje dentro de la propuesta a la que complementa, en vez de como propuesta aparte.
- RF-21: EL SISTEMA mostrará al autor con el nombre y cargo con que está registrado en el
  sistema cuando se le pueda identificar.
- RF-22: SI el autor no está registrado en el sistema, ENTONCES EL SISTEMA lo mostrará con su
  nombre de WhatsApp.
- RF-23: EL SISTEMA no mostrará en la bandeja los mensajes que la IA marcó como «ignorar».
- RF-24: EL SISTEMA permitirá consultar con un filtro los mensajes marcados como «ignorar»,
  así como los ya aprobados y los descartados.
- RF-25: EL SISTEMA permitirá devolver a la bandeja, como pendiente, un mensaje marcado como
  «ignorar».

### Corregir antes de aprobar (H3)

- RF-26: MIENTRAS una propuesta esté pendiente, EL SISTEMA permitirá corregir y completar
  cualquiera de sus datos.
- RF-27: EL SISTEMA conservará, junto a la propuesta corregida, lo que la IA había propuesto
  originalmente.
- RF-28: EL SISTEMA no permitirá corregir una propuesta ya aprobada o descartada.
- RF-29: SI dos personas corrigen o deciden la misma propuesta a la vez, ENTONCES EL SISTEMA
  aceptará solo la primera decisión y avisará a la segunda que la propuesta ya cambió.

### Aprobar: qué se crea y dónde (H4)

- RF-30: CUANDO se apruebe un reporte de actividades, EL SISTEMA añadirá sus actividades a la
  bitácora del día del hecho, en su obra.
- RF-31: CUANDO una actividad aprobada traiga varios ítems de pago, EL SISTEMA añadirá una
  actividad de la bitácora por cada ítem, con su cantidad.
- RF-32: CUANDO el número de ítem de la propuesta exista en el presupuesto de la obra, EL
  SISTEMA usará esa actividad del presupuesto.
- RF-33: SI el número de ítem no existe en el presupuesto de la obra, ENTONCES EL SISTEMA
  exigirá elegir otra actividad o usar «Otra actividad» antes de aprobar.
- RF-34: EL SISTEMA llevará a cada actividad de la bitácora las abscisas, la longitud, el ancho
  y el espesor que traiga la propuesta.
- RF-35: CUANDO se apruebe una propuesta de laboratorio, EL SISTEMA añadirá sus ensayos a la
  sección de control de calidad de la bitácora del día del hecho.
- RF-36: SI el ensayo de la propuesta no corresponde a ninguno de la lista de ensayos de OCC,
  ENTONCES EL SISTEMA exigirá elegir uno de la lista antes de aprobar.
- RF-37: EL SISTEMA escribirá como observación de cada ensayo aprobado su resultado, su
  unidad, las abscisas y si cumple, según la propuesta corregida.
- RF-38: CUANDO se apruebe un incidente, una novedad de vehículo o maquinaria, un inicio de
  actividades o un asunto administrativo, EL SISTEMA lo añadirá a las notas de la bitácora del
  día del hecho.
  > *(cambio 2026-10-05)* Vale para los mensajes sueltos. La novedad de una máquina que viene
  > dentro del reporte diario va a las observaciones de esa máquina (RF-72).
- RF-39: CUANDO se aprueben viajes de volqueta, EL SISTEMA los registrará en Control Cantera
  de la obra, uno por viaje.
  > *(cambio 2026-10-05)* Resueltas las dudas 1, 2 y 3: ver RF-82 a RF-87.
- RF-40: SI no existe bitácora de ese día y esa obra, ENTONCES EL SISTEMA la abrirá al aprobar.
- RF-41: SI la bitácora del día del hecho está cerrada, ENTONCES EL SISTEMA no permitirá
  aprobar lo que va a la bitácora y explicará que está cerrada.
- RF-42: CUANDO la bitácora del día del hecho esté cerrada, EL SISTEMA indicará que para
  incluir la propuesta hay que anular esa bitácora con motivo y abrir otra.
- RF-43: SI la bitácora del día del hecho está cerrada, ENTONCES EL SISTEMA permitirá igual
  aprobar los viajes que van a Control Cantera.
- RF-96: MIENTRAS la bitácora del día del hecho esté cerrada, EL SISTEMA permitirá aprobar
  solo los viajes del reporte. *(cambio 2026-10-05, precisa RF-43 frente a RF-64)*
- RF-97: CUANDO se aprueben solo los viajes de un reporte, EL SISTEMA dejará el reporte
  pendiente en la bandeja con sus viajes marcados como ya registrados.
- RF-98: CUANDO se apruebe el resto de un reporte cuyos viajes ya se registraron, EL SISTEMA no
  volverá a registrar esos viajes.
- RF-44: SI el día del hecho es posterior a hoy, ENTONCES EL SISTEMA rechazará la aprobación.
- RF-45: MIENTRAS el módulo Control Cantera esté apagado en la obra, EL SISTEMA no permitirá
  aprobar viajes hacia él y lo indicará.
- RF-46: EL SISTEMA guardará en cada registro creado desde la bandeja quién lo aprobó, cuándo,
  y de qué mensaje de WhatsApp proviene.
- RF-47: EL SISTEMA mostrará en la bitácora y en Control Cantera que un registro proviene de un
  reporte de WhatsApp.
- RF-48: EL SISTEMA tratará lo creado desde la bandeja igual que lo registrado a mano: se
  corrige en la bitácora mientras esté abierta y, una vez cerrada, solo se anula con motivo.
- RF-49: SI se aprueba una propuesta de categoría «seguimiento», ENTONCES EL SISTEMA la marcará
  como revisada sin crear ningún registro.
  > *(cambio 2026-10-05, duda 5)* Los mensajes de «seguimiento» («¿Reporte de hoy?») se tratan
  > como «ignorar»: no aparecen en la bandeja (RF-90) y se consultan con el filtro (RF-24).
  > Este RF aplica solo al que se devuelva a la bandeja (RF-25).

### Fotos (H5)

- RF-50: CUANDO se apruebe una propuesta con fotos, EL SISTEMA permitirá elegir, para cada
  actividad creada, cuál de sus fotos queda como fotografía de la actividad.
- RF-51: CUANDO se apruebe una propuesta con fotos, EL SISTEMA permitirá elegir una de ellas
  como fotografía del día si la bitácora aún no tiene una.
- RF-52: EL SISTEMA conservará todas las fotos y documentos de la propuesta, elegidos o no,
  visibles desde la propuesta aprobada.
- RF-53: EL SISTEMA mostrará las fotos y documentos de la bandeja solo a quien tenga acceso a
  la bandeja de esa obra.

### Descartar (H6)

- RF-54: EL SISTEMA permitirá descartar una propuesta pendiente con un motivo escrito.
- RF-55: SI se intenta descartar sin motivo, ENTONCES EL SISTEMA lo rechazará.
- RF-56: EL SISTEMA conservará las propuestas descartadas con su motivo, quién las descartó y
  cuándo.

### Reglas transversales

- RF-57: EL SISTEMA no creará ningún registro de bitácora ni de Control Cantera a partir de un
  mensaje de WhatsApp sin la aprobación de una persona.
- RF-58: EL SISTEMA no borrará ningún mensaje, propuesta, foto ni decisión recibidos o tomados
  en la bandeja.
- RF-59: EL SISTEMA aplicará a lo aprobado las mismas validaciones que aplica a ese registro
  cuando se crea a mano.

### El reporte diario con plantilla (H7, H8) *(cambio 2026-10-05)*

- RF-90: EL SISTEMA tratará los mensajes de categoría «seguimiento» como los marcados
  «ignorar»: no los mostrará en la bandeja. *(duda 5)*
- RF-60: CUANDO la IA reconozca un reporte diario, EL SISTEMA lo mostrará en la bandeja como
  una sola propuesta, organizada por las secciones de la bitácora.
- RF-61: EL SISTEMA tomará como día del hecho la fecha escrita en el encabezado del reporte.
- RF-62: SI el reporte no trae fecha, ENTONCES EL SISTEMA propondrá como día del hecho el del
  mensaje y lo señalará para que el residente lo confirme.
- RF-63: CUANDO se apruebe un reporte diario, EL SISTEMA llevará cada una de sus secciones a la
  sección de la bitácora que le corresponde, en una sola aprobación.
- RF-64: SI alguna parte del reporte no pasa las validaciones de la bitácora o de Control
  Cantera, ENTONCES EL SISTEMA no aprobará nada del reporte y señalará cada parte que falla.
- RF-65: EL SISTEMA aceptará la abscisa escrita como «K» o como «ABS K» y la tratará como PR:
  K1+170 es PR 1 + 170.

#### Clima

- RF-66: CUANDO se apruebe un reporte diario, EL SISTEMA llevará cada franja de clima a la
  sección de clima de la bitácora, con su condición, su hora de inicio y su hora de fin.
- RF-67: SI la condición escrita no es ninguna de las de la bitácora (soleado, parcialmente
  nublado, nublado o lloviendo), ENTONCES EL SISTEMA exigirá elegir una antes de aprobar.

#### Vehículos y maquinaria

- RF-68: CUANDO se apruebe un reporte diario, EL SISTEMA añadirá a la maquinaria de la
  bitácora cada vehículo o máquina del reporte que traiga lecturas de medidor.
- RF-69: EL SISTEMA no añadirá a la bitácora los vehículos o máquinas que el reporte nombre sin
  lecturas, porque ese día no trabajaron.
- RF-70: EL SISTEMA reconocerá cada vehículo o máquina del reporte por su placa o su código
  entre los equipos de la obra.
- RF-71: SI un vehículo o máquina del reporte no se reconoce entre los equipos de la obra,
  ENTONCES EL SISTEMA exigirá elegirlo de la lista antes de aprobar.
- RF-72: EL SISTEMA llevará la observación de cada vehículo o máquina del reporte a las
  observaciones de esa máquina en la bitácora.
- RF-73: EL SISTEMA permitirá registrar en la bitácora el operador de cada máquina, elegido
  entre las personas registradas.
- RF-74: CUANDO el reporte traiga el operador de una máquina, EL SISTEMA lo llevará al operador
  de esa máquina en la bitácora.
- RF-75: SI el operador del reporte no se reconoce entre las personas registradas, ENTONCES EL
  SISTEMA exigirá elegirlo de la lista o dejarlo vacío antes de aprobar.
- RF-76: EL SISTEMA mostrará el operador de cada máquina al consultar una bitácora, también
  cuando esté cerrada o anulada.
- RF-77: EL SISTEMA conservará sin operador las máquinas de las bitácoras registradas antes de
  este cambio.
- RF-91: EL SISTEMA permitirá cerrar una bitácora con máquinas sin operador. *(duda 6)*

#### Personal

- RF-78: CUANDO se apruebe un reporte diario, EL SISTEMA añadirá al personal de la bitácora
  cada persona del reporte con su hora de entrada y su hora de salida.
- RF-79: SI una persona del reporte no se reconoce entre las personas registradas, ENTONCES EL
  SISTEMA exigirá elegirla de la lista antes de aprobar o quitarla del reporte.
- RF-80: CUANDO el reporte traiga una observación de una persona, EL SISTEMA la llevará a las
  observaciones de esa persona en la bitácora (016/RF-26).

#### Control calidad de obra

- RF-81: EL SISTEMA llevará a cada ensayo del reporte su hora de inicio y de fin, su
  responsable, su ubicación como PR y metros o como lugar, y su observación.

#### Viajes de cantera

- RF-82: EL SISTEMA tomará cada renglón de la sección de viajes del reporte como un viaje, con
  su volqueta, su material, su origen, su destino y su hora.
- RF-83: SI a un viaje le falta la hora, el material, el origen o el destino, ENTONCES EL
  SISTEMA exigirá completarlo antes de aprobar.
- RF-84: EL SISTEMA permitirá al residente de la obra aprobar los viajes de un reporte desde la
  bandeja, como excepción a 010/RF-32.
- RF-85: EL SISTEMA seguirá sin permitir al residente registrar viajes a mano en Control
  Cantera.
- RF-86: SI los metros de llegada de un viaje no son múltiplo de 25, ENTONCES EL SISTEMA
  exigirá elegirlos de la lista de 010/RF-13 antes de aprobar.
- RF-94: EL SISTEMA tomará como conductor de cada viaje del reporte el operador que el mismo
  reporte trae para esa volqueta en la sección de vehículos. *(cambio 2026-10-05, 010/RF-34)*
- RF-95: SI la volqueta de un viaje no trae operador en el reporte, ENTONCES EL SISTEMA exigirá
  elegir el conductor antes de aprobar.
- RF-87: CUANDO un mensaje suelto informe viajes agregados («TFO420 – 4 viajes»), EL SISTEMA
  propondrá un viaje por cada uno, y exigirá completar los datos que falten (RF-83).

#### La cantidad de una actividad *(cambio 2026-10-05)*

> Al probar la aprobación (tarea T16) se vio que la bitácora **calcula** la cantidad de una
> actividad en m³, m² o m con sus medidas (004/RF-68) y reemplaza la del reporte: «suministro de
> sub-base, medido suelto, 312 m³» quedó en 240 m³ (150 × 6,4 × 0,25). Lo que se cobra no siempre
> es el volumen geométrico de la capa —el material medido suelto ocupa más—, y lo sabe quien
> reporta. OCC decidió que la cantidad escrita mande, **en toda la bitácora** y no solo en lo que
> viene de WhatsApp: así lo aprobado se puede editar luego en el formulario sin recalcularse solo.

- RF-99: CUANDO una actividad tenga una cantidad escrita, EL SISTEMA guardará esa cantidad
  aunque sus medidas permitan calcularla.
- RF-100: MIENTRAS una actividad no tenga cantidad escrita, EL SISTEMA tomará como cantidad su
  volumen si la unidad es m³, su área si es m², o su longitud si es m, cuando los tenga.
- RF-101: EL SISTEMA permitirá escribir la cantidad de cualquier actividad, y mostrará junto a
  ella la cantidad calculada con sus medidas cuando se pueda calcular.
- RF-102: CUANDO se apruebe un reporte de WhatsApp, EL SISTEMA llevará a cada actividad la
  cantidad de su ítem de pago que trae el reporte («Total actividad»).
- RF-103: EL SISTEMA conservará sin cambios la cantidad de las actividades ya guardadas en
  bitácoras cerradas o anuladas.

#### Dos reportes del mismo día

- RF-88: CUANDO se apruebe un reporte de un día cuya bitácora abierta ya tiene una persona o
  una máquina del reporte, EL SISTEMA reemplazará los datos de esa persona o esa máquina por
  los del reporte aprobado.
- RF-89: MIENTRAS haya en la bitácora del día del hecho datos de un reporte ya aprobado, EL
  SISTEMA avisará en la propuesta qué personas, máquinas y franjas de clima va a reemplazar
  antes de aprobarla.
- RF-92: CUANDO se apruebe un reporte que trae clima para un día cuya bitácora abierta ya
  tiene franjas de clima, EL SISTEMA reemplazará todas esas franjas por las del reporte.
  *(duda 7)*
- RF-93: CUANDO se apruebe un reporte de un día cuya bitácora abierta ya tiene actividades,
  ensayos o notas, EL SISTEMA añadirá los del reporte a los que ya hay, sin reemplazarlos.
  *(duda 7)*

## Superficies afectadas

- [ ] **Móvil**: sin cambios.
- [x] **Panel web** *(cambio 2026-10-05)*: en la bitácora, la cantidad de una actividad se puede
  escribir siempre y la calculada se muestra al lado (RF-101).
- [x] **Panel web**: la bandeja de reportes de WhatsApp de la obra (lista, detalle, corrección,
  aprobación con elección de fotos, descarte, filtros); la asociación grupo → obra para
  gerencia; la marca «desde WhatsApp» en la bitácora y en Control Cantera. *(cambio
  2026-10-05)* La propuesta del reporte diario por secciones de la bitácora, y el operador de
  cada máquina en la bitácora: se elige al llenarla a mano y se ve al consultarla.
- [x] **API**: una entrada nueva para la integración de WhatsApp, con credencial propia
  (RF-2). Las acciones de la bandeja van por la guardia del panel.
- [ ] **Sincronización**: sin cambios. Nada de esto viaja al celular.
- [x] **Datos**: grupos de WhatsApp y su obra; mensajes, propuestas, correcciones y decisiones;
  fotos y documentos en el almacén privado; referencia al origen en los registros creados.
  *(cambio 2026-10-05)* El operador de cada máquina de la bitácora. Todo en el servidor.
- [x] **Reglas**: qué categoría va a qué destino, la validación de una propuesta antes de
  aprobarla y el bloqueo por bitácora cerrada. *(cambio 2026-10-05)* K = PR, metros de
  llegada de 25 en 25, qué se reemplaza con un segundo reporte del mismo día, y el permiso del
  residente para aprobar viajes solo desde la bandeja. Cada una con su caso en
  `verificar-reglas.ts`.

## Requisitos no funcionales

- Interfaz y mensajes en español.
- Un reporte diario con 25 fotos se debe poder revisar y aprobar sin salir de la propuesta.
- Ninguna foto ni documento de WhatsApp es accesible por una dirección pública.

## Casos límite

- **Sin señal**: no aplica al operador, que no interviene. Si el servidor no está disponible
  cuando la integración entrega un mensaje, la integración reintenta, y la entrega repetida no
  duplica nada (RF-4).
- **Evidencia firmada**: lo que va a una bitácora cerrada no se aprueba (RF-41) y se indica el
  camino de anular y abrir otra (RF-42). Lo ya aprobado se rige por las reglas de la bitácora y
  de Control Cantera (RF-48). Una propuesta aprobada o descartada no se vuelve a editar (RF-28).
- **Primer arranque**: sin grupos asociados, ninguna bandeja muestra nada y la gerencia ve los
  grupos pendientes de asociar (RF-10, RF-11).

Además:

- **Fotos que llegan antes que su texto.** Es común mandar varias fotos y enseguida el mensaje
  que las explica. La IA las liga al mensaje explicativo y la bandeja las muestra juntas (RF-20).
- **Reporte que se refiere a otro día.** El destino es el día del hecho, no el día del mensaje
  (RF-30).
- **Autor que no está registrado**, como personal de laboratorio externo: se muestra con su
  nombre de WhatsApp (RF-22).
- **Cifras que no cuadran** (m³ transportados frente a m³ cobrados): la IA lo deja en el motivo
  de revisión (RF-19) y decide el residente.
- **Actividad en tramos no continuos**: la IA propone una actividad por tramo, y el residente
  corrige si hace falta (RF-26).
- **Dos personas sobre la misma propuesta**: solo cuenta la primera decisión (RF-29).
- **Mensaje reenviado por la integración con una propuesta mejorada** (tras ajustar la IA):
  solo reemplaza si sigue pendiente (RF-5, RF-6).
- *(cambio 2026-10-05)* **Cantidad escrita distinta de la calculada** («312 m³ medido suelto»
  con medidas que dan 240): se guarda la escrita (RF-99), y el formulario muestra la calculada al
  lado para que se note la diferencia (RF-101). Sin cantidad escrita, se calcula (RF-100).
- **Bitácora abierta guardada antes de este cambio** cuya cantidad salió del cálculo: al volver a
  guardarla, si su cantidad coincide con la calculada se sigue tratando como calculada; solo se
  fija si alguien la escribe distinta.
- *(cambio 2026-10-05)* **Reporte con la plantilla escrita a medias o con variaciones**
  («Volqueta:» con o sin dos puntos, horas «9am» o «9:00 am»): la IA lo interpreta, y lo que no
  entienda queda vacío para que el residente lo complete (RF-26, RF-64).
- **Vehículos listados sin lecturas**: no trabajaron ese día y no entran a la bitácora (RF-69).
- **Una misma persona operando varias máquinas el mismo día**: es válido; el operador se
  guarda por máquina (RF-73).
- **Segundo reporte del mismo día o corrección del primero**: reemplaza a las personas,
  máquinas y franjas de clima que trae, suma actividades, ensayos y notas, y avisa antes de
  aprobar (RF-88, RF-89, RF-92, RF-93). Una actividad que salga repetida la quita el residente
  en la bitácora mientras esté abierta.
- **Reporte diario cuando la bitácora del día ya está cerrada**: no se aprueba lo que va a la
  bitácora (RF-41), pero sí los viajes (RF-43).

## Fuera de alcance

- Escribir o responder en WhatsApp desde el sistema.
- Que la IA cree registros sin aprobación humana, aunque tenga confianza alta.
- Llevar ensayos al módulo de Laboratorio de la spec 018 (granulometría). Los ensayos de
  WhatsApp van a la sección de control de calidad de la bitácora.
- Crear novedades en el módulo de Vehículos o abrir un módulo de incidentes: van a las notas de
  la bitácora.
- Notas de voz, videos y su transcripción: se guardan y se ven, pero la IA no los analiza.
- Mensajes privados (fuera de grupos) y grupos no autorizados, como el de pagos: la
  integración no los envía.
- Configurar desde el panel qué grupos se capturan, el prompt de la IA o la integración misma.
- Registrar a las personas del grupo que no existen en el sistema.
- Cualquier cambio en la app del celular.
- *(cambio 2026-10-05)* Mantener o validar la plantilla del reporte: la reparte y la cambia
  OCC fuera del sistema.
- Llevar en el sistema la lista de quiénes están designados para reportar.
- Marcar desde WhatsApp que un día no se trabajó: lo sigue marcando el residente en la
  bitácora (004/RF-53).
- Cerrar la bitácora al aprobar el reporte: la cierra el residente, como hoy.
- Exigir el operador de cada máquina para cerrar la bitácora (RF-91): se puede volver
  obligatorio en un cambio posterior, cuando la plantilla esté en uso.
- Informes y consultas de varios días (quién operó una máquina en un mes, actividades de una
  semana, horas extra de una persona en el mes): van en una spec posterior de reportes.
- Cambiar la barra de navegación del panel a un menú lateral: va en su propia spec.

## Criterios de finalización

- Cada RF tiene cómo comprobarse: un caso en `scripts/verificar-reglas.ts` para las reglas de
  destino, validación y bloqueo, y un paso de demo manual para el resto.
- `npm run verificar`, `npm run typecheck` y `npm run lint` en verde.
- Demo manual del flujo principal:
  1. Gerencia asocia el grupo de Puerto Berrío a Consorcio Magdalena.
  2. Aparecen en la bandeja los reportes ya capturados.
  3. El residente abre el reporte diario del 1-oct, corrige un dato y elige una foto por
     actividad.
  4. Aprueba, y las actividades aparecen en la bitácora del 1-oct marcadas «desde WhatsApp».
  5. Aprueba un resultado de laboratorio y aparece en control de calidad.
  6. Descarta un mensaje con motivo.
  7. Intenta aprobar algo de un día con la bitácora cerrada y el sistema lo bloquea con la
     explicación.
  8. *(cambio 2026-10-05)* Llega un reporte diario escrito con la plantilla. El residente
     completa una persona que la IA no reconoció, aprueba, y la bitácora queda con clima,
     actividades, maquinaria con operador y observaciones, personal con horas, control
     calidad y notas; los viajes aparecen en Control Cantera y en la sección de viajes de la
     bitácora. Solo falta la fotografía del día para poder cerrarla.
  9. Llega un segundo reporte del mismo día con otra hora de salida para una persona: la
     propuesta avisa que la reemplaza, y al aprobar queda la hora nueva.

## Dudas abiertas

Resueltas el 2026-10-05:

1. ~~¿Quién aprueba los viajes?~~ El residente, desde la bandeja, como excepción a 010/RF-32
   (RF-84, RF-85).
2. ~~Viajes agregados sin hora ni origen~~ La plantilla trae un renglón por viaje con su hora,
   material, origen y destino (RF-82); lo agregado se divide y se completa (RF-83, RF-87).
3. ~~Metros de llegada de 25 en 25~~ La plantilla trae PR y metros de llegada por viaje; si no
   son múltiplo de 25, el residente los elige (RF-86).
4. ~~¿K = PR?~~ Sí, son la misma referencia (RF-65).

5. ~~Mensajes de «seguimiento»~~ Se tratan como «ignorar» (RF-90).
6. ~~¿Operador obligatorio?~~ Opcional por ahora (RF-91).
7. ~~Segundo reporte del mismo día~~ El clima se reemplaza (RF-92); actividades, ensayos y
   notas se suman (RF-93).

No quedan dudas abiertas.
