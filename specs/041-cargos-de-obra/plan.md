# Plan técnico — Spec 041, cargos de obra

> Lee antes `docs/constitucion.md` y el `spec.md` de esta carpeta.
> Aquí va el CÓMO. Si algo de esto cambia el comportamiento acordado, no se resuelve
> en el plan: se vuelve a la spec.

## Idea central

Tres piezas, en este orden de dependencia:

1. **Los tres accesos en la tabla de permisos.** `supervisor` se renombra a `residente`, y se añaden `director_obra` y `director_proyectos`. La tabla `TABLA` de `permisos.ts` decide qué puede cada uno (RF-57). Casi toda la spec es contenido de esa tabla, no código nuevo.
2. **«Las obras de una persona» deja de ser una columna.** `PersonaEnSesion` gana `obras: string[]`, que son las asignadas, mientras `obraId` pasa a significar **la obra en uso**:
   - Para el Residente y los demás cargos de una sola obra es su obra, como hoy.
   - Para el Director de Obra es la obra que escogió entre las suyas, y llega en cada petición.

   Así los ~50 sitios que leen `sesion.obraId` siguen siendo correctos sin tocarlos, que es la decisión que más riesgo ahorra (ver Decisiones).
3. **Paso de las personas existentes:** una migración escrita a mano, idempotente.

