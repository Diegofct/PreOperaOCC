# Validación — Spec 031, Contrato y Presupuesto

> Fecha: 2026-10-20 · Fase 7 del flujo SDD (tarea T26)

Recorrido RF por RF. Cada fila dice **con qué se comprobó**:
- un caso de `scripts/verificar-reglas.ts` (los de esta spec llevan «031/», con su línea);
- una prueba en vivo, con la tarea en que se hizo (el detalle está en las notas de `tareas.md`);
- o, cuando se cumple **por construcción**, la razón, dicha así.

Lo que no se ejecutó no se da por verificado.

## Lo que se ejecutó

| Comando | Resultado |
| --- | --- |
| `npm run verificar` | **536 verificaciones correctas** (23 pruebas de la 031: líneas 9838 a 10457) |
| `npm run typecheck` | sin errores (código de salida 0) |
| `npm run lint` | sin hallazgos (código de salida 0) |

Corridos el 2026-10-20 después de la T23, antes del despliegue. La T24 solo cambió el repo de n8n.

**Desarrollo** (`neondb`, obra «Pruebas spec 018 (laboratorio)», código PRUEBA-018):
- **T7:** 14 casos de restricciones en transacciones deshechas: los 9 indebidos se rechazan, los 5 válidos pasan.
- **T8 a T14:** las rutas contra el dev server, con sesiones temporales de Diego (gerencia) y Natalia (residente).
- **T15 a T21 y T23:** en Chrome, con sesiones temporales; 390 px en un iframe.
- **T22:** el POST de integración de WhatsApp con `PRUEBA-031-T22-1` y el día armado.
- **T24:** la IA real en el PC (workflow `Prueba031T24Ids`, inactivo) con `PRUEBA-031-T24-1`.
- Todo lo de prueba se borró al terminar cada tarea. Los PDF de prueba se borraron de R2 (compartido con producción) con un DELETE firmado.

**Producción** (`preoperaocc`, T25, 2026-10-20): ver la sección al final.

