# Plan técnico — Spec 050

> Lee antes `docs/constitucion.md` y el `spec.md` de esta carpeta.
> Aquí va el CÓMO. Si algo de esto cambia el comportamiento acordado, no se resuelve
> en el plan: se vuelve a la spec.

Todo pasa en el panel web. Casi todo el trabajo cae en cinco piezas que ya comparten las
pantallas: `componentes.tsx` (`Campo`, `Selector`, `CampoDeFecha`, `Formulario`, `Tabla`,
`Modal`, `AccionesFormulario`), `marco.tsx` (`MarcoPantalla`, `useListado`),
`menu-lateral.tsx`, `marco-sesion.tsx` y `shared/rules/empresas.ts`. Cambiar la pieza
arregla las pantallas que la usan. Lo que está armado a mano (la requisición y los
encabezados con botones sueltos) se migra pantalla por pantalla.

## Módulos y archivos

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `src/shared/rules/empresas.ts` | `EntradaDelMenu` gana `seccion`. Hay una lista de secciones por lugar (obra, OCC, GeoLab, Elemental) y una función nueva, `menuPorSecciones(lugar, persona, modulos)`, que devuelve `{ asistente, secciones: { titulo, entradas }[] }`: filtra por permiso y módulo apagado como hoy y quita las secciones vacías. `ASISTENTE` pasa a la cabeza de cada menú | RF-1 a RF-10, RF-8 |
| `src/shared/rules/empresas.ts` | `destinoAlEntrar` lleva a todos los cargos al Asistente de su lugar (obra única, OCC, GeoLab o Elemental). La gerencia sigue en `/panel`, y quien tiene varias obras sigue en la lista | RF-84, RF-88 a RF-90 |
| `src/shared/rules/empresas.ts` | `portadaDelLugar(lugar, persona, modulos)`: la ruta del Asistente o, si el cargo no lo ve, la de la primera entrada. La usan la portada de empresa y la de obra | RF-84, RF-85, RF-87 |
| `src/shared/rules/empresas.ts` | `migasDelLugar(lugar, nombres, registro?)`: los pasos `{ titulo, ruta \| null }` (empresa u obra › módulo › registro). Todos los pasos llevan ruta menos el último. `tituloDelLugar` deja de usar «Resumen del día» | RF-27, RF-28, RF-86 |
| `src/features/panel/menu-lateral.tsx` | Arriba la cabecera de la 049 (marca u obra y «Cambiar de obra»); luego el Asistente sin título; luego un `Grupo` por sección con el estilo `tituloGrupo`. Plegado: una raya entre secciones y la etiqueta «Sección · Entrada», que también sale con `onLongPress` | RF-1, RF-2, RF-8, RF-11, RF-12, RF-67, RF-68 |
| `src/features/empresas/paginas-de-empresa.tsx` | `PortadaDeEmpresa` usa `portadaDelLugar` | RF-84, RF-85 |
| `src/features/empresas/pantalla-proyectos.tsx` | `PortadaDeLaObra` redirige con `portadaDelLugar`: no pinta el resumen. Así la dirección vieja `/panel/proyectos/<obra>` lleva al Asistente | RF-84, RF-86, RF-87 |
| `src/features/panel/pantalla-inicio.tsx` | Se retira `Portada` (el Resumen del día) y lo que solo él usaba. `PantallaInicioPanel` no cambia | RF-86 |
| `src/features/panel/componentes.tsx` — campos | `EtiquetaDeCampo` en una sola línea y de alto fijo (`numberOfLines={1}`; el texto completo, en `accessibilityLabel`). La ayuda y el error van debajo del recuadro, nunca encima. `Formulario` alinea su renglón con `alignItems: 'flex-start'`. Se conservan los tres anchos de `ANCHOS_DE_CAMPO` (corto, medio y largo flexible) y el `*` de los obligatorios | RF-13 a RF-18, RF-24 |
| `src/features/panel/componentes.tsx` — primer error | Contexto `PrimerError`: el primer `Campo`, `Selector` o `CampoDeFecha` que recibe un `error` dentro de una ventana o pantalla se desplaza a la vista con `scrollIntoView({ block: 'center' })` (el nodo DOM de RN Web) | RF-19, RF-20 |
| `src/features/panel/componentes.tsx` — `Modal` | Gana una ranura de pie fuera de su `ScrollView`. `AccionesFormulario` dentro de un `Modal` se pinta en esa ranura, a través de un contexto, y fuera de un `Modal` se pinta como hoy. Las 45 ventanas no cambian | RF-21, RF-82 |
| `src/features/compras/formulario-de-solicitud.tsx` | Cada renglón es una `Tarjeta` con la cabecera «Renglón N» y Quitar, dos `Formulario` (qué / cantidad / unidad; para cuándo / para qué / valor) y «Va a» a lo ancho. Sin anchos a mano | RF-22, RF-23 |
| Formularios armados a mano (inventario en `tareas.md`) | Pasan a `Formulario` + `Campo`. Se buscan con `grep` las filas con `View` y anchos fijos alrededor de `Campo` o `Selector`, fuera de `Formulario`, `FilaDeSeccion`, `RenglonDeCampos` o `BarraDeListado` | RF-25 |
| `src/features/panel/marco.tsx` — encabezado | `MarcoPantalla` gana `acciones?: ReactNode` (a la derecha del título; debajo y a lo ancho por debajo de 768 px) y `registro?: string` (el tercer paso de la ruta). Pinta las migas con `migasDelLugar` y el nombre de la obra con `obra-en-uso`. Un paso recortado muestra el nombre completo al pasar el puntero o al mantenerlo pulsado | RF-26 a RF-32, RF-69 |
| Pantallas con botón principal suelto (inventario en `tareas.md`) | El botón sale del cuerpo y pasa a `acciones`. Cada pantalla conserva su condición de permiso | RF-30, RF-32 |
| `src/features/panel/marco.tsx` — anchos | `MarcoPantalla` gana `ancho?: 'listado' \| 'formulario'` (por defecto `listado`), con tope de `AnchoListado` (1600) o de `AnchoFormulario` (1100) | RF-42, RF-43 |
| `src/constants/medidas.ts` | `AnchoListado = 1600`, `AnchoFormulario = 1100` y `DuracionDeAviso = 4000`. `MaxContentWidthPanel = 1280` se queda: es la medida contra la que se calibran las columnas (AGENTS.md) | RF-42, RF-43, RF-56 |
| `src/features/panel/componentes.tsx` — `Tabla` | `Columna` gana `principal?` y `acciones?`. `Tabla` gana `tipo?: 'lista' \| 'cuadricula'` (por defecto `lista`). Una lista mide su marco con `onLayout` y pasa a tarjetas si está por debajo de 768 px o si el marco es menor que el mínimo que ya calcula (`minimo`). La tarjeta lleva la columna principal arriba, las demás como «Título: valor» y la de acciones al pie, o sin pie si no la hay. Con tarjetas aparece «Ordenar por», con las columnas que tienen `ordenar`. La cuadrícula conserva el desplazamiento horizontal. Por encima de 1366 px las columnas crecen en proporción a su `ancho` (`flexGrow` proporcional en lugar de 0) | RF-33 a RF-41, RF-44, RF-70 a RF-74 |
| Tablas que se editan celda por celda | Se declaran `tipo="cuadricula"` si usan `Tabla`. La granulometría (`tabla-tamices.tsx`) y la maquinaria del parte (`FilaDeSeccion`) no usan `Tabla`: se revisa que sigan desplazándose dentro de su marco | RF-71, RF-72 |
| `src/features/panel/componentes.tsx` — superficie | `SUPERFICIE` cambia el borde por `Sombra.tarjeta`. Lo que se pulsa (las cards de las empresas, las cifras) pasa a `Sombra.elevada` al pasar el puntero, con la transición `Movimiento.rapido`. Los tokens ya existen en `theme.ts` | RF-45 a RF-47 |
| `src/features/panel/cifras-de-estado.tsx` (nuevo) | `CifrasDeEstado({ estados, conteos, elegido, alElegir })`: una cifra pulsable por estado, con ícono, nombre y número. La elegida lleva borde grueso y «✓». Pulsar la elegida quita el filtro. Reutiliza `Cifra` y `Cifras` | RF-48 a RF-51 |
| `src/features/panel/usar-listado-filtrado.ts` | `contarPorEstado(filas, estadoDe)` cuenta sobre las filas que pasan todos los filtros menos el de estado, antes de paginar | RF-52 |
| Las 7 listas con filtro de estado: preoperacionales (Resultado), vehículos, requisiciones, tesorería, laboratorio, bandeja de WhatsApp y personal | Se quita el `Selector` «Estado» (o «Resultado») y se ponen las `CifrasDeEstado`. Las casillas de vencidos y anulados quedan igual | RF-48, RF-75, RF-76 |
| `src/features/panel/componentes.tsx` — vacío | `Tabla` acepta en `vacio` un texto o `{ texto, icono, accion? }` (el botón solo si el cargo puede). Con `sinResultados={{ alQuitar }}`, dice «No hay resultados con estos filtros» y da el botón para quitarlos. `useListadoFiltrado` da `hayFiltros` y `limpiar` | RF-53, RF-54, RF-78 |
| `src/features/panel/avisos.tsx` (nuevo) | `ProveedorDeAvisos` y `useAvisos()` con `exito(texto)` y `error(texto)`. Va encima del `Stack`, en `marco-sesion.tsx`, para que el aviso sobreviva al cambio de pantalla. Se pinta en la capa flotante (`capa-flotante.tsx`), abajo, por encima del pie de una ventana abierta. El de éxito se quita a los `DuracionDeAviso`; el de error lleva «Cerrar». El más nuevo va encima. Ícono y texto, además del color. Sin «Deshacer» | RF-55 a RF-60, RF-81, RF-82 |
| `src/features/panel/marco.tsx` — `useListado.ejecutar` | `ejecutar(accion, { exito })`. Si sale bien, aviso de éxito. Si es un error de campos, solo los campos y no el renglón «Revise los campos marcados» ni un aviso. Cualquier otro error va al aviso. Los errores de carga del listado siguen en línea en `MarcoPantalla`, porque no son de una acción | RF-55, RF-57, RF-79, RF-80 |
| `src/features/panel/usar-accion-de-ventana.ts` | La misma regla para las acciones de las ventanas. En un error, la ventana se queda abierta con lo escrito | RF-57, RF-79, RF-80 |
| Usos de `Confirmado` (13) y de `Aviso tono="error"` tras una acción | Pasan a `useAvisos`. `Confirmado` se retira | RF-55, RF-57 |
| `src/features/panel/marco-sesion.tsx` | El cambio de contraseña por gusto se pinta **encima** del contenido, sin desmontar el `Stack`. Al cancelar se ve la pantalla que había debajo. El obligatorio (`debe_cambiar`) sigue igual, sin «Cancelar» | RF-61, RF-62, RF-83 |
| `scripts/verificar-reglas.ts` | Casos nuevos (ver «Estrategia de verificación») y ajuste de los casos de la 008, la 033, la 034, la 035, la 046 y la 049 que esperaban el orden de menú y los destinos de antes | todos los de reglas |
| `specs/008, 022, 026, 033, 034, 035, 046, 049/spec.md` | Una línea de estado: «Modificada por la spec 050» con los RF que cambian | — |
| `AGENTS.md` | Se actualiza la regla de las columnas: en 1280 px deben caber, y si no caben pasan a tarjetas | — |

