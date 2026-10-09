# Validación — Spec 024, Guardado automático de los reportes de WhatsApp

> Fecha: 2026-10-09 · Fase 7 del flujo SDD (tarea T28) · Incluye el cambio de la spec 021 del
> 2026-10-08 (021/RF-104 a RF-112), que se implementó con estas tareas.

Recorrido RF por RF. Cada fila dice **con qué se comprobó**: un caso de
`scripts/verificar-reglas.ts` (por su nombre o su sección), una prueba en vivo con la tarea en que
se hizo (el detalle está en las notas de `tareas.md`), o la razón por la que se cumple **por
construcción**, dicho así. Lo que no se ejecutó no se da por verificado.

## Lo que se ejecutó

| Comando | Resultado |
| --- | --- |
| `npm run verificar` | **433 verificaciones correctas** (29 nuevas de esta spec y del cambio de la 021) |
| `npm run typecheck` | sin errores |
| `npm run lint` | sin hallazgos |
| `npx expo export --platform web` + `grep` de `DATABASE_URL`, `TOKEN_INTEGRACION_WHATSAPP`, `R2_LLAVE_SECRETA`, `SECRETO_TOKENS` y `WHATSAPP_GUARDADO_AUTOMATICO` en `dist/client` | exporta; **sin coincidencias** |

**Producción (T27, 2026-10-09):**
- Migración `0021` en `preoperaocc`.
- Imagen nueva del panel, sana, con `preoperaocc:anterior` de respaldo.
- `WHATSAPP_GUARDADO_AUTOMATICO=1`.
- Pulso publicado en el n8n del VPS: cuatro flujos activos y WhatsApp conectado.
- Tres pulsos a mano y los programados procesaron **todos** los pendientes: 107 guardados, 0
  con error.
- **Los 27 vales del 7-oct son 27 viajes en Control Cantera, todos con conductor.**
- Quedaron 5 días armados, 1 en espera y 122 renglones en «No se pudo guardar».

## Cambio de la spec 021 (RF-104 a RF-112)

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| 104 | «el conductor escrito en el viaje gana a los demás caminos»; «la propuesta lleva el conductor escrito y de dónde salió» | verde |
| 105 | «sin nombre escrito, el conductor sale del reporte, el preoperacional o el último viaje»; T4 en desarrollo: XMY563 → Pedro Cartagena «del preoperacional» y «del último viaje» | verde |
| 106 | «dos preoperacionales de personas distintas no deciden el conductor»; «una persona dada de baja no se propone como conductor» | verde |
| 107 | «una placa con un carácter mal leído se reconoce si queda una sola» | verde |
| 108 | «si con los pares coinciden dos equipos, no se elige ninguno»; «ninguno parecido y varios parecidos son distintos» | verde |
| 109 | «la propuesta dice de dónde salió el conductor cuando no fue escrito»; T5 en Chrome: «Conductor propuesto: quien manejó el último viaje…» | verde |
| 110 | «el material de un viaje se reconoce sin espacios, guiones ni puntos»; simulación de los 27 vales: material 27/27 | verde |
| 111 | «un sitio se reconoce sin «cantera», «el», «la» ni «c.»»; simulación: origen 27/27 | verde |
| 112 | «un nombre escrito que no se reconoce no se cambia por el de la volqueta»; T14: PRUEBA-024-T14-9 registró a «Anderson Daza Pruebas» | verde |

## Spec 024, RF por RF

