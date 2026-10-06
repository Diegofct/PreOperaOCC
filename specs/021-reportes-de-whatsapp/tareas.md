# Tareas — Spec 021

Tareas de menos de 30 minutos, ordenadas por dependencia. Cada una lleva los RF que
cubre y una línea `Hecho cuando:` que se pueda comprobar sin interpretar.

**Se implementa una tarea cada vez** (`/sdd:implementar T1`), y al terminarla se para.
Ninguna tarea se marca sin `npm run verificar`, `npm run typecheck` y `npm run lint`
en verde.

## Reglas

- [x] T1. `shared/rules/whatsapp.ts`: `abscisaDeTexto`, `horaDeTexto` y `condicionDeClima`, con sus
      casos. (RF-65, RF-66, RF-67, RF-81, RF-82)
      Hecho cuando: en verde «K1+170» → PR 1 + 170, «ABS K1+ 190» → PR 1 + 190, «pr 1 + 140» →
      PR 1 + 140 y «hola» → nulo; «9am» → 09:00, «3:00 pm» → 15:00, «15:00» → 15:00 y «12 m» →
      12:00; «soleado» → soleado, «se presentó lluvias» → lloviendo y «raro» → nulo.

- [x] T2. `whatsapp.ts`: `reconocerVehiculo`, `reconocerPersona` y `conductorDelViaje`, con sus
      casos. (RF-70, RF-71, RF-74, RF-75, RF-79, RF-94, RF-95)
      Hecho cuando: en verde «LLQ 375» reconoce la placa `LLQ375` y también el código interno;
      un equipo de otra obra y dos candidatos → no reconocido; «silfrido medina» reconoce a
      «Silfrido Medina» y un nombre que coincide con dos personas → no reconocido; el viaje de
      la LLQ 375 toma al operador de esa volqueta en el reporte, y uno sin operador → falta.

- [x] T3. `whatsapp.ts`: `faltasDelReporte`, con sus casos. (RF-33, RF-36, RF-64, RF-67, RF-71,
      RF-75, RF-79, RF-83, RF-86, RF-95)
      Hecho cuando: en verde que un reporte con un ítem fuera del presupuesto, un ensayo fuera
      de la lista, metros 170, un viaje sin hora y una persona no reconocida devuelve las cinco
      faltas a la vez, cada una con su sección y su renglón; y que el reporte corregido no
      devuelve ninguna.

- [x] T4. `whatsapp.ts`: `fusionarReporteEnParte`, `avisoDeReemplazo`, `destinoDeCategoria` y el
      estado inicial por categoría, con sus casos. (RF-23, RF-30, RF-31, RF-35, RF-38, RF-68,
      RF-78, RF-88, RF-89, RF-90, RF-92, RF-93)
      Hecho cuando: en verde que un segundo reporte reemplaza la persona y la máquina repetidas
      y todo el clima, suma actividades, ensayos y notas, y que el aviso las nombra; que
      fusionar dos veces el mismo reporte (mismos ids) no duplica nada; que `seguimiento` e
      `ignorar` entran como ignorados.

- [x] T5. Permisos: módulo `whatsapp` en `permisos.ts` y su enlace en `modulos.ts`, con sus casos.
      (RF-14, RF-15, RF-85)
      Hecho cuando: en verde que la gerencia y el residente tienen `ver`, `listar`, `escribir` y
      `aprobar` en `whatsapp`; que operador, almacenista, encargado de planta y laboratorista no
      tienen nada; y que el residente sigue sin `cantera:escribir`.

## Datos

- [x] T6. `bitacoras/tipos.ts`: operador (`operadorId`, `operadorNombre`) y `origen` opcionales
      en las filas del parte; `construirMaquina` congela el nombre del operador. Con su caso.
      (RF-46, RF-73, RF-74, RF-77)
      Hecho cuando: en verde que una máquina construida con operador lo guarda con su nombre y
      que una máquina guardada antes, sin operador, se lee igual que hoy.

- [x] T7. Esquema: `whatsapp_grupos`, `whatsapp_mensajes`, el enum de estado, `whatsapp` en
      `dueno_media` y `cantera_viajes.mensaje_whatsapp_id`, con su migración aplicada en la
      base de desarrollo. (RF-1, RF-4 a RF-13, RF-24 a RF-29, RF-46, RF-52, RF-54 a RF-58, RF-97)
      Hecho cuando: `0018_*.sql` (o las dos, si el valor del enum va aparte) solo crea lo del
      plan; se aplica en Neon (`neondb`) y una consulta lista las dos tablas, el valor nuevo
      del enum y la columna nula en los viajes existentes. *Toca la base real: se pide permiso.*

## Servidor

- [x] T8. Sacar las validaciones de secciones de `partes/[id]+api.ts` a
      `bitacoras/servidor/secciones.ts`, sin cambiar su comportamiento, y aceptar `operadorId`
      por máquina. (RF-59, RF-73)
      Hecho cuando: los tres comandos en verde; en el panel, guardar una bitácora de prueba con
      una máquina, una persona, una franja y un ensayo funciona igual que antes, una lectura
      final menor que la inicial sigue dando el mismo error, y el operador elegido se guarda.

