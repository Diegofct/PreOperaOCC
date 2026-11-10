# Validación — Spec 043, Planificación de obra y cumplimiento

> Fecha: 2026-11-10 · Tarea T36 · Base: desarrollo (`neondb`), obras `PRUEBA-043` y `PRUEBA-043-C`.

## Comandos, ejecutados de verdad

```
$ npm run verificar
811 verificaciones correctas.
(salida 0; 97 pruebas «043/»)

$ npm run typecheck
> tsc --noEmit && tsc --noEmit -p tsconfig.scripts.json
(salida 0, sin errores)

$ npm run lint
> expo lint
(salida 0, sin avisos)
```

Fugas (T35): `npx expo export --platform web` termina; `grep -r "DATABASE_URL" dist/client` sale vacío, y
tampoco aparecen `ANTHROPIC_API_KEY`, `R2_LLAVE_SECRETA` ni `SECRETO_TOKENS`; `dist` borrado. La migración
`0042` está presente y aplicada solo en desarrollo.

## Requisito por requisito

141 RF. 116 tienen al menos una prueba automática «043/» en `scripts/verificar-reglas.ts`; los 25
restantes se comprobaron contra el servidor o en el navegador en la tarea que se cita, con el resultado
anotado en las notas de ejecución de `tareas.md`. Ninguno queda sin cubrir.

