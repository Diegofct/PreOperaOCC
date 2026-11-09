# Tareas — Spec 043, Planificación de obra y cumplimiento

Tareas de menos de 30 minutos, ordenadas por dependencia. Cada una lleva los RF que
cubre y una línea `Hecho cuando:` que se pueda comprobar sin interpretar.

**Se implementa una tarea cada vez** (`/sdd:implementar T1`), y al terminarla se para.
Ninguna tarea se marca sin `npm run verificar`, `npm run typecheck` y `npm run lint`
en verde. Por eso, «en verde» abajo significa esos tres comandos.

Producción no se toca: todo va a la base de desarrollo (`neondb`). Tras tocar una ruta
`+api.ts` hay que reiniciar el servidor; el panel de desarrollo va en el puerto 8082.

Datos de las pruebas: las filas reales del V5 de Magdalena y de su presupuesto, copiadas a
mano como casos pequeños en `scripts/verificar-reglas.ts`. La verificación no abre los Excel.

## Reglas puras

- [x] T1. **`rules/permisos.ts`**: módulos `planificacion` y `cumplimiento`, sus filas en `TABLA` según el plan y sus motivos de rechazo, con pruebas «043/» por rol y acción. El módulo `contrato` del Residente no cambia. (RF-1, RF-36, RF-48, RF-49, RF-50, RF-86 a RF-90, RF-136)
      Hecho cuando: las pruebas confirman que el Residente tiene `ver` y `listar` en `cumplimiento` y nada en `planificacion`, que el Director de Obra no puede `escribir`, `aprobar` ni `anular`, que el Almacenista no tiene nada y que el Residente conserva `ver` en `contrato`; en verde.
- [x] T2. **`rules/planificacion.ts`** (nuevo): tipos, estados y estructura de ítems, programación mensual, indirectos, rubros, supuestos y objetivos; `cantidadDelMes` (valor ÷ precio contractual); guarda de rubros en una sola línea. Pruebas «043/». (RF-11 a RF-18, RF-108, RF-109)
      Hecho cuando: el ítem 5.1.7 con $18.146.151 a $112.153 da 161,798 unidades, un precio en cero no divide y devuelve sin cantidad, y la línea «Componentes» queda como un solo valor mensual; en verde.
- [x] T3. **Cruce con el presupuesto** en `planificacion.ts`: llave normalizada de grupo, capítulo e ítem; asociación del frente al grupo; presupuesto sin grupos; resolución por renglón; rubros contra rubros. Pruebas «043/». (RF-19, RF-105, RF-106, RF-107, RF-110)
      Hecho cuando: Berrio cruza con su grupo, el mismo ítem y capítulo no cruza con Yondo, un empate devuelve los grupos candidatos, un presupuesto sin grupos cruza por capítulo e ítem, un libro con solo «Nº» resuelve el ítem por renglón y un rubro sin par no sale como ítem; en verde.
- [x] T4. **Hallazgos** en `planificacion.ts`: uno por cada tipo, con lo marcado para revisión. Pruebas «043/». (RF-25 a RF-32, RF-115)
      Hecho cuando: hay un caso que dispara y otro que no por cada RF; un costo de 0,000000001 cuenta como sin costo; un ítem con medida real en cero no sale «sin programación»; sin fecha de fin del contrato no se lista RF-30; un ítem marcado aparece en hallazgos; en verde.
- [x] T5. **Resumen** en `planificacion.ts`: totales con medida real y contractual, margen, resultado y diferencia con el total del Excel. Pruebas «043/». (RF-23, RF-33, RF-111 a RF-114)
      Hecho cuando: con los totales del V5 (39.558.848.104 contractual a medida real, 10.791.439.267 a costo y 20.440.864.487 de indirectos) el resultado da 8.326.544.350; con otro total del Excel aparece la diferencia; en verde.
- [x] T6. **`rules/cumplimiento-de-obra.ts`** (nuevo), versión que rige: `versionQueRige`, fechas de aprobación y anulación y meses anteriores por marcar. Pruebas «043/». (RF-52, RF-53, RF-55, RF-56, RF-57, RF-120, RF-121, RF-138)
      Hecho cuando: el día de aprobar cuenta con la versión nueva, el día de anular queda sin meta, un día anterior a la primera aprobación usa esa versión aunque esté anulada, sin versión devuelve sin meta y los meses por marcar excluyen el mes actual y los que no tienen programación; en verde.
