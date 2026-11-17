# Plan técnico — Spec 046, Requisición en las obras y en GeoLab

> Lee antes `docs/constitucion.md` y el `spec.md` de esta carpeta.
> Aquí va el CÓMO. Si algo de esto cambia el comportamiento acordado, no se resuelve
> en el plan: se vuelve a la spec.
>
> Fecha: 2026-11-16 · Borrador para aprobar. Al planificar salió RF-85 (la Auxiliar conserva
> marcar lo recibido), que Diego decidió y ya está en la spec.

## La idea en una línea

**Una requisición es una solicitud de compra o de pago de las que ya existen, con dos cosas
más: un número RQ y un paso en la cadena.** No se crea una tabla nueva de requisiciones: todo lo
que pasa después de aprobar (compras, recibos, pagos, Compras por pagar, el gasto) ya funciona
sobre `solicitudes_compra` y `solicitudes_pago`, y la spec pide que siga igual (RF-38 a RF-44).

## Módulos y archivos

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `src/shared/rules/requisiciones.ts` (nuevo) | La cadena, pura: los pasos y su orden, `pasoInicial(quienPide, lugar, ocupados)`, `pasoSiguiente(paso, ocupados)` con salto repetido, `porQueNoPuedeDecidir(persona, requisicion, ocupantes)` (ocupa el paso, Gerencia, nunca quien la pidió), qué hace cada decisión (pasa, aprueba, devuelve, rechaza), `reacomodar` (RF-71), el estado «En aprobación: …», el número RQ, la vencida por renglón, las faltas por renglón (fecha y para qué), el orden y el resumen de la lista del lugar y de la bandeja, y la búsqueda por RQ, SC o SP. | RF-5, RF-11, RF-12, RF-16 a RF-37, RF-45 a RF-51, RF-71 a RF-83 |
| `src/shared/rules/compras.ts` | Corregir y cancelar de una RQ solo en Devuelta; en una RQ las faltas incluyen la fecha y el para qué de cada renglón; `recibir` también con `compras·listar`, así la Auxiliar lo conserva (RF-85); el recorte al aprobar sigue en `aprobacionDeLaSolicitud`. | RF-10 a RF-15, RF-34, RF-36, RF-81, RF-85 |
| `src/shared/rules/pagos.ts` | Corregir y cancelar de una RQ de pago solo en Devuelta. | RF-14, RF-36, RF-72, RF-79 |
| `src/shared/rules/permisos.ts` | Rol nuevo `administradora_elemental` al final de `ROLES`; su fila en cada módulo (la de la Auxiliar, más aprobar y anular en Compras y Tesorería); la Auxiliar queda en Compras con `ver, listar` y en Tesorería con `ver, listar, escribir`; módulo nuevo `aprobaciones` (la bandeja de Elemental) para `admin` y la Administradora; `PUEDE_DAR`: la Gerencia da el acceso y la Administradora da `operador`, como la Auxiliar; nombres y mensajes. | RF-39, RF-41, RF-42, RF-47, RF-57 a RF-64, RF-66 |
| `src/shared/rules/empresas.ts` | La Administradora, acceso sin obra de Elemental (`ACCESOS_SIN_OBRA`, `EMPRESA_DEL_ROL`); en las obras y GeoLab una sola entrada «Requisiciones» en lugar de las dos de solicitudes; OCC conserva las dos; Elemental gana «Requisiciones» (la bandeja). | RF-1, RF-47, RF-57, RF-65 |
| `src/shared/catalogos/cargos.ts` | Cargo `administradora_elemental` con su rol sugerido. | RF-57 |
| `src/db/servidor/esquema.ts` + `drizzle/servidor/0046_*.sql` | Ver «Modelo de datos». | RF-5, RF-10, RF-18, RF-57 |
| `src/features/requisiciones/servidor/cadena.ts` (nuevo) | Quién ocupa cada paso de una obra: el Residente activo de la obra, los Directores de Obra con la obra vigente, los Directores de Proyectos activos y las Administradoras activas (una consulta). | RF-18, RF-23, RF-71, RF-73 a RF-75 |
| `src/features/requisiciones/servidor/requisiciones.ts` (nuevo) | Crear una RQ de compra o de pago (inserta en la tabla que le toca con su número RQ y su paso); decidir en un paso; reacomodar las de una obra; la lista del lugar (RQ, SC y SP juntas) y la bandeja de Elemental. | RF-4 a RF-9, RF-18 a RF-37, RF-45 a RF-51, RF-71, RF-74 a RF-84 |
| `src/features/compras/servidor/solicitudes.ts`, `src/features/tesoreria/servidor/solicitudes-pago.ts` | Leer y escribir los campos nuevos; el detalle trae el paso, la cadena y quién puede decidir; corregir una RQ solo Devuelta y que al reenviar vuelva a la cadena; no cambiar de compra a pago al corregir (se corrige en su propia tabla). | RF-10, RF-13, RF-31, RF-36, RF-46, RF-78 |
| `src/app/api/panel/personas+api.ts`, `personas/[id]+api.ts` (rol, activo, obra, baja) y `personas/[id]/obras+api.ts` (obras del Director de Obra) | Después de su lote, llamar a `reacomodar` de las obras afectadas (la de antes y la de después). | RF-71 |
| `src/app/api/panel/requisiciones+api.ts` (nuevo) | `GET` lista del lugar, `POST` crear. | RF-1 a RF-15, RF-45, RF-49 a RF-52 |
| `src/app/api/panel/requisiciones/bandeja+api.ts` (nuevo) | `GET` la bandeja de Elemental. | RF-47, RF-48, RF-75, RF-83 |
| `src/app/api/panel/requisiciones/[tipo]/[id]/decision+api.ts` (nuevo) | `POST` aprobar, devolver o rechazar en el paso. | RF-25 a RF-34, RF-67, RF-76 a RF-81 |
| `src/app/api/panel/solicitudes-compra/…`, `solicitudes-pago/…` | Las SC y SP anteriores siguen aquí; sus pasos de aprobar ya los resuelve la tabla de permisos (Administradora y Gerencia). El `PATCH` de corregir lee los campos por renglón. | RF-36, RF-54, RF-55, RF-62, RF-66 |
| `src/features/requisiciones/` (nuevo, pantallas) | `pantalla-requisiciones.tsx` (lista del lugar con «Esperan mi aprobación» arriba), `formulario-de-requisicion.tsx` (compra o pago; reusa las partes de los dos formularios de hoy y añade fecha y para qué por renglón), `vista-de-la-requisicion.tsx` (paso, cadena con quién aprobó y quién sigue, decidir), `pantalla-bandeja.tsx` (Elemental). | RF-1 a RF-17, RF-45 a RF-52, RF-82 |
| `src/features/compras/pantalla-compras.tsx`, `src/features/tesoreria/pantalla-tesoreria.tsx` | Ya no aprueban: Compras lista lo aprobado para registrar compras; la pestaña «Solicitudes de pago» de Tesorería pasa a lo aprobado por pagar. | RF-38, RF-40, RF-84 |
| `src/features/panel/menu-lateral.tsx`, `src/app/panel/*/[pagina].tsx` | Ícono y página de «Requisiciones»; las direcciones viejas `solicitudes-compra` y `solicitudes-pago` de una obra o de GeoLab llevan a Requisiciones. | RF-1 |
| `src/features/panel/cliente-api.ts`, `src/features/panel/contratos.ts` (o un `requisiciones.ts` de contratos) | Contratos Zod del crear, la decisión y las respuestas. | RF-4 a RF-15, RF-25 a RF-34 |
| `scripts/verificar-reglas.ts` | Pruebas «046/». | todos los de regla |

