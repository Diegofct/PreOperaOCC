# Tareas — Spec 004

El mismo orden de siempre: reglas puras y catálogos, luego datos, luego servidor y al final
la pantalla. Aquí importa más que nunca, porque el parte es un formulario largo y lo caro es
descubrir a mitad de la interfaz que una regla estaba mal.

## Reglas y catálogos

- [x] T1. `src/shared/rules/festivos.ts`: los festivos de Colombia calculados —fijos, ley
      Emiliani y Semana Santa—. (RF-40)
      Hecho cuando: hay casos en verde para que los de Emiliani caigan en lunes, para la
      Semana Santa de 2026 anclada al calendario real, y para el año en que dos festivos
      coinciden el mismo día.

- [x] T2. `src/shared/rules/horas.ts`: jornada de 7:30-12:00 y 13:30-17:00, extras,
      nocturnas desde las 7 p.m. y domingos y festivos. (RF-17, RF-18, RF-38 a RF-42)
      Hecho cuando: están en verde la jornada completa sin extras, el almuerzo descontado, lo
      que pasa de ocho horas, el recargo nocturno y la jornada que cruza la medianoche.

- [x] T3. Franjas de clima en el mismo módulo: sin solaparse y pudiendo cubrir el día.
      (RF-26, RF-27, RF-28)
      Hecho cuando: dos tramos que se pisan se rechazan diciendo cuáles, tocarse en el borde
      no cuenta como pisarse, y el ejemplo de la spec cubre la jornada.

- [x] T4. `src/shared/catalogos/bitacora.ts`: condiciones de clima y materiales de
      laboratorio con su unidad pegada. (RF-26, RF-29)
      Hecho cuando: cada material trae su unidad y «4 bultos» se lee así.

## Datos

- [x] T5. Tipos de las cinco secciones y tabla `partes_de_obra` con su migración. (RF-1,
      RF-2, RF-7)
      Hecho cuando: el índice único parcial por obra y fecha impide dos partes vivos del
      mismo día y deja abrir otro después de anular, y `bitacoras` sigue intacta.

## Servidor

- [x] T6. Rutas del parte: consultar por día, abrir, guardar parcial. (RF-1 a RF-5, RF-34,
      RF-35)
      Hecho cuando: abrir dos veces el mismo día devuelve el mismo parte, y cada sección se
      reemplaza entera sin tocar las demás.

- [x] T7. Validación al cerrar y avance de medidores. (RF-6, RF-8 a RF-15)
      Hecho cuando: un parte vacío no se cierra, una máquina sin lectura final tampoco, y al
      cerrar el horómetro del equipo avanza con `greatest` —nunca retrocede aunque se cierre
      dos veces—.

- [x] T8a. Anular con motivo. (RF-7, RF-37)
      Hecho cuando: anular deja la fila con su motivo y el día vuelve a quedar libre.

- [x] T8b. La fotografía del día, subida desde el panel al mismo bucket privado que las
      firmas. (RF-32, RF-33)
      Hecho cuando: se sube una imagen, se ve en el parte y pedir las fotos de un parte de
      otra obra responde «no encontrado».

- [x] T9. Retirar la bitácora del celular. (Superficie móvil)
      Hecho cuando: el teléfono ya no tiene esa pantalla ni sus recordatorios, quien entra
      con una cuenta del panel ve dónde está su trabajo, y lo que quedara encolado todavía
      puede subir.

## Pantalla

- [x] T10. Las siete secciones del parte, con guardado por sección. (RF-16 a RF-31)
      Hecho cuando: el módulo de Bitácoras muestra el parte de obra con maquinaria, personal,
      actividades, clima, laboratorio y notas, y cada una guarda por su cuenta.

- [x] T11. Las bitácoras por máquina anteriores, de solo lectura. (RF-36)
      Hecho cuando: los días que tienen registros del formato viejo los muestran al pie del
      parte, sin poder editarlos.

- [ ] T12. Validación final RF por RF. (Todos)
      *Desde el 2026-09-15 se ejecuta al final, después de T20, e incluye RF-45 a RF-60.*

## Lo que quedó fuera y cuándo se resolvió

- **La fotografía por actividad** (RF-23) no entró en esta tanda. La ruta y el componente ya
  la admitían —bastaba con pasarles el id de la fila de actividad—, pero engancharla exigía
  que cada actividad tuviera id estable en el formulario, y aquí se identificaban por su
  posición en la lista. Se dejó para la spec 005, que rehacía ese formulario de todos modos.
  **Hecha en 005/T13a**: cada actividad guardada admite su foto y la conserva al volver a
  guardar la sección.

## Notas de ejecución

- **Antes de T9**, avisar a quien hoy lleva la bitácora desde el celular: se le retira esa
  pantalla.
- El área y el volumen se escriben a mano. Falta decidir la unidad de cada actividad, y es
  la duda que sigue abierta en la spec. *(Superado el 2026-09-15: se calculan, ver T13.)*
- La lista de materiales de laboratorio está **pendiente de validación por OCC**, igual que
  la de actividades.
- Las horas no se convierten a dinero, y el tope de 42 horas semanales no se controla aquí:
  el parte clasifica el día, no la semana.
- **El guardado es por sección, no automático.** Se descartó el autoguardado con retardo que
  usa la bitácora del celular: en un formulario de siete secciones, guardar solo lo que se
  acaba de tocar es más predecible que un guardado invisible que puede pisar lo que otro
  escribió desde el otro computador.
- Cada sección arranca su estado del parte y a partir de ahí manda lo que se teclea. No se
  vuelve a sincronizar: refrescar desde el servidor mientras alguien escribe le borraría lo
  que está escribiendo. Cambiar de día vuelve a montar las secciones.
- **La cola de subida conserva el tipo `bitacora`** aunque ya nadie encole una. Un teléfono
  que quedó con una bitácora cerrada y sin señal la tiene todavía en la cola; quitar el tipo
  la dejaría varada para siempre. La ruta `/api/movil/bitacoras` se queda por lo mismo.
- **La tabla `bitacoras` del teléfono tampoco se borra.** Nadie la lee ya, pero soltarla en
  una migración destruiría lo que algún equipo tenga sin subir.

---

## Cambio del 2026-09-14/15 (RF-45 a RF-60)

Mismo orden: reglas puras con sus casos, datos, servidor y pantalla. T12 va al final.

### Reglas

- [x] T13. `src/shared/rules/dimensiones.ts` con `calcularDimensiones`. (RF-58, RF-59, RF-60)
      Hecho cuando: en verde 3 × 4 → área 12; sin ancho → se respeta el área escrita;
      2 × 3 × 0,5 → volumen 3; sin alto → se respeta el volumen escrito; redondeo a dos
      decimales.

