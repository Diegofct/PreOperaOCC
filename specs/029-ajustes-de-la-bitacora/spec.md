# Spec 029: Ajustes de la bitácora (medidores, observaciones, personal y ensayos en Laboratorio)

> Estado: **Cumplida** el 2026-10-19 (ver `validacion.md`); aprobada el 2026-10-19 · Fecha: 2026-10-19
> Cambia:
> - la spec 004 (sección Personal con entrada y salida; observación obligatoria por máquina para cerrar);
> - la 025 (entrada y salida opcionales);
> - la 024 (armado de días).

## Contexto y objetivo

Gerencia revisó la bitácora con los reportes reales de la obra y pidió cinco ajustes:

1. **Medidores encadenados.** La lectura final de horómetro u odómetro de una máquina en un día es la inicial del día siguiente. Hoy cada día empieza vacío y hay que volver a escribirla, lo que abre la puerta a errores de digitación.
2. **Observaciones.** Las observaciones ocupan un recuadro grande de seis renglones en cada fila, aunque casi nunca hay nada que anotar. Gerencia quiere:
   - una casilla «¿Tienes alguna observación?»;
   - que el campo solo aparezca cuando hay algo que decir, más pequeño y alineado con los demás campos;
   - que quede explícito cuando no hay observación.
3. **Personal.** En la obra se reportan las horas laboradas, las extras y la novedad, no la hora de entrada y de salida. Esos dos campos sobran.
4. **Ensayos en Laboratorio.** Los ensayos que se anotan en «Control Calidad de Obra» deben poder consultarse también en el módulo de Laboratorio, sin buscarlos bitácora por bitácora.
5. **Día futuro.** El 19-oct, un mensaje que hablaba de un plan para el sábado 24 armó un día de WhatsApp con fecha futura. Un día que aún no ha pasado no debe armarse.

## Usuarios / actores

- **Residente / director de obra** (panel web, rol `supervisor`): llena y corrige la bitácora. Consulta los ensayos en Laboratorio.
- **Gerencia** (panel web, rol `admin`): lo mismo en todas las obras.
- **Laboratorista** (panel web): consulta los ensayos de obra en Laboratorio.
- **El sistema**: llena la bitácora desde los reportes de WhatsApp (spec 024).

## Historias de usuario

- H1: Como residente quiero que la lectura inicial de cada máquina se llene con la final del día anterior, para no volver a escribirla ni equivocarme.
- H2: Como residente quiero marcar si una fila tiene observación y, si no la tiene, que quede claro que no hay, para no llenar recuadros vacíos.
- H3: Como residente quiero reportar el personal solo con horas laboradas, extras y novedad, que es como lo reporta la obra.
- H4: Como gerencia o laboratorista quiero ver en Laboratorio todos los ensayos de obra de las bitácoras, filtrados por fecha y resultado, para hacer el seguimiento de la calidad.
- H5: Como gerencia quiero que un mensaje que habla de un día que aún no llega no arme ese día.

## Requisitos funcionales (criterios de aceptación en EARS)

### Medidores encadenados (H1)

- RF-1: CUANDO se agrega una máquina a una bitácora, EL SISTEMA llena su lectura inicial con la lectura final que esa máquina tiene en la bitácora no anulada más reciente de la obra con fecha anterior.
- RF-2: SI la máquina no está en ninguna bitácora anterior, ENTONCES EL SISTEMA llena la lectura inicial con la última lectura registrada del vehículo, siempre que sea de un día anterior.
- RF-3: SI no hay ninguna lectura anterior, ENTONCES EL SISTEMA deja la lectura inicial vacía, como hoy.
- RF-4: EL SISTEMA deja editar la lectura inicial llenada.
- RF-5: SI la lectura inicial escrita no coincide con la final del día anterior, ENTONCES EL SISTEMA muestra junto a la fila el aviso «No coincide con la final del día anterior (X)», con el valor de ese día. Aun así deja guardar.
- RF-6: EL SISTEMA sigue mostrando bajo la lectura final cuántos kilómetros recorrió o cuántas horas trabajó la máquina en el día.
- RF-7: CUANDO un reporte de WhatsApp trae la lectura final de una máquina sin la inicial, EL SISTEMA toma como inicial la lectura de RF-1 o RF-2.
- RF-8: SI con esa lectura inicial el avance del día es negativo o supera el tope diario (24 h u 800 km), ENTONCES EL SISTEMA aparta el renglón en «No se pudo guardar» con el motivo, como hoy.
- RF-9: EL SISTEMA muestra la lectura sugerida con su origen: «Final del 18-oct» o «Última lectura del vehículo».

### Observaciones (H2)

- RF-10: EL SISTEMA muestra en cada fila de Maquinaria, Personal, Actividades y Control de calidad una casilla «¿Tienes alguna observación?».
- RF-11: MIENTRAS la casilla está sin marcar, EL SISTEMA muestra el texto «Sin observación» en lugar del campo.
- RF-12: CUANDO se marca la casilla, EL SISTEMA muestra el campo de observación con tres renglones visibles, en el mismo ancho y alineación que los demás campos de la fila.
- RF-13: SI la fila ya tiene una observación guardada, ENTONCES EL SISTEMA abre la casilla marcada con el texto visible.
- RF-14: CUANDO se desmarca la casilla de una fila con texto, EL SISTEMA borra la observación al guardar.
- RF-15: EL SISTEMA deja cerrar la bitácora aunque una máquina no tenga observación. Esto reemplaza la regla de la spec 004 que la exigía.
- RF-16: SI un ensayo de Control de calidad no tiene resultado ni «cumple», ENTONCES EL SISTEMA muestra su casilla marcada y sin poder desmarcarla, porque ahí la observación sigue siendo obligatoria.
- RF-17: EL SISTEMA deja la sección «Notas» como está.
- RF-18: EL SISTEMA muestra «Sin observación» en las vistas de solo lectura de una bitácora cerrada cuando la fila no tiene observación.

