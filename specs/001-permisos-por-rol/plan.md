# Plan técnico — Spec 001

> Lee antes `docs/constitucion.md` y el `spec.md` de esta carpeta.
> Aquí va el CÓMO. Sin cambios de esquema y sin dependencias nuevas.

## La decisión de fondo

Hoy la autorización está repartida en frases sueltas dentro de cada ruta: cuatro usan
`requerirAdmin`, dos hacen comprobaciones a mano dentro de `personas`, y el resto no
comprueba nada. Así es como se llegó a que un residente pueda dar de baja un vehículo.

La corrección no es añadir catorce `if` más, sino **escribir una sola vez qué puede hacer
cada rol, como funciones puras**, y que cada ruta pregunte. Puras porque son reglas de
negocio y la constitución las quiere en un solo sitio y verificables sin base de datos ni
servidor — igual que las del preoperacional. Es lo que hace que RF-11 se pueda comprobar
en el guion de verificación y no solo pinchando la interfaz.

## Módulos y archivos

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `src/shared/rules/permisos.ts` | **Nuevo.** Funciones puras: qué módulos ve un rol y si puede hacer una acción sobre un módulo | RF-1, RF-2, RF-5..RF-9, RF-13..RF-15 |
| `src/features/servidor/guardia.ts` | `requerirPermiso(peticion, modulo, accion)` sobre `requerirSesion`, que consulta el módulo puro | RF-5, RF-11 |
| `src/features/servidor/alcance.ts` | `filtroDeObra` y `alcanzaLaObra` dejan de dar paso libre al supervisor sin obra | RF-10 |
| `src/app/api/panel/vehiculos+api.ts` y `vehiculos/[id]+api.ts` | POST, PATCH y DELETE pasan a exigir gerencia | RF-5 |
| `src/app/api/panel/personas+api.ts` y `personas/[id]+api.ts` | POST, PATCH y DELETE pasan a exigir gerencia; el PATCH valida el rol de destino | RF-5, RF-9 |
| `src/app/api/panel/personas/[id]/activacion+api.ts` | pasa a exigir gerencia | RF-13 |
| `src/app/api/panel/preoperacionales/[id]/anular+api.ts` | pasa a exigir gerencia | RF-14 |
| `src/app/api/panel/obras/**` | ya exige gerencia: se migra a la guardia nueva sin cambiar comportamiento | RF-5 |
| `src/features/panel/barra-navegacion.tsx` | `ENLACES` se filtra con el módulo puro | RF-1, RF-2 |
| `src/features/panel/marco.tsx` | `MarcoPantalla` acepta el módulo al que pertenece y corta con aviso si el rol no lo alcanza | RF-3 |
| `src/features/panel/pantalla-obras.tsx`, `pantalla-vehiculos.tsx`, `pantalla-personas.tsx` | declaran su módulo | RF-3 |
| `src/features/panel/pantalla-inicio.tsx` | las tarjetas y los avisos se filtran por lo que el rol alcanza | RF-15 |
| `src/features/panel/pantalla-preoperacionales.tsx`, `detalle-preoperacional.tsx` | el botón de anular solo para gerencia | RF-14 |
| `scripts/verificar-reglas.ts` | casos de `permisos.ts` y de `alcance.ts` | todos los de servidor |

Se reutiliza tal cual: `requerirSesion` y `requerirAdmin` (`guardia.ts:36` y `:65`),
`veTodasLasObras` / `filtroDeObra` / `alcanzaLaObra` (`alcance.ts`), `ETIQUETA_ROL` y `Rol`
(`contratos.ts:97-104`), `usePersona()` (`sesion.tsx:54`), `Aviso` y `MarcoPantalla`.

## Modelo de datos

**Sin cambios de esquema.** Ni local ni servidor. Ninguna migración.

El rol y la obra ya viajan en la sesión, que se lee de la base **en cada petición**
(`src/features/auth/servidor/sesion.ts:87-93`), no de la cookie. Eso ya cumple RF-12: no
hay nada que implementar, solo un caso que lo compruebe.

## El módulo de permisos

```ts
// src/shared/rules/permisos.ts — puro, sin I/O
export type Modulo = 'inicio' | 'obras' | 'personas' | 'vehiculos'
                   | 'asignaciones' | 'bitacoras' | 'preoperacionales';
export type Accion = 'ver' | 'listar' | 'escribir' | 'anular' | 'activar';

alcanza(rol: Rol, modulo: Modulo, accion: Accion): boolean
modulosVisibles(rol: Rol): Modulo[]
puedeCambiarRol(rolDeQuienPide: Rol, rolDestino: Rol): boolean
```

La tabla que codifica, una fila por módulo:

| Módulo | `admin` | `supervisor` | `operador` |
| --- | --- | --- | --- |
| inicio | ver | ver | — |
| obras | todo | — | — |
| personas | todo + activar | **listar** | — |
| vehiculos | todo | **listar** | — |
| asignaciones | todo | todo | — |
| bitacoras | todo + anular | todo + anular | — |
| preoperacionales | ver + anular | **ver** | — |

