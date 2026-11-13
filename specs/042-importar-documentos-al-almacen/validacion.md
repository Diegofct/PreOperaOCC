# Validación — Spec 042, Importar documentos al Almacén con IA

> Fecha: 2026-11-13 · Tarea T23 · Base: desarrollo (`neondb`), obra `PRUEBA-043 Magdalena`, con la IA real.

## Comandos, ejecutados de verdad

```
$ npm run verificar
911 verificaciones correctas.
(salida 0; 47 pruebas «042/», y todas las de las specs anteriores siguen en verde)

$ npm run typecheck
> tsc --noEmit && tsc --noEmit -p tsconfig.scripts.json
(salida 0, sin errores)

$ npm run lint
> expo lint
(salida 0, sin avisos)
```

Fugas (T21): `npx expo export --platform web` termina; `grep -rlE "DATABASE_URL|ANTHROPIC_API_KEY|R2_LLAVE_SECRETA|SECRETO_TOKENS" dist/client`
sale vacío; `dist` borrado. La migración `0044` está presente y aplicada **solo en desarrollo**.

## Requisito por requisito

98 RF. 62 tienen al menos una prueba automática «042/» en `scripts/verificar-reglas.ts`. Los otros 36 se
comprobaron contra el servidor, en el navegador o en el código, en la tarea que se cita, con el resultado
anotado en las notas de ejecución de `tareas.md`. Dos de ellos solo por revisión de código, porque no se
pueden provocar en vivo sin trucos: RF-67 (lectura cortada por largo) y RF-93 (ningún enlace público).
Ninguno queda sin cubrir.

