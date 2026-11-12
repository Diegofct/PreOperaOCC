# Validación — Spec 044, Plan de trabajo semanal

> Fecha: 2026-11-12 · Tarea T26 · Base: desarrollo (`neondb`), obra `PRUEBA-043 Magdalena`, con la planificación de Magdalena aprobada.

## Comandos, ejecutados de verdad

```
$ npm run verificar
864 verificaciones correctas.
(salida 0; 53 pruebas «044/», y todas las de la 043 siguen en verde)

$ npm run typecheck
> tsc --noEmit && tsc --noEmit -p tsconfig.scripts.json
(salida 0, sin errores)

$ npm run lint
> expo lint
(salida 0, sin avisos)
```

Fugas (T25): `npx expo export --platform web` termina; `grep -r "DATABASE_URL" dist/client` sale vacío, y
tampoco aparecen `ANTHROPIC_API_KEY`, `R2_LLAVE_SECRETA` ni `SECRETO_TOKENS`; `dist` borrado. La migración
`0043` está presente y aplicada **solo en desarrollo**.

## Requisito por requisito

107 RF. 83 tienen al menos una prueba automática «044/» en `scripts/verificar-reglas.ts`; los 24 restantes
se comprobaron contra el servidor, en el navegador o en el código, en la tarea que se cita, con el
resultado anotado en las notas de ejecución de `tareas.md`. Ninguno queda sin cubrir.

