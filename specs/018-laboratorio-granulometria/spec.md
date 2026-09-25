# Spec 018 — Laboratorio: ensayo de granulometría (LAB-FR-01-2025)

> Estado: En curso · Fecha: 2026-09-24 · Aprobada: 2026-09-24

## Contexto y objetivo

El laboratorio de la obra ensaya los materiales que llegan a la vía —subbase, base, afirmado—
para saber si cumplen la especificación antes de extenderlos. El primero de esos ensayos es la
**granulometría** (norma INV E-123-13, formato de OCC LAB-FR-01-2025): se tamiza una muestra,
se pesa lo que queda en cada tamiz y se dibuja la curva de lo que pasa contra la franja que
exige la especificación del material.

Hoy se lleva en Excel, una hoja copiada por muestra. Leída celda por celda, la hoja tiene
huecos que en un acta de laboratorio pesan: la masa lavada (M2) se deja en blanco y nada
comprueba que no se perdió material al tamizar; el tamaño máximo y el nominal se escriben a
mano y pueden contradecir la tabla; la franja se escribe fija para un solo material; y la hoja
dibuja la franja pero **nunca dice si el material cumple**. Además, quien aprueba firma sobre
un archivo que cualquiera puede cambiar después.

Este módulo lleva el ensayo al panel: el laboratorista digita las masas, el sistema calcula
todo lo demás con las fórmulas del formato, da el veredicto CUMPLE / NO CUMPLE contra la franja
escogida, dibuja la curva, y el residente lo aprueba. Aprobado, es evidencia: no se edita, se
anula con motivo. Y el parte diario muestra los ensayos del día, para que el residente vea en
un solo documento lo que el laboratorio hizo en su obra.

## Usuarios / actores

- **Laboratorista** (panel web, acceso nuevo) — registra los ensayos de su obra, los corrige
  mientras no los envía y los envía a aprobación. Figura como «Revisó» en el informe. No ve
  nada del panel fuera de este módulo.
- **Residente / director de obra** (panel web, rol `supervisor`) — hace de coordinador de
  laboratorio en su obra: consulta, aprueba o devuelve los ensayos enviados, y anula los
  aprobados. Figura como «Aprobó». Ve los ensayos del día en el parte diario.
- **Gerencia** (panel web, rol `admin`) — todo lo anterior en cualquier obra; además enciende o
  apaga el módulo en cada obra y es la única que da el acceso de Laboratorista.
- **Operador** (móvil) — no interviene. Nada de esto cambia la app del celular.

## Historias de usuario

- H1: Como gerencia quiero dar a la persona del laboratorio un acceso que solo vea su módulo,
  para que registre ensayos sin ver ni tocar el resto de la obra.
- H2: Como gerencia quiero encender el módulo solo en las obras que tienen laboratorio, para
  que las demás no lo vean vacío.
- H3: Como laboratorista quiero escoger la franja de la especificación de una lista, para no
  escribir los límites a mano en cada ensayo.
- H4: Como laboratorista quiero digitar solo las masas y que el sistema calcule los
  porcentajes, los tamaños y el veredicto, para no depender de fórmulas que se pueden dañar.
- H5: Como laboratorista y residente quiero ver la curva granulométrica contra la franja, para
  juzgar el material de un vistazo.
- H6: Como residente quiero aprobar o devolver lo que envía el laboratorio, para que un ensayo
  aprobado sea un acta que nadie cambia después.
- H7: Como residente o gerencia quiero imprimir el informe con el formato LAB-FR-01, para
  entregarlo a la interventoría.
- H8: Como residente o gerencia quiero consultar los ensayos por periodo, material, franja,
  estado y veredicto, para seguir la calidad de lo que llega a la obra.
- H9: Como residente quiero ver en el parte del día los ensayos de granulometría de mi obra,
  para tener el día completo en un solo documento.

## Requisitos funcionales (criterios de aceptación en EARS)

### Acceso (H1)

- RF-1: EL SISTEMA tendrá un acceso de Laboratorista, distinto de los accesos existentes.
- RF-2: EL SISTEMA permitirá dar el acceso de Laboratorista únicamente a la gerencia.
- RF-3: EL SISTEMA ofrecerá en el catálogo de cargos el cargo Laboratorista, con el acceso de
  Laboratorista como sugerido.
- RF-4: MIENTRAS una persona tenga el acceso de Laboratorista, EL SISTEMA le mostrará en el
  panel únicamente el módulo Laboratorio.
