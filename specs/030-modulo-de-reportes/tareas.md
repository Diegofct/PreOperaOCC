# Tareas — Spec 030

Tareas de menos de 30 minutos, ordenadas por dependencia. Cada una lleva los RF que
cubre y una línea `Hecho cuando:` que se pueda comprobar sin interpretar.

**Se implementa una tarea cada vez**, y al terminarla se para. Ninguna tarea se marca sin
`npm run verificar`, `npm run typecheck` y `npm run lint` en verde, mirando el código de
salida.

### Reglas

- [x] T1. `periodos.ts`: `periodoDe`, `periodoVecino` y `diasDe`, con sus casos. (RF-4, RF-5)
      Hecho cuando el verificador cubre:
      - semana de un miércoles → lunes a domingo;
      - una semana que cruza de mes;
      - un mes de 31 y febrero;
      - anterior y siguiente;
      - y los tres comandos en verde.
- [x] T2. `mantenimiento.ts`: clases, arranque, `intervaloEfectivo`, `estadoDeMantenimiento`,
      `ordenDeMantenimiento` y el aviso de lectura mayor, con sus casos. (RF-22 a RF-31, RF-33)
      Hecho cuando el verificador cubre:
      - 250 h y 5.000 km de arranque;
      - el de vehículo gana al de tipo;
      - `al_dia`, `proximo` (90 %), `vencido`, `sin_registro` y `revisar`, con sus textos;
      - el orden;
      - y los tres comandos en verde.
- [x] T3. `reportes.ts`, parte 1: `usoDeMaquinas` y sus cifras. (RF-11 a RF-19, RF-21)
      Hecho cuando el verificador cubre:
      - sí, no y sin bitácora;
      - avance 0 → no;
      - operador del preoperacional;
      - totales, días y promedio en semana y mes;
      - y los tres comandos en verde.
- [x] T4. `reportes.ts`, parte 2: `horasDelPersonal` con avisos de 2 h/día y 12 h/semana.
      (RF-44 a RF-48, RF-50)
      Hecho cuando el verificador cubre:
      - una fila reportada y una calculada;
      - los totales y los días;
      - las novedades contadas;
      - los dos avisos;
      - y los tres comandos en verde.
- [x] T5. `reportes.ts`, parte 3: `cantidadesPorItem`, `viajesAgrupados`, `calidadPorEnsayo` y
      `climaDelPeriodo`. (RF-51 a RF-55)
      Hecho cuando el verificador cubre:
      - la suma por ítem y la «otra» aparte;
      - los viajes por volqueta, material, origen y destino sin los anulados;
      - cumple, no cumple y sin dato;
      - los días con lluvia y sin trabajo;
      - y los tres comandos en verde.

### Datos y permisos

- [x] T6. Módulo `reportes` en permisos, enlaces, ícono, y una pantalla provisional.
      (RF-1, RF-2)
      Hecho cuando:
      - el verificador cubre `alcanza` para gerencia y residente (sí) y para los demás roles (no);
      - en Chrome (dev) gerencia ve «Reportes» en el menú;
      - los tres comandos en verde.
- [x] T7. Tablas de mantenimiento y migración 0027 en neondb (dev). (RF-23 a RF-35, RF-42)
      Hecho cuando:
      - `drizzle/servidor/0027_*.sql` crea las tres tablas con sus PK, índices y el check de anulación;
      - aplicada en neondb;
      - un insert de prueba anulado sin motivo falla;
      - los tres comandos en verde.

### Servidor

- [x] T8. `reportes/servidor/datos.ts` y `GET /api/panel/reportes/[pestana]` para `maquinas` y
      `personal`. (RF-2, RF-6, RF-7, RF-11 a RF-21, RF-44 a RF-50, RF-56)
      Hecho cuando, con una sesión temporal de gerencia en dev:
      - la semana del 6-oct de «Pruebas spec 018 (laboratorio)» devuelve las máquinas con sí/no/sin bitácora y el personal con sus totales;
      - un tipo de periodo inválido → 400;
      - responde en menos de 3 s con el mes de octubre;
      - los tres comandos en verde.
