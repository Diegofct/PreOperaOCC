# Spec 043 — Planificación de obra y cumplimiento

> Estado: Aprobada por Diego el 2026-11-09, tras la clarificación · Fecha: 2026-11-08 · Tercera de la tanda 041–044 (depende de la 041 y del presupuesto de la 031; es la base de la 044)

## Contexto y objetivo

El presupuesto de cada obra dice lo que la entidad paga, pero no lo que a OCC le cuesta hacerlo ni cuándo piensa hacerlo. Eso vive en un Excel de planificación grande que prepara el Director de Proyectos: precio de costo por ítem, medidas reales y programación mes a mes. Hoy nadie cruza ese Excel con lo que se va ejecutando, así que solo se sabe si una obra iba atrasada o si la plata alcanzaba cuando ya es tarde. Esta spec permite subir ese Excel, que la IA lo lea y lo cruce con el presupuesto vigente, que el Director de Proyectos o la Gerencia lo apruebe y que, con lo que ya registra el parte diario y sin pedir ningún dato nuevo, salgan informes semanales y mensuales de qué se cumplió, qué falta y cuánta plata representa.

## Usuarios / actores

- **Director de Proyectos** (panel web): sube la planificación, la revisa, la aprueba y la anula, en cualquier obra. Ve todos los valores.
- **Gerencia** (panel web): puede lo mismo que el Director de Proyectos.
- **Director de Obra** (panel web): en sus obras ve la planificación aprobada y los informes, con todos los valores, y puede bajar el Excel original. No sube, no aprueba y no anula.
- **Residente** (panel web): en su obra ve los informes solo en cantidades y porcentajes, sin ninguna cifra de plata. Sigue viendo los precios del presupuesto, como hasta hoy. No ve la planificación ni baja su Excel.
- **Operador** (móvil): no cambia nada para él.
- **Almacenista, Encargado de Planta, Laboratorista, Encargado de OCC, Auxiliar Administrativa**: no tienen acceso a la planificación ni a estos informes.

## Historias de usuario

- H1: Como Director de Proyectos quiero subir mi Excel de planificación y que el sistema lo lea y lo cruce con el presupuesto, para no volver a digitar cientos de ítems.
- H2: Como Director de Proyectos quiero ver qué no cuadra antes de aprobar, para responder por lo que apruebo.
- H3: Como Gerencia quiero que la planificación aprobada no cambie sin dejar rastro, para confiar en los informes.
- H4: Como Director de Obra quiero ver cada semana y cada mes qué se cumplió y qué falta, para corregir a tiempo.
- H5: Como Gerencia quiero saber cuánta plata representa lo ejecutado frente a lo programado, para ver si una obra va bien.
- H6: Como Residente quiero ver el cumplimiento de mi obra en cantidades, sin acceder a los costos.
- H7: Como Director de Obra quiero descargar el informe y preguntárselo al asistente, para llevarlo a un comité o consultarlo rápido.

## Requisitos funcionales (criterios de aceptación en EARS)

### Subir y leer el Excel (H1)

