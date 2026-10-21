# Tareas — Spec 031

Tareas de menos de 30 minutos, ordenadas por dependencia. Cada una lleva los RF que
cubre y una línea `Hecho cuando:` que se pueda comprobar sin interpretar.

**Se implementa una tarea cada vez** (`/sdd:implementar T1`), y al terminarla se para.
Ninguna tarea se marca sin `npm run verificar`, `npm run typecheck` y `npm run lint`
en verde, mirando el código de salida.

### Reglas

- [x] T1. `contrato.ts`: tipos de contrato, impuestos sugeridos, bases, `plazoEnDias`,
      `porcentajeValido`, `faltasParaAprobarContrato`, `diferenciaConPresupuesto`. (RF-11 a RF-22)
      Hecho cuando el verificador cubre:
      - plazo de 1-oct a 31-oct = 30;
      - fin antes de inicio;
      - integrantes que suman 99 y 100;
      - porcentaje −1, 0, 100, 101;
      - las faltas de un contrato vacío;
      - la diferencia con el presupuesto;
      - y los tres comandos en verde.
- [x] T2. `polizas.ts`: amparos, `estadoDePoliza`, `polizasConAviso`. (RF-23 a RF-26)
      Hecho cuando el verificador cubre:
      - vigente;
      - por vencer a 30 días y vigente a 31;
      - vencida;
      - reemplazada y anulada sin aviso;
      - y los tres comandos en verde.
- [x] T3. `presupuesto.ts`: tipos de la estructura, `totalDelItem`, `resumenDelPresupuesto`,
      `faltasParaAprobarPresupuesto`, `copiarParaNuevaVersion`, `itemsQueDesaparecen`,
      `unidadDelPresupuesto`, y la unidad `km` en `UNIDADES_DE_ACTIVIDAD`. (RF-31 a RF-40, RF-47 a RF-57, RF-69)
      Hecho cuando el verificador cubre:
      - redondeo al peso;
      - resumen con y sin grupos;
      - las faltas;
      - copia con los mismos ids;
      - un ítem que desaparece con cantidad reportada y uno sin ella;
      - «un»→und, «m3-Km»→m3_km, «Km»→km y una desconocida;
      - y los tres comandos en verde.
- [x] T4. `formulario-presupuesto.ts`: `leerFormulario` sobre una matriz. (RF-41 a RF-46)
      Hecho cuando el verificador:
      - lee `docs/preupuesto.xlsx` con `exceljs` y da 2 grupos, 14 capítulos, 76 ítems, 8 rubros, AIU 0.2623/0.01/0.05 y $54.441.800.920 sin diferencia;
      - con una matriz sin encabezados da el error explicado;
      - con un ítem alterado señala la diferencia;
      - y los tres comandos en verde.
- [x] T5. `actividades-de-obra.ts`: catálogo fijo o del presupuesto, etiqueta, búsqueda sin
      tildes, `capitulosDelItem`, `reconocerCapitulo`. (RF-58, RF-59, RF-64 a RF-66)
      Hecho cuando el verificador cubre:
      - 4.1.8 en dos capítulos;
      - «alcantarilla ye yondo» → el de Ye–Yondo;
      - sin pista → ninguno;
      - búsqueda «excavacion» sin tilde;
      - y los tres comandos en verde.

### Datos y permisos

- [x] T6. Módulo `contrato` en permisos (aprobar solo admin), grupo «Cliente» en el menú, enlace,
      ícono y pantalla provisional. (RF-1 a RF-4)
      Hecho cuando:
      - el verificador cubre `alcanza` de los 6 roles, y `aprobar` solo para gerencia;
      - en Chrome (dev) gerencia ve «Cliente › Contrato y Presupuesto»;
      - los tres comandos en verde.
- [x] T7. Esquema y migración 0028: tablas `contratos`, `contrato_eventos`, `contrato_polizas`,
      `contrato_documentos` y `presupuestos`, enums, `contrato` en `dueno_media`, y los índices
      únicos parciales. Se aplica en neondb (dev). (RF-7, RF-23, RF-27, RF-31, RF-56, RF-57)
      Hecho cuando:
      - la migración es solo aditiva;
      - aplicada en neondb;
      - en transacciones deshechas, un segundo borrador de la misma obra y una póliza anulada sin motivo fallan;
      - los tres comandos en verde.

### Servidor

- [x] T8. Contrato: leer, guardar con versión, aprobar y volver a borrador, con eventos; rutas
      `contrato`, `…/aprobar`, `…/borrador`. (RF-6 a RF-22)
      Hecho cuando, con sesiones temporales en dev:
      - guardar → 200;
      - guardar con versión vieja → 409;
      - aprobar como residente → 403;
      - aprobar con faltas → 400 con la lista;
      - aprobar bien → 200 y editar → 409;
      - volver a borrador sin motivo → 400 y con motivo → 200, con 3 eventos;
      - los tres comandos en verde.
- [x] T9. Pólizas y documentos: crear, anular, reemplazar, subir archivo (PDF/imagen ≤ 20 MB)
      y el alcance de `media/[id]` para el dueño `contrato`. (RF-23 a RF-30)
      Hecho cuando, en dev:
      - una póliza con PDF;
      - anular sin motivo → 400;
      - reemplazar → la vieja `reemplazada`;
      - un .docx → 415;
      - 21 MB → 413;
      - la residente de otra obra no abre el archivo (404);
      - todo lo de prueba se borra al terminar.
- [x] T10. Presupuestos: lista, uno con resumen, en blanco, guardar con versión, descartar.
      (RF-31 a RF-40, RF-47, RF-48, RF-51, RF-56, RF-57)
      Hecho cuando, en dev:
      - crear en blanco → v1 borrador;
      - otro en blanco → 409;
      - guardar con versión vieja → 409;
      - el servidor recalcula los totales que llegan mal;
      - descartar sin motivo → 400;
      - los tres comandos en verde.
- [x] T11. Importar el Excel: vista previa y `?confirmar=1`. (RF-41 a RF-46)
      Hecho cuando, en dev, `docs/preupuesto.xlsx`:
      - da la vista previa con los conteos y $54.441.800.920;
      - al confirmarlo crea el borrador;
      - un Excel cualquiera → 422 con la explicación;
      - el doble confirmar no crea dos.
- [x] T12. Aprobar y nueva versión, con el aviso de ítems que desaparecen; exportar a Excel.
      (RF-49 a RF-55, RF-73)
      Hecho cuando, en dev:
      - aprobar como residente → 403;
      - aprobar con faltas → 400;
      - aprobar → vigente;
      - nueva versión → borrador copia;
      - quitar un ítem con cantidad reportada → 409 con `desaparecen`, y con `confirmar` → v2 vigente y v1 reemplazada;
      - el `.xlsx` abre con `exceljs`.
