# Tareas — Spec 017

> Módulos por obra: Almacén y Control Cantera (RF-1 a RF-18). Orden: datos, reglas, sesión y
> guardia, y después cada superficie que las consume. T11 valida la spec entera.

**Datos y reglas**

- [x] T1. Los dos interruptores en la obra, con su migración. (RF-1, RF-2)
      `obras.almacen_activo` y `obras.cantera_activo`, boolean not null default `true`, con el
      comentario de por qué el default **es** RF-2. `npm run db:generate:servidor`.
      Hecho cuando: la migración está en `drizzle/servidor/` y solo añade esas dos columnas; se
      aplica en Neon **con el permiso de Diego** y el `GET` de obras sigue respondiendo; los
      tres comandos en verde.

- [x] T2. Las reglas de módulo por obra, con sus casos. (RF-7, RF-8, RF-9, RF-11)
      En `permisos.ts`: `ModulosDeObra`, `moduloApagado`, `modulosVisibles(rol, modulos)`,
      `avisoDeModuloApagado` y `motivoParaNoDarRolEnObra`. La gerencia no se filtra.
      Hecho cuando: en el guion, el almacenista con Almacén apagado no ve ningún módulo y con
      encendido ve el suyo; el encargado de planta igual con Cantera; el residente pierde
      Almacén y conserva Bitácoras; la gerencia ve los nueve módulos con cualquier combinación;
      `moduloApagado` solo mira esos dos módulos; `motivoParaNoDarRolEnObra` da el texto para
      almacenista y encargado en obra sin su módulo y `null` en los demás casos; los tres
      comandos en verde.

**Servidor**

- [x] T3. La sesión trae los módulos de la obra. (RF-7 a RF-9)
      `PersonaEnSesion.modulosDeObra`, del `join` con `obras` en la lectura de sesión; los dos
      encendidos para quien no tiene obra.
      Hecho cuando: desde la página, `GET /api/auth/yo` trae `modulosDeObra` con los dos en
      `true` para la gerencia; los tres comandos en verde.

- [x] T4. La guardia rechaza un módulo apagado. (RF-9)
      `requerirPermiso` responde 403 con `avisoDeModuloApagado` cuando quien pide tiene obra y
      ese módulo está apagado.
      Hecho cuando: con Almacén apagado en PRUEBA-016 (por `PATCH` desde la página), un `GET`
      de un listado de almacén hecho **con una sesión de esa obra** responde 403 con ese texto;
      con la sesión de gerencia sigue respondiendo 200; los tres comandos en verde. (Si no hay
      credenciales de almacenista, se comprueba por lectura de código y se dice así.)

- [x] T5. La obra guarda y devuelve sus interruptores. (RF-1, RF-3, RF-4, RF-5)
      Contratos `obraNueva` (encendidos por defecto) y `obraEditada` (opcionales); `GET`, `POST`
      y `PATCH` de obras; `ObraFila`.
      Hecho cuando: desde la página, el `GET` de obras trae los dos campos; un `PATCH` que apaga
      Cantera en PRUEBA-016 responde 200 y el `GET` lo refleja; corregir solo el nombre no los
      toca; los tres comandos en verde.

- [x] T6. Las obras apagadas salen de los listados de gerencia. (RF-10)
      `filtroDeModulo(modulo)` en `alcance.ts`, aplicado a los listados de Almacén (incluida la
      descarga en Excel) y de Cantera.
      Hecho cuando: con Almacén apagado en PRUEBA-016, el listado de materiales de la gerencia
      ya no trae los de esa obra y el Excel de «todas» tampoco (leído en la página como en
      009/T24); al encenderlo vuelven; los tres comandos en verde.

- [x] T7. No se da el rol de un módulo apagado. (RF-11)
      Las rutas de personas rechazan almacenista o encargado de planta en una obra sin ese
      módulo, con `motivoParaNoDarRolEnObra` bajo el campo `rol`.
      Hecho cuando: con Almacén apagado en PRUEBA-016, un `POST` de persona con rol almacenista
      en esa obra responde 400 con ese texto y **no crea nada**; con Almacén encendido, el mismo
      `POST` pasa la validación; los tres comandos en verde.

