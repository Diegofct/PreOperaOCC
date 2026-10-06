# Plan técnico — Spec 021

> Lee antes `docs/constitucion.md` y el `spec.md` de esta carpeta.
> Aquí va el CÓMO. Si algo de esto cambia el comportamiento acordado, no se resuelve
> en el plan: se vuelve a la spec.

## Lo que ya está y no hay que tocar

- **Secciones de la bitácora como `jsonb` en `partes_de_obra`** (004): maquinaria, personal,
  actividades, clima, laboratorio y notas en una sola fila. Aprobar un reporte es **un solo
  `UPDATE`** de esa fila, que ocurre entero o no ocurre. Es la razón por la que el reporte diario
  cabe sin tablas hijas.
- **Las validaciones de cada sección** que hoy hace `PATCH /api/panel/partes/:id`:
  `validarAvance` (medidores), `validarHorario` (personal), `validarFranjas` (clima),
  `construirEnsayo`/`rechazoDelEnsayo` (control calidad), `construirActividadDelParte`
  (presupuesto). RF-59 exige las mismas: se **extraen** a un módulo compartido, no se copian.
- **Abrir la bitácora del día** con `insert … on conflict do nothing` sobre el índice parcial
  `(obra_id, fecha) where anulado_en is null` (`POST /api/panel/partes`). RF-40 lo reutiliza.
- **Control Cantera** (010): `validarViaje`, `opcionesDeLaObra`, `eleccionesAjenas`,
  `conductorElegible`, `volquetaElegible`, el `check` de la base con PR 0–25 y metros de 25 en
  25, y la sección de solo lectura de la bitácora (010/RF-26 a RF-29). Un viaje creado desde la
  bandeja es una fila más de `cantera_viajes` y aparece solo en la bitácora.
- **Fotos de la bitácora**: tabla `media` con `dueno_tipo = 'bitacora'`, `dueno_id` = parte e
  `item_key` = id de la actividad (o nulo para la del día). `almacen.ts` es el único que sabe de
  R2, y `/api/panel/media/[id]` el único camino de salida.
- **Permisos y módulos por obra** (`permisos.ts`, `requerirPermiso`, `alcance.ts`) y la barra de
  navegación, que ya parte en dos renglones lo que no cabe (`barraCabeEnUnRenglon`).
- **`normalizar`** (`src/shared/rules/texto.ts`) para comparar nombres sin tildes ni mayúsculas.

