# Spec 002 — Cargos de las personas

> Estado: En curso · Fecha: 2026-09-09 · Cambio: 2026-09-19 (el cargo Gerente, RF-13 a RF-15)

## Contexto y objetivo

En una obra trabajan muchos más oficios que "operador": topógrafos, cadeneros, el SISO, la
residente ambiental, la profesional social, maestros de obra, ayudantes. Hoy el sistema
solo sabe de tres cosas —gerencia, residente y operador—, porque lo que la pantalla llama
"cargo" es en realidad el nivel de acceso disfrazado.

Eso deja fuera a casi toda la obra. Y hace falta que esté dentro, porque la bitácora tiene
que registrar quién trabajó y cuántas horas, y esa gente no opera ninguna máquina.

El objetivo es separar dos cosas que hoy están pegadas: **qué hace una persona en la obra**
(su cargo) y **qué puede hacer en el sistema** (su acceso).

## Usuarios / actores

- **Gerencia** — registra a las personas y les pone su cargo.
- **Residente** — no registra personas, pero las elige por su cargo al llenar la bitácora.
- **Todo el personal de obra** — existe en el sistema aunque nunca entre a él.

## Historias de usuario

- H1: Como gerencia quiero registrar el cargo real de cada persona, para saber quién es
  quién en la obra sin tener que adivinarlo por el nombre.
- H2: Como gerencia quiero que el sistema no me deje darle acceso por error a alguien que
  no debe tenerlo, para que un cadenero no termine con el panel abierto.
- H3: Como residente quiero elegir a la gente por su cargo cuando lleno la bitácora, para
  no buscar a ciegas en una lista de nombres.

## Requisitos funcionales (criterios de aceptación en EARS)

### El cargo como dato propio (H1)

- RF-1: EL SISTEMA registrará el cargo de cada persona como un dato independiente de su
  nivel de acceso.
- RF-2: CUANDO la gerencia registre o edite una persona, EL SISTEMA le ofrecerá elegir el
  cargo entre esta lista cerrada: Director, Residente 1, Residente 2, Auxiliar, Topógrafo,
  Cadenero 1, Cadenero 2, SISO, Residente Ambiental, Auxiliar Ambiental, Social, Conductor,
  Operador, Ayudante y Maestro de obra.
- RF-3: SI se intenta registrar una persona con un cargo que no está en la lista, ENTONCES
  EL SISTEMA rechazará el registro.
- RF-4: EL SISTEMA mostrará el cargo de cada persona en el listado de Personas.
- RF-5: EL SISTEMA conservará el cargo de las personas ya registradas antes de este cambio
  como "sin definir", sin borrar ni alterar su nivel de acceso actual.
- RF-12: EL SISTEMA asignará el cargo Operador a las personas que ya estuvieran registradas
  como operadoras antes de este cambio, para que no pierdan la posibilidad de recibir un
  código de activación.

### El acceso que corresponde a cada cargo (H2)

- RF-6: CUANDO la gerencia elija el cargo de una persona, EL SISTEMA propondrá el nivel de
  acceso que le corresponde: Director, Residente 1 y Residente 2 acceden al panel de su
  obra; Conductor y Operador usan la app del celular; el resto de cargos no accede a
  ninguna de las dos.
- RF-7: EL SISTEMA permitirá a la gerencia cambiar el nivel de acceso propuesto, para
  resolver los casos que la lista de cargos no prevé.
- RF-8: SI se intenta emitir un código de activación de celular para una persona cuyo cargo
  no es Conductor ni Operador, ENTONCES EL SISTEMA lo rechazará explicando el motivo.
- RF-9: EL SISTEMA no dará acceso a ninguna de las dos superficies a las personas cuyo
  cargo no lo contemple, aunque figuren como activas.

### El cargo de la gerencia (H2) · *añadido el 2026-09-19*

Hasta ahora la lista no tenía cargo para quien dirige la empresa, y era el único nivel de
acceso real sin oficio que lo nombrara: a un gerente había que registrarlo sin cargo, o
ponerle «Director», que es otra cosa —el director de obra dirige **una** obra—. Quedaba
raro en el listado de Personas y peor en cualquier documento que imprima el cargo.

- RF-13: EL SISTEMA ofrecerá «Gerente» entre los cargos que se pueden elegir.
- RF-14: CUANDO la gerencia elija el cargo Gerente, EL SISTEMA propondrá el nivel de acceso
  de administrador.