- RF-1: EL SISTEMA permite a una persona con acceso Director de Proyectos o Gerencia subir un Excel de planificación para una obra.
- RF-2: SI la obra no tiene presupuesto vigente, ENTONCES EL SISTEMA rechaza la subida explicando que primero hay que aprobar el presupuesto.
- RF-3: SI el contenido del archivo no es `.xlsx`, aunque su nombre termine así, ENTONCES EL SISTEMA lo rechaza explicando que hay que guardarlo como `.xlsx`.
- RF-4: CUANDO se sube un libro, EL SISTEMA propone qué hojas contienen la planificación por ítem, la programación mensual, los indirectos, los rubros, los supuestos y los objetivos.
- RF-5: EL SISTEMA no propone las hojas ocultas del libro.
- RF-6: CUANDO la persona confirma las hojas, EL SISTEMA lee únicamente esas hojas.
- RF-7: CUANDO termina la lectura, EL SISTEMA crea una planificación en borrador.
- RF-8: EL SISTEMA conserva el Excel original junto a la planificación.
- RF-9: SI la lectura falla o no encuentra ningún ítem, ENTONCES EL SISTEMA no crea ningún borrador y explica el motivo.
- RF-10: CUANDO se sube un archivo ya leído con las mismas hojas, EL SISTEMA muestra la lectura guardada sin esperar una lectura nueva.
- RF-100: SI el libro trae una hoja de planificación por cada frente, ENTONCES EL SISTEMA pide escoger una sola.
- RF-101: EL SISTEMA toma como programación mensual la línea base o planificación inicial del libro.
- RF-102: SI el libro trae una línea base, ENTONCES EL SISTEMA no toma la programación del flujo de caja.
- RF-103: SI el libro no trae una línea base identificable, ENTONCES EL SISTEMA pide confirmar qué hoja contiene la programación inicial.
- RF-104: EL SISTEMA no exige nombres de hoja, número de frentes ni posiciones de columna fijos.

### Qué se guarda de la planificación (H1)

- RF-11: EL SISTEMA guarda de cada ítem su precio de costo.
- RF-12: EL SISTEMA guarda de cada ítem su cantidad planeada, que es la «medida real» del Excel.
- RF-13: EL SISTEMA guarda de cada ítem su mes de inicio.
- RF-14: EL SISTEMA guarda de cada ítem su tiempo de ejecución.
- RF-15: EL SISTEMA guarda de cada ítem su programación por mes del calendario.
- RF-16: EL SISTEMA obtiene la cantidad programada de cada mes dividiendo el valor programado de ese mes entre el precio contractual del ítem.
- RF-17: EL SISTEMA guarda los indirectos programados por mes.
- RF-18: EL SISTEMA guarda los supuestos y objetivos como texto.
- RF-19: EL SISTEMA reconoce un ítem de la planificación como uno del presupuesto cuando coinciden el grupo, el capítulo y el ítem de pago.
- RF-105: EL SISTEMA asocia la planificación con el grupo del presupuesto que corresponde a su frente.
- RF-106: SI el presupuesto no tiene grupos, ENTONCES EL SISTEMA reconoce el ítem por el capítulo y el ítem de pago.
- RF-107: SI el frente no se puede asociar a un único grupo, ENTONCES EL SISTEMA pide escoger el grupo antes de crear el borrador.
- RF-108: EL SISTEMA guarda los rubros de la planificación con su valor programado por mes.
- RF-109: SI el libro programa los rubros en una sola línea, ENTONCES EL SISTEMA guarda esa línea como un solo valor mensual.
- RF-110: EL SISTEMA cruza los rubros de la planificación con los rubros del presupuesto y no con sus ítems.

### La IA lee, la regla decide (H1, H2)

- RF-20: EL SISTEMA exige que cada cifra leída por la IA cite su hoja y su fila.
- RF-21: SI la celda citada no contiene la cifra leída, ENTONCES EL SISTEMA descarta esa cifra.
- RF-22: SI se descarta una cifra de un ítem, ENTONCES EL SISTEMA marca ese ítem para revisión.
- RF-23: EL SISTEMA calcula todos los totales, márgenes y diferencias por regla.
- RF-24: EL SISTEMA muestra observaciones redactadas por la IA únicamente sobre hallazgos listados en el borrador.

### Hallazgos y aprobación (H2, H3)

