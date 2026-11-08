# Tareas — Spec 041, cargos de obra

> Plan del 2026-11-06. Se hace **una tarea a la vez**, y cada una termina con `npm run verificar`, `npm run typecheck` y `npm run lint` en verde. Producción no se toca: todo va a desarrollo (`neondb`).

## Reglas puras (no dependen de nada)

- [x] T1. **`rules/permisos.ts`**:
      - En `ROLES`, `supervisor` pasa a `residente`, y se añaden `director_obra` y `director_proyectos`.
      - Se actualizan `TABLA`, `PUEDE_DAR`, `ETIQUETA_ROL`, `QUIEN_ES` y `MODULO_DEL_ROL`, según el resumen de la tabla del plan.
      - `rolVeTodasLasObras` incluye a `director_proyectos`; `rolDeVariasObras`; `modulosVisibles` usa `!rolVeTodasLasObras`.
      - Se añade `motivoParaNoAprobar`.
      - Se renombra cada `'supervisor'` de rol en `src/`, sin tocar `origen: 'supervisor'` de asignaciones.
      - Se ajustan las pruebas de 008, 028, 033 y 040 que nombran `supervisor`, sin cambiar lo que comprueban.
      - Se añaden las pruebas «041/» de la tabla (módulo × acción) y de `PUEDE_DAR`.

      (RF-1, RF-2, RF-6, RF-9–RF-12, RF-14, RF-15, RF-21, RF-26, RF-27, RF-33–RF-41, RF-58–RF-64, RF-68, RF-72)
      Hecho cuando: `grep -rn "'supervisor'" src scripts` solo devuelve el `origen` de asignaciones, las pruebas «041/» de la tabla pasan, y los tres comandos están en verde.
- [x] T2. **`catalogos/cargos.ts` y `rules/empresas.ts`**:
      - Cargo nuevo `director_proyectos`; el cargo `director` pasa a llamarse «Director de Obra» y sugiere `director_obra`; los residentes sugieren `residente`.
      - `EMPRESAS_DEL_ROL` y `EMPRESA_DEL_ROL` para los tres roles.
      - `ACCESOS_SIN_OBRA` incluye a `director_proyectos`.
      - `destinoAlEntrar`, con los tres casos.
      - `alcanzaLaObraDeLaRuta` recibe `obras`.
      - `reparoDeObrasDelAcceso`, nueva.
      - Pruebas «041/» de todo lo anterior.

      (RF-3, RF-4, RF-5, RF-16, RF-18, RF-24, RF-25, RF-32, RF-66)
      Hecho cuando:
      - `destinoAlEntrar` lleva a un Director de Obra con una obra a esa obra, y con dos obras a la lista;
      - `reparoDeObrasDelAcceso` rechaza 0 obras para el Director de Obra, 2 para el Residente y 1 para el Director de Proyectos;
      - los tres comandos están en verde.
- [x] T3. **`rules/cargos-de-obra.ts`** (nuevo), con `accesoTrasLaMigracion`, `obrasAlCambiarDeAcceso`, `puedeAsignarObras` y `obraEnUso`, y sus pruebas «041/». (RF-13, RF-20, RF-22, RF-23, RF-28, RF-46–RF-48, RF-70, RF-71)
      Hecho cuando: pasan los cuatro casos de migración, bajar sin obra escogida (rechazo), bajar con obra, subir, el Director de Obra asignándose a sí mismo (rechazo), y la obra en uso propia, ajena, ninguna con una obra y ninguna con varias; los tres comandos están en verde.
- [x] T4. **`rules/asistente.ts`**: `QuienPregunta` gana `obras`, `obras: quien.obras`, la rama de vehículos y personas vale para los tres roles, y `DE_EMPRESA_DEL_ROL` cubre los roles nuevos. Pruebas «041/» del alcance de los tres roles. (RF-53–RF-55)
      Hecho cuando: el alcance del Director de Proyectos es `'todas'` sin módulos de empresa del RF-15, el del Director de Obra con dos obras lista esas dos, y los tres comandos están en verde.

## Datos

- [x] T5. **Esquema y migración `0040`.**
      - Tablas `usuarios_obras` y `usuarios_accesos` en `esquema.ts`, generadas con `npm run db:generate:servidor`.
      - Al mismo `.sql` se le añade a mano: el rename del enum, dentro de un `DO $$` con guarda en `pg_enum`; los `ADD VALUE IF NOT EXISTS`; y el paso de las personas, con `WHERE NOT EXISTS`.
      - Se aplica **solo en dev**.

      (RF-31, RF-42, RF-46–RF-52, RF-65)
      Hecho cuando:
      - un script temporal de solo lectura confirma en dev el enum nuevo, los directores en `usuarios_obras`, las filas de `usuarios_accesos` y las marcadas para revisar;
      - correr la migración una segunda vez no cambia nada;
      - volver a generar dice «No schema changes»;
      - el script se borra y los tres comandos están en verde.

## Servidor

- [x] T6. **`auth/servidor/sesion.ts`**:
      - `PersonaEnSesion` gana `obras` y `cargo`.
      - La obra en uso sale de la cabecera `x-obra-en-uso` o de `?obraId=` con `obraEnUso`, y de ella salen `obraId`, `obraNombre` y `modulosDeObra`.
      - Ayudante `accesoEnFecha(usuarioId, fecha)`.

      (RF-19, RF-22, RF-23, RF-29, RF-56, RF-67)
      Hecho cuando: un e2e en dev con un Director de Obra `PRUEBA-041` de dos obras recibe datos de la obra A con la cabecera A, de la B con la cabecera B, y nada con la cabecera de una tercera obra; los tres comandos están en verde.
- [x] T7. **`servidor/alcance.ts` y `servidor/guardia.ts`**:
      - `alcanzaLaObra` y `alcanzaLaImagen` usan `obras` y `veTodasLasObras`.
      - Se añade `obraParaEscribir`.
      - `requerirPermiso` responde 403 con `motivoParaNoAprobar` al Residente.

      (RF-20, RF-23, RF-34, RF-35, RF-56)
      Hecho cuando:
      - en dev, un Residente `PRUEBA-041` recibe 403 con el mensaje al anular un parte, y 200 al aprobar un reporte de la bandeja de WhatsApp;
      - una imagen de una obra ajena da 404;
      - los tres comandos están en verde.
- [x] T8. **Revisión de los lectores de `obraId`, parte 1:** `features/servidor`, `features/whatsapp/servidor`, `features/asistente/servidor` y `features/reportes/servidor`. Cada uso queda en una de tres categorías, y cada una se trata así:
      - **obra en uso:** se deja;
      - **todas mis obras:** pasa a `obras`;
      - **`rol === 'admin'` que significa «ve todas»:** pasa a `veTodasLasObras`.

      Cada caso se anota en las notas de ejecución. (RF-19, RF-53–RF-55)
      Hecho cuando: la lista de sitios revisados está en las notas con su categoría, y los tres comandos están en verde.
- [x] T9. **Revisión de los lectores de `obraId`, parte 2:** `src/app/api/panel/**` y los `features/*/servidor` restantes, con el mismo criterio. (RF-19, RF-20, RF-23)
      Hecho cuando: `grep -rn "rol === 'admin'\|rol !== 'admin'" src` solo devuelve sitios anotados como «es gerencia», y los tres comandos están en verde.
- [x] T10. **API de personas**:
      - Validaciones de `POST /personas` y `PATCH /personas/[id]`: `obras`, `obraConservada`, `reparoDeObrasDelAcceso` y `motivoParaNoDarRol`.
      - `personaAlcanzable` usa todas las obras de la persona.
      - Rutas nuevas `personas/[id]/obras` y `personas/[id]/revisado`.
      - `activacion` abierta según la tabla.
      - Contratos zod en `panel/contratos.ts`.

      (RF-12–RF-14, RF-17, RF-18, RF-26–RF-28, RF-31, RF-32, RF-38, RF-39, RF-51, RF-69–RF-72)
      Hecho cuando: un e2e en dev cubre lo siguiente, la limpieza deja 0 filas `PRUEBA-041` y los tres comandos están en verde.
      - el Director de Proyectos crea un Director de Obra con dos obras (201);
      - el Director de Obra crea un Residente (201), intenta crear otro Director de Obra (422) y se asigna una obra (403);
      - el Residente crea un operador (201) y un almacenista (422);
      - la Gerencia baja al Director de Obra a Residente sin escoger obra (422), y escogiéndola (200).
- [x] T11. **`GET /obras` con `directoresDeObra`**, y escritura de obras para el Director de Proyectos. (RF-7, RF-8, RF-43, RF-44)
      Hecho cuando: en dev, el Director de Proyectos crea una obra `PRUEBA-041` (201), y esa obra sale con `directoresDeObra: 0`; los tres comandos están en verde.

## Panel

- [x] T12. **Cabecera y obra en uso**:
      - `cliente-api.ts` manda `x-obra-en-uso` con la obra de la ruta;
      - `marco.tsx` muestra la obra en uso y un selector con las obras de la persona;
      - `pantalla-proyectos.tsx` muestra la lista a quien ve todas o tiene varias obras, con el aviso «Sin Director de Obra».

      (RF-22, RF-24, RF-25, RF-44, RF-67)
      Hecho cuando: en Chrome, un Director de Obra `PRUEBA-041` con dos obras entra y ve la lista; abre la A y registra una actividad; cambia a la B con el selector; y en dos pestañas cada una guarda en su obra. Los tres comandos están en verde.
