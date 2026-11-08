# Validación — Spec 041, cargos de obra

> Fecha: 2026-11-08 · Tarea T16 · Incluye el cambio del 2026-11-08 (RF-73 a RF-78; RF-54 sustituido)

Recorrido RF por RF. Cada fila dice **con qué se comprobó**:

- **Reglas:** un caso «041/» de `scripts/verificar-reglas.ts`.
- **E2E T*n*:** prueba contra las rutas reales del servidor de desarrollo; el detalle está en las notas de esa tarea en `tareas.md`.
- **Demo:** la corrida final de esta tarea, abajo.
- **Chrome T*n*:** comprobado en pantalla.
- **Por construcción:** se cumple por cómo está hecho, y se dice la razón.

Lo que no se ejecutó no se da por verificado: queda en «Lo que no se probó».

## Lo que se ejecutó

| Comando | Resultado |
| --- | --- |
| `npm run verificar` | **707 verificaciones correctas**, 33 nombradas «041/» |
| `npm run typecheck` | sin errores |
| `npm run lint` | sin hallazgos |
| `npx expo export --platform web` | «Exported: dist»; `grep DATABASE_URL dist/client` da 0; `dist` borrado |
| `npm run db:generate:servidor` | «No schema changes» después de la 0041 |

**Desarrollo** (`neondb`): migraciones `0040` (a mano, repetible; repetir sus 13 sentencias no cambió nada, T5) y `0041` (tabla `claves_generadas`). **Producción: sin tocar.**

### Demo final

Por las rutas reales, con seis sesiones `PRUEBA-041`: cuatro de usuarios que ya existían y dos de los creados en la corrida. **33 de 33** en la automática.

1. La Gerencia crea un Director de Proyectos (201); otro Director de Proyectos no puede (422).
2. El Director de Proyectos crea una obra (201) y un Director de Obra con dos obras (201), y le genera la contraseña (200).
3. Ese Director de Obra cambia su contraseña y crea un Residente (201).
4. El Residente abre el parte (201) y no puede anularlo: 403 «El Residente no anula: pídaselo al Director de Obra, el Director de Proyectos o la Gerencia.».
5. El Director de Obra lo anula (200), y el parte dice «PRUEBA-041 T16 Director (Director de Obra)».
6. Otro Director de Obra pide esa obra: sin datos con la cabecera, 404 sobre la fila; por la dirección, «Sin acceso» en Chrome.
7. El Director de Proyectos ve las obras, incluida la nueva.
8. Paso de las personas existentes: hecho y repetido en la T5.
9. El Director de Obra genera la contraseña de su Residente (200); la de otro Director de Obra, 403; la de alguien de otra obra, 404.
10. El Director de Proyectos no da de baja la obra (403 «Dar de baja una obra lo hace la Gerencia.») pero la edita (200); la Gerencia la da de baja (200).
11. Con la IA real, el Director de Obra desde la obra A:
    - «¿Qué obra es esta?» → «Es la obra Consorcio Antioquia.»
    - Pregunta por su obra B → «Desde aquí solo respondo de la obra en uso. Para consultar otra de sus obras, ábrala con “Cambiar de obra” y pregunte desde allá.», sin ninguna consulta.
    - Pregunta por una obra inventada → la misma frase: no revela si existe.

**Lo adicional del plan:**

- Dos pestañas en obras distintas: T12, cada una guardó en la suya.
- Residente con pantalla abierta que pulsa Aprobar en laboratorio: 403 con el mensaje.
- Bajar a Residente un Director de Obra con dos obras: 422 sin escoger, 200 escogiendo. Con su sesión abierta, su siguiente anulación da 403 con el motivo y la sesión sigue viva con el acceso nuevo (RF-56).
- Retirar una obra a un Director de Obra: deja de verla en la siguiente petición (RF-29), y devolvérsela funciona.
- Aprobar en la bandeja de WhatsApp como Residente, en Chrome: **200 real** (pendiente desde la T7).

**Defectos que salieron de la demo, ya corregidos:**

- El asistente contestaba «Esa información no está a su alcance.» sobre la otra obra del Director de Obra, en vez de indicarle cambiar de obra (RF-74). La regla general del sistema le ganaba a la instrucción.
- Al Residente que intentaba generar una contraseña el rechazo le hablaba de «códigos de activación» (RF-76).

**Limpieza:** transacción única por id. Quedan 0 usuarios, 0 obras, 0 partes y 0 contraseñas registradas `PRUEBA-041`. El viaje que creó la aprobación de prueba se borró, y el mensaje `PRUEBA-024-T16-falla` volvió a `pendiente`. Scripts temporales borrados.

## Recorrido RF por RF

