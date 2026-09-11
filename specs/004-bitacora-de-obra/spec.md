# Spec 004 — Bitácora de obra

> Estado: En curso · Fecha: 2026-09-09

## Contexto y objetivo

Hoy la bitácora del sistema registra una sola cosa: cuántas horas trabajó una máquina. Es
una bitácora por equipo y por día, y sirve para el control de la maquinaria.

Pero lo que el residente lleva de verdad cada tarde es el **parte diario de la obra**: qué
máquinas trabajaron y cuánto, quién estuvo y desde qué hora hasta cuál, qué actividades se
ejecutaron y con qué dimensiones, qué clima hizo y en qué franjas, qué se usó del
laboratorio, qué hay que dejar anotado, y la fotografía del día. La maquinaria es una
sección de ese parte, no el parte entero.

Esta spec convierte la bitácora en lo que la obra necesita. Es el cambio más grande de esta
tanda: no añade campos, cambia de qué habla el documento.

## Usuarios / actores

- **Residente / director de obra** — llena la bitácora cada día, desde el panel web.
- **Gerencia** — la consulta para saber qué se hizo, con qué rendimiento y a qué costo de
  horas.
- **Personal de obra** — aparece registrado, con sus horas; no entra al sistema.

## Historias de usuario

- H1: Como residente quiero llevar un solo parte diario de mi obra, para no llenar un
  documento por cada máquina y tener el día completo en un sitio.
- H2: Como residente quiero registrar quién trabajó y en qué horario, para saber las horas
  de cada persona y cuáles fueron extras.
- H3: Como residente quiero registrar las actividades con sus dimensiones y una fotografía,
  para dejar constancia de lo ejecutado y poder medir el avance.
- H4: Como residente quiero registrar el clima por franjas horarias, para justificar los
  tiempos muertos cuando llovió.
- H5: Como gerencia quiero consultar el parte de cualquier día y obra, para revisar sin
  tener que pedirlo por teléfono.

## Requisitos funcionales (criterios de aceptación en EARS)

### El parte diario (H1)

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
- RF-22: CUANDO se elija una actividad, EL SISTEMA habilitará el registro de sus
  dimensiones: longitud, ancho, alto, área y volumen, cada una escrita a mano.
- RF-23: EL SISTEMA permitirá adjuntar una fotografía a cada actividad.
- RF-24: SI la actividad elegida no está en la lista, ENTONCES EL SISTEMA exigirá que se
  escriba cuál fue.
- RF-25: EL SISTEMA aceptará una actividad sin dimensiones, porque no todas se miden.

### Clima (H4)

- RF-26: EL SISTEMA permitirá registrar varias franjas de clima en el mismo día, cada una
  con su condición (soleado, parcialmente nublado, nublado o lloviendo) y su hora de inicio
  y de fin, de forma que entre todas puedan cubrir la jornada completa.
- RF-27: SI la hora de fin de una franja es anterior a su hora de inicio, ENTONCES EL
  SISTEMA la rechazará.
- RF-28: SI dos franjas del mismo día se solapan en el tiempo, ENTONCES EL SISTEMA lo
  rechazará indicando cuáles.

### Laboratorio, notas y fotografía (H3, H5)

- RF-29: EL SISTEMA permitirá registrar varios materiales consumidos del laboratorio, cada
  uno elegido de una lista y con la cantidad utilizada y su unidad.
- RF-30: SI se registra un elemento de laboratorio sin cantidad, ENTONCES EL SISTEMA lo
  rechazará.
- RF-31: EL SISTEMA permitirá escribir notas u observaciones libres del día.
- RF-32: EL SISTEMA permitirá adjuntar una fotografía del día a la bitácora.
- RF-33: EL SISTEMA mostrará las fotografías de la bitácora solo a quien tenga acceso a esa
  obra, sin exponerlas públicamente.

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

## Fuera de alcance

- Llenar la bitácora desde el celular. Se retira en esta iteración y se retomará, si hace
  falta, en una spec posterior y con el modelo de datos ya asentado.
- Migrar las bitácoras por máquina ya registradas al formato nuevo: se conservan como
  histórico de solo lectura (RF-36).
- Informes, exportación a hoja de cálculo o PDF, y firmas sobre la bitácora.
- **Calcular solos el área y el volumen** a partir de longitud, ancho y alto. Se escriben a
  mano en esta iteración: falta definir qué unidad usa cada actividad, y sin eso el cálculo
  sería correcto unas veces y absurdo otras.
- El tope de **42 horas semanales**: esta bitácora clasifica el día, no la semana.
- Cálculo de nómina o de costos a partir de las horas del personal.
- Comparar lo ejecutado contra lo programado, y cualquier medida de avance de obra.
- Que las horas del personal alimenten otro módulo.

## Criterios de finalización

- Cada RF con su comprobación: las reglas de cálculo y rechazo (RF-10 a RF-12, RF-17,
  RF-18, RF-27, RF-28) como casos en el guion de verificación; el resto, como paso de demo
  manual.
- Las migraciones existen en las dos bases y las bitácoras anteriores siguen consultándose.
- Demo manual: llenar el parte de un día completo con dos máquinas, tres personas, dos
  actividades con fotografía, tres franjas de clima, un elemento de laboratorio, una nota y
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

Sigue abierta:

- [NECESITA ACLARACIÓN: la unidad de medida de cada actividad (m, m², m³, km). Es lo que
  falta para poder calcular solos el área y el volumen.]
- [NECESITA ACLARACIÓN: un día sin trabajo, ¿cómo se cierra la bitácora? (ver casos límite)]
