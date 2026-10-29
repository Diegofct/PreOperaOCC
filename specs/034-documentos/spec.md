# Spec 034 — Documentos del grupo y de las obras

> Estado: **Cumplida en dev** el 2026-10-28 (aprobada el mismo día; ver `validacion.md`). Sube a producción con la T23 de la 033 · Fecha: 2026-10-28
> Respuestas del usuario del 2026-10-28 (D1 a D5, abajo): cada quien ve los documentos de lo suyo y gerencia los de todo; la obra también tiene Documentos; cargo nuevo «Encargado de OCC»; suben todos los que ven, anula solo gerencia; clase de proveedores; aviso a 30 días.

## Contexto y objetivo

Hoy los papeles de cada empresa del grupo y de cada obra viven sueltos: en correos, en carpetas de un computador o en el celular de alguien. Cuando piden la cámara de comercio, el RUT, una póliza, la ficha técnica de una máquina, el certificado de calibración de un equipo del laboratorio, un plano o los papeles de un proveedor, hay que buscarlo a mano y no siempre está la última versión.

Desde la spec 033, el menú de Elemental, OCC y Geolab tiene «Documentos», que hoy dice «en construcción».

Esta spec le da a Elemental, OCC, Geolab y a cada obra un **repositorio de documentos** propio:
- organizado por **clase** (cámara de comercio, RUT, pólizas, fichas técnicas, planos, proveedores…);
- donde se suben PDF, imágenes, Word y Excel;
- que se puede buscar y filtrar;
- donde nada se borra: se anula con motivo, como los documentos del contrato (spec 031);
- que avisa qué documento está **vencido o por vencer**.

Cada persona ve solo los documentos de lo suyo; gerencia ve los de todo el grupo.

Es la base de las specs siguientes: los documentos de cada persona (035, RR. HH.) y los soportes de compras y pagos (036 y 037) se guardan con el mismo patrón.

## Usuarios / actores

- **Gerencia** (panel web, rol `admin`): ve, sube, descarga y **anula** los documentos de Elemental, OCC, Geolab y todas las obras.
- **Residente / director de obra** (panel web, rol `supervisor`): ve, sube y descarga los documentos de **su obra**.
- **Encargado de OCC** (panel web, **cargo nuevo**): ve, sube y descarga los documentos de **OCC**.
- **Laboratorista** (panel web): ve, sube y descarga los documentos de **Geolab**.
- **Los demás roles** (operador, almacenista, encargado de planta): no ven el módulo.

## Historias de usuario

- H1: Como gerencia, residente, encargado de OCC o laboratorista quiero subir los documentos de mi empresa u obra, con su clase, para tenerlos todos en un solo lugar.
- H2: Como cualquiera de ellos quiero buscar un documento por su nombre, su clase o su proveedor y descargarlo, para entregarlo rápido cuando me lo piden.
- H3: Como gerencia quiero ver qué documentos están vencidos o por vencer, para renovarlos a tiempo.
- H4: Como gerencia quiero anular con motivo un documento equivocado o reemplazado sin que desaparezca, para saber siempre qué hubo y por qué se quitó.
- H5: Como gerencia quiero un cargo de Encargado de OCC, para que la persona que maneja los equipos de OCC trabaje en el panel solo con lo de OCC.

## Requisitos funcionales (criterios de aceptación en EARS)

### El módulo y quién lo ve (H1)

- RF-1: EL SISTEMA muestra la pantalla de Documentos en Elemental, OCC y Geolab (RF-13 a RF-15 de la spec 033), en lugar de «Este módulo está en construcción».
- RF-2: EL SISTEMA agrega «Documentos» al menú de cada obra, después de «Contrato y Presupuesto» (cambia RF-16 de la spec 033).
- RF-3: EL SISTEMA muestra en Documentos de cada empresa u obra solo los documentos de esa empresa u obra.
- RF-4: EL SISTEMA muestra Documentos a gerencia en Elemental, OCC, Geolab y todas las obras.
- RF-5: EL SISTEMA muestra Documentos al residente solo en su obra.
- RF-6: EL SISTEMA muestra Documentos al Encargado de OCC solo en OCC.
- RF-7: EL SISTEMA muestra Documentos al laboratorista solo en Geolab.
- RF-8: EL SISTEMA no muestra Documentos al operador, al almacenista ni al encargado de planta.
- RF-9: EL SISTEMA deja subir documentos a todo el que puede ver los de esa empresa u obra (RF-4 a RF-7).
- RF-10: EL SISTEMA deja anular documentos solo a gerencia.
- RF-11: EL SISTEMA deja los documentos del contrato en Contrato y Presupuesto (spec 031): no se mueven ni se repiten en Documentos de la obra.

