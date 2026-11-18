# Spec 046 — Requisición en las obras y en GeoLab, con su cadena de aprobación, y la Administradora de Elemental

> Estado: **Cumplida el 2026-11-17** (`validacion.md`, 91/91 RF vigentes, con el cambio del 2026-11-17, D15–D19) — antes Cumplida el 2026-11-16 con 85/85 · **Aprobada por Diego el 2026-11-16** (entrevista D1–D6, dudas D7–D9; clarificación D10–D14 del mismo día) · Fecha: 2026-11-16 · Segunda de la tanda 045–048 (plan del 2026-11-13). **Modifica la 036 (compras), la 037 (tesorería) y la 040 (Auxiliar Administrativa).** La 047 hará la requisición de OCC con su formato y la 048 amarrará las de obra a la planificación. · **Modificada por la spec 050** (2026-11-18): las requisiciones filtran por estado con cifras; «Nueva requisición» va en el encabezado; quien solo lleva requisiciones entra al Asistente (D12); lo aprobado se avisa abajo — ver `specs/050-interfaz-ordenada-y-responsive/spec.md`

## Contexto y objetivo

Hoy una obra o GeoLab que necesita algo lo pide por dos módulos distintos: **Solicitudes de compra** (renglones con cantidad, spec 036) y **Solicitudes de pago** (un beneficiario y un valor, spec 037), cada uno con su número (SC, SP). Las dos van directo a Elemental, donde la Gerencia o la Auxiliar Administrativa las aprueban en un solo paso, sin que el Director de Obra ni el Director de Proyectos las vean pasar. Tampoco queda para cuándo y para qué se necesita cada cosa pedida: la fecha y la justificación son de la solicitud entera. Esta spec junta los dos en un solo módulo, **Requisición**, para las obras y GeoLab. Cada requisición sigue el camino de quien responde por el gasto —Residente, Director de Obra, Director de Proyectos y la **Administradora de Elemental**, un acceso nuevo—, y cada renglón dice para cuándo y para qué. La Auxiliar Administrativa deja de aprobar y se queda pagando. Así cada peso que sale de una obra lo vio quien manda en ella antes de que Elemental lo apruebe, y la 048 podrá amarrar cada renglón a lo planeado.

## Usuarios / actores

- **Almacenista** (panel web): pide requisiciones de su obra. Su requisición la aprueba primero el Residente. No ve valores.
- **Residente** (panel web): pide requisiciones de su obra y aprueba, devuelve o rechaza las del Almacenista.
- **Director de Obra** (panel web): pide requisiciones de sus obras y aprueba, devuelve o rechaza las que llegan a su paso.
- **Director de Proyectos** (panel web): pide requisiciones de cualquier obra y aprueba, devuelve o rechaza las que llegan a su paso.
- **Laboratorista** (panel web): pide requisiciones de GeoLab.
- **Administradora de Elemental** (panel web, acceso nuevo): último paso de la cadena; aprueba, devuelve, rechaza y cancela; registra las compras; anula compras y pagos. En Elemental ve lo que hoy ve la Auxiliar Administrativa.
- **Auxiliar Administrativa** (panel web): registra los pagos. Conserva Recursos Humanos, Documentos y los cortes, pero ya no aprueba.
- **Gerencia** (panel web, rol `admin`): puede todo lo de la Administradora, en cualquier paso; también pide desde cualquier lugar.
- **Encargado de OCC**: sus solicitudes de OCC no cambian en esta spec (las cambia la 047), salvo quién las aprueba (RF-66).
- **Operador** y **Encargado de planta**: sin cambios; no ven requisiciones.

## Historias de usuario

- H1: Como Residente, Almacenista, Director de Obra, Director de Proyectos o Laboratorista quiero pedir en un solo módulo lo que necesito comprar o pagar, para no tener que escoger entre dos módulos que se manejan igual.
- H2: Como quien pide quiero decir, renglón por renglón, para cuándo necesito cada cosa y para qué, porque no todo lo de una requisición hace falta el mismo día ni para lo mismo.
- H3: Como Director de Obra y Director de Proyectos quiero aprobar, devolver o rechazar las requisiciones de mis obras antes de que lleguen a Elemental, para responder por el gasto de la obra.
- H4: Como Administradora de Elemental quiero recibir solo las requisiciones que ya aprobó la obra, aprobarlas o devolverlas, y registrar la compra, para que Elemental no apruebe nada que la obra no haya visto.
- H5: Como Auxiliar Administrativa quiero ver lo aprobado y registrar su pago, sin la responsabilidad de aprobar.
- H6: Como quien pide quiero ver en qué paso va mi requisición y quién la tiene, para no llamar a preguntar.

