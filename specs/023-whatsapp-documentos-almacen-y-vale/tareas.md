# Tareas — Spec 023

Tareas de menos de 30 minutos, ordenadas por dependencia. Cada una lleva los RF que
cubre y una línea `Hecho cuando:` que se pueda comprobar sin interpretar.

**Se implementa una tarea cada vez** (`/sdd:implementar T1`), y al terminarla se para.
Ninguna tarea se marca sin `npm run verificar`, `npm run typecheck` y `npm run lint`
en verde.

Las tareas T19 a T22 son del repo de la integración (`C:\dev\n8n-evolutionapi`); ahí
«los tres comandos» no aplican, y su «Hecho cuando» dice qué se comprueba en su lugar.

### Datos

- [x] T1. Migración 0020: `cantera_viajes.vale` con su `check` y su índice,
      `almacen_movimientos.mensaje_whatsapp_id`, `usuarios.registrado_por` y
      `usuarios.mensaje_whatsapp_id`. (RF-37, RF-41, RF-55, RF-68)
      Hecho cuando: `drizzle/servidor/0020_….sql` existe, está aplicada en neondb de desarrollo,
      un `insert` de un vale de 31 caracteres falla por el `check` y los tres comandos están en
      verde.

### Número de vale

- [x] T2. Reglas del vale en `shared/rules/cantera.ts` (`valeLimpio`, `faltaDeVale`,
      `mismoVale`, `avisoDeValeRepetido`, largo en `validarViaje`) con sus casos en
      `verificar-reglas.ts`. (RF-43, RF-44, RF-45, RF-55, RF-56)
      Hecho cuando: los casos del plan («F-0458», « 0458 A », 31 caracteres, «f-0458» = «F-0458»,
      «F-0458» ≠ «F0458», anulado no cuenta) pasan y los tres comandos están en verde.
- [x] T3. El vale en la ruta de viajes: `viajeNuevo.vale` y `valeRepetidoConfirmado`,
      `viajesConVale`, el 409 con el viaje repetido, y `vale` en la lectura. (RF-41, RF-42,
      RF-45, RF-46, RF-52, RF-56)
      Hecho cuando: con `curl` en desarrollo, un viaje con «F-0458» da 201; otro con «f-0458» da
      409 con el viaje anterior; repetido con `valeRepetidoConfirmado` da 201; uno sin vale da
      201; y el `GET` devuelve los tres vales.
- [x] T4. El vale en el panel de Control Cantera: campo «N.º de vale» en la ventana del viaje,
      el aviso de repetido con «Guardar igual», y la columna en el listado. (RF-41, RF-42,
      RF-45, RF-46)
      Hecho cuando: en Chrome, como encargado de planta de «Pruebas spec 018», se registra un viaje
      con vale y otro sin vale, el repetido muestra el aviso y se guarda con «Guardar igual», el
      listado muestra la columna sin desbordar en 1366 puntos, y los tres comandos están en verde.
- [x] T5. El vale en la bitácora: `ViajeDelParte.vale`, `'vale'` en `viajesDelDiaEnSql` y en
      la sección Control Cantera de `pantalla-partes.tsx`. (RF-47, RF-48, RF-49)
      Hecho cuando: la bitácora abierta del día del viaje de T4 muestra su vale; al cerrarla sigue
      ahí; una bitácora cerrada antes del cambio se ve sin vale y sin error; los tres comandos en
      verde.

### Reglas de la bandeja

- [x] T6. Reglas del almacén para un reporte: `unidadDeTexto` y `saldoDelReporte` en
      `shared/rules/almacen.ts`, con sus casos. (RF-30, RF-33, RF-34)
      Hecho cuando: los casos del plan (unidades escritas de varias formas; salida que alcanza con
      el ingreso del mismo día; salida anterior al ingreso; material nuevo en cero; dos salidas
      que juntas superan) pasan y los tres comandos están en verde.
- [x] T7. La propuesta con almacén, vale y cargo de hoja: categoría `reporte_almacen` → destino
      `almacen` con su rótulo; `MovimientoDelReporte`, `ViajeDelReporte.vale`,
      `PersonaDelReporte.cargoPropuesto`; `resolverPropuesta` los lee; `propuestaDeIa` y
      `reporteCorregido` los aceptan. (RF-18, RF-19, RF-20, RF-21, RF-50)
      Hecho cuando: los casos de `resolverPropuesta` con un reporte de almacén (fecha del
      encabezado y, sin ella, la del mensaje), un viaje con vale y una persona con `cargo_hoja`
      pasan, y los tres comandos están en verde.
