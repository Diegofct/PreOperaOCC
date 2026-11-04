# Spec 039 — Ajustes de la bitácora, horas, medidores, formularios y accesos

> Estado: Aprobada (2026-11-03; D1–D4 según mi propuesta) · Va a producción dentro de la T23 de la 033, con la migración 0038 detrás de la 0037.

## Contexto y objetivo

Antes de subir a producción las specs 033 a 038, el usuario pidió revisar varias fallas y mejoras. Algunas ya afectan a la bitácora que está en producción:

1. Para cerrar la bitácora se pide una foto en las actividades (spec 004, RF-52). No debe ser así: las fotos van en «Fotografía del día».
2. El sistema calcula las horas extras a partir de la entrada, la salida y el horario de la obra (spec 004/025). Debe guardar solo lo que se reporta: horas laboradas, extras diurnas y extras nocturnas.
3. Hay secciones que algunos días no tienen nada que reportar, y hoy no hay forma de decir «no aplica». Solo Actividades y Control Calidad la tienen (spec 032).
4. Horómetros y odómetros: se reportan con coma («4250,32») y el panel la descarta. Además, el contrato del panel solo acepta enteros, y se muestran con formato colombiano (4.250,3). Deben quedar con punto decimal: 4250.32.
5. La lectura final de una máquina no siempre aparece como lectura inicial del día siguiente.
6. Los formularios del panel tienen mucho espacio y no se ven alineados.
7. En Elemental > Recursos Humanos, gerencia ya no encuentra los botones para cambiar la contraseña («Dar acceso») ni para dar «Códigos». Siguen existiendo, pero esa lista quedó filtrada a las personas de Elemental (spec 033), y operadores y residentes ya no salen allí.

Decisiones del usuario (3-nov):
- Las fotos que ya se subieron por actividad se muestran en «Fotografía del día».
- La marca «no aplica» va en Maquinaria, Personal, Notas y Fotografía del día.
- En los medidores, el punto siempre es decimal.
- La mejora de formularios cubre todo el panel.

## Usuarios / actores

- **Residente y director** (panel): llenan y cierran la bitácora de su obra.
- **Gerencia** (panel, `admin`): cierra bitácoras, ve los reportes y da contraseñas y códigos a todo el personal.
- **La integración de WhatsApp** (n8n + IA): arma la bitácora con lo que se reporta en los grupos.
- **Quienes reportan por WhatsApp**: no cambian nada de cómo reportan.

## Historias de usuario

- H1: Como residente quiero cerrar la bitácora con las fotos del día, sin tener que subir una foto por actividad.
- H2: Como gerencia quiero ver las horas tal como las reportan (laboradas, extras diurnas y extras nocturnas), sin que el sistema las recalcule.
- H3: Como residente quiero marcar que hoy una sección no aplica (no trabajó maquinaria, no hubo personal, sin novedades, no se tomaron fotos), para poder cerrar sin inventar datos.
- H4: Como gerencia quiero ver horómetros y odómetros con punto decimal (4250.32), aunque los reporten con coma.
- H5: Como residente quiero que la lectura inicial de cada máquina sea la final del día anterior, sin copiarla a mano.
- H6: Como usuario del panel quiero formularios compactos y alineados, que se entiendan sin explicación.
- H7: Como gerencia quiero cambiarle la contraseña o darle códigos a cualquier persona desde Recursos Humanos de Elemental.

## Requisitos funcionales (criterios de aceptación en EARS)

### Fotos solo en «Fotografía del día» (H1)

- RF-1: EL SISTEMA no pide foto en las actividades. La bitácora se cierra sin foto por actividad, lo que reemplaza la regla de la spec 004 (RF-52).
- RF-2: EL SISTEMA sigue pidiendo al menos una foto del día para cerrar, salvo que esa sección esté marcada como «no aplica» (RF-11).
- RF-3: EL SISTEMA no ofrece subir foto dentro de una actividad. Toda foto subida en el panel queda en «Fotografía del día».
- RF-4: CUANDO se aprueba o se guarda un reporte de WhatsApp con fotos, EL SISTEMA las pone en «Fotografía del día» de esa bitácora, sin pedir a qué actividad pertenecen. Esto cambia la regla de la spec 021 (RF-50/51).
- RF-5: EL SISTEMA muestra en «Fotografía del día» las fotos que se subieron por actividad antes de este cambio, y se pueden quitar como las demás.

### Horas reportadas, sin cálculo (H2)

- RF-6: EL SISTEMA guarda de cada persona las horas laboradas, las extras diurnas y las extras nocturnas tal como se reportan, y no calcula horas extras a partir de la entrada, la salida ni el horario de la obra.
- RF-7: EL SISTEMA sigue validando lo reportado:
  - las horas van en pasos de media hora;
  - las extras diurnas más las nocturnas no superan las laboradas;
  - no se pasan de 16 horas al día.