- [x] T7. **Meta** en `cumplimiento-de-obra.ts`: días de reparto, meta diaria y meta del periodo, con el plan semanal como parámetro. Pruebas «043/». (RF-63 a RF-67, RF-119, RF-130)
      Hecho cuando: un festivo no recibe meta, el mes sin cambio de versión da exacto lo programado, una semana entre dos meses suma lo de cada uno, un periodo partido reparte por días, una semana con plan usa ese plan y no sale «estimada», y una semana incumplida no cambia la siguiente; en verde.
- [x] T8. **Ejecutado** en `cumplimiento-de-obra.ts`: suma por llave, porcentajes, pendientes, fuera de planificación, sin capítulo, avisos y «Meta cumplida». Pruebas «043/». (RF-60 a RF-62, RF-68 a RF-74, RF-123 a RF-129)
      Hecho cuando: una actividad en Yondo no suma a Berrio y sale fuera, una sin capítulo sale con su marca, un parte anulado no cuenta, el porcentaje pasa de 100, sin meta sale «Sin programación», se cuentan abiertos y días de reparto sin parte (no los futuros), un mes marcado y sus semanas completas muestran «Meta cumplida» y uno sin marcar da su porcentaje; en verde.
- [x] T9. **Valores** en `cumplimiento-de-obra.ts`: programado, ejecutado, a cobrar, «Faltó» o «Sobró», margen, resultado mensual, ítems sin costo, indirectos y rubros. Pruebas «043/». (RF-75 a RF-85, RF-131 a RF-135)
      Hecho cuando: las cuentas salen con la versión de cada día, un ítem sin costo sale de los cuatro totales con su aviso, el resultado aparece solo en el mensual, indirectos y rubros no llevan porcentaje y los rubros no tocan el margen; en verde.
- [x] T10. **Informe completo** en `cumplimiento-de-obra.ts`: semana de lunes a domingo, mes, versiones usadas y `sinPlata`. Pruebas «043/». (RF-54, RF-58, RF-59, RF-88, RF-89)
      Hecho cuando: el informe lista las versiones usadas y una prueba recorre todo el objeto de `sinPlata` sin encontrar ninguna clave de precio, costo, valor, margen, resultado, indirectos ni rubros; en verde.
- [x] T11. **`rules/planificacion-ia.ts`** (nuevo), qué se manda: solo hojas visibles, muestra para proponer, texto citado para leer, tope de 1 500 filas y reglas de línea base, flujo de caja y frentes. Pruebas «043/». (RF-4, RF-5, RF-6, RF-100 a RF-104)
      Hecho cuando: una hoja oculta no entra, solo se mandan las confirmadas, cada línea trae su hoja y fila, con línea base no se acepta el flujo como programación, sin línea base exige confirmar y dos hojas de frente exigen escoger una; en verde.
- [x] T12. **`planificacion-ia.ts`**, qué se acepta: comprobación contra la celda, ítem marcado, cero en celda vacía, observaciones limitadas y lectura sin ítems. Pruebas «043/». (RF-9, RF-20, RF-21, RF-22, RF-24)
      Hecho cuando: una cifra sin hoja o fila se descarta, una inventada marca su ítem, un cero con celda vacía se acepta, una observación sobre un hallazgo inexistente se descarta y una lectura sin ítems devuelve error; en verde.

## Datos

- [x] T13. **Esquema y migración `0042`**: enums, `dueno_media`, `proposito_media`, las tres tablas, índices parciales y `check`, generada con `npm run db:generate:servidor` y aplicada a desarrollo. (RF-8, RF-41, RF-42, RF-44, RF-97, RF-116, RF-117)
      Hecho cuando: existe `drizzle/servidor/0042_*.sql`, la migración corre en `neondb`, una prueba manual confirma que no entran dos borradores, dos vigentes ni dos lecturas en curso de la misma obra; en verde.
- [x] T14. **`features/panel/planificacion.ts`** (nuevo): tipos y esquemas Zod de peticiones y respuestas, sin importar nada del servidor. (Transversal)
      Hecho cuando: las formas de todas las rutas del plan están declaradas y una prueba rechaza una aprobación sin `version` y una anulación con motivo vacío; en verde.

