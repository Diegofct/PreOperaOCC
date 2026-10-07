/**
 * Registrar desde la bandeja a las personas de un reporte que no están en el sistema
 * (spec 023, RF-57 a RF-68). **Solo servidor.**
 *
 * ── Quién y cómo ──
 *
 * El residente de la obra y la gerencia, con el permiso de la bandeja
 * (`whatsapp:aprobar`), y solo desde aquí: la ruta de Personas sigue cerrada al
 * residente (RF-58, RF-59). La persona queda en la obra del mensaje (RF-63), con su
 * cargo o «sin definir» (RF-61), y **sin acceso**: rol `operador`, sin contraseña ni
 * código de celular, como hoy un cadenero o un ayudante (RF-64). El acceso lo da
 * después la gerencia en Personas.
 *
 * ── Antes de aprobar, y aparte ──
 *
 * Es una acción propia y no parte de la aprobación porque RF-67 pide que las
 * personas queden aunque el reporte se descarte, y porque quien revisa tiene que
 * verlas reconocidas antes de aprobar. Son dos pasos sin transacción, y los dos
 * resisten el reintento:
 *
 *  1. **una** sentencia crea a todas, con id fijo por mensaje, sección y renglón
 *     (`idDeterminista`) y `on conflict do nothing`: repetir no duplica;
 *  2. se guarda la propuesta con el `usuarioId` de cada renglón, como una
 *     corrección, condicionada a la versión que se leyó (021/RF-29).
 *
 * Si el paso 2 choca con otra persona que corrigió entre medias, las registradas se
 * quedan (es lo mismo que RF-67) y quien revisa vuelve a abrir la propuesta: al
 * pedirlo de nuevo, el paso 1 no crea nada y el 2 las asigna.
 */
import { and, eq, inArray, sql } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { usuarios, whatsappGrupos, whatsappMensajes } from '@/db/servidor/esquema';
import { filtroDeObraEstricto } from '@/features/servidor/alcance';
import type { PersonaEnSesion } from '@/features/servidor/guardia';
import { errorDePeticion, noEncontrado } from '@/features/servidor/respuestas';
import type { Cargo } from '@/shared/catalogos/cargos';
import {
  rechazoDeRegistro,
  usuarioDeLaBandeja,
  type ReporteDelDia,
} from '@/shared/rules/whatsapp';

import { idDeterminista } from './ids';
import { obraDelMensaje } from './obra';

export interface PersonasRegistradas {
  version: number;
  personas: { seccion: 'personal' | 'maquinaria'; renglon: number; usuarioId: string }[];
}

export async function registrarPersonasDesdeLaBandeja(
  sesion: PersonaEnSesion,
  id: string,
  pedido: {
    version: number;
    propuesta: ReporteDelDia;
    personas: {
      seccion: 'personal' | 'maquinaria';
      renglon: number;
      nombre: string;
      cargo: Cargo | null;
    }[];
  },
): Promise<PersonasRegistradas | Response> {
  const db = baseServidor();

  const [mensaje] = await db
    .select({
      estado: whatsappMensajes.estado,
      version: whatsappMensajes.version,
      obraId: sql<string>`${obraDelMensaje}`,
    })
    .from(whatsappMensajes)
    .innerJoin(whatsappGrupos, eq(whatsappGrupos.id, whatsappMensajes.grupoId))
    .where(and(eq(whatsappMensajes.id, id), filtroDeObraEstricto(sesion, obraDelMensaje)))
    .limit(1);
  if (!mensaje) return noEncontrado('esa propuesta');
  if (mensaje.estado !== 'pendiente') {
    return errorDePeticion('Esta propuesta ya no está pendiente. Vuelva a abrirla para ver cómo quedó.', 409);
  }
  if (mensaje.version !== pedido.version) {
    return errorDePeticion(
      'Otra persona cambió esta propuesta mientras usted la tenía abierta. Vuelva a abrirla.',
      409,
    );
  }

  // Cada renglón tiene que existir y estar sin persona (RF-57), y no repetirse.
  const vistos = new Set<string>();
  for (const p of pedido.personas) {
    const clave = `${p.seccion}:${p.renglon}`;
    const rechazo = vistos.has(clave)
      ? 'Ese renglón está dos veces en el pedido.'
      : rechazoDeRegistro(pedido.propuesta, p);
    if (rechazo) {
      return Response.json(
        { error: rechazo, faltas: [{ seccion: p.seccion, renglon: p.renglon, mensaje: rechazo }] },
        { status: 400 },
      );
    }
    vistos.add(clave);
  }

  // 1. Las personas, todas en una sentencia, con id fijo (RF-63, RF-64, RF-66, RF-68).
  const nuevas = await Promise.all(
    pedido.personas.map(async (p) => {
      const usuarioId = await idDeterminista(id, `persona-${p.seccion}`, p.renglon);
      return {
        ...p,
        usuarioId,
        fila: {
          id: usuarioId,
          usuario: usuarioDeLaBandeja(p.nombre, usuarioId),
          nombreCompleto: p.nombre.trim(),
          // Sin acceso: rol operador y sin credenciales (RF-64).
          rol: 'operador' as const,
          cargo: p.cargo,
          obraId: mensaje.obraId,
          activo: true,
          registradoPor: sesion.id,
          mensajeWhatsappId: id,
        },
      };
    }),
  );
  await db
    .insert(usuarios)
    .values(nuevas.map((n) => n.fila))
    .onConflictDoNothing({ target: usuarios.id });

  // Las que se crearon de verdad: un `usuario` que chocara con otro vigente se habría
  // saltado sin error, y la propuesta no puede apuntar a una persona que no existe.
  const creadas = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(inArray(usuarios.id, nuevas.map((n) => n.usuarioId)));
  if (creadas.length !== nuevas.length) {
    return errorDePeticion('No se pudo registrar a todas las personas. Vuelva a intentarlo.', 500);
  }

  // 2. La propuesta, con cada persona en su renglón, como una corrección (021/RF-29).
  const propuesta: ReporteDelDia = {
    ...pedido.propuesta,
    personal: pedido.propuesta.personal.map((p) => ({ ...p })),
    maquinaria: pedido.propuesta.maquinaria.map((m) => ({ ...m })),
  };
  for (const n of nuevas) {
    if (n.seccion === 'personal') propuesta.personal[n.renglon].usuarioId = n.usuarioId;
    else propuesta.maquinaria[n.renglon].operadorId = n.usuarioId;
  }

  const [guardada] = await db
    .update(whatsappMensajes)
    .set({
      propuesta: propuesta as unknown as Record<string, unknown>,
      version: sql`${whatsappMensajes.version} + 1`,
    })
    .where(
      and(
        eq(whatsappMensajes.id, id),
        eq(whatsappMensajes.estado, 'pendiente'),
        eq(whatsappMensajes.version, pedido.version),
      ),
    )
    .returning({ version: whatsappMensajes.version });
  if (!guardada) {
    return errorDePeticion(
      'Las personas quedaron registradas, pero otra persona cambió la propuesta mientras tanto. Vuelva a abrirla y elíjalas de la lista.',
      409,
    );
  }

  return {
    version: guardada.version,
    personas: nuevas.map(({ seccion, renglon, usuarioId }) => ({ seccion, renglon, usuarioId })),
  };
}
