# Spec 033 — Grupo empresarial: tarjetas y menú por empresa

> Estado: **Cumplida en dev** el 2026-10-29 (ver `validacion.md`); producción con la T23, que espera a las specs 036 a 038 (RF-53) · plan aprobado el 2026-10-27 · aprobada el 2026-10-26 · Fecha: 2026-10-26
> Cambio del 2026-10-27 (al aprobar el plan): Proyectos no tiene corte propio; RF-2, RF-3, RF-34 y RF-41 ajustados.
> Cambio del 2026-10-27 (en la T21): el menú de la obra también lleva Preoperacionales y Asignaciones; RF-17 ajustado.
> Cambio del 2026-10-27 (menús definitivos, explicado por el usuario antes de la T22): Elemental presta los servicios administrativos del grupo; nuevos menús en RF-13 a RF-17; salen del menú Información de la empresa, Información financiera y Consolidado (los cortes pasan a Tesorería, spec 037); RF-49 a RF-53 nuevos. Módulos nuevos en sus specs: Documentos (034), Recursos Humanos (035), Compras (036), Tesorería (037), WhatsApp y Bitácora de OCC y Geolab (038). Todo sube a producción junto.
> Cambia:
> - la spec 022 (un solo menú lateral con sus grupos);
> - la spec 008 (a dónde entra cada rol al iniciar sesión);
> - el Inicio del panel.

## Contexto y objetivo

El panel nació para la maquinaria de OCC y hoy muestra todo en un solo menú. Pero el grupo empresarial son cuatro frentes con oficios distintos:

- **Elemental Ingeniería y Arquitectura** — la parte administrativa del grupo.
- **OCC** — los vehículos y la maquinaria que trabajan en las obras.
- **Geolab** — el laboratorio de las obras.
- **Proyectos** — las obras, cada una por consorcio. Hoy en producción: Consorcio Magdalena, Consorcio Alcaraván y Consorcio Cartagena.

Gerencia quiere entrar al sistema y ver una tarjeta por empresa; al pulsar una, ver solo lo de esa empresa con su propio menú: los datos de la empresa, su información financiera y sus módulos. El asistente va en todas. Así cada empresa lleva su control sin mezclarse con las demás.

## Usuarios / actores

- **Gerencia** (panel web, rol `admin`): ve las cuatro tarjetas, entra a todas, registra los datos de cada empresa y su información financiera.
- **Residente / director de obra** (rol `supervisor`): entra directo a su obra dentro de Proyectos.
- **Laboratorista** (rol `laboratorista`): entra directo a Geolab.
- **Almacenista y encargado de planta**: entran directo a su módulo de la obra (Almacén o Control Cantera), como hoy.
- **Operador** (móvil): no cambia nada.

## Historias de usuario

- H1: Como gerencia quiero ver al entrar una tarjeta por empresa, para elegir qué empresa revisar.
- H2: Como gerencia quiero ver y editar los datos de cada empresa, para tenerlos en un solo lugar.
- H3: Como gerencia quiero registrar la información financiera de cada empresa y de cada consorcio por fecha de corte, para saber su saldo y lo que debe y le deben.
- H4: Como gerencia quiero que cada empresa tenga su propio menú con solo sus módulos, para no mezclar lo de una con lo de otra.
- H5: Como gerencia quiero en Proyectos elegir la obra y ver todo lo de esa obra, para revisarla sin filtrar cada pantalla.
- H6: Como gerencia quiero en Elemental un consolidado financiero del grupo, para ver las cuatro empresas y los consorcios juntos.
- H7: Como residente o laboratorista quiero entrar directo a lo mío, sin pasar por tarjetas que no me tocan.

## Requisitos funcionales (criterios de aceptación en EARS)

### Tarjetas de empresas (H1, H7)

