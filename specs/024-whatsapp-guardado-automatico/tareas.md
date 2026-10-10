# Tareas — Spec 024

Tareas de menos de 30 minutos, ordenadas por dependencia. Cada una lleva los RF que
cubre y una línea `Hecho cuando:` que se pueda comprobar sin interpretar.

**Se implementa una tarea cada vez** (`/sdd:implementar T1`), y al terminarla se para.
Ninguna tarea se marca sin `npm run verificar`, `npm run typecheck` y `npm run lint`
en verde.

Las tareas T1 a T5 son el cambio aprobado de la spec 021 (RF-104 a RF-111). Por eso sus RF se
escriben con «021/». T6 y T26 a T28 son del repo de la integración (`C:\dev\n8n-evolutionapi`):
ahí «los tres comandos» no aplican, y su «Hecho cuando» dice qué se comprueba.

### Reconocer bien un viaje (cambio de la 021)

- [x] T1. Placa tolerante en `reconocerVehiculo`, con los pares O/0, I/1, S/5, B/8 y Z/2, y sus
      casos en `verificar-reglas.ts`. (021/RF-107, 021/RF-108)
      Hecho cuando: «TFO42O» reconoce TFO420; «LLQ37T» no reconoce nada; una placa que con los
      pares coincide con dos equipos no reconoce ninguno; y los tres comandos están en verde.
- [x] T2. Material y sitios de cantera con comparación compacta y sin «cantera», «el», «la» ni
      «c.», con sus casos. (021/RF-110, 021/RF-111)
      Hecho cuando: «Sub-base» reconoce SUBBASE y no SUBBASE DE RIO; «Cantera FORTUNE» y «C.
      Fortune» reconocen LA FORTUNE; «Cantera el portón de la Vega» sigue reconociendo PORTON DE
      LA VEGA; y los tres comandos están en verde.
- [x] T3. `conductor` y `hora_foto` en el contrato `propuestaIa`; `conductorEscrito` y
      `conductorPor` en `ViajeDelReporte`; `conductorDelViaje` con los cuatro caminos, en una
      función pura que recibe los preoperacionales del día y el último conductor de cada
      volqueta, con sus casos. (021/RF-104, 021/RF-105, 021/RF-106; RF-16)
      Hecho cuando: los casos (escrito; por la maquinaria del reporte; por el preoperacional;
      preoperacional con dos personas → siguiente camino; por el último viaje; ninguno) pasan, un
      reporte guardado antes de esta tarea sigue leyéndose igual, y los tres comandos están en
      verde.
- [x] T4. `catalogos.ts`: `catalogosDeLaObra` sacado de `bandeja.ts`, más los preoperacionales
      del día por volqueta y el último conductor vigente por volqueta. La bandeja lo usa.
      (021/RF-105)
      Hecho cuando: el detalle de PRUEBA-T21-1 en desarrollo responde lo mismo que antes, un viaje
      de prueba con una volqueta que tiene preoperacional ese día trae su conductor, y los tres
      comandos están en verde.
- [x] T5. La propuesta del panel muestra de dónde salió el conductor («del preoperacional»,
      «del último viaje»). (021/RF-109)
      Hecho cuando: en Chrome, en la propuesta de un vale de prueba sin nombre de conductor, se ve
      el conductor con su origen, y los tres comandos están en verde.
- [x] T6. n8n: `hora_foto` en el esquema de `generar_workflow_clasificar.py` (el `conductor`, la
      regla de la hora y el catálogo del contexto ya están), y flujo importado en el n8n del VPS
      con los pasos de `DESPLIEGUE_VPS.md`. (021/RF-104; RF-16)
      Hecho cuando: el flujo regenerado tiene `conductor` y `hora_foto`; en el VPS, `n8n
      list:workflow --active=true` muestra los tres flujos; y un vale reclasificado del 7-oct
      trae `conductor` y una hora de la tarde.

### Datos