- RF-8: SI de una persona se reporta solo la entrada y la salida, sin horas, ENTONCES EL SISTEMA guarda la entrada y la salida, deja las horas vacías y muestra «Horas no reportadas».
- RF-9: EL SISTEMA muestra en la bitácora, en el resumen de Inicio y en los Reportes solo las horas reportadas. Quita el desglose calculado y los avisos «no cuadran», «más de 2 extra» y «Horario de este día».
- RF-10: CUANDO la IA lee el formato «Control de horas extras» (Excel o foto), toma las columnas de horas laboradas, extras diurnas y extras nocturnas tal como vienen.

### «No aplica» por sección (H3)

- RF-11: EL SISTEMA deja marcar como «no aplica» estas secciones, cada una con su texto y un motivo obligatorio:

  | Sección | Texto de la marca |
  |---|---|
  | Maquinaria | «Hoy no trabajó maquinaria» |
  | Personal | «Hoy no se reportó personal» |
  | Notas | «Sin novedades» |
  | Fotografía del día | «No se tomaron fotos» |

  Funciona igual que «Hoy no se realizaron actividades/ensayos» (spec 032).
- RF-12: MIENTRAS una sección está marcada, EL SISTEMA oculta su botón de añadir y la cuenta como llena para cerrar. SI está marcada sin motivo, ENTONCES no deja cerrar y dice qué motivo falta.
- RF-13: SI una sección marcada ya tiene renglones, ENTONCES EL SISTEMA no deja marcarla hasta que se quiten.
- RF-14: EL SISTEMA muestra la marca y su motivo en la bitácora cerrada y en el índice de secciones.

### Medidores con punto decimal (H4)

- RF-15: EL SISTEMA lee los horómetros y odómetros con coma o con punto como separador decimal: «4250,32» y «4250.32» son 4250.32. El punto siempre es decimal: «5.830» es 5.83. SI vienen los dos signos, ENTONCES el último es el decimal y el otro se ignora: «4.250,32» es 4250.32.
- RF-16: EL SISTEMA guarda las lecturas con hasta dos decimales y las acepta con decimales en todas las entradas del panel: bitácora, Vehículos y WhatsApp.
- RF-17: EL SISTEMA muestra las lecturas con punto decimal, hasta dos decimales y sin separador de miles, por ejemplo «4250.32 km» o «812.5 h». Aplica en bitácoras, Vehículos, Maquinaria, Mantenimientos, Reportes y exportaciones.
- RF-18: SI una lectura queda por debajo de la anterior de esa máquina, ENTONCES EL SISTEMA muestra un aviso, sin bloquear.

### El final de hoy es el inicial de mañana (H5)

- RF-19: EL SISTEMA toma como lectura anterior de una máquina la más reciente entre la última final reportada en una bitácora **de cualquier obra** y la lectura del vehículo.
- RF-20: CUANDO una máquina entra a una bitácora, sea desde el panel, desde WhatsApp con guardado automático, con aprobación manual o desde «No se pudo guardar», y viene sin lectura inicial, EL SISTEMA le pone la lectura anterior.
- RF-21: CUANDO se guarda o se corrige la lectura final de una máquina en el día D, EL SISTEMA actualiza la inicial de esa máquina en la siguiente bitácora abierta, solo si estaba vacía o igual a la final anterior.
- RF-22: CUANDO un reporte de WhatsApp trae solo la lectura final de una máquina que ya estaba en la bitácora, EL SISTEMA conserva la inicial que ya tenía.
- RF-23: CUANDO se abre una bitácora abierta con una máquina sin lectura inicial, EL SISTEMA la propone con la lectura anterior.

### Formularios del panel (H6)

- RF-24: EL SISTEMA muestra los formularios del panel con los campos alineados en rejilla y con la etiqueta encima de cada campo. Usa anchos uniformes según el tipo de dato y menos espacio entre campos y entre secciones.
- RF-25: EL SISTEMA deja la acción principal de cada formulario visible y alineada en el mismo lugar, con textos de ayuda breves. En celular, los campos van uno debajo del otro, sin desplazamiento horizontal.
- RF-26: EL SISTEMA aplica RF-24 y RF-25 en todo el panel, empezando por la bitácora de obra y la de OCC.

### Contraseñas y códigos en Recursos Humanos (H7)

- RF-27: EL SISTEMA lista en Elemental > Recursos Humanos > «Accesos y contraseñas» (antes «Personas y accesos») a todas las personas del grupo, con un filtro por empresa.
- RF-28: EL SISTEMA deja a gerencia, desde esa lista y desde la ficha de la persona:
  - dar una contraseña temporal («Dar acceso») a quien no es operador;
  - dar «Códigos» a quien opera vehículos.

  Usa las mismas reglas y la misma ventana de hoy.