## Módulos y archivos

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `src/shared/rules/whatsapp.ts` | **Nuevo, puro.** Lectura de la propuesta: `abscisaDeTexto` («K1+170», «ABS K1+ 190», «pr 1 + 140» → `{pr, metros}`), `horaDeTexto` («9am», «3:00 pm» → `HH:MM`), `condicionDeClima`, `reconocerVehiculo` (placa o código, sin espacios ni mayúsculas), `reconocerPersona` (nombre normalizado; ambiguo = no reconocido), `conductorDelViaje` (operador de esa volqueta en el mismo reporte). Validación: `faltasDelReporte` devuelve **todas** las faltas por sección y renglón. Mezcla: `fusionarReporteEnParte` (reemplaza personas y máquinas por id, reemplaza el clima, suma actividades, ensayos y notas, salta lo que ya tenga el mismo id) y `avisoDeReemplazo`. Destino por categoría: `destinoDeCategoria`. | 18, 23, 30–39, 49, 60–95 |
| `src/shared/rules/permisos.ts` | Módulo nuevo `whatsapp` al final de `MODULOS`. Gerencia y residente: `ver`, `listar`, `escribir`, `aprobar`; los demás roles, nada. La fila `cantera` **no cambia** | 14, 15, 84, 85 |
| `src/features/panel/modulos.ts` | Enlace «Reportes de WhatsApp» → `/panel/whatsapp` | 14 |
| `src/db/servidor/esquema.ts` + migración `0018_…` | Tablas `whatsapp_grupos` y `whatsapp_mensajes`; enum `estado_mensaje_whatsapp`; valor `whatsapp` en `dueno_media`; columna `cantera_viajes.mensaje_whatsapp_id` | 1, 4–13, 24–29, 46, 52, 54–58 |
| `src/features/bitacoras/tipos.ts` | `MaquinaDelParte.operadorId?` y `operadorNombre?`; `origen?: OrigenWhatsapp` (mensaje, quién aprobó, cuándo) en máquina, persona, actividad, franja y ensayo | 46, 47, 73–77, 91 |
| `src/features/bitacoras/parte.ts` | `construirMaquina` acepta y congela el operador; el nombre lo pone el servidor, como el código | 73, 74 |
| `src/features/bitacoras/servidor/secciones.ts` | **Nuevo.** Lo que hoy valida y construye cada sección dentro de `partes/[id]+api.ts`, sacado a funciones que reciben lo pedido y devuelven filas o faltas. Lo usan el `PATCH` y la aprobación | 59, 64 |
| `src/app/api/panel/partes/[id]+api.ts` | Llama a `secciones.ts` en vez de validar por su cuenta; acepta `operadorId` por máquina | 59, 73 |
| `src/features/panel/contratos.ts` | `entregaDeWhatsapp` (lo que manda n8n, con `esquema: 2`), `propuestaCorregida`, `aprobacion` (propuesta + `version` + fotos elegidas), `descarte` (motivo), `grupoAsociado`; `maquinaEditada.operadorId` | 1, 26, 29, 50, 51, 54, 55, 73 |
| `src/features/servidor/guardia-integracion.ts` | **Nuevo.** Tercera guardia: `Authorization: Bearer <token>` comparado en tiempo constante (`@/shared/cripto`) contra el hash de `TOKEN_INTEGRACION_WHATSAPP`. No acepta cookie ni token del celular, y las otras dos no aceptan este | 2, 3 |
| `src/app/api/integraciones/whatsapp/mensajes+api.ts` | **Nueva.** `POST`: guarda o reemplaza un mensaje con su propuesta en **una** sentencia | 1–6, 11, 12 |
| `src/app/api/integraciones/whatsapp/mensajes/[id]/archivo+api.ts` | **Nueva.** `PUT`: los bytes de la foto o el documento del mensaje → `almacen.guardar` + fila en `media` | 7, 52 |
| `src/features/whatsapp/servidor/*.ts` | **Nuevo.** Lectura de la bandeja al alcance (`filtroDeObra` sobre la obra del grupo), resolución de la propuesta contra los catálogos de la obra, y la aprobación por pasos idempotentes | 14–25, 30–48, 60–95 |
| `src/app/api/panel/whatsapp/grupos+api.ts`, `grupos/[id]+api.ts` | **Nuevas.** Gerencia: listar grupos (los que no tienen obra primero), asociar o cambiar la obra | 8–13 |
| `src/app/api/panel/whatsapp/propuestas+api.ts` | **Nueva.** `GET` con filtro de estado (pendientes por defecto; ignoradas, aprobadas, descartadas) | 14, 16, 23, 24, 90 |
| `src/app/api/panel/whatsapp/propuestas/[id]+api.ts` | **Nueva.** `GET` detalle resuelto (texto, autor, categoría, motivo, complementos, fotos, avisos de reemplazo); `PATCH` corrige | 17–22, 26–29, 89 |
| `src/app/api/panel/whatsapp/propuestas/[id]/aprobar+api.ts` | **Nueva.** Aprueba, completa o solo los viajes | 30–51, 57, 59–98 |
| `src/app/api/panel/whatsapp/propuestas/[id]/descartar+api.ts`, `devolver+api.ts` | **Nuevas.** Descartar con motivo; devolver a pendiente una ignorada | 25, 54–56 |
| `src/app/api/panel/cantera/viajes+api.ts` | Sin cambio de permisos (RF-85). La lectura de viajes trae `mensaje_whatsapp_id` para la marca | 47, 85 |
| `src/app/panel/whatsapp.tsx` | **Nueva**, una línea: reexporta la pantalla | 14 |
| `src/features/panel/whatsapp/pantalla-bandeja.tsx` | **Nuevo.** Lista con filtro de estado, grupos sin obra para gerencia, y el detalle | 10, 14–25, 54 |
| `src/features/panel/whatsapp/propuesta-reporte.tsx` | **Nuevo.** La propuesta por secciones de la bitácora, editable, con lo no reconocido marcado y selectores de equipo, persona, ensayo, actividad, sitio y material; las fotos con su elección; el aviso de reemplazo | 26, 50, 51, 60–95 |
| `src/features/panel/pantalla-partes.tsx` | Operador por máquina (selector y lectura); marca «desde WhatsApp» en cada fila con `origen` | 47, 73, 76 |
| `src/features/panel/pantalla-cantera.tsx` | Marca «desde WhatsApp» en el viaje con `mensaje_whatsapp_id` | 47 |
| `src/features/panel/cliente-api.ts` | `api.whatsapp.{grupos, propuestas, aprobar, descartar, devolver}` | — |
| `scripts/verificar-reglas.ts` | Casos de `whatsapp.ts`, de la tabla de permisos, de los contratos y de la guardia; la tabla de la bandeja entra en la prueba de ancho | todas las de reglas |
| `.env.ejemplo`, `docs/despliegue.md` | `TOKEN_INTEGRACION_WHATSAPP` (el hash, no el token) | 2 |

