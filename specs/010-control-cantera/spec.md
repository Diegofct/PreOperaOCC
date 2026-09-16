# Spec 010 — Control Cantera

> Estado: Aprobada · Fecha: 2026-09-14 · Aprobada: 2026-09-15

## Contexto y objetivo

Las volquetas de la obra van a las canteras a cargar material —afirmado, subbase, arena,
triturado— y lo llevan a la obra o a otros sitios, como una planta. Hoy no queda registro de
qué material sacó cada volqueta, de dónde a dónde fue, ni **en qué punto de la vía lo
descargó**. Ese último dato es el que importa en una vía: la obra se mide por abscisas, y
«llegó al PR 5 + 300» dice exactamente dónde quedó el material.

Este módulo registra cada viaje: material, volqueta, origen y destino, y la abscisa de
llegada cuando el destino es la obra. Y se amarra a la bitácora: el parte diario muestra los
viajes de ese día, para que el residente vea en un solo documento lo que llegó a su obra.

## Usuarios / actores

- **Encargado de Planta** (spec 008) — registra los sitios, los materiales de cantera y los
  viajes de su obra, y anula los equivocados.
- **Gerencia** — puede hacer todo lo del encargado de planta, en cualquier obra.
- **Residente / director de obra** — consulta los viajes de su obra, en el módulo y dentro de
  la bitácora del día.
- **Conductor / operador de la volqueta** — hace el viaje y queda anotado en él; no registra
  nada en este módulo.

## Historias de usuario

- H1: Como encargado de planta quiero tener registradas las canteras, plantas y materiales,
  para elegirlos de una lista y no escribirlos distinto cada vez.
- H2: Como encargado de planta quiero registrar cada viaje con su material, volqueta,
  origen, destino y la abscisa de llegada a la obra, para saber qué llegó y dónde se
  descargó.
- H3: Como residente o gerencia quiero consultar los viajes por periodo, volqueta, material o
  sitio, para revisar el acarreo sin pedirlo por teléfono.
- H4: Como residente quiero ver en la bitácora del día los viajes de cantera de mi obra, para
  tener el día completo en un solo documento.

## Requisitos funcionales (criterios de aceptación en EARS)

### Sitios y materiales (H1)

- RF-1: EL SISTEMA permitirá registrar los sitios de origen y destino de una obra, cada uno
  con su nombre y su tipo: cantera, planta u otro.
- RF-2: EL SISTEMA permitirá registrar los materiales de cantera de una obra, cada uno con su
  nombre.
- RF-3: SI se intenta registrar un sitio o un material con el mismo nombre que otro vigente
  de la misma obra, sin distinguir tildes ni mayúsculas, ENTONCES EL SISTEMA lo rechazará.
- RF-4: EL SISTEMA permitirá corregir el nombre de un sitio o de un material, sin alterar los
  viajes ya registrados.
- RF-5: EL SISTEMA permitirá dar de baja un sitio o un material conservando los viajes que lo
  usaron.
- RF-6: MIENTRAS un sitio o un material esté dado de baja, EL SISTEMA dejará de ofrecerlo para
  registrar viajes nuevos.

### El viaje (H2)

- RF-7: EL SISTEMA permitirá registrar un viaje con su fecha y hora, su material, su
  volqueta, su origen y su destino.
- RF-8: EL SISTEMA ofrecerá como volqueta únicamente los vehículos activos de tipo volqueta de
  la obra.
  > **Precisado el 2026-09-16**: «activos» es en estado operativo. Una volqueta NO APTO, en
  > mantenimiento, fuera de servicio o dada de baja no se ofrece.
- RF-9: EL SISTEMA ofrecerá como origen los sitios vigentes de la obra.
- RF-10: EL SISTEMA ofrecerá como destino los sitios vigentes de la obra y, además, la propia
  obra.
- RF-11: CUANDO el destino elegido sea la obra, EL SISTEMA pedirá el PR y los metros de
  llegada.
