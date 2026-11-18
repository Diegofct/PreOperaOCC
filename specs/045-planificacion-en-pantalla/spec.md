# Spec 045 — Planificación hecha en pantalla, con IA y costos indirectos

> Estado: **Cumplida** (validada el 2026-11-16, `validacion.md`) · Fecha: 2026-11-13 · Aprobada por Diego el 2026-11-13 (primera versión, con P1–P5); clarificación del mismo día resuelta con D11–D15 · Cambio del 2026-11-16: periodo deducido de los indirectos del Excel (RF-168 a RF-171, D17) · RF-15 precisado en la validación del 2026-11-16 · Primera de la tanda 045–048 (**modifica la 043**; es la base de la 048, que amarra las requisiciones a la planificación) · **Modificada por la spec 049** (2026-11-18): las descargas de la planificación (Excel y PDF) llevan Kontrola de autor y la línea «Generado con Kontrola · Grupo HS» al pie — ver `specs/049-marca-kontrola-y-logos/spec.md`

## Contexto y objetivo

Hoy la planificación de una obra solo entra al sistema como un Excel ya terminado: la IA lo lee, pero si algo está mal hay que arreglar el Excel y volverlo a subir, y de los costos indirectos solo queda un total por mes. Para armar ese Excel el Director de Proyectos parte del Presupuesto Oficial, digita a mano la medida real, la medida para costo, el precio de costo, cuántos meses dura cada ítem y en qué mes empieza, y desglosa los indirectos en siete conceptos (seguros y garantías, impuestos, maquinaria general de obra, instalaciones generales, varios, mano de obra indirecta y otros costos indirectos), cada uno con sus renglones y su fórmula. Esta spec permite hacer ese mismo trabajo dentro del panel: la IA propone el calendario del borrador a partir del presupuesto aprobado y del plazo que da el Director de Proyectos, él (o la Gerencia) corrige y digita en pantalla, el sistema calcula como el Excel, y la planificación aprobada sigue alimentando el cumplimiento (043) y el plan semanal (044). Con los indirectos por renglón, la 048 podrá amarrar cada requisición a lo que se planeó gastar.

## Usuarios / actores

- **Director de Proyectos** (panel web): crea el borrador (desde el presupuesto, desde su Excel o copiando la versión vigente), lo corrige en pantalla, lo aprueba y lo anula, en cualquier obra.
- **Gerencia** (panel web): puede lo mismo que el Director de Proyectos.
- **Director de Obra** (panel web): en sus obras ve la planificación aprobada, salvo el detalle de la mano de obra indirecta. No crea, no edita, no aprueba. Sobre la planificación aprobada hace su plan semanal (044).
- **Residente** (panel web): sin cambios respecto de la 043 (no ve la planificación).
- **Operador** (móvil): no cambia nada para él.
- **Los demás accesos**: sin acceso a la planificación, como en la 043.

## Historias de usuario

- H1: Como Director de Proyectos quiero que la IA me arme un borrador de planificación desde el presupuesto aprobado y el plazo que yo le doy, para no partir de una hoja en blanco.
- H2: Como Director de Proyectos quiero digitar y corregir en pantalla la medida real, la medida para costo, el precio de costo, los meses y el mes de inicio de cada ítem, para no tener que volver al Excel.
- H3: Como Director de Proyectos quiero llevar los siete costos indirectos renglón por renglón, con las mismas fórmulas del Excel, para saber de dónde sale cada peso.
- H4: Como Director de Proyectos quiero partir de mi Excel cuando ya lo tengo hecho, conservando su reparto y entrando también sus indirectos por renglón, para no digitar dos veces.
- H5: Como Gerencia quiero que no se pueda aprobar una planificación con ítems sin costo, para que el resultado de la obra nunca salga con huecos.
- H6: Como Directora de Obra quiero que mi plan semanal se apoye en la planificación aprobada, venga de donde venga, para planear la semana sobre lo que el Director de Proyectos decidió.

## Requisitos funcionales (criterios de aceptación en EARS)

### Plazo de la planificación (H1)

- RF-1: EL SISTEMA guarda en cada planificación un plazo total en meses.
- RF-2: EL SISTEMA guarda en cada planificación un mes de arranque.
- RF-3: EL SISTEMA cuenta el mes de arranque como el primer mes del plazo.
- RF-4: SI el plazo no es un número entero entre 1 y 120, ENTONCES EL SISTEMA lo rechaza explicando el motivo.
- RF-5: EL SISTEMA permite un mes de arranque anterior al mes en curso.
- RF-6: MIENTRAS una planificación esté en borrador, EL SISTEMA permite a una persona con acceso Director de Proyectos o Gerencia cambiar su plazo.
- RF-7: MIENTRAS una planificación esté en borrador, EL SISTEMA permite a una persona con acceso Director de Proyectos o Gerencia cambiar su mes de arranque.

### Crear el borrador desde el presupuesto (H1)

