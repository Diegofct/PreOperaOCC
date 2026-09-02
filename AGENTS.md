# AGENTS.md — PreOperaOCC

## Proyecto

Control de la maquinaria de obra civil de OCC —volquetas, camionetas y maquinaria amarilla (motoniveladora, retrocargador, retroexcavadora)— a través del **preoperacional** diario de cada equipo y de la **bitácora de trabajo** de la jornada.

Son dos públicos con dos oficios distintos, y por eso dos superficies:

- **App móvil — el operador.** Levanta el preoperacional de su equipo en obra: con guantes, bajo sol directo y **normalmente sin señal**. Las reglas del formato (ítems que inmovilizan, periodicidades, medidores) deciden ahí mismo si el vehículo queda APTO o NO APTO, sin consultar a nadie.
- **Dashboard web — la administración** (ingenieros residentes, director de obra, gerencia). Ve lo que registran los operadores, **asigna uno o varios vehículos** a cada operador y lleva las **bitácoras diarias**.

La bitácora tiene las dos vías a propósito: la web es el camino principal, pero el residente que está en obra sin computador la cierra desde el móvil. Lo que documenta es el trabajo del operador aunque la llene otra persona — de ahí que `bitacoras` separe `usuarioId` (quien la llena) de `operadorId` (quien operó la máquina).

**Arquitectura: local-first.** SQLite dentro del teléfono es la única fuente que lee la interfaz móvil; la red nunca está en el camino de una pantalla. Dos familias de tablas: *réplicas* (el servidor manda, un pull las sobrescribe) y *capturas* (nacen en el dispositivo con su UUID definitivo y suben una sola vez vía `outbox`, con clave de idempotencia). Cuando el celular recupera señal o entra a una wifi, el motor de sincronización drena la cola por detrás; el operador nunca espera por eso.

> **Estado:** el móvil del operador está construido. El dashboard también, con su **registro** (obras, personas, vehículos, asignaciones) y su **ingreso con usuario y contraseña**, alcance por cargo incluido. Faltan las dos mitades de la sincronización: el **pull** que baja esos datos al celular —hoy el equipo sigue con la siembra de demostración y sus PIN escritos en el código— y el **push** que drena `outbox`, que se llena y queda en orden pero que todavía nadie vacía. Sin desplegar: el panel corre en `localhost`.

**Tecnologías:** Expo SDK 57 (`expo-router`, typed routes, React Compiler) · React Native 0.86 · React 19 · TypeScript 6 strict · Drizzle ORM sobre `expo-sqlite` (móvil) y sobre `@neondatabase/serverless` (servidor) · `@expo/ui` · Reanimated 4 · Zod 4.

### Un repo, dos targets

El dashboard y su API viven **en este mismo repo**, sobre Expo Router web: `app.json` declara `web.output: "server"` y `metro.config.js` vacía dependencias opcionales que el driver de Postgres declara y nunca usa.

La base del servidor es **Postgres en Neon**, y el driver habla por HTTP (`@neondatabase/serverless` + `drizzle-orm/neon-http`) porque Cloudflare Workers —donde correrá— no puede abrir sockets TCP. Dos consecuencias que hay que tener presentes al escribir endpoints: **no hay transacciones interactivas** (una operación de varios pasos es una sola sentencia, o resiste el reintento) y `execute` devuelve el resultado completo, no las filas (`.rows`).

La conexión se lee de `DATABASE_URL` en un `.env` de la raíz (`.env.ejemplo` es la plantilla). **Expo elimina del bundle del cliente lo que solo se importa desde `+api.ts`**, y eso se comprueba, no se supone: ver la verificación de fugas más abajo.

La frontera entre los dos targets es dura y está vigilada en código: `src/db/local/client.ts` **lanza una excepción** si entra al bundle web. El móvil lee SQLite; el dashboard consulta la API. Si una pantalla web falla con ese error, la causa es una cadena de imports que arrastró la base local, no el error en sí.

**Mapa del código** (alias `@/*` → `src/*`):

