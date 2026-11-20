# Validación — Spec 051, documentos en carpetas

> Fecha: 2026-11-20 · **Revalidación tras el cambio del 2026-11-20** (las carpetas nacen al subir: RF-70 a RF-79,
> D20–D22; RF-47 y RF-48 retirados) · Rama `develop`, sin commitear · Sesión de Gerencia (Diego) en
> `localhost:8081`, a 1536 px y con recuadros de 1366 y 390 px dentro de la página.
>
> La primera validación (69/69, mismo día) quedó superada por el cambio; esta la reemplaza.
>
> **Segundo cambio, revalidado el 2026-11-20 (T23):** el título mientras se busca dentro de una carpeta (RF-80,
> D23; RF-16, RF-17 y RF-58 modificados). Se rehicieron esas filas y la de RF-41, con la prueba de la T22 en
> Chrome. Los tres comandos se corrieron otra vez. No se tocó la API ni nada que lea un secreto, así que el
> export web no se repitió.

## Comandos (salida real)

```
> npm run verificar
1111 verificaciones correctas.          (15 pruebas «051/…»; 0 fallos; salida 0)

> npm run typecheck
> tsc --noEmit && tsc --noEmit -p tsconfig.scripts.json      (salida 0, sin errores)

> npm run lint
> expo lint                                                 (sin errores ni advertencias)
```

También: `npx expo export --platform web` salió sin errores (197 rutas de API) y `dist/client` no tiene
`DATABASE_URL`, ni `R2_LLAVE_SECRETA`, ni `SECRETO_TOKENS` (se borró `dist`). `git diff` sobre
`src/shared/rules/permisos.ts` y `src/db` está vacío: ni permisos ni esquema cambiaron. La API de subida ganó un
campo (`claseNombre`), con la misma ruta y la misma guardia.

Las líneas citadas son de `scripts/verificar-reglas.ts`. «Navegador» quiere decir visto en esta sesión, con el
detalle en las notas de `tareas.md`. «Demo T15» es la de la primera validación; «Demo T20» es la del cambio.

## Demo del cambio (T20)

En OCC, como Gerencia y contra la base de desarrollo:
1. Sin documentos: solo el vacío «Todavía no hay documentos aquí. Al subir el primero se crea su carpeta.» con
   «Subir documento».
2. «PRUEBA-051 cámara de comercio» en Cámara de comercio, que vence el 30-nov: nace la carpeta y se abre.
3. «＋ Nueva carpeta…» «Manuales de obra»: nace `carpeta:manuales_de_obra` y se abre; en las carpetas va después
   de Cámara de comercio.
4. «manuales DE obra» como carpeta nueva: «Ya existe: el documento va a «Manuales de obra»», cae en esa y la
   carpeta conserva su nombre.
5. «camara de comercio» como carpeta nueva: cae en Cámara de comercio.
6. Anular los dos de Manuales de obra: la carpeta deja de verse; con «Ver anulados», en gris «0 · Solo anulados».
7. Anular uno de Cámara de comercio dentro de la carpeta y volver con «Todas las carpetas»: baja de 2 a 1 sin
   recargar la página.
8. Residente de Consorcio Antioquia (recuadro con la sesión cambiada en la página): vacío de la obra y «＋ Nueva
   carpeta…» en la ventana.
9. A 390 px, una columna. La ficha, la requisición y el pago, iguales que en T1 (fotos `despues/`).
10. Limpieza acotada: 4 documentos PRUEBA-051, R2 204 ×4, quedan 0.

## Recorrido RF por RF

### Dónde aplica

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-1 | Navegador: Elemental, OCC, GeoLab (demo T15) y la obra Consorcio Antioquia (T14, T20) | verde |
| RF-2 | Fotos T1 y T20: la ficha, los Adjuntos de RQ-0018 y del pago RQ-0005 siguen con lista y selector de clase | verde |
| RF-3 | Contrato y Presupuesto no se tocó; «Pólizas de la obra» es clase de Documentos desde la 034 | verde |

