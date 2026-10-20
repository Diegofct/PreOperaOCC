# Plan técnico — Spec 030

> Lee antes `docs/constitucion.md` y el `spec.md` de esta carpeta.
> Aquí va el CÓMO. Si algo de esto cambia el comportamiento acordado, no se resuelve
> en el plan: se vuelve a la spec.

## Módulos y archivos

| Archivo | Qué cambia | RF |
| --- | --- | --- |
| `src/shared/rules/periodos.ts` (nuevo) | `periodoDe(tipo, fecha)` (día, semana lunes-domingo, mes), `periodoVecino`, `diasDe` | RF-4, RF-5 |
| `src/shared/rules/reportes.ts` (nuevo) | Agregados puros: `usoDeMaquinas`, `horasDelPersonal`, `cantidadesPorItem`, `viajesAgrupados`, `calidadPorEnsayo`, `climaDelPeriodo`, `cifras…` | RF-6 a RF-21, RF-44 a RF-56 |
| `src/shared/rules/mantenimiento.ts` (nuevo) | `CLASES_DE_MANTENIMIENTO`, `INTERVALOS_DE_ARRANQUE`, `intervaloEfectivo`, `estadoDeMantenimiento`, `ordenDeMantenimiento`, `mantenimientoRepetido` | RF-22 a RF-31, RF-33, RF-42 |
| `src/shared/rules/permisos.ts` | Módulo `reportes`: admin y supervisor con `ver`, `listar` y `escribir`; el resto `NADA` | RF-1, RF-2 |
| `src/features/panel/modulos.ts`, `iconos.tsx` | Enlace, título y dibujo del módulo | RF-1 |
| `src/db/servidor/esquema.ts` + migración 0027 | `mantenimiento_intervalos`, `mantenimiento_intervalos_vehiculo`, `mantenimientos` | RF-23 a RF-35, RF-42 |
| `src/features/reportes/servidor/datos.ts` (nuevo) | Lee lo del periodo: partes no anulados, vehículos, preoperacionales del periodo, viajes vigentes, lecturas | RF-6, RF-11, RF-16, RF-53 |
| `src/features/reportes/servidor/mantenimientos.ts` (nuevo) | Registrar, anular, resolver, leer el estado y el historial, intervalos | RF-24 a RF-35 |
| `src/features/reportes/servidor/excel.ts` + `src/features/reportes/exportar.ts` | Libro con `exceljs` (único archivo que lo importa); qué dice cada celda, puro | RF-9 |
| `src/app/api/panel/reportes/[pestana]+api.ts` | GET por pestaña y periodo | RF-3 a RF-21, RF-44 a RF-58 |
| `src/app/api/panel/reportes/exportar+api.ts` | GET → `.xlsx` de una pestaña | RF-9 |
| `src/app/api/panel/reportes/mantenimientos+api.ts`, `…/[id]/anular`, `…/[id]/resolver`, `…/intervalos+api.ts` | Registrar, anular, resolver, configurar | RF-24, RF-25, RF-29, RF-32 a RF-35 |
| `src/features/reportes/*.tsx` (nuevos) | Pantalla con encabezado de periodo, 7 pestañas, ventanas de mantenimiento e intervalos, vista para imprimir | RF-3 a RF-58 |
| `src/app/panel/reportes.tsx`, `src/app/panel/reportes/imprimir.tsx` | Rutas de la pantalla y de la versión para imprimir | RF-1, RF-10 |
| `src/shared/rules/whatsapp.ts` | `MantenimientoDelReporte` en `ReporteDelDia`; `resolverPropuesta` lee `mantenimientos`; faltas de la sección `mantenimientos` | RF-36 a RF-40 |
| `src/features/panel/contratos.ts` | `propuestaDeIa.mantenimientos` (opcional) y `reporteCorregido.mantenimientos` | RF-36 |
| `src/features/whatsapp/servidor/automatico.ts` + `mantenimientos.ts` (nuevo) | Guardar los mantenimientos del mensaje al procesarlo (como los viajes, sin esperar el día); apartar lo no reconocido | RF-36 a RF-42 |
| `src/features/whatsapp/servidor/excepciones.ts`, `no-se-pudo-guardar.tsx` | Completar o descartar un renglón de `mantenimientos` | RF-40 |
| `C:/dev/n8n-evolutionapi/scripts/generar_workflow_clasificar.py` | Esquema e instrucciones: `mantenimientos[]` con equipo, tipo, marca, clase, fecha, lectura, resuelto y descripción | RF-36 a RF-41 |

