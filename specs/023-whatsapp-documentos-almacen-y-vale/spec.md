# Spec 023 — WhatsApp: documentos, almacén y número de vale

> Estado: **Cumplida** (2026-10-07) · Fecha: 2026-10-07 · Aprobada: 2026-10-07

## Contexto y objetivo

La spec 021 ya lleva lo que se reporta en el grupo de WhatsApp de la obra a una bandeja donde el
residente aprueba. En su primer día en producción aparecieron tres huecos:

1. **Los documentos no se leen.** El 6 de octubre llegó al grupo el «Formato Horas Extras»: un
   Excel con siete hojas, una por cargo (conductores, operadores, oficios varios, topografía,
   controladoras, ingenieros), con unas 37 personas y su hora de entrada y de salida del 5 de
   octubre. La IA vio que había un archivo, pero no pudo leerlo, y lo mismo pasó con un Word de
   SST al día siguiente. Hoy la IA solo lee las fotos y los PDF. En la obra se reporta con Excel,
   Word, PDF y fotos, y todos deben poder leerse.
2. **El almacén no entra por WhatsApp.** Si el almacenista reporta en el grupo lo que entró y
   salió del almacén, el mensaje cae como «administrativo» y no llega al módulo Almacén
   (spec 009). Debe reconocerse como **reporte de almacén** y, una vez aprobado, registrarse como
   ingresos y salidas, con las mismas reglas que si se registraran a mano.
3. **El viaje de cantera no lleva el número del vale.** Cada viaje que sale de la cantera trae
   un vale de despacho (en la obra se le dice «el vale»; en el pedido se escribió «beale»). Ya
   llegan fotos de los vales de FORTUNE al grupo, pero Control Cantera (spec 010) no tiene dónde
   anotar su número.

En esta spec, **la integración de WhatsApp** (la captura y la IA que propone, fuera del panel)
es parte del sistema: los requisitos que dicen «EL SISTEMA leerá…» se cumplen en ella.

## Usuarios / actores

- **Residente / director de obra** (panel web, rol `supervisor`): revisa y aprueba en la bandeja
  los reportes de almacén de su obra, y registra con ellos los materiales nuevos. Registra desde
  la bandeja a las personas de un reporte que no están en el sistema. Ve el número de
  vale en la bitácora.
- **Gerencia** (panel web, rol `admin`): lo mismo, en cualquier obra.
- **Almacenista** (panel web): sigue llevando su almacén a mano, como hoy. **No ve la bandeja**
  (021/RF-15). Ve en su módulo los movimientos que se aprobaron desde WhatsApp. Reporta en el
  grupo con la plantilla del almacén, o lo hace quien el residente designe.
- **Encargado de planta** (panel web): anota el número de vale al registrar un viaje a mano.
- **Personas del grupo**: mandan textos, fotos, Excel, Word y PDF. No entran al sistema por esta
  vía.
- **Integración de WhatsApp**: lee cada archivo adjunto y entrega su propuesta a la bandeja.
- **Operador** (móvil): no interviene. Nada de esto cambia la app del celular.

## Historias de usuario

- H1: Como residente quiero que la IA lea los Excel, Word, PDF y fotos que se mandan al grupo,
  para que lo que traen llegue a la bandeja sin tener que abrir el archivo y transcribirlo.
- H2: Como residente quiero que el reporte de personal en Excel llene el personal de la bitácora
  de ese día, con sus horas, para no teclear 37 personas a mano.
- H3: Como residente o gerencia quiero aprobar en la bandeja el reporte de almacén que se manda
  al grupo, para que los ingresos y las salidas queden en el módulo Almacén sin teclearlos dos
  veces.
- H4: Como residente quiero registrar desde la bandeja un material que el almacén de la obra
  todavía no tiene, para no dejar el reporte detenido hasta que alguien lo cree.
- H6: Como residente quiero registrar desde la bandeja a las personas del reporte que no están
  en el sistema, para que el personal del día quede completo sin pedirle a gerencia que las
  cree una por una.
- H5: Como encargado de planta o residente quiero anotar en cada viaje el número de su vale, y
  verlo en Control Cantera y en la bitácora, para cruzar los viajes con los vales de la cantera.

## Requisitos funcionales (criterios de aceptación en EARS)

### Leer los archivos adjuntos (H1)

- RF-1: CUANDO un mensaje traiga una foto, EL SISTEMA se la mostrará a la IA para que la
  interprete. *(como hoy)*
