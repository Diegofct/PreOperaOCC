# Plan técnico — Spec 032

> Lee antes `docs/constitucion.md` y el `spec.md` de esta carpeta.
> Aquí va el CÓMO. Si algo de esto cambia el comportamiento acordado, no se resuelve
> en el plan: se vuelve a la spec.

## Módulos y archivos

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `src/shared/rules/vehiculos.ts` (nuevo) | `normalizarPlaca` (mayúsculas, solo letras y cifras) e `identificacionDelVehiculo({placa, tipo, marca, modelo})` → placa, o «descripción · Falta la placa». Puro. | RF-11, RF-13, RF-20 |
| `src/shared/rules/parte.ts` | `bloqueosDelCierre` acepta `sinActividades`/`sinEnsayos` con motivo; `resolverSeccionSinRegistro` (como `resolverDiaSinTrabajo`) valida cómo queda el parte; `validarDiaSinTrabajo` sin cambios. | RF-21–RF-38 |
| `src/shared/rules/fusion.ts` | Al fusionar un reporte de WhatsApp con actividades o ensayos, devuelve también las marcas desmarcadas. | RF-27, RF-34 |
| `src/features/panel/contratos.ts` | Esquema de vehículo: sin `codigoInterno`, `placa` obligatoria normalizada. Esquema de parte: `sinActividades`, `motivoSinActividades`, `sinEnsayos`, `motivoSinEnsayos` (texto ≤ 200). Tipos de respuesta. | RF-9, RF-12, RF-22, RF-30 |
| `src/app/api/panel/vehiculos+api.ts`, `vehiculos/[id]+api.ts` | Alta/edición: `codigoInterno := placa normalizada`; al cambiar la placa guarda el código anterior; 409 «Ya hay un vehículo con la placa X». | RF-9–RF-11 |
| `src/app/api/panel/partes/[id]+api.ts`, `partes/[id]/cerrar+api.ts`, `partes+api.ts` | Leen y guardan las marcas nuevas; el cierre pasa las marcas a `bloqueosDelCierre`. | RF-21–RF-35 |
| `src/features/bitacoras/servidor/secciones.ts` | El `codigo` de cada máquina sale de `identificacionDelVehiculo` (ya se recalcula en cada guardado). | RF-15, RF-16 |
| `src/features/whatsapp/servidor/aprobacion.ts` | Escribe las marcas que devuelve la fusión. | RF-27, RF-34 |
| `src/features/whatsapp/servidor/catalogos.ts`, `src/shared/rules/whatsapp.ts` | Candidatos de reconocimiento: placa, código actual **y código anterior**. | RF-18, RF-19 |
| `src/features/whatsapp/servidor/creacion.ts` | Sin cambio de lógica: la volqueta ya nace con `codigo = WA-<placa>` → pasa a `codigo = placa`; la máquina sin placa sigue con su código `WA-…` interno. | RF-20a |
| `src/features/panel/pantalla-vehiculos.tsx`, `ventana-vehiculo.tsx` | Quitar campo y columna «Código»; rótulo «Placa / identificación» obligatorio; aviso «Falta la placa». | RF-9, RF-12, RF-20 |
| `pantalla-asignaciones.tsx`, `pantalla-preoperacionales.tsx`, `detalle-preoperacional.tsx`, `ventana-viaje.tsx`, `listado-viajes.tsx`, `whatsapp/*.tsx`, `seccion-llantas.tsx`, `src/features/reportes/**`, `src/features/asistente/servidor/herramientas.ts` | Donde se mostraba «código · placa» o el código, mostrar `identificacionDelVehiculo`. | RF-13, RF-17a |
| `src/features/panel/pantalla-partes.tsx` | Filas alineadas (ver Algoritmo) y casillas «Hoy no se realizaron…». | RF-1–RF-8, RF-21, RF-26, RF-29, RF-33, RF-36, RF-37 |
| `src/features/panel/componentes.tsx` | Si hace falta, un `FilaDeSeccion` con columnas fijas compartidas (reutiliza `FilaDeFormulario`, `Campo`, `Casilla`, `CampoObservacion`). | RF-1–RF-3 |
| `src/shared/rules/reportes.ts`, `src/features/reportes/exportar.ts`, `pestanas-de-obra.tsx`, `servidor/datos.ts` | Llevar las marcas y mostrar «No se realizaron actividades — motivo». | RF-36 |
| `scripts/032-placas-produccion.ts` (nuevo, una vez) | Pone las 3 placas MC y copia `codigo_interno → codigo_anterior`, `placa → codigo_interno`; actualiza el `codigo` de las máquinas de las bitácoras **abiertas**. Muestra conteos; idempotente. | RF-16, RF-19, RF-20 |
| `scripts/verificar-reglas.ts` | Casos nuevos (ver Verificación). | — |