- [x] T7. Migración 0021:
      - estados `en_espera` y `guardado`;
      - columnas `fecha_hecho`, `tipo_reporte`, `procesado_en`, `error_proceso`, `intentos` y
        `resultado` en `whatsapp_mensajes`;
      - tablas `whatsapp_reportes_esperados`, `whatsapp_dias`, `whatsapp_excepciones` y
        `whatsapp_creados`;
      - el usuario de sistema «IA WhatsApp».

      (RF-10, RF-32, RF-37, RF-55, RF-58, RF-60)
      Hecho cuando: `drizzle/servidor/0021_….sql` existe y está aplicada en neondb de desarrollo;
      el usuario de sistema existe una sola vez aunque se aplique dos veces su `insert`; y los
      tres comandos están en verde.

### Reglas puras (`whatsapp-automatico.ts`)

- [x] T8. `tipoDeReporte`, `completarViaje` y `placaRegistrable`, con sus casos. (RF-16, RF-17,
      RF-31, RF-38)
      Hecho cuando: un reporte solo con personal da `personal`; uno de laboratorio da
      `control_calidad`; un viaje sin hora toma `hora_foto` y, sin ella, la del mensaje en
      Colombia; sin destino toma la obra; «TFO4» no es registrable y «TFO420» sí; y los tres
      comandos están en verde.
- [x] T9. `viajeRepetido` y `viajesQueFaltan`, con sus casos. (RF-11 a RF-14)
      Hecho cuando: el mismo vale es repetido aunque cambie la hora; sin vale, la misma volqueta a
      29 min es repetido y a 31 no; un anulado no cuenta; «4 viajes» con 3 guardados da 1; y los
      tres comandos están en verde.
- [x] T10. `decisionDePersona` (reconocida, coincidencia única, crear, ambigua) y el cargo de la
      persona nueva, con sus casos. (RF-22 a RF-26)
      Hecho cuando: «Eddier Alberto Quinceno» con «Eddier Alberto Quiceno Jacome» registrado da
      coincidencia única («Eddier Quinceno», que comparte una sola palabra, da crear); un nombre que comparte dos palabras con dos personas da ambigua; un
      nombre sin parecidos da crear con cargo conductor si viene de un viaje y con el de su hoja
      si viene de un archivo; y los tres comandos están en verde.
- [x] T11. `diaCompleto`, `diaVencido` y `separarRenglones`, con sus casos. (RF-19, RF-20, RF-39
      a RF-41, RF-46, RF-47)
      Hecho cuando:
      - `diaCompleto`:
        - con la lista vacía, el primer mensaje basta;
        - un domingo de una obra que no trabaja domingos, también;
        - con autor indicado, el reporte de otra persona no cuenta;
      - `diaVencido` es falso a las 11:59 del día siguiente y verdadero a las 12:00;
      - `separarRenglones` deja en excepción solo el renglón que falta;
      - los tres comandos están en verde.

### Servidor

- [x] T12. `actor.ts` y la división de `aprobacion.ts` en `guardarViajes`, `guardarEnBitacora` y
      `marcarMensaje`, con actor; `aprobarPropuesta` queda como envoltorio. (RF-10, RF-44, RF-71)
      Hecho cuando: aprobar desde el panel en desarrollo hace lo mismo que antes (repetir la
      aprobación de una propuesta de prueba crea lo mismo y nada más); una llamada con el actor
      de sistema deja `registrado_por` = «IA WhatsApp»; y los tres comandos están en verde.
- [x] T13. `creacion.ts`: personas, volquetas, materiales y sitios de cantera y materiales de
      almacén, con id fijo por obra y nombre (o placa), anotados en `whatsapp_creados`.
      (RF-22, RF-25 a RF-32)
      Hecho cuando: crear dos veces a «PRUEBA Conductor 024» desde dos mensajes deja una sola
      persona con cargo conductor y una fila en `whatsapp_creados`; la volqueta «PRB024A» queda
      como `WA-PRB024A`, tipo volqueta, operativa y en la obra; y los tres comandos están en verde.
