# Tareas — Spec 048, requisiciones de obra amarradas a la planificación

Tareas de menos de 30 minutos, ordenadas por dependencia. Cada una lleva los RF que
cubre y una línea `Hecho cuando:` que se pueda comprobar sin interpretar.

**Se implementa una tarea cada vez** (`/sdd:implementar T1`), y al terminarla se para.
Ninguna tarea se marca sin `npm run verificar`, `npm run typecheck` y `npm run lint`
en verde.

## Reglas puras (`src/shared/rules/requisicion-planificacion.ts`, con sus casos «048/»)

- [x] T1. **Opciones para imputar**: tipos `ImputacionDelRenglon` y `OpcionParaImputar`; `opcionesParaImputar(planificaciones)` arma ítems (costo `medidaDelCosto × precioCosto` o `null`), rubros (su `costo`), renglones indirectos (`totalDelRenglon`) y la mano de obra indirecta como una sola opción con el total del concepto; llaves con `llaveDeItemPlanificado`; `buscarOpciones(opciones, texto)`. (RF-6, RF-7, RF-27, RF-29, RF-35, RF-46, RF-65)
      Hecho cuando: hay casos «048/» de ítem con costo y sin costo, rubro con su costo, un solo renglón de mano de obra indirecta con el total del concepto, la misma llave en dos versiones de un ítem, y búsqueda por número y por descripción; en verde.
- [x] T2. **Validar la imputación**: `faltasDeLaImputacion(imputacion, opciones, hayVigente)` → sin imputación, `fuera` sin explicación, llave que ya no está, y `sin_planificacion` cuando no hay vigente; valor estimado obligatorio por renglón salvo al Almacenista (`faltasDeLaSolicitud` con `requisicionDeObra` en `rules/compras.ts`) y cabecera como la suma. (RF-2 a RF-5, RF-8, RF-11 a RF-13, RF-18, RF-54, RF-55)
      Hecho cuando: hay casos «048/» de cada falta, del Almacenista sin valores, de la cabecera igual a la suma y de la obra sin vigente; los casos de la 046 siguen en verde; en verde.
- [x] T3. **Lo comprometido**: `comprometidoPorOpcion(requisiciones, compras)` con enviada, devuelta, cancelada y rechazada con y sin compra viva, estimado y luego real, compra anulada, compra con valor por renglón y compra de una sola llave, pago pedido y aprobado, renglón quitado y cantidad rebajada, filas sin imputación; aparte, «fuera» y llaves sin opción. (RF-19 a RF-25, RF-40, RF-49, RF-56 a RF-60)
      Hecho cuando: hay un caso «048/» por cada situación de la lista con la cifra exacta esperada; en verde.
- [x] T4. **Cifras y avisos**: `cifrasDelRenglon` (planeado, ya comprometido sin esta requisición, lo que pide, lo que queda), `avisosDeLaRequisicion` («Se pasa de lo planeado» con el exceso, «Fuera de lo planeado», «Sin ítem en la versión vigente», «Sin planificación aprobada») y `marcaDeLaRequisicion` para la lista. (RF-26, RF-28 a RF-31, RF-61, RF-62)
      Hecho cuando: hay casos «048/» de dos renglones al mismo ítem que juntos se pasan, uno sin precio de costo sin aviso, uno fuera, uno sin ítem y la marca que corresponde; en verde.
- [x] T5. **Aprobar y resumen**: `faltasParaAprobar` (valores estimados que faltan, no cambiar uno que ya estaba), quién cambia la imputación con `puedeRecortar`, `avisosParaLaHistoria` y `resumenDeLoComprometido` (filas, exceso, fuera, sin ítem, mano de obra indirecta en una fila); `faltasDeLaCompraPorRenglon` (falta y sobra); textos de la historia para `imputar`, `valor_estimado` y `avisos`, y el filtro de cifras para quien no ve valores. (RF-14 a RF-17, RF-36 a RF-38, RF-42, RF-47, RF-48, RF-50, RF-51, RF-63, RF-64, RF-66, RF-9)
      Hecho cuando: hay casos «048/» de cada función, incluido que el Almacenista no ve cifras en la historia; en verde.

## Datos y contratos

