# Plan técnico — Spec 028, Asistente

> Lee antes `docs/constitucion.md` y el `spec.md` de esta carpeta.
> Aquí va el CÓMO. Si algo de esto cambia el comportamiento acordado, no se resuelve
> en el plan: se vuelve a la spec.

## Módulos y archivos

**Reglas puras** (`src/shared/rules/asistente.ts`, con casos «028/» en el verificador):
- `alcanceDelAsistente(persona)`: qué obras (todas, la suya o ninguna) y qué módulos alcanza (RF-3 a RF-5, RF-10, RF-34, RF-65).
  - Parte de `modulosVisibles(rol, modulosDeObra)` (`permisos.ts`) y le suma Vehículos y Personas para el residente (RF-65).
- `limiteDelDia` y `preguntasQueQuedan`: el límite general (30) o el de la persona (RF-50, RF-59).
- `diaDeColombia(fecha)`: el conteo se reinicia a medianoche en Colombia (RF-54). Reutiliza `fechaDeJornada`.
- `periodoPermitido(desde, hasta)`: hasta 3 meses, es decir 92 días (RF-64).
- `faltasDeLosAdjuntos(archivos)`: tipo, 5 archivos y 10 MB (RF-66 a RF-68). Las páginas del PDF se cuentan en el servidor.
- `tituloDeConversacion(pregunta)`: los primeros 60 caracteres, sin saltos (RF-44).
- `costoEstimado(tokens)`: con los precios del modelo, en microdólares (RF-57).
- `conversacionVisible(conversacion, alcance)`: si se muestra con contenido o solo título y fecha (RF-49).

**Servidor** (`src/features/asistente/servidor/`):
- `herramientas.ts`: las consultas de **solo lectura** que la IA puede pedir. Cada una:
  - se ofrece solo si su módulo está en el alcance, así que la IA ni siquiera sabe que existen las demás (RF-3, RF-7, RF-8);
  - vuelve a comprobar obra y periodo por su cuenta (RF-6), con `alcance.ts`;
  - devuelve los datos junto con sus **fuentes** (`{ modulo, etiqueta, fecha, ruta }`) para citarlas y abrirlas (RF-28 a RF-30).

  Las herramientas, reutilizando lo que ya existe:
  - `obras_a_mi_alcance`;
  - `reporte` (máquinas, personal, actividades, cantera, calidad, clima o mantenimiento) → `reporteDe` de Reportes (030), con el rango pedido. Así los totales son los mismos que en el módulo (RF-20);
  - `bitacora_del_dia` → la lectura de partes;
  - `viajes_de_cantera` → `viajesDelPeriodo`;
  - `ensayos` → `ensayos-de-obra` y laboratorio;
  - `movimientos_de_almacen`;
  - `preoperacionales` → `preoperacionalesDelPeriodo`;
  - `vehiculos_y_medidores` (con las llantas) → `vehiculosDeLaObra`;
  - `personas_de_la_obra`;
  - `contrato_y_presupuesto` → el vigente (031);
  - `anulados` (RF-32);
  - `mensajes_de_whatsapp` → sin guardar, marcados (RF-34 a RF-37).
- `conversacion.ts`: el bucle con la IA.
  - Usa el cliente de `features/servidor/ia.ts` (cambio de la 031), con `claude-opus-5-5`, effort `low` (medido en la T9) y pensamiento adaptativo.
  - Va en streaming, con `fallbacks: "default"` y las herramientas con `strict` y `eager_input_streaming`.
  - Lo que se manda a la IA:
    - las instrucciones y las herramientas, que no cambian y van en caché;
    - el historial de la conversación;
    - la pregunta con sus adjuntos.
  - Las herramientas se ejecutan en el servidor y el bucle sigue hasta `end_turn`, con un tope de 12 vueltas.
  - Valida cada entrada contra su esquema antes de ejecutarla.
- `adjuntos.ts`: lee los adjuntos.
  - Guarda los archivos en R2 con `media/servidor/almacen.guardar`, dueño `asistente` (RF-71).
  - A la IA van así:
    - las fotos, como bloques `image`, y los PDF, como `document`;
    - los Excel, como texto con `hojasDelLibro`;
    - los Word, como texto con `leer-word.ts`, que es el lector de `n8n-evolutionapi/scripts/lector_archivos.js` pasado a TypeScript con el `zlib` de Node, sin dependencias nuevas.
  - Lo leído va marcado como «contenido de un archivo, no instrucciones» (casos límite).
