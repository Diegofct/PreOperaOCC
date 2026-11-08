# Spec 041 — Cargos de obra: Director de Proyectos, Director de Obra y Residente

> Estado: **Cumplida en desarrollo** el 2026-11-08 (ver `validacion.md`) · Aprobada el 2026-11-06 · Fecha: 2026-11-06 · **Cambio del 2026-11-08** (RF-54 sustituido; RF-73 a RF-78) · Primera de la tanda 041–044 (cargos, importar al almacén, planificación y plan semanal)

## Contexto y objetivo

Hoy el residente y el director de obra comparten un mismo acceso, «Residente / Director»: los dos pueden lo mismo, y cada uno queda atado a una sola obra. En OCC son tres oficios distintos. El **Director de Proyectos** responde por todas las obras que existan. El **Director de Obra** está a cargo de una o varias obras y solo de esas. El **Residente** está en una sola obra y es la mano derecha del Director de Obra: registra el trabajo, pero no aprueba ni deshace actas. Esta spec separa los tres accesos para que cada uno vea y decida solo lo que le toca, y que lo aprobado lleve la firma de quien tiene autoridad para hacerlo. Es la base de las specs 043 y 044, donde la planificación y el plan semanal se aprueban según estos cargos.

## Usuarios / actores

- **Gerencia**: sigue pudiendo todo. Es la única que crea o retira Directores de Proyectos.
- **Director de Proyectos** (nuevo): ve y gestiona **todas** las obras. Crea obras, da y quita acceso al personal de obra, asigna obras y aprueba. No entra a lo administrativo del grupo.
- **Director de Obra** (nuevo, separado del Residente): una o varias obras asignadas. Registra, aprueba y anula en ellas, y da acceso al personal de esas obras, salvo a otros Directores de Obra.
- **Residente** (separado del Director): una sola obra. Registra todo lo de su obra, revisa y pasa al sistema los reportes de WhatsApp y da acceso a operadores. No aprueba ni anula.
- **Operador**: no cambia nada para él.
- **Almacenista, Encargado de Planta, Laboratorista, Encargado de OCC, Auxiliar Administrativa**: no cambian.

## Historias de usuario

- H1: Como Gerencia quiero un Director de Proyectos que administre todas las obras y a su gente, para no ser yo quien da cada acceso y aprueba cada cosa de obra.
- H2: Como Director de Obra quiero ver y gestionar todas las obras que tengo a cargo, y solo esas, sin tener una cuenta por obra.
- H3: Como Director de Obra quiero que lo que se aprueba o se anula en mi obra pase por mí, para responder por ello.
- H4: Como Residente quiero seguir registrando el día a día de mi obra igual que hoy, sin trabas.
- H5: Como persona que ya usa el panel quiero seguir entrando con mi cuenta sin hacer nada, con el acceso que corresponde a mi cargo.

## Requisitos funcionales (criterios de aceptación en EARS)

### Los tres accesos (H1, H2, H3, H4)

- RF-1: EL SISTEMA ofrece tres accesos de obra distintos: «Director de Proyectos», «Director de Obra» y «Residente».
- RF-2: EL SISTEMA deja de ofrecer el acceso «Residente / Director» en todas las pantallas, listas, selectores, mensajes y exportaciones.
- RF-3: EL SISTEMA ofrece en el catálogo de cargos los cargos «Director de Proyectos» y «Director de Obra», cada uno sugiriendo su acceso del mismo nombre.
- RF-66: EL SISTEMA muestra como «Director de Obra» el cargo que hoy se llama «Director», en todas las personas que lo tienen.
- RF-4: EL SISTEMA hace que el cargo «Residente» sugiera el acceso «Residente».

### Director de Proyectos (H1)

