# Tareas — Spec 040 Auxiliar Administrativa, asistente ampliado y archivos

> Plan aprobado el 2026-11-05. Se hace una tarea a la vez, y cada una termina con `npm run verificar`, `npm run typecheck` y `npm run lint` en verde.

## El acceso

- [x] T1. `rules/permisos.ts`, `catalogos/cargos.ts`, `rules/empresas.ts`, `rules/ficha.ts`. Pasos:
      - renombrar `auxiliar_rrhh` → `auxiliar_administrativa` («Auxiliar Administrativa», «la auxiliar administrativa»);
      - en la tabla de permisos: `compras` y `tesoreria` completos, `finanzas` con escribir y anular, `documentos` con anular, `asistente` con ver y listar;
      - `PUEDE_DAR` sigue siendo solo `operador`;
      - la entrada de la auxiliar es Compras de Elemental;
      - ajustar la prueba de la 035 (línea ~4517) y agregar 040/RF-1 a RF-12: la tabla de la auxiliar, `puedeCambiarRol`, la etiqueta y la entrada.

      (RF-1, RF-3 a RF-6, RF-8, RF-11, RF-12, D4, D5)
      Hecho cuando: `grep -rn "auxiliar_rrhh" src scripts` no devuelve nada fuera de `drizzle/`, y los tres comandos están en verde.
- [x] T2. `rules/compras.ts` y `rules/pagos.ts`: `recibir` acepta `compras·escribir`; `veElGasto` y `veLosPagos` incluyen a la auxiliar. Nueva regla del lugar del corte, `porQueNoPuedeTocarElCorte(rol, lugar)`: la gerencia en cualquier lugar, la auxiliar solo en Elemental. Con sus pruebas: `puedeDar` de cada paso de compra y de pago para la auxiliar, recibir, y el corte en Elemental, OCC, Geolab y una obra. (RF-4 a RF-7, D3)
      Hecho cuando: las pruebas nuevas pasan y los tres comandos están en verde.
- [x] T3. Esquema y migración `0039`, escrita a mano y aplicada **solo en dev**. Contenido:
      - `RENAME VALUE` del rol;
      - `UPDATE` del cargo;
      - `proposito_media` + `archivo_generado`;
      - `asistente_conversaciones.empresas`;
      - `asistente_mensajes.archivos` y `aclaracion`.

      (RF-2, RF-19, RF-24, RF-27)
      Hecho cuando: un script temporal confirma en dev el valor del enum, las auxiliares que ya existían con el rol nuevo y las tres columnas. El script se borra, y los tres comandos están en verde.
- [x] T4. Servidor del acceso:
      - `cortes+api.ts` y `cortes/[id]/anular+api.ts` llaman a la regla del lugar;
      - el 409 de aprobar dos veces dice «ya fue aprobada por …».

      Pantallas: `pantalla-finanzas.tsx` con botones según el lugar; búsqueda de `'admin'` y de los textos «lo aprueba la gerencia» en Compras, Tesorería y Documentos. (RF-4 a RF-10, casos límite)
      Hecho cuando: un e2e en dev con una auxiliar `PRUEBA-040` aprueba una solicitud de compra y una de pago, recibe 403 al anular un corte de OCC y 200 al anular uno de Elemental; la limpieza deja 0 filas, y los tres comandos están en verde.
- [x] T5. Revisión en Chrome con la auxiliar `PRUEBA-040`:
      - entra a Compras de Elemental;
      - aprueba, registra la compra y la recibe;
      - en Tesorería aprueba, registra el pago y lo anula con su motivo;
      - en Finanzas ve los cortes de OCC sin botones;
      - el historial dice su nombre;
      - en ningún lugar dice «Recursos Humanos» como nombre del acceso.

      (RF-1 a RF-11)
      Hecho cuando: cada punto se vio en Chrome y quedó anotado. Se limpia lo `PRUEBA-040`.

## El alcance del asistente

- [x] T6. `rules/asistente.ts`:
      - `ROLES_DEL_ASISTENTE` con la auxiliar;
      - `MODULOS_CONSULTABLES` con los 7 de empresa;
      - `AlcanceDelAsistente` con `empresas` y `bitacorasDeEmpresa`;
      - `alcanceDelAsistente` por cargo, según la tabla del plan;
      - `conversacionVisible` con empresas;
      - `ejemplosDePregunta(alcance)`.

      Pruebas: un caso por cargo; la auxiliar sin bitácoras ni almacén; el almacenista con solicitudes; una conversación con una empresa que ya no alcanza. (RF-12 a RF-16)
      Hecho cuando: las pruebas nuevas pasan, los llamadores compilan sin cambiar su comportamiento y los tres comandos están en verde.
- [x] T7. `herramientas.ts`: `ejecutar` recibe la sesión. `bitacora_de_occ` pasa a `bitacora_de_empresa` (OCC y Geolab). `conversaciones.ts` guarda y lee `empresas`. (RF-13, RF-15, RF-16)
      Hecho cuando: un e2e en dev con `ejecutarHerramienta` (sin IA) muestra que el laboratorista lee la bitácora de Geolab y recibe «no está a su alcance» para la de OCC, y los tres comandos están en verde.
- [x] T8. Consultas `solicitudes_de_compra` y `solicitudes_de_pago`, cada una con sus compras o sus pagos. Usan la misma lectura que la bandeja; si hace falta, esa lectura se saca a una función compartida. Respetan `veLosValores` y `veElValorDelPago`. (RF-13 a RF-15, RF-20)
      Hecho cuando: un e2e en dev sin IA muestra que la auxiliar ve las de todos los lugares, el residente solo las de su obra, el almacenista sin valores, y las cifras coinciden con la bandeja; los tres comandos están en verde.
- [x] T9. Consultas `cortes_financieros` (cortes y consolidado), `recursos_humanos` (personal, fichas, contratos por terminar, documentos por vencer; el salario solo si `veElSalario`) y `documentos_del_grupo`. (RF-13, RF-14, RF-20, D4)
      Hecho cuando: un e2e en dev sin IA muestra que la auxiliar y la gerencia ven el salario, el residente no, y el consolidado coincide con el de la pantalla; los tres comandos están en verde.
- [x] T10. Instrucciones de la IA en `conversacion.ts`: las consultas nuevas, «solo consulta» y qué responder cuando algo no está a su alcance. Prueba con la IA real en dev: la gerencia pregunta «¿qué compras están por aprobar?» y un residente pregunta por las compras de otra obra. (RF-13 a RF-17)
      Hecho cuando: las dos respuestas quedan anotadas (la primera con fuentes; la segunda «no está a su alcance», sin decir si existe) y los tres comandos están en verde.

## Archivos

- [x] T11. `rules/archivos-del-asistente.ts` (puro): `PedidoDeArchivo`, `faltasDelPedido` (5 000 filas, tabla vacía, formato), `aTabla`, `nombreDelArchivo`, `encabezadoDelArchivo`, `venceEl` y `vigente`, `textoParaPdf`. Con sus pruebas. (RF-18, RF-20 a RF-24)
      Hecho cuando: las pruebas pasan (incluido `vigente` en el día 30 y en el 31) y los tres comandos están en verde.