## Requisitos funcionales (criterios de aceptación en EARS)

### El módulo Requisición (H1)

- ~~RF-1: EL SISTEMA muestra en cada obra y en GeoLab un módulo **Requisiciones** en lugar de «Solicitudes de compra» y «Solicitudes de pago».~~ **Sustituido por RF-86 (2026-11-17).**
- RF-86: EL SISTEMA muestra en cada obra, en GeoLab y en OCC un módulo **Requisiciones** en lugar de «Solicitudes de compra» y «Solicitudes de pago» (D15).
- RF-2: EL SISTEMA muestra Requisiciones de la obra al Residente, al Almacenista y a los Directores de Obra de esa obra, al Director de Proyectos, a la Administradora de Elemental y a la Gerencia.
- RF-3: EL SISTEMA muestra Requisiciones de GeoLab al Laboratorista, a la Administradora de Elemental y a la Gerencia.
- RF-4: EL SISTEMA deja escoger, al crear una requisición, si es **de compra** o **de pago**.
- RF-5: EL SISTEMA da a cada requisición nueva un número consecutivo del grupo con el prefijo **RQ** («RQ-0001»), uno solo para las de compra y las de pago.
- RF-6: EL SISTEMA muestra en la lista de Requisiciones de un lugar también sus solicitudes de compra y de pago anteriores a esta spec, cada una con su número SC o SP.
- RF-7: EL SISTEMA muestra en cada requisición si es de compra o de pago.

### Pedir: lo que lleva cada requisición (H1, H2)

- RF-8: EL SISTEMA deja crear una requisición a quien la ve en ese lugar según RF-2 o RF-3, salvo a la Administradora de Elemental.
- RF-9: EL SISTEMA guarda en la cabecera de una requisición el lugar, la urgencia (normal o urgente) y una nota general opcional.
- RF-10: EL SISTEMA guarda en cada renglón de una requisición de compra qué se necesita (texto, o un material del catálogo del almacén si es de una obra con Almacén), la cantidad, la unidad, **la fecha en que se necesita** y **para qué**.
- RF-11: SI un renglón de compra no tiene fecha en que se necesita o no tiene para qué, ENTONCES EL SISTEMA no guarda la requisición y dice qué renglón y qué le falta.
- RF-12: SI la fecha en que se necesita un renglón es anterior a hoy, contado con la fecha de Colombia, ENTONCES EL SISTEMA no guarda la requisición y dice qué renglón.
- RF-13: EL SISTEMA guarda en la cabecera de una requisición de compra, opcionales, el proveedor sugerido, el valor estimado y los adjuntos (cotizaciones, fotos, fichas técnicas), como la 036 (D14).
- RF-14: EL SISTEMA guarda en una requisición de pago lo que hoy lleva la solicitud de pago de la 037 (beneficiario, documento, concepto, valor y adjuntos), con una sola fecha en que se necesita y un solo para qué.
- RF-15: SI una requisición de compra no tiene ningún renglón, o un renglón no tiene descripción o su cantidad no es mayor que cero, ENTONCES EL SISTEMA no la guarda y dice qué falta, como la 036 (RF-9).
- RF-72: SI a una requisición de pago le falta el beneficiario, el concepto o el para qué, o su valor no es mayor que cero, o su fecha es anterior a hoy, ENTONCES EL SISTEMA no la guarda y dice qué falta junto a su campo, como la 037 (RF-8).
- RF-16: EL SISTEMA marca **Vencida** una requisición de compra cuando la fecha más cercana de sus renglones sin recibir del todo ya pasó.
- RF-17: EL SISTEMA marca **Vencida** una requisición de pago cuando su fecha ya pasó sin pagarse del todo.

### La cadena de aprobación (H3, H4)

