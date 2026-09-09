/**
 * La subida: vacía la cola de salida hacia el servidor.
 *
 * Hermano de `pull.ts` y con las mismas dos reglas: **nunca bloquea una
 * pantalla** y **si no hay señal, no pasa nada**. El operador captura y sigue
 * trabajando; esto ocurre por detrás o no ocurre.
 *
 * Tres decisiones que gobiernan el archivo:
 *
 *  1. **Orden estricto por `seq`, y al primer fallo se corta la tanda.** El
 *     `seq` es el orden en que se crearon los registros, que es también su orden
 *     de dependencia: mandar la foto de un preoperacional que no llegó es un
 *     error garantizado. Si algo no pudo salir, lo de atrás espera.
 *
 *  2. **Un fallo definitivo no detiene la tanda.** Los errores que reintentar no
 *     arregla —el vehículo ya no existe, el envío no valida— marcan esa fila como
 *     `fallida` y **el drenaje continúa**. Sin esta salida, un solo registro
 *     imposible congelaría la cola del teléfono para siempre.
 *
 *  3. **Nada se borra jamás.** Lo que sube se marca, no se elimina: ni la fila de
 *     la cola, ni el preoperacional, ni la bitácora. Perder una jornada de campo
 *     por un problema de red sería el peor fallo posible de este sistema, y esa
 *     regla ya está escrita en `intentos.ts` para el PIN.
 *
 * Las **imágenes son la única entidad que se puede saltar**. Las fotos de
 * hallazgo esperan a una WiFi para no gastar el plan de datos del operador
 * (`@/features/media/subir`), y saltarlas no rompe el orden estricto de `seq`
 * porque son lo único de lo que **nada depende**: ningún registro posterior
 * necesita que una foto haya llegado. Saltar un preoperacional sí lo rompería.
 */
import { eq, inArray } from 'drizzle-orm';

import { db } from '@/db/local/client';
import { bitacoras, media, preoperacionales, type EstadoSync } from '@/db/local/schema';
import { subirImagen } from '@/features/media/subir';

import { ErrorDelServidor, pedirConToken, SinConexion } from './cliente-http';
import { marcarEnviada, marcarFallida, proximoLote } from './outbox';

export interface ResultadoPush {
  estado: 'vacia' | 'subio' | 'sin_conexion' | 'reactivar';
  enviadas: number;
  fallidas: number;
}

/**
 * Los códigos que no tiene sentido reintentar.
 *
 * `422` es el que usan los endpoints de ingesta para "esto está mal y va a estar
 * mal siempre". El `400` cubre un envío que no valida. Todo lo demás —un 500, un
 * corte— sí se reintenta: son problemas del momento.
 */
function esDefinitivo(estado: number): boolean {
  return estado === 400 || estado === 422;
}

/**
 * Dónde va cada entidad que viaja como JSON.
 *
 * `media` no está aquí: su ruta lleva el id dentro (`/api/movil/media/:id`) y su
 * cuerpo son bytes, no texto. La arma `@/features/media/subir`.
 */
const RUTAS: Record<string, string | undefined> = {
  preoperacional: '/api/movil/preoperacionales',
  bitacora: '/api/movil/bitacoras',
  asignacion: '/api/movil/asignaciones',
};