- [x] T12. `pdf-lib` y `jszip` en `package.json`. Los tres armadores, `archivos/excel.ts` (que reutiliza el escritor de Reportes), `pdf.ts` y `word.ts`, más el guion de humo `scripts/humo-archivos-040.ts`. (RF-21, RF-22, RNF)
      Hecho cuando: el guion genera los tres archivos de 5 000 filas con tildes, ñ, «m³», «°» y pesos en menos de 20 s cada uno; los tres se abren en Excel, Word y el lector de PDF sin errores, y los tres comandos están en verde.
- [x] T13. La consulta `generar_archivo`:
      - guarda los resultados del turno con `consultaId` y acepta `para_archivo`;
      - sube el archivo a R2 como `media` `archivo_generado`;
      - emite el evento `archivo` y guarda `archivos` en el mensaje.

      `media/[id]`: el archivo solo se entrega si la conversación sigue a su alcance y no han pasado 30 días. (RF-18 a RF-20, RF-23, RF-24)
      Hecho cuando: un e2e en dev genera un Excel desde una consulta guardada; una tabla de una consulta que no está en el turno se rechaza; la descarga da 200 al dueño, 404 a otra persona y 404 con la fecha vencida. Se limpia lo `PRUEBA-040` (filas y objeto en R2), y los tres comandos están en verde.
- [x] T14. Pantalla: `tarjeta-de-archivo.tsx` bajo la respuesta (formato, nombre, filas, «Descargar», vencido). Los contratos de eventos y mensajes llevan `archivos`. (RF-19, RF-24)
      Hecho cuando: en Chrome, con la IA real, «Hazme un Excel de las compras por aprobar» devuelve la tarjeta; el archivo descargado abre con las mismas cifras de la respuesta, y los tres comandos están en verde.

## Más fácil de usar

- [x] T15. Reglas: `loQueConsulta(alcance)`, `EJEMPLOS` por cargo (con al menos uno de archivo) y `descripcionDeLaConsulta(nombre, entrada)`. Con sus pruebas. (RF-25, RF-26, RF-29)
      Hecho cuando: las pruebas por cargo pasan y los tres comandos están en verde.
- [x] T16. Aclaraciones: la consulta `pedir_aclaracion`, que cierra el turno y guarda `aclaracion`, y el evento `aclaracion`. En la pantalla las opciones son botones que envían esa opción. (RF-27)
      Hecho cuando: en Chrome, con la gerencia, «¿Cuántos viajes hubo ayer?» sin decir la obra muestra opciones de obras, y tocar una responde de esa obra; los tres comandos están en verde.
- [x] T17. Pantalla del inicio y de la espera:
      - «Puede consultar…» por cargo;
      - los ejemplos escriben la pregunta en el campo, sin enviarla;
      - `recuadro-del-inicio.tsx`;
      - «Leyendo las solicitudes de compra de octubre…» mientras trabaja.

      Revisión en Chrome a 1366 px y a 390 px con la gerencia, la auxiliar y un residente. (RF-25, RF-26, RF-28, RF-29)
      Hecho cuando: los tres cargos se ven en los dos anchos sin desbordes, la consola no muestra errores y los tres comandos están en verde.

## Cierre

- [x] T18. Validación final: la demo de la spec con `PRUEBA-040`. La auxiliar aprueba, registra y anula, pide «las compras por aprobar» y su Excel. Un residente pide el PDF de la bitácora de su semana y no logra ver las compras de otra obra. Se escribe `validacion.md` RF por RF, se hace la limpieza acotada y se anota la 0039 en la T23 de la 033. (Todos)
      Hecho cuando: cada RF tiene su comprobación con resultado, los tres comandos están en verde y la spec queda marcada como Cumplida.

## Notas de ejecución