- [x] T14. `automatico.ts` (`procesarMensaje`) para cantera y almacén, llamado desde la ruta de
      mensajes, con `WHATSAPP_GUARDADO_AUTOMATICO`. (RF-1 a RF-4, RF-6 a RF-10, RF-15, RF-16 a
      RF-21, RF-70, RF-72)
      Hecho cuando:
      - con curl en desarrollo, 4 vales `PRUEBA-024-…` quedan en Control Cantera en menos de un
        minuto con conductor y la marca «desde WhatsApp»;
      - reenviar uno no crea otro viaje;
      - uno con la placa cortada queda en `whatsapp_excepciones`;
      - un reporte de almacén queda en Almacén y no en la bitácora;
      - con la variable en 0, todo queda `pendiente` como hoy;
      - los tres comandos están en verde.
- [x] T15. `dias.ts`: mensajes que van a la bitácora quedan `en_espera`; `actualizarDia`,
      `armarBitacora` y la foto del día. (RF-5, RF-43 a RF-45, RF-47, RF-49 a RF-54, RF-73)
      Hecho cuando:
      - con una lista de dos reportes esperados en la obra de pruebas, el primero deja el día
        `en_espera` y el segundo arma la bitácora abierta, con las dos fuentes juntas y la foto
        del día;
      - un tercero de ese día entra en ese momento;
      - uno de un día con la bitácora cerrada queda en excepción, y sus viajes, en Control
        Cantera;
      - los tres comandos están en verde.
- [x] T16. `pulso.ts` y `POST /api/integraciones/whatsapp/pulso`: días vencidos, pendientes en
      lotes de 30 y reintentos con tope de 5. (RF-46, RF-47, RF-68)
      Hecho cuando:
      - con curl, un día de prueba con la hora límite pasada queda `incompleta` con lo que faltó;
      - 40 pendientes de prueba se procesan en dos pulsos;
      - un mensaje que falla 5 veces queda en excepción «no se pudo procesar»;
      - los tres comandos están en verde.
- [x] T17. Rutas del panel: estado del día, «Guardar con lo que hay» y reportes esperados, con
      los permisos `whatsapp:configurar` y `whatsapp:atender`. (RF-37, RF-42, RF-48, RF-55 a
      RF-57)
      Hecho cuando:
      - con curl, gerencia cambia la lista y el residente recibe 403 al intentarlo;
      - el residente lee el estado de su obra y 404 en otra;
      - «armar» de un día en espera da 200, y repetido da 409;
      - los tres comandos están en verde.
- [x] T18. Rutas de «No se pudo guardar»: listar, guardar un renglón completado y descartarlo
      con motivo. (RF-60 a RF-63)
      Hecho cuando: con curl, el viaje de la placa cortada se completa con una volqueta y queda en
      Control Cantera; otro se descarta con motivo y sin motivo da 400; repetir cualquiera da 409;
      y los tres comandos están en verde.
- [x] T19. Rutas de «Creado automáticamente»: listar, revisado y «Es el mismo que…» (unir, sin
      tocar lo que está en bitácoras cerradas). (RF-33 a RF-36)
      Hecho cuando:
      - con curl, «PRUEBA Conductor 024» unido a otra persona deja sus viajes vigentes y sus
        renglones de bitácoras abiertas apuntando a la otra, y queda dado de baja;
      - un viaje de una bitácora cerrada no cambia y la respuesta lo avisa;
      - los tres comandos están en verde.

### Panel

- [x] T20. Pestaña «Historial»: la lista de mensajes con qué se guardó y dónde, con enlaces, y
      la propuesta de solo lectura. (RF-58, RF-59)
      Hecho cuando: en Chrome, cada vale de prueba muestra «Guardado en Control Cantera» con el
      enlace a su viaje, el reporte de almacén enlaza a Almacén, y los tres comandos están en
      verde.
- [x] T21. Pestaña «Estado del día» con «Guardar con lo que hay». (RF-48, RF-55 a RF-57)
      Hecho cuando: en Chrome, un día en espera muestra cada reporte esperado recibido o
      pendiente con autor y hora, el botón arma la bitácora, el día pasa a «incompleta», y los
      tres comandos están en verde.
