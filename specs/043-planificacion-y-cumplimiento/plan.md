# Plan técnico — Spec 043, Planificación de obra y cumplimiento

> Lee antes `docs/constitucion.md` y el `spec.md` de esta carpeta.
> Aquí va el CÓMO. Si algo de esto cambia el comportamiento acordado, no se resuelve
> en el plan: se vuelve a la spec.

Todo es panel web y servidor. No se usa ninguna API nueva de Expo: las pantallas y las rutas
`+api.ts` siguen el patrón de Contrato y Presupuesto (031) y de Reportes (030). No se añaden
dependencias: `exceljs` y `pdf-lib` ya están en el proyecto.

## Módulos y archivos

Se reutiliza, sin copiar: la lectura de libros y el patrón de IA de `presupuestos/servidor/`, las
versiones con índices parciales y `db.batch` de `presupuestos`, `periodos.ts`, `festivos.ts`,
`fechaLocalISO` de `jornada.ts`, `pedidoDeReporte` y `actividadesHasta` de Reportes, el escritor
de hojas de `reportes/servidor/excel.ts`, `pdfDelAsistente`, `almacen.ts` y `requerirPermiso`.

### Reglas puras

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `src/shared/rules/planificacion.ts` (nuevo) | Tipos y estados; cruce con el presupuesto; hallazgos; resumen; cantidad mensual; meses anteriores por marcar | RF-11 a RF-19, RF-23, RF-25 a RF-33, RF-105 a RF-115, RF-121, RF-139 a RF-141 |
| `src/shared/rules/planificacion-ia.ts` (nuevo) | Qué se manda a la IA y qué se acepta: hojas visibles, texto citado, comprobación contra la celda | RF-4 a RF-6, RF-20 a RF-22, RF-24, RF-100 a RF-104 |
| `src/shared/rules/cumplimiento-de-obra.ts` (nuevo) | Días de reparto, versión que rige, meta por día, informe por ítem, valores y proyección sin plata | RF-52 a RF-85, RF-88, RF-89, RF-119, RF-120, RF-123 a RF-135, RF-138 |
| `src/shared/rules/permisos.ts` | Módulos `planificacion` y `cumplimiento` en la tabla | RF-1, RF-36, RF-48, RF-49, RF-50, RF-86 a RF-90 |
| `src/shared/rules/empresas.ts` | Dos entradas en `MENU_DE_OBRA` y sus rutas | RF-86, RF-88 |
| `src/shared/rules/asistente.ts` | `cumplimiento` consultable e instrucción de preguntar la obra | RF-94, RF-95, RF-137 |

### Servidor

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `src/features/presupuestos/servidor/leer-excel.ts` | Función nueva que devuelve además nombre y visibilidad de cada hoja; `hojasDelLibro` queda igual | RF-5, RF-6 |
| `src/features/planificacion/servidor/leer-con-ia.ts` (nuevo) | Las dos llamadas a la IA: proponer hojas y leerlas, con la misma forma que `presupuestos/servidor/leer-con-ia.ts` | RF-4, RF-20 |
| `src/features/planificacion/servidor/lecturas.ts` (nuevo) | Validar la subida, abrir la lectura, correrla por detrás, reutilizar la guardada y crear el borrador | RF-2, RF-3, RF-7 a RF-10, RF-43, RF-107, RF-116, RF-117 |
| `src/features/planificacion/servidor/planificaciones.ts` (nuevo) | Listar, detalle y aviso de presupuesto más nuevo, con alcance | RF-40, RF-41, RF-42, RF-44, RF-49, RF-86, RF-91, RF-97 |
| `src/features/planificacion/servidor/versiones.ts` (nuevo) | Aprobar y anular en un lote | RF-34 a RF-39, RF-45 a RF-48, RF-55, RF-99, RF-118, RF-120 a RF-122, RF-138 |
| `src/features/planificacion/servidor/cumplimiento.ts` (nuevo) | Junta los datos y llama a la regla: única fuente de pantalla, descargas y asistente | RF-54, RF-58 a RF-74, RF-87 a RF-91, RF-96, RF-98, RF-126 a RF-128 |
| `src/features/planificacion/servidor/descargas.ts` (nuevo) | Informe en Excel y PDF | RF-92, RF-93, RF-96 |
| `src/features/reportes/servidor/excel.ts` | Exporta el escritor de hojas para reutilizarlo; `libroDelReporte` queda igual | RF-92 |
| `src/features/asistente/servidor/herramientas.ts` | Consulta `cumplimiento_de_obra` | RF-89, RF-94 a RF-96, RF-137 |
| `src/features/panel/planificacion.ts` (nuevo) | Tipos y esquemas Zod compartidos por pantallas y rutas | Transversal |
| `src/app/api/panel/media/[id]+api.ts` | Los Excel de planificación no salen por esta ruta | RF-50, RF-89 |

