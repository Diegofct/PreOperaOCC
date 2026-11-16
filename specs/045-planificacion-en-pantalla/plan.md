# Plan técnico — Spec 045

> Lee antes `docs/constitucion.md` y el `spec.md` de esta carpeta.
> Aquí va el CÓMO. Si algo de esto cambia el comportamiento acordado, no se resuelve
> en el plan: se vuelve a la spec.

> Estado: **Aprobado** por Diego el 2026-11-13 · Spec aprobada por Diego el 2026-11-13 (RF-1 a RF-162, D1–D15, P1–P13).

## Punto de partida (lo que ya existe y se reutiliza)

- `src/shared/rules/planificacion.ts`: `EstructuraDePlanificacion` (jsonb), `cantidadDelMes` (RF-108), `hallazgosDe`, `sinPrecioDeCosto` (RF-133), `resumenDeLaPlanificacion`, `llaveDeItemPlanificado` (la usan el cumplimiento y el plan semanal).
- `src/shared/rules/planificacion-ia.ts` + `src/features/planificacion/servidor/leer-con-ia.ts`: lectura del Excel citando hoja y fila, con `llamarConEsquema` y caché por huella en `planificacion_lecturas_ia`.
- `src/features/planificacion/servidor/lecturas.ts`: lectura por detrás con reserva por índice parcial (`ux_planificacion_lectura_en_curso`), vencimiento y `lanzarLectura`. Es exactamente el mecanismo que pide RF-28 a RF-31.
- `src/features/planificacion/servidor/versiones.ts`: aprobar/anular con bloqueo optimista (`version`) y `MENSAJE_DE_CHOQUE_DE_PLANIFICACION` (RF-136).
- `src/shared/rules/cumplimiento-de-obra.ts`: mide con `estructura.items[].programacion` y `estructura.indirectos` (un `ValorDelMes[]`). **Se mantiene ese contrato**: la 045 sigue escribiendo esos dos campos como derivados, y por eso el cumplimiento (RF-155, RF-157) y el plan semanal (RF-156) no cambian de lógica.
- `src/features/plan-semanal/editor-plan-semanal.tsx` y `src/features/contratos/editor-presupuesto.tsx`: patrones de editor de borrador con `PUT { version, … }`, recálculo en vivo y «Volver a cargar» al chocar.
- Permisos: el módulo `planificacion` ya da `escribir`/`aprobar`/`anular` a `admin` y `director_proyectos`, y `ver`/`listar` a `director_obra` (`permisos.ts:579`). **No cambia la tabla de permisos.**

