# Validación — Spec 038, WhatsApp y Bitácora de OCC y Geolab

> Fecha: 2026-11-03 · Tarea T22

Recorrido RF por RF. Cada fila dice **con qué se comprobó**:
- un caso de `scripts/verificar-reglas.ts` (los de esta spec llevan «038/», 31 pruebas, líneas 8168 y 13060 a 13918);
- una prueba en vivo, con la tarea en que se hizo (el detalle está en las notas de cada tarea);
- o, cuando se cumple **por construcción**, la razón, dicha así.

Lo que no se ejecutó no se da por verificado: queda en «Lo que no se probó».

## Lo que se ejecutó

| Comando | Resultado |
| --- | --- |
| `npm run verificar` | **664 verificaciones correctas** (31 pruebas de la 038; 3 de la 021 y la 033 actualizadas) |
| `npm run typecheck` | sin errores (código de salida 0) |
| `npm run lint` | sin hallazgos (código de salida 0) |
| `npx expo export --platform web` + `grep` en `dist/client` | 0 archivos con `DATABASE_URL`, `ANTHROPIC_API_KEY`, `SECRETO_TOKENS`, `R2_LLAVE`, `TOKEN_INTEGRACION`, `sk-ant-`, `postgresql://` o `neon.tech`; `dist` borrado |

**Desarrollo** (`neondb`; migración `0037_busy_enchantress` aplicada **solo aquí**, 38 migraciones):
- **T7:** la migración revisada a mano antes de aplicarla: sin `DELETE` ni cambios de filas; rehace tres índices únicos con `coalesce` del dueño, que para lo existente cuentan igual. Comprobada con un script: grupo con obra y empresa, Elemental, dos bitácoras vigentes el mismo día, anular sin motivo, esperado y foto sin dueño → rechazados.
- **T8 a T15:** cada ruta contra el dev server, con sesiones temporales (borradas por su huella) y datos `PRUEBA-038-T…`; el guardado automático, llamando a `recibirMensaje` y `procesarMensaje`, las mismas funciones de la ruta de la integración (su token solo está como huella en `.env`).
- **T16 a T19:** en Chrome, con la sesión de gerencia del usuario en `localhost:8081` y datos de demo `PRUEBA-038-DEMO` armados por el guardado automático.
- **T20:** la instrucción del grupo de OCC con 10 mensajes reales del grupo (leídos en solo lectura de Evolution del VPS el 2026-11-03, con permiso), mandada a la API de Anthropic con la misma petición que arma el flujo (Docker local apagado). Todas pasan `propuestaDeIa`.
- **T22:** medición (abajo) y barrido de restos.
- **Limpieza acotada:** solo lo `PRUEBA-038`. Al final: 0 mensajes, grupos, excepciones, mantenimientos, bitácoras y días de empresa, esperados de empresa, fotos de empresa, `media` de prueba y nombres en WhatsApp de prueba. Los medidores de LLQ376 y LLQ377 (T11) restaurados a su valor; su `medidor_actualizado_en` perdió los microsegundos y su `actualizado_en` quedó del 3-nov. Nada se subió a R2. El volcado de los mensajes reales del grupo, borrado del scratchpad. Scripts temporales borrados.

**Producción:** sin tocar. Va con la T23 de la 033 (ver «Para desplegar»).

## Medición (requisitos no funcionales)

| Qué | Contra el dev server | Requisito |
| --- | --- | --- |
| Un día de la Bitácora de OCC con 60 equipos, 60 trabajos, 60 actividades y 20 pendientes | 0,58 – 1,31 s (4 veces; la primera, en frío) | < 2 s ✓ |
| El mismo día filtrado por inoperativos | 0,67 – 1,17 s | < 2 s ✓ |
| La lista de 30 días de la Bitácora de OCC | 0,44 – 0,64 s | < 2 s ✓ |
| «En las obras», 30 días | 0,34 – 0,42 s, **con solo 6 bitácoras y 12 máquinas en dev** | < 2 s ✓ (débil: es la de la 033, sin cambios) |
| Un mensaje del grupo de OCC, de recibido a guardado | 1 – 3 s por mensaje en las pruebas de la T10 a la T15 (sin contar la IA) | < 1 min ✓ |

