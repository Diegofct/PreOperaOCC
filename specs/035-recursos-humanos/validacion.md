# Validación — Spec 035, Recursos Humanos: ficha y documentos de cada persona

> Fecha: 2026-10-29 · Tarea T16

Recorrido RF por RF. Cada fila dice **con qué se comprobó**:
- un caso de `scripts/verificar-reglas.ts` (los de esta spec llevan «035/», con su línea);
- una prueba en vivo, con la tarea en que se hizo (el detalle está en las notas de `tareas.md`);
- o, cuando se cumple **por construcción**, la razón, dicha así.

Lo que no se ejecutó no se da por verificado.

## Lo que se ejecutó

| Comando | Resultado |
| --- | --- |
| `npm run verificar` | **609 verificaciones correctas** (15 pruebas de la 035: líneas 11855 a 12159) |
| `npm run typecheck` | sin errores (código de salida 0) |
| `npm run lint` | sin hallazgos (código de salida 0) |

Corridos el 2026-10-29, después del arreglo de la demo y del aviso de retiro incompleto (abajo).

**Desarrollo** (`neondb`; migración `0034_far_rawhide_kid` aplicada **solo aquí**):
- **T7 a T11:** cada ruta contra el dev server con sesiones temporales en `sesiones_web`: gerencia (Diego), la residente de Consorcio Antioquia, la laboratorista, el almacenista y personas PRUEBA-035 creadas para la prueba (auxiliar de RR. HH., Encargado de OCC, operadores de OCC y de Geolab, un director con contraseña web). Se miró la **respuesta cruda** de cada una.
- **T11 a T16:** en Chrome, en `127.0.0.1:8081` con las sesiones temporales —que el navegador guarda aparte de `localhost:8081`—, sin tocar la sesión del usuario. El selector de archivos de Windows se reemplazó en la pestaña por un PDF de prueba que dispara el mismo `change`.
- **T16, demo de cierre** (como la pide la spec): la auxiliar PRUEBA-035 entra, llega a Recursos Humanos de Elemental, busca «andres demo», completa la ficha de «PRUEBA-035 Andrés Demo» de OCC con salario, la guarda y le sube el curso de alturas que vence en 10 días; después, contra la API, lo que recibe cada rol, el retiro y la medición con 300 personas (abajo). Todo en verde.
- **Limpieza acotada:** solo lo PRUEBA-035 y las sesiones de la prueba, en cada tarea y al final: 242 personas (240 de la medición), sus fichas, eventos y sesiones, 243 documentos con sus filas de `media` y los 4 objetos reales de R2 (compartido con producción; DELETE firmado uno por clave; al releerlos, 0). Quedan 0 personas, fichas, eventos, documentos de persona y sesiones de prueba.

**Producción:** sin tocar. La 035 sube con la T23 de la 033 (migraciones 0031 a 0034 en orden, antes de la imagen), cuando el usuario lo pida.

## Arreglos que salieron de las demos

- **T12:** el detalle «El contrato termina el…» salía con la fecha ISO; ahora usa `fechaDelCorte` («7-nov-2026»). Y el listado ordena por nombre en español: la base dejaba «Ángela» al final.
- **T16:** dentro de la ficha, la carpeta de documentos salía vacía («0 de 1») cuando el listado del personal tenía una búsqueda: los dos buscadores guardaban el texto en el mismo parámetro de la dirección (`buscar`). `useListadoFiltrado` acepta ahora el nombre del parámetro y la carpeta de la ficha usa `buscarDocumento`; las demás pantallas siguen con `buscar`. Vuelto a mirar en Chrome: con «andres demo» en el listado, la carpeta muestra el curso con «Vence en 10 días».

## RF por RF

