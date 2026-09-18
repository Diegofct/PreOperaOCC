# Tareas — Spec 006

Tareas de menos de 30 minutos, ordenadas por dependencia. Cada una lleva los RF que
cubre y una línea `Hecho cuando:` que se pueda comprobar sin interpretar.

**Se implementa una tarea cada vez** (`/sdd:implementar T1`), y al terminarla se para.
Ninguna tarea se marca sin `npm run verificar`, `npm run typecheck` y `npm run lint`
en verde.

El orden va de lo que no depende de nada a lo que lo consume: primero los tokens, luego las
reglas puras con sus casos, después la barra —que es un cambio cerrado y da una victoria
temprana—, después los preoperacionales, y al final el parte, que es el grande.

## Los cimientos

- [x] T1. Tokens de `theme.ts`: `Grosor`, `AnchoLadoBarra`, `AnchoMinimoBarraCentrada`,
      `AnchoIndiceDeSecciones`, `AnchoContenidoConIndice` y `AnchoMinimoDosColumnas`.
      Corregir el comentario de `Panel.accionSuave` en `paleta.ts`, que hoy dice que sirve
      para el enlace activo de la barra y la barra no lo usa. (RF-1, RF-3, RF-5, RF-6, RF-16)
      Hecho cuando: `AnchoContenidoConIndice` se calcula a partir de `MaxContentWidthPanel` y
      no es un número suelto, y los tres comandos están en verde.

- [x] T2. Unificar la aritmética de fechas en `src/shared/rules/jornada.ts`: `sumarDias`,
      `restarDias` y `PERIODOS`, retirando las **cuatro** copias de hoy —`festivos.ts`,
      `pantalla-preoperacionales.tsx`, `pantalla-partes.tsx` y `resumen+api.ts`—.
      (RF-18, RF-19, RF-20)
      Hecho cuando: `grep -rn "function sumarDias\|function restarDias" src` devuelve una sola
      línea, hay casos en verde para un cambio de mes, un año bisiesto y el 29 de febrero, y
      `resumen+api.ts` sigue devolviendo las mismas cifras que antes.

- [x] T3. `src/shared/rules/parte.ts`: `seccionesDelParte()` y `bloqueosDelCierre()`, puras y
      sin importar nada de `features/`. (RF-8, RF-9, RF-12, RF-13, RF-28, RF-29)
      Hecho cuando: están en verde los casos de un parte recién abierto con todo vacío, una
      máquina y dos personas encendiendo solo esas dos secciones, `notas: '   '` contando como
      vacío, `fotos: null` dando `desconocido` y nunca `vacio`, el histórico ausente si no hay
      ninguna bitácora vieja **cerrada**, y los tres bloqueos del cierre con **el mismo texto
      literal** que hoy devuelve la ruta.

- [x] T4. `src/app/api/panel/partes/[id]/cerrar+api.ts` llama a `bloqueosDelCierre()` en vez
      de repetir la lógica. (RF-13)
      Hecho cuando: la ruta no tiene ninguna comprobación de cierre escrita en línea, los
      mensajes y los códigos de estado son idénticos a los de antes, y cerrar un parte
      incompleto desde el panel devuelve el mismo rechazo que devolvía.

## La barra

- [x] T5. Barra de navegación: `enlaces` pierde `flex: 1`, marca y cuenta pasan a dos columnas
      de base idéntica, dos renglones explícitos por debajo de `AnchoMinimoBarraCentrada`, y
      anillo de foco en la pastilla. (RF-1, RF-2, RF-3, RF-4)
      Hecho cuando: con sesión de gerencia (7 módulos) y con sesión de residente (4) el bloque
      de enlaces queda centrado **respecto a la barra**, no respecto al hueco; estrechando la
      ventana la barra pasa a dos renglones sin que los enlaces se peguen a la marca; y
      tabulando por los enlaces se ve dónde está el teclado.

## Los preoperacionales

- [x] T6. `src/app/api/panel/preoperacionales+api.ts`: acepta `?periodo=hoy|semana|mes`,
      la ventana incluye una fila si su inicio **o** su llegada caen dentro, devuelve
      `recibidoEn` y devuelve `motivoVacio`. Actualizar `contratos.ts` y `cliente-api.ts`.
      (RF-18, RF-19, RF-20, RF-21, RF-24)
      Hecho cuando: `GET /api/panel/preoperacionales` sin parámetros responde la última
      semana; el acta de VOL-01 —iniciada el 2026-09-03, recibida el 2026-09-07— **aparece**
      en esa respuesta; la guardia sigue siendo `requerirPermiso(…, 'preoperacionales',
      'listar')` y el alcance sigue saliendo de `filtroDeObra`; y una sesión de supervisor sin
      obra recibe `motivoVacio: 'sin_obra'`.

- [x] T7. `src/features/panel/usar-parametro-direccion.ts`: sacar de
      `usar-listado-filtrado.ts` lo que hoy guarda `?buscar=` y generalizarlo a cualquier
      clave. `usar-listado-filtrado.ts` pasa a usarlo. (RF-30)
      Hecho cuando: el ayudante no menciona la palabra `buscar`, la búsqueda de Personas y
      Vehículos sigue sobreviviendo a una recarga igual que antes, y escribir en el buscador
      sigue sin llenar el historial de una entrada por letra.

