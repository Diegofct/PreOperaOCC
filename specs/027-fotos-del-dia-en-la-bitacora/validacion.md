# Validación — Spec 027, Todas las fotos del día en la bitácora

> Fecha: 2026-10-14 · Fase 7 del flujo SDD (tarea T12)

Recorrido RF por RF. Cada fila dice **con qué se comprobó**:
- un caso de `scripts/verificar-reglas.ts` (los de esta spec empiezan por «027:»);
- una prueba en vivo, con la tarea en que se hizo;
- o, cuando se cumple **por construcción**, la razón, dicha así.

Lo que no se ejecutó no se da por verificado.

## Lo que se ejecutó

| Comando | Resultado |
| --- | --- |
| `npm run verificar` | **475 verificaciones correctas** (7 pruebas «027:», líneas 8779 a 8842) |
| `npm run typecheck` | sin errores (código de salida 0) |
| `npm run lint` | sin hallazgos (código de salida 0) |

**Desarrollo (`neondb`, obra «Pruebas spec 018 (laboratorio)», datos `PRUEBA-027-*` borrados al
terminar cada tarea):**
- T3: sincronizar el 8-oct dos veces → 2 fotos la primera, 0 la segunda; 7-oct cerrado con una foto
  llegada después → 1 apartado `fotos`, que no se duplica.
- T4: tres mensajes con foto a la vez (uno con el mismo archivo) → 2 fotos y ningún apartado; foto
  de seguimiento → entra al llegar el archivo; aviso de llegada perdido → la recoge el pulso.
- T5/T6: consulta en orden con quién, tipo y descripción; quitar con motivo, otra vez (ya quitada),
  dos a la vez (una quita, la otra «ya estaba»), bitácora cerrada, motivo vacío, sin sesión (401),
  reproceso después de quitar (no vuelve).
- T7/T8/T9, en Chrome con sesión de gerencia: la sección, el visor, el ancho de 390 px, «Quitar»
  sin y con motivo, la bitácora cerrada sin botón, y la foto tardía en «No se pudo guardar» con su
  miniatura y solo Descartar.
- T10: el script en lectura (3 fotos, 1 apartado, sin escribir), en escritura y otra vez (0).

**Producción (`preoperaocc`, T11, 2026-10-14):** migración 0025, imagen `6349255d759a` (respaldo
`aa991561121b`), healthy, vecino y panel 200. El script en lectura contó 46 fotos y 11 apartados
por choque; revisado con el usuario, en escritura agregó 34 (7-oct 10, 8-oct 10, 9-oct 14) y
reintentó los 11 (quedaron guardados); el 13-oct (12) ya lo había llenado el pulso nuevo. Ningún
pendiente nuevo. En Chrome, la bitácora del 8-oct de CONSORCIO MAGDALENA muestra sus fotos con
quién, hora, tipo y descripción.

