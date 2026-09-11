# Spec 001 — Permisos por rol en el panel

> Estado: En curso · Fecha: 2026-09-09

## Contexto y objetivo

El panel lo usan dos oficios muy distintos. La gerencia lleva el maestro de la empresa
—qué obras hay, qué equipos, qué personas— y revisa que todo se esté cumpliendo. El
residente vive el día a día de **su** obra: asigna las máquinas a los operadores, lleva la
bitácora y mira los preoperacionales que llegan del campo.

Hoy el panel no distingue entre los dos: cualquiera que entre ve los siete módulos y puede
escribir en casi todos. Un residente puede registrar una obra nueva, dar de baja un
vehículo de otra obra o cambiar la ficha de una persona. No es que alguien lo haya hecho:
es que nada lo impide, y el día que haya tres obras corriendo a la vez, el error no se
notará hasta que ya esté hecho.

El objetivo es que cada quien vea y toque exactamente lo que le corresponde.

Una consecuencia de cerrarle Personas al residente: el código de activación de un celular
lo genera la gerencia y se lo hace llegar al residente, que lo entrega al operador en obra.
Esa cadena es un acuerdo de trabajo, no comportamiento del sistema, y gerencia puede
cambiarla más adelante sin que esta spec cambie.

## Usuarios / actores

- **Gerencia** — dueña del maestro. Registra obras, vehículos y personas, y ve todo lo que
  ocurre en todas las obras.
- **Residente / director de obra** — trabaja sobre una obra. Asigna, lleva bitácoras y
  consulta preoperacionales.
- **Operador** — no entra al panel; su acceso es la app del celular. Ya es así hoy y no
  cambia.

## Historias de usuario

- H1: Como residente quiero ver solo lo que me toca, para no perderme entre módulos que no
  son mi trabajo ni equivocarme tocando el maestro de la empresa.
- H2: Como gerencia quiero ser la única que registra obras, vehículos y personas, para que
  el maestro no se llene de duplicados ni de datos de otra obra.
- H3: Como gerencia quiero que nadie pueda darse a sí mismo ni a otro más permisos de los
  que le corresponden, para que el control no dependa de la buena fe.

## Requisitos funcionales (criterios de aceptación en EARS)

### Lo que ve cada quien (H1)

- RF-1: CUANDO un residente entre al panel, EL SISTEMA mostrará en la navegación
  únicamente Inicio, Asignaciones, Bitácoras y Preoperacionales.
- RF-2: CUANDO la gerencia entre al panel, EL SISTEMA mostrará todos los módulos.
- RF-3: SI un residente abre directamente la dirección de Obras, Vehículos o Personas,
  ENTONCES EL SISTEMA le mostrará un aviso de que ese módulo es de gerencia, sin exponer
  su contenido.
- RF-4: EL SISTEMA seguirá permitiendo al residente **consultar** la lista de vehículos y
  de personas de su obra, porque las pantallas de Asignaciones y Bitácoras la necesitan
  para poder elegir a quién y a qué se asigna.

### Quién puede escribir (H2)

- RF-5: SI un residente intenta crear, modificar o dar de baja una obra, un vehículo o una
  persona, ENTONCES EL SISTEMA rechazará la operación y explicará que esa acción es de
  gerencia, sin modificar ningún dato.
- RF-6: EL SISTEMA permitirá al residente crear, modificar, cerrar y anular asignaciones y
  bitácoras de su obra.
- RF-7: EL SISTEMA permitirá al residente consultar los preoperacionales de su obra y ver
  sus firmas y fotografías, sin poder anularlos.
- RF-8: MIENTRAS la gerencia tenga la sesión abierta, EL SISTEMA le permitirá todas las
  operaciones anteriores sobre cualquier obra.

### Que el control no se pueda saltar (H3)

- RF-9: SI alguien intenta cambiar el rol de una persona a uno con más permisos que el
  suyo propio, ENTONCES EL SISTEMA rechazará el cambio. Con RF-5 en pie, el residente ya no
  puede tocar personas: este requisito es la segunda cerradura de la misma puerta, y se
  escribe aparte para que siga en pie si algún día RF-5 se relaja.
- RF-10: SI un residente no tiene obra asignada, ENTONCES EL SISTEMA no le mostrará
  información de ninguna obra, en lugar de mostrarle todas.
- RF-11: EL SISTEMA aplicará estas restricciones en el servidor, y no solo escondiendo
  opciones en pantalla: una petición hecha por fuera de la interfaz recibe la misma
  respuesta.
