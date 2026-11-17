# Spec 048 — Requisiciones de obra amarradas a la planificación

> Estado: **Cumplida el 2026-11-17** (`validacion.md`, 66/66 RF, con observaciones en RF-56 y en el tiempo) · **Aprobada por Diego el 2026-11-17** (entrevista D1–D6; dudas D7–D11 cerradas con las recomendaciones; clarificación D12–D16 del mismo día) · Fecha: 2026-11-17 · Cuarta y última de la tanda 045–048 (plan del 2026-11-13). Entrevista con Diego del 2026-11-17 (D1–D6). **Modifica la 046** (RF-10, RF-13, RF-34, RF-52 y RF-80), **el registro de la compra de la 036** (RF-16, heredado por la 046) y **la pantalla de la planificación de la 045** (resumen de lo comprometido). Se apoya en la planificación de la 043 y la 045. No toca la 047: las requisiciones de OCC no se amarran (decisión del 2026-11-13).

## Contexto y objetivo

La planificación aprobada de una obra (043, 045) dice cuánto se pensaba gastar en cada ítem del presupuesto y en cada renglón de costo indirecto. Las requisiciones de obra (046) dicen lo que la obra pide comprar o pagar. Hoy las dos no se tocan: nadie sabe, al aprobar una requisición, si ese gasto estaba planeado ni cuánto queda de lo planeado para ese ítem. Esta spec amarra cada renglón de una requisición de obra a un ítem o a un renglón indirecto de la planificación vigente, y muestra en cada paso de la cadena cuánto se planeó, cuánto está ya comprometido y cuánto queda. Si lo pedido se pasa de lo planeado, **el sistema avisa y deja seguir**: decide quien aprueba (decisión del 2026-11-13). Así el Director de Obra, el Director de Proyectos y la Administradora aprueban sabiendo si ese peso estaba en el plan.

## Usuarios / actores

- **Residente, Director de Obra y Director de Proyectos** (panel web): al pedir, imputan cada renglón. Al aprobar, ven lo planeado, lo comprometido y lo que queda, con los avisos; si algo no les cuadra, devuelven. El Residente completa además el valor estimado de lo que pide el Almacenista.
- **Almacenista** (panel web): al pedir, imputa cada renglón sin ver valores, cifras ni avisos.
- **Administradora de Elemental y Gerencia** (panel web): ven lo mismo y, al aprobar, pueden cambiar la imputación de un renglón.
- **Laboratorista** (GeoLab), **Encargado de OCC**, **Auxiliar Administrativa**, **Operador** y **Encargado de planta**: sin cambios.

## Historias de usuario

- H1: Como quien pide en una obra quiero decir a qué parte de la planificación corresponde cada renglón, para que el gasto quede amarrado a lo planeado.
- H2: Como quien aprueba quiero ver, por cada renglón, cuánto se planeó para ese ítem, cuánto está ya comprometido y cuánto queda, para aprobar sabiendo si ese gasto estaba en el plan.
- H3: Como quien aprueba quiero un aviso claro cuando un renglón se pasa de lo planeado o no está en la planificación, para no tener que hacer la cuenta yo.
- H4: Como Administradora quiero corregir a qué ítem se imputó un renglón sin devolver la requisición entera, cuando el error es solo ese.

## Requisitos funcionales (criterios de aceptación en EARS)

### A qué se imputa cada renglón (H1)

