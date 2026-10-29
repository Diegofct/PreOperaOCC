import { and, eq, isNull } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { obras } from '@/db/servidor/esquema';
import { preguntar } from '@/features/asistente/servidor/preguntar';
import { requerirPermiso } from '@/features/servidor/guardia';
import { errorDePeticion, noEncontrado, responder } from '@/features/servidor/respuestas';
import { alcanceDelAsistente, obraAlAlcance } from '@/shared/rules/asistente';

interface ArchivoDelFormulario {
  name: string;
  type: string;
  arrayBuffer(): Promise<ArrayBuffer>;
}

interface FormularioRecibido {
  get(nombre: string): string | ArchivoDelFormulario | null;
  getAll(nombre: string): (string | ArchivoDelFormulario)[];
}

/**
 * Preguntarle al asistente (spec 028). `POST /api/panel/asistente/preguntar`, en
 * `multipart/form-data`: `pregunta`, `conversacionId` (opcional, para seguir una) y
 * `archivo` repetido por cada adjunto (RF-66).
 *
 * Responde `text/event-stream` (RF-13): `conversacion`, `texto`, `consultando`, `fuente`
 * y al final `fin` o `error`. Antes de empezar puede responder 422 (pregunta vacía o un
 * adjunto que no sirve), 429 (sin cupo hoy, RF-53), 404 o 409 (conversación ajena o
 * fuera de alcance).
 */
export async function POST(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'asistente', 'ver');
    if (sesion instanceof Response) return sesion;

    // Con los tipos de React Native, `FormData` es el del celular; en el servidor es el de
    // la web. Se nombra solo lo que se usa.
    const formulario = (await peticion.formData().catch(() => null)) as unknown as FormularioRecibido | null;
    if (!formulario) return errorDePeticion('La pregunta llegó mal formada.');
    const archivos = await Promise.all(
      formulario
        .getAll('archivo')
        .filter((a): a is ArchivoDelFormulario => typeof a !== 'string')
        .map(async (a) => ({ nombre: a.name, tipo: a.type, contenido: new Uint8Array(await a.arrayBuffer()) })),
    );
    const conversacionId = formulario.get('conversacionId');

    // Spec 033, RF-30: preguntada desde una obra, la IA responde sobre ella si no nombra
    // otra. Una obra que no existe o que no alcanza es un 404, como en el resto del panel.
    const obraId = formulario.get('obraId');
    let obraPorDefecto: { id: string; nombre: string } | null = null;
    if (typeof obraId === 'string' && obraId) {
      const [obra] = await baseServidor()
        .select({ id: obras.id, nombre: obras.nombre })
        .from(obras)
        .where(and(eq(obras.id, obraId), isNull(obras.eliminadoEn)))
        .limit(1);
      if (!obra || !obraAlAlcance(alcanceDelAsistente(sesion), obra.id)) return noEncontrado('esa obra');
      obraPorDefecto = obra;
    }

    return preguntar(
      sesion,
      {
        pregunta: String(formulario.get('pregunta') ?? ''),
        conversacionId: typeof conversacionId === 'string' && conversacionId ? conversacionId : null,
        archivos,
        obraPorDefecto,
      },
      peticion.signal,
    );
  });
}
