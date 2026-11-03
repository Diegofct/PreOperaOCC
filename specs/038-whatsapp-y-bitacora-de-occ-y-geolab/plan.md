# Plan técnico — Spec 038 WhatsApp y Bitácora de OCC y Geolab

> Estado: Aprobado (2026-11-03, con los mantenimientos de RF-9h) · Fecha: 2026-11-03 · Spec aprobada el 2026-11-03.
> Lee antes `docs/constitucion.md` y el `spec.md` de esta carpeta.

## Idea general

El grupo de OCC entra por el mismo camino que los de obra (recepción, pulso, guardado
automático de la 024), y se separa en un solo punto: **el dueño del grupo**. Si el grupo
es de una empresa, `procesarMensaje` no llama a la bitácora de la obra sino a la de la
empresa. Todo lo demás se reutiliza tal cual: idempotencia, «No se pudo guardar», espera
de archivos, medidores, Fotos del día.

La bitácora de OCC es un documento por empresa y por día, igual que `partes_de_obra`:
cada sección es una lista en `jsonb` con ids fijos por renglón. Así repetir un mensaje
no duplica nada, y cerrar o anular funciona como en las obras.

## Módulos y archivos

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `src/shared/rules/bitacora-occ.ts` (nuevo) | Tipos de la bitácora de OCC, día de la lista y «Fecha dudosa», reemplazo de la lista, cambios de estado en el día, mezcla de renglones con id fijo, conteo operativos/inoperativos, faltas para cerrar | RF-8 a RF-9g, RF-15, RF-24 |
| `src/shared/rules/whatsapp.ts` | `reconocerEquipoDeEmpresa`: placa → nombres en WhatsApp → tipo y marca → **placa parecida**; `placaParecida` (distancia 1 con transposición); `duenoDelGrupo` (obra o empresa, nunca las dos) | RF-1, RF-2, RF-12 a RF-12c |
| `src/shared/rules/whatsapp-automatico.ts` | `TIPOS_DE_REPORTE` gana `lista_equipos` e `informe_mantenimiento`; categorías nuevas `lista_equipos`, `trabajo_mantenimiento`, `informe_mantenimiento` y su destino `bitacora_empresa` | RF-9, RF-9e, RF-16 |
| `src/shared/rules/empresas.ts` | Pestañas de la Bitácora de OCC; la Bitácora de Geolab deja de estar «en construcción» | RF-22, RF-27, RF-29 |
| `src/db/servidor/esquema.ts` | Ver «Modelo de datos» | RF-1, RF-7, RF-12, RF-16, RF-20 |
| `src/features/panel/contratos.ts` | `propuestaDeIa` acepta el bloque `occ` (opcional); pedidos y respuestas de la bitácora de OCC, del grupo con empresa, del filtro de origen | RF-6, RF-25 |
| `src/features/whatsapp/servidor/obra.ts` | `empresaDelMensaje` junto a `obraDelMensaje` (mismo criterio: la decidida, si no, la del grupo) | RF-4, RF-26 |
| `src/features/whatsapp/servidor/automatico.ts` | Si el grupo es de empresa → `procesarMensajeDeEmpresa`; si no tiene dueño → `sin_obra` como hoy | RF-5, RF-10 |
| `src/features/whatsapp/servidor/empresa.ts` (nuevo) | Procesar un mensaje de OCC: leer la propuesta, reconocer equipos, apartar a «No se pudo guardar», escribir en la bitácora del día con id fijo, medidores | RF-9 a RF-15, RF-19 |
| `src/features/whatsapp/servidor/dias-empresa.ts` (nuevo) | Esperas y armado del día de una empresa, con los esperados de la empresa | RF-16, RF-17 |
| `src/features/whatsapp/servidor/fotos-del-dia.ts` | Las fotos van también a la bitácora de una empresa (segundo dueño) | RF-8 |
| `src/features/whatsapp/servidor/{bandeja,excepciones,estado-dias}.ts` | Filtro por empresa; origen «Grupo de OCC / Obras / Todos»; excepciones de OCC completan renglones de la bitácora de OCC | RF-25, RF-26, RF-11 |
| `src/features/whatsapp/servidor/grupos` (ruta actual) | Asociar a obra **o** empresa; mover pendientes como RF-13 de la 021 | RF-1 a RF-5 |
| `src/features/empresas/servidor/bitacora-occ.ts` (nuevo) | Listar días, ver un día, corregir con versión, cerrar, anular con motivo | RF-18 a RF-20, RF-23, RF-24 |
| `src/features/empresas/servidor/laboratorio.ts` (nuevo) | Laboratorio y ensayos de las bitácoras de todas las obras | RF-27 |
| `src/app/api/panel/empresas/[id]/bitacora+api.ts` y `…/bitacora/[fecha]+api.ts`, `…/[fecha]/cerrar+api.ts`, `…/[fecha]/anular+api.ts` (nuevas) | API de la bitácora de una empresa | RF-18 a RF-24 |
| `src/app/api/panel/empresas/geolab/laboratorio+api.ts` (nueva) | API del laboratorio de las obras | RF-27 |
| `src/app/api/panel/whatsapp/{grupos/[id],esperados,dias,propuestas}+api.ts` | Aceptan empresa además de obra; `propuestas` acepta `origen` | RF-1, RF-16, RF-25 |
| `src/app/api/panel/vehiculos…` | Leer y guardar los nombres en WhatsApp del equipo | RF-12 (D11) |
| `src/features/empresas/pantalla-bitacora-occ.tsx` (nuevo) + `bitacora-occ/{lista-de-dias,dia,estado-de-equipos,trabajos,actividades,pendientes}.tsx` | Pestañas «Bitácora de OCC» / «En las obras», lista de días con estado, día abierto con sus secciones, filtros, cerrar y anular | RF-22 a RF-24 |
| `src/features/empresas/pantalla-maquinaria.tsx` | Pasa a ser la pestaña «En las obras» | RF-22 |
| `src/features/empresas/pantalla-laboratorio-de-obras.tsx` (nuevo) | Bitácora de Geolab | RF-27 |
| `src/features/empresas/paginas-de-empresa.tsx` | Monta las dos pantallas nuevas | RF-22, RF-27 |
| `src/features/panel/whatsapp/{pantalla-bandeja,no-se-pudo-guardar,reportes-esperados,grupos}.tsx` | Selector obra/empresa del grupo, filtro de origen, esperados por empresa | RF-1, RF-3, RF-16, RF-25, RF-26 |
| `src/features/panel/pantalla-vehiculos.tsx` (ficha) | Campo «Nombres en WhatsApp» | RF-12 (D11) |
| `src/features/asistente/…` | La herramienta de bitácoras puede leer la de OCC con su permiso | RF-31 |
| Repo `n8n-evolutionapi`: `contexto_occ.md` (nuevo), `scripts/generar_workflow_clasificar.py`, `scripts/generar_workflow_entrega.py`, `scripts/importar_historial.py` | Prompt y esquema propios para el grupo de OCC; el grupo en la lista autorizada y en `NOMBRES_DE_GRUPO` | RF-6, D9 |

