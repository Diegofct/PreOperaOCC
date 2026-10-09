# Plan técnico — Spec 024

> Lee antes `docs/constitucion.md` y el `spec.md` de esta carpeta.
> Aquí va el CÓMO. Si algo de esto cambia el comportamiento acordado, no se resuelve
> en el plan: se vuelve a la spec.
>
> Incluye el cambio aprobado de la spec 021 (RF-104 a RF-111): el conductor, la placa, el
> material y los sitios de un viaje. Va primero porque la 024 lo necesita para guardar sola.

## Lo que ya está y se reutiliza

| Pieza | Dónde | Para qué aquí |
| --- | --- | --- |
| Recepción idempotente | `src/features/whatsapp/servidor/recepcion.ts` | Sigue igual; después de guardar el mensaje se procesa (RF-1, RF-9) |
| Lectura de la propuesta | `resolverPropuesta`, `faltasDelReporte` en `src/shared/rules/whatsapp.ts` | El reporte reconocido y lo que le falta |
| Catálogos de la obra | `catalogosDeLaObra` en `servidor/bandeja.ts` | Se saca a un archivo propio y lo usan la bandeja y el guardado |
| Escritura en la bitácora | `aprobarPropuesta` en `servidor/aprobacion.ts` (pasos con ids fijos, `UPDATE` condicionado, `fusionarReporteEnParte`) | Se parte en funciones que reciben un *actor* en vez de una sesión |
| Almacén | `aprobarReporteDeAlmacen` en `servidor/almacen.ts` (lote serializable) | Igual, con el actor de sistema (RF-3) |
| Personas sin acceso | `usuarioDeLaBandeja`, `posiblesCoincidencias`, `cargoDeHoja`; columnas `registrado_por` y `mensaje_whatsapp_id` de `usuarios` | Registro automático (RF-22 a RF-26) |
| Viajes | `registrarViajes`, `opcionesDeLaObra`, `eleccionesAjenas`, `validarViaje`, `valeLimpio`, `avisoDeValeRepetido` | Guardar y validar como el módulo (RF-2, RF-15, RF-71) |
| Ids fijos | `idDeterminista` en `servidor/ids.ts` | Reintentos sin duplicar |
| Guardia de integración | `requerirIntegracion` | La entrada nueva para el pulso de n8n |
| Horario de la obra | `obras.horario` (`HorarioDeObra`, spec 016) | Qué días aplica la lista (RF-40) |

