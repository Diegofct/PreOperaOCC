# Spec 030 — Módulo de Reportes

> Estado: **Cumplida** el 2026-10-20 (aprobada el 2026-10-19) · Fecha: 2026-10-19

## Contexto y objetivo

La bitácora diaria ya guarda casi todo lo que pasa en la obra, mucho de ello llegado solo por WhatsApp:
- qué máquina trabajó y cuántas horas o kilómetros;
- quién la operó;
- las horas y las extras de cada persona y sus novedades;
- las cantidades por ítem, los viajes de cantera, los ensayos y el clima.

Pero para responder preguntas de gerencia hay que abrir las bitácoras una por una. Preguntas como:
- «¿cuántas horas trabajó la motoniveladora esta semana?»;
- «¿le toca cambio de aceite?»;
- «¿cuántas extras hizo este operador en el mes?».

Este módulo junta lo de las bitácoras en reportes por día, semana o mes, en pestañas por tema. Además avisa cuándo una máquina necesita cambio de aceite o mantenimiento preventivo, o tiene un correctivo pendiente. Para eso empieza a llevar el registro de los mantenimientos: a mano, o reconocidos por la IA en los mensajes del grupo.

## Usuarios / actores

- **Gerencia** (panel web, rol `admin`):
  - consulta los reportes de todas las obras y los exporta;
  - configura los intervalos de mantenimiento;
  - registra mantenimientos.
- **Residente / director de obra** (panel web, rol `supervisor`): lo mismo, solo en su obra. No cambia los intervalos de los tipos de equipo.
- **Quien reporta en el grupo de WhatsApp:** escribe como siempre («se le cambió el aceite a la TFO427»). La IA reconoce el mantenimiento y el sistema lo registra solo.
- **Los demás roles** (operador, almacenista, encargado de planta, laboratorista): no ven el módulo.

## Historias de usuario

- H1: Como gerencia quiero ver por día, semana o mes qué máquinas trabajaron, quién las operó y cuántas horas o kilómetros hicieron, para controlar el uso de los equipos.
- H2: Como gerencia quiero que el sistema me avise cuándo una máquina necesita cambio de aceite o mantenimiento preventivo, o tiene un correctivo pendiente, para no dejar pasar un servicio.
- H3: Como residente quiero registrar un mantenimiento hecho, y que lo que se reporta por WhatsApp se registre solo, para que la cuenta del siguiente servicio empiece de nuevo.
- H4: Como gerencia quiero ver cuántas horas laboró cada persona en el día, la semana o el mes, con sus extras y sus novedades, para controlar la nómina y las horas extra.
- H5: Como gerencia quiero ver, además, las cantidades ejecutadas por ítem, los viajes de cantera, los resultados de calidad y el clima del periodo, para seguir la obra sin abrir cada bitácora.
- H6: Como gerencia quiero descargar cada reporte a Excel o imprimirlo, para compartirlo y archivarlo.

## Requisitos funcionales (criterios de aceptación en EARS)

### El módulo y su encabezado (H1, H4, H5, H6)

- RF-1: EL SISTEMA muestra un módulo «Reportes» en el menú a gerencia y al residente, y a ningún otro rol.
- RF-2: EL SISTEMA muestra al residente solo su obra. A gerencia le deja elegir la obra.
- RF-3: EL SISTEMA organiza el módulo en pestañas:
  - Máquinas;
  - Mantenimiento;
  - Personal;
  - Actividades;
  - Cantera;
  - Control de calidad;
  - Clima y novedades.
- RF-4: EL SISTEMA deja elegir el periodo como **Día**, **Semana** (de lunes a domingo) o **Mes**, con una fecha de referencia y flechas para ir al periodo anterior o al siguiente.
- RF-5: CUANDO se abre el módulo, EL SISTEMA muestra la semana actual de la obra y la pestaña Máquinas.
- RF-6: EL SISTEMA arma los reportes con las bitácoras no anuladas del periodo, abiertas o cerradas.
- RF-7: SI un día del periodo tiene la bitácora abierta, ENTONCES EL SISTEMA lo marca como «abierta», porque sus datos todavía pueden cambiar.
- RF-8: EL SISTEMA muestra arriba de cada pestaña unas cifras resumen del periodo, distintas en cada pestaña.
- RF-9: CUANDO se pulsa «Descargar Excel», EL SISTEMA descarga un archivo que abre Excel, con la tabla de la pestaña y el periodo elegidos y con el nombre de la obra y el periodo en el nombre del archivo.
- RF-10: CUANDO se pulsa «Imprimir», EL SISTEMA abre una versión para imprimir o guardar como PDF con:
  - el encabezado de la obra;
  - el periodo y la fecha de generación;
  - la tabla de la pestaña.

