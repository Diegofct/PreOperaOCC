/**
 * Acceso a datos del preoperacional. Todo contra SQLite: ninguna de estas
 * funciones toca la red ni puede fallar por falta de señal.
 */
import { and, desc, eq, gte, isNotNull, isNull, ne, or } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

import { db } from '@/db/local/client';
import {
  asignaciones,
  media,
  obras,
  plantillas,
  preoperacionales,
  tiposVehiculo,
  vehiculos,
  type EstadoSync,
} from '@/db/local/schema';
import { drenarEnSegundoPlano } from '@/features/sync/motor';
import { encolar } from '@/features/sync/outbox';
import { desfaseDeReloj } from '@/features/sync/reloj';
import {
  borradorCaduco,
  estadoDelDia,
  periodicidadesAplicables,
  type EstadoDelDia,
  type FirmaDelDia,
} from '@/shared/rules/inspeccion';
import { fechaDeJornada } from '@/shared/rules/jornada';

import type {
  Periodicidad,
  PlantillaChecklist,
  RespuestaItem,
  ResultadoPreoperacional,
} from './types';

export interface VehiculoAsignado {
  id: string;
  codigoInterno: string;
  placa: string | null;
  marca: string | null;
  modelo: string | null;
  tipoVehiculoId: string;
  tipoNombre: string;
  obraId: string | null;
  obraNombre: string | null;
  odometroKm: number | null;
  horometroH: number | null;
  estado: string;
}

const COLUMNAS_VEHICULO = {
  id: vehiculos.id,
  codigoInterno: vehiculos.codigoInterno,
  placa: vehiculos.placa,
  marca: vehiculos.marca,
  modelo: vehiculos.modelo,
  tipoVehiculoId: vehiculos.tipoVehiculoId,
  tipoNombre: tiposVehiculo.nombre,
  obraId: vehiculos.obraId,
  obraNombre: obras.nombre,
  odometroKm: vehiculos.odometroKm,
  horometroH: vehiculos.horometroH,
  estado: vehiculos.estado,
} as const;

export interface VehiculoDelOperador extends VehiculoAsignado {
  asignacionId: string;
  origen: 'supervisor' | 'autoasignada';
  desde: number;
}

/**
 * Los vehículos que el operador tiene asignados hoy. Es la consulta del
 * arranque de la app, resuelta por `ix_asignaciones_usuario`.
 *
 * Devuelve una lista y no un solo vehículo porque la realidad de OCC es que un
 * operador cambia de máquina: puede tener varias vigentes a la vez.
 */
export async function asignacionesVigentesDe(usuarioId: string): Promise<VehiculoDelOperador[]> {
  return db
    .select({
      ...COLUMNAS_VEHICULO,
      asignacionId: asignaciones.id,
      origen: asignaciones.origen,
      desde: asignaciones.desde,
    })
    .from(asignaciones)
    .innerJoin(vehiculos, eq(asignaciones.vehiculoId, vehiculos.id))
    .innerJoin(tiposVehiculo, eq(vehiculos.tipoVehiculoId, tiposVehiculo.id))
    .leftJoin(obras, eq(vehiculos.obraId, obras.id))
    .where(
      and(
        eq(asignaciones.usuarioId, usuarioId),
        isNull(asignaciones.hasta),
        // Un vehículo dado de baja no le aparece al operador aunque la
        // asignación siga abierta. Sin este filtro, una máquina que la
        // administración retiró seguiría ofreciéndose para inspeccionar.
        isNull(vehiculos.eliminadoEn),
      ),
    )
    .orderBy(desc(asignaciones.desde));
}

export async function vehiculoPorId(vehiculoId: string): Promise<VehiculoAsignado | null> {
  const filas = await db
    .select(COLUMNAS_VEHICULO)
    .from(vehiculos)
    .innerJoin(tiposVehiculo, eq(vehiculos.tipoVehiculoId, tiposVehiculo.id))
    .leftJoin(obras, eq(vehiculos.obraId, obras.id))
    .where(eq(vehiculos.id, vehiculoId))
    .limit(1);

  return filas[0] ?? null;
}

