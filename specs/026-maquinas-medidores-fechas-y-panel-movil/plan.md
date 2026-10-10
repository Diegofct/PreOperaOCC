# Plan técnico — Spec 026

> Lee antes `docs/constitucion.md` y el `spec.md` de esta carpeta.

## Lo que hay hoy

- **Reconocer un equipo.** `candidatosDeVehiculo` (`shared/rules/whatsapp.ts:225`) busca solo por
  placa o código (igual, contenido, o con caracteres confundibles). `VehiculoConocido` no trae
  ni tipo ni marca.
- **Crear un equipo.** `crearVolqueta` (`whatsapp/servidor/creacion.ts:123`) registra solo
  volquetas con placa. `llevarABitacora` (`dias.ts`) la llama si hay placa y no hay candidatos.
- **Lecturas del vehículo.** Se actualizan únicamente al cerrar la bitácora, con `greatest`
  (`partes/[id]/cerrar+api.ts:143`). Las columnas `vehiculos.odometro_km` y `horometro_h` son
  `integer` en el servidor y en el SQLite del teléfono.
- **Propuesta de la IA.** Las máquinas traen `equipo`, `operador`, `medidor_inicial`,
  `medidor_final` y `observacion`, sin unidad.
- **Prod 2026-10-09.** CONSORCIO MAGDALENA tiene REC-01 «WIRTGEN WR 2000», VIBROCMP-01 «DYNAPAC»,
  MOTONV-01 «KOMATSU» y los retrocargadores, que ya se reconocen por su placa MC…. No existen el
  montacarga, la segunda motoniveladora ni el vibrocompactador Volvo.

## Módulos y archivos

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `src/shared/rules/whatsapp.ts` | `VehiculoConocido` + `tipoId`, `tipoNombre`, `marca`, `modelo`; `tipoDeEquipo(texto)`; `reconocerMaquina` (placa/código → modelo exacto → tipo+marca) que dice cómo reconoció; `resolverPropuesta`: unidad del medidor, tipo y marca de la IA, y RF-6 (dos renglones al mismo equipo por tipo+marca → los dos sin equipo y con `conflicto`); `faltasDelReporte`: mensaje de RF-6 y clase por unidad | RF-1 a RF-7, RF-13, RF-16, RF-17 |
| `src/shared/rules/jornada.ts` (o `medidores.ts` nuevo) | `faltaContraElVehiculo(clase, final, registrado, diasDesde)` | RF-18, RF-19 |
| `src/features/whatsapp/servidor/catalogos.ts` | equipos con tipo, marca, modelo y lecturas; `lecturaDe(vehiculoId, clase)` | RF-1, RF-18 |
| `src/features/whatsapp/servidor/creacion.ts` | `crearMaquina({obraId, tipoId, marca, escrito, mensajeId})`: id determinista por obra+escrito, código `WA-<TIPO>-<4>`, modelo = escrito | RF-8 a RF-12, RF-14 |
| `src/features/whatsapp/servidor/dias.ts` y `excepciones.ts` | crear máquinas sin placa; contexto con lecturas para las faltas | RF-8, RF-22 |
| `src/features/whatsapp/servidor/aprobacion.ts` | después de escribir la bitácora, `actualizarMedidores` (por unidad, `greatest`, `medidor_actualizado_en`); `claseMedidor` de la fila por unidad | RF-15 a RF-17, RF-20 |
| `src/features/bitacoras/parte.ts` y `servidor/secciones.ts` | `MaquinaPedida.claseMedidor?`, que cambia la del tipo | RF-16 |
| `src/db/servidor/esquema.ts` + migración 0022 | `odometro_km` y `horometro_h` a `double precision` | RF-20 |
| `src/db/local/schema.ts` | `real` en las dos columnas (SQLite no necesita migración de datos; el tipo de TS sigue siendo `number`) | RF-20 |
| `src/features/panel/pantalla-vehiculos.tsx` | lecturas con un decimal y la fecha de actualización; marca «Desde WhatsApp» en máquinas (ya existe para volquetas) | RF-11, RF-21 |
| `src/features/whatsapp/servidor/bandeja.ts`, `excepciones.ts` | orden por día ascendente y hora ascendente | RF-26, RF-27 |
| `src/features/panel/componentes.tsx` | `CampoDeFecha` (`<input type="date">` del navegador, con `min` y `max`); altura común de 40 px; alineación al borde inferior en `Acciones` y `FilaDeFormulario`; etiquetas arriba; columna de acciones de ancho fijo | RF-24, RF-25, RF-28 a RF-32 |
| `src/features/panel/whatsapp/filtro-de-fechas.tsx`, `estado-del-dia.tsx`, `listado-viajes.tsx`, `laboratorio/pantalla-laboratorio.tsx` | usan `CampoDeFecha` | RF-24, RF-25 |
| `src/features/panel/usar-ancho.ts` (nuevo) | `useEsAngosto()` (< 768 px) con `useWindowDimensions` | RF-33 a RF-41 |
| `menu-lateral.tsx`, `estado-menu.tsx`, `barra-superior.tsx`, `marco.tsx` | menú oculto con ☰ por debajo de 768, que se cierra al elegir | RF-33, RF-34 |
| `componentes.tsx` (`Acciones`, `FilaDeFormulario`, `Campo`, `Selector`, `Tabla`, `Modal`, `Boton`) | una columna, tabla con `ScrollView` horizontal, modal a pantalla completa y 40 px en lo angosto | RF-35 a RF-37, RF-40 |
| `secciones-con-indice.tsx` | índice como desplegable en lo angosto | RF-38 |
| n8n `generar_workflow_clasificar.py` | `maquinaria[].unidad_medidor` («km», «h»), `tipo_equipo` y `marca` | RF-1, RF-9, RF-16 |
| `scripts/verificar-reglas.ts` | casos nuevos | — |

