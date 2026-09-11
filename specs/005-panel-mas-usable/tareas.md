# Tareas — Spec 005

Veinticuatro requisitos no caben en un bloque. El orden va de lo que sostiene a lo que se
ve: primero las piezas que faltan en la caja de componentes, porque todo lo demás las usa y
sin ellas el mismo código se repetiría en cinco pantallas; después lo que más duele en el
uso diario; y al final lo más vistoso.

## Las piezas que faltan

- [x] T1. `componentes.tsx`: ventana modal, barra de listado con búsqueda y cuenta,
      paginación y aviso de hecho. (RF-4, RF-12 a RF-14, RF-17, RF-18, RF-23)
      Hecho cuando: existen, salen todas de los tokens del tema y la pantalla de personas ya
      usa la ventana.

- [x] T2. Aviso de operación exitosa que no interrumpe, y estado «en curso» que impide
      lanzar dos veces. (RF-17, RF-18)
      Hecho cuando: guardar confirma sin tapar la pantalla y el botón dice «Guardando…» y no
      admite un segundo clic.

## Se puede corregir

- [x] T3. Editar una persona: la pantalla llama al `PATCH` que ya existía y nadie usaba.
      (RF-1, RF-2, RF-3)
      Hecho cuando: se corrige un nombre sin dar de baja, solo viajan los campos que
      cambiaron, y dejar el nombre vacío no deja guardar.

- [x] T4a. Editar un vehículo. (RF-1, RF-2, RF-3, RF-4)
      Hecho cuando: se corrige código, placa, marca, modelo, obra y estado sin dar de baja;
      el tipo de equipo **no** se corrige, y la ventana explica por qué.

- [x] T4b. Editar una obra. (RF-1, RF-2, RF-3, RF-4)
      Hecho cuando: se corrige nombre, municipio y si está activa; el **código no** se
      corrige, y la ventana explica por qué.

- [x] T5. Dar de baja una persona pide confirmación diciendo qué implica. (RF-4)
      Hecho cuando: el aviso nombra a la persona y explica que no se borra, que sus
      preoperacionales firmados siguen apuntándole.
      Vehículos y obras también (T4a, T4b).

## Encontrar las cosas

- [x] T6. Búsqueda por texto y filtros por obra y estado. (RF-12, RF-13)
      Hecho cuando: buscar «topografo» encuentra a «Topógrafo» —hay caso en verde—, y los
      filtros de obra y estado se combinan con la búsqueda. Está en Personas y Vehículos.

- [x] T7a. Paginación con el total a la vista. (RF-14)
      Hecho cuando: la barra dice «12 de 240» al filtrar y la paginación desaparece cuando
      todo cabe en una página.

- [x] T7b. La búsqueda vive en la dirección de la página. (RF-15)
      Hecho cuando: recargar no pierde el filtro y el enlace se puede pasar a otro; escribir
      en el buscador no llena el historial de una entrada por letra.

- [x] T6b. Búsqueda y filtro por resultado en Preoperacionales. (RF-12, RF-13)
      Hecho cuando: se puede buscar por equipo, tipo, operador u obra, y filtrar por NO APTO.

## El inicio que dice cómo va

- [x] T8. Consulta de resumen con el alcance por obra. (RF-5, RF-11, RF-25)
      Hecho cuando: las cifras viajan contadas y no en filas, y las horas de motor no se
      suman con los kilómetros.

- [x] T9. El inicio de la gerencia: cumplimiento, equipos NO APTOS, trabajo del periodo y
      partes sin cerrar, con selector de periodo. (RF-5 a RF-11, RF-24, RF-25)
      Hecho cuando: la barra de cumplimiento lleva el número escrito al lado, hay tabla con
      las mismas cifras, y un periodo sin datos lo dice en vez de mostrar ceros.

- [x] T10. El inicio del residente: qué le falta por hacer hoy en su obra, con atajos.
      (RF-24)
      Hecho cuando: lo primero que ve es lo que no puede quedarse sin resolver hoy.

