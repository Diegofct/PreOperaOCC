# Validación — Spec 034, Documentos del grupo y de las obras

> Fecha: 2026-10-28 · Tarea T13

Recorrido RF por RF. Cada fila dice **con qué se comprobó**:
- un caso de `scripts/verificar-reglas.ts` (los de esta spec llevan «034/», con su línea);
- una prueba en vivo, con la tarea en que se hizo (el detalle está en las notas de `tareas.md`);
- o, cuando se cumple **por construcción**, la razón, dicha así.

Lo que no se ejecutó no se da por verificado.

## Lo que se ejecutó

| Comando | Resultado |
| --- | --- |
| `npm run verificar` | **594 verificaciones correctas** (9 pruebas de la 034: líneas 11544 a 11812) |
| `npm run typecheck` | sin errores (código de salida 0) |
| `npm run lint` | sin hallazgos (código de salida 0) |

Corridos el 2026-10-28, después de los dos arreglos de la demo (abajo).

**Desarrollo** (`neondb`; migración `0033_goofy_lady_vermin` aplicada **solo aquí**):
- **T8, T9, T12:** las rutas contra el dev server con sesiones temporales de Diego (gerencia), Natalia (residente), Catalina Chaparro (laboratorista) y un Encargado de OCC de prueba: 33/33, 20/20 y 6/6.
- **T10, T11, T12:** en Chrome con la sesión de gerencia del usuario. El selector de archivos de Windows no se maneja desde la extensión: en la pestaña se reemplazó por un PDF de prueba que dispara el mismo `change`.
- **T13, demo con los cuatro roles:** en Chrome, sin tocar la sesión de gerencia del usuario: las sesiones temporales se pusieron en `127.0.0.1:8081`, que el navegador guarda aparte de `localhost:8081`. Cookie borrada y pestaña cerrada al terminar.
- **Limpieza acotada:** 5 documentos PRUEBA-034 con sus filas de `media`, sus 5 objetos de R2 (compartido con producción; DELETE firmado, uno por clave, todas bajo `repositorio/`, 204 cada uno), 3 sesiones de la demo y las 2 personas de prueba. Quedan 0 de cada cosa y la tabla `documentos_del_grupo` vacía.

**Producción:** sin tocar. La 034 sube con la T23 de la 033 (migraciones 0031, 0032 y 0033), cuando el usuario lo pida.

## Arreglos que salieron de la demo (T13)

- **Reportes de WhatsApp de OCC:** el Encargado veía «Esta acción es solo para la gerencia», porque la sección de Grupos se mostraba a quien lista obras y su ruta exige gerencia. Ahora se muestra solo a la gerencia (`pantalla-bandeja.tsx`, `asociaGrupos`).
- **Proyectos:** el Encargado de OCC veía «No tienes obras asignadas; pide acceso a gerencia». Ahora quien no entra a Proyectos ve «Sin acceso», como en las demás empresas (`pantalla-proyectos.tsx`).
- Después de los arreglos, las 10 páginas de OCC cargaron sin ningún aviso de error para el Encargado.

## RF por RF

### El módulo y quién lo ve

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-1 | T10: Documentos de OCC muestra la pantalla nueva; `DOCUMENTOS` «en construcción» ya no existe en `paginas-de-empresa.tsx`. T13: Geolab (laboratorista) y Elemental (gerencia) también | verde |
| RF-2 | «034/RF-2, RF-4 a RF-10» (11747): después de Contrato y Presupuesto, sin interruptor. T13: la residente lo ve en su obra en ese lugar | verde |
| RF-3 | T8: gerencia lista OCC y no aparece lo de otra empresa; T13: la calibración solo en Geolab, el plano solo en su obra | verde |
| RF-4 | 11747: gerencia en las tres empresas y en la obra. T13: gerencia ve el plano de la obra y la calibración de Geolab, con «Anular» | verde |
| RF-5 | 11747 y T8: la residente 200 en su obra, 403 en otra obra y en OCC. T13: lo mismo en pantalla («Sin acceso» en OCC) | verde |
| RF-6 | 11747 y T8: el Encargado 200 en OCC, 403 en Geolab y en una obra. T13: «Sin acceso» en Geolab, Elemental y Proyectos | verde |
| RF-7 | 11747 y T8: el laboratorista 200 en Geolab, 403 en OCC. T13: lo mismo en pantalla | verde |
| RF-8 | 11747: operador, almacenista y encargado de planta no tienen `ver` ni el menú | verde |
| RF-9 | 11747: suben los cuatro roles que ven. T8: gerencia y Encargado suben (201); T13: residente y laboratorista suben (201); los tres sin gerencia ven «Subir documento» | verde |
| RF-10 | 11747: `anular` solo gerencia. T9: residente, Encargado y laboratorista → 403. T13: ninguno de los tres ve «Anular» | verde |
| RF-11 | Por construcción: Documentos de la obra lee `documentos_del_grupo`, y Contrato y Presupuesto sigue con `contrato_documentos`, sin cambios | verde |

