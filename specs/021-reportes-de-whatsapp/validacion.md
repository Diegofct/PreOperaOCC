# Validación — Spec 021, Reportes de WhatsApp

> Fecha: 2026-10-06 · Fase 7 del flujo SDD (tarea T26)

Recorrido RF por RF. Cada fila dice **con qué se comprobó**: un caso de
`scripts/verificar-reglas.ts` (por su nombre, que es estable; los números de línea no), una
prueba en vivo contra el panel de desarrollo (con la tarea en que se hizo; el detalle está en
las notas de `tareas.md`), o la razón por la que se cumple por construcción. Lo que no se
ejecutó no se da por verificado.

## Lo que se ejecutó

| Comando | Resultado |
| --- | --- |
| `npm run verificar` | **367 verificaciones correctas** |
| `npm run typecheck` | sin errores |
| `npm run lint` | sin hallazgos |
| `npx expo export --platform web` + `grep` de `DATABASE_URL`, `TOKEN_INTEGRACION_WHATSAPP`, `R2_LLAVE_SECRETA` y `SECRETO_TOKENS` en `dist/client` | exporta; **sin coincidencias** |

Migraciones aplicadas en `neondb` (desarrollo): `0018` (tablas de WhatsApp) y `0019`
(`obra_decidida_id`); disparadores de `actualizado_en` reaplicados (ahora con `partes_de_obra`).
**Producción no se ha migrado.**

Integración en `C:/dev/n8n-evolutionapi`: workflows «OCC - Clasificar mensajes» y «OCC -
Entregar a PreOperaOCC» **publicados**; la primera ejecución programada (00:15 del 2026-10-06)
salió bien.

## RF por RF

### Recepción desde la integración (RF-1 a RF-7)

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| 1 | T11 (`curl`), T25 (n8n entrega `PRUEBA-T24-1` y `PRUEBA-T25-1`); contrato `entregaDeWhatsapp` con sus casos | verde |
| 2 | Casos «la guardia de la integración…» (token correcto pasa); T11 | verde |
| 3 | Casos «un token incorrecto, ausente…», «sin hash configurado…», «responde 401 a la cookie del panel»; T11: 401 sin token y con token equivocado | verde |
| 4 | T11: el mismo mensaje → `conservado`; T25: reentrega tras la caída sin duplicar | verde |
| 5 | T11: otra propuesta mientras sigue pendiente → `reemplazado` | verde |
| 6 | T11: ya aprobado → `conservado` sin tocar la propuesta | verde |
| 7 | T12: foto a R2 + fila en `media`; R2 sin firma → 400; sin sesión → 401 | verde |

### Grupos y obras (RF-8 a RF-13)

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| 8 | T13 (API) y T19 (asociado desde la pantalla) | verde |
| 9 | `requerirAdmin` en las dos rutas de grupos; gerencia asocia en vivo (T13, T19); como residente: listar y asociar → 403 «Esta acción es solo para la gerencia.» (T26) | verde |
| 10 | T19: «Sin obra» con su aviso; T25: los grupos de prueba llegaron sin obra | verde |
| 11 | `filtroDeObraEstricto` («sin obra no lo ve nadie»); T13: sin asociar no sale en la bandeja | verde |
| 12 | T13 y T19: al asociar aparecen sus pendientes | verde |
| 13 | T13: al cambiar de obra se mueven pendientes e ignorados y lo aprobado se queda (`obra_decidida_id`) | verde |

