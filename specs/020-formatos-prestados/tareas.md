# Tareas — Spec 020

Tareas de menos de 30 minutos, ordenadas por dependencia. Cada una lleva los RF que
cubre y una línea `Hecho cuando:` que se pueda comprobar sin interpretar.

**Se implementa una tarea cada vez** (`/sdd:implementar T1`), y al terminarla se para.
Ninguna tarea se marca sin `npm run verificar`, `npm run typecheck` y `npm run lint`
en verde.

> **Antes del despliegue de esta spec:** cerrar la T7 de la spec 019 en el teléfono. Con
> la 020 en producción, ningún tipo queda sin formato y el mensaje de 019/RF-14 ya no se
> puede ver.

- [x] T1. Correspondencia de formatos en el catálogo de tipos, con sus casos.
      (RF-1…RF-8, RF-24)
      `src/shared/catalogos/tipos-vehiculo.ts`: campo `formatoDe` en los ocho tipos y
      función `formatoPrestadoDe(tipoId)`. Los ocho **conservan** `sinFormato` en esta
      tarea: se quita en T2, junto con las plantillas, para que la prueba «marca ↔
      plantilla» de la 019 no se rompa entre las dos. Casos en `verificar-reglas.ts`:
      - el origen de cada uno de los ocho tipos;
      - cada origen tiene formato propio y no es a su vez prestado;
      - el origen usa el mismo medidor que el tipo que lo toma prestado.
      Hecho cuando: los casos nuevos están en verde y los tres comandos pasan.

- [x] T2. Plantillas derivadas, con sus casos. (RF-9…RF-12, RF-14, RF-16, RF-23, RF-25)
      `src/features/checklists/types.ts` (`prestadoDe?`),
      `src/features/checklists/plantillas/prestadas.ts` (`plantillaPrestada`, pura) e
      `index.ts` (propias + derivadas). Los ocho tipos pierden `sinFormato`. Casos en
      `verificar-reglas.ts`:
      - las secciones, la cadena canónica, la versión y los medidores de cada derivada son
        iguales a los del origen;
      - el título y `prestadoDe` del camión;
      - `idDePlantilla` es `camion-v3`, sin choques;
      - misma decisión APTO/NO APTO con «no conforme» y con «na»;
      - las cinco propias intactas (id, versión, hash);
      - `formatoPendiente` en `false` para los 13;
      - un tipo inventado sin `formatoDe` ni plantilla sigue pendiente;
      - la lista de «sin formato» de la 019 pasa a `[]`.
      Hecho cuando: `verificar` muestra esos casos en verde, la prueba «marca ↔ plantilla»
      de la 019 sigue pasando y los tres comandos pasan.

- [x] T3. Etiqueta y aviso del formato de origen en Vehículos. (RF-18, RF-19)
      `src/features/panel/pantalla-vehiculos.tsx`: en la fila, «Formato <origen>» en lugar
      de «Sin formato»; en el formulario, el aviso «Se revisará con el formato de <origen>».
      Hecho cuando: con `npm run web` reiniciado y desarrollo sembrado, `PRUEBA-CAM-01`
      muestra «Formato Camioneta», `PRUEBA-EXO-01` «Formato Retroexcavadora», y al elegir
      Montacargas sale el aviso de la Motoniveladora; los tres comandos pasan.

- [x] T4. Título y versión del formato en el detalle del preoperacional. (RF-13, RF-13b)
      `src/features/panel/detalle-preoperacional.tsx`: el dato «Formato» muestra
      `plantilla.tituloFormato · vN`, y si no hay plantilla, el `tipo vN` de hoy.
      Hecho cuando: el detalle de un preoperacional existente de camioneta en desarrollo
      muestra «Preoperacional Camioneta · v3» (o el título real de su formato), y los tres
      comandos pasan. El caso prestado se ve en T6.

- [x] T5. Demo en el panel de desarrollo. (RF-18, RF-19, RF-20)
      Sembrar desarrollo (`db:sembrar:servidor`), reiniciar `npm run web` y comprobar
      Vehículos (etiquetas y aviso) y el inicio: los dos equipos de prueba ya cuentan como
      pendientes. Confirmar en la API de pull de desarrollo, o en la tabla, que existen
      las ocho filas derivadas.
      Hecho cuando: las ocho filas `<tipo>-vN` derivadas existen en `neondb`, las
      etiquetas y el aviso se ven, y el inicio cuenta los equipos de prueba. Sorpresas, a
      las notas.

- [ ] T6. Despliegue y demo en el teléfono (producción). (RF-10…RF-13b, RF-15, RF-21, RF-22)
      Requisito previo: la T7 de la 019 cerrada. Orden: `db:sembrar:produccion`, luego
      desplegar la imagen según `docs/despliegue.md`, y comprobar 200, 401 e inicio de
      sesión. En el teléfono, sin reinstalar:
      - sincronizar;
      - abrir el preoperacional del camión de prueba;
      - ver «Preoperacional Camión (formato Camioneta)»;
      - marcar un ítem «No aplica»;
      - firmar.
      En el panel, abrir el acta.
      Hecho cuando: el acta del camión aparece en el panel con el título, la versión y el
      resultado que dio el celular, sin discrepancia en observaciones.

- [ ] T7. Validación final: recorrido RF por RF de la spec y demo manual. (Todos)
      Hecho cuando: cada RF tiene su comprobación con resultado, los tres comandos están
      en verde y la spec queda marcada como Cumplida.

## Notas de ejecución

