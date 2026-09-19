# Spec 013 — Un preoperacional al día, y ninguno que no se llenó

> Estado: Aprobada · Fecha: 2026-09-18 · Aprobada: 2026-09-18

## Contexto y objetivo

El preoperacional es la revisión que el operador le hace a su máquina **antes de arrancarla**,
una vez por jornada. El sistema nunca ha dicho eso en ninguna parte: hoy un operador puede
levantar el mismo preoperacional de la misma volqueta las veces que quiera en el mismo día, y
cada una queda como un registro aparte.

Peor todavía es lo que pasa sin llegar a levantar ninguno: **con solo abrir el formulario, el
registro ya queda creado**, vacío. Si el operador entra a mirar y sale, esa máquina aparece en
su historial como «Sin terminar» aunque el preoperacional del día ya esté hecho y firmado. Es
un trabajo pendiente que no existe, sobre una máquina que sí se revisó, y el operador no tiene
forma de quitarlo.

Las dos cosas empujan en la misma dirección equivocada: hacen ruido en el historial del
operador y le restan valor al único sitio donde él ve si le falta algo por hacer. Esta spec
escribe la regla que todo el mundo en OCC da por supuesta —**una revisión por máquina, por
operador y por jornada**— y hace que abrir un formulario deje de ser un hecho registrable.

La excepción es la que tiene sentido en obra: si la máquina quedó **NO APTO**, se repara y se
vuelve a revisar el mismo día. Ese segundo preoperacional es precisamente la constancia de que
la máquina volvió a servir, y quedan los dos.

## Usuarios / actores

- **Operador** (móvil, en obra, con guantes y normalmente sin señal) — es el único que cambia
  de comportamiento. Deja de poder repetir el preoperacional de una máquina que ya revisó hoy,
  y deja de generar registros por el solo hecho de abrir el formulario.
- **Residente / director de obra** (panel web) — no cambia nada de lo que hace. Recibe menos
  registros vacíos, y sigue teniendo **anular con motivo** como única vía para corregir un
  preoperacional firmado.
- **Gerencia** (panel web) — igual que el residente.

## Historias de usuario

- H1: Como operador quiero que el sistema sepa que ya revisé mi máquina hoy, para no repetir
  un trabajo que ya hice ni ensuciar mi historial.
- H2: Como operador quiero poder volver a revisar una máquina que quedó NO APTO y se reparó,
  para dejar constancia el mismo día de que ya sirve.
- H3: Como operador quiero poder abrir el formulario y salir sin que quede nada registrado,
  para que mi historial solo muestre trabajo de verdad.
- H4: Como residente quiero que el historial de cada operador refleje lo que realmente hizo,
  para saber de un vistazo qué máquinas faltan por inspeccionar.

## Requisitos funcionales (criterios de aceptación en EARS)

### Una revisión por máquina, operador y jornada (H1, H2)

- RF-1: SI un operador ya firmó hoy el preoperacional de una máquina y ese preoperacional no
  quedó NO APTO, ENTONCES EL SISTEMA no le permitirá iniciar otro de esa máquina ese día.
- RF-2: SI el último preoperacional que un operador firmó hoy de una máquina quedó NO APTO,
  ENTONCES EL SISTEMA le permitirá iniciar otro de esa máquina ese día.
- RF-3: EL SISTEMA tratará «apto con observaciones» igual que «apto» a efectos de RF-1.
- RF-4: EL SISTEMA contará la regla por la combinación de operador, máquina y día de trabajo.
- RF-5: EL SISTEMA permitirá a un operador iniciar hoy el preoperacional de una máquina que
  otro operador ya revisó hoy.
- RF-6: EL SISTEMA no pondrá límite a cuántas veces se puede repetir el preoperacional de una
  máquina que sigue quedando NO APTO.
- RF-7: EL SISTEMA usará como día de trabajo el día en obra, el mismo con el que se identifica
  el parte diario.

### Lo que el operador ve (H1, H2)

- RF-8: MIENTRAS una máquina tenga hecho su preoperacional del día, EL SISTEMA no ofrecerá al
  operador ninguna acción para iniciar otro de esa máquina.
- RF-9: MIENTRAS una máquina tenga hecho su preoperacional del día, EL SISTEMA le dirá al
  operador que ya lo hizo hoy.
