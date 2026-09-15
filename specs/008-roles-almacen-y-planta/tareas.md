# Tareas — Spec 008

Tareas de menos de 30 minutos, ordenadas por dependencia. Cada una lleva los RF que
cubre y una línea `Hecho cuando:` que se pueda comprobar sin interpretar.

**Se implementa una tarea cada vez** (`/sdd:implementar T1`), y al terminarla se para.
Ninguna tarea se marca sin `npm run verificar`, `npm run typecheck` y `npm run lint`
en verde.

## Reglas y catálogo

- [x] T1. `permisos.ts`: roles `almacenista` y `encargado_planta`, módulos `almacen` y
      `cantera`, sus filas en la tabla, `puedeCambiarRol` explícito, `moduloDeEntrada` y
      `avisoDeModuloAjeno`, con sus casos. (RF-1 a RF-3, RF-7, RF-8, RF-11 a RF-13, RF-17)
      Hecho cuando: en verde que cada rol nuevo ve solo su módulo, que el residente consulta los
      dos sin escribir, que la gerencia escribe en los dos, que solo la gerencia da los roles
      nuevos, el módulo de entrada de cada rol y el texto del aviso.
      *Mientras no estén T4 y T5, el typecheck fallará en los `Record<Rol, …>` y
      `Record<Modulo, …>` del panel: T1 incluye completarlos con lo mínimo para compilar.*

- [x] T2. Cargos `almacenista` y `encargado_planta` en `shared/catalogos/cargos.ts`, con sus
      casos. (RF-10, RF-14 a RF-16)
      Hecho cuando: en verde que sugieren su acceso, que no llevan máquina y que la lista tiene
      diecisiete cargos con slug y rótulo únicos.

## Datos

- [x] T3. `rol_usuario` con los dos valores (migración del servidor, aplicada en Neon), `enum`
      local actualizado y tipos de rol unificados en `Rol`. (RF-1, RF-18, RF-19)
      Hecho cuando: `db:generate:servidor` deja el `ALTER TYPE` en `drizzle/servidor/`,
      `db:migrar:servidor` lo aplica, una consulta a Neon lista los cinco valores del tipo,
      `db:generate` no produce migración local y los tres comandos están en verde.

## Servidor

- [x] T4. Alta y edición de personas con `puedeCambiarRol` para los roles nuevos; comprobar que
      la activación los rechaza. (RF-10, RF-17)
      Hecho cuando: el alta y el `PATCH` usan `puedeCambiarRol` y responden 403 con «Solo la
      gerencia puede dar ese acceso.»; revisados los usos de `rol === 'supervisor'` que querían
      decir «no es gerencia».

## Panel

- [x] T5. Enlaces, rutas y pantallas provisionales de Almacén y Control Cantera, con el aviso de
      cuenta sin obra. (RF-2, RF-3, RF-6, RF-11, RF-12)
      Hecho cuando: en Chrome, con la sesión de gerencia, la barra muestra «Almacén» y «Control
      Cantera», las dos rutas abren su pantalla provisional y `npx expo export --platform web`
      termina sin error.

- [x] T6. Destino al entrar y aviso de módulo ajeno. (RF-4, RF-7)
      Hecho cuando: `pantalla-inicio` manda a `moduloDeEntrada(rol)` a quien no ve el inicio, y
      `MarcoPantalla` pinta `avisoDeModuloAjeno`. Se comprueba en T8 con las cuentas nuevas.

- [x] T7. `AGENTS.md` y comentarios que decían que el rol no se amplía. (—)
      Hecho cuando: `grep -rn "no se amplía"` en `AGENTS.md` y `src/` solo encuentra el nuevo
      texto que explica por qué se amplió.

- [ ] T8. Validación final: recorrido RF por RF de la spec y demo en Chrome. (Todos)
      Hecho cuando: cada RF tiene su comprobación con resultado, los tres comandos están en
      verde y la spec queda marcada como Cumplida.
      *La demo registra personas en la base real y nada se borra: pedir permiso y nombres antes.*

## Notas de ejecución

- **T1 no podía quedar en verde sola, como ya avisaba su nota.** Al ampliar `ROLES` y `MODULOS`
  dejaban de compilar el `pgEnum` del servidor, los tipos de rol escritos a mano (sesión web,
  guardia del celular, servicio de ingreso del celular), `ETIQUETA_ROL` y el menú, que exige
  una ruta tipada por módulo. Así que **T3 se hizo entera dentro de T1**, y de **T5 se adelantaron
  las dos rutas y sus pantallas provisionales**. A T5 le queda el aviso de cuenta sin obra, la
  comprobación en Chrome y el `expo export`.
- **T1**: `PUEDE_DAR` sustituye al `RANGO` numérico. `moduloDeEntrada` y
  `avisoDeModuloAjeno` (con `NOMBRE_DE_MODULO`) quedan en `permisos.ts`, con nueve casos nuevos.
  Se ajustó el caso anterior de los módulos del residente, que ahora incluye Almacén y Control
  Cantera (008/RF-12).