| RF | Requisito | Qué lo cubre | Resultado |
| --- | --- | --- | --- |
| RF-1 | EL SISTEMA organiza los planes semanales por obra y por semana de lunes a domingo. | 12 pruebas «044/» · Tareas T2, T5, T7, T8, T10, T12, T15, T16, T17, T18, T19, T20, T21, T22, T23 | verde |
| RF-2 | EL SISTEMA permite armar el plan de la semana en curso y de hasta 4 semanas siguientes. | 11 pruebas «044/» · Tareas T1, T2, T3, T5, T7, T14, T20, T21, T22 | verde |
| RF-3 | SI se pide armar el plan de una semana que ya terminó, ENTONCES EL SISTEMA lo rechaza explicando que solo se… | 8 pruebas «044/» · Tareas T2, T4, T5, T7, T10, T15, T16, T19, T20, T21, T22 | verde |
| RF-4 | SI se pide armar el plan de una semana posterior a las 4 siguientes, ENTONCES EL SISTEMA lo rechaza explicand… | 8 pruebas «044/» · Tareas T2, T4, T5, T11, T15, T20, T25 | verde |
| RF-5 | SI la obra no tiene planificación aprobada vigente, ENTONCES EL SISTEMA rechaza proponer, subir o crear un pl… | 3 pruebas «044/» · Tareas T1, T6, T12, T14, T16, T17, T20, T23 | verde |
| RF-6 | EL SISTEMA guarda en el plan las actividades de la semana con su frente de trabajo, su ítem, su unidad, su me… | 7 pruebas «044/» · Tareas T4, T6, T12, T14, T17, T21, T23 | verde |
| RF-7 | EL SISTEMA guarda en el plan el personal requerido por cargo y por frente de trabajo. | 10 pruebas «044/» · Tareas T1, T8, T9, T14, T18, T20, T22 | verde |
| RF-8 | EL SISTEMA guarda en el plan la maquinaria con su equipo, su cantidad, si es propia o externa, su frente de t… | 8 pruebas «044/» · Tareas T1, T3, T4, T6, T14, T17, T19, T22, T23 | verde |
| RF-9 | DONDE la maquinaria sea propia, EL SISTEMA permite escogerla entre los vehículos de la obra. | 14 pruebas «044/» · Tareas T2, T4, T5, T8, T16, T17, T20, T21, T22, T23, T24 | verde |
| RF-10 | DONDE la maquinaria sea externa, EL SISTEMA permite describirla como texto. | 9 pruebas «044/» · Tareas T5, T7, T8, T10, T12, T15, T16, T17, T18, T19, T20, T22, T23 | verde |
| RF-11 | EL SISTEMA guarda en el plan los materiales de la semana con su material, su cantidad de la semana, su unidad… | T22: los materiales se editan y guardan (material, cantidad, unidad, base de cálculo); T25: el Excel trae 11. | verde |
| RF-12 | EL SISTEMA guarda en el plan el control de volquetas con sus conceptos, su cantidad de la semana, sus viajes… | T22: control de volquetas con conceptos, cantidad, viajes y requeridas/propias/externas; T25: 3 conceptos, 17/8/9. | verde |
| RF-13 | EL SISTEMA guarda en el plan los supuestos como texto. | T25: la propuesta de la IA guarda sus supuestos como texto (5 renglones); T22: el campo se escribe en el editor. | verde |
| RF-14 | EL SISTEMA guarda en el plan los riesgos con su efecto en la meta y su mitigación. | T22: riesgos con efecto y mitigación; T25: los 5 del Excel con los tres campos. | verde |
| RF-15 | EL SISTEMA guarda en el plan los requerimientos a gerencia como texto. | T22: requerimientos como texto; T25: la propuesta de la IA los trae. | verde |
| RF-16 | EL SISTEMA no calcula los materiales ni el control de volquetas: son renglones que se proponen y se ajustan. | Código: ninguna cuenta de materiales ni de volquetas (se guardan como llegan); T19: el Excel no las calcula. T25: los renglones de la IA y del Excel quedan tal cual. | verde |
| RF-91 | EL SISTEMA trata el frente de trabajo del plan como un rótulo libre, distinto del frente del presupuesto. | 1 prueba «044/» · Tareas T4, T21 | verde |
| RF-97 | EL SISTEMA permite en el plan actividades de tipo rubro, con un valor y sin meta en cantidades. | 2 pruebas «044/» · Tareas T4, T21 | verde |
| RF-17 | EL SISTEMA permite marcar qué días de lunes a sábado se trabaja en la semana del plan. | 1 prueba «044/» · Tareas T2, T21 | verde |
| RF-18 | EL SISTEMA aplica los días marcados a todas las actividades del plan. | 1 prueba «044/» · Tareas T2, T21 | verde |
| RF-19 | EL SISTEMA propone desmarcados los días festivos. | 1 prueba «044/» · Tareas T2, T21 | verde |
| RF-20 | EL SISTEMA permite marcar un día festivo como día de trabajo. | 1 prueba «044/» · Tareas T2, T21 | verde |
| RF-21 | EL SISTEMA reparte la meta de la semana de cada actividad en partes iguales entre los días marcados, con tres… | 1 prueba «044/» · Tareas T3, T21 | verde |
| RF-22 | EL SISTEMA permite ajustar la cantidad de cada día de una actividad. | 1 prueba «044/» · Tareas T3, T14, T21 | verde |
| RF-23 | SI la suma de las cantidades de los días de una actividad no es igual a su meta de la semana, ENTONCES EL SIS… | 1 prueba «044/» · Tareas T3, T14, T21 | verde |
| RF-24 | EL SISTEMA calcula el total programado de cada actividad como la suma de sus días. | 1 prueba «044/» · Tareas T3, T21 | verde |
| RF-25 | EL SISTEMA calcula la meta diaria de cada actividad como su meta de la semana entre el número de días marcado… | 1 prueba «044/» · Tareas T3, T21 | verde |
| RF-26 | EL SISTEMA calcula el valor de cada actividad como su meta de la semana por el precio de costo del ítem en la… | 1 prueba «044/» · Tareas T5, T22 | verde |
| RF-27 | EL SISTEMA calcula el valor total del plan como la suma de los valores de sus actividades. | 1 prueba «044/» · Tareas T5, T22 | verde |
| RF-28 | SI un ítem del plan no tiene precio de costo en la planificación, ENTONCES EL SISTEMA lo deja sin valor y avi… | 2 pruebas «044/» · Tareas T5, T22 | verde |
| RF-94 | EL SISTEMA recalcula los valores del plan cada vez que lo muestra o lo descarga. | 1 prueba «044/» · Tareas T5 | verde |
| RF-29 | EL SISTEMA muestra los valores del plan únicamente a Gerencia, Director de Proyectos y Director de Obra en su… | 4 pruebas «044/» · Tareas T1, T7, T22 | verde |
| RF-30 | MIENTRAS la persona tenga el acceso Residente, EL SISTEMA le muestra el plan sin ninguna cifra de plata, en p… | 2 pruebas «044/» · Tareas T7, T19, T22 | verde |
| RF-102 | MIENTRAS la persona tenga el acceso Residente, EL SISTEMA reemplaza por «Contiene valores en pesos» cada text… | 4 pruebas «044/» · Tareas T7, T19, T22 | verde |
| RF-103 | EL SISTEMA considera que un texto contiene una cifra en pesos cuando tiene el signo «$» o la palabra «pesos». | 1 prueba «044/» · Tareas T7 | verde |
| RF-31 | EL SISTEMA permite en el plan actividades que no son ítems de la planificación aprobada. | 1 prueba «044/» · Tareas T4, T21 | verde |
| RF-32 | EL SISTEMA marca como «Fuera de la planificación» las actividades del plan que no son ítems de la planificaci… | 1 prueba «044/» · Tareas T4, T21 | verde |
| RF-88 | EL SISTEMA reconoce el ítem de una actividad por el frente del presupuesto, el capítulo y el ítem de pago, co… | 1 prueba «044/» · Tareas T4 | verde |
| RF-89 | SI la actividad solo trae el número de renglón, ENTONCES EL SISTEMA resuelve su ítem por el renglón de la pla… | 1 prueba «044/» · Tareas T4 | verde |
| RF-33 | SI al aprobar, la meta de la semana de una actividad supera lo pendiente de su ítem en la planificación, ENTO… | 2 pruebas «044/» · Tareas T5, T22 | verde |
| RF-93 | EL SISTEMA muestra lo pendiente de cada ítem calculado al día en que se arma o se ajusta el borrador. | 2 pruebas «044/» · Tareas T5, T21 | verde |
| RF-34 | CUANDO se pide proponer el plan de una semana, EL SISTEMA arma un borrador con actividades, personal, maquina… | T15, T16, T25, T26: la propuesta trae actividades, personal, maquinaria, materiales, volquetas, supuestos, riesgos y requerimientos. | verde |
| RF-96 | CUANDO la IA propone un plan, EL SISTEMA marca como días de trabajo de lunes a sábado sin los festivos. | 2 pruebas «044/» · Tareas T2, T16 | verde |
| RF-35 | EL SISTEMA toma para la propuesta la programación del mes en la planificación aprobada. | 1 prueba «044/» · Tareas T10, T16 | verde |
| RF-36 | EL SISTEMA toma para la propuesta lo pendiente por ítem. | 1 prueba «044/» · Tareas T10, T16 | verde |
| RF-37 | EL SISTEMA toma para la propuesta el cumplimiento de la semana anterior. | 1 prueba «044/» · Tareas T10, T16 | verde |
| RF-38 | EL SISTEMA toma para la propuesta los vehículos de la obra. | 1 prueba «044/» · Tareas T10, T16 | verde |
| RF-39 | DONDE la obra lleve almacén, EL SISTEMA toma para la propuesta las existencias del almacén de la obra. | 1 prueba «044/» · Tareas T10, T16 | verde |
| RF-105 | SI la obra no lleva almacén, ENTONCES EL SISTEMA arma la propuesta sin existencias de almacén. | 1 prueba «044/» · Tareas T10, T16 | verde |
| RF-40 | EL SISTEMA calcula por regla la meta diaria, el total programado y el valor de lo que proponga la IA. | 1 prueba «044/» · Tareas T11, T16 | verde |
| RF-41 | SI la IA propone un ítem que no existe en la planificación aprobada, ENTONCES EL SISTEMA lo deja marcado «Fue… | 2 pruebas «044/» · Tareas T4, T11, T16 | verde |
| RF-104 | CUANDO la IA propone un plan o lee un Excel, EL SISTEMA le pide no poner valores en pesos en los textos libre… | 1 prueba «044/» · Tareas T10, T15 | verde |
| RF-42 | EL SISTEMA permite subir un Excel de plan semanal para armar el borrador. | T16: subida 202 y borrador de origen `excel`; T25 y T26 (paso 3): el libro de referencia leído en 44 s. | verde |
| RF-92 | CUANDO se sube un Excel, EL SISTEMA pide escoger la semana a la que corresponde. | T20: la ventana pide la semana sin suponer ninguna y «Leer el Excel» queda apagado hasta escogerla. | verde |
| RF-43 | SI el contenido del archivo no es `.xlsx`, aunque su nombre termine así, ENTONCES EL SISTEMA lo rechaza expli… | T16: un `.xls` renombrado a `.xlsx` → 422 «Ese archivo no es un Excel (.xlsx), aunque su nombre lo diga…». | verde |
| RF-44 | EL SISTEMA exige que cada cifra leída del Excel cite su hoja y su fila. | 1 prueba «044/» · Tareas T11, T15, T16, T25 | verde |
| RF-45 | SI la celda citada no contiene la cifra leída, ENTONCES EL SISTEMA descarta esa cifra y marca su renglón para… | 1 prueba «044/» · Tareas T11, T16, T25 | verde |
| RF-46 | EL SISTEMA toma del Excel la meta de la semana de cada actividad y los días con cantidad. | 2 pruebas «044/» · Tareas T11, T16, T25 | verde |
| RF-47 | EL SISTEMA recalcula la meta diaria, el total programado y el valor de lo leído del Excel. | 1 prueba «044/» · Tareas T11, T16, T25 | verde |
| RF-48 | SI el total programado o la meta diaria que traía el Excel difiere del calculado, ENTONCES EL SISTEMA avisa m… | 2 pruebas «044/» · Tareas T5, T11, T16, T25 | verde |
| RF-49 | SI la lectura falla o no encuentra ninguna actividad, ENTONCES EL SISTEMA no crea ningún borrador y explica e… | 1 prueba «044/» · Tareas T11, T16, T25 | verde |
| RF-101 | MIENTRAS una propuesta o una lectura esté en curso para una obra y una semana, EL SISTEMA rechaza otra para l… | T16: segunda propuesta a la vez para la misma obra y semana → 409 con su explicación; índice parcial (T12). | verde |
| RF-50 | EL SISTEMA mantiene como máximo un borrador por obra y semana. | T12: índice parcial (segundo borrador rechazado por la base); T14: segundo borrador → 409; T20: «Empezar en blanco» avisa. | verde |
| RF-51 | EL SISTEMA mantiene como máximo un plan vigente por obra y semana. | T12: índice parcial; T17: aprobar un segundo con uno vigente → 409. | verde |
| RF-52 | SI ya hay un borrador de esa semana, ENTONCES EL SISTEMA pide confirmar antes de sustituirlo con una propuest… | T16: con borrador y sin `sustituir` → 409 con su id; T20: la casilla de sustituir y «Leer el Excel» apagado hasta marcarla. | verde |
| RF-53 | EL SISTEMA conserva como descartado el borrador sustituido, con quién lo sustituyó y cuándo. | T16: el sustituido queda `descartado` con quién y cuándo; T25: la propuesta de la IA quedó descartada al subir el Excel. | verde |
| RF-54 | EL SISTEMA permite proponer, subir y ajustar el borrador a Gerencia, Director de Proyectos, Director de Obra… | 1 prueba «044/» · Tareas T1 | verde |
| RF-55 | EL SISTEMA registra quién creó el borrador, al proponerlo, subirlo o empezarlo. | T14: crear deja de autor al Residente; T26 (paso 1): «lo armó Prueba 044 residente». | verde |
| RF-87 | EL SISTEMA registra quién ajustó el borrador por última vez. | T14 y T22: «Último ajuste» registra a quien guardó; T26 (paso 2): la Directora. | verde |
| RF-56 | SI quien creó el borrador es el Director de Proyectos, ENTONCES EL SISTEMA permite aprobarlo únicamente al Di… | 1 prueba «044/» · Tareas T6, T17, T23 | verde |
| RF-57 | SI quien creó el borrador es un Director de Obra o un Residente, ENTONCES EL SISTEMA permite aprobarlo únicam… | 1 prueba «044/» · Tareas T6, T17, T23 | verde |
| RF-58 | SI quien creó el borrador es la Gerencia, ENTONCES EL SISTEMA permite aprobarlo únicamente a la Gerencia o al… | 1 prueba «044/» · Tareas T6, T17, T23 | verde |
| RF-59 | EL SISTEMA no permite aprobar ni anular un plan semanal al Residente. | 3 pruebas «044/» · Tareas T1, T6, T17, T23 | verde |
| RF-60 | SI el borrador tiene avisos, ENTONCES EL SISTEMA exige una sola confirmación del conjunto antes de aprobar. | 1 prueba «044/» · Tareas T6, T17, T23 | verde |
| RF-61 | CUANDO se aprueba un plan, EL SISTEMA registra quién lo aprobó. | T17 y T26 (paso 2): aprobado por la Directora de Obra, con su nombre en el detalle. | verde |
| RF-106 | CUANDO se aprueba un plan, EL SISTEMA registra la fecha y hora de aprobación. | T17 y T26 (paso 2): `aprobadoEn` 2026-11-12T15:01:26Z. | verde |
| RF-62 | CUANDO se aprueba un plan, EL SISTEMA lo hace regir desde ese día, según la fecha de Colombia, o desde el lun… | 2 pruebas «044/» · Tareas T6, T17, T23 | verde |
| RF-63 | SI una persona aprueba un borrador que cambió después de que ella lo abrió, ENTONCES EL SISTEMA avisa que cam… | T17: aprobar con `version` vieja → 409 sin cambios; T23: la ventana ofrece volver a cargar. | verde |
| RF-99 | SI la semana de un borrador ya terminó, ENTONCES EL SISTEMA no permite aprobarlo y lo muestra como «Sin aprob… | 1 prueba «044/» · Tareas T2, T17, T23 | verde |
| RF-100 | SI hay una versión de la planificación más nueva que la usada al armar el plan, ENTONCES EL SISTEMA lo lista… | 1 prueba «044/» · Tareas T5, T17, T23 | verde |
| RF-64 | EL SISTEMA no permite editar un plan aprobado. | 1 prueba «044/» · Tareas T14, T17, T23 | verde |
| RF-65 | EL SISTEMA permite anular el plan vigente a quien puede aprobarlo. | 1 prueba «044/» · Tareas T6, T17, T23 | verde |
| RF-66 | CUANDO se anula un plan, EL SISTEMA exige un motivo escrito. | T17 y T26 (paso 5): anular sin motivo (o en blanco) → 400; T23: «Anular» apagado sin motivo. Además una prueba «044/RF-64» del esquema. | verde |
| RF-67 | CUANDO se anula un plan, EL SISTEMA deja de hacerlo regir desde ese día. | 2 pruebas «044/» · Tareas T6, T17, T23 | verde |
| RF-68 | CUANDO se aprueba un plan nuevo para una semana que ya tuvo uno anulado, EL SISTEMA mide los días anteriores… | 1 prueba «044/» · Tareas T6, T17 | verde |
| RF-69 | EL SISTEMA no borra ningún plan semanal. | Código: ningún `delete` sobre `planes_semanales` ni `plan_semanal_lecturas`; sustituir, aprobar y anular son estados (T12, T16, T17). | verde |
| RF-70 | MIENTRAS un plan rija un día, EL SISTEMA toma como meta de ese día, para cada ítem de la planificación que es… | 1 prueba «044/» · Tareas T8, T18 | verde |
| RF-71 | MIENTRAS un plan rija un día, EL SISTEMA no da meta ese día a los ítems de la planificación que no están en e… | 1 prueba «044/» · Tareas T8, T18 | verde |
| RF-72 | EL SISTEMA no cuenta como meta del cumplimiento las actividades del plan marcadas «Fuera de la planificación». | 1 prueba «044/» · Tareas T8, T18 | verde |
| RF-73 | EL SISTEMA no marca como «estimada» la meta que sale de un plan aprobado. | 1 prueba «044/» · Tareas T8, T18 | verde |
| RF-90 | SI dos actividades del plan son del mismo ítem, ENTONCES EL SISTEMA suma sus cantidades en la meta del cumpli… | 1 prueba «044/» · Tareas T8 | verde |
| RF-95 | SI en un periodo parte de los días de un ítem tiene meta del plan y parte meta estimada, ENTONCES EL SISTEMA… | 3 pruebas «044/» · Tareas T8, T24 | verde |
| RF-98 | EL SISTEMA no cuenta las actividades de tipo rubro en el cumplimiento. | 1 prueba «044/» · Tareas T8 | verde |
| RF-74 | EL SISTEMA sigue tomando la meta del informe mensual de la planificación aprobada. | 1 prueba «044/» · Tareas T8, T18 | verde |
| RF-75 | EL SISTEMA usa en cada día del informe el precio de costo de la planificación que rige ese día. | 3 pruebas «044/» · Tareas T9, T18 | verde |
| RF-76 | SI ningún plan rige un día, ENTONCES EL SISTEMA reparte la meta del mes como lo hace sin plan semanal. | 2 pruebas «044/» · Tareas T8, T18 | verde |
| RF-77 | SI ninguna planificación rige un día, ENTONCES EL SISTEMA no da meta ese día aunque haya un plan semanal apro… | 1 prueba «044/» · Tareas T8, T18 | verde |
| RF-107 | SI ninguna planificación rige un día con plan semanal aprobado, ENTONCES EL SISTEMA muestra ese día como «Sin… | 1 prueba «044/» · Tareas T8, T18 | verde |
| RF-78 | EL SISTEMA muestra los planes de cada semana con su estado, quién los armó y quién los aprobó. | 1 prueba «044/» · Tareas T1, T14, T20 | verde |
| RF-79 | EL SISTEMA deja abrir en solo lectura cualquier plan aprobado, anulado o descartado. | T23: el aprobado y el anulado se abren en solo lectura, sin «Guardar» ni «Agregar»; el descartado igual (solo el borrador es editable). T26 (paso 2): editar el aprobado → 409. | verde |
| RF-80 | EL SISTEMA permite descargar el plan en Excel con las mismas secciones del Excel de la Directora. | 1 prueba «044/» · Tareas T19, T23 | verde |
| RF-81 | EL SISTEMA da las mismas cifras en pantalla y en la descarga para un mismo plan. | 1 prueba «044/» · Tareas T19 | verde |
| RF-82 | EL SISTEMA limita cada persona a las obras de su alcance. | 1 prueba «044/» · Tareas T1 | verde |
| RF-83 | SI una persona sin acceso pide un plan semanal, ENTONCES EL SISTEMA rechaza la petición. | 3 pruebas «044/» · Tareas T1 | verde |
| RF-84 | EL SISTEMA calcula por regla todos los totales, metas diarias y valores del plan. | 1 prueba «044/» · Tareas T3 | verde |
| RF-85 | EL SISTEMA no modifica partes de obra, presupuestos, planificaciones ni preoperacionales al proponer, subir,… | T17: las huellas (cuenta y md5) de partes, presupuestos, planificaciones y preoperacionales son iguales antes y después de proponer, aprobar y anular. | verde |
| RF-86 | SI una persona guarda un borrador que cambió después de que ella lo abrió, ENTONCES EL SISTEMA avisa que camb… | 1 prueba «044/» · Tareas T14, T22 | verde |
## Demo de la spec