## Servidor

- [x] T15. **Libro con nombres y visibilidad** en `leer-excel.ts`, sin cambiar `hojasDelLibro`. (RF-5, RF-6)
      Hecho cuando: un script de una sola vez lista las 28 hojas del V5 con 5 ocultas; la importación de presupuestos sigue igual; en verde.
- [x] T16. **`planificacion/servidor/leer-con-ia.ts`** (nuevo): proponer hojas y leerlas, con salida estructurada, streaming y 4 minutos sin reintentos. (RF-4, RF-20, RF-24)
      Hecho cuando: con el V5, un script de una sola vez devuelve la `Línea base` como programación y `PLANIFIC BERRIO` entre las hojas de planificación; la lectura trae 41 ítems con hoja y fila, de los que 38 cruzan con el presupuesto; en verde.
- [ ] T17. **`POST /planificaciones/hojas`** con sus validaciones. (RF-1, RF-2, RF-3, RF-4, RF-100)
      Hecho cuando: el V5 responde 200 con la propuesta; un `.xls` renombrado, 422; una obra sin presupuesto vigente, 409 con su explicación; un Director de Obra, 403; en verde.
- [ ] T18. **Abrir la lectura** en `lecturas.ts`: vencer las pasadas, reservar la obra y guardar el original; `media/[id]` no entrega estos archivos. (RF-8, RF-50, RF-117)
      Hecho cuando: una segunda lectura en la misma obra recibe 409, una lectura vencida ya no bloquea, el original queda en el almacén y `GET /media/:id` de ese archivo responde 404; en verde.
- [ ] T19. **Correr la lectura por detrás** y crear el borrador: guardada o nueva, comprobación, cruce, hallazgos y resumen. (RF-7, RF-9, RF-10)
      Hecho cuando: con el V5 queda un borrador con 41 ítems; repetir el archivo con las mismas hojas no llama a la IA; una lectura sin ítems termina `fallida` sin borrador; en verde.
- [ ] T20. **`POST /leer` y `GET /lecturas/:id`**, con sustituir y escoger grupo. (RF-6, RF-43, RF-103, RF-107, RF-116)
      Hecho cuando: la subida responde 202 y el estado pasa a `lista`; con borrador y sin `sustituir`, 409; al sustituir, el anterior queda `descartada` y la versión conserva su número; un empate termina en `falta_grupo` y al escoger crea el borrador sin llamar a la IA; en verde.
- [ ] T21. **`planificaciones.ts`**: listado y detalle, con aviso de presupuesto más nuevo. (RF-40, RF-41, RF-42, RF-44, RF-45, RF-49, RF-86, RF-91)
      Hecho cuando: el listado muestra v1 y estados; un Director de Obra ve solo sus obras, otra responde 404; el detalle no tiene ninguna ruta de edición de valores; al aprobar un presupuesto nuevo el detalle trae el aviso; en verde.
- [ ] T22. **Aprobar** en `versiones.ts` y su ruta. (RF-34 a RF-39, RF-46, RF-99, RF-120 a RF-122)
      Hecho cuando: sin confirmar hallazgos, 409 con la lista; sin meses en la primera, 409 con los meses; con versión vieja, 409 sin cambios; al aprobar quedan quién, cuándo, presupuesto y `rige_desde`; una versión nueva deja la anterior `reemplazada`; un Director de Obra, 403; en verde.
- [ ] T23. **Anular** en `versiones.ts` y su ruta. (RF-47, RF-48, RF-55, RF-118, RF-138)
      Hecho cuando: sin motivo, 400; una reemplazada, 409; la vigente queda `anulada` con motivo y `rige_hasta` de ayer; un Director de Obra, 403; en verde.
- [ ] T24. **`GET /planificaciones/:id/excel`**. (RF-8, RF-50)
      Hecho cuando: Gerencia, Director de Proyectos y Director de Obra en su obra bajan un archivo idéntico al subido, y Residente y Almacenista reciben 403; en verde.
- [ ] T25. **`servidor/cumplimiento.ts` y `GET /cumplimiento`**. (RF-54, RF-58 a RF-91, RF-96, RF-98)
      Hecho cuando: con partes de prueba, el informe semanal y el mensual responden lo que da la regla; el Residente recibe la respuesta sin claves de plata; el Almacenista, 403; ninguna fila de partes, presupuestos ni preoperacionales cambia; en verde.