- RF-25: CUANDO se crea un borrador, EL SISTEMA lista los ítems que no existen en el presupuesto vigente.
- RF-26: CUANDO se crea un borrador, EL SISTEMA lista los ítems cuya unidad difiere de la del presupuesto.
- RF-27: CUANDO se crea un borrador, EL SISTEMA lista los ítems cuya cantidad contractual difiere de la del presupuesto.
- RF-28: CUANDO se crea un borrador, EL SISTEMA lista los ítems cuyo precio de costo supera el precio contractual.
- RF-29: CUANDO se crea un borrador, EL SISTEMA lista los ítems con medida real mayor que cero y sin programación.
- RF-30: DONDE el contrato tenga fecha de fin, EL SISTEMA lista al crear el borrador los ítems programados en meses posteriores a esa fecha.
- RF-31: CUANDO se crea un borrador, EL SISTEMA lista los ítems sin precio de costo.
- RF-32: EL SISTEMA considera sin precio de costo un ítem cuyo costo está vacío, en cero o por debajo de un peso.
- RF-33: EL SISTEMA muestra en el resumen del borrador el total a precio contractual y el total a costo, con medida real y con medida contractual.
- RF-111: EL SISTEMA calcula el margen del borrador como el total a precio contractual menos el total a costo, antes de indirectos.
- RF-112: EL SISTEMA calcula el resultado del borrador como su margen menos los indirectos programados.
- RF-113: EL SISTEMA muestra el margen y el resultado del borrador con medida real y con medida contractual.
- RF-114: SI el total leído difiere del total que trae el Excel, ENTONCES EL SISTEMA muestra la diferencia en el resumen.
- RF-115: EL SISTEMA incluye en los hallazgos los ítems marcados para revisión.
- RF-34: EL SISTEMA permite aprobar una planificación con hallazgos.
- RF-35: SI el borrador tiene hallazgos, ENTONCES EL SISTEMA exige una sola confirmación del conjunto antes de aprobar.
- RF-36: EL SISTEMA permite aprobar únicamente a una persona con acceso Director de Proyectos o Gerencia.
- RF-37: CUANDO se aprueba una planificación, EL SISTEMA registra quién la aprobó.
- RF-38: CUANDO se aprueba una planificación, EL SISTEMA registra la fecha y hora de aprobación.
- RF-39: CUANDO se aprueba una planificación, EL SISTEMA registra la versión del presupuesto contra la que se cruzó.
- RF-40: CUANDO se aprueba un presupuesto nuevo sobre una planificación aprobada, EL SISTEMA avisa en la planificación que se cruzó contra una versión anterior.

### Versiones y anulación (H3)

- RF-41: EL SISTEMA mantiene como máximo un borrador por obra.
- RF-42: EL SISTEMA mantiene como máximo una planificación vigente por obra.
- RF-43: CUANDO se sube un Excel en una obra que ya tiene borrador, EL SISTEMA pide confirmar antes de sustituir ese borrador.
- RF-116: CUANDO se sustituye un borrador, EL SISTEMA lo conserva como descartado, con quién lo sustituyó y cuándo.
- RF-117: MIENTRAS una lectura esté en curso en una obra, EL SISTEMA rechaza otra subida en esa obra explicando el motivo.
- RF-44: EL SISTEMA numera las planificaciones de cada obra como v1, v2, etc.
- RF-45: EL SISTEMA no permite editar una planificación aprobada.
- RF-46: CUANDO se aprueba una versión nueva, EL SISTEMA deja la anterior como reemplazada.
- RF-47: CUANDO se anula una planificación, EL SISTEMA exige un motivo escrito.
- RF-48: EL SISTEMA permite anular únicamente a una persona con acceso Director de Proyectos o Gerencia.
- RF-118: EL SISTEMA permite anular únicamente la versión vigente.
- RF-49: EL SISTEMA deja abrir en solo lectura cualquier versión anterior o anulada únicamente a Gerencia, Director de Proyectos y Director de Obra en sus obras.
- RF-50: EL SISTEMA deja descargar el Excel original de cualquier versión únicamente a Gerencia, Director de Proyectos y Director de Obra en sus obras.
- RF-51: EL SISTEMA no permite cambiar en pantalla los valores de un borrador.

### Cuál versión rige cada periodo (H3, H5)

