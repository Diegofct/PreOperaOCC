# Tareas — Spec 033

Tareas de menos de 30 minutos, ordenadas por dependencia. Cada una lleva los RF que
cubre y una línea `Hecho cuando:` que se pueda comprobar sin interpretar.

**Se implementa una tarea cada vez**, y al terminarla se para.
Ninguna tarea se marca sin `npm run verificar`, `npm run typecheck` y `npm run lint`
en verde.

### Reglas

- [x] T1. `src/shared/rules/empresas.ts`: `EMPRESAS`, `menuDeEmpresa`, `menuDeObra`, `alcanzaLaEmpresa`, `empresaDeLaPersona`; módulos `empresa` y `finanzas` en `permisos.ts`. Casos en `verificar-reglas.ts`. (RF-1, RF-12 a RF-18, RF-21, RF-29, RF-44, RF-46)
      Hecho cuando: los casos nuevos pasan.
- [x] T2. `destinoAlEntrar` y `rutaNueva` (rutas viejas → nuevas, con sus parámetros). Casos. (RF-6 a RF-9, RF-47)
      Hecho cuando: los casos de cada rol y de cada ruta vieja pasan.
- [x] T3. `src/shared/rules/cortes.ts`: `validarCorte`, diferencia, consolidado con total, desactualizado, `pesos`. Casos. (RF-35, RF-36, RF-38, RF-41 a RF-43, RNF)
      Hecho cuando: los casos nuevos pasan.

### Datos y API

- [x] T4. Esquema: `empresas`, `cortes_financieros`, `usuarios.empresa`; `db:generate:servidor`; insertar las cuatro empresas; migrar dev. (RF-31, RF-34, RF-45)
      Hecho cuando: existe `drizzle/servidor/0032_*.sql` y en `neondb` hay 4 empresas.
- [x] T5. API de empresas: listar con último corte y obras activas; editar datos (gerencia). (RF-2 a RF-4, RF-31, RF-32)
      Hecho cuando: en dev, GET da 4 empresas; PATCH como gerencia 200 y como residente 403.
- [x] T6. API de cortes: registrar, listar con diferencia, anular, consolidado. (RF-34 a RF-44)
      Hecho cuando: en dev, un corte `PRUEBA-033` 201; repetido 409; futuro 400; anular sin motivo 400 y con motivo 200; como residente 403.
- [x] T7. Personas: `empresa` al crear/editar, filtro por empresa y por obra. (RF-28, RF-45, RF-46)
      Hecho cuando: en dev, `?empresa=occ` trae los operadores sin empresa y `?obraId=` solo los de la obra.
- [x] T8. API Bitácora de maquinaria (todas las obras, filtros) y filtro `empresa=occ` en WhatsApp. (RF-22, RF-23, RF-24)
      Hecho cuando: en dev, la maquinaria de un rango trae filas de más de una obra y el filtro de obra las reduce; WhatsApp OCC solo trae las dos categorías.
- [x] T9. Asistente con `obraId` por defecto. (RF-30)
      Hecho cuando: en dev, preguntar «¿cuántas máquinas hubo ayer?» desde una obra responde sobre esa obra; una obra ajena da 404.

### Navegación

- [x] T10. `contexto-empresa.tsx` y las rutas de las cuatro empresas que montan las pantallas de hoy; rutas viejas → `rutaNueva`. (RF-5, RF-13 a RF-17, RF-47)
      Hecho cuando: en Chrome, cada ruta nueva abre su pantalla y `/panel/bitacoras` lleva a su pantalla dentro de Proyectos.
- [x] T11. Menú lateral por empresa: cabecera con empresa/obra, «← Empresas», «Cambiar de obra», módulos apagados fuera. Título de la pestaña. (RF-10, RF-11, RF-18, RF-20, RF-48)
      Hecho cuando: en Chrome, cada empresa y una obra muestran exactamente su menú.
- [x] T12. Inicio: tarjetas de gerencia (saldo, fecha, «Sin información financiera», obras activas) y destino por rol; «No tienes acceso a esta sección». (RF-1 a RF-9, RF-12)
      Hecho cuando: en Chrome, gerencia ve 4 tarjetas (una columna a 390 px); residente entra a su obra y laboratorista a Geolab.

### Pantallas

- [x] T13. Información de la empresa (ver y editar) e Información de la obra (con su contrato). (RF-31 a RF-33)
      Hecho cuando: en Chrome, se editan los datos de OCC y se ven tras recargar; la obra muestra consorcio y contrato.
- [x] T14. Información financiera: registrar, último con diferencia, historial, anular con motivo. (RF-34 a RF-40)
      Hecho cuando: en Chrome, dos cortes `PRUEBA-033` muestran la diferencia; anular deja el anulado en el historial.
- [x] T15. Consolidado del grupo. (RF-41 a RF-43)
      Hecho cuando: en Chrome, una fila por empresa y obra, total, y un corte de hace 31 días sale «Desactualizado».
- [x] T16. Proyectos: lista de obras (consorcio, municipio, estado) y portada de la obra. (RF-16, RF-19)
      Hecho cuando: en Chrome, se elige Consorcio Magdalena y se llega a su menú.
- [x] T17. Pantallas con obra fija (bitácoras, almacén, cantera, laboratorio, reportes, contrato, WhatsApp, personas): sin selector dentro de una obra. (RF-19, RF-24, RF-28)
      Hecho cuando: en Chrome, dentro de una obra ninguna de las ocho muestra selector ni datos de otra obra.
- [x] T18. OCC: Bitácora de maquinaria; Reportes de vehículos y maquinaria; WhatsApp de OCC; Personas de OCC. (RF-22, RF-23, RF-25, RF-28)
      Hecho cuando: en Chrome, cada una muestra lo de su empresa.
- [x] T19. Geolab: Laboratorio de todas las obras con filtro; Reportes de laboratorio; Personas de Geolab. (RF-26 a RF-28)
      Hecho cuando: en Chrome, el filtro de obra cambia la lista y el reporte sale por rango. (Las pestañas de Reportes en Geolab y el filtro de Personas por empresa quedaron hechos en la T18; aquí se comprueban.)
- [x] T20. Personas: campo «Empresa» al registrar y editar. (RF-45, RF-46)
      Hecho cuando: en Chrome, una persona `PRUEBA-033` se registra en Geolab y aparece solo en Geolab.

### Cierre

