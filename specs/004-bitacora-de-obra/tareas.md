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