## Módulos y archivos

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `src/shared/rules/whatsapp.ts` | `reconocerVehiculo` con los pares O/0, I/1, S/5, B/8, Z/2. `reconocerPorNombre` para cantera con comparación compacta y sin «cantera», «el», «la», «c.». `conductorDelViaje` con cuatro caminos y el camino usado. `ViajeDelReporte` lleva `conductorEscrito` y `conductorPor` | 021/RF-104 a RF-111 |
| `src/features/panel/contratos.ts` | `conductor` y `hora_foto` en `propuestaIa`. Contratos nuevos de las cuatro pantallas y de la lista de reportes esperados | 021/RF-104; RF-16, RF-37 a RF-64 |
| `src/shared/rules/whatsapp-automatico.ts` (nuevo) | Reglas puras: `tipoDeReporte`, `viajeRepetido`, `viajesQueFaltan`, `completarViaje`, `placaRegistrable`, `decisionDePersona`, `diaCompleto`, `diaVencido`, `separarRenglones` | RF-11 a RF-31, RF-38 a RF-47 |
| `src/features/whatsapp/servidor/catalogos.ts` (nuevo) | `catalogosDeLaObra`, sacado de `bandeja.ts`, más los preoperacionales del día y el último conductor de cada volqueta | 021/RF-105 |
| `src/features/whatsapp/servidor/actor.ts` (nuevo) | El actor: una persona en sesión o el usuario de sistema «IA WhatsApp» | RF-10 |
| `src/features/whatsapp/servidor/aprobacion.ts` | Se parte en `guardarViajes`, `guardarEnBitacora` y `marcarMensaje`, con actor. `aprobarPropuesta` queda como envoltorio para «No se pudo guardar» | RF-2, RF-44, RF-50 a RF-54, RF-61 |
| `src/features/whatsapp/servidor/creacion.ts` (nuevo) | Crear personas, materiales y sitios de cantera, volquetas y materiales de almacén, con id fijo por obra y nombre, y anotarlos en `whatsapp_creados` | RF-22 a RF-32 |
| `src/features/whatsapp/servidor/automatico.ts` (nuevo) | `procesarMensaje(id)`: resolver, crear lo que falta, separar renglones, guardar por destino, registrar excepciones y avisar al día | RF-1 a RF-21, RF-68 |
| `src/features/whatsapp/servidor/dias.ts` (nuevo) | Estado del día, `armarBitacora(obra, fecha, motivo)` y la foto del día | RF-43 a RF-57, RF-73 |
| `src/features/whatsapp/servidor/pulso.ts` (nuevo) | Lo que hace cada pulso: arma los días vencidos, procesa pendientes viejos en lotes y reintenta los que fallaron | RF-46, RF-68 |
| `src/features/whatsapp/servidor/excepciones.ts` (nuevo) | Listar, completar, guardar y descartar renglones | RF-60 a RF-63 |
| `src/features/whatsapp/servidor/creados.ts` (nuevo) | Listar, marcar como revisado y «Es el mismo que…» (unir) | RF-33 a RF-36 |
| `src/app/api/integraciones/whatsapp/mensajes+api.ts` | Después de `recibirMensaje`, `procesarMensaje` | RF-1 |
| `src/app/api/integraciones/whatsapp/pulso+api.ts` (nuevo) | `POST`, guardia de integración | RF-46, RF-68 |
| `src/app/api/panel/whatsapp/dias+api.ts`, `dias/[obra]/[fecha]/armar+api.ts` | Estado del día y «Guardar con lo que hay» | RF-48, RF-55 a RF-57 |
| `src/app/api/panel/whatsapp/esperados+api.ts` | Leer (residente y gerencia) y cambiar (gerencia) | RF-37 a RF-42 |
| `src/app/api/panel/whatsapp/excepciones…`, `creados…` | Las acciones de las dos listas | RF-33 a RF-36, RF-60 a RF-64 |
| `src/shared/rules/permisos.ts` | Sin cambios (decidido en T17): «atender» usa el permiso `whatsapp:aprobar`, que ya tienen el residente y la gerencia, y «configurar» usa `requerirAdmin`, como asociar un grupo. Mismo resultado sin ampliar las acciones | RF-42, RF-64 |
| `src/features/panel/whatsapp/*` | Pestañas Historial, Estado del día, Creado automáticamente, No se pudo guardar y Reportes esperados. La propuesta, de solo lectura, con enlaces a lo guardado | RF-55 a RF-64 |
| Personas, Vehículos, Control Cantera, Almacén (listas) | Marca «creado desde WhatsApp» y «desde WhatsApp» | RF-32, RF-72 |
| `scripts/verificar-reglas.ts` | Casos de las reglas nuevas | Criterios |
| Repo de n8n: `generar_workflow_clasificar.py` | `hora_foto` en el esquema (`conductor` ya está) | RF-16 |
| Repo de n8n: `generar_workflow_pulso.py` (nuevo) | Flujo «OCC - Pulso PreOperaOCC», cada 15 min, `POST …/pulso` | RF-46, RF-68 |

## Modelo de datos

Una migración en el servidor: `npm run db:generate:servidor` → `drizzle/servidor/0021_*.sql`.

- **`whatsapp_mensajes`**
  - El enum `estado_mensaje_whatsapp` gana `en_espera` (espera la bitácora del día) y `guardado`. `pendiente` pasa a significar «sin procesar». `aprobado` se conserva para lo de antes (RF-69).
  - Columnas nuevas:
    - `fecha_hecho` (date): la fecha del día al que va;
    - `tipo_reporte` (text): el de RF-38;
    - `procesado_en`;
    - `error_proceso` (text) e `intentos` (integer, 0 por defecto);
    - `resultado` (jsonb): qué se guardó y dónde (ids de viajes, de movimientos o de la bitácora), para el historial (RF-58, RF-59).
  - Índice nuevo en (`fecha_hecho`, `estado`).
- **`whatsapp_reportes_esperados`** (nueva)
  - Columnas: `id`, `obra_id`, `tipo_reporte` (`reporte_diario | personal | control_calidad | inicio_actividades | viajes`), `autor_id` (el lid del grupo, nulo = cualquiera), `autor_nombre`, `creado_por`, `creado_en`, `eliminado_en`.
  - Índice único parcial en (`obra_id`, `tipo_reporte`, `coalesce(autor_id,'')`) para los vigentes.
