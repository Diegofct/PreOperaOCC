# Tareas — Spec 022

Tareas de menos de 30 minutos, ordenadas por dependencia. Cada una lleva los RF que
cubre y una línea `Hecho cuando:` que se pueda comprobar sin interpretar.

**Se implementa una tarea cada vez** (`/sdd:implementar T1`), y al terminarla se para.
Ninguna tarea se marca sin `npm run verificar`, `npm run typecheck` y `npm run lint`
en verde.

## Reglas y tokens

- [ ] T1. `shared/rules/menu.ts`: `GRUPOS_DEL_MENU`, `gruposDelMenu`, `regimenDelMenu` y
      `anchoDelContenido`, con sus casos. Los tokens de medida que usan (`AnchoMenuAbierto`,
      `AnchoMenuPlegado` y `AnchoMinimoMenuFijo`) van en `medidas.ts`. (RF-2, RF-3, RF-4,
      RF-8, RF-11, RF-12)
      Hecho cuando: en verde estas comprobaciones:
      - **Grupos:**
        - la gerencia ve 4 grupos y 11 módulos;
        - el residente ve «Administración» solo con Asignaciones;
        - el almacenista, el encargado de planta y el laboratorista ven un solo grupo con su
          módulo;
        - en una obra con Control Cantera apagado, el residente no lo ve;
        - la unión de los grupos es exactamente `MODULOS`, sin repetidos.
      - **Régimen:**
        - a 1280 sin preferencia → `fijoAbierto`;
        - a 1280 con «plegado» → `fijoPlegado`;
        - a 1279 → `riel` con cualquier preferencia.
      - **Ancho del contenido:** 984, 904 y el tope de 1280 a 1920.

- [ ] T2. Paleta del panel en `paleta.ts`:
      - los tokens nuevos de `Panel` (`texto`, `textoApoyo`, `superficie`, `acento`,
        `acentoSuave`, `sobreAcento`, `barra`, `textoBarra` y `textoBarraApoyo`);
      - los valores nuevos de los tokens existentes;
      - la prueba de contraste ampliada.

      Se conserva `accionSuave` hasta T9. `Colors`, `Estado` y `Marca` no se tocan.
      (RF-20, RF-21, RNF)
      Hecho cuando: la prueba de contraste está en verde con:
      - 4,5:1 para `texto` y `textoApoyo` sobre `fondo`, `superficie`, `fondoCabecera` y
        `fondoAlterno`;
      - 4,5:1 para `sobreAccion` sobre `accion`, `sobreAcento` sobre `acento` y sobre
        `acentoSuave`, y `textoBarra` y `textoBarraApoyo` sobre `barra`;
      - 3:1 para `foco` sobre `fondo` y sobre `superficie`.

      Además, `git diff` de `paleta.ts` no toca `Colors`, `Estado` ni `Marca`.

- [ ] T3. Fuentes:
      - descargar los siete `.ttf` y `OFL.txt` a `public/fuentes/`, **con permiso previo**,
        diciendo el nombre y el tamaño de cada archivo;
      - `src/features/panel/fuentes.css` con un `@font-face` por archivo;
      - los tokens `FuentePanel` y `EspaciadoLetra` en `medidas.ts`;
      - el import del CSS en `src/app/panel/_layout.tsx`;
      - la prueba de archivos y de URL locales.

      Si el `url('/fuentes/…')` no carga, se aplica el respaldo del plan (`useFonts` con una
      familia por peso) **antes** de seguir. (RF-22, RF-23, RF-33)
      Hecho cuando:
      - `verificar` comprueba que existen los siete archivos y que el CSS solo apunta a
        `/fuentes/`;
      - en Chrome, la pestaña Red muestra los `.ttf` con 200 desde el propio servidor;
      - un texto con `fontFamily: FuentePanel.texto` aparece como Plus Jakarta Sans en
        «Rendered Fonts», en los pesos 400 y 800, sin negrita sintetizada.

- [ ] T4. `iconos.tsx`: quince íconos de línea con `react-native-svg` (once módulos, plegar,
      abrir, contraseña y salir). Además, en `modulos.ts`, el ícono de cada módulo y la función
      `moduloDeLaRuta`, con sus casos. (RF-5, RF-6)
      Hecho cuando: en verde que `/panel` → inicio, `/panel/obras` → obras,
      `/panel/laboratorio/x/informe` → laboratorio y una ruta desconocida → nulo. El
      `typecheck` exige un ícono por módulo, gracias a `satisfies Record<Modulo, …>`.

## El marco

