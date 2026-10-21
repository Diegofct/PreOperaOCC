# Spec 031 — Contrato y Presupuesto por obra

> Estado: **Aprobada** el 2026-10-20 · Fecha: 2026-10-20

## Contexto y objetivo

Hoy PreOperaOCC no sabe qué contrató cada obra.

La bitácora elige las actividades de un catálogo fijo de 31 ítems de pago, igual para todas las obras, sin:
- capítulo;
- cantidad contratada;
- precio.

Por eso no se puede responder:
- cuánto falta por ejecutar de un ítem en una vía;
- cuánto vale lo hecho;
- qué dice el contrato sobre anticipo, retención, impuestos o pólizas.

El contrato y el presupuesto viven en Excel y en NexusObras, separados de lo que la obra reporta cada día.

Esta spec lleva a cada obra:
- su **contrato**, con sus condiciones, impuestos, pólizas y documentos;
- su **presupuesto**, con capítulos, ítems, cantidades, precios, rubros y AIU, cargado desde el Excel del formulario oficial o a mano, con versiones.

Desde ese momento la bitácora registra cada actividad contra un ítem **dentro de su capítulo** del presupuesto vigente. Es la base de los cortes de obra (spec 032) y del cronograma (spec 033).

Referencia: `specs/_referencias/nexusobras.md` y el formulario de OCC `docs/preupuesto.xlsx`, que tiene:
- 2 vías;
- 7 capítulos por vía;
- 76 renglones de 31 ítems de pago;
- rubros estimados;
- valor total de $54.441.800.920.

## Usuarios / actores

- **Gerencia** (panel web, rol `admin`):
  - crea, importa, edita y **aprueba** el contrato y el presupuesto de cualquier obra;
  - crea nuevas versiones.
- **Residente / director de obra** (panel web, rol `supervisor`): en su obra ve, crea, importa y edita los borradores, y crea nuevas versiones; **no aprueba** (D1).
- **Quien reporta por WhatsApp:** sigue escribiendo su reporte; la IA debe reconocer también el capítulo de cada actividad.
- **Los demás roles** (operador, almacenista, encargado de planta, laboratorista): no ven el módulo, y en ningún sitio ven precios.

## Historias de usuario

- H1: Como gerencia quiero registrar el contrato de cada obra, con sus partes, condiciones, impuestos, pólizas y documentos, para tenerlo a mano y usarlo en los cortes.
- H2: Como gerencia quiero cargar el presupuesto de la obra desde el Excel del formulario oficial, sin copiarlo a mano, para tener cantidades y precios exactos.
- H3: Como residente quiero ver y ajustar el presupuesto de mi obra, y crear una nueva versión cuando hay un otrosí, para que siempre esté vigente el que se ejecuta.
- H4: Como residente quiero que las actividades de la bitácora se registren contra el ítem y el capítulo del presupuesto vigente, para saber cuánto se ha ejecutado en cada vía y en cada capítulo.
- H5: Como gerencia quiero que me avisen cuando una póliza esté por vencer, para renovarla a tiempo.

## Requisitos funcionales (criterios de aceptación en EARS)

### El módulo (H1, H3)

- RF-1: EL SISTEMA muestra en el menú del panel una sección «Cliente» con el módulo «Contrato y Presupuesto».
- RF-2: EL SISTEMA muestra el módulo a gerencia y al residente, y a ningún otro rol.
- RF-3: EL SISTEMA deja aprobar el contrato, aprobar el presupuesto y volver el contrato a borrador solo a gerencia (D1).
- RF-4: EL SISTEMA muestra al residente solo su obra. A gerencia le deja elegir la obra.
- RF-5: EL SISTEMA organiza el módulo en dos pestañas: «Contrato» y «Presupuesto».
- RF-6: EL SISTEMA guarda, en cada cambio del contrato o del presupuesto, quién lo hizo y cuándo.

### Contrato: datos y condiciones (H1)

- RF-7: EL SISTEMA lleva un contrato por obra, con estado **Borrador** o **Aprobado**.
- RF-8: EL SISTEMA guarda del **contratante**:
  - el nombre (obligatorio);
  - el NIT;
  - la dirección y la ciudad;
  - el correo y el teléfono;
  - el nombre y la identificación del representante legal.