| RF | Comprobación | Estado |
| --- | --- | --- |
| RF-1 | Reglas (tabla completa); Chrome T13 | Cumple |
| RF-2 | `grep` sobre `.tsx`: 0; solo en `etiquetaDeAccesoHistorico` (T15) | Cumple |
| RF-3, RF-4, RF-66 | Reglas (catálogo de cargos, T2) | Cumple |
| RF-5 | E2E T11; Demo 7 | Cumple |
| RF-6 | Reglas 041/RF-57 | Cumple |
| RF-7, RF-8 | Reglas; Demo 2 y 10 | Cumple |
| RF-9 | Reglas 041/RF-57 | Cumple |
| RF-10 | Reglas; la guardia deja pasar al Director de Proyectos (404 porque no hay contrato) | Cumple; **botón sin ver** |
| RF-11 | Reglas 041/RF-57 | Cumple |
| RF-12 | Reglas `PUEDE_DAR`; Chrome T13 (seis opciones) | Cumple |
| RF-72 | Reglas; `Códigos` según `activar` (T13) | Cumple |
| RF-13 | E2E T10; Demo | Cumple |
| RF-14 | Reglas; Demo 1 | Cumple |
| RF-15, RF-59 | Reglas 041/RF-57 | Cumple |
| RF-16 | Reglas `reparoDeObrasDelAcceso`; Chrome T13 | Cumple |
| RF-17, RF-18 | Reglas; Chrome T13 | Cumple |
| RF-19 | E2E T6; Chrome T12 | Cumple |
| RF-20 | E2E T6 y T10; Demo 6; Chrome | Cumple |
| RF-21, RF-60 | Reglas 041/RF-57; Chrome T15 | Cumple |
| RF-22, RF-23, RF-67 | Reglas `obraEnUso`; Chrome T12 | Cumple |
| RF-24, RF-25 | Reglas `destinoAlEntrar`; Chrome T12 | Cumple |
| RF-26, RF-27 | Reglas; E2E T10; Demo 3; Chrome T13 | Cumple |
| RF-58 | Reglas; Demo (403) | Cumple; **botón sin ver** |
| RF-28 | Reglas; E2E T10 | Cumple |
| RF-29 | Demo | Cumple |
| RF-30 | Por construcción: `usuarios_obras` se cierra con `hasta`, y las filas registradas no se tocan | Cumple |
| RF-31 | E2E T10 | Cumple |
| RF-70, RF-71 | Reglas; Demo; Chrome T13 | Cumple |
| RF-32 | Reglas; Chrome T13 | Cumple |
| RF-33 | Reglas 041/RF-33; Chrome T15 | Cumple |
| RF-61 | Chrome T15 | Cumple |
| RF-34, RF-35 | Reglas; E2E T7; Demo 4 | Cumple |
| RF-36 | Chrome T15 (bitácora, mantenimientos, ensayo aprobado) | Cumple; «Aprobar» de ensayo **sin ver** |
| RF-37 | Reglas; Chrome (200 real) | Cumple |
| RF-38, RF-39 | Reglas; E2E T10 | Cumple |
| RF-40, RF-41 | Reglas 041/RF-57 | Cumple |
| RF-62, RF-63, RF-64, RF-68 | Reglas | Cumple |
| RF-42 | Reglas; Chrome T14 (parte); funciones reales (almacén, cantera) | Cumple; preoperacional y contrato **sin datos** |
| RF-43 | Por construcción: la tabla ya les da aprobar (T11) | Cumple |
| RF-44 | Chrome T12 | Cumple |
| RF-45 | Por construcción: `usuarios_obras` admite varias personas por obra, y el permiso no mira cuál | Cumple |
| RF-46, RF-47, RF-48, RF-49 | Reglas `accesoTrasLaMigracion`; verificado en dev (T5) | Cumple |
| RF-50 | Por construcción: `RENAME VALUE` conserva filas, contraseñas y sesiones | Cumple |
| RF-65 | Reglas; T5; Chrome T13 | Cumple |
| RF-69 | Demo (cambio de acceso); historias intactas por RF-30 | Cumple |
| RF-51 | Reglas; Chrome T13 | Cumple |
| RF-52 | Reglas; Chrome T14 («Residente / Director») | Cumple |
| RF-53, RF-55 | Reglas 041/RF-53 a RF-55 | Cumple |
| RF-54 | **Sustituido** por RF-73 y RF-74 | — |
| RF-73 | Reglas; Demo 11 | Cumple |
| RF-74 | Reglas; Demo 11, tras el arreglo | Cumple |
| RF-75, RF-76 | Reglas; Demo 9; Chrome («Dar acceso» del Director de Obra) | Cumple |
| RF-77 | Reglas; Demo 10 | Cumple |
| RF-78 | Consulta en dev tras la demo: 2 filas con quién generó para quién | Cumple |
| RF-56 | Demo | Cumple |
| RF-57 | Por construcción: pantallas, rutas y asistente leen `permisos.ts`; T15 quitó lo que comparaba roles | Cumple |

## Lo que no se probó

- **Los botones «Aprobar contrato», «Volver a borrador» y «Aprobar presupuesto»:** en desarrollo no hay contratos ni presupuestos en borrador. Se comprobó la guardia de la ruta y que el botón sale de `alcanza`.
- **El botón «Aprobar» de un ensayo:** no hay ensayos «enviado». El rechazo del servidor sí se comprobó.
- **Historias de preoperacional y contrato con el acceso de esa fecha:** no hay preoperacionales anulados ni eventos de contrato. Usan la misma función que el parte.
- **El requisito de menos de 2 s con 5 obras:** no se midió. La consulta añadida es una sola por petición (T6).
- **Medir a 1366 px con todos los pasos:** Chrome no redimensiona la ventana; ver la nota de la T13.

## Para desplegar

Va con la T23 de la 033, cuando se pida. En producción faltan las migraciones **0031 a 0041**, con `scripts/migrar-produccion.ts` y antes de encender la imagen.

Antes de correr la 0040, conviene una consulta de solo lectura para ver quiénes tienen hoy el cargo «Director» y quiénes quedarán marcados para revisar.

Comprobación después de desplegar: `/api/panel/resumen` con una cookie inventada debe dar **401**, nunca **500**.
