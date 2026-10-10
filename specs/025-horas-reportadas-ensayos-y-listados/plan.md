# Plan técnico — Spec 025

> Lee antes `docs/constitucion.md` y el `spec.md` de esta carpeta.
> Aquí va el CÓMO. Si algo de esto cambia el comportamiento acordado, no se resuelve
> en el plan: se vuelve a la spec.

## Diagnóstico con datos de producción (2026-10-09, solo lectura, con permiso del usuario)

El mensaje `3EB024B22E22EB9C3B2A3D` (Catalina Chaparro, «Reporte octubre 8 de 2026», 5 777
caracteres) quedó `guardado` con 51 renglones en «No se pudo guardar»:

- **Personal, 37 renglones.** Todos con `entrada`/`salida` en null. La IA escribió las horas en
  la observación: «Ingenieros. L: 8 h, ED: 0 h, EN: 0 h». La persona sí se reconoció.
- **Ensayos, 4 renglones.**
  - Los 4: «Elija la hora de fin del ensayo».
  - El primero además: «Los metros van de 0 a 975, de 25 en 25», porque el tramo se leyó como `{pr:0, metros:70}`.
  - La IA ya los asoció a `compresion_simple`, y la edad y el resultado quedaron dentro de la observación.
- **Maquinaria, 9 renglones.** Están fuera de esta spec:
  - 5 máquinas que no se reconocen por su nombre, la mejora ya anotada en la 024;
  - lecturas mal escritas en el reporte: «18740.7 km» y horómetros de 2 000 h.
- **«bitacora», 1 renglón.** «Alguien guardó la bitácora de ese día mientras se aprobaba», **aunque
  la bitácora sí quedó escrita**. Las actividades llevan `aprobadoEn` …25.210Z y el clima y la
  maquinaria …25.216Z. Son **dos llamadas** a `guardarEnBitacora` sobre el mismo mensaje en el mismo
  segundo, a las 04:15, cuando coinciden la entrega (cada 5 min) y el pulso (cada 15 min). Es un
  defecto de la 024 y se arregla aquí, en T21, porque reprocesar el 8-oct depende de ello.

## Módulos y archivos

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `src/features/bitacoras/tipos.ts` | `PersonaDelParte` + `horasLaboradas?`, `extraDiurnas?`, `extraNocturnas?`, `novedad?`; `EnsayoDelParte` + `edadDias?`, `resultado?`, `unidad?`, `cumple?`; `UbicacionDelEnsayo` + forma `{ desde, hasta }` | RF-1–3, 18, 31, 34–36 |
| `src/shared/catalogos/bitacora.ts` | `NOVEDADES_DE_PERSONAL` (4) | RF-18 |
| `src/shared/rules/horas.ts` | `validarHorasReportadas`, `validarPersonaDelParte`, `horasDeLaPersona` (reportadas o calculadas), `horasNoCuadran` | RF-4–12, 14–16, 19, 20 |
| `src/shared/rules/parte.ts` | `faltasDelEnsayo` (fin opcional, metros 0–999, tramo, observación o resultado); cierre: persona con horas o novedad no bloquea | RF-29–33, 38, 39, 61 |
| `src/features/bitacoras/parte.ts` | `PersonaPedida`/`construirPersona` y `EnsayoPedido`/`construirEnsayo` con los campos nuevos | RF-1–3, 18, 31–36 |
| `src/features/bitacoras/servidor/secciones.ts` | `personalDelParte` usa `validarPersonaDelParte` | RF-6–11, 61 |
| `src/features/panel/contratos.ts` | `personaDelParte` (horas opcionales, novedad), `ensayoDelParte` (ubicación con tramo y metros libres, edad, resultado, cumple, observación condicionada); `propuestaDeIa` y `reporteCorregido` con los campos nuevos | RF-1–3, 18, 23–27, 31–42 |
| `src/shared/rules/whatsapp.ts` | `PersonaDelReporte`/`EnsayoDelReporte` con los campos nuevos; `resolverPropuesta` (horas, novedad, cargo, tramo o lugar, edad/resultado/cumple sin meterlos en la observación); `faltasDelReporte` con `validarPersonaDelParte`; `tramoDeTexto`; sinónimos de ensayo | RF-23–28, 40–43 |
| `src/features/whatsapp/servidor/aprobacion.ts` | `guardarEnBitacora` pasa los campos nuevos; reintento ante el choque | RF-23, 24, 42 |
| `src/features/whatsapp/servidor/dias.ts` | un choque de versión no aparta el mensaje: lo deja en espera para el siguiente pulso | defecto 024 |
| `src/features/panel/pantalla-partes.tsx` | Personal: casillas L/ED/EN y novedad, desglose de lo reportado y aviso de RF-16. Control Calidad: tramo, metros libres, edad, resultado y cumple | RF-13–16, 21, 37, 44, 60 |
| `src/app/api/panel/resumen+api.ts` | suma las horas reportadas | RF-17, 22 |
| `src/features/panel/whatsapp/no-se-pudo-guardar.tsx` | edita L/ED/EN, novedad, edad, resultado, cumple y tramo | RF-27 |
| `src/features/whatsapp/servidor/{bandeja,excepciones,creados}.ts` + rutas `propuestas`, `excepciones`, `creados` | `desde`/`hasta` por día del reporte, del más nuevo al más viejo, sin tope | RF-45–53 |
| `src/shared/rules/fechas.ts` (nuevo) o `jornada.ts` | `validarRango(desde, hasta)` compartido con cantera y laboratorio | RF-50, 51 |
| `src/features/panel/whatsapp/{pantalla-bandeja,no-se-pudo-guardar,creado-automaticamente}.tsx` | campos Desde/Hasta en la URL | RF-45–47, 49, 54 |
| `src/features/panel/usar-listado-filtrado.ts` | `POR_PAGINA = 15`; `usePaginacion(filas, clave)` | RF-55, 57, 58 |
| las pantallas de RF-56 | `usePaginacion` + `<Paginacion>` | RF-56 |
| `scripts/verificar-reglas.ts` | casos nuevos | ver «Estrategia» |
| n8n: `scripts/generar_workflow_clasificar.py` | esquema e instrucciones (horas, novedad, cargo, lista de ensayos, edad, tramo) | RF-23–25, 40–42 |
| n8n: `plantilla_reporte_whatsapp.md` (v4) y `contexto_obra.md` | plantilla con L/ED/EN; laboratorio va a la bitácora | — |

