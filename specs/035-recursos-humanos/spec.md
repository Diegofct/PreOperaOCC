# Spec 035 — Recursos Humanos: ficha y documentos de cada persona

> Estado: **Cumplida en dev** el 2026-10-29 (aprobada el 2026-10-28; ver `validacion.md`). Sube a producción con la T23 de la 033 · Fecha: 2026-10-28
> Respuestas del usuario del 2026-10-28 (D1 a D7, abajo): salario en la ficha; Recursos Humanos lo llevan gerencia y las auxiliares administrativas de Elemental (acceso nuevo), que ven todo lo de Elemental, salario incluido; el residente, el Encargado de OCC y el laboratorista consultan el personal de su obra o su empresa; avisos de ficha incompleta; para retirar se exigen liquidación, paz y salvo y el examen médico de retiro o el consentimiento firmado de no hacerlo.

## Contexto y objetivo

Hoy el sistema sabe de cada persona lo justo para trabajar: usuario, nombre, documento, cargo, acceso al panel, obra y empresa. Lo demás vive fuera:
- cuándo entró a trabajar, con qué contrato y con qué salario;
- su EPS, ARL, fondo de pensiones y caja de compensación;
- a quién llamar si se accidenta;
- sus papeles: hoja de vida, cédula, contrato, afiliaciones, examen médico, curso de alturas, licencia de conducción, liquidación.

Cuando hay una visita de la ARL, un accidente o una licitación que pide la planta de personal, eso se busca en carpetas y correos, y nadie se entera de que el curso de alturas de un operador venció hasta que alguien lo pide.

Desde la spec 033, Elemental presta Recursos Humanos a todo el grupo. Esta spec le da a cada persona —tenga o no acceso al panel— una **ficha laboral** y una **carpeta de documentos** con vencimientos, con el mismo patrón de Documentos de la spec 034 (clases, nada se borra, se anula con motivo, avisos a 30 días).

Recursos Humanos lo llevan la gerencia y las **auxiliares administrativas de Elemental**, que hoy no tienen acceso al panel: esta spec les crea uno. La obra, OCC y Geolab consultan a su propia gente.

## Usuarios / actores

- **Gerencia** (panel web, rol `admin`): todo Recursos Humanos, incluido el **salario**.
- **Auxiliar de Recursos Humanos** (panel web, **acceso nuevo**, de Elemental): ve todo lo de Elemental; en Recursos Humanos registra y corrige fichas —salario incluido—, sube y anula documentos y retira personas. No da accesos al panel (D6).
- **Residente / director de obra** (panel web, rol `supervisor`): consulta la ficha y los documentos del personal de su obra, sin editar y sin salario.
- **Encargado de OCC** (panel web, spec 034): consulta la ficha y los documentos del personal de OCC, sin editar y sin salario.
- **Laboratorista** (panel web): consulta la ficha y los documentos del personal de Geolab, sin editar y sin salario.
- **Los demás roles** (operador, almacenista, encargado de planta): no ven Recursos Humanos.

## Historias de usuario

- H1: Como gerencia o auxiliar de RR. HH. quiero registrar la ficha laboral de cada persona, tenga o no acceso al panel, para tener en un solo lugar sus datos de contratación y seguridad social.
- H2: Como gerencia quiero guardar el salario de cada persona y que solo lo vean la gerencia y las auxiliares de RR. HH.
- H3: Como gerencia o auxiliar de RR. HH. quiero guardar los documentos de cada persona con su vencimiento, para entregarlos cuando los piden y renovarlos a tiempo.
- H4: Como gerencia o auxiliar de RR. HH. quiero ver qué personas tienen documentos vencidos o por vencer, contratos por terminar o la ficha incompleta, para actuar antes de que sea un problema.
- H5: Como gerencia o auxiliar de RR. HH. quiero retirar a una persona solo cuando sus documentos de retiro estén cargados, sin borrarla, para que su historia y sus registros sigan existiendo.
- H6: Como residente, Encargado de OCC o laboratorista quiero consultar el personal de mi obra o mi empresa y sus papeles al día, para responder a una inspección sin llamar a la oficina.

## Requisitos funcionales (criterios de aceptación en EARS)

### El módulo y quién lo ve (H1, H6)