- 2026-11-05 (T1): `auxiliar_rrhh` → `auxiliar_administrativa` en `permisos.ts` (ROLES, `ETIQUETA_ROL` «Auxiliar Administrativa», `QUIEN_ES` «la auxiliar administrativa», `PUEDE_DAR` solo operador, `MODULO_DEL_ROL`, `rolVeTodasLasObras`), `cargos.ts` (id y nombre), `empresas.ts` (`EMPRESAS_DEL_ROL`, `EMPRESA_DEL_ROL`, `ACCESOS_SIN_OBRA`: «La Auxiliar Administrativa es de Elemental.») y `ficha.ts` (`veElSalario`). En la tabla, `compras` y `tesoreria` quedan completos, y `documentos` suma anular. Entrada: `destinoAlEntrar` → `/panel/elemental/compras`, y `rutaNueva` de las rutas de obra antiguas también va ahí. **Dos cambios de orden respecto a la tarea:** `finanzas` (escribir y anular) se abre en la **T2**, junto con la regla del lugar del corte, porque abrirlo antes dejaría a la auxiliar anular cortes de OCC en dev. `asistente` (ver y listar) se abre en la **T6**, junto con `ROLES_DEL_ASISTENTE`, porque antes vería el menú de un asistente que no la deja preguntar. Pruebas: se ajustaron las de 033/RF-51, 034/RF-4 (documentos), 035/RF-8 a RF-11, 036 y 037 (aprobar, registrar y anular ahora «lo hacen la gerencia y la auxiliar administrativa») y la de cargos. Se agregaron 5 de la 040 (RF-1 a RF-6, RF-8, RF-10, RF-11, D2, D4, D5). 661 verificaciones; typecheck y lint en verde. **Ojo hasta la T3:** la base de dev todavía tiene el valor `auxiliar_rrhh` en el enum, así que una auxiliar que exista en dev no entra bien hasta aplicar la 0039. Para la T4 quedan los comentarios que dicen «la auxiliar de RR. HH. consulta, sin botones» en Compras, Tesorería, Finanzas, Gasto, Pagos y Documentos (`documentos.ts:30` dice que anular es solo de la gerencia: revisar si tiene su propia comprobación).
- 2026-11-05 (T2): `rules/cortes.ts`: `LugarDelCorte` y `porQueNoPuedeTocarElCorte(rol, lugar)`. La gerencia pasa en todos los lugares y la auxiliar solo en Elemental. El rechazo dice «Solo la gerencia registra o anula los cortes de OCC / Geolab / las obras.». En la tabla, `finanzas` de la auxiliar suma escribir y anular, lo que había quedado pendiente desde la T1. `rules/compras.ts`: `TAMBIEN_CON.recibir = compras·escribir`, así la auxiliar recibe sin `solicitudes·escribir` y no puede pedir. `veElGasto` y `veLosPagos` incluyen a la auxiliar. **Adelanté de la T4** la regla en `POST /api/panel/cortes` y en `POST /cortes/:id/anular` (nuevo `lugarDelCorte(id)`; 404 si no hay corte vigente y 403 fuera de Elemental), y los botones de `pantalla-finanzas.tsx` (`enSuLugar`): sin eso, abrir el permiso dejaba en dev la puerta abierta para anular un corte de OCC. Pruebas: se ajustaron 033/RF-34 (finanzas), 036/RF-20 (recibir), 036/RF-27 (gasto), 037/D9 (pagos) y 037/RF-24 (cortes), y se agregaron 040/RF-7 y 040/RF-5, RF-6. 663 verificaciones; typecheck y lint en verde. La comprobación contra la base (403 y 200 al anular) va en el e2e de la T4.
- 2026-11-05 (T3): Esquema: `proposito_media` + `archivo_generado`, `asistente_conversaciones.empresas` (jsonb `EmpresaId[]`), `asistente_mensajes.archivos` (`ArchivoDelAsistente[]`) y `aclaracion` (`AclaracionDelAsistente`, nulable). Los tipos `FORMATOS_DE_ARCHIVO`, `ArchivoDelAsistente` y `AclaracionDelAsistente` van en `rules/asistente.ts`. El rol sale de `ROLES`, así que el cambio del enum vino de la T1. drizzle-kit generó `0039_deep_stardust.sql` con DROP TYPE y CREATE TYPE más un cast, que falla con filas `auxiliar_rrhh`, y **se reescribió a mano**: `RENAME VALUE`, `UPDATE usuarios.cargo`, `ADD VALUE IF NOT EXISTS 'archivo_generado'` y las tres columnas. Al volver a generar sale «No schema changes». Aplicada **solo en dev** (`neondb`; la ruta comprobó el nombre de la base antes de leer): antes había 39 migraciones y ahora 40; el enum, el propósito y las tres columnas se comprobaron con un script temporal de solo lectura, que ya se borró. En dev **no había ninguna auxiliar**, así que la conservación de filas (RF-2) no se vio con datos: queda para el e2e de la T4, que crea `PRUEBA-040` con el rol nuevo, y para la T23, donde producción sí puede tener auxiliares. **Para la T23:** producción migra con `scripts/migrar-produccion.ts` (base `preoperaocc`), 0031→0039 en orden y antes de la imagen nueva. 663 verificaciones; typecheck y lint en verde.
- 2026-11-05 (T4): **Aviso de quién decidió:** regla pura `yaLaDecidioOtro(pasoPedido, ultimo, yo)` en `rules/compras.ts`, que usan compras y pagos. Cuando quien llega tarde intenta aprobar, rechazar o devolver y lo último fue una decisión de otra persona, responde «Esta solicitud ya fue aprobada/rechazada/devuelta por …». `darPaso` y `darPasoDePago` la consultan solo en sus tres 409: el estado que ya no permite el paso, la versión vieja y `tomarLaVersion` perdida (`conflictoDeSolicitud`, `conflictoDePago`). Prueba 040/RF-9. **Revisión de Compras, Tesorería y Documentos:** no quedaba ningún `'admin'` escrito a mano; todo sale de la tabla y de `puedeDar`. Documentos anula con `alcanza(modulo, 'anular')`, y el lugar lo sigue limitando `documentoAlAlcance`. Se corrigieron 17 comentarios que decían que la auxiliar «consulta sin botones», y el texto visible de Información financiera: «los cortes que registra la gerencia» → «sus cortes financieros». Ya no queda «auxiliar de RR. HH.» en `src` ni en `scripts`. **e2e en dev** (`_tmp-040-t4.ts`, con guardia de `neondb`; usuarios `PRUEBA-040` Auxiliar y Gerencia, sesiones reales, solicitud de compra de «Pruebas spec 018», solicitud de pago de OCC y cortes con fecha 2020-01-15/16), 10 ✓:
  - la sesión lee el rol nuevo;
  - la auxiliar aprueba la compra y el pago;
  - la gerencia, tarde, recibe 409 «…ya fue aprobada por PRUEBA-040 Auxiliar.» en los dos;
  - el historial guarda a la auxiliar;
  - en las rutas reales: anular un corte de OCC da 403, uno de Elemental da 200; registrar uno de Geolab da 403, uno de Elemental da 201.

  Limpieza por id: 0 filas, y una búsqueda por `PRUEBA-040` también dio 0. Los scripts se borraron. La primera corrida falló al crear el pago (el concepto es un catálogo: `otro`) y también limpió 0. Lo de la T2 (rutas y botones de cortes) quedó comprobado aquí. 664 verificaciones; typecheck y lint en verde.
- 2026-11-05 (T5): Chrome en dev (:8081) con la auxiliar `prueba-040-aux`. Los datos se prepararon con un script temporal: usuarios, credencial, SC-0549 de «Pruebas spec 018», SP-0521 de OCC y cortes de OCC y Elemental del 15-ene-2020. Lo que se vio:
  - Al ingresar entra directo a **Compras de Elemental**. El encabezado dice «PRUEBA-040 Auxiliar · Auxiliar Administrativa» y aparece la pestaña Gasto.
  - SC-0549 muestra Aprobar, Devolver para corregir y Rechazar. Aprobó (2 m3), registró la compra a «PRUEBA-040 Arenas» por $95.000 y recibió 2 m3; la solicitud quedó «Recibida».
  - La Historia muestra «PRUEBA-040 Auxiliar» en aprobar, registrar y recibir.
  - Tesorería muestra la pestaña **Pagos**. SP-0521: aprobó $250.000, registró el pago (sin comprobante, que es opcional, así que no se subió nada a R2) y lo anuló con su motivo; quedó tachado con «Anulado por PRUEBA-040 Auxiliar: …», y la solicitud volvió a «Aprobada».
  - Cortes: en Elemental hay formulario y Anular; anuló el corte y quedó «Anulado por PRUEBA-040 Auxiliar». En **OCC** ve el corte y el historial, **sin formulario ni Anular**.
  - Gasto muestra $95.000 en Pruebas spec 018. Pagos muestra $0, que es correcto porque el pago estaba anulado.
  - Consola sin errores. En ningún lugar se nombra el acceso como «Recursos Humanos».

  Limpieza por id (`limpiar`): 0 filas, y la búsqueda por PRUEBA-040 en usuarios, cortes, solicitudes, compras y pagos también dio 0. Scripts y JSON borrados. El servidor de dev quedó encendido en :8081.