- RF-8: EL SISTEMA permite a una persona con acceso Director de Proyectos o Gerencia crear un borrador de planificación de una obra a partir de su presupuesto vigente.
- RF-9: SI la obra no tiene presupuesto vigente, ENTONCES EL SISTEMA no crea el borrador.
- RF-10: SI la obra no tiene presupuesto vigente, ENTONCES EL SISTEMA explica que primero hay que aprobar el presupuesto.
- RF-11: CUANDO se pide crear el borrador desde el presupuesto, EL SISTEMA exige el plazo.
- RF-12: CUANDO se pide crear el borrador desde el presupuesto, EL SISTEMA exige el mes de arranque.
- RF-13: SI el presupuesto tiene varios grupos, ENTONCES EL SISTEMA pide escoger el grupo (frente) que se planifica.
- RF-14: EL SISTEMA copia al borrador cada ítem del grupo escogido con su ítem de pago, descripción, unidad, cantidad contractual y precio contractual tal como están en el presupuesto.
- RF-15: EL SISTEMA copia al borrador cada rubro del presupuesto que sea del grupo (frente) escogido o de todo el contrato, con su descripción y su valor; los rubros de otro frente no se copian. *(Precisado el 2026-11-16 en la validación: la planificación es de un frente.)*
- RF-16: EL SISTEMA pone como medida real inicial de cada ítem su cantidad contractual.
- RF-17: EL SISTEMA deja vacío el precio de costo de cada ítem copiado del presupuesto.
- RF-18: EL SISTEMA deja vacío el costo de cada rubro copiado del presupuesto.

### La IA propone el calendario (H1)

- RF-19: CUANDO se crea el borrador desde el presupuesto, EL SISTEMA pide a la IA un mes de inicio y una cantidad de meses para cada ítem y cada rubro, dentro del plazo y desde el mes de arranque.
- RF-20: SI la IA propone un mes de inicio anterior al mes de arranque, ENTONCES EL SISTEMA descarta esa propuesta para ese ítem o rubro.
- RF-21: SI la IA propone un periodo que termina después del último mes del plazo, ENTONCES EL SISTEMA descarta esa propuesta para ese ítem o rubro.
- RF-22: SI se descarta la propuesta de un ítem o rubro, ENTONCES EL SISTEMA lo deja sin programación.
- RF-23: SI se descarta la propuesta de un ítem o rubro, ENTONCES EL SISTEMA lo marca para revisión.
- RF-24: SI la IA no responde o falla, ENTONCES EL SISTEMA crea el borrador con todos los ítems y rubros sin programación.
- RF-25: SI la IA no responde o falla, ENTONCES EL SISTEMA avisa en el borrador que la propuesta de la IA no se obtuvo.
- RF-26: EL SISTEMA muestra junto a la propuesta una explicación del orden escogido, redactada por la IA, de no más de 1 000 caracteres.
- RF-27: EL SISTEMA no toma de la IA cantidades, medidas, precios ni costos.
- RF-28: MIENTRAS la propuesta de la IA esté en curso en una obra, EL SISTEMA muestra en esa obra que la propuesta sigue en curso.
- RF-29: MIENTRAS la propuesta de la IA esté en curso en una obra, EL SISTEMA rechaza crear otro borrador en esa obra, desde el presupuesto o desde un Excel, explicando el motivo.
- RF-30: EL SISTEMA crea el borrador cuando la propuesta de la IA termina o falla, no antes.
- RF-31: EL SISTEMA continúa la propuesta de la IA aunque la persona cierre la página.

### Partir del Excel (H4)

- RF-32: EL SISTEMA conserva la creación del borrador desde un Excel de planificación tal como la define la 043.
- RF-33: CUANDO se crea un borrador desde un Excel, EL SISTEMA toma como mes de arranque el mes de inicio más temprano de sus ítems.
- RF-34: CUANDO se crea un borrador desde un Excel, EL SISTEMA toma como plazo los meses que van desde el mes de arranque hasta el último mes con programación.
- RF-35: CUANDO se crea un borrador desde un Excel, EL SISTEMA guarda como meses fijados los valores mes a mes que trae el Excel para cada ítem y cada rubro.
- RF-36: CUANDO se lee un Excel de planificación, EL SISTEMA lee los renglones de cada uno de los siete conceptos de costo indirecto.
- RF-37: CUANDO se lee un renglón indirecto de un Excel, EL SISTEMA guarda como meses fijados los valores mes a mes que trae el Excel para ese renglón.
- RF-38: EL SISTEMA exige que cada cifra de un renglón indirecto leída por la IA cite su hoja y su fila.
- RF-39: SI la celda citada no contiene la cifra leída, ENTONCES EL SISTEMA descarta esa cifra.
- RF-40: SI se descarta una cifra de un renglón indirecto, ENTONCES EL SISTEMA marca ese renglón para revisión.
- RF-41: SI un renglón indirecto del Excel no se ajusta a ninguna de las formas de cálculo de RF-74 a RF-77, ENTONCES EL SISTEMA lo guarda como valor fijo con el total que trae el Excel.
- RF-42: SI un renglón indirecto del Excel se guarda como valor fijo por no ajustarse a ninguna forma, ENTONCES EL SISTEMA lo marca para revisión.
- RF-43: SI el total que el sistema calcula para un concepto indirecto difiere del total que trae el Excel para ese concepto, ENTONCES EL SISTEMA muestra la diferencia en el resumen del borrador.
- RF-168: SI un renglón indirecto del Excel no trae valores mes a mes, ENTONCES EL SISTEMA le pone como periodo el mes de arranque del plazo y la cantidad de meses de su fórmula redondeada hacia arriba, o todo el plazo si su fórmula no tiene meses, y lo reparte en partes iguales (D17).
- RF-169: CUANDO el sistema pone el periodo de un renglón indirecto según RF-168, EL SISTEMA lo muestra con el aviso «Periodo deducido» y no lo marca para revisión por ese motivo.
- RF-170: EL SISTEMA incluye en los hallazgos los renglones indirectos con periodo deducido, aparte de los marcados para revisión.
- RF-171: CUANDO se cambia el mes de inicio o la cantidad de meses de un renglón con periodo deducido, EL SISTEMA le quita el aviso «Periodo deducido».
- RF-44: EL SISTEMA permite editar en pantalla un borrador nacido de un Excel igual que uno nacido del presupuesto.
- RF-45: CUANDO se edita en pantalla un borrador nacido de un Excel, EL SISTEMA muestra que sus valores ya no coinciden necesariamente con el Excel original.

