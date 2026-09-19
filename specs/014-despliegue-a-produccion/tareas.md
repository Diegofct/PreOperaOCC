# Tareas — Spec 014

Tareas de menos de 30 minutos, ordenadas por dependencia. Cada una lleva los RF que
cubre y una línea `Hecho cuando:` que se pueda comprobar sin interpretar.

**Se implementa una tarea cada vez** (`/sdd:implementar T1`), y al terminarla se para.
Ninguna tarea se marca sin `npm run verificar`, `npm run typecheck` y `npm run lint`
en verde.

Esta spec tiene una particularidad: **la mitad de las tareas no se ejecutan en este
repositorio**, sino contra Neon, el VPS o un teléfono. Cada una dice **quién la hace**.
Las de máquina ajena no las puedo ejecutar yo: preparo el comando exacto y su reversa,
y las corre Diego.

Los cuatro bloques son casi independientes y ese orden no es casual:

- **A (T1–T4)** son archivos del repositorio. No tocan ninguna máquina y se pueden hacer
  hoy mismo.
- **B (T5)** prepara la base. Tampoco toca el VPS.
- **C (T6–T12)** es el servidor, y es donde está todo el riesgo.
- **D (T13–T14)** es la app, y está **bloqueada hasta que haya dominio**.

## A — El empaquetado (en este repositorio)

- [x] T1. `servidor/entrada.cjs` y `expo-server` como dependencia directa.
      (RF-1, RF-4, RF-5) — *yo*
      Arranca un servidor HTTP de Node y le entrega cada petición al adaptador de Expo.
      `expo-server@57.0.3` ya está en el árbol por debajo de `expo-router`; pasa a
      `package.json` porque este archivo lo importa directo.
      Hecho cuando: los tres comandos en verde; y con `npx expo export --platform web`
      hecho, `node servidor/entrada.cjs` sirve el panel en `http://localhost:3000` y
      `curl` a una ruta de API responde. Después se borra `dist`.

- [x] T2. `Dockerfile` de dos etapas y `.dockerignore`. (RF-13) — *yo*
      La primera etapa instala y empaqueta; la segunda solo ejecuta. `.dockerignore`
      excluye `.env` antes que nada, y también `dist`, `node_modules` y `.git`.
      Hecho cuando: `docker build -t preoperaocc .` termina sin error, y **buscar `.env`
      y los valores de los secretos dentro de la imagen no devuelve nada**.

- [x] T3. `compose.yaml`. (RF-4, RF-14, RF-15) — *yo*
      Declara el contenedor con sus seis variables de entorno, el puerto publicado
      **solo en `127.0.0.1`** y la política de reinicio que lo levanta solo.
      Hecho cuando: con las variables apuntando a la base de **desarrollo**,
      `docker compose up -d` levanta y `curl http://127.0.0.1:<puerto>` devuelve el
      panel; `curl` a la IP de la máquina **no** responde; y `docker compose down` lo
      deja limpio.

- [x] T4. `eas.json` con el perfil de producción. (RF-22, RF-23, RF-27) — *yo*
      `distribution: "internal"` y `buildType: "apk"`, sin `developmentClient`. La
      dirección del servidor queda escrita como pendiente, bien marcada: se rellena en
      T13, cuando haya dominio.
      Hecho cuando: el archivo existe con el perfil, los tres comandos en verde, y
      **no compila nada todavía**.

## B — La base de producción (no toca el VPS)

- [ ] T5. Base nueva en Neon, migrada, sembrada y con la cuenta de gerencia.
      (RF-17, RF-18, RF-19, RF-20, RF-21) — *Diego crea la base; los comandos los
      corremos con su cadena*
      `db:migrar:servidor`, `db:sembrar:servidor` y `crear-admin`. **`SECRETO_TOKENS`
      nuevo**, generado aparte, que no es el de desarrollo.
      Hecho cuando: una consulta contra esa base devuelve **0 obras, 0 vehículos, 0
      asignaciones, 0 preoperacionales**, los tipos de equipo y las plantillas
      sembrados, y **exactamente un usuario**, el administrador. La base de desarrollo
      sigue intacta y con sus datos.

