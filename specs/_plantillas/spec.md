# Spec NNN — <Nombre de la funcionalidad>

> Estado: Borrador · Fecha: <AAAA-MM-DD>

## Contexto y objetivo

<Qué problema real de la obra resuelve y por qué merece la pena. Un párrafo.
Sin nombres de tablas, librerías ni pantallas: eso va en el plan.>

## Usuarios / actores

<Quién lo usa y desde dónde. Los actores de este proyecto son:
- **Operador** (móvil, en obra, con guantes y normalmente sin señal)
- **Residente / director de obra** (panel web, rol `supervisor`)
- **Gerencia** (panel web, rol `admin`)
Nombra solo los que intervienen, y di qué hace cada uno aquí.>

## Historias de usuario

- H1: Como <actor> quiero <acción> para <beneficio>.
- H2: …

## Requisitos funcionales (criterios de aceptación en EARS)

Numerados y verificables. Un requisito = una frase; si hay un "y", son dos.

### <Agrupación por historia o por flujo> (H1)

- RF-1: CUANDO <evento>, EL SISTEMA <respuesta observable>.
- RF-2: SI <condición no deseada>, ENTONCES EL SISTEMA <respuesta>.
- RF-3: MIENTRAS <estado>, EL SISTEMA <respuesta>.

### Reglas transversales

- RF-N: EL SISTEMA <comportamiento permanente>.

## Superficies afectadas

Marca lo que cambia. Lo que se olvida aquí es lo que rompe la sincronización.

- [ ] **Móvil** — <pantallas o flujos del operador>
- [ ] **Panel web** — <pantallas de administración>
- [ ] **API** — <endpoints de `movil/` o de `panel/`>
- [ ] **Sincronización** — <pull, push, outbox, orden de `seq`>
- [ ] **Datos** — <tablas nuevas o modificadas: local, servidor o ambas>
- [ ] **Reglas** — <`src/shared/rules/*`: si se marca, hay caso nuevo en `verificar-reglas.ts`>

## Requisitos no funcionales

<Solo los que apliquen y con umbral medible: tiempos, tamaños, plataformas, idioma,
legibilidad bajo sol, consumo de datos móviles…>

## Casos límite

Los tres que este proyecto no puede dejar sin respuesta:

- **Sin señal**: <qué ve y qué puede hacer el operador con el avión activado>
- **Evidencia firmada**: <qué pasa si el registro afectado ya está firmado o cerrado>
- **Primer arranque / equipo recién activado**: <qué pasa cuando aún no hay datos locales>

Y los del caso concreto: <vacíos, duplicados, datos corruptos, límites, dos personas
haciendo lo mismo a la vez, relojes desfasados…>

## Fuera de alcance

<Lo que explícitamente NO se hace en esta iteración. Sé concreto: esta sección es la
que evita que la funcionalidad crezca sola a mitad de la implementación.>

## Criterios de finalización

- Cada RF tiene cómo comprobarse: caso en `scripts/verificar-reglas.ts` (si es regla pura)
  o paso de demo manual descrito.
- `npm run verificar`, `npm run typecheck` y `npm run lint` en verde.
- Demo manual del flujo principal: <describe el recorrido de punta a punta>.

## Dudas abiertas

- [NECESITA ACLARACIÓN: <duda>]