### El cargo Encargado de OCC

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-12 | «034/RF-12 a RF-17» (11691): el cargo con su acceso. T12: registrado en Chrome desde RR. HH. con el cargo y el acceso | verde |
| RF-13 | «034/RF-13, RF-14» (11812). T12: queda con empresa OCC y sin obra; el formulario la pone sola y oculta la obra; el servidor rechaza obra u otra empresa (400) en el alta y en la edición | verde |
| RF-14 | 11691: `destinoAlEntrar` → `/panel/occ`, solo alcanza OCC. T13: al entrar llegó a OCC sin tarjetas; Geolab, Elemental y Proyectos «Sin acceso» | verde |
| RF-15 | 11691: el menú de OCC entero, sin «← Empresas». T13: las 10 entradas en pantalla | verde |
| RF-16 | 11691 y «034/RF-16, RF-50, RF-51» (11782). T8: lista vehículos (de varias obras), asignaciones, preoperacionales y reportes; 403 al crear obra o persona y en contrato y almacén. **Precisión de la T4:** la bitácora y WhatsApp de OCC solo se consultan, como los usa la gerencia desde OCC (ahí no se editan ni se aprueban) | verde |
| RF-17 | Por construcción: el cargo tiene `operaVehiculos: false` (11691) y, sin obra, el pull del celular no lo incluye | verde |

### Clases, subir, consultar

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-18 a RF-22 | «034/RF-18 a RF-23» (11544): comunes, propias de cada lugar, proveedores en las cuatro, «Otro» al final. T11: el selector de OCC lista las suyas | verde |
| RF-23 | 11544 (`nombreDeClase`) y T8: `claseNombre` «Fichas técnicas de equipos» guardado en la fila | verde |
| RF-24 | «034/RF-24, RF-29» (11620). T11: el formulario con clase, nombre, fecha, vence, proveedor, descripción y archivo | verde |
| RF-25 | «034/RF-25 a RF-28» (11569): los nueve formatos. T8: PDF y xlsx guardados con su tipo | verde |
| RF-26 | 11569: el .exe renombrado. T8: 415 «El archivo dice ser .pdf, pero su contenido no lo es…» | verde |
| RF-27 | 11569: 20 MB justos pasan, uno más no; la ruta corta por `content-length` antes de leer. **No se subió un archivo real de más de 20 MB** | verde (regla) |
| RF-28 | 11569: vacío → 422 | verde |
| RF-29 | 11620: vence antes de la fecha. El formulario no deja elegirlo (`min`) y la base lo impide (`ck_documento_grupo_vence`) | verde |
| RF-30 | T8: nombre del archivo; T10: «Subido» con quién y cuándo | verde |
| RF-31 a RF-33 | T10: orden por fecha, las columnas, el filtro de clase | verde |
| RF-34 | «034/RF-34» (11676). T10: «ferreteria» encuentra «Ferretería PRUEBA-034» | verde |
| RF-35 | T9: `inline` con el nombre y los bytes del PDF. T11: «Abrir» abre `/api/panel/media/…` en otra pestaña | verde |
| RF-36 | T9: `?descargar=1` → `attachment` con «PRUEBA-034 cotización.xlsx». T11: el Excel muestra «Descargar» (no se pulsó para no bajar archivos al equipo del usuario) | verde |
| RF-37 | T10: «Todavía no hay documentos aquí.»; T11: con permiso de subir invita a «Subir documento» | verde |

### Vencimientos y anular

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-38, RF-39 | «034/RF-38 a RF-42» (11639). T10/T11: «Vence en 10 días» en ámbar y «Vencido» en rojo; T13: «Vence en 18 días» en Geolab | verde |
| RF-40 | T10: casilla «Solo vencidos o por vencer» | verde |
| RF-41 | 11639 (`resumenDeVencimientos`). T11: de 0 a 1 vencido al subir la póliza vencida | verde |
| RF-42 | 11639. T11: al anular la póliza vencida, los vencidos vuelven a 0 | verde |
| RF-43, RF-44 | T9: sin motivo → 400, con motivo → 200, quién y motivo guardados; segunda vez → 409. T11: desde la pantalla, «Documento anulado.» | verde |
| RF-45, RF-46 | T10/T11: ocultos por defecto; con «Ver anulados», tachados con «Anulado por Diego: …» y con «Abrir». T9: el anulado se sigue abriendo (200) | verde |
| RF-47 | Por construcción: no hay ruta ni pantalla para editar un documento | verde |
| RF-48 | T13: residente, laboratorista y Encargado sin «Anular»; gerencia con él | verde |

### Reglas transversales

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-49 | T8: el archivo en R2 (`repositorio/<id>/…`) con su fila en `media`; nada se borra desde el panel | verde |
| RF-50 | T8: el servidor rechaza tipo, tamaño, clase ajena, falta de nombre y lugar sin permiso aunque no pase por la pantalla | verde |
| RF-51 | T8: 403 «No tiene acceso a los documentos de ese lugar.» al pedir otro lugar; T9: el archivo de otro lugar → 404; 11782: `alcanzaLaImagen` exige el módulo al Encargado | verde |
| RF-52 | Por construcción: `rechazoDeArchivo` del contrato no se tocó (PDF e imágenes) | verde |

## Requisitos no funcionales

- **Subir 5 MB en menos de 10 s** y **500 documentos en menos de 2 s**: **no se midieron**. Las pruebas usaron archivos de pocos bytes y menos de diez documentos. Queda pendiente medirlos con datos reales después del despliegue.
- **Fechas como «28 oct 2026»:** la pantalla usa el formato corto del panel, «28-oct-2026», el mismo de los cortes y la bitácora de maquinaria.

## Casos límite

- **Dos personas anulan a la vez:** T9, la segunda recibe 409 y el `update` exige `anulado_en is null`.
- **Archivo con extensión engañosa:** T8 (415).
- **Residente que cambia de obra:** por construcción, el alcance se decide con la obra de la sesión en cada pedido.
- **Pruebas en dev con R2 compartido:** todo lo PRUEBA-034 se borró, objeto por objeto (arriba).