Fuera de este repo, en `C:\dev\n8n-evolutionapi` (no son tareas de PreOperaOCC, pero sin ellas
no llega nada): el esquema de la IA pasa a la versión 2 (clima, maquinaria con operador,
medidores y observación, personal con horas, viajes por renglón con hora, PR y cantera, ensayos
con hora de inicio y fin, responsable y ubicación), y un workflow nuevo entrega cada mensaje
clasificado a `POST /api/integraciones/whatsapp/mensajes` y sus archivos a `…/archivo`.

## Modelo de datos

- **Local** (`src/db/local/schema.ts`): **sin cambios.** Nada viaja al celular.
- **Servidor** (`src/db/servidor/esquema.ts`):
  - `whatsapp_grupos`: `id` (el JID del grupo, `…@g.us`), `nombre`, `obra_id` (nulo hasta que
    gerencia lo asocie), `asociado_por`, `asociado_en`, `creado_en`, `actualizado_en`.
  - `estado_mensaje_whatsapp` = `pendiente | ignorado | aprobado | descartado`.
  - `whatsapp_mensajes`: `id` (el id del mensaje en WhatsApp: es la llave de idempotencia,
    RF-4), `grupo_id`, `autor_id` (el `lid`), `autor_nombre` (de WhatsApp), `enviado_en`,
    `texto`, `tipo` (texto, imagen, documento, audio, video), `categoria`, `complementa_a`,
    `propuesta_ia` (`jsonb`, tal como llegó), `propuesta` (`jsonb`, la corregida; nula
    mientras nadie corrija), `estado`, `version` (entero, sube en cada corrección o decisión),
    `viajes_aprobados_en`, `aprobado_por`, `aprobado_en`, `descartado_por`, `descartado_en`,
    `motivo_descarte`, `parte_id` (la bitácora a la que fue), `recibido_en`, `actualizado_en`.
    Índices: `(grupo_id, estado, enviado_en)` y `(complementa_a)`. `check`: descartado ⇒ motivo
    no vacío (RF-55).
  - `media.dueno_tipo` gana `whatsapp` (`dueno_id` = id del mensaje).
  - `cantera_viajes.mensaje_whatsapp_id` (nulo; referencia a `whatsapp_mensajes`) — RF-46/47.
  - La obra del mensaje **no se guarda en el mensaje**: sale de su grupo. Así, cambiar la obra
    del grupo mueve solo los pendientes (RF-13) sin reescribir nada; los aprobados ya tienen su
    `parte_id`.
    > **Corregido en T13 (2026-10-05).** Con la obra saliendo siempre del grupo, lo aprobado y
    > lo descartado también se mudaban al historial de la obra nueva, contra RF-13. Se añadió
    > `whatsapp_mensajes.obra_decidida_id` (migración `0019`), que escriben la aprobación y el
    > descarte en la misma sentencia de la decisión. La obra de un mensaje es
    > `coalesce(obra_decidida_id, grupo.obra_id)`, dicha una sola vez en
    > `features/whatsapp/servidor/obra.ts` y usada por la bandeja y por `/api/panel/media/[id]`.
  - El operador de la máquina y el `origen` de cada fila van **dentro del `jsonb`** de la
    sección, como `observaciones` en 2026-09-14: opcionales en el tipo, ausentes en lo
    anterior (RF-77). Sin columna nueva en `partes_de_obra`.