- [x] T14. `src/shared/rules/parte.ts`: cierre con las siete secciones, observaciones por
      máquina, foto en al menos una actividad, `validarDiaSinTrabajo`, título «Control
      Calidad de Obra» y estado «no aplica». (RF-49 a RF-55)
      Hecho cuando: en verde que un parte vacío nombra las siete secciones, una máquina sin
      observaciones se nombra, ninguna actividad con foto bloquea y una ya no, un día sin
      trabajo con clima, notas y foto cierra, día sin trabajo con máquinas o sin motivo se
      rechaza, y los casos anteriores que esperaban el rechazo de RF-8 están ajustados.

### Datos

- [x] T15. Columnas `sin_trabajo` y `motivo_sin_trabajo`, observaciones en `MaquinaDelParte`,
      y contratos. (RF-45, RF-47, RF-53)
      Hecho cuando: `npm run db:generate:servidor` deja la migración en `drizzle/servidor/`,
      `npm run db:migrar:servidor` la aplica en Neon, y los tres comandos están en verde.

### Servidor

- [x] T16. Ruta de guardado: observaciones, día sin trabajo y medidas recalculadas.
      (RF-45, RF-53, RF-55, RF-58 a RF-60)
      Hecho cuando: una petición con largo 3 y ancho 4 y área 99 guarda área 12; marcar día
      sin trabajo con una máquina guardada responde 400; sin motivo responde 400.

- [x] T17. Ruta de cierre: fotos contadas en `media` y todos los bloqueos en la respuesta.
      (RF-50 a RF-56)
      Hecho cuando: cerrar un parte vacío responde 400 nombrando las siete secciones, y un
      parte completo con foto del día y una actividad con foto se cierra.

### Pantalla

- [x] T18. `Campo` con `lineas` (alto en el tema) y observaciones por máquina, visibles
      también en partes cerrados. (RF-45, RF-46)
      Hecho cuando: cada máquina tiene su área de texto de varias líneas, lo escrito se
      guarda y se sigue viendo al cerrar el parte.

- [x] T19. Actividades: id al añadir, foto sin guardar antes, área y volumen calculados.
      (RF-47, RF-48, RF-58 a RF-60)
      Hecho cuando: una actividad recién añadida admite foto sin pulsar Guardar; al quitarla
      sin guardar su foto no aparece; con largo y ancho el área se ve calculada y no se
      puede escribir; sin ancho sí se puede.

- [x] T20. Cierre en pantalla: casilla «Ese día no se trabajó» con motivo, nombre «Control
      Calidad de Obra» en la sección y en el índice, y «no aplica» en el índice. (RF-49,
      RF-53 a RF-55, RF-57)
      Hecho cuando: un domingo marcado sin trabajo con motivo se cierra solo con clima,
      notas y foto del día, y un parte viejo con material de laboratorio lo muestra bajo el
      nombre nuevo.

### Notas de ejecución del cambio

- **Antes de desplegar**, avisar a los residentes: los partes abiertos con secciones vacías
  ya no se podrán cerrar.
- Los ítems de Control Calidad de Obra los enviará OCC. Hasta entonces la sección conserva
  la lista de materiales actual; cambiarla será otro `/sdd:cambio`.
- Tras tocar las rutas `+api.ts` (T16, T17), reiniciar `npm run web`: el servidor de
  desarrollo no las recompila en caliente.
- **T14 adelantó parte de T17.** La regla pasó a recibir las fotos, y sin pasárselas la ruta
  de cierre no compilaba. Así que la ruta ya lee clima, control de calidad y notas, y cuenta
  las fotos en `media`. A T17 le queda responder **todos** los bloqueos juntos (hoy manda
  el primero) y reescribir el comentario de la ruta, que todavía habla del orden antiguo.
  La pantalla también pasa ya las fotos, y el índice pinta «no aplica».
- Hasta T15, ningún parte trae la marca de día sin trabajo ni las observaciones de las
  máquinas. Mientras tanto **no se puede cerrar ningún parte con maquinaria** en el entorno
  de desarrollo, porque falta la forma de escribir esas observaciones. Se resuelve en T15,
  T16 y T18.
- **T15**: migración `0008_cloudy_gamora.sql` aplicada en Neon el 2026-09-15. Se comprobó en
  la base: `sin_trabajo` boolean no nulo con `false` por defecto, `motivo_sin_trabajo` texto
  nulo, y los 4 partes existentes sin marcar. Las tres rutas del parte ya devuelven las dos
  columnas; la de cierre las lee, así que la regla ya respeta la marca en cuanto se pueda
  escribir (T16).
- **Fallo anterior a este cambio, encontrado en T15 y sin corregir** (fuera del alcance de la
  tarea): en `parteEditado`, `notas` usa `textoOpcional`, que convierte lo ausente en `null`.
  Se comprobó ejecutando el esquema: `parteEditado.parse({})` devuelve `{ notas: null }`. Como
  la ruta de guardado escribe `notas` cuando no es `undefined`, **guardar cualquier otra
  sección borra las notas del día**. Con el cierre exigiendo notas (RF-50), esto deja partes
  que no se pueden cerrar sin volver a escribirlas. El arreglo es usar `textoParcial` —creado
  en T15 para el motivo— también en `notas`. Pendiente de aprobación para hacerlo en T16.
  **Aprobado y corregido en T16**, con su caso en el guion de verificación.
- **T16**: la combinación de lo guardado con lo que llega se escribió como regla pura
  (`resolverDiaSinTrabajo`, en `shared/rules/parte.ts`) para poder probarla; el plan solo
  nombraba `validarDiaSinTrabajo`. El «Hecho cuando» de T16 se comprobó con casos del guion
  (área 99 → 12, día marcado con máquina guardada → `con_trabajo`, sin motivo →
  `sin_motivo`), **no con una petición HTTP real**, porque hace falta una sesión del panel.
  Las respuestas 400 se ven en la demo de T12.
- **T17**: el texto del rechazo sale de `mensajeDelRechazoDeCierre` (regla pura con su caso):
  un encabezado y cada bloqueo en su renglón, sin recortar. Igual que en T16, comprobado con
  el guion y **no con una petición HTTP real**. Queda para la demo de T12 ver que el aviso
  del panel respeta los saltos de línea.
- Hasta T18, guardar la maquinaria desde la pantalla deja las observaciones vacías, porque la
  pantalla todavía no las manda. No se pierde nada: aún no hay forma de escribirlas.
  *(Resuelto en T18: la pantalla ya las manda.)*
- **T18**: la propiedad quedó como `multilinea` (booleano) y no `lineas` (número), porque
  todas las observaciones deben medir lo mismo; el alto sale de `CampoPanel.altoAreaDeTexto`
  en `constants/medidas.ts`. El `38` a mano del campo de una línea pasó a `CampoPanel.alto`.
  Comprobado con los tres comandos; **falta verlo en el navegador** —el área de texto en su
  renglón, lo escrito guardado y visible con el parte cerrado—, que va en la demo de T12.
