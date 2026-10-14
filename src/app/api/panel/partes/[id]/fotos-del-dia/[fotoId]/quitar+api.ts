import { parteEditable } from '@/features/bitacoras/servidor/acceso';
import { fotoQuitada } from '@/features/panel/contratos';
import { requerirPermiso } from '@/features/servidor/guardia';
import { cuerpoJson, errorDePeticion, noEncontrado, ok, responder } from '@/features/servidor/respuestas';
import { quitarFoto } from '@/features/whatsapp/servidor/fotos-del-dia';

/**
 * Quitar una foto de las «Fotos del día» (spec 027, RF-22 a RF-28).
 * `POST /api/panel/partes/:id/fotos-del-dia/:fotoId/quitar` con `{ motivo }`.
 *
 * Quien edita la bitácora —residente o gerencia— la quita con un motivo (RF-23, RF-24).
 * No se borra nada (principio 4): queda quién, cuándo y por qué (RF-25), la foto sigue en
 * el historial de WhatsApp (RF-26) y su fila impide que vuelva a entrar (RF-27).
 *
 * `parteEditable` comprueba el alcance por obra y que la bitácora siga abierta (RF-28); el
 * `update` lo vuelve a exigir, por si se cerró entre medias.
 */
export async function POST(peticion: Request, { id, fotoId }: { id: string; fotoId: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'bitacoras', 'escribir');
    if (sesion instanceof Response) return sesion;

    const estado = await parteEditable(sesion, id);
    if (estado instanceof Response) return estado;

    const { motivo } = await cuerpoJson(peticion, fotoQuitada);
    const resultado = await quitarFoto({ parteId: id, fotoId, motivo, quien: sesion.id });
    switch (resultado) {
      case 'quitada':
        return ok({ id: fotoId });
      case 'no_existe':
        return noEncontrado('esa foto');
      case 'ya_quitada':
        return errorDePeticion('Esa foto ya estaba quitada.', 409);
      case 'cerrada':
        return errorDePeticion('Esa bitácora ya está cerrada: sus fotos no se pueden quitar.', 409);
    }
  });
}
