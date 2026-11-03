# Tareas — Spec 038

Tareas de menos de 30 minutos, ordenadas por dependencia. Cada una lleva los RF que
cubre y una línea `Hecho cuando:` que se pueda comprobar sin interpretar.

**Se implementa una tarea cada vez**, y al terminarla se para.
Ninguna tarea se marca sin `npm run verificar`, `npm run typecheck` y `npm run lint`
en verde, mirando el código de salida.

### Reglas

- [x] T1. `rules/whatsapp.ts`: `duenoDelGrupo` (obra o empresa, nunca las dos; solo `occ` y `geolab`) y `placaParecida` (forma de placa, distancia 1 con cambio o transposición, un solo candidato). (RF-1, RF-2, RF-12a)
      Hecho cuando el verificador cubre: obra sola, empresa sola, las dos → error, Elemental y Proyectos → error; «LVY 499» → LVY498, «CZW 128» → ZCW128, «LUY002» → LVY002, dos placas a distancia 1 → ninguna, «TFO427» exacta no es «parecida», texto sin forma de placa → ninguna; y los tres comandos en verde.
- [x] T2. `rules/whatsapp.ts`: `reconocerEquipoDeEmpresa` (placa sin filtro de obra → nombres en WhatsApp → tipo y marca → placa parecida → no reconocido). (RF-12, RF-12a, RF-12c)
      Hecho cuando el verificador cubre: «TFO 427» = TFO427; «Pajarita Case cantera» por nombre en WhatsApp; «Vibrocompactador Dynapac» por tipo y marca; «LVY 499» → sin equipo y con posible LVY498; «Grúa XYZ» → no reconocido; un equipo de cualquier obra se reconoce; y los tres comandos en verde.
- [x] T3. `rules/bitacora-occ.ts`: tipos de las secciones, `diaDeEmpresa` y `fechaDudosa`. (RF-8, RF-9a, RF-9e, D12)
      Hecho cuando el verificador cubre: la lista «para el día 29» enviada el 28 a las 20:11 → 29 sin marca; la lista «para el día 28» enviada el 28 a las 22:59 → 28 con «Fecha dudosa»; el informe «Fecha 19/10/2026» enviado el 20 → 19; una foto sin fecha → día de envío; y los tres comandos en verde.
- [x] T4. `rules/bitacora-occ.ts`: `reemplazarLista`, `anotarCambio`, `mezclarRenglones` con id fijo y `conteoDelDia`. (RF-9b, RF-9c, RF-9f, RF-15, RF-24)
      Hecho cuando el verificador cubre: segunda lista reemplaza y la primera queda en el historial; TFO 429 varado 08:48 y disponible 14:45 quedan como dos cambios sin borrar la lista; un cambio antes de la lista crea el renglón; repetir el mismo mensaje no duplica trabajos ni actividades; Notas → pendientes ligados al equipo; el conteo de operativos e inoperativos; y los tres comandos en verde.
- [x] T5. `rules/bitacora-occ.ts`: `mantenimientosDelTrabajo`. (RF-9h)
      Hecho cuando el verificador cubre: el cambio de aceite y filtros de NPX602 → `aceite`; un preventivo sin aceite → `preventivo`; «daño bomba hidráulica TFO 420» → `correctivo`; «TFO 420 OPERATIVO» → resuelto; llantas, repuesto y suministro → nada; «LVY 499» → nada; y los tres comandos en verde.
- [x] T6. `rules/whatsapp-automatico.ts` y `rules/empresas.ts`: tipos de reporte `lista_equipos` e `informe_mantenimiento`; categorías nuevas y destino `bitacora_empresa` (con `vehiculo_maquinaria` e `incidente` cuando el grupo es de empresa); pestañas de OCC; Bitácora de Geolab sin «en construcción». (RF-9, RF-9e, RF-9g, RF-16, RF-22, RF-27, RF-29)
      Hecho cuando el verificador cubre cada categoría del grupo de empresa con su destino, `administrativo` y `seguimiento` → ninguno, las de obra sin cambios, las dos pestañas para gerencia y el Encargado de OCC, y Geolab para el laboratorista; y los tres comandos en verde.

### Datos y servidor

