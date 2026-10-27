# Spec 032 — Ajustes de la bitácora y placa

> Estado: **Cumplida en desarrollo** el 2026-10-27 (T1–T16; RF-6 parcial, ver `validacion.md`) · despliegue (T17) en espera · aprobada el 2026-10-26 · Fecha: 2026-10-26
> Cambia:
> - la spec 004 (RF-50: las siete secciones obligatorias para cerrar; RF-52: foto de al menos una actividad);
> - la spec 003 (el vehículo se identifica por código interno);
> - la spec 029 (diseño de las filas con la casilla de observación).
> - Cambio del 2026-10-26 (al planificar): RF-11, RF-17, RF-17a, RF-20, RF-20a y dudas resueltas.

## Contexto y objetivo

Gerencia pidió tres ajustes a la bitácora antes de la reorganización por empresas (spec 033):

1. **Diseño más alineado.** Cada sección dibuja sus filas a su manera: rótulos y campos que no caen en las mismas columnas y renglones que podrían ir en una sola línea. La bitácora debe verse ordenada y ocupar menos alto.
2. **Placa en vez de código.** En la obra las máquinas y vehículos se nombran por su placa, no por el código interno que les puso el sistema. El código sobra: la bitácora, los reportes y todas las listas deben decir la placa. La maquinaria amarilla que no tiene placa se identifica por su número de serie o identificación.
3. **Días sin actividad o sin ensayo.** Hoy no se deja cerrar una bitácora si alguna sección está vacía, pero hay días en que la obra sí trabaja (hay máquinas y personal) y aun así no se ejecuta ninguna actividad del contrato o no se hace ningún ensayo. Para esos días hace falta poder dejar dicho, en la sección, que ese día no hubo actividad o ensayo y por qué, y así poder cerrar.

## Usuarios / actores

- **Residente / director de obra** (panel web, rol `supervisor`): llena y cierra la bitácora; marca los días sin actividad o sin ensayo.
- **Gerencia** (panel web, rol `admin`): lo mismo en todas las obras; registra y corrige vehículos con su placa.
- **Operador** (móvil): ve sus equipos por placa en el celular.
- **El sistema**: llena la bitácora desde los reportes de WhatsApp (spec 024) y reconoce las máquinas que nombran los reportes.

## Historias de usuario

- H1: Como residente quiero que las secciones de la bitácora tengan sus campos alineados y en menos renglones, para leerla y llenarla más rápido.
- H2: Como gerencia quiero que cada máquina y vehículo se identifique siempre por su placa (o su serie si no tiene placa), para que la bitácora diga lo mismo que se dice en la obra.
- H3: Como residente quiero marcar que hoy no se realizaron actividades, con su motivo, para poder cerrar la bitácora ese día.
- H4: Como residente quiero marcar que hoy no se realizaron ensayos, con su motivo, para poder cerrar la bitácora ese día.

## Requisitos funcionales (criterios de aceptación en EARS)

### Alineación de la bitácora (H1)

- RF-1: EL SISTEMA dibuja las filas de Maquinaria, Personal, Actividades y Control de calidad con los rótulos encima de cada campo.
- RF-2: EL SISTEMA alinea a la misma posición horizontal, en todas las secciones, la columna del nombre (máquina, persona, actividad o ensayo).
- RF-3: EL SISTEMA alinea a la misma posición horizontal, en todas las secciones, la casilla «¿Tienes alguna observación?» y el botón de quitar la fila.
- RF-4: MIENTRAS la ventana mide 1280 px o más, EL SISTEMA muestra una fila de Maquinaria sin observación en un solo renglón de campos (máquina, operador, lectura inicial, lectura final con su avance y casilla de observación).
- RF-5: MIENTRAS la ventana mide 1280 px o más, EL SISTEMA muestra una fila de Personal sin observación en un solo renglón de campos (persona, cargo, horas laboradas, horas extra, novedad y casilla de observación).
- RF-6: MIENTRAS la ventana mide 1280 px o más, EL SISTEMA muestra una fila de Actividades o de Control de calidad sin observación en un máximo de dos renglones de campos.
- RF-7: MIENTRAS la ventana mide menos de 768 px, EL SISTEMA apila los campos de cada fila uno debajo de otro sin desplazamiento horizontal.
- RF-8: EL SISTEMA conserva en la versión para imprimir/PDF el mismo orden de columnas que en pantalla.

### Placa en vez de código (H2)

