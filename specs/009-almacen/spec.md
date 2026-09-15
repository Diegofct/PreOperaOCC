# Spec 009 — Almacén de obra

> Estado: Aprobada · Fecha: 2026-09-14 · Aprobada: 2026-09-15

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
  salidas, y anula los movimientos equivocados.
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
- H5: Como almacenista quiero corregir un movimiento equivocado sin borrar lo registrado,
  para que el inventario siga siendo creíble.

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
- RF-25: CUANDO se anule un movimiento, EL SISTEMA lo seguirá mostrando marcado como anulado
  y dejará de contarlo en el stock.
- RF-26: SI anular un ingreso dejaría el stock del material por debajo de cero, ENTONCES EL
  SISTEMA lo rechazará indicando el stock que quedaría.
- RF-27: EL SISTEMA registrará quién hizo y cuándo cada movimiento y cada anulación.

### Quién puede (spec 008)

- RF-28: EL SISTEMA permitirá registrar materiales, movimientos y anulaciones únicamente al
  almacenista de esa obra y a la gerencia.
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

## Dudas abiertas

Resueltas el 2026-09-15:

- **Ingresos**: no llevan proveedor, remisión ni factura (RF-8 se queda como está).
- **Salidas**: solo queda anotado el almacenista que la registra y para qué es (RF-11,
  RF-30); RF-12 y RF-14 se retiran.

Sigue abierta, para la fase de clarificación:

- [NECESITA ACLARACIÓN: ¿la lista de unidades es cerrada (bulto, kg, m, m², m³, galón,
  unidad…) o el almacenista la escribe libremente?]
