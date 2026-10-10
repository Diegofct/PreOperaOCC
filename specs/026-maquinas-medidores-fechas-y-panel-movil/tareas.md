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

- [ ] T15. n8n: `tipo_equipo`, `marca` y `unidad_medidor` en el esquema y las instrucciones;
      prueba con el 8-oct en el PC.
      Hecho cuando: la IA da para cada equipo su tipo, su marca y «km» o «h», como en el reporte.
- [x] T16. (con la clasificación del 8-oct sin los campos nuevos de la IA: falta repetirla con créditos) Demo en dev: el 8-oct en una obra con equipos como los de producción.
      Hecho cuando: se cumple la demo de la spec.
- [~] T17. (2026-10-10: migración 0022, imagen y n8n desplegados; falta el reproceso del 8-oct, que espera créditos) Despliegue: migración 0022 en producción, imagen, n8n y reproceso del 8-oct.
      Hecho cuando: los vehículos de CONSORCIO MAGDALENA tienen sus lecturas, y lo que no cuadra
      quedó en «No se pudo guardar».
- [ ] T18. `validacion.md` RF por RF.
