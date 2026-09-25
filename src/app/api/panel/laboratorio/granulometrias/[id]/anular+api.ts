import { darPaso } from '@/features/laboratorio/servidor/ensayos';
import { anulacion } from '@/features/panel/contratos';
import { requerirPermiso } from '@/features/servidor/guardia';
import { cuerpoJson, responder } from '@/features/servidor/respuestas';

/**
 * Anular un ensayo aprobado. `POST /api/panel/laboratorio/granulometrias/:id/anular`
 * (spec 018, RF-86 a RF-89).
 *
 * Un ensayo aprobado es evidencia y no se corrige: se anula con motivo escrito y se
 * registra otro, igual que un preoperacional firmado o un parte cerrado. **Nada se
 * borra**: los datos se conservan tal cual, con quién lo anuló, cuándo y por qué, y el
 * informe sale con la marca ANULADO. Anular deja libre su número de informe (RF-41).
 */
export async function POST(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'laboratorio', 'anular');
    if (sesion instanceof Response) return sesion;

    const { motivo } = await cuerpoJson(peticion, anulacion);

    return darPaso({
      sesion,
      id,
      accion: 'anular',
      texto: motivo,
      cambios: () => ({ anuladoEn: new Date(), anuladoPor: sesion.id, motivoAnulacion: motivo }),
    });
  });
}