## Módulos y archivos

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `src/shared/rules/permisos.ts` | `ROLES`: `supervisor` → `residente`, más `director_obra` y `director_proyectos`. **`TABLA`**: se añade la fila de cada rol en todos los módulos (detalle abajo). `PUEDE_DAR`, `ETIQUETA_ROL`, `QUIEN_ES`, `MODULO_DEL_ROL`. `rolVeTodasLasObras` suma `director_proyectos`. Nueva `rolDeVariasObras(rol)` (solo `director_obra`). `modulosVisibles`: `deUnaObra` pasa a `!rolVeTodasLasObras(rol)`. Nuevo `motivoParaNoAprobar(rol)` con el texto de RF-34 y RF-35 | RF-1, RF-2, RF-6–RF-12, RF-14, RF-15, RF-21, RF-26, RF-27, RF-33–RF-41, RF-58–RF-64, RF-68, RF-72 |
| `src/shared/rules/empresas.ts` | `EMPRESAS_DEL_ROL` y `EMPRESA_DEL_ROL` (los tres → `proyectos`). `ACCESOS_SIN_OBRA` / `reparoDelAccesoSinObra` suman `director_proyectos`. `destinoAlEntrar`: los tres casos (`director_obra` con una obra va directo a ella y con varias a la lista). `alcanzaLaObraDeLaRuta` usa `obras.includes` en vez de `obraId ===`. Nueva `reparoDeObrasDelAcceso(rol, obras)`, regla pura: el Director de Obra necesita 1 o más obras, el Residente exactamente 1, el Director de Proyectos 0 | RF-5, RF-16, RF-18, RF-24, RF-25, RF-32 |
| `src/shared/rules/asistente.ts` | `DE_EMPRESA_DEL_ROL` para los tres roles; `ROLES_DEL_ASISTENTE`; `obras: quien.obras` en vez de `[quien.obraId]`; la rama de la L176 (`'supervisor'`) vale para los tres | RF-53–RF-55 |
| `src/shared/catalogos/cargos.ts` | Cargo nuevo `director_proyectos` («Director de Proyectos», rol sugerido `director_proyectos`). El cargo con id `director` pasa a llamarse **«Director de Obra»** y a sugerir `director_obra`; el id no cambia. `residente_1` y `residente_2` sugieren `residente` | RF-3, RF-4, RF-66 |
| `src/shared/rules/cargos-de-obra.ts` (nuevo) | Reglas puras de la spec: `accesoTrasLaMigracion(rol, cargo)` (RF-46–RF-48), `obrasAlCambiarDeAcceso(antes, despues, obraEscogida)` (RF-70, RF-71), `puedeAsignarObras(quien, aQuien)` (RF-13, RF-28), `obraEnUso(pedida, obras)` (RF-22, RF-23) | RF-13, RF-22, RF-23, RF-28, RF-46–RF-48, RF-70, RF-71 |
| `src/features/auth/servidor/sesion.ts` | `PersonaEnSesion` gana `obras: string[]` (de `usuarios_obras` vigentes o de `usuarios.obra_id`) y `cargo`. `obraId`, `obraNombre` y `modulosDeObra` salen de la **obra en uso**, resuelta con `obraEnUso()` desde la cabecera `x-obra-en-uso` o, si no viene, el parámetro `?obraId=`. Se lee en cada petición: un cambio de obras o de acceso vale desde la siguiente (RF-29, RF-56) | RF-19, RF-22, RF-23, RF-29, RF-56, RF-67 |
| `src/features/servidor/alcance.ts` | `filtroDeObra` y `filtroDeObraEstricto` siguen filtrando por `obraId` (obra en uso). `alcanzaLaObra` y `alcanzaLaImagen` pasan a `obras.includes(obraId)` (una fila concreta de cualquiera de sus obras). Nueva `obraParaEscribir(persona, pedida)`: la obra en uso, o la pedida si está entre las suyas. `alcanzaLaImagen` deja de leer `rol === 'admin'` y usa `veTodasLasObras` | RF-19, RF-20, RF-23 |
| `src/features/servidor/guardia.ts` | `requerirPermiso` responde 403 con `motivoParaNoAprobar` cuando la acción es `aprobar` o `anular` y el rol es `residente` | RF-34, RF-35, RF-56 |
| `src/features/panel/cliente-api.ts` | La función `panel()` añade `x-obra-en-uso` con la obra de la ruta actual (`/panel/proyectos/[obra]/…`) | RF-22, RF-23, RF-67 |
| `src/features/empresas/pantalla-proyectos.tsx`, `marco.tsx` | La lista de obras se muestra a quien tiene `veTodasLasObras` **o** más de una obra (hoy la condición es `rol === 'admin'`). La cabecera del menú de obra lleva un selector «Obra en uso» con las obras de la persona. Aviso «Sin Director de Obra» en la tarjeta (RF-44) | RF-22, RF-24, RF-44, RF-67 |
| `src/app/api/panel/obras+api.ts` | GET: escritura abierta a `director_proyectos` (por la tabla), y en cada obra `directoresDeObra: number` (vigentes) para el aviso | RF-7, RF-8, RF-44 |
| `src/app/api/panel/personas+api.ts`, `personas/[id]+api.ts`, `personas/[id]/activacion+api.ts`, `personas/[id]/obras+api.ts` (nuevo) | Altas y ediciones validan con `reparoDeObrasDelAcceso`, `motivoParaNoDarRol` y `puedeAsignarObras`. `personaAlcanzable` usa `alcanzaLaObra` sobre **todas** las obras de la persona tocada, y deja de usar `rol === 'admin'`. La ruta nueva `obras` asigna y retira obras de un Director de Obra | RF-12–RF-14, RF-17, RF-18, RF-26–RF-28, RF-31, RF-32, RF-38, RF-39, RF-69–RF-72 |
| `src/features/panel/pantalla-personas.tsx`, `contratos.ts` | Selector de **varias** obras para el Director de Obra; una obligatoria para el Residente; ninguna para el Director de Proyectos. Al bajar un Director de Obra a Residente, pide escoger cuál de sus obras conserva. Filtro y aviso «Pasaron a Residente: revisar». `personaNueva` y `personaEditada` ganan `obras?: string[]` | RF-17, RF-18, RF-32, RF-51, RF-65, RF-70 |
| Pantallas con botones de aprobar o anular (laboratorio, partes, almacén, cantera, preoperacionales, contrato) | Ya los muestran según `alcanza(rol, modulo, 'aprobar' \| 'anular')`. Hay que revisarlas una por una, buscando `'supervisor'` y `rol === 'admin'`, para que ninguna decida por su cuenta | RF-36 |
| Vistas de historia («Aprobado por», «Anulado por») | El nombre va acompañado del acceso que tenía en esa fecha, con `accesoEnFecha` (ver Datos) | RF-42, RF-52 |
| `src/features/asistente/servidor/herramientas.ts`, `conversacion.ts`, `rules/asistente.ts` | **Cambio del 2026-11-08:** el alcance del Director de Obra es solo su obra en uso (`[obraId]`), y el texto del contexto lo dice. Con varias obras y ninguna en uso, se le pide abrir una | RF-53, RF-55, RF-73, RF-74 |
| `api/panel/personas/[id]/clave`, `pantalla-personas.tsx`, `vista-de-la-ficha.tsx`, tabla nueva `claves_generadas` | **Cambio del 2026-11-08:** generar la contraseña temporal pasa de `requerirAdmin` a `personas · activar` más `puedeGenerarClave` y el alcance por obra. En el mismo lote que la credencial se escribe quién la generó | RF-75, RF-76, RF-78 |
| `api/panel/obras/[id]` (`DELETE`), `pantalla-obras.tsx` | **Cambio del 2026-11-08:** la baja se separa de `obras · escribir` con `motivoParaNoDarDeBajaObra`. Solo la Gerencia | RF-77 |
| `src/features/whatsapp/servidor/estado-dias.ts`, `creados.ts`, `vehiculos+api.ts`, y los ~50 lectores de `obraId` | Revisión uno por uno. La mayoría no cambia (obra en uso). Cambian los que significan «todas mis obras», que pasan a `obras`, y los `rol === 'admin'` que significan «ve todas las obras», que pasan a `veTodasLasObras`. Los que significan «es gerencia» se quedan | RF-19, RF-20 |
| `scripts/verificar-reglas.ts` | Casos «041/» (ver Verificación) | — |