- RF-9: EL SISTEMA guarda del **contratista** si el contrato se ejecuta como consorcio o unión temporal.
- RF-10: DONDE el contratista es un consorcio o una unión temporal, EL SISTEMA guarda su nombre y cada integrante con su NIT y su porcentaje de participación.
- RF-11: SI los porcentajes de los integrantes no suman 100 %, ENTONCES EL SISTEMA no deja aprobar el contrato y dice cuánto suman.
- RF-12: EL SISTEMA guarda del contrato:
  - el tipo, de la lista de NexusObras (Obra: precio global, precios unitarios, administración delegada, llave en mano; Consultoría: estudios y diseños, interventoría, gerencia de proyectos, asesoría técnica; Otros: mano de obra, todo costo, subcontrato, alquiler, otro);
  - el número;
  - el objeto;
  - la fecha de inicio;
  - la fecha de fin;
  - el plazo en días;
  - el valor;
  - el porcentaje de anticipo;
  - el porcentaje de retención en garantía.
- RF-13: CUANDO se escriben la fecha de inicio y la de fin, EL SISTEMA calcula el plazo en días.
- RF-14: SI la fecha de fin es anterior a la de inicio, ENTONCES EL SISTEMA no deja guardar y lo dice.
- RF-15: MIENTRAS la obra tenga un presupuesto vigente, EL SISTEMA propone como valor del contrato el valor del presupuesto vigente.
- RF-16: SI el valor del contrato no coincide con el del presupuesto vigente, ENTONCES EL SISTEMA muestra la diferencia, como aviso que no impide guardar ni aprobar (D3).
- RF-17: CUANDO se pulsa «Aprobar contrato», EL SISTEMA exige el nombre del contratante, el tipo, el número, las fechas y el valor.
- RF-18: MIENTRAS el contrato está aprobado, EL SISTEMA no deja editar sus datos.
- RF-19: CUANDO se pulsa «Volver a borrador» en un contrato aprobado, EL SISTEMA pide un motivo, lo guarda y lo deja editar otra vez.

### Contrato: impuestos y retenciones (H1)

- RF-20: EL SISTEMA guarda en el contrato una lista de impuestos y retenciones, cada uno con:
  - el nombre;
  - el porcentaje;
  - la base sobre la que se calcula: **costo directo**, **AIU**, **utilidad**, **IVA** o **valor del corte**.
- RF-21: CUANDO se agrega un impuesto, EL SISTEMA propone los de uso común:
  - Retefuente de servicios de construcción, 2 %, sobre el valor del corte;
  - ReteIVA, 15 %, sobre el IVA;
  - ReteICA, con el porcentaje del municipio por escribir;
  - estampillas, con su porcentaje por escribir.

  Todos se pueden cambiar o quitar.
- RF-22: SI un porcentaje es negativo o mayor que 100, ENTONCES EL SISTEMA no lo deja guardar.

### Contrato: pólizas (H5)

- RF-23: EL SISTEMA guarda las pólizas del contrato, cada una con:
  - el amparo (cumplimiento, buen manejo del anticipo, salarios y prestaciones, estabilidad de la obra, responsabilidad civil extracontractual u otro);
  - la aseguradora;
  - el número;
  - el valor asegurado;
  - la vigencia desde y hasta;
  - el archivo de la póliza, opcional.
- RF-24: EL SISTEMA muestra cada póliza como **Vigente**, **Por vencer** o **Vencida**. «Por vencer» empieza 30 días antes del fin de la vigencia.
- RF-25: MIENTRAS una póliza de la obra está por vencer o vencida, EL SISTEMA lo avisa en el Inicio del panel de gerencia y del residente de esa obra.
- RF-26: EL SISTEMA no borra una póliza: la marca **reemplazada** por otra o la **anula** con motivo.

### Contrato: documentos (H1)

- RF-27: EL SISTEMA deja subir documentos al contrato, cada uno con:
  - la clase (contrato firmado, acta de inicio, otrosí, acta de suspensión, acta de reinicio, acta de recibo, minuta u otro);
  - la fecha;
  - una descripción;
  - el archivo en PDF o imagen.
- RF-28: EL SISTEMA lista los documentos del más reciente al más antiguo y deja abrirlos.
- RF-29: EL SISTEMA no borra un documento: lo anula con motivo, y el anulado se sigue viendo marcado.
- RF-30: SI el archivo pasa de 20 MB o no es PDF ni imagen, ENTONCES EL SISTEMA lo rechaza y dice por qué.

### Presupuesto: estructura (H2, H3)

- RF-31: EL SISTEMA lleva por obra una lista de presupuestos, cada uno con:
  - su nombre;
  - su versión (v1, v2…);
  - su fecha;
  - su valor;
  - su estado: **Borrador**, **Vigente** o **Reemplazado**.
