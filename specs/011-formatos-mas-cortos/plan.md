# Plan técnico — Spec 011

> Lee antes `docs/constitucion.md` y el `spec.md` de esta carpeta.
> Aquí va el CÓMO. Si algo de esto cambia el comportamiento acordado, no se resuelve
> en el plan: se vuelve a la spec.

## De un vistazo

Casi todo el trabajo cabe en **un archivo de datos** (`ajustes.ts`) y en **volver a correr el
importador**. No hay migración, no hay endpoint nuevo, no cambia un solo contrato. Lo que sí
hay que tocar con cuidado es el guion de verificación —porque sus cuentas cambian— y una
pantalla del móvil, para el borrador que se queda con el formato viejo.

## Módulos y archivos

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `src/features/checklists/plantillas/ajustes.ts` | El grueso: tablas de ítems retirados, ítems nuevos e ítems que pasan a inmovilizar, por tipo; y la versión de cada formato | RF-1 a RF-19, RF-24, RF-25 |
| `src/features/checklists/plantillas/*.json` | **Generados**, no se editan: aparecen `camioneta.v3.json`, `volqueta.v3.json` y las `v2` de las tres amarillas | RF-1 a RF-5 |
| `src/features/checklists/plantillas/index.ts` | Importa las versiones nuevas; las anteriores dejan de importarse y se quedan en la carpeta como registro | RF-22, RF-24 |
| `src/features/checklists/repositorio.ts` | `abrirBorrador` detecta que el borrador guardado se hizo con otra versión y lo descarta | RF-27, RF-28 |
| `src/features/checklists/pantalla-preoperacional.tsx` | El aviso de «el formato cambió» al operador | RF-27 |
| `scripts/verificar-reglas.ts` | Cuentas nuevas por formato, ítems retirados ausentes, inmovilizantes nuevos y el NO APTO de una amarilla | Todos los verificables |
| `docs/*.xlsx` | **No se tocan.** Son el formato firmado por OCC y siguen siendo la fuente | — |

No se toca: el panel, ninguna ruta de `api/`, `inspeccion.ts` ni el motor de sincronización.

## Modelo de datos

**Sin cambios de esquema**, ni local ni en el servidor. Una plantilla ya es una fila
(`plantillas`, con `id = <tipo>-v<version>`, `hash` y `esquema` en JSON) y lo único que pasa
es que aparecen cinco filas más.

- **Local** (`src/db/local/schema.ts`): un valor más en el tipo `EstadoSync`
  (`descartado`), que es TypeScript sobre una columna de texto y no genera migración; hay que
  correr `npm run db:generate` igual y confirmar que no hay cambios. `sembrarBaseLocal` inserta con
  `onConflictDoNothing` y las versiones nuevas tienen id distinto, así que entran solas en el
  primer arranque tras actualizar la app. **Las anteriores se quedan**, que es lo que permite
  leer un borrador o un acta vieja.
- **Servidor** (`src/db/servidor/esquema.ts`): sin cambios. `npm run db:sembrar:servidor`
  inserta las nuevas; las anteriores no están en `PLANTILLAS` y por tanto **ni se tocan ni se
  marcan como eliminadas** (RF-22).
- **Migraciones**: ninguna. Se corre `npm run db:generate` por disciplina —tocamos
  `schema.ts`— y tiene que responder que no hay cambios; `db:generate:servidor` no se toca.
- **Compatibilidad**: un teléfono que no haya actualizado la app sigue con el formato que
  tiene, firma contra él y lo sube; el servidor lo evalúa con **esa** versión, que sigue viva
  (RF-23). No hay nada que forzar ni que caducar.

## Algoritmo / reglas

### 1. Los ajustes, como datos (RF-1 a RF-16)

`ajustes.ts` pasa de tener un solo ajuste a tener una tabla por tipo de vehículo:

```
AJUSTES[tipoVehiculo] = {
  version,                 // 3 para camioneta y volqueta, 2 para las tres amarillas
  retirados:   Set<clave>, // anexo A
  inmovilizan: Set<clave>, // anexo C, los que pasan a inmovilizar
  nuevos:      ItemNuevo[] // anexo B, con su sección de destino
}
```

`aplicarAjustes` hace, en este orden:

1. Quita el ítem de horómetro de camioneta y volqueta (lo que ya hacía).
2. **Retira** los ítems cuya clave está en `retirados`.
3. **Marca** `inmoviliza: true` en los que están en `inmovilizan`.
4. **Añade** los `nuevos` a su sección, al final.
5. Elimina las secciones que quedaron vacías (RODAJE de camioneta desaparece así).
6. **Recalcula `periodicidades`** con las que queden entre los ítems supervivientes — sin
   esto, la camioneta seguiría anunciando un ciclo mensual que ya no tiene ningún ítem
   (RF-8), y la pantalla ofrecería una revisión vacía.