### Las carpetas

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-4 (cambio) | :22898 (sin documentos, ninguna; solo las clases con documentos); demo T20 1 y 2 | verde |
| RF-5 (cambio) | :22980 (catálogo → propias y retiradas → «Otro»); demo T20 3 | verde |
| RF-6 | :22934; navegador | verde |
| RF-7 | :22934; navegador T8 y T12 | verde |
| RF-8 | :22934; demo T15 y T20 («1 por vencer») | verde |
| RF-9 (cambio) | :22911 (en gris solo con `conAnulados`); demo T20 6 | verde |
| RF-10 | :22934; demo T20 6 y 7 | verde |
| RF-11 | `TarjetaDeCarpeta` usa siempre el ícono `documentos` | verde |
| RF-12 | Las tres cifras encima; navegador en todas las pantallas | verde |
| RF-56 | `Cifra` es una `View` sin `onPress` | verde |
| RF-13 | :22957 | verde |
| RF-57 (cambio) | :22980 y :22957 (alfabético sin tildes ni mayúsculas, propias y retiradas juntas) | verde |
| RF-14 | Navegador T10 y foto `despues/documentos-occ-390.jpg` | verde |

### Entrar a una carpeta

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-15 | Navegador T11 y demo T20 | verde |
| RF-16 | Navegador: «Manuales de obra», «Cámara de comercio» como título; T22: «RUT» con el buscador vacío y otra vez al borrarlo | verde |
| RF-58 | :23166; navegador «Manuales de obra · Documentos · OCC»; T22: «RUT · Documentos · OCC» con el buscador vacío | verde |
| RF-17 | :23153; navegador T11; T22: «OCC › Documentos › RUT» con el buscador vacío | verde |
| RF-18 | Navegador T11 y T20 | verde |
| RF-19 | Navegador: `?carpeta=carpeta:manuales_de_obra` | verde |
| RF-20 | Navegador T11, T12 y demo T15; desde T20 la pantalla de abajo recarga al volver | verde |
| RF-21 | Navegador T11 y demo T15 | verde |
| RF-59 | Demo T15 | verde |
| RF-22 (cambio) | Navegador T11 (`?carpeta=inventada` → carpetas); la carpeta de la dirección se busca entre todas, con anulados (`PantallaDocumentos`) | verde |
| RF-23 | Navegador T20: «PRUEBA-051 camara 2» antes que «PRUEBA-051 cámara de comercio», más reciente primero | verde |
| RF-24 | `ListaDeDocumentos` con `POR_PAGINA` (15) y `Paginacion` | verde (código; no hubo 16 documentos) |
| RF-60 | Navegador T12 y demo T20 6 (carpeta abierta con todo anulado) | verde |

### La tarjeta del documento

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-25 a RF-32, RF-61, RF-62 | Navegador T9 y demo T15 (sin cambios en la tarjeta) | verde |
| RF-33, RF-69 | :23126; navegador | verde |
| RF-26 | :23137 | verde |
| RF-34 | Navegador T9 | verde |
| RF-35 | Demo T15; T14 y T20: el residente sin «Anular» | verde |
| RF-36, RF-63, RF-64, RF-65 | Demo T15 | verde |
| RF-37 | Demo T15 a 390 px | verde |

### Buscar y filtrar

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-38, RF-40, RF-41, RF-42 | Navegador T12 y demo T15; T22: al borrar «rup» se vuelve a RUT con su nombre (RF-41) | verde |
| RF-80 | T22 en Chrome: dentro de RUT, con «rup», título «Documentos», pestaña «Documentos · OCC», ruta «OCC › Documentos», resultados de RUT y RUP OCC; por `?carpeta=rut&buscar=rup` también «Documentos». Foto `fotos/despues/t22-buscando-dentro-de-rut.jpg` | verde |
| RF-39 | :12360; demo T15 | verde |
| RF-66 | `ListaDeDocumentos` ordena igual que la carpeta | verde (código) |
| RF-43, RF-44 | Navegador T12; sin carpetas por la casilla, «No hay resultados con estos filtros» (T19) | verde |
| RF-45 | Demo T15 | verde |
| RF-67 (cambio) | :22911; demo T20 6 | verde |
| RF-68 | :22934 (`tieneAnulados`); demo T20 6: la carpeta solo con anulados se abre | verde |
| RF-46 | Sin selector de clase en el archivador | verde |

### Subir

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| ~~RF-47~~, ~~RF-48~~ | Retirados por el cambio (D20). `TarjetaDeCarpeta` ya no tiene «Subir el primero» | — |
| RF-49 (cambio) | Navegador T13: desde la carpeta abierta la ventana trae su carpeta | verde |
| RF-50 | Navegador T13 | verde |
| RF-51 | Navegador T7 y T18: sin carpeta, «Elija la carpeta» / «Elija la clase» | verde |
| RF-52 | Navegador T13 y demo T20 7 (al volver, también la pantalla de abajo) | verde |
| RF-53 | Navegador T13 y demo T20 2, 3 y 5 | verde |

