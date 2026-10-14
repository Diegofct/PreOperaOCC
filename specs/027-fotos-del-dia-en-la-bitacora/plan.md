# Plan técnico — Spec 027

> Lee antes `docs/constitucion.md` y el `spec.md` de esta carpeta.
> Aquí va el CÓMO. Si algo de esto cambia el comportamiento acordado, no se resuelve
> en el plan: se vuelve a la spec.

## Lo que ya existe y se reutiliza

- Las fotos de WhatsApp ya viven en `media` con `dueno_tipo = 'whatsapp'` y `dueno_id` = id del
  mensaje, con su `clave_r2`, `sha256` y `mime`.
- `GET /api/panel/media/:id` ya sirve una foto de WhatsApp con el alcance de su mensaje
  (`alcanzaElMensaje`): la sección puede pedir la misma foto, sin copiarla (RF-32, RF-33).
- La foto principal es la fila de `media` con `dueno_tipo = 'bitacora'`, `dueno_id` = parte e
  `item_key` nulo (024/RF-53, `primeraFoto`, `archivoRecibido`). No cambia (RF-11).
- El mensaje ya trae lo que la sección muestra: `autor_nombre`, `enviado_en`, `categoria` (con
  `etiquetaDeCategoria`) y `propuesta_ia->>'resumen'` (RF-14 a RF-17).
- `apartar` y «No se pudo guardar» para la foto que llega a una bitácora cerrada (RF-21).

## Módulos y archivos

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `src/db/servidor/esquema.ts` | Tabla nueva `bitacora_fotos` (ver Modelo de datos) | RF-1, RF-8, RF-25 a RF-27 |
| `drizzle/servidor/0025_*.sql` | Migración de la tabla nueva | — |
| `src/shared/rules/fotos-del-dia.ts` (nuevo) | `fotoEntraALaBitacora(foto, contexto)` y `fotosParaAgregar(candidatas, yaEstan, principal)`: reglas puras de qué foto entra | RF-1, RF-3 a RF-6, RF-8, RF-12, RF-20, RF-27, RF-31 |
| `src/features/whatsapp/servidor/fotos-del-dia.ts` (nuevo) | `sincronizarFotosDelDia(obraId, fecha)`: lee las candidatas, aplica la regla, inserta en `bitacora_fotos` o aparta la foto si la bitácora está cerrada | RF-1, RF-2, RF-9, RF-10, RF-20, RF-21 |
| `src/features/whatsapp/servidor/dias.ts` | Llama a `sincronizarFotosDelDia` al final de `armarBitacora`, de `actualizarDia` y de `archivoRecibido` | RF-1, RF-9, RF-10 |
| `src/features/whatsapp/servidor/pulso.ts` | Recorre los días abiertos con fotos sin agregar (red de seguridad) | RF-9, RF-10 |
| `src/app/api/panel/partes/[id]/fotos-del-dia+api.ts` (nuevo) | `GET`: la sección; `POST …/quitar`: quitar con motivo | RF-13 a RF-18, RF-22 a RF-28 |
| `src/features/panel/cliente-api.ts`, `contratos.ts` | `api.partes.fotosDelDia(id)` y `api.partes.quitarFoto(id, fotoId, motivo)` | RF-13, RF-22 |
| `src/features/panel/pantalla-partes.tsx` | Sección «Fotos del día» bajo «Fotografía del día»: cuadrícula de miniaturas con quién, hora, tipo y descripción; visor a tamaño completo; «Quitar» con motivo si es editable | RF-13 a RF-18, RF-22, RF-23, RF-28 |
| `src/features/panel/whatsapp/no-se-pudo-guardar.tsx` | Sección `fotos` («Foto»): sin Completar ni Reintentar, solo Descartar; muestra la miniatura | RF-21, RF-22 |
| `scripts/fotos-del-dia-pasados.ts` (nuevo, de una vez) | Agrega las fotos de las bitácoras abiertas desde el 7-oct y da por guardadas las apartadas con «Alguien guardó la bitácora…» | RF-29 a RF-31 |
| `scripts/verificar-reglas.ts` | Casos de la regla nueva | ver Verificación |

## Modelo de datos

- **Local** (`src/db/local/schema.ts`): sin cambios. La bitácora y WhatsApp viven solo en el
  servidor.
