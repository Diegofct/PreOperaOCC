/**
 * Las pólizas del contrato de una obra (spec 031, RF-23 a RF-26). Reglas puras: sin
 * I/O, como todo `shared/rules`.
 *
 * Una póliza tiene dos estados que no hay que confundir:
 *
 *  · el **registro** (`activa`, `reemplazada`, `anulada`): lo que hizo una persona con
 *    ella. Nada se borra (RF-26, constitución principio 4);
 *  · la **vigencia** (`vigente`, `por_vencer`, `vencida`): lo que dice el calendario
 *    sobre una póliza activa (RF-24).
 *
 * Solo las activas avisan (RF-25): una reemplazada ya tiene quien la cubra, y una
 * anulada nunca debió contar.
 */
import { plazoEnDias } from './contrato';

/** Los amparos de un contrato de obra pública (RF-23). */
export const AMPAROS = [
  { id: 'cumplimiento', nombre: 'Cumplimiento' },
  { id: 'anticipo', nombre: 'Buen manejo del anticipo' },
  { id: 'salarios', nombre: 'Salarios y prestaciones sociales' },
  { id: 'estabilidad', nombre: 'Estabilidad de la obra' },
  { id: 'rce', nombre: 'Responsabilidad civil extracontractual' },
  { id: 'otro', nombre: 'Otro' },
] as const;

export type Amparo = (typeof AMPAROS)[number]['id'];

export function esAmparo(valor: unknown): valor is Amparo {
  return typeof valor === 'string' && AMPAROS.some((a) => a.id === valor);
}

export function nombreDeAmparo(amparo: Amparo): string {
  return AMPAROS.find((a) => a.id === amparo)?.nombre ?? amparo;
}

export const ESTADOS_DE_REGISTRO_DE_POLIZA = ['activa', 'reemplazada', 'anulada'] as const;

export type EstadoDeRegistroDePoliza = (typeof ESTADOS_DE_REGISTRO_DE_POLIZA)[number];

export type VigenciaDePoliza = 'vigente' | 'por_vencer' | 'vencida';

export const NOMBRE_DE_VIGENCIA: Record<VigenciaDePoliza, string> = {
  vigente: 'Vigente',
  por_vencer: 'Por vencer',
  vencida: 'Vencida',
};

/** Desde cuántos días antes del fin una póliza sale «Por vencer» (RF-24). */
export const DIAS_DE_AVISO_DE_POLIZA = 30;

/**
 * La vigencia de una póliza el día `hoy` (RF-24), con lo que falta o lo que pasó:
 *
 *  · `hasta` antes de hoy → `vencida`;
 *  · de hoy a 30 días → `por_vencer` (el día del fin todavía cubre: vence ese día);
 *  · más de 30 días → `vigente`.
 */
export function vigenciaDePoliza(
  hasta: string,
  hoy: string,
): { vigencia: VigenciaDePoliza; dias: number; texto: string } {
  const faltan = plazoEnDias(hoy, hasta);
  if (faltan === null) {
    const pasados = plazoEnDias(hasta, hoy) ?? 0;
    return {
      vigencia: 'vencida',
      dias: pasados,
      texto: pasados === 1 ? 'Venció ayer' : `Venció hace ${pasados} días`,
    };
  }
  const texto = faltan === 0 ? 'Vence hoy' : faltan === 1 ? 'Vence mañana' : `Vence en ${faltan} días`;
  return { vigencia: faltan <= DIAS_DE_AVISO_DE_POLIZA ? 'por_vencer' : 'vigente', dias: faltan, texto };
}

export interface PolizaParaAviso {
  id: string;
  amparo: Amparo;
  numero: string;
  /** `YYYY-MM-DD`. */
  hasta: string;
  estado: EstadoDeRegistroDePoliza;
}

/**
 * Las pólizas que avisan en el Inicio (RF-25): activas, por vencer o vencidas, de la
 * que vence antes a la que vence después.
 */
export function polizasConAviso<P extends PolizaParaAviso>(
  polizas: readonly P[],
  hoy: string,
): (P & { vigencia: VigenciaDePoliza; texto: string })[] {
  return polizas
    .filter((p) => p.estado === 'activa')
    .map((p) => {
      const { vigencia, texto } = vigenciaDePoliza(p.hasta, hoy);
      return { ...p, vigencia, texto };
    })
    .filter((p) => p.vigencia !== 'vigente')
    .sort((a, b) => a.hasta.localeCompare(b.hasta));
}
