# Validación — Spec 026, Máquinas por nombre, medidores al día, fechas con calendario y panel para celular

> Fecha: 2026-10-11 · Fase 7 del flujo SDD (tarea T18) · Incluye el cambio del 2026-10-10 (RF-42 a RF-48)

Recorrido RF por RF. Cada fila dice **con qué se comprobó**:
- un caso de `scripts/verificar-reglas.ts` (los de esta spec empiezan por «026/»);
- una prueba en vivo, con la tarea en que se hizo;
- o, cuando se cumple **por construcción**, la razón, dicha así.

Lo que no se ejecutó no se da por verificado.

## Lo que se ejecutó

| Comando | Resultado |
| --- | --- |
| `npm run verificar` | **463 verificaciones correctas** (9 pruebas «026/»; 2 nuevas con el cambio) |
| `npm run typecheck` | sin errores (código de salida 0) |
| `npm run lint` | sin hallazgos (código de salida 0) |

**Integración (PC, T15, 2026-10-10):** el reporte del 8-oct pasó por la IA nueva y salieron los
20 equipos con `tipo_equipo`, `marca` y `unidad_medidor` iguales al texto: la TFO 427, la TFO 429,
el Volvo y el carrotanque ZCW 128 en horas; volquetas, camionetas y camión en km.

**Desarrollo (T5, T6, T16, T21):**
- el 8-oct en la obra de pruebas reconoció la recicladora y el Dynapac, creó el montacarga y el
  Volvo una sola vez, y dejó las dos Komatsu con el motivo de RF-6;
- cambio del 2026-10-10, con mensajes `PRUEBA-026C-1` a `-5`:
  - un reporte del 8-oct con la recicladora en 449 h, con Vehículos en 452.5 h del 9-oct: la fila
    entró a la bitácora del 8-oct, sin excepción, y el vehículo no cambió;
  - una imagen sin archivo quedó en espera; al llegar el archivo se guardó, en un día ya armado
    al instante y en uno vencido con el pulso;
  - con el archivo ausente más de 30 minutos se guardó sin él, y al llegar después quedó como
    foto del día;
  - un renglón pendiente que vuelve a fallar se queda con el motivo nuevo.

**Producción:**
- **2026-10-10 (T17):** migración 0022, imagen `3f1b48b0a50f` y clasificador nuevo. Al recargar
  los créditos de Anthropic, los reportes del 9-oct actualizaron solos las lecturas de 17 equipos
  de CONSORCIO MAGDALENA y crearon el montacarga (`WA-MONTACARGAS-8D39`) y el vibrocompactador
  Volvo (`WA-VIBROCOMPACTADORA-4990`).
- **2026-10-11 (T22):** migración 0023 (`vehiculos.medidor_dia`), imagen `b83724f928dc` sana, con
  `preoperaocc:anterior` = `3f1b48b0a50f`; el sitio vecino y el panel responden 200; sin errores
  en los registros.
- **Reporte del 8-oct reprocesado:** la bitácora del 8-oct pasó de 12 a **15 máquinas** (montacarga,
  recicladora REC-01 y Dynapac VIBROCMP-01), y **ninguna lectura de Vehículos cambió** (comparación
  antes y después de los 25 equipos). En «No se pudo guardar» quedan 5 renglones reales:
  - TAY 076: la final es menor que la inicial;
  - TFO 427: más de 24 h en un día;
  - las dos Komatsu: RF-6;
  - la NPX 602 sin lectura final.

## Máquinas reconocidas por su nombre (H1)

| RF | Cómo se comprobó |
| --- | --- |
| RF-1 | Caso «026/RF-1 a RF-4, RF-7, RF-14»; en producción, la recicladora y el Dynapac del 8-oct. |
| RF-2 | Caso «026/RF-2» (Vibrocompactador = Vibro Compactadora, Montacarga = Montacargas). |
| RF-3 | Caso «026/RF-1 a RF-4…» («wirtgen wr2000» = «WIRTGEN WR 2000»). |
| RF-4 | Mismo caso; en producción, REC-01 y VIBROCMP-01. |
| RF-5 | Caso «026/RF-5». |
| RF-6 | Caso «026/RF-6, RF-16, RF-17»; en producción, las dos Komatsu del 8 y del 9-oct. |
| RF-7 | Caso «026/RF-1 a RF-4, RF-7…» (por placa primero). |

## Máquinas no registradas (H2)

