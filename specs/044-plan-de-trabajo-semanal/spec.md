# Spec 044 — Plan de trabajo semanal

> Estado: **Cumplida** el 2026-11-12 (`validacion.md`, 107 RF en verde) · Aprobada por Diego el 2026-11-10, tras la clarificación (D16–D33) · Fecha: 2026-11-10 · Cuarta de la tanda 041–044 (depende de la 041 por los cargos y de la 043 por la planificación aprobada y el cumplimiento)

## Contexto y objetivo

La planificación aprobada (spec 043) dice qué se espera hacer cada mes, pero en obra se trabaja por semanas: cada viernes o lunes la Directora de Obra arma en un Excel su plan de trabajo de la semana —qué actividades, cuánto por día, con qué cuadrilla, qué equipo, qué personal, qué materiales y qué riesgos—. Ese Excel no conversa con nada: no sale de lo que falta por ejecutar, no se compara con lo que registran los partes, y trae errores de cuenta (reparte la meta entre cuatro días y la programa en cinco). Esta spec trae el plan semanal al sistema: la IA lo propone a partir de la planificación aprobada y de lo pendiente, o lo lee del Excel de la Directora; ella lo ajusta; quien corresponde lo aprueba; y desde entonces la meta de esa semana en el informe de cumplimiento es la del plan, no la estimada.

## Usuarios / actores

- **Director de Obra** (panel web): en sus obras propone, sube, ajusta y aprueba el plan semanal, y lo anula con motivo. Ve todos los valores.
- **Director de Proyectos** (panel web): lo mismo, en cualquier obra.
- **Gerencia** (panel web): lo mismo que el Director de Proyectos.
- **Residente** (panel web): en su obra propone, sube y ajusta el plan en borrador, solo en cantidades. No lo aprueba ni lo anula, y no ve ninguna cifra de plata.
- **Operador** (móvil): no cambia nada para él.
- **Almacenista, Encargado de Planta, Laboratorista, Encargado de OCC, Auxiliar Administrativa**: no tienen acceso al plan semanal.

## Historias de usuario

- H1: Como Directora de Obra quiero que el sistema me proponga el plan de la semana a partir de la planificación y de lo que falta, para no armarlo desde cero cada semana.
- H2: Como Directora de Obra quiero subir el Excel que ya uso y que el sistema lo lea, para no digitarlo otra vez.
- H3: Como Directora de Obra quiero ajustar metas, días, cuadrillas, equipo, personal, materiales y riesgos, porque soy quien conoce la obra.
- H4: Como Residente quiero dejar el plan armado en borrador, para que la Directora solo lo revise y lo apruebe.
- H5: Como Director de Proyectos quiero que el plan aprobado sea la meta de la semana en el informe de cumplimiento, para medir contra lo que de verdad se decidió.
- H6: Como Gerencia quiero que un plan aprobado no cambie sin dejar rastro, para confiar en el cumplimiento semanal.
- H7: Como Directora de Obra quiero descargar el plan en Excel, para entregarlo a la cuadrilla y a la gerencia.

## Requisitos funcionales (criterios de aceptación en EARS)

### Para qué semana y en qué obra (H1, H2)

- RF-1: EL SISTEMA organiza los planes semanales por obra y por semana de lunes a domingo.
- RF-2: EL SISTEMA permite armar el plan de la semana en curso y de hasta 4 semanas siguientes.
- RF-3: SI se pide armar el plan de una semana que ya terminó, ENTONCES EL SISTEMA lo rechaza explicando que solo se planean la semana en curso y las siguientes.
- RF-4: SI se pide armar el plan de una semana posterior a las 4 siguientes, ENTONCES EL SISTEMA lo rechaza explicando el límite.
- RF-5: SI la obra no tiene planificación aprobada vigente, ENTONCES EL SISTEMA rechaza proponer, subir o crear un plan semanal explicando que primero hay que aprobar la planificación.

### Qué tiene un plan (H3)