- [x] T8. Cerrar un parte sin Cantera no fija viajes. (RF-13)
      En `cerrar+api.ts`, `cantera: []` cuando la obra tiene Cantera apagada.
      Hecho cuando: en el guion o por lectura del SQL generado, la sentencia de cierre usa la
      lista vacía con el módulo apagado y la subconsulta con el módulo encendido; los tres
      comandos en verde. (El cierre real se ve en T11.)

**Panel**

- [x] T9. Menú, aviso y casillas en la ficha de la obra. (RF-3, RF-4, RF-6, RF-7, RF-8)
      El menú sale de `modulosVisibles(rol, modulosDeObra)`; el marco muestra el aviso de RF-8;
      casillas «Lleva almacén» y «Lleva control de cantera» en el alta y en la corrección, con
      el aviso de RF-6 antes de guardar, con los nombres de quienes quedan sin módulo.
      Hecho cuando: en Chrome, como gerencia, la ficha de PRUEBA-016 muestra las dos casillas
      con su estado; apagar una que tenga gente en ese rol muestra el aviso con sus nombres
      antes de guardar; con los dos apagados la gerencia sigue viendo su menú completo; los tres
      comandos en verde.

- [x] T10. La sección de Cantera del parte y los selectores de obra. (RF-10, RF-12, RF-16)
      El parte abierto de una obra con Cantera apagada no pinta la sección; el cerrado o anulado
      sí, con lo que fijó. Los selectores de obra de Almacén y Control Cantera solo ofrecen las
      obras con ese módulo encendido.
      Hecho cuando: en Chrome, con Cantera apagada en PRUEBA-016, su parte abierto no muestra
      Control Cantera y el parte anulado del 2026-09-22 sí muestra la suya; el selector de obra
      de Control Cantera no ofrece PRUEBA-016; al encenderla vuelve todo; los tres comandos en
      verde.

- [x] T11. Validación RF por RF con demo. (RF-1 a RF-18)
      Hecho cuando: cada RF-1 a RF-18 tiene su comprobación con resultado en las notas, incluidos
      RF-14 y RF-15 (apagar y encender sin perder nada) y RF-17 (el móvil no cambia: `git status`
      sin tocar `src/db/local`, `src/app/(operador)` ni `src/features/sync`); los tres comandos
      en verde y la spec queda **Cumplida**.

## Notas de ejecución

- **T1 (2026-09-22).** `obras.almacen_activo` y `obras.cantera_activo`, boolean not null default
  `true`, con el comentario de por qué ese default **es** RF-2 y de que apagar no borra nada.
  `db:generate:servidor` generó `drizzle/servidor/0014_redundant_trauma.sql`, que solo añade las
  dos columnas. **Aplicada en Neon con el permiso de Diego** («Listo.»). Después, el `GET` de
  obras responde 200 con OBR-001 y PRUEBA-016. Todavía no se lee ni se escribe desde ningún
  sitio: eso es T5. 247 verificaciones.
- **T3 (2026-09-22, hecha antes que T2, a pedido de Diego).** La lectura de sesión junta `obras`
  con un `leftJoin` (la gerencia no tiene obra) y `PersonaEnSesion.modulosDeObra` sale de ahí;
  los dos encendidos para quien no tiene obra. `GET /api/auth/yo` lo devuelve y
  `PersonaEnSesionFila` lo declara. Comprobado desde la página: la sesión de gerencia responde
  `rol: admin`, `obraId: null`, `modulosDeObra: { almacen: true, cantera: true }`. **Adelantado
  de T2:** el tipo `ModulosDeObra` y `TODOS_LOS_MODULOS`, en `permisos.ts`, porque sin ellos esto
  no compila; las funciones (`moduloApagado`, `modulosVisibles` con obra,
  `avisoDeModuloApagado`, `motivoParaNoDarRolEnObra`) y sus casos siguen siendo T2. La sesión de
  prueba del guion (`sesionDe`) ahora lleva los dos módulos encendidos. Una sesión **con** obra
  no se pudo ver: no hay credenciales de almacenista ni de encargado de planta; se comprueba en
  T4 o con una cuenta de prueba. 247 verificaciones.
