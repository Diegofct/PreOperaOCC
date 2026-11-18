# Tareas — Spec 050

Tareas de menos de 30 minutos, ordenadas por dependencia. Cada una lleva los RF que
cubre y una línea `Hecho cuando:` que se pueda comprobar sin interpretar.

**Se implementa una tarea cada vez** (`/sdd:implementar T1`), y al terminarla se para.
Ninguna tarea se marca sin `npm run verificar`, `npm run typecheck` y `npm run lint`
en verde.

Las tareas que muestran algo en pantalla se miran en el navegador de Diego (la extensión de
Claude, una sola pestaña y sin recargar en bucle). Para comparar anchos se usan recuadros de
390, 1366 y 1920 px dentro de la página.

### Antes de tocar nada

- [x] T1. Fotos de «antes» en 390, 1366 y 1920 px de lo que piden los criterios de finalización:
      - el menú de una obra y el de OCC, GeoLab y Elemental, abiertos y plegados;
      - la portada de una obra;
      - el formulario de requisición, la ficha de persona y el contrato;
      - una tabla larga (personal);
      - una lista con filtro de estado (requisiciones);
      - una lista vacía.

      Se guardan en `specs/050-interfaz-ordenada-y-responsive/fotos/antes/`. (RF: —)
      Hecho cuando: la carpeta tiene las fotos con nombre `pantalla-ancho.png` y una lista de ellas en las Notas
      de ejecución.

### Reglas puras (con su caso en la verificación)

- [x] T2. Añadir `AnchoListado = 1600`, `AnchoFormulario = 1100` y `DuracionDeAviso = 4000` en
      `src/constants/medidas.ts`, con su caso en `scripts/verificar-reglas.ts`. (RF-42, RF-43, RF-56)
      Hecho cuando: los tres comandos están en verde y la verificación comprueba los tres valores.
- [x] T3. En `src/shared/rules/empresas.ts`:
      - el campo `seccion` en las entradas del menú;
      - las listas de secciones de obra, OCC, GeoLab y Elemental;
      - `menuPorSecciones(lugar, persona, modulos)`, que devuelve `{ asistente, secciones }`;
      - el Asistente al frente de cada menú.

      Casos en la verificación:
      - las secciones y las entradas exactas de cada lugar, en orden;
      - toda entrada tiene sección, salvo el Asistente;
      - no queda ninguna sección vacía para ningún rol;
      - una obra con Almacén y Cantera apagados.

      (RF-1, RF-3 a RF-10)
      Hecho cuando: los tres comandos están en verde, con los casos de las cuatro listas de secciones y el del
      almacenista (una sola sección, «Materiales y calidad», más el Asistente).
- [x] T4. Hacer que `destinoAlEntrar` lleve al Asistente del lugar a los ocho cargos que no son Gerencia; quien
      tiene varias obras sigue yendo a la lista. Añadir `portadaDelLugar(lugar, persona, modulos)`. Ajustar los
      casos viejos de la 008, la 033, la 034, la 035 y la 046 con el comentario «Modificado por la spec 050».
      (RF-84, RF-85, RF-88, RF-89, RF-90)
      Hecho cuando: los tres comandos están en verde; la verificación espera `…/asistente` para residente,
      almacenista, laboratorista, encargado de OCC, Auxiliar y Administradora, y `/panel` para Gerencia; y
      `portadaDelLugar` da la primera entrada cuando el cargo no tiene permiso para el Asistente.
- [x] T5. Añadir `migasDelLugar(lugar, nombres, registro?)` y quitar «Resumen del día» de `tituloDelLugar`.
      Casos para una empresa, una obra y una obra con registro. (RF-27, RF-28, RF-86)
      Hecho cuando: los tres comandos están en verde; la verificación espera «OCC › Documentos» y «Obra X ›
      Recursos Humanos › Juan», todos los pasos con ruta salvo el último, y ningún título con «Resumen del día».

### Menú lateral y portada

- [x] T6. Menú abierto por secciones en `menu-lateral.tsx`. Primero la cabecera de la 049 (la marca o la obra,
      con «Cambiar de obra»), luego el Asistente sin título y después cada sección con su título
      (`tituloGrupo`). (RF-1, RF-2, RF-8, RF-67, RF-68)
      Hecho cuando: los tres comandos están en verde y en el navegador una obra muestra Asistente · Día a día ·
      Planeación y contrato · Materiales y calidad · Personal y archivo, con «Cambiar de obra» arriba.
- [x] T7. Menú plegado: una raya entre secciones y la etiqueta «Sección · Entrada», que sale al pasar el
      puntero y también al mantener pulsada la entrada. (RF-11, RF-12)
      Hecho cuando: los tres comandos están en verde y en el navegador, con el menú plegado, la etiqueta de
      Almacén dice «Materiales y calidad · Almacén».
- [x] T8. Portadas:
      - `PortadaDeEmpresa` y `PortadaDeLaObra` usan `portadaDelLugar`;
      - se retira el componente `Portada` (el Resumen del día) de `pantalla-inicio.tsx`, con lo que solo él usaba;
      - un barrido en la verificación comprueba que ningún `.tsx` dice «Resumen del día».

      (RF-84, RF-85, RF-86, RF-87)
      Hecho cuando: los tres comandos están en verde y en el navegador abrir `/panel/proyectos/<obra>` lleva a
      `/panel/proyectos/<obra>/asistente`.

### Campos y ventanas

- [x] T9. Campos en `componentes.tsx`:
      - la etiqueta en una sola línea y de alto fijo, con el texto completo en `accessibilityLabel`;
      - la ayuda y el error debajo del recuadro;
      - `Formulario` con `alignItems: 'flex-start'`.

      (RF-13 a RF-18, RF-24)
      Hecho cuando: los tres comandos están en verde y en el navegador los recuadros de «Nueva obra» quedan a
      la misma altura aunque uno tenga ayuda.
- [x] T10. Ir al primer error: un contexto `PrimerError` hace que el primer campo que recibe un error se
      desplace a la vista con `scrollIntoView`. (RF-19, RF-20)
      Hecho cuando: los tres comandos están en verde y en el navegador, al guardar el contrato con un campo
      obligatorio vacío al fondo, la ventana baja hasta ese campo.
- [x] T11. `Modal` con una ranura de pie fuera del desplazamiento. `AccionesFormulario` dentro de un `Modal` se
      pinta en esa ranura; fuera de un `Modal`, como hoy. (RF-21)
      Hecho cuando: los tres comandos están en verde y en el navegador, en una ventana más alta que la
      pantalla («Nueva persona» a 390 px), Guardar y Cancelar se ven sin desplazarse y los botones salen una
      sola vez.
- [x] T12. Cada renglón de la requisición (`formulario-de-solicitud.tsx`) pasa a ser una `Tarjeta` con:
      - la cabecera «Renglón N» y el botón Quitar;
      - dos `Formulario`, uno para qué, cantidad y unidad, y otro para para cuándo, para qué y valor;
      - «Va a» a lo ancho;
      - ningún ancho escrito a mano.

      (RF-22, RF-23)
      Hecho cuando: los tres comandos están en verde y en el navegador, a 1366 px, las seis etiquetas de un
      renglón quedan alineadas en dos filas.
- [x] T13. Formularios a mano, lote 1 (requisiciones): `compras/pasos-de-gerencia.tsx`,
      `requisiciones/cadena-y-decision.tsx`, `requisiciones/campo-de-imputacion.tsx`,
      `requisiciones/occ/ventanas-occ.tsx` y `requisiciones/occ/importar-planilla-occ.tsx`. (RF-25)
      Hecho cuando: los tres comandos están en verde y ninguno de los cinco tiene un `View` con `width`
      numérico alrededor de un campo.
- [x] T14. Lote 2 (contrato y documentos): `contratos/pantalla-contrato.tsx`,
      `contratos/polizas-y-documentos.tsx`, `contratos/acciones-presupuesto.tsx` y
      `documentos/pantalla-documentos.tsx` (la ventana de subida). (RF-25)
      Hecho cuando: los tres comandos están en verde, se cumple la misma condición en los cuatro y en el
      navegador se ven alineados el contrato y la subida de un documento.
- [x] T15. Lote 3 (almacén, laboratorio, maquinaria y preoperacionales): `almacen-obra/ventana-renglon.tsx`,
      `empresas/pantalla-laboratorio-de-obras.tsx`, `empresas/pantalla-maquinaria.tsx`,
      `panel/detalle-preoperacional.tsx`, `panel/fotos-del-dia.tsx` y los filtros de
      `panel/pantalla-preoperacionales.tsx`. (RF-25)
      Hecho cuando: los tres comandos están en verde y se cumple la misma condición en los seis.
- [x] T16. Lote 4 (WhatsApp): `completar-de-empresa`, `creado-automaticamente`, `estado-del-dia`,
      `filtro-de-fechas`, `no-se-pudo-guardar`, `reportes-esperados` y `pantalla-bandeja`, todos en
      `panel/whatsapp/`. (RF-25)
      Hecho cuando: los tres comandos están en verde y se cumple la misma condición en los siete.
- [x] T17. Lote 5 (planificación y plan semanal): `plan-semanal/acciones-plan-semanal`, `armar-plan-semanal`,
      `secciones-del-plan` y `ventana-actividad`; `planificacion/acciones-planificacion`,
      `crear-desde-presupuesto`, `indirectos-del-borrador`, `subir-planificacion` y `pantalla-cumplimiento`.
      No se tocan las cuadrículas `editor-planificacion`, `meses-del-renglon` ni `campo-cifra`. (RF-25, RF-71)
      Hecho cuando: los tres comandos están en verde y se cumple la misma condición en los nueve.
- [x] T18. Lote 6 (tesorería, RRHH, reportes, Asistente y sesión): `tesoreria/formulario-de-pago`,
      `pasos-de-tesoreria` y `pantalla-tesoreria`; `rrhh/pantalla-personal`, `reportes/pantalla-reportes`,
      `asistente/uso-del-asistente`, `panel/pantalla-cambiar-clave`, `panel/pantalla-ingreso` y
      `panel/secciones-con-indice`. Al terminar se añade el barrido estático de RF-25 a la verificación.
      (RF-25)
      Hecho cuando: los tres comandos están en verde y el barrido no encuentra ningún `View` con `width`
      numérico alrededor de un campo, fuera de las cuadrículas declaradas.

### Encabezado y anchos

- [x] T19. `MarcoPantalla` gana:
      - `acciones` a la derecha del título, que por debajo de 768 px va debajo y a lo ancho;
      - `registro`, el tercer paso de la ruta;
      - las migas con `migasDelLugar`;
      - el nombre recortado con «…», que se ve completo al pasar el puntero o al mantenerlo pulsado.

      (RF-26 a RF-29, RF-31, RF-69)
      Hecho cuando: los tres comandos están en verde y en el navegador Documentos de OCC muestra «OCC ›
      Documentos» arriba del título, y pulsar «OCC» lleva al Asistente de OCC.