### Editar el borrador en pantalla (H2)

- RF-46: MIENTRAS una planificación esté en borrador, EL SISTEMA permite a una persona con acceso Director de Proyectos o Gerencia cambiar la medida real de cada ítem.
- RF-47: MIENTRAS una planificación esté en borrador, EL SISTEMA permite a una persona con acceso Director de Proyectos o Gerencia cambiar la medida para costo de cada ítem.
- RF-48: MIENTRAS una planificación esté en borrador, EL SISTEMA permite a una persona con acceso Director de Proyectos o Gerencia cambiar el precio de costo de cada ítem.
- RF-49: MIENTRAS una planificación esté en borrador, EL SISTEMA permite a una persona con acceso Director de Proyectos o Gerencia cambiar el costo de cada rubro.
- RF-50: MIENTRAS una planificación esté en borrador, EL SISTEMA permite a una persona con acceso Director de Proyectos o Gerencia cambiar el mes de inicio de cada ítem y de cada rubro.
- RF-51: MIENTRAS una planificación esté en borrador, EL SISTEMA permite a una persona con acceso Director de Proyectos o Gerencia cambiar la cantidad de meses de cada ítem y de cada rubro.
- RF-52: EL SISTEMA no permite cambiar en la planificación el ítem de pago, la descripción, la unidad, la cantidad contractual ni el precio contractual de un ítem.
- RF-53: EL SISTEMA no permite cambiar en la planificación la descripción ni el valor de un rubro.
- RF-54: SI se digita una medida, un precio, un costo o un valor negativo, ENTONCES EL SISTEMA lo rechaza explicando el motivo.
- RF-55: SI se digita una cantidad de meses que no es un número entero mayor que cero, ENTONCES EL SISTEMA la rechaza explicando el motivo.
- RF-56: CUANDO cambia un valor del borrador, EL SISTEMA muestra recalculados los importes, el reparto mensual, los indirectos, el resumen y los hallazgos sin esperar a que se guarde.
- RF-57: CUANDO se guarda un borrador, EL SISTEMA recalcula por regla todos los importes, repartos y totales, sin tomar ningún total enviado desde la pantalla.
- RF-58: SI otra persona guardó el mismo borrador después de que se abrió, ENTONCES EL SISTEMA rechaza el guardado.
- RF-59: SI se rechaza un guardado porque otra persona guardó antes, ENTONCES EL SISTEMA ofrece volver a cargar el borrador.
- RF-60: CUANDO se guarda un borrador, EL SISTEMA registra quién lo guardó y cuándo.

### Medida para costo (H2)

- RF-61: MIENTRAS la medida para costo de un ítem sea igual a su medida real, EL SISTEMA cambia también la medida para costo cuando cambia la medida real.
- RF-62: MIENTRAS la medida para costo de un ítem sea distinta de su medida real, EL SISTEMA la conserva cuando cambia la medida real.
- RF-63: MIENTRAS la medida para costo de un ítem sea distinta de su medida real, EL SISTEMA muestra el ítem con la marca «Costo con otra medida».
- RF-64: SI la medida para costo de un ítem está vacía, ENTONCES EL SISTEMA usa su medida real como medida para costo, como en la 043 (su RF-140).

### Cálculos por ítem y por rubro, como el Excel (H2)

- RF-65: EL SISTEMA calcula para cada ítem el importe contractual como su cantidad contractual por su precio contractual.
- RF-66: EL SISTEMA calcula para cada ítem el importe real como su medida real por su precio contractual.
- RF-67: EL SISTEMA calcula para cada ítem el importe a costo como su medida para costo por su precio de costo.
- RF-68: EL SISTEMA toma como importe real de cada rubro su valor, y como importe a costo de cada rubro su costo.
- RF-69: EL SISTEMA calcula el importe real total como la suma de los importes reales de ítems y rubros.
- RF-70: EL SISTEMA calcula el factor de indirectos como uno más el total de costos indirectos dividido entre la suma de los importes a costo de ítems y rubros.
- RF-71: EL SISTEMA calcula para cada ítem y cada rubro el importe a costo con indirectos como su importe a costo por el factor de indirectos.
- RF-72: EL SISTEMA calcula para cada ítem y cada rubro su resultado como su importe real menos su importe a costo con indirectos.
- RF-73: SI la suma de los importes a costo de ítems y rubros es cero, ENTONCES EL SISTEMA muestra el factor de indirectos como «sin dato» en lugar de un número.

### Formas de cálculo de los indirectos (H3)

- RF-74: EL SISTEMA calcula un renglón indirecto de forma **valor fijo** como el valor digitado.
- RF-75: EL SISTEMA calcula un renglón indirecto de forma **porcentaje** como el porcentaje digitado por el importe real total.
- RF-76: EL SISTEMA calcula un renglón indirecto de forma **mensual** como cantidad por (valor mensual más valor mensual adicional) por cantidad de meses.
- RF-77: EL SISTEMA calcula un renglón indirecto de forma **personal** como (salario por el factor prestacional más acomodación más viáticos) por dedicación por cantidad de meses.
- RF-78: EL SISTEMA exige a cada renglón indirecto una descripción.
- RF-79: EL SISTEMA exige a cada renglón indirecto una de las cuatro formas de cálculo.

