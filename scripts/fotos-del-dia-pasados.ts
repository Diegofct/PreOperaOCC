/**
 * Las «Fotos del día» de los días que ya pasaron (spec 027, RF-29 a RF-31).
 *
 *   npx tsx --env-file=.env scripts/fotos-del-dia-pasados.ts                 # desarrollo, solo cuenta
 *   npx tsx --env-file=.env scripts/fotos-del-dia-pasados.ts --escribir      # desarrollo, agrega
 *   npx tsx --env-file=.env scripts/fotos-del-dia-pasados.ts --produccion    # producción, solo cuenta
 *
 * Por defecto **solo lee**: dice, por obra y día, cuántas fotos agregaría y cuántos
 * apartados «Alguien guardó la bitácora…» reintentaría. Con `--escribir`, lo hace.
 *
 * Solo toca las bitácoras **abiertas** desde el 7-oct-2026 (RF-29, RF-31): a una cerrada no
 * se le agrega nada, y tampoco se avisa de sus fotos viejas —eso es para la foto que llegue
 * tarde de aquí en adelante (RF-21)—. Qué foto entra lo decide la misma regla que el día a
 * día (`sincronizarFotosDelDia`): no hay una segunda copia de la regla aquí (principio 3).
 *
 * ── Los apartados del 8-oct ──
 *
 * Seis mensajes de foto quedaron en «No se pudo guardar» con «Alguien guardó la bitácora de
 * ese día mientras se aprobaba» (RF-30). No se dan por guardados a secas: el mensaje puede
 * traer algo más que la foto (una nota), y marcarlo guardado lo perdería. Se **reintentan**,
 * como el botón «Reintentar»: el apartado queda resuelto y el mensaje vuelve a procesarse.
 * Si fallara otra vez, reaparece con el motivo nuevo. Solo los de los días que el script
 * recorre y cuyas fotos ya quedaron en la bitácora.
 *
 * Se puede correr dos veces: lo agregado no se repite y lo reintentado ya no está pendiente.
 *
 * ── `--principales` (cambio del 2026-10-14, RF-34, RF-36) ──
 *
 *   npx tsx --env-file=.env scripts/fotos-del-dia-pasados.ts --principales [--escribir] [--produccion]
 *
 * Desde el cambio no hay foto principal: todas las fotos del día van en una sola lista. Este
 * modo pasa a la lista la foto principal que ya tenía cada bitácora **abierta** desde el
 * 7-oct: su foto de WhatsApp original si existe (misma huella), para que salga con quién, hora
 * y tipo; si no, la principal misma, que sale como «Subida en el panel». Si la lista ya tiene
 * esa foto —por id o por huella—, no hace nada. Las cerradas no se tocan: la sección las
 * muestra igual al leer.
 */
import { apuntarAProduccion } from './produccion';

const escribir = process.argv.includes('--escribir');
const enProduccion = process.argv.includes('--produccion');
const soloPrincipales = process.argv.includes('--principales');

