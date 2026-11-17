# Plan técnico — Spec 048, requisiciones de obra amarradas a la planificación

> Lee antes `docs/constitucion.md` y el `spec.md` de esta carpeta.
> Aquí va el CÓMO. Si algo de esto cambia el comportamiento acordado, no se resuelve
> en el plan: se vuelve a la spec.

## La idea en una línea

Cada renglón de una RQ de compra de obra, y cada RQ de pago de obra, guarda **a qué opción de la planificación se imputó**: una llave estable (la del ítem, el rubro o el renglón indirecto) más una etiqueta legible. Lo comprometido **no se guarda en ningún lado**: una regla pura lo calcula cada vez a partir de las requisiciones, sus compras y la planificación vigente (RF-33, RF-44). Así un cambio de versión (RF-39) o una compra que se anula (RF-22) se reflejan solos, sin tener que recalcular ni migrar nada.

## Lo que ya hay y se reutiliza

- **Identidad de un ítem entre versiones:** `llaveDeItemPlanificado` (`rules/planificacion.ts`). Usa grupo (el frente), capítulo e ítem de pago del presupuesto, y es la misma que usan el cumplimiento (043) y el plan semanal (044). Cubre RF-65 para los ítems, con el capítulo como desempate.
- **Costo de un ítem:** `medidaDelCosto(item) × precioCosto`, y `sinPrecioDeCosto` (`rules/planificacion.ts` y `resumenDeLaPlanificacion`). Cubre RF-27 y RF-29.
- **Total de un renglón indirecto:** `totalDelRenglon` y `totalesPorConcepto` (`rules/planificacion-indirectos.ts`). La mano de obra indirecta sale del total del concepto (RF-35, RF-66).
- **Quién ve valores:** `veLosValores(rol)` (`rules/compras.ts`). Cubre RF-9 y RF-34.
- **Quién cambia lo pedido al aprobar:** `puedeRecortar(persona, paso)` (`rules/requisiciones.ts`), que deja a la Administradora en su paso y a la Gerencia en cualquiera. Cubre RF-36, RF-38 y RF-64 sin regla nueva.
- **Versión de la requisición:** `tomarLaVersion` y `tomarLaVersionDelPago`, con el 409 de quien llega tarde. Cubre RF-45.
- **Los avisos de exceso en la historia:** se guardan en el campo `cambios` (jsonb) de `solicitud_compra_eventos` y `solicitud_pago_eventos`, como ya se hace con las cantidades aprobadas.

## Dos hechos del código que acotan la spec sin cambiar su comportamiento

1. **Hoy hay a lo sumo una planificación vigente por obra** (índice `ux_planificacion_vigente`). Por eso «las planificaciones vigentes, una por frente» (RF-6, D12) se resuelve hoy en una sola. Esa planificación puede traer ítems de varios frentes (los del Excel traen `grupo` por ítem), y cada opción muestra el suyo (RF-46). La regla recibe una **lista** de planificaciones, así que si un día hay una vigente por frente, no hay que tocarla. Lo pedido para un frente que no está en esa planificación va a «Fuera de lo planeado» (RF-54).
2. **El costo planeado de un rubro es su `costo`, no su `valor`.** El `valor` es el precio contractual. RF-27 dice «su valor», pero D3 pide comparar contra el *costo* planeado, así que se usa `costo`. Un rubro sin costo se trata como un ítem sin precio de costo (RF-29). Al aprobar el plan se precisa la redacción de RF-27; el comportamiento acordado no cambia.

