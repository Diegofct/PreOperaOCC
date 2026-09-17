# Spec 009 — Almacén de obra

> Estado: Cumplida · Fecha: 2026-09-14 · Aprobada: 2026-09-15 · Cumplida: 2026-09-16 ·
> Cambio: 2026-09-17 (anular solo la gerencia y lista de materiales de OCC, RF-32 a RF-39),
> cumplido el 2026-09-17

## Contexto y objetivo

Cada obra de OCC tiene un almacén: cemento, varilla, tubería, señalización, repuestos,
herramienta. Hoy el control de lo que entra y sale se lleva por fuera del sistema, y la
pregunta que siempre cuesta responder es la misma: **¿cuánto queda, y quién se llevó lo que
falta?**

Este módulo lleva el inventario de cada obra de forma rigurosa: cada ingreso y cada salida
queda registrado con su cantidad, quién la hizo, quién la recibió y para qué, y el stock
sale de sumar esos movimientos — nunca se escribe a mano. Un movimiento equivocado no se
borra: se anula con motivo, igual que el resto de la evidencia del sistema.

## Usuarios / actores

- **Almacenista** (spec 008) — lleva el almacén de su obra: registra materiales, ingresos y
  salidas. *(Desde el 2026-09-17 ya no anula: RF-38.)*
- **Gerencia** — puede hacer todo lo del almacenista, en cualquier obra.
- **Residente / director de obra** — consulta el almacén de su obra, sin registrar.

## Historias de usuario

- H1: Como almacenista quiero registrar los materiales de mi almacén con su unidad, para
  llevar cada uno en la medida en que se compra y se entrega.
- H2: Como almacenista quiero registrar lo que ingresa, para que el stock suba sin cuentas a
  mano.
- H3: Como almacenista quiero registrar lo que sale y para qué, para que cada salida quede a
  cargo de quien la entregó.
- H4: Como residente o gerencia quiero ver cuánto queda de cada material y su historial,
  para saber qué pedir antes de que falte.
- H5: Como gerencia quiero corregir un movimiento equivocado sin borrar lo registrado, para
  que el inventario siga siendo creíble. *(Era del almacenista hasta el 2026-09-17: RF-38.)*

## Requisitos funcionales (criterios de aceptación en EARS)

### Materiales del almacén (H1)

- RF-1: EL SISTEMA llevará un inventario por obra, independiente del de las demás obras.
- RF-2: EL SISTEMA permitirá registrar los materiales del almacén de una obra, cada uno con
  su nombre y su unidad de medida.
- RF-3: SI se intenta registrar un material con el mismo nombre que otro vigente de la misma
  obra, sin distinguir tildes ni mayúsculas, ENTONCES EL SISTEMA lo rechazará.
- RF-4: EL SISTEMA permitirá corregir el nombre de un material sin alterar sus movimientos.
- RF-5: SI se intenta cambiar la unidad de un material que ya tiene movimientos, ENTONCES EL
  SISTEMA lo rechazará.
- RF-6: EL SISTEMA permitirá dar de baja un material sin stock, conservando su historial.
- RF-7: SI se intenta dar de baja un material con stock, ENTONCES EL SISTEMA lo rechazará
  indicando cuánto queda.
- RF-31: EL SISTEMA ofrecerá la unidad de medida de un material para elegirla de una lista
  cerrada: bulto, kilogramo, tonelada, metro, metro cuadrado, metro cúbico, litro, galón,
  unidad, rollo y caja. *(2026-09-15)*

#### Los materiales salen de la lista de OCC (cambio 2026-09-17)

- RF-32: EL SISTEMA ofrecerá el nombre del material para elegirlo de la lista de materiales
  de OCC (Anexo A), la misma para todas las obras. *(cambio 2026-09-17, precisa RF-2)*
- RF-33: EL SISTEMA ofrecerá en esa lista la opción «Otro» y, CUANDO se elija, exigirá
  escribir el nombre del material. *(cambio 2026-09-17)*
- RF-34: EL SISTEMA pedirá la unidad de medida aparte, de la lista cerrada de RF-31, también
  cuando el nombre se haya elegido de la lista. *(cambio 2026-09-17)*