- [x] T13. La bitácora con el catálogo de la obra: `catalogoDeLaObra`, capítulo en
      `ActividadDelParte`, `construirActividadDelParte(pedida, catalogo)` y la ruta del parte.
      (RF-58 a RF-63)
      Hecho cuando el verificador cubre los casos del plan y, en dev:
      - con la obra de pruebas sin vigente, una actividad del catálogo fijo se guarda;
      - con vigente, sin capítulo → 400 y con capítulo → guardada con capítulo y grupo congelados;
      - una actividad vieja intacta;
      - los tres comandos en verde.
- [x] T14. Aviso de pólizas en el resumen del Inicio. (RF-25)
      Hecho cuando, en dev, una póliza que vence en 20 días aparece en el resumen de gerencia
      y en el de la residente de esa obra, y no en otra.

### Panel

- [x] T15. Pestaña Contrato, parte 1: contratante, contratista o consorcio con integrantes,
      contrato y condiciones, con plazo calculado, diferencia con el presupuesto, aprobar y volver a
      borrador. (RF-5 a RF-19, RF-70 a RF-72)
      Hecho cuando, en Chrome (dev):
      - se registra y aprueba un contrato con un consorcio de 2 integrantes;
      - la suma 99 % no deja aprobar;
      - el residente no ve «Aprobar»;
      - a 390 px es una columna.
- [x] T16. Pestaña Contrato, parte 2: impuestos con sugeridos, pólizas con estado y
      documentos (subir, abrir, anular). (RF-20 a RF-30)
      Hecho cuando, en Chrome (dev): Retefuente sugerida, una póliza que vence en 20 días sale
      «Por vencer», un PDF se sube y se abre, y uno anulado se ve marcado.
- [x] T17. Pestaña Presupuesto, parte 1: lista de versiones, importar con vista previa,
      crear en blanco, ver uno con su resumen (grupos, capítulos, ítems, rubros, AIU).
      (RF-31 a RF-46, RF-55, RF-70, RF-71)
      Hecho cuando, en Chrome (dev): importar `docs/preupuesto.xlsx` muestra 2 / 14 / 76 / 8 y
      $54.441.800.920, y al crearlo se ve con sus subtotales.
- [x] T18. Pestaña Presupuesto, parte 2: editor del borrador (agregar, cambiar, mover y quitar)
      y choque de versión. (RF-47, RF-51)
      Hecho cuando, en Chrome (dev):
      - cambiar una cantidad recalcula el total y el valor;
      - mover un ítem de capítulo funciona;
      - con dos pestañas, la segunda en guardar ve «Otra persona cambió…».
- [x] T19. Pestaña Presupuesto, parte 3: aprobar (con el aviso de RF-54), nueva versión,
      descartar, versiones anteriores en solo lectura y «Descargar Excel». (RF-49 a RF-57, RF-73)
      Hecho cuando, en Chrome (dev): v1 aprobada, v2 con un ítem quitado muestra el aviso,
      confirmada deja v1 «Reemplazado» y abre en solo lectura, y el Excel se descarga.
- [x] T20. La bitácora: selector de actividad con ítem, capítulo y grupo, búsqueda, sin precios.
      (RF-58 a RF-63)
      Hecho cuando, en Chrome (dev): con el presupuesto de prueba vigente se elige «4.1.8 ·
      Construcción de alcantarillas · Vía La Ye–Yondo», escribir «excavacion» lo encuentra, no
      se ve ningún $, y una obra sin vigente sigue con el catálogo fijo.
- [x] T21. Inicio con el aviso de pólizas y Reportes → Actividades por capítulo con contratado
      y %. (RF-25, RF-68)
      Hecho cuando, en Chrome (dev), el Inicio muestra la póliza por vencer y Reportes muestra la
      actividad de la T20 en su capítulo con su % de lo contratado.

### WhatsApp

- [x] T22. Reglas y servidor: `capitulo` en `propuestaDeIa`, `resolverPropuesta` y
      `faltasDelReporte` con el catálogo de la obra, y los catálogos del procesamiento. (RF-64 a RF-67)
      Hecho cuando el verificador cubre los casos del plan y, en dev, con el POST de integración:
      - un ítem de un solo capítulo se guarda con su capítulo;
      - uno ambiguo va a «No se pudo guardar» con los posibles;
      - uno fuera del presupuesto va con su motivo.
- [x] T23. «No se pudo guardar»: elegir el capítulo de una actividad. (RF-66)
      Hecho cuando, en Chrome (dev), la excepción ambigua de la T22 se completa eligiendo el capítulo.
- [x] T24. n8n: `capitulo` en `items_pago` (texto, `""`) e instrucción en `generar_workflow_clasificar.py`;
      json regenerado; probado en el PC con un reporte que diga «alcantarilla vía Ye-Yondo». (RF-64)
      Hecho cuando la IA devuelve el capítulo escrito y la salida pasa por `propuestaDeIa` y
      `resolverPropuesta` con el presupuesto de prueba.

### Cierre

- [x] T25. Despliegue en producción:
      - migración 0028;
      - imagen con respaldo;
      - clasificador publicado;
      - el usuario importa el presupuesto real de CONSORCIO MAGDALENA (o se importa con su permiso) y decide cuándo aprobarlo.

      Con permiso del usuario. Si el modo automático lo bloquea, él corre los comandos con `!`.
      Hecho cuando producción responde con la imagen nueva, las tablas existen y el módulo abre.
- [ ] T26. Validación final: `validacion.md` RF por RF y spec Cumplida. (Todos)
      Hecho cuando cada RF tiene su comprobación con resultado, los tres comandos están en verde
      y la spec queda marcada como Cumplida.

## Notas de ejecución
- T1 (2026-10-20): `src/shared/rules/contrato.ts`.
  - Lo que trae:
    - los 13 tipos en 3 grupos;
    - `BASES_DE_IMPUESTO` con `iva`;
    - `IMPUESTOS_SUGERIDOS`: Retefuente 2 % sobre el corte, ReteIVA 15 % sobre el IVA, y ReteICA y estampillas sin porcentaje;
    - `plazoEnDias`;
    - `porcentajeValido`;
    - `sumaDeParticipaciones`;
    - `faltasParaGuardarContrato` y `faltasParaAprobarContrato`;
    - `diferenciaConPresupuesto`.
  - Las faltas van en **dos listas**, porque un borrador se guarda a medias:
    - para guardar solo se rechaza lo imposible (fechas al revés, porcentajes fuera de 0–100, valor negativo);
    - para aprobar se exige además contratante, tipo, número, fechas y valor;
    - en un consorcio, también su nombre, al menos 2 integrantes con nombre, que sumen 100 % y que cada impuesto tenga porcentaje.
  - Nuevo `src/shared/rules/pesos.ts` con `enPesos` («$ 54.441.800.920», RF-70). Va escrito a mano y no con `Intl`, para que se lea igual en todas partes.
  - El plazo es fin − inicio (1 al 31-oct = 30 días).
  - 4 casos «031/», 517 verificaciones, los tres comandos en verde.