- [x] T8. `faltasDelReporte`, sección almacén: material sin elegir ni registrar, nombre nuevo
      que ya existe, unidad distinta, sin quién entregó o recibió, sin para qué, cantidad, fecha
      futura y saldo. (RF-26, RF-27, RF-29, RF-30, RF-31, RF-32, RF-33, RF-36)
      Hecho cuando: el caso con todas las faltas a la vez devuelve una por renglón, en la sección
      `almacen`, y los tres comandos están en verde.
- [x] T9. `cargoDeHoja` y `posiblesCoincidencias` en `shared/rules/whatsapp.ts`, con sus casos.
      (RF-62, RF-65)
      Hecho cuando: los casos del plan (CONDUCTORES, OPERADORES, CONTROLADORAS, TOPOGRAFIA,
      INGENIEROS → nulo; «OSCAR OLIVERO» frente a «Oscar Olivero Pérez» y «Oscar Velandia»; «de»
      que no cuenta) pasan y los tres comandos están en verde.

### Servidor de la bandeja

- [x] T10. La bandeja resuelve lo nuevo: catálogos con los materiales del almacén (unidad y
      stock) y el cargo de cada persona; en el detalle, las posibles coincidencias de cada persona
      no reconocida y el aviso de vale repetido por viaje. (RF-26, RF-45, RF-62, RF-65)
      Hecho cuando: con `curl`, una propuesta de prueba con un material existente y uno nuevo, una
      persona parecida a una registrada y un viaje con un vale ya usado devuelve el material
      reconocido, el nuevo marcado, la coincidencia y el aviso; los tres comandos en verde.
- [x] T11. Aprobar un reporte de almacén (`features/whatsapp/servidor/almacen.ts` y el desvío
      en `aprobacion.ts`): módulo apagado, faltas, lote serializable con materiales nuevos y la
      guarda que lanza error, reintento sin duplicar, mensaje aprobado sin bitácora. Los viajes
      aprobados llevan su vale. (RF-22, RF-25, RF-28, RF-35, RF-36, RF-37, RF-40, RF-50,
      RF-53, RF-54)
      Hecho cuando: con `curl` en desarrollo, como residente de «Pruebas spec 018», un reporte con
      un ingreso de un material nuevo y una salida se aprueba y deja el material y los dos
      movimientos con su `mensaje_whatsapp_id`; repetir la petición no duplica nada; uno cuya
      salida supera el stock da 400 sin crear el material; la bitácora del día no cambia; los tres
      comandos en verde.
- [x] T12. La marca «desde WhatsApp» en el historial del almacén. (RF-38, RF-39)
      Hecho cuando: en Chrome, como almacenista de «Pruebas spec 018», el historial del material de
      T11 muestra los movimientos con la marca, el stock correcto, la descarga en Excel los
      incluye, y el almacenista sigue sin ver la bandeja; los tres comandos en verde.
- [x] T13. Registrar personas desde la bandeja: `personasDesdeLaBandeja`,
      `features/whatsapp/servidor/personas.ts` y `POST …/propuestas/:id/personas`.
      (RF-57, RF-58, RF-59, RF-60, RF-61, RF-63, RF-64, RF-66, RF-67, RF-68)
      Hecho cuando: con `curl`, como residente, tres personas de una propuesta de prueba quedan
      registradas en la obra con su cargo, rol operador, sin credenciales, con quién y desde qué
      mensaje; la propuesta queda con sus `usuarioId`; repetir no las duplica; como almacenista da
      403; `POST /api/panel/personas` como residente sigue en 403; los tres comandos en verde.

### Panel de la bandeja

- [x] T14. La sección Almacén en la propuesta: ingresos y salidas editables, elegir el material o
      registrarlo nuevo (lista de OCC u «Otro» + unidad), stock al lado de cada salida, y aprobar.
      (RF-19, RF-20, RF-21, RF-26, RF-27, RF-28, RF-33)
      Hecho cuando: en Chrome se corrige y aprueba un reporte de almacén de prueba con un material
      nuevo, las faltas se pintan por renglón, y los tres comandos están en verde.
- [x] T15. Registrar personas en la propuesta: «Registrar» por renglón con sus coincidencias, y
      «Registrar todas las no reconocidas» con el cargo propuesto, cambiable, y la casilla para
      excluir. (RF-57, RF-60, RF-61, RF-62, RF-65, RF-66)
      Hecho cuando: en Chrome, sobre una propuesta de personal de prueba, se registra una persona
      sola y luego el resto de una vez excluyendo una; las registradas quedan reconocidas sin
      recargar; los tres comandos en verde.
