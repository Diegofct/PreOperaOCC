/**
 * Cómo se identifica un vehículo o una máquina (spec 032).
 *
 * Desde esta spec el equipo se nombra por su placa, como se nombra en la obra; la
 * maquinaria amarilla que no tiene placa usa su número de serie en el mismo campo.
 * El código interno no desaparece de la base —el celular lo lee y el índice único
 * vive sobre él—, pero pasa a **ser** la placa normalizada, así que ya no se muestra.
 *
 * Puro y sin I/O, como toda regla, para poder comprobarlo desde Node.
 */

/**
 * La placa como se guarda (RF-11): mayúsculas, solo letras y cifras. «tay-076» y
 * « TAY 076 » son `TAY076`, la misma placa, y así el índice único no deja pasar las
 * dos (RF-10). Vacía es `null`: un vehículo sin placa, no uno con placa «».
 */
export function normalizarPlaca(texto: string | null | undefined): string | null {
  const limpia = (texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  return limpia === '' ? null : limpia;
}

/** Lo que hace falta de un vehículo para nombrarlo. */
export interface VehiculoNombrable {
  placa: string | null;
  /** El nombre del tipo de equipo: «Motoniveladora». */
  tipo?: string | null;
  marca?: string | null;
  modelo?: string | null;
}

export const AVISO_FALTA_PLACA = 'Falta la placa';

/**
 * El nombre con el que se muestra el equipo en todas las listas (RF-13, RF-20).
 *
 * Con placa, la placa. Sin ella —las máquinas que crea WhatsApp (RF-20a) o las que
 * quedaron sin placa al migrar—, su descripción con el aviso, para que se vea que
 * hay que escribirla y aun así se sepa de qué máquina se habla. El modelo de las
 * creadas por WhatsApp suele repetir el tipo y la marca («Motoniveladora Komatsu
 * alquilada GD555»): lo que el modelo ya dice no se antepone.
 */
export function identificacionDelVehiculo(v: VehiculoNombrable): string {
  const placa = normalizarPlaca(v.placa);
  if (placa) return placa;

  const modelo = v.modelo?.trim() ?? '';
  // Sin tildes, espacios ni la última letra (plural o género), como `tipoDeEquipo`:
  // «Vibro Compactadora» ya está dicho en «Vibrócompactador Volvo».
  const enModelo = normalizarPlaca(modelo) ?? '';
  const yaLoDice = (texto: string) => {
    const t = normalizarPlaca(texto) ?? '';
    return t !== '' && (enModelo.includes(t) || (t.length > 4 && enModelo.includes(t.slice(0, -1))));
  };
  const partes = [v.tipo?.trim() ?? '', v.marca?.trim() ?? '']
    .filter((p) => p !== '' && !yaLoDice(p))
    .concat(modelo === '' ? [] : [modelo]);
  const descripcion = partes.length > 0 ? partes.join(' ') : 'Equipo';
  return `${descripcion} · ${AVISO_FALTA_PLACA}`;
}

/** Lo mismo para una fila del panel, que trae el tipo como `tipoNombre`. */
export function identificacionDeFila(v: {
  placa: string | null;
  tipoNombre?: string | null;
  marca?: string | null;
  modelo?: string | null;
}): string {
  return identificacionDelVehiculo({ placa: v.placa, tipo: v.tipoNombre, marca: v.marca, modelo: v.modelo });
}