- [x] T9. `servidor/guardia-integracion.ts` y `TOKEN_INTEGRACION_WHATSAPP` en `.env.ejemplo` y
      `docs/despliegue.md`, con sus casos. (RF-2, RF-3)
      Hecho cuando: en verde que el token correcto pasa, que uno incorrecto o ausente da 401 y
      que una cookie del panel no sirve; el `.env` guarda el hash, no el token.

- [x] T10. Contratos: `entregaDeWhatsapp` (esquema 2), `propuestaCorregida`, `aprobacion` (con
      `soloViajes`), `descarte` y `grupoAsociado`. Con sus casos. (RF-1, RF-26, RF-29, RF-50,
      RF-51, RF-54, RF-55, RF-96)
      Hecho cuando: en verde que la entrega de esquema 1 se rechaza, que el descarte sin motivo
      se rechaza, y que la aprobación exige `version`.

- [x] T11. `POST /api/integraciones/whatsapp/mensajes`: grupo nuevo pendiente de obra y mensaje
      en una sola sentencia. (RF-1 a RF-6, RF-10, RF-11, RF-23, RF-90)
      Hecho cuando: con `curl` y el token: un mensaje nuevo → `nuevo`; el mismo otra vez →
      `conservado` sin duplicar; con otra propuesta mientras está pendiente → `reemplazado`;
      ya aprobado → `conservado`; sin token → 401. *Escribe en Neon: se pide permiso.*

- [x] T12. `PUT /api/integraciones/whatsapp/mensajes/:id/archivo`: los bytes a R2 y su fila en
      `media`. (RF-7, RF-52, RF-53)
      Hecho cuando: con `curl`, una foto → 201; la misma otra vez → 200 sin fila nueva; un
      mensaje desconocido → 404; un `.exe` → 415. La foto no tiene ninguna URL pública.

- [x] T13. Rutas de grupos: listar (sin obra primero) y asociar o cambiar la obra (solo
      gerencia). (RF-8 a RF-13)
      Hecho cuando: desde la sesión de gerencia en Chrome, el grupo de prueba sale sin obra;
      asociarlo → 200; como residente → 403; al cambiarlo de obra, solo los pendientes cambian
      de bandeja.

- [x] T14. `GET` de propuestas: listado por estado al alcance de la obra, y detalle resuelto
      contra los catálogos, con complementos y avisos. (RF-14 a RF-25, RF-60 a RF-62, RF-89)
      Hecho cuando: el residente ve solo los pendientes de su obra, del más antiguo al más
      reciente; con el filtro ve los ignorados; el detalle del reporte de ejemplo trae cada
      equipo y persona reconocidos o marcados, la fecha del encabezado y las fotos que lo
      complementan dentro de él.

- [x] T15. Corregir, descartar y devolver, con la versión. (RF-25 a RF-29, RF-54 a RF-56)
      Hecho cuando: corregir → 200 y `version` sube, con la propuesta de la IA intacta;
      corregir con una versión vieja → 409; descartar sin motivo → 400, con motivo → 200 con
      quién y cuándo; devolver un ignorado → queda pendiente.

- [x] T16. Aprobar, parte de la bitácora: valida todo, abre la bitácora si falta, fusiona, un
      solo `UPDATE` y marca el mensaje. (RF-30 a RF-38, RF-40 a RF-42, RF-44, RF-46, RF-48,
      RF-57, RF-59, RF-61 a RF-81, RF-88 a RF-93)
      Hecho cuando: aprobar el reporte de ejemplo deja la bitácora del día con clima,
      actividades por ítem, maquinaria con operador, medidores y observación, personal con
      horas, ensayos y notas, todo con `origen`; repetir la petición no duplica nada; un
      reporte con faltas → 400 con todas y la bitácora sin tocar; con la bitácora cerrada →
      409 con la explicación; con fecha de mañana → 400.

- [x] T27. La cantidad escrita gana al cálculo: `resolverCantidad` con sus casos, el servidor y
      el campo de cantidad de la bitácora con la calculada al lado. (RF-99 a RF-103)
      *(Añadida el 2026-10-05 por el cambio de spec aprobado; va antes de T17.)*
      Hecho cuando: en verde que con cantidad escrita gana la escrita, sin ella se calcula, y la
      calculada se informa aunque no se use; en Chrome, una actividad en m³ con medidas acepta
      escribir otra cantidad y muestra la calculada al lado; aprobar de nuevo un reporte con
      «312 m³» deja 312 en la bitácora.

- [x] T17. Aprobar, parte de los viajes, y aprobar solo los viajes. (RF-39, RF-43, RF-45, RF-82 a
      RF-87, RF-94 a RF-98)
      Hecho cuando: los viajes del reporte quedan en Control Cantera con su conductor, quien
      aprobó y el mensaje de origen; repetir no los duplica; con Control Cantera apagado → 400;
      con la bitácora cerrada, `soloViajes` los registra y el reporte sigue pendiente; aprobar
      después el resto no los vuelve a crear; el residente sigue recibiendo 403 en
      `POST /api/panel/cantera/viajes`.