## Módulos y archivos

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `src/shared/rules/requisicion-planificacion.ts` (nuevo) | Funciones puras:<br>• `opcionesParaImputar(planificaciones, rol)`: ítems, rubros, renglones indirectos y la mano de obra indirecta como una sola opción, cada una con llave, etiqueta, capítulo, frente y costo planeado.<br>• `validarImputacion(imputacion, opciones)`.<br>• `comprometidoPorOpcion(requisiciones, compras)`, con las reglas de RF-19 a RF-25, RF-56 a RF-60 y D14.<br>• `cifrasDelRenglon(...)`: planeado, ya comprometido y lo que queda.<br>• `avisosDeLaRequisicion(...)`: «Se pasa de lo planeado» con cuánto, «Fuera de lo planeado», «Sin ítem en la versión vigente» y «Sin planificación aprobada».<br>• `resumenDeLoComprometido(...)`.<br>• `faltasDeLaCompraPorRenglon(...)`. | RF-2 a RF-8, RF-19 a RF-35, RF-39, RF-40, RF-42, RF-46 a RF-66 |
| `src/shared/rules/compras.ts` | `faltasDeLaSolicitud` con `{ requisicionDeObra }` exige el valor estimado mayor que cero por renglón, salvo al Almacenista. El valor estimado de la cabecera pasa a ser la suma de los renglones. | RF-11 a RF-13, RF-18 |
| `src/shared/rules/requisiciones.ts` | `faltasParaAprobar` (nueva): sin los valores estimados que faltan, no se aprueba. Los textos de la historia aprenden los eventos `imputar`, `valor_estimado` y `avisos`. | RF-14 a RF-17, RF-37, RF-63 |
| `src/db/servidor/esquema.ts` | Columnas nuevas (ver «Modelo de datos»). | RF-11, RF-2, RF-3, RF-47 |
| `drizzle/servidor/0050_*.sql` | Migración generada; se aplica **solo en `neondb`**. | — |
| `src/features/panel/requisiciones.ts` y `contratos.ts` | Zod: `imputacion` en cada renglón y en el pago; `valorEstimado` por renglón; `imputaciones` y `valoresEstimados` en la decisión; `valores` por renglón al registrar la compra. Tipos de respuesta con las cifras y los avisos. | RF-2 a RF-18, RF-36, RF-47 |
| `src/features/requisiciones/servidor/planificacion.ts` (nuevo) | Lee la planificación vigente de la obra y todas las RQ de obra con sus compras, y llama a la regla. Una lectura por obra. Lo usan el detalle, la lista, la bandeja, el formulario y el resumen. | RF-26 a RF-34, RF-42 |
| `src/features/requisiciones/servidor/requisiciones.ts` | `crearRequisicion` valida la imputación contra las opciones vigentes y la guarda; sin planificación guarda `sin_planificacion`. `decidirRequisicion` acepta los valores estimados (paso del Almacenista), las imputaciones (`puedeRecortar`) y anota los avisos en el evento de cada aprobación. `filasDeRequisiciones` y `bandejaDeRequisiciones` agregan la marca. | RF-2 a RF-8, RF-14 a RF-17, RF-31, RF-36 a RF-38, RF-55, RF-63, RF-64 |
| `src/features/compras/servidor/solicitudes.ts` | `corregirSolicitud`: los renglones nuevos llevan imputación y valor; se valida RF-55. `solicitudDe`: devuelve las cifras y los avisos por renglón, y quita los valores de la historia a quien no `veLosValores`. | RF-10, RF-26 a RF-34, RF-55, RF-9 |
| `src/features/compras/servidor/compras.ts` | `registrarCompra`: si los renglones caen en más de una opción, exige `valores` por renglón que sumen el de la compra. Los guarda en `compra_renglones.valor`. | RF-47 a RF-49 |
| `src/features/tesoreria/servidor/solicitudes-pago.ts` | `corregirSolicitudDePago` y `solicitudDePagoDe`: lo mismo para el pago. | RF-3, RF-10, RF-23, RF-26 |
| `src/app/api/panel/requisiciones/imputables+api.ts` (nueva) | `GET ?obraId=`: las opciones para imputar, con cifras solo si `veLosValores`. | RF-6, RF-7, RF-9, RF-35, RF-46 |
| `src/app/api/panel/planificaciones/[id]/comprometido+api.ts` (nueva) | `GET`: el resumen de lo comprometido de una planificación vigente. | RF-42, RF-50 a RF-53, RF-66 |
| Rutas que ya existen (`requisiciones+api.ts`, `requisiciones/[tipo]/[id]/decision+api.ts`, `solicitudes-compra/[id]+api.ts`, `.../compras+api.ts`, `solicitudes-pago/[id]+api.ts`) | Solo pasan los campos nuevos que ya leyó el contrato. | — |
| `src/features/compras/formulario-de-solicitud.tsx` | Por renglón: un selector de imputación con búsqueda, el valor estimado (no aparece para el Almacenista) y la explicación si va «Fuera de lo planeado». Al corregir, propone lo que tenía el renglón. | RF-2 a RF-13, RF-46 |
| `src/features/compras/vista-de-la-solicitud.tsx` y `src/features/requisiciones/cadena-y-decision.tsx` | Columnas de imputación, planeado, comprometido y lo que queda con sus avisos. Valor estimado editable en el paso del Almacenista. Cambio de imputación para quien `puedeRecortar`. | RF-14, RF-26 a RF-36 |
| `src/features/compras/pasos-de-gerencia.tsx` | Registrar compra: aparece el valor por renglón cuando hay más de una opción, con lo que falta o sobra. | RF-47 a RF-49 |
| `src/features/requisiciones/pantalla-requisiciones.tsx` | La marca «Se pasa» o «Fuera de lo planeado» en la lista y en la bandeja. | RF-31 |
| `src/features/planificacion/resumen-comprometido.tsx` (nuevo) y `detalle-planificacion.tsx` | Sección «Lo comprometido» en la planificación vigente, con el enlace a las requisiciones. | RF-42, RF-50 a RF-53, RF-66 |
| `scripts/verificar-reglas.ts` | Casos «048/» (ver «Estrategia de verificación»). | — |