| RF | Requisito | Qué lo cubre | Resultado |
| --- | --- | --- | --- |
| RF-1 | EL SISTEMA permite importar un documento al Almacén de una obra únicamente a quien tiene acceso de Almacenis… | 1 prueba «042/» · Tareas T1, T12, T17 | verde |
| RF-2 | SI quien intenta importar tiene cualquier otro acceso, Residente incluido, ENTONCES EL SISTEMA lo rechaza (D… | 1 prueba «042/» · Tareas T1, T12 | verde |
| RF-3 | EL SISTEMA acepta documentos en PDF, en Excel (.xlsx), en Word (.docx) y en foto (JPG o PNG). | 1 prueba «042/» · Tareas T10, T12, T17 | verde |
| RF-4 | SI el archivo es un Excel o un Word del formato antiguo (.xls, .doc), ENTONCES EL SISTEMA lo rechaza explica… | 1 prueba «042/» · Tareas T10, T12 | verde |
| RF-5 | SI el contenido del archivo no corresponde al formato que dice su nombre, ENTONCES EL SISTEMA lo rechaza exp… | 1 prueba «042/» · Tareas T10, T12 | verde |
| RF-6 | SI el archivo pesa más de 20 MB, ENTONCES EL SISTEMA lo rechaza diciendo el límite. | 1 prueba «042/» · Tareas T10, T12 | verde |
| RF-59 | SI el documento tiene más de 10 páginas, ENTONCES EL SISTEMA lo rechaza pidiendo partirlo (D13). | 2 pruebas «042/» · Tareas T6, T12 | verde |
| RF-60 | SI el Excel tiene más de 200 renglones con datos, ENTONCES EL SISTEMA lo rechaza pidiendo partirlo (D13). | 1 prueba «042/» · Tareas T6, T12 | verde |
| RF-61 | SI el PDF está protegido con contraseña, ENTONCES EL SISTEMA lo rechaza explicando el motivo (D27). | 1 prueba «042/» · Tareas T10, T12 | verde |
| RF-62 | DONDE el PDF sea un escaneo sin texto, EL SISTEMA lo lee como una foto (D27). | T23: un PDF que es solo una imagen (sin texto) se leyó en 15 s, con proveedor, número, fecha y tres renglones. | verde |
| RF-63 | SI el módulo Almacén no está activo en la obra, ENTONCES EL SISTEMA no deja importar (D25). | T12: PRUEBA-016, con el Almacén apagado → 404 «No existe el Almacén de esa obra». | verde |
| RF-7 | CUANDO se sube un documento aceptado, EL SISTEMA lo lee con IA y propone los ingresos que trae. | T11 (IA real, 9,2 s) · T12 (202 y `lista`) · T22 (PDF, Excel, Word y foto) · T23 (PDF escaneado). | verde |
| RF-8 | MIENTRAS la lectura está en curso, EL SISTEMA muestra que se está leyendo el documento y el tiempo que lleva. | T17: «Leyendo… 0:19» con el contador, en Chrome. | verde |
| RF-64 | CUANDO quien importa cierra la página mientras se lee, EL SISTEMA sigue leyendo el documento (D15). | T17: se recargó la página mientras se leía y la encontró en curso, y luego `lista`. | verde |
| RF-65 | CUANDO quien importó vuelve al Almacén de esa obra, EL SISTEMA le muestra sus propuestas pendientes para rev… | T13 (solo las de quien pregunta) · T17 (lista de pendientes al volver) · T23 (la del Director de Obra no le sale a la Almacenista). | verde |
| RF-98 | EL SISTEMA permite tener varias propuestas pendientes a la vez en una misma obra (D32). | T13 y T17: dos y luego cuatro pendientes a la vez en PRUEBA-043 (T23). | verde |
| RF-66 | SI una propuesta lleva un día sin confirmarse, ENTONCES EL SISTEMA la descarta (D15). | T13: con la fecha adelantada en la base, la `lista` queda `descartada` al listar. | verde |
| RF-9 | SI la lectura falla o no encuentra ningún material, ENTONCES EL SISTEMA no propone nada y explica el motivo. | 1 prueba «042/» · Tareas T7, T12 | verde |
| RF-67 | SI la lectura de la IA queda cortada antes de terminar el documento, ENTONCES EL SISTEMA no propone nada y e… | Revisión del código: `llamarConEsquema` devuelve el fallo `muyLargo` de `con-ia.ts` cuando la IA corta por largo, sin propuesta; el tope de tiempo da «Se pasó del tiempo…» (T13). No se provocó en vivo. | verde |
| RF-68 | SI el documento trae más de un proveedor o más de un número de documento, ENTONCES EL SISTEMA no propone nad… | 2 pruebas «042/» · Tareas T7, T12, T22 | verde |
| RF-10 | EL SISTEMA propone, por cada renglón del documento que es un material recibido, el material, la cantidad y l… | 1 prueba «042/» · Tareas T7, T11, T18, T22 | verde |
| RF-11 | EL SISTEMA propone, para todo el documento, el proveedor, el tipo de documento (factura, remisión u otro), s… | 1 prueba «042/» · Tareas T7, T11, T18, T22 | verde |
| RF-12 | EL SISTEMA propone, por cada renglón, el valor unitario tal como lo indica el documento, sin quitarle ni sum… | T22: la factura trae $ 32.500 sin IVA y así se propone; el IVA queda fuera, aparte. | verde |
| RF-69 | DONDE el documento traiga solo el valor total de un renglón, EL SISTEMA propone el valor unitario dividiendo… | 1 prueba «042/» · Tareas T7, T19 | verde |
| RF-70 | EL SISTEMA marca «Calculado del total» un valor unitario propuesto así (D10). | 1 prueba «042/» · Tareas T7, T19 | verde |
| RF-71 | SI el valor del documento está en una moneda distinta del peso, ENTONCES EL SISTEMA deja el valor unitario v… | 1 prueba «042/» · Tareas T7, T19 | verde |
| RF-13 | EL SISTEMA propone «Entregado por» con el nombre que el documento traiga de quien entregó. | 2 pruebas «042/» · Tareas T7, T11, T18, T22 | verde |
| RF-72 | SI el documento trae conductor y transportador, ENTONCES EL SISTEMA propone al conductor como «Entregado por… | 2 pruebas «042/» · Tareas T7, T19 | verde |
| RF-14 | SI el documento no trae quién entregó, ENTONCES EL SISTEMA deja «Entregado por» vacío para que lo escriba qu… | 1 prueba «042/» · Tareas T7, T11, T18, T22 | verde |
| RF-15 | EL SISTEMA cita, en cada renglón propuesto, de dónde salió: la página en un PDF o una foto, la hoja y la fil… | 2 pruebas «042/» · Tareas T6, T11, T18, T22 | verde |
| RF-16 | SI en un Excel o un Word la cantidad o el valor propuesto no está en la fila o el párrafo que cita, ENTONCES… | 3 pruebas «042/» · Tareas T7, T11, T19, T22 | verde |
| RF-17 | EL SISTEMA no propone como ingreso lo que no es material recibido: totales, impuestos, fletes, descuentos, e… | 2 pruebas «042/» · Tareas T7, T11, T19, T22 | verde |
| RF-73 | EL SISTEMA lista aparte los renglones del documento que dejó por fuera, con el motivo (D20). | 1 prueba «042/» · Tareas T7, T19 | verde |
| RF-74 | SI un renglón trae una cantidad negativa, ENTONCES EL SISTEMA no lo propone como ingreso y lo lista aparte e… | 2 pruebas «042/» · Tareas T7, T19 | verde |
| RF-75 | SI el documento dice ir a otra obra, ENTONCES EL SISTEMA lo avisa sin impedir la confirmación (D26). | 1 prueba «042/» · Tareas T7, T19 | verde |
| RF-18 | MIENTRAS no se confirme, EL SISTEMA no registra nada en el Almacén. | T14: con faltas, repetido sin aceptar, material de baja o nombre repetido, ni ingresos ni materiales; T19: el stock solo cambió al confirmar. | verde |
| RF-19 | EL SISTEMA propone para cada renglón el material vigente del almacén de la obra que la IA considera el mismo… | 1 prueba «042/» · Tareas T6, T18 | verde |
| RF-76 | EL SISTEMA muestra en cada renglón el nombre del material tal como lo trae el documento, junto al material p… | T18: la columna «Del documento» con el nombre y la cita, al lado del material propuesto. | verde |
| RF-20 | CUANDO la IA no encuentra el material entre los vigentes de la obra, EL SISTEMA propone crearlo con un nombr… | 2 pruebas «042/» · Tareas T6, T18 | verde |
| RF-21 | EL SISTEMA permite cambiar el material de cada renglón por otro vigente de la obra, por uno nuevo de la list… | T18: la varilla pasó a «Varilla 5/8» de la lista de OCC; vigentes y «Otro» en el mismo selector. | verde |
| RF-22 | EL SISTEMA no propone ni deja escoger un material dado de baja. | 2 pruebas «042/» · Tareas T6, T18 | verde |
| RF-23 | EL SISTEMA pide la unidad de un material nuevo de la lista cerrada del Almacén (spec 009, RF-31). | 1 prueba «042/» · Tareas T18 | verde |
| RF-77 | SI la unidad del documento no está en la lista cerrada, ENTONCES EL SISTEMA deja la unidad de un material nu… | 1 prueba «042/» · Tareas T7, T18 | verde |
| RF-78 | EL SISTEMA permite al Director de Obra crear materiales nuevos únicamente al confirmar un documento importad… | 1 prueba «042/» · Tareas T1 | verde |
| RF-79 | EL SISTEMA trata como la misma unidad las formas comunes de escribirla, como «kg», «KG», «kilos» y «kilogram… | 1 prueba «042/» · Tareas T3 | verde |
| RF-24 | SI la unidad del renglón no es la del material del Almacén, ENTONCES EL SISTEMA marca el renglón «Unidad dis… | 3 pruebas «042/» · Tareas T3, T18 | verde |
| RF-25 | DONDE el documento diga cuánto trae cada unidad (por ejemplo, «bulto x 50 kg»), EL SISTEMA propone la cantid… | 2 pruebas «042/» · Tareas T3, T18, T22 | verde |
| RF-80 | DONDE la conversión no dependa del documento (por ejemplo, de toneladas a kilogramos), EL SISTEMA propone la… | 1 prueba «042/» · Tareas T3 | verde |
| RF-26 | EL SISTEMA muestra junto a una cantidad convertida de dónde sale la conversión: el texto del documento o la… | 2 pruebas «042/» · Tareas T3, T18 | verde |
| RF-27 | SI no hay cómo convertir, ENTONCES EL SISTEMA deja la cantidad sin proponer para que la escriba quien import… | 1 prueba «042/» · Tareas T3, T18 | verde |
| RF-29 | CUANDO se convierte la cantidad de un renglón, EL SISTEMA guarda el valor unitario como lo trae el documento… | 1 prueba «042/» · Tareas T3, T18 | verde |
| RF-58 | EL SISTEMA muestra el valor unitario con su unidad («$30.000 por bulto»). | 1 prueba «042/» · Tareas T18, T20 | verde |
| RF-30 | EL SISTEMA permite corregir, antes de confirmar, la cantidad, el factor de conversión, el valor unitario, el… | 2 pruebas «042/» · Tareas T5, T18 | verde |
| RF-31 | EL SISTEMA permite quitar un renglón de la propuesta antes de confirmar. | 1 prueba «042/» · Tareas T5, T18 | verde |
| RF-32 | EL SISTEMA propone como fecha de los ingresos la fecha del documento. | 1 prueba «042/» · Tareas T5, T7, T18 | verde |
| RF-33 | SI el documento no trae fecha, ENTONCES EL SISTEMA propone la fecha de hoy según la fecha de Colombia (D22). | 1 prueba «042/» · Tareas T5, T7, T18 | verde |
| RF-34 | SI la fecha de los ingresos es posterior a hoy según la fecha de Colombia, ENTONCES EL SISTEMA rechaza la co… | 1 prueba «042/» · Tareas T5, T14, T19 | verde |
| RF-81 | EL SISTEMA exige para confirmar, en cada renglón, el material, la cantidad y la fecha (D9). | 1 prueba «042/» · Tareas T5, T14, T19 | verde |
| RF-82 | EL SISTEMA permite confirmar sin proveedor, sin número de documento o sin valor unitario (D9). | 1 prueba «042/» · Tareas T5, T14, T19 | verde |
| RF-35 | SI la cantidad de un renglón no es mayor que cero, ENTONCES EL SISTEMA rechaza la confirmación señalando el… | 1 prueba «042/» · Tareas T5, T14, T19 | verde |
| RF-36 | SI falta «Entregado por», ENTONCES EL SISTEMA rechaza la confirmación diciendo que falta (spec 009, RF-42). | 1 prueba «042/» · Tareas T5, T14, T19 | verde |
| RF-37 | SI un renglón no tiene cantidad, ENTONCES EL SISTEMA no deja confirmar hasta que se escriba o se quite el re… | 2 pruebas «042/» · Tareas T4, T14, T19 | verde |
| RF-28 | SI un renglón marcado «Unidad distinta» no tiene la cantidad convertida, ENTONCES EL SISTEMA no deja confirm… | 1 prueba «042/» · Tareas T4, T19 | verde |
| RF-83 | SI un renglón quedó marcado para revisar por RF-16, ENTONCES EL SISTEMA no deja confirmar hasta que se corri… | 1 prueba «042/» · Tareas T4, T14, T19 | verde |
| RF-84 | SI un renglón no tiene material escogido, ENTONCES EL SISTEMA no deja confirmar señalando el renglón (D12). | 2 pruebas «042/» · Tareas T4, T14, T19 | verde |
| RF-85 | EL SISTEMA deja confirmar un renglón con la marca «Unidad distinta» ya convertido o con la marca «Calculado… | 2 pruebas «042/» · Tareas T4, T14, T19 | verde |
| RF-38 | CUANDO se confirma, EL SISTEMA registra un ingreso por cada renglón, con su fecha, su material, su cantidad,… | 2 pruebas «042/» · Tareas T5, T8, T14 | verde |
| RF-39 | CUANDO se confirma con materiales nuevos, EL SISTEMA los crea en el almacén de la obra en la misma confirmac… | 2 pruebas «042/» · Tareas T14 | verde |
| RF-40 | SI cualquier renglón no se puede registrar, ENTONCES EL SISTEMA no registra ninguno y dice cuál falló y por… | 1 prueba «042/» · Tareas T14 | verde |
| RF-41 | SI al confirmar un material nuevo tiene el mismo nombre que otro vigente de la obra, ENTONCES EL SISTEMA rec… | T14: un nuevo «cemento GRIS» → 409 «Ya hay un material «Cemento gris»…», sin registrar nada. | verde |
| RF-86 | SI al confirmar un material propuesto ya está dado de baja, ENTONCES EL SISTEMA rechaza la confirmación nomb… | T14: un material dado de baja entre medias → 409 nombrándolo, sin registrar nada. | verde |
| RF-42 | EL SISTEMA registra quién importó el documento. | T14: el 409 dice «lo confirmó Prueba 044 almacenista»; T15/T20: el historial dice quién registró. | verde |
| RF-87 | EL SISTEMA registra cuándo se confirmó el documento (D30). | T14 y T19: el 409 dice cuándo entró («el 13 de nov, 11:36 a. m.»). | verde |
| RF-88 | EL SISTEMA confirma cada propuesta una sola vez (D16). | T14: dos confirmaciones simultáneas, una 200 y otra 409, y solo 3 ingresos. | verde |
| RF-89 | SI se intenta confirmar una propuesta ya confirmada, ENTONCES EL SISTEMA lo rechaza diciendo cuándo entró y… | T14 y T19: «Este documento ya entró al Almacén el …, lo confirmó …», sin registrar nada. | verde |
| RF-43 | SI ya hay ingresos vigentes en la obra con el mismo proveedor y el mismo número de documento, ENTONCES EL SI… | 1 prueba «042/» · Tareas T2, T13, T14, T19 | verde |
| RF-44 | MIENTRAS haya ese aviso, EL SISTEMA exige confirmar que se importa de todas formas. | T14: sin aceptar → 409 con el repetido; T19: en Chrome, «Confirmar» apagado hasta marcar la casilla. | verde |
| RF-45 | EL SISTEMA compara el proveedor y el número sin distinguir mayúsculas, tildes, espacios ni guiones. | 1 prueba «042/» · Tareas T2, T14 | verde |
| RF-90 | SI falta el proveedor o el número del documento, ENTONCES EL SISTEMA dice que no se pudo revisar si el docum… | 1 prueba «042/» · Tareas T2, T14, T19 | verde |
| RF-91 | EL SISTEMA no cuenta como ya importado un documento cuyos ingresos están todos anulados (D23). | 1 prueba «042/» · Tareas T2, T14 | verde |
| RF-46 | CUANDO se confirma, EL SISTEMA deja el documento original junto a los ingresos que salieron de él. | T15 y T20: «Ver documento» en cada ingreso del documento; T23: el Excel original baja desde el historial. | verde |
| RF-47 | EL SISTEMA permite descargar el documento original desde cualquiera de sus ingresos a quien puede consultar… | T15: el original baja idéntico (misma huella SHA-256) para Almacenista y Residente; T20: el botón lo abre. | verde |
| RF-92 | EL SISTEMA entrega el documento original únicamente desde el panel, con sesión, y solo de obras al alcance d… | T15: sin sesión 401; de una obra fuera del alcance, 404; solo por `/api/panel/media/:id`. | verde |
| RF-93 | EL SISTEMA no ofrece ningún enlace público al documento original (D29). | Revisión del código: ninguna URL firmada ni pública en `almacen-obra` ni en sus rutas; el bucket es privado (T15). | verde |
| RF-94 | EL SISTEMA conserva el documento desde que se sube, marcado como sin confirmar (D18). | T12: la fila nace `en_curso` y el archivo queda en `media` con dueño `almacen` desde la subida. | verde |
| RF-48 | SI la propuesta se descarta o vence sin confirmar, ENTONCES EL SISTEMA marca el documento como descartado, s… | T13: descartada y vencida quedan `descartada`; el archivo (`media` y su clave en R2) sigue igual. | verde |
| RF-95 | EL SISTEMA no muestra en el Almacén un documento descartado (D18). | T13 y T15: el original de una descartada → 404; las descartadas no salen en la lista. | verde |
| RF-49 | EL SISTEMA muestra en el historial de movimientos de cada material el proveedor, el tipo y el número del doc… | T15 (servidor) · T20 (pantalla, con el Residente) · T23 (REM-1123, «98000 por m3»). | verde |
| RF-50 | EL SISTEMA muestra el valor unitario a todos los que pueden consultar el Almacén de la obra, Residente inclu… | T20 y T23: el Residente ve el valor unitario y el proveedor. | verde |
| RF-51 | EL SISTEMA incluye en la hoja Movimientos del Excel del Almacén (spec 009, RF-46) el proveedor, el tipo y el… | 1 prueba «042/» · Tareas T16 | verde |
| RF-52 | EL SISTEMA muestra sin esos datos, y sin error, los ingresos registrados a mano o por WhatsApp. | 1 prueba «042/» · Tareas T15, T16, T20 | verde |
| RF-53 | EL SISTEMA calcula el stock con los ingresos importados igual que con los demás (spec 009, RF-18). | T14, T19 y T23: el stock sube exactamente lo confirmado (20.010 → 21.285 kg); T21: lo anulado deja de contar. | verde |
| RF-54 | EL SISTEMA permite anular un ingreso importado igual que cualquier otro ingreso (spec 009). | T21: el Director de Obra anula un alambre importado por la ruta de la 009 (200). | verde |
| RF-96 | CUANDO se anula un ingreso importado, EL SISTEMA no anula los demás del mismo documento (D30). | T21: anulado el alambre, el cemento y la varilla de la misma confirmación siguen vigentes. | verde |
| RF-55 | EL SISTEMA no permite editar un ingreso importado después de confirmarlo. | T21: `PATCH`, `PUT` y `DELETE` sobre un movimiento → 404; `PATCH …/anular` → 405. | verde |
| RF-97 | SI hay que corregir un ingreso importado, ENTONCES EL SISTEMA lo exige anulando con motivo y registrando otr… | T21: no hay ruta para editar; la única corrección es anular con motivo (009) y registrar otro. | verde |
| RF-56 | EL SISTEMA no deja importar a un almacén de una obra que no está al alcance de quien importa. | T12: un Director de Obra en una obra que no es suya → 404. | verde |
| RF-57 | EL SISTEMA no cambia los ingresos ni las salidas registrados antes de esta spec. | T21: la migración 0044 solo añade columnas nulas, sin `UPDATE`; el ingreso a mano de la T15 se ve igual. | verde |

## Demo de la spec

Los seis pasos de los criterios de finalización, contra el panel de desarrollo (puerto 8082), entre la T17 y
esta tarea. Todo en verde.

1. **Almacenista importa una factura en PDF con bultos y un material nuevo, corrige, quita y confirma.**
   En Chrome, sobre la factura FE-2291: el cemento sale «100 bulto → 5.000 kg, bulto x 50 kg»; con el
   factor en 42,5 pasó a 4.250 kg con «Escrito por quien importa»; la varilla se cambió por una de la lista
   de OCC y el alambre se quitó (T18). La confirmación se hizo en la T19, sobre otra propuesta de la misma
   factura: un renglón sin cantidad apagó «Confirmar» y lo nombró; repuesto, «Entraron 3 ingresos» y el
   stock subió justo lo confirmado. La creación de materiales nuevos al confirmar se vio en la T14 (varilla y
   alambre) y hoy (gravilla y arena).
2. **Historial, stock y original.** El Residente ve en el historial «Factura FE-2291 · FERRETERÍA EL
   EJEMPLO S.A.S.», «$ 30.000 por bulto» y «Ver documento», y el original le baja (T20).
3. **La misma factura otra vez**: el aviso con la fecha, quién la confirmó y cuántos ingresos vigentes, con
   la casilla para importarla de todas formas (T19).
4. **Excel, Word y foto de remisión**: leídos en 6,8 s, 10,0 s y 8,2 s, y la factura de 3 páginas en
   12,6 s, con lo que acertó y falló en `ensayo-de-documentos.md` (T22). **Hoy**, la Almacenista confirmó
   en Chrome la remisión en Excel REM-1123: 3 ingresos y 2 materiales nuevos (gravilla 12 m³, arena 8 m³),
   y el cemento de 20.010 a 21.285 kg (30 bultos × 42,5 kg). La devolución, el alquiler y el total se vieron
   en «lo que no entra», con su motivo. La lista mostraba sus cuatro pendientes a la vez.
5. **Director de Obra y Residente.** Hoy el Director de Obra importó un **PDF escaneado sin texto**
   (RF-62): lista en 15 s, con la remisión 3391, proveedor, fecha, conductor y tres renglones. Registrar un
   ingreso a mano le sigue dando 403 (D4). Esa importación no le sale a la Almacenista. El Residente: 403 al
   importar y al listar pendientes, «No puede importar documentos al Almacén: lo hacen la gerencia, el
   almacenista, el director de proyectos y el director de obra.»; en el historial de la gravilla ve
   «CONCRETOS Y AGREGADOS DEL MAGDALENA S.A.S. · remisión REM-1123 · 98000 por m3», y el Excel original le
   baja (200, 7.711 bytes, el tamaño del archivo subido).
6. **Excel del Almacén** con proveedor, tipo, número, valor unitario y «Valor por» en la hoja Movimientos,
   vacíos en lo registrado a mano (T16).

## Alcance

- **No se implementó nada fuera de la spec.** Lo que la spec no nombra es de soporte: la regla común
  `archivos-subidos.ts` (las comprobaciones de bytes del asistente, movidas sin cambiarlas, T10);
  `estado-de-importacion.ts` aparte de la subida, para que consultar el estado no cargue la IA (T13);
  `materialesNuevosDe` (T14); «Volver a cargar la propuesta» (T19).
- **Cambios fuera de los módulos de la 042**, todos anotados en su tarea: `permisos.ts` suma la acción
  `importar` (T1); `asistente/servidor/adjuntos.ts` importa la regla común y exporta `aBase64`, sin cambiar
  lo que hace (T10); `planificacion/servidor/leer-con-ia.ts` deja que `llamarConEsquema` reciba bloques
  además de texto (T11; la 043 y la 044 siguen igual); `media/[id]+api.ts` gana la rama `almacen` (T8, T15);
  el historial, el Excel y `MovimientoDeAlmacenFila` suman los campos del documento (T15, T16, T20);
  `pantalla-almacen.tsx` monta la sección de importar (T17).
- **Lo que la spec deja fuera sigue fuera:** solo ingresos, ninguna salida desde un documento; el Director
  de Obra sigue sin registrar a mano (403, hoy); no se guardan propuestas a medias en el servidor (lo
  corregido vive en la pantalla, T18); se anula un ingreso a la vez; nada de pedidos, cuentas por pagar ni
  costo del inventario (el valor no entra en ningún cálculo, T16); la lectura de WhatsApp no cambió (T21);
  un documento por importación; sin conversión de monedas ni de impuestos (T22); nada en el celular (sin
  cambios en `src/db/local` ni en las rutas del operador).

## Constitución

1. **Local-first:** sin cambios en el celular ni en su base.
2. **La spec manda:** cada tarea partió de sus RF; lo que la spec no decía quedó anotado como decisión en
   su tarea (notas de la T2 a la T19) y lo que necesita a Diego, abajo.
3. **Una regla, un solo sitio:** marcas de cada renglón, faltas para confirmar, conversión, valor con su
   unidad, clave del repetido y lo que se acepta de la IA viven en `shared/rules/`; la pantalla y el
   servidor usan las mismas funciones (T19 lo dice en la cabecera de la pantalla).
4. **Nada se borra:** descartar y vencer son estados; el archivo se conserva (T13); anular es la ruta de
   la 009, con motivo.
5. **Puerta de calidad:** los tres comandos en verde en cada tarea y aquí.
6. **Fronteras duras:** toda ruta nueva abre con `requerirPermiso(…, 'almacen', 'importar')` o la guardia
   de ver el Almacén; la obra se comprueba con el alcance (404 fuera de él, T12); el original solo sale por
   `/api/panel/media/:id`, con sesión; los secretos no llegan al cliente (T21). Solo
   `media/servidor/almacen.ts` sabe que hay R2.
7. **Español y diseño:** código, comentarios y textos en español; la tabla de la revisión cabe en
   `MaxContentWidthPanel` con «Ajustar» a la vista (T18), y el historial no ganó columnas (T20).
8. **Sin dependencias nuevas:** `package.json` sin cambios (`pdf-lib` y `exceljs` ya estaban).

## Observaciones que no impiden cumplir

- **Tres hallazgos del ensayo, con su pregunta para Diego** (`ensayo-de-documentos.md`): el Word dejó
  «Entregado por» vacío aunque decía «Entregó: Carlos Mejía»; lo que se cuenta por pieza sin unidad escrita
  (ladrillo, bloque) obliga a escribir la cantidad a mano; y «Obra: Puerto Berrío» da un aviso falso de otra
  obra porque la comparación mira el nombre de la obra y no su municipio. Hoy el PDF escaneado repitió los
  dos últimos.
- **El ensayo fue con documentos de ejemplo**, por decisión de Diego. Conviene repetirlo con facturas y
  remisiones reales de OCC antes de contar con los tiempos y aciertos.
- **Probado solo por la API o el código, no en pantalla** (T19): el botón «Descartar» de la revisión (la
  ruta, en la T13), corregir en pantalla una cifra marcada «Revisar» (no salió ninguna en el ensayo) y los
  avisos de moneda y de otra obra dentro de la revisión (salieron en la propuesta del Word, T22).
- **Decisiones tomadas dentro de la spec**, anotadas en su tarea: los ceros a la izquierda cuentan en el
  número del documento (T2); un documento sin unidad cuenta como «Unidad distinta» (T4); un documento sin
  renglones no se confirma (T5); escribir la cifra quita la marca «Revisar» (T19).
- **El texto del aviso de destino repite el código de la obra de prueba** («PRUEBA-043 PRUEBA-043
  Magdalena»), porque su nombre ya empieza con el código. En una obra real no pasa.
- **Datos de prueba en desarrollo** (se conservan, como en la 044): en `PRUEBA-043`, el almacén con el
  cemento, la varilla, el alambre (uno anulado), la gravilla y la arena; 12 ingresos de FE-2291 y 3 de
  REM-1123; la Almacenista con 3 importaciones `lista` (factura FV-0458, Word y foto, que vencen el 14-nov
  hacia las 11:54 a. m.) y el Director de Obra con una (el escaneo). Las claves de `prueba-044-alm`,
  `prueba-044-res` y `prueba-044-do` se repusieron para las demos. **Producción no se tocó**: las
  migraciones `0042`, `0043` y `0044` siguen pendientes allá.

## Veredicto

**Cumplida.** Los 98 RF tienen su comprobación en verde, la demo de la spec se completó con Almacenista,
Director de Obra y Residente, los tres comandos están en verde y el control de fugas está limpio.
