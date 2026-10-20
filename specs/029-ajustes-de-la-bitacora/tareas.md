# Tareas — Spec 029

Tareas de menos de 30 minutos, ordenadas por dependencia. Cada una lleva los RF que
cubre y una línea `Hecho cuando:` que se pueda comprobar sin interpretar.

**Se implementa una tarea cada vez**, y al terminarla se para. Ninguna tarea se marca sin
`npm run verificar`, `npm run typecheck` y `npm run lint` en verde, mirando el código de
salida.

### Reglas

- [x] T1. Reglas puras de medidores y día por venir:
      - `lecturaAnterior` y `avisoDeLecturaInicial` en `jornada.ts`;
      - `completarIniciales` y `diaPorVenir` en `whatsapp-automatico.ts`;
      - sus casos en el verificador.
      (RF-1 a RF-5, RF-7, RF-9, RF-33)
      Hecho cuando el verificador cubre:
      - bitácora gana al vehículo;
      - vehículo del mismo día → `null`;
      - aviso con la inicial distinta, ayuda con origen cuando coincide, nada con la inicial vacía;
      - `completarIniciales` no pisa una inicial escrita y no llena sin final;
      - `diaPorVenir('2026-10-24', '2026-10-19')` es verdadero;
      - y los tres comandos en verde.
- [x] T2. Quitar de `bloqueosDelCierre` la observación por máquina y ajustar sus casos.
      (RF-15)
      Hecho cuando una máquina con lecturas y sin observaciones no produce bloqueos, los casos
      viejos esperan la lista sin esa línea, y los tres comandos en verde.
- [x] T3. `src/shared/rules/ensayos-de-obra.ts`: `ensayosDeLosPartes`, `textoDeUbicacion` y
      `filtrarEnsayosDeObra`, con sus casos. (RF-25 a RF-28)
      Hecho cuando el verificador cubre:
      - un material viejo no sale;
      - PR «PR 1 + 460», tramo «PR 0 + 070 a PR 0 + 150» y lugar;
      - orden por fecha descendente y hora;
      - filtros por ensayo y por cumple;
      - y los tres comandos en verde.

### Servidor

- [x] T4. `lecturasAnteriores(obraId, fecha)` en `bitacoras/servidor/lecturas.ts` y en el GET de
      `partes+api.ts` (solo partes abiertos); `ParteFila.lecturasAnteriores` en contratos.
      (RF-1, RF-2, RF-3, RF-9)
      Hecho cuando, en dev con dos bitácoras de prueba seguidas en «Pruebas spec 018
      (laboratorio)», el GET del segundo día trae la final del primero con `origen: 'bitacora'`;
      un equipo sin bitácora con lectura de un día anterior trae `origen: 'vehiculo'`;
      un parte cerrado trae `{}`; y los tres comandos en verde.
- [x] T5. WhatsApp: `completarIniciales` en `dias.ts` y `excepciones.ts`; `diaPorVenir` en
      `armarBitacora` y `llevarLoQueEspera`. (RF-7, RF-8, RF-33, RF-34)
      Hecho cuando, en dev:
      - `PRUEBA-029-T5-1`, con una máquina sin inicial, queda en la bitácora con la inicial = final del día anterior;
      - `PRUEBA-029-T5-2`, con fecha futura, no crea fila en `whatsapp_dias` y deja la falta de fecha en «No se pudo guardar»;
      - y los tres comandos en verde.
- [x] T6. `GET /api/panel/laboratorio/ensayos-de-obra` y `api.laboratorio.ensayosDeObra`.
      (RF-25, RF-26, RF-28, RF-32)
      Hecho cuando, con curl y sesión de dev:
      - el periodo de las bitácoras de prueba devuelve sus ensayos en orden;
      - el periodo al revés → 400;
      - una obra con Laboratorio apagado no sale;
      - y los tres comandos en verde.

### Panel

- [x] T7. `CampoObservacion` y `renglones` en `componentes.tsx`; `altoObservacion` en medidas.
      (RF-10 a RF-14, RF-16, RF-18)
      Hecho cuando el componente compila y se usa en una sección (T8), y los tres comandos en verde.
- [x] T8. Maquinaria: `CampoObservacion`, inicial sugerida al añadir, aviso y origen; quitar el
      «hace falta para cerrar». (RF-1, RF-4 a RF-6, RF-9, RF-10 a RF-15)
      Hecho cuando, en Chrome (dev):
      - añadir PRUEBA-026-REC el segundo día llena la inicial con «Final del …»;
      - cambiarla muestra el aviso;
      - sin observación se lee «Sin observación» y se cierra la bitácora de prueba;
      - y los tres comandos en verde.