- [x] T8. `pantalla-preoperacionales.tsx`: selector de periodo guardado en la dirección,
      «Hora» pasa a ser el día de trabajo, entra la columna «Llegó» con la marca de retraso,
      el aviso de flota se queda anclado a hoy, y los vacíos dicen cuál de los vacíos son.
      Anchos nuevos: 110 · 130 · 120 · 190 · 150 · 200 · 110 · 90. (RF-18 a RF-25, RF-30)
      Hecho cuando: al entrar sin tocar nada se ve el acta de VOL-01 con su fecha de llegada y
      su marca, sin haber pulsado «día anterior» ni una vez; recargar conserva el periodo; el
      aviso rojo sigue hablando de hoy con cualquier periodo; una búsqueda que no case ofrece
      quitarla; y la prueba de anchos sigue en verde (gasto 1244 de 1280).

## Las piezas del parte

- [x] T9. `componentes.tsx`: `Tabla` gana `variante?: 'tarjeta' | 'desnuda'`, con `'tarjeta'`
      por defecto. (RF-5, RF-6)
      Hecho cuando: ninguna de las nueve pantallas que ya usan `Tabla` cambia de aspecto, y
      `'desnuda'` quita fondo, sombra y radio conservando el desplazamiento horizontal.

- [x] T10. `src/features/panel/secciones-con-indice.tsx`: `DisposicionConIndice`,
      `IndiceDeSecciones`, `MarcoDeSecciones`, `SeccionEnMarco` y `PieDeSeccion`.
      `MarcoPantalla` gana `refDesplazamiento?` **opcional**. (RF-5, RF-6, RF-7, RF-16)
      Hecho cuando: las piezas existen con sus estilos saliendo de los tokens de T1, el marco
      lleva sombra **sin borde** —que es lo que dice el comentario de `Sombra` y lo que
      `Bloque` incumplía—, y las otras nueve pantallas no pasan `refDesplazamiento` y siguen
      compilando y viéndose igual.

- [x] T10b. `src/constants/medidas.ts` **(nuevo)**: módulo puro, sin `react-native` ni
      `global.css`, con lo que es un número y no depende de la plataforma —`Spacing`,
      `MaxContentWidth`, `MaxContentWidthPanel`, `Radio`, `SeparacionTactil`, `Grosor` y los
      cinco anchos de la spec 006—. `theme.ts` los **reexporta**, así que ningún otro archivo
      del proyecto cambia de import. (RF: — · habilita el `Hecho cuando` de T11)
      Hecho cuando: `npx tsx -e "import('./src/constants/medidas.ts').then(m =>
      console.log(m.AnchoContenidoConIndice))"` imprime **1036** desde Node sin colgarse;
      `grep -rn "from '@/constants/theme'" src | wc -l` da el mismo número que antes de la
      tarea; `BottomTabInset` se queda en `theme.ts`, porque usa `Platform.select` y es
      justamente lo que no puede cruzar; y los tres comandos en verde.

## El parte diario

> **T11 no se parte en dos.** El presupuesto de ancho y la disposición de dos columnas van
> juntos: en cuanto el contenido del parte deja de tener 1280, la prueba de anchos empieza a
> decir que las tablas caben cuando ya no caben, y eso no se nota hasta que alguien abre el
> panel en el portátil de la obra.

- [x] T11. El armazón: el parte pasa a `DisposicionConIndice`, la cabecera del día queda
      fuera a ancho completo, la tabla histórica se estrecha a 130 · 170 · 150 · 80 · 210 ·
      110, y `scripts/verificar-reglas.ts` pasa a tener **presupuesto de ancho por archivo**
      —988 para `pantalla-partes.tsx`, 1280 para el resto— importando los tokens de
      `medidas.ts` (T10b) en vez de los literales escritos a mano, **incluido el 1280 y el 16
      que ya estaban a mano antes de esta spec**. (RF-5, RF-6, RF-16)
      Hecho cuando: la prueba de anchos falla si se le devuelve a la tabla histórica cualquiera
      de sus anchos viejos —comprobarlo a propósito antes de dejarlo—, el parte se ve en dos
      columnas, y el gasto de la tabla histórica es 962 de 988.

- [x] T12. El índice: una entrada por sección, en el orden que dicta `seccionesDelParte`, con
      glifo, conteo y `accessibilityLabel`; al pulsar, la vista salta a esa sección.
      (RF-7, RF-8, RF-9, RF-10, RF-14)
      Hecho cuando: escribir una persona **sin guardar** no enciende su entrada y guardarla sí;
      pulsar «Laboratorio» lleva la vista a esa sección; y el estado se distingue con el
      tabulador y con el lector de pantalla, no solo por el color.

- [x] T13. El índice se queda a la vista al desplazarse, es recorrible con el teclado, y su
      pie dice si el parte está cerrado o qué falta para cerrarlo, usando
      `bloqueosDelCierre()`. (RF-11, RF-12, RF-13, RF-17)
      Hecho cuando: el pie nombra «A Pedro C. le falta la hora de salida» **antes** de pulsar
      Cerrar, y dice exactamente lo mismo que respondería el servidor. Si `position: 'sticky'`
      no funciona en esta versión de React Native Web, se deja escrito que RF-11 queda sin
      cumplir en vez de darlo por bueno.

- [x] T14. Las bitácoras por máquina solo se muestran si están **cerradas**, y cuando se
      muestran entran en el índice sin contar como pendiente. (RF-28, RF-29)
      Hecho cuando: el parte del 2026-09-10, que tiene una bitácora vieja **abierta**, ya no
      muestra ese bloque; y ninguna fila de `bitacoras` se ha borrado de la base.

## Desnudar las secciones, una a una

> El primer intento de rehacer este formulario (spec 005) se hizo con un reemplazo global,
> descuadró las etiquetas y hubo que revertirlo. Por eso van en tres tandas y no en una.