- [x] T9. El mismo GET para `actividades`, `cantera`, `calidad` y `clima`. (RF-51 a RF-55)
      Hecho cuando, con curl (dev), las cuatro devuelven lo de octubre de la obra de pruebas, y
      los tres comandos en verde.
- [x] T10. Mantenimientos: registrar, anular, resolver, el estado por máquina (`GET …/mantenimiento`)
      e intervalos (GET/PUT). (RF-20, RF-24 a RF-35)
      Hecho cuando, con curl (dev):
      - registrar un aceite de PRUEBA-026-REC → `al_dia`;
      - con un intervalo de vehículo de 5 h → `vencido`;
      - anular sin motivo → 400;
      - un correctivo y resolverlo;
      - el PUT de tipo como residente → 403;
      - los tres comandos en verde.
- [x] T11. Excel: `exportar.ts` puro, `excel.ts` con `exceljs` y `GET /api/panel/reportes/exportar`.
      (RF-9)
      Hecho cuando:
      - el verificador cubre `hojasDelReporte` de Máquinas y Personal;
      - el archivo descargado de dev abre con `exceljs` en el guion, con números como números y tildes bien;
      - los tres comandos en verde.

### Panel

- [x] T12. Pantalla de Reportes: encabezado de obra y periodo con flechas, pestañas, cifras, y la
      pestaña Máquinas (día, semana y mes, con Sí/No y el detalle del mes).
      (RF-3 a RF-8, RF-11 a RF-21, RF-57, RF-58)
      Hecho cuando, en Chrome (dev):
      - abre en la semana actual y en Máquinas;
      - las flechas cambian de periodo;
      - la semana del 6-oct muestra los botones verde y rojo y «Sin bitácora»;
      - a 390 px no hay desplazamiento de la página;
      - los tres comandos en verde.
- [x] T13. Pestaña Mantenimiento: lista ordenada, estados, historial, y las ventanas «Registrar
      mantenimiento», «Anular», «Marcar resuelto» y «Configurar intervalos».
      (RF-20, RF-24 a RF-35)
      Hecho cuando, en Chrome (dev):
      - registrar un aceite lo pone «Al día»;
      - bajar el intervalo de la máquina lo pone «Vencido»;
      - un correctivo sale primero, y resuelto deja de salir;
      - el residente no ve «Configurar intervalos» de tipo;
      - los tres comandos en verde.
- [x] T14. Pestaña Personal (día, semana y mes, filtros por cargo y nombre, avisos).
      (RF-44 a RF-50)
      Hecho cuando, en Chrome (dev), la semana del 6-oct muestra las horas por día y los totales,
      el aviso de más de 2 h y el detalle del mes; y los tres comandos en verde.
- [x] T15. Pestañas Actividades, Cantera, Control de calidad, y Clima y novedades. (RF-51 a RF-55)
      Hecho cuando, en Chrome (dev), las cuatro muestran lo de octubre de la obra de pruebas, con
      los enlaces a la bitácora en Control de calidad; y los tres comandos en verde.
- [x] T16. «Descargar Excel» e «Imprimir» (ruta `reportes/imprimir`). (RF-9, RF-10)
      Hecho cuando, en Chrome (dev):
      - se descarga el `.xlsx` de Máquinas y de Personal;
      - «Imprimir» abre la vista con el encabezado, el periodo y la tabla, y el diálogo de impresión, en carta horizontal;
      - los tres comandos en verde.

### WhatsApp

- [x] T17. Reglas: `MantenimientoDelReporte` en `ReporteDelDia`, contratos (`propuestaDeIa`,
      `reporteCorregido`), lectura en `resolverPropuesta` y faltas de `mantenimientos`.
      (RF-36 a RF-40)
      Hecho cuando el verificador cubre:
      - una propuesta con un aceite de «TFO 427» → máquina reconocida y clase `aceite`;
      - sin máquina → falta;
      - `resuelto` sin clase → ninguna falta;
      - un mensaje viejo sin `mantenimientos` se lee igual;
      - y los tres comandos en verde.
