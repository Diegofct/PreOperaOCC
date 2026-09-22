# Plan técnico — Spec 015

> Lee antes `docs/constitucion.md` y el `spec.md` de esta carpeta.
> Aquí va el CÓMO. Si algo de esto cambia el comportamiento acordado, no se resuelve
> en el plan: se vuelve a la spec.

## Módulos y archivos

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `src/features/panel/componentes.tsx` — `Confirmacion` | Deja de pintarse en línea y se pinta dentro de `Modal` (misma capa flotante con telón oscuro). Firma nueva: acepta `titulo` opcional (por defecto «Confirmar»). La caja amarilla con «!» se conserva **dentro** de la ventana. | RF-1, RF-3 a RF-6 |
| `src/features/panel/componentes.tsx` — `Columna` / `Tabla` | `Columna` gana `ordenar?: (fila) => string \| null`. `Tabla` gana props opcionales `orden` y `alOrdenar`; si la columna es ordenable, su título es un `Pressable` con ▲/▼. Sin `alOrdenar`, la tabla se pinta igual que hoy. | RF-8, RF-9 a RF-11 |
| `src/features/panel/ordenar.ts` (nuevo) | Función pura `ordenarFilas(filas, clave, sentido, desempate)`: compara con `normalizar` (`src/shared/rules/texto.ts`) y `localeCompare('es')`, vacíos al final, desempate por nombre. Tipo `Orden = { clave, sentido }`. | RF-12, RF-13, casos límite |
| `src/features/panel/usar-orden-recordado.ts` (nuevo) | Hook: estado `Orden` inicializado desde `localStorage` (clave `panel.orden.personas`), escribe al cambiar; todo acceso en `try/catch`; valor ilegible → orden por defecto. Alterna A→Z / Z→A al repetir columna. | RF-9, RF-10, RF-16, RF-17 |
| `src/features/panel/usar-listado-filtrado.ts` | Acepta un cuarto parámetro opcional `ordenar?: (filas) => filas`, aplicado **después de filtrar y antes de recortar la página**. Las demás pantallas no lo pasan y no cambian. | RF-14, RF-15 |
| `src/features/panel/pantalla-personas.tsx` | Columnas con `ordenar`; la etiqueta de Acceso sale a una función `etiquetaDeAcceso(p)` que usan la celda y el orden; pasa `orden/alOrdenar` a `Tabla`. Texto de la baja con el aviso del celular si `p.celularActivo`. | RF-8, RF-18 |
| `src/features/panel/pantalla-obras.tsx`, `pantalla-vehiculos.tsx`, `pantalla-almacen.tsx`, `catalogos-cantera.tsx` | Ninguno en su lógica: heredan la ventana al cambiar `Confirmacion`. Se revisa que ninguno dependa de que el aviso esté en línea (p. ej. un `Aviso` de error justo debajo). | RF-2, RF-7 |
| `src/app/api/panel/personas+api.ts` (`GET`) | Añade `celularActivo: boolean` por fila (`exists` sobre `dispositivos` sin `revocado_en`). | RF-18 |
| `src/features/panel/contratos.ts` — `PersonaFila` | Campo `celularActivo: boolean`. | RF-18 |
| `src/app/api/panel/personas/[id]+api.ts` (`DELETE`) | Se quita el 409 por celular activo. La baja y la revocación van en **un solo `batch`** (transacción no interactiva). Se reescribe el comentario del porqué. | RF-19 a RF-22, RF-24 |

## Modelo de datos

**Sin cambios de esquema.** Se usan las columnas que ya existen: `usuarios.activo`,
`usuarios.eliminado_en` y `dispositivos.revocado_en`. Ninguna migración, ni local ni de
servidor.

## Algoritmo / reglas

**Baja de una persona** (`DELETE /api/panel/personas/:id`):

1. Guardia `requerirPermiso(…, 'personas', 'escribir')` y `personaAlcanzable` (sin cambios).
2. Si `id === sesion.id` → 400, como hoy (RF-24).
3. `baseServidorSerializable().batch([...])` con dos sentencias, en este orden:
   - `UPDATE usuarios SET activo=false, eliminado_en=now() WHERE id=:id AND eliminado_en IS NULL RETURNING …`
   - `UPDATE dispositivos SET revocado_en=now() WHERE usuario_id=:id AND revocado_en IS NULL`
   El batch de Neon corre como una transacción: o se aplican las dos o ninguna (RF-21).
   Revoca **todos** los celulares activos (caso límite de dos teléfonos).
4. Si el primer `UPDATE` no devolvió fila → 404 «esa persona» (dos gerencias a la vez: la
   segunda ya no la encuentra). La segunda sentencia en ese caso no revoca nada nuevo que no
   debiera estar revocado: la persona ya estaba de baja.

**Orden de la tabla** (`ordenarFilas`):

1. Para cada fila, `valor = columna.ordenar(fila)`; vacío = `null` o `''`.
2. Vacíos siempre al final, sin importar el sentido (RF-13).
3. Resto: `normalizar(a).localeCompare(normalizar(b), 'es', { numeric: true })`, invertido
   si el sentido es Z→A (RF-12). `numeric` para que el documento `9…` no quede detrás de `10…`.
4. Empate → por nombre completo A→Z (caso límite), en cualquier sentido.

## Decisiones técnicas

