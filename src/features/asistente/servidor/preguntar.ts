/**
 * Una pregunta al asistente, de punta a punta (spec 028). **Solo servidor.** La usa
 * `POST /api/panel/asistente/preguntar`.
 *
 * Antes de llamar a la IA, sin gastar nada:
 *  1. que le quede cupo hoy (RF-52, RF-53);
 *  2. que la conversación sea suya y la siga alcanzando (RF-40, RF-49);
 *  3. que los adjuntos sirvan (RF-66 a RF-68).
 *
 * Después guarda los adjuntos y la pregunta, y responde en `text/event-stream`: el texto
 * a medida que llega (RF-13), las fuentes (RF-28) y al final `fin` con el cupo, o
 * `error` con el motivo (RF-61). La respuesta se guarda pase lo que pase; solo cuenta en
 * el día si salió bien (RF-55). Si la persona cierra la pantalla, se corta y queda
 * fallida, para reintentarla (RF-62).
 */
import type { CupoDelAsistente, EventoDelAsistente } from '@/features/panel/contratos';
import type { PersonaEnSesion } from '@/features/servidor/guardia';
import { errorDePeticion } from '@/features/servidor/respuestas';
import { alcanceDelAsistente, conversacionVisible } from '@/shared/rules/asistente';
import { fechaDeJornada } from '@/shared/rules/jornada';
import { ETIQUETA_ROL } from '@/shared/rules/permisos';

import { guardarAdjuntos, leerAdjuntos, type ArchivoRecibido } from './adjuntos';
import { responderPregunta } from './conversacion';
import { crearConversacion, guardarPregunta, guardarRespuesta, historialDe, suConversacion } from './conversaciones';
import { cupoDelDia, sumarUso } from './uso';

/** Una pregunta escrita no necesita más; lo largo va en un adjunto. */
const CARACTERES_MAXIMOS_DE_LA_PREGUNTA = 4_000;

export interface PreguntaRecibida {
  pregunta: string;
  conversacionId: string | null;
  archivos: ArchivoRecibido[];
}

function evento(e: EventoDelAsistente): Uint8Array {
  const { evento: nombre, ...datos } = e;
  return new TextEncoder().encode(`event: ${nombre}\ndata: ${JSON.stringify(datos)}\n\n`);
}

export async function preguntar(sesion: PersonaEnSesion, recibida: PreguntaRecibida, senal: AbortSignal): Promise<Response> {
  const alcance = alcanceDelAsistente(sesion);
  const pregunta = recibida.pregunta.trim();
  if (!pregunta && recibida.archivos.length === 0) return errorDePeticion('Escriba una pregunta o adjunte un archivo.', 422);
  if (pregunta.length > CARACTERES_MAXIMOS_DE_LA_PREGUNTA) {
    return errorDePeticion(`La pregunta pasa de ${CARACTERES_MAXIMOS_DE_LA_PREGUNTA} caracteres. Si es un documento, adjúntelo.`, 422);
  }

  const cupo = await cupoDelDia(sesion.id);
  if (cupo.quedan === 0) {
    return errorDePeticion(`Ya hizo sus ${cupo.limite} preguntas de hoy. Podrá preguntar de nuevo mañana.`, 429);
  }

  let conversacionId = recibida.conversacionId;
  let titulo = '';
  if (conversacionId) {
    const c = await suConversacion(sesion.id, conversacionId);
    if (!c) return errorDePeticion('No existe esa conversación.', 404);
    if (!conversacionVisible({ obras: c.obras, modulos: c.modulos }, alcance)) {
      return errorDePeticion('Esa conversación consultó información que ya no está a su alcance. Empiece una nueva.', 409);
    }
    titulo = c.titulo;
  }

  const leidos = await leerAdjuntos(recibida.archivos);
  if (!leidos.ok) return errorDePeticion(leidos.error, 422);

  if (!conversacionId) {
    conversacionId = await crearConversacion(sesion.id, pregunta, recibida.archivos.length > 0);
    const c = await suConversacion(sesion.id, conversacionId);
    titulo = c?.titulo ?? '';
  }
  const historial = await historialDe(conversacionId);
  const adjuntos = await guardarAdjuntos(conversacionId, leidos.adjuntos);
  await guardarPregunta(conversacionId, pregunta, adjuntos);

  const id = conversacionId;
  const flujo = new ReadableStream<Uint8Array>({
    async start(control) {
      let abierto = true;
      const mandar = (e: EventoDelAsistente) => {
        if (!abierto) return;
        try {
          control.enqueue(evento(e));
        } catch {
          // La persona cerró la pantalla: lo que falta igual se guarda.
          abierto = false;
        }
      };
      mandar({ evento: 'conversacion', id, titulo });

      const r = await responderPregunta(
        {
          alcance,
          quien: `${sesion.nombreCompleto}, ${ETIQUETA_ROL[sesion.rol].toLowerCase()}`,
          hoy: fechaDeJornada(),
          historial,
          pregunta,
          adjuntos: leidos.adjuntos,
        },
        (e) => {
          if (e.tipo === 'texto') mandar({ evento: 'texto', texto: e.texto });
          else if (e.tipo === 'borrar') mandar({ evento: 'borrar' });
          else if (e.tipo === 'consultando') mandar({ evento: 'consultando', consulta: e.consulta });
          else mandar({ evento: 'fuente', fuente: e.fuente });
        },
        senal,
      );

      let cupoFinal: CupoDelAsistente = cupo;
      try {
        const mensajeId = await guardarRespuesta(id, r);
        if (r.ok) await sumarUso(sesion.id, r.consulto.obras, r.tokens);
        cupoFinal = await cupoDelDia(sesion.id);
        mandar(r.ok ? { evento: 'fin', mensajeId, cupo: cupoFinal } : { evento: 'error', mensaje: r.error, cupo: cupoFinal });
      } catch (fallo) {
        console.error('[asistente] no se pudo guardar la respuesta:', fallo);
        mandar({ evento: 'error', mensaje: 'La respuesta no se pudo guardar. Reintente la pregunta.', cupo: cupoFinal });
      }
      if (abierto) control.close();
    },
  });

  return new Response(flujo, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      // Sin caché ni transformaciones: cada pedazo tiene que llegar en cuanto sale.
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