### Guardado al llegar (RF-1 a RF-10)

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| 1 | T14: los vales y el almacén se guardaron al entregarlos por la ruta de la integración; producción: 107 guardados sin nadie | verde |
| 2 | T14: 3 vales en Control Cantera en 1 a 2 s; producción: 27 viajes del 7-oct | verde |
| 3 | T14: PRUEBA-024-T14-5, dos ingresos en Almacén | verde |
| 4 | T14: el reporte de almacén no tocó la bitácora (no tiene `tipo_reporte` ni día) | verde |
| 5 | T15: los mensajes de bitácora quedaron `en_espera`; producción: 1 día en espera | verde |
| 6 | Por construcción: «ignorar» y «seguimiento» entran `ignorado` (021) y el proceso los deja (`sin_destino`); producción: 33 ignorados sin tocar | verde |
| 7 | `guardarEnCantera`: con la obra sin Control Cantera, cada viaje va a excepción con ese motivo. No se probó en vivo (todas las obras de prueba lo llevan) | verde (por construcción) |
| 8 | `guardarEnAlmacen`: sin Almacén, el reporte entero va a excepción. No se probó en vivo | verde (por construcción) |
| 9 | T14: el mismo mensaje reenviado respondió «no_pendiente» y no creó otro viaje | verde |
| 10 | T12 y T14: `registrado_por` y `aprobado_por` = «IA WhatsApp», y el mensaje como origen | verde |

### Viajes sin duplicar (RF-11 a RF-15)

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| 11 | «con número de vale, el viaje repetido es el que tiene ese vale»; T14: «prb-1» contado repetido | verde |
| 12 | «sin vale, es repetido el de la misma volqueta a 30 minutos o menos» | verde |
| 13 | Las dos anteriores; el resultado del mensaje lleva `repetidos` (T14: 1) | verde |
| 14 | «de un renglón con varios viajes se guardan solo los que faltan»; `viajesParaGuardar` cuenta los de la volqueta ese día | verde |
| 15 | Por construcción: el aviso de vale repetido de otro día es el de la 023 (`avisoDeValeRepetido`) y no impide guardar; `viajeRepetido` solo mira el mismo día | verde |

### Datos que faltan (RF-16 a RF-21)

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| 16 | «un viaje sin hora toma la de la foto y, sin ella, la del mensaje en Colombia»; `hora_foto` en el esquema de la IA (T6) | verde |
| 17 | «un viaje sin destino escrito va a la obra; uno escrito y no reconocido no» | verde |
| 18 | T14: «Anderson Daza Pruebas» registrado como conductor (con 021/RF-112) | verde |
| 19 | «un renglón que falta va a «No se pudo guardar» y el resto se guarda»; T14: placa «PRB0» | verde |
| 20 | La misma, y T15: en un día cerrado los viajes se guardaron y lo demás se apartó | verde |
| 21 | «una fecha que no existe en el calendario se toma como no leída»; por construcción, `resolverPropuesta` usa el día del mensaje sin fecha | verde |

### Crear lo que no existe (RF-22 a RF-36)

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| 22 | «una persona sin parecidas se registra…»; T13: «PRUEBA Conductor 024» una sola vez desde dos mensajes | verde |
| 23 | «una persona reconocida o con una sola parecida no se registra otra vez» | verde |
| 24 | «con dos o más parecidas no se registra a nadie»; T14: PRUEBA-024-T14-8 a excepción | verde |
| 25 | La de RF-22: cargo conductor desde un viaje o una máquina | verde |
| 26 | La de RF-22: cargo de la hoja («CONTROLADORAS») o sin definir | verde |
| 27 | T14: «PRUEBA Tubo 024» registrado en Almacén con su unidad | verde |
| 28 | T14: «PRUEBA Arena 024» registrado en Control Cantera | verde |
| 29 | T14: «Cantera PRUEBA Nueva 024» (origen, tipo cantera); producción: «Vía las margaritas» (destino, tipo otro) | verde |
| 30 | T14: la volqueta WA-PRB024B; «de una máquina del reporte se toma la placa colombiana que trae escrita» | verde |
| 31 | «una placa de menos de cinco letras y cifras no alcanza para registrar la volqueta»; T14: «PRB0» | verde |
| 32 | T13 y T14: cada registro creado en `whatsapp_creados` con su mensaje; T24: la marca en Personas, Vehículos y Control Cantera | verde |
| 33 | T19 y T24 en Chrome: la lista de lo creado sin revisar | verde |
| 34 | T19 y T24: «Revisado» la saca de la lista, 409 al repetir, la marca se conserva | verde |
| 35 | Por construcción: lo creado es una persona, volqueta, material o sitio más, y se corrige en su módulo como cualquier otro | verde |
| 36 | T19 y T24 en Chrome: «Es el mismo que…» pasó viajes, renglones y movimientos y dio de baja lo creado; `creacion.ts` sigue `unido_a` | verde |