- **T19**: `Campo` ganó `soloLectura` para el área y el volumen calculados (fondo apagado, sin
  anillo de foco). Al subir la foto de una actividad se recarga también el día, para que el
  índice se entere de que ya hay foto; recargar no desmonta las secciones, así que lo escrito
  sin guardar sigue ahí. Una foto subida a una actividad **todavía sin guardar** no cuenta
  para el cierre hasta que se guarda la actividad, que es lo que dice RF-48. Comprobado con
  los tres comandos; **falta verlo en el navegador** (T12).
- **T20**: nuevo componente `Casilla` en `componentes.tsx` (la marca es un «✓» de texto, no
  solo color). En la sección de cierre, la casilla se desactiva si el parte ya tiene trabajo
  guardado, salvo para desmarcarla; con la marca aparece el motivo en área de texto y un
  «Guardar» que solo sale cuando hay algo sin guardar. En un parte cerrado se lee «Día sin
  trabajo: …». `Cierre` ahora lleva `key` con el id del parte, porque guarda estado y sin
  eso arrastraba la marca al cambiar de día. Los textos visibles de «Laboratorio» pasaron a
  «Control Calidad de Obra» o «control de calidad»; los ids internos no cambian. Comprobado
  con los tres comandos; **falta verlo en el navegador** (T12).
- Las observaciones de las **actividades** y las **notas del día** siguen siendo campos de
  una línea. Pasarlas a área de texto es de la spec 007 (RF-24), no de este cambio.

### T12 — recorrido en el navegador del 2026-09-15 (parcial)

Con la sesión de gerencia, en `localhost:8081`, sobre el parte abierto de hoy de Consorcio
Antioquia. **No se guardó nada**: todo lo probado fue escribir sin guardar, abrir listas y
un intento de cierre, que el servidor rechaza sin escribir.

| RF | Resultado |
| --- | --- |
| 45 | Visto: VOL-01 añadida muestra «Observaciones del día» en su renglón, con la ayuda |
| 47 | Visto: una actividad recién añadida ofrece «Foto de la actividad» sin guardar |
| 49 | Visto: «Control Calidad de Obra» en la sección, en el índice y en el rechazo |
| 50 | Visto contra el servidor real: el rechazo nombra las siete secciones, en renglones |
| 53 | Visto: la casilla marca con «✓» y abre «Por qué no se trabajó» |
| 58, 59 | Visto: largo 3, ancho 4, alto 0,5 → área 12 y volumen 6, en gris y sin poder escribir |
| 46, 48, 51, 52, 54, 55, 57, 60 | En verde en el guion; **sin demo**, porque exigen guardar, subir o cerrar |
| 56 | Por construcción |

**Sin hacer, porque escribe en la base real**: guardar observaciones, subir una foto de
actividad, guardar la marca de día sin trabajo y cerrar un parte. Cerrar además avanza el
medidor de las máquinas. Pendiente de que Diego diga si se hace sobre el parte de hoy.

**Lo que la pantalla enseñó y es de la spec 007** (lo que Diego reportó, ubicado):

1. **Lista tapada por lo que viene después.** En Actividades, el botón «Añadir actividad»
   se pinta encima de la lista del selector de actividad. En Asignaciones, la lista de
   vehículos se corta en el borde del formulario y la tabla tapa la tercera opción. En
   Personas, Vehículos y la ventana de edición no se reprodujo con los datos de hoy, pero
   la causa es la misma: la lista vive dentro de la capa de su tarjeta. → 007/RF-1, RF-6.
2. **Campos desalineados.** En la segunda línea de una actividad, las etiquetas de Área,
   Volumen y Observaciones quedan a tres alturas distintas. Causa: `filaFormulario` alinea
   por abajo (`alignItems: 'flex-end'`), y las ayudas bajo algunos campos empujan. → 007/RF-23.
3. **Observaciones pequeñas.** El área de texto de la máquina da cuatro renglones y Diego la
   quiere más grande; las observaciones de actividad y las notas del día siguen en una línea.
   → 007/RF-24 (subir el mínimo y aplicarla a las tres).
4. **La ventana de edición no cubre la pantalla.** El telón es `position: absolute` dentro del
   contenido: no tapa la barra ni los márgenes, se desplaza con la página y la ventana puede
   quedar con la cabecera escondida bajo la barra. → no está en 007: pide `/sdd:cambio`.
5. **Lista abierta al fondo de la pantalla** (filtro Estado de Vehículos): se abre hacia abajo
   fuera de la vista y sigue abierta al desplazar. → 007/RF-3, RF-5.
6. **Rótulo cortado en el índice**: «Control Calidad …». → no está en 007: pide `/sdd:cambio`.
7. **El rechazo del cierre sale arriba de la página**, lejos del botón «Cerrar el parte», que
   está al fondo: quien pulsa no lo ve. → no está en 007: pide `/sdd:cambio`.
8. **«Equipo» parece un campo que se puede escribir** en cada máquina; debería verse como dato
   fijo, con el `soloLectura` de T19. → 007/RF-16 lo roza; mejor dicho en el cambio.
- **004/RF-20, corregido el 2026-09-15 durante la validación de la spec 007**: la lista «Añadir
  persona» del parte mostraba el cargo como slug («residente_1»). Ahora usa `nombreDeCargo`,
  como Asignaciones. Comprobado en Chrome.

## Cambio del 2026-09-16 — catálogos reales de OCC (RF-61 a RF-74)

Mismo orden: catálogos y reglas puras con sus casos, datos, servidor y pantalla. T30 valida
el cambio; T12 sigue siendo la validación final de toda la spec.

### Catálogos y reglas

- [x] T21. `scripts/importar-presupuesto.ts`, script `presupuesto` en `package.json`,
      `src/shared/catalogos/presupuesto.json` generado y la línea de «No edites a mano» en
      `AGENTS.md`. (RF-64)
      Hecho cuando: `npm run presupuesto` escribe 31 filas `{ item, descripcion, unidad }` con
      unidades de las seis (`m3`, `m2`, `m`, `kg`, `und`, `m3_km`), ordenadas por ítem (2.8
      antes que 2.14.1); una copia del Excel con «mts» en una unidad hace fallar el script
      nombrando la fila; `npm run typecheck` en verde (los dos tsconfig).

