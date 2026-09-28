# Spec 020 — Formatos prestados para los tipos sin formato

> Estado: Aprobada · Fecha: 2026-09-28

## Contexto y objetivo

Ocho tipos de equipo se pueden registrar y asignar, pero no inspeccionar, porque OCC no ha
entregado su formato de preoperacional: la Vibro Compactadora y la Recicladora (spec 003) y
los seis de la spec 019. Mientras tanto, esas máquinas trabajan sin preoperacional.

OCC indicó que los formatos que ya existen sirven para ellas: los de maquinaria amarilla para
la maquinaria amarilla nueva, y el de la camioneta para los camiones. El objetivo es que
**ningún tipo quede sin formato**: cada uno se revisa con el formato de OCC más parecido,
dejando escrito en el acta que el formato es prestado, hasta que OCC entregue uno propio.

## Usuarios / actores

- **Operador** (móvil): levanta el preoperacional de estas máquinas con el formato prestado,
  igual que con cualquier otra.
- **Residente / director de obra** (panel, `supervisor`): ve esas actas y el cumplimiento del
  día con estas máquinas incluidas.
- **Gerencia** (panel, `admin`): ve en Vehículos con qué formato se revisa cada equipo.

## Historias de usuario

- H1: Como operador de un camión, carrotanque, excavadora o montacargas quiero hacerle el
  preoperacional antes de arrancar, para no operarlo sin revisión.
- H2: Como residente quiero que el acta diga qué máquina es y con qué formato se revisó, para
  que se sostenga aunque el formato no sea el de su tipo.
- H3: Como gerencia quiero ver en la flota con qué formato se revisa cada equipo, para saber
  qué formatos le faltan a OCC.

## Requisitos funcionales (criterios de aceptación en EARS)

### Qué formato usa cada tipo (H1)

- RF-1: EL SISTEMA revisará los equipos de tipo Excavadora de oruga con el formato de
  preoperacional de la Retroexcavadora.
- RF-2: EL SISTEMA revisará los equipos de tipo Excavadora con el formato de preoperacional
  del Retrocargador.
- RF-3: EL SISTEMA revisará los equipos de tipo Montacargas con el formato de preoperacional
  de la Motoniveladora.
- RF-4: EL SISTEMA revisará los equipos de tipo Vibro Compactadora con el formato de
  preoperacional de la Motoniveladora.
- RF-5: EL SISTEMA revisará los equipos de tipo Recicladora con el formato de preoperacional
  de la Motoniveladora.
- RF-6: EL SISTEMA revisará los equipos de tipo Camión con el formato de preoperacional de la
  Camioneta.
- RF-7: EL SISTEMA revisará los equipos de tipo Carrotanque con el formato de preoperacional
  de la Camioneta.
- RF-8: EL SISTEMA revisará los equipos de tipo Carro taller con el formato de preoperacional
  de la Camioneta.
- RF-9: EL SISTEMA pedirá en el preoperacional de estos equipos el medidor de su propio tipo
  (spec 019, RF-8 y RF-9), aunque el formato prestado sea de un tipo con otro medidor.

### El preoperacional con formato prestado (H1, H2)

- RF-10: CUANDO un operador abra el preoperacional de uno de estos equipos, EL SISTEMA le
  presentará el formato prestado completo, con sus mismos ítems, periodicidades e ítems que
  inmovilizan.
- RF-11: EL SISTEMA decidirá APTO o NO APTO en un preoperacional con formato prestado con las
  mismas reglas que en el formato de origen.
- RF-12: EL SISTEMA titulará el formulario del preoperacional en el celular con el texto
  «Preoperacional <tipo del equipo> (formato <tipo de origen>)», por ejemplo
  «Preoperacional Camión (formato Camioneta)», en el lugar donde hoy muestra el nombre del
  formato.
