# Plan técnico — Spec 029

> Lee antes `docs/constitucion.md` y el `spec.md` de esta carpeta.
> Aquí va el CÓMO. Si algo de esto cambia el comportamiento acordado, no se resuelve
> en el plan: se vuelve a la spec.

## Módulos y archivos

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `src/shared/rules/jornada.ts` | `lecturaAnterior` (elige la de la bitácora o la del vehículo) y `avisoDeLecturaInicial` (aviso de RF-5 y origen de RF-9) | RF-1 a RF-5, RF-9 |
| `src/shared/rules/whatsapp-automatico.ts` | `completarIniciales(reporte, anteriores)` y `diaPorVenir(fecha, hoy)` | RF-7, RF-33 |
| `src/shared/rules/parte.ts` | `bloqueosDelCierre` deja de pedir observaciones por máquina | RF-15 |
| `src/shared/rules/ensayos-de-obra.ts` (nuevo) | `ensayosDeLosPartes`, `textoDeUbicacion`, `filtrarEnsayosDeObra` | RF-25 a RF-28 |
| `scripts/verificar-reglas.ts` | casos de todo lo anterior; ajustar los tres casos que esperaban «faltan las observaciones del día» | — |
| `src/features/bitacoras/servidor/lecturas.ts` (nuevo) | `lecturasAnteriores(obraId, fecha)`: una consulta a `partes_de_obra` (jsonb) y una a `vehiculos` | RF-1, RF-2, RF-7 |
| `src/app/api/panel/partes+api.ts` | el GET añade `lecturasAnteriores` a cada parte abierto | RF-1 a RF-5, RF-9 |
| `src/features/panel/contratos.ts` | `ParteFila.lecturasAnteriores`, y `EnsayoDeObraFila` | RF-1, RF-26 |
| `src/features/whatsapp/servidor/dias.ts` | `completarIniciales` antes de las faltas; no crear ni armar días por venir | RF-7, RF-8, RF-33, RF-34 |
| `src/features/whatsapp/servidor/excepciones.ts` | `completarIniciales` también al reintentar un renglón | RF-7 |
| `src/features/panel/componentes.tsx` | `CampoObservacion` (casilla + campo de 3 renglones) y la propiedad `renglones` de `Campo` | RF-10 a RF-14, RF-16, RF-18 |
| `src/constants/medidas.ts` | `CampoPanel.altoObservacion` | RF-12 |
| `src/features/panel/pantalla-partes.tsx` | Maquinaria: inicial sugerida, aviso y origen. Las cuatro secciones usan `CampoObservacion`. Personal sin `SelectorDeHora` | RF-1 a RF-6, RF-9 a RF-23 |
| `src/app/api/panel/laboratorio/ensayos-de-obra+api.ts` (nuevo) | GET con periodo y obra; alcance y módulo como granulometrías | RF-24 a RF-28, RF-32 |
| `src/features/panel/cliente-api.ts` | `api.laboratorio.ensayosDeObra` | RF-24 |
| `src/features/laboratorio/pantalla-laboratorio.tsx` | pestañas «Granulometrías» y «Ensayos de obra» | RF-24 |
| `src/features/laboratorio/ensayos-de-obra.tsx` (nuevo) | tabla, filtros, paginación y «Ver bitácora» | RF-25 a RF-31 |

## Modelo de datos

Sin cambios de esquema. Las lecturas anteriores salen de `partes_de_obra.maquinaria` (jsonb) y de `vehiculos.odometro_km` / `horometro_h` / `medidor_dia`. Los ensayos de obra salen de `partes_de_obra.laboratorio` (jsonb). Las filas viejas de Personal con `entrada` y `salida` no se tocan.

## Algoritmo / reglas

**Lectura anterior** (RF-1 a RF-3, RF-9), en `lecturasAnteriores(obraId, fecha)`:
1. Consulta a las bitácoras:
   ```sql
   select distinct on (m->>'vehiculoId') m->>'vehiculoId', (m->>'medidorFinal')::float8, p.fecha
   from partes_de_obra p, jsonb_array_elements(p.maquinaria) m
   where p.obra_id = $obra and p.fecha < $fecha and p.anulado_en is null
     and jsonb_typeof(m->'medidorFinal') = 'number'
   order by m->>'vehiculoId', p.fecha desc
   ```
   Así una bitácora con la máquina «sin lectura final» se salta y se usa la anterior que sí la tenga (caso límite).