- RF-5: CUANDO un laboratorista entre al panel, EL SISTEMA lo llevará directamente al módulo
  Laboratorio.
- RF-6: EL SISTEMA mostrará a cada laboratorista únicamente los ensayos de su obra.
- RF-7: EL SISTEMA mostrará a cada residente o director únicamente los ensayos de su obra.
- RF-8: EL SISTEMA mostrará a la gerencia los ensayos de todas las obras que tengan el módulo
  Laboratorio encendido.
- RF-9: EL SISTEMA permitirá a la gerencia hacer en cualquier obra con el módulo encendido todo
  lo que hace un laboratorista.
- RF-10: SI una persona sin el acceso correspondiente intenta registrar, enviar, aprobar,
  devolver, anular o descartar un ensayo, ENTONCES EL SISTEMA lo rechazará diciendo quién
  puede hacerlo, aunque la petición llegue por fuera del panel.

### El módulo por obra (H2)

- RF-11: EL SISTEMA guardará para cada obra si tiene encendido el módulo Laboratorio, aparte
  de Almacén y de Control Cantera.
- RF-12: EL SISTEMA dejará el módulo Laboratorio apagado en las obras registradas antes de esta
  spec.
- RF-13: CUANDO la gerencia registre una obra, EL SISTEMA propondrá el módulo Laboratorio
  encendido.
- RF-14: EL SISTEMA aplicará al módulo Laboratorio las reglas de módulo apagado de la spec 017
  (017/RF-4 a 017/RF-11), con el laboratorista como la persona cuyo rol depende del módulo.
- RF-15: MIENTRAS el módulo Laboratorio esté apagado en una obra, EL SISTEMA no mostrará
  ensayos de granulometría en los partes abiertos de esa obra.
- RF-16: CUANDO se vuelva a encender el módulo en una obra, EL SISTEMA mostrará de nuevo todos
  los ensayos que ya tenía.

### Catálogo de franjas (H3)

- RF-17: EL SISTEMA tendrá un catálogo de franjas granulométricas, cada una con su nombre, la
  norma de la que sale y los límites inferior y superior de porcentaje que pasa en cada tamiz
  que controla.
- RF-18: EL SISTEMA incluirá en el catálogo la franja Subbase granular SBG-50 con los límites
  del anexo A.
- RF-19: EL SISTEMA incluirá en el catálogo las demás franjas que use OCC.
  [NECESITA ACLARACIÓN: qué franjas además de SBG-50 (¿SBG-38, BG-40, BG-38, BG-25, afirmado?)
  y sus límites exactos, confirmados por el laboratorio. No se toman de memoria.]
- RF-20: CUANDO se registre un ensayo, EL SISTEMA pedirá escoger una franja del catálogo.
- RF-21: EL SISTEMA conservará en cada ensayo los límites de la franja tal como estaban al
  escogerla, aunque el catálogo cambie después.
- RF-22: MIENTRAS un ensayo esté en borrador o devuelto, EL SISTEMA permitirá cambiar su franja.

### Registro del ensayo (H4)

- RF-23: EL SISTEMA permitirá al laboratorista registrar un ensayo de granulometría en su obra.
- RF-24: EL SISTEMA pedirá en cada ensayo la descripción del material, la fuente, la
  localización, el número de informe, la fecha de recepción de la muestra y la fecha de
  ejecución del ensayo.
- RF-25: EL SISTEMA pedirá en cada ensayo la masa inicial húmeda, la masa inicial seca (M1), la
  tara y la masa seca después del lavado (M2), en gramos.
- RF-26: EL SISTEMA pedirá en cada ensayo la masa retenida, en gramos, en cada tamiz de la serie
  del anexo B y en el fondo.
- RF-27: EL SISTEMA aceptará cero como masa retenida en un tamiz.
- RF-28: EL SISTEMA permitirá escribir observaciones en el ensayo, sin exigirlas.
- RF-29: EL SISTEMA tomará el nombre de la obra de la obra del ensayo, sin pedirlo.
- RF-30: EL SISTEMA mostrará en el informe el número y el objeto del contrato de la obra.
  [NECESITA ACLARACIÓN: hoy la obra no lleva registrado su contrato. ¿Se añade a la obra, o el
  informe lo omite?]