### La tabla de permisos (resumen de `TABLA`)

- **`residente`** = lo de hoy de `supervisor`, menos `aprobar` y `anular`:
  - En **laboratorio**, se queda con `ver` y `listar`.
  - En **bitácoras**, pierde `anular`; cerrar el parte es `escribir` y lo conserva (RF-61).
  - En **whatsapp** conserva `aprobar` (RF-37).
  - En **personas** gana `escribir`, acotado por `PUEDE_DAR: ['operador']` (RF-38).
- **`director_obra`** = lo de hoy de `supervisor`, más:
  - `anular` en **preoperacionales**, **almacén** y **cantera** (RF-60);
  - `escribir` y `activar` en **personas**, acotados por `PUEDE_DAR: ['residente','operador','almacenista','encargado_planta','laboratorista']` y por sus obras (RF-26, RF-72).

  **Contrato** sigue sin `aprobar` (RF-58).
- **`director_proyectos`** = la fila de `admin` en los **módulos de obra** (obras, personas, vehículos, asignaciones, bitácoras, preoperacionales, almacén, cantera, laboratorio, whatsapp, reportes, contrato, asistente). En los de empresa, lo de hoy de `supervisor`: `rrhh`, `documentos` y `solicitudes` como hoy (RF-59), y `NADA` en empresa, finanzas, compras, tesorería, licitaciones y bitácora de empresa (RF-15, RF-68).

  `PUEDE_DAR`: `director_obra`, `residente`, `operador`, `almacenista`, `encargado_planta` y `laboratorista` (RF-12). Nunca `director_proyectos` ni `admin` (RF-14).
- **Encargado de OCC, Encargado de Planta y Auxiliar Administrativa**: sus filas no se tocan (RF-62–RF-64).

## Modelo de datos

- **Local** (`src/db/local/schema.ts`): **sin cambios.** El celular no guarda el rol de quien usa el panel.
- **Servidor** (`src/db/servidor/esquema.ts`):
  - **Enum `rol_usuario`:** `RENAME VALUE 'supervisor' TO 'residente'` y `ADD VALUE 'director_obra'`, `'director_proyectos'`. El enum sale de `ROLES`, así que el esquema solo cambia por la lista.
  - **Tabla nueva `usuarios_obras`:** `id`, `usuario_id → usuarios`, `obra_id → obras`, `desde timestamptz not null default now()`, `hasta timestamptz null`, `asignado_por → usuarios`, `retirado_por → usuarios null`.
    - Índice único parcial `(usuario_id, obra_id) where hasta is null`: no se asigna dos veces la misma obra a la vez.
    - Índice `(obra_id) where hasta is null`, para contar los Directores de Obra vigentes (RF-44).
    - Retirar escribe `hasta`, nunca `DELETE` (principio 4, RF-31).
  - **Tabla nueva `usuarios_accesos`:** `id`, `usuario_id`, `rol text`, `cargo text null`, `desde`, `hasta null`, `cambiado_por null`, `revisar boolean default false`.
    - Es la historia del acceso de cada persona. Permite `accesoEnFecha(usuarioId, fecha)` para RF-42 y RF-52 sin añadir una columna de cargo a las ~17 tablas que guardan `aprobado_por` o `anulado_por`.
    - `rol` es `text`, no el enum: guarda «supervisor» para lo de antes, que en el enum ya no existe.
    - `revisar = true` marca a quien entró por RF-48. El aviso de RF-51 dura hasta que la Gerencia o el Director de Proyectos editan o confirman a esa persona, y ahí se apaga.
  - **`usuarios.obra_id` se conserva:** es la obra del Residente, del almacenista, del encargado de planta y del laboratorista.
    - Para el Director de Obra, la fuente de verdad son sus filas vigentes de `usuarios_obras`, y `obra_id` queda en `null`.
    - Sus obras se leen siempre de `usuarios_obras`; ningún lector mezcla las dos fuentes.
