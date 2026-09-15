# Plan técnico — Spec 007

> Lee antes `docs/constitucion.md` y el `spec.md` de esta carpeta.
> Aquí va el CÓMO. Si algo de esto cambia el comportamiento acordado, no se resuelve
> en el plan: se vuelve a la spec.

## La causa, vista en el navegador el 2026-09-15

React Native Web le pone `position: relative; z-index: 0` a **toda** vista. Cada tarjeta,
cada banda del parte y cada fila de formulario es así su propio contexto de apilamiento, y un
`zIndex: 10` dentro de una de ellas no sube por encima de la hermana de al lado. El proyecto
lo ha parcheado tres veces con `zIndex` descendentes —en las bandas del parte, en las filas de
formulario y en los filtros de preoperacionales—, y cada parche tapa el caso que se vio y deja
el siguiente: el botón «Añadir actividad» encima de la lista de actividades (va en el pie de
la banda, fuera de la fila apilada) y la lista de vehículos de Asignaciones cortada por la
tabla (la tarjeta del formulario y la tabla son hermanas sin apilar).

La ventana emergente tiene el mismo origen: su telón es `position: absolute` dentro del
contenido de la página, no de la pantalla.

**El arreglo no es otro `zIndex`: es sacar la lista y la ventana de la página.**

## Módulos y archivos

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `src/features/panel/capa-flotante.tsx` | **Nuevo.** `CapaFlotante`: pinta su contenido en la capa superior del documento (el `Modal` transparente de React Native, que en la web es un portal a `body` con `position: fixed`, cierre con Esc y trampa de foco) | RF-1, RF-2, RF-8, RF-25, RF-26 |
| `src/features/panel/componentes.tsx` · `Selector` | La lista se pinta en `CapaFlotante`, colocada con `measureInWindow` del botón; se abre hacia arriba si no cabe abajo; filtro con más de ocho opciones; flechas y Enter; foco de vuelta al botón; «✓» en la elegida | RF-1 a RF-15 |
| `src/features/panel/componentes.tsx` · `Modal` | El telón pasa a `CapaFlotante`: cubre la pantalla, la ventana va centrada y con alto máximo de la pantalla, desplazándose por dentro | RF-25, RF-26 |
| `src/features/panel/componentes.tsx` · `Campo` | Propiedad `obligatorio` (marca en la etiqueta); `multilinea` a seis renglones; `soloLectura` ya existe (004/T19) | RF-16, RF-17, RF-18, RF-29, RF-30 |
| `src/features/panel/componentes.tsx` · estilos | `filaFormulario` y `formulario` alinean **arriba** (`flex-start`); la altura mínima de campo y de selector sale de `CampoPanel.alto` | RF-16, RF-23 |
| `src/constants/medidas.ts` | `CampoPanel.altoAreaDeTexto` pasa a seis renglones; `AnchoIndiceDeSecciones` sube lo justo para «Control Calidad de Obra» | RF-27, RF-30 |
| `src/features/panel/secciones-con-indice.tsx` | El rótulo del índice envuelve en vez de cortarse; se retira el `zIndex` descendente de las bandas | RF-1, RF-27 |
| `src/features/panel/pantalla-partes.tsx` | Cada sección pinta su propio error (`alFallar` pasa a estado local de la sección); «Equipo» con `soloLectura`; observaciones de actividad, notas y motivos con `multilinea`; se retiran los `apilado` | RF-6, RF-28, RF-29, RF-30 |
| `src/features/panel/pantalla-asignaciones.tsx`, `pantalla-personas.tsx`, `pantalla-vehiculos.tsx`, `ventana-obra.tsx`, `ventana-vehiculo.tsx`, `pantalla-preoperacionales.tsx` | Retirar los parches de `zIndex`; marcar obligatorios; una sola acción principal por formulario | RF-6, RF-17, RF-19 |
| `src/shared/rules/texto.ts` | Se reutiliza `normalizar` para el filtro de opciones; función pura nueva `filtrarOpciones` con su caso | RF-12, RF-13, RF-14 |
| `src/shared/rules/flotante.ts` | **Nuevo.** `colocarLista(botón, alto de la lista, alto de la pantalla)`: arriba o abajo, y cuánto alto le cabe. Pura, con sus casos | RF-3 |
| `scripts/verificar-reglas.ts` | Casos de `filtrarOpciones` y `colocarLista` | RF-3, RF-12, RF-13 |

