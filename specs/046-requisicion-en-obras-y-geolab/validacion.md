# Validación — Spec 046, Requisición en las obras, en GeoLab y en OCC

> Fecha: 2026-11-17 · Tareas T18 y T18b (2026-11-16) y T25, tras el cambio del 2026-11-17 (RF-86 a RF-94, D15–D19) · Base: desarrollo (`neondb`), obra `PRUEBA-046 Requisiciones`, GeoLab y OCC · Cuentas de prueba `prueba046.*` (Residente, Almacenista, Director de Obra, Director de Proyectos, Administradora, Auxiliar, Laboratorista y Encargado de OCC) en Chrome contra `localhost:8082` (T13 a T15) y `localhost:8081` (T16 en adelante).

## Comandos, ejecutados de verdad

```
$ npm run verificar
1019 verificaciones correctas.
(salida 0; 31 pruebas «046/»; en el cambio se añadió «046/RF-48, RF-91 (T22)» y se actualizaron, con su nota,
 las que fijaban Compras en Elemental, las dos solicitudes de OCC o la entrada de la Auxiliar a Compras)

$ npm run typecheck
> tsc --noEmit && tsc --noEmit -p tsconfig.scripts.json
(salida 0, sin errores)

$ npm run lint
> expo lint
(salida 0, sin avisos)
```

Fugas: limpias en la T9 a la T12, la T17 y la T22 (`npx expo export --platform web` sin errores; `grep -rlE "DATABASE_URL|ANTHROPIC_API_KEY|SECRETO_TOKENS|R2_LLAVE_SECRETA" dist/client` vacío; `dist` borrado). Las migraciones `0046` y `0047` están aplicadas solo en desarrollo; producción (`preoperaocc`) no se tocó y queda con 0042 a 0047 para el despliegue. Los datos de prueba viven solo en `neondb` (D19).

## Requisito por requisito

91 RF vigentes. 74 tienen al menos una prueba «046/» en `scripts/verificar-reglas.ts`. Los demás se comprobaron contra el servidor, en el navegador o revisando el código, en la tarea que se cita; el resultado está en las notas de ejecución de `tareas.md`. **Los 91 en verde.** En la primera pasada (16-nov) RF-78 no se cumplía y la T18b lo cerró. RF-70 llevaba una observación —corregir borraba los renglones de antes—; el cambio del 17-nov la resolvió con RF-94, sin relajar la constitución (principio 4).

