# Spec 037 — Tesorería: solicitudes de pago, pagos y cortes financieros

> Estado: **Cumplida en dev** el 2026-10-29 (ver `validacion.md`); sube a producción con la T23 de la 033 · aprobada y plan aprobado el 2026-10-29 · Fecha: 2026-10-29
> Respuesta del usuario del 2026-10-29: de acuerdo con todas las propuestas de D1 a D10 (abajo, «Dudas resueltas»).

## Contexto y objetivo

Hoy, cuando una obra, OCC o Geolab necesita que se le pague a alguien —un subcontratista, un transportador, el alquiler de una máquina, un anticipo, un reembolso de caja menor—, lo pide por WhatsApp o por llamada, y la cuenta de cobro o la factura llegan por correo. Elemental, que lleva la tesorería de todo el grupo desde la spec 033, no tiene un solo lugar donde ver:
- qué pagos se pidieron, para quién, por cuánto y para cuándo;
- cuáles se aprobaron, cuáles se pagaron, cuándo y con qué comprobante;
- qué compras de la spec 036 ya se compraron y todavía no se han pagado.

Además, la spec 033 sacó del menú la «Información financiera» (los **cortes**: saldo, cuentas por pagar y por cobrar de cada empresa y cada obra) y dijo que se registrarían desde Tesorería de Elemental. Las tarjetas de Inicio siguen leyendo esos cortes.

Esta spec llena **Solicitudes de pago** (en cada obra, OCC y Geolab) y **Tesorería** (en Elemental), con el mismo patrón de Compras: quien está en el lugar **pide**, la gerencia **aprueba, rechaza o devuelve** y **registra el pago** con su comprobante, y todo queda con quién y cuándo; nada se borra. Tesorería también muestra las **compras por pagar** y vuelve a dar pantalla a los **cortes financieros**.

## Usuarios / actores

- **Residente / director de obra** (panel web): pide pagos para su obra y sigue los de su obra.
- **Almacenista** (panel web): pide pagos para su obra; ve el valor de los pagos que él pidió, no el de los demás (D1).
- **Laboratorista** (panel web): pide pagos para Geolab.
- **Encargado de OCC** (panel web): pide pagos para OCC. No aprueba (spec 034, RF-16).
- **Gerencia** (panel web, rol `admin`): en Tesorería de Elemental ve todas las solicitudes del grupo, las aprueba, las rechaza o las devuelve, registra los pagos, paga las compras y registra los cortes; también puede pedir desde cualquier lugar.
- **Auxiliar de Recursos Humanos** (panel web, de Elemental): consulta Tesorería (D9).
- **Los demás roles** (operador, encargado de planta): no ven Solicitudes de pago ni Tesorería.

## Historias de usuario

- H1: Como residente, laboratorista, Encargado de OCC o almacenista quiero pedir un pago desde el panel, con a quién, por qué, por cuánto y para cuándo, y la cuenta de cobro o la factura adjunta, para que quede registrado y no dependa de un mensaje.
- H2: Como quien pidió quiero ver en qué va cada solicitud (enviada, aprobada, pagada o rechazada y por qué), para no tener que llamar a preguntar.
- H3: Como gerencia quiero ver en un solo lugar todos los pagos pedidos del grupo, los que esperan aprobación primero y los urgentes arriba, para aprobarlos, rechazarlos o devolverlos con un motivo.
- H4: Como gerencia quiero registrar cada pago —también los pagos en partes, como un anticipo y el saldo— con su fecha, medio y comprobante, para saber qué se pagó y tener el soporte.
- H5: Como gerencia quiero ver las compras de la spec 036 que todavía no se han pagado y registrar su pago, para que ninguna factura de proveedor se quede sin pagar.
- H6: Como gerencia quiero registrar los cortes financieros de cada empresa y cada obra desde Tesorería, como en la spec 033, para que las tarjetas de Inicio sigan al día.
- H7: Como gerencia quiero saber cuánto se ha pagado por obra o por empresa en un rango de fechas.

## Requisitos funcionales (criterios de aceptación en EARS)

### Los módulos y quién los ve