7. Fija la `version` del tipo.

Las claves se escriben **completas y a mano** en las tablas (`frenos__bandas_y_campanas`, no
un índice ni un trozo de texto): una clave es el identificador estable de un ítem, y una
tabla que dependa del orden del Excel se rompe la próxima vez que OCC mueva una fila.

### 2. Las claves de los ítems nuevos (RF-25)

Se construyen con la misma regla que usa el importador —`<seccionKey>__<slug(label)>`—, así:

| Ítem | Clave |
| --- | --- |
| Los frenos responden bien (volqueta) | `frenos__los_frenos_responden_bien` |
| Dirección sin juego ni ruidos (volqueta) | `dirreccion__direccion_sin_juego_ni_ruidos` |
| Documentos al día… (volqueta) | `adicionales__documentos_al_dia` |
| Dirección sin juego ni ruidos (camioneta) | `chasis__direccion_sin_juego_ni_ruidos` |

Ninguna coincide con una retirada (la sección `dirreccion` conserva su nombre con la errata
del Excel a propósito: es la clave de la sección, y renombrarla movería las claves de todo lo
demás).

### 3. El borrador con formato viejo (RF-27, RF-28)

`abrirBorrador` ya guarda `plantillaVersion` y `plantillaHash` con cada borrador. Se añade:

1. Al abrir un borrador existente, comparar su `plantillaVersion` con la de la plantilla
   vigente para ese tipo. Hoy `abrirBorrador` devuelve el borrador guardado **con la plantilla
   nueva**, que es exactamente la mezcla que RF-27 evita.
2. Si no coinciden: marcar ese borrador como `descartado` —**baja lógica, no `DELETE`**— y
   abrir uno nuevo con la plantilla vigente. `descartado` es un valor nuevo de `EstadoSync`
   (`borrador | pendiente | sincronizado | rechazado`), que es un tipo de TypeScript sobre una
   columna de texto: **no cambia el SQL**, y `npm run db:generate` debe decir que no hay
   cambios. Sin ese estado, el borrador viejo volvería a ser el más reciente en cuanto se
   firmara el nuevo, y se descartaría otra vez en bucle.
3. La pantalla enseña el aviso: «El formato cambió. Este preoperacional hay que empezarlo de
   nuevo.»

Un borrador nunca se ha subido (solo sube lo firmado), así que descartarlo no toca la cola ni
el servidor.

## Decisiones técnicas

- **La poda vive en `ajustes.ts` y no en los JSON** → se descartó editar los JSON generados
  porque `npm run formatos` los regenera y el ajuste se perdería en silencio; y se descartó
  pedirle a OCC un Excel podado porque no lo ha enviado y esto no puede esperar a eso.
- **Las tablas van por clave y no por índice** → se descartó «quitar el ítem 4 de la sección
  3» porque cualquier fila nueva en el Excel desplazaría la poda sin que nada falle a la
  vista, y acabaríamos retirando un ítem distinto del acordado.
- **Sube la versión de los cinco formatos** → se descartó editar la versión vigente porque la
  huella de la plantilla se firma con cada acta: alterar lo que pregunta un formato sin
  cambiar su versión dejaría a las actas viejas apuntando a una plantilla que ya no es la que
  usaron (constitución, principio 4: la evidencia no se sobrescribe).
- **Las versiones anteriores se conservan y se siguen sirviendo en el pull** → se descartó
  darlas de baja porque el servidor las necesita para reevaluar un acta que suba tarde
  (RF-23) y el panel para pintar los títulos de sus secciones.
- **Un ítem resumido nuevo en vez de dejar la sección vacía** (frenos y dirección de la
  volqueta) → se descartó borrar la sección entera porque dejaría a la volqueta sin ninguna
  pregunta de frenos, y se descartó conservar los técnicos porque son exactamente los que el
  operador no puede responder sin taller. Es lo acordado en la spec.
- **El borrador se descarta y se avisa** → se descartó conservarlo con su formato viejo
  (dos operadores llenarían formatos distintos el mismo día) y se descartó fusionar respuestas
  (el acta mezclaría dos formatos y sería imposible de verificar).
- **No se toca `inspeccion.ts`** → la lógica de APTO / NO APTO ya lee `inmoviliza` de la
  plantilla; marcar más ítems basta para que las amarillas puedan quedar NO APTO (RF-17). Se
  descartó cualquier regla nueva: una regla se escribe una sola vez y esta ya existe.

## Impacto en la sincronización

- **Pull**: el servidor manda el catálogo completo de plantillas no eliminadas, así que los
  teléfonos reciben las nuevas **y** conservan las anteriores. El pull nunca borra
  (`apagarLoQueYaNoViene` no toca plantillas), que es justo lo que hace falta aquí.
