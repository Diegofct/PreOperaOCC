import { propuestaCorregida } from '@/features/panel/contratos';
import { requerirPermiso } from '@/features/servidor/guardia';
import { cuerpoJson, noEncontrado, ok, responder } from '@/features/servidor/respuestas';
import { leerDetalle } from '@/features/whatsapp/servidor/bandeja';
import { corregirPropuesta } from '@/features/whatsapp/servidor/decisiones';
import { idDeLaRuta } from '@/features/whatsapp/servidor/obra';

/**
 * Una propuesta de la bandeja. `GET /api/panel/whatsapp/propuestas/:id` (spec 021,
 * RF-17 a RF-22, RF-60 a RF-62, RF-89).
 *
 * Trae el reporte listo para revisar: lo corregido si alguien corrigió, o lo que
 * propuso la IA leído contra los catálogos de la obra, con lo que todavía impide
 * aprobarlo y lo que reemplazaría en la bitácora del día.
 */
export async function GET(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'whatsapp', 'ver');
    if (sesion instanceof Response) return sesion;

    const detalle = await leerDetalle(sesion, idDeLaRuta(id));
    return detalle ? ok(detalle) : noEncontrado('esa propuesta');
  });
}

/**
 * Corregir una propuesta pendiente. `PATCH /api/panel/whatsapp/propuestas/:id` con
 * `{ version, propuesta }` (RF-26 a RF-29). Se guarda aunque esté a medias: lo que
 * falta se exige al aprobar. Responde la versión nueva, que es la que hay que
 * mandar en la siguiente corrección o decisión.
 */
export async function PATCH(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'whatsapp', 'escribir');
    if (sesion instanceof Response) return sesion;

    const pedido = await cuerpoJson(peticion, propuestaCorregida);
    const resultado = await corregirPropuesta(sesion, idDeLaRuta(id), pedido);
    return resultado instanceof Response ? resultado : ok(resultado);
  });
}
