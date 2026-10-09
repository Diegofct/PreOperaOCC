# Spec 024 — Guardado automático de los reportes de WhatsApp

> Estado: **Cumplida** (2026-10-09) · Aprobada (2026-10-08) · Fecha: 2026-10-08 · Cambia la spec 021 (ver «Lo que cambia de la 021»)
> · Cambio: 2026-10-08 (el conductor escrito gana al preoperacional y al último viaje, RF-18 con
> 021/RF-112; un nombre que está en dos o más personas no se registra, RF-74) · Cambio:
> 2026-10-08 (al unir, los viajes se anulan y se registran de nuevo; lo cerrado no se toca,
> RF-75 y RF-76)

## Contexto y objetivo

Desde la spec 021, lo que se reporta en los grupos de WhatsApp de la obra llega a una bandeja y
**no se guarda hasta que el residente lo revisa y lo aprueba**. En la práctica eso frena todo: el
7-oct la encargada de planta mandó 27 fotos de vales de cantera, la IA las leyó bien, y al día
siguiente no había ni un viaje registrado porque nadie las había aprobado. Gerencia decidió quitar
ese paso: **lo que se reporta en el grupo se guarda solo, cada cosa en su módulo.** Los viajes de
cantera van a Control Cantera y se ven en la bitácora, como hoy. El almacén va solo a Almacén. El
reporte diario y lo demás van a la bitácora de la obra y del día del hecho, que se arma cuando
llegan todos los reportes que esa obra espera. Lo que no exista en el sistema (una persona, un
material, un sitio, una volqueta) se crea solo. Las personas solo intervienen para revisar lo
creado y para completar lo poco que no se pudo guardar. El módulo de Reportes de WhatsApp deja de
ser la puerta por la que todo pasa: queda para consultar lo guardado y atender esas excepciones.

## Usuarios / actores

- **Quien reporta en el grupo** (encargada de planta, tecnólogo de obra, laboratorio, almacén…):
  escribe y manda fotos o archivos por WhatsApp, como hoy. No entra al sistema.
- **La integración** (n8n + IA): clasifica cada mensaje y lo entrega, como en la 021.
- **El sistema**: guarda lo entregado, crea lo que falta y arma la bitácora del día. Figura como
  «IA WhatsApp» en lo que registra.
- **Residente / director de obra** (panel web): consulta el historial de su obra, revisa lo creado
  automáticamente, completa lo que no se pudo guardar y cierra la bitácora.
- **Gerencia** (panel web): lo mismo que el residente en todas las obras, y además define qué
  reportes espera cada obra.
- **Encargado de planta y gerencia**: anulan en Control Cantera un viaje mal guardado, como hoy.

## Historias de usuario

- H1: Como gerencia quiero que lo que se reporta en el grupo quede guardado sin que nadie lo
  apruebe, para que la información esté en el sistema el mismo día.
- H2: Como gerencia quiero definir qué reportes espera cada obra cada día, para que la bitácora se
  arme cuando ya llegó todo.
- H3: Como residente quiero ver de cada día qué reportes llegaron y cuáles faltan, para saber a
  quién pedirlos.
- H4: Como residente o gerencia quiero revisar lo que el sistema creó solo, para corregirlo si
  quedó mal o repetido.
- H5: Como residente quiero completar lo que no se pudo guardar, para que no se pierda.
- H6: Como residente quiero ver de dónde salió cada dato guardado, para comprobarlo contra el
  mensaje original.

## Requisitos funcionales (criterios de aceptación en EARS)

### Guardado al llegar (H1)

- RF-1: CUANDO la integración entregue un mensaje de un grupo asociado a una obra, EL SISTEMA lo
  guardará en su destino sin esperar la aprobación de una persona.
- RF-2: CUANDO llegue un mensaje cuyo destino sea Control Cantera, EL SISTEMA guardará sus viajes
  en Control Cantera en ese momento.
- RF-3: CUANDO llegue un reporte de almacén, EL SISTEMA guardará sus ingresos y salidas en el
  módulo Almacén en ese momento.
