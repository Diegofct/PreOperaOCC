import { darPaso, rechazoConCampos } from '@/features/laboratorio/servidor/ensayos';
import { requerirPermiso } from '@/features/servidor/guardia';
import { responder } from '@/features/servidor/respuestas';
import { validarEnsayo } from '@/shared/rules/granulometria';
import { fechaDeJornada } from '@/shared/rules/jornada';

/**
 * Enviar un ensayo a aprobación. `POST /api/panel/laboratorio/granulometrias/:id/enviar`
 * (spec 018, RF-72 a RF-75).
 *
 * Desde borrador o devuelto. Al enviarlo, el ensayo tiene que estar **completo**
 * (RF-73) y quien lo envía queda como «Revisó», con su cargo y la fecha (RF-75).
 * Desde aquí ya no lo corrige nadie hasta que lo devuelvan (RF-76).
 *
 * Se exige que nadie lo haya guardado entre la lectura y el envío: lo que se validó
 * tiene que ser exactamente lo que queda enviado.
 */
export async function POST(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'laboratorio', 'escribir');
    if (sesion instanceof Response) return sesion;

    return darPaso({
      sesion,
      id,
      accion: 'enviar',
      antes: (guardado) => {
        const errores = validarEnsayo(guardado, fechaDeJornada(), 'envio');
        return errores.length > 0 ? rechazoConCampos(errores) : null;
      },
      sinCambiosDesdeLaLectura: true,
      cambios: () => ({ estado: 'enviado', revisadoPor: sesion.id, revisadoEn: new Date() }),
    });
  });
}