## Modelo de datos

- **Local**: sin cambios (nada de esto va al celular).
- **Servidor** (`src/db/servidor/esquema.ts`), una sola migración `0037_*`:
  - `whatsapp_grupos.empresa_id` (texto, nulo, FK `empresas`), con
    `check (obra_id is null or empresa_id is null)` y `check (empresa_id in ('occ','geolab'))`
    (RF-1, RF-2). Índice por `empresa_id`.
  - `whatsapp_mensajes.empresa_decidida_id` (nulo): la empresa donde se guardó, escrita
    al guardar. Es la gemela de `obra_decidida_id`, para que mover el grupo deje lo
    guardado donde quedó (RF-4).
  - `vehiculos.nombres_whatsapp text[] not null default '{}'` (D11).
  - **`bitacoras_empresa`** (nueva): `id`, `empresa_id`, `fecha`, `estado_equipos jsonb`,
    `trabajos jsonb`, `actividades jsonb`, `pendientes jsonb`, `listas jsonb` (las listas
    reemplazadas, RF-9b), `fecha_dudosa boolean` (D12), `version`, `cerrado_en`,
    `cerrado_por`, `anulado_en`, `anulado_por`, `motivo_anulacion`, `creado_en`,
    `actualizado_en`. Índice único `(empresa_id, fecha) where anulado_en is null`, como
    `partes_de_obra` (RF-7, RF-20). Check de motivo al anular.
  - **`whatsapp_dias_empresa`** (nueva): gemela de `whatsapp_dias` con `empresa_id` y
    `bitacora_empresa_id`. PK `(empresa_id, fecha)`.
  - `whatsapp_reportes_esperados`: `obra_id` pasa a nulo, se agrega `empresa_id`, con
    check de exactamente uno; el índice único usa `coalesce(obra_id, empresa_id)`.
  - `bitacora_fotos`: `parte_id` pasa a nulo, se agrega `bitacora_empresa_id`, con check
    de exactamente uno; índices únicos rehechos con `coalesce` del dueño.
  - Enum `tipo_reporte_whatsapp`: `add value 'lista_equipos'`, `'informe_mantenimiento'`.