- [x] T22. `src/shared/catalogos/presupuesto.ts` (unidades, actividades tipadas,
      `actividadPorItem`, `etiquetaDeActividad`, `etiquetaDeUnidad`, `CLAVE_OTRA_ACTIVIDAD`) y
      `ENSAYOS_DE_CALIDAD` en `bitacora.ts`, con sus casos. Los materiales de prueba **no se
      quitan todavía**: la pantalla los usa hasta T29. (RF-61, RF-64, RF-65, RF-66, RF-70)
      Hecho cuando: en verde 31 actividades con ítem único y ninguna «otra»; 4.1.8 en m³, 10.1
      en kg, 12.9 en Und, 13.1 y 13.9 en m³-km y 6.1.18.1 en m²; «4.1.8 · Excavación…» como
      etiqueta; «4.1.8» y «excavación» encuentran la 4.1.8 con `filtrarOpciones`; 17 ensayos
      con claves y nombres únicos, en el orden del anexo A.

- [x] T23. `resolverCantidad` en `dimensiones.ts`; `faltasDeActividad` y
      `faltaObservacionDelEnsayo` en `parte.ts`, con sus mensajes y casos. (RF-24, RF-67 a
      RF-70, RF-72, RF-74)
      Hecho cuando: en verde m³ con 3 × 4 × 0,5 → 6 calculada; m³ sin alto y 9 escrito → 9 a
      mano; m³ con volumen escrito 7 sin medidas → 7; m² con 3 × 4 → 12; m con longitud 25 → 25;
      kg con medidas y 500 escrito → 500 a mano; Und sin nada → `null`; otra sin cuál → falta
      bajo `texto`, otra sin unidad → falta bajo `unidad`; ensayo con observación vacía o solo
      espacios → falta con el texto «Sin observaciones»; «Sin observaciones» → sin falta.

### Datos

- [x] T24. Tipos y construcción de actividades: `item`, `unidad` y `cantidad` opcionales en
      `ActividadDelParte`; `construirActividadDelParte` con el presupuesto (nombre = descripción,
      ítem y unidad del catálogo, la unidad elegida solo en otra, cantidad por
      `resolverCantidad`; `null` si la clave no es del presupuesto ni otra). Con sus casos.
      (RF-64, RF-66 a RF-70, RF-74)
      Hecho cuando: en verde que la 4.1.8 guarda la descripción completa, «4.1.8» y «m³» aunque
      el cliente mande `kg`; otra guarda su texto y su unidad; «excavacion» da `null`; los tres
      comandos en verde. *Hasta T27 la ruta todavía no trata el `null`: no se prueba guardando.*

- [x] T25. `EnsayoDelParte`, `FilaDeControlDeCalidad` y `esEnsayo` en `tipos.ts`; el `$type` de
      `laboratorio` en `esquema.ts` (sin migración); `construirEnsayo` y `conservarHeredadas`
      en `bitacoras/parte.ts`, con sus casos. (RF-61, RF-63, RF-71, RF-73)
      Hecho cuando: en verde que un ensayo de la lista se construye con su nombre y su
      observación, y uno que no es de la lista da `null`; dos filas del mismo ensayo se aceptan;
      una actividad heredada (sin `unidad`) y un material heredado que llegan con su id quedan
      idénticos a lo guardado aunque el cliente mande otro nombre o medidas; un id que no es de
      una fila heredada no se conserva; un parte con solo un material heredado no nombra
      «Control Calidad de Obra» en `bloqueosDelCierre`; `npm run db:generate:servidor` dice que
      no hay cambios.

### Servidor

- [x] T26. Contratos: `actividadDelParte` con `unidad` y `cantidad` y `superRefine` con
      `faltasDeActividad`; control de calidad `{ id?, ensayo?, observacion? }` con
      `faltaObservacionDelEnsayo`; filas de lectura con los campos nuevos opcionales. Con sus
      casos. (RF-67, RF-70, RF-72)
      Hecho cuando: en verde que el contrato rechaza otra sin unidad bajo `unidad`, un ensayo
      sin observación bajo `observacion`, una unidad que no es de las seis, y acepta `{ id }`
      solo (fila heredada) y el mismo ensayo dos veces; los tres comandos en verde.

- [x] T27. Ruta `PATCH /api/panel/partes/:id`: lee lo guardado cuando llegan actividades o
      control de calidad (junto con la lectura del día sin trabajo), construye con
      `conservarHeredadas` y responde 400 a actividad, ensayo o id ajenos. (RF-61 a RF-74)
      Hecho cuando: primero, **solo lectura**, una consulta lista qué partes abiertos tienen
      actividades o materiales heredados. Después, con permiso de Diego y reiniciando
      `npm run web`, peticiones desde la sesión de gerencia sobre un parte abierto: una
      actividad 4.1.8 con 3 × 4 × 0,5 → 200 con cantidad 6 y unidad «m³»; clave «excavacion»
      nueva → 400; otra sin unidad → 400 bajo `unidad`; un ensayo sin observación → 400; dos
      «Densidad en campo» con observación → 200; si hay filas heredadas, volver a guardar la
      sección las deja idénticas (comparando el `jsonb` antes y después). *Escribe en Neon: se
      pide permiso y se restaura lo que había en la sección al terminar.*

### Pantalla

- [x] T28. Sección Actividades: selector con las 31 y «Otra actividad» con número de ítem;
      unidad al lado (selector de unidad en otra); «Cantidad (unidad)» calculada y de solo
      lectura con su ayuda, o a mano; filas heredadas de solo lectura con «Quitar». (RF-64 a
      RF-71, RF-74)
      Hecho cuando: en Chrome, **sin guardar**, «4.1.8» y «acero» encuentran su actividad; la
      4.1.8 muestra «m³»; 3 × 4 × 0,5 deja «Cantidad (m³)» en 6, gris y con «Del volumen»; la
      10.1 muestra «kg» y deja escribir la cantidad; otra muestra «¿Cuál?» y el selector de
      unidad; una actividad heredada se ve con su nombre y sin campos editables. La opción de
      350 caracteres no rompe la fila (si la rompe, se aplica lo del riesgo del plan).

- [x] T29. Sección Control Calidad de Obra: selector de ensayo y observación en área de texto,
      «Añadir ensayo», materiales heredados de solo lectura con «Quitar» y tabla de lectura con
      «Ensayo o material» y «Observación o cantidad». Salen `MATERIALES_LABORATORIO`,
      `materialPorId`, `nombreDeMaterial`, `cantidadLegible`, `UnidadMaterial`, `ETIQUETA_UNIDAD`,
      `construirMaterial` y sus casos. (RF-61 a RF-63, RF-72, RF-73)
      Hecho cuando: en Chrome, **sin guardar**, el selector ofrece los 17 ensayos, se pueden
      añadir dos «Densidad en campo», y guardar con una observación vacía muestra el error
      bajo su campo sin enviar; un material heredado se ve con su cantidad y unidad; la prueba
      de ancho de tablas pasa; `grep` de `MATERIALES_LABORATORIO` en `src/` y `scripts/`
      vacío; los tres comandos en verde.

### Validación

