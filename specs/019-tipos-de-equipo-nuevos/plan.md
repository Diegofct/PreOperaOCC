# Plan técnico — Spec 019

> Lee antes `docs/constitucion.md` y el `spec.md` de esta carpeta.
> Aquí va el CÓMO. Si algo de esto cambia el comportamiento acordado, no se resuelve
> en el plan: se vuelve a la spec.

## Módulos y archivos

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `src/shared/catalogos/tipos-vehiculo.ts` | Seis entradas nuevas con `sinFormato: true` y su `claseMedidor`; comentario de cabecera con la spec 019. | RF-1…RF-6, RF-8, RF-9, RF-11, RF-19, RF-20 |
| `src/shared/catalogos/llantas.ts` | Posiciones de los tipos nuevos; la excavadora de oruga no tiene entrada. El aviso «pendiente de validación por OCC» se extiende a ellos. | RF-15, RF-16, RF-17 |
| `src/shared/rules/cumplimiento.ts` (nuevo) | Función pura que cuenta el cumplimiento del día solo sobre los equipos con formato. | RF-21, RF-22, RF-23 |
| `src/app/api/panel/resumen+api.ts` | La flota trae `tipoVehiculoId`; el conteo pasa por la regla nueva; responde también `equiposInspeccionables`. | RF-21, RF-22, RF-23 |
| `src/features/panel/contratos.ts` | `ResumenFila.equiposInspeccionables`. | RF-22 |
| `src/features/panel/pantalla-inicio.tsx` | El pie del medidor usa `equiposInspeccionables`; si ninguno tiene formato, explica eso en vez de «Todavía no hay equipos registrados». | RF-22, RF-23 |
| `scripts/produccion.ts` (nuevo) | Extrae de `migrar-produccion.ts` el cambio de base a `preoperaocc` en memoria. | Despliegue |
| `scripts/migrar-produccion.ts` | Usa `scripts/produccion.ts`; comportamiento idéntico. | Despliegue |
| `scripts/sembrar-produccion.ts` (nuevo) + `package.json` | `npm run db:sembrar:produccion`: apunta a `preoperaocc` y ejecuta `sembrar-servidor.ts`. | Despliegue (criterio de finalización) |
| `scripts/sembrar-servidor.ts`, `src/db/local/seed.ts` | Solo el comentario («los cinco tipos» ya era falso). | — |
| `scripts/verificar-reglas.ts` | Casos nuevos (ver Verificación). | RF-8, RF-9, RF-11, RF-15…RF-17, RF-21…RF-23 |
| `docs/despliegue.md`, `AGENTS.md` («Actualizar el VPS») | Cuando cambia el catálogo, sembrar producción con `db:sembrar:produccion`. | Despliegue |

**Sin cambios de código, cubiertos por lo que ya existe:**

- **RF-7:** el formulario de Vehículos ya tiene Marca y Modelo (`pantalla-vehiculos.tsx`).
- **RF-10:** el formulario ya decide qué medidor pedir a partir de `claseMedidor` del tipo elegido (`pideOdometro` / `pideHorometro`).
- **RF-12:** la asignación no depende del tipo.
- **RF-13:** el listado y la ficha ya muestran la etiqueta «Sin formato» vía `formatoPendiente`.
- **RF-14:** en el celular, `abrirBorrador` (`features/checklists/repositorio.ts`) devuelve `sin_formato` cuando no hay plantilla del tipo. Decide por la plantilla, no por el catálogo empaquetado, así que también funciona en el APK del 25-sep.
- **RF-18:** el pull ya hace upsert de `tiposVehiculo` dentro de su transacción, antes de los vehículos.
- **RF-24 y RF-25:** `PATCH /api/panel/partes/[id]` admite cualquier equipo de la obra y valida el avance con `medidorDeClase(tipo.claseMedidor)`.
- **RF-26:** `resumen+api.ts` suma kilómetros u horas según `claseMedidor`.

## Modelo de datos

**Sin cambios de esquema.** Los tipos nuevos son filas del catálogo, no columnas. El enum `clase_medidor` ya tiene `odometro` y `horometro`, y las posiciones de llanta son slugs de texto.