- RF-1: EL SISTEMA muestra en Recursos Humanos de Elemental la pestaña Personas con la ficha de cada persona del grupo, y la pestaña Obras como hoy.
- RF-2: EL SISTEMA muestra Recursos Humanos de Elemental a gerencia y a la auxiliar de RR. HH.
- RF-3: EL SISTEMA agrega «Recursos Humanos» al menú de OCC y al de Geolab, de consulta: el personal de esa empresa, con su ficha y sus documentos (cambia RF-14 y RF-15 de la spec 033).
- RF-4: EL SISTEMA muestra Recursos Humanos de OCC a gerencia y al Encargado de OCC, y el de Geolab a gerencia y al laboratorista.
- RF-5: EL SISTEMA muestra en Recursos Humanos de la obra el personal de esa obra, en lugar de «Este módulo está en construcción»: a gerencia y, de consulta, al residente de esa obra.
- RF-6: EL SISTEMA deja registrar y corregir fichas, subir y anular documentos de personas y retirar personas solo a gerencia y a la auxiliar de RR. HH.
- RF-7: EL SISTEMA no muestra Recursos Humanos al operador, al almacenista ni al encargado de planta.

### El acceso Auxiliar de Recursos Humanos

- RF-8: EL SISTEMA ofrece el acceso y el cargo «Auxiliar de Recursos Humanos» al registrar una persona, con empresa Elemental y sin obra.
- RF-9: CUANDO la auxiliar de RR. HH. entra al panel, EL SISTEMA la lleva a Recursos Humanos de Elemental, sin tarjetas de Inicio ni acceso a OCC, Geolab ni las obras.
- RF-10: EL SISTEMA le muestra a la auxiliar de RR. HH. todo el menú de Elemental salvo el Asistente: Recursos Humanos (con Personas y Obras), Compras, Tesorería, Documentos y Licitaciones. Lo que puede hacer en Compras y Tesorería lo dicen las specs 036 y 037; en Documentos de Elemental, lo mismo que el Encargado de OCC en los de OCC (ver, subir; anular es de gerencia, spec 034 RF-10).
- RF-11: EL SISTEMA no deja a la auxiliar de RR. HH. dar ni cambiar accesos al panel: registra personas sin acceso y corrige sus fichas; los accesos los da la gerencia.

### La ficha (H1, H2)

- RF-12: EL SISTEMA guarda de cada persona, además de lo que ya tiene (nombre, documento, cargo, acceso, obra, empresa):
  - **datos personales:** tipo de documento (CC, CE, PPT, pasaporte), fecha de nacimiento, teléfono, correo, dirección y ciudad;
  - **contacto de emergencia:** nombre, parentesco y teléfono;
  - **vinculación:** fecha de ingreso, tipo de contrato (término fijo, término indefinido, obra o labor, prestación de servicios, aprendizaje) y fecha de terminación del contrato (si es a término fijo u obra o labor);
  - **salario** mensual en pesos;
  - **seguridad social:** EPS, ARL, fondo de pensiones y caja de compensación;
  - **notas.**
- RF-13: EL SISTEMA muestra y deja cambiar el salario solo a gerencia y a la auxiliar de RR. HH.; a nadie más se lo envía el servidor, ni en la ficha ni en el listado.
- RF-14: EL SISTEMA registra también a personas sin acceso al panel ni al celular, como hoy en Personas.
- RF-15: EL SISTEMA guarda quién cambió la ficha y cuándo, y deja ver ese historial a gerencia y a la auxiliar de RR. HH.
- RF-16: SI la fecha de terminación del contrato es anterior a la fecha de ingreso, ENTONCES EL SISTEMA no la guarda y lo dice.
- RF-17: SI el salario no es un valor en pesos mayor que cero, ENTONCES EL SISTEMA no lo guarda y lo dice.

### Estado laboral y retiro (H5)

- RF-18: EL SISTEMA lleva el **estado laboral** de cada persona: activo, en vacaciones, incapacitado, en licencia o retirado.
- RF-19: EL SISTEMA no deja marcar a una persona como retirada MIENTRAS le falte alguno de sus documentos de retiro vigentes, y dice cuáles faltan:
  - **paz y salvo**;
  - **liquidación**, salvo si su contrato es de prestación de servicios;
  - **examen médico de retiro** o, si no lo quiere hacer, el **consentimiento firmado de no realizar el examen médico de retiro**.
