/**
 * Lo que comparten la lista de Solicitudes de compra, su detalle y Compras de Elemental
 * (spec 036): cómo se ve un estado, lo pedido en una línea y de qué se busca.
 */
import { Etiqueta } from '@/features/panel/componentes';
import type { SolicitudEnElLugar } from '@/features/panel/contratos';
import { nombreDeEstadoDeSolicitud, type EstadoDeSolicitud } from '@/shared/rules/compras';

/** El color de cada estado: lo que espera a alguien llama la atención; lo cerrado, no. */
const TONO_DEL_ESTADO: Record<EstadoDeSolicitud, 'neutro' | 'atencion' | 'malo' | 'bueno'> = {
  enviada: 'atencion',
  devuelta: 'atencion',
  aprobada: 'bueno',
  comprada: 'bueno',
  recibida_en_parte: 'atencion',
  recibida: 'neutro',
  rechazada: 'malo',
  cancelada: 'neutro',
};

export function EstadoDeLaSolicitud({ estado }: { estado: EstadoDeSolicitud }) {
  return <Etiqueta tono={TONO_DEL_ESTADO[estado]}>{nombreDeEstadoDeSolicitud(estado)}</Etiqueta>;
}

/** Lo pedido en una línea: «Cemento (20 bulto), Guantes (4 caja)». */
export function resumenDeLoPedido(renglones: SolicitudEnElLugar['renglones']): string {
  return renglones.map((r) => `${r.descripcion} (${r.cantidad.toLocaleString('es-CO')} ${r.unidad})`).join(', ');
}

/**
 * De qué se puede buscar (RF-26): el número —también «sc5» y «5»—, lo pedido, los
 * proveedores y quien la pidió. Es lo mismo que `coincideLaSolicitud`, dicho como campos
 * para el buscador común del panel.
 */
export function textoDeLaSolicitud(s: SolicitudEnElLugar): string[] {
  return [
    s.codigo,
    `sc${s.numero}`,
    String(s.numero),
    ...s.renglones.map((r) => r.descripcion),
    s.proveedorSugerido,
    ...s.proveedores,
    s.pedidaPor.nombre,
  ];
}