Hecha el 2026-11-12 contra el panel de desarrollo (puerto 8082) con un guion que entra como cada cargo
y llama a las mismas rutas que la pantalla, más lo recorrido en el navegador en T20 a T24. Todo en verde.

**Almacenista** (usuario temporal `prueba-044-alm`, dado de alta por el Director de Proyectos en
`PRUEBA-043`): listar, ver, descargar y proponer → 403, con «No puede ver el plan semanal de la obra: lo
hacen la gerencia, el residente, el director de proyectos y el director de obra.». El menú no le muestra la
entrada (pruebas de la T1).

1. **Residente propone** la semana del 7 de diciembre: lista en 89 s, borrador de origen IA con 14
   actividades, autor el Residente, sin valores, sin valor de rubro y sin ningún texto con pesos; no puede
   aprobar ni anular; el martes 8 (festivo) sale sin marcar.
2. **Directora de Obra ajusta y aprueba**: ve el valor de la semana ($129.293.342); marca el festivo (seis
   días) y sube el 8.1 de 10,857 a 13; queda como último ajuste. Al aprobar sin confirmar, 409 con los
   siete avisos; confirmándolos una vez, vigente desde el lunes 7, con quién y cuándo. Editar el aprobado
   → 409. En el navegador, la ventana de aprobar con su casilla única (T23).
