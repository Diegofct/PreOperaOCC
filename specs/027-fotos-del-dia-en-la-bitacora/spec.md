# Spec 027 — Todas las fotos del día en la bitácora

> Estado: **Cumplida**, con el cambio del 2026-10-14 (RF-34 a RF-41, una sola sección) cumplido el mismo día. Cumplida el 2026-10-14 (ver `validacion.md`); aprobada el 2026-10-13 · Fecha: 2026-10-13 · Cambia la spec 024 (024/RF-50 a 024/RF-53: a la bitácora
> solo iba la foto del día) y la 026 (026/RF-48: la foto que llega tarde)

## Contexto y objetivo

Durante el día, el grupo de WhatsApp de la obra recibe muchas fotos: el avance del filtro, la
motoniveladora en la capa, la jornada de orden y aseo, un incidente en la vía. Hoy a la bitácora
solo va **una**, la foto del día. Las demás quedan solo en el historial de WhatsApp, y el 8-oct
seis fotos de evidencia de Catalina Chaparro quedaron además en «No se pudo guardar» porque
llegaron juntas y chocaron al guardarse. Gerencia quiere que la bitácora reúna **todas las fotos
de la obra de ese día**, para que sea la evidencia completa de la jornada sin tener que buscar en
el chat.

## Usuarios / actores

- **Quien reporta en el grupo**: manda sus fotos como hoy. No cambia nada para él.
- **El sistema**: pone cada foto en la bitácora del día al que corresponde.
- **Residente / director de obra** (panel): ve las fotos del día en la bitácora y quita las que
  no son de la obra.
- **Gerencia** (panel): lo mismo, en todas las obras.
- **Operador** (app móvil): no cambia nada para él.

## Historias de usuario

- H1: Como gerencia quiero ver en la bitácora todas las fotos que se mandaron de la obra ese día,
  para tener la evidencia completa de la jornada en un solo lugar.
- H2: Como residente quiero saber quién mandó cada foto, a qué hora y en qué tipo de mensaje,
  para entender qué muestra sin abrir el chat.
- H3: Como residente quiero quitar de la bitácora una foto que no es de la obra, dejando el
  motivo, para que la evidencia no tenga fotos ajenas.

## Requisitos funcionales (criterios de aceptación en EARS)

### Qué fotos entran (H1)

- RF-1: CUANDO llega por el grupo de una obra una foto de un día cuya bitácora está abierta,
  EL SISTEMA la agrega a las «Fotos del día» de esa bitácora.
- RF-2: EL SISTEMA asigna cada foto al día del hecho que reconoce en su mensaje, y no al día en
  que se mandó, como ya hace con el resto del mensaje.
- RF-3: SI la foto es un vale de cantera, ENTONCES EL SISTEMA no la agrega a las «Fotos del día».
- RF-4: SI la foto es un vale o una remisión de almacén, ENTONCES EL SISTEMA no la agrega a las
  «Fotos del día».
- RF-5: SI la IA marcó el mensaje como «Ignorar», ENTONCES EL SISTEMA no agrega su foto a las
  «Fotos del día».
- RF-6: SI el mensaje es un video, ENTONCES EL SISTEMA no lo agrega a la bitácora.
- RF-7: EL SISTEMA sigue mostrando en el historial de WhatsApp, como hoy, los videos, los vales y
  las fotos de los mensajes marcados como «Ignorar».
- RF-8: SI la misma foto (el mismo archivo) llega más de una vez el mismo día, ENTONCES EL
  SISTEMA la muestra una sola vez en las «Fotos del día».
- RF-9: SI varias fotos del mismo día llegan a la vez, ENTONCES EL SISTEMA las agrega todas sin
  apartar ninguna en «No se pudo guardar».
- RF-10: SI una foto llega antes que el resto de su mensaje, ENTONCES EL SISTEMA la agrega cuando
  se conozca el día del hecho.

### La foto del día (H1)

- RF-11: ~~EL SISTEMA mantiene la foto del día como la foto principal de la bitácora, elegida como
  hoy.~~ *Reemplazado por RF-35 y RF-40 (cambio del 2026-10-14).*
- RF-12: ~~EL SISTEMA no repite la foto del día dentro de las «Fotos del día».~~ *Reemplazado por
  RF-36 (cambio del 2026-10-14).*

### Cómo se ven (H2)

- RF-13: ~~EL SISTEMA muestra las «Fotos del día» en la bitácora, en una sección aparte de la foto
  principal.~~ *Reemplazado por RF-34 (cambio del 2026-10-14).*
- RF-14: EL SISTEMA muestra junto a cada foto el nombre de quien la mandó.
- RF-15: EL SISTEMA muestra junto a cada foto la hora en que se mandó, en hora de Colombia.
- RF-16: EL SISTEMA muestra junto a cada foto el tipo de mensaje en que llegó (reporte diario,
  incidente, inicio de actividades…), con el mismo nombre que usa el historial de WhatsApp.