- **Migraciones**: `npm run db:generate:servidor` → `drizzle/servidor/0018_….sql`.
  Producción con `scripts/migrar-produccion.ts` **antes** de levantar la imagen.
- **Compatibilidad**: los teléfonos no se enteran. Los partes viejos se leen igual: sin
  operador y sin origen. `ALTER TYPE … ADD VALUE` para `dueno_media` va en su propia migración
  si drizzle lo junta con otra sentencia que use el valor (Postgres no deja usarlo en la misma
  transacción).

## Algoritmo / reglas

**Recepción** (`POST /api/integraciones/whatsapp/mensajes`):

1. Guardia de integración (RF-2, RF-3). Valida `entregaDeWhatsapp` con zod; un esquema que no
   sea el 2 → 422.
2. `insert into whatsapp_grupos … on conflict do nothing` (el grupo aparece pendiente de obra,
   RF-10).
3. Una sola sentencia para el mensaje: `insert … on conflict (id) do update set propuesta_ia =
   excluded.propuesta_ia, categoria = …, estado = (ignorado|pendiente según categoría) where
   whatsapp_mensajes.estado in ('pendiente','ignorado') and whatsapp_mensajes.propuesta is
   null`. Lo aprobado o descartado no se toca (RF-5, RF-6), y una propuesta que el residente ya
   corrigió tampoco: perder su corrección por una entrega nueva sería peor que no mejorarla.
   Las categorías `ignorar` y `seguimiento` entran como `ignorado` (RF-23, RF-90).

**Lectura de la bandeja**: mensajes cuyo grupo tiene obra al alcance (`filtroDeObra` sobre
`whatsapp_grupos.obra_id`); sin obra no se muestran (RF-11). Los que tienen `complementa_a` se
cuelgan del mensaje al que complementan (RF-20). El detalle **resuelve** la propuesta contra los
catálogos vigentes de la obra con las funciones de `whatsapp.ts`: cada equipo, persona,
operador, ensayo, ítem, sitio y material queda reconocido (con su id) o marcado para elegir
(RF-33, RF-36, RF-67, RF-71, RF-75, RF-79, RF-83, RF-86, RF-95). Se resuelve al leer y no al
recibir porque los catálogos cambian: una persona registrada mañana debe reconocerse en un
mensaje de ayer.

**Corrección** (`PATCH …/propuestas/:id`): guarda `propuesta` con `where estado = 'pendiente'
and version = :version`, y sube `version`. Cero filas → 409 «la propuesta ya cambió» (RF-29).
`propuesta_ia` no se toca nunca (RF-27).

**Aprobación** (`POST …/aprobar`) — sin transacciones, por pasos que **resisten el reintento**:

1. Guardia de panel con `whatsapp:aprobar`; la obra del grupo al alcance.
2. Lee mensaje + grupo + bitácora del día del hecho + catálogos de la obra. Día del hecho =
   fecha del encabezado (RF-61); sin ella, la del mensaje, y la propuesta lo señala (RF-62).
   Posterior a hoy → 400 (RF-44).
3. `faltasDelReporte(propuesta, catálogos)` y las validaciones de `secciones.ts`. Cualquier
   falta → 400 con **todas** las faltas por sección y renglón, y no se escribe nada (RF-64).
4. Bitácora: si no existe, se abre (RF-40, la misma sentencia de `POST /api/panel/partes`). Si
   está cerrada y el reporte trae algo para ella → 409 con la explicación de anular y abrir
   otra (RF-41, RF-42) y la opción de aprobar solo los viajes (RF-43; ver la pregunta del
   final).
5. `fusionarReporteEnParte(parteLeído, reporte)` → secciones nuevas. **Las filas creadas
   llevan ids deterministas** (`uuid v5` del id del mensaje + sección + renglón): si el paso 6
   ya ocurrió y el 8 no, el reintento encuentra esas filas y no las duplica.
6. **Un solo `UPDATE partes_de_obra`** con las secciones fusionadas, `where id = :parte and
   cerrado_en is null and actualizado_en = :leido`. Cero filas → 409: alguien guardó la
   bitácora mientras tanto; se vuelve a leer y se repite desde el paso 5 (una vez).