### Rutas `+api.ts` y pantallas

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `src/app/api/panel/planificaciones+api.ts` | Listado de versiones | RF-44, RF-49 |
| `src/app/api/panel/planificaciones/hojas+api.ts` | Propuesta de hojas | RF-1 a RF-5, RF-100 |
| `src/app/api/panel/planificaciones/leer+api.ts` | Inicia la lectura | RF-6 a RF-10, RF-43, RF-103, RF-107, RF-117 |
| `src/app/api/panel/planificaciones/lecturas/[id]+api.ts` | Estado de la lectura | RNF de los 3 minutos, RF-9 |
| `src/app/api/panel/planificaciones/[id]+api.ts` | Detalle | RF-25 a RF-33, RF-49, RF-86 |
| `src/app/api/panel/planificaciones/[id]/aprobar+api.ts` | Aprobar | RF-34 a RF-39, RF-99, RF-121 |
| `src/app/api/panel/planificaciones/[id]/anular+api.ts` | Anular | RF-47, RF-48, RF-118, RF-138 |
| `src/app/api/panel/planificaciones/[id]/excel+api.ts` | Bajar el original | RF-8, RF-50 |
| `src/app/api/panel/cumplimiento+api.ts` | Informe semanal o mensual | RF-58 a RF-91 |
| `src/app/api/panel/cumplimiento/exportar+api.ts` | Descargas | RF-92, RF-93 |
| `src/features/planificacion/pantalla-planificacion.tsx` (nuevo) | Versiones, subida y confirmación de hojas, y progreso | RF-1, RF-4, RF-6, RF-43, RF-44, RF-49, RF-100, RF-107 |
| `src/features/planificacion/detalle-planificacion.tsx` (nuevo) | Resumen, hallazgos, aprobar y anular, marcar meses | RF-25 a RF-40, RF-45, RF-47, RF-51, RF-121 |
| `src/features/planificacion/pantalla-cumplimiento.tsx` (nuevo) | Informe, avisos y descargas, reutilizando el selector de periodo de Reportes | RF-54 a RF-85, RF-92, RF-93, RF-123 a RF-135 |
| `src/features/empresas/paginas-de-empresa.tsx` | Registra las dos páginas | RF-86, RF-88 |

## Modelo de datos

- **Local** (`src/db/local/schema.ts`): sin cambios.
- **Servidor** (`src/db/servidor/esquema.ts`):
  - `estado_planificacion`: `borrador | vigente | reemplazada | anulada | descartada`.
  - `estado_lectura_planificacion`: `en_curso | lista | falta_grupo | fallida`.
  - `dueno_media` añade `planificacion`; `proposito_media` añade `planificacion_excel`.
  - **`planificaciones`**, una fila por versión: `id`, `obra_id`, `numero_version`, `estado`,
    `estructura` (jsonb), `hallazgos` (jsonb), `resumen` (jsonb), `huella`, `hojas` (jsonb),
    `media_id`, `presupuesto_id`, `presupuesto_version`, `rige_desde` y `rige_hasta` (`date`,
    fechas de Colombia), `meses_cumplidos` (jsonb con `{ mes, marcadoPor, marcadoEn }`),
    `aprobado_en`/`_por`, `anulado_en`/`_por`, `motivo_anulacion`, `descartado_en`/`_por`,
    `version`, y las columnas de auditoría habituales.
    - Índices únicos parciales: uno por obra con `estado = 'vigente'`, otro con
      `estado = 'borrador'`, y `(obra_id, numero_version)` con `estado <> 'descartada'`.
    - `check`: una anulación exige motivo no vacío y un vigente o reemplazado exige `aprobado_en`.
  - **`planificacion_lecturas`**, una fila por lectura: `id`, `obra_id`, `planificacion_id`
    reservado, `estado`, `error`, `candidatos` (jsonb), `vence_en`, `creado_por`, auditoría.
    Índice único parcial por obra con `estado = 'en_curso'`.
  - **`planificacion_lecturas_ia`**: como `presupuesto_lecturas_ia`, con llave de huella del
    archivo más las hojas confirmadas.
