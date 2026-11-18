# Validación — Spec 049, marca Kontrola y logos de las empresas

> Fecha: 2026-11-18 (primera versión y revalidación del cambio del mismo día: logos, ícono de Proyectos y cards centradas) · Base: `neondb` (desarrollo), servidor de Diego en `localhost:8081`, sesión de Diego (Gerencia) en su Chrome con la extensión de Claude · `npm run verificar` (1064), `npm run typecheck` y `npm run lint` en verde · `npx expo export --platform web` sin errores y sin `DATABASE_URL` en `dist/client` (T18).

**Veredicto: CUMPLIDA — 56/56 RF vigentes** (RF-1 a RF-57; RF-18 retirado por el cambio del 2026-11-18), con cinco observaciones al final.

Comprobaciones:
- **P** = prueba «049/» en `scripts/verificar-reglas.ts` (11 pruebas nuevas y 3 actualizadas).
- **N** = en el navegador de Diego.
- **D** = descarga real desde el panel con la sesión de Diego, abierta en la página (autor, pie de página de impresión, celdas).
- **C** = revisando el código.

## Barra superior

| RF | Qué | Cómo se comprobó | Resultado |
| --- | --- | --- | --- |
| RF-1 | «Grupo HS» en la barra | P; N a 1366 px | ✅ |
| RF-2 | «KONTROLA» a la derecha | P; N: «Grupo [HS] │ KONTROLA» | ✅ |
| RF-3 | A menos de 768 px, solo «Grupo HS» | P; N en un recuadro de 390 px: ☰, «Grupo [HS]» y botones con ícono | ✅ |
| RF-4 | Sin el logo de OCC | P; N | ✅ |

## Ingreso y cambio de contraseña

| RF | Qué | Cómo se comprobó | Resultado |
| --- | --- | --- | --- |
| RF-5 | «Grupo HS» como logotipo principal | P; N en la tarjeta de acceso (vista desde «Cambiar contraseña», que usa la misma `TarjetaDeAcceso` que el ingreso) | ✅ |
| RF-6 | «KONTROLA» debajo | P; N | ✅ |
| RF-7 | «Gestión de obras y empresas» debajo | P; N | ✅ |
| RF-8 | La misma cabecera en el cambio de contraseña | N | ✅ |
| RF-9 | Sin el logo de OCC | P | ✅ |

## Pestaña del navegador

| RF | Qué | Cómo se comprobó | Resultado |
| --- | --- | --- | --- |
| RF-10 | Fuera de una empresa, «<página> · Kontrola» | P; N: «Kontrola» en `/panel`, «Informe de granulometría · Kontrola» | ✅ |
| RF-11 | Dentro de una empresa, «<página> · <empresa>» | P; N: «Vehículos · OCC», «Recursos Humanos · Elemental Ingeniería y Arquitectura» | ✅ |
| RF-12 | Sin sesión, «Ingresar · Kontrola» | P (`tituloConSistema('Ingresar')`); C (`marco-sesion.tsx`) | ✅ |
| RF-13 | Cambiando la contraseña, «Cambiar contraseña · Kontrola» | N: por gusto pasa de «Asistente · Elemental…» a «Cambiar contraseña · Kontrola» y al cancelar vuelve. **Se corrigió en la T14**: antes solo cambiaba en el cambio obligatorio | ✅ |
| RF-43 | Dentro de una obra, «<página> · Proyectos» | P; N: «Resumen del día · Proyectos» | ✅ |
| RF-50 | Lista de obras, «Proyectos» | P; N | ✅ |
| RF-14 | K amarilla sobre grafito | P; N: el dibujo a 128, 32 y 16 px; Diego la vio en una pestaña suya | ✅ |

## Cards de las empresas