- [x] T13. **`pantalla-personas.tsx`**:
      - selector de varias obras para el Director de Obra;
      - una obra obligatoria para el Residente;
      - ninguna para el Director de Proyectos;
      - pedir la obra que se conserva al bajar a Residente;
      - filtro y aviso «Pasaron a Residente: revisar», con el botón «Revisado».

      (RF-17, RF-18, RF-32, RF-51, RF-65, RF-70)
      Hecho cuando: en Chrome a 1366 px y a 390 px se hace cada uno de esos pasos, y los mensajes de error son los de la regla. Los tres comandos están en verde.
- [x] T14. **Historias**: donde el panel muestra «Aprobado por» o «Anulado por» (parte, laboratorio, almacén, cantera, preoperacionales, contrato), el nombre va con el acceso de esa fecha, usando `accesoEnFecha`. (RF-42, RF-52)
      Hecho cuando: en Chrome, un parte anulado antes del cambio dice «Residente / Director», y uno anulado hoy por un Director de Obra dice «Director de Obra». Los tres comandos están en verde.
- [x] T15. **Botones de aprobar y anular**: revisión, pantalla por pantalla, de que salen de `alcanza(rol, …)` y no de comparar el rol, más el texto de los accesos nuevos en todo el panel. (RF-2, RF-36, RF-37, RF-61)
      Hecho cuando:
      - en Chrome, el Residente no ve «Anular» en el parte ni «Aprobar» en laboratorio;
      - el Residente sí ve «Aprobar» en la bandeja de WhatsApp y «Cerrar parte»;
      - la cadena «Residente / Director» solo aparece en las historias anteriores al cambio;
      - los tres comandos están en verde.

## Cambio del 2026-11-08

- [x] T17. **Asistente del Director de Obra**: `alcanceDelAsistente` limita al Director de Obra a su obra en uso, y el contexto le indica cambiar de obra para consultar otra; con varias obras y ninguna en uso, abrir una. Pruebas «041/». (RF-73, RF-74)
      Hecho cuando: las pruebas pasan, el alcance de un Director de Obra con dos obras lista solo la de uso y `lugaresPropios` también; los tres comandos están en verde.
- [x] T18. **Contraseñas temporales**: regla `puedeGenerarClave`, ruta `clave` con `personas · activar` y alcance por obra, botones en Personas y en la ficha, y tabla `claves_generadas` con su migración, aplicada solo en dev. (RF-75, RF-76, RF-78)
      Hecho cuando: un Director de Obra genera la de un Residente de su obra, no la de otro Director ni la de alguien de otra obra; la fila de quién la generó queda escrita; los tres comandos están en verde.
- [x] T19. **Baja de obras solo de la Gerencia**: `motivoParaNoDarDeBajaObra`, ruta `DELETE` y botón. (RF-77)
      Hecho cuando: el Director de Proyectos recibe 403 con el mensaje y no ve el botón, la Gerencia sí; los tres comandos están en verde.

## Cierre

- [x] T16. **Validación final** (va de última, después de T17 a T19): recorrido RF por RF en `validacion.md`, la demo de los criterios de finalización de la spec y la del plan (dos pestañas, obra ajena por dirección, pantalla vieja abierta, bajar de acceso, migración repetida), `npx expo export --platform web`, y la limpieza de `PRUEBA-041`. (Todos)
      Hecho cuando: cada RF tiene su comprobación con resultado, los tres comandos están en verde y la spec queda marcada como **Cumplida en desarrollo**.

## Notas de ejecución

### T1 (2026-11-06)

- **Resultado:** `npm run verificar` da 686 verificaciones correctas, con 9 pruebas «041/» nuevas; `typecheck` y `lint` sin errores. `grep -rn "'supervisor'" src scripts` solo devuelve el `origen` de asignaciones y la prueba 041 que comprueba que el rol ya no existe.
- **Se tocó lo mínimo de otros archivos para que compile**, porque son `Record<Rol, …>` exhaustivos:
  - `rules/asistente.ts`: `ROLES_DEL_ASISTENTE`, `DE_EMPRESA_DEL_ROL` y la rama de vehículos y personas, que vale para `residente` y `director_obra`.
  - `rules/empresas.ts`: `EMPRESAS_DEL_ROL`, `EMPRESA_DEL_ROL` y los `case` de `destinoAlEntrar`. El Director de Proyectos va a la lista; el Residente y el Director de Obra, como el supervisor de antes.
  - `catalogos/cargos.ts`: `rolSugerido` pasa a `'residente'` en los tres cargos de obra; la **T2** pone `director` → `director_obra`.

  Lo demás de esos archivos sigue en la T2 y la T4.
- **Orden de `ROLES`:** los dos roles nuevos van al **final**, `director_proyectos` y luego `director_obra`. Es el orden en que la T5 tiene que hacer los `ADD VALUE`, para que el enum de la base y el del código coincidan. También fija el orden de los mensajes: «lo hacen la gerencia, el director de proyectos y el director de obra».
- **`motivoParaNoDarRol`** ya no dice siempre «Solo la gerencia»: arma la lista de quién puede desde `PUEDE_DAR` (RF-27, RF-39). Los textos de `motivoDeRechazo` cambian solos, porque salen de la tabla.
- **Pruebas viejas ajustadas.**
  - Las que solo nombraban `supervisor` pasaron a `director_obra`, que conserva todo lo de entonces.
  - Las que comprobaban algo que la 041 cambió se reescribieron con el comportamiento nuevo, citando el RF:
    - quién anula en almacén, preoperacionales y cantera;
    - quién emite códigos;
    - a quién se da cada acceso;
    - los textos de rechazo;
    - las listas `ROLES.filter(...)` de solicitudes, documentos, RR. HH. y vehículos;
    - los módulos visibles, que ahora incluyen Personas.
- **Para la T5:** el enum cambió en el código, pero la base de desarrollo sigue con `supervisor` hasta la migración 0040. **No conviene abrir el panel de desarrollo con un residente entre la T1 y la T5.** La migración no se generó aquí a propósito: drizzle-kit propondría borrar y recrear el tipo (ver la 0039), y la T5 la escribe a mano.
- **Para la T13:** el menú de la obra no tiene página de Personas. El residente y el director de obra ya tienen `personas·ver`, pero falta decir **dónde** dan los accesos de obra. Lo natural es la pestaña de Personas de Recursos Humanos, como la auxiliar. La prueba de 033/RF-21 excluye `personas` mientras tanto, con comentario.
- `scripts/revisar-preoperacionales.ts` busca `rol = 'residente'` en vez de `'supervisor'`.

### T2 (2026-11-06)

- **Resultado:** `npm run verificar` da 690 verificaciones correctas, con 4 pruebas «041/» nuevas; `typecheck` y `lint` sin errores.
- **Cargos:**
  - `director_proyectos` es nuevo («Director de Proyectos»), justo después de «Gerente».
  - `director` se queda con su slug, se rotula «Director de Obra» y sugiere `director_obra`.
  - Los dos residentes sugieren `residente`.
  - Son 24 cargos; se ajustaron las pruebas de cuántos son y de quién entra como residente.
- **`alcanzaLaObraDeLaRuta`:**
  - Pasa a mirar `obras`, la lista de asignadas, y ya no solo `obraId`. El Director de Obra abre cualquiera de las suyas y el Director de Proyectos cualquiera, como la gerencia.
  - Por ahora `obras` es **opcional**: sin ella vale la obra única, como antes. Los llamadores (`compras`, `documentos`, `rrhh`, `tesoreria`, `ficha`, `herramientas`, `paginas-de-empresa`, `pantalla-proyectos`, `pantalla-maquinaria`) la tendrán cuando la sesión la lleve (T6) y el panel la reciba (T12).
  - **Para la T9:** cuando `PersonaEnSesion.obras` exista, conviene volverla obligatoria, para que el compilador señale a quien no la pase.
- **`ACCESOS_SIN_OBRA`** suma al Director de Proyectos, con empresa `proyectos`. Con eso, en Personas, el selector de obra se oculta solo para él (`empresaDelAccesoSinObra`) y el alta le pone la empresa Proyectos.
- **`reparoDeObrasDelAcceso`** es nueva. Para el Director de Proyectos usa el mismo texto que `reparoDelAccesoSinObra`. Todavía no la llama nadie: la usa la T10.
- **Ojo hasta la T10 (T2):** elegir el cargo «Director de Obra» en el formulario ya propone el acceso Director de Obra, pero el API de personas todavía no maneja la lista de obras. No conviene crear directores en desarrollo hasta la T10, y además la base no tiene el valor del enum hasta la T5.

### T3 (2026-11-06)