## Modelo de datos

- **Local** (`src/db/local/schema.ts`): sin cambios.
- **Servidor** (`src/db/servidor/esquema.ts`):
  - `solicitud_compra_renglones`:
    - `valor_estimado bigint null`, con `check (valor_estimado is null or valor_estimado > 0)`.
    - `imputacion jsonb null`, tipo `ImputacionDelRenglon` (sus campos, abajo).
  - `solicitudes_pago`: `imputacion jsonb null`, con la misma forma.
  - `compra_renglones`: `valor bigint null` con `check (valor is null or valor > 0)`. Solo se llena cuando la compra cubre renglones de más de una opción (RF-47); si no, el valor de la compra va entero a su única opción (RF-49).
  - Campos de `ImputacionDelRenglon`:
    - `tipo`: `item`, `rubro`, `indirecto`, `mano_obra_indirecta`, `fuera` o `sin_planificacion`.
    - `llave`: la identidad que sigue entre versiones (RF-65).
      - Ítem: `llaveDeItemPlanificado`.
      - Rubro: grupo y nombre.
      - Indirecto: concepto, descripción y frente.
      - Mano de obra indirecta: el concepto.
    - `etiqueta`: lo que se ve; se guarda tal como estaba al imputar.
    - `frente`.
    - `planificacionId`: la versión contra la que se imputó, como constancia.
    - `explicacion`: solo cuando el tipo es `fuera`.
  - **Una fila sin imputación** (`null`) es de antes de la 048. No cuenta (RF-25).
  - **`sin_planificacion`** distingue lo pedido cuando la obra no tenía planificación (RF-8, D11). Así se puede mostrar el aviso sin confundirlo con lo de antes.
- **Migración**: `npm run db:generate:servidor` → `drizzle/servidor/0050_*.sql`, aplicada **solo en `neondb`**. Producción la recibe con las demás (0042–0050) en el despliegue de la tanda.
- **Compatibilidad**: no toca el celular. Las filas viejas quedan con `null` y la regla las ignora. Las SC y SP anteriores, igual.

## Algoritmo / reglas

1. **Opciones** (RF-6, RF-7, RF-35, RF-46): por cada planificación vigente de la obra salen:
   - un ítem por cada ítem de la planificación, con costo `medidaDelCosto × precioCosto`, o `null` si no tiene precio de costo;
   - un rubro por cada rubro, con su `costo`;
   - un indirecto por cada renglón de los conceptos distintos de mano de obra indirecta, con `totalDelRenglon`;
   - una sola opción de mano de obra indirecta, con el total de ese concepto.
   La búsqueda compara el número y la descripción normalizados.