- [x] T15. Maquinaria y Personal pasan a `SeccionEnMarco`: fuera `Bloque` y `Formulario`, el
      selector de añadir baja a `PieDeSeccion` y «Guardar» sube a la cabecera de la banda.
      (RF-5, RF-6, RF-15)
      Hecho cuando: las etiquetas de los campos siguen alineadas con sus casillas, las dos
      secciones siguen guardando por separado, y no queda ninguna caja blanca dentro del marco.

- [x] T16. Actividades, Clima y Laboratorio, igual. La tabla de laboratorio en solo lectura
      pasa a `variante="desnuda"`. (RF-5, RF-6, RF-15)
      Hecho cuando: la foto por actividad se sigue conservando al volver a guardar, el aviso de
      franjas de clima solapadas se sigue viendo, y cada una guarda por su cuenta.

- [x] T17. Notas, Fotografía del día y Cerrar la jornada. Izar el listado de fotos a la
      pantalla para que el índice sepa cuántas hay. Retirar `Bloque` de `componentes.tsx`.
      (RF-5, RF-6, RF-8, RF-15)
      Hecho cuando: subir una foto sigue refrescando la tira y ahora además enciende esa
      entrada del índice; `grep -rn "Bloque" src` no devuelve ningún uso; y las dos secciones
      que hoy no tienen superficie ya no parecen restos colgados del fondo gris.

- [ ] T18. Validación final: recorrido RF por RF de la spec + demo manual. (Todos)
      Hecho cuando: cada uno de los 30 RF tiene su comprobación con resultado escrito, los tres
      comandos están en verde, el acta de VOL-01 se ve al entrar a Preoperacionales sin tocar
      nada, y la spec queda marcada como Cumplida.

## Arreglo posterior a la revisión

- [x] T19. Los desplegables se pintan por encima de lo que tienen debajo, en el parte y en
      preoperacionales. (Defecto, no RF nuevo: RF-5 y RF-6 ya exigían que el parte se leyera
      como un documento, y una lista que no se puede leer no lo cumple.)
      Hecho cuando: abrir un selector en Maquinaria tapa a Personal y no al revés; abrir el de
      una fila tapa a la fila siguiente; y en Preoperacionales el periodo tapa al filtro de
      máquina y al aviso de flota.

## Notas de ejecución

**T1 (2026-09-11).** Los seis tokens y la corrección del comentario de `Panel.accionSuave`,
con los tres comandos en verde. `AnchoContenidoConIndice` se calcula
(`MaxContentWidthPanel - AnchoIndiceDeSecciones - Spacing.four` = 1036) y no está escrito.

> **Hallazgo que obliga a corregir T11 antes de llegar a ella.**
> El plan dice que `scripts/verificar-reglas.ts` «importe los tokens en vez de los literales».
> **No se puede como está escrito**: ese guion corre en Node y `src/constants/theme.ts` abre
> con `import '@/global.css'` y `import { Platform } from 'react-native'`, ninguno de los dos
> resoluble fuera de Metro. Por eso el `1280` de la prueba está hoy escrito a mano con un
> comentario que dice de dónde sale: no era descuido, era esta limitación.
>
> El proyecto ya resolvió este mismo problema una vez: `src/constants/paleta.ts` existe
> separado de `theme.ts` precisamente para que la prueba de contraste pueda importarlo, y su
> cabecera lo dice. La salida es la misma —un módulo de medidas puro, sin `react-native`, que
> `theme.ts` reexporte— pero mueve `Spacing`, `MaxContentWidthPanel` y `Radio`, que usa medio
> proyecto. **Es una tarea propia, no un «ya que estoy» dentro de T11.**
>
> **Resuelto el 2026-09-11: entra como T10b**, justo antes de T11. Así T11 puede importar de
> verdad y de paso desaparece el 1280 escrito a mano que ya arrastraba la prueba desde la
> spec 005.

**T2 (2026-09-11).** Las cuatro copias retiradas; `sumarDias`, `restarDias` y `PERIODOS` viven
en `jornada.ts` y `restarDias` delega en `sumarDias`, así que la aritmética se escribe una sola
vez. De 91 a **94 verificaciones**.

- El `Hecho cuando` pedía que el `grep` devolviera **una** línea y devuelve **dos**: las dos
  definiciones exportadas de `jornada.ts`. Lo que importaba —que la aritmética esté en un solo
  sitio— se cumple; la redacción de la tarea estaba mal puesta.
- Los tres casos nuevos **fallaron antes de implementar** (`sumarDias is not a function`), que
  es lo que los hace valer algo. Uno de ellos es el caso real de VOL-01 con sus fechas.
- `festivos.ts` gana un import de `jornada.ts`. No hay ciclo: `jornada.ts` no importa nada.
- El primer intento dejó un aviso de lint (`import/first`) por colocar el import después de la
  primera función. Corregido antes de marcar.

**T3 (2026-09-11).** `src/shared/rules/parte.ts` con las dos funciones y **once casos** nuevos.
De 94 a **105 verificaciones**. Los casos fallaron antes de implementar
(`Cannot find module '../src/shared/rules/parte'`).

- El módulo es puro de verdad: un solo import, y es a `./jornada`. Las dos coincidencias de
  `features/` que devuelve un `grep` están dentro del comentario que explica por qué no se
  importa de ahí.
- `bloqueosDelCierre` devuelve **la lista entera** y no el primero, porque el índice quiere
  enseñarlos todos. Eso solo es compatible con la ruta si el primer elemento es el mismo, así
  que el orden —vacío, máquinas, personas— es contrato y no estética. Hay un caso que lo fija.
- Los textos se copiaron **literalmente** de `cerrar+api.ts` y los casos comparan la cadena
  completa, que es lo que impide que T4 los cambie sin querer.