- RF-4: EL SISTEMA no llevará a la bitácora los ingresos y salidas de un reporte de almacén
  (023/RF-40).
- RF-5: CUANDO llegue un mensaje cuyo destino sea la bitácora (reporte diario, personal, control
  de calidad o notas), EL SISTEMA lo dejará en espera de la bitácora de la obra y del día del
  hecho.
- RF-6: CUANDO llegue un mensaje que la IA marcó «ignorar» o «seguimiento», EL SISTEMA no
  guardará nada de él, como en 021/RF-23 y RF-90.
- RF-7: SI la obra del grupo no lleva Control Cantera, ENTONCES EL SISTEMA no guardará los viajes
  del mensaje y los pondrá en «No se pudo guardar» con ese motivo.
- RF-8: SI la obra del grupo no lleva Almacén, ENTONCES EL SISTEMA no guardará el reporte de
  almacén y lo pondrá en «No se pudo guardar» con ese motivo.
- RF-9: SI la integración entrega otra vez un mensaje ya guardado, ENTONCES EL SISTEMA no volverá
  a guardar sus registros.
- RF-10: EL SISTEMA registrará como autor de lo que guarde al usuario de sistema «IA WhatsApp», y
  como origen el mensaje y la persona del grupo que lo mandó.

### Viajes sin duplicar (H1)

- RF-11: CUANDO vaya a guardar un viaje con número de vale, EL SISTEMA buscará en la obra un viaje
  vigente del mismo día con ese vale.
- RF-12: CUANDO vaya a guardar un viaje sin número de vale, EL SISTEMA buscará en la obra un viaje
  vigente del mismo día con la misma volqueta y una hora a 30 minutos o menos.
- RF-13: SI encuentra ese viaje, ENTONCES EL SISTEMA no guardará otro, y dejará en el historial que
  el mensaje repetía un viaje ya guardado.
- RF-14: CUANDO un reporte diga varios viajes de una volqueta en un renglón («TFO420 – 4
  viajes»), EL SISTEMA guardará solo los que falten para llegar a esa cantidad, contando los ya
  guardados de esa volqueta ese día.
- RF-15: SI un viaje trae un número de vale que ya está en otro viaje vigente de la obra de otro
  día, ENTONCES EL SISTEMA lo guardará igual y dejará el aviso de vale repetido en el historial
  (023/RF-45).

### Datos que faltan (H1, H5)

- RF-16: SI a un viaje le falta la hora, ENTONCES EL SISTEMA tomará la hora de la marca de agua de
  la foto, y sin ella la hora en que se mandó el mensaje.
- RF-17: SI a un viaje le falta el destino, ENTONCES EL SISTEMA tomará como destino la obra.
- RF-18: CUANDO el nombre del conductor escrito en un viaje no se reconozca (021/RF-112), EL
  SISTEMA registrará como persona nueva ese nombre (RF-22 a RF-24). *(cambio 2026-10-08)*
- RF-19: SI después de RF-16 a RF-18 a un renglón le sigue faltando un dato obligatorio, ENTONCES
  EL SISTEMA no guardará ese renglón y lo pondrá en «No se pudo guardar» con el dato que falta.
- RF-20: CUANDO un renglón de un mensaje vaya a «No se pudo guardar», EL SISTEMA guardará los demás
  renglones de ese mensaje.
- RF-21: SI la fecha del hecho no se puede leer del mensaje, ENTONCES EL SISTEMA tomará el día en
  que se mandó y lo dirá en el historial (021/RF-62).

### Crear lo que no existe (H4)

- RF-22: CUANDO una persona del mensaje no se reconozca entre las registradas, EL SISTEMA la
  registrará en la obra del grupo, sin acceso al sistema (023/RF-64).
- RF-23: CUANDO vaya a registrar una persona y haya una sola persona registrada que comparte dos o
  más palabras de su nombre (023/RF-65), EL SISTEMA usará esa persona en vez de registrar otra.
- RF-24: SI hay dos o más personas que comparten dos o más palabras de su nombre, ENTONCES EL
  SISTEMA no registrará a nadie y pondrá el renglón en «No se pudo guardar» para que se elija.
