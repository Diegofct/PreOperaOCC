# Spec 026 — Máquinas reconocidas por nombre, medidores al día, fechas con calendario y panel para celular

> Estado: **Cumplida**, con el cambio del 2026-10-13 (RF-49 a RF-53) cumplido el 2026-10-14. Cumplida el 2026-10-11 (ver `validacion.md`); aprobada el 2026-10-09, cambio del 2026-10-10 (RF-42 a RF-48) aprobado el 2026-10-10
> · Fecha: 2026-10-09 · Cambia la spec 024 (máquinas no reconocidas), la 025 (orden
> del historial, 025/RF-52) y la 003 (lecturas de los vehículos con decimales)

## Contexto y objetivo

El reporte diario trae la maquinaria amarilla por su **nombre y marca** («Recicladora wirtgen
wr2000», «Vibrocompactador dynapac 7ton», «Montacarga a Diesel»), no por su placa. Hoy solo se
reconoce un equipo por placa o código, y por eso el 8-oct quedaron en «No se pudo guardar» cinco
máquinas, aunque dos de ellas estaban registradas. Las que no están registradas tampoco se crean,
como sí pasa con las volquetas. Además, cada reporte trae el **odómetro o el horómetro** de cada
equipo. Gerencia quiere que el módulo de Vehículos tenga esas lecturas al día. Hoy solo se
actualizan al cerrar la bitácora, que el residente cierra días después: de 24 equipos en
producción, solo uno tiene lectura.

En Reportes de WhatsApp, el filtro de fechas obliga a escribir la fecha. Gerencia quiere elegirla
en un **calendario**. También quiere que la lista empiece por la **primera** fecha del rango, y no
por la última.

Por último, el panel debe verse **alineado** (etiquetas, campos y botones de una misma fila al
mismo nivel) y debe poder usarse **desde el navegador del celular**.

## Usuarios / actores

- **Quien reporta en el grupo**: manda el reporte como hoy. No cambia nada para él.
- **El sistema**: reconoce o crea la máquina, guarda su fila en la bitácora y actualiza el
  medidor del vehículo.
- **Residente / director de obra** (panel, en computador o en celular): consulta, completa lo
  que no se pudo guardar y revisa lo creado.
- **Gerencia** (panel, en computador o en celular): lo mismo, en todas las obras.
- **Operador** (app móvil): no cambia nada para él.

## Historias de usuario

- H1: Como residente quiero que las máquinas del reporte se reconozcan por su tipo y su marca,
  para no elegirlas a mano.
- H2: Como gerencia quiero que la máquina que no está registrada se registre sola, para que su
  día de trabajo no se pierda.
- H3: Como gerencia quiero que el odómetro y el horómetro de cada vehículo se actualicen con cada
  reporte, para tener el módulo de Vehículos al día.
- H4: Como gerencia quiero elegir las fechas en un calendario, y ver la lista desde la primera
  fecha, para consultar un periodo sin escribir fechas a mano.
- H5: Como usuario del panel quiero que etiquetas, campos y botones se vean alineados, para leer
  y usar las pantallas sin esfuerzo.
- H6: Como residente o gerencia quiero usar el panel desde el navegador del celular, para
  consultar y atender en la obra.

## Requisitos funcionales (criterios de aceptación en EARS)

### Máquinas reconocidas por su nombre (H1)

- RF-1: CUANDO un renglón de maquinaria no se reconoce por placa ni por código, EL SISTEMA buscará
  en la obra los equipos cuyo tipo y cuya marca estén escritos en el renglón.
- RF-2: EL SISTEMA reconocerá el tipo aunque se escriba distinto al catálogo: con o sin tildes,
  en singular o en plural, junto o separado («Vibrocompactador» es «Vibro Compactadora»,
  «Montacarga» es «Montacargas»).
- RF-3: EL SISTEMA reconocerá la marca aunque esté escrita con mayúsculas distintas o pegada al
  modelo («wirtgen wr2000» es la marca «WIRTGEN WR 2000»).
- RF-4: SI el tipo y la marca escritos coinciden con un solo equipo de la obra, ENTONCES EL
  SISTEMA reconocerá ese equipo.
- RF-5: SI el tipo y la marca escritos coinciden con dos o más equipos de la obra, ENTONCES EL
  SISTEMA no elegirá ninguno y dejará el renglón en «No se pudo guardar» con los candidatos.
