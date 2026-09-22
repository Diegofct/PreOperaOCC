# Spec 016 — Horario de obra y horas del personal

> Estado: Cumplida · Fecha: 2026-09-21

## Contexto y objetivo

El parte diario ya calcula, para cada persona, cuántas horas trabajó, cuántas fueron extra,
cuántas nocturnas y si el día fue domingo o festivo (spec 004, RF-17 y RF-38 a RF-41). Pero lo
hace contra **una sola jornada fija para todas las obras**: de 7:30 a 12:00 y de 13:30 a 17:00,
todos los días. En la realidad cada obra tiene su horario —una trabaja de 8:00 a 12:00 y de
2:00 a 6:00 de lunes a viernes y el sábado de 8:00 a 12:00, otra no trabaja los sábados—, así
que el sistema cuenta mal las horas extra en cuanto una obra no sigue esa jornada.

Esta spec le da a cada obra su horario y calcula las horas del personal contra él, separando
las extra diurnas de las nocturnas como las distingue la ley colombiana. Aprovecha para tres
mejoras del mismo parte que pidió OCC: unas **observaciones por persona**, las **horas elegidas
de un desplegable** en vez de escritas a mano, y dos **avisos legales** que hoy nadie ve (un
horario que pasa del máximo semanal y una persona con más de dos horas extra en el día).

Lo que **no** hace es calcular dinero: clasifica horas, y convertirlas a pesos sigue siendo
trabajo de nómina (spec 004, RF-41).

## Usuarios / actores

- **Gerencia** (panel web) — pone el horario de cada obra al registrarla y lo corrige cuando
  cambia. Es la única que puede hacerlo.
- **Residente / director de obra** (panel web) — llena la sección Personal del parte con las
  horas de entrada y salida de cada persona y sus observaciones, y ve el desglose de horas
  calculado con el horario de su obra. Ve el horario, pero no lo cambia.
- **Encargado de planta** (panel web) — elige horas del desplegable al registrar un viaje de
  cantera.
- **Operador** (móvil) — no interviene. Nada de esto cambia la app del celular.

## Historias de usuario

- H1: Como gerencia quiero escribir el horario de una obra al registrarla para que las horas
  extra de su gente se cuenten contra lo que de verdad se acordó en esa obra.
- H2: Como residente quiero ver, para cada persona del parte, sus horas ordinarias y sus extra
  diurnas y nocturnas para llevar el control de la obra sin sacar cuentas a mano.
- H3: Como residente quiero anotar observaciones de una persona (llegó tarde, salió a cita
  médica) para que el parte explique por qué sus horas son las que son.
- H4: Como quien llena el panel quiero elegir las horas de un desplegable para no teclear
  horas con formato equivocado.
- H5: Como gerencia quiero que el sistema me avise cuando un horario o una jornada pasan de lo
  que permite la ley para corregirlo a tiempo.
- H6: Como gerencia quiero que un parte cerrado siga diciendo las mismas horas extra aunque
  después cambie el horario de la obra, porque es evidencia.

## Requisitos funcionales (criterios de aceptación en EARS)

### El horario de la obra (H1)

- RF-1: EL SISTEMA guardará para cada obra un horario de lunes a viernes, compuesto por uno o
  dos tramos de trabajo con hora de inicio y de fin.
- RF-2: EL SISTEMA guardará para cada obra un horario de sábado, compuesto por uno o dos tramos,
  o marcado como «no se trabaja».
- RF-3: CUANDO la gerencia registre una obra, EL SISTEMA le pedirá su horario, propuesto de
  antemano como lunes a viernes de 7:30 a 12:00 y de 13:30 a 17:00, y sábado de 7:30 a 12:00.
- RF-4: CUANDO la gerencia corrija una obra, EL SISTEMA le permitirá cambiar su horario.
- RF-5: EL SISTEMA permitirá poner o cambiar el horario de una obra únicamente a la gerencia.
- RF-6: SI un tramo termina a la misma hora o antes de empezar, ENTONCES EL SISTEMA rechazará el
  horario y dirá qué tramo está mal.