- [x] T18. Aprobar, parte de las fotos: foto por actividad y foto del día, reutilizando el objeto.
      (RF-50 a RF-52)
      Hecho cuando: las fotos elegidas aparecen en la bitácora, cada una en su actividad y la
      del día si no había; las no elegidas siguen en la propuesta aprobada; R2 no tiene objetos
      nuevos.

## Panel

- [x] T19. Ruta `/panel/whatsapp`, `api.whatsapp` y la bandeja: lista con filtro de estado y,
      para la gerencia, los grupos sin obra con su selector. (RF-10, RF-14 a RF-25)
      Hecho cuando: en Chrome, la gerencia asocia el grupo de prueba desde la pantalla y
      aparecen sus pendientes; el residente ve el enlace «Reportes de WhatsApp» y su bandeja; la
      tabla cabe en `MaxContentWidthPanel`.

- [x] T20. Detalle del reporte, primera mitad: texto original, autor, categoría, motivo,
      complementos, y las secciones de clima, actividades, control calidad y notas, editables.
      (RF-17 a RF-22, RF-26, RF-60 a RF-67, RF-81)
      Hecho cuando: en Chrome, el reporte de ejemplo muestra esas cuatro secciones; corregir una
      cantidad y guardar la deja corregida al volver a abrirlo.

- [x] T21. Detalle del reporte, segunda mitad: maquinaria con operador, personal y viajes, con lo
      no reconocido marcado y su selector. (RF-68 a RF-80, RF-82 a RF-87, RF-94, RF-95)
      Hecho cuando: en Chrome, una persona no reconocida sale marcada y elegirla de la lista la
      quita de las faltas; el viaje de una volqueta sin operador pide el conductor.

- [x] T22. Aprobar, descartar y solo viajes desde la pantalla: elección de fotos, aviso de
      reemplazo, faltas por renglón, 409 con su mensaje. (RF-29, RF-41, RF-42, RF-50, RF-51,
      RF-54, RF-64, RF-89, RF-96, RF-97)
      Hecho cuando: en Chrome, aprobar con una falta la señala en su renglón; aprobar un
      segundo reporte del mismo día muestra antes qué reemplaza; con la bitácora cerrada se
      ofrece «Aprobar solo los viajes» y el reporte queda con «Viajes ya registrados».

- [x] T23. Bitácora y Control Cantera: operador por máquina (selector y lectura) y la marca
      «desde WhatsApp». (RF-47, RF-73, RF-76)
      Hecho cuando: en Chrome, la bitácora del reporte aprobado muestra el operador de cada
      máquina y la marca en cada fila; una bitácora cerrada anterior se ve igual que antes; el
      viaje aprobado lleva la marca en Control Cantera.

## Integración (en `C:\dev\n8n-evolutionapi`, fuera de este repo)

- [x] T24. Esquema v2 de la IA: clima, maquinaria con operador, medidores y observación, personal
      con horas, viajes por renglón y ensayos con horas, responsable y ubicación. (RF-60 a RF-87)
      Hecho cuando: el reporte de `plantilla_reporte_whatsapp.md`, mandado al workflow de
      prueba, devuelve una propuesta v2 que `entregaDeWhatsapp` acepta.

- [x] T25. Workflow de entrega: cada mensaje clasificado va a la integración con el token, y sus
      archivos a `…/archivo`; reintenta si el servidor no responde. (RF-1, RF-4, RF-7)
      Hecho cuando: un mensaje nuevo en el grupo aparece en la bandeja con su foto, y apagar el
      servidor un momento no hace perder ni duplicar mensajes.

## Cierre

- [x] T26. Validación final: recorrido RF por RF de la spec + demo manual (pasos 1 a 9). (Todos)
      Hecho cuando: cada RF tiene su comprobación con resultado, los tres comandos están en
      verde, la fuga de secretos sobre `dist/client` sale vacía y la spec queda marcada como
      Cumplida.

## Notas de ejecución

- T3 (2026-10-05): la ubicación de un ensayo también va de 25 en 25 m (004/RF-87 usa
  `validarAbscisa`). El ejemplo de la plantilla, «pr 1 + 140», sale como falta y el residente
  elige 125 o 150. No es un cambio: es la regla vigente de la bitácora; se le avisó al usuario.
- T4 (2026-10-05): la categoría `reporte_diario` (la de la plantilla) existe en
  `CATEGORIAS_DE_WHATSAPP`, pero el esquema v1 de la IA no la produce: entra en T24. Mientras
  tanto, `reporte_actividades` va al mismo destino.
- T5 (2026-10-05): el enlace del menú exige una ruta existente, así que se creó
  `src/app/panel/whatsapp.tsx` con una pantalla **provisional** (`whatsapp/pantalla-bandeja.tsx`,
  solo un aviso) que llena T19. Se ajustó la prueba que decía «aprobar no existe fuera del
  laboratorio»: la 021 lo añade a propósito a la bandeja. El rechazo de `aprobar` en la bandeja
  dice «aprobar ni descartar este reporte» (`QUE_SE_INTENTABA_EN`).
