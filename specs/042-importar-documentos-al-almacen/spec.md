# Spec 042 — Importar documentos al Almacén con IA

> Estado: **Cumplida** el 2026-11-13 (`validacion.md`, 98 RF en verde) · Aprobada por Diego el 2026-11-12, tras la clarificación (D9–D30) · Fecha: 2026-11-12 · Última de la tanda 041–044 (depende de la 009, Almacén; de la 041, cargos de obra; y reutiliza la lectura de documentos de la 023)

## Contexto y objetivo

Lo que entra al almacén de una obra llega con papel: una factura del proveedor, una remisión del
transportador, a veces una lista en Excel o una foto del documento firmado. Hoy el almacenista lo
digita renglón por renglón (spec 009), y en el camino se pierden tres cosas que el papel sí trae: a
quién se le compró, con qué número de documento y a qué precio. Esta spec deja subir ese documento:
la IA lo lee y propone los ingresos —qué material, cuánto, en qué unidad, de qué proveedor, con qué
número y a qué valor—, quien importa corrige lo que haga falta y confirma, y entonces quedan todos los
ingresos o ninguno. El documento original queda guardado como respaldo de lo que entró.

## Usuarios / actores

- **Almacenista** (panel web): importa los documentos de su obra, revisa la propuesta y la confirma.
- **Director de Obra** (panel web): lo mismo, en sus obras. Hoy no registra ingresos a mano y esta spec
  no le da ese permiso: solo puede registrarlos importando un documento (D4).
- **Director de Proyectos** y **Gerencia** (panel web): lo mismo, en cualquier obra.
- **Residente** (panel web): no importa; consulta los ingresos importados, con su proveedor, documento y
  valor (D3).
- **Operador** (móvil): no cambia nada para él.
- **Encargado de Planta, Laboratorista, Encargado de OCC, Auxiliar Administrativa**: sin acceso, como
  hoy al Almacén.

## Historias de usuario

- H1: Como almacenista quiero subir la factura o la remisión de lo que llegó, para no digitar renglón
  por renglón lo que el papel ya dice.
- H2: Como almacenista quiero revisar y corregir lo que la IA leyó antes de que entre al almacén, porque
  el documento puede estar borroso o traer unidades distintas.
- H3: Como almacenista quiero que lo de un documento entre completo o no entre, para que el stock no
  quede con media factura.
- H4: Como director o gerencia quiero ver en cada ingreso el proveedor, el número de documento y el
  valor, para saber a quién se le compró y a qué precio.
- H5: Como gerencia quiero que el documento original quede guardado con sus ingresos, para tener el
  respaldo de lo que entró.
- H6: Como almacenista quiero que el sistema me avise si un documento ya se importó, para no meter dos
  veces la misma factura.

## Requisitos funcionales (criterios de aceptación en EARS)

### Subir el documento (H1)

- RF-1: EL SISTEMA permite importar un documento al Almacén de una obra únicamente a quien tiene acceso
  de Almacenista, Director de Obra, Director de Proyectos o Gerencia en esa obra (D19).
- RF-2: SI quien intenta importar tiene cualquier otro acceso, Residente incluido, ENTONCES EL SISTEMA lo
  rechaza (D19).
- RF-3: EL SISTEMA acepta documentos en PDF, en Excel (.xlsx), en Word (.docx) y en foto (JPG o PNG).
- RF-4: SI el archivo es un Excel o un Word del formato antiguo (.xls, .doc), ENTONCES EL SISTEMA lo
  rechaza explicando que hay que guardarlo en el formato nuevo.
- RF-5: SI el contenido del archivo no corresponde al formato que dice su nombre, ENTONCES EL SISTEMA
  lo rechaza explicando el motivo.
- RF-6: SI el archivo pesa más de 20 MB, ENTONCES EL SISTEMA lo rechaza diciendo el límite.
- RF-59: SI el documento tiene más de 10 páginas, ENTONCES EL SISTEMA lo rechaza pidiendo partirlo (D13).
- RF-60: SI el Excel tiene más de 200 renglones con datos, ENTONCES EL SISTEMA lo rechaza pidiendo partirlo
  (D13).
