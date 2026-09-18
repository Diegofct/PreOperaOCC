# Spec 011 — Formatos del preoperacional más cortos y con freno

> Estado: Aprobada · Fecha: 2026-09-18 · Aprobada: 2026-09-18

## Contexto y objetivo

El preoperacional de una volqueta tiene 86 ítems y el de una camioneta 58. Llenarlos
honestamente, con guantes y antes de arrancar, lleva más tiempo del que nadie tiene a las
seis de la mañana, y OCC lo sabe: **la mayoría de operadores no los diligencia de verdad**.
Un formato que se contesta a la carrera no es un control, es papel — y además entierra los
ítems que sí importan entre decenas que el operador no puede comprobar sin desarmar la
máquina o meterse debajo.

Esta spec recorta los cinco formatos dejando lo que el operador puede juzgar mirando, y
corrige de paso un fallo que se descubrió al revisarlos: **las tres máquinas amarillas no
tienen un solo ítem que inmovilice**, así que una motoniveladora con la cabina rota o sin
frenos sale APTA. Al recortar también se resume: donde desaparece un sistema entero —los
frenos y la dirección de la volqueta, que solo se revisan en taller— entra un ítem que el
operador sí puede responder, y ese sí inmoviliza.

El resultado es un formato más corto que se llena de verdad, y que puede decir NO APTO en las
cinco máquinas.

## Usuarios / actores

- **Operador** (móvil, en obra, con guantes y normalmente sin señal) — es quien gana: llena
  menos ítems y todos los que llena son cosas que puede ver.
- **Residente / director de obra** y **Gerencia** (panel web) — reciben las actas. Verán
  menos ítems en las nuevas y **los mismos de siempre** en las ya firmadas.
- **OCC (SST)** — no usa el sistema, pero es la dueña del formato original. Esta poda se
  aparta de su Excel y hay que decírselo.

## Historias de usuario

- H1: Como operador quiero un preoperacional que pueda contestar de verdad en obra, para que
  lo que firmo sea cierto.
- H2: Como operador quiero que no me pregunten por piezas que no puedo ver sin desarmar la
  máquina, para no tener que inventar una respuesta.
- H3: Como gerencia quiero que una máquina amarilla insegura pueda quedar NO APTO, para que
  el preoperacional sirva de freno y no solo de registro.
- H4: Como gerencia quiero que las actas ya firmadas se sigan viendo enteras, para que la
  evidencia de lo que se revisó ayer no cambie porque hoy cambiamos el formato.

## Requisitos funcionales (criterios de aceptación en EARS)

### Formatos más cortos (H1, H2)

- RF-1: EL SISTEMA presentará el formato de volqueta con 55 ítems, retirando los 34 del
  anexo A y añadiendo los 3 del anexo B.
- RF-2: EL SISTEMA presentará el formato de camioneta con 39 ítems, retirando los 20 del
  anexo A y añadiendo el del anexo B.
- RF-3: EL SISTEMA presentará el formato de motoniveladora con 42 ítems, retirando los 11
  del anexo A.
- RF-4: EL SISTEMA presentará el formato de retrocargador con 40 ítems, retirando los 8 del
  anexo A.
- RF-5: EL SISTEMA presentará el formato de retroexcavadora con 43 ítems, retirando los 9
  del anexo A.
- RF-6: EL SISTEMA no volverá a ofrecer, en un formato nuevo, ninguno de los ítems retirados.
- RF-7: EL SISTEMA conservará la periodicidad de cada ítem que se queda, tal como la tiene
  hoy.
- RF-8: EL SISTEMA dejará el formato de camioneta sin ítems de periodicidad mensual, porque
  los seis que tenía se retiran.

### Lo que reemplaza a un sistema entero (H1, H3)

- RF-9: EL SISTEMA preguntará en el formato de volqueta si los frenos responden bien, en un
  solo ítem diario, y esa falla inmovilizará el vehículo.
- RF-10: EL SISTEMA preguntará en los formatos de volqueta y de camioneta si la dirección
  está sin juego ni ruidos, en un solo ítem diario, y esa falla inmovilizará el vehículo.