- [x] T21. Revisión de enlaces del código (`router.push`, `Link`, asistente, avisos de WhatsApp) hacia las rutas nuevas; `expo export` sin fugas. (RF-47)
      Hecho cuando: `grep` no deja rutas viejas sin pasar por `rutaNueva` y `dist/client` no tiene `DATABASE_URL`. Quitar también `GRUPOS_DEL_MENU`/`gruposDelMenu` (menú de antes, sin uso desde la T11) y sus pruebas viejas, y `ENLACES_DE_MODULO` si ya no lo usa nadie.
- [x] T22. Validación final: `validacion.md` RF por RF + demo manual; limpieza acotada de lo `PRUEBA-033`. (Todos)
      Hecho cuando: cada RF tiene su comprobación con resultado, los tres comandos en verde y la spec queda Cumplida en desarrollo.
- [ ] T23. Despliegue junto con la 032 (cuando el usuario lo pida): migraciones 0031 y 0032 → imagen → script de placas (con permiso) → 401 e inicio de sesión real. (Todos)
      Hecho cuando: en producción gerencia ve las cuatro tarjetas y la placa en Vehículos.

## Notas de ejecución
- 2026-10-27 (plan aprobado): el usuario aprobó el plan y las cuatro decisiones (Reportes de OCC y Geolab con el selector de obra; WhatsApp de OCC = «Vehículo o maquinaria» + «Suministro o cantera»; el residente sigue con una obra; **Proyectos sin corte propio**). Spec y plan anotados como cambio del 2026-10-27: RF-2 (la tarjeta de Proyectos suma el saldo del último corte de cada obra, con la fecha del más antiguo), RF-3, RF-34 y RF-41 (sin fila propia de Proyectos).
- 2026-10-27 (T1): `src/shared/rules/empresas.ts`:
  - `EMPRESAS` (las cuatro, con su función en una línea) y `EMPRESAS_CON_CORTE` (sin Proyectos).
  - `menuDeEmpresa`, `menuDeObra`, `alcanzaLaEmpresa`, `alcanzaLaObraDeLaRuta`, `SIN_ACCESO` y `empresaDeLaPersona`.
  - Cada entrada del menú lleva la fila de permisos que la decide, así que el menú solo reparte (RF-21).

  En `permisos.ts`, `MODULOS_DE_EMPRESA = ['empresa', 'finanzas']`, aparte de `MODULOS` para no tocar el menú de antes ni sus pruebas. `ModuloConPermiso` es la unión; `alcanza`, `motivoDeRechazo`, `moduloApagado` y `requerirPermiso` la aceptan. Los dos permisos son solo de gerencia.

  Lo que ve cada rol:
  - El residente ve en su obra Reportes de WhatsApp, Reportes, Bitácoras, Control Cantera, Almacén, Laboratorio, Contrato y Asistente. No ve Personas porque hoy solo la lista, ni la información de la obra ni las finanzas.
  - El laboratorista ve en Geolab el Laboratorio y el Asistente.
  - El laboratorista no entra a Proyectos aunque tenga obra.

  6 pruebas nuevas «033/…» (571 en total); `typecheck` y `lint` en verde.
- 2026-10-27 (T2): en `empresas.ts`, `rutaDeEmpresa`, `rutaDeObra`, `rutaDeProyectos(ir)`, `destinoAlEntrar({rol, obras})` y `rutaNueva(direccion, persona)`.
  - **El residente entra a la portada de su obra** (`/panel/proyectos/<obra>`), que es el resumen del día (el Inicio de antes); el plan decía Bitácoras y se corrigió.
  - Almacenista y encargado de planta entran a su módulo dentro de su obra; el laboratorista, a `geolab/laboratorio`.
  - Sin obra o con varias, la lista de Proyectos (RF-7).
  - `rutaNueva` saca la obra de `?obraId=` u `?obra=` (los dos nombres que usaban las pantallas) y conserva los demás parámetros.
  - Gerencia sin obra en la dirección va a `/panel/proyectos?ir=<pagina>`: **la T16 tiene que respetar `ir`** al elegir la obra.

  2 pruebas nuevas (573); `typecheck` y `lint` en verde.
- 2026-10-27 (T3): `src/shared/rules/cortes.ts` con `validarCorte`, `fechaDelCorte` («15-oct-2026»), `ultimoCorte`, `diferenciaConElAnterior`, `estaDesactualizado` (> 30 días, con `plazoEnDias` de la 031), `consolidado` y `resumenDeProyectos`. Los pesos se escriben con `enPesos` (spec 031, `rules/pesos.ts`): ya hacía `$ 1.234.567` a mano para que se lea igual en todos lados, así que no se duplicó.

  Decisiones dentro de la regla, sin cambiar la spec:
  - El saldo puede ser negativo; las cuentas por pagar y por cobrar, no («… no pueden ser negativas»).
  - Los anulados no cuentan como último ni como anterior.
  - Las obras dadas de baja salen en el consolidado solo si tienen corte (caso límite).
  - La tarjeta de Proyectos suma el saldo del último corte de cada obra, con la fecha del más antiguo.

  6 pruebas nuevas (579); `typecheck` y `lint` en verde.
- 2026-10-27 (T4): esquema con `empresas` (las cuatro por id, datos en texto `''` por defecto, `actualizado_por`), `cortes_financieros` y `usuarios.empresa`.
  - **Pesos en `bigint`** (sin decimales, como el valor del contrato de la 031) y no `numeric(18,2)` como decía el plan; el plan quedó corregido.
  - Restricciones: el dueño es la empresa o la obra, nunca las dos ni ninguna, y nunca `proyectos`; las cuentas no son negativas; anulado ⇔ con motivo; la empresa de una persona es una de las cuatro.
  - Índice único parcial `(coalesce(empresa_id, obra_id), fecha_corte) where anulado_en is null` (RF-36).

  Migración `drizzle/servidor/0032_dapper_mattie_franklin.sql`, con el `INSERT … ON CONFLICT DO NOTHING` de las cuatro empresas al final, y `empresas` en los disparadores de `actualizado_en`. **Aplicada solo en desarrollo** (`neondb`); producción en la T23.

  Comprobado en dev con un script temporal: hay 4 empresas, 0 personas con empresa y se rechazan 7 casos indebidos (empresa y obra a la vez, sin dueño, de Proyectos, cuentas negativas, anulado sin motivo, empresa inexistente, persona con empresa inexistente). No quedó nada de prueba. Los tres comandos en verde (579).
