import { abrirConversacion, archivarConversacion } from '@/features/asistente/servidor/conversaciones';
import { archivoDeConversacion } from '@/features/panel/contratos';
import { requerirPermiso } from '@/features/servidor/guardia';
import { cuerpoJson, noEncontrado, ok, responder } from '@/features/servidor/respuestas';
import { alcanceDelAsistente } from '@/shared/rules/asistente';

/**
 * Una conversación (spec 028). `GET` la abre con sus mensajes tal como se dieron (RF-41,
 * RF-42), o solo con su título si ya no alcanza lo que consultó (RF-49). `PATCH
 * { archivada }` la archiva o la saca del archivo (RF-45). Una ajena es 404 (RF-40).
 */
export async function GET(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'asistente', 'listar');
    if (sesion instanceof Response) return sesion;
    const abierta = await abrirConversacion(sesion.id, id, alcanceDelAsistente(sesion));
    return abierta ? ok(abierta) : noEncontrado('esa conversación');
  });
}

export async function PATCH(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'asistente', 'ver');
    if (sesion instanceof Response) return sesion;
    const { archivada } = await cuerpoJson(peticion, archivoDeConversacion);
    return (await archivarConversacion(sesion.id, id, archivada)) ? ok({ archivada }) : noEncontrado('esa conversación');
  });
}
