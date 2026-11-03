# Spec 038 — WhatsApp y Bitácora de OCC y Geolab

> Estado: Cumplida en dev (2026-11-03, validacion.md) · Aprobada (2026-11-03; D2–D13 según mi propuesta, D5 cambiada por el usuario; RF-9h agregado el mismo día a pedido del usuario: los mantenimientos del grupo de OCC van también a Mantenimientos) · Fecha: 2026-10-30 · Ajustada con los mensajes reales del grupo: 2026-11-03

## Contexto y objetivo

Desde la spec 021, cada grupo de WhatsApp se asocia a **una obra**, y lo que se reporta en él arma la bitácora diaria de esa obra (spec 024). Pero el grupo empresarial (spec 033) tiene dos empresas que no son una obra: **OCC**, que lleva los vehículos y la maquinaria de todas las obras, y **Geolab**, que lleva el laboratorio de todas las obras.

OCC ya tiene su grupo, «OBRAS CIVILES COLOMBIANAS». Es el grupo del **mantenimiento de los equipos**. Según 297 mensajes leídos (16-oct a 3-nov, D1), allí se reporta:
- cada noche, la lista «Equipos operativos – para el día X», con volquetas, maquinaria amarilla, inoperativos y notas;
- el informe diario «Actividades realizadas por…» del auxiliar de mantenimiento;
- fotos con texto de reparaciones, varadas y «vehículo disponible»;
- compras de repuestos;
- conversaciones con las obras sobre la disponibilidad de los equipos.

Casi nunca trae operador, obra, horómetro ni kilometraje. Hoy ese grupo no se lee, porque no hay dónde asociarlo. Mientras tanto, la Bitácora de OCC muestra la sección Maquinaria de las bitácoras de las obras (spec 033, RF-22). Geolab todavía no tiene grupo, y su Bitácora está «en construcción».

Esta spec deja asociar un grupo de WhatsApp a **una empresa** (OCC o Geolab), además de a una obra, y le da a OCC su **bitácora diaria propia**, armada desde su grupo con el mismo guardado automático de la spec 024. La Bitácora de Geolab muestra el laboratorio de las bitácoras de las obras y queda lista para recibir su grupo cuando llegue. Con esta spec se completan los módulos de la 033, y todo (032 a 038) puede subir a producción con la T23.

## Usuarios / actores

- **Gerencia** (panel web, rol `admin`): asocia los grupos a una empresa o a una obra, y ve y cierra la Bitácora de OCC y la de Geolab.
- **Encargado de OCC** (panel web, rol `encargado_occ`): ve los Reportes de WhatsApp y la Bitácora de OCC, atiende lo que «No se pudo guardar» y cierra la bitácora del día.
- **Laboratorista** (panel web): ve la Bitácora y los Reportes de WhatsApp de Geolab.
- **Quienes escriben en el grupo de OCC** (operadores, jefe de equipos, conductores): no usan el panel; reportan por WhatsApp como hoy.
- **La integración de WhatsApp** (n8n): manda los mensajes del grupo de OCC con la misma guardia de la spec 021.

## Historias de usuario

- H1: Como gerencia quiero asociar el grupo de WhatsApp de OCC a OCC (y más adelante el de Geolab a Geolab), no a una obra, para que se lea sin mezclarse con las obras.
- H2: Como Encargado de OCC quiero que lo que se reporta en el grupo de OCC arme solo la bitácora del día de OCC (qué equipos están operativos o inoperativos y por qué, los trabajos de mantenimiento, las actividades del personal de mantenimiento, los pendientes y las fotos), para no pasarlo a mano.
- H3: Como Encargado de OCC quiero ver los mensajes del grupo de OCC en Reportes de WhatsApp, con lo que la IA entendió y lo que no se pudo guardar, para corregirlo.
- H4: Como gerencia quiero seguir viendo la maquinaria que reportan las obras en sus propias bitácoras, junto a la bitácora de OCC, para comparar las dos fuentes.
- H5: Como laboratorista o gerencia quiero que la Bitácora de Geolab muestre el laboratorio de las bitácoras de todas las obras, mientras Geolab no tenga grupo propio.

## Requisitos funcionales (criterios de aceptación en EARS)

### Grupos de una empresa (H1)