- **Migraciones**: `npm run db:generate:servidor`; debe aparecer `drizzle/servidor/0042_*.sql`.
  Producción sigue atrás: esta migración va después de la `0041`, con
  `scripts/migrar-produccion.ts` y antes de la imagen.
- **Compatibilidad**: los teléfonos no se enteran; nada de esto baja ni sube.

## Algoritmo / reglas

**Leer (RF-4 a RF-10, RF-20 a RF-22, RF-100 a RF-117)**

1. `POST hojas`: valida permiso, obra, presupuesto vigente y que el contenido empiece por `PK`.
   La IA recibe el nombre y las primeras filas de cada hoja **visible** y propone para qué sirve
   cada una. Propone la línea base como programación; si no la identifica, la pantalla exige
   confirmar la hoja.
2. `POST leer`: con las hojas confirmadas, vence las lecturas pasadas de tiempo e inserta la nueva
   `en_curso`. Si el índice parcial choca, responde 409. Guarda el original y responde 202.
3. Por detrás: usa la lectura guardada si existe; si no, llama a la IA con el texto
   «H<hoja>F<fila> | celdas», con el tope de 1 500 filas.
4. La regla comprueba cada cifra contra la fila citada. Una cifra que no está se descarta y marca
   su ítem. Un `0` se acepta si la celda está vacía: `exceljs` entrega sin resultado las fórmulas
   que valen cero, y `hojasDelLibro` las deja en `null`.
5. Cruce (RF-19, RF-105 a RF-107): cada título de frente del libro se asocia al grupo del
   presupuesto con más coincidencias de capítulo, ítem y cantidad contractual. Si hay empate o
   ninguna, la lectura queda `falta_grupo` con los candidatos y la persona vuelve a confirmar,
   ya sin costo de IA. Si el libro solo trae el «Nº» y no el ítem de pago, el ítem se resuelve por
   el renglón del presupuesto.
6. Se calculan estructura, hallazgos y resumen, y se crea el borrador en un lote que descarta el
   anterior si se confirmó sustituirlo. Sin ningún ítem, la lectura queda `fallida`.

**Aprobar (RF-34 a RF-39, RF-121, RF-122)**

1. Comprueba estado y `version`. Con hallazgos y sin confirmación, 409 con la lista.
2. Si es la primera de la obra y hay meses anteriores al mes actual con programación, exige la
   respuesta mes por mes; sin ella, 409 con los meses.
3. Lote: la vigente pasa a `reemplazada` con `rige_hasta = hoy - 1`, y el borrador pasa a `vigente`
   con `rige_desde = hoy`, condicionado a que el borrador siga intacto.

**Anular (RF-47, RF-55, RF-118, RF-138)**: solo la vigente, con motivo, y `rige_hasta = hoy - 1`.

**Medir un periodo (RF-52 a RF-85, RF-119 a RF-135)**

1. `versionQueRige(fecha)`: la aprobada cuyo rango contiene la fecha. Antes de la primera
   aprobación, la primera aprobada, aunque se haya anulado. Si ninguna, sin meta.
2. `diasDeReparto(mes)`: lunes a sábado sin `esFestivo`.
3. Meta de un día de reparto = cantidad del mes en la versión que rige ÷ días de reparto del mes.
   La meta de cualquier periodo es la suma de sus días. Por eso el mes sin cambio de versión da
   exacto lo programado, la semana entre dos meses y el periodo partido no necesitan caso aparte.
4. Si la semana tiene plan semanal aprobado, se usa esa meta. El parámetro entra vacío hasta la
   spec 044 y se verifica con datos de prueba.
5. Ejecutado: actividades de partes no anulados cuya llave normalizada grupo + capítulo + ítem
   coincida. Sin ítem o sin capítulo, o de otro grupo, van a «fuera de la planificación».
6. Valores con precio de costo y contractual de la versión de cada día. Los ítems sin costo
   salen de todos los totales de plata y se listan aparte.
7. Solo en el mensual: resultado = margen - indirectos programados. Rubros e indirectos van en
   secciones aparte, sin porcentaje.
8. `sinPlata(informe)` construye para el Residente un objeto solo con cantidades y porcentajes.

## Decisiones técnicas

- **Una lectura por detrás con estado consultable** → se descartó la petición larga de
  presupuestos porque `docs/despliegue.md` deja el proxy en `proxy_read_timeout 120s` y la lectura
  puede tardar 3 minutos. Además, la fila en curso es la que implementa RF-117.