- RF-17: EL SISTEMA muestra junto a cada foto la descripción corta que la IA hizo de su mensaje.
- RF-18: ~~EL SISTEMA ordena las «Fotos del día» por la hora en que se mandaron, de la más
  temprana a la más tarde.~~ *Reemplazado por RF-37 (cambio del 2026-10-14).*
- RF-19: CUANDO se toca una foto de la sección, EL SISTEMA la muestra en tamaño completo.

### Bitácora cerrada (evidencia firmada)

- RF-20: SI la foto es de un día cuya bitácora ya está cerrada, ENTONCES EL SISTEMA no la agrega
  a esa bitácora.
- RF-21: SI la foto es de un día cuya bitácora ya está cerrada, ENTONCES EL SISTEMA la muestra en
  «No se pudo guardar» con el motivo «La bitácora de ese día ya estaba cerrada».
- RF-22: CUANDO se descarta en «No se pudo guardar» una foto de una bitácora cerrada, EL SISTEMA
  la deja solo en el historial de WhatsApp.

### Quitar una foto ajena (H3)

- RF-23: MIENTRAS la bitácora está abierta, EL SISTEMA permite al residente o a gerencia quitar
  una foto de las «Fotos del día».
- RF-24: SI se intenta quitar una foto sin escribir un motivo, ENTONCES EL SISTEMA no la quita y
  pide el motivo.
- RF-25: CUANDO se quita una foto, EL SISTEMA guarda quién la quitó, cuándo y por qué.
- RF-26: CUANDO se quita una foto, EL SISTEMA la sigue mostrando en el historial de WhatsApp.
- RF-27: SI una foto quitada vuelve a procesarse (un reintento o un reproceso del mensaje),
  ENTONCES EL SISTEMA no la vuelve a agregar.
- RF-28: MIENTRAS la bitácora está cerrada, EL SISTEMA no permite quitar fotos de ella.

### Los días ya pasados

- RF-29: CUANDO se publique esta spec, EL SISTEMA agrega a cada bitácora abierta del 7-oct-2026 en
  adelante las fotos de su día que cumplan RF-1 a RF-12.
- RF-30: CUANDO se publique esta spec, EL SISTEMA da por guardadas en «No se pudo guardar» las
  fotos que quedaron apartadas con «Alguien guardó la bitácora…» y que RF-29 agregó.
- RF-31: EL SISTEMA no agrega fotos a las bitácoras anteriores al 7-oct-2026 ni a las cerradas.

### Reglas transversales

- RF-32: EL SISTEMA no guarda una segunda copia del archivo de la foto: la bitácora usa el mismo
  archivo que el historial de WhatsApp.
- RF-33: EL SISTEMA aplica a las «Fotos del día» la misma restricción de obra que a la bitácora:
  un residente solo ve las fotos de sus obras.

### Una sola sección de fotos (cambio del 2026-10-14)

El usuario vio la spec publicada y pidió que las fotos de WhatsApp y la de «Fotografía del día»
queden juntas, en una sola sección. La «foto principal» no la elige nadie: el sistema copiaba la
primera foto del reporte diario cuando la bitácora no tenía ninguna. Como no es una decisión de
una persona, deja de existir: todas las fotos del día son iguales.

- RF-34: EL SISTEMA muestra todas las fotos del día de la bitácora —las que llegaron por WhatsApp y
  las subidas en el panel— en una sola sección, «Fotografía del día».
- RF-35: EL SISTEMA no distingue una foto principal entre las fotos de la sección.
- RF-36: SI la misma foto (el mismo archivo) está en la bitácora por más de un camino, ENTONCES EL
  SISTEMA la muestra una sola vez en la sección.
- RF-37: EL SISTEMA ordena las fotos de la sección por su hora —la de envío si llegó por WhatsApp,
  la de subida si se subió en el panel—, de la más temprana a la más tarde.
- RF-38: EL SISTEMA muestra junto a una foto subida en el panel «Subida en el panel» y la hora en
  que se subió, en hora de Colombia.
- RF-39: EL SISTEMA permite quitar con motivo también una foto subida en el panel, con las mismas
  reglas de RF-23 a RF-28.
- RF-40: EL SISTEMA deja de copiar la primera foto del reporte diario como foto del día: esa foto
  entra a la sección como cualquier otra (RF-1). *Cambia 024/RF-53 y 026/RF-48.*
- RF-41: CUANDO se va a cerrar una bitácora, EL SISTEMA da por cumplida la fotografía del día si su
  sección tiene al menos una foto sin quitar. *Cambia la regla de cierre de la spec 004.*

## Superficies afectadas

- [ ] **Móvil** — Sin cambios.
- [x] **Panel web** — Bitácora: una sola sección «Fotografía del día» (cambio del 2026-10-14) con
  quién, hora y tipo —o «Subida en el panel»—, vista en tamaño completo y la acción de quitar con
  motivo; el índice cuenta todas las fotos de la sección. «No se pudo guardar»: el motivo nuevo de bitácora
  cerrada.