- RF-6: SI dos renglones del mismo reporte se reconocen como el mismo equipo por tipo y marca,
  ENTONCES EL SISTEMA no asignará ese equipo a ninguno de los dos y los dejará en «No se pudo
  guardar» con el motivo «Dos renglones del reporte pueden ser el mismo equipo».
- RF-7: EL SISTEMA seguirá reconociendo primero por placa o código, como hoy (021, 024).

### Máquinas no registradas (H2)

- RF-8: CUANDO un renglón de maquinaria no coincide con ningún equipo de la obra por placa,
  código, tipo ni marca, y su tipo se reconoce, EL SISTEMA registrará el equipo en la obra.
- RF-9: EL SISTEMA registrará ese equipo con el tipo reconocido, la marca escrita y el nombre del
  renglón como modelo.
- RF-10: EL SISTEMA le dará a ese equipo un código interno automático, sin placa.
- RF-11: EL SISTEMA mostrará ese equipo con la marca «Desde WhatsApp» en Vehículos.
- RF-12: EL SISTEMA listará ese equipo en «Creado automáticamente», donde se puede marcar revisado
  o unir con otro equipo (024/RF-33 a RF-36).
- RF-13: SI el tipo del renglón no se reconoce, ENTONCES EL SISTEMA no registrará el equipo y
  dejará el renglón en «No se pudo guardar».
- RF-14: CUANDO llegue otro reporte con el mismo renglón escrito igual, EL SISTEMA reconocerá el
  equipo ya registrado y no lo registrará dos veces.

### Medidores al día (H3)

- RF-15: CUANDO se guarde en la bitácora un renglón de maquinaria que vino por WhatsApp, EL
  SISTEMA actualizará la última lectura del vehículo con la lectura final del renglón.
- RF-16: EL SISTEMA actualizará el odómetro si el reporte dice «km», y el horómetro si dice «h»,
  «hr» u «horas».
- RF-17: SI el reporte no dice la unidad, ENTONCES EL SISTEMA actualizará el medidor que
  corresponde al tipo de equipo.
- RF-18: SI la lectura final es menor que la última lectura registrada del vehículo, ENTONCES EL
  SISTEMA no guardará el renglón y lo dejará en «No se pudo guardar» con el motivo «La lectura
  (X) es menor que la registrada en Vehículos (Y)».
- RF-19: SI la lectura final supera la última registrada en más de lo posible en los días
  transcurridos desde esa lectura (24 h de horómetro u 800 km de odómetro por día, contando al
  menos un día), ENTONCES EL SISTEMA no guardará el renglón y lo dejará en «No se pudo guardar»
  con el motivo «Son más de … desde la última lectura registrada (Y). Revise las lecturas».
- RF-20: EL SISTEMA guardará las lecturas de los vehículos con un decimal (5828.4 h).
- RF-21: EL SISTEMA mostrará en Vehículos la última lectura de cada medidor y la fecha en que se
  actualizó.
- RF-22: CUANDO se complete en «No se pudo guardar» un renglón de maquinaria, EL SISTEMA aplicará
  RF-15 a RF-19 al guardarlo.
- RF-23: EL SISTEMA seguirá actualizando las lecturas al cerrar la bitácora, como hoy, sin
  retroceder nunca.
- RF-42: EL SISTEMA guardará con la última lectura de cada vehículo el día del reporte del que
  salió, además del momento en que se actualizó. (Cambio del 2026-10-10)
- RF-43: SI el día del reporte es anterior al día de la última lectura registrada del vehículo,
  ENTONCES EL SISTEMA guardará el renglón en la bitácora de ese día sin aplicar RF-18 ni RF-19, y
  no cambiará la lectura del vehículo. (Cambio del 2026-10-10)
- RF-44: EL SISTEMA contará los días de RF-19 entre el día del reporte y el día de la última
  lectura registrada, y no entre las fechas en que se procesaron. (Cambio del 2026-10-10)
- RF-45: SI un renglón que ya está en «No se pudo guardar» vuelve a fallar al reprocesar el
  mensaje, ENTONCES EL SISTEMA mostrará el motivo nuevo en lugar del anterior. (Cambio del
  2026-10-10)

### Esperar las fotos antes de guardar (cambio del 2026-10-10, cambia 024/RF-53)