- RF-5: MIENTRAS una persona tenga el acceso Director de Proyectos, EL SISTEMA le muestra la información de todas las obras registradas, sin necesitar que se le asigne ninguna.
- RF-6: EL SISTEMA le permite al Director de Proyectos, en cualquier obra, todo lo que el Director de Obra puede en las suyas.
- RF-7: EL SISTEMA le permite al Director de Proyectos registrar obras nuevas.
- RF-8: EL SISTEMA le permite al Director de Proyectos editar los datos de cualquier obra.
- RF-77: SI alguien distinto de la Gerencia intenta dar de baja una obra, ENTONCES EL SISTEMA lo rechaza con un mensaje que dice que eso lo hace la Gerencia. (Cambio del 2026-11-08.)
- RF-9: EL SISTEMA le permite al Director de Proyectos aprobar y anular, en cualquier obra, todo lo que la Gerencia puede aprobar o anular dentro de una obra, incluidos preoperacionales, movimientos de almacén y registros de cantera. (Para las obras, esto cambia la regla de la spec 009 de que en el almacén solo anula la Gerencia.)
- RF-10: EL SISTEMA le permite al Director de Proyectos aprobar el contrato y el presupuesto de cualquier obra.
- RF-11: EL SISTEMA le permite al Director de Proyectos registrar, editar y dar de baja vehículos en cualquier obra.
- RF-12: EL SISTEMA le permite al Director de Proyectos dar los accesos Director de Obra, Residente, Operador, Almacenista, Encargado de Planta y Laboratorista.
- RF-72: EL SISTEMA le permite al Director de Proyectos, en cualquier obra, y al Director de Obra, en las suyas, emitir el código de activación y el código de respaldo del celular de un operador; el Residente no los emite. (Decidido en la fase de plan, 2026-11-06.)
- RF-75: EL SISTEMA le permite al Director de Proyectos, en cualquier obra, y al Director de Obra, en las suyas, generar la contraseña temporal del panel de las personas a las que cada uno puede dar acceso (RF-12, RF-26). (Cambio del 2026-11-08.)
- RF-76: SI quien pide una contraseña temporal no puede darle el acceso que esa persona tiene, ENTONCES EL SISTEMA lo rechaza con un mensaje que dice quién puede hacerlo; si la persona está en una obra fuera de su alcance, responde como si no existiera (RF-20). (Cambio del 2026-11-08.)
- RF-78: CUANDO alguien genera una contraseña temporal, EL SISTEMA guarda quién la generó, para quién y cuándo, y nunca la contraseña. (Cambio del 2026-11-08.)
- RF-13: EL SISTEMA le permite al Director de Proyectos asignar y retirar obras a un Director de Obra.
- RF-14: SI quien intenta dar o quitar el acceso Director de Proyectos no es la Gerencia, ENTONCES EL SISTEMA lo rechaza con un mensaje que dice que solo la Gerencia lo hace.
- RF-15: EL SISTEMA no le muestra al Director de Proyectos los módulos de empresa del grupo que hoy no ve el Residente / Director: datos de la empresa, finanzas, compras, tesorería, licitaciones y las bitácoras de OCC y de Geolab.
- RF-59: EL SISTEMA le muestra al Director de Proyectos Recursos Humanos, Documentos y las solicitudes de compra y de pago con el mismo alcance que hoy tiene el Residente / Director, en todas las obras.
- RF-16: SI una persona con acceso Director de Proyectos tiene una obra asignada, ENTONCES EL SISTEMA lo rechaza al guardarla, con un mensaje que dice que ese acceso ve todas las obras.

### Director de Obra (H2, H3)