- RF-11: EL SISTEMA preguntará en el formato de volqueta si los documentos están al día
  —SOAT, técnicomecánica y tarjeta de propiedad en un solo ítem—, y esa falla inmovilizará
  el vehículo.
- RF-12: EL SISTEMA tratará como inmovilizante, en el formato de camioneta, el ítem diario de
  ventilador, correas y bomba de agua.

### Una máquina amarilla puede quedar NO APTO (H3)

- RF-13: EL SISTEMA tratará como inmovilizantes, en los tres formatos de maquinaria amarilla,
  el cinturón de seguridad, la alarma de retroceso y bocina, las farolas delanteras, la
  estructura de la cabina y el kit de seguridad.
- RF-14: EL SISTEMA tratará como inmovilizante la palanca de bloqueo de seguridad en los
  formatos de retrocargador y de retroexcavadora.
- RF-15: EL SISTEMA tratará como inmovilizantes, en el formato de motoniveladora, el freno de
  servicio, el freno de estacionamiento, la parada de emergencia y las pastillas y rotor del
  freno.
- RF-16: EL SISTEMA tratará como inmovilizantes las llantas de los tres ejes de la
  motoniveladora, las de los dos ejes del retrocargador y las orugas de la retroexcavadora.
- RF-17: CUANDO un operador marque como no conforme cualquiera de los ítems de RF-13 a RF-16,
  EL SISTEMA declarará la máquina NO APTO.

### Kilometraje, y solo kilometraje (H1)

- RF-18: EL SISTEMA pedirá a las volquetas y a las camionetas únicamente la lectura de
  kilómetros, y no les pedirá horas de motor.
- RF-19: EL SISTEMA seguirá pidiendo únicamente horas de motor a la motoniveladora, al
  retrocargador y a la retroexcavadora.

### La evidencia ya firmada no se toca (H4)

- RF-20: EL SISTEMA mostrará cada preoperacional ya firmado con los ítems que tenía el
  formato con el que se firmó, incluidos los que esta spec retira.
- RF-21: EL SISTEMA no modificará el resultado —APTO, con observaciones o NO APTO— de ningún
  preoperacional ya registrado.
- RF-22: EL SISTEMA conservará los formatos anteriores para poder leer y verificar las actas
  firmadas con ellos.
- RF-23: CUANDO un preoperacional firmado con un formato anterior llegue al servidor después
  de este cambio, EL SISTEMA lo evaluará con el formato con el que se firmó, y no con el
  nuevo.

### Un borrador empezado con el formato anterior (H4)

- RF-27: SI se retoma un preoperacional a medio llenar que se empezó con un formato anterior
  al vigente en ese equipo, ENTONCES EL SISTEMA avisará al operador de que el formato cambió
  y abrirá uno nuevo con el formato vigente.
- RF-28: CUANDO se descarte así un borrador, EL SISTEMA no conservará las respuestas
  tecleadas en él, y no afectará a ningún preoperacional ya firmado.

### Reglas transversales

- RF-24: EL SISTEMA identificará cada formato nuevo como una versión distinta de la anterior.
- RF-25: EL SISTEMA no reutilizará la identidad de un ítem retirado para un ítem nuevo.
- RF-26: EL SISTEMA no cambiará nada de lo que ve ni de lo que hace la administración en el
  panel, salvo que las actas nuevas traen menos ítems.

## Superficies afectadas

- [x] **Móvil** — el formulario del preoperacional de los cinco tipos: menos ítems, tres
  ítems nuevos y más fallas que inmovilizan.
- [ ] **Panel web** — sin cambios. Muestra cada acta con lo que traiga.
- [ ] **API** — sin cambios de contrato.
- [ ] **Sincronización** — sin impacto: no hay entidades nuevas ni cambia el orden de la cola.
- [x] **Datos** — los formatos nuevos se siembran junto a los anteriores, en el servidor y en
  el dispositivo. Ninguna tabla cambia de forma.
- [x] **Reglas** — cambian las cuentas de ítems y de inmovilizantes que hoy verifica el guion;
  la decisión de APTO / NO APTO no cambia de lógica.

## Requisitos no funcionales

- El formato más largo (volqueta) baja de 86 a 55 ítems: **un tercio menos** de preguntas.
- Ningún ítem que se queda exige desarmar, levantar ni meterse debajo de la máquina para
  responderlo.