- **`whatsapp_dias`** (nueva)
  - Columnas: `obra_id`, `fecha` (llave primaria compuesta), `estado` (`en_espera | armada | incompleta`), `faltaron` (jsonb), `parte_id`, `armada_en`, `armada_por`.
  - La cerrada no se guarda aquí: se lee de la bitácora (RF-56).
- **`whatsapp_excepciones`** (nueva)
  - Columnas: `id` (fijo: mensaje, sección y renglón), `mensaje_id`, `seccion`, `renglon`, `motivo`, `datos` (jsonb, el renglón como quedó), `estado` (`pendiente | guardada | descartada`), `resuelta_por`, `resuelta_en`, `motivo_descarte`.
- **`whatsapp_creados`** (nueva): la marca «creado desde WhatsApp» (RF-32 a RF-36).
  - Columnas: `tipo` (`persona | vehiculo | material_cantera | sitio_cantera | material_almacen`), `registro_id`, `obra_id`, `mensaje_id`, `creado_en`, `revisado_por`, `revisado_en`, `unido_a`.
  - Llave en (`tipo`, `registro_id`).
- **Usuario de sistema «IA WhatsApp»**: una fila fija en `usuarios`.
  - Id constante en código, `usuario = 'sistema.ia-whatsapp'`, rol `operador`, sin credenciales y sin obra. Se inserta con `on conflict do nothing` en la misma migración.
  - Sin obra, nunca sale como conductor ni como persona de una bitácora (`conductorElegible`). Personas lo filtra por su id.

**Compatibilidad:** sin cambios en el teléfono: nada de esto va en el pull. Lo ya aprobado o descartado no se toca (RF-69).

## Algoritmo / reglas

**Reconocer un viaje (021/RF-104 a RF-111, en `whatsapp.ts`):**
1. Placa: igual, luego contenida (como hoy), luego con los pares de confusión aplicados a las dos partes. Uno solo gana; dos o más, ninguno (RF-107, RF-108).
2. Material y sitios: lo de hoy; si no da, comparar `compacto()` sin las palabras vacías de cantera (RF-110, RF-111).
3. Conductor: el primero de estos que dé uno, y `conductorPor` dice cuál fue (RF-105, RF-109):
   - `reconocerPersona(conductorEscrito)`;
   - el operador de la volqueta en el mismo reporte;
   - el preoperacional de esa volqueta en esa fecha (en Colombia), solo si hay una única persona (RF-106);
   - el conductor del último viaje vigente de esa volqueta en la obra.

**`procesarMensaje(id)` (en `automatico.ts`)**. Es idempotente: cada paso usa ids fijos y se puede repetir.
1. Lee el mensaje con su obra. Sin obra, se queda `pendiente`, como en 021/RF-11.
2. Destino `ninguno` → `ignorado` (RF-6). Error de la IA → una excepción «La IA no pudo leer el mensaje».
3. Resuelve la propuesta con `catalogosDeLaObra` → `ReporteDelDia`.
4. Completa los viajes con `completarViaje` (RF-16, RF-17):
   - hora = `hora_foto`, o si no la del mensaje en Colombia;
   - destino vacío = la obra.
5. Crea lo que falta (`creacion.ts`, RF-22 a RF-31) y vuelve a resolver los renglones afectados:
   - **Personas:** `decisionDePersona`. Puede ser «reconocida», «coincidencia única» (usar esa), «crear» o «ambigua» (excepción). El id fijo sale de (obra, `persona`, nombre normalizado), así diez mensajes que nombran a la misma persona nueva crean una sola. El cargo es conductor si viene de un viaje o de una volqueta (RF-25); si viene de un archivo, el de su hoja (RF-26).
   - **Volquetas:** solo si `placaRegistrable` (5 o más letras y cifras, RF-31). Id fijo por (obra, placa compacta), `codigo_interno = 'WA-' + placa`, tipo `volqueta`, estado operativo, en la obra.
   - **Materiales y sitios de cantera:** el índice único por nombre normalizado ya impide duplicados. Se crea y se vuelve a leer el id. Un sitio de origen es tipo `cantera`; uno de destino, tipo `otro`.
   - **Materiales de almacén:** el `materialNuevo` de la 023.
   - Cada uno se anota en `whatsapp_creados` (`on conflict do nothing`).