- RF-1: EL SISTEMA deja a gerencia asociar un grupo de WhatsApp a una obra **o** a una empresa (OCC o Geolab), nunca a las dos.
- RF-2: EL SISTEMA no ofrece Elemental ni Proyectos como empresa de un grupo.
- RF-3: EL SISTEMA muestra en la lista de Grupos de WhatsApp, junto a cada grupo, su obra o su empresa.
- RF-4: CUANDO un grupo pasa de una obra a una empresa, o de una empresa a una obra, EL SISTEMA mueve sus mensajes aún sin procesar y deja lo ya guardado donde se guardó (como 021/RF-13).
- RF-5: MIENTRAS un grupo no tiene obra ni empresa, EL SISTEMA guarda sus mensajes sin procesarlos (como 021/RF-11).
- RF-6: CUANDO llega un mensaje de un grupo de empresa, EL SISTEMA lo recibe por la misma entrada y con la misma guardia de la integración, sin repetirlo si llega dos veces (021/RF-4).

### La bitácora diaria de OCC (H2)

- RF-7: EL SISTEMA lleva una bitácora de OCC por día, aparte de las bitácoras de las obras.
- RF-8: EL SISTEMA arma la bitácora de OCC con estas secciones (ajustadas a los mensajes reales del grupo, D1): **Estado de los equipos**, **Trabajos de mantenimiento**, **Actividades del personal de mantenimiento**, **Pendientes** y **Fotos del día**.
- RF-9: EL SISTEMA registra en cada renglón de Estado de los equipos el equipo, si está operativo o inoperativo, el motivo u observación y quién lo reportó. Este estado sale de la lista «Equipos operativos – para el día X» (volquetas, maquinaria amarilla, INOPERATIVOS, Notas).
- RF-9a: CUANDO llega la lista «Equipos operativos – para el día X», EL SISTEMA la guarda en la bitácora del día X que dice el mensaje, no en la del día en que se envió.
- RF-9b: SI llega una segunda lista para el mismo día, ENTONCES EL SISTEMA reemplaza el estado del día con la nueva y deja la anterior en el historial.
- RF-9c: CUANDO durante el día alguien reporta que un equipo quedó varado, entró a mantenimiento o volvió a estar operativo o disponible, EL SISTEMA anota el cambio con la hora en el estado de ese equipo, sin borrar lo que decía la lista.
- RF-9d: EL SISTEMA registra en cada renglón de Trabajos de mantenimiento el equipo, qué se hizo o qué daño tiene, el tipo (daño, reparación, mantenimiento preventivo, llantas, repuesto o compra, suministro de aceites o combustible), quién lo reportó, la hora y sus fotos.
- RF-9e: CUANDO llega un informe «Fecha dd/mm/aaaa – Actividades realizadas por …», EL SISTEMA lo guarda en Actividades del personal de mantenimiento del día que dice el informe, una actividad por viñeta, y la liga al equipo cuando la viñeta lo nombra.
- RF-9f: EL SISTEMA lleva las Notas de la lista del día a Pendientes, ligadas al equipo cuando lo nombran.
- RF-9h (cambio del 2026-11-03): CUANDO un trabajo de mantenimiento del grupo de OCC es de un equipo reconocido y es un cambio de aceite, un mantenimiento preventivo o un daño o reparación, EL SISTEMA lo registra además en el módulo Mantenimientos, igual que si viniera del grupo de una obra (spec 030, RF-36 a RF-42). Cuando el grupo dice que ese equipo volvió a estar operativo o disponible, EL SISTEMA marca como resueltos sus correctivos pendientes. Un renglón con placa mal escrita (RF-12a) no va a Mantenimientos.
- RF-9g: EL SISTEMA no arma renglones con las conversaciones (aprobaciones de compras, preguntas de las obras, reclamos, saludos). Esas conversaciones se ven en Reportes de WhatsApp.
- RF-10: CUANDO un mensaje del grupo de OCC trae estado, trabajos, actividades, pendientes o fotos de un día, EL SISTEMA los guarda en la bitácora de OCC de ese día sin aprobación, como las obras (spec 024).
- RF-11: SI un renglón no se puede guardar (el equipo no se reconoce o falta el dato principal), ENTONCES EL SISTEMA lo deja en «No se pudo guardar» de OCC con el motivo, para completarlo o descartarlo (024/RF-60 a RF-63).
- RF-12: EL SISTEMA reconoce los vehículos por la placa, sin importar espacios ni mayúsculas («TFO 427» = «TFO427»), y la maquinaria amarilla por su nombre corto («Pajarita Case cantera», «Vibrocompactador Volvo», «Motoniveladora alquilada 12H»), guardado en el equipo (D11).
- RF-12a: SI el mensaje trae una placa mal escrita que se parece a una placa registrada (p. ej. «LVY 499» por LVY 498, «CZW 128» por ZCW 128, «LUY002» por LVY 002), ENTONCES EL SISTEMA guarda el renglón con la placa tal cual la escribieron en el reporte y con la nota «Posiblemente sea la placa registrada LVY 498», sin ligarlo a ese equipo ni crear uno nuevo (D5).
- RF-12b: MIENTRAS un renglón tiene una placa mal escrita (RF-12a), EL SISTEMA no lleva su kilometraje ni su horómetro a los medidores de ningún equipo.
- RF-12c: SI el mensaje nombra un equipo que no se parece a ninguno registrado, ENTONCES EL SISTEMA no lo crea solo y deja el renglón en «No se pudo guardar» con el motivo.
- RF-13: EL SISTEMA no crea personas desde el grupo de OCC. Quien reporta queda como el remitente del mensaje (en el grupo no se reportan operadores).
- RF-14: CUANDO un mensaje del grupo de OCC trae un kilometraje o un horómetro explícito de un equipo (p. ej. «Km final 74609 29/10/2026 LVY002»), EL SISTEMA lo lleva a los medidores del equipo igual que si viniera del grupo de una obra (spec 025 y 026).
- RF-15: SI el mismo equipo y el mismo día ya tienen un renglón de estado en la bitácora de OCC, ENTONCES EL SISTEMA lo actualiza en vez de repetirlo. Los trabajos de mantenimiento sí se suman, uno por reporte.
- RF-16: EL SISTEMA deja a gerencia y al Encargado de OCC definir los reportes que espera la bitácora de OCC cada día y de quién, como en las obras (024/RF-37 a RF-42).
- RF-17: EL SISTEMA arma la bitácora de OCC del día con las mismas esperas y la misma marca de reportes que faltaron que las obras (024/RF-43 a RF-57).
- RF-18: EL SISTEMA deja a gerencia y al Encargado de OCC corregir y cerrar la bitácora de OCC del día.
- RF-19: MIENTRAS la bitácora de OCC está cerrada, EL SISTEMA no la cambia, y lo que llegue después de ese día va a «No se pudo guardar» con el motivo «Bitácora cerrada».
- RF-20: EL SISTEMA deja anular una bitácora de OCC con motivo, sin borrarla, como las de las obras.
- RF-21: EL SISTEMA no copia los renglones de la bitácora de OCC en las bitácoras de las obras, ni los de las obras en la de OCC (D3).