- RF-20: CUANDO se retira a una persona, EL SISTEMA pide la fecha y el motivo del retiro, le quita el acceso al panel y al celular, y la conserva con toda su historia.
- RF-21: MIENTRAS una persona está retirada, EL SISTEMA no la ofrece en los selectores de bitácoras, asignaciones ni preoperacionales, y la sigue mostrando en los registros donde ya aparece.
- RF-22: EL SISTEMA no deja borrar a una persona desde Recursos Humanos: se retira.

### Documentos de la persona (H3)

- RF-23: EL SISTEMA ofrece las clases de documento de una persona:
  - hoja de vida;
  - documento de identidad;
  - contrato y otrosíes;
  - afiliación a EPS, a ARL, a pensiones y a caja de compensación;
  - certificados de estudio;
  - cursos y certificaciones (trabajo en alturas, espacios confinados, manejo de maquinaria…);
  - examen médico ocupacional (ingreso o periódico);
  - examen médico de retiro;
  - consentimiento de no realizar el examen médico de retiro;
  - licencia de conducción;
  - dotación y elementos de protección entregados;
  - liquidación;
  - paz y salvo;
  - otro.
- RF-24: EL SISTEMA sube, lista, abre, descarga, busca y anula los documentos de una persona con las mismas reglas de la spec 034 (RF-24 a RF-30, RF-35, RF-36, RF-43 a RF-47): tipos PDF, imágenes, Word y Excel; hasta 20 MB; tipo real revisado; nada se borra.
- RF-25: EL SISTEMA marca los documentos de una persona «Vence en N días» desde 30 días antes y «Vencido» después, como en la spec 034 (RF-38, RF-39).

### Avisos y listado (H4)

- RF-26: EL SISTEMA marca una ficha como **incompleta** MIENTRAS le falte la fecha de ingreso, el tipo de contrato, la EPS o la ARL.
- RF-27: EL SISTEMA muestra arriba del listado de personas cuántas personas activas tienen documentos vencidos, cuántas los tienen por vencer en 30 días, cuántos contratos terminan en los próximos 30 días y cuántas fichas están incompletas.
- RF-28: EL SISTEMA marca cada persona del listado con sus avisos: «Documentos vencidos», «Vence en N días», «Contrato termina en N días», «Ficha incompleta».
- RF-29: EL SISTEMA deja filtrar el listado por empresa, obra, cargo, estado laboral y «con avisos».
- RF-30: EL SISTEMA deja buscar por nombre, documento o usuario, sin distinguir mayúsculas ni tildes.
- RF-31: EL SISTEMA no cuenta en los avisos a las personas retiradas.

### Reglas transversales

- RF-32: EL SISTEMA comprueba en el servidor el permiso y la empresa u obra de la persona frente a la de quien consulta.
- RF-33: EL SISTEMA no muestra la ficha ni los documentos de una persona a quien no tiene permiso, ni por dirección.
- RF-34: EL SISTEMA no cambia lo que hoy hace el celular, salvo que el retirado pierde el acceso (RF-20), igual que hoy un inactivo.

## Superficies afectadas

- [x] **Móvil**: solo indirectamente: el retirado ya no puede entrar (RF-20), igual que hoy un inactivo.
- [x] **Panel web**:
  - Recursos Humanos de Elemental (Personas con ficha, salario para gerencia y la auxiliar de RR. HH., documentos, avisos, retiro);
  - Recursos Humanos de consulta en OCC, Geolab y la obra;
  - el acceso Auxiliar de RR. HH., su entrada y su menú.
- [x] **API**: ficha, salario, documentos de la persona, retiro, historial.
- [ ] **Sincronización**: sin cambios de forma; el retirado viaja como inactivo.
- [x] **Datos**: los campos de la ficha, el salario, el estado laboral, el historial y los documentos de la persona; el acceso nuevo.
- [x] **Reglas**: clases de documento de persona, estado laboral, retiro con sus documentos, ficha incompleta, avisos, permisos del acceso nuevo; con casos en `verificar-reglas.ts`.

## Requisitos no funcionales

- El listado de 300 personas con sus avisos carga en menos de 2 s.
- Todo el texto en español.
- El salario no sale del servidor hacia quien no es gerencia ni auxiliar de RR. HH. (RF-13), ni en el listado, ni en el historial, ni en un error.
- Los datos personales (teléfono, dirección, contacto de emergencia) solo viajan a quien puede ver la ficha.

## Casos límite