- RF-18: EL SISTEMA lleva cada requisición de una obra por estos pasos, en orden: Residente, Director de Obra, Director de Proyectos y Administradora de Elemental.
- RF-19: EL SISTEMA lleva cada requisición de GeoLab directo al paso de la Administradora de Elemental.
- RF-20: CUANDO el Almacenista envía una requisición, EL SISTEMA la deja en el paso del Residente.
- RF-21: CUANDO quien envía una requisición es uno de los pasos de la cadena, EL SISTEMA la deja en el paso siguiente al suyo.
- RF-22: CUANDO la Gerencia envía una requisición, EL SISTEMA la deja en el paso de la Administradora de Elemental.
- RF-23: SI la obra no tiene una persona activa en un paso que no es el de la Administradora, ENTONCES EL SISTEMA salta ese paso, y los siguientes que tampoco la tengan, hasta el primero que sí.
- RF-73: EL SISTEMA da por ocupado el paso del Director de Proyectos cuando hay al menos un Director de Proyectos activo en el grupo, y en ese paso puede actuar cualquiera de ellos.
- RF-74: SI no hay ninguna Administradora de Elemental activa, ENTONCES EL SISTEMA deja la requisición esperando en el paso de la Administradora, sin saltarlo (D10).
- RF-75: MIENTRAS no hay ninguna Administradora de Elemental activa, EL SISTEMA avisa en la bandeja de la Gerencia que las requisiciones de ese paso la esperan a ella (D10).
- RF-24: CUANDO el sistema salta un paso, EL SISTEMA anota en la historia de la requisición qué paso se saltó y por qué.
- RF-25: MIENTRAS una requisición está en un paso, EL SISTEMA deja aprobarla, devolverla o rechazarla a quien ocupa ese paso en ese lugar.
- RF-26: MIENTRAS una requisición está en cualquier paso, EL SISTEMA deja aprobarla, devolverla o rechazarla también a la Gerencia, salvo lo que dice RF-76.
- RF-76: SI quien va a aprobar, devolver o rechazar una requisición es quien la pidió, ENTONCES EL SISTEMA no lo deja, en ningún paso (D12).
- RF-77: CUANDO la Gerencia pide una requisición y no hay ninguna Administradora activa, EL SISTEMA deja que la apruebe otra persona de la Gerencia (D12).
- RF-27: CUANDO alguien que no es la Gerencia aprueba una requisición en un paso que no es el último, EL SISTEMA la pasa al paso siguiente.
- RF-28: CUANDO se aprueba una requisición en el paso de la Administradora de Elemental, EL SISTEMA la deja **Aprobada**.
- RF-29: CUANDO la Gerencia aprueba una requisición en cualquier paso, EL SISTEMA la deja **Aprobada** de una vez, sin pasar por los pasos que faltaban (D7).
- RF-30: CUANDO alguien devuelve una requisición, EL SISTEMA pide qué debe corregirse y la deja **Devuelta** a quien la pidió.
- RF-31: CUANDO quien la pidió vuelve a enviar una requisición devuelta, EL SISTEMA la lleva de nuevo por la cadena desde su primer paso, según RF-20 a RF-23.
- RF-78: SI al corregir una requisición devuelta se cambia de compra a pago o de pago a compra, ENTONCES EL SISTEMA no guarda la corrección y dice que para eso se cancela y se crea otra.
- RF-32: CUANDO alguien rechaza una requisición, EL SISTEMA pide el motivo y la deja **Rechazada**, sin poder volver a abrirse.
- RF-33: EL SISTEMA guarda en la historia de la requisición cada aprobación, devolución, rechazo y salto, con quién, en qué paso, cuándo y el motivo si lo hay.
- RF-34: EL SISTEMA deja a la Administradora de Elemental y a la Gerencia, al aprobar una requisición de compra, quitar renglones o bajar cantidades, y anota qué cambió, como la 036 (RF-13) (D11).
- RF-79: EL SISTEMA deja a la Administradora de Elemental y a la Gerencia, al aprobar una requisición de pago, aprobar un valor menor que el pedido, y lo anota, como la 037 (RF-11) (D11).
- RF-80: EL SISTEMA no deja al Residente, al Director de Obra ni al Director de Proyectos cambiar renglones, cantidades ni valores al aprobar: si algo no les cuadra, la devuelven (D11).
- RF-81: SI al aprobar se quitarían todos los renglones de una requisición de compra, ENTONCES EL SISTEMA no lo deja y dice que para eso se rechaza.
- RF-35: MIENTRAS una requisición está Enviada (en cualquier paso) o Devuelta, EL SISTEMA deja a quien la pidió cancelarla con un motivo.
- RF-36: MIENTRAS una requisición está Devuelta, EL SISTEMA deja a quien la pidió corregirla. *(Cambia la 036 y la 037, que dejaban corregir también mientras estaba Enviada: con la cadena, lo que un paso ya aprobó no cambia sin que se devuelva.)*
- RF-37: MIENTRAS una requisición no está Aprobada, Rechazada ni Cancelada, EL SISTEMA deja cancelarla con un motivo a la Administradora de Elemental y a la Gerencia.

