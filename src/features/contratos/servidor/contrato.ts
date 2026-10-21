/**
 * El contrato de una obra en el servidor (spec 031, RF-6 a RF-22). **Solo servidor.**
 *
 * Lo que se puede guardar y lo que falta para aprobar lo deciden las reglas puras de
 * `shared/rules/contrato.ts`, las mismas que usa la pantalla: aquí se vuelven a correr
 * sobre lo que llegó, y si difieren, gana el servidor (constitución, principio 3).
 *
 * ── Dos personas a la vez ──
 *
 * Cada guardado sube `version` con `where version = ?`. Quien guarda con la versión
 * que leyó y otra persona ya cambió recibe un 409 en vez de pisarla (caso límite de la
 * spec). Neon por HTTP no da transacciones interactivas: la condición va en la misma
 * sentencia que escribe, que es atómica.
 *
 * El evento (quién y cuándo, RF-6) se escribe después y solo si el cambio entró.
 */
import { and, desc, eq } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

import { baseServidor } from '@/db/servidor/cliente';
import { contratoEventos, contratos, obras, presupuestos, usuarios } from '@/db/servidor/esquema';
import type { ContratoDeObra, ContratoEditado } from '@/features/panel/contratos';
import { alcanzaLaObra, veTodasLasObras } from '@/features/servidor/alcance';
import type { PersonaEnSesion } from '@/features/servidor/guardia';
import { errorDePeticion, noEncontrado } from '@/features/servidor/respuestas';
import { documentosDelContrato, polizasDelContrato } from './polizas-y-documentos';
import {
  diferenciaConPresupuesto,
  faltasParaAprobarContrato,
  faltasParaGuardarContrato,
  plazoEnDias,
  type ContratoParaRevisar,
} from '@/shared/rules/contrato';

const MENSAJE_DE_CHOQUE =
  'Otra persona cambió el contrato mientras usted lo editaba. Vuelva a cargarlo para ver lo último.';

/**
 * La obra de la que se habla (RF-4): la gerencia, la que pide; el residente, la suya.
 * Un residente que pide otra recibe un 404, como en el resto del panel: confirmar que
 * existe ya le diría algo de una obra que no le toca.
 */
export async function obraDelContrato(sesion: PersonaEnSesion, pedida: string | null): Promise<string | Response> {
  // Vacío es «no la pidió»: el residente queda en la suya.
  const pedidaDeVerdad = pedida?.trim() || null;
  const obraId = veTodasLasObras(sesion) ? pedidaDeVerdad : (pedidaDeVerdad ?? sesion.obraId);
  if (!obraId) {
    return errorDePeticion(veTodasLasObras(sesion) ? 'Elija la obra.' : 'Su usuario no tiene obra asignada.');
  }
  if (!alcanzaLaObra(sesion, obraId)) return noEncontrado('esa obra');
  const [obra] = await baseServidor().select({ id: obras.id }).from(obras).where(eq(obras.id, obraId)).limit(1);
  return obra ? obra.id : noEncontrado('esa obra');
}

type FilaDeContrato = typeof contratos.$inferSelect;

function paraRevisar(c: Pick<FilaDeContrato, keyof ContratoParaRevisar>): ContratoParaRevisar {
  return {
    contratanteNombre: c.contratanteNombre,
    esConsorcio: c.esConsorcio,
    nombreConsorcio: c.nombreConsorcio,
    integrantes: c.integrantes,
    tipo: c.tipo,
    numero: c.numero,
    fechaInicio: c.fechaInicio,
    fechaFin: c.fechaFin,
    valor: c.valor,
    anticipoPorcentaje: c.anticipoPorcentaje,
    retencionPorcentaje: c.retencionPorcentaje,
    impuestos: c.impuestos,
  };
}

/** El valor del presupuesto vigente de la obra, o `null` (RF-15). */
async function valorDelPresupuestoVigente(obraId: string): Promise<number | null> {
  const [vigente] = await baseServidor()
    .select({ valor: presupuestos.valor })
    .from(presupuestos)
    .where(and(eq(presupuestos.obraId, obraId), eq(presupuestos.estado, 'vigente')))
    .limit(1);
  return vigente?.valor ?? null;
}

async function filaDelContrato(obraId: string): Promise<FilaDeContrato | undefined> {
  const [fila] = await baseServidor().select().from(contratos).where(eq(contratos.obraId, obraId)).limit(1);
  return fila;
}

