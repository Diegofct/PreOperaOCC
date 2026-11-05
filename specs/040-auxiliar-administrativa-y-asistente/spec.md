# Spec 040 — Auxiliar Administrativa, asistente ampliado y archivos

> Estado: **Cumplida en desarrollo** (2026-11-05; ver `validacion.md`) · Aprobada el 2026-11-05 · Fecha: 2026-11-04 · Dudas D1–D9 resueltas con la propuesta · Va a producción dentro de la T23 de la 033, con la migración 0039 (escrita a mano) detrás de la 0038.

## Contexto y objetivo

Elemental es la parte administrativa del grupo: recibe las solicitudes de compra y de pago de OCC, Geolab y las obras, lleva Recursos Humanos, los cortes financieros y los documentos. Hoy esas aprobaciones solo las puede dar la gerencia, y las auxiliares de Elemental (rol «Auxiliar de Recursos Humanos») solo consultan Compras, Tesorería y finanzas: el trabajo administrativo se represa en la gerencia. Además, el asistente no consulta nada de lo administrativo (compras, pagos, cortes, fichas) ni las bitácoras de Geolab, responde solo en el chat y no entrega archivos para trabajar o enviar. Esta spec le da a la auxiliar el trabajo administrativo completo de Elemental, amplía lo que el asistente sabe responder según el cargo de cada quien, le permite entregar archivos (PDF, Excel, Word) y hace el asistente más fácil de usar para quien entra por primera vez.

## Usuarios / actores

- **Gerencia** (rol `admin`): sigue pudiendo todo. Con el asistente consulta todo el grupo: obras, OCC, Geolab, Elemental y lo administrativo.
- **Auxiliar Administrativa** (hoy «Auxiliar de Recursos Humanos»): entra solo a Elemental. Aprueba, registra, consulta y anula lo administrativo de Elemental, incluidas las solicitudes de compra y de pago que llegan de las otras empresas y de las obras. Usa el asistente.
- **Residente / director**, **Almacenista**, **Encargado de Planta**, **Laboratorista**, **Encargado de OCC**: usan el asistente solo para lo de su cargo, y piden archivos de eso.
- **Operador**: no cambia; no entra al panel.

## Historias de usuario

- H1: Como gerencia quiero que la Auxiliar Administrativa apruebe y registre lo administrativo de Elemental para no ser el cuello de botella de cada compra y cada pago.
- H2: Como Auxiliar Administrativa quiero registrar, consultar, aprobar y anular lo de Elemental desde Elemental, sin entrar a otras empresas.
- H3: Como gerencia quiero preguntarle al asistente por compras, pagos, cortes, Recursos Humanos y las bitácoras de cualquier empresa u obra, para no recorrer cada módulo.
- H4: Como cualquier usuario del asistente quiero que solo me responda sobre lo que hago en mi cargo, con las mismas reglas de lo que veo en el panel.
- H5: Como usuario del asistente quiero pedirle un PDF, un Excel o un Word con lo que consulté, para enviarlo o seguir trabajándolo.
- H6: Como usuario nuevo quiero entender qué puedo preguntarle al asistente y cómo, sin que nadie me lo explique.

## Requisitos funcionales (criterios de aceptación en EARS)

### Auxiliar Administrativa (H1, H2)

- RF-1: EL SISTEMA llama «Auxiliar Administrativa» al acceso que hoy se llama «Auxiliar de Recursos Humanos», en todas las pantallas, listas, selectores, mensajes y exportaciones.
- RF-2: EL SISTEMA conserva a las personas que ya tienen ese acceso con el nombre nuevo, sin pedirles nada y sin cambiar su contraseña ni su sesión.
- RF-3: EL SISTEMA deja entrar a la Auxiliar Administrativa solo a Elemental, como hoy.
- RF-4: EL SISTEMA deja a la Auxiliar Administrativa aprobar (de cualquier valor, D2), rechazar y devolver las solicitudes de compra que llegan de OCC, Geolab y las obras, con las mismas reglas y motivos que la gerencia (036).
- RF-5: EL SISTEMA deja a la Auxiliar Administrativa registrar compras, marcar lo recibido donde hoy lo hace Compras y anular una compra con su motivo.
- RF-6: EL SISTEMA deja a la Auxiliar Administrativa aprobar (de cualquier valor, D2), rechazar y devolver las solicitudes de pago, registrar los pagos y anular un pago con su motivo, con las mismas reglas que la gerencia (037).
- RF-7: EL SISTEMA deja a la Auxiliar Administrativa registrar, consultar y anular los cortes financieros de Elemental y consultar los de las otras empresas y obras sin registrarlos ni anularlos (D3).
- RF-8: EL SISTEMA deja a la Auxiliar Administrativa registrar, consultar y anular en Recursos Humanos, Documentos y Licitaciones de Elemental, como hoy en Recursos Humanos.
- RF-9: CUANDO la Auxiliar Administrativa aprueba, rechaza, devuelve, registra o anula algo, EL SISTEMA guarda quién fue y cuándo, igual que con la gerencia, y lo muestra en el historial de ese registro.
- RF-10: EL SISTEMA trata «eliminar» como **anular con motivo**: nada se borra, como en todo el panel.
- RF-11: EL SISTEMA no deja a la Auxiliar Administrativa dar accesos al panel distintos de los que da hoy (D5): sigue dando solo el de operador.