- **No subir el tiempo del proxy** → se descartó porque el servidor es compartido, y una caída de
  la conexión o cerrar la pestaña perdería una lectura ya pagada.
- **`estructura` en jsonb por versión** → se descartaron tablas por ítem y mes: una versión aprobada
  no cambia, Neon por HTTP no da transacciones y `presupuestos` ya funciona así.
- **Identidad por nombres normalizados de grupo, capítulo e ítem** → se descartó `capituloId`
  porque un presupuesto reimportado desde Excel genera ids nuevos, y la regla de la 031 define la
  identidad por contenido.
- **Asociar el frente por coincidencia de ítems y cantidades** → se descartó comparar el título,
  porque cada libro lo escribe distinto. En Magdalena, las cantidades de Berrio y Yondo difieren.
- **`rige_desde` y `rige_hasta` como fechas de Colombia** → se descartó derivarlos de `aprobado_en`
  al consultar, para que la zona horaria se resuelva una sola vez, al escribir.
- **Meta diaria como única cuenta** → se descartaron fórmulas separadas para semana, mes y corte de
  versión: son tres sitios donde la misma regla podría diferir (principio 3).
- **Reutilizar el número del borrador descartado** → se descartó el `max + 1` de presupuestos, que
  dejaría la primera planificación aprobada como v3 tras dos intentos (RF-44).
- **Dos permisos, `planificacion` y `cumplimiento`** → se descartó uno solo porque el Residente
  entra al informe y no a la planificación.
- **Quitar la plata en el servidor construyendo otro objeto** → se descartó ocultar columnas en la
  pantalla, porque la respuesta de la API seguiría llevando las cifras (RF-89).
- **Excel original solo por su propia ruta** → se descartó añadirlo a `media/[id]`, cuya guardia
  genérica deja pasar a cualquiera con alcance a la obra (RF-50).
- **La IA propone y lee; la regla comprueba y calcula** → se descartó un lector por posiciones
  porque cada libro cambia (RF-104). Magdalena y Cartagena ya tienen formas distintas.
- **Reutilizar `pdfDelAsistente`** → se descartó la página para imprimir de Reportes porque RF-93
  pide descargar un archivo.

## Impacto en la sincronización

Sin impacto en la sincronización. Nada sube ni baja del celular; no cambian pull, outbox, `seq`,
idempotencia ni la reevaluación al ingerir.

## Contrato de API

Todas abren con `requerirPermiso`. La obra sale de `pedidoDeReporte` o `alcanzaLaObra` de
`alcance.ts`; una ajena responde 404. Los cambios de varias filas son un solo `db.batch`.

| Método y ruta | Permiso | Respuesta |
| --- | --- | --- |
| `POST /api/panel/planificaciones/hojas?obraId=` con los bytes | `planificacion` · `escribir` | 200 propuesta y si hay borrador; 409 sin presupuesto vigente; 413 más de 20 MB; 422 no es `.xlsx` |
| `POST /api/panel/planificaciones/leer?obraId=&hojas=&sustituir=&grupos=` con los bytes | `planificacion` · `escribir` | 202 `{ lecturaId }`; 409 lectura en curso o borrador sin `sustituir`; 413; 422 |
| `GET /api/panel/planificaciones/lecturas/:id` | `planificacion` · `escribir` | 200 `en_curso`, `lista` con id, `falta_grupo` con candidatos o `fallida` con motivo; 404 |
| `GET /api/panel/planificaciones?obraId=` | `planificacion` · `listar` | 200 versiones |
| `GET /api/panel/planificaciones/:id` | `planificacion` · `ver` | 200 detalle; 404 |
| `POST /api/panel/planificaciones/:id/aprobar` con `{ version, confirmarHallazgos, mesesCumplidos? }` | `planificacion` · `aprobar` | 200; 409 borrador cambió, hallazgos sin confirmar o faltan meses; 404 |
| `POST /api/panel/planificaciones/:id/anular` con `{ motivo }` | `planificacion` · `anular` | 200; 400 sin motivo; 409 no es la vigente; 404 |
| `GET /api/panel/planificaciones/:id/excel` | `planificacion` · `ver` | 200 adjunto; 404 |
| `GET /api/panel/cumplimiento?obraId=&tipo=&fecha=` | `cumplimiento` · `listar` | 200 informe, sin plata para el Residente; 400; 403 |
| `GET /api/panel/cumplimiento/exportar?…&formato=excel\|pdf` | `cumplimiento` · `listar` | 200 adjunto con las mismas cifras; 400; 403 |

