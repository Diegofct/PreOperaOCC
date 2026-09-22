# Plan técnico — Spec 016

> Lee antes `docs/constitucion.md` y el `spec.md` de esta carpeta.
> Aquí va el CÓMO. Si algo de esto cambia el comportamiento acordado, no se resuelve
> en el plan: se vuelve a la spec.

## Módulos y archivos

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `src/shared/rules/horas.ts` | Tipos `Tramo` y `HorarioDeObra`; `HORARIO_PROPUESTO` y `HORARIO_ANTERIOR`; `validarHorarioDeObra`, `minutosSemanales`, `tramosDelDia`, `describirHorarioDelDia`; `desglosarJornada(fecha, entrada, salida, horario)` con el desglose nuevo; `horarioEfectivo(parte, horarioDeLaObra)`; ayudantes del desplegable `partirHora`, `unirHora`, `minutosOfrecidos`. Cabecera reescrita (la jornada ya no es fija). | RF-1 a RF-3, RF-6 a RF-8, RF-10 a RF-19, RF-22, RF-24, RF-25, RF-30, RF-33, RF-35, RF-36, RF-41 |
| `scripts/verificar-reglas.ts` | Casos nuevos (ver Verificación) y los de `desglosarJornada` (`:2352`–`:2406`) pasados a la firma nueva con `HORARIO_ANTERIOR`, que deben dar lo mismo que hoy. | todos los de reglas |
| `src/db/servidor/esquema.ts` | `obras.horario` jsonb **not null** con default `HORARIO_PROPUESTO`; `partes_de_obra.horario` jsonb **nulo**. | RF-1, RF-2, RF-9, RF-23 |
| `drizzle/servidor/` | Migración generada con `npm run db:generate:servidor`. | RF-9 |
| `src/features/bitacoras/tipos.ts` | `PersonaDelParte.observaciones?: string`. | RF-26, RF-29 |
| `src/features/bitacoras/parte.ts` — `construirPersona` | Guarda `observaciones` (recortadas; `''` si no viene). | RF-26 |
| `src/features/panel/contratos.ts` | `horarioDeObra` (zod) con la misma validación que la regla; `obraNueva.horario` con default `HORARIO_PROPUESTO`; `obraEditada` escrita a mano con `horario` **opcional y sin default** (no `obraNueva.partial()`); `ObraFila.horario`; `personaDelParte.observaciones`; `PersonaDelParteFila.observaciones?`; `ParteFila.horario` (el efectivo) y `ParteFila.horarioObra`. | RF-1 a RF-7, RF-26 |
| `src/app/api/panel/obras+api.ts` y `obras/[id]+api.ts` | Devuelven y guardan `horario`. | RF-3, RF-4 |
| `src/app/api/panel/partes+api.ts` (`GET`) | Junta `obras.horario` y `partes_de_obra.horario` y devuelve el `horario` efectivo de cada parte (`horarioEfectivo`). | RF-10, RF-22, RF-24, RF-25 |
| `src/app/api/panel/partes/[id]+api.ts` (`PATCH`) | Personal con `observaciones`. | RF-26 |
| `src/app/api/panel/partes/[id]/cerrar+api.ts` | En la **misma sentencia** del cierre: `horario = (select horario from obras where id = obra_id)`, igual que ya se fijan los viajes de cantera. | RF-23 |
| `src/app/api/panel/partes/[id]/anular+api.ts` | Si se anula un parte **abierto**, congela el horario en la misma sentencia (`case when cerrado_en is null then (select …) else horario end`). Un parte cerrado antes de la spec conserva su `null` (jornada anterior). | RF-24, RF-25 |
| `src/app/api/panel/resumen+api.ts` | La cuenta de minutos extra del Inicio usa el horario efectivo de cada parte (junta `obras.horario`). | RF-16, RF-22, RF-24 |
| `src/features/panel/componentes.tsx` | `SelectorDeHora`: dos `Selector` (hora 00–23, minutos 00/15/30/45 más el guardado si no cae en la rejilla). Emite `''` hasta tener los dos. | RF-30, RF-33, RF-34 |
| `src/features/panel/editor-horario.tsx` (nuevo) | Editor del horario: dos tramos de lunes a viernes (el segundo se puede quitar), sábado con casilla «no se trabaja» y uno o dos tramos, total semanal y aviso de más de 42 h. Lo usan el alta y la corrección de la obra. | RF-1 a RF-4, RF-6, RF-7, RF-35, RF-37, RF-38 |
| `src/features/panel/pantalla-obras.tsx` y `ventana-obra.tsx` | Usan el editor; el alta arranca con `HORARIO_PROPUESTO`. Columna «Horario» en la tabla no (no cabe; ver Decisiones). | RF-3, RF-4 |
| `src/features/panel/pantalla-partes.tsx` — Personal | Línea con el horario del día; `SelectorDeHora` en entrada y salida; observaciones por persona (`Campo multilinea`); desglose con ordinarias, extra diurnas, extra nocturnas, nocturnas ordinarias y domingo/festivo; aviso de más de 2 h extra. | RF-10, RF-20, RF-26 a RF-29, RF-31, RF-36, RF-38 |
| `src/features/panel/pantalla-partes.tsx` — Clima | `SelectorDeHora` en «Desde» y «Hasta». | RF-31 |
| `src/features/panel/ventana-viaje.tsx` | `SelectorDeHora` en «Hora». | RF-31 |