- RF-32: EL SISTEMA organiza el presupuesto en **grupos** (como cada vía o tramo del formulario), **capítulos** dentro de cada grupo e **ítems** dentro de cada capítulo.
- RF-33: SI el presupuesto no tiene grupos, ENTONCES EL SISTEMA muestra los capítulos directamente.
- RF-34: EL SISTEMA guarda de cada ítem:
  - el número de renglón;
  - el ítem de pago (p. ej. «4.1.8»);
  - el código ICOCIV y las especificaciones, opcionales;
  - la descripción;
  - la unidad;
  - la cantidad;
  - el valor unitario;
  - el valor total.
- RF-35: EL SISTEMA calcula el valor total de cada ítem como cantidad por valor unitario, redondeado al peso.
- RF-36: EL SISTEMA permite el mismo ítem de pago en varios capítulos, cada uno con su propia cantidad.
- RF-37: EL SISTEMA guarda los **rubros** del presupuesto aparte de los ítems (plan de manejo ambiental, plan de manejo de tránsito, caracterización vial, primas de garantías, actualización de precios…). Cada rubro va con su grupo, opcional, su unidad o «estimado», su cantidad y su valor.
- RF-38: EL SISTEMA guarda los porcentajes de **Administración**, **Imprevistos** y **Utilidad**, y muestra el total del AIU.
- RF-39: EL SISTEMA trata el AIU como **incluido en los precios unitarios**, como el formulario de OCC: el valor del presupuesto es la suma de los ítems más los rubros, y el AIU solo se informa con sus porcentajes (D2).
- RF-40: EL SISTEMA muestra el resumen del presupuesto con:
  - el subtotal por capítulo y por grupo;
  - el subtotal de obras;
  - los rubros;
  - los porcentajes del AIU, como información;
  - el **valor del presupuesto**.

### Presupuesto: importar desde Excel (H2)

- RF-41: CUANDO se sube un Excel con el formato del formulario oficial de propuesta económica (como `docs/preupuesto.xlsx`), EL SISTEMA crea un presupuesto en borrador con sus grupos, capítulos, ítems, rubros y porcentajes de AIU.
- RF-42: EL SISTEMA reconoce como ítem cada fila con número de renglón, y como grupo o capítulo cada título sin número. Los subtotales y las notas no los toma como ítems.
- RF-43: CUANDO termina de leer, EL SISTEMA muestra, antes de crear el presupuesto:
  - cuántos grupos, capítulos, ítems y rubros encontró;
  - el valor que calcula;
  - el «VALOR TOTAL» que dice el Excel.
- RF-44: SI el valor calculado no coincide con el «VALOR TOTAL» del Excel, ENTONCES EL SISTEMA muestra la diferencia y deja crearlo igual, marcado para revisar.
- RF-45: SI un ítem trae un valor total distinto de cantidad por valor unitario, ENTONCES EL SISTEMA lo señala en la vista previa con los dos valores.
- RF-46: SI el archivo no tiene el formato del formulario, ENTONCES EL SISTEMA no crea nada y explica qué no encontró: la fila de encabezados, los ítems o el valor total.

### Presupuesto: edición, aprobación y versiones (H3)

- RF-47: MIENTRAS un presupuesto está en borrador, EL SISTEMA deja agregar, cambiar, mover y quitar grupos, capítulos, ítems y rubros, y cambiar el AIU.
- RF-48: CUANDO se crea un presupuesto en blanco, EL SISTEMA lo crea en borrador con la siguiente versión.
- RF-49: CUANDO se pulsa «Aprobar presupuesto», EL SISTEMA lo marca **Vigente**, y el que era vigente pasa a **Reemplazado**.
- RF-50: SI el presupuesto no tiene ningún ítem o tiene un ítem sin unidad, sin cantidad o sin valor unitario, ENTONCES EL SISTEMA no deja aprobarlo y lista lo que falta.
- RF-51: MIENTRAS un presupuesto está vigente o reemplazado, EL SISTEMA no deja editarlo.
- RF-52: CUANDO se pulsa «Nueva versión» sobre el vigente, EL SISTEMA crea un borrador que es copia exacta de él, con la siguiente versión y una nota del motivo (p. ej. «Otrosí 1»).
- RF-53: EL SISTEMA reconoce un ítem de la nueva versión como el mismo de la anterior cuando coinciden el ítem de pago y el capítulo, para que lo ya ejecutado siga contando.
- RF-54: SI al aprobar una nueva versión desaparece un ítem con cantidades ya reportadas en la bitácora, ENTONCES EL SISTEMA avisa cuáles son y cuánto se reportó, y pide confirmar.
- RF-55: EL SISTEMA deja abrir en solo lectura cualquier versión anterior.
- RF-56: EL SISTEMA no borra un presupuesto vigente ni reemplazado. Un borrador sí se puede descartar con motivo.
- RF-57: EL SISTEMA permite un solo borrador por obra a la vez.