- RF-17: EL SISTEMA permite asignarle a un Director de Obra una o varias obras.
- RF-18: SI se intenta guardar un Director de Obra sin ninguna obra, ENTONCES EL SISTEMA lo rechaza con un mensaje que pide escoger al menos una.
- RF-19: MIENTRAS una persona tenga el acceso Director de Obra, EL SISTEMA le muestra la información de las obras que tiene asignadas, y de ninguna otra.
- RF-20: SI un Director de Obra pide, por cualquier vía, algo de una obra que no tiene asignada, ENTONCES EL SISTEMA responde como si no existiera, sin revelar ningún dato.
- RF-21: EL SISTEMA le da al Director de Obra, en sus obras, todo lo que hoy puede el Residente / Director en la suya.
- RF-60: EL SISTEMA le permite al Director de Obra aprobar y anular, en sus obras, todo lo que el Director de Proyectos puede aprobar o anular en ellas, salvo el contrato y el presupuesto (RF-58).
- RF-22: MIENTRAS un Director de Obra trabaja en el panel, EL SISTEMA le muestra en todo momento cuál es su obra en uso.
- RF-23: CUANDO un Director de Obra registra algo, EL SISTEMA lo registra en su obra en uso.
- RF-67: EL SISTEMA le permite al Director de Obra con varias obras cambiar su obra en uso por otra de las suyas desde cualquier pantalla del panel, sin volver a iniciar sesión.
- RF-24: CUANDO un Director de Obra con varias obras entra al panel, EL SISTEMA le muestra la lista de sus obras para escoger una, como hoy a la Gerencia.
- RF-25: CUANDO un Director de Obra con una sola obra entra al panel, EL SISTEMA lo lleva directo a esa obra.
- RF-26: EL SISTEMA le permite al Director de Obra dar los accesos Residente, Operador, Almacenista, Encargado de Planta y Laboratorista, solo en obras que tenga asignadas.
- RF-27: SI un Director de Obra intenta dar el acceso Director de Obra o Director de Proyectos, ENTONCES EL SISTEMA lo rechaza con un mensaje que dice quién puede darlo.
- RF-58: EL SISTEMA no le permite al Director de Obra aprobar el contrato ni el presupuesto de sus obras; los registra como hoy, y los aprueban el Director de Proyectos o la Gerencia.
- RF-28: SI un Director de Obra intenta asignarse a sí mismo una obra, o retirársela, ENTONCES EL SISTEMA lo rechaza con un mensaje que dice que eso lo hacen el Director de Proyectos o la Gerencia.
- RF-29: CUANDO se le retira una obra a un Director de Obra, EL SISTEMA deja de mostrársela desde su siguiente petición, sin cerrar su sesión.
- RF-30: CUANDO se le retira una obra a un Director de Obra, EL SISTEMA conserva intacto todo lo que él registró, aprobó o anuló en esa obra, con su nombre.
- RF-31: EL SISTEMA guarda desde cuándo y hasta cuándo estuvo cada Director de Obra a cargo de cada obra.
- RF-70: CUANDO la Gerencia o el Director de Proyectos pasan a un Director de Obra al acceso Residente, EL SISTEMA les exige escoger cuál de sus obras conserva.
- RF-71: CUANDO un Residente pasa al acceso Director de Obra, EL SISTEMA le deja asignada la obra que tenía.

### Residente (H4)

- RF-32: EL SISTEMA exige que un Residente tenga exactamente una obra.
- RF-33: EL SISTEMA le da al Residente, en su obra, lo mismo que hoy puede el Residente / Director, menos aprobar y anular.
- RF-61: EL SISTEMA le permite al Residente cerrar el parte del día de su obra.
- RF-34: SI un Residente intenta aprobar algo, ENTONCES EL SISTEMA lo rechaza con un mensaje que nombra al Director de Obra, el Director de Proyectos o la Gerencia como quienes pueden aprobarlo.
- RF-35: SI un Residente intenta anular algo, ENTONCES EL SISTEMA lo rechaza con un mensaje que le dice que se lo pida al Director de Obra, el Director de Proyectos o la Gerencia.
- RF-36: EL SISTEMA no le muestra al Residente los botones de aprobar ni de anular, salvo el de aprobar de la bandeja de WhatsApp (RF-37).
- RF-37: EL SISTEMA le permite al Residente aprobar los reportes de la bandeja de WhatsApp de su obra, porque ahí aprobar es pasar al sistema lo reportado.
- RF-38: EL SISTEMA le permite al Residente dar el acceso Operador, solo en su obra.
- RF-39: SI un Residente intenta dar cualquier acceso distinto de Operador, ENTONCES EL SISTEMA lo rechaza con un mensaje que dice quién puede darlo.

### Aprobar y anular (H3)