## Modelo de datos

- **Local** (`src/db/local/schema.ts`): sin cambios. El móvil no ve requisiciones.
- **Servidor** (`src/db/servidor/esquema.ts`):
  - `rol_usuario`: `ADD VALUE 'administradora_elemental'` (al final, como en la 041).
  - Enum nuevo `paso_requisicion`: `residente | director_obra | director_proyectos | administradora`.
  - Secuencia nueva `requisicion_numero`, compartida por las dos tablas (RF-5).
  - `solicitudes_compra` y `solicitudes_pago`: `numero_requisicion integer` (nulo en las SC y SP anteriores, RF-53) con índice único parcial `where numero_requisicion is not null`, y `paso paso_requisicion` (nulo cuando no está en la cadena: las anteriores, y las RQ ya aprobadas, devueltas, rechazadas o canceladas).
  - `solicitud_compra_renglones`: `necesita_el date` y `para_que text`, nulos en los renglones anteriores; un `check` que los exige juntos.
  - En una RQ de compra, `para_cuando` de la cabecera guarda la fecha más cercana de sus renglones (así el orden y los índices de la bandeja de hoy siguen sirviendo) y `para_que` de la cabecera es la nota general (RF-9). En las SC anteriores siguen significando lo de antes.
  - La historia usa las tablas de eventos que ya existen (`solicitud_compra_eventos`, `solicitud_pago_eventos`), con pasos nuevos: `aprobar_paso` (con el paso en `cambios`), `saltar_paso` (con el motivo).