## Modelo de datos

Sin cambios de esquema, ni en el local ni en el servidor, y sin migraciones. La app del
celular no se toca, así que no hay teléfonos que actualizar.

## Algoritmo / reglas

**Menú por secciones** (RF-1 a RF-10, `menuPorSecciones`):
1. Se toma el menú del lugar: `menuDeEmpresa` o `menuDeObra`, que ya filtran por permiso, por módulo apagado y por la regla de la Administradora fuera de Elemental.
2. Se separa el Asistente, si quedó.
3. Se recorren las secciones del lugar en su orden fijo. Cada una se queda con sus entradas, en el orden de la spec. Las vacías se descartan.
4. Toda entrada del menú del lugar tiene que estar en una sección. Lo comprueba la verificación (RF-3).

**Portada** (RF-84, RF-85, `portadaDelLugar`): si el menú del lugar tiene Asistente, su ruta; si no, la de la primera entrada de la primera sección; si no hay ninguna, `null`, y la pantalla dice «Sin acceso», como hoy.

**Migas** (RF-27, RF-28):
- Empresa: `[Empresa → rutaDeEmpresa(e), Módulo → null]`.
- Obra: `[Obra → rutaDeObra(o), Módulo → null]`.
- Con `registro`, el módulo gana su ruta y el registro es el último paso, sin ruta.
- La ruta de la empresa o de la obra lleva a su portada, que es el Asistente.

