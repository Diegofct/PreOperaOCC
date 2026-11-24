# Tareas — Spec 052, el Drive de la obra

Tareas de menos de 30 minutos, ordenadas por dependencia. Cada una lleva los RF que
cubre y una línea `Hecho cuando:` que se pueda comprobar sin interpretar.

**Se implementa una tarea cada vez** (`/sdd:implementar T1`), y al terminarla se para.
Ninguna tarea se marca sin `npm run verificar`, `npm run typecheck` y `npm run lint`
en verde.

### Reglas puras (sin base ni pantallas)

- [x] T1. `src/shared/rules/drive.ts`: `claseDeArchivoDelDrive`, `TAMANO_MAXIMO_DE_LECTURA`,
      `INTENTOS_DE_LECTURA` y `estadoDelDocumento`, con sus casos primero. (RF-7, RF-15, RF-30, RF-40)
      Hecho cuando:
      - los casos «052/…» de los mimes (incluidas las exportaciones de Google, video y zip) y de los cinco
        estados («Leído», «Leyendo», «No se pudo leer», «Retirado del Drive», «demasiado grande») fallaron
        antes de la regla y ahora pasan;
      - los tres comandos están en verde.
- [x] T2. `cambiosDelInventario` e `inventarioAceptable`, con sus casos primero. (RF-1, RF-4, RF-6, RF-17,
      RF-19, RF-20, RF-21, RF-40)
      Hecho cuando hay casos en verde para:
      - un archivo nuevo, uno cambiado y uno igual;
      - un renombrado y un movido, que no piden versión;
      - uno que falta y uno que vuelve;
      - una fecha más vieja, que no pide nada;
      - uno de más de 50 MB, que no se pide;
      - un inventario incompleto y una caída de más de la mitad, que no retiran;
      y los tres comandos están en verde.
- [x] T3. `versionVigente` y `fragmentar`, con sus casos primero. (RF-12, RF-17, RF-25)
      Hecho cuando:
      - gana la fecha de Drive más reciente y no la que llegó de última;
      - ningún fragmento pasa del tope ni corta un renglón, y cada uno conserva su página;
      - los tres comandos están en verde.
- [x] T4. Permisos: el módulo `drive` en `MODULOS_DE_EMPRESA`, con sus filas por rol, solo en el menú de la
      obra, y `drive` en `MODULOS_CONSULTABLES` del asistente. (RF-9, RF-28, RF-33, RF-36, RF-37)
      Hecho cuando:
      - hay casos que dicen quién tiene qué en `drive`: gerencia con `activar`; director de proyectos, director
        de obra y residente con `ver`, `listar` y `escribir`; almacenista, laboratorista, auxiliar y encargado
        de OCC sin nada;
      - la prueba de la tabla de permisos completa sigue en verde;
      - los tres comandos están en verde.

### Base de datos y entrada de la integración

- [x] T5. Esquema: `drive_carpetas`, `drive_archivos`, `drive_versiones`, `drive_fragmentos` (con `tsvector` y
      su índice GIN), el enum `estado_lectura_drive` y `drive` en `dueno_media`; migración `0051`, aplicada en
      `neondb`. (RF-1, RF-4, RF-8, RF-18, RF-19, RF-40)
      Hecho cuando:
      - `drizzle/servidor/0051_…` existe y `db:migrar:servidor` termina sin error contra `neondb`;
      - una consulta muestra las cuatro tablas;
      - los tres comandos están en verde.
- [x] T6. La guardia con dos variables: `requerirIntegracion(peticion, variable)`, con
      `TOKEN_INTEGRACION_DRIVE` en `.env.ejemplo`. (RF-2, RF-3)
      Hecho cuando:
      - hay casos en verde para el token de WhatsApp que no abre el Drive, el del Drive que no abre WhatsApp, y
        sin la variable no entra nadie;
      - las rutas de WhatsApp siguen pasando sus casos;
      - los tres comandos están en verde.
- [x] T7. `POST /api/integraciones/drive/inventario` con `features/drive/servidor/inventario.ts`, y el contrato
      `inventarioDelDrive`. (RF-1, RF-4, RF-6, RF-8, RF-10, RF-19, RF-20, RF-21, RF-34, RF-40)
      Hecho cuando, con `curl` y un token de prueba contra el servidor de desarrollo reiniciado:
      - un inventario crea la carpeta sin obra y responde qué pedir;
      - al repetirlo, no pide nada;
      - sin un archivo, lo retira;
      - con `completo: false`, no retira;
      - con un archivo de 60 MB, no lo pide y queda «demasiado grande»;
      - y los tres comandos están en verde.