- **Push / outbox**: sin cambios. No hay entidades nuevas ni cambia el orden de `seq`.
- **Idempotencia**: sin cambios.
- **Reevaluación en servidor**: sin cambios de código, pero conviene entender el efecto —el
  servidor busca la plantilla **de la versión con la que se firmó** y reevalúa con ella. Al
  conservar las versiones viejas, un acta firmada con la v2 de volqueta que suba la semana que
  viene se sigue verificando bien. Si se hubieran borrado, el servidor aceptaría el veredicto
  del teléfono sin poder comprobarlo.

## Contrato de API

Sin cambios. Ningún endpoint nuevo ni modificado; la app móvil manda lo mismo que hoy y el
panel lee lo mismo que hoy.

## Estrategia de verificación

### `scripts/verificar-reglas.ts`

Casos que **cambian** (hoy afirman lo contrario y van a fallar, que es la señal de que el
trabajo está hecho):

- El que cuenta los 86 ítems de la volqueta.
- El de «camioneta y volqueta ya no piden horómetro»: sigue valiendo, pero la versión que
  comprueba pasa de 2 a 3 (RF-18).

Casos **nuevos**, uno por bloque de RF:

- **Conteos** (RF-1 a RF-5): cada formato tiene exactamente los ítems que dice la spec —55,
  39, 42, 40, 43— y el número de secciones esperado.
- **Ítems retirados** (RF-6): ninguna de las claves del anexo A aparece en el formato vigente
  de su tipo; y **todas existían** en la versión anterior — sin esta segunda mitad, una clave
  mal escrita daría el caso en verde sin haber retirado nada.
- **Ítems nuevos** (RF-9 a RF-11): existen con su clave, en su sección, diarios y con
  `inmoviliza`.
- **Inmovilizantes** (RF-12 a RF-16): la cuenta por formato es la del anexo C —15, 12, 12, 8,
  7— y las claves concretas están marcadas.
- **NO APTO de una amarilla** (RF-17): evaluar un preoperacional de motoniveladora con el
  cinturón marcado como no conforme da NO APTO. Hoy ese caso daría APTO.
- **Periodicidades** (RF-7, RF-8): la camioneta no anuncia ciclo mensual y ningún ítem
  superviviente cambió de periodicidad respecto a la versión anterior.
- **Versiones** (RF-24): los cinco formatos vigentes tienen la versión que dice el plan, y las
  anteriores siguen siendo archivos distintos.

### Demo manual

1. En un teléfono actualizado, abrir una **volqueta**: contar que ya no están frenos ni
   dirección técnicos, y que aparecen los tres ítems nuevos.
2. Firmar y verla llegar al panel con sus 55 ítems.
3. En una **motoniveladora**, marcar el cinturón como no conforme: la máquina queda **NO
   APTO** y la pantalla de resultado no deja seguir.
4. En el panel, abrir un acta **anterior** al cambio y comprobar que sigue mostrando los
   ítems retirados, con sus fotos y comentarios (RF-20).
5. Dejar un preoperacional a medio llenar **antes** de actualizar la app y retomarlo después:
   debe avisar y empezar de nuevo (RF-27).

### Comprobaciones extra

No se lee ningún secreto y no se añade ninguna pantalla al operador, así que no hace falta
`expo export` ni el `grep` sobre `dist/client`. Sí hay que correr `npm run formatos` y
`npm run db:sembrar:servidor`, y confirmar que en Neon quedan las diez filas de plantillas
(cinco vigentes y cinco anteriores).

## Riesgos

- **Una clave mal escrita en las tablas de poda**: el ítem no se retira y nadie lo nota. Lo
  detecta el caso que exige que cada clave retirada **existiera** en la versión anterior.
- **Regenerar los formatos sin querer**: `npm run formatos` reescribe los archivos. Como la
  versión la fija `ajustes.ts`, los vigentes se regeneran idénticos; el peligro es correrlo
  con un Excel distinto al de hoy. Se detecta con los conteos del guion.
- **Sembrar el servidor y olvidarse**: los teléfonos tendrían formatos que el servidor no
  conoce, y este aceptaría sus actas sin poder verificarlas (lo dice en las observaciones del
  acta). Se detecta abriendo un acta nueva en el panel y viendo si trae esa nota.
- **Una obra parada por las amarillas**: desde el día que esto entre, una llanta o una oruga
  en mal estado deja la máquina NO APTO. Es lo buscado, pero conviene avisar a la obra antes
  de publicar. Se revierte quitando esas claves de `inmovilizan` y subiendo otra versión.
- **Actualizaciones desiguales**: durante unos días convivirán teléfonos con formato viejo y
  nuevo. No rompe nada —cada acta se evalúa con su versión—, pero dos operadores verán
  formatos distintos el mismo día. Es temporal y no tiene arreglo razonable.