| RF | Requisito | Qué lo cubre | Resultado |
| --- | --- | --- | --- |
| RF-2 | EL SISTEMA muestra Requisiciones de la obra al Residente, al Almacenista y a los Directores de Obra de esa obra, al Director de Proyectos, a la Administradora de Elemental y a la Gerencia. | 1 prueba «046/» · Tareas T9 | verde |
| RF-3 | EL SISTEMA muestra Requisiciones de GeoLab al Laboratorista, a la Administradora de Elemental y a la Gerencia. | 1 prueba «046/» · Tareas T9 | verde |
| RF-4 | EL SISTEMA deja escoger, al crear una requisición, si es **de compra** o **de pago**. | 1 prueba «046/» · Tareas T7, T9, T14 | verde |
| RF-5 | EL SISTEMA da a cada requisición nueva un número consecutivo del grupo con el prefijo **RQ** («RQ-0001»), uno solo para las de compra y las de pago. | 1 prueba «046/» · Tareas T5, T6, T9, T14 | verde |
| RF-6 | EL SISTEMA muestra en la lista de Requisiciones de un lugar también sus solicitudes de compra y de pago anteriores a esta spec, cada una con su número SC o SP. | Tareas T9, T14 · T9 en vivo (SC-0575 «Anterior» en la lista de su obra); T13 y T17 en Chrome (SC-0577 con su número en la lista de PRUEBA-046); T22 en vivo: SC-0574 de OCC con su número en la lista de OCC | verde |
| RF-7 | EL SISTEMA muestra en cada requisición si es de compra o de pago. | Tareas T9, T14 · T14 y T17 en Chrome: la lista dice «Compra» o «Pago» bajo cada número | verde |
| RF-8 | EL SISTEMA deja crear una requisición a quien la ve en ese lugar según RF-2 o RF-3, salvo a la Administradora de Elemental. | 1 prueba «046/» · Tareas T9, T14 | verde |
| RF-9 | EL SISTEMA guarda en la cabecera de una requisición el lugar, la urgencia (normal o urgente) y una nota general opcional. | 1 prueba «046/» · Tareas T7, T9, T14 | verde |
| RF-10 | EL SISTEMA guarda en cada renglón de una requisición de compra qué se necesita (texto, o un material del catálogo del almacén si es de una obra con Almacén), la cantidad, la unidad, **la fecha en que se necesita** y **para qué**. | 2 pruebas «046/» · Tareas T6, T7, T9, T14 | verde |
| RF-11 | SI un renglón de compra no tiene fecha en que se necesita o no tiene para qué, ENTONCES EL SISTEMA no guarda la requisición y dice qué renglón y qué le falta. | 1 prueba «046/» · Tareas T2, T9, T14 | verde |
| RF-12 | SI la fecha en que se necesita un renglón es anterior a hoy, contado con la fecha de Colombia, ENTONCES EL SISTEMA no guarda la requisición y dice qué renglón. | 1 prueba «046/» · Tareas T2, T9, T14 | verde |
| RF-13 | EL SISTEMA guarda en la cabecera de una requisición de compra, opcionales, el proveedor sugerido, el valor estimado y los adjuntos (cotizaciones, fotos, fichas técnicas), como la 036 (D14). | 1 prueba «046/» · Tareas T7, T9, T14 | verde |
| RF-14 | EL SISTEMA guarda en una requisición de pago lo que hoy lleva la solicitud de pago de la 037 (beneficiario, documento, concepto, valor y adjuntos), con una sola fecha en que se necesita y un solo para qué. | 1 prueba «046/» · Tareas T7, T9, T14 | verde |
| RF-15 | SI una requisición de compra no tiene ningún renglón, o un renglón no tiene descripción o su cantidad no es mayor que cero, ENTONCES EL SISTEMA no la guarda y dice qué falta, como la 036 (RF-9). | 1 prueba «046/» · Tareas T2, T9, T14 | verde |
| RF-16 | EL SISTEMA marca **Vencida** una requisición de compra cuando la fecha más cercana de sus renglones sin recibir del todo ya pasó. | 1 prueba «046/» · Tareas T5, T9, T14 | verde |
| RF-17 | EL SISTEMA marca **Vencida** una requisición de pago cuando su fecha ya pasó sin pagarse del todo. | 1 prueba «046/» · Tareas T5, T9, T14 | verde |
| RF-18 | EL SISTEMA lleva cada requisición de una obra por estos pasos, en orden: Residente, Director de Obra, Director de Proyectos y Administradora de Elemental. | 1 prueba «046/» · Tareas T3, T6, T8 | verde |
| RF-19 | EL SISTEMA lleva cada requisición de GeoLab directo al paso de la Administradora de Elemental. | 1 prueba «046/» · Tareas T3 | verde |
| RF-20 | CUANDO el Almacenista envía una requisición, EL SISTEMA la deja en el paso del Residente. | 1 prueba «046/» · Tareas T3 | verde |
| RF-21 | CUANDO quien envía una requisición es uno de los pasos de la cadena, EL SISTEMA la deja en el paso siguiente al suyo. | 1 prueba «046/» · Tareas T3 | verde |
| RF-22 | CUANDO la Gerencia envía una requisición, EL SISTEMA la deja en el paso de la Administradora de Elemental. | 1 prueba «046/» · Tareas T3 | verde |
| RF-23 | SI la obra no tiene una persona activa en un paso que no es el de la Administradora, ENTONCES EL SISTEMA salta ese paso, y los siguientes que tampoco la tengan, hasta el primero que sí. | 1 prueba «046/» · Tareas T3, T8, T9 | verde |
| RF-24 | CUANDO el sistema salta un paso, EL SISTEMA anota en la historia de la requisición qué paso se saltó y por qué. | 1 prueba «046/» · Tareas T3, T9 | verde |
| RF-25 | MIENTRAS una requisición está en un paso, EL SISTEMA deja aprobarla, devolverla o rechazarla a quien ocupa ese paso en ese lugar. | 3 pruebas «046/» · Tareas T4, T7, T10, T15 | verde |
| RF-26 | MIENTRAS una requisición está en cualquier paso, EL SISTEMA deja aprobarla, devolverla o rechazarla también a la Gerencia, salvo lo que dice RF-76. | 2 pruebas «046/» · Tareas T4, T7, T10, T15 | verde |
| RF-27 | CUANDO alguien que no es la Gerencia aprueba una requisición en un paso que no es el último, EL SISTEMA la pasa al paso siguiente. | 3 pruebas «046/» · Tareas T4, T7, T10, T15 | verde |
| RF-28 | CUANDO se aprueba una requisición en el paso de la Administradora de Elemental, EL SISTEMA la deja **Aprobada**. | 3 pruebas «046/» · Tareas T4, T7, T10, T15 | verde |
| RF-29 | CUANDO la Gerencia aprueba una requisición en cualquier paso, EL SISTEMA la deja **Aprobada** de una vez, sin pasar por los pasos que faltaban (D7). | 2 pruebas «046/» · Tareas T4, T7, T10, T15 | verde |
| RF-30 | CUANDO alguien devuelve una requisición, EL SISTEMA pide qué debe corregirse y la deja **Devuelta** a quien la pidió. | 2 pruebas «046/» · Tareas T4, T7, T10, T15 | verde |
| RF-31 | CUANDO quien la pidió vuelve a enviar una requisición devuelta, EL SISTEMA la lleva de nuevo por la cadena desde su primer paso, según RF-20 a RF-23. | 2 pruebas «046/» · Tareas T4, T7, T10, T15 | verde |
| RF-32 | CUANDO alguien rechaza una requisición, EL SISTEMA pide el motivo y la deja **Rechazada**, sin poder volver a abrirse. | 2 pruebas «046/» · Tareas T4, T7, T10, T15 | verde |
| RF-33 | EL SISTEMA guarda en la historia de la requisición cada aprobación, devolución, rechazo y salto, con quién, en qué paso, cuándo y el motivo si lo hay. | 4 pruebas «046/» · Tareas T4, T7, T10, T15 | verde |
| RF-34 | EL SISTEMA deja a la Administradora de Elemental y a la Gerencia, al aprobar una requisición de compra, quitar renglones o bajar cantidades, y anota qué cambió, como la 036 (RF-13) (D11). | 2 pruebas «046/» · Tareas T4, T7, T10, T15 | verde |
| RF-35 | MIENTRAS una requisición está Enviada (en cualquier paso) o Devuelta, EL SISTEMA deja a quien la pidió cancelarla con un motivo. | 1 prueba «046/» · Tareas T2, T15 | verde |
| RF-36 | MIENTRAS una requisición está Devuelta, EL SISTEMA deja a quien la pidió corregirla. *(Cambia la 036 y la 037, que dejaban corregir también mientras estaba Enviada: con la cadena, lo que un paso ya aprobó no cambia sin que se devuelva.)* | 1 prueba «046/» · Tareas T2, T15 | verde |
| RF-37 | MIENTRAS una requisición no está Aprobada, Rechazada ni Cancelada, EL SISTEMA deja cancelarla con un motivo a la Administradora de Elemental y a la Gerencia. | 1 prueba «046/» · Tareas T15 | verde |
| RF-39 | EL SISTEMA deja registrar y anular compras a la Administradora de Elemental y a la Gerencia. | 1 prueba «046/» · Tareas T1, T12 | verde |
| RF-40 | CUANDO una requisición de pago queda Aprobada, EL SISTEMA la lleva a Tesorería para pagarla, como la 037. | 1 prueba «046/» · Tareas T12, T16 | verde |
| RF-41 | EL SISTEMA deja registrar pagos de requisiciones de pago y de compras a la Auxiliar Administrativa, a la Administradora de Elemental y a la Gerencia. | 2 pruebas «046/» · Tareas T1, T12 | verde |
| RF-42 | EL SISTEMA deja anular pagos a la Administradora de Elemental y a la Gerencia. | 1 prueba «046/» · Tareas T1, T12 | verde |
| RF-43 | EL SISTEMA conserva el recibir de la 036 (RF-20 a RF-22) en las requisiciones de compra. | Tareas T12 · T12 en vivo (la Auxiliar marca el cemento de RQ-0001: Recibida en parte); T17 en Chrome (el Almacenista recibe RQ-0004: Recibida) | verde |
| RF-44 | EL SISTEMA conserva para las requisiciones los estados posteriores a la aprobación de la 036 (Comprada, Recibida en parte, Recibida) y de la 037 (Pagada en parte, Pagada). | Tareas T12 · T12 en vivo (Comprada, Recibida en parte, Pagada); T16 y T17 en Chrome (RQ-0004 Comprada y Recibida; RQ-0005 Pagada) | verde |
| RF-45 | EL SISTEMA muestra arriba en Requisiciones de un lugar, a cada persona, las que esperan su aprobación; para la Gerencia, las que están en el paso de la Administradora. | 1 prueba «046/» · Tareas T5, T9, T14 | verde |
| RF-46 | EL SISTEMA muestra en cada requisición en qué paso está y quién puede aprobarla en ese paso. | 2 pruebas «046/» · Tareas T12, T15 | verde |
| RF-47 | EL SISTEMA muestra a la Administradora de Elemental y a la Gerencia, en Elemental, una sola bandeja **Requisiciones** con las requisiciones del grupo de compra y de pago que esperan el paso de la Administradora, las urgentes arriba y luego por la fecha más cercana en que se necesitan (D8). | 4 pruebas «046/» · Tareas T5, T11, T13, T16 | verde |
| RF-48 | EL SISTEMA muestra en esa bandeja cuántas esperan el paso de la Administradora, cuántas son urgentes y cuántas están vencidas. | 2 pruebas «046/» · Tareas T5, T11, T16 | verde |
| RF-49 | EL SISTEMA muestra en Requisiciones de un lugar, primero, las abiertas y después las cerradas (Recibida, Pagada, Rechazada, Cancelada). | 1 prueba «046/» · Tareas T5, T9, T14 | verde |
| RF-50 | EL SISTEMA deja buscar requisiciones por número (RQ, SC o SP), texto de los renglones, beneficiario, proveedor o quien pidió, sin distinguir mayúsculas ni tildes. | 1 prueba «046/» · Tareas T5, T9, T14 | verde |
| RF-51 | EL SISTEMA filtra las requisiciones por tipo (compra o pago), paso, estado, urgencia y rango de fechas. | 1 prueba «046/» · Tareas T5, T9, T14 | verde |
| RF-52 | EL SISTEMA no muestra al Almacenista los valores de las requisiciones, de las compras ni de los pagos, salvo los de las requisiciones de pago que pidió él (036, RF-31; 037, RF-5a). | Tareas T9, T14 · T9 en vivo (el Almacenista ve las requisiciones sin valor); T14 y T17 en Chrome (valor «—» y sin «Valor estimado» para el Almacenista) | verde |
| RF-53 | EL SISTEMA conserva el número SC o SP de cada solicitud de compra o de pago anterior a esta spec. | 1 prueba «046/» · Tareas T6 | verde |
| RF-54 | MIENTRAS una solicitud anterior a esta spec está Enviada o Devuelta, EL SISTEMA la deja en el paso único de la 036 o la 037, sin pasarla por la cadena. | Tareas T11, T12 · T11 y T12 en vivo (SC-0577 por la ruta de la 036, en su paso único); T17 en Chrome (la Administradora la aprueba con los botones de la 036 desde la bandeja) | verde |
| RF-55 | EL SISTEMA deja aprobar, devolver y rechazar las solicitudes anteriores a esta spec a la Administradora de Elemental y a la Gerencia. | 1 prueba «046/» · Tareas T11, T12 | verde |
| RF-56 | EL SISTEMA no borra ni cambia la historia de ninguna solicitud anterior a esta spec. | Revisión: la migración 0046 añade columnas sin `default` y no reescribe eventos; T6 comprobó que las SC de desarrollo siguen sin número RQ ni paso; ninguna ruta nueva escribe en la historia de una SC o SP anterior | verde |
| RF-57 | EL SISTEMA tiene un acceso **Administradora de Elemental**, de la empresa Elemental y sin obra. | 2 pruebas «046/» · Tareas T1, T6 | verde |
| RF-58 | EL SISTEMA deja dar el acceso de Administradora de Elemental solo a la Gerencia. | 1 prueba «046/» · Tareas T1 | verde |
| RF-59 | EL SISTEMA muestra a la Administradora de Elemental, en Elemental, todos los módulos que ve hoy la Auxiliar Administrativa. | Tareas T1 · T18: comparación de `alcanza` en los 27 módulos: la Administradora y la Auxiliar solo difieren en Compras, Tesorería, Solicitudes y la bandeja (lo que la spec cambia a propósito) | verde |
| RF-60 | EL SISTEMA deja a la Administradora de Elemental, en Recursos Humanos, Documentos y cortes, lo mismo que a la Auxiliar Administrativa. | Tareas T1 · T18: la misma comparación: Recursos Humanos, Documentos y cortes, iguales | verde |
| RF-61 | EL SISTEMA no deja a la Administradora de Elemental dar accesos al panel. | 1 prueba «046/» · Tareas T1 | verde |
| RF-62 | EL SISTEMA no deja a la Auxiliar Administrativa aprobar, devolver, rechazar ni cancelar requisiciones, ni solicitudes de compra o de pago anteriores o de OCC. | 1 prueba «046/» · Tareas T1, T12 | verde |
| RF-63 | EL SISTEMA no deja a la Auxiliar Administrativa registrar ni anular compras, ni anular pagos. | 1 prueba «046/» · Tareas T1 | verde |
| RF-64 | EL SISTEMA conserva a la Auxiliar Administrativa lo que hoy tiene en Recursos Humanos, Documentos y cortes. | 1 prueba «046/» · Tareas T1 | verde |
| RF-66 | EL SISTEMA deja aprobar, devolver y rechazar las solicitudes de OCC a la Administradora de Elemental y a la Gerencia. | 1 prueba «046/» · Tareas T1, T12 | verde |
| RF-67 | EL SISTEMA comprueba en el servidor que quien aprueba, devuelve o rechaza ocupa el paso en que está la requisición, o es la Gerencia. | 1 prueba «046/» · Tareas T4, T10 | verde |
| RF-68 | SI dos personas actúan a la vez sobre la misma requisición, ENTONCES EL SISTEMA deja pasar la primera y a la segunda le dice que cambió, sin pisar en silencio. | 1 prueba «046/» · Tareas T10 | verde |
| RF-69 | EL SISTEMA no muestra una requisición a quien no la ve según RF-2 o RF-3, ni por su dirección. | T17 en vivo: el Director de Obra de PRUEBA-046 pide la RQ-0007 de GeoLab por su dirección y recibe 404; el filtro sale de `alcance.ts` (T9) | verde |
| RF-70 | EL SISTEMA no borra requisiciones, renglones, compras, pagos ni adjuntos: se cancelan, se rechazan o se anulan con motivo. | Tareas T21 · Revisión: cancelar, rechazar y anular escriben estado y motivo; ningún `DELETE` en las rutas. Desde el cambio del 17-nov tampoco al corregir (RF-94, T21): en `src/` no queda ningún `delete` de renglones | verde |
| RF-71 | CUANDO un paso de la cadena que no es el de la Administradora se queda sin ninguna persona activa en esa obra (porque se fue, quedó inactiva o cambió de acceso), EL SISTEMA pasa al paso siguiente las requisiciones que esperaban en él y lo anota en su historia, como en RF-24 (D9). | 1 prueba «046/» · Tareas T5, T11 | verde |
| RF-72 | SI a una requisición de pago le falta el beneficiario, el concepto o el para qué, o su valor no es mayor que cero, o su fecha es anterior a hoy, ENTONCES EL SISTEMA no la guarda y dice qué falta junto a su campo, como la 037 (RF-8). | 1 prueba «046/» · Tareas T2 | verde |
| RF-73 | EL SISTEMA da por ocupado el paso del Director de Proyectos cuando hay al menos un Director de Proyectos activo en el grupo, y en ese paso puede actuar cualquiera de ellos. | 1 prueba «046/» · Tareas T3, T8 | verde |
| RF-74 | SI no hay ninguna Administradora de Elemental activa, ENTONCES EL SISTEMA deja la requisición esperando en el paso de la Administradora, sin saltarlo (D10). | 1 prueba «046/» · Tareas T3, T8 | verde |
| RF-75 | MIENTRAS no hay ninguna Administradora de Elemental activa, EL SISTEMA avisa en la bandeja de la Gerencia que las requisiciones de ese paso la esperan a ella (D10). | Tareas T8, T11, T16 · T11 en vivo (`sinAdministradora: true` con la Administradora de prueba inactiva, y `false` reactivada); T14: el aviso en la bandeja | verde |
| RF-76 | SI quien va a aprobar, devolver o rechazar una requisición es quien la pidió, ENTONCES EL SISTEMA no lo deja, en ningún paso (D12). | 1 prueba «046/» · Tareas T4, T10, T15 | verde |
| RF-77 | CUANDO la Gerencia pide una requisición y no hay ninguna Administradora activa, EL SISTEMA deja que la apruebe otra persona de la Gerencia (D12). | 1 prueba «046/» · Tareas T4, T10, T15 | verde |
| RF-78 | SI al corregir una requisición devuelta se cambia de compra a pago o de pago a compra, ENTONCES EL SISTEMA no guarda la corrección y dice que para eso se cancela y se crea otra. | 1 prueba «046/» · Tareas T10, T15 · T18b: `cambiaDeClaseAlCorregir` encadenada antes de los contratos de corregir de la 036 y la 037; un cuerpo de la otra clase responde «…cancélela y pida otra…» antes que cualquier otra falta (en la primera pasada faltaba el aviso) | verde |
| RF-79 | EL SISTEMA deja a la Administradora de Elemental y a la Gerencia, al aprobar una requisición de pago, aprobar un valor menor que el pedido, y lo anota, como la 037 (RF-11) (D11). | 1 prueba «046/» · Tareas T4, T10, T15 | verde |
| RF-80 | EL SISTEMA no deja al Residente, al Director de Obra ni al Director de Proyectos cambiar renglones, cantidades ni valores al aprobar: si algo no les cuadra, la devuelven (D11). | 1 prueba «046/» · Tareas T4, T10, T15 | verde |
| RF-81 | SI al aprobar se quitarían todos los renglones de una requisición de compra, ENTONCES EL SISTEMA no lo deja y dice que para eso se rechaza. | 1 prueba «046/» · Tareas T4, T10, T15 | verde |
| RF-82 | MIENTRAS una requisición recorre la cadena, EL SISTEMA muestra su estado como «En aprobación» con el nombre del paso en que está (por ejemplo, «En aprobación: Director de Obra»). | 1 prueba «046/» · Tareas T5, T15 | verde |
| RF-83 | EL SISTEMA muestra en esa misma bandeja las solicitudes de compra y de pago anteriores a esta spec y las de OCC que esperan aprobación, con su número SC o SP y la marca «Anterior» u «OCC» (D13). *(Desde RF-86, las nuevas de OCC son requisiciones RQ; la marca «OCC» queda para las SC y SP de OCC anteriores al cambio.)* | 2 pruebas «046/» · Tareas T11, T16, T22 | verde |
| RF-84 | EL SISTEMA muestra a la Auxiliar Administrativa, en Tesorería, las requisiciones de pago Aprobadas y las compras por pagar, para pagarlas, y no las que todavía recorren la cadena. | Tareas T12, T16 · T12 en vivo (RQ-0002 no sale en Tesorería mientras espera a la Administradora y sí aprobada); T16 y T17 en Chrome (la Auxiliar ve solo lo aprobado y paga RQ-0005) | verde |
| RF-85 | EL SISTEMA conserva a la Auxiliar Administrativa marcar lo recibido de una requisición de compra, como la 040 (RF-5), aunque ya no registre compras (decidido al planificar, 2026-11-16). | 1 prueba «046/» · Tareas T2, T12 | verde |
| RF-86 | EL SISTEMA muestra en cada obra, en GeoLab y en OCC un módulo **Requisiciones** en lugar de «Solicitudes de compra» y «Solicitudes de pago» (D15). | 1 prueba «046/» · Tareas T19, T22, T24 | verde |
| RF-87 | EL SISTEMA muestra Requisiciones de OCC a quienes hoy ven las Solicitudes de compra y de pago de OCC, a la Administradora de Elemental y a la Gerencia, y deja crear una a quien hoy puede pedirlas allí (D16). | Tareas T22, T24 · T19: la Administradora entra a OCC (prueba «046/RF-57») y el menú de OCC le muestra solo Requisiciones; T22 en vivo: el Encargado de OCC de prueba pide y lista; T23 en Chrome | verde |
| RF-88 | EL SISTEMA lleva cada requisición de OCC directo al paso de la Administradora de Elemental, como las de GeoLab (RF-19), hasta que la 047 le dé su formato (D16). | Tareas T19, T22, T24 · Prueba «046/RF-18 a RF-22» (caso de OCC añadido en la T19); T22 en vivo: RQ-0009 de OCC arranca «En aprobación: Administradora de Elemental» | verde |
| RF-89 | CUANDO una requisición de compra queda Aprobada, EL SISTEMA la deja en Requisiciones de Elemental para registrar la compra, anularla y marcar lo recibido, como la 036 (D15). | 1 prueba «046/» · Tareas T19, T22, T23, T24 · T23 en Chrome: la Administradora aprueba RQ-0009 y registra la compra en el mismo detalle de Requisiciones de Elemental; la Auxiliar recibe ahí | verde |
| RF-90 | EL SISTEMA no muestra en Elemental un módulo Compras aparte: lo que hacía —ver las solicitudes del grupo, registrar y anular compras, recibir— se hace en Requisiciones de Elemental (D15). | 1 prueba «046/» · Tareas T19, T22, T23, T24 · T23 en Chrome: Elemental sin «Compras» en el menú y `…/elemental/compras` lleva a Requisiciones | verde |
| RF-91 | EL SISTEMA muestra en Requisiciones de Elemental, además de las que esperan aprobación (RF-47), las aprobadas por comprar, las compradas sin recibir del todo y las cerradas, de todo el grupo (D15). | 1 prueba «046/» · Tareas T19, T22, T23, T24 · T22 en vivo: 12 filas en 8 estados (en aprobación, aprobada, recibida, pagada, cancelada…) con lo que espera arriba | verde |
| RF-92 | EL SISTEMA muestra Requisiciones de Elemental también a la Auxiliar Administrativa, sin aprobar, devolver, rechazar ni registrar o anular compras, para que marque lo recibido (RF-85) (D15). | 2 pruebas «046/» · Tareas T19, T23, T24 · T22 en vivo y T23 en Chrome: la Auxiliar ve la lista, sin nada que espere su aprobación, y solo «Recibir lo que llegó» en el detalle | verde |
| RF-93 | EL SISTEMA muestra en Tesorería de Elemental el gasto por obra y por empresa que hoy muestra Compras en su pestaña «Gasto», a quienes hoy lo ven (D17). | Tareas T23, T24 · T23 en Chrome: Tesorería, pestaña «Gasto», con lo comprado por lugar (OCC incluido) | verde |
| RF-94 | CUANDO quien la pidió corrige una requisición devuelta, o una solicitud SC anterior, EL SISTEMA marca como reemplazados los renglones de antes, con cuándo y en qué corrección, y muestra solo los vigentes; no los borra (constitución, principio 4) (D18). | Tareas T20, T21, T24 · T21 en vivo: al corregir RQ-0008, los 2 renglones viejos quedan en la base marcados con su evento y el detalle muestra solo los 2 nuevos | verde |

