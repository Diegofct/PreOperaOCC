# Validación — Spec 050, interfaz ordenada y responsive

> Fecha: 2026-11-18 · Rama `develop`, sin commitear · Sesión de Gerencia (Diego) en `localhost:8081`, con
> recuadros de 360, 390, 900, 1100, 1366 y 1920 px dentro de la página.

## Comandos (salida real)

```
> npm run verificar
1097 verificaciones correctas.          (33 son de la 050; 0 fallos; salida 0)

> npm run typecheck
> tsc --noEmit && tsc --noEmit -p tsconfig.scripts.json      (salida 0, sin errores)

> npm run lint
> expo lint                                                 (sin errores ni advertencias)
```

También: `npx expo export --platform web` salió sin errores (3 bundles, 31 rutas estáticas, 197 de API) y
`grep DATABASE_URL dist/client` no encontró nada. `git diff src/shared/rules/permisos.ts` está vacío.

Las líneas citadas son de `scripts/verificar-reglas.ts`. «Navegador» quiere decir visto en esta sesión; el detalle
está en las notas de ejecución de `tareas.md`, tarea por tarea.

## Recorrido RF por RF

### Menú lateral (H1)

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-1 | :22271 (menús por secciones); navegador T6 | verde |
| RF-2 | navegador T6: las secciones van abiertas, sin desplegar | verde |
| RF-3 | :22271 (toda entrada en una sección) | verde |
| RF-4 | :22271 (menú de obra) | verde |
| RF-5 | :22271 (menú de OCC) | verde |
| RF-6 | :22271 (menú de GeoLab) | verde |
| RF-7 | :22271 (menú de Elemental) | verde |
| RF-8 | :22271 (Asistente primero, sin sección) | verde |
| RF-9 | :22323 (ninguna sección vacía para ningún cargo) | verde |
| RF-10 | :22323 (con módulos apagados); navegador T6 (Consorcio Antioquia sin Calidad) | verde |
| RF-11 | navegador T7: raya entre secciones del menú plegado | verde |
| RF-12 | navegador T7 (al pasar el puntero) y demo del cierre: con el menú plegado, al mantener pulsada «Documentos» con eventos táctiles salió «Personal y archivo · Documentos», que se quitó al soltar sin navegar | verde |
| RF-67 | pruebas de la 049 (`cabeceraDelMenu`); navegador T6 | verde |
| RF-68 | navegador T6: «Cambiar de obra» debajo del nombre | verde |

### Formularios (H2)

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-13 | `EtiquetaDeCampo` (T9); navegador T9 | verde |
| RF-14 | la ayuda debajo del recuadro (039, se mantiene); navegador T9 | verde |
| RF-15 | `CampoPanel.altoEtiqueta` (T9); navegador T9: los recuadros de «Registrar una obra» empiezan a 308 px | verde |
| RF-16 | `Formulario` con `alignItems: 'flex-start'`; navegador T9 y T12 | verde |
| RF-17 | `ANCHOS_DE_CAMPO` en los lotes T13 a T18; :22492 (barrido) | verde |
| RF-18 | `CampoDeFecha` gana `obligatorio` (T13); ya no queda ningún «*» escrito a mano en una etiqueta (T18) | verde |
| RF-19 | navegador T10 y T38: el motivo debajo del campo | verde |
| RF-20 | `useIrAlPrimerError`; navegador T10: la vista subió hasta Código | verde |
| RF-21 | `EnVentana` y `position: sticky` (T11); navegador T11 a 1536 y 390 px | verde |
| RF-22 | navegador T12: renglón en tarjeta con «Renglón N» y Quitar | verde |
| RF-23 | navegador T12 a 1366 px: dos filas alineadas y «Va a» a lo ancho | verde |
| RF-24 | `useAnchoDeCampo` y `useAnchoSinMedida` dan `width: '100%'` por debajo de 768 (026, sin cambio) | verde |
| RF-25 | :22492 (ninguna fila de solo campos hecha a mano, ni `Acciones` con solo campos; en la versión anterior había 32) | verde |

