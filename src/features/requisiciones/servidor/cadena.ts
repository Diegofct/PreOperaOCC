/**
 * Quién ocupa hoy cada paso de la cadena de una requisición (spec 046, RF-18, RF-23, RF-73 a
 * RF-75). Solo servidor.
 *
 * La regla (`rules/requisiciones.ts`) decide con una lista de personas por paso; aquí se arma esa
 * lista con una sola consulta: las personas activas con uno de los cuatro accesos de la cadena y,
 * para el Director de Obra, si tiene esta obra vigente. El acceso no basta: un Director de Obra de
 * otra obra tiene el mismo acceso y no es de esta cadena, y un Residente es de la obra que tiene
 * en `obra_id`.
 *
 * «Activo» es `activo` y sin `eliminado_en`: una persona dada de baja o desactivada deja el paso
 * vacío, y lo que la esperaba se reacomoda (RF-71).
 */
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { usuarios, usuariosObras } from '@/db/servidor/esquema';
import type { RequisicionEnElDetalle } from '@/features/panel/requisiciones';
import type { PersonaEnSesion } from '@/features/servidor/guardia';
import {
  cadenaDesdeLaHistoria,
  estadoQueSeVe,
  NOMBRE_DEL_PASO,
  numeroQueSeVe,
  puedeDecidir,
  puedeRecortar,
  type EventoDeLaHistoria,
  type OcupantesDeLaCadena,
  type PasoDeLaCadena,
  type TipoDeRequisicion,
} from '@/shared/rules/requisiciones';

/** Dónde se pide: una obra, GeoLab u OCC (RF-86). */
export type LugarDeLaCadena = { obraId: string } | { empresa: 'geolab' | 'occ' };

const ROLES_DE_LA_CADENA = ['residente', 'director_obra', 'director_proyectos', 'administradora_elemental'] as const;

/**
 * Los ocupantes de cada paso para ese lugar. En GeoLab y en OCC solo cuenta la Administradora
 * (RF-19, RF-88): los demás pasos quedan vacíos, y la regla no los recorre.
 */
export async function ocupantesDeLaCadena(lugar: LugarDeLaCadena): Promise<OcupantesDeLaCadena> {
  const obraId = 'obraId' in lugar ? lugar.obraId : null;
  const filas = await baseServidor()
    .select({
      id: usuarios.id,
      rol: usuarios.rol,
      obraId: usuarios.obraId,
      // El Director de Obra lleva sus obras en `usuarios_obras` (spec 041), no en `obra_id`.
      tieneLaObra: sql<boolean>`${usuariosObras.id} is not null`,
    })
    .from(usuarios)
    .leftJoin(
      usuariosObras,
      and(
        eq(usuariosObras.usuarioId, usuarios.id),
        obraId ? eq(usuariosObras.obraId, obraId) : sql`false`,
        isNull(usuariosObras.hasta),
      ),
    )
    .where(and(eq(usuarios.activo, true), isNull(usuarios.eliminadoEn), inArray(usuarios.rol, [...ROLES_DE_LA_CADENA])));

  const de = (rol: (typeof ROLES_DE_LA_CADENA)[number], condicion: (f: (typeof filas)[number]) => boolean = () => true) => [
    ...new Set(filas.filter((f) => f.rol === rol && condicion(f)).map((f) => f.id)),
  ];

  return {
    residente: obraId ? de('residente', (f) => f.obraId === obraId) : [],
    director_obra: obraId ? de('director_obra', (f) => f.tieneLaObra) : [],
    // RF-73: el paso del Director de Proyectos lo ocupa cualquiera del grupo.
    director_proyectos: obraId ? de('director_proyectos') : [],
    administradora: de('administradora_elemental'),
  };
}

/**
 * Lo de requisición del detalle de una RQ (RF-33, RF-46, RF-82): su número, el estado que se lee,
 * cada paso de la vuelta actual con quién lo ocupa, y si quien mira puede decidirla o recortarla.
 * `undefined` en una SC o SP anterior: esas no tienen cadena. Vive aquí y no en el servidor de
 * requisiciones porque lo usan los detalles de la 036 y la 037, y así no se importan en círculo.
 */
export async function requisicionEnElDetalle(
  sesion: PersonaEnSesion,
  fila: {
    tipo: TipoDeRequisicion;
    numero: number;
    numeroRequisicion: number | null;
    estado: string;
    paso: string | null;
    pedidaPor: string;
    obraId: string | null;
    empresaId?: string | null;
  },
  eventos: readonly { paso: string; cambios: readonly unknown[]; por: string | null; en: Date; motivo: string | null }[],
): Promise<RequisicionEnElDetalle | undefined> {
  if (fila.numeroRequisicion === null) return undefined;
  const paso = fila.paso as PasoDeLaCadena | null;
  const historia: EventoDeLaHistoria[] = eventos.map((e) => ({ ...e, en: e.en.toISOString() }));
  const vuelta = cadenaDesdeLaHistoria(historia, fila.estado === 'enviada' ? paso : null);
  const ocupantes = await ocupantesDeLaCadena(
    fila.obraId ? { obraId: fila.obraId } : { empresa: fila.empresaId === 'occ' ? 'occ' : 'geolab' },
  );
  // Los nombres de quienes ocupan cada paso y de quienes aprobaron o saltaron uno (la Gerencia
  // aprueba en cualquiera sin ocuparlo, y quien aprobó pudo dejar el cargo).
  const ids = [...new Set([...Object.values(ocupantes).flat(), ...vuelta.flatMap((p) => (p.por ? [p.por] : []))])];
  const nombres = new Map(
    ids.length
      ? (
          await baseServidor()
            .select({ id: usuarios.id, nombre: usuarios.nombreCompleto })
            .from(usuarios)
            .where(inArray(usuarios.id, ids))
        ).map((u) => [u.id, u.nombre])
      : [],
  );
  const persona = { id: sesion.id, rol: sesion.rol };
  const decide = puedeDecidir(persona, { estado: fila.estado, paso, pedidaPor: fila.pedidaPor }, ocupantes);
  return {
    codigo: numeroQueSeVe(fila),
    estadoQueSeVe: estadoQueSeVe({ tipo: fila.tipo, estado: fila.estado, paso }),
    cadena: {
      paso,
      pasos: vuelta.map((p) => ({
        paso: p.paso,
        nombre: NOMBRE_DEL_PASO[p.paso],
        quienes: ocupantes[p.paso].map((id) => nombres.get(id) ?? ''),
        como: p.como,
        ...(p.por ? { por: nombres.get(p.por) ?? '' } : {}),
        ...(p.en ? { en: p.en } : {}),
        ...(p.motivo ? { motivo: p.motivo } : {}),
      })),
      puedeDecidir: decide,
      puedeRecortar: decide && paso !== null && puedeRecortar(persona, paso),
    },
  };
}