- **Resultado:** `npm run verificar` da 694 verificaciones correctas, con 4 pruebas «041/» nuevas; `typecheck` y `lint` sin errores.
- **`src/shared/rules/cargos-de-obra.ts`** (nuevo) tiene cuatro reglas puras. Todavía no las llama nadie: las usan la T5 (migración), la T6 (sesión) y la T10 (personas).
- **Cambio de nombre respecto al plan:** `puedeAsignarObras` se llama **`motivoParaNoAsignarObras`** y devuelve el texto del rechazo, o `null`. Así lo hace ya `motivoParaNoDarRol`: la ruta necesita el mensaje (RF-28), no solo un sí o un no.
- **`accesoTrasLaMigracion`** recibe el rol de antes **como texto**, porque `'supervisor'` ya no es un `Rol`. La migración 0040 (T5) tiene que hacer lo mismo en SQL; el comentario de la función lo recuerda.
- **`obrasAlCambiarDeAcceso`:** si un Director de Obra con **una sola** obra baja a Residente, se toma esa obra sin preguntar.
  - RF-70 dice «exige escoger». Con una sola opción no hay nada que escoger, así que la pantalla (T13) la mostrará ya escogida.
  - No cambia el comportamiento acordado, pero lo dejo anotado por si la validación lo lee al pie de la letra.
- **`obraEnUso`:** con una obra pedida que no es suya y una sola obra propia, devuelve la propia. Es el paso 4 del algoritmo del plan: una obra ajena se ignora, no da error.

### T4 (2026-11-06)

- **Resultado:** `npm run verificar` da 695 verificaciones correctas, con 1 prueba «041/» nueva que cubre RF-53 a RF-55 con los tres cargos; `typecheck` y `lint` sin errores.
- **`QuienPregunta` gana `obras`**, opcional por la misma razón que en `alcanzaLaObraDeLaRuta` (T2): la sesión la lleva desde la T6 y el panel desde la T12. Sin `obras` vale la obra única.
- **Qué devuelve cada rama:**
  - Si tiene obras, `obras` es la lista entera.
  - Si no tiene ninguna, cae en la rama de RF-10 (nada de obra).
  - El Director de Proyectos va por la rama de quien ve todas, y por la tabla ya alcanza vehículos y personas.
- **Para la T8 — módulos por obra:** los módulos del asistente siguen saliendo de `modulosDeObra` de la **obra en uso**. Supongamos un Director de Obra con almacén apagado en la obra A y encendido en la B: con la A en uso, el asistente no consulta almacén en ninguna de las dos, y con la B en uso lo consulta también en la A.
  - Hoy esto no pasa, porque con una obra son la misma.
  - Opciones para la T8: o se da la unión de los módulos de sus obras y cada consulta filtra la obra con `filtroDeModulo`, como hace la gerencia; o se acepta como está.
  - Es un detalle de alcance, no de seguridad: nunca da obras ajenas.

### T5 (2026-11-06)

- **Resultado:**
  - `npm run verificar` da 695 verificaciones correctas; `typecheck` y `lint` sin errores.
  - `db:generate:servidor` vuelve a dar «No schema changes».
  - La migración **`0040_curvy_smiling_tiger.sql`**, escrita a mano, está aplicada **solo en desarrollo** (`neondb`). Producción no se tocó.
- **Lo que generó drizzle-kit y se reescribió:** borraba el tipo `rol_usuario` y lo volvía a crear con un cast, que falla con las filas `supervisor`. Quedó así, y cada sentencia se puede repetir:
  - `RENAME VALUE`, dentro de un `DO $$` con guarda en `pg_enum`;
  - `ADD VALUE IF NOT EXISTS` para `director_proyectos` y luego `director_obra`, en el orden de `ROLES`;
  - `CREATE TABLE IF NOT EXISTS`, con las llaves foráneas dentro de la tabla y los mismos nombres que pone drizzle;
  - `CREATE INDEX IF NOT EXISTS`;
  - el paso de las personas, con `NOT EXISTS`.
- **Comprobado en desarrollo** con scripts temporales, ya borrados:
  - El enum queda `admin, residente, …, director_proyectos, director_obra`.
  - Cada caso quedó en su acceso:
    - «Director» con obra → `director_obra`, con su obra en `usuarios_obras` y `obra_id` vacío;
    - «Director» sin obra → `director_obra` sin obras y con `revisar`;
    - «Topógrafo» → `residente` con `revisar`;
    - `residente1` y `residente2` → `residente` sin marca.
  - Las 71 personas tienen su fila vigente en `usuarios_accesos`.
  - Las 5 que eran «Residente / Director» tienen además una fila cerrada `supervisor`, desde su alta, sin hueco con la vigente: las dos llevan el mismo `now()` porque van en una sola sentencia.
  - **Repetir las 13 sentencias** sobre la base ya migrada no da error y deja los mismos totales.
- **Cambio en una regla de la T3, con su prueba:** `accesoTrasLaMigracion` recibe `tieneObra`. Quien queda sin obra va a la lista de revisar sea cual sea su cargo (RF-65), y la migración hace lo mismo. Antes la regla solo marcaba al que tenía otro cargo.
- **Los id de las filas que crea la migración** son `gen_random_uuid()` (v4); los de la app son `uuidv7`. Los dos son UUID en texto, y ninguna consulta depende del orden de los id de estas tablas.
- **Las tablas nuevas no llevan `actualizado_en`** ni disparador: su tiempo lo dicen `desde` y `hasta`, y no se editan más que para cerrarlas.
- **Datos de prueba que siguen en desarrollo**, para la T6 y la T10; se borran por id en la T16 junto con sus filas de `usuarios_accesos` y `usuarios_obras`:
  - `prueba-041-director` → `cded0158-a634-4dd1-89b8-b0092eafc1ed`
  - `prueba-041-topografo` → `5bb6a7c2-62e5-4bc2-ae50-8344f79f11c2`
  - `prueba-041-sin-obra` → `100305f9-5236-4277-92f3-b5307e0da28a`
  - La obra que usan es `01a06446-7fc7-7c5e-9f4f-29f9c5fa0016`, la de los residentes de desarrollo.
- **Fuera de la tarea:** `git status` muestra un cambio en `src/features/asistente/servidor/conversacion.ts` que no hizo ninguna tarea de la 041. Es un arreglo del historial cuando una pregunta fue solo un adjunto. Se dejó como está.
- **Para producción** (T23 de la 033): esta migración va después de la 0039. Antes, conviene una consulta de solo lectura para ver quiénes tienen hoy el cargo `director` y quiénes quedarán con `revisar`.

### T6 (2026-11-06)

- **Resultado:** `npm run verificar` da 696 verificaciones correctas, con 1 prueba «041/» nueva (`etiquetaDeAccesoHistorico`); `typecheck` y `lint` sin errores.
- **`sesion.ts`**:
  - `PersonaEnSesion` gana `obras` y `cargo`.
  - Una **sola consulta** trae a la persona con todas sus obras, en un `json_agg`: cada obra con su nombre, sus módulos y dos marcas, `propia` (es su `obra_id`) y `asignada` (vigente en `usuarios_obras`). Así no hay una segunda ida a la base por petición.
  - El rol decide qué marca vale: el Director de Obra, `asignada`; los demás, `propia`. Las dos fuentes no se mezclan nunca, aunque al Director de Obra le quedara por error un `obra_id`.
  - La obra en uso sale de `obraEnUso`, a partir de la cabecera `x-obra-en-uso` o, si no viene, de `?obraId=`. De esa obra salen `obraId`, `obraNombre` y `modulosDeObra`.
- **`auth/servidor/accesos.ts`** (nuevo): `accesoEnFecha(usuarioId, fecha)`. `desde` cuenta incluido y `hasta` no, y la etiqueta sale de la regla pura `etiquetaDeAccesoHistorico` (`rules/cargos-de-obra.ts`), que muestra `supervisor` como «Residente / Director». Lo usa la T14.
- **E2E en desarrollo**, con un script temporal ya borrado. Se usó `prueba-041-director`, con dos obras, y una sesión real de `abrirSesion`:

  | Cabecera | `obraId` | Partes visibles con `filtroDeObra` |
  |---|---|---|
  | Obra A | A | 14, los mismos que tiene A |
  | Obra B | B | 25, los mismos que tiene B |
  | Obra ajena | `null` | 0 |
  | Ninguna | `null` | — |

  - `residente1`, pidiendo otra obra, se queda en la suya, igual que antes.
  - `accesoEnFecha` da «Residente / Director» para ayer y «Residente» para hoy.
  - Las dos sesiones de prueba quedaron revocadas.
- **Datos de prueba que se añaden** para la limpieza de la T16: la fila de `usuarios_obras` `6c9fb9b0-a7b7-4d59-af2a-46c20aa3ace6` asigna a `prueba-041-director` la obra B, `01a0d533-2208-79f8-ae07-c46fd12b3041` («Pruebas spec 018»).
- **Para la T9 — obras dadas de baja:** la consulta no filtra las obras con `eliminado_en`, igual que el `join` de antes. Un Director de Obra con una obra dada de baja la seguiría teniendo en su lista. Es el caso límite 16 de la clarificación; la spec no lo resolvió, así que queda como estaba.

### T7 (2026-11-06)