- T2 (2026-10-20): `src/shared/rules/polizas.ts`.
  - Lo que trae:
    - `AMPAROS` (6);
    - los estados del registro: `activa`, `reemplazada`, `anulada`;
    - `vigenciaDePoliza` (en el plan, `estadoDePoliza`; se renombró para no confundirla con el estado del registro);
    - `polizasConAviso`.
  - La vigencia usa `plazoEnDias`:
    - vencida si `hasta` es anterior a hoy;
    - por vencer de 0 a 30 días; el día del fin dice «Vence hoy», porque todavía cubre;
    - vigente desde 31.
  - Solo avisan las activas, ordenadas de la que vence antes a la que vence después.
  - 2 casos «031/», 519 verificaciones, los tres comandos en verde.
- T3 (2026-10-20): `src/shared/rules/presupuesto.ts`.
  - Tipos de la estructura: grupos → capítulos → ítems, rubros y AIU en fracciones.
  - Funciones:
    - `normalizarEstructura`: el servidor recalcula los totales y redondea las cantidades a 3 decimales;
    - `totalDelItem`;
    - `resumenDelPresupuesto`, con subtotales por capítulo y grupo, rubros por grupo, obras, valor y el AIU en %;
    - `faltasParaAprobarPresupuesto`: cantidad o valor en 0 cuentan como faltantes;
    - `copiarParaNuevaVersion`, con los mismos ids;
    - `claveDeItem`;
    - `itemsQueDesaparecen`;
    - `unidadDelPresupuesto`.
  - **Cambio respecto del plan: no se agregó `km`** a `UNIDADES_DE_ACTIVIDAD`. En `docs/preupuesto.xlsx` los ítems solo usan m3, m2, m, kg, Und y m3-Km/m3-km. «Km» y «estimado» aparecen solo en los rubros, que no van a la bitácora y guardan su unidad como texto libre. Una unidad de ítem no reconocida queda `null`, con su texto, y no deja aprobar.
  - 5 casos «031/», 524 verificaciones, los tres comandos en verde.
- T4 (2026-10-20): `src/shared/rules/formulario-presupuesto.ts` (`leerFormulario`, pura) y
  `src/features/presupuestos/servidor/leer-excel.ts` (`hojasDelLibro`: libro → matrices con `exceljs`).
  `leer-excel.ts` se adelantó a esta tarea porque la prueba debe leer el Excel real con el mismo lector que usará el servidor.
  - La forma real del formulario, vista fila por fila, afinó lo que suponía el plan:
    - Los títulos están unas veces en «Nº» (fila 13) y otras en «DESCRIPCIÓN» (las demás), con «Entregable N und» al lado, que se ignora.
    - Grupo o capítulo se decide por lo que sigue: otro título → grupo; un ítem → capítulo.
    - Los capítulos no traen código: se numeran 01, 02… dentro de cada grupo.
    - En los rubros, un título que coincide con una vía los pone en ese grupo, y una fila vacía los devuelve a todo el contrato. Así, primas y actualización de precios quedan sin grupo.
    - Las especificaciones juntan la general y la particular y quitan «N.A».
    - El AIU se lee de «A=», «I=» y «U=».
  - Los encabezados se buscan por su texto, no por su posición.
  - Un título sin ítems no queda en el presupuesto.
  - 3 pruebas asíncronas «031/» en `verificarFormulario`. Con el Excel real dan:
    - 2 / 14 / 76 / 8;
    - AIU 0.2623 / 0.01 / 0.05;
    - $54.441.800.920, que cuadra y sin diferencias;
    - los subtotales de capítulo iguales a los del Excel;
    - 4.1.8 en 4 capítulos.
  - Más los errores explicados y un total que no cuadra.
  - 527 verificaciones, los tres comandos en verde.
- T5 (2026-10-20): `src/shared/rules/actividades-de-obra.ts`.
  - Lo que trae:
    - `catalogoFijo` (los 31 de hoy, clave = ítem);
    - `catalogoDelPresupuesto` (clave = `claveDeItem(capítulo, ítem)`; el grupo vacío queda nulo; un ítem sin unidad no se ofrece);
    - `opcionDeActividad` («4.1.8 · CONSTRUCCIÓN DE ALCANTARILLAS · VIA LA YE-YONDO», con la descripción como detalle y sin precios);
    - `buscarActividad`, con el `filtrarOpciones` de siempre;
    - `actividadDelCatalogo`;
    - `capitulosDelItem`;
    - `reconocerCapitulo`.
  - `reconocerCapitulo` gana por palabras en común con el capítulo y el grupo:
    - sin tildes;
    - «alcantarilla» casa con «alcantarillas» (prefijo de 4 letras o más);
    - sin palabras vacías.
    - Si nada casa o hay empate, da `null`: «cuneta» sola está en las dos vías.
  - La búsqueda es la de todos los selectores del panel: el texto entero como subcadena. «cuneta yondo» no encuentra nada; «cuneta» sí.
  - 3 casos «031/», 530 verificaciones, los tres comandos en verde. **Las reglas de la 031 quedan completas (T1–T5).**
- T6 (2026-10-20): módulo `contrato` en `permisos.ts`.
  - `MODULOS` (al final), `TABLA`, `NOMBRE_DE_MODULO` y el texto de «aprobar».
  - admin: ver, listar, escribir y aprobar; supervisor: ver, listar y escribir; el resto, nada.
  - Grupo «Cliente» en `menu.ts`, entre «Módulos de obra» y «Administración».
  - Enlace `/panel/contrato`, ícono de una hoja con firma y pantalla provisional (`src/features/contratos/pantalla-contrato.tsx`).
  - Pruebas ajustadas:
    - los módulos del residente (dos);
    - los grupos del menú de gerencia y residente;
    - «aprobar solo existe en…», que suma `contrato`.
  - Prueba nueva «031/RF-1 a RF-3».
  - 531 verificaciones, los tres comandos en verde. Las rutas tipadas se regeneraron con el servidor de desarrollo.
  - En Chrome (dev, sesión temporal de Diego, borrada al terminar): «CLIENTE › Contrato y Presupuesto» resaltado, título de la pestaña «Contrato y Presupuesto · Control de Obra OCC».
  - Dev server levantado en :8081 (`npx expo start --web --port 8081`).