### El cargo Encargado de OCC (H5)

- RF-12: EL SISTEMA ofrece el cargo «Encargado de OCC» al registrar o editar una persona en Recursos Humanos, con acceso al panel.
- RF-13: EL SISTEMA asigna la empresa OCC a la persona con ese cargo.
- RF-14: CUANDO el Encargado de OCC entra al panel, EL SISTEMA lo lleva a OCC, sin tarjetas de Inicio ni acceso a Elemental, Geolab ni las obras.
- RF-15: EL SISTEMA le muestra al Encargado de OCC el menú de OCC (RF-14 de la spec 033): Reportes de WhatsApp, Bitácora, Documentos, Reportes de vehículos y maquinaria, Vehículos, Preoperacionales, Asignaciones, Solicitudes de compra, Solicitudes de pago y Asistente.
- RF-16: EL SISTEMA le da al Encargado de OCC en esos módulos lo mismo que tiene gerencia dentro de OCC, menos anular documentos y aprobar compras o pagos.
- RF-17: EL SISTEMA no le da al Encargado de OCC acceso al celular de preoperacionales con PIN, salvo que también se le dé como operador en otra persona.

### Clases de documento (H1)

- RF-18: EL SISTEMA ofrece en Elemental, OCC y Geolab las clases comunes:
  - cámara de comercio;
  - RUT;
  - estados financieros;
  - declaraciones de impuestos;
  - certificación bancaria;
  - pólizas y seguros;
  - contratos con terceros;
  - actas;
  - certificados de experiencia;
  - información de proveedores;
  - otro.
- RF-19: EL SISTEMA ofrece además en Elemental: RUP y propuestas de licitación.
- RF-20: EL SISTEMA ofrece además en OCC: fichas técnicas de equipos, SOAT y revisión técnico-mecánica, manuales de equipos y soportes de mantenimiento.
- RF-21: EL SISTEMA ofrece además en Geolab: certificados de calibración, acreditaciones, normas y procedimientos, y formatos.
- RF-22: EL SISTEMA ofrece en las obras: planos, estudios y diseños, permisos y licencias, actas de obra, informes, correspondencia, pólizas de la obra, información de proveedores y otro.
- RF-23: EL SISTEMA guarda con cada documento el nombre de su clase además de la clave, para que se siga leyendo aunque la lista de clases cambie.

### Subir un documento (H1)

- RF-24: EL SISTEMA deja subir un documento con:
  - la clase (obligatoria);
  - el nombre (obligatorio, por ejemplo «Cámara de comercio octubre 2026»);
  - la fecha del documento (obligatoria);
  - la fecha de vencimiento (opcional);
  - el proveedor o tercero (opcional, por ejemplo «Ferretería El Tornillo»);
  - una descripción (opcional);
  - el archivo (obligatorio).
- RF-25: EL SISTEMA admite archivos PDF, imágenes JPG, PNG o WEBP, Word (.doc, .docx) y Excel (.xls, .xlsx).
- RF-26: SI el archivo no es de un tipo admitido, ENTONCES EL SISTEMA lo rechaza y dice qué tipos se admiten.
- RF-27: SI el archivo pesa más de 20 MB, ENTONCES EL SISTEMA lo rechaza y dice que lo reduzca.
- RF-28: SI el archivo llega vacío, ENTONCES EL SISTEMA lo rechaza y lo dice.
- RF-29: SI la fecha de vencimiento es anterior a la fecha del documento, ENTONCES EL SISTEMA no lo guarda y lo dice.
- RF-30: EL SISTEMA guarda el nombre original del archivo, quién lo subió y cuándo.