## Modelo de datos

- **Migración 0022** (`npm run db:generate:servidor`):
  `alter table vehiculos alter column odometro_km type double precision`, y lo mismo con
  `horometro_h`. Es aditiva en la práctica: los enteros se conservan. Hay que aplicarla en dev y
  en producción **antes** de la imagen nueva. La imagen vieja lee `double` sin problema.
- **Teléfono.** El pull manda números con decimal. El SQLite guarda reales en una columna
  `integer` sin perder nada, y la fusión (`mayorMedidor`) compara números. Basta con cambiar el
  tipo en `src/db/local/schema.ts` a `real`, sin migración local (una migración de Drizzle en
  SQLite recrearía la tabla). Se verifica que `npm run db:generate` no genere nada que rompa.
- **Máquinas creadas.** Van en `vehiculos` con `tipo_vehiculo_id`, `marca`, `modelo` = escrito,
  `codigo_interno` = `WA-<TIPOID>-<4 primeros de un hash>`, sin placa, y en `whatsapp_creados`
  como `vehiculo`.

## Algoritmo / reglas

1. **`tipoDeEquipo(texto)`** (RF-2): para cada tipo del catálogo, `t = compacto(nombre)`.
   Coincide si `compacto(texto)` empieza por `t`, o por `t` sin su última letra (s/a). Gana el
   `t` más largo («Excavadora de oruga» antes que «Excavadora»). Si la IA trae `tipo_equipo`,
   se prueba primero.
2. **Marca** (RF-3): un equipo coincide si `compacto(texto)` contiene `compacto(marca)`, o
   contiene la primera palabra de la marca si tiene 4 letras o más («wirtgen»). Si la IA trae
   `marca`, se prueba con ella también.
3. **`reconocerMaquina(texto, ia, vehiculos, obra)`** devuelve `{ id, como }`:
   - placa/código (lo de hoy) → `como: 'placa'`;
   - si no, modelo exacto (`compacto(modelo) === compacto(texto)`, RF-14) → `'modelo'`;
   - si no, tipo y marca → `'tipo_marca'`;
   - con 2 o más candidatos → `id: null` y `candidatos` (RF-5).
4. **RF-6.** En `resolverPropuesta`, si dos renglones quedan con el mismo id por `'tipo_marca'`,
   los dos pasan a `vehiculoId: null` con `conflicto: true`. `faltasDelReporte` dice el motivo de
   RF-6, y `llevarABitacora` no crea nada para un renglón en conflicto.
