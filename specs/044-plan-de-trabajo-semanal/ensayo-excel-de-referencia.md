# Ensayo con el Excel de referencia — Spec 044, T25

Fecha: 2026-11-12. Base de desarrollo (`neondb`), obra `PRUEBA-043 Magdalena`, como Director de Proyectos.

El libro es `PLAN DE TRABAJO SEMANAL_META3-6 DE NOVI..xlsx`, el plan de la Directora para la semana del
3 al 6 de noviembre. Esa semana ya pasó y no se puede planear (RF-2), así que las dos cosas se hicieron
en la del **30 de noviembre**: primero la propuesta de la IA, después la lectura del Excel sustituyéndola
(RF-52). Los dos quedaron guardados: la propuesta como `descartado` y el Excel como `borrador`.

| | Propuesta de la IA | Excel leído |
| --- | --- | --- |
| Tiempo | 83 s | 44 s |
| Días | lunes a sábado (6) | lunes a viernes (5): los días con cantidad en el libro |
| Actividades | 14, todas ítems | 12: 10 ítems, 1 «fuera» (38.6) y 1 rubro (PMA/PMT) |
| Personal | 9 cargos, 44 personas | 7 cargos, 49 personas |
| Maquinaria | 14 (2 propias, ambas con su vehículo de la obra) | 13 (10 propias, 3 externas) |
| Materiales | 10 | 11 |
| Control de volquetas | 5 conceptos; 8 requeridas, 2 propias, 6 externas | 3 conceptos; 17 requeridas, 8 propias, 9 externas |
| Riesgos | 4 | 5 |
| Supuestos | sí (5 renglones) | vacío: la hoja «Supuestos» está oculta |
| Requerimientos a gerencia | sí | vacío: en el libro están vacíos |
| Valor de la semana | $147 064 671 | $112 530 261 |
| Cifras descartadas (RF-45) | ninguna | ninguna |

## Lectura del Excel

- **Las seis secciones a la vista se leyeron**: actividades y control de volquetas (hoja «Plan semanal»),
  personal, maquinaria, materiales y riesgos. Los cinco riesgos llegaron con su efecto y su mitigación.
- **El aviso del reparto (RF-48) sale en las once actividades con cantidad.** El libro divide la meta entre
  4 días (el parámetro de su hoja «Supuestos») pero reparte cantidad en 5, así que su meta diaria y su
  total no cuadran con la meta. Por ejemplo, el 13.1 de cunetas: el Excel trae 853,5 por día y 4.267,5 de
  total; con los días del plan, 3.414 entre 5 dan 682,8. Es el error que la spec ya conocía (T3).
- **Cruce con la planificación**: diez actividades cruzaron con su ítem por el renglón del libro. «38.6
  Disposición de material» quedó «Fuera de la planificación», porque 38.6 no es un renglón (T4), y
  «Componentes (PMA, PMT)» como rubro.
- **Lo que no llega, y por qué no es un fallo de lectura:**
  - *Requerimientos.* Las filas 3 a 8 de «Riesgos y requerimientos» están vacías en el propio archivo
    (revisado en el XML del libro). Lo anotado en la T15 era eso, no un problema de `exceljs`.
  - *Supuestos.* La hoja existe pero está **oculta**, y la lectura solo manda las hojas a la vista (plan,
    § Leer Excel, igual que la 043). Además, lo que trae son los parámetros de las fórmulas de la
    Directora (capacidad de volqueta, viajes por día, dosificaciones), no supuestos escritos: si se
    leyera, entraría como texto. **Pregunta para Diego**: ¿se lee también una hoja oculta llamada
    «Supuestos»? Sería un cambio a la spec.
- **El lunes**: el libro reparte en cinco días; puesto en la semana del 30, quedan de lunes a viernes. Con
  la semana original (lunes 2 festivo), el sistema habría marcado el festivo como trabajado, porque el
  libro trae cantidad ese día (RF-20, RF-46), como se vio en la T15.

## Propuesta de la IA frente al Excel

- **Las mismas obras en lo grueso**: transporte y suministro de subbase, estabilización, cunetas
  (excavación, subbase, acero, concreto), dren francés y su transporte de pétreos. En las once actividades
  que comparten (disposición de material incluida), las cantidades de la IA quedan entre un 2,6 % y un 8,5 % por debajo de las del Excel
  (subbase 1.663,8 frente a 1.772; dren 487 frente a 531; acero 2.515 frente a 2.583). No se averiguó
  la causa; la IA parte de la meta estimada de la semana y de lo pendiente de cada ítem.
- **La IA añade lo que la Directora no puso esa semana**: imprimación y tratamiento superficial doble
  (7.1.1 y 7.1.12.2, 2.083 m²) y mantenimiento de drenajes (8.1). La Directora, en cambio, tiene el rubro
  PMA/PMT y no lo propone la IA.
- **Disposición de material**: la IA la puso como ítem sin número de pago; el Excel como «38.6», que queda
  fuera. Las dos describen el mismo ítem no previsto.
- **Días**: la IA planea de lunes a sábado; la Directora, de lunes a viernes.
- **Volquetas**: la diferencia más grande. La Directora pide 17 (8 propias y 9 externas) y la IA 8 (2
  propias y 6 externas). La IA solo cuenta como propias las volquetas registradas en la obra (PRU044 y
  PRB044, las dos de prueba), mientras que la Directora sabe que tiene 8. Con la flota real registrada
  esta diferencia debería achicarse.
- **Supuestos y requerimientos**: la IA los escribe y la Directora no (o no a la vista). Uno de los
  supuestos de la IA dice que «la meta de 3000 m3 de 5.1.7 de la semana anterior se toma como error de
  registro»: es el plan de prueba de la T22, que la IA vio como semana anterior. Bien visto por ella; en
  datos reales no pasaría.
- **Plata**: ni la propuesta ni la lectura traen cifras en pesos en los textos (RF-104).
- **Ninguno de los dos se aprobaría tal cual**: los dos tienen avisos de ítems sin precio de costo (en
  esta planificación de prueba varios ítems no lo tienen) y el Excel, los del reparto.