- **Migraciones:**
  - `npm run db:generate:servidor` genera las dos tablas. El enum se escribe **a mano** en el mismo archivo `0040_*.sql`, como la 0039: drizzle-kit ante un rename propone borrar y recrear el tipo.
  - El archivo hace, en orden:
    1. El rename y los `ADD VALUE IF NOT EXISTS`.
    2. Las tablas.
    3. El paso de las personas:
       - `UPDATE usuarios SET rol='director_obra' WHERE rol='residente' AND cargo='director'`.
       - `INSERT INTO usuarios_obras` desde su `obra_id`, y luego `obra_id = null` para ellos.
       - Las filas iniciales de `usuarios_accesos`, con `revisar` para RF-48: rol `residente` cuyo cargo no es `residente_1` ni `residente_2`.
  - Al volver a generar debe salir «No schema changes».
- **Compatibilidad:** los teléfonos no se enteran. El token del celular es del operador, cuyo acceso no cambia, y el snapshot del pull no lleva roles del panel.

## Algoritmo / reglas

**Obra en uso** (RF-22, RF-23, RF-67), en `sesion.ts` en cada petición:

1. `obras` = las filas vigentes de `usuarios_obras` si es `director_obra`; `[obra_id]` si tiene obra; `[]` si no.
2. `pedida` = la cabecera `x-obra-en-uso` o, si no viene, `?obraId=`.
3. `obraEnUso(pedida, obras)`:
   - si `pedida` está en `obras`, `pedida`;
   - si no y `obras.length === 1`, la única;
   - si no, `null`.

   Con `null` y varias obras, el panel lo manda a la lista (RF-24), y toda consulta filtrada da vacío. Es lo mismo que hoy con un supervisor sin obra: nunca «ve todo».
4. Una `pedida` que **no** está en `obras` no da error: se ignora, y el filtro queda en su obra o en ninguna. Así se cumple RF-20 («como si no existiera»), igual que hoy `filtroDeObraPedida`.

**Paso de las personas** (RF-46–RF-52, RF-65), con la regla pura `accesoTrasLaMigracion(rol, cargo)`, que la migración imita en SQL y que `verificar-reglas` prueba:

- `('supervisor', 'director')` → `director_obra`, y su obra pasa a `usuarios_obras`.
- `('supervisor', 'residente_1' | 'residente_2')` → `residente`.
- `('supervisor', otro o null)` → `residente` con `revisar` (RF-48, RF-51).
- Quien queda sin obra (`obra_id null`) no alcanza nada (RF-65), sin código nuevo: `obras=[]` → `obraEnUso=null` → filtro `false`, y entra a la lista del RF-51.

**Cambio de acceso** (RF-70, RF-71), con la regla `obrasAlCambiarDeAcceso`:

- De `director_obra` a `residente` exige `obraEscogida ∈ obras`. Las demás filas de `usuarios_obras` se cierran con `hasta`, y `obra_id = obraEscogida`.
- De `residente` a `director_obra`: `obra_id` pasa a una fila de `usuarios_obras`.
- Se hace en **una sola sentencia** (CTE con `UPDATE … RETURNING` + `INSERT`): Neon por HTTP no tiene transacciones interactivas.

## Decisiones técnicas