## Modelo de datos

- **Local** (`src/db/local/schema.ts`): **sin cambios.** El pull del celular elige las columnas
  de `obras` una por una (`movil/pull+api.ts:91`–`97`), así que la columna nueva no viaja.
- **Servidor** (`src/db/servidor/esquema.ts`):
  - `obras.horario jsonb not null default '<HORARIO_PROPUESTO>'`, tipo `HorarioDeObra =
    { semana: Tramo[]; sabado: Tramo[] }`, `Tramo = { desde: 'HH:MM'; hasta: 'HH:MM' }`.
    `sabado: []` es «no se trabaja». El default de la columna es lo que da a las obras
    existentes el horario propuesto (RF-9) sin un `update` aparte.
  - `partes_de_obra.horario jsonb` **nulo y sin default**, como `cantera`: `null` es «todavía
    abierto» o «cerrado antes de esta spec», y `cerrado_en` distingue los dos casos.
  - Las observaciones por persona van dentro del jsonb `personal`: sin columna nueva.
- **Migraciones**: `npm run db:generate:servidor` → un archivo nuevo en `drizzle/servidor/` con
  los dos `alter table … add column`. Se aplica con `npm run db:migrar:servidor` **solo con el
  visto bueno de Diego** (es producción).
- **Compatibilidad**: los teléfonos no se enteran. Un panel desplegado con el código viejo sobre la
  base migrada sigue funcionando (ignora las columnas nuevas); el código nuevo sobre la base sin
  migrar falla al leer `obras.horario`, así que **primero se migra y después se despliega**.

## Algoritmo / reglas

Todo en `src/shared/rules/horas.ts`, puro, con minutos desde medianoche.

**Tramos del día** — `tramosDelDia(horario, fecha)` (RF-11 a RF-13):
1. Domingo o festivo (`esDominicalOFestivo`) → `horario.semana` (manda sobre el sábado).
2. Sábado → `horario.sabado` (puede ser `[]`).
3. Lunes a viernes → `horario.semana`.

**Horario efectivo** — `horarioEfectivo({ horario, cerradoEn }, horarioDeLaObra)` (RF-22, RF-24,
RF-25): si el parte tiene horario guardado, ese; si no y está cerrado, `HORARIO_ANTERIOR`
(7:30–12:00 / 13:30–17:00 también el sábado, que es exactamente la jornada de hoy); si no, el de la
obra.

**Desglose** — `desglosarJornada(fecha, entrada, salida, horario)`:
1. `validarHorario` como hoy (RF-40); si falla, `null`.
2. Presencia `[desde, hasta]`, con `hasta + 24 h` si cruza la medianoche.
3. Descansos del día = los huecos entre tramos consecutivos de `tramosDelDia` (RF-8). Tramos
   trabajados = presencia menos los descansos (RF-14: solo resta lo que se solapa).
4. `trabajados` = suma de tramos trabajados. `programados` = suma de `tramosDelDia`.
5. `ordinarios = min(trabajados, programados)`; `extra = trabajados − ordinarios` (RF-15, RF-16).
6. Las extra son **los últimos `extra` minutos** de los tramos trabajados, recorridos de atrás
   hacia adelante (RF-41). De ellos, los que caen entre 19:00 y 06:00 (también la madrugada del
   día siguiente) son `extraNocturna`; el resto, `extraDiurna` (RF-17).