## C — El servidor (el bloque con riesgo)

- [ ] T6. Relevamiento del VPS, sin cambiar nada. (RF-7) — *Diego ejecuta, yo leo*
      Qué proxy hay y desde dónde se configura, qué archivo sirve al proyecto vecino,
      qué dominios resuelven ahí, qué puertos están ocupados y cuál queda libre, cuánta
      memoria hay, y si el certificado del vecino lo administra la misma herramienta.
      Hecho cuando: esas seis respuestas están escritas en las notas de ejecución.
      **Ningún comando de esta tarea modifica nada.**

- [ ] T7. El procedimiento escrito, con la reversa de cada paso. (RF-10) — *yo*
      `docs/despliegue.md` se reescribe con los comandos exactos para **este** VPS, tal
      como lo describió T6, y cada paso con su «si esto sale mal, se deshace así».
      Hecho cuando: el documento tiene los comandos literales —nada de «configure el
      proxy»— y cada paso del bloque C tiene su reversa escrita. **Va antes de ejecutar
      nada**: RF-10 pide poder deshacer, y eso no se escribe después.

- [ ] T8. El dominio apuntando al VPS. (RF-1) — *Diego*
      Registro DNS del dominio o subdominio elegido hacia la IP del VPS.
      Hecho cuando: el dominio resuelve a la IP del VPS desde una máquina cualquiera.
      *Bloqueada por la decisión del dominio.*

- [ ] T9. La imagen en el VPS y el contenedor arriba, **sin tocar el proxy**.
      (RF-4, RF-5, RF-14) — *Diego ejecuta*
      Construir la imagen en la máquina de desarrollo, transferirla con `docker save`
      sobre `ssh`, escribir las seis variables en el VPS y levantar el contenedor.
      Hecho cuando: desde el VPS, `curl http://127.0.0.1:<puerto>` devuelve el panel;
      **el dominio del vecino sigue respondiendo**; y no se ha tocado ni un archivo del
      proxy. Esta tarea **no tiene riesgo para el vecino**: nada de lo que hace le llega.

- [ ] T10. El bloque del proxy para el dominio nuevo. (RF-7, RF-8, RF-9) — *Diego ejecuta*
      Archivo **aparte**; el del vecino no se abre. Validar la configuración **sin
      aplicarla**; si falla, borrar el archivo y parar. Si pasa, **recargar, nunca
      reiniciar**.
      Hecho cuando: la validación pasó antes de aplicar; después de recargar **se
      comprueba primero el dominio del vecino y responde**; y el dominio nuevo sirve el
      panel por HTTP. Si el vecino no responde, se borra el archivo, se recarga y la
      tarea queda **sin marcar**.

- [ ] T11. Certificado y redirección. (RF-2, RF-3) — *Diego ejecuta*
      Certificado **solo para el dominio nuevo**. Tocar el del vecino es tocar al vecino.
      Hecho cuando: `https://<dominio>` abre el panel; `http://<dominio>` redirige a
      `https`; **el dominio del vecino sigue respondiendo y su certificado no cambió**;
      y la renovación automática está **comprobada**, no supuesta.

- [ ] T12. Sobrevivir a un reinicio. (RF-4, RF-5) — *Diego ejecuta*
      Reiniciar el VPS entero.
      Hecho cuando: sin que nadie intervenga, el panel vuelve a abrir en su dominio, se
      puede entrar con la cuenta de gerencia, y lo que se hubiera registrado antes sigue
      ahí. **El vecino también vuelve.**

## D — La app del operador (bloqueada hasta que haya dominio)

- [ ] T13. Dirección real en `eas.json` y compilar el APK.
      (RF-22, RF-24, RF-27) — *Diego ejecuta, con cuenta de Expo*
      Se rellena la dirección que dejó pendiente T4 y se compila con el perfil de
      producción.
      Hecho cuando: EAS devuelve un enlace de descarga de un **APK** (no un bundle);
      queda anotado que la llave de firma la administra EAS; y la dirección compilada es
      la de producción, no `localhost`.