- **Migraciones**: `npm run db:generate:servidor` → `drizzle/servidor/0046_*.sql`. Se revisa a mano que añadir `numero_requisicion` **no** le ponga número a las filas que ya existen: la columna va sin `default`, y el número lo pone el `insert` con `nextval('requisicion_numero')`. Se aplica **solo en `neondb`**; producción va con el despliegue.
- **Compatibilidad**: los teléfonos no se enteran (nada de esto viaja al móvil). Las SC y SP anteriores no se tocan: sus columnas nuevas quedan nulas.

## Algoritmo / reglas

**1. Quién ocupa cada paso** (servidor, `cadena.ts`; la regla recibe el resultado):
`ocupados = { residente: [ids], director_obra: [ids], director_proyectos: [ids], administradora: [ids] }`
para una obra; para GeoLab solo `administradora`. Activo = `activo` y sin `eliminado_en`; el Director de Obra, además, con la obra vigente en `usuarios_obras` (RF-73: el paso del Director de Proyectos se ocupa con cualquiera del grupo).

**2. Dónde arranca** (`pasoInicial`, RF-18 a RF-23):
- GeoLab → `administradora`.
- Gerencia → `administradora` (RF-22).
- Almacenista → `residente`; Residente → `director_obra`; Director de Obra → `director_proyectos`; Director de Proyectos → `administradora` (RF-20, RF-21).
- Desde ahí, mientras el paso no sea `administradora` y no tenga a nadie en `ocupados`, se salta al siguiente, y cada salto queda en la lista que devuelve la regla para escribirlo en la historia (RF-23, RF-24). `administradora` nunca se salta (RF-74).

**3. Quién decide** (`porQueNoPuedeDecidir`, RF-25, RF-26, RF-67, RF-76): la requisición tiene que estar Enviada con paso; quien decide no puede ser quien la pidió (403); tiene que estar en `ocupados[paso]`, o ser `admin` (403 si no); la versión tiene que ser la que vio (409, RF-68).

**4. Qué hace la decisión**:
- Aprobar, siendo `admin` → Aprobada, paso nulo (RF-29).
- Aprobar en `administradora` → Aprobada, paso nulo (RF-28). Con el recorte de la 036 o la 037 (RF-34, RF-79, RF-81).
- Aprobar en otro paso → paso siguiente con el salto de la regla 2 (RF-27). El recorte no se acepta (RF-80).
- Devolver → Devuelta, paso nulo, con motivo (RF-30). Al reenviar, la regla 2 desde quien la pidió (RF-31).
- Rechazar → Rechazada, paso nulo, con motivo (RF-32).
- Excepción RF-77: si la pidió la Gerencia y no hay Administradora, otra persona de la Gerencia decide (la regla 3 ya lo permite: `admin` que no es quien la pidió).

**5. Reacomodar** (RF-71): para cada RQ Enviada de una obra cuyo paso (que no sea `administradora`) ya no tiene a nadie en `ocupados`, se mueve con la regla 2 y se anota el salto. Es idempotente: si no hay nada que mover, no escribe.

**6. Vencida** (RF-16, RF-17): compra → la fecha más cercana entre sus renglones aprobados (o pedidos, antes de aprobar) que no llegaron completos ya pasó; pago → su fecha pasó sin pagarse del todo. Fechas de Colombia (`fechaDeJornada`, RF-12).

## Decisiones técnicas