- **Resultado:** `npm run verificar` da 698 verificaciones correctas, con 2 pruebas «041/» nuevas (alcance de una fila o una imagen, y `obraParaEscribir`); `typecheck` y `lint` sin errores.
- **`alcance.ts`**:
  - **`alcanzaLaObra`** compara contra `persona.obras`, todas las de la persona, y ya no solo contra la obra en uso. Sin obras, no alcanza nada.
  - **`obraParaEscribir`** es nueva: quien ve todas escribe en la obra pedida; los demás, en la pedida si es suya y si no en la obra en uso. Todavía no la llama ninguna ruta: la T9 revisa dónde hace falta.
  - **Listados:** los filtros (`filtroDeObra`, `filtroDeObraEstricto`, `filtroDeObraPedida`) siguen con la obra en uso, a propósito. La cabecera del archivo explica las dos preguntas: un listado mira la obra en uso; una fila suelta mira todas las obras.
- **`alcanzaLaImagen` conserva `rol === 'admin'` para las imágenes huérfanas.**
  - El plan decía quitarlo, pero ahí significa «es la gerencia», no «ve todas las obras»: revisar lo que quedó sin dueño es trabajo de la gerencia.
  - El Director de Proyectos entra por `veTodasLasObras`, con el permiso del módulo, igual que el Encargado de OCC. Hay una prueba de que no ve las huérfanas.
- **`guardia.ts`:** cuando la tabla dice que no, `requerirPermiso` usa primero `motivoParaNoAprobar`. Al Residente que intenta aprobar o anular se le dice a quién acudir; a los demás, el rechazo de siempre.
- **E2E contra el servidor de desarrollo** (`npx expo start --web --port 8082`, porque el 8081 lo ocupaba otro proceso que no se tocó), con una sesión real de `residente1` y un script temporal ya borrado:
  1. Anular un parte de su obra da **403** con «El Residente no anula: pídaselo al Director de Obra, el Director de Proyectos o la Gerencia.», y el parte quedó igual.
  2. Aprobar en la bandeja de WhatsApp **pasa la guardia**. Respondió **400** («Falta la versión de la propuesta que se leyó») porque se probó con una propuesta inexistente. **No es el 200 de una aprobación real:** eso queda para la demo de la T16, con una propuesta de verdad.
  3. Aprobar una granulometría da **403** con «El Residente no aprueba: lo aprueban el Director de Obra, el Director de Proyectos o la Gerencia.».
  4. La foto del parte de otra obra da **404**.
  - La sesión de prueba quedó revocada y el servidor se detuvo.

### T8 (2026-11-08)

- **Resultado:** `npm run verificar` da 699 verificaciones correctas, con 1 prueba «041/» nueva (`esDeSusObras`); `typecheck` y `lint` sin errores.
- **Ayudante nuevo en `alcance.ts`: `esDeSusObras`.** Es `alcanzaLaObra` sin dejar pasar la fila sin obra. Se usa donde antes se comparaba `fila.obraId !== sesion.obraId`: con `alcanzaLaObra`, el residente habría pasado a ver las marcas y máquinas sin obra, que hoy no ve.
- **Sitios revisados**, con su categoría:

  | Sitio | Qué lee | Categoría | Qué se hizo |
  |---|---|---|---|
  | `servidor/guardia.ts` `requerirAdmin` | `rol !== 'admin'` | es gerencia | Se deja. Qué rutas lo usan y si el Director de Proyectos debería pasar: **T9** |
  | `servidor/guardia.ts` `requerirPermiso` | `modulosDeObra` | obra en uso | Se deja: el módulo apagado es el de la pestaña |
  | `servidor/guardia-movil.ts` | `usuarios.obraId` del operador | no aplica | El operador tiene una sola obra |
  | `servidor/ingesta.ts` | obra del equipo y de la máquina | no aplica | Son datos de las filas, no de la sesión |
  | `servidor/modulos-de-obra.ts` | obra de otra persona | no aplica | Solo lo dice el comentario |
  | `servidor/alcance.ts` | — | — | Ya revisado en la T7; se le suma `esDeSusObras` |
  | `whatsapp/servidor/bandeja.ts`, `excepciones.ts` | `filtroDeObraEstricto` y `filtro.obraId` para quien ve todas | obra en uso | Se dejan: son listados |
  | `whatsapp/servidor/aprobacion.ts`, `decisiones.ts`, `personas.ts` | `filtroDeObraEstricto` sobre **un** mensaje | obra en uso | Se dejan. Aprobar un mensaje de la obra B con la A en uso da 404; la bandeja solo lista los de la obra en uso, así que en la pantalla no se ve. Si la T12 deja aprobar desde otra pestaña, se pasa a `esDeSusObras` |
  | `whatsapp/servidor/creados.ts` `listarCreados` | `sesion.obraId` | obra en uso | Se deja: es un listado |
  | `whatsapp/servidor/creados.ts` `leerCreado` | marca suelta | todas mis obras | Pasa a `esDeSusObras` |
  | `whatsapp/servidor/estado-dias.ts` `obraAlAlcance` | obra pedida (en la ruta de armar a mano, o `?obraId=`) | todas mis obras | Acepta la pedida si es una de las suyas, si no da 404; sin pedida, la obra en uso. Sigue siendo una sola obra por consulta |
  | `whatsapp/servidor/dias-empresa.ts` | `alcanzaLaEmpresa(rol)` | no aplica | Es de empresa, no de obra |
  | `whatsapp/servidor/{almacen,automatico,catalogos,dias,empresa,fotos-del-dia,grupos,mantenimientos,obra}.ts` | `obraId` del mensaje, del grupo o del vehículo | no aplica | Trabajo del sistema, sin sesión |
  | `asistente/servidor/herramientas.ts` `lugaresPropios` | `sesion.obraId` | todas mis obras | Pasa a `sesion.obras`. Con dos obras, el asistente pregunta de cuál son las solicitudes; `lugarDeLaSolicitud` (compras) ya comprueba con `alcanzaLaObraDeLaRuta`, que mira todas |
  | `asistente/servidor/herramientas.ts` (compras, tesorería, finanzas, RR. HH.) | `alcanza(rol, …)`, `alcanzaLaEmpresa` | no aplica | Permisos por rol, no por obra |
  | `asistente/servidor/conversacion.ts` `contexto` | `alcance.obras.length` | todas mis obras | Decía «una sola obra» a quien tuviera cualquier lista; ahora dice «N obras» cuando son varias, para que el modelo pregunte de cuál |
  | `asistente/servidor/preguntar.ts`, `conversaciones.ts` | `alcanceDelAsistente(sesion)` | todas mis obras | Ya cubierto: la sesión lleva `obras` desde la T6 y la regla las usa desde la T4 |
  | `asistente/servidor/uso.ts` | obras consultadas en la respuesta | no aplica | Contabilidad del uso, no alcance |
  | `reportes/servidor/datos.ts` `pedidoDeReporte` | `sesion.obraId` | obra en uso | Se deja: un reporte es de una obra. La descarga por enlace lleva `?obraId=` y la sesión la resuelve como obra en uso si es suya |
  | `reportes/servidor/mantenimientos.ts` `vehiculoDelAlcance` | máquina suelta | todas mis obras | Pasa a `esDeSusObras` |
  | `reportes/servidor/reportes.ts` | `obraId` del pedido ya resuelto | no aplica | Recibe la obra de `pedidoDeReporte` |

- **`rol === 'admin'`:** en estas cuatro carpetas solo queda el de `requerirAdmin`, y significa «es gerencia». El de `alcanzaLaImagen` se revisó en la T7.
- **Sin cambiar, para que Diego decida (viene de la nota de la T4):** los módulos del asistente siguen siendo los de la **obra en uso**. Un Director de Obra con almacén apagado en la obra A y encendido en la B no consulta almacén desde una pestaña de la A, en ninguna de las dos obras. Nunca le da obras ajenas. Arreglarlo exige saber los módulos de cada obra en la sesión y filtrar cada herramienta por obra, que es más que esta revisión.
- **Comprobación manual pendiente** para la demo de la T16, con `prueba-041-director` (obras A y B, la A en uso):
  - armar a mano un día de la B → pasa;
  - pedirle al asistente sus solicitudes sin decir el lugar → pregunta de cuál obra.

### T9 (2026-11-08)

- **Resultado:** `npm run verificar` da 699 verificaciones correctas, sin pruebas nuevas: los dos cambios usan `esDeSusObras`, probado en la T8. `typecheck` y `lint` sin errores.
- **Cambios:**
  - `api/panel/media/[id]` `alcanzaElMensaje`: la foto de un mensaje de WhatsApp es una fila suelta → **todas mis obras**, con `esDeSusObras`. Antes comparaba con la obra en uso, y el Director de Obra no habría abierto la foto de su obra B desde una pestaña de la A.
  - `api/panel/preoperacionales` `motivoVacio`: el aviso «sin obra» mira `obras.length === 0` y no la obra en uso. Un Director de Obra con varias obras y ninguna abierta no es alguien sin obra.