- 2026-10-27 (T5): `GET /api/panel/empresas` (permiso `empresa/listar`) y `PATCH /api/panel/empresas/:id` (`empresa/escribir`), las dos solo para gerencia.
  - La lógica está en `src/features/empresas/servidor/empresas.ts` (`listarEmpresas`, `datosDeLaFila`): lee los cortes vigentes y los resuelve con `ultimoCorte` y `resumenDeProyectos`, la misma regla del Consolidado.
  - Contrato `empresaEditada` en `contratos.ts`, con texto libre sin validar el NIT ni el correo, como los del contratante (031). Tipos `EmpresaFila`, `DatosDeEmpresa` y `ResumenFinanciero`.
  - El GET pide `listar` y no `ver` porque la tarjeta lleva el saldo (RF-44).

  **Probado contra el dev server** con un script temporal y sesiones temporales de Diego (gerencia) y Tatiana Carreño (residente). Pasaron las 11 comprobaciones:
  - Gerencia: GET → 200 con las 4 empresas en orden, `financiero` nulo en las 4 (todavía no hay cortes) y `obrasActivas` = 3 solo en Proyectos.
  - Residente: GET → 403 «No puede consultar este listado: lo hace la gerencia.».
  - PATCH de gerencia → 200; recorta los espacios y guarda `actualizado_por`.
  - PATCH de residente → 403 «No puede cambiar los datos de la empresa: lo hace la gerencia.».
  - Empresa inexistente → 404; NIT de 41 caracteres → 400; sin sesión → 401.

  Al terminar, OCC quedó como estaba (vacía, `actualizado_por` nulo) y se borraron las 2 sesiones. Las tarjetas con cortes de verdad se prueban en la T6. Los tres comandos en verde (579).
- 2026-10-27 (T6): API de cortes. Todas solo para gerencia (`finanzas`).
  - `GET /api/panel/cortes?empresa=|obraId=` → `{cortes, diferencia}` (más reciente primero, con los anulados, quién registró y quién anuló).
  - `POST /api/panel/cortes` → 201 `{id}`; 400 si la fecha es futura, un valor es negativo o tiene decimales, o el dueño no vale; 409 si la fecha está repetida.
  - `POST /api/panel/cortes/:id/anular` `{motivo}` → 200, o 404 si no existe o ya estaba anulado (no se reescribe el motivo).
  - `GET /api/panel/cortes/consolidado`.

  Lógica en `src/features/empresas/servidor/cortes.ts` (`cortesDe`, `registrarCorte` con `validarCorte` y la fecha de la jornada, `anularCorte`, `consolidadoDelGrupo`). Contratos `corteNuevo` (empresa **o** obra; solo Elemental, OCC o Geolab; pesos enteros) y `corteAnulado`. `duplicadoDe` nombra `ux_corte_dueno_fecha` como respaldo si dos registran el mismo día a la vez.

  **Probado contra el dev server**, con sesiones temporales de Diego y Tatiana y la base sin cortes. Pasaron las 29 comprobaciones:
  - Registrar → 201; fecha repetida → 409 «Ya hay un corte del 20-oct-2026; anúlalo para registrar otro»; fecha futura → 400.
  - Proyectos, empresa y obra a la vez, cuentas negativas, decimales y obra inexistente: rechazados con su mensaje.
  - Historial ordenado y diferencia (+500.000 de saldo, −20.000 por pagar).
  - Tarjetas: OCC con su último corte; Proyectos con el de CONSORCIO SANTANDER.
  - Consolidado: OCC al día y la obra «Desactualizado» (37 días), sin fila de Proyectos y con su total.
  - Anular: sin motivo → 400; con motivo → 200 y queda en el historial; dos veces → 404; después se pudo registrar otra vez esa fecha.
  - Residente → 403 en las cuatro rutas; sin sesión → 401.

  Al terminar se borraron los 4 cortes `PRUEBA-033 T6` y las 2 sesiones; quedan 0 cortes. Los tres comandos en verde (579).
- 2026-10-27 (T7): Personas con empresa.
  - `personaNueva` y `personaEditada` llevan `empresa` (una de las cuatro, nula = la de su rol). Es opcional en la API porque las altas de WhatsApp no la traen; la pantalla la pedirá siempre (T20).
  - `PersonaFila.empresa` es la efectiva (`empresaDeLaPersona`).
  - `GET /api/panel/personas` acepta `?empresa=` (filtro con la regla, no en SQL, para no repetir el «rol → empresa») y `?obraId=`, sin quitar `filtroDeObra`.
  - `PATCH` responde la empresa efectiva. `api.personas.listar(filtro?)` en el cliente.

  **Probado contra el dev server**, con sesiones temporales de Diego y Tatiana. Pasaron las 15 comprobaciones:
  - Nadie tiene empresa guardada, y todas salen con la de su rol: Elemental 1, OCC 52, Geolab 1, Proyectos 4.
  - Cada `?empresa=` trae exactamente esas personas; `?obraId=` solo las de la obra (6); `?empresa=otra` → 400.
  - Un operador `PRUEBA-033` registrado en Geolab sale en Geolab y no en OCC. Quitarle la empresa lo devuelve a OCC; cambiarla a Elemental funciona; una empresa inexistente → 400 «Esa empresa no existe.».
  - El residente, filtre como filtre, solo ve las de su obra.

  Al terminar se borró la persona y las 2 sesiones; quedan 0 personas con empresa. Los tres comandos en verde (579).
- 2026-10-27 (T8): **Bitácora de maquinaria** en `GET /api/panel/partes/maquinaria?obraId=&desde=&hasta=` (permiso `bitacoras/listar`).
  - Va en `partes/` y no en `bitacoras/` como decía el plan, porque `/api/panel/bitacoras` es la bitácora del vehículo (spec 001); el plan quedó corregido.
  - `maquinariaDeLasObras` (`src/features/empresas/servidor/maquinaria.ts`) aplana la Maquinaria de las bitácoras no anuladas: una fila por máquina y día, lo más reciente arriba, con el avance de la regla de siempre y el operador congelado.
  - Sin rango es la última semana (`rangoDeFechas`). El residente ve solo su obra (`filtroDeObraEstricto`).
  - `api.partes.maquinaria(filtro)` en el cliente.

  **WhatsApp de OCC**: regla `categoriasDeWhatsappDe(empresa)` en `empresas.ts` («vehiculo_maquinaria» y «suministro_cantera» para OCC; `null` = todas). `leerBandeja` acepta `categorias`, la ruta lee `?empresa=` (400 si no existe) y `api.whatsapp.propuestas.listar(…, empresa)` lo manda. Prueba nueva «033/RF-23, RF-24», que comprueba también que las dos categorías existen.

  **Probado contra el dev server**, solo lectura, con sesiones temporales:
  - Maquinaria: las 34 máquinas del rango (las mismas que suma la base), ordenadas, con avance = final − inicial.
  - El filtro de obra; rango al revés → 400; residente → solo su obra; sin las bitácoras anuladas.
  - WhatsApp OCC, en cada estado: exactamente las de esas dos categorías (28 de 130); empresa inexistente → 400.

  En dev **solo una obra tenía máquinas** en sus bitácoras, así que para el «más de una obra» de la tarea se insertó una bitácora `PRUEBA-033 T8` con una máquina en CONSORCIO SANTANDER (20-oct). Salieron las dos obras, la de prueba arriba, avance 50 con su operador, y el filtro de obra la dejó sola. Se borraron la bitácora y las sesiones.

  Los tres comandos en verde (580).