## Modelo de datos

**Servidor** (`esquema.ts`, migración `0027_*` con `npm run db:generate:servidor`):
- `mantenimiento_intervalos`:
  - columnas: `tipo_vehiculo_id` (FK), `clase` (`aceite`|`preventivo`), `cada` (double, > 0), `aviso_porcentaje` (int 50–99, 90 por defecto), `actualizado_por`, `actualizado_en`;
  - PK `(tipo_vehiculo_id, clase)`;
  - sin fila, vale el de arranque por clase de medidor (RF-23), definido en código: no hay que sembrar nada.
- `mantenimiento_intervalos_vehiculo`: igual, con PK `(vehiculo_id, clase)` (RF-25).
- `mantenimientos`:
  - columnas: `id`, `vehiculo_id`, `obra_id`, `clase` (`aceite`|`preventivo`|`correctivo`), `fecha` (date), `lectura` (double, nula solo si el vehículo no tenía lectura), `nota`, `origen` (`panel`|`whatsapp`), `mensaje_id` (FK nula), `registrado_por`, `creado_en`;
  - resolución: `resuelto_en`, `resuelto_por`, `nota_resuelto` (solo correctivo);
  - anulación: `anulado_en`, `anulado_por`, `motivo_anulacion` (check: anulado ⇒ motivo).
  - Índices: `(vehiculo_id, clase, fecha)` y `(obra_id, fecha)`.
  - Lo de WhatsApp lleva un id determinista de `(vehiculo, clase, fecha)` con `on conflict do nothing` (RF-42).

**Compatibilidad:** las tablas son nuevas y no tocan las existentes. La imagen anterior las ignora.

**Migración:** aditiva, se aplica antes de la imagen (`scripts/migrar-produccion.ts`).

## Algoritmo / reglas

**Periodo** (RF-4):
- `semana(fecha)`: del lunes al domingo que contienen la fecha (`diaDeLaSemana` de `festivos.ts`).
- `mes(fecha)`: del 1 al último día.
- `periodoVecino(p, ±1)` mueve un día, una semana o un mes.

**Uso de máquinas** (RF-11 a RF-21), `usoDeMaquinas({ partes, vehiculos, preoperacionales, dias })`:
1. Por cada día del periodo, el parte no anulado de la obra, o ninguno.
2. Por máquina (las vigentes de la obra ∪ las que aparezcan en algún parte), por día:
   - sin parte → `sin_bitacora`;
   - en el parte con `avanceDeMedidor > 0` → `si`, con el avance;
   - en el parte, sin lectura o con avance 0, o fuera del parte → `no`.
3. Operador: `operadorNombre` del parte; si no, el usuario del preoperacional vigente de esa máquina ese día; si no, `null` (RF-16).
4. Totales: suma del avance, días `si`, días `no`, y promedio por día `si`.

**Personal** (RF-44 a RF-50), `horasDelPersonal({ partes, dias })`:
- Por persona y día, `horasDeLaPersona(fecha, fila, parte.horario)` → laboradas, ED, EN y novedad.
- Avisos:
  - más de 120 min extra en un día (`MAXIMO_MINUTOS_EXTRA_POR_DIA`);
  - más de 12 h extra en una semana de lunes a domingo, contadas dentro del periodo.
- La persona se identifica por `usuarioId`, con el nombre y el cargo del parte más reciente.