- [x] T20. `MarcoPantalla` gana `ancho: 'listado' | 'formulario'`, con topes de 1600 y 1100 px. Llevan
      `formulario` el contrato, la ficha de persona (`rrhh/vista-de-la-ficha`), la vista de una solicitud, la
      vista de un pago y el informe de laboratorio. (RF-42, RF-43)
      Hecho cuando: los tres comandos están en verde y en un recuadro de 1920 px la lista de personal mide
      1600 px y la ficha de una persona 1100 px.
- [x] T21. El botón principal pasa a `acciones`, lote 1: `asistente/pantalla-asistente`, `compras/pantalla-gasto`,
      `compras/vista-de-la-solicitud`, `contratos/pantalla-contrato`, `documentos/pantalla-documentos`,
      `empresas/bitacora-occ-dia`, `empresas/pantalla-bitacora-occ`, `empresas/pantalla-finanzas`,
      `empresas/pantalla-laboratorio-de-obras` y `empresas/pantalla-maquinaria`. A la vista de una solicitud
      se le pone `registro`. (RF-30, RF-32)
      Hecho cuando: los tres comandos están en verde y en ninguna de las diez el botón principal queda en el
      cuerpo; cada una conserva su condición de permiso.
- [x] T22. Lote 2: `laboratorio/pantalla-ensayo`, `pantalla-informe` y `pantalla-laboratorio`; y en `panel/`,
      `pantalla-almacen`, `pantalla-asignaciones`, `pantalla-cantera`, `pantalla-obras`, `pantalla-partes`,
      `pantalla-personas` y `pantalla-preoperacionales`. Al ensayo y al informe se les pone `registro`.
      (RF-30, RF-32)
      Hecho cuando: los tres comandos están en verde y se cumple la misma condición en las diez.
- [x] T23. Lote 3: `panel/pantalla-vehiculos`, `panel/whatsapp/pantalla-bandeja`,
      `plan-semanal/pantalla-plan-semanal`, `planificacion/pantalla-cumplimiento`,
      `planificacion/pantalla-planificacion`, `reportes/pantalla-reportes`,
      `requisiciones/occ/vista-requisicion-occ`, `requisiciones/pantalla-requisiciones`,
      `rrhh/pantalla-personal` y `rrhh/vista-de-la-ficha`. A la ficha y a la vista OCC se les pone
      `registro`. (RF-30, RF-32)
      Hecho cuando: los tres comandos están en verde y se cumple la misma condición en las diez.
- [x] T24. Lote 4: `tesoreria/pantalla-compras-por-pagar`, `pantalla-cortes`, `pantalla-occ-por-pagar`,
      `pantalla-pagos`, `pantalla-tesoreria` y `vista-del-pago` (esta con `registro`), y la revisión de
      `empresas/pantalla-empresas`, `pantalla-proyectos` y `pantallas-de-aviso`, que no tienen acción. (RF-30,
      RF-32)
      Hecho cuando: los tres comandos están en verde y el residente no ve «Nueva …» en ninguna pantalla donde
      su cargo no puede crear.

### Tablas

- [x] T25. `Columna` gana `principal?` y `acciones?`. Sin marca, la principal es la primera columna y la de
      acciones es la de clave `acciones`. `Tabla` gana `tipo: 'lista' | 'cuadricula'`. Por debajo de 768 px una
      lista se pinta como tarjetas:
      - la principal arriba, en letra más grande;
      - las demás como «Título: valor»;
      - las acciones al pie, o sin pie si no hay.

      (RF-33 a RF-37, RF-41)
      Hecho cuando: los tres comandos están en verde y en el navegador, a 390 px, el personal se ve en
      tarjetas con todos sus datos y los botones al pie.
- [x] T26. Las listas miden su marco con `onLayout` y pasan a tarjetas cuando el marco es menor que el ancho
      mínimo de la tabla. Al girar o cambiar el ancho se recalcula, y la búsqueda, los filtros y el orden
      quedan como estaban. (RF-40, RF-44, RF-70, RF-73)
      Hecho cuando: los tres comandos están en verde y en el navegador, a 900 px, el personal pasa a tarjetas
      mientras vehículos (que cabe) sigue como tabla, sin perder la búsqueda escrita.
- [x] T27. En tarjetas aparece «Ordenar por», con las columnas que se pueden ordenar y su sentido. (RF-38, RF-39)
      Hecho cuando: los tres comandos están en verde y a 390 px se puede ordenar el personal por nombre y por
      cargo, y el orden se mantiene al volver a 1366 px.
- [x] T28. Por encima de 1366 px las columnas crecen en proporción a su ancho. (RF-74)
      Hecho cuando: los tres comandos están en verde y en un recuadro de 1920 px la tabla de personal llena
      sus 1600 px sin un hueco a la derecha.
- [x] T29. Revisión de tablas, lote 1 (las primeras 28 de `grep -rl "<Tabla"`): se marca `principal` donde la
      primera columna no es el dato principal (por ejemplo, una fecha) y `tipo="cuadricula"` en las que se
      editan celda por celda. Se comprueba que la granulometría y las filas del parte siguen desplazándose
      dentro de su marco. (RF-34, RF-71, RF-72)
      Hecho cuando: los tres comandos están en verde y la lista de lo marcado está en las Notas de ejecución.
- [x] T30. Revisión de tablas, lote 2 (las 28 restantes), con el mismo criterio. (RF-34, RF-71, RF-72)
      Hecho cuando: los tres comandos están en verde, lo marcado está en las Notas y a 390 px los renglones
      del almacén y el presupuesto se ven como cuadrícula.

### Aspecto: superficie, cifras y vacíos

- [x] T31. `SUPERFICIE` cambia el borde por `Sombra.tarjeta`. Las tarjetas pulsables pasan a `Sombra.elevada`
      al pasar el puntero, con la transición `Movimiento.rapido`. (RF-45, RF-46, RF-47)
      Hecho cuando: los tres comandos están en verde y en el navegador las cards de las empresas no tienen
      borde y su sombra crece al pasar el puntero.
- [x] T32. `contarPorEstado` en `usar-listado-filtrado.ts`, con su caso en la verificación (búsqueda y otro
      filtro puestos, más de una página). Además, `cifras-de-estado.tsx`: cifras con ícono, nombre y número;
      la elegida va con borde grueso y «✓»; pulsarla otra vez quita el filtro; mientras carga no muestra
      número. (RF-48 a RF-52, RF-77)
      Hecho cuando: los tres comandos están en verde y la verificación cuenta bien 25 filas de 3 estados, con
      búsqueda y paginación de 10.
- [x] T33. Cifras de estado en requisiciones, tesorería, vehículos y preoperacionales («Resultado»), en lugar
      del selector de estado. Las casillas de vencidos y anulados quedan como están. (RF-48, RF-75, RF-76)
      Hecho cuando: los tres comandos están en verde y en el navegador, en Requisiciones, pulsar «Pendiente»
      filtra y pulsarla otra vez quita el filtro.
- [x] T34. Cifras de estado en laboratorio, la bandeja de WhatsApp y personal, y el barrido en la verificación
      de que ya no queda un `Selector` «Estado» o «Resultado» en las siete listas. (RF-48, RF-75)
      Hecho cuando: los tres comandos están en verde y el barrido pasa.
- [x] T35. Vacíos en `Tabla`:
      - `vacio` acepta `{ texto, icono, accion? }`;
      - `sinResultados={{ alQuitar }}` dice «No hay resultados con estos filtros» y ofrece el botón para
        quitarlos;
      - `useListadoFiltrado` da `hayFiltros` y `limpiar`.

      Se aplica en las nueve pantallas con `BarraDeListado`. (RF-53, RF-54, RF-78)
      Hecho cuando: los tres comandos están en verde y en el navegador una búsqueda sin resultados en
      personal dice «No hay resultados con estos filtros» con su botón, distinto de la lista vacía de una obra
      nueva.
- [x] T36. En las listas donde se puede crear, el vacío lleva el botón para crear el primero, con la misma
      condición de permiso que el botón principal (las pantallas de T21 a T24 que tienen «Nuevo …»). (RF-53)
      Hecho cuando: los tres comandos están en verde y una obra sin requisiciones muestra el ícono, la frase y
      «Nueva requisición» a quien puede crearla, y solo la frase al almacenista.

### Avisos

- [x] T37. `src/features/panel/avisos.tsx`:
      - `ProveedorDeAvisos` en `marco-sesion.tsx`, encima del `Stack`, y `useAvisos()` con `exito()` y `error()`;
      - se pinta en la capa flotante, abajo y por encima del pie de una ventana;
      - el de éxito se va a los `DuracionDeAviso`;
      - el de error lleva «Cerrar»;
      - el más nuevo va encima;
      - ícono y texto, sin «Deshacer».

      (RF-56, RF-58, RF-59, RF-60, RF-82)
      Hecho cuando: los tres comandos están en verde y en el navegador dos avisos seguidos se apilan, el de
      éxito desaparece a los 4 s y el de error se queda hasta que se pulsa «Cerrar».
- [x] T38. `useListado.ejecutar(accion, { exito })` y `usar-accion-de-ventana.ts`:
      - si sale bien, aviso de éxito;
      - si falla por un campo, el error va solo en el campo, sin «Revise los campos marcados» y sin aviso;
      - cualquier otro error va al aviso;
      - en cualquier error, la ventana queda abierta con lo escrito.

      (RF-55, RF-57, RF-79, RF-80, RF-81)
      Hecho cuando: los tres comandos están en verde y en el navegador, al guardar una persona con la cédula
      repetida, el error sale debajo de la cédula con la ventana abierta; al cortar la red, sale el aviso de
      error.
- [x] T39. Los 13 usos de `Confirmado` pasan a `useAvisos().exito`, con el texto de lo que pasó: compras/vista
      de la solicitud, catálogos de cantera, almacén, cantera, obras, personas, vehículos, la vista OCC,
      requisiciones, compras por pagar, OCC por pagar, pagos y la vista del pago. Se retira `Confirmado`, y la
      verificación comprueba que nadie lo importa. (RF-55)
      Hecho cuando: los tres comandos están en verde, el barrido pasa y aprobar una requisición muestra
      «Requisición aprobada» abajo.
- [x] T40. Los `Aviso tono="error"` que se muestran después de una acción, en las ventanas que no pasan por
      `ejecutar` ni por `usar-accion-de-ventana`, pasan al aviso de error. El inventario se arma con `grep` al
      empezar la tarea. (RF-57, RF-80)
      Hecho cuando: los tres comandos están en verde y la lista de archivos migrados está en las Notas de
      ejecución.

### Cambio de contraseña y cierre

- [x] T41. El cambio de contraseña por gusto se pinta como capa encima del contenido en `marco-sesion.tsx`, sin
      desmontar el `Stack`. El obligatorio sigue sin «Cancelar». (RF-61, RF-62, RF-83)
      Hecho cuando: los tres comandos están en verde y en el navegador, al cancelar el cambio desde
      Requisiciones con una búsqueda escrita, se vuelve a Requisiciones con la búsqueda intacta.
