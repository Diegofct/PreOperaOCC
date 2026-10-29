/**
 * La ficha laboral de una persona (spec 035, RF-12 a RF-17). **Solo servidor.**
 *
 * ── Quién llega ──
 *
 * Una ficha se alcanza con las mismas reglas que el listado de su lugar
 * (`alcanzaLaPersona`, RF-32): la gerencia y la auxiliar, todas; el Encargado de OCC, las
 * de OCC; el laboratorista, las de Geolab; el residente, las de su obra. Lo que no se
 * alcanza es «no existe» (RF-33), como el resto del panel: confirmar que el id es real ya
 * diría algo de una persona que no le toca.
 *
 * ── El salario ──
 *
 * Sale solo para quien lo ve (`veElSalario`, RF-13) y solo él lo cambia: lo que mande otro
 * en ese campo se ignora y queda el que estaba. El historial no lo esconde porque no lo
 * tiene: guarda los nombres de los campos, no sus valores (RF-15).
 *
 * ── Dos personas a la vez ──
 *
 * Como el contrato (spec 031): cada guardado sube `version` con `where version = ?`, en la
 * misma sentencia que escribe; quien guarda con una versión vieja recibe 409 en vez de
 * pisar el cambio del otro. El evento se escribe después y solo si el cambio entró.
 *
 * ── Retirar ──
 *
 * Con sus documentos de retiro sin anular (RF-19) y su fecha y motivo (RF-20). Queda
 * retirada en la ficha, con la cuenta inactiva —que ya cierra el ingreso al panel y al
 * celular— y sus sesiones abiertas revocadas. Las tres cosas van en una sola escritura
 * (`batch`, que en Neon es una transacción), y la cuenta y las sesiones solo cambian si
 * la ficha quedó retirada: con una versión vieja no se toca nada. Su historia no se toca
 * (RF-20) y no se borra (RF-22).
 */
import { and, desc, eq, isNull, ne, sql } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

import { baseServidor } from '@/db/servidor/cliente';
import { documentosDelGrupo, fichaEventos, fichasLaborales, obras, sesionesWeb, usuarios } from '@/db/servidor/esquema';
import type { EventoDeLaFicha, FichaDeLaPersona, FichaPedida } from '@/features/panel/contratos';
import type { PersonaEnSesion } from '@/features/servidor/guardia';
import { errorDePeticion, noEncontrado } from '@/features/servidor/respuestas';
import { empresaDeLaPersona } from '@/shared/rules/empresas';
import {
  alcanzaLaPersona,
  camposCambiados,
  ESTADOS_LABORALES,
  faltasDeLaFicha,
  faltasDelRetiro,
  faltasParaRetirar,
  veElSalario,
  type DatosDeLaFicha,
  type FichaGuardable,
} from '@/shared/rules/ficha';
import { USUARIO_IA_WHATSAPP } from '@/shared/rules/whatsapp-automatico';

const MENSAJE_DE_CHOQUE =
  'Otra persona cambió esta ficha mientras usted la editaba. Vuelva a cargarla para ver lo último.';

/** La persona, si existe y quien pregunta la alcanza (RF-32, RF-33); si no, `null`. */
export async function personaAlAlcance(
  sesion: PersonaEnSesion,
  id: string,
): Promise<FichaDeLaPersona['persona'] | null> {
  const [fila] = await baseServidor()
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
    })
    .from(usuarios)
    .leftJoin(obras, eq(obras.id, usuarios.obraId))
    .where(and(eq(usuarios.id, id), isNull(usuarios.eliminadoEn), ne(usuarios.id, USUARIO_IA_WHATSAPP.id)))
    .limit(1);
  if (!fila || !alcanzaLaPersona(sesion, fila)) return null;
  return { ...fila, empresa: empresaDeLaPersona(fila.empresa, fila.rol) };
}

async function filaDeLaFicha(usuarioId: string) {
  const [fila] = await baseServidor()
    .select()
    .from(fichasLaborales)
    .where(eq(fichasLaborales.usuarioId, usuarioId))
    .limit(1);
  return fila ?? null;
}

function datosDe(fila: NonNullable<Awaited<ReturnType<typeof filaDeLaFicha>>> | null): FichaGuardable {
  return {
    tipoDocumento: fila?.tipoDocumento ?? null,
    fechaNacimiento: fila?.fechaNacimiento ?? null,
    telefono: fila?.telefono ?? null,
    correo: fila?.correo ?? null,
    direccion: fila?.direccion ?? null,
    ciudad: fila?.ciudad ?? null,
    emergenciaNombre: fila?.emergenciaNombre ?? null,
    emergenciaParentesco: fila?.emergenciaParentesco ?? null,
    emergenciaTelefono: fila?.emergenciaTelefono ?? null,
    fechaIngreso: fila?.fechaIngreso ?? null,
    tipoContrato: fila?.tipoContrato ?? null,
    finContrato: fila?.finContrato ?? null,
    salario: fila?.salario ?? null,
    eps: fila?.eps ?? null,
    arl: fila?.arl ?? null,
    pension: fila?.pension ?? null,
    caja: fila?.caja ?? null,
    notas: fila?.notas ?? null,
    estado: fila?.estado ?? 'activo',
  };
}