### La bandeja (RF-14 a RF-25)

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| 14 | Caso «la bandeja de WhatsApp es de la gerencia y del residente»; gerencia en vivo (T14, T19); como residente (T26): pendientes, aprobados y descartados solo de «Pruebas spec 018», pedir otra obra le devuelve la suya, el reporte del grupo sin obra → 404, y no ve la sección de grupos | verde |
| 15 | Mismo caso: operador, almacenista, encargado de planta y laboratorista sin nada | verde (por la tabla de permisos; demo opcional) |
| 16 | T14: pendientes del más antiguo al más reciente | verde |
| 17 | T14 (API) y T20 (pantalla: texto, autor, fecha y propuesta) | verde |
| 18 | Caso «cada categoría se nombra en español»; T19 (columna Categoría) | verde |
| 19 | T19 («Revisar: …» en la lista) y T20 («La IA pide revisar…») | verde |
| 20 | T14 (la foto no sale aparte) y T20 (complemento y su foto dentro del reporte) | verde |
| 21 | T14 y T20: «Natalia Riaño · Residente 2» | verde |
| 22 | T14/T20: autor no reconocido → su nombre de WhatsApp («· no registrado») | verde |
| 23 | Caso «seguimiento e ignorar entran ignorados»; T11 | verde |
| 24 | T14 y T19: filtros de ignorados, aprobados y descartados | verde |
| 25 | T15: devolver un ignorado → pendiente; botón «Devolver a la bandeja» en T22 | verde |

### Corregir antes de aprobar (RF-26 a RF-29)

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| 26 | T15 (API) y T20/T21 (pantalla: corregir y guardar) | verde |
| 27 | T15 y T20: la propuesta de la IA sigue en 312 con la corregida en 300 | verde |
| 28 | T15: corregir una aprobada → 409 | verde |
| 29 | Casos de contratos («exigen la versión leída»); T15: versión vieja → 409 | verde |

### Aprobar: qué se crea y dónde (RF-30 a RF-49)

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| 30 | T16: actividades en la bitácora del día del hecho | verde |
| 31 | Caso «la propuesta de la plantilla se lee sección por sección» (una por ítem); T16 | verde |
| 32 | T16: 5.1.15 y 4.3.8 con el nombre del presupuesto | verde |
| 33 | Casos de `faltasDelReporte` (ítem 9.9.9); T16 y T20 | verde |
| 34 | T16: abscisas en la descripción, medidas en su sitio | verde |
| 35 | T16: ensayo en Control Calidad de Obra | verde |
| 36 | Casos de `faltasDelReporte` (ensayo fuera de la lista) | verde |
| 37 | Caso de la plantilla («Resultado: 98 %. Cumple. …»); T16 | verde |
| 38 | Caso «un incidente sin novedades lleva su resumen a las notas»; T16 (incidente en notas) | verde |
| 39 | T17: viajes en Control Cantera, uno por viaje | verde |
| 40 | T16: abre la bitácora del día si no existe | verde |
| 41 | T16 (409) y T22 (aviso en pantalla, sin «Aprobar») | verde |
| 42 | T16 y T22: «…hay que anularla con un motivo y abrir otra» | verde |
| 43 | T17 y T22: «Aprobar solo los viajes» con la bitácora cerrada | verde |
| 44 | Caso «la fecha, el clima y el personal se validan…» (día futuro); T16 → 400 | verde |
| 45 | T17: Control Cantera apagado → 400; aviso en T21 | verde |
| 46 | T16/T17: `origen` en cada fila y `mensaje_whatsapp_id` en el viaje, con quién y cuándo | verde |
| 47 | T23: «Desde WhatsApp» en la bitácora (5 secciones) y en Control Cantera (4 viajes) | verde |
| 48 | T23: guardar a mano conserva la fila y su marca; caso «guardar a mano conserva la marca…» | verde |
| 49 | T16: el «seguimiento» devuelto se aprueba sin crear nada | verde |

### Fotos (RF-50 a RF-53)

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| 50 | T18 (API) y T22 (elección en pantalla) | verde |
| 51 | T18: la del día solo si la bitácora no tiene una | verde |
| 52 | T18: la propuesta conserva sus 2 archivos; 1 objeto de R2, 3 filas | verde |
| 53 | `alcanzaElMensaje` en `/api/panel/media/[id]`; T12: sin sesión 401, gerencia 200; como residente (T26): foto de su obra 200, foto de un grupo sin obra 404 | verde |

### Descartar (RF-54 a RF-56)

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| 54 | T15 (API) y T22 (ventana de descarte) | verde |
| 55 | Caso «descartar exige motivo»; `check` en la base; T15 y T22 | verde |
| 56 | T15: motivo, quién («Diego»), cuándo y obra en la base | verde |