- RF-31: EL SISTEMA permitirá guardar un ensayo en borrador con datos incompletos.
- RF-32: EL SISTEMA no pedirá el tamaño máximo ni el tamaño máximo nominal: los calculará
  (RF-49, RF-50).

### Validaciones (H4)

- RF-33: SI alguna masa es negativa, ENTONCES EL SISTEMA rechazará el ensayo indicando cuál.
- RF-34: SI la masa inicial seca es mayor que la masa inicial húmeda, ENTONCES EL SISTEMA
  rechazará el ensayo.
- RF-35: SI la tara es igual o mayor que la masa inicial seca, ENTONCES EL SISTEMA rechazará el
  ensayo.
- RF-36: SI la masa seca después del lavado es mayor que la masa inicial seca, ENTONCES EL
  SISTEMA rechazará el ensayo.
- RF-37: SI la suma de las masas retenidas, fondo incluido, es mayor que la masa inicial seca
  sin tara, ENTONCES EL SISTEMA rechazará el ensayo mostrando las dos cifras.
- RF-38: SI la fecha de ejecución es anterior a la de recepción, ENTONCES EL SISTEMA rechazará
  el ensayo.
- RF-39: SI la fecha de recepción o la de ejecución es posterior al día de hoy en la obra,
  ENTONCES EL SISTEMA rechazará el ensayo.
- RF-40: SI el número de informe es igual al de otro ensayo vigente de la misma obra, sin
  distinguir mayúsculas ni espacios, ENTONCES EL SISTEMA rechazará el ensayo.
- RF-41: EL SISTEMA considerará vigente todo ensayo que no esté anulado ni descartado.

### Cálculo (H4)

- RF-42: EL SISTEMA calculará los resultados únicamente a partir de las masas registradas, sin
  aceptar porcentajes, tamaños ni veredictos que lleguen ya calculados.
- RF-43: MIENTRAS el laboratorista digita, EL SISTEMA mostrará los resultados actualizados sin
  necesidad de guardar.
- RF-44: EL SISTEMA calculará la humedad como (masa húmeda − masa seca) ÷ masa seca × 100.
- RF-45: EL SISTEMA calculará la masa seca sin tara como la masa inicial seca menos la tara.
  [NECESITA ACLARACIÓN: ¿la masa húmeda y M2 también se pesan con el recipiente, de modo que la
  tara se les deba restar? En el Excel la tara es 0 y no se nota.]
- RF-46: EL SISTEMA calculará el porcentaje retenido de cada tamiz como su masa retenida ÷ masa
  seca sin tara × 100.
- RF-47: EL SISTEMA calculará el porcentaje retenido acumulado de cada tamiz como la suma de su
  porcentaje retenido y el de todos los tamices mayores.
- RF-48: EL SISTEMA calculará el porcentaje que pasa de cada tamiz como 100 menos su retenido
  acumulado.
- RF-49: EL SISTEMA calculará el tamaño máximo como el tamiz más pequeño por el que pasa el
  100 % de la muestra.
- RF-50: EL SISTEMA calculará el tamaño máximo nominal como el tamiz más grande que retiene
  material.
  [NECESITA ACLARACIÓN: confirmar que esas dos son las definiciones que usa el laboratorio de
  OCC. Con ellas, el ejemplo del anexo C da 2" y 1½", que es lo que dice el Excel.]
- RF-51: SI el primer tamiz de la serie retiene material, ENTONCES EL SISTEMA indicará que el
  tamaño máximo es mayor que ese tamiz, en lugar de un valor.
- RF-52: EL SISTEMA no mostrará porcentaje que pasa para el fondo.
- RF-53: EL SISTEMA mostrará la diferencia entre la masa seca después del lavado y la suma de
  las masas retenidas, fondo incluido, en gramos y en porcentaje de M2.
- RF-54: SI esa diferencia supera el 0,3 % de M2, ENTONCES EL SISTEMA avisará que el tamizado
  perdió o ganó material, sin impedir guardar ni enviar.
- RF-55: EL SISTEMA mostrará los porcentajes con dos decimales y la humedad con uno.
- RF-56: SI la masa seca sin tara es cero o falta una masa necesaria, ENTONCES EL SISTEMA dirá
  qué falta en lugar de mostrar porcentajes.

### Veredicto (H4)

- RF-57: EL SISTEMA comparará el porcentaje que pasa de cada tamiz que controla la franja con
  sus límites, con los límites incluidos.
- RF-58: EL SISTEMA hará esa comparación con el porcentaje redondeado a dos decimales, el mismo
  que muestra.