- **Cambiar `Confirmacion` por dentro, no las seis pantallas.** Se descartó crear un
  `VentanaDeConfirmacion` nuevo y migrar pantalla por pantalla: dejaría el componente viejo
  vivo para que alguien lo vuelva a usar, y RF-2 pide todas a la vez.
- **Revocar el celular en la misma petición de baja, con `batch`.** Se descartó hacer dos
  peticiones desde el panel (revocar y luego dar de baja): si la segunda falla, la persona
  queda sin celular pero activa, que es justo lo que RF-21 prohíbe. Se descartó también una
  sola sentencia con CTE: el `batch` ya está probado en el almacén
  (`almacen/movimientos/[id]/anular+api.ts`) y se lee mejor.
- **El 409 que pedía «desactivar» se elimina.** Su razón era que la lápida libera el nombre de
  usuario y un teléfono con esa identidad podría quedar apuntando a otra persona. Revocar el
  dispositivo en la misma transacción cierra esa puerta igual: la guardia del móvil
  (`guardia-movil.ts:62`) y el refresco (`movil/refrescar+api.ts:47`) rechazan un dispositivo
  revocado. El razonamiento se conserva en el comentario de la ruta.
- **El orden se recuerda en `localStorage`, no en la dirección.** Se descartó
  `useParametroDeDireccion`: el menú lleva a `/panel/personas` sin parámetros, así que al
  volver desde otro módulo el orden se perdería, y RF-16 pide lo contrario. Es una comodidad
  por navegador, que es lo que `localStorage` puede ser (si falla, se ordena por nombre).
- **Ordenar en el navegador.** Se descartó un `?orden=` en el `GET`: el listado ya llega entero
  y se filtra en el cliente (`usar-listado-filtrado.ts`); ordenar en el servidor obligaría a
  pedir otra vez los datos con cada clic.
- **Ordenar por lo que se ve.** Cargo por su nombre legible (`nombreDeCargo`) y Acceso por la
  etiqueta («Celular», «Gerencia», «Panel», «Sin acceso»), no por el valor interno: ordenar por
  `supervisor` pondría las filas en un orden que la pantalla no explica.

## Impacto en la sincronización

- **Pull**: sin cambios. Un dispositivo revocado ya recibe 401 en la guardia y no refresca token.
- **Push / outbox**: sin cambios de código. Lo que el celular de una persona dada de baja tenga
  en cola queda sin subir (la guardia lo rechaza), y se queda en el teléfono: la cola no borra.
  Es lo que avisa RF-18.
- **Idempotencia** y **reevaluación en servidor**: no aplican.

## Contrato de API

- `GET /api/panel/personas` — igual que hoy, cada fila con `celularActivo: boolean`. Guardia
  `requerirPermiso('personas','listar')`, alcance `filtroDeObra` (sin cambios).
- `DELETE /api/panel/personas/:id` — guardia `requerirPermiso('personas','escribir')` y
  `personaAlcanzable` (sin cambios).
  - 200 con la fila dada de baja (también cuando tenía celular).
  - 400 si es uno mismo.
  - 403 si un no-gerencia intenta dar de baja a gerencia (sin cambios).
  - 404 si no existe, está fuera de alcance o ya estaba de baja.
  - **Ya no devuelve 409.**

## Estrategia de verificación

- **`scripts/verificar-reglas.ts`**: la spec no añade reglas de negocio. Aun así, `ordenarFilas`
  es pura y barata de probar, así que entra con casos: tildes y mayúsculas, vacíos al final en
  los dos sentidos, empate por nombre, documentos numéricos (RF-12, RF-13).
- **Demo manual** (Chrome, como gerencia, sin escribir contraseñas):
  1. Personas: ordenar por Cargo ▲ y ▼, buscar, filtrar por obra, pasar a la página 2, ir a
     Vehículos y volver (RF-8 a RF-17).
  2. Dar de baja a una persona de prueba: la ventana sale centrada con el fondo oscuro, Esc y
     clic fuera cancelan, confirmar la da de baja (RF-1 a RF-6).
  3. Operador de prueba con celular activado: la ventana avisa del celular; confirmar; su
     celular deja de sincronizar (o, sin teléfono a mano, comprobar en la base que
     `revocado_en` quedó escrito) (RF-18 a RF-21).
  4. Abrir un preoperacional o un parte de esa persona y ver su nombre (RF-23).
  5. Abrir y cancelar la confirmación en Obras, Vehículos, Almacén y los catálogos de Cantera (RF-2).
- **Comprobaciones extra**: se toca una ruta `+api.ts` → reiniciar `npm run web` antes de
  probar. No se leen secretos nuevos ni se añaden rutas al operador.

## Riesgos

- **Una pantalla pinta el error de la acción justo debajo de la confirmación** y, al pasar a
  ventana, el mensaje queda detrás del telón. Se detecta en la demo 5; se corrige cerrando la
  ventana antes de ejecutar (como ya hace Personas) para que el error salga en la pantalla.
- **Producción**: dar de baja a alguien con celular ahora sí funciona y es irreversible desde el
  panel (no hay reactivar). La demo usa solo personas de prueba. Si se diera de baja a alguien
  por error, se revierte en la base (`eliminado_en = null`, `activo = true`,
  `revocado_en = null`) y se le emite un código nuevo.
- **`localStorage` bloqueado** (ventana privada): todo va en `try/catch` y la tabla arranca
  ordenada por nombre, que es lo de hoy.
- **Revertir el cambio entero**: no hay migración; basta volver los archivos.