- [ ] T14. Un teléfono limpio, de punta a punta y sin señal.
      (RF-6, RF-23, RF-25, RF-26) — *Diego, con el teléfono*
      **Desinstalar primero** la app de pruebas: no se instala encima. Instalar desde el
      enlace, activar con un código emitido desde el panel de producción, poner el avión,
      firmar un preoperacional completo, y quitar el avión.
      Hecho cuando: la app se instaló desde el enlace sin tienda; la activación pidió
      señal **una sola vez**; el historial del operador **no muestra ningún registro de
      prueba**; el preoperacional se firmó con el avión puesto; y al recuperar señal
      aparece en el panel **con su firma y sus fotos**, servidas desde el panel y no
      desde ninguna otra dirección.

## E — Lo que queda escrito

- [ ] T15. Instrucciones para el operador y dónde está respaldada la evidencia.
      (RF-23, RF-28) — *yo*
      `docs/instalar-la-app.md`: media página en español, con lo del permiso de «origen
      desconocido», que es donde se traba todo el mundo. Y en `docs/despliegue.md`, qué
      respalda cada proveedor para cada pieza de un preoperacional firmado —la base, las
      imágenes y el propio teléfono—, comprobado una vez con el registro de T14.
      Hecho cuando: las dos cosas están escritas, y lo de los respaldos cita el
      preoperacional concreto de T14, no un ejemplo inventado.

- [ ] T16. Validación final: recorrido RF por RF de la spec. (Todos)
      Hecho cuando: cada uno de los 29 RF tiene su comprobación con resultado escrito;
      los diez pasos de los criterios de finalización de la spec están hechos **en
      producción**; el dominio del vecino respondió en cada comprobación; y la spec queda
      marcada como Cumplida.

## Notas de ejecución

- **T1**: los tres comandos en verde. `expo-server` pasa a dependencia directa **sin cambiar
  de versión**: sigue siendo `57.0.3`, la que ya estaba en el árbol.

- **T1, el plan decía `.mjs` y está mal: tiene que ser `.cjs`.** El build ESM de
  `expo-server` **no carga en Node**: sus imports internos van sin extensión (`./abstract`) y
  el resolvedor de módulos responde `ERR_MODULE_NOT_FOUND`. El build CommonJS del mismo
  paquete carga sin problema, y es además el que el propio adaptador usa por dentro para
  cargar las rutas de `dist/server`. No es una preferencia de estilo: es la única vía que
  funciona. Corregido en `plan.md`, en esta lista y en `docs/despliegue.md`.

- **T1, el hallazgo que habría roto el despliegue en silencio: el adaptador NO sirve
  `dist/client`.** Se leyó su código antes de escribir nada: `createNodeEnv` solo lee
  archivos **dentro de `params.build`**, o sea `dist/server` —el manifiesto, el HTML y los
  módulos de cada `+api.ts`—. De los estáticos del cliente no sabe nada. Un arranque que solo
  llamara al adaptador habría servido el HTML del panel y **la pantalla se habría quedado en
  blanco**, porque su JavaScript daría 404. Se ve al abrir el navegador, no antes, y no dice
  qué pasa. `entrada.cjs` los sirve con `node:fs`, sin añadir ninguna dependencia.

- **T1, la comprobación se hizo de verdad, con el servidor arriba**, y fueron cinco:

  | Qué se pidió | Resultado |
  | --- | --- |
  | `/panel` | 200, `text/html`, 21 994 bytes |
  | `/api/auth/yo` | **401**, no 404 — la ruta de API se ejecutó y la guardia la rechazó |
  | Estático con hash | 200, `text/javascript`, `max-age=31536000, immutable` |
  | `/favicon.ico` | 200, `max-age=0, must-revalidate` |
  | `/..%2f..%2fpackage.json` | 404 — no se sale de la carpeta |

  El 401 es la señal que más vale: un 404 habría significado que el manifiesto de rutas no se
  cargó. La política de caché sale de mirar el export: **los 22 estáticos llevan el hash del
  contenido en el nombre**, salvo el favicon.

- **T1, lo que este arranque deliberadamente no hace**: TLS, redirección de http a https y
  conocer su dominio. Eso es del proxy del VPS. Aquí solo se escucha un puerto.