## RF por RF

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-1 | «027: una foto de la obra entra…» (8779); T3, T4 y producción (46 fotos) | verde |
| RF-2 | 8779 (otro día → no entra); `diaDeLaFoto`: día del hecho o el que reconoció la IA, nunca el de envío (T4) | verde |
| RF-3 | «027: vales, «Ignorar» y videos…» (8788), `suministro_cantera` | verde |
| RF-4 | 8788, `reporte_almacen` | verde |
| RF-5 | 8788, `ignorar` | verde |
| RF-6 | 8788 (video y PDF → no); además la consulta solo toma `image/*` | verde |
| RF-7 | Por construcción: el historial de WhatsApp no se tocó; la sección solo lee | verde |
| RF-8 | «027: la misma foto entra una sola vez…» (8825); índice único `(parte_id, sha256)`; T3 y T4 | verde |
| RF-9 | T4: tres a la vez, ninguna en «No se pudo guardar»; agregar no reescribe la bitácora | verde |
| RF-10 | «027: sin categoría o sin día…» (8796); T4: la recoge `archivoRecibido` o el pulso | verde |
| RF-11 | Por construcción: `primeraFoto` y la sección «Fotografía del día» no cambiaron; T7 | verde |
| RF-12 | 8825 (igual a la principal → no entra); `fotosDeLaBitacora` oculta la de la huella de la principal aunque llegue después (T10) | verde |
| RF-13 | T7, en Chrome: «Fotos del día» debajo de la foto principal, con su título | verde |
| RF-14 | T5 (`autorNombre`) y T7 (pie de cada foto) | verde |
| RF-15 | T5 y T7: «7:40 a. m.», «3:05 p. m.» en hora de Colombia | verde |
| RF-16 | T5 y T7: «Reporte diario», «Incidente», «Seguimiento» (`etiquetaDeCategoria`, la del historial) | verde |
| RF-17 | T5 y T7: la descripción de la IA bajo cada foto | verde |
| RF-18 | T5: guardadas 15:00, 7:40, 10:15 → salen 7:40, 10:15, 15:00 | verde |
| RF-19 | T7: tocar la foto la abre en grande | verde |
| RF-20 | «027: a una bitácora cerrada no entra…» (8801); T3 y T9 | verde |
| RF-21 | 8801 (`apartar_cerrada`); T3 y T9: apartado con «La bitácora de ese día ya estaba cerrada» | verde |
| RF-22 | T9: Descartar con motivo la saca de la lista; volver a pasar el día no la reabre | verde |
| RF-23 | T6 (permiso `bitacoras/escribir`) y T8 en Chrome | verde |
| RF-24 | T6 (400 «Escriba por qué la quita.»), T8 (no la quita y lo pide); check `ck_bitacora_foto_quitada` (T2) | verde |
| RF-25 | T6 y T8: «quitada por Diego el 14 de oct, 12:36 a. m.: «…»» | verde |
| RF-26 | Por construcción: quitar solo marca la fila de `bitacora_fotos`; la foto de WhatsApp sigue | verde |
| RF-27 | «027: lo que ya está… no se vuelve a agregar» (8842); T6: reproceso tras quitar | verde |
| RF-28 | T6 (409 «Esa bitácora ya está cerrada…»); T8: sin botón en la cerrada | verde |
| RF-29 | T10 en desarrollo; T11 en producción (46 fotos en las abiertas del 7, 8, 9 y 13-oct) | verde |
| RF-30 | T11: los 11 apartados por choque salieron de «No se pudo guardar» (reintentados y guardados; ver nota) | verde |
| RF-31 | «027: las bitácoras anteriores al 7-oct…» (8814); T10: el 6-oct y el 7-oct cerrado no se tocaron | verde |
| RF-32 | Por construcción: `bitacora_fotos.media_id` apunta a la foto de WhatsApp; nada se sube a R2 | verde |
| RF-33 | T5: residente de otra obra → la ruta responde 404; las imágenes pasan por `media/:id`, que mira el alcance del mensaje | verde |

## Requisitos no funcionales

- **Celular sin desplazamiento horizontal:** comprobado en T7 con un marco de 390 px
  (`scrollWidth` = 390).
- **40 fotos sin abrir más lento:** no se midió con 40 fotos. Lo cubre el diseño: la sección se
  pide aparte de la bitácora (no la retrasa), pinta 12 miniaturas y el resto a pedido, y las
  imágenes llevan la caché de 24 h de `media/:id`. La bitácora del 9-oct de producción (14 fotos)
  abre normal.
- **Español:** todos los textos nuevos.

## Alcance

- **Nada fuera de la spec.** Dos detalles de presentación del plan: «Ver las N demás» (más de 12
  fotos) y que el pulso vuelva a mirar las fotos de las últimas 48 h (red de seguridad de RF-1 y
  RF-10).
- **Fuera de alcance sigue fuera:** ni videos ni documentos en la bitácora, ni filtro de la IA, ni
  cambiar la principal desde la sección, ni foto por actividad desde la sección, ni edición, ni PDF,
  ni la marca «Registrado automáticamente por la IA» en la bitácora.

## Constitución

- **Principio 3 (una regla, un sitio):** qué foto entra vive en `src/shared/rules/fotos-del-dia.ts`;
  el día a día y el script de los días pasados la usan igual.