- [x] T30. Validación del cambio RF por RF (RF-61 a RF-74) con demo. (RF-61 a RF-74)
      Hecho cuando: cada RF tiene su comprobación con resultado en las notas; la demo del plan
      está hecha en Chrome **guardando** sobre un parte abierto acordado con Diego (una
      actividad del presupuesto con cantidad calculada, la 10.1 con cantidad a mano, una otra
      actividad con unidad, dos ensayos con observación, y una fila heredada que sigue igual);
      `expo export` sin error y `grep DATABASE_URL dist/client` vacío; los tres comandos en
      verde. El cierre de una bitácora con estos datos queda para la T11 de la spec 010 y la
      T12 de esta.

### Notas de ejecución del cambio del 2026-09-16

- **T21**: `scripts/importar-presupuesto.ts`, script `presupuesto` y la línea en `AGENTS.md`.
  `npm run presupuesto` escribe `src/shared/catalogos/presupuesto.json` con 31 actividades
  (m3 17 · m2 3 · m 6 · kg 1 · und 1 · m3_km 3), ordenadas por ítem de 2.8 a 14.3. Acepta una
  ruta como argumento (`npm run presupuesto -- otro.xlsx`), para probarlo sin tocar `docs/`.
  Decisiones al escribirlo:
  - Antes de leer, busca el encabezado «DESCRIPCIÓN» en la H y «UND.» en la I. Si no está, se
    detiene: así, si las columnas se corren, falla en vez de importar otra cosa.
  - Además de la unidad desconocida, también se detiene si un ítem no tiene forma de ítem, si
    no tiene descripción o si **un mismo ítem aparece con otra descripción u otra unidad**. En el
    Excel de hoy, la 5.1.7 trae dos códigos ICOCIV distintos (11103 y 11605), pero la misma
    descripción y la misma unidad, así que no es conflicto: el código ICOCIV no se importa.
  - Si falla, no escribe nada.
  - La correspondencia entre la unidad del Excel y su clave vive en el script. En T22 el
    catálogo define las seis claves; un caso de T22 comprobará que el JSON solo usa esas.
  **Comprobado:** con una copia del Excel que pone «mts» en la fila 30, el script termina con
  código 1, dice «Fila 30: la unidad «mts» del ítem 10.1 no es ninguna de m3, m2, m, kg, und,
  m3-km.», y el JSON queda byte a byte igual.
  **Error de la spec encontrado y corregido:** la tabla del anexo B tenía 30 filas; faltaba la
  **14.3** (bordillo barrera prefabricado, m), aunque el texto ya decía 31. Se añadió con una
  nota. Los tres comandos en verde (180 verificaciones; el script no suma casos a `verificar`,
  porque leer el Excel se comprueba corriendo el script).
- **T22**: `src/shared/catalogos/presupuesto.ts` con `UNIDADES_DE_ACTIVIDAD` (seis, con su
  etiqueta: m³, m², m, kg, Und, m³-km), `IDS_UNIDAD_DE_ACTIVIDAD`,
  `ACTIVIDADES_DEL_PRESUPUESTO` (el JSON tipado), `actividadPorItem`, `etiquetaDeActividad`
  («4.1.8 · » y la descripción entera), `etiquetaDeUnidad` (una clave desconocida se enseña
  tal cual) y `CLAVE_OTRA_ACTIVIDAD`. En `bitacora.ts`, `ENSAYOS_DE_CALIDAD` (17, con id en
  snake_case: `densidad_en_campo`…) y `nombreDeEnsayo`. El comentario de cabecera de
  `bitacora.ts` ya no dice «pendiente de validación por OCC»: ahora dice que los materiales
  están de salida hasta T29.
  **Pruebas escritas antes que el código** (fallaron por no existir el módulo): dos casos
  nuevos. Además de lo que pedía la tarea, comprueban que el JSON solo usa las seis claves de
  unidad (lo que quedó pendiente en T21), la 14.3 en m, «acero» → solo la 10.1, y que la 8.27
  conserva completo `900 mm (36")`. Tres comandos en verde (182 verificaciones).
- **T23**: en `dimensiones.ts`, `resolverCantidad(unidad, medidas, cantidadEscrita)` →
  `{ cantidad, cantidadCalculada, origen }`; en `parte.ts`, `MENSAJES_DE_ACTIVIDAD`,
  `faltasDeActividad` y `faltaObservacionDelEnsayo`. Decisiones al escribirlo:
  - `resolverCantidad` recibe las medidas **ya resueltas** por `calcularDimensiones`: así,
    en m³ sale del volumen calculado o del escrito a mano (RF-68 dice «tenga volumen»).
  - Con kg, Und y m³-km la cantidad es la escrita **aunque haya medidas**. Sin unidad (fila
    heredada) no se calcula nada.
  - Las reglas no importan el catálogo (la misma disciplina de `parte.ts`):
    `faltasDeActividad` recibe `otra: boolean` en vez de la clave, y `dimensiones.ts` escribe
    las claves `m3`, `m2` y `m`. Un aserto comprueba que siguen siendo claves del catálogo.
  - Un ensayo con solo espacios o saltos de línea no tiene observación. El mensaje dice
    «Escriba la observación del ensayo. Si no hay nada que anotar, escriba «Sin
    observaciones».»; los de actividad son «Escriba cuál fue la actividad.» y «Elija la
    unidad de la actividad.».
  **Pruebas escritas antes** (fallaron con `resolverCantidad is not a function`): tres casos
  nuevos con todos los de la tarea, más m³-km con medidas y 1200 escrito → 1200. Tres
  comandos en verde (185 verificaciones).
- **T24**: `ActividadDelParte` gana `item?`, `unidad?` (la **etiqueta**, «m³», congelada) y
  `cantidad?`. Quedan opcionales y no se rellenan al leer: su ausencia es lo que marca una
  actividad heredada. `ActividadPedida` gana `unidad?` y `cantidad?`.
  `construirActividadDelParte` devuelve `ActividadDelParte | null`:
  - **Del presupuesto:** nombre = descripción, `item`, y la unidad del catálogo, ignorando la
    que mande el cliente.
  - **«otra»:** exige `faltasDeActividad` vacía y una unidad de las seis; el nombre es el texto
    sin espacios de más e `item = null`.
  - **Cualquier otra clave** («excavacion»): `null`.
  - **Cantidad:** `resolverCantidad` sobre las medidas ya resueltas.
  Ya no importa `actividades.ts`.
  **Desvío pequeño del plan, a propósito:** la ruta `PATCH` ya responde 400 «Esa actividad no
  está en la lista.» si alguna da `null`. La tarea decía dejarlo para T27, pero así la ruta
  habría podido **escribir un `null` dentro del `jsonb`**. T27 añade la conservación de las
  heredadas encima de esto.
  **Efecto hasta T27/T28:** guardar la sección Actividades desde el panel responde 400 si hay
  una actividad de la lista de prueba, porque la pantalla todavía ofrece esa lista. No se
  pierde nada guardado. No hay que usar la sección hasta T28.
  **Pruebas escritas antes** (fallaron): un caso nuevo (4.1.8 con `kg` y 99 enviados → «m³» y
  6; 10.1 con medidas → 500 escrito, y sin escribir → `null`; otra en m³ → texto recortado,
  sin ítem, cantidad 6; «excavacion» y otra con «mts» → `null`), y el de «el servidor
  recalcula el área» ajustado a la unidad obligatoria de otra. Tres comandos en verde (186).