## Modelo de datos

- **Local** (`src/db/local/schema.ts`): **sin cambios**. El celular ya recibe `codigo_interno`, y desde esta spec ese campo **es** la placa.
- **Servidor** (`src/db/servidor/esquema.ts`):
  - `vehiculos.codigo_anterior text null` — el código de antes, para que WhatsApp lo siga reconociendo (RF-19). Se llena una vez al migrar y al cambiar una placa.
  - `partes_de_obra`: `sin_actividades boolean not null default false`, `motivo_sin_actividades text`, `sin_ensayos boolean not null default false`, `motivo_sin_ensayos text`. El default `false` deja igual las bitácoras existentes (RF-38).
  - El índice único `ux_vehiculos_codigo` ya da la unicidad de la placa (RF-10) una vez que `codigo_interno = normalizarPlaca(placa)`.
- **Migraciones**: `npm run db:generate:servidor` → debe aparecer `drizzle/servidor/0031_*.sql`. Los datos (placas y códigos) van en el script aparte, no en la migración, porque dependen de producción.
- **Compatibilidad**: los teléfonos sin actualizar ven la placa en su próxima bajada, porque el pull ya manda `codigo_interno`. No hace falta versión nueva de la app (RF-14). Las 3 máquinas que siguen sin placa se verán en el celular con su código `WA-…` hasta que se les escriba.

## Algoritmo / reglas

**Identificación (RF-11, RF-13, RF-20)**
1. `normalizarPlaca(texto) = texto.toUpperCase().replace(/[^A-Z0-9]/g, '')`; vacío → `null`. Es la misma idea que `compacto` de `whatsapp.ts`: se reutiliza esa función o se mueve a `vehiculos.ts` y se importa desde las dos.
2. `identificacionDelVehiculo(v) = v.placa ?? \`${tipo} ${marca ?? ''} ${modelo ?? ''}\`.trim() + ' · Falta la placa'`.

**Alta y edición de vehículo (RF-9, RF-10, RF-12)**
1. `placa = normalizarPlaca(pedida.placa)`; vacía → 400 «Falta la placa / identificación».
2. `codigoInterno = placa`. En edición, si la placa cambió: `codigoAnterior = guardado.codigoInterno`.
3. Conflicto con el índice único → 409 «Ya hay un vehículo con la placa X». Una sola sentencia (Neon sin transacciones).

**Secciones sin registro (RF-21–RF-35)**
1. `resolverSeccionSinRegistro(guardado, cambios, 'actividades' | 'ensayos')`: la marca efectiva es `cambios ?? guardado`; si se desmarca, el motivo queda `null` (RF-28, RF-35); si la sección efectiva tiene filas → error `con_registros`. En ensayos cuenta también `ensayosDelModulo`.
2. `bloqueosDelCierre`:
   - Actividades vacía + `sinActividades` con motivo → no entra en «Falta llenar» y no se pide foto de actividad (RF-24, RF-25).
   - Marca sin motivo → bloqueo «Actividades: falta el motivo de por qué no se realizaron» (RF-23). Igual para ensayos (RF-31, RF-32).
   - Con `sinTrabajo` las marcas se ignoran (RF-37).
3. Fusión de WhatsApp: si `fusion.actividades.length > 0` → `sinActividades = false, motivo = null` (RF-27); igual con `laboratorio` (RF-34).

**Alineación (RF-1–RF-8)**
1. Medir en Chrome, antes de tocar nada, el alto de una bitácora de prueba (5 máquinas, 5 personas, 3 actividades, 2 ensayos) a 1280 px.
2. Una cuadrícula común por fila: columna 1 = nombre (ancho fijo igual en todas las secciones), columnas centrales por sección, columna final = casilla de observación + quitar (ancho fijo). Rótulos encima, en `Etiqueta`.
3. Por sección: Maquinaria y Personal en un renglón (RF-4, RF-5); Actividades y Control de calidad en dos como máximo (RF-6).
4. `< 768 px`: `flexDirection: 'column'` (RF-7), con `usar-ancho.ts` / `anchoDelContenido`.
5. Volver a medir: −25 % o más.

## Decisiones técnicas