export async function plantillaDeTipo(
  tipoVehiculoId: string,
): Promise<{ plantilla: PlantillaChecklist; hash: string } | null> {
  const filas = await db
    .select({ esquema: plantillas.esquema, hash: plantillas.hash })
    .from(plantillas)
    .where(eq(plantillas.tipoVehiculoId, tipoVehiculoId))
    .orderBy(desc(plantillas.version))
    .limit(1);

  const fila = filas[0];
  return fila ? { plantilla: fila.esquema, hash: fila.hash } : null;
}

/** Cuándo se hizo por última vez cada revisión periódica de este vehículo. */
async function ultimasRevisiones(vehiculoId: string) {
  const filas = await db
    .select({ periodicidades: preoperacionales.periodicidades, enviadoEn: preoperacionales.enviadoEn })
    .from(preoperacionales)
    .where(eq(preoperacionales.vehiculoId, vehiculoId))
    .orderBy(desc(preoperacionales.iniciadoEn))
    .limit(60);

  let quincenal: number | null = null;
  let mensual: number | null = null;
  for (const fila of filas) {
    if (!fila.enviadoEn) continue;
    const p = fila.periodicidades as Periodicidad[];
    if (quincenal === null && p.includes('quincenal')) quincenal = fila.enviadoEn;
    if (mensual === null && p.includes('mensual')) mensual = fila.enviadoEn;
    if (quincenal !== null && mensual !== null) break;
  }
  return { quincenal, mensual };
}

/**
 * Qué máquinas de este operador ya tienen su preoperacional de hoy.
 *
 * Devuelve una entrada por cada vehículo que se pregunte, para que quien la
 * llame no tenga que distinguir entre "no toca" y "no vino en el mapa".
 *
 * ── Por qué 48 horas y no "desde la medianoche" ──
 *
 * Quien decide qué cae dentro del día es `estadoDelDia`, con `fechaDeJornada`.
 * Esta ventana solo está para no leer la tabla entera, así que se toma ancha a
 * propósito: la jornada dura 24 horas, el corte de Colombia mueve otras cinco y
 * el reloj de un teléfono puede ir corrido. Calcular aquí el inicio exacto del
 * día sería repetir la regla en un segundo sitio —y si los dos cálculos
 * discreparan, el que manda sería el equivocado.
 *
 * Sin índice por `usuario_id`, igual que `historialDe`: en el teléfono de un
 * operador esta tabla tiene cientos de filas y la ventana deja unas pocas.
 */
export async function estadoDelDiaDe(
  usuarioId: string,
  vehiculoIds: readonly string[],
): Promise<Map<string, EstadoDelDia>> {
  const desde = Date.now() - 48 * 60 * 60 * 1000;

  const filas = await db
    .select({
      usuarioId: preoperacionales.usuarioId,
      vehiculoId: preoperacionales.vehiculoId,
      enviadoEn: preoperacionales.enviadoEn,
      resultado: preoperacionales.resultado,
    })
    .from(preoperacionales)
    .where(
      and(
        eq(preoperacionales.usuarioId, usuarioId),
        // Solo lo firmado revisa una máquina: un borrador no ha revisado nada.
        isNotNull(preoperacionales.enviadoEn),
        gte(preoperacionales.enviadoEn, desde),
      ),
    );

  const firmados: FirmaDelDia[] = [];
  for (const fila of filas) {
    // `enviadoEn` y `resultado` son nulos mientras el registro es un borrador.
    // La consulta ya descartó los que no se enviaron; esto es lo que convierte
    // esa certeza en un tipo sin `as`.
    if (fila.enviadoEn === null || fila.resultado === null) continue;
    firmados.push({
      usuarioId: fila.usuarioId,
      vehiculoId: fila.vehiculoId,
      enviadoEn: fila.enviadoEn,
      resultado: fila.resultado,
    });
  }

  const hoy = fechaDeJornada();
  return new Map(
    vehiculoIds.map((vehiculoId) => [
      vehiculoId,
      estadoDelDia({ usuarioId, vehiculoId, hoy }, firmados),
    ]),
  );
}

