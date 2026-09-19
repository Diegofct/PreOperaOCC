# Plan técnico — Spec 014

> Lee antes `docs/constitucion.md` y el `spec.md` de esta carpeta.
> Aquí va el CÓMO. Si algo de esto cambia el comportamiento acordado, no se resuelve
> en el plan: se vuelve a la spec.

Este plan es distinto de los doce anteriores: **no modifica ni una línea de `src/`**. Todo
lo que aparece aquí son archivos nuevos en la raíz —empaquetado, compilación y
procedimiento— y pasos que se ejecutan a mano, una vez, contra máquinas que no son esta.

Tres piezas independientes, en este orden:

1. **La base** de producción, que se puede hacer hoy y no toca nada de lo que ya corre.
2. **El servidor**, que es donde está el riesgo (el proyecto vecino).
3. **La app**, que está bloqueada hasta que haya dominio.

## Módulos y archivos

| Archivo | Qué es | RF |
| --- | --- | --- |
| `servidor/entrada.cjs` | **Nuevo.** Arranca un servidor HTTP de Node y le entrega cada petición al adaptador de Expo. Es lo único que falta para que `dist/server` sea un servidor de verdad | RF-1, RF-4, RF-5 |
| `Dockerfile` | **Nuevo.** Dos etapas: una compila el bundle, otra solo lo ejecuta | RF-4, RF-13 |
| `.dockerignore` | **Nuevo.** Lo que nunca entra en la imagen. **`.env` el primero** | RF-13 |
| `compose.yaml` | **Nuevo.** Arranca el contenedor con sus variables, su puerto y su política de reinicio | RF-4, RF-14, RF-15 |
| `eas.json` | **Nuevo.** El perfil de compilación del APK | RF-22, RF-23, RF-24, RF-27 |
| `package.json` | `expo-server` pasa a dependencia directa | RF-1 |
| `docs/despliegue.md` | **Ya existe**, escrito antes de esta spec. Se reescribe como el procedimiento definitivo, paso a paso y con la reversa de cada uno | RF-10, RF-28 |
| `docs/instalar-la-app.md` | **Nuevo.** Media página, en español, para el operador | RF-23 |

**Nada de `src/` se toca**, y eso es una propiedad, no una casualidad: el panel habla con su
servidor por rutas relativas (`/api/panel/…`, en `cliente-api.ts:138`), así que funciona en
cualquier dominio sin recompilar. Lo único que lleva una dirección dentro es el APK, y entra
por configuración de compilación, no por código (`src/features/sync/servidor.ts` ya lee
`EXPO_PUBLIC_API_URL`).

### `expo-server` como dependencia directa

Ya está instalado —`57.0.3`, por debajo de `expo-router`— y trae el adaptador de Node en
`expo-server/adapter/http`. **No es un paquete nuevo**: es escribir en `package.json` una
versión que ya está en el árbol. Se hace porque `servidor/entrada.cjs` lo importa directo, y
depender de que un paquete siga siendo dependencia transitiva de otro es apoyarse en algo
que nadie prometió.

## Modelo de datos

- **Local** (`src/db/local/schema.ts`): **sin cambios.**
- **Servidor** (`src/db/servidor/esquema.ts`): **sin cambios.**
- **Migraciones**: ninguna nueva. Se **aplican** contra la base nueva las 12 que ya existen
  en `drizzle/servidor/`, con `npm run db:migrar:servidor`.
- **Siembra**: `npm run db:sembrar:servidor` carga tipos de equipo y plantillas. **No carga
  obras, personas ni vehículos**, que es exactamente lo que pide RF-19.
- **Primera cuenta**: `npm run crear-admin`, que es la única forma de entrar la primera vez
  (RF-20).
- **Compatibilidad con teléfonos sin actualizar**: no aplica. Contra la base de producción
  **no hay ningún teléfono todavía**; todos se activan de cero (RF-26).
- **La base de desarrollo no se toca** y sigue siendo la de la máquina de quien desarrolla
  (RF-21). Lo único que hay que cuidar es cuál cadena está en el `.env` en cada momento.

## Algoritmo / reglas

No hay ninguna regla de negocio en esta spec. Lo que sí tiene una secuencia que importa es
**el cambio en la entrada de tráfico**, que es donde vive el riesgo de RF-7:

```
1. Escribir la configuración del dominio nuevo en un ARCHIVO APARTE.
   No se abre, ni se lee, ni se toca el archivo del proyecto vecino.
2. Validar la configuración completa sin aplicarla.        (RF-8)
3. Si la validación falla -> borrar el archivo nuevo y parar. (RF-9)
4. Si pasa -> RECARGAR, nunca reiniciar.                   (RF-7)
5. Comprobar el dominio del vecino ANTES que el nuevo.
6. Si el vecino no responde -> borrar el archivo y recargar otra vez.
```