## Módulos y archivos

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `src/shared/rules/planificacion.ts` | Estructura ampliada (ver «Modelo de datos»): plazo, factores, origen, `fijados` y calendario en ítems y rubros, renglones indirectos. `resumenDeLaPlanificacion` añade importe real total con rubros, factor de indirectos y totales por concepto. `hallazgosDe` añade rubros sin costo, fuera del plazo, renglones para revisar, «sin nada programado». Nueva `impedimentosParaAprobar`. | RF-1–RF-3, RF-65–RF-73, RF-122–RF-133 |
| `src/shared/rules/planificacion-reparto.ts` (nuevo) | Reparto de un total en un periodo con meses fijados; reparto proporcional de los porcentajes; reparto del costo; descartar fijados fuera del periodo. | RF-96–RF-111 |
| `src/shared/rules/planificacion-indirectos.ts` (nuevo) | Los 7 conceptos, las 4 formas, total por renglón/concepto, renglón «Indirectos sin desglose», copia de renglones a otro plazo. | RF-74–RF-95, RF-112–RF-121, RF-140, RF-141, RF-145 |
| `src/shared/rules/planificacion-borrador.ts` (nuevo) | `borradorDesdePresupuesto`, `aplicarEdicion` (solo campos editables, medida para costo que sigue a la real), `recalcularPlanificacion` (la única función que deriva `programacion`, `indirectos` y resumen), `copiarVersion`, `normalizarLegada` (planificaciones de la 043), `plazoDeducido` para el Excel. | RF-1–RF-18, RF-33–RF-35, RF-46–RF-64, RF-138–RF-146 |
| `src/shared/rules/planificacion-calendario-ia.ts` (nuevo) | Lo que se manda a la IA para el calendario y la validación de lo que vuelve (inicio ≥ mes 1, fin ≤ plazo, solo calendario). | RF-19–RF-27 |
| `src/shared/rules/planificacion-ia.ts` | Tipos y comprobación de la lectura de **indirectos por renglón** del Excel (cita de fila, forma, meses fijados, comparación por concepto). | RF-36–RF-43 |
| `src/shared/rules/cumplimiento-de-obra.ts` | El informe mensual trae además los indirectos del mes por concepto (dato opcional; con planificaciones viejas, un solo concepto «sin desglose»). | RF-157, RF-158 |
| `src/features/panel/planificacion.ts` | Esquemas Zod nuevos: pedido de borrador desde presupuesto, edición del borrador, copia de versión; tipos de detalle con renglones y vista recortada para el Director de Obra. | RF-11–RF-13, RF-46–RF-60, RF-138 |
| `src/features/planificacion/servidor/leer-con-ia.ts` | Segunda llamada `leerIndirectos` (esquema y prompt propios) y `proponerCalendario`. | RF-19, RF-26, RF-36–RF-38 |
| `src/features/planificacion/servidor/lecturas.ts` | La fila de lectura gana `tipo` (`excel` / `calendario`) y `pedido`; `correrPropuesta` crea el borrador desde el presupuesto al terminar o fallar la IA; la lectura del Excel lanza también la de indirectos y aplica D11 (meses del Excel como fijados). | RF-8–RF-31, RF-33–RF-43 |
| `src/features/planificacion/servidor/borradores.ts` (nuevo) | `guardarBorrador` (bloqueo optimista, recálculo en servidor), `copiarVigente`, lista de planificaciones de las que se pueden copiar indirectos. | RF-57–RF-60, RF-112, RF-138–RF-143 |
| `src/features/planificacion/servidor/planificaciones.ts` | `detalleDePlanificacion` normaliza las viejas y recorta la mano de obra indirecta para el Director de Obra; muestra origen. | RF-145, RF-147–RF-154 |
| `src/features/planificacion/servidor/versiones.ts` | `aprobarPlanificacion` rechaza con `impedimentosParaAprobar` antes de la confirmación de hallazgos. | RF-127–RF-137 |
| `src/features/planificacion/servidor/cumplimiento.ts` | Pasa los indirectos por concepto de cada versión al informe. | RF-157, RF-158 |
| `src/features/planificacion/exportar.ts`, `plata-del-cumplimiento.tsx` | Indirectos del mes por concepto en pantalla, Excel y PDF del informe. | RF-158, RF-152 |
| `src/app/api/panel/planificaciones/desde-presupuesto+api.ts` (nuevo) | `POST`: arranca la propuesta por detrás (202). | RF-8–RF-31 |
| `src/app/api/panel/planificaciones/[id]+api.ts` | Añade `PUT` (guardar borrador). | RF-46–RF-60 |
| `src/app/api/panel/planificaciones/[id]/copiar+api.ts` (nuevo) | `POST`: borrador nuevo desde la vigente. | RF-138–RF-143 |
| `src/app/api/panel/planificaciones/para-copiar-indirectos+api.ts` (nuevo) | `GET`: vigentes y reemplazadas con renglones desglosados, de todas las obras al alcance. | RF-112, RF-113 |
| `src/app/api/panel/planificaciones/lecturas/[id]+api.ts` | Sin cambio de forma; el estado sirve a los dos tipos de lectura. | RF-28 |
| `src/features/planificacion/crear-desde-presupuesto.tsx` (nuevo) | Ventana: plazo, mes de arranque, grupo, planificación de la cual copiar indirectos; espera de la propuesta. | RF-11–RF-13, RF-28, RF-112 |
| `src/features/planificacion/editor-planificacion.tsx` (nuevo) | Editor del borrador con pestañas Ítems · Rubros · Indirectos · Resumen; recálculo en vivo con `recalcularPlanificacion`; guardar con choque. | RF-44–RF-64, RF-80–RF-104, RF-122–RF-126 |
| `src/features/planificacion/meses-del-renglon.tsx` (nuevo) | La fila desplegable de meses de un ítem/rubro/renglón: fijar un mes, «Repartir en partes iguales». | RF-98–RF-104 |
| `src/features/planificacion/indirectos-del-borrador.tsx` (nuevo) | Los 7 conceptos con sus renglones, la forma de cada uno, factor prestacional y recargo. | RF-74–RF-95 |
| `src/features/planificacion/pantalla-planificacion.tsx`, `acciones-planificacion.tsx`, `detalle-planificacion.tsx`, `resumen-planificacion.tsx` | Botones «Crear desde el presupuesto» y «Nueva versión»; abrir el editor en borrador; origen; impedimentos al aprobar; vista de solo lectura con indirectos por concepto. | RF-132, RF-138, RF-147–RF-151 |
| `scripts/verificar-reglas.ts` | Casos nuevos (ver verificación). | — |

