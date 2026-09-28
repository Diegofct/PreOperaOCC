# Tareas — Spec 019

Tareas de menos de 30 minutos, ordenadas por dependencia. Cada una lleva los RF que
cubre y una línea `Hecho cuando:` que se pueda comprobar sin interpretar.

**Se implementa una tarea cada vez** (`/sdd:implementar T1`), y al terminarla se para.
Ninguna tarea se marca sin `npm run verificar`, `npm run typecheck` y `npm run lint`
en verde.

- [x] T1. Añadir los seis tipos al catálogo único, con sus casos en el guion de
      verificación. (RF-1…RF-6, RF-8, RF-9, RF-11, RF-19, RF-20)
      `src/shared/catalogos/tipos-vehiculo.ts`: `camion`, `carrotanque`, `excavadora`,
      `excavadora_oruga`, `montacargas`, `carro_taller`, con nombre visible, medidor y
      `sinFormato: true`; comentario de cabecera citando la spec 019. En
      `scripts/verificar-reglas.ts`: la lista esperada de «sin formato» pasa a ocho tipos,
      un caso de medidor por tipo nuevo y un caso de slugs únicos.
      Hecho cuando: `npm run verificar` muestra los casos nuevos en verde, los siete tipos
      anteriores conservan slug, nombre y medidor sin cambios, y los tres comandos pasan.

- [x] T2. Posiciones de llanta de los tipos nuevos, con sus casos. (RF-15, RF-16, RF-17)
      `src/shared/catalogos/llantas.ts`: camión, carrotanque y carro taller con
      `DELANTERAS + dobles(2) + REPUESTO`; excavadora y montacargas con
      `DELANTERAS + TRASERAS_SIMPLES`; excavadora de oruga sin entrada; el bloque
      «pendiente de validación por OCC» los menciona. Casos en `verificar-reglas.ts`.
      Hecho cuando: `verificar` comprueba 7 posiciones para `camion`, `carrotanque` y
      `carro_taller`, 4 para `excavadora` y `montacargas`, y 0 para `excavadora_oruga`, y
      los tres comandos pasan.

- [x] T3. Regla pura de cumplimiento del día, con sus casos.
      (RF-21, RF-22, RF-23)
      `src/shared/rules/cumplimiento.ts` nuevo, sin imports, según el algoritmo del plan.
      Casos en `verificar-reglas.ts`: flota mixta, flota solo sin formato → `null`, flota
      vacía → `null`, e inspeccionado fuera de la flota que no pasa de 100%.
      Hecho cuando: los cuatro casos corren en verde en `npm run verificar` y los tres
      comandos pasan.

- [x] T4. El resumen del inicio cuenta solo los equipos con formato.
      (RF-21, RF-22, RF-23)
      `src/app/api/panel/resumen+api.ts` usa `cumplimientoDelDia` con
      `conFormato = !formatoPendiente(tipoVehiculoId)` y responde `equiposInspeccionables`;
      `ResumenFila` en `contratos.ts` lo declara; `pantalla-inicio.tsx` usa ese número en
      el pie del medidor y, si hay equipos pero ninguno con formato, lo dice en vez de
      «Todavía no hay equipos registrados».
      Hecho cuando: con `npm run web` reiniciado, en una obra con un equipo con formato y
      una recicladora sin preoperacional hoy, el inicio muestra «Sin preoperacional: 1» y el
      pie «0 de 1 equipos inspeccionados»; y los tres comandos pasan.

- [x] T5. Sembrar producción sin tocar `.env` a mano. (Despliegue)
      `scripts/produccion.ts` con el cambio de base a `preoperaocc` extraído de
      `migrar-produccion.ts`, que pasa a usarlo; `scripts/sembrar-produccion.ts` y
      `npm run db:sembrar:produccion` en `package.json`; comentarios obsoletos («los cinco
      tipos») en `sembrar-servidor.ts` y `src/db/local/seed.ts`; `docs/despliegue.md` y la
      sección «Actualizar el VPS» de `AGENTS.md` dicen cuándo sembrar producción.
      Hecho cuando: `npm run typecheck` cubre los scripts nuevos; ejecutar
      `migrar-produccion.ts` imprime el mismo host y la base `preoperaocc` que antes (sin
      migraciones pendientes); y los tres comandos pasan. **No** se ejecuta
      `db:sembrar:produccion` en esta tarea.