### Asistente: qué sabe cada cargo (H3, H4)

- RF-12: EL SISTEMA deja usar el asistente a la Auxiliar Administrativa.
- RF-13: EL SISTEMA deja a la gerencia consultar con el asistente, además de lo de hoy:
  - las solicitudes de compra y las compras;
  - las solicitudes de pago y los pagos;
  - los cortes financieros y el consolidado del grupo;
  - Recursos Humanos: personal, fichas, contratos por terminar y documentos por vencer;
  - las bitácoras de OCC y de Geolab;
  - los documentos del grupo.
- RF-14: EL SISTEMA deja a la Auxiliar Administrativa consultar con el asistente lo de RF-13 que alcanza en Elemental: compras, pagos, cortes, Recursos Humanos y documentos, incluido el salario (D4).
- RF-15: EL SISTEMA deja a cada uno de los demás cargos consultar con el asistente solo lo que alcanza en sus pantallas:
  - Residente: lo de su obra, como hoy, y las solicitudes de compra y de pago de su obra;
  - Almacenista: el almacén y las solicitudes de su obra, sin los valores de compra;
  - Encargado de Planta: Control Cantera de su obra;
  - Laboratorista: el laboratorio, la bitácora de Geolab y las solicitudes de Geolab;
  - Encargado de OCC: lo de OCC, la bitácora de OCC y las solicitudes de OCC.
- RF-16: SI alguien pregunta por algo que no alcanza, ENTONCES EL SISTEMA responde que no está a su alcance, sin decir si existe, como hoy (028/RF-8).
- RF-17: EL SISTEMA sigue sin crear, cambiar, aprobar ni anular nada desde el asistente: solo consulta.

### Asistente: archivos (H5)

- RF-18: CUANDO alguien le pide al asistente un archivo con lo que consultó, EL SISTEMA lo genera en PDF, Excel o Word, según lo pedido.
- RF-19: EL SISTEMA muestra el archivo generado en la conversación con su nombre, su formato y un botón para descargarlo.
- RF-20: EL SISTEMA pone en el archivo solo datos que quien lo pide alcanza, con las mismas cifras de la respuesta y de los módulos.
- RF-21: EL SISTEMA escribe en el Excel los números como números, las fechas como fechas y una hoja por tabla, como en los Excel de Reportes (030).
- RF-22: EL SISTEMA pone en el PDF y en el Word un encabezado con el grupo, quién lo pidió, la fecha y las fuentes consultadas.
- RF-23: SI lo pedido es demasiado grande para un archivo (ver RNF), ENTONCES EL SISTEMA lo dice y propone acotar el periodo o el lugar.
- RF-24: EL SISTEMA deja volver a descargar el archivo desde la conversación mientras esa conversación siga a su alcance y por 30 días desde que se generó (D7).

### Asistente: más fácil de usar (H6)

- RF-25: CUANDO alguien abre el asistente sin conversación, EL SISTEMA le muestra qué puede consultar según su cargo, en frases cortas.
- RF-26: EL SISTEMA le ofrece a cada cargo preguntas de ejemplo de su trabajo («¿Qué compras están por aprobar?», «Hazme un Excel de las horas del personal de esta semana»), y al tocarlas las escribe en el campo para enviarlas o cambiarlas.
- RF-27: CUANDO el asistente no entiende la pregunta o le faltan datos (la obra, el periodo), EL SISTEMA pregunta solo lo que falta, con opciones para tocar.
- RF-28: EL SISTEMA muestra en cada respuesta de dónde salió cada cifra, con enlace al registro en su módulo, como hoy (028/RF-28).
- RF-29: EL SISTEMA dice mientras trabaja qué está consultando («Leyendo las solicitudes de compra de octubre…»), para que la espera no parezca un error.