- [x] T9. Personal sin entrada ni salida, con `CampoObservacion`. Las filas viejas muestran su
      registro anterior en solo lectura. (RF-19 a RF-23)
      Hecho cuando, en Chrome (dev):
      - una persona nueva solo ofrece L, ED, EN, novedad y la casilla;
      - sin L ni novedad no se guarda y se explica;
      - una fila de prueba con entrada y salida se ve en solo lectura con su desglose;
      - y los tres comandos en verde.
- [x] T10. Actividades y Control de calidad con `CampoObservacion`. En el ensayo sin resultado
      ni cumple, la casilla queda fija. (RF-10 a RF-14, RF-16 a RF-18)
      Hecho cuando, en Chrome (dev), en las dos secciones la casilla abre y cierra el campo de
      3 renglones, alineado con los demás; el ensayo sin resultado la trae marcada y sin poder
      desmarcar; la bitácora cerrada muestra «Sin observación»; a 390 px no hay desplazamiento
      horizontal; y los tres comandos en verde.
- [x] T11. Laboratorio con pestañas; «Ensayos de obra» con filtros, paginación de 15 y «Ver
      bitácora». (RF-24, RF-27 a RF-31)
      Hecho cuando, en Chrome (dev):
      - Laboratorio muestra las dos pestañas;
      - «Ensayos de obra» lista los ensayos de las bitácoras de prueba de los últimos 7 días;
      - filtrar «No cumple» deja solo esos;
      - «Ver bitácora» abre ese día;
      - corregir un ensayo en la bitácora se ve al volver;
      - y los tres comandos en verde.

### Cierre

- [x] T12. Despliegue en producción: imagen nueva (con respaldo `preoperaocc:anterior`); borrar
      el día 24-oct mal armado con permiso del usuario; revisar que «Laboratorio» esté activo en
      CONSORCIO MAGDALENA o avisar a gerencia. (RF-33)
      Hecho cuando producción responde con la imagen nueva, `whatsapp_dias` no tiene fechas
      posteriores a hoy, y la bitácora del 16-oct se ve con las casillas.
- [x] T13. Validación final: recorrido RF por RF en `validacion.md` + demo. (Todos)
      Hecho cuando cada RF tiene su comprobación con resultado, los tres comandos están en verde
      y la spec queda marcada como Cumplida.

## Notas de ejecución

- T1 (2026-10-19): `lecturaAnterior`, `diaCorto` y `avisoDeLecturaInicial` en `jornada.ts`; `diaPorVenir` y
  `completarIniciales` en `whatsapp-automatico.ts`. 6 casos nuevos (484 verificaciones), los tres comandos en verde.
- T2 (2026-10-19): `bloqueosDelCierre` ya no pide observaciones por máquina. El caso viejo pasó a
  «029/RF-15» y los otros dos usan «Falta la lectura final» como ejemplo de bloqueo; 484 verificaciones.
  Quedan en el panel dos textos «hace falta para cerrar» (Maquinaria y un comentario de Personal): van en la T8.
- T3 (2026-10-19): `ensayos-de-obra.ts` con tipos propios por su forma (las reglas no importan de
  `features/`), la abscisa con `formatearAbscisa` de cantera («PR 1 + 460»), los ensayos sin hora al final
  del día y un filtro extra «Sin dato» para los que no dicen si cumplen. 487 verificaciones.
- T4 (2026-10-19): `bitacoras/servidor/lecturas.ts` + GET de `partes+api.ts` (solo partes abiertos) +
  `ParteFila.lecturasAnteriores`. Probado llamando la función contra neondb (dev), obra «Pruebas spec 018
  (laboratorio)», sin crear datos:
  - día 9-oct: 21 equipos, todos con `origen: 'bitacora'`; PRUEBA-026-REC trae 449 del 8-oct y no la del
    vehículo (452.5, del mismo 9-oct);
  - día 30-sep: PRUEBA-EXO-01 trae 3500 h del 28-sep con `origen: 'vehiculo'` (no tiene bitácora antes);
  - 9-oct responde en ~400 ms.
  La respuesta HTTP del GET (y el `{}` de un parte cerrado) se mira en Chrome en la T8, con la sesión del
  panel: no se creó una sesión por script.
