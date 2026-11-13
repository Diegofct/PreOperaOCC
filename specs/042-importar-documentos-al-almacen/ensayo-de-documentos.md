# Ensayo con documentos — spec 042, T22

**Fecha:** 2026-11-13 · **Contra:** el panel de desarrollo (8082, base `neondb`), obra `PRUEBA-043 Magdalena`,
Almacenista `prueba-044-alm`, con la IA real.

**Los documentos son de ejemplo, armados para el ensayo** (Diego lo decidió así el 2026-11-13, en vez de
documentos reales de OCC). Proveedores, números y personas son ficticios. Cada uno trae a propósito los
casos difíciles de la spec, para ver qué acierta la IA y qué atrapan las reglas. Cuando haya documentos
reales de OCC, conviene repetir el ensayo con ellos: una factura de verdad tiene logotipos, sellos,
columnas apretadas y letra pequeña, y estos no.

## Resumen

| Documento | Formato | Lectura | Renglones | Dejados por fuera | Avisos | Veredicto |
| --- | --- | --- | --- | --- | --- | --- |
| Factura FV-0458, Distribuidora Andina | PDF, 3 páginas | **12,6 s** | 5, todos bien | 5, todos bien | ninguno | Bien |
| Remisión REM-1123, Concretos del Magdalena | Excel, una hoja visible y una oculta | **6,8 s** | 3, todos bien | 3, todos bien | ninguno | Bien |
| Relación RN-77, Ferretería del Norte | Word, párrafos y una tabla | **10,0 s** | 4, todos bien | 1 (encabezado) | 2, correctos | Bien, salvo «Entregado por» |
| Remisión 3391, Ladrillera San José | Foto JPG torcida 3,5° y desenfocada | **8,2 s** | 3, cantidades y valores bien | ninguno | 1, **falso** | Regular: dos renglones sin unidad |

El tiempo va de la subida a la propuesta lista, medido en el servidor (`creado_en` contra el vencimiento
menos 24 h). **La factura de tres páginas tardó 12,6 s**, muy por debajo de los 3 minutos que pide la
tarea. Las cuatro se subieron casi a la vez y se leyeron en paralelo.

## 1. Factura en PDF de tres páginas

Lo que trae: cemento en **bultos de 50 kg** (en el Almacén va en kg), varilla, **arena con solo el valor
total** (sin unitario), alambre, tubería PVC (material nuevo), flete, subtotal, descuento, IVA y total
repartidos en tres páginas, y en la última el destino, **el transportador y el conductor**.

Acertó:

- Proveedor, «Factura», FV-0458 y la fecha 11/11/2026 como 2026-11-11.
- **«Entregado por» = el conductor**, Luis Alberto Perez, y no la transportadora (RF-72).
- Cemento: 40 bultos → **2.000 kg** con «bulto x 50 kg», sobre el material existente; el valor sigue
  «$ 32.500 por BULTO», sin convertir (RF-24 a RF-26, RF-29).
- Arena: **$ 90.000 por M3 «Calculado del total»** (540.000 ÷ 6) (RF-69, RF-70); como material nuevo
  en m³.
- Varilla y alambre sobre los existentes; tubería como nueva en unidades.
- Citas por página (p. 1, p. 2) (RF-15).
- **Fuera**: el flete (RF-17, D20), el subtotal, el descuento, el IVA y el total, cada uno con su motivo
  (RF-73).
- Sin aviso de destino: «Obra Magdalena, Puerto Berrio» se reconoce como la obra.

Falló: nada.

## 2. Remisión en Excel

Lo que trae: gravilla y arena en m³, **cemento en bultos de 42,5 kg** (otro factor), **una devolución con
cantidad negativa**, **un alquiler de mezcladora**, el total y **una hoja oculta** con un «Cemento blanco»
que no llegó.

Acertó:

- Proveedor, «Remisión», REM-1123 y la fecha; «Entregado por» = Jorge Ruiz, sin la placa.
- Cemento: 30 bultos → **1.275 kg** con «bulto x 42,5 kg» (RF-25).
- Citas por hoja y fila (H1F8, H1F9…) (RF-15), y ninguna cifra que no estuviera en su fila (RF-16).
- **Fuera**: la devolución, «devolución (cantidad negativa)» (RF-74); el alquiler (RF-17); el total.
- **La hoja oculta no se leyó**: el cemento blanco no aparece.

Falló: nada.

## 3. Relación en Word

Lo que trae: el cemento **dentro de una frase** («100 bultos de cemento gris de 50 kg a $30.000 cada
uno»), una tabla con **pintura cuyo valor está en dólares**, tornillos y malla; destino **«Obra Yondó»**;
al final, «Entregó: Carlos Mejía, auxiliar de despacho».