- RF-2: CUANDO un mensaje traiga un PDF, EL SISTEMA se lo mostrará a la IA para que lo
  interprete. *(como hoy)*
- RF-3: CUANDO un mensaje traiga un Excel (.xlsx), EL SISTEMA le entregará a la IA el contenido
  de todas sus hojas visibles.
- RF-4: EL SISTEMA entregará el contenido de cada hoja de un Excel con el nombre de la hoja, para
  que la IA sepa de qué hoja sale cada dato.
- RF-5: EL SISTEMA entregará las horas, fechas y números de un Excel tal como se ven en la celda,
  ya sea que estén escritos como texto («6:00Pm») o como valor de hora (7:30).
- RF-6: CUANDO un mensaje traiga un Word (.docx), EL SISTEMA le entregará a la IA su texto,
  incluido el de sus tablas.
- RF-7: SI un archivo adjunto no se puede leer (dañado, con contraseña o en un formato que no es
  foto, PDF, .xlsx ni .docx), ENTONCES EL SISTEMA lo llevará igual a la bandeja con la propuesta
  marcada para revisión, y con un motivo que diga que el archivo no se pudo leer y por qué.
- RF-8: SI un archivo es más grande de lo que la IA puede leer de una vez, ENTONCES EL SISTEMA le
  entregará la parte que quepa, y la IA dirá en el motivo de revisión que lo leyó incompleto.
- RF-9: EL SISTEMA seguirá guardando el archivo original en el almacén privado y mostrándolo en la
  bandeja (021/RF-52, RF-53), además de lo que la IA haya leído en él.
- RF-10: CUANDO la IA saque datos de un archivo, EL SISTEMA los propondrá igual que si vinieran
  escritos en el mensaje: misma categoría, mismas secciones y mismas validaciones al aprobar.

### El reporte de personal en Excel (H2)

- RF-11: CUANDO un archivo traiga la lista del personal de un día con su hora de entrada y de
  salida, EL SISTEMA lo propondrá como reporte del día con la sección de personal llena.
- RF-12: EL SISTEMA tomará como día del hecho de ese reporte la fecha escrita en el archivo
  («DIA 05 MES 10 AÑO 2026» → 5 de octubre de 2026), no la del mensaje.
- RF-13: EL SISTEMA reunirá en una sola propuesta las personas de todas las hojas del archivo.
- RF-14: SI una persona aparece en dos hojas del mismo archivo, ENTONCES EL SISTEMA la propondrá
  una sola vez y lo dirá en el motivo de revisión.
- RF-15: SI las hojas de un mismo archivo traen fechas distintas, ENTONCES EL SISTEMA marcará la
  propuesta para revisión indicando qué hojas no coinciden.
- RF-16: EL SISTEMA aplicará a ese personal las reglas que ya tiene el personal de un reporte
  diario: reconocerlo entre las personas registradas (021/RF-79) y reemplazar a la persona que ya
  esté en la bitácora abierta del día (021/RF-88, RF-89).
- RF-17: EL SISTEMA no llevará a la bitácora las columnas de horas extra del formato (HED, HEN,
  HFD, HFN, HEFD, HEFN), porque las extra ya se calculan con el horario de la obra (spec 016).

### Registrar desde la bandeja a las personas que no existen (H6) *(duda 3)*

> Cambia lo que 021 dejó fuera de alcance («Registrar a las personas del grupo que no existen
> en el sistema») y precisa 021/RF-79: además de elegirla o quitarla, una persona no reconocida
> se puede registrar ahí mismo. Vale para el personal y para los operadores y conductores de
> cualquier reporte, venga escrito o en un archivo.

- RF-57: SI una persona del reporte no se reconoce entre las personas registradas, ENTONCES EL
  SISTEMA permitirá, además de elegirla o quitarla (021/RF-79), registrarla como persona nueva
  de la obra antes de aprobar.
- RF-58: EL SISTEMA permitirá registrar personas desde la bandeja al residente de esa obra y a la
  gerencia, como excepción a 001/RF-5 solo desde la bandeja.
- RF-59: EL SISTEMA seguirá sin permitir al residente registrar personas en el módulo Personas.
- RF-60: CUANDO se registre una persona desde la bandeja, EL SISTEMA pedirá su nombre completo,
  propuesto con el nombre que trae el reporte.
