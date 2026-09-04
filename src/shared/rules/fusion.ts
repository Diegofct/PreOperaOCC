/**
 * Cómo se mezcla lo que baja del servidor con lo que ya hay en el teléfono.
 *
 * De las seis tablas que el celular replica, cinco se sobrescriben tal cual: el
 * servidor manda y el dispositivo no las toca. **`vehiculos` es la excepción**, y
 * por eso este archivo existe: el operador la muta durante la jornada —el
 * preoperacional avanza los medidores y puede poner la máquina en `no_apto`, la
 * bitácora avanza el horómetro al cerrar— y esas escrituras todavía no han
 * subido. Sobrescribir a ciegas las perdería.
 *
 * La regla que gobierna todo lo de abajo, y que vale la pena tener escrita:
 *
 *   **Poner en verde una máquina que el operador marcó roja es el peor error
 *   posible de este sistema.** Todo lo demás —una placa desactualizada, una
 *   marca mal escrita— se corrige solo en el pull siguiente. Eso no: manda a
 *   alguien a trabajar con una máquina que alguien inmovilizó.
 *
 * Funciones puras, sin I/O: `scripts/verificar-reglas.ts` las ejercita en Node
 * sin arrancar un teléfono ni una base.
 */

/** Lo que el teléfono tiene guardado de un vehículo. */
export interface VehiculoLocal {
  codigoInterno: string;
  placa: string | null;
  tipoVehiculoId: string;
  marca: string | null;
  modelo: string | null;
  obraId: string | null;
  odometroKm: number | null;
  horometroH: number | null;
  medidorActualizadoEn: number | null;
  estado: 'operativo' | 'en_mantenimiento' | 'fuera_servicio' | 'no_apto';
  eliminadoEn: number | null;
}

/** Lo mismo, tal como viene en la instantánea del servidor. */
export type VehiculoDelServidor = VehiculoLocal;

export interface ContextoDeFusion {
  /**
   * Hay un preoperacional de este vehículo que todavía no ha subido.
   *
   * Es la condición que protege el `no_apto` local: mientras el servidor no
   * sepa por qué la máquina está roja, no se le puede dejar decir que está bien.
   */
  hayCapturaSinSubir: boolean;
}

/**
 * Mezcla la fila del servidor con la local.
 *
 * Reparto de autoridad, campo por campo:
 *
 *  · **Catálogo** (código, placa, tipo, marca, modelo, obra): manda el servidor,
 *    siempre. Son datos que se editan desde el panel y el teléfono nunca toca.
 *
 *  · **Medidores**: gana el mayor de los dos, que es exactamente la misma regla
 *    que ya aplican `checklists/repositorio.ts` y `bitacoras/repositorio.ts` al
 *    capturar. Un medidor que retrocede es siempre un error, nunca un hecho, y
 *    aquí el caso normal es que el local vaya por delante: lo acaba de adelantar
 *    una lectura que todavía no ha subido.
 *
 *  · **Estado**: manda el servidor **salvo** que localmente esté en `no_apto` y
 *    quede una captura sin subir. Ver la regla de la cabecera.
 *
 *  · **Lápida**: manda el servidor. Un vehículo dado de baja se apaga aunque
 *    tenga capturas pendientes — la fila se conserva, que es lo que necesitan
 *    esos registros para no quedarse huérfanos.
 */
export function fusionarVehiculo(
  servidor: VehiculoDelServidor,
  local: VehiculoLocal | null,
  contexto: ContextoDeFusion = { hayCapturaSinSubir: false },
): VehiculoLocal {
  // Sin fila local no hay nada que preservar: es un vehículo nuevo para este
  // equipo.
  if (!local) return { ...servidor };

  const odometroKm = mayorMedidor(servidor.odometroKm, local.odometroKm);
  const horometroKm = mayorMedidor(servidor.horometroH, local.horometroH);

  const conservaNoApto = local.estado === 'no_apto' && contexto.hayCapturaSinSubir;

  return {
    codigoInterno: servidor.codigoInterno,
    placa: servidor.placa,
    tipoVehiculoId: servidor.tipoVehiculoId,
    marca: servidor.marca,
    modelo: servidor.modelo,
    obraId: servidor.obraId,
    odometroKm,
    horometroH: horometroKm,
    // Se queda la marca de tiempo del lado que aportó la lectura más alta: si el
    // teléfono va por delante, decir que el medidor se actualizó ahora mismo
    // desde el servidor sería falso.
    medidorActualizadoEn: marcaDelMedidor(servidor, local, odometroKm, horometroKm),
    estado: conservaNoApto ? 'no_apto' : servidor.estado,
    eliminadoEn: servidor.eliminadoEn,
  };
}

/** El mayor de los dos, tratando la ausencia como "no sé" y no como cero. */
export function mayorMedidor(a: number | null, b: number | null): number | null {
  if (a === null) return b;
  if (b === null) return a;
  return Math.max(a, b);
}

function marcaDelMedidor(
  servidor: VehiculoLocal,
  local: VehiculoLocal,
  odometroFinal: number | null,
  horometroFinal: number | null,
): number | null {
  const localAporta =
    (odometroFinal !== null && odometroFinal === local.odometroKm && odometroFinal !== servidor.odometroKm) ||
    (horometroFinal !== null && horometroFinal === local.horometroH && horometroFinal !== servidor.horometroH);

  if (localAporta) return local.medidorActualizadoEn;
  return servidor.medidorActualizadoEn ?? local.medidorActualizadoEn;
}