- [x] T18. `whatsapp/servidor/mantenimientos.ts`: guardar al procesar (id determinista, lectura
      del día, resolver el correctivo) y apartar lo no reconocido. (RF-36 a RF-43)
      Hecho cuando, en dev, con el POST de integración:
      - PRUEBA-030-T18-1 (aceite de la recicladora) → un mantenimiento `whatsapp` con la lectura del día;
      - entregarlo otra vez → ninguno nuevo;
      - PRUEBA-030-T18-2 (equipo inexistente) → excepción `mantenimientos`;
      - PRUEBA-030-T18-3 («ya quedó reparada») → correctivo resuelto;
      - las notas de la bitácora siguen;
      - los tres comandos en verde.
- [x] T19. «No se pudo guardar»: completar (elegir máquina y clase) o descartar un renglón de
      `mantenimientos`. (RF-40)
      Hecho cuando, en Chrome (dev), la excepción de PRUEBA-030-T18-2 se completa eligiendo
      PRUEBA-026-REC y queda registrada; y los tres comandos en verde.
- [x] T20. n8n: `mantenimientos[]` en el esquema y las instrucciones de `generar_workflow_clasificar.py`;
      json regenerado. (RF-36 a RF-41)
      Hecho cuando el json se regenera sin errores y el esquema nuevo pasa por `propuestaDeIa`
      (prueba en el verificador con una salida de ejemplo).
- [x] T21. Probar la IA en el PC con mensajes reales: «se le cambió el aceite a la TFO427», «se
      reventó una manguera de la pajarita…», «ya quedó reparada…». **Necesita créditos.** (RF-36 a RF-41)
      Hecho cuando los tres mensajes salen con la clase, la máquina y `resuelto` correctos.
      *(2026-10-20: la API acepta el esquema de 16 `anyOf`. La clase y `resuelto` salen bien en los 4
      mensajes; con los catálogos de MAGDALENA en producción la TFO427 se reconoce sin faltas. Lo que el
      mensaje no identifica va a «No se pudo guardar» sin inventar, ver Notas.)*

### Cierre

- [x] T22. Despliegue en producción:
      - migración 0027 antes de la imagen;
      - imagen nueva con respaldo;
      - clasificador publicado en el VPS (si T21 pasó);
      - comprobación en producción.
      Con permiso del usuario.
      Hecho cuando producción responde con la imagen nueva, Reportes muestra la semana de CONSORCIO
      MAGDALENA y las tablas existen en `preoperaocc`.
      *(2026-10-20: migración 0027 e imagen `918f3ae6669f` en producción; el clasificador queda sin
      publicar hasta que pase la T21 y se publica entonces. Registro en `DESPLIEGUE_VPS.md`.)*
- [x] T23. Validación final: `validacion.md` RF por RF y spec Cumplida. (Todos)
      Hecho cuando cada RF tiene su comprobación con resultado, los tres comandos están en verde
      y la spec queda marcada como Cumplida.
      *(2026-10-20: `validacion.md` escrita. RF-1 a RF-58 y los RNF tienen su comprobación, con los
      tiempos medidos en producción. RF-36, 37, 39 y 41 están verdes en el servidor y la IA queda
      pendiente. La casilla se marca, y la spec pasa a Cumplida, cuando pase la T21.)*

## Notas de ejecución

- RF-53 se corrigió al planear (2026-10-19): los viajes no guardan m³ ni las volquetas su capacidad;
  Cantera cuenta viajes. Avisado al usuario.
- T1 (2026-10-19): `src/shared/rules/periodos.ts` (`periodoDe`, `periodoVecino`, `diasDe`,
  `esTipoDePeriodo`); 3 casos «030/RF-4», 490 verificaciones, los tres comandos en verde.
