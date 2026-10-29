# Plan técnico — Spec 033

> Lee antes `docs/constitucion.md` y el `spec.md` de esta carpeta.
> Aquí va el CÓMO. Si algo de esto cambia el comportamiento acordado, no se resuelve
> en el plan: se vuelve a la spec.

## Módulos y archivos

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `src/shared/rules/empresas.ts` (nuevo) | `EMPRESAS` (las cuatro fijas: id, nombre, función en una línea); `menuDeEmpresa(empresa, rol, modulosDeObra)`; `menuDeObra(rol, modulosDeObra)`; `destinoAlEntrar({rol, obras})`; `alcanzaLaEmpresa(rol, empresa)`; `empresaDeLaPersona(empresa, rol)`; `rutaNueva(rutaVieja, persona)` para enlaces de antes. Puro. | RF-1, RF-5 a RF-21, RF-28, RF-29, RF-46, RF-47 |
| `src/shared/rules/cortes.ts` (nuevo) | `validarCorte(corte, hoy, vigentes)` (futura, repetida, negativos), `ultimoCorte`, `diferenciaConElAnterior`, `consolidado` (fila por Elemental, OCC, Geolab y obra + total), `resumenDeProyectos` (tarjeta), `estaDesactualizado(fecha, hoy)` (> 30 días). Los pesos con `enPesos` de `rules/pesos.ts` (spec 031), que ya escribe `$ 1.234.567`. Puro. | RF-34 a RF-43, RNF |
| `src/shared/rules/permisos.ts` | Permisos nuevos `empresa` (información de empresa/obra) y `finanzas` (cortes y consolidado), solo gerencia, en `MODULOS_DE_EMPRESA` (aparte de `MODULOS`: no van en el menú de antes). Sin cambiar lo que hoy ve cada rol. | RF-21, RF-32, RF-44 |
| `src/db/servidor/esquema.ts` | Tablas `empresas` y `cortes_financieros`; columna `usuarios.empresa`. | RF-31, RF-34, RF-45 |
| `src/app/api/panel/empresas+api.ts`, `empresas/[id]+api.ts` | Listar las cuatro con su último corte (para las tarjetas) y editar los datos (gerencia). | RF-2, RF-3, RF-4, RF-31, RF-32 |
| `src/app/api/panel/cortes+api.ts`, `cortes/[id]/anular+api.ts`, `cortes/consolidado+api.ts` | Registrar, listar por empresa u obra, anular con motivo, consolidado. Solo gerencia. | RF-34 a RF-44 |
| `src/app/api/panel/personas…` | `empresa` al crear/editar y filtro `?empresa=` / `?obraId=`. | RF-28, RF-45, RF-46 |
| `src/app/api/panel/partes/maquinaria+api.ts` (nuevo) | La sección Maquinaria de las bitácoras de todas las obras, con filtro de obra y fechas. Va en `partes/` y no en `bitacoras/`, que es la bitácora del vehículo (spec 001). | RF-22 |
| `src/app/api/panel/whatsapp/…` | Filtro `?empresa=occ` → categorías de vehículos y maquinaria. | RF-23, RF-24 |
| `src/app/api/panel/asistente/preguntar+api.ts`, `features/asistente/servidor/preguntar.ts` | Campo opcional `obraId`: la obra por defecto de la conversación. | RF-30 |
| `src/app/panel/…` (rutas) | Rutas por empresa (ver «Rutas») que reutilizan las pantallas de hoy; las rutas viejas redirigen. | RF-5, RF-13 a RF-20, RF-47 |
| `src/features/panel/contexto-empresa.tsx` (nuevo) | `useContextoEmpresa()`: empresa y obra de la ruta. Las pantallas lo leen para fijar la obra y esconder su selector. | RF-10, RF-19 |
| `src/features/panel/menu-lateral.tsx`, `src/shared/rules/menu.ts` | El menú sale de `menuDeEmpresa`/`menuDeObra`; cabecera con empresa (y obra); «← Empresas» y «Cambiar de obra». | RF-10, RF-11, RF-13 a RF-18, RF-20 |
| `src/features/panel/pantalla-inicio.tsx` | Gerencia: las cuatro tarjetas. Otros roles: `destinoAlEntrar`. El resumen de hoy pasa a OCC/Proyectos (ver Decisiones). | RF-1 a RF-9 |
| `src/features/empresas/*` (nuevo) | Pantallas: tarjetas, Información de la empresa, Información de la obra, Información financiera, Consolidado, lista de obras de Proyectos, Bitácora de maquinaria. | RF-1 a RF-4, RF-16, RF-22, RF-31 a RF-43 |
| Pantallas con selector de obra: `pantalla-partes`, `pantalla-almacen`, `pantalla-cantera`, `pantalla-laboratorio`, `pantalla-reportes`, `pantalla-contrato`, `whatsapp/pantalla-bandeja`, `pantalla-personas` | Si el contexto trae obra, la usan y no muestran el selector. | RF-19, RF-24, RF-28 |
| `src/features/panel/modulos.ts` | `tituloDeLaPestana` con la empresa: «<Módulo> · <Empresa>». | RF-48 |
| `scripts/verificar-reglas.ts` | Casos nuevos (ver Verificación). | — |