export interface Borrador {
  id: string;
  /**
   * Quién lo está llenando y desde cuándo. No son adorno: desde la spec 013 la
   * fila no existe hasta el primer dato, así que el borrador tiene que llevar
   * encima todo lo que hace falta para insertarla más tarde.
   */
  usuarioId: string;
  iniciadoEn: number;
  vehiculo: VehiculoAsignado;
  plantilla: PlantillaChecklist;
  plantillaHash: string;
  periodicidades: Periodicidad[];
  respuestas: RespuestaItem[];
  odometroKm: number | null;
  horometroH: number | null;
  observaciones: string;
  /**
   * Se descartó un borrador anterior porque su formato ya no es el vigente, y
   * este es uno nuevo (spec 011, RF-27). La pantalla lo dice: si no, el operador
   * ve su formulario en blanco y cree que la app le perdió el trabajo.
   */
  formatoCambio?: boolean;
}

/**
 * Lo que se encuentra al abrir el formulario de una máquina.
 *
 * Tres desenlaces, y ninguno es un `null` que haya que interpretar: o hay
 * formulario que llenar, o esa máquina ya se revisó hoy, o su tipo de equipo
 * todavía no tiene formato cargado.
 */
export type AperturaDelFormulario =
  | { tipo: 'borrador'; borrador: Borrador }
  | { tipo: 'ya_hecho'; hechoEn: number; resultado: ResultadoPreoperacional }
  | { tipo: 'sin_formato' };

/**
 * Devuelve el borrador del día para ese vehículo, o prepara uno nuevo.
 *
 * Retomar el borrador es lo que hace que Android pueda matar la app a mitad
 * del formulario sin que el operador pierda nada.
 *
 * ── Prepara, no inserta (spec 013, RF-13) ──
 *
 * Hasta esta spec, entrar a la pantalla insertaba la fila. Entrar a mirar y
 * salir dejaba un «Sin terminar» en el historial del operador, sobre una máquina
 * que a lo mejor ya estaba revisada y firmada — trabajo pendiente que no existe
 * y que él no podía quitar. Ahora el registro nace con el primer dato, en
 * `registrarSiHaceFalta`.
 *
 * El id se sigue generando aquí, y sigue siendo el definitivo: las fotos pueden
 * colgar de él antes de que la fila exista.
 *
 * ── Y dice que no cuando la máquina ya se revisó hoy (RF-8) ──
 *
 * Es la red de seguridad: el inicio y la lista de vehículos ya esconden el
 * botón, pero a esta pantalla se puede llegar por un enlace directo o por un
 * `router.replace` que se quedó en el historial de navegación. Se comprueba
 * **antes** de mirar si hay un borrador a medio llenar: si el operador ya firmó
 * hoy el de esa máquina, terminar un borrador viejo produciría un segundo acta
 * del mismo día, que es exactamente lo que RF-1 prohíbe. El borrador no se toca
 * ni se descarta; sigue donde está y reaparece mañana.
 */
export async function abrirBorrador(
  usuarioId: string,
  vehiculo: VehiculoAsignado,
): Promise<AperturaDelFormulario> {
  const encontrada = await plantillaDeTipo(vehiculo.tipoVehiculoId);
  if (!encontrada) return { tipo: 'sin_formato' };

  const estado = (await estadoDelDiaDe(usuarioId, [vehiculo.id])).get(vehiculo.id);
  if (estado && !estado.toca) {
    return { tipo: 'ya_hecho', hechoEn: estado.hechoEn, resultado: estado.resultado };
  }

  const existentes = await db
    .select()
    .from(preoperacionales)
    .where(
      and(
        eq(preoperacionales.vehiculoId, vehiculo.id),
        eq(preoperacionales.usuarioId, usuarioId),
        eq(preoperacionales.estadoSync, 'borrador' satisfies EstadoSync),
      ),
    )
    .orderBy(desc(preoperacionales.iniciadoEn))
    .limit(1);

  const existente = existentes[0];
  // Un borrador empezado con otro formato no se retoma: se descarta y se abre
  // uno nuevo, porque seguir llenándolo daría un acta que mezcla dos formatos
  // (spec 011, RF-27 y RF-28). Baja lógica: aquí no se borra nada.
  const caduco =
    existente !== undefined &&
    borradorCaduco(existente.plantillaVersion, encontrada.plantilla.version);

  if (caduco) {
    await db
      .update(preoperacionales)
      .set({ estadoSync: 'descartado' satisfies EstadoSync, actualizadoEn: Date.now() })
      .where(eq(preoperacionales.id, existente.id));
  }

  if (existente && !caduco) {
    return {
      tipo: 'borrador',
      borrador: {
        id: existente.id,
        usuarioId,
        iniciadoEn: existente.iniciadoEn,
        vehiculo,
        plantilla: encontrada.plantilla,
        plantillaHash: existente.plantillaHash,
        periodicidades: existente.periodicidades as Periodicidad[],
        respuestas: existente.respuestas,
        odometroKm: existente.odometroKm,
        horometroH: existente.horometroH,
        observaciones: existente.observaciones ?? '',
      },
    };
  }

  const ultimas = await ultimasRevisiones(vehiculo.id);
  const periodicidades = periodicidadesAplicables(Date.now(), encontrada.plantilla, ultimas);

  return {
    tipo: 'borrador',
    borrador: {
      formatoCambio: caduco,
      id: uuidv7(),
      usuarioId,
      iniciadoEn: Date.now(),
      vehiculo,
      plantilla: encontrada.plantilla,
      plantillaHash: encontrada.hash,
      periodicidades,
      respuestas: [],
      odometroKm: null,
      horometroH: null,
      observaciones: '',
    },
  };
}