- T6 (2026-10-05): **ojo con el orden T16 → T23.** El `PATCH` de la bitácora reemplaza la
  sección de maquinaria entera con lo que manda el formulario. Mientras el formulario del panel
  no devuelva `operadorId` (T8 lo acepta, T23 lo pinta), guardar la maquinaria a mano borraría
  el operador que haya puesto una aprobación. No se nota antes de T16, porque hasta entonces
  nadie escribe operador; T23 tiene que estar antes de usar la bandeja con datos reales.
- T7 (2026-10-05): migración `0018_minor_vin_gonzales.sql`, aplicada en `neondb` (desarrollo).
  Comprobado con una consulta de solo lectura: las dos tablas, `whatsapp` en `dueno_media`, los
  cuatro estados, los disparadores de `actualizado_en` y los 4 viajes existentes con
  `mensaje_whatsapp_id` nulo. **Producción no se ha migrado**: va con
  `scripts/migrar-produccion.ts` al desplegar.
  - `/api/panel/media/[id]` tuvo que conocer el dueño `whatsapp` (lo exigió el tipo). Se resolvió
    con RF-53: solo quien tiene `whatsapp:ver` y es de la obra del grupo; un grupo sin obra, solo
    la gerencia. «Sin obra» **no** puede significar «de todos» aquí.
  - **Para T16:** `partes_de_obra` no está en `TABLAS_CON_RELOJ`, así que su `actualizado_en`
    nunca cambia y el paso 6 del plan (`where actualizado_en = :leido`) no detectaría un guardado
    concurrente. T16 tiene que añadirla a los disparadores (o comparar de otra forma).
  - **Defecto anterior, fuera de esta spec:** en `/api/panel/media/[id]`, las fotos de la
    bitácora diaria tienen dueño `bitacora` con el id del **parte**, pero `obraDeLaImagen` las
    busca en la tabla vieja `bitacoras`; no la encuentra, devuelve `null`, y `alcanzaLaObra(…,
    null)` deja pasar a cualquier residente con obra. Un residente podría ver una foto de otra
    obra si conociera su id (un uuidv7, difícil de adivinar). Se le avisó al usuario; pide su
    propio cambio.
- T8 (2026-10-05): validaciones en `bitacoras/servidor/secciones.ts`; el `PATCH` las llama. El
  formulario de maquinaria ahora **devuelve el `operadorId`** que trae cada fila, así que el
  riesgo de la nota de T6 ya no existe (T23 solo tiene que pintar el selector).
  Comprobado en Chrome con la sesión de gerencia, en «Pruebas spec 018 (laboratorio)», día
  2026-09-20 (bitácora de prueba que **queda abierta** en `neondb`): máquina con operador,
  persona, franja y ensayo → 200; lectura final menor → 400 «La lectura final no puede ser menor
  que la inicial (108 h).»; operador inexistente → 400; pulsar Guardar en Maquinaria desde la
  pantalla conserva el operador.
  - **Metro no recogió el cambio de T5** en `permisos.ts`: el menú salía sin «Reportes de
    WhatsApp» con el archivo bien en disco. Un `touch` lo arregló. Si una pantalla del panel no
    refleja un cambio, tocar el archivo o reiniciar con `npx expo start --web --clear`.
  - **Para T23:** el `PATCH` reconstruye cada máquina y persona con `construir*`, que no copia
    `origen`; guardar a mano una fila que vino de WhatsApp le quita la marca (RF-47). T23 tiene
    que conservar `origen` de la fila guardada (por `vehiculoId`/`usuarioId`, y por `id` en
    actividades y ensayos).
- T9 (2026-10-05): `guardia-integracion.ts` cerrada por defecto (sin hash, no entra nadie) y
  `scripts/token-integracion.ts` para emitir token y hash. Además del plan: `compose.yaml` pasa la
  variable al contenedor como **opcional** (`${TOKEN_INTEGRACION_WHATSAPP:-}`), para que el VPS
  arranque aunque todavía no haya n8n. Token de desarrollo emitido: el hash en el `.env` de
  PreOperaOCC y el token en `C:\dev\n8n-evolutionapi\.env` (`PREOPERA_TOKEN_INTEGRACION`);
  comprobado que coinciden sin imprimirlos. Fuga: `expo export` + `grep` de `DATABASE_URL` y
  `TOKEN_INTEGRACION_WHATSAPP` en `dist/client` → vacío. **`npm run web` tiene que reiniciarse**
  para leer la variable nueva del `.env` antes de T11.
- T10 (2026-10-05): **el esquema v2 de la IA queda fijado en `propuestaDeIa`** (contratos.ts):
  `categoria`, `fecha_evento`, `complementa_a`, `motivo_revision`, y las listas `clima`
  (`condicion`, `desde`, `hasta`), `actividades` (con `items_pago`), `maquinaria` (`equipo`,
  `operador`, `medidor_inicial`, `medidor_final`, `observacion`), `personal` (`nombre`, `entrada`,
  `salida`, `observacion`), `ensayos` (`tipo`, `hora_inicio`, `hora_fin`, `responsable`,
  `ubicacion`, `resultado`, `unidad`, `cumple`, `observacion`), `viajes` (`placa`, `cantidad`,
  `material`, `origen`, `destino`, `abscisa_llegada`, `hora`) y `novedades`. **T24 tiene que
  producir exactamente esos nombres.** La propuesta corregida tiene la forma de `ReporteDelDia`
  para todas las categorías. El contrato de devolver a pendiente se llama
  `devolucionAPendiente` (ya existía un `devolucion` del laboratorio).