- RF-10: EL SISTEMA mostrará junto a ese aviso la hora a la que se hizo y cómo salió.
- RF-11: EL SISTEMA seguirá ofreciendo iniciar el preoperacional de las demás máquinas
  asignadas a ese operador que no lo tengan hecho hoy.
- RF-12: CUANDO cambie el día de trabajo, EL SISTEMA volverá a ofrecer el preoperacional de
  esa máquina sin que el operador tenga que hacer nada.

### Abrir el formulario no registra nada (H3, H4)

- RF-13: EL SISTEMA no registrará ningún preoperacional por el solo hecho de que el operador
  abra el formulario.
- RF-14: CUANDO el operador responda el primer dato del formulario, EL SISTEMA registrará el
  preoperacional como empezado.
- RF-15: SI el operador sale del formulario sin haber respondido ningún dato, ENTONCES EL
  SISTEMA no dejará ningún registro de ese intento.
- RF-16: EL SISTEMA conservará lo que el operador lleve respondido si sale del formulario
  después de haber respondido algo.
- RF-17: EL SISTEMA mostrará en el historial del operador únicamente los preoperacionales que
  llegaron a empezarse.

### Reglas transversales

- RF-18: EL SISTEMA aplicará todo lo anterior sin consultar al servidor.
- RF-19: EL SISTEMA no modificará ningún preoperacional ya firmado.
- RF-20: EL SISTEMA no cambiará lo que la administración puede hacer desde el panel.
- RF-21: EL SISTEMA seguirá calculando las revisiones quincenales y mensuales desde la última
  vez que se hicieron en esa máquina, sin que esta regla las adelante ni las atrase.

## Superficies afectadas

- [x] **Móvil** — el inicio del operador (la tarjeta de la máquina y el botón de empezar) y la
      pantalla del preoperacional (cuándo nace el registro).
- [ ] **Panel web** — sin cambios. Decidido: el panel no gana ninguna acción nueva.
- [ ] **API** — sin cambios.
- [x] **Sincronización** — suben menos registros, porque los intentos vacíos dejan de existir.
      No cambia el orden de la cola ni la forma de lo que se sube.
- [ ] **Datos** — sin cambios de esquema.
- [x] **Reglas** — la decisión de si toca preoperacional hoy es una regla pura y necesita su
      caso en el guion de verificación.

## Requisitos no funcionales

- La decisión se toma con lo que el equipo ya tiene guardado, sin red y sin espera
  perceptible para el operador.
- El aviso de «ya lo hizo hoy» va en español, sin códigos, y no depende solo del color para
  distinguirse.
- Se mantienen las reglas de campo: mínimo 56 dp de área táctil y 15 sp de texto.

## Casos límite

Los tres que este proyecto no puede dejar sin respuesta:

- **Sin señal**: todo funciona igual. La regla mira solo lo que ese operador hizo en ese
  teléfono, que es información que el equipo siempre tiene. Es la razón de que la regla sea
  por operador y máquina y no solo por máquina: un teléfono no puede saber lo que hizo otro.
- **Evidencia firmada**: no se toca ninguna. Un preoperacional firmado que hay que corregir se
  anula desde el panel con motivo escrito, como siempre. Esta spec no añade ninguna otra vía.
- **Primer arranque / equipo recién activado**: no hay preoperacionales previos, así que todas
  las máquinas asignadas ofrecen el suyo.

Y los del caso concreto:

- **El preoperacional del día está hecho pero todavía no ha subido**: cuenta igual. La regla
  mira lo que el operador firmó, no lo que el servidor recibió.
- **Un borrador a medio llenar de hoy**: la máquina no tiene su preoperacional hecho todavía,
  así que el operador sigue pudiendo entrar y terminarlo. No se le pide empezar de cero.
- **Un borrador a medio llenar de ayer**: tampoco cuenta como hecho. El operador lo encuentra
  como está hoy.
- **El operador empieza a responder y sale**: el registro ya nació y se conserva, con lo que
  llevara (RF-14, RF-16). El «no deja rastro» es solo para quien no respondió nada.
- **Turno que cruza la medianoche**: el día de trabajo cambia a las doce, así que una máquina
  revisada a las 22:00 vuelve a ofrecer preoperacional a las 00:01. Se acepta: el
  preoperacional se hace al arrancar el turno, y quien arranca después de medianoche está
  empezando otra jornada. *(Confirmar con OCC si hay turnos de noche reales en las obras.)*