Se reutiliza: `normalizar` (`shared/rules/texto.ts`), `Sombra.flotante`, `Panel.*`, `Radio`,
`CampoPanel`, el `soloLectura` y el `multilinea` de 004/T18–T19.

## Modelo de datos

Sin cambios de esquema. No hay API nueva ni modificada.

## Algoritmo / reglas

**Colocar la lista (RF-3).** Al abrir, se mide el botón en coordenadas de la ventana del
navegador (`measureInWindow`). Con `espacioAbajo = altoPantalla − (y + alto)` y
`espacioArriba = y`:
1. Si `espacioAbajo ≥ min(altoLista, altoMinimo)`, se abre abajo, con alto `min(altoLista, espacioAbajo − margen)`.
2. Si no, y `espacioArriba > espacioAbajo`, se abre arriba con alto `min(altoLista, espacioArriba − margen)`.
3. Si no, abajo con lo que quepa.

**Cerrar (RF-5, RF-7, RF-8).** La capa flotante lleva un telón transparente a pantalla
completa: un clic en él cierra; la rueda sobre él cierra (la página de detrás no se desplaza
mientras la lista está abierta, así que la lista no se despega de su botón); Esc cierra por
`onRequestClose`.

**Teclado (RF-9 a RF-11).** El índice señalado vive en el estado del selector; flechas lo
mueven, Enter elige, y al cerrar se devuelve el foco al botón con su `ref`.

**Filtro (RF-12 a RF-14).** `filtrarOpciones(opciones, texto)` compara `normalizar(etiqueta
+ detalle)` con `normalizar(texto)`; con más de ocho opciones se pinta el campo de filtro
arriba de la lista.

## Decisiones técnicas

- **La lista y la ventana se pintan con el `Modal` transparente de React Native** → se
  descartó seguir con `zIndex` descendentes porque ya van tres parches y cada uno deja fuera
  el caso siguiente; se descartó una librería de popovers porque la constitución §8 pide no
  añadir dependencias, y el `Modal` de React Native Web ya trae portal, `position: fixed`,
  cierre con Esc y trampa de foco.
- **La lista se coloca midiendo el botón, no con CSS relativo** → se descartó `position:
  fixed` escrito a mano en el estilo porque React Native no lo tipa y cuela un estilo de
  navegador en un componente compartido.
- **El error de cada sección del parte vive en la sección** → se descartó llevar la página
  hasta el aviso de arriba con un salto de desplazamiento, porque quien pulsó pierde el sitio
  donde estaba escribiendo.
- **Alinear las filas por arriba** → se descartó reservar el alto de la ayuda debajo de cada
  campo, porque deja un hueco en los campos que no tienen ayuda. Con `flex-start` las
  etiquetas quedan en línea y la ayuda cuelga debajo sin empujar a nadie.
- **El índice envuelve el rótulo** en lugar de ensancharse mucho → se descartó abreviar
  («Control calidad») porque OCC nombró así la sección.

## Impacto en la sincronización

Ninguno. Todo es del panel.

## Estrategia de verificación

En `scripts/verificar-reglas.ts`: `filtrarOpciones` («camion» encuentra «Camión», sin
coincidencias devuelve vacío, el detalle también cuenta) y `colocarLista` (abajo cuando cabe,
arriba cuando no cabe abajo y sí arriba, alto recortado al espacio). Siguen en verde los de
anchos de tabla (005/RF-20) y contraste (005/RF-22).

Demo en Chrome, con la sesión de gerencia: los siete pasos de «Criterios de finalización» de
la spec, empezando por los dos casos que se vieron rotos (actividades y asignaciones).

## Riesgos

- **El `Modal` de React Native Web cambia el foco** al abrirse (trampa de foco). Es lo que se
  quiere, pero hay que comprobar que al cerrar vuelve al botón (RF-9); si no, se devuelve a
  mano con el `ref`.
- **Nativo**: `componentes.tsx` es del panel, que solo se usa en la web. Aun así no se toca
  nada que cambie la app del operador (RF-21).
- **Muchos archivos de pantalla tocados** para retirar parches: se hace por pantallas, cada
  una en su tarea, con la demo de esa pantalla antes de pasar a la siguiente.
