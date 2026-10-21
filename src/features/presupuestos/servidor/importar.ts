/**
 * Importar el presupuesto desde el Excel del formulario oficial (spec 031, RF-41 a
 * RF-46). **Solo servidor.**
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
import { uuidv7 } from 'uuidv7';

import type { PresupuestoDetalle } from '@/features/panel/contratos';
import type { PersonaEnSesion } from '@/features/servidor/guardia';
import { errorDePeticion } from '@/features/servidor/respuestas';
import { aHex } from '@/shared/cripto/formato-pbkdf2';
import { leerFormulario, type DiferenciaDeItem } from '@/shared/rules/formulario-presupuesto';
import { resumenDelPresupuesto, type ResumenDelPresupuesto } from '@/shared/rules/presupuesto';

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
}

/** Un .xlsx es un ZIP: empieza por «PK». Más fiable que el tipo que diga el navegador. */
function pareceXlsx(contenido: Uint8Array): boolean {
  return contenido.length > 4 && contenido[0] === 0x50 && contenido[1] === 0x4b;
}

async function leer(contenido: Uint8Array<ArrayBuffer>) {
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
  const leido = leerFormulario(hojas, uuidv7);
  return leido.ok ? leido : errorDePeticion(leido.error, 422);
}

/** El id del borrador que crea este archivo en esa versión de la obra. */
async function idDeLaImportacion(obraId: string, version: number, huellaDelArchivo: string): Promise<string> {
  const texto = new TextEncoder().encode(`${obraId}|${version}|${huellaDelArchivo}`);
  return `xlsx-${aHex(new Uint8Array(await crypto.subtle.digest('SHA-256', texto))).slice(0, 32)}`;
}

/** La vista previa (RF-43 a RF-45): no escribe nada. */
export async function vistaPrevia(contenido: Uint8Array<ArrayBuffer>): Promise<VistaPrevia | Response> {
  const leido = await leer(contenido);
  if (leido instanceof Response) return leido;
  return {
    conteo: leido.conteo,
    valor: leido.valor,
    valorDelExcel: leido.valorDelExcel,
    cuadra: leido.cuadra,
    diferencias: leido.diferencias,
    resumen: resumenDelPresupuesto(leido.estructura),
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
  const leido = await leer(contenido);
  if (leido instanceof Response) return leido;

  const huella = aHex(new Uint8Array(await crypto.subtle.digest('SHA-256', contenido)));
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
    origen: 'excel',
    valorExcel: leido.valorDelExcel,
    revisar: !leido.cuadra || leido.diferencias.length > 0,
  });
  return creado instanceof Response ? creado : { presupuesto: creado, creado: true };
}