## Modelo de datos

- **Local** (`src/db/local/schema.ts`): **sin cambios**. Nada de esto baja al celular.
- **Servidor** (`src/db/servidor/esquema.ts`):
  - `planificaciones`:
    - `media_id`, `huella` y `hojas` pasan a **opcionales** (un borrador desde el presupuesto o copiado no tiene Excel; RF-149).
    - Columna nueva `origen` (enum `origen_planificacion`: `excel | presupuesto | copia`, `not null default 'excel'`, así las filas existentes quedan como lo que son) y `copiada_de` (texto, FK a `planificaciones.id`, opcional) (RF-147).
    - Check nuevo `ck_planificacion_origen`: `origen = 'excel'` ⇔ `media_id is not null`.
  - `planificacion_lecturas`: columna `tipo` (enum `tipo_lectura_planificacion`: `excel | calendario`, default `excel`) y `pedido` (jsonb opcional: plazo, arranque, grupo, de dónde copiar indirectos). El índice `ux_planificacion_lectura_en_curso` **no cambia**: al ser por obra, ya impide una propuesta y una lectura de Excel a la vez (RF-29).
  - Todo lo demás vive en el jsonb `estructura`, como hoy. `EstructuraDePlanificacion` gana (todos opcionales para que las filas viejas sigan siendo válidas):
    - `esquema: 2` — marca las estructuras de la 045; sin él, la estructura es de la 043 y se normaliza al leer (RF-145, RF-146).
    - `plazo: { meses, arranque }` (RF-1, RF-2), `factorPrestacional`, `recargoHorasExtras` (RF-86, RF-87).
    - En cada ítem y rubro: `mesInicio`, `tiempoEjecucion` (ya existen en el ítem), `fijados: ValorDelMes[]` (RF-98). El rubro gana `mesInicio`, `tiempoEjecucion`, `fijados`, `revisar`. `medidaCoste: null` significa «sigue a la real» (RF-61, RF-64).
    - `renglonesIndirectos: RenglonIndirecto[]` con `id`, `concepto` (7 valores), `descripcion`, `forma` (`fijo | porcentaje | mensual | personal`), los campos de su forma, `operativo`, `mesInicio`, `tiempoEjecucion`, `fijados`, `revisar`, `sinDesglose` (RF-74–RF-95, RF-140).
    - `indirectosPorConcepto: Record<Concepto, ValorDelMes[]>` — **derivado**, como `indirectos` (RF-123, RF-158).
    - `propuesta: { explicacion, fallida }` (RF-25, RF-26), `indirectosCopiadosDe: { id, obra, version } | null` (RF-121), `editadoEnPantalla: boolean` (RF-45), `totalesPorConceptoDelExcel` (RF-43).
    - `items[].programacion` e `indirectos` **se siguen guardando**, ahora calculados por `recalcularPlanificacion`. Así el cumplimiento y el plan semanal leen lo mismo que hoy.