- RF-61: CUANDO se registre una persona desde la bandeja, EL SISTEMA pedirá su cargo de la lista
  cerrada (002/RF-2), y permitirá dejarlo «sin definir».
- RF-62: CUANDO la IA saque a una persona de una hoja cuyo nombre corresponda a un cargo de la
  lista («CONDUCTORES» → Conductor, «OPERADORES» → Operador), EL SISTEMA propondrá ese cargo.
- RF-63: EL SISTEMA registrará a la persona nueva en la obra del reporte.
- RF-64: EL SISTEMA registrará a la persona nueva sin acceso al panel ni al celular, aunque su
  cargo lo contemple; el acceso se lo da después la gerencia en Personas.
- RF-65: SI hay una persona registrada en la obra cuyo nombre comparte al menos dos palabras con
  el del reporte, sin distinguir tildes ni mayúsculas, ENTONCES EL SISTEMA la mostrará como
  posible coincidencia antes de dejar registrarla como nueva.
- RF-66: EL SISTEMA permitirá registrar de una vez a todas las personas no reconocidas de un
  reporte, con el cargo propuesto para cada una y la posibilidad de cambiarlo o de excluir a
  alguna antes de confirmar.
- RF-67: SI se descarta el reporte, ENTONCES EL SISTEMA conservará registradas a las personas
  que ya se hubieran registrado desde él.
- RF-68: EL SISTEMA guardará en cada persona registrada desde la bandeja quién la registró,
  cuándo y desde qué mensaje de WhatsApp.

### El reporte de almacén (H3, H4)

- RF-18: CUANDO la IA reconozca un reporte de ingresos o salidas del almacén, EL SISTEMA lo
  mostrará en la bandeja con la categoría «reporte de almacén».
- RF-19: EL SISTEMA propondrá cada ingreso con su material, su cantidad, su unidad, quién lo
  entregó y su observación.
- RF-20: EL SISTEMA propondrá cada salida con su material, su cantidad, su unidad, quién lo
  recibió y para qué se usará.
- RF-21: EL SISTEMA tomará como fecha de los movimientos la del encabezado del reporte, y si no
  la trae, propondrá la del mensaje.
- RF-22: EL SISTEMA permitirá aprobar un reporte de almacén al residente de esa obra y a la
  gerencia, como excepción a 009/RF-28 solo desde la bandeja.
- RF-23: EL SISTEMA seguirá sin permitir al residente registrar ingresos ni salidas a mano en el
  módulo Almacén.
- RF-24: EL SISTEMA seguirá sin mostrar la bandeja al almacenista (021/RF-15).
- RF-25: MIENTRAS el módulo Almacén esté apagado en la obra (spec 017), EL SISTEMA no permitirá
  aprobar un reporte de almacén de esa obra, y dirá por qué.
- RF-26: EL SISTEMA reconocerá cada material del reporte entre los materiales vigentes del
  almacén de la obra por su nombre, sin distinguir tildes ni mayúsculas.
- RF-27: SI un material del reporte no se reconoce, ENTONCES EL SISTEMA exigirá antes de aprobar
  elegirlo entre los del almacén de la obra, registrarlo como material nuevo o quitar ese
  renglón.
- RF-28: CUANDO se registre un material nuevo desde la bandeja, EL SISTEMA pedirá su nombre de la
  lista de materiales de OCC o escrito con «Otro», y su unidad de la lista cerrada (009/RF-31 a
  RF-34).
- RF-29: EL SISTEMA aplicará al material registrado desde la bandeja las mismas reglas que al
  registrado a mano, incluido el rechazo de un nombre repetido (009/RF-3).
- RF-30: SI la unidad de un renglón no es la del material en el almacén, ENTONCES EL SISTEMA
  exigirá corregir la cantidad o la unidad antes de aprobar, sin convertirla solo.
- RF-31: SI a un ingreso le falta quién lo entregó, ENTONCES EL SISTEMA exigirá escribirlo antes
  de aprobar (009/RF-40, RF-42).
- RF-32: SI a una salida le falta quién la recibió o para qué se usará, ENTONCES EL SISTEMA
  exigirá escribirlo antes de aprobar (009/RF-13, RF-41, RF-42).
- RF-33: SI una salida del reporte supera el stock del material, ENTONCES EL SISTEMA no permitirá
  aprobar el reporte y mostrará el stock disponible (009/RF-15).
- RF-34: EL SISTEMA contará, para ese stock, los ingresos del mismo reporte con fecha igual o
  anterior a la de la salida.