| RF | Requisito | Qué lo cubre | Resultado |
| --- | --- | --- | --- |
| RF-1 | EL SISTEMA permite a una persona con acceso Director de Proyectos o Gerencia subir un Excel de planificación p… | 1 prueba «043/» · Tareas T1, T17, T30 | verde |
| RF-2 | SI la obra no tiene presupuesto vigente, ENTONCES EL SISTEMA rechaza la subida explicando que primero hay que … | T17: obra sin presupuesto vigente → 409 «Esta obra no tiene presupuesto vigente…». | verde |
| RF-3 | SI el contenido del archivo no es `.xlsx`, aunque su nombre termine así, ENTONCES EL SISTEMA lo rechaza explic… | T17: `.xls` renombrado a `.xlsx` → 422 «Ese archivo no es un Excel (.xlsx), aunque su nombre lo diga…». | verde |
| RF-4 | CUANDO se sube un libro, EL SISTEMA propone qué hojas contienen la planificación por ítem, la programación men… | 1 prueba «043/» · Tareas T11, T16, T17, T30 | verde |
| RF-5 | EL SISTEMA no propone las hojas ocultas del libro. | 3 pruebas «043/» · Tareas T11, T15 | verde |
| RF-6 | CUANDO la persona confirma las hojas, EL SISTEMA lee únicamente esas hojas. | 4 pruebas «043/» · Tareas T11, T15, T20, T30 | verde |
| RF-7 | CUANDO termina la lectura, EL SISTEMA crea una planificación en borrador. | T19: el V5 deja el borrador v1 con 41 ítems; T30: en el navegador aparece el borrador v4. | verde |
| RF-8 | EL SISTEMA conserva el Excel original junto a la planificación. | T18: el original queda idéntico byte a byte en el almacén; T24: se baja idéntico. | verde |
| RF-9 | SI la lectura falla o no encuentra ningún ítem, ENTONCES EL SISTEMA no crea ningún borrador y explica el motiv… | 1 prueba «043/» · Tareas T12, T19, T35 | verde |
| RF-10 | CUANDO se sube un archivo ya leído con las mismas hojas, EL SISTEMA muestra la lectura guardada sin esperar un… | T19: repetir el V5 con las mismas hojas tarda 2,9 s y no llama a la IA; T20 y T30, igual por la pantalla. | verde |
| RF-11 | EL SISTEMA guarda de cada ítem su precio de costo. | 1 prueba «043/» · Tareas T2 | verde |
| RF-12 | EL SISTEMA guarda de cada ítem su cantidad planeada, que es la «medida real» del Excel. | 1 prueba «043/» · Tareas T2 | verde |
| RF-13 | EL SISTEMA guarda de cada ítem su mes de inicio. | 2 pruebas «043/» · Tareas T2 | verde |
| RF-14 | EL SISTEMA guarda de cada ítem su tiempo de ejecución. | 2 pruebas «043/» · Tareas T2 | verde |
| RF-15 | EL SISTEMA guarda de cada ítem su programación por mes del calendario. | 1 prueba «043/» · Tareas T2 | verde |
| RF-16 | EL SISTEMA obtiene la cantidad programada de cada mes dividiendo el valor programado de ese mes entre el preci… | 1 prueba «043/» · Tareas T2 | verde |
| RF-17 | EL SISTEMA guarda los indirectos programados por mes. | 1 prueba «043/» · Tareas T2 | verde |
| RF-18 | EL SISTEMA guarda los supuestos y objetivos como texto. | 1 prueba «043/» · Tareas T2 | verde |
| RF-19 | EL SISTEMA reconoce un ítem de la planificación como uno del presupuesto cuando coinciden el grupo, el capítul… | 4 pruebas «043/» · Tareas T3 | verde |
| RF-20 | EL SISTEMA exige que cada cifra leída por la IA cite su hoja y su fila. | 3 pruebas «043/» · Tareas T12, T16 | verde |
| RF-21 | SI la celda citada no contiene la cifra leída, ENTONCES EL SISTEMA descarta esa cifra. | 7 pruebas «043/» · Tareas T12 | verde |
| RF-22 | SI se descarta una cifra de un ítem, ENTONCES EL SISTEMA marca ese ítem para revisión. | 2 pruebas «043/» · Tareas T12 | verde |
| RF-23 | EL SISTEMA calcula todos los totales, márgenes y diferencias por regla. | 1 prueba «043/» · Tareas T5 | verde |
| RF-24 | EL SISTEMA muestra observaciones redactadas por la IA únicamente sobre hallazgos listados en el borrador. | 1 prueba «043/» · Tareas T12, T16 | verde |
| RF-25 | CUANDO se crea un borrador, EL SISTEMA lista los ítems que no existen en el presupuesto vigente. | 1 prueba «043/» · Tareas T4, T31 | verde |
| RF-26 | CUANDO se crea un borrador, EL SISTEMA lista los ítems cuya unidad difiere de la del presupuesto. | 1 prueba «043/» · Tareas T4, T31 | verde |
| RF-27 | CUANDO se crea un borrador, EL SISTEMA lista los ítems cuya cantidad contractual difiere de la del presupuesto… | 1 prueba «043/» · Tareas T4, T31 | verde |
| RF-28 | CUANDO se crea un borrador, EL SISTEMA lista los ítems con precio contractual mayor que cero cuyo precio de co… | 2 pruebas «043/» · Tareas T4, T31, T37 | verde |
| RF-29 | CUANDO se crea un borrador, EL SISTEMA lista los ítems con medida real mayor que cero y sin programación. | 1 prueba «043/» · Tareas T4, T31 | verde |
| RF-30 | DONDE el contrato tenga fecha de fin, EL SISTEMA lista al crear el borrador los ítems programados en meses pos… | 1 prueba «043/» · Tareas T4, T31 | verde |
| RF-31 | CUANDO se crea un borrador, EL SISTEMA lista los ítems sin precio de costo. | 1 prueba «043/» · Tareas T4, T31 | verde |
| RF-32 | EL SISTEMA considera sin precio de costo un ítem cuyo costo está vacío, en cero o por debajo de un peso. | 3 pruebas «043/» · Tareas T4, T31 | verde |
| RF-33 | EL SISTEMA muestra en el resumen del borrador el total a precio contractual y el total a costo, con medida rea… | 1 prueba «043/» · Tareas T5, T31 | verde |
| RF-34 | EL SISTEMA permite aprobar una planificación con hallazgos. | T22 y T32: se aprueba con 23 hallazgos, tras confirmarlos. | verde |
| RF-35 | SI el borrador tiene hallazgos, ENTONCES EL SISTEMA exige una sola confirmación del conjunto antes de aprobar. | 1 prueba «043/» · Tareas T22, T32 | verde |
| RF-36 | EL SISTEMA permite aprobar únicamente a una persona con acceso Director de Proyectos o Gerencia. | 2 pruebas «043/» · Tareas T1, T22 | verde |
| RF-37 | CUANDO se aprueba una planificación, EL SISTEMA registra quién la aprobó. | T22: `aprobado_por` es quien aprobó. | verde |
| RF-38 | CUANDO se aprueba una planificación, EL SISTEMA registra la fecha y hora de aprobación. | T22: `aprobado_en` con fecha y hora. | verde |
| RF-39 | CUANDO se aprueba una planificación, EL SISTEMA registra la versión del presupuesto contra la que se cruzó. | T22: queda el presupuesto contra el que se cruzó y su versión. | verde |
| RF-40 | CUANDO se aprueba un presupuesto nuevo sobre una planificación aprobada, EL SISTEMA avisa en la planificación … | T21: al aprobar un presupuesto v2, el detalle pasa a avisar (`false` → `true`). | verde |
| RF-41 | EL SISTEMA mantiene como máximo un borrador por obra. | T13: índice único parcial de borrador; T20: con borrador y sin sustituir, 409. | verde |
| RF-42 | EL SISTEMA mantiene como máximo una planificación vigente por obra. | T13: índice único parcial de vigente; T22: la v2 deja la v1 reemplazada en el mismo lote. | verde |
| RF-43 | CUANDO se sube un Excel en una obra que ya tiene borrador, EL SISTEMA pide confirmar antes de sustituir ese bo… | T20: con borrador y sin `sustituir`, 409; T30: la casilla «Sustituir el borrador v4» en pantalla. | verde |
| RF-44 | EL SISTEMA numera las planificaciones de cada obra como v1, v2, etc. | T21 y T29: listado v1, v2, v3…; T20: al sustituir, la versión conserva su número. | verde |
| RF-45 | EL SISTEMA no permite editar una planificación aprobada. | T21: `PUT`, `PATCH` y `DELETE` responden 405; T31: cero campos editables en la página. | verde |
| RF-46 | CUANDO se aprueba una versión nueva, EL SISTEMA deja la anterior como reemplazada. | T22: aprobar la v2 deja la v1 `reemplazada`. | verde |
| RF-47 | CUANDO se anula una planificación, EL SISTEMA exige un motivo escrito. | 1 prueba «043/» · Tareas T23, T32 | verde |
| RF-48 | EL SISTEMA permite anular únicamente a una persona con acceso Director de Proyectos o Gerencia. | 2 pruebas «043/» · Tareas T1, T23 | verde |
| RF-49 | EL SISTEMA deja abrir en solo lectura cualquier versión anterior o anulada únicamente a Gerencia, Director de … | 1 prueba «043/» · Tareas T1, T21, T29 | verde |
| RF-50 | EL SISTEMA deja descargar el Excel original de cualquier versión únicamente a Gerencia, Director de Proyectos … | 1 prueba «043/» · Tareas T1, T18, T24 | verde |
| RF-51 | EL SISTEMA no permite cambiar en pantalla los valores de un borrador. | T21: no hay ruta de edición; T31: el detalle no tiene ningún campo editable. | verde |
| RF-52 | EL SISTEMA mide cada día con la versión aprobada que regía en esa fecha, salvo los días anteriores a la primer… | 1 prueba «043/» · Tareas T6 | verde |
| RF-53 | CUANDO un mes o una semana incluye un cambio de versión, EL SISTEMA parte el periodo por la fecha de aprobació… | 1 prueba «043/» · Tareas T6 | verde |
| RF-54 | EL SISTEMA muestra en cada informe qué versión o versiones usó. | 1 prueba «043/» · Tareas T10, T25, T33 | verde |
| RF-55 | CUANDO se anula la versión vigente, EL SISTEMA conserva esa versión para medir los días en que rigió. | 1 prueba «043/» · Tareas T6, T23 | verde |
| RF-56 | MIENTRAS una obra no tenga versión vigente, EL SISTEMA muestra los días nuevos sin meta, con el aviso «Sin pla… | 4 pruebas «043/» · Tareas T6, T33 | verde |
| RF-57 | EL SISTEMA mide los días anteriores a la primera aprobación con la primera versión aprobada, aunque esa versió… | 1 prueba «043/» · Tareas T6 | verde |
| RF-58 | EL SISTEMA ofrece un informe de cumplimiento por semana, de lunes a domingo. | 2 pruebas «043/» · Tareas T10, T25, T33 | verde |
| RF-59 | EL SISTEMA ofrece un informe de cumplimiento por mes del calendario. | 2 pruebas «043/» · Tareas T10, T25, T33 | verde |
| RF-60 | EL SISTEMA toma como ejecutado las cantidades por ítem de los partes de obra no anulados del periodo. | 3 pruebas «043/» · Tareas T8, T25, T33 | verde |
| RF-61 | SI el periodo incluye partes abiertos, ENTONCES EL SISTEMA avisa cuántos días siguen abiertos. | 1 prueba «043/» · Tareas T8, T25, T33 | verde |
| RF-62 | SI el periodo incluye partes abiertos, ENTONCES EL SISTEMA avisa que esas cifras pueden cambiar. | 1 prueba «043/» · Tareas T8, T25, T33 | verde |
| RF-63 | EL SISTEMA toma como meta del mes la cantidad programada de ese mes, aunque sus semanas tengan plan semanal ap… | 1 prueba «043/» · Tareas T7, T25, T33 | verde |
| RF-64 | DONDE exista un plan semanal aprobado para la semana, EL SISTEMA toma de él la meta de esa semana. | 2 pruebas «043/» · Tareas T7, T25, T33 | verde |
| RF-65 | SI la semana no tiene plan semanal aprobado, ENTONCES EL SISTEMA calcula la meta repartiendo la cantidad del m… | 2 pruebas «043/» · Tareas T7, T25, T33 | verde |
| RF-66 | CUANDO la meta sale del reparto del mes, EL SISTEMA la marca como «estimada». | 1 prueba «043/» · Tareas T7, T25, T33 | verde |
| RF-67 | CUANDO una semana cae entre dos meses, EL SISTEMA suma lo que le corresponde de cada mes según los días de rep… | 1 prueba «043/» · Tareas T7, T25, T33 | verde |
| RF-68 | EL SISTEMA muestra por ítem la meta del periodo. | 1 prueba «043/» · Tareas T8, T25, T33 | verde |
| RF-69 | EL SISTEMA muestra por ítem la cantidad ejecutada del periodo. | 1 prueba «043/» · Tareas T8, T25, T33 | verde |
| RF-70 | EL SISTEMA muestra por ítem el porcentaje de cumplimiento. | 1 prueba «043/» · Tareas T8, T25, T33 | verde |
| RF-71 | EL SISTEMA muestra por ítem la cantidad pendiente del periodo. | 1 prueba «043/» · Tareas T8, T25, T33 | verde |
| RF-72 | EL SISTEMA muestra el porcentaje real aunque supere el 100 %. | 1 prueba «043/» · Tareas T8, T25, T33 | verde |
| RF-73 | SI un ítem no tiene meta en el periodo, ENTONCES EL SISTEMA muestra lo ejecutado con «Sin programación», sin p… | 2 pruebas «043/» · Tareas T8, T25, T33 | verde |
| RF-74 | EL SISTEMA muestra aparte lo ejecutado en actividades fuera de la planificación. | 2 pruebas «043/» · Tareas T8, T25, T33 | verde |
| RF-75 | EL SISTEMA calcula el valor programado multiplicando la meta por el precio de costo de la versión que rige. | 3 pruebas «043/» · Tareas T9, T25, T34 | verde |
| RF-76 | EL SISTEMA calcula el valor ejecutado multiplicando lo ejecutado por el precio de costo de la versión que rige… | 2 pruebas «043/» · Tareas T9, T25, T34 | verde |
| RF-77 | EL SISTEMA calcula el valor a cobrar multiplicando lo ejecutado por el precio contractual de la versión que ri… | 1 prueba «043/» · Tareas T9, T25, T34 | verde |
| RF-78 | EL SISTEMA muestra la diferencia entre el valor ejecutado y el valor programado como «Faltó» o «Sobró» frente … | 1 prueba «043/» · Tareas T9, T25, T34 | verde |
| RF-79 | EL SISTEMA muestra como margen del periodo la diferencia entre el valor a cobrar y el valor ejecutado, antes d… | 1 prueba «043/» · Tareas T9, T25, T34 | verde |
| RF-80 | SI un ítem de la planificación ejecutado no tiene precio de costo, ENTONCES EL SISTEMA lo muestra aparte con s… | 1 prueba «043/» · Tareas T9, T25, T34 | verde |
| RF-81 | EL SISTEMA excluye los ítems sin precio de costo del valor ejecutado, del valor a cobrar, del margen y del res… | 1 prueba «043/» · Tareas T9, T25, T34 | verde |
| RF-82 | SI el periodo tiene ítems sin precio de costo, ENTONCES EL SISTEMA avisa que los totales no los incluyen. | 1 prueba «043/» · Tareas T9, T25, T33, T34 | verde |
| RF-83 | EL SISTEMA muestra los indirectos del mes como «Programado» en una sección aparte del informe mensual. | 1 prueba «043/» · Tareas T9, T25, T34 | verde |
| RF-84 | EL SISTEMA no calcula porcentaje de cumplimiento sobre los indirectos. | 1 prueba «043/» · Tareas T9, T25, T34 | verde |
| RF-85 | EL SISTEMA excluye los indirectos del «Faltó» o «Sobró». | 1 prueba «043/» · Tareas T9, T25, T34 | verde |
| RF-86 | EL SISTEMA muestra al Director de Obra, en sus obras, la planificación vigente con todos sus valores. | 2 pruebas «043/» · Tareas T1, T21, T25, T29 | verde |
| RF-87 | EL SISTEMA muestra los informes con plata únicamente a Gerencia, Director de Proyectos y Director de Obra en s… | 2 pruebas «043/» · Tareas T1, T25, T34 | verde |
| RF-88 | MIENTRAS la persona tenga el acceso Residente, EL SISTEMA le muestra el cumplimiento de su obra sin ninguna ci… | 4 pruebas «043/» · Tareas T1, T10, T25, T29 | verde |
| RF-89 | EL SISTEMA no entrega al Residente ningún dato de la planificación ni ninguna cifra de plata de estos informes… | 4 pruebas «043/» · Tareas T1, T10, T25, T28 | verde |
| RF-90 | SI una persona sin acceso pide la planificación o un informe, ENTONCES EL SISTEMA rechaza la petición. | 2 pruebas «043/» · Tareas T1, T25, T29 | verde |
| RF-91 | EL SISTEMA limita cada persona a las obras de su alcance. | T21, T24 y T25: un Director de Obra de otra obra recibe 404; T28: el asistente responde solo de la obra en uso. | verde |
| RF-92 | EL SISTEMA permite descargar el informe del periodo en Excel. | 2 pruebas «043/» · Tareas T26, T34 | verde |
| RF-93 | EL SISTEMA permite descargar el informe del periodo en PDF. | 1 prueba «043/» · Tareas T27, T34 | verde |
| RF-94 | CUANDO se pregunta al asistente cómo va una semana o un mes, EL SISTEMA responde con el cumplimiento de ese pe… | 1 prueba «043/» · Tareas T28 | verde |
| RF-95 | MIENTRAS un Director de Obra use el asistente, EL SISTEMA hace que responda solo de su obra en uso. | 1 prueba «043/» · Tareas T28 | verde |
| RF-96 | EL SISTEMA da las mismas cifras en pantalla, descargas y asistente para un mismo periodo. | 2 pruebas «043/» · Tareas T25, T26, T27, T28 | verde |
| RF-97 | EL SISTEMA no borra ninguna planificación. | Revisión del código: ninguna sentencia `delete` en la 043 (solo un mapa en memoria); descartar, anular y reemplazar son cambios de estado. | verde |
| RF-98 | EL SISTEMA no modifica partes de obra, presupuestos ni preoperacionales al subir, aprobar o anular una planifi… | T25: las huellas md5 de partes de otras obras, presupuestos y preoperacionales no cambian. | verde |
| RF-99 | SI una persona aprueba o sustituye un borrador que cambió después de que ella lo abrió, ENTONCES EL SISTEMA av… | 1 prueba «043/» · Tareas T22, T32 | verde |
| RF-100 | SI el libro trae una hoja de planificación por cada frente, ENTONCES EL SISTEMA pide escoger una sola. | 2 pruebas «043/» · Tareas T11, T17, T30 | verde |
| RF-101 | EL SISTEMA toma como programación mensual la línea base o planificación inicial del libro. | 1 prueba «043/» · Tareas T11 | verde |
| RF-102 | SI el libro trae una línea base, ENTONCES EL SISTEMA no toma la programación del flujo de caja. | 1 prueba «043/» · Tareas T11 | verde |
| RF-103 | SI el libro no trae una línea base identificable, ENTONCES EL SISTEMA pide confirmar qué hoja contiene la prog… | 2 pruebas «043/» · Tareas T11, T20, T30 | verde |
| RF-104 | EL SISTEMA no exige nombres de hoja, número de frentes ni posiciones de columna fijos. | 1 prueba «043/» · Tareas T11, T35 | verde |
| RF-105 | EL SISTEMA asocia la planificación con el grupo del presupuesto que corresponde a su frente. | 1 prueba «043/» · Tareas T3 | verde |
| RF-106 | SI el presupuesto no tiene grupos, ENTONCES EL SISTEMA reconoce el ítem por el capítulo y el ítem de pago. | 1 prueba «043/» · Tareas T3 | verde |
| RF-107 | SI el frente no se puede asociar a un único grupo, ENTONCES EL SISTEMA pide escoger el grupo antes de crear el… | 1 prueba «043/» · Tareas T3, T20, T30 | verde |
| RF-108 | EL SISTEMA guarda los rubros de la planificación con su valor programado por mes. | 1 prueba «043/» · Tareas T2 | verde |
| RF-109 | SI el libro programa los rubros en una sola línea, ENTONCES EL SISTEMA guarda esa línea como un solo valor men… | 2 pruebas «043/» · Tareas T2 | verde |
| RF-110 | EL SISTEMA cruza los rubros de la planificación con los rubros del presupuesto y no con sus ítems. | 2 pruebas «043/» · Tareas T3 | verde |
| RF-111 | EL SISTEMA calcula el margen del borrador como el total a precio contractual menos el total a costo, antes de … | 2 pruebas «043/» · Tareas T5, T31 | verde |
| RF-112 | EL SISTEMA calcula el resultado del borrador como su margen menos los indirectos programados. | 2 pruebas «043/» · Tareas T5, T31 | verde |
| RF-113 | EL SISTEMA muestra el margen y el resultado del borrador con medida real y con medida contractual. | 1 prueba «043/» · Tareas T5, T31 | verde |
| RF-114 | SI el total leído difiere del total que trae el Excel, ENTONCES EL SISTEMA muestra la diferencia en el resumen… | 1 prueba «043/» · Tareas T5, T31 | verde |
| RF-115 | EL SISTEMA incluye en los hallazgos los ítems marcados para revisión. | 1 prueba «043/» · Tareas T4, T31 | verde |
| RF-116 | CUANDO se sustituye un borrador, EL SISTEMA lo conserva como descartado, con quién lo sustituyó y cuándo. | T20: el borrador sustituido queda `descartada` con quién; T30: igual desde la pantalla. | verde |
| RF-117 | MIENTRAS una lectura esté en curso en una obra, EL SISTEMA rechaza otra subida en esa obra explicando el motiv… | T18: la segunda lectura en la misma obra recibe 409 con su explicación. | verde |
| RF-118 | EL SISTEMA permite anular únicamente la versión vigente. | T23: la v1 reemplazada no se anula (409); solo la vigente. | verde |
| RF-119 | CUANDO un periodo se parte por un cambio de versión, EL SISTEMA reparte la meta de cada versión según los días… | 2 pruebas «043/» · Tareas T7 | verde |
| RF-120 | EL SISTEMA cuenta el día de la aprobación con la versión nueva, según la fecha de Colombia. | 1 prueba «043/» · Tareas T6, T22 | verde |
| RF-121 | CUANDO se aprueba la primera planificación de una obra, EL SISTEMA pide marcar, mes por mes, cuáles meses ante… | 2 pruebas «043/» · Tareas T6, T22, T32 | verde |
| RF-122 | CUANDO se marca un mes como cumplido, EL SISTEMA registra quién lo marcó y cuándo. | T22: `meses_cumplidos` guarda quién y cuándo; un mes no preguntado se ignora. | verde |
| RF-123 | MIENTRAS un mes esté marcado como cumplido, EL SISTEMA muestra «Meta cumplida» en lugar del porcentaje de ese … | 1 prueba «043/» · Tareas T8, T33 | verde |
| RF-124 | MIENTRAS un mes esté marcado como cumplido, EL SISTEMA muestra «Meta cumplida» en las semanas que caen por com… | 1 prueba «043/» · Tareas T8, T33 | verde |
| RF-125 | SI un mes anterior no se marca como cumplido, ENTONCES EL SISTEMA lo mide contra los partes como cualquier otr… | 1 prueba «043/» · Tareas T8, T33 | verde |
| RF-126 | EL SISTEMA cuenta una actividad contra un ítem de la planificación solo si coinciden su grupo, su capítulo y s… | 1 prueba «043/» · Tareas T8, T33 | verde |
| RF-127 | SI una actividad no tiene capítulo, ENTONCES EL SISTEMA la muestra entre las actividades fuera de la planifica… | 1 prueba «043/» · Tareas T8, T33 | verde |
| RF-128 | SI el periodo tiene días de reparto sin parte, ENTONCES EL SISTEMA avisa cuántos son. | 1 prueba «043/» · Tareas T8, T33 | verde |
| RF-129 | EL SISTEMA muestra por ítem la cantidad pendiente del total de la obra frente a la planeada. | 1 prueba «043/» · Tareas T8, T33 | verde |
| RF-130 | EL SISTEMA no traslada lo no cumplido de un periodo a la meta de los periodos siguientes. | 1 prueba «043/» · Tareas T7, T33 | verde |
| RF-131 | EL SISTEMA muestra en el informe mensual el resultado del mes, que es su margen menos los indirectos programad… | 1 prueba «043/» · Tareas T9, T34 | verde |
| RF-132 | EL SISTEMA no muestra resultado después de indirectos en el informe semanal. | 1 prueba «043/» · Tareas T9, T34 | verde |
| RF-133 | EL SISTEMA muestra los rubros del mes como «Programado» en una sección aparte del informe mensual. | 1 prueba «043/» · Tareas T9, T34 | verde |
| RF-134 | EL SISTEMA no calcula porcentaje de cumplimiento sobre los rubros. | 1 prueba «043/» · Tareas T9, T34 | verde |
| RF-135 | EL SISTEMA excluye los rubros del «Faltó» o «Sobró», del margen y del resultado del periodo. | 1 prueba «043/» · Tareas T9, T34 | verde |
| RF-136 | EL SISTEMA no cambia lo que el Residente ve hoy del presupuesto, con sus precios. | 1 prueba «043/» · Tareas T1 | verde |
| RF-137 | SI una persona con acceso a todas las obras no dice de cuál pregunta, ENTONCES EL SISTEMA hace que el asistent… | T28: la Gerencia sin decir la obra recibe «¿De qué obra?» con las opciones. | verde |
| RF-138 | EL SISTEMA deja sin meta el día de la anulación, según la fecha de Colombia. | 1 prueba «043/» · Tareas T6, T23 | verde |
| RF-139 | EL SISTEMA guarda de cada ítem su medida para costo, que es la «Med. Coste» del Excel. | 2 pruebas «043/» · Tareas T37 | verde |
| RF-140 | SI el libro no trae medida para costo de un ítem, ENTONCES EL SISTEMA usa su medida real como medida para cost… | 3 pruebas «043/» · Tareas T37 | verde |
| RF-141 | EL SISTEMA calcula el total a costo con medida real multiplicando el precio de costo de cada ítem por su medid… | 2 pruebas «043/» · Tareas T37 | verde |