## Rutas

Una sola pantalla por módulo, montada en varias rutas. La ruta dice la empresa (y la obra); el menú y las pantallas lo leen de ahí.

| Ruta | Qué es |
| --- | --- |
| `/panel` | Gerencia: las cuatro tarjetas. Otros: redirige a su destino (RF-6 a RF-9). |
| `/panel/elemental/{empresa,finanzas,consolidado,obras,personas,asistente}` | Elemental (RF-13). |
| `/panel/occ/{empresa,finanzas,maquinaria,whatsapp,preoperacionales,reportes,personas,vehiculos,asignaciones,asistente}` | OCC (RF-14). |
| `/panel/geolab/{empresa,finanzas,laboratorio,reportes,personas,asistente}` | Geolab (RF-15). |
| `/panel/proyectos` | Lista de obras (RF-16). |
| `/panel/proyectos/[obra]/{obra,finanzas,whatsapp,reportes,bitacoras,preoperacionales,asignaciones,cantera,almacen,laboratorio,personas,contrato,asistente}` | Una obra (RF-17 a RF-20). |
| `/panel/laboratorio/[id]` y `/informe` | Siguen igual (el ensayo es de una obra; se llega desde Geolab o desde la obra). |
| Rutas de antes (`/panel/bitacoras`, `/panel/vehiculos`, …) | Redirigen con `rutaNueva` (RF-47): las de obra a `/panel/proyectos/<obra>/…` con la obra de `?obraId=`/`?obra=` o la del usuario; las de OCC/Geolab a su empresa; conservan los demás parámetros. |

## Modelo de datos

- **Local** (`src/db/local/schema.ts`): sin cambios.
- **Servidor** (`src/db/servidor/esquema.ts`):
  - `empresas`: `id text pk` (`elemental`, `occ`, `geolab`, `proyectos`), `razon_social`, `nit`, `direccion`, `ciudad`, `telefono`, `correo`, `representante_legal` (texto, `''` por defecto), `actualizado_por`, `actualizado_en`. La migración inserta las cuatro filas vacías (son fijas, RF fuera de alcance «crear o quitar empresas»).
  - `cortes_financieros`: `id`, `empresa_id text null → empresas` (nunca `proyectos`: check), `obra_id text null → obras`, check «exactamente uno de los dos», `fecha_corte date`, `saldo bigint`, `cuentas_por_pagar bigint`, `cuentas_por_cobrar bigint` (pesos sin decimales, como el valor del contrato de la 031; los tres obligatorios; solo el saldo puede ser negativo), `notas text`, `registrado_por`, `registrado_en`, `anulado_en`, `anulado_por`, `motivo_anulacion`. Índice único parcial `(coalesce(empresa_id, obra_id), fecha_corte) where anulado_en is null` (RF-36).
  - `usuarios.empresa text null` con check en las cuatro; null = «la de su rol» (RF-46).
- **Migraciones**: `npm run db:generate:servidor` → `drizzle/servidor/0032_dapper_mattie_franklin.sql`, más el `insert … on conflict do nothing` de las cuatro empresas a mano al final del mismo archivo (es igual en las dos bases). `empresas` va en los disparadores de `actualizado_en`.
- **Compatibilidad**: el celular no se entera; ninguna columna nueva viaja al pull.

## Algoritmo / reglas

