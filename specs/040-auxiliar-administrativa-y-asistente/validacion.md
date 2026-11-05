# Validación — Spec 040, Auxiliar Administrativa, asistente ampliado y archivos

> Fecha: 2026-11-05 · Tarea T18

Recorrido RF por RF. Cada fila dice **con qué se comprobó**:
- un caso de `scripts/verificar-reglas.ts` (los de esta spec llevan «040/» en el nombre);
- una prueba en vivo, con la tarea en que se hizo (el detalle está en las notas de cada tarea en `tareas.md`);
- o, cuando se cumple **por construcción**, la razón, dicha así.

Lo que no se ejecutó no se da por verificado: queda en «Lo que no se probó».

## Lo que se ejecutó

| Comando | Resultado |
| --- | --- |
| `npm run verificar` | **677 verificaciones correctas** (21 pruebas nombradas «040/»; se ajustaron las de 028, 033 a 038 que daban por hecho que la auxiliar solo consultaba) |
| `npm run typecheck` | sin errores |
| `npm run lint` | sin hallazgos |
| `scripts/humo-archivos-040.ts` | 5 000 filas: Excel, PDF (186 páginas, 1,6 s) y Word (0,4 s), todos por debajo de 20 s; reabiertos con sus números, fechas y tildes |

**Desarrollo** (`neondb`; migración `0039_deep_stardust`, **escrita a mano**, aplicada **solo aquí**, 40 migraciones):
- **T3:** la 0039 es `ALTER TYPE … RENAME VALUE 'auxiliar_rrhh' TO 'auxiliar_administrativa'`, `UPDATE usuarios.cargo`, `ADD VALUE IF NOT EXISTS 'archivo_generado'` y tres columnas `jsonb` del asistente (`empresas`, `archivos`, `aclaracion`). drizzle-kit generaba DROP/CREATE TYPE con un cast que falla con filas viejas; se reescribió, y al volver a generar sale «No schema changes».
- **T4, T7, T8, T9, T13:** e2e contra el dev server y las funciones de servidor, con datos `PRUEBA-040` borrados por id (10 ✓, 15 ✓, 16 ✓, 20 ✓ y 14 ✓).
- **T5, T14, T16, T17:** en Chrome (`localhost:8081`). A 1366 px y, como Chrome estaba maximizado, a 390 px con la pantalla dentro de un marco de 390 px.
- **T10, T14, T16, T18:** con la IA real (Opus 5.5).
- **T18:** la demo final por las rutas reales (abajo), la medición de tiempos y la de memoria.
- **Limpieza acotada:** solo lo `PRUEBA-040`, por id. Al final: 0 usuarios, 0 solicitudes de compra y de pago, 0 compras, 0 pagos y 0 cortes `PRUEBA-040`. Los archivos que generó el asistente en R2 se borraron por su clave (DELETE firmado → 204). Las solicitudes de prueba consumieron números (SC-0549 a SC-0573, SP-0521 a SP-0530): quedan huecos en la numeración de dev. Scripts temporales borrados; `dist/` de la medición, borrado.

**Producción:** sin tocar. Va con la T23 de la 033 (ver «Para desplegar»).

### Demo final (T18)

Por las rutas reales del dev server, con sesiones de tres usuarios `PRUEBA-040`: Auxiliar, Gerencia y un Residente de **Consorcio Antioquia**. La gerencia pide tres solicitudes de compra en **Pruebas spec 018** y una de pago de **OCC**. **28 ✓ en la corrida completa** (la tercera; las dos anteriores sirvieron para corregir el lector de eventos del script y hallar los defectos 2 y 3 de abajo).