- [x] T42. Cierre:
      - una línea «Modificada por la spec 050» en las specs 008, 022, 026, 033, 034, 035, 046 y 049;
      - en `AGENTS.md`, la regla de las columnas actualizada: si no caben, pasan a tarjetas;
      - revisión a 360 px de que la página no se desplaza a lo ancho y de que los controles miden al menos
        40 px;
      - comprobación de que ningún permiso cambió (el diff de `permisos.ts` está vacío).

      (RF-63, RF-64, RF-65, RF-66)
      Hecho cuando: los tres comandos están en verde, `npx expo export --platform web` sale sin errores y
      `git diff src/shared/rules/permisos.ts` está vacío.
- [x] T43. Validación final: recorrido RF por RF de la spec, demo manual de los criterios de finalización y
      fotos de «después» en `fotos/despues/`, a los mismos anchos que las de T1. (Todos)
      Hecho cuando: cada RF tiene su comprobación con resultado en `validacion.md`, los tres comandos están en
      verde y la spec queda marcada como Cumplida.

## Notas de ejecución

**T1 (18-nov).** 23 fotos en `fotos/antes/`, en `.jpg` (la extensión de Chrome guarda así; el nombre es
`pantalla-ancho.jpg` en vez de `.png`). Se tomaron con un recuadro de 390×844, 1366×768 y 1920×1080 dentro de la
página, reducido para caber en la ventana de Diego (1536 px), con la sesión de Gerencia y la obra Consorcio
Antioquia:
- obra: portada a 390, 1366 y 1920; menú abierto a 390 (con ☰); menú plegado a 1366;
- OCC, GeoLab y Elemental: menú abierto y plegado a 1366 (la de Elemental abre en Personal);
- requisiciones (lista con filtro de estado) a 390, 1366 y 1920; formulario «Nueva requisición de compra» a
  390 y 1366;
- contrato a 390, 1366 y 1920;
- personal de Elemental (tabla larga) a 390 y 1920, y a 1366 en la foto del menú de Elemental;
- ficha de una persona a 1366;
- lista vacía: requisiciones de «Pruebas spec 018» a 1366.

Lo que se ve de paso, sin tocarlo (cada cosa es de su tarea):
- el contrato tarda más de 6 s en cargar en el servidor de desarrollo;
- a 390 px los filtros de requisiciones ocupan toda la pantalla antes de la lista.

**T3 (18-nov).** Cada entrada lleva su `seccion` y los cuatro menús quedaron escritos en el orden de sus
secciones, con el Asistente primero. `menuPorSecciones` agrupa las entradas seguidas de una misma sección
sobre `menuDelLugar`, así que el permiso y los módulos apagados se siguen decidiendo en un solo sitio.
Hay 1067 verificaciones. Lo que conviene saber:
- Elemental usa el permiso `aprobaciones` para Requisiciones, no `solicitudes` como las demás; al reescribirlo
  se perdió y la prueba de la Auxiliar lo atrapó. Quedó escrito en un comentario.
- Se ajustaron las pruebas de la 033, la 034, la 035, la 040 y la 046 que esperaban el orden de antes.
- Efecto adelantado: como el Asistente quedó primero, `PortadaDeEmpresa` (que abre la primera entrada) ya
  lleva al Asistente en OCC, GeoLab y Elemental, y el menú plano de hoy lo muestra arriba. Es lo que piden
  RF-8 y RF-84; la T4 y la T8 lo formalizan con `portadaDelLugar`.

**T4 (18-nov).** `destinoAlEntrar` manda al Asistente a los ocho cargos del panel que no son Gerencia (con
una sola obra; con varias o ninguna, a la lista). Se añadieron `portadaDelLugar` y `portadaDelMenu`, que se
separó para poder probar RF-85 sin inventar un cargo sin Asistente. Hay 1069 verificaciones. Lo que conviene
saber:
- `rutaNueva` tenía escrito a mano que la «entrada» de la Auxiliar era Requisiciones (para las direcciones
  viejas). Se cambió al Asistente de Elemental, porque esa es su entrada desde la D12.
- Las direcciones viejas que caían en «el inicio del rol» (`rutaRenombradaPara`, `rutaNueva`) llevan ahora
  al Asistente. Se ajustaron sus pruebas de la 033, la 034, la 035, la 040, la 041 y la 046.

**T5 (18-nov).** `migasDelLugar(lugar, { obra }, registro?)` devuelve los pasos `{ titulo, ruta }`, y el
último siempre va sin ruta. Mientras llega el nombre de la obra, el primer paso dice «Obra». Una página que no
está en el menú no añade paso. `tituloDelLugar` da «Proyectos» en la portada de una obra en vez de «Resumen del
día · Proyectos», y se ajustó la prueba de la 049 (RF-43) que lo esperaba. Hay 1070 verificaciones.

**T6 (18-nov).** `menu-lateral.tsx` arma sus bloques con `menuPorSecciones`. De arriba abajo: «← Empresas»; la
marca o la obra con «Cambiar de obra» debajo; el Asistente sin título; y una sección por bloque, con su
título en `tituloGrupo`. En las tarjetas de Gerencia y en la lista de obras queda la lista de siempre. Visto en
el navegador a 1536 px, en Consorcio Antioquia (sin Calidad, porque tiene el laboratorio apagado: RF-10) y en
OCC/Vehículos. Lo que se nota de paso y no es de esta tarea: Planificación, Plan semanal y Cumplimiento usan el
ícono de la casa (`inicio`), porque no tienen uno propio en `ICONOS`.

**T7 (18-nov).** La raya entre secciones del menú plegado ya la ponía `Grupo` para cada bloque que no es el
primero. Lo nuevo es la etiqueta «Sección · Entrada» para los enlaces de una sección (`esSeccion` en el bloque),
y que se muestre con `onLongPress` y se quite al soltar. La etiqueta pasó a `width: max-content` porque, con la
sección delante, se partía en tres renglones. En el navegador, al pasar el puntero, sale «Materiales y calidad ·
Almacén» en un renglón. La pulsación larga no se pudo probar con el ratón: queda para la demo en una tableta (T43).

**T8 (18-nov).** `PortadaDeEmpresa` y `PortadaDeLaObra` redirigen con `portadaDelLugar`. En el navegador,
`/panel/proyectos/<obra>` lleva a `…/asistente` y `/panel/geolab` a `/panel/geolab/asistente`. Se retiraron:
- el componente `Portada` de `pantalla-inicio.tsx`, que queda solo como la puerta de `/panel`;
- `asistente/recuadro-del-inicio.tsx`, que solo lo usaba esa portada. Con eso 028/RF-73 (el recuadro del
  Asistente en el Inicio) se queda sin pantalla, porque el Asistente es la portada entera. Hay que anotarlo
  en la 028 en la T42.

Se quedan, sin uso en pantalla, el endpoint `/api/panel/resumen`, `api.resumen.de` y sus tipos en
`contratos.ts`: el plan dice que la API no cambia, y AGENTS.md usa `/api/panel/resumen` para comprobar un
despliegue (401 con una cookie inventada). El barrido nuevo (ningún `.tsx` dice «resumen del día», «cómo va la
obra» ni «su obra hoy») obligó a redactar los comentarios sin esas palabras. Hay 1071 verificaciones.

**T9 (18-nov).** Tres de las cuatro cosas ya estaban: la ayuda y el error debajo del recuadro (039), el
`alignItems: 'flex-start'` de `Formulario` y el `*` de los obligatorios. Lo que faltaba era la etiqueta. Ahora
`EtiquetaDeCampo` ocupa un solo renglón (`numberOfLines={1}`) de alto fijo, con el token nuevo
`CampoPanel.altoEtiqueta = 20`. En el celular se deja partir en los renglones que necesite, porque ahí va un
campo por renglón. Al ser un solo componente, cubre `Campo`, `Selector`, `CampoDeFecha`, `SelectorDeVarios` y
`CampoObservacion`. Se midió en el navegador, en «Registrar una obra»: los recuadros de Código (con ayuda),
Nombre y Municipio arrancan los tres a 308 px.

**T10 (18-nov).** En vez del contexto `PrimerError` del plan, `useIrAlPrimerError(error)` marca el elemento del
campo con `data-campo-con-error` cuando le aparece un error, y en el siguiente cuadro hace `scrollIntoView` del
primero de la página. Así nadie envuelve los formularios, el «primero» es el del orden de lectura y con cinco
errores a la vez hay un solo desplazamiento. Lo llevan `Campo`, `CampoDeFecha`, `Selector` y `SelectorDeVarios`.

La prueba se hizo en «Registrar una obra» y no en el contrato, para no arriesgar datos reales. El botón está
desactivado mientras falte un obligatorio, así que se lo llenó y se interceptó el `fetch` del alta en la
página: respondió 422 con `campos.codigo` sin llegar al servidor. Con Código a −161 px, fuera de la vista, al
pulsar «Registrar obra» la página subió y Código quedó a 381 px con su error debajo. Se comprobó que no existe
ninguna obra `PRUEBA-T10` (siguen 6). Se ve todavía el renglón «Revise los campos marcados» arriba: lo quita la
T38 (RF-79).

**T11 (18-nov).** No se hizo con la ranura más contexto del plan, porque llenarla en cada pintada hace un ciclo
de repintados, o pide un portal de `react-dom`, que el proyecto no usa. En su lugar, `Modal` da el contexto
`EnVentana` y `AccionesFormulario`, dentro de una ventana, se pega al pie con `position: sticky; bottom: 0`, con
el fondo de la ventana. Las 45 ventanas no cambian y los botones se pintan una sola vez. Se probó en el navegador
con «Nueva requisición de compra», que es más alta que la pantalla: a 1536×695 Cancelar y Enviar quedan a 593 px
con el formulario siguiendo debajo, y a 390×844 quedan a 792 px. «Nueva persona» no sirvió para la prueba,
porque es un formulario dentro de la página y no una ventana.

**T12 (18-nov).** `Formulario` gana la variante `desnudo`: los mismos anchos uniformes, sin caja blanca. Cada
renglón es una tarjeta con fondo crema y borde suave, con la cabecera «Renglón N» y Quitar, dos `Formulario
desnudo` y «Va a» a lo ancho. Los anchos salen de `ANCHOS_DE_CAMPO`, y «Qué se necesita» y «Para qué» se quedan
sin ancho, así que ocupan el largo flexible. Visto en un recuadro de 1366 px con dos renglones: los tres
recuadros de la primera fila del renglón 1 quedan a la misma altura, y Para cuándo, Para qué y Valor en la
segunda. Lo que se nota de paso y no es de esta tarea: «Para cuándo *» escribe el asterisco en el texto de la
etiqueta, porque `CampoDeFecha` no tiene `obligatorio`, y no sale en rojo como los demás (RF-18). Se arregla en
el lote de formularios (T13 a T18), dándole `obligatorio` a `CampoDeFecha`.