- **Migraciones**: `npm run db:generate:servidor` → debe aparecer `drizzle/servidor/0045_*.sql` con los dos enums, las columnas, el `drop not null` de las tres columnas y el check. Se aplica **solo en desarrollo (`neondb`)**; producción sigue pendiente de 0042–0044 y ahora 0045 (despliegue al cerrar la tanda).
- **Compatibilidad**: los teléfonos no se enteran. Las planificaciones existentes (`PRUEBA-043`, `PRUEBA-043 Magdalena`) quedan `origen = 'excel'`, su jsonb no se reescribe y sus informes dan las mismas cifras (RF-146).

## Algoritmo / reglas

**1. `recalcularPlanificacion(estructura)` — la única que deriva cifras (RF-57, RF-160).** Pura; la usan la pantalla en cada cambio (RF-56) y el servidor al guardar, al crear y al aprobar.
1. Por ítem: `importeReal = medidaReal × precioContractual`; `importeCosto = (medidaCoste ?? medidaReal) × costoReal(precioCosto)` (RF-65–RF-67, RF-64). Por rubro: `importeReal = valor`, `importeCosto = costoReal(costo)` (RF-68).
2. Reparto de cada ítem y rubro (paso 3) → `programacion` con `cantidad = cantidadDelMes(valor, precioContractual)` (RF-108). Ítem con precio contractual 0: el reparto es del costo, en partes iguales, y `cantidad = null` (RF-110, RF-111).
3. **Reparto con fijados** (RF-96–RF-99): meses del periodo `[mesInicio, mesInicio + n)`; `resto = total − Σ fijados dentro del periodo`; cada mes no fijado recibe `resto / (n − fijados)`. Si no hay meses sin fijar, el resto no se reparte y, si ≠ 0, es hallazgo (RF-101). `Σ fijados > total` → hallazgo (RF-100). Los fijados fuera del periodo no cuentan (se descartan al editar: RF-103). Valores sin redondear (RF-161).
4. `importeRealTotal = Σ ítems + Σ rubros` (RF-69).
5. Renglones indirectos: total por forma (RF-74–RF-77; personal con `factor + (operativo ? recargo : 0)`, RF-93). Reparto: fijo/mensual/personal con el paso 3 (RF-97); porcentaje en proporción a lo programado de ítems y rubros por mes (RF-105), o en partes iguales en el plazo si no hay nada programado (RF-106).
6. `indirectosPorConcepto` y `indirectos` (suma de los siete por mes) (RF-94, RF-95, RF-157).
7. Factor `1 + CI / Σ importeCosto` (`null` si el denominador es 0: RF-70, RF-73); por ítem y rubro, costo con indirectos y resultado (RF-71, RF-72); costo por mes en la proporción del importe real (RF-109).
8. Resumen y hallazgos (RF-122–RF-126); `impedimentosParaAprobar` (RF-127–RF-133).

**2. `aplicarEdicion(anterior, pedido)` (RF-46–RF-55, RF-61–RF-63).** Toma del pedido solo los campos editables, buscando cada ítem por su llave y cada rubro/renglón por su id; lo contractual siempre sale de `anterior` (RF-52, RF-53). Si `medidaCoste` del pedido es igual a la `medidaReal` del pedido, se guarda `null` (sigue a la real; RF-61). Valida negativos y meses enteros (RF-54, RF-55). Descarta fijados fuera del periodo y devuelve cuáles (RF-103, RF-104). Luego `recalcularPlanificacion`.