7. Viajes (RF-39, RF-82 a RF-87, RF-94, RF-95): **un solo `insert` de varias filas** en
   `cantera_viajes` con ids deterministas y `on conflict (id) do nothing`, `registrado_por` =
   quien aprueba, `conductor_id` = operador de esa volqueta en el reporte o el elegido,
   `mensaje_whatsapp_id`. Con Control Cantera apagado en la obra → 400 antes del paso 4
   (RF-45). No pasa por `requerirPermiso('cantera','escribir')`: el permiso es el de la
   bandeja, y la ruta del módulo sigue cerrada al residente (RF-84, RF-85).
8. Fotos elegidas (RF-50, RF-51): una fila nueva en `media` por foto, **con la misma
   `clave_r2`** del archivo de WhatsApp, `dueno_tipo = 'bitacora'`, `dueno_id` = parte,
   `item_key` = id de la actividad o nulo para la del día. La del día solo si la bitácora no
   tiene una. Id determinista también.
9. `update whatsapp_mensajes set estado = 'aprobado', parte_id, aprobado_por, aprobado_en,
   version + 1 where id = :id and estado = 'pendiente' and version = :version`. Cero filas en
   un reintento cuyo paso 6 ya se había hecho → se responde lo que ya está (idempotente).

**Mezcla** (`fusionarReporteEnParte`, pura):

- Máquina del reporte cuyo `vehiculoId` ya está → se reemplaza la fila; si no, se añade
  (RF-68, RF-88). Igual con la persona por `usuarioId` (RF-78, RF-88).
- Clima del reporte → reemplaza todas las franjas (RF-92). Sin clima en el reporte → se deja.
- Actividades, ensayos y notas → se suman (RF-93); las notas se añaden como párrafo con el
  autor y la hora del mensaje.
- `avisoDeReemplazo(parte, reporte)` lista las personas, máquinas y franjas que se van a
  reemplazar, para mostrarlo antes de aprobar (RF-89).

## Decisiones técnicas

- **Tercera guardia, `guardia-integracion.ts`, con un token fijo en el entorno** → se
  descartó reutilizar el token del celular (mezclaría superficies, constitución 6) y una cuenta
  de usuario para n8n con cookie (una sesión que caduca y un usuario «robot» en la lista de
  personas). Se guarda el **hash** del token: el `.env` filtrado no da el token.
- **El mensaje de WhatsApp es la unidad de la bandeja, con su propuesta en `jsonb`** → se
  descartó una tabla por tipo de propuesta (actividades, viajes…): la propuesta es un documento
  que se corrige entero y se aprueba entero; partirla obligaría a varias escrituras sin
  transacción.
- **Aprobar escribe la bitácora en un solo `UPDATE` y lo demás con ids deterministas** → se
  descartó un estado intermedio «aprobando» que bloqueara el mensaje: si el proceso cae entre
  pasos, el mensaje quedaría atascado y alguien tendría que desbloquearlo a mano. Con ids
  deterministas, reintentar es seguro y no hace falta nada más.
- **Las fotos aprobadas reutilizan el objeto de R2 con otra fila de `media`** → se descartó
  copiar los bytes a una clave nueva: el mismo archivo dos veces en el bucket, el doble de
  subida, y nada que ganar; el objeto nunca se borra (constitución 4).
- **La propuesta se resuelve contra los catálogos al leer, no al recibir** → se descartó
  guardar ids resueltos en la recepción: el residente registra a una persona después de que
  llegó el reporte y debe reconocerse sin reenviar nada.
- **Las funciones de lectura de texto viven en `src/shared/rules/whatsapp.ts`** aunque solo las
  use el servidor → se descartó dejarlas en `features/whatsapp/servidor`: son reglas puras y
  necesitan sus casos en `verificar-reglas.ts` (constitución 3 y 5). La IA ya normaliza, pero
  el servidor no confía en ella: vuelve a leer «K1+170» o «9am» con su propia regla.
- **Los archivos llegan aparte, como bytes, a `…/archivo`** → se descartó mandarlos en base64
  dentro del JSON: un reporte con 25 fotos son decenas de MB en una petición, y si falla se
  pierde todo. Es el mismo criterio de `partes/[id]/foto`.