- RF-12: EL SISTEMA ofrecerá para elegir el PR de llegada entre 0 y 25, de uno en uno.
- RF-13: EL SISTEMA ofrecerá para elegir los metros de llegada entre 0 y 975, de 25 en 25.
- RF-14: SI el destino es la obra y falta el PR o los metros, ENTONCES EL SISTEMA rechazará el
  viaje indicando cuál falta.
- RF-15: SI el destino no es la obra, ENTONCES EL SISTEMA no pedirá ni guardará PR ni metros.
- RF-16: SI llega un PR o unos metros fuera de esos rangos o que no sean múltiplo de 25,
  ENTONCES EL SISTEMA rechazará el viaje.
- RF-17: EL SISTEMA mostrará la llegada a la obra como abscisa, con la forma «PR 5 + 300».
  > **Precisado el 2026-09-16**: los metros van siempre con tres cifras: «PR 0 + 000»,
  > «PR 5 + 050», «PR 25 + 975».
- RF-18: SI el origen y el destino son el mismo sitio, ENTONCES EL SISTEMA rechazará el viaje.
- RF-19: SI la fecha del viaje es posterior al día de hoy, ENTONCES EL SISTEMA lo rechazará.
- RF-34: EL SISTEMA registrará en cada viaje el conductor de la volqueta. *(2026-09-15)*
- RF-35: EL SISTEMA ofrecerá como conductor a las personas activas de la obra cuyo cargo
  conduce u opera vehículos. *(2026-09-15)*

### Consulta (H3)

- RF-20: EL SISTEMA listará los viajes de la obra en un periodo, del más reciente al más
  antiguo.
- RF-21: EL SISTEMA permitirá filtrar los viajes por volqueta, material, origen y destino.
- RF-22: EL SISTEMA mostrará en cada viaje quién lo registró y cuándo.

### Corregir sin borrar

- RF-23: EL SISTEMA no permitirá modificar ni borrar un viaje registrado.
- RF-24: EL SISTEMA permitirá anular un viaje con un motivo escrito.
- RF-25: CUANDO se anule un viaje, EL SISTEMA lo seguirá mostrando en el módulo marcado como
  anulado.

### En la bitácora del día (H4)

- RF-26: EL SISTEMA mostrará en la bitácora de obra una sección «Control Cantera» con los
  viajes vigentes de esa obra en ese día.
- RF-27: EL SISTEMA presentará esa sección como de solo lectura dentro de la bitácora.
- RF-28: EL SISTEMA incluirá esa sección en el índice del parte con cuántos viajes tiene.
- RF-29: CUANDO se cierre la bitácora, EL SISTEMA dejará fijados en ella los viajes vigentes
  en ese momento.
- RF-30: SI se registra o se anula un viaje de un día cuya bitácora ya está cerrada, ENTONCES
  EL SISTEMA lo aceptará en Control Cantera sin alterar la bitácora cerrada, y se lo advertirá
  a quien lo registra.
- RF-31: SI ese día no hubo viajes, ENTONCES EL SISTEMA lo dirá en la sección, en lugar de
  mostrarla vacía.
- RF-36: EL SISTEMA no exigirá viajes de cantera para cerrar la bitácora. *(2026-09-15)*
- RF-37: CUANDO se cierre una bitácora de un día sin viajes, EL SISTEMA dejará fijado en ella
  que ese día no se registraron viajes. *(2026-09-15)*

### Quién puede (spec 008)

- RF-32: EL SISTEMA permitirá registrar sitios, materiales, viajes y anulaciones únicamente al
  encargado de planta de esa obra y a la gerencia.
- RF-33: EL SISTEMA permitirá al residente consultar los viajes de su obra.

## Superficies afectadas

- [ ] **Móvil** — ninguna. Los viajes se registran desde el panel.
- [x] **Panel web** — módulo nuevo Control Cantera (sitios, materiales, viajes) y sección
  nueva de solo lectura en el parte diario.
- [x] **API** — rutas nuevas del panel para sitios, materiales y viajes; la del parte diario
  devuelve los viajes del día; el cierre del parte los fija.