- RF-61: SI el PDF está protegido con contraseña, ENTONCES EL SISTEMA lo rechaza explicando el motivo
  (D27).
- RF-62: DONDE el PDF sea un escaneo sin texto, EL SISTEMA lo lee como una foto (D27).
- RF-63: SI el módulo Almacén no está activo en la obra, ENTONCES EL SISTEMA no deja importar (D25).
- RF-7: CUANDO se sube un documento aceptado, EL SISTEMA lo lee con IA y propone los ingresos que trae.
- RF-8: MIENTRAS la lectura está en curso, EL SISTEMA muestra que se está leyendo el documento y el
  tiempo que lleva.
- RF-64: CUANDO quien importa cierra la página mientras se lee, EL SISTEMA sigue leyendo el documento (D15).
- RF-65: CUANDO quien importó vuelve al Almacén de esa obra, EL SISTEMA le muestra sus propuestas
  pendientes para revisarlas (D15, D32).
- RF-98: EL SISTEMA permite tener varias propuestas pendientes a la vez en una misma obra (D32).
- RF-66: SI una propuesta lleva un día sin confirmarse, ENTONCES EL SISTEMA la descarta (D15).
- RF-9: SI la lectura falla o no encuentra ningún material, ENTONCES EL SISTEMA no propone nada y
  explica el motivo.
- RF-67: SI la lectura de la IA queda cortada antes de terminar el documento, ENTONCES EL SISTEMA no
  propone nada y explica que el documento es demasiado largo para leerlo de una vez (D13).
- RF-68: SI el documento trae más de un proveedor o más de un número de documento, ENTONCES EL SISTEMA no
  propone nada y pide subir cada documento por separado (D14).

### La propuesta (H1, H2)

- RF-10: EL SISTEMA propone, por cada renglón del documento que es un material recibido, el material,
  la cantidad y la unidad.
- RF-11: EL SISTEMA propone, para todo el documento, el proveedor, el tipo de documento (factura,
  remisión u otro), su número y su fecha.
- RF-12: EL SISTEMA propone, por cada renglón, el valor unitario tal como lo indica el documento, sin
  quitarle ni sumarle impuestos (D7).
- RF-69: DONDE el documento traiga solo el valor total de un renglón, EL SISTEMA propone el valor unitario
  dividiendo ese total entre la cantidad del documento (D10).
- RF-70: EL SISTEMA marca «Calculado del total» un valor unitario propuesto así (D10).
- RF-71: SI el valor del documento está en una moneda distinta del peso, ENTONCES EL SISTEMA deja el valor
  unitario vacío y avisa la moneda (D27).
- RF-13: EL SISTEMA propone «Entregado por» con el nombre que el documento traiga de quien entregó.
- RF-72: SI el documento trae conductor y transportador, ENTONCES EL SISTEMA propone al conductor como
  «Entregado por» (D21).
- RF-14: SI el documento no trae quién entregó, ENTONCES EL SISTEMA deja «Entregado por» vacío para que
  lo escriba quien importa.
- RF-15: EL SISTEMA cita, en cada renglón propuesto, de dónde salió: la página en un PDF o una foto, la
  hoja y la fila en un Excel, y el párrafo o la fila de tabla en un Word.
- RF-16: SI en un Excel o un Word la cantidad o el valor propuesto no está en la fila o el párrafo que
  cita, ENTONCES EL SISTEMA lo descarta y marca el renglón para revisar.
- RF-17: EL SISTEMA no propone como ingreso lo que no es material recibido: totales, impuestos, fletes,
  descuentos, encabezados, servicios, alquileres ni transportes (D20).
- RF-73: EL SISTEMA lista aparte los renglones del documento que dejó por fuera, con el motivo (D20).
- RF-74: SI un renglón trae una cantidad negativa, ENTONCES EL SISTEMA no lo propone como ingreso y lo
  lista aparte explicando que una devolución o nota crédito no es un ingreso (D27).
