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
import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import {
  canteraViajes,
  media,
  obras,
  partesDeObra,
  vehiculos,
  whatsappGrupos,
  whatsappMensajes,
} from '@/db/servidor/esquema';
import { reporteCorregido, type DetalleDePropuesta, type PropuestaFila } from '@/features/panel/contratos';
import { filtroDeObraEstricto, veTodasLasObras } from '@/features/servidor/alcance';
import type { PersonaEnSesion } from '@/features/servidor/guardia';
import { nombreDeCargo } from '@/shared/catalogos/cargos';
import { avisoDeValeRepetido } from '@/shared/rules/cantera';
import { fechaDeJornada } from '@/shared/rules/jornada';
import {
  destinoDeCategoria,
  faltasDelReporte,
  posiblesCoincidencias,
  reconocerPersona,
  resolverPropuesta,
  type EstadoMensajeWhatsapp,
  type PropuestaLeible,
  type ReporteDelDia,
} from '@/shared/rules/whatsapp';

import { catalogosDeLaObra } from './catalogos';
import { diaDelMensaje, obraDelMensaje } from './obra';

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
  fechaHecho: whatsappMensajes.fechaHecho,
  resultado: whatsappMensajes.resultado,
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
  fechaHecho: string | null;
  resultado: Record<string, unknown> | null;
}): PropuestaFila {
  return {
    ...fila,
    enviadoEn: fila.enviadoEn.toISOString(),
    resultado: fila.resultado as PropuestaFila['resultado'],
  };
}

/**
 * La lista de un estado en un rango de días del reporte, de la fecha «Desde» a la
 * fecha «Hasta» (spec 025, RF-45, RF-48; spec 026, RF-26, que reemplaza 025/RF-52). Sin tope: el rango ya acota lo que se lee,
 * y un tope dejaba fuera justo lo más nuevo (RF-53). La gerencia puede pedir una
 * obra; el residente ve la suya y nada más (021/RF-14).
 */
export async function leerBandeja(
  sesion: PersonaEnSesion,
  filtro: { estado: EstadoMensajeWhatsapp; obraId: string | null; desde: string; hasta: string },
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
        sql`${diaDelMensaje} between ${filtro.desde} and ${filtro.hasta}`,
        // Lo que complementa a un mensaje que existe va dentro de él (RF-20).
        sql`not exists (select 1 from whatsapp_mensajes p where p.id = ${whatsappMensajes.complementaA})`,
      ),
    )
    // De «Desde» a «Hasta», y en cada día del más antiguo al más reciente (026/RF-26).
    .orderBy(asc(diaDelMensaje), asc(whatsappMensajes.enviadoEn));

  return filas.map(aFila);
}

/**
 * El aviso de cada viaje del reporte cuyo vale ya está en otro viaje vigente de la
 * obra, o en un renglón anterior del mismo reporte (spec 023, RF-45, RF-56). Avisa
 * y no impide aprobar. Los viajes que este mismo mensaje ya registró —al aprobar
 * solo los viajes, 021/RF-96— no cuentan: son estos mismos.
 */
async function avisosDeValeDelReporte(
  obraId: string,
  mensajeId: string,
  reporte: ReporteDelDia,
): Promise<{ renglon: number; mensaje: string }[]> {
  const vales = [...new Set(reporte.viajes.map((v) => v.vale?.trim().toLowerCase()).filter((v) => !!v))];
  if (vales.length === 0) return [];

  const enLaObra = await baseServidor()
    .select({
      id: canteraViajes.id,
      vale: canteraViajes.vale,
      fecha: canteraViajes.fecha,
      hora: canteraViajes.hora,
      volqueta: vehiculos.codigoInterno,
    })
    .from(canteraViajes)
    .innerJoin(vehiculos, eq(vehiculos.id, canteraViajes.vehiculoId))
    .where(
      and(
        eq(canteraViajes.obraId, obraId),
        isNull(canteraViajes.anuladoEn),
        sql`lower(${canteraViajes.vale}) in ${vales}`,
        sql`${canteraViajes.mensajeWhatsappId} is distinct from ${mensajeId}`,
      ),
    );
  const vigentes = enLaObra.map((v) => ({ ...v, anulado: false }));

  return reporte.viajes.flatMap((viaje, renglon) => {
    if (!viaje.vale) return [];
    const otro = avisoDeValeRepetido(viaje.vale, vigentes);
    if (otro) {
      return [
        {
          renglon,
          mensaje: `El vale ${otro.vale} ya está en el viaje del ${otro.fecha} a las ${otro.hora} (${otro.volqueta}).`,
        },
      ];
    }
    const anteriores = reporte.viajes
      .slice(0, renglon)
      .map((v, i) => ({ id: String(i), vale: v.vale, anulado: false }));
    const enElReporte = avisoDeValeRepetido(viaje.vale, anteriores);
    return enElReporte
      ? [
          {
            renglon,
            mensaje: `El vale ${viaje.vale} ya está en el viaje ${Number(enElReporte.id) + 1} de este mismo reporte.`,
          },
        ]
      : [];
  });
}