- [ ] T26. **Descarga en Excel**: exportar el escritor de hojas de Reportes y armar el informe, sin plata para el Residente. (RF-92, RF-96)
      Hecho cuando: el Excel trae las mismas cifras que `GET /cumplimiento`, el del Residente no tiene columnas de plata y los reportes existentes siguen descargando igual; en verde.
- [ ] T27. **Descarga en PDF** con `pdfDelAsistente` y ruta de exportación. (RF-93, RF-96)
      Hecho cuando: `formato=pdf` baja un PDF que abre, con las mismas cifras, y sin plata para el Residente; en verde.
- [ ] T28. **Asistente**: consulta `cumplimiento_de_obra`, módulo consultable e instrucción de preguntar la obra. Pruebas «043/» del alcance. (RF-89, RF-94, RF-95, RF-96, RF-137)
      Hecho cuando: el asistente da las cifras del informe; al Residente no le da plata; el Director de Obra solo recibe su obra en uso; la Gerencia sin obra recibe la pregunta de cuál; en verde.

## Pantallas

- [ ] T29. **Menú, páginas y lista de versiones.** (RF-44, RF-49, RF-86, RF-88, RF-90)
      Hecho cuando: el Director de Proyectos ve «Planificación» y «Cumplimiento», el Residente solo «Cumplimiento», el Almacenista ninguna, y la lista abre cada versión en solo lectura; en verde.
- [ ] T30. **Subir y confirmar hojas**, con progreso, escoger frente y grupo y confirmar sustitución. (RF-1, RF-4, RF-6, RF-43, RF-100, RF-103, RF-107, RF-117)
      Hecho cuando: en el navegador se sube el V5, se confirma la hoja de Berrio y la línea base, se ve el progreso, y al cerrar la pestaña y volver aparece el borrador; en verde.
- [ ] T31. **Detalle del borrador**: resumen, hallazgos y aviso de presupuesto, sin campos editables. (RF-25 a RF-33, RF-40, RF-45, RF-51, RF-111 a RF-115)
      Hecho cuando: se ven los totales con ambas medidas, margen, resultado, cada hallazgo y ningún valor se puede cambiar; las columnas caben en `MaxContentWidthPanel`; en verde.
- [ ] T32. **Aprobar, marcar meses y anular** en pantalla. (RF-34, RF-35, RF-47, RF-99, RF-121, RF-122)
      Hecho cuando: en el navegador se confirma una sola vez el conjunto de hallazgos, se marcan los meses y se aprueba; se anula con motivo obligatorio; un cambio ajeno muestra el aviso sin aplicar; en verde.
- [ ] T33. **Informe en cantidades** con periodo y avisos. (RF-54, RF-56, RF-58 a RF-74, RF-82, RF-123 a RF-130)
      Hecho cuando: el Residente ve meta, ejecutado, porcentaje y pendientes, con «estimada», «Sin programación», «Meta cumplida» y los avisos, y ninguna columna de plata; en verde.
- [ ] T34. **Informe con plata y descargas.** (RF-75 a RF-85, RF-87, RF-92, RF-93, RF-131 a RF-135)
      Hecho cuando: el Director de Obra ve valores, «Faltó» o «Sobró», margen y, solo en el mensual, resultado, indirectos y rubros aparte; descarga Excel y PDF; las columnas caben en `MaxContentWidthPanel`; en verde.

## Cierre

- [ ] T35. **Ensayo con los libros reales y control de fugas**: cargar en desarrollo el presupuesto y el V5, y probar el libro de Cartagena para ver si la lectura pasa o explica el motivo. Comprobar el export web. (RF-9, RF-104)
      Hecho cuando: Magdalena da 38 ítems cruzados con su resultado por escrito; Cartagena da un borrador o el motivo claro; `npx expo export --platform web` termina, `grep -r "DATABASE_URL" dist/client` sale vacío y `dist` se borró; en verde.
- [ ] T36. Validación final: recorrido RF por RF de la spec + demo manual. (Todos)
      Hecho cuando: cada RF tiene su comprobación con resultado en `validacion.md`, la demo de la spec se completó con Director de Proyectos, Director de Obra, Residente y Almacenista, los tres comandos están en verde y la spec queda marcada como Cumplida.