- RF-75: SI el documento dice ir a otra obra, ENTONCES EL SISTEMA lo avisa sin impedir la confirmación
  (D26).
- RF-18: MIENTRAS no se confirme, EL SISTEMA no registra nada en el Almacén.

### El material de cada renglón (H2)

- RF-19: EL SISTEMA propone para cada renglón el material vigente del almacén de la obra que la IA
  considera el mismo, aunque el documento lo nombre distinto (D11).
- RF-76: EL SISTEMA muestra en cada renglón el nombre del material tal como lo trae el documento, junto
  al material propuesto (D11).
- RF-20: CUANDO la IA no encuentra el material entre los vigentes de la obra, EL SISTEMA propone crearlo
  con un nombre de la lista de materiales de OCC o, si no está en ella, como «Otro» con su nombre.
- RF-21: EL SISTEMA permite cambiar el material de cada renglón por otro vigente de la obra, por uno
  nuevo de la lista de OCC o por uno «Otro».
- RF-22: EL SISTEMA no propone ni deja escoger un material dado de baja.
- RF-23: EL SISTEMA pide la unidad de un material nuevo de la lista cerrada del Almacén (spec 009,
  RF-31).
- RF-77: SI la unidad del documento no está en la lista cerrada, ENTONCES EL SISTEMA deja la unidad de un
  material nuevo por escoger, y su cantidad por escribir en la unidad escogida (D17).
- RF-78: EL SISTEMA permite al Director de Obra crear materiales nuevos únicamente al confirmar un
  documento importado (D28).

### Unidades distintas (H2)

- RF-79: EL SISTEMA trata como la misma unidad las formas comunes de escribirla, como «kg», «KG»,
  «kilos» y «kilogramo» (D11).
- RF-24: SI la unidad del renglón no es la del material del Almacén, ENTONCES EL SISTEMA marca el
  renglón «Unidad distinta».
- RF-25: DONDE el documento diga cuánto trae cada unidad (por ejemplo, «bulto x 50 kg»), EL SISTEMA
  propone la cantidad convertida a la unidad del material.
- RF-80: DONDE la conversión no dependa del documento (por ejemplo, de toneladas a kilogramos), EL
  SISTEMA propone la cantidad convertida (D11).
- RF-26: EL SISTEMA muestra junto a una cantidad convertida de dónde sale la conversión: el texto del
  documento o la equivalencia usada («1 t = 1.000 kg»).
- RF-27: SI no hay cómo convertir, ENTONCES EL SISTEMA deja la cantidad sin proponer para que la escriba
  quien importa en la unidad del material.
- RF-29: CUANDO se convierte la cantidad de un renglón, EL SISTEMA guarda el valor unitario como lo trae
  el documento, con la unidad del documento a la que corresponde (D8).
- RF-58: EL SISTEMA muestra el valor unitario con su unidad («$30.000 por bulto»).

### Revisar y confirmar (H2, H3)

- RF-30: EL SISTEMA permite corregir, antes de confirmar, la cantidad, el factor de conversión, el
  valor unitario, el proveedor, el tipo, el número y la fecha del documento, y «Entregado por».
- RF-31: EL SISTEMA permite quitar un renglón de la propuesta antes de confirmar.
- RF-32: EL SISTEMA propone como fecha de los ingresos la fecha del documento.
- RF-33: SI el documento no trae fecha, ENTONCES EL SISTEMA propone la fecha de hoy según la fecha de
  Colombia (D22).
- RF-34: SI la fecha de los ingresos es posterior a hoy según la fecha de Colombia, ENTONCES EL SISTEMA
  rechaza la confirmación (spec 009, RF-10; D22).
- RF-81: EL SISTEMA exige para confirmar, en cada renglón, el material, la cantidad y la fecha (D9).
- RF-82: EL SISTEMA permite confirmar sin proveedor, sin número de documento o sin valor unitario (D9).
- RF-35: SI la cantidad de un renglón no es mayor que cero, ENTONCES EL SISTEMA rechaza la confirmación
  señalando el renglón (spec 009, RF-9).