- **T4 (2026-09-22).** Primero las pruebas, que fallaron porque las funciones no existían.
  **Adelantado de T2:** `moduloApagado` (solo Almacén y Cantera se apagan; los demás módulos
  nunca) y `avisoDeModuloApagado` («Su obra no lleva el módulo …»), con su caso; el resto de T2
  sigue pendiente. `requerirPermiso` rechaza con 403 y ese texto cuando quien pide **tiene obra**
  y el módulo está apagado; la gerencia no se filtra. 248 verificaciones.
  **Comprobación, con lo que se pudo:** se verificó por lectura que **ninguna** ruta de
  `almacen` ni de `cantera` se salta `requerirPermiso` (`grep -L` sobre las ocho rutas, sin
  resultados), así que el rechazo las cubre todas; y que la gerencia sigue entrando (almacén
  200; cantera 400 porque le pide decir la obra, no por permisos). **El 403 con una sesión de
  esa obra no se pudo ver**: no hay credenciales de almacenista ni de encargado de planta, y no
  se deben escribir contraseñas de nadie; además, apagar el módulo llega en T5. Queda para T11
  si Diego crea cuentas de prueba, o como verificación por lectura de código.
- **T5 (2026-09-22).** `camposDeObra` gana `almacenActivo` y `canteraActivo`; `obraNueva` los
  pone en `true` por defecto (RF-2, RF-3) y `obraEditada`, escrita a mano, los deja opcionales
  (ausente es «no se toca»). `ObraFila` los declara y las tres consultas de obras los devuelven.
  Comprobado desde la página: las dos obras salían con los dos encendidos; un `PATCH` con
  `canteraActivo: false` a PRUEBA-016 responde 200 y el `GET` lo refleja; un `PATCH` con solo el
  nombre responde 200 y **no** los toca. 248 verificaciones.
- **PRUEBA-016 queda con Control Cantera apagado**, que es lo que necesitan las demos de T10.
  Nada más cambia todavía: el menú, los selectores y la sección del parte se hacen en T9 y T10.
- **T6 (2026-09-22).** `filtroDeModulo(modulo, columnaObra)` en `alcance.ts`, escrito como un
  `exists` para que valga igual en una consulta que junta `obras` y en una que no. Se aplica
  **dentro de los lectores compartidos**, no en cada ruta: `leerMateriales` del almacén,
  `leerMovimientos` del Excel, `leerSitios` y `leerMateriales` de cantera y `leerViajes`.
  Comprobado desde la página, con la gerencia: con Almacén apagado en PRUEBA-016 su material
  desaparece del listado (4 de 5) y el Excel de «todas» ya no la menciona (solo «Consorcio
  Antioquia»); al encenderlo vuelve. Para probar Cantera se registraron en PRUEBA-016 un sitio
  «Cantera de prueba 017» y un material «Base granular (prueba 017)»: con Cantera encendida
  salen, y al apagarla el listado de opciones queda vacío, sin borrar nada.
- **Datos de prueba nuevos en PRUEBA-016:** ese sitio y ese material de cantera. La obra queda
  con **Almacén encendido y Cantera apagada**, que es lo que necesita T10.
