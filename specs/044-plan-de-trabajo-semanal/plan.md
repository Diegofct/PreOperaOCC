# Plan técnico — Spec 044, Plan de trabajo semanal

> Lee antes `docs/constitucion.md` y el `spec.md` de esta carpeta.
> Aquí va el CÓMO. Si algo de esto cambia el comportamiento acordado, no se resuelve
> en el plan: se vuelve a la spec.

Todo es panel web y servidor; el celular no se entera. Se calca la forma de la 043: reglas puras en
`shared/rules/`, lectura con IA que corre por detrás con su estado consultable, versiones con índices
parciales y `db.batch`, y descargas con el escritor de hojas de Reportes. No se añaden dependencias.

## Módulos y archivos

Se reutiliza, sin copiar: `cruzarConPresupuesto`/`llaveDeItemPlanificado` y la resolución por renglón
de la 043, `estaEnLaFila` y `textoParaLeer` de `planificacion-ia.ts` (se exporta el primero),
`libroConNombres`, `pareceXlsx`, el patrón de `planificacion/servidor/lecturas.ts`, `esFestivo`,
`fechaDeJornada`, `periodoDe`, `vehiculosDeLaObra` (Reportes), `leerMateriales` y `filasDeMateriales`
(Almacén), `escribirHoja` (Reportes), `requerirPermiso`, `obraDelContrato`, `alcanzaLaObra` y
`informeDeLaObra` (043), que pasa a cargar los planes.

### Reglas puras

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `src/shared/rules/plan-semanal.ts` (nuevo) | Tipos y estados; semanas permitidas; días por defecto con festivos; reparto con redondeo; validar sumas; meta diaria, totales y valores; cruce de actividades con la planificación (ítem, renglón, rubro, fuera); avisos; autor y quién aprueba; plan que rige cada día; metas del plan por día y llave; textos con pesos; proyección sin plata | RF-1 a RF-33, RF-50 a RF-69, RF-87 a RF-103, RF-106 |
| `src/shared/rules/plan-semanal-ia.ts` (nuevo) | Qué se manda para proponer (programación del mes, pendientes, semana anterior, vehículos, existencias si hay almacén) y qué se acepta de la IA y del Excel (comprobación contra la celda, recálculo, diferencias con el Excel) | RF-34 a RF-49, RF-96, RF-104, RF-105 |
| `src/shared/rules/cumplimiento-de-obra.ts` | `planSemanal` (un mapa por semana) pasa a **planes por día**; meta y valor programado del día salen del plan que rige ese día; «Parcialmente estimada»; sin planificación no hay meta aunque haya plan | RF-70 a RF-77, RF-90, RF-95, RF-98, RF-107 |
| `src/shared/rules/planificacion-ia.ts` | Exporta `estaEnLaFila`, sin cambiarla | RF-44, RF-45 |
| `src/shared/rules/permisos.ts` | Módulo `plan_semanal` en `MODULOS_DE_EMPRESA`, su fila en `TABLA` y sus frases | RF-29, RF-54, RF-59, RF-65, RF-82, RF-83 |
| `src/shared/rules/empresas.ts` | Entrada «Plan semanal» en `MENU_DE_OBRA` | RF-78 |

### Servidor

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `src/features/plan-semanal/servidor/planes.ts` (nuevo) | Listar por obra, detalle según el rol, crear vacío y guardar el borrador con `version` | RF-50, RF-55, RF-64, RF-78, RF-79, RF-86, RF-87 |
| `src/features/plan-semanal/servidor/lecturas.ts` (nuevo) | Proponer y leer Excel: validar, reservar obra y semana, correr por detrás, crear el borrador; sustituir con descarte | RF-5, RF-34 a RF-53, RF-92, RF-101, RF-105 |
| `src/features/plan-semanal/servidor/con-ia.ts` (nuevo) | Las dos llamadas a la IA: proponer el plan y leer el Excel, con salida estructurada, como `planificacion/servidor/leer-con-ia.ts` | RF-34, RF-44, RF-104 |
| `src/features/plan-semanal/servidor/versiones.ts` (nuevo) | Aprobar y anular en lote condicionado | RF-56 a RF-68, RF-99, RF-100, RF-106 |
| `src/features/plan-semanal/servidor/descargas.ts` (nuevo) | El Excel con las secciones del de la Directora, sin plata para el Residente | RF-80, RF-81, RF-30, RF-102 |
| `src/features/planificacion/servidor/cumplimiento.ts` | Carga los planes aprobados (vigentes y anulados) de las semanas del periodo y los pasa a la regla | RF-70 a RF-77, RF-107 |
| `src/features/panel/plan-semanal.ts` (nuevo) | Esquemas Zod y tipos compartidos por pantallas y rutas | Transversal |