## RF por RF

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-1 | «031/RF-1 a RF-3» (9838): grupo «Cliente» en el menú. T6: «CLIENTE › Contrato y Presupuesto» en Chrome | verde |
| RF-2 | 9838: gerencia y residente ven el módulo; los demás roles no. T14: el almacenista no recibe avisos de pólizas | verde |
| RF-3 | 9838: `aprobar` solo para gerencia. T8: la residente → 403 al aprobar y al volver a borrador. T12: aprobar presupuesto como residente → 403. T15/T19: los botones solo para gerencia | verde |
| RF-4 | T8 y T10: la residente no ve ni guarda lo de otra obra (404). T15: Natalia ve su obra sin selector | verde |
| RF-5 | T15/T17: pestañas «Contrato» y «Presupuesto», la elegida en la dirección | verde |
| RF-6 | Por construcción: `contrato_eventos` (quién, cuándo, acción, motivo) y `creado_por`, `actualizado_por`, `aprobado_por`, `anulada_por` en presupuestos, pólizas y documentos. T15: el historial del contrato con el motivo de volver a borrador | verde |
| RF-7 | Índice único por obra en `contratos` (T7). T8: la versión 0 crea con `on conflict do nothing`. T15: Borrador → Aprobado | verde |
| RF-8 | T15: sección Contratante guardada y leída | verde |
| RF-9 | T15: tipo de contratista consorcio | verde |
| RF-10 | T15: consorcio con nombre y dos integrantes con NIT y porcentaje | verde |
| RF-11 | «031/RF-11, RF-17» (9923). T15: con 99 % → «suman 99 %»; con 100 % se aprueba | verde |
| RF-12 | T15: sección Contrato y condiciones (tipo desde el buscador, número, fechas, valor, anticipo…) | verde |
| RF-13 | «031/RF-13» (9893). T15: del 1 al 31-oct → «30 días» | verde |
| RF-14 | «031/RF-14, RF-22» (9902). Restricción de fechas en orden (T7) | verde |
| RF-15 | T8: `leerContrato` trae el valor del presupuesto vigente; T15: se propone en el formulario | verde |
| RF-16 | «031/RF-16, RF-70» (9954). T15: aviso de diferencia que no impide guardar ni aprobar | verde |
| RF-17 | 9923. T8: aprobar con faltas → 400 con la lista | verde |
| RF-18 | T8: editar un aprobado → 409. T15: aprobado en solo lectura | verde |
| RF-19 | T8: sin motivo → 400; con motivo vuelve a borrador. T15: ventana con motivo y el motivo en el historial | verde |
| RF-20 | T16: Retefuente, ReteIVA, ReteICA y Estampillas con base y porcentaje, guardados con el contrato | verde |
| RF-21 | T16: «Agregar los de uso común» → Retefuente 2 % corte, ReteIVA 15 % IVA, ReteICA y Estampillas sin %; solo agrega los que faltan | verde |
| RF-22 | 9902. Restricción 0–100 (T7). T16: «0,7» se acepta | verde |
| RF-23 | T9 y T16: póliza de cumplimiento con aseguradora, número, valor, vigencia y PDF | verde |
| RF-24 | «031/RF-24» (9980). T16: «Por vencer · Vence en 20 días» | verde |
| RF-25 | «031/RF-25, RF-26» (9992). T14: gerencia ve dos avisos en orden; la residente, solo los de su obra. T21: el aviso en Inicio con su enlace | verde |
| RF-26 | 9992: solo avisan las activas. T9/T16: reemplazar y anular con motivo; no hay ruta de borrar | verde |
| RF-27 | T9/T16: acta de inicio subida con clase, fecha y archivo | verde |
| RF-28 | T9: lista del más reciente al más antiguo; T16: «Abrir» → 200 `application/pdf` | verde |
| RF-29 | T9/T16: anulado con motivo, sigue en la lista marcado «Anulado» con quién | verde |
| RF-30 | «031/RF-30» (9967). T9: .docx → 415; 21 MB → 413 | verde |
| RF-31 | T10/T17: la tabla de versiones con versión, nombre, nota, estado, valor y fecha | verde |
| RF-32 | «031/RF-41 a RF-43» (10390): 2 grupos, 14 capítulos, 76 ítems. T17: cada vía con sus capítulos e ítems | verde |
| RF-33 | Por construcción: un grupo sin nombre muestra sus capítulos directos (`pestana-presupuesto.tsx`, comentario RF-33). El formulario de OCC siempre trae vías, así que no se ejercitó en vivo | verde, por construcción |
| RF-34 | «031/RF-34» (10140): las unidades del formulario como las de la bitácora. T17: ítems con unidad, cantidad, unitario y total | verde |
| RF-35 | «031/RF-35, RF-69» (10058). T10: un total enviado en 999 sale recalculado | verde |
| RF-36 | «031/RF-36 a RF-40» (10069). 10390: el 4.1.8 en 4 capítulos | verde |
| RF-37 | 10069. T17: rubros por vía y «de todo el contrato» | verde |
| RF-38 | 10390: AIU 26,23 / 1 / 5. T17: «32,23 %» | verde |
| RF-39 | 10069 y 10390: $49.126.056.823 + $5.315.744.097 = $54.441.800.920 | verde |
| RF-40 | 10069. T17: valor, obras, rubros, AIU y subtotales por capítulo iguales al Excel | verde |
| RF-41 | 10390. T11: vista previa y borrador v1 desde `docs/preupuesto.xlsx` | verde |
| RF-42 | 10390: subtotales y notas no entran; títulos como grupo o capítulo | verde |
| RF-43 | 10390. T17: vista previa 2 / 14 / 76 / 8 y «$ 54.441.800.920 es el mismo VALOR TOTAL» | verde |
| RF-44 | «031/RF-44, RF-45» (10457). T11: creado con `revisar` si no cuadra | verde |
| RF-45 | 10457. T11: un ítem alterado se señala con los dos valores | verde |
| RF-46 | «031/RF-46» (10447). T11: texto → 422; Excel sin formato → 422 «fila de encabezados» | verde |
| RF-47 | «031/RF-47» (10089). T18: editar cantidades, mover un ítem de capítulo, rubros y AIU | verde |
| RF-48 | T10: «en blanco» → v1, después v2. T17: «Crear en blanco» → v1 en $ 0 | verde |
| RF-49 | T12/T19: aprobar → vigente y el anterior → reemplazado, en un `batch` | verde |
| RF-50 | «031/RF-50» (10104). T12: sin ítems → 400 con la lista | verde |
| RF-51 | T10: editar el descartado → 409; T12: nueva versión desde el reemplazado → 409. T19: la v1 en solo lectura | verde |
| RF-52 | «031/RF-52 a RF-54» (10122). T12/T19: copia con los mismos ids y la nota; sin nota → 400 | verde |
| RF-53 | 10122: ids estables; identidad = capítulo + ítem | verde |
| RF-54 | 10122. T12: 409 «reportado 12». T19: ventana con ítem, capítulo, vía y lo reportado, y «Aprobar igual» | verde |
| RF-55 | T12/T19: la v1/v2 abren en solo lectura con «Descargar Excel» | verde |
| RF-56 | T10/T19: descartar con motivo; no hay ruta de borrar | verde |
| RF-57 | Índice parcial único (T7). T10/T12: segundo borrador → 409. T17: importar y en blanco deshabilitados con un borrador | verde |
| RF-58 | «031/RF-58, RF-59» (10180) y «031/RF-58 a RF-63» (10237). T20: obra sin presupuesto → `fijo`, 31 actividades | verde |
| RF-59 | 10180 y «031/RF-59, RF-61» (10206). T20: «ítem · capítulo · vía» con la descripción; «excavacion» sin tilde encuentra 20 | verde |
| RF-60 | 10237. T13: «CONSTRUCCIÓN DE CUNETA · VIA LA YE-YONDO» congelados; T20: guardado con capítulo y unidad del presupuesto | verde |
| RF-61 | 10206. T20: ninguna opción tiene «$» | verde |
| RF-62 | 10237. T13: la actividad vieja intacta. T20: un ítem quitado por una versión posterior se conserva «(ya no está en el presupuesto vigente)» | verde |
| RF-63 | 10237: «otra actividad» sigue. T20: está en las opciones | verde |
| RF-64 | «031/RF-64 a RF-66» (10224) y «031/RF-64 a RF-67» (10338). T22: «alcantarillas vía Ye-Yondo» → Alcantarillas · Ye-Yondo, no Cuneta. T24: la IA devuelve el capítulo escrito | verde |
| RF-65 | 10338: el 2.8 en un solo capítulo se toma sin pista. En el Excel real todos los ítems están en las dos vías, así que en vivo no hay un caso así | verde (solo verificador) |
| RF-66 | 10224 y 10338. T22: el 4.1.8 sin pista → «No se pudo guardar» con los 4 capítulos. T23: se completa eligiendo el capítulo en Chrome | verde |
| RF-67 | 10338: «9.9.9 no está en el presupuesto» | verde |
| RF-68 | «031/RF-68» (10303). T21: «8 de 5.214 · 0,2 %» y el Excel de Actividades con capítulo, vía, acumulado, contratado y % | verde |
| RF-69 | 10058: pesos sin decimales y cantidades con 3 decimales. T10: 42,12345 → 42,123 | verde |
| RF-70 | 9954. T15/T17: «$ 1.000.000», «$ 54.441.800.920» | verde |
| RF-71 | No se paginó ninguna lista del módulo: versiones, pólizas y documentos son pocos por obra, y los ítems se despliegan por capítulo. Si una lista crece se pagina con `usePaginacion` | verde, con observación |
| RF-72 | T15: a 390 px, 23 campos en una columna, ninguno fuera. T17: el presupuesto a 390 px. Las tablas usan `Tabla`, que se desplaza a lo ancho | verde |
| RF-73 | T12: Excel de la v2 con 76 ítems, $54.441.800.920 como número y tildes. T19: el de la v1 → 200 | verde |

