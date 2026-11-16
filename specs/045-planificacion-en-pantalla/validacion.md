# Validación — Spec 045, Planificación hecha en pantalla

> Fecha: 2026-11-16 · Tareas T28 y T28b (segunda pasada, tras la T28b, y demo del Director de Obra) · Base: desarrollo (`neondb`), obras `PRUEBA-043`, `PRUEBA-043-C` y `PRUEBA-018` · Sesiones de Gerencia y de un Director de Obra de prueba en Chrome.

## Comandos, ejecutados de verdad

```
$ npm run verificar
988 verificaciones correctas.
(salida 0; 77 pruebas «045/», una de ellas añadida en esta tarea: «045/RF-6, RF-7»)

$ npm run typecheck
> tsc --noEmit && tsc --noEmit -p tsconfig.scripts.json
(salida 0, sin errores)

$ npm run lint
> expo lint
(salida 0, sin avisos)
```

Fugas: limpias en la T16, la T17, la T18, la T19, la T21, la T27 y la T28b (`npx expo export --platform web` sin errores; `grep -rlE "DATABASE_URL|ANTHROPIC_API_KEY|SECRETO_TOKENS|R2_LLAVE_SECRETA" dist/client` vacío; `dist` borrado). La migración `0045` está aplicada solo en desarrollo; producción no se tocó.

## Requisito por requisito

171 RF. 128 tienen al menos una prueba «045/» en `scripts/verificar-reglas.ts`. Los demás se comprobaron contra el servidor o en el navegador, en la tarea que se cita; el resultado está en las notas de ejecución de `tareas.md`. **Ninguno queda sin cubrir.** En la primera pasada RF-6, RF-7 (sin campos en pantalla) y RF-28 (la espera solo en el navegador que lanzó la propuesta) no se cumplían; la T28b los cerró y RF-15 se precisó en la spec. RF-150 a RF-152 se vieron, además, con una cuenta de Director de Obra de prueba (abajo). **Los 171 en verde.**

