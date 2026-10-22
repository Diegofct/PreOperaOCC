/**
 * Importar el presupuesto desde el Excel del formulario oficial (spec 031, RF-41 a
 * RF-46), o con IA si el Excel tiene otra forma (RF-74 a RF-87). **Solo servidor.**
 *
 * Primero el lector del formulario, que es exacto y gratis. Solo si no lo entiende, o
 * su valor no cuadra con el del Excel, se le pide la lectura a la IA (RF-74, RF-75). Lo
 * que devuelve la IA se guarda por la huella del archivo: confirmar o volver a subir el
 * mismo archivo usa esa lectura sin volver a llamarla (RF-84, RF-85).
 *
 * Dos pasos con el mismo archivo: primero la vista previa (qué se encontró y si el valor
 * cuadra con el «VALOR TOTAL»), y al confirmar se vuelve a leer y se crea el borrador.
 * El servidor lee las dos veces y manda él: no se crea nada con una estructura que haya
 * armado el navegador (plan, decisiones).
 *
 * ── Un doble clic no crea dos ──
 *
 * El id del borrador sale de la obra, del archivo y de la versión que le toca. Si el
 * mismo archivo se confirma dos veces seguidas, el segundo encuentra el primero y lo
 * devuelve. Otra versión más adelante, aun con el mismo archivo, es otra fila.
 */
import { eq } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

import { baseServidor } from '@/db/servidor/cliente';
import { presupuestoLecturasIa } from '@/db/servidor/esquema';
import type { PresupuestoDetalle } from '@/features/panel/contratos';
import type { PersonaEnSesion } from '@/features/servidor/guardia';
import { errorDePeticion } from '@/features/servidor/respuestas';
import { aHex } from '@/shared/cripto/formato-pbkdf2';
import { hojasDelPresupuesto, leerFormulario, type DiferenciaDeItem } from '@/shared/rules/formulario-presupuesto';
import {
  estructuraDeLaIa,
  FILAS_MAXIMAS_PARA_LA_IA,
  textoParaLaIa,
  type RechazadoPorIa,
} from '@/shared/rules/formulario-presupuesto-ia';
import { resumenDelPresupuesto, type ResumenDelPresupuesto } from '@/shared/rules/presupuesto';

import { leerConIa } from './leer-con-ia';
import { hojasDelLibro } from './leer-excel';
import { borradorDeLaObra, crearBorrador, detalleDe, siguienteVersion } from './presupuestos';

/** Lo que pesa de más un formulario: el de OCC, con 76 ítems, pesa unos 60 KB. */
const TAMANO_MAXIMO = 20 * 1024 * 1024;

export interface VistaPrevia {
  conteo: { grupos: number; capitulos: number; items: number; rubros: number };
  valor: number;
  valorDelExcel: number;
  cuadra: boolean;
  diferencias: DiferenciaDeItem[];
  resumen: ResumenDelPresupuesto;
  /** RF-82: quién lo leyó. */
  leidoPor: 'lector' | 'ia';
  /** RF-81: lo que la IA leyó y no está en la fila que citó. Vacío con el lector. */
  rechazados: RechazadoPorIa[];
  /** RF-89: los rubros, para mostrarlos bajo su grupo o en todo el contrato. */
  rubros: { id: string; grupoId: string | null; nombre: string; valor: number }[];
}

/** Un .xlsx es un ZIP: empieza por «PK». Más fiable que el tipo que diga el navegador. */
function pareceXlsx(contenido: Uint8Array): boolean {
  return contenido.length > 4 && contenido[0] === 0x50 && contenido[1] === 0x4b;
}

async function huellaDe(contenido: Uint8Array<ArrayBuffer>): Promise<string> {
  return aHex(new Uint8Array(await crypto.subtle.digest('SHA-256', contenido)));
}

/**
 * La lectura con IA de este archivo: la guardada si ya se leyó (RF-85), o una nueva que
 * se guarda (RF-84). Si dos personas suben el mismo archivo a la vez, las dos pagan
 * pero queda guardada una.
 */
async function lecturaDeIa(sesion: PersonaEnSesion, huella: string, textoDeLaHoja: string) {
  const [guardada] = await baseServidor()
    .select({ lectura: presupuestoLecturasIa.lectura })
    .from(presupuestoLecturasIa)
    .where(eq(presupuestoLecturasIa.huella, huella))
    .limit(1);
  if (guardada) return { ok: true as const, lectura: guardada.lectura };
  const nueva = await leerConIa(textoDeLaHoja);
  if (!nueva.ok) return nueva;
  await baseServidor()
    .insert(presupuestoLecturasIa)
    .values({
      huella,
      lectura: nueva.lectura,
      modelo: nueva.modelo,
      tokensEntrada: nueva.tokensEntrada,
      tokensSalida: nueva.tokensSalida,
      creadoPor: sesion.id,
    })
    .onConflictDoNothing();
  return nueva;
}