- RF-74: SI todas las palabras de un nombre escrito están en el nombre de dos o más personas
  registradas («Diego» con dos personas llamadas Diego), ENTONCES EL SISTEMA no registrará a nadie
  y pondrá el renglón en «No se pudo guardar» para que se elija. *(cambio 2026-10-08)*
- RF-25: EL SISTEMA registrará con el cargo de conductor a la persona nueva que venga como
  conductor de un viaje o como operador de una volqueta.
- RF-26: EL SISTEMA registrará a la persona nueva de un archivo de personal con el cargo que
  propone su hoja (023/RF-62), o «sin definir» si la hoja no dice uno.
- RF-27: CUANDO un material de almacén no se reconozca, EL SISTEMA lo registrará en el almacén de
  la obra con la unidad escrita (023/RF-27, RF-28).
- RF-28: CUANDO un material de cantera de un viaje no se reconozca, EL SISTEMA lo registrará en
  Control Cantera de la obra con el nombre escrito.
- RF-29: CUANDO el origen o el destino de un viaje no se reconozca, EL SISTEMA lo registrará como
  sitio de Control Cantera de la obra con el nombre escrito.
- RF-30: CUANDO la placa de un viaje o de una máquina no se reconozca ni con 021/RF-107, EL SISTEMA
  registrará una volqueta nueva en la obra del grupo con esa placa.
- RF-31: SI la placa escrita tiene menos de cinco letras y cifras, ENTONCES EL SISTEMA no
  registrará la volqueta y pondrá el renglón en «No se pudo guardar».
- RF-32: EL SISTEMA marcará como «creado desde WhatsApp» cada persona, material, sitio o volqueta
  que registre, con el mensaje que lo originó.
- RF-33: EL SISTEMA mostrará en «Creado automáticamente» todo lo registrado con esa marca que nadie
  haya revisado todavía.
- RF-34: CUANDO quien revisa marque como revisado algo de «Creado automáticamente», EL SISTEMA lo
  quitará de esa lista y conservará la marca de origen.
- RF-35: EL SISTEMA permitirá corregir el nombre, el cargo o la placa de lo creado
  automáticamente desde su propio módulo, como cualquier otro registro.
- RF-36: CUANDO quien revisa indique que algo creado automáticamente es la misma persona, material,
  sitio o volqueta que otro ya registrado, EL SISTEMA pasará a ese otro los registros que lo
  usaban y dará de baja el creado.
- RF-75: CUANDO se una un registro creado automáticamente con otro, EL SISTEMA anulará con el
  motivo «Se unió con …» cada viaje vigente que lo usaba y registrará uno igual con el otro
  registro, porque un viaje no se edita (RF-65). *(cambio 2026-10-08, decidido por el usuario)*
- RF-76: SI un viaje o un renglón que usaba el registro unido es de una bitácora cerrada,
  ENTONCES EL SISTEMA no lo tocará y dirá cuántos quedaron sin cambiar. *(cambio 2026-10-08)*

### Lista de reportes esperados (H2)

- RF-37: EL SISTEMA permitirá a gerencia definir, por obra, la lista de reportes que la bitácora
  de cada día espera.
- RF-38: EL SISTEMA ofrecerá como reportes esperados: el reporte diario, el reporte de personal,
  el de control de calidad, el de inicio de actividades y los viajes de cantera.
- RF-39: DONDE gerencia indique quién manda un reporte esperado, EL SISTEMA solo lo dará por
  recibido cuando lo mande esa persona del grupo.
- RF-40: EL SISTEMA aplicará la lista solo a los días que trabaja la obra según su horario (spec
  016).
- RF-41: MIENTRAS una obra no tenga lista de reportes esperados, EL SISTEMA armará la bitácora del
  día con el primer mensaje que llegue para ella.
- RF-42: EL SISTEMA permitirá ver y cambiar la lista de reportes esperados de su obra solo a
  gerencia, y verla al residente.

### Armar la bitácora (H2, H3)