- RF-40: EL SISTEMA permite aprobar lo propio de una obra solo al Director de Obra de esa obra, al Director de Proyectos y a la Gerencia, salvo la bandeja de WhatsApp (RF-37) y lo que dicen RF-62 a RF-64.
- RF-41: EL SISTEMA permite anular lo propio de una obra solo al Director de Obra de esa obra, al Director de Proyectos y a la Gerencia, salvo lo que dicen RF-62 a RF-64.
- RF-62: EL SISTEMA le conserva al Encargado de OCC todo lo que hoy aprueba y anula en lo de su empresa, OCC.
- RF-63: EL SISTEMA le conserva al Encargado de Planta anular los registros de cantera.
- RF-64: EL SISTEMA le conserva a la Auxiliar Administrativa aprobar y anular las solicitudes de compra y de pago que llegan de las empresas y de las obras.
- RF-68: EL SISTEMA no le permite al Director de Proyectos ni al Director de Obra aprobar ni anular nada fuera de las obras: lo de las empresas del grupo lo aprueban y anulan la Gerencia y los cargos de RF-62 a RF-64.
- RF-42: CUANDO alguien aprueba o anula, EL SISTEMA guarda su nombre y su cargo en la historia del registro.
- RF-43: MIENTRAS una obra no tenga ningún Director de Obra vigente, EL SISTEMA deja lo que haya que aprobar o anular pendiente para el Director de Proyectos o la Gerencia.
- RF-44: MIENTRAS una obra no tenga ningún Director de Obra vigente, EL SISTEMA lo señala en la lista de obras que ven el Director de Proyectos y la Gerencia.
- RF-45: EL SISTEMA permite que una obra tenga más de un Director de Obra a la vez, y cualquiera de ellos puede aprobar.

### Personas que ya existen (H5)

- RF-46: CUANDO se pone en marcha este cambio, EL SISTEMA pasa al acceso Director de Obra a cada persona con acceso Residente / Director cuyo cargo sea «Director».
- RF-65: SI una persona queda sin obra al pasar a Director de Obra o a Residente, ENTONCES EL SISTEMA no le muestra datos de ninguna obra hasta que la Gerencia o el Director de Proyectos le asignen una, y la incluye en la lista del RF-51.
- RF-69: SI la Gerencia descubre que alguien que pasó a Director de Obra es en realidad el Director de Proyectos, ENTONCES EL SISTEMA le permite cambiarle el acceso y el cargo sin perder lo que esa persona registró, aprobó o anuló.
- RF-47: CUANDO se pone en marcha este cambio, EL SISTEMA pasa al acceso Residente a cada persona con acceso Residente / Director cuyo cargo sea «Residente 1» o «Residente 2».
- RF-48: CUANDO se pone en marcha este cambio, EL SISTEMA pasa al acceso Residente a cada persona con acceso Residente / Director que tenga otro cargo o ninguno.
- RF-49: CUANDO un Director de Obra pasa al acceso nuevo, EL SISTEMA le deja asignada la obra que tenía.
- RF-50: EL SISTEMA conserva la contraseña y la sesión abierta de toda persona cuyo acceso cambió por RF-46 a RF-48.
- RF-51: EL SISTEMA le muestra a la Gerencia y al Director de Proyectos la lista de las personas que pasaron a Residente por RF-48, para que revisen a quién corresponde otro acceso.
- RF-52: EL SISTEMA conserva sin cambios lo que cada persona aprobó o anuló antes de este cambio, con el nombre del acceso que tenía entonces.

### Asistente (H2, H3)

- RF-53: EL SISTEMA le responde al Director de Proyectos con la información de obra de todas las obras, y con nada de los módulos de empresa del RF-15.
- ~~RF-54: EL SISTEMA le responde al Director de Obra solo con la información de las obras que tiene asignadas.~~ **Sustituido por RF-73 y RF-74 (2026-11-08).**
- RF-73: MIENTRAS un Director de Obra usa el asistente, EL SISTEMA le responde solo con la información de su obra en uso y de los módulos que esa obra tenga encendidos. (Cambio del 2026-11-08.)
- RF-74: SI un Director de Obra le pide al asistente información de otra obra, aunque también sea suya, ENTONCES EL SISTEMA no le da ningún dato de ella y le indica que cambie de obra en uso para consultarla. (Cambio del 2026-11-08.)
- RF-55: EL SISTEMA le responde al Residente con lo mismo que hoy le responde al Residente / Director, solo de su obra.

### Reglas transversales

