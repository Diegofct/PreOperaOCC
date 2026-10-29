# Validación — Spec 033, Grupo empresarial: tarjetas y menú por empresa

> Fecha: 2026-10-29 · Tarea T22

Recorrido RF por RF. Cada fila dice **con qué se comprobó**:
- un caso de `scripts/verificar-reglas.ts` (los de esta spec llevan «033/», con su línea);
- una prueba en vivo, con la tarea en que se hizo (el detalle está en las notas de `tareas.md`);
- o, cuando se cumple **por construcción**, la razón, dicha así.

Lo que no se ejecutó no se da por verificado.

## Lo que se ejecutó

| Comando | Resultado |
| --- | --- |
| `npm run verificar` | **609 verificaciones correctas** (25 pruebas de la 033: líneas 11093 a 11612) |
| `npm run typecheck` | sin errores (código de salida 0) |
| `npm run lint` | sin hallazgos (código de salida 0) |

Corridos el 2026-10-29, después de los tres arreglos de la demo (abajo).

**Desarrollo** (`neondb`; migraciones `0031` y `0032` aplicadas **solo aquí**):
- **T5 a T9:** las rutas contra el dev server con sesiones temporales de Diego (gerencia) y Tatiana Carreño (residente): 11, 29, 15 y las de maquinaria y WhatsApp, todas en verde; el asistente con la IA de verdad.
- **T10 a T21 y T24:** en Chrome con la sesión de gerencia, cada página en un marco de 1280 px. Capturas en `capturas/`.
- **T22, demo con los roles que no son gerencia:** en Chrome, en `127.0.0.1:8081` —que el navegador guarda aparte de `localhost:8081`, sin tocar la sesión del usuario—, con sesiones temporales de Tatiana Carreño (residente), Catalina Chaparro (laboratorista), el almacenista y la encargada de planta de dev, un residente PRUEBA-033 sin obra y gerencia. Cada dirección se abrió en un marco del mismo origen y se leyó a dónde llegó, su título y lo que muestra.
- **Pantallas pendientes:** `grep` de `PantallaPendiente` y `pendiente(` en `src/`: ninguna (se quitaron en la T18). Lo que llega con otras specs muestra «Este módulo está en construcción» (`PantallaEnConstruccion`, T24).
- **Limpieza acotada:** cada tarea borró lo suyo (cortes, contrato y bitácora PRUEBA-033, la persona de la T20, las sesiones). Al cierre: 0 personas PRUEBA-033, 0 cortes, 0 contratos PRUEBA-033, las cuatro empresas sin datos ni `actualizado_por`, y ninguna sesión de la demo abierta.

**Producción:** sin tocar. La T23 sube la 032 y la 033 —con la 034 y la 035, migraciones 0031 a 0034 en orden antes de la imagen— cuando el usuario lo pida. **Ojo, RF-53:** mientras queden módulos «en construcción» de specs sin terminar (036 Compras, 037 Tesorería, 038), la 033 no se despliega sola.

## Arreglos que salieron de la demo (T22)

- **RF-52, el destino según el rol:** a la residente, `/panel/occ/empresa` y `/panel/proyectos/<su obra>/finanzas` la llevaban a Tesorería de Elemental, donde veía «Sin acceso»; la spec dice «o al inicio del rol». Regla nueva `rutaRenombradaPara(lugar, persona)`: si la página nueva es de una empresa a la que el rol no entra, al Inicio de su rol. Vuelto a ver: las dos llevan a «Su obra hoy». Casos en la prueba de RF-52 (11191).
- **RF-47, Personas de antes:** `/panel/personas` llevaba a la residente a Recursos Humanos de Elemental («Sin acceso»). Ahora `rutaNueva` manda a quien no entra a Elemental a Recursos Humanos de lo suyo —el Encargado a OCC, el laboratorista a Geolab, el residente a su obra— y, si no lo tiene, a su Inicio; Obras de antes, al Inicio. Vuelto a ver: la residente llega a «Recursos Humanos · Proyectos» de su obra. Casos en la prueba de RF-47 (11332).
- **RF-12, el menú donde no se entra:** en OCC, Geolab, Elemental o una obra ajena, la residente veía «No tienes acceso a esta sección» pero con el menú de ese lugar al lado, cuyas entradas llevaban a otro «Sin acceso». `menuDelLugar` acepta ahora la persona y deja el menú vacío donde no entra. Vuelto a ver: en OCC y en otra obra, solo el aviso; gerencia conserva su menú. Casos en la prueba del menú lateral (11535).