- RF-36: SI falta «Entregado por», ENTONCES EL SISTEMA rechaza la confirmación diciendo que falta
  (spec 009, RF-42).
- RF-37: SI un renglón no tiene cantidad, ENTONCES EL SISTEMA no deja confirmar hasta que se escriba o se
  quite el renglón (D12).
- RF-28: SI un renglón marcado «Unidad distinta» no tiene la cantidad convertida, ENTONCES EL SISTEMA no
  deja confirmar señalando el renglón (D12).
- RF-83: SI un renglón quedó marcado para revisar por RF-16, ENTONCES EL SISTEMA no deja confirmar hasta
  que se corrija o se quite (D12).
- RF-84: SI un renglón no tiene material escogido, ENTONCES EL SISTEMA no deja confirmar señalando el
  renglón (D12).
- RF-85: EL SISTEMA deja confirmar un renglón con la marca «Unidad distinta» ya convertido o con la marca
  «Calculado del total», mostrando la marca como aviso (D12).
- RF-38: CUANDO se confirma, EL SISTEMA registra un ingreso por cada renglón, con su fecha, su
  material, su cantidad, su valor unitario con su unidad, el proveedor, el tipo y el número del documento, y
  «Entregado por».
- RF-39: CUANDO se confirma con materiales nuevos, EL SISTEMA los crea en el almacén de la obra en la
  misma confirmación.
- RF-40: SI cualquier renglón no se puede registrar, ENTONCES EL SISTEMA no registra ninguno y dice cuál
  falló y por qué.
- RF-41: SI al confirmar un material nuevo tiene el mismo nombre que otro vigente de la obra, ENTONCES EL
  SISTEMA rechaza la confirmación nombrando el material (spec 009, RF-3).
- RF-86: SI al confirmar un material propuesto ya está dado de baja, ENTONCES EL SISTEMA rechaza la
  confirmación nombrando el material, sin registrar nada (D24).
- RF-42: EL SISTEMA registra quién importó el documento.
- RF-87: EL SISTEMA registra cuándo se confirmó el documento (D30).
- RF-88: EL SISTEMA confirma cada propuesta una sola vez (D16).
- RF-89: SI se intenta confirmar una propuesta ya confirmada, ENTONCES EL SISTEMA lo rechaza diciendo
  cuándo entró y quién la confirmó, sin registrar nada (D16).

### Documento ya importado (H6)

- RF-43: SI ya hay ingresos vigentes en la obra con el mismo proveedor y el mismo número de documento,
  ENTONCES EL SISTEMA avisa con la fecha en que se importó y quién lo hizo.
- RF-44: MIENTRAS haya ese aviso, EL SISTEMA exige confirmar que se importa de todas formas.
- RF-45: EL SISTEMA compara el proveedor y el número sin distinguir mayúsculas, tildes, espacios ni
  guiones.
- RF-90: SI falta el proveedor o el número del documento, ENTONCES EL SISTEMA dice que no se pudo revisar
  si el documento ya se importó (D9).
- RF-91: EL SISTEMA no cuenta como ya importado un documento cuyos ingresos están todos anulados (D23).

### El documento original (H5)

- RF-46: CUANDO se confirma, EL SISTEMA deja el documento original junto a los ingresos que salieron de
  él.
- RF-47: EL SISTEMA permite descargar el documento original desde cualquiera de sus ingresos a quien
  puede consultar el Almacén de esa obra.
- RF-92: EL SISTEMA entrega el documento original únicamente desde el panel, con sesión, y solo de obras
  al alcance de quien lo pide (D29).
- RF-93: EL SISTEMA no ofrece ningún enlace público al documento original (D29).
- RF-94: EL SISTEMA conserva el documento desde que se sube, marcado como sin confirmar (D18).
- RF-48: SI la propuesta se descarta o vence sin confirmar, ENTONCES EL SISTEMA marca el documento como
  descartado, sin borrarlo (D18).