## Arreglos que salieron de las pruebas

- **T6:** el laboratorista no veía la Bitácora de Geolab y el Encargado de OCC no podía corregir la de OCC → permiso nuevo `bitacora_empresa` (en el plan); 2 pruebas del menú de la 033 actualizadas.
- **T8:** un mensaje en espera de su día en una obra se habría ido con el grupo a OCC y perdido de la bitácora de la obra → se le fija la obra al pasar el grupo a una empresa.
- **T11:** el pulso solo reintentaba los pendientes con obra: un mensaje de OCC que fallara no se habría reintentado nunca → ahora también los de empresa, y sus fotos.
- **T14:** «No se pudo guardar» de OCC exigía el permiso de aprobar de una obra, que el Encargado de OCC no tiene → lo atiende quien lleva la Bitácora de la empresa.
- **T15:** dar al laboratorista el permiso de WhatsApp le habría abierto las bandejas y, en el asistente, los mensajes de su obra → entra a los Reportes de WhatsApp de Geolab con `bitacora_empresa`, solo al grupo (en el plan); 2 pruebas del menú de la 033 actualizadas.
- **T18:** con un filtro puesto, las secciones vacías decían que no había llegado el informe; «1 inoperativos»; el aviso de fecha dudosa mandaba a reprocesar desde «No se pudo guardar», que no es posible.
- **T20:** la IA manda siempre el bloque de la lista, vacío si el mensaje no es una lista: **una foto de un trabajo habría borrado la lista del día** → una lista solo cuenta si trae equipos o notas (prueba nueva). Y la instrucción: varias líneas de un servicio son un trabajo, y el equipo de un mensaje anterior se usa si el mensaje no lo dice.

## RF por RF

### Grupos de una empresa (H1)

| RF | Veredicto | Con qué |
| --- | --- | --- |
| RF-1 | ✓ Cumple | `038/RF-1, RF-2`; T7 (check en la base); T8 (422 con obra y empresa); T16 en Chrome (selector «Obra o empresa», asociado a OCC) |
| RF-2 | ✓ Cumple | `038/RF-1, RF-2` (Elemental, Proyectos y otras rechazadas); T7 (check `occ`/`geolab`); T8 (Elemental → 422) |
| RF-3 | ✓ Cumple | T8 (la lista dice la empresa); T16 en Chrome («OCC (empresa)», «Sin asociar») |
| RF-4 | ✓ Cumple | T8: el pendiente se va con el grupo, lo guardado se queda (en obra y en OCC), lo en espera se queda en su obra |
| RF-5 | ✓ Cumple | T8: un grupo sin dueño no se procesa (`sin_obra`) |
| RF-6 | ✓ Cumple | Por construcción: la misma ruta y guardia de la 021, sin cambios de forma; T10 (repetir la entrega → `conservado` / `no_pendiente`) |

### La bitácora diaria de OCC (H2)

