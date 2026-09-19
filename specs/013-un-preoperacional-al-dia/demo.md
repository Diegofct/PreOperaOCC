# Demo de la spec 013 — guion para correr en un teléfono

> Cierra las cuatro tareas que quedaron sin marcar (T5, T6, T8, T9) y es la parte de
> campo de T10. Lo que no se puede ver aquí está en la última sección, dicho por su
> nombre: no se da por bueno lo que no se ejecutó.

Tiempo: unos 20 minutos, casi todos de llenar formularios.

## Antes de empezar

- [ ] **Un dev build** con el código de esta rama instalado en un teléfono
      (`npx expo run:android`, o el que ya tenga si es de esta rama).
- [ ] **Un operador con DOS máquinas asignadas** desde el panel. Sin dos, los pasos 5,
      9 y 12 no se pueden hacer. Llamémoslas **A** y **B** de aquí en adelante.
- [ ] **B tiene que poder quedar NO APTO**: que su formato tenga algún ítem que
      inmovilice. Cualquiera de las tres amarillas sirve (el cinturón), y la volqueta
      también (los frenos).
- [ ] **Sincronizar con señal ANTES de empezar**: abrir la app con datos, deslizar
      hacia abajo y esperar a que baje todo. Las asignaciones tienen que estar en el
      teléfono antes del paso 1.
- [ ] **Activar el modo avión** y dejarlo activado hasta el paso 13. Es la única forma
      de comprobar RF-18: que nada de esto consulta al servidor.

> **Si el teléfono es de estreno**, el paso 2 no se puede hacer y hay que marcarlo como
> «no aplica». No es un fallo: hace falta un equipo que ya traiga registros vacíos de
> antes para ver que dejan de mostrarse.

## La demo

### Punto de partida

- [ ] **1.** Abrir la app y entrar con el PIN. En el inicio se ve la tarjeta de **A**,
      el botón **«Hacer preoperacional»** y, si hay dos asignadas, **«Cambiar de
      vehículo»**.

- [ ] **2.** Mirar «Últimos registros». **Los «Sin terminar» viejos ya no están.**
      → *Cierra T6 (RF-17).* Si el teléfono es nuevo y nunca tuvo ninguno, marcar
      «no aplica» y seguir.

### Una máquina revisada deja de pedirlo

- [ ] **3.** Pulsar «Hacer preoperacional» sobre **A**, llenarlo entero y firmarlo.
      Dejarlo **APTO** (sin hallazgos).

- [ ] **4.** Volver al inicio. La tarjeta de **A** dice **«Ya le hizo el preoperacional
      hoy, a las HH:MM. Quedó Apto.»**, con la hora correcta, y **el botón «Hacer
      preoperacional» no está**.
      → *Cierra T8 (RF-8, RF-9, RF-10).*

- [ ] **5.** Pulsar «Cambiar de vehículo». **A** aparece con fondo verde, el texto
      «Ya revisada hoy, a las HH:MM», **sin flecha**, y **al tocarla no pasa nada**.
      **B** sí tiene flecha y sí responde.
      → *Cierra T9 (RF-8, RF-11).*

### Abrir el formulario no registra nada

- [ ] **6.** Desde esa lista, entrar al formulario de **B** y salir **sin tocar
      absolutamente nada** (botón atrás).

- [ ] **7.** Mirar «Últimos registros» en el inicio. **No apareció ningún «Sin terminar»
      nuevo.** Solo está el de **A**, del paso 3.
      → *Cierra T5, primera mitad (RF-13, RF-15, RF-17).*
      > Este es **el paso que más importa** de toda la demo: es el defecto que originó
      > la spec. Si aquí aparece un «Sin terminar», la tarea no está hecha.

- [ ] **8.** Volver a entrar a **B**, responder **un solo ítem**, y salir.
      - Ahora en el historial **sí** aparece **B** como «Sin terminar».
      - Volver a entrar a **B**: **el ítem que respondió sigue respondido**.
      → *Cierra T5, segunda mitad (RF-14, RF-16).*

### Un NO APTO no cierra el día

- [ ] **9.** Terminar el preoperacional de **B** dejándolo **NO APTO**: marcar como no
      conforme un ítem que inmovilice (el cinturón, los frenos). Firmarlo.

- [ ] **10.** Volver al inicio y entrar a «Cambiar de vehículo». **B vuelve a ofrecer su
      preoperacional** —tiene flecha y responde—, aunque ya se firmó uno hoy.
      → *RF-2.* Es la máquina que se reparó y se vuelve a revisar.

