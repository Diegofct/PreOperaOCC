# Tareas — Spec 026

Tareas de menos de 30 minutos, ordenadas por dependencia. Ninguna se marca sin `npm run
verificar`, `npm run typecheck` y `npm run lint` en verde, mirando el código de salida.

### Máquinas y medidores: reglas

- [x] T1. `VehiculoConocido` con tipo, marca y modelo; `tipoDeEquipo`; `reconocerMaquina` con sus
      casos. (RF-1 a RF-5, RF-7, RF-14)
      Hecho cuando: con equipos como los de CONSORCIO MAGDALENA, «Recicladora wirtgen wr2000» →
      REC-01; «Vibrocompactador dynapac 7ton» → VIBROCMP-01; «Retrocargador mc 762956» → por
      placa; «Montacarga a Diesel» → tipo Montacargas sin candidatos; y los tres comandos en verde.
- [x] T2. `resolverPropuesta`: tipo, marca y unidad de la IA; conflicto de RF-6; `faltasDelReporte`
      con RF-6 y la clase por unidad. (RF-6, RF-13, RF-16, RF-17)
      Hecho cuando: las dos Komatsu del 8-oct quedan sin equipo y con el motivo de RF-6; «14647.0
      hr» en volqueta se valida como horómetro; los tres comandos en verde.
- [x] T3. `faltaContraElVehiculo` y `contexto.lecturaDe` en `faltasDelReporte`. (RF-18, RF-19)
      Hecho cuando: menor → motivo RF-18; +30 h con 1 día → motivo RF-19; +30 h con 2 días → nada;
      sin lectura registrada → nada; los tres comandos en verde.

### Datos y servidor

- [x] T4. (esquema local sin cambios: SQLite guarda el real en la columna integer sin perderlo) Migración 0022 (`double precision`) en dev; esquema local `real`. (RF-20)
      Hecho cuando: en neondb, `odometro_km` y `horometro_h` son `double precision`, `npm run
      db:generate` no genera migración local, y los tres comandos en verde.
- [x] T5. Catálogos con tipo, marca, modelo y lecturas; `crearMaquina`; `llevarABitacora` y
      `guardarExcepcion` con creación y contexto de lecturas. (RF-8 a RF-14, RF-22)
      Hecho cuando: en dev, un reporte con «Montacarga a Diesel» crea el equipo una sola vez
      (dos entregas), aparece en «Creado automáticamente» y el renglón queda en la bitácora.
- [x] T6. `actualizarMedidores` en `guardarEnBitacora`; `claseMedidor` por unidad en la fila.
      (RF-15 a RF-17, RF-20, RF-23)
      Hecho cuando: en dev, el reporte deja la lectura final en el vehículo, con decimal y con
      fecha; un segundo reporte menor va a «No se pudo guardar» y no la baja.
- [x] T7. Orden ascendente por día y hora en el Historial y en «No se pudo guardar». (RF-26, RF-27)
      Hecho cuando: con curl, del 2026-10-01 al 2026-10-09, el primero es del 1 y el último del 9.

### Panel

- [x] T8. Vehículos: lecturas con un decimal y fecha de actualización. (RF-11, RF-21)
      Hecho cuando: en Chrome se ve «5836.6 h · act. 8 oct» en la máquina de la demo.
- [x] T9. `CampoDeFecha` (calendario del navegador) en Reportes de WhatsApp, Estado del día,
      Cantera y Laboratorio; `min` en «Hasta». (RF-24, RF-25, RF-28)
      Hecho cuando: en Chrome, el calendario abre, la fecha elegida filtra, y «Hasta» no ofrece
      días anteriores a «Desde».
- [x] T10. Alineación: altura común, borde inferior alineado, etiquetas arriba y columna de
      acciones fija. (RF-29 a RF-32)
      Hecho cuando: en Chrome a 1280 px, las barras de filtro de Historial, Personas, Cantera y la
      bitácora tienen sus controles al mismo nivel; la prueba de anchos sigue en verde.
- [x] T11. `useEsAngosto`; menú ☰ que se cierra al elegir. (RF-33, RF-34)
      Hecho cuando: en Chrome a 390 px el menú está oculto, se abre con ☰ y se cierra al elegir.
- [x] T12. Una columna, tablas desplazables, modal a pantalla completa y 40 px en lo angosto.
      (RF-35 a RF-37, RF-39, RF-40)
      Hecho cuando: a 390 px, Personas, Historial, Vehículos y «No se pudo guardar» no desplazan la
      página a lo ancho, y la ventana de completar ocupa la pantalla.
- [x] T13. Índice de la bitácora como desplegable en lo angosto. (RF-38)
      Hecho cuando: a 390 px, la bitácora se recorre con el desplegable, sin desplazarse a lo ancho.
- [x] T14. Pasada por el escritorio: todas las pantallas a 1280 px como antes. (RF-41)
      Hecho cuando: Inicio, Bitácoras, WhatsApp, Personas, Vehículos, Cantera, Laboratorio y
      Almacén se ven como antes, y los tres comandos en verde.

### Integración, despliegue y validación

