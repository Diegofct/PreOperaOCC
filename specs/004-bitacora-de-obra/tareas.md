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
  la duda que sigue abierta en la spec.
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