## Que se vea bien de verdad

- [x] T11a. Las tablas del panel caben en el ancho, y se comprueba solo. (RF-20)
      Hecho cuando: hay un caso que recorre las pantallas, suma anchos y separaciones, y
      falla si alguna se pasa de 1280. Las nueve tablas de hoy pasan.

- [x] T11b. Contraste 4.5:1, comprobado con una cuenta y no a ojo. (RF-22)
      Hecho cuando: hay un caso que calcula la relación de contraste de la WCAG sobre once
      pares de la paleta y falla si alguno baja de 4.5:1. Los once pasan.

- [x] T11c. Anillo de foco en campos, botones y selectores. (RF-21)
      Hecho cuando: lo que se pulsa marca dónde está el teclado. Se lleva con estado propio
      y no con `focused`, que solo existe en el React Native de la web y no está en los
      tipos. **Recorrer el panel entero con el tabulador queda por probar con la pantalla
      delante.**
- [x] T12. Estados vacíos que explican qué se registra ahí y cómo empezar. (RF-19)
      Hecho cuando: obras, personas, vehículos y preoperacionales dicen para qué sirve la
      pantalla cuando no hay nada, y qué hacer.
- [x] T13a. La fotografía por actividad, que quedó pendiente de la spec 004. (004/RF-23)
      Hecho cuando: cada actividad guardada admite su foto y **la conserva** al volver a
      guardar el parte — el servidor ya no le cambia el id.

- [x] T13b. El formulario del parte diario, agrupado. (RF-23)
      Hecho cuando: las cinco listas del parte —maquinaria, personal, actividades, clima y
      laboratorio— dejan de ser una tarjeta por fila y pasan a filas dentro de un solo
      bloque por sección, separadas por una línea fina. El primer intento se hizo con un
      reemplazo global, descuadró las etiquetas y se revirtió; este se hizo sección por
      sección comprobando cada una.
- [x] T14. Validación RF por RF de las cinco specs. (Todos)
      Hecho cuando: está escrita en `specs/VALIDACION.md`, con lo comprobado, lo que solo se
      puede ver funcionando y en qué orden mirarlo.

## Notas de ejecución

- **La marca de OCC la va a entregar el cliente** (logo y colores). Todo el color sale de
  `constants/theme`, así que aplicarla al final es tocar un archivo. Hasta entonces se
  trabaja con la paleta actual y no se inventa una identidad que después haya que deshacer.
- La paleta de las gráficas se valida contra daltonismo con el guion de la skill `dataviz`,
  no a ojo.
- Sigue abierta la duda de si la lista de actividades improductivas sirve como está para
  medir rendimiento. T8 la usa; si OCC la corrige, cambia el catálogo y no el cálculo.
- **La marca de OCC ya está aplicada** (10 de septiembre de 2026), con una decisión que
  conviene conocer: el rojo del logotipo **no se usa para acciones**. En esta aplicación el
  rojo ya significa NO APTO, dar de baja y anulado; una barra y unos botones rojos le
  quitarían el susto al único color que tiene que darlo. La identidad la carga el logotipo y
  las acciones van en el grafito del propio logotipo. Los tokens son de `Panel`, no de
  `Marca`: la app del operador conserva los suyos, porque la spec declara el móvil fuera de
  alcance.
- **Se filtra en el navegador, no en el servidor**, y es una decisión con fecha de
  caducidad. Los listados se piden enteros y son de cientos de filas: filtrar aquí es
  instantáneo, no añade un viaje por cada letra y no obliga a tocar seis endpoints. Cuando
  una obra tenga varios miles de preoperacionales, se lleva al servidor — y el sitio donde
  hacerlo es `usar-listado-filtrado.ts`, no las pantallas.
- **La barra del panel pasó a blanca** al llegar el logotipo transparente: lleva «OBRAS» en
  negro y «CIVILES» en gris, y sobre fondo oscuro se perdía media marca. El grafito se queda
  para lo que se pulsa.
