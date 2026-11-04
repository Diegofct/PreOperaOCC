# Plan técnico — Spec 039 Ajustes de la bitácora, horas, medidores, formularios y accesos

> Estado: Aprobado (2026-11-03) · Spec aprobada el 2026-11-03.
> Lee antes `docs/constitucion.md` y el `spec.md` de esta carpeta.

## Idea general

Son siete ajustes independientes. Casi todos **quitan** reglas o **corrigen** caminos que ya existen, y lo único nuevo en la base es una columna. Van en este orden:

1. Primero las reglas puras, con sus pruebas: cierre sin foto por actividad, horas reportadas, marcas por sección, lectura de medidores y lectura anterior.
2. Después el servidor.
3. Al final las pantallas y la pasada de formularios, que es la parte más larga y no cambia comportamiento.

## Módulos y archivos

| Ajuste | Reglas | Servidor | Pantallas |
|---|---|---|---|
| Fotos (RF-1–5) | `rules/parte.ts` | `partes/[id]/cerrar+api.ts`, `partes/[id]/foto+api.ts`, `whatsapp/servidor/fotos-del-dia.ts`, `aprobacion.ts`, `dias.ts`, `excepciones.ts` | `pantalla-partes.tsx` (Actividades), `whatsapp/propuesta-reporte.tsx` |
| Horas (RF-6–10) | `rules/horas.ts`, `rules/reportes.ts` | `resumen+api.ts`, `reportes/servidor/datos.ts`, `partes+api.ts` | `pantalla-partes.tsx` (Personal), `reportes/pestana-personal.tsx`, `reportes/exportar.ts` |
| Marcas (RF-11–14) | `rules/parte.ts` | `partes/[id]+api.ts`, `cerrar+api.ts`, `partes+api.ts` | `pantalla-partes.tsx` (`SinRegistro` en 4 secciones más) |
| Medidores (RF-15–18) | **`rules/lecturas.ts` (nuevo)**, `rules/jornada.ts`, `rules/whatsapp.ts` | `contratos.ts` | `pantalla-partes.tsx`, `pantalla-vehiculos.tsx`, `propuesta-reporte.tsx`, reportes, `pantalla-maquinaria.tsx`, mantenimiento |
| Inicial ← final (RF-19–23) | `rules/jornada.ts`, `rules/whatsapp.ts`, `rules/whatsapp-automatico.ts` | `bitacoras/servidor/lecturas.ts`, `aprobacion.ts`, `partes/[id]+api.ts`, `cerrar+api.ts`, `dias.ts`, `excepciones.ts` | `pantalla-partes.tsx` (Maquinaria) |
| Formularios (RF-24–26) | — | — | `panel/componentes.tsx`, `secciones-con-indice.tsx` y luego todo el panel |
| RRHH (RF-27–28) | — | — | `pantalla-personas.tsx`, `empresas/pantalla-recursos-humanos.tsx`, `rrhh/vista-de-la-ficha.tsx` |
| n8n (RF-10, RF-15) | — | `n8n-evolutionapi/scripts/generar_workflow_clasificar.py` + plantillas | — |

## Modelo de datos

La migración **0038** solo agrega una columna:

```sql
ALTER TABLE partes_de_obra
  ADD COLUMN secciones_sin_registro jsonb NOT NULL DEFAULT '{}'::jsonb;
```

- Forma: `{ maquinaria?: {motivo: string|null}, personal?: …, notas?: …, fotografia?: … }`. Que la clave exista quiere decir que la sección está marcada.
- Tipo en `esquema.ts`: `.$type<SeccionesSinRegistro>()`.
- `sin_actividades`, `sin_ensayos` y sus motivos se quedan en sus columnas, porque los usan Reportes, WhatsApp y cierre, y migrarlos no aporta nada.
- No se tocan datos. La columna jsonb `horario` se queda, aunque las horas ya no la usen.

Las lecturas siguen como `doublePrecision` en `vehiculos` y como número en el jsonb de la bitácora, así que no hace falta migración para los decimales.

## Algoritmo / reglas

### Fotos (RF-1 a RF-5)
- En `bloqueosDelCierre`:
  - Se borra el bloque «Falta la fotografía de al menos una actividad».
  - `FotosDelParte` queda solo con `{ delDia: number }`.
  - La fotografía cuenta como llena si `delDia > 0` **o** si está marcada con motivo (RF-11).