- `ParteEvaluable.actividades` es `unknown[]`: de las actividades solo se mira cuántas hay, y
  declarar su forma sería prometer que esta regla las entiende.
- Decidido aquí y no en el plan: **un parte anulado cuenta como cierre resuelto**. Decir que
  le falta cerrarse sería pedir algo que ya nadie puede hacer. Tiene su caso.

**T4 (2026-09-11).** La ruta delega: `const bloqueos = bloqueosDelCierre(parte); if
(bloqueos.length > 0) return errorDePeticion(bloqueos[0], 400);`. No queda ninguna
comprobación en línea —comprobado con `grep` sobre `validarAvance`, `mensajeDeAvance`,
`length === 0`, `persona.entrada` y el texto del parte vacío: cero coincidencias—. El archivo
pasa de 105 a 86 líneas. Las 105 verificaciones siguen en verde.

- **El círculo queda cerrado**: a partir de aquí el índice (T13) y el servidor leen la misma
  función, así que no pueden discrepar sobre qué falta para cerrar.
- La ruta perdió el comentario que explicaba los topes de medidor —24 horas u 800 km— porque
  se fue con el código. Lo repuse en `bloqueosDelCierre`, que es donde ahora vive la decisión,
  y ajusté la cabecera de la ruta: ya no dice que sea ella quien exige que el parte esté
  completo, porque no lo es. Mover código sin mover su porqué es como se pierden las razones.
- **Queda un paso manual pendiente** para dar RF-13 por comprobado de punta a punta: intentar
  cerrar un parte incompleto desde el panel y ver el mismo rechazo. Los casos de T3 fijan el
  texto, pero nadie ha ejercitado la ruta entera todavía. Va en la demo de T18.

- T4 y T13 tienen que dar **el mismo texto**: el que el residente lee cuando no le deja
  cerrar. Si alguna vez discrepan, es que alguien volvió a escribir la regla dos veces.
- T11 es la única tarea que no se puede partir, y la razón está en el recuadro de arriba.
- T14 no borra nada. Las seis bitácoras del formato viejo se quedan en la base; lo único que
  cambia es que el panel deja de enseñar las que nunca se cerraron.

**T5 (2026-09-11).** Barra centrada por simetría: `marca` y `cuenta` comparten
`flexBasis: AnchoLadoBarra` con el mismo `flexGrow`, y `enlaces` pierde el `flex: 1`. Los tres
comandos en verde.

- El centrado **no depende de lo que mida el centro**, que es lo que hace que se vea igual con
  los cuatro módulos del residente y con los siete de la gerencia. Es la propiedad que pedía
  RF-2 y la razón de no usar `justifyContent: 'center'` a secas.
- Ventana estrecha (RF-3): régimen de **dos renglones explícitos** con `useWindowDimensions`,
  no `flexWrap` suelto. Con `flexWrap` lo primero que baja de renglón es la cuenta y los
  enlaces vuelven a pegarse a la marca — el defecto de hoy con otro disfraz.
- El enlace se extrajo a `EnlaceDeModulo` para que cada uno lleve su propio estado de foco
  (RF-4), con el mismo anillo que los campos del panel desde 005/T11c.
- **Corregido durante la tarea:** el primer intento tipaba `ruta: string` y necesitaba un
  `as never` para que `Link` lo aceptara. Eso es peor que un `any`: apaga la comprobación de
  rutas de Expo Router, y una ruta mal escrita llegaría a producción sin que nadie la viera.
  Ahora el tipo sale de la propia tabla (`(typeof ENLACES)[Modulo]['ruta']`) y no hay ninguna
  conversión forzada en el archivo.
- Los tres `borderWidth: 1` del archivo pasan a `Grosor.linea`. Es el único archivo migrado;
  el barrido del resto sigue fuera de alcance.
- **Falta verlo**: que esté centrado de verdad es cosa de ojos. Va en la demo de T18.

**T6 (2026-09-11).** La ruta acepta `?periodo=`, la ventana mira las dos fechas, devuelve
`recibidoEn` y `motivoVacio`. `contratos.ts` y `cliente-api.ts` al día. Los tres en verde.

**Comprobado contra la base real**, ejecutando la misma ventana de la ruta (última semana
desde el 2026-09-11, en hora de obra):

| Ventana | Filas |
| --- | --- |
| Solo por fecha de inicio (lo de antes) | **0** |
| Por cualquiera de las dos (lo de ahora) | **1 — VOL-01, inicio 09-03, llegada 09-07** |

- **`pendientes` pasó a ser consulta propia.** Estaba sacado de `filas`, y con un periodo de
  una semana eso lo rompía en silencio: una máquina inspeccionada el lunes desaparecía del
  aviso del viernes sin haberse revisado ese día. El aviso dejaría de avisar justo de lo que
  existe para avisar. Ahora se consulta anclado a hoy (RF-23).
- `motivoVacio` lo decide **el servidor**, que es quien sabe que no devolvió nada por falta de
  alcance. Deducirlo en la pantalla sería escribir dos veces la misma regla. El alcance no se
  relaja: sigue sin ver nada, solo deja de ser un vacío mudo.
- `delDia` se conserva junto a `delPeriodo`: navegar a un día concreto sigue teniendo sentido
  y es lo que usa hoy la pantalla.
- **Dos tropiezos corregidos en la tarea**: un import quedó insertado dentro de otro bloque de
  import (lo cantó `typecheck`), y `inArray` entró sin usarse. Ninguno llegó a marcarse.