- **`obraId` = obra en uso, que llega en cada petición, y `obras` = las asignadas.** Se descartó cambiar `obraId` por una lista en los ~50 sitios que lo leen: obligaría a reescribir pantallas pensadas para una obra (el parte del día, el resumen, el almacén), y cada sitio olvidado sería una fuga entre obras que no se nota en desarrollo. Con este diseño, lo que no se toca sigue bien por construcción.
- **La obra en uso viaja en una cabecera, sacada de la URL de la pestaña.** Se descartó guardarla en la fila de `sesiones_web`: con dos pestañas en obras distintas, cambiar en una movería la otra, y un parte se guardaría en la obra equivocada. La cabecera es por pestaña y sin estado. Para los enlaces directos, como descargas e imágenes, que no llevan cabecera, vale `?obraId=` y la comprobación de fila concreta usa todas las obras.
- **Filtros de lista por obra en uso; comprobación de una fila por todas las obras.** Se descartó listar todas las obras a la vez para el Director de Obra: mezclaría los partes de dos obras en la pantalla de una. RF-19 se cumple porque ve cada una de sus obras, no todas mezcladas.
- **Renombrar `supervisor` a `residente`, no crear `residente` aparte.** Se descartó dejar `supervisor` como nombre interno del Residente: el día que alguien lea `supervisor` en el código pensará en el acceso viejo, que podía aprobar. `RENAME VALUE` conserva cada fila, sesión y contraseña (RF-50), como en la 0039.
- **Historia de accesos (`usuarios_accesos`) en vez de una columna `cargo` en cada historia.** Se descartó añadir `aprobado_por_cargo` y `anulado_por_cargo` a ~17 tablas: hay que tocar cada escritura y basta una olvidada para que una historia salga sin cargo. Con la historia de accesos, `accesoEnFecha` responde para cualquier registro, incluidos los anteriores al cambio (RF-52, «Residente / Director» antes del 2026-11-06).
- **Una sola migración, no dos.** El plan de la tanda suponía que Postgres no deja usar un valor de enum recién añadido en la misma transacción. Pero el migrador de `neon-http` ejecuta cada sentencia por separado, sin transacción (`node_modules/drizzle-orm/neon-http/migrator.js`), así que el `ADD VALUE` ya está confirmado cuando corre el `UPDATE`. La consecuencia es la contraria: **la migración no es atómica** y tiene que poder repetirse si falla a medias. Por eso:
  - el `RENAME VALUE` va dentro de un `DO $$ … IF EXISTS (… pg_enum … 'supervisor') …$$`;
  - los `ADD VALUE` llevan `IF NOT EXISTS`;
  - las tablas, `IF NOT EXISTS`;
  - los `INSERT`, `WHERE NOT EXISTS`.
- **El cargo `director` conserva su id y cambia su nombre.** Se descartó crear un id `director_obra` y migrar `usuarios.cargo`: el id no se ve, y cambiarlo es un `UPDATE` más que puede fallar a medias sin ganar nada.
- **El rechazo al Residente que intenta aprobar sale de la guardia.** Se descartó un `if` por pantalla: la pantalla ya no muestra el botón (RF-36), pero la petición tiene que fallar igual con la pantalla vieja abierta (RF-56), y eso solo lo garantiza el servidor.

## Impacto en la sincronización

Sin impacto en la sincronización. El pull, el push, el `outbox` y `seq` no cambian. Los endpoints `movil/` usan `guardia-movil.ts` (token del operador) y no leen roles del panel. Su mensaje «Comuníquese con su supervisor» se deja: es texto para el operador.

## Contrato de API

Todas las rutas abren con `requerirSesion` o `requerirPermiso` y filtran con `alcance.ts`.

- **Cabecera nueva** en todas las rutas del panel: `x-obra-en-uso: <obraId>` (opcional). La lee `sesion.ts`. No es un permiso: una obra ajena se ignora (RF-20).
- `GET /api/panel/obras`: cada fila suma `directoresDeObra: number`.
- `POST /api/panel/personas` y `PATCH /api/panel/personas/[id]`: el cuerpo admite `obras?: string[]` (Director de Obra) y `obraConservada?: string` (RF-70).
  - **422** con el texto de `reparoDeObrasDelAcceso` (RF-18, RF-32) o de `motivoParaNoDarRol` (RF-14, RF-27, RF-39).
  - **404** si la persona o una obra no está a su alcance (RF-20).
- `POST /api/panel/personas/[id]/obras` con `{ asignar?: string[], retirar?: string[] }`. Solo `director_proyectos` y `admin` (RF-13).
  - **403** si quien la pide es Director de Obra, incluido sobre sí mismo (RF-28).
  - **200** con las obras vigentes.
  - Una sola sentencia: `UPDATE … SET hasta` + `INSERT … ON CONFLICT DO NOTHING` sobre el índice parcial. Dos personas a la vez: gana la última, y cada fila conserva quién asignó y quién retiró.