- RF-1: EL SISTEMA amarra a la planificación solo las requisiciones de obra; las de GeoLab y las de OCC no se amarran.
- RF-2: MIENTRAS la obra tiene al menos una planificación aprobada vigente, EL SISTEMA exige que cada renglón de una requisición de compra nueva se impute a un ítem directo, a un rubro o a un renglón indirecto de una de esas planificaciones, o a «Fuera de lo planeado» (D2, D12, D15).
- RF-3: MIENTRAS la obra tiene al menos una planificación aprobada vigente, EL SISTEMA exige que cada requisición de pago nueva se impute a un ítem directo, a un rubro o a un renglón indirecto de una de esas planificaciones, o a «Fuera de lo planeado» (D2, D12, D15).
- RF-4: SI un renglón se imputa a «Fuera de lo planeado», ENTONCES EL SISTEMA exige una explicación escrita de por qué no cabe en la planificación (D2).
- RF-5: SI un renglón no tiene imputación, ENTONCES EL SISTEMA no deja enviar la requisición y dice qué renglón falta junto a su campo.
- RF-6: EL SISTEMA ofrece para imputar solo los ítems directos, los rubros y los renglones indirectos de las planificaciones aprobadas vigentes de la obra de la requisición, una por frente (D12, D15).
- RF-54: SI lo pedido es de un frente de la obra que no tiene planificación aprobada, ENTONCES EL SISTEMA lo deja imputar a «Fuera de lo planeado» (D12).
- RF-7: EL SISTEMA muestra cada opción para imputar con su número y su descripción del presupuesto si es un ítem, con su descripción si es un rubro, o con su concepto y su descripción si es un renglón indirecto.
- RF-46: EL SISTEMA deja buscar la opción para imputar por su número o por su descripción, y muestra junto a cada una su capítulo y su frente (D9).
- RF-8: SI la obra no tiene ninguna planificación aprobada vigente, ENTONCES EL SISTEMA deja pedir sin imputar y muestra en la requisición el aviso «Sin planificación aprobada».
- RF-9: EL SISTEMA deja imputar al Almacenista sin mostrarle valores, cifras de la planificación ni avisos de exceso (046, RF-52).
- RF-10: CUANDO quien la pidió corrige una requisición devuelta, EL SISTEMA propone en cada renglón de la corrección la imputación y el valor estimado que tenía el renglón que reemplaza (046, RF-94).
- RF-55: SI la opción a la que estaba imputado un renglón ya no está en las planificaciones vigentes cuando se corrige o se envía, ENTONCES EL SISTEMA no deja enviar hasta escoger otra y dice qué renglón la perdió.

### Valor de cada renglón (D1, D6)

- RF-11: EL SISTEMA guarda en cada renglón de una requisición de compra nueva de obra un valor estimado en pesos (modifica la 046, RF-10) (D1).
- RF-12: SI quien pide no es el Almacenista y un renglón de compra no tiene valor estimado mayor que cero, ENTONCES EL SISTEMA no deja enviar la requisición y dice qué renglón falta.
- RF-13: CUANDO el Almacenista envía una requisición de compra, EL SISTEMA la deja enviar sin valores estimados (D6).
- RF-14: MIENTRAS una requisición del Almacenista está en el primer paso de la cadena que tiene persona —el del Residente, o el siguiente si la obra no tiene Residente (046, RF-71)—, EL SISTEMA deja a quien ocupa ese paso escribir el valor estimado de cada renglón (D6, D13).
- RF-15: SI a un renglón de una requisición del Almacenista le falta el valor estimado, ENTONCES EL SISTEMA no deja aprobarla a quien ocupa el paso de RF-14 y dice qué renglón falta (D6, D13).
- RF-16: EL SISTEMA anota en la historia de la requisición cada valor estimado escrito después de enviarla, con quién, cuándo y el valor.
- RF-17: EL SISTEMA no deja a quien ocupa el paso de RF-14 cambiar un valor estimado que el renglón ya tenía al llegar a su paso: completar uno que falta no es recortar (046, RF-80) (D6).
- RF-18: EL SISTEMA toma el valor estimado de la cabecera de una requisición de compra de obra (046, RF-13) como la suma de los valores estimados de sus renglones.

### Lo comprometido (H2, D1, D3)