- **Reloj del teléfono desfasado**: el día lo decide el reloj del equipo. Un teléfono con la
  fecha corrida contará mal el día, igual que ya le pasa hoy a la hora de inicio del acta. No
  se resuelve aquí.
- **Dos máquinas, una hecha y otra no**: la hecha muestra su aviso y la otra sigue ofreciendo
  su preoperacional (RF-11).
- **El preoperacional del día fue anulado desde el panel**: el teléfono no se entera, y la
  máquina sigue contando como revisada hasta el día siguiente. Decidido así el 2026-09-18: la
  anulación vive solo en el servidor, y hacer que el celular la conozca exigiría un canal de
  bajada nuevo que además solo funcionaría con señal —justo lo que RF-18 dice que esta regla
  no puede necesitar—. Si hay que rehacer un preoperacional el mismo día, el residente lo
  habla con el operador; es una llamada, y pasa muy pocas veces.

## Fuera de alcance

- Cualquier acción nueva en el panel: no se añade autorizar, permitir ni desbloquear nada.
- Avisar en el panel cuando una máquina acumula más de un preoperacional el mismo día.
- Impedir que dos operadores distintos revisen la misma máquina el mismo día: se permite a
  propósito (RF-5).
- Cambiar cómo se calculan las periodicidades quincenal y mensual.
- Cambiar qué hace que un preoperacional salga APTO, con novedades o NO APTO.
- Borrar o limpiar los registros vacíos que ya existen hoy en los teléfonos: esta spec evita
  los nuevos, no repara el pasado.
- Descartar un borrador a medio llenar por salir sin firmar.
- Cualquier cambio en la asignación de vehículos, que es de la spec 012.

## Criterios de finalización

- Cada RF tiene cómo comprobarse: RF-1 a RF-7 y RF-21 como casos en
  `scripts/verificar-reglas.ts`, por ser regla pura; el resto como paso de demo manual.
- `npm run verificar`, `npm run typecheck` y `npm run lint` en verde.
- Demo manual, en un teléfono y con el avión activado: levantar el preoperacional de una
  máquina y comprobar que la tarjeta pasa a decir «ya lo hizo hoy» con su hora y resultado y
  que ya no ofrece empezar otro; con una segunda máquina asignada, comprobar que esa sí lo
  ofrece; entrar al formulario de esa segunda y salir sin responder nada, y comprobar que **no
  aparece nada nuevo en el historial**; volver a entrar, responder un ítem, salir, y comprobar
  que ahora sí aparece como sin terminar y que al volver conserva lo respondido; y dejar una
  máquina en NO APTO para comprobar que esa sí permite levantar otro el mismo día.

## Dudas abiertas

- [NECESITA ACLARACIÓN: ¿hay turnos de noche reales en las obras de OCC? De eso depende si el
  corte a medianoche es aceptable o hay que anclarlo al turno. **No bloquea esta spec**: RF-7
  manda usar el día del parte diario, que ya existe y ya corta a medianoche. Si OCC dice que
  sí hay turnos nocturnos, se cambia en el único sitio donde está escrito ese corte.]

Resueltas el 2026-09-18:

- **Anular desde el panel no rehabilita el preoperacional ese día**: el teléfono no conoce la
  anulación y no se le va a añadir un canal para que la conozca. Ver el caso límite.

- **Un NO APTO no cierra el día** (RF-2): si la máquina se repara, se levanta otro y quedan
  los dos registros.
- **«Con novedades» bloquea, como el APTO** (RF-3): solo el NO APTO —que sí para la máquina—
  abre la puerta a repetir.
- **La regla es por operador y máquina, no solo por máquina** (RF-4, RF-5): cada quien responde
  por la máquina que va a manejar. Es además lo único que funciona sin señal.
- **El registro no se crea hasta la primera respuesta** (RF-13 a RF-15): abrir y salir no deja
  rastro porque no hubo nada que rastrear.
- **Sin botón cuando ya está hecho** (RF-8 a RF-10): la tarjeta de la máquina lo dice, con la
  hora y el resultado. Sin botón que pulsar no hay forma de equivocarse.
- **El panel no cambia** (RF-20): anular con motivo sigue siendo la única vía para corregir un
  acta firmada.
