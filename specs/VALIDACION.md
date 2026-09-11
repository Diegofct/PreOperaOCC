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