3. **Excel de referencia** (leído en la T25 como borrador de la semana del 30 de noviembre): origen Excel,
   12 actividades, 7 cargos, 13 máquinas, 11 materiales, 3 conceptos de volquetas y 5 riesgos; 22 avisos
   del reparto («el Excel traía la meta diaria en 853,5, y con los días del plan da 682,8») y el 13.1 de
   cunetas en 682,8 por día. La comparación con la propuesta de la IA está en
   `ensayo-excel-de-referencia.md`.
4. **Informe de la semana aprobada** (7 de diciembre): los 14 ítems del plan con su meta del plan, sin
   «estimada» y con 6 días del plan. Un ítem que no está en el plan no tiene meta en los días del plan:
   en la semana del 9 de noviembre, el 4.1.8 (fuera del plan) solo suma el lunes y el martes estimados,
   12,5; en la del 16, cuyo plan es solo el 4.1.8, los demás ítems no aparecen. El mes no usa los planes.
5. **Anular y aprobar a mitad de semana** (semana del 9 de noviembre, hoy jueves 12): anular sin motivo →
   400; el Director de Proyectos anula el vigente (5.1.7 en 60 desde el miércoles 11), que rige hasta el
   11; la Directora arma uno nuevo con el 5.1.7 en 48 y lo aprueba: rige desde el 12. El informe mide cada
   día con lo suyo: lunes y martes estimados (12,5) + miércoles del anulado (10) + jueves a sábado del
   nuevo (24) = **46,5**, «Parcialmente estimada (4 días del plan)», como sale en pantalla, Excel y PDF
   (T24).