- 2026-11-05 (T6): `rules/asistente.ts`:
  - **Roles y módulos.** `ROLES_DEL_ASISTENTE` + la auxiliar. `MODULOS_CONSULTABLES` + los 7 de empresa (`satisfies ModuloConPermiso[]`), con los tipos `ModuloDeEmpresaConsultable` y `ModuloDeObraConsultable`.
  - **Lo de empresa por cargo.** `DE_EMPRESA_DEL_ROL` es la lista de RF-13 a RF-15, cruzada con la tabla (`listar`), que sigue siendo la cerradura. No es «todo lo que lista»: el residente lista RR. HH. y Documentos de su obra, pero RF-15 solo le da las solicitudes.
  - **El alcance.** Suma `empresas` (de `alcanzaLaEmpresa`, entre Elemental, OCC y Geolab) y `bitacorasDeEmpresa` (OCC y Geolab), que reemplaza `bitacoraDeOcc`. `alcanceDelAsistente` usa `rolVeTodasLasObras` (gerencia, Encargado y auxiliar). Sin obra, quien tiene empresa (el laboratorista en Geolab) conserva lo de la empresa; el residente sin obra, nada (028/RF-10).
  - **Otras funciones.** Nuevo `empresaAlAlcance`. `LoQueConsulto.empresas` es **opcional**: las conversaciones de antes no lo traen, y los llamadores lo pasan desde la T7. `modulosDeAnulados` y los mapas `NOMBRE_DEL_MODULO` y `RUTA_DEL_MODULO` de herramientas solo con los de obra.
  - **La auxiliar.** Su alcance: obras «todas», módulos `personas` (su RR. HH. de las obras), compras, tesorería, finanzas, rrhh y documentos; empresas solo Elemental; sin bitácoras. `permisos.ts`: `asistente` de la auxiliar = ver y listar (pendiente desde la T1). `empresas.ts`: `/panel/asistente` de antes la lleva a `elemental/asistente`.
  - `herramientas.ts`: `bitacora_de_occ` mira `bitacorasDeEmpresa.includes('occ')`. **No cambia lo que se ofrece hoy**, porque ninguna consulta tiene todavía un módulo de empresa.

  **Para la T7:** según la 038 Geolab **no arma bitácora** (RF-28). *(Corregido en la T7: su «Bitácora» no son los Reportes de WhatsApp, sino el laboratorio de las bitácoras de todas las obras, 038/RF-27, `laboratorioDeLasObras`.)* **Para la T15:** la prueba 028/RF-74 exceptúa a la auxiliar, que no tiene ejemplos porque ninguno de sus módulos los tiene todavía. Ofrecerle preguntas que el asistente aún no responde sería peor; la excepción se quita en la T15.

  Pruebas: se ajustaron 028/RF-1 a RF-5, RF-10 y RF-74, 034 (Encargado), 035/RF-8 a RF-11 (menú con Asistente) y 038/RF-31; nuevas 040/RF-12 a RF-15 y 040/RF-16. 666 verificaciones; typecheck y lint en verde.
- 2026-11-05 (T7): `herramientas.ts`:
  - **La sesión.** `Herramienta.ejecutar(entrada, alcance, sesion)` y `ejecutarHerramienta(…, sesion)`: la sesión llega desde `preguntar.ts` → `responderPregunta` (`PreguntaAlAsistente.sesion`). `ResultadoDeHerramienta.consulto.empresas` es opcional.
  - **`bitacora_de_occ` → `bitacora_de_empresa`**, con `{ empresa: occ|geolab, fecha?, desde?, hasta?, obra? }`, módulo `bitacora_empresa`. Se ofrece si `bitacorasDeEmpresa` no está vacío; la descripción nombra solo las que alcanza (RF-83).
  - **OCC** es lo de antes (`bitacoraDeOccDelDia`): pide la fecha, y lo consultado pasa de `bitacoras` a `bitacora_empresa` + `empresas: ['occ']`.
  - **Geolab** usa `laboratorioDeLasObras(sesion, 'geolab', …)`, la misma función que su pantalla. Rechaza más de 92 días, y sin fechas da los últimos 30. Lo consultado lleva `empresas: ['geolab']` y **ninguna obra**: la pantalla le muestra todas al laboratorista, y guardarlas le escondería su propia conversación.

  `conversacion.ts` junta las empresas. `conversaciones.ts` las une en `asistente_conversaciones.empresas` (misma sentencia atómica que obras y módulos) y las pasa a `conversacionVisible` en la lista; `preguntar.ts` hace lo mismo. `pantalla-asistente.tsx`: «Consultando la Bitácora de la empresa…». **e2e en dev sin IA** (`_tmp-040-t7.ts`), 15 ✓:
  - al laboratorista se le ofrece la consulta solo con Geolab y lee 19 ensayos; la de OCC le responde «no está a su alcance»;
  - 309 días se rechazan;
  - el Encargado de OCC lee la de OCC; sin fecha se le pide el día, y Geolab le responde «no está a su alcance»;
  - la gerencia lee la de Geolab;
  - una conversación guardada registra `["geolab"]`: el laboratorista la ve entera y, con el alcance del Encargado, sale solo el título.

  Limpieza por id: 0 filas; script borrado. 666 verificaciones; typecheck y lint en verde.
- 2026-11-05 (T8): `herramientas.ts`: `solicitudes_de_compra` y `solicitudes_de_pago`, con la misma entrada: `lugar`, `estado`, `solo_urgentes`, `desde`, `hasta`, `texto`, `numero`.
  - **Quién ve qué.** Quien tiene `compras` o `tesoreria` en el alcance y la tabla (gerencia y auxiliar) lee **la bandeja del grupo**, `bandejaDelGrupo` o `bandejaDeTesoreria` con el resumen; lo consultado es `{ modulos: [compras|tesoreria], empresas: [elemental] }`. Los demás leen **su lugar**, `solicitudesDelLugar` o `solicitudesDePagoDelLugar` + `pasaLosFiltros*`. El lugar lo comprueba `lugarDeLaSolicitud`; si es ajeno, responde «no está a su alcance». Sin `lugar` va el único propio (empresa OCC o Geolab, u obra si alcanza Proyectos); con varios, se le pide elegir.
  - **El detalle.** Con `numero` va el detalle: `solicitudAlAlcance` + `solicitudDe`, o lo de pago, sin `pasos` ni `version`, porque el asistente no da pasos (RF-17).
  - **Nada repetido.** Los valores ocultos al almacenista los quitan esas funciones. Filtros y rangos como en las rutas (`rangoDeFechas`); un estado que no existe se rechaza con la lista. `pantalla-asistente.tsx` tiene los dos nombres para el «Consultando…».

  **e2e en dev sin IA** (`_tmp-040-t8.ts`; gerencia PRUEBA-040 pide SC de «Pruebas spec 018», SP de esa obra y SP de OCC), 16 ✓:
  - la auxiliar ve la SC, y lo que ve coincide con su bandeja en códigos, valores y resumen; el total sin filtros también;
  - funcionan los filtros de estado y urgencia; el detalle por número trae renglones e historia, sin pasos;
  - el residente de la obra la ve con su valor; el de otra obra recibe «no está a su alcance» y no la ve en la suya; el almacenista la ve sin valor; el residente no alcanza OCC;
  - en pagos, la auxiliar ve las dos igual que Tesorería, el Encargado solo la de OCC, el almacenista la de su obra sin valor, y el detalle por número funciona.

  Limpieza por id: 0 filas; script borrado. 666 verificaciones; typecheck y lint en verde.
