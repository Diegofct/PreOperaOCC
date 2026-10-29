# Spec 036 — Compras: solicitudes de compra del grupo

> Estado: **Cumplida en dev** el 2026-10-29 (ver `validacion.md`); sube a producción con la T23 de la 033 · aprobada y plan aprobado el 2026-10-29 · Fecha: 2026-10-29
> Respuesta del usuario del 2026-10-29: de acuerdo con todas las propuestas de D1 a D8 (abajo, «Dudas resueltas»).

## Contexto y objetivo

Hoy, cuando una obra, OCC o Geolab necesita comprar algo (cemento, repuestos, un reactivo, EPP, papelería), lo pide por WhatsApp, por llamada o en un papel. Elemental, que presta las compras a todo el grupo desde la spec 033, se entera por varios lados, y:
- no queda en un solo lugar qué se pidió, quién lo pidió, para qué obra ni cuándo hace falta;
- no se sabe en qué va cada pedido: si se aprobó, si ya se compró, si llegó;
- las cotizaciones y la factura quedan en correos o en el celular de alguien;
- el residente vuelve a llamar para preguntar «¿qué pasó con lo que pedí?».

La spec 033 dejó en el menú **Solicitudes de compra** en cada obra, en OCC y en Geolab, y **Compras** en Elemental, todavía «en construcción». Esta spec los llena: quien está en la obra o en la empresa **pide**, la gerencia **aprueba o rechaza** en Compras de Elemental, la compra se **registra** con su proveedor, valor y soportes, y quien pidió marca que **llegó**. Cada paso queda con quién y cuándo, y nada se borra.

Las **solicitudes de pago** y Tesorería son de la spec 037; aquí no se pagan facturas.

## Usuarios / actores

- **Residente / director de obra** (panel web): pide compras para su obra y sigue las suyas y las de su obra.
- **Almacenista** (panel web): pide compras para su obra (materiales que se están acabando) y marca lo que llega.
- **Laboratorista** (panel web): pide compras para Geolab.
- **Encargado de OCC** (panel web): pide compras para OCC (repuestos, llantas, mantenimiento). No aprueba (spec 034, RF-16).
- **Gerencia** (panel web, rol `admin`): ve todas las solicitudes del grupo en Compras de Elemental, las aprueba, las rechaza o las devuelve, registra la compra; también puede pedir desde cualquier lugar.
- **Auxiliar de Recursos Humanos** (panel web, de Elemental): consulta Compras de Elemental (D6).
- **Los demás roles** (operador, encargado de planta): no ven Compras ni Solicitudes de compra.

## Historias de usuario

- H1: Como residente, almacenista, laboratorista o Encargado de OCC quiero pedir una compra desde el panel, con lo que necesito, la cantidad y para cuándo, para que quede registrada y no dependa de un mensaje.
- H2: Como quien pidió quiero ver en qué va cada solicitud (enviada, aprobada, comprada, recibida o rechazada y por qué), para no tener que llamar a preguntar.
- H3: Como gerencia quiero ver en un solo lugar todas las solicitudes del grupo, las pendientes primero y las urgentes arriba, para aprobarlas, rechazarlas o devolverlas con un motivo.
- H4: Como gerencia quiero registrar la compra con su proveedor, su valor, la cotización y la factura, para tener los soportes juntos cuando Tesorería pague o alguien pregunte.
- H5: Como almacenista o residente quiero marcar que lo comprado llegó (todo o una parte), para cerrar la solicitud.
- H6: Como gerencia quiero saber cuánto se ha comprado por obra o por empresa en un rango de fechas, para controlar el gasto.

## Requisitos funcionales (criterios de aceptación en EARS)

### Los módulos y quién los ve

- RF-1: EL SISTEMA muestra en **Solicitudes de compra** de cada obra, de OCC y de Geolab las solicitudes de ese lugar, en lugar de «Este módulo está en construcción».
- RF-2: EL SISTEMA muestra Solicitudes de compra de la obra al residente y al almacenista de esa obra y a gerencia; las de Geolab al laboratorista y a gerencia; las de OCC al Encargado de OCC y a gerencia (RF-51 de la spec 033).
- RF-3: EL SISTEMA muestra en **Compras** de Elemental las solicitudes de todo el grupo, con filtro por lugar (Elemental, OCC, Geolab, cada obra), estado, urgencia y rango de fechas.
- RF-4: EL SISTEMA muestra Compras de Elemental a gerencia y, de consulta, a la auxiliar de RR. HH. (D6).
- RF-5: EL SISTEMA deja aprobar, rechazar, devolver y registrar la compra solo a gerencia (D2 y D4).
- RF-6: MIENTRAS la spec 037 no esté hecha, EL SISTEMA muestra la parte de **Solicitudes de pago** como «en construcción»; las solicitudes de compra no esperan a la 037.

### Pedir una compra (H1)

