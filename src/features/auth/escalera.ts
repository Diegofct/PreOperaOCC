/**
 * La escalera de bloqueo por PIN fallido, sin nada alrededor.
 *
 * Vive aparte de `intentos.ts` porque ese archivo habla con SQLite y por lo
 * tanto no se puede importar fuera del dispositivo. Estas son funciones puras:
 * `scripts/verificar-reglas.ts` las ejercita en Node, y el servidor podrá
 * reutilizarlas tal cual en la Fase 2.
 */

/** A partir de N fallos seguidos, cuánto hay que esperar. */
const ESCALERA: { desde: number; esperaMs: number }[] = [
  { desde: 7, esperaMs: 30 * 60_000 },
  { desde: 5, esperaMs: 5 * 60_000 },
  { desde: 3, esperaMs: 30_000 },
];

/**
 * Al llegar aquí se borran las credenciales del equipo y hay que volver a
 * activarlo en línea. Nunca se toca ni un registro de trabajo: ver `almacen.ts`.
 */
export const FALLOS_PARA_OLVIDAR = 10;

export function esperaPorFallos(fallidos: number): number {
  return ESCALERA.find((escalon) => fallidos >= escalon.desde)?.esperaMs ?? 0;
}

export function debeOlvidarEquipo(fallidos: number): boolean {
  return fallidos >= FALLOS_PARA_OLVIDAR;
}

export function intentosRestantes(fallidos: number): number {
  return Math.max(0, FALLOS_PARA_OLVIDAR - fallidos);
}

/** Texto para el operador. Nunca en minutos con decimales. */
export function mensajeDeEspera(restanteMs: number): string {
  const segundos = Math.ceil(restanteMs / 1000);
  if (segundos <= 60) return `Espere ${segundos} segundos e intente de nuevo.`;
  const minutos = Math.ceil(segundos / 60);
  return `Espere ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'} e intente de nuevo.`;
}