- [x] T8. `PUT /api/integraciones/drive/archivos`: los bytes → R2 + `media` + versión `pendiente`. (RF-1, RF-4,
      RF-5, RF-17, RF-18)
      Hecho cuando, con `curl`:
      - un PDF pedido queda en R2 con su versión `pendiente`;
      - al repetirlo, responde `ya_estaba`;
      - uno no pedido da 404, y uno de más de 50 MB da 413;
      - el export web sale sin `TOKEN_INTEGRACION_DRIVE` ni otros secretos en `dist/client`;
      - los tres comandos están en verde.

### Lectura

- [x] T9. Lectura local: Word, Excel y texto → fragmentos con `tsvector` y versión `leido`, sin IA; tipo no
      admitido → `no_se_pudo`. (RF-12, RF-15)
      Hecho cuando:
      - con un Word y un Excel de prueba subidos por `curl` y un pulso llamado a mano, las versiones quedan
        `leido` con fragmentos;
      - un `.zip` queda «tipo no admitido»;
      - los tres comandos están en verde.
- [x] T10. Lectura con IA: un PDF partido en piezas de 20 páginas con `pdf-lib`, las imágenes, y los tokens por
      versión. Con el freno `DRIVE_LECTURA_ACTIVA`. (RF-12, RF-14, RF-15)
      Hecho cuando:
      - un PDF con texto de 30 páginas y un PDF escaneado quedan `leido`, con fragmentos de cada página y sus
        tokens;
      - sin `DRIVE_LECTURA_ACTIVA`, el pulso no lee y lo dice;
      - los tres comandos están en verde.
- [x] T11. El resumen, los reintentos y el pulso completo: `POST /api/integraciones/drive/pulso`, el tope de
      unos 4 minutos, el reintento hasta 3 veces, y retomar una lectura cortada. (RF-13, RF-16)
      Hecho cuando:
      - cada versión leída tiene un resumen de 3 a 5 frases;
      - una falla pasajera simulada reintenta y a la tercera queda `no_se_pudo`;
      - una versión `leyendo` de hace más de 10 minutos se retoma;
      - los tres comandos están en verde.

### Búsqueda y asistente

- [x] T12. `buscarEnElDrive`: los fragmentos de la obra por `websearch_to_tsquery`, solo los vigentes, con las
      opciones de versiones viejas y retirados. (RF-25, RF-26, RF-27, RF-38)
      Hecho cuando:
      - con los documentos de T9 y T10, una pregunta con tildes o mayúsculas distintas encuentra el fragmento;
      - una versión vieja y un retirado salen solo con su opción;
      - una palabra que no está devuelve vacío;
      - los tres comandos están en verde.
- [x] T13. La consulta del asistente `drive_de_la_obra`, con sus fuentes y una línea en sus instrucciones.
      (RF-22, RF-23, RF-24, RF-26, RF-27, RF-28, RF-39)
      Hecho cuando, en el asistente del navegador con la sesión de Gerencia:
      - una pregunta sobre el Word de prueba responde con lo que dice, nombra el documento y su subcarpeta, y
        deja abrir la copia;
      - una pregunta sin respuesta en el Drive lo dice;
      - una carpeta sin obra no aparece;
      - los tres comandos están en verde.

### Panel

- [x] T14. API del panel: `GET documentos`, `GET` y `PATCH carpetas`, `POST releer`, y el dueño `drive` en
      `/api/panel/media/[id]`; `api.drive` en el cliente. (RF-8, RF-9, RF-10, RF-24, RF-29, RF-31, RF-32,
      RF-33, RF-35, RF-36, RF-37)
      Hecho cuando, con `curl` y cookies de gerencia y de un usuario de otra obra:
      - la gerencia asocia la carpeta a la obra de prueba y ve la lista;
      - el de otra obra recibe 404 en la lista y en la copia;
      - «releer» devuelve a `pendiente` una versión `no_se_pudo`;
      - los tres comandos están en verde.