- 2026-10-27 (T9): el asistente con obra por defecto (RF-30).
  - `POST /api/panel/asistente/preguntar` acepta `obraId`. La ruta comprueba que la obra exista, no esté de baja y esté al alcance (`obraAlAlcance`, spec 028); si no, 404 «No existe esa obra.».
  - La obra llega a `preguntar` → `responderPregunta` como `obraPorDefecto`, y `indicacionDeObraPorDefecto` (regla nueva en `rules/asistente.ts`) la añade al bloque de contexto que no va en caché: «Pregunta desde la obra «X» (id …). Si la pregunta no nombra otra obra, responda sobre esta…».
  - Es una indicación y no un filtro: el alcance no cambia. `preguntarAlAsistente` del cliente manda `obraId`.
  - Prueba nueva «033/RF-30» (581).

  **Probado con la IA de verdad** en dev:
  - Residente desde una obra ajena → 404; obra inexistente → 404.
  - Gerencia, que alcanza todas, preguntó desde «Pruebas spec 018 (laboratorio)» «¿Cuántas máquinas trabajaron el 9 de octubre de 2026?» sin nombrar la obra. Respondió en 9 s con las 2 máquinas de esa bitácora (Recicladora WIRTGEN «falta la placa» y LPN264), y la conversación quedó con `obras = [esa obra]`.

  Al terminar se borraron la conversación, sus 2 mensajes, el uso del día y las sesiones. Los tres comandos en verde.
- 2026-10-27 (T10): navegación por empresa.
  - **Dónde se está**: regla `lugarDeLaRuta` (+ `empresaDelLugar`) en `empresas.ts`, con prueba (582), y `useLugarDelPanel`/`useObraDeLaRuta` en `src/features/empresas/contexto-empresa.ts`. El contexto se lee de la dirección: no hay proveedor ni estado aparte (decisión del plan).
  - **Rutas** en `src/app/panel/`: `{elemental,occ,geolab}/index.tsx` (lleva a la primera página de su menú, RF-5) y `[pagina].tsx`; `proyectos/index.tsx`; `proyectos/[obra]/index.tsx` y `[pagina].tsx`.
  - **Montaje**: `src/features/empresas/paginas-de-empresa.tsx` monta las pantallas de siempre después de comprobar el acceso (`alcanzaLaEmpresa`, `alcanzaLaObraDeLaRuta` y que la página esté en el menú del rol); si no, «Sin acceso» (RF-12) o «No existe».
  - Las pantallas que nacen en otras tareas salen como `PantallaPendiente` («se construye en la tarea Tnn»): Información de la empresa y de la obra (T13), Información financiera (T14), Consolidado (T15), Proyectos y la portada de la obra (T16), Bitácora de maquinaria (T18). **La T22 comprueba que no quede ninguna.**
  - **Rutas viejas** (las 13 de `src/app/panel/*.tsx` salvo `index` y `laboratorio/[id]`) → `redirigir-a-ruta-nueva.tsx` con `rutaNueva` y los parámetros de `window.location.search` (RF-47).

  **Visto en Chrome** (dev, gerencia, cada dirección en un marco de 1280 px):
  - `/panel/occ` → `/panel/occ/empresa`.
  - Abren su pantalla: `elemental/obras`, `geolab/laboratorio`, `occ/vehiculos` y `proyectos/<obra>/bitacoras?fecha=…`; las pendientes muestran su aviso.
  - `occ/inventada` y `proyectos/<obra>/inventada` → «No existe».
  - Viejas:
    - `/panel/bitacoras?fecha&obraId` → `proyectos/<obra>/bitacoras?fecha=…` (sin `obraId`).
    - `/panel/bitacoras?fecha` → `/panel/proyectos?ir=bitacoras&fecha=…`.
    - `/panel/vehiculos` → `occ/vehiculos`; `/panel/laboratorio` → `geolab/laboratorio`; `/panel/asistente` → `elemental/asistente`.
    - `/panel/reportes?obra&pestana=calidad` → `proyectos/<obra>/reportes?pestana=calidad`.

  **Pendiente conocido**:
  - Dentro de una obra, las pantallas todavía eligen la obra con su selector y no con la de la dirección: es la T17.
  - Los módulos apagados de una obra se miran hoy solo para quien está adscrito a ella (para gerencia, todos encendidos): la T11 los lee de la obra.
  - «Sin acceso» como residente o laboratorista no se vio en el navegador (la sesión del navegador es de gerencia): lo cubren las pruebas de la regla y se verá en la demo de la T22.

  Los tres comandos en verde.
- 2026-10-27 (T11): menú lateral por empresa.
  - Reglas nuevas en `empresas.ts` con sus pruebas (584):
    - `menuDelLugar(lugar, rol, modulosDeObra)` → `{navegacion, entradas}`. «← Empresas» dentro de una empresa y «← Empresas» + «Cambiar de obra» dentro de una obra, solo para gerencia (RF-11, RF-20). En las tarjetas, las cuatro empresas; para los demás, nada.
    - `tituloDelLugar` → «<Módulo> · <Empresa>», tal cual la spec, sin «· Control de Obra OCC» (RF-48); fuera de una empresa, el título de siempre. `tituloDeLaPestana` lo usa primero.
  - `menu-lateral.tsx` reescrito sobre `menuDelLugar`: cabecera con el nombre de la empresa y, en una obra, el de la obra (RF-10); el activo es la página de la dirección; rótulos de hasta dos renglones.
  - Íconos nuevos: `empresa`, `finanzas`, `consolidado`.
  - `useObraDelLugar` (`contexto-empresa.ts`) da nombre y módulos de la obra: la gerencia los lee de `/api/panel/obras`, y quien está adscrito, de su sesión.
  - La sesión (`PersonaEnSesion` y `PersonaEnSesionFila`) trae ahora `obraNombre`.
  - `PaginaDeObra` mira los módulos de la obra real, también para gerencia (RF-18).

  **Visto en Chrome** (dev, gerencia):
  - `/panel/occ/vehiculos`: menú «← Empresas / OCC» con sus 10 páginas, Vehículos activo, pestaña «Vehículos · OCC».
  - Obra «Pruebas spec 018»: cabecera «PROYECTOS / Pruebas spec 018 (laboratorio)», «Cambiar de obra» y sus 11 páginas; pestaña «Bitácoras · Proyectos».
  - CONSORCIO SANTANDER, con Almacén, Cantera y Laboratorio apagados: no salen en su menú, y su `/almacen` → «Sin acceso».
  - Geolab: «Información de la empresa · Geolab».
  - Detalle corregido: «← Empresas» llevaba también una flecha de ícono; ahora el ícono es la casa.

  **Pendiente**:
  - Las reglas del menú de antes (`gruposDelMenu`, `GRUPOS_DEL_MENU`) quedaron sin uso salvo en sus pruebas: se quitan en la T21.
  - El Inicio para los demás roles sigue con `ENLACES_DE_MODULO`: es la T12.
  - El menú de un residente no se vio en el navegador (sesión de gerencia); lo cubren las pruebas de la regla.

  Los tres comandos en verde.