### Después de aprobada (H4, H5)

- ~~RF-38: CUANDO una requisición de compra queda Aprobada, EL SISTEMA la lleva a Compras de Elemental para registrar la compra, como la 036.~~ **Sustituido por RF-89 (2026-11-17).**
- RF-89: CUANDO una requisición de compra queda Aprobada, EL SISTEMA la deja en Requisiciones de Elemental para registrar la compra, anularla y marcar lo recibido, como la 036 (D15).
- RF-90: EL SISTEMA no muestra en Elemental un módulo Compras aparte: lo que hacía —ver las solicitudes del grupo, registrar y anular compras, recibir— se hace en Requisiciones de Elemental (D15).
- RF-91: EL SISTEMA muestra en Requisiciones de Elemental, además de las que esperan aprobación (RF-47), las aprobadas por comprar, las compradas sin recibir del todo y las cerradas, de todo el grupo (D15).
- RF-92: EL SISTEMA muestra Requisiciones de Elemental también a la Auxiliar Administrativa, sin aprobar, devolver, rechazar ni registrar o anular compras, para que marque lo recibido (RF-85) (D15).
- RF-93: EL SISTEMA muestra en Tesorería de Elemental el gasto por obra y por empresa que hoy muestra Compras en su pestaña «Gasto», a quienes hoy lo ven (D17).
- RF-39: EL SISTEMA deja registrar y anular compras a la Administradora de Elemental y a la Gerencia.
- RF-40: CUANDO una requisición de pago queda Aprobada, EL SISTEMA la lleva a Tesorería para pagarla, como la 037.
- RF-41: EL SISTEMA deja registrar pagos de requisiciones de pago y de compras a la Auxiliar Administrativa, a la Administradora de Elemental y a la Gerencia.
- RF-42: EL SISTEMA deja anular pagos a la Administradora de Elemental y a la Gerencia.
- RF-43: EL SISTEMA conserva el recibir de la 036 (RF-20 a RF-22) en las requisiciones de compra.
- RF-44: EL SISTEMA conserva para las requisiciones los estados posteriores a la aprobación de la 036 (Comprada, Recibida en parte, Recibida) y de la 037 (Pagada en parte, Pagada).

### Bandejas y seguimiento (H3, H4, H6)

- RF-45: EL SISTEMA muestra arriba en Requisiciones de un lugar, a cada persona, las que esperan su aprobación; para la Gerencia, las que están en el paso de la Administradora.
- RF-82: MIENTRAS una requisición recorre la cadena, EL SISTEMA muestra su estado como «En aprobación» con el nombre del paso en que está (por ejemplo, «En aprobación: Director de Obra»).
- RF-46: EL SISTEMA muestra en cada requisición en qué paso está y quién puede aprobarla en ese paso.
- RF-47: EL SISTEMA muestra a la Administradora de Elemental y a la Gerencia, en Elemental, una sola bandeja **Requisiciones** con las requisiciones del grupo de compra y de pago que esperan el paso de la Administradora, las urgentes arriba y luego por la fecha más cercana en que se necesitan (D8).
- RF-83: EL SISTEMA muestra en esa misma bandeja las solicitudes de compra y de pago anteriores a esta spec y las de OCC que esperan aprobación, con su número SC o SP y la marca «Anterior» u «OCC» (D13). *(Desde RF-86, las nuevas de OCC son requisiciones RQ; la marca «OCC» queda para las SC y SP de OCC anteriores al cambio.)*
- RF-84: EL SISTEMA muestra a la Auxiliar Administrativa, en Tesorería, las requisiciones de pago Aprobadas y las compras por pagar, para pagarlas, y no las que todavía recorren la cadena.
- RF-48: EL SISTEMA muestra en esa bandeja cuántas esperan el paso de la Administradora, cuántas son urgentes y cuántas están vencidas.
- RF-49: EL SISTEMA muestra en Requisiciones de un lugar, primero, las abiertas y después las cerradas (Recibida, Pagada, Rechazada, Cancelada).
- RF-50: EL SISTEMA deja buscar requisiciones por número (RQ, SC o SP), texto de los renglones, beneficiario, proveedor o quien pidió, sin distinguir mayúsculas ni tildes.
- RF-51: EL SISTEMA filtra las requisiciones por tipo (compra o pago), paso, estado, urgencia y rango de fechas.
- RF-52: EL SISTEMA no muestra al Almacenista los valores de las requisiciones, de las compras ni de los pagos, salvo los de las requisiciones de pago que pidió él (036, RF-31; 037, RF-5a).