- RF-19: EL SISTEMA cuenta como comprometido de un ítem, un rubro o un renglón indirecto el valor de los renglones imputados a él en requisiciones enviadas que no estén canceladas, rechazadas ni devueltas.
- RF-56: SI una requisición cancelada o rechazada tiene compras registradas sin anular, ENTONCES EL SISTEMA sigue contando como comprometido el valor real de esas compras (D14).
- RF-20: MIENTRAS un renglón de compra no tiene compra registrada, EL SISTEMA cuenta su valor estimado como comprometido (D1).
- RF-21: CUANDO se registra la compra de un renglón, EL SISTEMA cuenta como comprometido el valor real de esa compra en lugar del estimado (D1).
- RF-57: EL SISTEMA conserva y muestra el valor estimado de un renglón después de registrar su compra (constitución, principio 4).
- RF-47: CUANDO la Administradora o la Gerencia registran una compra que cubre renglones imputados a más de un ítem o renglón indirecto, EL SISTEMA les pide el valor real de cada renglón (D7).
- RF-48: SI la suma de los valores reales por renglón no da el valor de la compra, ENTONCES EL SISTEMA no la registra y dice cuánto falta o sobra (D7).
- RF-49: CUANDO una compra cubre renglones imputados todos al mismo ítem o renglón indirecto, EL SISTEMA no pide el valor por renglón y cuenta el valor de la compra contra ese ítem (D7).
- RF-22: SI se anula una compra registrada de una requisición que no está cancelada ni rechazada, ENTONCES EL SISTEMA vuelve a contar el valor estimado de sus renglones.
- RF-58: SI se anula una compra registrada de una requisición cancelada o rechazada, ENTONCES EL SISTEMA deja de contar sus renglones.
- RF-23: MIENTRAS una requisición de pago recorre la cadena, EL SISTEMA cuenta como comprometido su valor pedido (D14).
- RF-59: CUANDO una requisición de pago queda Aprobada, EL SISTEMA cuenta como comprometido su valor aprobado, que puede ser menor que el pedido (046, RF-79) (D1).
- RF-24: EL SISTEMA deja de contar como comprometidos los renglones que la Administradora o la Gerencia quitan al aprobar (046, RF-34).
- RF-60: CUANDO la Administradora o la Gerencia rebajan la cantidad de un renglón al aprobar, EL SISTEMA cuenta su valor estimado en proporción a la cantidad que quedó (046, RF-34).
- RF-25: EL SISTEMA no cuenta como comprometidos los renglones de las requisiciones hechas antes de esta spec ni los de las solicitudes SC y SP anteriores.

### Lo que se ve al pedir y al aprobar (H2, H3, D3)

- RF-26: EL SISTEMA muestra, por cada renglón imputado, el costo planeado de su ítem, rubro o renglón indirecto para toda la obra (D3).
- RF-61: EL SISTEMA muestra, por cada renglón imputado, lo ya comprometido en esa opción sin contar esta requisición (D3).
- RF-62: EL SISTEMA muestra, por cada renglón imputado, lo que queda: el costo planeado menos lo ya comprometido menos lo que pide esta requisición para esa opción (D3).
- RF-27: EL SISTEMA toma como costo planeado de un ítem directo su precio de costo por su medida para costo de la planificación vigente, como costo planeado de un rubro su costo (no su valor contractual), y como costo planeado de un renglón indirecto su total en esa planificación (D15). *(Precisado el 2026-11-17 al aprobar el plan: D3 compara contra el costo planeado.)*
- RF-28: SI la suma de lo ya comprometido y lo que pide esta requisición para un ítem o renglón indirecto pasa su costo planeado, ENTONCES EL SISTEMA muestra junto al renglón el aviso «Se pasa de lo planeado» con el total en que se pasa esa opción.
- RF-29: SI un ítem directo no tiene precio de costo en la planificación vigente, ENTONCES EL SISTEMA muestra «Sin precio de costo» en lugar del costo planeado y no avisa exceso (043, RF-80).
- RF-30: SI un renglón está imputado a «Fuera de lo planeado», ENTONCES EL SISTEMA muestra el aviso «Fuera de lo planeado» con su explicación en cada paso de aprobación.
- RF-31: EL SISTEMA muestra en la lista de Requisiciones de la obra y en la bandeja de Elemental una marca en las requisiciones que tienen algún renglón con «Se pasa de lo planeado» o «Fuera de lo planeado».
- RF-32: EL SISTEMA deja enviar y aprobar una requisición con avisos; ningún aviso bloquea (decisión del 2026-11-13).
- RF-33: EL SISTEMA calcula las cifras de RF-26 a RF-28 en el momento en que alguien abre la requisición, no cuando se envió.
- RF-63: CUANDO alguien aprueba una requisición, EL SISTEMA anota en la historia los avisos que tenía en ese momento: por renglón, «Se pasa de lo planeado» con cuánto, o «Fuera de lo planeado» (D16).
- RF-34: EL SISTEMA muestra las cifras de la planificación y los avisos de exceso a quienes ven los valores de la requisición: Residente, Director de Obra, Director de Proyectos, Administradora y Gerencia.
- RF-35: EL SISTEMA ofrece la mano de obra indirecta de cada planificación como una sola opción, el concepto «Mano de obra indirecta» con el total del concepto, sin sus renglones, para que nadie vea salarios que hoy no ve (045) (D10).

