# Plan técnico — Spec 034

> Lee antes `docs/constitucion.md` y el `spec.md` de esta carpeta.
> Aquí va el CÓMO. Si algo de esto cambia el comportamiento acordado, no se resuelve
> en el plan: se vuelve a la spec.

## Decisiones

- **Una sola tabla de documentos** para empresas y obras (`documentos_del_grupo`): `empresa_id` **o** `obra_id`, nunca los dos, con un `check` como el de `cortes_financieros` (spec 033). Se descarta una tabla por empresa y otra por obra: la pantalla, las reglas y la API serían el doble para lo mismo.
- **El archivo va en `media`**, como los documentos del contrato (spec 031), con un dueño nuevo `repositorio` en `dueno_media` (`ALTER TYPE … ADD VALUE`, aditivo). `media` no guarda el nombre original, así que va en la fila del documento (`nombre_archivo`).
- **Tipo real del archivo**: hoy `rechazoDeArchivo` confía en el `Content-Type` del navegador. Se agrega una regla pura `tipoPorFirma(bytes)` que mira los primeros bytes: PDF `%PDF`, JPEG `FF D8 FF`, PNG `89 50 4E 47`, WEBP `RIFF…WEBP`, Office nuevo (docx, xlsx) ZIP `PK 03 04`, Office viejo (doc, xls) OLE `D0 CF 11 E0`. Se acepta solo si la firma concuerda con la extensión (RF-26, caso límite de la extensión engañosa). Las reglas del contrato no cambian (RF-52).
- **Vencimientos**: se reutiliza `estadoDePoliza(hasta, hoy)` de `rules/polizas.ts` (vigente / por vencer a 30 días o menos / vencida), envuelta en `estadoDelVencimiento` para que un documento sin vencimiento o anulado no tenga estado (RF-38 a RF-42).
- **Rol nuevo `encargado_occ`** en `ROLES`. Es un rol y no un cargo porque cambia qué puede hacer en el sistema (comentario de `permisos.ts`). En el servidor es `ALTER TYPE rol_usuario ADD VALUE`. El celular lo guarda como texto sin fallar (008/RF-19) y, sin obra, ni siquiera le llega en el pull.
  - Sin obra: en OCC ve **todas las obras**, como gerencia en OCC. `veTodasLasObras` pasa a ser «gerencia, o el Encargado de OCC en un módulo de OCC»; para no abrirle las obras ni Elemental, el alcance se decide por módulo (`alcanzaElModulo` + la guardia de lugar `alcanzaLaEmpresa`/`alcanzaLaObraDeLaRuta`).
  - Permisos en la `TABLA`: los de gerencia en vehículos, asignaciones, bitácoras, preoperacionales, whatsapp, reportes, asistente, documentos (sin `anular`) y solicitudes; nada en obras, personas, almacén, cantera, laboratorio, contrato, empresa, finanzas, rrhh, compras, tesorería ni licitaciones (RF-15, RF-16).
  - Entra a `/panel/occ` (`destinoAlEntrar`), y `alcanzaLaEmpresa` solo le deja OCC (RF-14).
- **Abrir y descargar**: `GET /api/panel/media/[id]` ya sirve archivos con alcance. Se le suma el dueño `repositorio` (alcance: la empresa o la obra del documento) y `?descargar=1`, que agrega `Content-Disposition: attachment; filename*=UTF-8''<nombre original>` (RF-35, RF-36).