- En `fotosDeLaBitacora`, se quita el `isNull(media.itemKey)` de la consulta de fotos «principales». Así las fotos que se subieron por actividad entran en la unión del día, y `unificarFotosDelDia` descarta las repetidas por `sha256`. Quitar una de esas fotos tiene que funcionar igual: se revisa cómo `quitarFoto` identifica las filas que solo están en `media`.
- `foto+api.ts` ignora `?item=`: toda subida va como foto del día y pasa por `agregarSubidaALaLista`.
- WhatsApp:
  - `FotosElegidas` queda solo con `{ delDia }`.
  - Se borran `porActividad`, su validación y el insert con `itemKey`.
  - El contrato de aprobación ya no lo acepta.
  - `propuesta-reporte.tsx` deja un solo selector de fotos del día.

### Horas (RF-6 a RF-10)
- `horasDeLaPersona(persona)` ya no recibe ni fecha ni horario. Si hay `horasLaboradas`, devuelve `{trabajados, extraDiurna, extraNocturna, extra}`; si no, `null`, que se lee como «Horas no reportadas».
- Se borran `horasNoCuadran`, `TOLERANCIA_MINUTOS`, `desglosarJornada` y `tramosDelDia`, salvo que otro módulo los use. Antes de borrarlos se busca con grep.
- `describirHorarioDelDia` y `horarioEfectivo` se quitan de bitácora, resumen y reportes. **El horario de la obra (spec 016) se conserva** si lo usa otra parte, como los horarios de WhatsApp. Se revisa caso por caso con grep.
- `validarPersonaDelParte` no cambia (RF-7).
- `reportes.ts`:
  - `DiaDePersona` sin `fuente`.
  - Un día sin horas reportadas lleva `laboradas: null`, que se muestra en blanco (D4).
  - Los avisos `diasConExtraDeMas` y `semanasConExtraDeMas` siguen sumando lo reportado.
- n8n: en el formato «Control de horas extras» se leen L, HED y HEN tal como vienen.

### Marcas por sección (RF-11 a RF-14)
- `SeccionSinRegistro` se amplía a `'actividades' | 'ensayos' | 'maquinaria' | 'personal' | 'notas' | 'fotografia'`, con sus textos en `NOMBRE_SIN_REGISTRO`.
- Para «filas», en `resolverSeccionSinRegistro`:
  - notas → `hayTexto(notas) ? 1 : 0`;
  - fotografía → cuántas fotos del día hay;
  - maquinaria y personal → su largo.
- `bloqueosDelCierre` usa `vaciaSinMarca` también para maquinaria, personal, notas y fotografía.
- `seccionesDelParte` marca `'no_aplica'` en la sección marcada con motivo.
- `textosSinRegistro` suma las cuatro nuevas, para la bitácora cerrada y para Reportes.
- `partes/[id]+api.ts` acepta `seccionesSinRegistro: Partial<Record<…, {marcada, motivo}>>` y resuelve cada una con `resolverSeccionSinRegistro`. Rechaza con `mensajeDeSeccionConRegistros` si la sección tiene filas.
- **Agregar filas a una sección marcada quita la marca**, como hoy pasa con actividades. Esto incluye una máquina que llega por WhatsApp o una foto que se sube.

### Medidores (RF-15 a RF-18)

Nuevo `rules/lecturas.ts`:

```
leerLectura(texto): number | null
  quita espacios y unidades (km, h, hr, horas)
  si tiene ',' y '.': el ÚLTIMO es el decimal; los otros se eliminan
  si solo ',': pasa a '.'
  si solo '.': es decimal (D: «5.830» = 5.83)
  Number(); NaN o < 0 → null; redondeo a 2 decimales

mostrarLectura(n, unidad?): '4250.32 km' | '812.5 h'
  sin separador de miles, hasta 2 decimales, sin ceros de más
```

- Contratos: `medidorParcial` y `medidorOpcional` sin `.int()`, con un refine de hasta 2 decimales (`Math.round(n*100) === n*100` con tolerancia).
- Se reemplazan:
  - `aNumero` (en partes y en vehículos);
  - `numeroDeTexto` para medidores (las horas siguen como están);
  - `CampoNumero` de la propuesta.
  - `cifra()` cuando muestra lecturas (las demás cifras siguen en `es-CO`), y los sitios de la tabla.