### Consultar y descargar (H2)

- RF-31: EL SISTEMA lista los documentos de la empresa u obra del más reciente al más antiguo por fecha del documento.
- RF-32: EL SISTEMA muestra en cada fila la clase, el nombre, el proveedor o tercero, la fecha, el vencimiento, el tipo de archivo, quién lo subió y cuándo.
- RF-33: EL SISTEMA deja filtrar la lista por clase.
- RF-34: EL SISTEMA deja buscar por texto en el nombre, el proveedor o tercero, la descripción y el nombre del archivo, sin distinguir mayúsculas ni tildes.
- RF-35: CUANDO se abre un PDF o una imagen, EL SISTEMA lo muestra en una pestaña nueva.
- RF-36: CUANDO se descarga un Word o un Excel, EL SISTEMA lo entrega con su nombre original.
- RF-37: MIENTRAS la empresa u obra no tenga documentos, EL SISTEMA muestra la lista vacía con el botón para subir el primero.

### Vencimientos (H3)

- RF-38: MIENTRAS un documento tenga vencimiento y falten 30 días o menos, EL SISTEMA lo marca «Vence en N días».
- RF-39: MIENTRAS la fecha de vencimiento haya pasado, EL SISTEMA lo marca «Vencido».
- RF-40: EL SISTEMA deja filtrar la lista por «Vencidos o por vencer».
- RF-41: EL SISTEMA muestra arriba de la lista cuántos documentos vigentes de la empresa u obra están vencidos y cuántos vencen en los próximos 30 días.
- RF-42: EL SISTEMA no marca vencimiento en un documento anulado.

### Anular (H4)

- RF-43: EL SISTEMA no borra documentos: gerencia los anula con un motivo obligatorio.
- RF-44: EL SISTEMA guarda quién anuló el documento, cuándo y por qué.
- RF-45: EL SISTEMA oculta los anulados de la lista, salvo que se pida verlos.
- RF-46: MIENTRAS se ven los anulados, EL SISTEMA los muestra marcados con el motivo, y se pueden seguir abriendo.
- RF-47: EL SISTEMA no deja editar un documento ya subido: para corregirlo, gerencia lo anula y se sube de nuevo.
- RF-48: MIENTRAS quien mira no es gerencia, EL SISTEMA no muestra el botón de anular.

### Reglas transversales

- RF-49: EL SISTEMA guarda los archivos en el mismo almacenamiento de las fotos y los documentos del contrato, y nunca los borra de allí.
- RF-50: EL SISTEMA comprueba en el servidor el permiso, la empresa u obra de quien pide, el tipo y el tamaño del archivo, aunque la pantalla ya lo haya hecho.
- RF-51: SI alguien pide por dirección los documentos de una empresa u obra que no le toca, ENTONCES EL SISTEMA responde que no tiene permiso y no muestra nada.
- RF-52: EL SISTEMA deja las reglas del contrato (spec 031) como están: solo PDF e imágenes.

## Superficies afectadas

- [ ] **Móvil**: no cambia (RF-17).
- [x] **Panel web**:
  - pantalla Documentos en Elemental, OCC, Geolab y cada obra (lista, filtros, búsqueda, subir, anular, ver anulados, vencimientos);
  - Documentos en el menú de la obra;
  - cargo Encargado de OCC en Recursos Humanos, su entrada y su menú.
- [x] **API**: rutas del panel para listar, subir, abrir y anular documentos de una empresa u obra; el cargo nuevo en personas y en la sesión.
- [ ] **Sincronización**: no cambia.
- [x] **Datos**:
  - tabla nueva de documentos, de una empresa **o** de una obra (clase, nombre, proveedor, fechas, archivo, anulación); se reutiliza la tabla de archivos que ya existe;
  - el cargo nuevo en la lista de cargos.
- [x] **Reglas**: clases por empresa y obra, tipos y tamaño admitidos, estado del vencimiento, permisos del módulo y del cargo nuevo, menú y entrada del Encargado de OCC; con casos en `verificar-reglas.ts`.