**Destino al entrar (RF-6 a RF-9)** — `destinoAlEntrar({rol, obraId})`:
1. `admin` → `/panel` (tarjetas).
2. `supervisor` → `/panel/proyectos/<obraId>` (la portada de la obra: el resumen del día, el Inicio de antes); sin obra o con varias → `/panel/proyectos` (con «No tienes obras asignadas; pide acceso a gerencia» si no tiene ninguna).
3. `laboratorista` → `/panel/geolab/laboratorio`.
4. `almacenista` / `encargado_planta` → `/panel/proyectos/<obraId>/almacen` / `…/cantera` (su módulo, como hoy).
5. Hoy cada persona tiene **una** obra (`usuarios.obra_id`): la regla recibe la lista de obras, así que RF-7 (varias obras → lista) ya se cumple si un día tiene más; no cambia el esquema (ver Decisiones).

**Rutas viejas (RF-47)** — `rutaNueva(direccion, persona)`: `/panel/<pantalla>` de antes → su página en Elemental u OCC, o dentro de una obra. La obra sale de `?obraId=` u `?obra=` (y se quita de los parámetros) si es gerencia, o es la suya si no. Gerencia sin obra en la dirección → `/panel/proyectos?ir=<pagina>`, que la lleva allí al elegir una obra (T16). Laboratorio y Asistente sin obra → Geolab (laboratorista) o Geolab/Elemental (gerencia). El ensayo `/panel/laboratorio/<id>` sigue igual.

**Acceso (RF-12, RF-21)** — `alcanzaLaEmpresa(rol, empresa)`: gerencia todas; residente, almacenista y encargado solo Proyectos y **su** obra; laboratorista Geolab (y el Laboratorio de su obra). Lo ajeno → «No tienes acceso a esta sección». Dentro, cada módulo sigue con `alcanza(rol, modulo, accion)` y las APIs con `requerirPermiso` + `alcance.ts`: el menú solo reparte (RF-21).

**Menús (RF-13 a RF-18, RF-29)** — tablas fijas por empresa en `empresas.ts`, filtradas por `alcanza(rol, modulo, 'ver')` y, en una obra, por `moduloApagado` (spec 017).

**Corte (RF-35, RF-36, RF-40)**:
1. `fecha > hoy` (fecha de la jornada en Bogotá) → «La fecha de corte no puede ser futura».
2. Hay un vigente con la misma fecha y el mismo dueño → «Ya hay un corte del <fecha>; anúlalo para registrar otro». El índice único lo garantiza también en la base (409).
3. No hay PATCH: solo `POST` y `anular`.

**Diferencia (RF-38)**: último vigente menos el vigente anterior, por valor; sin anterior, sin diferencia.

**Consolidado (RF-41 a RF-43)**: una fila por Elemental, OCC y Geolab y una por obra no eliminada (más las dadas de baja que tengan corte, caso límite), las obras bajo el título Proyectos; cada fila con su último corte vigente o «Sin información financiera»; total = suma de las filas con corte; `Desactualizado` si `hoy − fecha > 30` días.

**Tarjeta de Proyectos (RF-2, RF-3)**: suma de los saldos del último corte vigente de cada obra activa, con la fecha del más antiguo; sin ninguno, «Sin información financiera».

**Empresa de la persona (RF-46)**: `empresa ?? {operador: occ, laboratorista: geolab, supervisor|almacenista|encargado_planta: proyectos, admin: elemental}[rol]`.

**WhatsApp de OCC (RF-23)**: categorías `vehiculo_maquinaria` y `suministro_cantera` (volquetas). En una obra (RF-24): todas las de esa obra.

## Decisiones técnicas