- RF-95: EL SISTEMA no muestra en el Almacén un documento descartado (D18).

### Consultar lo importado (H4)

- RF-49: EL SISTEMA muestra en el historial de movimientos de cada material el proveedor, el tipo y el
  número del documento, y el valor unitario de cada ingreso que los tenga.
- RF-50: EL SISTEMA muestra el valor unitario a todos los que pueden consultar el Almacén de la obra,
  Residente incluido (D3).
- RF-51: EL SISTEMA incluye en la hoja Movimientos del Excel del Almacén (spec 009, RF-46) el proveedor,
  el tipo y el número del documento, el valor unitario y su unidad.
- RF-52: EL SISTEMA muestra sin esos datos, y sin error, los ingresos registrados a mano o por WhatsApp.

### Reglas transversales

- RF-53: EL SISTEMA calcula el stock con los ingresos importados igual que con los demás (spec 009,
  RF-18).
- RF-54: EL SISTEMA permite anular un ingreso importado igual que cualquier otro ingreso (spec 009).
- RF-96: CUANDO se anula un ingreso importado, EL SISTEMA no anula los demás del mismo documento (D30).
- RF-55: EL SISTEMA no permite editar un ingreso importado después de confirmarlo.
- RF-97: SI hay que corregir un ingreso importado, ENTONCES EL SISTEMA lo exige anulando con motivo y
  registrando otro (D30).
- RF-56: EL SISTEMA no deja importar a un almacén de una obra que no está al alcance de quien importa.
- RF-57: EL SISTEMA no cambia los ingresos ni las salidas registrados antes de esta spec.

## Superficies afectadas

- [ ] **Móvil** — sin cambios.
- [x] **Panel web** — en el Almacén de cada obra, importar un documento, revisar la propuesta y
  confirmarla; ver proveedor, documento y valor en el historial; descargar el documento original.
- [x] **API** — rutas del panel para leer un documento, confirmar la propuesta y descargar el original;
  la descarga del Almacén en Excel suma columnas.
- [ ] **Sincronización** — sin cambios: el Almacén no baja al teléfono.
- [x] **Datos** — los ingresos guardan proveedor, tipo y número de documento, valor unitario y el
  documento original. Solo en el servidor.
- [x] **Reglas** — quién importa, unidades y conversión, documento repetido, qué renglón se puede
  confirmar; con su caso en `verificar-reglas.ts`.

## Requisitos no funcionales

- La lectura de un documento de hasta 3 páginas o 50 renglones termina en menos de 3 minutos, como la
  propuesta del plan semanal (spec 044). Los documentos van hasta 10 páginas o 200 renglones (RF-59,
  RF-60).
- Las cantidades se guardan con dos decimales, como el resto del Almacén (spec 009); una conversión que
  dé más decimales se redondea a dos (D31). Los valores unitarios van en pesos con dos decimales, tal
  como los trae el documento.
- Pantallas, mensajes y descarga en español.

## Casos límite

- **Sin señal**: no aplica. Es solo del panel; el operador sigue trabajando igual.
- **Evidencia firmada**: un ingreso confirmado no se edita: se anula con motivo, como hoy (RF-55). Importar
  no toca preoperacionales, partes ni otros movimientos (RF-57).
- **Primer arranque / almacén vacío**: una obra sin materiales recibe todos los renglones como materiales
  nuevos (RF-20) y los crea al confirmar (RF-39).

Y los del caso concreto:

- **Foto borrosa o torcida**: en Excel y Word, una cifra que no está donde se cita se descarta (RF-16);
  en foto y PDF lo revisa quien importa, con el nombre del documento a la vista (RF-76).
- **Factura con fletes, IVA, descuentos y totales**: no entran como materiales (RF-17).
- **Bultos contra kilos**: «100 bultos x 50 kg» se propone como 5.000 kg con su cita (RF-25, RF-26); sin
  el peso del bulto, la cantidad queda por escribir (RF-27).