### Rutas `+api.ts` y pantallas

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `src/app/api/panel/planes-semanales+api.ts` | `GET` listado, `POST` crear vacío | RF-55, RF-78 |
| `src/app/api/panel/planes-semanales/[id]+api.ts` | `GET` detalle, `PUT` guardar borrador | RF-22, RF-23, RF-29, RF-30, RF-79, RF-86, RF-87, RF-102 |
| `src/app/api/panel/planes-semanales/proponer+api.ts` | Inicia la propuesta | RF-34 a RF-41, RF-96, RF-101, RF-105 |
| `src/app/api/panel/planes-semanales/leer+api.ts` | Inicia la lectura del Excel | RF-42 a RF-49, RF-92, RF-101 |
| `src/app/api/panel/planes-semanales/lecturas/[id]+api.ts` | Estado de la propuesta o lectura | RF-49 |
| `src/app/api/panel/planes-semanales/[id]/aprobar+api.ts` | Aprobar | RF-56 a RF-63, RF-99, RF-100, RF-106 |
| `src/app/api/panel/planes-semanales/[id]/anular+api.ts` | Anular | RF-65 a RF-67 |
| `src/app/api/panel/planes-semanales/[id]/excel+api.ts` | Descarga | RF-80, RF-81 |
| `src/features/plan-semanal/pantalla-plan-semanal.tsx` (nuevo) | Semanas (en curso y 4 siguientes, más las pasadas en solo lectura), proponer, subir, progreso | RF-2 a RF-5, RF-34, RF-42, RF-52, RF-78, RF-92 |
| `src/features/plan-semanal/editor-plan-semanal.tsx` (nuevo) | Días, actividades con reparto y ajuste por día, secciones de texto y tablas, avisos, guardar | RF-6 a RF-33, RF-87, RF-91, RF-93, RF-97 |
| `src/features/plan-semanal/acciones-plan-semanal.tsx` (nuevo) | Aprobar con avisos confirmados, anular con motivo, descargar | RF-56 a RF-67, RF-80 |
| `src/features/planificacion/pantalla-cumplimiento.tsx` y `exportar.ts` | «Parcialmente estimada» con sus días | RF-95 |
| `src/features/empresas/paginas-de-empresa.tsx` | Registra la página | RF-78 |
| `src/features/panel/cliente-api.ts` | `api.planesSemanales` | Transversal |

## Modelo de datos

- **Local** (`src/db/local/schema.ts`): sin cambios.
- **Servidor** (`src/db/servidor/esquema.ts`):
  - `estado_plan_semanal`: `borrador | vigente | anulado | descartado`.
  - `estado_lectura_plan_semanal`: `en_curso | lista | fallida`; `origen_plan_semanal`: `ia | excel | manual`.
  - **`planes_semanales`**, una fila por plan: `id`, `obra_id`, `semana` (`date`, el lunes), `estado`,
    `origen`, `estructura` (jsonb: días marcados, actividades, personal, maquinaria, materiales,
    volquetas, supuestos, riesgos, requerimientos), `rechazados` y `diferencias_excel` (jsonb, de la
    lectura), `planificacion_id` (la versión con que se cruzó, para RF-100), `creado_por` (autor,
    RF-55), `actualizado_por` (RF-87), `aprobado_en`/`_por`, `rige_desde` (`date`), `anulado_en`/`_por`,
    `motivo_anulacion`, `descartado_en`/`_por`, `version` y auditoría.
    - Índices únicos parciales: `(obra_id, semana)` con `estado = 'borrador'` y con `estado = 'vigente'`.
    - `check`: anulado exige motivo no vacío; vigente o anulado exige `aprobado_en` y `rige_desde`.
  - **`plan_semanal_lecturas`**: `id`, `obra_id`, `semana`, `tipo` (`propuesta | excel`), `estado`,
    `plan_id` reservado, `error`, `vence_en`, `creado_por`, auditoría. Índice único parcial
    `(obra_id, semana)` con `estado = 'en_curso'` (RF-101).