- RF-52: EL SISTEMA mide cada día con la versión aprobada que regía en esa fecha, salvo los días anteriores a la primera aprobación (RF-57).
- RF-53: CUANDO un mes o una semana incluye un cambio de versión, EL SISTEMA parte el periodo por la fecha de aprobación.
- RF-119: CUANDO un periodo se parte por un cambio de versión, EL SISTEMA reparte la meta de cada versión según los días de reparto de RF-65 que le toquen.
- RF-120: EL SISTEMA cuenta el día de la aprobación con la versión nueva, según la fecha de Colombia.
- RF-54: EL SISTEMA muestra en cada informe qué versión o versiones usó.
- RF-55: CUANDO se anula la versión vigente, EL SISTEMA conserva esa versión para medir los días en que rigió.
- RF-138: EL SISTEMA deja sin meta el día de la anulación, según la fecha de Colombia.
- RF-56: MIENTRAS una obra no tenga versión vigente, EL SISTEMA muestra los días nuevos sin meta, con el aviso «Sin planificación aprobada».
- RF-57: EL SISTEMA mide los días anteriores a la primera aprobación con la primera versión aprobada, aunque esa versión se anule después.
- RF-121: CUANDO se aprueba la primera planificación de una obra, EL SISTEMA pide marcar, mes por mes, cuáles meses anteriores con programación ya cumplieron su meta.
- RF-122: CUANDO se marca un mes como cumplido, EL SISTEMA registra quién lo marcó y cuándo.
- RF-123: MIENTRAS un mes esté marcado como cumplido, EL SISTEMA muestra «Meta cumplida» en lugar del porcentaje de ese mes.
- RF-124: MIENTRAS un mes esté marcado como cumplido, EL SISTEMA muestra «Meta cumplida» en las semanas que caen por completo dentro de él.
- RF-125: SI un mes anterior no se marca como cumplido, ENTONCES EL SISTEMA lo mide contra los partes como cualquier otro periodo.

### Cumplimiento: meta y ejecutado (H4, H6)

- RF-58: EL SISTEMA ofrece un informe de cumplimiento por semana, de lunes a domingo.
- RF-59: EL SISTEMA ofrece un informe de cumplimiento por mes del calendario.
- RF-60: EL SISTEMA toma como ejecutado las cantidades por ítem de los partes de obra no anulados del periodo.
- RF-126: EL SISTEMA cuenta una actividad contra un ítem de la planificación solo si coinciden su grupo, su capítulo y su ítem de pago.
- RF-127: SI una actividad no tiene capítulo, ENTONCES EL SISTEMA la muestra entre las actividades fuera de la planificación con la marca «Sin capítulo».
- RF-61: SI el periodo incluye partes abiertos, ENTONCES EL SISTEMA avisa cuántos días siguen abiertos.
- RF-62: SI el periodo incluye partes abiertos, ENTONCES EL SISTEMA avisa que esas cifras pueden cambiar.
- RF-128: SI el periodo tiene días de reparto sin parte, ENTONCES EL SISTEMA avisa cuántos son.
- RF-63: EL SISTEMA toma como meta del mes la cantidad programada de ese mes, aunque sus semanas tengan plan semanal aprobado.
- RF-64: DONDE exista un plan semanal aprobado para la semana, EL SISTEMA toma de él la meta de esa semana.
- RF-65: SI la semana no tiene plan semanal aprobado, ENTONCES EL SISTEMA calcula la meta repartiendo la cantidad del mes entre sus días de lunes a sábado que no sean festivos.
- RF-66: CUANDO la meta sale del reparto del mes, EL SISTEMA la marca como «estimada».
- RF-67: CUANDO una semana cae entre dos meses, EL SISTEMA suma lo que le corresponde de cada mes según los días de reparto de RF-65.
- RF-68: EL SISTEMA muestra por ítem la meta del periodo.
- RF-69: EL SISTEMA muestra por ítem la cantidad ejecutada del periodo.
- RF-70: EL SISTEMA muestra por ítem el porcentaje de cumplimiento.
- RF-71: EL SISTEMA muestra por ítem la cantidad pendiente del periodo.
- RF-129: EL SISTEMA muestra por ítem la cantidad pendiente del total de la obra frente a la planeada.
- RF-130: EL SISTEMA no traslada lo no cumplido de un periodo a la meta de los periodos siguientes.
- RF-72: EL SISTEMA muestra el porcentaje real aunque supere el 100 %.
- RF-73: SI un ítem no tiene meta en el periodo, ENTONCES EL SISTEMA muestra lo ejecutado con «Sin programación», sin porcentaje.
- RF-74: EL SISTEMA muestra aparte lo ejecutado en actividades fuera de la planificación.