- **Servidor** (`src/db/servidor/esquema.ts`): tabla nueva `bitacora_fotos`:

  | Columna | Tipo | Para qué |
  | --- | --- | --- |
  | `id` | text pk | `idDeterminista(parteId, 'foto-del-dia', mediaId)`: reintentar no duplica |
  | `parte_id` | text → `partes_de_obra.id` | La bitácora |
  | `media_id` | text → `media.id` | La foto de WhatsApp (no se copia, RF-32) |
  | `mensaje_id` | text → `whatsapp_mensajes.id` | De dónde salen quién, hora, tipo y descripción |
  | `sha256` | text | Para no repetir el mismo archivo (RF-8) |
  | `agregada_en` | timestamptz | — |
  | `quitada_en`, `quitada_por` → `usuarios.id`, `motivo_quitada` | | Quitar es lógico (principio 4, RF-25 a RF-27) |

  Índices: único `(parte_id, media_id)`; único parcial `(parte_id, sha256) where sha256 is not
  null` (RF-8); `(parte_id)`. Check: quitada exige motivo no vacío (RF-24).
- **Migraciones**: `npm run db:generate:servidor` → `drizzle/servidor/0025_*.sql`; en
  producción con `scripts/migrar-produccion.ts`, antes de la imagen.
- **Compatibilidad**: los teléfonos no se enteran (no hay réplica). La imagen anterior ignora la
  tabla: volver atrás no rompe nada.

## Algoritmo / reglas

`fotoEntraALaBitacora` (pura, en `src/shared/rules/fotos-del-dia.ts`), con la foto
`{ mime, categoria, fechaHecho, sha256, recibidaEnMs }` y el contexto `{ fecha, cerradaEnMs,
desde: '2026-10-07' }`. Devuelve `'agregar' | 'apartar_cerrada' | 'no'`:

1. `mime` no empieza por `image/` → `no` (video, documento: RF-6).
2. `categoria` ∈ {`suministro_cantera`} → `no` (RF-3); ∈ {`reporte_almacen`} → `no` (RF-4);
   `ignorar` → `no` (RF-5). Sin categoría todavía → `no` por ahora (se reintenta, RF-10).
3. `fechaHecho` nula → `no` por ahora (RF-10).
4. `fecha` < `desde` → `no` (RF-31).
5. Bitácora cerrada: si la foto se recibió después del cierre → `apartar_cerrada` (RF-21); si
   antes → `no` (RF-20, RF-31: no se agrega a una cerrada).
6. Si no → `agregar`.

`fotosParaAgregar(candidatas, yaEstan, principalSha)` quita las que ya tienen fila (agregadas
**o quitadas**: RF-27), las del mismo `sha256` que otra de la lista o que la principal (RF-8,
RF-12), y deja una por archivo, la más temprana.

`sincronizarFotosDelDia(obraId, fecha)`:

1. Bitácora vigente del día; sin bitácora → nada (se agregan cuando se arme).
2. Candidatas: `media` de WhatsApp con `claveR2` de los mensajes de la obra con ese
   `fecha_hecho` (por `obraDelMensaje`), con su categoría, autor, hora y `sha256`.
3. Las de `agregar` que deja `fotosParaAgregar` → `insert … on conflict do nothing` en
   `bitacora_fotos`. Un solo `insert` por día: no toca el JSON de la bitácora, así que no compite
   con `guardarEnBitacora` ni produce el choque «Alguien guardó la bitácora…» (RF-9).
4. Las de `apartar_cerrada` → `apartar(mensajeId, [{ seccion: 'fotos', renglon: <orden de la
   foto en el mensaje>, motivo: 'La bitácora de ese día ya estaba cerrada', datos: { mediaId } }])`,
   salvo que el mensaje ya tenga apartado el mensaje entero por bitácora cerrada (`actualizarDia`):
   así no salen dos avisos del mismo mensaje.

Quitar (`POST`): un solo `update bitacora_fotos set quitada_* … where id = :foto and parte_id =
:parte and quitada_en is null and exists (parte abierta)`. Cero filas → 409 «Ya estaba quitada»
o «La bitácora está cerrada», según lo que se lea después (RF-28, caso de dos personas).

## Decisiones técnicas

- **Tabla propia `bitacora_fotos` que apunta a la foto de WhatsApp** → se descartó copiar una
  fila de `media` con `dueno_tipo = 'bitacora'` por foto (como la principal), porque `media` no
  tiene dónde guardar quién la quitó y por qué, se mezclaría con la principal y con las de
  actividad (las tres con `item_key`), y para mostrar quién/hora/tipo habría que deshacer el
  camino hasta el mensaje por `sha256`. Se descartó también calcular la sección al leer, sin
  tabla: una bitácora cerrada cambiaría si se reprocesa un mensaje y le cambia el día, y es
  evidencia firmada (RF-20).
- **Agregar por día y no por mensaje** (`sincronizarFotosDelDia`) → se descartó hacerlo dentro de
  `llevarABitacora`, porque las fotos de mensajes que no van a la bitácora (seguimiento,
  administrativo sin notas) no pasarían por ahí, y porque ahí es justo donde chocan los
  guardados simultáneos del 8-oct. La función es idempotente: se puede llamar desde varios
  sitios sin miedo.