- T11 (2026-10-05): `features/whatsapp/servidor/recepcion.ts` + la ruta. «Nadie lo ha tocado»
  es `version = 0` (más estricto que el estado: un ignorado que el residente devolvió no se
  vuelve a esconder con una entrega repetida). Probado con `curl` y el token de desarrollo:
  nuevo → `nuevo`; el mismo → `conservado`; otra propuesta pendiente → `reemplazado`; sin token
  y con token equivocado → 401; esquema 1 → 400; `seguimiento` → entra `ignorado`; ya aprobado
  (simulado en la base) → `conservado` sin tocar la propuesta. Grupo `prueba-t11@g.us` creado
  **sin obra** (no sale en ninguna bandeja). Datos de prueba que quedan en `neondb`: ese grupo y
  los mensajes `PRUEBA-T11-1`, `-3` y `-4`.
  - Los errores de validación responden **400** (la convención de `responder`), no el 422 que
    decía el plan. Un cuerpo que no es JSON responde 500: es así en todas las rutas
    (`cuerpoJson` lanza `SyntaxError` y `responder` no lo traduce). Defecto anterior, no de esta
    spec.
  - El «¿» de `PRUEBA-T11-3` quedó como `U+FFFD`: fue la línea de comandos de Windows al pasar
    el texto a `curl`, no el servidor. Mandado desde un archivo UTF-8 (`PRUEBA-T11-4`), «¿», «Ñ»
    y las tildes se guardan bien. n8n manda UTF-8.
- T12 (2026-10-05): tipos aceptados y tope de 16 MB en `rules/whatsapp.ts`
  (`TIPOS_DE_ARCHIVO_WHATSAPP`, `rechazoDeArchivo`), con sus casos. Se aceptan también notas de
  voz (`audio/ogg`, como las manda WhatsApp) y videos (`video/mp4`): la spec dice que se guardan y
  se ven aunque la IA no los analice. `almacen.ts` ganó extensiones (pdf, docx, xlsx, ogg, mp4…):
  antes todo lo que no era PNG se guardaba como `.jpg`. La repetición se detecta por SHA-256 del
  archivo dentro del mismo mensaje. Probado con `curl`: PNG de 1×1 → 201; el mismo → 200
  `ya_estaba` sin fila nueva; mensaje desconocido → 404; `.exe` → 415; sin token → 401. La foto:
  sin sesión → 401 en `/api/panel/media/:id`, pedida a R2 sin firma → 400, y con la sesión de
  gerencia → 200 `image/png`. Queda en R2 dev: `whatsapp/PRUEBA-T11-1/01a10e53-….png`.
- T13 (2026-10-05): **cambio de diseño**: columna `obra_decidida_id` (migración `0019`, aplicada
  en `neondb`) y `features/whatsapp/servidor/obra.ts` como única regla de «de qué obra es un
  mensaje». **T15 (descartar) y T16/T17 (aprobar) tienen que escribir `obra_decidida_id`** en la
  misma sentencia de la decisión. Los ids de la ruta llegan sin decodificar (`%40` por la arroba
  de `…@g.us`): `idDeLaRuta` los decodifica, también en la de archivos. Probado en Chrome con la
  sesión de gerencia: el grupo sale «SIN OBRA» con 1 pendiente; asociarlo → 200; cambiarlo a
  «Consorcio Antioquia» movió el pendiente y los dos ignorados, y el aprobado (simulado, decidido
  en «Pruebas spec 018») se quedó; obra inexistente → 400; grupo inexistente → 404; sin obra →
  400 «Elija la obra.»; sin sesión → 401. El grupo de prueba quedó asociado a «Pruebas spec 018».
  **El 403 del residente no se probó en vivo** (no hay sesión de residente a mano): lo da
  `requerirAdmin`; queda para la demo de T26.
- T14 (2026-10-05): `resolverPropuesta` y `reconocerPorNombre` en `rules/whatsapp.ts` (con 5
  casos), `filtroDeObraEstricto` en `alcance.ts` (sin obra no lo ve nadie, RF-11) y
  `features/whatsapp/servidor/bandeja.ts`. Probado en Chrome con la sesión de gerencia y un
  reporte de prueba (`PRUEBA-T14-1`, con su foto en `PRUEBA-T14-2`) en «Pruebas spec 018»:
  pendientes en orden de llegada; la foto **no** sale aparte y cuenta en su reporte; filtro de
  ignorados y aprobados; estado inventado → 400; filtrar por otra obra → 0; propuesta inexistente
  → 404. El detalle trae el autor reconocido («Natalia Riaño», Residente 2), la fecha del
  encabezado (2026-10-03), equipos y personas reconocidos o marcados («el mono»), la máquina sin
  lecturas fuera, el ítem 9.9.9 marcado, el ensayo «densidad» → Densidad en campo con su
  observación, «2 viajes» como dos viajes, y 9 faltas por renglón. El residente no se probó en
  vivo (no hay sesión): lo cubre `filtroDeObraEstricto`; va a la demo de T26. «Reemplaza» no se
  vio con una bitácora abierta (no había para ese día): se ve en T16.