- RF-15: EL SISTEMA no permitirá emitir un código de activación de celular para una persona
  con cargo Gerente.

### La obra sabe quién trabajó (H3)

- RF-10: EL SISTEMA hará disponible el cargo de cada persona allí donde haya que elegir
  personal, de forma que se distinga a dos personas con nombres parecidos.
- RF-11: EL SISTEMA enviará el cargo de las personas al celular junto con el resto de sus
  datos, para que la app pueda mostrarlo sin conexión.

## Superficies afectadas

- [x] **Móvil** — recibe el cargo; por ahora solo lo almacena.
- [x] **Panel web** — el formulario de Personas pasa de un campo a dos, y el listado
  muestra el cargo.
- [x] **API** — alta, edición y consulta de personas; emisión de códigos de activación.
- [x] **Sincronización** — el cargo viaja en la bajada de datos al celular.
- [x] **Datos** — una columna nueva en las dos bases, con su migración.
- [ ] **Reglas** — sin cambios en las reglas del preoperacional ni de la jornada.

## Requisitos no funcionales

- La lista de cargos se define **una sola vez** y la comparten el panel, la API y el
  celular, igual que ya ocurre con los tipos de equipo.
- Los nombres de los cargos se muestran tal como los usa OCC, en español y con sus
  números ("Residente 1", "Cadenero 2").

## Casos límite

- **Sin señal**: el celular muestra el cargo que bajó la última vez; no lo consulta en vivo.
- **Evidencia firmada**: cambiar el cargo de una persona no altera ningún preoperacional ni
  bitácora ya firmados, donde su nombre quedó escrito.
- **Primer arranque**: la cuenta de gerencia creada desde la terminal queda sin cargo, como
  el resto de las personas anteriores (RF-5).
- **Un operador registrado antes del cambio**: se quedaría sin cargo y, por RF-8, sin poder
  recibir un código nuevo — es decir, sin salida si pierde el teléfono. Por eso RF-12. No se
  hace lo mismo con los residentes: su acceso al panel no depende del cargo, y adivinar si
  alguien es Director, Residente 1 o Residente 2 sería inventar.
- Una persona **cambia de cargo** a mitad de una obra: el cambio rige de aquí en adelante y
  no reescribe lo ya registrado.
- Un cargo con acceso al panel al que **le quitan** el cargo: RF-9 debe cerrarle la puerta.
- Dos personas con el **mismo cargo** en la misma obra (dos Residentes, dos Cadeneros): es
  normal y el sistema no lo impide.

## Fuera de alcance

- Ampliar los niveles de acceso: siguen siendo tres y no se tocan.
- Permisos distintos según el cargo dentro de un mismo nivel de acceso: un Director y un
  Residente 1 ven exactamente lo mismo.
- Historial de cargos de una persona a lo largo del tiempo.
- Cualquier uso del cargo dentro de la app del celular más allá de almacenarlo.

## Criterios de finalización

- Cada RF con su comprobación: las reglas de correspondencia cargo→acceso (RF-6, RF-8,
  RF-9) como casos en el guion de verificación; el resto, como paso de demo manual.
- La migración existe en las dos bases y las personas anteriores conservan su acceso (RF-5).
- Demo manual: registrar un Topógrafo y comprobar que no puede entrar al panel ni recibir
  código de activación; registrar un Residente 2 y comprobar que entra al panel de su obra.

## Dudas abiertas

Resuelta el 2026-09-19:

- **Se añade «Gerente» a la lista** (RF-13 a RF-15), con acceso de administrador propuesto y
  sin celular. Se decidió al registrar al primer gerente real de OCC: dejarlo sin cargo o
  ponerle «Director» eran las dos únicas salidas, y las dos mienten en cualquier documento
  que imprima el cargo.

Siguen abiertas:

- [NECESITA ACLARACIÓN: ¿"Auxiliar" y "Auxiliar Ambiental" son dos cargos distintos, o el
  primero es un auxiliar de ingeniería? El nombre a secas se presta a confusión en el
  listado.]
- [NECESITA ACLARACIÓN: ¿un Conductor hace preoperacional de camioneta igual que un
  Operador de maquinaria amarilla, o hay alguna diferencia en lo que se le exige?]