6. **Descargar el plan en Excel**: el de la Directora trae «Valor semana ($)» y la fila «TOTAL SEMANA»; el
   del Residente, las mismas ocho hojas sin ninguna columna ni cifra de plata y sin la fila del total.

## Alcance

- **No se implementó nada fuera de la spec.** Lo añadido que la spec no nombra es de soporte:
  `estado-de-lectura.ts` (para que consultar una lectura no tumbe el servidor de desarrollo, T16),
  `conservarLoQueNoVeElResidente` (T21, ver observaciones) y el botón «Volver a cargar el plan» (T22).
- **Cambios fuera de los módulos de la 044**, todos anotados en su tarea: `cumplimiento-de-obra.ts` mide
  con planes por día y trae `etiquetaDeEstimada` (T8, T24); `planificacion.ts` recibe
  `llaveDeItemPlanificado` sin cambiarla (T4); `planificacion-ia.ts` exporta `estaEnLaFila` (T11);
  `leer-con-ia.ts` exporta `llamarConEsquema` (T15); `respuestas.ts` explica los nuevos 409 (T16, T17);
  `permisos.ts`, `empresas.ts` y `paginas-de-empresa.tsx` dan el módulo y su página (T1, T20); la pantalla
  y las descargas del cumplimiento muestran «Parcialmente estimada» (T24).