/**
 * Inserta la fila del preoperacional si todavía no existe.
 *
 * **Idempotente a propósito, sin bandera de "ya existe".** Llevar un booleano en
 * el `Borrador` obligaría a mutarlo o a subirlo al estado de React, y sobre todo
 * se puede olvidar: una ruta de escritura futura que no lo consultara haría un
 * `UPDATE` sobre una fila inexistente, y en SQLite eso **no falla** —afecta a
 * cero filas y el trabajo del operador se pierde en silencio—. Una sentencia de
 * más en una base local es gratis; un guardado que no guarda es el peor fallo
 * posible de esta pantalla.
 *
 * Por eso también la llama `guardarBorrador` por dentro: así ningún camino que
 * escriba puede saltársela. La única excepción es la foto, que no pasa por ahí.
 */
export async function registrarSiHaceFalta(borrador: Borrador) {
  await db
    .insert(preoperacionales)
    .values({
      id: borrador.id,
      vehiculoId: borrador.vehiculo.id,
      usuarioId: borrador.usuarioId,
      obraId: borrador.vehiculo.obraId,
      plantillaTipoVehiculo: borrador.plantilla.tipoVehiculo,
      plantillaVersion: borrador.plantilla.version,
      plantillaHash: borrador.plantillaHash,
      periodicidades: borrador.periodicidades,
      iniciadoEn: borrador.iniciadoEn,
      respuestas: [],
      estadoSync: 'borrador',
    })
    .onConflictDoNothing();
}

/**
 * Autoguardado. Se llama en cada respuesta; escribir en SQLite es barato.
 *
 * Recibe el borrador entero, y no solo su id, porque desde la spec 013 la fila
 * puede no existir todavía: este es el momento en que nace.
 */
export async function guardarBorrador(
  borrador: Borrador,
  cambios: {
    respuestas?: RespuestaItem[];
    odometroKm?: number | null;
    horometroH?: number | null;
    observaciones?: string;
  },
) {
  await registrarSiHaceFalta(borrador);
  await db
    .update(preoperacionales)
    .set({ ...cambios, actualizadoEn: Date.now() })
    .where(eq(preoperacionales.id, borrador.id));
}

/**
 * Cierra el preoperacional y lo pone en la cola de salida.
 *
 * A partir de aquí el registro es inmutable: corregirlo se hace desde el
 * dashboard anulándolo, nunca sobrescribiéndolo. Un preoperacional firmado es
 * evidencia, y editarlo después sería falsear un documento.
 */