export async function subirPendientes(limite = 50): Promise<ResultadoPush> {
  const lote = await proximoLote(limite);
  if (lote.length === 0) return { estado: 'vacia', enviadas: 0, fallidas: 0 };

  let enviadas = 0;
  let fallidas = 0;

  for (const fila of lote) {
    const esImagen = fila.entidad === 'media';
    const ruta = RUTAS[fila.entidad];

    // Una entidad que no sabemos mandar se salta sin tocarla: marcarla de
    // cualquier forma le haría perder su sitio en la fila.
    if (!esImagen && !ruta) continue;

    try {
      if (esImagen) {
        const resultado = await subirImagen(fila.entidadId, fila.claveIdempotencia);

        // Todavía no toca: no hay WiFi y esta imagen no es urgente. Se queda
        // pendiente, con su `seq` intacto, y lo de atrás sigue subiendo.
        if (resultado === 'espera_wifi') continue;

        if (resultado === 'sin_archivo') {
          // El archivo ya no está en el teléfono. Reintentar no lo va a traer
          // de vuelta, y dejarlo en la cola la congelaría para siempre.
          await marcarFallida(fila.seq, 'El archivo ya no está en el teléfono.', {
            definitivo: true,
          });
          fallidas += 1;
          continue;
        }
      } else if (ruta) {
        await pedirConToken(ruta, {
          method: 'POST',
          body: JSON.stringify({
            claveIdempotencia: fila.claveIdempotencia,
            ...(fila.payload as Record<string, unknown>),
          }),
        });
      }

      await marcarEnviada(fila.seq);
      await marcarCapturaSincronizada(fila.entidad, fila.entidadId);
      enviadas += 1;
    } catch (fallo) {
      if (fallo instanceof SinConexion) {
        // No es un fallo del registro: es que no hay red. No cuenta como intento
        // —gastaríamos los ocho en una obra sin cobertura— y la tanda se corta.
        return { estado: enviadas > 0 ? 'subio' : 'sin_conexion', enviadas, fallidas };
      }

      if (fallo instanceof ErrorDelServidor && fallo.exigeReactivar) {
        return { estado: 'reactivar', enviadas, fallidas };
      }

      const definitivo = fallo instanceof ErrorDelServidor && esDefinitivo(fallo.estado);
      const mensaje = fallo instanceof Error ? fallo.message : 'Error desconocido';

      await marcarFallida(fila.seq, mensaje, { definitivo });
      fallidas += 1;

      if (definitivo) {
        // Esta fila ya no vuelve a la cola, así que no bloquea a las de atrás.
        await marcarCapturaRechazada(fila.entidad, fila.entidadId, mensaje);
        continue;
      }

      // Fallo transitorio: se corta la tanda y se reintenta más tarde, con lo de
      // atrás intacto y en su orden.
      break;
    }
  }

  return { estado: enviadas > 0 ? 'subio' : 'sin_conexion', enviadas, fallidas };
}

/**
 * Marca la captura como subida en su propia tabla.
 *
 * `estadoSync` es lo que mira la interfaz del operador para saber qué le falta
 * por subir. La fila **no se borra**: el teléfono es la copia de respaldo hasta
 * que alguien decida lo contrario, y esa decisión no se toma aquí.
 */
async function marcarCapturaSincronizada(entidad: string, id: string): Promise<void> {
  const estado: EstadoSync = 'sincronizado';

  if (entidad === 'preoperacional') {
    await db
      .update(preoperacionales)
      .set({ estadoSync: estado, ultimoError: null, actualizadoEn: Date.now() })
      .where(eq(preoperacionales.id, id));
  } else if (entidad === 'media') {
    // **El archivo local no se borra.** Ya está a salvo arriba, pero el teléfono
    // sigue siendo la copia de respaldo: purgarlo es una decisión de política de
    // almacenamiento, no del motor de subida. Por eso `purgarDespuesDe` sigue
    // sin usarse, y está bien que así sea.
    await db.update(media).set({ estadoSubida: 'subida' }).where(eq(media.id, id));
  } else if (entidad === 'bitacora') {
    await db
      .update(bitacoras)
      .set({ estadoSync: estado, ultimoError: null, actualizadoEn: Date.now() })
      .where(eq(bitacoras.id, id));
  }
}

/** El servidor lo rechazó de forma definitiva. Se anota, no se borra. */
async function marcarCapturaRechazada(
  entidad: string,
  id: string,
  motivo: string,
): Promise<void> {
  const estado: EstadoSync = 'rechazado';
  const cambios = { estadoSync: estado, ultimoError: motivo.slice(0, 300), actualizadoEn: Date.now() };

  if (entidad === 'preoperacional') {
    await db.update(preoperacionales).set(cambios).where(eq(preoperacionales.id, id));
  } else if (entidad === 'media') {
    await db.update(media).set({ estadoSubida: 'fallida' }).where(eq(media.id, id));
  } else if (entidad === 'bitacora') {
    await db.update(bitacoras).set(cambios).where(eq(bitacoras.id, id));
  }
}

/**
 * Cuántas capturas quedan sin subir, para la píldora del inicio.
 *
 * Cuenta las filas de trabajo y no las de la cola: al operador le importa
 * cuántos preoperacionales suyos siguen en el teléfono, no cuántas operaciones
 * pendientes hay en una estructura interna.
 */
export async function capturasSinSubir(): Promise<number> {
  const pendientes: EstadoSync[] = ['borrador', 'pendiente', 'rechazado'];
  const [preops, bits] = await Promise.all([
    db.select({ id: preoperacionales.id }).from(preoperacionales).where(inArray(preoperacionales.estadoSync, pendientes)),
    db.select({ id: bitacoras.id }).from(bitacoras).where(inArray(bitacoras.estadoSync, pendientes)),
  ]);
  return preops.length + bits.length;
}