### Máquinas (H1)

- RF-11: EL SISTEMA lista en Máquinas los vehículos y máquinas vigentes de la obra y los que aparezcan en alguna bitácora del periodo.
- RF-12: EL SISTEMA muestra, por máquina y por día:
  - si trabajó;
  - quién la operó;
  - la lectura inicial y la final;
  - las horas o los kilómetros del día.
- RF-13: EL SISTEMA marca que una máquina **trabajó** un día (botón verde «Sí») cuando está en la bitácora de ese día con un avance mayor que cero.
- RF-14: EL SISTEMA marca que **no trabajó** (botón rojo «No») cuando ese día hay bitácora y la máquina no está o su avance es cero.
- RF-15: SI un día no tiene bitácora, ENTONCES EL SISTEMA lo muestra como «Sin bitácora» y no lo cuenta ni como trabajado ni como no trabajado.
- RF-16: EL SISTEMA toma el operador de la bitácora. SI la bitácora no lo dice, ENTONCES toma la persona del preoperacional de esa máquina ese día. SI tampoco hay, muestra «Sin operador».
- RF-17: EL SISTEMA mide en horas las máquinas de horómetro y en kilómetros las de odómetro, según su tipo, como en la bitácora.
- RF-18: EN Semana, EL SISTEMA muestra una fila por máquina con:
  - una columna por día con el botón Sí/No y las horas o los kilómetros;
  - el total del periodo;
  - los días trabajados.
- RF-19: EN Mes, EL SISTEMA muestra por máquina el total, los días trabajados, los días sin trabajar y el promedio por día trabajado. Al abrir una máquina, muestra el detalle por día.
- RF-20: EL SISTEMA muestra junto a cada máquina su estado de mantenimiento (RF-28), con un enlace a la pestaña Mantenimiento.
- RF-21: EL SISTEMA muestra como cifras del periodo:
  - las máquinas que trabajaron;
  - las que no;
  - el total de horas de máquina;
  - el total de kilómetros;
  - las alertas de mantenimiento vencidas.

### Mantenimiento (H2, H3)

- RF-22: EL SISTEMA maneja tres clases de mantenimiento:
  - **cambio de aceite de motor**;
  - **preventivo**;
  - **correctivo**.
- RF-23: EL SISTEMA trae intervalos de arranque por clase de medidor:
  - **horómetro:** aceite cada 250 h y preventivo cada 500 h;
  - **odómetro:** aceite cada 5.000 km y preventivo cada 10.000 km;
  - aviso al 90 % del intervalo.
- RF-24: EL SISTEMA deja a gerencia cambiar el intervalo de aceite y de preventivo de cada tipo de equipo, y el porcentaje de aviso.
- RF-25: EL SISTEMA deja a gerencia poner un intervalo distinto a una máquina concreta, que manda sobre el de su tipo.
- RF-26: EL SISTEMA cuenta lo recorrido desde el último servicio de esa clase. Es la última lectura registrada de la máquina menos la lectura con que se registró ese servicio.
- RF-27: SI una máquina no tiene ningún servicio registrado de una clase, ENTONCES EL SISTEMA muestra esa clase como «Sin registro», invita a registrarla y no calcula alerta.
- RF-28: EL SISTEMA muestra, por máquina y por clase (aceite y preventivo), uno de estos estados:
  - **Al día**;
  - **Próximo**, desde el porcentaje de aviso;
  - **Vencido**, desde el 100 %;
  - **Sin registro**.

  Muestra también lo que falta o lo que se pasó («Aceite en 23 h», «Preventivo vencido hace 140 km»).