- [x] T22. Pestaña «Reportes esperados» de la obra: gerencia agrega y quita; el residente solo
      la ve. (RF-37 a RF-42)
      Hecho cuando: en Chrome, gerencia agrega «reporte diario» con un autor del grupo y
      «personal», y el residente ve la lista sin botones; y los tres comandos están en verde.
- [x] T23. Pestaña «No se pudo guardar»: completar con los mismos selectores de la propuesta y
      guardar, o descartar con motivo. (RF-60 a RF-64)
      Hecho cuando: en Chrome, el residente completa la volqueta del viaje de la placa cortada y
      lo guarda, descarta otro con motivo, la lista queda vacía, y los tres comandos están en
      verde.
- [x] T24. Pestaña «Creado automáticamente», con revisado y «Es el mismo que…», y la marca
      «creado desde WhatsApp» en Personas, Vehículos y Control Cantera (sitios y materiales).
      (RF-32 a RF-36, RF-72)
      Hecho cuando: en Chrome, gerencia une «PRUEBA Conductor 024» con otra persona, marca como
      revisada la volqueta WA-PRB024A, ve la marca en Personas y Vehículos, el usuario «IA
      WhatsApp» no sale en Personas, y los tres comandos están en verde.
- [x] T25. Se quita «Aprobar» y «Descartar» de la propuesta normal; el permiso
      `whatsapp:aprobar` queda solo para lo anterior a esta spec. (RF-69, RF-70)
      Hecho cuando: en Chrome, un mensaje guardado no tiene botón de aprobar, uno aprobado antes
      de la spec se sigue viendo igual, y los tres comandos están en verde.

### Integración y despliegue

- [x] T26. n8n: flujo «OCC - Pulso PreOperaOCC» (cada 15 min, `POST …/pulso` con la credencial
      «PreOperaOCC integración»), generado por `scripts/generar_workflow_pulso.py`, probado en el
      PC sin arrancar su servidor. (RF-46, RF-68)
      Hecho cuando: el JSON se genera; ejecutado contra el panel de desarrollo responde
      `diasArmados` y `procesados`; y queda importado sin publicar.
- [x] T27. Despliegue en producción:
      - migración 0021;
      - imagen nueva con respaldo `preoperaocc:anterior`;
      - `WHATSAPP_GUARDADO_AUTOMATICO=1`;
      - flujo del pulso publicado en el VPS;
      - los pasos, en `DESPLIEGUE_VPS.md`.

      (RF-68)
      Hecho cuando: el primer pulso procesa los pendientes de la bandeja de producción; los 27
      vales del 7-oct de Consorcio Magdalena son 27 viajes en Control Cantera; y lo que no se
      pudo guardar sale en su pestaña.
- [x] T28. Validación final: recorrido RF por RF de la spec 024 y de 021/RF-104 a RF-111 + demo
      manual. (Todos)
      Hecho cuando: cada RF tiene su comprobación con resultado en `validacion.md`, los tres
      comandos están en verde y la spec queda marcada como Cumplida.

## Notas de ejecución

- T27 (2026-10-09): desplegado. Migración 0021 en `preoperaocc`; imagen nueva con respaldo
  `preoperaocc:anterior`; `WHATSAPP_GUARDADO_AUTOMATICO=1` en el `.env` y el `compose.yaml` del
  panel (el del repo también lo lleva, en 0 por defecto); pulso publicado en el n8n del VPS
  (cuatro flujos activos, WhatsApp conectado). Tres pulsos a mano procesaron 90 mensajes sin
  errores; quedan 17 pendientes para los pulsos programados. Los 27 vales de Dianny del
  2026-10-07 son 27 viajes en Control Cantera, todos con conductor. Para revisar en «Creado
  automáticamente»: «Eddier Quinceno» y «Wilfer Osorio» (nombres mal escritos en un vale),
  «ANDERSON DAZA», «DIEGO ARMANDO CARDONA» y los sitios «Vía las margaritas» y «vía margaritas
  bodegas» (son el mismo). En «No se pudo guardar» hay personal sin horas (reportes que solo
  listan nombres) y máquinas nombradas sin placa ni código (motoniveladora, recicladora,
  vibrocompactador, montacargas), que el reconocimiento de la 021 no identifica por su nombre.
  Pasos en `DESPLIEGUE_VPS.md` del repo de n8n.

