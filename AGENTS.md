# AGENTS.md — PreOperaOCC

## Proyecto

Control de la maquinaria de obra civil de OCC —volquetas, camionetas y maquinaria amarilla (motoniveladora, retrocargador, retroexcavadora)— a través del **preoperacional** diario de cada equipo y de la **bitácora de trabajo** de la jornada.

Son dos públicos con dos oficios distintos, y por eso dos superficies:

- **App móvil — el operador.** Levanta el preoperacional de su equipo en obra: con guantes, bajo sol directo y **normalmente sin señal**. Las reglas del formato (ítems que inmovilizan, periodicidades, medidores) deciden ahí mismo si el vehículo queda APTO o NO APTO, sin consultar a nadie.
- **Dashboard web — la administración** (ingenieros residentes, director de obra, gerencia). Ve lo que registran los operadores, **asigna uno o varios vehículos** a cada operador y lleva las **bitácoras diarias**.

La bitácora tiene las dos vías a propósito: la web es el camino principal, pero el residente que está en obra sin computador la cierra desde el móvil. Lo que documenta es el trabajo del operador aunque la llene otra persona — de ahí que `bitacoras` separe `usuarioId` (quien la llena) de `operadorId` (quien operó la máquina).

**Arquitectura: local-first.** SQLite dentro del teléfono es la única fuente que lee la interfaz móvil; la red nunca está en el camino de una pantalla. Dos familias de tablas: *réplicas* (el servidor manda, un pull las sobrescribe) y *capturas* (nacen en el dispositivo con su UUID definitivo y suben una sola vez vía `outbox`, con clave de idempotencia). Cuando el celular recupera señal o entra a una wifi, el motor de sincronización drena la cola por detrás; el operador nunca espera por eso.

> **Estado:** el móvil del operador está construido. El motor de sincronización que drena `outbox` y el dashboard web son la Fase 2 — la cola ya se llena y queda en orden, pero todavía nadie la vacía.

**Tecnologías:** Expo SDK 57 (`expo-router`, typed routes, React Compiler) · React Native 0.86 · React 19 · TypeScript 6 strict · Drizzle ORM sobre `expo-sqlite` · `@expo/ui` · Reanimated 4 · Zod 4.

### Un repo, dos targets

El dashboard y su API viven **en este mismo repo**, sobre Expo Router web: `app.json` ya declara `web.output: "server"` y `metro.config.js` vacía las dependencias opcionales de `pg`, porque el servidor irá contra Postgres.

La frontera entre los dos targets es dura y está vigilada en código: `src/db/local/client.ts` **lanza una excepción** si entra al bundle web. El móvil lee SQLite; el dashboard consulta la API. Si una pantalla web falla con ese error, la causa es una cadena de imports que arrastró la base local, no el error en sí.

**Mapa del código** (alias `@/*` → `src/*`):

| Ruta | Qué vive ahí |
| --- | --- |
| `src/app/` | Rutas de Expo Router. Pantallas delgadas: componen features, no tienen lógica. |
| `src/features/<dominio>/` | El trabajo real, por dominio: `auth`, `checklists`, `bitacoras`, `media`, `sync`. |
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
- Migraciones: `npm run db:generate` tras tocar `src/db/local/schema.ts`.
- Reimportar formatos: `npm run formatos` (lee `docs/*.xlsx`; la salida es **para revisión humana**).

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
- **La app móvil tiene que funcionar sin señal, completa.** Nada de lo que el operador captura puede depender de una respuesta de red: se escribe en SQLite y se encola en `outbox` en la misma operación en que se cierra el registro. Ninguna pantalla muestra un spinner esperando al servidor.
- La asignación de vehículos la decide la administración desde la web. El móvil solo tiene el respaldo: si el operador no tiene ninguna asignación vigente, escoge y se marca `autoasignada` para que el dashboard la confirme. **No bloquees al operador** — un operador bloqueado arranca la máquina sin preoperacional, que es justo lo que este sistema existe para evitar.
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
Si tocaste reglas de inspección o de jornada, añade la prueba correspondiente en `scripts/verificar-reglas.ts` en la misma tarea.
Reporta el resultado real: si algo falla, dilo con la salida; no declares verificado lo que no ejecutaste.