- T5 (2026-10-19):
  - `completarIniciales` corre en `llevarABitacora` (`dias.ts`) y al completar un renglón de maquinaria en
    «No se pudo guardar» (`excepciones.ts`).
  - El día por venir se corta en `armarBitacora` y en `actualizarDia` (que cubre `llevarLoQueEspera` y las
    fotos). Sus mensajes no pasan por `llevarABitacora`, porque esa crea personas y máquinas antes de mirar
    la fecha: `apartarLoQueEsperaPorVenir` los aparta con la sección `fecha` y los marca llevados, como se
    hace con una bitácora cerrada.
  - Probado en neondb (dev) llamando el POST de la integración con el token de dev, sin imprimirlo, grupo
    `prueba-t19@g.us`:
    - PRUEBA-029-T5-1 (9-oct, recicladora solo con final 455) → en la bitácora del 9-oct de «Pruebas spec
      018 (laboratorio)» con inicial 449, la final del 8-oct;
    - PRUEBA-029-T5-2 (fecha 25-oct) → sin fila en `whatsapp_dias` para fechas futuras, excepción `fecha`
      pendiente «El día del reporte no puede ser posterior a hoy.», y ninguna máquina creada.
  - Quedan en dev: los dos mensajes, la fila de PRUEBA-026-REC en la bitácora del 9-oct, y su horómetro en
    Vehículos subido de 452.5 a 455.
- T6 (2026-10-19): ruta `ensayos-de-obra+api.ts`, `EnsayoDeObraFila` (con `obraCodigo`, para la columna de la
  gerencia) y `api.laboratorio.ensayosDeObra`. Probado en neondb (dev) llamando el GET con una sesión
  temporal de gerencia (Diego) de 15 min, borrada al terminar:
  - 1-sep a 19-oct → 200 con los 15 ensayos de PRUEBA-018, en orden, en ~420 ms;
  - quedan fuera los 2 de OBR-001 y los 2 de PRUEBA-016, que tienen Laboratorio apagado;
  - con `obraId` → los mismos 15;
  - al revés, sin fechas o más de un año → 400 con su mensaje;
  - sin sesión → 401.
- T7 (2026-10-19):
  - `CampoObservacion` en `componentes.tsx`, con `ANCHO_OBSERVACION = 360` y `useAnchoDeCampo`: a menos
    de 768 px ocupa el renglón entero.
  - En vez de `renglones`, `Campo` lleva una opción `compacto` (3 renglones y `CampoPanel.altoObservacion = 83`).
    Hoy solo hacen falta dos tamaños, y un booleano no deja pedir alturas que nadie diseñó.
  - Al desmarcar, el texto se recuerda en una referencia y vuelve si se marca otra vez. Lo que se guarda
    es el campo vacío (RF-14).
  - Solo lectura: el texto en un campo de solo lectura, o la etiqueta con «Sin observación».
  - Se ve en pantalla desde la T8.
- T8 (2026-10-19): Maquinaria con `CampoObservacion` («Observaciones del día»), la inicial sugerida al
  añadir, la ayuda de origen y el aviso en su renglón; ya no dice «Hace falta para cerrar».
  Probado en Chrome (dev :8081, gerencia Diego), bitácora del 9-oct de «Pruebas spec 018 (laboratorio)»:
  - el GET trae `lecturasAnteriores`: PRUEBA-026-REC muestra 449 con «Final del 8-oct» (cubre lo
    pendiente de la T4);
  - añadir WA-LPN264 llena 756 con «Final del 8-oct»;
  - escribir 760 muestra «No coincide con la final del día anterior (756, 8-oct).»;
  - la casilla abre el campo de 3 renglones bajo las lecturas; desmarcar deja «Sin observación» y volver
    a marcar devuelve el texto;
  - guardado con final 790 y recargado: 760→790, «30 km recorridos», la casilla abre marcada con su
    texto (RF-13);
  - en la del 4-oct (cerrada), la observación se ve en solo lectura, sin casilla;
  - en la del 9-oct, «Falta cerrar» no pide la observación de PRUEBA-026-REC, que no la tiene (RF-15).
    No se cerró: le faltan otras secciones.
  - Queda en dev la fila WA-LPN264 760→790 con la observación «PRUEBA 029: …» en la bitácora del 9-oct.