| RF | Cómo se comprobó |
| --- | --- |
| RF-8, RF-9, RF-10 | En vivo (T5) y en producción: el montacarga y el Volvo, con tipo, marca, modelo y código `WA-…`, sin placa. |
| RF-11 | En Chrome (T24 de la 024 y T8): la marca «Desde WhatsApp» en Vehículos. |
| RF-12 | En vivo (T5): el equipo creado en «Creado automáticamente». |
| RF-13 | Por construcción: `crearMaquina` solo se llama con `tipoId`; sin tipo, el renglón queda en «No se pudo guardar». Caso de `faltasDelReporte` con renglón no reconocido. |
| RF-14 | Caso «026/RF-1 a RF-4, RF-7, RF-14»; en vivo, dos entregas no crearon dos equipos; en producción, el 8-oct reconoció el montacarga creado el 9-oct. |

## Medidores al día (H3)

| RF | Cómo se comprobó |
| --- | --- |
| RF-15 | En vivo (T6) y en producción (17 equipos actualizados el 2026-10-10). |
| RF-16 | Caso «026/RF-16»; en producción, la TFO 429 y el ZCW 128 en horas. |
| RF-17 | Caso «026/RF-6, RF-16, RF-17». |
| RF-18 | Caso «026/RF-18, RF-19» (mismo día o posterior). |
| RF-19 | Caso «026/RF-18, RF-19». |
| RF-20 | Migración 0022; en Vehículos, 5836.6 h con decimal (T8). |
| RF-21 | En Chrome (T8): «act. fecha» en Vehículos. |
| RF-22 | Por construcción: completar en «No se pudo guardar» pasa por `faltasDelReporte` con `lecturaDe` y por `guardarEnBitacora` (T5). |
| RF-23 | Por construcción: el cierre de la bitácora sigue con `greatest`. |
| RF-42 | Migración 0023; en vivo, `medidor_dia` queda con el día del reporte; los demás caminos (cierre, móvil, edición) lo llevan sin retroceder. |
| RF-43 | Caso «026/RF-43, RF-44»; en vivo (`PRUEBA-026C-1`) y en producción (el 8-oct, sin cambiar Vehículos). |
| RF-44 | Caso «026/RF-43, RF-44» (dos días de reporte dan 48 h). |
| RF-45 | En vivo: `apartar` dos veces con motivos distintos deja el segundo. |

## Esperar las fotos (cambio del 2026-10-10)

| RF | Cómo se comprobó |
| --- | --- |
| RF-46 | Caso «026/RF-46, RF-47»; en vivo, `PRUEBA-026C-2` y `-4` esperaron su archivo y se guardaron al llegar. |
| RF-47 | Mismo caso; en vivo, `PRUEBA-026C-5` se guardó sin archivo pasados 30 minutos. |
| RF-48 | En vivo: el archivo de `PRUEBA-026C-5` llegó después y quedó como foto del día. |

## Fechas con calendario (H4)

| RF | Cómo se comprobó |
| --- | --- |
| RF-24, RF-25 | En Chrome (T9): campos de fecha nativos que filtran. **El almanaque del navegador no sale en las capturas**: falta que el usuario lo mire abierto. |
| RF-26, RF-27 | Con curl (T7): del 1 al 9-oct, el primero es del 1 y el último del 9. |
| RF-28 | En Chrome (T9): «Hasta» con `min` igual a «Desde». |

## Diseño alineado (H5)

| RF | Cómo se comprobó |
| --- | --- |
| RF-29 a RF-32 | En Chrome a 1280 px (T10): filtros de Historial, Personas, Cantera y la bitácora; prueba de anchos en verde. |

## Panel en el celular (H6)

| RF | Cómo se comprobó |
| --- | --- |
| RF-33 | Caso «026/RF-33»; en Chrome a 390 px (T11). |
| RF-34 | En Chrome a 390 px (T11). |
| RF-35 a RF-37, RF-39, RF-40 | En Chrome a 390 px, dentro de un iframe (la ventana no se deja redimensionar) (T12). |
| RF-38 | En Chrome a 390 px (T13). |
| RF-41 | Pasada a 1280 px (T14) y prueba de anchos en verde. |

## Alcance

- Nada se implementó fuera de la spec. El cambio del 2026-10-10 entró por `/sdd:cambio`, aprobado
  antes de programarlo.
- Fuera de alcance sigue fuera: no hay historial de lecturas; la app del operador no cambió; los
  renglones descartados no se reabren solos; las fotos del día van en la spec 027.
- Constitución: las bitácoras cerradas no se tocan (RF-48 solo pone la foto en una abierta) y los
  medidores no retroceden.

## Correcciones de datos hechas en producción durante el reproceso (2026-10-10 y 11)

