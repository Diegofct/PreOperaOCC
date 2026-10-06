/**
 * Aprobar un reporte de WhatsApp: lo que pasa a la bitácora (spec 021, RF-30 a
 * RF-49, RF-57, RF-59, RF-61 a RF-81, RF-88 a RF-93).
 *
 * ── Por pasos que resisten el reintento ──
 *
 * Neon por HTTP no da transacciones interactivas, así que aprobar no puede ser
 * «todo o nada» en la base. Es una secuencia de pasos donde **repetir cualquiera
 * da lo mismo que hacerlo una vez**:
 *
 *  1. Se valida todo antes de escribir nada (RF-64): las faltas del reporte y las
 *     validaciones de cada sección, las mismas del formulario (RF-59).
 *  2. Se abre la bitácora del día si no existe (RF-40), con el mismo `insert … on
 *     conflict do nothing` del panel.
 *  3. Se mezcla con lo que ya tiene (`fusionarReporteEnParte`) y se escribe en **un
 *     solo `UPDATE`**, condicionado a que nadie la haya guardado desde que se leyó
 *     (`actualizado_en`). Si alguien sí, se vuelve a leer y se repite una vez.
 *  4. Se marca el mensaje aprobado, condicionado a la versión que leyó el residente
 *     (RF-29), con la obra donde se decidió (RF-13).
 *
 * Las filas que crea el reporte llevan **ids deterministas**, derivados del id del
 * mensaje, la sección y el renglón. Si el proceso se corta entre el paso 3 y el 4,
 * el reintento encuentra esas filas y no las vuelve a añadir.
 *
 * ── Los viajes ──
 *
 * Van a Control Cantera (RF-39, RF-82 a RF-87), con las mismas comprobaciones que el
 * módulo —`validarViaje` en las faltas y `eleccionesAjenas` contra las opciones de
 * la obra—, pero con el permiso de la bandeja: el residente los aprueba aquí y sigue
 * sin poder registrarlos en el módulo (RF-84, RF-85). Se insertan con ids fijos y
 * `on conflict do nothing`: un reintento no los duplica.
 *
 * Con la bitácora del día cerrada se pueden aprobar **solo los viajes** (RF-96): el
 * reporte queda pendiente con `viajes_aprobados_en`, y cuando se apruebe el resto
 * los viajes no se vuelven a registrar (RF-97, RF-98).
 *
 * ── Las fotos ──
 *
 * El residente elige qué foto del reporte va a cada actividad y cuál es la del día
 * (RF-50, RF-51). La foto **no se vuelve a subir**: se crea otra fila de `media`,
 * con dueño `bitacora`, que apunta al mismo objeto de R2. Las no elegidas siguen
 * en la propuesta (RF-52). La del día solo si la bitácora no tiene ya una. Ids
 * fijos aquí también, por el reintento.
 *
 * Solo servidor.
 */
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

import { baseServidor } from '@/db/servidor/cliente';
import {
  canteraViajes,
  media,
  obras,
  partesDeObra,
  tiposVehiculo,
  vehiculos,
  whatsappGrupos,
  whatsappMensajes,
} from '@/db/servidor/esquema';
import { eleccionesAjenas, opcionesDeLaObra } from '@/features/cantera/servidor/viajes';
import {
  actividadesDelParte,
  climaDelParte,
  laboratorioDelParte,
  maquinariaDelParte,
  personalDelParte,
} from '@/features/bitacoras/servidor/secciones';
import type { FilaDeControlDeCalidad, OrigenWhatsapp } from '@/features/bitacoras/tipos';
import { filtroDeObraEstricto } from '@/features/servidor/alcance';
import type { PersonaEnSesion } from '@/features/servidor/guardia';
import { errorDePeticion, noEncontrado } from '@/features/servidor/respuestas';
import { aHex } from '@/shared/cripto/formato-pbkdf2';
import { DESTINO_OBRA } from '@/shared/rules/cantera';
import { DESFASE_COLOMBIA_MS, fechaDeJornada, medidorDeClase } from '@/shared/rules/jornada';
import {
  destinoDeCategoria,
  faltasDelReporte,
  fusionarReporteEnParte,
  type ReporteDelDia,
} from '@/shared/rules/whatsapp';

import { obraDelMensaje } from './obra';