### Cambiar la imputación (H4, D4)

- RF-36: MIENTRAS una requisición está en el paso de la Administradora de Elemental, EL SISTEMA le deja cambiar a qué está imputado un renglón (D4).
- RF-64: MIENTRAS una requisición está en cualquier paso de la cadena, EL SISTEMA deja a la Gerencia cambiar a qué está imputado un renglón, como aprueba en cualquier paso (046, RF-26) (D4).
- RF-37: CUANDO la Administradora o la Gerencia cambian una imputación, EL SISTEMA anota en la historia qué renglón cambió, de qué opción a cuál, quién y cuándo, y la imputación anterior sigue visible (constitución, principio 4).
- RF-38: EL SISTEMA no deja al Residente, al Director de Obra ni al Director de Proyectos cambiar la imputación al aprobar: si no les cuadra, la devuelven (046, RF-80) (D4).

### Cuando cambia la versión de la planificación (D5)

- RF-39: CUANDO se aprueba una nueva versión de la planificación de una obra, EL SISTEMA cuenta lo comprometido de cada renglón contra la misma opción en la versión nueva (D5).
- RF-65: EL SISTEMA considera que un ítem es el mismo entre dos versiones si coinciden su número de pago y su frente; un rubro, si coinciden su descripción y su frente; y un renglón indirecto, si coinciden su concepto, su descripción y su frente (D12).
- RF-40: SI la opción a la que está imputado un renglón ya no está en la versión vigente, ENTONCES EL SISTEMA marca ese renglón «Sin ítem en la versión vigente» y lo muestra aparte, sin contarlo contra ningún ítem.
- RF-41: EL SISTEMA no cambia la imputación guardada de una requisición cuando cambia la versión de la planificación; la requisición es evidencia (constitución, principio 4).

### Resumen por obra

- RF-42: EL SISTEMA muestra en cada planificación vigente un resumen por ítem directo, por rubro y por renglón indirecto con lo planeado, lo comprometido y lo que queda (D8, D15).
- RF-50: EL SISTEMA resalta en el resumen los ítems y renglones indirectos cuyo comprometido pasa lo planeado, con cuánto se pasan (D8).
- RF-51: EL SISTEMA muestra en el resumen, aparte, el total comprometido «Fuera de lo planeado» y el de «Sin ítem en la versión vigente» (D8).
- RF-52: EL SISTEMA deja abrir desde cada fila del resumen las requisiciones que la componen (D8).
- RF-53: EL SISTEMA muestra el resumen a la Gerencia, al Director de Proyectos y al Director de Obra de esa obra (D8).
- RF-66: EL SISTEMA muestra en el resumen la mano de obra indirecta, para todos, como una sola fila con el total del concepto, porque así se imputa (D10, D15).

### Reglas transversales

- RF-43: EL SISTEMA comprueba en el servidor la imputación, el valor estimado y quién puede cambiarlos, sin fiarse de la pantalla.
- RF-44: EL SISTEMA calcula lo planeado, lo comprometido, lo que queda y el exceso con una sola regla que usan todas las pantallas.
- RF-45: SI dos personas guardan a la vez cambios sobre la misma requisición, ENTONCES EL SISTEMA guarda el primero y al segundo le dice que la recargue, como la 046.

## Superficies afectadas