- [x] T7. Esquema y migración `0037`: `whatsapp_grupos.empresa_id`, `whatsapp_mensajes.empresa_decidida_id`, `vehiculos.nombres_whatsapp`, `bitacoras_empresa`, `whatsapp_dias_empresa`, segundo dueño en `whatsapp_reportes_esperados` y `bitacora_fotos`, y los valores nuevos del enum. SQL revisado a mano. Aplicada **solo en dev**. (RF-1, RF-7, RF-12, RF-16, RF-20)
      Hecho cuando: la migración no borra ni cambia filas; está aplicada en dev; un grupo con obra y empresa se rechaza; dos bitácoras vigentes de OCC el mismo día se rechazan, y anulada una se acepta otra; las fotos y los esperados existentes siguen intactos; y los tres comandos en verde.
- [x] T8. Grupos: `PATCH /api/panel/whatsapp/grupos/:id` con obra **o** empresa; mueve los pendientes y deja lo guardado; la lista muestra obra o empresa. `empresaDelMensaje` en `obra.ts`. (RF-1 a RF-5)
      Hecho cuando, con un script contra dev: gerencia asocia PRUEBA-038 a OCC; obra y empresa a la vez 422; Elemental 422; el residente 403; pasar el grupo a una obra mueve un pendiente y deja un guardado con su empresa; un grupo sin dueño guarda sin procesar; y los tres comandos en verde.
- [x] T9. Vehículos: leer y guardar `nombresWhatsapp` en la API de vehículos. (RF-12, D11)
      Hecho cuando gerencia guarda dos nombres en un equipo de dev y la ficha los devuelve; un nombre repetido en otro equipo 409; el residente no los cambia; y los tres comandos en verde.
- [x] T10. `whatsapp/servidor/empresa.ts`: procesar un mensaje de grupo de empresa hasta la bitácora del día (pasos 1 a 5 del plan); `automatico.ts` lo llama según el dueño. (RF-9 a RF-12c, RF-15, RF-19, RF-30)
      Hecho cuando, entregando por la integración en dev mensajes PRUEBA-038: una lista arma el estado del día X; un informe arma actividades del día que dice; una foto de trabajo suma un trabajo; «LVY 499» se guarda tal cual con la nota; un equipo desconocido va a «No se pudo guardar»; repetir la entrega no duplica; con la bitácora cerrada, todo a «No se pudo guardar» con «Bitácora cerrada»; y los tres comandos en verde.
- [x] T11. Medidores, fotos y mantenimientos desde `empresa.ts`: lecturas solo de equipos ligados; fotos a `bitacora_fotos` con la bitácora de empresa; `guardarMantenimientos` con obra nula (toma la del equipo). (RF-8, RF-9h, RF-12b, RF-14)
      Hecho cuando, en dev: «Km final 74609 LVY002» actualiza el odómetro de LVY002 y «LUY002» no; la foto queda en las Fotos del día de OCC; el aceite de NPX602 queda en Mantenimientos con la obra del equipo; «TFO 420 OPERATIVO» resuelve su correctivo; el mismo aceite desde obra y desde OCC queda una vez; y los tres comandos en verde.
- [x] T12. `whatsapp/servidor/dias-empresa.ts` y esperados de empresa: la decisión «¿ya está todo?» extraída de `dias.ts` y compartida; `GET|PUT /api/panel/whatsapp/esperados?empresa=` y `GET /api/panel/whatsapp/dias?empresa=`. (RF-16, RF-17)
      Hecho cuando: con la lista y el informe esperados, el día de OCC queda en espera con uno y se arma con los dos; sin esperados se arma con el primero; a la hora límite queda incompleta con lo que faltó; los días de obra se arman igual que antes (pruebas de la 024 en verde); y los tres comandos en verde.
- [x] T13. `empresas/servidor/bitacora-occ.ts` y sus rutas: listar días, ver un día con filtros, corregir con versión, cerrar, anular con motivo. (RF-18 a RF-20, RF-23, RF-24, RF-29)
      Hecho cuando, con un script contra dev: gerencia y el Encargado de OCC listan, ven, corrigen, cierran y anulan; versión vieja 409; corregir una cerrada 422; anular sin motivo 422; el residente y el laboratorista 403; el filtro por equipo y por estado funciona; y los tres comandos en verde.
- [x] T14. Bandeja, «No se pudo guardar» y «Creado automáticamente» de OCC: filtro de origen «Grupo de OCC / Obras / Todos»; las excepciones de OCC completan renglones de la bitácora de OCC. (RF-11, RF-25, RF-26)
      Hecho cuando: «Grupo de OCC» trae solo PRUEBA-038, «Obras» lo de vehículos y maquinaria de las obras como antes, «Todos» los dos; «No se pudo guardar» de OCC trae solo lo del grupo de OCC; completar el equipo desconocido lo lleva a la bitácora de su día; y los tres comandos en verde.