### Encabezado (H3)

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-26 | `MarcoPantalla`; :22541 | verde |
| RF-27 | :22425 (`migasDelLugar`); :22541; navegador T19 y T23 («… › Recursos Humanos › Administradora (prueba 046)») | verde |
| RF-28 | :22425 (todo paso con ruta menos el último); navegador T19: «OCC» lleva al Asistente de OCC | verde |
| RF-29 | :22541; demo del cierre con «CONSORCIO VIAL MAGDALENA MEDIO 2026 — TRAMO 787 DE LA RUTA DEL SOL»: el paso mide 280 px y se lee «CONSORCIO VIAL MAGDALENA MEDIO 20…» (`text-overflow: ellipsis`) | verde |
| RF-69 | :22541; demo del cierre: al pasar el puntero sobre el paso recortado salió el nombre completo en la etiqueta oscura | verde |
| RF-30 | :22577, :22589, :22599, :22613 y la prueba del cambio de Diego (Plan semanal y Planificación); navegador T21, T22, T23 y, tras rehacer los flujos, Planificación de Consorcio Antioquia y Plan semanal de PRUEBA-043 (botones a la derecha del título y sus ventanas abren desde ahí) | verde |
| RF-31 | navegador (validación) a 390 px: «Subir documento» debajo de la descripción y a todo lo ancho (327 de 327). Se arregló en esta validación: los textos tenían alto cero en columna y el botón se montaba encima del título | verde |
| RF-32 | :22577 a :22613; demo del cierre como residente en PRUEBA-043: Control Cantera sin «Registrar viaje» y Laboratorio sin «Nuevo ensayo» (no los puede hacer), y Documentos con «Subir documento» (sí puede) | verde |

### Tablas como tarjetas (H4)

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-33 | :22645; navegador T25 (personal a 390 px) | verde |
| RF-70 | :22645; navegador T26 (a 1100 px: personal en tarjetas y vehículos en tabla) | verde |
| RF-71 | :22681 (cinco tablas `cuadricula`); navegador T30 (rubros del presupuesto a 390 px). La granulometría y las filas del parte no usan `Tabla` y no cambiaron | verde |
| RF-72 | navegador T30: los rubros con su barra de desplazamiento dentro del marco | verde |
| RF-34 | :22628; `celdaPrincipal`; navegador T25 | verde |
| RF-35 | :22628; navegador T25 (Cargo, Empresa, Obra, Estado… con su título) | verde |
| RF-36 | :22628; navegador T25 («Ficha» al pie) | verde |
| RF-37 | :22628 (sin columna de botones, sin pie) | verde |
| RF-38 | navegador T27: el orden escogido en tarjetas se veía como «Cargo ▲» a 1366 | verde |
| RF-39 | :22658; navegador T27 | verde |
| RF-40 | `onLayout` en `Tabla`; navegador T26 (cambiar el ancho del recuadro de 1600 a 900 y de vuelta) | verde |
| RF-73 | navegador T26: la búsqueda «prueba» siguió escrita y aplicada en los dos sentidos | verde |
| RF-41 | :22645; navegador T26 | verde |

### Pantallas grandes (H5)

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-42 | :22261, :22558; navegador T20 (personal: 1600 px a 1920) | verde |
| RF-43 | :22261, :22558; navegador T20 (ficha: 1100 px a 1920) | verde |
| RF-44 | tarjetas en lugar de desplazamiento (RF-70); revisión a 360 px en cinco pantallas | verde |
| RF-74 | :22673; navegador T28 (cabecera de 1598 px sin hueco a 1920) | verde |