- [ ] T5. `estado-menu.tsx`: el proveedor y el hook del menú, con:
      - la preferencia guardada en `localStorage` y leída después de montar, con `try/catch`;
      - el régimen calculado con `regimenDelMenu` y el ancho de la ventana;
      - el estado momentáneo «abierto encima».

      (RF-8, RF-11, RF-12, RF-13)
      Hecho cuando: los tres comandos están en verde, y una prueba de `verificar` con un
      `localStorage` falso que lanza excepción comprueba que la lectura devuelve «sin
      preferencia» sin romper.

- [ ] T6. Layout nuevo y barra superior:
      - `barra-superior.tsx` (la píldora grafito con el logo sobre su fondo claro, «Control de
        Obra», nombre · cargo, «Cambiar contraseña» y «Cerrar sesión»);
      - `_layout.tsx` con la barra arriba y la fila menú + `Stack` sin encabezado, más el
        `Stack.Screen` de `whatsapp`;
      - se eliminan `barra-navegacion.tsx`, `shared/rules/barra.ts` y su prueba,
        `AnchoLadoBarra` y `AnchoMinimoBarraCentrada`;
      - en el hueco del menú va, de momento, `menu-lateral.tsx` con la lista plana de módulos
        visibles.

      (RF-1, RF-7, RF-15, RF-16, RF-17, RF-18, RF-19)
      Hecho cuando: en Chrome, como gerencia:
      - arriba se ve la píldora con el logo legible y «Diego · Gerencia» (o el nombre de la
        sesión);
      - a la izquierda están los 11 módulos y cada uno abre su pantalla;
      - ninguna pantalla pierde su desplazamiento vertical;
      - «Cambiar contraseña» abre su pantalla;
      - la barra superior no tiene módulos;
      - `grep` no encuentra `barra-navegacion` ni `barraCabeEnUnRenglon` en `src/` ni en
        `scripts/`.

- [ ] T7. Menú lateral completo en modo fijo:
      - los grupos de `gruposDelMenu`, con su título en Space Grotesk y en mayúsculas;
      - el activo marcado con `moduloDeLaRuta`, en píldora `acento` con texto `sobreAcento`
        en negrita y una barra a su izquierda;
      - el botón de plegar y abrir;
      - en plegado, solo íconos y la etiqueta del nombre al pasar el puntero;
      - la preferencia se guarda.

      (RF-3 a RF-6, RF-9, RF-10, RF-11)
      Hecho cuando: en Chrome a 1440 de ancho:
      - se ven los cuatro grupos;
      - en `/panel/laboratorio/<id>`, Laboratorio está resaltado;
      - al plegar y recargar, el menú sigue plegado;
      - al pasar sobre un ícono plegado aparece su nombre;
      - al abrir y recargar, el menú sigue abierto.

- [ ] T8. Modo `riel`:
      - por debajo de 1280 el menú va plegado;
      - al abrirlo se dibuja encima del contenido con el telón;
      - se cierra al elegir un módulo o al tocar el telón;
      - abrirlo en este modo no se guarda como preferencia.

      (RF-12, RF-13, RF-14)
      Hecho cuando: en Chrome a 1100 de ancho:
      - el menú aparece plegado aunque la preferencia sea «abierto»;
      - al abrirlo, el contenido no se mueve y queda tapado;
      - al elegir Obras se abre Obras y el menú se cierra;
      - al volver a 1440, el menú está como lo dejó la preferencia.

## Componentes

- [ ] T9. `Tabla` con columnas encogibles (`flexBasis`, `flexShrink` y `anchoMinimo`, o
      `EncogimientoColumna`) y la prueba de anchos con la suma de mínimos frente a 904, y
      frente a 708 en el parte diario. Además:
      - `secciones-con-indice.tsx` decide entre una y dos columnas con `anchoDelContenido`;
      - su activo pasa a `acentoSuave`, y se retira `accionSuave`.

      (RF-27)
      Hecho cuando:
      - la prueba de anchos está en verde y sigue encontrando al menos 10 tablas;
      - en Chrome, a 1024 con el menú en `riel`, la tabla de Almacén y la bandeja de WhatsApp
        se ven enteras, con la columna de botones visible y sin barra horizontal;
      - a 1920 llenan su tarjeta.

- [ ] T10. `componentes.tsx`, la parte de formularios:
      - `Boton` en píldora (principal grafito, secundario con borde fino, peligro con
        `Estado`), en Space Grotesk, mayúsculas y espaciado;
      - `Campo`, `Selector`, `SelectorDeHora`, `Casilla` y `EtiquetaDeCampo`, con la etiqueta
        encima y el foco grafito;
      - `FilaDeFormulario` alineada por arriba.

      Todos con los tokens `Panel.*` y `FuentePanel`. (RF-23, RF-24, RF-26)
      Hecho cuando: en Chrome, en el formulario de Personas y en el de un viaje de cantera:
      - los botones son píldoras;
      - las etiquetas van encima;
      - dos campos de una fila, uno con error y otro sin él, empiezan a la misma altura;
      - el foco con el tabulador se ve.