- RF-6: EL SISTEMA guarda en el plan las actividades de la semana con su frente de trabajo, su ítem, su unidad, su meta de la semana, su cuadrilla y su equipo principal.
- RF-7: EL SISTEMA guarda en el plan el personal requerido por cargo y por frente de trabajo.
- RF-8: EL SISTEMA guarda en el plan la maquinaria con su equipo, su cantidad, si es propia o externa, su frente de trabajo y su placa o referencia.
- RF-9: DONDE la maquinaria sea propia, EL SISTEMA permite escogerla entre los vehículos de la obra.
- RF-10: DONDE la maquinaria sea externa, EL SISTEMA permite describirla como texto.
- RF-11: EL SISTEMA guarda en el plan los materiales de la semana con su material, su cantidad de la semana, su unidad y su base de cálculo.
- RF-12: EL SISTEMA guarda en el plan el control de volquetas con sus conceptos, su cantidad de la semana, sus viajes y las volquetas requeridas, propias y externas.
- RF-13: EL SISTEMA guarda en el plan los supuestos como texto.
- RF-14: EL SISTEMA guarda en el plan los riesgos con su efecto en la meta y su mitigación.
- RF-15: EL SISTEMA guarda en el plan los requerimientos a gerencia como texto.
- RF-16: EL SISTEMA no calcula los materiales ni el control de volquetas: son renglones que se proponen y se ajustan.
- RF-91: EL SISTEMA trata el frente de trabajo del plan como un rótulo libre, distinto del frente del presupuesto.
- RF-97: EL SISTEMA permite en el plan actividades de tipo rubro, con un valor y sin meta en cantidades.

### Días y reparto (H3)

- RF-17: EL SISTEMA permite marcar qué días de lunes a sábado se trabaja en la semana del plan.
- RF-18: EL SISTEMA aplica los días marcados a todas las actividades del plan.
- RF-19: EL SISTEMA propone desmarcados los días festivos.
- RF-20: EL SISTEMA permite marcar un día festivo como día de trabajo.
- RF-21: EL SISTEMA reparte la meta de la semana de cada actividad en partes iguales entre los días marcados, con tres decimales, y deja la diferencia de redondeo en el último día marcado.
- RF-22: EL SISTEMA permite ajustar la cantidad de cada día de una actividad.
- RF-23: SI la suma de las cantidades de los días de una actividad no es igual a su meta de la semana, ENTONCES EL SISTEMA no guarda el plan y señala la actividad que no cuadra.
- RF-24: EL SISTEMA calcula el total programado de cada actividad como la suma de sus días.
- RF-25: EL SISTEMA calcula la meta diaria de cada actividad como su meta de la semana entre el número de días marcados.

### Valores (H5)

- RF-26: EL SISTEMA calcula el valor de cada actividad como su meta de la semana por el precio de costo del ítem en la planificación que rige.
- RF-27: EL SISTEMA calcula el valor total del plan como la suma de los valores de sus actividades.
- RF-28: SI un ítem del plan no tiene precio de costo en la planificación, ENTONCES EL SISTEMA lo deja sin valor y avisa que el total no lo incluye.
- RF-94: EL SISTEMA recalcula los valores del plan cada vez que lo muestra o lo descarga.
- RF-29: EL SISTEMA muestra los valores del plan únicamente a Gerencia, Director de Proyectos y Director de Obra en sus obras.
- RF-30: MIENTRAS la persona tenga el acceso Residente, EL SISTEMA le muestra el plan sin ninguna cifra de plata, en pantalla y en la descarga.
- RF-102: MIENTRAS la persona tenga el acceso Residente, EL SISTEMA reemplaza por «Contiene valores en pesos» cada texto libre del plan que contenga una cifra en pesos.
- RF-103: EL SISTEMA considera que un texto contiene una cifra en pesos cuando tiene el signo «$» o la palabra «pesos».

### Lo que no cuadra con la planificación (H1, H2, H5)

