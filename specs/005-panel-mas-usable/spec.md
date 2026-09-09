# Spec 005 — Un panel que se pueda usar y que diga algo

> Estado: Borrador · Fecha: 2026-09-09

## Contexto y objetivo

El pedido original decía "intuitiva, moderna, empresarial, visualmente atractiva". Ninguna
de esas cuatro palabras se puede comprobar: dos personas mirando la misma pantalla darían
respuestas distintas, y nadie sabría nunca cuándo está terminado. Así que esta spec traduce
la intención a cosas que sí se pueden mirar y decir sí o no.

Y la intención, mirando el panel de hoy, se concreta en tres carencias reales:

**No se puede corregir nada.** Una persona o un vehículo registrados con un dato mal escrito
solo se arreglan dándolos de baja y volviéndolos a crear. La capacidad de editar existe por
debajo, pero ninguna pantalla la ofrece.

**La pantalla de inicio no dice nada.** Son seis números que cuentan filas. La gerencia entra
a saber cómo va la obra y sale sabiendo cuántas obras hay registradas, que es un dato que ya
sabía.

**Faltan piezas básicas.** No hay ventana de confirmación, ni filtros, ni forma de buscar,
ni de moverse por una lista larga. Con tres obras y cien vehículos, las tablas actuales
dejan de servir.

## Usuarios / actores

- **Gerencia** — entra a revisar cómo va todo; necesita ver el estado de un vistazo.
- **Residente** — entra a trabajar todos los días; necesita llegar rápido a lo suyo.

## Historias de usuario

- H1: Como gerencia quiero corregir un dato mal registrado sin dar de baja el registro, para
  no ensuciar el histórico por una letra.
- H2: Como gerencia quiero que la pantalla de inicio me diga cómo va la operación, para
  saber dónde mirar sin abrir los siete módulos.
- H3: Como residente quiero encontrar rápido un vehículo o una persona en una lista larga,
  para no leer cincuenta filas cada vez.
- H4: Como cualquiera de los dos quiero entender qué pasó cuando algo sale mal, para poder
  arreglarlo yo en vez de llamar por teléfono.

## Requisitos funcionales (criterios de aceptación en EARS)

### Se puede corregir (H1)

- RF-1: EL SISTEMA permitirá modificar los datos de una obra, un vehículo y una persona ya
  registrados, sin darlos de baja.
- RF-2: CUANDO se modifique un registro, EL SISTEMA guardará solo los campos que cambiaron y
  dejará los demás intactos.
- RF-3: SI una modificación deja un campo obligatorio vacío, ENTONCES EL SISTEMA la
  rechazará indicando cuál.
- RF-4: SI se va a dar de baja un registro, ENTONCES EL SISTEMA pedirá confirmación
  explicando qué implica, antes de hacerlo.

### El inicio dice cómo va la operación (H2)

- RF-5: EL SISTEMA mostrará en el inicio, para el periodo consultado: las horas de máquina
  registradas, qué parte de ellas fue improductiva, y qué porcentaje de los equipos activos
  tiene su preoperacional del día.
- RF-6: EL SISTEMA permitirá elegir el periodo del resumen entre hoy, la última semana y el
  último mes.
- RF-7: EL SISTEMA mostrará los equipos que quedaron **no aptos** y los que no tienen
  preoperacional del día, con acceso directo a cada uno.
- RF-8: SI el periodo consultado no tiene datos, ENTONCES EL SISTEMA lo dirá con un mensaje
  que explique por qué puede estar vacío, en lugar de mostrar ceros o un espacio en blanco.
- RF-9: EL SISTEMA presentará la misma información en forma de tabla, además de en forma
  gráfica, para que se pueda leer sin depender de la vista.
- RF-10: EL SISTEMA nunca usará el color como única forma de distinguir una serie o un
  estado: siempre irá acompañado de texto, ícono o etiqueta directa.
- RF-11: EL SISTEMA respetará el alcance por obra en el resumen: el residente ve el de su
  obra y la gerencia el de todas.

### Encontrar las cosas (H3)

- RF-12: EL SISTEMA permitirá buscar por texto en los listados de vehículos, personas,
  preoperacionales y bitácoras.
- RF-13: EL SISTEMA permitirá filtrar esos listados por obra y por estado.
- RF-14: MIENTRAS un listado tenga más filas de las que caben en pantalla, EL SISTEMA
  mostrará cuántas hay en total y permitirá recorrerlas por partes.
- RF-15: CUANDO se recargue o se comparta la dirección de un listado filtrado, EL SISTEMA
  conservará el filtro aplicado.