/** El contrato de la obra con lo que se calcula de él (RF-12 a RF-17). */
export async function leerContrato(obraId: string): Promise<ContratoDeObra> {
  const [fila, valorDelPresupuesto] = await Promise.all([filaDelContrato(obraId), valorDelPresupuestoVigente(obraId)]);
  if (!fila) {
    return {
      obraId,
      contrato: null,
      valorDelPresupuesto,
      diferencia: null,
      faltasParaAprobar: [],
      eventos: [],
      polizas: [],
      documentos: [],
    };
  }
  const [polizas, documentos] = await Promise.all([polizasDelContrato(fila.id), documentosDelContrato(fila.id)]);
  const eventos = await baseServidor()
    .select({
      accion: contratoEventos.accion,
      motivo: contratoEventos.motivo,
      quien: usuarios.nombreCompleto,
      en: contratoEventos.en,
    })
    .from(contratoEventos)
    .innerJoin(usuarios, eq(usuarios.id, contratoEventos.usuarioId))
    .where(eq(contratoEventos.contratoId, fila.id))
    .orderBy(desc(contratoEventos.en))
    .limit(50);

  return {
    obraId,
    contrato: {
      id: fila.id,
      version: fila.version,
      estado: fila.estado,
      contratanteNombre: fila.contratanteNombre,
      contratanteNit: fila.contratanteNit,
      contratanteDireccion: fila.contratanteDireccion,
      contratanteCiudad: fila.contratanteCiudad,
      contratanteCorreo: fila.contratanteCorreo,
      contratanteTelefono: fila.contratanteTelefono,
      representanteNombre: fila.representanteNombre,
      representanteIdentificacion: fila.representanteIdentificacion,
      esConsorcio: fila.esConsorcio,
      nombreConsorcio: fila.nombreConsorcio,
      integrantes: fila.integrantes,
      tipo: fila.tipo as ContratoEditado['tipo'],
      numero: fila.numero,
      objeto: fila.objeto,
      fechaInicio: fila.fechaInicio,
      fechaFin: fila.fechaFin,
      plazoDias: fila.plazoDias,
      valor: fila.valor,
      anticipoPorcentaje: fila.anticipoPorcentaje,
      retencionPorcentaje: fila.retencionPorcentaje,
      impuestos: fila.impuestos,
      aprobadoEn: fila.aprobadoEn?.toISOString() ?? null,
      aprobadoPor: fila.aprobadoPor,
    },
    valorDelPresupuesto,
    diferencia: diferenciaConPresupuesto(fila.valor, valorDelPresupuesto),
    faltasParaAprobar: fila.estado === 'aprobado' ? [] : faltasParaAprobarContrato(paraRevisar(fila)),
    eventos: eventos.map((e) => ({ ...e, en: e.en.toISOString() })),
    polizas,
    documentos,
  };
}

async function anotar(
  contratoId: string,
  accion: 'guardado' | 'aprobado' | 'a_borrador',
  sesion: PersonaEnSesion,
  motivo: string | null = null,
) {
  await baseServidor().insert(contratoEventos).values({ id: uuidv7(), contratoId, accion, motivo, usuarioId: sesion.id });
}

/** Las faltas como respuesta: el primer mensaje y la lista entera, para pintarla. */
function conFaltas(mensaje: string, faltas: string[], estado = 400): Response {
  return Response.json({ error: `${mensaje} ${faltas[0]}`, faltas }, { status: estado });
}

/**
 * Guarda el contrato (RF-7 a RF-16, RF-22). La primera vez lo crea con la versión 1.
 * Aprobado no se edita (RF-18): primero hay que volverlo a borrador.
 */
