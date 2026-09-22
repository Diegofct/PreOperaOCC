# Tareas — Spec 016

Tareas de menos de 30 minutos, ordenadas por dependencia. Cada una lleva los RF que
cubre y una línea `Hecho cuando:` que se pueda comprobar sin interpretar.

**Se implementa una tarea cada vez** (`/sdd:implementar T1`), y al terminarla se para.
Ninguna tarea se marca sin `npm run verificar`, `npm run typecheck` y `npm run lint`
en verde.

- [x] T1. Reglas del horario en `src/shared/rules/horas.ts`: tipos `Tramo` y `HorarioDeObra`,
      `HORARIO_PROPUESTO`, `HORARIO_ANTERIOR`, `validarHorarioDeObra`, `minutosSemanales`,
      `tramosDelDia` y `describirHorarioDelDia`, con sus casos en `scripts/verificar-reglas.ts`.
      (RF-1, RF-2, RF-3, RF-6, RF-7, RF-10, RF-11, RF-12, RF-13, RF-35)
      Hecho cuando: `npm run verificar` pasa con casos para: el propuesto suma 44,5 h y la obra de
      ejemplo (8–12 / 14–18 + sábado 8–12) 44 h; tramo invertido, tramo de duración cero, tramos que
      se pisan y lunes a viernes vacío se rechazan con su día y tramo; sábado vacío es válido;
      `tramosDelDia` da semana un martes, sábado un sábado, `[]` un sábado sin trabajo, semana un
      domingo y semana un festivo que cae en sábado; y los otros dos comandos en verde.

- [x] T2. `desglosarJornada(fecha, entrada, salida, horario)` con el desglose nuevo (ordinarios,
      extra diurna y nocturna tomadas de las últimas horas, nocturnas ordinarias, domingo o festivo,
      más de 2 h extra). Los llamadores actuales (`pantalla-partes.tsx`, `resumen+api.ts`) pasan
      `HORARIO_ANTERIOR`, así que la pantalla no cambia todavía. (RF-8, RF-14 a RF-19, RF-36,
      RF-40, RF-41)
      Hecho cuando: los casos existentes de `verificar-reglas.ts:2352`–`:2406`, pasados a la firma
      nueva con `HORARIO_ANTERIOR`, dan las mismas horas trabajadas, extra y nocturnas que antes;
      pasan los casos nuevos del plan (martes 7–20, martes 4–15, sábado sin trabajo, domingo 7–17,
      martes 14–18, horario de un tramo, martes 20–02); y los tres comandos en verde.

- [x] T3. `horarioEfectivo` y los ayudantes del desplegable (`partirHora`, `unirHora`,
      `minutosOfrecidos`), con sus casos. (RF-22, RF-24, RF-25, RF-30, RF-33, RF-34)
      Hecho cuando: pasan los casos de parte con horario guardado → ese; cerrado sin horario →
      `HORARIO_ANTERIOR`; abierto → el de la obra; `unirHora('07','')` → `''`;
      `minutosOfrecidos('07:10')` incluye `10`; y los tres comandos en verde.

- [x] T4. Esquema del servidor: `obras.horario` (not null, default `HORARIO_PROPUESTO`) y
      `partes_de_obra.horario` (nulo); migración generada **y aplicada en Neon con el visto bueno
      de Diego**. (RF-1, RF-2, RF-9, RF-23)
      Hecho cuando: `npm run db:generate:servidor` deja un archivo nuevo en `drizzle/servidor/` con
      los dos `add column`; Diego autoriza; `npm run db:migrar:servidor` termina sin error; una
      lectura de solo consulta muestra que las obras existentes tienen el horario propuesto y los
      partes, `horario` nulo; y los tres comandos en verde.

- [x] T5. Contratos y tipos: `horarioDeObra`, `obraNueva.horario` con default, `obraEditada` escrita
      a mano sin default, `ObraFila.horario`; `personaDelParte.observaciones`,
      `PersonaDelParte.observaciones?`, `PersonaDelParteFila.observaciones?`, `construirPersona`
      guardándolas; `ParteFila.horario`. (RF-1 a RF-7, RF-26, RF-29)
      Hecho cuando: pasan los casos de contrato: `obraEditada.parse({ nombre: 'X' })` no trae
      `horario`; `obraNueva.parse` sin horario trae el propuesto; un horario con tramos que se pisan
      da el mensaje de la regla; `personaDelParte` acepta y recorta `observaciones` y la omite sin
      error; y los tres comandos en verde.

