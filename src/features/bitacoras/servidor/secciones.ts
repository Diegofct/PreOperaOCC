/**
 * Cómo se valida y se construye cada sección del parte en el servidor.
 *
 * Vivía dentro de `PATCH /api/panel/partes/:id`. Salió de ahí con la spec 021,
 * porque desde entonces el parte se escribe por **dos** caminos: el formulario del
 * panel y la aprobación de un reporte de WhatsApp. RF-59 exige que lo aprobado
 * pase las mismas validaciones que lo escrito a mano, y la única forma de que no
 * se separen con el tiempo es que sean las mismas funciones, no dos copias.
 *
 * Cada función recibe lo pedido y devuelve las filas listas para guardar, o el
 * mensaje del primer rechazo —el mismo texto que respondía la ruta—. No escriben
 * nada: quien llama decide qué hace con el resultado.
 *
 * Solo servidor: consultan la base para poner los nombres (constitución 6).
 */
import { and, eq, inArray, isNull } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { tiposVehiculo, usuarios, vehiculos } from '@/db/servidor/esquema';
import {
  conservarHeredadas,
  construirActividadDelParte,
  construirEnsayo,
  construirFranja,
  construirMaquina,
  construirPersona,
  esActividadHeredada,
  esMaterialHeredado,
  rechazoDelEnsayo,
  type ActividadPedida,
  type EnsayoPedido,
  type FranjaPedida,
  type MaquinaPedida,
  type PersonaPedida,
} from '@/features/bitacoras/parte';
import {
  esEnsayo,
  type OrigenWhatsapp,
  type ActividadDelParte,
  type FilaDeControlDeCalidad,
  type FranjaDeClima,
  type MaquinaDelParte,
  type PersonaDelParte,
} from '@/features/bitacoras/tipos';
import { mensajeDeFranja, mensajeDePersona, validarFranjas, validarPersonaDelParte } from '@/shared/rules/horas';
import { medidorDeClase, mensajeDeAvance, validarAvance } from '@/shared/rules/jornada';

/** Las filas de la sección, o por qué no se pueden guardar. */
export type Seccion<T> = { filas: T[] } | { error: string };

/**
 * Lo que vino de WhatsApp sigue diciéndolo después de guardarse a mano (spec 021,
 * RF-46 a RF-48).
 *
 * Cada guardado reconstruye las filas de la sección con `construir*`, que no sabe
 * de dónde vinieron: sin esto, corregir una hora borraba la marca «desde WhatsApp»
 * de toda la sección. La fila nueva hereda el `origen` de la guardada que es «la
 * misma» —la misma máquina, la misma persona, el mismo id, o el mismo renglón del
 * clima—. Corregida a mano, sigue siendo la que se aprobó desde ese mensaje.
 */
export function conservarOrigen<T extends object>(
  filas: readonly T[],
  guardadas: readonly object[],
  laMisma: (nueva: T, guardada: object, indice: number) => boolean,
): T[] {
  // `indice` es el renglón de la guardada si coincide con el de la nueva, o -1:
  // así el clima, que no tiene otra forma de decir «la misma», compara posiciones.
  const origenDe = (g: object) => ('origen' in g ? (g.origen as OrigenWhatsapp | undefined) : undefined);
  return filas.map((fila, indice) => {
    const guardada = guardadas.find((g, i) => origenDe(g) && laMisma(fila, g, indice === i ? i : -1));
    const origen = guardada ? origenDe(guardada) : undefined;
    return origen ? { ...fila, origen } : fila;
  });
}

/**
 * La maquinaria (spec 004, RF-9 a RF-15, RF-43, RF-45; spec 021, RF-73).
 *
 * El medidor sale del tipo del equipo, no de lo que diga el navegador: una
 * camioneta se controla por kilómetros y una retroexcavadora por horas de motor,
 * y pedirle a la camioneta horas de motor es pedirle un dato que su tablero no da.
 */
export async function maquinariaDelParte(
  pedidas: readonly MaquinaPedida[],
  obraId: string,
): Promise<Seccion<MaquinaDelParte>> {
  const db = baseServidor();
  const ids = pedidas.map((m) => m.vehiculoId);
  if (new Set(ids).size !== ids.length) {
    return { error: 'Una máquina no puede estar dos veces en la misma bitácora.' };
  }

  const equipos = ids.length
    ? await db
        .select({
          id: vehiculos.id,
          codigo: vehiculos.codigoInterno,
          obraId: vehiculos.obraId,
          clase: tiposVehiculo.claseMedidor,
        })
        .from(vehiculos)
        .innerJoin(tiposVehiculo, eq(tiposVehiculo.id, vehiculos.tipoVehiculoId))
        .where(and(inArray(vehiculos.id, ids), isNull(vehiculos.eliminadoEn)))
    : [];

  const porId = new Map(equipos.map((v) => [v.id, v]));
  for (const vehiculoId of ids) {
    const equipo = porId.get(vehiculoId);
    // Solo las máquinas de la obra del parte: una volqueta de otra obra en
    // este parte son horas apuntadas donde no trabajó.
    if (!equipo || (equipo.obraId !== null && equipo.obraId !== obraId)) {
      return { error: 'Ese equipo no es de la obra de esta bitácora.' };
    }
  }

  for (const maquina of pedidas) {
    const clase = maquina.claseMedidor ?? medidorDeClase(porId.get(maquina.vehiculoId)!.clase);
    const error = validarAvance(clase, maquina.medidorInicial ?? null, maquina.medidorFinal ?? null);
    // Falta una lectura todavía no es un error mientras se llena: solo se
    // exigen completas al cerrar. Lo que sí se rechaza ya es una lectura
    // imposible, porque escrita se queda.
    if (error === 'final_menor' || error === 'salto_enorme') {
      return { error: mensajeDeAvance(clase, error, maquina.medidorInicial ?? null) };
    }
  }

  // El nombre del operador lo pone el servidor, como el código del equipo: si
  // llegara del navegador, bastaría con editar la petición para que el parte
  // dijera que manejó otra persona (021/RF-73).
  const idsDeOperador = [
    ...new Set(pedidas.map((m) => m.operadorId).filter((id): id is string => !!id)),
  ];
  const operadores = idsDeOperador.length
    ? await db
        .select({ id: usuarios.id, nombre: usuarios.nombreCompleto })
        .from(usuarios)
        .where(and(inArray(usuarios.id, idsDeOperador), isNull(usuarios.eliminadoEn)))
    : [];
  const nombreDe = new Map(operadores.map((u) => [u.id, u.nombre]));
  for (const id of idsDeOperador) {
    if (!nombreDe.has(id)) return { error: 'Ese operador no existe.' };
  }

  return {
    filas: pedidas.map((m) => {
      const equipo = porId.get(m.vehiculoId)!;
      return construirMaquina(
        m,
        equipo.codigo,
        m.claseMedidor ?? medidorDeClase(equipo.clase),
        m.operadorId ? (nombreDe.get(m.operadorId) ?? null) : null,
      );
    }),
  };
}