- T7 (2026-10-20): migración `0028_sturdy_pepper_potts.sql`, solo aditiva, aplicada en neondb (dev); producción en la T25.
  - Tipos nuevos: `estado_contrato`, `estado_presupuesto`, `estado_poliza_registro`, `accion_contrato` y `origen_presupuesto`.
  - Valor nuevo `contrato` en `dueno_media`.
  - Tablas:
    - `contratos` (única por obra);
    - `contrato_eventos`;
    - `contrato_polizas`;
    - `contrato_documentos`;
    - `presupuestos`, con un vigente y un borrador por obra mediante índices parciales.
  - `contratos` y `presupuestos` van en `TABLAS_CON_RELOJ`.
  - Restricciones:
    - porcentajes entre 0 y 100;
    - fechas en orden;
    - aprobado ⇒ `aprobado_en`;
    - volver a borrador ⇒ motivo;
    - póliza anulada ⇔ `anulada_en` y motivo;
    - póliza reemplazada ⇔ `reemplazada_por`;
    - descartado ⇔ fecha y motivo.
  - `media/[id]`: el dueño `contrato` se trata por ahora como los documentos (solo gerencia); su alcance por obra llega en la T9.
  - Probado en dev con 14 casos en transacciones deshechas (script en el scratchpad, `t7_restricciones.cjs`): los 9 indebidos se rechazan con su restricción, los 5 válidos pasan y no quedó ninguna fila.
  - 531 verificaciones, los tres comandos en verde.
- T8 (2026-10-20): servidor del contrato.
  - `src/features/contratos/servidor/contrato.ts`:
    - `obraDelContrato`: la gerencia elige la obra; el residente, la suya; otra obra → 404;
    - `leerContrato`: con plazo, valor del presupuesto vigente, diferencia, faltas y los últimos 50 eventos;
    - `guardarContrato`: la versión 0 crea con `on conflict do nothing`;
    - `aprobarContrato`;
    - `contratoABorrador`.
  - La versión se compara en la misma sentencia que escribe (`where version = ?`). El evento se anota después, solo si el cambio entró.
  - Las faltas responden 400 con `{ error, faltas }`.
  - Rutas `contrato+api.ts` (GET y PUT), `contrato/aprobar+api.ts` y `contrato/borrador+api.ts`; estas dos con el permiso `aprobar`, solo gerencia.
  - Zod en `contratos.ts`: `contratoEditado`, `aprobacionDeContrato`, `contratoABorrador` y el tipo `ContratoDeObra`.
  - Probado contra el dev server con sesiones temporales de Diego y Natalia: 18/18 (script `t8_contrato.cjs` en el scratchpad). Contrato, eventos y sesiones borrados al terminar.
  - 531 verificaciones, los tres comandos en verde.
- T9 (2026-10-20): pólizas, documentos y archivos del contrato.
  - **Cambio respecto del plan:** una sola ruta de subida, `POST contrato/archivos?obraId=`, con los bytes y su `Content-Type`, que responde `{ mediaId }`. La póliza (opcional) y el documento (obligatorio) lo citan. El servidor exige que el archivo sea del mismo contrato y que no lo cite otro registro.
  - Reglas en `contrato.ts`: `CLASES_DE_DOCUMENTO`, `MIMES_DEL_CONTRATO`, `rechazoDeArchivo` (415, 413, 422). Caso «031/RF-30».
  - Servidor en `contratos/servidor/polizas-y-documentos.ts`:
    - `subirArchivo` (primero R2, después la fila de `media`);
    - `crearPoliza`, `anularPoliza` y `reemplazarPoliza` (insert y update en un `batch`);
    - `crearDocumento` y `anularDocumento`;
    - `polizasDelContrato`, con la vigencia de hoy; primero las activas, de la que vence antes a la que vence después;
    - `documentosDelContrato`, con quién lo subió y su anulación.
  - `GET contrato` trae `polizas` y `documentos`.
  - `media/[id]`: el dueño `contrato` toma la obra de su contrato.
  - Probado contra el dev server, 18/18 (copia del script en el scratchpad, `t9_polizas.ts`):
    - sin contrato → 409;
    - .docx → 415;
    - 21 MB → 413;
    - archivo de otra obra → 404;
    - archivo ya citado → 409;
    - «Vence en 20 días»;
    - reemplazar y anular;
    - documento anulado que sigue en la lista;
    - la residente abre lo de su obra y no lo de otra; la gerencia sí.
  - **R2 es el mismo de producción:** los 3 PDF de prueba (≈250 bytes) se borraron con un DELETE firmado, y las filas también. Quedaron 0.
  - 532 verificaciones, los tres comandos en verde.
- T10 (2026-10-20): servidor de presupuestos.
  - Regla nueva `faltasParaGuardarPresupuesto` en `presupuesto.ts`: ids repetidos, valores negativos, AIU fuera de 0–1 y rubro de un grupo que ya no está. Caso «031/RF-47».
  - Zod en `contratos.ts`: `estructuraDePresupuestoZod`, `presupuestoNuevo`, `presupuestoEditado` y `descarteDePresupuesto`; tipos `PresupuestoFila` y `PresupuestoDetalle`.
  - `presupuestos/servidor/presupuestos.ts`:
    - `listarPresupuestos`;
    - `presupuestoAlAlcance` (404 si la obra no le toca);
    - `detalleDe`, con resumen y faltas;
    - `siguienteVersion`;
    - `crearBorrador`, que usarán también la importación (T11) y la nueva versión (T12): 409 explicado si ya hay borrador;
    - `crearEnBlanco`;
    - `guardarPresupuesto`: normaliza y recalcula en el servidor, con `where version = ?`;
    - `descartarPresupuesto`.
  - Rutas `presupuestos+api.ts` (GET y POST), `presupuestos/[id]+api.ts` (GET y PUT) y `presupuestos/[id]/descartar+api.ts`.
  - Probado contra el dev server, 14/14 (`t10_presupuestos.cjs` en el scratchpad):
    - v1 en blanco;
    - segundo borrador → 409;
    - el total que llegó en 999 sale en 111.383.150, y 42,12345 → 42,123;
    - versión vieja → 409;
    - ids repetidos → 400;
    - resumen;
    - la residente no ve ni guarda el de otra obra;
    - descartar sin motivo, con motivo y otra vez;
    - editar el descartado → 409;
    - después, v2.
  - Todo lo de prueba se borró.
  - 533 verificaciones, los tres comandos en verde.