- [x] T6. API de obras: `GET` devuelve `horario`, `POST` y `PATCH` lo guardan y rechazan uno
      inválido con 400. (RF-3, RF-4, RF-5, RF-6, RF-7)
      Hecho cuando: tras reiniciar `npm run web`, el `GET /api/panel/obras` trae el horario de
      Consorcio Antioquia; un `PATCH` de prueba con tramos que se pisan responde 400 con el mensaje
      (sin guardar nada); y los tres comandos en verde. (El alta real se prueba en T8.)

- [x] T7. `SelectorDeHora` en `componentes.tsx` y su uso en Clima («Desde» y «Hasta»).
      (RF-30, RF-31, RF-33, RF-34)
      Hecho cuando: en Chrome, en la sección Clima de un parte abierto, «Desde» son dos desplegables
      (00–23 y 00/15/30/45), una franja nueva arranca en blanco, una hora guardada fuera de la
      rejilla se ve tal cual, y **no se guarda nada**; y los tres comandos en verde.

- [x] T8. Editor del horario (`editor-horario.tsx`) en el alta de obra: lunes a viernes con uno o dos
      tramos, sábado con casilla «no se trabaja», total semanal y aviso de más de 42 h.
      (RF-1 a RF-3, RF-6, RF-7, RF-30, RF-31, RF-35, RF-37, RF-38)
      Hecho cuando: en Chrome, como gerencia, el formulario de alta arranca con el horario propuesto
      y muestra «44 h 30 min a la semana» con el aviso; se registra la **obra de prueba «PRUEBA-016»** con
      8–12 / 14–18 y sábado 8–12 (se guarda aunque avise); un tramo invertido muestra su error; y
      los tres comandos en verde.

- [x] T9. Editor del horario en la corrección de obra (`ventana-obra.tsx`). (RF-4, RF-5, RF-35)
      Hecho cuando: en Chrome, la ventana «Corregir» de PRUEBA-016 muestra su horario, marcar
      «no se trabaja» el sábado y guardar deja 40 h sin aviso; corregir solo el nombre no cambia el
      horario; y los tres comandos en verde.

- [x] T10. Partes: el `GET` devuelve el horario efectivo; cerrar y anular congelan el horario en la
      misma sentencia; el Inicio (`resumen+api.ts`) cuenta extras con el horario efectivo de cada
      parte. (RF-10, RF-22, RF-23, RF-24, RF-25)
      Hecho cuando: tras reiniciar `npm run web`, el `GET /api/panel/partes?fecha=` de un día con
      parte cerrado de antes de la spec trae `HORARIO_ANTERIOR` y el de un parte abierto trae el de
      su obra; y los tres comandos en verde. (El cierre se prueba en T14 sobre PRUEBA-016.)

- [x] T11. Personal: horario del día, entrada y salida con `SelectorDeHora`, desglose nuevo y aviso
      de más de 2 h extra. (RF-10, RF-20, RF-22, RF-31, RF-36, RF-38)
      Hecho cuando: en Chrome, en un parte abierto de PRUEBA-016 un martes, la sección dice el
      horario del día, y una persona de 07:00 a 20:00 muestra 11 h trabajadas, 8 ordinarias, 2 h
      extra diurnas, 1 h extra nocturna y el aviso; y los tres comandos en verde.

- [x] T12. Observaciones por persona: cuadro de texto en cada persona, guardado por el `PATCH`, y
      visible en un parte cerrado. (RF-26, RF-27, RF-28, RF-29)
      Hecho cuando: en Chrome, en el parte de PRUEBA-016, se escribe una observación, se guarda y
      sigue ahí al recargar; un parte anterior sin observaciones se ve sin error; y los tres
      comandos en verde.