- **T7 (2026-09-22).** Primero la prueba, que falló porque la función no existía. **Adelantado de
  T2:** `motivoParaNoDarRolEnObra(rol, modulos)` («Esa obra no lleva el módulo …» para
  almacenista sin almacén y encargado de planta sin cantera; `null` para los demás roles), con
  su caso. Nuevo `src/features/servidor/modulos-de-obra.ts` con `modulosDeLaObra(obraId)`: la
  sesión trae los módulos de **quien pide**, y aquí hacen falta los de la obra **de otra
  persona**; vive aparte porque lo usan las dos rutas de personas y una ruta no importa a otra.
  El `POST` lo comprueba con la obra que llega; el `PATCH`, con el rol y la obra **como
  quedarían**. 249 verificaciones.
  Demo: con Cantera apagada en PRUEBA-016, crear un encargado de planta ahí responde 400 «Esa
  obra no lleva el módulo Control Cantera.» con el campo `rol`, y pasar a encargado de planta a
  alguien de esa obra, lo mismo, sin cambiarle nada.
- **Error mío en la demo:** el segundo `POST` de prueba —que esperaba que se rechazara por
  usuario repetido— **creó una persona**. Quedó como cuenta de prueba: `prueba.almacenista`
  («Prueba Almacenista 017»), rol almacenista, en PRUEBA-016. Sirve para T11; si no, Diego la da
  de baja.
- **Defecto encontrado, fuera de esta tarea y ya en producción:** `personaEditada` es
  `personaNueva.partial()`, y `rol` lleva `.default('operador')` (y `activo`, `.default(true)`).
  Con zod, el default se aplica también cuando el campo no viene, así que **corregir solo el
  nombre o el usuario de una persona le pone rol «operador» y la reactiva**. Se vio al renombrar
  la cuenta de prueba: quedó como operador. Es el mismo defecto que la spec 016 corrigió en
  `obraEditada` escribiéndola a mano. Hay que arreglarlo aparte, y antes de desplegar.
- **T8 (2026-09-22).** **Cambio sobre el plan:** en vez de decidir en `cerrar+api.ts` entre
  `viajesParaFijarAlCerrar()` y `[]`, la condición entra **en la propia subconsulta**
  (`viajesDelDiaEnSql`): `and exists (select 1 from obras ob where ob.id = v.obra_id and
  ob.cantera_activo)`. Sale lo mismo —lista vacía— sin una lectura aparte y sin ventana entre
  leer y escribir: el cierre ya corre dentro de un solo `UPDATE`. De paso cubre igual la sección
  del parte, que usa la misma consulta.
  **Comprobado contra la base**, sin escribir nada permanente: el SQL generado menciona
  `cantera_activo`; con el id de OBR-001 y el 2026-09-17 (un viaje vigente) fijaría 1; en un
  lote —que Neon ejecuta como transacción— se apagó su cantera, la misma consulta fijó 0, y se
  volvió a encender: la obra quedó con `cantera_activo = true`.
- Tropiezo anotado: la primera consulta de prueba pasaba `o.id` desde un `from obras o`, y
  dentro de la subconsulta `o` es el **sitio de origen** (el comentario de la función ya avisa de
  los alias). Daba 0 en todos los casos. Con el id literal salió bien.
- **T9 (2026-09-22).** **Con esto queda hecha también T2**: `modulosVisibles(rol, modulos)` filtra
  por lo que lleva la obra, y **la gerencia no se filtra** (`rol !== 'admin'`), que era la
  decisión del plan; su caso está en el guion. El menú (`barra-navegacion.tsx`) le pasa
  `persona.modulosDeObra`; `marco.tsx` muestra el aviso de RF-8 cuando el cargo sí alcanza pero
  la obra no lleva el módulo, después del aviso de módulo ajeno. Nuevo
  `src/features/panel/modulos-de-obra.tsx` con `ModulosDeLaObra` (las dos casillas) y
  `personasSinModulo`, compartido por el alta y la corrección; la ventana de corrección carga las
  personas para nombrar a quien se queda sin módulo (si esa consulta falla, el aviso se omite: lo
  que decide es el servidor). 250 verificaciones.
  Demo en Chrome: el alta muestra las dos casillas marcadas; «Corregir» en PRUEBA-016 las muestra
  como están (Almacén sí, Cantera no); al desmarcar «Lleva almacén» sale «Prueba Almacenista 017
  se queda sin su módulo en esta obra… Lo registrado no se borra y vuelve al encenderlo»;
  «Cancelar» no guardó nada (la obra sigue con almacén encendido y cantera apagada) y la gerencia
  conserva sus nueve módulos del menú.