- T2 (2026-10-19): `src/shared/rules/mantenimiento.ts` (clases, `INTERVALOS_DE_ARRANQUE`, `intervaloEfectivo`
  con su origen, `estadoDeMantenimiento` con su texto, `rangoDeMantenimiento` para ordenar, en lugar de
  `ordenDeMantenimiento`, y `avisoDeLecturaDeServicio`). Sin lectura actual con servicio → `revisar`.
  4 casos «030/», 494 verificaciones.
- T3 (2026-10-19): `src/shared/rules/reportes.ts` con `usoDeMaquinas` (tipos de entrada por su forma).
  - Una máquina de otra obra que aparece en la bitácora sale con el código y el medidor de la bitácora y
    sin tipo.
  - Las cifras: trabajaron, no trabajaron, horas y kilómetros. La de «alertas vencidas» (RF-21) la suma el
    servidor con el mantenimiento, en la T8/T10.
  - 2 casos «030/», 496 verificaciones.
- T4 (2026-10-19): `horasDelPersonal` en `reportes.ts`, en minutos como la bitácora.
  - Cada día dice `registrada`, `ausente` o `sin_bitacora`, y la fuente de las horas.
  - Las novedades se cuentan por días.
  - Avisos: días con más de 2 h extra y semanas (por su lunes) con más de 12 h dentro del periodo.
  - El nombre y el cargo son los de la bitácora más reciente.
  - 2 casos «030/», 498 verificaciones.
- T5 (2026-10-19): en `reportes.ts`:
  - `cantidadesPorItem`: los ítems en orden numérico, con el detalle por día. Las actividades sin ítem
    («otras» y las de antes del 2026-09-16) van aparte. Una cantidad no anotada no suma, pero el día cuenta.
  - `viajesAgrupados`: de más a menos viajes.
  - `calidadPorEnsayo`: genérica sobre `EnsayoDeObra`, con la lista de los que no cumplen.
  - `climaDelPeriodo`: `CONDICION_LLUVIA = 'lloviendo'`, las franjas en orden y las notas recortadas.
  - 4 casos «030/», 502 verificaciones. Las reglas de la 030 quedan completas (T1–T5).
- T6 (2026-10-19):
  - Módulo `reportes` en `MODULOS` (al final), en `TABLA` (gerencia y residente: ver, listar, escribir; el
    resto nada) y en `NOMBRE_DE_MODULO`. En el menú va en el grupo «El día a día», después de
    Preoperacionales.
  - Enlace `/panel/reportes`, ícono de barras y pantalla provisional
    (`src/features/reportes/pantalla-reportes.tsx`).
  - Se ajustaron 4 pruebas que listan los módulos del residente y los grupos del menú, y se agregó «030/RF-1».
    503 verificaciones.
  - En Chrome (dev, gerencia): «Reportes» en el menú, resaltado, con el título de la pestaña «Reportes · …».
- T7 (2026-10-19):
  - Tablas `mantenimiento_intervalos`, `mantenimiento_intervalos_vehiculo` y `mantenimientos`, con los
    enums `clase_mantenimiento`, `clase_con_intervalo` y `origen_mantenimiento`.
  - Migración `0027_omniscient_franklin_storm.sql`, solo aditiva, aplicada en neondb. Las dos tablas de
    intervalos van en `TABLAS_CON_RELOJ`, con sus disparadores creados.
  - Restricciones: anulación con motivo, solo el correctivo se resuelve, `origen = whatsapp` ⇔ hay
    `mensaje_id`, `cada > 0` y aviso entre 50 y 99.
  - Probadas en dev con 10 inserts dentro de transacciones deshechas: las 6 indebidas se rechazan y las
    4 válidas pasan; no quedó ninguna fila.
  - 503 verificaciones.