### El módulo y quién lo ve

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-1 | T12: Recursos Humanos de Elemental con las pestañas «Personal» (la ficha de cada persona, T13), «Personas y accesos» y «Obras» como hoy. **Nombre de pestaña:** la de la ficha se llama «Personal» y la de siempre «Personas y accesos» (decisión de pantalla de la T12) | verde |
| RF-2 | «035/RF-2 a RF-7» (11925) y «035/RF-8 a RF-11» (11879). T7: gerencia y auxiliar listan Elemental con todo el personal | verde |
| RF-3 | 11925: RR. HH. en los menús de OCC y Geolab, después de Documentos. T12: el Encargado ve el personal de OCC, de consulta. T16: el Encargado ve a la persona de OCC; el laboratorista, el de Geolab | verde |
| RF-4 | 11925. T7: Encargado 54 de 54 de OCC, laboratorista 1 de 1 de Geolab, cada uno 403 en la otra empresa. T16: el laboratorista no ve a la persona de OCC (ni en el listado ni por su ficha, 404) | verde |
| RF-5 | 11925. T7: la residente lista los 7 de su obra y 403 en otra obra. T13: abre en Chrome la ficha de una persona de su obra, de consulta. T16: la ve en su obra, sin salario | verde |
| RF-6 | 11925: `escribir`/`anular` en `rrhh` solo gerencia y auxiliar. T8: la residente guarda → 403; T9: Encargado y residente suben → 403, residente anula → 403; T10: residente retira → 403; T16: residente, Encargado y laboratorista guardan → 403 | verde |
| RF-7 | 11925: operador, almacenista y encargado de planta sin `rrhh` ni el menú. T7 y T16: el almacenista → 403 | verde |

### La auxiliar de Recursos Humanos

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-8 | «035/RF-8» (11855): Elemental y sin obra (`reparoDelAccesoSinObra`). T15: en Chrome, gerencia registra una auxiliar PRUEBA-035 eligiendo el cargo: el acceso se pone solo, la obra desaparece, empresa Elemental; en la base, Elemental, sin obra, cargo `auxiliar_rrhh`. Con obra o de OCC → 400 | verde |
| RF-9 | 11879: `destinoAlEntrar` → `/panel/elemental/recursos-humanos`, alcanza solo Elemental. T15 y T16: al entrar en Chrome llega ahí, sin tarjetas de Inicio | verde |
| RF-10 | 11879: el menú de Elemental sin Asistente. T15: en Chrome, Recursos Humanos, Compras, Tesorería, Documentos y Licitaciones. Lo que hace en Compras y Tesorería queda para la 036 y la 037 | verde |
| RF-11 | «035/RF-11» (11870): el selector de Acceso ofrece solo «Operador». T15: registra un operador (201); registrar un residente, dar acceso de residente, desactivar, corregir a un residente y dar de baja → 403 con su mensaje; en Chrome solo ve «Operador» y no tiene «Corregir», «Dar acceso» ni «Dar de baja» sobre otras auxiliares. T16: registrar un residente → 403. **Agregado en la T15** para que se cumpla: `PATCH` y `DELETE` de Personas cerrados a la auxiliar fuera de lo que puede dar | verde |

### La ficha laboral

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-12 | `fichas_laborales` (T6). «035/RF-12, RF-16, RF-17» (11954). T8: guardar, leer y versión. T13 y T16: en Chrome se llenan teléfono, ingreso, término fijo con su terminación, salario, EPS y ARL y se guardan | verde |
| RF-13 | «035/RF-13» (11995). T7: en los listados del Encargado, la laboratorista y la residente no aparece ni la palabra «salario» ni el valor. T8 y T13: la ficha y el historial, igual. T16: listado, ficha, historial, documentos y **el error** de guardar, para los tres, sin salario; la auxiliar sí lo recibe | verde |
| RF-14 | T15: la auxiliar registra un operador sin acceso (201). Por construcción: la ficha cuelga de `usuarios`, tenga o no acceso; T13 y T16 completan la de operadores sin acceso | verde |
| RF-15 | «035/RF-15» (12145). T8: dos guardados con sus campos, sin valores; residente y Encargado → 403. T13: en Chrome, el segundo guardado dice solo «Salario». T14: «Retiró a la persona.». T16: el historial nombra a la auxiliar | verde |
| RF-16 | 11954. T8: terminación antes del ingreso → 422 con el motivo. T13: la pantalla lo dice antes de enviar (misma regla) | verde |
| RF-17 | 11954. T8: con decimales, negativo y cero → 422 | verde |