- **Migraciones**: `npm run db:generate:servidor` → `drizzle/servidor/0037_*.sql`. Revisar a
  mano el SQL de los índices rehechos y el `alter type … add value`. Se aplica **solo en
  dev**. En producción va con la T23 de la 033, después de 0031 a 0036.
- **Compatibilidad**: nada cambia para los celulares. Las filas existentes de esperados y
  fotos ya tienen `obra_id`/`parte_id`, así que cumplen los checks nuevos.

## Algoritmo / reglas

**Procesar un mensaje de un grupo de empresa** (`empresa.ts`, en una vuelta por mensaje,
con ids fijos para que repetir no duplique):

1. `destinoDeCategoria` → `bitacora_empresa` para las tres categorías nuevas, y también
   para `vehiculo_maquinaria` e `incidente` cuando el grupo es de empresa. Las demás
   (`administrativo`, `seguimiento`, `ignorar`) → `ninguno`: el mensaje queda solo en
   Reportes de WhatsApp (RF-9g).
2. Día del mensaje (`diaDeEmpresa`, pura): `lista_equipos` → la fecha que dice la lista
   (RF-9a); `informe_mantenimiento` → la fecha del informe (RF-9e); lo demás → `fecha_evento`
   o el día de envío (024). `fechaDudosa` = la lista dice un día anterior al de envío, o
   el mismo día enviada después de las 18:00 (D12).
3. Reconocer cada equipo con `reconocerEquipoDeEmpresa`, sobre **todos** los equipos
   activos (OCC es dueña de la maquinaria de todas las obras):
   - placa o código exacto, o contenido, o con caracteres confundibles (lo de hoy, sin
     filtrar por obra) → ligado;
   - si no, uno de sus `nombres_whatsapp` igual o contenido en lo escrito → ligado;
   - si no, tipo y marca (spec 026) con un solo candidato → ligado;
   - si no, `placaParecida`: lo escrito tiene forma de placa (3 letras + 3 cifras) y hay
     **una sola** placa registrada a distancia 1 (una letra o cifra cambiada, o dos
     vecinas intercambiadas) → el renglón se guarda con `escrito` tal cual,
     `vehiculoId = null` y `posiblePlaca = 'LVY498'` (RF-12a);
   - si no → excepción «Equipo no reconocido» (RF-12c).
4. Escribir en `bitacoras_empresa` del día (crearla si no existe, `on conflict` sobre el
   índice parcial):
   - lista: reemplaza `estado_equipos` entero y empuja la anterior a `listas` (RF-9b); las
     Notas → `pendientes` (RF-9f);
   - cambio de estado durante el día (varado, en mantenimiento, operativo/disponible):
     agrega `{hora, estado, texto, mensajeId}` a `cambios` del renglón del equipo; crea el
     renglón si la lista aún no llegó (RF-9c, RF-15);
   - trabajo: un renglón por trabajo, id = `idDeterminista(mensajeId, 'trabajo', n)`
     (RF-9d, RF-15);
   - informe: un renglón por viñeta, ligado al equipo si la viñeta lo nombra (RF-9e).
   Una sola sentencia `update … set col = mezcla(col, nuevos) where version = $v`, y se
   reintenta si otro mensaje se adelantó. La mezcla es la función pura de
   `rules/bitacora-occ`, la misma que usa la corrección del panel.
5. Bitácora cerrada → todo el mensaje a «No se pudo guardar» con «Bitácora cerrada»
   (RF-19).
6. Medidores: solo renglones ligados (`vehiculoId` no nulo) y con lectura explícita, con
   la función de la 025/026 que ya usa la obra (RF-14, RF-12b).
7. Fotos → `bitacora_fotos` con `bitacora_empresa_id` (RF-8).
8. Mensaje `guardado`, con `empresa_decidida_id` y `resultado` (RF-4, RF-30).

**Al llegar, sin esperar el día** (anotado en la T10): en OCC cada mensaje se escribe en la
bitácora al procesarse, sin quedar `en_espera` como en las obras. Cada mensaje es un pedazo
(una lista, una foto, un informe) y la bitácora es un documento abierto que se va llenando.
Los ids de renglón son texto fijo `<mensaje>#<sección>-<n>`, porque viven solo dentro del
`jsonb` (no hace falta forma de UUID). En actividades y pendientes un equipo no reconocido
no aparta la viñeta: se guarda con lo escrito y sin ligar.

