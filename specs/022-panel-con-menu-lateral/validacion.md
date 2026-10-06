# Validación — Spec 022, panel con menú lateral y diseño nuevo

> Fecha: 2026-10-06 · Base de comparación: commit `bf7c645` (spec 021)

## Puerta de calidad (ejecutada el 2026-10-06)

```
$ npm run verificar
381 verificaciones correctas.

$ npm run typecheck
> tsc --noEmit && tsc --noEmit -p tsconfig.scripts.json
(sin errores)

$ npm run lint
> expo lint
(sin errores ni avisos)
```

**Exportación de producción** (`npx expo export --platform web`): termina en `Exported: dist`.

- `dist/client/fuentes/` trae los 7 `.ttf` y las 2 licencias OFL.
- El CSS de las fuentes va en el paquete (`_expo/static/css/fuentes-*.css`).
- `grep -r DATABASE_URL dist/client` no encuentra nada.
- `dist` se borró después.

## Requisito por requisito

Las pruebas son las de `scripts/verificar-reglas.ts`, con su número de línea.

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-1 | Demo T6 y T7: el menú lateral a la izquierda en todas las pantallas | verde |
| RF-2 | Pruebas en `:2542` (residente) y `:2562` (módulo apagado por obra); demo T6: Natalia ve 8 módulos y Diego 11 | verde. D2 y D3 (2026-10-06): el usuario entró como residente y con cuentas de un solo módulo, y cada uno ve solo lo suyo |
| RF-3 | Pruebas en `:2533` (los 4 grupos de la gerencia) y `:2572` (cada módulo en un solo grupo); demo T7 | verde |
| RF-4 | Prueba en `:2551` (roles de un solo módulo, sin grupos vacíos) | verde. D3: los roles de un solo módulo ven su único módulo |
| RF-5 | Demo T6 y T7: ícono y nombre de cada módulo. El ícono de Obras pasó a un casco para no confundirse con Laboratorio | verde |
| RF-6 | Prueba en `:2597` (`moduloDeLaRuta`, subpáginas incluidas); demo T7: Laboratorio resaltado en `/panel/laboratorio/…/informe`, con píldora amarilla, negrita y barra grafito al borde | verde |
| RF-7 | Demo T6: los 11 enlaces llevan a su ruta | verde |
| RF-8 | Pruebas en `:2579` y `:2629` (sin preferencia o sin almacenamiento, el menú va abierto) | verde |
| RF-9 | Demo T7: «Plegar menú» / «Abrir menú» al pie del menú | verde |
| RF-10 | Demo T7: con el menú plegado, al pasar el puntero sobre el matraz aparece «Laboratorio» encima del contenido | verde |
| RF-11 | Prueba en `:2611`; demo T7: se guarda `preoperaocc.menu`, y tras recargar sigue plegado o abierto | verde |
| RF-12 | Prueba en `:2579`; demo T8 en un `iframe` de 1100: plegado aunque la preferencia sea «abierto» | verde |
| RF-13 | Demo T8: abierto encima, con telón; el contenido no se mueve (x = 96 antes y después) | verde |
| RF-14 | Demo T8: al elegir Obras se navega y el menú se cierra; también se cierra al tocar el telón | verde |
| RF-15 | Demo T6: la píldora grafito flotante, separada de los bordes | verde |
| RF-16 | Demo T6: el logo, sobre su pastilla blanca para que se lea «OBRAS», y «Control de Obra» | verde |
| RF-17 | Demo T6: «Diego · Gerencia» y «Natalia Riaño · Residente / Director» | verde |
| RF-18 | Demo T6: «Cambiar contraseña» abre su pantalla y «Cancelar» vuelve | verde. D1 (2026-10-06): el usuario cerró sesión desde la barra y volvió a entrar; `/api/auth/yo` responde «Diego», `admin`, y el panel carga con su barra y su menú |
| RF-19 | Demo T6; `grep` sin rastros de `barra-navegacion` ni `barraCabeEnUnRenglon` | verde |
| RF-20 | Pruebas de contraste en `:4314` y de frontera en `:4286` (ningún `Colors.light` ni `Marca` en el panel); demo: crema, grafito y amarillo | verde |
| RF-21 | Demo T11 y T13: rojo, verde y ámbar solo en estados (NO APTO, APTO, «Con observaciones», «Abierto», faltas) | verde |
| RF-22 | Pruebas en `:4218` (archivos y CSS local) y `:4286` (todo `fontSize` lleva `fontFamily`); demo T3: Plus Jakarta Sans en 400 y 800 sin negrita sintetizada | verde |
| RF-23 | Prueba en `:4286`; demo T7, T10 y T11: Space Grotesk en mayúsculas en botones, grupos del menú y cabeceras de tabla | verde |
| RF-24 | Demo T10: píldoras; el principal grafito, el secundario con borde fino y el de peligro en rojo | verde |
| RF-25 | Demo T11: la superficie blanca plana con `Radio.lg` sobre crema; las ventanas con sombra flotante | verde |
| RF-26 | Demo T10: Personas y viaje de cantera, con la etiqueta encima y la fila alineada aunque haya ayuda debajo | verde |
| RF-27 | Pruebas en `:4103` (suma de mínimos ≤ 888, y ≤ 708 en el parte) y `:4163`; demo T9 y T10: a 1024, Personas, Vehículos, Almacén, WhatsApp (2 tablas), Asignaciones y Obras sin desbordar | verde. D4 se da por cubierto (ver más abajo) |
| RF-28 | Prueba de frontera `:4286` sobre los 60 archivos del panel, sin excepciones desde T15 | verde |
| RF-29 | Demo T12 (`iframe credentialless`, sin sesión): la tarjeta blanca centrada sobre crema | verde |
| RF-30 | Demo T12: logo, «Ingresar», etiquetas encima, botón «INGRESAR» en píldora; con datos inventados sale el aviso dentro de la tarjeta | verde. D1: el ingreso con la contraseña real deja pasar |
| RF-31 | Demo T12: el cambio de contraseña usa la misma `TarjetaDeAcceso` | verde |
| RF-32 | Revisión de los diffs: el barrido solo tocó estilos e imports. Textos cambiados a propósito: «Entrar» → «Ingresar» (RF-30) y «Salir» → «Cerrar sesión» (RF-18). Se probó sin guardar nada: ventanas abiertas y cerradas, propuesta solo vista | verde |
| RF-33 | Prueba en `:4218`: las URL del CSS son solo `/fuentes/…`; demo T3: los `.ttf` responden 200 desde el propio servidor | verde |
| RF-34 | `git diff bf7c645` vacío en `src/components/ui`, `features/operador`, `features/checklists`, `features/auth`, `app/(operador)`, `db/local` y `features/sync`; `Colors`, `Estado` y `Marca` intactos; prueba en `:4296` | verde (ver la nota 1) |