- [x] T13. Hora del viaje de cantera con `SelectorDeHora` (`ventana-viaje.tsx`), comprobando el
      buscador dentro de la ventana. (RF-31)
      Hecho cuando: en Chrome, en la ventana de viaje, «Hora» son los dos desplegables, se puede
      escribir «07» en el buscador de la hora dentro de la ventana, y **se cancela sin registrar**;
      y los tres comandos en verde.

- [x] T14. Validación final: recorrido RF por RF de la spec + demo manual. (Todos)
      Hecho cuando: cada RF-1 a RF-41 tiene su comprobación con resultado, incluido cerrar el parte
      de PRUEBA-016, cambiar el horario de PRUEBA-016 y ver que el parte cerrado conserva sus cifras
      (RF-23, RF-24); los tres comandos están en verde y la spec queda marcada como Cumplida.

## Notas de ejecución

- **T1 (2026-09-21).** Las pruebas encontraron un error de cuentas del plan: el horario
  propuesto suma **44,5 h** (8 h × 5 + 4,5 h del sábado de 7:30 a 12:00), no 44. Corregido en la
  spec, el plan y estas tareas; el del ejemplo de OCC sí suma 44. El comportamiento no cambia:
  las dos pasan de 42 h y avisan.
- Festivo en sábado para las pruebas: el 1 de mayo de 2027 (fijo, no se corre al lunes).
- `desglosarJornada` sigue con la jornada fija hasta T2; la cabecera de `horas.ts` se reescribe
  en T2, cuando la jornada deja de ser fija de verdad.
- **T2 (2026-09-21).** Los 7 casos anteriores de `desglosarJornada`, con `HORARIO_ANTERIOR`,
  dan las mismas cifras sin tocar lo que esperan; pasan los 7 nuevos (235 verificaciones).
  `DesgloseDeHoras` conserva `extra` y `nocturnos` (totales) y añade `extraDiurna`,
  `extraNocturna`, `nocturnosOrdinarios` y `masDeDosExtra`, para que el Inicio y la pantalla
  sigan compilando sin cambiar lo que muestran hasta T10/T11. Lo nocturno se mide ahora sobre lo
  trabajado y no sobre la presencia: solo difiere si un descanso programado cayera de noche.
  Se quitaron `MINUTOS_ORDINARIOS` y `ALMUERZO` (sin usos fuera de `horas.ts`); `JORNADA` queda
  para `cubrenLaJornada`.
- Fuera de la tarea: `cubrenLaJornada` no la llama nadie en `src/` (solo el guion de
  verificación). Sigue midiendo contra 7:30–17:00 fijas; no se toca en esta spec.
- **T3 (2026-09-21).** `horarioEfectivo` recibe también `anuladoEn` (el plan solo decía
  `cerradoEn`): un parte **anulado sin cerrar** y sin horario solo puede ser de antes de la spec
  —desde ella anular también congela (T10)—, así que se lee con `HORARIO_ANTERIOR` y no con el
  horario vigente de la obra, que es lo que pide RF-24 para los anulados. `partirHora` normaliza
  «7:30» a «07»/«30». `HORAS_DEL_DIA` es la lista de «00» a «23». 237 verificaciones.
- **T4 (2026-09-21).** Migración `drizzle/servidor/0012_common_karma.sql`: dos `ADD COLUMN`
  (`obras.horario` jsonb not null con el propuesto de default; `partes_de_obra.horario` jsonb
  nulo). El default sale de `HORARIO_PROPUESTO` en `horas.ts`, importado con ruta relativa como
  ya se hace con `ROLES`. **Aplicada en Neon con el «sí» de Diego** (`db:migrar:servidor`, salida
  0). Lectura de comprobación: Consorcio Antioquia tiene el horario propuesto; `horario` es
  `NOT NULL` en obras y nulo en partes; los 9 partes tienen `horario` nulo. Los endpoints de
  obras, partes y personas siguen respondiendo 200 con el código de antes.
- **Hallazgo para la validación:** de los 9 partes que hay en la base **ninguno está cerrado**.
  RF-25 (partes cerrados antes de la spec con la jornada de siempre) no tiene datos reales con
  que verse: queda cubierto por las pruebas de `horarioEfectivo` y `HORARIO_ANTERIOR`. Y los 9
  partes abiertos pasarán al horario de su obra en T10 (los sábados, de 8 h a 4,5 h ordinarias).
