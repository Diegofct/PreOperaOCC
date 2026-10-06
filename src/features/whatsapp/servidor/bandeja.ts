/**
 * Lo que lee la bandeja de reportes de WhatsApp (spec 021, RF-14 a RF-25, RF-60 a
 * RF-62, RF-89).
 *
 * ── Lista y detalle ──
 *
 * La lista es una sola consulta y no resuelve nada: muestra lo que dijo la IA
 * (categoría, resumen, motivo) para que el residente decida qué abrir. El detalle
 * sí resuelve la propuesta contra los catálogos de la obra con
 * `resolverPropuesta`, porque es donde se corrige y se aprueba.
 *
 * ── Qué entra en la bandeja ──
 *
 * Los mensajes cuya obra está al alcance de quien pregunta, con la obra dicha en
 * un solo sitio (`obra.ts`) y filtrada con `filtroDeObraEstricto`: sin obra no los
 * ve nadie (RF-11). Un mensaje que complementa a otro que existe —la foto que
 * acompaña un reporte— no sale aparte: va dentro del reporte (RF-20).
 *
 * Solo servidor.
 */
import { and, asc, eq, inArray, isNull, or, sql } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import {
  media,
  obras,
  partesDeObra,
  tiposVehiculo,
  usuarios,
  vehiculos,
  whatsappGrupos,
  whatsappMensajes,
} from '@/db/servidor/esquema';
import { opcionesDeLaObra } from '@/features/cantera/servidor/viajes';
import type {
  DetalleDePropuesta,
  OpcionesDeCantera,
  PropuestaFila,
} from '@/features/panel/contratos';
import { filtroDeObraEstricto, veTodasLasObras } from '@/features/servidor/alcance';
import type { PersonaEnSesion } from '@/features/servidor/guardia';
import { nombreDeCargo } from '@/shared/catalogos/cargos';
import { fechaDeJornada, medidorDeClase, type ClaseDeMedidor } from '@/shared/rules/jornada';
import {
  destinoDeCategoria,
  faltasDelReporte,
  reconocerPersona,
  resolverPropuesta,
  type CatalogosDeLaObra,
  type EstadoMensajeWhatsapp,
  type PropuestaLeible,
  type ReporteDelDia,
} from '@/shared/rules/whatsapp';

import { obraDelMensaje } from './obra';

/** Más de esto en un estado ya no es una bandeja: es un atraso que se pagina. */
const LIMITE_DE_LA_LISTA = 200;

const COLUMNAS_DE_LA_FILA = {
  id: whatsappMensajes.id,
  enviadoEn: whatsappMensajes.enviadoEn,
  autorNombre: whatsappMensajes.autorNombre,
  grupoNombre: whatsappGrupos.nombre,
  obraId: sql<string>`${obraDelMensaje}`,
  obraNombre: obras.nombre,
  categoria: whatsappMensajes.categoria,
  resumen: sql<string | null>`${whatsappMensajes.propuestaIa}->>'resumen'`,
  motivoRevision: sql<string | null>`${whatsappMensajes.propuestaIa}->>'motivo_revision'`,
  estado: whatsappMensajes.estado,
  // Los suyos y los de los mensajes que lo complementan (RF-20, RF-52).
  archivos: sql<number>`(
    select count(*)::int from ${media}
     where ${media.duenoTipo} = 'whatsapp'
       and (${media.duenoId} = ${whatsappMensajes.id}
            or ${media.duenoId} in (select c.id from whatsapp_mensajes c
                                     where c.complementa_a = ${whatsappMensajes.id})))`,
  complementos: sql<number>`(
    select count(*)::int from whatsapp_mensajes c where c.complementa_a = ${whatsappMensajes.id})`,
  viajesAprobados: sql<boolean>`${whatsappMensajes.viajesAprobadosEn} is not null`,
};

function aFila(fila: {
  id: string;
  enviadoEn: Date;
  autorNombre: string | null;
  grupoNombre: string;
  obraId: string;
  obraNombre: string;
  categoria: string | null;
  resumen: string | null;
  motivoRevision: string | null;
  estado: EstadoMensajeWhatsapp;
  archivos: number;
  complementos: number;
  viajesAprobados: boolean;
}): PropuestaFila {
  return { ...fila, enviadoEn: fila.enviadoEn.toISOString() };
}

/**
 * La lista de un estado, del más antiguo al más reciente (RF-16): lo que lleva más
 * tiempo esperando es lo primero que hay que resolver. La gerencia puede pedir una
 * obra; el residente ve la suya y nada más (RF-14).
 */