- T26 (2026-10-09): `scripts/generar_workflow_pulso.py` genera `workflows/occ-pulso-preoperaocc.json`
  (id fijo OccPulsoPreOp001, cada 15 minutos, espera de 5 minutos, credencial «PreOperaOCC
  integración»). Importado en el n8n del PC sin publicar y ejecutado con la variante de desarrollo
  (URL host.docker.internal:8081): éxito, y el panel respondió `{ apagado: true }` porque el
  servidor de desarrollo no tiene `WHATSAPP_GUARDADO_AUTOMATICO=1`. La respuesta con `diasArmados`
  y `procesados` se probó en T16 llamando a la misma función; en T27 se ve contra producción.

- T25 (2026-10-09): los botones de corregir, aprobar, descartar, devolver y registrar personas
  no se borraron: se ocultan mientras `WHATSAPP_GUARDADO_AUTOMATICO=1` (el detalle trae
  `guardadoAutomatico`, que pone la ruta), y sus rutas responden 409 con el mismo interruptor.
  Con el interruptor apagado la bandeja vuelve a ser la de la 021: es la vuelta atrás del plan.
  Un mensaje pendiente con el interruptor encendido muestra que se procesa en el próximo pulso.
  Probado: con un script, el detalle dice `guardadoAutomatico` y «Aprobar» da 409 con el
  interruptor encendido; en Chrome, un mensaje guardado no tiene botones y uno aprobado antes
  se ve igual. El servidor de desarrollo de :8081 no tiene la variable puesta.

- T24 (2026-10-09): `creado-automaticamente.tsx` (quinta pestaña, con «Revisado» y «Es el mismo
  que…»), la marca `desdeWhatsapp` en las listas de Personas, Vehículos y los catálogos de
  Control Cantera, y «IA WhatsApp» fuera de Personas. Las opciones para unir son de la misma
  obra. Probado en Chrome como gerencia: «Anderson Daza Pruebas» unido con «PRUEBA Conductor
  T17» (1 viaje anulado y registrado de nuevo, 1 bitácora corregida), WA-PRB024B revisada, la
  marca en Personas y en Vehículos, e «IA WhatsApp» no aparece. La marca de los catálogos de
  cantera no se miró en Chrome (es la misma consulta).

- T23 (2026-10-09): `no-se-pudo-guardar.tsx`, cuarta pestaña. «Completar» abre una ventana con
  los campos de la sección (viaje, persona, máquina, clima, actividad, ensayo, almacén) y las
  opciones de la obra del mensaje, que salen de su detalle; las faltas del servidor se pintan en
  la ventana. Lo del mensaje entero ofrece «Reintentar». Probado en Chrome como gerencia: el vale
  PRUEBA-024-T23-1 (placa «PRB1») dio «✕ Elija la volqueta.» al guardarlo vacío y se guardó con
  PRUEBA-VOL-T17 a nombre de Diego; PRUEBA-024-T23-2 («XY») se descartó con motivo.

- T22 (2026-10-09): `reportes-esperados.tsx`, tercera pestaña del módulo. Gerencia elige la obra,
  agrega o quita reportes y elige quién los manda entre los autores del grupo; el residente ve
  la lista en texto, sin botones (lo que cambia la lista ya da 403 al residente, probado en T17).
  Probado en Chrome como gerencia: se agregó «Control de calidad» de Natalia Riaño, se guardó,
  se quitó y se volvió a guardar; en la base quedó de baja. La vista del residente no se miró
  en Chrome: habría que entrar con su sesión. En desarrollo Natalia sale dos veces en «Quién lo
  manda» porque escribió desde dos grupos de prueba con ids distintos.