- [ ] **11.** Levantar **otro** preoperacional de **B**. Esta vez marcar un hallazgo en
      un ítem que **no** inmovilice, para que quede **«apto con observaciones»**.
      Firmarlo. Volver al inicio: **B ya no lo ofrece**.
      → *RF-3: «con novedades» bloquea igual que APTO. Solo el NO APTO abre la puerta.*

### El día siguiente

- [ ] **12.** Sin cerrar la app: en los ajustes del teléfono, **adelantar la fecha un
      día**. Volver a la app y **deslizar hacia abajo** en el inicio.
      **A y B vuelven a ofrecer su preoperacional**, sin tocar nada más.
      → *RF-12.*
      > **No** dejar el teléfono encendido esperando a que den las doce: el aviso se
      > recalcula al enfocar la pantalla o al deslizar, no con un temporizador. Es una
      > limitación conocida y está en los Riesgos del plan.
      >
      > **Devolver la fecha del teléfono al terminar.**

### Lo que tiene que seguir igual

- [ ] **13.** Quitar el modo avión, deslizar para que suba todo, y abrir el panel en
      `/panel/preoperacionales`.
      - Los preoperacionales de **A** y **B** llegaron completos, con su firma.
      - **B tiene tres del mismo día**: el NO APTO y el de novedades que se firmaron, y
        ninguno más. *(El borrador del paso 8 se convirtió en uno de ellos.)*
      - **Ningún acta cambió** y **no hay ninguna acción nueva** en el panel: anular con
        motivo sigue siendo la única forma de corregir.
      → *RF-19, RF-20.*

## Qué RF cubre cada paso

| RF | Dónde se ve |
| --- | --- |
| RF-1 | Pasos 4 y 5: A ya no lo ofrece |
| RF-2 | Paso 10 |
| RF-3 | Paso 11 |
| RF-6 | Paso 10 (y sin tope, en las pruebas) |
| RF-7 | Paso 12 |
| RF-8 | Pasos 4 y 5 |
| RF-9, RF-10 | Paso 4 |
| RF-11 | Paso 5: B sigue respondiendo |
| RF-12 | Paso 12 |
| RF-13, RF-15 | Pasos 6 y 7 |
| RF-14, RF-16 | Paso 8 |
| RF-17 | Pasos 2, 7 y 8 |
| RF-18 | Todo, con el avión puesto |
| RF-19, RF-20 | Paso 13 |

## Lo que esta demo NO puede comprobar

Dicho aquí y no escondido:

- **RF-4 y RF-5** —que la cuenta sea por operador **y** máquina, y que otro operador sí
  pueda revisar hoy la misma máquina— **necesitarían dos teléfonos con dos operadores**.
  Están cubiertos por los casos automáticos de T1, que es justo para lo que la regla
  filtra por los dos campos por dentro. Si algún día hay dos equipos a mano, el paso es:
  el operador 2 entra a **A** después del paso 3 y **sí** puede levantar el suyo.
- **RF-21** —que las periodicidades no se adelanten ni se atrasen— se comprueba en las
  pruebas, no aquí: haría falta una camioneta con la quincenal vencida y esperar quince
  días. *(Ojo: de los formatos vigentes, solo la camioneta conserva la quincenal.)*
- **El caso del borrador de ayer más un firmado de hoy** (gana «ya hecho», y el borrador
  no se toca): se puede forzar moviendo la fecha del teléfono hacia atrás, pero no entra
  en el guion porque ensucia el resto de los pasos.

## Si algo falla

- **Aparece un «Sin terminar» en el paso 7** → T5 no está bien. Es el defecto original
  de la spec, sin arreglar.
- **La tarjeta del paso 4 sigue mostrando el botón** → T8. Mirar si `estadoDelDiaDe`
  devolvió algo: lo más probable es que el preoperacional del paso 3 no llegara a
  quedar firmado (`enviadoEn` nulo).
- **La tarjeta de A del paso 5 se deja pulsar** → T9.
- **B no vuelve a ofrecerlo en el paso 10** → la regla está mirando «hubo algún NO APTO»
  en vez de «el último quedó NO APTO», o el resultado que se guardó no fue `no_apto`.
- **En el paso 12 no vuelven a aparecer** → el día no se está partiendo con
  `fechaDeJornada`, o el teléfono no aplicó el cambio de fecha.

Anotar el resultado real de cada paso —incluido lo que falle— en las notas de ejecución
de `tareas.md`, y marcar allí T5, T6, T8 y T9 solo si sus pasos pasaron.