/** La ficha de una persona (RF-12, RF-13), o `null` si no existe o no le toca (RF-33). */
export async function fichaDe(sesion: PersonaEnSesion, id: string): Promise<FichaDeLaPersona | null> {
  const persona = await personaAlAlcance(sesion, id);
  if (!persona) return null;
  const fila = await filaDeLaFicha(id);

  const { salario, ...datos } = datosDe(fila);
  let actualizadoPor: string | null = null;
  if (fila?.actualizadoPor) {
    const [quien] = await baseServidor()
      .select({ nombre: usuarios.nombreCompleto })
      .from(usuarios)
      .where(eq(usuarios.id, fila.actualizadoPor))
      .limit(1);
    actualizadoPor = quien?.nombre ?? null;
  }
  const ficha: FichaDeLaPersona['ficha'] = {
    ...datos,
    retiroFecha: fila?.retiroFecha ?? null,
    retiroMotivo: fila?.retiroMotivo ?? null,
    version: fila?.version ?? 0,
    actualizadoPor,
    actualizadoEn: fila ? fila.actualizadoEn.toISOString() : null,
  };
  // El campo ni siquiera existe para quien no lo ve (RF-13).
  if (veElSalario(sesion.rol)) ficha.salario = salario;
  return { persona, ficha };
}

/**
 * Guarda la ficha (RF-12 a RF-17). La primera vez la crea con la versión 1. El retiro no
 * se hace aquí: tiene sus documentos (RF-19) y su ruta; una ficha retirada sigue
 * corrigiéndose, pero no sale de retirada por esta vía.
 */
export async function guardarFicha(
  sesion: PersonaEnSesion,
  id: string,
  pedido: FichaPedida,
): Promise<{ version: number } | Response> {
  const persona = await personaAlAlcance(sesion, id);
  if (!persona) return noEncontrado('esa persona');

  const actual = await filaDeLaFicha(id);
  const estado = pedido.estado;
  if (!ESTADOS_LABORALES.some((e) => e.id === estado)) return errorDePeticion('Ese estado laboral no existe.', 422);
  if (actual?.estado === 'retirado' && estado !== 'retirado') {
    return errorDePeticion('La persona está retirada: su estado no se cambia desde la ficha.', 422);
  }
  if (actual?.estado !== 'retirado' && estado === 'retirado') {
    return errorDePeticion('Para retirar a una persona use «Retirar»: pide sus documentos de retiro.', 422);
  }

  const datos: DatosDeLaFicha = {
    tipoDocumento: pedido.tipoDocumento,
    fechaNacimiento: pedido.fechaNacimiento,
    telefono: pedido.telefono,
    correo: pedido.correo,
    direccion: pedido.direccion,
    ciudad: pedido.ciudad,
    emergenciaNombre: pedido.emergenciaNombre,
    emergenciaParentesco: pedido.emergenciaParentesco,
    emergenciaTelefono: pedido.emergenciaTelefono,
    fechaIngreso: pedido.fechaIngreso,
    tipoContrato: pedido.tipoContrato,
    finContrato: pedido.finContrato,
    // Quien no ve el salario no lo cambia: queda el que estaba (RF-13).
    salario: veElSalario(sesion.rol) ? pedido.salario : (actual?.salario ?? null),
    eps: pedido.eps,
    arl: pedido.arl,
    pension: pedido.pension,
    caja: pedido.caja,
    notas: pedido.notas,
  };
  const faltas = faltasDeLaFicha(datos);
  if (faltas.length) return Response.json({ error: faltas[0], faltas }, { status: 422 });

  const campos = camposCambiados(actual ? datosDe(actual) : null, { ...datos, estado });
  const cambios = { ...datos, estado, actualizadoPor: sesion.id };
  const db = baseServidor();

  let version: number;
  if (pedido.version === 0) {
    const [creada] = await db
      .insert(fichasLaborales)
      .values({ usuarioId: id, ...cambios, version: 1 })
      .onConflictDoNothing({ target: fichasLaborales.usuarioId })
      .returning({ version: fichasLaborales.version });
    if (!creada) return errorDePeticion(MENSAJE_DE_CHOQUE, 409);
    version = creada.version;
  } else {
    const [guardada] = await db
      .update(fichasLaborales)
      .set({ ...cambios, version: pedido.version + 1 })
      .where(and(eq(fichasLaborales.usuarioId, id), eq(fichasLaborales.version, pedido.version)))
      .returning({ version: fichasLaborales.version });
    if (!guardada) return errorDePeticion(MENSAJE_DE_CHOQUE, 409);
    version = guardada.version;
  }

  // Guardar sin cambiar nada no deja rastro: el historial es de cambios.
  if (campos.length) {
    await db.insert(fichaEventos).values({ id: uuidv7(), usuarioId: id, accion: 'guardado', campos, por: sesion.id });
  }
  return { version };
}