| RF | Qué | Cómo se comprobó | Resultado |
| --- | --- | --- | --- |
| RF-15 | Marca encima del nombre en cada card | P; N | ✅ |
| RF-16 | OCC con su logo | P; N: el recortado, sin deformarse | ✅ |
| RF-17 | Sin logo, el nombre como logotipo | P; C: queda para una empresa nueva; desde el cambio ninguna de las tres está en ese caso. Se vio en la primera versión con Elemental y Geolab | ✅ |
| ~~RF-18~~ | *Retirado (D15)* | — | — |
| RF-19 | Proyectos con su ícono | P; N: el de RF-53 | ✅ |
| RF-20 | Se conserva función, saldo y obras activas | P; N: «Sin información financiera», «6 obras activas», centrados | ✅ |
| RF-51 | Logo de Elemental en card y menú | P; N: card, menú abierto y plegado | ✅ |
| RF-52 | Logo de GeoLab con su fondo y esquinas redondeadas | P; N: insignia nítida en la card (64 px), el menú (56) y el plegado (40), nunca más grande que su archivo | ✅ |
| RF-53 | Ícono propio de Proyectos, el mismo en card, menú y «Cambiar de obra» | P; N: grúa sobre un edificio en obra, en los tres lugares | ✅ |
| RF-54 | Marca centrada en la card | P; N a 1366 px y en un recuadro de 390 px | ✅ |
| RF-55 | Franja del mismo alto: nombres a la misma altura | P; N: los cuatro nombres alineados | ✅ |
| RF-56 | Nombre y función centrados | P; N | ✅ |
| RF-57 | Sin más de 5 % de blanco alrededor | Medido con Pillow: Elemental 1,0/2,8/0,9/2,8 %, OCC 1,0/1,8/1,0/1,8 %; GeoLab sin blanco (su fondo es la insignia) | ✅ |

## Menú lateral

| RF | Qué | Cómo se comprobó | Resultado |
| --- | --- | --- | --- |
| RF-21 | Logo de la empresa en la cabecera | P (`cabeceraDelMenu`); N: OCC | ✅ |
| RF-22 | Sin logo, el nombre como logotipo | P; N: Elemental | ✅ |
| RF-23 | En una obra, el ícono de Proyectos | P; N | ✅ |
| RF-24 | El nombre de la obra debajo | P; N: «PRUEBA-043-C primera aprobación» | ✅ |
| RF-25 | Plegado, la marca en pequeño | P; N: logo de OCC pequeño, «E» de Elemental | ✅ |
| RF-26 | Portada de Gerencia: «Empresas», sin logo | P; N | ✅ |
| RF-27 | El mismo logo en card y menú | P (un solo catálogo, `logos.ts`); C | ✅ |
| RF-42 | Nombre de obra en hasta dos líneas y «…» | P; N con un nombre largo puesto solo en la página | ✅ |
| RF-44 | Lista de obras: ícono y «Proyectos» | P; N | ✅ |

## Documentos generados

| RF | Qué | Cómo se comprobó | Resultado |
| --- | --- | --- | --- |
| RF-45 | Qué es «documento generado» | C: los 7 Excel que se descargan, el PDF y el Word del Asistente (que también arman el informe de cumplimiento), y las 3 páginas para imprimir (informe de granulometría, reportes, respuesta del Asistente) | ✅ |
| RF-28 | Se conserva la marca de la empresa | N: el informe de granulometría conserva el logo de GeoLab; D: el Excel de la requisición de OCC conserva su formato | ✅ |
| RF-29 | Línea de Kontrola al pie, con marca de empresa | D: Excel de RQ-0014 de OCC, 1/1 hojas; N: el informe de granulometría bajo las firmas | ✅ |
| RF-33 | …y también sin marca de empresa | P; D: Excel del cumplimiento de PRUEBA-043, 5/5 hojas; PDF, 4/4 páginas | ✅ |
| RF-46 | En Excel, en el pie de página de impresión, nunca en celdas | P; D: `oddFooter` en cada hoja y ninguna celda con «Kontrola» | ✅ |
| RF-47 | Reimportar lee igual | P: escrito y vuelto a leer con `hojasDelLibro`, el lector de las importaciones (3 filas, sin la marca) | ✅ |
| RF-48 | En PDF, Word e impresas, al pie de cada página | P (PDF contado por página; Word con pie referenciado por la sección; impresas en la caja de margen de `@page`); D: PDF del cumplimiento 4/4 | ✅ |
| RF-30 | Autor «Kontrola · Grupo HS» | P (Excel, PDF, Word); D: los dos Excel y el PDF | ✅ |
| RF-31 | Encabezado del Asistente «Grupo HS · Kontrola» | P | ✅ |
| RF-32 | Impresión del Asistente: «Asistente · Kontrola» | P (lee `imprimir.ts`) | ✅ |