- **T3**: los dos esquemas toman la lista de `ROLES` de `permisos.ts` con ruta relativa, que es
  lo que acepta drizzle-kit. Migración `0009_broad_black_bird.sql`: dos `ALTER TYPE … ADD VALUE`.
  Aplicada en Neon el 2026-09-15; consultado `pg_enum`: admin, supervisor, operador, almacenista,
  encargado_planta. Las personas existentes siguen con su rol (1 admin, 1 supervisor, 1
  operador). `npm run db:generate` del celular: «No schema changes», como preveía el plan.
  Tipos de rol unificados en `Rol` en `auth/servidor/sesion.ts`, `auth/servicio.ts` y
  `servidor/guardia-movil.ts` (este último no estaba en el plan).
- **T2**: cargos `almacenista` («Almacenista») y `encargado_planta` («Encargado de Planta»),
  con su acceso sugerido y sin máquina; casos nuevos para los dos, y el conteo pasa de 15 a 17.
  El formulario de Personas no se tocó: ya propone el acceso con `rolSugerido` y valida el cargo
  con `IDS_CARGO`, así que los dos cargos aparecen solos. Se ve en T8.
- **T4**: el rechazo sale de `motivoParaNoDarRol` (en `permisos.ts`, con su caso), que lo usan el
  alta y la corrección: «Solo la gerencia puede dar el acceso de Almacenista.». El texto difiere del
  del plan («…dar ese acceso.») porque nombra el acceso; los dos mensajes viejos de estas rutas se
  unifican en este. Para nombrarlo, `ETIQUETA_ROL` pasó de `contratos.ts` a `permisos.ts` y
  `contratos.ts` la reexporta.
- **Activación (RF-10)**: sin cambios. La ruta ya rechaza a quien no tiene rol `operador` con
  «Los códigos de activación son para operadores…», y además por cargo sin máquina.
- **Usos de rol revisados**: la columna «Acceso» de Personas preguntaba solo por `supervisor` y
  habría mostrado «Sin acceso» a un almacenista; ahora todo el que no es operador sale como «Panel».
  El aviso de sin obra de Preoperacionales usa `veTodasLasObras` en vez de `rol === supervisor`.
  No queda ninguna comparación con `supervisor` en `src/`.
- **Sin probar contra el servidor real**: el rechazo solo se da a quien escribe en Personas sin ser
  gerencia, y hoy nadie más escribe ahí; está cubierto por la regla y su caso. Hay que reiniciar
  `npm run web` antes de T8, porque cambiaron rutas `+api.ts`.
- **T5**: `sinObraAsignada(rol, obraId)` en `permisos.ts`, con su caso, y `MarcoPantalla` recibe
  `exigeObra`: a quien no es gerencia y no tiene obra le dice que pida la suya, en vez de una
  pantalla vacía. Las dos pantallas provisionales lo usan. En el mismo cambio del marco quedó
  pintado `avisoDeModuloAjeno`, **que es la mitad de T6**: a T6 le queda la redirección desde Inicio.
- **Regresión encontrada en Chrome y arreglada en T5 (no estaba en el plan):** con nueve módulos la
  barra de la gerencia ya no cabía en un renglón en una ventana de 1536 px (916 px de enlaces más
  los dos lados). `flexWrap` bajaba la cuenta y los enlaces quedaban corridos, justo lo que prohíbe
  la spec 006 (RF-2, RF-3). El corte por ancho fijo (`AnchoMinimoBarraCentrada`) se conserva, pero
  la barra además **mide** la marca, la cuenta y cada enlace y pasa a dos renglones cuando no cabe.
  La decisión es la regla pura nueva `src/shared/rules/barra.ts` (`barraCabeEnUnRenglon`), con su
  caso. *Se escribió antes que su caso*, al revés de lo acostumbrado.
- **Defecto anterior de los dos renglones, arreglado de paso:** los enlaces iban antes que la
  cuenta en el árbol, así que en dos renglones la cuenta caía a un **tercero**, debajo de los
  enlaces; pasaba igual en ventana estrecha desde la 006. Ahora, en dos renglones, los enlaces se
  pintan después de la cuenta, y el orden del tabulador coincide con el que se ve.
- **Comprobado en Chrome** (sesión de gerencia, ventana de 1536 px): la barra muestra «Almacén» y
  «Control Cantera»; `/panel/almacen` y `/panel/cantera` abren su pantalla provisional; marca y
  cuenta en el renglón de arriba (los dos a 15 px), enlaces en uno solo debajo, con su centro a
  768 px, el mismo que el de la ventana. `npx expo export --platform web` terminó sin error y
  `grep DATABASE_URL dist/client` salió vacío. **No comprobado:** la barra en un renglón con los
  cuatro módulos del residente (no hay sesión de residente a mano); lo cubre el caso de la regla y
  se ve en T8.