- **El mismo material en dos renglones** del documento: son dos ingresos del mismo material.
- **La misma factura dos veces**, o una entrega parcial con el mismo número: aviso con fecha y autor, y se
  confirma si de verdad es otra (RF-43, RF-44).
- **Dos personas importan el mismo documento a la vez**: el aviso se mira de nuevo al confirmar, y el
  segundo lo ve (RF-43).
- **Doble clic o dos pestañas con la misma propuesta**: entra una sola vez (RF-88, RF-89).
- **Varias facturas escaneadas en un solo PDF**: no se propone nada y se pide subirlas por separado
  (RF-68).
- **La lectura se corta** en un documento largo: no se propone media factura (RF-67).
- **Remisión de otra obra**: se avisa (RF-75).
- **Nota crédito o devolución**: no entra como ingreso (RF-74).
- **Un material dado de baja mientras se revisa**: la confirmación se rechaza (RF-86).
- **Un material nuevo que otra persona creó mientras tanto** con el mismo nombre: la confirmación se
  rechaza nombrándolo, sin registrar nada (RF-40, RF-41).
- **La fecha de la factura es de hace semanas** porque el material llegó tarde: se cambia antes de
  confirmar (RF-30).
- **Un documento sin ningún material** (una cotización vacía, una carta): no se propone nada y se explica
  (RF-9).
- **Se cierra la página mientras se lee o antes de confirmar**: la lectura sigue y la propuesta espera un
  día a quien importó; nada entra al Almacén hasta confirmar (RF-18, RF-64 a RF-66).

## Fuera de alcance

- Salidas del almacén desde un documento (vales de entrega, despachos): solo ingresos (D1).
- Registrar ingresos a mano para el Director de Obra: solo por importación (D4).
- Guardar una propuesta a medias para seguirla después.
- Anular de una vez todos los ingresos de un documento.
- Pedidos de compra, cuentas por pagar o conciliar facturas contra pagos.
- Costo promedio o valor del inventario: el valor unitario se guarda y se muestra, no se calcula nada con
  él.
- Cambiar la lectura de almacén por WhatsApp (spec 023).
- Leer varios documentos en una sola importación, o un archivo con varios documentos (RF-68).
- Convertir monedas o quitar y sumar impuestos al valor (RF-12, RF-71).
- Cualquier cambio en el celular.

## Criterios de finalización

- Cada RF tiene cómo comprobarse: caso en `scripts/verificar-reglas.ts` (quién importa, conversión de
  unidades, documento repetido, renglones que bloquean la confirmación) o paso de demo manual.
- `npm run verificar`, `npm run typecheck` y `npm run lint` en verde.
- Demo manual del flujo principal, en una obra de prueba:
  1. Como Almacenista, importar una factura en PDF con un material en bultos y uno nuevo; corregir la
     conversión de un renglón, quitar otro y confirmar.
  2. Ver los ingresos en el historial con su proveedor, documento y valor, el stock actualizado y el
     documento original descargable.
  3. Importar de nuevo la misma factura: aparece el aviso con fecha y autor.
  4. Importar un Excel y un Word de remisión, y una foto de una remisión.
  5. Como Director de Obra, importar un documento; como Residente, ver los valores sin poder importar.
  6. Descargar el Almacén en Excel con las columnas nuevas.

## Dudas abiertas

Ninguna. Las dos de la redacción las resolvió Diego el 2026-11-12 (D7, D8).

### Decisiones de la entrevista (2026-11-12)

- D1: Solo ingresos; las salidas siguen a mano o por WhatsApp.
- D2: Con unidades distintas, la IA propone la conversión cuando el documento la dice y muestra de dónde
  sale; si no la dice, la cantidad la escribe quien importa.
- D3: El valor unitario lo ven todos los que consultan el Almacén, Residente incluido.
- D4: Importan el Almacenista, la Gerencia, el Director de Proyectos y también el Director de Obra.
- D5: Un documento ya importado (mismo proveedor y número) se avisa con fecha y autor, y se puede
  confirmar de todas formas.