- [x] T15. Pantalla «Drive» en el menú de la obra: encabezado con la carpeta y la última entrega, cifras,
      buscador, lista en tarjetas con resumen y estado, Abrir y Descargar (también las versiones viejas, y en
      el Drive lo que no tiene copia), y «Volver a leer». (RF-29, RF-30, RF-31, RF-32, RF-33, RF-34, RF-35,
      RF-41)
      Hecho cuando:
      - en Chrome, en la obra de prueba, a 1366 y a 390 px, se ve la lista con los documentos de T9 y T10, el
        buscador encuentra por el contenido, y se abre una copia;
      - un documento «demasiado grande» abre el Drive;
      - los tres comandos están en verde.
- [x] T16. «Conectar carpeta» para la gerencia en una obra sin carpeta, y la lista vacía para quien no tiene
      carpeta. (RF-8, RF-9, RF-10)
      Hecho cuando:
      - en Chrome, la gerencia conecta la carpeta de prueba desde la obra y la lista aparece;
      - un residente, en un recuadro con la sesión cambiada, no ve «Conectar carpeta»;
      - un almacenista no ve «Drive» en el menú;
      - los tres comandos están en verde.

### n8n y prueba de punta a punta

- [x] T17. El flujo de n8n (`docs/n8n/drive-de-la-obra.json`) y su guía (`docs/integracion-drive.md`):
      - cada 5 minutos, el listado recursivo de la carpeta con las exportaciones de Google;
      - el `POST` del inventario;
      - la descarga y el `PUT` de cada archivo pedido;
      - el `POST` del pulso.
      `TOKEN_INTEGRACION_DRIVE`, `DRIVE_LECTURA_ACTIVA` y el `client_max_body_size` van en `docs/despliegue.md`.
      (RF-1, RF-6, RF-7)
      Hecho cuando:
      - el JSON se importa en n8n sin errores (lo importa Diego o yo con su permiso);
      - la guía dice paso a paso cómo conectar la cuenta de Google y la carpeta;
      - los tres comandos están en verde.
- [x] T18. Demo de punta a punta en desarrollo, con la carpeta PRUEBA-052 de un Drive de prueba: los pasos de los
      criterios de finalización de la spec, la estimación de costo con los tokens, y la limpieza acotada de
      PRUEBA-052 en `neondb`. (RF-1 a RF-41, los de la demo)
      Hecho cuando:
      - pasan los siete pasos de la demo;
      - Diego tiene el estimado de costo por página;
      - no queda nada PRUEBA-052 en desarrollo;
      - los tres comandos están en verde.
- [x] T19. Validación final: recorrido RF por RF de la spec + demo manual. (Todos)
      Hecho cuando cada RF tiene su comprobación con resultado, los tres comandos están en verde, el export web
      sale sin secretos y la spec queda marcada como Cumplida.

## Notas de ejecución

- Conectar la carpeta real de Magdalena en producción **no** es una tarea de esta lista. Va con el despliegue,
  después de que Diego vea el estimado de costo (T18) y de que el consorcio autorice la entrada de n8n a su
  cuenta de Google.
- T4 (2026-11-23): `drive` ya está en el alcance del asistente (`deObraFuera`, con la tabla), pero fuera de
  la frase «De su obra: …» (`ModuloDeObraEnLaLista` lo excluye), porque la consulta todavía no existe. **En la
  T13** hay que quitarlo de esa exclusión y darle su texto en `MODULO_DE_OBRA_EN_CORTO`, y cambiar el caso
  «052/RF-22, RF-28 (T4)», que hoy comprueba que el saludo no lo nombra. `RUTA_DEL_MODULO.drive` apunta a
  `/…/drive`, la ruta que crea la T15.
- T5 (2026-11-23): migración `0051_cloudy_masked_marvel`, aplicada **solo en `neondb`**; en producción va con
  el despliegue (`scripts/migrar-produccion.ts`). Además de lo del plan: un índice único parcial
  `ux_drive_carpeta_obra` (una obra, una carpeta) y las tres tablas con `actualizado_en` en
  `TABLAS_CON_RELOJ`. `/api/panel/media/[id]` responde 404 a toda copia con dueño `drive` hasta la **T14**,
  que la abre con el permiso y la obra de la carpeta.
