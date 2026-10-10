# Tareas — Spec 025

Tareas de menos de 30 minutos, ordenadas por dependencia. Cada una lleva los RF que
cubre y una línea `Hecho cuando:` que se pueda comprobar sin interpretar.

**Se implementa una tarea cada vez**, y ninguna se marca sin `npm run verificar`,
`npm run typecheck` y `npm run lint` en verde (mirando el código de salida, sin filtrar).
T18 a T20 y parte de T24 son del repo de la integración (`C:\dev\n8n-evolutionapi`): ahí
«los tres comandos» no aplican, y su «Hecho cuando» dice qué se comprueba.

### Reglas puras

- [x] T1. Tipos: `PersonaDelParte` con horas y novedad, `EnsayoDelParte` con edad, resultado,
      unidad y cumple, `UbicacionDelEnsayo` con tramo; `NOVEDADES_DE_PERSONAL`. (RF-1–3, 18, 31,
      34–36)
      Hecho cuando: los tipos compilan sin tocar comportamiento y los tres comandos están en verde.
- [x] T2. `validarPersonaDelParte` y `mensajeDePersona` en `horas.ts`, con sus casos. (RF-4–12,
      19, 20)
      Hecho cuando: los 10 casos del plan pasan y los tres comandos están en verde.
- [x] T3. `horasDeLaPersona` y `horasNoCuadran`, con sus casos. (RF-14–16)
      Hecho cuando: L 13 / ED 3 / EN 1 da «reportadas»; solo entrada/salida da «calculadas»; L 8
      con 7:00–17:00 en el horario propuesto no avisa y L 10 sí; los tres comandos en verde.
- [x] T4. Cierre: una persona bloquea solo si `validarPersonaDelParte` falla. (RF-6, 19, 61)
      Hecho cuando: una bitácora con una persona con solo L, y otra incapacitada, cierra en la regla;
      una sin nada bloquea con el mensaje de RF-8; los tres comandos en verde.
- [x] T5. `faltasDelEnsayo`: fin opcional, metros 0–999, tramo en cualquier orden, observación o
      resultado/cumple. (RF-29–33, 38, 39)
      Hecho cuando: los 6 casos del plan pasan, `validarAbscisa` de viajes sigue exigiendo 25 en
      25, y los tres comandos en verde.
- [x] T6. `tramoDeTexto` y los sinónimos de ensayo en `whatsapp.ts`. (RF-40, 43)
      Hecho cuando: los 4 textos de ubicación del 8-oct dan su tramo; «Pr 1 + 300 al Pr 1 +170»
      queda invertido como se escribió; «Cantera La Fortune» da lugar; «Compresión de probetas de
      suelo cemento con 4%» da `compresion_simple`; los tres comandos en verde.
- [x] T7. `PersonaDelReporte`/`EnsayoDelReporte`, `PropuestaLeible`, `resolverPropuesta` y
      `faltasDelReporte` con lo nuevo; `observacionDelEnsayo` deja de meter el resultado.
      (RF-23–28, 41–43)
      Hecho cuando: el personal y los ensayos del 8-oct escritos como propuesta de la IA resuelven
      sin faltas (37 personas, Vicente incapacitado, 4 ensayos con edad, resultado y cumple); una
      propuesta guardada antes (sin campos nuevos) resuelve igual que en HEAD; los tres comandos en
      verde.

### Servidor

- [x] T8. `construirPersona`/`personalDelParte` y `construirEnsayo`/`laboratorioDelParte` con los
      campos nuevos; contratos `personaDelParte` y `ensayoDelParte`. (RF-1–12, 18–20, 29–39, 61)
      Hecho cuando: con curl a `PUT /api/panel/partes/:id` en dev se guardan una persona con solo L
      y un ensayo con tramo sin fin, y una persona con ED > L responde 400 con el texto de RF-10.
- [x] T9. `propuestaDeIa` y `reporteCorregido` con los campos nuevos; `guardarEnBitacora` los pasa.
      (RF-23, 24, 27, 42)
      Hecho cuando: un mensaje `PRUEBA-025-T9-1` entregado por curl en dev con personal en horas y
      ensayos queda en la bitácora de prueba sin excepciones.
- [x] T10. `resumen+api.ts` suma horas reportadas y novedades como 0. (RF-17, 22)
      Hecho cuando: el resumen de dev cuenta las horas de la persona de T8 y los tres comandos en verde.