- RF-43: CUANDO haya llegado el último reporte esperado de una obra y un día, EL SISTEMA armará la
  bitácora de ese día con todos los mensajes en espera de esa obra y ese día.
- RF-44: EL SISTEMA juntará los reportes del mismo día con las reglas de 021/RF-88 y RF-92 a RF-93:
  reemplaza personas, máquinas y franjas de clima, y suma actividades, ensayos y notas.
- RF-45: EL SISTEMA dejará abierta la bitácora que arme.
- RF-46: CUANDO un día laborable de una obra llegue a las 12:00 m del día siguiente sin todos sus
  reportes esperados, EL SISTEMA armará la bitácora con los que llegaron.
- RF-47: CUANDO arme una bitácora sin todos los reportes esperados, EL SISTEMA la marcará
  «incompleta» con los reportes que faltaron.
- RF-48: EL SISTEMA permitirá a gerencia y al residente de la obra armar la bitácora de un día
  antes de esa hora con lo que haya llegado («Guardar con lo que hay»).
- RF-49: SI un día no tiene ningún mensaje en espera, ENTONCES EL SISTEMA no armará su bitácora:
  la abre el residente como hoy.
- RF-50: CUANDO llegue un mensaje para un día cuya bitácora ya está armada y abierta, EL SISTEMA lo
  llevará a esa bitácora en ese momento.
- RF-51: SI llega un mensaje para un día cuya bitácora ya está cerrada, ENTONCES EL SISTEMA no lo
  llevará a la bitácora y lo pondrá en «No se pudo guardar» con el camino de 021/RF-42.
- RF-52: SI la bitácora cerrada es la del día de unos viajes, ENTONCES EL SISTEMA guardará igual
  esos viajes en Control Cantera (021/RF-96).
- RF-53: EL SISTEMA llevará a la bitácora como fotografía del día la primera foto de avance del
  reporte diario cuando la bitácora no tenga una.
- RF-73: EL SISTEMA permitirá al residente cambiar la fotografía del día que eligió el sistema
  mientras la bitácora esté abierta.
- RF-54: CUANDO un renglón de la bitácora venga de un mensaje que repetía otro ya guardado, EL
  SISTEMA no lo duplicará.

### Estado del día (H3)

- RF-55: EL SISTEMA mostrará, por obra y por día, cada reporte esperado como recibido o
  pendiente, con quién lo mandó y a qué hora.
- RF-56: EL SISTEMA mostrará si la bitácora del día está en espera, armada, incompleta o cerrada.
- RF-57: EL SISTEMA mostrará el estado del día al residente de esa obra y a gerencia.

### Historial y excepciones (H5, H6)

- RF-58: EL SISTEMA mostrará en el historial cada mensaje entregado, con lo que se guardó y en qué
  módulo.
- RF-59: EL SISTEMA permitirá abrir desde el historial el viaje, el movimiento de almacén o la
  bitácora que guardó cada mensaje.
- RF-60: EL SISTEMA mostrará en «No se pudo guardar» cada renglón pendiente, con su mensaje y el
  dato que falta.
- RF-61: EL SISTEMA permitirá al residente de la obra y a gerencia completar un renglón de «No se
  pudo guardar» y guardarlo.
- RF-62: CUANDO se guarde un renglón de «No se pudo guardar», EL SISTEMA lo quitará de esa lista.
- RF-63: EL SISTEMA permitirá descartar un renglón de «No se pudo guardar» con un motivo
  (021/RF-54 a RF-56).
- RF-64: EL SISTEMA permitirá ver y atender «Creado automáticamente» y «No se pudo guardar» al
  residente de esa obra y a gerencia.

### Corregir lo guardado

- RF-65: EL SISTEMA tratará un viaje guardado desde WhatsApp como cualquier viaje de Control
  Cantera: no se edita, se anula con motivo (010/RF-23 a RF-25).
- RF-66: EL SISTEMA permitirá corregir lo que se guardó en una bitácora mientras esté abierta, como
  hoy.
- RF-67: EL SISTEMA permitirá anular un movimiento de almacén guardado desde WhatsApp como
  cualquier otro movimiento (spec 009).