- **Principio 4 (nada se borra):** quitar es lógico, con quién, cuándo y por qué.
- **Principio 8 (sin dependencias nuevas):** ninguna; las miniaturas son la misma imagen.
- **Principio 1 (local-first):** sin cambios en el celular ni en la sincronización.

## Notas

- **RF-30, cómo se cumplió:** los apartados por choque se **reintentaron** (como el botón
  «Reintentar»), no se marcaron guardados a secas: el mensaje puede traer algo más que la foto.
  Los 11 quedaron guardados al reprocesarse.
- **Validación con 400 y no 422** para el motivo vacío: es la convención del proyecto (T6).
- **Visto al pasar, fuera de esta spec:** «No se pudo guardar» sale vacía si «Hasta» queda en el
  día de hoy. Queda para un cambio aparte.

## Veredicto

**La spec 027 está cumplida.** Los 33 RF en verde, los tres comandos en verde, publicada en
producción el 2026-10-14 con los días pasados agregados.

---

# Validación del cambio del 2026-10-14: una sola sección (RF-34 a RF-41)

> Fecha: 2026-10-14 · Tarea T19

## Lo que se ejecutó

| Comando | Resultado |
| --- | --- |
| `npm run verificar` | **478 verificaciones correctas** (3 nuevas del cambio: líneas 8870, 8889 y 8908) |
| `npm run typecheck` | sin errores (código de salida 0) |
| `npm run lint` | sin hallazgos (código de salida 0) |

**Desarrollo:** T15 (consulta unificada, quitar subida y principal vieja, conteo del cierre), T16
(reporte diario con foto y con archivo tardío: la foto va a la sección, ninguna principal nueva),
T17 en Chrome (una sola sección por hora, «Subida en el panel», quitar la subida, índice y aviso
de cierre), T18 (`--principales` en lectura, escritura y otra vez).

**Producción (T19):** migración 0026, imagen `552acd50f1d6` (respaldo `6349255d759a`), healthy, 200.
`--principales` en lectura (4) revisado con el usuario y en escritura: las 4 principales pasaron a
la lista como sus fotos de WhatsApp originales. En Chrome, la bitácora del 8-oct muestra una sola
sección «Fotografía del día» con 11 fotos por hora; el índice dice 11; no falta la fotografía.

## RF por RF

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-34 | T17 en Chrome (dev) y producción: una sola sección con las de WhatsApp y las subidas | verde |
| RF-35 | «027/RF-35 a RF-37…» (8870): la principal vieja sale como una más; Chrome sin marca de principal | verde |
| RF-36 | 8870 (copia por huella no se repite) y 8889 (misma fila de media); T15; `--principales` no duplica (T18) | verde |
| RF-37 | 8870: 7:40 · 8:00 · 10:00 · 15:00 mezclando envío y subida; T17 y producción | verde |
| RF-38 | T15 (origen `panel`) y T17: «Subida en el panel · 11:20 a. m.» | verde |
| RF-39 | 8889; T15 (quitar subida y principal vieja); T17 en Chrome con motivo | verde |
| RF-40 | T16: reporte diario con foto y con archivo tardío → ninguna principal nueva | verde |
| RF-41 | «027/RF-41…» (8908); la ruta de cierre cuenta `fotosDeLaBitacora`; Chrome: sin «Falta llenar: Fotografía del día» con solo fotos de WhatsApp | verde |

Reemplazados por el cambio, sin verificación propia: RF-11, RF-12, RF-13 y RF-18.

## Notas

- **La subida real con el botón** no se ejecutó en las pruebas: el almacén R2 de desarrollo es el
  de producción y no se suben imágenes de prueba. La ruta solo agrega la huella y la fila de la
  lista (revisión de tipos en verde); la primera subida real en el panel lo confirma.
- La aprobación manual de la bandeja (anterior a la 024) puede seguir creando una principal: se
  muestra como una más (RF-35, RF-36).

## Veredicto del cambio

**El cambio del 2026-10-14 está cumplido.** RF-34 a RF-41 en verde, publicado en producción.