- **Columnas nuevas en las dos tablas que existen** → se descartó una tabla `requisiciones` nueva con sus renglones, porque obligaría a rehacer compras, recibos, pagos, Compras por pagar y el gasto, que cuelgan de `solicitudes_compra` y `solicitudes_pago` por llave foránea; la spec pide que todo eso siga como en la 036 y la 037 (RF-38 a RF-44). La lista del lugar junta las dos tablas al leer.
- **Un número RQ de una secuencia compartida, aparte de `numero`** → se descartó reutilizar `numero` (la identidad de cada tabla) porque compras y pagos tienen identidades separadas, y el RQ tiene que ser uno solo (RF-5). `numero` sigue existiendo por dentro y no se muestra en las RQ.
- **El paso como columna, y el estado de siempre (`enviada`) mientras recorre la cadena** → se descartó añadir estados por paso (`en_residente`, `en_director_obra`…) a los enums, porque el flujo de después de aprobar, los índices y las reglas de la 036 y la 037 preguntan por `enviada` y `aprobada`; el «En aprobación: Director de Obra» lo arma la regla con el paso (RF-82).
- **Quién decide lo dice la ocupación del paso, no la tabla de permisos** → se descartó un módulo `requisiciones·aprobar` para Residente y Directores, porque dejaría a un Residente aprobar en el paso del Director de Obra; el permiso real es «estar en ese paso de esa obra» (RF-25, RF-67). La tabla solo gana `aprobaciones` para la bandeja de Elemental.
- **Reacomodar al cambiar personas y al abrir la lista de la obra** → se descartó calcularlo solo al leer (sin escribir), porque la spec pide que el salto quede en la historia (RF-71, RF-24); y se descartó un trabajo programado, porque el servidor no tiene cola de trabajos. Se llama desde las rutas que cambian quién ocupa un paso y, como red de seguridad, al abrir Requisiciones de la obra (idempotente).
- **Decidir con una sola sentencia condicional** (`update … where id = ? and version = ? and estado = 'enviada' and paso = ?`) más el evento en el mismo `batch` → Neon no da transacciones interactivas; si la condición no pasa, 409 (RF-68), como hacen hoy los pasos de la 036 y la 037.
- **`recibir` también con `compras·listar`** → se descartó dejarle a la Auxiliar `compras·escribir`, porque eso es registrar compras (RF-63); `listar` lo tienen la Gerencia, la Administradora y la Auxiliar, que son quienes reciben desde Elemental (RF-85).
- **Las direcciones viejas de solicitudes llevan a Requisiciones** → se descartó dejar las dos páginas viejas vivas en las obras, porque serían dos puertas para lo mismo; en OCC siguen hasta la 047 (RF-65).

## Impacto en la sincronización

Sin impacto en la sincronización. Nada de esto viaja al móvil.

## Contrato de API

Todas abren con la guardia (`requerirSesion` / `requerirPermiso`) y el lugar sale de `alcance.ts` (`obraDelContrato`, `alcanzaLaEmpresa`), como Compras y Tesorería hoy. Errores: 400 forma, 401 sin sesión, 403 no le toca, 404 fuera de alcance (RF-69), 409 cambió o no está para eso, 422 faltas.

- `GET /api/panel/requisiciones?lugar=<obraId|geolab>` — `solicitudes·ver`. Responde la lista del lugar: RQ, SC y SP juntas, con tipo, número que se ve, estado o «En aprobación: …», marcas, `esperaMiAprobacion`, y sin valores al Almacenista (RF-52). Antes, reacomoda la obra.
- `POST /api/panel/requisiciones?lugar=` — `solicitudes·escribir` y no la Administradora (RF-8). Cuerpo: `{ tipo: 'compra', urgente, nota, proveedorSugerido, valorEstimado, renglones: [{ descripcion, materialId, cantidad, unidad, necesitaEl, paraQue }] }` o `{ tipo: 'pago', urgente, beneficiario, documento, concepto, valor, paraCuando, paraQue }`. 201 `{ tipo, id, numero: 'RQ-0001', paso }`; 422 con las faltas por campo (RF-11, RF-12, RF-15, RF-72). Los adjuntos van después, por la ruta de adjuntos que ya usa cada tipo.
- `GET /api/panel/requisiciones/bandeja` — `aprobaciones·listar`. Las RQ en el paso de la Administradora, más las SC y SP anteriores y las de OCC que esperan aprobación, marcadas (RF-47, RF-83); `{ filas, resumen: { esperan, urgentes, vencidas }, sinAdministradora: boolean }` (RF-48, RF-75).
- `POST /api/panel/requisiciones/[tipo]/[id]/decision` — `tipo` es `compra` o `pago`. Cuerpo `{ decision: 'aprobar' | 'devolver' | 'rechazar', version, motivo?, cantidades? (compra), valorAprobado? (pago) }`. 200 con el detalle; 403 si no ocupa el paso o es quien la pidió; 409 si cambió; 422 si falta el motivo o el recorte no vale.
- Corregir, reenviar, cancelar, adjuntar, recibir, registrar y anular compras y pagos: las rutas de la 036 y la 037 que ya existen, con las reglas nuevas.

## Estrategia de verificación