**T13 (18-nov).** Las filas que solo tienen campos pasaron de `<View style={estilos.fila}>` a `<Formulario
desnudo>`: 2 en pasos de gerencia, 5 en las ventanas OCC y 2 en la planilla OCC. Las listas de campos sueltos de
cadena-y-decision (cantidades a recortar y valores que faltan) quedaron en rejilla. Así los `ancho` de cada campo
caen en la escala de tres medidas. Se dejaron como estaban:
- las filas mixtas: texto con un campo, adjunto con botón, soporte con clase y Quitar;
- `campo-de-imputacion`, que ya apila sus dos campos en una columna;
- los `minWidth` que quedan (`nombreDeRenglon`, `paso`), que son de un texto y de un paso de la cadena, no de algo
  alrededor de un campo.

Lo de RF-18 anotado en la T12 ya se hizo: `CampoDeFecha` gana `obligatorio`, y se quitaron los «*» escritos a mano
de «Para cuándo», «Fecha de solicitud» y «Viernes de entrega» en estos archivos y en la requisición. Los de otros
archivos los barre la T18. No se revisó en el navegador, porque las ventanas OCC piden una requisición de OCC
abierta: queda para la demo de la T43.

**T14 (18-nov).** Las tres ventanas de estos archivos tenían los campos uno debajo de otro y a todo lo ancho, y
las dos fechas de la póliza iban en una fila hecha a mano. Ahora sus campos van en `Formulario desnudo`: la póliza
(amparo, aseguradora, número, valor y vigencia), el documento del contrato y la subida de documentos. El selector
de obra de la cabecera del contrato es un solo campo, `acciones-presupuesto` tiene uno solo de varias líneas, y
el formulario del contrato (`pestana-contrato`) ya usaba `Formulario`; se dejaron los tres. Visto en el navegador:
- «Subir documento» de OCC: Nombre junto a Fecha, Vence junto a Proveedor y Descripción a lo ancho, alineados;
- el contrato de Consorcio Antioquia, alineado.

La ventana de pólizas no se pudo abrir, porque esa obra no tiene contrato registrado: queda para la T43. Lo que se
nota de paso y no es de esta tarea: `pantalla-contrato` y `polizas-y-documentos` escriben `gap: 12` y `gap: 6` a mano
en sus estilos, en lugar de los tokens de `Spacing`.

**T15 (18-nov).** Pasaron a `Formulario desnudo`:
- la ventana «Ajustar renglón» del Almacén: el material, su nombre y su unidad en una rejilla, y factor, cantidad,
  valor unitario y «Por cada» en otra, en lugar de las dos filas hechas a mano. Los anchos (240, 200, 200 y 160)
  pasaron a la escala (`ANCHOS_DE_CAMPO.medio` y `.corto`), y los `gap: 12`, `2` y `4` del archivo a los tokens de
  `Spacing`;
- los filtros de la Bitácora de maquinaria y de la Bitácora de Geolab (obra, desde y hasta), que iban dentro de
  `Acciones`, el grupo de botones;
- el motivo de anulación del preoperacional, sin el `ancho={420}`: ahora ocupa el largo flexible.

En los filtros de `pantalla-preoperacionales` se quitó el `View` sin estilo que envolvía «Filtrar por máquina»,
que le había quedado de cuando llevaba `zIndex`. También se corrigieron los comentarios de `dias` y `fecha`, que
seguían hablando de ese `zIndex`. La fila del periodo es mixta (selector o botones, con el rango escrito al lado)
y se dejó como estaba, con el mismo criterio de la T13. `fotos-del-dia` no cambió: su ventana tiene un solo campo
a lo ancho, y el `width: 200` es la tarjeta de la miniatura, no algo alrededor de un campo. Tampoco son campos los
`width: 240` de `detalle-preoperacional`, que son de las imágenes. Hay 1071 verificaciones. No se revisó en el
navegador: la condición de la tarea es estática, y la demo de la T43 recorre estas pantallas.

**T16 (18-nov).** Pasaron a `Formulario desnudo`:
- los filtros de cuatro pestañas de la bandeja, que iban dentro de `Acciones`, el grupo de botones: Estado del
  día, No se pudo guardar, Creado automáticamente e Historial (`pantalla-bandeja`). Son obra, estado, origen,
  desde y hasta, con los anchos en `ANCHOS_DE_CAMPO.medio`;
- el selector de obra de Reportes esperados, que también iba en `Acciones`;
- las dos ventanas «Completar», la de la obra (`no-se-pudo-guardar`) y la de la empresa (`completar-de-empresa`).
  Usaban `FilaDeFormulario`, que es la fila de la bitácora, con su relleno de 16 y su línea. En la de la obra,
  «Día del reporte» entra en la misma rejilla que los campos del renglón. Los anchos de `CamposDelRenglon` se
  dejaron escritos: dentro de la rejilla, `anchoUniforme` los lleva a la escala.

Se dejaron como estaban:
- las filas de la lista de Reportes esperados, que son mixtas (dos selectores con Quitar), con el criterio de
  la T13;
- «Es el mismo que…», con un solo selector;
- el selector «Asociar a» de la tabla de grupos, que es una celda y no un formulario;
- `filtro-de-fechas`, que devuelve sus dos fechas sueltas y no tiene envoltorio, así que toma la rejilla de quien
  lo usa.

Ninguno de los siete tiene ya un `View` con `width` numérico alrededor de un campo. El `width: 120` de
`no-se-pudo-guardar` es la miniatura de una foto. Hay 1071 verificaciones. No se revisó en el navegador: queda
para la demo de la T43.

**T17 (18-nov).** Pasaron a `Formulario desnudo`:
- la ventana «Agregar / Ajustar actividad» del plan semanal, en cinco rejillas: tipo e ítem; frente, ítem, actividad
  y unidad; cuadrilla y equipo; la meta; y los días. Antes eran tres filas hechas a mano y dos selectores sueltos.
  Actividad, cuadrilla, equipo y el ítem de la planificación (que tenían 360 y 640) quedan con el largo flexible. Lo
  demás tiene los anchos de la escala, y el `gap: 12` va en tokens;
- «Crear la planificación desde el presupuesto»: plazo y arranque lado a lado, y los dos selectores sin sus 600;
- los indirectos del borrador: los factores, la descripción y la forma del renglón, y las cifras de cada forma. Eran
  tres `View` de fila. Los anchos van en la escala, y la descripción (420) en el largo flexible. `CampoCifra` no se
  tocó;
- la fila de volquetas (requeridas, propias y externas) al pie del control de volquetas;
- la lista «Escoja el frente del presupuesto» de Subir planificación, sin los 600.

Se dejaron como estaban:
- los renglones de las secciones del plan semanal (`Renglones`), que son mixtos: campos con «Quitar» al lado, y
  medidos para caber en un renglón (el comentario de la maquinaria hace la suma);
- los dos selectores de hojas de Subir planificación, que son campos sueltos con una nota en medio;
- los motivos de anular en `acciones-plan-semanal` y `acciones-planificacion`, y el selector de `armar-plan-semanal`,
  que tienen un solo campo;
- la fila del periodo de Cumplimiento, que mezcla botones, el texto del periodo y la fecha;
- las cuadrículas `editor-planificacion`, `meses-del-renglon` y `campo-cifra`, como pide la tarea.

Ninguno de los nueve tiene un `View` con `width` numérico alrededor de un campo. Hay 1071 verificaciones. Lo que se
nota de paso y no es de esta tarea: el «Quitar» de los renglones del plan baja `paddingTop: 22` para ponerse a la
altura de las cajas, pero desde la T9 la etiqueta mide 20 (`CampoPanel.altoEtiqueta`) más su separación, y ese 22
está escrito a mano. Conviene revisarlo en la demo de la T43.

**T18 (18-nov).** Pasaron a `Formulario desnudo`:
- la solicitud y requisición de pago (`formulario-de-pago`): beneficiario y documento en una rejilla, concepto y
  valor en otra. Beneficiario queda con el largo flexible. «Para cuándo» pasa a `obligatorio`, sin el «*» escrito a
  mano: era el último que quedaba en el código. La fecha con la casilla «Es urgente» es una fila mixta y se queda;
- «Registrar un pago» (valor, fecha, medio y referencia), antes en dos filas a mano, y «Anular un pago» (pago y
  motivo);
- el uso del Asistente: el periodo, el límite de todos y el de una persona. Eran filas alineadas por abajo, y con
  esa alineación un recuadro con error subía.

Se dejaron como estaban:
- los filtros de `pantalla-tesoreria` y `rrhh/pantalla-personal`, que van dentro de `BarraDeListado`, el
  componente común. Ahí no hay fila hecha a mano. Las cifras de estado de la T33 y la T34 vuelven sobre esos
  filtros;
- en `pantalla-reportes`, la fila del periodo, que es mixta, y el selector de obra, que es un solo campo;
- `pantalla-cambiar-clave` y `pantalla-ingreso`, que tienen sus campos en una columna a lo ancho de la tarjeta de
  acceso, uno por renglón;
- `secciones-con-indice`, con un solo selector en el celular.

**El barrido.** Así como lo escribió el plan («ningún `View` con `width` numérico alrededor de un campo»), el
barrido no encontraba nada ni en la versión de antes de la 050: no había ningún caso. Lo que descuadraba eran las
filas hechas a mano (`flexDirection: 'row'`) que solo tienen campos, y de esas había 32 antes de la T13. La
prueba `050/RF-25` busca las dos cosas: el ancho fijo y la fila de solo campos. Una fila mixta (con un texto, un
botón, una casilla u otra caja) no se cuenta. Para saber que la prueba sirve, se puso un archivo de prueba con una
fila de dos `Campo`, la verificación falló nombrándolo, y después se borró. Encontró dos casos que el inventario
no tenía:
- `almacen-obra/revisar-importacion.tsx`: el encabezado del documento (proveedor, tipo, número, fecha y entregado
  por). Pasó a `Formulario desnudo` con los anchos de la escala;
- `panel/editor-horario.tsx`: los dos `SelectorDeHora` de cada tramo. Es la cuadrícula del horario, día por tramo,
  así que quedó fuera del barrido como cuadrícula (D5), junto a las tres de la planificación.

Hay 1072 verificaciones. No se revisó en el navegador: queda para la demo de la T43, junto con los lotes de la T15
a la T17.

**T19 (18-nov).** `MarcoPantalla` gana dos props:
- `acciones`: a la derecha del título y, por debajo de 768 px, debajo y a lo ancho (`accionesAngosto`). El texto
  del encabezado conserva su tope de 720;
- `registro`: el tercer paso de la ruta.

La ruta la pinta `panel/migas.tsx`, con `migasDelLugar`:
- el último paso va en negrita y sin enlace (`aria-current`);
- los anteriores son `Link`;
- cada paso llega como mucho a `AnchoMaximoDeMiga = 280`, un token nuevo en `medidas.ts`, y se recorta con «…».

Para saber si un paso se recortó, se compara el ancho de una copia invisible del texto (`max-content`) con lo
que ocupa a la vista. Solo si se recortó, el nombre completo sale en una etiqueta oscura al pasar el puntero o al
mantenerlo pulsado (RF-69).