- RF-35: EL SISTEMA ofrecerá una sola vez cada nombre, aunque el documento de OCC lo traiga
  repetido. *(cambio 2026-09-17)*
- RF-36: EL SISTEMA permitirá encontrar un material de la lista escribiendo palabras de su
  nombre, sin distinguir tildes ni mayúsculas. *(cambio 2026-09-17)*
- RF-37: EL SISTEMA conservará los materiales registrados antes de este cambio con el nombre
  y la unidad que tienen, y seguirá permitiendo registrarles movimientos.
  *(cambio 2026-09-17)*

### Ingresos (H2)

- RF-8: EL SISTEMA permitirá registrar un ingreso con su fecha, su material, su cantidad y
  una observación opcional.
- RF-9: SI la cantidad de un movimiento no es mayor que cero, ENTONCES EL SISTEMA lo
  rechazará.
- RF-10: SI la fecha de un movimiento es posterior al día de hoy, ENTONCES EL SISTEMA lo
  rechazará.

### Salidas (H3)

- RF-11: EL SISTEMA permitirá registrar una salida con su fecha, su material, su cantidad y
  para qué se usará.
  > **Corregido el 2026-09-15**: ya no pide quién la recibe.
- RF-12: *Retirado el 2026-09-15.* Pedía quién recibe la salida; OCC decidió que solo queda
  anotado el almacenista (RF-30).
- RF-13: SI una salida no indica para qué se usará, ENTONCES EL SISTEMA la rechazará.
- RF-14: *Retirado el 2026-09-15.* Ofrecía elegir a quien recibe entre las personas de la
  obra; ver RF-12.
- RF-30: EL SISTEMA registrará como responsable de cada salida al almacenista que la
  registra. *(2026-09-15)*
- RF-15: SI la cantidad de una salida supera el stock del material, ENTONCES EL SISTEMA la
  rechazará indicando el stock disponible.
- RF-16: SI dos salidas del mismo material se registran a la vez y juntas superan el stock,
  ENTONCES EL SISTEMA rechazará la que llegue después.

### Stock y consulta (H4)

- RF-17: EL SISTEMA mostrará para cada material su total ingresado, su total salido y su
  stock actual, en su unidad.
- RF-18: EL SISTEMA calculará el stock únicamente a partir de los movimientos vigentes, sin
  permitir escribirlo a mano.
- RF-19: EL SISTEMA señalará con texto, además del color, los materiales cuyo stock es cero.
- RF-20: EL SISTEMA permitirá consultar el historial de movimientos de un material con su
  fecha, tipo, cantidad, quién lo registró, para qué y el stock que dejó.
- RF-21: EL SISTEMA permitirá filtrar los movimientos por periodo y por tipo.
- RF-22: EL SISTEMA permitirá buscar un material por su nombre, sin distinguir tildes ni
  mayúsculas.

### Corregir sin borrar (H5)

- RF-23: EL SISTEMA no permitirá modificar ni borrar un movimiento registrado.
- RF-24: EL SISTEMA permitirá anular un movimiento con un motivo escrito.
  > **Precisado por RF-38 el 2026-09-17.** Quien anula es la gerencia.
- RF-25: CUANDO se anule un movimiento, EL SISTEMA lo seguirá mostrando marcado como anulado
  y dejará de contarlo en el stock.
- RF-26: SI anular un ingreso dejaría el stock del material por debajo de cero, ENTONCES EL
  SISTEMA lo rechazará indicando el stock que quedaría.
- RF-27: EL SISTEMA registrará quién hizo y cuándo cada movimiento y cada anulación.
- RF-38: EL SISTEMA permitirá anular un movimiento únicamente a la gerencia.
  *(cambio 2026-09-17, precisa RF-24 y RF-28)*
- RF-39: EL SISTEMA no ofrecerá la opción de anular a quien no es gerencia, y SI llega una
  anulación de quien no lo es, ENTONCES la rechazará. *(cambio 2026-09-17)*

### Quién puede (spec 008)