## Demo de la spec

Se hizo por partes a lo largo de T17 a T36, con usuarios temporales de cada cargo (borrados, salvo dos que
quedaron inactivos por ser autores de registros):

1. **Presupuesto de Magdalena** cargado del `.xlsx` oficial y aprobado en `PRUEBA-043` (T19).
2. **Subir el V5** en el navegador como Director de Proyectos: escoger Berrio entre los dos frentes, con la
   línea base ya propuesta y las demás hojas; progreso visible; al cerrar la pestaña y volver, el borrador
   (T30). Hallazgos y resumen en pantalla (T31).
3. **Aprobar como Director de Proyectos** con una sola confirmación de los 23 hallazgos y octubre marcado
   como cumplido, en `PRUEBA-043-C`, la obra sin aprobadas (T32).
4. **Informe semanal y mensual** con partes de prueba: meta «Estimada» 127.852,916 = 490.102,843 ÷ 23 × 6,
   ejecutado 15, el parte anulado fuera y la actividad de Yondo fuera de la planificación (T25, T33).
5. **Por cargo:** el Director de Obra ve la plata (programado, «Faltó», margen y, solo en el mes,
   indirectos, resultado −$776.069.067 y rubros) y descarga Excel y PDF (T34). El Residente no ve plata en
   pantalla (T33), en las descargas (T26, T27) ni en el asistente (T28), y **sigue viendo los precios del
   presupuesto** (T36: `GET /presupuestos/:id` 200, ítem 2.8 a $242.062). El Almacenista no ve las
   páginas y recibe 403 (T25, T29). Lo de Yondo no suma a Berrio (T25, T33).