- RF-7: SI los dos tramos de un mismo día se pisan, ENTONCES EL SISTEMA rechazará el horario y lo
  dirá.
- RF-8: EL SISTEMA considerará descanso, y no trabajo, el tiempo entre los dos tramos de un día.
- RF-9: EL SISTEMA dará a las obras registradas antes de esta spec el horario propuesto de RF-3.
- RF-10: MIENTRAS se vea el parte de una obra, EL SISTEMA mostrará en la sección Personal el
  horario de esa obra para ese día (o «no se trabaja», o «domingo o festivo»).

### Las horas de cada persona (H2)

- RF-11: EL SISTEMA tomará como horas programadas de un día de lunes a viernes las que suman los
  tramos de lunes a viernes de la obra.
- RF-12: EL SISTEMA tomará como horas programadas de un sábado las que suman los tramos de sábado
  de la obra, o cero si la obra no trabaja los sábados.
- RF-13: EL SISTEMA tomará como horas programadas de un domingo o festivo las de lunes a viernes
  de la obra.
- RF-14: EL SISTEMA descontará de las horas trabajadas de una persona el descanso entre tramos de
  ese día, solo por el tiempo que la persona estuvo presente durante ese descanso.
- RF-15: EL SISTEMA contará como horas ordinarias de una persona las trabajadas hasta completar
  las programadas de ese día.
- RF-16: EL SISTEMA contará como horas extra de una persona las trabajadas por encima de las
  programadas de ese día.
- RF-17: EL SISTEMA separará las horas extra de cada persona en extra diurnas y extra nocturnas,
  siendo nocturnas las que caen entre las 7:00 p.m. y las 6:00 a.m.
- RF-41: EL SISTEMA tomará como horas extra de una persona **las últimas** que trabajó en el
  día, para decidir cuáles son diurnas y cuáles nocturnas. Así, quien entra a las 4:00 a.m. y
  sale a la 1:00 p.m. hace extras diurnas aunque haya llegado de noche. *(Diego, 2026-09-21)*
- RF-18: EL SISTEMA señalará, además, cuántas de las horas ordinarias de cada persona fueron
  nocturnas.
- RF-19: EL SISTEMA señalará si el día del parte fue domingo o festivo, como hoy (004/RF-40).
- RF-20: EL SISTEMA mostrará, junto a cada persona del parte, sus horas trabajadas, ordinarias,
  extra diurnas, extra nocturnas y nocturnas ordinarias, en horas y minutos.
- RF-21: EL SISTEMA no convertirá ninguna de esas horas a dinero (004/RF-41 sigue en pie).
- RF-22: MIENTRAS un parte esté abierto, EL SISTEMA calculará las horas con el horario vigente de
  su obra.

### Partes cerrados (H6)

- RF-23: CUANDO se cierre un parte, EL SISTEMA guardará con él el horario de la obra con que se
  calcularon sus horas.
- RF-24: EL SISTEMA mostrará las horas de un parte cerrado o anulado calculadas con el horario
  guardado al cerrarlo, aunque el horario de la obra haya cambiado después.
- RF-25: EL SISTEMA mostrará las horas de los partes cerrados antes de esta spec con la jornada
  que regía entonces: 7:30 a 12:00 y 13:30 a 17:00, igual para todos los días.

### Observaciones por persona (H3)

- RF-26: EL SISTEMA permitirá escribir, para cada persona del parte, sus observaciones del día en
  un cuadro de texto de varias líneas.
- RF-27: EL SISTEMA permitirá cerrar el parte aunque una o todas las personas no tengan
  observaciones.
- RF-28: EL SISTEMA mostrará las observaciones de cada persona junto a ella al consultar un parte
  cerrado o anulado.
- RF-29: EL SISTEMA mostrará sin observaciones, y sin error, a las personas registradas en partes
  anteriores a esta spec.

