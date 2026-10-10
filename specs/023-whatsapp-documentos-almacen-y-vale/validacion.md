# Validación — Spec 023, WhatsApp: documentos, almacén y número de vale

> Fecha: 2026-10-07 · Fase 7 del flujo SDD (tarea T22)

Recorrido RF por RF. Cada fila dice **con qué se comprobó**: un caso de
`scripts/verificar-reglas.ts` (por su nombre), una prueba en vivo (con la tarea en que se hizo;
el detalle está en las notas de `tareas.md`), o la razón por la que se cumple **por
construcción**, dicho así. Lo que no se ejecutó no se da por verificado.

## Lo que se ejecutó

| Comando | Resultado |
| --- | --- |
| `npm run verificar` | **402 verificaciones correctas** (35 nuevas de esta spec) |
| `npm run typecheck` | sin errores |
| `npm run lint` | sin hallazgos |
| `npx expo export --platform web` + `grep` de `DATABASE_URL`, `TOKEN_INTEGRACION_WHATSAPP`, `R2_LLAVE_SECRETA` y `SECRETO_TOKENS` en `dist/client` | exporta; **sin coincidencias** |
| `node scripts/probar_lector.js` (repo de n8n) | el Excel real: 7 hojas, 37 personas, «07:30» y «6:00Pm»; el Word con su tabla; los dos ilegibles con su motivo |

**Despliegue (T21):** migración `0020` aplicada en `neondb` (desarrollo) y en `preoperaocc`
(producción); imagen nueva del panel en el VPS, sana, con `preoperaocc:anterior` de respaldo;
n8n del VPS con `NODE_FUNCTION_ALLOW_BUILTIN=zlib` y el flujo de clasificación nuevo publicado.
El Excel del 5 de octubre y el Word de SST se reclasificaron en producción y quedaron
pendientes en la bandeja: el Excel como reporte diario del 2026-10-05 con 37 personas.

## RF por RF

### Leer los archivos adjuntos (RF-1 a RF-10)

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| 1 | T19: la foto de un vale, clasificada con la IA, leyó número, placa, material y hora. La rama de las fotos no cambió | verde |
| 2 | La rama del PDF no cambió (021): sigue mandándose como `document` en base64. No se reprobó con un PDF en esta spec | verde (sin cambios) |
| 3 | T17 (`probar_lector.js`: las 7 hojas visibles); T19 y producción: la IA tomó las 37 personas de las 7 hojas | verde |
| 4 | T17: cada hoja con «=== Hoja: NOMBRE ===»; T19: la IA puso la hoja de cada persona | verde |
| 5 | T17: «07:30» (hora guardada como número) y «6:00Pm» (texto) salen como se ven | verde |
| 6 | T17: el Word de prueba con su párrafo y su tabla; T19 y producción: la IA resumió el Word de SST con su contenido | verde |
| 7 | T17: `.xls` antiguo y archivo que no es ZIP devuelven el motivo sin lanzar; T19: la IA lo marcó para revisión con el motivo | verde |
| 8 | T22: un Excel de 12 hojas de 1.500 filas se recorta por hojas completas y dice «[ARCHIVO RECORTADO: se leyeron 4 de 12 hojas]» | verde |
| 9 | Por construcción: la entrega de archivos (`PUT …/archivo`, 021/RF-7) y su vista en la bandeja no cambiaron; el Excel de producción sigue guardado y la IA lo leyó de ahí | verde (sin cambios) |
| 10 | T19: el Excel se propuso como `reporte_diario` y la bandeja de desarrollo lo resolvió con el mismo `resolverPropuesta` y las mismas faltas | verde |

### El reporte de personal en Excel (RF-11 a RF-17)

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| 11 | T19 y producción: el formato de horas extras → `reporte_diario` con la sección de personal llena | verde |
| 12 | T19 y producción: fecha 2026-10-05, la del archivo, aunque el mensaje es del 6 o el 7 | verde |
| 13 | T19: las 37 personas de las 7 hojas en una sola propuesta | verde |
| 14 | T22: con Yobani en dos hojas, la IA lo puso una vez y lo dijo en el motivo | verde |
| 15 | T22: con la hoja INGENIEROS en el día 06, la IA marcó revisión y dijo qué hoja no coincide | verde |
| 16 | Las reglas del personal son las de la 021 (casos «la persona se reconoce…», «el segundo reporte reemplaza persona…»); T19: la bandeja reconoció a las registradas y dejó las demás con su falta | verde |
| 17 | T18/T19: el esquema no tiene columnas de horas extra y la instrucción las excluye; las propuestas no las traen | verde |