### Personal (H3)

- RF-19: EL SISTEMA muestra en cada persona de la sección Personal solo estos campos:
  - horas laboradas (L);
  - extras diurnas (ED);
  - extras nocturnas (EN);
  - novedad;
  - observación según RF-10.
- RF-20: EL SISTEMA ya no pide ni deja escribir la hora de entrada ni la de salida.
- RF-21: SI una persona no tiene horas laboradas ni novedad, ENTONCES EL SISTEMA no la deja guardar y explica que falta una de las dos.
- RF-22: SI una fila guardada antes de esta spec tiene hora de entrada y de salida y no tiene horas laboradas, ENTONCES EL SISTEMA muestra sus horas calculadas en solo lectura, como hoy.
- RF-23: EL SISTEMA conserva los avisos de hoy: más de 2 horas extra en el día, y extras que no cuadran con las laboradas.

### Ensayos de obra en Laboratorio (H4)

- RF-24: EL SISTEMA muestra en el módulo de Laboratorio una pestaña «Ensayos de obra», además de la de granulometrías.
- RF-25: EL SISTEMA lista en «Ensayos de obra» cada ensayo anotado en «Control Calidad de Obra» de las bitácoras no anuladas de la obra, abiertas o cerradas.
- RF-26: EL SISTEMA muestra de cada ensayo:
  - fecha;
  - ensayo;
  - ubicación (PR, tramo o lugar);
  - edad;
  - resultado con su unidad;
  - cumple o no cumple;
  - responsable;
  - si llegó por WhatsApp.
- RF-27: EL SISTEMA filtra la lista por rango de fechas, por ensayo y por cumple / no cumple. Por defecto muestra los últimos 7 días.
- RF-28: EL SISTEMA ordena la lista de la fecha más reciente a la más antigua y la pagina de 15 en 15.
- RF-29: CUANDO se pulsa «Ver bitácora» en un ensayo, EL SISTEMA abre la bitácora de ese día.
- RF-30: EL SISTEMA no deja editar los ensayos desde Laboratorio: se corrigen en la bitácora.
- RF-31: CUANDO se corrige o se agrega un ensayo en una bitácora, EL SISTEMA lo muestra así en «Ensayos de obra» la próxima vez que se consulte.
- RF-32: EL SISTEMA muestra «Ensayos de obra» a quien hoy puede ver Laboratorio en esa obra, y solo con el módulo de Laboratorio activo en la obra (spec 017).

### Día futuro (H5)

- RF-33: SI el día del hecho de un mensaje es posterior a hoy en Colombia, ENTONCES EL SISTEMA no crea ni arma el día de WhatsApp de esa fecha.
- RF-34: EL SISTEMA aparta ese mensaje en «No se pudo guardar» con el motivo «El día del reporte no puede ser posterior a hoy», como ya hace.

## Superficies afectadas

- [ ] **Móvil**: no cambia.
- [x] **Panel web**:
  - Bitácora: secciones Maquinaria, Personal, Actividades y Control de calidad;
  - Laboratorio: pestaña nueva.
- [x] **API**:
  - GET de la bitácora (lecturas anteriores);
  - ruta nueva de ensayos de obra en `panel/laboratorio`;
  - guardado de secciones (Personal sin entrada y salida).
- [ ] **Sincronización**: no cambia.
- [ ] **Datos**: sin tablas nuevas. Las filas viejas se conservan como están.
- [x] **Reglas**:
  - lectura inicial sugerida y aviso de diferencia (`jornada.ts`);
  - validación de Personal (`horas.ts`);
  - bloqueos de cierre (`parte.ts`);
  - día futuro (`whatsapp-automatico.ts`).

## Requisitos no funcionales

- La lectura inicial sugerida aparece en menos de 1 s al agregar la máquina, porque se trae con la bitácora y no se pide aparte.
- «Ensayos de obra» responde en menos de 2 s con un mes de bitácoras.
- En pantallas de menos de 768 px, la casilla y el campo de observación ocupan una sola columna, como el resto del formulario (spec 026).

## Casos límite

- **Sin señal**: no aplica. Es el panel web.
- **Evidencia firmada**:
  - En una bitácora cerrada no cambia ninguna lectura: RF-1 solo aplica al agregar una máquina en una bitácora abierta.
  - Las filas viejas de Personal con entrada y salida se muestran como se guardaron.
- **Primer arranque**:
  - Una máquina que nunca ha tenido lectura empieza con la inicial vacía (RF-3).
  - Una obra con Laboratorio inactivo no muestra la pestaña (RF-32).
- **Bitácora anterior anulada**: se salta y se usa la anterior no anulada (RF-1).
- **Lectura del día anterior sin final** (guardada «sin lectura final»): se busca la final más reciente que exista. Si no hay ninguna, se aplica RF-2.

## Dudas resueltas (2026-10-19, al aprobar)

- D1: Clima no lleva casilla de observación.
- D2: Exportar «Ensayos de obra» a Excel queda para el módulo de Reportes (spec 030).