- **`scripts/verificar-reglas.ts`**, pruebas «046/»:
  - arranque por quién pide: Almacenista → Residente; Residente → Director de Obra; Director de Obra → Director de Proyectos; Director de Proyectos y Gerencia → Administradora; GeoLab → Administradora (RF-18 a RF-22);
  - saltos: obra sin Director de Obra, sin Residente ni Director de Obra, y que la Administradora nunca se salta (RF-23, RF-24, RF-74);
  - decidir: ocupa el paso sí, otro de la obra no, la Gerencia en cualquier paso deja Aprobada, nadie decide lo suyo, la Gerencia con su propia requisición y sin Administradora (RF-25 a RF-29, RF-76, RF-77);
  - devolver y reenviar vuelve al primer paso; rechazar cierra (RF-30 a RF-32);
  - recorte: solo Administradora y Gerencia, no todo en cero (RF-34, RF-79 a RF-81);
  - reacomodar: un paso que se queda vacío mueve lo que esperaba; sin cambios no escribe (RF-71);
  - faltas por renglón (fecha, para qué, fecha pasada en Colombia), las de pago, y que una corrección no cambia el tipo (RF-11, RF-12, RF-15, RF-72, RF-78);
  - vencida por renglón; orden y resumen de la bandeja; búsqueda por RQ, SC y SP; «En aprobación: …» (RF-16, RF-17, RF-45 a RF-51, RF-82);
  - permisos: la Administradora como la Auxiliar más aprobar y anular en Compras y Tesorería; la Auxiliar sin aprobar, sin registrar ni anular compras, sin anular pagos, pero con pagar y recibir; solo la Gerencia da el acceso; `aprobaciones` solo para Gerencia y Administradora (RF-39, RF-41, RF-42, RF-57 a RF-64, RF-66, RF-85);
  - menú: obras y GeoLab con «Requisiciones», OCC con las dos de siempre (RF-1, RF-65).
- **Demo manual**: la de los «Criterios de finalización» de la spec, en `PRUEBA-046`, con cuentas de prueba creadas como en la T28 de la 045 (Residente, Almacenista, Director de Obra, Director de Proyectos, Administradora, Auxiliar), cada una por `localhost` o `127.0.0.1` para no pisar la sesión de Diego.
- **Comprobaciones extra**: prueba de fugas (`npx expo export --platform web` y `grep` de secretos en `dist/client`) en las tareas que añaden rutas `+api.ts`; la migración, revisada a mano antes de aplicarla y solo en `neondb`.

## Riesgos

- **Que una vía que cambia a una persona no reacomode** → una requisición se queda en un paso sin nadie. Se detecta porque la lista de la obra reacomoda al abrirse y porque la vista de la requisición dice quién puede decidir (vacío = fallo). Se revierte llamando a `reacomodar` de esa obra.
- **Que la migración numere las SC y SP viejas como RQ** → se detecta al revisar el SQL generado (sin `default` en `numero_requisicion`) y con una consulta después de aplicarla: cero filas viejas con número RQ.
- **`ADD VALUE` de un enum no se puede deshacer** → si hubiera que retirar la Administradora, el valor queda sin uso (como pasó al renombrar en la 040), sin daño.
- **La Auxiliar pierde poderes de un día para otro** → es lo decidido (D4); el riesgo es operativo: si en producción no hay Administradora creada, lo que llega a ese paso espera a la Gerencia (RF-74, RF-75). Hay que crear la cuenta antes o justo después del despliegue: queda anotado para el despliegue.
- **Dos personas deciden a la vez** (dos Directores de Obra) → la sentencia condicional deja pasar una; la otra recibe 409 con quién decidió (`yaLaDecidioOtro` de la 040).
- **Pantallas de Compras y Tesorería que dejaban aprobar** → si quedara un botón viejo, la regla y el servidor igual lo rechazan (la tabla de permisos); la demo recorre las dos pantallas con la Auxiliar.

## Cambio del 2026-11-17 (RF-86 a RF-94, D15–D19)

Aprobado por Diego el 2026-11-17. Lo de arriba sigue valiendo salvo lo que dice esta sección.

