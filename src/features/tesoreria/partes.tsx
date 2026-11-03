/**
 * Lo que comparten la lista de Solicitudes de pago, su detalle y Tesorería de Elemental
 * (spec 037): cómo se ve un estado, cómo se dice el valor y de qué se busca.
 */
import { Etiqueta } from '@/features/panel/componentes';
import type { SolicitudDePagoEnElLugar } from '@/features/panel/contratos';
import { nombreDeEstadoDePago, type EstadoDePago } from '@/shared/rules/pagos';
import { enPesos } from '@/shared/rules/pesos';

/** El color de cada estado: lo que espera a alguien llama la atención; lo cerrado, no. */
const TONO_DEL_ESTADO: Record<EstadoDePago, 'neutro' | 'atencion' | 'malo' | 'bueno'> = {
  enviada: 'atencion',
  devuelta: 'atencion',
  aprobada: 'bueno',
  pagada_en_parte: 'atencion',
  pagada: 'neutro',
  rechazada: 'malo',
  cancelada: 'neutro',
};

export function EstadoDelPago({ estado }: { estado: EstadoDePago }) {
  return <Etiqueta tono={TONO_DEL_ESTADO[estado]}>{nombreDeEstadoDePago(estado)}</Etiqueta>;
}

/**
 * El valor en una línea: lo pedido y, si se aprobó por menos o ya se pagó algo, eso
 * también. `null` si quien mira no ve el valor (RF-5a): el servidor no lo mandó.
 */
export function valorDelPago(s: Pick<SolicitudDePagoEnElLugar, 'valor' | 'valorAprobado' | 'pagado'>): string[] | null {
  if (s.valor === undefined) return null;
  const lineas = [enPesos(s.valor)];
  if (s.valorAprobado && s.valorAprobado !== s.valor) lineas.push(`Aprobado ${enPesos(s.valorAprobado)}`);
  if (s.pagado) lineas.push(`Pagado ${enPesos(s.pagado)}`);
  return lineas;
}

/**
 * De qué se puede buscar (RF-22): el número —también «sp5» y «5»—, el beneficiario, su NIT,
 * el para qué y quien la pidió. Es lo mismo que `coincideElPago`, dicho como campos para el
 * buscador común del panel.
 */
export function textoDelPago(s: SolicitudDePagoEnElLugar): string[] {
  return [s.codigo, `sp${s.numero}`, String(s.numero), s.beneficiario, s.beneficiarioDocumento, s.paraQue, s.pedidaPor.nombre];
}