- **El operador se guarda dentro de la máquina en el `jsonb`** → se descartó una columna o una
  tabla aparte: la máquina del parte ya congela su código y su medidor ahí, y la consulta por
  operador que pida la spec de reportes se hace sobre el `jsonb` (`jsonb_array_elements`) o
  con un índice de expresión cuando haga falta.
- **Menú: un enlace más en la barra actual** → se descartó adelantar el menú lateral: es su
  propia spec (fuera de alcance de la 021), y la barra ya pasa a dos renglones cuando no cabe.

## Impacto en la sincronización

Sin impacto en la sincronización. Ni el pull ni el outbox cambian; nada de esto llega al
celular. La única entrada nueva es la de la integración, que no es del móvil y tiene su
propia guardia.

## Contrato de API

**Integración** (guardia `Bearer`, sin cookie):

- `POST /api/integraciones/whatsapp/mensajes` — cuerpo `entregaDeWhatsapp`: `{ esquema: 2,
  grupo: { id, nombre }, mensaje: { id, autorId, autorNombre, enviadoEn, tipo, texto,
  tieneArchivo }, propuesta: {…esquema v2 de la IA…} }`. `200 { estado: 'nuevo' |
  'reemplazado' | 'conservado' }`. `401` sin token o inválido; `422` cuerpo inválido.
- `PUT /api/integraciones/whatsapp/mensajes/:id/archivo` — cuerpo: los bytes; `content-type`
  imagen, PDF, Word o Excel; máximo 16 MB. `201` guardado, `200` si ya estaba (misma
  `sha256`), `404` mensaje desconocido, `413` demasiado grande, `415` tipo no admitido.

**Panel** (todas abren con `requerirPermiso(peticion, 'whatsapp', …)`; el filtro de obra sale
de `alcance.ts` sobre la obra del grupo):

- `GET /api/panel/whatsapp/grupos` (gerencia) · `PATCH /api/panel/whatsapp/grupos/:id`
  `{ obraId }` (gerencia; mueve solo los pendientes por construcción).
- `GET /api/panel/whatsapp/propuestas?estado=pendiente|ignorado|aprobado|descartado&obraId=`.
- `GET /api/panel/whatsapp/propuestas/:id` — detalle resuelto.
- `PATCH /api/panel/whatsapp/propuestas/:id` `{ version, propuesta }` → `200` | `409`.
- `POST …/:id/aprobar` `{ version, propuesta, fotos: { delDia?, porActividad } , soloViajes? }`
  → `200 { parteId, viajes }` | `400 { faltas: [{ seccion, renglon, mensaje }] }` | `409`
  (cerrada, o cambió).
- `POST …/:id/descartar` `{ version, motivo }` · `POST …/:id/devolver` `{ version }`.

## Estrategia de verificación

- **`scripts/verificar-reglas.ts`**:
  - `abscisaDeTexto`: «K1+170», «ABS K1+ 190», «pr 1 + 140», «K0+800», basura → nulo (RF-65).
  - `horaDeTexto`: «9am», «9:00 am», «3:00 pm», «15:00», «12 m» (RF-66, RF-81, RF-82).
  - `condicionDeClima`: «soleado», «se presentó lluvias» → lloviendo; desconocida → nula (RF-67).
  - `reconocerVehiculo`: «LLQ 375» contra `LLQ375`, por código interno, de otra obra → nulo,
    dos candidatos → nulo (RF-70, RF-71).
  - `reconocerPersona`: con y sin tildes, nombre parcial ambiguo → nulo (RF-75, RF-79).
  - `conductorDelViaje`: volqueta con operador en el reporte; sin operador → falta (RF-94, RF-95).
  - `faltasDelReporte`: ítem fuera del presupuesto, ensayo fuera de la lista, metros no múltiplo
    de 25, viaje sin hora, persona no reconocida — todas a la vez, por renglón (RF-33, RF-36,
    RF-64, RF-83, RF-86).
  - `fusionarReporteEnParte`: reemplazo de persona y máquina, reemplazo del clima, suma de
    actividades, reintento con los mismos ids sin duplicar (RF-88, RF-92, RF-93).
  - `destinoDeCategoria` y estado inicial: `seguimiento` e `ignorar` → ignorado (RF-23, RF-90).
  - Permisos: `whatsapp` para gerencia y residente; nada para los demás; `cantera:escribir`
    sigue negado al residente (RF-15, RF-85).
  - Guardia de integración: token correcto, incorrecto, ausente, y que la cookie del panel no
    sirve (RF-2, RF-3).
  - Contratos: `entregaDeWhatsapp` rechaza el esquema 1; `descarte` sin motivo (RF-55).
  - Ancho de la tabla de la bandeja dentro de `MaxContentWidthPanel`.