6. `separarRenglones` con `faltasDelReporte` y `eleccionesAjenas` → renglones que se pueden guardar y renglones con motivo. Los segundos van a `whatsapp_excepciones` (RF-19, RF-20).
7. Según el destino:
   - **cantera:** para cada viaje, `viajeRepetido` contra los vigentes de la obra y el día (RF-11, RF-12), y `viajesQueFaltan` para los renglones agregados (RF-14). Inserta con id fijo, actor de sistema y el mensaje como origen. Estado `guardado`.
   - **almacén:** `aprobarReporteDeAlmacen` con el actor de sistema. Estado `guardado`.
   - **bitácora:** fija `fecha_hecho` y `tipo_reporte`; estado `en_espera`. Si el reporte trae viajes, se guardan igual que en cantera, y la bitácora cerrada no los frena (RF-52).
8. Avisa al día con `actualizarDia(obra, fecha)`.

**`actualizarDia(obra, fecha)` (en `dias.ts`):**
1. Lee la bitácora vigente de ese día:
   - si está **cerrada**, los mensajes en espera de ese día pasan a excepción «bitácora cerrada» con el camino de 021/RF-42 (RF-51);
   - si está **armada y abierta**, se lleva el mensaje en ese momento (RF-50).
2. Si no hay bitácora, `diaCompleto(esperados, recibidos, horario, fecha)`:
   - con una lista vacía, o en un día que la obra no trabaja, el primer mensaje basta (RF-40, RF-41);
   - si no, cada tipo esperado tiene que tener al menos un mensaje de ese tipo (y de ese autor, si se indicó, RF-39).
3. Completo → `armarBitacora(obra, fecha, 'completo')`.

**`armarBitacora(obra, fecha, motivo)`:**
1. Toma los mensajes `en_espera` de esa obra y esa fecha en orden de envío.
2. Los lleva uno por uno con `guardarEnBitacora` (fusión de 021/RF-88 y RF-92 a RF-93, ids fijos por mensaje, RF-44 y RF-54).
3. Pone la foto del día si falta: la primera imagen del reporte diario o de lo que lo complementa (RF-53).
4. Pasa cada mensaje a `guardado` y el día a `armada` o, con el motivo `vencido` o `a_mano`, a `incompleta` con `faltaron` (RF-47). La bitácora queda abierta (RF-45).

Si se corta a mitad, se repite completo: los mensajes ya llevados no duplican filas, por los ids fijos.

**El pulso (`pulso.ts`, cada 15 min desde n8n):**
1. Días con mensajes en espera cuya hora límite ya pasó (`diaVencido`: 12:00 del día siguiente en Colombia) → `armarBitacora(…, 'vencido')` (RF-46).
2. Hasta 30 mensajes `pendiente` con obra, del más antiguo al más nuevo → `procesarMensaje`. Así se vacía la bandeja al activar la spec (RF-68) y se reintentan los que fallaron.

## Decisiones técnicas

- **Procesar en la misma petición de la integración y repetir con un pulso** → se descartó una
  cola aparte porque PreOperaOCC no tiene trabajos de fondo y el VPS ya tiene n8n programando
  cosas. n8n entrega de a un mensaje (`batchSize: 1`), así que no hay dos procesos sobre la misma
  obra al mismo tiempo. El pulso cubre lo que falle y la hora límite.
- **Hora límite con un pulso de n8n** → se descartó un temporizador en el servidor web porque
  se pierde al reiniciar el contenedor, y n8n ya es el reloj de la integración.
- **Personas, volquetas y materiales con id fijo por obra y nombre (o placa)** → se descartó el id por
  mensaje (el de la 023) porque la misma persona nueva sale en muchos mensajes y quedaría
  repetida una vez por mensaje.
- **La marca de origen en una tabla aparte (`whatsapp_creados`)** → se descartó una columna en
  cada una de las cinco tablas porque «revisado» y «unido a» harían falta en las cinco. La tabla
  es una sola consulta para la lista.
- **Unir (RF-36) pasando los viajes y los renglones al registro bueno** → solo en lo que no es
  evidencia cerrada:
  - viajes vigentes de bitácoras abiertas;
  - renglones de bitácoras abiertas;
  - movimientos de almacén.

  Lo que está en una bitácora cerrada se queda como está, por el principio 4 de la constitución, y se avisa. Se descartó reescribir también lo cerrado.
- **Viajes repetidos por vale o por volqueta y 30 min** → se descartó comparar también la hora con
  vale: dos fotos del mismo vale son el mismo viaje aunque la IA lea distinto la hora.
- **El usuario de sistema como fila en `usuarios`** → se descartó dejar `registrado_por` nulo
  porque es obligatorio en viajes y movimientos y es lo que muestra el panel.

## Impacto en la sincronización