- **Sin señal**: no aplica al panel. En el celular, un operador retirado con la app abierta sin señal sigue hasta que sincroniza, como hoy un inactivo.
- **Evidencia firmada**: retirar a alguien no toca sus preoperacionales, bitácoras ni viajes: siguen con su nombre.
- **Primer arranque**: las personas que ya existen quedan con estado «activo» si hoy están activas e «inactivo» como hoy si no; la ficha vacía sale «incompleta» y la gerencia o la auxiliar la completan.
- **Personas creadas por WhatsApp** (spec 026): entran sin ficha y salen como «Ficha incompleta».
- **Persona que cambia de obra o de empresa**: la ficha y los documentos van con la persona; quien consulta la empresa nueva la ve, la anterior deja de verla.
- **Documento de retiro anulado después del retiro**: la persona sigue retirada; el aviso de que falta queda en su ficha (ver D7).
- **Dos personas editan la misma ficha**: la segunda recibe aviso de que cambió y vuelve a cargar, sin pisar en silencio.
- **Pruebas en dev**: R2 es compartido con producción; lo de prueba lleva PRUEBA-035 y se borra con la limpieza acotada.

## Fuera de alcance

- Nómina, liquidación de salarios, horas extras y prestaciones: el salario es solo el dato de la ficha.
- Vacaciones e incapacidades con sus fechas y días (aquí solo el estado).
- Evaluaciones de desempeño, capacitaciones programadas, dotación por talla, tipo de sangre, cuenta bancaria.
- Firma electrónica de contratos.
- Que el asistente de IA consulte las fichas, los salarios o los documentos de las personas.
- Avisos por correo o WhatsApp.

## Criterios de finalización

- Cada RF tiene cómo comprobarse: caso en `scripts/verificar-reglas.ts` (clases, estado laboral, retiro, ficha incompleta, avisos, permisos y menú del acceso nuevo) o paso de demo manual descrito.
- `npm run verificar`, `npm run typecheck` y `npm run lint` en verde.
- Demo manual en Chrome:
  - una auxiliar de RR. HH. PRUEBA-035 entra, llega a Recursos Humanos de Elemental, completa la ficha de una persona PRUEBA-035 de OCC —salario incluido— y sube su curso de alturas con vencimiento en 10 días; no puede dar accesos;
  - el residente, el Encargado de OCC y el laboratorista no reciben el salario, ni en la respuesta del servidor;
  - el Encargado de OCC la ve en Recursos Humanos de OCC, sin editar y sin salario; el laboratorista no la ve en Geolab; el residente ve a la gente de su obra, sin salario;
  - retirarla sin sus documentos se rechaza diciendo cuáles faltan; con paz y salvo, liquidación y el consentimiento de no hacer el examen, queda retirada, sin acceso, fuera de los selectores y de los avisos;
  - limpieza acotada de lo PRUEBA-035.

## Dudas resueltas (2026-10-28)

- D1: El salario se guarda en la ficha. Lo ven la gerencia y las auxiliares de RR. HH. (RF-12, RF-13; ajustado con D6).
- D2: Las clases y los campos propuestos están bien; no se agregan tipo de sangre, talla ni cuenta bancaria.
- D3: Recursos Humanos lo llevan la gerencia y las auxiliares administrativas de Elemental (acceso nuevo, RF-8 a RF-11); el Encargado de OCC consulta el personal de OCC y el laboratorista el de Geolab (RF-3, RF-4); el residente consulta el de su obra (RF-5; ajustado con D6).
- D4: Sí hay aviso de ficha incompleta (RF-26 a RF-28).
- D5: Para retirar a alguien se exigen sus documentos de retiro (RF-19).
- D6: Las auxiliares de RR. HH. ven todo lo de Elemental, salario incluido (RF-10, RF-13). El residente consulta Recursos Humanos de su obra, como el Encargado de OCC y el laboratorista los de su empresa (RF-5). Supuestos de la spec, al aprobarla: la auxiliar no da accesos al panel (RF-11) y no tiene el Asistente (fuera de alcance: la IA no consulta fichas ni salarios).
- D7: Para retirar se exigen el paz y salvo, la liquidación (salvo prestación de servicios) y el examen médico de retiro, que no es obligatorio: si la persona no lo quiere hacer, firma un consentimiento de no realizarlo, y ese documento lo reemplaza (RF-19, RF-23).

## Dudas abiertas

Ninguna.