- `lecturaSugerida`: se quita la sugerencia de borrar el punto. RF-18 = `avisoDeLecturaInicial` / `validarAvance`, que ya avisan cuando la lectura retrocede; se revisa que no bloqueen.

### Inicial ← final (RF-19 a RF-23)
- `lecturasAnteriores(fecha, vehiculoIds?)`:
  - La consulta de bitácoras **ya no filtra por `obra_id`**: toma el último final del vehículo en cualquier obra, con `p.fecha < fecha`.
  - Los vehículos se cargan por id. La obra solo decidía qué vehículos ofrecer, y eso lo sigue haciendo el selector.
  - Se aprovecha el índice que ya existe sobre `partes_de_obra(fecha)`. En una prueba con muchas bitácoras se mira el `EXPLAIN` y, si hace falta, se limita la búsqueda a los últimos 90 días.
- `lecturaAnterior(bitacora, vehiculo, fecha)` elige **la más reciente por fecha**; si empatan, gana la bitácora. Hoy siempre gana la bitácora.
- Llamar a `completarIniciales` también en la aprobación manual (`aprobacion.ts`), antes de fusionar.
- `fusionarReporteEnParte`: al reemplazar la fila de un vehículo, si la nueva trae `medidorInicial` nulo y la anterior lo tenía, se conserva el anterior. Lo mismo con la final.
- **Propagación (RF-21)**, nuevo `propagarFinales(tx, parteId, cambios: {vehiculoId, finalViejo, finalNuevo}[])` en `bitacoras/servidor/lecturas.ts`:
  - Busca la siguiente bitácora **abierta** (no cerrada, no anulada) de cada vehículo con `fecha > fecha del parte`.
  - Si su inicial es nula o igual a `finalViejo`, la cambia por `finalNuevo`.
  - Va con la versión del parte y reintento, como los demás guardados de partes.
  - Se llama desde el PATCH de maquinaria, la aprobación de WhatsApp, `dias.ts` y `excepciones.ts` (guardado automático), y no desde el cierre: el cierre no cambia lecturas.
- Panel (RF-23): `partes+api.ts` ya manda `lecturasAnteriores` en las bitácoras abiertas. `SeccionMaquinaria` muestra en las filas con inicial vacía la lectura anterior como valor propuesto, ya escrito en el campo, y se guarda con «Guardar». No se guarda sola, para no escribir sin que el residente lo vea.

### Formularios (RF-24 a RF-26)
- **Base** en `componentes.tsx`:
  - `useAnchoDeCampo`: tres anchos según el dato (corto 120 para número u hora, medio 220, largo flexible).
  - `Campo`: etiqueta encima con margen fijo.
  - `RenglonDeCampos` y `FilaDeFormulario`: `flexWrap` con `gap` fijo (`Spacing`) y alineados arriba.
  - `Seccion` y `Tarjeta` con menos relleno.
  - `AccionesFormulario`: botón principal a la derecha y el secundario a su izquierda.
  - `Modal`: ancho máximo según el contenido.
- `FilaDeSeccion`: revisar los anchos de 200 y 240 con datos reales.
- Luego, en Chrome, una pasada por pantalla y por grupos, sin cambiar comportamiento:
  1. Bitácora de obra y de OCC.
  2. Propuesta de WhatsApp y «No se pudo guardar».
  3. Ventanas `ventana-*.tsx`.
  4. Compras, Tesorería, RRHH, Vehículos, Almacén, Cantera, Laboratorio, Contrato, Cortes y Empresas.
- Cada pantalla se revisa a 1366 px y a 390 px.

### RRHH (RF-27, RF-28)
- `pantalla-personas.tsx`:
  - En Elemental se llama `api.personas.listar()` **sin** `empresa`.
  - Se agrega un `Selector` «Empresa», con Todas como opción por defecto y las cuatro empresas, que filtra en el cliente por `empresaDeLaPersona`.
  - La pestaña de `pantalla-recursos-humanos.tsx` pasa a llamarse «Accesos y contraseñas».