6. **Una versión nueva no cambia el pasado** (T36): con la v4 aprobada, el informe de octubre y el de la
   semana del 2 al 8 de noviembre son idénticos a los de antes.
7. **Anular con motivo** (T36): la semana del 9 al 15 queda «Sin planificación aprobada» desde el 10, y el
   día 9 se mide con la v1; octubre sigue idéntico. Desde la pantalla se probó en T32.

## Alcance

- **No se implementó nada fuera de la spec.** Lo añadido que la spec no nombra es de soporte: la anotación
  de la lectura en `localStorage` (para retomar el progreso), la propuesta de hojas en la memoria del
  proceso durante dos horas, y `armarSeleccion`, que solo arma lo que RF-6 manda leer.
- **Cambios fuera de los módulos de la 043**, todos anotados en su tarea: el armador de PDF del asistente
  mide las columnas de números por su valor más largo y admite otra leyenda (T27; su prueba de humo sigue
  en verde); `importar.ts` exporta dos ayudantes (T17); `duplicadoDe` explica el 409 de lectura en curso
  (T18); el escritor de hojas de Reportes se exportó sin cambiarlo (T26).
- **Lo que la spec deja fuera sigue fuera:** plan semanal (`planSemanal: null`, spec 044), costos reales,
  cumplimiento de indirectos y de rubros, crear o corregir una planificación en pantalla (no hay `PUT` y la
  pantalla no tiene campos), `.xls` y PDF de entrada (422), más de un frente por planificación (se escoge
  uno), reprogramar lo no cumplido, APU, flujo financiero, Gantt, congelar informes, alertas por WhatsApp y
  cambios en el celular (nada en `src/db/local` ni en las rutas del operador).

