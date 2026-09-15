# Spec 008 — Almacenista y Encargado de Planta

> Estado: Aprobada · Fecha: 2026-09-14 · Aprobada: 2026-09-15

## Contexto y objetivo

OCC suma dos módulos al panel —Almacén (spec 009) y Control Cantera (spec 010)— y cada uno
lo lleva una persona que **no** es ni gerencia ni residente: el almacenista controla lo que
entra y sale del almacén de la obra, y el encargado de planta registra los viajes de las
volquetas desde la cantera. Ninguno de los dos debe ver la bitácora, las asignaciones ni los
preoperacionales: entran al panel únicamente para su módulo.

Hoy el sistema tiene tres niveles de acceso y una regla escrita que dice que no se amplían
(specs 001 y 002, fuera de alcance). La regla existía para que los cargos de la obra no se
convirtieran en permisos a medida. Pero estos dos no son un cargo más dentro de un nivel
que ya existe: ven un conjunto de módulos que no coincide con el de nadie. **Esta spec
cambia esa regla a propósito**: se añaden dos niveles de acceso, y ninguno más.

El objetivo es que almacenista y encargado de planta entren al panel, vean solo su módulo
de su obra, y que eso lo garantice el servidor y no solo el menú.

## Usuarios / actores

- **Gerencia** — registra a estas personas, les da su cargo y su acceso, y ve todos los
  módulos, incluidos los dos nuevos.
- **Residente / director de obra** — consulta Almacén y Control Cantera de su obra, sin
  registrar nada en ellos.
- **Almacenista** — entra al panel solo al módulo Almacén de su obra.
- **Encargado de Planta** — entra al panel solo al módulo Control Cantera de su obra.
- **Operador** — no interviene; su acceso sigue siendo el celular.

## Historias de usuario

- H1: Como almacenista quiero entrar al panel y encontrar directamente el almacén de mi obra,
  para no perderme entre módulos que no son mi trabajo.
- H2: Como encargado de planta quiero entrar al panel y encontrar directamente el control de
  cantera de mi obra, por la misma razón.
- H3: Como gerencia quiero que ninguno de los dos pueda ver ni tocar la bitácora, las
  asignaciones, los preoperacionales ni el maestro de la empresa, para que el control no
  dependa de que no sepan escribir una dirección.
- H4: Como residente quiero consultar el almacén y la cantera de mi obra, para saber qué
  material hay y qué llegó sin tener que preguntar.

## Requisitos funcionales (criterios de aceptación en EARS)

### Dos accesos nuevos (H1, H2)

- RF-1: EL SISTEMA reconocerá dos niveles de acceso nuevos, Almacenista y Encargado de
  Planta, además de gerencia, residente y operador.
- RF-2: CUANDO un almacenista entre al panel, EL SISTEMA mostrará en la navegación
  únicamente el módulo Almacén.
- RF-3: CUANDO un encargado de planta entre al panel, EL SISTEMA mostrará en la navegación
  únicamente el módulo Control Cantera.
- RF-4: CUANDO un almacenista o un encargado de planta inicie sesión, EL SISTEMA lo llevará
  directamente a su módulo en lugar de a la pantalla de inicio.
- RF-5: EL SISTEMA limitará al almacenista y al encargado de planta a la información de la
  obra a la que estén adscritos.
- RF-6: SI un almacenista o un encargado de planta no tiene obra asignada, ENTONCES EL
  SISTEMA no le mostrará información de ninguna obra y le dirá que su cuenta no tiene obra.

### Nadie ve lo que no le toca (H3)

- RF-7: SI un almacenista o un encargado de planta abre directamente la dirección de un
  módulo que no le corresponde, ENTONCES EL SISTEMA le mostrará un aviso de que ese módulo no
  es de su cargo, sin exponer su contenido.
- RF-8: EL SISTEMA aplicará estas restricciones en el servidor: una petición hecha por fuera
  de la interfaz recibe la misma respuesta (igual que 001/RF-11).
- RF-9: CUANDO el nivel de acceso de una persona cambie, EL SISTEMA aplicará sus nuevos
  permisos en la siguiente acción que haga, sin que tenga que volver a entrar (igual que
  001/RF-12).
- RF-10: SI se intenta emitir un código de activación de celular para un almacenista o un
  encargado de planta, ENTONCES EL SISTEMA lo rechazará explicando el motivo.

### Lo que ven gerencia y residente (H4)

- RF-11: CUANDO la gerencia entre al panel, EL SISTEMA mostrará además los módulos Almacén y
  Control Cantera, con permiso para registrar en ellos en cualquier obra.
- RF-12: CUANDO un residente entre al panel, EL SISTEMA mostrará además los módulos Almacén y
  Control Cantera de su obra, en modo consulta.