- RF-56: SI una petición llega con un acceso que ya no permite la acción, porque cambió mientras la pantalla estaba abierta, ENTONCES EL SISTEMA la rechaza con un mensaje que dice por qué, sin guardar nada.
- RF-57: EL SISTEMA decide qué puede cada acceso en un único sitio, con las mismas reglas para las pantallas, las peticiones y el asistente.

## Superficies afectadas

- [ ] **Móvil** — sin cambios: la app del operador no depende de estos accesos.
- [x] **Panel web** — personas (escoger acceso y una o varias obras), entrada al panel y lista de obras, botones de aprobar y anular, aviso de obras sin Director de Obra, lista de personas que pasaron a Residente, nombres de los accesos en todo el panel.
- [x] **API** — todas las rutas del panel que filtran por obra, aprueban, anulan o dan accesos; las del asistente.
- [ ] **Sincronización** — sin cambios.
- [x] **Datos** — los accesos nuevos, la asignación de varias obras a una persona con su vigencia, y el paso de las personas que ya existen. Solo en el servidor.
- [x] **Reglas** — permisos por acceso, quién puede dar cada acceso, alcance por obra y alcance del asistente. Casos nuevos en `verificar-reglas.ts`.

## Requisitos no funcionales

- Idioma: todos los mensajes nuevos en español, con el nombre del cargo que puede hacer lo pedido.
- Puesta en marcha: el paso de las personas existentes (RF-46 a RF-52) ocurre en una sola operación al desplegar, sin cerrar sesiones y sin pedirle nada a nadie.
- Ver la información de varias obras no puede hacer más lenta una pantalla del panel de forma notable: con 5 obras asignadas, cada lista responde en menos de 2 s en desarrollo, igual que hoy con una.

## Casos límite

- **Sin señal**: no aplica; nada de esto se hace desde el celular, y la app del operador no cambia.
- **Evidencia firmada**: lo aprobado o anulado antes del cambio no se toca y conserva quién lo hizo (RF-52). Un Residente que ya no puede anular le pide al Director de Obra que anule con motivo; nada se corrige sobrescribiendo.
- **Primer arranque**: una obra recién creada no tiene Director de Obra. Funciona igual: el Residente registra, y lo que haya que aprobar queda para el Director de Proyectos o la Gerencia (RF-43). La obra aparece señalada (RF-44).
- **Dos Directores de Obra a la vez** en la misma obra, por ejemplo durante un relevo: los dos aprueban, y la historia guarda cuál fue (RF-45, RF-42).
- **Dos personas aprobando lo mismo a la vez**: gana el primero, y el segundo recibe el mensaje que ya existe para eso, con el nombre de quien aprobó.
- **Pantalla abierta mientras cambia el acceso**: la acción se rechaza en el servidor con el motivo (RF-56); la pantalla no decide.
- **Director de Obra sin ninguna obra** porque se le retiraron todas: entra al panel y ve que no tiene obras asignadas y a quién pedírselas, como hoy una persona sin obra.
- **Persona con cargo raro o sin cargo** al migrar: queda Residente y aparece en la lista para revisar (RF-48, RF-51).
- **Director de Obra con varias obras y ninguna en uso** que abre el asistente: se le pide escoger la obra; no se le responde de ninguna (RF-73).
- **Generar una contraseña temporal** cierra las sesiones de esa persona, y quien la genera la conoce hasta que la persona la cambie al entrar. Sobre uno mismo sigue rechazada: para eso está «Cambiar mi contraseña».
- **El Residente** no genera contraseñas: el único acceso que da es Operador (RF-38), y el operador entra con su PIN.

## Fuera de alcance

- La planificación de obra, el plan semanal y sus aprobaciones (specs 043 y 044). Esta spec solo deja definidos los accesos que esas aprobaciones usarán.
- Importar documentos al almacén (spec 042).
- Cambiar lo que pueden el Almacenista, el Encargado de Planta, el Laboratorista, el Encargado de OCC, la Auxiliar Administrativa o el Operador.
- Que el Residente tenga más de una obra, o que se mueva de obra solo: lo mueve el Director de Obra, el Director de Proyectos o la Gerencia, como hoy.
- Delegaciones temporales («el Residente aprueba mientras el Director está de vacaciones»).
- Avisos por correo o WhatsApp de lo pendiente por aprobar.
- La app móvil y la sincronización.
- Desplegar a producción: va con la T23 de la 033, cuando se pida.

