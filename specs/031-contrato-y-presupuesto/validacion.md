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

Corridos el 2026-10-20 después de la T23, y otra vez el 2026-10-21 tras el despliegue y el commit `818e1fe`, con el mismo resultado. La T24 solo cambió el repo de n8n.

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

T25, 2026-10-21 (hora UTC). Los comandos los corrió el usuario con `!`, porque el modo automático de Claude Code no deja desplegar:
- **Migración 0028** en `preoperaocc`: 29 migraciones. Existen `contratos`, `contrato_polizas`, `contrato_documentos`, `contrato_eventos` y `presupuestos` (consulta de solo lectura).
- **Imagen** `2b15c4db3d4c` (respaldo `918f3ae6669f`). Healthy; vecino y panel 200; sin sesión, `/api/panel/contrato` → 401. La imagen se subió por partes de 8 MB, porque de una vez se cortaba.
- **Clasificador de n8n** con `capitulo` publicado a las 02:21 UTC; 4 flujos activos. El primer intento falló porque el json no traía `id` (anotado en `DESPLIEGUE_VPS.md`).
- **Presupuesto de prueba:** el usuario creó uno en blanco en CONSORCIO MAGDALENA y lo descartó. Se borró con su permiso (`sql/borrar_presupuesto_prueba_031.sh`, DELETE 1) para que el real quede como v1. La tabla quedó vacía.
- El módulo con sesión no se abrió en producción desde aquí (no hay sesión de producción en el Chrome de Claude). El usuario sí entró: creó y descartó el presupuesto de prueba.

## Veredicto

**La spec 031 está cumplida.**
- RF-1 a RF-73 en verde. RF-33 por construcción y RF-65 solo con el verificador, porque el Excel real no tiene ese caso.
- Está en producción desde el 2026-10-21: migración 0028, imagen `2b15c4db3d4c` y el clasificador con `capitulo`.

## Pendiente

- Importar el presupuesto real de CONSORCIO MAGDALENA y decidir cuándo aprobarlo (usuario). Hasta entonces la bitácora y WhatsApp siguen con el catálogo fijo.
- RF-71: paginar si alguna lista del módulo pasa de 15.
- RNF del selector: sin medir con cronómetro.


## Cambio del 2026-10-21: presupuesto leído con IA (RF-74 a RF-89, T27 a T33)

### Lo que se ejecutó

| Comando | Resultado |
| --- | --- |
| `npm run verificar` | **540 verificaciones correctas**. Cuatro casos nuevos de la 031 (líneas 10490 a 10545), con el libro de planificación real |
| `npm run typecheck` | sin errores (código de salida 0) |
| `npm run lint` | sin hallazgos (código de salida 0) |

**Desarrollo** (`neondb`, obra «Pruebas spec 018 (laboratorio)», sesión de Diego):
- **T30:** la IA real con el libro de planificación. 100 s; 7 / 17 / 68 / 19; $24.225.015.373, que cuadra; 0 rechazados; ≈ US$0,40.
- **T31 y la mejora de diseño:** en Chrome, con el Excel servido un momento desde `public/`. La lectura se repitió una vez para los nombres cortos: 98 s, cuadra, 0 rechazados.
- Los borradores de prueba se borraron. La lectura guardada de desarrollo se deja.

**Producción** (T32): ver más abajo.