**Esperas del día** (`dias-empresa.ts`): la misma máquina de estados que `dias.ts`
(`en_espera` → `armada`/`incompleta`), con los esperados de la empresa. Sin esperados, el
día se arma con el primer mensaje (D8, RF-17). Para no copiar 500 líneas, se extrae de
`dias.ts` la decisión «¿ya está todo?» a una función que recibe los esperados y los
llegados, y la usan las dos.

## Decisiones técnicas

- **Tabla nueva `bitacoras_empresa` con secciones en `jsonb`** → se descartó reutilizar
  `partes_de_obra` con `obra_id` nulo, porque sus secciones (personal, clima, actividades
  de obra) y su cierre exigen cosas que OCC no tiene, y cada consulta de bitácoras de obra
  tendría que excluir las de empresa. También se descartó una tabla por sección: serían
  varias escrituras sin transacción en Neon.
- **`whatsapp_dias_empresa` aparte** → se descartó volver nulo `obra_id` de `whatsapp_dias`,
  porque es parte de la llave primaria; cambiarla en producción es más riesgo que una tabla
  gemela pequeña.
- **Segundo dueño en `bitacora_fotos` y en `whatsapp_reportes_esperados`** → se descartó
  duplicar las tablas, porque `fotos-del-dia.ts` (509 líneas) y la pantalla de esperados
  servirían a las dos con un parámetro. Es el mismo patrón de dueños de
  `documentos_del_grupo` (034–037).
- **Placa parecida en una regla pura con distancia 1 y un solo candidato** → se descartó la
  IA para decidirlo, porque la regla tiene que dar lo mismo en el panel y en las pruebas.
  Con dos candidatos a distancia 1 no se sugiere nada: va a «No se pudo guardar».
- **Nombres en WhatsApp como `text[]` en `vehiculos`** → se descartó una tabla de alias,
  porque son pocos por equipo y se editan con la ficha.
- **Permiso nuevo `bitacora_empresa`** (anotado en la T6): admin y Encargado de OCC ver,
  listar, escribir y anular; laboratorista ver y listar. La entrada «Bitácora» de OCC y la
  de Geolab lo usan. Se descartó dar `escribir` sobre `bitacoras` al Encargado de OCC,
  porque esa fila es la de las bitácoras de las obras, que él solo consulta (033/RF-22).
  También se descartó dar `bitacoras` al laboratorista, que hoy no ve la Bitácora de Geolab
  (RF-29 lo pide). La pestaña «En las obras» sigue leyendo con `bitacoras`.
- **Laboratorista en los Reportes de WhatsApp de Geolab** (anotado en la T15): entra con
  `bitacora_empresa` y la ruta le muestra solo el grupo de la empresa. Se descartó darle el
  permiso `whatsapp`: le habría abierto las bandejas de las obras y, en el asistente, los
  mensajes de WhatsApp de su obra.
- **Prompt propio para el grupo de OCC en n8n** (por `grupo_id`, con `contexto_occ.md`) →
  se descartó meterlo en el prompt de obra, porque el formato de lista y de informe es
  distinto y confundiría a la IA con los reportes de obra.

## Impacto en la sincronización

Sin impacto en la sincronización: nada de esto va al celular.

## Contrato de API

Toda ruta de `panel/` abre con `requerirSesion`; el permiso por empresa sale de
`rules/permisos` y `alcanzaLaEmpresa` (033/RF-21).

- `PATCH /api/panel/whatsapp/grupos/:id` — `{ obraId: string | null, empresaId: 'occ' | 'geolab' | null }`; 422 si vienen las dos; solo gerencia.
- `GET /api/panel/empresas/:id/bitacora?desde&hasta` — días con estado y conteo de operativos e inoperativos.
- `GET /api/panel/empresas/:id/bitacora/:fecha?equipo&estado` — el día con sus secciones y fotos.
- `PATCH /api/panel/empresas/:id/bitacora/:fecha` — `{ version, estadoEquipos?, trabajos?, actividades?, pendientes?, fecha? }`; 409 si la versión cambió; 422 si está cerrada.
- `POST …/:fecha/cerrar` — `{ version }`; `POST …/:fecha/anular` — `{ version, motivo }`.
- `GET /api/panel/empresas/geolab/laboratorio?obra&desde&hasta`.
- `GET /api/panel/whatsapp/propuestas?empresa=occ&origen=grupo|obras|todos`.
- `GET|PUT /api/panel/whatsapp/esperados?empresa=occ` y `GET /api/panel/whatsapp/dias?empresa=occ`.
- La entrega de la integración (`/api/integraciones/whatsapp/mensajes`) **no cambia de
  forma**; `propuesta` acepta el bloque opcional `occ`.