- **T25**: en `tipos.ts`, `EnsayoDelParte { id, ensayo, nombre, observacion }`,
  `FilaDeControlDeCalidad` y `esEnsayo`, y un comentario en `MaterialDelParte` que dice que
  solo existe en partes anteriores. En `esquema.ts`, `laboratorio` pasa a
  `$type<FilaDeControlDeCalidad[]>()`; `db:generate:servidor` responde «No schema changes».
  Los cambios que se ven en `drizzle/servidor/` son de la 010, no de esta tarea.
  En `bitacoras/parte.ts`:
  - `construirEnsayo`: nombre del catálogo, observación recortada; `null` si el ensayo no es
    de la lista o no trae observación. Conserva el id que llegue; si no llega, crea uno.
  - `esActividadHeredada` (sin la propiedad `unidad`) y `esMaterialHeredado` (con `material`).
  - `conservarHeredadas(pedidas, guardadas, esHeredada, construir)`: **genérica**, porque la
    usan las dos secciones y las dos tienen la misma forma.
  **Decisión al escribirla:** si una fila llega con el id de una fila guardada que **no** es
  heredada, se construye de nuevo. Solo lo heredado se copia; lo demás pasa por el catálogo
  como siempre.
  **Pruebas escritas antes** (fallaron con `construirEnsayo is not a function`): tres casos.
  Ensayo con nombre y observación, dos del mismo ensayo con ids distintos, y rechazo por
  ensayo ajeno, observación en blanco o solo id. Una actividad y un material heredados salen
  idénticos aunque la petición mande otro nombre, otras medidas u otro ensayo; una fila no
  heredada con su id se reconstruye (cantidad 450); un id ajeno da `null`. Y un parte con
  solo un material heredado no nombra «Control Calidad de Obra» al cerrar. Tres comandos en
  verde (189).
- **T26**: en `contratos.ts`:
  - `actividadDelParte` gana `unidad` (enum de las seis, `nullish` → `null`) y `cantidad`
    (`numeroOpcional`: no negativa). Su `superRefine` llama a `faltasDeActividad` con
    `otra = clave === CLAVE_OTRA_ACTIVIDAD` y pone cada falta bajo su campo.
  - `ensayoDelParte { id?, ensayo?, observacion? }`: con ensayo, exige
    `faltaObservacionDelEnsayo` bajo `observacion`; sin ensayo ni id, «Elija el ensayo.»
    bajo `ensayo`. Solo el id se acepta, porque es una fila heredada.
  - `ActividadDelParteFila` gana `item?`, `unidad?` y `cantidad?`. Nuevos
    `EnsayoDelParteFila` y `FilaDeControlDeCalidadFila`.
  **Dos transiciones, a propósito, para que cada tarea quede en verde:**
  1. `parteEditado.laboratorio` es por ahora `z.union([ensayoDelParte, materialDelParte])`,
     porque la pantalla sigue mandando materiales hasta T29. Por la misma razón, la ruta
     `PATCH` ramifica: con `material` → `construirMaterial`; si no → `construirEnsayo`
     (400 «Ese ensayo o material no está en la lista.»). T27 lo sustituye por
     `conservarHeredadas` y T29 quita la unión y los materiales.
  2. `ParteFila.laboratorio` **sigue** siendo `MaterialDelParteFila[]`: la pantalla lee
     `material` y `cantidad`, y pasarlo ya a la unión rompería `typecheck`. Cambia en T29,
     con la pantalla que sabe pintar las dos formas.
  **Para T27/T29:** dentro de la unión, un ensayo sin observación da un error de unión en vez
  del error bajo `observacion`. El 400 sale igual, pero sin campo. Al quitar la unión en T29
  vuelve a salir bajo su campo; comprobarlo entonces.
  **Pruebas escritas antes** (fallaron): un caso nuevo. «otra» sin unidad bajo `unidad` y sin
  cuál bajo `texto`, con los mensajes de la regla; «mts» bajo `unidad`; otra completa con
  cantidad 12,5; la 4.1.8 sin cantidad → `null`; cantidad −3 rechazada; ensayo en blanco bajo
  `observacion`; sin ensayo ni id bajo `ensayo`; `{ id }` aceptado; el parte con dos
  densidades y un id heredado se acepta, y con observación vacía se rechaza. Tres comandos en
  verde (190).
- **T27**: la ruta `PATCH` lee lo guardado **una sola vez**, si llegan actividades, control
  de calidad o algo que toque el día sin trabajo; antes eran dos lecturas posibles.
  Actividades y control de calidad se construyen con `conservarHeredadas`: con
  `esActividadHeredada` y `construirActividadDelParte`, y con `esMaterialHeredado` y la
  construcción transitoria de material o ensayo. **Ajuste en `conservarHeredadas`:** el
  genérico pasó de `Pedida extends { id?: string | null }` a `Pedida extends object`, y el
  id se lee con `'id' in`. Mientras la pantalla mande materiales sin id, TypeScript rechazaba
  la unión por no tener propiedades en común.
  **Consulta de solo lectura antes de probar (2026-09-16):** hay **6** partes abiertos (del 9
  al 16), no 5 como decía el plan, y **ninguno tiene actividades ni control de calidad
  guardados**. No existen filas heredadas reales; lo que dice el plan sobre ellas es
  prevención.
  **Comprobado contra el servidor real** (permiso de Diego, con `npm run web` reiniciado),
  sobre el parte del 2026-09-16 de Consorcio Antioquia. Primero se sembró por SQL una
  actividad con la forma antigua («excavacion», sin `unidad`) y un material («cemento», 4
  bultos). Después, desde la sesión de gerencia en Chrome:
  - La heredada llegó con otro nombre y medidas 9 × 9 × 9, junto a una 4.1.8 de 3 × 4 × 0,5
    con `unidad: 'kg'` y `cantidad: 99` → **200**: la heredada quedó idéntica, y la 4.1.8 con
    la descripción completa, `item` 4.1.8, «m³», área 12, volumen 6 y cantidad 6.
  - Clave «excavacion» con un id nuevo → **400** «Esa actividad no está en la lista.».
  - Otra sin unidad → **400** con `campos["actividades.0.unidad"]`.
  - Ensayo con observación vacía → **400** con `campos["laboratorio.1.observacion"]`.
  - El material heredado con un ensayo encima, y dos «Densidad en campo» con observación →
    **200**: el material quedó idéntico y los dos ensayos con ids distintos.
  - `{ id: 'id-ajeno' }` → **400** «Ese ensayo o material no está en la lista.».
  **Corrige la nota de T26:** con la unión, el error del ensayo **sí** sale bajo su campo.
  **Restaurado:** `actividades` y `laboratorio` del parte del 16 volvieron a `[]`, y la
  consulta lo confirma; el resto del parte sigue vacío, como estaba. Los scripts de la prueba
  se borraron. `expo export` no aplica: la ruta ya era `+api.ts` y no lee secretos nuevos.
  Tres comandos en verde (190).
