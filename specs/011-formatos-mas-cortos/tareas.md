# Tareas — Spec 011

Tareas de menos de 30 minutos, ordenadas por dependencia. Cada una lleva los RF que
cubre y una línea `Hecho cuando:` que se pueda comprobar sin interpretar.

**Se implementa una tarea cada vez** (`/sdd:implementar T1`), y al terminarla se para.
Ninguna tarea se marca sin `npm run verificar`, `npm run typecheck` y `npm run lint`
en verde.

- [x] T1. Las claves de los 82 ítems que se retiran, como datos. (RF-6, RF-25)
      En `ajustes.ts`, una tabla por tipo con las claves del anexo A —todavía sin usarlas— y
      las de los cuatro ítems nuevos del anexo B. Caso en el guion que abre las plantillas
      **anteriores** (`volqueta.v2.json`, `camioneta.v2.json` y las `v1` de las tres
      amarillas) y comprueba que **cada clave retirada existe ahí**, y que ninguna de las
      cuatro claves nuevas existe ya.
      Hecho cuando: el caso cuenta 34, 20, 11, 8 y 9 claves por tipo y todas se encuentran;
      los tres comandos en verde. *Sin esta tarea, una clave mal escrita pasaría inadvertida
      el resto del trabajo: el ítem no se retiraría y nada fallaría.*

- [x] T2. La poda: retirar, limpiar secciones vacías, recalcular periodicidades y subir la
      versión. (RF-1 a RF-8, RF-24)
      `aplicarAjustes` retira las claves de T1, descarta las secciones que quedan sin ítems,
      recalcula `periodicidades` con las que sobrevivan y fija la versión (camioneta y
      volqueta 3; motoniveladora, retrocargador y retroexcavadora 2). `index.ts` pasa a
      importar los archivos nuevos. Se corre `npm run formatos`.
      En el mismo paso se actualizan los dos casos que hoy afirman lo contrario: el de los 86
      ítems de la volqueta y el de «camioneta y volqueta ya no piden horómetro», cuya versión
      pasa de 2 a 3.
      Hecho cuando: existen `volqueta.v3.json` (52 ítems), `camioneta.v3.json` (38),
      `motoniveladora.v2.json` (42), `retrocargador.v2.json` (40) y
      `retroexcavadora.v2.json` (43); la camioneta ya no anuncia periodicidad mensual y la
      sección RODAJE no existe; los archivos anteriores siguen en la carpeta; los tres
      comandos en verde.

- [x] T3. Los cuatro ítems nuevos del anexo B. (RF-9, RF-10, RF-11, RF-25)
      Se añaden a su sección, diarios y de conformidad: «Los frenos responden bien» y
      «Dirección sin juego ni ruidos» en volqueta, «Documentos al día (SOAT, técnicomecánica y
      tarjeta de propiedad)» en sus adicionales, y «Dirección sin juego ni ruidos» en el
      chasis de la camioneta.
      Hecho cuando: volqueta queda en **55** ítems y camioneta en **39**; el guion comprueba
      que las cuatro claves existen, están en la sección que dice el plan, son diarias y no
      chocan con ninguna retirada; los tres comandos en verde.

- [x] T4. Lo que inmoviliza cada formato. (RF-12 a RF-17)
      Se marcan los del anexo C: los cuatro ítems nuevos de T3, el ventilador/correas/bomba de
      agua de la camioneta —que hereda la marca del ítem mensual retirado— y los de las tres
      máquinas amarillas, llantas y orugas incluidas.
      Hecho cuando: el guion cuenta 15, 12, 12, 8 y 7 ítems inmovilizantes por formato, con
      sus claves nombradas una a una; **un preoperacional de motoniveladora con el cinturón
      marcado como no conforme da NO APTO** (hoy ese mismo caso da APTO); los tres comandos en
      verde.

- [x] T5. El borrador que se empezó con el formato anterior. (RF-27, RF-28)
      `EstadoSync` suma el valor `descartado`; `abrirBorrador` compara la versión guardada con
      la vigente y, si difieren, marca el borrador como descartado y abre uno nuevo; la
      pantalla del preoperacional avisa de que el formato cambió.
      Hecho cuando: `npm run db:generate` responde que **no hay cambios** de esquema; un caso
      del guion comprueba la decisión de descartar comparando dos versiones; en el teléfono,
      un borrador empezado con el formato anterior abre uno nuevo con el aviso; los tres
      comandos en verde.

- [x] T6. Publicar los formatos nuevos en el servidor. (RF-22, RF-23)
      `npm run db:sembrar:servidor`.
      Hecho cuando: en Neon están las filas de plantillas —las cinco nuevas y las anteriores,
      ninguna marcada como eliminada—, y un acta firmada con un formato
      anterior sigue abriéndose en el panel con sus ítems retirados.
      *La demo escribe en la base real: avisar antes.*