- **El código interno pasa a ser la placa** (`codigo_interno = placa`) → se descartó borrar la columna o cambiar el celular para leer `placa`, porque obliga a migrar el SQLite del teléfono y a sacar versión nueva de la app; así el cambio llega al operador con la bajada normal y todo lo que hoy muestra el código muestra la placa.
- **`codigo_anterior` en el vehículo** → se descartó una tabla de alias, porque cada vehículo tiene un solo código viejo y no hay que llevar historia de alias; un campo basta para que WhatsApp lo siga reconociendo (RF-19).
- **Marcas como columnas del parte** (como `sin_trabajo`) → se descartó una fila especial dentro de `actividades`/`laboratorio`, porque esas listas se cuentan, se fusionan con WhatsApp y se exportan, y una fila falsa habría que excluirla en cada uno de esos sitios.
- **Placas de producción en un script aparte** → se descartó ponerlas en la migración SQL, porque son datos de producción (en desarrollo no existen esos vehículos) y la migración corre en las dos bases.
- **Sin componente nuevo de tabla para la bitácora** → se reutilizan `Campo`, `Casilla`, `CampoObservacion` y `FilaDeFormulario`; se descartó pasar la bitácora a `Tabla`, porque las filas se editan en línea y `Tabla` es de lectura.

## Impacto en la sincronización

- **Pull**: sin cambio de forma; `codigo_interno` llega ya con la placa.
- **Push / outbox**: sin cambios. El celular no manda el código: manda `vehiculoId`.
- **Idempotencia**: sin cambios.
- **Reevaluación en servidor**: el cierre de la bitácora sigue revalidando el parte entero con `bloqueosDelCierre`.

## Contrato de API

- `POST /api/panel/vehiculos` y `PATCH /api/panel/vehiculos/[id]`: guardia `requerirPermiso(…, 'vehiculos', 'escribir')` como hoy. Cuerpo sin `codigoInterno`; `placa` obligatoria. 400 sin placa; 409 placa repetida.
- `PATCH /api/panel/partes/[id]`: campos opcionales `sinActividades`, `motivoSinActividades`, `sinEnsayos`, `motivoSinEnsayos`. 400 con el mensaje de `resolverSeccionSinRegistro` si se contradicen. Solo partes abiertos (como hoy).
- `GET /api/panel/partes/[id]` y el listado: devuelven las cuatro columnas.
- `POST /api/panel/partes/[id]/cerrar`: 409 con la lista de bloqueos, como hoy.

## Estrategia de verificación

- **`scripts/verificar-reglas.ts`**:
  - `normalizarPlaca`: «tay-076», « TAY 076 » → «TAY076»; vacío → null (RF-11).
  - `identificacionDelVehiculo`: con placa / sin placa (RF-20).
  - Reconocimiento WhatsApp por código anterior (RF-19) y por placa (RF-18).
  - `bloqueosDelCierre`: marca sin motivo bloquea (RF-23, RF-31); con motivo no pide la sección ni la foto (RF-24, RF-25, RF-32); con `sinTrabajo` se ignoran (RF-37).
  - `resolverSeccionSinRegistro`: marcar con filas → error; desmarcar borra el motivo (RF-28, RF-35).
  - Fusión con actividades/ensayos desmarca (RF-27, RF-34).
- **Demo manual en Chrome (dev)**: la del criterio de finalización de la spec, con datos `PRUEBA-032`; medición de alto antes/después a 1280 px; vista a 390 px (iframe de 390 px, ver memoria).
- **Comprobaciones extra**: `npx expo export --platform web && grep -r "DATABASE_URL" dist/client` vacío (se toca un endpoint); `rm -rf dist`.

## Riesgos

- **Pantallas que muestran «código · placa» quedarían repetidas («TAY076 · TAY076»).** Se detecta con `grep -rn codigoInterno src/features`; se arregla usando `identificacionDelVehiculo` en todas.
- **El script de placas corre a medias** (Neon sin transacciones). Es idempotente: se vuelve a correr. Antes imprime lo que va a cambiar y se pide permiso al usuario para correrlo en producción.
- **Reportes de WhatsApp con códigos viejos dejan de reconocerse** si el script no copió `codigo_anterior`. Se detecta con el caso de `verificar-reglas` y con un reporte de prueba; se corrige volviendo a correr el script.
- **El rediseño de filas rompe la vista móvil del panel.** Se revisa a 390 px antes de cerrar la tarea; se revierte con el diff de `pantalla-partes.tsx`.
- **Orden de despliegue**: migración → imagen → script de placas. Si el script corre antes de la imagen, el panel viejo mostraría «Código» con la placa: no es grave, pero se respeta el orden.