### Horas en desplegables (H4)

- RF-30: EL SISTEMA ofrecerá cada hora del panel como dos desplegables, uno con la hora (00 a 23)
  y otro con los minutos (00, 15, 30 y 45).
- RF-31: EL SISTEMA aplicará RF-30 en la entrada y salida de cada persona del parte, en el inicio
  y fin de cada franja de clima, en la hora de un viaje de cantera y en los tramos del horario de
  la obra.
- RF-32: DONDE una spec posterior añada otra hora al panel, EL SISTEMA la ofrecerá con los mismos
  desplegables de RF-30.
- RF-33: SI una hora ya guardada no cae en un múltiplo de 15 minutos (por ejemplo, 7:10),
  ENTONCES EL SISTEMA la mostrará tal cual y la conservará mientras nadie la cambie.
- RF-34: EL SISTEMA dejará en blanco los desplegables de las horas de una persona o de una franja
  nuevas, como hoy (004/RF-44).

### Avisos legales (H5)

- RF-35: SI el horario de una obra suma más de 42 horas a la semana, ENTONCES EL SISTEMA lo avisará
  al registrarla o corregirla, diciendo cuántas horas suma.
- RF-36: SI una persona del parte suma más de 2 horas extra en el día, ENTONCES EL SISTEMA lo
  avisará junto a esa persona.
- RF-37: EL SISTEMA permitirá guardar la obra, guardar el parte y cerrarlo aunque haya avisos de
  RF-35 o RF-36.
- RF-38: EL SISTEMA mostrará los avisos con símbolo y texto, no solo con color.

### Reglas transversales

- RF-39: EL SISTEMA dejará de aplicar la jornada fija de 004/RF-38 a los partes abiertos, que
  pasan a regirse por RF-11 a RF-22.
- RF-40: EL SISTEMA seguirá rechazando una persona con salida igual a la entrada o con más de 16
  horas seguidas, y seguirá entendiendo una salida anterior a la entrada como jornada que cruzó
  la medianoche (004/RF-18 y RF-42).

## Superficies afectadas

- [ ] **Móvil** — sin cambios. El horario no baja al celular: el operador no ve el parte.
- [x] **Panel web** — ficha de la obra (alta y corrección) con su horario y el aviso de 42 h;
  sección Personal del parte (horario del día, desglose nuevo, observaciones, aviso de 2 h);
  desplegables de hora en Personal, Clima, viaje de cantera y horario de la obra.
- [x] **API** — alta y corrección de obras con horario; el parte recibe el horario con que se
  calcula; guardar personal con observaciones; cerrar el parte guarda el horario.
- [ ] **Sincronización** — sin impacto: nada de esto viaja al celular ni sale de él.
- [x] **Datos** — horario de la obra; horario congelado del parte cerrado; observaciones por
  persona. Solo en el servidor.
- [x] **Reglas** — el desglose de horas contra un horario, la suma semanal y los avisos. Casos
  nuevos en `verificar-reglas.ts`.

## Requisitos no funcionales

- Idioma: todo en español; las horas se muestran en formato de 24 h («07:30»), como hoy.
- El desglose de una persona se actualiza al elegir sus horas, sin guardar ni pedir nada al
  servidor.

## Casos límite

- **Sin señal**: no aplica. Todo ocurre en el panel web; el celular no cambia.
- **Evidencia firmada**: un parte cerrado o anulado no se recalcula con el horario nuevo de la obra
  (RF-23 a RF-25). Los partes cerrados antes de esta spec conservan la jornada de entonces.
- **Primer arranque / equipo recién activado**: no aplica al celular. Una obra recién registrada
  ya tiene horario desde que se crea (RF-3).

Y los del caso:

- **Obra que no trabaja sábados y alguien trabaja un sábado**: las horas programadas son cero
  (RF-12), así que todo lo trabajado ese sábado es extra.
- **Un sábado que además es festivo**: manda el festivo (RF-13): se toma la jornada de lunes a
  viernes y todo lleva la marca de dominical o festivo.
