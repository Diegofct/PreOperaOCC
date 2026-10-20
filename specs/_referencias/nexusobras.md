# Referencia: NexusObras (Contrato, Presupuesto y Avances, Cronograma)

Revisado el 2026-10-19 con el usuario de prueba de gerencia, proyecto «prueba» (PRY-0001).
Datos de prueba creados ahí con permiso:
- presupuesto «Presupuesto V1» (aprobado);
- capítulo 01 «PRUEBA Preliminares»;
- actividad 01.001 «PRUEBA Excavación mecánica»: m3, costo manual $25.000, cantidad 1.000;
- «Avance No. 01 (19-10-26)» en borrador, con 250 m3;
- cronograma generado.

Sirve de base para las specs 031 (Contrato y Presupuesto), 032 (Avances) y 033 (Cronograma).

## Menú del proyecto
Los grupos del menú lateral del proyecto son:

| Grupo | Opciones |
|---|---|
| — | Resumen |
| Cliente | Contrato, Presupuesto y Avances, Cronograma |
| Ejecución | Requisiciones, Subcontratos y Cortes, Compras y Almacén, Servicios, Equipos y Alquileres, Bitácora |
| Gestión documental | Documentos, Correspondencia |
| Financiero | Tesorería, Balance, Informes, Control de Costos |
| Administración | Equipo, Configuración |

El Resumen está vacío hasta que haya un presupuesto aprobado («El resumen se arma con el presupuesto aprobado»).

## Contrato
El contrato tiene estado Borrador, y se aprueba con «Aprobar contrato». Se guarda solo y se puede exportar.

**Contratante:**
- nombre (obligatorio);
- NIT;
- dirección y ciudad;
- email y teléfono;
- representante legal: nombre e identificación.

**Contratista:** un interruptor «Este contrato se ejecuta como Consorcio o Unión Temporal».

**Contrato:**
- tipo de contrato, en tres grupos:
  - Contratos de Obra: Precio Global, Precios Unitarios, Administración Delegada, Llave en Mano;
  - Consultoría de Obra: Estudios y Diseños, Interventoría o Supervisión Técnica, Gerencia de Proyectos, Asesoría Técnica Especializada;
  - Otros: Mano de Obra, Todo Costo, Subcontrato, Alquiler, Otro;
- número de contrato;
- % de retención en garantía;
- fecha de inicio y fecha de fin;
- duración en días;
- objeto del contrato.

**Impuestos y retenciones:**
- Los conceptos salen de un catálogo. Sugiere Retefuente (servicios de construcción) 2,00 % y ReteIVA 15,00 %.
- ReteICA se sugiere solo si el proyecto tiene municipio y CIIU.
- Bases gravables:
  - Costo Directo;
  - Gravable AIU = Costo Directo − Descuentos No Facturables;
  - Gravable Corte.

**Otros apartados:**
- Documentos: actas, minutas, otrosíes (se arrastran archivos).
- Pólizas: coberturas vigentes, con «+ Agregar».

## Presupuesto y Avances
Tiene tres subpestañas: Presupuestos, Avances de Contrato y Consolidado.

### Presupuestos
**Lista:** nombre, versión (v1…), fecha, valor del contrato, estado (Borrador → Aprobado) y adjuntos.

**Cómo se crea:**
- en blanco;
- «Importar con IA» desde Excel, PDF o CSV;
- «Importar de Revit (BIM)».

**Detalle:** pestañas Actividades, Insumos e Info.
- **Capítulos:** tienen código («01») y nombre. Pueden anidarse («Capítulo raíz»).
- **Actividades:** código automático por capítulo (01.001), categoría (código del APU, p. ej. APU-0001), actividad, unidad, cantidad, precio unitario y total.
  - Se agregan desde un catálogo de APU, o con «Crear nueva actividad».
  - Al crearla pregunta si va al «catálogo global de la empresa» o «solo para este presupuesto».