- En la ficha (`vista-de-la-ficha.tsx`):
  - «Dar acceso» si `esGerencia && rol !== 'operador'` y la persona tiene usuario.
  - «Códigos» si `operaVehiculos(cargo)`.
  - Se reutiliza `VentanaDeSecreto` (se exporta desde `pantalla-personas.tsx` o se mueve a un archivo común), junto con `api.personas.generarClave` y `api.personas.generarCodigos`.
- El servidor no cambia.

## Decisiones técnicas

- La columna jsonb nueva para las marcas evita ocho columnas (marca y motivo por cada sección) y deja crecer la lista sin otra migración. Las dos marcas viejas no se mueven.
- Las fotos viejas se muestran **leyendo** también `media` con `itemKey`; no se copian a `bitacora_fotos`. Así no hay escritura masiva en producción y el cambio se puede deshacer.
- La propagación solo toca bitácoras **abiertas**, y solo si la inicial no se escribió distinta a mano (D3). Las cerradas no se reabren.
- Las horas viejas no se recalculan ni se migran (spec, casos límite).
- La app móvil queda fuera: el contrato `movil/preoperacionales` sigue en `.int()`.

## Impacto en la sincronización

Ninguno. La app móvil no lee partes ni lecturas con decimales, y la regla nueva no toca sus contratos.

## Contrato de API

- `PATCH /api/panel/partes/:id`: nuevo campo `seccionesSinRegistro?: {maquinaria?|personal?|notas?|fotografia?: {marcada?: boolean, motivo?: string|null}}`. Lecturas `medidorInicial` y `medidorFinal` con decimales.
- `GET /api/panel/partes…` devuelve `seccionesSinRegistro` y deja de devolver `horario` para las horas. Se mantiene si otra pantalla lo pide.
- `POST /api/panel/partes/:id/foto`: `?item=` se ignora.
- Aprobación de WhatsApp: `fotos: { delDia: string[] }`, sin `porActividad`.
- `PATCH/POST` de vehículos: lecturas con decimales.

## Estrategia de verificación

- `scripts/verificar-reglas.ts`:
  - Se actualizan las pruebas de foto por actividad y de horas calculadas (RF-14/15/16 de la 025).
  - Pruebas nuevas «039/…»:
    - `leerLectura`: «4250,32», «4250.32», «5.830», «4.250,32», «1,234.5», «812 h», «abc», «-3».
    - `mostrarLectura`.
    - `lecturaAnterior` por fecha.
    - Marcas en el cierre: marcada con motivo / sin motivo / con filas.
    - `fusionarReporteEnParte` conserva la inicial.
    - `horasDeLaPersona` sin horario.
  - typecheck, lint y reglas en verde.
- Prueba e2e contra el dev server (:8081) con script temporal `_tmp-039.ts` y datos PRUEBA-039, que se borra al final:
  - cierre sin foto por actividad y con fotos viejas visibles;
  - las cuatro marcas;
  - final 4250,32 el día D → inicial 4250.32 el día D+1, y propagación al corregir la final;
  - vehículo en otra obra;
  - aprobación de WhatsApp con solo la final.
- Revisión en Chrome: bitácora (las cuatro marcas, Personal sin desglose, Maquinaria con decimales), Reportes > Personal y su Excel, RRHH de Elemental (residente → «Dar acceso», operador → «Códigos») y la pasada de formularios.
- n8n: el prompt se prueba contra la API con mensajes reales que traen coma decimal y con un formato de horas extras.

## Riesgos

- **Pasada de formularios en todo el panel:** es grande y puede descuadrar pantallas que hoy se ven bien. Se cambia primero la base y se revisa pantalla por pantalla en Chrome antes de seguir.
- **Quitar fotos viejas que solo están en `media`:** hay que comprobar que `quitarFoto` las cubra. Si no, se agregan al vuelo a `bitacora_fotos` al quitarlas.
- **Lectura anterior entre obras:** con muchas bitácoras, la consulta sin `obra_id` puede ser más lenta. Se mide y se limita a 90 días si hace falta.
- **Prompt de n8n:** el cambio de horas y decimales afecta a todos los grupos. Se prueba antes de desplegar en la T23.
- **Horario de la obra:** se verifica con grep que nada fuera de las horas dependa de `horarioEfectivo` antes de quitarlo.