export async function leerBandeja(
  sesion: PersonaEnSesion,
  filtro: { estado: EstadoMensajeWhatsapp; obraId: string | null },
): Promise<PropuestaFila[]> {
  // El mensaje con su grupo y su obra: la obra sale de `obraDelMensaje`.
  const filas = await baseServidor()
    .select(COLUMNAS_DE_LA_FILA)
    .from(whatsappMensajes)
    .innerJoin(whatsappGrupos, eq(whatsappGrupos.id, whatsappMensajes.grupoId))
    .innerJoin(obras, sql`${obras.id} = ${obraDelMensaje}`)
    .where(
      and(
        filtroDeObraEstricto(sesion, obraDelMensaje),
        veTodasLasObras(sesion) && filtro.obraId ? sql`${obraDelMensaje} = ${filtro.obraId}` : undefined,
        eq(whatsappMensajes.estado, filtro.estado),
        // Lo que complementa a un mensaje que existe va dentro de él (RF-20).
        sql`not exists (select 1 from whatsapp_mensajes p where p.id = ${whatsappMensajes.complementaA})`,
      ),
    )
    .orderBy(asc(whatsappMensajes.enviadoEn))
    .limit(LIMITE_DE_LA_LISTA);

  return filas.map(aFila);
}

/** Los catálogos de la obra contra los que se lee una propuesta, y el medidor de cada equipo. */
async function catalogosDeLaObra(obraId: string): Promise<{
  catalogos: CatalogosDeLaObra;
  claseDe: Map<string, ClaseDeMedidor>;
  cargoDe: Map<string, string | null>;
  opciones: DetalleDePropuesta['opciones'];
}> {
  const db = baseServidor();
  const [equipos, personas, cantera] = await Promise.all([
    db
      .select({
        id: vehiculos.id,
        codigoInterno: vehiculos.codigoInterno,
        placa: vehiculos.placa,
        obraId: vehiculos.obraId,
        clase: tiposVehiculo.claseMedidor,
      })
      .from(vehiculos)
      .innerJoin(tiposVehiculo, eq(tiposVehiculo.id, vehiculos.tipoVehiculoId))
      .where(
        and(
          isNull(vehiculos.eliminadoEn),
          or(eq(vehiculos.obraId, obraId), isNull(vehiculos.obraId)),
        ),
      ),
    db
      .select({ id: usuarios.id, nombreCompleto: usuarios.nombreCompleto, cargo: usuarios.cargo })
      .from(usuarios)
      .where(isNull(usuarios.eliminadoEn)),
    opcionesDeLaObra(obraId),
  ]);

  return {
    catalogos: {
      obraId,
      vehiculos: equipos,
      personas,
      sitios: cantera.sitios,
      materiales: cantera.materiales,
    },
    claseDe: new Map(equipos.map((e) => [e.id, medidorDeClase(e.clase)])),
    cargoDe: new Map(personas.map((p) => [p.id, p.cargo])),
    opciones: {
      equipos: equipos
        .map(({ id, codigoInterno, placa }) => ({ id, codigoInterno, placa }))
        .sort((a, b) => a.codigoInterno.localeCompare(b.codigoInterno, 'es')),
      personas: personas
        .map(({ id, nombreCompleto, cargo }) => ({
          id,
          nombreCompleto,
          cargo: cargo ? nombreDeCargo(cargo) : null,
        }))
        .sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto, 'es')),
      cantera: cantera satisfies OpcionesDeCantera,
    },
  };
}

/**
 * El detalle de un mensaje, con su propuesta lista para revisar. `null` si no
 * existe o no está al alcance: «no existe» y no «no puede», como en el resto del
 * panel.
 */
