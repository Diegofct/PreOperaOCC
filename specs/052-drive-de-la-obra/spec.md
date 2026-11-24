# Spec 052 — El Drive de la obra, leído por Kontrola

> Estado: **Cumplida** el 2026-11-23 (validación en `validacion.md`, 41/41 RF) · Aprobada por Diego el 2026-11-20 (con 15 minutos y 50 MB; D9 confirmada) · Cambio del mismo día al aprobar el plan: lo de más de 50 MB no se copia (D12, RF-40, RF-41) · Fecha: 2026-11-20 · Primera obra: **Consorcio Magdalena** (en producción) · Entrevista del
> 20-nov: D1 a D9, abajo · La usa después la spec 053 (correo del consorcio con respuesta aprobada)

## Contexto y objetivo

El Consorcio Magdalena guarda en una carpeta de Google Drive la documentación de la obra: oficios, actas,
informes, planos, contratos. Hoy, para saber qué dice un documento, alguien tiene que saber que existe, buscarlo
y leerlo. Esta spec hace que Kontrola lea esa carpeta sola:
- trae cada archivo nuevo o cambiado;
- guarda una copia;
- lee su contenido completo y hace un resumen corto.

Con eso, la gerencia, el director de proyectos, el director de obra y el residente de Magdalena pueden
preguntarle al asistente por lo que hay en el Drive, y él les responde diciendo de qué documento sale la
respuesta. Lo mismo servirá a la spec 053 para redactar las respuestas a los correos del consorcio.

Una herramienta de automatización externa, la que ya trae los mensajes de WhatsApp, solo trae los archivos.
Kontrola decide qué hacer con ellos y guarda el registro. Se arma por obra: hoy se conecta Magdalena, y otra
obra podrá conectar su carpeta después sin una spec nueva.

## Usuarios / actores

- **Gerencia** (rol `admin`):
  - asocia una carpeta de Drive a una obra;
  - consulta el Drive de cualquier obra en el asistente y en el panel.
- **Director de Proyectos**: consulta el Drive de todas las obras, en el asistente y en el panel.
- **Director de obra y Residente**: consultan el Drive **solo de la obra a la que están asignados**, en el
  asistente y en el panel.
- **Los demás cargos** (almacenista, encargado de planta, laboratorista, auxiliar administrativa, encargado de
  OCC…): no ven el Drive de ninguna obra.
- **Operador**: no cambia; no entra al panel.
- **La integración** (la herramienta de automatización externa): entrega cada archivo nuevo, cambiado o borrado
  de la carpeta, con su credencial propia.

## Historias de usuario

- H1: Como gerencia quiero conectar la carpeta de Drive de una obra para que Kontrola lea lo que se sube ahí sin
  que nadie tenga que copiarlo.
- H2: Como residente de Magdalena quiero preguntarle al asistente qué dice el Drive de la obra («¿qué plazo dio
  la interventoría en el último oficio?») y que me diga de qué documento lo saca.
- H3: Como gerencia quiero ver en el panel la lista de lo que se leyó del Drive, con su resumen y su estado,
  para saber qué hay y qué falló.
- H4: Como director de obra quiero que, si se reemplaza un documento en el Drive, Kontrola use la versión nueva
  sin perder la anterior.

## Requisitos funcionales (criterios de aceptación en EARS)

### Recibir los archivos (H1)

- RF-1: EL SISTEMA recibe de la integración cada archivo nuevo de la carpeta de Drive conectada y de sus subcarpetas, con su nombre, su subcarpeta, su fecha de modificación en el Drive y su identificador en el Drive.
- RF-2: EL SISTEMA acepta entregas del Drive únicamente con una credencial propia de esa integración, distinta de la de WhatsApp, de la sesión del panel y de la del celular.
- RF-3: SI una entrega llega sin esa credencial o con una inválida, ENTONCES EL SISTEMA la rechaza sin guardar nada.
- RF-4: SI llega dos veces la misma versión de un archivo, ENTONCES EL SISTEMA conserva una sola.
- RF-5: EL SISTEMA guarda una copia de cada archivo recibido de hasta 50 MB en el almacén privado, que no se expone con enlace público.
- RF-40: SI un archivo del Drive pasa de 50 MB, ENTONCES EL SISTEMA no lo copia ni lo lee, y lo muestra en la lista con «No se pudo leer: demasiado grande» (D12).
- RF-41: CUANDO alguien abre un documento que no tiene copia en Kontrola, EL SISTEMA lo abre en el Drive (D12).
- RF-6: CUANDO se conecta una carpeta por primera vez, EL SISTEMA recibe también los archivos que ya estaban en ella (D2).
- RF-7: EL SISTEMA lee los documentos y las hojas de cálculo propios de Google igual que un Word o un Excel.