- Los tres ítems nuevos se redactan en el lenguaje de la obra, no en el del taller.
- Se mantienen las reglas de campo de la app: mínimo 56 dp de área táctil, nunca por debajo
  de 15 sp, y el color nunca como única señal.

## Casos límite

- **Sin señal**: el formato viaja dentro de la app, así que el operador ve la versión nueva
  en cuanto actualiza la aplicación, sin depender de la red. Un equipo que lleve semanas sin
  sincronizar sigue usando el formato que tenga, y lo que firme se evalúa contra ese.
- **Evidencia firmada**: no se toca ninguna acta. Un acta de la semana pasada sigue mostrando
  sus 86 ítems (RF-20 a RF-22).
- **Primer arranque / equipo recién activado**: baja los formatos vigentes y ve directamente
  los nuevos.
- Un **borrador a medio llenar** cuando entra el formato nuevo: se descarta y se empieza de
  nuevo con el formato vigente, avisando (RF-27, RF-28). Se pierde lo tecleado, que es
  preferible a un acta que mezcla dos formatos.
- Un ítem retirado que **estaba marcado como no conforme** en un acta ya firmada: se sigue
  viendo, con su foto y su comentario.
- Una máquina amarilla con una **llanta en mal estado**: desde ahora queda NO APTO y no puede
  trabajar hasta que alguien la habilite. Es el efecto buscado, y va a parar máquinas que
  antes salían igual.
- Un preoperacional **firmado con el formato viejo y subido después** del cambio (RF-23).

## Fuera de alcance

- Cambiar el texto de los ítems que se quedan: se retiran o se conservan tal como están.
- Cambiar las periodicidades de los ítems que se quedan (RF-7).
- Añadir ítems nuevos que no sean los cuatro del anexo B.
- Los formatos de vibrocompactadora y recicladora: siguen sin formato propio.
- Rehacer el Excel de OCC ni devolverle los formatos podados en su formato.
- La pantalla del formulario: esta spec cambia qué se pregunta, no cómo se ve.
- Reevaluar ni migrar los preoperacionales ya registrados.
- Decidir qué pasa con una máquina que queda NO APTO: eso ya existe y no cambia.

## Criterios de finalización

- Cada RF con su comprobación: los conteos de ítems y de inmovilizantes (RF-1 a RF-5, RF-9 a
  RF-16, RF-18, RF-19) como casos en el guion de verificación; el resto, como paso de demo.
- `npm run verificar`, `npm run typecheck` y `npm run lint` en verde.
- Demo manual: en un teléfono, firmar un preoperacional de volqueta y otro de máquina
  amarilla con el formato nuevo; marcar como no conforme uno de los ítems que ahora
  inmovilizan y ver que la máquina queda NO APTO; verlos llegar completos al panel; y abrir
  en el panel un acta **anterior** al cambio para comprobar que sigue mostrando sus ítems
  retirados.

## Dudas abiertas

- [NECESITA ACLARACIÓN: quién le comunica a OCC que el formato de la app ya no coincide con
  su Excel, y en qué momento. La 003 ya lo dejó anotado por el horómetro; esta poda lo
  agranda.]
Resueltas el 2026-09-18:

- **Borrador con formato anterior**: se descarta y se empieza de nuevo, con aviso (RF-27,
  RF-28). Se descartó terminarlo con el formato viejo —dos operadores llenarían formatos
  distintos el mismo día— y conservar lo que coincide —el acta mezclaría dos formatos y sería
  imposible de verificar—.

- **La poda de la volqueta la marcó OCC** (a través de Diego). La de la camioneta y la de las
  tres máquinas amarillas, y todos los ítems inmovilizantes de las amarillas, **los propuso
  este proyecto** y Diego los aprobó, porque OCC todavía no ha enviado su lista. Se
  implementan ya; si OCC los corrige, entra como cambio a esta spec.

---

## Anexo A — Ítems que se retiran *(2026-09-18)*

### Volqueta (34)