## RF por RF

### Inicio y tarjetas

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-1 | «033/RF-1» (11093). T12 y T22: gerencia ve las cuatro tarjetas en orden | verde |
| RF-2 | «033/RF-2, RF-3» (11482). T12: OCC «Saldo al 25-oct-2026 $ 1.534.500.000» y Proyectos «Saldo de las obras al 20-oct-2026 −$ 45.000.000» con cortes de prueba (captura `t12-tarjetas.jpg`) | verde |
| RF-3 | 11482. T12 y T22: sin cortes, «Sin información financiera» en las cuatro | verde |
| RF-4 | T12 y T22: «3 obras activas» en Proyectos | verde |
| RF-5 | T12: pulsar OCC abre OCC. T22: `/panel/occ` abre su primera página, «Reportes de WhatsApp · OCC» | verde |
| RF-6 | «033/RF-6 a RF-9» (11318). T22: la residente entra a la portada de su obra, «Su obra hoy» (captura `t22-residente-su-obra.jpg`) | verde |
| RF-7 | 11318: con varias obras o sin ninguna, la lista de Proyectos. T22: el residente PRUEBA-033 sin obra ve «No tienes obras asignadas; pide acceso a gerencia.». **Varias obras:** el residente tiene hoy una sola obra (`usuarios.obra_id`; decisión del 2026-10-27), así que solo lo cubre la regla | verde |
| RF-8 | 11318. T22: la laboratorista entra a «Laboratorio · Geolab» | verde |
| RF-9 | 11318. T22: el almacenista entra a «Almacén · Proyectos» de su obra y la encargada de planta a «Control Cantera · Proyectos» | verde |

### Navegación y menús

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-10 | «033/RF-10, RF-19» (11517) y «033/RF-10, RF-11, RF-18, RF-20» (11535). T11: cabecera «OCC» y «PROYECTOS / <obra>». T22: la residente ve «PROYECTOS / Consorcio Antioquia» | verde |
| RF-11 | 11535. T11 y T22: gerencia tiene «← Empresas» en cada empresa; la residente, el almacenista y la laboratorista no | verde |
| RF-12 | «033/RF-12» (11285). T22: la residente en OCC, Geolab, Elemental y otra obra, la laboratorista en OCC, Proyectos y una obra, el almacenista en OCC → «No tienes acceso a esta sección», sin datos y, después del arreglo, sin menú | verde |
| RF-13 | «033/RF-13 a RF-15, RF-29» (11103). T24: el menú de Elemental visto en Chrome. La 035 le cambió las pestañas de RR. HH. a «Personal · Personas y accesos · Obras» | verde |
| RF-14 | 11103. T24: el menú de OCC visto en Chrome; la 034 y la 035 le sumaron Documentos y Recursos Humanos | verde |
| RF-15 | 11103. T24: el menú de Geolab visto en Chrome | verde |
| RF-16 | T16: lista de obras con consorcio, municipio y estado (captura `t16-proyectos.jpg`). T22: la residente ve «Su obra: Consorcio Antioquia» | verde |
| RF-17 | «033/RF-17, RF-18» (11126). T21 y T24: el menú de la obra, con Preoperacionales y Asignaciones (cambio a RF-17). T22: el de la residente | verde |
| RF-18 | 11126. T11: CONSORCIO SANTANDER sin Almacén, Cantera ni Laboratorio, y su `/almacen` → «Sin acceso». T24: Consorcio Antioquia sin Calidad | verde |
| RF-19 | 11517. T17: dentro de una obra, nueve pantallas sin selector de obra ni datos de otra | verde |
| RF-20 | 11535. T11: «Cambiar de obra» dentro de una obra, para gerencia | verde |
| RF-21 | «033/RF-21, RF-32, RF-44» (11243): el menú sale de la tabla de permisos; T21: todo lo que el residente veía antes sigue en algún menú suyo | verde |