- T21 (2026-10-08/09): `estado-del-dia.tsx` y las pestañas del módulo (botones «Historial» y
  «Estado del día»: el panel no tenía un componente de pestañas). Probado en Chrome como
  gerencia: el 2026-09-17 de «Pruebas spec 018» salía «En espera» con el reporte diario
  faltante y el de personal recibido con autor y hora; «Guardar con lo que hay» pidió
  confirmación diciendo qué faltaba, armó la bitácora y el día pasó a «Incompleta». Metro no
  recogía las rutas nuevas hasta tocarlas (`touch`).

- T20 (2026-10-08): la bandeja pasó a ser el «Historial» (abre en «Guardados»; estados nuevos;
  columna «Estado y dónde quedó» con botón «Ver bitácora», «Ver viajes» o «Ver almacén»). La
  fila trae `fechaHecho` y `resultado`. Las bitácoras y Control Cantera abren en `?fecha=` y
  `?obraId=` del enlace. Para no pasar de 888 puntos (spec 022) se juntaron «Grupo y obra» con
  el autor y «Estado» con «Dónde quedó»; el grupo se ve en el detalle. Probado en Chrome como
  gerencia: «Ver bitácora» abrió la del 2026-09-21 y «Ver viajes» los del 2026-10-08, ambos en
  «Pruebas spec 018».

- T19 (2026-10-08): `creados.ts` y las rutas `creados`, `…/:tipo/:id/revisado` y
  `…/:tipo/:id/unir`. RF-36 chocaba con RF-65 (un viaje no se edita): el usuario decidió anular
  y volver a registrar, y quedó como RF-75 y RF-76 en la spec. Probado como Natalia: «PRUEBA
  Conductor 024» unido a «PRUEBA Conductor T17» (viaje PRB-3 anulado y registrado de nuevo,
  bitácora del 2026-09-30 corregida, viaje PRB-T19-cerrado del 2026-10-07 sin tocar,
  `sinTocar: 1`), WA-PRB024A revisada, 409 al repetir. **Para producción:** el pulso registra
  solas a las personas del Excel de horas que siga pendiente (en desarrollo creó ~30 desde
  PRUEBA-023-T19-1); las que solo comparten una palabra con alguien existente quedan
  repetidas y se unen en «Creado automáticamente».

- T18 (2026-10-08): `excepciones.ts` y las rutas `excepciones`, `…/:id/guardar` y
  `…/:id/descartar`. Un viaje completado se guarda con el id de su renglón original; un renglón
  de bitácora o de almacén, con ids propios de la excepción (`claveDeIds` en
  `guardarEnBitacora` y `escribirReporteDeAlmacen`). Lo del mensaje entero (sin renglón) se
  «guarda» reintentando: vuelve a pendiente, y si falla de nuevo reaparece (`apartar` revive
  solo esas). Probado como Natalia: PRUEBA-024-T14-4 completado con PRT017 (vale PRB-4),
  PRUEBA-024-T14-8 descartado, 400/409 como pide la tarea; PRUEBA-024-T15-4 reintentado y
  reaparecido porque la bitácora del 2026-10-07 sigue cerrada. Límite conocido: si se reintenta
  un mensaje entero después de completar a mano uno de sus renglones de bitácora, ese renglón
  puede quedar dos veces (los ids son distintos a propósito).

- T17 (2026-10-08): `estado-dias.ts` (`leerDias`, `armarAMano`, `leerEsperados`,
  `guardarEsperados`) y las rutas `dias`, `dias/:obra/:fecha/armar` y `esperados`. Sin permisos
  nuevos: atender = `whatsapp:aprobar`, configurar = `requerirAdmin` (el plan quedó corregido).
  Probado con sesiones temporales de Diego (gerencia) y Natalia (residente): PUT 200 y 403,
  residente ve su obra y 404 en otra, «armar» del 2026-09-21 200 → `incompleta`, y 409 al
  repetir o en un día cerrado (2026-09-22). La lista de «Pruebas spec 018» quedó en reporte
  diario de «PRUEBA Oscar 024» + personal.