2. **Comprometido** (`comprometidoPorOpcion`): recorre los renglones vigentes (los no reemplazados) de las RQ de obra con imputación de tipo `item`, `rubro`, `indirecto` o `mano_obra_indirecta`. Cada uno aporta un valor y una llave:
   - **Requisición devuelta** (RF-19): aporta 0, salvo que tenga compras vivas (RF-56).
   - **Requisición cancelada o rechazada**: aporta solo el valor real de sus compras sin anular (RF-56, RF-58).
   - **Renglón quitado al aprobar** (`cantidadAprobada = 0`): aporta 0 (RF-24).
   - **Renglón con compra vigente:**
     - si la compra tiene `valor` por renglón, aporta ese valor;
     - si no, la compra entera se suma una sola vez a la llave común de sus renglones (RF-21, RF-49).
   - **Renglón sin compra:** aporta el valor estimado × (cantidad aprobada ÷ cantidad), o el estimado entero si aún no está aprobada (RF-20, RF-60).
   - **Requisición de pago:** aporta el valor pedido mientras está en la cadena y el valor aprobado desde que se aprueba (RF-23, RF-59).
   - Sale un mapa de llave a pesos. Lo que lleva tipo `fuera` y las llaves que no están en las opciones vigentes se suman aparte (RF-40, RF-51).
3. **Cifras del renglón** (RF-26, RF-61, RF-62, RF-28):
   - `yaComprometido` = el comprometido de la llave menos lo que aporta esta requisición.
   - `pide` = lo que esta requisición aporta a esa llave, sumado sobre sus renglones.
   - `queda` = planeado − ya comprometido − pide.
   - Si `queda` es menor que 0 y el planeado no es `null`, sale el aviso «Se pasa de lo planeado» por −`queda`.
4. **Al aprobar** (RF-63): con las cifras del paso 3 se arma `[{ orden, aviso, exceso }]` y va en `cambios` del evento `aprobar_paso` o `aprobar`.
5. **Validación al enviar o corregir** (RF-2 a RF-5, RF-55):
   - Si la obra tiene vigente, cada imputación debe ser `fuera` con explicación, o una llave que esté en las opciones de ahora.
   - Si la obra no tiene vigente, se guarda `sin_planificacion`.
6. **Compra con varias opciones** (RF-47, RF-48): si las llaves de los renglones elegidos son más de una, se exige `valores` para todos y que su suma sea igual al valor de la compra; si no, 422 con lo que falta o sobra.

## Decisiones técnicas

- **Lo comprometido se calcula al leer; no se guarda** → se descartó un acumulado por ítem que se actualiza en cada evento. Con Neon por HTTP no hay transacción que mantenga ese acumulado coherente con la requisición. Además, cambiar de versión, anular una compra o cancelar obligaría a recalcularlo, y un acumulado desfasado no se nota. Las RQ de una obra son decenas o cientos, y leerlas cabe en el tiempo de RF-NF (se mide en la demo).
- **La imputación va en un `jsonb` con tipo, y no en cinco columnas** → se descartaron las columnas `imputacion_tipo`, `imputacion_llave`, etc., en dos tablas. Su obligatoriedad depende del tipo (`explicacion` solo en `fuera`, `llave` en todos menos `fuera` y `sin_planificacion`). Eso se valida mejor en el contrato y la regla que con seis `check`. Además sigue el patrón de `planificaciones.estructura`. Lo que se consulta (la llave) se lee con `->>` en memoria, no con un índice: el volumen no lo pide.
- **Se guarda la etiqueta además de la llave** → se descartó guardar solo la llave. Si el ítem desaparece en una versión nueva (RF-40), la requisición tiene que poder decir a qué estaba imputada. Es evidencia (principio 4).
- **Cambiar la imputación sobrescribe la columna y deja `antes` y `después` en el evento** → se descartó marcar renglones reemplazados como al corregir (046, RF-94). Cambiar la imputación no cambia lo pedido, solo su etiqueta contable, y la historia ya guarda la anterior completa, visible (RF-37). Es el mismo patrón que `cantidadAprobada` y `valorAprobado`.
- **El valor real por renglón va en `compra_renglones.valor`** → se descartó prorratearlo por los estimados. Diego decidió que la Administradora lo digite (D7).
- **Los valores escritos y los avisos con cifra se guardan en la historia, pero `solicitudDe` los quita para quien no `veLosValores`** → se descartó dejarlos fuera de la historia, como hace la 036 con el valor de la compra. RF-16 y RF-63 piden que queden escritos, y RF-9 que el Almacenista no los vea. Filtrar al servir cumple las dos.
- **Las imputaciones y los valores estimados viajan en la petición de decidir** → se descartó una ruta aparte para editar renglones. Hacerlo así deja el cambio, la aprobación y su evento en el mismo `tomarLaVersion` y en el mismo lote. Con dos rutas, dos peticiones podrían dejar una aprobación sin su cambio.
- **La regla recibe una lista de planificaciones** → se descartó atarla a «la vigente». D12 habla de una por frente, y hoy hay una sola. La lista cubre las dos cosas sin migrar nada.

