# Spec 012 — La asignación de vehículos la decide la administración

> Estado: Aprobada · Fecha: 2026-09-18 · Aprobada: 2026-09-18

## Contexto y objetivo

Hoy, si un operador abre la app y no tiene ninguna máquina asignada, la aplicación le deja
**escoger cualquier vehículo de la obra** y se la apunta a su nombre, marcada como
«autoasignada» para que alguien la confirme desde el panel. Peor todavía: el operador que sí
tiene máquinas asignadas también puede entrar a esa pantalla y tomar una más.

Eso se hizo a propósito, con un argumento que sigue siendo cierto: **un operador bloqueado no
deja de trabajar, arranca la máquina sin preoperacional**, que es justo lo que este sistema
existe para evitar. OCC ha decidido lo contrario, y la razón también es buena: si cualquiera
puede tomar cualquier máquina, la asignación deja de ser un control y el panel se entera
después de que la volqueta ya salió. Quién opera qué lo decide la obra, no el turno.

Esta spec traslada esa decisión al código: el operador **solo ve las máquinas que le
asignaron** desde el panel, y si no tiene ninguna, no hay preoperacional que hacer. Lo que se
gana es control; lo que se asume, escrito y con todas las letras, es el riesgo que la regla
anterior evitaba.

## Usuarios / actores

- **Operador** (móvil, en obra, normalmente sin señal) — deja de poder escoger máquina. Sigue
  eligiendo entre las suyas cuando tiene varias, que es lo normal en OCC.
- **Residente / director de obra** (panel) — pasa a ser responsable de que cada operador tenga
  su asignación **antes** de llegar a la obra. Si no lo hace, alguien no puede trabajar.
- **Gerencia** (panel) — igual que el residente, en cualquier obra.

## Historias de usuario

- H1: Como gerencia quiero que solo la administración decida quién opera cada máquina, para
  que la asignación sea un control y no un registro de lo que ya pasó.
- H2: Como operador quiero ver únicamente las máquinas que me asignaron, para no equivocarme
  de equipo al empezar el preoperacional.
- H3: Como operador con varias máquinas asignadas quiero elegir entre ellas, para hacer el
  preoperacional de cada una.
- H4: Como operador sin asignación quiero que la app me diga qué hacer, para no quedarme
  mirando una pantalla que no me deja seguir.

## Requisitos funcionales (criterios de aceptación en EARS)

### El operador ya no escoge (H1, H2)

- RF-1: EL SISTEMA mostrará al operador únicamente los vehículos que le hayan asignado desde
  el panel y sigan vigentes.
- RF-2: EL SISTEMA no ofrecerá al operador ningún vehículo de la obra que no le hayan
  asignado.
- RF-3: EL SISTEMA no permitirá que un vehículo quede asignado a un operador por decisión del
  propio operador.
- RF-4: SI llega al servidor una asignación creada por un operador, ENTONCES EL SISTEMA la
  rechazará.
- RF-5: CUANDO el servidor rechace una asignación creada por un operador, EL SISTEMA no
  reintentará ese envío en ese dispositivo.

### Varias máquinas asignadas (H3)

- RF-6: EL SISTEMA permitirá al operador con más de un vehículo vigente elegir cuál va a
  inspeccionar.
- RF-7: EL SISTEMA permitirá cambiar de vehículo entre uno y otro preoperacional del mismo
  día, sin límite de veces.

### Sin ninguna máquina asignada (H4)

- RF-8: SI el operador no tiene ningún vehículo vigente, ENTONCES EL SISTEMA se lo dirá y le
  indicará que se lo pida a su residente.
- RF-9: SI el operador no tiene ningún vehículo vigente, ENTONCES EL SISTEMA no le permitirá
  iniciar ningún preoperacional.
- RF-10: CUANDO la administración le asigne un vehículo, EL SISTEMA se lo mostrará al operador
  en cuanto el equipo sincronice, sin que él tenga que hacer nada más.

### Lo que ya estaba en marcha (H1)

- RF-11: EL SISTEMA permitirá terminar y firmar un preoperacional que ya estaba empezado,
  aunque la asignación de ese vehículo se cierre mientras tanto.
- RF-12: EL SISTEMA subirá los preoperacionales firmados sobre una asignación que después se
  cerró, y no los descartará.
- RF-13: EL SISTEMA cerrará las asignaciones que los operadores se habían puesto a sí mismos
  y que siguen vigentes.
- RF-14: EL SISTEMA conservará el registro de que esas asignaciones fueron tomadas por el
  propio operador.

### En el panel (H1)

- RF-15: EL SISTEMA dejará de ofrecer a la administración la acción de confirmar una
  asignación tomada por un operador.