- **La sección se pide aparte** (`GET …/fotos-del-dia`) → se descartó meterla en la respuesta de
  la bitácora (`ParteFila`), por la misma razón que ya dejó escrita `SeccionFotoDelDia`: tocar el
  contrato de la bitácora por un dato que la pantalla pide por su lado.
- **Miniaturas con la misma imagen y tamaño fijo en CSS** → se descartó generar miniaturas en el
  servidor: sería una dependencia nueva (principio 8) y procesamiento en el servidor. El
  requisito de tiempo (40 fotos) se cuida con carga diferida (`loading="lazy"`) y la caché de
  24 h que ya pone `media/:id`.
- **Los días pasados con un script de una vez** → se descartó una migración SQL de datos, porque
  la regla (categorías, cerrada, repetidas) vive en TypeScript y no debe duplicarse en SQL
  (principio 3).

## Impacto en la sincronización

Sin impacto en la sincronización: la bitácora, las fotos de WhatsApp y la tabla nueva son solo
del servidor; los teléfonos no las reciben.

## Contrato de API

- `GET /api/panel/partes/:id/fotos-del-dia` — `requerirPermiso('bitacoras', 'listar')`, alcance
  por la obra del parte (`alcanzaLaObra`), igual que `GET …/foto`. 200 con
  `{ id, mediaId, autorNombre, enviadoEn, tipo, descripcion, quitada: null | { por, en, motivo } }[]`
  ordenadas por `enviadoEn` (RF-18). Las quitadas no se devuelven en la lista principal (se
  devuelven aparte, para el registro de RF-25). 404 si no existe o no alcanza.
- `POST /api/panel/partes/:id/fotos-del-dia/:fotoId/quitar` — `requerirPermiso('bitacoras',
  'escribir')` (residente y gerencia, RF-23), `parteEditable` (alcance y bitácora abierta,
  RF-28). Cuerpo `{ motivo }`; motivo vacío → 422 «Escriba por qué la quita» (RF-24). 200 con la
  fila; 409 si ya estaba quitada o la bitácora se cerró entre medias.
- Sin transacciones interactivas: cada escritura es un solo `insert` o `update` condicional.

## Estrategia de verificación

- **`scripts/verificar-reglas.ts`** (regla pura `fotoEntraALaBitacora` / `fotosParaAgregar`):
  - foto de reporte diario en bitácora abierta → `agregar` (RF-1);
  - vale de cantera, vale de almacén, mensaje «Ignorar» → `no` (RF-3 a RF-5);
  - video → `no` (RF-6);
  - mismo `sha256` dos veces → una sola (RF-8); igual a la principal → ninguna (RF-12);
  - sin categoría o sin día → `no` (RF-10);
  - bitácora cerrada, recibida después del cierre → `apartar_cerrada` (RF-21); antes → `no` (RF-20);
  - ya quitada → no se vuelve a agregar (RF-27);
  - día anterior al 7-oct → `no` (RF-31).
- **Demo manual en desarrollo** (obra «Pruebas spec 018 (laboratorio)», grupo
  `prueba-t19@g.us`): reporte diario con foto + tres fotos sueltas a la vez (una repetida) + un
  video + un vale de cantera → la bitácora muestra la principal y dos más en «Fotos del día», con
  quién, hora, tipo y descripción, ordenadas; ni el video ni el vale; ninguna en «No se pudo
  guardar». Quitar una sin motivo (no deja), con motivo (sale) y reprocesar el mensaje: no
  vuelve. Cerrar la bitácora y mandar otra foto: aparece en «No se pudo guardar» con «La bitácora
  de ese día ya estaba cerrada», solo con Descartar. Ver la sección en el celular (sin
  desplazamiento horizontal).
- **Producción, después de publicar**: correr `scripts/fotos-del-dia-pasados.ts` y comprobar que
  el 8-oct tiene sus fotos de evidencia y que las 6 apartadas con «Alguien guardó la bitácora…»
  salieron de «No se pudo guardar».

## Riesgos

- **Una foto de otra obra entra a una bitácora** si el mensaje tiene mal la obra → se detecta al
  verla en la sección; se quita con motivo (RF-22). El alcance de `media/:id` impide que un
  residente la vea si el mensaje no es de su obra.
- **Bitácoras con muchas fotos tardan en abrir** → carga diferida de miniaturas; se mide en la
  demo con 40 fotos.
- **El script de días pasados agrega fotos de más** (p. ej. de mensajes mal clasificados) → se
  corre primero en modo lectura (cuenta por día) y se revisa con el usuario; volver atrás es
  marcar como quitadas las filas con un `agregada_en` dado (no se borra nada).