- [x] **API** — Lo que el panel pide de la bitácora y la acción de quitar una foto.
- [ ] **Sincronización** — Sin cambios: la bitácora y las fotos de WhatsApp viven solo en el
  servidor.
- [x] **Datos** — Las fotos de la bitácora pasan a ser varias por día, con la marca de quitada
  (quién, cuándo, motivo).
- [x] **Reglas** — Qué foto entra a la bitácora y cuál no (vale de cantera, video, repetida,
  bitácora cerrada, quitada): caso nuevo en `verificar-reglas.ts`. Cambio del 2026-10-14: la
  fotografía del día del cierre cuenta cualquier foto sin quitar (RF-41).

## Requisitos no funcionales

- La sección muestra las fotos en miniatura: una bitácora con 40 fotos abre en el panel en el
  mismo tiempo que hoy (±1 s) con la conexión de la oficina.
- En el celular (panel en el navegador, 026), la sección se ve completa sin desplazamiento
  horizontal.
- Textos en español, como el resto del panel.

## Casos límite

- **Sin señal**: no aplica al operador; quien reporta manda las fotos por WhatsApp, que las
  entrega cuando tiene señal. Una foto que llega horas después entra a su día (RF-2), si la
  bitácora sigue abierta.
- **Evidencia firmada**: una bitácora cerrada no se toca (RF-20, RF-28); la foto que llega tarde
  queda en «No se pudo guardar» (RF-21).
- **Primer arranque**: las bitácoras anteriores al 7-oct-2026 conservan solo su foto del día y
  su sección «Fotos del día» queda vacía (RF-31); las abiertas desde el 7-oct reciben sus fotos al
  publicar (RF-29).
- Una foto sin día reconocible queda en «No se pudo guardar» con el motivo de la fecha, como hoy.
- Una foto de un grupo que no está asociado a ninguna obra no entra a ninguna bitácora.
- Las seis fotos del 8-oct que hoy están en «No se pudo guardar» con «Alguien guardó la bitácora…»
  entran a su bitácora al publicar (RF-29) y salen de esa lista (RF-30).
- Bitácoras ya cerradas con foto principal (antes de este cambio): no se tocan; la foto principal
  se muestra en la sección como una más (RF-34, RF-35). Es solo cómo se ve: la evidencia no cambia.
- Si se quitan todas las fotos de una bitácora abierta, vuelve a faltar la fotografía del día para
  cerrarla (RF-41).
- Dos personas quitan la misma foto a la vez: la quita la primera; la segunda ve que ya estaba
  quitada.
- Si se reabre la bitácora de un día (si el proceso lo permite), las fotos quitadas siguen
  quitadas.

## Fuera de alcance

- Videos en la bitácora (RF-6).
- Documentos (Excel, Word, PDF) en la bitácora: siguen yendo a su módulo como hoy.
- Que la IA decida sola qué fotos son de la obra: se quitan a mano (RF-23).
- ~~Elegir otra foto como foto del día desde la sección.~~ Desde el cambio del 2026-10-14 no hay
  foto principal (RF-35).
- Asociar una foto a una actividad desde la sección (la foto por actividad sigue como hoy).
- Editar, recortar o rotar fotos.
- Un informe o PDF de la bitácora con las fotos.
- La marca «Registrado automáticamente por la IA» en la bitácora (descartada por el usuario el
  2026-10-13: esa marca va en los módulos, donde ya está).

## Criterios de finalización

- Cada RF tiene cómo comprobarse: caso en `scripts/verificar-reglas.ts` (las reglas de qué foto
  entra, RF-3 a RF-6, RF-8, RF-12, RF-20, RF-27, RF-31) o paso de demo manual.
- `npm run verificar`, `npm run typecheck` y `npm run lint` en verde.
- Demo manual en desarrollo: mandar a un grupo de prueba un reporte diario con foto, tres fotos
  sueltas a la vez (una repetida), un video y un vale de cantera; la bitácora muestra la foto
  principal y dos fotos más en «Fotos del día», con quién, hora y tipo; ni el video ni el vale.
  Quitar una con motivo y reprocesar el mensaje: no vuelve. Cerrar la bitácora y mandar otra
  foto: aparece en «No se pudo guardar» con el motivo de bitácora cerrada.

- Cambio del 2026-10-14, demo: en una bitácora con fotos de WhatsApp y una subida en el panel, la
  sección «Fotografía del día» las muestra todas juntas por hora, sin principal, la subida con
  «Subida en el panel» y su hora; quitar la subida con motivo funciona; con solo fotos de WhatsApp la
  bitácora se deja cerrar.

## Dudas abiertas

Ninguna. Resueltas con el usuario el 2026-10-13: los vales de almacén se excluyen (RF-4), las
fotos de mensajes «Ignorar» no entran (RF-5), se agregan las de las bitácoras abiertas desde el
7-oct (RF-29 a RF-31) y se muestra la descripción de la IA (RF-17).
