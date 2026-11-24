# Validación — Spec 052, el Drive de la obra

> Fecha: 2026-11-23 · Tarea T19 · Veredicto: **Cumplida** (41 de 41 RF en verde)

## Comprobaciones ejecutadas

| Comprobación | Resultado |
| --- | --- |
| `npm run verificar` | **1148 verificaciones correctas** (36 casos de la 052, `scripts/verificar-reglas.ts`) |
| `npm run typecheck` | sin errores (app y `scripts/`) |
| `npm run lint` | sin avisos |
| `npx expo export --platform web` + `grep` en `dist/client` | 0 archivos con `DATABASE_URL`, `TOKEN_INTEGRACION_DRIVE`, `DRIVE_LECTURA_ACTIVA`, `ANTHROPIC_API_KEY`, `R2_LLAVE_SECRETA` ni el hash del token; `dist` borrado |
| Demo de punta a punta (T18) | los 7 pasos de los criterios de finalización, en verde (ver `tareas.md`, nota de la T18) |

Las líneas citadas son de `scripts/verificar-reglas.ts`. «Demo T18 paso N» es el paso N de los criterios de
finalización de la spec, corrido el 2026-11-23 con n8n, Google Drive y el servidor de desarrollo de verdad.

## Requisito por requisito

### Recibir los archivos

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-1 | casos :23374, :23664, :23708; demo T18 paso 1 (4 nuevos, con nombre, subcarpeta, fecha e id) | verde |
| RF-2 | casos :8548 y :8590 (un token por puerta, cada ruta pide el suyo) | verde |
| RF-3 | caso :8548; demo T18 paso 7 (sin token y con token falso: 401 en inventario y subida) | verde |
| RF-4 | caso :23374 (fecha igual o anterior no se pide), :23708; T8 con `curl` (`ya_estaba`); demo T18: la segunda vuelta no volvió a pedir los 3 que no cambiaron | verde |
| RF-5 | caso :23727; T8 (copia en R2 privado); las copias salen solo por `/api/panel/media/[id]` tras sesión (demo T18 paso 2: 200 con sesión) | verde |
| RF-40 | casos :23331, :23374, :23727; T15 (video de 60 MB sin copia, «No se pudo leer: demasiado grande») | verde |
| RF-41 | caso :23994; T15 (el video solo ofrece «Abrir en el Drive», Diego lo probó) | verde |
| RF-6 | caso :23374; demo T18 paso 1 (la carpeta ya tenía los 4 archivos al conectarse y llegaron todos) | verde |
| RF-7 | caso :23297; demo T18 paso 1 (la hoja de Google llegó como `.xlsx` y quedó leída) | verde |

### La obra de cada carpeta

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-8 | caso :24034; demo T18 (la gerencia conectó PRUEBA-052 a PRUEBA-018 desde «Conectar carpeta») | verde |
| RF-9 | casos :23613, :24053; T14 (403 a quien no es gerencia en `carpetas`); T16 (el residente no ve el botón) | verde |
| RF-10 | caso :23938; T14 (`GET documentos?carpeta=` de una carpeta sin obra, solo gerencia) | verde |
| RF-39 | caso :23918; T13 (el oficio de la carpeta sin obra no apareció en el asistente) | verde |
| RF-11 | T12 (10 casos contra `neondb`, aislamiento entre obras); demo T18 paso 5 | verde |

### Leer y resumir

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-12 | casos :23560, :23736, :23762, :23782, :23794, :23816, :23853; T10 (PDF de 30 páginas); demo T18 paso 1 | verde |
| RF-13 | casos :23853, :23861; demo T18 (un resumen por documento, 4 + 1) | verde |
| RF-14 | caso :23782; T10 (PDF escaneado y foto); demo T18 paso 1 (acta escaneada: «grieta diagonal de 1,20 metros…») | verde |
| RF-15 | casos :23297, :23768; T9 (`.zip` → tipo no admitido, `.xls` y Excel con contraseña con su motivo) | verde |
| RF-16 | casos :23822, :23833, :23844; T11 (falla pasajera simulada: pendiente, pendiente, no se pudo) | verde |

### Versiones, retiros y cambios de nombre

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-17 | casos :23374, :23543; demo T18 paso 2 (Word editado en Drive: se pidió solo ese, manda el nuevo) | verde |
| RF-18 | demo T18 paso 2 («Versiones anteriores (1)»; la vieja se entrega completa, 1 932 bytes) | verde |
| RF-19 | casos :23500, :23513; demo T18 paso 3 (oficio a la papelera → «Retirado del Drive», con su copia y lo leído) | verde |
| RF-20 | caso :23500; T7 (`vuelven` en la respuesta del inventario) | verde |
| RF-21 | caso :23374 (renombrado y movido sin versión nueva) | verde |

### El asistente

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-22 | casos :23647, :23879, :23918; demo T18 paso 4 («5-dic-2026») | verde |
| RF-23 | casos :23794, :23900; demo T18 paso 4 (nombra «Acta comite de obra 9.docx», la carpeta raíz y la página) | verde |
| RF-24 | caso :23938; T13 (la fuente descargó la copia); demo T18 paso 4 (la fuente trae la ruta de la copia) | verde |
| RF-25 | casos :23543, :23560; demo T18 paso 4 (respondió con la versión vigente, no con la del 2 de diciembre) | verde |
| RF-26 | T12 (retirado solo con su opción) | verde |
| RF-27 | casos :23879, :23900; demo T18 paso 5 («no tiene nada sobre esa fecha»); T13 (el helicóptero: nada) | verde |
| RF-28 | casos :23647, :23918; demo T18 paso 5 (la otra obra «no está a su alcance») | verde |