## Notas de ejecución

- **T1:** los módulos van en `MODULOS_DE_EMPRESA` y no en `MODULOS`, porque solo existen en el menú de una obra y así no alteran `modulosVisibles` ni el módulo de entrada de nadie.
- **T1, fuera de esta tarea, sin corregir:** `motivoParaNoAprobar` le dice al Residente que el contrato lo aprueba el Director de Obra, y según la tabla (041/RF-58) el Director de Obra no aprueba contratos. En la planificación quedó resuelto con el tercer parámetro; en `contrato` el mensaje sigue igual.
- **T2, para T11 y T12:** en el V5, la `Línea base` no trae mes de inicio ni tiempo de ejecución (RF-13, RF-14): esas columnas están en `FLUJO DE CAJA`. RF-102 solo prohíbe tomar de ahí la **programación**, así que esas dos columnas se pueden leer de esa hoja; por eso los dos campos admiten vacío.
- **T5, para T19 y T35:** el resultado se calcula con los indirectos **programados**. Con los del V5 cargados de la `Línea base` (unos $20.254 millones) dará unos $8.513 millones, no los $8.326.544.350 de la hoja de Berrio (que usa $20.441 millones). La diferencia de unos $187 millones debe verse en el resumen (RF-114), y T35 lo comprueba con el libro real.
- **T6, corrección al plan:** la fecha de Colombia sale de `fechaDeJornada` y no de `fechaLocalISO`, que usa la hora del equipo y en el servidor daría la de UTC. T22 y T23 deben usar `fechaDeJornada`.
- **T7, para la spec 044:** si una semana tiene plan semanal aprobado y un ítem no viene en ese plan, ese ítem queda sin meta esa semana. La 044 debe confirmar si es lo que se quiere.
- **T8, duda para Diego:** marcar un mes como cumplido cambia lo que muestra ese mes, pero no suma cantidades al acumulado de la obra (RF-129 solo cuenta partes). Si un mes marcado no tiene partes, el pendiente total de la obra se ve mayor de lo que es. La spec no lo define; si se quiere otro comportamiento, va por `/sdd:cambio`.
- **T11, para T16 y T35:** el mes de inicio y el tiempo de ejecución se piden con el uso `tiempos`, sobre `FLUJO DE CAJA`. Sumar esa hoja deja la lectura del V5 cerca del tope (unas 1 450 filas de 1 500). Si T35 se pasa, ese uso es lo primero que se puede dejar opcional, porque los dos campos admiten vacío.
- **T12, límite conocido:** la comprobación mira que la cifra esté en la fila citada, no en una columna, porque cada libro las pone distinto. Una cifra inventada que coincida con otro número de esa misma fila (por ejemplo, el «Nº» del renglón) pasaría. Es improbable en precios y valores grandes, y por eso el cuadre con los totales del Excel (RF-114) sigue siendo la segunda red.
- **T16, resultado con el V5 real:** 800 filas, 124 555 tokens de entrada y 25 889 de salida, 178 s (cerca de 1 USD por lectura nueva; RF-10 evita repetirla). Son 41 ítems: los 38 del presupuesto y 3 que no están en él. Sin ninguna cifra rechazada. Rubros 5 de 5 con par. El tope pasó de 3 a 4 minutos, y el vencimiento de T18 tiene que ser mayor.
- **T16, pendiente de decisión de Diego (va por `/sdd:cambio`):** el Excel calcula el costo con una tercera medida, «Med. Coste», distinta de la real en 7 ítems y con efecto en 3 (5.1.15, 35.1 y 35.2). Con la medida real, el total a costo da $1.200 millones menos que el Excel. Además, 35.1 y 35.2 no tienen precio contractual y salen como `costo_mayor`, que para ellos no significa nada.
- **T13:** se añadió `rechazados` a `planificaciones`, que el plan no listaba: los descartes de rubros, indirectos y totales no marcan ningún ítem, y sin esa columna quedarían invisibles. Y `media/[id]` ya responde 404 a estos archivos desde aquí, porque el dueño nuevo no compilaba sin decidirlo; T18 lo comprueba de punta a punta.