- RF-1: CUANDO gerencia entra al panel, EL SISTEMA muestra cuatro tarjetas: Elemental Ingeniería y Arquitectura, OCC, Geolab y Proyectos.
- RF-2: EL SISTEMA muestra en cada tarjeta el nombre de la empresa, su función en una línea y la fecha y el saldo de su último corte financiero; en la de Proyectos, la suma de los saldos del último corte de cada obra y la fecha del más antiguo (cambio del 2026-10-27).
- RF-3: SI una empresa no tiene ningún corte financiero (en Proyectos: ninguna obra lo tiene), ENTONCES EL SISTEMA muestra en su tarjeta «Sin información financiera».
- RF-4: EL SISTEMA muestra en la tarjeta de Proyectos cuántas obras activas hay.
- RF-5: CUANDO se pulsa una tarjeta, EL SISTEMA abre la empresa con su menú propio.
- RF-6: CUANDO un residente entra al panel, EL SISTEMA abre directamente su obra dentro de Proyectos.
- RF-7: SI un residente tiene varias obras, ENTONCES EL SISTEMA abre la lista de sus obras en Proyectos.
- RF-8: CUANDO un laboratorista entra al panel, EL SISTEMA abre directamente Geolab.
- RF-9: CUANDO un almacenista o un encargado de planta entra al panel, EL SISTEMA abre su módulo de la obra, como hoy (008/RF-4).
- RF-10: MIENTRAS se está dentro de una empresa, EL SISTEMA muestra arriba del menú el nombre de la empresa (y de la obra, en Proyectos).
- RF-11: MIENTRAS gerencia está dentro de una empresa, EL SISTEMA muestra en el menú «← Empresas» para volver a las tarjetas.
- RF-12: SI una persona abre la dirección de una empresa o de una obra que no le corresponde, ENTONCES EL SISTEMA muestra «No tienes acceso a esta sección» y no muestra sus datos.

### Menú de cada empresa (H4, H5)

- RF-13 (cambio del 2026-10-27, menús definitivos): EL SISTEMA muestra en el menú de Elemental: Recursos Humanos (con Personas y Obras dentro), Compras, Tesorería, Documentos, Licitaciones y Asistente.
- RF-14 (cambio del 2026-10-27, menús definitivos): EL SISTEMA muestra en el menú de OCC: Reportes de WhatsApp, Bitácora, Documentos, Reportes de vehículos y maquinaria, Vehículos, Preoperacionales, Asignaciones, Solicitudes de compra, Solicitudes de pago y Asistente.
- RF-15 (cambio del 2026-10-27, menús definitivos): EL SISTEMA muestra en el menú de Geolab: Bitácora, Reportes de WhatsApp, Laboratorio, Reportes de laboratorio, Documentos, Solicitudes de compra, Solicitudes de pago y Asistente.
- RF-16: CUANDO se entra a Proyectos, EL SISTEMA muestra la lista de obras con su consorcio, municipio y estado para elegir una.
- RF-17 (cambio del 2026-10-27, menús definitivos): CUANDO se elige una obra, EL SISTEMA muestra en su menú, igual para todas las obras: Bitácoras, Reportes de WhatsApp, Reportes/Informes, Recursos Humanos, Calidad (el Laboratorio de la obra), Almacén, Preoperacionales, Asignaciones, Control Cantera, Contrato y Presupuesto, Solicitudes de compra, Solicitudes de pago y Asistente.
- RF-18: MIENTRAS una obra tiene apagado Almacén, Control Cantera o Laboratorio (Calidad) (spec 017), EL SISTEMA no muestra ese módulo en su menú.
- RF-19: MIENTRAS se está dentro de una obra, EL SISTEMA muestra cada módulo con los datos de esa obra solamente, sin pedir elegir la obra en la pantalla.
- RF-20: MIENTRAS se está dentro de una obra, EL SISTEMA muestra «Cambiar de obra» en el menú.
- RF-21: EL SISTEMA sigue decidiendo qué módulos ve cada rol con los permisos de hoy; el menú de cada empresa solo los reparte.

### Contenido de los módulos por empresa (H4)

- RF-22: EL SISTEMA muestra en la Bitácora de OCC, mientras no llegue su grupo de WhatsApp propio (spec 038), la sección Maquinaria de las bitácoras de todas las obras, con un filtro por obra y por fecha.
- RF-23: EL SISTEMA muestra en Reportes de WhatsApp de OCC solo lo de vehículos y maquinaria de todas las obras.
- RF-24: EL SISTEMA muestra en Reportes de WhatsApp de una obra solo lo de esa obra.
- RF-25: EL SISTEMA muestra en Reportes de vehículos y maquinaria de OCC los reportes de equipos (horas, kilómetros, preoperacionales, mantenimientos) de todas las obras.
- RF-26: EL SISTEMA muestra en Laboratorio de Geolab los ensayos de todas las obras, con un filtro por obra.
- RF-27: EL SISTEMA muestra en Reportes de laboratorio de Geolab los consolidados de ensayos por obra y por rango de fechas.
- RF-28 (cambio del 2026-10-27): EL SISTEMA muestra en Recursos Humanos de Elemental las personas de todo el grupo, con filtro por empresa; en Recursos Humanos de una obra, solo las de esa obra.
- RF-29: EL SISTEMA muestra el asistente en el menú de todas las empresas y de todas las obras.
- RF-30: MIENTRAS el asistente se abre dentro de una obra, EL SISTEMA responde por defecto sobre esa obra.