**Fuera del plan.** El plan decía sacar el nombre de la obra con `obra-en-uso`, pero eso devuelve `null` a quien
ve todas las obras (Gerencia, el Director de Proyectos). Para ellos, el nombre sale de pedir la lista de obras
(`useObraDelLugar`), y ya lo pedían por separado el menú y `PaginaDeObra`; con el encabezado habrían sido tres
peticiones iguales por pantalla. Ahora se calcula una vez en el layout (`ProveedorObraDelLugar`, en
`empresas/contexto-empresa`), y los tres lo leen del contexto en `panel/obra-del-lugar.ts`. Ese archivo va aparte
para que `marco.tsx` lo lea sin un import circular. En el navegador, al recargar una página de obra,
`/api/panel/obras` se pide una vez.

Visto en el navegador (sesión de Diego, Gerencia, a 1536 px):
- Documentos de OCC dice «OCC › Documentos» arriba del título, y pulsar «OCC» lleva a `/panel/occ/asistente`,
  que dice «OCC › Asistente»;
- en una obra: «PRUEBA-043-C primera aprobación › Documentos».

Ningún nombre de obra de desarrollo pasa de 280 px, así que el recorte y su etiqueta no se pudieron ver: quedan
para la T43. Tampoco hay todavía ninguna pantalla con `acciones`, porque empiezan en la T21. Hay 1073
verificaciones; la nueva vigila que el marco pinte las migas con la regla y que el layout tenga el proveedor.

**T20 (18-nov).** `MarcoPantalla` gana `ancho: 'listado' | 'formulario'`, con `listado` por defecto. Los topes son
`AnchoListado` (1600) y `AnchoFormulario` (1100), en lugar del `MaxContentWidthPanel` de antes. Llevan `formulario`
el contrato, la ficha de persona, la vista de una solicitud, la vista de un pago y el informe de laboratorio, en
todos sus `MarcoPantalla`, también el de carga y error. `MaxContentWidthPanel` se queda en `medidas.ts`, porque las
columnas siguen calibradas contra él (AGENTS.md).

Medido en un recuadro de 1920×1080, con la sesión de Gerencia:
- `/panel/elemental/recursos-humanos`: 1600 px;
- la ficha de una persona (`?persona=…`): 1100 px.

Hay 1074 verificaciones. Lo que se ve de paso: la ruta de la ficha todavía dice «Elemental … › Recursos Humanos»,
sin el nombre de la persona. Ese tercer paso lo pone la T23 con `registro`.

**T21 (18-nov).** Pasaron al encabezado:
- **Documentos:** «Subir documento», solo si el cargo puede escribir documentos (la misma condición de antes).
  La ventana sigue siendo de `CarpetaDeDocumentos`, que gana la prop `subida` para que la abra quien la monta y
  no pinte su propio botón. En la ficha, la solicitud y el pago la carpeta no la recibe y queda como estaba,
  porque ahí subir es secundario;
- **vista de una solicitud:** Corregir, Recibir, los botones de decisión, las acciones extra y Cancelar, cada uno
  con su condición (`pasos`, a quién le toca decidir). «Volver» se queda en el cuerpo. Gana
  `registro={s.codigo}`;
- **día de la bitácora de OCC:** «Cerrar el día» (si no está cerrada) y «Anular». «Volver» y la etiqueta del
  estado se quedan en el cuerpo.

Sin acción principal, y por eso sin cambios: el Asistente («Nueva conversación» es de la columna de
conversaciones, no de la pantalla), Gasto, Laboratorio de las obras, Maquinaria, Finanzas («Registrar un corte» es
una sección con su formulario), Bitácora de OCC (pestañas y lista) y el contrato (pestañas Contrato/Presupuesto,
que son navegación).

De paso, en dos archivos de esta tarea había filtros dentro de `Acciones`, el grupo de botones: las fechas de la
Bitácora de OCC y Equipo/Quedó en el día. Pasaron a `Formulario desnudo`. El barrido de RF-25 no los veía, porque
`Acciones` no es un `View`, así que ahora también busca un `<Acciones>` con solo campos. Fuera de estos dos, solo
encontró `seccion-llantas`, que es mixto (un campo con dos botones). La prueba de la T20 se ajustó para aceptar
`ancho="formulario"` en otra línea.

Visto en el navegador: «Subir documento» a la derecha del título en Documentos, y al pulsarlo abre la ventana
(se cerró con Cancelar, sin subir nada). Hay 1075 verificaciones.

**T22 (18-nov).** Pasaron al encabezado:
- **Laboratorio:** «Nuevo ensayo», solo para quien registra y en la pestaña de granulometrías. Si falta escoger la
  obra, el botón queda desactivado y en el cuerpo sale una ayuda que lo explica;
- **Ensayo:** «Informe para imprimir», con `registro` = número de informe. Registrar, enviar, aprobar y devolver se
  quedan en el cuerpo (`AccionesDelEnsayo`), porque dependen de lo que está sin guardar en el formulario;
- **Informe:** «Imprimir o guardar PDF», con `registro`. «Volver al ensayo» se queda en el cuerpo;
- **Partes (Bitácora diaria):** «Abrir la bitácora de este día», mientras el día no tiene bitácora y no está
  cargando. En el cuerpo queda «Este día todavía no tiene bitácora. Se abre con el botón de arriba.»;
- **Control Cantera:** «Registrar viaje», solo con permiso de escritura en la cantera y con obra. Las opciones del
  formulario y la ventana subieron de `SeccionViajes` a la pantalla. Mientras la ventana está abierta no se
  muestra el mensaje del viaje anterior, que es lo que antes hacía el botón al limpiarlo.

Sin cambios, porque su alta es un formulario en su propia sección y no un botón: Almacén («Registrar un material»
e Importar documento), Asignaciones, Obras y Personas. Preoperacionales no tiene acción de crear; sus botones son
para moverse de día.

Lo que hay que saber:
- `/panel/laboratorio/[id]` y su informe no caen en ningún lugar del panel (`lugarDeLaRuta` da `null`), así que
  no tienen ruta arriba y el `registro` todavía no se ve. Queda puesto para cuando se muevan dentro de un lugar;
- `/panel/proyectos/<obra>/laboratorio` es una dirección vieja: la página de la obra se llama `calidad`.

Visto en el navegador: en una obra sin bitácora del día, el botón sale a la derecha del título. Hay 1076
verificaciones.

**T23 (18-nov).** Pasaron al encabezado:
- **Requisiciones:** «Nueva requisición de compra» y «de pago» (donde se puede pedir) y «Nueva requisición de
  pagos» con «Importar planilla» (en OCC), con las mismas condiciones de antes (`sePuedePedir`,
  `sePuedePedirOcc`);
- **vista de una requisición OCC:** Agregar línea, Importar planilla, Enviar, Autorizar, Devolver, Descargar
  Excel y Cancelar, cada uno con su `r.puede`. «Volver» se queda en el cuerpo. Gana `registro={r.codigo}`;
- **Reportes:** Descargar Excel e Imprimir, cuando hay obra;
- **Cumplimiento:** Descargar Excel y PDF;
- **ficha de una persona:** `registro` con su nombre. «Guardar ficha» y «Retirar» se quedan al pie, porque son
  del formulario.

**Sin mover, y por qué:**
- **Plan semanal y Planificación.** Sus acciones (Proponer con IA, Subir Excel, Empezar en blanco, Crear desde
  el presupuesto, Subir Excel de planificación) viven en `ArmarPlanSemanal`, `CrearDesdePresupuesto` y
  `SubirPlanificacion`. Estos pintan, junto al botón, los avisos de progreso («La IA está proponiendo…»,
  «Leyendo el Excel…») y los errores, todo con el mismo estado. Para llevar el botón al encabezado habría que
  partir cada flujo en dos y pasar su estado a la pantalla, que es reescribirlos. **Hay que preguntarle a Diego**
  si vale la pena; mientras tanto quedan arriba del cuerpo, que es donde estaban;
- **Vehículos:** su alta es la sección «Registrar un vehículo», con su formulario;
- **Bandeja de WhatsApp:** pestañas y filtros, sin acción de crear;
- **Personal:** casillas de filtro, sin acción de crear.

Visto en el navegador: la ficha dice «Elemental Ingeniería y Arquitectura › Recursos Humanos › Administradora
(prueba 046)». Lo que se ve de paso: las pestañas de Recursos Humanos (Personal, Accesos y contraseñas, Obras) van
fuera del `MarcoPantalla`, pegadas a la izquierda, y la ficha de 1100 queda centrada, así que no se alinean. Queda
para la revisión de la T43. Hay 1077 verificaciones.

**T24 (18-nov).** La vista de un pago lleva arriba Corregir, decidir, las acciones extra y Cancelar, cada uno con
su condición, y gana `registro={s.codigo}`. «Volver» se queda en el cuerpo. Compras por pagar, Cortes, OCC por
pagar y Pagos solo tienen botones de fila (Pagar, Ver, Abrir, Anular), y Tesorería tiene pestañas y una casilla:
ninguna tiene acción principal. Empresas, Proyectos y las pantallas de aviso no tienen acción, como decía la tarea.

La verificación nueva busca en todo `src/features` un `acciones={<Boton titulo="Nueva…|Registrar…|Subir…"` puesto
sin ninguna condición delante, y no encuentra ninguno: todos van detrás de su permiso (RF-32). Lo que pide la
tarea, que el residente no vea «Nueva…» donde no puede crear, necesita entrar con una cuenta de residente, y en
esta sesión solo hay la de Gerencia. Queda para la demo de la T43. Hay 1078 verificaciones.

**T25 (18-nov).** El reparto de una fila en su tarjeta es una función pura, `partesDeLaTarjeta`, en
`panel/columnas.ts`, con su prueba (se escribió primero y falló). Sin marcas, lo principal es la primera columna
que no es de botones, y los botones son la columna `acciones`. `Columna` gana `principal` y `acciones` para los
casos que no siguen esa forma.

`Tabla` gana `tipo: 'lista' | 'cuadricula'`, con `lista` por defecto. Por debajo de 768 px, una lista se pinta con
`Tarjetas`:
- arriba, el dato principal;
- después, cada dato como «Título: valor»; una columna sin título solo muestra su valor;
- al pie, separados por una línea, los botones, y solo si alguno pinta algo (RF-37).

La letra más grande del dato principal la pone la propia `Celda`, que lee el contexto `EnPrincipalDeTarjeta`;
así ninguna pantalla tiene que escribir otra vista. Las cuadrículas siguen como tabla. Todavía nadie las marca:
eso es de la T29 y la T30.

Visto en un recuadro de 390×844 en `/panel/elemental/recursos-humanos`: cada persona en su tarjeta, con el nombre
y el usuario arriba, y Cargo, Empresa, Obra, Estado, Contrato, Salario y Avisos con su título. «Ficha» va al pie.
Hay 1079 verificaciones.

