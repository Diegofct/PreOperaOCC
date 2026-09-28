# Plan técnico — Spec 020

> Lee antes `docs/constitucion.md` y el `spec.md` de esta carpeta.
> Aquí va el CÓMO. Si algo de esto cambia el comportamiento acordado, no se resuelve
> en el plan: se vuelve a la spec.

## Idea central

El celular escoge el formato de una máquina buscando en su base local una plantilla con **el
mismo tipo de equipo** (`plantillaDeTipo`, `features/checklists/repositorio.ts`), y el pull
ya baja **todas** las filas de `plantillas` del servidor. El servidor reevalúa y el panel
resuelve el acta por `(tipo, versión)` (`api/movil/preoperacionales+api.ts`,
`api/panel/preoperacionales/[id]+api.ts`).

Así que un formato prestado es **una plantilla derivada**: la del tipo de origen, con las
mismas secciones y la misma versión, pero con `tipoVehiculo` del tipo que la toma prestada,
su propio título y una marca `prestadoDe`. Se genera en código a partir de la plantilla
vigente del origen, se siembra en las dos bases como cualquier otra, y el pull la entrega a
los celulares ya instalados. **Ningún código del celular cambia.**

## Módulos y archivos

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `src/shared/catalogos/tipos-vehiculo.ts` | `TipoVehiculo.formatoDe?: string`, el slug del tipo de origen. Los ocho tipos pierden `sinFormato` y ganan `formatoDe`. Nueva `formatoPrestadoDe(tipoId)`, que devuelve el nombre del tipo de origen o `null`. `formatoPendiente` no cambia. | RF-1…RF-8, RF-24, RF-25 |
| `src/features/checklists/types.ts` | `PlantillaChecklist.prestadoDe?: string`, opcional, así que las plantillas propias no cambian. | RF-14 |
| `src/features/checklists/plantillas/prestadas.ts` (nuevo) | `plantillaPrestada(origen, tipo, tipoOrigen)`: función pura que copia la plantilla y fija `tipoVehiculo`, `nombre`, `tituloFormato` y `prestadoDe`. | RF-9…RF-12, RF-16 |
| `src/features/checklists/plantillas/index.ts` | `PLANTILLAS` = propias vigentes + una derivada por cada tipo con `formatoDe`, construida desde la vigente del origen. `PLANTILLAS_POR_TIPO` las incluye. | RF-1…RF-8, RF-16 |
| `src/features/panel/pantalla-vehiculos.tsx` | En la fila, «Formato <origen>» en lugar de «Sin formato» cuando `formatoPrestadoDe` devuelve algo. En el formulario, al elegir el tipo, un aviso informativo con el formato de origen. | RF-18, RF-19 |
| `src/features/panel/detalle-preoperacional.tsx` | El dato «Formato» muestra `plantilla.tituloFormato` y la versión («Preoperacional Camión (formato Camioneta) · v3»). Si no hay plantilla, cae al `tipo vN` de hoy. | RF-13, RF-13b |
| `scripts/verificar-reglas.ts` | Casos nuevos; la lista esperada de «sin formato» pasa a vacía. | ver Verificación |
| `docs/despliegue.md` | Nada nuevo: la siembra de producción al cambiar el catálogo ya está documentada (spec 019). | — |

**Sin cambios de código, cubiertos por lo que ya existe:**

- **RF-10, RF-11:** el celular arma el formulario y evalúa con `src/shared/rules/inspeccion.ts` sobre la plantilla que encuentra. La derivada tiene los mismos ítems.
- **RF-12 en el celular:** el encabezado ya pinta `plantilla.tituloFormato` (`pantalla-preoperacional.tsx:548`), que llega en el esquema bajado.
- **RF-15:** la ingesta busca `plantillas` por `(tipoVehiculo, versión)` y reevalúa con esa.
- **RF-17, RF-23:** las filas no se borran; las propias no se tocan.
- **RF-20:** `resumen+api.ts` usa `formatoPendiente`, que pasa a `false` para los ocho.
- **RF-21, RF-22:** el pull entrega las filas nuevas; sin sincronizar, `abrirBorrador` sigue devolviendo `sin_formato`.
- **Borrador y versión nueva (spec 011):** `borradorCaduco` compara versiones y aplica igual.

## Modelo de datos