**3. Propuesta del calendario (RF-19–RF-31).** El servidor arma el borrador entero con `borradorDesdePresupuesto` (RF-14–RF-18, factores 1,2295 y 0,16 si no se copian: RF-88, RF-89; copia de indirectos con `copiarRenglones`: RF-114–RF-119). A la IA se le manda una lista numerada (índice, capítulo, ítem, descripción, unidad, cantidad, importe) y el plazo; responde por índice `{ inicio: 1..plazo, meses }` y una explicación. Se usan **meses relativos** y no `AAAA-MM`: así la validación es una resta y la IA no puede equivocarse de año. `validarCalendario` descarta inicio < 1 o fin > plazo (RF-20, RF-21) y marca para revisión (RF-22, RF-23); de la respuesta solo se toman `inicio`, `meses` y la explicación, cortada a 1 000 caracteres (RF-26, RF-27). Si la IA falla, el borrador nace sin calendario y con `propuesta.fallida` (RF-24, RF-25). El borrador se escribe en el mismo lote que cierra la lectura (RF-30), como hoy.

**4. Excel (RF-32–RF-43).** La lectura de ítems de la 043 sigue igual. Al terminar:
- Ítems y rubros: `fijados` = todos los meses de su periodo con lo que trae el Excel, **incluidos los meses en cero dentro del periodo**, para que el reparto no los rellene (D11). `mesInicio`/`tiempoEjecucion` de la hoja de tiempos; si no vienen, del primer y último mes programado. `plazo` = del menor `mesInicio` al último mes con programación (RF-33, RF-34).
- Los rubros que el libro junta en una sola línea (RF-109 de la 043) se tratan como programados por esa línea (D16, RF-163 a RF-167).
- Indirectos: segunda llamada a la IA (`leerIndirectos`) con la hoja de planificación (bloque de indirectos) y la hoja de programación. Por renglón devuelve concepto, descripción, forma, sus campos, el total del Excel y su fila de programación, todo citado. `estructuraDeIndirectos` comprueba cada cifra contra su celda (RF-38–RF-40); si el total de la forma no reproduce el del Excel con tolerancia de un peso, el renglón pasa a valor fijo con el total del Excel y se marca (RF-41, RF-42); sus meses del Excel entran como `fijados` (RF-37). Los totales por concepto del Excel se guardan para RF-43. Si esta segunda lectura falla, el borrador nace igual con un renglón «Indirectos sin desglose» hecho del total por mes que ya lee la 043, marcado para revisión.

**4b. Periodo deducido (cambio del 2026-11-16, RF-168 a RF-171, D17).** En `indirectoComprobado`, un renglón sin meses del libro recibe el periodo de la regla (arranque; meses de la fórmula hacia arriba, o todo el plazo) y `periodoDeducido: true` en vez de `revisar: true`; `revisar` sigue solo para RF-40 y RF-42. `hallazgosDelBorrador` lo lista con el tipo nuevo `periodo_deducido`, que no está en `impedimentosParaAprobar`. `aplicarEdicion` conserva la marca solo si el renglón ya la tenía y su `mesInicio` y `tiempoEjecucion` no cambiaron (RF-171): nunca la toma del pedido. `copiarRenglones` la quita, porque el periodo de la copia es otro. El contrato (`renglonIndirectoPedido`) la deja pasar opcional. La pestaña Indirectos muestra la etiqueta «Periodo deducido».

**5. Planificaciones de la 043 (RF-140, RF-145, RF-146).** `normalizarLegada` (al leer, sin escribir): si no hay `esquema: 2`, arma un renglón «Indirectos sin desglose» (forma fijo, `sinDesglose: true`, `revisar: true`, `fijados` = `indirectos`) y convierte la programación de ítems y rubros en `fijados`. Para mostrar y para copiar; **nunca** para recalcular lo guardado de una aprobada.

**6. Director de Obra (RF-150–RF-153).** `detalleDePlanificacion` quita los renglones de `mano_obra_indirecta` cuando el rol es `director_obra`, dejando el total por concepto. El informe de cumplimiento solo lleva totales por concepto, así que las descargas y el asistente no pueden filtrar salarios (RF-152).