- [x] T6. **Esquema y migración 0050**: `solicitud_compra_renglones.valor_estimado` e `imputacion`, `solicitudes_pago.imputacion`, `compra_renglones.valor`, con sus `check`; `npm run db:generate:servidor`; aplicar **solo en `neondb`**. (RF-2, RF-3, RF-11, RF-47)
      Hecho cuando: existe `drizzle/servidor/0050_*.sql`, está aplicada en `neondb` y no en `preoperaocc`, las filas existentes quedan con `null`, y un `insert` con `valor_estimado = 0` falla por el `check`; en verde.
- [x] T7. **Contratos**: Zod de la imputación; `valorEstimado` e `imputacion` por renglón y en el pago; `valoresEstimados` e `imputaciones` en la decisión; `valores` por renglón en la compra; tipos de respuesta con cifras, avisos, marca, opciones y resumen. (RF-2 a RF-18, RF-36, RF-47)
      Hecho cuando: hay casos «048/» de contrato que aceptan un pedido válido y rechazan `fuera` sin explicación y un valor no entero; en verde.

## Servidor

- [x] T8. **Lectura por obra**: `src/features/requisiciones/servidor/planificacion.ts` lee la planificación vigente y las RQ de obra con sus compras, y entrega opciones y comprometido; ruta `GET /api/panel/requisiciones/imputables?obraId=`. (RF-6, RF-7, RF-9, RF-34, RF-35, RF-46)
      Hecho cuando: en vivo contra `neondb`, la ruta da las opciones de `PRUEBA-043` con cifras al Residente y sin cifras al Almacenista, 403 a una persona de otra obra y listas vacías en una obra sin vigente; en verde.
- [x] T9. **Crear y corregir**: `crearRequisicion`, `corregirSolicitud` y `corregirSolicitudDePago` validan y guardan imputación y valor estimado. (RF-2 a RF-8, RF-10 a RF-13, RF-18, RF-54, RF-55)
      Hecho cuando: en vivo, una RQ con un renglón sin imputar da 422 junto al renglón, una con `fuera` sin explicación da 422, una válida queda guardada con su imputación y su valor, una del Almacenista entra sin valores, y una de obra sin vigente queda `sin_planificacion`; en verde.
- [x] T10. **Decidir**: `decidirRequisicion` acepta los valores estimados del primer paso con persona y las imputaciones de quien `puedeRecortar`, y anota los avisos en el evento de cada aprobación. (RF-14 a RF-17, RF-36 a RF-38, RF-63, RF-64)
      Hecho cuando: en vivo, el Residente no aprueba la del Almacenista sin valores (422) y sí con ellos; el Director de Obra recibe 422 al cambiar una imputación; la Administradora la cambia y queda `antes` y `después` en la historia; la aprobación con exceso deja el aviso con su cifra en el evento; en verde.
- [x] T11. **Registrar la compra por renglón**: `registrarCompra` exige `valores` cuando los renglones caen en más de una opción y los guarda. (RF-21, RF-47 a RF-49)
      Hecho cuando: en vivo, una compra de dos renglones de ítems distintos sin valores da 422, con valores que no suman da 422 con lo que falta, y con valores que suman queda guardada; una compra de una sola opción no los pide; en verde.
- [x] T12. **Detalle, lista, bandeja y resumen**: `solicitudDe` y `solicitudDePagoDe` devuelven cifras y avisos y filtran la historia; `filasDeRequisiciones` y `bandejaDeRequisiciones` traen la marca; ruta `GET /api/panel/planificaciones/[id]/comprometido`. (RF-9, RF-26 a RF-34, RF-42, RF-50 a RF-53, RF-66)
      Hecho cuando: en vivo, el detalle trae las cifras al Residente y no al Almacenista, cuya historia sale sin valores; la lista marca la RQ que se pasa; el resumen responde a la Gerencia y al Director de Obra de la obra y da 403 al Almacenista; en verde.

## Pantallas

- [x] T13. **Formulario**: por renglón, selector de imputación con búsqueda (número, descripción, capítulo y frente), valor estimado (no aparece para el Almacenista) y explicación si va «Fuera de lo planeado»; el pago con su imputación; al corregir, propone lo que tenía el renglón; aviso «Sin planificación aprobada». (RF-2 a RF-13, RF-46, RF-54)
      Hecho cuando: en el navegador el Residente arma una RQ con dos renglones imputados y la envía; un renglón sin imputar muestra la falta junto al campo; el Almacenista no ve el valor estimado; en verde.