**Sin cambios de esquema.** `plantillas.esquema` es JSON y admite el campo opcional `prestadoDe`. Las filas nuevas son `camion-v3`, `carrotanque-v3`, `carro_taller-v3`, `excavadora_oruga-v2`, `excavadora-v2`, `montacargas-v2`, `vibrocompactadora-v2` y `recicladora-v2`.

- **Local:** sin migración. El APK instalado recibe las filas por el pull; uno nuevo, además, las siembra desde `PLANTILLAS` en `seed.ts`.
- **Servidor:** sin migración. Hay que sembrar: `db:sembrar:servidor` en desarrollo y `db:sembrar:produccion` en producción.
- **Compatibilidad:** el esquema derivado solo añade `prestadoDe`, que el código del APK instalado ignora. El pull guarda `esquema` tal cual, y el hash se calcula sobre `secciones`, que son idénticas a las del origen, así que la verificación de integridad no salta.

## Algoritmo / reglas

```
plantillaPrestada(origen, tipo, tipoOrigen):                       // RF-9…RF-12
  → { ...origen,
      tipoVehiculo: tipo.id,
      nombre: tipo.nombre,
      tituloFormato: `Preoperacional ${tipo.nombre} (formato ${tipoOrigen.nombre})`,
      prestadoDe: tipoOrigen.id }
  // secciones, versión, medidores, periodicidades y firmas: las del origen, sin tocar.

PLANTILLAS = [...propias,
              ...TIPOS_VEHICULO.filter(formatoDe)
                  .map(t => plantillaPrestada(PROPIAS_POR_TIPO[t.formatoDe], t, TIPO[t.formatoDe]))]
```

Como la derivada se construye siempre desde la **vigente** del origen, una versión nueva del origen produce una derivada nueva con el mismo número al sembrar (RF-16). La fila anterior sigue en la base para las actas ya firmadas (RF-17).

## Decisiones técnicas

- **Plantilla derivada con `tipoVehiculo` propio.**
  - Descartado: que el celular y el servidor traduzcan el tipo al tipo de origen al buscar la plantilla. Obliga a cambiar `plantillaDeTipo` en el celular, es decir, un APK nuevo, y eso choca con RF-21.
  - Descartado también: que el acta guarde `plantillaTipoVehiculo = camioneta`. El título diría «Camioneta» y el acta no sabría qué tipo de máquina era (RF-12).
- **Derivar en código, no copiar archivos JSON.**
  - Descartado: generar `camion.v3.json` con `npm run formatos`. Los JSON se regeneran desde el Excel y una copia no seguiría al origen (RF-16).
  - Descartado también: escribirlos a mano, que `AGENTS.md` prohíbe.
- **Misma versión que el origen.**
  - Descartado: numerar las derivadas por su cuenta. Con el mismo número, «formato Camioneta v3» significa lo mismo en el acta del camión y en la de la camioneta, y la regla de borrador caducado (spec 011) funciona sin cambios.
- **La correspondencia vive en el catálogo de tipos (`formatoDe`).**
  - Descartado: un mapa suelto en `plantillas/`. El catálogo de tipos ya es la fuente única que comparten las dos bases (RF-24), y ahí mismo se ve qué tipo tiene formato propio, prestado o ninguno (RF-25).
- **El título del panel sale del esquema de la plantilla, no de recalcularlo en la pantalla.**
  - Descartado: armar el texto en `detalle-preoperacional.tsx` a partir del tipo. El acta debe decir lo que decía el formato con que se firmó, aunque mañana cambie la correspondencia.

## Impacto en la sincronización

- **Pull:** ocho filas nuevas en `plantillas`, bajo el mismo upsert que las propias. Un celular que no ha sincronizado sigue en «sin formato» (RF-22). No se borra nada.
- **Push / outbox:** sin cambios. El acta de un camión sube con `plantillaTipoVehiculo = camion` y su versión, como cualquier otra.
- **Idempotencia:** sin cambios.
- **Reevaluación en servidor:** busca `camion` con la versión firmada y reevalúa con la plantilla derivada (RF-15). Si la fila no existiera, por ejemplo por haber desplegado sin sembrar, aplica el camino que ya existe para «plantilla desconocida». Ver Riesgos.

## Contrato de API

Sin endpoints nuevos ni cambios de forma:

- `GET /api/panel/preoperacionales/[id]` ya devuelve `plantilla` (el esquema completo), que trae `tituloFormato` y `prestadoDe`.
- `GET /api/panel/tipos-vehiculo` no cambia. El panel lee `formatoDe` del catálogo compartido, igual que hoy lee `sinFormato`.

## Estrategia de verificación

**`scripts/verificar-reglas.ts`:**

- **Correspondencia (RF-1…RF-8):** el `formatoDe` de cada uno de los ocho tipos es el acordado, y cada origen tiene plantilla propia vigente. Un origen que no existiera o que fuera a su vez prestado falla aquí.
- **Medidor (RF-9):** para cada tipo con `formatoDe`, su `claseMedidor` coincide con la del origen, y `medidores` de la derivada es igual al del origen.
- **Formato completo (RF-10, RF-16):**
  - las secciones de la derivada son idénticas (`deepEqual`) a las del origen vigente;
  - su `cadenaCanonicaDePlantilla` es la misma;
  - su versión es la del origen.
- **Mismas reglas (RF-11):** un juego de respuestas con un ítem que inmoviliza en «no conforme» da NO APTO con la derivada y con el origen. Con «na» da APTO en las dos.
- **Título (RF-12):** `PLANTILLAS_POR_TIPO.get('camion').tituloFormato === 'Preoperacional Camión (formato Camioneta)'`, y `prestadoDe === 'camioneta'`.
- **Id (RF-14):** `idDePlantilla` de la derivada es `camion-v3` y no choca con ninguna otra.
- **Sin formato (RF-20, RF-25):**
  - `formatoPendiente` es `false` para los 13 tipos;
  - la lista esperada de «sin formato» (prueba de la spec 019) pasa a `[]`;
  - un tipo inventado sin `formatoDe` ni plantilla sigue dando `formatoPendiente === true`.
- **Propias intactas (RF-23):** las cinco propias siguen siendo las mismas: id, versión y hash.

**Demo manual:**

1. En desarrollo, sembrar y reiniciar `npm run web`. En Vehículos, `PRUEBA-CAM-01` muestra «Formato Camioneta» y `PRUEBA-EXO-01` «Formato Retroexcavadora». Al elegir Montacargas en el formulario sale «Se revisará con el formato de la Motoniveladora». El inicio cuenta los dos equipos de prueba como pendientes.
2. En producción, después del despliegue, en el teléfono con el APK instalado:
   - sincronizar;
   - abrir el preoperacional del camión de prueba y ver el título;
   - marcar un ítem «No aplica»;
   - firmar;
   - en el panel, abrir el acta y ver «Preoperacional Camión (formato Camioneta) · v3».

**Comprobaciones extra:** no hay secretos nuevos ni rutas nuevas del operador. Los tres comandos en verde.

## Riesgos

- **Desplegar sin sembrar producción.**
  - Qué pasa: el panel dice «Formato Camioneta», porque lo lee del código, pero el celular no recibe la plantilla y sigue diciendo «sin formato».
  - Detección: la demo del teléfono.
  - Reversa: correr `db:sembrar:produccion`, que es idempotente. **Orden fijo: sembrar, luego desplegar.**
- **Sembrar sin desplegar.**
  - Qué pasa: los celulares reciben el formato y ya pueden firmar actas de camión, pero el servidor viejo, al reevaluar, encuentra la fila, así que funciona. Solo el panel viejo seguiría diciendo «Sin formato» y no contaría el equipo en el cumplimiento hasta desplegar.
  - Consecuencia: no se pierde nada.
- **El APK instalado rechaza el campo `prestadoDe` del esquema.**
  - Detección: la demo del teléfono antes de repartir nada. En el código del pull no hay validación estricta del esquema: se guarda tal cual.
  - Reversa: baja lógica (`eliminado_en`) de las ocho filas derivadas en producción. Los celulares vuelven a «sin formato» en la siguiente sincronización.
- **La spec 019 no se puede cerrar en el teléfono después de esto:** con la 020 desplegada, ningún tipo queda sin formato y el mensaje de su RF-14 ya no se puede ver.
  - Mitigación: **hacer la T7 de la 019 antes de desplegar la 020.**
- **Un formato de origen que cambia de versión con un camión a medio llenar:** el celular descarta el borrador y avisa (spec 011). Es el comportamiento acordado, no un fallo.