### Aspecto (H6)

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-45 | solo tokens de `paleta.ts`; ningún color nuevo | verde |
| RF-46 | :22694; navegador T31 (borde de 0 px en las tarjetas) | verde |
| RF-47 | :22694; navegador T31 (OCC con `0 4px 12px` al pasar el puntero) | verde |
| RF-48 | :22704, :22736, :22751; navegador T33 y T34 | verde |
| RF-75 | :22736, :22751 (ningún selector «Estado» o «Resultado» en las siete listas) | verde |
| RF-76 | :22736 («Solo urgentes»); las casillas de vencidos y anulados no se tocaron | verde |
| RF-77 | :22728 («…» mientras carga) | verde |
| RF-49 | :22728; navegador T33 («Enviada»: 10 de 24) | verde |
| RF-50 | :22728; navegador T33 (pulsarla otra vez vuelve a 24) | verde |
| RF-51 | :22728 (borde y «✓»); navegador T33 | verde |
| RF-52 | :22704 (25 filas, búsqueda y filtro de obra, páginas de 10); navegador T33 y T34 (las cifras suman el total) | verde |
| RF-53 | :22790; navegador T36 (Gerencia: ícono, frase y «Nueva requisición de compra»); demo del cierre como residente: el vacío de Laboratorio sale con ⚗ y la frase, sin «Nuevo ensayo». El almacenista no entra a Documentos (sin acceso), así que la demo se hizo con el residente, que ve la lista pero no crea | verde |
| RF-54 | :22767; navegador T35 («0 de 77» y «No hay resultados con estos filtros») | verde |
| RF-78 | :22767; navegador T35 («Quitar los filtros» devolvió los 77) | verde |

### Avisos

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-55 | :22835; navegador T39 («Requisición RQ-0024 aprobada.» con la decisión interceptada) | verde |
| RF-56 | :22800; :22261 (`DuracionDeAviso = 4000`); navegador T37 | verde |
| RF-57 | :22812, :22824, :22846; navegador T37 y T38 (red cortada en «Corregir a…») | verde |
| RF-79 | :22812, :22824; navegador T38 (cédula repetida debajo de Documento, sin aviso) | verde |
| RF-80 | :22824; navegador T38 (la ventana siguió abierta con lo escrito) | verde |
| RF-81 | :22800 (el proveedor está en `marco-sesion`, por encima del `Stack`) | verde |
| RF-82 | navegador T38: el aviso abajo a la izquierda, con los botones del pie a la derecha y a la vista | verde |
| RF-58 | :22800; navegador T37 (el más nuevo encima) | verde |
| RF-59 | :22800 (ningún «Deshacer» en el código) | verde |
| RF-60 | :22800 (✓ o ✕ con su texto) | verde |

### Cambio de contraseña (H7)

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-61 | :22864; navegador T41 (Requisiciones con «cemento», 3 de 24, intacto al cancelar; el título vuelve) | verde |
| RF-62 | no aplica: el cambio por gusto no tiene dirección propia, es un estado de la sesión, así que no hay enlace directo desde el que llegar | verde (no aplica) |
| RF-83 | :22864 (el obligatorio, en lugar del panel y sin «Cancelar») | verde |

### El Asistente como portada (H8)

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-84 | :22369, :22399; navegador T8 | verde |
| RF-85 | :22399 (`portadaDelMenu` sin Asistente) | verde |
| RF-86 | :22425, :22468 (ningún `.tsx` nombra el Resumen del día) | verde |
| RF-87 | navegador T8: `/panel/proyectos/<obra>` lleva a `…/asistente` | verde |
| RF-88 | :22369 (Gerencia, a las tarjetas); navegador T31 (`/panel`) | verde |
| RF-89 | :22369 | verde |
| RF-90 | :22369; casos de la 033 a la 046 ajustados en la T3 y la T4 (líneas 11898, 11923, 12569, 12584) | verde |