- **Migraciones**: `npm run db:generate:servidor`; debe aparecer `drizzle/servidor/0043_*.sql`. Solo
  enums y tablas nuevos: no hace falta escribir nada a mano. Se aplica solo en desarrollo.
- **Compatibilidad**: los teléfonos no se enteran. La regla de cumplimiento cambia su parámetro, y sin
  planes el informe da exactamente lo mismo que hoy: lo prueba el juego de la 043, que no se toca.

## Algoritmo / reglas

**Semanas y días (RF-1 a RF-4, RF-17 a RF-25, RF-96, RF-99)**

1. `semanasPermitidas(hoy)`: el lunes de la semana de `hoy` y los 4 siguientes. Una semana fuera de
   ese rango no se arma; un borrador cuya semana terminó no se aprueba.
2. `diasPorDefecto(semana)`: lunes a sábado menos `esFestivo`. Se puede marcar un festivo.
3. `repartir(meta, dias)`: `meta / n` redondeado a tres decimales en cada día, y el último día marcado
   recibe `meta − suma(los anteriores)`. Así la suma es exacta (RF-21).
4. Al guardar, cada actividad con cantidades: `suma(dias) === meta` con tolerancia de 0,0005; si no,
   400 con la actividad que no cuadra (RF-23). Meta diaria = meta / n; total = suma (RF-24, RF-25).

**Actividades y cruce (RF-6, RF-31, RF-32, RF-41, RF-88 a RF-91, RF-97)**

5. Cada actividad es `item` (cruzada con la planificación vigente por frente del presupuesto,
   capítulo e ítem; o por renglón), `fuera` (no cruza) o `rubro` (valor tecleado, sin meta en
   cantidades). La llave es la de `llaveDeItemPlanificado`, la misma que usa el cumplimiento.

**Valores (RF-26 a RF-28, RF-94)**: se calculan al mostrar o descargar, nunca se guardan: meta ×
precio de costo del ítem en la planificación vigente; sin costo, sin valor y con aviso; el rubro
lleva su valor tecleado. El total suma ítems y rubros.

**Avisos (RF-33, RF-48, RF-60, RF-93, RF-100)**: meta mayor que lo pendiente (planeada menos acumulado
de la obra, con los partes hasta hoy); ítems sin costo; diferencias con el Excel; planificación más
nueva que la usada. Se calculan al mostrar y otra vez al aprobar.

**Quién aprueba (RF-56 a RF-59)**: `puedeAprobarPlan(aprobador, autor)`: autor Director de Proyectos →
Director de Proyectos o Gerencia; autor Gerencia → Gerencia o Director de Proyectos; autor Director de
Obra o Residente → Director de Obra de esa obra, Director de Proyectos o Gerencia. El Residente nunca.

**Qué plan rige cada día (RF-62, RF-67, RF-68)**: un plan aprobado rige de `rige_desde` (el día de
aprobar, o el lunes si la semana no empezó) hasta su anulación (el día anterior a anular) o el
domingo de su semana. `planQueRige(dia, planes)` busca el que contiene el día; como no hay dos
vigentes por semana y un anulado termina antes del siguiente, como mucho hay uno.

**Meta del cumplimiento (RF-70 a RF-77, RF-90, RF-95, RF-98, RF-107)**, en `metaDelPeriodo`:

6. Para cada día del periodo semanal: si no rige planificación, sin meta (RF-77). Si rige un plan,
   la meta del día es la cantidad del plan para ese día, sumando las actividades de la misma llave;
   ítems que no están en el plan, cero; rubros y «fuera», no cuentan. Si no rige plan, el reparto
   de hoy en los días de reparto.
7. `estimada` sigue diciendo si algún día salió del reparto, y se añade `diasDelPlan`: con días de los
   dos tipos la fila es «Parcialmente estimada». El mes no usa planes (RF-74).
8. El valor programado de cada día usa el precio de la planificación que rige ese día (RF-75).

**Texto con plata (RF-102, RF-103)**: `contienePesos(texto)` = tiene «$» o la palabra «pesos»
(sin mayúsculas ni tildes). La proyección para el Residente quita valores y reemplaza esos textos.

**Proponer (RF-34 a RF-41, RF-96, RF-104, RF-105)**: se arma un texto con la programación del mes de la
planificación vigente (ítems con su llave, unidad y cantidad del mes), lo pendiente por ítem, el
cumplimiento de la semana anterior (la misma función de la 043), los vehículos de la obra y, si la
obra lleva almacén, las existencias. La IA devuelve la estructura completa con referencias a las
llaves que se le dieron; la regla descarta llaves que no existen (pasan a «fuera»), recalcula días,
reparto y totales, y marca lunes a sábado sin festivos.