- **Horario de un solo tramo** (por ejemplo, 6:00 a 14:00 sin almuerzo): no hay descanso que
  descontar (RF-8, RF-14).
- **Persona que entra después del almuerzo**: no se le descuenta un descanso en el que no estuvo
  (RF-14).
- **Jornada que cruza la medianoche**: se cuenta entera y lo que cae después de las 7:00 p.m. o
  antes de las 6:00 a.m. es nocturno (RF-17, RF-18, RF-40).
- **La gerencia cambia el horario con un parte abierto**: el parte abierto se recalcula con el
  nuevo (RF-22); los cerrados no (RF-24).
- **Un tramo que cruzaría la medianoche**: no se admite en el horario de la obra (RF-6: su fin
  quedaría antes de su inicio). Un turno de noche programado queda fuera de esta spec; esas horas
  se registran en el parte y cuentan como extra nocturnas. *(Diego, 2026-09-21)*

## Fuera de alcance

- **Calcular dinero**, recargos en pesos o porcentajes, y liquidar nómina (004/RF-41).
- **El tope semanal por persona** (sumar las horas de una persona a lo largo de la semana). Solo
  se avisa por día (RF-36) y por el horario de la obra (RF-35).
- **Horarios distintos por persona o por cuadrilla** dentro de la misma obra.
- **Horario con fecha de vigencia** (historial de horarios). Se descartó con Diego el 2026-09-21
  a favor de congelar el horario al cerrar el parte.
- **Que el residente cambie el horario** de su obra. Solo gerencia (RF-5).
- **Turnos de noche programados** en el horario de la obra (un tramo que pase la medianoche).
- Recalcular los partes cerrados con el horario nuevo.
- Ocultar la sección de laboratorio según la obra (pendiente de OCC; va con la spec de módulos
  por obra si se confirma).
- Cualquier cambio en la app del celular.

## Criterios de finalización

- Casos en `scripts/verificar-reglas.ts` para: suma semanal del horario (44,5 h con el propuesto; 44 h con el del ejemplo);
  horas programadas por día (lunes, sábado con y sin trabajo, domingo, festivo); descanso
  descontado solo si la persona estuvo; extra diurna y nocturna; nocturnas ordinarias; aviso de
  más de 2 h extra; tramos inválidos y solapados; horas fuera de la rejilla de 15 minutos.
- `npm run verificar`, `npm run typecheck` y `npm run lint` en verde.
- Demo manual: como gerencia, registrar una obra de prueba con 8:00–12:00 / 14:00–18:00 de lunes a
  viernes y sábado 8:00–12:00 (sale el aviso de 44 h, y se guarda igual); ver que una obra
  existente tiene el horario propuesto. Como residente, en un parte abierto de un martes, una
  persona de 7:00 a 20:00 muestra 8 h ordinarias, extra diurnas y extra nocturnas separadas y el
  aviso de más de 2 h extra; escribirle una observación, guardar y verla. Elegir horas con los
  desplegables en Personal, Clima y un viaje de cantera. Cerrar un parte, cambiar el horario de
  su obra y comprobar que el parte cerrado sigue mostrando las mismas horas.

## Dudas abiertas

- Ninguna. Las dos que quedaron de la entrevista las resolvió Diego el 2026-09-21 aceptando las
  propuestas: las extra son las últimas horas trabajadas (RF-41) y los turnos de noche
  programados quedan fuera.

Decisiones de Diego del 2026-09-21 ya incorporadas: extras por cantidad sobre lo programado del
día; extra diurna y nocturna separadas; el horario se congela al cerrar el parte; domingo o
festivo con la jornada de lunes a viernes como referencia; horario propuesto L–V 7:30–12:00 /
13:30–17:00 y sábado 7:30–12:00, con el sábado marcable como «no se trabaja»; observaciones por
persona y opcionales; los avisos solo avisan; solo la gerencia pone el horario; desplegables de
15 minutos en todo el panel.