- [ ] T7. Validación final: recorrido RF por RF de la spec + demo manual. (Todos)
      Hecho cuando: cada RF tiene su comprobación con resultado escrito; la demo del plan está
      hecha en un teléfono —volqueta con el formato nuevo, motoniveladora que queda NO APTO
      por el cinturón, acta anterior intacta en el panel y borrador viejo descartado con
      aviso—; los tres comandos en verde y la spec queda marcada como Cumplida.
      *Antes de esta tarea hay que avisar a la obra: desde que esto entra, una llanta o una
      oruga en mal estado deja la máquina fuera de servicio.*

## Notas de ejecución

- **T1**: `ITEMS_RETIRADOS` e `ITEMS_NUEVOS` en `ajustes.ts`, como datos y todavía sin usar.
  Las 82 claves se sacaron de los propios JSON contando por posición las que Diego marcó en la
  entrevista, y luego se escribieron enteras: la tabla no depende del orden del Excel.
- **T1, lo que comprueban los dos casos nuevos** (195 verificaciones, eran 193): cada clave
  retirada **existe en el formato anterior** —abriendo los cinco JSON anteriores por archivo,
  no por el índice, que en T2 pasará a apuntar a los nuevos—, no hay claves repetidas dentro de
  un tipo, y las cuatro claves nuevas no chocan con ninguna existente ni con ninguna retirada,
  y su sección existe. Se comprobó que fallaban antes de escribir las tablas.
- **T1, sorpresa menor**: la clave del tercer «Llantas» de la camioneta es
  `rodaje__llantas__mensual` —el importador desambigua con la periodicidad cuando el mismo
  texto se repite—. Si se hubiera escrito `rodaje__llantas` dos veces, el caso de claves
  repetidas lo habría cazado.
- **T1**: sin tocar base de datos ni secretos; no hubo migración ni `expo export`.
- **T2**: `aplicarAjustes` pasa de un solo ajuste a tres pasos —retirar, limpiar secciones
  vacías y recalcular periodicidades— con la versión de cada tipo en una tabla `VERSIONES`.
  Un tipo que no esté en esa tabla se queda tal como lo importó el script, sin ajustes.
  `npm run formatos` generó los cinco archivos con los conteos exactos de la spec: **52, 38,
  42, 40 y 43**. Los doce JSON conviven en la carpeta (v1, v2 y v3 donde toca).
- **T2, lo que se comprobó**: ninguna clave retirada sigue en su formato; RODAJE de la
  camioneta desapareció; las versiones vigentes son 3, 3, 2, 2 y 2 y las anteriores siguen una
  por debajo; y ningún ítem superviviente cambió de periodicidad. **FRENOS y DIRRECCIÓN de la
  volqueta desaparecieron** al quedarse sin ítems: vuelven en T3 con el ítem resumido, y el
  caso lo dice así para que no parezca un descuido.
- **T2, casos ajustados** (198 verificaciones, eran 195): el de los 86 ítems de la volqueta
  pasó a contar los cinco formatos; el del horómetro, a exigir la v3; y dos casos de
  periodicidades que contaban ítems de camioneta (35 y 58) y de retroexcavadora (52) ahora
  cuentan 30, 38 y 43. El de la camioneta se renombró: ya no suma mensuales **porque no los
  tiene**, y ahora comprueba que por mucho tiempo que pase esa periodicidad no aparece.
- **T2, pendiente para T4**: el importador vuelve a imprimir «0 inmovilizan ← revisar con SST»
  en las tres máquinas amarillas. Es correcto a estas alturas; T4 es la tarea que lo arregla.
- **T2**: sin tocar base de datos ni secretos; no hubo migración ni `expo export`.
- **T3**: los cuatro ítems del anexo B entran **antes** de descartar las secciones vacías, y
  esa es la decisión de la tarea: FRENOS y DIRRECCIÓN de la volqueta se quedan sin ninguno de
  sus ítems de taller, así que si se filtrara primero el ítem resumido no tendría dónde ir y
  habría que reinventar el título de su sección. Con este orden, las dos vuelven con su título
  del Excel y un solo ítem. Volqueta **55** (12 secciones), camioneta **39** (7).
- **T3, lo que no lleva la tarea**: los cuatro nacen con `inmoviliza: false`. Los marca T4,
  junto con los de las máquinas amarillas; hacerlo aquí habría mezclado dos tareas.
- **T3, decisiones de contenido**: `sistema` reutiliza los nombres del Excel (`MECANICO` para
  frenos y dirección, `DOCUMENTO` para los papeles, el mismo que traían SOAT y licencia) y
  cada uno lleva su instructivo escrito en lenguaje de obra: «El pedal responde sin hundirse
  hasta el fondo y la máquina frena derecho», «El timón responde sin juego muerto, sin ruidos
  y sin tirar hacia un lado», «Los tres vigentes y dentro del vehículo». `exigirFoto` queda en
  `no_conforme`, como el resto de los ítems de conformidad.