### La lista en el panel

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-29 | casos :23951, :24020; demo T18 (la lista en la obra, con sus cifras) | verde |
| RF-30 | casos :23336, :23951; demo T18 (nombre, subcarpeta, fecha de Drive, resumen y estado de cada uno) | verde |
| RF-31 | caso :23951; T15 («control27» encontró el PDF por su texto) | verde |
| RF-32 | caso :23994; T15 (abrir y descargar, versiones anteriores); demo T18 paso 2 | verde |
| RF-33 | casos :23613, :23985; T14 («releer» deja `pendiente` con 0 intentos; 409 a lo que no tiene copia) | verde |
| RF-34 | caso :24010; demo T18 («Última entrega de n8n: 23/11/2026, 4:04 p. m., con 3 archivos») | verde |
| RF-35 | caso :23951; demo T18 (el Word, modificado de último, encabeza la lista) | verde |

### Quién ve qué

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-36 | casos :23613, :24020; T16 (residente asignado lo ve) y demo T18 paso 6 | verde |
| RF-37 | casos :23613, :23938; demo T18 paso 6 (almacenista: 403 en la lista, 404 en la copia); T14 (otra obra: 404) | verde |
| RF-38 | `buscarEnElDrive` (T12) busca por obra y no depende del asistente: la spec 053 lo usará tal cual. No tiene consumidor todavía, a propósito (el correo es la 053) | verde |

## Requisitos no funcionales

- **Menos de 15 minutos:** inventario cada 5 minutos (con la subida en la misma vuelta) y pulso dos minutos
  después. En la demo, el pulso leyó los 4 documentos en 20 s. Un archivo suelto queda leído en menos de unos
  10 minutos. La primera carga de una carpeta grande va de a 15 archivos por vuelta, como admite la spec
  («Carpeta grande al conectar»). **Cumple por diseño:** no se cronometró con los disparadores activos.
- **50 MB:** RF-40 y RF-41.
- **Español y tokens del panel:** pantalla revisada por Diego en la T15.
- **Costo:** medido en T10 y T18. Unos 0,005 USD por documento (el resumen) más unos 0,0085 USD por página de PDF
  o imagen. La demo entera costó 0,058 USD.

## Alcance

- **Nada fuera de la spec.** Además del plan, solo hay piezas que la sostienen:
  - `GET documentos?carpeta=` para la carpeta sin obra (RF-10);
  - el 409 de «releer» (RF-33);
  - el aviso de entrega atrasada (RF-34);
  - en `compose.yaml` y `.env.ejemplo`, las dos variables, sin las cuales el panel no las recibe en el VPS.
- **Un cambio frente al plan, anotado en la T17:** la guía recomienda una **cuenta de servicio** con la carpeta
  compartida como Lector, en vez del OAuth de una persona. No cambia ningún RF y reduce lo que el consorcio
  tiene que autorizar.
- **Fuera de alcance, sigue fuera:**
  - Kontrola no escribe en el Drive (el flujo usa `drive.readonly`);
  - no copia a Documentos;
  - no saca campos fijos;
  - no hay avisos de documento nuevo;
  - solo lee la carpeta conectada;
  - el correo queda para la 053.

## Constitución

| Principio | Estado |
| --- | --- |
| 1 Local-first | sin cambios en el móvil |
| 2 La spec manda | ver Alcance |
| 3 Una regla, un sitio | las reglas viven en `shared/rules/drive.ts` y `permisos.ts`, con casos |
| 4 Nada se borra | retiros con `retirado_en`; versiones que se suman; copias que se conservan (ver la observación) |
| 5 Puerta de calidad | en verde |
| 6 Fronteras duras | guardia propia de la integración; secretos solo en `+api.ts` y servidor; export limpio |
| 7 Español | todo en español, con los tokens del panel |
| 8 Sin dependencias nuevas | `package.json` no cambió |

**Observación sobre el principio 4:** `leer.ts` borra los **fragmentos de búsqueda** de una versión antes de
volver a escribirlos (`guardarLectura`). Es el índice que se deriva de la copia, no evidencia: la copia, la versión y
su estado se conservan. Es lo que permite reintentar una lectura sin duplicar fragmentos, sin transacciones.

## Pendientes que no bloquean el cumplimiento

Son del despliegue y de la conexión de Magdalena, no de esta spec. La spec deja esa conexión fuera de la lista de
tareas.

- Las dos `[NECESITA ACLARACIÓN]` de la spec:
  - cuántos archivos tiene hoy la carpeta de Magdalena (para estimar la primera carga con la tarifa de arriba);
  - quién del consorcio comparte la carpeta con la cuenta de servicio.
- Desplegar:
  - la migración `0051` en `preoperaocc`;
  - el `compose.yaml` nuevo en el VPS;
  - un token de producción;
  - las credenciales del flujo en el n8n del VPS, con el freno `DRIVE_LECTURA_ACTIVA` en `0` hasta que Diego
    apruebe el estimado.
- **Fuera de esta spec:** el asistente (spec 028) dejó colar una frase en inglés al rechazar una obra ajena
  («Need to verify obra is within reach.»).
