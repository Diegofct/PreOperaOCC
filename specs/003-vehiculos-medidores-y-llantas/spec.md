# Spec 003 — Vehículos: tipos, medidores y llantas

> Estado: En curso · Fecha: 2026-09-09

## Contexto y objetivo

La flota creció y el registro de equipos se quedó corto en tres puntos.

Faltan dos tipos de máquina que ya están en obra: la vibrocompactadora y la recicladora.
Faltan por distinguir bien los medidores: una camioneta y una volqueta se controlan por
kilómetros recorridos, no por horas de motor, y hoy el sistema les pide las dos lecturas.
Y faltan las llantas, que en esta flota son un costo grande y hoy no se controlan: el
formato del preoperacional pregunta si están bien o mal, pero nadie sabe qué llanta es,
de qué medida ni cuánto le queda.

El objetivo es que la ficha de un equipo diga la verdad sobre lo que se le mide y sobre lo
que rueda.

## Usuarios / actores

- **Gerencia** — registra los equipos, sus medidas y el estado de sus llantas.
- **Operador** — reporta las lecturas en su preoperacional diario; le afecta qué se le pide.
- **Residente** — consulta la flota de su obra para asignarla.

## Historias de usuario

- H1: Como gerencia quiero registrar vibrocompactadoras y recicladoras, para tener toda la
  flota en el sistema y no en una hoja aparte.
- H2: Como operador de camioneta quiero que me pidan el kilometraje y no las horas de
  motor, para reportar lo que de verdad marca mi tablero.
- H3: Como gerencia quiero llevar el control de cada llanta, para saber cuál hay que
  cambiar antes de que se convierta en un accidente o en una varada en carretera.

## Requisitos funcionales (criterios de aceptación en EARS)

### Tipos de equipo nuevos (H1)

- RF-1: EL SISTEMA ofrecerá Vibro Compactadora y Recicladora como tipos de equipo al
  registrar un vehículo.
- RF-2: EL SISTEMA controlará esos dos tipos por horas de motor, como el resto de la
  maquinaria amarilla.
- RF-3: SI un equipo es de un tipo para el que todavía no existe formato de preoperacional,
  ENTONCES EL SISTEMA lo indicará en su ficha y no permitirá iniciar un preoperacional de
  ese equipo, explicando que el formato está pendiente.

### Qué se le mide a cada equipo (H2)

- RF-4: EL SISTEMA controlará las camionetas y las volquetas por kilometraje, y no les
  exigirá lectura de horas de motor.
- RF-5: CUANDO la gerencia elija el tipo de equipo al registrarlo, EL SISTEMA mostrará
  únicamente el medidor que corresponde a ese tipo.
- RF-6: EL SISTEMA aceptará el registro de un equipo sin lectura inicial de medidor, y lo
  tomará como que aún no se conoce, no como cero.
- RF-7: SI llega una lectura menor que la última conocida de ese equipo, ENTONCES EL
  SISTEMA la rechazará explicando cuál era la anterior.
- RF-8: EL SISTEMA conservará sin cambios los preoperacionales ya firmados con el formato
  anterior, incluidas las lecturas de horas de motor que se tomaron a camionetas y
  volquetas hasta hoy.

### Control de llantas (H3)

- RF-9: EL SISTEMA permitirá registrar, para cada equipo, una ficha por cada llanta, con su
  posición en el vehículo, marca, rin, ancho, altura y porcentaje de desgaste.
- RF-10: EL SISTEMA mostrará las llantas de un equipo junto con su ficha, ordenadas por
  posición.
- RF-11: SI se registra un porcentaje de desgaste fuera del rango de 0 a 100, ENTONCES EL
  SISTEMA lo rechazará.
- RF-12: SI se intenta registrar dos llantas en la misma posición del mismo equipo,
  ENTONCES EL SISTEMA lo rechazará.
- RF-13: EL SISTEMA permitirá modificar la ficha de una llanta y retirarla, conservando el
  registro de la retirada en lugar de borrarlo.
- RF-14: MIENTRAS un equipo tenga alguna llanta a la que le quede 30% de vida útil o menos
  —es decir, con 70% de desgaste o más—, EL SISTEMA lo señalará en el listado de la flota.
