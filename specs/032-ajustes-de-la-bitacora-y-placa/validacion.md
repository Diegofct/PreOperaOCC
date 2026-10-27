# Validación — Spec 032, Ajustes de la bitácora y placa

> Fecha: 2026-10-27 · Fase 7 del flujo SDD (tarea T16)

Recorrido RF por RF. Cada fila dice **con qué se comprobó**:
- un caso de `scripts/verificar-reglas.ts` (los de esta spec llevan «032/», con su línea);
- una prueba en vivo, con la tarea en que se hizo (el detalle está en las notas de `tareas.md`);
- o, cuando se cumple **por construcción**, la razón, dicha así.

Lo que no se ejecutó no se da por verificado.

## Lo que se ejecutó

| Comando | Resultado |
| --- | --- |
| `npm run verificar` | **565 verificaciones correctas** (9 pruebas de la 032: líneas 9583 y 10915 a 11049) |
| `npm run typecheck` | sin errores (código de salida 0) |
| `npm run lint` | sin hallazgos (código de salida 0) |

Corridos el 2026-10-27, después de la demo y de la limpieza.

**Desarrollo** (`neondb`, obra «Pruebas spec 018 (laboratorio)»):
- **T3, T4, T5, T7, T9 a T11:** las rutas y las pantallas contra el dev server, con la sesión de Diego (gerencia). Detalle en las notas de cada tarea.
- **T12 a T15:** en Chrome, en un iframe de 1280 px y otro de 390 px, con la bitácora `PRUEBA-032` del 18-sep: 5 máquinas, 5 personas, 3 actividades y 2 ensayos.
- **T16 (demo):** alta de vehículo sin placa y con placa repetida; la misma bitácora sin actividades ni ensayos, con clima, notas y una foto del día de prueba (PNG de 980 bytes); intento de cierre sin motivo, cierre con motivo y la bitácora cerrada en Chrome.
- **Limpieza (T16):** por id, con los recuentos antes y después. Se borró el PNG de R2 con un DELETE firmado (204; luego GET → 404), porque el R2 es el mismo de producción. De la base se borraron 1 fila de `bitacora_fotos`, 1 de `media`, 1 de `partes_de_obra` (la bitácora del 18-sep, creada en la T9) y 1 de `vehiculos` (PRUEBA032B, creado en la T3). Antes de borrar se buscaron los tres ids en todas las columnas de texto y JSON de la base, y no aparecían en ninguna otra tabla. Quedan 0. Lo que **no** se deshace es el script de la T7 en desarrollo (18 vehículos con su código igual a la placa): es la migración de datos de la spec, no un dato de prueba.

**Producción:** nada. El despliegue (T17) queda en espera: el usuario lo hará después de revisar esta spec junto con la 033.

## RF por RF

### Alineación de la bitácora (H1)

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-1 | Por construcción: `FilaDeSeccion` usa `Campo`, `Selector` y `CampoObservacion`, que llevan el rótulo encima. T13 y T14 en Chrome, en las cuatro secciones | verde |
| RF-2 | Por construcción: la columna del nombre mide `ANCHO_NOMBRE_DE_FILA` (200 px) en las cuatro. T13 y T14: máquina, persona, actividad y ensayo empiezan en la misma x | verde |
| RF-3 | Por construcción: la columna final mide `ANCHO_FINAL_DE_FILA` (240 px), con la casilla y el «Quitar» de `CampoObservacion`. T13 y T14 en Chrome | verde |
| RF-4 | T13, a 1280 px: cada máquina en un renglón (equipo, operador, lecturas, avance, casilla) | verde |
| RF-5 | T13, a 1280 px: cada persona en un renglón. El cargo va debajo del nombre, sin abrir otro renglón de campos | verde |
| RF-6 | T14, a 1280 px: las actividades en dos renglones, y los ensayos con «Otro lugar» también. **Un ensayo con «PR y metros» o con tramo usa tres**: el PR y los metros piden unos 200 px más de los que quedan | **parcial** |
| RF-7 | T13 y T14, iframe de 390 px: las columnas se apilan y `scrollWidth` = 390 (sin desplazamiento horizontal) | verde |
| RF-8 | T15: la página impresa es el mismo DOM. Reportes sigue el orden de la pantalla: la descripción va antes de la unidad en la bitácora, y el responsable va después del ensayo en la bitácora cerrada y en «No cumplen» (pantalla, Excel e impresión) | verde |

### Placa en vez de código (H2)

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-9 | T3: sin placa → 400. T16: sin placa y con « - » → 400 «Falta la placa / identificación.» | verde |
| RF-10 | T3: «tay-076» → 409. T16: «llq-376» → 409 «Ya hay un vehículo con la placa LLQ376.» | verde |
| RF-11 | «032/RF-11» (10915). T3: «prueba-032 a» se guardó `PRUEBA032A` | verde |
| RF-12 | T4: la lista y la ventana de Vehículos, sin «Código», en Chrome | verde |
| RF-13 | «032/RF-13, RF-20» (10925). T5: asignaciones, preoperacionales, pendientes y bitácora con la placa, en Chrome. Reportes, cantera y asistente nombran con `identificacionDelVehiculo` en el servidor | verde |
| RF-14 | Por construcción: `codigo_interno` = placa (T3, T7), y el pull del celular ya manda `codigo_interno`. **No se miró en un teléfono** | por construcción |
| RF-15 | T5: una máquina nueva en una bitácora abierta se guarda con su placa. T12: «LLQ376 · Volqueta» | verde |
| RF-16 | T7: el script dejó con la placa 33 máquinas de 10 bitácoras abiertas, y la segunda corrida dio 0 cambios. T5: volver a guardar recalcula el `codigo` | verde |
| RF-17 | T5 y T7: la bitácora cerrada del 4-oct sigue con «PRUEBA-VOL-T17». Se volvió a ver en la T15 | verde |
| RF-17a | T5: los preoperacionales, también los viejos, con la placa actual, en Chrome | verde |
| RF-18 | «032/RF-18, RF-19» (10947): VOL-MAG-04 → TAY076; WA-LLQ375 → LLQ375 | verde |
| RF-19 | 10947: el código anterior se reconoce, pero no en otra obra | verde |
| RF-20 | 10925. T4: «Falta la placa» en la lista y en «Corregir» | verde |
| RF-20a | Por construcción (T6): `crearMaquina` no cambió y sigue creando `WA-<TIPO>-xxxx` sin placa. **No se probó con un reporte real** | por construcción |