**Lista o tarjetas** (RF-33, RF-41, RF-70): `tarjetas = angosto || (anchoDelMarco > 0 && anchoDelMarco < minimo)`. Con `anchoDelMarco = 0` (el primer pintado) se supone tabla, que es lo mismo que hace `useEsAngosto`. La búsqueda, los filtros y el orden viven en la pantalla, no en `Tabla`, así que sobreviven al cambio (RF-73).

**Conteo por estado** (RF-52): `filasSinFiltroDeEstado = filas.filter(todosLosFiltrosMenosEstado)` y luego `conteos[e] = filasSinFiltroDeEstado.filter(estadoDe === e).length`. Va antes de paginar: las listas del panel se piden enteras y se paginan en el navegador (`usePaginacion`), así que la API no cambia.

## Decisiones técnicas

- **Una ranura en `Modal` para el pie, que `AccionesFormulario` llena por contexto.** Se descartó añadir una prop `pie` y migrar las 45 ventanas, porque es el mismo resultado con 45 cambios y 45 ocasiones de olvidar una.
- **El paso de tabla a tarjetas lo decide el ancho medido del marco contra el `minimo` que ya calcula `Tabla`.** Se descartó un corte fijo en 1024 px, porque Diego escogió «tarjetas si no cabe» (D6) y una lista de tres columnas cabe holgada a 800 px.
- **La tarjeta se arma con las mismas `Columna` de la tabla, más dos marcas (`principal` y `acciones`).** Se descartó una función `pintarTarjeta` por pantalla, porque son 56 pantallas y RF-35 pide «todo lo de la fila», que es justo lo que ya describen las columnas.
- **Avisos con un proveedor propio encima del `Stack`, pintados en la capa flotante que ya existe.** Se descartó una librería de *toasts*, que sería una dependencia nueva (principio 8). Se descartó también el `Aviso` en línea de hoy, porque no sobrevive al cambio de pantalla (RF-81) y empuja el contenido.
- **El cambio de contraseña como capa encima del contenido.** Se descartó guardar la ruta antes de abrirlo y volver a ella después, porque con la capa no se pierden ni la búsqueda ni la posición de la pantalla. Hoy el `Stack` se desmonta, y por eso al volver se abre el inicio.
- **Las secciones del menú como dato en `shared/rules/empresas.ts`**, al lado del menú (principio 3). Se descartó ponerlas en `menu-lateral.tsx`, porque la verificación no podría probarlas en Node.
- **Ir al primer error con `scrollIntoView` del nodo DOM.** El panel es solo web, y cualquier `View` de RN Web es un elemento. Se descartó medir con `onLayout` y desplazar a mano el `ScrollView` de cada ventana, porque en una ventana con secciones anidadas la posición relativa no es la del desplazamiento.
- **Los anchos de 1600 y 1100 como tokens en `medidas.ts`.** Se descartó cambiar `MaxContentWidthPanel`, porque es la medida contra la que se calibraron todas las columnas y AGENTS.md la usa como regla.
- **El Resumen del día se retira del código, no se esconde.** Se descartó dejarlo sin enlace, porque sería código que nadie ve y que se pudre. «Nada se borra» (principio 4) habla de los datos, y esos siguen en cada módulo.