- **Lo que la spec deja fuera sigue fuera:** no se calculan materiales ni volquetas, un solo juego de días
  por plan, sin semanas pasadas ni más de 4 adelante, sin paso de «enviar», el mes sin planes, sin
  personas ni vehículos asignados desde el plan, sin pedidos ni salidas de almacén, el asistente no lo
  consulta, sin PDF del plan y nada en el celular (nada en `src/db/local` ni en las rutas del operador).

## Constitución

1. **Local-first:** sin cambios en el celular ni en su base.
2. **La spec manda:** cada tarea partió de sus RF; las decisiones que la spec no traía quedaron anotadas
   para Diego en vez de entrar calladas (ver observaciones).
3. **Una regla, un solo sitio:** reparto, totales, valores, avisos, quién aprueba, qué plan rige, la meta
   con plan y la etiqueta de «Parcialmente estimada» viven en `shared/rules/`; las pantallas no calculan.
4. **Nada se borra:** sin `DELETE` sobre planes ni lecturas; sustituir, aprobar y anular son estados.
5. **Puerta de calidad:** los tres comandos en verde en cada tarea y aquí.
6. **Fronteras duras:** los secretos solo en el servidor (fugas en verde); toda ruta del panel abre con
   `requerirPermiso`, y la obra se comprueba con el alcance (404 a un Director de Obra de otra obra, T14,
   T16).