/** El personal (spec 004, RF-16 a RF-20; spec 016). */
export async function personalDelParte(
  pedidas: readonly PersonaPedida[],
): Promise<Seccion<PersonaDelParte>> {
  const ids = pedidas.map((p) => p.usuarioId);
  if (new Set(ids).size !== ids.length) {
    return { error: 'Una persona no puede estar dos veces en la misma bitácora.' };
  }

  // Horas laboradas, entrada y salida, o novedad (spec 025, RF-6 a RF-12, RF-19).
  for (const persona of pedidas) {
    const error = validarPersonaDelParte(persona);
    if (error) return { error: mensajeDePersona(error) };
  }

  const gente = ids.length
    ? await baseServidor()
        .select({ id: usuarios.id, nombre: usuarios.nombreCompleto, cargo: usuarios.cargo })
        .from(usuarios)
        .where(and(inArray(usuarios.id, ids), isNull(usuarios.eliminadoEn)))
    : [];

  const porId = new Map(gente.map((u) => [u.id, u]));
  for (const usuarioId of ids) {
    if (!porId.has(usuarioId)) return { error: 'Esa persona no existe.' };
  }

  return {
    filas: pedidas.map((p) => {
      const persona = porId.get(p.usuarioId)!;
      return construirPersona(p, persona.nombre, persona.cargo);
    }),
  };
}

/**
 * Las actividades (spec 004, RF-64, RF-70, RF-71). Una fila con el id de una
 * actividad heredada se queda como estaba; las demás se construyen, y una que no
 * es del presupuesto ni una «otra» completa no se guarda.
 */
export function actividadesDelParte(
  pedidas: readonly (ActividadPedida | { id: string })[],
  guardadas: readonly ActividadDelParte[],
): Seccion<ActividadDelParte> {
  const filas = conservarHeredadas(
    [...pedidas],
    [...guardadas],
    esActividadHeredada,
    // Solo con id y sin ser heredada de este parte no es nada que construir.
    (fila) => ('clave' in fila ? construirActividadDelParte(fila) : null),
  );
  if (filas.some((f) => f === null)) return { error: 'Esa actividad no está en la lista.' };
  return { filas: filas as ActividadDelParte[] };
}

/** El clima (spec 004, RF-26, RF-27). */
export function climaDelParte(pedidas: readonly FranjaPedida[]): Seccion<FranjaDeClima> {
  const error = validarFranjas([...pedidas]);
  if (error) return { error: mensajeDeFranja(error) };
  return { filas: pedidas.map((c) => construirFranja(c)) };
}

/**
 * Control Calidad de Obra (spec 004, RF-61, RF-63, RF-72, RF-84 a RF-89).
 *
 * Un material heredado que llega con su id se queda como estaba (RF-63); lo demás
 * es un ensayo que se construye **con el guardado de su id**: es lo único que dice
 * si es un ensayo anterior al 2026-09-22, al que no se le exigen horas,
 * responsable ni ubicación (RF-89).
 */
export function laboratorioDelParte(
  pedidos: readonly EnsayoPedido[],
  guardadas: readonly FilaDeControlDeCalidad[],
): Seccion<FilaDeControlDeCalidad> {
  const ensayosGuardados = new Map(
    guardadas.filter(esEnsayo).map((ensayo) => [ensayo.id, ensayo]),
  );
  const guardadoDe = (pedido: { id?: string | null }) =>
    pedido.id ? ensayosGuardados.get(pedido.id) : undefined;

  const filas = conservarHeredadas(
    [...pedidos],
    [...guardadas],
    esMaterialHeredado,
    (pedido) => construirEnsayo(pedido, guardadoDe(pedido)),
  );
  if (filas.some((f) => f === null)) {
    // Todo lo que falta de una vez, uno por renglón, como el cierre (RF-88): con
    // varios ensayos, cada renglón dice de cuál es.
    const renglones = pedidos.flatMap((pedido, indice) =>
      filas[indice] === null
        ? rechazoDelEnsayo(pedido, guardadoDe(pedido)).map((m) => `Ensayo ${indice + 1}: ${m}`)
        : [],
    );
    return { error: renglones.join('\n') || 'Ese ensayo no está en la lista.' };
  }
  return { filas: filas as FilaDeControlDeCalidad[] };
}