### La carpeta de cada obra (H1)

- RF-8: EL SISTEMA permite asociar cada carpeta de Drive recibida a una obra (D9).
- RF-9: EL SISTEMA permite asociar o cambiar la obra de una carpeta únicamente a la gerencia.
- RF-10: MIENTRAS una carpeta no tiene obra, EL SISTEMA muestra sus archivos solo a la gerencia.
- RF-39: MIENTRAS una carpeta no tiene obra, EL SISTEMA no le da sus archivos al asistente.
- RF-11: EL SISTEMA no mezcla nunca los archivos de la carpeta de una obra con los de otra.

### Leer el contenido (H2, H3)

- RF-12: CUANDO llega un archivo, EL SISTEMA lee su contenido completo (D1).
- RF-13: CUANDO lee un archivo, EL SISTEMA guarda un resumen corto de lo que dice.
- RF-14: EL SISTEMA lee también los PDF escaneados y las imágenes con texto.
- RF-15: SI un archivo no se puede leer (tipo no admitido, dañado, protegido con contraseña o sin texto), ENTONCES EL SISTEMA lo marca «No se pudo leer» con el motivo.
- RF-16: SI la lectura falla por una causa pasajera, ENTONCES EL SISTEMA la vuelve a intentar sola, hasta 3 veces, antes de marcarlo «No se pudo leer».

### Versiones y archivos borrados (H4)

- RF-17: CUANDO llega una versión nueva de un archivo ya recibido, EL SISTEMA la lee, y desde entonces manda la versión nueva (D3).
- RF-18: CUANDO llega una versión nueva de un archivo, EL SISTEMA conserva la anterior como versión vieja, con su copia y su fecha.
- RF-19: CUANDO la integración avisa que un archivo se borró del Drive, EL SISTEMA lo marca «Retirado del Drive», con la fecha, sin borrar su copia ni lo leído (principio 4).
- RF-20: SI un archivo retirado vuelve a aparecer en el Drive, ENTONCES EL SISTEMA lo vuelve a marcar vigente.
- RF-21: CUANDO un archivo cambia de nombre o de subcarpeta en el Drive, EL SISTEMA actualiza el nombre o la subcarpeta, y lo trata como el mismo archivo.

### El asistente (H2)

- RF-22: CUANDO alguien que ve el Drive de una obra le pregunta al asistente algo que está en esos documentos, EL SISTEMA responde con lo que dicen.
- RF-23: CUANDO el asistente responde con información del Drive, EL SISTEMA dice el nombre del documento y su subcarpeta.
- RF-24: CUANDO el asistente responde con información del Drive, EL SISTEMA deja abrir la copia del documento citado.
- RF-25: EL SISTEMA hace que el asistente use solo la versión vigente de cada archivo, salvo que se le pregunte por versiones anteriores.
- RF-26: EL SISTEMA hace que el asistente no use los archivos retirados del Drive, salvo que se le pregunte por ellos, y entonces dice que están retirados.
- RF-27: SI el Drive de la obra no tiene lo que se pregunta, ENTONCES EL SISTEMA hace que el asistente lo diga, sin inventar.
- RF-28: EL SISTEMA no le da al asistente información del Drive de una obra que la persona no ve (D4).

### La lista en el panel (H3)

- RF-29: EL SISTEMA muestra en cada obra con carpeta conectada una lista de los documentos de su Drive, a quien ve el Drive de esa obra (D5).
- RF-30: EL SISTEMA muestra de cada documento:
  - su nombre;
  - su subcarpeta;
  - su fecha de modificación en el Drive;
  - su resumen;
  - su estado: «Leído», «Leyendo», «No se pudo leer» con el motivo, o «Retirado del Drive».