- T15 (2026-10-05): `features/whatsapp/servidor/decisiones.ts`. Corregir pide `whatsapp:escribir`;
  descartar, `whatsapp:aprobar` (es decidir); devolver, `whatsapp:escribir`. Probado en Chrome
  con la sesión de gerencia: corregir `PRUEBA-T14-1` → 200 y versión 1, con la propuesta de la IA
  intacta (312) y la corregida en 300; corregir con la versión vieja → 409 «Otra persona
  cambió…»; corregir una aprobada → 409; descartar sin motivo → 400; descartar `PRUEBA-T13-1` →
  200, y en la base quedó con motivo, quién («Diego»), cuándo y `obra_decidida_id` = «Pruebas
  spec 018»; descartarla otra vez → 409; devolver `PRUEBA-T11-3` → pasa a pendientes; otra vez →
  409; propuesta inexistente → 404.
- T16 (2026-10-05): `features/whatsapp/servidor/aprobacion.ts` y la ruta `…/aprobar`.
  `partes_de_obra` entró en `TABLAS_CON_RELOJ` (disparadores reaplicados en `neondb`). La marca
  de concurrencia se compara **como texto de Postgres** (`actualizado_en::text`): un `Date` de JS
  pierde los microsegundos y la comparación nunca coincidía (se vio en la primera prueba: 409
  siempre). Hasta T17, un reporte con viajes responde 501. Probado en Chrome con la sesión de
  gerencia: bitácora cerrada (la de prueba del 2026-09-20, **cerrada a mano en la base** para
  esto) → 409 con la explicación; día futuro → 400; reporte con faltas → 400 con las 2 faltas por
  renglón; corregido → 200 y la bitácora del 2026-10-03 de «Pruebas spec 018» quedó con
  maquinaria (operador y observación), personal, 2 actividades, clima, el ensayo y la nota del
  incidente `PRUEBA-T16-1`, todo con `origen`; reintento idéntico → 200 con la misma bitácora y
  sin duplicar; con otra versión → 409; el «seguimiento» devuelto (`PRUEBA-T11-3`) → aprobado
  sin crear nada (RF-49). Los intentos fallidos dejaron abierta la bitácora vacía del 2026-10-03
  antes de llenarla (RF-40 la abre al aprobar; el reintento la reutilizó).
  - **Pregunta al usuario (pendiente):** la cantidad de una actividad en m³ con largo, ancho y
    espesor la **calcula** la bitácora (004/RF-68), y reemplaza la del reporte: «sub-base medido
    suelto 312 m³» quedó en 240 (150 × 6,4 × 0,25), y el ítem 4.3.8 de la misma actividad también.
    Si OCC quiere la cantidad reportada, es un cambio de spec (`/sdd:cambio`).
    → **Resuelto el 2026-10-05:** OCC eligió que la escrita gane en toda la bitácora (021/RF-99
    a RF-103, reemplaza 004/RF-68); se hizo en T27.
- T27 (2026-10-05): `resolverCantidad` devuelve también `calculada`; el formulario deja la
  cantidad editable siempre, la pinta vacía si coincide con la calculada (bitácoras anteriores) y
  muestra «Del volumen: N» o «Calculada: N» debajo; al guardar manda solo la escrita. Se ajustó la
  prueba de `construirActividadDelParte` que esperaba que el volumen ganara. Probado en Chrome:
  la 5.1.15 del 2026-10-03 se abrió vacía con «Del volumen: 240»; escrita 312 → «Calculada: 240»
  y en la base quedó 312 (la 4.3.8 siguió en 240); el reporte `PRUEBA-T27-1` («312 m³») aprobado
  → 312 en la bitácora del 2026-10-02. **Confirmado en vivo lo de T23:** al guardar a mano, las
  filas perdieron su `origen` (marca «desde WhatsApp»).
- T17 (2026-10-05): viajes en `aprobacion.ts` (`registrarViajes` con ids fijos y `on conflict do
  nothing`, `eleccionesAjenas` contra las opciones de la obra, RF-45 y «solo viajes»). Datos de
  prueba creados en «Pruebas spec 018» (`neondb`): sitio «PRUEBA cantera T17», material «PRUEBA
  material T17», volqueta `PRUEBA-VOL-T17` (placa PRT017) y la persona «PRUEBA Conductor T17»
  (operador, cargo conductor, **sin código de activación**). Probado en Chrome con la sesión de
  gerencia: `PRUEBA-T17-1` aprobado → 2 viajes en Control Cantera con su conductor (el operador
  de la volqueta en el reporte), registró «Diego»; reintento → los mismos 2. `PRUEBA-T17-2` con
  la bitácora del 2026-09-20 cerrada → 409 con `puedeAprobarSoloViajes`; `soloViajes` → 1 viaje,
  el reporte sigue pendiente con «viajes aprobados»; otra vez → 400. **Se anuló con motivo** la
  bitácora de prueba del 2026-09-20 (la de T8) para probar RF-98: aprobar el resto abrió otra
  bitácora de ese día y el viaje no se repitió. Control Cantera apagado (puesto a mano en la base
  y vuelto a encender) → 400. **El 403 del residente en `POST /api/panel/cantera/viajes` no se
  probó en vivo** (no hay sesión de residente): lo cubren la tabla de permisos y su caso en
  `verificar-reglas.ts`; va a la demo de T26.