## Decisiones técnicas

- **La estructura sigue en un solo jsonb y los derivados (`programacion`, `indirectos`) se siguen guardando** → se descartó normalizar renglones e ítems en tablas propias porque una versión aprobada no cambia, Neon por HTTP no da transacciones interactivas para escribir muchas filas a la vez, y guardar los derivados mantiene intactos el cumplimiento (043) y el plan semanal (044), que ya leen esos campos.
- **Una sola función pura `recalcularPlanificacion` en `shared/rules`, ejecutada en pantalla y en el servidor, y el servidor ignora los totales que manda el navegador** (principio 3, RF-57) → se descartó calcular solo en el servidor en cada cambio porque RF-56 pide recálculo inmediato y el panel tendría que esperar un viaje por cada tecla.
- **`PUT` con el borrador editable completo (no parches por campo) y bloqueo optimista por `version`** → se descartaron los parches por campo porque, con el reparto que depende de todo lo demás, un parche parcial obliga a recalcular igual la estructura entera, y el borrador cabe de sobra en una petición (≈200 ítems + 200 renglones). Es el mismo patrón del plan semanal.
- **La propuesta del calendario reusa `planificacion_lecturas` con un `tipo`** → se descartó una tabla nueva porque el índice parcial por obra ya da RF-29 sin código, y el vencimiento y la consulta de estado ya existen.
- **La IA responde el calendario en meses relativos (1..plazo)** → se descartó pedir `AAAA-MM` porque la lectura de la 043 ya mostró que la IA se equivoca de año («MAYO… MES 1» supuso 2024); con números relativos la validación es aritmética.
- **Indirectos del Excel en una segunda llamada a la IA, con su propia caché** → se descartó ampliar la lectura de ítems porque el bloque de indirectos añade unas 400 filas (planificación + programación) y la lectura ya roza el tope de filas; además, si falla, no tumba la lectura de ítems (cae a «Indirectos sin desglose»).
- **Meses del Excel como `fijados`, incluidos los ceros** (D11) → se descartó guardar solo los meses con valor porque el reparto rellenaría los ceros con el resto y cambiaría el Excel sin que nadie lo pidiera.
- **`medidaCoste: null` = «sigue a la real»** (RF-61) → se descartó una bandera aparte porque `null` ya significa eso en la 043 (RF-140) y así no hay dos fuentes de verdad.
- **Las planificaciones de la 043 se normalizan al leer, sin migración de datos** → se descartó reescribir su jsonb porque RF-146 exige que no cambien sus cifras, y una aprobada no se toca (principio 4).
- **El recorte de la mano de obra indirecta para el Director de Obra se hace en el servidor** → se descartó ocultarla en la pantalla porque el dato viajaría igual al navegador.
- **Sin cambios en `permisos.ts`** → «escribir» del módulo `planificacion` ya es exactamente quién edita (RF-46–RF-51, RF-81–RF-83).

## Impacto en la sincronización

Sin impacto en la sincronización. Es solo del panel y del servidor; nada baja al celular ni sube de él.

## Contrato de API

Todas abren con la guardia (`requerirPermiso(peticion, 'planificacion', …)`, que hace `requerirSesion`) y resuelven la obra con `alcance.ts` (`alcanzaLaObra` / `planificacionAlAlcance`). Fuera del alcance: 404.

- `POST /api/panel/planificaciones/desde-presupuesto` — `escribir`. Cuerpo: `{ obraId, plazo: 1..120, arranque: 'AAAA-MM', grupoId?, copiarIndirectosDe?, sustituirBorrador?: boolean }`.
  - 202 `{ lecturaId }`.
  - 409 si ya hay una lectura o propuesta en curso en la obra (RF-29).
  - 409 si hay un borrador y no se confirmó sustituirlo (RF-142).
  - 422 si no hay presupuesto vigente (RF-9, RF-10), si falta escoger el grupo (RF-13) o si la planificación de la cual copiar no sirve (RF-113).
  - 400 si el plazo o el mes no son válidos (RF-4).