1. La auxiliar **aprueba** SC-0568; la gerencia, tarde, recibe **409 «Esta solicitud ya fue aprobada por PRUEBA-040 Auxiliar.»**.
2. La auxiliar **registra la compra**, **marca lo recibido**: queda «recibida» con «PRUEBA-040 Auxiliar» en la historia de cada paso.
3. En otra solicitud, registra una compra y la **anula con motivo**: la compra queda guardada como anulada «por PRUEBA-040 Auxiliar» y la solicitud vuelve a «aprobada».
4. **Aprueba** SP-0529 de OCC y **registra el pago**: queda «pagada», con la auxiliar en la historia.
5. **Registra y anula un corte de Elemental** (201 y 200); un corte de **OCC**: **403**.
6. Con el asistente, **«¿Qué compras están por aprobar?»**: nombra solo la que sigue enviada, con la espera «Leyendo las solicitudes de compra…» y la fuente «Compras de Elemental» (10,3 s).
7. **«Hágame un Excel con ellas»**: «Compras por aprobar 2026-11-05.xlsx», descargado (200) y leído con exceljs: trae esa solicitud, el valor 800 000 como **número con formato de pesos**, y no la recibida.
8. El residente pide **el PDF de la bitácora de esta semana**: en dev no tiene datos, y el asistente **no genera el archivo y lo dice** (caso límite).
9. El residente pide **el PDF de la bitácora de la semana del 5 al 11 de octubre**: lo genera (26,8 s), se descarga y abre. Encabezado, fuentes, resumen y tablas de máquinas y de días sacadas de Reportes. **La auxiliar no lo descarga (404).**
10. El residente pregunta por las solicitudes de **Pruebas spec 018**: «**Esa información no está a su alcance.**», sin cifras; y en el panel, el detalle de esa solicitud le da **404**.

En la corrida siguiente, ya con los arreglos del día, el paso 9 dependió de cómo pidió la IA los datos. Una vez leyó la bitácora día por día, vio que la del 6-oct solo trae notas y **no generó** el PDF: lo explicó y no armó un archivo sin tablas. Pedido «con las máquinas y los días», lo generó con la tabla de Reportes y la columna «Total» como número (ver defecto 3).

### Defectos hallados y corregidos en la validación

1. **(T16, venía de la T13) La gerencia se quedó sin asistente.** Con 19 consultas en modo estricto, la API respondía 400 «The compiled grammar is too large» a **toda** pregunta de la gerencia. Medido con llamadas mínimas: 18 pasan y 19 no. `generar_archivo` y `pedir_aclaracion` van ahora sin modo estricto (`estricta: false`), y su entrada la siguen validando zod y su regla.
2. **(T18) Un PDF o un Word «casi vacío».** Con la semana sin datos, la IA armó una vez un PDF solo con texto. La regla solo frenaba las tablas sin filas, y el texto lo escribía la IA (RF-20). Ahora `faltasDelPedido` exige en todo formato **al menos una tabla de una consulta**. Además `tablaDe` acepta rutas con punto (`bitacora.actividades`), para que la bitácora del día se pueda poner en tablas.
3. **(T18) «Total» en pesos.** En Reportes › Máquinas el total (horas o km) salió «$ 0», porque «total» estaba entre las claves de plata. Se quitó; los totales de plata caen por otra palabra («valorTotal», «totalPagado»).
4. **(T18) Lecturas de medidor con miles.** Faltaba el RNF de la 039: un horómetro de 4250,5 salía «4.250,5» en el PDF y el Word. Nuevo formato `lectura` (por la clave: medidor, lectura, inicial, final, avance, horómetro, odómetro, total, promedio): punto decimal y sin miles en el PDF y el Word, «General» en el Excel, como Reportes.
5. **(T17) A 390 px** un ejemplo largo de la auxiliar se salía de la columna: `maxWidth: '100%'`.
6. **(T14) La API no admite `maxItems`** en modo estricto, y **«Lugar» salía vacío** en el Excel (`lugar.nombre`). Corregidos en la T14.

## Medición (requisitos no funcionales)