- T11 (2026-10-20): `presupuestos/servidor/importar.ts` y la ruta `presupuestos/importar+api.ts`.
  - `vistaPrevia` y `importarPresupuesto`:
    - el archivo se reconoce por su firma ZIP («PK»), no por el tipo que diga el navegador;
    - el límite es 20 MB;
    - un Excel dañado responde 422;
    - lo que no es el formulario responde 422 con el error de `leerFormulario`.
  - Al confirmar se vuelve a leer y se crea con `crearBorrador` (origen `excel`, `valorExcel`, `revisar` si no cuadra o hay diferencias).
  - **Doble clic:** el id es `xlsx-` + sha256 de obra, versión y huella del archivo. Si el borrador abierto tiene el id de este archivo en su versión, se devuelve con 200 sin crear otro; si es otro borrador, el 409 de siempre.
  - Nuevo `borradorDeLaObra` en `presupuestos.ts`.
  - Probado contra el dev server con `docs/preupuesto.xlsx`, 10/10 (`t11_importar.cjs` en el scratchpad):
    - vista previa 2/14/76/8 y $54.441.800.920 que cuadra, en 2,5 s la primera vez, sin escribir;
    - un texto → 422;
    - un Excel sin formato → 422 «fila de encabezados»;
    - confirmar → 201 v1 sin revisar, con el subtotal de Estabilización Ye-Yondo en $9.953.423.055;
    - doble clic → 200 el mismo;
    - otro archivo con el borrador abierto → 409;
    - un ítem alterado se señala.
  - Todo lo de prueba se borró.
  - 533 verificaciones, los tres comandos en verde.
- T12 (2026-10-20): `presupuestos/servidor/versiones.ts` y `presupuestos/servidor/excel.ts`.
  - `versiones.ts`:
    - `cantidadesReportadas` suma por ítem + capítulo las actividades con capítulo de las bitácoras no anuladas;
    - `aprobarPresupuesto` responde 400 con las faltas, y 409 con `desaparecen` si no se confirmó;
    - aprobar va en un `batch`: el vigente pasa a reemplazado solo si el borrador sigue intacto (`exists … version = ?`), y después el borrador pasa a vigente. Si alguien lo cambió en medio, no entra ninguno y la obra conserva su vigente;
    - `nuevaVersion` copia el vigente con los mismos ids, origen `copia` y su nota.
  - `excel.ts` sigue la forma del formulario: grupo, capítulo, ítems, subtotales, «SUBTOTAL OBRAS», rubros con su vía, «VALOR DEL PRESUPUESTO» y el AIU en %.
  - Rutas `presupuestos/[id]/aprobar+api.ts` (permiso `aprobar`), `[id]/nueva-version+api.ts` y `[id]/exportar+api.ts`.
  - Se adelantaron a esta tarea los campos opcionales `capituloId`, `capitulo` y `grupo` de `ActividadDelParte` (solo el tipo); la bitácora empieza a llenarlos en la T13.
  - Probado contra el dev server, 15/15 (`t12_versiones.cjs` en el scratchpad), con una bitácora de prueba del 2025-01-15 que reporta 12 m³ del 2.8:
    - aprobar uno sin ítems → 400;
    - residente → 403;
    - versión vieja → 409;
    - aprobar → vigente, y otra vez → 409;
    - nueva versión sin motivo → 400;
    - v3 copia con los mismos ids y $54.441.800.920;
    - segundo borrador → 409;
    - quitar el 2.8 → 409 «reportado 12», y confirmado → v3 vigente con v2 reemplazado;
    - nueva versión desde el reemplazado → 409;
    - v2 se abre en solo lectura;
    - el Excel de la v2: `presupuesto-PRUEBA-018-v2.xlsx`, 76 ítems, $54.441.800.920 como número y con tildes.
  - Todo lo de prueba se borró.
  - 533 verificaciones, los tres comandos en verde.
- T13 (2026-10-20): la bitácora con el catálogo de la obra.
  - `construirActividadDelParte(pedida, catalogo = catalogoFijo())`. Con presupuesto busca ítem + capítulo y congela `capituloId`, `capitulo` y `grupo`; con el fijo, la forma de siempre. Las pruebas viejas siguen sin cambios.
  - `ActividadPedida.capituloId` y su zod en la actividad del parte.
  - `actividadesDelParte(pedidas, guardadas, catalogo)`:
    - mensajes claros: «Elija el capítulo de la actividad 4.1.8.» y «…no está en ese capítulo del presupuesto vigente…»;
    - una guardada **sin capítulo** que vuelve con el mismo ítem y sin capítulo se lee con el catálogo fijo (o se deja como estaba). Así una bitácora abierta no se rompe cuando la obra aprueba su primer presupuesto (RF-62).
  - `presupuestos/servidor/catalogo.ts` (`catalogoDeLaObra`): lo usan la ruta `PATCH partes/[id]` y `aprobacion.ts` de WhatsApp.
  - **Hasta la T20/T22:** en una obra con presupuesto vigente, la pantalla de la bitácora (que todavía no manda capítulo) y lo que llega por WhatsApp (que todavía no lo reconoce) piden el capítulo. Solo afecta a dev mientras tanto, porque producción se despliega con todo en la T25.
  - Caso «031/RF-58 a RF-63» en el verificador.
  - Probado contra el dev server con una bitácora de prueba del 2025-01-16, 6/6 (`t13_bitacora.cjs` en el scratchpad):
    - fijo sin capítulo;
    - con el Excel vigente, nueva sin capítulo → 400;
    - con capítulo → «CONSTRUCCIÓN DE CUNETA · VIA LA YE-YONDO» congelados;
    - la vieja intacta;
    - el 2.8 en cuneta → 400.
  - Todo lo de prueba se borró.
  - 534 verificaciones, los tres comandos en verde.
- T14 (2026-10-20): `avisosDePolizas(sesion)` en `polizas-y-documentos.ts`.
  - Toma las pólizas activas de las obras que alcanza la sesión (`filtroDeObra`, sin obras dadas de baja) y las pasa por `polizasConAviso` con la fecha de hoy.
  - Solo para quien ve el módulo `contrato`; para los demás, lista vacía.
  - `GET resumen` responde `polizas`, y `ResumenFila` lleva el tipo.
  - Probado contra el dev server, 3/3 (`t14_inicio.cjs` en el scratchpad), con una por vencer y una vigente en la obra de pruebas y una vencida en otra:
    - gerencia ve «Venció hace 3 días» y «Vence en 20 días», en ese orden, sin la vigente;
    - la residente, solo la de su obra;
    - el almacenista de la obra, ninguna.
  - Todo lo de prueba se borró.
  - **El servidor de la 031 queda completo (T1–T14).**
  - 534 verificaciones, los tres comandos en verde.