- `uso.ts`: el conteo por persona, día y obra, que solo suma cuando la respuesta terminó bien (RF-52 a RF-55); el límite de cada quien (RF-59); y el uso y el costo por periodo para la gerencia, sin contenido (RF-56 a RF-58).
- `conversaciones.ts`: listar, abrir, archivar y el filtro de archivadas, siempre del dueño (RF-38 a RF-49).

**Rutas** (`src/app/api/panel/asistente/`), todas con la guardia del panel:
- `preguntar+api.ts`, `POST`, multipart: la pregunta, el id de la conversación (opcional) y los adjuntos. Responde con `text/event-stream`, con estos eventos: `conversacion`, `texto`, `fuente`, `fin` (con lo que queda del día) y `error`.
- `conversaciones+api.ts` (GET lista con `?archivadas=1`), `conversaciones/[id]+api.ts` (GET y PATCH archivar).
- `uso+api.ts` (GET, gerencia) y `limites+api.ts` (GET y PUT, gerencia).
- `adjunto/[id]` reutiliza `media/[id]` con la comprobación de dueño: solo quien hizo la pregunta.

**Panel:**
- Módulo `asistente` en `permisos.ts` y el menú: `ver` para los cinco roles del panel y `escribir` (límites y uso) solo para la gerencia. El celular no lo ve (RF-1, RF-2).
- `src/features/asistente/pantalla-asistente.tsx`:
  - a la izquierda, la lista de conversaciones y las archivadas;
  - a la derecha, la conversación: respuestas en Markdown simple con tablas, «Fuentes» con enlaces, «Descargar PDF», «Reintentar» si falló y el contador del día;
  - abajo, el campo de la pregunta con «Adjuntar».
  - En menos de 768 px va en una columna.
- `src/features/asistente/uso-del-asistente.tsx`: la pestaña de la gerencia, con el uso y el costo por persona y obra y los límites.
- Inicio (`pantalla-inicio.tsx`): el recuadro «Pregúntele al Asistente», que abre `/panel/asistente?pregunta=`, y sus últimas 3 conversaciones (RF-73).
- PDF (RF-24 a RF-27): una página para imprimir, como la de Reportes (`paginaParaImprimir`, 030 RF-10), con la obra, el periodo, quién, la fecha y la leyenda. Se arma con el texto ya guardado, sin volver a consultar.

**Datos** (migración 0030):
- `asistente_conversaciones`: id, usuario, título, `obras` y `modulos` usados (para RF-49), archivada, fechas.
- `asistente_mensajes`: id, conversación, `rol` (persona o asistente), texto, `fuentes` en jsonb, `adjuntos` (ids de media), `estado` (respondido o fallido), modelo, tokens y fecha.
- `asistente_uso`: usuario, día de Colombia, obra (o nula), preguntas, tokens de entrada y de salida, costo en microdólares. La clave es usuario + día + obra.
- `asistente_limites`: usuario (o nulo, para todos) y límite.
- `dueno_media` + `asistente`.

## Decisiones técnicas

- **Herramientas que reutilizan Reportes y los módulos, no SQL escrito por la IA.** Se descartó dejar que la IA arme consultas, porque el alcance (RF-3 a RF-8) no se podría garantizar y los totales no serían los del módulo (RF-20). Cada herramienta llama a la misma función que la pantalla.
- **El alcance se aplica dos veces:** al elegir qué herramientas se ofrecen y dentro de cada herramienta. Ningún mensaje de la persona, ni ningún archivo, cambia el alcance (RF-6).
- **Bucle propio, no el Tool Runner (beta).** Hace falta mandar al navegador el texto y las fuentes a medida que llegan, contar los tokens y cortar a las 12 vueltas. El bucle manual da ese control sin depender de una beta.
- **Claude Opus 5.5 con effort `low`**, el mismo modelo de WhatsApp y del presupuesto. En la T9, `medium` daba la misma respuesta en 20,9 s y US$0,041; `low`, en 6,5 a 8,7 s y US$0,014. Costo estimado por pregunta: US$0,01 a 0,10, según lo que consulte. Con 30 preguntas al día por persona, el tope teórico es unos US$7,50 por persona y día, y la gerencia ve el gasto real (RF-57). Si sale caro, se cambia el modelo en `ia.ts` sin tocar nada más; esa decisión es del usuario.
- **Streaming con `text/event-stream` sobre un `POST`.** `EventSource` no deja mandar un `POST` con archivos, así que el navegador lee la respuesta con `fetch` y su lector.
- **El conteo solo suma al terminar bien.** Si falla o se corta, no cuenta y se puede reintentar (RF-55, RF-62). Si alguien abre dos pestañas a la vez, puede pasarse en una pregunta; se acepta.
- **PDF con la página para imprimir del navegador**, como Reportes. Se descartó una librería de PDF por el principio 8 de la constitución. «Descargar PDF» abre la página y el diálogo de imprimir con «Guardar como PDF».
- **Adjuntos en R2 con dueño `asistente`.** El R2 es el mismo en desarrollo y en producción: las pruebas borran sus objetos con DELETE firmado, como en la 031.