- RF-59: SI algún tamiz controlado queda fuera de sus límites, ENTONCES EL SISTEMA dará el
  veredicto NO CUMPLE.
- RF-60: EL SISTEMA dará el veredicto CUMPLE únicamente cuando todos los tamices controlados
  queden dentro de sus límites.
- RF-61: EL SISTEMA señalará en la tabla cada tamiz que queda fuera de la franja, indicando si
  queda por encima o por debajo.
- RF-62: EL SISTEMA mostrará el veredicto con texto e ícono, nunca solo con color.
- RF-63: MIENTRAS falten datos para calcular, EL SISTEMA no mostrará veredicto.

### Curva granulométrica (H5)

- RF-64: EL SISTEMA dibujará la curva granulométrica con el porcentaje que pasa en el eje
  vertical, de 0 a 100, y el diámetro en milímetros en el eje horizontal, en escala logarítmica.
- RF-65: EL SISTEMA dibujará la curva del ensayo con todos los tamices de la serie, sin el
  fondo.
- RF-66: EL SISTEMA dibujará los límites inferior y superior de la franja en los tamices que
  ella controla.
- RF-67: EL SISTEMA distinguirá la curva del ensayo y los dos límites con una leyenda.
- RF-68: EL SISTEMA marcará en la curva los puntos fuera de la franja con una forma distinta, no
  solo con otro color.
- RF-69: MIENTRAS falten datos para calcular, EL SISTEMA mostrará en el lugar de la curva qué
  falta.

### Estados y aprobación (H6)

- RF-70: CUANDO se registre un ensayo, EL SISTEMA lo dejará en estado Borrador.
- RF-71: MIENTRAS un ensayo esté en Borrador o Devuelto, EL SISTEMA permitirá modificarlo a los
  laboratoristas de su obra.
- RF-72: EL SISTEMA permitirá a un laboratorista enviar a aprobación un ensayo en Borrador o
  Devuelto.
- RF-73: SI al enviar falta un dato obligatorio o falla una validación, ENTONCES EL SISTEMA
  rechazará el envío indicando cuál.
- RF-113: MIENTRAS un ensayo en Borrador o Devuelto tenga cambios en pantalla sin guardar, EL
  SISTEMA no permitirá enviarlo y dirá que primero hay que guardar.
  > **Añadido el 2026-09-25** (aprobado por Diego tras la validación): se envía lo guardado, y
  > enviar con cambios en pantalla mandaría algo distinto de lo que se ve.
- RF-74: CUANDO un ensayo se envíe, EL SISTEMA lo dejará en estado Enviado.
- RF-75: CUANDO un ensayo se envíe, EL SISTEMA registrará como «Revisó» a quien lo envió, con su
  cargo y la fecha.
- RF-76: MIENTRAS un ensayo esté Enviado, EL SISTEMA no permitirá modificarlo a nadie.
- RF-77: MIENTRAS un ensayo esté Enviado, EL SISTEMA permitirá al residente, al director o a la
  gerencia aprobarlo.
- RF-78: MIENTRAS un ensayo esté Enviado, EL SISTEMA permitirá al residente, al director o a la
  gerencia devolverlo con un comentario.
- RF-79: SI se intenta devolver un ensayo sin comentario, ENTONCES EL SISTEMA lo rechazará.
- RF-80: CUANDO un ensayo se devuelva, EL SISTEMA lo dejará en estado Devuelto.
- RF-81: MIENTRAS un ensayo esté Devuelto, EL SISTEMA mostrará al laboratorista el comentario de
  quien lo devolvió.
- RF-82: CUANDO un ensayo se apruebe, EL SISTEMA lo dejará en estado Aprobado.
- RF-83: CUANDO un ensayo se apruebe, EL SISTEMA registrará como «Aprobó» a quien lo aprobó, con
  su cargo y la fecha.
- RF-84: EL SISTEMA tomará como fecha de emisión del informe la fecha de aprobación.
  [NECESITA ACLARACIÓN: confirmar. En el Excel la fecha de emisión no se llena.]
- RF-85: MIENTRAS un ensayo esté Aprobado, EL SISTEMA no permitirá modificarlo a nadie.
- RF-86: EL SISTEMA permitirá al residente, al director o a la gerencia anular un ensayo
  Aprobado con un motivo escrito.