- `GET /api/panel/planificaciones/lecturas/:id` — sin cambios: `en_curso | lista (con planificacionId) | fallida`.
- `PUT /api/panel/planificaciones/:id` — `escribir`. Cuerpo: `{ version, plazo, factorPrestacional, recargoHorasExtras, items: [{ llave, medidaReal, medidaCoste, precioCosto, mesInicio, tiempoEjecucion, fijados }], rubros: [{ id, costo, mesInicio, tiempoEjecucion, fijados }], renglones: RenglonIndirecto[] }`.
  - 200 con el detalle recalculado y los fijados descartados (RF-104).
  - 409 si la `version` no coincide (RF-58, RF-59).
  - 409 si ya no es borrador (RF-137).
  - 400 con el mensaje del campo inválido (RF-54, RF-55, RF-4).
  - Escritura de una sola sentencia: `update … where id = $1 and estado = 'borrador' and version = $2`; 0 filas → 409.
- `POST /api/panel/planificaciones/:id/copiar` — `escribir`. Solo desde la vigente.
  - 201 `{ planificacionId }`.
  - 409 si hay borrador y no se confirmó (RF-142, RF-143).
  - Descartar el borrador anterior e insertar el nuevo van en un lote (`batch`), como en `lecturas.ts`.
- `GET /api/panel/planificaciones/para-copiar-indirectos` — `escribir`. Vigentes y reemplazadas con `esquema: 2` de las obras al alcance (RF-112, RF-113).
- `POST /api/panel/planificaciones/:id/aprobar` — sin cambio de forma.
  - Nuevo 422 `{ impedimentos }` antes de la confirmación de hallazgos (RF-127–RF-132).
  - Antes de aprobar recalcula con `recalcularPlanificacion` (principio 3).
- `GET /api/panel/planificaciones/:id` — añade origen, renglones (recortados para el Director de Obra), `propuesta`, `editadoEnPantalla`.

## Estrategia de verificación

- **`scripts/verificar-reglas.ts`** (casos nuevos):
  - Reparto: partes iguales; un mes fijado al medio (resto en anteriores y siguientes, P7); todos fijados que no suman; fijados > total; cambio de periodo descarta fijados (RF-96–RF-104).
  - Porcentaje proporcional al programado y, sin nada programado, en partes iguales (RF-105–RF-107); ítem con precio contractual 0 (RF-110, RF-111); cantidad del mes (RF-108).
  - Las cuatro formas con **filas reales del Excel V2 OPC 8**: seguros M74, impuestos (retención 2 % sobre K69), maquinaria M94, instalaciones M139, varios M151, personal M189 (profesional) y M205 (operativo con 0,16), otros M239. Factor de indirectos ≈ 2,92 con los totales del libro (RF-70, RF-74–RF-77, RF-93).
  - Ítem fila 12 del V2: importes J, K, L, M, N (RF-65–RF-72).
  - Medida para costo que sigue a la real y que se respeta (RF-61–RF-64); `aplicarEdicion` ignora cambios a lo contractual (RF-52, RF-53).
  - Calendario de la IA: inicio 0, fin > plazo, campos de cantidades ignorados, explicación de 1 500 caracteres cortada (RF-20–RF-27).
  - Copia de renglones: arranque nuevo, recorte al plazo con marca, sin fijados, factores copiados (RF-114–RF-119).
  - `normalizarLegada` y «sin desglose» (RF-140, RF-145); cumplimiento de una estructura de la 043 da las mismas cifras antes y después (RF-146).
  - `impedimentosParaAprobar`: costo de relleno, rubro sin costo, sin medida real, sin programación, renglón incompleto, medida real 0 sin exigencias (RF-127–RF-133).
  - Lectura de indirectos: cifra que no está en su celda se descarta; renglón que no reproduce el total pasa a fijo marcado (RF-38–RF-42).