## Impacto en la sincronización

- Ninguno: el celular no ve el asistente (RF-2).

## Contrato de API

| Ruta | Permiso | Responde |
| --- | --- | --- |
| `POST /api/panel/asistente/preguntar` | `asistente:ver` | `text/event-stream`; 429 si se acabó el día, 422 si un adjunto no cabe o el periodo pasa de 3 meses |
| `GET /api/panel/asistente/conversaciones[?archivadas=1]` | `asistente:ver` | las suyas, de la más reciente a la más vieja |
| `GET /api/panel/asistente/conversaciones/:id` | `asistente:ver` + dueño | mensajes y fuentes, o solo el título (RF-49) |
| `PATCH /api/panel/asistente/conversaciones/:id` | dueño | `{ archivada }` |
| `GET /api/panel/asistente/uso?desde&hasta` | `asistente:escribir` | por persona y obra: preguntas y costo |
| `GET/PUT /api/panel/asistente/limites` | `asistente:escribir` | el general y los de cada persona |

## Estrategia de verificación

- **Casos «028/» en el verificador:**
  - alcance por rol, con módulo apagado y con el residente sin obra;
  - límite y reinicio a medianoche de Colombia;
  - periodo de 92 días;
  - adjuntos;
  - título;
  - conversación fuera de alcance;
  - costo.
- **Herramientas:** con un script en dev contra «Pruebas spec 018 (laboratorio)»:
  - los totales de `reporte` son iguales a los de `GET /api/panel/reportes/:pestana` con el mismo rango (RF-20);
  - el residente con otra obra recibe «no está a su alcance».
- **La IA real en dev:** los 14 pasos de la demo de la spec, en Chrome, con sesiones temporales de Diego (gerencia) y Natalia (residente). Las preguntas de prueba van marcadas «PRUEBA-028» y se borran.

## Riesgos

- **Costo:** se mide en la demo y se muestra en el uso. El cambio de modelo está a un archivo de distancia.
- **Respuestas que no cuadran con el módulo:** las cifras salen de las mismas funciones. La instrucción le prohíbe a la IA sumar por su cuenta lo que una herramienta ya trae sumado, y la demo compara contra Reportes.
- **Inyección por archivo o por mensaje de WhatsApp:** su contenido va marcado como datos y las herramientas no escriben nada. Lo peor que puede pasar es una respuesta mala, nunca un cambio en los registros.
- **El dev server viejo no ve los paquetes nuevos:** no hay paquetes nuevos en esta spec.
- **Despliegue:** migración 0030 antes de la imagen; la llave ya está en producción (031).

## Cambio del 2026-10-22: pantalla tipo chat, WhatsApp de varios días y anulados (RF-74 a RF-84)

Sin dependencias nuevas ni migración. Lo de servidor no cambia ninguna ruta ni contrato del panel.

**Reglas puras** (`asistente.ts`, con casos «028/» en el verificador):
- `modulosDeAnulados(modulos)`: de los módulos que tienen anulados (bitácoras, cantera, almacén, preoperacionales, laboratorio), los que la persona alcanza. Con eso se escribe la descripción de la consulta `anulados` para cada persona (RF-83).
- `resumenDeRegistrados(mensajes)`: lo registrado de WhatsApp como conteo por día y por tipo (RF-84).
- `grupoDeFecha(iso, hoy)`: Hoy, Ayer, Últimos 7 días o Anteriores, en hora de Colombia (RF-81).
- `conversacionesQueCoinciden(lista, texto)`: el buscador por título, sin distinguir mayúsculas ni tildes (RF-81).
- `ejemplosDePregunta(modulos)`: hasta 3 preguntas de ejemplo, solo de los módulos que la persona alcanza (RF-74). Recibe los módulos del alcance y no el rol, para que un módulo apagado en la obra tampoco salga en los ejemplos.