## Impacto en la sincronización

Sin impacto en la sincronización. Ni el pull, ni el outbox, ni la API del celular cambian.

## Contrato de API

Sin endpoints nuevos ni cambiados. Las cifras se cuentan en el navegador, sobre listas que ya llegan completas.

## Estrategia de verificación

- **`scripts/verificar-reglas.ts`**:
  - **Secciones:** las de cada lugar, en orden y con sus entradas exactas (RF-4 a RF-7). Toda entrada de `MENUS` y `MENU_DE_OBRA` tiene sección, salvo el Asistente (RF-3). Para cada rol y lugar, ninguna sección vacía (RF-9), y una obra con Almacén apagado no muestra la sección vacía si queda así (RF-10).
  - **Asistente:** es el primero en `menuPorSecciones` (RF-8).
  - **Entrada:** `destinoAlEntrar` lleva al Asistente a residente, director de obra, almacenista, encargado de planta, laboratorista, encargado de OCC, Auxiliar Administrativa y Administradora de Elemental. La gerencia va a `/panel` y quien tiene varias obras, a la lista (RF-84, RF-88 a RF-90).
  - **Portada:** `portadaDelLugar` da el Asistente, o la primera entrada si se quita el permiso del Asistente (RF-85).
  - **Migas:** los pasos de empresa, obra y registro, y que el último no lleva ruta (RF-27, RF-28).
  - **Sin Resumen del día:** el texto no aparece en `tituloDelLugar` ni en ningún `.tsx` (RF-86).
  - **Medidas:** `AnchoListado === 1600`, `AnchoFormulario === 1100` y `DuracionDeAviso === 4000` (D1 a D3).
  - **`contarPorEstado`:** cuenta con búsqueda y otro filtro puestos, y no se deja cortar por la paginación (RF-52).
  - **Barridos estáticos:**
    - ningún `.tsx` importa `Confirmado`;
    - no queda un `Selector` con etiqueta «Estado» en las 7 listas;
    - los formularios del inventario no tienen `View` con `width` a mano alrededor de los campos.
  - **Ajuste de los casos viejos:** se actualizan los que esperaban el destino al entrar o el orden de menú anteriores (008, 033, 034, 035, 046, 049), con su comentario «Modificado por la spec 050».