### Se entiende qué pasó (H4)

- RF-16: CUANDO una operación falle, EL SISTEMA mostrará qué se intentaba hacer, qué salió
  mal y qué puede hacer el usuario, en español y sin códigos técnicos.
- RF-17: CUANDO una operación tenga éxito, EL SISTEMA lo confirmará de forma visible sin
  interrumpir el trabajo.
- RF-18: MIENTRAS una operación esté en curso, EL SISTEMA lo indicará e impedirá lanzarla
  dos veces.
- RF-19: SI un listado está vacío, ENTONCES EL SISTEMA explicará qué se registra ahí y cómo
  crear el primero, en lugar de mostrar una tabla en blanco.

### Que se vea bien de verdad (todas)

- RF-20: EL SISTEMA mostrará todas las columnas de cada tabla dentro del ancho de la
  pantalla en un portátil de 1366 puntos de ancho, sin que ninguna quede fuera de la vista.
- RF-21: EL SISTEMA permitirá recorrer y accionar cualquier pantalla con el teclado, con el
  elemento enfocado siempre visible.
- RF-22: EL SISTEMA cumplirá una relación de contraste mínima de 4.5:1 entre el texto y su
  fondo en toda la interfaz.
- RF-23: EL SISTEMA usará un único origen de estilos: ninguna pantalla define un color, un
  tamaño de letra ni un espaciado por su cuenta.

## Superficies afectadas

- [ ] **Móvil** — sin cambios. Las reglas de campo (tamaño mínimo, sol, guantes) no se
  tocan; esta spec es solo de escritorio.
- [x] **Panel web** — todas las pantallas.
- [x] **API** — consultas de resumen para el inicio; el resto no cambia de contrato.
- [ ] **Sincronización** — sin impacto.
- [ ] **Datos** — sin cambios de esquema.
- [ ] **Reglas** — sin cambios; el resumen usa los cálculos de horas y de actividades
  improductivas que ya existen.

## Requisitos no funcionales

- El resumen del inicio responde en menos de 2 segundos con un año de datos de tres obras.
- La paleta de las gráficas se valida contra daltonismo antes de darse por buena, no a ojo.
- El panel sigue siendo de tema claro. No se añade modo oscuro.

## Casos límite

- **Sin señal**: no aplica, el panel es de escritorio.
- **Evidencia firmada**: la edición de RF-1 alcanza al maestro (obras, vehículos, personas).
  **Nunca** a un preoperacional firmado ni a una bitácora cerrada, que se anulan.
- **Primer arranque**: con la base recién sembrada, todos los listados están vacíos y el
  inicio no tiene datos. RF-8 y RF-19 son exactamente ese caso.
- Una obra con **un año** de preoperacionales: el resumen y los listados tienen que seguir
  respondiendo.
- Una pantalla estrecha (portátil de 1366) frente a un monitor grande: RF-20.
- Dos pestañas abiertas editando el mismo registro.

## Fuera de alcance

- Modo oscuro.
- Exportar a hoja de cálculo o a PDF, e informes imprimibles.
- Cambiar la interfaz de la app móvil.
- Rehacer la navegación en algo distinto de la barra superior actual.
- Personalización por usuario (columnas a gusto, tableros configurables).
- Cualquier métrica que exija datos que hoy no se capturan.

## Criterios de finalización

- Cada RF con su comprobación: contraste (RF-22), ancho de tabla (RF-20) y validación de
  paleta como comprobaciones ejecutables; el resto, como paso de demo manual descrito.
- Demo manual: corregir el nombre de un vehículo sin darlo de baja; ver el resumen con datos
  de una semana y comprobar el porcentaje de cumplimiento contra el listado de
  preoperacionales; buscar una persona por apellido en una lista de más de cincuenta;
  recorrer la pantalla de vehículos entera con el tabulador.
- Revisión contra el catálogo de errores de visualización antes de dar por buena cualquier
  gráfica.

## Dudas abiertas

- [NECESITA ACLARACIÓN: "actividad improductiva" ya está marcado en la lista de actividades
  de la bitácora, pero esa lista está pendiente de validación por OCC. ¿Sirve como está para
  medir rendimiento, o hay que revisarla antes?]
- [NECESITA ACLARACIÓN: ¿el resumen del inicio es el mismo para gerencia y para el
  residente, o cada uno necesita ver cosas distintas?]
- [NECESITA ACLARACIÓN: ¿hay una imagen de marca de OCC (logo, colores corporativos) que el
  panel deba usar? Hoy usa un azul genérico y las letras "OCC" en un cuadro.]