| Qué | Medido | Requisito |
| --- | --- | --- |
| Archivo de 5 000 filas | Excel 0,6 s, PDF 1,6 – 9,5 s, Word 0,4 – 1,5 s (T12, T18) | < 20 s ✓ |
| Respuesta sin archivo, gerencia («¿Cuántos viajes de cantera hubo la semana pasada en Pruebas spec 018?») | 8,1 – 9,2 s (4 veces, T18) | «lo mismo que hoy» ✓: en la T10 la gerencia tardaba ~30 s con una consulta y una tabla, y era lo que había que medir aquí |
| Respuesta sin archivo, residente («¿Qué actividades se hicieron ayer en la obra?») | 6,4 – 14,2 s (4 veces, T18) | ✓: antes de la 040 tardaba unos 17 s (T10) |
| Archivos en español, pesos y fechas colombianos, lecturas como la 039 | Pruebas «040/RF-20, RF-21» (lecturas y «Total»), «040/RF-22, RNF» (×2); la demo (pesos en el Excel) | ✓ |

**Memoria del servidor.** En la T18 el servidor de **desarrollo** (`expo start`) se cayó por falta de memoria (4 GB). Medido aparte, crece con **cualquier** petición: 20 lecturas de `/compras` subieron 156 MB, y cada pregunta al asistente entre 15 y 190 MB. Es el servidor de desarrollo, que vuelve a armar la ruta en cada petición. Con la **misma compilación que producción** (`expo export` + `servidor/entrada.cjs`): 67 MB al empezar, 87 MB tras 20 lecturas y 8 preguntas, y 90 MB tras otras 2 (respondidas, «fin ✓»). La 040 no deja nada creciendo.

## RF por RF

### El acceso (H1, H2)

| RF | Cómo se comprobó |
| --- | --- |
| RF-1 | Prueba «040/RF-1, RF-2». T4: ya no queda «auxiliar de RR. HH.» en `src` ni en `scripts`. Chrome (T5): el encabezado dice «Auxiliar Administrativa» y en ningún lugar se nombra el acceso como «Recursos Humanos». |
| RF-2 | La 0039 renombra el valor (`RENAME VALUE`) y el cargo en la misma migración, sin tocar contraseñas ni sesiones (T3). T4: la sesión de una auxiliar lee el rol nuevo. **En dev no había auxiliares de antes**: la conservación con filas reales queda para producción (ver «Lo que no se probó»). |
| RF-3 | Prueba «040/RF-3». Chrome (T5): al ingresar entra directo a Compras de Elemental. |
| RF-4 | Pruebas «040/RF-4 a RF-6, D2» y «040/RF-9, caso límite». e2e T4 y demo T18 (aprueba; la gerencia, tarde, 409). Chrome (T5): Aprobar, Devolver y Rechazar en una solicitud de obra. |
| RF-5 | Pruebas «040/RF-4 a RF-6, D2» y «040/RF-5, RF-6». Demo T18 pasos 2 y 3 (registrar, recibir, anular con motivo). Chrome (T5). |
| RF-6 | Pruebas «040/RF-4 a RF-6, D2» y «040/RF-5, RF-6». e2e T4, demo T18 paso 4. Chrome (T5): aprobó, pagó y anuló un pago con motivo. |
| RF-7 | Prueba «040/RF-7, D3». e2e T4 y demo T18 paso 5 (Elemental 201/200; OCC y Geolab 403). Chrome (T5): en OCC ve el corte y el historial sin formulario ni Anular. |
| RF-8 | Prueba «040/RF-8, RF-10» (Recursos Humanos y Documentos con anular; Licitaciones). Documentos anula con `alcanza(modulo, 'anular')` y el lugar lo limita `documentoAlAlcance` (T4). |
| RF-9 | Prueba «040/RF-9, caso límite». Demo T18: la historia de compra y de pago guarda «PRUEBA-040 Auxiliar» en cada paso. Chrome (T5): «Anulado por PRUEBA-040 Auxiliar: …». |
| RF-10 | Prueba «040/RF-8, RF-10». Demo T18 paso 3: la compra anulada sigue guardada, con quién y motivo. Por construcción: ninguna ruta de la spec borra filas. |
| RF-11 | Prueba «040/RF-11, D5»: `PUEDE_DAR` de la auxiliar sigue siendo solo `operador`. |

### Asistente: qué sabe cada cargo (H3, H4)