- [x] T11. `validarRango` compartido; `desde`/`hasta` en `leerBandeja`, excepciones y creados, con
      orden descendente y sin tope; rutas con 400. (RF-45–53)
      Hecho cuando: con curl, `propuestas?estado=guardado&desde=…&hasta=…` trae los del rango del más
      nuevo al más viejo; sin fechas trae 7 días; `hasta<desde` y 400 días responden 400; los tres
      comandos en verde.
- [x] T12. Choque de versión: `guardarEnBitacora` reintenta 4 veces; `llevarABitacora` deja el
      mensaje en espera ante el 409 de choque. (defecto 024)
      Hecho cuando: un caso con dos `llevarABitacora` simultáneos del mismo mensaje en dev deja la
      bitácora escrita y ninguna excepción «bitacora»; los tres comandos en verde.

### Panel

- [x] T13. Bitácora, sección Personal: casillas L/ED/EN y novedad, desglose de lo reportado, aviso
      de RF-16. (RF-13–16, 21, 60)
      Hecho cuando: en Chrome se guarda una persona con L 13 / ED 3 / EN 1, otra incapacitada, se ve
      el aviso con entrada/salida que no cuadra, y una bitácora cerrada antigua se ve igual.
- [x] T14. Bitácora, Control Calidad: tramo, metros libres, edad, resultado con unidad y cumple;
      ensayos antiguos igual. (RF-31–39, 44)
      Hecho cuando: en Chrome se guarda un ensayo con tramo invertido, sin hora de fin y sin
      observación pero con resultado, y la fila muestra edad, resultado y cumple.
- [x] T15. «No se pudo guardar»: edita L/ED/EN, novedad, edad, resultado, cumple y tramo. (RF-27)
      Hecho cuando: en Chrome una excepción de personal sin horas se completa con L y se guarda.
- [x] T16. Desde/Hasta en Historial, «No se pudo guardar» y «Creado automáticamente», en la URL.
      (RF-45–47, 49, 50, 54)
      Hecho cuando: en Chrome el Historial abre con 7 días, cambia de rango, avisa con hasta<desde, y
      al recargar conserva el rango.
- [x] T17. `POR_PAGINA = 15`, `usePaginacion` y paginación en las tablas de RF-56; volver a la
      página 1 al filtrar. (RF-55–59)
      Hecho cuando: en Chrome Personas, Historial, Viajes, Laboratorio y Obras paginan de a 15, una
      tabla con ≤15 no muestra controles, cambiar un filtro vuelve a la página 1, y los tres
      comandos en verde (prueba de anchos incluida).

### Integración (repo de n8n)

- [x] T18. `generar_workflow_clasificar.py`: esquema (horas_laboradas, extra_diurnas,
      extra_nocturnas, novedad, edad_dias) e instrucciones (L/ED/EN, novedades, cargo por grupo,
      lista de ensayos, tramo, una sola hora); `contexto_obra.md` (laboratorio → bitácora).
      (RF-23–25, 40–42)
      Hecho cuando: el json regenerado importa en el PC y el texto real del 8-oct clasificado sin
      arrancar el servidor trae 37 personas con L/ED/EN, Vicente con novedad y 4 ensayos con
      «Compresión simple», edad, resultado y cumple.
- [x] T19. Plantilla v4 (`_v3.md` guardada) con Personal en L/ED/EN por cargo y novedades, y el
      ensayo con una o dos horas y tramo.
      Hecho cuando: la plantilla v4 pasa por la IA en el PC sin `requiere_revision`.
- [x] T20. Demo de punta a punta en dev: el 8-oct clasificado (T18) entregado a dev y procesado con
      el pulso.
      Hecho cuando: la bitácora de prueba muestra el personal en horas, Vicente incapacitado y los 4
      ensayos, y «No se pudo guardar» no tiene personal ni ensayos de ese mensaje.

### Despliegue y validación

- [x] T21. Despliegue: imagen nueva (respaldo `preoperaocc:anterior`), flujo de clasificar publicado
      en el VPS (respaldo en `respaldos/`), notas en `DESPLIEGUE_VPS.md`.
      Hecho cuando: el panel de producción responde, los 4 flujos están activos y un pulso a mano
      termina sin errores.
- [x] T22. Reprocesar el 8-oct en producción: reclasificar `3EB024B22E22EB9C3B2A3D`, resolver sus
      excepciones viejas de personal, ensayos y bitácora, y llevarlo de nuevo a la bitácora.
      Hecho cuando: la bitácora del 8-oct de la obra real tiene 37 personas (o las que el reporte
      traiga sin repetir) y 4 ensayos, sin notas duplicadas.
- [x] T23. `validacion.md` RF por RF.
      Hecho cuando: los 61 RF tienen su evidencia y la spec pasa a Cumplida.