- RF-12: CUANDO el rol de una persona cambie, EL SISTEMA aplicará sus nuevos permisos en la
  siguiente acción que haga, sin necesidad de que vuelva a entrar.

### Lo que solo puede la gerencia (H2, H3)

- RF-13: EL SISTEMA permitirá emitir códigos de activación de celular, y los códigos de
  respaldo que los acompañan, únicamente a la gerencia.
- RF-14: SI un residente intenta anular un preoperacional, ENTONCES EL SISTEMA lo rechazará
  indicando que corregir evidencia firmada es de gerencia.
- RF-15: EL SISTEMA no ofrecerá al residente, en la pantalla de inicio, cifras ni atajos de
  los módulos que no puede abrir.

## Superficies afectadas

- [x] **Móvil** — ninguna. El operador ya está fuera del panel y eso no cambia.
- [x] **Panel web** — navegación y las tres pantallas que dejan de estar disponibles para
  el residente.
- [x] **API** — todas las rutas de administración: obras, vehículos, personas,
  asignaciones, bitácoras, preoperacionales, imágenes.
- [ ] **Sincronización** — sin impacto.
- [ ] **Datos** — sin cambios de esquema.
- [ ] **Reglas** — sin cambios en las reglas del preoperacional ni de la jornada.

## Requisitos no funcionales

- La comprobación de permisos no añade consultas nuevas a la base: el rol y la obra ya
  viajan en la sesión que se lee en cada petición.
- Los mensajes de rechazo dicen **qué** no se puede hacer y **quién** sí puede, en español.
  Nunca un código de error a secas.

## Casos límite

- **Sin señal**: no aplica. El panel es de escritorio y siempre tiene red.
- **Evidencia firmada**: anular un preoperacional pasa a ser de la gerencia (RF-14), pero
  anular una bitácora cerrada sigue siendo del residente (RF-6). La diferencia es
  deliberada y está explicada al final.
- **Primer arranque**: la primera cuenta de gerencia se crea desde la terminal, como hoy.
  Si no existe ninguna, nadie puede entrar — y así debe seguir siendo.
- Un residente **sin obra** (RF-10): hoy ve todo; después de este cambio no ve nada, y hay
  que comprobar que la gerencia se entere de que esa persona está mal configurada.
- Filas **sin obra asignada** (un vehículo aún no destinado): hoy cualquier residente las
  ve. Se conserva ese comportamiento; no forma parte de esta spec.
- Una sesión abierta **mientras** le cambian el rol: RF-12.

## Fuera de alcance

- Crear roles nuevos o permisos a medida por persona. Los tres roles se quedan como están.
- Registro de auditoría de quién hizo qué.
- Cambiar quién puede ver qué **obra**: el filtro por obra ya existe y no se toca, salvo el
  caso del residente sin obra (RF-10).
- Cómo le llega el código de activación al operador una vez la gerencia lo emite (RF-13):
  es un acuerdo de trabajo entre personas, no algo que el sistema haga.
- Permitirle al residente anular preoperacionales bajo alguna condición (por ejemplo, el
  mismo día). Hoy es de gerencia y punto (RF-14).

## Criterios de finalización

- Cada RF tiene su comprobación: las de servidor como casos en el guion de verificación de
  reglas; las de pantalla, como paso de demo manual descrito.
- Demo manual: entrar como gerencia y comprobar que están todos los módulos; entrar como
  residente y comprobar que solo ve Inicio, Asignaciones, Bitácoras y Preoperacionales, que
  las direcciones de Obras, Vehículos y Personas le responden con aviso, que su inicio no
  ofrece cifras de esos tres, y que sí puede crear una asignación y una bitácora de su obra.
- Comprobación por fuera de la interfaz: una petición de escritura a obras, vehículos o
  personas hecha con sesión de residente es rechazada (RF-11).

## Dudas abiertas

Ninguna. Las dos dudas iniciales se resolvieron en la clarificación del 2026-09-09:

- **Códigos de activación**: los emite la gerencia y se los hace llegar al residente, que
  los entrega al operador (RF-13). Provisional: gerencia puede cambiar el procedimiento.
- **Anular un preoperacional**: es de la gerencia (RF-14). Corregir evidencia firmada no
  baja al residente.
- **Anular una bitácora sí es del residente** (RF-6), y la diferencia con el punto anterior
  es deliberada: la bitácora la llena él todos los días y se equivoca a diario, mientras que
  el preoperacional lo firma el operador y corregirlo es revisar el trabajo de otro.