- RF-9: EL SISTEMA exige la «Placa / identificación» al registrar o editar un vehículo o una máquina desde el panel.
- RF-10: SI ya existe otro vehículo vigente con la misma placa / identificación (sin distinguir mayúsculas, espacios ni guiones), ENTONCES EL SISTEMA rechaza el registro con el mensaje «Ya hay un vehículo con la placa X».
- RF-11: EL SISTEMA guarda la placa / identificación en mayúsculas, solo con letras y cifras («tay-076» se guarda «TAY076»).
- RF-12: EL SISTEMA deja de pedir y de mostrar el código interno del vehículo en el panel web.
- RF-13: EL SISTEMA muestra la placa / identificación en lugar del código en Vehículos, Asignaciones, Preoperacionales, Bitácoras, Reportes de WhatsApp, Reportes, Control Cantera y en las respuestas del asistente.
- RF-14: EL SISTEMA muestra la placa / identificación en lugar del código en la app del operador.
- RF-15: CUANDO se agrega una máquina a una bitácora abierta, EL SISTEMA guarda en ella la placa / identificación del vehículo.
- RF-16: CUANDO se vuelve a guardar una bitácora abierta que tenía máquinas con el código, EL SISTEMA las guarda con la placa / identificación.
- RF-17: EL SISTEMA deja las bitácoras cerradas con la identificación con la que se cerraron.
- RF-17a: EL SISTEMA muestra los preoperacionales, también los firmados antes del cambio, con la placa / identificación actual del vehículo (los preoperacionales no guardan una identificación propia; cambio del 2026-10-26).
- RF-18: CUANDO un reporte de WhatsApp nombra una máquina por su placa / identificación, EL SISTEMA la reconoce como hoy reconoce el código.
- RF-19: CUANDO un reporte de WhatsApp nombra una máquina por su código anterior, EL SISTEMA la sigue reconociendo.
- RF-20: SI un vehículo no tiene placa / identificación, ENTONCES EL SISTEMA lo muestra en todas las listas por su descripción (tipo, marca y modelo) con el aviso «Falta la placa» hasta que se le escriba.
- RF-20a: CUANDO un reporte de WhatsApp nombra una máquina nueva sin placa, EL SISTEMA la sigue creando sola (spec 026) sin placa y con el aviso de RF-20 (cambio del 2026-10-26).

### Día sin actividades (H3)

- RF-21: MIENTRAS la sección Actividades de una bitácora abierta no tiene ninguna actividad, EL SISTEMA muestra la casilla «Hoy no se realizaron actividades».
- RF-22: CUANDO se marca «Hoy no se realizaron actividades», EL SISTEMA pide el motivo en un campo de un renglón de hasta 200 caracteres.
- RF-23: SI la casilla está marcada sin motivo, ENTONCES EL SISTEMA no deja cerrar la bitácora y lo dice en la lista de lo que falta: «Actividades: falta el motivo de por qué no se realizaron».
- RF-24: MIENTRAS la casilla está marcada con motivo, EL SISTEMA da la sección Actividades por llena al cerrar.
- RF-25: MIENTRAS la casilla está marcada con motivo, EL SISTEMA no exige la fotografía de al menos una actividad.
- RF-26: MIENTRAS la casilla está marcada, EL SISTEMA oculta el botón de agregar actividad.
- RF-27: CUANDO un reporte de WhatsApp agrega una actividad a una bitácora con la casilla marcada, EL SISTEMA agrega la actividad y desmarca la casilla.
- RF-28: CUANDO se desmarca la casilla, EL SISTEMA borra el motivo al guardar.

### Día sin ensayos (H4)

- RF-29: MIENTRAS la sección Control de calidad de una bitácora abierta no tiene ningún ensayo ni material y la obra no tiene ensayos del módulo de Laboratorio ese día, EL SISTEMA muestra la casilla «Hoy no se realizaron ensayos».
- RF-30: CUANDO se marca «Hoy no se realizaron ensayos», EL SISTEMA pide el motivo en un campo de un renglón de hasta 200 caracteres.
- RF-31: SI la casilla está marcada sin motivo, ENTONCES EL SISTEMA no deja cerrar la bitácora y lo dice en la lista de lo que falta: «Control de calidad: falta el motivo de por qué no se realizaron».
- RF-32: MIENTRAS la casilla está marcada con motivo, EL SISTEMA da la sección Control de calidad por llena al cerrar.
- RF-33: MIENTRAS la casilla está marcada, EL SISTEMA oculta el botón de agregar ensayo.
- RF-34: CUANDO un reporte de WhatsApp agrega un ensayo a una bitácora con la casilla marcada, EL SISTEMA agrega el ensayo y desmarca la casilla.
- RF-35: CUANDO se desmarca la casilla, EL SISTEMA borra el motivo al guardar.