### Valores (H5)

- RF-75: EL SISTEMA calcula el valor programado multiplicando la meta por el precio de costo de la versión que rige.
- RF-76: EL SISTEMA calcula el valor ejecutado multiplicando lo ejecutado por el precio de costo de la versión que rige.
- RF-77: EL SISTEMA calcula el valor a cobrar multiplicando lo ejecutado por el precio contractual de la versión que rige.
- RF-78: EL SISTEMA muestra la diferencia entre el valor ejecutado y el valor programado como «Faltó» o «Sobró» frente a lo programado.
- RF-79: EL SISTEMA muestra como margen del periodo la diferencia entre el valor a cobrar y el valor ejecutado, antes de indirectos.
- RF-131: EL SISTEMA muestra en el informe mensual el resultado del mes, que es su margen menos los indirectos programados del mes.
- RF-132: EL SISTEMA no muestra resultado después de indirectos en el informe semanal.
- RF-80: SI un ítem de la planificación ejecutado no tiene precio de costo, ENTONCES EL SISTEMA lo muestra aparte con su cantidad bajo «Sin precio de costo».
- RF-81: EL SISTEMA excluye los ítems sin precio de costo del valor ejecutado, del valor a cobrar, del margen y del resultado.
- RF-82: SI el periodo tiene ítems sin precio de costo, ENTONCES EL SISTEMA avisa que los totales no los incluyen.
- RF-83: EL SISTEMA muestra los indirectos del mes como «Programado» en una sección aparte del informe mensual.
- RF-84: EL SISTEMA no calcula porcentaje de cumplimiento sobre los indirectos.
- RF-85: EL SISTEMA excluye los indirectos del «Faltó» o «Sobró».
- RF-133: EL SISTEMA muestra los rubros del mes como «Programado» en una sección aparte del informe mensual.
- RF-134: EL SISTEMA no calcula porcentaje de cumplimiento sobre los rubros.
- RF-135: EL SISTEMA excluye los rubros del «Faltó» o «Sobró», del margen y del resultado del periodo.

### Quién ve qué (H4, H5, H6)

- RF-86: EL SISTEMA muestra al Director de Obra, en sus obras, la planificación vigente con todos sus valores.
- RF-87: EL SISTEMA muestra los informes con plata únicamente a Gerencia, Director de Proyectos y Director de Obra en sus obras.
- RF-88: MIENTRAS la persona tenga el acceso Residente, EL SISTEMA le muestra el cumplimiento de su obra sin ninguna cifra de plata.
- RF-89: EL SISTEMA no entrega al Residente ningún dato de la planificación ni ninguna cifra de plata de estos informes por pantalla, descarga o asistente.
- RF-136: EL SISTEMA no cambia lo que el Residente ve hoy del presupuesto, con sus precios.
- RF-90: SI una persona sin acceso pide la planificación o un informe, ENTONCES EL SISTEMA rechaza la petición.
- RF-91: EL SISTEMA limita cada persona a las obras de su alcance.

### Descargas y asistente (H7)

- RF-92: EL SISTEMA permite descargar el informe del periodo en Excel.
- RF-93: EL SISTEMA permite descargar el informe del periodo en PDF.
- RF-94: CUANDO se pregunta al asistente cómo va una semana o un mes, EL SISTEMA responde con el cumplimiento de ese periodo.
- RF-95: MIENTRAS un Director de Obra use el asistente, EL SISTEMA hace que responda solo de su obra en uso.
- RF-137: SI una persona con acceso a todas las obras no dice de cuál pregunta, ENTONCES EL SISTEMA hace que el asistente le pregunte la obra.