## Superficies afectadas

- [ ] **Móvil** — sin cambios.
- [x] **Panel web** — el nombre del acceso en todo el panel; Elemental (Compras, Tesorería, Cortes, RR. HH., Documentos, Licitaciones) con los botones de aprobar, registrar y anular para la auxiliar; el asistente (inicio, ejemplos, archivos, preguntas de aclaración).
- [x] **API** — las rutas de compras, pagos, cortes, documentos y licitaciones aceptan a la auxiliar; el asistente con consultas nuevas y la generación de archivos.
- [ ] **Sincronización** — sin cambios.
- [x] **Datos** — el nombre del acceso (sin cambiar a las personas); dónde se guardan los archivos generados durante 30 días (D7).
- [x] **Reglas** — la tabla de permisos, el alcance del asistente por cargo y los nombres de los accesos, con sus casos en `verificar-reglas.ts`.

## Requisitos no funcionales

- Un archivo de hasta 5 000 filas se genera en menos de 20 s en dev; más que eso se pide acotar (RF-23).
- La respuesta del asistente sin archivo tarda lo mismo que hoy.
- Los archivos en español, con formato colombiano en pesos y fechas, y las lecturas de medidor como la 039 (punto decimal, sin miles).

## Casos límite

- **Sin señal**: no aplica; el panel y el asistente son web.
- **Evidencia firmada**: una solicitud ya pagada o una compra recibida no cambian; anular sigue las reglas de la 036 y la 037. La auxiliar no puede anular lo que la gerencia tampoco puede.
- **Primer arranque**: una auxiliar recién creada entra a Elemental y ve las bandejas con lo pendiente; el asistente le muestra sus ejemplos.
- Una persona que cambia de acceso con la sesión abierta: lo nuevo aplica en la siguiente acción, como hoy.
- Dos personas aprobando la misma solicitud a la vez (gerencia y auxiliar): la segunda recibe «ya fue aprobada por…», sin duplicar.
- Una conversación con un archivo de algo que después dejó de estar al alcance: el archivo ya no se descarga (028/RF-49).
- Un pedido de archivo sin datos en el periodo: se dice, y no se genera un archivo vacío.

## Fuera de alcance

- Que el asistente apruebe, registre o anule algo (RF-17).
- La app móvil.
- Firmas digitales en los archivos.
- Enviar los archivos por correo o WhatsApp desde el asistente.
- Un rol nuevo: se renombra el que existe.

## Criterios de finalización

- Cada RF con su prueba en `scripts/verificar-reglas.ts` (permisos, alcance del asistente, armado de los archivos) o su demo descrita.
- `npm run verificar`, `npm run typecheck` y `npm run lint` en verde.
- Demo: una auxiliar `PRUEBA-040` aprueba una solicitud de compra de una obra y una de pago de OCC, registra la compra y el pago, y anula un corte de Elemental; con el asistente pide «las compras por aprobar» y un Excel con ellas. Un residente pide un PDF de la bitácora de su semana y no logra ver las compras de otra obra.
- Revisión en Chrome a 1366 px y a 390 px del asistente nuevo.

## Dudas resueltas (2026-11-05)

El usuario aceptó todas las propuestas.

- D1: Un solo nombre, «Auxiliar Administrativa».
- D2: Aprueba compras y pagos de cualquier valor, como la gerencia; el historial dice quién aprobó.
- D3: Consulta los cortes de todas las empresas y obras; registra y anula solo los de Elemental.
- D4: Ve el salario en las fichas y el asistente se lo responde.
- D5: Sigue dando solo el acceso de operador; dar accesos al panel es de gerencia.
- D6: «Eliminar» es anular con motivo (RF-10).
- D7: Los archivos generados se guardan 30 días en la conversación.
- D8: Esta spec mejora solo el asistente (RF-25 a RF-29); la revisión del panel completo por rol va en una spec aparte.
- D9: Solo PDF, Excel y Word.