- 2026-11-05 (T9): `herramientas.ts`:
  - **`cortes_financieros`** (módulo `finanzas`). Sin lugar, `consolidadoDelGrupo()`; con lugar (`elemental|occ|geolab|obraId`), `cortesDe` con la diferencia del último. Lo consultado es Elemental/finanzas, porque es la pestaña Cortes de su Tesorería; la auxiliar ve los de todos (D3).
  - **`recursos_humanos`** (módulo `rrhh`). Siempre lee `personalDelLugar(sesion, Elemental)`, el personal del grupo de su pantalla, y el lugar es un filtro con la misma regla de cada pantalla (empresa = `p.empresa`, obra = `p.obraId`). Así la auxiliar, que no entra a OCC ni a las obras, consulta igual. Tiene `solo_con_avisos` y `texto`, y con `persona` (nombre o documento, una sola) devuelve `fichaDe`. El salario lo quitan esas funciones a quien no lo ve (D4).
  - **`documentos_del_grupo`** (módulo `documentos`). El lugar lo comprueba `duenoDelPedido`, como su pantalla, y la lista sale de `documentosDelLugar`. Sin lugar va la única empresa propia; a la gerencia se le pide el lugar. Los anulados salen solo si se piden. La descripción nombra solo la empresa que alcanza (RF-83).
  - A las listas se les quitan ids, `mediaId`, `mime` y `version`. `pantalla-asistente.tsx` tiene los tres nombres del «Consultando…».

  **e2e en dev sin IA** (`_tmp-040-t9.ts`; persona PRUEBA-040 de «Pruebas spec 018» con ficha, salario $2.100.000 y fin de contrato el 20-nov, y cortes PRUEBA-040 de OCC del 10-feb y 10-mar de 2020 y de la obra). En dev no había fichas ni cortes, así que sin estos datos la prueba del salario no probaba nada. 20 ✓:
  - las tres consultas se ofrecen a la gerencia y a la auxiliar, y no al residente ni al Encargado;
  - el consolidado coincide con `consolidadoDelGrupo` (2 con corte, saldo $2.000.000);
  - los cortes de OCC dan la diferencia del último: +$400.000;
  - el personal coincide con la pantalla (59); la auxiliar y la gerencia ven el salario de $2.100.000 y el aviso «Contrato termina en 15 días»; funcionan los filtros por obra, avisos y documento; `persona` trae la ficha con el salario;
  - el residente no alcanza RR. HH. ni los cortes;
  - la auxiliar consulta los documentos de Elemental, y los de OCC no están a su alcance; la gerencia consulta los de una obra, y sin lugar se le pide.

  Limpieza por id: 0 filas; script borrado. 666 verificaciones; typecheck y lint en verde.
- 2026-11-05 (T10): **Instrucciones** (`conversacion.ts`): el asistente es del grupo (Elemental, OCC, Geolab y las obras) y responde, según el cargo, sobre solicitudes, compras, pagos, cortes, RR. HH. y documentos. Reglas nuevas:
  - «por aprobar» = estado enviada;
  - un valor que la consulta no trae no se deduce;
  - «no está a su alcance» también para empresas;
  - responde «del grupo y sus obras».

  El contexto le dice a qué empresas entra quien pregunta.

  **DEFECTO hallado y corregido.** Con la IA real, la API rechazó **todas las preguntas de la gerencia** con un 400: «too many optional parameters (27), limit 24». Al pasarlas a `.nullable()`, rechazó por la otra cota: «27 parameters with union types, limit 16». Las consultas nuevas pasaron a la convención de las de antes:
  - todos los campos obligatorios;
  - los textos van **vacíos** cuando no aplican (`TEXTO_O_VACIO`);
  - las fechas usan `FECHA_O_VACIA` (`^(AAAA-MM-DD)?$`);
  - los sí/no son obligatorios.

  Conteo por rol con `herramientasPara`: 0 opcionales y 0 uniones en todos (gerencia: 18 consultas). **Para la T13 y la T16** (`generar_archivo`, `pedir_aclaracion`): respetar esta convención; los límites suman todas las consultas de un rol. Aparte, fuera de alcance: ese 400 se le muestra a la persona como «puede que la cuenta de Anthropic no tenga saldo» (`mensajeDeFalloDeIa`), lo que confunde; conviene un mensaje para el 400 en otra spec.

  **Prueba con la IA real** (`_tmp-040-t10.ts` con `responderPregunta`, sin guardar conversación ni gastar cupo; SC PRUEBA-040 enviada, urgente, $1.850.000):
  - **Gerencia, «¿Qué compras están por aprobar?»** → consulta `solicitudes_de_compra` y responde «Hay 1 solicitud de compra por aprobar en todo el grupo, y es urgente», con una tabla (SC, obra, renglones, para qué, 12-nov-2026, $ 1.850.000, quién la pidió). Fuente «Compras de Elemental → /panel/elemental/compras». Cierra con «para aprobarla hay que entrar al módulo de Compras… yo solo puedo consultar» (RF-17).
  - **Residente de Consorcio Antioquia, por las de «Pruebas spec 018»** → «Esa información no está a su alcance.», sin decir si existen, y ofrece las de su obra (RF-16).

  **Tiempos:** la primera vez, 153 s y 86 s (la API compila el esquema de las consultas nuevas). Después, gerencia 37,5 s y 29,4 s y residente 3,7 s y 6,3 s; antes de la 040, el residente tardaba unos 17 s. **El RNF «tarda lo mismo que hoy» queda por medir en la T18**, con preguntas de antes de la gerencia: ~30 s con una consulta y una tabla parece alto. Limpieza: 0 filas en cada corrida (4 corridas, SC-0552 a SC-0555). Script borrado. 666 verificaciones; typecheck y lint en verde.
- 2026-11-05 (T11): nuevo `src/shared/rules/archivos-del-asistente.ts`, puro, sin librerías de archivos:
  - **Constantes:** `FILAS_MAXIMAS_POR_ARCHIVO = 5000`, `DIAS_DE_DESCARGA = 30` y `LEYENDA_DEL_ARCHIVO`. La leyenda del PDF de la pantalla (`imprimir.ts`, `LEYENDA_DEL_PDF`) ahora la toma de aquí, así no se separan.
  - **Tipos:** `TablaDelArchivo` (título, encabezados, `formatos` por columna: texto, numero, entero, pesos o fecha; filas de celdas `string | number | null`), `BloqueDelArchivo` (texto o tabla) y `PedidoDeArchivo`.
  - **`faltasDelPedido`:** formato (solo PDF, Excel o Word), título, contenido, Excel con al menos una tabla, tabla sin filas («no se genera un archivo vacío») y más de 5 000 filas sumando todas («hay que acotar el periodo o el lugar»).
  - **`tablaDe(datos, ruta)`:** la lista de una consulta por su nombre; vacía, la única lista que haya.
  - **`aTabla(titulo, lista, columnas?)`:** encabezados legibles («valorEstimado» → «Valor estimado»). Los números siguen siendo números: pesos si la clave es de plata y son enteros, si no entero o número. Las fechas `AAAA-MM-DD` van como fecha. En el texto: sí/no → «Sí»/«No», un objeto por su `nombre` o «principal (resto)», y una lista unida con «; ».
  - **`nombreDelArchivoDelAsistente`:** se renombró porque ya existen `nombreDelArchivo` de Reportes y de Almacén, y la prueba tomaba la otra. Quita los caracteres prohibidos y deja 80 caracteres como máximo.
  - **`encabezadoDelArchivo`:** grupo, quién, cuándo («5-nov-2026, 9:10 a. m.», hora de Colombia) y las fuentes sin repetir, con su obra y su periodo.
  - **`venceEl` y `vigente`:** por días de Colombia; el día 30 se descarga hasta las 11:59 p. m. y el 31 ya no.
  - **`textoParaPdf`:** deja lo que Helvetica/WinAnsi dibuja (el español, $, m³, °, ±, «», “”, —, ½), cambia ≤ ≥ − → ✓ por equivalentes y lo demás (emojis) por «?».

  Pruebas: 040/RF-18 y RF-23, RF-20 y RF-21, RF-22 (nombre y encabezado), RF-24 y D7, RF-22 y RNF (PDF). 671 verificaciones; typecheck y lint en verde.