**T26 (18-nov).** La decisión es una función pura, `seMuestraEnTarjetas`, en `panel/columnas.ts`, con su prueba:
- una lista va en tarjetas en el celular, y desde 768 px cuando el marco medido es menor que la tabla con todas
  sus columnas encogidas;
- una cuadrícula nunca va en tarjetas;
- antes de medir (marco 0) se supone que cabe, para que en el escritorio no haya un parpadeo.

`Tabla` mide su marco con `onLayout` en una caja exterior, y la tabla de siempre pasó a `TablaConColumnas`. La
búsqueda, los filtros y el orden son de la pantalla, así que pasar a tarjetas y volver no los toca.

Medido en un recuadro, con la sesión de Gerencia:
- **a 900 px**, Vehículos también pasa a tarjetas. Su marco mide 765 y su tabla encogida necesita unos 833
  (0,65 × 900 de columnas + 120 de botones + separaciones): **no cabe**, y antes se desplazaba de lado. La
  condición de la tarea suponía que a 900 cabía, y no es así; lo que dice RF-70 se cumple igual;
- **a 1100 px**, que es la prueba equivalente: Vehículos sigue como tabla y el personal va en tarjetas;
- **la búsqueda:** se escribió «prueba» con el personal a 1600 (tabla), se pasó a 900 (tarjetas) y se volvió a 1600
  (tabla), y siguió escrita y aplicada.

Hay 1080 verificaciones.

**T27 (18-nov).** Cuando una lista se ve en tarjetas y la pantalla ordena (`orden` y `alOrdenar`), arriba de las
tarjetas sale «Ordenar por», con cada columna que se puede ordenar en sus dos sentidos («Cargo, de la A a la Z»).
Las pantallas solo saben ordenar por pulsación (`ordenTrasPulsar`, con el orden guardado en el navegador), así que
el selector hace las pulsaciones que hacen falta, según `pulsacionesPara` en `ordenar.ts`: a otra columna, una
para A→Z y dos para Z→A; a la misma, cero o una. Su prueba recorre los cuatro casos con `ordenTrasPulsar`. El orden
sigue siendo el de la pantalla, y por eso se conserva al volver a la tabla (RF-38).

Hoy solo ordena «Accesos y contraseñas» (`pantalla-personas`); la lista de Recursos Humanos no ordena. Visto en un
recuadro de 390 px en `?pestana=personas`:
- se escogió «Cargo, de la A a la Z» y cambió el orden; al pasar a 1366 px, la tabla mostraba «Cargo ▲»;
- de vuelta a 390, «Nombre completo, de la Z a la A» (dos pulsaciones) dejó Yobani, Yerson, Vicente, Topógrafo…;
- se dejó otra vez en «Nombre completo, de la A a la Z», que es como estaba guardado en el navegador de Diego.

Lo que se ve de paso: en esa lista la primera columna es Usuario, así que la tarjeta lleva arriba
«prueba046.administradora» y no el nombre. Es de la revisión de la T29/T30 (marcar `principal` en «Nombre
completo»). Hay 1081 verificaciones.

**T28 (18-nov).** `crecimientoDeColumna(ancho, ventana)`, en `columnas.ts` y con su prueba, da `flexGrow` 0 hasta
`AnchoCrecenColumnas = 1366`, un token nuevo en `medidas.ts`. Por encima da el ancho de la columna, así que cada
una crece en proporción a lo que mide. `estiloDeColumna` lo usa para la cabecera y para las celdas, con el ancho
de la ventana (`useWindowDimensions` en `TablaConColumnas`), y su comentario se actualizó: antes decía que una
columna nunca crece.

Medido en un recuadro de 1920 px en Recursos Humanos: la cabecera mide 1598 px, como su marco, y la última columna
termina a 16 px del borde, que es el relleno de la tabla, sin hueco. Las columnas pasaron a 233, 155, 107, 165,
126, 165, 126, 252 y 110. A 1366 la comparación no aplica, porque esa lista no cabe con el menú abierto y va en
tarjetas (T26). Hay 1082 verificaciones.

**T29 (18-nov).** Lote 1: los 28 primeros archivos de `grep -rl "<Tabla" src` en orden alfabético, de
`almacen-obra/revisar-importacion` a `panel/seccion-llantas`. Las marcas se pusieron con un guion de una sola vez y
se revisaron en el diff:
- **`principal`** (la primera columna no es lo que identifica la fila):
  - vista de una solicitud: renglones, recibos e historia → «Qué»;
  - documentos del contrato → Documento;
  - trabajos del día de OCC → Equipo;
  - laboratorio de las obras y ensayos de obra → Ensayo;
  - bitácora de maquinaria → Equipo;
  - historial del almacén → Tipo;
  - viajes y cantera del parte → Volqueta;
  - Accesos y contraseñas → Nombre completo (lo que se vio en la T27);
  - preoperacionales → Vehículo;
  - obras → Nombre.
- **`acciones`** (botones con otra clave, que en tarjetas caían en medio): las cuatro de `accion` del día de OCC,
  `anular` de Finanzas, `abrir` de ensayos de obra y del laboratorio, y `estado` (Anular o Anulado) del historial
  del almacén y de los viajes.
- **`tipo="cuadricula"`** (RF-71): los renglones de la importación del almacén, y los ítems y los rubros del
  presupuesto (tres tablas).

Se dejan como estaban:
- las que empiezan por una fecha que sí es la fila (los días de la bitácora de OCC, los cortes de Finanzas);
- las que ya empiezan por su nombre.

La granulometría (`pantalla-ensayo`) y las filas de maquinaria del parte no usan `Tabla` (son su cuadrícula propia y
`FilaDeFormulario`), así que este cambio no las toca y siguen desplazándose como antes. El control de calidad del
parte no se edita en la tabla y se queda como lista. Hay 1083 verificaciones; la nueva vigila las cuadrículas de
RF-71.

**T30 (18-nov).** Lote 2: los 28 archivos restantes, de `panel/whatsapp/creado-automaticamente` a
`tesoreria/vista-del-pago`.
- **`principal`:**
  - creado automáticamente y «no se pudo guardar» → «Qué»;
  - historial de la bandeja → Resumen;
  - cumplimiento → Descripción, y las actividades fuera de la planificación → Actividad;
  - historial de mantenimiento → Máquina;
  - avance de obra y otras actividades del reporte → Actividad;
  - líneas de la requisición OCC → Beneficiario; sus pagos → Valor; su historia → «Qué»;
  - tabla de planificación de una requisición → «Va a»;
  - historial de la ficha → Campos;
  - pagos → Origen;
  - pagos de una solicitud → Valor, y su historia → «Qué».
- **`acciones`:** `abrir` y `accion` de la bandeja; `anular` del mantenimiento y de los pagos OCC; `detalle` de
  máquinas, personal y avance; `ver` de los ensayos que no cumplen; las dos `abrir` de requisiciones; `ficha` de
  Recursos Humanos; `pagar` de compras y OCC por pagar; `ver` de cortes; `accion` de pagos; `abrir` de Tesorería.
- **`tipo="cuadricula"`:** el editor del plan semanal y las dos tablas del editor de la planificación (el
  cronograma). La prueba de RF-71 cubre ahora cinco archivos.

Se dejan como lista los resúmenes de la planificación y del cumplimiento, y los indirectos del borrador: se leen
renglón por renglón y no se editan en la celda.

Visto en un recuadro de 390 px, en el contrato de Consorcio Antioquia → Presupuesto:
- las versiones van en tarjetas;
- los rubros siguen como cuadrícula, con su cabecera (Rubro, Und.) y su barra de desplazamiento dentro del marco.

Los renglones de la importación del almacén solo existen mientras se revisa un documento importado, y para verlos
habría que importar uno en los datos de desarrollo. Su marca la vigila la verificación, y la vista queda para la
T43. El servidor de desarrollo tardaba unos 15 s por página durante la prueba. Hay 1083 verificaciones.

**T31 (18-nov).** `SUPERFICIE`, que usan las tablas, las secciones, las cifras y las tarjetas de una fila, deja el
borde fino y lleva `Sombra.tarjeta`. Su comentario explica por qué. La tarjeta de empresa de Gerencia, que es la
pulsable, cambia igual:
- en reposo, `Sombra.tarjeta` sin borde;
- al pasar el puntero, `Sombra.elevada`, con transición de `box-shadow` en `Movimiento.rapido`. Antes cambiaba el
  color del borde y del fondo;
- con el foco del teclado, el anillo se suma a la sombra elevada en vez de reemplazarla.

No hay colores nuevos (RF-45). Medido en el navegador en `/panel`: las cuatro tarjetas tienen borde de 0 px. OCC,
con el puntero encima, tiene `0 4px 12px` (elevada), y Geolab, sin él, la sombra de tarjeta. Los recuadros de los
campos, los botones y la caja punteada del vacío conservan su borde, porque no son tarjetas. Hay 1084
verificaciones.

**T32 (18-nov).** `contarPorEstado` y `coincideConBusqueda` viven en `panel/contar-por-estado.ts`, un módulo sin
React ni Expo, y `usar-listado-filtrado` los reexporta. El plan los ponía dentro de `usar-listado-filtrado`, pero
ese archivo importa `expo-router` y la verificación, que corre en Node, no podría probarlos ahí. La búsqueda de
`useListadoFiltrado` pasó a usar la misma `coincideConBusqueda`, para que la lista y sus cifras no busquen de dos
formas distintas.

La prueba se escribió primero y falló. Usa 25 filas de 3 estados en dos obras:
- sin filtros cuenta 9 + 8 + 8;
- con búsqueda «VOLQUÉTA» (con tilde y en mayúsculas) y el filtro de obra A cuenta 3 + 2 + 3 = 8, el total de
  la lista entera filtrada y no el de una página de 10.

`cifras-de-estado.tsx` pinta una tarjeta pulsable por estado con su símbolo, su nombre y su número:
- la elegida lleva borde grueso (`Grosor.marca`, color foco) y «✓» delante del nombre;
- las demás llevan el mismo borde transparente, para que nada salte de sitio al elegir;
- pulsar la elegida quita el filtro;
- mientras carga dice «…» y no un número.

Todavía no lo usa ninguna lista: eso es de la T33 y la T34. Hay 1086 verificaciones.

**T33 (18-nov).** Las cifras reemplazan al selector de estado en cuatro listas:
- **Requisiciones:** los estados de compra y de pago juntos. Cuentan con la misma regla de la lista
  (`pasaLosFiltrosDeRequisicion`) y todos sus filtros, menos el estado;
- **Tesorería:** los siete estados de pago, con lugar, urgentes y fechas;
- **Vehículos:** los cuatro estados de la flota, con la obra elegida;
- **Preoperacionales:** No apto, Apto con observaciones y Apto (lo que antes era «Resultado»). Los que todavía
  no tienen resultado se cuentan aparte, sin cifra, igual que antes no tenían opción.

Requisiciones y Tesorería comparten los símbolos y los tonos de sus estados en `estadosDelTramite`
(`cifras-de-estado.tsx`). Para que la lista y sus cifras busquen igual, el texto de búsqueda de Vehículos y de
Preoperacionales pasó a una función (`textoDelVehiculo`, `textoDelPreoperacional`). Las casillas (Solo urgentes)
quedan como están (RF-76).