| Ruta | Qué vive ahí |
| --- | --- |
| `src/app/(operador)/` | Rutas del operador. **Una línea cada una**: reexportan su pantalla desde `src/features/`. |
| `src/app/panel/` | Rutas del dashboard de administración (solo tiene sentido en el navegador). |
| `src/app/api/` | Rutas `+api.ts` del servidor. No admiten extensiones de plataforma. |
| `src/features/<dominio>/` | El trabajo real, por dominio: `auth`, `checklists`, `bitacoras`, `media`, `sync`, `operador`, `panel`, `servidor`. |
| `src/features/auth/servidor/` | Contraseñas y sesiones web. **Solo servidor**; nada que ver con el PIN del celular, que sigue en `auth/pin.ts`. |
| `src/features/servidor/` | Lo transversal de los endpoints: guardia de sesión, alcance por cargo, forma de las respuestas. |
| `src/shared/cripto/` | Primitivas que comparten móvil y servidor. Hoy, la comparación en tiempo constante. |
| `src/db/servidor/` | Base Postgres: esquema, cliente, conversión de tiempos, disparadores. **Solo servidor** — la importan `+api.ts` y los scripts. |
| `src/shared/catalogos/` | Datos que las dos bases tienen que compartir literalmente (tipos de equipo, canonicalización de plantillas). |
| `src/features/checklists/plantillas/*.json` | Los formatos de OCC **como datos**, generados desde `docs/*.xlsx`. |
| `src/shared/rules/` | Reglas puras (`inspeccion.ts`, `jornada.ts`): sin I/O, sin dependencias. Las ejecutarán el móvil y el servidor. |
| `src/db/local/` | Base del dispositivo. **Solo nativo** — nunca importar desde código web. |
| `src/components/ui/` | Componentes de campo reutilizables (firma, cámara, teclado numérico…). |
| `src/constants/theme.ts` | Sistema de diseño de campo: `Marca`, `Estado`, `Toque`, `Texto`, `Radio`, `Spacing`. |
| `scripts/` | Herramientas que corren en Node, no en Hermes (tsconfig aparte). |

### Roles

El enum de `usuarios.rol` es `admin | supervisor | operador` y **no se amplía**. Los cargos reales se mapean: residente y director de obra → `supervisor`; gerencia → `admin`. Si hace falta mostrar el cargo, va en un campo aparte, no en el enum.

## Comandos

- Ejecutar (móvil): `npx expo start` (`npm run android` / `npm run ios`)
  El proyecto usa `expo-dev-client`: **no corre en Expo Go**, hace falta un development build.
- Ejecutar (web/dashboard): `npm run web`.
- Tests: `npm run verificar` — verificación de las reglas contra los formatos reales.
- Tipos: `npm run typecheck` — app y `scripts/` (dos tsconfig).
- Lint: `npm run lint` (`expo lint`).
- Migraciones del móvil: `npm run db:generate` tras tocar `src/db/local/schema.ts`.
- Migraciones del servidor: `npm run db:generate:servidor` tras tocar `src/db/servidor/esquema.ts`, y `npm run db:migrar:servidor` para aplicarlas contra Neon.
- Catálogo del servidor: `npm run db:sembrar:servidor` (tipos de equipo y plantillas; **nunca** obras, personas ni vehículos — eso lo registra la administración).
- Cuenta de gerencia: `npm run crear-admin`. Crea o repone la contraseña de un administrador desde la terminal. Es la única forma de entrar al panel la primera vez, y la salida si gerencia se queda fuera.
- Reimportar formatos: `npm run formatos` (lee `docs/*.xlsx`; la salida es **para revisión humana**).