- RF-16: EL SISTEMA dejará de avisar en el panel de que hay asignaciones por confirmar.
- RF-17: EL SISTEMA seguirá mostrando, en las asignaciones ya registradas, cuáles fueron
  tomadas por el propio operador.
- RF-18: EL SISTEMA seguirá permitiendo a la gerencia y al residente crear y cerrar
  asignaciones.

### Reglas transversales

- RF-19: EL SISTEMA no cambiará nada de lo que ve el operador cuando sí tiene su vehículo
  asignado, salvo que la lista solo trae los suyos.
- RF-20: EL SISTEMA seguirá funcionando sin señal: lo que decide qué máquinas ve el operador
  es lo que el equipo ya tiene bajado.

## Superficies afectadas

- [x] **Móvil** — la pantalla de escoger vehículo y el inicio del operador.
- [x] **Panel web** — la pantalla de Asignaciones y el aviso del inicio.
- [x] **API** — la ruta del celular que recibía las asignaciones.
- [x] **Sincronización** — deja de subir asignaciones; la cola conserva el tipo por los
  teléfonos que tengan alguna encolada sin subir.
- [ ] **Datos** — sin cambios de esquema. Las asignaciones vigentes tomadas por operadores se
  cierran como se cierra cualquier otra.
- [ ] **Reglas** — sin reglas nuevas de negocio.

## Requisitos no funcionales

- El aviso del operador sin asignación dice a quién pedírselo, en español y sin códigos.
- El rechazo del servidor es definitivo: no consume los ocho reintentos de la cola.
- Se mantienen las reglas de campo de la app: mínimo 56 dp de área táctil y 15 sp de texto.

## Casos límite

- **Sin señal**: el operador ve las máquinas que su equipo tenga bajadas. Si le asignaron una
  esta mañana y no ha sincronizado, no la ve todavía — y no tiene forma de adelantarse, que es
  el efecto buscado y el riesgo asumido.
- **Evidencia firmada**: ningún preoperacional se toca. Los firmados sobre una asignación que
  después se cerró suben igual y se ven igual (RF-12).
- **Primer arranque / equipo recién activado**: si al activarse no tiene asignación, ve el
  aviso de RF-8 desde el primer momento.
- Un operador **a medio llenar** un preoperacional cuando se cierra su asignación: termina y
  firma (RF-11).
- Un **teléfono sin actualizar** que sigue dejando escoger: el servidor rechaza la asignación
  (RF-4) y esa máquina desaparece de su lista en cuanto sincronice.
- Una asignación **cerrada mientras el operador trabaja**: deja de verla al sincronizar.
- Un operador que **llega a la obra sin asignación y con el residente sin señal**: no puede
  hacer el preoperacional. Es el riesgo que esta spec acepta.

## Fuera de alcance

- Que el operador pueda **solicitar** una máquina desde el celular: se pide por fuera del
  sistema.
- Avisar a la administración de que un operador se quedó sin asignación.
- Cambiar quién puede asignar: sigue siendo la gerencia y el residente.
- Limitar cuántos vehículos puede tener un operador, o cuántos operadores un vehículo.
- Borrar las asignaciones tomadas por operadores: se cierran, no se borran.
- Retirar de la cola de subida el tipo de registro «asignación»: un teléfono puede tener una
  encolada sin subir.
- Cualquier cambio en el preoperacional en sí.

## Criterios de finalización

- Cada RF con su comprobación: el rechazo del servidor y la lista de vehículos del operador
  como casos en el guion de verificación; el resto, como paso de demo.
- `npm run verificar`, `npm run typecheck` y `npm run lint` en verde.
- Demo manual: con `operador1` —que tiene dos vehículos asignados— comprobar que puede
  cambiar entre los dos y que **no aparece ningún otro vehículo de la obra**; con un operador
  sin asignación, ver el aviso y que no hay forma de llegar al formulario; asignarle uno desde
  el panel y verlo aparecer tras sincronizar.
- `AGENTS.md` actualizado: la regla que hoy dice «no bloquees al operador» ya no describe el
  sistema.

## Dudas abiertas

Resueltas el 2026-09-18:

- **Sin asignación no se puede inspeccionar** (RF-9). Diego lo decidió sabiendo que rompe la
  regla anterior; el riesgo queda escrito arriba.
- **Las autoasignadas vigentes se cierran todas** (RF-13), conservando el registro de que lo
  fueron (RF-14).
- **El servidor rechaza** las que lleguen de un teléfono viejo (RF-4).
- **Lo empezado se termina** (RF-11).
- **El botón de confirmar y el aviso salen del panel** (RF-15, RF-16); la etiqueta de las
  filas históricas se queda (RF-17).

Ninguna abierta.