- [x] T16. El vale en los viajes de la propuesta, editable, con el aviso de repetido. (RF-45,
      RF-50, RF-51)
      Hecho cuando: en Chrome se corrige el vale de un viaje de prueba, el repetido muestra el
      aviso sin bloquear, se aprueba y el viaje queda en Control Cantera con ese vale; los tres
      comandos en verde.

### Integración (`C:\dev\n8n-evolutionapi`)

- [x] T17. `scripts/lector_archivos.js` y `scripts/probar_lector.js`: Excel (hojas visibles,
      formatos de hora y fecha, recorte) y Word (párrafos y tablas), con el motivo cuando no se
      puede leer. (RF-3, RF-4, RF-5, RF-6, RF-7, RF-8)
      Hecho cuando: `node scripts/probar_lector.js` muestra las 7 hojas del «Formato Horas Extras»
      con su nombre, las 37 personas, `07:30` y `6:00Pm`; un `.docx` de prueba sale con su tabla;
      un `.xls` y un archivo que no es ZIP dan su motivo.
- [x] T18. El esquema y las instrucciones de la IA: `reporte_almacen`, `almacen`, `vale`,
      `cargo_hoja`, el reporte de personal en archivo y la plantilla del almacén, en
      `generar_workflow_clasificar.py`. (RF-11, RF-12, RF-13, RF-14, RF-15, RF-17, RF-18,
      RF-19, RF-20, RF-21, RF-50, RF-62)
      Hecho cuando: el JSON generado contiene el esquema nuevo y las instrucciones, y el
      generador corre sin error.
- [x] T19. El lector dentro de «Armar petición»: `base64` de Excel y Word, bloque `document` de
      texto, línea del adjunto con el motivo; `NODE_FUNCTION_ALLOW_BUILTIN=zlib` en los dos
      compose. (RF-1, RF-2, RF-3, RF-6, RF-7, RF-9, RF-10)
      Hecho cuando: en el n8n del PC, levantado **sin Evolution**, `--ids` sobre mensajes de prueba
      en `occ_whatsapp` de desarrollo (el Excel de horas extras, un Word, un `.xls`, un reporte de
      almacén escrito y una foto de vale) deja cinco clasificaciones correctas: reporte del
      2026-10-05 con las personas de las 7 hojas, el Word resumido, el `.xls` marcado para
      revisión con su motivo, `reporte_almacen` con sus movimientos y el viaje con su vale.
- [x] T20. La plantilla diaria con «Vale:» en cada viaje (`plantilla_reporte_whatsapp.md`).
      (RF-50)
      Hecho cuando: la plantilla trae el vale en cada viaje y sus reglas lo explican.

### Cierre

- [ ] T21. Despliegue a producción, con la aprobación del usuario: migración 0020, imagen del
      panel, compose y workflow de n8n en el VPS, y reclasificar el Excel del 5 de octubre.
      (Todos)
      Hecho cuando: la migración está aplicada en producción, el panel sirve la imagen nueva, el
      workflow corre con el lector, y el «Formato Horas Extras» aparece en la bandeja de producción
      como reporte del 2026-10-05 con su personal.
- [ ] T22. Validación final: recorrido RF por RF de la spec + demo manual (pasos 1 a 7). (Todos)
      Hecho cuando: cada RF tiene su comprobación con resultado en `validacion.md`, los tres
      comandos están en verde y la spec queda marcada como Cumplida.

## Notas de ejecución

- **T1 (2026-10-07)**: migración `0020_normal_mongoose.sql`, aplicada en neondb de desarrollo
  (producción pendiente, en T21). Comprobado en la base: un vale de 31 caracteres y uno vacío
  los rechaza `ck_cantera_viaje_vale`; las cuatro columnas existen; los 10 viajes de desarrollo
  quedaron sin vale. `usuarios.registrado_por` apunta a la misma tabla (`AnyPgColumn`).
- **T2 (2026-10-07)**: `valeLimpio`, `faltaDeVale`, `mismoVale`, `avisoDeValeRepetido` en
  `shared/rules/cantera.ts`; `validarViaje` acepta `vale` opcional y pinta su falta en el campo
  `vale`. 387 verificaciones (3 pruebas nuevas). `avisoDeValeRepetido` es genérica sobre
  `{ id, vale, anulado }` para que la usen la ruta (T3) y la bandeja (T10).
