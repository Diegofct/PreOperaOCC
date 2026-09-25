# Validación — las cinco specs

> Fecha: 2026-09-10 · Fase 7 del flujo SDD

Recorrido de lo que se puede comprobar sin levantar el panel, y lista explícita de lo que
**no** se comprobó. Un requisito que solo se puede ver funcionando queda marcado como tal;
no se da por verificado lo que no se ejecutó.

## Lo que se ejecutó

| Comando | Resultado |
| --- | --- |
| `npm run verificar` | **91 verificaciones correctas** |
| `npm run typecheck` | sin errores |
| `npm run lint` | sin hallazgos |
| `npx expo export --platform web` | exporta; `grep DATABASE_URL dist/client` sin coincidencias |

Migraciones aplicadas en Neon: cargo de personas, llantas, partes de obra y el relleno de
cargo de los operadores que ya existían.

## Por spec

### 001 — Permisos por rol · 15 RF · sin dudas abiertas

| Cómo se comprueba | RF |
| --- | --- |
| Casos en verde | 4, 5, 6, 7, 8, 9, 10, 13, 14 |
| Por construcción: la tabla de permisos la leen el servidor y el menú | 1, 2, 11 |
| Ya se cumplía: la sesión se lee de la base en cada petición | 12 |
| **Falta demo** | 3, 15 |

### 002 — Cargos de personas · 12 RF · 3 dudas abiertas

| Cómo se comprueba | RF |
| --- | --- |
| Casos en verde | 2, 3, 6, 8 |
| Migración aditiva y nullable, con relleno para los operadores previos | 1, 5, 12 |
| **Falta demo** | 4, 7, 9, 10, 11 |

Dudas: si se añade el cargo «Gerente»; si «Auxiliar» y «Auxiliar Ambiental» son distintos;
si a un Conductor se le exige lo mismo que a un Operador.

### 003 — Vehículos, medidores y llantas · 15 RF · 1 duda abierta

| Cómo se comprueba | RF |
| --- | --- |
| Casos en verde | 3, 4, 9, 11, 12, 14, 15 |
| Plantillas v2 generadas; las v1 siguen en el servidor para las actas firmadas | 8 |
| Rutas y pantalla | 1, 2, 5, 6, 7, 10, 13 |
| **Falta demo** | 1, 2, 5, 6, 10, 13 |

Duda: hay que decirle a OCC que el formato de camioneta y volqueta ya no coincide con su
Excel, que mantiene la casilla de horómetro.

### 004 — Bitácora de obra · 44 RF · 2 dudas abiertas

| Cómo se comprueba | RF |
| --- | --- |
| Casos en verde | 10, 11, 12, 17, 18, 26, 27, 28, 38, 39, 40, 42, 43 |
| Índice único parcial por obra y fecha | 1, 2, 7 |
| Rutas: guardado parcial, cierre, anulación, fotografías | 3 a 9, 13 a 16, 19 a 25, 29 a 37 |
| Por construcción: no se calcula dinero | 41 |
| **Falta demo** | casi todo lo de captura |

Dudas: la unidad de medida de cada actividad —lo que falta para calcular área y volumen— y
cómo se cierra el parte de un día sin trabajo.

### 005 — Panel más usable · 25 RF · 1 duda abierta

| Cómo se comprueba | RF |
| --- | --- |
| Casos en verde | 12 (búsqueda sin tildes), 20 (anchos de tabla), 22 (contraste 4.5:1) |
| Ventanas de corrección que mandan solo lo que cambió | 1, 2, 3 |
| Confirmación de baja que dice qué implica | 4 |
| Resumen del inicio, por rol y por periodo | 5, 6, 7, 8, 9, 10, 11, 24, 25 |
| Búsqueda, filtros, paginación y filtro en la dirección | 13, 14, 15 |
| Estados vacíos, avisos y estado «guardando» | 16, 17, 18, 19 |
| Anillo de foco en campos, botones y selectores | 21 |
| Todo el color sale de `constants/paleta` | 23 |
| **Falta demo** | 21 (recorrer con el tabulador de verdad) |

Duda: para medir horas improductivas hay que atar cada actividad a las máquinas que la
ejecutaron; es una decisión de negocio.