> **Dos trampas del CLI de Expo, comprobadas en este proyecto:**
>
> 1. El servidor de desarrollo **no recompila las rutas `+api.ts` en caliente**. Tras tocar una hay que reiniciar `npm run web`, o se sigue sirviendo la versión anterior — se pierde mucho rato buscando un error que ya estaba arreglado.
> 2. **Expo imprime en la consola el valor completo de cada variable del `.env`**, contraseña de la base incluida, en cada comando que lo carga (`expo start`, `expo lint`, `expo export`). No se puede silenciar sin desactivar la carga de `.env` entera. Consecuencia práctica: **nunca compartas una captura ni una grabación de esa terminal**, y si la cadena de conexión se expuso, rótala desde el panel de Neon.

## Estilo y convenciones

- **TypeScript 6 en `strict`.** Nada de `any`; si un tipo no cuadra, arréglalo en el tipo.
- **Todo el código y los comentarios van en español**: nombres de archivo, funciones, variables, tipos, mensajes de commit y textos de interfaz. Los identificadores de librerías externas y las columnas SQL se quedan como están.
- Archivos en `kebab-case` (`pantalla-ingreso.tsx`, `capturar-medidor.tsx`); componentes en `PascalCase`; funciones y variables en `camelCase`.
- **Cada módulo abre con un bloque de comentario que explica el *porqué***, no el qué. Los comentarios existentes documentan decisiones (por qué el tema es claro fijo, por qué `seq` es autoincremental, por qué las periodicidades no se anclan al calendario). Mantén ese registro: cuando cambies una decisión, cambia el comentario.
- Imports: primero externos, luego `@/…`, separados por línea en blanco.
- Estilos con `StyleSheet` y los tokens de `@/constants/theme`. **Nunca escribas un color, un tamaño de fuente ni un área táctil a mano** — si falta un token, se añade al tema.
- Diseño para campo (aplica al móvil): mínimo `Toque.minimo` (56 dp) en cualquier elemento interactivo, nunca por debajo de `Texto.pie` (15 sp), y el color jamás es la única señal (siempre acompañado de ícono o texto). El dashboard es de escritorio y no está sujeto a esas restricciones, pero sí a los mismos tokens de color.
- Las reglas de negocio se escriben **una sola vez** en `src/shared/rules/` como funciones puras, porque el servidor ejecutará las mismas al ingerir. Si difieren, gana el servidor — pero al estar escritas en un solo sitio, no deberían diferir. No dupliques lógica de decisión dentro de una pantalla.

## Reglas