- **T3 (2026-10-07)**: `viajeNuevo.vale` (limpiado con `valeLimpio`) y
  `valeRepetidoConfirmado`; `ViajeFila.vale`; `viajesConVale` (vigentes, `lower(vale)`); tipo
  `ValeRepetido` para el 409. Probado con `curl` como gerencia en «Pruebas spec 018
  (laboratorio)», 2026-10-07: «  F-0458 » → 201 guardado «F-0458»; «f-0458» → 409 con el viaje
  de las 08:00; confirmado → 201; sin vale → 201; 31 caracteres → 400 en el campo `vale`; el
  `GET` devuelve los tres. Quedan esos **3 viajes de prueba** (08:00, 08:30, 09:00 con
  PRUEBA-VOL-T17) en desarrollo: sirven para T4 y T5. La obra no tiene encargado de planta: las
  pruebas con `curl` se hacen con una sesión de gerencia abierta por script en la base de
  desarrollo.
- **T4 (2026-10-07)**: campo «N.º de vale» en `ventana-viaje.tsx`; el 409 `valeRepetido` se
  lee de `ErrorApi.cuerpo` (nuevo) y se muestra como aviso con «Guardar igual», que reenvía
  con `valeRepetidoConfirmado`; cambiar el vale retira la pregunta. **Cambio frente al plan:**
  el vale no va en columna propia sino debajo de la volqueta («Volqueta y vale», 110): la
  prueba de anchos mide contra 888 (ventana de 1024 con el menú plegado, 022) y con la columna
  la tabla gastaba 939; así gasta 874. Probado en Chrome como gerencia en «Pruebas spec 018
  (laboratorio)»: viaje con «F-0458» → aviso del viaje de las 08:00 → «Guardar igual» →
  registrado (12:30, PR 2 + 050); viaje sin vale → registrado (12:30, PR 2 + 075); el listado
  muestra «Vale F-0458» / «Vale f-0458» y nada en los que no tienen. Quedan **5 viajes de
  prueba** del 2026-10-07 en esa obra. No se pudo achicar la ventana de Chrome a 1366 (está
  maximizada); el ancho lo garantiza la prueba de `verificar-reglas.ts`.
- **T5 (2026-10-07)**: `'vale'` en `viajesDelDiaEnSql` (la misma consulta muestra y fija),
  `ViajeDelParte.vale?`, y en `pantalla-partes.tsx` la columna «Volqueta y vale» (110), igual que
  en el listado; la prueba de anchos (límite 708 en esa pantalla) sigue en verde. Probado en
  Chrome: se abrió la bitácora del 2026-10-07 en «Pruebas spec 018 (laboratorio)» y su sección
  Control Cantera (5) muestra «Vale F-0458» / «Vale f-0458» y nada en los viajes sin vale.
  **Cierre:** como cerrar desde la pantalla exige todas las secciones y la foto del día, esa
  bitácora de prueba (`01a11783-…`) se cerró por script en desarrollo con la misma
  `viajesParaFijarAlCerrar` de la ruta de cierre: quedaron fijados los 5 viajes con su vale, y
  cerrada sigue mostrándolo. **Queda cerrada a medias** (sin las demás secciones): es de prueba.
  RF-49: en desarrollo no hay ninguna bitácora con viajes fijados de antes del cambio (la del
  2026-10-04 dice «se cerró antes de que existiera el control de cantera»); un viaje fijado sin
  la clave `vale` se pinta como uno con `vale: null`, que sí se vio (el de las 09:00).
- **T6 (2026-10-07)**: en `shared/rules/almacen.ts`, `unidadDeTexto` (sin tildes, mayúsculas,
  puntos ni espacios; «²»/«³» → 2/3; sinónimos por unidad en `UNIDADES_ESCRITAS`) y
  `saldoDelReporte` (materiales por una clave —id o clave de material nuevo—, orden por fecha
  e ingresos primero el mismo día, una salida que no alcanza no se descuenta, lo ilegible no
  cuenta). 389 verificaciones (2 pruebas nuevas, que fallaron antes de implementar).
- **T7 (2026-10-07)**: categoría `reporte_almacen` → destino `almacen` («Reporte de
  almacén»); `ReporteDelDia.almacen: MovimientoDelReporte[]`, `ViajeDelReporte.vale`,
  `PersonaDelReporte.hoja` (en vez de `cargoPropuesto`: aquí va la hoja tal como vino; el cargo
  lo traduce `cargoDeHoja` en T9). `resolverPropuesta` lee `almacen.ingresos/salidas` (material
  solo por nombre **igual** sin tildes ni mayúsculas, cantidad en centésimas, unidad con
  `unidadDeTexto`), `vale` (solo en renglones de un viaje: en «2 viajes» no se reparte) y
  `cargo_hoja`. Contratos: `propuestaDeIa` acepta los campos nuevos; `reporteCorregido` los trae
  con valor por defecto, y la bandeja vuelve a pasar por él las propuestas ya corregidas (las de
  antes no los tienen). `DetalleDePropuesta.destino` es `DestinoDeWhatsapp`. 393 verificaciones
  (4 pruebas nuevas; no se corrieron antes de implementar). **Riesgo abierto hasta T11:** hoy
  aprobar un `reporte_almacen` entra por el camino de la bitácora (`destino !== 'ninguno'`) y
  abriría la bitácora del día sin datos; nada lo manda todavía (n8n aún no usa la categoría).