- **T1, efecto de mi `sed`**: al renombrar `.mjs` por `.cjs` en los tres documentos dejé en
  `docs/despliegue.md` un fragmento de ejemplo en sintaxis de módulos bajo un nombre `.cjs`.
  Se sustituyó por un puntero al archivo real, que ya existe. Ese documento se reescribe
  entero en T7 de todos modos.

- **T2**: los tres comandos en verde. La imagen construye, arranca y sirve. **436 MB.**

- **T2, la etapa de servir no instala nada, y eso se comprobó antes de escribirlo.** El
  bundle de `dist/server` es **autocontenido**: el único `require` de un paquete que le queda
  es `crypto`, que es de Node —Metro empaquetó el resto dentro—. Y `expo-server` **no tiene
  ni una dependencia** y pesa 746 KB. Un `npm ci --omit=dev` en esa etapa habría instalado
  React Native entero para no usarlo, y esta imagen hay que mandarla por la red al VPS en
  cada despliegue.

- **T2, los mapas de código: van dentro y se activan.** `dist/server` pesa 82 MB, de los
  cuales **42 son los 54 mapas**. Node no los mira sin `--enable-source-maps`, así que
  llevarlos sin la bandera sería peso muerto. Con ella, un fallo en producción da una traza
  legible en vez de una posición dentro de un archivo empaquetado de 800 KB. Van, y la
  bandera está en el `CMD`.
  *Dato aparte que tranquiliza:* **`dist/client` no lleva ni un mapa**, así que al navegador
  no se le expone nada del código fuente.

- **T2, comprobado sobre la imagen construida, no sobre el Dockerfile:**

  | Qué se buscó | Resultado |
  | --- | --- |
  | Cualquier archivo `.env*` en toda la imagen | **ninguno** |
  | El valor real de `DATABASE_URL` | 0 archivos |
  | El valor real de `SECRETO_TOKENS` | 0 archivos |
  | Los valores reales de `R2_LLAVE_SECRETA` y `R2_LLAVE_ID` | 0 archivos |

  Buscar los **valores** y no los nombres es lo que hace que esto valga: un nombre puede no
  aparecer y el secreto sí.

- **T2, comprobación extra que me impuse y no estaba en la tarea**: que la imagen arranque y
  sirva. Panel **200**, ruta de API **401** (se ejecutó y la guardia la rechazó), estático
  **200**, y el proceso corre como **uid 1000 (`node`), no como root**.

- **T2, Docker Desktop no estaba corriendo** cuando empecé: el CLI responde pero el demonio
  no. Se lanzó y tardó unos diez segundos en estar listo. Conviene tenerlo en cuenta en T9,
  que construye la imagen en esta misma máquina.

- **T2, queda en el equipo la imagen `preoperaocc:prueba`**, a propósito: T3 la reutiliza y
  ahorra los dos minutos de construcción. Se puede borrar con `docker rmi preoperaocc:prueba`.

- **T3**: los tres comandos en verde. Levanta, sirve, y `docker compose down` no deja
  contenedor ni red.

- **T3, dónde viven los secretos, que es lo que más se confunde**: en un `.env` **junto a
  `compose.yaml`**, en la máquina donde se arranca. Compose lo lee para sustituir las
  variables y se las pasa al contenedor. **Eso no tiene nada que ver con `.dockerignore`**,
  que deja el `.env` fuera del *contexto de construcción*. Son dos mecanismos distintos y los
  dos hacen falta: uno impide que el secreto entre en la imagen, el otro se lo entrega al
  contenedor al arrancar. El mismo `compose.yaml` sirve aquí y en el VPS; lo que cambia es
  ese `.env`.

- **T3, `:?` detrás de cada variable, y funciona**: compose **se niega a arrancar** si falta
  alguna, diciendo cuál. Comprobado en una carpeta sin `.env`:
  `required variable DATABASE_URL is missing a value: falta la cadena de conexión de la base`.
  Sin eso, el contenedor levantaría a medias y fallaría en la primera petición que necesitara
  lo que falta — lejos de su causa.

- **T3, `unless-stopped` y no `always`**: si alguien lo para a mano para diagnosticar algo, un
  reinicio del servidor no se lo devuelve encendido a la espalda.