- RF-87: SI se intenta anular sin motivo, ENTONCES EL SISTEMA lo rechazará.
- RF-88: CUANDO un ensayo se anule, EL SISTEMA conservará todos sus datos y registrará el motivo,
  quién lo anuló y cuándo.
- RF-89: EL SISTEMA mostrará los ensayos anulados marcados como anulados, con su motivo.
- RF-90: EL SISTEMA permitirá a un laboratorista descartar sin motivo un ensayo en Borrador o
  Devuelto.
- RF-91: CUANDO un ensayo se descarte, EL SISTEMA dejará de mostrarlo en el listado y en el
  parte, conservándolo guardado.
- RF-92: EL SISTEMA no permitirá al laboratorista aprobar, devolver ni anular ensayos.
- RF-93: SI se pide una acción sobre un ensayo cuyo estado cambió desde que se abrió, ENTONCES EL
  SISTEMA la rechazará diciendo en qué estado está ahora.
- RF-94: EL SISTEMA guardará la historia de cada ensayo: cada envío, devolución, aprobación y
  anulación, con quién y cuándo.

### Informe (H7)

- RF-95: EL SISTEMA ofrecerá un informe imprimible de cada ensayo con el encabezado del formato:
  logo de GEOLAB Colombia SAS, título y norma del ensayo, código LAB-FR-01-2025, versión y
  fecha de actualización del formato (anexo D).
  > **Precisado el 2026-09-24**: el logo del formato es el de GEOLAB Colombia SAS, el
  > laboratorio, no el de OCC. El informe lleva el mismo del Excel.
- RF-96: EL SISTEMA incluirá en el informe los datos del ensayo, la tabla completa de tamices,
  la humedad, el tamaño máximo, el tamaño máximo nominal, la franja, la curva, el veredicto, las
  observaciones y los bloques «Revisó» y «Aprobó» con nombre y cargo.
- RF-97: MIENTRAS un ensayo no esté Aprobado, EL SISTEMA mostrará en su informe una marca
  visible con su estado, que diga que no está aprobado.
- RF-98: MIENTRAS un ensayo esté Anulado, EL SISTEMA mostrará en su informe la marca ANULADO con
  el motivo.
- RF-99: EL SISTEMA permitirá imprimir el informe o guardarlo como PDF.
- RF-100: EL SISTEMA hará caber el informe de un ensayo en una hoja tamaño carta.
  [NECESITA ACLARACIÓN: ¿carta u oficio? El Excel no fija el papel.]

### Listado (H8)

- RF-101: EL SISTEMA listará los ensayos con su número de informe, fecha de ejecución, material,
  fuente, franja, veredicto y estado.
- RF-102: EL SISTEMA ordenará el listado por fecha de ejecución, del más reciente al más antiguo.
- RF-103: EL SISTEMA permitirá filtrar el listado por periodo de ejecución, material, franja,
  estado y veredicto.
- RF-104: EL SISTEMA permitirá a la gerencia filtrar el listado por obra.
- RF-105: EL SISTEMA mostrará al residente y a la gerencia cuántos ensayos esperan aprobación.

### Parte diario (H9)

- RF-106: MIENTRAS un parte esté abierto, EL SISTEMA mostrará en su sección Control Calidad de
  Obra los ensayos de granulometría de esa obra con fecha de ejecución ese día, salvo los
  descartados y los anulados.
- RF-107: EL SISTEMA mostrará de cada ensayo en el parte su número de informe, material, franja,
  veredicto y estado.
- RF-108: EL SISTEMA no permitirá modificar un ensayo desde el parte.
- RF-109: EL SISTEMA permitirá abrir el ensayo desde el parte.
- RF-110: EL SISTEMA contará cada ensayo de granulometría mostrado como una fila de la sección
  Control Calidad de Obra para el requisito de cierre del parte.
- RF-111: CUANDO se cierre un parte, EL SISTEMA fijará en él los ensayos de granulometría con los
  datos y el estado que tenían en ese momento.
- RF-112: EL SISTEMA no alterará un parte cerrado cuando uno de sus ensayos se apruebe, se
  devuelva o se anule después.

## Superficies afectadas

- [ ] **Móvil** — Sin cambios. El operador no interviene.
- [x] **Panel web** — módulo Laboratorio nuevo (listado, registro, curva, aprobación, informe);
  interruptor del módulo en la obra; acceso y cargo Laboratorista en personas; sección Control
  Calidad de Obra del parte diario.