- **T8 (2026-10-07)**: sección `almacen` en `faltasDelReporte` (función `faltasDelAlmacen`).
  `ContextoDelReporte.almacen.materiales` lleva id, nombre, unidad y stock de hoy (lo llenará el
  servidor en T10/T11). Por renglón: material sin elegir ni registrar; material que ya no está;
  material nuevo sin nombre, sin unidad o con el nombre de uno vigente; el mismo material nuevo
  con dos unidades; unidad no reconocida o distinta de la del material (no se convierte); lo de
  `validarMovimiento` sin repetir la fecha; y el saldo con `saldoDelReporte`, solo con los
  renglones de material y unidad resueltos. Dos renglones con el mismo material nuevo (mismo
  nombre sin tildes ni mayúsculas) son uno. 397 verificaciones (4 pruebas nuevas, que fallaron
  antes de implementar).
- **T9 (2026-10-07)**: `cargoDeHoja` (alias de hojas de OCC —CONTROLADORAS → controlador_vial,
  TOPOGRAFIA → topografo— y el nombre de cualquier cargo en singular o plural; si el nombre
  entero no dice nada, su primera palabra; los números de hoja repetida no cuentan) y
  `posiblesCoincidencias` (dos o más palabras en común de tres letras o más, la que más
  comparte primero). 399 verificaciones (2 pruebas nuevas, que fallaron antes de implementar).
  Interpretación de RF-65: «palabras» deja fuera las de menos de tres letras («de», «la», «y»),
  como dice el plan; si no, «José de la Cruz» y «José de Ávila» serían coincidencia.
- **T10 (2026-10-07)**: en `bandeja.ts`, `almacenDeLaObra` (materiales vigentes con unidad y
  stock, con `leerMateriales`, que ya deja fuera las obras sin almacén) entra en los catálogos,
  en `opciones.almacen` y en el contexto de `faltasDelReporte`; el detalle trae `almacenActivo`,
  `coincidencias` (personal y operadores sin reconocer, contra las personas **de la obra**) y
  `avisosDeVale` (`avisosDeValeDelReporte`: contra los viajes vigentes de la obra que no sean de
  este mismo mensaje, y contra los renglones anteriores del reporte). Datos de prueba en
  desarrollo, obra «Pruebas spec 018 (laboratorio)»: material **«PRUEBA Cemento T10»** (bultos,
  ingreso de 5) y mensaje **PRUEBA-T10-1** (grupo prueba-t19@g.us, `reporte_almacen`,
  pendiente) con un ingreso reconocido, uno de «PRUEBA Arena T10» sin reconocer, una salida,
  «Natalia Riaño Pérez» y tres viajes con vale. Con `curl`: material reconocido con stock 500,
  arena sin reconocer con su falta, Natalia Riaño como coincidencia, avisos de vale en los
  renglones 0 (vale F-0458 del viaje de las 08:00) y 2 (x-1 repite el viaje 2 del reporte), y
  sin falta de saldo. **Pendiente para T15:** la falta de una persona no reconocida todavía dice
  «elíjalo de la lista o quítelo»; con T13/T15 también se podrá registrar.
- **T11 (2026-10-07)**: `features/whatsapp/servidor/almacen.ts` con `aprobarReporteDeAlmacen`
  (módulo apagado → 400; sin renglones → 400; faltas de `fecha` y `almacen` → 400; lote; marca
  el mensaje aprobado sin `parte_id`) y `escribirReporteDeAlmacen` (el lote serializable,
  exportado para probar la guarda sin la regla). `aprobarPropuesta` desvía el destino
  `almacen` antes de tocar la bitácora (**se cierra el riesgo anotado en T7**), y su respuesta a
  un reintento ya aprobado también. `idDeterminista` pasó a `whatsapp/servidor/ids.ts` (acepta
  número o clave); `materialesConStock` a `almacen-obra/servidor/materiales.ts`;
  `claveDeMaterialNuevo` se exporta. Los viajes aprobados llevan su vale. Probado en
  desarrollo: (1) guarda en SQL, llamando al lote directo con una salida de 1.000 bultos y un
  material nuevo → `stock`, sin material ni movimientos; (2) por la ruta, el mismo mensaje
  **PRUEBA-T11-2** → 400 «No alcanza: quedan 5 bultos y la salida es de 1.000 bultos.» en el
  renglón 1 (queda pendiente); (3) **PRUEBA-T10-1** aprobado con la arena como nueva → 200
  `{movimientos: 3, materialesNuevos: 1}`, cemento en 75 bultos, «PRUEBA Arena T10» en 3 m³,
  movimientos con `mensaje_whatsapp_id` y registrados por quien aprobó, mensaje aprobado sin
  bitácora; repetir la petición → 200 sin duplicar; repetir el lote directo → sin error y sin
  duplicar. (4) **Como residente** (sesión de prueba de Natalia Riaño, Residente 2 de la obra):
  PRUEBA-T11-2 con la salida bajada a 10 bultos → 200, con la grava nueva y los dos movimientos
  registrados a su nombre; la misma residente en `POST /api/panel/almacen/movimientos` → 403
  (RF-23). Cemento T10 queda en **65 bultos**. **Pendiente para T14:**
  `api.whatsapp.propuestas.aprobar` en `cliente-api.ts` sigue tipando solo la respuesta de la
  bitácora.