- RF-7: EL SISTEMA deja crear una solicitud de compra a quien ve Solicitudes de compra de ese lugar (RF-2), con:
  - el **lugar** que la pide: la obra o la empresa donde se está (sin elegirlo);
  - uno o más **renglones**: qué se necesita (texto, o un material del catálogo del almacén si es de una obra con Almacén), cantidad y unidad;
  - **para cuándo** se necesita (fecha);
  - **urgencia**: normal o urgente;
  - **para qué** (justificación, texto corto);
  - **proveedor sugerido** y **valor estimado** (opcionales);
  - **adjuntos** opcionales: cotizaciones, fotos, fichas técnicas.
- RF-8: CUANDO se envía una solicitud, EL SISTEMA le da un número consecutivo del grupo («SC-0001») y la deja en estado **Enviada**, con quién la pidió y cuándo.
- RF-9: SI la solicitud no tiene ningún renglón, o un renglón no tiene descripción o su cantidad no es mayor que cero, ENTONCES EL SISTEMA no la guarda y dice qué falta.
- RF-10: SI la fecha «para cuándo» es anterior a hoy, ENTONCES EL SISTEMA no la guarda y lo dice.
- RF-11: MIENTRAS una solicitud está Enviada o Devuelta, EL SISTEMA deja a quien la pidió corregirla o **cancelarla** con un motivo; después de aprobada, no.

### Aprobar, rechazar o devolver (H3)

- RF-12: EL SISTEMA muestra en Compras de Elemental primero las solicitudes que esperan aprobación, las urgentes arriba y luego por «para cuándo», y arriba cuántas esperan aprobación, cuántas urgentes y cuántas están vencidas (la fecha «para cuándo» ya pasó y no se ha recibido).
- RF-13: CUANDO gerencia **aprueba** una solicitud, EL SISTEMA la pasa a **Aprobada** y guarda quién y cuándo; gerencia puede quitar renglones o bajar cantidades al aprobar, y queda anotado qué cambió.
- RF-14: CUANDO gerencia **rechaza** una solicitud, EL SISTEMA pide el motivo y la deja **Rechazada**, sin poder volver a abrirse.
- RF-15: CUANDO gerencia **devuelve** una solicitud, EL SISTEMA pide qué debe corregirse y la deja **Devuelta** para que quien la pidió la corrija y la vuelva a enviar.

### Registrar la compra (H4)

- RF-16: CUANDO gerencia registra la compra de una solicitud Aprobada, EL SISTEMA pide el **proveedor**, el **valor total** en pesos, la **fecha de compra** y, opcional, el número de factura o de remisión, y la pasa a **Comprada**.
- RF-17: EL SISTEMA deja adjuntar a la compra la cotización, la orden de compra y la factura, con las reglas de la spec 034 (tipos PDF, imágenes, Word y Excel; hasta 20 MB; tipo real revisado; nada se borra, se anula con motivo).
- RF-18: SI el valor total no es un valor en pesos mayor que cero, ENTONCES EL SISTEMA no registra la compra y lo dice.
- RF-19: EL SISTEMA deja registrar una solicitud aprobada en **varias compras** (por ejemplo, dos proveedores), y la marca Comprada cuando todos sus renglones tienen compra (D4).

### Recibir (H5)

- RF-20: CUANDO lo comprado llega, EL SISTEMA deja a quien ve Solicitudes de compra de ese lugar marcar cada renglón como **recibido** (todo o la cantidad que llegó), con fecha y una foto o la remisión opcional.
- RF-21: CUANDO todos los renglones están recibidos completos, EL SISTEMA pasa la solicitud a **Recibida**; MIENTRAS falte algo, la muestra **Recibida en parte**.
- RF-22: EL SISTEMA no crea ingresos en el Almacén al recibir: el almacenista los sigue registrando en Almacén como hoy (D5).

### Seguir las solicitudes (H2)

- RF-23: EL SISTEMA muestra en cada solicitud su estado y su historia: quién la pidió, quién la aprobó, rechazó o devolvió y por qué, la compra con sus soportes y lo recibido, cada uno con fecha y hora.
- RF-24: EL SISTEMA muestra en Solicitudes de compra de un lugar, primero, las abiertas (Enviada, Devuelta, Aprobada, Comprada, Recibida en parte) y después las cerradas (Recibida, Rechazada, Cancelada).
- RF-25: EL SISTEMA marca con «Devuelta: corrígela» las solicitudes devueltas a quien las pidió, y con «Vencida» las que pasaron su fecha «para cuándo» sin recibirse.
- RF-26: EL SISTEMA deja buscar solicitudes por número, texto de los renglones, proveedor o quien pidió, sin distinguir mayúsculas ni tildes.

### Gasto (H6)

- RF-27: EL SISTEMA muestra en Compras de Elemental el total comprado por lugar en un rango de fechas (por la fecha de compra), solo a gerencia.

### Reglas transversales

- RF-28: EL SISTEMA comprueba en el servidor el permiso y el lugar de la solicitud frente a los de quien consulta o actúa.
- RF-29: EL SISTEMA no muestra una solicitud a quien no tiene permiso, ni por dirección.
- RF-30: EL SISTEMA no deja borrar solicitudes, compras ni adjuntos: se cancelan, se rechazan o se anulan con motivo.
- RF-31: EL SISTEMA no muestra los valores de compra al almacenista (D7).