- [x] T14. **Detalle y decisión**: columnas de imputación y cifras con sus avisos, que caben en `MaxContentWidthPanel`; valor estimado editable en el paso que toca; cambio de imputación para quien puede; la historia con los avisos de cada aprobación. (RF-14, RF-26 a RF-38, RF-63)
      Hecho cuando: en el navegador el Director de Obra ve «Se pasa de lo planeado» con su cifra y aprueba; el Residente completa los valores del Almacenista; la Administradora cambia una imputación; la tabla no se desplaza; en verde.
- [x] T15. **Compra, lista y resumen**: valor por renglón al registrar la compra; la marca en la lista y la bandeja; sección «Lo comprometido» en la planificación vigente, con enlace a las requisiciones. (RF-31, RF-42, RF-47 a RF-53, RF-66)
      Hecho cuando: en el navegador la Administradora registra una compra de dos ítems con su valor por renglón; la lista marca la que se pasa; el resumen de `PRUEBA-043` muestra el exceso resaltado, la mano de obra indirecta en una fila y abre una requisición; en verde.

## Cierre

- [x] T16. **Demo de punta a punta** en `PRUEBA-043` con cuentas de prueba de Residente, Almacenista, Director de Obra, Director de Proyectos y Administradora: los once pasos de los «Criterios de finalización» de la spec, incluida una versión nueva de la planificación sin un ítem y el tiempo del detalle con 30 renglones. (Todos los de flujo, RF-NF)
      Hecho cuando: cada paso da lo que dice la spec, anotado en las notas con lo que se vio; el detalle de 30 renglones abre en menos de 2 segundos; en verde.
- [x] T17. **Validación final**: recorrido RF por RF de la spec + demo manual, en `validacion.md`. (Todos)
      Hecho cuando: cada RF tiene su comprobación con resultado, los tres comandos están en verde y la spec queda marcada como Cumplida.

## Notas de ejecución

- Migración 0050 solo en `neondb`; producción la recibe con 0042–0050 en el despliegue de la tanda.
- Diego enciende su servidor en el puerto 8081 y no recarga las rutas `+api.ts`: tras tocar una, hay que pedirle que lo reinicie.
- **Pruebas en vivo sin reiniciar el servidor (T8–T12):** `scripts/_vivo-048.ts` entra con la cuenta por el servidor de Diego (la ruta de ingreso ya existía) y llama los manejadores `+api.ts` dentro del mismo proceso, contra `neondb`. Fue temporal: se borró al cerrar la spec, con los `scripts/_t*-048.mts`.
- **T7:** la forma de la imputación pasa el contrato tal cual y la regla dice la falta junto al renglón; un texto vacío en la explicación llega vacío, no nulo, para que «Fuera de lo planeado» sin explicación tenga su propio mensaje (RF-4). Los pesos sí los rechaza el contrato si no son enteros.
- **T8, sorpresa:** la v8 de PRUEBA-043 tiene dos renglones de maquinaria con la misma descripción y daban la misma llave. Se desempatan con `|#2` en el orden de la planificación, como `llavesDeEdicion` con los ítems (caso «048/RF-65» nuevo).
- **T12:** una RQ que comparte ítem con otra que se pasa también lleva la marca: el aviso es de la opción, no del renglón (RF-28).
- **T14:** la tabla de renglones de la 046 ya usa 1 254 de 1 280; la planificación va en una tabla aparte («A qué parte de la planificación va», 1 228).
- Datos de prueba en `neondb`, obra PRUEBA-043 Magdalena: RQ-0019 a RQ-0024 (RQ-0022 en PRUEBA-046, sin planificación).
- **T13–T16 en el navegador:** tres fallos que no se veían por la API, arreglados: la cabecera al completar valores (RF-18), «ya comprometido» en la ventana de aprobar (RF-61) y el enlace del resumen (RF-52, la pantalla de requisiciones lee también el parámetro del router). Y el texto de la historia de la 036/037 tomaba lo de la 048 como cantidades.
- **T16, paso 6:** v9 de PRUEBA-043 aprobada (copia de la v8 sin «Polizas definitivas») para ver «Sin ítem en la versión vigente» (RQ-0028). El paso 11 (cancelar con compra) no se puede producir hoy: ver `validacion.md`.