### Reglas transversales

- RF-96: EL SISTEMA da las mismas cifras en pantalla, descargas y asistente para un mismo periodo.
- RF-97: EL SISTEMA no borra ninguna planificación.
- RF-98: EL SISTEMA no modifica partes de obra, presupuestos ni preoperacionales al subir, aprobar o anular una planificación.
- RF-99: SI una persona aprueba o sustituye un borrador que cambió después de que ella lo abrió, ENTONCES EL SISTEMA avisa que el borrador cambió, sin aplicar su acción.

## Superficies afectadas

- [ ] **Móvil** — sin cambios; el operador no interviene.
- [x] **Panel web** — planificación de la obra (subir, revisar, aprobar, anular, versiones) e informe de cumplimiento semanal y mensual.
- [x] **API** — rutas del panel para subir, leer, aprobar, anular y consultar, y la consulta nueva del asistente.
- [ ] **Sincronización** — sin cambios; nada de esto baja al celular ni sube de él.
- [x] **Datos** — planificaciones con versiones, solo en el servidor. Sin cambios en la base del celular.
- [x] **Reglas** — hallazgos de la planificación, reparto de la meta semanal, versión que rige cada día y cálculo de cumplimiento y valores, con sus casos de verificación.

## Requisitos no funcionales

- La lectura con IA de un libro real puede tardar hasta 3 minutos sin cortarse, mostrando que sigue en curso.
- El sistema lee libros de al menos 80 hojas, con hasta 1 500 filas por lectura. La forma del libro cambia de una obra a otra: el V5 de Magdalena tiene 28 hojas y la planificación de Cartagena, 79.
- El informe de un mes con 200 ítems abre en menos de 5 segundos.
- Pantallas y descargas en español.
- Las columnas de plata no aparecen vacías para el Residente: esas columnas no existen en lo que ve.

## Casos límite

- **Sin señal**: no aplica. Es solo del panel web y el operador sigue trabajando igual, con o sin señal.
- **Evidencia firmada**: esta spec solo lee los partes. Si un parte cerrado se anula después, su cantidad deja de contar en el informe de ese periodo, porque un parte anulado no es ejecutado. Preoperacionales sin relación.
- **Primer arranque / equipo recién activado**: en el celular no aplica. Una obra sin planificación muestra el informe sin metas y con el aviso «Sin planificación aprobada»; lo ejecutado se sigue viendo.

Y los del caso concreto:

- **Medida real distinta de la contractual**: es normal, no es un hallazgo. En el libro de Magdalena son decenas de ítems. El hallazgo es que la cantidad *contractual* del Excel no coincida con la del presupuesto (RF-27).
- **Costos de relleno en el Excel**: renglones con costos como 0,000000001 no se tratan como costo real (RF-32). En el V5 son 12 ítems con cantidad, cerca del 43 % del valor de los ítems a precio contractual: los totales de plata del informe no los incluyen y el aviso de RF-82 lo dice.
- **El presupuesto sigue en `.xls`**: se rechaza con la explicación de la 031, aunque solo se le haya cambiado la extensión del nombre. Hay que abrirlo y guardarlo como `.xlsx`.
- **Un otrosí agrega ítems después de aprobar**: su ejecutado sale como actividad fuera de la planificación (RF-74) hasta aprobar otra versión.
- **Ítem que cambia de capítulo en una versión nueva del presupuesto**: no es el mismo ítem (regla de la 031) y sale como fuera de la planificación.
- **Se ejecuta más de lo planeado**: el pendiente queda en cero y el excedente se ve; el porcentaje puede pasar de 100 % (RF-72).
- **Mes sin días de reparto dentro de la vigencia** (por un cambio de versión el último día): la parte correspondiente queda en cero, sin error.
- **Se trabaja un festivo**: lo ejecutado ese día cuenta completo, aunque el festivo no reciba meta en el reparto.
- **Libro con un solo frente cargado**: en Magdalena se carga solo Berrio. El presupuesto tiene los mismos capítulos e ítems en Berrio y en Yondo, así que lo que los distingue es el grupo (RF-19, RF-126). Lo ejecutado en Yondo sale como actividad fuera de la planificación (RF-74), y los ítems del presupuesto que no estén en la planificación no se listan como hallazgo.
- **Libro con línea base y flujo de caja**: la línea base manda (RF-101, RF-102). El flujo de caja lleva el control del dinero y puede traer varios frentes en la misma hoja.
- **La línea base no cubre todos los meses**: en el V5 la programación por ítem arranca en octubre de 2026. Los meses anteriores no tienen meta por ítem, así que muestran lo ejecutado con «Sin programación» (RF-73) y no entran en la pregunta de RF-121.
- **Indirectos en el resumen**: en el V5, el total de indirectos de la planificación de Berrio y el de la línea base difieren en unos $187 millones. El resumen muestra esa diferencia frente al Excel (RF-114).
- **Actividades anteriores al presupuesto**: quedan sin capítulo por la regla de la 031 y salen con la marca «Sin capítulo» (RF-127); si un corte de obra les asigna capítulo, cuentan desde entonces.
- **Un informe ya entregado**: se recalcula al abrirlo. Puede variar si después se anula o se cierra un parte de ese periodo.
- **IA que inventa una cifra**: no pasa la comprobación contra la celda citada (RF-21).
- **IA que omite ítems**: el total leído no cuadra con el del Excel y aparece en el resumen (RF-33).

## Fuera de alcance

- El plan de trabajo semanal: spec 044. Aquí solo queda dicho que, cuando exista, manda sobre la meta estimada (RF-64).
- Registrar costos reales: nóminas, facturas o combustible. El «Faltó» o «Sobró» compara ejecutado contra programado a precio de costo; **no** mide lo que realmente se gastó.
- Medir el cumplimiento de los indirectos.
- Crear una planificación desde cero en pantalla, sin Excel.
- Leer planificaciones en `.xls`, PDF u otros formatos.
- Cargar más de un frente por obra, o combinar varios frentes en una sola planificación.
- Corregir valores de un borrador en pantalla: se arregla el Excel y se vuelve a subir.
- Reprogramar automáticamente lo que no se cumplió.
- Medir la ejecución de los rubros.
- APU por insumos, aunque el libro los traiga.
- Flujo de caja financiero: anticipos, préstamos, fiducia, ingresos por actas y amortización.
- Cronograma tipo Gantt y valor ganado.
- Congelar o firmar informes ya emitidos.
- Alertas o envíos automáticos por WhatsApp o correo.
- Cualquier cambio en el celular.

## Criterios de finalización

- Cada RF tiene cómo comprobarse: caso en `scripts/verificar-reglas.ts` (hallazgos, reparto semanal, versión que rige, cumplimiento y valores) o paso de demo manual.
- `npm run verificar`, `npm run typecheck` y `npm run lint` en verde.
- Demo manual del flujo principal:
  1. Cargar el presupuesto de Magdalena, guardado como `.xlsx`, y aprobarlo.
  2. Subir el V5 de planificación de Magdalena, escoger la hoja de Berrio, confirmar la línea base y las demás hojas, y revisar los hallazgos.
  3. Aprobar como Director de Proyectos, marcando los meses anteriores que ya cumplieron su meta.
  4. Con actividades de parte en una semana, abrir el informe semanal y el mensual, y comprobar meta estimada, ejecutado, porcentajes y valores.
  5. Comprobar que el Director de Obra ve la plata y baja el Excel, que el Residente no ve la plata en pantalla, descarga ni asistente pero sigue viendo los precios del presupuesto, y que un Almacenista es rechazado.
  - Comprobar también que una actividad registrada en Yondo no suma a las metas de Berrio.
  6. Aprobar una v2 y comprobar que los periodos anteriores siguen dando lo mismo.
  7. Anular con motivo y comprobar el aviso «Sin planificación aprobada» en los días nuevos.

