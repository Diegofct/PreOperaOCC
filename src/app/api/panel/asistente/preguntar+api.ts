import { preguntar } from '@/features/asistente/servidor/preguntar';
import { requerirPermiso } from '@/features/servidor/guardia';
import { errorDePeticion, responder } from '@/features/servidor/respuestas';

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
    return preguntar(
      sesion,
      {
        pregunta: String(formulario.get('pregunta') ?? ''),
        conversacionId: typeof conversacionId === 'string' && conversacionId ? conversacionId : null,
        archivos,
      },
      peticion.signal,
    );
  });
}