**T7 (2026-09-11).** `usar-parametro-direccion.ts` con `useParametroDeDireccion(clave,
porDefecto)`, y `usar-listado-filtrado.ts` pasa a usarlo. Los tres en verde.

- Se comporta como un `useState`, así que sustituyó al que había sin tocar nada más de la
  pantalla. La única mención de `buscar` que queda en el ayudante está en el comentario que
  cuenta de dónde vino.
- **Añadido sobre lo que había**: el valor por defecto no se escribe en la dirección. Una
  dirección limpia se comparte y se lee mejor que una llena de parámetros que no dicen nada.
  Antes solo se omitía la cadena vacía, que para la búsqueda era lo mismo; para el periodo no.
- `Platform` deja de importarse en `usar-listado-filtrado.ts`: la comprobación de plataforma
  se fue con el código.
- **Falta verlo**: que Personas y Vehículos sigan conservando la búsqueda al recargar. Va en
  la demo de T18, y es lo primero que se rompería si este cambio estuviera mal.

**T8 (2026-09-11).** La pantalla abre en la última semana, con selector de periodo guardado en
la dirección, columna «Día de trabajo», columna «Llegó» con marca de retraso, y vacíos que
dicen cuál de los vacíos son. Los tres en verde, **incluida la prueba de anchos**: ocho
columnas, gasto **1244 de 1280**, holgura 36.

- La navegación día a día **no se quitó**, se volvió opcional: «Ver un día concreto» entra en
  ese modo y «Volver al periodo» sale. Preguntar «¿qué se firmó el martes?» sigue siendo
  directo.
- La marca de retraso usa `Etiqueta tono="atencion"` con el texto «09-07 · tarde», no solo un
  color (RF-14 vale también aquí).
- **Cuatro vacíos, cuatro textos.** No alcanzar ninguna obra, no haber nada en el periodo, y
  que lo escondan la búsqueda o el filtro. El primero es el que más caro sale —una cuenta mal
  configurada ve un panel que parece vacío y nadie sabe por qué— y ahora se nombra, con la
  salida escrita: pedirle a gerencia que le asigne su obra.
- Cuando hay filas pero ninguna pasa los filtros, el texto dice **cuántas hay** y qué filtro
  las esconde, en vez del genérico de antes.
- Renombrado: la variable `dia` de la respuesta pasó a `ventana`, porque `dia` ahora significa
  otra cosa —el día concreto al que se ha navegado— y tener las dos con el mismo nombre era
  pedir un error.

**T9 (2026-09-11).** `Tabla` gana `variante?: 'tarjeta' | 'desnuda'`, con `'tarjeta'` por
defecto. Los tres en verde.

- Cambio **aditivo**: ninguna de las nueve pantallas que ya la usan pasa el prop, así que
  ninguna cambia. Era el requisito de no romper nada al tocar un componente compartido.
- `'desnuda'` solo quita fondo, sombra y radio. El `ScrollView` horizontal se queda: una tabla
  ancha sigue desplazándose dentro de su sitio y no empuja la página de lado.

**T10 (2026-09-11).** `secciones-con-indice.tsx` con `DisposicionConIndice`,
`IndiceDeSecciones`, `MarcoDeSecciones`, `SeccionEnMarco`, `PieDeSeccion` y el ayudante
`useSaltoASeccion`. `MarcoPantalla` acepta `refDesplazamiento?`. Los tres en verde.

- **Nada existente se modificó**: `Seccion` intacta, y el prop nuevo de `MarcoPantalla` es
  opcional, así que las otras nueve pantallas no se enteran de que existe.
- El marco lleva **sombra sin borde**, que es lo que dice el comentario de `Sombra` en el tema
  y lo que `Bloque` incumplía llevando los dos.
- El glifo de estado (`●` `○` `·`) es un carácter de texto y no un `View` coloreado: sobrevive
  al alto contraste del sistema y lo lee un lector de pantalla. Cada entrada lleva además el
  conteo escrito y su `accessibilityLabel` (RF-14).
- La entrada activa usa `Panel.accionSuave` con borde a la izquierda, no una pastilla sólida:
  entre nueve entradas en columna, los rellenos sólidos se leen como una hilera de manchas. La
  barra sí usa el sólido, y con razón — ahí son siete en fila.
- `useSaltoASeccion` guarda las medidas en un `ref` y no en estado: medir no debe repintar. Si
  se pulsa antes del primer `onLayout`, **no se desplaza**: quedarse quieto es mejor que llevar
  a alguien al principio de la página sin avisar.
- `position: 'sticky'` va con conversión acotada a esa propiedad, como ya se hace con
  `boxShadow`. **Queda por comprobar en pantalla** que esta versión de React Native Web lo
  respeta; si no, RF-11 se declara incumplido y no se tapa.

**T10b (2026-09-11).** `src/constants/medidas.ts`, puro, y `theme.ts` lo reexporta con
`export * from './medidas'`. Los tres en verde.

**El `Hecho cuando`, ejecutado:**

```
AnchoContenidoConIndice = 1036
MaxContentWidthPanel = 1280 | Spacing.three = 16 | Radio.md = 12
```

desde Node, con `tsx`, sin colgarse. Es exactamente lo que no se podía hacer y por lo que la
prueba de anchos llevaba los números escritos a mano.

- **Ningún archivo cambió de import**: siguen siendo 29 `from '@/constants/theme'` en `src/`.
  Esa es la propiedad que hacía barata la mudanza y la que había que comprobar.
- Los bloques se movieron **verbatim**, con sus comentarios. Un token sin su porqué es un
  número suelto a los seis meses.
- `Fonts` y `BottomTabInset` se quedan en `theme.ts`: usan `Platform.select` y son justo la
  frontera que este archivo existe para marcar.