- 2026-10-27 (T12): el Inicio.
  - `pantalla-inicio.tsx`: la gerencia ve `PantallaEmpresas`; los demás van con `destinoAlEntrar` (sin destino, «Sin acceso»). El resumen de antes queda como `Portada`, exportada para la portada de la obra (T16). Ya no usa `moduloDeEntrada` ni `ENLACES_DE_MODULO`.
  - `src/features/empresas/pantalla-empresas.tsx`: una tarjeta por empresa con nombre, función, «Saldo al 25-oct-2026» y la cifra con `enPesos` —o «Sin información financiera»—; Proyectos con «Saldo de las obras al …» (RF-2, cambio del 2026-10-27) y «N obras activas» (RF-4).
  - Pulsar la tarjeta abre la empresa (RF-5); Proyectos, la lista de obras. `api.empresas.listar/editar` en el cliente.
  - **Columnas** (RNF): 1, 2 o 4, nunca 3, según `anchoDelContenido` (la regla del panel), con el ancho en CSS (`calc`) sobre el propio enlace.
    - Primero se midió con `onLayout`, pero el ancho no llegaba a la tarjeta a través del `Link`.
    - `Link` con `asChild` tampoco admite una lista de estilos en su hijo (error de expo-router): la caja va en un `View` interno, como en el menú.
  - `verificar-reglas`: `src/features/empresas` cuenta ahora como carpeta del panel en la prueba de la spec 022, que falló al importar `estado-menu` desde ahí; así también le aplica la revisión de diseño.

  **Visto en Chrome** (dev, gerencia, con dos cortes temporales `PRUEBA-033 T12`: OCC 25-oct $ 1.534.500.000 y la obra 018 20-oct −$ 45.000.000, borrados al terminar):
  - Las cuatro tarjetas: Elemental y Geolab «Sin información financiera», OCC con su saldo, Proyectos «Saldo de las obras al 20-oct-2026 −$ 45.000.000 · 3 obras activas».
  - Cuatro columnas iguales a 1536 y a 1280 px, dos a 900 y una a 390, sin desplazamiento horizontal.
  - Pulsar OCC → `/panel/occ/empresa`.
  - Captura: `capturas/t12-tarjetas.jpg`.
  - El destino del residente y del laboratorista no se vio en el navegador (sesión de gerencia): lo cubre la prueba «033/RF-6 a RF-9»; se verá en la demo de la T22.

  Los tres comandos en verde (584).
- 2026-10-27 (T13): `src/features/empresas/pantalla-informacion.tsx`.
  - **Información de la empresa** (RF-31, RF-32): formulario con los siete datos que guarda solo lo que cambió (`api.empresas.editar`), con «Datos guardados.» o el error del servidor. El botón se apaga sin cambios.
  - **Información de la obra** (RF-33), solo de lectura con campos `soloLectura`:
    - La obra: nombre, código, municipio, estado y consorcio. El consorcio sale del contrato de la 031: «No es consorcio» si no lo es, «—» sin contrato.
    - El contrato: número, tipo, estado, contratante, valor en pesos, inicio, fin, plazo y objeto. Sin contrato, «Esta obra todavía no tiene contrato registrado.».
    - Enlace a Contrato y Presupuesto de la obra.
  - Montadas en `paginas-de-empresa.tsx` en lugar de las pendientes.

  **Visto en Chrome** (dev, gerencia):
  - OCC: se escribieron una razón social y un NIT `PRUEBA-033`, «Datos guardados.», y siguen ahí tras recargar.
  - Información de las obras 018 y CONSORCIO SANTANDER, sin contrato: muestran el aviso.
  - Para ver el contrato se guardó uno temporal `PRUEBA-033-001` en Consorcio Antioquia por la API. Se vio con su consorcio, «Borrador», contratante, $ 2.500.000.000, 1-sep-2026 a 31-dic-2026 y «121 días». Captura: `capturas/t13-informacion-de-la-obra.jpg`.

  **Limpieza** (script temporal, por id/prefijo): 1 contrato y 1 evento (sin pólizas ni documentos), y OCC devuelta a vacía con `actualizado_por` nulo.

  Durante la tarea el sistema detuvo el servidor de desarrollo (8081) por falta de memoria; no se volvió a levantar. Los tres comandos en verde (584).