## Dudas abiertas

Ninguna. Las aclaraciones y los huecos de la revisión se resolvieron el 2026-11-09 (D8–D29). D22–D29 son propuestas derivadas de la revisión y entran con la nueva aprobación de la spec.

### Decisiones de la entrevista y de la clarificación (2026-11-08 y 2026-11-09)

- D1: Sin plan semanal aprobado, la meta sale de repartir el mes entre sus días de lunes a sábado y se marca «estimada».
- D2: Ven la plata Gerencia, Director de Proyectos y Director de Obra. El Residente ve solo cantidades y porcentajes.
- D3: Los partes abiertos cuentan como ejecutado, con aviso.
- D4: Cada periodo se mide con la versión que regía entonces. Un periodo con cambio se parte por la fecha de aprobación.
- D5: Una planificación que no cuadra se aprueba con aviso confirmado. Lo que no tenga precio de costo sale aparte y nunca se inventa.
- D6: Los indirectos se muestran como programado, sin compararlos y sin sumarlos al «Faltó» o «Sobró». Sí se restan para llegar al resultado (D17).
- D7: El valor para informes es ejecutado × precio de costo de la planificación. No se piden datos nuevos.
- D8: La cantidad programada de cada mes es el valor del mes dividido entre el precio contractual del ítem (RF-16).
- D9: En Magdalena se carga solo el frente Berrio. No todos los libros son así: la forma depende de la obra (RF-100, RF-104).
- D10: Un costo por debajo de un peso cuenta como «sin precio de costo» (RF-32).
- D11: Un borrador se corrige arreglando el Excel y volviéndolo a subir, nunca en pantalla (RF-51).
- D12: Los días anteriores a la primera aprobación se miden con esa primera versión (RF-57), salvo los meses marcados como cumplidos (D16).
- D13: Los festivos no entran en el reparto de la meta semanal (RF-65).
- D14: El documento que importa es la planificación matriz o inicial que pone el Director de Proyectos, junto con el presupuesto (RF-101).
- D15: La línea base manda sobre la programación. El flujo de caja es para llevar el control del dinero (RF-102).
- D16: Al aprobar la primera planificación se pregunta, mes por mes, si la meta de los meses anteriores ya se cumplió; los marcados muestran «Meta cumplida» (RF-121 a RF-125).
- D17: El margen va antes de indirectos y el resultado después. En el resumen de la planificación se muestran con medida real y con medida contractual (RF-33, RF-111 a RF-113).
- D18: El informe semanal llega hasta el margen; el resultado después de indirectos sale solo en el mensual (RF-131, RF-132).
- D19: Los rubros entran en la planificación y en los informes, como programado y sin porcentaje (RF-108, RF-133 a RF-135).
- D20: El Residente sigue viendo los precios del presupuesto. El Excel original lo bajan la Gerencia y los directores (RF-50, RF-136).
- D21: La meta de cada periodo es fija hasta aprobar otra versión; lo no cumplido no se arrastra (RF-130).
- D22: Berrio y Yondo se distinguen por el grupo del presupuesto (RF-19, RF-105 a RF-107, RF-126).
- D23: Un borrador sustituido se conserva como descartado (RF-116).
- D24: Solo se anula la versión vigente, y el día de la aprobación ya cuenta con la versión nueva (RF-118, RF-120).
- D25: El plazo de RF-30 es la fecha de fin del contrato.
- D26: Las actividades sin capítulo salen como fuera de la planificación, marcadas (RF-127).
- D27: Los ítems sin precio de costo salen de todos los totales de plata, también del valor a cobrar (RF-81).
- D28: El precio contractual de los informes es el de la versión de planificación que rige (RF-77).
- D29: Si quien pregunta tiene todas las obras y no dice cuál, el asistente le pregunta la obra (RF-137).
- D30: La anulación rige desde ese mismo día, igual que una versión nueva desde el día en que se aprueba (RF-138). Decidido por Diego al planificar, 2026-11-09.