- RF-35: CUANDO se apruebe un reporte de almacén, EL SISTEMA registrará todos sus movimientos o
  ninguno.
- RF-36: SI la fecha del reporte de almacén es posterior a hoy, ENTONCES EL SISTEMA rechazará la
  aprobación (009/RF-10).
- RF-37: EL SISTEMA registrará como autor de cada movimiento aprobado a quien lo aprobó, y
  guardará de qué mensaje de WhatsApp salió (021/RF-46).
- RF-38: EL SISTEMA mostrará en el historial del almacén que un movimiento vino de WhatsApp
  (021/RF-47).
- RF-39: EL SISTEMA tratará los movimientos aprobados desde la bandeja igual que los registrados a
  mano: cuentan en el stock, salen en el Excel del almacén y solo la gerencia los anula
  (009/RF-38).
- RF-40: EL SISTEMA no llevará el reporte de almacén a la bitácora del día.

### El número de vale (H5)

- RF-41: EL SISTEMA permitirá anotar en cada viaje de Control Cantera el número de su vale.
- RF-42: EL SISTEMA permitirá registrar un viaje sin número de vale.
- RF-43: EL SISTEMA guardará el número de vale tal como se escriba: solo números, letras y
  números, o con guiones, puntos, barras, espacios u otros signos. *(duda 1)*
- RF-44: EL SISTEMA quitará los espacios del principio y del final del número de vale, y lo
  tratará como vacío si solo trae espacios.
- RF-55: SI el número de vale pasa de 30 caracteres, ENTONCES EL SISTEMA lo rechazará diciendo
  cuál es el máximo.
- RF-45: SI el número de vale ya está en otro viaje vigente de la misma obra, ENTONCES EL SISTEMA
  avisará en cuál viaje está y permitirá guardarlo igual. *(duda 2)*
- RF-56: EL SISTEMA considerará repetido un número de vale que coincida con otro sin distinguir
  mayúsculas de minúsculas.
- RF-46: EL SISTEMA mostrará el número de vale de cada viaje en el listado de Control Cantera.
- RF-47: EL SISTEMA mostrará el número de vale de cada viaje en la sección Control Cantera de la
  bitácora del día, cuando lo tenga.
- RF-48: CUANDO se cierre la bitácora, EL SISTEMA dejará fijado el número de vale de cada viaje
  junto con el viaje (010/RF-29).
- RF-49: EL SISTEMA mostrará sin número de vale, y sin error, los viajes registrados antes de este
  cambio.
- RF-50: CUANDO un reporte o un mensaje traiga el número de vale de un viaje, escrito o en la foto
  del vale, EL SISTEMA lo propondrá en ese viaje.
- RF-51: EL SISTEMA permitirá corregir o completar el número de vale de un viaje en la bandeja
  antes de aprobarlo (021/RF-26).
- RF-52: EL SISTEMA no permitirá cambiar el número de vale de un viaje ya registrado: se anula el
  viaje y se registra de nuevo (010/RF-23).

### Reglas transversales

- RF-53: EL SISTEMA aplicará a todo lo aprobado desde un archivo o desde un reporte de almacén
  las mismas validaciones del módulo de destino (021/RF-59).
- RF-54: EL SISTEMA no creará ningún movimiento de almacén ni material sin aprobación de una
  persona (021/RF-57).

## Superficies afectadas

- [ ] **Móvil**: sin cambios.
- [x] **Panel web**: en la bandeja, la propuesta de reporte de almacén (ingresos y salidas
  editables, reconocer o registrar el material, aviso de stock) y el número de vale editable en
  cada viaje; registrar personas no reconocidas, una por una o todas de una vez, con la posible
  coincidencia a la vista. En Control Cantera, el número de vale en el formulario y en el listado. En la
  bitácora, el número de vale en la sección Control Cantera. En el Almacén, la marca «desde
  WhatsApp» en el historial.
- [x] **API**: aprobar un reporte de almacén (con materiales nuevos) por la guardia del panel; el
  número de vale al registrar un viaje y al aprobar un reporte. La entrada de la integración no
  cambia de credencial.
- [ ] **Sincronización**: sin cambios. Nada de esto viaja al celular.
- [x] **Datos**: el número de vale en cada viaje y en los viajes fijados al cerrar la bitácora; el
  origen de WhatsApp en los movimientos de almacén y en las personas registradas desde la
  bandeja. Todo en el servidor.