- `POST /api/panel/personas/[id]/revisado`: apaga `revisar` (RF-51). Lo pueden la Gerencia y el Director de Proyectos.
- **Cualquier `aprobar` o `anular` de un Residente:** **403** con `motivoParaNoAprobar` (RF-34, RF-35), salvo en `whatsapp` (RF-37).

## Estrategia de verificación

- **`scripts/verificar-reglas.ts`**, casos «041/»:
  - La tabla completa para los tres roles: módulo × acción esperada. RF-6, RF-9, RF-15, RF-21, RF-33, RF-37, RF-58–RF-64, RF-68, RF-72.
  - `PUEDE_DAR` de cada uno, y que nadie salvo `admin` da `director_proyectos`. RF-12, RF-14, RF-26, RF-27, RF-38, RF-39.
  - `reparoDeObrasDelAcceso`: Director de Obra con 0, 1 y 3 obras; Residente con 0, 1 y 2; Director de Proyectos con 1. RF-16, RF-18, RF-32.
  - `obraEnUso`: pedida propia, ajena, ninguna con una obra y ninguna con varias. RF-20, RF-22, RF-23.
  - `accesoTrasLaMigracion`: los cuatro casos. RF-46–RF-48.
  - `obrasAlCambiarDeAcceso`: bajar sin obra escogida (rechazo), bajar con obra escogida y subir. RF-70, RF-71.
  - `destinoAlEntrar` para los tres roles. RF-24, RF-25.
  - `alcanceDelAsistente` para los tres roles. RF-53–RF-55.
  - Los casos de 008, 028, 033 y 040 que dan por hecho `supervisor` se ajustan al nombre nuevo **sin cambiar lo que comprueban**.
- **Demo manual** (desarrollo, datos `PRUEBA-041`, borrados por id al terminar): el recorrido de los criterios de finalización de la spec, más:
  - dos pestañas del mismo Director de Obra en obras distintas, cada una registrando en la suya;
  - abrir con la dirección `/panel/proyectos/<obra ajena>` y ver la lista vacía, no la obra;
  - un Residente con la pantalla de laboratorio abierta desde antes del cambio, que pulsa «Aprobar» y recibe el 403 con el mensaje;
  - la Gerencia baja un Director de Obra con dos obras a Residente y escoge una;
  - la migración se corre dos veces seguidas en desarrollo y la segunda no cambia nada.
- **Comprobaciones extra:** `npx expo export --platform web` (se tocan pantallas del panel). No se lee ningún secreto nuevo.

## Riesgos

- **Un lector de `obraId` que en realidad significa «todas mis obras» y queda con la obra en uso.**
  - Ejemplo: el asistente, o el aviso de días sin parte de `estado-dias.ts`. El Director de Obra vería menos de lo que debe, nunca más.
  - Se detecta con la revisión uno por uno, apuntada en `tareas.md`, y con la demo de dos obras.
  - Se revierte cambiando ese lector a `obras`.
- **Un `rol === 'admin'` que significaba «ve todas las obras» y no se cambió.**
  - Al Director de Proyectos le faltaría algo, nunca le sobraría.
  - Se detecta con `grep "rol === 'admin'\|rol !== 'admin'"`, revisando cada aparición, y con la demo del Director de Proyectos.
- **La migración falla a medias en producción**, porque no es atómica.
  - Cada sentencia se puede repetir, así que se vuelve a correr `scripts/migrar-produccion.ts`.
  - Se detecta porque el script no termina en «Listo.».
  - Nunca se despliega la imagen nueva sin que la migración haya terminado (`AGENTS.md`).
- **Personas en producción con cargo «Director» que en realidad son Directores de Proyectos.**
  - Pasan a Director de Obra, que ve menos.
  - La Gerencia lo corrige desde Personas (RF-69).
  - Antes de desplegar, una consulta de solo lectura en producción lista quiénes caen en cada caso, para avisarle a OCC.
- **Una cabecera `x-obra-en-uso` falsificada:** no da nada. Solo se acepta si la obra está entre las de la persona, y eso lo lee el servidor de la base en cada petición.
- **Deshacer:** la migración se puede revertir:
  - `RENAME VALUE 'residente' TO 'supervisor'`;
  - `UPDATE usuarios SET rol='supervisor'` para los dos roles nuevos, devolviendo `obra_id` desde `usuarios_obras`.

  Los valores nuevos del enum quedan sin uso, porque Postgres no los borra, y es inofensivo. Las tablas nuevas se quedan: nada se borra.