- **Lectores revisados que se quedan como están:**

  | Sitio | Categoría | Por qué |
  |---|---|---|
  | `almacen/materiales` POST, `partes` POST, `cantera/servidor/catalogos.ts` `obraParaRegistrar`, `laboratorio/servidor/ensayos.ts` `obraParaRegistrarEnsayo` | obra en uso | Son escrituras (RF-23). **No se pasan a `obraParaEscribir`**: la guardia comprueba el módulo apagado de la obra **en uso**, y escribir en otra obra pedida en el cuerpo saltaría esa comprobación (almacén, cantera o laboratorio apagados en la B). La pestaña ya manda su obra en la cabecera desde la T12, así que la obra en uso es la que se ve |
  | `personas` POST, `vehiculos` POST | obra en uso | Rechazan otra obra con 403. Las validaciones de obras de personas son de la **T10** |
  | `almacen-obra/servidor/excel.ts`, `cantera/servidor/catalogos.ts` (filtro), `resumen`, `avisosDePolizas`, `filtroDeObraPedida` | obra en uso | Listados y exportaciones de una obra |
  | `contratos/servidor/contrato.ts` `obraDelContrato` | todas mis obras | Ya usaba `alcanzaLaObra`, que mira todas desde la T7 |
  | `personas/[id]/activacion`, `compras`, `tesoreria`, `documentos`, `rrhh` (`alcanzaLaObraDeLaRuta` y `alcanzaLaObra`) | todas mis obras | Ya miran `obras`, porque la sesión las lleva desde la T6 |
  | `bitacoras/servidor/secciones.ts`, `empresas/servidor/empresas.ts` | no aplica | Comparan dos filas, no la sesión |
  | `api/movil/activar` | no aplica | El operador tiene una sola obra |

- **`rol === 'admin'` en todo `src`**, aparición por aparición:

  | Sitio | Qué significa | Estado |
  |---|---|---|
  | `api/panel/personas/[id]` línea 57 | es gerencia | Solo la gerencia modifica a otra gerencia |
  | `servidor/guardia.ts` `requerirAdmin` | es gerencia | La usan cuatro rutas: contraseña de una persona, intervalos de mantenimiento, cambiar los reportes esperados y asociar grupos de WhatsApp. Ninguna es de lo que el RF-6 o el RF-9 le dan al Director de Proyectos |
  | `servidor/alcance.ts` `alcanzaLaImagen` | es gerencia | Imágenes huérfanas (T7) |
  | `rules/compras.ts` `veElGasto`, `rules/ficha.ts` `veElSalario`, `rules/pagos.ts` `veLosPagos` | es gerencia | Administrativo del grupo, que el Director de Proyectos no ve (RF-15, RF-59) |
  | `rules/permisos.ts` `rolVeTodasLasObras` | — | Es la definición de «ve todas» |
  | `rules/cargos-de-obra.ts` línea 90 | — | Regla de la 041: gerencia o Director de Proyectos |
  | `rules/empresas.ts` línea 563 (menú de empresas) | es gerencia | Las tarjetas de las empresas |
  | `panel/pantalla-inicio.tsx` línea 88 | es gerencia | Las tarjetas de las empresas. Pero la línea siguiente arma `destinoAlEntrar` con `obraId` y no con `obras`: **T12** |
  | `panel/pantalla-personas.tsx` línea 106 | es gerencia | La etiqueta «Gerencia» |
  | `panel/whatsapp/pantalla-bandeja.tsx` línea 206 | es gerencia | Asociar grupos, igual que su ruta |
  | `empresas/pantalla-proyectos.tsx` línea 46 | **ve todas** | Pendiente: **T12**, como dice el plan |
  | `empresas/contexto-empresa.ts` línea 45 | **ve todas** | Pendiente: **T12**. Lee la obra de la lista de obras |
  | `contratos/pantalla-contrato.tsx` línea 29 | **ve todas** | Pendiente: **T12**. El selector de obra del contrato le hace falta al Director de Proyectos (RF-10) |
  | `rules/empresas.ts` línea 479 `rutaNueva` | **ve todas** | Pendiente: **T12**. Los enlaces viejos con `?obraId=` llevan al Director de Proyectos a la lista y no a esa obra |
  | `panel/pantalla-personas.tsx` línea 137, `rrhh/vista-de-la-ficha.tsx` líneas 287 y 289 | **da accesos** | Pendiente: **T13**. RF-12 y RF-26: los directores también dan accesos |

  **El «hecho cuando», leído al pie de la letra, no se cumple todavía:** quedan cinco pantallas y una regla de pantalla donde `admin` quiere decir «ve todas» o «da accesos». Todas están fuera de las carpetas de esta tarea y tienen su tarea en el plan. En el servidor y en `api/panel` todas significan «es gerencia».
- **Para la T12:**
  - `api/auth/yo` devuelve `obraId` pero no `obras`. Las pantallas no saben cuáles son las obras de la persona.
  - Por eso **`alcanzaLaObraDeLaRuta` no se vuelve obligatoria** (nota de la T2): sus llamadores de pantalla (`paginas-de-empresa`, `pantalla-maquinaria`, `pantalla-proyectos`, el menú) no tienen todavía `obras`. Se hace en la T12, cuando el panel las reciba.
  - `cantera` y `ensayos` le dicen «Su cuenta no tiene obra asignada» a un Director de Obra con varias obras que manda una petición sin obra en uso. Con la cabecera de la T12 no debería pasar, pero el texto engaña: conviene «Escoja la obra».
- **`obraParaEscribir` (T7) sigue sin llamadores.** Por lo dicho arriba, en esta revisión no hizo falta. Se deja para la T10 y la T11, por si alguna escritura de personas u obras la necesita; si al cerrar la spec sigue sin uso, se quita.

### T10 (2026-11-08)

- **Resultado:** `npm run verificar` da 700 verificaciones correctas, con 1 prueba «041/» nueva (`puedeMarcarRevisado`) y 4 casos más en la de las obras al cambiar de acceso; `typecheck` y `lint` sin errores.
- **Reglas puras (`cargos-de-obra.ts`):**
  - `obrasAlCambiarDeAcceso` cubre ahora el paso de un Director de Obra a **cualquier** acceso de una sola obra, no solo a Residente. Ejemplo: un Director de Obra con dos obras que pasa a Almacenista también escoge cuál conserva. El mensaje dice el acceso («…conserva como Almacenista»).
  - Si el acceso nuevo ve todas las obras (gerencia, Encargado de OCC, Auxiliar Administrativa, Director de Proyectos), se queda sin obras, sin preguntar.
  - El RF-70 solo nombra al Residente, pero guardar dos obras en un acceso de una sola sería quedarse con una al azar.
  - **`puedeMarcarRevisado`** es nueva: Gerencia y Director de Proyectos (RF-51).
- **`auth/servidor/accesos.ts`** gana los ayudantes que usan las rutas:
  - `personaConObras`: la persona con sus obras asignadas y sus obras «como las ve el sistema»;
  - `obrasQueNoExisten`;
  - `sentenciasDeObras`: retirar cierra con `hasta` y quién retiró; asignar abre con quién asignó, `on conflict do nothing`;
  - `sentenciasDeAcceso`: cierra la fila vigente si cambió el rol o el cargo, y abre otra si no queda ninguna;
  - `sentenciaDeRevisado` y `ejecutarLote`.

  Cada ruta manda sus sentencias en **un solo `batch`**: la persona, sus obras y su historia quedan juntas o no queda nada.
- **Contratos (`panel/contratos.ts`):**
  - `personaNueva` y `personaEditada` ganan `obras`; `personaEditada` gana además `obraConservada`.
  - `obrasDelDirector` es nuevo: `{ asignar, retirar }`, sin obras repetidas ni en las dos listas a la vez.
  - `PersonaFila` gana `obras` y `revisar`.
- **`POST /personas`:**
  - El Director de Obra guarda sus obras en `usuarios_obras` y queda con `obra_id` vacío, como lo dejó la migración. Los demás accesos siguen con `obra_id`; una lista de una sola obra se toma como esa.
  - Quien no ve todas registra solo en sus obras: una ajena da **404** (RF-20, RF-26). Antes era un 403 que confirmaba que la obra existía.
  - Si no dice la obra, se usa la que tiene en uso. Sin ninguna, 422 «Escoja la obra.».
  - `motivoParaNoDarRol` pasa de 403 a **422**, como dice el plan.
  - Toda alta abre la primera fila de la historia de accesos.
- **`PATCH /personas/[id]`:**
  - Calcula las obras como quedarían: `obras` para el Director de Obra, `obra_id` para los demás, y `obrasAlCambiarDeAcceso` al cambiar de acceso, con `obraConservada` o con `obraId`.
  - Valida con `reparoDeObrasDelAcceso`, el alcance y que las obras existan, **solo si cambian el acceso o las obras**. Así, corregirle el nombre a un Residente que quedó sin obra con la migración no se bloquea.
  - Escribe la diferencia de obras y la historia de accesos.
  - **Comportamiento nuevo:** la respuesta se vuelve a leer después del lote, porque un `batch` no devuelve el `returning` de cada sentencia de forma cómoda.
- **`personaAlcanzable`:**
  - Mira todas las obras de la persona tocada.
  - Cambia `rol === 'admin'` por la regla general `puedeCambiarRol` (`PUEDE_DAR`). Solo corrige a alguien quien podría darle ese acceso, con 403 y el nombre del acceso. Por eso el Director de Obra no corrige a otro director, ni a sí mismo.
  - El chequeo duplicado que había más abajo en el `PATCH` desapareció.
  - **Comportamiento nuevo:** la baja (`DELETE`) también pasa por `puedeCambiarRol`. Antes solo cuidaba a la gerencia.