- [x] T6. Sembrar desarrollo y demo del panel. (RF-1…RF-7, RF-10, RF-12, RF-13,
      RF-15…RF-17, RF-21…RF-26)
      `npm run db:sembrar:servidor` contra desarrollo, reiniciar `npm run web` y recorrer
      los pasos 1 a 4 y 6 de la demo del plan.
      Hecho cuando: el selector muestra los seis tipos; un Camión Ford pide solo km, lleva
      «Sin formato» y ofrece 7 posiciones de llanta; una Excavadora de oruga pide solo
      horas y no ofrece llantas; el inicio no cuenta el camión como «sin preoperacional»; y
      un parte con el camión en maquinaria cierra y suma sus km al resumen. Cualquier
      sorpresa queda en las Notas de ejecución.

- [x] T7. Demo en el teléfono con el APK ya instalado. (RF-14, RF-18)
      **Aplazada hasta después del despliegue**; hecha en producción el 2026-09-28.
      Asignar el camión de T6 a un operador de prueba, sincronizar el teléfono con el
      APK del 2026-09-25 sin reinstalar, y abrir el preoperacional del camión.
      Hecho cuando: el teléfono muestra el camión entre sus equipos y, al abrir el
      preoperacional, la pantalla «Este equipo aún no tiene formato», sin iniciar ningún
      registro.

- [x] T8. Validación final: recorrido RF por RF de la spec y demo manual. (Todos)
      Hecho cuando: cada uno de los 26 RF tiene su comprobación con resultado, los tres
      comandos están en verde y la spec queda marcada como Cumplida. El despliegue
      (sembrar producción, desplegar la imagen e iniciar sesión en el VPS) se hace después,
      siguiendo `docs/despliegue.md`.

## Notas de ejecución

- **T1** (2026-09-28): el comentario del porqué va junto a las entradas nuevas del
  catálogo, igual que el bloque de la spec 003, y no en la cabecera del archivo. El guion
  se corta en el primer fallo, así que antes de implementar solo se vio caer la lista de
  «sin formato». Las otras tres pruebas nuevas se vieron pasar después.
- **T2** (2026-09-28): sin sorpresas. La excavadora de oruga no tiene entrada en la
  tabla de posiciones; `posicionesDe` ya devolvía una lista vacía para un tipo sin
  entrada, así que no hubo que tocar la función.
- **T3** (2026-09-28): la regla quedó en `src/shared/rules/cumplimiento.ts`, sin imports.
  Recibe `conFormato` ya resuelto; quien lo resuelve con el catálogo es el endpoint (T4).
  Todavía no la usa nadie: hasta T4 el inicio sigue contando como antes.
- **T4** (2026-09-28): los tres comandos en verde. **La comprobación en pantalla queda
  para T6**, por decisión de Diego: el caso de la recicladora se arma junto con los tipos
  nuevos. `equipos` sigue siendo toda la flota («Equipos activos»); el denominador del
  pie es `equiposInspeccionables`.
- **T5** (2026-09-28): el «Hecho cuando» decía ejecutar `migrar-produccion.ts` de verdad.
  **No se ejecutó contra producción**: se comprobó lo mismo sin tocarla. Con una cadena
  inventada, `apuntarAProduccion` cambia solo la base (`neondb` → `preoperaocc`) y
  conserva el usuario y `sslmode`. `sembrar-produccion.ts`, lanzado contra un host
  `.invalid`, imprime «Sembrando contra: … / preoperaocc» **antes** de la primera
  consulta; eso prueba que el `import()` diferido lee la cadena ya reescrita.
  `migrar-produccion.ts` usa el mismo módulo y el mismo orden. La primera ejecución real
  será en el despliegue.