### Las pantallas de OCC (H2, H3, H4)

- RF-22 (reemplaza 033/RF-22): EL SISTEMA muestra en la Bitácora de OCC dos pestañas: «Bitácora de OCC», con la bitácora diaria propia, y «En las obras», con la sección Maquinaria de las bitácoras de todas las obras, filtrable por obra y por fecha, como hasta hoy.
- RF-23: EL SISTEMA muestra en «Bitácora de OCC» una lista de días con su estado (en espera, armada, incompleta, cerrada, anulada), y al abrir un día, sus secciones.
- RF-24: EL SISTEMA deja filtrar la bitácora de OCC por equipo y por estado (operativo o inoperativo), y muestra arriba del día cuántos equipos quedaron operativos e inoperativos.
- RF-25 (reemplaza 033/RF-23): EL SISTEMA muestra en Reportes de WhatsApp de OCC los mensajes del grupo de OCC, y además los de vehículos y maquinaria de las obras, con un filtro «Grupo de OCC / Obras / Todos» (D4).
- RF-26: EL SISTEMA muestra en «No se pudo guardar» y en «Creado automáticamente» de OCC solo lo que vino del grupo de OCC.

### Geolab (H5)

- RF-27: EL SISTEMA muestra en la Bitácora de Geolab la sección Laboratorio y los ensayos de las bitácoras de todas las obras, filtrables por obra y por fecha, como la pestaña «En las obras» de OCC.
- RF-28: CUANDO se asocia un grupo a Geolab, EL SISTEMA guarda y muestra sus mensajes en Reportes de WhatsApp de Geolab, sin armar todavía una bitácora propia de Geolab (D6).

### Reglas transversales