- RF-28: EL SISTEMA permitirá registrar materiales, movimientos y anulaciones únicamente al
  almacenista de esa obra y a la gerencia.
  > **Precisado por RF-38 el 2026-09-17.** Materiales y movimientos siguen igual; las
  > anulaciones pasan a ser solo de la gerencia.
- RF-29: EL SISTEMA permitirá al residente consultar el almacén de su obra.

## Superficies afectadas

- [ ] **Móvil** — ninguna. El almacén se lleva desde el panel.
- [x] **Panel web** — módulo nuevo Almacén: materiales, stock, ingresos, salidas, historial.
- [x] **API** — rutas nuevas del panel para materiales y movimientos, con la guardia y el
  filtro por obra.
- [ ] **Sincronización** — sin impacto.
- [x] **Datos** — materiales del almacén y sus movimientos, en la base del servidor.
- [x] **Reglas** — validación de un movimiento y cálculo de stock, con sus casos en el guion
  de verificación.

Cambio 2026-09-17: **Panel web** (el nombre del material se elige de la lista de OCC con la
salida «Otro»; el botón de anular solo lo ve la gerencia); **API** (rechazar la anulación de
quien no es gerencia); **Reglas** (quién puede anular, con su caso); **Datos**: la lista de
materiales entra como catálogo del código, no como tabla de la base —el material registrado
se sigue guardando con su nombre—. **Móvil** y **Sincronización**: sin impacto.

## Requisitos no funcionales

- Las cantidades admiten hasta dos decimales (medio bulto, 2,5 m de tubería).
- Todas las columnas de las tablas caben en un portátil de 1366 puntos de ancho (005/RF-20).
- El stock mostrado nunca es negativo, tampoco con dos personas registrando a la vez (RF-16).

## Casos límite

- **Sin señal**: no aplica; el panel es de escritorio y siempre tiene red.
- **Evidencia firmada**: un movimiento registrado es evidencia; no se edita, se anula con
  motivo (RF-23, RF-24).
- **Primer arranque**: un almacén sin materiales se ve vacío y dice cómo registrar el
  primero.
- Una salida por **exactamente** el stock: se acepta y el material queda en cero (RF-19).
- Anular un ingreso cuyo material **ya salió** (RF-26).
- Anular una **salida**: el stock vuelve a subir.
- Dos almacenistas registrando **salidas a la vez** del mismo material (RF-16).
- Un material dado de baja que **vuelve a comprarse**: se registra de nuevo; el nombre ya no
  choca porque el anterior no está vigente (RF-3).
- Un almacenista dado de baja que **aparece en movimientos antiguos**: su nombre se sigue
  viendo.
- *(cambio 2026-09-17)* Un material **elegido de la lista que ya está vigente** en esa obra:
  se rechaza igual que uno escrito a mano (RF-3).
- *(cambio 2026-09-17)* **«Otro» con un nombre que sí está en la lista**, escrito distinto
  («cemento gris» por «Cemento Gris»): si ya está vigente en la obra, RF-3 lo rechaza; si no,
  se registra como se escribió.
- *(cambio 2026-09-17)* El documento de OCC trae **el mismo nombre en varias filas**, con
  código o unidad distintos: sale una sola vez (RF-35).
- *(cambio 2026-09-17)* Un **almacenista que se equivoca al teclear un ingreso**: ya no puede
  anularlo; se lo pide a gerencia (RF-38).

## Fuera de alcance

- Precios, costos y valor del inventario.
- Proveedor, número de remisión o de factura en los ingresos.
- Anotar quién se llevó el material en una salida: queda a cargo del almacenista (RF-30).
- Alertas de stock mínimo o pedidos automáticos.
- Traslados de material entre almacenes de obras distintas.
- Amarrar una salida a una actividad de la bitácora.
- Llevar el almacén desde el celular.
- Informes, exportación a hoja de cálculo o PDF.
- Inventario físico (conteo) y ajustes por diferencia.
- *(cambio 2026-09-17)* La hoja **EQUIPOS** del documento de OCC: se retomará cuando se
  decida para qué sirve.