- 2026-11-05 (T12): **Dependencias:** `pdf-lib` 1.17.1 (nueva) y `jszip` 3.10.1 (declarada; venía con exceljs), las dos con versión exacta (`--save-exact`).
  - **Reglas nuevas** en `archivos-del-asistente.ts`, con prueba 040/RF-22 y RNF: `celdaEnTexto` (pesos «$ 1.850.000», enteros con punto de miles, decimales con coma, fechas «12-nov-2026») y `parrafosDeMarkdown` (títulos, viñetas, párrafos y `**negrita**`).
  - **Armadores** en `features/asistente/servidor/archivos/`. `contenido.ts` define la entrada común: título, encabezado y bloques.
    - `excel.ts` (exceljs): una hoja «Notas» si hay texto y una por tabla, con título, quién y cuándo, encabezados congelados y formatos pesos `"$" #,##0`, entero `#,##0`, número `#,##0.##` y fecha `dd/mm/yyyy` con `Date`. **Desvío del plan:** no reutiliza `reportes/servidor/excel.ts`, porque aquel escribe lecturas de medidor sin pesos ni fechas, y adaptarlo tocaba los Excel validados de Reportes.
    - `pdf.ts` (pdf-lib, Helvetica, A4 horizontal): encabezado; texto partido por ancho; tablas con anchos según el contenido (al menos la palabra más larga del título), celdas de hasta 3 líneas con «…», números a la derecha y títulos repetidos al pasar de página; leyenda y «Página n de N» en cada página. Todo pasa por `textoParaPdf`.
    - `word.ts` (jszip, XML a mano: `[Content_Types].xml`, `_rels/.rels`, `word/document.xml`): horizontal, títulos, viñetas, negritas, tablas con bordes, fila de títulos repetida (`w:tblHeader`) y la leyenda al final.
  - **Guion permanente** `scripts/humo-archivos-040.ts <carpeta>`: 5 000 filas con tildes, ñ, m³, °, ±, ¾, Ø, pesos y un emoji. Tiempos: Excel 0,6 s y 250 KB; PDF 5,6 a 9,5 s, 1,25 MB y 186 páginas; Word 0,9 a 1,5 s y 179 KB, todos por debajo de 20 s. Al reabrirlos: Excel con 5 004 filas, pesos como número con su formato, fechas como `Date`, decimales y tildes; Word con sus tres partes, 5 001 filas, una de títulos y el texto sin tocar; el PDF lo abre `pdf-lib`. **Revisado a ojo en el lector de PDF de Chrome** (servido un momento desde `public/` y borrado): encabezado, tildes, ñ y símbolos, pesos a la derecha, emoji → «?», títulos repetidos y pie. Ahí apareció «Cantida/d» partido; se corrigió con el ancho mínimo por palabra. **Excel y Word no se abrieron en Microsoft Office desde aquí:** quedan en el scratchpad de la sesión (`humo-040/`) para que el usuario los abra.
  - **Para la T13:** los títulos de columna salen de las claves y quedan sin tilde («Codigo», «Que se pide», «Pidio»); conviene que `generar_archivo` acepte títulos para las columnas.

  672 verificaciones; typecheck y lint en verde.
- 2026-11-05 (T13):
  - **Nuevo `archivos/generar.ts`.** `TurnoDelAsistente` (conversación, quién, `consultas` numeradas c1, c2…, `archivos`, `alArchivo`), `turnoNuevo` y `guardarConsulta`. `generarArchivo` saca cada tabla de una consulta del turno (`tablaDe` + `aTabla`), acepta títulos para las columnas (resuelve lo de «Codigo» de la T12), pasa `faltasDelPedido`, arma el archivo, lo sube a R2 (`claveDeObjeto('asistente', conversación, mediaId, mime)`) e inserta `media` (`asistente`, la conversación, `archivo_generado`).
  - **`herramientas.ts`.** `ejecutar` y `ejecutarHerramienta` reciben el `turno`. Cada consulta queda guardada y la IA recibe `{ consulta: 'cN', datos }`.
  - **Cambio de comportamiento acordado en el plan.** Un resultado de más de 80 000 caracteres **ya no es un error**: la IA recibe `{ consulta, demasiadoGrande, listas: {nombre: filas}, nota }`, con la instrucción de no responder con esas cifras y, si se pidió un archivo, usar esa consulta. Así se hizo en lugar de agregar `para_archivo` a cada consulta, que habría sumado parámetros a los límites de la T10.
  - **`generar_archivo`.** Sin opcionales ni uniones: formato `enum`, título, y bloques con tipo, texto, consulta, lista, título y columnas `{clave, titulo}`; lo que no aplica va vacío. Se ofrece a todos los que usan el asistente (RF-18).
  - **El resto del servidor.** `conversacion.ts` crea el turno con `conversacionId` (de `preguntar.ts`), emite `{tipo:'archivo'}` y devuelve `archivos`; `preguntar.ts` lo reenvía como evento `archivo`. `conversaciones.ts` guarda `asistente_mensajes.archivos`, los devuelve en los mensajes, y tiene `archivoGeneradoAlAlcance`: su conversación, `conversacionVisible` con el alcance de hoy, el archivo en un mensaje (`archivos @> [{mediaId}]`) y `vigente`. `contratos.ts` suma `ArchivoDelAsistenteEnPantalla`, `MensajeDelAsistente.archivos` y el evento `archivo`.
  - **Ruta y pantalla.** `media/[id]+api.ts`: con `asistente` y `archivo_generado`, si no cumple responde 404 «Ese archivo ya no está disponible.»; si cumple, adjunto con su nombre y `Cache-Control: private, no-store`. **Defecto evitado** en `pantalla-asistente.tsx`: todo evento que no conocía caía en `setCupoNuevo(e.cupo)`, y `archivo` lo habría roto; ahora se ignora hasta la T14, que pinta la tarjeta.

  **e2e en dev sin IA** (`_tmp-040-t13.ts`; dos auxiliares PRUEBA-040 con sesión real; R2 real, borrado por clave), 14 ✓:
  - ningún rol pasa 0 opcionales y 0 uniones con la consulta nueva; `generar_archivo` se ofrece exactamente a quien usa el asistente;
  - la consulta trae «c1»; se rechazan una consulta ajena al turno, una lista que no está (diciendo cuáles hay) y una tabla sin filas;
  - el Excel «PRUEBA-040 Personal del grupo 2026-11-05.xlsx» (60 filas) queda en `media` como `archivo_generado` de la conversación;
  - la descarga por la ruta da 200 como adjunto, sin caché, con las hojas Notas y Personal, 64 filas y el título «Nombre»;
  - otra persona recibe 404, y con 31 días, 404 «Ese archivo ya no está disponible.».

  Limpieza: R2 DELETE de la única clave `asistente/<conversación de prueba>/…` → 204; media, mensajes, conversación, sesiones y usuarios por id → 0 filas. Script borrado. Pendiente aparte: **el usuario confirma que el Excel y el Word del humo de la T12 abren en Office**. 672 verificaciones; typecheck y lint en verde.