- RF-29: CUANDO se registra un correctivo, EL SISTEMA marca la máquina con «Correctivo pendiente» hasta que alguien lo marque como resuelto, con la fecha y una nota.
- RF-30: EL SISTEMA marca además «Fuera de servicio» la máquina cuyo estado en Vehículos sea en mantenimiento, fuera de servicio o no apto.
- RF-31: EL SISTEMA ordena la lista de Mantenimiento así:
  1. correctivos pendientes;
  2. vencidas;
  3. próximas;
  4. sin registro;
  5. al día.
- RF-32: CUANDO gerencia o el residente pulsan «Registrar mantenimiento», EL SISTEMA pide:
  - la máquina;
  - la clase;
  - la fecha;
  - la lectura, que propone la última registrada;
  - una nota.

  Y lo guarda con quién lo registró.
- RF-33: SI la lectura escrita es mayor que la última registrada de la máquina, ENTONCES EL SISTEMA avisa y deja guardar.
- RF-34: EL SISTEMA muestra el historial de mantenimientos de cada máquina, del más reciente al más antiguo, con su origen: «Panel» o «WhatsApp».
- RF-35: EL SISTEMA no deja editar un mantenimiento registrado. Deja **anularlo** con un motivo, y el anulado deja de contar.

### Mantenimientos desde WhatsApp (H3)

- RF-36: CUANDO un mensaje del grupo dice que a una máquina se le hizo un cambio de aceite, un preventivo o un correctivo, EL SISTEMA lo registra solo como mantenimiento de esa clase, con origen «WhatsApp». Por ejemplo:
  - «se le cambió el aceite a la TFO427»;
  - «mantenimiento preventivo a la motoniveladora»;
  - «se reventó una manguera de la pajarita, quedó en reparación».
- RF-37: EL SISTEMA toma la fecha del hecho que reconoce en el mensaje, como en el resto de WhatsApp.
- RF-38: SI el mensaje no trae la lectura, ENTONCES EL SISTEMA usa la última lectura registrada de la máquina hasta ese día.
- RF-39: EL SISTEMA reconoce la máquina como en la bitácora: por placa, código, o tipo y marca.
- RF-40: SI EL SISTEMA no reconoce la máquina o la clase, ENTONCES aparta el renglón en «No se pudo guardar» con el motivo. Quien lo atiende puede completarlo o descartarlo, como los demás renglones.
- RF-41: CUANDO un mensaje dice que un correctivo quedó resuelto («ya quedó reparada la TFO427»), EL SISTEMA marca como resuelto el correctivo pendiente de esa máquina.
- RF-42: SI el mismo mantenimiento llega dos veces (la misma máquina, la misma clase y el mismo día), ENTONCES EL SISTEMA lo registra una sola vez.
- RF-43: EL SISTEMA sigue llevando el texto del mensaje a las notas de la bitácora, como hoy.

### Personal (H4)

- RF-44: EL SISTEMA lista en Personal a las personas que aparecen en alguna bitácora del periodo.
- RF-45: EL SISTEMA muestra, por persona y por día:
  - las horas laboradas;
  - las extras diurnas y nocturnas;
  - la novedad.

  Usa las horas reportadas o, en las filas viejas, las calculadas con el horario, como la bitácora.
- RF-46: EN Semana, EL SISTEMA muestra una fila por persona con:
  - una columna por día con sus horas y una marca de extras o novedad;
  - el total de horas laboradas, de extras diurnas y de extras nocturnas;
  - los días trabajados.
- RF-47: EN Mes, EL SISTEMA muestra por persona los totales, los días trabajados y cuántos días tuvo cada novedad. Al abrir una persona, muestra el detalle por día.
- RF-48: EL SISTEMA avisa junto a la persona cuando pasa de 2 horas extra en un día o de 12 horas extra en una semana. Avisa y no impide.
- RF-49: EL SISTEMA deja filtrar por cargo y buscar por nombre.
- RF-50: EL SISTEMA muestra como cifras del periodo:
  - las personas;
  - el total de horas laboradas;
  - el total de extras diurnas y nocturnas;
  - las personas con novedad.

### Actividades, Cantera, Control de calidad, y Clima y novedades (H5)