Los pasos 2 y 4 son los que hacen que esto sea seguro, y conviene entender por qué:
**validar** revisa la sintaxis de toda la configuración —la nueva y la que ya estaba— sin
aplicar nada; y **recargar** levanta los procesos nuevos con la configuración nueva y deja
morir a los viejos cuando terminan lo que estaban sirviendo, así que ninguna petición en
vuelo se corta. Reiniciar sí cortaría.

El paso 5 comprueba primero el vecino y no el propio: si algo salió mal, lo que hay que
saber cuanto antes es si rompimos lo que ya funcionaba.

## Decisiones técnicas

- **Docker, y no pm2 ni systemd** → se descartó correr Node directamente en el VPS porque
  esa máquina ya tiene un proyecto en contenedor: dos sistemas de despliegue distintos en la
  misma máquina es el doble de cosas que recordar a las dos de la mañana. Además el
  contenedor fija la versión de Node, que si no depende de lo que haya instalado.

- **La imagen se construye en la máquina de desarrollo y se transfiere ya hecha** → se
  descartó construirla en el VPS. Empaquetar el bundle es lo que más memoria consume de todo
  este proyecto, y un VPS pequeño puede quedarse sin RAM justo ahí — un fallo que aparece a
  mitad del despliegue y no dice claramente qué pasó. Construyendo en local, **el VPS nunca
  ejecuta el empaquetador**; solo recibe una imagen y la corre. Se transfiere con
  `docker save` sobre `ssh`, sin necesidad de un registro ni de una cuenta más.

- **Dockerfile de dos etapas, no copiar un `dist/` construido a mano** → se descartó exportar
  fuera y que la imagen solo empaquete el resultado. Sería más rápido, pero la imagen
  dejaría de poder reconstruirse a partir del repositorio: dentro de seis meses nadie sabría
  con qué se hizo. Con dos etapas, la imagen es reproducible y el `dist/` de la máquina de
  desarrollo no contamina nada.

- **El contenedor publica su puerto solo en `127.0.0.1`** → se descartó publicarlo en todas
  las interfaces. Si se publica abierto, el panel queda accesible por `http://IP:puerto`
  **saltándose el cifrado y el proxy**, y eso es exactamente lo que RF-2 prohíbe. Atado al
  bucle local, la única puerta es el proxy.

- **Un archivo de configuración aparte para el dominio nuevo** → se descartó añadir el
  bloque al archivo donde está el vecino. Es la diferencia entre poder deshacer borrando un
  archivo y tener que recordar qué líneas se añadieron a un archivo que ya funcionaba. RF-7
  pide cero interrupción, y la forma de conseguirla es no abrir nunca ese archivo.

- **El certificado se emite solo para el dominio nuevo** → se descartó reemitir el del VPS
  entero. Tocar el certificado del vecino es tocar al vecino.

- **Los secretos entran como variables del contenedor, nunca en la imagen** → se descartó
  copiarlos dentro o montar el `.env`. Una imagen con credenciales dentro no se puede
  guardar, ni mover, ni compartir, ni depurar sin cuidado; y la que tenemos se construye sin
  ellos porque **el empaquetado no necesita ningún secreto**: el código los lee con
  `process.env` en el momento de cada petición, no al compilar. `.dockerignore` con `.env`
  es lo que impide que se cuelen por descuido.

- **`SECRETO_TOKENS` nuevo para producción** (RF-15) → se descartó reusar el de desarrollo.
  Cambiarlo obliga a todos los equipos a refrescar, y ahora mismo **no hay ninguno en
  producción**: es el único momento en que sale gratis. Reusarlo significaría que un token
  emitido en pruebas vale en producción.

- **`distribution: "internal"` en EAS, con `buildType: "apk"`** → se descartó el formato de
  Play Store (`app-bundle`), que no se puede instalar desde un enlace. Confirmado en los
  docs de EAS: el bundle solo hace falta para publicar en la tienda, que está fuera de
  alcance.

- **El perfil de producción NO lleva `developmentClient`** → se descartó reutilizar el
  perfil de desarrollo. Un build con cliente de desarrollo necesita un servidor de Metro
  para arrancar y trae dentro las herramientas de depuración —de ahí el aviso de
  «devtools client» que se ve hoy en la consola—. La app del operador no puede depender de
  eso, y ese aviso desaparece por construcción en el build de producción.

- **`EXPO_PUBLIC_API_URL` se fija en `eas.json`, no en un `.env` local** → se descartó
  depender del `.env` de quien compila. Compilar desde otra máquina, o con el `.env` de
  desarrollo puesto, produciría un APK que apunta a `localhost` y que **no se nota hasta que
  un operador lo instala en la obra**. Escrito en `eas.json`, viaja con el repositorio.

- **La llave de firma la administra EAS** → se descartó generarla y guardarla a mano.
  Perderla significa que ningún operador puede volver a actualizar la app sin desinstalarla
  primero, y una llave en el portátil de una sola persona es exactamente cómo se pierde.