## Lo que no se comprobó, y por qué

**La demo manual entera.** Necesita el panel levantado con dos cuentas —una de gerencia y
una de residente con obra asignada— y un celular activado. Nada de eso se puede hacer desde
aquí, y dar por verificado lo que no se ejecutó sería el peor resultado posible de una fase
de validación.

Lo que hay que mirar con el panel delante, en orden de lo que más caro sale si falla:

1. **Entrar como residente** y comprobar que ve cuatro módulos, que Obras, Vehículos y
   Personas le responden con aviso, y que su inicio no muestra cifras de esos tres.
2. **Que Asignaciones y Bitácoras siguen cargando** con sesión de residente: dependen de
   poder *listar* vehículos y personas aunque no vea esos módulos. Es lo que más fácil se
   rompe al cerrar un permiso de más.
3. **Llenar un parte completo**, cerrarlo, comprobar que los medidores avanzaron —kilómetros
   en la camioneta, horas en la retro—, anularlo y abrir otro el mismo día.
4. **Subir una fotografía** al parte y a una actividad, y comprobar que la de la actividad
   sigue ahí después de volver a guardar.
5. **Recorrer una pantalla con el tabulador** sin tocar el ratón.
6. **Corregir** una persona, un vehículo y una obra sin darlos de baja.

## Un aviso que no es técnico

Hay una cuenta de supervisor sin obra asignada que, antes de la spec 001, veía todo. Después
del cambio no ve nada. Si existe alguna así en producción, hay que asignarle su obra antes
de que alguien se quede a oscuras sin entender por qué.

---

# Validación — Spec 006

> Fecha: 2026-09-11 · Fase 7 del flujo SDD · **Veredicto: cumplida a medias, y falta la demo**

Las 18 tareas de código están hechas y en verde. Lo que **no** está hecho es el recorrido con
el panel delante, y sin eso hay trece requisitos que nadie ha visto funcionar.

## Lo que se ejecutó

| Comando | Resultado |
| --- | --- |
| `npm run verificar` | **105 verificaciones correctas** (eran 91 al empezar) |
| `npm run typecheck` | sin errores |
| `npm run lint` | sin hallazgos |
| `npx expo export --platform web` | exporta entero, sin errores |
| `grep DATABASE_URL dist/client` | vacío |
| `grep SECRETO_TOKENS dist/client` | vacío |

**Sin migraciones**: esta spec no tocó ninguno de los dos esquemas.

## Por RF

### Comprobado con una prueba automática (9)

| RF | Cómo |
| --- | --- |
| 8, 9 | `seccionesDelParte`: una máquina y dos personas encienden solo esas dos; `notas: '   '` cuenta como vacío |
| 12 | el cierre se da por resuelto tanto si se cerró como si se anuló |
| 13 | los tres bloqueos, con **el texto literal** que devuelve la ruta, y en el mismo orden |
| 20 | con las fechas reales de VOL-01: el 09-03 cae fuera de la última semana y el 09-07 dentro |
| 28, 29 | el histórico solo entra si hay alguna cerrada, y va al final sin contar como pendiente |
| 19 | `PERIODOS`: la última semana son siete días contando hoy, no ocho |
| 5, 6 | la prueba de anchos falla si se le devuelve a la tabla histórica un ancho viejo — **comprobado a propósito**: `la tabla gasta 1032 de 988` |

### Comprobado contra la base real (2)

| RF | Cómo |
| --- | --- |
| 20, 21 | la ventana nueva ejecutada contra Neon: **0 filas** por fecha de inicio, **1 fila —VOL-01—** mirando las dos |
| 28 | las seis bitácoras del formato viejo están **todas abiertas**, así que el bloque desaparece de todos los días |

### Por construcción, leyendo el código (6)

| RF | Por qué se sostiene |
| --- | --- |
| 15 | cada sección sigue llamando a `api.partes.guardar` con lo suyo; no se tocó el guardado |
| 23 | `pendientes` pasó a consulta propia anclada a hoy, con su ventana de 24 h |
| 24 | `motivoVacio` lo calcula el servidor, que es quien sabe que el alcance dejó la consulta en cero |
| 26 | no se tocó un solo archivo de `src/features/operador/`, `checklists/` ni `sync/` |
| 27 | no hay un solo `UPDATE` ni `DELETE` nuevo: la spec entera es de lectura y presentación |
| 30 | el periodo usa el mismo ayudante que la búsqueda, que ya sobrevivía a una recarga |