### Lo de cada empresa

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-22 | T8 (API) y T18 (Chrome): la maquinaria de todas las obras con filtro de obra y fechas (captura `t18-bitacora-de-maquinaria.jpg`) | verde |
| RF-23 | «033/RF-23, RF-24» (11500). T8: 28 de 130 mensajes, las dos categorías. T18: solo «Suministro o cantera» y «Vehículo o maquinaria» | verde |
| RF-24 | 11500. T17: Reportes de WhatsApp de la obra no muestra nada de otras | verde |
| RF-25 | «033/RF-25, RF-27» (11612). T18: Reportes de OCC solo Máquinas y Mantenimiento, de todas las obras | verde |
| RF-26 | T19: Laboratorio de Geolab con «Todas las obras» y el filtro (por la API: todas 5, la obra 018 5, SANTANDER 0) | verde |
| RF-27 | 11612. T19: «Control de calidad» por obra y periodo (semana 2, mes 3) | verde |
| RF-28 | T7 (API), T18 y T19 (Chrome). Cambio de la T24: Personas de todo el grupo en RR. HH. de Elemental; la 035 lo amplió con el listado del personal. T22: la residente en RR. HH. de su obra | verde |
| RF-29 | 11103. T24: el asistente en los cuatro menús | verde |
| RF-30 | «033/RF-30» (11508). T9: con la IA de verdad, la respuesta fue sobre la obra desde la que se preguntó; obra ajena → 404 | verde |

### Información de la empresa y financiera

> Cambio del 2026-10-27 (T24): Información de la empresa y de la obra, Información financiera y el Consolidado salieron del menú. Los cortes se registrarán desde Tesorería de Elemental (spec 037) y siguen alimentando las tarjetas.

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-31 | Tabla `empresas` (T4). T5 (API) y T13 (Chrome): se guardan los siete datos | verde, **sin pantalla** desde la T24 |
| RF-32 | 11243. T5: residente → 403 | verde, **sin pantalla** desde la T24 |
| RF-33 | T13: Información de la obra con su contrato (captura `t13-informacion-de-la-obra.jpg`) | verde en su día; **sin pantalla** desde la T24 |
| RF-34 | «033/RF-34» (11594). T6 (API) y T14 (Chrome): registrar un corte de empresa y de obra; Proyectos rechazado | verde; la pantalla vuelve con la 037 |
| RF-35 | «033/RF-35, RF-36» (11403). T6: fecha futura → 400 | verde |
| RF-36 | 11403. T6 y T14: «Ya hay un corte del 25-oct-2026; anúlalo para registrar otro» | verde |
| RF-37 | «033/RF-37, RF-38» (11428). T14: último arriba e historial (captura `t14-historial-con-anulado.jpg`) | verde en su día; pantalla con la 037 |
| RF-38 | 11428 y «033/RF-38» (11606). T14: «+$ 500.000 frente al 20-oct-2026» | verde en su día; pantalla con la 037 |
| RF-39 | T6 y T14: sin motivo → 400; con motivo queda «Anulado por Diego: …» | verde |
| RF-40 | Por construcción: no hay ruta ni botón para editar un corte, solo anular. T6 | verde |
| RF-41 | «033/RF-41, RF-42» (11449). T15 (captura `t15-consolidado.jpg`) | verde en su día; **sin pantalla** desde la T24 |
| RF-42 | 11449. T15 | igual que RF-41 |
| RF-43 | «033/RF-43» (11443). T6 y T15: 37 días → «Desactualizado» | igual que RF-41 |
| RF-44 | 11243. T6: residente → 403 en las cuatro rutas de cortes; T5: la tarjeta lleva el saldo y pide `listar` | verde |