Sin impacto en la sincronización: nada viaja al celular.

## Contrato de API

| Ruta | Guardia | Quién | Respuesta |
| --- | --- | --- | --- |
| `POST /api/integraciones/whatsapp/mensajes` | integración | n8n | `{ estado, guardado }`. 500 si falla el proceso, para que n8n reintente (la recepción y el proceso son idempotentes) |
| `POST /api/integraciones/whatsapp/pulso` | integración | n8n | `{ diasArmados, procesados, conError }` |
| `GET /api/panel/whatsapp/dias?obraId&desde&hasta` | panel | residente (su obra) y gerencia | estado de cada día (RF-55 a RF-57) |
| `POST /api/panel/whatsapp/dias/:obra/:fecha/armar` | panel | `whatsapp:atender` | 409 si ya está armada o cerrada (RF-48) |
| `GET/PUT /api/panel/whatsapp/esperados?obraId` | panel | GET residente y gerencia; PUT `whatsapp:configurar` | la lista (RF-37 a RF-42) |
| `GET /api/panel/whatsapp/excepciones`, `POST …/:id/guardar`, `POST …/:id/descartar` | panel | `whatsapp:atender` | 400 con las faltas; 409 si ya se resolvió (RF-60 a RF-63) |
| `GET /api/panel/whatsapp/creados`, `POST …/:tipo/:id/revisado`, `POST …/:tipo/:id/unir` | panel | `whatsapp:atender` | 409 si ya está revisado o unido (RF-33 a RF-36) |

Todas las rutas del panel filtran por obra con `filtroDeObraEstricto`. Ninguna usa transacciones interactivas: los pasos con ids fijos y los `UPDATE` condicionados son los de la 021.

## Estrategia de verificación

- **`scripts/verificar-reglas.ts`**:
  - **Placa:** «TFO42O» → TFO420; dos candidatos → ninguno.
  - **Material y origen:** «Sub-base» → SUBBASE; «Cantera FORTUNE» → LA FORTUNE.
  - **Conductor:** escrito; por la maquinaria del reporte; por el preoperacional; preoperacional con dos personas → siguiente camino; último viaje.
  - **Viajes repetidos y faltantes:** `viajeRepetido` por vale y por volqueta a 29 y 31 min; `viajesQueFaltan` con 4 dichos y 3 guardados → 1.
  - **Datos por defecto:** `completarViaje` (hora de la foto, hora del mensaje, destino la obra); `placaRegistrable` («TFO42» no).
  - **Personas:** `decisionDePersona` en sus cuatro salidas.
  - **Tipo de reporte:** `tipoDeReporte` (un reporte con solo personal → `personal`).
  - **Día completo:** `diaCompleto` con lista vacía, con domingo y con autor indicado.
  - **Hora límite:** `diaVencido` a las 11:59 y a las 12:00 del día siguiente.
- **Demo manual**: la de los criterios de la spec, en «Pruebas spec 018», con mensajes `PRUEBA-024-…` mandados con curl por la integración, y luego los 27 vales del 7-oct en producción.
- **Comprobaciones extra**:
  - antes de desplegar, simular sobre una copia de los 27 vales de producción con `resolverPropuesta` y las reglas nuevas;
  - lo esperado: 27 volquetas, 27 materiales, 27 orígenes y 23 o más conductores reconocidos. Los 4 restantes salen del último viaje o se crean.

## Riesgos

- **Crear de más (personas o volquetas repetidas por una mala lectura).**
  - Se detecta en «Creado automáticamente».
  - Se arregla con «Es el mismo que…».
  - Mitigación: la coincidencia de dos palabras y la tolerancia de placa van antes de crear.
- **Un error de proceso que se repite en cada pulso.**
  - `error_proceso` lo deja escrito, y después de 5 intentos el mensaje pasa a excepción «no se pudo procesar».
- **Pérdida de la revisión humana.** Es la decisión de gerencia.
  - Lo guardado se ve en el historial con su mensaje.
  - Se anula como cualquier registro (RF-65 a RF-67).
- **Volver atrás.**
  - Se apaga el pulso en n8n y se devuelve la ruta de mensajes a solo recibir (variable `WHATSAPP_GUARDADO_AUTOMATICO=0`).
  - Los mensajes quedan `pendiente` en la bandeja, como hoy.
  - Lo ya guardado se queda, porque es evidencia.
- **El usuario de sistema aparece donde no debe.** Se filtra por su id en Personas, y la prueba de la demo lo revisa.