- **Expo ha cambiado.** Lee los docs de la versión exacta en https://docs.expo.dev/versions/v57.0.0/ antes de escribir código, y arranca por la skill `expo-overview`, que enruta a la skill correcta (router, UI, animación, EAS, upgrades). No escribas API de SDK antiguas de memoria.
- Antes de tocar reglas del preoperacional o de la jornada, lee las fuentes de verdad: `src/features/checklists/types.ts`, `src/shared/rules/*.ts` y el formato original en `docs/*.xlsx`. El sufijo `- AI` del Excel (Actividades que Inmovilizan) lo definió OCC, no nosotros.
- **Nunca importes `src/db/local/*` desde código que pueda entrar al bundle web.** El dashboard consulta la API; la base local es solo del dispositivo.
- **Los archivos de ruta del operador son de una sola línea.** Expo Router **evalúa todos los módulos de ruta** al construir el manifiesto, así que una extensión `.web.tsx` sobre un archivo de `src/app/` no impide que su código entre al bundle web. La divergencia por plataforma va siempre **fuera de `src/app/`**, sobre un import normal: `pantalla-x.tsx` / `pantalla-x.web.tsx`. Si añades una pantalla al operador, añade también su variante web (una línea reexportando `@/features/panel/redirigir-al-panel`) o `npx expo export --platform web` fallará.
- **La app móvil tiene que funcionar sin señal, completa.** Nada de lo que el operador captura puede depender de una respuesta de red: se escribe en SQLite y se encola en `outbox` en la misma operación en que se cierra el registro. Ninguna pantalla muestra un spinner esperando al servidor.
- La asignación de vehículos la decide la administración desde la web. El móvil solo tiene el respaldo: si el operador no tiene ninguna asignación vigente, escoge y se marca `autoasignada` para que el dashboard la confirme. **No bloquees al operador** — un operador bloqueado arranca la máquina sin preoperacional, que es justo lo que este sistema existe para evitar.
- **Toda ruta bajo `src/app/api/panel/` abre con la guardia**, sin excepción: `const sesion = await requerirSesion(peticion); if (sesion instanceof Response) return sesion;`. Y el filtro por obra sale siempre de `src/features/servidor/alcance.ts` — una consulta que arme su propia condición es una que en la siguiente se olvida, y el fallo no se nota hasta que hay dos obras en producción.
- **Nada se borra: las bajas escriben `eliminado_en`** (o `activo = false`, o `hasta = ahora`). Ya está dicho más abajo, pero aplica también a personas y sesiones.
- **Las contraseñas del servidor usan `crypto.subtle`, las del celular `@noble/hashes`.** No se unifican: Hermes no trae `crypto.subtle` completo, y en Workers derivar en JS puro costaría cien veces más. Lo único común es `@/shared/cripto/comparar`.
- **Los secretos solo se leen desde `+api.ts`.** Nunca `process.env.DATABASE_URL` —ni ninguna credencial— en un módulo que pueda alcanzar el bundle del cliente. Que Expo lo elimine no es una excusa para no comprobarlo: es el peor fallo posible de este proyecto y se verifica con un `grep` sobre `dist/client`.
- **Las bajas son lógicas, nunca `DELETE`.** Un vehículo, una obra o una persona pueden tener preoperacionales firmados apuntándoles, y eso es evidencia. Se escribe `eliminado_en` (o `activo = false`, o `hasta = ahora`). Además es lo único que le permite al celular enterarse de la baja: una fila que deja de venir en el snapshot es indistinguible de una que nunca le tocó.
- **Los tipos de equipo se cambian en `src/shared/catalogos/tipos-vehiculo.ts`**, nunca en una de las dos bases por separado. Los slugs son la llave que une un vehículo con su formato; si divergen, el móvil y el servidor hablan de filas distintas sin que nada falle a la vista.
- **No edites a mano** `src/features/checklists/plantillas/*.json` ni `drizzle/`: se generan (`npm run formatos`, `npm run db:generate`).
- Las `key` de los ítems del checklist son identificadores estables: **nunca se renombran ni se reutilizan**; ya hay registros firmados apuntando a ellas.
- Un preoperacional firmado y una bitácora cerrada son evidencia: se corrigen **anulándolos desde el dashboard**, nunca sobrescribiéndolos.
- No cambies el esquema de `src/db/local/schema.ts` sin generar la migración correspondiente en la misma tarea.
- El tema claro es una decisión deliberada (legibilidad bajo sol). No añadas modo oscuro.
- No añadas dependencias, librerías de estilos, gestores de estado ni servicios de red sin preguntar. Para componentes nativos, `@expo/ui` antes que una librería de la comunidad.
- No toques `app.json`, `eas.json`, `babel.config.js` ni `metro.config.js` sin decir por qué; sus ajustes actuales resuelven problemas concretos ya documentados en sus comentarios.

## Al terminar cualquier tarea

Obligatorio, en este orden, y no des la tarea por terminada hasta que los tres pasen en verde:

1. `npm run verificar`
2. `npm run typecheck`
3. `npm run lint`

Si tocaste `src/db/local/schema.ts`, además `npm run db:generate` y confirma que la migración quedó en `drizzle/local/`.
Si tocaste `src/db/servidor/esquema.ts`, además `npm run db:generate:servidor` y confirma que quedó en `drizzle/servidor/`.
Si tocaste algo que lea un secreto, además comprueba que no se filtró:

```
npx expo export --platform web && grep -r "DATABASE_URL" dist/client   # debe salir vacío
rm -rf dist
```
Si tocaste reglas de inspección o de jornada, añade la prueba correspondiente en `scripts/verificar-reglas.ts` en la misma tarea.
Reporta el resultado real: si algo falla, dilo con la salida; no declares verificado lo que no ejecutaste.
