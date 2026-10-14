# Tareas — Spec 027

Tareas de menos de 30 minutos, ordenadas por dependencia. Cada una lleva los RF que
cubre y una línea `Hecho cuando:` que se pueda comprobar sin interpretar.

**Se implementa una tarea cada vez** (`/sdd:implementar T1`), y al terminarla se para.
Ninguna tarea se marca sin `npm run verificar`, `npm run typecheck` y `npm run lint`
en verde, mirando el código de salida.

### Regla y datos

- [x] T1. Regla pura `fotoEntraALaBitacora` y `fotosParaAgregar` en
      `src/shared/rules/fotos-del-dia.ts`, con sus casos en `scripts/verificar-reglas.ts`.
      (RF-1, RF-3 a RF-6, RF-8, RF-10, RF-12, RF-20, RF-21, RF-27, RF-31)
      Hecho cuando: el verificador cubre foto de reporte diario → `agregar`; vale de cantera, vale
      de almacén, «Ignorar» y video → `no`; sin categoría o sin día → `no`; mismo `sha256` dos
      veces → una; igual a la principal → ninguna; ya quitada → no vuelve; cerrada y recibida
      después del cierre → `apartar_cerrada`, antes → `no`; día anterior al 7-oct → `no`; y los
      tres comandos en verde.
- [x] T2. Tabla `bitacora_fotos` en `src/db/servidor/esquema.ts` y migración 0025, aplicada en
      neondb (dev). (RF-1, RF-8, RF-24, RF-25)
      Hecho cuando: `drizzle/servidor/0025_*.sql` crea la tabla con el único `(parte_id,
      media_id)`, el único parcial por `sha256` y el check del motivo; en neondb un `insert` de
      prueba con quitada sin motivo falla; y los tres comandos en verde.

### Servidor

- [x] T3. `sincronizarFotosDelDia(obraId, fecha)` en
      `src/features/whatsapp/servidor/fotos-del-dia.ts`: candidatas del día, regla de T1,
      `insert … on conflict do nothing`, y apartar con sección `fotos` las de bitácora cerrada
      (sin duplicar el aviso del mensaje entero). (RF-1, RF-2, RF-9, RF-21)
      Hecho cuando: en dev, llamada dos veces sobre un día de prueba con tres fotos (una repetida),
      deja dos filas en `bitacora_fotos` la primera vez y ninguna nueva la segunda; con la bitácora
      cerrada y una foto recibida después, deja una excepción `fotos` pendiente con «La bitácora de
      ese día ya estaba cerrada»; los tres comandos en verde.
- [x] T4. Llamar a `sincronizarFotosDelDia` desde `armarBitacora`, `actualizarDia`,
      `archivoRecibido` y el pulso. (RF-1, RF-9, RF-10)
      Hecho cuando: en dev, mandar al grupo `prueba-t19@g.us` un reporte diario con foto y tres
      fotos sueltas a la vez deja en `bitacora_fotos` las fotos sueltas sin la principal, y
      ninguna en «No se pudo guardar»; una foto cuyo archivo llega después entra al llegar; los
      tres comandos en verde.
- [x] T5. `GET /api/panel/partes/:id/fotos-del-dia` con quién, hora, tipo y descripción, en orden,
      y las quitadas aparte. (RF-13 a RF-18, RF-25, RF-33)
      Hecho cuando: con curl y la sesión de dev, la bitácora de prueba devuelve las fotos en orden
      de hora con `autorNombre`, `enviadoEn`, `tipo` («Reporte diario»…) y `descripcion`; con un
      residente de otra obra, 404; los tres comandos en verde.
- [x] T6. `POST /api/panel/partes/:id/fotos-del-dia/:fotoId/quitar` con motivo obligatorio, solo con
      la bitácora abierta, y 409 si ya estaba quitada. (RF-22 a RF-24, RF-26, RF-28)
      Hecho cuando: con curl, sin motivo → 422; con motivo → 200 y la foto sale de la lista y
      aparece en las quitadas con quién, cuándo y motivo; repetir → 409; sobre una bitácora
      cerrada → 409; y reprocesar el mensaje no la vuelve a agregar; los tres comandos en verde.

### Panel