Visto en el navegador, en `/panel/elemental/requisiciones`: las cifras suman los 24 registros. No existe un estado
«Pendiente» como dice la tarea; el equivalente es «Enviada» (10). Al pulsarla queda marcada con borde y «✓» y la
lista dice «10 de 24»; al pulsarla otra vez se quita la marca y vuelven los 24. Hay 1087 verificaciones.

**T34 (18-nov).** Las cifras reemplazan al selector en las tres listas que faltaban:
- **Laboratorio:** los cinco estados de un ensayo. Cuentan con `filtrarEnsayos` y los demás filtros (material,
  franja, veredicto), sin el estado. El selector «Veredicto» se queda, porque RF-48 habla del estado;
- **Recursos Humanos:** los cinco estados laborales más «Inactivo (sin acceso)». Las retiradas cuentan aunque la
  casilla «Ver retiradas» esté sin marcar, porque pulsar «Retirado» las muestra igual;
- **Bandeja de WhatsApp (Historial):** los seis estados de un mensaje.

**La Bandeja cambió cómo pide sus datos.** El servidor da un solo estado por petición
(`/whatsapp/propuestas?estado=`) y no hay «todos». Para contarlos sin cambiar la API, como dice el plan, ahora se
piden los seis a la vez, con los mismos filtros, y el estado se filtra en el navegador. Al abrir sigue elegido
«Guardados», como antes; pulsarlo otra vez muestra todos. Cambiar de cifra ya no vuelve a pedir nada, pero cada
carga son seis peticiones. Si la bandeja crece mucho, lo indicado es que el servidor devuelva los conteos.

El barrido de la verificación confirma que en las siete listas hay `CifrasDeEstado` y ningún selector «Estado» o
«Resultado». Visto en el navegador:
- Bandeja de OCC: se pidieron los seis estados, y salen las seis cifras (todas en 0 la última semana);
- Recursos Humanos: 75 activos y 2 inactivos, que suman los 77 registros.

Hay 1088 verificaciones.

**T35 (18-nov).**
- `Tabla.vacio` acepta, además del texto, `VacioDeLista { texto, icono, accion }`.
- `Tabla.sinResultados = { alQuitar }` pinta «⌕ No hay resultados con estos filtros.» con «Quitar los filtros».
- `useListadoFiltrado` gana un sexto parámetro, `filtrosDeLaPantalla { hay, limpiar }`, porque el listado no conoce
  los filtros propios de cada pantalla. Devuelve `hayFiltros`, `limpiar` (búsqueda más filtros) y `sinResultados`,
  que solo existe si hay registros y ninguno pasa.
- `BarraDeListado` gana `onLimpiar`: su botón «Limpiar» antes solo borraba la búsqueda y dejaba puestos los
  filtros.

Conectado en las nueve pantallas con barra: Documentos, Almacén, Accesos y contraseñas, Preoperacionales,
Vehículos, Recursos Humanos, Compras por pagar (solo búsqueda), Tesorería y Requisiciones. Requisiciones filtra
por su cuenta, así que ahí `sinResultados` y `onLimpiar` vuelven a `SIN_FILTROS`. En Recursos Humanos, «quitar los
filtros» deja «Ver retiradas» sin marcar, que es como abre la pantalla.

Visto en el navegador en `/panel/elemental/recursos-humanos?buscar=zzzqqq`: «0 de 77» y «No hay resultados con
estos filtros», con su botón. Al pulsarlo volvieron los 77 y la búsqueda salió de la dirección. La lista vacía de
verdad sigue con su frase («Todavía no hay documentos aquí…»). Hay 1089 verificaciones.

**T36 (18-nov).** El vacío de cinco listas lleva ícono, frase y el botón para crear el primero, con la condición
de su botón del encabezado:
- Documentos: «Subir documento» (`puedeSubir && pedido`). Abre la ventana igual que el encabezado: por `subida`,
  o por la ventana propia de la carpeta;
- Requisiciones: «Nueva requisición de compra» (`pedido && sePuedePedir`). En la bandeja de Elemental, «No hay
  requisiciones esperando el último paso», con ✓ y sin botón;
- requisiciones de pagos de OCC: «Nueva requisición de pagos» (`sePuedePedirOcc`);
- Laboratorio: «Nuevo ensayo» (`puedeRegistrar`, desactivado si falta la obra);
- viajes de Cantera: «Registrar viaje» (`puedeRegistrar`). `ListadoDeViajes` gana `registrarPrimero`, y
  `SeccionViajes` vuelve a recibir `puedeRegistrar`.

Las frases que decían «use el botón de arriba» se acortaron, porque ahora el botón está ahí mismo.

Visto en el navegador como Gerencia: Requisiciones de CONSORCIO SANTANDER (sin ninguna) muestra las cifras en 0,
el ícono, «Todavía no hay requisiciones aquí.» y «Nueva requisición de compra». Lo que pide la tarea para el
almacenista (solo la frase) necesita entrar con su cuenta y queda para la demo de la T43. La condición es la misma
del encabezado, y la vigila la verificación. Hay 1090 verificaciones.

**T37 (18-nov).** `panel/avisos.tsx` trae `ProveedorDeAvisos` (en `marco-sesion`, alrededor de lo que queda debajo,
por encima del `Stack`) y `useAvisos()` con `exito()` y `error()`:
- el más nuevo va primero, y se pinta encima;
- el de éxito se va solo a los `DuracionDeAviso`;
- el de error lleva «Cerrar»;
- cada uno lleva ícono y texto, con `role="alert"` o `role="status"`, y no hay «Deshacer».

Van abajo a la izquierda y con un ancho máximo de `AnchoDeAviso = 420` (token nuevo), porque los botones del pie de
una ventana van a la derecha (RF-82).

**Fuera del plan: la capa.** El plan decía «en la capa flotante», pero esa es el `Modal` de React Native, que
atrapa el foco y pone un telón que no deja tocar la página. Un aviso no debe estorbar, y además tiene que verse
encima de una ventana abierta, porque la T38 deja la ventana abierta cuando guardar falla. Así que va en un portal
propio sobre `document.body`, en `capa-de-avisos.web.tsx`, con `z-index` por encima de los `Modal` y sin recibir
el puntero salvo en cada aviso. La variante nativa, `capa-de-avisos.tsx`, solo existe porque las pantallas del
panel entran inertes al bundle del celular.

`react-dom` ya estaba en `package.json`, pero sin tipos. En lugar de añadir `@types/react-dom`, que sería una
dependencia nueva, se declaró solo `createPortal` en `src/tipos-globales.d.ts`. Para probar a mano en el servidor
de desarrollo, el proveedor deja `globalThis.avisosDelPanel` (solo con `__DEV__`, no existe en el panel publicado).

Visto en el navegador: un error y luego un éxito se apilaron con el éxito encima. A los 4 s solo quedaba el de
error, y al pulsar «Cerrar» la capa desapareció. Hay 1091 verificaciones.

**T38 (18-nov).** `useListado.ejecutar` y `useAccionDeVentana().ejecutar` aceptan `{ exito }`, y deciden con la
misma función pura, `repartirFallo` (`panel/repartir-fallo.ts`, con su prueba):
- si la acción sale bien, aviso de éxito;
- si el servidor señala campos, cada motivo va debajo de su campo, sin «Revise los campos marcados» y sin aviso;
- si no señala campos, el error va al aviso;
- en cualquier caso, la ventana queda abierta con lo escrito (los hooks no cierran nada).

Esto cambia la 015, RF-33: con un solo campo, el motivo iba arriba.

**Fuera del plan: `conCampos`.** Si una pantalla o ventana no pinta los errores en sus campos, un motivo «de
campo» no se vería en ningún sitio. Pasa, por ejemplo, con el código repetido de una obra en `ventana-obra`, que no
pasa `campoConError`. Por eso los dos hooks reciben `conCampos`, que por defecto es `false`: sin él, todo va al
aviso. Lo llevan las siete ventanas que sí usan `campoConError` y los seis listados que pintan `errorDe` (catálogos
de cantera, almacén, obras, personas y vehículos). Se intentó detectarlo solo, marcando una ref al leer los campos,
pero la regla `react-hooks/immutability` no deja modificar una ref desde una función que se llama al pintar. En
«Corregir a…» de Personas faltaba conectar Documento y Cargo, y se conectaron.

El lint se quejó un momento de `marco.tsx` con un error que ya no existía: era la caché de `expo lint`
(`.expo/cache/eslint`), que guardaba la versión rota de un paso intermedio. Se borró; se regenera sola.

Visto en el navegador, con `fetch` interceptado en la página para no guardar nada (se comprobó que no llegó ninguna
petición real y que la cédula de prueba no quedó guardada):
- en «Corregir a prueba046.administradora», con la cédula 1234567890 y una respuesta 422 simulada con
  `campos.documento`, salió «Ya hay una persona con esa cédula» debajo de Documento, con la ventana abierta y lo
  escrito intacto, sin renglón arriba y sin aviso;
- con la red cortada, el aviso «No se pudo contactar al servidor…» salió abajo, por encima de la ventana, y la
  ventana siguió abierta.

Hay 1093 verificaciones.

**T39 (18-nov).** En los 13 archivos, `const [hecho, setHecho]` pasó a `useAvisos()` con `avisarHecho(texto)`, que
manda al aviso de éxito lo que no sea `null`. Se quitaron los `setHecho(null)`: el aviso se va solo y no hay que
limpiar nada. Se quitó `<Confirmado mensaje={hecho} />` y se retiró `Confirmado` de `componentes.tsx`. Los textos
son los que ya había («Requisición RQ-0024 aprobada.», «Viaje registrado: …»). El cambio se hizo con un guion de una
sola vez. En Cantera, el comentario del aviso informativo se juntó con el que hablaba del mensaje retirado. El
barrido nuevo comprueba que ningún archivo de `src` nombra `Confirmado` fuera de comentarios.

Visto en el navegador, sin cambiar datos: se abrió RQ-0024 en la bandeja de Elemental, se interceptó en la página
el `POST …/decision` y se respondió `{ estado: 'aprobada' }`. Abajo salió «✓ Requisición RQ-0024 aprobada.». Al
recargar con el `fetch` de siempre, RQ-0024 seguía «En aprobación: Administradora de Elemental», con sus botones de
decidir. Hay 1094 verificaciones.

**T40 (18-nov).** Para el inventario se buscaron los `setError(mensajeDe(…))`: 67 lugares en 36 archivos, que son los 35 migrados más `marco.tsx`, que se queda. Cada fallo
de una acción (guardar, subir, anular, decidir…) pasó de `setError(mensajeDe(fallo))` a `avisos.error(…)`, con
`const avisos = useAvisos()` en el componente donde vivía ese estado. Las validaciones locales («Elija la obra…»)
siguen en línea. Se hizo con un guion; su primera versión rompió archivos (calculaba dónde insertar sobre el texto
ya cambiado) y se deshizo exactamente antes de repetirlo.