**Mantenimiento** (RF-22 a RF-31):
1. `intervaloEfectivo(clase, tipoClaseMedidor, porTipo?, porVehiculo?)`: por vehículo, si no por tipo, si no el de arranque `{ horometro: { aceite: 250, preventivo: 500 }, odometro: { aceite: 5000, preventivo: 10000 } }` con aviso 90 %.
2. `estadoDeMantenimiento({ lecturaActual, ultimo, intervalo })`:
   - sin `ultimo` → `sin_registro`;
   - con `recorrido = lecturaActual − ultimo.lectura`:
     - < 0 → `revisar`;
     - ≥ `cada` → `vencido`, con «vencido hace N»;
     - ≥ `cada × aviso%` → `proximo`, con «en N»;
     - si no → `al_dia`.
3. La lectura actual es `vehiculos.odometro_km` / `horometro_h`, que ya suben al cerrar y al guardar desde WhatsApp.
4. El último servicio de cada clase es el no anulado de fecha más reciente. Un preventivo **no** reinicia el aceite: cada clase va por su cuenta.
5. Correctivo pendiente: hay uno no anulado sin `resuelto_en` (RF-29).
6. Fuera de servicio: el `estado` del vehículo (RF-30).
7. Orden (RF-31): correctivo pendiente → vencido → próximo → sin registro/revisar → al día.

**WhatsApp** (RF-36 a RF-43):
- La IA devuelve `mantenimientos: [{ equipo, tipo_equipo, marca, clase: 'aceite'|'preventivo'|'correctivo'|null, resuelto: bool, fecha_evento?, lectura?, unidad_medidor?, descripcion }]`.
- `resolverPropuesta` reconoce la máquina con `reconocerMaquina`, la misma de la bitácora (RF-39).
- En `procesarMensaje`/`dejarEnEspera`, antes de dejar en espera, `guardarMantenimientos`, como ya se hace con los viajes:
  - `resuelto: true` → marca resuelto el correctivo pendiente de esa máquina (RF-41); si no hay ninguno, no hace nada y no aparta;
  - sin máquina o sin clase → `apartar` con la sección `mantenimientos` (RF-40);
  - sin lectura → la registrada hasta ese día (`lecturasAnteriores(obra, fecha+1)` o la del vehículo) (RF-38);
  - inserta con id determinista (RF-42).
- Las notas no cambian (RF-43).

**Excel** (RF-9): `hojasDelReporte(pestana, datos)` puro → filas y columnas. `excel.ts` escribe con `exceljs`: números como números, encabezado con la obra y el periodo, y el nombre `reporte-<pestaña>-<obra>-<desde>-<hasta>.xlsx`.

**Imprimir** (RF-10): una ruta del panel `reportes/imprimir?pestana&obraId&tipo&fecha` sin el marco ni el menú, con la tabla en HTML simple, `@media print` (carta horizontal, `break-inside: avoid` en las filas) y `window.print()` al cargar.

## Decisiones técnicas

- **Los agregados se calculan en el servidor con reglas puras sobre el jsonb**, sin vistas SQL ni tablas de resumen. Se descartaron las tablas de resumen porque se desincronizan cuando se corrige una bitácora, y las bitácoras abiertas cambian (RF-7). Un mes son unas 30 filas de `partes_de_obra`; aplanar en TS cuesta poco y reutiliza `horasDeLaPersona` y `avanceDeMedidor` (RF-56).
- **Una ruta GET por pestaña**, y no una sola con todo. Cada pestaña lee lo suyo (Cantera no lee personal) y responde por separado, dentro de los 3 s.
- **Intervalos de arranque en código**, no sembrados en la base. Se descartó sembrar porque el sembrado de producción es un paso que se olvida (`docs/despliegue.md`); además un tipo de equipo nuevo hereda el de su clase sin hacer nada.
- **Los mantenimientos de WhatsApp se guardan al procesar el mensaje, sin esperar a que se arme el día.** Se descartó esperar al día porque el mantenimiento no es de la bitácora: no depende de que esté abierta o cerrada, como los viajes (024/RF-52).
- **Excel con `exceljs`**, como Almacén (`almacen-obra/servidor/excel.ts`), y no CSV: el CSV pierde los números en un Excel con coma decimal y las tildes según la configuración.
- **Imprimir con el diálogo del navegador**, sin generar PDF en el servidor. Se descartó una librería de PDF en el servidor: es pesada y el diálogo del navegador ya guarda como PDF.