### Costos indirectos por renglón (H3)

Esta sección sustituye el RF-17 de la 043 («guarda los indirectos programados por mes») en lo que toca al detalle.

- RF-80: EL SISTEMA agrupa los costos indirectos en siete conceptos: seguros y garantías, impuestos, maquinaria general de obra, instalaciones generales, varios, mano de obra indirecta y otros costos indirectos.
- RF-81: MIENTRAS una planificación esté en borrador, EL SISTEMA permite a una persona con acceso Director de Proyectos o Gerencia añadir renglones a cada concepto.
- RF-82: MIENTRAS una planificación esté en borrador, EL SISTEMA permite a una persona con acceso Director de Proyectos o Gerencia cambiar cualquier renglón indirecto.
- RF-83: MIENTRAS una planificación esté en borrador, EL SISTEMA permite a una persona con acceso Director de Proyectos o Gerencia quitar cualquier renglón indirecto.
- RF-84: EL SISTEMA trata el quitar un renglón de un borrador como parte de la edición del borrador, sin conservarlo aparte, porque un borrador no es evidencia.
- RF-85: EL SISTEMA guarda de cada renglón indirecto, salvo los de porcentaje, un mes de inicio y una cantidad de meses.
- RF-86: EL SISTEMA guarda en cada planificación su propio factor prestacional.
- RF-87: EL SISTEMA guarda en cada planificación su propio recargo de horas extras.
- RF-88: CUANDO se crea un borrador sin copiar indirectos, EL SISTEMA pone como factor prestacional 1,2295.
- RF-89: CUANDO se crea un borrador sin copiar indirectos, EL SISTEMA pone como recargo de horas extras 0,16.
- RF-90: MIENTRAS una planificación esté en borrador, EL SISTEMA permite a una persona con acceso Director de Proyectos o Gerencia cambiar su factor prestacional.
- RF-91: MIENTRAS una planificación esté en borrador, EL SISTEMA permite a una persona con acceso Director de Proyectos o Gerencia cambiar su recargo de horas extras.
- RF-92: EL SISTEMA permite marcar un renglón de personal como operativo.
- RF-93: EL SISTEMA calcula los renglones de personal operativos con el factor prestacional más el recargo de horas extras.
- RF-94: EL SISTEMA calcula el total de cada concepto como la suma de sus renglones.
- RF-95: EL SISTEMA calcula el total de costos indirectos como la suma de los siete conceptos.

### Reparto mensual (H2, H3, H4)

- RF-96: EL SISTEMA reparte el importe real de cada ítem y de cada rubro entre los meses de su periodo, que empieza en su mes de inicio y dura su cantidad de meses.
- RF-97: EL SISTEMA reparte el total de cada renglón indirecto de valor fijo, mensual o personal entre los meses de su periodo.
- RF-98: MIENTRAS una planificación esté en borrador, EL SISTEMA permite fijar a mano el valor de cualquier mes dentro del periodo de un ítem, de un rubro o de un renglón indirecto que no sea de porcentaje.
- RF-99: EL SISTEMA reparte en partes iguales, entre los meses del periodo que no estén fijados, el total menos la suma de los meses fijados.
- RF-100: SI los meses fijados suman más que el total, ENTONCES EL SISTEMA lo marca como hallazgo.
- RF-101: SI todos los meses del periodo están fijados y no suman el total, ENTONCES EL SISTEMA lo marca como hallazgo.
- RF-102: EL SISTEMA ofrece en cada ítem, rubro y renglón con meses fijados la acción «Repartir en partes iguales», que quita todos sus meses fijados.
- RF-103: CUANDO cambia el mes de inicio o la cantidad de meses, EL SISTEMA descarta los meses fijados que quedan fuera del nuevo periodo.
- RF-104: CUANDO se descartan meses fijados por cambio de periodo, EL SISTEMA avisa cuáles se descartaron.
- RF-105: EL SISTEMA reparte el total de un renglón indirecto de porcentaje en cada mes en proporción al importe real programado de ítems y rubros en ese mes.
- RF-106: SI ningún ítem ni rubro tiene programación, ENTONCES EL SISTEMA reparte los renglones de porcentaje en partes iguales entre los meses del plazo.
- RF-107: SI ningún ítem ni rubro tiene programación, ENTONCES EL SISTEMA lo marca como hallazgo.
- RF-108: EL SISTEMA obtiene la cantidad programada de cada mes de un ítem dividiendo el valor del mes entre su precio contractual, como en la 043 (su RF-16).
- RF-109: EL SISTEMA reparte el importe a costo de cada ítem y de cada rubro en los mismos meses y en la misma proporción que su importe real.
- RF-110: SI un ítem tiene precio contractual cero, ENTONCES EL SISTEMA reparte su importe a costo en partes iguales entre los meses de su periodo.
- RF-111: SI un ítem tiene precio contractual cero, ENTONCES EL SISTEMA no le asigna cantidad programada en ningún mes.

### Indirectos copiados de otra planificación (H3)