| RF | Veredicto | Con qué |
| --- | --- | --- |
| RF-7 | ✓ Cumple | T7 (`bitacoras_empresa`, una vigente por empresa y día); T10 |
| RF-8 | ✓ Cumple | T18 en Chrome: las cinco secciones del día |
| RF-9 | ✓ Cumple | `038/RF-9, RF-9f, RF-12a, RF-12c`; T10; T20 (la lista real del 29-oct leída con su estado y motivos) |
| RF-9a | ✓ Cumple | `038/RF-9a, D12`; T10 (la lista del 29 queda en el 30) |
| RF-9b | ✓ Cumple | `038/RF-9b, RF-9f` y `038/RF-9b: un bloque de lista vacío…`; T10 |
| RF-9c | ✓ Cumple | `038/RF-9c, RF-24`, `038/RF-9c, RF-15`; T10; T18 en Chrome («08:48 Varado», «14:45 Operativo») |
| RF-9d | ✓ Cumple | `038/RF-9c, RF-9d, RF-9e`; T10; T18 en Chrome |
| RF-9e | ✓ Cumple | `038/RF-9e`; T10 (el informe enviado pasada la medianoche cuenta para su fecha); T20 (10 actividades del informe real) |
| RF-9f | ✓ Cumple | `038/RF-9b, RF-9f`; T10; T18 en Chrome |
| RF-9g | ✓ Cumple | `038/RF-9, RF-9g, RF-10`; T10 («Autorizado» → `sin_destino`); T20 (autorización y preguntas → sin renglones) |
| RF-9h | ✓ Cumple | `038/RF-9h` (2 pruebas); T11 (aceite con la obra del equipo, una sola vez; «operativo» resuelve su correctivo) |
| RF-10 | ✓ Cumple | T10 (guardado al llegar, sin aprobación) |
| RF-11 | ✓ Cumple | T10 (equipo desconocido a «No se pudo guardar»); T14 (completarlo lo lleva al día); T19 en Chrome (completar eligiendo el equipo) |
| RF-12 | ✓ Cumple | `038/RF-12: el grupo de OCC reconoce…`; T9 y T16 (nombres en WhatsApp) |
| RF-12a | ✓ Cumple | `038/RF-12a` (2 pruebas); T10; T18 en Chrome («Posiblemente sea la placa registrada LLQ376») |
| RF-12b | ✓ Cumple | `038/RF-14, RF-12b`; T11 (la lectura de la placa mal escrita no toca medidores y se avisa) |
| RF-12c | ✓ Cumple | `038/RF-12a, RF-12c`; T10; T14 |
| RF-13 | ✓ Cumple | Por construcción: el camino de empresa no crea personas (`empresa.ts` no llama a `creacion.ts`) |
| RF-14 | ✓ Cumple | `038/RF-14, RF-12b`; T11 (el odómetro de LLQ376 sube, hacia adelante, con su día) |
| RF-15 | ✓ Cumple | `038/RF-9d, RF-9e, RF-15`, `038/RF-10, RF-15`; T10 (reprocesar no duplica nada) |
| RF-16 | ✓ Cumple | `038/RF-16`; T12 (gerencia define los esperados de OCC por la ruta); T19 en Chrome |
| RF-17 | ✓ Cumple | `038/RF-16, RF-17`; T12 (en espera, armada, incompleta a la hora límite con lo que faltó, sin esperados con el primero) |
| RF-18 | ✓ Cumple | T13 (corregir, cerrar, versión vieja 409); T18 en Chrome. Ver «Lo que no se probó»: el Encargado de OCC |
| RF-19 | ✓ Cumple | T10 (lo que llega a un día cerrado → «Bitácora cerrada»); T13 (corregir cerrada → 422); T18 en Chrome |
| RF-20 | ✓ Cumple | T13 (anular con motivo; sin motivo 400; el día queda libre); T18 en Chrome |
| RF-21 | ✓ Cumple | Por construcción: el camino de empresa escribe solo `bitacoras_empresa`, y el de obra no la lee |

### Las pantallas de OCC (H2, H3, H4)

| RF | Veredicto | Con qué |
| --- | --- | --- |
| RF-22 | ✓ Cumple | `038/RF-22, RF-27, RF-29`; T17 en Chrome (las dos pestañas) |
| RF-23 | ✓ Cumple | `038/RF-20, RF-23`; T13; T17 en Chrome (armada, fecha dudosa, anulada) |
| RF-24 | ✓ Cumple | `038/RF-24`; T13; T18 en Chrome (filtro de inoperativos; el conteo es del día entero) |
| RF-25 | ✓ Cumple | `038/RF-25`; T14 (grupo, obras, todos; el residente no ve el grupo); T19 en Chrome. La prueba de «Todos» fue débil: ese día no había reportes de obras en dev |
| RF-26 | ✓ Cumple | T14 («No se pudo guardar» de OCC solo con lo del grupo). «Creado automáticamente» no se muestra en OCC: el grupo no crea nada (RF-13) |

