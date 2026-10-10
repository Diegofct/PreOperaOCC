# Spec 025 — Horas reportadas del personal, ensayos más flexibles y listados por fecha y por páginas

> Estado: **Cumplida** (2026-10-09) · Aprobada (2026-10-09) · Fecha: 2026-10-09 · Cambia las specs 004 (personal y Control Calidad de Obra
> de la bitácora), 016 (horas del personal), 021/024 (lectura del reporte de WhatsApp) y 005 (tamaño
> de página de los listados)

## Contexto y objetivo

El 8-oct Catalina Chaparro mandó al grupo de la obra el reporte diario completo. El sistema guardó
el clima, las actividades, los vehículos y las notas, pero **no guardó el personal ni el Control
Calidad de Obra**: los dos quedaron en «No se pudo guardar». El personal no se guardó porque la obra
ya no reporta la hora de entrada y de salida de cada persona, sino sus **horas laboradas** y sus
**horas extra diurnas y nocturnas** («L: 13 Hrs. ED: 3 Hrs. EN: 1 Hrs.»), y la bitácora solo sabe
guardar entrada y salida; tampoco tenía dónde anotar a una persona **incapacitada**. Los ensayos no se
guardaron porque traían una sola hora, porque la ubicación era un tramo («Pr 0+70 al Pr 0+150») con
metros que no van de 25 en 25, y porque el nombre («Compresión de probetas de suelo cemento con 4 %»)
no era exactamente el de la lista de OCC. Esta spec hace que la bitácora guarde las horas tal como la
obra las reporta y acepte los ensayos como de verdad se reportan, para que el reporte diario quede
completo sin que nadie tenga que pasarlo a mano.

Además, gerencia pidió dos mejoras de consulta: **filtrar por fecha** en los Reportes de WhatsApp, y
que **todas las tablas de registros se vean de a 15 por página**, porque con 25 se hacen largas y
porque varias tablas hoy no paginan.

## Usuarios / actores

- **Quien reporta en el grupo** (tecnóloga de obra, laboratorio…): manda el reporte diario por
  WhatsApp con el personal en horas y los ensayos como los escribe hoy.
- **La integración** (n8n + IA): lee esas horas, novedades y ensayos.
- **El sistema**: los guarda en la bitácora del día, como en la 024.
- **Residente / director de obra** (panel web): consulta la bitácora con las horas reportadas, las
  escribe a mano cuando hace falta, y consulta los Reportes de WhatsApp por fecha.
- **Gerencia** (panel web): lo mismo, en todas las obras.
- **Operador** (móvil): no cambia nada para él.

## Historias de usuario

- H1: Como residente quiero que la bitácora guarde las horas laboradas, extra diurnas y extra
  nocturnas que la obra reporta, para tener ese registro sin pedir la hora de entrada y de salida.
- H2: Como residente quiero que una persona incapacitada o con permiso quede en la bitácora con su
  novedad, para que conste por qué no trabajó.
- H3: Como residente quiero que los ensayos del reporte se guarden aunque traigan una sola hora, un
  tramo o un nombre más largo, para que Control Calidad de Obra quede completo.
- H4: Como residente quiero ver la edad, el resultado y si cumple de cada ensayo en su propia casilla,
  para leerlos sin buscarlos dentro de la observación.
- H5: Como gerencia quiero filtrar los Reportes de WhatsApp por fecha, para encontrar lo de un día sin
  recorrer todo el historial.
- H6: Como usuario del panel quiero que las tablas de registros se vean de a 15 por página, para no
  recorrer listas largas.

## Requisitos funcionales (criterios de aceptación en EARS)

### Horas reportadas del personal (H1)