### Las solicitudes anteriores (H1)

- RF-53: EL SISTEMA conserva el número SC o SP de cada solicitud de compra o de pago anterior a esta spec.
- RF-54: MIENTRAS una solicitud anterior a esta spec está Enviada o Devuelta, EL SISTEMA la deja en el paso único de la 036 o la 037, sin pasarla por la cadena.
- RF-55: EL SISTEMA deja aprobar, devolver y rechazar las solicitudes anteriores a esta spec a la Administradora de Elemental y a la Gerencia.
- RF-56: EL SISTEMA no borra ni cambia la historia de ninguna solicitud anterior a esta spec.

### La Administradora de Elemental

- RF-57: EL SISTEMA tiene un acceso **Administradora de Elemental**, de la empresa Elemental y sin obra.
- RF-58: EL SISTEMA deja dar el acceso de Administradora de Elemental solo a la Gerencia.
- RF-59: EL SISTEMA muestra a la Administradora de Elemental, en Elemental, todos los módulos que ve hoy la Auxiliar Administrativa.
- RF-60: EL SISTEMA deja a la Administradora de Elemental, en Recursos Humanos, Documentos y cortes, lo mismo que a la Auxiliar Administrativa.
- RF-61: EL SISTEMA no deja a la Administradora de Elemental dar accesos al panel.

### La Auxiliar Administrativa

- RF-62: EL SISTEMA no deja a la Auxiliar Administrativa aprobar, devolver, rechazar ni cancelar requisiciones, ni solicitudes de compra o de pago anteriores o de OCC.
- RF-63: EL SISTEMA no deja a la Auxiliar Administrativa registrar ni anular compras, ni anular pagos.
- RF-64: EL SISTEMA conserva a la Auxiliar Administrativa lo que hoy tiene en Recursos Humanos, Documentos y cortes.
- RF-85: EL SISTEMA conserva a la Auxiliar Administrativa marcar lo recibido de una requisición de compra, como la 040 (RF-5), aunque ya no registre compras (decidido al planificar, 2026-11-16).

### OCC hasta la 047

- ~~RF-65: EL SISTEMA conserva en OCC las Solicitudes de compra y de pago de la 036 y la 037, con su paso único, hasta la 047.~~ **Sustituido por RF-86 a RF-88 (2026-11-17).**
- RF-87: EL SISTEMA muestra Requisiciones de OCC a quienes hoy ven las Solicitudes de compra y de pago de OCC, a la Administradora de Elemental y a la Gerencia, y deja crear una a quien hoy puede pedirlas allí (D16).
- RF-88: EL SISTEMA lleva cada requisición de OCC directo al paso de la Administradora de Elemental, como las de GeoLab (RF-19), hasta que la 047 le dé su formato (D16).
- RF-66: EL SISTEMA deja aprobar, devolver y rechazar las solicitudes de OCC a la Administradora de Elemental y a la Gerencia.

### Reglas transversales

- RF-67: EL SISTEMA comprueba en el servidor que quien aprueba, devuelve o rechaza ocupa el paso en que está la requisición, o es la Gerencia.
- RF-68: SI dos personas actúan a la vez sobre la misma requisición, ENTONCES EL SISTEMA deja pasar la primera y a la segunda le dice que cambió, sin pisar en silencio.
- RF-69: EL SISTEMA no muestra una requisición a quien no la ve según RF-2 o RF-3, ni por su dirección.
- RF-70: EL SISTEMA no borra requisiciones, renglones, compras, pagos ni adjuntos: se cancelan, se rechazan o se anulan con motivo.
- RF-94: CUANDO quien la pidió corrige una requisición devuelta, o una solicitud SC anterior, EL SISTEMA marca como reemplazados los renglones de antes, con cuándo y en qué corrección, y muestra solo los vigentes; no los borra (constitución, principio 4) (D18).
- RF-71: CUANDO un paso de la cadena que no es el de la Administradora se queda sin ninguna persona activa en esa obra (porque se fue, quedó inactiva o cambió de acceso), EL SISTEMA pasa al paso siguiente las requisiciones que esperaban en él y lo anota en su historia, como en RF-24 (D9).