7. `nocturnosOrdinarios` = minutos nocturnos trabajados − `extraNocturna` (RF-18).
8. `dominicalOFestivo` como hoy (RF-19); `masDeDosExtra = extra > 120` (RF-36).

**Validación del horario** — `validarHorarioDeObra` (RF-1, RF-2, RF-6, RF-7): lunes a viernes con 1
o 2 tramos; sábado con 0, 1 o 2; cada tramo con `hasta > desde` (sin cruzar la medianoche); dos
tramos del mismo día sin pisarse. Devuelve el primer error con el día y el tramo, para el mensaje.

**Suma semanal** — `minutosSemanales = 5 × semana + sábado`; aviso si `> 42 × 60` (RF-35).

**Desplegable** — `partirHora('07:10') → { hora: '07', minuto: '10' }`; `unirHora('07', '30') →
'07:30'`, `''` si falta uno; `minutosOfrecidos('07:10') → ['00','10','15','30','45']` (RF-33).

## Decisiones técnicas

- **Horario congelado en el propio parte (columna nula), no un historial de horarios.** Lo decidió
  Diego en la entrevista; técnicamente es además lo que ya se hace con `cantera`: fijar en la
  sentencia del cierre, sin transacción interactiva (Neon). Se descartó guardar el desglose ya
  calculado por persona: congelar el horario basta para reproducir las cifras y no duplica datos
  que se pueden derivar.
- **`HORARIO_ANTERIOR` para los partes cerrados sin horario, no un `update` de los partes
  viejos.** Se descartó escribir el horario en los partes cerrados durante la migración: sería
  tocar evidencia cerrada (principio 4), aunque fuera con el mismo valor.
- **`obras.horario` not null con default en la columna.** Se descartó una columna nula con el
  propuesto «en el código»: cada lectura tendría que acordarse del `?? HORARIO_PROPUESTO`, y la
  que se olvide calcula con otro horario sin que se note.
- **`obraEditada` escrita a mano.** Se descartó `obraNueva.partial()`: con el default del horario
  dentro, corregir solo el nombre podría reponer el horario propuesto encima del real (la trampa de
  «ausente y vacío no son lo mismo» de `AGENTS.md`).
- **El desglose se calcula en el navegador y en el servidor con la misma función**, como hoy. Se
  descartó mandarlo calculado desde el servidor: el residente tiene que verlo cambiar mientras
  elige las horas, antes de guardar.
- **`SelectorDeHora` con dos `Selector` existentes**, no un control nuevo ni `<input type=time>`.
  Se descartó el `time` del navegador: en Chrome acepta cualquier minuto y se ve distinto en cada
  navegador; el `Selector` ya tiene teclado, buscador y la apariencia de la spec 007. Sin
  dependencias nuevas (principio 8).
- **Mientras falte la hora o los minutos, el valor es `''`**, no `HH:00`. Poner los minutos solos
  sería un valor «de antemano», justo lo que 004/RF-44 quiere evitar.
- **Sin columna «Horario» en la tabla de Obras.** No cabe en `MaxContentWidthPanel` junto a las
  que hay (regla de `AGENTS.md`); se ve y se cambia en la ventana de corrección.

## Impacto en la sincronización

Sin impacto en la sincronización. El horario, el parte y sus observaciones viven solo en el
servidor y en el panel; el pull elige columnas de `obras` a mano y no baja la nueva.

## Contrato de API

- `GET /api/panel/obras` — cada fila con `horario`. Guardia y alcance sin cambios.
- `POST /api/panel/obras` — `horario` opcional (default `HORARIO_PROPUESTO`); 400 con el mensaje de
  `validarHorarioDeObra` si es inválido. Solo gerencia (`requerirPermiso('obras','escribir')`,
  sin cambios) (RF-5).
- `PATCH /api/panel/obras/:id` — `horario` opcional; ausente no toca nada; 400 si es inválido.
- `GET /api/panel/partes?fecha=` — cada parte con `horario` (el efectivo) y sus personas con
  `observaciones` si las tienen.