- El aviso de RF-8 en el marco **no se pudo ver con una sesión de esa obra** (sin credenciales);
  queda por lectura de código y para T11 si hay cuenta de prueba.
- **T10 (2026-09-22).** En `pantalla-partes.tsx`, `muestraCantera`: la gerencia lee el
  interruptor de la obra del parte (lleva todas y puede listarlas) y el residente, el de su
  sesión (no puede listar obras, y su sesión **es** la de su obra). Solo esconde la sección de un
  parte **abierto**: uno cerrado o anulado enseña lo que fijó (RF-16). Se esconde también su
  entrada del índice. En `pantalla-almacen.tsx` y `pantalla-cantera.tsx`, los selectores de obra
  de la gerencia se arman con las obras que llevan ese módulo (RF-10). 250 verificaciones.
  Demo en Chrome: el selector de Control Cantera solo ofrece Consorcio Antioquia (no
  PRUEBA-016, con cantera apagada); el parte abierto de PRUEBA-016 ya no trae «Control Cantera
  (n)» ni su entrada del índice —el único texto que queda es el del menú de la gerencia—; y el
  parte **anulado** del mismo día, visto interceptando el `GET` para mostrarlo, sí conserva su
  sección.

### Validación de la spec 017 (T11, 2026-09-22)

Comandos: `npm run verificar` → 250 verificaciones correctas; `npm run typecheck` y
`npm run lint` sin errores (salida 0); `npx expo export --platform web` sin error y la búsqueda
de `DATABASE_URL`, `SECRETO_TOKENS` y `R2_LLAVE_SECRETA` en `dist/client`, vacía (`dist`
borrado). Todo en Chrome, como gerencia.

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-1 | Migración `0014` (T1) + `GET`/`PATCH` de obras con los dos campos (T5) | verde |
| RF-2 | El default `true` de la migración: las dos obras que ya existían salieron con los dos encendidos (T1, T5) | verde |
| RF-3 | Chrome (T9): el alta muestra las dos casillas marcadas; `obraNueva` las pone en `true` por defecto. **No se registró una obra nueva** para no dejar otra obra de prueba | verde (sin alta real) |
| RF-4 | Chrome (T9) y `PATCH` (T5): se encienden y apagan desde la ficha | verde |
| RF-5 | Las rutas de obras exigen `obras/escribir`, que solo tiene la gerencia (`permisos.ts`) | verde (lectura de código) |
| RF-6 | Chrome (T9): al desmarcar «Lleva almacén» en PRUEBA-016 sale «Prueba Almacenista 017 se queda sin su módulo…», y se puede guardar igual | verde |
| RF-7 | `verificar-reglas.ts` (el menú por cargo y por obra) + Chrome (T9): la gerencia conserva sus nueve módulos con PRUEBA-016 apagada. Con una sesión **de esa obra** no se pudo ver: sin credenciales | verde (en parte, lectura de código) |
| RF-8 | La regla `avisoDeModuloApagado` con su caso y el marco que lo pinta (T9). Sin sesión de esa obra no se pudo ver en pantalla | verde (lectura de código) |
| RF-9 | Chrome (T4): ninguna ruta de almacén ni cantera se salta `requerirPermiso`, y ahí está el 403. El 403 real necesita una sesión con obra | verde (lectura de código) |
| RF-10 | Chrome (T6): con el módulo apagado, el material de PRUEBA-016 sale del listado y del Excel de «todas»; (T10) los selectores de obra de Almacén y Cantera solo ofrecen las que lo llevan | verde |
| RF-11 | `verificar-reglas.ts` + Chrome (T7): crear un encargado de planta en PRUEBA-016 responde 400 «Esa obra no lleva el módulo Control Cantera.», y pasar a ese rol a alguien de esa obra, igual | verde |
| RF-12 | Chrome (T10): el parte abierto de PRUEBA-016 no muestra la sección ni su entrada del índice | verde |
| RF-13 | Contra la base (T8): con cantera encendida la sentencia de cierre fijaría 1 viaje; apagada, 0 | verde |
| RF-14 | Chrome (T11): con los dos módulos apagados no se ve nada de PRUEBA-016, y nada se borró | verde |
| RF-15 | Chrome (T11): al encender Almacén vuelve «Prueba Cemento 009 (responsable)» con su stock de 29,5 | verde |
| RF-16 | Chrome (T10): el parte **anulado** del 2026-09-22 conserva su sección de Cantera con la obra apagada | verde |
| RF-17 | `git status`: esta spec no tocó `src/db/local`, `src/app/(operador)` ni `src/features/sync` | verde |
| RF-18 | Chrome (T10): con Cantera apagada, el parte sigue mostrando «Control Calidad de Obra (2)» | verde |