- **T5 (2026-09-21).** `horarioDeObra` valida con `validarHorarioDeObra` y devuelve su mensaje;
  `obraNueva` pone el propuesto si no viene; `obraEditada = z.object(camposDeObra).partial()`,
  sin defaults. `construirPersona` guarda `observaciones` (el `PATCH` de partes ya las acepta,
  porque pasa la fila del contrato entera; la pantalla empieza a mandarlas en T12). 241
  verificaciones.
- **Defecto anterior encontrado y corregido de paso (es parte de la tarea, no un extra):** el
  `obraEditada = obraNueva.partial()` de antes dejaba vivo el `default(true)` de `activa`.
  Comprobado con zod: `parse({ nombre: 'Otro' })` daba `{ nombre: 'Otro', activa: true }`. Como
  la ventana «Corregir» solo manda lo que cambió, **corregir el nombre o el municipio de una obra
  inactiva la reactivaba en silencio**. El contrato nuevo no tiene defaults en la edición y el
  caso de `verificar-reglas.ts` («corregirla sin horario no lo toca») lo cubre.
- **T6 (2026-09-21).** `horario` en el `GET`, en el `returning` del `POST` y en `COLUMNAS` del
  `PATCH`/`DELETE`; la validación la hace el contrato de T5 antes de escribir. Probado desde el
  panel sin reiniciar el servidor (tomó la ruta nueva): el `GET` trae el horario propuesto de
  Consorcio Antioquia; un `PATCH` con solo un horario de tramos que se pisan responde **400**
  «Los dos tramos de lunes a viernes se pisan…», y la obra se relee idéntica.
- **T7 (2026-09-21).** Revisado en Chrome sin guardar nada. En el parte de hoy (abierto, sin
  clima), «Añadir tramo» da «Desde hh : min mm» y «Hasta hh : min mm» en blanco; escribir «07» en
  el buscador de la hora y Enter elige 07, y el aviso sigue diciendo «falta la hora de inicio»
  hasta elegir los minutos (00/15/30/45); con 07:30 pasa a «falta la hora de fin». Para la hora
  fuera de la rejilla no había datos reales (el único parte con horas, el del 14, tiene «7:00»,
  «12:00», «15:00», «18:00»), así que se inyectó en la respuesta del navegador una franja
  07:10–11:50 y otra «7:00»–12:00, bloqueando cualquier escritura: se ven «07 : 10», «11 : 50» y
  «07 : 00», y los minutos de la primera ofrecen 00, **10 ✓**, 15, 30, 45. Ninguna petición de
  escritura salió; tras recargar, el parte de hoy sigue con 0 tramos.
- «7:00» (guardado sin cero) se **muestra** como «07 : 00», pero el valor que se guardaría sigue
  siendo «7:00» mientras nadie lo toque (RF-33).
- La lista de la hora tiene el ancho del botón (96): el buscador queda angosto pero se usa bien.
- **T8 (2026-09-21).** `editor-horario.tsx` (`EditorDeHorario` y `horarioValido`) en el alta de
  obra. En Chrome como gerencia: arranca con el propuesto y dice «44 h 30 min a la semana» con
  el aviso ⓘ; poner el «Sale» del sábado a las 06 muestra «El tramo 1 de sábado termina antes
  de empezar.» y deshabilita «Registrar obra». Con autorización de Diego se registró
  **PRUEBA-016 — «Obra de prueba spec 016 (horario)»**, sin municipio, con 08:00–12:00 /
  14:00–18:00 y sábado 08:00–12:00 («44 h a la semana», aviso, se guarda igual): el `GET` la
  devuelve con ese horario y activa. Después del alta, el formulario vuelve al propuesto.
- Ajustes vistos en pantalla: «Sale a descansar» partía la etiqueta en dos líneas y descuadraba
  su caja (ahora «Entra/Sale» y «Vuelve/Sale»); la casilla «Los sábados no se trabaja» va al final
  de la fila del sábado. El mensaje de una hora sin elegir pasó a «Al tramo N de … le falta elegir
  una hora.», con su caso en `verificar-reglas.ts`.