- **T12 (2026-10-07)**: `MovimientoDeAlmacenFila.desdeWhatsapp` (de `mensaje_whatsapp_id`) y la
  etiqueta «Desde WhatsApp» bajo «Registró» en `historial-almacen.tsx`, como en Control
  Cantera. Se creó en desarrollo el almacenista de prueba **«PRUEBA Almacenista T12»**
  (`prueba.almacenista.t12`, sin credenciales) en «Pruebas spec 018 (laboratorio)». Como
  almacenista, por `curl`: sus materiales (cemento 65 bultos, arena 3 m³, grava 2 m³), el
  historial del cemento con `desdeWhatsapp` en los tres aprobados y no en el ingreso a mano, la
  bandeja en 403 y el Excel con los movimientos aprobados y las existencias iguales a la
  pantalla. En Chrome, el historial con la etiqueta en los tres; se vio con la sesión de
  gerencia del navegador (el componente es el mismo para el almacenista, y sin contraseña no se
  puede entrar como él).
- **T13 (2026-10-07)**: reglas `usuarioDeLaBandeja` («wa.» + nombre + 6 cifras del id, ≤ 40) y
  `rechazoDeRegistro` (el renglón existe y está sin persona); contrato `personasDesdeLaBandeja`
  (lleva la propuesta como se ve, como una corrección); `whatsapp/servidor/personas.ts` (una
  sentencia con id fijo por mensaje, sección y renglón, y `on conflict do nothing`; comprueba
  que se crearon todas; luego guarda la propuesta con cada `usuarioId`/`operadorId` con la
  versión) y `POST …/propuestas/:id/personas` con `whatsapp:aprobar`. 402 verificaciones (3
  pruebas nuevas, que fallaron antes de implementar). Probado con `curl` en desarrollo: mensaje
  **PRUEBA-023-T13-1** (el id `PRUEBA-T13-1` ya existía, descartado, de las pruebas de la 021)
  con tres personas de las hojas CONDUCTORES, INGENIEROS y OPERADORES; como residente (Natalia
  Riaño) → 201 y la propuesta las reconoce sin faltas de personal; en la base, **3 personas de
  prueba** («PRUEBA Wilfer García T13» conductor, «PRUEBA Ana Ospina T13» sin cargo, «PRUEBA
  Luis Cardona T13» operador), en la obra, rol operador, sin contraseña, registradas por ella y
  con el mensaje; repetir con la versión vieja → 409 y con la nueva → 400 «ya está elegida», sin
  duplicar; como almacenista → 403; la residente en `POST /api/panel/personas` → 403 (RF-59).
  Nota: una persona registrada como Conductor u Operador queda elegible como conductor en
  Control Cantera de su obra (está activa); eso es lo esperado, pero no recibe celular hasta que
  gerencia le emita un código.