Acertó:

- Proveedor, «Remisión», RN-77 y «9 de noviembre de 2026» como 2026-11-09.
- El cemento de la frase: **5.000 kg** con el factor que dice la misma frase, y «$ 30.000 por bultos»
  (RF-16: la cifra se buscó dentro del texto de la línea L5).
- **Pintura: valor vacío y el aviso «el valor viene en USD; queda vacío»** (RF-71).
- **Aviso de otra obra** por «Obra Yondó» (RF-75), sin impedir confirmar.
- El encabezado de la tabla, fuera como «encabezado».

Falló:

- **«Entregado por» quedó vacío**, aunque el documento dice «Entregó: Carlos Mejía». No bloquea nada
  que no estuviera previsto: RF-14 deja el campo vacío para que lo escriba quien importa, y la pantalla
  no deja confirmar sin él (RF-36). Pero es un dato que estaba en el documento.

## 4. Foto de una remisión en papel

Lo que trae: imagen JPG de 1.284 × 1.472, torcida 3,5° y desenfocada, con ladrillo y bloque **sin
columna de unidad** (se cuentan por pieza), mortero en bultos de 40 kg, «Obra: Puerto Berrío» y
«Conductor: Andrés Gil».

Acertó:

- Proveedor, «Remisión», 3391, la fecha 12/11/2026 como 2026-11-12 (día/mes, como en Colombia) y
  «Entregado por» = el conductor.
- Las tres cantidades (2.000, 1.500 y 40, con el punto de miles bien leído) y los tres valores (950,
  1.380 y 21.000).

Falló:

- **Ladrillo y bloque quedaron sin unidad**, porque la foto no la escribe. Las reglas hacen lo previsto
  (nota de la T4: sin unidad en el documento cuenta como «Unidad distinta»): como materiales nuevos piden
  la unidad, y al escogerla la cantidad queda vacía hasta escribirla. **Quien importa tiene que escribir
  2.000 y 1.500 a mano**, con los números a la vista en «Del documento». Es seguro, porque no entra nada
  sin revisar, pero es trabajo de más en el caso común de un material que se cuenta por pieza.
- **Aviso falso de otra obra**: «Obra: Puerto Berrío» se marcó como «no parece ser PRUEBA-043…». La
  comparación busca palabras del **nombre** de la obra (nota de la T7) y el nombre de la obra de prueba
  no dice el municipio. En la factura no pasó porque el destino decía «Magdalena». No bloquea (RF-75),
  pero un aviso que sale cuando no debe enseña a no leerlo.
- El mortero se propuso como «Mortero seco», sin «x 40 kg» y en bultos: correcto para un material nuevo,
  pero si el Almacén lo lleva en kg, hay que cambiarlo.

## Lo que se observa del conjunto

- **Las reglas atraparon todo lo que debían**: nada de lo que no es material entró como renglón, la
  devolución quedó fuera, el valor en dólares no se convirtió y las conversiones dicen de dónde salieron.
- **Ninguna lectura tuvo que marcar una cifra para revisar** (RF-16, RF-83): todas las cantidades y
  valores estaban donde la IA dijo. Ese caso queda probado solo con las pruebas de la regla (T7) y no en
  pantalla (nota de la T19).
- **El texto del aviso de destino repite el código**: «PRUEBA-043 PRUEBA-043 Magdalena». Es por la obra
  de prueba, cuyo nombre ya empieza con su código; en una obra real se leería «CM-787 Magdalena» o
  similar. No se corrige.

## Para decidir con Diego

1. **«Entregado por» en el Word**: ¿basta con que quien importa lo escriba (como hoy), o se refuerzan las
   instrucciones a la IA para que busque «Entregó:» al final del documento?
2. **Materiales que se cuentan por pieza sin unidad escrita** (ladrillo, bloque): ¿se propone «Unidad»
   cuando el documento no trae unidad y el material es nuevo, o se deja como hoy, que pide escribir la
   cantidad? Proponer «Unidad» ahorra el paso, pero cambia la decisión de la T4 («sin unidad cuenta como
   distinta»), que existe para no meter 100 kg donde había 100 bultos.
3. **Aviso de destino**: ¿se compara también con el municipio de la obra, si la obra lo tiene registrado,
   para que «Puerto Berrío» no dé un aviso falso?

## Datos que quedan en desarrollo

En `PRUEBA-043`, la Almacenista tiene **cuatro importaciones `lista`** (una por documento), sin
confirmar; vencen solas el 2026-11-14 hacia las 11:54 a. m. Sirven para la demo de la T23. Los cuatro
archivos quedaron en R2 con su importación. Los documentos y los guiones que los arman quedaron en el
directorio temporal de la sesión, no en el repositorio.