- [x] **API** — endpoints del panel para el módulo; el cierre del parte fija los ensayos. Ningún
  endpoint del celular.
- [ ] **Sincronización** — Sin cambios. Nada de esto baja al celular ni sube de él.
- [x] **Datos** — servidor: ensayos con su historia, acceso nuevo, interruptor por obra. Sin
  cambios en la base del dispositivo.
- [x] **Reglas** — cálculo granulométrico, tamaños máximos, control de lavado, veredicto contra
  la franja, permisos del acceso nuevo y del módulo. Cada una con su caso en la verificación;
  el cálculo, con los números del anexo C.

## Requisitos no funcionales

- **Fidelidad al formato:** con las masas del anexo C, el sistema da los mismos porcentajes que
  el Excel a dos decimales, en los dieciséis renglones.
- **Idioma:** interfaz, informe y mensajes en español.
- **Panel:** la tabla del listado cabe en el ancho del panel sin que la columna de acciones
  quede fuera de la vista.
- **Accesibilidad:** el veredicto y los tamices fuera de franja nunca se distinguen solo por
  color (RF-62, RF-68).
- **Dependencias:** la curva no justifica, por sí sola, una librería nueva; si hiciera falta,
  se pregunta antes (constitución, principio 8).

## Casos límite

- **Sin señal**: no aplica. El módulo es del panel web; el celular no cambia y el operador no
  interviene.
- **Evidencia firmada**: un ensayo Enviado no lo modifica nadie; uno Aprobado tampoco, y se
  corrige anulándolo con motivo y registrando otro (RF-76, RF-85, RF-86). Un parte cerrado
  conserva los ensayos como estaban al cerrarlo, aunque luego se aprueben o se anulen (RF-112).
- **Primer arranque**: una obra recién encendida no tiene ensayos: el listado lo dice en vez de
  aparecer vacío sin explicación. Una obra con el módulo encendido y sin laboratorista puede
  registrar ensayos por medio de la gerencia (RF-9).

Y los del caso concreto:

- **División por cero**: masa seca sin tara en cero o masas faltantes → no se muestran
  porcentajes ni veredicto, se dice qué falta (RF-56, RF-63).
- **Todo pasa el primer tamiz o nada lo pasa**: tamaño máximo por encima de la serie (RF-51).
- **Suma retenida mayor que la muestra**: se rechaza (RF-37). Menor: se muestra la diferencia
  contra M2 y se avisa si pasa de 0,3 % (RF-53, RF-54).
- **Número de informe repetido**: se rechaza mientras el otro esté vigente; tras anular o
  descartar, el número queda libre (RF-40, RF-41).
- **Dos personas a la vez**: un residente aprueba mientras otro devuelve → la segunda acción se
  rechaza con el estado actual (RF-93).
- **Enviar con cambios sin guardar**: no se permite hasta guardar (RF-113); al deshacer los
  cambios, se puede enviar de nuevo.
- **Franja cambiada en el catálogo**: los ensayos existentes conservan los límites con que se
  hicieron (RF-21).
- **Módulo apagado con ensayos**: dejan de verse; al encender, vuelven (RF-14, RF-16).
- **Ejecución en una fecha con el parte ya cerrado**: el ensayo no entra a ese parte cerrado
  (RF-111, RF-112).

## Fuera de alcance

- La app móvil: el ensayo no se captura ni se consulta en el celular.
- Los demás ensayos del laboratorio (límites de Atterberg, Proctor, CBR, equivalente de arena,
  densidades…). Cada uno será su propia spec.
- Combinar granulometrías de dos materiales en proporción (mezclas 85 % / 15 %): un ensayo es
  una muestra.
- Editar el catálogo de franjas desde el panel: cambia con una nueva versión del sistema.
- Firma dibujada de «Revisó» y «Aprobó»: queda el nombre, el cargo y la fecha de quien lo hizo.
- Guardado automático del ensayo mientras se digita: se guarda con «Guardar borrador».
- Descarga del ensayo en Excel.
- Relacionar el ensayo con viajes de cantera o con movimientos de almacén.
- Tamices distintos de la serie del anexo B.

## Criterios de finalización

- Cada RF tiene cómo comprobarse: los de cálculo, veredicto, tamaños, lavado y permisos, con su
  caso en la verificación de reglas —el cálculo, con los números exactos del anexo C—; los de
  pantalla y flujo, con un paso de la demo.