- **T1** (2026-09-28): `formatoDe` y `formatoPrestadoDe` en el catálogo. Los ocho tipos
  conservan `sinFormato` hasta T2, así que el panel y el celular todavía se comportan como
  antes. Las pruebas se escribieron primero y fallaron en `typecheck` (no existía
  `formatoPrestadoDe`). Hay 310 verificaciones en verde.
- **Para otra spec (no se tocó):** la pantalla Preoperacionales del panel lista las
  «máquinas sin preoperacional» del día sin descontar las de tipos sin formato, a
  diferencia del inicio (019/RF-21). Hoy no importa porque, tras la 020, ningún tipo queda
  sin formato; volvería a importar con un tipo futuro sin formato (RF-25).
- **T2** (2026-09-28): `plantillaPrestada` en `plantillas/prestadas.ts`, `prestadoDe?` en
  el tipo, y `PLANTILLAS` pasa a ser 5 propias + 8 prestadas. Los ocho tipos pierden
  `sinFormato`. Las pruebas se escribieron primero y fallaron en `typecheck`; hay 315
  verificaciones en verde.
  - **RF-25 no tiene prueba propia:** un tipo inventado da `formatoPendiente === false`
    solo por no existir, así que esa prueba no demostraba nada y se quitó. Lo sostiene la
    prueba de la 019 «marca ↔ plantilla»: un tipo sin plantilla y sin marca la hace fallar.
  - Desde aquí el panel ya no muestra «Sin formato» en esos equipos, y todavía no muestra
    «Formato <origen>»: eso llega en T3.
- **T3** (2026-09-28): etiqueta neutra (gris) «Formato <origen>» en la columna Estado y
  aviso informativo en el formulario. Comprobado en Chrome contra desarrollo:
  - `PRUEBA-CAM-01` muestra «Formato Camioneta» y `PRUEBA-EXO-01` «Formato
    Retroexcavadora»;
  - al elegir Montacargas sale «OCC no tiene formato propio para este tipo de equipo. Se
    revisará con el formato de Motoniveladora.» y el formulario pide solo horómetro.
  - «Formato Retroexcavadora» se parte en dos renglones dentro de la columna de 140 px,
    sin desbordar; la columna de botones queda visible.
  - No hizo falta sembrar para esto: la etiqueta sale del catálogo compartido en el
    código, no de la base.
- **T4** (2026-09-28): el dato «Formato» del detalle muestra `tituloFormato · vN`.
  Comprobado en Chrome con el acta `CAM-405` del 2026-09-18 en desarrollo: antes decía
  «camioneta v3» y ahora dice «INSPECCION PREOPERACIONAL DIARIA DE VEHICULO · v3». Cabe
  en una línea. El caso prestado se ve en T6.
  - **Para que Diego lo sepa, sin cambiar nada:** el título de los formatos **propios** es
    el literal del Excel de OCC («INSPECCION PREOPERACIONAL DIARIA DE VEHICULO»), no
    «Preoperacional Camioneta». Así que en el celular una camioneta sigue diciendo el
    título de OCC y un camión dirá «Preoperacional Camión (formato Camioneta)», que es lo
    que pide RF-12. Los estilos son distintos pero las dos cosas son correctas; si se
    quiere unificar, va por `/sdd:cambio`.
- **T5** (2026-09-28): se sembró `neondb` con 13 tipos y 13 plantillas. Una consulta
  directa a `plantillas` muestra las ocho derivadas (`camion-v3`, `carrotanque-v3`,
  `carro_taller-v3`, `excavadora-v2`, `excavadora_oruga-v2`, `montacargas-v2`,
  `vibrocompactadora-v2` y `recicladora-v2`), cada una con `prestadoDe`, su título y **el
  mismo hash que su origen** (p. ej. `a3a2d576a3` en `camion-v3` y en `camioneta-v3`). Las
  versiones anteriores siguen vivas. Inicio: la API da `equipos: 5`,
  `equiposInspeccionables: 5` y `sinInspeccionar: 5`, y la pantalla «0 de 5 equipos
  inspeccionados»: el camión y la oruga de prueba ya cuentan (RF-20). Las etiquetas y el
  aviso de Vehículos ya se vieron en T3. La consulta se hizo con un script temporal que
  se borró.
  - **Fuera de alcance, para otra spec:** el pie de la tarjeta «Kilómetros» del inicio
    dice «Camionetas y volquetas, por odómetro», y desde la 019 también suman camiones,
    carrotanques y carros taller. Igual la de «Horas de máquina» («Maquinaria amarilla»),
    que sigue siendo cierta.
- **T6, parte de despliegue** (2026-09-28, 17:30, commit `7785aec`):
  - `db:sembrar:produccion` → `preoperaocc` con 13 tipos y 13 plantillas;
  - `migrar-produccion` sin pendientes;
  - respaldo `anterior` = `d1c64fa` (la de la 019); imagen nueva `0ceb633` construida, con
    0 secretos en `dist/client`, transferida y encendida con `up -d`: healthy en unos
    10 s;
  - vecino 200, panel 200, `/api/panel/resumen` con cookie inventada 401.
  Con la sesión de Diego, en Vehículos de producción hay 6 equipos reales con etiqueta
  prestada: `CAMION-01` y `CTANQUE-01/02` → Camioneta; `EXC-01` (oruga) → Retroexcavadora;
  `REC-01` y `VIBROCMP-01` → Motoniveladora. Ninguno queda «Sin formato». El resumen da
  24 equipos, 24 inspeccionables y 24 sin preoperacional a esa hora (RF-18, RF-20).
  `PRUEBA-CAM-01` no aparece con ese código en producción. **Falta la parte del teléfono.**