- T15 (2026-10-20): pestaña Contrato, parte 1.
  - `src/features/contratos/pantalla-contrato.tsx`: obra (solo gerencia) y pestañas en la dirección; Presupuesto provisional hasta la T17.
  - `pestana-contrato.tsx`:
    - carga con `useListado`; el formulario es un hijo con llave por versión, así que tras guardar o aprobar arranca de lo último;
    - secciones Contratante, Contratista (consorcio con integrantes y «Suman N %») y Contrato y condiciones;
    - el plazo se calcula y el valor se lee en pesos;
    - aviso de diferencia con el presupuesto;
    - «Para aprobarlo falta» en vivo;
    - historial.
  - Solo lectura si está aprobado; el tipo se muestra como texto. «Aprobar» y «Volver a borrador» (este con motivo en una ventana) solo para la gerencia.
  - `api.contrato` en `cliente-api.ts`.
  - Ajustes que salieron de la prueba en Chrome:
    - sin doble marco: `Formulario` ya es la tarjeta;
    - el aviso de la respuesta va junto a los botones, no arriba;
    - cada botón dice lo suyo mientras espera («Guardando…», «Aprobando…»).
  - Probado en Chrome (dev) con sesiones temporales de Diego y Natalia:
    - contratante, consorcio con 60 % + 39 % y tipo «Precios unitarios» desde el buscador del selector;
    - del 1 al 31-oct, «30 días»; «$ 1.000.000»;
    - guardar; aprobar con 99 % → «No se puede aprobar todavía… suman 99 %»;
    - con 40 %, «Suman 100 %» → aprobado, en solo lectura con «Volver a borrador»;
    - con motivo vuelve a borrador y el motivo queda en el historial;
    - Natalia ve su obra sin selector y sin «Aprobar»;
    - a 390 px (iframe): ancho 390, 23 campos en una columna, ninguno fuera.
  - Contrato y sesiones de prueba borrados.
  - Las capturas de pantalla se colgaron un par de veces: se leyó la página con `get_page_text` y se hicieron clics por referencia.
  - 534 verificaciones, los tres comandos en verde.
- T16 (2026-10-20): pestaña Contrato, parte 2.
  - **Impuestos y retenciones** dentro del formulario del contrato, guardados con él:
    - el porcentaje se escribe como texto y se aceptan comas («0,7» → 0.7);
    - «Agregar los de uso común» suma solo los que faltan;
    - «Agregar otro»; la base se elige con un selector.
  - **Pólizas y documentos** en `src/features/contratos/polizas-y-documentos.tsx`, fuera del formulario: cada uno se guarda al momento, también con el contrato aprobado.
    - Tablas con estado y acciones.
    - Ventanas para registrar o reemplazar una póliza (con archivo opcional), subir un documento (archivo obligatorio) y anular con motivo.
    - El archivo se sube primero y lo cita después el registro; se revisa en el navegador con `rechazoDeArchivo` antes de subirlo.
    - «Abrir» abre `/api/panel/media/:id` en otra pestaña.
  - `api.contrato` suma `subirArchivo` (con la misma clave «Content-Type» que `pedir`, para reemplazarla y no sumarse), `crearPoliza`, `reemplazarPoliza`, `anularPoliza`, `crearDocumento` y `anularDocumento`.
  - Probado en Chrome (dev, sesión temporal de Diego). El diálogo de archivos de Windows no se puede manejar desde la extensión, así que se reemplazó en la página por un PDF diminuto que dispara el mismo `change`:
    - impuestos de uso común → Retefuente 2 % corte, ReteIVA 15 % IVA, ReteICA y Estampillas sin %; ReteICA 0,7 guardada, Estampillas quitada;
    - póliza de cumplimiento con PDF hasta el 09/11/2026 → «Por vencer · Vence en 20 días», y su archivo abre con 200 `application/pdf`;
    - acta de inicio subida y abierta; anulada con motivo → sigue en la lista, «Anulado» con el motivo y quién.
  - Limpieza: contrato, póliza, documento, 2 archivos borrados de R2 y la sesión. Quedan 0.
  - El sistema detuvo el dev server por falta de memoria del equipo al terminar la prueba; no se volvió a encender.
  - 534 verificaciones, los tres comandos en verde.
- T17 (2026-10-20): pestaña Presupuesto, parte 1 (`src/features/contratos/pestana-presupuesto.tsx`).
  - **Versiones:** tabla con versión, nombre y nota, estado (con «Revisar»), valor, fecha y «Ver». La que se mira va en la dirección (`presupuesto`); sin elegir, se abre el borrador y si no, el vigente.
  - «Importar Excel» y «Crear en blanco» se deshabilitan con un borrador abierto, con la nota.
  - **Importar:** ventana con «Elegir el Excel»:
    - vista previa con las cifras de vías, capítulos, ítems y rubros;
    - si el valor cuadra con el «VALOR TOTAL» o la diferencia;
    - la lista de ítems con total distinto;
    - el nombre;
    - «Crear el borrador».
  - **Detalle:**
    - cifras de valor, obras, rubros y AIU (incluido en los precios);
    - «Para aprobarlo falta»;
    - cada vía con su subtotal y sus capítulos, cada uno con sus ítems al desplegar «Ver ítems»;
    - rubros de cada vía y «Rubros de todo el contrato»;
    - marca «Revisar» si se importó con diferencias.
  - Común: `elegir-archivo.ts` (lo usan también pólizas y documentos); `api.presupuestos` (`listar`, `de`, `crearEnBlanco`, `vistaPrevia`, `importar`); tipo `VistaPreviaDelPresupuesto`.
  - Corregido para el residente, que no elige obra:
    - `obraDelContrato` trata el texto vacío como «no la pidió»;
    - la dirección de `importar` se arma con `URLSearchParams`.
  - Probado en Chrome (dev, sesión temporal de Diego), con el Excel real servido un momento desde `public/` en lugar del diálogo de archivos:
    - vista previa 2 / 14 / 76 / 8 y «$ 54.441.800.920 es el mismo VALOR TOTAL»;
    - creado v1 borrador, con importar y en blanco deshabilitados;
    - cifras $ 54.441.800.920 / $ 49.126.056.823 / $ 5.315.744.097 / 32,23 %;
    - subtotales de capítulo iguales al Excel e ítems de Alcantarillas;
    - rubros por vía y de todo el contrato;
    - «Crear en blanco» → v1 en $ 0;
    - a 390 px, ancho 390.
  - Limpieza: presupuestos, sesión y el Excel de `public/` borrados.
  - El dev server se reinició: el `node` anterior seguía vivo con ~2 GB.
  - 534 verificaciones, los tres comandos en verde.