- RF-112: CUANDO se crea un borrador desde el presupuesto, EL SISTEMA permite escoger una planificación vigente o reemplazada, de esa obra o de otra, de la cual copiar los renglones indirectos.
- RF-113: EL SISTEMA no ofrece para copiar indirectos una planificación que solo tenga «Indirectos sin desglose» (RF-140).
- RF-114: CUANDO se copian renglones indirectos, EL SISTEMA copia de cada uno su concepto, descripción, forma de cálculo, valores y marca para revisión.
- RF-115: CUANDO se copian renglones indirectos, EL SISTEMA copia también el factor prestacional y el recargo de horas extras.
- RF-116: CUANDO se copian renglones indirectos, EL SISTEMA pone como mes de inicio de cada renglón el mes de arranque del borrador nuevo.
- RF-117: CUANDO se copian renglones indirectos, EL SISTEMA no copia sus meses fijados.
- RF-118: SI un renglón copiado dura más meses que el plazo del borrador nuevo, ENTONCES EL SISTEMA reduce su cantidad de meses al plazo.
- RF-119: SI se reduce la cantidad de meses de un renglón copiado, ENTONCES EL SISTEMA lo marca para revisión.
- RF-120: SI no se escoge ninguna planificación para copiar, ENTONCES EL SISTEMA crea el borrador sin renglones indirectos.
- RF-121: EL SISTEMA muestra en el borrador de cuál planificación se copiaron los indirectos.

### Resumen y hallazgos (H2, H5)

- RF-122: EL SISTEMA muestra en el resumen del borrador el total contractual, el importe real total, el total a costo, el total de indirectos, el factor de indirectos y el resultado.
- RF-123: EL SISTEMA muestra en el resumen el total de cada concepto indirecto y su reparto por mes.
- RF-124: EL SISTEMA aplica al borrador los hallazgos de la 043 (sus RF-25 a RF-31).
- RF-125: SI un ítem, un rubro o un renglón indirecto tiene programación después del último mes del plazo, ENTONCES EL SISTEMA lo marca como hallazgo.
- RF-126: EL SISTEMA incluye en los hallazgos los ítems, rubros y renglones marcados para revisión.

### Aprobar (H5)

Esta sección endurece el RF-34 de la 043 («permite aprobar con hallazgos») para los huecos de costo, medida y programación, también en los borradores nacidos de un Excel.

- RF-127: SI algún ítem con medida real mayor que cero no tiene precio de costo, ENTONCES EL SISTEMA no permite aprobar.
- RF-128: SI algún rubro con valor mayor que cero no tiene costo, ENTONCES EL SISTEMA no permite aprobar.
- RF-129: SI algún ítem no tiene medida real, ENTONCES EL SISTEMA no permite aprobar.
- RF-130: SI algún ítem con medida real mayor que cero o algún rubro con valor mayor que cero no tiene programación, ENTONCES EL SISTEMA no permite aprobar.
- RF-131: SI algún renglón indirecto tiene su total sin calcular por faltarle un valor, ENTONCES EL SISTEMA no permite aprobar.
- RF-132: CUANDO el sistema no permite aprobar, EL SISTEMA lista los ítems, rubros y renglones que lo impiden.
- RF-133: EL SISTEMA considera sin precio de costo un ítem o un rubro cuyo costo está vacío, en cero o por debajo de un peso, como en la 043 (su RF-32).
- RF-134: EL SISTEMA permite aprobar con los demás hallazgos, con la confirmación única de la 043 (su RF-35).
- RF-135: EL SISTEMA permite aprobar únicamente a una persona con acceso Director de Proyectos o Gerencia.
- RF-136: SI una persona aprueba un borrador que cambió después de que ella lo abrió, ENTONCES EL SISTEMA avisa que cambió, sin aprobarlo, como en la 043 (su RF-99).
- RF-137: CUANDO se aprueba una planificación, EL SISTEMA deja de permitir cambios en ella, incluidos su factor prestacional y su recargo de horas extras.

### Versiones (H5)

- RF-138: EL SISTEMA permite a una persona con acceso Director de Proyectos o Gerencia crear un borrador nuevo copiando la versión vigente.
- RF-139: CUANDO se crea un borrador copiando la vigente, EL SISTEMA copia su plazo, su mes de arranque, sus ítems, sus rubros, sus valores, sus meses fijados, sus renglones indirectos, su factor prestacional y su recargo de horas extras.
- RF-140: SI la versión copiada solo tiene sus indirectos como un total por mes, ENTONCES EL SISTEMA los copia como un único renglón «Indirectos sin desglose» con sus valores mes a mes fijados.
- RF-141: EL SISTEMA marca para revisión el renglón «Indirectos sin desglose».
- RF-142: SI la obra ya tiene un borrador, ENTONCES EL SISTEMA pide confirmar antes de sustituirlo, como en la 043 (su RF-43).
- RF-143: CUANDO se sustituye un borrador, EL SISTEMA lo conserva como descartado, como en la 043 (su RF-116).
- RF-144: EL SISTEMA numera, aprueba, reemplaza, anula y aplica por periodo las planificaciones hechas en pantalla igual que las nacidas de un Excel, según los RF-41 a RF-50 y RF-52 a RF-57 de la 043.

### Planificaciones anteriores a esta spec

- RF-145: EL SISTEMA muestra los indirectos de una planificación que solo los tiene como total por mes en un único renglón «Indirectos sin desglose», con sus valores mes a mes.
- RF-146: EL SISTEMA no cambia ninguna cifra de los informes de una planificación aprobada antes de esta spec.

### Origen y descargas

- RF-147: EL SISTEMA muestra en cada planificación si nació del presupuesto, de un Excel o de copiar otra versión, y en este último caso de cuál.
- RF-148: DONDE una versión nació de un Excel, EL SISTEMA conserva y deja descargar ese Excel original desde esa versión, como en la 043 (su RF-50).
- RF-149: DONDE una versión no nació de un Excel, EL SISTEMA no ofrece en ella la descarga de un Excel original.