- RF-1: EL SISTEMA permitirá registrar, para cada persona de la bitácora, sus horas laboradas del día.
- RF-2: EL SISTEMA permitirá registrar, para cada persona de la bitácora, sus horas extra diurnas.
- RF-3: EL SISTEMA permitirá registrar, para cada persona de la bitácora, sus horas extra nocturnas.
- RF-4: EL SISTEMA aceptará esas tres cantidades con decimales de media hora en media hora (8, 8.5).
- RF-5: EL SISTEMA tratará las horas laboradas como el total del día, con las extras incluidas
  (L 13, ED 3, EN 1 = 13 horas, de ellas 3 extra diurnas y 1 extra nocturna).
- RF-6: EL SISTEMA dejará guardar a una persona que tenga horas laboradas aunque no tenga hora de
  entrada ni de salida.
- RF-7: EL SISTEMA dejará guardar a una persona que tenga hora de entrada y de salida aunque no tenga
  horas laboradas, con las reglas de la spec 016.
- RF-8: SI una persona no tiene hora de entrada y salida, ni horas laboradas, ni novedad, ENTONCES EL
  SISTEMA no la guardará y dirá «Escriba sus horas laboradas, su hora de entrada y salida, o su
  novedad».
- RF-9: SI las horas laboradas son más de 16, ENTONCES EL SISTEMA no las guardará y dirá «Son más de 16
  horas. Revise las horas».
- RF-10: SI las extra diurnas más las extra nocturnas suman más que las horas laboradas, ENTONCES EL
  SISTEMA no las guardará y dirá «Las horas extra no pueden ser más que las laboradas».
- RF-11: SI se escriben las extra diurnas o las extra nocturnas sin las horas laboradas, ENTONCES EL
  SISTEMA no las guardará y dirá «Escriba primero las horas laboradas».
- RF-12: CUANDO no se escriben las extra diurnas o las extra nocturnas de una persona con horas
  laboradas, EL SISTEMA las tomará como 0.
- RF-13: EL SISTEMA mostrará, junto a cada persona con horas laboradas, sus horas laboradas, sus extra
  diurnas y sus extra nocturnas tal como se registraron.
- RF-14: MIENTRAS una persona tenga horas laboradas, EL SISTEMA usará esas horas, y no el cálculo con
  el horario de la obra, en todo lo que muestre o sume de ella.
- RF-15: MIENTRAS una persona tenga solo hora de entrada y de salida, EL SISTEMA seguirá calculando sus
  horas con el horario de la obra (016/RF-20 a RF-25).
- RF-16: SI una persona tiene horas laboradas y también hora de entrada y de salida, y el cálculo con
  el horario de la obra no da las mismas horas, ENTONCES EL SISTEMA mostrará un aviso junto a ella
  sin impedir guardar ni cerrar.
- RF-17: EL SISTEMA sumará las horas laboradas y las extra reportadas en el resumen de horas de
  personal del Inicio, junto con las calculadas.

### Novedades del personal (H2)

- RF-18: EL SISTEMA permitirá marcar a una persona de la bitácora con una novedad: Incapacitado,
  Permiso, Vacaciones o Ausente.
- RF-19: EL SISTEMA dejará guardar a una persona con novedad sin horas.
- RF-20: SI una persona con novedad tiene horas laboradas o extra, ENTONCES EL SISTEMA las guardará y
  mostrará la novedad junto a ellas (un permiso de media jornada).
- RF-21: EL SISTEMA mostrará la novedad junto a la persona al consultar la bitácora.
- RF-22: EL SISTEMA contará como 0 horas a una persona con novedad y sin horas en el resumen del
  Inicio.

### El reporte de WhatsApp con horas y novedades (H1, H2)

- RF-23: CUANDO un reporte de WhatsApp traiga el personal en horas («L: 8 Hrs. ED: 0 Hrs. EN: 0
  Hrs.»), EL SISTEMA guardará en la bitácora sus horas laboradas, extra diurnas y extra nocturnas.
- RF-24: CUANDO un reporte de WhatsApp diga de una persona «Incapacitado», «Permiso», «Vacaciones» o
  «Ausente», EL SISTEMA la guardará en la bitácora con esa novedad.