- **Demo manual** en el navegador de Diego, con la extensión, una sola pestaña y recuadros de 390, 1366 y 1920 px:
  - entrar como residente y caer en el Asistente;
  - menú con secciones, abierto y plegado, con la etiqueta «Sección · Entrada»;
  - Requisiciones, pulsando la cifra «Pendientes» y volviéndola a pulsar;
  - tarjetas a 390 px y en una ventana a medio ancho;
  - crear una requisición con dos renglones, ver «Requisición guardada» y que se vaya a los 4 s;
  - provocar un error de campo (debajo del campo, con la ventana abierta) y uno sin red (aviso que se queda);
  - cancelar el cambio de contraseña y seguir en la misma pantalla;
  - la granulometría a 390 px desplazándose dentro de su marco.
- **Fotos de antes**, la primera tarea, antes de tocar nada, de las pantallas de los criterios de finalización de la spec.
- **Comprobaciones extra:** `npx expo export --platform web` sin errores al cerrar la spec. No se toca ningún secreto.

## Riesgos

- **Casos viejos de la verificación en rojo** por el destino al entrar y el orden del menú. Es lo esperado. Se detecta en el primer `verificar` y se ajusta en la misma tarea que cambia la regla, citando la 050.
- **Parpadeo de tabla a tarjetas en el primer pintado**, porque el marco mide 0 hasta su `onLayout`. Se supone tabla, como `useEsAngosto`. Si se nota en el celular, se cubre con `useEsAngosto`, que ya sabe el ancho de la ventana. Se ve en la demo a 390 px.
- **La ranura del pie del `Modal` pinta dos veces** los botones, o ninguna, si una ventana anida `AccionesFormulario` en un lugar raro. Se detecta en el barrido de las 45 ventanas (tareas). Se revierte haciendo que ese caso pinte en línea, como hoy.
- **RF-25 (todos los formularios) es el trabajo más largo y el más fácil de dejar a medias.** El inventario va en `tareas.md`, archivo por archivo con su casilla, y el barrido estático lo vigila.
- **Las filas del parte se calibraron a 1280 px** (`ANCHO_NOMBRE_DE_FILA` y los demás suman unos 900 px). Con `ancho="formulario"` (1100) caben, pero el parte se queda en `listado` para no tocarlo. Se revisa en la demo.
- **Retirar el Resumen del día deja sin portada a quien lo usaba a diario.** Diego lo decidió (D10). Si hace falta volver atrás, es un `git revert` de esa tarea, que va sola.
- **La memoria del servidor de desarrollo**: se reinicia `npm run web` entre tareas largas y no se recarga en bucle.
- **Cómo se revierte:** cada parte (menú, portada, campos, ventana, encabezado, tabla, cifras, avisos, contraseña) va en su propia tarea y se puede revertir sola. Nada toca datos.