### Reglas transversales (RF-57 a RF-59)

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| 57 | Por construcción: solo `aprobarPropuesta` escribe en la bitácora y en `cantera_viajes`, detrás de `whatsapp:aprobar` | verde |
| 58 | Por construcción: ninguna ruta borra; descartar es un estado; los objetos de R2 se reutilizan | verde |
| 59 | T8: `secciones.ts` compartido por el formulario y la aprobación; T16 lo usa | verde |

### El reporte diario con plantilla (RF-60 a RF-95)

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| 60 | T20/T21: la propuesta por secciones de la bitácora | verde |
| 61 | Caso de la plantilla (fecha del encabezado); T24: la IA da 2026-10-01 | verde |
| 62 | Caso «sin fecha en el reporte…»; aviso en T20 | verde |
| 63 | T16: todas las secciones en una aprobación | verde |
| 64 | Caso «cinco errores salen a la vez»; T16 (400 sin tocar la bitácora); T22 (en pantalla) | verde |
| 65 | Casos de `abscisaDeTexto` | verde |
| 66 | Casos de `horaDeTexto` y `condicionDeClima`; T16 | verde |
| 67 | Casos «un clima que no se entiende…» y de `faltasDelReporte` | verde |
| 68 | Caso de la plantilla; T16 | verde |
| 69 | Caso de la plantilla (la máquina sin lecturas no entra); T24 (la IA las deja fuera) | verde |
| 70 | Casos de `reconocerVehiculo` | verde |
| 71 | Casos de `reconocerVehiculo` y `faltasDelReporte`; T21 (selector) | verde |
| 72 | T16: la observación de cada máquina | verde |
| 73 | Casos de `construirMaquina` y del contrato; T8 y T23 (selector) | verde |
| 74 | Caso de la plantilla; T16 («Catalina Chaparro») | verde |
| 75 | Casos de `reconocerPersona` y `faltasDelReporte`; T21 | verde |
| 76 | T23 (bitácora abierta); la cerrada del 2026-10-04 conserva «PRUEBA Conductor T17» (consulta en T26) | verde |
| 77 | Caso «una máquina guardada antes del operador se lee igual» | verde |
| 78 | Caso de la plantilla; T16 | verde |
| 79 | Casos de `reconocerPersona` y `faltasDelReporte`; T21 («Pedro Pérez») | verde |
| 80 | T16: observaciones de la persona | verde |
| 81 | Caso de la plantilla (ensayo con horas, responsable y ubicación); T16 | verde |
| 82 | Caso de la plantilla; T17 | verde |
| 83 | Casos de `faltasDelReporte` (viaje sin hora) | verde |
| 84 | Tabla de permisos (`whatsapp:aprobar`); T17: los viajes se aprueban desde la bandeja | verde |
| 85 | Caso «aprobar viajes desde la bandeja no le da Control Cantera al residente»; como residente (T26): `POST /api/panel/cantera/viajes` → 403 «…lo hacen la gerencia y el encargado de planta.» | verde |
| 86 | Casos de `faltasDelReporte` (metros 170) | verde |
| 87 | Casos «la propuesta de la plantilla…» («2 viajes» son dos) y «no pasa de 30» | verde |
| 88 | Casos de `fusionarReporteEnParte`; T22 (Natalia reemplazada) | verde |
| 89 | Caso de `avisoDeReemplazo`; T22 (aviso en pantalla) | verde |
| 90 | Caso de `estadoInicialDeCategoria`; T11 | verde |
| 91 | Caso «sin operador escrito no es una falta»; cierre sin cambios | verde |
| 92 | Caso de la fusión (todo el clima); T22 («Lloviendo») | verde |
| 93 | Caso de la fusión (suma); T16 (la nota del incidente se sumó) | verde |
| 94 | Casos de `conductorDelViaje`; T17 | verde |
| 95 | Casos de `faltasDelReporte`; T21 («Elija el conductor.») | verde |