- RF-13: SI un residente intenta registrar, modificar o anular algo en Almacén o en Control
  Cantera, ENTONCES EL SISTEMA lo rechazará indicando quién puede hacerlo.

### Registrar a estas personas

- RF-14: CUANDO la gerencia registre o edite una persona, EL SISTEMA le ofrecerá los cargos
  Almacenista y Encargado de Planta además de los existentes.
- RF-15: CUANDO la gerencia elija el cargo Almacenista, EL SISTEMA propondrá el acceso de
  Almacenista.
- RF-16: CUANDO la gerencia elija el cargo Encargado de Planta, EL SISTEMA propondrá el
  acceso de Encargado de Planta.
- RF-17: EL SISTEMA permitirá dar los niveles de acceso nuevos únicamente a la gerencia.

### Reglas transversales

- RF-18: EL SISTEMA no cambiará el acceso ni lo que ven las personas ya registradas.
- RF-19: EL SISTEMA seguirá funcionando en el celular del operador aunque en su obra haya
  personas con los niveles de acceso nuevos.

## Superficies afectadas

- [x] **Móvil** — solo tolerar: el celular recibe las personas de la obra y no puede
  romperse al encontrar un nivel de acceso que no conocía (RF-19).
- [x] **Panel web** — navegación, destino al entrar, aviso de módulo ajeno, formulario de
  Personas (cargos y accesos nuevos).
- [x] **API** — la tabla de permisos y la guardia de todas las rutas del panel; alta y
  edición de personas; emisión de códigos de activación.
- [x] **Sincronización** — la bajada de personas al celular con los niveles nuevos (RF-19).
- [x] **Datos** — dos valores nuevos de nivel de acceso y dos cargos nuevos, con migración.
- [x] **Reglas** — la tabla de permisos; cada fila nueva lleva su caso en el guion de
  verificación.

## Requisitos no funcionales

- La comprobación de permisos no añade consultas a la base (sigue en pie la de 001).
- Los mensajes de rechazo dicen qué no se puede y quién sí puede, en español.
- Se actualiza la regla escrita que decía que los niveles de acceso no se amplían, dejando el
  motivo del cambio donde estaba la regla.

## Casos límite

- **Sin señal**: no aplica al panel. Para el celular, RF-19.
- **Evidencia firmada**: ninguna se toca. Cambiar el acceso de una persona no altera ningún
  preoperacional ni parte donde figure.
- **Primer arranque**: no hay almacenistas ni encargados de planta hasta que la gerencia los
  registre; los módulos nuevos se ven vacíos para gerencia y residente, sin error.
- Un almacenista al que **le cambian la obra**: desde su siguiente acción ve el almacén de la
  obra nueva y deja de ver el de la anterior (RF-5, RF-9).
- Una persona que es **almacenista y a la vez hace de encargado de planta**: no se da. OCC
  confirmó que el almacén y la cantera los llevan personas distintas; cada una tiene un
  solo nivel de acceso.
- Un residente que **pasa a almacenista**: pierde la bitácora en su siguiente acción.
- Alguien que intenta **ascenderse a sí mismo**: RF-17 y 001/RF-9.

## Fuera de alcance

- Más niveles de acceso que estos dos, o permisos a medida por persona.
- Que un almacenista o un encargado de planta vea la pantalla de inicio con cifras.
- Que estos dos roles usen la app del celular.
- Adscribir una persona a más de una obra.
- Un acceso combinado de almacén y cantera para la misma persona.
- Registro de auditoría de quién hizo qué, más allá de lo que cada módulo guarde.

## Criterios de finalización

- Cada RF tiene su comprobación: la tabla de permisos (RF-2, RF-3, RF-8, RF-10 a RF-13,
  RF-17) como casos en el guion de verificación; el resto, como paso de demo manual.
- Migración de datos en las dos bases, y las personas anteriores conservan su acceso (RF-18).
- `npm run verificar`, `npm run typecheck` y `npm run lint` en verde.
- Demo manual: registrar desde gerencia un Almacenista y un Encargado de Planta en una obra;
  entrar con cada uno y comprobar que ve solo su módulo, que llega directo a él y que las
  direcciones de Bitácoras o Personas le responden con aviso; entrar como residente y ver
  los dos módulos nuevos sin botones de registrar; activar un celular de esa obra y
  comprobar que sincroniza.

## Dudas abiertas

Resueltas el 2026-09-15:

- **Almacén y cantera** los llevan siempre personas distintas: un nivel de acceso por
  persona.
- **Contraseñas**: se ponen igual que las de los residentes, con el procedimiento que ya
  existe en Personas. No cambia nada.

Ninguna abierta.