- **Demo manual**: los pasos 1 a 9 de los criterios de finalización de la spec, con el reporte
  de la plantilla (`C:\dev\n8n-evolutionapi\plantilla_reporte_whatsapp.md`) entregado con
  `curl` al endpoint de integración, y después con n8n real.
- **Comprobaciones extra**: `npx expo export --platform web && grep -r
  "TOKEN_INTEGRACION_WHATSAPP\|DATABASE_URL" dist/client` vacío; pedir la integración con la
  cookie del panel → 401; pedir `/api/panel/whatsapp/propuestas` como almacenista → 403.

## Riesgos

- **La IA lee mal un número** (medidor, hora). Lo frena la aprobación humana y las mismas
  validaciones del panel; un medidor mal aprobado se corrige en la bitácora mientras siga
  abierta (RF-48). Se detecta en la demo con el reporte de ejemplo.
- **Corte entre pasos de la aprobación.** Ids deterministas y sentencias condicionadas: el
  reintento termina el trabajo sin duplicar. Se prueba en `verificar-reglas.ts` con la mezcla
  aplicada dos veces.
- **Token de integración filtrado.** Alguien podría llenar la bandeja de basura, nunca la
  bitácora (todo pasa por aprobación). Se rota cambiando el hash en el `.env` y el token en n8n.
- **Cambiar la obra de un grupo con propuestas a medio corregir**: se mueven con su
  corrección, que es lo que dice RF-13.
- **El valor nuevo de `dueno_media`**: si la migración falla en producción, la imagen nueva no
  se levanta (se migra antes) y la anterior sigue sirviendo.
- **Reversión**: las tablas nuevas no las lee nada viejo; quitar el enlace del menú y la fila
  de permisos apaga el módulo sin tocar datos.

## La cantidad escrita gana al cálculo (RF-99 a RF-103, cambio aprobado el 2026-10-05)

- `src/shared/rules/dimensiones.ts` — `resolverCantidad`: si hay cantidad escrita, esa; si no,
  la medida que corresponde a la unidad. Devuelve además la **calculada** aunque no se use, para
  mostrarla al lado (RF-101). Lo usan el servidor (`construirActividadDelParte`) y la pantalla,
  así que los dos cambian a la vez.
- `src/features/panel/pantalla-partes.tsx` — el campo de cantidad deja de ser de solo lectura y
  muestra «calculada: N unidad» al lado. Al abrir una actividad guardada antes del cambio, si su
  cantidad coincide con la calculada se pinta vacía (sigue siendo calculada); solo queda fija si
  alguien escribe otra.
- La aprobación de WhatsApp ya manda la cantidad del ítem (`resolverPropuesta`), así que RF-102
  sale solo con el cambio de la regla.
- Bitácoras cerradas o anuladas: nada las recalcula; sus filas se leen tal cual (RF-103).
- **Decisión:** cambiar la regla en su sitio, no añadir una variante «de WhatsApp» → se descartó
  porque una actividad aprobada se edita luego en el formulario, y con dos reglas se recalcularía
  sola al guardarla (lo eligió OCC).

## Aprobar solo los viajes (RF-96 a RF-98, resuelto el 2026-10-05)

Con la bitácora cerrada, `aprobar` con `soloViajes: true` hace solo el paso 7 y escribe
`viajes_aprobados_en`; el mensaje sigue `pendiente`. Una aprobación completa posterior omite el
paso 7 si `viajes_aprobados_en` no es nulo (y aunque no lo omitiera, los ids deterministas no
duplicarían nada). La bandeja muestra «Viajes ya registrados» en esa propuesta.