- **APU (Análisis de Precio Unitario):**
  - nombre, código opcional, descripción, unidad (bto, día, gal, gl, hr, jgo, kg, kg-km, km, m3…) y familia;
  - tipo «Por insumos» (composición con Mano de Obra, Material, Equipo, Herramienta, Todo Costo, Alquiler, Subcontrato, Transporte, Servicio) o «Costo manual».
- **Resumen:**
  - (+) Costo Directo;
  - Base AIU, en modo AIU o IVA Pleno: Administración %, Imprevistos %, Utilidad %, IVA sobre Utilidad 19 %;
  - (+) Otros Ingresos;
  - **Valor de Contrato**.
- Memorias de cálculo y soportes (adjuntos).
- En borrador «los precios se actualizan desde el catálogo». Aprobado = «Presupuesto vigente del proyecto».

### Avances de Contrato (cortes de obra)
- Exigen un presupuesto aprobado.
- Sin contrato activo, avisa que no se descuentan anticipo ni retención.
- **Lista:** contratante, descripción, fecha, valor bruto, retención en garantía, amortización de anticipo, valor neto y estado.
- **Nuevo avance:** fecha y nombre («prueba - Avance No. 01 (19-10-26)»). El periodo va del corte anterior a la fecha.
- **Tabla por actividad:** código, categoría, actividad, unidad, precio unitario, cantidad contratada, ejecutado anterior, **este avance** (editable), ejecutado total, total y % de avance. El capítulo suma y muestra su porcentaje.
- **Resumen del corte:**
  - (+) Costo directo del avance;
  - (−) Descuentos no facturables;
  - Base AIU;
  - **Valor bruto a facturar**;
  - (−) Descuentos contractuales: retención en garantía (según contrato) y amortización de anticipo;
  - **Valor neto a cobrar**.
- Lleva memorias de cálculo y soportes. Pasa de Borrador a «Aprobar Avance».

### Consolidado
No se revisó en detalle. Es el resumen de los cortes contra el presupuesto.

## Cronograma
«CPM con ruta crítica y holguras, línea base, dependencias FS/FF/SS/SF con lag, y flujo de caja según la forma de carga del costo». Tiene tres subpestañas: Gantt, Flujo de caja y Valor ganado.

### Gantt
- Se genera solo desde el presupuesto aprobado: cada actividad del presupuesto es una tarea con su costo.
- También hay «Programar con IA» y «Línea base».
- Fecha de inicio de obra editable.
- **Cifras:** duración (días), fin, presupuesto y número de actividades críticas.
- **Planeación:** actividad, duración, inicio, fin, predecesoras, presupuesto, holgura y carga (forma de distribuir el costo).
  - Barras en rojo para la ruta crítica (holgura 0) y en azul las que tienen holgura.
  - Escala Día, Semana, Mes o Trimestre, con una marca de «Hoy».
- **Seguimiento:** % de avance, inicio real, fin real y desviación, con la barra de avance real.

### Flujo de caja
- **Planeado:** costo por periodo (Día, Semana o Mes) por capítulo y actividad; egreso del periodo y acumulado (curva S = PV).
- **Caja neta (cobro contra obra):**
  - condiciones de cobro: anticipo %, retención % y plazo de pago (días);
  - el egreso sale del costo directo y el ingreso de la venta (costo + AIU);
  - resultados: necesidad de financiación (la mayor caja acumulada negativa), anticipo, retención en garantía y caja al cierre.

### Valor ganado (EVM)
- PV, EV y AC contra los avances.
- Sin datos en la prueba, porque el avance estaba sin aprobar.

## Lo que esto implica para PreOperaOCC
- Hoy no hay presupuesto por obra: el catálogo es fijo (`src/shared/catalogos/presupuesto.json`, 31 ítems, sin cantidad contratada ni precio).
- Las actividades de la bitácora ya guardan `item`, `unidad` y `cantidad`. Su suma por periodo puede proponer «Este avance» en cada corte, que es la ventaja frente a NexusObras.