- **T28**: sección Actividades de `pantalla-partes.tsx`:
  - El selector tiene las 31 actividades con «ítem · descripción» y, al final, «Otra
    actividad»; mide 460 de ancho.
  - Al lado, «Unidad» de solo lectura. Con «otra», en su lugar van «¿Cuál?» y un selector
    «Unidad», los dos obligatorios; al dejar «otra», la unidad elegida se borra.
  - «Cantidad (unidad)» usa `resolverCantidad`. Cuando la calcula, es de solo lectura y lleva
    la ayuda «Del volumen» / «Del área» / «De la longitud».
  - Al pulsar Guardar se corre `faltasDeActividad`. Si falta algo, **no se envía**: se escribe
    bajo cada campo, y arriba «Falta completar alguna actividad: está marcado bajo su campo.».
  - Las filas heredadas se ven como `Campo` de solo lectura, con la ayuda «De la lista
    anterior: se conserva como se guardó.», su foto y «Quitar actividad»; viajan como `{ id }`.
  `actividades.ts` ya no se importa en la pantalla.
  **Cambio fuera de la pantalla, necesario y hecho aquí:** una «otra» heredada no tiene
  unidad, y reenviada completa el contrato la rechazaba por RF-70 antes de que el servidor
  pudiera conservarla. Por eso:
  - `contratos.ts` suma `actividadConservada`: solo `{ id }`, **estricta**, para que una fila
    con más campos no se cuele por ahí y su error no pierda el campo.
  - `parteEditado.actividades` pasa a ser la unión de las dos.
  - La ruta construye solo lo que trae `clave`.
  Un aserto nuevo en el caso del contrato: `{ id }` más una 4.1.8 se aceptan, y otra sin
  unidad sigue saliendo bajo `actividades.0.unidad`. **Ojo:** tocar la ruta obliga a
  reiniciar `npm run web` antes de guardar desde el panel. Esta parte no se probó con una
  petición real; va en T30.
  **Comprobado en Chrome el 2026-09-16, sin guardar** (sesión de gerencia, parte del 16):
  - Tres actividades añadidas; la primera arranca en 2.8, con «m³».
  - Las opciones largas se ven en dos o tres renglones, sin romper la fila, y el valor
    elegido se corta con «…». No hizo falta lo del riesgo del plan.
  - «acero» deja solo la 10.1 → «kg», y la cantidad se escribe a mano (500).
  - «4.1.8» la encuentra → «m³»; con 3 × 4 × 0,5, área 12, volumen 6 y «Cantidad (m³)» 6 en
    gris, con «Del volumen».
  - «otra» en la segunda fila muestra «¿Cuál? *» y «Unidad *» (con «Elija»); sin llenarlos,
    Guardar escribe «Escriba cuál fue la actividad.» y «Elija la unidad de la actividad.»
    bajo cada uno, y **no salió ninguna petición** (espía de `fetch`: vacío).
  - **Fila heredada:** en la base no hay ninguna (T27), así que se **simuló solo en el
    navegador**, alterando la respuesta de `fetch`, **sin escribir en la base**. «Excavación»
    se vio con sus medidas en campos de solo lectura y con la nota. Después se restauró
    `fetch` y se recargó la página.
  No se guardó nada. Tres comandos en verde (190).
- **T29**: sección Control Calidad de Obra de `pantalla-partes.tsx`:
  - Selector «Ensayo *» con los 17 y buscador; arranca vacío («Elija el ensayo»), sin
    ensayo elegido de antemano, para que nadie registre el primero de la lista por descuido.
  - «Observación *» en área de texto, con la ayuda «Si no hay nada que anotar, escriba «Sin
    observaciones».»; «Añadir ensayo» y «Quitar».
  - Al pulsar Guardar se corren «Elija el ensayo.» y `faltaObservacionDelEnsayo`. Si falta
    algo, **no se envía**: se escribe bajo cada campo, y arriba «Falta completar algún ensayo:
    está marcado bajo su campo.».
  - Los materiales heredados se ven en campos de solo lectura («Material», «Cantidad»), con
    la nota y «Quitar»; viajan como `{ id }`.
  - De solo lectura, una sola tabla con «Ensayo o material» (240) y «Observación o
    cantidad» (480); la prueba de ancho pasa.
  **Salió** del código: `MATERIALES_LABORATORIO`, `UnidadMaterial`, `ETIQUETA_UNIDAD`,
  `MaterialLaboratorio`, `Material`, `IDS_MATERIAL`, `materialPorId`, `nombreDeMaterial`,
  `cantidadLegible`, `construirMaterial`, `MaterialPedido`, el contrato `materialDelParte`,
  la unión transitoria de `parteEditado.laboratorio` (ahora `z.array(ensayoDelParte)`) y la
  rama de la ruta (ahora `construirEnsayo`, con 400 «Ese ensayo no está en la lista.»).
  `ParteFila.laboratorio` pasa a `FilaDeControlDeCalidadFila[]`. **Se conservan**
  `MaterialDelParte` y `MaterialDelParteFila`, que describen las filas viejas. El `grep` de
  `MATERIALES_LABORATORIO`, `construirMaterial`, `cantidadLegible`, `materialPorId` y
  `ETIQUETA_UNIDAD` en `src/` y `scripts/` sale vacío.
  **Pruebas:** el caso de los materiales pasó a ser «las condiciones de clima se nombran como
  se leen». El caso del contrato suma dos asertos: en el parte, el ensayo sin observación sale
  bajo `laboratorio.0.observacion` (vuelve el campo al quitar la unión, como pedía la nota de
  T26), y `{ material: 'cemento', cantidad: 4 }` ya se rechaza. Fallaron antes del cambio.
  **Error mío, corregido antes de marcar:** al quitar los materiales de `bitacora.ts` corté por
  índices suponiendo que los ensayos venían después, y venían antes, así que se duplicaron.
  `typecheck` lo delató y se dejó el archivo hasta `nombreDeEnsayo`.
  **Comprobado en Chrome el 2026-09-16, sin guardar** (gerencia, parte del 16):
  - Dos «Añadir ensayo»; el selector abre con buscador y la lista empieza en «Granulometría».
  - «densidad» → «Densidad en campo» en las dos filas (RF-73).
  - Con observación solo en la primera, Guardar marca en rojo la segunda con el mensaje de
    RF-72, y **no salió ninguna petición**.
  - **Material heredado y tabla de solo lectura, simulados solo en el navegador** (respuesta de
    `fetch` alterada, **sin escribir en la base**): «Cemento» / «4 bultos» de solo lectura con
    la nota, junto a un «Espesor» editable; y con el parte marcado cerrado en la respuesta, la
    tabla «Cemento — 4 bultos» / «Espesor — Promedio 20 cm (simulado)».
  Después se restauró `fetch`, se recargó y se consultó la base: el parte del 16 sigue abierto,
  con `actividades` y `laboratorio` en `[]`. **Ojo:** tocar la ruta y el contrato obliga a
  reiniciar `npm run web`. De paso se vio en la bitácora del 16 un viaje de cantera vigente
  (10:41, VOL-01, Subbase, Cantera La Esperanza → PR 10 + 200) que no registró el asistente.
  Tres comandos en verde (190).

