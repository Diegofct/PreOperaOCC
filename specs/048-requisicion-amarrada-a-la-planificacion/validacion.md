# Validación — Spec 048, requisiciones de obra amarradas a la planificación

> Fecha: 2026-11-17 · Base: `neondb` (desarrollo), servidor de Diego en `localhost:8081`, obra **PRUEBA-043 Magdalena** (planificación v8 y, desde el paso 6 de la demo, v9) · `npm run verificar` (1049), `npm run typecheck` y `npm run lint` en verde · `npx expo export --platform web` sin errores y sin secretos en `dist/client`.

**Veredicto: CUMPLIDA — 66/66 RF, con dos observaciones** (RF-56 y el requisito no funcional de tiempo, abajo).

Comprobaciones:
- **P** = prueba «048/» en `scripts/verificar-reglas.ts`.
- **V** = en vivo contra `neondb`, llamando las rutas `+api.ts` en el mismo proceso con la sesión de una cuenta de prueba (`scripts/_t8` a `_t16-048.mts`).
- **N** = en el navegador (Chrome sin ventana contra el 8081).
- **B** = en la base.
- **C** = revisando el código.

Cuentas de prueba: `prueba-044-res` (Residente), `prueba-044-alm` (Almacenista), `prueba-044-do` (Director de Obra), `prueba046.dp` (Director de Proyectos), `prueba047.administradora`, y `prueba046.residente` (otra obra).

## A qué se imputa

| RF | Qué | Cómo se comprobó | Resultado |
| --- | --- | --- | --- |
| RF-1 | Solo las de obra | C: `deObra` en crear, corregir y decidir; V: decidir con imputación en una de GeoLab → 422 por código | ✅ |
| RF-2 | Cada renglón de compra se imputa | P; V: sin imputar → 422 «Diga a qué parte… renglón 1»; N: la falta junto a «Va a» | ✅ |
| RF-3 | La de pago se imputa | P; V: RQ-0021 imputada a un rubro | ✅ |
| RF-4 | «Fuera» pide explicación | P; V: explicación en blanco → 422 «Explique por qué el renglón 1…»; N: el campo aparece con su falta | ✅ |
| RF-5 | Sin imputación no se envía | P; V; N | ✅ |
| RF-6 | Solo opciones de las vigentes | P; V: 158 opciones de la v8 (41 ítems, 5 rubros, 111 indirectos, 1 mano de obra) | ✅ |
| RF-54 | Frente sin planificar → «Fuera» | P (la opción «Fuera» siempre está) ; C | ✅ |
| RF-7 | Número y descripción, o concepto | P; N: «2.8 · Demolición…», «Rubro · PLAN DE…», «Seguros y garantías · Polizas definitivas» | ✅ |
| RF-46 | Buscar; capítulo y frente al lado | P; N: escribir «2.8» y «manejo» encuentra la opción, con capítulo y frente debajo | ✅ |
| RF-8 | Sin planificación: pide igual, con aviso | P; V: RQ-0022 en PRUEBA-046 guardada `sin_planificacion`; N: el formulario muestra «Sin planificación aprobada» | ✅ |
| RF-9 | Almacenista sin valores ni cifras | P; V: opciones sin `planeado`/`comprometido`, detalle sin cifras, historia sin valores; N: su formulario sin valor ni cifras | ✅ |
| RF-10 | Corregir propone lo anterior | P (`imputacionPropuesta`); C: el formulario de compra y el de pago arrancan con la imputación de cada renglón | ✅ |
| RF-55 | Opción que ya no está → no deja enviar | P; V: llave inexistente → 422 «Lo que tenía el renglón 3 ya no está…» | ✅ |

## Valor de cada renglón

| RF | Qué | Cómo se comprobó | Resultado |
| --- | --- | --- | --- |
| RF-11 | Valor estimado por renglón | V y B: RQ-0019 con 500 000 y 70 000 | ✅ |
| RF-12 | Sin valor no se envía | P; V: 422 «Diga el valor estimado del renglón 1…» | ✅ |
| RF-13 | El Almacenista envía sin valores | P; V: RQ-0020 y RQ-0026 entran sin valor aunque se mande uno | ✅ |
| RF-14 | El primer paso escribe el valor | P; V: el Residente completa RQ-0020; N: la ventana de aprobar pide el valor de cada renglón (RQ-0026) | ✅ |
| RF-15 | Sin el valor no se aprueba | P; V: 422 «Diga el valor estimado del renglón 1 antes de aprobar»; N: el aviso en la ventana | ✅ |
| RF-16 | La historia anota el valor escrito | P; V: evento con `valoresEstimados` | ✅ |
| RF-17 | No cambia un valor que ya estaba | P | ✅ |
| RF-18 | La cabecera es la suma | P; V: RQ-0019 = 570 000; N: «Valor estimado: $ 360.000 (la suma de los renglones)». **Arreglado en la demo:** completar valores al aprobar no actualizaba la cabecera; ahora sí (RQ-0027: vacía → 210 000) | ✅ |