### Quién ve qué

- RF-150: EL SISTEMA muestra los renglones indirectos, con todos sus valores, únicamente a Gerencia, Director de Proyectos y Director de Obra en sus obras, salvo lo que dice RF-151.
- RF-151: EL SISTEMA muestra al Director de Obra únicamente el total y el reparto mensual del concepto mano de obra indirecta, sin sus renglones.
- RF-152: EL SISTEMA aplica RF-151 en pantalla, en las descargas y en el asistente.
- RF-153: EL SISTEMA muestra a Gerencia y al Director de Proyectos los renglones de mano de obra indirecta con todos sus valores.
- RF-154: EL SISTEMA no muestra la planificación al Residente ni a los demás accesos, como en la 043.

### Plan semanal y cumplimiento (H6)

- RF-155: EL SISTEMA mide el cumplimiento de la 043 con una planificación hecha en pantalla igual que con una nacida de un Excel.
- RF-156: EL SISTEMA propone el plan semanal de la 044 con la programación de la planificación vigente, cualquiera que sea su origen.
- RF-157: EL SISTEMA toma como indirectos programados del mes, para el resultado de los informes de la 043, la suma de los siete conceptos en ese mes.
- RF-158: EL SISTEMA muestra en el informe mensual de la 043 los indirectos programados del mes desglosados por concepto.
- RF-159: EL SISTEMA no mide el cumplimiento de los rubros, como en la 043 (su RF-134).

### Rubros programados en una sola línea (D16)

- RF-163: DONDE el Excel programe los rubros juntos en una sola línea, EL SISTEMA considera esa línea como la programación de esos rubros.
- RF-164: DONDE los rubros estén programados en una sola línea, EL SISTEMA guarda los meses de esa línea como meses fijados.
- RF-165: MIENTRAS una planificación esté en borrador, EL SISTEMA permite editar la línea de rubros como un solo renglón de calendario.
- RF-166: MIENTRAS una planificación esté en borrador, EL SISTEMA permite pedir «Programar por rubro» sobre la línea de rubros.
- RF-167: CUANDO se pide «Programar por rubro», EL SISTEMA quita la línea de rubros y deja cada rubro sin programación, para darle su propio calendario.

### Reglas transversales

- RF-160: EL SISTEMA calcula todos los importes, factores, repartos y totales por regla, nunca por la IA.
- RF-161: EL SISTEMA redondea los importes en pesos solo al mostrarlos, y suma con los valores sin redondear.
- RF-162: EL SISTEMA no borra nunca una planificación ni ninguna parte de una versión aprobada.

## Superficies afectadas

- [ ] **Móvil** — sin cambios.
- [x] **Panel web** — planificación de la obra: crear desde el presupuesto (plazo, arranque, grupo, indirectos a copiar), propuesta en curso, editor del borrador (ítems, rubros, medidas, costos, calendario, meses fijados, indirectos por concepto, factor prestacional), resumen y hallazgos, nueva versión copiando la vigente; informe mensual con indirectos por concepto.
- [x] **API** — rutas del panel de planificación: crear desde presupuesto con propuesta por detrás, guardar el borrador, copiar indirectos, nueva versión; la lectura del Excel con indirectos por renglón; descargas y asistente con la restricción de mano de obra indirecta.
- [ ] **Sincronización** — sin cambios.
- [x] **Datos** — la planificación deja de exigir un Excel de origen; plazo y mes de arranque; rubros con costo y calendario; renglones indirectos por concepto con su forma; meses fijados; factor prestacional y recargo; origen.
- [x] **Reglas** — cálculos por ítem y rubro, reparto con meses fijados, formas de los indirectos, reparto de porcentajes, condiciones para aprobar, validación de la propuesta de la IA, lectura de indirectos del Excel (casos nuevos en `verificar-reglas.ts`).

## Requisitos no funcionales

- La propuesta de la IA para un presupuesto de hasta 200 ítems no se corta por tiempo y muestra que sigue en curso mientras dura.
- El recálculo en pantalla tras cambiar un valor se ve en menos de 1 segundo con 200 ítems y 200 renglones indirectos.
- Con el Excel `Planificación CONSORCIO MAGADALENA 787 V2 OPC 8` leído, el total de cada concepto indirecto, el total a costo y el factor de indirectos coinciden con los del Excel con una diferencia menor a un peso, sin contar los renglones marcados para revisión; esos renglones suman menos del 25 % del total de indirectos del Excel. Los de periodo deducido (RF-168, RF-169) no cuentan como marcados: sus cifras cuadran con el libro y solo su calendario es supuesto. *(Hasta el 2026-11-16 el umbral era el 5 %; medido, el 20,4 % son renglones que el libro calcula con meses con decimales o sin una de las cuatro formas, y que entran como valor fijo por RF-41 y RF-42.)*
- Interfaz en español; panel de escritorio con los tokens del tema.

## Casos límite

- **Sin señal**: no aplica; es solo del panel web.
- **Evidencia firmada**: una planificación aprobada no se edita; se corrige con una versión nueva copiando la vigente o se anula con motivo (043). Lo que ya se midió con una versión sigue midiéndose con ella, y las aprobadas antes de esta spec no cambian sus cifras (RF-146).
- **Primer arranque / equipo recién activado**: no aplica al móvil. Si en todo el sistema no hay ninguna planificación con indirectos desglosados, no hay de dónde copiarlos y el borrador arranca sin ellos (RF-113, RF-120).