- RF-1: EL SISTEMA muestra en **Solicitudes de pago** de cada obra, de OCC y de Geolab las solicitudes de ese lugar, en lugar de «Este módulo está en construcción».
- RF-2: EL SISTEMA muestra Solicitudes de pago de la obra al residente y al almacenista de esa obra y a gerencia; las de Geolab al laboratorista y a gerencia; las de OCC al Encargado de OCC y a gerencia (RF-51 de la spec 033).
- RF-3: EL SISTEMA muestra **Tesorería** de Elemental con las pestañas **Solicitudes de pago** (las de todo el grupo, con filtros por lugar, estado, urgencia, fechas y texto), **Compras por pagar**, **Pagos** y **Cortes**, en lugar de «en construcción».
- RF-4: EL SISTEMA muestra Tesorería a gerencia y, de consulta, a la auxiliar de RR. HH. (D9).
- RF-5: EL SISTEMA deja aprobar, rechazar, devolver, registrar y anular pagos, y registrar y anular cortes, solo a gerencia.
- RF-5a: EL SISTEMA no le muestra al almacenista el valor de las solicitudes de pago que no pidió él, ni sus pagos ni sus comprobantes (D1).

### Pedir un pago (H1)

- RF-6: EL SISTEMA deja crear una solicitud de pago a quien ve Solicitudes de pago de ese lugar (RF-2), con:
  - el **lugar** que la pide: la obra o la empresa donde se está (sin elegirlo);
  - el **beneficiario**: a quién se le paga (nombre) y, opcional, su NIT o cédula;
  - el **concepto** (D2): pago a proveedor o contratista, anticipo, alquiler de equipo, transporte, servicios, reembolso de caja menor, viáticos, otro;
  - **para qué** (texto corto, obligatorio);
  - el **valor** en pesos;
  - **para cuándo** se necesita y **urgencia** (normal o urgente);
  - **adjuntos**: cuenta de cobro, factura, cotización, RUT, certificación bancaria, otro.
- RF-7: CUANDO se envía una solicitud, EL SISTEMA le da un número consecutivo del grupo («SP-0001») y la deja **Enviada**, con quién la pidió y cuándo.
- RF-8: SI falta el beneficiario, el concepto o el para qué, o el valor no es un valor en pesos mayor que cero, o la fecha «para cuándo» es anterior a hoy, ENTONCES EL SISTEMA no la guarda y dice qué falta, junto a su campo.
- RF-9: MIENTRAS una solicitud está Enviada o Devuelta, EL SISTEMA deja a quien la pidió corregirla o **cancelarla** con un motivo; después de aprobada, no.

### Aprobar, rechazar o devolver (H3)

- RF-10: EL SISTEMA muestra en Tesorería primero las solicitudes que esperan aprobación, las urgentes arriba y luego por «para cuándo», y arriba cuántas esperan aprobación, cuántas están aprobadas sin pagar (y por cuánto) y cuántas están vencidas (la fecha «para cuándo» ya pasó y no se ha pagado del todo).
- RF-11: CUANDO gerencia **aprueba** una solicitud, EL SISTEMA la pasa a **Aprobada**; gerencia puede aprobar un valor menor que el pedido, y queda anotado.
- RF-12: CUANDO gerencia **rechaza** o **devuelve** una solicitud, EL SISTEMA pide el motivo; la rechazada no se vuelve a abrir y la devuelta vuelve a quien la pidió para corregirla.

### Registrar el pago (H4)

- RF-13: CUANDO gerencia registra un pago de una solicitud Aprobada, EL SISTEMA pide la **fecha**, el **valor pagado**, el **medio** (transferencia, consignación, cheque, efectivo) y, opcional, la referencia y el **comprobante** adjunto.
- RF-14: EL SISTEMA deja pagar una solicitud en **varios pagos** (por ejemplo, anticipo y saldo) y la muestra **Pagada en parte** MIENTRAS lo pagado sea menor que lo aprobado, y **Pagada** cuando lo iguala (D3).
- RF-15: SI un pago haría que lo pagado pase de lo aprobado, ENTONCES EL SISTEMA no lo registra y dice cuánto falta por pagar.
- RF-16: CUANDO gerencia **anula** un pago, EL SISTEMA pide el motivo, lo deja en la historia marcado como anulado y recalcula lo pagado y el estado.

### Compras por pagar (H5)