- RF-31: EL SISTEMA permite buscar en la lista por el nombre, la subcarpeta y el contenido, sin distinguir mayúsculas ni tildes.
- RF-32: EL SISTEMA permite abrir o descargar la copia de cada documento, y la de sus versiones viejas.
- RF-33: EL SISTEMA permite a quien ve la lista pedir que se vuelva a leer un documento marcado «No se pudo leer».
- RF-34: EL SISTEMA muestra la fecha de la última entrega recibida de la carpeta, para notar si la integración dejó de mandar.
- RF-35: EL SISTEMA ordena la lista del documento modificado más recientemente al más antiguo.

### Quién ve qué (transversal)

- RF-36: EL SISTEMA muestra el Drive de una obra solo a la gerencia, al director de proyectos, y al director de obra y al residente asignados a esa obra (D4).
- RF-37: SI alguien que no ve el Drive de una obra pide su lista o la copia de uno de sus documentos, ENTONCES EL SISTEMA lo rechaza.
- RF-38: EL SISTEMA deja el contenido leído del Drive de una obra disponible para redactar los borradores de respuesta a los correos de esa misma obra (spec 053).

## Superficies afectadas

- [ ] **Móvil** — sin cambios.
- [x] **Panel web** — la lista del Drive en cada obra con carpeta conectada; asociar carpetas a obras (gerencia);
  el asistente cita documentos del Drive y deja abrirlos.
- [x] **API** — una entrada nueva para la integración del Drive, con su credencial; las consultas del panel para
  la lista, la copia y volver a leer; una consulta nueva del asistente.
- [ ] **Sincronización** — sin cambios; el celular no ve nada de esto.
- [x] **Datos** — en el servidor: carpetas, documentos, sus versiones, su contenido leído y su estado. Nada en
  el teléfono.
- [x] **Reglas** — quién ve el Drive de una obra (cargo y obra asignada); qué versión es la vigente; cuándo un
  archivo cuenta como el mismo. Llevan casos en `verificar-reglas.ts`.

## Requisitos no funcionales

- Un archivo nuevo o cambiado en el Drive aparece leído en Kontrola en menos de 15 minutos (D10).
- Se copian y se leen archivos de hasta 50 MB. Uno más grande no se copia: queda en la lista como «No se pudo
  leer: demasiado grande» y se abre en el Drive (D11, D12).
- La interfaz está en español y usa los mismos tokens y patrones del panel (spec 050).
- La lectura con IA tiene costo por documento. La primera carga de lo que ya hay en la carpeta (RF-6) lo
  multiplica:
  [NECESITA ACLARACIÓN: ¿cuántos archivos tiene hoy la carpeta de Magdalena, más o menos?].

## Casos límite

- **Sin señal**: no aplica. Esto pasa entre el Drive, la integración y el servidor; el celular no interviene.
- **Evidencia firmada**: no toca preoperacionales, bitácoras ni nada firmado. Los archivos del Drive no son
  evidencia firmada de Kontrola: se guardan tal como llegan y nunca se editan. Una versión nueva no reemplaza a
  la vieja: se suma (RF-18).
- **Primer arranque**:
  - una carpeta recién conectada trae lo que ya tenía (RF-6);
  - mientras no tenga obra, solo la ve la gerencia (RF-10);
  - una obra sin carpeta conectada no muestra la lista.
- **Carpeta grande al conectar**: los archivos se leen de a poco. La lista los muestra «Leyendo» hasta que
  terminan.
- **El mismo archivo llega dos veces**: se guarda uno (RF-4).
- **Archivo movido a otra subcarpeta o renombrado**: sigue siendo el mismo (RF-21).
- **Archivo movido fuera de la carpeta conectada**: cuenta como retirado del Drive (RF-19).
- **Archivo protegido o dañado**: «No se pudo leer» con el motivo (RF-15); la copia se guarda igual.
- **Archivo de más de 50 MB** (un video, un plano muy pesado): no se copia; queda en la lista y se abre en el
  Drive (RF-40, RF-41).
- **Un residente cambia de obra**: deja de ver el Drive de la anterior desde ese momento (RF-36).
- **La integración deja de mandar**: la lista muestra la fecha de la última entrega (RF-34).
- **Dos versiones del mismo archivo llegan casi a la vez**: manda la de fecha de modificación más reciente en el
  Drive, no la que llegó de última.
- **La carpeta se asocia por error a otra obra**: la gerencia la cambia (RF-9). Sus documentos pasan con ella,
  y la obra anterior deja de verlos.