Y los del caso concreto:

- **Excel con costos de relleno** (los 12 ítems del V5 de Magdalena, ~43 % del valor): ya no se aprueba hasta digitar esos costos en pantalla (RF-127, RF-133); antes se aprobaba con aviso porque no había cómo corregirlos.
- **Ítems sin precio contractual con costo** (35.1 y 35.2 del V5): su costo se reparte en partes iguales y no tienen cantidad programada (RF-110, RF-111).
- **Obra ya empezada**: el mes de arranque puede ser pasado (RF-5); al aprobar la primera versión aplica la pregunta de meses ya cumplidos de la 043 (su RF-121).
- **Plazo más corto que un ítem**: la IA no puede proponer fuera del plazo (RF-21); si el Director de Proyectos alarga el ítem a mano, sale como hallazgo y no bloquea (RF-125).
- **Presupuesto aprobado de nuevo con el borrador abierto**: aplica el aviso de la 043 (su RF-40) al aprobar.
- **Dos personas editando el mismo borrador**: la segunda que guarda recibe el aviso y vuelve a cargar (RF-58, RF-59); quien aprueba sobre una copia vieja recibe el aviso de RF-136.
- **La IA tarda o la página se cierra**: la propuesta sigue y el borrador aparece al terminar (RF-30, RF-31); mientras tanto no se puede crear otro en esa obra (RF-29).
- **Ítem con medida real cero**: no exige costo ni programación (RF-127, RF-130).
- **Renglón de porcentaje sin nada programado**: se reparte en partes iguales en el plazo, con hallazgo (RF-106, RF-107).
- **Mes fijado que queda fuera del periodo**: se descarta con aviso (RF-103, RF-104).
- **Planificación vieja con indirectos en un solo total**: se ve como «Indirectos sin desglose»; al sacar versión nueva se copia marcada para revisión y se puede aprobar con ella como hallazgo (RF-140, RF-141, RF-145).

## Fuera de alcance

- Que la IA proponga precios de costo, medidas o valores de indirectos (solo propone el calendario).
- Cambiar en la planificación los ítems, unidades, cantidades, precios o rubros del presupuesto: eso es del módulo Contrato y Presupuesto.
- Planificar varios frentes en una sola planificación (sigue la decisión de un frente de la 043).
- Descargar la planificación hecha en pantalla con el formato del Excel del Director de Proyectos.
- Sustituir meses ya transcurridos por lo realmente ejecutado dentro de la planificación (el cumplimiento de la 043 ya compara contra lo ejecutado).
- Hojas auxiliares del Excel (costo de subbase, concretos, anticipo, horas extras): no se leen.
- Desglosar automáticamente el renglón «Indirectos sin desglose» de las planificaciones viejas.
- Medir el cumplimiento de los indirectos o de los rubros.
- Cambios en el plan semanal (044) más allá de RF-156.
- Amarrar requisiciones a la planificación (spec 048).

## Criterios de finalización

- Cada RF de cálculo (RF-61 a RF-77, RF-85 a RF-111, RF-127 a RF-133, RF-140) y la validación de la propuesta de la IA (RF-20 a RF-23, RF-27) tienen su caso en `scripts/verificar-reglas.ts`, incluido uno que reproduce un ítem, un rubro y cada forma de indirecto del Excel V2 OPC 8.
- `npm run verificar`, `npm run typecheck` y `npm run lint` en verde.
- Demo manual del presupuesto: en una obra de prueba con presupuesto vigente, el Director de Proyectos crea el borrador con 16 meses y mes de arranque, copia los indirectos de otra planificación, ve la propuesta de la IA en curso y luego el borrador, digita costos de ítems y rubros, fija un mes, intenta aprobar con un ítem sin costo (rechazado), lo completa y aprueba; el Director de Obra la ve sin los renglones de mano de obra indirecta y propone un plan semanal sobre ella; se crea una versión nueva copiando la vigente.
- Demo manual del Excel: se sube el Excel V2 OPC 8, entran los indirectos por renglón con su reparto del Excel, el resumen compara contra los totales del Excel, se digitan los costos que faltan, se corrige un valor en pantalla, se usa «Repartir en partes iguales» y se aprueba.
- Demo manual de una planificación vieja: una aprobada con la 043 sigue dando las mismas cifras y muestra «Indirectos sin desglose»; su versión nueva lo trae marcado para revisión.

## Cambios a la 043

Esta spec modifica la 043 (se anota en su encabezado):

- Deroga su RF-51 y su decisión D11: el borrador sí se edita en pantalla.
- Retira de su «Fuera de alcance» «Crear una planificación desde cero en pantalla, sin Excel» y «Corregir valores de un borrador en pantalla».
- Sustituye su RF-17 en lo que toca al detalle de los indirectos (RF-80 a RF-95, RF-157, RF-158).
- Endurece su RF-34 y su D5 para los huecos de costo, medida y programación (RF-127 a RF-133).
- Amplía su RF-15: la programación también se digita en pantalla, con meses fijados (RF-96 a RF-111).

## Dudas abiertas

Ninguna. Las tres de la entrevista y las cinco de fondo de la clarificación las resolvió Diego el 2026-11-13 (D8 a D15).

### Decisiones de la entrevista (2026-11-13)