- **Demo manual** (Chrome por `http://127.0.0.1:8082`, servidor reiniciado tras tocar rutas `+api.ts`):
  1. En `PRUEBA-043`, como Director de Proyectos: «Crear desde el presupuesto» con 16 meses, arranque y copia de indirectos; ver «Propuesta en curso» y que una subida de Excel en esa obra se rechaza; luego el borrador con la explicación.
  2. Digitar costos, fijar un mes, cambiar la medida real de un ítem (la de costo la sigue), intentar aprobar con un ítem sin costo (rechazo con lista), completar y aprobar.
  3. Como Director de Obra: ve la planificación sin los renglones de mano de obra indirecta (y la respuesta de la API tampoco los trae); propone un plan semanal sobre ella; el informe mensual muestra indirectos por concepto.
  4. «Nueva versión» desde la vigente.
  5. Subir el Excel V2 OPC 8: indirectos por renglón con su reparto, comparación por concepto, menos del 5 % para revisar; digitar los costos de relleno, «Repartir en partes iguales» y aprobar.
  6. Abrir una planificación de la 043: «Indirectos sin desglose» y mismas cifras de cumplimiento.
- **Comprobaciones extra**: las llamadas nuevas a la IA leen la clave en el servidor, así que va la prueba de fugas (`npx expo export --platform web && grep -r "DATABASE_URL\|ANTHROPIC" dist/client`, vacía; `rm -rf dist`). No se añaden rutas al operador.

## Riesgos

- **Que el cumplimiento o el plan semanal cambien con planificaciones viejas.**
  - *Cómo se detecta:* el caso de RF-146 en `verificar-reglas.ts` y el paso 6 de la demo.
  - *Cómo se revierte:* las viejas no se reescriben; basta con quitar `normalizarLegada` del camino de cálculo.
- **Que la IA no reproduzca bien los indirectos del Excel** (formas mezcladas, filas enlazadas como `J207 = J100`).
  - *Cómo se detecta:* el umbral del 5 % de la demo y la comparación por concepto (RF-43).
  - *Mitigación:* lo que no cuadra entra como valor fijo marcado, así que las cifras no se pierden.
  - *Si falla del todo:* «Indirectos sin desglose».
- **Que la lectura o la propuesta se pasen de tiempo o de filas.**
  - *Mitigación:* las dos corren por detrás con vencimiento; la de indirectos va aparte y cacheada por huella.
  - *Cómo se detecta:* la lectura queda `fallida` con motivo.
- **Que el editor sea lento con 200 + 200 filas** (requisito: menos de 1 s).
  - *Mitigación:* recálculo en memoria (aritmética lineal) y meses desplegables solo para la fila abierta.
  - *Cómo se mide:* en la demo con el V2 completo.
- **Que el editor no quepa en `MaxContentWidthPanel`.**
  - *Mitigación:* sumar anchos de columna antes de cerrar cada tabla (regla de AGENTS.md); los meses van en la fila desplegable, no como columnas.
- **Que la migración 0045 rompa el check de las filas existentes.**
  - *Prevención:* el default `origen = 'excel'` y su `media_id` ya presente hacen que el check pase.
  - *Cómo se detecta:* aplicándola en `neondb`, que tiene las de prueba.
  - *Cómo se revierte:* `drop constraint` y columnas, porque no se borran datos.
- **Que el costo de IA suba:** una llamada más por Excel y una por propuesta.
  - *Mitigación:* las dos con caché y modelo existente; se registran tokens como hoy.

## Decisión tomada al planificar

- **D16** (Diego, 2026-11-13): los rubros que el Excel programa en una sola línea quedan programados por esa línea (meses fijados, se edita como un solo renglón); «Programar por rubro» la deshace. Entró a la spec como RF-163 a RF-167. En el código: `lineaDeRubros` gana `fijados` y la cuenta `recalcularPlanificacion`; la acción va en `aplicarEdicion`.