**Leer Excel (RF-42 a RF-49, RF-92)**: como la 043: hojas visibles, texto con «H<hoja>F<fila>», la IA
cita hoja y fila de cada cifra y `estaEnLaFila` la comprueba; una cifra que no está se descarta y
marca su renglón. Se toman la meta y los días con cantidad; lo demás se recalcula y, si el Excel
traía otra meta diaria o total, se guarda la diferencia para el aviso.

## Decisiones técnicas

- **El gancho del plan en la regla de cumplimiento pasa de un mapa por semana a planes por día** →
  se descartó mantener el mapa semanal porque no puede expresar un plan aprobado a mitad de semana
  (RF-62), la semana «Parcialmente estimada» (RF-95) ni un día sin planificación con plan (RF-77). Sin
  planes, el resultado es idéntico al de hoy, y las pruebas de la 043 lo vigilan.
- **Los valores se calculan al mostrar, no se guardan** → se descartó guardarlos al aprobar porque la
  spec pide recalcularlos siempre (RF-94), igual que los informes de la 043.
- **Una tabla de planes con estados y otra de lecturas**, como la 043 → se descartó guardar las
  versiones dentro de un solo documento por semana porque los índices parciales («un borrador», «un
  vigente», «una lectura en curso») son los que garantizan RF-50, RF-51 y RF-101 sin transacciones.
- **No se guarda el Excel original ni la lectura con IA para reutilizarla** → la spec no lo pide (en la
  043 sí: RF-8, RF-10). Un plan semanal se sube una vez y se ajusta en pantalla; si un día se pide,
  se añade con el mismo patrón.
- **La identidad de una actividad es la llave de la 043** → se descartó guardar solo el renglón porque
  el cumplimiento mide por llave, y el mismo renglón puede cambiar entre versiones de la planificación.
- **El guardado del borrador es un `PUT` con `version` que reemplaza la estructura entera** → se
  descartó guardar celda por celda porque el editor tiene decenas de campos y la comprobación de sumas
  (RF-23) es del conjunto; con `version`, el guardado de otra persona no se pisa (RF-86).
- **Proponer también corre por detrás con estado consultable** → se descartó una respuesta síncrona
  porque la propuesta puede pasar de los 120 s del proxy del VPS, como la lectura de la 043.

## Impacto en la sincronización

Sin impacto en la sincronización: nada de esto baja al teléfono ni sube de él.

## Contrato de API

Todas las rutas abren con `requerirPermiso` del módulo `plan_semanal`. La obra se resuelve con
`obraDelContrato`, y en las rutas con `:id` se lee el plan y se mira su obra con `alcanzaLaObra`; una
ajena responde 404. Los cambios de varias filas son un solo `db.batch` con sentencias condicionadas.

| Método y ruta | Permiso | Respuesta |
| --- | --- | --- |
| `GET /api/panel/planes-semanales?obraId=` | `listar` | 200 semanas permitidas y planes con estado, autor y aprobador |
| `POST /api/panel/planes-semanales` con `{ obraId, semana }` | `escribir` | 201 borrador vacío; 409 ya hay borrador o sin planificación; 400 semana fuera del rango |
| `GET /api/panel/planes-semanales/:id` | `ver` | 200 detalle con avisos y valores, o sin plata para el Residente; 404 |
| `PUT /api/panel/planes-semanales/:id` con `{ version, estructura }` | `escribir` | 200; 400 suma que no cuadra, con la actividad; 409 cambió o no es borrador |
| `POST /api/panel/planes-semanales/proponer?obraId=&semana=&sustituir=` | `escribir` | 202 `{ lecturaId }`; 409 lectura en curso, borrador sin `sustituir` o sin planificación; 400 semana |
| `POST /api/panel/planes-semanales/leer?obraId=&semana=&sustituir=` con los bytes | `escribir` | 202; 409; 413; 422 no es `.xlsx` |
| `GET /api/panel/planes-semanales/lecturas/:id` | `escribir` | 200 `en_curso`, `lista` con id o `fallida` con motivo; 404 |
| `POST /api/panel/planes-semanales/:id/aprobar` con `{ version, confirmarAvisos }` | `aprobar` + regla de autor | 200; 403 autor que no le toca; 409 cambió, avisos sin confirmar o semana terminada; 404 |
| `POST /api/panel/planes-semanales/:id/anular` con `{ motivo }` | `anular` + regla de autor | 200; 400 sin motivo; 409 no es el vigente; 404 |
| `GET /api/panel/planes-semanales/:id/excel` | `ver` | 200 adjunto; sin plata para el Residente; 404 |