- Trampa de la demo: clics y tecleo encadenados sin pausa dejaron dos listas abiertas y ningún
  cambio; con ~0,6 s entre acciones funciona. No es del código (un usuario no teclea en 50 ms).
- **T9 (2026-09-22).** Código hecho y los tres comandos en verde (241 verificaciones). La
  ventana «Corregir» manda el horario solo si cambió, comparando tramo por tramo: el `jsonb` de
  Postgres reordena las llaves y `JSON.stringify` daría distinto dos horarios iguales. RF-5 ya lo
  cubren los permisos (Obras es solo de gerencia en `permisos.ts`, y el `PATCH` exige
  `obras/escribir`). **Pendiente la demo en Chrome** (la extensión no estaba conectada); la tarea
  no se marca hasta hacerla.
- **T10 (2026-09-22).** Código hecho y los tres comandos en verde. El `GET` y el `POST` de partes
  devuelven `horario` ya efectivo (`conHorarioEfectivo`, que junta `obras.horario`). Cerrar y
  anular congelan el horario en la misma sentencia con subconsultas de
  `features/bitacoras/servidor/horario.ts` (las dos rutas las comparten, y una ruta no importa a
  otra); se comprobó el SQL que generan con `PgDialect`. El Inicio cuenta extras con
  `horarioEfectivo` por parte. **Pendiente la prueba del `GET`** con sesión (no había navegador):
  se hace junto con la de T9.
- Fuera de la tarea: el `PATCH /api/panel/partes/:id` se tipa como `ParteFila` en
  `cliente-api.ts` pero devuelve la fila sin `obraNombre`, `usuarioNombre` ni `horario` (ya
  faltaban los nombres antes de la spec). Hoy no importa: la pantalla vuelve a pedir el día tras
  guardar y no lee esa respuesta.
- **T11 (2026-09-22).** Código hecho y los tres comandos en verde. Personal calcula con
  `parte.horario` (el efectivo que manda el servidor desde T10) y dice arriba «Horario de este
  día: …» con `describirHorarioDelDia`. Entrada y salida con `SelectorDeHora`. **Decisión de
  pantalla:** trabajadas y ordinarias se muestran siempre; extra diurnas, extra nocturnas y
  nocturnas ordinarias solo si no son cero (tres «0 min» por persona tapaban la cifra que
  importa). El aviso de más de 2 h va en su propio renglón, con `Aviso` (símbolo y texto).
  **Pendiente la demo en Chrome**, junto con las de T9 y T10.
- **Demos de T9, T10 y T11 (2026-09-22, en Chrome).** T9: corregir solo el nombre mandó
  `{"nombre": …}` y el horario siguió igual; marcar «no se trabaja» el sábado mostró «40 h a la
  semana» sin aviso y guardó `sabado: []` (PRUEBA-016 queda así: L–V 8–12 / 14–18, sin sábado).
  Se vio que el `jsonb` devuelve `sabado` antes que `semana`, como se previno. T10: el `GET` de
  los 9 días con parte (todos abiertos) trae `horario` con el de su obra y sin `horarioDeLaObra`;
  **no hay ningún parte cerrado anterior a la spec**, así que ese caso solo lo cubren las pruebas
  de `horarioEfectivo` (T3). T11: se abrió el parte del martes 2026-09-22 de PRUEBA-016; dice
  «Horario de este día: De 08:00 a 12:00 y de 14:00 a 18:00.», y una persona de 07:00 a 20:00
  muestra 11 h trabajadas, 8 h ordinarias, 2 h extra diurnas, 1 h extra nocturnas y el aviso
  (sin guardar).
- **T12 (2026-09-22).** El servidor ya guardaba `observaciones` desde T5; solo faltaba la
  pantalla: `FilaPersona.observaciones`, `Campo multilinea` en cada persona y el `PATCH` que lo
  manda. La regla de cierre no mira las observaciones de las personas (RF-27, por
  construcción). Demo en Chrome: en el parte del 2026-09-22 de PRUEBA-016 se guardó a Pedro
  Cartagena de 07:00 a 20:00 con una observación, y al recargar sigue ahí (el `GET` la trae).
  **Ningún parte anterior tiene personal**, así que RF-29 se probó interceptando el `GET` en la
  página para quitar `observaciones` (y bloqueando cualquier escritura): la persona sale con el
  cuadro vacío y sin error. RF-28 (verla con el parte cerrado) queda para T14, que cierra este
  parte.