### Estado laboral y retiro

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-18 | `ESTADOS_LABORALES` (T3) y el `check` de la tabla (T6). T8: «vacaciones» se guarda; un estado que no existe → 422; «retirado» no se pone desde la ficha (422). T13: el selector no ofrece «Retirado» | verde |
| RF-19 | «035/RF-19» (12017). T10: sin documentos → 422 con las tres faltas; un examen anulado no cuenta; prestación de servicios sin liquidación. T14 y T16: lo mismo en pantalla y por la API, y con ellos se retira | verde |
| RF-20 | «035/RF-20» (12034). T10: fecha y motivo; cuenta inactiva, 0 sesiones abiertas, su sesión → 401, ingresar → 403 «Su cuenta está inactiva»; los datos de la ficha intactos. T14: en Chrome, «Retirada el 29-oct-2026: …». T16: cuenta inactiva | verde |
| RF-21 | «035/RF-21» (12044). T11: en Chrome, el selector de Asignaciones y «Añadir persona» de la bitácora no ofrecen a la retirada; su asignación de antes sigue en la lista; asignarle una máquina → 409. Preoperacionales: por construcción, el celular solo recibe activos de su obra. **No visto en pantalla:** un parte guardado con una retirada dentro (no hay ninguno en dev); lo cubre que el listado la sigue trayendo | verde |
| RF-22 | Por construcción: Recursos Humanos no tiene ruta ni botón de borrar. T15: dar de baja en Personas exige `activar` (gerencia); la auxiliar → 403 «… retírela desde su ficha en Recursos Humanos» | verde |

### Documentos de la persona

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-23 | «035/RF-23» (11999): las 16 clases y «Otro», solo en `persona`. T9: una clase de empresa en una persona → 422 | verde |
| RF-24 | Por construcción: la misma `subirDocumento` y las mismas rutas de la 034 (tipo real, 20 MB, `media`, R2, nada se borra). T9: sube, lista, abre, anula (otra vez → 409, sigue marcado). T14 y T16: sube en Chrome desde la ficha | verde |
| RF-25 | Por construcción: `estadoDelVencimiento` de la 034. T9: «uno por vencer» en el resumen. T16: el curso que vence el 8-nov sale «Vence en 10 días» en la carpeta y en el listado del Encargado | verde |

### Avisos y listado

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-26 | «035/RF-26» (11984). T12: «Ficha incompleta» con lo que falta en quien no tiene ficha | verde |
| RF-27 | «035/RF-26 a RF-31» (12053). T12: las cuatro cifras arriba (1 / 1 / 1 / 59 con los datos de prueba y el personal real sin ficha) | verde |
| RF-28 | 12053. T12: «Documento vencido», «Vence en 10 días», «Contrato termina en 10 días» y «Ficha incompleta», con su detalle | verde |
| RF-29 | T12: en Chrome, «Solo con avisos» deja 4 y «Ver retiradas» muestra a la retirada. Los selectores de empresa, obra, cargo y estado están en pantalla y filtran con la misma función; **no se probó cada uno por separado** en Chrome | verde, con esa salvedad |
| RF-30 | Por construcción: `useListadoFiltrado` con `normalizar`. T12: «angela» encuentra a «Ángela»; T16: «andres demo» a «Andrés Demo». Busca por nombre, documento y usuario | verde |
| RF-31 | 12053. T12: la retirada con un curso vencido no avisa ni cuenta. T16: al retirarla, «por vencer» pasa de 1 a 0 | verde |