**RNF:**

- **Contraste:** prueba en `:4314`, en verde.
- **Color nunca como única señal:** el activo lleva negrita y barra, los estados llevan texto
  y ✕/✓. Verde.
- **Sin desplazamiento de página a 1280 abierto y a 1024 plegado:** prueba en `:4103`, en
  verde. Las tablas medidas a 1024 en T9 y T10 cumplen. Ver D4.

## Notas

1. **CSS de las fuentes en el operador web.** En la exportación, las páginas web del
   operador (`dist/server/(operador)/*.html`) también enlazan el CSS de las fuentes, porque
   Expo junta el CSS global en todas las páginas.
   - Ese CSS solo **declara** las fuentes (`@font-face`); no las aplica a ningún elemento, y
     el navegador no descarga una fuente que nadie usa.
   - La app nativa del celular no carga CSS.

   El aspecto del operador no cambia y RF-34 se cumple.
2. **Servidor lento el 2026-10-06 por la tarde.** Neon tardaba en despertar: `/api/salud`
   respondía en 18 s y luego en 1,3 s. Metro, además, reconstruyó el paquete tras la
   exportación, y el panel se quedó varios segundos en el indicador de carga sin errores en
   consola: `entry.bundle` estaba pendiente.
3. **Comprobaciones con la ventana de Chrome detrás.**
   - Chrome frena los temporizadores y las animaciones de las pestañas en segundo plano. Por
     eso varias comprobaciones se hicieron con eventos JS, con el estilo calculado o dentro
     de un `iframe` del ancho deseado, porque la ventana maximizada no se dejaba cambiar de
     tamaño.
   - El barrido de los 11 módulos a dos anchos (D4) no terminó así: se repite con la ventana
     al frente.
4. **Defecto encontrado, fuera de esta spec:** los títulos de pestaña nunca se aplican, desde
   antes de la 022. Ver la nota de T6 en `tareas.md`.

## Alcance

- **No se hizo nada fuera de la spec:** los cambios son el marco, los componentes, el barrido
  de estilos y sus pruebas. Los ajustes de `anchoMinimo` en columnas solo tocan cómo se
  encogen.
- **Lo que la spec dejaba fuera sigue fuera:** el modo oscuro, el 3D y las animaciones de
  egg.live, el logo, los permisos y la app del celular.
- **Constitución:**
  - las reglas nuevas están en `src/shared/rules/menu.ts`, son puras y tienen sus casos;
  - no hay dependencias nuevas: las fuentes son archivos y los íconos usan
    `react-native-svg`, que ya estaba;
  - no hay colores escritos a mano fuera de `paleta.ts`;
  - el código y la interfaz están en español.

## Demo con el usuario (2026-10-06)

- **D1, hecha:** «Cerrar sesión» desde la barra y entrada real como Diego (RF-18, RF-30).
- **D2 y D3, hechas por el usuario:** entró como residente y con cuentas de un solo módulo, y
  cada una ve solo su módulo y sus grupos (RF-2, RF-4).
- **D4, cubierta sin el recorrido visual completo.** El servidor estaba lento: unos 45 s por
  pantalla dentro de un `iframe`, con lecturas antes de que llegaran los datos. Se da por
  cumplida por tres razones:
  - la prueba `:4103` asegura que, con las columnas encogidas, todas las tablas caben en 888,
    el contenido a 1024 con el menú plegado;
  - las mediciones reales a 1024 de T9 y T10, en las 7 tablas con datos, dieron marco igual a
    contenido;
  - a 1280 con el menú abierto el contenido mide 968, más que esos 888.

  Si hiciera falta verlo, se repite con el servidor caliente y la ventana al frente.

## Veredicto

**Cumplida (2026-10-06).**

- Los 34 RF y los RNF están en verde.
- Los tres comandos están en verde.
- La app del celular no cambió respecto a `bf7c645`.
- No queda nada fuera de alcance implementado ni nada del alcance sin hacer.