- [ ] **Sincronización** — sin impacto.
- [x] **Datos** — sitios, materiales de cantera y viajes en la base del servidor; los viajes
  fijados en el parte al cerrarlo.
- [x] **Reglas** — la abscisa (rangos, múltiplos, forma de mostrarla) y la validación del
  viaje, con sus casos en el guion de verificación.

## Requisitos no funcionales

- Registrar un viaje con destino obra no pide más de ocho elecciones: fecha y hora,
  material, volqueta, conductor, origen, destino, PR y metros.
- Todas las columnas de las tablas caben en un portátil de 1366 puntos de ancho (005/RF-20).
- Los selectores de PR y metros usan el selector del panel ya corregido (spec 007).

## Casos límite

- **Sin señal**: no aplica; el panel es de escritorio y siempre tiene red.
- **Evidencia firmada**: un viaje no se edita, se anula (RF-23, RF-24). Una bitácora cerrada
  no cambia aunque después se registren o anulen viajes de su día (RF-29, RF-30).
- **Primer arranque**: una obra sin sitios registrados solo puede tener como destino la obra
  y no tiene origen que elegir; el módulo dice que primero hay que registrar un sitio.
- El **PR 25 + 975**: está dentro del rango (la obra tiene unos 25 km).
- Un viaje de **una planta a otra**: válido, sin abscisa (RF-15).
- Una volqueta **trasladada a otra obra**: sus viajes anteriores siguen en la obra donde se
  registraron; ya no se ofrece para viajes nuevos de la obra que dejó (RF-8).
- Una volqueta **en mantenimiento o dada de baja**: no se ofrece (RF-8).
- Un viaje registrado **pasada la medianoche** de un viaje del día anterior: cuenta en el día
  de la fecha y hora que se escriba.
- Un viaje de un día con la **bitácora anulada** y reabierta: la bitácora nueva muestra los
  viajes vigentes de ese día.

## Fuera de alcance

- Cantidad de material por viaje (m³, toneladas) y capacidad de las volquetas: OCC indicó
  que se registra material, volqueta, origen y destino.
- Totales de acarreo por material, volqueta o tramo de vía.
- Registrar viajes desde el celular del conductor.
- Hora de salida y hora de llegada por separado, tiempos de ciclo.
- Obras de más de 25 km o abscisas con otra forma.
- La obra como **origen** de un viaje (material sobrante a un botadero): hoy lo que sobra se
  queda en la obra.
- Informes, exportación a hoja de cálculo o PDF.

## Criterios de finalización

- Cada RF tiene su comprobación: la abscisa y la validación del viaje (RF-12 a RF-19, RF-34) como
  casos en el guion de verificación; el resto, como paso de demo manual.
- Migración en la base del servidor.
- `npm run verificar`, `npm run typecheck` y `npm run lint` en verde.
- Demo manual: como encargado de planta, registrar la cantera «La Esperanza» y el material
  «Afirmado»; registrar un viaje de VOL-01, con su conductor, desde La Esperanza a la obra en PR 5 + 300; ver el
  viaje en el listado con su abscisa; como residente, abrir la bitácora de ese día y ver la
  sección Control Cantera con el viaje y su conteo en el índice; cerrar la bitácora; como
  encargado, anular el viaje y comprobar el aviso y que la bitácora cerrada lo sigue
  mostrando.

## Dudas abiertas

Resueltas el 2026-09-15:

- **Cierre de la bitácora**: los viajes no son obligatorios (RF-36), pero la bitácora dice
  sola si hubo viajes o no, y eso queda fijado al cerrar (RF-29, RF-31, RF-37).
- **Conductor**: sí se registra (RF-34, RF-35).
- **La obra como origen**: no. RF-9 se queda como está y el caso pasa a fuera de alcance.

Resueltas el 2026-09-16, al planificar:

- **Volquetas que se ofrecen**: solo las operativas (RF-8). Una NO APTO no puede trabajar y no
  debe tener viajes.
- **Forma de la abscisa**: metros con tres cifras (RF-17).

Ninguna abierta.