- **T3, dos casos ajustados** (199 verificaciones, eran 198): el de periodicidades **salta los
  ítems nuevos** —no existían en el formato anterior, así que compararlos contra él no tenía
  sentido— y el de la camioneta pasa de 30 a 31 diarios. Ambos fallos salieron del guion antes
  de tocar nada más, que es para lo que está.
- **T3**: sin tocar base de datos ni secretos; no hubo migración ni `expo export`.
- **T4**: `ITEMS_QUE_INMOVILIZAN` en `ajustes.ts`, con las claves de cada formato y el motivo
  por grupo. La marca **se añade a la que OCC puso con su «- AI»; nunca se le quita**: el
  ajuste hace `inmoviliza: true`, nunca `false`. Conteos generados: **15, 12, 12, 8 y 7**, los
  del anexo C. El importador **dejó de imprimir «0 inmovilizan ← revisar con SST»** en las tres
  amarillas, que era el aviso que llevaba meses saliendo sin que nadie lo resolviera.
- **T4, el caso que importa** (201 verificaciones, eran 199): una motoniveladora con el
  cinturón marcado como no conforme da **NO APTO**, con ese ítem como único inmovilizante.
  Antes de esta spec el mismo caso daba «apto con observaciones», porque ninguna de las tres
  amarillas tenía un solo ítem que pudiera parar la máquina.
- **T4, además de la cuenta**: el caso comprueba **las claves una a una** —cinturón, estructura
  de cabina, farolas y kit en las tres; palanca de bloqueo en retrocargador y retroexcavadora;
  los tres frenos de la motoniveladora; llantas y orugas; y los resumidos del anexo B—. Una
  cuenta sola cuadra por casualidad si se marca un ítem y se olvida otro.
- **T4**: sin tocar base de datos ni secretos; no hubo migración ni `expo export`.
- **T5**: la decisión es una regla pura, `borradorCaduco(versionDelBorrador, versionVigente)`
  en `shared/rules/inspeccion.ts`, con su caso (202 verificaciones). **Compara por diferencia,
  no por «la vigente es mayor»**: un equipo que se quedara con una plantilla que el catálogo ya
  no trae tampoco puede seguir, porque el formulario que se le pintaría no sería el de su
  borrador.
- **T5**: `EstadoSync` suma `descartado` y `abrirBorrador` marca así el borrador viejo —baja
  lógica, nada se borra— antes de crear el nuevo. El `Borrador` devuelto trae `formatoCambio`
  y la pantalla pinta el aviso «El formato de este equipo cambió. Este preoperacional hay que
  empezarlo de nuevo.» **arriba del todo**: sin él, el operador ve el formulario en blanco y
  cree que la app le perdió lo que llevaba escrito.
- **T5**: `npm run db:generate` responde **«No schema changes, nothing to migrate»**, que es lo
  que preveía el plan: `EstadoSync` es un tipo de TypeScript sobre una columna de texto.
- **T5, defecto encontrado el 2026-09-18 y corregido** (durante la demo de la spec 012): el
  estado `descartado` que añadió esta tarea **no estaba contemplado en `EtiquetaResultado`**,
  la insignia del historial del operador. Caía hasta el `return` final y se pintaba **«Apto»**:
  un borrador que nadie llenó, abandonado porque el formato cambió, aparecía diciendo que la
  máquina pasó la inspección. Ahora dice «Descartado». Queda como recordatorio de para qué es
  T7: la regla pura estaba en verde y la pantalla mentía.
- **T5, lo que falta comprobar a mano**: que en el teléfono el borrador viejo abra uno nuevo
  con el aviso. Va en T7, con el resto de la demo; desde aquí solo se puede comprobar la regla.
- **T6**: `npm run db:sembrar:servidor` insertó las cinco versiones nuevas. En Neon quedan
  **12 plantillas**, no diez: la tarea contaba mal porque camioneta y volqueta ya tenían dos
  versiones cada una (la v1 del Excel y la v2 sin horómetro). Ninguna quedó marcada como
  eliminada, que es lo que exigía RF-22.
- **T6, la comprobación que de verdad importa**: se consultó si alguna acta firmada se quedó
  sin su formato —un `left join` de `preoperacionales` contra `plantillas` por tipo y
  versión—. **Cero.** El único acta firmada del sistema es de `volqueta v1`, y esa plantilla
  sigue viva con sus 87 ítems mientras la vigente tiene 55. Es exactamente lo que RF-23
  necesita para reevaluar un acta que suba tarde.
- **T6**: el script de consulta era temporal y se borró. Los tipos de equipo se reescribieron
  también (7), que es lo que hace el mismo comando y no cambia nada: son los mismos siete.
- **T6, pendiente de mirar en el panel**: que el acta de `volqueta v1` se abra con sus ítems
  retirados. A nivel de datos está comprobado; verlo en pantalla va en T7.