- T18 (2026-10-20): editor del borrador (`src/features/contratos/editor-presupuesto.tsx`).
  - Edita una copia y la guarda entera con la versión que se leyó (`api.presupuestos.guardar`).
  - Cifras en vivo con `normalizarEstructura` y `resumenDelPresupuesto`.
  - Lo que se edita:
    - nombre, motivo de la versión y AIU en %;
    - vías: nombre, agregar, quitar vacía;
    - capítulos: código, nombre, mover a otra vía, agregar, quitar vacío; «Editar ítems» los despliega;
    - ítems: ítem, descripción, unidad, cantidad y valor unitario con el total al lado, mover a otro capítulo, quitar, agregar;
    - rubros: nombre, vía o todo el contrato, unidad, cantidad, unitario y valor; agregar y quitar.
  - `CampoNumero` guarda lo escrito a medias.
  - «Hay cambios sin guardar». No deja guardar con `faltasParaGuardarPresupuesto`.
  - Ante un 409, «…Lo que escribió aquí no se guardó.» y el botón «Volver a cargar».
  - En el detalle, «Editar el borrador» y «Borrador guardado.»; la lista de versiones se recarga.
  - Probado en Chrome (dev, sesión temporal de Diego, borrador PRUEBA-031-T18 importado por la API):
    - 2.8 de 42 a 50 → total $ 12.103.100 y valor $ 54.443.737.416 al momento;
    - 2.14.1 movido a Cuneta → Alcantarillas 10 ítems, $ 2.170.498.784;
    - con dos pestañas, A guarda y B recibe «Otra persona cambió el presupuesto…», y en la base queda solo lo de A.
  - Ajuste: «Nombre de la vía» más ancho (560), porque cortaba el nombre.
  - La extensión se desconectó una vez por falta de memoria del equipo (1,9 GB libres): se repitió la prueba con menos capturas.
  - 534 verificaciones, los tres comandos en verde.
- T19 (2026-10-20): acciones de una versión (`src/features/contratos/acciones-presupuesto.tsx`).
  - Borrador: Editar, Aprobar (solo gerencia; al residente se le dice que le corresponde a la gerencia) y Descartar con motivo.
  - Vigente: Nueva versión, con el motivo.
  - Todas: Descargar Excel.
  - Aprobar con 409 `desaparecen` abre una ventana con cada ítem, su capítulo, su vía y lo reportado, y «Aprobar igual». Con faltas, el aviso las lista.
  - Tras crear una versión, la pantalla pasa a mirarla.
  - `api.presupuestos` suma `aprobar`, `nuevaVersion`, `descartar` y `direccionDelExcel`.
  - Probado en Chrome (dev, sesión temporal de Diego, con una bitácora de prueba del 2025-01-17 que reporta 12 m³ del 2.8 en Alcantarillas de Remedios):
    - v1 aprobada → «La versión 1 quedó vigente»;
    - nueva versión «PRUEBA Otrosí 1» → v2 copia en borrador, que se abre sola;
    - quitado el 2.8 → 75 ítems, $ 54.431.634.316;
    - aprobar → ventana «quita un ítem que ya tiene cantidades… 2.8 · CONSTRUCCIÓN DE ALCANTARILLAS · Circuito Remedios…: 12 reportado» → «Aprobar igual» → v2 vigente y v1 reemplazada;
    - la v1 abre en solo lectura, solo con «Descargar Excel», y su Excel responde 200 `…-v1.xlsx`;
    - v3 creada y descartada con motivo → «Importar» y «Crear en blanco» se habilitan otra vez.
  - Queda en dev para la T20 y la T21: el presupuesto PRUEBA-031-T18 (v2 vigente) y la bitácora de prueba del 2025-01-17. Se borran en la T21.
  - 534 verificaciones, los tres comandos en verde.
- T20 (2026-10-20): la bitácora con el catálogo de la obra.
  - Ruta nueva `GET presupuestos/catalogo?obraId=`, con el permiso de bitácoras y no el del contrato: quien llena la bitácora necesita la lista. `api.presupuestos.catalogo`.
  - `pantalla-partes.tsx`:
    - `FilaActividad.capituloId`;
    - con presupuesto, opciones «ítem · capítulo · vía» con la descripción como detalle y sin precios; el valor es «capítulo|ítem» y se guardan los dos;
    - la unidad sale del catálogo, y la cantidad inicial de la unidad guardada;
    - sin presupuesto, la lista fija de siempre.
  - **Caso que el plan no cubría (RF-62):** una actividad guardada con capítulo cuyo ítem quitó una versión posterior.
    - En el servidor, `actividadesDelParte` la conserva con su capítulo si vuelve igual y no está en el catálogo vigente. Antes daba error al volver a guardar la bitácora.
    - En la pantalla se muestra «… (ya no está en el presupuesto vigente)».
    - Caso sumado en «031/RF-58 a RF-63».
  - Probado en Chrome (dev) en la bitácora de prueba del 2025-01-17, con el presupuesto PRUEBA-031-T18 v2 vigente:
    - el 2.8 viejo se ve «(ya no está en el presupuesto vigente)» con sus 12 m³;
    - las opciones no incluyen ese 2.8 y ninguna tiene «$»;
    - «excavacion» sin tilde encuentra 20;
    - con el teclado se eligió «4.1.8 · CONSTRUCCIÓN DE CUNETA · VIA LA YE-YONDO» (m³), con 8;
    - guardado: en la base, el 2.8 intacto con su capítulo y el 4.1.8 con «CONSTRUCCIÓN DE CUNETA / VIA LA YE-YONDO».
  - Otra obra sin presupuesto responde `fijo`, 31 actividades sin capítulo; la de pruebas, `presupuesto`, 75.
  - 534 verificaciones, los tres comandos en verde.
- T21 (2026-10-20): Inicio y Reportes.
  - **Inicio** (`pantalla-inicio.tsx`): sección «Pólizas» arriba, para gerencia y residente.
    - Un aviso con cada póliza (obra, amparo, número, aseguradora y «Vence en N días» o «Venció…»), en rojo si hay alguna vencida.
    - Un enlace «Ver el contrato de …» por obra.
  - **Reportes → Actividades** (RF-68):
    - `cantidadesPorItem` agrupa por «capítulo|ítem»; las que no tienen capítulo siguen por ítem;
    - `claveDeCantidad` y `conContratado` (acumulado / contratado y %);
    - en el servidor, `actividadesHasta` (todas las bitácoras no anuladas hasta el fin del periodo) y `contratadoDeLaObra` (del vigente).
  - En la pestaña, columnas Capítulo, «En el periodo» y «Acumulado / contratado» con barra y %. La fila ya no usa el ítem como id, porque se repetiría entre capítulos.
  - En el Excel: Capítulo, Vía, Acumulado, Contratado y % ejecutado.
  - Caso «031/RF-68».
  - Probado en Chrome (dev), con un contrato de prueba cuya póliza vence en 20 días:
    - el Inicio muestra «Una póliza por vencer: PRUEBA-018 · … · Cumplimiento PRUEBA-T21-1 (PRUEBA Seguros): Vence en 20 días» y su enlace lleva a `/panel/contrato`;
    - Reportes, enero de 2025: «4.1.8 · CONSTRUCCIÓN DE CUNETA · VIA LA YE-YONDO · 8 m³ · 8 de 5.214 · 0,2 %», y el 2.8 quitado con «—»;
    - el Excel de Actividades responde 200.
  - Limpieza de todo lo de T18 a T21: 3 presupuestos, la bitácora de prueba, el contrato con su póliza y la sesión. Quedan 0.
  - Las capturas de Chrome se colgaron otra vez en Reportes: se leyó la página con JavaScript.
  - 535 verificaciones, los tres comandos en verde.