- **T14 (2026-10-07)**: en `propuesta-reporte.tsx`, con destino `almacen` la propuesta muestra
  solo el día y la sección **Almacén** (`SeccionAlmacen`, en el mismo archivo para usar
  `CampoNumero` y `FaltasDelRenglon`): tipo, material del almacén con su stock en la lista o
  «Registrar como material nuevo» (nombre de la lista de OCC u «Otro» escrito, y unidad de la
  lista cerrada), cantidad (en la unidad, viaja en centésimas), unidad con lo escrito al lado,
  «Entregado por»/«Recibido por», «Para qué»/«Observación», el stock de hoy junto a cada
  salida, «Añadir ingreso»/«Añadir salida». Sin secciones de bitácora ni fotos; aviso de lo que
  hará la aprobación, o el de obra sin Almacén sin botón de aprobar. El tipo de la respuesta de
  aprobar en `cliente-api.ts` ya incluye la del almacén (**pendiente de T11 resuelto**).
  **Arreglo encontrado al probar:** el detalle calculaba faltas también en lo ya aprobado, y al
  aprobar con un material nuevo salía «Ya hay un material…»; ahora `leerDetalle` solo calcula
  faltas de lo pendiente. Probado en Chrome como gerencia con **PRUEBA-023-T14-1** (ingreso de
  20 bultos de cemento, ingreso de «PRUEBA Varilla T14» sin reconocer, salida de 100): faltas
  por renglón (varilla sin reconocer; «No alcanza: quedan 85 bultos…» contando el ingreso del
  mismo reporte); la varilla se registró nueva («Otro», unidad Unidad), la salida bajó a 50,
  «Guardar corrección» dejó 0 faltas, «Aprobar» → «Aprobado: se registraron 3 movimientos en el
  Almacén, con 1 material nuevo.»; en la base, cemento en **35 bultos**, varilla en 15 unidades,
  mensaje aprobado sin bitácora. Abierto de nuevo desde «Aprobados», sin faltas ni botón de
  aprobar.
- **T15 (2026-10-07)**: en la propuesta, cada persona u operador sin reconocer muestra sus
  posibles coincidencias de la obra con un botón «Es …» que la elige, y «Registrar persona» /
  «Registrar operador»; arriba de Personal, «Registrar todas las no reconocidas (N)» cuando hay
  más de una (cuenta personal y operadores). Las dos abren `VentanaRegistrarPersonas`: aviso de
  que quedan sin acceso y aunque se descarte el reporte, por persona casilla «Registrar» (si son
  varias), nombre (con lo del reporte) y cargo (`cargoDeHoja`; un operador de máquina, Operador;
  o «Sin definir»), y las coincidencias. Manda la propuesta como se ve, así que lo cambiado sin
  guardar —p. ej. una coincidencia elegida— se guarda con las personas. `api.whatsapp.propuestas
  .registrarPersonas`. Las faltas de persona y operador sin reconocer ahora dicen «…,
  regístrelo…» (**pendiente de T10 resuelto**). Probado en Chrome como gerencia con
  **PRUEBA-023-T15-1** (4 personas): «Es Natalia Riaño (Residente 2)» eligió la coincidencia;
  «Registrar todas (3)» propuso Conductor, Operador y Sin definir; se excluyó a Juan → «Se
  registraron 2 personas…»; luego Juan solo desde su renglón → «Se registró 1 persona…»; sin
  faltas. En la base, **3 personas de prueba T15** en la obra, rol operador, sin contraseña, con
  el mensaje, y la propuesta guardada con las cuatro elegidas (Natalia incluida). Nota: con los
  nombres de prueba, «PRUEBA … T15» comparten «prueba» y «t15», así que se muestran unos a otros
  como coincidencias; con nombres reales no pasa.
- **T16 (2026-10-07)**: campo «N.º de vale» en cada viaje de la propuesta y, debajo, el aviso de
  `avisosDeVale` («⚠ … Se puede aprobar igual.»), que no bloquea. Probado en Chrome como
  gerencia con **PRUEBA-023-T16-1** (`suministro_cantera`, 2026-10-06, con la volqueta y su
  operador para que el conductor salga solo): el viaje con «F-0458» mostró el aviso del viaje
  del 2026-10-07 a las 08:00; al otro se le escribió «F-0470»; «Aprobar» → «Aprobado: pasó a la
  bitácora del 2026-10-06, y 2 viajes a Control Cantera.» En Control Cantera, los dos viajes con
  su vale y «Desde WhatsApp». Esto abrió en desarrollo la **bitácora del 2026-10-06** de la obra
  de pruebas (comportamiento de la 021 para la categoría de cantera) con la máquina del reporte.
  El panel de la 023 queda completo (T1–T16).
- **T17 (2026-10-07)**, en `C:\dev\n8n-evolutionapi`: `scripts/lector_archivos.js` (ZIP leído a
  mano con `zlib.inflateRawSync`; Excel: textos compartidos, estilos con formatos de hora
  —18–21, 45–47 o código con «h»— y de fecha, hojas visibles en orden, una línea por fila con
  « | », recorte a 150 000 caracteres por hojas completas; Word: párrafos con tabulaciones y
  saltos, tablas fila por fila; un archivo OLE —.xls/.doc o con contraseña— o que no es ZIP
  devuelve `{ error }` con el motivo, sin lanzar). Lo que va después de «EXPORTAR» lo quitará
  el generador al incrustarlo (T19). `scripts/probar_lector.js` con archivos de prueba en
  `scripts/pruebas/` (`prueba.docx`, `antiguo.xls`, `no_es_zip.xlsx`). Resultado: el «Formato
  Horas Extras» sale con sus **7 hojas** en orden y su nombre, **37 personas** como «NOMBRE |
  07:30 | 6:00Pm», y el encabezado «DIA_05 MES_10 AÑO_2026» en cada hoja; el Word con su
  párrafo (tilde, «&» y tabulación) y su tabla; los dos ilegibles con su motivo. El recorte
  (RF-8) no se probó con un archivo grande: ningún archivo real llega a ese tamaño.