- `npm run verificar`, `npm run typecheck` y `npm run lint` en verde.
- Demo manual: la gerencia enciende Laboratorio en una obra y registra a un laboratorista →
  el laboratorista registra el ensayo del anexo C con la franja SBG-50 y ve 86,48 % en 1½",
  tamaño máximo 2", nominal 1½", CUMPLE y la curva dentro de la franja → lo envía → el
  residente lo devuelve con comentario → el laboratorista corrige y reenvía → el residente lo
  aprueba → nadie puede modificarlo → el ensayo aparece en el parte del día de ejecución y
  cuenta para cerrarlo → se cierra el parte → el residente anula el ensayo con motivo → el parte
  cerrado sigue mostrándolo como estaba → se imprime el informe a PDF con la marca ANULADO.

## Dudas abiertas

- [NECESITA ACLARACIÓN: franjas del catálogo además de SBG-50, con sus límites (RF-19).]
- [NECESITA ACLARACIÓN: definiciones de tamaño máximo y nominal que usa OCC (RF-49, RF-50).]
- [NECESITA ACLARACIÓN: si la tara se resta también a la masa húmeda y a M2 (RF-45).]
- [NECESITA ACLARACIÓN: contrato de la obra en el informe (RF-30).]
- [NECESITA ACLARACIÓN: fecha de emisión = fecha de aprobación (RF-84).]
- [NECESITA ACLARACIÓN: tamaño de papel del informe (RF-100).]
- [NECESITA ACLARACIÓN: el tamiz de ½" figura en el Excel como 12,7 mm; la serie INVÍAS lo
  da como 12,5 mm. ¿Cuál se usa en la tabla y en la curva? (anexo B)]

---

## Anexo A — Franja Subbase granular SBG-50

Tomada del propio formato (columnas de límites de la gráfica). Porcentaje que pasa.

| Tamiz | mm | Mínimo | Máximo |
| --- | --- | --- | --- |
| 2" | 50 | 100 | 100 |
| 1½" | 37,5 | 70 | 95 |
| 1" | 25 | 60 | 90 |
| ½" | 12,7 | 45 | 75 |
| ⅜" | 9,5 | 40 | 70 |
| N.º 4 | 4,75 | 25 | 55 |
| N.º 10 | 2,0 | 15 | 40 |
| N.º 40 | 0,425 | 6 | 25 |
| N.º 100 | 0,15 | 3 | 18 |
| N.º 200 | 0,075 | 2 | 15 |

## Anexo B — Serie de tamices del formato

2" (50) · 1½" (37,5) · 1" (25) · ¾" (19) · ½" (12,7 — ver dudas) · ⅜" (9,5) · N.º 4 (4,75) ·
N.º 8 (2,36) · N.º 10 (2,0) · N.º 16 (1,18) · N.º 30 (0,6) · N.º 40 (0,425) · N.º 50 (0,3) ·
N.º 100 (0,15) · N.º 200 (0,075) · Fondo. Milímetros entre paréntesis.

## Anexo C — Ejemplo de verificación (el del Excel)

Masa húmeda 6 830 g · M1 6 621 g · tara 0 g · M2 no registrada. Humedad 3,2 %.

| Tamiz | Retenido (g) | % pasa |
| --- | --- | --- |
| 2" | 0,0 | 100,00 |
| 1½" | 895,1 | 86,48 |
| 1" | 1 094,9 | 69,94 |
| ¾" | 565,3 | 61,41 |
| ½" | 767,5 | 49,81 |
| ⅜" | 375,6 | 44,14 |
| N.º 4 | 792,9 | 32,17 |
| N.º 8 | 444,7 | 25,45 |
| N.º 10 | 110,1 | 23,79 |
| N.º 16 | 248,5 | 20,03 |
| N.º 30 | 409,8 | 13,84 |
| N.º 40 | 369,7 | 8,26 |
| N.º 50 | 181,2 | 5,52 |
| N.º 100 | 100,5 | 4,01 |
| N.º 200 | 40,8 | 3,39 |
| Fondo | 8,2 | — |

Suma retenida 6 404,8 g. Tamaño máximo 2", nominal 1½". Contra SBG-50: **CUMPLE** (todos los
tamices controlados dentro de la franja).

## Anexo D — Encabezado del formato

«Determinación de los tamaños de las partículas de suelos — INV E 123-13» · Código
LAB-FR-01-2025 · Versión 0.0 · Fecha de actualización 2025/08/11.
