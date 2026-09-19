# Spec 014 — Salir de localhost

> Estado: Borrador · Fecha: 2026-09-19

## Contexto y objetivo

Todo el sistema funciona y nada de él existe fuera del portátil de quien lo escribió. El
panel corre en `localhost`, la app del operador habla con el servidor de Metro de esa misma
máquina, y la base que usan los dos está llena de datos inventados: una obra que no existe,
un «Pepito Perez», tres vehículos de prueba. Mientras siga así, OCC no puede usar nada de
esto, y cada demo depende de que un computador concreto esté encendido.

Esta spec es el paso que convierte el proyecto en un sistema que OCC puede usar: **una
dirección propia a la que entra la administración desde cualquier navegador, y una app que
los operadores instalan en su teléfono y que habla con esa dirección.**

Hay dos cosas que lo hacen menos trivial de lo que suena. La primera es que **el servidor
contratado ya tiene otro proyecto trabajando encima**, y ese no se puede caer: lo que se
haga aquí tiene que entrar sin rozarlo. La segunda es que **la app lleva la dirección del
servidor dentro**: se decide una vez, al compilar, y cambiarla después obliga a repartir la
app otra vez a todos los operadores. Es la única decisión de este despliegue que es cara de
deshacer.

## Usuarios / actores

- **Gerencia** (panel web) — es quien estrena el sistema: entra con la primera cuenta y
  desde ahí registra las obras, las personas y la flota reales. Sin ese primer ingreso el
  sistema está vacío y nadie más puede entrar.
- **Residente / director de obra** (panel web) — entra a su obra desde el navegador, sin
  que nadie tenga que encender un computador concreto.
- **Operador** (móvil, en obra) — instala la app desde un enlace y activa su equipo una
  vez, con señal. Después de eso su trabajo no cambia en nada.
- **Quien despliega** — hoy una sola persona. Necesita un procedimiento escrito que se
  pueda seguir sin recordar nada, y una forma de deshacer cada paso.

## Historias de usuario

- H1: Como gerencia quiero entrar al panel desde cualquier navegador con una dirección
  propia, para no depender de que un computador esté encendido.
- H2: Como operador quiero instalar la app en mi teléfono desde un enlace, para empezar a
  levantar preoperacionales sin que nadie venga a configurarme nada.
- H3: Como responsable del servidor quiero que el proyecto que ya corre ahí siga corriendo,
  para no cambiar un problema por otro.
- H4: Como quien despliega quiero un procedimiento escrito y reversible, para poder hacerlo
  de noche y sin adivinar.
- H5: Como gerencia quiero que el sistema arranque sin datos inventados, para que lo primero
  que se vea sea la obra de verdad.

## Requisitos funcionales (criterios de aceptación en EARS)

### El panel disponible (H1)

- RF-1: EL SISTEMA servirá el panel en una dirección propia accesible desde internet.
- RF-2: EL SISTEMA servirá el panel **únicamente sobre conexión cifrada**.
- RF-3: SI alguien llega por una dirección sin cifrar, ENTONCES EL SISTEMA lo llevará a la
  cifrada.
- RF-4: CUANDO el servidor se reinicie, EL SISTEMA volverá a quedar disponible sin que nadie
  intervenga.
- RF-5: EL SISTEMA no perderá ningún dato al reiniciarse el servidor.
- RF-6: EL SISTEMA seguirá sirviendo las firmas y las fotos únicamente a través del panel,
  detrás de la sesión, sin exponer nunca el almacén de imágenes.

### Sin tocar lo que ya funciona (H3, H4)

- RF-7: EL SISTEMA no interrumpirá el servicio del proyecto que ya corre en ese servidor.
- RF-8: ANTES de aplicar cualquier cambio a la entrada de tráfico compartida, EL SISTEMA
  comprobará que la configuración nueva es válida.
- RF-9: SI la configuración nueva resulta inválida, ENTONCES EL SISTEMA no la aplicará.
- RF-10: EL SISTEMA dejará escrito cómo deshacer cada paso del despliegue.
- RF-11: CUANDO se actualice el panel, EL SISTEMA admitirá una interrupción breve, fuera del
  horario de trabajo de la obra.
- RF-12: MIENTRAS el panel esté interrumpido por una actualización, EL SISTEMA permitirá al
  operador seguir trabajando en su teléfono sin pérdida de datos.

### Los secretos (H4)

- RF-13: EL SISTEMA no guardará ninguna credencial dentro de lo que se publica ni dentro del
  paquete que se sube al servidor.
- RF-14: EL SISTEMA leerá las credenciales del entorno del servidor en el momento de
  usarlas.
- RF-15: EL SISTEMA usará en producción una clave de firma de sesiones de equipos **distinta
  de la de desarrollo**.