- RF-29: EL SISTEMA sigue decidiendo quién ve cada pantalla con los permisos de hoy: gerencia y el Encargado de OCC en OCC, gerencia y el laboratorista en Geolab (033/RF-21).
- RF-30: EL SISTEMA no borra nada: mensajes, renglones, bitácoras y decisiones quedan con quién y cuándo, como en las specs 021 y 024.
- RF-31: EL SISTEMA deja al asistente (spec 028) consultar la bitácora de OCC con los mismos permisos de la Bitácora de OCC.
- RF-32: EL SISTEMA no cambia nada de los grupos de obra ni de sus bitácoras.

## Superficies afectadas

- [ ] **Móvil** — nada.
- [x] **Panel web** — Grupos de WhatsApp (obra o empresa), Bitácora de OCC (dos pestañas, día abierto), Reportes de WhatsApp de OCC (filtro de origen), «No se pudo guardar» y «Creado automáticamente» de OCC, reportes esperados de OCC, Bitácora de Geolab.
- [x] **API** — asociar grupo a empresa; recibir mensajes de grupos de empresa por la integración; bitácora de OCC (listar días, ver, corregir, cerrar, anular); bitácora de Geolab (laboratorio de las obras).
- [ ] **Sincronización** — nada.
- [x] **Datos** — grupo de WhatsApp con empresa; bitácora diaria de una empresa; días, esperados, excepciones y creados de una empresa.
- [x] **Reglas** — `rules/whatsapp` (dueño del grupo: obra o empresa; renglones de OCC), `rules/empresas` (pestañas). Casos nuevos en `verificar-reglas.ts`.
- [x] **Integración (n8n, repo `n8n-evolutionapi`)** — dejar pasar el grupo de OCC, darle a la IA el contexto de OCC (máquinas, operadores, obras) y recuperar el historial del grupo al conectarlo.

## Requisitos no funcionales

- La Bitácora de OCC con un día de 60 equipos y la pestaña «En las obras» con 30 días abren en menos de 2 s en dev.
- Un mensaje del grupo de OCC queda guardado o en «No se pudo guardar» en el mismo tiempo que uno de obra (menos de 1 minuto desde que llega a la integración).
- Todo en español, con las palabras de la obra (equipo, horómetro, varada, traslado).

## Casos límite

- **Sin señal**: no aplica (no hay móvil). Si el VPS o n8n están caídos, los mensajes se recuperan después con el historial de Evolution, como hoy.
- **Evidencia firmada**: la bitácora de OCC cerrada no se toca (RF-19); lo que llegue tarde va a «No se pudo guardar».
- **Primer arranque**: al asociar el grupo de OCC por primera vez se recupera su historial; los días anteriores se arman y quedan abiertos para revisarlos y cerrarlos.
- La lista «para el día X» llega la noche anterior; el informe «Fecha dd/mm» llega hasta un día después: cada uno cuenta para la fecha que dice (RF-9a, RF-9e).
- Una lista que dice un día ya pasado (el 28-oct a las 22:59 llegó una segunda lista «para el día 28» que era para el 29): reemplaza la del día que dice (RF-9b) y queda la marca «Fecha dudosa» para revisarla (D12).
- Placas mal escritas («LVY 499», «CZW 128», «LUY002»): se guardan tal cual con la nota «Posiblemente sea la placa registrada …» (RF-12a), sin tocar medidores (RF-12b).
- Un mensaje sin fecha clara: cuenta para el día en que se envió (024).
- Una máquina reportada a la vez en el grupo de OCC y en el de su obra: queda en las dos bitácoras, sin juntarlas (RF-21); la pestaña «En las obras» permite compararlas.
- Un grupo que se pasa de una obra a OCC por error: lo ya guardado se queda en la obra (RF-4).
- Dos personas cierran la misma bitácora de OCC a la vez: la segunda recibe el aviso de que ya cambió (versión, como en las obras).

## Fuera de alcance

- La bitácora propia de Geolab armada desde su grupo: va en otra spec, cuando el grupo exista y haya mensajes de ejemplo.
- Juntar o conciliar la maquinaria de la bitácora de OCC con la de las bitácoras de las obras.
- Crear máquinas o vehículos desde WhatsApp.
- Combustible y consumo por máquina (si el grupo lo reporta, va a Notas por ahora).
- Grupos de Elemental o de Proyectos.
- Responder en WhatsApp o mandar avisos al grupo.

## Criterios de finalización