- El primer reproceso del 8-oct se entregó antes de vaciar la propuesta vieja, y se procesó sin
  unidades. La TFO 429 y el ZCW 128 quedaron con un odómetro falso: se devolvió a vacío, y sus
  filas de la bitácora del 8-oct se pasaron a horómetro. La receta de `DESPLIEGUE_VPS.md` dice
  ahora el orden.
- Se descartaron con motivo 9 avisos que sobraban: eran de máquinas que ya estaban en la
  bitácora del 8-oct.
- Se reabrieron los avisos de las dos Komatsu. Se habían descartado esperando que el reproceso
  las resolviera, y RF-6 las deja para que una persona elija.
- El reporte del 9-oct de Catalina Chaparro se reprocesó: su bitácora quedó con foto del día.

## Lo que queda abierto

- **RF-24, RF-25:** que el usuario abra el calendario del navegador en el panel y lo mire.
- **En producción, para el usuario:**
  - las dos Komatsu del 8 y del 9-oct (elegir cuál es MOTONV-01 y registrar la otra);
  - las lecturas mal escritas (TAY 076, TFO 427, NPX 602);
  - los ensayos «Humedad» del 9-oct.

## Veredicto

**Spec 026 cumplida.** Los 48 RF tienen evidencia; los que se cumplen por construcción lo dicen, y
RF-24 y RF-25 tienen pendiente solo la mirada del usuario al almanaque abierto.

---

# Validación del cambio del 2026-10-13 (RF-49 a RF-53)

> Fecha: 2026-10-14 · Tarea T28 · Lo que no leyeron los reportes de Catalina Chaparro del 8 y 9-oct

## Lo que se ejecutó

| Comando | Resultado |
| --- | --- |
| `npm run verificar` | **475 verificaciones correctas** (las del cambio: «026/RF-49», «026/RF-50», «026/RF-51», «026/RF-53» y la de metros de 0 a 999) |
| `npm run typecheck` | sin errores (código de salida 0) |
| `npm run lint` | sin hallazgos (código de salida 0) |

## RF por RF

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-49 | «026/RF-49: el modelo escrito en el renglón reconoce el equipo, pero no un año» (`verificar-reglas.ts:8677`); producción: «Komatsu GD 566» → MOTONV-01 (8, 9 y 7-oct) | verde |
| RF-50 | «026/RF-50: la GD 566 se reconoce por modelo y la alquilada queda para registrarse» (8688); dev (T25) y producción: la GD555 se registró sola como `WA-MOTONIVELADORA-A71A` | verde |
| RF-51 | «026/RF-51: un punto de más en la lectura se sugiere, no se corrige» (8719); producción: «¿Quiso decir 187407?» en la TAY076 del 8 y 9-oct | verde |
| RF-52 | «el PR se elige de 0 a 25 y los metros se escriben de 0 a 999» (5075); migración 0024; Chrome (T26); producción: viajes en PR 1+460, 1+510 y 1+396 | verde |
| RF-53 | «026/RF-53: «Humedad» está en la lista de ensayos» (8741); producción: las 3 humedades del 9-oct en Control de Calidad | verde |

## En producción (T27)

- Migración 0024, imagen `aa991561121b` (con la corrección de los ids de renglón), MOTONV-01 con
  modelo «GD 566».
- Reprocesados el 8 y el 9-oct y los tres vales: 3 viajes nuevos y las dos motoniveladoras.
- **El defecto de los ids de renglón** dejó la bitácora del 9-oct con dos densidades y una
  compresión repetidas y sin las humedades; se reparó con `sql/reparar_laboratorio_9oct.sql` (9
  ensayos en el orden del reporte).
- TAY076 (187407, 8 y 9-oct) y TFO427 (14655.9, 8-oct) completadas en «No se pudo guardar».
- A pedido del usuario, la NPX602 (8-oct) y la GD555 (9-oct) entraron sin lectura final y con la
  nota «Faltó reportar la lectura final…».
- El 7-oct se reclasificó y reprocesó: 19 equipos, 37 personas y 6 ensayos.

## Lo que queda abierto

- **TFO 429 del 7-oct** (inició 15686.0 h, terminó 15596.5 h): falta que Catalina diga la lectura
  correcta. No es un punto de más, así que RF-51 no la sugiere, como corresponde.
- Las lecturas finales de la NPX602 (8-oct) y la GD555 (9-oct), si llegan.

## Veredicto del cambio

**El cambio del 2026-10-13 está cumplido.** RF-49 a RF-53 en verde y publicados.