### La bitácora con el presupuesto (H4)

- RF-58: MIENTRAS la obra no tenga presupuesto vigente, EL SISTEMA sigue ofreciendo en la bitácora el catálogo fijo de hoy, sin capítulo.
- RF-59: MIENTRAS la obra tenga presupuesto vigente, EL SISTEMA ofrece en la actividad de la bitácora los ítems del presupuesto vigente con su capítulo y su grupo, y deja buscarlos por ítem, por descripción o por capítulo.
- RF-60: EL SISTEMA guarda en cada actividad nueva el ítem, el capítulo y el grupo elegidos, con la unidad del presupuesto.
- RF-61: EL SISTEMA no muestra precios en la bitácora.
- RF-62: EL SISTEMA no cambia las actividades ya registradas: las que no tienen capítulo quedan «sin capítulo», y el corte (spec 032) las deja asignar.
- RF-63: EL SISTEMA sigue permitiendo la «otra actividad», fuera del presupuesto, como hoy.

### Desde WhatsApp (H4)

- RF-64: MIENTRAS la obra tenga presupuesto vigente, EL SISTEMA reconoce en cada actividad del reporte el ítem y su capítulo, por lo que diga el mensaje (el capítulo, la vía o la obra: «alcantarilla», «cuneta», «Ye–Yondo»…).
- RF-65: SI el ítem está en un solo capítulo del presupuesto vigente, ENTONCES EL SISTEMA toma ese capítulo aunque el mensaje no lo diga.
- RF-66: SI el ítem está en varios capítulos y el mensaje no deja saber cuál, ENTONCES EL SISTEMA aparta la actividad en «No se pudo guardar» con los capítulos posibles, para que quien la atiende elija.
- RF-67: SI el ítem no está en el presupuesto vigente, ENTONCES EL SISTEMA aparta la actividad en «No se pudo guardar» con ese motivo.

### Reportes (H4)

- RF-68: MIENTRAS la obra tenga presupuesto vigente, EL SISTEMA muestra en la pestaña Actividades de Reportes (spec 030) la cantidad ejecutada por ítem dentro de su capítulo y su grupo, con la cantidad contratada y el porcentaje ejecutado acumulado.

### Reglas transversales

- RF-69: EL SISTEMA guarda los valores en pesos colombianos sin decimales y las cantidades con hasta tres decimales.
- RF-70: EL SISTEMA muestra los valores con separador de miles y signo de pesos («$ 54.441.800.920»).
- RF-71: EL SISTEMA pagina de 15 en 15 las listas que lo necesiten, como el resto del panel.
- RF-72: EL SISTEMA muestra el módulo en una sola columna en pantallas de menos de 768 px, con las tablas desplazables a lo ancho.
- RF-73: EL SISTEMA deja descargar el presupuesto vigente o cualquier versión en Excel, con su estructura y sus valores.

## Superficies afectadas

- [ ] **Móvil**: no cambia. El operador no registra actividades.
- [x] **Panel web**:
  - sección «Cliente» en el menú, con el módulo «Contrato y Presupuesto» y sus pestañas Contrato y Presupuesto;
  - importar Excel con vista previa;
  - editor del presupuesto y versiones;
  - selector de ítem y capítulo en la actividad de la bitácora;
  - aviso de pólizas en el Inicio;
  - capítulos en «No se pudo guardar» y en Reportes → Actividades.
- [x] **API**:
  - rutas del panel para el contrato, los impuestos, las pólizas, los documentos y los presupuestos (importar, editar, aprobar, nueva versión, exportar);
  - la bitácora recibe el capítulo.
- [ ] **Sincronización**: no cambia.
- [x] **Datos**:
  - contrato por obra con integrantes, impuestos, pólizas y documentos;
  - presupuestos con versiones, grupos, capítulos, ítems y rubros;
  - el capítulo en las actividades de la bitácora;
  - permiso nuevo del módulo;
  - archivos en el almacén de evidencia.
- [x] **Reglas**:
  - cálculo de totales y valor del presupuesto;
  - lectura del formulario Excel;
  - qué se exige para aprobar;
  - el mismo ítem entre versiones;
  - estado de las pólizas;
  - reconocer el capítulo de una actividad;
  - suma de participaciones del consorcio.
- [x] **n8n**: la IA pide el capítulo o la vía de cada actividad del reporte.