- T16 (2026-10-08): `pulso.ts` (con un filtro opcional por obra solo para probar; la ruta no lo
  usa) y `POST /api/integraciones/whatsapp/pulso`. Probado en «Pruebas spec 018»: día 2026-09-24
  armado `incompleta` por la hora límite; 40 pendientes nuevos + 11 viejos procesados en dos
  pulsos (34 s y 50 s: **en T26 el nodo HTTP de n8n necesita un tiempo de espera de varios
  minutos**); PRUEBA-024-T16-falla (fecha 2026-02-30) abandonado al quinto intento. De ahí
  salieron dos arreglos: una fecha que no existe en el calendario se toma como no leída
  (`resolverPropuesta`, con su caso) y el motivo del abandono va legible. Un mensaje sin destino
  queda pendiente pero procesado, para que el pulso no lo repita.

- T15 (2026-10-08): `dias.ts` (`actualizarDia`, `armarBitacora`), `apartados.ts` (`apartar`) y
  `placaDeLaMaquina` (RF-30 en una máquina: la placa colombiana escrita en el renglón; sin placa
  no se registra, y va a «No se pudo guardar»). Probado en «Pruebas spec 018»: lista de reportes
  esperados PRUEBA-024-T15-esp-1/2 (quedan puestos en esa obra), bitácora del 2026-09-30 armada
  sola con foto del día, PRUEBA-024-T15-1 a -4. Ojo: «PRUEBA Persona 024 Uno» se tomó como
  «PRUEBA Conductor 024» porque comparten dos palabras (RF-23 como está escrito).

- Cambio aprobado el 2026-10-08 (021/RF-112, 024/RF-18 y RF-74), implementado antes de T15: un
  conductor escrito que no se reconoce no se cambia por el del preoperacional ni el del último
  viaje (`conductorPropuesto` devuelve nulo y `automatico.ts` lo reconoce por parecido o lo
  registra). Probado: PRUEBA-024-T14-9 registró a «Anderson Daza Pruebas» como conductor;
  PRUEBA-024-T14-8 («PRUEBA Conductor Nuevo 024», parecido a dos personas de prueba) fue a «No
  se pudo guardar», como pide RF-24. 431 verificaciones.

- T14 (2026-10-08): `automatico.ts` (`procesarMensaje`, `anotarFalloDelProceso`) y la ruta de
  mensajes con `WHATSAPP_GUARDADO_AUTOMATICO`. Para no crear con dos parecidos (021/RF-108),
  las reglas tienen `candidatosDeVehiculo` y `candidatosEnCantera` (vacío = ninguno parecido),
  con su caso. `guardarViajes` recibe el renglón original de cada viaje para su id. Probado
  llamando al `POST` de la ruta con el token de desarrollo (el servidor de :8081 no se
  reinició): PRUEBA-024-T14-1 a -7 en «Pruebas spec 018», 2026-10-08. **Para el usuario:**
  con un conductor escrito que no existe, RF-105 toma antes el del último viaje de la volqueta
  que crear al escrito (RF-18); y un vale sin destino escrito va a la obra (RF-17), donde
  Control Cantera exige PR y metros: sin ellos va a «No se pudo guardar».

- T13 (2026-10-08): `creacion.ts` (`crearPersona`, `crearVolqueta`, `crearMaterialDeCantera`,
  `crearSitioDeCantera`, `anotarCreado`). El id sale de la obra y el nombre normalizado (o la
  placa). Si lo creado se unió con otro registro (RF-36), devuelve ese otro (`unido_a`): así
  un nombre mal escrito que vuelve a llegar no apunta a la persona dada de baja. El material
  de almacén nuevo lo sigue creando el lote de la 023; T14 lo anota con `anotarCreado`. Datos
  de prueba en desarrollo («Pruebas spec 018»): «PRUEBA Conductor 024», volqueta WA-PRB024A,
  material «PRUEBA Subbase 024» y sitio «PRUEBA Vía 024».