### **Falta demo. Nadie ha visto esto funcionar** (13)

| RF | Qué hay que mirar |
| --- | --- |
| 1, 2 | que los enlaces estén centrados respecto a la **barra**, con 7 módulos y con 4 |
| 3 | estrechar la ventana por debajo de 1100 y ver los dos renglones |
| 4, 17 | recorrer enlaces e índice con el tabulador y ver dónde está el foco |
| 7, 10 | pulsar cada entrada del índice y comprobar que la vista salta a su banda |
| 11 | **que el índice se quede pegado al desplazarse.** Si `position: sticky` no funciona en esta versión de React Native Web, **RF-11 queda incumplido y hay que escribirlo**, no taparlo |
| 14 | que el estado se distinga sin mirar el color |
| 16 | estrechar por debajo de 1000 y ver el índice subir como tira, sin desaparecer |
| 18, 22 | abrir Preoperacionales sin tocar nada y ver el acta de VOL-01 con su columna «Llegó» y su marca |
| 25 | dejar una búsqueda que no case y comprobar que ofrece quitarla |

## Lo que no se comprobó, y por qué

**La demo entera.** Necesita el panel levantado con dos cuentas —gerencia y un residente con
obra— y mirar la pantalla. No se puede hacer desde aquí, y dar por bueno lo que no se ejecutó
sería el peor resultado posible de una fase de validación.

Hay además **dos comprobaciones de ida y vuelta** que las pruebas no alcanzan:

1. **Cerrar un parte incompleto** desde el panel y ver que el rechazo del servidor dice lo
   mismo que el pie del índice. Los casos fijan los textos por separado; nadie ha ejercitado
   la ruta entera desde que T4 movió la lógica.
2. **Subir una foto** al parte y comprobar que la entrada del índice se enciende. El listado
   de fotos se izó a la pantalla en T17 y ese cableado solo se ve funcionando.

En orden de lo que más caro sale si falla:

1. Que las otras cinco pantallas del panel **sigan viéndose igual**. Se tocaron `Tabla`,
   `MarcoPantalla` y se retiró `Bloque`; si algo se movió en Obras, Vehículos, Personas,
   Asignaciones o Inicio, es que un cambio compartido se coló.
2. El parte diario entero: llenar, guardar sección por sección, cerrar.
3. Preoperacionales: el caso de VOL-01, que es el que originó la spec.
4. La barra, con las dos cuentas.

# Validación — Spec 018

> Fecha: 2026-09-25 · Fase 7 del flujo SDD · Laboratorio: ensayo de granulometría (LAB-FR-01-2025)

Recorrido de los 112 RF, uno por uno. Lo que no se pudo ejecutar se marca como pendiente y
se dice qué lo cierra; no se da por verificado lo que no se ejecutó.

## Lo que se ejecutó

| Comando | Resultado real |
| --- | --- |
| `npm run verificar` | **300 verificaciones correctas** |
| `npm run typecheck` | `tsc --noEmit && tsc --noEmit -p tsconfig.scripts.json` sin errores |
| `npm run lint` | `expo lint`, código de salida 0, sin hallazgos |
| `npx expo export --platform web` | exporta (`Exported: dist`); `grep` de `DATABASE_URL`, `SECRETO_TOKENS` y `R2_LLAVE_SECRETA` en `dist/client` sin coincidencias |

Migraciones `0015` (rol), `0016` (interruptor) y `0017` (tabla y columna del parte) aplicadas
en Neon **desarrollo** (`neondb`). **Producción (`preoperaocc`) no se ha tocado.**

Demos en Chrome, con la sesión de gerencia, sobre la obra de pruebas **PRUEBA-018** (creada
en desarrollo para esta spec). Las de T9 a T19 contra un segundo servidor en el 8082; las de
T21 a T23 contra el `npm run web` de Diego (8081), arrancado después del último cambio de la
API. El detalle de cada demo está en las notas de `018-laboratorio-granulometria/tareas.md`.

