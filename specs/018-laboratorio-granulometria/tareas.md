# Tareas — Spec 018

> Laboratorio: ensayo de granulometría LAB-FR-01-2025 (RF-1 a RF-112). Orden: catálogos y
> reglas puras, datos, servidor, y después cada pantalla que los consume. T24 valida la spec
> entera.

Tareas de menos de 30 minutos, ordenadas por dependencia. Cada una lleva los RF que
cubre y una línea `Hecho cuando:` que se pueda comprobar sin interpretar.

**Se implementa una tarea cada vez** (`/sdd:implementar T1`), y al terminarla se para.
Ninguna tarea se marca sin `npm run verificar`, `npm run typecheck` y `npm run lint`
en verde. Las migraciones se aplican en Neon (desarrollo) **solo con el permiso de Diego**.

**Catálogos y reglas puras**

- [x] T1. La serie de tamices y el catálogo de franjas, con sus casos. (RF-17, RF-18, RF-26)
      `src/shared/catalogos/tamices.ts` (anexo B, ids estables, ½" a 12,7 mm) y
      `src/shared/catalogos/franjas-granulometricas.ts` con solo `sbg_50` (anexo A) y el
      comentario de por qué las demás esperan a OCC (RF-19).
      Hecho cuando: en el guion, la serie tiene 16 entradas en orden decreciente de mm con el
      fondo al final; cada límite de cada franja apunta a un id de tamiz existente y cumple
      `0 ≤ min ≤ max ≤ 100`; SBG-50 tiene los diez renglones del anexo A; los tres comandos en
      verde.

- [x] T2. El cálculo granulométrico, con el ejemplo del Excel. (RF-44 a RF-52, RF-55, RF-56)
      `calcularGranulometria` en `src/shared/rules/granulometria.ts`: humedad, masa sin tara,
      % retenido, acumulado, pasa, TM, TMN y faltantes.
      Hecho cuando: en el guion, con las masas del anexo C salen los quince `% pasa` a dos
      decimales (100,00 · 86,48 · 69,94 · 61,41 · 49,81 · 44,14 · 32,17 · 25,45 · 23,79 · 20,03 ·
      13,84 · 8,26 · 5,52 · 4,01 · 3,39), humedad 3,2, TM `2"`, TMN `1½"` y el fondo sin `% pasa`;
      con el 2" reteniendo, TM «mayor que 2"»; con masa sin tara 0 o un retenido nulo,
      `completo: false` y la lista de lo que falta; los tres comandos en verde.

- [x] T3. Control de lavado y veredicto, con sus casos. (RF-53, RF-54, RF-57 a RF-61, RF-63)
      En la misma regla: diferencia contra M2 con aviso > 0,3 %, y veredicto por tamiz
      (`debajo` / `encima`) y global, comparando con el valor redondeado a dos decimales.
      Hecho cuando: en el guion, 0,30 % no avisa, 0,31 % sí y sin M2 no hay dato ni aviso; el
      anexo C contra SBG-50 da `cumple`; 69,995 contra mínimo 70 cumple; un tamiz por debajo da
      `no_cumple` marcado `debajo`; sin datos completos no hay veredicto; los tres comandos en
      verde.

- [x] T4. Validaciones, clave del informe y estados permitidos, con sus casos. (RF-31, RF-33 a
      RF-41, RF-70 a RF-90)
      `validarEnsayo(entrada, hoy, modo)`, `claveDeInforme(numero)` y
      `transicionPermitida(estado, accion)`.
      Hecho cuando: en el guion, cada rechazo de RF-33 a RF-39 aparece con su campo; un borrador
      incompleto es válido y el mismo en modo envío se rechaza nombrando lo que falta;
      `claveDeInforme('No. 6 ')` es igual a `claveDeInforme('no.6')`; la tabla de transiciones
      completa coincide con el plan (editar, enviar, aprobar, devolver, anular, descartar desde
      cada estado); los tres comandos en verde.

- [x] T5. El rol Laboratorista, el módulo Laboratorio y la acción aprobar, con su migración.
      (RF-1 a RF-5, RF-9, RF-10, RF-92)
      En `permisos.ts`: `laboratorista` en `ROLES`, `ETIQUETA_ROL`, `QUIEN_ES` y `PUEDE_DAR`
      (solo gerencia); `laboratorio` al final de `MODULOS` con su fila; acción `aprobar` en
      `Accion` y `QUE_SE_INTENTABA`; `NOMBRE_DE_MODULO`. Cargo `laboratorista` en `cargos.ts`.
      `ENLACES_DE_MODULO` gana `laboratorio` (lo exige el `satisfies`); si las rutas tipadas
      piden que `/panel/laboratorio` exista, se crea con una pantalla provisional que T19
      reemplaza.
      `npm run db:generate:servidor`.
      Hecho cuando: la migración nueva en `drizzle/servidor/` solo añade el valor al enum
      `rol_usuario`; en el guion, el laboratorista ve solo `laboratorio` y entra por él, escribe
      pero no aprueba ni anula; el residente ve, lista, aprueba y anula pero no escribe; solo la
      gerencia da el rol; `motivoDeRechazo('laboratorio', 'aprobar')` nombra al residente y a la
      gerencia; los tres comandos en verde.

**Datos**

- [x] T6. El interruptor de laboratorio en la obra. (RF-11, RF-12, RF-14, RF-16)
      `obras.laboratorio_activo` boolean not null default `false` con el comentario de por qué
      el default **es** RF-12. `ModulosDeObra.laboratorio`, `TODOS_LOS_MODULOS`,
      `moduloApagado`, `motivoParaNoDarRolEnObra` para el laboratorista; la sesión, 
      `modulosDeLaObra` y `filtroDeModulo` leen la columna nueva. `npm run db:generate:servidor`.
      Hecho cuando: la migración solo añade esa columna; en el guion, con laboratorio apagado el
      laboratorista y el residente no ven el módulo y con encendido sí, la gerencia lo ve
      siempre, y `motivoParaNoDarRolEnObra('laboratorista', apagado)` da el texto; aplicada en
      Neon (con permiso), `GET /api/auth/yo` trae `modulosDeObra.laboratorio`; los tres
      comandos en verde.

- [x] T7. La tabla de ensayos y la columna del parte. (RF-21, RF-40, RF-41, RF-70 a RF-94,
      RF-111)
      Enum `estado_ensayo`, tabla `ensayos_granulometria` con los índices y `check` del plan, y
      `partes_de_obra.granulometrias` jsonb nula sin default, cada una con su comentario de
      porqué. `npm run db:generate:servidor`.
      Hecho cuando: la migración crea el enum, la tabla con el índice único parcial
      `(obra_id, clave_informe)` y los `check`, y añade la columna del parte sin tocar filas;
      aplicada en Neon (con permiso), el `GET` de partes sigue respondiendo; los tres comandos
      en verde.

- [x] T8. Los ensayos del módulo cuentan para cerrar el parte, con su caso. (RF-110)
      `ParteEvaluable.ensayosDelModulo?` y `ConteosDelParte` en `src/shared/rules/parte.ts`.
      Hecho cuando: en el guion, con la sección a mano vacía y `ensayosDelModulo: 1`,
      `bloqueosDelCierre` no nombra Control Calidad de Obra; con 0 sí; ausente se comporta como
      hoy; los tres comandos en verde.

**Servidor**

- [x] T9. La obra lee y guarda el interruptor. (RF-11, RF-13)
      `ObraFila.laboratorioActivo`, `obraNueva` con `true` por defecto, `obraEditada` opcional;
      `GET`, `POST` y `PATCH` de obras.
      Hecho cuando: desde la página, el `GET` de obras trae `laboratorioActivo: false` en las
      existentes; un `PATCH` con `true` lo enciende y uno sin el campo no lo toca; los tres
      comandos en verde.

- [x] T10. Contratos del ensayo. (RF-23 a RF-32)
      En `contratos.ts`: `ensayoNuevo`, `ensayoEditado` (con los `*Parcial`), `devolucion`,
      `anulacion`, y los tipos `EnsayoFila`, `EnsayoDetalle`, `GranulometriaDelParteFila`.
      Hecho cuando: en el guion, `ensayoEditado` distingue ausente de `null`; masas negativas
      las rechaza el esquema; los tres comandos en verde.

- [x] T11. Listar y registrar ensayos. (RF-6 a RF-8, RF-20, RF-23, RF-37 a RF-42, RF-101 a
      RF-105)
      `src/features/laboratorio/servidor/ensayos.ts` y `granulometrias+api.ts` (`GET`, `POST`):
      alcance por obra, `filtroDeModulo` para la gerencia, cálculo en el servidor, 409 con el
      número repetido, contador de pendientes.
      Hecho cuando: desde la página, con la gerencia en una obra con el módulo encendido, el
      `POST` del anexo C responde 201 con `veredicto: 'cumple'` calculado por el servidor aunque
      el cuerpo traiga otro; repetir el número responde 409; el `GET` lo lista con
      `pendientes: 0`; con el módulo apagado, la obra no aparece; los tres comandos en verde.

- [x] T12. Ver y corregir un borrador. (RF-22, RF-31, RF-71, RF-76, RF-85)
      `granulometrias/[id]+api.ts`: `GET` detalle y `PATCH` parcial condicionado al estado.
      Hecho cuando: desde la página, un `PATCH` que solo cambia las observaciones conserva las
      masas y recalcula; cambiar la franja la copia entera; un ensayo de otra obra responde 404;
      los tres comandos en verde.

- [x] T13. Enviar y descartar. (RF-72 a RF-76, RF-90, RF-91, RF-93, RF-94)
      El ayudante de transición en `ensayos.ts` (un `UPDATE` con estado esperado y anexo a la
      historia; 409 con el estado actual si no hay fila) y las rutas `enviar` y `descartar`.
      Hecho cuando: desde la página, enviar un borrador incompleto responde 400 nombrando lo que
      falta; completo pasa a `enviado` con «Revisó» y un evento en la historia; un `PATCH` sobre
      él responde 409; descartar un borrador lo saca del listado y deja libre su número; los
      tres comandos en verde.

- [x] T14. Aprobar, devolver y anular. (RF-77 a RF-89, RF-93, RF-94)
      Rutas `aprobar`, `devolver` (comentario obligatorio) y `anular` (motivo obligatorio).
      Hecho cuando: desde la página, devolver sin comentario responde 400; devolver deja el
      ensayo editable con el comentario; aprobar registra «Aprobó» y la fecha de emisión; un
      segundo `aprobar` responde 409 con «aprobado»; anular sin motivo responde 400 y con motivo
      conserva los datos; los tres comandos en verde.

- [x] T15. Los ensayos del día en el parte. (RF-15, RF-106, RF-107, RF-111, RF-112)
      `src/features/laboratorio/servidor/parte.ts` (consulta compartida, como cantera) y
      `partes/[id]/granulometrias+api.ts` con permiso de bitácora.
      Hecho cuando: desde la página, un parte abierto del día de ejecución trae el ensayo con su
      estado y veredicto; uno descartado o anulado no sale; con el módulo apagado la lista viene
      vacía; los tres comandos en verde.

- [x] T16. El cierre cuenta y fija los ensayos. (RF-110, RF-111, RF-112)
      `cerrar+api.ts`: cuenta los vigentes del día para `bloqueosDelCierre`, fija
      `granulometrias` en la misma sentencia y la condición del `WHERE` del plan.
      Hecho cuando: desde la página, un parte con la sección a mano vacía y un ensayo del día
      cierra; sin ensayo, el rechazo nombra Control Calidad de Obra; tras cerrar, anular el
      ensayo no cambia lo que devuelve la sección del parte cerrado; los tres comandos en verde.

**Panel**

- [x] T17. La casilla «Lleva laboratorio» en la obra. (RF-11, RF-13, RF-14)
      `modulos-de-obra.tsx`, `ventana-obra.tsx` y `pantalla-obras.tsx`, con el aviso de a qué
      laboratorista deja sin módulo.
      Hecho cuando: en Chrome, el alta de obra la propone marcada, la corrección la enciende y
      apaga, y al apagar con un laboratorista en la obra se ve su nombre antes de guardar; los
      tres comandos en verde.

- [x] T18. La curva granulométrica. (RF-64 a RF-69)
      Primero una prueba mínima de `react-native-svg` en `npm run web`; **si no dibuja, se para
      y se pregunta**. Después `src/features/laboratorio/curva-granulometrica.tsx`: eje log,
      franja, puntos fuera con otra forma, leyenda, y el aviso cuando faltan datos.
      Hecho cuando: en Chrome, con los datos del anexo C, la curva queda dentro de la franja con
      el eje X logarítmico de 0,075 a 50 mm; cambiando un dato para sacar un punto, ese punto
      cambia de forma; los tres comandos en verde.

- [x] T19. El menú, las rutas y el listado. (RF-4, RF-5, RF-101 a RF-105)
      `src/app/panel/laboratorio.tsx` (ya existe desde T5) y `laboratorio/[id].tsx` (una línea), `api.laboratorio.*` en
      `cliente-api.ts`, `pantalla-laboratorio.tsx` con filtros y contador de pendientes.
      Hecho cuando: en Chrome, «Laboratorio» sale en el menú de la gerencia; el listado muestra
      el ensayo de T11 con su veredicto (texto e ícono) y estado; los filtros por estado y
      veredicto lo esconden y lo muestran; la tabla cabe sin esconder la columna de acciones;
      los tres comandos en verde.

- [x] T20. Registrar y corregir un ensayo en pantalla. (RF-20 a RF-32, RF-43, RF-52 a RF-56,
      RF-61 a RF-63)
      `pantalla-ensayo.tsx` y `tabla-tamices.tsx`: encabezado, masas, franja, los 16 renglones,
      resultados y curva en vivo con la misma regla, aviso de lavado, guardar borrador.
      Hecho cuando: en Chrome, digitando el anexo C los porcentajes aparecen sin guardar y son
      los del Excel; el aviso de lavado sale con una M2 que difiere más de 0,3 %; un tamiz fuera
      lleva ▲ o ▼; guardar un borrador a medias funciona; los tres comandos en verde.

- [x] T21. Acciones por estado y la historia. (RF-70 a RF-94)
      En `pantalla-ensayo.tsx`: botones según estado y rol (enviar, descartar, aprobar,
      devolver, anular), ventana de comentario y de motivo, comentario de devolución visible,
      marca de anulado, historia, y el 409 mostrado con el estado actual.
      Hecho cuando: en Chrome, el recorrido enviar → devolver → corregir → reenviar → aprobar →
      anular funciona con la gerencia; un aprobado no muestra campos editables; los tres
      comandos en verde.

- [x] T22. El informe imprimible. (RF-95 a RF-100)
      `assets/logo-geolab.jpeg` (sacado del Excel), `informe.tsx` con el encabezado del
      anexo D, tabla, curva, veredicto, «Revisó» y «Aprobó», marca de estado, y la hoja de
      impresión que oculta el marco del panel con `@page` carta.
      Hecho cuando: en Chrome, «Imprimir» muestra en la vista previa una sola hoja carta con el
      logo de GEOLAB, sin menú del panel y con la curva nítida; un borrador muestra la marca
      «sin aprobar» y un anulado la marca ANULADO con el motivo; los tres comandos en verde.

- [x] T23. Los ensayos en el parte diario. (RF-106 a RF-110, RF-112)
      `SeccionLaboratorio` en `pantalla-partes.tsx`: los ensayos del módulo debajo de las filas
      a mano, solo lectura, con enlace al ensayo; el índice y el aviso de cierre los cuentan.
      Hecho cuando: en Chrome, el parte del día de ejecución muestra el ensayo con número,
      material, franja, veredicto y estado; el enlace abre el ensayo; con la sección a mano
      vacía el índice no la marca como «sin registrar»; en un parte cerrado se ven los fijados;
      los tres comandos en verde; `npx expo export --platform web` termina sin error.

- [ ] T24. Validación final: recorrido RF por RF de la spec + demo manual. (Todos)
      El recorrido de *Criterios de finalización* de la spec, más: 403 al pedir una ruta de
      laboratorio con el módulo apagado y 409 con dos aprobaciones a la vez.
      Hecho cuando: cada RF tiene su comprobación con resultado, los tres comandos
      están en verde y la spec queda marcada como Cumplida.

## Notas de ejecución

- **T3 — redondeo.** `Math.round(x * 100) / 100` redondea mal los medios en binario
  (69,995 → 69,99; Excel muestra 70,00). Como RF-58 juzga con el valor mostrado, eso
  habría dado NO CUMPLE donde la hoja dice CUMPLE. `redondear()` en
  `src/shared/rules/granulometria.ts` recorta a 15 cifras significativas y desplaza la
  coma con notación exponencial; su caso está en el guion. **Toda cifra que se muestre
  del ensayo (pantalla, informe, parte) tiene que pasar por esa función**, o la
  pantalla y el veredicto podrán discrepar en el segundo decimal.

- **T5 — ruta plana.** El listado vive en `src/app/panel/laboratorio.tsx`, como los demás
  módulos, y no en `laboratorio/index.tsx` como decía el plan (ya corregido). Con la
  carpeta, el generador incremental de rutas tipadas del `npm run web` que estaba
  corriendo registró `/panel/laboratorio/index` en vez de `/panel/laboratorio`, y
  `typecheck` falló en el menú. El detalle irá en `laboratorio/[id].tsx`, que Expo Router
  admite junto al archivo plano. Ese mismo generador dejó en `.expo/types/router.d.ts`
  entradas espurias (`/../shared/...`); son inofensivas y desaparecen al reiniciar el
  servidor de desarrollo.
- **T5 — migración.** `drizzle/servidor/0015_colossal_stick.sql` solo añade
  `laboratorista` a `rol_usuario`. Aplicada en Neon **desarrollo** (`neondb`) el
  2026-09-24 con permiso de Diego. Producción (`preoperaocc`) sigue sin ella.
- **T6 — migración y comprobación.** `0016_nostalgic_xorn.sql` solo añade
  `obras.laboratorio_activo` (default `false`); aplicada en desarrollo. Las tres obras
  quedaron apagadas y `modulosDeLaObra` devuelve `laboratorio: false`, comprobado con un
  guion contra la base. `GET /api/auth/yo` comprobado en T9 (trae
  `modulosDeObra.laboratorio`).
- **T7 — estados en su propio archivo.** `ESTADOS_ENSAYO` vive en
  `src/shared/catalogos/estados-ensayo.ts` (la regla lo reexporta): el esquema lo importa
  como valor para crear el enum, y drizzle-kit no entiende el alias `@/` que usa la regla.
  Migración `0017_worried_cerebro.sql` (enum, tabla con sus `check` e índices, y
  `partes_de_obra.granulometrias`), aplicada en desarrollo; los partes existentes leen
  `granulometrias = null`.
- **T7 — `actualizado_en` lo pone la ruta.** `ensayos_granulometria` no entra en
  `TABLAS_CON_RELOJ` (`disparadores.ts`): ese disparador es para lo que baja al celular.
  Como en almacén y cantera, las rutas de T11 a T14 escriben `actualizadoEn: new Date()`.
- **T9 — obra de pruebas y segundo servidor.** PRUEBA-016 estaba dada de baja, así que se
  creó **PRUEBA-018** («Pruebas spec 018 (laboratorio)») en desarrollo: nació con
  laboratorio encendido sin pedirlo (RF-13); apagar, encender y un `PATCH` sin el campo
  se comportaron como se espera. Las comprobaciones «desde la página» se hacen contra un
  segundo servidor en el puerto **8082** (`npx expo start --web --port 8082`), porque el
  `npm run web` de Diego no recompila las rutas `+api.ts`; la cookie de sesión de
  `localhost` vale para los dos puertos.
- **T11 — filtros en la pantalla.** El `GET` solo recibe periodo y obra; material, franja,
  estado y veredicto (RF-103) se filtran en la pantalla sobre lo que llegó, como
  `filtrarViajes` en Control Cantera. El plan decía filtrarlos en el servidor; se
  corrigió. Los borradores sin fecha de ejecución salen siempre, primero.
- **T11 — comprobado en el 8082.** En PRUEBA-018, el ensayo del Excel (informe «No. 6»)
  respondió 201 en borrador con los quince `% pasa` de la hoja, TM `2"`, TMN `1½"`,
  lavado sin aviso (M2 = 6 410 g, diferencia 0,08 %) y `cumple`, aunque el cuerpo traía
  `veredicto: 'no_cumple'` y un `resultado` falso. « no.6 » respondió 409 en
  `numeroInforme`. Con el módulo apagado la obra no se lista ni deja registrar (400);
  al encender, el ensayo vuelve. **Ese ensayo se queda** en desarrollo para T12 a T16.
- **T12 — `actualizado_en` truncado.** El `PATCH` se condiciona a que `actualizado_en`
  no haya cambiado desde la lectura (sin transacciones, es el testigo). Postgres lo
  guarda con microsegundos y el `Date` leído tiene milisegundos: comparados tal cual,
  todo `PATCH` sobre un ensayo recién creado daría 409. Se compara con
  `date_trunc('milliseconds', …)`. Cinco `PATCH` seguidos pasaron.
- **T12 — comprobado en el 8082.** Corregir solo las observaciones conservó las masas y
  recalculó (1½" = 86,48 %); la tara a 100 g recalculó (86,27 %) y al volver a 0 regresó;
  quitar la franja dejó el veredicto en `null` y volver a escogerla copió la franja
  entera (10 tamices) con `cumple`; una masa seca mayor que la húmeda respondió 400 en
  `masas.seca`. **«De otra obra → 404» no se pudo provocar** con la sesión de gerencia
  (ve todas): se comprobaron los equivalentes a su alcance —id inexistente y obra con el
  módulo apagado, ambos 404— y el de otra obra por lectura (`alcanzaLaObra`). Queda para
  T24 con una cuenta de laboratorista.
- **T13 — comprobado en el 8082.** Enviar «No. 7» incompleto respondió 400 con los 25
  campos que faltaban; descartarlo lo sacó del listado y su número quedó libre (volver a
  registrar «no. 7» dio 201; ese segundo también se descartó). Enviar «No. 6» lo dejó
  `enviado`, con «Revisó» y un evento en la historia; corregirlo, descartarlo o
  reenviarlo respondió 409 con su estado, y el listado cuenta `pendientes: 1`. El cargo
  de «Revisó» salió `null` porque la cuenta de gerencia usada no tiene cargo: es el dato,
  no un fallo.
- **T14 — comprobado en el 8082.** Sobre «No. 6»: devolver sin comentario → 400; con
  comentario → `devuelto` y el comentario visible; se corrigió, se reenvió (el comentario
  deja de mostrarse y queda en la historia) y se aprobó con «Aprobó» y su fecha; un
  segundo `aprobar`, devolverlo o corregirlo → 409 «está aprobado». **«No. 6» queda
  aprobado** para T15 y T16. La anulación se probó en «No. 8» (mismos datos): anular un
  borrador → 409; sin motivo → 400; con motivo → `anulado`, conservando masas, veredicto y
  «Aprobó»; anularlo otra vez → 409. Se corrigió la frase «está borrador» → «está en
  borrador» (`enFrase`, que ahora usan también los rechazos del `PATCH`).
- **T15 — comprobado en el 8082.** Se crearon dos partes de PRUEBA-018 en desarrollo
  (2026-09-22 y 2026-09-23). El del 22 trae «No. 6» (aprobado, `cumple`, SBG-50) y no
  «No. 8» (anulado, mismo día); un borrador del mismo día («No. 9») aparece con su estado
  y veredicto `null`, y al descartarlo desaparece; con el módulo apagado la lista viene
  vacía; el del 23 no trae nada. La regla `granulometriasDelParte` (vigentes / fijados /
  antes del módulo) lleva su caso en el guion.
- **T16 — lo que se probó por la ruta real y lo que no.** Por `POST …/cerrar` en el 8082:
  el parte del 22 (con «No. 6») ya **no** nombra Control Calidad de Obra en el rechazo y
  el del 23 (sin ensayos) sí → los ensayos cuentan (RF-110). **Cerrar de verdad por la
  ruta no se pudo**: un parte cerrable exige máquinas de la obra y una foto del día en
  R2, y no se subieron fotos de prueba al bucket sin permiso. La fijación se comprobó
  cerrando el parte del 22 con **la misma sentencia** que la ruta
  (`granulometriasParaFijarAlCerrar`) desde un guion de un solo uso, ya borrado: quedó
  fijado «No. 6» aprobado/`cumple`; al anular «No. 6», la sección del parte cerrado siguió
  idéntica (RF-112), y volver a cerrarlo respondió 409. La guarda de carrera del `WHERE`
  (ensayo descartado entre el conteo y el cierre) se verificó por lectura, no provocada.
  **Pendiente para T24:** un cierre completo por la ruta, desde el panel, con foto.
- **T17 — casillas juntas.** `ModulosDeLaObra` recibe ahora `elegidos` (los tres
  interruptores) en vez de uno por prop, y el alta guarda un solo estado con
  `MODULOS_DE_OBRA_NUEVA`. Comprobado en Chrome (8082): el alta muestra «Lleva
  laboratorio» marcada; en «Corregir PRUEBA-018» se desmarcó y guardó, y el servidor
  quedó con `laboratorio: false` y almacén y cantera intactos (se volvió a encender por
  API). **El aviso con el nombre del laboratorista queda para T24**: exige una persona
  con acceso de laboratorista en la obra, y crear cuentas con contraseña lo hace Diego,
  no la automatización del navegador.
- **T18 — `react-native-svg` dibuja en web.** La prueba mínima (rect, línea, círculo)
  pintó 200×100 en el panel: no hace falta librería nueva. La curva quedó en
  `curva-granulometrica.tsx` y se ve en la página provisional con el ensayo del Excel
  (15 círculos, todos dentro) y con el mismo alterado en el 1½" (ese punto es un triángulo
  hacia arriba, sobre el límite superior), más el aviso de masas incompletas. Dos ajustes
  de web: la rotación del rótulo vertical va como `transform="rotate(…)"` (con
  `rotation`/`origin` React avisaba de una propiedad `transform-origin` inválida), y el
  grupo lleva `fontFamily={Fonts.sans}` porque el texto de un SVG no hereda la fuente del
  panel y salía con serifa.
- **T18 — el 8082 sin `CI=1`.** Con `CI=1`, Metro no vigila los archivos y servía la
  pantalla vieja tras cada cambio. El segundo servidor se lanza ahora sin esa variable.
  (El 2026-09-25, a pedido de Diego, se apagó el 8082 y se borró su registro, que tenía
  impresos los secretos del `.env`; desde T21 se prueba en el `npm run web` de Diego,
  arrancado después de los últimos cambios de la API.)
- **T18 — Prettier.** El proyecto no tiene configuración de Prettier: pasarlo con los
  valores por defecto cambia las comillas a dobles. Si se usa, que sea con
  `--single-quote --print-width 100 --trailing-comma all`, que es el estilo del código.
- **T19 — comprobado en Chrome (8082).** Listado con periodo sobre la fecha de ejecución
  (30 días por defecto), selector de obra para la gerencia que solo ofrece las obras con
  laboratorio (PRUEBA-018), veredicto con símbolo y texto y estado con etiqueta. Con un
  ensayo enviado («No. 10», creado por API para esto) sale «Hay 1 ensayo esperando su
  aprobación»; el filtro de estado «Anulado» dejó «No. 8» y «No. 6», y sumando
  «No cumple» no quedó ninguno con su aviso. Ningún contenedor desborda a 1536 px y los
  «Abrir» se ven; «Abrir» lleva a `/panel/laboratorio/[id]` (pantalla provisional de
  T20) y «Nuevo ensayo» crea el borrador y lo abre (**ese borrador se queda** para T20).
  `filtrarEnsayos` lleva su caso en el guion. Tropiezo: la ruta `[id].tsx` se creó
  segundos antes que su pantalla y Metro guardó el «no encontrado» hasta recargar.
- **T20 — comprobado en Chrome (8082), sobre el borrador de T19 (ahora «No. 11»).** Se
  digitó el ensayo del Excel con coma decimal y, sin guardar, la tabla dio los quince
  `% pasa` de la hoja (100,00 … 3,39), fondo sin `% pasa`, humedad 3,2 %, TM `2"`, TMN
  `1½"`; con SBG-50, ✓ CUMPLE y la curva dentro. Con M2 = 6 450 g salió el aviso de
  lavado (0,70 %, faltan 45,2 g). El 1½" en 200 g marcó «▲ Por encima», NO CUMPLE y el
  triángulo en la curva; al volver, CUMPLE. Guardar con el fondo vacío dejó en el
  servidor el borrador sin veredicto y «falta la masa retenida en el fondo»; al recargar,
  las casillas volvieron del servidor («895,1»); completar y guardar dio `cumple`. Una
  tara negativa, «10q9» y una ejecución anterior a la recepción se marcan al escribir y
  «Guardar» se niega sin tocar el servidor. **«No. 11» queda en borrador, completo**, para
  T21. Las etiquetas de estado y veredicto pasaron a `etiquetas.tsx`, y
  `leerMasa`/`formatearNumero` llevan su caso en el guion.
- **T21 — comprobado en Chrome (8081), sobre «No. 11».** Con un cambio sin guardar,
  «Enviar» se desactiva y lo dice. Enviar → «Revisó» y el paso en la historia; quedan
  «Aprobar» y «Devolver». Devolver sin comentario se niega en la ventana; con comentario
  → Devuelto, con el comentario en rojo y los botones del laboratorista. Se corrigió, se
  guardó, se reenvió (el comentario deja de mostrarse) y se aprobó → «Aprobó», ninguna
  casilla editable, solo «Anular». Anular con motivo → marca ANULADO con quién, cuándo y
  por qué, datos conservados, ningún botón. RF-93 en «No. 12» (creado y enviado por API):
  con la pantalla abierta se aprobó por API y al pulsar «Devolver» salió «Otra persona
  actuó sobre este ensayo…» y la pantalla mostró Aprobado. **Dos arreglos en la marcha:**
  la ventana del 409 se cerraba al rearmarse la pantalla y el motivo se perdía (ahora lo
  guarda la pantalla de arriba), y la marca decía «a. m.. Motivo» (ahora «· Motivo»).
  Estado de los datos de prueba: «No. 11» anulado, «No. 10» y «No. 12» aprobados.
- **T22 — cómo se probó la impresión.** No se abrió el diálogo de impresión: bloquea la
  extensión de Chrome. Se aplicaron en pantalla las mismas reglas de `@media print` y se
  midió la hoja: **720 × 909 px en (0, 0)**, dentro de la carta útil (740 × 980 a 96 ppp
  con 10 mm de margen); solo la hoja queda visible. **Falta que Diego abra la vista
  previa real (Ctrl+P) una vez**, para confirmar con el motor de impresión de Chrome.
- **T22 — tres ajustes de impresión.** (1) La primera medida dio 1 043 px (dos hojas): se
  compactaron los renglones de la tabla, la curva bajó a 200 px, el relleno a
  `Spacing.two` y las masas a cuatro columnas. (2) El `ScrollView` del panel lleva un
  `transform` vacío que corría el `position: fixed` 169 px hacia abajo y recortaba: al
  imprimir se anulan `transform` y `overflow`. (3) Eso acostaba el rótulo vertical de la
  curva: el SVG queda fuera de la regla (`:not(svg, svg *)`).
- **T22 — detalles.** El logo está en `assets/logo-geolab.jpeg`, junto al de OCC (no en
  `assets/images/`); es idéntico al del Excel. El bloque se marca con `nativeID` (en web,
  su `id`): `dataSet` no existe en los tipos de React Native. Comprobado: «No. 12»
  (aprobado) sin marca y con emisión = día de aprobación; «No. 11» con «ANULADO — … ·
  Motivo»; un borrador temporal «No. 13» con «BORRADOR — SIN APROBAR · No es un informe
  válido» (se descartó después).
- **T23 — comprobado en Chrome (8081).** Parte abierto del 25 de PRUEBA-018 (creado por
  API): «Control Calidad de Obra (1)» con la tabla del módulo —«No. 12 · SBG-50 · ✓ CUMPLE ·
  Aprobado · Abrir»—, el índice cuenta 1 y «Falta llenar» ya no nombra la sección; «Abrir»
  lleva al ensayo. Parte **cerrado** del 22: los fijados, con su nota, y «No. 6 · Aprobado»
  aunque hoy está anulado (RF-112). Parte abierto del 22 de OBR-001 (laboratorio
  apagado): ningún ensayo (RF-15). `npx expo export --platform web` terminó sin error y sin
  secretos en `dist/client`. La pantalla del parte cuenta los ensayos para el índice y
  para el aviso de cierre con la misma regla que el servidor; mientras cargan cuentan cero
  y el aviso de cierre espera. El archivo usa comillas dobles y se respetó su estilo.
- **T24 — validación hecha, sin marcar.** El recorrido RF por RF está en
  `specs/VALIDACION.md` («Validación — Spec 018»): 99 RF en verde del todo, 9 en verde por
  la regla y pendientes de prueba en vivo, 2 pendientes de la vista previa de impresión y
  2 sin cubrir por dudas abiertas (RF-19, RF-30). Veredicto: **no cumplida todavía**. Falta:
  P1 (cuenta de laboratorista), P2 (cierre real con foto en R2), P3 (Ctrl+P del informe),
  las respuestas del laboratorio a las dudas abiertas, y decidir si el candado de «enviar
  con cambios sin guardar» entra a la spec.
- **Cambio del 2026-09-25 — RF-113.** Diego aprobó el candado de «no enviar con cambios sin
  guardar», que ya estaba hecho desde T21 sin estar en la spec. Se añadió como RF-113 (junto a
  RF-73), con su caso límite y «guardado automático» en Fuera de alcance. No hubo código que
  rehacer: la demo de T21 lo cubre.
- **Pruebas de Diego del 2026-09-25.** Con la laboratorista (Catalina, PRUEBA-018) ve solo el
  módulo Laboratorio; con un residente de PRUEBA-018 ve el módulo; el informe se imprime y se
  guarda en PDF. Lo que vio el residente de OBR-001 (sin el módulo) era lo esperado: esa obra
  tiene Laboratorio apagado (RF-12).