## Lo comprometido

| RF | Qué | Cómo se comprobó | Resultado |
| --- | --- | --- | --- |
| RF-19 | Enviadas sí; devueltas, canceladas y rechazadas no | P | ✅ |
| RF-56 | Cancelada con compra: lo comprado sigue | P | ✅ con observación |
| RF-20 | Sin compra cuenta el estimado | P; V | ✅ |
| RF-21 | Con compra cuenta el real | P; V: RQ-0025 pasa de 300 000 estimado a 320 000 real en el ítem 2.8 | ✅ |
| RF-57 | El estimado se conserva | B: `valor_estimado` no cambia al registrar la compra; C: el detalle lo sigue mostrando | ✅ |
| RF-47 | Compra a varias partes pide valor por renglón | P; V: RQ-0019 sin valores → 422; N: la ventana pide «Cuánto es de cada renglón» (RQ-0025) | ✅ |
| RF-48 | Que no suman → no registra | P; V; N: «suman $ 370.000: faltan $ 10.000» | ✅ |
| RF-49 | Una sola parte → no pide nada | P; V: RQ-0023 registrada sin valores, `valor` nulo | ✅ |
| RF-22 | Compra anulada → vuelve el estimado | P | ✅ |
| RF-58 | Anulada en una cancelada → no cuenta | P | ✅ |
| RF-23 | Pago en la cadena cuenta lo pedido | P; V: RQ-0021 cuenta 900 000 en el rubro | ✅ |
| RF-59 | Pago aprobado cuenta lo aprobado | P | ✅ |
| RF-24 | Renglón quitado no cuenta | P | ✅ |
| RF-60 | Cantidad rebajada cuenta en proporción | P | ✅ |
| RF-25 | Lo de antes de la 048 no cuenta | P; C: la lectura solo toma renglones con imputación | ✅ |

## Lo que se ve al pedir y al aprobar

| RF | Qué | Cómo se comprobó | Resultado |
| --- | --- | --- | --- |
| RF-26 | Costo planeado | P; V; N: «Planeado $ 12.870.890» | ✅ |
| RF-61 | Ya comprometido sin esta requisición | P; V; N. **Arreglado en la demo:** la ventana de aprobar contaba la propia requisición; ahora la descuenta (RQ-0024: 895 000 y no 13 895 000) | ✅ |
| RF-62 | Lo que queda | P; V; N | ✅ |
| RF-27 | Cómo se calcula lo planeado | P (ítem 7 000 000, rubro con su costo, indirecto con su total) | ✅ |
| RF-28 | «Se pasa de lo planeado» con cuánto | P; V: exceso 2 674 110 que cuadra con las tres RQ del ítem; N | ✅ |
| RF-29 | Sin precio de costo, sin aviso | P | ✅ |
| RF-30 | «Fuera» con su explicación en cada paso | P; N: en la tabla del detalle y en la historia de cada aprobación | ✅ |
| RF-31 | Marca en la lista y la bandeja | V; N: «Se pasa de lo planeado» en RQ-0019, 0020, 0024 y 0025, en la lista de la obra y en la bandeja | ✅ |
| RF-32 | Ningún aviso bloquea | V y N: RQ-0023, 0024 y 0025 se enviaron y aprobaron con avisos | ✅ |
| RF-33 | Se calcula al abrir | C: nada se guarda; V: la misma RQ cambia de cifras tras otras requisiciones y compras | ✅ |
| RF-63 | Los avisos de cada aprobación en la historia | P; V; N: «Aprobada con aviso. Renglón 1: Se pasa de lo planeado por $ 994.110.» en cada paso | ✅ |
| RF-34 | Cifras a quien ve valores | V: Residente, Director de Obra, Director de Proyectos y Administradora sí; Almacenista no | ✅ |
| RF-35 | Mano de obra indirecta, una opción | P; V: 1 opción con 4 695 599 547 | ✅ |

## Cambiar la imputación

| RF | Qué | Cómo se comprobó | Resultado |
| --- | --- | --- | --- |
| RF-36 | La Administradora en su paso | V: RQ-0023 reimputada al rubro; N: RQ-0025, renglón 2 de «Fuera» al rubro de tránsito | ✅ |
| RF-64 | La Gerencia en cualquier paso | P (`puedeRecortar`) | ✅ |
| RF-37 | Queda en la historia, con la anterior visible | V; N: «Renglón 2: cambió de «Fuera de lo planeado» a «Rubro · PLAN DE MANEJO DE TRANSITO…»» | ✅ |
| RF-38 | Los demás no la cambian | P; V: el Director de Obra → 422 «…Si no le cuadra, devuélvala.»; N: su ventana no la ofrece | ✅ |