## Constitución

1. **Local-first:** sin cambios en el celular ni en su base.
2. **La spec manda:** la «Med. Coste» entró por `/sdd:cambio` (D31) antes de tocar código.
3. **Una regla, un solo sitio:** las cuentas viven en `shared/rules/` (planificación, cumplimiento, IA);
   pantalla, descargas y asistente usan `informeParaLaPersona`, y ninguna pantalla calcula.
4. **Nada se borra:** sin `DELETE` en el código; sustituir, anular y reemplazar son estados.
5. **Puerta de calidad:** los tres comandos en verde en cada tarea y aquí.
6. **Fronteras duras:** los secretos solo en el servidor (control de fugas en verde); toda ruta del panel
   abre con `requerirPermiso`, y el alcance de obra sale de `obraDelContrato` y `alcanzaLaObra`.
7. **Español y diseño:** código, comentarios y textos en español; tablas dentro de `MaxContentWidthPanel`.
8. **Sin dependencias nuevas:** `package.json` sin cambios.

## Observaciones que no impiden cumplir

- **RF-24:** la regla que descarta observaciones de la IA sobre hallazgos inexistentes está probada (T12),
  pero hoy la IA no redacta observaciones, así que no se muestra ninguna. Cumple: no hay ninguna fuera de
  los hallazgos.
