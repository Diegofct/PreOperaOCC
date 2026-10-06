# Spec 022 — Panel con menú lateral y diseño nuevo

> Estado: Cumplida (2026-10-06) · Fecha: 2026-10-06

## Contexto y objetivo

El panel creció: la gerencia ya tiene once módulos y la barra de arriba no los aguanta —se parte
en dos renglones en cualquier portátil, y con un módulo más dejará de leerse—. Además, el panel
se ve como lo que fue al principio, una herramienta interna sin cuidar, y OCC quiere que se vea
moderno y propio, con los colores de una obra.

Esta spec hace dos cosas. Pasa los módulos a un **menú lateral** a la izquierda, agrupado y
plegable, y deja arriba una barra con lo de siempre: quién es, cambiar la contraseña y salir. Y
le da al panel un **diseño nuevo** inspirado en egg.live, que OCC eligió como referencia: fondo
crema, texto grafito, amarillo de maquinaria como acento, tipografías Plus Jakarta Sans y Space
Grotesk, botones en forma de píldora, y tarjetas y formularios redondeados y alineados. Lo que
hace cada pantalla no cambia: cambia dónde se navega y cómo se ve.

## Usuarios / actores

- **Gerencia** (panel web, rol `admin`): ve todos los módulos en el menú lateral.
- **Residente / director de obra** (panel web, rol `supervisor`): ve los suyos.
- **Almacenista, encargado de planta y laboratorista** (panel web): ven solo su módulo.
- **Operador** (móvil): no interviene. La app del celular no cambia.

## Historias de usuario

- H1: Como gerencia quiero los módulos en un menú lateral agrupado, para encontrar cada uno sin
  que la barra se parta en dos renglones.
- H2: Como cualquier persona del panel quiero plegar el menú a solo íconos, para dejarle el ancho
  a las tablas grandes, y que el panel recuerde cómo lo dejé.
- H3: Como cualquier persona del panel quiero arriba solo quién soy, cambiar la contraseña y
  salir, para que la barra no compita con el menú.
- H4: Como OCC quiero que el panel se vea moderno y propio, con los colores de una obra, para que
  dé confianza a quien lo usa y a quien lo ve.
- H5: Como quien entra al panel quiero un inicio de sesión claro y centrado, para ingresar sin
  buscar dónde.

## Requisitos funcionales (criterios de aceptación en EARS)

### El menú lateral (H1)

- RF-1: EL SISTEMA mostrará los módulos del panel en un menú lateral a la izquierda de la
  pantalla.
- RF-2: EL SISTEMA mostrará en el menú lateral solo los módulos a los que la persona tiene
  acceso, con las mismas reglas de hoy (cargo y módulos de su obra).
- RF-3: EL SISTEMA agrupará los módulos del menú bajo un título por grupo: «Inicio» suelto;
  «El día a día» con Bitácoras, Reportes de WhatsApp y Preoperacionales; «Módulos de obra» con
  Almacén, Control Cantera y Laboratorio; y «Administración» con Obras, Personas, Vehículos y
  Asignaciones.
- RF-4: SI ningún módulo de un grupo está al alcance de la persona, ENTONCES EL SISTEMA no
  mostrará ese grupo ni su título.
- RF-5: EL SISTEMA mostrará cada módulo del menú con un ícono y su nombre.
- RF-6: EL SISTEMA resaltará en el menú el módulo en el que está la persona, con el acento
  amarillo y no solo con el color: también con el peso del texto o una marca al lado.
- RF-7: CUANDO se elija un módulo en el menú, EL SISTEMA abrirá ese módulo.

### Plegar el menú (H2)

- RF-8: EL SISTEMA mostrará el menú lateral abierto la primera vez que la persona entra al panel.
- RF-9: EL SISTEMA ofrecerá en el menú un botón para plegarlo a solo íconos y otro para volver a
  abrirlo.
- RF-10: MIENTRAS el menú esté plegado, EL SISTEMA mostrará el nombre de un módulo al pasar el
  puntero sobre su ícono.