- RF-46: MIENTRAS un mensaje, o alguno de los que lo complementan, tenga una foto o un documento
  cuyo archivo todavía no ha llegado al panel, EL SISTEMA no guardará ese mensaje en la bitácora y
  lo volverá a intentar en el siguiente pulso.
- RF-47: SI pasan 30 minutos desde que llegó el mensaje y el archivo sigue sin llegar, ENTONCES
  EL SISTEMA guardará el mensaje sin ese archivo.
- RF-48: CUANDO el archivo que faltaba llegue después de que se guardó el mensaje, y la bitácora
  de ese día siga abierta y sin foto del día, EL SISTEMA pondrá esa foto como foto del día
  (024/RF-53).

### Lo que no se leyó el 8 y el 9-oct (cambio del 2026-10-13)

- RF-49: CUANDO el modelo registrado de un equipo de la obra tenga al menos 4 caracteres, con
  alguna letra, y esté escrito en el renglón —sin contar espacios, signos ni mayúsculas—, EL
  SISTEMA reconocerá ese equipo, después de la placa y el código y antes del tipo y la marca
  («Motoniveladora Komatsu GD 566» reconoce el equipo de modelo «GD566»). Amplía RF-14.
- RF-50: CUANDO un renglón del reporte se reconozca por placa, código o modelo, EL SISTEMA no
  contará ese equipo entre los candidatos por tipo y marca de los demás renglones del mismo
  reporte. Si así no queda ningún candidato y el tipo se reconoce, se aplica RF-8.
- RF-51: SI una lectura del renglón tiene punto decimal y, quitándolo, el renglón cumpliría las
  comprobaciones de las lecturas (la final no menor que la inicial y dentro del tope de RF-19),
  ENTONCES EL SISTEMA añadirá al motivo de «No se pudo guardar» «¿Quiso decir X?», sin corregir
  la lectura por su cuenta.
- RF-52: EL SISTEMA aceptará como metros de llegada de un viaje a la obra cualquier número entero
  de 0 a 999, y no solo de 25 en 25, en Control Cantera, en lo que llega por WhatsApp y en «No se
  pudo guardar», y se escribirán en un campo numérico. (Reemplaza 010/RF-13.)
- RF-53: EL SISTEMA tendrá «Humedad» en la lista de ensayos de la bitácora, y reconocerá como ese
  ensayo «Humedades», «Humedad natural» y «Contenido de humedad».

### Fechas con calendario (H4)

- RF-24: EL SISTEMA permitirá elegir «Desde» y «Hasta» en un calendario en Reportes de WhatsApp
  (Historial, Estado del día, «No se pudo guardar» y «Creado automáticamente»).
- RF-25: EL SISTEMA permitirá elegir en un calendario las fechas de los filtros de Control
  Cantera y Laboratorio.
- RF-26: EL SISTEMA mostrará los mensajes del Historial ordenados por día del reporte de la fecha
  «Desde» a la fecha «Hasta», y dentro de un mismo día del más antiguo al más reciente. (Reemplaza
  025/RF-52).
- RF-27: EL SISTEMA aplicará el mismo orden de RF-26 en «No se pudo guardar».
- RF-28: EL SISTEMA no dejará elegir en el calendario de «Hasta» una fecha anterior a «Desde».

### Diseño alineado (H5)

- RF-29: EL SISTEMA alineará por su borde inferior los campos, selectores y botones de una misma
  fila de filtros o de formulario.
- RF-30: EL SISTEMA dará la misma altura a los campos, selectores y botones de una misma fila.
- RF-31: EL SISTEMA alineará arriba las etiquetas de los campos de una misma fila.
- RF-32: EL SISTEMA alineará en una sola columna, del mismo ancho, los botones de acción de cada
  fila de una tabla.

### Panel en el celular (H6)

- RF-33: MIENTRAS el ancho de la ventana sea menor de 768 px, EL SISTEMA mostrará el menú lateral
  oculto, con un botón «☰» para abrirlo encima del contenido.
- RF-34: CUANDO se elija un módulo en el menú abierto encima del contenido, EL SISTEMA cerrará el
  menú.
- RF-35: MIENTRAS el ancho sea menor de 768 px, EL SISTEMA mostrará los campos de los formularios
  y de los filtros uno debajo de otro, a lo ancho de la pantalla.
- RF-36: MIENTRAS el ancho sea menor de 768 px, EL SISTEMA mostrará las tablas con
  desplazamiento horizontal dentro de su marco, sin que la página entera se desplace a lo ancho.