- **T13 (2026-09-22).** «Hora» del viaje con `SelectorDeHora`. **Decisión:** la hora con que
  abre la ventana (la de ahora) se redondea **hacia abajo** al cuarto de hora; con los minutos
  exactos abría con un «37» fuera de la rejilla. Hacia abajo para no registrar un viaje a una
  hora que no ha llegado. No choca con RF-33: es una propuesta de la pantalla, no una hora
  guardada. Demo en Chrome (Consorcio Antioquia, con escrituras bloqueadas en la página): abrió
  en 08:45, el buscador de la hora dentro de la ventana filtró «07» y lo eligió, y «Cancelar»
  cerró sin intentar ningún envío.

## Validación (T14, 2026-09-22)

Comandos: `npm run verificar` → 241 verificaciones correctas; `npm run typecheck` y
`npm run lint` sin errores (salida 0). Fugas: `npx expo export --platform web` y búsqueda de
`DATABASE_URL`, `SECRETO_TOKENS` y `R2_LLAVE_SECRETA` en `dist/client` → vacía; `dist` borrado.
Todo lo de Chrome, como gerencia. **Cambio de la demo, decidido por Diego:** el parte de
PRUEBA-016 se **anuló** en vez de cerrarse (cerrar exigía inventar máquina, fotos en R2 y ensayo
en producción). Anular congela el horario con la misma subconsulta que el cierre.

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-1 | `verificar-reglas.ts:2500` (uno o dos tramos) + Chrome (T8, T9) | verde |
| RF-2 | `verificar-reglas.ts:2500` («sin sábado vale») + Chrome (T9: `sabado: []` guardado) | verde |
| RF-3 | Chrome (T8): el alta arranca en 7:30–12:00 / 13:30–17:00 + sábado 7:30–12:00 | verde |
| RF-4 | Chrome (T9): «Corregir» muestra y cambia el horario | verde |
| RF-5 | `permisos.ts` (Obras solo `admin`) + `PATCH` con `requerirPermiso('obras','escribir')` | verde (lectura de código) |
| RF-6 | `verificar-reglas.ts:2500` (invertido y de duración cero) + Chrome (T8) | verde |
| RF-7 | `verificar-reglas.ts:2500` (tramos que se pisan) | verde |
| RF-8 | `verificar-reglas.ts:2583` (el descanso no cuenta) | verde |
| RF-9 | Chrome (T10): Consorcio Antioquia trae el horario propuesto | verde |
| RF-10 | `verificar-reglas.ts:2750` + Chrome (T11): «Horario de este día: De 08:00 a 12:00 y de 14:00 a 18:00.» | verde |
| RF-11 | `verificar-reglas.ts:2560` | verde |
| RF-12 | `verificar-reglas.ts:2560`, `:2613` (sábado sin trabajo, todo extra) | verde |
| RF-13 | `verificar-reglas.ts:2560`, `:2622` (domingo y festivo contra L–V) | verde |
| RF-14 | `verificar-reglas.ts:2630` | verde |
| RF-15 | `verificar-reglas.ts:2583` + Chrome (T11: 8 h ordinarias) | verde |
| RF-16 | `verificar-reglas.ts:2583` + Chrome (T11: 3 h extra) | verde |
| RF-17 | `verificar-reglas.ts:2583` + Chrome (T11: 2 h diurnas, 1 h nocturna) | verde |
| RF-41 | `verificar-reglas.ts:2601` | verde |
| RF-18 | `verificar-reglas.ts:2639` + etiqueta «nocturnas ordinarias» en Personal | verde |
| RF-19 | `verificar-reglas.ts:2413`, `:2622` + etiqueta «Domingo o festivo» | verde |
| RF-20 | Chrome (T11). Extra y nocturnas ordinarias solo se muestran si no son cero (decisión en T11) | verde |
| RF-21 | Lectura: ni la pantalla ni la API muestran pesos ni recargos | verde |
| RF-22 | `verificar-reglas.ts:2648` + Chrome (T10: los 9 partes abiertos traen el de su obra) | verde |
| RF-23 | `cerrar+api.ts` con `horarioDeLaObraDelParte()` en el mismo `UPDATE`; SQL comprobado con `PgDialect` (T10). **No se cerró un parte real** (decisión de Diego) | verde (lectura de código) |
| RF-24 | Chrome (T14): parte anulado → horario de la obra cambiado a 06:00–14:00 → el parte sigue en 8–12 / 14–18 y muestra 11 h, 8 h, 2 h + 1 h extra y el aviso | verde |
| RF-25 | `verificar-reglas.ts:2648` (cerrado sin horario → jornada anterior). Sin datos reales: no hay partes cerrados de antes de la spec | verde (prueba pura) |
| RF-26 | Chrome (T12): se escribe, se guarda y sigue al recargar | verde |
| RF-27 | `bloqueosDelCierre` no mira las observaciones de las personas; `verificar-reglas.ts:2724` | verde (por construcción) |
| RF-28 | Chrome (T14): el parte anulado muestra la observación de Pedro | verde (anulado; cerrado por el mismo componente) |
| RF-29 | Chrome (T12): `GET` interceptado sin `observaciones` → cuadro vacío, sin error | verde |
| RF-30 | `verificar-reglas.ts:2675` + Chrome (T7, T11, T13) | verde |
| RF-31 | Chrome: Personal (T11), Clima (T7), viaje de cantera (T13), horario de la obra (T8, T9) | verde |
| RF-32 | Un solo `SelectorDeHora` en `componentes.tsx` para cualquier hora nueva | verde (por construcción) |
| RF-33 | `verificar-reglas.ts:2675` (`minutosOfrecidos('07:10')`) + Chrome (T7) | verde |
| RF-34 | Chrome (T11, T12): persona nueva con «hh» y «mm» en blanco; franja nueva en blanco (T7) | verde |
| RF-35 | `verificar-reglas.ts:2485` + Chrome (T8: aviso de 44 h 30 min; T9: 40 h sin aviso) | verde |
| RF-36 | Chrome (T11): «3 h extra en el día: pasa de las 2…» | verde |
| RF-37 | Chrome (T8: obra guardada con aviso; T12: parte guardado con 3 h extra); el cierre no mira extras | verde |
| RF-38 | `Aviso` con símbolo «i» y texto (T8, T11) | verde |
| RF-39 | `resumen+api.ts` y Personal usan `horarioEfectivo`; ya no queda `HORARIO_ANTERIOR` en pantallas | verde |
| RF-40 | `verificar-reglas.ts:2419` (salida igual, más de 16 h) y `:2405` (cruza la medianoche) | verde |