- RF-17: EL SISTEMA muestra en **Compras por pagar** las compras vigentes de la spec 036 que no están pagadas del todo, con su solicitud, lugar, proveedor, valor, fecha, factura y lo que falta por pagar, la más antigua primero (D4).
- RF-18: EL SISTEMA deja a gerencia registrar el pago de una compra, con las mismas reglas de RF-13 a RF-16, sin pedir una solicitud de pago aparte.
- RF-19: EL SISTEMA muestra en el detalle de la solicitud de compra (spec 036) si cada compra está pagada, en parte o sin pagar, a quien ve los valores (spec 036, RF-31).

### Seguir las solicitudes (H2)

- RF-20: EL SISTEMA muestra en cada solicitud de pago su estado y su historia: quién la pidió, quién la aprobó, rechazó o devolvió y por qué, los pagos con sus comprobantes, cada uno con fecha y hora.
- RF-21: EL SISTEMA muestra en Solicitudes de pago de un lugar, primero, las abiertas (Enviada, Devuelta, Aprobada, Pagada en parte) y después las cerradas (Pagada, Rechazada, Cancelada), con las marcas «Devuelta: corrígela» y «Vencida».
- RF-22: EL SISTEMA deja buscar solicitudes de pago por número, beneficiario, NIT, para qué o quien pidió, sin distinguir mayúsculas ni tildes.

### Pagos (H7)

- RF-23: EL SISTEMA muestra en la pestaña **Pagos** todos los pagos vigentes del grupo —de solicitudes y de compras— en un rango de fechas de pago, con el total por lugar y el total del rango, solo a gerencia (D9).

### Cortes financieros (H6)

- RF-24: EL SISTEMA muestra en la pestaña **Cortes** la información financiera de la spec 033 (RF-34 a RF-40, RF-44): elegir Elemental, OCC, Geolab o una obra, ver su último corte con la diferencia frente al anterior y su historial, registrar un corte y anularlo con motivo.
- RF-25: EL SISTEMA muestra en Cortes, arriba, el **consolidado del grupo**: una fila por Elemental, OCC, Geolab y cada obra, con su último corte, su fecha y «Desactualizado» si tiene más de 30 días, y una fila de total (las RF-41 a RF-43 de la spec 033, que quedaron sin pantalla) (D7).
- RF-26: EL SISTEMA sigue alimentando las tarjetas de Inicio con los cortes (spec 033, RF-2, RF-3), sin cambiar cómo se calculan.

### Reglas transversales

- RF-27: EL SISTEMA comprueba en el servidor el permiso y el lugar de la solicitud o del pago frente a los de quien consulta o actúa.
- RF-28: EL SISTEMA no muestra una solicitud de pago a quien no tiene permiso, ni por dirección.
- RF-29: EL SISTEMA no deja borrar solicitudes, pagos, cortes ni adjuntos: se cancelan, se rechazan o se anulan con motivo.
- RF-30: MIENTRAS dos personas actúan a la vez sobre la misma solicitud o compra, EL SISTEMA deja pasar la primera y a la segunda le dice que cambió, sin pisar en silencio.

## Superficies afectadas

- [ ] **Móvil**: no cambia.
- [x] **Panel web**: Solicitudes de pago en cada obra, OCC y Geolab (lista, nueva, detalle con historia); Tesorería de Elemental con sus cuatro pestañas; en el detalle de una solicitud de compra, el estado de pago de cada compra.
- [x] **API**: crear, corregir, cancelar, aprobar, rechazar, devolver, registrar y anular pagos (de solicitudes y de compras), adjuntar, listar y buscar; pagos por rango; los cortes ya existen (spec 033).
- [ ] **Sincronización**: no cambia.
- [x] **Datos**: solicitudes de pago y su historia, pagos (de una solicitud o de una compra), adjuntos (el patrón de Documentos), consecutivo SP.
- [x] **Reglas**: estados y pasos, quién da cada paso, validaciones, pagado y por pagar, orden de la bandeja, vencidas; con casos en `verificar-reglas.ts`.

## Requisitos no funcionales

- La bandeja de Tesorería con 500 solicitudes carga en menos de 2 s.
- Todo el texto en español; valores en pesos con separador de miles.
- Dos pasos a la vez no se pisan (RF-30).

## Casos límite