2. Consulta a los vehículos de la obra, o sin obra, con su clase de medidor (`tipos_vehiculo`), lectura y `medidor_dia` (si es nulo, el día de `medidor_actualizado_en`).
3. Por vehículo, la regla pura `lecturaAnterior(deBitacora, delVehiculo, fecha)` decide:
   - gana la bitácora: `{ valor, fecha, origen: 'bitacora' }`;
   - si no hay, el vehículo, solo si su día es anterior a `fecha`: `{ valor, fecha, origen: 'vehiculo' }`;
   - si tampoco, `null`.
4. Resultado: `Record<vehiculoId, LecturaAnterior>`. Va en el GET solo para los partes abiertos (sin cerrar ni anular). En los demás va `{}`.

**Panel, Maquinaria** (RF-1, RF-4 a RF-6, RF-9):
- Al elegir «Añadir máquina», la fila nace con `inicial = String(anterior.valor)` si existe.
- `avisoDeLecturaInicial(inicial, anterior)` devuelve:
  - `ayuda`: «Final del 18-oct» o «Última lectura del vehículo (18-oct)» cuando coincide;
  - `aviso`: «No coincide con la final del día anterior (X)» cuando difiere.
- Aplica también a las filas ya guardadas, para avisar si alguien dejó otra inicial.
- Con la inicial vacía no hay aviso.

**WhatsApp** (RF-7, RF-8):
- En `llevarABitacora` (`dias.ts`), después de reconocer equipos y antes de `faltasDelReporte`:
  ```ts
  reporte = completarIniciales(reporte, await lecturasAnteriores(obraId, fecha))
  ```
- `completarIniciales` solo llena `medidorInicial` cuando es `null`, `medidorFinal` no lo es y hay lectura anterior.
- Si el avance resulta negativo o mayor que el tope, `faltasDelReporte` lo aparta como hoy (RF-8). No hace falta código nuevo para eso.

**Día por venir** (RF-33): `diaPorVenir(fecha, fechaDeJornada())` (`fecha > hoy`) corta al principio de `armarBitacora` y de `llevarLoQueEspera`, antes del `insert` en `whatsapp_dias`. La falta «posterior a hoy» ya la genera `faltasDelReporte` (RF-34).

**CampoObservacion** (RF-10 a RF-14, RF-16, RF-18):
- Propiedades: `valor`, `onChange`, `editable`, `obligatoria?`, `error?`, `ayuda?`.
- Estado interno `abierta`: arranca en `valor.trim() !== ''` u `obligatoria`.
- Al desmarcar guarda el texto en una referencia y llama `onChange('')`. Al volver a marcar lo devuelve. Así el texto se borra al guardar (RF-14) sin perderlo por un clic.
- Sin poder editar: muestra el texto en solo lectura, o «Sin observación».
- Con `obligatoria` la casilla queda marcada y deshabilitada (RF-16).
- El campo es `Campo multilinea renglones={3}` con un ancho de 360, el mismo esquema de ancho que los demás campos (`useAnchoDeCampo`), así que en menos de 768 px ocupa el renglón entero.

**Personal** (RF-19 a RF-23):
- Se quitan los dos `SelectorDeHora`.
- `entrada` y `salida` se conservan en el estado de la fila y se mandan tal cual.
- Una fila vieja que las trae muestra «Entrada 07:00 · Salida 17:00 (registro anterior)» en solo lectura, con su desglose calculado.
- L, ED y EN se ven siempre que se pueda editar.
- `validarPersonaDelParte` ya exige L o novedad cuando no hay entrada ni salida (RF-21). No cambia.

**Ensayos de obra** (RF-25 a RF-28):
- La ruta lee `id, obra_id, fecha, laboratorio, cerrado_en` de los partes no anulados del periodo.
- `ensayosDeLosPartes` aplana solo las filas con `esEnsayo`, porque los materiales de antes del 2026-09-16 no son ensayos.
- Cada ensayo sale con fecha, obra, ensayo, ubicación en texto (`formatearAbscisa` de `cantera.ts`), edad, resultado, unidad, cumple, responsable, `desdeWhatsapp`, `parteId` y si la bitácora está cerrada.
- Orden: fecha descendente y, dentro del día, hora de inicio.
- Los filtros por ensayo y por cumple se aplican en la pantalla (`filtrarEnsayosDeObra`), como en granulometrías.