- RF-37: MIENTRAS el ancho sea menor de 768 px, EL SISTEMA mostrará las ventanas (completar,
  descartar, registrar) a pantalla completa.
- RF-38: MIENTRAS el ancho sea menor de 768 px, EL SISTEMA mostrará el índice de secciones de la
  bitácora como una lista desplegable arriba del contenido.
- RF-39: EL SISTEMA no tendrá desplazamiento horizontal de la página en un ancho de 360 px.
- RF-40: EL SISTEMA dará a los botones y a los controles que se tocan al menos 40 px de alto en
  el celular.
- RF-41: MIENTRAS el ancho sea de 768 px o más, EL SISTEMA se verá como hoy, con los anchos de
  tabla de 005/RF-20 y 022/RF-27.

## Superficies afectadas

- [ ] **Móvil (app del operador)** — sin cambios. La app sigue recibiendo las lecturas del
  vehículo por el pull, ahora con decimal.
- [x] **Panel web** — Vehículos (lecturas y fecha), Reportes de WhatsApp (calendario y orden),
  Control Cantera y Laboratorio (calendario), y todas las pantallas (alineación y celular).
- [x] **API** — rutas de Reportes de WhatsApp (orden), guardado automático y «No se pudo
  guardar» (reconocer, crear y medidores).
- [x] **Sincronización** — el pull de vehículos lleva las lecturas con decimal.
- [x] **Datos** — las lecturas de los vehículos pasan a tener decimal. Cambio del 2026-10-13: el
  `check` de los metros de `cantera_viajes` pasa a 0–999 sin paso (migración).
- [x] **Reglas** — reconocer por tipo y marca, tipo escrito, medidor por unidad, salto posible
  desde la última lectura. Casos nuevos en `verificar-reglas.ts`.
- [x] **Integración (n8n)** — la IA pone la unidad de cada lectura («km» u «h»).

## Requisitos no funcionales

- **Celular:** anchos de 360 a 767 px, en Chrome de Android y Safari de iOS, al día.
- **Texto:** de 14 px como mínimo en el celular.
- **Calendario:** el del navegador. No se añade ninguna librería de calendario.

## Casos límite

- **Sin señal:** no aplica al panel. La app del operador no cambia.
- **Evidencia firmada:** una bitácora cerrada no se toca. Las lecturas de un vehículo solo avanzan
  y nunca se reescriben hacia atrás, ni al cerrar ni por WhatsApp.
- **Primer arranque:** un vehículo sin lectura registrada acepta la primera que llegue, sin el
  tope de RF-19.
- **Dos reportes del mismo día con lecturas distintas de la misma máquina:** se aplica la mayor
  (nunca retrocede). El reemplazo de la fila de la bitácora sigue siendo el de 021/RF-92.
- **Un reporte de un día viejo** que llega después de uno más nuevo trae una lectura menor que la
  registrada. ~~Por RF-18 va a «No se pudo guardar», donde se completa o se descarta.~~ Por RF-43
  se guarda en la bitácora de su día y no toca Vehículos: la lectura del día más nuevo manda.
  (Cambio del 2026-10-10: el 8-oct, reprocesado después del 9-oct, dejaba en «No se pudo
  guardar» casi todas sus máquinas.)
- **Un reporte de un día viejo con una lectura mayor que la registrada** (la TFO 429 dice
  16253 h el 8-oct y 15714.6 h el 9-oct): se guarda en la bitácora del 8-oct y Vehículos se queda
  con la del 9-oct (RF-43). La diferencia entre los dos reportes la revisa la persona.
- **Lecturas registradas antes del cambio:** no tienen día del reporte. Se toma el día en que se
  actualizaron.
- **Reporte que llega tarde, con el día ya vencido** (el 9-oct, después de la falta de
  créditos): se guardaba en cuanto llegaba, y sus fotos subían segundos después, así que quedaba
  sin foto del día. Por RF-46 espera a que lleguen.
- **Video o archivo que nunca llega** (falló la descarga en WhatsApp): RF-47 lo deja de esperar
  a los 30 minutos.
- **«Inició 25.6 / Terminó 25.6»** (no trabajó): se guarda, y el medidor no cambia.
- **Volqueta con lectura en horas** («14647.0 hr»): actualiza el horómetro de esa volqueta (RF-16),
  y la fila se valida contra el horómetro.