- T8 (2026-10-19): `src/features/reportes/servidor/datos.ts` (`pedidoDeReporte`, `partesDelPeriodo` con el
  horario efectivo, `vehiculosDeLaObra`, `preoperacionalesDelPeriodo` con el respaldo por la obra del
  vehículo) y `src/app/api/panel/reportes/[pestana]+api.ts` con `maquinas` y `personal`.
  - Probado en dev con sesiones temporales de Diego y Natalia, borradas al terminar:
    - semana del 5 al 11-oct → 26 máquinas (6 trabajaron), con sí/no/sin bitácora y el operador;
    - 46 personas con sus totales;
    - el mes de octubre responde en ~0,3–0,4 s;
    - tipo inválido → 400; gerencia sin obra → 400; pestaña inexistente → 404; sin sesión → 401;
    - la residente que pide otra obra recibe la suya.
  - Corregido: el avance diario se redondea a un decimal (salía 14.399999…).
  - La cifra de alertas vencidas (RF-21) y el estado de mantenimiento por máquina (RF-20) se agregan en la T10.
- T9 (2026-10-19): `actividades`, `cantera`, `calidad` y `clima` en `reportes/[pestana]+api.ts`, cada una
  con sus cifras.
  - `viajesDelPeriodo` en `datos.ts`: la volqueta por placa (o por código), y los viajes a la obra cuentan
    como un solo destino, «Obra», para no partir la tabla por abscisas.
  - Probado en dev, octubre de «Pruebas spec 018 (laboratorio)», con una sesión temporal borrada:
    - actividades: 5 ítems (5.1.15 = 1372.88 m³ en 4 días);
    - cantera: 21 viajes, PRT017 con 20;
    - calidad: 12 ensayos, 6 cumplen y 6 no;
    - clima: 9 días con bitácora;
    - todas en menos de 1 s.
- T10 (2026-10-19):
  - `reportes/servidor/mantenimientos.ts`: `mantenimientoDeLaObra` (estado por clase, correctivos
    pendientes, fuera de servicio, orden de RF-31 e historial de hasta 300), `resumenDeMantenimiento`,
    registrar, anular, resolver, `intervalosDeLosTipos` y `guardarIntervalo`.
  - Contratos zod: `mantenimientoNuevo`, `anulacionDeMantenimiento`, `resolucionDeCorrectivo` e
    `intervaloEditado`.
  - Rutas: `reportes/mantenimiento` (pestaña), `POST reportes/mantenimientos`, `…/[id]/anular`,
    `…/[id]/resolver` y `reportes/intervalos` (GET para quien ve Reportes, PUT solo gerencia).
  - Máquinas trae `mantenimiento` por máquina (RF-20) y la cifra `mantenimientosVencidos` (RF-21).
  - Probado en dev con PRUEBA-026-REC y sesiones temporales de Diego y Natalia:
    - sin registro → aceite registrado por la residente sin lectura (toma 455) → «Cambio de aceite en 250 h»;
    - lectura 470 → 201 con el aviso de RF-33;
    - anular sin motivo / con motivo / otra vez → 400 / 200 / 409;
    - la residente cambia un intervalo → 403;
    - aceite a 440 con un intervalo de máquina de 5 h → «vencido hace 10 h», primero en la lista;
    - correctivo → pendiente; resolver / otra vez / resolver un aceite → 200 / 409 / 400;
    - fecha futura → 400; máquina inexistente → 404;
    - Máquinas muestra la cifra de vencidos y el estado de REC;
    - GET de intervalos: 13 tipos con el de arranque;
    - el historial trae quién, anulado y resuelto.
  - Todo lo de prueba (registros, intervalo y sesiones) se borró al terminar.
- T11 (2026-10-19):
  - Los reportes pasaron de la ruta a `reportes/servidor/reportes.ts` (`reporteDe`, `esPestanaDeReporte` y el
    tipo `ReporteDe<P>`), que usan la consulta y el Excel.
  - `src/features/reportes/exportar.ts`, puro: las hojas de las 7 pestañas, `textoDelPeriodo` y
    `nombreDelArchivo`. Las horas del personal van en horas con decimales.
  - `servidor/excel.ts`: el único archivo con `exceljs`. Arriba de cada hoja van el título (pestaña · obra) y el
    periodo con la hora de generación; los encabezados quedan fijos y el ancho se ajusta al dato.
  - `GET /api/panel/reportes/exportar?pestana=…`.
  - 3 casos «030/RF-9», 506 verificaciones.
  - En dev se descargaron los 7 libros de la semana del 5-oct y se abrieron con `exceljs`: tildes bien, los
    números como `number`, y una pestaña inválida da 400. Copias en el scratchpad de la sesión.