### Lo que estaba pendiente

- RF-68: CUANDO se active esta funcionalidad, EL SISTEMA procesará los mensajes pendientes de la
  bandeja con RF-1 a RF-54, como si acabaran de llegar.
- RF-69: EL SISTEMA dejará como están los mensajes ya aprobados o descartados antes de este cambio.

### Reglas transversales

- RF-70: EL SISTEMA no esperará la aprobación de una persona para ningún registro que venga de
  WhatsApp.
- RF-71: EL SISTEMA aplicará al guardar las mismas validaciones del registro a mano de cada módulo
  (021/RF-59).
- RF-72: EL SISTEMA mostrará la marca «desde WhatsApp» en cada viaje, movimiento y renglón de
  bitácora que guarde (021/RF-46).

## Lo que cambia de la 021

- Dejan de valer la aprobación por una persona (021/RF-30 a RF-49 como paso obligatorio), RF-64
  (exigir completar antes de aprobar) y RF-84/85 (el residente aprueba los viajes desde la
  bandeja): el sistema guarda solo.
- Dejan de estar fuera de alcance «Que la IA cree registros sin aprobación humana» y «Registrar a
  las personas del grupo que no existen en el sistema».
- Siguen valiendo la recepción y la integración (RF-1 a RF-8), la asociación de grupos a obras
  (RF-9 a RF-14), el reconocimiento de cada sección (RF-60 a RF-111) y el bloqueo con la bitácora
  cerrada (RF-41, RF-42, RF-96).
- La bandeja pasa a ser el historial y las dos listas de excepciones de esta spec.

## Superficies afectadas

- [ ] **Móvil**: sin cambios.
- [x] **Panel web**: el módulo de Reportes de WhatsApp pasa a tener historial, estado del día,
  «Creado automáticamente» y «No se pudo guardar», y la lista de reportes esperados por obra para
  gerencia. Las marcas «creado desde WhatsApp» en Personas, Vehículos, Almacén y Control Cantera.
- [x] **API**: la entrada de la integración guarda lo que recibe. Acciones nuevas del panel para
  la lista de reportes esperados, «Guardar con lo que hay», revisar lo creado y completar o
  descartar lo que no se pudo guardar.
- [ ] **Sincronización**: sin cambios. Nada de esto viaja al celular.
- [x] **Datos**: la lista de reportes esperados por obra; el estado de cada día; las excepciones;
  la marca de origen en personas, vehículos, materiales y sitios; el usuario de sistema «IA
  WhatsApp».
- [x] **Reglas**: viaje repetido (vale o volqueta y hora), cuántos viajes faltan de un renglón
  agregado, cuándo está completo un día, la hora límite, datos por defecto de un viaje, cuándo se
  crea y cuándo se reutiliza algo. Cada una con su caso en `verificar-reglas.ts`.

## Requisitos no funcionales

- Interfaz y mensajes en español.
- Un vale de cantera queda guardado en Control Cantera en menos de 1 minuto desde que la
  integración lo entrega.
- La bitácora de un día con 60 mensajes en espera se arma en menos de 30 segundos.

## Casos límite

- **Sin señal**: no aplica. El operador no interviene. Si el servidor no está cuando la
  integración entrega, ella reintenta y la entrega repetida no duplica nada (RF-9).
- **Evidencia firmada**: lo que va a una bitácora cerrada no entra a ella (RF-51), los viajes sí a
  Control Cantera (RF-52), y un viaje mal guardado se anula con motivo, no se edita (RF-65).
- **Primer arranque**: al activarse se procesan los pendientes de la bandeja (RF-68). Una obra sin
  lista de reportes esperados arma la bitácora con el primer mensaje del día (RF-41).

Además:

- **Fotos seguidas de vales de la misma volqueta** (los 27 del 7-oct): cada número de vale es un
  viaje distinto (RF-11). Solo se descarta una foto si repite un vale.