## Superficies afectadas

- [ ] **Móvil**: no cambia.
- [x] **Panel web**: el módulo Requisiciones en cada obra, en GeoLab y en OCC (lista con «esperan mi aprobación», nueva requisición de compra o de pago, detalle con paso, cadena e historia); Requisiciones de Elemental con la bandeja de la Administradora y lo que antes hacía Compras (registrar, anular, recibir); sin módulo Compras en Elemental; Tesorería con el gasto que antes estaba en Compras; Personas con el acceso Administradora de Elemental; el menú de las obras, de GeoLab, de OCC y de Elemental.
- [x] **API**: crear, corregir, enviar, cancelar, aprobar, devolver y rechazar requisiciones; listar y buscar; los permisos nuevos en compras, pagos y personas.
- [ ] **Sincronización**: no cambia.
- [x] **Datos**: requisiciones (de compra y de pago) con su paso y su historia; fecha y para qué por renglón; consecutivo RQ; el acceso nuevo; las solicitudes SC y SP anteriores siguen y se ven en la misma lista; los renglones reemplazados al corregir quedan marcados, no borrados (RF-94).
- [x] **Reglas**: la cadena (pasos, arranque según quién pide, saltos), quién actúa en cada paso, validaciones por renglón, vencidas, permisos del acceso nuevo y de la Auxiliar; con casos en `verificar-reglas.ts`.

## Requisitos no funcionales

- La lista de Requisiciones de una obra y la bandeja de la Administradora, con 500 requisiciones, cargan en menos de 2 s.
- Todo el texto en español; valores en pesos con separador de miles.

## Casos límite

- **Sin señal**: no aplica; es solo panel. El operador y el celular no cambian.
- **Evidencia firmada**: no toca preoperacionales ni bitácoras. Lo aprobado, comprado o pagado tampoco se edita: se anula con motivo, como en la 036 y la 037.
- **Primer arranque**: una obra sin ninguna requisición muestra la lista vacía y el botón para crear la primera; sus solicitudes SC y SP anteriores aparecen igual.
- **Obra con dos Directores de Obra**: cualquiera de los dos puede actuar en ese paso; el primero que actúa la pasa.
- **Director que deja la obra con una requisición en su paso**: la requisición sigue en su paso para el otro Director de Obra; si ya no hay ninguno, salta en ese momento al paso siguiente y queda anotado (RF-71, D9).
- **Residente que es a la vez quien pide**: su requisición arranca en el Director de Obra (RF-21); nadie se aprueba a sí mismo (RF-76).
- **Quien pidió una requisición Devuelta ya no está** (inactivo o retirado): nadie más puede corregirla; la Administradora o la Gerencia la cancelan con motivo (RF-37).
- **Sin ninguna Administradora el día que entra la spec**: lo que llega a ese paso espera, y la Gerencia lo aprueba mientras se crea la cuenta (RF-74, RF-75).
- **Varios pasos seguidos sin nadie** (obra sin Residente ni Director de Obra): se saltan todos hasta el primero con alguien (RF-23).
- **La pide la Gerencia en una obra**: va directo a la Administradora (RF-22); si no hay ninguna, la aprueba otra persona de la Gerencia (RF-77).
- **Requisición devuelta y corregida que cambia mucho**: recorre la cadena otra vez desde el principio (RF-31), así nadie aprueba algo que cambió después de verlo.
- **Obra inactiva**: no deja crear requisiciones nuevas; las abiertas se pueden seguir resolviendo.
- **Persona retirada**: sus requisiciones siguen con su nombre; la cadena sigue con quien ocupe cada paso.
- **Solicitud anterior aprobada por la Auxiliar** antes de esta spec: queda como estaba; su historia conserva quién la aprobó.
- **Pruebas en dev**: lo de prueba lleva PRUEBA-046 y vive solo en la base de desarrollo; nunca se siembra ni se migra a producción. La limpieza acotada cierra lo que quedó abierto, sin borrar (D19).
- **Dirección vieja de Compras de Elemental** (un enlace guardado, `…/elemental/compras`): lleva a Requisiciones de Elemental, como las direcciones viejas de las solicitudes de una obra (RF-86, RF-90).
- **SC o SP de OCC abierta el día del cambio**: sigue con su paso único y aparece en la bandeja con la marca «OCC» (RF-83) y en la lista de Requisiciones de OCC con su número.
- **Corregir dos veces la misma devuelta**: cada corrección deja marcados como reemplazados los renglones que había; la historia dice cuáles se cambiaron cada vez (RF-94).