`listar` es la clave de RF-4: el residente **no** ve el módulo de Personas ni el de
Vehículos, pero sus listados siguen respondiéndole, porque Asignaciones y Bitácoras los
necesitan para llenar sus selectores. `modulosVisibles` solo devuelve los que tienen `ver`.

## Decisiones técnicas

- **Reglas puras en `src/shared/rules/` en vez de un `if` por ruta** → se descartó dejarlo
  en `guardia.ts` con un `switch`, porque entonces la única forma de comprobarlo sería
  levantar el servidor, y la constitución exige que toda regla nueva tenga su caso en
  `verificar-reglas.ts`. Además la interfaz necesita la misma tabla para filtrar el menú:
  puesta en `shared/`, el navegador y el servidor responden lo mismo por construcción.
- **Una guardia que recibe módulo y acción** (`requerirPermiso`) → se descartó multiplicar
  `requerirAdmin` en variantes (`requerirGerenciaOResidente`…), que es como se llega a
  catorce funciones parecidas y a olvidarse de una.
- **`requerirAdmin` se conserva** como atajo de `requerirPermiso(…, 'escribir')` para no
  reescribir las cuatro rutas de obras que ya funcionan.
- **El corte por módulo vive en `MarcoPantalla`**, no en cada pantalla → una pantalla nueva
  que olvide declarar su módulo falla del lado seguro (sin módulo declarado, se comporta
  como hoy y la ruta del servidor sigue protegiendo el dato).
- **RF-10 se arregla en `alcance.ts`, no en las rutas**: hoy `filtroDeObra` devuelve
  `undefined` —sin filtro— cuando el supervisor no tiene obra (`alcance.ts:40`), y
  `alcanzaLaObra` devuelve `true` (`:52`). Pasan a no alcanzar nada. La gerencia sigue
  entrando por `veTodasLasObras`.
- **RF-9 se implementa como `puedeCambiarRol`** y se aplica en el PATCH de personas aunque
  ese PATCH ya sea solo de gerencia: es la segunda cerradura que pide la spec.

## Contrato de API

No cambia ninguna forma de petición ni de respuesta. Cambia **quién recibe 403**:

| Ruta | Antes | Después |
| --- | --- | --- |
| `POST/PATCH/DELETE /api/panel/vehiculos…` | cualquier sesión | gerencia |
| `POST/PATCH/DELETE /api/panel/personas…` | cualquier sesión | gerencia |
| `POST /api/panel/personas/:id/activacion` | cualquier sesión | gerencia |
| `POST /api/panel/preoperacionales/:id/anular` | cualquier sesión | gerencia |
| `GET` de vehículos y personas | cualquier sesión | **sigue igual** (RF-4) |
| asignaciones, bitácoras, `GET` de preoperacionales y media | cualquier sesión | sigue igual |

El 403 lleva el mensaje que pide el requisito no funcional: qué no se puede hacer y quién
sí puede. El texto se arma en un solo sitio, dentro de la guardia.

## Impacto en la sincronización

**Sin impacto.** Ninguna ruta de `movil/`, ningún cambio en el pull ni en la cola de salida.

## Estrategia de verificación

En `scripts/verificar-reglas.ts`, contra `permisos.ts` y `alcance.ts`, que son puros:

- La tabla completa rol × módulo × acción, incluido que el operador no alcanza nada (RF-1,
  RF-2, RF-5..RF-8, RF-13, RF-14).
- `modulosVisibles('supervisor')` no contiene obras, personas ni vehículos, y sí los otros
  cuatro (RF-1, RF-15).
- El supervisor **sí** alcanza `listar` en personas y vehículos (RF-4). Este caso es el que
  evita que alguien "arregle" el permiso y rompa Asignaciones.
- `puedeCambiarRol`: supervisor→admin rechazado, admin→cualquiera permitido (RF-9).
- `filtroDeObra` y `alcanzaLaObra` con supervisor **sin** obra: no alcanzan nada (RF-10);
  con obra: solo la suya y las filas sin obra, como hoy.

Demo manual (RF-3, RF-11, RF-12, RF-15) descrita en los criterios de finalización de la
spec, más: cambiarle el rol a una persona con la sesión abierta y comprobar que la
siguiente acción ya usa el rol nuevo.

## Riesgos

- **Romper Asignaciones o Bitácoras** al cerrar de más los listados de vehículos y personas.
  Se detecta con el caso de RF-4 y con la demo manual de crear una asignación como
  residente. Se revierte quitando la guardia de esos dos `GET`.
- **Dejar una ruta sin migrar** a la guardia nueva. Se detecta recorriendo el árbol de
  `src/app/api/panel/` y comprobando que ninguna llama ya a `requerirSesion` a secas para
  escribir; la última tarea del troceo es exactamente ese recorrido.
- **Un supervisor sin obra que hoy trabaja normalmente** deja de ver nada tras RF-10. Es lo
  que pide la spec, pero conviene revisar antes si hay alguna cuenta así en la base.