5. **Crear** (RF-8, RF-13): en `llevarABitacora`, para un renglón sin equipo y sin conflicto:
   - si tiene placa → `crearVolqueta` (como hoy);
   - si no, y el tipo se reconoce y no hay candidatos → `crearMaquina`.
6. **Unidad** (RF-16, RF-17): `unidadMedidor` sale de la IA, o de «km»/«hr»/«h» en el texto.
   La clase de la fila es la de la unidad, o si no hay unidad, la del tipo.
7. **Contra el vehículo** (RF-18, RF-19): con la lectura registrada `R` de esa clase y su fecha
   `F`:
   - sin `R`, no hay falta;
   - `final < R` → «La lectura (X) es menor que la registrada en Vehículos (R)»;
   - `final − R > tope × max(1, días(fechaDelReporte − F))` → «Son más de …»;
   - el tope es 24 h u 800 km.
   Va en `faltasDelReporte` por medio de `contexto.lecturaDe`.
8. **Actualizar** (RF-15, RF-20, RF-23): después del `UPDATE` de la bitácora en
   `guardarEnBitacora`, para cada máquina con lectura final:
   `update vehiculos set <col> = greatest(coalesce(<col>, 0), final), medidor_actualizado_en = now() where id = …`.
   Es idempotente.
9. **Orden** (RF-26, RF-27): `order by diaDelMensaje asc, enviado_en asc`.
10. **Celular** (RF-33 a RF-41): un solo ayudante, `useEsAngosto`. Los componentes cambian su
    estilo; las pantallas no. Las tablas van dentro de un `ScrollView horizontal` solo en lo
    angosto. En escritorio todo queda igual, y la prueba de anchos no cambia.

## Decisiones técnicas

- **Calendario nativo** (`input type="date"`). Se descartó una librería de calendario: la
  constitución pide pocas dependencias, y el navegador del celular ya trae un selector cómodo.
- **Tipo y marca por la IA, con una regla de respaldo.** Se descartó usar solo reglas sobre el
  texto, porque «Montacarga a Diesel» no tiene marca, y adivinarla del texto crearía la marca «a
  Diesel».
- **`double precision`.** Se descartó `numeric` porque Drizzle lo devuelve como texto y
  obligaría a convertir en todas partes.
- **Responsive en los componentes.** Se descartó tocar pantalla por pantalla: son más de 20
  pantallas, y el panel ya tiene el régimen angosto del menú (022) como base.

## Impacto en la sincronización

- **Pull:** las lecturas llegan con decimal. La app las muestra como número.
- **Push:** sin cambios.

## Estrategia de verificación

- **`verificar-reglas.ts`:**
  - `tipoDeEquipo` («Vibrócompactador Volvo», «Montacarga a Diesel», «Excavadora de oruga»);
  - `reconocerMaquina` (WIRTGEN, DYNAPAC, dos Komatsu → conflicto, modelo exacto);
  - la unidad del medidor;
  - `faltaContraElVehiculo` (menor, salto con días, sin registrada);
  - el orden de la bandeja (función pura de comparación).
- **Dev:**
  - el 8-oct entregado a una obra de prueba con equipos como los de CONSORCIO MAGDALENA;
  - las lecturas de los vehículos actualizadas;
  - lo creado en «Creado automáticamente».
- **Chrome:**
  - el calendario y el orden;
  - la alineación;
  - a 390 px: el menú ☰, los filtros apilados, las tablas desplazables, el modal a pantalla
    completa, el índice de la bitácora y que la página no se desplace a lo ancho.
- **Producción:** migración 0022, imagen, n8n, reproceso del 8-oct, y la lista de vehículos con
  sus lecturas.

## Riesgos

- **Migración en producción antes de la imagen.** Si falla, la imagen vieja sigue funcionando.
  Para volver atrás, `alter … type integer using round(…)`.
- **Que una máquina se reconozca mal por tipo y marca.** Se mitiga con RF-5 y RF-6, y lo creado
  se puede unir.
- **Que el responsive rompa el escritorio.** Todo va detrás de `useEsAngosto`, y la prueba de
  anchos y una pasada en Chrome a 1280 px lo cuidan.