- RF-31: EL SISTEMA permite en el plan actividades que no son ítems de la planificación aprobada.
- RF-32: EL SISTEMA marca como «Fuera de la planificación» las actividades del plan que no son ítems de la planificación aprobada.
- RF-88: EL SISTEMA reconoce el ítem de una actividad por el frente del presupuesto, el capítulo y el ítem de pago, como en la planificación.
- RF-89: SI la actividad solo trae el número de renglón, ENTONCES EL SISTEMA resuelve su ítem por el renglón de la planificación.
- RF-33: SI al aprobar, la meta de la semana de una actividad supera lo pendiente de su ítem en la planificación, ENTONCES EL SISTEMA lo lista como aviso del plan.
- RF-93: EL SISTEMA muestra lo pendiente de cada ítem calculado al día en que se arma o se ajusta el borrador.

### Proponer con IA (H1)

- RF-34: CUANDO se pide proponer el plan de una semana, EL SISTEMA arma un borrador con actividades, personal, maquinaria, materiales, control de volquetas, supuestos, riesgos y requerimientos.
- RF-96: CUANDO la IA propone un plan, EL SISTEMA marca como días de trabajo de lunes a sábado sin los festivos.
- RF-35: EL SISTEMA toma para la propuesta la programación del mes en la planificación aprobada.
- RF-36: EL SISTEMA toma para la propuesta lo pendiente por ítem.
- RF-37: EL SISTEMA toma para la propuesta el cumplimiento de la semana anterior.
- RF-38: EL SISTEMA toma para la propuesta los vehículos de la obra.
- RF-39: DONDE la obra lleve almacén, EL SISTEMA toma para la propuesta las existencias del almacén de la obra.
- RF-105: SI la obra no lleva almacén, ENTONCES EL SISTEMA arma la propuesta sin existencias de almacén.
- RF-40: EL SISTEMA calcula por regla la meta diaria, el total programado y el valor de lo que proponga la IA.
- RF-41: SI la IA propone un ítem que no existe en la planificación aprobada, ENTONCES EL SISTEMA lo deja marcado «Fuera de la planificación».
- RF-104: CUANDO la IA propone un plan o lee un Excel, EL SISTEMA le pide no poner valores en pesos en los textos libres.

### Subir el Excel de la Directora (H2)

- RF-42: EL SISTEMA permite subir un Excel de plan semanal para armar el borrador.
- RF-92: CUANDO se sube un Excel, EL SISTEMA pide escoger la semana a la que corresponde.
- RF-43: SI el contenido del archivo no es `.xlsx`, aunque su nombre termine así, ENTONCES EL SISTEMA lo rechaza explicando que hay que guardarlo como `.xlsx`.
- RF-44: EL SISTEMA exige que cada cifra leída del Excel cite su hoja y su fila.
- RF-45: SI la celda citada no contiene la cifra leída, ENTONCES EL SISTEMA descarta esa cifra y marca su renglón para revisión.
- RF-46: EL SISTEMA toma del Excel la meta de la semana de cada actividad y los días con cantidad.
- RF-47: EL SISTEMA recalcula la meta diaria, el total programado y el valor de lo leído del Excel.
- RF-48: SI el total programado o la meta diaria que traía el Excel difiere del calculado, ENTONCES EL SISTEMA avisa mostrando las dos cifras.
- RF-49: SI la lectura falla o no encuentra ninguna actividad, ENTONCES EL SISTEMA no crea ningún borrador y explica el motivo.
- RF-101: MIENTRAS una propuesta o una lectura esté en curso para una obra y una semana, EL SISTEMA rechaza otra para la misma obra y semana explicando el motivo.

### Borrador, aprobación y anulación (H3, H4, H6)