| Permiso `plan_semanal` | Gerencia y Director de Proyectos | Director de Obra | Residente | Demás |
| --- | --- | --- | --- | --- |
| acciones | `ver`, `listar`, `escribir`, `aprobar`, `anular` | `ver`, `listar`, `escribir`, `aprobar`, `anular` | `ver`, `listar`, `escribir` | ninguno |

## Estrategia de verificación

- **`scripts/verificar-reglas.ts`** (prefijo «044/»):
  - Semanas: la en curso y 4 más sí, la pasada y la quinta no; borrador de semana terminada no se aprueba (RF-2 a RF-4, RF-99).
  - Días: festivo desmarcado por defecto y marcable; reparto 10 entre 3 da 3,333 + 3,333 + 3,334; suma que no cuadra se rechaza; totales y meta diaria (RF-17 a RF-25).
  - Cruce: ítem por llave y por renglón, «fuera», rubro; dos actividades del mismo ítem (RF-31, RF-32, RF-88 a RF-91, RF-97).
  - Valores: costo de la planificación, sin costo con aviso, rubro con su valor (RF-26 a RF-28).
  - Avisos: meta sobre lo pendiente, planificación más nueva, diferencias del Excel (RF-33, RF-48, RF-100).
  - Quién aprueba: cada autor contra cada cargo, y el Residente nunca (RF-56 a RF-59).
  - Qué plan rige: aprobado antes del lunes, a mitad de semana, anulado y vuelto a aprobar (RF-62, RF-67, RF-68).
  - Cumplimiento con plan: meta del plan sin «estimada», ítem fuera del plan sin meta, «Parcialmente estimada» con sus días, rubros y «fuera» sin meta, sin planificación sin meta, mes sin cambios; y todo el juego de la 043 sigue en verde (RF-70 a RF-77, RF-90, RF-95, RF-98, RF-107).
  - Plata: `contienePesos`, y la proyección del Residente sin ninguna clave de plata (RF-29, RF-30, RF-102, RF-103).
  - IA: qué se manda (sin existencias si no hay almacén), descarte de llaves inventadas, comprobación por celda, recálculo y diferencias con el Excel de referencia (RF-35 a RF-49, RF-104, RF-105).
- **Demo manual**: la de la spec, en `PRUEBA-043` con la planificación de Magdalena aprobada, contra el
  panel en el 8082 y con usuarios temporales: proponer como Residente, ajustar y aprobar como Directora
  (marcando un festivo), subir el Excel de referencia en otra semana, ver el cumplimiento de esa semana,
  anular y volver a aprobar a mitad de semana, y descargar como Directora y como Residente. Se miden
  anchos a 1 280 px.
- **Comprobaciones extra**: migración `0043` presente; como se lee la clave de la IA en flujos nuevos,
  `npx expo export --platform web`, `grep -r "DATABASE_URL" dist/client` vacío y borrar `dist`.

## Riesgos

- **La IA propone metas sin sentido** (más de lo pendiente, ítems que no existen). Se detecta con los
  avisos (RF-33) y con las llaves descartadas a «fuera» (RF-41); se corrige ajustando en pantalla.
- **El Excel de la Directora cambia de forma.** La lectura cita celda por celda y lo que no está se
  descarta (RF-45); se prueba con el de referencia. Si una forma nueva falla, RF-49 explica el motivo.
- **El cambio en la regla de cumplimiento rompe la 043.** Se detecta con sus pruebas, que no se tocan;
  se revierte volviendo a la firma anterior, porque la 043 nunca recibió planes.
- **La propuesta tarda o cuesta más de lo previsto.** Es más corta que una lectura de planificación
  (≈ 20 actividades), pero se mide en la demo; el vencimiento de la lectura es el de la 043.
- **Dos personas editan el mismo borrador a la vez.** `version` hace que el segundo reciba 409 sin
  pisar (RF-86); la pantalla lo dice y ofrece recargar.
- **Producción**: la migración `0043` va después de la `0042`, con `scripts/migrar-produccion.ts` y
  antes de la imagen, cuando se despliegue la tanda.
