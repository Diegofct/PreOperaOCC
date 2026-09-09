# Tareas — Spec 003

La spec tiene dos mitades independientes: **medidores** (RF-1 a RF-8), que no dependía de
ninguna duda abierta y ya está hecha, y **llantas** (RF-9 a RF-14), que está parada
esperando dos decisiones tuyas.

## Medidores y tipos de equipo

- [x] T1. Catálogo: dos tipos nuevos (Vibro Compactadora y Recicladora, por horas de motor)
      y camioneta y volqueta pasan a kilometraje. (RF-1, RF-2, RF-4)
      Hecho cuando: el catálogo lo refleja y el panel ofrece los siete tipos.

- [x] T2. `plantillas/ajustes.ts`: el mecanismo que `index.ts` prometía y no existía. Quita
      el ítem de horómetro de camioneta y volqueta y sube su plantilla a v2. (RF-4, RF-8)
      Hecho cuando: `npm run formatos` genera `camioneta.v2.json` (58 ítems) y
      `volqueta.v2.json` (86), y las v1 siguen en la base del servidor para las actas ya
      firmadas.

- [x] T3. Las pruebas apuntan a la v2 y no a la v1, con sus conteos al día. (RF-4, RF-8)
      Hecho cuando: hay un caso que falla si alguien reimporta los formatos sin aplicar los
      ajustes.

- [x] T4. Marca «sin formato» en el catálogo, con la comprobación que impide que se separe
      de las plantillas que existen de verdad. (RF-3)
      Hecho cuando: quitar la marca sin añadir la plantilla —o al revés— falla en el guion
      de verificación.

- [x] T5. El aviso, en las dos superficies: el panel lo dice al registrar y en el listado;
      la app del operador lo explica en vez de quedarse girando. (RF-3)
      Hecho cuando: abrir el preoperacional de un equipo sin formato muestra el motivo.

- [x] T6. La ruta del panel deja de admitir un medidor que retrocede. (RF-7)
      Hecho cuando: un `PATCH` con una lectura menor que la última conocida es rechazado con
      el mensaje que dice cuál era la anterior.

## Llantas

- [x] T7. Catálogo de posiciones fijas por tipo de equipo, y tabla de llantas en el
      servidor con su migración. (RF-9)
      Hecho cuando: hay casos en verde para las posiciones de cada tipo, y el índice único
      parcial impide dos llantas puestas en el mismo sitio dejando reutilizar la posición
      cuando se retira una.

- [x] T8. Rutas y pantalla: montar, actualizar el desgaste, retirar y listar por equipo.
      (RF-9 a RF-13)
      Hecho cuando: una posición de otro tipo de equipo es rechazada, montar sobre una
      posición ocupada devuelve un mensaje que explica qué hacer, y retirar conserva la fila
      con su motivo.

- [x] T9. Aviso de desgaste en el listado de la flota y en la ficha. (RF-14, RF-15)
      Hecho cuando: hay casos en verde que fijan el sentido del umbral —69% de desgaste no
      avisa, 70% sí— y una llanta sin medir no se marca como gastada.

- [ ] T10. Validación final RF por RF. (Todos)

## Notas de ejecución

- **RF-5 y RF-6 ya se cumplían** antes de esta spec: el formulario del panel muestra solo el
  medidor que corresponde al tipo, y una lectura vacía se guarda como «no se sabe», no como
  cero. Se dejan escritos porque el cambio de camioneta y volqueta los pone a prueba.
- Se sembró el catálogo del servidor (`db:sembrar:servidor`): siete tipos y las plantillas
  v2 conviviendo con las v1. La v1 de volqueta **no se puede borrar**: hay un
  preoperacional firmado contra ella.
- El formato de camioneta y volqueta ya **no coincide con el Excel de OCC**, que sigue
  trayendo casilla de horómetro. Es la consecuencia aceptada de RF-4 y conviene que OCC lo
  sepa.
- El desgaste lo actualiza hoy la gerencia desde el panel. Que salga del preoperacional del
  operador exige añadir una medición por llanta al formato firmado por OCC: es un cambio del
  documento, no de la aplicación, y merece su propia spec.
- La tabla de llantas es **solo del servidor**. La spec marcaba «las dos bases», pero el
  celular no las lee ni las escribe, y replicar al teléfono una tabla que nadie mira es peso
  muerto en cada bajada. El día que el preoperacional mida el desgaste, se replica.
- Las configuraciones de llanta de cada tipo están **pendientes de validación por OCC**,
  igual que el catálogo de actividades de la bitácora: son las habituales de cada máquina,
  no las de la flota concreta.