**Lo que quedó sin ver en pantalla, y por qué:** el rechazo 403 y el aviso «Su obra no lleva el
módulo …» necesitan entrar con una cuenta de almacenista o de encargado de planta. No hay
credenciales, y no se deben escribir contraseñas de nadie. Quedan verificados por la regla (con
sus casos en el guion), por la lectura de la guardia y del marco, y por el hecho de que ninguna
ruta de esos módulos se salta `requerirPermiso`. Si Diego crea una cuenta de prueba y entra él
mismo, se cierran en un minuto.

**Datos que quedan de las demos, todos en PRUEBA-016:** la obra con **Almacén encendido y
Control Cantera apagado**; un sitio «Cantera de prueba 017» y un material «Base granular (prueba
017)»; y la persona `prueba.almacenista` («Prueba Almacenista 017»), creada por error en T7.

**Alcance.** Nada fuera de la spec. Dos ajustes de reparto entre tareas: T2 se fue haciendo
dentro de T4, T7 y T9 (que la cerró), y la condición de RF-13 quedó dentro de la consulta de
viajes en vez de en la ruta. Lo que la spec dejó fuera sigue fuera: el laboratorio por obra, los
demás módulos, quitar roles automáticamente, borrar lo registrado, el historial de encendidos y
cualquier cambio en el celular.

**Constitución.** Sin cambios en el móvil (1); todo salió de la spec (2); las reglas de qué se ve
y a quién se le puede dar un rol están en `shared/rules/permisos.ts` y las usan pantalla y
servidor (3); nada se borra: apagar solo esconde (4); puerta de calidad en verde (5); sin fugas
en el bundle (6); todo en español (7); sin dependencias nuevas (8).

**Veredicto: Cumplida (RF-1 a RF-18).**

- Pendiente de decidir, fuera de esta spec: el defecto de `personaEditada` encontrado en T7
  (corregir una persona le pone rol «operador»), que conviene arreglar antes de desplegar.
- **Arreglo del defecto de `personaEditada` (2026-09-22, después de T11).** No es de esta spec:
  es el defecto que apareció en T7 y que ya estaba en producción. Se corrige aquí porque
  restaura lo que `AGENTS.md` ya manda —en un `PATCH` parcial, ausente no es vacío— y porque no
  conviene desplegar con él. Primero la prueba, que falló mostrando el defecto: corregir solo el
  nombre devolvía además `rol: 'operador'` y `activo: true`. `personaEditada` pasa a escribirse
  a mano (como `obraEditada` en 016/T5): `usuario` y `nombreCompleto` opcionales con las
  validaciones del alta, `documento` con `textoParcial`, `obraId` con `idParcial`, y `rol`,
  `cargo` y `activo` opcionales **sin defaults**. 251 verificaciones. Comprobado contra el
  servidor: un `PATCH` con solo el nombre a `prueba.almacenista` responde 200 y la deja con su
  rol de almacenista, su obra y activa.