async function leer(sesion: PersonaEnSesion, contenido: Uint8Array<ArrayBuffer>) {
  if (contenido.byteLength === 0) return errorDePeticion('El archivo llegó vacío.', 422);
  if (contenido.byteLength > TAMANO_MAXIMO) return errorDePeticion('El archivo pesa más de 20 MB.', 413);
  if (!pareceXlsx(contenido)) {
    return errorDePeticion('Ese archivo no es un Excel (.xlsx). Si es un .xls viejo, guárdelo como .xlsx.', 422);
  }
  let hojas;
  try {
    hojas = await hojasDelLibro(contenido.buffer);
  } catch {
    return errorDePeticion('No pude abrir el archivo como Excel. Revise que no esté dañado ni protegido.', 422);
  }
  const huella = await huellaDe(contenido);
  const delLector = leerFormulario(hojas, uuidv7);
  if (delLector.ok && delLector.cuadra) return { ...delLector, huella, leidoPor: 'lector' as const, rechazados: [] };

  // RF-74: el lector no lo entendió o no cuadra; le toca a la IA.
  const paraLaIa = textoParaLaIa(hojas);
  if (!paraLaIa) {
    // Lo que el lector sí leyó, aunque no cuadre, se crea marcado para revisar (RF-44).
    if (delLector.ok) return { ...delLector, huella, leidoPor: 'lector' as const, rechazados: [] };
    // Con la hoja del presupuesto, es que pasa del tope (RF-77); sin ella, lo que dijo el lector (RF-46).
    return errorDePeticion(
      hojasDelPresupuesto(hojas).length > 0
        ? `La hoja del presupuesto pasa de ${FILAS_MAXIMAS_PARA_LA_IA} filas y no se puede leer con IA. Deje en el archivo solo la hoja del presupuesto y vuelva a subirlo.`
        : delLector.error,
      422,
    );
  }
  const lectura = await lecturaDeIa(sesion, huella, paraLaIa.texto);
  if (!lectura.ok) return errorDePeticion(`No se pudo leer con IA: ${lectura.error} Puede reintentarlo.`, 503);
  const conIa = estructuraDeLaIa(lectura.lectura, hojas, uuidv7);
  return conIa.ok ? { ...conIa, huella, leidoPor: 'ia' as const } : errorDePeticion(conIa.error, 422);
}

/** El id del borrador que crea este archivo en esa versión de la obra. */
async function idDeLaImportacion(obraId: string, version: number, huellaDelArchivo: string): Promise<string> {
  const texto = new TextEncoder().encode(`${obraId}|${version}|${huellaDelArchivo}`);
  return `xlsx-${aHex(new Uint8Array(await crypto.subtle.digest('SHA-256', texto))).slice(0, 32)}`;
}

/** La vista previa (RF-43 a RF-45): no escribe nada. */
export async function vistaPrevia(
  sesion: PersonaEnSesion,
  contenido: Uint8Array<ArrayBuffer>,
): Promise<VistaPrevia | Response> {
  const leido = await leer(sesion, contenido);
  if (leido instanceof Response) return leido;
  return {
    conteo: leido.conteo,
    valor: leido.valor,
    valorDelExcel: leido.valorDelExcel,
    cuadra: leido.cuadra,
    diferencias: leido.diferencias,
    resumen: resumenDelPresupuesto(leido.estructura),
    leidoPor: leido.leidoPor,
    rechazados: leido.rechazados,
    rubros: leido.estructura.rubros.map((r) => ({ id: r.id, grupoId: r.grupoId, nombre: r.nombre, valor: r.valor })),
  };
}

/**
 * Crea el borrador (RF-41). Marcado para revisar si el valor no cuadra o algún ítem traía
 * un total distinto (RF-44, RF-45). Devuelve `creado: false` cuando era un doble clic.
 */
export async function importarPresupuesto(
  sesion: PersonaEnSesion,
  obraId: string,
  nombre: string,
  contenido: Uint8Array<ArrayBuffer>,
): Promise<{ presupuesto: PresupuestoDetalle; creado: boolean } | Response> {
  const leido = await leer(sesion, contenido);
  if (leido instanceof Response) return leido;

  const { huella } = leido;
  // El doble clic: el borrador abierto es este mismo archivo, recién creado.
  const abierto = await borradorDeLaObra(obraId);
  if (abierto && abierto.id === (await idDeLaImportacion(obraId, abierto.numeroVersion, huella))) {
    return { presupuesto: detalleDe(abierto), creado: false };
  }
  const id = await idDeLaImportacion(obraId, await siguienteVersion(obraId), huella);

  const creado = await crearBorrador(sesion, obraId, {
    id,
    nombre,
    estructura: leido.estructura,
    origen: leido.leidoPor === 'ia' ? 'excel_ia' : 'excel',
    valorExcel: leido.valorDelExcel,
    // RF-83: lo que leyó la IA siempre se revisa.
    revisar: leido.leidoPor === 'ia' || !leido.cuadra || leido.diferencias.length > 0,
  });
  return creado instanceof Response ? creado : { presupuesto: creado, creado: true };
}