- **RF-107 en pantalla:** escoger el grupo se probó de punta a punta contra el servidor (T20: `falta_grupo`
  con los candidatos y, al escoger, el borrador sin llamar a la IA). La ventana de la pantalla (T30) no se
  recorrió en el navegador, porque necesita un presupuesto con frentes empatados.
- **Año que el libro no trae:** Cartagena dice «MAYO… MES 1» sin año, y la IA supuso 2024 (T35). Se ve en
  el rango del resumen antes de aprobar, como prevé el plan. Queda como propuesta para un cambio: pedir el
  año del primer mes cuando el libro no lo traiga.
- **Del asistente, de la 041 (T28):** responde de la obra en uso sin decir que cambió de obra cuando se le
  nombra otra, y una vez dejó ver un razonamiento interno. **Del panel (T29):** el aviso «Sin acceso» dice
  «otra empresa u otra obra» aunque lo que falte sea el cargo.
- **Datos de prueba en desarrollo:** las obras `PRUEBA-043` y `PRUEBA-043-C` y los usuarios inactivos
  `prueba-043-t30-dp` y `prueba-043-t32-dp`. Producción no se tocó: la migración `0042` sigue pendiente
  allá.

## Veredicto

**Cumplida.** Los 141 RF tienen su comprobación en verde, la demo de la spec se completó con los cuatro
cargos, los tres comandos están en verde y el control de fugas está limpio.
