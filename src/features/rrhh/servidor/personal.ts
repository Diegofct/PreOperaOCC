/**
 * El personal de Recursos Humanos (spec 035). **Solo servidor.**
 *
 * ── Dónde ──
 *
 * Como en Documentos (spec 034), cada pedido trae su lugar —`?empresa=` o `?obraId=`— y
 * quién entra lo dicen las reglas del menú: `alcanzaLaEmpresa` y `alcanzaLaObraDeLaRuta`
 * (RF-2 a RF-5, RF-32). Pedir otro lugar es un 403 que lo dice, no una lista vacía.
 *
 *  · Elemental: todo el personal del grupo;
 *  · OCC y Geolab: las personas de esa empresa (`empresaDeLaPersona`, que decide igual en
 *    todos lados para las que no la tienen elegida);
 *  · una obra: las personas de esa obra.
 *
 * ── El salario ──
 *
 * La ficha se lee solo en `rrhh/servidor`, y el salario sale únicamente para quien lo ve
 * (`veElSalario`, RF-13). Para los demás el campo no se manda: ni en `null`, para que la
 * respuesta no diga siquiera quién tiene salario registrado.
 */
import { and, asc, eq, inArray, isNull, ne } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { documentosDelGrupo, fichasLaborales, obras, usuarios } from '@/db/servidor/esquema';
import type { PersonaDelPersonal, PersonalDelLugar } from '@/features/panel/contratos';
import type { PersonaEnSesion } from '@/features/servidor/guardia';
import { errorDePeticion, noEncontrado } from '@/features/servidor/respuestas';
import { alcanzaLaEmpresa, alcanzaLaObraDeLaRuta, empresaDeLaPersona, esEmpresa } from '@/shared/rules/empresas';
import { avisosDeLaPersona, resumenDelPersonal, veElSalario, type PersonaParaAvisos } from '@/shared/rules/ficha';
import { fechaDeJornada } from '@/shared/rules/jornada';
import { USUARIO_IA_WHATSAPP } from '@/shared/rules/whatsapp-automatico';

/** El lugar de un pedido, ya comprobado. */
export type LugarDelPersonal =
  | { tipo: 'empresa'; empresaId: 'elemental' | 'occ' | 'geolab' }
  | { tipo: 'obra'; obraId: string };

const SIN_PERMISO = 'No tiene acceso al personal de ese lugar.';

/**
 * El lugar que se pidió, si quien pide entra a él (RF-2 a RF-5, RF-32). Una empresa o una
 * obra, nunca las dos ni ninguna; Proyectos no tiene personal propio: es el de sus obras.
 */
export async function lugarDelPedido(
  sesion: PersonaEnSesion,
  pedido: { empresa: string | null; obraId: string | null },
): Promise<LugarDelPersonal | Response> {
  const { empresa, obraId } = pedido;
  if (Boolean(empresa) === Boolean(obraId)) return errorDePeticion('Diga de qué empresa u obra es el personal.');

  if (empresa) {
    if (!esEmpresa(empresa) || empresa === 'proyectos') return noEncontrado('esa empresa');
    if (!alcanzaLaEmpresa(sesion.rol, empresa)) return errorDePeticion(SIN_PERMISO, 403);
    return { tipo: 'empresa', empresaId: empresa };
  }

  const id = obraId as string;
  if (!alcanzaLaObraDeLaRuta(sesion, id)) return errorDePeticion(SIN_PERMISO, 403);
  const [obra] = await baseServidor().select({ id: obras.id }).from(obras).where(eq(obras.id, id)).limit(1);
  if (!obra) return noEncontrado('esa obra');
  return { tipo: 'obra', obraId: id };
}

/**
 * El personal del lugar, por nombre, con sus avisos de hoy y el resumen de arriba (RF-27,
 * RF-28, RF-31). Filtrar y buscar lo hace la pantalla (RF-29, RF-30): son pocas personas y
 * así responde mientras se escribe. Las desactivadas y retiradas salen —la pantalla las
 * filtra por estado— pero no avisan ni cuentan.
 */