## Fuera de alcance

- La requisición de OCC con su formato del Excel (spec 047). Mientras tanto, OCC pide con la requisición de esta spec, directo a la Administradora (RF-88).
- Rehacer Tesorería de Elemental como control financiero del grupo (lo comprado, lo gastado, lo pagado y la información financiera de cada empresa y proyecto): Diego pidió tenerlo en cuenta; será su propia spec. Aquí solo recibe el gasto que estaba en Compras (RF-93).
- Amarrar los renglones de una requisición a la planificación, y avisar cuando se pasa de lo planeado (spec 048).
- Aprobaciones por monto o reglas distintas por tipo de gasto: la cadena es la misma para todo valor.
- Un maestro de proveedores o de beneficiarios.
- Que el ingreso al Almacén se cree solo al recibir (sigue como la 036, D5).
- Avisos por correo, WhatsApp o notificaciones a quien le toca aprobar.
- Delegar un paso en otra persona (vacaciones, reemplazos), salvo el salto de RF-23.
- Convertir las solicitudes SC y SP anteriores en RQ o hacerlas pasar por la cadena.
- Cambios en Recursos Humanos, Documentos o cortes, más allá de quién los ve (RF-59, RF-60, RF-64).
- Que el asistente de IA consulte las requisiciones.

## Criterios de finalización

- Cada RF tiene cómo comprobarse: caso en `scripts/verificar-reglas.ts` (cadena, arranque según quién pide, saltos, quién actúa en cada paso, validaciones por renglón, vencidas, permisos de la Administradora y de la Auxiliar) o paso de demo manual descrito.
- `npm run verificar`, `npm run typecheck` y `npm run lint` en verde.
- Demo manual en Chrome, en una obra PRUEBA-046 con Residente, Almacenista, Director de Obra y Director de Proyectos:
  - el Almacenista pide una requisición de compra con dos renglones de fechas y para qué distintos; recibe su número RQ; la ve en el paso del Residente, sin valores;
  - el Residente la aprueba; el Director de Obra la devuelve pidiendo una corrección; el Almacenista la corrige y la reenvía; vuelve al Residente;
  - el Residente, el Director de Obra y el Director de Proyectos la aprueban; la Administradora la ve en su bandeja, baja una cantidad y la aprueba; registra la compra; el Almacenista recibe;
  - el Director de Obra pide una requisición de pago; arranca en el Director de Proyectos; la Administradora la aprueba; la Auxiliar registra el pago; la Auxiliar no tiene botones para aprobar;
  - en una obra sin Director de Obra, una requisición del Residente salta ese paso y su historia lo dice;
  - el Laboratorista pide en GeoLab y la requisición va directo a la Administradora;
  - las solicitudes SC y SP anteriores de la obra se ven en la misma lista con su número;
  - limpieza acotada de lo PRUEBA-046.

## Decisiones de la entrevista (2026-11-16)