export async function cerrarPreoperacional(
  id: string,
  datos: {
    resultado: ResultadoPreoperacional;
    cantidadInmovilizantes: number;
    respuestas: RespuestaItem[];
    odometroKm: number | null;
    horometroH: number | null;
    observaciones: string;
    firmaOperadorMediaId: string;
    fotoHorometroMediaId: string | null;
  },
) {
  const enviadoEn = Date.now();
  // Se anota cuánto va corrido el reloj de este equipo respecto al servidor. No
  // se corrige la hora: la que queda guardada tiene que ser la misma que el
  // operador vio en su pantalla al firmar. Ver `@/features/sync/reloj`.
  const desfaseRelojMs = await desfaseDeReloj();

  await db
    .update(preoperacionales)
    .set({ ...datos, enviadoEn, desfaseRelojMs, estadoSync: 'pendiente', actualizadoEn: enviadoEn })
    .where(eq(preoperacionales.id, id));

  const [preop] = await db
    .select()
    .from(preoperacionales)
    .where(eq(preoperacionales.id, id))
    .limit(1);

  if (!preop) return;

  // A la cola de salida antes que cualquier otra cosa. Si la app muere en el
  // siguiente milisegundo, el registro ya está encolado y no se pierde.
  await encolar('preoperacional', id, preop);

  const evidencias = await db
    .select({ id: media.id })
    .from(media)
    .where(and(eq(media.duenoTipo, 'preoperacional'), eq(media.duenoId, id)));

  for (const evidencia of evidencias) {
    await encolar('media', evidencia.id, { id: evidencia.id, duenoId: id });
  }

  // Y se intenta subir ya, sin esperar. Firmar es el momento de la jornada con
  // más probabilidad de señal —el operador acaba de terminar, mirando el
  // teléfono— y hasta ahora era el único que no disparaba nada: el registro se
  // quedaba en la cola hasta el siguiente arranque de sesión aunque hubiera
  // WiFi delante. Si no hay red no pasa nada; la cola sigue intacta.
  drenarEnSegundoPlano();

  // Los medidores del vehículo solo avanzan. Un valor menor ya se rechazó al
  // capturarlo; aquí se protege el caso de dos registros fuera de orden.
  const [vehiculo] = await db
    .select({ odometroKm: vehiculos.odometroKm, horometroH: vehiculos.horometroH })
    .from(vehiculos)
    .where(eq(vehiculos.id, preop.vehiculoId))
    .limit(1);

  if (vehiculo) {
    await db
      .update(vehiculos)
      .set({
        odometroKm: Math.max(datos.odometroKm ?? 0, vehiculo.odometroKm ?? 0) || null,
        horometroH: Math.max(datos.horometroH ?? 0, vehiculo.horometroH ?? 0) || null,
        medidorActualizadoEn: enviadoEn,
        ...(datos.resultado === 'no_apto' ? { estado: 'no_apto' as const } : {}),
      })
      .where(eq(vehiculos.id, preop.vehiculoId));
  }
}

/**
 * Los últimos preoperacionales de este operador, para su historial.
 *
 * **Deja fuera los borradores que nadie llegó a llenar** (spec 013, RF-17).
 * Hasta esta spec, abrir el formulario y salir dejaba una fila vacía que el
 * historial mostraba como «Sin terminar»: trabajo pendiente que no existe,
 * sobre una máquina que a lo mejor ya estaba revisada y firmada, y que el
 * operador no tenía forma de quitar.
 *
 * Se **esconden, no se borran**: nada se borra en este proyecto, y además esto
 * es lo único que arregla las filas vacías que ya están en los teléfonos —la
 * spec deja fuera de alcance repararlas, pero no hay razón para seguir
 * enseñándolas—.
 *
 * El filtro es deliberadamente estrecho: solo cae lo que es **borrador** y
 * además tiene las respuestas vacías. Un registro ya enviado no lo toca nunca,
 * pase lo que pase con su contenido.
 */
export async function historialDe(usuarioId: string, limite = 50) {
  return db
    .select({
      id: preoperacionales.id,
      vehiculoId: preoperacionales.vehiculoId,
      codigoInterno: vehiculos.codigoInterno,
      iniciadoEn: preoperacionales.iniciadoEn,
      enviadoEn: preoperacionales.enviadoEn,
      resultado: preoperacionales.resultado,
      cantidadInmovilizantes: preoperacionales.cantidadInmovilizantes,
      estadoSync: preoperacionales.estadoSync,
    })
    .from(preoperacionales)
    .innerJoin(vehiculos, eq(preoperacionales.vehiculoId, vehiculos.id))
    .where(
      and(
        eq(preoperacionales.usuarioId, usuarioId),
        // "Ni borrador ni vacío": o ya no es un borrador, o alguien escribió
        // algo en él. Lo que cae es solo la intersección de las dos cosas.
        or(
          ne(preoperacionales.estadoSync, 'borrador' satisfies EstadoSync),
          ne(preoperacionales.respuestas, []),
        ),
      ),
    )
    .orderBy(desc(preoperacionales.iniciadoEn))
    .limit(limite);
}