- T6 (2026-11-23): la variable es **obligatoria** en `requerirIntegracion`, sin valor por defecto, y un caso
  comprueba que cada ruta de `integraciones/<puerta>/` pide la de su puerta. `scripts/token-integracion.ts drive`
  emite el token del Drive. El `.env` de desarrollo **todavía no tiene** `TOKEN_INTEGRACION_DRIVE`: se emite y
  se pone para la demo (T18), y el del VPS con el despliegue.
- T7 (2026-11-23): probado con `curl` contra el servidor de desarrollo, con un token de prueba solo en el
  entorno del proceso (el `.env` no se tocó), y la carpeta `PRUEBA-052-T7` en `neondb`, ya borrada. «Al
  repetirlo, no pide nada» se comprobó **simulando la subida** de la T8 con filas `pendiente`: mientras no
  sube, un archivo pedido se vuelve a pedir en cada entrega, a propósito. La respuesta trae, además de lo del
  plan, `nuevos`, `vuelven` y `demasiadoGrandes`. El enlace del archivo es opcional (`null` si no viene).
- T8 (2026-11-23): probado con `curl` y la carpeta `PRUEBA-052-T8`, que subió dos PDF de verdad a R2 (bucket
  del `.env` de desarrollo, `preoperaocc`). Al terminar se borraron los dos objetos de R2 (204) y las filas
  de `neondb`: no queda ninguna copia con dueño `drive`. El dueño de la copia es la versión, y el 413 se
  decide primero por `content-length`, sin leer el cuerpo. El almacén ganó las extensiones `gif`, `txt` y
  `csv`. Sigue pendiente lo de la T14: `/api/panel/media/[id]` todavía responde 404 a las copias del Drive.
- T9 (2026-11-23): `POST /api/integraciones/drive/pulso` ya existe en una **primera versión**: lee Word, Excel y
  texto (`leerPendientesSinIa`, en `features/drive/servidor/leer.ts`) y **deja los PDF y las imágenes en
  `pendiente`** para la T10. Una falla inesperada (red, almacén) devuelve la versión a `pendiente` sin contar el
  intento: **la T11** tiene que contarlos (hasta 3), poner el tope de tiempo, retomar las `leyendo` cortadas y
  escribir el resumen. Un Excel da una página por hoja con contenido, con el número de la hoja en el libro. Un
  `.xls` o un Excel con contraseña queda «No se pudo leer» con un motivo que dice cómo arreglarlo. Probado con un
  Word, un Excel, un `.txt` y un `.zip` de verdad en `PRUEBA-052-T9`, ya borrada de `neondb` y de R2.
- T10 (2026-11-23): la IA transcribe con `llamarConEsquema` (Opus 5.5, esfuerzo `low`, fallback del servidor),
  una llamada por pieza de 20 páginas; las páginas vuelven al número del documento. Probado en `PRUEBA-052-T10`
  (ya borrada de `neondb` y R2): con el freno cerrado no gastó nada y lo dijo; abierto, un PDF de 30 páginas
  (2 piezas), un PDF escaneado y una foto quedaron `leido` en 29 s. **Costo medido: unos 1 690 tokens de
  entrada y 85 de salida por página de PDF, ≈ 0,0085 USD por página**; en total 54 148 / 2 660 ≈ 0,27 USD.
  Decisión provisional hasta la T11: una falla de la IA deja la versión «No se pudo leer» con el motivo, **sin
  reintento**, para no gastar de más. La T11 tiene que distinguir pasajera de definitiva.
- T11 (2026-11-23): el pulso (`pulsoDelDrive`, en `leer.ts`) tiene dos pasos: leer (lo pendiente y lo cortado)
  y resumir (lo `leido` sin resumen, desde sus fragmentos), los dos con el tope de 4 minutos. Por eso un documento
  leído con el freno puesto recibe su resumen cuando se abre. Un resumen que falla de forma definitiva queda `''`,
  para no pedirlo para siempre. `llamarConEsquema` ganó `pasajera` en su respuesta fallida, que no cambia a quien
  ya lo usaba. Una lectura cortada cuenta como un intento. Probado en `PRUEBA-052-T11` (ya borrada de `neondb` y
  R2): falla pasajera simulada borrando la copia de R2 → `pendiente` (1), `pendiente` (2), `no_se_pudo` (3);
  `leyendo` de hace 11 min → retomada y leída; de hace 2 min → intacta; 4 resúmenes de 3 a 4 frases, correctos.
  **Para el despliegue (T17 o `docs/despliegue.md`):** el proxy del VPS corta a los 120 s
  (`proxy_read_timeout`), y un pulso dura hasta unos 4 minutos y medio. El trabajo sigue en el servidor y n8n
  vería un 504: hay que subir ese tiempo en la ruta de integraciones, o que n8n no trate ese 504 como error.
  **En la T14**, «Volver a leer» pone `intentos` en 0.