/**
 * Un id fijo para la fila `renglon` de la `seccion` que crea este mensaje, con
 * forma de UUID (versión 5, a partir de SHA-256). El mismo mensaje da siempre los
 * mismos ids: es lo que vuelve seguro reintentar.
 */
async function idDeterminista(mensajeId: string, seccion: string, renglon: number): Promise<string> {
  const huella = aHex(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${mensajeId}|${seccion}|${renglon}`)),
    ),
  );
  const variante = ((parseInt(huella[16], 16) & 0x3) | 0x8).toString(16);
  return `${huella.slice(0, 8)}-${huella.slice(8, 12)}-5${huella.slice(13, 16)}-${variante}${huella.slice(17, 20)}-${huella.slice(20, 32)}`;
}

/** «HH:MM» en Colombia, para el encabezado de la nota. */
function horaEnColombia(fecha: Date): string {
  return new Date(fecha.getTime() - DESFASE_COLOMBIA_MS).toISOString().slice(11, 16);
}

export type ResultadoDeAprobacion =
  | { parteId: string; fecha: string; viajes: number; soloViajes: boolean }
  | Response;

/** Las faltas, con la forma con que la pantalla las pinta por renglón (RF-64). */
function respuestaDeFaltas(faltas: { seccion: string; renglon: number | null; mensaje: string }[]) {
  return Response.json(
    { error: 'Al reporte le falta información. Complétela antes de aprobar.', faltas },
    { status: 400 },
  );
}

/**
 * Los viajes del reporte, a Control Cantera, con ids fijos (RF-39, RF-46, RF-82,
 * RF-94). `registrado_por` es quien aprueba; el mensaje queda como origen.
 */
async function registrarViajes(
  mensajeId: string,
  reporte: ReporteDelDia,
  obraId: string,
  aprobadoPor: string,
): Promise<number> {
  if (reporte.viajes.length === 0) return 0;
  const filas = await Promise.all(
    reporte.viajes.map(async (v, i) => {
      const aLaObra = v.destino === DESTINO_OBRA;
      return {
        id: await idDeterminista(mensajeId, 'viajes', i),
        obraId,
        fecha: reporte.fecha!,
        hora: v.hora!,
        materialId: v.materialId!,
        vehiculoId: v.vehiculoId!,
        conductorId: v.conductorId!,
        origenId: v.origenId!,
        destinoId: aLaObra ? null : v.destino!,
        destinoObra: aLaObra,
        pr: aLaObra ? v.pr : null,
        metros: aLaObra ? v.metros : null,
        mensajeWhatsappId: mensajeId,
        registradoPor: aprobadoPor,
      };
    }),
  );
  await baseServidor().insert(canteraViajes).values(filas).onConflictDoNothing({ target: canteraViajes.id });
  return filas.length;
}

/** Las fotos elegidas: la del día y, por renglón de actividad, la de cada una. */
interface FotosElegidas {
  delDia: string | null;
  porActividad: Record<string, string>;
}

/** Un archivo del mensaje que puede pasar a la bitácora. */
interface FotoDelMensaje {
  id: string;
  mime: string;
  bytes: number | null;
  sha256: string | null;
  claveR2: string | null;
}

/**
 * Las fotos elegidas, comprobadas antes de escribir nada: cada una tiene que ser
 * una imagen de este mensaje o de los que lo complementan, ya subida, y cada
 * actividad elegida tiene que existir en el reporte. Devuelve las fotos o las
 * faltas.
 */
async function fotosElegidas(
  mensajeId: string,
  fotos: FotosElegidas,
  actividades: number,
): Promise<Map<string, FotoDelMensaje> | { seccion: string; renglon: number | null; mensaje: string }[]> {
  const ids = [
    ...new Set([fotos.delDia, ...Object.values(fotos.porActividad)].filter((f): f is string => !!f)),
  ];
  if (ids.length === 0) return new Map();

  const db = baseServidor();
  const complementos = await db
    .select({ id: whatsappMensajes.id })
    .from(whatsappMensajes)
    .where(eq(whatsappMensajes.complementaA, mensajeId));
  const delMensaje = await db
    .select({ id: media.id, mime: media.mime, bytes: media.bytes, sha256: media.sha256, claveR2: media.claveR2 })
    .from(media)
    .where(
      and(
        eq(media.duenoTipo, 'whatsapp'),
        inArray(media.duenoId, [mensajeId, ...complementos.map((c) => c.id)]),
        inArray(media.id, ids),
      ),
    );
  const porId = new Map(delMensaje.map((f) => [f.id, f]));

  const faltas: { seccion: string; renglon: number | null; mensaje: string }[] = [];
  const revisar = (fotoId: string, seccion: string, renglon: number | null) => {
    const foto = porId.get(fotoId);
    if (!foto || !foto.claveR2) faltas.push({ seccion, renglon, mensaje: 'Esa foto no es de este reporte.' });
    else if (!foto.mime.startsWith('image/')) {
      faltas.push({ seccion, renglon, mensaje: 'Solo una imagen puede ser fotografía de la bitácora.' });
    }
  };
  if (fotos.delDia) revisar(fotos.delDia, 'fotos', null);
  for (const [renglon, fotoId] of Object.entries(fotos.porActividad)) {
    const indice = Number(renglon);
    if (indice >= actividades) {
      faltas.push({ seccion: 'actividades', renglon: indice, mensaje: 'Esa actividad no está en el reporte.' });
    } else {
      revisar(fotoId, 'actividades', indice);
    }
  }
  return faltas.length > 0 ? faltas : porId;
}

/** Aprueba la propuesta tal como la corrigió el residente. */
export async function aprobarPropuesta(
  sesion: PersonaEnSesion,
  id: string,
  pedido: {
    version: number;
    propuesta: ReporteDelDia;
    soloViajes: boolean;
    fotos: FotosElegidas;
  },
): Promise<ResultadoDeAprobacion> {
  const db = baseServidor();

  const [mensaje] = await db
    .select({
      estado: whatsappMensajes.estado,
      version: whatsappMensajes.version,
      parteId: whatsappMensajes.parteId,
      categoria: whatsappMensajes.categoria,
      autorNombre: whatsappMensajes.autorNombre,
      enviadoEn: whatsappMensajes.enviadoEn,
      viajesAprobadosEn: whatsappMensajes.viajesAprobadosEn,
      obraId: sql<string>`${obraDelMensaje}`,
      canteraActiva: obras.canteraActivo,
    })
    .from(whatsappMensajes)
    .innerJoin(whatsappGrupos, eq(whatsappGrupos.id, whatsappMensajes.grupoId))
    .innerJoin(obras, sql`${obras.id} = ${obraDelMensaje}`)
    .where(and(eq(whatsappMensajes.id, id), filtroDeObraEstricto(sesion, obraDelMensaje)))
    .limit(1);
  if (!mensaje) return noEncontrado('esa propuesta');

  // Un reintento de una aprobación que ya terminó: se responde lo que quedó.
  if (mensaje.estado === 'aprobado' && mensaje.version === pedido.version + 1) {
    return {
      parteId: mensaje.parteId ?? '',
      fecha: pedido.propuesta.fecha ?? '',
      viajes: pedido.propuesta.viajes.length,
      soloViajes: false,
    };
  }
  if (mensaje.estado !== 'pendiente') {
    return errorDePeticion('Esta propuesta ya no está pendiente. Vuelva a abrirla para ver cómo quedó.', 409);
  }
  if (mensaje.version !== pedido.version) {
    return errorDePeticion(
      'Otra persona cambió esta propuesta mientras usted la tenía abierta. Vuelva a abrirla.',
      409,
    );
  }

  const reporte = pedido.propuesta;
  const { soloViajes } = pedido;
  // Los viajes que ya se aprobaron solos no se vuelven a registrar (RF-98).
  const viajesPendientes = reporte.viajes.length > 0 && !mensaje.viajesAprobadosEn;
  if (soloViajes && !viajesPendientes) {
    return errorDePeticion('Este reporte no tiene viajes por aprobar.', 400);
  }
  // RF-45: con Control Cantera apagado en la obra, sus viajes no se aprueban.
  if (viajesPendientes && !mensaje.canteraActiva) {
    return errorDePeticion(
      'Esta obra no lleva Control Cantera: los viajes del reporte no se pueden aprobar. Quítelos o pida que se active el módulo.',
      400,
    );
  }

  const obraId = mensaje.obraId;
  const destino = destinoDeCategoria(mensaje.categoria);

  // 1. Todo lo que falta, de una vez (RF-64). El medidor de cada equipo sale de su tipo.
  const idsDeEquipo = reporte.maquinaria.map((m) => m.vehiculoId).filter((v): v is string => !!v);
  const clases = idsDeEquipo.length
    ? await db
        .select({ id: vehiculos.id, clase: tiposVehiculo.claseMedidor })
        .from(vehiculos)
        .innerJoin(tiposVehiculo, eq(tiposVehiculo.id, vehiculos.tipoVehiculoId))
        .where(inArray(vehiculos.id, idsDeEquipo))
    : [];
  const claseDe = new Map(clases.map((c) => [c.id, medidorDeClase(c.clase)]));
  const todas = faltasDelReporte(reporte, {
    hoy: fechaDeJornada(),
    claseDeMedidor: (vehiculoId) => claseDe.get(vehiculoId) ?? 'horometro',
  });
  // Aprobando solo los viajes, lo demás del reporte espera a la otra bitácora (RF-96).
  const faltas = soloViajes ? todas.filter((f) => f.seccion === 'viajes' || f.seccion === 'fecha') : todas;
  if (faltas.length > 0) return respuestaDeFaltas(faltas);

  // Lo elegido en cada viaje tiene que estar entre lo que ofrece la obra hoy: la
  // misma comprobación que el registro en el módulo (010/RF-8, RF-35).
  if (viajesPendientes) {
    const opciones = await opcionesDeLaObra(obraId);
    const ajenas = reporte.viajes.flatMap((v, renglon) =>
      eleccionesAjenas(opciones, {
        materialId: v.materialId!,
        vehiculoId: v.vehiculoId!,
        conductorId: v.conductorId!,
        origenId: v.origenId!,
        destino: v.destino!,
      }).map((a) => ({ seccion: 'viajes', renglon, mensaje: a.mensaje })),
    );
    if (ajenas.length > 0) return respuestaDeFaltas(ajenas);
  }
  const fecha = reporte.fecha!;

  // Las fotos elegidas, también antes de escribir nada (RF-50 a RF-52).
  const fotos = soloViajes ? new Map<string, FotoDelMensaje>() : await fotosElegidas(id, pedido.fotos, reporte.actividades.length);
  if (Array.isArray(fotos)) return respuestaDeFaltas(fotos);

  // Solo los viajes, con la bitácora del día cerrada (RF-96 a RF-98).
  if (soloViajes) {
    const [parte] = await db
      .select({ cerradoEn: partesDeObra.cerradoEn })
      .from(partesDeObra)
      .where(
        and(eq(partesDeObra.obraId, obraId), eq(partesDeObra.fecha, fecha), isNull(partesDeObra.anuladoEn)),
      )
      .limit(1);
    if (!parte?.cerradoEn) {
      return errorDePeticion(
        'Los viajes se aprueban aparte solo cuando la bitácora del día está cerrada. Apruebe el reporte completo.',
        400,
      );
    }
    const viajes = await registrarViajes(id, reporte, obraId, sesion.id);
    const [marcado] = await db
      .update(whatsappMensajes)
      .set({
        viajesAprobadosEn: new Date(),
        propuesta: reporte as unknown as Record<string, unknown>,
        version: sql`${whatsappMensajes.version} + 1`,
      })
      .where(
        and(
          eq(whatsappMensajes.id, id),
          eq(whatsappMensajes.estado, 'pendiente'),
          eq(whatsappMensajes.version, pedido.version),
        ),
      )
      .returning({ id: whatsappMensajes.id });
    if (!marcado) {
      return errorDePeticion('Otra persona decidió sobre esta propuesta al mismo tiempo. Vuelva a abrirla.', 409);
    }
    return { parteId: '', fecha, viajes, soloViajes: true };
  }

  // «seguimiento» devuelto a la bandeja, o una categoría sin destino: se marca
  // revisado sin crear nada (RF-49).
  const creaRegistros = destino !== 'ninguno';

  // 2. Las filas, con las mismas validaciones del formulario (RF-59) y sus ids fijos.
  const ahora = new Date();
  const origen: OrigenWhatsapp = {
    mensajeId: id,
    aprobadoPor: sesion.id,
    aprobadoEn: ahora.toISOString(),
  };
  const conOrigen = async <T extends { id: string }>(filas: T[], seccion: string) =>
    Promise.all(
      filas.map(async (fila, i) => ({ ...fila, id: await idDeterminista(id, seccion, i), origen })),
    );

  const maquinaria = await maquinariaDelParte(
    reporte.maquinaria.map((m) => ({
      vehiculoId: m.vehiculoId!,
      medidorInicial: m.medidorInicial,
      medidorFinal: m.medidorFinal,
      observaciones: m.observaciones,
      operadorId: m.operadorId,
    })),
    obraId,
  );
  if ('error' in maquinaria) return errorDePeticion(maquinaria.error, 400);

  const personal = await personalDelParte(
    reporte.personal.map((p) => ({
      usuarioId: p.usuarioId!,
      entrada: p.entrada!,
      salida: p.salida!,
      observaciones: p.observaciones,
    })),
  );
  if ('error' in personal) return errorDePeticion(personal.error, 400);

  const actividades = actividadesDelParte(
    await Promise.all(
      reporte.actividades.map(async (a, i) => ({
        id: await idDeterminista(id, 'actividades', i),
        clave: a.clave!,
        texto: a.texto ?? null,
        unidad: a.unidad ?? null,
        cantidad: a.cantidad ?? null,
        descripcion: a.descripcion ?? '',
        observaciones: '',
        longitud: a.longitud ?? null,
        ancho: a.ancho ?? null,
        alto: a.alto ?? null,
        area: null,
        volumen: null,
      })),
    ),
    [],
  );
  if ('error' in actividades) return errorDePeticion(actividades.error, 400);

  const clima = climaDelParte(
    reporte.clima.map((f) => ({ condicion: f.condicion!, desde: f.desde!, hasta: f.hasta! })),
  );
  if ('error' in clima) return errorDePeticion(clima.error, 400);

  const laboratorio = laboratorioDelParte(
    await Promise.all(
      reporte.ensayos.map(async (e, i) => ({
        id: await idDeterminista(id, 'ensayos', i),
        ensayo: e.ensayo,
        observacion: e.observacion,
        horaInicio: e.horaInicio,
        horaFin: e.horaFin,
        responsable: e.responsable,
        ubicacion: e.ubicacion,
      })),
    ),
    [],
  );
  if ('error' in laboratorio) return errorDePeticion(laboratorio.error, 400);

  const notaDelReporte = reporte.notas.trim()
    ? `WhatsApp — ${mensaje.autorNombre ?? 'Sin nombre'}, ${horaEnColombia(mensaje.enviadoEn)}: ${reporte.notas.trim()}`
    : '';

  const delReporte = {
    maquinaria: await conOrigen(maquinaria.filas, 'maquinaria'),
    personal: await conOrigen(personal.filas, 'personal'),
    actividades: actividades.filas.map((a) => ({ ...a, origen })),
    clima: await conOrigen(clima.filas, 'clima'),
    laboratorio: laboratorio.filas.map((e) => ({ ...e, origen }) as FilaDeControlDeCalidad),
    notas: notaDelReporte,
  };

  // 3. La bitácora del día: se abre si no existe (RF-40), y se escribe de una vez.
  let parteId: string | null = null;
  if (creaRegistros) {
    for (let intento = 0; intento < 2 && !parteId; intento++) {
      await db
        .insert(partesDeObra)
        .values({ id: uuidv7(), obraId, usuarioId: sesion.id, fecha })
        .onConflictDoNothing({
          target: [partesDeObra.obraId, partesDeObra.fecha],
          where: isNull(partesDeObra.anuladoEn),
        });

      const [parte] = await db
        .select({
          id: partesDeObra.id,
          maquinaria: partesDeObra.maquinaria,
          personal: partesDeObra.personal,
          actividades: partesDeObra.actividades,
          clima: partesDeObra.clima,
          laboratorio: partesDeObra.laboratorio,
          notas: partesDeObra.notas,
          cerradoEn: partesDeObra.cerradoEn,
          // Como texto y no como `Date`: Postgres guarda microsegundos y un `Date`
          // solo milisegundos, así que comparar el `Date` leído nunca coincidiría.
          marca: sql<string>`${partesDeObra.actualizadoEn}::text`,
        })
        .from(partesDeObra)
        .where(
          and(
            eq(partesDeObra.obraId, obraId),
            eq(partesDeObra.fecha, fecha),
            isNull(partesDeObra.anuladoEn),
          ),
        )
        .limit(1);
      if (!parte) return errorDePeticion('No se pudo abrir la bitácora de ese día.', 500);

      // RF-41, RF-42: lo que va a una bitácora cerrada no se aprueba. Los viajes sí,
      // aparte (RF-43, RF-96): la respuesta lo dice para que la pantalla lo ofrezca.
      if (parte.cerradoEn) {
        return Response.json(
          {
            error: `La bitácora del ${fecha} ya está cerrada. Para incluir este reporte hay que anularla con un motivo y abrir otra.`,
            puedeAprobarSoloViajes: viajesPendientes,
          },
          { status: 409 },
        );
      }

      const fusion = fusionarReporteEnParte(parte, delReporte);
      const [escrita] = await db
        .update(partesDeObra)
        .set({
          maquinaria: fusion.maquinaria,
          personal: fusion.personal,
          actividades: fusion.actividades,
          clima: fusion.clima,
          laboratorio: fusion.laboratorio,
          notas: fusion.notas,
        })
        .where(
          and(
            eq(partesDeObra.id, parte.id),
            isNull(partesDeObra.cerradoEn),
            sql`${partesDeObra.actualizadoEn} = ${parte.marca}::timestamptz`,
          ),
        )
        .returning({ id: partesDeObra.id });
      if (escrita) parteId = escrita.id;
    }
    if (!parteId) {
      return errorDePeticion(
        'Alguien guardó la bitácora de ese día mientras se aprobaba. Vuelva a intentarlo.',
        409,
      );
    }
  }

  // Las fotos elegidas, a la bitácora: otra fila de `media` sobre el mismo objeto
  // de R2 (RF-50, RF-51). La del día, solo si la bitácora no tiene una.
  if (parteId && fotos.size > 0) {
    const yaHayDelDia = pedido.fotos.delDia
      ? (
          await db
            .select({ id: media.id })
            .from(media)
            .where(
              and(eq(media.duenoTipo, 'bitacora'), eq(media.duenoId, parteId), isNull(media.itemKey)),
            )
            .limit(1)
        ).length > 0
      : true;
    const elegidas = [
      ...(pedido.fotos.delDia && !yaHayDelDia
        ? [{ fotoId: pedido.fotos.delDia, itemKey: null as string | null, clave: 'dia' }]
        : []),
      ...(await Promise.all(
        Object.entries(pedido.fotos.porActividad).map(async ([renglon, fotoId]) => ({
          fotoId,
          itemKey: await idDeterminista(id, 'actividades', Number(renglon)),
          clave: `actividad-${renglon}`,
        })),
      )),
    ];
    if (elegidas.length > 0) {
      await db
        .insert(media)
        .values(
          await Promise.all(
            elegidas.map(async (e) => {
              const foto = fotos.get(e.fotoId)!;
              return {
                id: await idDeterminista(id, `foto-${e.clave}`, 0),
                duenoTipo: 'bitacora' as const,
                duenoId: parteId!,
                proposito: 'evidencia' as const,
                itemKey: e.itemKey,
                mime: foto.mime,
                bytes: foto.bytes,
                sha256: foto.sha256,
                // El mismo objeto: no se copia ni se vuelve a subir.
                claveR2: foto.claveR2,
                subidoEn: ahora,
              };
            }),
          ),
        )
        .onConflictDoNothing({ target: media.id });
    }
  }

  // Los viajes, después de la bitácora y antes de marcar el mensaje: si algo se
  // corta aquí, el reintento los encuentra por su id y no los duplica.
  const viajes = viajesPendientes ? await registrarViajes(id, reporte, obraId, sesion.id) : 0;

  // 4. El mensaje, aprobado, con la obra donde se decidió (RF-13, RF-46).
  const [aprobado] = await db
    .update(whatsappMensajes)
    .set({
      estado: 'aprobado',
      propuesta: reporte as unknown as Record<string, unknown>,
      parteId,
      aprobadoPor: sesion.id,
      aprobadoEn: ahora,
      obraDecididaId: obraId,
      version: sql`${whatsappMensajes.version} + 1`,
    })
    .where(
      and(
        eq(whatsappMensajes.id, id),
        eq(whatsappMensajes.estado, 'pendiente'),
        eq(whatsappMensajes.version, pedido.version),
      ),
    )
    .returning({ id: whatsappMensajes.id });
  if (!aprobado) {
    return errorDePeticion(
      'Otra persona decidió sobre esta propuesta al mismo tiempo. Vuelva a abrirla.',
      409,
    );
  }

  return { parteId: parteId ?? '', fecha, viajes, soloViajes: false };
}