export async function personalDelLugar(sesion: PersonaEnSesion, lugar: LugarDelPersonal): Promise<PersonalDelLugar> {
  const db = baseServidor();
  const filas = await db
    .select({
      id: usuarios.id,
      usuario: usuarios.usuario,
      nombreCompleto: usuarios.nombreCompleto,
      documento: usuarios.documento,
      rol: usuarios.rol,
      cargo: usuarios.cargo,
      obraId: usuarios.obraId,
      obraNombre: obras.nombre,
      empresa: usuarios.empresa,
      activo: usuarios.activo,
      // `usuarioId` solo para saber si hay ficha: con un `left join`, sin ficha llega nulo.
      fichaDe: fichasLaborales.usuarioId,
      estado: fichasLaborales.estado,
      tipoContrato: fichasLaborales.tipoContrato,
      fechaIngreso: fichasLaborales.fechaIngreso,
      finContrato: fichasLaborales.finContrato,
      eps: fichasLaborales.eps,
      arl: fichasLaborales.arl,
      salario: fichasLaborales.salario,
    })
    .from(usuarios)
    .leftJoin(obras, eq(obras.id, usuarios.obraId))
    .leftJoin(fichasLaborales, eq(fichasLaborales.usuarioId, usuarios.id))
    .where(
      and(
        isNull(usuarios.eliminadoEn),
        // El usuario de sistema «IA WhatsApp» no es una persona del grupo (spec 024).
        ne(usuarios.id, USUARIO_IA_WHATSAPP.id),
        lugar.tipo === 'obra' ? eq(usuarios.obraId, lugar.obraId) : undefined,
      ),
    )
    .orderBy(asc(usuarios.nombreCompleto));
  // Por nombre en español: la base ordena por código, y «Ángela» quedaba después de «Zoila».
  filas.sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto, 'es', { sensitivity: 'base' }));

  // La empresa se resuelve con la regla y no en SQL, como en Personas (spec 033, RF-46).
  const delLugar = filas
    .map((f) => ({ ...f, empresa: empresaDeLaPersona(f.empresa, f.rol) }))
    .filter((f) => lugar.tipo === 'obra' || lugar.empresaId === 'elemental' || f.empresa === lugar.empresaId);

  const ids = delLugar.map((f) => f.id);
  const documentos = ids.length
    ? await db
        .select({
          personaId: documentosDelGrupo.personaId,
          nombre: documentosDelGrupo.nombre,
          vence: documentosDelGrupo.vence,
          anuladoEn: documentosDelGrupo.anuladoEn,
        })
        .from(documentosDelGrupo)
        .where(inArray(documentosDelGrupo.personaId, ids))
    : [];
  const documentosDe = new Map<string, PersonaParaAvisos['documentos'][number][]>();
  for (const d of documentos) {
    if (!d.personaId) continue;
    const lista = documentosDe.get(d.personaId) ?? [];
    lista.push({ nombre: d.nombre, vence: d.vence, anulado: d.anuladoEn !== null });
    documentosDe.set(d.personaId, lista);
  }

  const hoy = fechaDeJornada();
  const conSalario = veElSalario(sesion.rol);
  const paraAvisos: PersonaParaAvisos[] = [];
  const personas = delLugar.map((f): PersonaDelPersonal => {
    const tieneFicha = f.fichaDe !== null;
    const paraAviso: PersonaParaAvisos = {
      activo: f.activo,
      ficha: tieneFicha
        ? {
            estado: f.estado ?? 'activo',
            fechaIngreso: f.fechaIngreso,
            tipoContrato: f.tipoContrato,
            eps: f.eps,
            arl: f.arl,
            finContrato: f.finContrato,
          }
        : null,
      documentos: documentosDe.get(f.id) ?? [],
    };
    paraAvisos.push(paraAviso);
    const persona: PersonaDelPersonal = {
      id: f.id,
      usuario: f.usuario,
      nombreCompleto: f.nombreCompleto,
      documento: f.documento,
      rol: f.rol,
      cargo: f.cargo,
      obraId: f.obraId,
      obraNombre: f.obraNombre,
      empresa: f.empresa,
      activo: f.activo,
      estado: f.estado ?? 'activo',
      tieneFicha,
      tipoContrato: f.tipoContrato,
      fechaIngreso: f.fechaIngreso,
      finContrato: f.finContrato,
      avisos: avisosDeLaPersona(paraAviso, hoy),
    };
    if (conSalario) persona.salario = f.salario;
    return persona;
  });

  return { personas, resumen: resumenDelPersonal(paraAvisos, hoy) };
}