- [x] T7. `api.partes.fotosDelDia` y `api.partes.quitarFoto` en el cliente; sección «Fotos del día»
      en la bitácora con miniaturas (carga diferida), quién, hora, tipo y descripción, y visor a
      tamaño completo. (RF-13 a RF-18)
      Hecho cuando: en Chrome (dev), la bitácora de prueba muestra la foto principal en
      «Fotografía del día» y debajo «Fotos del día» con las demás en orden y sus cuatro datos;
      tocar una la abre en grande; en el ancho de un celular no hay desplazamiento horizontal; los
      tres comandos en verde.
- [x] T8. «Quitar» con motivo en la sección, solo si la bitácora es editable, y la lista de
      quitadas con quién, cuándo y por qué. (RF-22 a RF-25, RF-28)
      Hecho cuando: en Chrome (dev), «Quitar» sin motivo no deja; con motivo la foto sale de la
      sección y aparece en «Quitadas»; con la bitácora cerrada el botón no aparece; los tres
      comandos en verde.
- [x] T9. «No se pudo guardar»: sección `fotos` («Foto») con su miniatura y solo Descartar.
      (RF-21, RF-22)
      Hecho cuando: en Chrome (dev), la foto que llegó a la bitácora cerrada de prueba aparece con
      su miniatura, sin Completar ni Reintentar, y Descartar con motivo la saca de la lista; los
      tres comandos en verde.

### Días pasados y publicación

- [x] T10. `scripts/fotos-del-dia-pasados.ts`: modo lectura (cuenta por día) y modo escritura
      (agrega desde el 7-oct y da por guardadas las apartadas con «Alguien guardó la bitácora…»
      cuyas fotos quedaron agregadas). (RF-29 a RF-31)
      Hecho cuando: en dev, el modo lectura lista la cuenta por día sin escribir; el modo escritura
      deja las filas y una segunda corrida no agrega nada; no toca bitácoras cerradas ni anteriores
      al 7-oct; los tres comandos en verde.
- [x] T11. Publicar en producción: migración 0025, imagen nueva con respaldo
      `preoperaocc:anterior`, script de T10 primero en lectura (cuenta revisada con el usuario) y
      después en escritura; nota en `DESPLIEGUE_VPS.md`. (RF-29, RF-30)
      Hecho cuando: el panel responde 200 y está sano; la bitácora del 8-oct muestra sus fotos de
      evidencia en «Fotos del día»; las 6 apartadas del 8-oct con «Alguien guardó la bitácora…»
      ya no están en «No se pudo guardar».
- [x] T12. Validación final: recorrido RF por RF de la spec + demo manual (`validacion.md`).
      (Todos)
      Hecho cuando: cada RF tiene su comprobación con resultado, los tres comandos están en verde y
      la spec queda marcada como Cumplida.

### Cambio del 2026-10-14: una sola sección (RF-34 a RF-41)

- [x] T13. Regla `unificarFotosDelDia` en `src/shared/rules/fotos-del-dia.ts`, con sus casos en
      `scripts/verificar-reglas.ts`. (RF-35 a RF-37, RF-41)
      Hecho cuando: el verificador cubre orden por hora mezclando envío y subida, repetida por
      huella una vez, quitadas fuera, principal vieja como una más, y que con una foto de WhatsApp
      sin principal el cierre no pide fotografía; los tres comandos en verde.
- [x] T14. Migración 0026: `bitacora_fotos.mensaje_id` admite nulo; aplicada en neondb. (RF-34, RF-38)
      Hecho cuando: en neondb se inserta una fila sin mensaje y los tres comandos en verde.
- [x] T15. Servidor: subir la foto del día crea su fila; `fotosDeLaBitacora` unificada (con
      principales viejas y «Subida en el panel»); el cierre cuenta la lista unificada.
      (RF-34, RF-36 a RF-39, RF-41)
      Hecho cuando: en dev, una bitácora con fotos de WhatsApp, una principal vieja repetida y una
      subida devuelve todas una vez y en orden, la subida con origen `panel`; quitar la subida
      funciona; la ruta de cierre no pide fotografía con solo fotos de WhatsApp; tres comandos en verde.
- [x] T16. Dejar de copiar la primera foto del reporte diario como principal (`llevarABitacora`,
      `archivoRecibido`). (RF-40)
      Hecho cuando: en dev, un reporte diario con foto deja su foto en `bitacora_fotos` y ninguna
      fila nueva de principal en `media`; tres comandos en verde.