## Impacto en la sincronización

Sin impacto en la sincronización. Las requisiciones y la planificación viven solo en el servidor y en el panel; el celular no las baja ni las sube.

## Contrato de API

Todas las rutas abren con `requerirSesion`. El lugar sale de `lugarDeLaSolicitud` y de `alcance.ts`, como en la 046. Ninguna usa transacciones interactivas: cada cambio es `tomarLaVersion` más un `batch`.

| Ruta | Cambio | Códigos |
| --- | --- | --- |
| `GET /api/panel/requisiciones/imputables?obraId=` | **Nueva.** `{ planificaciones: [{ id, version, frente }], opciones: [{ llave, tipo, etiqueta, capitulo, frente, planeado?, comprometido? }] }`. Sin cifras para quien no `veLosValores`. Sin vigente: `{ planificaciones: [], opciones: [] }`. | 200; 403 sin acceso a la obra; 404 obra |
| `POST /api/panel/requisiciones` | Compra: cada renglón lleva `valorEstimado` e `imputacion`. Pago: lleva `imputacion`. | 422 con `faltas` (renglón sin imputación o sin valor, explicación vacía, opción que ya no existe) |
| `PUT /api/panel/solicitudes-compra/[id]` y `solicitudes-pago/[id]` (corregir) | Lo mismo para los renglones nuevos. | 409 por versión; 422 |
| `POST /api/panel/requisiciones/[tipo]/[id]/decision` | Campos opcionales nuevos: `valoresEstimados: { renglonId, valor }[]` e `imputaciones: { renglonId \| null, imputacion }[]` (con `renglonId` en null cuando es el pago). | 422 si un valor estimado falta al aprobar o cambia uno que ya había (RF-15, RF-17); 422 `NO_RECORTA` si cambia la imputación quien no `puedeRecortar`; 409 por versión |
| `POST /api/panel/solicitudes-compra/[id]/compras` | Campo opcional `valores: { renglonId, valor }[]`. | 422 si faltan o no suman (RF-48) |
| `GET /api/panel/solicitudes-compra/[id]` y `solicitudes-pago/[id]` | Cada renglón (o el pago) trae `imputacion`, `cifras` y `avisos`, sin cifras para quien no ve valores. La historia llega filtrada. | sin cambio |
| `GET /api/panel/requisiciones` y `/bandeja` | Cada fila trae `avisosDePlanificacion: 'se_pasa' \| 'fuera' \| null`. | sin cambio |
| `GET /api/panel/planificaciones/[id]/comprometido` | **Nueva.** `{ filas: [{ llave, tipo, etiqueta, planeado, comprometido, queda, seAPasado, requisiciones: [{ tipo, id, codigo }] }], fuera, sinItem }`. | 200; 403 a quien no sea Gerencia, Director de Proyectos ni Director de Obra de esa obra (RF-53); 404; 409 si la planificación no está vigente |

## Estrategia de verificación