/**
 * Retira a una persona (RF-19, RF-20). 422 con lo que falta —datos o documentos—; 409 si
 * ya estaba retirada o la ficha cambió mientras tanto.
 */
export async function retirar(
  sesion: PersonaEnSesion,
  id: string,
  pedido: { version: number; fecha: string; motivo: string },
): Promise<{ version: number } | Response> {
  const persona = await personaAlAlcance(sesion, id);
  if (!persona) return noEncontrado('esa persona');
  // Retirarse a uno mismo es quedarse fuera a media tarea, y podría dejar a la gerencia
  // sin nadie: lo hace otra persona.
  if (id === sesion.id) return errorDePeticion('No puede retirarse a usted mismo.', 400);

  const actual = await filaDeLaFicha(id);
  if (actual?.estado === 'retirado') return errorDePeticion('Esa persona ya está retirada.', 409);

  const faltasDeDatos = faltasDelRetiro(pedido, actual?.fechaIngreso ?? null);
  if (faltasDeDatos.length) return Response.json({ error: faltasDeDatos[0], faltas: faltasDeDatos }, { status: 422 });

  const vigentes = await baseServidor()
    .select({ clase: documentosDelGrupo.clase })
    .from(documentosDelGrupo)
    .where(and(eq(documentosDelGrupo.personaId, id), isNull(documentosDelGrupo.anuladoEn)));
  const faltan = faltasParaRetirar(actual?.tipoContrato ?? null, vigentes.map((d) => d.clase));
  if (faltan.length) {
    return Response.json({ error: `Para retirarla falta: ${faltan.join('; ')}.`, faltas: faltan }, { status: 422 });
  }

  const retiro = {
    estado: 'retirado',
    retiroFecha: pedido.fecha,
    retiroMotivo: pedido.motivo.trim(),
    actualizadoPor: sesion.id,
  };
  const db = baseServidor();
  const ficha =
    pedido.version === 0
      ? db
          .insert(fichasLaborales)
          .values({ usuarioId: id, ...retiro, version: 1 })
          .onConflictDoNothing({ target: fichasLaborales.usuarioId })
          .returning({ version: fichasLaborales.version })
      : db
          .update(fichasLaborales)
          .set({ ...retiro, version: pedido.version + 1 })
          .where(
            and(
              eq(fichasLaborales.usuarioId, id),
              eq(fichasLaborales.version, pedido.version),
              ne(fichasLaborales.estado, 'retirado'),
            ),
          )
          .returning({ version: fichasLaborales.version });
  // Dentro del mismo `batch`, las dos siguientes ven la ficha ya escrita: si no quedó
  // retirada, no cambian nada.
  const quedoRetirada = sql`exists (
    select 1 from ${fichasLaborales}
    where ${fichasLaborales.usuarioId} = ${id} and ${fichasLaborales.estado} = 'retirado'
  )`;
  const ahora = new Date();
  const [escrita] = await db.batch([
    ficha,
    db.update(usuarios).set({ activo: false }).where(and(eq(usuarios.id, id), quedoRetirada)),
    db
      .update(sesionesWeb)
      .set({ revocadoEn: ahora })
      .where(and(eq(sesionesWeb.usuarioId, id), isNull(sesionesWeb.revocadoEn), quedoRetirada)),
  ]);
  const [nueva] = escrita;
  if (!nueva) return errorDePeticion(MENSAJE_DE_CHOQUE, 409);

  await db.insert(fichaEventos).values({ id: uuidv7(), usuarioId: id, accion: 'retirado', campos: ['estado'], por: sesion.id });
  return { version: nueva.version };
}

/** El historial de la ficha (RF-15), del más reciente al más antiguo. */
export async function historialDeLaFicha(usuarioId: string): Promise<EventoDeLaFicha[]> {
  const filas = await baseServidor()
    .select({
      id: fichaEventos.id,
      accion: fichaEventos.accion,
      campos: fichaEventos.campos,
      por: usuarios.nombreCompleto,
      en: fichaEventos.en,
    })
    .from(fichaEventos)
    .innerJoin(usuarios, eq(usuarios.id, fichaEventos.por))
    .where(eq(fichaEventos.usuarioId, usuarioId))
    .orderBy(desc(fichaEventos.en), desc(fichaEventos.id));
  return filas.map((f) => ({ ...f, accion: f.accion as EventoDeLaFicha['accion'], en: f.en.toISOString() }));
}