- T9 (2026-10-19):
  - Personal sin los `SelectorDeHora`. Una fila vieja con entrada y salida muestra «Entrada y salida
    (registro anterior)» en solo lectura y las conserva al guardar. La observación pasa a `CampoObservacion`.
  - De paso, el mensaje de `sin_horas` pasa a «Escriba sus horas laboradas (L) o su novedad.», porque ya
    no se puede escribir la entrada ni la salida (RF-21).
  - `personalDelParte` valida después de leer los nombres y antepone el de la persona («Conductor Prueba: …»).
  - Se ajustaron 2 textos del verificador.
  - Probado en Chrome (dev), bitácora del 3-oct de «Pruebas spec 018 (laboratorio)»:
    - la fila vieja de Natalia Riaño muestra «07:00 a 18:00» y «11 h trabajadas, 4 h 30 min ordinarias,
      6 h 30 min extra»;
    - las filas nuevas solo tienen L, ED, EN, Novedad y la casilla;
    - añadir «Conductor Prueba» sin nada y guardar → «Conductor Prueba: Escriba sus horas laboradas (L) o
      su novedad.»;
    - no se guardó: se recargó y la bitácora quedó como estaba.
- T10 (2026-10-19):
  - Actividades (las editables y las heredadas) y Control de calidad con `CampoObservacion`.
  - En el ensayo, `obligatoria` = sin resultado y sin «cumple». La ayuda de obligatoria sale solo en ese caso.
  - Probado en Chrome (dev), bitácora del 3-oct:
    - la casilla de la actividad queda en el renglón de volumen y cantidad;
    - el ensayo de densidad sin resultado muestra la casilla marcada y deshabilitada, «Observación *» y la ayuda;
    - al elegir «Cumple» la casilla se libera y se quitan el asterisco y la ayuda (no se guardó);
    - a 390 px (iframe, la ventana no se redimensiona) la bitácora del 9-oct mide 390 de ancho, sin
      desplazamiento horizontal, y la casilla y el campo ocupan el renglón entero.
  - La vista cerrada se vio en la T8 (4-oct).
- T11 (2026-10-19):
  - Laboratorio con pestañas «Granulometrías» y «Ensayos de obra», con el patrón de la bandeja
    (`Boton` primario/secundario). La sección de granulometrías pasó a llamarse «Granulometrías».
  - `src/features/laboratorio/ensayos-de-obra.tsx` tiene el periodo (7 días por defecto), la obra para la
    gerencia, los filtros por ensayo (los del periodo) y por ¿Cumple? (Cumple / No cumple / Sin dato),
    las páginas de 15 y «Ver bitácora».
  - `filtrarEnsayosDeObra` pasó a ser genérico para conservar el tipo de la fila.
  - Probado en Chrome (dev, gerencia):
    - los 7 días por defecto (13 al 19-oct) dicen «Las bitácoras de este periodo no tienen ensayos.»;
    - desde el 1-oct salen los ensayos de PRUEBA-018 con ubicación, edad, resultado, cumple de color,
      responsable y «WhatsApp»;
    - «No cumple» deja 6;
    - «Ver bitácora» abre la del 3-oct;
    - se puso «Cumple» a la densidad del 3-oct en la bitácora y se guardó, y la ruta la devuelve con
      `cumple=si` (RF-31);
    - la columna de fecha pasó de 100 a 115 para que no se parta.
  - Queda en dev: la densidad del 3-oct con «Cumple».
- T12 (2026-10-19, en curso, con permiso del usuario):
  - `scripts/migrar-produccion.ts` → «Listo», sin migraciones nuevas (27 archivos, los mismos).
  - Borrada en prod la fila de `whatsapp_dias` del 2026-10-24 (obra 01a0ba04…, «armada», sin
    parte); quedan 0 días futuros.
  - Laboratorio ya estaba activo en CONSORCIO MAGDALENA (prod).
  - Con Docker Desktop abierto:
    - `preoperaocc:anterior` = `552acd50f1d6`;
    - build → `c7b71f1b4bae`, transferida y encendida con `up -d`, healthy;
    - el vecino y el panel responden 200.
  - Producción, bitácora del 16-oct de CONSORCIO MAGDALENA:
    - 60 casillas, 59 «Sin observación»;
    - las iniciales con «Final del 15-oct» y sin avisos;
    - sin entrada ni salida en Personal.
  - `ensayos-de-obra` del 7 al 19-oct → 200, 23 ensayos.
  - La captura de pantalla de Chrome no respondía en la página de producción (36 personas y 20 máquinas):
    se revisó con JavaScript sobre la página ya cargada.
  - Registro en `C:/dev/n8n-evolutionapi/DESPLIEGUE_VPS.md`.
- T13 (2026-10-19): `validacion.md` con RF-1 a RF-34 en verde. Se probó en vivo RF-14 (desmarcar y
  guardar deja `observaciones = ""`): el primer intento no guardó porque el clic por referencia de
  Chrome no activa el botón, y con clic por coordenadas sí. Spec marcada como Cumplida.