- 2026-10-27 (T14): `src/features/empresas/pantalla-finanzas.tsx`, montada en `finanzas` de Elemental, OCC, Geolab y de cada obra.
  - **Último corte** (RF-37, RF-38): con su fecha, tres cifras (saldo, por pagar, por cobrar) y debajo de cada una la diferencia frente al anterior vigente («+$ 500.000 frente al 20-oct-2026», «Sin cambio…»), o «Primer corte registrado»; las notas. Sin cortes: «Sin información financiera. Registre el primer corte abajo.».
  - **Registrar** (RF-34 a RF-36): fecha (hoy por defecto, con el máximo en hoy), saldo, cuentas por pagar y por cobrar, y notas. Los pesos se escriben con o sin puntos (`pesosDeTexto`); mal escritos, el error va bajo su campo. Lo demás lo responde el servidor.
  - **Historial** (RF-37, RF-39): tabla del más reciente al más antiguo, con quién registró y el estado («Vigente» o «Anulado por X: motivo»), y «Anular» en los vigentes.
  - **Anular**: ventana con el motivo obligatorio (RF-39, RF-40).
  - Reglas nuevas, con prueba: `pesosDeTexto` y `textoDeDiferencia` (586). `api.cortes.de/registrar/anular/consolidado` en el cliente. `dueno` va con `useMemo`, para no pedir el listado en cada pintada.

  **Visto en Chrome** (dev, gerencia, en OCC):
  - Corte del 20-oct registrado; luego el del 25-oct: diferencias +$ 500.000 / −$ 20.000 / «Sin cambio».
  - El 25-oct repetido → «Ya hay un corte del 25-oct-2026; anúlalo para registrar otro».
  - Anulado el 25-oct con motivo → el último vuelve al 20-oct y el historial dice «Anulado por Diego: PRUEBA-033: saldo mal digitado» (captura `capturas/t14-historial-con-anulado.jpg`).
  - El 25-oct registrado otra vez con saldo −$ 45.000.000 → «−$ 46.000.000 frente al 20-oct-2026».
  - La de la obra 018 muestra su nombre y «Sin información financiera».
  - **Arreglo**: el aviso de la fecha repetida seguía en pantalla después de anular; ahora se quita al anular. Se ajusta al pintar, como `SelectorDeHora`, porque lint no deja hacerlo con un efecto.

  **Limpieza**: se borraron los 3 cortes de prueba de OCC; quedan 0. El servidor de desarrollo ya respondía en 8081: un proceso de Node que sobrevivió a la detención anterior, de unos 2 GB; se usó ese. Los tres comandos en verde.
- 2026-10-27 (T15): `src/features/empresas/pantalla-consolidado.tsx`, montada en `elemental/consolidado`.
  - Tabla «Al <hoy>» con una fila por Elemental, OCC, Geolab y cada obra («Proyectos · <obra>»), la fecha de su último corte o «Sin información financiera», saldo, por pagar, por cobrar y «Desactualizado» (`Etiqueta` de atención) si pasa de 30 días.
  - Al final la fila «Total (N con corte)» en negrilla. Debajo, la aclaración de que el total suma cortes de fechas distintas.
  - El nombre de cada fila abre su «Información financiera».
  - Los datos y el total salen de `consolidado` (regla) por `GET /api/panel/cortes/consolidado`.

  **Visto en Chrome**, con tres cortes temporales `PRUEBA-033 T15`: Elemental 25-oct $ 800.000.000; OCC 20-sep $ 1.534.500.000, que sale «Desactualizado» (37 días); obra 018 20-oct −$ 45.000.000.
  - Geolab, SANTANDER y Antioquia: «Sin información financiera».
  - Total «(3 con corte)» $ 2.289.500.000 / $ 342.000.000 / $ 398.000.000, que cuadra a mano. Sin fila de Proyectos.
  - Pulsar OCC → `/panel/occ/finanzas`.
  - Captura: `capturas/t15-consolidado.jpg`.

  Se borraron los 3 cortes; quedan 0. Los tres comandos en verde (586).
- 2026-10-27 (T16): Proyectos.
  - `src/features/empresas/pantalla-proyectos.tsx`:
    - **Lista de obras** (gerencia): tabla con obra (enlace), consorcio, municipio y estado (RF-16).
    - El enlace respeta `?ir=<página>` y los demás parámetros de una dirección de antes (RF-47; lo que dejó pendiente la T2).
    - Quien no es gerencia ve su obra, o «No tienes obras asignadas; pide acceso a gerencia.».
  - **Portada de la obra** (`/panel/proyectos/<obra>`): el `Portada` del Inicio de antes, ahora con `obraId`.
    - Gerencia ve «Cómo va la obra» y el residente «Su obra hoy».
    - Sin acceso a la obra, «Sin acceso».
  - **API**:
    - `GET /api/panel/resumen` acepta `?obraId=`: cada `filtroDeObra` suma `eq(obra)` y las pólizas se filtran por obra (RF-19). `api.resumen.de(periodo, obraId)`.
    - `GET /api/panel/obras` trae `consorcio` (del contrato, solo si es consorcio y tiene nombre), con `ObraFila.consorcio?`.

  **Visto en Chrome** (dev, gerencia):
  - `/panel/bitacoras?fecha=2026-10-08` → lista de Proyectos con las 3 obras (captura `capturas/t16-proyectos.jpg`). El consorcio sale «—» porque en dev ninguna obra tiene contrato; el valor con contrato se vio en la T13 (Información de la obra).
  - Elegir la obra 018 → `/panel/proyectos/<obra>/bitacoras?fecha=2026-10-08`, «Bitácoras · Proyectos».
  - Portada de la obra: «Cómo va la obra», con su menú y «Resumen del día · Proyectos».
  - El resumen del último mes por la API: todas 13 bitácoras, la obra 018 12 y SANTANDER 0.
  - El aviso «No tienes obras asignadas» y «Su obra hoy» del residente no se vieron en el navegador (sesión de gerencia): se verán en la demo de la T22.

  Los tres comandos en verde (586).
- 2026-10-27 (T17): pantallas con obra fija. El mismo patrón en todas: `useObraDeLaRuta()`; la obra efectiva es la de la dirección o, si no hay, la del selector (renombrado `obraDelSelector`/`…Elegido`); el selector «Obra» solo sale para gerencia fuera de una obra.
  - **Bitácoras** (`pantalla-partes`).
  - **Almacén**: alta y filtro.
  - **Cantera**.
  - **Laboratorio**: en Geolab sigue con «Todas», RF-26.
  - **Reportes** y **Contrato**: no ponen la primera obra activa en la dirección cuando la obra viene en la ruta.
  - **WhatsApp**: el historial y las cuatro pestañas con selector propio (Estado del día, No se pudo guardar, Creado automáticamente, Reportes esperados), con un script sobre el mismo patrón.
  - **Personas**: lista con `?obraId=` (RF-28); al registrar, la persona queda en esa obra; sin el filtro de obra.
  - **Asistente** (RF-30): `pantalla-asistente` manda `obraId` de la ruta al preguntar, y el recuadro de la portada de la obra lleva al asistente de esa obra.
  - **Decisión** (para que el usuario la revise): «Grupos de WhatsApp» (asociar cada grupo a su obra) es de todas las obras y ya no sale dentro de una obra. La gerencia lo tiene en Reportes de WhatsApp de OCC, donde no hay obra en la ruta.

  **Visto en Chrome** (dev, gerencia, obra 018, cada página en un marco de 1280 px):
  - Bitácoras, Almacén, Cantera, Laboratorio, Reportes, Contrato, WhatsApp, Personas y Asistente: ninguna con rótulo «Obra» ni «Elija la obra»/«Todas las obras».
  - La primera revisión encontró el selector de «Grupos de WhatsApp»; se resolvió con la decisión de arriba.
  - `bitacoras?fecha=2026-10-08` abre directo la bitácora «Pruebas spec 018 (laboratorio) · Abierto».
  - WhatsApp no muestra nada de otras obras.

  Los tres comandos en verde (586).