- [x] T15. `empresas/servidor/laboratorio.ts` y `GET /api/panel/empresas/geolab/laboratorio`; el asistente lee la bitácora de OCC con su permiso. (RF-27, RF-28, RF-31)
      Hecho cuando: gerencia y el laboratorista ven el laboratorio y los ensayos de las obras filtrados por obra y fecha, sin las anuladas; el Encargado de OCC 403; un grupo asociado a Geolab muestra sus mensajes en su bandeja sin armar bitácora; el asistente responde sobre la bitácora de OCC a gerencia y no al residente; y los tres comandos en verde.

### Pantallas

- [x] T16. Grupos de WhatsApp: selector «Obra / Empresa» al asociar y la columna con obra o empresa; ficha del equipo con «Nombres en WhatsApp». (RF-1, RF-3, D11)
      Hecho cuando, en Chrome con dev: gerencia asocia PRUEBA-038 a OCC y la lista lo dice; agrega «Pajarita Case cantera» a un equipo y queda guardado; y los tres comandos en verde.
- [x] T17. Bitácora de OCC: pestañas «Bitácora de OCC» y «En las obras»; lista de días con estado y conteo. (RF-22, RF-23)
      Hecho cuando, en Chrome con dev: el Encargado de OCC ve las dos pestañas; la lista muestra los días PRUEBA-038 con su estado y operativos e inoperativos; «En las obras» se ve como antes; y los tres comandos en verde.
- [x] T18. El día abierto: Estado de los equipos (con sus cambios y «Posiblemente sea…»), Trabajos, Actividades, Pendientes y Fotos del día; filtros; corregir, cerrar y anular; aviso de «Fecha dudosa». (RF-9 a RF-9f, RF-12a, RF-18 a RF-20, RF-24)
      Hecho cuando, en Chrome con dev: se ven las cinco secciones con los datos de PRUEBA-038; la nota de la placa mal escrita y la marca de fecha dudosa salen; filtrar por equipo y por inoperativos funciona; corregir, cerrar y anular funcionan y, una vez cerrada, no deja editar; y los tres comandos en verde.
- [x] T19. Reportes de WhatsApp de OCC con el filtro de origen; reportes esperados de OCC; Bitácora de Geolab. (RF-16, RF-25 a RF-27)
      Hecho cuando, en Chrome con dev: el filtro cambia lo que se ve; gerencia define la lista y el informe como esperados de OCC; la Bitácora de Geolab muestra el laboratorio de las obras; y los tres comandos en verde.

### Integración (repo `n8n-evolutionapi`)

- [x] T20. `contexto_occ.md` (equipos, personas del grupo, formatos de lista e informe) y prompt propio por `grupo_id` en `generar_workflow_clasificar.py`; el bloque `occ` de la propuesta. Probado en el n8n **local** con 10 mensajes reales del grupo (sin tocar el VPS). (RF-6, RF-9 a RF-9g)
      Hecho cuando: la lista del 29-oct sale como `lista_equipos` con sus volquetas, maquinaria, inoperativos y notas; el informe de Pedro como `informe_mantenimiento` con una actividad por viñeta; una foto de reparación como `trabajo_mantenimiento`; «Autorizado» y las preguntas de Jaime como `administrativo` o `seguimiento`; y lo que propone pasa la validación de `propuestaDeIa`.
- [x] T21. Grupo de OCC en `NOMBRES_DE_GRUPO`, en la lista autorizada de la captura y en `importar_historial.py`, **sin desplegar**. (RF-6, D9)
      Hecho cuando los JSON generados lo incluyen y el diff contra los del VPS solo cambia eso y el prompt.

### Cierre

- [x] T22. Validación: demo de la spec completa en dev, casos límite, medición (día de 60 equipos y 30 días de «En las obras» en menos de 2 s), `npx expo export --platform web` y `grep` de fugas; `validacion.md`; limpieza de PRUEBA-038 en dev y R2; sin scripts temporales. (Criterios de finalización)
      Hecho cuando `validacion.md` tiene el veredicto de cada RF, la medición está por debajo de 2 s, no queda nada PRUEBA-038 en dev ni en R2, y los tres comandos en verde.

> Producción (migraciones 0031 → 0037, imagen, grupo de OCC en n8n y su historial) va con
> la **T23 de la 033**, cuando el usuario lo pida.