7. **Español y diseño:** código, comentarios y textos en español; las tablas caben en
   `MaxContentWidthPanel` (T20, T21) y los renglones de maquinaria caben con su botón (T22).
8. **Sin dependencias nuevas:** `package.json` sin cambios.

## Observaciones que no impiden cumplir

Decisiones y preguntas para Diego, anotadas en su tarea:

- **Guardado del Residente (T21):** cuando guarda, se conserva lo que él no ve (el valor de los rubros y
  los textos con pesos). La spec dice qué no ve, no qué pasa al guardar; es una decisión mía por confirmar.
- **Anular un plan de una semana ya pasada se permite (T17).** No cambia lo medido, pero queda «anulado».
- **Un ítem fuera del plan y sin ejecución desaparece del informe semanal (T18)**, en vez de salir «sin
  meta». Cumple RF-71; si OCC quiere verlo, es un cambio.
- **Hoja oculta «Supuestos» del Excel (T25):** no se lee, porque la lectura solo manda las hojas a la vista.
  Leerla sería un cambio.
- **Volver a subir el Excel que descarga el sistema (T21):** sus actividades quedan «fuera», porque la
  descarga escribe el ítem de pago y la lectura cruza por el renglón.
- **Detalles de pantalla:** la fecha del «Último ajuste» toma la hora de la aprobación o la anulación,
  aunque el nombre sí es de quien ajustó (T23); un aviso con descripción terminada en punto queda
  «modificado.: la meta…» (T23); con muchos planes, el editor queda lejos al pie de la lista (T21).