- *(cambio 2026-09-17)* Editar la lista de materiales desde el panel: se actualiza desde el
  documento de OCC.
- *(cambio 2026-09-17)* Tomar del documento de OCC la unidad del material o su precio: la
  unidad la elige el almacenista (RF-34) y los precios siguen fuera de alcance.
- *(cambio 2026-09-17)* Pedirle a gerencia la anulación desde el panel (aviso, solicitud o
  bandeja): el almacenista se lo pide por fuera del sistema.

## Criterios de finalización

- Cada RF tiene su comprobación: validación de movimientos y cálculo de stock (RF-9, RF-10,
  RF-13, RF-15, RF-18, RF-26) como casos en el guion de verificación; el resto, como
  paso de demo manual.
- Migración en la base del servidor.
- `npm run verificar`, `npm run typecheck` y `npm run lint` en verde.
- Demo manual: como almacenista, registrar «Cemento» en bultos; ingresar 100; sacar 30 «para
  cuneta PR 3»; ver stock 70; intentar sacar 80 y recibir el rechazo con
  el stock; anular la salida con motivo y ver stock 100 con la salida marcada como anulada;
  entrar como residente y ver lo mismo sin botones de registrar.

Del cambio del 2026-09-17:

- Quién puede anular (RF-38) como caso en el guion de verificación; la lista de materiales
  (RF-35, RF-36), con su caso sobre el catálogo generado.
- Demo manual: como almacenista, registrar un material eligiéndolo de la lista y otro con
  «Otro»; abrir el historial de uno con movimientos y **no ver el botón de anular**; entrar
  como gerencia y verlo; que los materiales registrados antes sigan ahí con su unidad.

## Dudas abiertas

Resueltas el 2026-09-15:

- **Ingresos**: no llevan proveedor, remisión ni factura (RF-8 se queda como está).
- **Salidas**: solo queda anotado el almacenista que la registra y para qué es (RF-11,
  RF-30); RF-12 y RF-14 se retiran.

- **Unidades** *(2026-09-15)*: lista cerrada, sin «Otra» (RF-31). Así un mismo material no
  aparece como «bulto», «bultos» y «Bto». Si falta una unidad, se añade a la lista.

Resueltas el 2026-09-17 (Diego, petición de gerencia):

- **Anular**: el botón sale del historial para el almacenista y el residente; la gerencia lo
  conserva (RF-38, RF-39). Un error del almacenista se corrige pidiéndoselo a gerencia.
- **Materiales**: el nombre se elige de la lista de OCC, con «Otro» para lo que no esté
  (RF-32, RF-33). La lista trae la unidad de cada material, pero **no se usa**: la unidad la
  sigue eligiendo el almacenista de la lista cerrada de RF-31, porque OCC compra el cemento
  por bultos y el documento lo trae en kilogramos (RF-34).
- **Equipos**: la otra hoja del documento no entra en esta tanda.

Ninguna abierta.

## Anexo A — Materiales del almacén *(2026-09-17)*

Fuente: `docs/materiales y equipos.xlsx`, hoja **MATERIALES**, columna C (el nombre del
material). Es la lista de precios de referencia del INVIAS que usa OCC: 367 filas, de las
que salen **351 nombres distintos** —hay 16 que se repiten con otro código o precio y se
ofrecen una sola vez (RF-35)—.

La hoja trae además el código del material (columna A), su unidad (columna B) y su precio
(columna D). **Ninguno de los tres entra**: el precio está fuera de alcance y la unidad la
elige el almacenista (RF-34).

Muestra de los nombres, para saber de qué se habla:

| Nombre |
| --- |
| Acero A-36 para estructura metálica |
| Acero suministrado y figurado PDR 60 |
| Aditivo curador |
| Adoquín e=8cm |
| Agregado para concreto hidráulico |
| Agua |
| Alambre negro para amarre calibre 18 |
| Cemento Asfaltico 60-70 |

La lista completa no se copia aquí: se genera del Excel, como el presupuesto de la spec 004,
y el documento de OCC es la fuente. Si OCC lo cambia, se reemplaza el archivo y se vuelve a
generar.