**Leyenda.** `V:NNNN` = caso en `scripts/verificar-reglas.ts`, línea NNNN · `Tn` = demo
hecha en la tarea n · **P1** = falta probarlo con una cuenta de laboratorista (o de
residente) · **P2** = falta un cierre de parte real por la ruta, con foto en R2 · **P3** =
falta la vista previa real de impresión · **A** = depende de una duda abierta de la spec.

## Por RF

### Acceso (RF-1 a RF-10)

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-1 | V:2380; migración `0015` añade `laboratorista` a `rol_usuario` | verde |
| RF-2 | V:2427 (`PUEDE_DAR`, `motivoParaNoDarRol`); las rutas de personas ya lo usan | verde (regla) · en vivo **P1** |
| RF-3 | V:2456 | verde |
| RF-4 | V:2380, V:2387 (`modulosVisibles`); Diego, 2026-09-25: la laboratorista solo ve Laboratorio | verde |
| RF-5 | V:2380 (`moduloDeEntrada`) | verde (regla) · en pantalla **P1** |
| RF-6 | `filtroDeObra` / `alcanzaLaObra` en `ensayoAlAlcance` y en el listado (lectura) | **P1** |
| RF-7 | Igual que RF-6; Diego, 2026-09-25: un residente de PRUEBA-018 ve el módulo; el de OBR-001 (sin el módulo) no | verde (ve el módulo de su obra) · que no vea ensayos de otra obra **P1** |
| RF-8 | T11 (obra apagada no se lista), T19 (selector solo ofrece PRUEBA-018) | verde |
| RF-9 | T11 a T21: todo el flujo se hizo con la gerencia | verde |
| RF-10 | V:2440 (`motivoDeRechazo`); la guardia lo devuelve en el 403 | verde (regla) · en vivo **P1** |

### El módulo por obra (RF-11 a RF-16)

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-11 | Migración `0016`; T9 (API), T17 (casilla «Lleva laboratorio») | verde |
| RF-12 | T6: las tres obras existentes quedaron con `laboratorio = false` | verde |
| RF-13 | V:2542; T9 (alta de PRUEBA-018 nació encendida); T17 (casilla marcada en el alta) | verde |
| RF-14 | V:2463, V:2491, V:2572; el 403 por obra lo da `requerirPermiso` (017) | verde (regla) · 403 en vivo y aviso con nombre en la obra **P1** |
| RF-15 | T15 (sección vacía con el módulo apagado), T23 (parte de OBR-001 sin ensayos) | verde |
| RF-16 | T11: al volver a encender, el ensayo reapareció | verde |

### Catálogo de franjas (RF-17 a RF-22)

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-17 | V:4590 | verde |
| RF-18 | V:4606 (los diez renglones del anexo A) | verde |
| RF-19 | Solo SBG-50 en el catálogo | **sin cubrir — A** (qué franjas y con qué límites) |
| RF-20 | T20 (selector de franja); V:4958 (el envío la exige) | verde |
| RF-21 | T12: la franja se copia entera al ensayo y se juzga con la copia | verde |
| RF-22 | T12 (quitar y volver a escoger la franja en un borrador) | verde |

### Registro del ensayo (RF-23 a RF-32)

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-23 | T11 (API), T19 («Nuevo ensayo») | verde |
| RF-24 | T20 (encabezado completo) | verde |
| RF-25 | T20 (las cuatro masas, con coma decimal); V:5163 | verde |
| RF-26 | V:4568; T20 (16 renglones) | verde |
| RF-27 | V:4659 (`t_2: 0`); T20 | verde |
| RF-28 | T20, T21 (guardar con y sin observaciones) | verde |
| RF-29 | T20 (campo Obra de solo lectura) | verde |
| RF-30 | El informe muestra el nombre y código de la obra, no el contrato | **sin cubrir — A** (la obra no guarda contrato) |
| RF-31 | V:4958; T20 (borrador guardado sin el fondo) | verde |
| RF-32 | T20 (no hay casillas de TM/TMN; salen en Resultados) | verde |