- T12 (2026-10-08): `aprobacion.ts` exporta `guardarViajes`, `guardarEnBitacora` y
  `marcarMensaje` (estado `aprobado` o `guardado`); `aprobarReporteDeAlmacen` recibe un actor.
  Datos de prueba en desarrollo, obra «Pruebas spec 018», bitácora abierta del 2026-10-08:
  PRUEBA-024-T12-1 (aprobado por Diego) y PRUEBA-024-T12-2 (guardado por «IA WhatsApp»), y un
  viaje con vale PRUEBA-024-T12 registrado por el sistema.

- T11 (2026-10-08): «los días que trabaja la obra según su horario» (RF-40) no sale de
  `tramosDelDia`, que para un domingo o festivo devuelve la jornada de referencia del recargo
  (spec 016): no se trabajan los domingos ni los festivos, y el sábado solo si la obra tiene
  jornada de sábado. Una falta de una sección entera (franjas de clima que se cruzan) aparta la
  sección; sin fecha no se guarda nada del mensaje.

- T10 (2026-10-08): el ejemplo de la tarea («Eddier Quinceno» = coincidencia) contradecía RF-23:
  comparte una sola palabra con «Eddier Alberto Quiceno Jacome», así que se registra nuevo (como
  dice el caso límite de la spec). El ejemplo pasó a «Eddier Alberto Quinceno». Además, un nombre
  cuyas palabras están todas en dos o más personas («Diego» con dos Diegos) se trata como ambiguo
  y no se registra: RF-24 no lo nombra, pero registrar un tercer «Diego» contradice RF-23.
  **Pendiente de confirmar con el usuario** (si lo acepta, va a la spec con `/sdd:cambio`).

- T8 (2026-10-08): el «Hecho cuando» decía que «TFO42» no era registrable, pero RF-31 dice
  «menos de cinco» y «TFO42» tiene cinco: manda la spec, y el ejemplo pasó a «TFO4». Para
  completar el destino sin inventarlo (RF-17) el viaje guarda lo escrito: `placaEscrita`,
  `materialEscrito`, `origenEscrito` y `destinoEscrito` (nulos por defecto en lo corregido
  antes); T13 los usa para crear lo que falte.

- T7 (2026-10-08): migración `0021_brown_toxin.sql` aplicada en neondb de desarrollo; el
  `insert` del usuario de sistema va escrito a mano al final del archivo (drizzle-kit no genera
  datos). Las listas cerradas viven en `shared/rules/whatsapp-automatico.ts`. `PropuestaFila`
  usaba los estados escritos a mano y ahora usa `EstadoMensajeWhatsapp`. Hasta T24, «IA
  WhatsApp» sale en la lista de Personas de gerencia (sin obra ni cargo).

- T4 (2026-10-08): al probar en desarrollo salió que el preoperacional del 18-sep de la
  volqueta XMY563 lo hizo una persona ya dada de baja, y se la proponía como conductor. La
  regla `conductorPropuesto` ahora solo propone a personas vigentes y, si no, pasa al camino
  siguiente: no cambia lo que la spec promete (RF-105 habla de reconocer a la persona), y tiene
  su caso en `verificar-reglas.ts`. Queda en desarrollo el mensaje de prueba PRUEBA-024-T4-1,
  pendiente, en el grupo real asociado a «Consorcio Antioquia».

- Dos detalles del plan que no cambian lo que la spec promete, pero que conviene que el usuario
  sepa:
  - un mensaje que falla al procesarse 5 veces seguidas pasa a «No se pudo guardar» (T16);
  - «Es el mismo que…» no reescribe lo que está en una bitácora cerrada, por el principio 4 de
    la constitución, y lo avisa (T19).
- Mientras «Vía las Margaritas – bodegas» no se aclare, se crea sola como sitio (RF-29) al
  procesar los vales del 7-oct. Si es un frente de la obra, conviene decirlo antes de T27, para
  que quede con destino «obra».