### Personas por empresa

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-45 | «033/RF-45, RF-46» (11306). T20: registrada en Geolab, aparece solo en Geolab; corregida a OCC (captura `t20-persona-en-geolab.jpg`) | verde |
| RF-46 | 11306. T7: todas las personas sin empresa salen con la de su rol (Elemental 1, OCC 52, Geolab 1, Proyectos 4) | verde |

### Reglas transversales y menús definitivos

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-47 | «033/RF-47» (11332). T10 y T16: las direcciones de antes en Chrome. T22: `/panel/bitacoras` lleva a la residente a las bitácoras de su obra y, después del arreglo, `/panel/personas` a RR. HH. de su obra | verde |
| RF-48 | «033/RF-48» (11580). T11 y T22: «Vehículos · OCC», «Laboratorio · Geolab», «Almacén · Proyectos», «Recursos Humanos · Proyectos» | verde |
| RF-49 | «033/RF-49» (11142). T24: abre LicitApp en una pestaña nueva (visto, después del arreglo de `Linking.openURL`) | verde |
| RF-50 | 11103. T24: el asistente en el menú de Elemental, OCC, Geolab y la obra; T22: en el de la residente, el almacenista y la encargada de planta | verde |
| RF-51 | «033/RF-51» (11161). T22: la residente y el almacenista ven Solicitudes de compra y de pago en su obra; el almacenista en OCC no (sin acceso) | verde |
| RF-52 | «033/RF-52» (11191). T24: gerencia llega a Tesorería. T22: la residente, después del arreglo, a su Inicio; la laboratorista, `/panel/geolab/finanzas` → «Laboratorio · Geolab» | verde |
| RF-53 | Por construcción: Producción sin tocar; la T23 queda esperando a las specs 036 a 038 | verde (sin desplegar) |

## Requisitos no funcionales

| Requisito | Qué lo cubre | Resultado |
| --- | --- | --- |
| Español y tema claro; tarjetas en una columna a 390 px y en dos o cuatro en ventana ancha | T12: 4 columnas a 1536 y 1280 px, 2 a 900, 1 a 390, sin desplazamiento horizontal | verde |
| Pesos con punto de miles | «033/RNF» (11494): `$ 1.234.567` | verde |

## Casos límite

| Caso | Qué lo cubre | Resultado |
| --- | --- | --- |
| Primer arranque | T5 y T22: empresas sin datos y «Sin información financiera» | verde |
| Residente sin obra | T22: «No tienes obras asignadas; pide acceso a gerencia.» | verde |
| Obra dada de baja | T3, en la regla del consolidado: sale solo si tiene corte; no sale en la lista de Proyectos (consulta sin las de baja) | verde, por la regla |
| Enlaces viejos | RF-47 y RF-52 | verde |
| Corte registrado no se edita | RF-40 | verde |

## Para el usuario

- Quedan en dev **datos de prueba de specs anteriores**, que esta spec no creó y no se tocaron: 3 grupos de WhatsApp de la spec 021 (`prueba-t11@g.us`, `prueba-t19@g.us`, `prueba-t24@g.us`) con 115 mensajes, y 5 vehículos `PRUEBA-…` (septiembre y spec 026). La nota de la T24 de esta spec los apuntó para la T22, pero tienen registros colgados: se borran solo si el usuario lo pide, revisando antes qué cuelga de ellos.
- La T23 (producción) espera: RF-53.