- D6: Los ingresos quedan con la fecha del documento, editable; sin fecha, la de hoy.
- D7: El valor unitario se guarda como lo indique el documento: si viene con IVA, con IVA; si viene sin
  él, sin él (RF-12).
- D8: Con conversión de unidades, el valor unitario no se convierte: queda como lo trae el documento,
  con su unidad («$30.000 por bulto» junto a 5.000 kg) (RF-29, RF-58).

### Decisiones de la clarificación (2026-11-12, propuestas de Claude aprobadas por Diego)

- D9: Para confirmar son obligatorios material, cantidad, fecha y «Entregado por»; proveedor, número y
  valor son opcionales, y sin proveedor o número se dice que no se revisó si está repetido (RF-81, RF-82,
  RF-90).
- D10: Con solo el total del renglón, el valor unitario se propone dividiendo y se marca «Calculado del
  total» (RF-69, RF-70).
- D11: La IA propone el material de la obra que considera el mismo, con el nombre del documento a la
  vista; las formas comunes de una unidad son la misma; las conversiones universales también se proponen,
  diciendo la equivalencia (RF-19, RF-76, RF-79, RF-80, RF-26).
- D12: Bloquean la confirmación: renglón sin cantidad, unidad distinta sin convertir, cifra que no está
  donde se cita y material sin escoger; «Unidad distinta» ya convertida y «Calculado del total» son avisos
  (RF-37, RF-28, RF-83, RF-84, RF-85).
- D13: Hasta 10 páginas o 200 renglones; una lectura cortada no propone nada (RF-59, RF-60, RF-67).
- D14: Un archivo es un documento; con más de un proveedor o número se pide subirlos por separado (RF-68).
- D15: La lectura sigue aunque se cierre la página, y la propuesta espera un día a quien importó (RF-64 a
  RF-66).
- D16: Cada propuesta se confirma una sola vez (RF-88, RF-89).
- D17: Con una unidad que no está en la lista, un material nuevo escoge la suya de la lista y la cantidad
  se escribe en ella; el valor queda con la unidad del documento (RF-77).
- D18: El documento se conserva desde que se sube; si no se confirma queda descartado, sin borrarse y sin
  mostrarse (RF-94, RF-48, RF-95).
- D19: Importan únicamente Almacenista, Director de Obra, Director de Proyectos y Gerencia (RF-1, RF-2).
- D20: Servicios, alquileres y transportes no son ingresos, y lo dejado por fuera se lista aparte (RF-17,
  RF-73).
- D21: Con conductor y transportador, «Entregado por» es el conductor (RF-72).
- D22: «Hoy» es la fecha de Colombia (RF-33, RF-34).
- D23: Un documento con todos sus ingresos anulados no cuenta como ya importado (RF-91).
- D24: Un material dado de baja entre la propuesta y la confirmación rechaza la confirmación (RF-86).
- D25: Con el módulo Almacén apagado en la obra no se importa (RF-63).
- D26: Una remisión dirigida a otra obra se avisa sin bloquear (RF-75).
- D27: PDF con contraseña se rechaza; escaneo sin texto se lee como foto; moneda distinta deja el valor
  vacío con aviso; cantidades negativas no son ingreso (RF-61, RF-62, RF-71, RF-74).
- D28: El Director de Obra crea materiales nuevos solo al importar (RF-78).
- D29: El documento original sale solo por el panel, con sesión y alcance de obra, nunca por enlace
  público (RF-92, RF-93).
- D30: Se parten los requisitos con un «y» escondido (RF-42 y RF-87; RF-54 y RF-96; RF-55 y RF-97).

### Cambios al planificar (2026-11-12, decididos por Diego)

- D31: Las cantidades van con dos decimales, como todo el Almacén; la spec decía tres por error.
- D32: Una persona puede tener varias propuestas pendientes en la misma obra, cada una con su vencimiento
  (RF-65, RF-98).