- **T18 (2026-10-07)**: en `generar_workflow_clasificar.py`, instrucciones nuevas (los
  adjuntos —Excel y Word como documento de texto, «no se pudo leer», «[ARCHIVO RECORTADO…]»—;
  el reporte de personal en archivo —fecha del encabezado, todas las hojas, `cargo_hoja` sin
  «(2)», una persona una vez, fechas distintas a revisión, sin columnas de horas extra—; el
  reporte de almacén y su diferencia con `suministro_cantera`; el vale tal como se escribe,
  vacío en renglones de varios viajes, y la foto del vale como viaje), la línea de viajes de la
  plantilla con el vale, y el esquema: `reporte_almacen` en la categoría,
  `personal[].cargo_hoja`, `viajes[].vale` y `almacen.{ingresos, salidas}` con los nombres de
  `propuestaDeIa`. El generador corre sin error y el JSON lleva todo. El n8n en marcha no
  cambia hasta importar (T19 en el PC, T21 en el VPS).
- **T19 (2026-10-07)**: el generador incrusta `lector_archivos.js` (hasta «EXPORTAR») en «Armar
  petición»; la consulta trae el `base64` también de Excel y Word (por tipo o por extensión);
  el texto va a la IA como `document` de texto con el nombre del archivo, y la línea del
  adjunto dice «(va abajo, convertido a texto)» o «(no se pudo leer: …)».
  `NODE_FUNCTION_ALLOW_BUILTIN=zlib` en `docker-compose.yml` y en `vps/compose.yaml`. Probado
  en el n8n del PC (2.41.4, igual que el VPS) **sin arrancar el servidor de n8n ni Evolution**:
  solo la base del PC (que ya estaba encendida) y n8n por línea de comandos en contenedores de
  una vez (`docker compose run --rm --no-deps -T n8n import:workflow|execute`), porque los
  workflows del PC están publicados y la entrega apunta a producción. Workflow de prueba
  `Prueba023T19Ids` («OCC - Clasificar (PRUEBA T19, spec 023)», sin disparador programado,
  queda importado en el PC) sobre 5 mensajes **PRUEBA-023-T19-1…5** en `occ_whatsapp` del PC
  (grupo prueba-t19@g.us): el Excel de horas extras → `reporte_diario`, 2026-10-05, 37
  personas con su `cargo_hoja`, entrada 07:30 y salida 18:00; el Word → administrativo con su
  párrafo y su tabla; el `.xls` → marcado para revisión con «no se pudo leer… reenviar como
  .xlsx, .docx o PDF»; el reporte de almacén escrito → `reporte_almacen` 2026-10-07 con sus 2
  ingresos y su salida; la foto de un vale de prueba (dibujado) → `suministro_cantera` con
  `vale` «F-0477», placa, material, hora y K4+150. `zlib` funcionó en el nodo Code con la
  variable. Además se entregó la clasificación del Excel al panel de desarrollo
  (PRUEBA-023-T19-1): la bandeja la propone como reporte del 2026-10-05 con las 37 personas y
  su hoja; reconoce a 2 (Catalina Chaparro y, por ser dato de prueba, «PRUEBA Wilfer García
  T13» para «WILFER GARCIA») y 35 quedan para «Registrar todas».
- **T20 (2026-10-07)**: `plantilla_reporte_whatsapp.md` pasa a la **versión 3** (la 2 queda en
  `plantilla_reporte_whatsapp_v2.md`): «| Vale: …» en cada viaje, con su regla (tal como está en
  el papel, «sin vale» si no tuvo, la foto del vale también sirve, repetido se avisa), el
  personal también en el Excel de horas extras (fecha del formato = día trabajado, .xls/.doc no
  se leen) y el almacén aparte con su plantilla. Para que «Vale: sin vale» no se tome como un
  número, la instrucción de la IA dice que «sin vale», «no», «—» o vacío es un viaje sin vale
  (workflow regenerado). `plantilla_reporte_almacen.md` queda como versión 1 (ya no borrador),
  con la aclaración de que el nombre del material tiene que ser igual.