- RF-11: CUANDO la persona pliegue o abra el menú, EL SISTEMA recordará esa elección en ese
  navegador para las siguientes visitas.
- RF-12: MIENTRAS la ventana sea más angosta que lo que necesitan el menú abierto y el contenido,
  EL SISTEMA mostrará el menú plegado.
- RF-13: CUANDO la persona abra el menú en una ventana angosta, EL SISTEMA lo mostrará por encima
  del contenido.
- RF-14: CUANDO se elija un módulo en un menú abierto por encima del contenido, EL SISTEMA lo
  cerrará.

### La barra superior (H3)

- RF-15: EL SISTEMA mostrará arriba una barra en forma de píldora grafito, separada de los bordes
  de la pantalla.
- RF-16: EL SISTEMA mostrará a la izquierda de la barra superior el logo de OCC y «Control de
  Obra».
- RF-17: EL SISTEMA mostrará a la derecha de la barra superior el nombre y el cargo de quien
  inició sesión.
- RF-18: EL SISTEMA ofrecerá en la barra superior «Cambiar contraseña» y «Cerrar sesión».
- RF-19: EL SISTEMA no mostrará los módulos en la barra superior.

### El diseño (H4)

- RF-20: EL SISTEMA usará en el panel un fondo crema, texto grafito y el amarillo de maquinaria
  como único color de acento.
- RF-21: EL SISTEMA reservará el rojo, el verde y el ámbar del panel para los estados (no apto o
  error, conforme, atención), y no los usará como adorno.
- RF-22: EL SISTEMA usará la tipografía Plus Jakarta Sans para títulos y textos del panel.
- RF-23: EL SISTEMA usará la tipografía Space Grotesk, en mayúsculas y espaciada, para los
  botones, los títulos de los grupos del menú y las etiquetas de las tablas.
- RF-24: EL SISTEMA mostrará los botones del panel en forma de píldora: el principal relleno de
  grafito y el secundario solo con un borde fino.
- RF-25: EL SISTEMA mostrará las tarjetas, las secciones y las ventanas del panel con esquinas
  redondeadas sobre el fondo crema.
- RF-26: EL SISTEMA mostrará en todos los formularios del panel la etiqueta encima de su campo y
  los campos de una misma fila alineados por arriba.
- RF-27: EL SISTEMA mostrará las tablas del panel con el nuevo diseño sin que ninguna se salga del
  ancho disponible, con el menú abierto o plegado.
- RF-28: EL SISTEMA aplicará el diseño nuevo a todas las pantallas del panel.

### El inicio de sesión (H5)

- RF-29: EL SISTEMA mostrará el inicio de sesión del panel como una tarjeta blanca centrada sobre
  el fondo crema.
- RF-30: EL SISTEMA mostrará en la tarjeta de inicio de sesión el logo de OCC, el título
  «Ingresar», los campos de usuario y contraseña con su etiqueta encima, y el botón «Ingresar» en
  píldora grafito.
- RF-31: EL SISTEMA mostrará la pantalla de cambio de contraseña obligatoria con el mismo diseño
  de tarjeta centrada.

### Reglas transversales

- RF-32: EL SISTEMA no cambiará lo que hace ninguna pantalla del panel: los mismos datos, las
  mismas acciones y los mismos permisos.
- RF-33: EL SISTEMA mostrará los textos y las tipografías del panel aunque no haya conexión a
  internet para descargar fuentes.
- RF-34: EL SISTEMA no cambiará la app del celular.

## Superficies afectadas

- [ ] **Móvil** — sin cambios (RF-34).
- [x] **Panel web** — el marco de todas las pantallas (menú lateral y barra superior), el inicio
  de sesión, el cambio de contraseña, y la apariencia de los componentes comunes (botones,
  campos, selectores, tablas, tarjetas, avisos, ventanas). Las pantallas de cada módulo cambian
  solo por heredar esos componentes.