- RF-51: EN Actividades, EL SISTEMA suma la cantidad ejecutada de cada ítem del presupuesto en el periodo, con su unidad y los días en que se trabajó. Al abrir un ítem, muestra el detalle por día.
- RF-52: SI una actividad es «otra» (fuera del presupuesto), ENTONCES EL SISTEMA la lista aparte con su descripción.
- RF-53: EN Cantera, EL SISTEMA cuenta los viajes vigentes del periodo:
  - por volqueta;
  - por material;
  - por origen;
  - por destino.

  *Corregido al planear (2026-10-19): decía «y los metros cúbicos», pero los viajes no guardan
  volumen ni las volquetas su capacidad; los m³ quedan para cuando exista ese dato.*
- RF-54: EN Control de calidad, EL SISTEMA muestra por tipo de ensayo cuántos se hicieron, cuántos cumplen, cuántos no y cuántos no lo dicen. Muestra también la lista de los que no cumplen, con un enlace a la bitácora.
- RF-55: EN Clima y novedades, EL SISTEMA muestra por día:
  - el clima por franjas;
  - si fue día sin trabajo y su motivo;
  - las notas del día.

  Cuenta además los días con lluvia y los días sin trabajo del periodo.

### Reglas transversales

- RF-56: EL SISTEMA calcula los reportes en el servidor, con las mismas reglas que la bitácora para las horas de personas y de máquinas.
- RF-57: EL SISTEMA pagina de 15 en 15 las tablas que lo necesiten, como el resto del panel.
- RF-58: EL SISTEMA muestra el módulo en una sola columna en pantallas de menos de 768 px, con las tablas desplazables a lo ancho, como el resto del panel.

## Superficies afectadas

- [ ] **Móvil**: no cambia.
- [x] **Panel web**:
  - módulo nuevo «Reportes» con 7 pestañas;
  - ventanas para registrar y anular mantenimientos y para configurar intervalos.
- [x] **API**: rutas nuevas en `panel/reportes/*` (consultas por pestaña, exportar, mantenimientos, intervalos).
- [ ] **Sincronización**: no cambia.
- [x] **Datos**:
  - tablas nuevas de intervalos por tipo de equipo, intervalos por máquina y mantenimientos registrados (con anulación y origen);
  - permiso nuevo del módulo.
- [x] **Reglas**:
  - agregados por periodo (máquinas, personal, actividades, cantera, calidad, clima);
  - estado de mantenimiento;
  - semanas de lunes a domingo;
  - reconocer mantenimientos del reporte de WhatsApp.
- [x] **n8n**: el clasificador pide a la IA los mantenimientos del mensaje (máquina, clase, fecha, lectura, resuelto).

## Requisitos no funcionales

- Cada pestaña responde en menos de 3 s con un mes de una obra (unas 30 bitácoras, 20 máquinas y 40 personas).
- El Excel abre en Excel con tildes y eñes bien, y con los números como números.
- La versión para imprimir cabe en hoja carta horizontal y no corta una fila entre dos hojas.

## Casos límite

- **Sin señal**: no aplica. Es el panel web.
- **Evidencia firmada**:
  - Los reportes solo leen las bitácoras: no cambian nada de ellas, abiertas ni cerradas.
  - Un mantenimiento registrado no se edita: se anula con motivo (RF-35).
- **Primer arranque**:
  - Sin mantenimientos registrados, todas las máquinas salen «Sin registro» (RF-27), no «Vencido».
  - Una obra sin bitácoras en el periodo muestra cada pestaña vacía, con un mensaje que lo dice.
- **Máquina que cambió de obra**: sale en la obra donde aparece en la bitácora de cada día.
- **Lectura corregida hacia atrás** (un dedazo corregido): el cálculo usa la última lectura vigente. Si queda por debajo de la del último servicio, la clase sale «Revise lecturas» en lugar de una cifra negativa.

## Dudas resueltas (2026-10-19, al aprobar)

- D1: La semana va de lunes a domingo.
- D2: Un correctivo reportado por WhatsApp no cambia el estado del vehículo en Vehículos: se marca
  «Correctivo pendiente» en Reportes y el estado lo cambia una persona.
- D3: Solo aceite de motor y preventivo con intervalo (más el correctivo, sin intervalo); otras
  clases se agregarán si gerencia las pide.