- RF-15: SI una llanta no tiene lectura de desgaste, ENTONCES EL SISTEMA no la señalará como
  gastada: no saberlo no es lo mismo que saber que está mal.

## Superficies afectadas

- [x] **Móvil** — cambia lo que se le pide al operador de camioneta y volqueta en el
  preoperacional; recibe los tipos de equipo nuevos.
- [x] **Panel web** — formulario y listado de Vehículos, y la sección de llantas.
- [x] **API** — alta, edición y consulta de vehículos; rutas de llantas.
- [x] **Sincronización** — los tipos nuevos y el cambio de medidor bajan al celular.
- [x] **Datos** — tabla nueva para las llantas y cambio en el catálogo de tipos, en las dos
  bases, con sus migraciones.
- [x] **Reglas** — la validación de medidores cambia de criterio según el tipo de equipo.

## Requisitos no funcionales

- El cambio de formato de camioneta y volqueta no invalida ningún acta firmada: las
  anteriores se leen con el formato con el que se firmaron.
- La lista de tipos de equipo sigue definiéndose en un solo sitio para las dos bases.

## Casos límite

- **Sin señal**: el operador ve el formato que bajó la última vez. Si el formato cambió y
  aún no ha sincronizado, firma con el anterior y el servidor lo acepta tal cual (RF-8).
- **Evidencia firmada**: ningún preoperacional ya firmado se reescribe ni se revalida con
  el formato nuevo.
- **Primer arranque**: un equipo recién registrado no tiene llantas ni lectura previa; la
  ficha debe verse bien vacía.
- Un equipo de un tipo **sin formato** al que ya se le asignó un operador: el operador debe
  entender por qué no puede hacer el preoperacional (RF-3), en lugar de encontrarse una
  pantalla rota.
- Una llanta se **cambia** por una nueva: RF-13. La ficha vieja no desaparece.
- Un equipo con **más llantas de las esperadas** (una volqueta con doble llanta trasera, un
  repuesto): el sistema no impone un número fijo.

## Fuera de alcance

- El formato de preoperacional de la vibrocompactadora y de la recicladora, hasta que OCC
  lo entregue en el mismo formato de hoja de cálculo que los cinco actuales.
- Historial de desgaste de una llanta en el tiempo, y alertas por kilómetros recorridos.
- Rotación de llantas entre posiciones o entre equipos.
- Costos, proveedores, facturas o inventario de llantas en bodega.
- Cambiar los medidores de la maquinaria amarilla, que sigue con horas de motor.

## Criterios de finalización

- Cada RF con su comprobación: las de medidores y desgaste (RF-4, RF-6, RF-7, RF-11, RF-12)
  como casos en el guion de verificación; el resto, como paso de demo manual.
- Las migraciones existen en las dos bases.
- Demo manual: registrar una recicladora y comprobar el aviso de formato pendiente;
  registrar una camioneta y comprobar que solo pide kilometraje; cargarle cuatro llantas y
  ver el aviso de desgaste al poner una por encima del umbral.

## Dudas abiertas

Resueltas el 2026-09-09:

- **Posiciones**: lista fija por tipo de equipo. El texto libre haría que la misma rueda se
  registrara de tres maneras distintas y no habría seguimiento posible.
- **Umbral**: se avisa cuando a la llanta le queda **30% de vida útil o menos** (RF-14). El
  acuerdo se dijo como «cuando llegue al 30%», que en obra es la vida restante, no el
  desgaste acumulado. Leerlo al revés marcaría la flota entera.
- **Quién lo actualiza**: por ahora la gerencia, desde el panel. Que salga del preoperacional
  del operador exige añadir una medición por llanta al formato firmado por OCC, y eso es un
  cambio de su documento: va en una spec aparte.
Sigue abierta:

- [NECESITA ACLARACIÓN: al quitarle el horómetro a camionetas y volquetas, el formato de la
  app ya no coincide con el Excel firmado por OCC, que mantiene esa casilla. Hay que
  decírselo a quien lo aprobó y decidir si se corrige la hoja original.]