- [ ] T11. `componentes.tsx`, el resto, y `marco.tsx`:
      - `Tabla` (cabecera en Space Grotesk, filas y bordes nuevos), `Tarjeta`, `Seccion`,
        `Modal`, `Aviso`, `Etiqueta`, `Cifra`, `Medidor`, `BarraDeListado`, `Paginacion` y
        `Confirmacion`;
      - `MarcoPantalla` con el fondo crema y el título espaciado.

      Al terminar, ningún `Colors.light` ni `fontSize` sin `fontFamily` queda en
      `componentes.tsx` ni en `marco.tsx`. (RF-20, RF-22, RF-23, RF-25, RF-28)
      Hecho cuando: en Chrome, Inicio, Obras y la bandeja de WhatsApp se ven en crema, con
      tarjetas blancas redondeadas, la cabecera de tabla en mayúsculas y los estados con sus
      colores de siempre.

- [ ] T12. Inicio de sesión y cambio de contraseña:
      - `pantalla-ingreso.tsx` como tarjeta blanca centrada, con el logo real, el título
        «Ingresar», los campos y el botón «Ingresar»;
      - `pantalla-cambiar-clave.tsx` con la misma tarjeta;
      - `marco-sesion.tsx` con el indicador de carga sobre crema.

      (RF-29, RF-30, RF-31)
      Hecho cuando: en Chrome, sin sesión:
      - se ve la tarjeta centrada sobre crema;
      - con datos malos sale el aviso de error dentro de la tarjeta;
      - con los buenos se entra;
      - «Cambiar contraseña» desde la barra muestra la misma tarjeta, con «Cancelar».

## Barrido

- [ ] T13. Prueba de frontera y barrido 1. La prueba nueva en `verificar` exige que:
      - ningún archivo del panel use `Colors.light`;
      - todo estilo con `fontSize` lleve `fontFamily`;
      - ningún archivo fuera del panel importe `fuentes.css`, `menu-lateral` ni
        `barra-superior`.

      Lleva una lista de archivos aún pendientes, que se vacía en T15. Se barren en esta
      tarea `detalle-preoperacional.tsx`, `pantalla-preoperacionales.tsx` y
      `ventana-de-secreto.tsx`. (RF-20, RF-22, RF-28, RF-34)
      Hecho cuando: la prueba está en verde con esos tres fuera de la lista de pendientes, y
      en Chrome un preoperacional NO APTO se sigue viendo en rojo con su ícono.

- [ ] T14. Barrido 2: `pantalla-partes.tsx`, `secciones-con-indice.tsx`, `editor-horario.tsx`
      y `whatsapp/propuesta-reporte.tsx`. (RF-20, RF-22, RF-28)
      Hecho cuando: los cuatro están fuera de la lista de pendientes, y en Chrome un parte
      diario abierto y una propuesta de WhatsApp se ven con el diseño nuevo, con el índice y
      las faltas legibles.

- [ ] T15. Barrido 3: `src/features/laboratorio/` (`pantalla-informe.tsx`,
      `tabla-tamices.tsx`, `curva-granulometrica.tsx` y `acciones-ensayo.tsx`) y lo que
      quede. La lista de pendientes queda **vacía** y se borra. (RF-20, RF-22, RF-28)
      Hecho cuando:
      - la prueba de frontera está en verde sin excepciones;
      - en Chrome, un ensayo y su informe se ven con las fuentes nuevas y el informe sigue
        imprimiéndose en blanco.

## Cierre

- [ ] T16. Validación final: recorrido RF por RF de la spec y demo manual. Incluye:
      - los siete pasos de la demo, como gerencia, residente y almacenista;
      - la ventana a 1280 con el menú abierto y a 1024 en `riel`;
      - las fuentes sin red;
      - `npx expo export --platform web`, con `dist/client/fuentes/` presente;
      - la comprobación de que la app del celular no cambió: `git diff` vacío en
        `src/components/ui`, `src/features/operador`, `src/features/checklists`,
        `src/features/auth` y `src/app/(operador)` respecto al punto de partida de la spec.

      (Todos)
      Hecho cuando: cada RF tiene su comprobación con resultado, los tres comandos están en
      verde y la spec queda marcada como Cumplida.

## Notas de ejecución

- El trabajo de la spec 021 está sin commit en el árbol. Para que la comprobación de RF-34 de
  T16 tenga un punto de partida limpio, conviene hacer el commit de la 021 antes de empezar
  T1, o anotar aquí el commit o el estado desde el que se compara.