- **En el PDF del cumplimiento** va «Parcial (n días del plan)» con una nota debajo, porque la columna es
  angosta; la pantalla y el Excel llevan el texto entero (T24).
- **De la 043, sin tocar:** la ruta `planificaciones/lecturas/[id]` arrastra el lector de Excel y la IA, y
  en desarrollo una lectura larga consultada muchas veces puede tumbar el servidor (T16).
- **Datos de prueba en desarrollo**, por borrar al cerrar la tanda: en `PRUEBA-043`, los planes de las
  semanas del 2 de noviembre al 7 de diciembre, los vehículos PRU044 y PRB044, y los usuarios
  `prueba-044-res`, `prueba-044-do`, `prueba-044-dp` y `prueba-044-alm`. Producción no se tocó: las
  migraciones `0042` y `0043` siguen pendientes allá.

### Respuestas de Diego (2026-11-12)

- Guardado del Residente: **aprobado** como está.
- Anular un plan de una semana ya pasada: **se deja** permitido.
- Ítem fuera del plan sin ejecución fuera del informe semanal: **le sirve** así.
- Hoja oculta «Supuestos»: **no se lee**, se deja así.
- Fecha del «Último ajuste»: **se deja así por el momento**.
- Datos de prueba en desarrollo: **se conservan**.

## Veredicto

**Cumplida.** Los 107 RF tienen su comprobación en verde, la demo de la spec se completó con Residente,
Director de Obra, Director de Proyectos y Almacenista, los tres comandos están en verde y el control de
fugas está limpio.