- [ ] **Móvil** — sin cambios: las requisiciones no están en el celular.
- [x] **Panel web** — Planificación de la obra: resumen de lo comprometido (RF-42, RF-50 a RF-53). Elemental: registrar la compra con valor por renglón cuando hay ítems distintos (RF-47 a RF-49). Requisiciones de obra: formulario (imputación y valor estimado por renglón), detalle y paso de aprobación (cifras y avisos), lista y bandeja de Elemental (marca de avisos); paso del Residente para lo del Almacenista; cambio de imputación de la Administradora y la Gerencia.
- [x] **API** — las de requisiciones del panel: guardar y validar imputación y valor estimado; dar las cifras de la planificación por renglón.
- [ ] **Sincronización** — sin cambios.
- [x] **Datos** — imputación y valor estimado por renglón de requisición de compra; imputación de la requisición de pago; historia de los cambios de imputación y de los valores escritos por el Residente. Solo servidor.
- [x] **Reglas** — lo comprometido, lo que queda y el exceso por ítem; validación de la imputación; seguimiento del ítem entre versiones. Casos nuevos en `verificar-reglas.ts`.

## Requisitos no funcionales

- Las cifras de una requisición con 30 renglones se ven en menos de 2 segundos con dos planificaciones vigentes de 400 ítems y 60 renglones indirectos cada una.
- Todo el texto en español; valores en pesos con separador de miles.
- La tabla de renglones con sus cifras cabe en el ancho del panel sin esconder la columna de acciones.

## Casos límite

- **Sin señal**: no aplica; las requisiciones se hacen y se aprueban en el panel web.
- **Evidencia firmada**: no toca preoperacionales ni partes de obra. Una requisición enviada es evidencia: su imputación no se reescribe al cambiar la versión de la planificación (RF-41), y solo la Administradora o la Gerencia la cambian, con constancia (RF-37).
- **Primer arranque / equipo recién activado**: no aplica en el celular. Una obra sin planificación aprobada pide sin imputar, con aviso (RF-8).
- **La obra aprueba su primera planificación con requisiciones ya en curso**: esas requisiciones no tienen imputación y no cuentan (RF-25 aplica a lo hecho antes de esta spec; lo pedido sin planificación, RF-8, tampoco se cuenta). No se imputan después: quedan sin contar (D11).
- **Dos requisiciones del mismo ítem a la vez**: las dos se calculan contra lo comprometido en ese momento; si juntas se pasan, la que se abra después ya muestra el aviso (RF-33).
- **Una requisición devuelta**: deja de contar mientras está devuelta (RF-19) y vuelve a contar al reenviarse.
- **Un ítem con varias requisiciones y una compra que salió más cara**: al registrar la compra cuenta el real (RF-21), así que el aviso puede aparecer en requisiciones posteriores aunque no apareciera al pedir.
- **Cantidad rebajada al aprobar**: cuenta el valor estimado en proporción a la cantidad que quedó (RF-60).
- **Obra sin Residente**: el estimado de lo del Almacenista lo completa el primer paso con persona (RF-14, D13).
- **Requisición cancelada con compra registrada**: lo comprado sigue contando hasta que se anule la compra (RF-56, RF-58, D14).
- **Obra con dos frentes y uno solo planificado**: lo del otro frente va «Fuera de lo planeado» (RF-54, D12).
- **Formulario abierto mientras se aprueba una versión nueva**: si la opción escogida desaparece, no deja enviar hasta escoger otra (RF-55).
- **Quién aprobó sabiendo**: la historia guarda los avisos que había en cada aprobación (RF-63, D16).

## Fuera de alcance

- Amarrar las requisiciones de GeoLab y las de OCC (047).
- Imputar las requisiciones RQ hechas antes de esta spec y las SC y SP anteriores.
- Bloquear una requisición por pasarse de lo planeado.
- Cambiar la planificación desde una requisición, o mover plata entre ítems.
- Comparar lo comprometido con lo ejecutado en obra: el cumplimiento de la 043 sigue igual.
- Que la IA proponga la imputación.
- Repartir un renglón entre varios ítems: cada renglón va a uno solo.
- Imputar después las requisiciones pedidas sin planificación aprobada (D11).
- Imputar a un renglón concreto de la mano de obra indirecta (D10).
- Cambios en el celular del operador.

## Criterios de finalización