/**
 * El detalle de un mensaje, con su propuesta lista para revisar. `null` si no
 * existe o no está al alcance: «no existe» y no «no puede», como en el resto del
 * panel.
 */
export async function leerDetalle(
  sesion: PersonaEnSesion,
  id: string,
  // Lo dice la ruta, que es la que lee el entorno (spec 024, RF-70).
  guardadoAutomatico = false,
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
      almacenActivo: obras.almacenActivo,
    })
    .from(whatsappMensajes)
    .innerJoin(whatsappGrupos, eq(whatsappGrupos.id, whatsappMensajes.grupoId))
    .innerJoin(obras, sql`${obras.id} = ${obraDelMensaje}`)
    .where(and(eq(whatsappMensajes.id, id), filtroDeObraEstricto(sesion, obraDelMensaje)))
    .limit(1);
  if (!fila) return null;

  // El día del hecho que dice la IA y el del mensaje: los dos pueden importar para el
  // preoperacional de una volqueta (cambio de la 021 del 2026-10-08, RF-105).
  const diaDelMensaje = fechaDeJornada(fila.enviadoEn.getTime());
  const fechaDeLaIa = (fila.propuestaIa as PropuestaLeible).fecha_evento?.trim() ?? '';
  const { catalogos, claseDe, cargoDe, personasDeLaObra, opciones } = await catalogosDeLaObra(
    fila.obraId,
    [diaDelMensaje, fechaDeLaIa],
  );
  const destino = destinoDeCategoria(fila.categoria);
  // Lo corregido pasa otra vez por el contrato: las propuestas guardadas antes de la
  // spec 023 no traen almacén, vale ni hoja, y el contrato les pone su vacío.
  const resuelto = fila.propuesta
    ? { reporte: reporteCorregido.parse(fila.propuesta) as ReporteDelDia, fechaSupuesta: false }
    : resolverPropuesta(fila.propuestaIa as PropuestaLeible, catalogos, {
        diaDelMensaje,
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

  // Spec 023, RF-65: las personas de la obra que se parecen a cada una no reconocida.
  const coincidenciasDe = (filas: { reconocida: boolean; nombre: string | null }[]) =>
    Object.fromEntries(
      filas.flatMap((f, renglon) => {
        if (f.reconocida || !f.nombre) return [];
        const parecidas = posiblesCoincidencias(f.nombre, personasDeLaObra);
        return parecidas.length > 0 ? [[String(renglon), parecidas]] : [];
      }),
    );
  const coincidencias = {
    personal: coincidenciasDe(reporte.personal.map((p) => ({ reconocida: !!p.usuarioId, nombre: p.escrito }))),
    maquinaria: coincidenciasDe(
      reporte.maquinaria.map((m) => ({ reconocida: !!m.operadorId, nombre: m.operadorEscrito })),
    ),
  };

  const avisosDeVale = await avisosDeValeDelReporte(fila.obraId, id, reporte);

  const autorId = reconocerPersona(fila.autorNombre, catalogos.personas);
  const autor = catalogos.personas.find((p) => p.id === autorId);
  const cargoDelAutor = autor ? cargoDe.get(autor.id) : null;

  return {
    ...aFila(fila),
    texto: fila.texto,
    version: fila.version,
    guardadoAutomatico,
    autor: {
      usuarioId: autor?.id ?? null,
      nombre: autor?.nombreCompleto ?? fila.autorNombre ?? 'Sin nombre',
      cargo: cargoDelAutor ? nombreDeCargo(cargoDelAutor) : null,
    },
    destino,
    reporte,
    corregida: fila.propuesta !== null,
    fechaSupuesta: resuelto.fechaSupuesta,
    // Solo lo pendiente tiene faltas: en lo ya decidido, comparar con los catálogos
    // de hoy daría faltas falsas (un material que se registró al aprobar «ya existe»).
    faltas:
      fila.estado === 'pendiente'
        ? faltasDelReporte(reporte, {
            hoy: fechaDeJornada(),
            claseDeMedidor: (vehiculoId) => claseDe.get(vehiculoId) ?? 'horometro',
            almacen: { materiales: opciones.almacen },
          })
        : [],
    complementosDelMensaje: complementos.map((c) => ({ ...c, enviadoEn: c.enviadoEn.toISOString() })),
    archivosDelMensaje: archivos,
    bitacoraDelDia: !parte ? 'no_existe' : parte.cerradoEn ? 'cerrada' : 'abierta',
    canteraActiva: fila.canteraActiva,
    almacenActivo: fila.almacenActivo,
    coincidencias,
    avisosDeVale,
    reemplaza,
    propuestaIa: fila.propuestaIa,
    opciones,
  };
}
