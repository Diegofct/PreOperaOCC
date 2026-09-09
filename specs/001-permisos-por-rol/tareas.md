# Tareas — Spec 001

Tareas de menos de 30 minutos, ordenadas por dependencia. Cada una lleva los RF que cubre y
una línea `Hecho cuando:` que se pueda comprobar sin interpretar.

**Se implementa una tarea cada vez** (`/sdd:implementar T1`), y al terminarla se para.
Ninguna tarea se marca sin `npm run verificar`, `npm run typecheck` y `npm run lint` en
verde.

Primero la regla pura y su comprobación; después el servidor, que es donde el permiso es
real; y solo al final la interfaz, que es la capa que se puede saltar. En ese orden, si algo
se queda a medias, lo que queda a medias es lo cosmético y no el control.

## La regla

- [x] T1. `src/shared/rules/permisos.ts`: `Modulo`, `Accion`, la tabla rol × módulo ×
      acción, y `alcanza`, `modulosVisibles` y `puedeCambiarRol`. Puro, sin I/O.
      (RF-1, RF-2, RF-4..RF-9, RF-13, RF-14)
      Hecho cuando: en `scripts/verificar-reglas.ts` están en verde la tabla completa, que
      el operador no alcanza nada, que el supervisor **sí** alcanza `listar` en personas y
      vehículos pero no `ver`, y que `puedeCambiarRol('supervisor','admin')` es falso.

- [x] T2. `src/features/servidor/alcance.ts`: un supervisor sin obra deja de alcanzar
      todo. `filtroDeObra` y `alcanzaLaObra` dejan de devolver paso libre cuando `obraId`
      es nulo; la gerencia sigue entrando por `veTodasLasObras`. (RF-10)
      Hecho cuando: hay casos en verde para supervisor sin obra (no alcanza nada),
      supervisor con obra (la suya y las filas sin obra, como hoy) y gerencia (todo), y el
      comentario del módulo explica el cambio de criterio.

## El servidor

- [x] T3. `src/features/servidor/guardia.ts`: `requerirPermiso(peticion, modulo, accion)`
      sobre `requerirSesion`, que pregunta a `permisos.ts` y arma el 403 con el mensaje de
      qué no se puede hacer y quién sí puede. `requerirAdmin` se conserva. (RF-5, RF-11)
      Hecho cuando: `npm run typecheck` en verde y una ruta de prueba —la de obras, que ya
      exigía gerencia— usa la guardia nueva sin cambiar de comportamiento.

- [x] T4. Vehículos: `POST /api/panel/vehiculos` y `PATCH`/`DELETE` de
      `vehiculos/[id]` pasan a exigir gerencia. El `GET` **no se toca**. (RF-5)
      Hecho cuando: los tres métodos usan `requerirPermiso(…, 'vehiculos', 'escribir')` y el
      `GET` sigue respondiendo al residente con el filtro de obra de siempre.

- [x] T5. Personas: `POST` y `PATCH`/`DELETE` de `personas/[id]` pasan a exigir gerencia, y
      el `PATCH` aplica `puedeCambiarRol` sobre el rol que llega en el cuerpo —que hoy no
      valida nada. El `GET` **no se toca**. (RF-5, RF-9)
      Hecho cuando: un `PATCH` con `rol: 'admin'` hecho por un supervisor es rechazado, y el
      `GET` sigue respondiendo al residente.

- [x] T6. Códigos y anulación: `POST /personas/[id]/activacion` y
      `POST /preoperacionales/[id]/anular` pasan a exigir gerencia. (RF-13, RF-14)
      Hecho cuando: las dos rutas responden 403 con sesión de residente y siguen
      funcionando con sesión de gerencia.

- [x] T7. Recorrido de cierre del servidor: ninguna ruta de escritura bajo
      `src/app/api/panel/` llama ya a `requerirSesion` a secas. Las de obras se migran a la
      guardia nueva; asignaciones, bitácoras y los `GET` se dejan como están, de forma
      deliberada y comentada. (RF-5, RF-11)
      Hecho cuando: un `grep` de `requerirSesion` sobre `src/app/api/panel/` solo devuelve
      lecturas y las rutas que el plan declara abiertas al residente.

## La interfaz

- [x] T8. `src/features/panel/barra-navegacion.tsx`: `ENLACES` se filtra con
      `modulosVisibles(persona.rol)`. (RF-1, RF-2)
      Hecho cuando: con sesión de residente la barra muestra Inicio, Asignaciones,
      Bitácoras y Preoperacionales, y con gerencia las muestra todas.

- [x] T9. `MarcoPantalla` acepta el módulo al que pertenece la pantalla y corta con un
      `Aviso` si el rol no lo alcanza; `pantalla-obras`, `pantalla-vehiculos` y
      `pantalla-personas` declaran el suyo. (RF-3)
      Hecho cuando: abrir `/panel/vehiculos` con sesión de residente muestra el aviso de que
      el módulo es de gerencia y **no** carga ni pinta ningún dato.

- [x] T10. `src/features/panel/pantalla-inicio.tsx`: las tarjetas y los avisos se filtran
      por lo que el rol alcanza. (RF-15)
      Hecho cuando: el inicio del residente no muestra cifras ni atajos de Obras, Vehículos
      ni Personas, y el de gerencia sigue igual que hoy.

- [x] T11. El botón de anular un preoperacional solo aparece para la gerencia, en
      `pantalla-preoperacionales.tsx` y `detalle-preoperacional.tsx`. (RF-14)
      Hecho cuando: el residente ve el preoperacional completo, con firma y fotos, y sin
      botón de anular.

## Cierre

- [ ] T12. Validación final: recorrido RF por RF de la spec y demo manual de punta a punta.
      (Todos)
      Hecho cuando: cada uno de los 15 RF tiene su comprobación con resultado, los tres
      comandos están en verde, la demo de los criterios de finalización pasa —incluido
      cambiarle el rol a una persona con la sesión abierta y ver que la siguiente acción ya
      usa el nuevo (RF-12)— y la spec queda marcada como Cumplida.

## Notas de ejecución

- **Antes de T2**, comprobar en la base si existe alguna cuenta de supervisor sin obra
  asignada. Hoy esa configuración da paso libre a todo; después de T2 se queda sin ver
  nada. Es el riesgo que el plan marcó para revisar antes, no después.
- T4 a T7 tocan rutas que hoy funcionan. Si alguna pantalla del residente deja de cargar,
  el sospechoso es un `GET` cerrado de más: son los de vehículos y personas los que
  Asignaciones y Bitácoras necesitan (RF-4).