- **Dos máquinas del mismo tipo y marca, una registrada y otra no** (8 y 9-oct: «Komatsu GD 566»,
  la MOTONV-01, y «Komatsu alquilada GD555»): con el modelo «GD 566» en la MOTONV-01, la primera se
  reconoce por RF-49 y la alquilada se registra sola por RF-50 y RF-8. Sin modelo distintivo
  sigue aplicando RF-6.
- **El modelo es un año** («1995»): no tiene letras, así que RF-49 no lo usa; un «1995» escrito en
  otro renglón no reconoce ese equipo.
- **Punto de más en una lectura** («18740.7km» por 187407): RF-51 lo sugiere en el motivo; el
  renglón sigue en «No se pudo guardar» hasta que una persona lo complete.
- **Un dígito cambiado** («16655.9 hr» por 14655.9): no se puede adivinar; el motivo de RF-19
  basta para que la persona lo revise.
- **Viajes de cantera guardados antes del cambio:** siguen igual; ya estaban en múltiplos de 25.

## Fuera de alcance

- Un historial de lecturas por vehículo: solo se guarda la última, como hoy.
- Corregir hacia atrás una lectura mal registrada: se hace como hoy, por el camino de Vehículos,
  si existe.
- La app del operador.
- Tablas convertidas en tarjetas en el celular: se desplazan a lo ancho (RF-36).
- Un modo oscuro, o un rediseño de colores o tipografías.
- Las lecturas de las máquinas en los preoperacionales (spec 013).
- Volver a abrir los renglones que ya se descartaron en «No se pudo guardar»: se reprocesa el
  mensaje con la receta de despliegue.
- Llevar a la bitácora todas las fotos del día: va en la spec 027.

## Criterios de finalización

- Cada RF tiene cómo comprobarse:
  - las reglas puras con casos en `scripts/verificar-reglas.ts`: RF-1 a RF-6, RF-13, RF-16 a RF-19
    y RF-26;
  - el resto con la demo.
- `npm run verificar`, `npm run typecheck` y `npm run lint` en verde, con la prueba de anchos de
  escritorio incluida.
- **Demo:**
  - El reporte del 8-oct, reprocesado en desarrollo, reconoce la recicladora y el vibrocompactador
    Dynapac, registra el montacarga y el vibrocompactador Volvo, y deja las dos motoniveladoras
    Komatsu con el motivo de RF-6.
  - Los vehículos de la obra quedan con su lectura y su fecha.
  - En Chrome:
    - se eligen las fechas en el calendario;
    - el Historial empieza por la fecha «Desde»;
    - el panel se recorre a 390 px sin desplazamiento horizontal de la página.
- **Producción:** el 8-oct se reprocesa, los vehículos de CONSORCIO MAGDALENA quedan con sus
  lecturas, y lo que no cuadra queda en «No se pudo guardar».
- **Cambio del 2026-10-10:**
  - las reglas puras de RF-43, RF-44 y RF-46 con casos en `scripts/verificar-reglas.ts`;
  - en producción, el 8-oct, reprocesado otra vez, lleva a su bitácora el montacarga, la
    recicladora y el Dynapac, sin cambiar la lectura de ningún vehículo;
  - un reporte con fotos que llega con el día ya vencido queda con su foto del día.
- **Cambio del 2026-10-13:**
  - las reglas puras de RF-49 a RF-53 con casos en `scripts/verificar-reglas.ts`, entre ellos
    las dos Komatsu, «18740.7» → «¿Quiso decir 187407?», K1+460 y «Humedades»;
  - en producción, el 8 y el 9-oct reprocesados llevan a su bitácora las dos motoniveladoras
    (salvo la GD555 del 9-oct, que no trae lectura final) y las tres humedades, y a Control
    Cantera los tres vales de K1+460, K1+510 y K1+396;
  - las lecturas de la TAY076 (8 y 9-oct) y de la TFO427 (8-oct) se completan con 187407 y
    14655.9, con permiso del usuario.

## Dudas abiertas

Ninguna. Resueltas con el usuario el 2026-10-09:
- la máquina no registrada se crea sola;
- los medidores se actualizan al guardar, solo hacia adelante, con un decimal y por la unidad
  escrita;
- en el celular va todo el panel, con menú ☰, una columna y tablas con desplazamiento.

El orden «de Desde a Hasta» lo pidió el usuario.