- RF-13: EL SISTEMA mostrará el título de RF-12 en el detalle del preoperacional del panel.
- RF-13b: EL SISTEMA mostrará en el detalle del preoperacional del panel la versión del
  formato con que se firmó.
- RF-14: EL SISTEMA conservará en cada preoperacional firmado con formato prestado cuál
  formato y qué versión se usaron.
- RF-15: CUANDO el servidor reciba un preoperacional con formato prestado, EL SISTEMA lo
  reevaluará contra el formato y la versión con que se firmó.

### Cambios de formato (H2)

- RF-16: CUANDO OCC publique una versión nueva de un formato de origen, EL SISTEMA la usará
  para los preoperacionales nuevos de todos los tipos que lo toman prestado.
- RF-17: EL SISTEMA conservará sin cambios los preoperacionales ya firmados con una versión
  anterior del formato prestado.

### Lo que ve la administración (H3)

- RF-18: MIENTRAS un tipo use un formato prestado, EL SISTEMA mostrará en el listado de
  Vehículos una etiqueta con el formato de origen (por ejemplo, «Formato Camioneta») en lugar
  de «Sin formato».
- RF-19: CUANDO la gerencia elija un tipo con formato prestado en el formulario de Vehículos,
  EL SISTEMA le indicará con qué formato de origen se revisará.
- RF-20: EL SISTEMA contará los equipos con formato prestado en el cumplimiento del día y en
  las máquinas sin preoperacional del inicio, como a cualquier equipo con formato.

### Reglas transversales

- RF-25: EL SISTEMA mantendrá vigentes las reglas de «sin formato» de la spec 019 (RF-11 a
  RF-14 y RF-21 a RF-23) para cualquier tipo que en el futuro se registre sin formato propio
  ni prestado.
- RF-21: CUANDO un celular ya instalado sincronice, EL SISTEMA le entregará los formatos
  prestados sin necesidad de reinstalar la aplicación.
- RF-22: MIENTRAS un celular no haya sincronizado desde la llegada de los formatos
  prestados, EL SISTEMA le seguirá explicando que el equipo no tiene formato (spec 019,
  RF-14).
- RF-23: EL SISTEMA conservará sin cambios los formatos de los tipos que ya tenían uno propio
  y los preoperacionales firmados con ellos.
- RF-24: EL SISTEMA definirá en un solo sitio qué formato presta a cada tipo, para el celular
  y el servidor.

## Superficies afectadas

- [x] **Móvil** — el preoperacional de estos tipos se abre con el formato prestado y el
  título de RF-12; deja de salir «este equipo aún no tiene formato» tras sincronizar.
- [x] **Panel web** — etiqueta y aviso del formato de origen en Vehículos; título en el
  detalle de preoperacionales; el inicio los cuenta en el cumplimiento.
- [x] **API** — la ingesta del preoperacional reevalúa contra el formato prestado.
- [x] **Sincronización** — los formatos prestados bajan al celular con el pull.
- [x] **Datos** — el catálogo de formatos y de tipos cambia en las dos bases; la base de
  producción necesita recibir el catálogo actualizado.
- [x] **Reglas** — qué formato corresponde a cada tipo; casos nuevos en el guion de
  verificación.

## Requisitos no funcionales

- Ningún identificador de ítem existente se renombra ni se reutiliza: los formatos prestados
  son los mismos de OCC, no copias editadas.
- Los textos visibles en español, tal como se dicen en obra.

## Casos límite

- **Sin señal**: un celular que no ha sincronizado sigue viendo «este equipo aún no tiene
  formato» (RF-22). Tras sincronizar, el formato queda en el teléfono y el preoperacional se
  hace sin señal como cualquier otro.
- **Evidencia firmada**: no existe ningún preoperacional de estos tipos (hasta hoy no se
  podían levantar). Los de los tipos con formato propio no cambian (RF-23).
- **Primer arranque / equipo recién activado**: el celular recibe los formatos prestados en
  su primera sincronización, junto con los propios.