## Cambio de versión

| RF | Qué | Cómo se comprobó | Resultado |
| --- | --- | --- | --- |
| RF-39 | Lo comprometido sigue a la opción | P; V: v9 aprobada; el ítem 2.8 sigue en 13 885 000 antes y después | ✅ |
| RF-65 | Qué es «la misma» opción | P (incluido el desempate `|#2` de dos renglones iguales en la v8) | ✅ |
| RF-40 | Opción que ya no está → «Sin ítem» | V: RQ-0028 imputada a «Polizas definitivas», que la v9 no tiene: aviso `sin_opcion` | ✅ |
| RF-41 | La imputación guardada no cambia | V: RQ-0028 conserva «Seguros y garantías · Polizas definitivas» | ✅ |

## Resumen por obra

| RF | Qué | Cómo se comprobó | Resultado |
| --- | --- | --- | --- |
| RF-42 | Resumen por opción | P; V; N: «Lo comprometido por las requisiciones» en la v8 | ✅ |
| RF-50 | Lo que se pasa, resaltado | P; N: aviso arriba y etiqueta en la fila del 2.8 | ✅ |
| RF-51 | Aparte «Fuera» y «Sin ítem» | P; V: v9 con «Sin ítem» 1 000 000 (RQ-0028); N: «Fuera de lo planeado: $ 90.000» | ✅ |
| RF-52 | Abrir las requisiciones | N: el enlace RQ-0025 abre su detalle. **Arreglado en la demo:** con la navegación dentro de la app la pantalla no leía el parámetro; ahora lo toma del router | ✅ |
| RF-53 | Quién lo ve | V: Director de Obra y Director de Proyectos 200; Almacenista y Residente 403 | ✅ |
| RF-66 | Mano de obra indirecta en una fila | P; V; N | ✅ |

## Reglas transversales

| RF | Qué | Cómo se comprobó | Resultado |
| --- | --- | --- | --- |
| RF-43 | El servidor comprueba | V: cada 422 y 403 de arriba sale del servidor; la etiqueta se rearma desde la opción vigente | ✅ |
| RF-44 | Una sola regla | C: `rules/requisicion-planificacion.ts` la usan el servidor y las tres pantallas | ✅ |
| RF-45 | Dos a la vez: 409 | C: imputaciones y valores viajan en la misma decisión, bajo `tomarLaVersion` de la 046 | ✅ |

## Requisitos no funcionales

- **Tiempo:** el detalle de una requisición de 30 renglones (RQ-0029) respondió en 917, 952 y 900 ms, dentro del umbral de 2 segundos. *Observación:* se midió con la planificación real de PRUEBA-043 (41 ítems y 160 renglones indirectos), no con dos planificaciones de 400 ítems y 60 renglones como dice la spec. Hoy una obra no puede tener dos vigentes.
- **Ancho:** la tabla de planificación del detalle (1 228) y la del resumen (1 262) caben en 1 280, sin desplazarse en el navegador.
- **Idioma y pesos:** español; pesos con separador de miles.

## Observaciones

1. **RF-56 no se puede producir hoy en vivo.** Una requisición con compra registrada ya está Aprobada o Comprada. La 046 solo deja cancelar o rechazar antes de aprobar (046, RF-37; 036, `DESDE`). La regla lo cubre por si eso cambia, con prueba en `verificar-reglas.ts`.
2. **Tres fallos encontrados y arreglados durante la demo:**
   - la cabecera al completar valores (RF-18);
   - «ya comprometido» en la ventana de aprobar (RF-61);
   - el enlace del resumen (RF-52).
   Además, el texto de la historia de la 036 y la 037 tomaba los cambios de la 048 como cantidades («renglón undefined de NaN a NaN»); ya los separa.
3. **Hecho sobre el modelo:** hoy hay a lo sumo una planificación vigente por obra. D12 («una por frente») se resuelve en esa sola, y la regla ya recibe una lista.

## Datos que quedaron en `neondb` (solo desarrollo)

- **RQ-0019 a RQ-0029.** La RQ-0022 es de PRUEBA-046; las demás, de PRUEBA-043.
- **La v9 de la planificación de PRUEBA-043**, copia de la v8 sin el renglón «Polizas definitivas». Es la vigente ahora.
- **Las cuentas `prueba-044-*`, `prueba046.dp`, `prueba046.residente` y `prueba047.administradora`**, con contraseñas repuestas. Las nuevas están en la carpeta temporal de la sesión.

Nada de esto va a producción.