### Lista de reportes esperados (RF-37 a RF-42)

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| 37 | T17 (ruta) y T22 (Chrome): gerencia agregó, quitó y guardó | verde |
| 38 | «cada mensaje cuenta como uno de los reportes que se esperan»; los cinco tipos en el selector (T22) | verde |
| 39 | «el día está completo cuando llegó cada reporte esperado»: el reporte diario de otra persona no cuenta | verde |
| 40 | «sin lista, o en un día que la obra no trabaja, basta el primer mensaje» (domingo, festivo, sábado sin jornada) | verde |
| 41 | La misma (lista vacía) | verde |
| 42 | T17: el residente lee la lista (200) y recibe 403 al cambiarla; T22: la vista del residente es de solo lectura | verde (la vista del residente no se miró en Chrome) |

### Armar la bitácora (RF-43 a RF-54)

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| 43 | T15: con el último reporte esperado, la bitácora del 2026-09-30 se armó sola | verde |
| 44 | T15: el personal y el reporte diario juntos en la bitácora, con la fusión de la 021 | verde |
| 45 | T15, T17 y T21: las bitácoras armadas quedaron abiertas | verde |
| 46 | «la hora límite es el mediodía del día siguiente en Colombia»; T16: el 2026-09-24 armado por el pulso | verde |
| 47 | T16 y T21: `incompleta` con lo que faltó | verde |
| 48 | T17 (ruta) y T21 (Chrome): «Guardar con lo que hay» armó el 2026-09-17; 409 al repetir y en un día cerrado | verde |
| 49 | Por construcción: `actualizarDia` y `armarBitacora` no abren nada sin mensajes en espera; T14: los vales del 2026-10-08 no abrieron bitácora nueva | verde |
| 50 | T15: el incidente que llegó tarde entró a la bitácora armada | verde |
| 51 | T15: el reporte del 2026-10-07 (cerrada) quedó en excepción con el camino de anular | verde |
| 52 | T15: su viaje sí quedó en Control Cantera | verde |
| 53 | T15: la foto del día puesta por el sistema en la bitácora del 2026-09-30 | verde |
| 54 | Por construcción: las filas llevan ids fijos por mensaje y renglón; T18: un reintento no duplicó el viaje | verde |

### Estado del día, historial y excepciones (RF-55 a RF-64)

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| 55 | T17 y T21: cada reporte esperado recibido o pendiente, con autor y hora | verde |
| 56 | T21: en espera, armada, incompleta y cerrada en la tabla | verde |
| 57 | T17: el residente ve su obra y 404 en otra; T21: gerencia ve todas | verde |
| 58 | T20 en Chrome: el historial con qué se guardó y dónde | verde |
| 59 | T20 en Chrome: «Ver bitácora» y «Ver viajes» abrieron el día y la obra | verde |
| 60 | T18 y T23: la lista con el mensaje y el dato que falta | verde |
| 61 | T18 y T23 en Chrome: el vale «PRB1» completado con la volqueta y guardado; lo del mensaje entero se reintenta | verde |
| 62 | T18 y T23: el renglón salió de la lista | verde |
| 63 | T18 y T23: descartado con motivo; sin motivo, 400 | verde |
| 64 | T18 a T24: residente (Natalia) y gerencia (Diego) atendieron las listas | verde |