## Fuera de alcance

- Escribir, mover, renombrar o borrar nada en el Drive: Kontrola solo lee.
- Copiar los documentos del Drive a Documentos de la obra (specs 034 y 051).
- Sacar campos fijos por tipo de documento (fecha, número, valores) para listarlos o llenar módulos (D1).
- Carpetas reservadas por cargo dentro del Drive de una obra (D4).
- Leer otro Drive que no sea la carpeta conectada, o el Drive entero de la cuenta (D2).
- Conectar otra obra además de Magdalena en esta iteración. Queda posible sin spec nueva (D6), pero no se hace
  aquí.
- Avisos o notificaciones cuando llega un documento nuevo.
- Otros proveedores de almacenamiento (OneDrive, Dropbox).
- El correo y sus borradores: son la spec 053. Aquí solo se deja disponible el contenido (RF-38).
- Videos, audios y archivos comprimidos: se guardan, pero se marcan «No se pudo leer: tipo no admitido».

## Criterios de finalización

- Cada RF tiene cómo comprobarse:
  - las reglas puras (quién ve, versión vigente, mismo archivo) con casos en `scripts/verificar-reglas.ts`;
  - lo demás con un paso de la demo.
- `npm run verificar`, `npm run typecheck` y `npm run lint` en verde.
- El export web sale sin la credencial nueva en el código del navegador.
- Demo manual, en desarrollo, con una carpeta de Drive de prueba asociada a una obra de prueba:
  1. Se suben un PDF, un PDF escaneado, un Word y una hoja de Google. Aparecen en la lista, leídos y con su
     resumen.
  2. Se reemplaza el Word: manda la versión nueva y la vieja se puede abrir.
  3. Se borra el PDF del Drive: queda «Retirado del Drive».
  4. Un residente de esa obra le pregunta al asistente algo que está en el Word. Responde con lo que dice y
     nombra el documento.
  5. Un residente de otra obra hace la misma pregunta y no obtiene nada del Drive.
  6. Un almacenista no ve la lista.
  7. Una entrega sin credencial se rechaza.
- Después de la demo, se conecta la carpeta real de Magdalena en producción. Para eso, el consorcio debe haber
  autorizado el acceso de la integración a su cuenta de Google.

## Dudas resueltas (entrevista del 2026-11-20)

- D1: se lee el contenido completo de cada documento, con un resumen corto; no hay campos fijos por tipo.
- D2: se lee una carpeta raíz con sus subcarpetas. Al conectarla se leen también los archivos que ya tiene.
- D3: un archivo cambiado se vuelve a leer y manda la versión nueva; la vieja se guarda. Lo borrado del Drive se
  marca retirado, no se borra.
- D4: el Drive de una obra lo ven la gerencia, el director de proyectos, y el director de obra y el residente
  asignados a esa obra. Nadie más.
- D5: en el panel hay una lista de lo leído, con resumen, estado, búsqueda, copia y «volver a leer».
- D6: se arma por obra; hoy solo se conecta Magdalena.
- D7: usos decididos por Diego:
  - el asistente responde con el Drive;
  - los borradores de correo de la 053 se apoyan en él;
  - no se copian los documentos a Documentos de la obra.
- D8: la integración solo trae y lleva; Kontrola decide y guarda el registro, como con WhatsApp.
- D9 (confirmada al aprobar): la gerencia asocia cada carpeta a su obra desde el panel, como se
  asocian hoy los grupos de WhatsApp.

- D10: un archivo nuevo o cambiado aparece leído en menos de 15 minutos.
- D11: se leen archivos de hasta 50 MB.
- D12 (al aprobar el plan, 2026-11-20): un archivo de más de 50 MB no se copia, porque el servidor no recibe
  archivos de ese tamaño; aparece en la lista con su nombre, su subcarpeta y «demasiado grande», y se abre en el
  Drive. Reemplaza «los más grandes se guardan sin leer» de D11.

## Dudas abiertas

- [NECESITA ACLARACIÓN: cuántos archivos tiene hoy la carpeta de Magdalena, para estimar el costo de la primera
  lectura.]
- [NECESITA ACLARACIÓN: quién del consorcio autoriza a la integración a entrar a su cuenta de Google, y cuál es
  la carpeta raíz.]