### RF por RF

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-74 | 10515: el libro de planificación no lo cuadra el lector (`!ok` o `!cuadra`). T30: `vistaPrevia` → `leidoPor: 'ia'` | verde |
| RF-75 | 10490: dos filas de encabezado sin corte. 10390: `docs/preupuesto.xlsx` sigue saliendo por el lector con 2 / 14 / 76 / 8 / $54.441.800.920 | verde |
| RF-76 | 10515: de 79 hojas solo «PROPUESTA ECONOMICA». 10527: una línea por fila con contenido, sin filas vacías ni «Vista árbol» | verde |
| RF-77 | 10527: 1 501 filas → `null`. `importar.ts`: mensaje de dejar solo la hoja del presupuesto | verde (el mensaje se comprobó por lectura del código, no en pantalla) |
| RF-78 | 10545: grupo «VÍA 90A01 · SITIOS CRÍTICOS». T30: 7 grupos vía · sección | verde, con observación: ver «Señalización» abajo |
| RF-79 | 10545: el IVA en su grupo y las provisiones en todo el contrato. T30: 19 rubros; los subtotales del Excel no se tomaron (el valor cuadra al peso) | verde |
| RF-80 | 10545: el ítem de la fila 17 entra con su cantidad y su valor unitario | verde |
| RF-81 | 10545: cantidad de otra fila, fila inexistente y rubro inventado → «no encontrado en la fila N». T31: el aviso en rojo (por código; con el Excel real no hubo ninguno) | verde |
| RF-82 | T31: «✦ Leído con IA», «Cuadra: …» y el conteo en la vista previa | verde |
| RF-83 | T30: `origen = excel_ia` y `revisar = true` en la base. T31: etiqueta «Excel (IA)» y aviso en el detalle | verde |
| RF-84 | T30 y T31: vista previa + confirmar dejan una sola fila en `presupuesto_lecturas_ia` | verde |
| RF-85 | T30: la 2.ª vista previa tardó 5,5 s sin llamar a la IA. T31: crear la v2 desde la ventana tampoco la llamó | verde |
| RF-86 | T31: «Leyendo con IA… puede tardar un par de minutos» a los 6 s (con la respuesta demorada a propósito, porque la lectura ya estaba guardada) | verde |
| RF-87 | Por construcción: `leer-con-ia.ts` (3 min, sin reintentos, `refusal`/`max_tokens`, errores tipados del SDK) → 503 «No se pudo leer con IA… Puede reintentarlo». T31: el 500 del servidor viejo salió como error y no creó nada | verde, con observación: el fallo de la API no se provocó a propósito |
| RF-88 | 10545: `nombreCompleto` en la estructura y en el resumen. Chrome: nombre corto y frase completa debajo, en la vista previa | verde, con observación: ver «Señalización» abajo |
| RF-89 | Chrome: estado, «Lo que se encontró» (grupos que se abren con capítulos y rubros, más «Rubros de todo el contrato») y «Para revisar: ✓ Nada» | verde |

### Requisitos no funcionales

- **Tiempo de la IA:** 100 s y 98 s con 68 ítems, por debajo de los 3 min.
- **Lo que va a la IA:** 174 filas de una sola hoja, unos 45 500 caracteres.
- **La llave:** está en el `.env` y en el contenedor. En la imagen `715f68ba57ab`, `dist/client` no tiene ni el SDK ni ningún `sk-ant-`; solo el servidor (`dist/server`) usa el SDK.
- **Costo por lectura:** unos 32 000 tokens de entrada y 13 500 de salida, ≈ US$0,40.

### Observación: Señalización

En el Excel de planificación, «SEÑALIZACIÓN Y SEGURIDAD VIAL» es una sección sin capítulos propios. En la 2.ª lectura de desarrollo, la IA dejó esos dos grupos como «VÍA 90A01» y «VÍA 9007A» a secas; las cifras estaban bien. Se añadió una instrucción para que usen el título en el grupo y como capítulo. Se comprueba con la primera lectura de producción, que la hace el usuario.

### Producción (T32, 2026-10-21)

- La llave de Anthropic está en `/opt/preoperaocc/.env`; la puso el usuario sin mostrarla (respaldo `.env.antes-031b`).
- `compose.yaml` con `ANTHROPIC_API_KEY` (respaldo `.antes-031b`).
- Migración 0029: 30 migraciones; `{excel,blanco,copia,excel_ia}`; `presupuesto_lecturas_ia` vacía (consulta de solo lectura).
- Imagen `715f68ba57ab`, con la anterior `2b15c4db3d4c` de respaldo. Healthy; vecino y panel 200; importar sin sesión → 401; la llave está presente en el contenedor.
- Proxy Caddy sin tiempo máximo de respuesta.
- La importación real en producción la hará el usuario con su sesión. El usuario pidió cerrar la T32 sin esperarla.

### Veredicto del cambio

**RF-74 a RF-89 cumplidos y en producción.** Tienen observación RF-78 y RF-88 (la lectura de Señalización, a confirmar en producción) y RF-87 (el fallo de la API no se provocó).

### Pendiente del cambio

- La primera importación real en producción: confirmar el valor, que cuadre y cómo sale Señalización. Falta decidir en qué obra va el contrato del Consorcio Cartagena (vías 90A01 y 9007A).
- Commit en PreOperaOCC de todo el cambio.