- `PATCH /api/panel/partes/:id` — `personal[].observaciones` opcional (≤ 1000). El resto, igual.
- `POST /api/panel/partes/:id/cerrar` y `…/anular` — mismos códigos que hoy; el horario se fija
  en la misma sentencia del `update`, sin paso extra que pueda fallar a medias.

## Estrategia de verificación

- **`scripts/verificar-reglas.ts`**:
  - Los casos existentes de `desglosarJornada` con `HORARIO_ANTERIOR` dan las mismas cifras que hoy
    (RF-25).
  - `minutosSemanales(HORARIO_PROPUESTO) = 44,5 h` (8 h × 5 + 4,5 h el sábado) y la obra de ejemplo
    8–12 / 14–18 + sábado 8–12, 44 h (RF-35). *(Corregido en T1: el plan decía 44 h para las dos.)*
  - `tramosDelDia`: martes, sábado con y sin trabajo, domingo, festivo que cae en sábado (RF-11 a
    RF-13).
  - Desglose con la obra de ejemplo (8–12 / 14–18, sábado 8–12):
    - martes 7:00–20:00 → 11 h trabajadas (se descuentan las 2 h de 12 a 14), 8 ordinarias,
      3 extra: 2 diurnas (17–19) y 1 nocturna (19–20), y aviso de más de 2 h (RF-14 a RF-17, RF-36);
    - martes 4:00–15:00 → 9 h trabajadas, 8 ordinarias, 1 extra **diurna** (14–15, la última),
      y 2 h nocturnas ordinarias (4–6) (RF-18, RF-41);
    - misma obra con sábado «no se trabaja», sábado 8:00–12:00 → 4 h, todas extra diurnas (RF-12);
    - domingo 7:00–17:00 → 8 h trabajadas, 8 ordinarias, 0 extra, con marca dominical (RF-13, RF-19);
    - martes 14:00–18:00 → 4 h, sin descuento de almuerzo (RF-14);
    - horario de un solo tramo 6:00–14:00, persona 6:00–14:00 → 8 h sin descanso (RF-8);
    - martes 20:00–02:00 → 6 h trabajadas; como no pasan de las 8 programadas son **ordinarias**
      (la regla es por cantidad, RF-16), y las 6 son nocturnas ordinarias (RF-18, RF-40).
  - `validarHorarioDeObra`: tramo invertido, tramo igual, dos tramos que se pisan, lunes a viernes
    vacío, sábado vacío válido (RF-6, RF-7).
  - `horarioEfectivo`: guardado, cerrado sin guardar (anterior), abierto (el de la obra) (RF-22,
    RF-24, RF-25).
  - `partirHora`, `unirHora`, `minutosOfrecidos` con 07:10 (RF-30, RF-33).
  - Contratos: `obraEditada.parse({ nombre })` no trae `horario` (la trampa del `partial`).
- **Demo manual** (Chrome): la de la spec, con una **obra de prueba** creada para eso; el cierre y
  el cambio de horario se hacen sobre un parte de esa obra de prueba, no de Consorcio Antioquia.
- **Comprobaciones extra**: migración en `drizzle/servidor/`; reiniciar `npm run web` tras tocar
  rutas; no se lee ningún secreto nuevo ni se añade pantalla al operador.

## Riesgos

- **La migración en producción.** Es aditiva (dos columnas, una con default), no bloquea tablas
  grandes y no toca filas cerradas. Se detecta si falla porque `db:migrar:servidor` sale con
  error; se revierte con dos `drop column`. Se aplica solo con permiso.
- **Cambiar las cifras de partes abiertos.** Con el horario propuesto, los sábados pasan de 8 h
  ordinarias a 4 h (RF-9 + RF-12). Un parte **abierto** de un sábado mostrará extras que ayer no
  mostraba. Es lo acordado; se avisa a Diego al desplegar.
- **Todas las obras actuales saldrán con el aviso de 44,5 h** hasta que gerencia corrija su horario.
  Esperado.
- **`resumen+api.ts` olvidado**: el Inicio seguiría contando extras con la jornada vieja. Está en la
  tabla de archivos y el cambio de firma de `desglosarJornada` lo hace fallar en `typecheck` si se
  olvida.
- **El `Selector` de 24 horas trae buscador** (más de 8 opciones, 007/RF-12). Es útil (se escribe
  «07»), pero hay que verlo dentro de la ventana de viaje, donde la spec 007 ya tuvo un fallo de
  foco del buscador.