- [x] **Reglas**: la forma del número de vale; la validación de un reporte de almacén (material
  reconocido, unidad, nombres obligatorios, stock con los ingresos del mismo reporte); el permiso
  del residente para aprobar almacén y registrar personas solo desde la bandeja; la posible
  coincidencia de nombres (RF-65); el aviso de vale repetido. Cada una con su caso en
  `verificar-reglas.ts`.
- [x] **Integración de WhatsApp** (fuera del panel): leer Excel y Word; la categoría «reporte de
  almacén»; el número de vale en los viajes; el reporte de personal de un archivo.

## Requisitos no funcionales

- Interfaz y mensajes en español.
- Un Excel de hasta 10 hojas con hasta 500 filas cada una se lee completo (RF-3, RF-8).
- Un reporte de almacén de 30 renglones se puede revisar y aprobar sin salir de la propuesta.
- Ningún archivo de WhatsApp es accesible por una dirección pública (021).

## Casos límite

- **Sin señal**: no aplica; el operador no interviene y el panel siempre tiene red. Si la IA no
  está disponible, la integración reintenta, como hoy.
- **Evidencia firmada**: un reporte de personal para un día con la bitácora cerrada no se aprueba
  (021/RF-41). El almacén no depende de la bitácora: un movimiento aprobado es evidencia y solo
  se anula (009/RF-23). Un viaje no cambia su número de vale después de registrado (RF-52); la
  bitácora cerrada conserva el número que tenía al cerrarse (RF-48).
- **Primer arranque**: un almacén sin materiales obliga a registrarlos desde la bandeja o a quitar
  los renglones (RF-27). Los viajes anteriores no tienen vale (RF-49).

Además:

- **El Excel de horas extras del 5 de octubre**, que ya está en la bandeja de producción como
  «administrativo» sin leer: sigue pendiente, así que la integración puede volver a clasificarlo
  y su propuesta se reemplaza (021/RF-5).
- **Personas del Excel que no están registradas** en el sistema: se eligen, se quitan o se
  registran ahí mismo, una por una o todas de una vez (RF-57, RF-66). Quedan en la obra sin
  acceso (RF-64).
- **Una persona registrada con el nombre escrito distinto** («OSCAR OLIVERO» y «Oscar Olivero
  Pérez»): antes de crearla de nuevo se muestra la posible coincidencia (RF-65), para no tener
  dos veces a la misma persona.
- **Una hoja que no corresponde a un cargo de la lista** («INGENIEROS», «CONTROLADORAS»): el cargo
  queda vacío para elegirlo o dejarlo «sin definir» (RF-61, RF-62).
- **Se registran personas y luego se descarta el reporte**: las personas se quedan (RF-67); si
  sobran, la gerencia las da de baja en Personas.
- **Horas en formatos distintos** en el mismo archivo (7:30 como hora, «6:00Pm» como texto): se
  leen igual (RF-5).
- **Hojas duplicadas** («OFICIO VARIOS» y «OFICIO VARIOS (2)») con personas distintas: se juntan
  (RF-13); si se repite una persona, se propone una vez (RF-14).
- **Excel con hojas ocultas** o con fórmulas: se leen solo las hojas visibles, con el valor que
  muestra la celda (RF-3, RF-5).
- **Un archivo .xls o .doc antiguo**: no se lee y llega marcado para revisión (RF-7).
- **Un Word sin datos de obra** (el de requisitos de SST): la IA lo resume y lo clasifica como
  administrativo, como lo haría con un texto.
- **Reporte de almacén con un ingreso y una salida del mismo material el mismo día**: la salida
  cuenta con el ingreso del reporte (RF-34).
- **Dos reportes de almacén iguales** (alguien manda el mismo dos veces): no se juntan solos; el
  residente descarta el repetido con motivo (021/RF-54). Si aprueba los dos, los movimientos quedan
  dos veces y la gerencia anula los sobrantes.
- **Material escrito distinto** («cemento gris» y «Cemento Gris»): se reconoce igual (RF-26).
- **Material en otra unidad** («2 toneladas» de un material que se lleva en bultos): no se
  convierte; se corrige antes de aprobar (RF-30).
- **Dos personas aprobando a la vez salidas del mismo material**: la que llega después se rechaza
  si ya no alcanza el stock (009/RF-16).
- **Vale escrito con guion, punto o espacios** («V-0458», «0458 A»): se guarda tal cual (RF-43).
  «v-0458» y «V-0458» se consideran el mismo vale y dan el aviso (RF-45, RF-56); «V-0458» y
  «V0458» no.