- 2026-11-05 (T14):
  - **La tarjeta.** Nuevo `tarjeta-de-archivo.tsx` (`TarjetaDeArchivo` y `ArchivosDeLaRespuesta`): ícono y formato dicho con texto (Excel, PDF o Word), nombre, «N filas · se puede descargar hasta el 5-dic-2026» o «venció el …; pídalo de nuevo al asistente» (sin botón), y «Descargar» por `api.asistente.descargarArchivo` (`fetch`); si el servidor rechaza, muestra «No se pudo descargar: …». `guardarArchivo` salió de `pantalla-almacen.tsx` a `panel/guardar-archivo.ts`, compartido.
  - **En la pantalla.** `pantalla-asistente.tsx` pinta la tarjeta bajo cada respuesta guardada (`m.archivos`) y mientras se redacta (`EnCurso.archivos`, desde el evento `archivo`); el «Consultando…» de `generar_archivo` dice «el archivo».
  - **DEFECTO 1, hallado en Chrome con la IA real:** la API rechazó la pregunta con 400 «For 'array' type, property 'maxItems' is not supported». El modo estricto no admite `.min()` ni `.max()` en listas, y la prueba de la T13 no llamaba a la API. Se quitaron del esquema de `generar_archivo`, y el tope de 12 bloques lo revisa `generarArchivo`. **Regla para la T16:** en el esquema, sin `minItems`/`maxItems`, además de sin opcionales ni uniones.
  - **DEFECTO 2:** en el Excel la columna «Lugar» salió vacía, porque la IA pidió `lugar.nombre` y `aTabla` solo leía claves de primer nivel. Ahora `valorDe` resuelve rutas con punto; prueba en 040/RF-20 y RF-21.
  - **Revisado en Chrome** (dev, auxiliar `prueba-040-aux`, SC-0557 urgente $1.850.000 de la obra y SC-0558 $2.640.000 de OCC, enviadas):
    - «Hazme un Excel de las compras por aprobar» respondió «Hay 2 solicitudes de compra por aprobar… el Excel ya está en la conversación», con la tabla en la respuesta. La tarjeta salió **mientras se redactaba** y quedó en la respuesta guardada, con la fuente «Compras de Elemental»; consola sin errores.
    - «Descargar» guardó «Compras por aprobar 2026-11-05.xlsx» en Descargas. Leído con exceljs: hoja Notas y hoja de la tabla con Número, Urgente, Qué se pide, Para qué, Para cuándo (fecha), Pedida por, Pedida el (fecha) y Valor estimado (`"$" #,##0`), **con las mismas cifras de la respuesta**.
    - Tras el arreglo, «Hazlo otra vez, con el lugar de cada solicitud» generó «Compras por aprobar 2026-11-05 (1).xlsx» con Lugar «Pruebas spec 018 (laboratorio)» y «OCC».
    - Hay que reiniciar el servidor de dev tras tocar código de servidor (trampa 1 de AGENTS.md): se hizo tres veces.
  - **Limpieza:** R2 DELETE de las 2 claves de la conversación de prueba → 204 y 204; conversación, mensajes, uso, solicitudes, sesiones y usuarios por id → 0 filas. **Los dos .xlsx de prueba quedaron en la carpeta Descargas del usuario**, para que los abra en Excel; no se borraron. Pendiente aparte: confirmar en Office el Excel y el Word del humo de la T12. Para la T17: el texto de arriba del asistente dice «información de su obra» también a la auxiliar. 672 verificaciones; typecheck y lint en verde.
- 2026-11-05 (T15): `rules/asistente.ts`:
  - **`ejemplosDePregunta(alcance)`** (antes recibía los módulos): la lista `EJEMPLOS` suma Compras, Tesorería, RR. HH., Documentos, Finanzas, la Bitácora de OCC o de Geolab (`bitacoraDe`) y las solicitudes de su lugar (`sinBandeja`: solo sin la bandeja de Compras), y los que piden archivo (`archivo`). Salen hasta 3; si alcanza uno de archivo, el último es ese. No hizo falta el cargo: lo decide el alcance. Gerencia: compras por aprobar, reporte de máquinas y «Hágame un Excel de las compras por aprobar»; auxiliar: compras, pagos aprobados sin pagar y el mismo Excel; residente y Encargado de OCC: «Hágame un Excel de las horas del personal de esta semana»; almacenista, planta y laboratorista, de su módulo. Se quitó la excepción de la auxiliar en 028/RF-74. `pantalla-asistente.tsx` pasa el alcance.
  - **`loQueConsulta(alcance)`**: «De las obras: …» o «De su obra: …» con los módulos de obra que alcanza (un módulo apagado no sale), y una frase por Compras (o «Sus solicitudes…» sin bandeja), Tesorería, cortes, personal, documentos y las Bitácoras de empresa. A la auxiliar le sale «De las obras: personas.» porque alcanza `personas`: revisar a ojo en la T17.
  - **`descripcionDeLaConsulta(nombre, entrada, hoy?)`** y `periodoEnPalabras`: «Leyendo las solicitudes de compra de octubre…», «de hoy», «de ayer», «del 14-oct», «del 27-oct al 2-nov», año si no es el actual; «Leyendo la solicitud SC-0549…», «Leyendo la ficha de …», «Leyendo el reporte del personal…», «Leyendo la Bitácora de OCC…», «Armando el Excel «Compras por aprobar»…»; desconocida → «Consultando…». La prueba lee los nombres de `herramientas.ts` y exige frase para todas. **Para la T17:** el evento `consultando` hoy lleva solo el nombre; hay que mandar la descripción desde `conversacion.ts` (allí está la entrada) y quitar `NOMBRE_DE_CONSULTA` de la pantalla.
  Pruebas: 028/RF-74 ajustada; nuevas 040/RF-26, RF-25 y RF-29. 675 verificaciones; typecheck y lint en verde.