- Cada RF tiene cómo comprobarse: caso en `scripts/verificar-reglas.ts` (comprometido, lo que queda, exceso, cantidad rebajada, seguimiento entre versiones, validación de la imputación) o paso de demo manual.
- `npm run verificar`, `npm run typecheck` y `npm run lint` en verde.
- Demo manual en una obra de prueba con planificación aprobada:
  1. El Residente pide dos renglones imputados a dos ítems, uno de ellos pasado de lo planeado; ve las cifras y el aviso, y envía.
  2. El Almacenista pide un renglón imputado sin ver valores; el Residente no puede aprobarlo sin escribir el valor estimado, lo escribe y aprueba.
  3. Un renglón «Fuera de lo planeado» sin explicación no deja enviar; con explicación, el aviso se ve en cada paso.
  4. El Director de Obra y el Director de Proyectos ven los avisos y aprueban; la Administradora cambia una imputación y queda en la historia.
  5. Se registra la compra con un valor distinto del estimado y lo comprometido cambia.
  6. Se aprueba una versión nueva de la planificación sin uno de los ítems y el renglón aparece «Sin ítem en la versión vigente».
  7. Una obra sin planificación pide con el aviso «Sin planificación aprobada».
  8. Se registra una compra de dos renglones con ítems distintos: pide el valor de cada uno y no deja registrar si la suma no da.
  9. El resumen de la planificación muestra lo comprometido por ítem y por rubro, el exceso resaltado y la mano de obra indirecta en una sola fila, y abre las requisiciones.
  10. La historia de una requisición aprobada con exceso muestra el aviso que había en cada aprobación.
  11. Se cancela una requisición con una compra registrada y lo comprado sigue en el comprometido.

## Decisiones (entrevista con Diego, 2026-11-17)

- D1: Cada renglón de compra lleva un valor estimado; al registrar la compra cuenta el real. La requisición de pago cuenta con su valor aprobado (RF-11, RF-20, RF-21, RF-23).
- D2: Imputar es obligatorio, con la salida «Fuera de lo planeado» y explicación escrita, que avisa en cada paso (RF-2 a RF-5, RF-30).
- D3: Se compara contra el costo planeado del ítem para toda la obra: planeado, comprometido y lo que queda; si se pasa, avisa y deja seguir (RF-26 a RF-28, RF-32).
- D4: Imputa quien pide; solo la Administradora y la Gerencia cambian la imputación al aprobar; los demás devuelven, como la D11 de la 046 (RF-36 a RF-38).
- D5: Al cambiar de versión, lo comprometido sigue al mismo ítem; si el ítem ya no está, se marca aparte (RF-39 a RF-41).
- D6: El Almacenista imputa sin ver valores; el Residente pone el valor estimado en su paso y no aprueba sin él (RF-13 a RF-17).
- D7: Una compra con renglones de ítems distintos: la Administradora o la Gerencia digitan el valor real de cada renglón al registrarla, y la suma tiene que dar el de la compra (RF-47 a RF-49).
- D8: Hay resumen por obra en la planificación (planeado, comprometido, lo que queda y exceso por ítem), para Gerencia, Director de Proyectos y Director de Obra (RF-42, RF-50 a RF-53).
- D9: Para imputar se busca por número o descripción; cada opción muestra capítulo y frente (RF-46).
- D10: La mano de obra indirecta se imputa al concepto entero, sin renglones (RF-35).
- D11: Lo pedido sin planificación aprobada queda sin contar; no se imputa después.
- D12: Se imputa contra todas las planificaciones vigentes de la obra, una por frente; un ítem es el mismo entre versiones por número de pago y frente; lo de un frente sin planificación va «Fuera de lo planeado» (RF-2, RF-6, RF-54, RF-65).
- D13: Sin Residente, el estimado de lo del Almacenista lo pone el primer paso que tenga persona (RF-14, RF-15).
- D14: Lo comprado sigue contando aunque se cancele o rechace la requisición, hasta anular la compra; un pago cuenta lo pedido mientras recorre la cadena y lo aprobado desde que se aprueba (RF-23, RF-56, RF-58, RF-59).
- D15: Se puede imputar a los rubros; en el resumen la mano de obra indirecta es una sola fila para todos (RF-2, RF-27, RF-42, RF-66).
- D16: Cada aprobación guarda en la historia los avisos que había en ese momento (RF-63).

## Dudas abiertas

Ninguna: las cinco del borrador se cerraron el 2026-11-17 con D7–D11, y los cinco huecos de la clarificación con D12–D16.