## Decisiones técnicas

- Las lecturas anteriores van en el GET del día y no en una ruta aparte. Se descartó la ruta aparte porque obliga a una segunda petición al añadir cada máquina, y el RNF pide menos de 1 s. Además el GET ya es por día y por obra, así que solo cuesta dos consultas por parte abierto.
- Lo de la bitácora gana sobre lo del vehículo. Se descartó «la más reciente de las dos» porque la spec lo fija así (RF-1, RF-2). Además la lectura del vehículo puede venir de otra obra o de un reporte procesado tarde.
- El servidor sigue aceptando `entrada` y `salida` en Personal. Se descartó rechazarlas en `personalDelParte` porque esa función la comparte WhatsApp, donde la spec 025 las deja opcionales, y porque las filas viejas las traen y deben seguir guardándose igual. El panel deja de mandarlas nuevas (RF-20).
- Ensayos de obra en solo lectura, sobre el jsonb, sin tabla nueva. Se descartó copiar los ensayos a una tabla de Laboratorio porque el usuario eligió «lista automática»: una copia se desincroniza cuando se corrige la bitácora (RF-31).
- `renglones` como propiedad de `Campo`. Se descartó un `TextInput` propio en `CampoObservacion` para no duplicar foco, error, ayuda y responsive.

## Impacto en la sincronización

Sin impacto en la sincronización. Es solo el panel web y el servidor.

## Contrato de API

- `GET /api/panel/partes?fecha=`: cada `ParteFila` suma `lecturasAnteriores: Record<string, { valor: number; fecha: string; origen: 'bitacora' | 'vehiculo' }>`. Es `{}` en los partes cerrados o anulados.
- `GET /api/panel/laboratorio/ensayos-de-obra?desde=&hasta=&obraId=`:
  - permiso `laboratorio:listar`, con `filtroDeObra` y `filtroDeModulo('laboratorio')`;
  - 400 si las fechas faltan, están al revés o el periodo pasa de 366 días;
  - responde `{ ensayos: EnsayoDeObraFila[] }`.

## Estrategia de verificación

- **`scripts/verificar-reglas.ts`**:
  - `lecturaAnterior`: bitácora gana; vehículo del mismo día o posterior → `null`; nada → `null`.
  - `avisoDeLecturaInicial`: coincide, difiere, vacía.
  - `completarIniciales`: llena, no pisa una inicial escrita, sin final no llena.
  - `diaPorVenir`.
  - `bloqueosDelCierre`: una máquina sin observaciones ya no bloquea, y se ajustan los tres casos viejos.
  - `ensayosDeLosPartes`: salta los materiales; ubicación PR, tramo y lugar; orden.
  - `filtrarEnsayosDeObra`.
- **Demo manual**: en Chrome sobre dev, obra «Pruebas spec 018 (laboratorio)», con bitácoras de prueba de dos días seguidos:
  1. Agregar PRUEBA-026-REC el segundo día → inicial = final del primero, con «Final del …».
  2. Cambiarla → aviso.
  3. Casilla de observación en las 4 secciones, más la vista cerrada y el celular de 390 px.
  4. Personal sin entrada ni salida.
  5. Laboratorio → «Ensayos de obra» con filtros y «Ver bitácora».
- **WhatsApp en dev**: mensaje `PRUEBA-029-T*` con una máquina sin inicial → la bitácora la guarda con la final del día anterior; con fecha futura → no hay fila nueva en `whatsapp_dias`.

## Riesgos

- Una lectura final mal digitada un día se arrastra al siguiente. Lo mitiga el aviso (RF-5) y la validación del tope, que sigue igual. Se revierte corrigiendo el día anterior.
- Quitar el bloqueo de observaciones cambia la regla de cierre de la 004. Las bitácoras ya cerradas no se reevalúan.
- La consulta jsonb sobre todas las bitácoras anteriores de la obra crece con el tiempo. Con `distinct on` e índice `(obra_id, fecha)` va bien para años de una obra. Si no, se acota a 60 días.
- En producción queda el día 24-oct mal armado. Se borra con permiso del usuario en el despliegue (T12).