- RF-25: CUANDO un reporte de WhatsApp agrupe al personal bajo títulos de cargo («Ingenieros»,
  «Conductores», «Operadores», «Oficios Varios»…), EL SISTEMA usará ese título como el cargo con que
  se crea una persona que no existe (024/RF-22), igual que la hoja del Excel de horas extra.
- RF-26: SI un renglón de personal del reporte no trae horas, ni entrada y salida, ni novedad,
  ENTONCES EL SISTEMA lo dejará en «No se pudo guardar» con el mensaje de RF-8.
- RF-27: EL SISTEMA permitirá completar en «No se pudo guardar» las horas laboradas, las extra y la
  novedad de un renglón de personal.
- RF-28: CUANDO un reporte de WhatsApp traiga hora de entrada y de salida sin horas laboradas, EL
  SISTEMA las guardará como hoy (021, 024).

### Control Calidad de Obra más flexible (H3, H4)

- RF-29: EL SISTEMA dejará guardar un ensayo con hora de inicio y sin hora de fin.
- RF-30: SI un ensayo tiene hora de fin, y no es posterior a la de inicio, ENTONCES EL SISTEMA no lo
  guardará y dirá «La hora de fin tiene que ser posterior a la de inicio» (como hoy).
- RF-31: EL SISTEMA permitirá ubicar un ensayo en un tramo, con PR y metros de inicio y PR y metros de
  fin.
- RF-32: EL SISTEMA aceptará en la ubicación de un ensayo cualquier número de metros entre 0 y 999, y
  no solo de 25 en 25.
- RF-33: EL SISTEMA aceptará un tramo cuyo fin sea una abscisa menor que el inicio, tal como se
  escribió («Pr 1+300 al Pr 1+170»).
- RF-34: EL SISTEMA permitirá registrar, para cada ensayo, su edad en días.
- RF-35: EL SISTEMA permitirá registrar, para cada ensayo, su resultado como número con su unidad
  (2.98 MPa, 98 %).
- RF-36: EL SISTEMA permitirá registrar, para cada ensayo, si cumple, si no cumple o si no se sabe.
- RF-37: EL SISTEMA mostrará la edad, el resultado con su unidad y si cumple en la fila de cada ensayo
  de la bitácora.
- RF-38: EL SISTEMA dejará guardar sin observación un ensayo que tenga resultado o diga si cumple.
- RF-39: SI un ensayo no tiene observación, ni resultado, ni dice si cumple, ENTONCES EL SISTEMA no lo
  guardará y dirá «Escriba la observación del ensayo. Si no hay nada que anotar, escriba «Sin
  observaciones»» (como hoy).
- RF-40: CUANDO un reporte de WhatsApp nombre un ensayo con más palabras que el de la lista de OCC
  («Compresión de probetas de suelo cemento con 4 %»), EL SISTEMA lo asociará al ensayo de la lista
  que corresponda (Compresión simple).
- RF-41: CUANDO un reporte de WhatsApp asocie un ensayo a uno de la lista, EL SISTEMA guardará el
  detalle que no cabe en el nombre (material, % de cemento) en la observación del ensayo.
- RF-42: CUANDO un reporte de WhatsApp traiga la edad, el resultado o si cumple de un ensayo, EL
  SISTEMA los guardará en sus casillas propias.
- RF-43: SI la ubicación de un ensayo del reporte no se puede leer como abscisa ni como tramo, ENTONCES
  EL SISTEMA la guardará como un lugar escrito, con el texto del reporte.
- RF-44: EL SISTEMA mostrará los ensayos guardados antes de esta spec tal como se guardaron, con la
  edad, el resultado y si cumple dentro de la observación.

### Filtro por fecha en Reportes de WhatsApp (H5)

- RF-45: EL SISTEMA permitirá filtrar el Historial de Reportes de WhatsApp por un rango de fechas
  «Desde» y «Hasta».