## Estrategia de verificación

- **`scripts/verificar-reglas.ts`**, con los textos reales del grupo (sin datos personales):
  - día de la lista y «Fecha dudosa»: lista del 28-oct 22:59 «para el día 28» (RF-9a, D12);
  - reemplazo de lista y cambios del día: TFO 429 varado 08:48 → disponible 14:45 (RF-9b, RF-9c);
  - reconocer: «TFO 427» = TFO427; «Pajarita Case cantera» por nombre en WhatsApp; «LVY 499» →
    posible LVY498; «CZW 128» → posible ZCW128; «LUY002» → posible LVY002; dos placas a
    distancia 1 → ninguna; «Grúa XYZ» → excepción (RF-12 a RF-12c);
  - medidores solo con equipo ligado (RF-12b, RF-14);
  - mezcla sin duplicar al repetir un mensaje (RF-15);
  - dueño del grupo: obra o empresa, nunca las dos; Elemental y Proyectos rechazadas (RF-1, RF-2).
- **Demo manual en dev** (la de la spec): grupo PRUEBA-038 asociado a OCC; por la integración,
  una lista, un informe de Pedro, dos fotos de trabajo, una placa mal escrita y un equipo
  desconocido; ver la bitácora armada, la nota «Posiblemente sea…», la excepción, el
  medidor, las pestañas, el filtro de origen; cerrar y mandar un mensaje tardío. Bitácora
  de Geolab con el laboratorio de las obras. Limpieza PRUEBA-038 en dev y R2.
- **Comprobaciones extra**: `npx expo export --platform web` (rutas nuevas) y el `grep` de
  fugas sobre `dist/client`.
- **Integración**: correr el prompt nuevo en n8n de dev con 10 mensajes reales del grupo
  (lista, informe, foto, conversación) y revisar lo que propone antes de producción.

## Riesgos

- **La IA confunde una lista con otra** (la del 28 repetida): la marca «Fecha dudosa» y la
  corrección del panel lo cubren; las pruebas usan ese caso real.
- **Rehacer índices de `bitacora_fotos` en producción**: la tabla es pequeña, pero el SQL
  generado se revisa a mano y se prueba en dev antes de la T23.
- **Gasto de API**: el grupo trae unos 15 mensajes al día; el historial desde el 16-oct son
  unos 300. Se recupera con permiso (D9).
- **Producción**: la 0037 va después de la 0036, y el grupo de OCC se conecta en n8n solo
  después de desplegar la imagen.

## Mantenimientos del grupo de OCC (RF-9h, cambio del 2026-11-03)

- `rules/bitacora-occ.ts` → `mantenimientosDelTrabajo(trabajo)`, función pura que decide
  qué va a Mantenimientos:
  - un trabajo con equipo ligado de tipo «mantenimiento preventivo» → clase `aceite` si
    `claseDeMantenimiento` reconoce aceite en el texto, si no `preventivo`;
  - de tipo daño o reparación → `correctivo`;
  - llantas, repuesto o compra y suministro → no van.
  - Un cambio de estado a operativo o disponible (RF-9c) → `resuelto: true` para ese equipo.
  - Un renglón con `posiblePlaca` (RF-12a) no va nunca.
- `whatsapp/servidor/mantenimientos.ts` → `guardarMantenimientos` acepta `obraId` nulo y,
  en ese caso, toma **la obra del equipo** para cada renglón. Esa es la columna
  `mantenimientos.obra_id`, que ya es nula: «la obra donde estaba la máquina», y de ella
  sale el alcance del residente. Las lecturas que faltan salen de las del equipo. El id
  fijo (equipo, clase, día) hace que el mismo cambio de aceite reportado por la obra y
  por OCC quede **una sola vez**.
- Paso 4b del algoritmo: después de escribir la bitácora del día, `empresa.ts` llama a
  `guardarMantenimientos` con los trabajos que devuelve `mantenimientosDelTrabajo`.
- Verificación: el «Cambio de aceite motor, filtro aire, combustible y aceite NPX602» del
  28-oct → `aceite`; «TFO 420 presenta daño bomba hidráulica» → `correctivo`; «Vehículo TFO
  420 OPERATIVO» → resuelto; llantas → nada; «LVY 499» → nada; el mismo aceite desde obra
  y desde OCC → un solo registro.