### Validaciones (RF-33 a RF-41)

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-33 | V:4895, V:5069; T20 (tara negativa marcada) | verde |
| RF-34 | V:4910; T12 (400 en `masas.seca`) | verde |
| RF-35 | V:4910 | verde |
| RF-36 | V:4910 | verde |
| RF-37 | V:4927 (mensaje con las dos cifras) | verde |
| RF-38 | V:4940; T20 (ejecución anterior a recepción marcada) | verde |
| RF-39 | V:4940; en vivo hoy: `POST` con recepción 2026-09-30 → 400 en `fechaRecepcion` | verde |
| RF-40 | V:4997, V:5119; T11 (« no.6 » → 409 en `numeroInforme`) | verde |
| RF-41 | T13 (descartado: su número volvió a quedar libre); índice único parcial en `0017` | verde |

### Cálculo (RF-42 a RF-56)

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-42 | V:5045; T11 (veredicto y resultado falsos en el cuerpo, ignorados) | verde |
| RF-43 | T20 (porcentajes, curva y veredicto sin guardar) | verde |
| RF-44 | V:4659 (3,2 %) | verde |
| RF-45 | V:4692 | verde · **A** (si la tara se resta también a la masa húmeda y a M2) |
| RF-46 | V:4659 | verde |
| RF-47 | V:4659 | verde |
| RF-48 | V:4659 (los quince `% pasa` del Excel) | verde |
| RF-49 | V:4659, V:4711 | verde · **A** (definición que usa OCC) |
| RF-50 | V:4659, V:4711 | verde · **A** (definición que usa OCC) |
| RF-51 | V:4701 | verde |
| RF-52 | V:4659; T20 (fondo sin `% pasa`) | verde |
| RF-53 | V:4769; T20 | verde |
| RF-54 | V:4769; T20 (0,70 %, aviso sin bloquear) | verde |
| RF-55 | V:4753, V:5177 | verde |
| RF-56 | V:4730; T20 | verde |