### Reglas transversales

- RF-36: EL SISTEMA muestra en la bitácora cerrada, en su PDF y en el módulo de Reportes el texto «No se realizaron actividades — <motivo>» o «No se realizaron ensayos — <motivo>» en lugar de la tabla vacía.
- RF-37: MIENTRAS la bitácora está marcada como día sin trabajo (004/RF-53), EL SISTEMA oculta las dos casillas, porque ese día ya no exige esas secciones.
- RF-38: EL SISTEMA no vuelve a evaluar las bitácoras cerradas antes de este cambio.

## Superficies afectadas

- [x] **Móvil** — la lista de equipos del operador, su preoperacional y su historial muestran la placa (RF-14). Requiere nueva versión de la app.
- [x] **Panel web** — Bitácoras (diseño y casillas), Vehículos (placa obligatoria, aviso de faltante), Asignaciones, Preoperacionales, Reportes de WhatsApp, Reportes, Control Cantera, Asistente.
- [x] **API** — alta y edición de vehículos (placa obligatoria y única); guardar y cerrar bitácora (casillas y motivos).
- [x] **Sincronización** — el pull lleva la placa al celular (ya la lleva; cambia qué se muestra).
- [x] **Datos** — bitácora: dos marcas con su motivo; vehículo: la placa pasa a ser la identificación única.
- [x] **Reglas** — lo que impide cerrar (`parte`), normalización y unicidad de la placa, reconocimiento de máquinas de WhatsApp. Casos nuevos en `verificar-reglas.ts`.

## Requisitos no funcionales

- Interfaz en español; tema claro (constitución, principio 7).
- A 1280 px, una bitácora con 5 máquinas, 5 personas, 3 actividades y 2 ensayos sin observaciones ocupa al menos un 25 % menos de alto que antes del cambio (se mide en Chrome antes y después).

## Casos límite

- **Sin señal**: no cambia nada para el operador; la placa ya viaja con su equipo desde la última bajada. Hasta que actualice la app verá el código.
- **Evidencia firmada**: las bitácoras cerradas conservan la identificación con la que se cerraron (RF-17) y no se reevalúan (RF-38). Los preoperacionales firmados no cambian; solo se ven con la placa actual (RF-17a).
- **Primer arranque / equipo recién activado**: el celular baja los equipos ya con su placa.
- Vehículos actuales sin placa: se listan antes del despliegue y gerencia escribe su placa o serie; no se inventan (RF-20).
- Dos vehículos con la misma placa escrita distinto («TAY 076» y «tay-076»): se tratan como la misma (RF-10).
- Bitácora con la casilla marcada a la que se le agrega una actividad a mano: la casilla ya no está visible (RF-21); por WhatsApp se desmarca sola (RF-27).

## Fuera de alcance

- La reorganización del panel por empresas (tarjetas y menús por empresa): spec 033.
- Borrar el código interno de la base de datos: deja de verse, pero se conserva.
- Reescribir la identificación de bitácoras cerradas o preoperacionales firmados.
- Marcas «sin registro» para Maquinaria, Personal o Clima.
- Publicar la nueva versión de la app móvil en las tiendas (se genera, la instala el usuario).

## Criterios de finalización

- Reglas puras (RF-10, RF-11, RF-19, RF-23–RF-25, RF-31, RF-32, RF-37, RF-38) con caso en `scripts/verificar-reglas.ts`.
- `npm run verificar`, `npm run typecheck` y `npm run lint` en verde.
- Demo manual en Chrome: crear un vehículo `PRUEBA-032` sin placa (rechazado) y con placa; agregarlo a una bitácora y ver la placa; marcar «Hoy no se realizaron actividades» y «Hoy no se realizaron ensayos» con motivo y cerrar; intentar cerrar sin motivo (bloquea); comparar el alto de la bitácora a 1280 px y ver la vista de 390 px.

## Dudas abiertas

- Resuelto el 2026-10-26: en producción hay 37 vehículos vigentes y 6 sin placa (todos creados por WhatsApp). Tres toman el número MC de su nombre (MC102417, MC035150, MC770197); el Montacargas diésel, la Motoniveladora Komatsu GD555 y el Vibrocompactador Volvo quedan con «Falta la placa» hasta que el usuario dé su placa o serie. No hay placas repetidas.