- **El mismo viaje en el vale y en el reporte diario**: se guarda una vez (RF-11 a RF-14).
- **Nombre del conductor mal escrito** («Eddier Quinceno»): si comparte dos palabras con una sola
  persona, se usa esa persona (RF-23). Si no, se registra una nueva y sale en «Creado
  automáticamente» para unirla (RF-36). No se toma el conductor del preoperacional ni del último
  viaje, aunque la volqueta los tenga: manda lo escrito (021/RF-112).
- **Vale sin destino escrito**: va a la obra (RF-17), y Control Cantera pide el PR y los metros
  de llegada; sin ellos, el viaje va a «No se pudo guardar» y el residente los completa (RF-19,
  RF-71). *(confirmado por el usuario el 2026-10-08)*
- **Volqueta de un tercero**: se registra en la obra marcada (RF-30, RF-32).
- **Placa cortada en la foto** («TFO42…»): menos de cinco caracteres no crea nada y va a «No se
  pudo guardar» (RF-31).
- **Reporte que llega después de la hora límite**: entra a la bitácora si sigue abierta (RF-50).
  Si no, queda en «No se pudo guardar» (RF-51).
- **Día no laborable con mensajes** (un domingo con viajes): los viajes se guardan, y la bitácora
  se arma con el primer mensaje porque la lista no aplica ese día (RF-40, RF-41).
- **Dos reportes diarios del mismo día**: se juntan con las reglas de la 021 (RF-44).
- **Mensaje que la IA no pudo clasificar** (error de la IA): va a «No se pudo guardar» con el
  motivo.

## Fuera de alcance

- Escribir o responder en WhatsApp (avisar en el grupo que falta un reporte).
- Cerrar la bitácora automáticamente: la cierra el residente (RF-45).
- Editar un viaje guardado: se anula y se registra otro (RF-65).
- Dar acceso al sistema a las personas creadas automáticamente.
- Configurar la hora límite por obra: es la misma para todas (RF-46).
- Llevar ensayos al módulo de Laboratorio de la spec 018.
- Notas de voz y videos: se guardan, no se analizan.
- Informes de gerencia de varios días: van en su propia spec.

## Criterios de finalización

- Cada RF tiene cómo comprobarse: un caso en `scripts/verificar-reglas.ts` para las reglas (viaje
  repetido, viajes que faltan, día completo, hora límite, datos por defecto, crear o reutilizar), y
  un paso de demo manual para el resto.
- `npm run verificar`, `npm run typecheck` y `npm run lint` en verde.
- Demo manual del flujo principal, en la obra de pruebas:
  1. Gerencia define para la obra: reporte diario de una persona y reporte de personal.
  2. Llegan 4 fotos de vale, una con un conductor no registrado y otra con la placa mal leída. Los
     4 viajes aparecen en Control Cantera en menos de un minuto, con conductor, y en la sección de
     viajes de la bitácora del día. El conductor nuevo aparece en «Creado automáticamente».
  3. Llega un reporte de almacén. Sus movimientos aparecen en Almacén y no en la bitácora.
  4. Llega el reporte de personal. El estado del día muestra «falta el reporte diario» y la
     bitácora sigue en espera.
  5. Llega el reporte diario, que repite 2 de los viajes. La bitácora se arma sola, abierta, con
     clima, actividades, maquinaria, personal, control de calidad y notas, y los viajes no se
     duplican.
  6. Un viaje sin hora en un día sin marca de agua queda con la hora del mensaje. Uno con la placa
     cortada aparece en «No se pudo guardar». El residente lo completa y se guarda.
  7. Al día siguiente, otra obra a la que le faltó el reporte diario tiene su bitácora armada a
     las 12:00 m, marcada «incompleta».
  8. Los 27 vales del 7-oct de Consorcio Magdalena, pendientes en la bandeja, quedan como viajes al
     activar la funcionalidad.

## Dudas abiertas

Ninguna. Resueltas el 2026-10-08:
- RF-36: unir un registro creado automáticamente con el que ya existía entra en esta spec (botón
  «Es el mismo que…»).
- RF-53, RF-73: la fotografía del día la pone el sistema y el residente la puede cambiar.