| RF | Requisito | Qué lo cubre | Resultado |
| --- | --- | --- | --- |
| RF-1 | EL SISTEMA guarda en cada planificación un plazo total en meses. | 1 prueba «045/» · Tareas T1 | verde |
| RF-2 | EL SISTEMA guarda en cada planificación un mes de arranque. | 1 prueba «045/» · Tareas T1 | verde |
| RF-3 | EL SISTEMA cuenta el mes de arranque como el primer mes del plazo. | 1 prueba «045/» · Tareas T1 | verde |
| RF-4 | SI el plazo no es un número entero entre 1 y 120, ENTONCES EL SISTEMA lo rechaza explicando el motivo. | 2 pruebas «045/» · Tareas T1 | verde |
| RF-5 | EL SISTEMA permite un mes de arranque anterior al mes en curso. | 1 prueba «045/» · Tareas T1 | verde |
| RF-6 | MIENTRAS una planificación esté en borrador, EL SISTEMA permite a una persona con acceso Director de Proyectos… | 1 prueba «045/» · Prueba «045/RF-6, RF-7» (de 16 a 20 meses pasa, 121 se rechaza). T28b en Chrome: el campo «Plazo, en meses» del resumen del borrador; con 121 sale el motivo y no deja guardar; con 20 se guardó. | verde |
| RF-7 | MIENTRAS una planificación esté en borrador, EL SISTEMA permite a una persona con acceso Director de Proyectos… | 1 prueba «045/» · Ídem RF-6, con el campo «Mes de arranque»: 2026-03 guardado (T28b). | verde |
| RF-8 | EL SISTEMA permite a una persona con acceso Director de Proyectos o Gerencia crear un borrador de planificació… | T16: `POST desde-presupuesto` → 202 y borrador `origen = presupuesto`; T22 y T28 en Chrome (borradores v7 y v9). | verde |
| RF-9 | SI la obra no tiene presupuesto vigente, ENTONCES EL SISTEMA no crea el borrador. | T16: `PRUEBA-018`, sin presupuesto vigente → 422 y ningún borrador. | verde |
| RF-10 | SI la obra no tiene presupuesto vigente, ENTONCES EL SISTEMA explica que primero hay que aprobar el presupuest… | T16: el 422 explica que primero hay que aprobar el presupuesto. | verde |
| RF-11 | CUANDO se pide crear el borrador desde el presupuesto, EL SISTEMA exige el plazo. | 1 prueba «045/» · Tareas T14, T16, T22 | verde |
| RF-12 | CUANDO se pide crear el borrador desde el presupuesto, EL SISTEMA exige el mes de arranque. | 1 prueba «045/» · Tareas T14, T16, T22 | verde |
| RF-13 | SI el presupuesto tiene varios grupos, ENTONCES EL SISTEMA pide escoger el grupo (frente) que se planifica. | 2 pruebas «045/» · Tareas T9, T16, T22 | verde |
| RF-14 | EL SISTEMA copia al borrador cada ítem del grupo escogido con su ítem de pago, descripción, unidad, cantidad c… | 1 prueba «045/» · Tareas T9, T16 | verde |
| RF-15 | EL SISTEMA copia al borrador cada rubro del presupuesto que sea del grupo (frente) escogido o de todo el contr… | 1 prueba «045/» · Tareas T9, T16 · Precisado en la spec el 2026-11-16: el grupo escogido y los de todo el contrato, no los de otro frente (como hace la regla desde la T9). | verde |
| RF-16 | EL SISTEMA pone como medida real inicial de cada ítem su cantidad contractual. | 1 prueba «045/» · Tareas T9, T16 | verde |
| RF-17 | EL SISTEMA deja vacío el precio de costo de cada ítem copiado del presupuesto. | 1 prueba «045/» · Tareas T9, T16 | verde |
| RF-18 | EL SISTEMA deja vacío el costo de cada rubro copiado del presupuesto. | 1 prueba «045/» · Tareas T9, T16 | verde |
| RF-19 | CUANDO se crea el borrador desde el presupuesto, EL SISTEMA pide a la IA un mes de inicio y una cantidad de me… | 1 prueba «045/» · Tareas T10, T15, T16 | verde |
| RF-20 | SI la IA propone un mes de inicio anterior al mes de arranque, ENTONCES EL SISTEMA descarta esa propuesta para… | 2 pruebas «045/» · Tareas T10, T16 | verde |
| RF-21 | SI la IA propone un periodo que termina después del último mes del plazo, ENTONCES EL SISTEMA descarta esa pro… | 2 pruebas «045/» · Tareas T10, T16 | verde |
| RF-22 | SI se descarta la propuesta de un ítem o rubro, ENTONCES EL SISTEMA lo deja sin programación. | 1 prueba «045/» · Tareas T10, T16 | verde |
| RF-23 | SI se descarta la propuesta de un ítem o rubro, ENTONCES EL SISTEMA lo marca para revisión. | 1 prueba «045/» · Tareas T10, T16 | verde |
| RF-24 | SI la IA no responde o falla, ENTONCES EL SISTEMA crea el borrador con todos los ítems y rubros sin programaci… | T16: IA forzada a fallar en `PRUEBA-043-C` → borrador v2 con 38 ítems y 5 rubros sin calendario. | verde |
| RF-25 | SI la IA no responde o falla, ENTONCES EL SISTEMA avisa en el borrador que la propuesta de la IA no se obtuvo. | T16: `propuesta.fallida`; T22: el detalle muestra el aviso de que no hay calendario. | verde |
| RF-26 | EL SISTEMA muestra junto a la propuesta una explicación del orden escogido, redactada por la IA, de no más de… | 1 prueba «045/» · Tareas T10, T15, T16 | verde |
| RF-27 | EL SISTEMA no toma de la IA cantidades, medidas, precios ni costos. | 1 prueba «045/» · Tareas T10, T16 | verde |
| RF-28 | MIENTRAS la propuesta de la IA esté en curso en una obra, EL SISTEMA muestra en esa obra que la propuesta sigu… | T22: quien lanza la propuesta ve la espera. T28b: la pantalla le pregunta al servidor (`propuesta-en-curso`); con una propuesta lanzada por la API y nada anotado en el navegador, al abrir la obra se ve «La IA está proponiendo… 0:09» y, al terminar, se abre el borrador. | verde |
| RF-29 | MIENTRAS la propuesta de la IA esté en curso en una obra, EL SISTEMA rechaza crear otro borrador en esa obra,… | T16: otra propuesta y una subida de Excel durante la propuesta → 409 «La IA está proponiendo el calendario…». | verde |
| RF-30 | EL SISTEMA crea el borrador cuando la propuesta de la IA termina o falla, no antes. | T16: el borrador se escribe en el mismo lote que cierra la lectura (`escribirBorrador`); T28: el v9 apareció a los 24 s, al terminar. | verde |
| RF-31 | EL SISTEMA continúa la propuesta de la IA aunque la persona cierre la página. | T22: la propuesta corre en el servidor (`lanzarPropuesta`) y la espera se retoma al volver (`planificacion:propuesta:<obra>`). | verde |
| RF-32 | EL SISTEMA conserva la creación del borrador desde un Excel de planificación tal como la define la 043. | T17 y T27: el V2 se sube por la misma lectura de la 043, con sus hojas y su caché. | verde |
| RF-33 | CUANDO se crea un borrador desde un Excel, EL SISTEMA toma como mes de arranque el mes de inicio más temprano… | 1 prueba «045/» · Tareas T11, T17 | verde |
| RF-34 | CUANDO se crea un borrador desde un Excel, EL SISTEMA toma como plazo los meses que van desde el mes de arranq… | 1 prueba «045/» · Tareas T11, T17 | verde |
| RF-35 | CUANDO se crea un borrador desde un Excel, EL SISTEMA guarda como meses fijados los valores mes a mes que trae… | 1 prueba «045/» · Tareas T11, T17 | verde |
| RF-36 | CUANDO se lee un Excel de planificación, EL SISTEMA lee los renglones de cada uno de los siete conceptos de co… | 1 prueba «045/» · Tareas T11, T15, T17, T27 | verde |
| RF-37 | CUANDO se lee un renglón indirecto de un Excel, EL SISTEMA guarda como meses fijados los valores mes a mes que… | 1 prueba «045/» · Tareas T11, T17, T27 | verde |
| RF-38 | EL SISTEMA exige que cada cifra de un renglón indirecto leída por la IA cite su hoja y su fila. | 1 prueba «045/» · Tareas T11, T17, T27 | verde |
| RF-39 | SI la celda citada no contiene la cifra leída, ENTONCES EL SISTEMA descarta esa cifra. | 1 prueba «045/» · Tareas T11, T17, T27 | verde |
| RF-40 | SI se descarta una cifra de un renglón indirecto, ENTONCES EL SISTEMA marca ese renglón para revisión. | 1 prueba «045/» · Tareas T11, T17, T27 | verde |
| RF-41 | SI un renglón indirecto del Excel no se ajusta a ninguna de las formas de cálculo de RF-74 a RF-77, ENTONCES E… | 3 pruebas «045/» · Tareas T11, T17, T27 | verde |
| RF-42 | SI un renglón indirecto del Excel se guarda como valor fijo por no ajustarse a ninguna forma, ENTONCES EL SIST… | 2 pruebas «045/» · Tareas T11, T17, T27 | verde |
| RF-43 | SI el total que el sistema calcula para un concepto indirecto difiere del total que trae el Excel para ese con… | 1 prueba «045/» · Tareas T11, T17, T27 | verde |
| RF-44 | EL SISTEMA permite editar en pantalla un borrador nacido de un Excel igual que uno nacido del presupuesto. | T18 y T27: el borrador del V2 se edita, guarda y aprueba en pantalla igual que uno del presupuesto. | verde |
| RF-45 | CUANDO se edita en pantalla un borrador nacido de un Excel, EL SISTEMA muestra que sus valores ya no coinciden… | T18: `editadoEnPantalla: true`; T26 y T27: el aviso «Lo que se corrija aquí ya no coincide…» en el borrador de Excel. | verde |
| RF-46 | MIENTRAS una planificación esté en borrador, EL SISTEMA permite a una persona con acceso Director de Proyectos… | 1 prueba «045/» · Tareas T8, T14, T23 | verde |
| RF-47 | MIENTRAS una planificación esté en borrador, EL SISTEMA permite a una persona con acceso Director de Proyectos… | 1 prueba «045/» · Tareas T8, T14, T23 | verde |
| RF-48 | MIENTRAS una planificación esté en borrador, EL SISTEMA permite a una persona con acceso Director de Proyectos… | 1 prueba «045/» · Tareas T8, T14, T23 | verde |
| RF-49 | MIENTRAS una planificación esté en borrador, EL SISTEMA permite a una persona con acceso Director de Proyectos… | 1 prueba «045/» · Tareas T8, T14, T23, T24 | verde |
| RF-50 | MIENTRAS una planificación esté en borrador, EL SISTEMA permite a una persona con acceso Director de Proyectos… | 1 prueba «045/» · Tareas T8, T14, T23, T24 | verde |
| RF-51 | MIENTRAS una planificación esté en borrador, EL SISTEMA permite a una persona con acceso Director de Proyectos… | 1 prueba «045/» · Tareas T8, T14, T23, T24 | verde |
| RF-52 | EL SISTEMA no permite cambiar en la planificación el ítem de pago, la descripción, la unidad, la cantidad cont… | 2 pruebas «045/» · Tareas T8, T14, T23 | verde |
| RF-53 | EL SISTEMA no permite cambiar en la planificación la descripción ni el valor de un rubro. | 2 pruebas «045/» · Tareas T8, T14, T23 | verde |
| RF-54 | SI se digita una medida, un precio, un costo o un valor negativo, ENTONCES EL SISTEMA lo rechaza explicando el… | 2 pruebas «045/» · Tareas T8, T14, T23 | verde |
| RF-55 | SI se digita una cantidad de meses que no es un número entero mayor que cero, ENTONCES EL SISTEMA la rechaza e… | 5 pruebas «045/» · Tareas T1, T8, T14, T23 | verde |
| RF-56 | CUANDO cambia un valor del borrador, EL SISTEMA muestra recalculados los importes, el reparto mensual, los ind… | T23: el resumen cambia sin guardar (4,2 ms por tecla con el V2); T24 y T25: los meses y los indirectos igual. | verde |
| RF-57 | CUANDO se guarda un borrador, EL SISTEMA recalcula por regla todos los importes, repartos y totales, sin tomar… | 1 prueba «045/» · Tareas T6, T14, T18 | verde |
| RF-58 | SI otra persona guardó el mismo borrador después de que se abrió, ENTONCES EL SISTEMA rechaza el guardado. | T18: dos `PUT` con la misma versión → 200 y 409; T23: lo mismo desde la pantalla. | verde |
| RF-59 | SI se rechaza un guardado porque otra persona guardó antes, ENTONCES EL SISTEMA ofrece volver a cargar el borr… | T23: «Otra persona guardó este borrador…» con «Volver a cargar el borrador», que trae lo guardado. | verde |
| RF-60 | CUANDO se guarda un borrador, EL SISTEMA registra quién lo guardó y cuándo. | T18: `actualizado_por` y `actualizado_en` con la cuenta y la hora del guardado. | verde |
| RF-61 | MIENTRAS la medida para costo de un ítem sea igual a su medida real, EL SISTEMA cambia también la medida para… | 1 prueba «045/» · Tareas T8, T23 | verde |
| RF-62 | MIENTRAS la medida para costo de un ítem sea distinta de su medida real, EL SISTEMA la conserva cuando cambia… | 1 prueba «045/» · Tareas T8, T23 | verde |
| RF-63 | MIENTRAS la medida para costo de un ítem sea distinta de su medida real, EL SISTEMA muestra el ítem con la mar… | 1 prueba «045/» · Tareas T8, T23 | verde |
| RF-64 | SI la medida para costo de un ítem está vacía, ENTONCES EL SISTEMA usa su medida real como medida para costo,… | 1 prueba «045/» · Tareas T6 | verde |
| RF-65 | EL SISTEMA calcula para cada ítem el importe contractual como su cantidad contractual por su precio contractua… | 1 prueba «045/» · Tareas T6 | verde |
| RF-66 | EL SISTEMA calcula para cada ítem el importe real como su medida real por su precio contractual. | 1 prueba «045/» · Tareas T6 | verde |
| RF-67 | EL SISTEMA calcula para cada ítem el importe a costo como su medida para costo por su precio de costo. | 1 prueba «045/» · Tareas T6 | verde |
| RF-68 | EL SISTEMA toma como importe real de cada rubro su valor, y como importe a costo de cada rubro su costo. | 1 prueba «045/» · Tareas T6 | verde |
| RF-69 | EL SISTEMA calcula el importe real total como la suma de los importes reales de ítems y rubros. | 1 prueba «045/» · Tareas T6 | verde |
| RF-70 | EL SISTEMA calcula el factor de indirectos como uno más el total de costos indirectos dividido entre la suma d… | 2 pruebas «045/» · Tareas T6 | verde |
| RF-71 | EL SISTEMA calcula para cada ítem y cada rubro el importe a costo con indirectos como su importe a costo por e… | 1 prueba «045/» · Tareas T6 | verde |
| RF-72 | EL SISTEMA calcula para cada ítem y cada rubro su resultado como su importe real menos su importe a costo con… | 1 prueba «045/» · Tareas T6 | verde |
| RF-73 | SI la suma de los importes a costo de ítems y rubros es cero, ENTONCES EL SISTEMA muestra el factor de indirec… | 1 prueba «045/» · Tareas T6 | verde |
| RF-74 | EL SISTEMA calcula un renglón indirecto de forma **valor fijo** como el valor digitado. | 1 prueba «045/» · Tareas T4 | verde |
| RF-75 | EL SISTEMA calcula un renglón indirecto de forma **porcentaje** como el porcentaje digitado por el importe rea… | 1 prueba «045/» · Tareas T4 | verde |
| RF-76 | EL SISTEMA calcula un renglón indirecto de forma **mensual** como cantidad por (valor mensual más valor mensua… | 1 prueba «045/» · Tareas T4 | verde |
| RF-77 | EL SISTEMA calcula un renglón indirecto de forma **personal** como (salario por el factor prestacional más aco… | 1 prueba «045/» · Tareas T4 | verde |
| RF-78 | EL SISTEMA exige a cada renglón indirecto una descripción. | 2 pruebas «045/» · Tareas T4 | verde |
| RF-79 | EL SISTEMA exige a cada renglón indirecto una de las cuatro formas de cálculo. | 2 pruebas «045/» · Tareas T4 | verde |
| RF-80 | EL SISTEMA agrupa los costos indirectos en siete conceptos: seguros y garantías, impuestos, maquinaria general… | 2 pruebas «045/» · Tareas T1 | verde |
| RF-81 | MIENTRAS una planificación esté en borrador, EL SISTEMA permite a una persona con acceso Director de Proyectos… | 1 prueba «045/» · Tareas T25 | verde |
| RF-82 | MIENTRAS una planificación esté en borrador, EL SISTEMA permite a una persona con acceso Director de Proyectos… | 2 pruebas «045/» · Tareas T8, T25 | verde |
| RF-83 | MIENTRAS una planificación esté en borrador, EL SISTEMA permite a una persona con acceso Director de Proyectos… | 2 pruebas «045/» · Tareas T8, T25 | verde |
| RF-84 | EL SISTEMA trata el quitar un renglón de un borrador como parte de la edición del borrador, sin conservarlo ap… | T25: «Quitar» saca el renglón de la edición; nada lo conserva aparte. | verde |
| RF-85 | EL SISTEMA guarda de cada renglón indirecto, salvo los de porcentaje, un mes de inicio y una cantidad de meses… | T4 guarda mes de inicio y meses; T25: los muestra y edita la pestaña Indirectos. | verde |
| RF-86 | EL SISTEMA guarda en cada planificación su propio factor prestacional. | 1 prueba «045/» · Tareas T1, T25 | verde |
| RF-87 | EL SISTEMA guarda en cada planificación su propio recargo de horas extras. | 1 prueba «045/» · Tareas T1, T25 | verde |
| RF-88 | CUANDO se crea un borrador sin copiar indirectos, EL SISTEMA pone como factor prestacional 1,2295. | 1 prueba «045/» · Tareas T4, T25 | verde |
| RF-89 | CUANDO se crea un borrador sin copiar indirectos, EL SISTEMA pone como recargo de horas extras 0,16. | 1 prueba «045/» · Tareas T4, T25 | verde |
| RF-90 | MIENTRAS una planificación esté en borrador, EL SISTEMA permite a una persona con acceso Director de Proyectos… | 1 prueba «045/» · Tareas T8, T25 | verde |
| RF-91 | MIENTRAS una planificación esté en borrador, EL SISTEMA permite a una persona con acceso Director de Proyectos… | 1 prueba «045/» · Tareas T8, T25 | verde |
| RF-92 | EL SISTEMA permite marcar un renglón de personal como operativo. | T25: la casilla «Operativo» del personal; con ella el total usa factor + recargo ($ 44.262.000 → $ 50.022.000). | verde |
| RF-93 | EL SISTEMA calcula los renglones de personal operativos con el factor prestacional más el recargo de horas ext… | 1 prueba «045/» · Tareas T4, T25 | verde |
| RF-94 | EL SISTEMA calcula el total de cada concepto como la suma de sus renglones. | 2 pruebas «045/» · Tareas T4, T25 | verde |
| RF-95 | EL SISTEMA calcula el total de costos indirectos como la suma de los siete conceptos. | 2 pruebas «045/» · Tareas T4, T25 | verde |
| RF-96 | EL SISTEMA reparte el importe real de cada ítem y de cada rubro entre los meses de su periodo, que empieza en… | 2 pruebas «045/» · Tareas T2 | verde |
| RF-97 | EL SISTEMA reparte el total de cada renglón indirecto de valor fijo, mensual o personal entre los meses de su… | T2 y T6: es la misma regla de reparto de ítems y rubros (pruebas «045/RF-96, RF-99» y «045/RF-98, RF-99, P7»); T25: los meses del renglón en Chrome. | verde |
| RF-98 | MIENTRAS una planificación esté en borrador, EL SISTEMA permite fijar a mano el valor de cualquier mes dentro… | 1 prueba «045/» · Tareas T2, T24 | verde |
| RF-99 | EL SISTEMA reparte en partes iguales, entre los meses del periodo que no estén fijados, el total menos la suma… | 2 pruebas «045/» · Tareas T2, T24 | verde |
| RF-100 | SI los meses fijados suman más que el total, ENTONCES EL SISTEMA lo marca como hallazgo. | 2 pruebas «045/» · Tareas T2, T24 | verde |
| RF-101 | SI todos los meses del periodo están fijados y no suman el total, ENTONCES EL SISTEMA lo marca como hallazgo. | 2 pruebas «045/» · Tareas T2, T24 | verde |
| RF-102 | EL SISTEMA ofrece en cada ítem, rubro y renglón con meses fijados la acción «Repartir en partes iguales», que… | 1 prueba «045/» · Tareas T2, T8, T24 | verde |
| RF-103 | CUANDO cambia el mes de inicio o la cantidad de meses, EL SISTEMA descarta los meses fijados que quedan fuera… | 2 pruebas «045/» · Tareas T2, T8, T24 | verde |
| RF-104 | CUANDO se descartan meses fijados por cambio de periodo, EL SISTEMA avisa cuáles se descartaron. | 2 pruebas «045/» · Tareas T2, T8, T24 | verde |
| RF-105 | EL SISTEMA reparte el total de un renglón indirecto de porcentaje en cada mes en proporción al importe real pr… | 1 prueba «045/» · Tareas T3 | verde |
| RF-106 | SI ningún ítem ni rubro tiene programación, ENTONCES EL SISTEMA reparte los renglones de porcentaje en partes… | 1 prueba «045/» · Tareas T3 | verde |
| RF-107 | SI ningún ítem ni rubro tiene programación, ENTONCES EL SISTEMA lo marca como hallazgo. | 2 pruebas «045/» · Tareas T3 | verde |
| RF-108 | EL SISTEMA obtiene la cantidad programada de cada mes de un ítem dividiendo el valor del mes entre su precio c… | 2 pruebas «045/» · Tareas T3 | verde |
| RF-109 | EL SISTEMA reparte el importe a costo de cada ítem y de cada rubro en los mismos meses y en la misma proporció… | 2 pruebas «045/» · Tareas T3 | verde |
| RF-110 | SI un ítem tiene precio contractual cero, ENTONCES EL SISTEMA reparte su importe a costo en partes iguales ent… | 1 prueba «045/» · Tareas T3 | verde |
| RF-111 | SI un ítem tiene precio contractual cero, ENTONCES EL SISTEMA no le asigna cantidad programada en ningún mes. | 1 prueba «045/» · Tareas T3 | verde |
| RF-112 | CUANDO se crea un borrador desde el presupuesto, EL SISTEMA permite escoger una planificación vigente o reempl… | 2 pruebas «045/» · Tareas T16, T19, T22 · T28 en Chrome: la lista ofrece la v8 del V2 (160 renglones) y el v9 nació con sus 160 renglones copiados. | verde |
| RF-113 | EL SISTEMA no ofrece para copiar indirectos una planificación que solo tenga «Indirectos sin desglose» (RF-140… | 2 pruebas «045/» · Tareas T16, T19 | verde |
| RF-114 | CUANDO se copian renglones indirectos, EL SISTEMA copia de cada uno su concepto, descripción, forma de cálculo… | 2 pruebas «045/» · Tareas T5 | verde |
| RF-115 | CUANDO se copian renglones indirectos, EL SISTEMA copia también el factor prestacional y el recargo de horas e… | 2 pruebas «045/» · Tareas T5 | verde |
| RF-116 | CUANDO se copian renglones indirectos, EL SISTEMA pone como mes de inicio de cada renglón el mes de arranque d… | 2 pruebas «045/» · Tareas T5 | verde |
| RF-117 | CUANDO se copian renglones indirectos, EL SISTEMA no copia sus meses fijados. | 2 pruebas «045/» · Tareas T5 | verde |
| RF-118 | SI un renglón copiado dura más meses que el plazo del borrador nuevo, ENTONCES EL SISTEMA reduce su cantidad d… | 2 pruebas «045/» · Tareas T5 | verde |
| RF-119 | SI se reduce la cantidad de meses de un renglón copiado, ENTONCES EL SISTEMA lo marca para revisión. | 2 pruebas «045/» · Tareas T5 | verde |
| RF-120 | SI no se escoge ninguna planificación para copiar, ENTONCES EL SISTEMA crea el borrador sin renglones indirect… | 1 prueba «045/» · Tareas T9 | verde |
| RF-121 | EL SISTEMA muestra en el borrador de cuál planificación se copiaron los indirectos. | 1 prueba «045/» · Tareas T25 | verde |
| RF-122 | EL SISTEMA muestra en el resumen del borrador el total contractual, el importe real total, el total a costo, e… | T23 y T26: el resumen muestra contractual, importe real, costo, indirectos, factor y resultado; T27: factor 2,92 del V2. | verde |
| RF-123 | EL SISTEMA muestra en el resumen el total de cada concepto indirecto y su reparto por mes. | T26: la tabla «Indirectos por concepto y mes», de `indirectosPorConcepto`. | verde |
| RF-124 | EL SISTEMA aplica al borrador los hallazgos de la 043 (sus RF-25 a RF-31). | T7 y T26: `hallazgosDelBorrador` incluye los de la 043; T27: los 3 «No está en el presupuesto» del V2. | verde |
| RF-125 | SI un ítem, un rubro o un renglón indirecto tiene programación después del último mes del plazo, ENTONCES EL S… | 1 prueba «045/» · Tareas T7, T26 | verde |
| RF-126 | EL SISTEMA incluye en los hallazgos los ítems, rubros y renglones marcados para revisión. | 1 prueba «045/» · Tareas T7, T26 | verde |
| RF-127 | SI algún ítem con medida real mayor que cero no tiene precio de costo, ENTONCES EL SISTEMA no permite aprobar. | 1 prueba «045/» · Tareas T7, T20 | verde |
| RF-128 | SI algún rubro con valor mayor que cero no tiene costo, ENTONCES EL SISTEMA no permite aprobar. | 1 prueba «045/» · Tareas T7, T20 | verde |
| RF-129 | SI algún ítem no tiene medida real, ENTONCES EL SISTEMA no permite aprobar. | 2 pruebas «045/» · Tareas T7, T20 | verde |
| RF-130 | SI algún ítem con medida real mayor que cero o algún rubro con valor mayor que cero no tiene programación, ENT… | 2 pruebas «045/» · Tareas T7, T20 | verde |
| RF-131 | SI algún renglón indirecto tiene su total sin calcular por faltarle un valor, ENTONCES EL SISTEMA no permite a… | 1 prueba «045/» · Tareas T7, T20 | verde |
| RF-132 | CUANDO el sistema no permite aprobar, EL SISTEMA lista los ítems, rubros y renglones que lo impiden. | T20: el 422 trae la lista; T26: «Lo que falta para aprobar» con los 5 rubros por nombre. | verde |
| RF-133 | EL SISTEMA considera sin precio de costo un ítem o un rubro cuyo costo está vacío, en cero o por debajo de un… | 1 prueba «045/» · Tareas T7, T20 | verde |
| RF-134 | EL SISTEMA permite aprobar con los demás hallazgos, con la confirmación única de la 043 (su RF-35). | T20, T26 y T27: aprobar con los hallazgos confirmados → 200 (31 y 226 hallazgos). | verde |
| RF-135 | EL SISTEMA permite aprobar únicamente a una persona con acceso Director de Proyectos o Gerencia. | T20: `aprobar` exige el permiso de aprobar planificación, la tabla de permisos de la 043 (probada en `verificar`). | verde |
| RF-136 | SI una persona aprueba un borrador que cambió después de que ella lo abrió, ENTONCES EL SISTEMA avisa que camb… | T20: el aprobar de la 043 compara la versión; el 409 sin hallazgos ofrece volver a cargar (T26). | verde |
| RF-137 | CUANDO se aprueba una planificación, EL SISTEMA deja de permitir cambios en ella, incluidos su factor prestaci… | T18 y T20: `PUT` a una vigente → 409 «Solo se edita un borrador…». | verde |
| RF-138 | EL SISTEMA permite a una persona con acceso Director de Proyectos o Gerencia crear un borrador nuevo copiando… | 2 pruebas «045/» · Tareas T9, T14, T19, T26 | verde |
| RF-139 | CUANDO se crea un borrador copiando la vigente, EL SISTEMA copia su plazo, su mes de arranque, sus ítems, sus… | 1 prueba «045/» · Tareas T9, T19 | verde |
| RF-140 | SI la versión copiada solo tiene sus indirectos como un total por mes, ENTONCES EL SISTEMA los copia como un ú… | 4 pruebas «045/» · Tareas T5, T9, T19 | verde |
| RF-141 | EL SISTEMA marca para revisión el renglón «Indirectos sin desglose». | 2 pruebas «045/» · Tareas T5, T19 | verde |
| RF-142 | SI la obra ya tiene un borrador, ENTONCES EL SISTEMA pide confirmar antes de sustituirlo, como en la 043 (su R… | 1 prueba «045/» · Tareas T16, T19, T22 | verde |
| RF-143 | CUANDO se sustituye un borrador, EL SISTEMA lo conserva como descartado, como en la 043 (su RF-116). | T16 y T19: el borrador sustituido queda `descartada`. | verde |
| RF-144 | EL SISTEMA numera, aprueba, reemplaza, anula y aplica por periodo las planificaciones hechas en pantalla igual… | T19, T20, T26 y T27: copias y borradores de pantalla se numeran, aprueban y reemplazan como los de Excel (v6, v7, v8). | verde |
| RF-145 | EL SISTEMA muestra los indirectos de una planificación que solo los tiene como total por mes en un único rengl… | 1 prueba «045/» · Tareas T5, T20 | verde |
| RF-146 | EL SISTEMA no cambia ninguna cifra de los informes de una planificación aprobada antes de esta spec. | 1 prueba «045/» · Tareas T20 | verde |
| RF-147 | EL SISTEMA muestra en cada planificación si nació del presupuesto, de un Excel o de copiar otra versión, y en… | T26: la cifra «Origen»: «De un Excel», «Del presupuesto», «Copia de la vN». | verde |
| RF-148 | DONDE una versión nació de un Excel, EL SISTEMA conserva y deja descargar ese Excel original desde esa versión… | T27: la descarga del Excel original de la v8 responde 200 (1,7 MB). | verde |
| RF-149 | DONDE una versión no nació de un Excel, EL SISTEMA no ofrece en ella la descarga de un Excel original. | T20: la copia v6 trae `tieneExcel: false` y la descarga da 404; T23: sin botón. | verde |
| RF-150 | EL SISTEMA muestra los renglones indirectos, con todos sus valores, únicamente a Gerencia, Director de Proyect… | 1 prueba «045/» · Tareas T20, T26 · Recorte con las funciones de la ruta (T20). **Demo en T28** con la cuenta `prueba.director.045`: la v8 le llega con 111 renglones y ninguno de mano de obra; los de «Instalaciones» y «Varios» sí. | verde |
| RF-151 | EL SISTEMA muestra al Director de Obra únicamente el total y el reparto mensual del concepto mano de obra indi… | 1 prueba «045/» · Tareas T20, T26 · **Demo en T28**: el total de mano de obra indirecta intacto ($ 4.695.599.547) y su columna mes a mes en «Indirectos por concepto y mes», sin renglones ni nombres de la nómina. | verde |
| RF-152 | EL SISTEMA aplica RF-151 en pantalla, en las descargas y en el asistente. | 2 pruebas «045/» · Tareas T20, T21 · Pantalla y descargas en T20 y T21; **T28**: la descarga del Excel original le responde 403 y la pantalla no ofrece el botón. El asistente solo recibe el informe de cumplimiento, con totales por concepto y sin renglones. | verde |
| RF-153 | EL SISTEMA muestra a Gerencia y al Director de Proyectos los renglones de mano de obra indirecta con todos sus… | 1 prueba «045/» · Tareas T20 | verde |
| RF-154 | EL SISTEMA no muestra la planificación al Residente ni a los demás accesos, como en la 043. | T20: la tabla de permisos de la 043 no cambió (sus pruebas «043/» siguen en verde). | verde |
| RF-155 | EL SISTEMA mide el cumplimiento de la 043 con una planificación hecha en pantalla igual que con una nacida de… | T21: el informe mensual de `PRUEBA-043` mide con la v6 de la 045 (copia) igual que con las de Excel. | verde |
| RF-156 | EL SISTEMA propone el plan semanal de la 044 con la programación de la planificación vigente, cualquiera que s… | T21: la propuesta del plan semanal nació sobre la v6 de la 045. | verde |
| RF-157 | EL SISTEMA toma como indirectos programados del mes, para el resultado de los informes de la 043, la suma de l… | 3 pruebas «045/» · Tareas T6, T12, T21 | verde |
| RF-158 | EL SISTEMA muestra en el informe mensual de la 043 los indirectos programados del mes desglosados por concepto… | 5 pruebas «045/» · Tareas T12, T21 | verde |
| RF-159 | EL SISTEMA no mide el cumplimiento de los rubros, como en la 043 (su RF-134). | Sin cambios en la medición: `cumplimiento-de-obra.ts` sigue tratando los rubros solo como programado (pruebas de la 043). | verde |
| RF-160 | EL SISTEMA calcula todos los importes, factores, repartos y totales por regla, nunca por la IA. | T6: `recalcularPlanificacion` deriva todo; T18: el `PUT` ignora totales falsos; T10: de la IA solo se toma el calendario. | verde |
| RF-161 | EL SISTEMA redondea los importes en pesos solo al mostrarlos, y suma con los valores sin redondear. | T6: los cálculos suman sin redondear (la fila 12 del V2 cuadra al peso); las pantallas redondean con `enPesos`. | verde |
| RF-162 | EL SISTEMA no borra nunca una planificación ni ninguna parte de una versión aprobada. | Revisión del código: ninguna ruta de la 045 borra; las sustituidas quedan `descartada` y las aprobadas no se editan (409). | verde |
| RF-163 | DONDE el Excel programe los rubros juntos en una sola línea, EL SISTEMA considera esa línea como la programaci… | 1 prueba «045/» · Tareas T6 | verde |
| RF-164 | DONDE los rubros estén programados en una sola línea, EL SISTEMA guarda los meses de esa línea como meses fija… | 1 prueba «045/» · Tareas T6 | verde |
| RF-165 | MIENTRAS una planificación esté en borrador, EL SISTEMA permite editar la línea de rubros como un solo renglón… | 1 prueba «045/» · Tareas T8, T24 | verde |
| RF-166 | MIENTRAS una planificación esté en borrador, EL SISTEMA permite pedir «Programar por rubro» sobre la línea de… | 1 prueba «045/» · Tareas T8, T24 | verde |
| RF-167 | CUANDO se pide «Programar por rubro», EL SISTEMA quita la línea de rubros y deja cada rubro sin programación,… | 1 prueba «045/» · Tareas T8, T24 | verde |
| RF-168 | SI un renglón indirecto del Excel no trae valores mes a mes, ENTONCES EL SISTEMA le pone como periodo el mes d… | 1 prueba «045/» · Tareas T26b | verde |
| RF-169 | CUANDO el sistema pone el periodo de un renglón indirecto según RF-168, EL SISTEMA lo muestra con el aviso «Pe… | Tareas T26b | verde |
| RF-170 | EL SISTEMA incluye en los hallazgos los renglones indirectos con periodo deducido, aparte de los marcados para… | Tareas T26b | verde |
| RF-171 | CUANDO se cambia el mes de inicio o la cantidad de meses de un renglón con periodo deducido, EL SISTEMA le qui… | Tareas T26b | verde |

## Demo de la spec

| Criterio de finalización | Dónde | Estado |
| --- | --- | --- |
| Cada RF de cálculo y la validación de la propuesta de la IA con su caso en `verificar` | RF-61 a RF-77, RF-85 a RF-111, RF-127 a RF-133, RF-140 y RF-20 a RF-23, RF-27: todos con prueba «045/», salvo RF-85, RF-92 y RF-97 (cubiertos por la prueba de la forma y la del reparto, que es la misma regla) | hecho |
| Los tres comandos en verde | Arriba | hecho |
| **Demo del presupuesto**: crear con 16 meses y arranque, copiando indirectos; ver la propuesta en curso; digitar costos de ítems y rubros; fijar un mes; aprobar con un ítem sin costo (rechazado); completar y aprobar; nueva versión copiando la vigente | T22 (crear y esperar), T23 (costos y choque al guardar), T24 (fijar un mes, rubros), T26 (rechazo con la lista, aprobar, «Nueva versión»). **Copiar indirectos, en T28**: el v9 de `PRUEBA-043` nació con 16 meses desde 2026-01, el calendario de la IA (24 s) y los 160 renglones de la v8; 81 quedaron marcados por no caber en el plazo (RF-117) | hecho |
| … el Director de Obra la ve sin los renglones de mano de obra indirecta y propone un plan semanal sobre ella | **T28**, con la cuenta de prueba `prueba.director.045` (Director de Obra, solo `PRUEBA-043`), en `localhost:8082`. **Ve la v8** en «Solo lectura»: sin crear, subir Excel, nueva versión, anular ni Excel original (403); 111 renglones y ninguno de mano de obra; el total del concepto y su columna por mes intactos. **Propone el plan semanal** del 16 al 22 de noviembre con IA: nació en borrador con `planificacion_id` = la v8, armado por esa cuenta | hecho |
| **Demo del Excel**: V2 OPC 8 con indirectos por renglón, comparación contra el libro, costos digitados, un valor corregido, «Repartir en partes iguales», aprobar | T27 (`ensayo-v2-opc8.md`): los 7 conceptos iguales al peso, marcados 16,06 % (< 25 %), v8 vigente | hecho |
| **Demo de una planificación vieja**: la de la 043 da las mismas cifras con «Indirectos sin desglose» y su versión nueva lo trae marcado | T20 (la v5 con un único «Indirectos sin desglose»), T19 (la copia lo trae marcado), prueba «045/RF-146» | hecho |

Requisitos no funcionales: recálculo de 200 ítems y 200 renglones en 3,8 ms (T27); el V2 cuadra según el umbral del 25 % (T27); interfaz en español con los tokens del tema. **La propuesta de la IA solo se probó con 38 ítems** (20–24 s), no con 200: el tope es de 4 minutos y debería alcanzar, pero no está medido.

## Alcance

- Lo único que no pedía la spec original, el **periodo deducido**, entró por `/sdd:cambio` (RF-168 a RF-171, D17) antes de implementarse.
- La regla de la T9 copia los rubros del grupo escogido y los de todo el contrato, no los de otro frente. La letra de RF-15 decía «cada rubro del presupuesto»; Diego aprobó precisarla (2026-11-16), y la spec ya lo dice.
- La T28b añadió `GET /api/panel/planificaciones/propuesta-en-curso`, que solo lee; la pide RF-28.
- **Sigue fuera de alcance**: la IA no propone costos, medidas ni valores (`validarCalendario` solo toma inicio, meses y explicación, prueba «045/RF-20 a RF-27»); lo contractual no se edita (`aplicarEdicion` lo toma siempre del anterior, prueba «045/RF-52, RF-53»); no hay descarga con el formato del Excel del Director de Proyectos; no se leen las hojas auxiliares; «Indirectos sin desglose» no se desglosa solo; el cumplimiento no mide indirectos ni rubros; el plan semanal (044) solo cambió en lo de RF-156; nada amarra requisiciones (048).
- Cambio respecto a la 043 que ya está en la spec (RF-152): el Director de Obra **ya no baja el Excel original** (403), porque trae la nómina.

## Constitución

1. **Local-first**: la 045 no toca el móvil.
2. **La spec manda**: el cambio del periodo deducido pasó por la spec, y la lectura de RF-15 se llevó a la spec antes de cerrar.
3. **Una regla, un solo sitio**: todo cálculo está en `src/shared/rules/` (`planificacion-borrador.ts`, `-reparto.ts`, `-indirectos.ts`, `-calendario-ia.ts`, `-ia.ts`). El editor llama a `aplicarEdicion` y a `recalcularPlanificacion`, las mismas que el servidor.
4. **Nada se borra**: los borradores sustituidos quedan `descartada`; las aprobadas no se editan; quitar un renglón es editar un borrador (RF-84).
5. **Puerta de calidad**: cada tarea se marcó con los tres comandos en verde.
6. **Fronteras duras**: la clave de la IA y la base solo en `+api.ts` y `servidor/`; las fugas, limpias.
7. **Español y diseño**: código, textos y tablas en español; las tablas nuevas caben en `MaxContentWidthPanel` (sumas anotadas en T23 a T26).
8. **Sin dependencias nuevas**: `package.json` no cambió.

## Observaciones que no impiden cumplir

- **Falta de memoria del servidor de desarrollo (antes de desplegar).** Pasó por tercera vez en esta tarea, ahora **sin leer ningún Excel**: al terminar la propuesta del v9, el proceso llegó a 4 GB y se cayó (`Reached heap limit`, tras 2 h 55 min encendido). El v9 quedó bien escrito. Fuera del servidor, las mismas funciones (recalcular el v9, el detalle y el listado) usan unos 24 MB. Apunta al servidor de desarrollo (Metro, que empaqueta cada ruta con unos 1 000 módulos y acumula) más que a la regla. Pero hay que confirmarlo con la imagen de producción (`expo export` + servidor Node) antes de desplegar, porque en el VPS tumbaría el panel.
- La cifra grande del resumen del editor se parte en dos líneas dentro de su tarjeta (T23).
- La descarga del Excel original de la v5 (de la 043) da 404 en desarrollo; parece que el archivo no está en el almacén de desarrollo (T20).
- **Datos de prueba nuevos**: en `PRUEBA-043`, el borrador **v9** con los indirectos copiados de la v8 (T28) quedó descartado en la T28b, y el borrador actual es otro **v9** «Del presupuesto», sin indirectos (`01a1e566-33e3-…`). La vigente sigue siendo la v8 del V2. La T28b hizo una llamada más a la IA del calendario.

## Veredicto

**Sí: la spec 045 está cumplida.** Los 171 RF tienen su comprobación con resultado y están en verde. Los tres comandos pasan y las tres demos de los criterios de finalización están hechas. Lo que no se cumplía en la primera pasada (RF-6, RF-7, RF-28) lo cerró la T28b, RF-15 se precisó en la spec, y la demo del Director de Obra se hizo con una cuenta de prueba. Estado de la spec: **Cumplida**.

Queda **antes de desplegar**, fuera de la spec: la falta de memoria del servidor (arriba).