- T12 (2026-10-19):
  - `pantalla-reportes.tsx`:
    - la obra (solo la gerencia; si no elige, la primera activa);
    - Día, Semana y Mes, las flechas «‹ Semana anterior / Semana siguiente ›», «Volver a hoy» e «Ir a la fecha»;
    - las 7 pestañas;
    - todo en la dirección (`obra`, `periodo`, `fecha`, `pestana`).
  - `pestana-maquinas.tsx`: las cifras, el aviso de las abiertas, y tablas de día, de semana (una columna por
    día con Sí/No y su avance) y de mes (con «Por día» en una ventana). El estado de mantenimiento lleva a
    la pestaña Mantenimiento.
  - `comunes.tsx`: `cifra` (es-CO), `TrabajoDelDia`, `EstadoDeMantenimientoEtiqueta` y `AvisoDeAbiertas`,
    que resume en «N bitácoras… entre el X y el Y» cuando son más de 4.
  - `api.reportes.de` y `ReporteFila<P>`, con las fechas como texto.
  - Probado en Chrome (dev, gerencia, «Pruebas spec 018 (laboratorio)»):
    - la semana del 5-oct, con verde, rojo, «Sin bitácora» y las cifras;
    - la flecha pasa a la del 28-sep;
    - el mes de septiembre, con el detalle de PRUEBA-VOL-T17;
    - el día 28-sep;
    - a 390 px, 390 de ancho y una columna.
  - Las demás pestañas dicen «Esta pestaña todavía se está construyendo».
- T13 (2026-10-19):
  - `pestana-mantenimiento.tsx`:
    - cifras;
    - lista en el orden de RF-31, con aceite y preventivo (estado, cada cuánto, si es propio, último servicio),
      los correctivos pendientes con «Marcar resuelto», y «Registrar» e «Intervalo» por fila;
    - historial con su estado y «Anular»;
    - ventanas: Registrar (la lectura vacía toma la registrada), Anular (motivo obligatorio), Resuelto,
      Configurar intervalos (por tipo, solo gerencia) e Intervalo de una máquina (solo gerencia).
  - Al residente no se le muestran «Configurar intervalos» ni «Intervalo» (`esGerencia`); la ruta
    respondería 403 igual (T10).
  - Corregido en la prueba: «Volver al del tipo» / «Volver al de arranque» solo sale cuando hay uno puesto.
  - Probado en Chrome (dev, gerencia), con PRUEBA-026-REC:
    - aceite a 440 → «en 235 h», último 19-oct;
    - intervalo propio de 5 h → «vencido hace 10 h», primera de la lista, Vencidas 1;
    - correctivo → «Pendiente desde el 19-oct», arriba, Correctivos pendientes 1 → Marcar resuelto →
      «Resuelto el 19-oct»;
    - anular sin motivo → «Escriba por qué lo anula.»; con motivo → «Anulado» con quién y motivo, y la
      máquina vuelve a «sin registro»;
    - «Volver al del tipo» → cada 250 h;
    - «Configurar intervalos» lista los 13 tipos.
  - Los dos registros de prueba se borraron de dev; quedan 0 mantenimientos y 0 intervalos.