## Superficies afectadas

- **Reglas:**
  - `src/shared/rules/parte.ts` (cierre, secciones y marcas), `horas.ts`, `jornada.ts` (lectura anterior y avisos), `whatsapp.ts` (números y fusión), `whatsapp-automatico.ts`, `reportes.ts`;
  - regla nueva de lecturas (`leerLectura`, `mostrarLectura`).
- **Servidor:**
  - `partes/[id]/cerrar`, `partes/[id]/foto`, `partes` (lecturas anteriores), `resumen`;
  - `features/whatsapp/servidor/aprobacion.ts`, `dias.ts`, `excepciones.ts`, `fotos-del-dia.ts`;
  - `features/bitacoras/servidor/lecturas.ts`;
  - `features/reportes/servidor/datos.ts`.
- **Base:** migración 0038 con la columna jsonb `partes_de_obra.secciones_sin_registro`.
- **Pantallas:**
  - `pantalla-partes.tsx`, `componentes.tsx` (formularios), `whatsapp/propuesta-reporte.tsx`, `pantalla-vehiculos.tsx`;
  - reportes de máquinas y mantenimiento, `pantalla-personas.tsx`, `pantalla-recursos-humanos.tsx`, `rrhh/vista-de-la-ficha.tsx`;
  - el resto del panel, en la pasada de formularios.
- **n8n:** prompt de clasificar (`generar_workflow_clasificar.py` y plantillas) para horas y decimales. Se despliega en la T23.

## Requisitos no funcionales

- Cerrar y abrir una bitácora sigue tardando lo mismo que hoy (≤ 1,5 s en dev). La lectura anterior entre obras se resuelve con una sola consulta.
- La migración 0038 solo agrega una columna (con `'{}'` por defecto). No borra ni reescribe datos.
- Las bitácoras ya cerradas no cambian. Las horas que ya se guardaron calculadas se muestran solo si fueron reportadas.

## Casos límite

- Bitácoras viejas cerradas con horas calculadas (sin `horasLaboradas`): se ven con «Horas no reportadas», y su entrada y salida quedan visibles. No se recalculan.
- Una foto que se subió por actividad y también como foto del día (mismo archivo): se muestra una sola vez, porque se descarta por `sha256`.
- Una máquina que cambia de obra: su inicial en la obra nueva es la final de la obra anterior (RF-19).
- Una final corregida después de cerrar el día siguiente: no toca bitácoras cerradas (RF-21 solo actúa sobre abiertas).
- «4.250» en un horómetro: se toma como 4.25 y sale el aviso de RF-18 si la anterior era 4249. El usuario corrige.
- «Día sin trabajo» (spec 004) sigue igual. Las marcas por sección son para días con trabajo.

## Fuera de alcance

- La app móvil (preoperacional): sigue capturando horómetro y odómetro enteros. Cambiarlo exige migración local y publicar la app.
- Recalcular o migrar las horas de bitácoras viejas.
- Cambiar la bitácora de OCC (spec 038): no pide fotos por renglón ni calcula horas.

## Criterios de finalización

- RF-1 a RF-28 comprobados en dev (validacion.md).
- Pruebas de reglas actualizadas y nuevas: fotos, horas, marcas, `leerLectura`/`mostrarLectura` y lectura anterior entre obras. Los tres comandos en verde.
- Prueba e2e en dev con datos PRUEBA-039 y limpieza acotada.
- Revisión en Chrome de la bitácora, la propuesta de WhatsApp, Recursos Humanos y la pasada de formularios.
- Prompt de n8n probado con mensajes reales con coma decimal y un formato de horas extras.

## Dudas resueltas (2026-11-03, todas según mi propuesta)

- D1: ¿Las marcas «no aplica» se pueden poner también desde WhatsApp (que la IA entienda «hoy no trabajó maquinaria»)? **Resuelta:** no por ahora. Se marcan en el panel; la IA ya guarda lo que llega.
- D2: ¿El motivo de «Sin novedades» en Notas es obligatorio? **Resuelta:** sí, por consistencia, y basta un texto corto («sin novedad»).
- D3: Para RF-21, si la siguiente bitácora abierta ya tiene una inicial distinta de la final anterior (alguien la escribió a mano), ¿se respeta? **Resuelta:** sí, se respeta, y se muestra el aviso de que no coincide con la final anterior, como hoy.
- D4: ¿Los Reportes y exportaciones muestran también «Horas no reportadas»? **Resuelta:** sí, con las horas en blanco, no en cero (pestaña Personal de Reportes, su Excel y su PDF). Los avisos «+2 h extra» y «h extra de la semana» se quedan: suman lo reportado, no calculan.