- **Rutas nuevas:**
  - `POST /personas/[id]/obras`: asigna y retira por diferencia. Responde 403 al Director de Obra, también sobre sí mismo (RF-28), y 422 si la persona no es Director de Obra o si se le quitaría la última obra (RF-18).
  - `POST /personas/[id]/revisado` (RF-51).
- **`GET /personas`** devuelve `obras` y `revisar`.
  - El Director de Obra no tiene `obra_id`, así que el filtro le pregunta a `usuarios_obras`. Quien no ve todas solo ve a los directores de su obra en uso; con `?obraId=`, salen los de esa obra.
  - Sin esto, un Director de Obra salía como el personal sin obra: en la lista de **todas** las obras (RF-20).
  - El personal sin obra (gerencia, Director de Proyectos) sigue saliendo en la lista de un Residente, como antes la gerencia.
- **`activacion`:** no se tocó. Su guardia pide `personas · activar`, que la tabla de la T1 da a la gerencia y a los dos directores, no al Residente (RF-72); y `alcanzaLaObra` mira todas las obras desde la T7.
- **Error encontrado en el e2e y corregido:**
  - En un `select` de una sola tabla, drizzle escribe las columnas **sin su tabla**. Dentro de la subconsulta de `personaConObras`, `${usuarios.id}` salía como `"id"`, Postgres lo resolvía al `id` de `usuarios_obras` y la lista quedaba vacía, sin ningún error.
  - Se escribió con nombres explícitos (`"usuarios"."id"`), con un comentario.
  - El listado no tenía el problema porque lleva un `join`.
  - **Para la T16:** conviene revisar el `json_agg` de `sesion.ts` (T6), que es parecido, aunque su e2e de la T6 dio bien.
- **E2E en desarrollo** (`npx expo start --web --port 8082`, sesiones abiertas a mano, script temporal ya borrado). 22 comprobaciones, todas en verde:
  - el Director de Proyectos crea un Director de Obra con dos obras → **201**;
  - el Director de Proyectos crea otro Director de Proyectos → 422 «Solo la gerencia puede dar el acceso de Director de Proyectos.»;
  - un Director de Obra sin obras → 422;
  - el Director de Obra, con la A en uso, crea un Residente en su obra B → **201**;
  - el Director de Obra crea otro Director de Obra → **422**, «Solo la gerencia o el director de proyectos pueden dar el acceso de Director de Obra.»;
  - el Director de Obra se asigna una obra → **403**;
  - el Director de Obra registra en una obra ajena → 404;
  - el Residente crea un operador, que queda en su obra → **201**;
  - el Residente crea un almacenista → **422**;
  - el listado del Residente incluye al Director de su obra;
  - el Director de Proyectos le retira la A → 200 con `[B]`;
  - retirarle la última → 422;
  - devolverle la A → 200 con `[A, B]`;
  - la Gerencia lo baja a Residente sin escoger → **422** «Escoja cuál de sus obras conserva como Residente.»;
  - la Gerencia lo baja escogiendo la B → **200**, con `obra_id` = B, sus filas de obras cerradas y la historia de accesos `director_obra` (cerrada) → `residente` (vigente);
  - marcar revisado: el Director de Proyectos → 200, el Residente → 403.
  - **Limpieza:** las 4 personas `prueba-041-t10-*` se borraron con sus sesiones y sus filas de historia; quedan 0. De la sesión de gerencia que usó el script se borró **solo esa** (por el hash de su cookie), no las demás de esa cuenta.
  - Los datos `PRUEBA-041` de la T5 y la T6 siguen para la T16.
- **Para la T13:** el formulario ya tiene contra qué trabajar:
  - `obras` (varias, Director de Obra);
  - `obraConservada` (al bajar de acceso);
  - `PersonaFila.obras` y `revisar` para la lista;
  - las dos rutas nuevas.
- **Fuera de la tarea:**
  - Las altas de personas desde WhatsApp (`whatsapp/servidor/personas.ts`) no abren fila en la historia de accesos. `accesoEnFecha` devuelve `null` para esas personas, y la primera vez que se les cambie el acceso o el cargo desde el panel, `sentenciasDeAcceso` les abre la fila. Son operadores, que no aprueban ni anulan, así que no afecta a las historias de la T14.
  - Lo mismo con `npm run crear-admin`.

### T11 (2026-11-08)

- **Resultado:** `npm run verificar` da 700 verificaciones correctas, sin pruebas nuevas: que el Director de Proyectos escriba en obras y el Director de Obra no ya lo comprueba la prueba «041/RF-57» de la tabla completa (T1). `typecheck` y `lint` sin errores.
- **RF-7 y RF-8 ya funcionaban desde la T1:** `POST /obras`, `PATCH` y `DELETE /obras/[id]` piden `obras · escribir`, y la tabla se lo da al Director de Proyectos. En esas rutas solo cambiaron los comentarios, que decían «es de gerencia».
- **`GET /obras` gana `directoresDeObra`** (RF-44): el conteo de filas vigentes de `usuarios_obras`.
  - Solo cuenta a quien sigue siendo Director de Obra, activo y no dado de baja. Una fila que quedara abierta a alguien que ya no es director no cuenta.
  - Los nombres van escritos con su tabla, por el problema de drizzle que encontró la T10.
  - `POST /obras` responde con `directoresDeObra: 0`.
  - `ObraFila` gana `directoresDeObra?`.
- **RF-43 no necesita código:** sin Director de Obra, lo pendiente de aprobar ya lo pueden el Director de Proyectos y la Gerencia, que aprueban en todas las obras por la tabla. El aviso en la tarjeta es de la **T12**.
- **E2E en desarrollo** (servidor en el 8082, script temporal ya borrado), 7 comprobaciones, todas en verde:
  - el Director de Proyectos crea la obra `PRUEBA-041-T11` → **201** con `directoresDeObra: 0`;
  - en la lista sale con **0**;
  - la obra A sale con al menos un director, el `prueba-041-director` de la T5;
  - el Director de Proyectos la edita → 200;
  - el Director de Obra intenta crear una obra → 403;
  - limpieza: la obra y el Director de Proyectos de prueba, borrados, junto con las sesiones del script; quedan 0.
- **Para que Diego confirme:** por la tabla, el Director de Proyectos también puede **dar de baja** una obra (es `obras · escribir`, como crearla). La spec solo dice registrar (RF-7) y editar (RF-8). Si la baja debe quedar solo para la Gerencia, es un cambio pequeño en `obras/[id]` y entra por `/sdd:cambio`.
- **Para la T12:** el Director de Obra **no** puede listar `GET /obras` (`obras: NADA` en la tabla). El selector «Obra en uso» tiene que sacar los nombres de sus obras de la sesión (`/api/auth/yo`), no de esta ruta.

### T12 (2026-11-08)

- **Resultado:**
  - `npm run verificar` da 702 verificaciones correctas, con 2 pruebas «041/» nuevas: «Cambiar de obra» y los enlaces de antes.
  - `typecheck` y `lint` sin errores.
  - `npx expo export --platform web` termina en «Exported: dist», y `grep DATABASE_URL dist/client` sale vacío; `dist` se borró.
- **Reglas (`rules/empresas.ts`):**
  - **`menuDelLugar`:**
    - «Cambiar de obra» sale para la gerencia, el Director de Proyectos y quien tiene más de una obra; «← Empresas» sigue siendo solo de la gerencia.
    - El enlace lleva a la lista con la página de ahora (`?ir=bitacoras`), para abrir la misma página en la otra obra (RF-67).
    - **Esto también cambia la gerencia**, que antes iba a la lista sin página. Se ajustó la prueba de la 033 que lo decía, con comentario.
  - **`rutaNueva` (enlaces de antes):**
    - el Director de Proyectos va a la obra del enlace, o a la lista con la página;
    - el Director de Obra, a la del enlace si es suya, a su única obra, o a la lista;
    - una obra ajena se ignora.
  - **`alcanzaLaObraDeLaRuta` sigue con `obras` opcional**, aunque la nota de la T2 proponía hacerlo obligatorio:
    - obligaría a tocar 63 llamadas de las pruebas y `alcanzaLaPersona` (`rules/ficha.ts`);
    - el panel y el servidor ya le pasan `obras`.
- **Servidor:**
  - `PersonaEnSesion` gana `obrasConNombre` (id, nombre y módulos de cada obra), de la misma consulta que ya traía `obras`.
  - `/api/auth/yo` devuelve `obras` y `obrasConNombre`.