- [x] T17. Panel: una sola sección «Fotografía del día» (tarjetas + «Añadir fotografía»), «Subida en
      el panel» con hora, quitar también las subidas; índice y bloqueos con el conteo unificado.
      (RF-34, RF-35, RF-38, RF-39, RF-41)
      Hecho cuando: en Chrome (dev) se ve una sola sección con todas las fotos por hora, sin
      principal; la subida dice «Subida en el panel» y se quita con motivo; con solo fotos de
      WhatsApp no sale «Falta llenar: Fotografía del día»; tres comandos en verde.
- [x] T18. `scripts/fotos-del-dia-pasados.ts --principales`: pasar las principales de las bitácoras
      abiertas desde el 7-oct a la lista, en lectura y en escritura. (RF-34, RF-36)
      Hecho cuando: en dev, la lectura cuenta sin escribir; la escritura deja una fila por principal
      (la original de WhatsApp si existe) y otra corrida no agrega nada; tres comandos en verde.
- [x] T19. Publicar (migración 0026, imagen, script en lectura revisado y en escritura) y validar el
      cambio RF por RF en `validacion.md`. (Todos los del cambio)
      Hecho cuando: en producción la bitácora del 8-oct muestra una sola sección con todas sus
      fotos; los tres comandos en verde; la spec queda Cumplida con el cambio.

## Notas de ejecución

- **T4 (2026-10-13) — el día de una foto de un mensaje que no va a la bitácora.** Un
  seguimiento queda `ignorado` y nunca recibe `fecha_hecho`, así que sus fotos no entraban. Se
  usa el día del hecho y, si falta, el `fecha_evento` que reconoció la IA (`diaDeLaFoto`); nunca
  el día de envío. Es lo que dice RF-2 («el día del hecho que reconoce en su mensaje»), no un
  cambio de comportamiento. Si la IA tampoco dio día, la foto no entra (RF-10).
- **T4 — prueba sin el VPS.** El almacén R2 es el mismo en desarrollo y en producción: la prueba
  entregó los mensajes con `recibirMensaje` + `procesarMensaje` (lo que hace la ruta tras la
  guardia) y simuló cada archivo con su fila de `media` y `archivoRecibido`, sin subir bytes.
- **T5 — cómo se comprobó.** Crear una sesión por script está vetado en este entorno, así que no
  hubo curl con sesión: se probó `fotosDeLaBitacora` sobre datos de prueba (orden por hora, quién,
  tipo, descripción, quitadas aparte), la ruta sin sesión (401) y `alcanzaLaObra` con un residente
  de otra obra (false → la ruta responde 404). La ruta con sesión real se recorre en T7, en Chrome.
- **T6 — 400 y no 422 para el motivo vacío.** El plan decía 422; el proyecto responde 400 a todo
  cuerpo que no cumple su esquema (`responder` → `errorDeValidacion`), con el mensaje bajo el
  campo. Se siguió la convención: «Escriba por qué la quita.» con 400. Mismo comportamiento para
  quien usa el panel (RF-24).
- **T10 — los apartados por choque se reintentan, no se dan por guardados a secas.** RF-30 dice
  «da por guardadas»; marcarlos guardados sin más perdería lo demás que traiga el mensaje (una
  nota). El script hace lo de «Reintentar»: el apartado queda `guardada` y el mensaje se vuelve a
  procesar en el acto. Para quien mira «No se pudo guardar» el efecto es el de RF-30: sale de la
  lista. Solo se reintentan los mensajes cuyas fotos ya quedaron en la bitácora.
- **T10 — la principal que llega después.** En la prueba, el mensaje reintentado puso como foto
  principal una que ya estaba en «Fotos del día», y se habría visto dos veces. `fotosDeLaBitacora`
  ahora deja fuera de la sección toda foto con la huella de la principal, llegue antes o después
  (RF-12). Probado: con P como principal la sección muestra solo Q.
- **T10 — opciones de `sincronizarFotosDelDia`.** `simular` (cuenta sin escribir, para el modo
  lectura) y `sinApartar` (los días pasados no avisan de fotos viejas de bitácoras cerradas, RF-31).
