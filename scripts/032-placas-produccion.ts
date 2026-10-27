/**
 * La placa como identificación de cada vehículo (spec 032, RF-16, RF-19, RF-20).
 *
 *   npx tsx --env-file=.env scripts/032-placas-produccion.ts                          # desarrollo, solo cuenta
 *   npx tsx --env-file=.env scripts/032-placas-produccion.ts --escribir               # desarrollo, cambia
 *   npx tsx --env-file=.env scripts/032-placas-produccion.ts --produccion             # producción, solo cuenta
 *   npx tsx --env-file=.env scripts/032-placas-produccion.ts --produccion --escribir  # producción, cambia
 *
 * Por defecto **solo lee** y dice qué cambiaría. Con `--escribir`, lo hace. Va después
 * de la migración 0031 (necesita `codigo_anterior`) y de la imagen nueva.
 *
 * Tres pasos, en este orden:
 *
 *  1. **Las placas MC** que el usuario aprobó el 2026-10-26 para tres motoniveladoras
 *     que WhatsApp creó sin placa: el número MC que ya traía su nombre. Solo si el
 *     equipo sigue sin placa; en desarrollo esos códigos no existen y no pasa nada.
 *  2. **Código = placa.** Cada vehículo vigente con placa queda con la placa
 *     normalizada en `placa` y en `codigo_interno`, y su código de antes en
 *     `codigo_anterior` (si no tenía ya uno), para que WhatsApp lo siga reconociendo.
 *     Si otra placa vigente normaliza igual, ninguno de los dos se toca y se avisa:
 *     el índice único lo rechazaría y elegir cuál es el bueno es del usuario.
 *  3. **Bitácoras abiertas.** Las máquinas de las bitácoras sin cerrar ni anular toman
 *     el nombre de hoy de su vehículo (`identificacionDelVehiculo`), como si se
 *     volvieran a guardar (RF-16). Las cerradas no se tocan: son evidencia (RF-17).
 *
 * Se puede correr dos veces: la segunda no encuentra nada que cambiar. Sin
 * transacciones (Neon por HTTP): si se corta a medias, se vuelve a correr.
 */
import { apuntarAProduccion } from './produccion';

const escribir = process.argv.includes('--escribir');
const enProduccion = process.argv.includes('--produccion');

/** Aprobadas por el usuario el 2026-10-26 (spec 032, «Dudas abiertas»). */
const PLACAS_APROBADAS: Record<string, string> = {
  'WA-MOTONIVELADORA-0FEF': 'MC102417',
  'WA-MOTONIVELADORA-838F': 'MC035150',
  'WA-MOTONIVELADORA-9CE5': 'MC770197',
};