- **Volver atrás**: `docker tag preoperaocc:anterior preoperaocc:ultima`; la tabla nueva queda
  sin uso y no molesta.

---

# Replan — cambio del 2026-10-14: una sola sección (RF-34 a RF-41)

## Idea

`bitacora_fotos` pasa a ser **la** lista de fotos del día de una bitácora: las de WhatsApp (como
hasta ahora) y también las subidas en el panel. Así todas se muestran, se ordenan, se cuentan y se
quitan igual. La foto principal (`media` con `dueno_tipo = 'bitacora'` e `item_key` nulo) deja de
crearse sola (RF-40); las que ya existen se pasan a la lista en las bitácoras abiertas y, en las
cerradas —que no se tocan—, se muestran como una foto más al leer.

## Módulos y archivos

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `src/shared/rules/fotos-del-dia.ts` | `unificarFotosDelDia(deLaLista, principalesViejas)`: junta, quita repetidas por huella, deja fuera las quitadas y ordena por hora; su largo es lo que cuenta el cierre | RF-35 a RF-37, RF-41 |
| `src/db/servidor/esquema.ts` + `drizzle/servidor/0026_*.sql` | `bitacora_fotos.mensaje_id` admite nulo (foto subida en el panel) | RF-34, RF-38 |
| `src/app/api/panel/partes/[id]/foto+api.ts` | Subir la foto del día (sin `item`) crea también su fila en `bitacora_fotos` | RF-34, RF-39 |
| `src/features/whatsapp/servidor/fotos-del-dia.ts` | `fotosDeLaBitacora` lee la lista y las principales viejas (con los datos de su foto de WhatsApp si la hay, o «Subida en el panel»), y usa la regla | RF-34 a RF-38 |
| `src/app/api/panel/partes/[id]/cerrar+api.ts` | La fotografía del día del cierre = las fotos de `fotosDeLaBitacora` | RF-41 |
| `src/features/whatsapp/servidor/dias.ts` | Ya no copia la primera foto del reporte diario como principal (`llevarABitacora`, `archivoRecibido`) | RF-40 |
| `src/features/panel/contratos.ts` | `FotoDelDiaFila.origen: 'whatsapp' \| 'panel'` | RF-38 |
| `src/features/panel/pantalla-partes.tsx`, `fotos-del-dia.tsx` | Una sola sección «Fotografía del día»: las tarjetas y el botón «Añadir fotografía»; el índice y los bloqueos cuentan la lista unificada | RF-34, RF-35, RF-38, RF-39, RF-41 |
| `scripts/fotos-del-dia-pasados.ts` | `--principales`: pasa las principales de las bitácoras abiertas desde el 7-oct a la lista (la foto de WhatsApp original si existe; si no, la subida) | RF-34, RF-36 |

## Modelo de datos

- `bitacora_fotos.mensaje_id` pasa a `null`-able (migración 0026, aditiva: la imagen anterior no la
  nota). Una fila sin mensaje es una foto subida en el panel; su hora es `media.subido_en`.
- Sin cambios en el celular.

## Decisiones técnicas

- **Una sola lista (`bitacora_fotos`) también para las subidas** → se descartó juntarlas solo al
  leer (lista + `media`), porque quitar una subida con motivo (RF-39) necesita dónde guardar quién,
  cuándo y por qué, y `media` no lo tiene.
- **Las principales viejas de bitácoras cerradas se muestran al leer, sin escribir** → se descartó
  migrarlas también, porque una bitácora cerrada es evidencia firmada y no se escribe (RF-20). Leer
  no la cambia.
- **El cierre sigue usando `bloqueosDelCierre` tal cual**; cambia el número que recibe → se descartó
  tocar la regla, que ya dice «falta la fotografía» cuando el número es cero.
- **La aprobación manual de la bandeja** (anterior a la spec 024) puede seguir eligiendo una «foto
  del día»: si se usa, esa foto aparece en la sección como una más (se lee como principal vieja).

## Verificación

- `verificar-reglas.ts`: `unificarFotosDelDia` (RF-35 a RF-37: orden por hora mezclando envío y
  subida, repetida por huella una vez, quitadas fuera, principal vieja como una más) y el conteo que
  usa el cierre (RF-41: con una foto de WhatsApp y sin principal, no falta la fotografía).
- Demo en desarrollo y en producción: la del criterio de finalización del cambio.

## Riesgos

- **Una foto del día de antes queda dos veces** (la copia principal y su original de WhatsApp): la
  regla quita repetidas por huella. Se mira en la demo con una bitácora real.
- **Volver atrás:** la imagen anterior ignora las filas sin mensaje y vuelve a mostrar la principal
  en su sitio; nada se borra.