### Aprobar solo los viajes (RF-96 a RF-98)

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| 96 | T17 (API) y T22 (botón con la bitácora cerrada) | verde |
| 97 | T17 y T22: queda pendiente con «Viajes ya registrados» | verde |
| 98 | T17: anulada y reabierta la bitácora, el resto se aprobó sin repetir el viaje | verde |

### La cantidad de una actividad (RF-99 a RF-103)

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| 99 | Caso «la cantidad escrita gana al cálculo»; T27 (312 en la bitácora) | verde |
| 100 | Caso «sin cantidad escrita, la cantidad sale de la medida»; T27 (la 4.3.8 en 240) | verde |
| 101 | T27: «Del volumen: 240» y «Calculada: 240» en la pantalla | verde |
| 102 | T27: el reporte «312 m³» aprobado deja 312 | verde |
| 103 | Por construcción: nada recalcula una bitácora cerrada o anulada | verde |

## Alcance

- **Nada fuera de la spec.** Lo añadido sobre el plan se hizo por un RF y quedó anotado:
  `obra_decidida_id` (RF-13), `partes_de_obra` en los disparadores (paso 6 del plan), el filtro
  estricto de obra (RF-11), las extensiones de archivo en `almacen.ts` (RF-7), la variable opcional
  en `compose.yaml` (RF-2), y las secciones del cambio de cantidad (RF-99 a RF-103, aprobado).
- **Lo de «Fuera de alcance» sigue fuera:** no se escribe en WhatsApp; la IA no crea nada sin
  aprobación; los ensayos no van al módulo de Laboratorio; no hay módulo de incidentes; voz y video
  se guardan sin analizar; no se configura la integración desde el panel; no se registran
  personas del grupo; la app del celular no cambió; la bitácora no se cierra sola; no hay informes
  ni menú lateral.

## Constitución

1. Local-first: sin cambios en el celular ni en la sincronización.
2. La spec manda: dos huecos de comportamiento se resolvieron con el usuario y entraron a la spec
   antes del código (conductor RF-94/95, solo viajes RF-96/98, cantidad RF-99/103).
3. Una regla, un solo sitio: `rules/whatsapp.ts` (puro) y `secciones.ts` compartido.
4. Nada se borra: bajas y descartes son estados; bitácoras cerradas, intactas (se anulan con motivo).
5. Puerta de calidad: en verde, con casos nuevos por cada regla.
6. Fronteras: tercera guardia separada; secretos solo en el servidor (comprobado con el `grep`);
   el bucket sigue privado (R2 sin firma → 400).
7. Español y tokens del tema (el color de las faltas sale de `Estado`).
8. Sin dependencias nuevas.

## Demo de residente (2026-10-06)

Con la sesión de Natalia Riaño (residente de «Pruebas spec 018»), en el panel de desarrollo: el
menú le muestra «Reportes de WhatsApp» y no Obras ni Personas; su bandeja trae solo su obra (3
pendientes, 10 aprobados, 2 descartados); pedir la de «Consorcio Antioquia» le devuelve la suya;
el reporte del grupo sin obra → 404; grupos → 403; viaje a mano → 403; foto de su obra → 200;
foto del grupo sin obra → 404.

## Defectos encontrados fuera de esta spec

- `/api/panel/media/[id]`: las fotos de la bitácora diaria (`dueno_tipo = 'bitacora'`) se buscan en
  la tabla vieja `bitacoras`; al no encontrarlas, cualquier residente con obra podría verlas si
  conociera su id. Pide su propio cambio.
- Un cuerpo que no es JSON responde 500 en todas las rutas (`cuerpoJson` lanza `SyntaxError` y
  `responder` no lo traduce).

## Veredicto

**Sí: la spec 021 está cumplida.** Los 103 RF en verde, los tres comandos en verde y sin fugas de
secretos. Lo que queda es de despliegue (fase 5): migrar producción (`0018`, `0019` y los
disparadores) con `scripts/migrar-produccion.ts`, emitir un token nuevo para el VPS y apuntar la
entrega de n8n a la dirección del panel en el VPS.