| Permiso | Gerencia y Director de Proyectos | Director de Obra | Residente | Demás |
| --- | --- | --- | --- | --- |
| `planificacion` | `ver`, `listar`, `escribir`, `aprobar`, `anular` | `ver`, `listar` | ninguno | ninguno |
| `cumplimiento` | `ver`, `listar` | `ver`, `listar` | `ver`, `listar` | ninguno |

## Estrategia de verificación

- **`scripts/verificar-reglas.ts`**, con datos tomados del V5 y del presupuesto de Magdalena:
  - Lectura: cifra inventada descartada, cero en celda vacía, hojas ocultas fuera, línea base sobre
    flujo de caja (RF-5, RF-20 a RF-22, RF-101 a RF-103).
  - Cruce: los 38 ítems de Berrio, el mismo ítem y capítulo en Yondo no cruza, presupuesto sin
    grupos, empate pide grupo, resolución por renglón (RF-19, RF-105 a RF-107).
  - Hallazgos, uno por RF-25 a RF-32; un ítem con medida cero no sale en RF-29; un ítem sin precio
    contractual no sale en RF-28; rubros contra rubros.
  - Resumen: el del V5 da utilidad de $8.327 millones con los indirectos de la hoja de Berrio
    (RF-33, RF-111 a RF-114). El total a costo con medida real usa la «Med. Coste» del ítem
    (`medidaCoste`, en la `estructura` jsonb: sin migración), y sin ella, la medida real
    (RF-139 a RF-141, D31).
  - Versiones: reemplazo, anulación el mismo día, primera versión anulada y días anteriores
    (RF-52, RF-55 a RF-57, RF-120, RF-138).
  - Meta: festivo fuera, mes exacto, semana entre dos meses, periodo partido, plan semanal, sin
    arrastre (RF-63 a RF-67, RF-119, RF-130).
  - Informe: porcentaje mayor a 100, sin programación, fuera de planificación, sin capítulo,
    Yondo no suma, días sin parte, «Meta cumplida» (RF-60 a RF-74, RF-123 a RF-128).
  - Valores: margen, resultado solo mensual, ítem sin costo, rubros e indirectos (RF-75 a RF-85,
    RF-131 a RF-135).
  - Permisos: la tabla completa por rol, y `sinPlata` no deja ninguna cifra de plata (RF-36, RF-48,
    RF-50, RF-86 a RF-90).
- **Demo manual**: el recorrido de la spec en `http://127.0.0.1:8082`, con el V5 y el presupuesto
  en `.xlsx`, entrando como Director de Proyectos, Director de Obra, Residente y Almacenista.
  Incluye cerrar la pestaña en plena lectura y volver, y una segunda subida simultánea (RF-117).
- **Comprobaciones extra**: migración `0042` presente, `npm run verificar`, `typecheck` y `lint`.
  Como se lee la clave de la IA en un flujo nuevo, `npx expo export --platform web`, `grep -r
  "DATABASE_URL" dist/client` vacío y borrar `dist`.

## Riesgos

- **La IA asigna mal un mes o un año**, sobre todo en libros que solo dicen «MES 1, MAYO». Se
  detecta en el rango de programación que muestra el resumen antes de aprobar. Se corrige
  arreglando el Excel y volviéndolo a subir.
- **Un libro distinto a Magdalena falla la lectura.** Cartagena tiene 79 hojas, varias vías y un
  flujo de más de 1 000 filas, y puede pasar el tope de 1 500 por lectura. Se detecta en RF-9, que
  explica el motivo. Conviene probar ese libro al implementar; la demo oficial sigue siendo Magdalena.
- **Se reinicia el servidor durante una lectura.** La fila vence a los 5 minutos y pasa a `fallida`;
  se reintenta sin dejar borrador a medias.
- **Grupo mal asociado.** Se detecta porque se dispararían los hallazgos de cantidad contractual
  (RF-27). Se corrige sin aprobar, volviendo a subir y escogiendo el grupo.
- **El informe supera 5 segundos con años de partes**, porque el pendiente total lee hasta el fin
  del periodo. Se detecta en la demo; la salida es seleccionar solo `fecha` y `actividades`.
- **Una tabla de escritorio no cabe y deja fuera los botones.** Las columnas se suman contra
  `MaxContentWidthPanel` antes de dar la pantalla por hecha.
- **Reversión**: las tablas son nuevas y nada existente depende de ellas. Basta quitar las dos
  entradas del menú y no aprobar más; ningún parte, presupuesto ni preoperacional se modifica
  (RF-98).