### Veredicto (RF-57 a RF-63)

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-57 | V:4822 | verde |
| RF-58 | V:4822, V:4753 (69,995 → 70,00) | verde |
| RF-59 | V:4845 | verde |
| RF-60 | V:4794 | verde |
| RF-61 | V:4845; T20 («▲ Por encima» en el 1½") | verde |
| RF-62 | T19, T20, T23 («✓ CUMPLE» / «✗ NO CUMPLE», con texto) | verde |
| RF-63 | V:4860 | verde |

### Curva granulométrica (RF-64 a RF-69)

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-64 | T18 (eje X logarítmico en mm, eje Y 0–100) | verde |
| RF-65 | T18 (15 puntos; el Excel dibujaba 10) | verde |
| RF-66 | T18 (límites solo en los tamices que controla la franja) | verde |
| RF-67 | T18 (leyenda de tres trazos) | verde |
| RF-68 | T18, T20 (triángulo en vez de círculo fuera de la franja) | verde |
| RF-69 | T18 (aviso de masas incompletas en lugar de la curva) | verde |

### Estados y aprobación (RF-70 a RF-94)

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-70 | T11, T19 (nace en borrador) | verde |
| RF-71 | V:5004; T12, T21 | verde |
| RF-72 | V:5004; T13, T21 | verde |
| RF-73 | V:4958; T13 (400 con los 25 datos que faltaban) | verde |
| RF-113 | T21: con un cambio sin guardar, «Enviar» se desactiva y dice que primero se guarde; al deshacerlo, vuelve (añadido el 2026-09-25) | verde |
| RF-74 | T13, T21 | verde |
| RF-75 | T13, T21 («Revisó», con fecha; cargo vacío porque la cuenta de gerencia no tiene cargo) | verde |
| RF-76 | T13, T21 (409 al corregir; ninguna casilla editable) | verde |
| RF-77 | T14, T21 | verde |
| RF-78 | T14, T21 | verde |
| RF-79 | V:5099; T14, T21 (la ventana se niega sin comentario) | verde |
| RF-80 | T14, T21 | verde |
| RF-81 | T21 (comentario en rojo mientras está devuelto) | verde |
| RF-82 | T14, T21 | verde |
| RF-83 | T14, T21 («Aprobó», con fecha) | verde |
| RF-84 | T14, T22 (emisión = día de aprobación) | verde · **A** (confirmar) |
| RF-85 | T14, T21 (409; sin casillas editables) | verde |
| RF-86 | T14, T21 | verde |
| RF-87 | V:5099; T14 | verde |
| RF-88 | T14, T21 (datos, veredicto y «Aprobó» conservados) | verde |
| RF-89 | T19 (marcados en el listado), T21 (marca ANULADO con motivo) | verde |
| RF-90 | T13 | verde |
| RF-91 | T13, T15 (sale del listado y del parte) | verde |
| RF-92 | V:2400 | verde (regla) · en vivo **P1** |
| RF-93 | T14 (API), T21 (pantalla: «Otra persona actuó sobre este ensayo…») | verde |
| RF-94 | T13, T14, T21 (historia completa con comentarios y motivos) | verde |

### Informe (RF-95 a RF-100)

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-95 | T22 (logo de GEOLAB idéntico al del Excel, encabezado del anexo D) | verde |
| RF-96 | T22 | verde |
| RF-97 | T22 («BORRADOR — SIN APROBAR · No es un informe válido») | verde |
| RF-98 | T22 («ANULADO — … · Motivo») | verde |
| RF-99 | Botón «Imprimir o guardar PDF» con `window.print()`; Diego, 2026-09-25: imprime y guarda en PDF | verde |
| RF-100 | T22: con las reglas de impresión aplicadas en pantalla, 720 × 909 px en (0, 0), dentro de la carta útil 740 × 980 | simulación verde · **P3** y **A** (carta u oficio) |

### Listado (RF-101 a RF-105)

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-101 | T19 | verde |
| RF-102 | En vivo hoy: No. 12 (25-sep) → No. 10 (24-sep) → los del 22-sep | verde |
| RF-103 | V:5146; T19 (estado «Anulado», y «No cumple» sin coincidencias) | verde |
| RF-104 | T19 (selector de obra de la gerencia); T11 (`obraId`) | verde |
| RF-105 | T19 («Hay 1 ensayo esperando su aprobación») | verde |

### Parte diario (RF-106 a RF-112)

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-106 | T15, T23 (vigentes del día; descartados y anulados fuera) | verde |
| RF-107 | T23 (informe, material, franja, veredicto, estado) | verde |
| RF-108 | T23 (tabla de solo lectura; la API del parte no escribe ensayos) | verde |
| RF-109 | T23 («Abrir» lleva al ensayo) | verde |
| RF-110 | V:5024, V:5036; T16 (por la ruta real, el rechazo de cierre deja de nombrar la sección); T23 (índice y aviso) | verde |
| RF-111 | T16: fijado con **la misma sentencia** que usa la ruta, desde un guion | verde (sentencia) · cierre completo por la ruta **P2** |
| RF-112 | T16, T23 («No. 6» sigue «Aprobado» en el parte cerrado aunque está anulado) | verde |

**Resumen (actualizado el 2026-09-25, con RF-113 y las pruebas de Diego):** 102 de 113 en verde del todo · 8 en verde por la regla y pendientes de prueba en vivo (P1: RF-2, 5, 6, 7, 10, 14, 92; P2: RF-111) · 1 pendiente de confirmar que sale en una hoja (P3: RF-100) · 2 sin cubrir por dudas abiertas (A: RF-19, 30) · 5 en verde con una definición que OCC tiene que confirmar (A: RF-45, 49, 50, 84, y el papel de RF-100).

## Alcance

**Lo que se hizo y la spec no pedía, dicho para que se decida:**

- ~~**No se puede enviar con cambios sin guardar.**~~ **Aprobado por Diego el 2026-09-25 y
  añadido como RF-113.** El botón se desactiva y lo explica: el
  servidor envía lo guardado, y enviar con cambios en pantalla mandaría otra cosa distinta
  de la que se ve. Es un refuerzo de RF-73 y RF-76, pero es comportamiento que la spec no
  escribe. Si se acepta, conviene registrarlo con `/sdd:cambio`.
- Refinamientos de presentación dentro de RF escritos, sin comportamiento nuevo: el filtro
  «Sin veredicto» (RF-103), el aviso de lavado *dentro* de tolerancia (RF-53) y la frase que
  explica por qué cambió el ensayo cuando otro se adelantó (RF-93).

**Lo declarado fuera de alcance sigue fuera:** el móvil no cambió (`git status` limpio en
`src/db/local`, `src/app/(operador)`, `src/features/{operador,sync,checklists}` y
`drizzle/local`); no hay otros ensayos, ni mezclas, ni edición de franjas desde el panel, ni
firma dibujada, ni descarga en Excel, ni relación con cantera o almacén; la serie de tamices
es la del anexo B.

## Constitución

| Principio | Estado |
| --- | --- |
| 1. Local-first | Sin tocar: el módulo es del panel; la base del dispositivo y la sincronización no cambiaron. |
| 2. La spec manda | Una adición sin spec (el candado de enviar, arriba) para decidir. Tres decisiones de la marcha fueron a la spec o al plan antes de seguir (logo de GEOLAB → RF-95; filtros en pantalla y rutas → plan). |
| 3. Una regla, un solo sitio | Cálculo, validaciones, estados, veredicto y permisos en `src/shared/rules/`; el servidor recalcula con las mismas funciones y nunca acepta porcentajes hechos. |
| 4. Nada se borra | Descartar y anular son marcas de tiempo; ningún `DELETE` en el módulo; el parte cerrado conserva lo fijado. |
| 5. Puerta de calidad | Los tres comandos en verde en cada tarea; toda regla nueva con su caso. |
| 6. Fronteras duras | Nada de `src/db/local` en el panel; secretos solo en `+api.ts` (comprobado sobre `dist/client`); guardia de cookie en todas las rutas nuevas; ninguna URL de R2 expuesta. |
| 7. Español y diseño | Código, comentarios e interfaz en español; colores y tamaños solo de los tokens (ningún color escrito a mano en el módulo). |
| 8. Sin dependencias nuevas | `package.json` sin cambios: la curva usa `react-native-svg`, que ya estaba. |

## Lo que falta para declararla Cumplida

1. **P1 — Cuenta de laboratorista** (y, si se puede, una de residente) en PRUEBA-018,
   creadas por Diego. Con ellas: el menú muestra solo Laboratorio y entra directo (RF-4,
   RF-5); ve solo lo de su obra y un ensayo de otra obra le da 404 (RF-6, RF-7); no puede
   aprobar ni anular y el rechazo dice quién sí (RF-10, RF-92); con el módulo apagado recibe
   el 403 de su obra, y al apagarlo en «Corregir obra» sale su nombre en el aviso (RF-14);
   darle el acceso en una obra sin laboratorio se rechaza (RF-2, RF-14).
2. **P2 — Un cierre de parte real por la ruta**, con foto del día en R2 (permiso de Diego
   para subir una foto de prueba, o que lo haga él), en un día con un ensayo y la sección a
   mano vacía (RF-110, RF-111).
3. **P3 — La vista previa real de impresión** (Ctrl+P) del informe de «No. 12»: una sola
   hoja carta, sin menú, con la curva nítida (RF-99, RF-100).
4. **A — Dudas abiertas de la spec** que el laboratorio de OCC tiene que responder: franjas
   además de SBG-50 (RF-19), contrato de la obra en el informe (RF-30), tara en masa húmeda
   y M2 (RF-45), definiciones de TM y TMN (RF-49, RF-50), fecha de emisión (RF-84), papel
   (RF-100) y ½" a 12,5 o 12,7 mm (anexo B). RF-19 y RF-30 no se pueden cerrar sin ellas.
5. ~~Decidir si el candado de «enviar con cambios sin guardar» entra a la spec.~~ Hecho: RF-113.

## Veredicto

**No está cumplida.** Todo lo que se pudo ejecutar está en verde —la regla completa con los
números del Excel, el servidor, el flujo entero en pantalla, el informe y el parte—, pero
quedan tres demos pendientes (P1, P2, P3) y dos RF sin cubrir por dudas abiertas (RF-19,
RF-30). La spec sigue **En curso** y T24 queda sin marcar hasta cerrar esa lista.