async function principal() {
  if (enProduccion) apuntarAProduccion(escribir ? 'Cambiando placas' : 'Contando placas');
  // Después de apuntar: un `import` estático leería la cadena de antes (ver produccion.ts).
  const { and, eq, isNull, sql } = await import('drizzle-orm');
  const { baseServidor } = await import('@/db/servidor/cliente');
  const { partesDeObra, tiposVehiculo, vehiculos } = await import('@/db/servidor/esquema');
  const { identificacionDelVehiculo, normalizarPlaca } = await import('@/shared/rules/vehiculos');

  const db = baseServidor();
  console.log(escribir ? 'Modo: ESCRIBIR\n' : 'Modo: solo lectura (agregue --escribir para hacerlo)\n');

  const leerFlota = () =>
    db
      .select({
        id: vehiculos.id,
        codigoInterno: vehiculos.codigoInterno,
        codigoAnterior: vehiculos.codigoAnterior,
        placa: vehiculos.placa,
        marca: vehiculos.marca,
        modelo: vehiculos.modelo,
        tipo: tiposVehiculo.nombre,
      })
      .from(vehiculos)
      .innerJoin(tiposVehiculo, eq(tiposVehiculo.id, vehiculos.tipoVehiculoId))
      .where(isNull(vehiculos.eliminadoEn));

  // ── 1. Las placas MC aprobadas ──
  console.log('1. Placas aprobadas para equipos sin placa');
  let placasPuestas = 0;
  for (const v of await leerFlota()) {
    const placa = PLACAS_APROBADAS[v.codigoInterno];
    if (!placa || normalizarPlaca(v.placa)) continue;
    console.log(`   ${v.codigoInterno} (${v.modelo ?? v.tipo}) → ${placa}`);
    placasPuestas++;
    if (escribir) {
      await db
        .update(vehiculos)
        .set({ placa })
        .where(and(eq(vehiculos.id, v.id), isNull(vehiculos.placa)));
    }
  }
  console.log(`   ${placasPuestas} ${escribir ? 'puestas' : 'por poner'}\n`);

  // ── 2. Código = placa ──
  console.log('2. Código interno igual a la placa');
  // Con escritura se relee: el paso 1 acaba de dar placa a tres equipos. Sin ella, se
  // simula con las mismas placas para que el conteo diga lo que haría de verdad.
  const flota = (await leerFlota()).map((v) =>
    !escribir && PLACAS_APROBADAS[v.codigoInterno] && !normalizarPlaca(v.placa)
      ? { ...v, placa: PLACAS_APROBADAS[v.codigoInterno] }
      : v,
  );

  const porPlaca = new Map<string, typeof flota>();
  for (const v of flota) {
    const placa = normalizarPlaca(v.placa);
    if (placa) porPlaca.set(placa, [...(porPlaca.get(placa) ?? []), v]);
  }
  // Un código que ya es la placa de otro también choca con el índice único.
  const codigos = new Map(flota.map((v) => [v.codigoInterno, v.id]));

  let igualados = 0;
  let repetidos = 0;
  const avisadas = new Set<string>();
  const sinPlaca: string[] = [];
  for (const v of flota) {
    const placa = normalizarPlaca(v.placa);
    if (!placa) {
      sinPlaca.push(identificacionDelVehiculo(v));
      continue;
    }
    const gemelos = porPlaca.get(placa)!;
    const duenoDelCodigo = codigos.get(placa);
    if (gemelos.length > 1 || (duenoDelCodigo && duenoDelCodigo !== v.id)) {
      if (!avisadas.has(placa)) {
        avisadas.add(placa);
        const quienes = gemelos.map((g) => g.codigoInterno);
        if (duenoDelCodigo && !gemelos.some((g) => g.id === duenoDelCodigo)) quienes.push(`código ${placa} de otro`);
        console.log(`   ⚠ placa repetida ${placa}: ${quienes.join(', ')} — no se toca`);
      }
      repetidos++;
      continue;
    }
    if (v.codigoInterno === placa && v.placa === placa) continue;

    const anterior = v.codigoAnterior ?? (v.codigoInterno !== placa ? v.codigoInterno : null);
    console.log(`   ${v.codigoInterno} → ${placa}${anterior && !v.codigoAnterior ? ` (anterior: ${anterior})` : ''}`);
    igualados++;
    if (escribir) {
      await db
        .update(vehiculos)
        .set({ codigoInterno: placa, placa, codigoAnterior: anterior })
        .where(and(eq(vehiculos.id, v.id), isNull(vehiculos.eliminadoEn)));
    }
  }
  console.log(`   ${igualados} ${escribir ? 'igualados' : 'por igualar'}; ${repetidos} con placa repetida sin tocar`);
  if (sinPlaca.length > 0) {
    console.log(`   Siguen sin placa (${sinPlaca.length}), con el aviso «Falta la placa»:`);
    for (const nombre of sinPlaca) console.log(`     · ${nombre}`);
  }
  console.log('');

  // ── 3. Bitácoras abiertas ──
  console.log('3. Máquinas de las bitácoras abiertas');
  const nombreDe = new Map(flota.map((v) => [v.id, identificacionDelVehiculo(v)]));
  const abiertas = await db
    .select({ id: partesDeObra.id, fecha: partesDeObra.fecha, maquinaria: partesDeObra.maquinaria })
    .from(partesDeObra)
    .where(and(isNull(partesDeObra.cerradoEn), isNull(partesDeObra.anuladoEn)));

  let partesTocados = 0;
  let maquinasTocadas = 0;
  for (const parte of abiertas) {
    let cambia = 0;
    const maquinaria = parte.maquinaria.map((m) => {
      const nombre = nombreDe.get(m.vehiculoId);
      if (!nombre || nombre === m.codigo) return m;
      cambia++;
      return { ...m, codigo: nombre };
    });
    if (cambia === 0) continue;
    partesTocados++;
    maquinasTocadas += cambia;
    if (escribir) {
      // Solo si sigue abierta: una que se cerró mientras tanto ya es evidencia.
      await db
        .update(partesDeObra)
        .set({ maquinaria })
        .where(and(eq(partesDeObra.id, parte.id), isNull(partesDeObra.cerradoEn)));
    }
  }
  console.log(
    `   ${maquinasTocadas} máquinas en ${partesTocados} de ${abiertas.length} bitácoras abiertas ${escribir ? 'actualizadas' : 'por actualizar'}\n`,
  );

  // Recuento final, para comparar con lo de arriba.
  const total = await db.select({ n: sql<number>`count(*)::int` }).from(vehiculos).where(isNull(vehiculos.eliminadoEn));
  const iguales = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(vehiculos)
    .where(and(isNull(vehiculos.eliminadoEn), sql`${vehiculos.codigoInterno} = ${vehiculos.placa}`));
  console.log(`Vehículos vigentes: ${total[0].n}; con código igual a la placa: ${iguales[0].n}`);
}

principal().catch((error) => {
  // 42703: falta una columna. Pasa si se corre antes de la migración 0031, que es la
  // que crea `codigo_anterior`; nada se escribió, porque la primera consulta es lectura.
  const codigo = (error as { cause?: { code?: string } })?.cause?.code;
  if (codigo === '42703') {
    console.error('\nFalta la migración 0031 en esta base: corra antes scripts/migrar-produccion.ts.');
  } else {
    console.error('\nFalló:', error);
  }
  process.exit(1);
});