- T12 (2026-11-23): **cambio frente al plan:** la consulta no usa `websearch_to_tsquery`, que exige todas las
  palabras, sino `to_tsquery` con **cualquiera** de ellas (`consultaDeBusqueda`), ordenada por `ts_rank`. Con
  la pregunta tal cual del asistente («¿cuántos días de prórroga aprobó…?»), exigir «cuántos» y «aprobó»
  dejaba sin respuesta un oficio que sí responde. Una palabra que no está sigue dando vacío (RF-27). La vigente
  es la de fecha más reciente **aunque no esté leída**: mientras se lee la nueva, no habla la vieja. Probado
  contra `neondb` con datos `PRUEBA-052-T12` (ya borrados): 10 casos, que cubren tildes y mayúsculas, versión
  vieja y retirado solo con su opción, vigente sin leer, palabra ausente, aislamiento entre obras y carpeta sin
  obra.
- T13 (2026-11-23): `drive_de_la_obra` va **no estricta**, porque la gerencia ya estaba en el tope de la gramática.
  El saludo nombra el Drive en **su propia frase**: dentro de la lista, la del Director de Obra pasaba de los 160
  caracteres (040/RF-25). **Se adelantó de la T14** el dueño `drive` en `/api/panel/media/[id]`, sin el cual
  «deja abrir la copia» no se cumplía: exige el permiso `drive`, que `alcanzaLaImagen` no mira para quien tiene
  una sola obra, y una carpeta sin obra solo la abre la gerencia. Una fuente que es una copia se abre en otra
  pestaña. Demo en el navegador con la sesión de Gerencia de Diego, en la obra PRUEBA-018 con la carpeta
  `PRUEBA-052-T13` (ya borrada de `neondb` y R2): respondió «45 días calendario para el tramo PR 12+300» con el
  documento, la subcarpeta y la página; la fuente descargó la copia con su nombre; el helicóptero dio «no hay
  nada», y el oficio de la carpeta sin obra no apareció. Quedó la conversación del asistente en `neondb`.
- T14 (2026-11-23): las rutas usan `requerirPermiso(…, 'drive', …)` y la obra sale de `obraDelContrato`. La lista
  y «releer» viven en `features/drive/servidor/lista.ts`, y la regla de la lista en
  `documentosParaLaLista`/`motivoParaNoReleer`. Además del plan: `GET documentos?carpeta=` lista una carpeta
  **sin obra**, solo para la gerencia (RF-10), y «releer» da 409 a lo que no tiene copia (más de 50 MB), que el
  pulso nunca podría leer. La búsqueda de la lista exige **todas** las palabras (filtra), y la del asistente
  cualquiera (responde). Probado con la sesión de Gerencia de Diego desde Chrome, y con `curl` y una cuenta de
  prueba `prueba052` (residente de PRUEBA-046), ya borrada con su sesión: la gerencia asocia, ve, busca por el
  texto, recibe 409 por una segunda carpeta y «releer» deja `pendiente` con 0 intentos; el de otra obra recibe
  404 en la lista, la copia y «releer», y 403 en las carpetas; sin sesión, 401. Datos `PRUEBA-052-T14` borrados
  de `neondb` y de R2.