- **Ojo con `tsx -e`**: envuelve el módulo en `default`, así que un `import()` desde `-e` hace
  creer que no hay exports. No es problema del módulo — desde un archivo, que es como lo va a
  usar `verificar-reglas.ts`, funciona. Perdí un rato con eso.

**T11 (2026-09-11).** Armazón de dos columnas, tabla histórica estrechada (1080 → 850 de
columnas) y presupuesto de ancho por archivo, **todo en la misma tarea**. Los tres en verde.

**La comprobación que exigía el `Hecho cuando`, hecha de verdad:** le devolví a la columna
«Actividades» su ancho viejo (210 → 280) y la prueba falló —

```
AssertionError: pantalla-partes.tsx: la tabla gasta 1032 de 988
```

— y al restaurarlo volvió a verde. Una prueba que no ha fallado nunca no ha demostrado nada.

- **Error mío atrapado por esa misma comprobación.** El primer presupuesto restaba `MARGEN`
  (32, el relleno de la tabla) en vez del relleno de la **banda** (`Spacing.four` a cada lado,
  48). Daba 1004 en vez de 988: dieciséis puntos de más, justo lo que no se habría visto hasta
  tener la pantalla delante. Lo delató el número del mensaje de fallo, no el verde.
- La prueba ya no lleva literales: importa `Spacing`, `MaxContentWidthPanel` y
  `AnchoContenidoConIndice` de `medidas.ts`. Desaparecen el 1280, el 16 y el 32 escritos a
  mano que arrastraba desde la spec 005.
- El índice ya se pinta con `seccionesDelParte`, pero **el conteo de fotos va en `null`** a
  propósito: izarlo es T17. La regla lo traduce a «comprobando», nunca a «sin registrar», que
  es justo el caso para el que se inventó ese tercer estado.
- `historicoCerradas` va en 0 hasta T14.
- Las secciones **siguen con su `Bloque`** dentro del marco, así que ahora mismo se ven cajas
  blancas dentro de una caja blanca. Es feo y es intencional: desnudarlas va sección por
  sección en T15, T16 y T17, porque el reemplazo global ya falló una vez en la spec 005.

**T14 (2026-09-11).** El bloque histórico solo aparece si hay bitácoras viejas **cerradas**, y
cuando aparece entra en el índice sin contar como pendiente. Los tres en verde.

- Con los datos reales de hoy —seis bitácoras, **las seis abiertas**— el bloque **desaparece**
  de todos los días, que es lo que se acordó. Y `alContar(0)` hace que el índice tampoco
  ofrezca esa entrada: ir a una sección que no está pintada sería peor que no ofrecerla.
- **Ninguna fila se borra.** Es un filtro de pantalla, no una baja: el principio 4 de la
  constitución sigue intacto, y una bitácora cerrada de verdad se seguiría viendo, que es lo
  que prometía 004/RF-36.
- Se filtran también las anuladas, que antes salían etiquetadas. Una bitácora anulada del
  formato viejo es doblemente irrelevante para el parte de hoy.

**Nota de orden, decidida al implementar:** T12 y T13 —el índice que salta y el que avisa de
lo que falta— necesitan que las secciones ya sean bandas con su medida, y eso lo hacen T15,
T16 y T17. Se ejecutan en ese orden: T14, T15, T16, T17, T12, T13, T18. Los números no
cambian; cambia en qué orden se tocan.

**T15 (2026-09-11).** Maquinaria y Personal pasan a `SeccionEnMarco`: fuera `Bloque` y
`Formulario`, el selector de añadir baja a `PieDeSeccion` y «Guardar» sube a la cabecera de la
banda. Los tres en verde.

- Se hizo con **anclas únicas por sección**, no con un reemplazo global. `Bloque` y
  `Formulario` aparecen en cinco secciones; un `replace` sin acotar habría tocado las cinco a
  la vez, que es exactamente lo que descuadró las etiquetas en la spec 005.
- El botón perdió el apellido: «Guardar maquinaria» pasa a «Guardar» porque ahora está en la
  cabecera de su propia banda, con el rótulo al lado. Repetirlo sería ruido.
- **`alMedir` es obligatorio en `PropsSeccion`, no opcional.** El `typecheck` cantó las cuatro
  secciones que aún no lo pasaban y hubo que cablearlas ya. Eso es lo que se quiere: si mañana
  alguien añade una sección y se olvida de medirla, el índice la ofrecería y no llevaría a
  ninguna parte — así no compila.

**T16 (2026-09-11).** Actividades, Clima y Laboratorio pasan a bandas. La tabla de laboratorio
en solo lectura usa `variante="desnuda"`. Los tres en verde.

- **Un fallo atrapado por el `typecheck`**: en Laboratorio cerré con `</PieDeSeccion>` un
  bloque que abría con `<Acciones>`. `Expected corresponding JSX closing tag for 'Acciones'` —
  el compilador lo dijo antes de que llegara a ninguna pantalla. Es la clase de error que un
  reemplazo global habría repartido por las cinco secciones a la vez.
- `SeccionClima` tenía la firma en una sola línea y no en varias como las demás, así que el
  script falló al buscarla. **No escribió nada**: los `assert` van antes del guardado, y el
  archivo quedó intacto hasta que la corregí.
- `Bloque` se queda sin usos en el parte y sale de su import. Retirarlo de `componentes.tsx`
  es T17; aquí solo se limpia lo que este archivo dejó de usar.

**T17 (2026-09-11).** Notas, Fotografía del día y Cerrar la jornada pasan a bandas; el listado
de fotos se iza a la pantalla; `Bloque` retirado de `componentes.tsx`. Los tres en verde.

