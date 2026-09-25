/**
 * Los estados de un ensayo de laboratorio (spec 018, RF-70 a RF-85).
 *
 * En su propio archivo, sin importar nada, porque lo importan dos que no se pueden
 * juntar: la regla pura (`shared/rules/granulometria`) y el esquema de Postgres, que
 * crea con esta lista su tipo enumerado. drizzle-kit empaqueta el esquema por su
 * cuenta y no entiende el alias `@/`: si esta lista viviera dentro de la regla, que
 * sí lo usa, generar una migración fallaría.
 *
 * Anulado y descartado **no** están aquí: son marcas de tiempo aparte, como en el
 * resto del proyecto (`anulado_en`), y así el estado conserva en qué punto quedó el
 * ensayo cuando se anuló o se descartó.
 */
export const ESTADOS_ENSAYO = ['borrador', 'enviado', 'devuelto', 'aprobado'] as const;
export type EstadoEnsayo = (typeof ESTADOS_ENSAYO)[number];