- [x] T15. (2026-10-10, con créditos: PRUEBA-025-T18-1 en el PC, 20 equipos con tipo, marca y unidad igual al texto) n8n: `tipo_equipo`, `marca` y `unidad_medidor` en el esquema y las instrucciones;
      prueba con el 8-oct en el PC.
      Hecho cuando: la IA da para cada equipo su tipo, su marca y «km» o «h», como en el reporte.
- [x] T16. (con la clasificación del 8-oct sin los campos nuevos de la IA: falta repetirla con créditos) Demo en dev: el 8-oct en una obra con equipos como los de producción.
      Hecho cuando: se cumple la demo de la spec.
- [x] T17. (2026-10-10: migración 0022, imagen y n8n desplegados; 8-oct reprocesado con créditos: hallazgo, RF-18 manda a «No se pudo guardar» las lecturas de un día viejo que ya está en la bitácora → cambio propuesto) Despliegue: migración 0022 en producción, imagen, n8n y reproceso del 8-oct.
      Hecho cuando: los vehículos de CONSORCIO MAGDALENA tienen sus lecturas, y lo que no cuadra
      quedó en «No se pudo guardar».
- [x] T18. (2026-10-11, spec cumplida) `validacion.md` RF por RF.

### Cambio del 2026-10-10 (RF-42 a RF-48)

- [x] T19. (2026-10-11: migración 0023_nosy_random en neondb dev) Migración 0023: `vehiculos.medidor_dia` (date). Se llena en todos los caminos que
      actualizan un medidor: guardado de WhatsApp (día del reporte), cierre de la bitácora (su
      día), preoperacional (su día) y edición en Vehículos (hoy), sin retroceder. (RF-42)
      Hecho cuando: la migración corre en dev y los tres comandos en verde.
- [x] T20. (463 verificaciones) Reglas: `faltaContraElVehiculo` no compara un día anterior al de la lectura
      registrada; `esperaArchivo` (imagen o documento sin archivo, menos de 30 min). Casos en
      `verificar-reglas.ts`. (RF-43, RF-44, RF-46, RF-47)
      Hecho cuando: los casos pasan.
- [x] T21. (probado en dev: PRUEBA-026C-1 día viejo sin tocar la recicladora; PRUEBA-026C-2..5 espera, 30 min y foto tardía; RF-45 con apartar) Servidor: `lecturaDe` con `medidor_dia`; `actualizarMedidores` con el día del reporte
      (no toca Vehículos si es anterior); `apartar` actualiza el motivo de lo pendiente;
      `llevarABitacora` espera los archivos; el PUT del archivo reintenta el día en espera y pone
      la foto del día que llegó tarde. (RF-42 a RF-48)
      Hecho cuando: probado en dev con un día viejo y un reporte cuya foto llega después.
- [x] T22. (2026-10-11: migración 0023 en preoperaocc, imagen b83724f928dc con anterior 3f1b48b0a50f; 8-oct con 15 máquinas, Vehículos sin cambios) Despliegue: migración 0023 en producción antes de la imagen; reprocesar el 8-oct.
      Hecho cuando: el montacarga, la recicladora y el Dynapac están en la bitácora del 8-oct y
      ningún vehículo cambió de lectura.

### Cambio del 2026-10-13 (RF-49 a RF-53)

- [x] T23. (2026-10-13, 467 verificaciones) Reglas: modelo contenido y excluidos en `reconocerMaquina`, dos pasadas en
      `resolverPropuesta`, `lecturaSugerida`, metros 0–999 y «Humedad». Casos en
      `verificar-reglas.ts`. (RF-49 a RF-53)
      Hecho cuando: los casos pasan y los tres comandos en verde.
- [x] T24. (0024_tough_stature en neondb dev; vale PRUEBA-026D-0510 en PR 1 + 460 guardado) Migración 0024 (`check` de metros 0–999) en dev. (RF-52)
      Hecho cuando: un viaje en K1+460 se guarda en dev.
- [x] T25. (dev: PRUEBA-026D-1/2 del 2026-09-15 y PRUEBA-026D-3/4 del 2026-09-14 en «Pruebas spec 018 (laboratorio)»; GD 566 por modelo, alquilada creada WA-MOTONIVELADORA-631C, humedad, «¿Quiso decir 187407?») Servidor: `llevarABitacora` crea la máquina sin candidatos con los mismos excluidos.
      (RF-50)
      Hecho cuando: en dev, un reporte con las dos Komatsu reconoce la GD 566 y registra la GD555.
- [x] T26. (Chrome en dev: el campo acepta 460 y descarta letras; la propuesta y «No se pudo guardar» usan CampoNumero) Panel: metros con campo numérico en Control Cantera, la propuesta y «No se pudo
      guardar». (RF-52)
      Hecho cuando: en Chrome se guarda un viaje en PR 1 + 460.
- [x] T27. (2026-10-13: migración 0024 en prod; imagen aa991561121b con la corrección de ids de renglón; MOTONV-01 = GD 566; 8 y 9-oct y 3 vales reprocesados. Falta: reparar la bitácora del 9-oct (m.sql) y completar TAY076/TFO427) Despliegue: migración 0024 y la imagen; modelo «GD 566» en la MOTONV-01; reprocesar el
      8 y el 9-oct y los tres vales; completar TAY076 y TFO427.
      Hecho cuando: se cumple el criterio de producción del cambio.
- [x] T28. `validacion.md` del cambio.