- 2026-10-27 (T18): OCC.
  - **Bitácora de maquinaria** (`src/features/empresas/pantalla-maquinaria.tsx`, RF-22): selector de obra («Todas las obras») y fechas Desde/Hasta (el `CamposDeFechas` de WhatsApp, en la dirección), tabla paginada con día, obra, equipo, operador, lecturas con su unidad, avance, observaciones y si la bitácora está abierta o cerrada. El día abre la bitácora de esa obra y ese día. El avance se redondea a un decimal: «3.6000000000002» → «3,6 km».
  - **Reportes** (RF-25): regla `pestanasDeReportes` en `empresas.ts`, con prueba (587). En OCC, Máquinas y Mantenimiento, con el selector de obra (decisión aprobada); en Geolab, Control de calidad, que se deja hecho para la T19; en una obra, todas.
  - **WhatsApp de OCC** (RF-23): el historial se pide con `empresa=occ`. Las otras pestañas (Estado del día, No se pudo guardar, Creado automáticamente, Reportes esperados) son del día de cada obra y en OCC no salen. «Grupos de WhatsApp» queda aquí (ver T17).
  - **Personas** (RF-28): en una empresa se piden con `?empresa=`, y dentro de una obra con `?obraId=`. Vale ya para Elemental, OCC y Geolab.
  - Ya no queda ninguna pantalla pendiente: se quitaron `pendiente` y `PantallaPendiente`.

  **Visto en Chrome** (dev, gerencia):
  - Bitácora de maquinaria del 1-sep al 27-oct con todas sus filas, y la del 8-oct con avances «3,6 km / 4 h / 0 km / 0 km». Captura: `capturas/t18-bitacora-de-maquinaria.jpg`.
  - Reportes de OCC: solo «Máquinas» y «Mantenimiento».
  - WhatsApp de OCC del 1-sep al 27-oct: solo «Suministro o cantera» (8) y «Vehículo o maquinaria» (7), con una sola pestaña, «Historial».
  - Personas de OCC: «52 registros».

  Los tres comandos en verde (587).
- 2026-10-27 (T19): Geolab. **Sin cambios de código**: lo necesario quedó hecho en la T17 (Laboratorio con selector y «Todas» fuera de una obra) y en la T18 (`pestanasDeReportes` y Personas por empresa). Esta tarea lo comprueba.

  **Visto en Chrome** (dev, gerencia):
  - **Laboratorio** (RF-26): con ejecución desde el 1-ene-2026 salen 5 granulometrías, todas de PRUEBA-018, la única obra de dev con laboratorio encendido. El selector solo ofrece esa obra; al elegirla, la lista sigue igual y «Nuevo ensayo» se activa (captura `capturas/t19-laboratorio-con-filtro.jpg`). Como en dev no hay otra obra con ensayos, que el filtro cambia la lista se comprobó por la API: todas 5, la obra 018 5, SANTANDER 0.
  - **Reportes de laboratorio** (RF-27): una sola pestaña, «Control de calidad», con el selector de obra y el periodo. Semana del 14 al 20-sep: 2 ensayos; mes de septiembre: 3 (captura `capturas/t19-reportes-de-laboratorio-mes.jpg`). La pestaña del navegador dice «Reportes de laboratorio · Geolab».
  - **Personas de Geolab** (RF-28): «1 registro», la laboratorista.

  **Detalle visto, sin tocar**: la descripción de la pantalla de Reportes sigue nombrando todas las pestañas («máquinas, mantenimiento, personal…») también en Geolab y OCC; se puede ajustar en la T21 si el usuario quiere.

  Los tres comandos en verde (587).
- 2026-10-27 (T20): campo «Empresa» en Personas (`pantalla-personas.tsx`).
  - **Al registrar** (RF-45): selector obligatorio con las cuatro empresas, propuesto con la del lugar (en una obra, Proyectos); sin empresa no deja registrar. Se manda `empresa` y, al terminar, vuelve a la propuesta.
  - **Al corregir**: la empresa como se ve (la suya o la de su rol, RF-46); solo se manda si cambia.
  - `OPCIONES_DE_EMPRESA` sale de `EMPRESAS`.

  **Visto en Chrome** (dev, gerencia):
  - En Geolab › Personas, «Empresa» viene en «Geolab». Se registró `prueba-033-t20` «PRUEBA-033 Persona de Geolab» (acceso Operador) → «quedó registrada», y la lista de Geolab pasó a 2 (captura `capturas/t20-persona-en-geolab.jpg`).
  - Corregida a OCC → «quedó corregida»: Geolab vuelve a 1 y OCC pasa de 52 a 53.
  - Por la API: sale con `?empresa=occ` y no con `geolab`; en la base, `empresa = 'occ'`.

  **Limpieza**: se borró la persona (sin referencias); quedan 0 personas con empresa guardada. Los tres comandos en verde (587).
- 2026-10-27 (T21): revisión de enlaces y cierre de lo de antes.
  - **Enlaces a las rutas nuevas**: los botones de la bandeja de WhatsApp («Ver viajes», «Ver almacén», «Ver bitácora») van a la obra del mensaje; «Ver bitácora» de Estado del día, ensayos de obra y pestañas de obra, con `rutaDeObra`; la portada de la obra (pólizas y atajos del residente); los enlaces que arma el asistente (`herramientas.ts`). Quedan dos que pasan por la redirección de antes y llegan bien: el respaldo `/panel/asistente` del recuadro del inicio y el `router.replace('/panel/laboratorio')` de `acciones-ensayo.tsx`.
  - **Cambio a RF-17** (decisión del usuario): el residente tenía Preoperacionales y Asignaciones y, como solo entra a su obra, los perdía. Ahora van en el menú de cada obra, filtrados a esa obra: `?obraId=` en `/api/preoperacionales` y `/api/asignaciones` con `filtroDeObraPedida` (nuevo en `alcance.ts`, que también usa el resumen); el filtro de equipos y operadores, solo los de la obra. Las rutas de antes llevan a gerencia a OCC y a los demás a su obra. Prueba nueva: todo lo que el residente veía antes sigue en algún menú suyo (RF-21).
  - **Menú de antes quitado**: `gruposDelMenu` y `GRUPOS_DEL_MENU` con sus cinco pruebas (587 → 582).
  - **Reportes**: la descripción de la pantalla nombra solo las pestañas del lugar.
  - **Dos arreglos de sesión**: `/api/auth/yo` no devolvía `obraNombre` y, al ingresar, la sesión no traía los módulos de la obra; `ingresar` ahora vuelve a pedir `quienSoy`.
  - **`expo export`**: sin fugas (ni `DATABASE_URL`, ni llaves de Anthropic, R2, tokens o `postgresql://` en `dist/client`); `dist` borrado.

  **Visto en Chrome** (dev, gerencia): en la obra 018, el menú lleva Preoperacionales y Asignaciones; ambas páginas cargan con lo de esa obra (Asignaciones (0), sin las de otras obras).

  Los tres comandos en verde (582).