| RF | Cómo se comprobó |
| --- | --- |
| RF-12 | Prueba «040/RF-12 a RF-15». Chrome (T14, T17) y demo T18: la auxiliar pregunta y recibe respuesta. |
| RF-13 | Prueba «040/RF-12 a RF-15» (la gerencia alcanza las 7 de empresa). e2e T7 (Bitácora de Geolab), T8 (compras y pagos), T9 (cortes, RR. HH. con salario, documentos). IA real: T10 (compras por aprobar del grupo) y T18 (cantera). |
| RF-14 | Prueba «040/RF-12 a RF-15». e2e T8 (lo que ve coincide con su bandeja) y T9 (salario, D4). Demo T18 pasos 6 y 7. |
| RF-15 | Prueba «040/RF-12 a RF-15». e2e T7 (laboratorista: Geolab; Encargado de OCC: OCC), T8 (residente: su obra con valor; almacenista: sin valor). Demo T18 paso 9. |
| RF-16 | Prueba «040/RF-16» (también en una conversación guardada). e2e T7 y T8 («no está a su alcance» sin decir si existe). IA real: T10 y demo T18 paso 10. |
| RF-17 | Por construcción: ninguna consulta del asistente escribe; el detalle de una solicitud va sin `pasos` ni `version` (T8). IA real (T10): «para aprobarla hay que entrar al módulo de Compras… yo solo puedo consultar». |

### Archivos (H5)

| RF | Cómo se comprobó |
| --- | --- |
| RF-18 | Prueba «040/RF-18, RF-23». Chrome (T14): Excel de la auxiliar; T16: Excel de la gerencia; demo T18: Excel de la auxiliar y PDF del residente. |
| RF-19 | Chrome (T14): la tarjeta sale mientras se redacta, con nombre, formato, filas y «Descargar», y queda en la respuesta guardada. |
| RF-20 | Prueba «040/RF-20, RF-21». Las tablas salen de los resultados guardados del turno (`generarArchivo`), nunca de la IA; desde la T18 todo archivo lleva al menos una tabla de una consulta (prueba «040/RF-18, RF-23»). T14 y demo T18: el Excel trae las mismas cifras de la respuesta y no trae lo que no corresponde. |
| RF-21 | Prueba «040/RF-20, RF-21». T14 y demo T18: el Excel leído con exceljs, con los números como números con formato de pesos y las fechas como `Date`, una hoja por tabla y la de notas. |
| RF-22 | Pruebas «040/RF-22» y «040/RF-22, RNF» (×2). Demo T18: el PDF con grupo, quién lo pidió, fecha y hora, y fuentes con su obra y periodo, revisado a ojo. T12: PDF revisado en el lector de Chrome. |
| RF-23 | Prueba «040/RF-18, RF-23» (más de 5 000 filas se rechaza y pide acotar). `ejecutarHerramienta` pide un periodo más corto si un resultado es demasiado grande para leerlo. |
| RF-24 | Prueba «040/RF-24, D7» (se descarga hasta el día 30 y no el 31). Por construcción: `archivoGeneradoAlAlcance` exige conversación propia, visible con el alcance de hoy, y archivo vigente. Demo T18: otro usuario recibe 404. |

### Una mejor experiencia (H6)

| RF | Cómo se comprobó |
| --- | --- |
| RF-25 | Pruebas «040/RF-25» (×2). Chrome (T17): «Puede consultar…» de la gerencia, la auxiliar y el residente a 1366 y 390 px; título y saludo «del grupo» o «de su obra»; recuadro del Inicio del residente. |
| RF-26 | Prueba «040/RF-26» y «028/RF-74». Chrome (T17): el ejemplo queda escrito en el campo y la dirección no cambia (no se envía). |
| RF-27 | Prueba «040/RF-27». Chrome con IA real (T16): «¿Cuántos viajes hubo ayer?» de la gerencia → «¿De qué obra?» con 4 botones; tocar uno respondió sobre esa obra. |
| RF-28 | Sin cambios de la 028. Demo T18 y Chrome (T14, T16, T17): cada respuesta trae sus fuentes («Compras de Elemental», «Reportes › Cantera»). |
| RF-29 | Prueba «040/RF-29» (con la lista real de consultas). Chrome (T17): «Leyendo las solicitudes de compra…»; demo T18: «Leyendo la bitácora del 6-oct…», «Leyendo el reporte de cantera del 26-oct al 1-nov…», «Armando el PDF «…»…». |