## Requisitos no funcionales

- Subir un PDF de 5 MB tarda menos de 10 s con la conexión de la oficina.
- La lista de 500 documentos carga en menos de 2 s, y buscar responde mientras se escribe.
- Todo el texto en español; las fechas como «28 oct 2026».

## Casos límite

- **Sin señal**: no aplica; es el panel web. Si la subida falla a mitad, no queda un documento sin archivo, y la pantalla dice que se intente de nuevo.
- **Evidencia firmada**: un documento subido no se edita ni se borra (RF-43, RF-47).
- **Primer arranque**: cada empresa y cada obra empieza sin documentos (RF-37).
- **Mismo archivo dos veces**: se permite; son dos documentos y gerencia puede anular el que sobra.
- **Dos personas a la vez**: dos subidas no se pisan, porque cada una crea su propio documento. Si gerencia intenta anular uno que ya anuló otra persona de gerencia, la pantalla lo avisa.
- **Residente que cambia de obra**: deja de ver los documentos de la obra anterior y ve los de la nueva; lo que subió se queda en la obra donde lo subió.
- **Obra con módulos apagados**: Documentos no tiene interruptor por obra; se ve siempre.
- **Archivo con extensión engañosa** (un .exe renombrado a .pdf): el servidor revisa el tipo real del archivo y no solo el nombre.
- **Pruebas en dev**: el almacenamiento es compartido con producción, así que lo de prueba lleva el prefijo PRUEBA- y se borra al final según la limpieza acotada.

## Fuera de alcance

- Carpetas creadas por el usuario o subcarpetas: se organiza por clase.
- Versiones de un mismo documento: se anula el viejo y se sube el nuevo.
- Editar Word o Excel dentro del panel.
- Avisos por correo o por WhatsApp de vencimientos.
- Un directorio o maestro de proveedores: aquí el proveedor es solo un texto para buscar.
- Los documentos de cada persona (spec 035) y de compras y pagos (specs 036 y 037).
- Que la IA lea el contenido de los documentos o que el asistente los consulte.

## Criterios de finalización

- Cada RF tiene cómo comprobarse: caso en `scripts/verificar-reglas.ts` (clases, tipos, tamaño, vencimiento, permisos, menú y entrada del cargo nuevo) o paso de demo manual descrito.
- `npm run verificar`, `npm run typecheck` y `npm run lint` en verde.
- Demo manual en Chrome:
  - gerencia sube a Documentos de OCC un PDF «PRUEBA-034 ficha técnica» con vencimiento en 10 días y un Excel de un proveedor; los ve con «Vence en 10 días», los busca por el proveedor, abre el PDF en pestaña nueva y descarga el Excel con su nombre original;
  - un Encargado de OCC de prueba entra, llega a OCC, ve esos documentos, sube uno y no ve el botón de anular ni Elemental, Geolab u obras;
  - un residente ve y sube documentos solo en su obra, y el laboratorista solo en Geolab;
  - gerencia anula uno con motivo, ve que desaparece y que reaparece marcado al ver los anulados;
  - al final, limpieza acotada de lo PRUEBA-034 (documentos, archivos y personas de prueba).

## Dudas resueltas (2026-10-28)

- D1: Gerencia ve los documentos de todas las empresas y obras; el residente, los de su obra; el Encargado de OCC, los de OCC; el laboratorista, los de Geolab (RF-4 a RF-7).
- D2: La obra también tiene Documentos en su menú, y los del contrato siguen en Contrato y Presupuesto (RF-2, RF-11).
- D3: «Encargado de OCC» es un cargo nuevo (RF-12 a RF-17).
- D4: Suben todos los que ven; solo gerencia anula (RF-9, RF-10).
- D5: Las clases están bien, con información de proveedores en todas (RF-18, RF-22) y el proveedor como campo para buscar (RF-24). El aviso de «por vencer» es a 30 días (RF-38).

- D6: El Encargado de OCC tiene en OCC lo mismo que gerencia, menos anular documentos y aprobar compras o pagos (RF-16), confirmado al aprobar.

## Dudas abiertas

Ninguna.