- **Ítems que la máquina no tiene** (llantas del eje 3 de la motoniveladora en un
  montacargas, la cuchilla, el volteo…): el operador los marca «No aplica», que no deja la
  máquina NO APTA. Aplica también a los ítems que inmovilizan.
- **Una Vibro Compactadora de rodillo** con el formato de la motoniveladora: sus ítems de
  llantas se marcan «No aplica».
- **Un preoperacional a medio llenar** cuando llega una versión nueva del formato de origen:
  igual que con cualquier formato (spec 011, RF-27 y RF-28), el celular avisa que el formato
  cambió y abre uno nuevo con la versión vigente. Ahora afecta también a los tipos que lo
  toman prestado.
- **El cumplimiento del inicio sube de denominador** el día del despliegue: los equipos de
  estos tipos empiezan a contar como pendientes (RF-20).

## Fuera de alcance

- Formatos propios para cualquiera de estos ocho tipos. Cuando OCC entregue uno, reemplaza al
  prestado para los preoperacionales nuevos, y los firmados con el prestado se quedan como
  están; eso irá en su propia spec.
- Un formato combinado de «maquinaria amarilla» o ítems propios del montacargas (mástil,
  horquillas).
- Editar, quitar o añadir ítems a un formato prestado para un tipo concreto.
- Cambiar qué formato presta a cada tipo desde el panel: la correspondencia es fija.
- Cerrar la spec 019: su prueba en el teléfono se hace aparte.
- Mostrar el título de RF-12 en los listados («Últimos registros» del celular, tabla de
  preoperacionales del panel): siguen mostrando el tipo del equipo.
- Imprimir o exportar actas de preoperacional: hoy no existe.

## Criterios de finalización

- RF-1 a RF-9, RF-11, RF-16, RF-17, RF-20 y RF-24 como casos en el guion de verificación.
- `npm run verificar`, `npm run typecheck` y `npm run lint` en verde.
- Demo manual en el panel: el listado de Vehículos muestra «Formato Camioneta» para un
  camión y «Formato Motoniveladora» para un montacargas; el formulario lo indica al elegir el
  tipo; el inicio cuenta el camión como pendiente.
- Demo en el teléfono, con el APK ya instalado y sin reinstalar: sincronizar, abrir el
  preoperacional del camión de prueba, ver el título «Preoperacional Camión (formato
  Camioneta)», marcar un ítem «No aplica», firmar, y ver el acta con ese título en el panel.
- El catálogo actualizado queda cargado en producción.

## Dudas abiertas

Resueltas el 2026-09-28 con Diego:

- **Correspondencia**: la más parecida para cada tipo (RF-1 a RF-8).
- **Título del acta**: su tipo y el formato de origen (RF-12, RF-13).
- **Versiones nuevas del formato de origen**: los prestados las siguen (RF-16).
- **Formato propio futuro**: reemplaza al prestado desde ese día, en su propia spec.
- **Celulares instalados**: sin reinstalar (RF-21).
- **Panel**: etiqueta con el formato de origen (RF-18, RF-19).

Resueltas en la clarificación, 2026-09-28:

- **Borrador y versión nueva**: se mantiene la spec 011; se corrigió el caso límite.
- **Dónde va el título**: encabezado del formulario en el celular y detalle en el panel, con
  la versión (RF-12, RF-13, RF-13b); los listados quedan fuera.
- **Reglas de «sin formato» de la 019**: siguen vigentes para tipos futuros (RF-25).
- **Spec 003**: la condición de esperar la hoja de OCC para la vibrocompactadora y la
  recicladora queda reemplazada por RF-4 y RF-5.

Siguen abiertas:

- [NECESITA ACLARACIÓN: ¿OCC dio por buena la correspondencia de RF-1 a RF-8 tal como está,
  o solo dijo en general que «los de maquinaria amarilla sirven»? En particular, el
  montacargas con el formato de la motoniveladora.]