- RF-16: EL SISTEMA no expondrá ninguna credencial al navegador de quien usa el panel.

### Un arranque limpio (H5)

- RF-17: EL SISTEMA arrancará en producción sobre una base de datos **sin ningún registro de
  prueba**.
- RF-18: EL SISTEMA tendrá cargado el catálogo de tipos de equipo y los formatos del
  preoperacional antes del primer ingreso.
- RF-19: EL SISTEMA no creará automáticamente ninguna obra, persona ni vehículo.
- RF-20: EL SISTEMA permitirá crear la primera cuenta de gerencia sin que exista ninguna
  sesión previa.
- RF-21: EL SISTEMA conservará intacto el entorno de desarrollo y su base, que siguen
  siendo independientes de producción.

### La app del operador (H2)

- RF-22: EL SISTEMA producirá un archivo instalable de la app para teléfonos Android.
- RF-23: EL SISTEMA permitirá al operador instalar ese archivo desde un enlace, sin tienda.
- RF-24: EL SISTEMA hará que la app instalada hable con el servidor de producción.
- RF-25: EL SISTEMA exigirá señal **una sola vez**, al activar el equipo, y nunca después.
- RF-26: CUANDO un teléfono que se usó en desarrollo pase a producción, EL SISTEMA no
  conservará ninguno de sus datos de prueba.
- RF-27: EL SISTEMA conservará la capacidad de volver a emitir la app: quien la firme hoy
  tiene que poder firmar la siguiente versión.

### Reglas transversales

- RF-28: EL SISTEMA dejará escrito, y comprobado una vez, dónde queda respaldada cada pieza
  de un preoperacional firmado.
- RF-29: EL SISTEMA no cambiará ninguna regla de negocio, ninguna pantalla ni ningún dato
  que guarde: este despliegue mueve el sistema de sitio, no lo modifica.

## Superficies afectadas

- [x] **Móvil** — no cambia una línea de su comportamiento, pero **la app se compila
      apuntando a producción**, y esa dirección queda dentro del instalable.
- [ ] **Panel web** — sin cambios. Habla con su servidor por rutas relativas, así que
      funciona en cualquier dirección sin recompilar.
- [ ] **API** — sin cambios de comportamiento.
- [x] **Sincronización** — no cambia, pero **todos los equipos se activan de cero** contra
      el servidor nuevo: la clave de firma de producción es otra.
- [x] **Datos** — base nueva, **sin cambios de esquema**. Se aplican las migraciones que ya
      existen y se siembra el catálogo.
- [ ] **Reglas** — sin cambios. No hay ninguna regla pura nueva en esta spec.

## Requisitos no funcionales

- **Corte del proyecto vecino: cero.** Es el único umbral innegociable de esta spec.
- **Corte propio en una actualización: minutos, y fuera del horario de obra.**
- El procedimiento tiene que poder seguirlo una persona sola, de noche, sin recordar nada
  que no esté escrito.
- Todo el material escrito —procedimiento, instrucciones de instalación para el operador—
  va en español.
- El instalable de la app tiene que caber en una descarga por datos móviles: un operador
  puede estar instalándola desde la obra.

## Casos límite

Los tres que este proyecto no puede dejar sin respuesta:

- **Sin señal**: no cambia nada. El operador trabaja igual, y durante una actualización del
  panel ni se entera: su cola de subida reintenta sola cuando el servidor vuelve. La única
  vez que necesita señal sigue siendo la activación.
- **Evidencia firmada**: en producción **no hay ninguna todavía**, porque la base arranca
  vacía. Lo firmado durante el desarrollo se queda en la base de desarrollo y no se migra:
  son pruebas, no actas de OCC.
- **Primer arranque / equipo recién activado**: es el estado de **todos** los equipos el día
  uno. Cada operador instala, activa con su código, define su PIN y baja sus datos.

Y los del caso concreto:

- **La entrada de tráfico se rompe al aplicar el cambio**: es el riesgo que RF-7 a RF-10
  atacan. Se valida antes de aplicar, y si algo sale mal se vuelve atrás con lo escrito.
- **El dominio todavía no está decidido**: el servidor puede desplegarse igual y el panel
  funciona; lo que no se puede hacer sin dominio es compilar la app definitiva.
- **La app se compila apuntando a la dirección equivocada**: no se arregla en el servidor.
  Hay que compilar otra vez y que **todos** los operadores reinstalen. Es la razón de que el
  dominio se decida antes de compilar y no después.
- **Alguien instala la app de producción encima de la de pruebas**: por eso RF-26. El
  teléfono que se usó para probar se desinstala antes, no se actualiza encima.