- **Local:** sin migración. En una instalación nueva, `seed.ts` los siembra con `onConflictDoNothing`. En un teléfono ya activado, llegan por el pull.
- **Servidor:** sin migración. Hay que **sembrar** las dos bases: `db:sembrar:servidor` (desarrollo) y `db:sembrar:produccion` (producción).
- **Compatibilidad:** un teléfono con una versión vieja de la app recibe los tipos por el pull. No trae su entrada en el catálogo empaquetado, pero no la necesita:
  - el aviso de «sin formato» sale de la ausencia de plantilla;
  - el nombre del tipo viene en la fila bajada.

## Algoritmo / reglas

`src/shared/rules/cumplimiento.ts`. Es pura y sin imports: recibe cada equipo con su marca de formato ya resuelta.

```
cumplimientoDelDia(flota: { id, conFormato }[], inspeccionadosHoy: Set<id>)
  inspeccionables = flota.filter(conFormato)                      // RF-21, RF-22
  inspeccionados  = inspeccionables.filter(id ∈ inspeccionadosHoy).length
  sinInspeccionar = inspeccionables.length − inspeccionados       // RF-21
  cumplimiento    = inspeccionables.length === 0                  // RF-23
                      ? null
                      : round(inspeccionados / inspeccionables.length × 100)
  → { inspeccionables: length, inspeccionados, sinInspeccionar, cumplimiento }
```

En `resumen+api.ts`: `conFormato = !formatoPendiente(v.tipoVehiculoId)`. Las cifras siguen saliendo en el mismo lugar:

- `inspeccionadosHoy` = `inspeccionados`;
- `equipos` sigue siendo toda la flota (la cifra «Equipos activos» no cambia);
- `equiposInspeccionables` es el denominador.

## Decisiones técnicas

- **La regla de cumplimiento va en `src/shared/rules/`, pura y recibiendo `conFormato` ya resuelto.**
  - Descartado: dejar el filtro dentro del endpoint. Viola el principio 3 y no se podría probar en `verificar-reglas.ts` sin base de datos.
  - Descartado también: que la regla importe `formatoPendiente` del catálogo. Las reglas no tienen dependencias; el endpoint resuelve el catálogo.
- **El endpoint decide «sin formato» con el catálogo (`formatoPendiente`), no preguntando a la tabla `plantillas`.**
  - Descartado: el `join` contra plantillas. Es una consulta más para un dato que ya está en el bundle del servidor.
  - `verificar-reglas.ts` ya garantiza que marca y plantillas no se separan.
  - Así el inicio y la etiqueta del listado usan exactamente la misma fuente.
- **Los inspeccionados se cuentan como intersección con la flota con formato.**
  - Descartado: seguir usando `conFormato.size` del conjunto de preoperacionales del día. Con un equipo dado de baja o movido de obra después de inspeccionado, el porcentaje podía pasar de 100%.
  - Es el mismo número en todos los casos normales.
- **Slugs `camion`, `carrotanque`, `excavadora`, `excavadora_oruga`, `montacargas`, `carro_taller`.**
  - Descartado: los nombres con tilde o espacios. Los slugs son llave primaria y viajan en URLs y JSON; las tildes solo van en `nombre`.
  - Una vez desplegados, no se renombran.
- **Camión, carrotanque y carro taller: `DELANTERAS + dobles(2) + REPUESTO`, es decir 7 posiciones. Excavadora y montacargas: `DELANTERAS + TRASERAS_SIMPLES`, 4 posiciones.**
  - Descartado: reutilizar la configuración de la volqueta (doble troque). La spec dice un solo eje trasero.
- **Sembrar producción con un script propio (`db:sembrar:produccion`) que comparte con `migrar-produccion.ts` el cambio de base.**
  - Descartado: el procedimiento de `docs/despliegue.md`, que dice editar `.env` a mano y devolverlo. Es la trampa que ya costó una caída con las migraciones: `db:sembrar:servidor` siembra `neondb` y dice «Listo».
  - Descartado también: copiar las diez líneas en un segundo script. Si alguien cambia el nombre de la base, lo cambia en un solo sitio.

## Impacto en la sincronización

- **Pull:**
  - seis filas nuevas en `tiposVehiculo` del snapshot, con upsert, como las existentes;
  - ningún cambio en su orden: los tipos ya entran antes que los vehículos;
  - nada se borra.
- **Push / outbox:** sin impacto. Estos tipos no producen capturas nuevas; sin plantilla no hay preoperacional que subir.
- **Idempotencia:** sin cambios.
- **Reevaluación en servidor:** sin cambios. No hay preoperacionales de estos tipos.

## Contrato de API

Sin endpoints nuevos. `GET /api/panel/resumen` añade un campo a su respuesta:

- `equiposInspeccionables: number`: equipos activos visibles cuyo tipo tiene formato.
- `cumplimiento` pasa a ser `null` también cuando `equiposInspeccionables === 0`.
- `sinInspeccionar` e `inspeccionadosHoy` se cuentan solo sobre los equipos con formato.

La guardia (`requerirPermiso(…, 'inicio', 'ver')`) y el filtro por obra (`filtroDeObra`) no cambian. Es una sola consulta de lectura: no hace falta transacción.

## Estrategia de verificación

**`scripts/verificar-reglas.ts`:**

- Prueba «la marca de sin formato cuadra»: la lista esperada pasa a los ocho tipos sin formato. El bucle existente ya cubre marca contra plantilla (RF-11).
- Medidores (RF-8, RF-9): `camion`, `carrotanque` y `carro_taller` → `odometro`; `excavadora`, `excavadora_oruga` y `montacargas` → `horometro`.
- Llantas:
  - `camion`, `carrotanque` y `carro_taller` → 7 posiciones (RF-15);
  - `excavadora` y `montacargas` → 4 (RF-16);
  - `excavadora_oruga` → 0 (RF-17).
- Cumplimiento (RF-21 a RF-23):
  - flota mixta: los sin formato no cuentan en `sinInspeccionar` ni en el porcentaje;
  - flota solo sin formato → `null`;
  - flota vacía → `null`;
  - un id inspeccionado que no está en la flota no sube el porcentaje por encima de 100.
- Slugs únicos en `TIPOS_VEHICULO`.

**Demo manual** (desarrollo, tras `npm run db:sembrar:servidor` y reiniciar `npm run web`):

1. `/panel/vehiculos`: el selector trae los seis tipos nuevos.
2. Registrar un **Camión** marca Ford: pide solo kilometraje y sale la etiqueta «Sin formato». Cargarle una llanta: se ofrecen 7 posiciones.
3. Registrar una **Excavadora de oruga**: pide solo horas; la sección de llantas no ofrece posiciones.
4. Inicio: el camión no suma a «Sin preoperacional» y el pie dice «X de Y» con Y sin el camión. Una obra con solo equipos sin formato muestra el cumplimiento sin dato y el texto que lo explica.
5. Asignar el camión a un operador. En el teléfono con el APK instalado, sin reinstalar: sincronizar, ver el camión y, al abrir el preoperacional, la explicación de formato pendiente (RF-14, RF-18).
6. Parte del día: añadir el camión a maquinaria con km inicial y final, cerrar, y ver los km en el resumen (RF-24 a RF-26).

**Comprobaciones extra:**

- no se lee ningún secreto nuevo desde código de cliente, y los scripts corren en Node;
- no hay rutas nuevas del operador;
- `npm run verificar`, `typecheck` y `lint` en verde.

**Despliegue:** migrar no hace falta. Hay que correr `npm run db:sembrar:produccion`, desplegar la imagen, iniciar sesión en el panel del VPS y ver los tipos en el selector.

## Riesgos

- **Sembrar la base equivocada:** se siembra desarrollo, el panel de producción no muestra los tipos, y todo luce «Listo».
  - Detección: el script imprime host y base destino, como `migrar-produccion`; la demo en el VPS abre el selector.
  - Reversa: la siembra es idempotente; basta correrla contra la base correcta.
- **Desplegar la imagen sin sembrar** o sembrar sin desplegar:
  - La imagen sin siembra solo resta del inicio a vibrocompactadora y recicladora, y el selector no muestra tipos nuevos. No se rompe nada.
  - La siembra sin imagen muestra los tipos en el selector, pero el panel viejo no los reconoce como «sin formato» hasta desplegar. Por eso el orden es sembrar e inmediatamente desplegar.
- **Un slug mal escrito que llega a producción:** no se puede renombrar, porque es llave.
  - Detección: revisión en la tarea y caso de slugs en `verificar-reglas.ts`.
  - Reversa: baja lógica (`eliminado_en`) del slug malo y alta del correcto, antes de registrar equipos.
- **Configuración de llantas equivocada para la flota real** (pendiente de OCC): se corrige añadiendo o cambiando posiciones en el catálogo antes de que haya fichas. Las fichas ya guardadas conservan su slug.
- **Columna «Tipo» del listado (145 px):** «Excavadora de oruga» puede partirse en dos líneas. Es aceptable, no se desborda; se revisa en la demo.