### Sustituidos por el cambio del 2026-11-17

| RF | Lo reemplaza | Comprobación de que ya no vale lo de antes |
| --- | --- | --- |
| RF-1 (Requisiciones solo en las obras y en GeoLab) | RF-86 | Prueba «046/RF-86, RF-47, RF-90, RF-92»: OCC con Requisiciones y sin sus dos solicitudes |
| RF-38 (lo aprobado de compra va a Compras de Elemental) | RF-89 | T23: la compra se registra en Requisiciones de Elemental; Compras ya no existe como página |
| RF-65 (OCC conserva sus solicitudes hasta la 047) | RF-86 a RF-88 | T22: las rutas viejas de crear responden 409 también en OCC; RQ-0009 de OCC va a la Administradora |

## Demo de los «Criterios de finalización»

La de la spec, en la T17 (16-nov); la del cambio, en la T21 a la T24 (17-nov). Todo en Chrome salvo, por la API con la cuenta de cada persona: las aprobaciones de la cadena antes de la Administradora en la T16 (vistas en Chrome en la T15), la requisición de pago del Director de Obra (el campo de fecha del navegador no se dejó escribir), la de la obra sin Director de Obra, la de GeoLab, la de OCC y la corrección de RQ-0008, cuyo resultado se miró directamente en la base.

## Observaciones para Diego

- Los avisos al recibir y al pagar dicen «La solicitud quedó completa» y «La solicitud quedó pagada», también en una requisición: son textos de la 036 y la 037.
- El asistente de IA sigue llamando «Compras de Elemental» a las solicitudes del grupo y enlaza `…/elemental/compras`, que ahora lleva a Requisiciones. El asistente está fuera de esta spec.
- En Requisiciones de OCC sale el filtro «Paso», que allí no sirve: solo hay el de la Administradora.
- En `neondb` quedan la obra `PRUEBA-046`, ocho cuentas `prueba046.*` y RQ-0001 a RQ-0009 con SC-0577. RQ-0008 quedó en el paso del Residente; lo demás está cerrado o es de consulta. Nada de esto va a producción.