export async function guardarContrato(
  sesion: PersonaEnSesion,
  obraId: string,
  pedido: Omit<ContratoEditado, 'obraId'> & { version: number },
): Promise<{ version: number } | Response> {
  const datos = {
    contratanteNombre: pedido.contratanteNombre ?? '',
    contratanteNit: pedido.contratanteNit ?? '',
    contratanteDireccion: pedido.contratanteDireccion ?? '',
    contratanteCiudad: pedido.contratanteCiudad ?? '',
    contratanteCorreo: pedido.contratanteCorreo ?? '',
    contratanteTelefono: pedido.contratanteTelefono ?? '',
    representanteNombre: pedido.representanteNombre ?? '',
    representanteIdentificacion: pedido.representanteIdentificacion ?? '',
    esConsorcio: pedido.esConsorcio ?? false,
    nombreConsorcio: pedido.nombreConsorcio ?? '',
    integrantes: (pedido.integrantes ?? []).map((i) => ({
      nombre: i.nombre ?? '',
      nit: i.nit ?? '',
      porcentaje: i.porcentaje ?? null,
    })),
    tipo: pedido.tipo ?? null,
    numero: pedido.numero ?? '',
    objeto: pedido.objeto ?? '',
    fechaInicio: pedido.fechaInicio ?? null,
    fechaFin: pedido.fechaFin ?? null,
    valor: pedido.valor ?? null,
    anticipoPorcentaje: pedido.anticipoPorcentaje ?? null,
    retencionPorcentaje: pedido.retencionPorcentaje ?? null,
    impuestos: (pedido.impuestos ?? []).map((i) => ({ ...i, nombre: i.nombre ?? '', porcentaje: i.porcentaje ?? null })),
  };
  const faltas = faltasParaGuardarContrato(datos);
  if (faltas.length > 0) return conFaltas('No se puede guardar:', faltas);

  // El plazo lo calcula el servidor con la misma regla que la pantalla (RF-13).
  const cambios = { ...datos, plazoDias: plazoEnDias(datos.fechaInicio, datos.fechaFin), actualizadoPor: sesion.id };
  const db = baseServidor();

  if (pedido.version === 0) {
    const id = uuidv7();
    const creado = await db
      .insert(contratos)
      .values({ id, obraId, ...cambios, version: 1 })
      .onConflictDoNothing({ target: contratos.obraId })
      .returning({ id: contratos.id, version: contratos.version });
    if (creado.length === 0) return errorDePeticion(MENSAJE_DE_CHOQUE, 409);
    await anotar(id, 'guardado', sesion);
    return { version: creado[0].version };
  }

  const [guardado] = await db
    .update(contratos)
    .set({ ...cambios, version: pedido.version + 1 })
    .where(and(eq(contratos.obraId, obraId), eq(contratos.version, pedido.version), eq(contratos.estado, 'borrador')))
    .returning({ id: contratos.id, version: contratos.version });
  if (!guardado) return rechazo(obraId);
  await anotar(guardado.id, 'guardado', sesion);
  return { version: guardado.version };
}

/** Por qué no entró un cambio: no hay contrato, está aprobado, o cambió la versión. */
async function rechazo(obraId: string): Promise<Response> {
  const fila = await filaDelContrato(obraId);
  if (!fila) return noEncontrado('el contrato de esta obra');
  if (fila.estado === 'aprobado') {
    return errorDePeticion('El contrato está aprobado: vuélvalo a borrador para editarlo.', 409);
  }
  return errorDePeticion(MENSAJE_DE_CHOQUE, 409);
}

/** Aprobar (RF-17): solo la gerencia, lo exige la ruta (RF-3); con todo lo que falta, 400. */
export async function aprobarContrato(
  sesion: PersonaEnSesion,
  obraId: string,
  version: number,
): Promise<{ version: number } | Response> {
  const fila = await filaDelContrato(obraId);
  if (!fila) return noEncontrado('el contrato de esta obra');
  if (fila.estado === 'aprobado') return errorDePeticion('El contrato ya está aprobado.', 409);
  if (fila.version !== version) return errorDePeticion(MENSAJE_DE_CHOQUE, 409);
  const faltas = faltasParaAprobarContrato(paraRevisar(fila));
  if (faltas.length > 0) return conFaltas('No se puede aprobar todavía.', faltas);

  const [aprobado] = await baseServidor()
    .update(contratos)
    .set({ estado: 'aprobado', aprobadoEn: new Date(), aprobadoPor: sesion.id, version: version + 1 })
    .where(and(eq(contratos.id, fila.id), eq(contratos.version, version), eq(contratos.estado, 'borrador')))
    .returning({ version: contratos.version });
  if (!aprobado) return rechazo(obraId);
  await anotar(fila.id, 'aprobado', sesion);
  return { version: aprobado.version };
}

/** Volver a borrador un contrato aprobado, con motivo (RF-19). Solo la gerencia. */
export async function contratoABorrador(
  sesion: PersonaEnSesion,
  obraId: string,
  version: number,
  motivo: string,
): Promise<{ version: number } | Response> {
  const fila = await filaDelContrato(obraId);
  if (!fila) return noEncontrado('el contrato de esta obra');
  if (fila.estado === 'borrador') return errorDePeticion('El contrato ya está en borrador.', 409);

  const [devuelto] = await baseServidor()
    .update(contratos)
    .set({ estado: 'borrador', aprobadoEn: null, aprobadoPor: null, version: version + 1 })
    .where(and(eq(contratos.id, fila.id), eq(contratos.version, version), eq(contratos.estado, 'aprobado')))
    .returning({ version: contratos.version });
  if (!devuelto) return errorDePeticion(MENSAJE_DE_CHOQUE, 409);
  await anotar(fila.id, 'a_borrador', sesion, motivo);
  return { version: devuelto.version };
}