- 2026-10-27 (T24, cambio de menús definitivos, explicado por el usuario antes de la T22): RF-13 a RF-17, RF-22, RF-28 y RF-49 a RF-53 en spec.md.
  - **Menús** (`rules/empresas.ts`): Elemental = Recursos Humanos, Compras, Tesorería, Documentos, Licitaciones (enlace externo a LicitApp, pestaña nueva) y Asistente. OCC = Reportes de WhatsApp, Bitácora (la de maquinaria de todas las obras mientras llega la 038), Documentos, Reportes de vehículos y maquinaria, Vehículos, Preoperacionales, Asignaciones, Solicitudes de compra y de pago, Asistente. Geolab = Bitácora, Reportes de WhatsApp, Laboratorio, Reportes de laboratorio, Documentos, Solicitudes, Asistente. Obra = Bitácoras, Reportes de WhatsApp, Reportes e informes, Recursos Humanos, Calidad (el Laboratorio, con su interruptor), Almacén, Preoperacionales, Asignaciones, Control Cantera, Contrato y Presupuesto, Solicitudes, Asistente.
  - **Permisos nuevos** (`rules/permisos.ts`): `rrhh` (gerencia; el residente consulta), `compras` y `tesoreria` (gerencia, con `aprobar`), `documentos`, `licitaciones` (gerencia) y `solicitudes` (gerencia, residente, almacenista y laboratorista).
  - **Pantallas**: Recursos Humanos de Elemental = Personas y Obras en pestañas (`pantalla-recursos-humanos.tsx`, `?pestana=obras`). Compras, Tesorería, Documentos, Solicitudes, Bitácora de Geolab y Recursos Humanos de la obra muestran «Este módulo está en construcción» (`PantallaEnConstruccion`) hasta su spec (034 a 038). Borradas `pantalla-informacion.tsx` y `pantalla-consolidado.tsx`; `pantalla-finanzas.tsx` se queda para Tesorería (037). Las API de empresa, cortes y consolidado no se tocaron: las tarjetas siguen leyendo los cortes.
  - **Rutas**: `rutaRenombrada` (RF-52) lleva empresa/finanzas/consolidado/obra a Tesorería, personas y obras a Recursos Humanos, maquinaria a Bitácora y el laboratorio de la obra a Calidad; `rutaNueva` lleva `/panel/obras` y `/panel/personas` a Recursos Humanos. Enlaces del asistente a Calidad y Recursos Humanos de la obra.
  - Íconos nuevos: compras, documentos, licitaciones; quitado el de consolidado.

  Los tres comandos en verde (585: 3 pruebas nuevas, RF-49, RF-51, RF-52). **Falta verlo en Chrome** (la pestaña no cargó en esta sesión).

  **Visto en Chrome** (2026-10-28, dev, gerencia): los menús de Elemental, OCC, Geolab y Consorcio Antioquia coinciden con la tabla del plan. En Consorcio Antioquia no sale Calidad porque tiene el laboratorio apagado (spec 017). RR. HH. tiene las pestañas Personas y Obras. Compras de Elemental y la Bitácora de Geolab muestran «en construcción». **Arreglo**: Licitaciones abría LicitApp en la misma pestaña, porque `Link` con `asChild` pierde el `target`. Ahora el enlace externo va sin `Link`, con `Linking.openURL`, y abre en una pestaña nueva (visto). `menu-lateral.tsx` quedó reformateado con Prettier (comillas simples, 100 columnas). Falta ver el menú del residente y del laboratorista. En Grupos de WhatsApp de OCC quedan grupos de prueba viejos (`prueba-t24@g.us`, «PRUEBA T11 spec 021», «PRUEBA T19») para la limpieza de la T22.
- 2026-10-29 (T22): `validacion.md` RF por RF (RF-1 a RF-53, no funcionales y casos límite). Sin `PantallaPendiente` en `src/`. Demo en Chrome (127.0.0.1, sesiones temporales, cada dirección en un marco del mismo origen): la residente entra a «Su obra hoy» (captura `capturas/t22-residente-su-obra.jpg`) y ve «Sin acceso» en OCC, Geolab, Elemental y otra obra; la laboratorista entra a «Laboratorio · Geolab» y ve «Sin acceso» en OCC, Proyectos y una obra; el almacenista a «Almacén · Proyectos» y la encargada de planta a «Control Cantera · Proyectos»; un residente PRUEBA-033 sin obra ve «No tienes obras asignadas; pide acceso a gerencia.»; gerencia, las cuatro tarjetas («Sin información financiera», «3 obras activas»), OCC en su primera página y la lista de Proyectos. **Tres arreglos de la demo:** (1) RF-52: `rutaRenombradaPara(lugar, persona)` lleva al Inicio del rol cuando la página nueva es de una empresa a la que no entra (la residente iba a Tesorería con «Sin acceso»); (2) RF-47: `/panel/personas` lleva a quien no entra a Elemental a Recursos Humanos de lo suyo (`recursosHumanosDe`: Encargado a OCC, laboratorista a Geolab, residente a su obra) o a su Inicio, y Obras de antes al Inicio; (3) RF-12: `menuDelLugar` acepta la persona y deja el menú vacío donde no entra (la residente veía el menú de OCC al lado del «Sin acceso»; `menu-lateral.tsx` le pasa la persona). Casos nuevos dentro de las pruebas de RF-47, RF-52 y del menú lateral. Los tres vueltos a ver en Chrome. Limpieza: el residente PRUEBA-033 y las 7 sesiones de la demo; al cierre 0 personas PRUEBA-033, 0 cortes, 0 contratos PRUEBA-033, empresas sin datos. Quedan en dev 3 grupos de WhatsApp de la spec 021 y 5 vehículos PRUEBA de specs anteriores, no tocados (tienen registros colgados; se borran si el usuario lo pide). Spec marcada «Cumplida en dev». Los tres comandos en verde (609).