- Cada RF tiene cómo comprobarse: caso en `scripts/verificar-reglas.ts` (reglas puras) o paso de demo manual.
- `npm run verificar`, `npm run typecheck` y `npm run lint` en verde.
- Demo manual en dev: se asocia un grupo PRUEBA-038 a OCC; llegan por la integración mensajes de equipos de dos obras, una novedad, una foto, una máquina desconocida y un operador nuevo; se ve la bitácora de OCC del día armada, el renglón en «No se pudo guardar», el operador en «Creado automáticamente», los medidores de la máquina actualizados, la pestaña «En las obras», el filtro de Reportes de WhatsApp; se cierra la bitácora y un mensaje tardío va a «No se pudo guardar». La Bitácora de Geolab muestra el laboratorio de las obras. Limpieza de PRUEBA-038 en dev y R2.
- Producción solo con la T23 de la 033, cuando el usuario lo pida: migraciones 0031→0036 y la de la 038 en orden, antes de la imagen; luego el grupo de OCC en n8n y la recuperación de su historial.

## Dudas abiertas (con mi propuesta)

- D1 — RESUELTA (2026-11-03): leídos en solo lectura los 297 mensajes del grupo (16-oct a 3-nov) en Evolution del VPS, con permiso del usuario. RF-8 a RF-15 se ajustaron a lo que de verdad se reporta.
- D2 — Secciones de la bitácora de OCC. Propuesta: Estado de los equipos, Trabajos de mantenimiento, Actividades del personal de mantenimiento, Pendientes y Fotos del día (RF-8). Sin personal, clima, actividades de obra ni laboratorio, que son de las obras.
- D3 — ¿La maquinaria que llega por el grupo de OCC entra también a la bitácora de la obra donde trabajó? Propuesta: no (RF-21). Cada grupo alimenta su bitácora, y se comparan con la pestaña «En las obras». Juntarlas duplicaría máquinas cuando la obra también las reporta.
- D4 — Reportes de WhatsApp de OCC. Propuesta: el grupo de OCC más lo de vehículos y maquinaria de las obras, con filtro de origen (RF-25), para no perder lo que ya se ve hoy.
- D5 — Equipo desconocido. DECIDIDO por el usuario (2026-11-03): si la placa está mal escrita y se parece a una registrada, el renglón se guarda con la placa tal cual la escribieron y la nota «Posiblemente sea la placa registrada …» (RF-12a, RF-12b). Si no se parece a ninguna, no se crea el equipo y va a «No se pudo guardar» (RF-12c). Tampoco se crean personas (RF-13): en el grupo no se reportan operadores.
- D6 — Geolab. Propuesta: el grupo ya se puede asociar a Geolab y sus mensajes se ven en Reportes de WhatsApp (RF-28). La bitácora propia de Geolab queda para cuando haya grupo y ejemplos. Por ahora, su Bitácora muestra el laboratorio de las obras (RF-27).
- D7 — ¿Quién cierra la bitácora de OCC? Propuesta: gerencia y el Encargado de OCC (RF-18).
- D8 — Reportes esperados de OCC. Propuesta: los mismos de las obras (RF-16). Si no se define ninguno, el día se arma con el primer mensaje, como hoy.
- D9 — Historial. Propuesta: al conectar el grupo en producción (después de la T23), recuperar todo lo que Evolution tiene del grupo de OCC y armar esos días abiertos. Se hace con tu permiso, como el 30-oct con Magdalena.
- D10 — Combustible. En los ejemplos es raro: unos galones de ACPM para una planta y algo de aceite hidráulico o valvulina. Propuesta: queda como trabajo de mantenimiento de tipo «suministro» (RF-9d), sin sección ni control de consumo.
- D11 — Nombre corto de la maquinaria amarilla. La maquinaria se nombra por descripción, no por código («Pajarita Case cantera», «Pajarita Case campamento», «Vibrocompactador Dynapac», «Motoniveladora alquilada GD 555», «Recicladora Wirtgen»). Propuesta: agregar al equipo uno o varios **nombres en WhatsApp**, que gerencia o el Encargado de OCC escriben en la ficha del equipo, y con los que la IA lo reconoce.
- D12 — Fecha de la lista. Propuesta: cuenta el día que dice la lista. Si ese día ya pasó o es el mismo día y se envió de noche, la lista se guarda igual y queda la marca «Fecha dudosa» para que el Encargado la mueva si hace falta.
- D13 — Compras y autorizaciones del grupo («para autorizar la compra de 5 galones de valvulina», «Autorizado», fotos de facturas). Propuesta: no se crean solicitudes ni compras en el módulo de Compras (spec 036). Quedan como trabajo de tipo «repuesto o compra» con su foto, y la conversación se ve en Reportes de WhatsApp.