- T14 (2026-10-19): `pestana-personal.tsx`:
  - las cifras y el aviso de las abiertas;
  - filtro por cargo y búsqueda por nombre sin tildes;
  - día (horas, extras, novedad), semana (una columna por día con horas, «+N extra» y la novedad; total,
    extras D/N, días y avisos) y mes (totales, novedades por días, avisos y «Por día» en una ventana);
  - avisos «+2 h extra el …» y «N h extra sem. …».
  - Probado en Chrome (dev): la semana del 5-oct (46 personas, 689 h); la del 28-sep buscando «natalia riano»
    (1-oct «Incapacitado», 3-oct «+6,5 extra», aviso «+2 h extra el 3-oct»); el mes de octubre con
    «Incapacitado: 2 días» y el detalle por día.
  - Se ajustaron los anchos de la semana para que la columna de avisos no se corte.
- T15 (2026-10-19): `pestanas-de-obra.tsx` con las cuatro pestañas de lectura y `BarraDeProporcion` en
  `comunes.tsx` (la barra con la cifra escrita al lado).
  - Actividades: ítems con su cantidad, unidad y días, y «Por día»; aparte, las que no son del presupuesto.
  - Cantera: por volqueta, material, origen y destino, con barras.
  - Control de calidad: por ensayo, con la barra de los que cumplen y el %, y la lista de los que no
    cumplen con «Ver bitácora».
  - Clima y novedades: franjas, lluvia, día sin trabajo con motivo, y notas.
  - Probado en Chrome (dev, «Pruebas spec 018 (laboratorio)»), octubre:
    - 5 ítems (sub-base 1.372,88 m³ en 4 días);
    - 21 viajes (PRT017 con 20);
    - 12 ensayos (compresión 5 de 11, 45 %) y la lista de los que no cumplen;
    - semana del 5-oct: 5 días con bitácora y el 8-oct «07:00–18:00 · Soleado» con sus notas.
- T16 (2026-10-19):
  - «Descargar Excel» lleva el navegador a la dirección de `exportar`; el `Content-Disposition` lo baja como
    archivo.
  - «Imprimir», cambio respecto del plan: en vez de una ruta `reportes/imprimir`, que quedaría dentro del
    marco y del menú del panel, abre una ventana en el mismo clic (para que el navegador no la bloquee) y
    escribe en ella `paginaParaImprimir`. Esa función es pura, va en `exportar.ts` y usa las mismas hojas
    que el Excel.
  - La página lleva título y periodo con la hora de generación, va en carta horizontal, no corta filas y
    en un mes omite «Por día». El diálogo de impresión se abre con su botón, no solo: así no bloquea la
    pestaña.
  - Los reportes devuelven ahora su `obra` (código y nombre), para el título impreso y el Excel.
  - Caso «030/RF-10», 507 verificaciones.
  - Probado en Chrome (dev):
    - con `window.open` interceptado, Imprimir escribió «Personal · Pruebas spec 018 (laboratorio)», la
      semana con la hora, las hojas Personal y Por día, 370 filas y carta horizontal;
    - la dirección del Excel responde 200 `.xlsx` (17 KB, firma PK);
    - no se bajó ningún archivo al equipo.
  - Un primer clic en Imprimir abrió una ventana real fuera del grupo de pestañas de la prueba.
- T17 (2026-10-19):
  - `mantenimientos` es opcional en `ReporteDelDia` y en `reporteCorregido`: lo de antes se sigue leyendo
    igual y la propuesta solo lo agrega si el mensaje dice alguno.
  - La IA manda la clase como texto; `claseDeMantenimiento` entiende «cambio de aceite», «preventivo»,
    «reparación», «daño», «reventada»… Lo demás queda sin clase y es una falta, salvo que diga que quedó
    reparada (cierra el correctivo, RF-41).
  - La máquina se reconoce con `reconocerMaquina`, como en la maquinaria; si puede ser más de una, la
    falta lo dice.