Casos sueltos:
- donde ya había otra `avisos` (el Asistente, y el plan semanal, que tiene su lista de avisos del plan), la del
  panel se llama `avisosDelPanel`; en la vista OCC y en Almacén se usó la `avisos` que ya traían de la T39;
- en el detalle del preoperacional el fallo usaba `setError` del listado, y ahora usa el aviso del componente;
- en Finanzas y en Mantenimiento, el estado `error` del componente quedó sin uso y se quitó con su renglón.

**Se quedan en línea, a propósito, los errores de carga:**
- el de `MarcoPantalla`;
- cinco que están dentro de un `useEffect` y traen datos al abrir una ventana o una sección: la solicitud, la
  propuesta de WhatsApp, la cadena de decisión, la planilla OCC y el pago. Los encontró el lint (dependencia
  `avisos`) y se devolvieron a `setError`.

Fuera también el ingreso y el cambio de contraseña obligatorio, que se pintan antes del proveedor de avisos.

El barrido nuevo comprueba que solo esos seis `setError(mensajeDe(` quedan en `src/features`. Archivos migrados:
almacen-obra/importar-documento.tsx, asistente/pantalla-asistente.tsx, compras/formulario-de-solicitud.tsx, compras/pasos-de-gerencia.tsx, compras/vista-de-la-solicitud.tsx, contratos/acciones-presupuesto.tsx, contratos/pestana-presupuesto.tsx, contratos/polizas-y-documentos.tsx, documentos/pantalla-documentos.tsx, empresas/pantalla-finanzas.tsx, panel/detalle-preoperacional.tsx, panel/fotos-del-dia.tsx, panel/historial-almacen.tsx, panel/listado-viajes.tsx, panel/pantalla-almacen.tsx, panel/pantalla-partes.tsx, panel/subir-foto.tsx, panel/whatsapp/completar-de-empresa.tsx, panel/whatsapp/creado-automaticamente.tsx, panel/whatsapp/no-se-pudo-guardar.tsx, panel/whatsapp/propuesta-reporte.tsx, plan-semanal/acciones-plan-semanal.tsx, plan-semanal/armar-plan-semanal.tsx, planificacion/acciones-planificacion.tsx, planificacion/crear-desde-presupuesto.tsx, planificacion/detalle-planificacion.tsx, planificacion/subir-planificacion.tsx, reportes/pestana-mantenimiento.tsx, requisiciones/cadena-y-decision.tsx, requisiciones/occ/importar-planilla-occ.tsx, requisiciones/occ/ventanas-occ.tsx, requisiciones/occ/vista-requisicion-occ.tsx, rrhh/vista-de-la-ficha.tsx, tesoreria/formulario-de-pago.tsx, tesoreria/pasos-de-tesoreria.tsx.

Hay 1095 verificaciones. La prueba de un aviso de error en una ventana quedó hecha en la T38 (red cortada en
«Corregir a…»); estas ventanas usan el mismo aviso.

**T41 (18-nov), código hecho y SIN MARCAR.** En `marco-sesion`, el cambio de contraseña pedido por gusto ya no se
devuelve en lugar del panel: va encima, en una capa opaca de ventana completa (`capaDeClave`), con el panel montado
debajo. Así «Cancelar» deja la pantalla, la búsqueda y los filtros como estaban (RF-61). El obligatorio sigue en
lugar del panel y sin «Cancelar» (RF-83). RF-62 (llegar por un enlace directo) no aplica: el cambio por gusto no
tiene dirección propia, es un estado de la sesión. Se ajustó la prueba de la T37, que esperaba el proveedor de
avisos en una sola línea. Los tres comandos están en verde (1096 verificaciones). **Falta la prueba en el
navegador** (Requisiciones con una búsqueda escrita → Cambiar contraseña → Cancelar). Al ir a hacerla, la extensión
de Chrome se desconectó: debe estar abierta con la misma cuenta de claude.ai que Claude Code, y la sesión había
cambiado de cuenta. Por eso la T41 no se marca.

**T42 (18-nov).**
- «Modificada por la spec 050» en la línea de estado de las specs 008, 022, 026, 033, 034, 035, 046 y 049, y
  también en la 015 (el error de un solo campo va debajo de él, T38) y en la 028 (su RF-73 se queda sin pantalla,
  T8).
- En AGENTS.md, la regla de las columnas: una lista que no cabe pasa a tarjetas; se marcan `principal` y
  `acciones`; solo las cuadrículas se desplazan; por encima de 1366 px las columnas crecen.
- `git diff src/shared/rules/permisos.ts` está vacío: ningún permiso cambió (RF-66).
- `npx expo export --platform web` sale sin errores (3 bundles, 31 rutas estáticas, 197 de API), y `grep
  DATABASE_URL dist/client` no encuentra nada. Se borró `dist`.
- **La revisión a 360 px** (que la página no se desplace a lo ancho y que los controles midan al menos 40 px) no
  se pudo hacer, por la extensión de Chrome desconectada. Pasa a la demo de la T43. No es parte del «Hecho cuando»
  de esta tarea, que se cumple.

Hay 1096 verificaciones.

**T41, marcada (18-nov, con la extensión conectada de nuevo).** En `/panel/elemental/requisiciones`, con
«cemento» escrito (3 de 24), «Cambiar contraseña» abrió la capa con su «Cancelar». Al cancelar se volvió a
Requisiciones con «cemento» en el buscador y «3 de 24».

Se vio un fallo, y se arregló: el título de la pestaña se quedaba en «Cambiar contraseña · Kontrola». Antes el
panel se volvía a montar y su título se reponía solo. Ahora `TituloDeLaPestana` (en `app/panel/_layout.tsx`)
depende también de `cambiandoClave`: no escribe mientras la capa está abierta y vuelve a poner el de la pantalla al
cerrarla. Comprobado después de recargar: abierto, «Cambiar contraseña · Kontrola»; al cancelar, «Requisiciones ·
Elemental Ingeniería y Arquitectura». Hay 1096 verificaciones.

**Revisión a 360 px de la T42 (18-nov, ya con la extensión).** Se midió en un recuadro de 360×780, en
Requisiciones de Elemental, Recursos Humanos, Vehículos de OCC, Bitácoras de una obra y Documentos de OCC:
- si la página se desplaza a lo ancho;
- qué elementos pasan del borde derecho;
- qué botones, campos y enlaces miden menos de 40 px.

Aparecieron dos fallos, y se arreglaron:
- **los pasos de la ruta** medían 17 px de alto (RF-65). Ahora, en el celular, el paso que es enlace mide
  `AltoDeControlAngosto = 44`, un token nuevo en `medidas.ts`; `componentes.tsx` ya usaba ese 44 como constante
  local, y ahora usa el token. El primer intento rompió todas las pantallas, porque `Link` con `asChild` no
  acepta una lista de estilos en su hijo («You are passing an array of styles to a child of <Slot>»). Se dejó un
  estilo único, como ya hace el menú;
- **la etiqueta** «En aprobación: Administradora de Elemental» se salía de su tarjeta. `Etiqueta` gana
  `maxWidth: '100%'` y el texto se parte en renglones (RF-64).

Después de los arreglos, las cinco pantallas cargaron sin error, sin desplazamiento lateral, sin nada fuera del
borde y sin ningún control por debajo de 40 px. Hay 1096 verificaciones.

**T43 (18-nov), recorrido hecho y SIN MARCAR.** `validacion.md` revisa los 90 RF: 84 en verde, RF-30 en rojo
parcial (Plan semanal y Planificación siguen con sus botones en el cuerpo, por decidir con Diego) y 5 pendientes de
demo manual (RF-12, pulsación larga; RF-29 y RF-69, un nombre de obra largo; RF-32, con un residente; RF-53, con un
almacenista). Durante la validación salió y se arregló un fallo de RF-31: en el celular, los textos del encabezado
tenían alto cero (`flexBasis: 0` en columna) y el botón principal se montaba encima del título; ahora va debajo y a
todo lo ancho. La T43 se marca cuando se resuelva RF-30 y pasen las cuatro demos.

**RF-30 en Plan semanal y Planificación (18-nov, pedido por Diego).** Se rehicieron los tres flujos para separar el
botón de su progreso, sin separar el estado. `ArmarPlanSemanal`, `CrearDesdePresupuesto` y `SubirPlanificacion`
reciben como hijo una función y le entregan `{ botones, cuerpo }` (`PartesDeLaAccion`, en `marco.tsx`). El estado
del flujo sigue en el componente, que conserva su `key` por obra. Las pantallas arman su `MarcoPantalla` con
`acciones={botones}` y ponen el cuerpo (avisos de progreso y ventanas) en la página, sin caja propia, para que un
cuerpo vacío no deje hueco. Planificación anida los dos y pone primero «Subir Excel de planificación», que es el
principal; mientras la lista carga no muestra botones, porque «Crear desde el presupuesto» necesita saber si ya
hay un borrador. Sin obra o sin permiso, las dos pantallas van sin botones, como antes.

Visto en el navegador:
- Planificación de Consorcio Antioquia: los dos botones a la derecha del título, y «Crear desde el presupuesto»
  abrió su ventana (cerrada con Cancelar, sin crear nada);
- Plan semanal de PRUEBA-043 Magdalena: los tres botones a la derecha del título, y «Empezar en blanco» abrió su
  ventana (cerrada sin crear nada);
- Plan semanal de Consorcio Antioquia, sin planificación aprobada: sin botones y con su aviso, como antes.

Hay 1097 verificaciones.

**T43, marcada (18-nov).** Se hicieron las cuatro demos que faltaban, sin cambiar datos ni usar contraseñas: el
panel se cargó en un recuadro cuyo `fetch` se parcheó antes de que pidiera la sesión. El servidor siguió viendo a
Gerencia; lo que se probó es lo que pinta la pantalla.
- **RF-32:** como `residente` de PRUEBA-043 (en la 041 el rol `supervisor` pasó a llamarse así), Cantera sin
  «Registrar viaje», Laboratorio sin «Nuevo ensayo» y Documentos con «Subir documento», que es lo único de los
  tres que el residente puede hacer.
- **RF-53:** el vacío de Laboratorio del residente sale con ⚗ y la frase, sin botón. El almacenista no entra a
  Documentos («Sin acceso»), por eso se hizo con el residente.
- **RF-29 y RF-69:** con la lista de obras interceptada para darle a PRUEBA-043 un nombre largo, el paso de la ruta
  mide 280 px y se corta con «…»; al pasar el puntero sale el nombre completo.
- **RF-12:** con el menú plegado dentro del recuadro, `pointerdown` y `touchstart` sobre «Documentos» durante 900 ms
  mostraron «Personal y archivo · Documentos», que se quitó al soltar sin navegar. Después se volvió a abrir el
  menú, que se guarda en el navegador de Diego.

`validacion.md` queda en 90/90 y la spec en **Cumplida**. Hay 1097 verificaciones.