### Módulos y archivos

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `src/shared/rules/requisiciones.ts` | `LugarDeLaRequisicion` gana `'occ'`, que arranca en la Administradora como GeoLab. `pasosDeLaPantalla` pasa a `'requisiciones' \| 'tesoreria'`: en Requisiciones de Elemental, decidir y además registrar, anular y recibir compras; en Tesorería, pagar y anular pagos. | RF-88, RF-89 |
| `src/shared/rules/empresas.ts` | OCC con `REQUISICIONES` en lugar de las dos solicitudes; Elemental sin «Compras»; `rutaRenombrada` lleva `occ/solicitudes-*` y `elemental/compras` a Requisiciones; la Auxiliar entra a Requisiciones de Elemental. | RF-86, RF-90, RF-92 |
| `src/shared/rules/permisos.ts` | `aprobaciones`: la Auxiliar gana `ver, listar` (sin `aprobar`). El permiso `compras` se queda: lo siguen pidiendo registrar, anular y recibir en el servidor; solo desaparece la página. | RF-92 |
| `src/db/servidor/esquema.ts` + `drizzle/servidor/0047_*.sql` | `solicitud_compra_renglones` gana `reemplazado_en` y `reemplazado_por_evento` (el evento `corregir` que lo reemplazó); el índice único `(solicitud_id, orden)` pasa a ser parcial sobre `reemplazado_en is null`. Solo en `neondb`. | RF-94 |
| `src/features/compras/servidor/solicitudes.ts`, `compras.ts`, `requisiciones/servidor/requisiciones.ts` | Corregir marca los renglones de antes (`update … set reemplazado_en`) en el mismo lote en que escribe los nuevos; toda lectura de renglones filtra `reemplazado_en is null`. | RF-70, RF-94 |
| `src/features/requisiciones/servidor/*` | OCC es un lugar de requisiciones (`lugarDeRequisiciones` deja de responder 400; `ocupantesDeLaCadena({ empresa: 'occ' })`); la bandeja pasa a ser la lista del grupo entero (RF-91): esperan mi aprobación arriba, luego abiertas y cerradas; el resumen sigue contando solo lo que espera el último paso; la marca «OCC», solo en las SC y SP de OCC anteriores. Las rutas viejas de crear SC y SP responden 409 también en OCC. | RF-83, RF-86 a RF-91 |
| `src/features/requisiciones/pantalla-requisiciones.tsx`, `pasos-de-gerencia.tsx`, `pasos-de-tesoreria.tsx` | Requisiciones de Elemental abre el detalle con los pasos de compra (`'requisiciones'`); Tesorería con los de pago (`'tesoreria'`). | RF-89 a RF-92 |
| `src/features/compras/pantalla-compras.tsx`, `src/features/empresas/paginas-de-empresa.tsx`, `src/features/tesoreria/pantalla-tesoreria.tsx` | Compras deja de ser una página de Elemental; su pestaña «Gasto» (`PantallaGasto`, con `veElGasto`) pasa a Tesorería. | RF-90, RF-93 |

### Decisiones técnicas

- **Reemplazar, no borrar (RF-94):** se marca la fila; no se crea una tabla de versiones. La historia sigue guardando `renglonesAntes`, como hoy, para leerla sin unir tablas.
- **La página Compras no se borra del código de golpe:** se quita del menú y de las páginas de Elemental; sus piezas (`BandejaDelGrupo`, `PantallaGasto`, los pasos) se reutilizan donde se mudan. Lo que quede sin uso se borra en la misma tarea.
- **Requisiciones de Elemental = la bandeja ampliada:** una sola consulta para todo el grupo, con el mismo orden de la lista de un lugar (`ordenDeRequisiciones`, esperan mi aprobación arriba). El volumen es el de Compras de hoy.

### Estrategia de verificación

- Pruebas «046/» nuevas antes del código: el arranque de OCC, el menú de OCC y de Elemental, los renombres, la Auxiliar en Requisiciones de Elemental sin aprobar, `pasosDeLaPantalla` con sus dos valores. Se actualizan las que fijaban lo contrario (OCC con sus dos solicitudes, Compras en el menú, la bandeja solo de la Gerencia y la Administradora).
- Migración 0047 revisada a mano y aplicada solo en `neondb`.
- En vivo y en Chrome: corregir una devuelta deja los renglones viejos marcados (consulta directa) y la lista muestra solo los nuevos; OCC pide y va directo a la Administradora; Elemental sin Compras, con todo en Requisiciones; el Gasto en Tesorería.

### Riesgos

- Una lectura de renglones que olvide el filtro mostraría los reemplazados junto a los vigentes: se buscan todas con `grep solicitudCompraRenglones` en la tarea del servidor.
- Producción sigue sin las migraciones 0042 a 0047 y sin estos datos de prueba: se aplican en el despliegue, nunca la siembra de prueba.