- **Sin señal**: no aplica; es solo panel.
- **Residente que cambia de obra**: las solicitudes son de la obra; el residente nuevo las ve, el anterior deja de verlas.
- **Persona retirada** (spec 035): sus solicitudes siguen con su nombre; gerencia las resuelve igual.
- **Obra inactiva**: no deja crear solicitudes nuevas; las abiertas se pueden seguir pagando.
- **Compra anulada después de pagada** (spec 036): el pago sigue registrado y la compra sale en Pagos con la marca «Compra anulada», para que gerencia gestione el reintegro fuera del sistema (D4).
- **Pago con un valor distinto al de la factura** (descuento, retención): se aprueba o se paga lo que se pagó; lo que falta queda «por pagar» hasta que gerencia lo pague. No hay «cerrar con saldo» (D3).
- **Pruebas en dev**: R2 es compartido con producción; lo de prueba lleva PRUEBA-037 y se borra con la limpieza acotada.

## Fuera de alcance

- Contabilidad: plan de cuentas, causación, retenciones, IVA y conciliación bancaria.
- Las cuentas bancarias del grupo y sus saldos; caja menor con su saldo y sus arqueos.
- Pagar desde el sistema (conexión con bancos) o mandar el comprobante al beneficiario.
- Cuentas por cobrar a clientes y la facturación de las obras (avance de obra, actas): el corte sigue llevando el total a mano.
- Un maestro de beneficiarios o proveedores con datos bancarios (D5).
- Aprobaciones por monto o por varios niveles (D8).
- Avisos por correo o WhatsApp; pedir pagos por WhatsApp.
- Que el asistente de IA consulte pagos o cortes.

## Criterios de finalización

- Cada RF tiene cómo comprobarse: caso en `scripts/verificar-reglas.ts` (estados, pasos, permisos, validaciones, pagado y por pagar, orden de la bandeja, vencidas) o paso de demo manual descrito.
- `npm run verificar`, `npm run typecheck` y `npm run lint` en verde.
- Demo manual en Chrome:
  - un residente PRUEBA-037 pide un pago urgente a un transportador con la cuenta de cobro adjunta; recibe el número SP; la ve Enviada;
  - gerencia la ve arriba en Tesorería, la devuelve; el residente la corrige y la reenvía; gerencia la aprueba por un valor menor;
  - gerencia registra un anticipo con su comprobante (Pagada en parte) y luego el saldo (Pagada); un pago de más se rechaza diciendo cuánto falta;
  - una compra PRUEBA-037 de la spec 036 sale en Compras por pagar; gerencia registra su pago y desaparece de la lista; su solicitud de compra muestra «Pagada»;
  - gerencia registra un corte de una obra y lo ve en el consolidado y en la tarjeta de Inicio; lo anula;
  - el Encargado de OCC no ve los de la obra ni aprueba los de OCC; la auxiliar consulta sin botones; el operador no ve el módulo;
  - limpieza acotada de lo PRUEBA-037.

## Dudas resueltas (2026-10-29)

- D1: Piden el residente y el almacenista en su obra, el laboratorista en Geolab, el Encargado de OCC en OCC y gerencia en cualquier lugar (RF-2, RF-6). El almacenista ve el valor de los pagos que él pidió y no el de los demás (RF-5a).
- D2: Conceptos: pago a proveedor o contratista, anticipo, alquiler de equipo, transporte, servicios, reembolso de caja menor, viáticos y otro (RF-6).
- D3: Se paga en partes (anticipo y saldo) y nunca de más (RF-14, RF-15). No se agrega «cerrar con saldo»: si se paga menos, se aprueba por menos (RF-11) o queda por pagar.
- D4: Cada compra vigente de la 036 aparece sola en «Compras por pagar» y gerencia la paga ahí, sin solicitud de pago aparte (RF-17, RF-18).
- D5: No se guardan datos bancarios del beneficiario en campos; la certificación bancaria va como adjunto (RF-6).
- D6: El pago lleva medio, referencia y comprobante, sin la cuenta de origen del grupo (RF-13).
- D7: El consolidado del grupo vuelve, arriba de la pestaña Cortes (RF-25).
- D8: Aprueba solo gerencia, en un paso, sin importar el monto (RF-5).
- D9: La auxiliar de RR. HH. consulta Solicitudes de pago, Compras por pagar y Cortes, sin botones y sin la pestaña Pagos (RF-4, RF-23).
- D10: Serie propia para los pagos, SP-0001, aparte de las compras (RF-7).

## Dudas abiertas

Ninguna.