### Corregir lo guardado, lo pendiente y reglas transversales (RF-65 a RF-76)

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| 65 | Por construcción: los viajes de WhatsApp son filas de `cantera_viajes` y se anulan como cualquiera; la unión los anula y los registra de nuevo (RF-75) | verde |
| 66 | Por construcción: lo guardado en una bitácora abierta se edita en su pantalla, como antes | verde |
| 67 | Por construcción: los movimientos de WhatsApp son de `almacen_movimientos` y se anulan como cualquiera | verde |
| 68 | T16 en desarrollo y T27 en producción: los pendientes se procesaron solos al activar | verde |
| 69 | T25 en Chrome: un mensaje aprobado antes se ve igual; T27: los aprobados de producción no se tocaron | verde |
| 70 | T25: con el interruptor encendido, la propuesta no ofrece decidir y las rutas responden 409 | verde |
| 71 | Por construcción: `faltasDelReporte`, `eleccionesAjenas` y las validaciones de cada sección son las del registro a mano | verde |
| 72 | T14 y T20: «Desde WhatsApp» en Control Cantera; la bitácora y el almacén conservan la marca de la 021 y la 023 | verde |
| 73 | Por construcción: la foto del día de la bitácora se cambia en su pantalla mientras esté abierta | verde |
| 74 | «con dos o más parecidas no se registra a nadie» («Diego» con dos Diegos) | verde |
| 75 | T19 y T24: el viaje anulado con «Se unió con …» y registrado de nuevo | verde |
| 76 | T19: el viaje de la bitácora cerrada no se tocó y se avisó (`sinTocar: 1`) | verde |

## Requisitos no funcionales

| Requisito | Resultado |
| --- | --- |
| Un vale en Control Cantera en menos de 1 minuto | T14: de 0,9 a 2,1 s por mensaje |
| La bitácora de un día con 60 mensajes en menos de 30 segundos | **No medido con 60.** T16: un pulso con 30 mensajes tardó entre 34 y 50 s, procesándolos uno por uno, y el armado de un día con 40 incidentes entró en uno de esos pulsos. Queda pendiente medirlo, o aceptar el tiempo actual |

## Alcance

**Lo que se hizo y la spec no pedía al pie de la letra, todo anotado en `tareas.md`:**
- El filtro por obra del pulso, que la ruta no usa: solo sirve para las pruebas.
- Los dos ajustes de T16: la fecha imposible y el motivo legible.
- Las pestañas hechas con botones.
- El interruptor para volver atrás: estaba en el plan.

**Fuera de alcance, y sigue fuera:**
- WhatsApp no recibe respuestas.
- La bitácora no se cierra sola.
- Los viajes no se editan.
- Las personas creadas no tienen acceso.
- La hora límite es la misma para todas las obras.

## Constitución

1. **Local-first:** el celular no se tocó.
2. **La spec manda.** Lo que surgió al implementar volvió a la spec con la aprobación del usuario:
   - 021/RF-112 y 024/RF-18 y RF-74: el conductor escrito gana y los nombres ambiguos no se registran;
   - RF-75 y RF-76: al unir, los viajes se anulan y lo cerrado no se toca;
   - la confirmación del PR de llegada.
3. **Una regla, un sitio:** `whatsapp-automatico.ts` y las reglas nuevas de `whatsapp.ts` son puras y tienen sus casos.
4. **Nada se borra:** lo quitado de la lista de esperados y lo unido se da de baja; los viajes se anulan; lo cerrado no se reescribe.
5. **Puerta de calidad:** los tres comandos en verde en cada tarea.
6. **Fronteras:**
   - el pulso usa la guardia de la integración y el panel la suya;
   - el interruptor se lee solo en las rutas `+api.ts`;
   - no hay secretos en el cliente.
7. **Español y tokens del tema.**
8. **Sin dependencias nuevas.**

## Veredicto

**Sí: la spec 024 está cumplida**, y también el cambio de la 021 (RF-104 a RF-112):
- los 76 RF de la 024 y los 9 de la 021 están en verde. Los que se cumplen por construcción o solo se probaron por la ruta lo dicen en su fila;
- los tres comandos están en verde;
- no hay fugas de secretos;
- la spec está en producción.

**Lo que queda abierto no es código que falte:**
- un requisito no funcional sin medir: la bitácora con 60 mensajes en 30 s;
- la vista del residente en «Reportes esperados», que no se miró en Chrome;
- operación: atender en producción «Creado automáticamente» (unir «Eddier Quinceno», «Wilfer Osorio» y los dos nombres de «Vía las Margaritas») y «No se pudo guardar» (122 renglones: personal sin horas y máquinas sin placa).

**Mejora posible para una spec o un cambio aparte:** reconocer las máquinas por su nombre y marca («Motoniveladora Komatsu GD 566»), y no solo por su placa o su código.