- **La empresa y la obra van en la ruta** (`/panel/occ/vehiculos`, `/panel/proyectos/<obra>/bitacoras`) → se descartó guardarlas en un estado o en `?empresa=` porque un enlace copiado, recargado o abierto en otra pestaña tiene que abrir lo mismo, y el menú se decide sin consultar nada.
- **Las pantallas de hoy se reutilizan** leyendo la obra del contexto → se descartó copiar cada pantalla por empresa, porque duplicaría ~15 pantallas y sus arreglos. El selector de obra sigue donde no hay obra en la ruta (OCC, Geolab).
- **Las cuatro empresas son filas fijas sembradas por la migración** → se descartó un enum en código sin tabla, porque sus datos (NIT, dirección…) se editan y necesitan dónde guardarse.
- **`usuarios.empresa` nula = la del rol, calculada al leer** → se descartó rellenarla en la migración, porque las personas que crea WhatsApp (spec 026) nacen sin ella y la regla tendría que estar igual en dos sitios.
- **Un residente sigue con una sola obra** → se descartó una tabla persona↔obras para RF-7, porque la spec no pide asignar varias obras y el esquema actual (`usuarios.obra_id`) no lo permite; la regla de destino ya trata la lista para cuando exista.
- **El resumen de hoy (Inicio actual)** pasa a ser la portada de una obra en Proyectos (para el residente) y deja de ser la portada de gerencia → se descartó perderlo, porque es lo que hoy usa el residente.
- **«Reportes de vehículos y maquinaria» de OCC = pestañas Máquinas y Mantenimiento de Reportes con el selector de obra** → se descartó un reporte nuevo que sume todas las obras, porque cada máquina trabaja en una obra y el Excel ya va por obra. (Confirmado por el usuario el 2026-10-27, como las de WhatsApp de OCC, el residente con una obra y Proyectos sin corte propio.)
- **Geolab › Reportes de laboratorio = pestaña Control de calidad de Reportes, con selector de obra y rango** → igual criterio.

## Impacto en la sincronización

Sin impacto en la sincronización.

## Contrato de API

Todas con `requerirPermiso` y `alcance.ts`.

- `GET /api/panel/empresas` → `[{id, nombre, funcion, datos, ultimoCorte | null, obrasActivas?}]` (gerencia). `PATCH /api/panel/empresas/[id]` → datos (gerencia; 403 a otros).
- `GET /api/panel/cortes?empresa=…|obraId=…` → vigentes y anulados, del más reciente al más antiguo, con la diferencia del último. `POST /api/panel/cortes` → 201; 400 fecha futura; 409 fecha repetida. `POST /api/panel/cortes/[id]/anular` `{motivo}` → 200; 400 sin motivo. `GET /api/panel/cortes/consolidado`. Todas: 403 si no es gerencia (RF-44).
- `GET /api/panel/partes/maquinaria?obraId=&desde=&hasta=` → filas `{fecha, obra, equipo, operador, inicial, final, avance, observaciones, estado de la bitácora}`.
- `GET /api/panel/personas?empresa=…|obraId=…`; `POST/PATCH` con `empresa`.
- `GET /api/panel/whatsapp/propuestas?…&empresa=occ`.
- `POST /api/panel/asistente/preguntar` con `obraId` opcional (403/404 si no la alcanza).

## Estrategia de verificación

- **`scripts/verificar-reglas.ts`**: menú de cada empresa por rol y con módulos apagados (RF-13 a RF-18, RF-21, RF-29); `destinoAlEntrar` por rol, con y sin obra (RF-6 a RF-9); `alcanzaLaEmpresa` (RF-12); `validarCorte` futura y repetida (RF-35, RF-36); diferencia (RF-38); consolidado y total (RF-41); desactualizado a 30 y 31 días (RF-43); `empresaDeLaPersona` (RF-46); `rutaNueva` de las rutas viejas (RF-47); `pesos` (RNF).
- **Demo manual**: la de los criterios de finalización de la spec, con datos `PRUEBA-033` en dev y sesiones de gerencia, residente y laboratorista; tarjetas a 390 px y en ventana ancha.
- **Comprobaciones extra**: `npx expo export --platform web` (rutas nuevas) y `grep -r DATABASE_URL dist/client` vacío; `rm -rf dist`.

## Riesgos

- **Enlaces viejos rotos** (WhatsApp, PDF, marcadores, el asistente que abre `/panel/reportes?obra=…`). Se mitiga con `rutaNueva` y su prueba; se revisan los `router.push` y `Link` del código con `grep "/panel/"`.
- **Una pantalla que siga mostrando su selector o datos de otra obra dentro de una obra.** Se revisa una por una en Chrome (T de pantallas).
- **El residente pierde su portada.** Se conserva como portada de la obra.
- **Migración con datos** (las cuatro empresas): `insert … on conflict do nothing`, para que repetirla no falle.
- **Proyectos sin corte propio** (decisión del usuario, 2026-10-27) → se descartó que tuviera su corte además del de sus obras, porque el total del Consolidado contaría dos veces.
- **Despliegue junto con la 032**: el usuario quiere revisar las dos antes de producción; las migraciones 0031 y 0032 van en orden.