- [ ] **API** — sin cambios.
- [ ] **Sincronización** — sin cambios.
- [ ] **Datos** — sin cambios. La preferencia de menú plegado vive en el navegador.
- [x] **Reglas** — qué grupos y módulos se muestran a cada rol, el cálculo de cuándo plegar el
  menú por ancho, y el contraste de los colores nuevos. Con sus casos en `verificar-reglas.ts`.

## Requisitos no funcionales

- Todo texto del panel sobre su fondo cumple contraste **WCAG AA (4,5:1)**; el texto grande y las
  marcas, 3:1. El amarillo no se usa como color de texto sobre crema ni blanco (no alcanza): va
  de fondo, con texto grafito encima.
- El panel se ve completo, sin desplazamiento horizontal de la página, desde **1280 px** de ancho
  con el menú abierto y desde **1024 px** con el menú plegado.
- El color nunca es la única señal (constitución 7): el módulo activo, los estados y las faltas
  llevan también texto, peso o una marca.
- Interfaz en español.

## Casos límite

- **Sin señal**: no aplica al operador. En el panel, las tipografías van dentro de la aplicación:
  sin internet se siguen viendo (RF-33).
- **Evidencia firmada**: sin cambios. Una bitácora cerrada o un preoperacional firmado se ven con
  el diseño nuevo y no se pueden editar, igual que hoy (RF-32).
- **Primer arranque**: el menú arranca abierto (RF-8); sin una elección guardada, manda el ancho
  de la ventana (RF-12).

Además:

- **Rol con un solo módulo** (almacenista, encargado de planta, laboratorista): ve un menú con un
  solo módulo; el grupo vacío no sale (RF-4).
- **Residente**: ve «Administración» con Asignaciones sola, porque es lo único de ese grupo a lo
  que tiene acceso (RF-2, RF-4).
- **Obra sin un módulo encendido**: el módulo apagado no aparece en el menú de quien pertenece a
  esa obra, como hoy (RF-2).
- **Navegador que no deja guardar la preferencia** (modo incógnito, almacenamiento bloqueado): el
  menú se comporta como la primera vez, sin error (RF-8, RF-11).
- **Nombre largo** («Reportes de WhatsApp», un nombre de persona largo): se recorta con puntos
  suspensivos y no rompe la barra ni el menú.

## Fuera de alcance

- La app del celular (RF-34).
- Modo oscuro: el tema claro sigue siendo una decisión del proyecto.
- Ilustraciones, animaciones de fondo o elementos 3D como los de egg.live.
- Cambiar qué hace una pantalla, sus columnas, sus filtros o sus textos (RF-32).
- Cambiar los permisos o los grupos de quién ve qué.
- Un rediseño del logo de OCC: se usa el que hay.
- Los informes de varios días, que van en su propia spec.

## Criterios de finalización

- Cada RF tiene cómo comprobarse: casos en `scripts/verificar-reglas.ts` para los grupos por rol
  (RF-2 a RF-4), el plegado por ancho (RF-12) y el contraste (RNF); demo manual para el resto.
- `npm run verificar`, `npm run typecheck` y `npm run lint` en verde.
- Demo manual en Chrome:
  1. Iniciar sesión como gerencia en la tarjeta centrada; ver la píldora grafito arriba y el menú
     lateral con sus cuatro grupos.
  2. Recorrer los once módulos desde el menú; el activo resaltado en amarillo con su marca.
  3. Plegar el menú, recargar la página y verlo plegado; abrirlo de nuevo.
  4. Achicar la ventana: el menú se pliega solo y, al abrirlo, va por encima del contenido.
  5. Entrar como residente y como almacenista y ver solo sus grupos y módulos.
  6. Revisar una tabla ancha (bandeja de WhatsApp, viajes) con el menú abierto y plegado: no se
     sale del ancho.
  7. Cambiar la contraseña desde la barra y cerrar sesión.

## Dudas abiertas

Ninguna. Las seis decisiones de la entrevista (2026-10-06): solo el panel web; amarillo de
maquinaria con crema y grafito; menú abierto con botón para plegar que recuerda la elección;
módulos agrupados con títulos; las tipografías copiadas dentro del proyecto; barra superior en
píldora grafito y el inicio de sesión centrado.