- **T3, se comprobó lo que la tarea pedía y una cosa más:**

  | Qué | Resultado |
  | --- | --- |
  | `http://127.0.0.1:3100/panel` | 200, `text/html` |
  | `http://192.168.1.64:3100/panel` (la IP de la máquina) | **sin respuesta** — atado al bucle local |
  | Ingreso con un usuario inexistente | **401 con el mensaje del panel** |
  | `docker compose down` | sin contenedor y sin red |

  El tercero es el que no estaba en la tarea y vale la pena: ese 401 **sale de consultar
  Neon**. Prueba que las variables llegaron al contenedor y que alcanza la base de verdad
  (RF-14). Si `DATABASE_URL` no hubiera llegado, habría sido un 500.
  *Efecto secundario, dicho para que no sorprenda:* ese intento dejó una fila en
  `intentos_acceso` de la base **de desarrollo**, a nombre de `prueba.despliegue`.

- **T3, el chequeo de salud se consulta con el propio Node**, no con `curl` ni `wget`: la
  imagen es `node:22-slim` y no los trae. Es informativo —no reinicia nada por sí solo—, pero
  es la forma rápida de contestar «¿volvió bien?» en T12 sin abrir el navegador. Arrancó
  marcando `healthy` a los ocho segundos.

- **T3, el mismo archivo sirve para construir aquí y para usar la imagen transferida allá**:
  lleva `build: .` y `image: preoperaocc:ultima`. Si la imagen ya existe —el caso del VPS,
  donde llega por `docker save`—, compose la usa sin construir nada.

- **T4**: los tres comandos en verde. Con esto **el bloque A está cerrado**: todo lo que se
  podía hacer sin el VPS, sin Neon y sin un teléfono, está hecho.

- **T4, el perfil se llama `production` y no `produccion`, a propósito.** Los docs de EAS lo
  dicen: *«si se omite `--profile`, EAS CLI usa por defecto el perfil llamado `production`»*.
  Con el nombre en español, `eas build -p android` fallaría y habría que acordarse de pasar
  `--profile` siempre. Alguien desplegando de noche escribe el comando corto. Es una de las
  excepciones razonables a la regla de nombrar todo en español: aquí el nombre no es nuestro,
  es la llave de un comportamiento por defecto de una herramienta externa.

- **T4, `eas.json` va sin comentarios.** Se buscó en los docs y **no hay ninguna mención a
  que los admita**, ni un solo ejemplo con ellos. No se arriesga en el archivo que gobierna
  la compilación del APK: el porqué vive aquí y en el procedimiento.

- **T4, la dirección pendiente es deliberadamente escandalosa**:
  `https://PENDIENTE-DEFINIR-EL-DOMINIO`. La alternativa era dejar `env` fuera, y eso es peor:
  sin `EXPO_PUBLIC_API_URL`, la app cae al camino de desarrollo y deduce la dirección del
  servidor de Metro — **un APK que parece bien y no puede activarse en la obra**. Con el
  texto puesto, si alguien compila sin reemplazarlo, el fallo dice exactamente qué se olvidó.

- **T4, `autoIncrement: true` con `appVersionSource: "remote"`** no es adorno: Android exige
  que el `versionCode` de un APK sea mayor o igual que el instalado para poder instalarlo
  encima. Sin esto, la segunda versión no se podría repartir sin desinstalar, y desinstalar
  borra lo que el operador no haya subido. Es lo que sostiene RF-27.

- **T4, solo hay un perfil.** No se añadió `development` ni `preview` porque nadie los
  necesita todavía y un perfil que nadie usa es un perfil que nadie mantiene.

- **T4, lo que NO queda comprobado aquí, y se dijo antes de escribirlo**: que el APK apunte
  al sitio correcto. Eso **solo lo prueba T13**, compilando de verdad. Lo que sí se comprobó
  es la forma del archivo, campo por campo: perfil `production`, `distribution: internal`,
  `buildType: apk`, **sin** `developmentClient`, `autoIncrement`, y la dirección marcada como
  pendiente en vez de apuntando a `localhost`.