- T22 (2026-10-20):
  - `capitulo` en `items_pago` de `propuestaDeIa`; `ActividadDelReporte` con `capituloId` y `capituloEscrito`. `resolverPropuesta`, con presupuesto vigente: si el ítem está en un solo capítulo, ese; si está en varios, el que nombra el mensaje (`reconocerCapitulo` con el capítulo escrito y la descripción); si no se sabe, sin capítulo. `faltasDelReporte` lo aparta con los capítulos posibles, o por no estar en el presupuesto vigente o en ese capítulo.
  - `catalogosDeLaObra` carga `catalogoDeLaObra`; `dias.ts`, `excepciones.ts` y `bandeja.ts` lo pasan a las faltas.
  - En el Excel real de OCC ningún ítem está en un solo capítulo (todos se repiten por vía), así que el caso de un capítulo único y el de un ítem fuera del presupuesto (9.9.9) quedan en el verificador («031/RF-64 a RF-67»).
  - En dev, con el POST de integración, un mensaje con tres actividades y el día armado como vencido: 2.8 «Circuito Remedios» → CONSTRUCCIÓN DE ALCANTARILLAS · Circuito Remedios; 4.1.8 «alcantarillas vía Ye-Yondo» → CONSTRUCCIÓN DE ALCANTARILLAS · VIA LA YE-YONDO (no Cuneta); 4.1.8 sin pista → «No se pudo guardar» con los cuatro capítulos posibles. 4/4. Limpieza: 0 filas.
  - El tipo del mensaje de integración es `texto` (no `conversation`); el día espera sus reportes esperados, por eso se armó a mano en la prueba. El script temporal se borró.
  - 536 verificaciones, los tres comandos en verde.
- T23 (2026-10-20):
  - `DetalleDePropuesta.opciones` lleva `actividades` (el catálogo de la obra, de `catalogosDeLaObra`). En «Completar: Actividad», con presupuesto vigente, el selector ofrece «ítem · capítulo · vía» con la descripción y guarda `clave` y `capituloId`; muestra el capítulo escrito en el reporte. Sin presupuesto, la lista fija de siempre. El guardado es el mismo `guardarEnBitacora` de la T22.
  - En Chrome (dev, sesión temporal), con el mensaje de la T22: la excepción del 4.1.8 sin pista abrió con el motivo y «Ítem 4.1.8: elija el capítulo»; al buscar «4.1.8» salieron sus cuatro capítulos; se eligió CONSTRUCCIÓN DE CUNETA · VIA LA YE-YONDO → «El renglón quedó guardado». La bitácora del 2025-01-18 quedó con 2.8 (Alcantarillas · Circuito Remedios, 5), 4.1.8 (Alcantarillas · Ye-Yondo, 30) y 4.1.8 (Cuneta · Ye-Yondo, 10); la excepción, `guardada`.
  - El buscador del selector busca el texto seguido («4.1.8 cuneta yondo» no da nada; «4.1.8» sí). Es el comportamiento de siempre del `Selector`.
  - Limpieza: presupuesto, mensaje, bitácora, día, excepción y sesión; quedan 0. Script temporal borrado.
  - 536 verificaciones, los tres comandos en verde.
- T24 (2026-10-20):
  - `scripts/generar_workflow_clasificar.py` (n8n-evolutionapi): `capitulo` en cada ítem de `items_pago`, como texto (vacío si el reporte no lo dice; no suma a los 16 `anyOf`, siguen 16), y la instrucción: un ítem puede estar en varios capítulos y vías; si el reporte dice cuál, va tal cual; si no, vacío, sin deducirlo. `workflows/occ-clasificar-mensajes.json` regenerado (el anterior, en el scratchpad).
  - En el PC, con el workflow `Prueba031T24Ids` (inactivo, como los de las specs anteriores) sobre `PRUEBA-031-T24-1` en `occ_whatsapp`: un reporte con «Excavación para alcantarilla vía Ye-Yondo, ítem 4.1.8: 12 m3», «Demolición de cabezote de alcantarilla en el Circuito Remedios, ítem 2.8: 3 m3» y «Excavación ítem 4.1.8: 8 m3». La API aceptó el esquema; la IA devolvió `capitulo` «alcantarilla vía Ye-Yondo», «alcantarilla Circuito Remedios» y vacío, y lo dijo en `motivo_revision`.
  - Esa salida, por `propuestaDeIa` y `resolverPropuesta` con el catálogo del Excel de OCC: 4.1.8 → CONSTRUCCIÓN DE ALCANTARILLAS · VIA LA YE-YONDO; 2.8 → CONSTRUCCIÓN DE ALCANTARILLAS · Circuito Remedios; el 4.1.8 sin pista → sin capítulo, con la falta «está en varios capítulos… elija el capítulo».
  - Mensaje de prueba borrado; el clasificador se publica en el VPS en la T25.
- T25 (2026-10-21, hora UTC; los comandos los corrió el usuario con `!` porque el modo automático no deja desplegar a producción):
  - 1.er intento, `sql/desplegar_031.sh` (repo de n8n): la migración 0028 quedó en `preoperaocc`; la subida de la imagen en un solo envío se cortó («Connection reset by peer»).
  - 2.º intento, `sql/subir_imagen_031.sh`: imagen por partes de 8 MB con sha256 comprobado. Panel en `2b15c4db3d4c` (`preoperaocc:anterior` = `918f3ae6669f`), healthy; vecino y panel 200; `/api/panel/contrato` sin sesión 401.
  - El clasificador falló ahí: el json regenerado no traía `id` y n8n respondió «null value in column "id" of relation "workflow_entity"»; siguió corriendo el anterior. 3.er paso, `sql/publicar_clasificador_031.sh`, con copia que lleva `id` `Vl6IHIswaAivlGOq`: importado y publicado a las 02:21 UTC, 4 flujos activos, «capitulo» presente en el flujo que corre. Respaldos `respaldos/clasificar_antes_031.json`, `clasificar_antes_031b.json` y `clasificar_031.json`.
  - Comprobado en producción, solo lectura: 29 migraciones; existen `contratos`, `contrato_polizas`, `contrato_documentos`, `contrato_eventos` y `presupuestos`.
  - Falta del usuario: importar el presupuesto real de CONSORCIO MAGDALENA y decidir cuándo aprobarlo. El módulo con sesión no se miró en Chrome (no hay sesión de producción).
  - Pendiente aparte: que `generar_workflow_clasificar.py` escriba el `id` en el json, para que no vuelva a pasar.