- **`scripts/verificar-reglas.ts`**, casos «048/»:
  - **Opciones:**
    - ítem con costo y sin costo (RF-29);
    - rubro con `costo` (RF-27);
    - la mano de obra indirecta sale como una sola opción con el total del concepto (RF-35);
    - la búsqueda por número y por descripción (RF-46).
  - **Validación:**
    - sin imputación (RF-5);
    - `fuera` sin explicación (RF-4);
    - llave que ya no está (RF-55);
    - obra sin vigente → `sin_planificacion` (RF-8);
    - valor estimado obligatorio salvo al Almacenista (RF-12, RF-13).
  - **Comprometido:**
    - enviada cuenta, devuelta no (RF-19);
    - estimado y luego real (RF-20, RF-21);
    - compra anulada (RF-22, RF-58);
    - cancelada con compra viva (RF-56);
    - pago pedido y luego aprobado (RF-23, RF-59);
    - renglón quitado y cantidad rebajada (RF-24, RF-60);
    - compra con `valor` por renglón y compra de una sola llave (RF-47, RF-49);
    - filas de antes de la 048 (RF-25).
  - **Cifras:**
    - lo ya comprometido sin contar esta requisición, y lo que queda (RF-61, RF-62);
    - el aviso de exceso con su cifra (RF-28);
    - sin precio de costo, sin aviso (RF-29).
  - **Versiones:** la misma llave en v2 cuenta igual (RF-39, RF-65); una llave que desaparece va a «Sin ítem» (RF-40).
  - **Compra por renglón:** falta y sobra (RF-48).
  - **Aprobar:**
    - sin los valores estimados que faltan no se aprueba (RF-15);
    - no deja cambiar un valor que ya estaba (RF-17);
    - `puedeRecortar` para cambiar la imputación (RF-36, RF-38, RF-64);
    - los avisos que se anotan (RF-63).
  - **Resumen:** filas, exceso resaltado, fuera y sin ítem, y la mano de obra indirecta en una sola fila (RF-42, RF-50, RF-51, RF-66).
- **Demo manual** (navegador, servidor de Diego en 8081, Chrome sin ventana): se hace en `PRUEBA-043`, que tiene planificación vigente, con cuentas de prueba de Residente, Almacenista, Director de Obra, Director de Proyectos y Administradora asignadas ahí. Recorre los once pasos de los «Criterios de finalización» de la spec. Para el paso 6 se copia la vigente, se le quita un ítem, se aprueba como v nueva y se ve «Sin ítem en la versión vigente». Se mide el tiempo del detalle de una requisición de 30 renglones (RF-NF, menos de 2 segundos).
- **Comprobaciones extra:**
  - No se leen secretos nuevos.
  - `npx expo export --platform web` para confirmar que las pantallas nuevas no arrastran `src/db/local`.
  - Las columnas de la tabla de renglones caben en `MaxContentWidthPanel`, con la suma escrita en el comentario.

## Riesgos

- **La tabla del detalle se pasa de ancho** con cuatro columnas nuevas. **Se detecta** en la demo, si la columna de acciones queda fuera. **Se resuelve** juntando planeado, comprometido y lo que queda en una sola celda de tres líneas.
- **El cálculo se vuelve lento** en una obra con muchas requisiciones. **Se detecta** midiendo en la demo. **Se resuelve** leyendo la obra una vez por petición, como ya está previsto, y si hiciera falta con un índice sobre `solicitud_compra_renglones(solicitud_id)`, que ya existe por la llave foránea.
- **Una llave que cambia sin que cambie el ítem**, por ejemplo si el presupuesto renumera un capítulo con un otrosí. El renglón saldría «Sin ítem en la versión vigente» aunque el ítem siga ahí. **Se detecta** en el resumen, en «Sin ítem». **Se revierte** sin migrar: la Administradora o la Gerencia lo reimputan desde la requisición, si sigue abierta. El caso queda escrito en la validación.
- **La historia le muestra cifras al Almacenista.** **Se detecta** con un caso de regla sobre el filtro y con la demo usando su cuenta. **Se revierte** quitando el filtro roto; la información guardada no cambia.
- **El servidor de desarrollo se queda sin memoria** (pasó en la 045). **Se detecta** porque el servidor se cae en la demo. **Se resuelve** reiniciándolo; no es propio de esta spec.