- T18 (2026-10-05): fotos en `aprobacion.ts` (`fotosElegidas` valida antes de escribir: imagen,
  del mensaje o de sus complementos, ya subida, y actividad existente). Probado en Chrome con
  `PRUEBA-T18-1` (foto `PRUEBA-T18-2` y PDF `PRUEBA-T18-3`): el PDF como foto → 400; una foto de
  otro reporte → 400; una actividad que no existe → 400; aprobar con la foto como del día y como
  de la actividad 0 → la bitácora del 2026-10-01 tiene las dos, se sirven (200 `image/png`); el
  reintento no añade filas; la propuesta conserva sus 2 archivos. En la base, las dos filas de la
  bitácora apuntan al **mismo objeto** de R2 que la de WhatsApp (1 objeto, 3 filas).
- T19 (2026-10-05): `whatsapp/pantalla-bandeja.tsx` deja de ser provisional: grupos de WhatsApp
  (solo gerencia) con su obra y un selector para asociar o cambiar, y la bandeja con filtros de
  estado y de obra. `api.whatsapp` en el cliente y `etiquetaDeCategoria` (con su caso). La prueba
  de ancho de tablas ahora recorre también las subcarpetas de `panel/` (antes `whatsapp/` habría
  quedado fuera). Corregido al probar: el conteo de pendientes de un grupo contaba las fotos que
  van dentro de su reporte (RF-20); ahora usa la misma regla que la bandeja. Probado en Chrome con
  la sesión de gerencia: el grupo `prueba-t19@g.us` salió «Sin obra» con el aviso; asociado desde
  la pantalla a «Pruebas spec 018» → aviso de éxito y su incidente apareció en la bandeja con
  «Revisar: No dice hasta qué hora.»; filtro «Aprobados» con adjuntos y «Viajes ya registrados».
  **La vista del residente no se probó en vivo** (sin sesión de residente): va a T26.
- T20 (2026-10-05): `whatsapp/propuesta-reporte.tsx` (`DetalleDeReporte`) y el botón «Revisar»/«Ver»
  en cada fila de la bandeja. Encabezado con estado, autor y cargo, grupo, obra, fecha, texto
  original, complementos y adjuntos (imágenes en miniatura, documentos con «Abrir PDF»); aviso del
  motivo de revisión y de la fecha supuesta; fecha, clima, actividades, control calidad y notas
  editables, con las faltas del servidor en su renglón; «Guardar corrección» con la versión leída.
  `CampoNumero` guarda su propio texto para poder escribir decimales. La carga va con un contador
  (como `useListado`): el linter no deja llamar la carga directo en el efecto. Probado en Chrome con
  `PRUEBA-T20-1`: encabezado, foto del complemento, «La IA pide revisar…», «Falta 1 dato…» y la
  falta del ítem 9.9.9 en su renglón; cantidad 312 → 300, guardar → «Corrección guardada.», versión
  1, la de la IA sigue en 312; al volver a abrirlo muestra 300.
- T21 (2026-10-05): el detalle trae `opciones` (equipos de la obra, personas registradas y las
  opciones de Control Cantera), los mismos catálogos contra los que se lee y se aprueba. Secciones
  nuevas: maquinaria (equipo, operador —vacío es «sin operador» y borra lo escrito—, medidores y
  observación), personal (persona, entrada, salida, observaciones) y viajes (volqueta, conductor,
  hora, material, origen, destino y, si es la obra, PR y metros). Probado en Chrome con
  `PRUEBA-T21-1`: «Pedro Pérez» salió ««Pedro Pérez»: elija la persona» con su falta; elegido
  «Conductor Prueba» y guardado → su falta desapareció; el viaje de la volqueta con operador
  desconocido muestra «✕ Elija el conductor.», con volqueta, material, cantera, PR 2 + 050 y hora
  reconocidos.
- T22 (2026-10-05): en el detalle, «Fotos para la bitácora» (la del día y una por actividad, sobre
  las imágenes numeradas del mensaje), el aviso de qué se reemplaza o de que se abrirá la bitácora,
  «Aprobar», «Aprobar solo los viajes» (solo con la bitácora cerrada y viajes por aprobar),
  «Descartar» con ventana y motivo obligatorio, y «Devolver a la bandeja» para un ignorado. Aprobar
  guarda antes la corrección si hay cambios. Corregido al probar: la recarga que sigue a una
  aprobación fallida borraba el mensaje de error; ahora solo lo limpian las acciones. Probado en
  Chrome con la sesión de gerencia: `PRUEBA-T21-1` con faltas → «Al reporte le falta información…»
  y las 2 faltas en su renglón; `PRUEBA-T22-1` (2.º reporte del 2026-10-03) avisó «…se reemplazarán
  a Natalia Riaño, todo el clima…» y al aprobar la bitácora quedó con Natalia hasta las 18:00 y
  «Lloviendo», sin perder máquinas ni actividades; `PRUEBA-T22-2` con la bitácora del 2026-10-04
  **cerrada a mano en la base para la prueba** → aviso, sin «Aprobar», con «Aprobar solo los
  viajes» → 1 viaje y en la bandeja «Pendiente · Viajes ya registrados»; `PRUEBA-T19-1` descartado
  desde la ventana (sin motivo avisa; con motivo → «Descartados»). Nota de prueba: con la ventana de
  Chrome sin foco, las capturas y el teclado simulado fallan; se escribió con eventos de JavaScript.