## Requisitos no funcionales

| RNF | Qué lo cubre | Resultado |
| --- | --- | --- |
| Vista previa del Excel < 5 s y exactamente $54.441.800.920 | T11: 2,5 s la primera vez; cuadra | verde |
| Presupuesto de 76 ítems editable sin esperas > 1 s | T18: el total y el valor se recalculan al momento al cambiar una cantidad | verde |
| Selector de ítem < 300 ms con 200 ítems, sin tildes | T20: «excavacion» encuentra 20 de 75 al teclear, sin espera visible. No se midió con cronómetro ni con 200 ítems | sin medir |
| Excel descargado con tildes y números | T12: abierto con `exceljs`, tildes bien y valores como `number` | verde |

## Casos límite

- **Evidencia firmada:** contrato aprobado en solo lectura (T15); vigente y reemplazado no se editan (T12); pólizas y documentos se anulan (T16).
- **Primer arranque:** obra sin presupuesto → catálogo fijo (T20); pestañas vacías con «Importar Excel» y «Crear en blanco» (T17).
- **Dos personas a la vez:** T18, con dos pestañas: la segunda recibe «Otra persona cambió el presupuesto…» y no pisa la primera.
- **Ítem que se mueve de capítulo:** no es el mismo (10122); el aviso lo muestra (T19).
- **Excel con otra forma:** los encabezados se buscan por texto (T4); sin ellos, 422 explicado (T11).
- **Bitácora abierta al aprobar el primer presupuesto:** las viejas quedan sin capítulo y se pueden volver a guardar (T13, 10237).

## Demo del flujo principal

Hecha por partes en la obra de pruebas, cada paso en su tarea:
1. Contrato con consorcio de dos integrantes, Retefuente y una póliza que vence en 20 días, con el aviso en Inicio: T15, T16 y T21.
2. Importar `docs/preupuesto.xlsx` → 2 / 14 / 76 / 8 y $54.441.800.920 → aprobar: T17 y T19.
3. En la bitácora, «4.1.8 · CONSTRUCCIÓN DE CUNETA · VIA LA YE-YONDO»: T20.
4. WhatsApp: el ambiguo va a «No se pudo guardar» con los capítulos posibles (T22) y se completa (T23). El de un solo capítulo solo en el verificador, porque el Excel real no lo tiene.
5. Nueva versión, cambio y aprobación → la v1 queda reemplazada: T19.
6. Reportes → Actividades con contratado y %: T21.

## Producción

Pendiente de la T25.

## Pendiente

- Importar el presupuesto real de CONSORCIO MAGDALENA y decidir cuándo aprobarlo (usuario). Hasta entonces la bitácora y WhatsApp siguen con el catálogo fijo.
- RF-71: paginar si alguna lista del módulo pasa de 15.
- RNF del selector: sin medir con cronómetro.