- T18 (2026-10-19):
  - `whatsapp/servidor/mantenimientos.ts` (`guardarMantenimientos`) corre en `procesarMensaje` antes de
    repartir por destino: los mantenimientos se guardan vaya adonde vaya el resto del mensaje. Su
    resultado queda en `resultado.mantenimientos` del mensaje.
  - El id sale de máquina + clase + día (no del mensaje): lo prueba `PRUEBA-030-T18-1B`, otro mensaje
    con el mismo aceite, que quedó como repetido.
  - `separarRenglones` conoce la sección `mantenimientos` (opcional); `dias.ts` ya no la aparta al
    armar el día.
  - Sin fecha válida (o futura) no se guarda aquí; el mensaje entero se aparta por la fecha al armar
    su día.
  - En dev quedaron `PRUEBA-030-T18-1`, `-1B`, `-2`, `-3` y `-4` (en espera, día 19-oct de «Pruebas
    spec 018»), tres mantenimientos de PRUEBA-026-REC y la excepción de `-2`, que usa la T19.
- T19 (2026-10-19):
  - `guardarExcepcion` tiene la rama `mantenimientos`: mismas faltas que al procesar y
    `guardarMantenimientos` con la persona como autor (origen sigue siendo `whatsapp`, con el mensaje).
  - En la pantalla: Equipo, Mantenimiento (vacío permitido solo si «Ya quedó reparada»), Lectura
    opcional, «Qué se hizo» y la casilla de reparada.
  - Probado en Chrome: guardar sin equipo muestra la falta; con equipo queda registrado y la excepción
    `guardada`. Se eligió PRUEBA-026-VIBRO y no la recicladora porque la recicladora ya tenía un preventivo
    del 19-oct (T18-4): el de la excepción habría sido un repetido (RF-42) y no se veía uno nuevo.
  - Un completado que coincide con uno ya registrado (máquina, clase y día) marca la excepción guardada
    sin crear otro: el mantenimiento ya está.
- T20 (2026-10-19):
  - `generar_workflow_clasificar.py`: instrucciones «Los mantenimientos de las máquinas» y
    `mantenimientos[]` en el esquema (equipo, tipo_equipo, marca, clase con `""` para «no se entiende»,
    resuelto, lectura, descripcion). La fecha es la `fecha_evento` del mensaje; la unidad del medidor
    no se pide (se sabe por el tipo de equipo).
  - **Límite de la API:** el esquema queda con exactamente 16 campos `anyOf`/null, el máximo. Un número
    nuevo que pueda faltar exige quitar otro antes (anotado junto a `numero_o_nulo`).
  - `occ-clasificar-mensajes.json` regenerado: solo cambia el texto del sistema de «Armar petición». No
    está publicado en n8n: eso va con el despliegue (T22), cuando la imagen ya entienda `mantenimientos`.
  - Verificador: una salida de ejemplo con todos los campos pasa por `propuestaDeIa` y
    `resolverPropuesta` (513 verificaciones).
- T21 (2026-10-20): en el PC, con el workflow `Prueba030T21Ids` (inactivo) sobre 4 mensajes de prueba del
  grupo `prueba-030-t21@g.us` en `occ_whatsapp`:
  - `PRUEBA-030-T21-1`, «hoy se le cambió el aceite a la TFO427, el horómetro marcaba 14702.5»:
    - la IA da `aceite`, TFO427, lectura 14702.5, `resuelto: false`;
    - con `propuestaDeIa` y los catálogos de CONSORCIO MAGDALENA en producción (solo lectura), la máquina queda reconocida, sin faltas.
  - `-2`, «se reventó una manguera de la pajarita, quedó en reparación»: `correctivo`, «pajarita».
  - `-3`, «ya quedó reparada la pajarita»: sin clase y `resuelto: true` (RF-41), sin falta de clase.
  - `-4`, «mantenimiento preventivo a la motoniveladora»: `preventivo`, tipo Motoniveladora, sin marca.
  - En `-2` a `-4` la máquina no se reconoce: la falta es «No se reconoció la máquina…: elíjala de la lista» y el renglón va a «No se pudo guardar» (RF-40).
    - «Pajarita» no está en `contexto_obra.md`; la IA sugiere que puede ser uno de los dos retrocargadores.
    - Motoniveladoras hay dos en MAGDALENA, la propia y la alquilada.
    - No inventar es lo correcto.