export async function leerDetalle(
  sesion: PersonaEnSesion,
  id: string,
): Promise<DetalleDePropuesta | null> {
  const db = baseServidor();
  const [fila] = await db
    .select({
      ...COLUMNAS_DE_LA_FILA,
      texto: whatsappMensajes.texto,
      version: whatsappMensajes.version,
      propuestaIa: whatsappMensajes.propuestaIa,
      propuesta: whatsappMensajes.propuesta,
      canteraActiva: obras.canteraActivo,
    })
    .from(whatsappMensajes)
    .innerJoin(whatsappGrupos, eq(whatsappGrupos.id, whatsappMensajes.grupoId))
    .innerJoin(obras, sql`${obras.id} = ${obraDelMensaje}`)
    .where(and(eq(whatsappMensajes.id, id), filtroDeObraEstricto(sesion, obraDelMensaje)))
    .limit(1);
  if (!fila) return null;

  const { catalogos, claseDe, cargoDe, opciones } = await catalogosDeLaObra(fila.obraId);
  const destino = destinoDeCategoria(fila.categoria);
  const resuelto = fila.propuesta
    ? { reporte: fila.propuesta as unknown as ReporteDelDia, fechaSupuesta: false }
    : resolverPropuesta(fila.propuestaIa as PropuestaLeible, catalogos, {
        diaDelMensaje: fechaDeJornada(fila.enviadoEn.getTime()),
        destino,
      });
  const { reporte } = resuelto;

  const complementos = await db
    .select({
      id: whatsappMensajes.id,
      enviadoEn: whatsappMensajes.enviadoEn,
      texto: whatsappMensajes.texto,
    })
    .from(whatsappMensajes)
    .where(eq(whatsappMensajes.complementaA, id))
    .orderBy(asc(whatsappMensajes.enviadoEn));

  const archivos = await db
    .select({ id: media.id, mensajeId: media.duenoId, mime: media.mime })
    .from(media)
    .where(
      and(
        eq(media.duenoTipo, 'whatsapp'),
        inArray(media.duenoId, [id, ...complementos.map((c) => c.id)]),
      ),
    )
    .orderBy(asc(media.recibidoEn));

  // La bitácora vigente del día del hecho: si está cerrada no se aprueba lo que va a
  // ella (RF-41), y si está abierta se avisa qué se reemplazaría (RF-89).
  const [parte] = reporte.fecha
    ? await db
        .select({
          maquinaria: partesDeObra.maquinaria,
          personal: partesDeObra.personal,
          clima: partesDeObra.clima,
          cerradoEn: partesDeObra.cerradoEn,
        })
        .from(partesDeObra)
        .where(
          and(
            eq(partesDeObra.obraId, fila.obraId),
            eq(partesDeObra.fecha, reporte.fecha),
            isNull(partesDeObra.anuladoEn),
          ),
        )
        .limit(1)
    : [];

  // Lo que ya puso este mismo mensaje no se «reemplaza»: es él mismo.
  const ajena = (f: { origen?: { mensajeId: string } }) => f.origen?.mensajeId !== id;
  const vehiculosDelReporte = new Set(reporte.maquinaria.map((m) => m.vehiculoId).filter(Boolean));
  const personasDelReporte = new Set(reporte.personal.map((p) => p.usuarioId).filter(Boolean));
  const reemplaza =
    parte && !parte.cerradoEn
      ? {
          maquinas: parte.maquinaria
            .filter((m) => vehiculosDelReporte.has(m.vehiculoId) && ajena(m))
            .map((m) => m.codigo),
          personas: parte.personal
            .filter((p) => personasDelReporte.has(p.usuarioId) && ajena(p))
            .map((p) => p.nombre),
          clima: reporte.clima.length > 0 && parte.clima.some(ajena),
        }
      : { maquinas: [], personas: [], clima: false };

  const autorId = reconocerPersona(fila.autorNombre, catalogos.personas);
  const autor = catalogos.personas.find((p) => p.id === autorId);
  const cargoDelAutor = autor ? cargoDe.get(autor.id) : null;

  return {
    ...aFila(fila),
    texto: fila.texto,
    version: fila.version,
    autor: {
      usuarioId: autor?.id ?? null,
      nombre: autor?.nombreCompleto ?? fila.autorNombre ?? 'Sin nombre',
      cargo: cargoDelAutor ? nombreDeCargo(cargoDelAutor) : null,
    },
    destino,
    reporte,
    corregida: fila.propuesta !== null,
    fechaSupuesta: resuelto.fechaSupuesta,
    faltas: faltasDelReporte(reporte, {
      hoy: fechaDeJornada(),
      claseDeMedidor: (vehiculoId) => claseDe.get(vehiculoId) ?? 'horometro',
    }),
    complementosDelMensaje: complementos.map((c) => ({ ...c, enviadoEn: c.enviadoEn.toISOString() })),
    archivosDelMensaje: archivos,
    bitacoraDelDia: !parte ? 'no_existe' : parte.cerradoEn ? 'cerrada' : 'abierta',
    canteraActiva: fila.canteraActiva,
    reemplaza,
    propuestaIa: fila.propuestaIa,
    opciones,
  };
}