async function principal() {
  if (enProduccion) apuntarAProduccion(escribir ? 'Agregando fotos' : 'Contando fotos');
  // Después de apuntar: un `import` estático leería la cadena de antes (ver produccion.ts).
  const { and, eq, inArray, isNull, like, sql } = await import('drizzle-orm');
  const { baseServidor } = await import('@/db/servidor/cliente');
  const { bitacoraFotos, media, obras, partesDeObra, whatsappExcepciones, whatsappGrupos, whatsappMensajes } =
    await import('@/db/servidor/esquema');
  const { PRIMER_DIA_CON_FOTOS } = await import('@/shared/rules/fotos-del-dia');
  const { diaDeLaFoto, sincronizarFotosDelDia } = await import('@/features/whatsapp/servidor/fotos-del-dia');
  const { obraDelMensaje } = await import('@/features/whatsapp/servidor/obra');
  const { procesarMensaje } = await import('@/features/whatsapp/servidor/automatico');
  const { ACTOR_SISTEMA } = await import('@/features/whatsapp/servidor/actor');

  const db = baseServidor();
  console.log(escribir ? 'Modo: ESCRIBIR\n' : 'Modo: solo lectura (agregue --escribir para hacerlo)\n');

  if (soloPrincipales) {
    const { idDeterminista } = await import('@/features/whatsapp/servidor/ids');
    const partes = await db
      .select({ id: partesDeObra.id, fecha: partesDeObra.fecha, obra: obras.nombre })
      .from(partesDeObra)
      .innerJoin(obras, eq(obras.id, partesDeObra.obraId))
      .where(
        and(
          isNull(partesDeObra.anuladoEn),
          isNull(partesDeObra.cerradoEn),
          sql`${partesDeObra.fecha} >= ${PRIMER_DIA_CON_FOTOS}`,
        ),
      );
    let total = 0;
    for (const parte of [...partes].sort((a, b) => `${a.fecha}${a.obra}`.localeCompare(`${b.fecha}${b.obra}`))) {
      const principales = await db
        .select({ id: media.id, sha256: media.sha256 })
        .from(media)
        .where(and(eq(media.duenoTipo, 'bitacora'), eq(media.duenoId, parte.id), isNull(media.itemKey)));
      if (principales.length === 0) continue;
      const enLaLista = await db
        .select({ mediaId: bitacoraFotos.mediaId, sha256: bitacoraFotos.sha256 })
        .from(bitacoraFotos)
        .where(eq(bitacoraFotos.parteId, parte.id));
      const ids = new Set(enLaLista.map((f) => f.mediaId));
      const huellas = new Set(enLaLista.map((f) => f.sha256).filter((h): h is string => h !== null));

      let pasadas = 0;
      for (const p of principales) {
        if (ids.has(p.id) || (p.sha256 && huellas.has(p.sha256))) continue;
        // La foto de WhatsApp de la que es copia, si la hay: sale con sus datos.
        const [original] = p.sha256
          ? await db
              .select({ mediaId: media.id, mensajeId: media.duenoId })
              .from(media)
              .where(and(eq(media.duenoTipo, 'whatsapp'), eq(media.sha256, p.sha256)))
              .limit(1)
          : [];
        const fila = original
          ? { mediaId: original.mediaId, mensajeId: original.mensajeId }
          : { mediaId: p.id, mensajeId: null };
        if (escribir) {
          await db
            .insert(bitacoraFotos)
            .values({
              id: await idDeterminista(parte.id, 'foto-del-dia', fila.mediaId),
              parteId: parte.id,
              mediaId: fila.mediaId,
              mensajeId: fila.mensajeId,
              sha256: p.sha256,
            })
            .onConflictDoNothing();
        }
        ids.add(fila.mediaId);
        if (p.sha256) huellas.add(p.sha256);
        pasadas++;
      }
      if (pasadas === 0) continue;
      total += pasadas;
      console.log(`${parte.fecha}  ${parte.obra.padEnd(32)}  ${escribir ? 'pasó' : 'pasaría'} ${pasadas} principal(es) a la lista`);
    }
    console.log(`\nTotal: ${total} principal(es) ${escribir ? 'pasadas' : 'por pasar'} a la lista.`);
    return;
  }

  // Los días con fotos de WhatsApp desde el 7-oct.
  const dias = await db
    .selectDistinct({ obraId: sql<string>`${obraDelMensaje}`, fecha: diaDeLaFoto })
    .from(media)
    .innerJoin(whatsappMensajes, eq(whatsappMensajes.id, media.duenoId))
    .innerJoin(whatsappGrupos, eq(whatsappGrupos.id, whatsappMensajes.grupoId))
    .where(
      and(
        eq(media.duenoTipo, 'whatsapp'),
        like(media.mime, 'image/%'),
        sql`${obraDelMensaje} is not null`,
        sql`${diaDeLaFoto} >= ${PRIMER_DIA_CON_FOTOS}`,
      ),
    );

  let totalFotos = 0;
  let totalReintentos = 0;
  for (const { obraId, fecha } of [...dias].sort((a, b) => `${a.fecha}${a.obraId}`.localeCompare(`${b.fecha}${b.obraId}`))) {
    if (!fecha) continue;
    const [parte] = await db
      .select({ id: partesDeObra.id, cerradoEn: partesDeObra.cerradoEn, obra: obras.nombre })
      .from(partesDeObra)
      .innerJoin(obras, eq(obras.id, partesDeObra.obraId))
      .where(and(eq(partesDeObra.obraId, obraId), eq(partesDeObra.fecha, fecha), isNull(partesDeObra.anuladoEn)))
      .limit(1);
    // Sin bitácora, o cerrada: no se toca (RF-31).
    if (!parte || parte.cerradoEn) continue;

    const { agregadas } = await sincronizarFotosDelDia(obraId, fecha, { simular: !escribir, sinApartar: true });

    // Los apartados por choque de los mensajes de ese día (RF-30).
    const choques = await db
      .select({ id: whatsappExcepciones.id, mensajeId: whatsappExcepciones.mensajeId })
      .from(whatsappExcepciones)
      .innerJoin(whatsappMensajes, eq(whatsappMensajes.id, whatsappExcepciones.mensajeId))
      .innerJoin(whatsappGrupos, eq(whatsappGrupos.id, whatsappMensajes.grupoId))
      .where(
        and(
          eq(whatsappExcepciones.estado, 'pendiente'),
          eq(whatsappExcepciones.seccion, 'bitacora'),
          isNull(whatsappExcepciones.renglon),
          like(whatsappExcepciones.motivo, 'Alguien guardó la bitácora%'),
          sql`${diaDeLaFoto} = ${fecha}`,
          sql`${obraDelMensaje} = ${obraId}`,
        ),
      );

    // Solo se reintentan los que ya tienen sus fotos en la bitácora (agregadas, o la principal).
    let reintentables = choques;
    if (escribir && choques.length > 0) {
      const fotosDeLos = await db
        .select({ mensajeId: media.duenoId, sha256: media.sha256 })
        .from(media)
        .where(
          and(
            eq(media.duenoTipo, 'whatsapp'),
            like(media.mime, 'image/%'),
            inArray(
              media.duenoId,
              choques.map((c) => c.mensajeId),
            ),
          ),
        );
      const enLaBitacora = new Set(
        [
          ...(await db.select({ sha256: bitacoraFotos.sha256 }).from(bitacoraFotos).where(eq(bitacoraFotos.parteId, parte.id))),
          ...(await db
            .select({ sha256: media.sha256 })
            .from(media)
            .where(and(eq(media.duenoTipo, 'bitacora'), eq(media.duenoId, parte.id), isNull(media.itemKey)))),
        ].map((f) => f.sha256),
      );
      reintentables = choques.filter((c) =>
        fotosDeLos.filter((f) => f.mensajeId === c.mensajeId).every((f) => enLaBitacora.has(f.sha256)),
      );
      for (const c of reintentables) {
        // Lo mismo que «Reintentar» en «No se pudo guardar» (024/RF-61).
        await db
          .update(whatsappExcepciones)
          .set({ estado: 'guardada', resueltaPor: ACTOR_SISTEMA.id, resueltaEn: new Date() })
          .where(and(eq(whatsappExcepciones.id, c.id), eq(whatsappExcepciones.estado, 'pendiente')));
        await db
          .update(whatsappMensajes)
          .set({ estado: 'pendiente', procesadoEn: null, intentos: 0, errorProceso: null })
          .where(eq(whatsappMensajes.id, c.mensajeId));
        await procesarMensaje(c.mensajeId);
      }
    }

    if (agregadas === 0 && reintentables.length === 0) continue;
    totalFotos += agregadas;
    totalReintentos += reintentables.length;
    console.log(
      `${fecha}  ${parte.obra.padEnd(32)}  ${escribir ? 'agregó' : 'agregaría'} ${String(agregadas).padStart(3)} foto(s)` +
        (reintentables.length ? `, ${escribir ? 'reintentó' : 'reintentaría'} ${reintentables.length} apartado(s) por choque` : ''),
    );
  }

  console.log(
    `\nTotal: ${totalFotos} foto(s) ${escribir ? 'agregadas' : 'por agregar'}, ` +
      `${totalReintentos} apartado(s) ${escribir ? 'reintentados' : 'por reintentar'}.`,
  );
}

principal().catch((fallo) => {
  console.error(fallo);
  process.exit(1);
});