- **Vale repetido**: se avisa con el viaje donde ya está, y se puede guardar igual (RF-45).
- **Vale ilegible en la foto**: la IA lo deja vacío y lo dice en el motivo de revisión; el viaje se
  puede aprobar sin vale (RF-42).

## Fuera de alcance

- Leer notas de voz y videos (021).
- Leer archivos .xls y .doc antiguos, presentaciones, comprimidos (.zip, .rar) u otros formatos.
- Llevar a algún módulo las horas extra que trae el formato de Excel (HED, HEN…): el sistema las
  calcula con el horario de la obra (spec 016).
- Dar acceso al panel o al celular a una persona registrada desde la bandeja: lo hace la gerencia
  en Personas (RF-64).
- Registrar desde la bandeja a los autores de los mensajes que no están en el sistema: solo se
  registran las personas que trae un reporte (RF-57).
- Que el residente registre o edite personas en el módulo Personas (RF-59).
- Mostrarle la bandeja al almacenista, o que el almacenista apruebe desde ella.
- Que el residente registre ingresos o salidas a mano en el módulo Almacén.
- Precios, proveedores, remisiones o facturas en el almacén (009).
- Traslados de material entre obras, conteo físico o ajustes de inventario (009).
- Llevar el reporte de almacén a la bitácora (RF-40).
- Que el almacenista confirme lo aprobado desde WhatsApp.
- Buscar o filtrar viajes por número de vale en Control Cantera.
- Comprobar el número de vale contra la cantera o contra un talonario.
- Completar el número de vale de los viajes registrados antes de este cambio (RF-49).
- Mantener las plantillas: OCC reparte la del almacén y la del reporte diario (que añade el vale
  en cada viaje) fuera del sistema.
- Informes de gerencia (quién operó una máquina en un mes, horas extra del mes): spec posterior.

## Criterios de finalización

- Cada RF tiene cómo comprobarse: un caso en `scripts/verificar-reglas.ts` para la forma del
  vale, la validación del reporte de almacén, el stock con ingresos del mismo reporte y el permiso
  del residente; y un paso de demo manual para el resto.
- `npm run verificar`, `npm run typecheck` y `npm run lint` en verde.
- Demo manual del flujo principal:
  1. Se manda al grupo de prueba el «Formato Horas Extras» del 5 de octubre. Llega a la bandeja
     como reporte del 5 de octubre con el personal de las siete hojas y sus horas. El residente
     elige a una persona que no se reconoció, quita a otra y registra de una vez a las demás
     (las de «CONDUCTORES» con cargo Conductor). Aprueba, y el personal aparece en la bitácora
     del 5 de octubre. Las personas nuevas salen en Personas, en la obra y sin acceso.
  2. Se manda un Word con un texto de obra y la IA lo resume en la propuesta.
  3. Se manda un .xls antiguo y llega marcado como «no se pudo leer».
  4. Se manda un reporte de almacén con la plantilla: un ingreso de un material que ya existe,
     uno de un material nuevo y una salida. El residente registra el material nuevo desde la
     bandeja con su unidad y aprueba. El almacenista entra a su módulo y ve los tres movimientos
     marcados «desde WhatsApp» y el stock actualizado. No ve la bandeja.
  5. Un segundo reporte trae una salida mayor que el stock: no se deja aprobar y muestra el stock.
  6. El encargado de planta registra un viaje con vale «F-0458», otro sin vale y un tercero con
     «f-0458», que da el aviso de repetido y se guarda igual. Los dos se ven en
     el listado, y el del vale muestra su número en la bitácora del día. Se cierra la bitácora y
     el número sigue ahí.
  7. Llega la foto de un vale de FORTUNE con un viaje: la propuesta trae su número, el residente
     lo corrige y aprueba.

## Dudas abiertas

Resueltas el 2026-10-07 (Diego):

1. ~~¿Qué caracteres lleva el vale?~~ Se acepta como se escriba, con cualquier signo (RF-43,
   RF-44), hasta 30 caracteres (RF-55).
2. ~~¿Vale repetido?~~ Se avisa y se deja guardar (RF-45, RF-56).
3. ~~¿Personas del Excel no registradas?~~ Se registran desde la bandeja, una por una o todas de
   una vez, en la obra y sin acceso (RF-57 a RF-68).

No quedan dudas abiertas.