## Impacto en la sincronización

**Ningún cambio de código.** Ni el pull, ni la cola de salida, ni el orden de `seq`, ni las
claves de idempotencia, ni lo que el servidor reevalúa al recibir un preoperacional.

Lo que sí cambia es el **punto de partida**, y conviene tenerlo escrito:

- **Todos los equipos empiezan de cero.** La clave que firma las sesiones de los teléfonos
  es otra (RF-15), así que ningún token de desarrollo sirve. Cada operador activa su equipo
  una vez, con señal, y a partir de ahí no vuelve a necesitarla (RF-25).
- **El teléfono de pruebas se desinstala antes de instalar el de producción** (RF-26). No se
  instala encima: su base local trae preoperacionales de máquinas que en producción no
  existen, y aparecerían en el historial del operador.
- **Durante una actualización del panel, la cola aguanta.** El teléfono no distingue entre
  «sin señal» y «el servidor no responde»: reintenta después. Es exactamente el caso para el
  que se diseñó, y es lo que hace que RF-11 pueda aceptar un corte.

## Contrato de API

**Ninguno.** No se añade, quita ni modifica ningún endpoint. Las guardias siguen como están:
cookie para el panel, token para el móvil. Nada que ver con el alcance por obra.

La única propiedad de las rutas que este plan usa —y no cambia— es que **el panel las llama
por ruta relativa**, que es lo que permite servir el mismo bundle en cualquier dominio.

## Estrategia de verificación

### `scripts/verificar-reglas.ts`

**No se añade ningún caso, y no es un olvido**: esta spec no introduce ninguna regla pura.
Lo dice ya la spec en sus criterios de finalización. Los tres comandos tienen que estar en
verde antes de construir la imagen, pero verifican lo de siempre, no esto.

### Puertas automáticas antes de tocar el servidor

| Comprobación | Qué atrapa |
| --- | --- |
| `npm run verificar` · `typecheck` · `lint` | Que se despliega algo sano |
| `npx expo export --platform web` | Que el bundle compila |
| Buscar **los valores** de los secretos en `dist/client` | La peor fuga posible (RF-16) |
| Revisar el contenido de la imagen construida | Que `.env` no se coló (RF-13) |
| Validar la configuración del proxy **sin aplicarla** | Que no tumbamos al vecino (RF-8) |

Buscar los **valores** y no solo los nombres de las variables no es paranoia: un nombre
puede no aparecer y el secreto sí.

### Demo manual

Los diez pasos escritos en los criterios de finalización de la spec, en producción y en ese
orden. Los dos que más valen:

- **El paso 1, repetido después de cada cambio al proxy**: el dominio del vecino responde.
- **El paso 7**: un preoperacional firmado sin señal aparece en el panel con su firma y sus
  fotos. Es lo único que ejercita el almacén de imágenes de punta a punta, y nunca ha
  corrido fuera de `localhost`.

## Riesgos

- **Tumbar el proyecto vecino.** Es el riesgo que domina esta spec. *Se previene* no abriendo
  nunca su archivo, validando antes de aplicar y recargando en vez de reiniciar. *Se detecta*
  comprobando su dominio antes que el propio. *Se revierte* borrando el archivo nuevo y
  recargando otra vez: vuelve al estado exacto de antes, porque nada suyo se modificó.

- **El certificado toca la configuración del vecino.** La herramienta que emite certificados
  sabe editar la configuración del proxy, y ahí es donde podría meterse donde no debe. *Se
  previene* pidiéndole el certificado **solo para el dominio nuevo**. *Se detecta* con la
  misma comprobación del vecino. *Se revierte* igual.

- **Un APK con la dirección equivocada.** No se arregla en el servidor: hay que compilar otra
  vez y que **todos** reinstalen. *Se previene* fijando la dirección en `eas.json` y
  comprobándola en el primer teléfono antes de repartir el enlace a nadie más. *Se detecta*
  al activar: el equipo no encuentra el servidor.

- **Quedarse sin memoria al empaquetar.** *Se previene* construyendo la imagen en la máquina
  de desarrollo. Si algún día hay que construir en el VPS, es lo primero que hay que mirar.

- **El certificado caduca y nadie se entera.** El panel deja de abrir aunque todo esté bien.
  *Se previene* con la renovación automática. *Se detecta* comprobando, una vez, que la
  renovación está programada de verdad — no basta con suponerlo.

- **Desplegar con el `.env` de desarrollo puesto.** Apuntaría producción a la base de
  pruebas. *Se previene* porque los secretos del servidor **no salen del `.env`**: son
  variables del contenedor, escritas aparte en el VPS. *Se detecta* al entrar al panel y ver
  datos de prueba que no deberían existir.

- **Perder la llave de firma de la app.** Ningún operador podría actualizar sin desinstalar,
  y desinstalar borra lo que no haya subido. *Se previene* dejándosela a EAS y comprobando
  una vez que está ahí.