### Lo que no cambia

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-63 | `git diff src/shared/rules/permisos.ts` vacío | verde |
| RF-64 | revisión a 360 px en cinco pantallas (Requisiciones, Recursos Humanos, Vehículos, Bitácoras, Documentos): sin desplazamiento lateral ni nada fuera del borde. Se arregló `Etiqueta`, que se salía | verde |
| RF-65 | la misma revisión: ningún control por debajo de 40 px. Se arreglaron los pasos de la ruta (17 → 44 px) | verde |
| RF-66 | ningún `prefers-color-scheme` ni `useColorScheme` en el panel | verde |

**Cuenta:** 90 de 90 en verde. Las demos de cargo y de nombre largo se hicieron sin cambiar datos ni contraseñas: el panel se cargó en un recuadro cuyo `fetch` se parcheó en la página para devolver otra sesión o un nombre de obra largo; el servidor siguió viendo la sesión de Gerencia.

## Alcance

- **Nada fuera de la spec** salvo lo necesario para cumplirla, anotado en las notas de cada tarea:
  - `ProveedorObraDelLugar`, para no pedir tres veces la lista de obras;
  - el portal propio de los avisos;
  - `conCampos` en los dos hooks;
  - la Bandeja de WhatsApp pide sus seis estados a la vez.

  Ninguno cambia comportamiento fuera de lo que piden los RF.
- **Fuera de alcance, sigue fuera:**
  - la app del operador, el esquema, las migraciones y `package.json`: 0 cambios;
  - permisos: sin cambios;
  - modo oscuro: no hay;
  - «Deshacer»: no hay;
  - cifras de estado solo en las siete listas que ya filtraban por estado;
  - ningún tablero nuevo en lugar del Resumen del día;
  - las páginas para imprimir no se tocaron;
  - las columnas de las tablas en el computador conservan su texto y su orden.
- **Documentos en carpetas** sigue siendo de la 051.

## Constitución

1. **Local-first:** la app del operador no se tocó.
2. **La spec manda:** las desviaciones del plan están anotadas, y ninguna cambia lo que piden los RF.
3. **Una regla, un solo sitio:** las decisiones nuevas viven en funciones puras con su prueba: `partesDeLaTarjeta`,
   `seMuestraEnTarjetas`, `crecimientoDeColumna`, `contarPorEstado`, `pulsacionesPara`, `repartirFallo`,
   `migasDelLugar`.
4. **Nada se borra:** no hay bajas nuevas. En las pruebas en el navegador no se guardó ningún dato: se interceptó
   `fetch` y se comprobó después.
5. **Puerta de calidad:** los tres comandos están en verde en cada tarea.
6. **Fronteras duras:** el export web no tiene secretos.
7. **Español y diseño de campo:** todo va en español y los tamaños nuevos son tokens (`AnchoListado`,
   `AnchoFormulario`, `DuracionDeAviso`, `AnchoMaximoDeMiga`, `AnchoCrecenColumnas`, `AnchoDeAviso`,
   `AltoDeControlAngosto`). Queda un `z-index` escrito en `capa-de-avisos.web.tsx`, con su comentario.
8. **Sin dependencias nuevas:** `react-dom` ya estaba en `package.json`, y se declaró solo `createPortal` en
   `src/tipos-globales.d.ts`, en vez de añadir `@types/react-dom`.

## Veredicto

**Sí, la spec 050 está cumplida.** Los 90 RF están en verde, los tres comandos pasan (1097 verificaciones, tipos y
lint), el export web sale sin secretos, los permisos no cambiaron y lo que estaba fuera de alcance sigue fuera.

RF-30 se resolvió a pedido de Diego, rehaciendo los flujos de Plan semanal y Planificación. Las cuatro demos
manuales se hicieron en el cierre:
- RF-12: la pulsación larga en el menú plegado;
- RF-29 y RF-69: el nombre de obra largo, recortado y completo al pasar el puntero;
- RF-32 y RF-53: los botones según el cargo, en un recuadro con la sesión cambiada en la página.