## Asistente

| RF | Qué | Cómo se comprobó | Resultado |
| --- | --- | --- | --- |
| RF-34 | Se presenta como el de Kontrola, del Grupo HS | P | ✅ |
| RF-35 | El Grupo HS, dueño de las cuatro | P | ✅ |
| RF-49 | «¿Quién eres?» nombra a Kontrola y al Grupo HS | N: «Soy el Asistente de Kontrola, el sistema del Grupo HS. El Grupo HS es dueño de: Elemental…, OCC…, Geolab…, las obras…» | ✅ |

## Reglas transversales

| RF | Qué | Cómo se comprobó | Resultado |
| --- | --- | --- | --- |
| RF-36 | Ninguna pantalla con el nombre viejo | P: barrido de `src/` sin comentarios ni la app del operador | ✅ |
| RF-37 | Ningún archivo generado con el nombre viejo | P: el mismo barrido; no queda ningún `creator` propio | ✅ |
| RF-38 | OCC sigue siendo OCC | N: card, menú, pestaña «… · OCC» | ✅ |
| RF-39 | «KONTROLA» en logotipos, «Kontrola» en texto | P | ✅ |
| RF-40 | No cambia ningún registro | C: sin cambios de esquema ni de datos; la única escritura de la demo fue la conversación de prueba del Asistente | ✅ |
| RF-41 | La app del celular no cambia | P; C: `app.json` sin tocar, «PreOpera OCC» en el operador | ✅ |

## Requisitos no funcionales

| Qué | Cómo se comprobó | Resultado |
| --- | --- | --- |
| Llega un logo: una sola entrega, sin rehacer pantallas | C: `LogotipoGrupo` (grupo) y `logos.ts` (empresas) son el único sitio | ✅ |
| Logo de hasta 2048 px sin deformarse | N: el de OCC (2048×1184) con `contain` en card, menú y plegado | ✅ |
| La marca se lee completa a 390 px | N | ✅ |

## Observaciones

1. **El ícono no se ve en las pestañas que maneja Claude.** La extensión de Claude en Chrome pone ahí su propio ícono (una flecha naranja). En una pestaña normal sale la K; Diego lo confirmó.
2. **Firefox no imprime la línea en el margen** de los reportes y de la respuesta del Asistente (no conoce las cajas de margen de `@page`). Ahí la línea queda solo al final, en pantalla. Chrome y Edge la imprimen en cada página.
3. ~~**El logo de OCC se ve pequeño en el menú**~~: resuelto en el cambio del 2026-11-18 (recorte y caja de 56 px).
4. **Fuera de esta spec, para la 050:** al cancelar un cambio de contraseña hecho por gusto, el panel vuelve al inicio en vez de a la pantalla donde se estaba. Ya pasaba antes de la 049.
5. **Elemental plegado se ve muy pequeño** (40×14 px): su logo es muy apaisado y el riel plegado solo tiene un cuadro de 40. Se reconoce por el color; si se quiere más grande, haría falta una versión cuadrada del logo (solo el símbolo azul), que tendría que entregar Diego.

Datos que dejó la demo en `neondb`: una conversación del Asistente de Diego, «¿Quién eres y de qué grupo es este sistema?». Ningún otro registro.

El cambio del 2026-11-18 no escribió nada en la base: solo archivos de `assets/` nuevos (los recortados) y código.