- RF-46: EL SISTEMA permitirá filtrar «No se pudo guardar» por un rango de fechas «Desde» y «Hasta».
- RF-47: EL SISTEMA permitirá filtrar «Creado automáticamente» por un rango de fechas «Desde» y
  «Hasta».
- RF-48: EL SISTEMA filtrará cada mensaje por el día del reporte (el día del hecho), y por el día en
  que se envió cuando el mensaje no tiene día del reporte.
- RF-49: CUANDO se abre una de esas pantallas sin fechas elegidas, EL SISTEMA mostrará los últimos 7
  días, hoy incluido.
- RF-50: SI «Hasta» es anterior a «Desde», ENTONCES EL SISTEMA no consultará y dirá «Tiene que ser
  igual o posterior a «Desde»».
- RF-51: SI el rango es de más de 366 días, ENTONCES EL SISTEMA no consultará y dirá que el rango
  máximo es de un año.
- RF-52: EL SISTEMA mostrará los mensajes del Historial del más nuevo al más viejo.
- RF-53: EL SISTEMA mostrará todos los mensajes del rango elegido, sin dejar fuera los más nuevos por
  un tope de cantidad.
- RF-54: EL SISTEMA conservará las fechas elegidas en la dirección de la página, para que al volver o
  compartir el enlace se vea el mismo rango.

### Tablas de registros de a 15 (H6)

- RF-55: EL SISTEMA mostrará 15 registros por página en cada tabla de registros del panel.
- RF-56: EL SISTEMA paginará las tablas de registros que hoy muestran todo en una sola lista: las de
  Reportes de WhatsApp (Historial, Grupos, Estado del día, No se pudo guardar y Creado
  automáticamente), los viajes y catálogos de Control Cantera, el historial de Almacén, Obras,
  Asignaciones, Llantas y Laboratorio.
- RF-57: CUANDO cambia un filtro o la búsqueda de una tabla, EL SISTEMA volverá a la página 1.
- RF-58: MIENTRAS una tabla tenga 15 registros o menos, EL SISTEMA no mostrará los controles de página.
- RF-59: EL SISTEMA no paginará las tablas de las secciones de una bitácora.

### Reglas transversales

- RF-60: EL SISTEMA mostrará las bitácoras cerradas o anuladas antes de esta spec tal como se
  guardaron, sin horas laboradas, novedades ni casillas nuevas de ensayo.
- RF-61: EL SISTEMA aplicará las mismas reglas de horas, novedades y ensayos a lo escrito a mano en la
  bitácora y a lo que llega por WhatsApp.

## Superficies afectadas

- [ ] **Móvil** — sin cambios: la bitácora y los Reportes de WhatsApp son del panel.
- [x] **Panel web** — sección Personal y Control Calidad de Obra de la bitácora (consulta y
  formulario); «No se pudo guardar»; Historial, «No se pudo guardar» y «Creado automáticamente» con
  filtro de fechas; todas las tablas de registros con páginas de 15; resumen de Inicio.
- [x] **API** — rutas del panel de la bitácora (personal y control de calidad), de Reportes de
  WhatsApp (historial, excepciones, creados) con rango de fechas, y del resumen de Inicio; la entrega
  de la integración acepta los campos nuevos de la IA.
- [ ] **Sincronización** — sin cambios.
- [x] **Datos** — las filas de personal y de ensayo de la bitácora llevan datos nuevos; las bitácoras
  existentes no cambian.
- [x] **Reglas** — validación de la persona del parte (horas, novedad), del ensayo (hora de fin,
  ubicación, observación), lectura de tramos y del nombre del ensayo, paginación; casos nuevos en
  `verificar-reglas.ts`.
- [x] **Integración (n8n)** — la IA lee horas, novedades, cargos, edad, resultado y cumple; plantilla
  del reporte v4.

## Requisitos no funcionales