### Registrar desde la bandeja a las personas que no existen (RF-57 a RF-68)

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| 57 | Caso «solo se registra a la persona de un renglón que existe y está sin elegir»; T13 (`curl`) y T15 (Chrome) | verde |
| 58 | T13: como residente (Natalia Riaño) → 201; como almacenista → 403 | verde |
| 59 | T13: la residente en `POST /api/panel/personas` → 403 | verde |
| 60 | Caso «el pedido de registrar personas exige nombre…»; T15: el nombre propuesto con lo del reporte | verde |
| 61 | Mismo caso (cargo nulo = sin definir; cargo inexistente rechazado); T15: «Sin definir» | verde |
| 62 | Caso «la hoja del archivo propone el cargo…»; T15: Conductor, Operador y Sin definir según la hoja | verde |
| 63 | T13 y T15: en la base, en la obra del mensaje | verde |
| 64 | Caso «la persona registrada desde la bandeja recibe un usuario interno válido»; T13: rol operador y sin `credenciales_web` | verde |
| 65 | Caso «una persona nueva muestra antes las registradas con dos palabras en común»; T10 (`curl`) y T15 («Es Natalia Riaño (Residente 2)») | verde |
| 66 | T15: «Registrar todas las no reconocidas (3)» excluyendo a una → 2 registradas | verde |
| 67 | T22: se descartó PRUEBA-023-T15-1 y las 3 personas registradas desde él siguen | verde |
| 68 | T13 y T15: `registrado_por` y `mensaje_whatsapp_id` en cada una | verde |

### El reporte de almacén (RF-18 a RF-40)

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| 18 | Caso «un reporte de almacén es su propia categoría…»; T19: la IA lo clasificó `reporte_almacen`; T14: la bandeja lo muestra como «Reporte de almacén» | verde |
| 19 | Caso «el reporte de almacén se lee en ingresos y salidas…»; T19 | verde |
| 20 | Mismo caso y T19 (con «recibido por» y «para qué») | verde |
| 21 | Mismo caso: la fecha del encabezado y, sin ella, la del mensaje | verde |
| 22 | T11: aprobado como gerencia y como residente | verde |
| 23 | T11: la residente en `POST /api/panel/almacen/movimientos` → 403 | verde |
| 24 | T12: el almacenista en la bandeja → 403 | verde |
| 25 | T22: con el Almacén apagado en la obra, la aprobación → 400 «Esta obra no lleva Almacén…» y el detalle dice `almacenActivo: false` (el módulo se volvió a encender) | verde |
| 26 | Casos de `resolverPropuesta` (solo el nombre igual) y de faltas; T10: reconocido sin tildes ni mayúsculas | verde |
| 27 | Caso «las faltas del almacén salen todas a la vez…» (renglón sin elegir); T14 | verde |
| 28 | T14 (Chrome): material nuevo con «Otro» y su unidad; T11: creado al aprobar | verde |
| 29 | Mismo caso (nombre nuevo que ya existe); T11: el índice único lo frena dentro del lote | verde |
| 30 | Casos de `unidadDeTexto` y de faltas (unidad distinta y no reconocida) | verde |
| 31 | Caso de faltas (ingreso sin quién entregó) | verde |
| 32 | Caso de faltas (salida sin quién recibió ni para qué) | verde |
| 33 | Casos de `saldoDelReporte` y de faltas; T11 (400 con «No alcanza…»); T14 (en su renglón) | verde |
| 34 | Mismos casos: el ingreso del mismo día cuenta, el de un día posterior no; T14 | verde |
| 35 | T11: la guarda en SQL, llamada sin la regla, deshizo el lote entero (sin material nuevo ni movimientos); el reintento no duplica | verde |
| 36 | Caso «un reporte de almacén con fecha futura dice la fecha una sola vez» | verde |
| 37 | T11 y T14: `registrado_por` = quien aprobó, `mensaje_whatsapp_id` = el mensaje | verde |
| 38 | T12: «Desde WhatsApp» en el historial (Chrome) y `desdeWhatsapp` en la ruta | verde |
| 39 | T12: cuentan en el stock y salen en el Excel. Que solo la gerencia los anule es la ruta de anulación de la 009, que no cambió (casos de permisos de la 009) | verde |
| 40 | T11 y T14: el mensaje queda aprobado sin `parte_id` y no se abre bitácora | verde |