### Geolab (H5)

| RF | Veredicto | Con qué |
| --- | --- | --- |
| RF-27 | ✓ Cumple | T15 (19 ensayos de las obras, sin anuladas, filtro por obra; gerencia y laboratorista sí, residente no); T19 en Chrome (la pantalla, sin «en construcción») |
| RF-28 | ✓ Cumple | `038/RF-28, RF-29, RF-31`; T15 (el grupo de Geolab no arma bitácora y se ve en sus Reportes de WhatsApp; el laboratorista ve solo el grupo) |

### Reglas transversales

| RF | Veredicto | Con qué |
| --- | --- | --- |
| RF-29 | ✓ Cumple | `038/RF-22, RF-27, RF-29`, `038/RF-28, RF-29, RF-31`; T13 a T15 (residente y laboratorista fuera de OCC → 404) |
| RF-30 | ✓ Cumple | Por construcción: anular, quitar y reemplazar dejan rastro (listas reemplazadas, motivo, mensajes intactos); T7 (checks) |
| RF-31 | ✓ Cumple | `038/RF-28, RF-29, RF-31`; T15 (la herramienta responde a gerencia y se niega al residente) |
| RF-32 | ✓ Cumple | Las pruebas de la 021 a la 037 siguen en verde; T8 (entre dos obras, la regla de la 021 sin cambios); T12 (los días de obra igual) |

## Lo que no se probó (o quedó débil)

- **El Encargado de OCC en vivo:** en dev no hay ningún usuario con ese rol. Sus permisos están en las reglas (`038/RF-22, RF-27, RF-29`, `038/D11`) y en `alcanzaLaEmpresa`, pero no se entró con él.
- **El flujo de n8n corriendo:** Docker local estaba apagado; la instrucción se probó contra la API con la misma petición del flujo (T20), y los JSON generados se compararon nodo por nodo con los anteriores (T20, T21). Ninguno está importado en el n8n del VPS.
- **Las Fotos del día de OCC en pantalla:** la foto llega a `bitacora_fotos` del día (T11), pero la demo no tenía fotos y no se vio la miniatura en Chrome.
- **Completar en «No se pudo guardar» un cambio, un trabajo o una lectura:** en Chrome solo se completó un equipo de la lista (T19); los otros tres se probaron por la ruta en la T14 solo para el estado.
- **«En las obras» con volumen:** dev tiene 6 bitácoras de obra en el mes.

## Lo que quedó fuera o pendiente

- **D12, «mover» la lista a otro día:** no existe. El Encargado puede corregir los equipos del día o anular la bitácora; el aviso de fecha dudosa lo dice así.
- **Error de un solo campo en la ficha del equipo:** sale arriba de la ventana, no debajo del campo (RF-33 de antes, para toda la app); con «Nombres en WhatsApp» al final de la ventana hay que subir para verlo.

## Para desplegar (con la T23 de la 033, cuando el usuario lo pida)

1. Migraciones 0031 → **0037** en orden, con `scripts/migrar-produccion.ts`, antes de la imagen. La 0037 rehace los índices únicos de `bitacora_fotos`, que en producción **sí** tiene filas: revisar que no choquen (no deberían: para lo existente el `coalesce` da el mismo `parte_id`).
2. La imagen nueva; verificar con un inicio de sesión.
3. En el panel de producción: escribir los **nombres en WhatsApp** de la maquinaria amarilla de OCC (sin ellos, cada día irían a «No se pudo guardar»), y definir los reportes esperados de OCC si se quieren.
4. Asociar el grupo «OBRAS CIVILES COLOMBIANAS» a **OCC**.
5. En el n8n del VPS: el flujo de clasificar y el de entrega regenerados; en el de captura, agregar el grupo **sobre la exportación del VPS** (lleva la llave de Evolution de producción), como el 30-oct.
6. Con permiso: recuperar el historial del grupo con `importar_historial.py` corrido en el VPS (unos 300 mensajes desde el 16-oct; los clasifica la IA y gasta créditos).