- Idioma: español, con los mismos textos y unidades que la obra usa en el reporte (L, ED, EN; MPa, %).
- El Historial de WhatsApp de un rango de 31 días debe abrir en menos de 3 s con 1 000 mensajes en el
  rango.
- Las tablas con páginas siguen cumpliendo la prueba de anchos del panel (005/RF-20, 022/RF-27): esta
  spec no añade columnas a las tablas de listados.

## Casos límite

- **Sin señal**: no aplica; nada de esto vive en el móvil.
- **Evidencia firmada**: una bitácora cerrada no se edita (004). Las horas reportadas y las casillas
  nuevas solo se escriben en bitácoras abiertas. Las cerradas antes de esta spec se leen igual que
  hoy (RF-60). Lo que llegue por WhatsApp para una bitácora cerrada sigue la 024.
- **Primer arranque / equipo recién activado**: no aplica.
- **Persona que aparece dos veces en el reporte** (en dos cargos): sigue la regla de hoy (021): una
  sola vez por bitácora; el segundo renglón va a «No se pudo guardar».
- **«ED: 1» sin «Hrs.»** o **«EN: 0.»** con punto: se leen igual que «ED: 1 Hrs.».
- **Un renglón vacío al final de un cargo** («- » sin nombre): se ignora.
- **Una persona con horas en un reporte y entrada/salida en otro** del mismo día: el último guardado
  reemplaza los datos de esa persona (021/RF-92 y 024).
- **Medianoche**: las horas laboradas no tienen hora; un turno que cruza la medianoche se reporta con
  sus horas sin problema.
- **Un rango de fechas con miles de mensajes**: se ve por páginas de 15.

## Fuera de alcance

- Calcular la entrada y la salida a partir de las horas laboradas.
- Recalcular o corregir las extra reportadas con el horario de la obra (solo se avisa, RF-16).
- Convertir horas a dinero (004/RF-41 sigue en pie).
- Reportes de horas extra por persona y por mes para gerencia (spec futura de reportes).
- Paginar en el servidor: el filtro de fechas limita lo que se consulta; la paginación se hace en la
  pantalla.
- Filtro por fecha en otras pantallas que no sean de Reportes de WhatsApp (Cantera y Laboratorio ya lo
  tienen).
- El módulo de Laboratorio (granulometría): los ensayos del reporte siguen yendo a la bitácora.
- Más novedades que las cuatro de RF-18.
- Cambiar la app móvil.

## Criterios de finalización

- Cada RF tiene cómo comprobarse: los de reglas (RF-4 a RF-12, RF-16, RF-19, RF-29 a RF-33, RF-38 a
  RF-40, RF-43, RF-48 a RF-51, RF-55, RF-57, RF-58) con casos en `scripts/verificar-reglas.ts`; el
  resto con la demo.
- `npm run verificar`, `npm run typecheck` y `npm run lint` en verde.
- Demo manual: el texto real del reporte del 8-oct pasa por la IA y se guarda solo en la bitácora de
  prueba, con las 37 personas en horas, Vicente Arias incapacitado y los 4 ensayos de Compresión
  simple con edad, resultado y si cumple; «No se pudo guardar» no tiene nada de personal ni de
  ensayos de ese reporte. Luego, en producción, el reporte del 8-oct se reprocesa y la bitácora de ese
  día queda con el personal y los ensayos. En el panel, el Historial se filtra por fechas, sale del
  más nuevo al más viejo y todas las tablas de registros paginan de a 15.

## Dudas abiertas

Ninguna. Resueltas con el usuario el 2026-10-09: las horas se guardan como llegan; L es el total del
día con las extras incluidas; la entrada y la salida pasan a ser opcionales; la persona sin horas se
guarda con su novedad; en los ensayos se aflojan las reglas (hora de fin opcional, tramo o cualquier
abscisa, nombre asociado a la lista, edad, resultado y cumple en casillas propias). El filtro va por el
día del reporte y abre con los últimos 7 días (decisión técnica tomada al planificar, se puede
cambiar).