- T15 (2026-11-23): «Drive» en el menú de la obra, sección «Personal y archivo», con el ícono de hoja (`archivo`).
  Pantalla en `features/drive/pantalla-drive.tsx`; reglas nuevas `comoSeAbre` y `entregaAtrasada` (aviso pasada
  media hora sin entrega, RF-34). El buscador busca en el servidor, después de 350 ms sin escribir; las cifras
  son de toda la carpeta. Probado en Chrome con la sesión de Diego, en PRUEBA-018 con `PRUEBA-052-T15` (8
  documentos de la T9 y la T10, más un Word con dos versiones y un video de 60 MB sin copia), ya borrada de
  `neondb` y R2. A 1366 px y a 390 px (en un `iframe` de 390 px, porque Chrome estaba maximizado; la página
  mide 390, sin desborde), «control27» encontró el PDF por su texto, «Abrir» abrió la copia en otra pestaña, y el
  video mostró solo «Abrir en el Drive» (Diego lo probó). Diego también probó versiones anteriores y descargar.
  Durante la carga, un resumen falló por tiempo agotado de la IA y el pulso siguiente lo escribió: el reintento
  de la T11 funcionando. **Ojo:** los nombres con tilde salieron con «�» porque el `curl` de Git Bash en Windows
  mandó el JSON en la codificación de Windows. No es de Kontrola, pero la demo de la T18 tiene que mandar
  UTF-8 (desde n8n, o desde un archivo).
- T16 (2026-11-23): «Conectar carpeta» sale en la lista vacía solo con `drive` → `activar` (la gerencia), y abre una
  ventana con las carpetas sin obra (`opcionesDeCarpetasSinObra`). Probado en Chrome: la gerencia, con la sesión de
  Diego en `localhost`, conectó `PRUEBA-052-T16` a PRUEBA-018 y la lista apareció al momento, con el aviso y las
  tildes bien (el JSON fue esta vez en UTF-8, desde un archivo). En `127.0.0.1`, que Chrome trata como otro sitio
  con sus propias cookies, entraron dos cuentas de prueba de PRUEBA-018: el residente vio la obra sin carpeta y
  sin el botón (con la carpeta desconectada en la base para la prueba); el almacenista no tiene «Drive» en el
  menú, y por la dirección directa vio «Sin acceso». Datos, cuentas y sesiones borrados. Se cambió el texto
  vacío del selector a «Escoja una carpeta».
- T17 (2026-11-23): **importada en el n8n del VPS** (`KontrolaDrive052`, apagada y sin credenciales), con permiso de Diego y un respaldo previo de todos los flujos en `/opt/occ-whatsapp/respaldos/todos_antes_052_2026-11-23.json`. Los flujos de WhatsApp siguieron activos. El importador de n8n 2.41 exige un `id` en el JSON.
  `docs/n8n/drive-de-la-obra.json` (n8n 2.41, como el del VPS): inventario cada 5 minutos con el listado de
  **todas** las carpetas que ve la cuenta y el árbol armado en un nodo de código (sin bucles), los archivos de
  cada carpeta con paginación, el `POST` del inventario, y bajada y subida **de a uno, 15 por vuelta**: lo que
  no alcanza se vuelve a pedir en la siguiente. El pulso va en su propio disparo, desfasado 2 minutos.
  **Cambio frente al plan:** se recomienda una **cuenta de servicio** de Google con la carpeta compartida
  como Lector, en vez del OAuth de una persona: el consorcio no da acceso a toda su cuenta. La guía deja el
  OAuth como salida si su Workspace no deja compartir fuera del dominio. Lo de Google sale exportado
  (documento → Word, hoja → Excel, presentación → PDF), con la extensión añadida al nombre; formularios y
  accesos directos no se mandan. Los tres nodos de código se probaron con datos simulados y el inventario
  pasó el contrato `inventarioDelDrive`. **El proxy del VPS es Caddy y no tiene tope de cuerpo ni de
  tiempo** (leído por ssh, solo lectura): lo de los 120 s y los 25 MB de la T11 no aplica. Fuera de la tarea
  pero necesario: `compose.yaml` no pasaba `TOKEN_INTEGRACION_DRIVE` ni `DRIVE_LECTURA_ACTIVA` al
  contenedor, y ahora sí; `DRIVE_LECTURA_ACTIVA` entró en `.env.ejemplo`. **En el VPS hay que copiar el
  `compose.yaml` nuevo** con el despliegue.
