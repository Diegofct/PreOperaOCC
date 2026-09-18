# Plan técnico — Spec 012

> Lee antes `docs/constitucion.md` y el `spec.md` de esta carpeta.
> Aquí va el CÓMO. Si algo de esto cambia el comportamiento acordado, no se resuelve
> en el plan: se vuelve a la spec.

## De un vistazo

Esto es sobre todo **quitar**: una pantalla pierde su mitad de abajo, una función del
repositorio desaparece y un endpoint deja de aceptar altas. Lo único que se añade es un
rechazo en el servidor y un aviso en el celular. No hay migración y no cambia ninguna tabla.

Lo delicado no es el código, es el **orden en que se publica**: mientras haya teléfonos sin
actualizar, el servidor tiene que rechazar lo que ellos manden, y ese rechazo tiene que ser
del tipo que la cola de subida entiende como definitivo. Si no, una asignación imposible se
queda reintentando y **bloquea la cola entera del teléfono**, incluidos los preoperacionales
firmados.

## Módulos y archivos

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `src/features/checklists/pantalla-vehiculo.tsx` | Pierde la sección «Otros vehículos de la obra» y la llamada a `autoasignar`. Queda como lista de las máquinas propias | RF-1, RF-2, RF-6, RF-7 |
| `src/features/checklists/inicio-operador.tsx` | El caso «sin asignación» deja de ofrecer «Escoger vehículo» y pasa a decir a quién pedírselo | RF-8, RF-9 |
| `src/features/checklists/repositorio.ts` | Desaparecen `autoasignar()` y `flotaDeObra()`, que solo existían para esa pantalla | RF-3 |
| `src/app/api/movil/asignaciones+api.ts` | El `POST` deja de crear: responde **422** con su motivo | RF-4, RF-5 |
| `src/features/panel/pantalla-asignaciones.tsx` | Fuera el botón «Confirmar» y el banner de pendientes; la etiqueta «Sin confirmar» se queda en las filas históricas | RF-15, RF-16, RF-17 |
| `src/features/panel/pantalla-inicio.tsx` | Fuera el aviso de asignaciones por confirmar y la consulta que lo alimenta | RF-16 |
| `src/app/api/panel/asignaciones/[id]+api.ts` | La acción `confirmar` deja de existir; `cerrar` se queda | RF-15, RF-18 |
| `src/features/panel/contratos.ts` | `asignacionEditada` pierde la acción `confirmar` | RF-15 |
| `scripts/cerrar-autoasignadas.ts` | **Nuevo**: cierra de una vez las autoasignadas vigentes | RF-13, RF-14 |
| `AGENTS.md` | La regla «no bloquees al operador» pasa a describir el sistema nuevo | — |

Comentarios que hoy argumentan lo contrario y hay que reescribir, porque si no el archivo
miente: `pantalla-vehiculo.tsx:4`, `api/movil/asignaciones+api.ts:18`, `db/local/schema.ts:132`
y `api/panel/asignaciones+api.ts:17`.

No se toca: el motor de sincronización, la tabla `asignaciones` ni el enum `origen`.

## Modelo de datos

**Sin cambios de esquema**, ni local ni en el servidor.

- **Local** (`src/db/local/schema.ts`): la tabla `asignaciones` se queda igual, con su columna
  `origen`. El móvil deja de escribir en ella, pero la sigue leyendo: es una réplica de lo que
  manda el servidor.
- **Servidor** (`src/db/servidor/esquema.ts`): igual. El enum `origen_asignacion`
  (`supervisor | autoasignada`) **no se toca**: `autoasignada` describe lo que pasó en filas
  que ya existen, y quitarlo sería reescribir la historia (RF-14, y constitución: nada se
  borra).
- **Migraciones**: ninguna.
- **Compatibilidad**: un teléfono sin actualizar sigue enseñando la pantalla vieja y puede
  crear una asignación local. Al sincronizar, el servidor la rechaza (RF-4) y el pull la apaga
  —`apagarLoQueYaNoViene` cierra con `hasta = ahora` lo que no vino en la instantánea—. El
  operador ve desaparecer esa máquina de su lista, que es el comportamiento correcto.

### El cierre de las que ya existen (RF-13)

Un script de una sola corrida, no una migración: es un cambio de datos de negocio, no de
forma. Cierra con `hasta = ahora` las filas con `origen = 'autoasignada'` y `hasta is null`,
**sin tocar `origen`**, e imprime cuáles cerró para que quede registro en las notas de la
tarea.

## Algoritmo / reglas

No hay regla de negocio nueva. La decisión de qué ve el operador ya existe y es una consulta:
`asignacionesVigentesDe(usuarioId)`. Lo único que cambia es que **esa consulta pasa a ser la
única fuente** de la pantalla, en vez de una de dos.

El rechazo del servidor es una guarda, no una regla:

1. El `POST` de `/api/movil/asignaciones` sigue autenticándose con el token del equipo.
2. Responde siempre **422** con «Las asignaciones las registra la administración desde el
   panel.»
3. No consulta la base ni escribe nada.

## Decisiones técnicas

- **El endpoint se queda y responde 422** → se descartó borrar la ruta, porque un teléfono
  viejo recibiría un 404 del router, que la cola trata como fallo transitorio: reintentaría
  ocho veces y, mientras tanto, **se corta la tanda y no suben los preoperacionales de
  atrás**. Con 422 (`esDefinitivo` en `push.ts:53`) esa fila se marca fallida, la cola sigue y
  el trabajo firmado sale del teléfono. Es la diferencia entre un envío imposible y un
  teléfono atascado.