| Sección | Ítems |
| --- | --- |
| Tablero de control | Conexiones eléctricas · Torpedo |
| Cabina | Asientos · Vidrios de ventanas |
| Motor | Depósito de refrigerante · Correas, patín tensor y bomba de agua · Tanque combustible · Estructura motor |
| Frenos | **La sección entera**: válvulas relay y mangueras · cámaras de seguridad · bandas y campanas · rachets · mangueras, tubos, conexiones y racores |
| Transmisión de cambios | Líquido del embrague · Estructura transmisión |
| Diferenciales | Estructura diferenciales · Valvulina · Kit central |
| Suspensión | Corbatines |
| Dirección | **La sección entera**: botella · bomba hidráulica · aceite hidráulico · mangueras · biela · brazo pitman · barra y terminales · crucetas |
| Volteo | Cámara apertura compuerta · Aceite hidráulico · Bomba hidráulica · Chasis |
| Ruedas | Tapa válvulas |
| Adicionales | SOAT y TCM · Licencia de propiedad |

### Camioneta (20)

| Sección | Ítems |
| --- | --- |
| Cabina | Vidrios de ventanas · Asientos |
| Capot o careta | Botella · Cruceta · Mangueras y acoples · Correas del motor · Patín tensor · Bomba de agua |
| Chasis | Diferenciales · Transmisión de velocidades · Terminales de la dirección · Barras de dirección o cremallera · Valvulinas · Kit central · Embrague |
| Ruedas | Tapa válvulas |
| Carrocería | Tanque de combustible |
| Rodaje | **La sección entera**: llantas (quincenal) · llanta de repuesto (quincenal) · llantas (mensual) — repetían lo que ya preguntan Ruedas y Adicionales |

### Motoniveladora (11)

Asiento(s) · Mangueras, tubos y acoples · Aceite del mando del círculo o tornamesa · Aceite
de la transmisión · Puntos de remolque e izaje · Aceite del diferencial · Depósito
refrigerante · Tanque de combustible · Bomba de inyección · Estructura motor · Tapa válvulas

### Retrocargador (8)

Asiento · Mangueras, tubos, acoples y racores · Tanque de combustible · Puntos de remolque e
izaje · Depósito refrigerante · Bomba de inyección · Estructura motor · Tapa válvulas

### Retroexcavadora (9)

Asiento · Mangueras, tubos, acoples y racores · Aceite del mando del círculo o tornamesa ·
Tanque de combustible · Puntos de remolque e izaje · Bomba de llenado de combustible ·
Depósito refrigerante · Bomba de inyección · Estructura motor

---

## Anexo B — Ítems nuevos *(2026-09-18)*

| Formato | Ítem | Sección | Periodicidad | ¿Inmoviliza? |
| --- | --- | --- | --- | --- |
| Volqueta | Los frenos responden bien | Frenos | Diaria | Sí |
| Volqueta | Dirección sin juego ni ruidos | Dirección | Diaria | Sí |
| Volqueta | Documentos al día (SOAT, técnicomecánica y tarjeta de propiedad) | Adicionales | Diaria | Sí |
| Camioneta | Dirección sin juego ni ruidos | Chasis | Diaria | Sí |

---

## Anexo C — Ítems que inmovilizan, después del cambio *(2026-09-18)*

| Formato | Antes | Después | Los que entran |
| --- | --- | --- | --- |
| Volqueta | 16 | 15 | Los tres del anexo B; salen cámara apertura compuerta, bomba hidráulica, SOAT y TCM, licencia de propiedad |
| Camioneta | 14 | 12 | Ventilador, correas y bomba de agua (hereda la marca de «correas del motor») y dirección sin juego ni ruidos |
| Motoniveladora | **0** | 12 | Cinturón · alarma de retroceso y bocina · farolas delanteras · estructura cabina · kit de seguridad · freno de servicio · freno de estacionamiento · parada de emergencia · pastillas y rotor del freno · llantas de los ejes 1, 2 y 3 |
| Retrocargador | **0** | 8 | Cinturón · alarma de retroceso y bocina · farolas delanteras · estructura cabina · kit de seguridad · palanca de bloqueo de seguridad · llantas de los ejes 1 y 2 |
| Retroexcavadora | **0** | 7 | Cinturón · alarma de retroceso y bocina · farolas delanteras · estructura cabina · kit de seguridad · palanca de bloqueo de seguridad · orugas |