- 2026-11-05 (T16):
  - **Regla** (`rules/asistente.ts`): `aclaracionDe` limpia la pregunta y las opciones (espacios, vacías, repetidas sin distinguir mayúsculas ni tildes) y exige de 2 a 6, de hasta 80 caracteres, con una pregunta de hasta 300. Con una sola opción le dice a la IA que la use sin preguntar, y con más de 6, que pregunte en texto. `aclaracionEnElHistorial` deja la pregunta con «Opciones: «A», «B».» en el historial de la pregunta siguiente, para que la IA entienda la que se tocó. Prueba 040/RF-27.
  - **Consulta `pedir_aclaracion`** (`herramientas.ts`, `{ pregunta, opciones }`, sin `minItems`/`maxItems`), que devuelve `aclaracion` en el resultado. `responderPregunta` corre las consultas de la vuelta y, si hubo una aclaración válida, cierra el turno sin otra vuelta: `texto` = la pregunta, `aclaracion` guardada, evento `aclaracion`. Si vino mal, el error vuelve a la IA. No emite «consultando». Instrucciones: la obra o el lugar que falta se pide con `pedir_aclaracion`, con opciones sacadas de una consulta.
  - **Guardado y pantalla:** `asistente_mensajes.aclaracion` (columna de la T3), `MensajeDelAsistente.aclaracion`, evento `aclaracion` en `preguntar.ts` y `contratos.ts`. En la pantalla las opciones son botones (estilo de los ejemplos) **solo en la última respuesta**; tocar una la envía, y quedan apagadas mientras responde o sin cupo. La aclaración no ofrece «PDF».
  - **DEFECTO hallado (venía de la T13):** la gerencia recibía 400 en **toda** pregunta: «The compiled grammar is too large… reduce the number of strict tools». Medido con llamadas mínimas a la API: con 19 consultas estrictas (las 18 de antes + `generar_archivo`) falla, y con 18 pasa, sin importar `pedir_aclaracion`. En la T14 no se vio porque se probó con la auxiliar. **Arreglo:** `Herramienta.estricta?: false`. `generar_archivo` y `pedir_aclaracion` van sin modo estricto, y su entrada la siguen validando zod y su regla; las demás siguen estrictas. **Para adelante:** sumarle otra consulta a la gerencia vuelve a acercarla al tope; hay que medirlo con la API real. El mensaje del 400 («puede que la cuenta… no tenga saldo») sigue confundiendo: va en otra spec.
  - **Chrome en dev** (gerencia `PRUEBA-040` creada por script; la sesión de dev de la gerencia del usuario se cerró para no usar su cuenta): «¿Cuántos viajes hubo ayer?» respondió «¿De qué obra?» con 4 botones (Consorcio Antioquia, CONSORCIO SANTANDER, Pruebas spec 018 (laboratorio), Obra de prueba spec 016 (horario)). Tocar «Pruebas spec 018 (laboratorio)» la envió como pregunta; mientras tanto los botones se apagaron y salió «Consultando sus obras…». Respondió «Ninguno… no hay viajes registrados ayer, 04-nov-2026» con la fuente Reportes › Cantera, y los botones desaparecieron. Con la gerencia, «Hágame un Excel de las personas de la obra Pruebas spec 018» generó el Excel (53 filas), que comprueba `generar_archivo` sin modo estricto. Consola sin errores.
  - **Limpieza** por id del usuario: R2 DELETE 204 del Excel, su `media`, 4 conversaciones con sus mensajes, uso, sesiones, credencial y usuario; 0 filas `PRUEBA-040`. Script y credencial borrados. 676 verificaciones; typecheck y lint en verde.
- 2026-11-05 (T17):
  - **Reglas** (`rules/asistente.ts`): `ambitoDelAsistente(alcance)` → «del grupo» (quien entra a Elemental: gerencia y auxiliar), «de su obra», «de OCC y las obras», «de Geolab y su obra». `resumenDeLoQueConsulta(alcance)` arma la frase del recuadro del Inicio, hasta 5 temas y «…», con lo de la empresa primero para quien lleva el grupo. En `loQueConsulta`, a quien de las obras solo alcanza las personas (la auxiliar) se le pone «Las personas registradas en las obras.» al final, en vez de abrir con «De las obras: personas.». Prueba 040/RF-25 (ámbito y recuadro).
  - **Espera (RF-29):** `responderPregunta` arma `descripcionDeLaConsulta(nombre, entrada, hoy)` y la manda en el evento `consultando` (`descripcion`, también en `contratos.ts` y `preguntar.ts`). La pantalla la muestra tal cual, y se quitó `NOMBRE_DE_CONSULTA`.
  - **Pantalla** (`pantalla-asistente.tsx`): título y saludo con el ámbito («¿Qué quiere saber del grupo, …?»; se corrigió el «de su obra» que veía la auxiliar desde la T13). Bajo los ejemplos va «Puede consultar…» con `loQueConsulta` y «Y pedir lo consultado en PDF, Excel o Word.». Los ejemplos van primero porque son lo que se toca. Los ejemplos ya escribían en el campo sin enviar (comprobado). `recuadro-del-inicio.tsx` usa `resumenDeLoQueConsulta`.
  - **DEFECTO hallado a 390 px:** el ejemplo largo de la auxiliar («¿Qué solicitudes de pago están aprobadas y sin pagar?») se salía de la columna y quedaba cortado, porque la pastilla tenía un tope de 360 px y la columna útil mide unos 327. Ahora `maxWidth: '100%'`.
  - **Chrome en dev** (gerencia, auxiliar y residente `PRUEBA-040` creados por script; ingreso por la API, porque el autocompletado de Chrome ponía la cuenta guardada en el formulario; la ventana no cambia de tamaño, así que los 390 px se revisaron dentro de un marco de 390 px de la misma página):
    - **1366 px:** los tres cargos, sin desbordes, con su título, sus ejemplos y su lista. Gerencia: «del grupo» y 7 frases. Auxiliar: «del grupo» y 6 frases, terminando en las personas. Residente: «de su obra», su obra y «Sus solicitudes…».
    - **390 px:** los tres, más el recuadro del Inicio del residente («Pregunte en español sobre su obra: bitácoras, preoperacionales, almacén, Control Cantera, laboratorio…»). 0 elementos fuera del ancho y 0 botones fuera de su columna.
    - **Espera:** con la gerencia, el ejemplo «¿Qué compras están por aprobar?» quedó en el campo y la dirección no cambió. Enviado, la espera mostró «Pensando…» y luego «Leyendo las solicitudes de compra…». La respuesta salió con la fuente Compras de Elemental. Consola sin errores.
  - **Limpieza** por id: 3 usuarios, 1 conversación, sesiones y credenciales; quedan 0 filas `PRUEBA-040`. Script y credenciales borrados. 677 verificaciones; typecheck y lint en verde.
- 2026-11-05 (T18): `validacion.md` RF por RF. **Demo final** por las rutas reales con tres usuarios `PRUEBA-040` (auxiliar, gerencia, residente de Consorcio Antioquia) y la IA real: **28 ✓**. La auxiliar aprueba (la gerencia, tarde, 409 con su nombre), registra, recibe, anula una compra con motivo, aprueba y paga una SP de OCC, registra y anula un corte de Elemental (OCC 403); con el asistente, «las compras por aprobar» y su Excel, leído con exceljs. El residente no recibe PDF de una semana sin datos, sí el de la semana del 5 al 11-oct, y no ve las compras de Pruebas spec 018 (asistente «no está a su alcance»; panel 404).
  - **Defectos corregidos:** (1) `faltasDelPedido` exige en todo formato al menos una tabla de una consulta (un PDF «casi vacío» solo de texto pasaba), y `tablaDe` acepta rutas con punto (`bitacora.actividades`). (2) «total» ya no es clave de plata (Reportes › Máquinas salía «$ 0»). (3) Formato `lectura` (punto decimal, sin miles; «General» en Excel) por la clave, para cumplir el RNF de la 039 en los archivos. Pruebas en 040/RF-18, RF-23 y RF-20, RF-21.
  - **Tiempos sin archivo:** gerencia 8,1 – 9,2 s, residente 6,4 – 14,2 s (antes ~30 s y ~17 s). **Memoria:** el servidor de desarrollo se cayó (4 GB) y crece con cualquier petición; con la compilación de producción (`expo export` + `servidor/entrada.cjs`, puerto 3010) se queda en 67 → 90 MB tras 20 lecturas y 10 preguntas. `dist/` borrado.
  - **Limpieza** por id en cada corrida: 0 filas `PRUEBA-040` en usuarios, solicitudes, compras, pagos y cortes; R2 DELETE 204 de cada archivo. Scripts borrados. La 0039 quedó anotada en la T23 de la 033. Spec marcada **Cumplida en desarrollo**. 677 verificaciones; typecheck y lint en verde.