**Alcance.** Nada fuera de la spec. Dos decisiones de pantalla dentro de ella: el desglose oculta
las cifras en cero (T11) y la hora inicial del viaje se redondea hacia abajo al cuarto de hora
(T13). **Fuera de alcance, sigue fuera:** ni dinero, ni tope semanal por persona, ni horarios por
persona, ni historial de horarios, ni turnos de noche programados, ni cambios en el celular
(`git status` no toca `src/db/local`, `src/app/(operador)` ni `src/features/sync`).

**Constitución.** Sin cambios en el móvil (1); todo salió de la spec (2); las reglas siguen en
`src/shared/rules/horas.ts` y el servidor y la pantalla usan las mismas (3); nada se borra: el
parte de prueba se anuló con motivo (4); puerta de calidad en verde (5); sin fugas en el bundle
(6); todo en español (7); sin dependencias nuevas (8).

**Veredicto: Cumplida.** Queda de la demo: PRUEBA-016 con horario 06:00–14:00 sin sábado y su
parte del 2026-09-22 anulado con motivo «Prueba spec 016: congelar el horario al anular (T14).».
Pendiente de Diego: dar de baja PRUEBA-016.

- Fuera de la tarea: en un parte cerrado o anulado, el aviso de más de 2 h dice «Se puede
  guardar igual», y los campos de Personal se ven como editables (igual que los de Maquinaria
  antes de esta spec). No engaña —no hay botón de guardar—, pero el texto sobra ahí.
