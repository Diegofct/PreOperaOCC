/**
 * Piezas de las pantallas de la requisición de pagos de OCC (spec 047) que se repiten: el estado
 * como etiqueta, la fecha y la hora de Colombia, y qué dice cada paso de la historia.
 *
 * La historia la escribe el servidor con un `paso` y sus `cambios`; aquí solo se lee en palabras
 * (RF-39). Un paso que no se reconoce se muestra tal cual: mejor un nombre técnico que una línea
 * en blanco que esconda que pasó algo.
 */
import { Etiqueta } from '@/features/panel/componentes';
import type { RequisicionOccDetallada } from '@/features/panel/requisiciones-occ';
import { fechaDelCorte } from '@/shared/rules/cortes';
import { nombreDeMedio } from '@/shared/rules/pagos';
import { enPesos } from '@/shared/rules/pesos';
import { nombreDeEstadoOcc, type EstadoDeRequisicionOcc } from '@/shared/rules/requisicion-occ';

export type EventoOcc = RequisicionOccDetallada['historia'][number];

export const cuando = (iso: string) => new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });

const TONO: Record<EstadoDeRequisicionOcc, 'neutro' | 'atencion' | 'malo' | 'bueno'> = {
  borrador: 'neutro',
  en_autorizacion: 'atencion',
  devuelta: 'malo',
  autorizada: 'bueno',
  pagada_en_parte: 'atencion',
  pagada: 'bueno',
  no_autorizada: 'malo',
  cancelada: 'neutro',
};

/** El estado con su color y, siempre, su nombre escrito: el color nunca va solo. */
export function EstadoOcc({ estado }: { estado: EstadoDeRequisicionOcc }) {
  return <Etiqueta tono={TONO[estado]}>{nombreDeEstadoOcc(estado)}</Etiqueta>;
}

const primero = (e: EventoOcc) => (e.cambios[0] ?? {}) as Record<string, unknown>;
const veces = (n: number, una: string, varias: string) => `${n} ${n === 1 ? una : varias}`;

/** Lo que dice la historia de cada paso (RF-39). */
export function textoDelEventoOcc(e: EventoOcc): string {
  const c = primero(e);
  switch (e.paso) {
    case 'creada':
      return `La creó para el viernes ${c.viernes ? fechaDelCorte(String(c.viernes)) : ''}.`;
    case 'linea_agregada':
      return `Agregó una línea: ${String(c.beneficiario ?? '')} · ${String(c.concepto ?? '')} · ${enPesos(Number(c.valor ?? 0))}.`;
    case 'linea_cambiada': {
      const campos = (c.campos as { campo: string }[] | undefined) ?? [];
      return `Cambió una línea (${campos.map((x) => NOMBRE_DEL_CAMPO[x.campo] ?? x.campo).join(', ')}).`;
    }
    case 'linea_quitada':
      return `Quitó una línea: ${String(c.beneficiario ?? '')} · ${String(c.concepto ?? '')}.`;
    case 'adjunto':
      return `Adjuntó ${c.clase === 'rut' ? 'el RUT' : 'la cuenta bancaria'} a una línea («${String(c.nombreArchivo ?? '')}»).`;
    case 'importada':
      return `Importó ${veces(Number(c.lineas ?? 0), 'línea', 'líneas')} de «${String(c.nombreArchivo ?? '')}».`;
    case 'enviada':
      return Number(c.ronda ?? 1) > 1 ? 'La volvió a enviar después de corregirla.' : 'La envió para autorizar.';
    case 'devuelta':
      return 'La devolvió para corregir.';
    case 'respuestas': {
      const respuestas = e.cambios as { numero?: number; respuesta?: string }[];
      const si = respuestas.filter((r) => r.respuesta === 'autorizada').map((r) => r.numero);
      const no = respuestas.filter((r) => r.respuesta === 'no_autorizada').map((r) => r.numero);
      return [si.length ? `Autorizó ${si.length === 1 ? 'la línea' : 'las líneas'} ${si.join(', ')}.` : '', no.length ? `No autorizó ${no.length === 1 ? 'la línea' : 'las líneas'} ${no.join(', ')}.` : '']
        .filter(Boolean)
        .join(' ');
    }
    case 'autorizada':
      return `Quedó autorizada: ${veces(Number(c.autorizadas ?? 0), 'línea', 'líneas')} de ${Number(c.lineas ?? 0)}, por ${enPesos(Number(c.totalAPagar ?? 0))}.`;
    case 'no_autorizada':
      return 'Quedó sin ninguna línea autorizada.';
    case 'cancelada':
      return 'La canceló.';
    case 'pago':
      return `Registró un pago de ${enPesos(Number(c.valor ?? 0))} de la línea ${Number(c.numero ?? 0)} por ${nombreDeMedio(String(c.medio ?? '')).toLowerCase()}.`;
    case 'anular_pago':
      return `Anuló un pago de ${enPesos(Number(c.valor ?? 0))}.`;
    default:
      return e.paso;
  }
}

const NOMBRE_DEL_CAMPO: Record<string, string> = {
  fechaSolicitud: 'fecha de solicitud',
  beneficiario: 'beneficiario',
  concepto: 'concepto',
  especificaciones: 'especificaciones',
  proveedor: 'proveedor',
  valor: 'valor',
  observaciones: 'observaciones',
};