### Información de la empresa (H2)

> Cambio del 2026-10-27: Información de la empresa e Información de la obra salen del menú. La tabla `empresas` se queda (nombre de las tarjetas); RF-31 a RF-33 quedan sin pantalla hasta que se pidan de nuevo.

- RF-31: EL SISTEMA guarda por empresa: razón social, NIT, dirección, ciudad, teléfono, correo y representante legal.
- RF-32: EL SISTEMA deja editar la información de la empresa solo a gerencia.
- RF-33: EL SISTEMA muestra en Información de la obra su nombre, código, municipio, consorcio, estado y los datos principales de su contrato (spec 031).

### Información financiera (H3, H6)

> Cambio del 2026-10-27: Información financiera sale del menú de las empresas y de las obras y el Consolidado del grupo se quita. Los cortes (RF-34 a RF-40, RF-44) se registran desde Tesorería de Elemental (spec 037) y siguen alimentando las tarjetas (RF-2, RF-3). RF-41 a RF-43 quedan sin pantalla.

- RF-34: EL SISTEMA deja a gerencia registrar un corte financiero de Elemental, OCC, Geolab o de una obra (Proyectos no tiene corte propio: sus cortes son los de sus obras; cambio del 2026-10-27) con: fecha de corte, saldo a la fecha, cuentas por pagar, cuentas por cobrar y notas.
- RF-35: SI la fecha de corte es posterior a hoy, ENTONCES EL SISTEMA rechaza el corte con «La fecha de corte no puede ser futura».
- RF-36: SI ya existe un corte vigente de la misma empresa u obra con la misma fecha, ENTONCES EL SISTEMA rechaza el corte con «Ya hay un corte del <fecha>; anúlalo para registrar otro».
- RF-37: EL SISTEMA muestra en Información financiera el último corte arriba y debajo el historial de cortes, del más reciente al más antiguo.
- RF-38: EL SISTEMA muestra junto a cada valor del último corte su diferencia con el corte anterior.
- RF-39: CUANDO gerencia anula un corte, EL SISTEMA pide el motivo y lo deja en el historial marcado como anulado.
- RF-40: EL SISTEMA no deja editar un corte registrado; se corrige anulándolo y registrando otro.
- RF-41: EL SISTEMA muestra en el Consolidado del grupo una fila por Elemental, OCC, Geolab y por cada obra (agrupadas bajo Proyectos), con su último corte, y una fila de total (cambio del 2026-10-27: sin fila propia de Proyectos, para no contar dos veces).
- RF-42: EL SISTEMA muestra en el Consolidado del grupo la fecha del corte de cada fila, para que se vea cuál está desactualizado.
- RF-43: SI el último corte de una empresa u obra tiene más de 30 días, ENTONCES EL SISTEMA lo marca en el Consolidado como «Desactualizado».
- RF-44: EL SISTEMA muestra la información financiera solo a gerencia.

### Personas por empresa (H4)

- RF-45: EL SISTEMA pide al registrar o editar una persona la empresa a la que pertenece: Elemental, OCC, Geolab o Proyectos.
- RF-46: SI una persona ya registrada no tiene empresa, ENTONCES EL SISTEMA la toma de su rol: operador → OCC, laboratorista → Geolab, residente, almacenista y encargado de planta → Proyectos, gerencia → Elemental.

### Reglas transversales

- RF-47: CUANDO se abre una dirección del panel de antes del cambio, EL SISTEMA lleva a la misma pantalla dentro de su empresa.
- RF-48: EL SISTEMA conserva el título de la pestaña del navegador con la empresa: «<Módulo> · <Empresa>».

### Menús definitivos (cambio del 2026-10-27)