- **422 y no 409 ni 403** → 409 y 403 son transitorios para la cola; solo 400 y 422 son
  definitivos. Se elige 422 porque la petición está bien formada y lo que ya no existe es la
  operación.
- **El pull sigue bajando todos los vehículos de la obra** → se descartó bajar solo los
  asignados, aunque sería lo coherente con la spec. Hoy el catálogo completo es lo que permite
  que, cuando el residente asigne una máquina a un operador que está sin señal, **el equipo ya
  tenga esa máquina bajada** y la vea en cuanto sincronice; si solo bajara las suyas, haría
  falta una segunda sincronización. Además el catálogo es pequeño. Queda escrito para que no
  parezca un olvido.
- **`autoasignar()` y `flotaDeObra()` se borran, no se dejan sin usar** → se descartó dejarlas
  «por si acaso»: una función que crea asignaciones locales es exactamente lo que esta spec
  prohíbe, y dejarla viva invita a que alguien la vuelva a llamar.
- **El tipo `asignacion` se queda en la cola de salida** → se descartó quitarlo, por lo mismo
  que se hizo con `bitacora` en la spec 004: un teléfono puede tener una encolada sin subir, y
  sin el tipo esa fila quedaría varada para siempre. Subirá, recibirá el 422 y se marcará
  fallida, que es un final limpio.
- **Las autoasignadas se cierran con un script y no a mano desde el panel** → se descartó
  pedirle a Diego que las cierre una por una: son las de todas las obras, y una corrida deja
  registro de qué se cerró y cuándo.
- **La etiqueta «Sin confirmar» se queda en el panel** → se descartó quitarla junto con el
  botón: las filas históricas siguen diciendo la verdad sobre cómo se tomó esa máquina, y eso
  es evidencia (RF-17).

## Impacto en la sincronización

- **Pull**: sin cambios. Sigue trayendo asignaciones y vehículos igual que hoy, y sigue
  apagando lo que deja de venir.
- **Push / outbox**: el móvil deja de encolar `asignacion`. El tipo y su ruta se quedan para
  drenar lo que haya quedado encolado. El orden de `seq` no cambia.
- **Idempotencia**: sin cambios. Una asignación que ya se procesó antes del cambio sigue
  respondiendo `duplicado`; lo que no existía se rechaza con 422.
- **Reevaluación en servidor**: no aplica; las asignaciones no se reevalúan.

## Contrato de API

**`POST /api/movil/asignaciones`** — se conserva la ruta y la guardia de token
(`requerirEquipo`), y pasa a responder siempre:

```
422 { error: "Las asignaciones las registra la administración desde el panel." }
```

**`PATCH /api/panel/asignaciones/[id]`** — abre con la guardia de sesión y el permiso de
`asignaciones/escribir`, como hoy. `accion` pasa de `'confirmar' | 'cerrar'` a `'cerrar'`. Un
`confirmar` que llegue de un panel viejo cae en la validación del contrato y responde 400.

El `GET` y el `POST` del panel no cambian.

## Estrategia de verificación

### `scripts/verificar-reglas.ts`

Aquí hay poco que sea regla pura, y conviene decirlo en vez de inventar casos:

- **Contrato**: `asignacionEditada` acepta `{ accion: 'cerrar' }` y **rechaza**
  `{ accion: 'confirmar' }`. Es el caso que impide que la acción vuelva por la puerta de atrás.
- **Definitivo**: comprobar que 422 es un fallo definitivo para la cola —ya hay casos de
  `reintentos.ts`; se añade el que ata 422 con «no vuelve a intentarse», que es de lo que
  depende que un teléfono viejo no se atasque.

### Demo manual

1. Con `operador1` (dos vehículos asignados): entrar a «Cambiar vehículo» y comprobar que
   **solo aparecen sus dos** y ninguna otra máquina de la obra.
2. Hacer el preoperacional de uno, volver, cambiar al otro.
3. Con un operador **sin asignación**: ver el aviso y comprobar que no hay forma de llegar al
   formulario.
4. Asignarle un vehículo desde el panel, sincronizar y verlo aparecer.
5. En el panel: comprobar que ya no está el botón «Confirmar» ni el aviso de pendientes, y que
   una fila histórica sigue diciendo «Sin confirmar».
6. Correr el script de cierre y ver en el panel que esas filas quedan «Cerrada».

### Comprobaciones extra

No se lee ningún secreto nuevo. Sí conviene `npx expo export --platform web` porque se tocan
pantallas del operador, para confirmar que la frontera web/nativo sigue en pie.

## Riesgos

- **Un teléfono viejo con la cola atascada**: si el rechazo no fuera definitivo, sus
  preoperacionales firmados dejarían de subir. Se detecta mirando `estado` en la cola del
  equipo y la píldora del inicio; se evita con el 422, y el caso de verificación lo vigila.
- **Un operador sin asignación que no puede trabajar**: es el riesgo aceptado de la spec. Se
  detecta porque llama a su residente; se revierte devolviendo la sección «Otros vehículos» a
  la pantalla, que es un cambio pequeño y localizado.
- **Cerrar autoasignadas de operadores que están trabajando ahora mismo**: el script se corre
  con la obra avisada, y lo que ya esté empezado se puede terminar y firmar (RF-11).
- **El panel viejo abierto en otra pestaña** mandando `confirmar`: responde 400 y no rompe
  nada; basta con recargar.