## Criterios de finalización

- Cada RF tiene cómo comprobarse: los de reglas (permisos por acceso, quién da qué, alcance por obra, alcance del asistente, paso de las personas existentes) con casos «041/» en `scripts/verificar-reglas.ts`; los de pantalla con un paso de demo.
- `npm run verificar`, `npm run typecheck` y `npm run lint` en verde.
- Demo manual del flujo principal: con datos `PRUEBA-041` en desarrollo:
  1. La Gerencia crea un Director de Proyectos.
  2. Este crea una obra y un Director de Obra con dos obras.
  3. El Director de Obra crea un Residente en una de ellas.
  4. El Residente registra un parte y no puede anularlo: ve el mensaje.
  5. El Director de Obra lo anula con motivo.
  6. El Director de Obra no ve una tercera obra: la pide por la dirección y recibe «no existe».
  7. El Director de Proyectos ve las tres.
  8. El paso de las personas existentes se ejecuta en desarrollo y deja a cada una en su acceso, con la sesión abierta.
  9. El Director de Obra genera la contraseña de un Residente de su obra; no puede con otro Director de Obra.
  10. El Director de Proyectos intenta dar de baja una obra y recibe el mensaje; la Gerencia sí puede.
  11. El Director de Obra le pregunta al asistente por su otra obra y no recibe datos: se le indica cambiar de obra en uso.

## Dudas abiertas

**Clarificación del 2026-11-06, resuelta con Diego:**

- **Quién aprueba y anula:**
  - La Gerencia, en todo.
  - El Director de Proyectos, en todo lo de las obras (RF-9, RF-68).
  - El Director de Obra, en sus obras, salvo el contrato y el presupuesto (RF-60, RF-58).
  - El Residente consulta y registra todo lo de su obra, cierra el parte del día y no anula nada (RF-33, RF-61).
  - El Encargado de OCC, el Encargado de Planta y la Auxiliar Administrativa conservan lo suyo (RF-62 a RF-64).
- **Cargos:** existen «Director de Proyectos» y «Director de Obra»; el cargo «Director» actual pasa a ser «Director de Obra» (RF-66). Si alguno era en realidad Director de Proyectos, la Gerencia se lo cambia (RF-69).
- **Quien quede sin obra al migrar:** no ve datos hasta que le asignen una (RF-65).
- **Varias obras:** el Director de Obra trabaja en una «obra en uso» y se mueve entre las suyas cuando quiera (RF-22, RF-23, RF-67).
- **Al bajar un Director de Obra a Residente:** la obra que conserva la escogen el Director de Proyectos o la Gerencia (RF-70).

Lo demás del informe de clarificación lo resuelve el plan: las vías del RF-20, el registro del cargo en las historias (RF-42 y RF-52, solo hacia adelante) y los registros sin obra (RF-19).

- ~~¿El Director de Obra aprueba el contrato y el presupuesto de sus obras?~~ **Resuelta (2026-11-06): no.** Sigue como hoy: registra, pero no aprueba (RF-58). Lo aprueban el Director de Proyectos (RF-10) y la Gerencia.
- ~~¿El Director de Proyectos ve Recursos Humanos, Documentos y las solicitudes de compra y de pago de las obras como hoy las ve el Residente / Director?~~ **Resuelta (2026-11-06): sí, lo mismo que hoy**, en todas las obras (RF-59).
- ~~¿El asistente del Director de Obra responde de todas sus obras?~~ **Resuelta (2026-11-08): no, solo de la obra en uso** (RF-73, RF-74).
- ~~¿Quién genera las contraseñas temporales del panel?~~ **Resuelta (2026-11-08): también los directores, a las personas a las que pueden dar acceso** (RF-75, RF-76).
- ~~¿El Director de Proyectos puede dar de baja obras?~~ **Resuelta (2026-11-08): no, solo la Gerencia** (RF-77).