## Modelo de datos

- **Servidor.** **Sin cambios de esquema.**
  - `partes_de_obra.personal` y `.laboratorio` son jsonb tipados en TypeScript, y los campos nuevos son opcionales.
  - Lo que ya está en `whatsapp_mensajes.propuesta` y `whatsapp_excepciones.datos` se sigue leyendo: los campos nuevos faltan y se toman como null.
- **Local (móvil).** Sin cambios.
- **Migraciones.** Ninguna.
- **Compatibilidad.**
  - Las filas guardadas antes no traen los campos nuevos, y se muestran como hoy (RF-44, RF-60).
  - Un ensayo con `horaInicio` y sin `horaFin` ya no se puede distinguir por `'horaInicio' in ensayo`. `esEnsayoAnterior` no cambia, porque sigue mirando `horaInicio`.
- **Forma de la persona:**
  ```ts
  horasLaboradas?: number | null;   // 0..16, múltiplos de 0.5
  extraDiurnas?: number | null;
  extraNocturnas?: number | null;
  novedad?: 'incapacitado' | 'permiso' | 'vacaciones' | 'ausente' | null;
  ```
- **Forma del ensayo:**
  ```ts
  edadDias?: number | null; resultado?: number | null; unidad?: string | null;
  cumple?: 'si' | 'no' | null;
  ubicacion?: { pr, metros } | { desde: {pr, metros}, hasta: {pr, metros} } | { lugar };
  ```

## Algoritmo / reglas

1. **`validarPersonaDelParte({entrada, salida, horasLaboradas, extraDiurnas, extraNocturnas, novedad})`**
   devuelve un error o null. Los pasos van en orden:
   1. Si hay `extraDiurnas` o `extraNocturnas` sin `horasLaboradas`, el error es `extra_sin_laboradas` (RF-11).
   2. Si hay `horasLaboradas`:
      - mayor que 16 → `mas_de_16` (RF-9);
      - menor que 0, o que no es múltiplo de 0.5 → `horas_invalidas` (RF-4);
      - extra diurnas más extra nocturnas mayor que L → `extra_mayor` (RF-10).
   3. Si hay entrada o salida, se aplica `validarHorario` como hoy (RF-7).
   4. Si no hay L, ni entrada y salida, ni novedad → `sin_horas` (RF-8).
   5. Si no, null (RF-6, RF-19, RF-20).
   6. Las extras que faltan se leen como 0 (RF-12): las guarda `construirPersona`, no la regla.
2. **`horasDeLaPersona(fecha, persona, horario)`** devuelve una de dos formas:
   - `{ fuente: 'reportadas', laboradas, extraDiurnas, extraNocturnas }` si hay L (RF-14);
   - `{ fuente: 'calculadas', …desglosarJornada }` si solo hay entrada y salida (RF-15).

   `horasNoCuadran` compara L con `trabajados` y las extras reportadas con las calculadas, con 15 minutos de tolerancia (RF-16). La usan la pantalla y el resumen (RF-17, RF-22).