### El número de vale (RF-41 a RF-56)

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| 41 | T3 (`curl`) y T4 (Chrome) | verde |
| 42 | T3 y T4: viaje sin vale | verde |
| 43 | Caso «el número de vale se guarda como se escribe…»; T3: «  F-0458 » → «F-0458» | verde |
| 44 | Mismo caso: solo espacios es sin vale | verde |
| 55 | Caso «un vale de más de 30 caracteres se rechaza en su campo»; T3: 400 en `vale`; T1: el `check` de la base | verde |
| 45 | Caso «un vale repetido en la obra se avisa…»; T3 (409), T4 («Guardar igual»), T10 y T16 (aviso en la bandeja, sin bloquear) | verde |
| 56 | Mismo caso: «f-0458» = «F-0458» y «F-0458» ≠ «F0458» | verde |
| 46 | T4: el vale bajo la volqueta en el listado (cambio frente al plan, por el ancho: ver `tareas.md`) | verde |
| 47 | T5: el vale en la sección Control Cantera de la bitácora abierta | verde |
| 48 | T5: fijado al cerrar con la misma función del cierre, y la bitácora cerrada lo sigue mostrando | verde |
| 49 | Por construcción: `vale` es opcional en lo fijado y nulo en lo viejo; se pinta igual que `vale: null`, que sí se vio (T5). En desarrollo no hay una bitácora con viajes fijados de antes | verde (por construcción) |
| 50 | Casos de `resolverPropuesta` (vale de un viaje; vacío en «2 viajes»); T19: la IA leyó «F-0477» de la foto; T16: aprobado con su vale | verde |
| 51 | T16: el vale se corrigió en la bandeja y llegó así a Control Cantera | verde |
| 52 | Por construcción: no hay ruta para modificar un viaje; solo registrar y anular (010/RF-23) | verde (por construcción) |

### Reglas transversales (RF-53, RF-54)

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| 53 | La aprobación usa `faltasDelReporte` con `validarMovimiento`, `rechazoDeSalida` y `validarViaje` (casos de T6 y T8) | verde |
| 54 | Por construcción: los movimientos y materiales solo se escriben en `aprobarReporteDeAlmacen`, tras la aprobación de una persona (T11) | verde |

## Requisitos no funcionales

| Requisito | Qué lo cubre | Resultado |
| --- | --- | --- |
| Interfaz y mensajes en español | Revisión de los textos nuevos | verde |
| Un Excel de 10 hojas de 500 filas se lee completo | T22: **con el límite de 150 000 caracteres no cabía** (solo 4 hojas). Se subió a 400 000 y se desplegó en el VPS: ahora las 10 hojas, sin recorte | verde (tras corregirlo) |
| Un reporte de almacén de 30 renglones se revisa y aprueba sin salir de la propuesta | La sección Almacén está en la misma propuesta (T14), pero **no se probó con 30 renglones** | pendiente de demo manual: entregar un reporte de 30 renglones y revisarlo en el panel |
| Ningún archivo de WhatsApp es público | La ruta de los archivos (`/api/panel/media/[id]`) no cambió; `expo export` sin secretos | verde |

## Alcance

- **Nada fuera de la spec**, salvo dos ajustes hechos al probar y anotados en `tareas.md`: el
  vale va debajo de la volqueta y no en columna propia (el ancho, T4), y la bandeja ya no calcula
  faltas en lo decidido (T14: mostraba una falta falsa en un reporte aprobado).
- **Lo que quedó fuera sigue fuera:** no se leen notas de voz, videos ni archivos antiguos; las
  horas extra no se llevan a ningún módulo; el almacenista no ve la bandeja ni aprueba; el
  residente no registra ingresos, salidas ni personas a mano; no se busca por vale; no se completa
  el vale de los viajes viejos.

## Constitución

1. Local-first: el celular no se tocó.
2. La spec manda: los dos ajustes de arriba no cambian comportamiento acordado.
3. Una regla, un sitio: `unidadDeTexto`, `saldoDelReporte`, las reglas del vale, `cargoDeHoja`,
   `posiblesCoincidencias`, `usuarioDeLaBandeja` y `rechazoDeRegistro` en `src/shared/rules/`,
   puras y con sus casos.
4. Nada se borra: descartar deja a las personas; los movimientos y viajes se anulan, no se
   borran; las columnas nuevas son aditivas.
5. Puerta de calidad: los tres comandos en verde en cada tarea (en T4 se detectó y corrigió un
   fallo que un filtro de la salida había escondido).
6. Fronteras: la ruta nueva usa la guardia del panel; sin secretos en el cliente.
7. Español y tokens del tema.
8. Sin dependencias nuevas: el lector usa solo `zlib`, que ya trae Node.

## Veredicto

**Sí: la spec 023 está cumplida.** Los 68 RF en verde (tres por construcción, dicho en su
fila), los tres comandos en verde, sin fugas de secretos, y desplegada en producción. Queda
**una demo manual** de un requisito no funcional (el reporte de almacén de 30 renglones) y lo que
es operación, no código: que el residente apruebe en producción el Excel del 5 de octubre
—registrando a las personas que falten— y que OCC reparta en el grupo las plantillas del reporte
diario (versión 3) y del almacén.