### Seguridad

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-32 | «035/RF-32, RF-33» (12107): `alcanzaLaPersona`, la regla que usan el listado, la ficha y los documentos. T7 a T9: cada rol contra lo suyo y lo ajeno | verde |
| RF-33 | 12107. T8, T9 y T16: pedir por su id la ficha o los documentos de una persona ajena → 404 (no 403), sin datos | verde |
| RF-34 | Por construcción: la 035 no toca el código del celular ni `movil/*`; `usuarios.activo = false` ya lo cortan `movil/refrescar` y `movil/activar` (leído en la T10). **No probado en un celular** | verde, por construcción |

## Requisitos no funcionales

| Requisito | Qué lo cubre | Resultado |
| --- | --- | --- |
| 300 personas en menos de 2 s | T16: 240 personas PRUEBA-035 con ficha y documento, 300 en total; `GET /api/panel/rrhh/personal?empresa=elemental` como gerencia: 554 ms en frío y luego 473, 399 y 392 ms (dev server local contra Neon). Borradas al terminar | verde |
| Todo en español | Por construcción: textos, mensajes del servidor y avisos, vistos en cada demo | verde |
| El salario no sale hacia otros roles, ni en el listado, ni en el historial, ni en un error | T16: respuesta cruda de las cinco rutas, y del error de guardar, para residente, Encargado y laboratorista | verde |
| Los datos personales solo viajan a quien ve la ficha | T16: la laboratorista pide la ficha de la persona de OCC → 404, sin su teléfono. T8: lo ajeno es 404 | verde |

## Casos límite

| Caso | Qué lo cubre | Resultado |
| --- | --- | --- |
| Primer arranque | La migración 0034 no toca filas (T6). T12: las personas sin ficha salen «Ficha incompleta» (59 en dev) y activas si su cuenta lo está | verde |
| Personas creadas por WhatsApp | Por construcción: nacen sin ficha y la regla trata «sin ficha» como incompleta (11984) | verde, por construcción |
| Cambia de obra o de empresa | Por construcción: el alcance se calcula al leer, con la obra y la empresa de `usuarios` (`alcanzaLaPersona`); no hay copia que quede vieja | verde, por construcción |
| Documento de retiro anulado después del retiro | «035, caso límite» (`faltasDeLaRetirada`): solo para una retirada, lo que le falta hoy. Agregado el 2026-10-29 a pedido del usuario: en Chrome, una retirada PRUEBA-035 con sus tres documentos no tiene aviso; al anular su liquidación desde la carpeta, la ficha dice «Le falta un documento de retiro que se anuló después de retirarla: Liquidación. Sigue retirada; súbalo de nuevo a su carpeta.», sigue retirada y en el listado sigue sin avisos (RF-31) | verde |
| Dos personas editan la misma ficha | T8 y T10: versión vieja → 409 «Otra persona cambió esta ficha…», sin pisar; con el retiro, sin cambiar la cuenta ni las sesiones | verde |

## Pendiente y decisiones para el usuario

- Decisiones tomadas durante la implementación, anotadas en `tareas.md`, **confirmadas por el usuario el 2026-10-29**: «Contrato terminado» como aviso aparte (T5); una retirada no vuelve a activo desde la ficha (T8); al retirar no se desactiva el celular, solo la cuenta (T10); retirar no cierra sus asignaciones vigentes (T11); las pestañas «Personal · Personas y accesos · Obras» (T12); la auxiliar no corrige a quien tiene acceso, no activa ni da de baja (T15).
- Visto de paso, sin cambiar: Personas de Elemental lista solo a las de empresa Elemental (spec 033), así que un operador de OCC que registre la auxiliar se ve en «Personal», no ahí.
- Quedan en dev 5 vehículos de pruebas anteriores a esta spec (`PRUEBA-CAM-01`, `PRUEBA-EXO-01`, `PRUEBA-026-MOTONV`, `PRUEBA-026-REC`, `PRUEBA-026D-MOTONV`); no son de la 035 y no se tocaron.