- RF-49: CUANDO se pulsa Licitaciones en el menú de Elemental, EL SISTEMA abre LicitApp (`https://licitapp-elementaling.cloud/`) en una pestaña nueva.
- RF-50: EL SISTEMA muestra el asistente en el menú de Elemental, OCC, Geolab y de cada obra (reafirma RF-29).
- RF-51: EL SISTEMA muestra Solicitudes de compra y Solicitudes de pago al residente y al almacenista en su obra, al laboratorista en Geolab y a gerencia en OCC, Geolab y cada obra; Compras y Tesorería de Elemental, donde se aprueban, solo a gerencia.
- RF-52: CUANDO se abre una dirección de Información de la empresa, Información financiera o Consolidado, EL SISTEMA lleva a Tesorería de Elemental (gerencia) o al inicio del rol.
- RF-53: MIENTRAS un módulo del menú pertenece a una spec aún no terminada (034 a 038), EL SISTEMA no sube a producción: la 033 se despliega junto con ellas.

## Superficies afectadas

- [ ] **Móvil** — no cambia.
- [x] **Panel web** — Inicio (tarjetas), menú lateral por empresa, Proyectos (lista y elección de obra), Información de la empresa / obra, Información financiera (en Proyectos, la de cada obra), Consolidado del grupo, Personas (empresa), Bitácora de maquinaria de OCC, Reportes de laboratorio, Asistente (obra por defecto).
- [x] **API** — datos de empresa, cortes financieros (registrar, listar, anular), consolidado; filtros por empresa en Personas, WhatsApp y Laboratorio.
- [ ] **Sincronización** — no cambia.
- [x] **Datos** — empresas y sus datos; cortes financieros; empresa de cada persona.
- [x] **Reglas** — menú por empresa, a dónde entra cada rol, acceso a empresa/obra, validación del corte, desactualizado. Casos nuevos en `verificar-reglas.ts`.

## Requisitos no funcionales

- Interfaz en español; tema claro; las tarjetas se ven en una columna a 390 px y en dos o cuatro columnas en ventana ancha.
- Valores en pesos colombianos con separador de miles (`$ 1.234.567`).

## Casos límite

- **Sin señal**: no aplica; es solo panel web.
- **Evidencia firmada**: nada firmado cambia; un corte financiero registrado no se edita, se anula con motivo (RF-40, RF-39).
- **Primer arranque**: empresas sin datos ni cortes muestran sus campos vacíos y «Sin información financiera» (RF-3).
- Residente sin ninguna obra asignada: ve «No tienes obras asignadas; pide acceso a gerencia».
- Obra dada de baja: no sale en la lista de Proyectos, pero su información sigue en el Consolidado con su último corte.
- Enlaces viejos (mensajes de WhatsApp, PDF, marcadores): llevan a su pantalla dentro de la empresa (RF-47).

## Fuera de alcance

- Contabilidad: no hay plan de cuentas, facturas, pagos ni conciliación; solo los cortes digitados.
- Importar la información financiera desde Excel o desde un software contable.
- Crear o quitar empresas desde el panel (son las cuatro fijas).
- Cambiar la app del operador.
- El ajuste de la bitácora, la placa y los días sin actividad/ensayo: spec 032.
- Permisos por empresa distintos del rol (se decidió que cada rol entra a lo suyo).

## Criterios de finalización

- Reglas puras (menú por empresa, destino por rol, acceso, RF-35, RF-36, RF-43, RF-46) con caso en `scripts/verificar-reglas.ts`.
- `npm run verificar`, `npm run typecheck` y `npm run lint` en verde.
- Demo manual en Chrome: entrar como gerencia → cuatro tarjetas → cada empresa con su menú y el asistente; registrar un corte `PRUEBA-033` en OCC y verlo en su tarjeta y en el Consolidado; anularlo; entrar a Proyectos → Consorcio Magdalena → Bitácoras sin selector de obra; entrar como residente (directo a su obra) y como laboratorista (directo a Geolab); abrir `/panel/bitacoras` y llegar a la pantalla nueva.

## Dudas abiertas

- [NECESITA ACLARACIÓN: datos reales de cada empresa (razón social, NIT…) — los digita gerencia al terminar, no bloquea.]
- Resuelto el 2026-10-27: el corte lleva solo saldo, cuentas por pagar y cuentas por cobrar (más fecha y notas); si luego hace falta otro valor, se agrega en un cambio aparte.
