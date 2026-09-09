# Constitución — PreOperaOCC

Principios innegociables. Toda spec, todo plan y toda tarea tienen que cumplirlos.
Si un requerimiento choca con uno de estos puntos, no se implementa: se para y se
discute. `AGENTS.md` es el manual de operación —el detalle de cómo se hace cada
cosa—; esto es la ley contra la que se revisa lo que se va a hacer.

1. **Local-first innegociable.** Nada de lo que captura el operador depende de una
   respuesta de red: se escribe en SQLite y se encola en `outbox` en la misma
   operación. Ninguna pantalla del móvil espera al servidor.
2. **La spec manda.** No se implementa comportamiento que no esté en la spec activa.
   Si falta una decisión, se detiene el trabajo y se pregunta; no se inventa.
3. **Una regla, un solo sitio.** Las reglas de negocio viven en `src/shared/rules/`
   como funciones puras, sin I/O. El servidor reevalúa con esas mismas funciones y,
   si el veredicto difiere, gana el servidor.
4. **Nada se borra.** Las bajas son lógicas (`eliminado_en`, `activo = false`,
   `hasta = ahora`). Un preoperacional firmado o una bitácora cerrada son evidencia:
   se anulan con motivo escrito, nunca se sobrescriben.
5. **Puerta de calidad.** Ninguna tarea está hecha sin `npm run verificar`,
   `npm run typecheck` y `npm run lint` en verde. Toda regla nueva o modificada
   añade su caso en `scripts/verificar-reglas.ts` en la misma tarea.
6. **Fronteras duras.** `src/db/local/*` nunca entra al bundle web; los secretos
   solo se leen desde `+api.ts`; las dos guardias —cookie del panel y token del
   móvil— no se mezclan; el bucket de imágenes no se expone jamás.
7. **Español y diseño de campo.** Código, comentarios e interfaz en español. En el
   móvil, tokens de `@/constants/theme`, mínimo `Toque.minimo` en lo interactivo y
   el color nunca como única señal.
8. **Sin dependencias nuevas sin aprobación.** Y la API de Expo SDK 57 se consulta
   en los docs de la versión (skill `expo-overview`), nunca se escribe de memoria.