- **Panel:**
  - **`cliente-api.ts`:**
    - Manda `x-obra-en-uso` con la obra de la dirección de la pestaña (`cabeceraDeObraEnUso`), sin guardar ningún estado.
    - Va en `pedir`, en las descargas, en el asistente y en la subida de fotos (`subir-foto.tsx`). Una foto subida desde la pestaña de la obra B queda en la B.
  - **`obra-en-uso.ts`** (nuevo):
    - `useObraEnUso` aplica en el navegador la misma regla `obraEnUso` que el servidor, con la dirección y las obras de la sesión.
    - No se le pregunta al servidor, porque la respuesta tiene que ser la de esta pestaña.
  - **`marco.tsx`:**
    - el aviso de módulo apagado mira la obra en uso de la pestaña;
    - el de «sin obra» mira si tiene alguna obra, no si tiene una abierta.
  - **`contexto-empresa.ts` `useObraDelLugar`:**
    - quien ve todas (`rolVeTodasLasObras`, ya no `rol === 'admin'`) lee la lista de obras;
    - los demás, sus `obrasConNombre`.
    - Con eso, el nombre de la obra en el menú y sus módulos son los de la obra abierta (RF-22).
  - **`pantalla-proyectos.tsx`:**
    - quien ve todas, la lista de obras;
    - el Director de Obra con varias, la lista de **sus** obras, sacada de la sesión, porque no puede pedir `GET /obras` (RF-24);
    - con una sola, la suya;
    - a quien escribe obras (gerencia, Director de Proyectos), una columna «Director de Obra» con la etiqueta «Sin Director de Obra» (tono de atención, con texto) cuando son 0 (RF-44).
  - **`pantalla-inicio.tsx`:** `destinoAlEntrar` recibe `persona.obras` (RF-24, RF-25).
  - **`pantalla-contrato.tsx`:**
    - El selector de obra y la lista salen de `rolVeTodasLasObras`, para que el Director de Proyectos escoja la obra (RF-10).
    - **Los botones de aprobar siguen con `esGerencia` (`rol === 'admin'`): eso es de la T15.**
- **Demo en Chrome** (servidor en el 8082, `prueba-041-director` con las obras A «Consorcio Antioquia» y B «Pruebas spec 018 (laboratorio)»). Diego autorizó cerrar su sesión de gerencia en el panel de desarrollo para hacerla.
  1. Entra y ve **«Sus obras»** con las dos.
  2. Abre la A: el menú dice «Consorcio Antioquia», con «Cambiar de obra».
  3. En Bitácoras abre el parte del día, que queda en la A, y registra la actividad «PRUEBA-041 T12 obra A».
  4. Se abre una **segunda pestaña** en la bitácora de la A.
  5. En la primera, «Cambiar de obra» lleva a `/panel/proyectos?ir=bitacoras`; al escoger la B abre **Bitácoras de la B**.
     - El menú pasa a «Pruebas spec 018 (laboratorio)» y aparece «Calidad», porque la B lleva laboratorio y la A no.
     - El catálogo de actividades es el de la B.
  6. Abre el parte de la B y registra «PRUEBA-041 T12 obra B».
  7. En la segunda pestaña, que sigue en la A, registra «PRUEBA-041 T12 pestana 2 obra A».
  8. **Comprobado en la base:**
     - el parte de la A tiene las dos actividades de la A;
     - el de la B, solo la de la B;
     - los dos los lleva `prueba-041-director`.
  9. Se cerró la sesión de prueba y las dos pestañas. **Diego tiene que volver a entrar al panel de desarrollo con su usuario.**
- **Datos de prueba nuevos para la limpieza de la T16:**
  - los partes del 2026-11-08 `01a1ba31-c5ea-7f9c-9cea-e7bbc2052909` (obra A) y `01a1ba33-bcd2-7552-add0-00cd311cafc2` (obra B), abiertos por `prueba-041-director`;
  - la credencial web de `prueba-041-director`, con contraseña de prueba y `debe_cambiar = false`.
- **Para la T13:** `pantalla-personas.tsx` todavía inicia el formulario con `persona.obraId` (línea ~647). Con un Director de Obra que tiene varias obras, ese valor es `null`.
- **Notado, fuera de la tarea:** la extensión de Chrome a veces deja una pestaña nueva en `chrome://newtab` en la primera navegación; la segunda funciona. No es del panel.

### T13 (2026-11-08)

- **Resultado:** `npm run verificar` da 703 verificaciones correctas, con 1 prueba «041/» nueva (`campoDeObras`), escrita antes que la regla y vista fallar; `typecheck` y `lint` sin errores.
- **Regla nueva, `campoDeObras`** (`rules/cargos-de-obra.ts`): dice qué campo de obras lleva el formulario (`varias`, `conservada`, `una-obligatoria`, `una`, `ninguna`). La gerencia conserva su selector de siempre, salvo cuando viene de Director de Obra.
- **Componente nuevo, `SelectorDeVarios`** (`panel/componentes.tsx`): casillas a la vista, para las obras del Director de Obra.
- **Pestaña «Accesos» en Recursos Humanos de la obra** (`PantallaRecursosHumanosDeObra`). Es la decisión que dejó pendiente la nota de la T1: el Residente y los dos directores no entran a Elemental, así que sin ella no tenían dónde dar accesos.
- **`pantalla-personas.tsx`:**
  - Las opciones de obra salen de `GET /obras` para quien la puede listar y de `obrasConNombre` para los demás; sin esto, el Residente y el Director de Obra veían un error al abrir la pantalla.
  - La columna Obra nombra las varias obras del Director de Obra; las que quien mira no conoce se cuentan sin nombrarlas.
  - Quien revisa (gerencia, Director de Proyectos) carga a todas las personas también dentro de una obra, y la pantalla recorta. Si no, quien quedó sin obra nunca saldría en la lista del RF-51.
  - **Cambio de comportamiento, porque ahora esos roles ven esta pantalla:** «Códigos» solo sale con `personas · activar` (RF-72, el Residente no los emite), y «Dar de baja» solo sobre quien se podría registrar. Antes salían y el servidor los rechazaba.
- **Demo en Chrome** (servidor en el 8082, entrando por `127.0.0.1` para no tocar la sesión de `localhost`):
  - Director de Proyectos: las opciones de Acceso son las seis del RF-12. Registrar un Director de Obra sin obras da «El Director de Obra necesita al menos una obra: escoja una.»; con dos obras queda registrado y la columna las nombra.
  - Bajarlo a Residente sin escoger da «Escoja cuál de sus obras conserva como Residente.»; el selector ofrece solo sus dos obras, y al escoger queda en esa.
  - Volverlo a subir a Director de Obra propone la obra que tenía (RF-71).
  - Director de Obra sin obras: al cambiarle el acceso sale el aviso de asignarle una antes.
  - Aviso «N personas pasaron a Residente», filtro con 2 registros (incluye a quien no tiene obra), botón «Revisado» que deja 1 y baja el aviso.
  - Gerencia en Elemental: Residente sin obra da «El Residente necesita su obra: escoja una.»; con Director de Proyectos desaparece el campo de obra.
  - Director de Obra: abre la pantalla sin error, le salen los cinco accesos del RF-26, no ve aviso ni «Revisado», y no tiene botones sobre otro director.
- **Cómo se midieron los anchos:** `resize_window` no cambió la ventana (se queda en 1536 px), así que se cargó el panel en un marco de ese ancho.
  - **1366 px:** sin desplazamiento de la página; el borde derecho del último botón queda en 1227. Los pasos de arriba se hicieron a 1536.
  - **390 px:** sin desplazamiento de la página. Se hizo el formulario con Director de Obra y la ventana de Corregir hasta guardar. La tabla se desplaza de lado dentro de su marco, como las demás del panel a ese ancho.
- **Para que Diego decida — contraseñas:** «Dar acceso» (generar la contraseña) sigue siendo solo de la gerencia (`requerirAdmin`), y la spec no dice nada. Un Director registra a un Residente, pero ese Residente no puede entrar hasta que la gerencia le genere la contraseña. La nota de la T9 lo dejó para esta tarea como «da accesos», pero abrirlo es cambiar quién reparte contraseñas: va por `/sdd:cambio` si se quiere.
- **Hueco encontrado, sin corregir:** `obrasAlCambiarDeAcceso` no deja bajar a un Director de Obra **sin obras** («Escoja cuál…», sin nada que escoger). La salida es asignarle una, guardar y cambiarle el acceso; la pantalla lo dice.
- **No se probó en Chrome con un Residente:** su camino es el mismo del Director de Obra (obras de la sesión).
- **Datos de prueba nuevos para la limpieza de la T16**, todos en desarrollo y con su credencial web:
  - `prueba-041-proyectos`, id `01a1bc8e-fa8f-709a-8d1a-1f0e686d7c58` (Director de Proyectos, contraseña de prueba `Prueba041-T13`);
  - `prueba-041-gerencia`, id `01a1bc92-72c8-74d9-a340-4ca4900d07fb` (Gerencia, misma contraseña);
  - `prueba-041-t13-do` (Director de Obra, obra A; buscar por usuario), con sus filas de `usuarios_obras` y `usuarios_accesos`.
  - A `prueba-041-topografo` se le apagó `revisar` en la demo. Las sesiones de las tres pruebas se cerraron desde el botón del panel.

### T14 (2026-11-08)