- **El certificado de cifrado caduca**: el panel deja de abrirse aunque el servidor esté
  bien. Tiene que renovarse solo, y hay que comprobar que lo hace.
- **El contenedor del panel se reinicia o se recrea**: no puede perder nada, porque no
  guarda nada: la base está fuera y las imágenes también (RF-5).
- **Dos personas despliegan a la vez**: no aplica hoy —hay una sola—, pero el procedimiento
  escrito es lo que evita que el día que sean dos cada una haga una cosa distinta.
- **El reloj del servidor desfasado**: el sistema ya anota el desfase de cada teléfono
  contra el servidor; si el desfasado es el servidor, esa anotación miente. Se comprueba una
  vez al desplegar.

## Fuera de alcance

- **Cargar las obras, las personas y la flota reales de OCC.** El despliegue termina con el
  sistema listo y vacío; la captura es trabajo de la administración desde el panel.
- **Copias de respaldo propias.** Se documenta lo que ya respaldan los proveedores y se
  comprueba una vez (RF-28); montar una copia adicional es otra spec.
- **Un entorno de pruebas en el servidor.** Desarrollo se queda en la máquina de quien
  desarrolla, con su base actual.
- **Actualizar el panel sin ninguna interrupción.** Se acepta un corte breve (RF-11).
- **Publicar la app en Google Play**, ni en canal interno ni abierto.
- **Actualizaciones de la app por aire**, sin reinstalar.
- **iPhone.** Los operadores de OCC usan Android.
- **Vigilancia automática**: alertas, métricas o avisos si el panel se cae.
- **Que el despliegue lo dispare un cambio en el repositorio.** Por ahora se hace a mano, a
  conciencia.

## Criterios de finalización

**Ninguno de estos requisitos es una regla pura**, así que ninguno añade casos a
`scripts/verificar-reglas.ts`: todos se comprueban ejecutando el despliegue. Los tres
comandos de siempre tienen que estar en verde antes de empezar.

Recorrido de punta a punta, en producción y en este orden:

1. El proyecto que ya estaba en el servidor **sigue respondiendo**, antes y después de cada
   paso. (RF-7 a RF-10)
2. El panel abre en su dirección, cifrado, y la dirección sin cifrar redirige. (RF-1 a RF-3)
3. Gerencia entra con la primera cuenta, y el panel está vacío: sin obras, sin personas, sin
   vehículos, con los tipos de equipo y los formatos cargados. (RF-17 a RF-20)
4. Se registra una obra, una persona y un vehículo, y se emite un código de activación.
5. **Un teléfono sin la app de pruebas** instala el archivo desde el enlace, se activa con
   ese código y baja sus datos. (RF-22 a RF-26)
6. Con el **avión activado**, el operador levanta y firma un preoperacional completo.
7. Al recuperar señal, ese preoperacional aparece en el panel **con su firma y sus fotos**, y
   las imágenes se ven desde el panel y no desde ninguna otra dirección. (RF-6)
8. Se reinicia el servidor y el panel vuelve solo, con todo dentro. (RF-4, RF-5)
9. Se busca en lo que se publicó al navegador cualquier credencial: no aparece ninguna.
   (RF-13, RF-16)
10. Queda escrito dónde está respaldada cada pieza de ese preoperacional. (RF-28)

## Dudas abiertas

- [NECESITA ACLARACIÓN: **cuál es el dominio**. Sin él no se puede compilar la app
  definitiva, aunque el servidor sí se puede desplegar. Es la decisión más cara de deshacer
  de toda la spec.]
- [NECESITA ACLARACIÓN: quién administra el DNS de ese dominio y si quien despliega tiene
  acceso a él.]
- [NECESITA ACLARACIÓN: qué es «fuera del horario de trabajo de la obra» para OCC, en horas
  concretas. De eso depende cuándo se puede actualizar sin molestar a nadie.]
- [NECESITA ACLARACIÓN: cuántos teléfonos hay que atender el día uno, y si los operadores
  tienen datos móviles propios para descargar el instalable.]

Resueltas el 2026-09-19:

- **Cero tolerancia a que el proyecto vecino se caiga** (RF-7): manda sobre cualquier atajo
  del procedimiento.
- **El teléfono de pruebas se desinstala, no se actualiza encima** (RF-26): la base local
  nace vacía, sin los preoperacionales de prueba.
- **El despliegue termina listo y vacío** (RF-19): registrar la obra real es del panel.
- **Se acepta un corte breve al actualizar** (RF-11), fuera del horario de obra.
- **Los respaldos se documentan y se comprueban una vez** (RF-28), sin montar nada nuevo.
- **Desarrollo sigue donde está** (RF-21), con su base actual y sus datos de prueba.