## Módulos y archivos

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `src/shared/rules/documentos.ts` (nuevo) | `CLASES_COMUNES`, `CLASES_POR_LUGAR` (Elemental, OCC, Geolab, obra), `clasesDe(lugar)`, `nombreDeClase`; `MIMES_DE_DOCUMENTOS`, `rechazoDeDocumento(mime, nombre, bytes, primerosBytes)` con `tipoPorFirma`; `faltasDelDocumento` (clase del lugar, nombre, fecha, vencimiento ≥ fecha); `estadoDelVencimiento`; `resumenDeVencimientos`; `coincideBusqueda` (sin tildes ni mayúsculas) | RF-18 a RF-29, RF-34, RF-38 a RF-42 |
| `src/shared/rules/permisos.ts` | `encargado_occ` en `ROLES` y `ETIQUETA_ROL` («Encargado de OCC»); su columna en cada fila de la `TABLA`; `documentos`: gerencia todo; supervisor, laboratorista y encargado de OCC `ver`, `listar`, `escribir` | RF-4 a RF-10, RF-15, RF-16 |
| `src/shared/rules/empresas.ts` | `MENU_DE_OBRA` + Documentos después de Contrato y Presupuesto; `EMPRESA_DEL_ROL.encargado_occ = 'occ'`; `destinoAlEntrar` → `/panel/occ`; `alcanzaLaEmpresa` (encargado de OCC → solo OCC; laboratorista → Geolab; supervisor → su obra) | RF-2, RF-5 a RF-7, RF-13, RF-14 |
| `src/shared/catalogos/cargos.ts` | Cargo «Encargado de OCC» con `rolSugerido: 'encargado_occ'`, `operaVehiculos: false` | RF-12 |
| `src/shared/rules/asistente.ts` | `encargado_occ` en `ROLES_DEL_ASISTENTE` | RF-15 |
| `src/features/servidor/alcance.ts` | `veTodasLasObras` y `alcanzaLaImagen` con el Encargado de OCC; `alcanzaElLugarDelDocumento(persona, {empresaId, obraId})` | RF-3 a RF-7, RF-50, RF-51 |
| `src/db/servidor/esquema.ts` + migración `0033_*` | Tabla `documentos_del_grupo`; `repositorio` en `dueno_media`; `encargado_occ` en `rol_usuario` | RF-23, RF-24, RF-30, RF-43, RF-44, RF-49 |
| `src/features/documentos/servidor/documentos.ts` (nuevo) | `subirDocumento` (validar → R2 → `media` → fila; si falla la fila no queda nada a medias), `documentosDelLugar` (filtros, búsqueda, anulados), `anularDocumento` (solo si no está anulado: `where anulado_en is null`, si no, 409) | RF-24 a RF-47 |
| `src/app/api/panel/documentos+api.ts` (nuevo) | `GET ?empresa=` o `?obraId=` (lista + resumen de vencimientos); `POST` multipart (datos + archivo) | RF-3 a RF-9, RF-24 a RF-41, RF-50, RF-51 |
| `src/app/api/panel/documentos/[id]/anular+api.ts` (nuevo) | `POST` con motivo; permiso `anular` (solo gerencia) | RF-10, RF-43, RF-44 |
| `src/app/api/panel/media/[id]+api.ts` | Dueño `repositorio`; `?descargar=1` con el nombre original | RF-35, RF-36 |
| `src/features/panel/contratos.ts` | Esquemas zod: subir y anular documento; respuesta de la lista | RF-24, RF-43 |
| `src/features/documentos/pantalla-documentos.tsx` (nuevo) | Resumen de vencimientos, filtros (clase, vencidos o por vencer, ver anulados), búsqueda, tabla, formulario de subir, anular con motivo (solo gerencia), abrir y descargar | RF-31 a RF-48 |
| `src/app/panel/[empresa]/[pagina].tsx`, `src/app/panel/proyectos/[obra]/[pagina].tsx` | `documentos` deja `PantallaEnConstruccion` y muestra la pantalla nueva | RF-1, RF-2 |
| `src/features/panel/pantalla-personas.tsx` | El cargo y el acceso nuevos en el formulario (se ven solos al estar en `ROLES` y en el catálogo); el Encargado de OCC no pide obra | RF-12, RF-13 |
| `scripts/verificar-reglas.ts` | Casos de `documentos.ts`, permisos de `documentos` y de `encargado_occ`, menú de obra, `destinoAlEntrar` y `alcanzaLaEmpresa` del rol nuevo | todos los de reglas |

## Modelo de datos

**Local** (`src/db/local/schema.ts`): sin cambios.

**Servidor** (migración `0033_*` con `npm run db:generate:servidor`):
- `rol_usuario` + `encargado_occ`; `dueno_media` + `repositorio` (los dos `ADD VALUE`, aditivos).
- **`documentos_del_grupo`**:
  - `id` (text, uuid v7), `empresa_id` (→ `empresas`, nula), `obra_id` (→ `obras`, nula);
  - `clase` y `clase_nombre` (congelado, RF-23);
  - `nombre`, `proveedor` (default `''`), `descripcion` (default `''`);
  - `fecha` (date), `vence` (date, nula);
  - `media_id` (→ `media`), `nombre_archivo`;
  - `subido_por` (→ `usuarios`), `subido_en`;
  - `anulado_en`, `anulado_por`, `motivo_anulacion`;
  - `check`: exactamente uno de `empresa_id` u `obra_id`, y `empresa_id` distinto de `proyectos`; `vence >= fecha`; anulado ⇔ motivo no vacío;
  - índices `(empresa_id, fecha)` y `(obra_id, fecha)`.
- Producción: la migración solo agrega; ninguna fila existente cambia.

## Riesgos

- `ALTER TYPE … ADD VALUE` no se puede usar en la misma transacción en la que se usa el valor nuevo: la migración no inserta nada con `encargado_occ` ni con `repositorio`.
- El Encargado de OCC toca muchas pantallas de OCC que hoy solo ve gerencia. Cada API de esas pantallas pasa por `veTodasLasObras`/`alcanza`; se revisa una por una en la demo, no solo en las reglas.
- R2 es compartido con producción: lo de prueba lleva PRUEBA-034 y se borra con la limpieza acotada (objetos de R2 incluidos, solo por su clave).

## Verificación

- En cada tarea: `npm run verificar`, `npm run typecheck` y `npm run lint` en verde, y nota en `tareas.md`.
- Demo en Chrome contra `npx expo start --web --port 8081` (la de la spec, «Criterios de finalización»), con sesiones temporales en dev para el Encargado de OCC, el residente y el laboratorista, borradas al final.