- **El histórico también se convirtió aquí**, no en T14. T14 le dio su conteo al índice, pero
  sin ser banda no tenía medida y el índice habría ofrecido una entrada que no lleva a ninguna
  parte. Su tabla va `variante="desnuda"`.
- **Las fotos se izaron**, que es lo que enciende su entrada del índice. Mientras cargan, el
  conteo va en `null` y la regla lo traduce a «comprobando» — nunca a «sin registrar», que
  sería mentir durante el segundo en que alguien decide si le falta subir la foto del día.
  Se descartó añadir el conteo a la respuesta del parte: tocar contrato, ruta y serialización
  para un dato que la misma pantalla ya está pidiendo.
- `Bloque` retirado tras comprobar que no le quedaba ningún consumidor. Las coincidencias que
  devuelve un `grep` de «Bloque» son todas `marcadoEnBloque`, que es otra cosa.
- En el parte queda **un solo `Seccion`**: la cabecera del día. Va fuera del marco a propósito
  — es el selector de contexto, no una parte del documento.

**T12 (2026-09-11).** El índice pinta una entrada por sección en el orden que dicta
`seccionesDelParte`, con glifo, conteo y `accessibilityLabel`, y al pulsar salta a la banda.
Los tres en verde.

- Quedó cableado al convertir las bandas (T15–T17): `saltarA` no podía funcionar hasta que
  cada sección tuviera su `alMedir`. Por eso se ejecutó después y no antes.
- El estado sale del parte **guardado**, no de lo tecleado. Cada sección arranca del parte y
  al guardar se recarga el día, así que la entrada se enciende justo cuando el dato dejó de
  poder perderse.

**T13 (2026-09-11).** El índice se queda a la vista, es recorrible con el teclado, y su pie
dice si el parte está cerrado o **qué** falta para cerrarlo. Los tres en verde.

- El pie usa `bloqueosDelCierre`, **la misma función que llama la ruta de cierre** para
  rechazar. No es una copia ni una aproximación: si el índice dijera una cosa y el servidor
  otra, el residente no sabría a cuál hacerle caso. Ese era el objetivo de T3 y T4.
- Un parte anulado muestra «Anulado» y no pide cerrarlo: pedir algo que ya nadie puede hacer
  es peor que no decir nada.
- **Sin comprobar todavía**: que `position: 'sticky'` funcione en esta versión de React Native
  Web. Si no funciona, **RF-11 queda incumplido y hay que decirlo**, no taparlo. Es el primer
  punto de la demo de T18.

**T18 (2026-09-11) — NO marcada.** El recorrido RF por RF está escrito en
`specs/VALIDACION.md`, y las cuatro comprobaciones automáticas están en verde: 105
verificaciones, typecheck, lint y una exportación web completa sin filtrar secretos.

Pero **trece de los treinta requisitos no los ha visto funcionar nadie**, porque necesitan el
panel levantado con dos cuentas. La tarea se queda sin marcar a propósito: darla por hecha
sería declarar verificado lo que no se ejecutó, que es justo lo que esta fase existe para
evitar.

Lo que más caro sale si falla, y por eso va primero en la demo: que las otras cinco pantallas
del panel sigan viéndose igual. Se tocaron `Tabla`, `MarcoPantalla` y se retiró `Bloque`.

**T19 (2026-09-11).** Los desplegables se metían detrás del componente de abajo, tanto en el
parte como en preoperacionales. Los tres en verde.

**Era una regresión, y de un problema que este proyecto ya había resuelto.** El archivo
`pantalla-bitacoras.tsx` —retirado al empezar esta sesión, porque la spec 004 lo había dejado
huérfano— llevaba escrito el diagnóstico entero: React Native Web le pone `z-index: 0` a toda
vista, así que los hermanos empatan, y con el empate manda el orden de pintado. El
`zIndex: 10` que lleva un desplegable abierto solo lo sube **dentro de su propio contenedor**,
que es justo donde no hace falta.

La protección que quedaba viva estaba en `Formulario` (`zIndex: 1`), y se fue al desnudar las
secciones en T15-T17.

Qué se apila ahora, y siempre **al revés** —los primeros más arriba— porque una lista cae
hacia abajo y lo que hay que tapar es lo que viene después:

- **Las bandas del parte**, con el índice que sale de `IDS_DE_SECCION`, exportado desde la
  regla. Una sola fuente para el orden: el índice que lleva a cada banda y el apilado salen
  de la misma lista, así que no pueden discrepar.
- **Las filas dentro de cada banda** (`FilaDeFormulario` gana `apilado`), en las cinco
  secciones que tienen filas con selector.
- **El pie de banda**, que también puede llevar un selector.
- **En preoperacionales**, el periodo por encima del filtro de máquina, y los dos por encima
  del aviso de flota y de la tabla.

Se tipó `IdDeSeccion` en vez de forzar la conversión: el primer intento llevaba un
`id as never` para indexar la lista, que es la misma clase de atajo que ya había que deshacer
en T5. Cero conversiones forzadas en los cuatro archivos tocados.

**Sin comprobar todavía**: esto se ve o no se ve, y hay que abrir un desplegable. Va con el
resto de la demo.

**T19, segunda pasada (2026-09-11).** Faltaba el selector de «Resultado» del listado de
preoperacionales, y **era una causa distinta** de la de la primera pasada.