- RF-50: EL SISTEMA mantiene como máximo un borrador por obra y semana.
- RF-51: EL SISTEMA mantiene como máximo un plan vigente por obra y semana.
- RF-52: SI ya hay un borrador de esa semana, ENTONCES EL SISTEMA pide confirmar antes de sustituirlo con una propuesta o un Excel nuevos.
- RF-53: EL SISTEMA conserva como descartado el borrador sustituido, con quién lo sustituyó y cuándo.
- RF-54: EL SISTEMA permite proponer, subir y ajustar el borrador a Gerencia, Director de Proyectos, Director de Obra en sus obras y Residente en su obra.
- RF-55: EL SISTEMA registra quién creó el borrador, al proponerlo, subirlo o empezarlo.
- RF-87: EL SISTEMA registra quién ajustó el borrador por última vez.
- RF-56: SI quien creó el borrador es el Director de Proyectos, ENTONCES EL SISTEMA permite aprobarlo únicamente al Director de Proyectos o a la Gerencia.
- RF-57: SI quien creó el borrador es un Director de Obra o un Residente, ENTONCES EL SISTEMA permite aprobarlo únicamente al Director de Obra de esa obra, al Director de Proyectos o a la Gerencia.
- RF-58: SI quien creó el borrador es la Gerencia, ENTONCES EL SISTEMA permite aprobarlo únicamente a la Gerencia o al Director de Proyectos.
- RF-59: EL SISTEMA no permite aprobar ni anular un plan semanal al Residente.
- RF-60: SI el borrador tiene avisos, ENTONCES EL SISTEMA exige una sola confirmación del conjunto antes de aprobar.
- RF-61: CUANDO se aprueba un plan, EL SISTEMA registra quién lo aprobó.
- RF-106: CUANDO se aprueba un plan, EL SISTEMA registra la fecha y hora de aprobación.
- RF-62: CUANDO se aprueba un plan, EL SISTEMA lo hace regir desde ese día, según la fecha de Colombia, o desde el lunes si la semana todavía no empieza.
- RF-63: SI una persona aprueba un borrador que cambió después de que ella lo abrió, ENTONCES EL SISTEMA avisa que cambió, sin aplicar la aprobación.
- RF-99: SI la semana de un borrador ya terminó, ENTONCES EL SISTEMA no permite aprobarlo y lo muestra como «Sin aprobar» en solo lectura.
- RF-100: SI hay una versión de la planificación más nueva que la usada al armar el plan, ENTONCES EL SISTEMA lo lista como aviso del plan.
- RF-64: EL SISTEMA no permite editar un plan aprobado.
- RF-65: EL SISTEMA permite anular el plan vigente a quien puede aprobarlo.
- RF-66: CUANDO se anula un plan, EL SISTEMA exige un motivo escrito.
- RF-67: CUANDO se anula un plan, EL SISTEMA deja de hacerlo regir desde ese día.
- RF-68: CUANDO se aprueba un plan nuevo para una semana que ya tuvo uno anulado, EL SISTEMA mide los días anteriores de esa semana con el plan que regía cada día.
- RF-69: EL SISTEMA no borra ningún plan semanal.

### El plan como meta del cumplimiento (H5)

- RF-70: MIENTRAS un plan rija un día, EL SISTEMA toma como meta de ese día, para cada ítem de la planificación que está en el plan, la cantidad del plan para ese día.
- RF-71: MIENTRAS un plan rija un día, EL SISTEMA no da meta ese día a los ítems de la planificación que no están en el plan.
- RF-72: EL SISTEMA no cuenta como meta del cumplimiento las actividades del plan marcadas «Fuera de la planificación».
- RF-73: EL SISTEMA no marca como «estimada» la meta que sale de un plan aprobado.
- RF-90: SI dos actividades del plan son del mismo ítem, ENTONCES EL SISTEMA suma sus cantidades en la meta del cumplimiento.
- RF-95: SI en un periodo parte de los días de un ítem tiene meta del plan y parte meta estimada, ENTONCES EL SISTEMA lo marca «Parcialmente estimada» con cuántos días salieron del plan.
- RF-98: EL SISTEMA no cuenta las actividades de tipo rubro en el cumplimiento.
- RF-74: EL SISTEMA sigue tomando la meta del informe mensual de la planificación aprobada.
- RF-75: EL SISTEMA usa en cada día del informe el precio de costo de la planificación que rige ese día.
- RF-76: SI ningún plan rige un día, ENTONCES EL SISTEMA reparte la meta del mes como lo hace sin plan semanal.
- RF-77: SI ninguna planificación rige un día, ENTONCES EL SISTEMA no da meta ese día aunque haya un plan semanal aprobado.
- RF-107: SI ninguna planificación rige un día con plan semanal aprobado, ENTONCES EL SISTEMA muestra ese día como «Sin planificación aprobada».