- **T6**: `pantalla-inicio` manda con `<Redirect>` a `moduloDeEntrada(rol)` a quien no tiene
  «inicio». El corte va en el componente de la ruta, antes de la portada, para que quien se va no
  llegue a pedir el resumen (el servidor se lo negaría con 403 y se vería un error un instante).
  El ingreso se pinta sobre la misma dirección, así que tras entrar por `/panel` pasa por aquí.
  Para sacar la ruta de cada módulo, la tabla de enlaces salió de `barra-navegacion.tsx` a
  `src/features/panel/modulos.ts` (`ENLACES_DE_MODULO`, `RutaDeModulo`), que usan la barra y la
  portada: una sola lista de direcciones. `avisoDeModuloAjeno` en el marco ya estaba desde T5.
  **Comprobado en Chrome** con gerencia: `/panel` sigue en su portada («Cómo va la operación»)
  con los nueve enlaces. **No comprobado:** la redirección del almacenista y del encargado de
  planta, que necesita sus cuentas; se ve en T8.
- **T7**: en `AGENTS.md` la sección «Roles» lista los cinco valores y explica cuándo se amplía el
  enum y cuándo basta un cargo; la descripción del dashboard nombra a los dos públicos nuevos.
  Comentarios corregidos en `esquema.ts` (columna `cargo`, solo comentario: no hay migración) y
  en `pantalla-personas.tsx` (quién entra con contraseña y la frase de los tres valores).
  `grep -rn "no se amplía" AGENTS.md src` ya no encuentra nada: el texto nuevo lo dice con otras
  palabras.
- **T8, primera pasada (2026-09-15) — sin cerrar.** Tres comandos en verde (147 verificaciones).
  Personas de prueba registradas desde gerencia en Chrome, en «Consorcio Antioquia»:
  `prueba.almacen` («Prueba Almacenista», cargo y acceso Almacenista) y `prueba.planta` («Prueba
  Encargado Planta», cargo y acceso Encargado de Planta); consultado en Neon que quedaron así. Al
  elegir el cargo, el acceso se propuso solo (RF-15, RF-16). Revisado en código: todas las rutas
  de `api/panel` abren con guardia (la de contraseña con `requerirAdmin`); la sesión lee el rol de
  la base en cada petición (RF-9); el filtro por obra trata a los roles nuevos como al residente
  (RF-5); la activación rechaza a quien no es operador (RF-10); el celular guarda el rol como
  texto sin validarlo ni restricción `CHECK`, así que un rol nuevo no rompe la bajada (RF-19).
  **Falta para cerrar:**
  1. Entrar con `prueba.almacen` y `prueba.planta` (y con `residente1`): lo hace Diego, porque
     escribir contraseñas en el navegador no lo puede hacer el asistente. Comprobar menú de un
     solo módulo, llegada directa, aviso en `/panel/bitacoras` y `/panel/personas`, y que el
     residente ve los dos módulos nuevos.
  2. **RF-13, rojo en el texto:** el 403 de `requerirPermiso` dice siempre «es una acción de la
     gerencia». Para Almacén y Control Cantera también escriben el almacenista y el encargado de
     planta, así que no dice bien quién puede. Arreglo propuesto: el texto sale de la tabla de
     permisos, con su caso.
  3. RF-19 con un celular real de la obra: pendiente de demo.
  - Hallado, fuera de las RF: al registrar una persona el formulario limpia el cargo pero deja el
    **acceso** elegido. Tras registrar un almacenista, la siguiente persona sale propuesta como
    Almacenista si no se elige cargo. Viene de la spec 002; con los accesos nuevos pesa más.
- **Arreglos tras la primera pasada (2026-09-15, aprobados por Diego):**
  - **RF-13**: `motivoDeRechazo(modulo, accion)` en `permisos.ts` arma el 403 con quién sí puede,
    leyendo la tabla («No puede crear o modificar este registro: lo hacen la gerencia y el
    almacenista.»). `requerirPermiso` lo usa; `QUE_SE_INTENTABA` pasó de `guardia.ts` a la regla.
    Caso nuevo con cuatro frases (148 verificaciones). Queda **pendiente comprobarlo contra el
    servidor**: hoy no hay rutas de Almacén ni de Cantera donde un residente pueda escribir; se
    ve en 009 y 010, y con un almacenista abriendo Bitácoras en la demo.
  - **Formulario de Personas**: al registrar, el acceso vuelve a «Operador» junto con el cargo.
    Sin comprobar en Chrome (el servidor se detuvo a pedido de Diego).
  - Siguen pendientes para cerrar T8 los puntos 1 y 3 de arriba.
- **Demo de Diego (2026-09-15):** entró con `prueba.almacen` y con `prueba.planta`, y cada uno ve
  en el menú **solo su módulo** (RF-2 y RF-3 comprobados de verdad). Diego pidió seguir con la
  009. **Queda sin comprobar a mano**: la llegada directa y el aviso en Bitácoras (RF-4, RF-7,
  cubiertos por sus casos), el residente con los dos módulos nuevos (RF-12, cubierto por su caso),
  el formulario que ahora limpia el acceso y un celular de la obra sincronizando (RF-19). Por eso
  T8 sigue sin marcar y la spec sigue `Aprobada`: se cierra con esas comprobaciones.