### Las carpetas nacen al subir (cambio del 2026-11-20)

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-70 | :22898; navegador T19 y demo T20 1 y 8 | verde |
| RF-71 | :23074; navegador T18 («Carpeta», clases de siempre, «＋ Nueva carpeta…») | verde |
| RF-72 | `ventana-de-subir.tsx`: campo obligatorio de hasta 60; :23001 y :23034 (61 caracteres no) | verde |
| RF-73 | :23001 y :23058; navegador T18 y demo T20 5 | verde |
| RF-74 | :23001; demo T20 4 (misma carpeta y mismo nombre) | verde |
| RF-75 | Demo T20 2 y 3 (la carpeta nace y se abre) | verde |
| RF-76 | :22911; demo T20 6 | verde |
| RF-77 | Sin cambios de permisos; demo T20 8 (el residente también ve «＋ Nueva carpeta…») | verde |
| RF-78 | :23001 (`esLugarConCarpetas` falso en persona, solicitud y pago) y :23034; navegador T18 en la ficha | verde |
| RF-79 | :23034 y :23058 (`claseAGuardar` en `subirDocumento`, la clase la decide el servidor) | verde |

### Reglas transversales

| RF | Qué lo cubre | Resultado |
| --- | --- | --- |
| RF-54 | :23096 | verde |
| RF-55 | `git diff` vacío en permisos y base; la carpeta se guarda en las columnas `clase` y `clase_nombre` que ya existían | verde |

**77 de 77 RF vigentes en verde** (RF-47 y RF-48 retirados). RF-24 y RF-66 se comprobaron en el código, por falta
de datos para verlos en pantalla; se dice en su fila.

## Requisitos no funcionales

- **Tiempo con 500 documentos:** no se midió (en desarrollo hay de 0 a 4). Las carpetas se calculan en el
  navegador sobre la lista que ya llega. Desde la T20, volver a las carpetas pide la lista una vez más.
- **Sin desplazamiento lateral:** 390 y 1366 vistos; 1920 no se miró en esta spec.
- **Texto y fechas:** en español; las fechas como el resto del panel («30-nov-2026»).
- **El color nunca va solo:** «1 por vencer», «◷ Vence en 10 días», «⊘ Anulado», «Solo anulados».

## Constitución

1. **Local-first:** el móvil no se tocó.
2. **La spec manda:** el cambio entró por `/sdd:cambio` con diff aprobado. Los dos defectos de la demo (el nombre
   de la carpeta y los números al volver) se arreglaron dentro de lo que ya pedían RF-74 y RF-52.
3. **Una regla, un solo sitio:** `claseParaNombre`, `claseAGuardar`, `opcionesDeCarpeta`, `carpetasDe` y
   `faltaDelNombreDeCarpeta` son puras y con prueba; el servidor y la ventana usan las mismas.
4. **Nada se borra:** una carpeta que «desaparece» es una vista; los documentos siguen ahí, anulados. Los datos
   PRUEBA-051 se quitaron con la limpieza acotada contra `neondb`.
5. **Puerta de calidad:** los tres comandos en verde en cada tarea.
6. **Fronteras duras:** el export web no tiene secretos.
7. **Español y tokens:** sin tamaños escritos a mano.
8. **Sin dependencias nuevas.**

## Observaciones (no bloquean)

- **Ciclo de imports de Documentos:** resuelto en la T18. Queda otro que **ya existía**, fuera de esta spec:
  `compras/vista-de-la-solicitud.tsx` ↔ `requisiciones/cadena-y-decision.tsx`.
- **Título mientras se busca dentro de una carpeta:** resuelto con el segundo cambio (D23, RF-80, T22).
- **Una carpeta propia con el nombre de una clase que se agregue después a la lista de siempre** quedaría
  partida en dos (riesgo anotado en el plan). Se revisa con una consulta antes de agregar una clase.

## Veredicto

**Sí, la spec 051 está cumplida, con sus dos cambios del 2026-11-20.** Los 78 RF vigentes están en verde.
Son 1 a 80, menos RF-47 y RF-48, que se retiraron. Pasan los tres
comandos (1111 verificaciones, tipos y lint) y el export web sale sin secretos. No cambiaron los permisos ni el
esquema, y no queda nada PRUEBA-051 en desarrollo.

Queda para después:
- el commit del segundo cambio;
- el despliegue.

El `/sdd:cambio` a la 050 lo descartó Diego el 20-nov.