## Superficies afectadas

- [ ] **Móvil**: no cambia.
- [x] **Panel web**: Solicitudes de compra en cada obra, OCC y Geolab (lista, nueva solicitud, detalle con historia, recibir); Compras de Elemental (bandeja de aprobación, filtros, registrar compra, total comprado).
- [x] **API**: crear, corregir, cancelar, aprobar, rechazar, devolver, registrar compra, adjuntar, recibir, listar y buscar.
- [ ] **Sincronización**: no cambia.
- [x] **Datos**: solicitudes, renglones, compras, recepciones y su historial; adjuntos con la tabla de archivos que ya existe; consecutivo SC.
- [x] **Reglas**: estados y pasos permitidos, quién puede cada paso, validaciones, orden de la bandeja, vencidas; con casos en `verificar-reglas.ts`.

## Requisitos no funcionales

- La bandeja de Compras con 500 solicitudes carga en menos de 2 s.
- Todo el texto en español; valores en pesos con separador de miles.
- Dos personas que actúan a la vez sobre la misma solicitud (por ejemplo, aprobar y cancelar): la segunda recibe aviso de que cambió, sin pisar en silencio.

## Casos límite

- **Sin señal**: no aplica; es solo panel.
- **Residente que cambia de obra**: las solicitudes son de la obra, no de la persona; el residente nuevo las ve, el anterior deja de verlas.
- **Persona retirada** (spec 035): sus solicitudes siguen con su nombre; si estaban Enviadas, gerencia las aprueba o las rechaza igual.
- **Obra terminada o inactiva**: no deja crear solicitudes nuevas; las abiertas se pueden seguir cerrando.
- **Material del catálogo dado de baja**: la solicitud que ya lo tiene lo sigue mostrando.
- **Llega más de lo pedido**: se registra lo que llegó y se marca la diferencia.
- **Pruebas en dev**: R2 es compartido con producción; lo de prueba lleva PRUEBA-036 y se borra con la limpieza acotada.

## Fuera de alcance

- Pagar la compra, cuentas por pagar y Tesorería (spec 037).
- Un maestro de proveedores con NIT, cuentas y calificación: aquí el proveedor es texto (D3).
- Comparar cotizaciones lado a lado o pedir cotizaciones por correo a proveedores.
- Presupuesto de la obra contra lo comprado (spec 031) y control de costos.
- Aprobaciones por monto o por varios niveles (D2).
- Crear el ingreso al Almacén automáticamente al recibir (D5).
- Avisos por correo o WhatsApp; pedir compras por WhatsApp.
- Que el asistente de IA consulte las compras.

## Criterios de finalización

- Cada RF tiene cómo comprobarse: caso en `scripts/verificar-reglas.ts` (estados, pasos, permisos, validaciones, orden de la bandeja, vencidas) o paso de demo manual descrito.
- `npm run verificar`, `npm run typecheck` y `npm run lint` en verde.
- Demo manual en Chrome:
  - un residente PRUEBA-036 pide en su obra 2 renglones urgentes con una cotización adjunta; recibe el número SC; la ve Enviada;
  - gerencia la ve arriba en Compras de Elemental, la devuelve pidiendo una corrección; el residente la corrige y la reenvía; gerencia la aprueba bajando una cantidad;
  - gerencia registra la compra con proveedor, valor y factura; el residente la ve Comprada con sus soportes; el almacenista, sin el valor;
  - el almacenista recibe un renglón completo y el otro en parte (Recibida en parte) y luego el resto (Recibida);
  - el Encargado de OCC no ve las solicitudes de la obra ni puede aprobar las de OCC; el operador no ve el módulo;
  - limpieza acotada de lo PRUEBA-036.

## Dudas resueltas (2026-10-29)

- D1: Piden el residente y el almacenista en su obra, el laboratorista en Geolab, el Encargado de OCC en OCC y gerencia en cualquiera de esos lugares (RF-2, RF-7). No piden el encargado de planta ni los operadores. Elemental no tiene Solicitudes de compra propias: sus compras las hace gerencia directamente.
- D2: Aprueba solo gerencia, en un paso, sin importar el monto (RF-5, RF-13).
- D3: El proveedor es texto libre; el listado de proveedores queda fuera (RF-16).
- D4: Gerencia registra la compra (proveedor, valor, fecha, factura); una solicitud puede quedar en varias compras (RF-16, RF-19). Sin consecutivo propio de orden de compra: si hay orden, se adjunta (RF-17).
- D5: Recibir no crea el ingreso al Almacén; el almacenista lo registra aparte, como hoy (RF-22).
- D6: La auxiliar de RR. HH. consulta Compras de Elemental; no aprueba ni registra compras (RF-4, RF-5).
- D7: El almacenista no ve los valores de compra; el residente, el laboratorista y el Encargado de OCC ven los de su lugar (RF-31).
- D8: Las cotizaciones son opcionales (RF-7, RF-17).

## Dudas abiertas

Ninguna.