Aquí no eran hermanos empatados dentro del mismo contenedor: la barra de listado ya llevaba
`zIndex: 2`, pero ese 2 **no puede salir de su `Seccion`**. React Native Web le pone
`z-index: 0` a toda vista, así que cada `Seccion` es su propio contexto de apilamiento y lo de
dentro sube solo dentro. Fuera, la `Seccion` empata a cero con sus hermanas, y en esta
pantalla —la única de las cinco— hay algo **después** del listado: la nota del pie, que tiene
fondo propio. Ganaba por orden de pintado y tapaba la lista abierta.

`Seccion` gana un `apilado?` opcional. Es aditivo: las otras cuatro pantallas tienen su
listado al final, no lo pasan y no cambian. Solo lo usa quien tiene algo debajo.

La lección, que es la que conviene que quede escrita: **en este panel, un `zIndex` solo vale
entre hermanos**. Cada vez que una lista desplegable se meta detrás de algo, la pregunta no es
«¿tiene bastante zIndex?», sino «¿cuál es el primer ancestro común, y quién gana ahí?».

## T18 — recorrido en el navegador del 2026-09-17

Hecho con la sesión de gerencia (nueve módulos), sobre el parte del 17 y el del 16, y sobre
Preoperacionales. **No se guardó nada.** Las medidas de centrado, de índice pegado y de salto
se tomaron con JavaScript sobre la página, no a ojo.

| RF | Qué se miró | Resultado |
| --- | --- | --- |
| 1 | Centro de los nueve enlaces contra el centro de la barra: **desviación 0 px** en 1536 de ancho | verde |
| 2 | Ocultando cinco enlaces para simular los cuatro del residente: **desviación 0 px** otra vez | verde |
| 3 | Barra en dos renglones por debajo de 1100 | **pendiente**: la ventana de Chrome está maximizada y no acepta que se la redimensione desde aquí |
| 4 | Tabulador sobre la barra: el foco llega a cada enlace en orden y **se ve el recuadro** (comprobado en «Obras») | verde |
| 7 | El índice lista las nueve secciones en el orden del documento | verde |
| 8 | «Control Cantera 1» y «Actividades 3» frente a «sin registrar» en las vacías | verde |
| 9 | Texto escrito en Notas **sin guardar**: el índice sigue diciendo «Notas · sin registrar» | verde |
| 10 | Pulsando «Notas» en el índice, la vista salta de 0 a 1089 px y «Notas y observaciones» queda arriba del marco | verde |
| 11 | `position: sticky`; desplazando a 600, 1200 y hasta el final, el índice **se queda en top 133 y sigue a la vista** | verde |
| 12 | «Abierto» junto a la obra y «Cerrar la jornada · sin registrar» en el índice | verde |
| 13 | Recuadro «Falta cerrar» nombrando lo que falta **antes** de intentar cerrar: «Falta llenar: Maquinaria, Personal, Actividades, Clima, Control Calidad de Obra, Notas y Fotografía del día.» | verde |
| 14 | Cada entrada lleva «○ / ●» y la palabra «sin registrar»: el color no es la única señal | verde |
| 16 | El índice como tira por debajo de 1000 | **pendiente**: misma razón que RF-3 |
| 17 | Tabulador sobre el índice: el foco llega a «Maquinaria» con su recuadro | verde |
| 18 | Periodo «Último mes»: 19 de agosto — 17 de septiembre, con su registro | verde |
| 19 | Al abrir sin elegir nada: «Última semana», 11 — 17 de septiembre | verde |
| 21, 22 | El acta de VOL-01 del **2026-09-03** aparece con columna «LLEGÓ» = **«2026-09-07 · tarde»**, resaltada | verde |
| 23 | «Hoy hay 3 máquinas sin preoperacional (CAM-405, EXC-01, VOL-01)», con el periodo en «Último mes» | verde |
| 25 | Búsqueda sin resultados: «0 de 1», botón «Limpiar» y el texto «Hay 1 preoperacional(es) en este periodo, pero ninguno pasa la búsqueda …. Quítelo para verlos todos.» | verde |
| 30 | Recargando `?periodo=mes&buscar=…`: vuelven el periodo y la búsqueda | verde |

**Es el caso que motivó la spec, y se ve funcionando:** el preoperacional firmado el 3 de
septiembre que llegó el 7 ya no está escondido (RF-18, RF-20 a RF-22).

`npm run verificar` 193 · `typecheck` y `lint` sin hallazgos.

**Falta para cerrar T18 (2 de 30 RF):** RF-3 y RF-16, los dos de ventana estrecha. La
extensión no puede redimensionar una ventana maximizada de Chrome; con la ventana restaurada
se comprueban en un minuto. La spec sigue **Aprobada**, no Cumplida.

**Intentos de cerrar RF-3 y RF-16 desde aquí (2026-09-18), los tres fallidos:** redimensionar
la ventana (Chrome la ignora mientras está maximizada), abrir una ventana aparte de 1050 px
(el navegador bloquea las emergentes) y falsear el ancho que lee la app (`window.innerWidth`
redefinido: la pantalla se rompe, porque React Native Web lo lee de varias formas). Queda
**pendiente de que alguien estreche la ventana a mano**.

Lo que sí se puede afirmar, **por construcción y no por demo** (`barra-navegacion.tsx`,
`medidas.ts`): el régimen de dos renglones existe y se activa con
`width < AnchoMinimoBarraCentrada` (1100) **o** cuando lo medido no cabe; en ese régimen los
enlaces se mueven en el árbol para quedar debajo de la marca y la cuenta —no con un `order` de
CSS— y conservan su `justifyContent: 'center'`. El centrado no sale de un `justifyContent`
sobre la fila entera sino de que los dos lados comparten la misma base de flex, que es lo que
lo hace independiente del número de módulos (RF-2, ya comprobado midiendo).