## Impacto en la sincronización

Sin impacto en la sincronización: es el panel web y el servidor.

## Contrato de API

- `GET /api/panel/reportes/:pestana?obraId=&tipo=dia|semana|mes&fecha=YYYY-MM-DD`:
  - `pestana` ∈ `maquinas|mantenimiento|personal|actividades|cantera|calidad|clima`;
  - permiso `reportes:listar`; `obraId` lo usa solo la gerencia (RF-2);
  - 400 si el tipo o la fecha son inválidos;
  - responde `{ periodo: { desde, hasta, dias }, abiertas: string[], cifras, filas }`.
- `GET /api/panel/reportes/exportar?pestana&obraId&tipo&fecha` → `.xlsx` (`Content-Disposition: attachment`).
- `POST /api/panel/reportes/mantenimientos`:
  - cuerpo `{ vehiculoId, clase, fecha, lectura, nota }`, permiso `reportes:escribir`, el vehículo de la obra en alcance;
  - responde 201 `{ id, avisoLectura? }` (RF-33).
- `POST …/mantenimientos/:id/anular { motivo }` y `…/:id/resolver { fecha, nota }` → 200; 409 si ya estaba anulado o resuelto.
- `GET /api/panel/reportes/intervalos` y `PUT` `{ tipoVehiculoId | vehiculoId, clase, cada, avisoPorcentaje }`. El de tipo exige gerencia (`requerirAdmin`); el de vehículo, también (RF-24, RF-25).

## Estrategia de verificación

- **`scripts/verificar-reglas.ts`** (casos «030/»):
  - periodos (semana que cruza el mes, lunes y domingo);
  - `usoDeMaquinas` (sí, no, sin bitácora, operador del preoperacional, totales);
  - `horasDelPersonal` (reportadas y calculadas, avisos de 2 h y 12 h);
  - `cantidadesPorItem` y la «otra»;
  - `viajesAgrupados`, `calidadPorEnsayo`, `climaDelPeriodo`;
  - mantenimiento: arranque por clase, el de vehículo gana al de tipo, los 5 estados y el orden, la lectura mayor que la registrada;
  - `hojasDelReporte`;
  - lectura de `mantenimientos` en `resolverPropuesta` y sus faltas;
  - permisos del módulo.
- **Demo manual** en Chrome (dev, «Pruebas spec 018 (laboratorio)», que tiene bitácoras del 1 al 9-oct):
  - Máquinas en semana y mes con Sí/No;
  - registrar un aceite de PRUEBA-026-REC, ver «Al día» y luego, con un intervalo de prueba bajo, «Vencido»;
  - un correctivo y resolverlo;
  - Personal con extras;
  - Excel abierto con `exceljs` en el guion de prueba;
  - imprimir.
- **WhatsApp en dev:** un mensaje `PRUEBA-030-…` «se le cambió el aceite a la recicladora» → mantenimiento registrado; uno con un equipo inexistente → «No se pudo guardar».
- **n8n:** probar en el PC con la plantilla de mensajes reales (aceite, manguera reventada, «ya quedó reparada»). **Necesita créditos de Anthropic.**

## Riesgos

- **Sin créditos en la API**, la parte de n8n no se puede probar. El resto de la spec no depende de ella: va al final (T21–T22) y, si no hay créditos, se despliega lo demás y esa parte queda pendiente.
- **Lecturas viejas mal digitadas** dan estados raros. `revisar` lo evita para el caso negativo.
- **Una página para imprimir con un mes de 40 personas por 30 días es ancha.** En Mes se imprimen los totales y no la cuadrícula por día.