3. **Cierre** (`parte.ts:648`): una persona bloquea solo si `validarPersonaDelParte` da error. Hoy bloquea si le falta la entrada o la salida.
4. **`faltasDelEnsayo`** (RF-29 a RF-33, RF-38, RF-39):
   - sin inicio → falta, como hoy;
   - con fin, y fin ≤ inicio → falta, como hoy;
   - sin fin → no es falta.
   - Ubicación:
     - `{pr, metros}`: PR de 0 a 25 y metros enteros de 0 a 999;
     - `{desde, hasta}`: las dos abscisas con esa misma regla y en cualquier orden;
     - `{lugar}`: como hoy.
   - Observación: falta solo si no hay `resultado` ni `cumple`.
   - `validarAbscisa` de cantera no se toca: la regla de 25 en 25 sigue valiendo para los viajes.
5. **`tramoDeTexto(texto)`** lee «Pr 0 + 70 al Pr 0 +150», «K1+300 a K1+170» o «del K1+100 hasta K1+200»
   y devuelve `{desde, hasta}`. Si hay una sola abscisa, devuelve `{pr, metros}` con `abscisaDeTexto`. Si no
   encuentra ninguna, el texto se guarda como `{lugar: texto}` (RF-43).
6. **Nombre del ensayo** (RF-40). Antes de `reconocerPorNombre` se buscan sinónimos en el texto normalizado:
   - «compresion» o «probeta» → `compresion_simple`;
   - «densidad» → `densidad_en_campo`;
   - «proctor» → `proctor`.

   Los ids exactos se toman de `ENSAYOS_DE_CALIDAD`. El prompt de la IA también pide el nombre de la lista, y el sinónimo queda como red.
7. **`resolverPropuesta`.** Pasa `horas_laboradas`, `extra_diurnas`, `extra_nocturnas` y `novedad` (vocabulario normalizado). Para
   los ensayos pasa `edad_dias`, `resultado` (si es número), `unidad` y `cumple` (`si`/`no`; `desconocido` queda como null).
   La observación queda **solo** con la del reporte (RF-41, RF-42). Si el resultado no es un número («No cumple»), se mantiene en la observación.
8. **Personal en grupos de cargo** (RF-25). El prompt pide `cargo_hoja` con el título del grupo, y `cargoDeHoja`
   (023) ya lo convierte en un cargo al crear la persona. Se añaden «INGENIEROS», «TOPOGRAFÍA» y
   «CONTROLADORES Y BOAL» a su tabla si no están.
9. **Filtro por fecha** (RF-48). Se filtra con
   `coalesce(fecha_hecho, (enviado_en at time zone 'America/Bogota')::date) between desde and hasta` y se ordena con
   `order by enviado_en desc` (RF-52). Sin `.limit` (RF-53): el rango ya acota, con un máximo de 366 días. En excepciones
   el filtro va por el mensaje del renglón, y en creados por la fecha en que se crearon.
10. **`usePaginacion(filas, claveDeFiltros)`** devuelve `{ pagina, paginaActual, irAPagina, total }`. Recorta de a
    `POR_PAGINA` y vuelve a la página 1 cuando cambia `claveDeFiltros` (RF-57). `Paginacion` ya se oculta con una
    sola página (RF-58). `useListadoFiltrado` también vuelve a la página 1 al cambiar sus filtros, no solo al buscar.
11. **Choque de versión al llevar a la bitácora** (defecto de la 024):
    - `guardarEnBitacora` reintenta hasta 4 veces, releyendo la bitácora en cada intento;
    - si aun así choca, `llevarABitacora` **no** aparta el mensaje: lo deja `en_espera` con `intentos + 1`, y el siguiente pulso lo retoma;
    - solo un 409 de bitácora **cerrada** o un 400 de validación aparta el mensaje, como hoy.

## Decisiones técnicas

- **Horas reportadas en la misma fila jsonb.** Se descartó una tabla de horas porque la sección se escribe en un solo `UPDATE` sin
  transacciones, igual que `origen` (021).
- **Horas como número decimal**, no en minutos. Se descartaron los minutos porque la obra reporta en horas («L: 8 Hrs.»), y guardarlas como
  llegan respeta «tal como se registraron» (RF-13). Al sumarlas se convierten a minutos.
- **Metros libres solo para el ensayo.** Se descartó cambiar `validarAbscisa` porque el destino de un viaje sigue yendo de 25 en 25 (010).
- **El sinónimo del ensayo en la regla, además del prompt.** Se descartó dejarlo solo al prompt porque así también lo recupera lo ya clasificado sin
  volver a gastar en la IA.