- T23 (2026-10-05, cerrada el 2026-10-06): hecho
  `conservarOrigen` (con su caso), el `PATCH` conserva `origen`, el selector de operador y la marca
  «Desde WhatsApp» en maquinaria, personal, actividades, clima y ensayos, y `mensajeWhatsappId` en
  los viajes con su marca en `listado-viajes.tsx`. Probado en Chrome: `PRUEBA-T21-1` aprobado → la
  bitácora del 2026-09-29 muestra operador y marcas; guardar la maquinaria a mano conservó el
  operador y el `origen`; el viaje trae `mensajeWhatsappId`. En Control Cantera, con la obra «Pruebas
  spec 018», la tabla muestra 4 «Desde WhatsApp» (los 4 viajes aprobados desde la bandeja). Bitácoras
  anteriores: la única cerrada antes de la spec (2026-09-22, «Pruebas spec 018») carga sin marcas ni
  operador, pero está vacía; la abierta de «Consorcio Antioquia» de ese día y las de prueba de T8
  (máquina sin operador → «Sin operador») cargan sin errores. No se pudo cambiar de obra en esa fecha
  desde la pantalla: con la ventana de Chrome en segundo plano el selector no abre; se comprobó por
  la API.
- T24 (2026-10-06): en `C:/dev/n8n-evolutionapi/scripts/generar_workflow_clasificar.py`, el esquema
  pasó a la versión 2 con los nombres de `propuestaDeIa` (clima, maquinaria, personal, ensayos con
  horas y ubicación, viajes por renglón, novedades) y la categoría `reporte_diario`; las
  instrucciones explican la plantilla (solo los equipos con «Inició/Terminó», «9:00 am a 10:00 am»
  como inicio y fin, renglones de viajes, notas a novedades). Probado: el reporte de la plantilla
  (con personal, viajes, observación y hora de fin añadidos) guardado como `PRUEBA-T24-1` en el
  grupo aparte `prueba-t24@g.us` de `occ_whatsapp`, clasificado con un workflow de un solo mensaje
  importado en n8n y luego **restaurado** el normal. Resultado: `reporte_diario` del 2026-10-01, 2
  franjas de clima, 2 actividades con sus 4 ítems, 4 volquetas con lecturas (las demás fuera), 2
  personas, 2 viajes, el ensayo 09:00–10:00 y la nota; `entregaDeWhatsapp` la **acepta**. La IA
  marcó en `motivo_revision` lo que no cuadra del ejemplo (las 4 volquetas con las mismas lecturas,
  LLQ 375 que no está en PreOpera, tramos que se solapan).
  - **Para T25:** los 29 mensajes del grupo real clasificados en la fase 3 tienen el esquema 1;
    `entregaDeWhatsapp` los rechazaría. Hay que reclasificarlos con el 2 antes de entregarlos (cuesta
    API) o entregar solo lo nuevo.
    → **Decidido el 2026-10-06: opción b, solo lo nuevo.**
- T25 (2026-10-06), en `C:/dev/n8n-evolutionapi`: `sql/003_entrega_preoperaocc.sql` (columnas
  `entregado_en`, `entrega_error`, `entrega_intentos` en `occ_whatsapp`); la clasificación corre cada
  5 minutos y solo desde `DESDE = 2026-10-06T00:00-05:00` (los 337 sin clasificar de antes se quedan
  así); un `invalid_request_error` (foto dañada) se guarda como error y no frena la cola;
  `scripts/generar_workflow_entrega.py` genera «OCC - Entregar a PreOperaOCC» (id `OccEntregaPreOp1`):
  cada 5 minutos, POST del mensaje, PUT del archivo, y `entregado_en` solo si los dos salen bien;
  solo los rechazos 400/404/422 gastan intento (tope 5); red caída, 5xx y 401 se reintentan sin
  límite. Credencial «PreOperaOCC integración» (Header Auth, id `preoperaIntegracion`) creada por
  CLI sin mostrar el token; los archivos temporales se borraron del contenedor. URL desde el
  contenedor: `http://host.docker.internal:8081`. Probado: `PRUEBA-T24-1` entregado (el grupo
  `prueba-t24@g.us` llegó sin obra); `PRUEBA-T25-1` (foto nueva) clasificado por el workflow y, con
  el panel «apagado» (puerto 8099), quedó sin entregar con «sin conexión… ECONNREFUSED» y 0
  intentos; al volver se entregó una vez, con su foto. **Los dos workflows están importados pero sin
  publicar** (no corren solos): se publican cuando el usuario lo decida.