### Ver y descargar (H5, H7)

- RF-78: EL SISTEMA muestra los planes de cada semana con su estado, quién los armó y quién los aprobó.
- RF-79: EL SISTEMA deja abrir en solo lectura cualquier plan aprobado, anulado o descartado.
- RF-80: EL SISTEMA permite descargar el plan en Excel con las mismas secciones del Excel de la Directora.
- RF-81: EL SISTEMA da las mismas cifras en pantalla y en la descarga para un mismo plan.

### Reglas transversales

- RF-82: EL SISTEMA limita cada persona a las obras de su alcance.
- RF-83: SI una persona sin acceso pide un plan semanal, ENTONCES EL SISTEMA rechaza la petición.
- RF-84: EL SISTEMA calcula por regla todos los totales, metas diarias y valores del plan.
- RF-85: EL SISTEMA no modifica partes de obra, presupuestos, planificaciones ni preoperacionales al proponer, subir, aprobar o anular un plan semanal.
- RF-86: SI una persona guarda un borrador que cambió después de que ella lo abrió, ENTONCES EL SISTEMA avisa que cambió, sin aplicar sus cambios.

## Superficies afectadas

- [ ] **Móvil** — sin cambios.
- [x] **Panel web** — la página del plan semanal de cada obra (semanas, borrador, ajuste, aprobar, anular, descargar) y el informe de cumplimiento, que toma la meta del plan.
- [x] **API** — rutas del panel para proponer, subir, guardar, aprobar, anular, listar y descargar planes; el cumplimiento cambia su meta semanal.
- [ ] **Sincronización** — sin cambios: nada de esto baja al teléfono ni sube de él.
- [x] **Datos** — planes semanales en el servidor, con sus versiones y su lectura con IA guardada. Nada en el teléfono.
- [x] **Reglas** — reparto por días, totales, valores, avisos, quién aprueba, qué plan rige cada día y la meta del cumplimiento con plan; con su caso en `verificar-reglas.ts`.

## Requisitos no funcionales

- La propuesta con IA o la lectura del Excel de un plan como el de referencia (≈ 20 actividades, 6 hojas) termina en menos de 3 minutos.
- Las cantidades se guardan con tres decimales y los valores en pesos enteros.
- Pantallas y descarga en español.
- Las columnas de plata no aparecen vacías para el Residente: no existen en lo que ve.

## Casos límite

- **Sin señal**: no aplica. Es solo del panel; el operador sigue trabajando igual.
- **Evidencia firmada**: un plan aprobado no se edita: se anula con motivo y se arma otro (RF-64 a RF-66). El plan no toca partes ni preoperacionales (RF-85).
- **Primer arranque**: una obra sin planificación aprobada no puede tener plan semanal (RF-5); su informe sigue como en la 043.

Y los del caso concreto:

- **El Excel reparte la meta en 4 días y la programa en 5**: el sistema toma la meta y los días con cantidad, recalcula, y avisa con las dos cifras (RF-46 a RF-48).
- **Renglones que no son ítems** («Componentes (PMA, PMT)», «38.6 Disposición de material», ítem no previsto): entran marcados «Fuera de la planificación» y no cuentan como meta (RF-31, RF-32, RF-72).
- **El Excel numera por renglón** («Ítem 16», «Ítem 38.6») y no por ítem de pago: se resuelve contra el renglón de la planificación (RF-89).
- **El mismo ítem en dos actividades** (un transporte en dos tramos): se suman en la meta (RF-90).
- **«Componentes (PMA, PMT)»** es un rubro: entra como actividad de tipo rubro con su valor, sin meta en cantidades y fuera del cumplimiento (RF-97, RF-98).
- **El reparto en partes iguales no da exacto** (10 entre 3 días): la diferencia de redondeo va al último día marcado (RF-21).
- **Un borrador nunca aprobado y su semana ya terminó**: queda «Sin aprobar», en solo lectura; esa semana se midió con la meta estimada (RF-99).
- **La planificación cambia de versión** después de armar el plan: aviso confirmado al aprobar (RF-100).
- **Plata en el texto** («cada volqueta parada resta ≈ $…»): el Residente ve «Contiene valores en pesos» (RF-102, RF-103).
- **Obra sin almacén**: la propuesta no toma existencias (RF-105).
- **Dos propuestas a la vez** para la misma obra y semana: la segunda se rechaza (RF-101).
- **Se trabaja un festivo**: se marca, y recibe su parte de la meta (RF-20, RF-21). Marcarlo en un plan no cambia el reparto estimado de la 043: solo vale dentro de ese plan.
- **Plan aprobado a mitad de semana**: rige desde ese día; los días anteriores siguen con la meta estimada, y la fila sale «Parcialmente estimada» (RF-62, RF-76, RF-95).
- **La meta supera lo pendiente**: se aprueba con aviso confirmado (RF-33, RF-60); el cumplimiento puede pasar del 100 %, como en la 043.
- **Cambia la planificación a mitad de semana**: el valor de cada día usa el precio de la planificación que rige ese día (RF-75).
- **Se anula la planificación con un plan semanal aprobado**: desde ese día no hay meta, «Sin planificación aprobada» (RF-77).
- **Dos personas ajustan el mismo borrador**: el segundo guardado avisa que el borrador cambió y no pisa lo del primero (RF-86).
- **Lo no cumplido de una semana no pasa a la siguiente** por sí solo, como en la 043; la IA lo tiene en cuenta al proponer porque mira el cumplimiento de la semana anterior (RF-37).

## Fuera de alcance

- Calcular materiales o volquetas a partir de las metas (cemento por m³, viajes por capacidad): son renglones propuestos y ajustables (RF-16).
- Días de trabajo distintos por actividad: un solo juego de días para todo el plan (RF-18).
- Planes de semanas que ya terminaron, o de más de 4 semanas adelante (RF-3, RF-4).
- Un paso de «enviar»: el borrador queda a la vista de quien aprueba.
- Usar el plan semanal para el informe mensual: el mes sigue con la planificación (RF-74).
- Programar la cuadrilla con personas concretas o asignar vehículos a operadores desde el plan.
- Hacer pedidos de compra o salidas de almacén desde los materiales del plan.
- Consultar el plan semanal con el asistente.
- Descarga del plan en PDF.
- Cualquier cambio en el celular.

## Criterios de finalización

- Cada RF tiene cómo comprobarse: caso en `scripts/verificar-reglas.ts` (reparto, totales, valores, avisos, quién aprueba, qué plan rige, meta con plan) o paso de demo manual. Lo que la IA recibe para proponer (RF-35 a RF-39, RF-105) se comprueba revisando lo que se le manda.
- `npm run verificar`, `npm run typecheck` y `npm run lint` en verde.
- Demo manual del flujo principal, en una obra con la planificación de Magdalena aprobada:
  1. Como Residente, proponer con IA el plan de una semana y dejarlo en borrador, sin ver plata.
  2. Como Directora de Obra, ajustar metas y días (marcar un festivo), revisar avisos y aprobarlo.
  3. Subir `PLAN DE TRABAJO SEMANAL_META3-6 DE NOVI..xlsx` como borrador de otra semana y comprobar que lo lee completo, que recalcula los totales y que avisa del reparto 4 contra 5.
  4. Abrir el informe de cumplimiento de la semana aprobada: la meta sale del plan, sin «estimada», y un ítem fuera del plan queda sin meta.
  5. Anular con motivo, aprobar uno nuevo a mitad de semana y comprobar qué plan mide cada día.
  6. Descargar el plan en Excel como Directora (con plata) y como Residente (sin plata).

## Dudas abiertas

Ninguna. Las dos de la redacción las resolvió Diego el 2026-11-10 (D14, D15).

### Decisiones de la entrevista (2026-11-10)