### T30 — validación del cambio del 2026-09-16 (RF-61 a RF-74)

Hecha el 2026-09-16 con la sesión de gerencia, **guardando** en el parte abierto del 16
(Consorcio Antioquia), con permiso de Diego. **No se cerró el parte**: para cerrar hacen
falta las siete secciones, y eso lo hace Diego (010/T11 y 004/T12). Antes de probar, una
petición que el servidor rechaza sin escribir confirmó que corría el código de T29 («Ese
ensayo no está en la lista.»).

Para probar RF-63 y RF-71 se sembraron por SQL una actividad y un material con la forma
antigua («Excavación», 2 × 1; «Cemento», 4 bultos), marcados «Prueba T30». Al terminar se
quitaron **desde la pantalla**.

| RF | Comprobación | Resultado |
| --- | --- | --- |
| 61 | Dos «Añadir ensayo», elegidos de la lista de 17, con observación; Guardar | ✅ 200: `ensayo`, nombre «Densidad en campo» y observación |
| 62 | La fila del ensayo no tiene cantidad ni unidad; el contrato rechaza `{ material, cantidad }` | ✅ En pantalla (T29) y en el guion |
| 63 | «Cemento — 4 bultos» se ve de solo lectura; se guarda la sección y se compara en la base | ✅ Idéntico campo a campo (`deepStrictEqual`) |
| 64 | Selector con las 31 del presupuesto, sin repetidas; la 4.1.8 se guarda con su descripción completa e `item` | ✅ En pantalla y en la respuesta |
| 65 | «4.1.8», «acero» y «densidad» encuentran su opción | ✅ En Chrome (T28, T29, T30) y en el guion |
| 66 | Al elegir, «m³» / «kg» al lado, de solo lectura | ✅ |
| 67 | «Cantidad (unidad)» en cada actividad y guardada en su unidad | ✅ 6 m³, 500 kg, 4 m³ |
| 68 | 4.1.8 con 3 × 4 × 0,5 → cantidad 6 calculada, gris, «Del volumen»; «otra» en m³ con 2 × 2 × 1 → 4 | ✅ En pantalla y guardado |
| 69 | 10.1 → cantidad escrita a mano (500) | ✅ Guardado 500 kg |
| 70 | «Otra actividad» pide «¿Cuál?» y «Unidad» (sin ellos, error bajo el campo y no se envía, T28); con los dos se guarda con `item: null`, «m³» y su nombre | ✅ |
| 71 | La actividad heredada se ve de solo lectura con su nota; guardada otra vez queda idéntica en la base | ✅ `deepStrictEqual` |
| 72 | Observación vacía → error bajo el campo, sin enviar (T29); «Sin observaciones» se guarda | ✅ |
| 73 | Dos «Densidad en campo» en el mismo parte | ✅ Dos filas con ids distintos |
| 74 | 10.1 sin cantidad → `null` (guion); la «otra» no exige cantidad | ✅ En el guion; en pantalla no hubo que escribirla para guardar |

**Después de guardar** se recargó la página: las tres actividades (4.1.8, 10.1, «otra» con
m³) y los dos ensayos se ven como se guardaron, con la cantidad calculada otra vez en gris.
Luego se quitaron la actividad y el material heredados con «Quitar actividad» / «Quitar» y
se guardó cada sección (200): quedaron actividades `[4.1.8, 10.1, otra]` y control de
calidad `[densidad_en_campo, densidad_en_campo]`.

**Queda en la base, en el parte del 16 (abierto):** tres actividades («Prueba T30 box
coulvert», «Prueba T30 acero», «Prueba T30 limpieza de derrumbe») y dos ensayos («Prueba T30:
lote 1, 98 %» y «Sin observaciones»). Se dejaron para que Diego los vea. Puede quitarlos o
reemplazarlos al llenar el parte de verdad.

**Cierre de la tarea:** `expo export --platform web` sin error; `grep DATABASE_URL
dist/client` vacío; `dist` borrado. Los scripts temporales de SQL se borraron. Tres comandos
en verde (190). La spec 004 sigue **En curso**: falta T12, la validación de toda la spec, que
incluye cerrar un parte.

---

## Cambio del 2026-09-17 (RF-75 a RF-77)

Dos tareas. La primera es el cambio entero; la segunda lo valida. T12, la validación de toda
la spec, sigue yendo al final de todo.

- [ ] T31. La actividad se ofrece y se lee solo con su descripción. (RF-75, RF-76, RF-77)
      `etiquetaDeActividad` devuelve la descripción sola; el comentario del bloque pasa a
      decir por qué ya no lleva el número, y con él el comentario de las `opciones` de
      `pantalla-partes.tsx`. El `valor` de la opción sigue siendo el ítem y el campo `item`
      de lo guardado no se toca.
      Hecho cuando: en el guion, `etiquetaDeActividad(4.1.8)` es exactamente la descripción;
      `filtrarOpciones(opciones, '4.1.8')` no devuelve nada y «excavacion» y «acero» siguen
      encontrando la suya; los tres comandos en verde.

- [ ] T32. Validación del cambio RF por RF con demo. (RF-75, RF-76, RF-77)
      Hecho cuando: en Chrome, con `npm run web` reiniciado, la lista de Actividades se ve
      sin números (RF-75), «acero» encuentra y «10.1» no encuentra nada (RF-76), y las
      actividades ya guardadas del parte del 16 se ven sin número y siguen igual al guardar
      otra vez (RF-77); cada RF con su resultado escrito en las notas; los tres comandos en
      verde.