- **Resultado:** `npm run verificar` da 704 verificaciones correctas, con 1 prueba «041/» nueva (`etiquetaDelAccesoEn` y `firmaConAcceso`), escrita antes que la regla y vista fallar; `typecheck` y `lint` sin errores.
- **Cambio respecto al plan:** `accesoEnFecha` se reemplazó por **`firmasConAcceso`** (`auth/servidor/accesos.ts`). `accesoEnFecha` preguntaba a la base por cada fila, y aquí hay listados enteros. La nueva pide de una vez a todas las personas de un listado y resuelve en memoria con la regla pura. Nadie más llamaba a `accesoEnFecha`.
- **El servidor arma el texto** «Nombre (acceso de esa fecha)» y lo entrega en el campo del nombre que ya existía. Sin historia para esa persona, sale solo el nombre.
- **Cada historia de la tarea:**

  | Historia | Qué se hizo |
  |---|---|
  | Parte | No decía quién anuló. `GET /partes` trae `anuladoPorNombre` y el aviso dice «Anulado por X (acceso): motivo» |
  | Almacén | `historialDelMaterial` |
  | Cantera | `leerViajes`. El asistente, que lee esa misma función, también lo recibe |
  | Preoperacionales | `GET /preoperacionales/:id` |
  | Contrato | Los eventos (`quien`) y la anulación de documentos |
  | Laboratorio | **No se tocó:** su historia ya guarda nombre y cargo de ese momento (018/RF-94), que es un dato escrito ese día y no calculado después |

- **Demo en Chrome** (8082, por `127.0.0.1`, con `prueba-041-director`):
  - Obra B: «Anulado por Tatiana Carreño (Residente / Director): PRUEBA-041 T14 anulado antes del cambio».
  - Obra A, anulada hoy con la ruta real (200): «Anulado por PRUEBA-041 Director (Director de Obra): PRUEBA-041 T14 anulado hoy por el Director de Obra».
  - La respuesta no expone el id de quien anuló.
- **Con las funciones reales y los datos de desarrollo** (script temporal de solo lectura, ya borrado): almacén «Diego (Gerencia)»; cantera «Natalia Riaño (Residente / Director)» y «Diego (Gerencia)».
- **Sin ejercitar con datos:** preoperacionales y contrato, porque en desarrollo no hay ninguno anulado ni eventos de contrato. Los cubren el tipado y la misma función.
- **Fuera de la lista de la tarea, se quedan con el nombre solo:** el Excel de almacén (`almacen-obra/servidor/excel.ts`), mantenimientos, compras, tesorería, cortes financieros, documentos del grupo y la tabla antigua `bitacoras`, cuya vista no dice quién anuló. Si se quiere uniformar, es añadir `firmasConAcceso` en cada una.
- **Datos de prueba para la limpieza de la T16:** los partes `01a1ba31-…` (A) y `01a1ba33-…` (B) quedaron anulados. El de la B se marcó a mano con `anulado_por` de `residente1` y fecha 2026-10-20: **ese `anulado_por` no es un hecho real**, y se borra con el parte.

### T15 (2026-11-08)

- **Resultado:** `npm run verificar` da 705 verificaciones correctas, con 1 prueba «041/» nueva, escrita antes que el cambio y vista fallar; `typecheck` y `lint` sin errores. La prueba 030/RF-1 afirmaba que nadie tenía `anular` en reportes y se actualizó citando RF-33 y RF-35, igual que la tabla completa de la 041/RF-57.
- **Revisión pantalla por pantalla:**

  | Pantalla | De dónde salía el botón | Qué se hizo |
  |---|---|---|
  | Parte, almacén, cantera, preoperacionales, documentos, RR. HH., finanzas | `alcanza(…, 'anular')` | Bien; no se tocó |
  | Laboratorio | `alcanza` por paso (`acciones-ensayo.tsx`) | Bien; solo se corrigieron dos textos |
  | WhatsApp | `alcanza(rol, 'whatsapp', 'aprobar')` | Bien (RF-37) |
  | Compras y tesorería | `pasos` que calcula el servidor | Bien |
  | Contrato y presupuesto | `rol === 'admin'` | **Pasa a `alcanza(rol, 'contrato', 'aprobar')`**: ahora los ve el Director de Proyectos (RF-58, RF-10) |
  | Pólizas y documentos del contrato | Sin condición, y la ruta pedía `escribir` | **Ver abajo** |
  | Mantenimientos (Reportes) | Sin condición, y la ruta pedía `escribir` | **Ver abajo** |

- **Hueco real encontrado:** anular una póliza, un documento del contrato o un mantenimiento iba con `escribir`, así que el **Residente podía anularlos**, contra RF-33, RF-35 y RF-36.
  - La tabla gana `anular` en `contrato` (gerencia y los dos directores) y en `reportes` (ellos y el Encargado de OCC, RF-62).
  - Las tres rutas piden `anular`, y los botones salen de `alcanza`.
- **Textos:** contrato y presupuesto nombran al Director de Proyectos y la Gerencia; «Pídale a la gerencia que le asigne su obra» nombra también al Director de Proyectos (5 sitios); el laboratorio ya no le dice al Residente «usted aprueba». `grep "Residente / Director"` sobre `.tsx` da 0; solo queda en `etiquetaDeAccesoHistorico`, para las historias de antes.
- **Demo en Chrome** con `prueba-041-residente` en la obra B, y `prueba-041-director` de contraste:

  | Comprobación | Residente | Director de Obra |
  |---|---|---|
  | Bitácora cerrada, «Anular esta bitácora» | No | Sí |
  | Bitácora abierta, «Cerrar la bitácora» | Sí | — |
  | Ensayo aprobado, «Anular» | No | Sí |
  | Mantenimientos, «Anular» | 0 botones | 4 botones |
  | Bandeja de WhatsApp, reporte pendiente, «Aprobar» | Sí (no se pulsó) | — |

  Llamando las rutas directamente con la sesión del Residente, las de póliza, documento y mantenimiento responden **403** con «El Residente no anula: pídaselo al Director de Obra, el Director de Proyectos o la Gerencia.».
- **Sin ejercitar con datos:** en desarrollo no hay contratos, ni presupuestos en borrador, ni pólizas, ni ensayos en estado «enviado». Por eso no se vio «Aprobar contrato», «Aprobar presupuesto» ni el «Aprobar» de un ensayo. Los cubren la tabla probada y el mismo `alcanza`. Conviene verlos en la demo de la T16.
- **Sigue con `rol === 'admin'`, pendiente de Diego:** «Dar acceso» (contraseña) en Personas y en la ficha de RR. HH.; la ruta lo exige (ver la nota de la T13).
- **Anotado, fuera de la tarea:** en `whatsapp/reportes-esperados.tsx`, `cambiaLaLista` sale de `alcanza(rol, 'obras', 'listar')`, pero su ruta usa `requerirAdmin`. Al Director de Proyectos le aparecería el control y recibiría un 403. Lo mismo el Encargado de OCC y la Auxiliar si entran ahí.
- **Dato de prueba nuevo para la T16:** `prueba-041-residente`, id `01a1bcba-5654-75cf-97ba-4daafacc4a9e`, obra B, con su credencial (`Prueba041-T15`) y su fila de `usuarios_accesos`.

### T17, T18, T19 y T16 (2026-11-08)

- **Resultado final:** `npm run verificar` da 707 verificaciones correctas; `typecheck` y `lint` sin errores; `npx expo export --platform web` termina y `grep DATABASE_URL dist/client` da 0. El detalle y el recorrido RF por RF están en `validacion.md`.
- **T17:** `alcanceDelAsistente` da al Director de Obra solo su obra en uso, y `soloObraEnUso` marca al que tiene varias. `obrasAlcanzadasEnTexto` (regla pura) es lo que se le dice al modelo. `lugaresPropios` se limita a la obra en uso, y `lugarPedido` rechaza otra obra aunque `lugarDeLaSolicitud` la acepte.
  - Con una sola obra no hay marca: no hay a cuál cambiar y la prueba de la 028 sigue igual.
  - **Consecuencia:** una conversación que consultó la obra A, abierta desde la B, se muestra solo con título y fecha (028/RF-49). Se ve entera al volver a la A.
- **T18:** `puedeGenerarClave` para los botones; la ruta usa `personas · activar`, el alcance por obra y `motivoParaNoDarRol`. La contraseña y la fila de `claves_generadas` van en un solo lote. Migración `0041_green_magdalene` aplicada **solo en desarrollo**. El panel todavía no muestra esa historia: la spec solo pide guardarla.
- **T19:** `motivoParaNoDarDeBajaObra`, con 403 en la ruta y sin botón.
- **`conversacion.ts`:** el arreglo del historial con adjuntos es de Diego y se conserva (lo confirmó el 2026-11-08). La T17 toca otras líneas del archivo.

### Decisión de Diego sobre el asistente (2026-11-08) — resuelta en la T17

Responde a la nota de la T4 y de la T8 sobre los módulos del asistente:

- **Gerencia:** todos los módulos de las empresas y de los proyectos. Ya es así.
- **Director de Proyectos:** información de cada una de las obras. Ya es así (`obras: 'todas'`).
- **Director de Obra:** el asistente responde **solo sobre la obra en uso**, con los módulos que esa obra tenga encendidos. Si esa obra tiene apagados almacén, cantera y laboratorio, no responde de eso, y **tampoco se le puede pedir información de su otra obra** desde ahí.

Esto acota lo que la T4 y la T8 dejaron. Hoy el alcance del Director de Obra lleva todas sus obras (`alcanceDelAsistente`, `lugaresPropios`) y el texto del contexto dice «N obras». Hay que pasarlo por `/sdd:cambio` (RF-54 dice «las obras que tiene asignadas») y después ajustar:

- `alcanceDelAsistente`: obras = `[obraId en uso]`;
- `lugaresPropios`;
- el texto de `contexto`;
- las pruebas «041/» de la T4.