- D1: Un ítem de la planificación que no está en el plan aprobado queda sin meta esa semana (RF-71). El mes sigue con la planificación (RF-74).
- D2: Una meta mayor que lo pendiente se aprueba con aviso confirmado (RF-33, RF-60).
- D3: Un solo juego de días para todo el plan, de lunes a sábado; los festivos salen desmarcados pero se pueden marcar (RF-17 a RF-20).
- D4: La meta se reparte en partes iguales y se puede ajustar por día, siempre que sume la meta (RF-21 a RF-23).
- D5: El valor del plan es a precio de costo; lo ven Gerencia y directores; el Residente arma y ve solo cantidades (RF-26, RF-29, RF-30).
- D6: Actividades con reglas; personal, maquinaria, supuestos, riesgos y requerimientos como datos; materiales y volquetas como renglones propuestos y ajustables, sin fórmulas (RF-6 a RF-16).
- D7: El Residente arma y ajusta, no aprueba ni anula; no hay paso de «enviar» (RF-54, RF-59).
- D8: Un plan aprobado no se edita: se anula con motivo y rige otro desde el día en que se aprueba (RF-62, RF-64 a RF-68).
- D9: Se planea la semana en curso y hasta 4 semanas adelante, nunca una semana terminada (RF-2 a RF-4).
- D10: Las actividades que no son ítems de la planificación entran marcadas y no cuentan como meta (RF-31, RF-32, RF-72).
- D11: Del Excel se toman la meta y los días con cantidad; el sistema recalcula y avisa si no cuadraba (RF-46 a RF-48).
- D12: Sin planificación aprobada no hay plan semanal (RF-5).
- D13: Aprobación según quién lo armó, decidido por Diego el 2026-11-08 (RF-56, RF-57).
- D14: Un plan armado por la Gerencia lo aprueban la Gerencia o el Director de Proyectos (RF-58).
- D15: Sin planificación que rija un día, ese día no tiene meta aunque haya plan semanal aprobado: la 043 y la 044 dicen lo mismo (RF-77, RF-107).

### Decisiones de la clarificación (2026-11-10, propuestas de Claude aprobadas por Diego)

- D16: Cuenta como autor quien creó el borrador; los ajustes no lo cambian, y queda quién ajustó por última vez (RF-55 a RF-58, RF-87).
- D17: El ítem se reconoce por frente del presupuesto, capítulo e ítem de pago, o por el renglón; dos actividades del mismo ítem se suman (RF-88 a RF-90).
- D18: La semana de un Excel subido la escoge la persona (RF-92).
- D19: Una semana con días del plan y días estimados sale «Parcialmente estimada» (RF-95).
- D20: El reparto deja la diferencia de redondeo en el último día marcado (RF-21).
- D21: Un borrador de una semana terminada no se aprueba (RF-99).
- D22: Al Residente no se le muestran los textos con cifras en pesos; a la IA se le pide no ponerlas (RF-102 a RF-104).
- D23: «Frente de trabajo» es el rótulo del plan; «frente» sigue siendo el grupo del presupuesto (RF-91).
- D24: Lo pendiente se muestra al día de armar o ajustar, y el aviso usa el del día de aprobar (RF-33, RF-93).
- D25: El valor del plan se recalcula siempre, como los informes de la 043 (RF-94).
- D26: La propuesta marca de lunes a sábado sin festivos (RF-96).
- D27: Los rubros entran como actividad de tipo rubro, con valor y sin cumplimiento (RF-97, RF-98).
- D28: Marcar un festivo en un plan no cambia el reparto estimado de la 043 (Casos límite).
- D29: Una planificación más nueva que la usada se avisa al aprobar (RF-100).
- D30: Una propuesta o lectura a la vez por obra y semana (RF-101).
- D31: Sin almacén en la obra, la propuesta no toma existencias (RF-39, RF-105).
- D32: Lo que recibe la IA se comprueba en las pruebas, revisando lo que se le manda (Criterios).
- D33: RF-61 y RF-77 se partieron en dos (RF-106, RF-107).