- **Paginar en la pantalla.** Se descartó limit/offset en el servidor porque `usar-listado-filtrado.ts:9-16` documenta esa decisión, y el
  filtro de fechas ya acota lo que viaja (fuera de alcance en la spec).
- **El choque deja el mensaje en espera.** Se descartó un candado consultivo porque Neon HTTP no tiene transacciones interactivas: el
  reintento con versión es el patrón del proyecto.
- **Sin esquema 3 de la IA.** Se descartó subir de versión porque los campos nuevos son nullish en `propuestaDeIa`, y una entrega v2 sin ellos sigue
  siendo válida.

## Impacto en la sincronización

Sin impacto en la sincronización: nada de esto llega al móvil.

## Contrato de API

- `PUT /api/panel/partes/:id`:
  - `personal[]` acepta `horasLaboradas`, `extraDiurnas`, `extraNocturnas` y `novedad`. `entrada` y `salida` pasan a ser opcionales. Responde 400 con el mensaje de la regla.
  - `laboratorio[]` acepta `edadDias`, `resultado`, `unidad`, `cumple`, la ubicación `{desde, hasta}` y los metros de 0 a 999.
- `GET /api/panel/whatsapp/propuestas?estado=&obraId=&desde=&hasta=` (lo mismo para `excepciones` y `creados`):
  - sin fechas, toma los últimos 7 días;
  - responde 400 con un formato inválido, `hasta < desde` o más de 366 días.
- `POST /api/integraciones/whatsapp/mensajes`: el contrato `propuestaDeIa` acepta los campos nuevos (nullish).
- `PUT /api/panel/whatsapp/excepciones/:id/guardar`: `reporteCorregido` con los campos nuevos.

## Estrategia de verificación

- **`scripts/verificar-reglas.ts`:**
  - `validarPersonaDelParte`:
    - solo L;
    - L + ED + EN;
    - L > 16;
    - ED + EN > L;
    - ED sin L;
    - nada;
    - solo novedad;
    - novedad con L;
    - entrada y salida como hoy;
    - L no múltiplo de 0.5.
  - `horasNoCuadran`.
  - Cierre con una persona con solo L.
  - `faltasDelEnsayo`:
    - sin fin;
    - fin ≤ inicio;
    - metros 70;
    - tramo invertido;
    - sin observación con resultado;
    - sin nada.
  - `tramoDeTexto` con los 4 textos del 8-oct.
  - Sinónimo «Compresión de probetas de suelo cemento con 4 %».
  - `resolverPropuesta` con el personal y los ensayos del 8-oct; `faltasDelReporte` vacío para ellos.
  - `validarRango`.
  - La paginación, como función pura de recorte.
  - `POR_PAGINA === 15`.
- **Demo manual (Chrome, desarrollo):**
  - Bitácora:
    - persona con L/ED/EN escritas a mano;
    - persona incapacitada;
    - aviso de RF-16;
    - ensayo con tramo y sin hora de fin;
    - cerrar la bitácora con esa persona.
  - Historial con Desde/Hasta y del más nuevo al más viejo.
  - Páginas de 15 en Personas, Historial, Viajes y Laboratorio.
- **Integración:**
  - texto real del 8-oct como `PRUEBA-025-…` en `occ_whatsapp`;
  - clasificar en el PC sin arrancar el servidor;
  - entregar a dev con curl;
  - pulso: 37 personas, Vicente incapacitado, 4 ensayos y 0 excepciones de personal o ensayos.
- **Producción:**
  - reprocesar `3EB024B22E22EB9C3B2A3D`;
  - resolver sus 42 excepciones de personal, ensayos y bitácora;
  - comprobar la bitácora del 8-oct.

## Riesgos

- **Hay que relajar `ensayoDelParte` y el cierre a la vez.** Si solo se relaja uno, la pantalla deja guardar algo que después no deja cerrar.
  Por eso los dos usan la misma regla (RF-61) y hay una prueba de cierre.
- **Bitácoras abiertas antes del despliegue** que tengan ensayos sin fin. No las hay: hoy no se pueden guardar.
- **Reprocesar el 8-oct en producción:**
  - las actividades y el clima ya están; se re-fusionan por id determinista (021) y no se duplican;
  - las notas se suman: se comprueba que no se dupliquen, y si lo hacen, se quitan antes;
  - para volver atrás: imagen `preoperaocc:anterior` y el flujo respaldado en `respaldos/`.
- **Un rango de 366 días en el Historial** puede traer miles de filas. Se acepta, porque se pagina en la pantalla, y se mide el tiempo con 31 días (RNF).
