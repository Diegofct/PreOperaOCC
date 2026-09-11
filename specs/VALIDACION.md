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