### Dudas resueltas

- **D1** (un nombre): RF-1.
- **D2** (cualquier valor): prueba «040/RF-4 a RF-6, D2»; demo T18 aprueba 1 200 000 y 350 000 sin tope.
- **D3** (cortes: consulta todos, toca Elemental): RF-7.
- **D4** (ve el salario): e2e T9 y prueba «040/RF-12 a RF-15».
- **D5** (da solo operador): RF-11.
- **D6** (eliminar = anular): RF-10.
- **D7** (30 días): RF-24.
- **D8** (solo el asistente): por construcción; el resto del panel no cambió más allá del acceso.
- **D9** (PDF, Excel y Word): prueba «040/RF-18, RF-23» (cualquier otro formato se rechaza).

## Casos límite

| Caso | Cómo se comprobó |
| --- | --- |
| Evidencia firmada | Las reglas de la 036 y la 037 no cambiaron; la auxiliar pasa por las mismas (`yaLaDecidioOtro`, `faltasDelPago`). Prueba «040/RF-4 a RF-6, D2». |
| Primer arranque | Chrome (T5): una auxiliar nueva entra a Compras y ve lo pendiente; T17: el asistente le muestra sus ejemplos y lo que puede consultar. |
| Cambio de acceso con la sesión abierta | Sin cambios: la sesión se relee en cada petición, como hoy. |
| Dos personas aprueban a la vez | Prueba «040/RF-9, caso límite»; e2e T4; demo T18 (409 con el nombre). |
| Archivo de algo que dejó de estar al alcance | Por construcción (`archivoGeneradoAlAlcance` con `conversacionVisible`); prueba «040/RF-16». |
| Archivo sin datos | Prueba «040/RF-18, RF-23»; demo T18 paso 8. |

## Lo que no se probó

- **RF-2 con auxiliares reales:** dev no tenía ninguna. La migración es un `RENAME VALUE` (no toca filas), pero la conservación se ve en producción, en la T23.
- **El Excel y el Word abiertos en Microsoft Office:** se leyeron con exceljs y abriendo su XML (T12, T14, T18). Quedan para el usuario: dos `.xlsx` de la T14 en su carpeta Descargas.
- **Que un archivo venza o deje de descargarse con el reloj o con un cambio de acceso real:** cubierto por la regla y por construcción, no esperando 30 días ni cambiando un rol en vivo.
- **Que la IA siempre arme el PDF de una semana con datos:** depende de cómo pide los datos. Si lee la bitácora día por día y solo hay notas, se niega (como debe, sin tablas). Dev tiene una sola bitácora con contenido en Consorcio Antioquia (6-oct).
- **El tope de la gramática de la API:** la gerencia está en 18 consultas estrictas; una consulta nueva para la gerencia tiene que medirse con la API real.
- **El mensaje del 400 de la API** («puede que la cuenta de Anthropic no tenga saldo») sigue saliendo para otros 400: va en otra spec.
- **La app móvil:** fuera de alcance.

## Para desplegar (T23 de la 033)

1. Migraciones en orden: 0031 → 0039. La **0039 (`0039_deep_stardust`) está escrita a mano**: `RENAME VALUE` del enum, `UPDATE usuarios.cargo`, `ADD VALUE IF NOT EXISTS 'archivo_generado'` y las tres columnas `jsonb`. No volver a generarla con drizzle-kit. Producción migra con `scripts/migrar-produccion.ts` (base `preoperaocc`), **antes** de la imagen nueva.
2. Después de migrar, comprobar en producción que las auxiliares que hubiera conservan su acceso con el nombre nuevo (RF-2).
3. La imagen con la 040. Dependencias nuevas: `pdf-lib` 1.17.1 y `jszip` 3.10.1, con versión exacta.
4. Sin cambios en n8n.