- **D1**: La IA no propone el calendario sola: el Director de Proyectos da el plazo total y el mes de arranque, y la IA reparte los ítems dentro de ese plazo (RF-11, RF-12, RF-19).
- **D2**: El precio de costo queda vacío hasta que el Director de Proyectos lo digite; la IA nunca lo propone (RF-17, RF-27).
- **D3**: No se aprueba con ítems sin precio de costo o sin medida real (RF-127, RF-129).
- **D4**: Los indirectos de un borrador nuevo se copian de una planificación aprobada que escoja el Director de Proyectos; si no escoge, arranca vacío (RF-112 a RF-121).
- **D5**: Reparto mensual en partes iguales; se puede fijar un mes a mano y el resto se reparte entre los meses que quedan (RF-96 a RF-99).
- **D6**: Del Excel se leen también los indirectos por renglón, citando la fila, y se comparan contra los totales del Excel (RF-36 a RF-43).
- **D7** (de la tanda, 13-nov): se mantiene subir el Excel como punto de partida; los indirectos van por renglón con las fórmulas del Excel.
- **D8**: Los indirectos de porcentaje se reparten mes a mes en proporción a lo que se programa facturar ese mes, porque se descuentan con cada acta de cobro (RF-105).
- **D9**: El factor prestacional y el recargo de horas extras son de cada planificación: arrancan en 1,2295 y 0,16, se cambian en el borrador, se copian con los indirectos y la versión aprobada conserva los suyos (RF-86 a RF-93, RF-115, RF-137).
- **D10**: El Director de Obra ve completos todos los conceptos indirectos menos la mano de obra indirecta, de la que ve solo el total y su reparto mensual, en pantalla, descargas y asistente (RF-150 a RF-153).

### Decisiones de la clarificación (2026-11-13)

- **D11**: El reparto mes a mes que trae el Excel, de ítems, rubros e indirectos, entra como meses fijados; el sistema no lo rehace solo, y hay un «Repartir en partes iguales» por ítem (RF-35, RF-37, RF-102).
- **D12**: Un Excel con costos de relleno no se aprueba hasta digitar esos costos en pantalla (RF-127, RF-133).
- **D13**: Los rubros del presupuesto entran al borrador con su valor; el Director de Proyectos les digita costo y calendario; suman a la base de los porcentajes; no se miden en el cumplimiento (RF-15, RF-18, RF-49 a RF-51, RF-68 a RF-69, RF-128, RF-159).
- **D14**: La medida para costo sigue a la medida real mientras sean iguales; si es distinta se respeta y se marca; vacía equivale a la real (RF-61 a RF-64).
- **D15**: Las planificaciones aprobadas antes de esta spec muestran un renglón «Indirectos sin desglose» y no cambian sus cifras; su versión nueva lo trae marcado para revisión y no sirven de base para copiar indirectos (RF-113, RF-140, RF-141, RF-145, RF-146).
- **D16** (al planificar, 2026-11-13): los rubros que el Excel programa juntos en una sola línea («Componentes» en Magdalena) quedan programados por esa línea, que se edita como un solo renglón; a cada rubro se le digita su costo; «Programar por rubro» deshace la línea (RF-163 a RF-167).

### Decisión del cambio (2026-11-16)

- **D17**: Un renglón indirecto del Excel sin meses del libro arranca en el mes de arranque, dura los meses de su fórmula redondeados hacia arriba (6,5 pasa a 7) o todo el plazo si no los tiene, y se reparte en partes iguales. No se marca para revisión: lleva el aviso «Periodo deducido», que es hallazgo y no impide aprobar, y se quita al cambiarle el periodo. Los marcados para revisión del V2 OPC 8 pasan de tener que sumar menos del 5 % a menos del 25 % (RF-168 a RF-171).

### Propuestas mías, por revisar

- **P1** (RF-24): si la IA falla, el borrador se crea igual sin programación. *(Aprobada con la spec.)*
- **P2** (RF-74 a RF-77): las cuatro formas de cálculo cubren las fórmulas del Excel V2 OPC 8; las variantes que no encajan entran como valor fijo marcado para revisión (RF-41, RF-42). *(Aprobada con la spec.)*
- **P3** (RF-116, RF-118): al copiar indirectos, todos arrancan en el mes de arranque nuevo y se recortan al plazo. *(Aprobada con la spec.)*
- **P4** (RF-130, RF-131): tampoco se aprueba con ítems sin programación ni renglones indirectos incompletos. *(Aprobada con la spec.)*
- **P5** (RF-125): programado fuera del plazo es hallazgo y no bloquea. *(Aprobada con la spec.)*
- **P6** (RF-1 a RF-7, RF-33, RF-34): el plazo y el mes de arranque se guardan y se editan en el borrador; el mes de arranque es el mes 1; tope de 120 meses; en un Excel se deducen de su programación.
- **P7** (RF-99): al fijar un mes, lo que falta se reparte entre *todos* los meses no fijados del periodo, anteriores y siguientes.
- **P8** (RF-110, RF-111): un ítem sin precio contractual reparte su costo en partes iguales y no tiene cantidad programada.
- **P9** (RF-106, RF-107): sin nada programado, los porcentajes se reparten en partes iguales en el plazo, con hallazgo.
- **P10** (RF-112, RF-114, RF-117): se copian indirectos de planificaciones vigentes o reemplazadas (no anuladas ni descartadas), con su marca para revisión y sin sus meses fijados.
- **P11** (RF-139, RF-148): la versión nueva copia todo; el Excel original se sigue bajando desde la versión que lo trae.
- **P12** (RF-158): el informe mensual muestra los indirectos por concepto.
- **P13** (RF-28 a RF-31): el borrador nace cuando la IA termina; mientras tanto no se crea otro en esa obra, y cerrar la página no la detiene.