## Requisitos no funcionales

- Importar `docs/preupuesto.xlsx` muestra la vista previa en menos de 5 s y da exactamente $54.441.800.920.
- El presupuesto de 76 ítems abre y se edita sin esperas mayores de 1 s por cambio.
- El selector de ítem de la bitácora encuentra un ítem escribiendo parte de su número o de su descripción, sin tildes, en menos de 300 ms con 200 ítems.
- El Excel descargado abre en Excel con tildes bien y los números como números.

## Casos límite

- **Sin señal**: no aplica; es el panel web.
- **Evidencia firmada**:
  - una bitácora cerrada no cambia: sus actividades sin capítulo quedan así (RF-62);
  - un presupuesto vigente o reemplazado no se edita: se crea otra versión (RF-51, RF-52);
  - un contrato aprobado vuelve a borrador solo con motivo (RF-19);
  - pólizas y documentos se anulan, no se borran.
- **Primer arranque**: una obra sin contrato ni presupuesto muestra cada pestaña vacía con «Registrar contrato» e «Importar presupuesto / Crear en blanco», y la bitácora sigue con el catálogo fijo (RF-58).
- **Dos personas a la vez**: el residente y gerencia editan el mismo borrador. El segundo en guardar recibe un aviso de que cambió y vuelve a cargar, como en la bandeja de WhatsApp (spec 021); no se pisan cambios en silencio.
- **Ítem que se mueve de capítulo en una versión nueva**: no es el mismo (RF-53). Lo ejecutado queda en el capítulo viejo, y el aviso de RF-54 lo muestra.
- **Excel con otra forma** (columnas corridas, otra hoja primero): se busca la fila de encabezados («ÍTEM DE PAGO», «UND.», «CANTIDAD», «VALOR UNITARIO»). Si no está, falla con explicación (RF-46).
- **Un ítem de pago con distinta unidad en dos capítulos**: se respeta la unidad de cada renglón.
- **Bitácora abierta cuando se aprueba el primer presupuesto**: las actividades ya escritas quedan sin capítulo. Las nuevas de ese mismo día ya piden capítulo.

## Fuera de alcance

- APU (análisis de precio unitario) por insumos y catálogo de APU de la empresa.
- AIU sumado sobre el costo directo, e IVA sobre la utilidad, al estilo NexusObras (D2): se agrega cuando aparezca un contrato que lo use.
- Importar con IA desde PDF o CSV, e importar desde Revit (BIM).
- Cortes de obra, avances, actas de pago, amortización del anticipo y cálculo de retenciones en cada corte: spec 032.
- Cronograma, Gantt, flujo de caja y valor ganado: spec 033.
- Subcontratos, compras, tesorería y control de costos de NexusObras.
- Generar o firmar el contrato o las actas desde el sistema.
- Avisos por correo o WhatsApp de pólizas por vencer: solo se avisa en el panel.
- Reasignar el capítulo de actividades ya registradas, salvo desde el corte (032).

## Criterios de finalización

- Cada RF tiene cómo comprobarse: caso en `scripts/verificar-reglas.ts` (si es regla pura) o paso de demo manual descrito.
- `npm run verificar`, `npm run typecheck` y `npm run lint` en verde.
- Demo manual del flujo principal, en la obra de pruebas:
  1. registrar y aprobar el contrato con un consorcio de dos integrantes, Retefuente y una póliza que vence en 20 días (aviso en Inicio);
  2. importar `docs/preupuesto.xlsx` → vista previa con 2 grupos, 14 capítulos, 76 ítems, 8 rubros y $54.441.800.920 → aprobar;
  3. en la bitácora, elegir «4.1.8 · Construcción de alcantarillas · Vía La Ye–Yondo»;
  4. un mensaje de WhatsApp con un ítem que está en un solo capítulo → guardado con su capítulo; uno ambiguo → «No se pudo guardar» con los capítulos posibles;
  5. «Nueva versión», cambiar una cantidad y aprobar → la v1 queda Reemplazada y la actividad sigue contando;
  6. Reportes → Actividades con contratado y % ejecutado.

## Dudas resueltas (2026-10-20, al aprobar)

- D1: El residente edita borradores y crea versiones de su obra, pero **solo gerencia aprueba** (RF-3), porque aprobar fija el valor contra el que se cobra.
- D2: Solo **AIU incluido en los precios**, como el formulario de OCC (RF-39). El modo sobre el costo directo queda fuera de alcance.
- D3: Si el valor del contrato difiere del presupuesto vigente, **solo se avisa** (RF-16). El presupuesto puede cambiar por otrosí después de firmar.