- D1: Los tres pasos de la cadena (Director de Obra, Director de Proyectos, Administradora) y el Residente con lo del Almacenista pueden aprobar, devolver o rechazar (RF-25). Una devuelta vuelve a quien la pidió y recorre la cadena otra vez desde el principio (RF-30, RF-31).
- D2: En GeoLab va directo a la Administradora (RF-19). Si falta la persona de un paso, se salta y queda anotado (RF-23, RF-24). Quien está en la cadena arranca en el paso siguiente al suyo (RF-21). Lo que pide la Gerencia pasa solo por la Administradora (RF-22).
- D3: Un solo consecutivo RQ para las nuevas (RF-5). Las SC y SP anteriores conservan su número, se ven en la misma lista (RF-6, RF-53) y terminan con su paso único, aprobadas por la Administradora o la Gerencia (RF-54, RF-55).
- D4: La Administradora aprueba, devuelve, rechaza, cancela, registra las compras y anula, y en Elemental ve lo que hoy ve la Auxiliar (RF-37, RF-39, RF-42, RF-59, RF-60). La Auxiliar registra los pagos y conserva Recursos Humanos, Documentos y cortes, sin aprobar (RF-41, RF-62 a RF-64).
- D5: Cada renglón de compra lleva su fecha en que se necesita y su para qué, obligatorios; la urgencia y una nota general van en la cabecera; las de pago siguen con una fecha y un para qué (RF-9 a RF-14). Vencida: cuando pasa la fecha más cercana sin recibir (RF-16).
- D6: Lo del Almacenista lo aprueba primero el Residente (RF-20). Todos los de la obra ven todas las requisiciones de su obra, con «las que esperan mi aprobación» arriba (RF-2, RF-45). El Almacenista sigue sin ver valores (RF-52).

### Dudas resueltas (2026-11-16)

- D7: La aprobación de la Gerencia en cualquier paso deja la requisición Aprobada de una vez (RF-29).
- D8: En Elemental, una sola bandeja «Requisiciones» con las de compra y las de pago (RF-47); después de aprobadas, las de compra se registran en Compras y las de pago se pagan en Tesorería, como hoy (RF-38, RF-40).
- D9: Si un paso se queda sin nadie con requisiciones esperando, saltan en ese momento al siguiente y queda anotado (RF-71).
- Incluido sin objeción: una requisición solo se corrige cuando está Devuelta (RF-36), no mientras recorre la cadena.

### Clarificación (2026-11-16)

- D10: Sin Administradora activa, el último paso no se salta: espera, la Gerencia puede aprobar y su bandeja lo avisa (RF-74, RF-75).
- D11: Recortar al aprobar (quitar renglones, bajar cantidades, un valor menor) lo hacen solo la Administradora y la Gerencia; los demás pasos devuelven (RF-34, RF-79, RF-80).
- D12: Nadie aprueba, devuelve ni rechaza lo que pidió él mismo; lo de la Gerencia lo aprueba la Administradora, o sin ella otra persona de la Gerencia (RF-76, RF-77).
- D13: Las SC y SP anteriores y las de OCC se aprueban en la misma bandeja «Requisiciones» de Elemental, marcadas (RF-83).
- D14: Proveedor sugerido, valor estimado y adjuntos van en la cabecera, como la 036; el renglón lleva qué, cantidad, unidad, material del catálogo, fecha y para qué (RF-10, RF-13).
- Precisado sin preguntar: el salto se repite por varios pasos vacíos (RF-23); el paso del Director de Proyectos cuenta con cualquiera activo del grupo (RF-73); «hoy» es la fecha de Colombia (RF-12); una devuelta no cambia de compra a pago (RF-78); quitar todos los renglones no vale (RF-81); el estado «En aprobación» con su paso (RF-82); qué ve la Auxiliar en Tesorería (RF-84); RF-15, RF-34 y RF-66 enumerados o partidos.

### Cambio (2026-11-17)

- D15: Requisiciones y Compras son un solo módulo: en Elemental se quita Compras y su trabajo pasa a Requisiciones (RF-89 a RF-92); en OCC, GeoLab y las obras solo queda Requisiciones (RF-86).
- D16 (aprobada el 2026-11-17): hasta la 047, la requisición de OCC va directo a la Administradora, como la de GeoLab; la piden quienes hoy piden en OCC (RF-87, RF-88).
- D17 (aprobada el 2026-11-17): la pestaña «Gasto» de Compras pasa a Tesorería, que Diego quiere como el control financiero de Elemental (RF-93).
- D18 (aprobada el 2026-11-17): RF-70 no se relaja, porque la constitución (principio 4, «Nada se borra») no lo permite: al corregir, los renglones de antes se marcan como reemplazados en lugar de borrarse (RF-94). Arregla también la corrección de las SC de la 036, que los borraba.
- D19: los datos de prueba se quedan en desarrollo (`neondb`); producción nunca los recibe.

## Dudas abiertas

- Ninguna. La spec dice «Administradora de Elemental» porque así la nombró Diego; el acceso vale igual para un hombre o una mujer en el cargo.