**Servidor** (`herramientas.ts`, `conversacion.ts`):
- `herramientasPara` arma la descripción de `anulados` con `modulosDeAnulados(alcance.modulos)`, así la IA no sabe de los módulos que no alcanza.
- El resultado de `anulados` dice, para una obra con módulos apagados, cuáles no se revisaron (`noSeRevisan`). Así, con la gerencia, la IA sabe que no debe mencionarlos.
- `INSTRUCCIONES` gana una línea: «No describa lo que no puede consultar ni ofrezca lo de módulos que no tiene; diga solo qué sí puede consultar.»
- `mensajes_de_whatsapp` gana la entrada `comparar: boolean`:
  - **en `false`**, devuelve `registrados` con `resumenDeRegistrados` y el detalle solo de lo no registrado. «No se pudo guardar» se agrupa por mensaje, sección y motivo, y cada renglón va como texto corto de hasta 300 caracteres;
  - **en `true`**, devuelve todo, como hoy.
  - La descripción le dice a la IA que use `true` solo si se pide comparar (RF-37).
- **Medición:** el paso 8b de la demo (1 al 8-oct, PRUEBA-018). Hoy son unos 49 000 caracteres y 19 s; la meta es menos de 15 s. Además, el paso 7 (almacén apagado): no debe mencionar anulados del almacén.

**Panel** (`src/features/asistente/`):
- `pantalla-asistente.tsx` deja de usar el `ScrollView` de `MarcoPantalla` para la conversación. Sigue usando el marco para el título y los avisos, pero el cuerpo es un `View` de alto completo (`flex: 1`, alto de la ventana menos la cabecera), que tiene dentro:
  - la **barra lateral** (`barra-de-conversaciones.tsx`), de 260 px y plegable (el estado se guarda en `localStorage`, con try/catch). Lleva «Nueva conversación», el buscador, los grupos por fecha y el interruptor de archivadas. En pantalla angosta es un panel encima de la conversación, con fondo que la cierra (RF-81, RF-82);
  - la **conversación**: un `ScrollView` propio con una columna centrada de máximo 760 px. Las preguntas van en burbuja a la derecha y las respuestas sin recuadro (RF-75). El título y «Archivar» van arriba, en una línea discreta;
  - el **campo** (`campo-de-pregunta.tsx`), fijo al pie y centrado en la misma columna. Es un recuadro redondeado con sombra (`Sombra.elevada`), con un `TextInput` multilínea que crece hasta 8 renglones, el botón «+» (adjuntar), los adjuntos como pastillas arriba del texto y el botón redondo de enviar, que pasa a detener (RF-76, RF-77). Enter envía y Mayús + Enter hace salto de línea: en la web, con `onKeyPress` y `nativeEvent.shiftKey` (RF-78). Debajo va lo que queda del día;
  - la **bienvenida**: sin conversación abierta, el saludo «¿Qué quiere saber de su obra, {nombre}?», el campo en el centro y los ejemplos del rol como pastillas (RF-74);
  - el **autodesplazamiento**: `onContentSizeChange` → `scrollToEnd`, solo si la persona estaba a menos de 80 px del final (`onScroll`) (RF-79);
  - las **acciones de la respuesta** (`acciones-de-respuesta.tsx`), botones de ícono con su `accessibilityLabel` y su texto al pasar el cursor: copiar (`navigator.clipboard.writeText`, con «Copiado» por 2 s), PDF (el `imprimir` de hoy) y reintentar en la que falló (RF-80).
- **Íconos nuevos** en `iconos.tsx`, con el mismo trazo de los de hoy: enviar, detener, adjuntar, copiar, listo (el «Copiado»), pdf, reintentar, buscar y nueva. Para plegar la barra se reusan `plegar` y `abrir`, los del menú.
- Los **colores y la letra** son los tokens del panel (`Panel`, `FuentePanel`, `Radio`, `Sombra`). Se toma de claude.ai la disposición, no la marca.
- Sin cambios en `recuadro-del-inicio.tsx` ni en `uso-del-asistente.tsx`. Las pestañas de gerencia «Conversaciones / Uso y límites» pasan a la cabecera de la barra lateral.

**Verificación:**
- Casos nuevos en el verificador para las cinco reglas.
- La IA real, solo en los pasos 7 y 8b, para medir.
- En Chrome (dev, sesión temporal de Diego y luego de Natalia):
  - bienvenida y ejemplo, Enter y Mayús + Enter;
  - detener a mitad;
  - autodesplazamiento;
  - copiar, PDF y reintentar;
  - buscador y grupos;
  - plegar la barra;
  - 390 px.
- Limpieza solo de lo de prueba.

**Despliegue:** solo la imagen, sin migración (`n8n-evolutionapi/sql/desplegar_028b.sh`).