### Día sin actividades y día sin ensayos (H3, H4)

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-21 | T10: la casilla sale con la sección vacía y no con filas, en Chrome | verde |
| RF-22 | T10: el motivo en un renglón, cortado a 200. T9: 201 caracteres → 400 | verde |
| RF-23 | «032/RF-23, RF-31» (11002). T9. T16: el cierre responde 400 «Actividades: falta el motivo de por qué no se realizaron.» | verde |
| RF-24 | «032/RF-24, RF-25, RF-32» (10973). T16: con el motivo, el cierre → 200 sin ninguna actividad | verde |
| RF-25 | 10973. T16: se cerró sin foto de actividad (solo la del día) | verde |
| RF-26 | T10: «Añadir actividad» oculto con la casilla marcada, en Chrome | verde |
| RF-27 | «032/RF-27, RF-28, RF-34, RF-35» (11049): con filas nuevas la regla quita la marca, y la aprobación escribe lo que deja la regla (T9). **No se probó con un reporte real de WhatsApp** | verde (regla) |
| RF-28 | 11049. T9 y T10: desmarcar → motivo nulo | verde |
| RF-29 | T10: no sale con ensayos ni con ensayos del módulo, en Chrome | verde |
| RF-30 | T10: como RF-22 | verde |
| RF-31 | 11002. T16: el cierre responde 400 «Control de calidad: falta el motivo de por qué no se realizaron.» | verde |
| RF-32 | 10973. T16: cierre → 200 sin ensayos | verde |
| RF-33 | T10: «Añadir ensayo» oculto con la casilla marcada | verde |
| RF-34 | 11049, como RF-27. **Sin reporte real de WhatsApp** | verde (regla) |
| RF-35 | 11049. T9 | verde |

### Reglas transversales

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-36 | «032/RF-36, RF-37» (9583). T11: Reportes › Clima y el Excel. T16: la bitácora cerrada dice «No se realizaron actividades — …» y «No se realizaron ensayos — …» (captura `capturas/t16-cerrada-sin-actividades-ni-ensayos.jpg`). En la T16 salía además la tabla vacía de Control de calidad, y se corrigió para que salga solo el texto | verde |
| RF-37 | «032/RF-37, RF-38» (11019). T10: con «Ese día no se trabajó» desaparecen las dos casillas | verde |
| RF-38 | 11019. Por construcción: las columnas nuevas valen `false` y el cierre no vuelve a evaluar lo cerrado | verde |

### Requisito no funcional

- **Alto a 1280 px** (T12 y T15, la misma bitácora): Maquinaria 1 510 → 755 px, Personal 1 431 → 759 px, Actividades 1 232 → 786 px y Control de calidad 897 → 506 px. **En total, 5 070 → 2 806 px: −44,7 %** (la meta era −25 %). Capturas en `capturas/`.

### Lo que cambió al implementar (sin cambiar lo acordado)

- Los rótulos de las horas extra dejaron de llevar «(L)», «(ED)» y «(EN)», que no cabían en el renglón.
- Las ayudas de dos campos se acortaron: Lugar ahora dice «Ej.: la planta» y la unidad del ensayo ya no lleva ayuda.
- El «8 h laboradas (reportadas)» sin extras ya no se repite debajo de la persona.
- Los nombres largos se cortan en la columna de 200 px; se leen enteros al abrir el selector.
- Al cerrar con alguna de las marcas puestas, el cierre responde **400** (como cualquier otro bloqueo de la bitácora), no 409 como decía la tarea T9.

### Veredicto

**RF-1 a RF-38 cumplidos en desarrollo**, con estas salvedades:
- **RF-6 es parcial:** un ensayo con PR o con tramo usa tres renglones.
- **Solo por construcción:** RF-14 (la placa en el celular) y RF-20a (máquina nueva de WhatsApp sin placa).
- **Solo con la regla:** RF-27 y RF-34 (que WhatsApp quite la marca); falta un reporte real.

### Pendiente

- **T17, despliegue:** en espera a pedido del usuario, hasta revisar junto con la spec 033. El orden es:
  1. Migración `0031` en producción.
  2. Imagen nueva.
  3. `scripts/032-placas-produccion.ts --produccion --escribir`, **con permiso**.
  4. Comprobar el 401 y el inicio de sesión real.
- La placa o serie de Montacargas diésel, Motoniveladora Komatsu GD555 y Vibrocompactador Volvo (producción): las tiene que dar el usuario.
- Commit en PreOperaOCC de toda la spec (lo hace el usuario).