- T18 (2026-11-23): **los siete pasos pasaron**, con el flujo de n8n de verdad (n8n local en Docker, contra el servidor
  de desarrollo por `host.docker.internal:8081`) y una carpeta PRUEBA-052 en el Drive personal de Diego, compartida
  como Lector con la cuenta de servicio `kontrola-drive@kontrola-drive.iam.gserviceaccount.com` (proyecto de Google
  Cloud «Kontrola Drive», API de Drive activada). Archivos inventados: un oficio PDF, un acta escaneada (PDF de
  una sola imagen), un Word y una hoja de Google. (1) Primera vuelta: 4 nuevos, 4 subidos de a uno; el pulso leyó
  los 4 en 20 s, el escaneado incluido, y la hoja llegó como `.xlsx`; la gerencia conectó la carpeta a PRUEBA-018
  desde «Conectar carpeta». (2) El Word editado **dentro de Drive** (mismo id, fecha nueva): el inventario pidió
  solo ese, la vigente dice «5 de diciembre» y la anterior se entrega completa (200, 1 932 bytes). (3) El oficio
  a la papelera: «Retirado del Drive», con su copia. (4) Un residente de PRUEBA-018 preguntó la fecha de la
  fundida: «5-dic-2026», citando el Word. (5) Un residente de PRUEBA-046: nada del Drive; nombrando la otra obra,
  «no está a su alcance». (6) Un almacenista de PRUEBA-018: 403 en la lista y 404 en la copia. (7) Sin token o
  con uno falso: 401 en inventario y subida. El pulso se llamó con `curl` igual que el nodo «Leer lo pendiente»,
  porque `n8n execute` solo arranca desde el disparo manual. **Costo** (con `costoEstimado`): 0,0056 USD un Word,
  0,0049 una hoja, 0,0198 y 0,0214 un PDF de una página; ≈ 0,005 USD por documento (el resumen) más
  ≈ 0,0085 USD por página de PDF o imagen; la demo entera, 0,058 USD. **Limpieza:** las 5 copias borradas de R2
  (204, luego 404) y de `neondb` la carpeta, archivos, versiones, fragmentos y `media`, y las 3 cuentas de
  prueba con sus sesiones, credenciales, conversaciones, uso e intentos de acceso: no queda nada PRUEBA-052.
  **Se dejó a propósito** para la T19: la carpeta y la cuenta de servicio en Google, el flujo (apagado) y sus dos
  credenciales en el n8n local, la llave en Descargas de Diego, y el hash del token en el `.env` (con
  `DRIVE_LECTURA_ACTIVA` vuelto a `0`). Los 3 flujos de WhatsApp del n8n local se apagaron durante la demo y se
  reactivaron; el contenedor de n8n quedó detenido, como estaba. Trucos que costaron: Chrome no deja que una
  página de internet lea de `127.0.0.1`, y Drive ignora un «soltar» simulado; lo que sí sirvió fue el atajo
  Alt+C, U con el campo de archivo interceptado. Git Bash cambia `/tmp/…` dentro de `docker exec` (va con
  `MSYS_NO_PATHCONV=1`), y `n8n execute` necesita otro `N8N_RUNNERS_BROKER_PORT` con n8n encendido.
  **Fuera de la tarea:** con la pregunta que nombraba una obra ajena, en la respuesta del asistente se coló una
  frase en inglés («Need to verify obra is within reach.»). Es del asistente (spec 028), no del Drive.
- Ajuste a la T17 (2026-11-24), **en el despliegue**: con la carpeta real de Magdalena (7.182 archivos en 2.243
  carpetas, 21 GB) el flujo se quedó sin memoria en el VPS. El nodo «Archivos de cada carpeta» hacía una consulta
  a Google **por carpeta**, y n8n guarda cada respuesta en memoria; el proceso llegó a unos 600 MB contra el
  tope de 1 GB del contenedor, que comparte con el WhatsApp, y el sistema lo mató. El n8n principal y el
  WhatsApp no se cayeron. Se cambió por «Todos los archivos»: **un solo listado paginado** de todo lo que ve la
  cuenta de servicio (`executeOnce`), y «Armar inventario», sin cambios de lógica, se queda con lo que cuelga
  del árbol. Pasa de unas 2.245 consultas a 22, y de más de 1 minuto a 20 s; la simulación con los datos reales
  usó unos 70 MB. Kontrola recibe lo mismo: no cambia ningún RF. Probado en el n8n local con PRUEBA-052 (los
  tres archivos nuevos se pidieron y subieron; datos de `neondb` y R2 limpios) y después en el VPS: inventario
  de 7.182 archivos, 15 copias y 51 «demasiado grande»; el n8n principal quedó en unos 360 MB. Los archivos
  que n8n descarga van a disco (`binaryData` en modo `filesystem`, el de omisión de n8n 2.41), no a memoria.