- **T6** (2026-09-28): demo en Chrome contra desarrollo, con la sesión de gerencia. Se
  sembró desarrollo: 13 tipos y 5 plantillas. Se registraron dos equipos de prueba en la
  obra «Pruebas spec 018»: `PRUEBA-CAM-01` (Camión, Ford, 120000 km) y `PRUEBA-EXO-01`
  (Excavadora de oruga, 3500 h). Siguen ahí; se pueden dar de baja cuando no hagan falta.
  1. El selector trae los 13 tipos, con los seis nuevos. ✓
  2. Camión: pide solo odómetro, muestra el aviso de formato pendiente y en el listado sale
     «Sin formato». ✓
  3. Llantas del camión: 7 posiciones (2 delanteras, 4 del eje 2 y repuesto). No se
     montó ninguna. ✓
  4. Excavadora de oruga: pide solo horómetro; la sección de llantas no ofrece posiciones
     ni formulario («Este equipo todavía no tiene llantas registradas»). ✓
  5. Inicio (**cierra la comprobación pendiente de T4**): la API responde `equipos: 5`,
     `equiposInspeccionables: 3` y `sinInspeccionar: 3`; la pantalla muestra «0 de 3
     equipos inspeccionados» y «Sin inspeccionar: 3». El camión y la oruga no cuentan. ✓
  6. Parte de hoy en la obra de pruebas: el selector de maquinaria ofrece los dos equipos
     nuevos; el camión pide «Odómetro inicial/final (km)»; con 120000 → 120085 se guarda,
     marca «85 km recorridos», y el resumen pasa a `kilometros: 85`. ✓
  - **No se cerró el parte.** Cerrar exige llenar las siete secciones, foto del día
    incluida, y nada de eso depende del tipo de equipo. El resumen ya suma los partes
    abiertos no anulados, así que RF-26 queda comprobado sin cerrar. El parte de prueba
    quedó **abierto** en esa obra.
  - RF-23 en pantalla (una obra solo con equipos sin formato) no se vio: gerencia ve
    todas las obras juntas. Queda cubierto por el caso de `verificar-reglas.ts`; si se
    quiere ver, hace falta un residente asignado solo a «Pruebas spec 018».
- **T7** (2026-09-28): **aplazada hasta después del despliegue**, por decisión de Diego.
  El APK del 2026-09-25 se compiló con
  `EXPO_PUBLIC_API_URL=https://occ.licitapp-elementaling.cloud` (`eas.json`), así que habla
  con producción y no ve nada de desarrollo. Tampoco sirve un build de desarrollo: RF-18
  pide justamente el APK ya instalado, sin reinstalar. Orden acordado: T8 con T7
  pendiente → sembrar producción (`db:sembrar:produccion`) y desplegar → T7 en
  producción, con un equipo de prueba en una obra de prueba, asignado a un operador de
  prueba. Mientras tanto, RF-14 y RF-18 se sostienen por el código:
  - `abrirBorrador` devuelve `sin_formato` cuando no hay plantilla;
  - el pull hace upsert de `tiposVehiculo` antes que los vehículos.
- **T8** (2026-09-28): validación en `specs/VALIDACION.md` («Validación — Spec 019»). Hay
  23 RF en verde y 3 pendientes de la demo del teléfono: RF-12, RF-14 y RF-18. **No se
  marca** hasta cerrar T7 en producción; la spec queda **En curso**.
- **T7** (2026-09-28, en producción, antes de desplegar la spec 020): Diego registró
  `PRUEBA-CAM-01` (Camión, Ford) en la obra de su operador de prueba y se lo asignó sin
  quitarle la volqueta. En el teléfono, con el APK del 2026-09-25 sin reinstalar, salió y
  volvió a entrar con el PIN:
  - aparecieron los dos equipos;
  - al abrir el preoperacional del camión salió «Este equipo aún no tiene formato», sin
    iniciar registro;
  - la volqueta cargó su formato normal.
  Diego confirmó: «todo salió como dijiste». Cierra RF-12, RF-14 y RF-18.
  `PRUEBA-CAM-01` queda en producción para la T6 de la spec 020.
- **T8** (2026-09-28): 26/26 RF en verde. La spec queda **Cumplida**.

