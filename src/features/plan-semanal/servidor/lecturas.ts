/**
 * Proponer el plan de una semana con IA y leer el Excel de un plan (spec 044, RF-5, RF-34 a RF-53,
 * RF-92, RF-96, RF-101, RF-105). **Solo servidor.**
 *
 * Los dos caminos terminan en lo mismo —un borrador de esa obra y esa semana— y por eso comparten
 * todo menos de dónde sale el texto para la IA: la propuesta lo arma con los datos de la obra, la
 * lectura con las hojas a la vista del archivo. Lo que vuelve de la IA pasa por la misma regla
 * (`planDeLaLectura`), que es la que cruza, comprueba y reparte.
 *
 * ── Qué se rechaza antes de pagar ──
 *
 * La semana que no se puede planear, la obra sin planificación vigente (RF-5), el borrador que nadie
 * confirmó sustituir (RF-52) y el archivo que no es `.xlsx` (RF-43) se rechazan en la petición, con
 * su código. Lo que solo se sabe después de la IA —que falló, que no encontró actividades (RF-49)—
 * queda escrito en la lectura.
 *
 * ── Una a la vez por obra y semana (RF-101) ──
 *
 * La reserva es la fila `en_curso` y la garantiza el índice único parcial, no una consulta previa,
 * igual que en la planificación. Cada fila trae su vencimiento, mayor que el tope de la IA: la
 * siguiente petición marca `fallida` la que se pasó de tiempo, y así un proceso que murió a mitad no
 * bloquea esa semana para siempre.
 *
 * ── Por detrás ──
 *
 * La ruta responde 202 y el trabajo sigue en el mismo proceso: el proxy del VPS corta a los 120 s y
 * la IA puede tardar más. Nadie espera esa promesa, así que no lanza: todo termina en la fila,
 * `lista` con su borrador o `fallida` con el motivo.
 *
 * El borrador se crea en un lote con el cambio de estado de la lectura y el descarte del sustituido
 * (RF-53), para que no quede uno sin lo otro. Si aparece un borrador que no se pidió sustituir, el
 * índice rechaza el lote entero y la lectura queda `fallida`: no se pisa el trabajo de nadie.
 *
 * El estado de una lectura se consulta en `estado-de-lectura.ts`, aparte, para que esa consulta
 * repetida no arrastre el lector de Excel ni el cliente de la IA.
 *
 * No se guarda el Excel ni lo que leyó la IA (decisión del plan): un plan se sube una vez y se
 * ajusta en pantalla. Nada de esto toca partes, presupuestos ni planificaciones (RF-85).
 */
import { and, eq, lt } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

import { baseServidor } from '@/db/servidor/cliente';
import { planesSemanales, planSemanalLecturas } from '@/db/servidor/esquema';
import { materialesConStock } from '@/features/almacen-obra/servidor/materiales';
import type { LecturaDePlanIniciada } from '@/features/panel/plan-semanal';
import { informeDeLaObra } from '@/features/planificacion/servidor/cumplimiento';
import { TIEMPO_MAXIMO_DE_LECTURA_MS, type RespuestaDeIa } from '@/features/planificacion/servidor/leer-con-ia';
import { pareceXlsx, TAMANO_MAXIMO } from '@/features/presupuestos/servidor/importar';
import { libroConNombres } from '@/features/presupuestos/servidor/leer-excel';
import { vehiculosDeLaObra } from '@/features/reportes/servidor/datos';
import type { PersonaEnSesion } from '@/features/servidor/guardia';
import { modulosDeLaObra } from '@/features/servidor/modulos-de-obra';
import { errorDePeticion } from '@/features/servidor/respuestas';
import { fechaDeJornada, sumarDias } from '@/shared/rules/jornada';
import { diasDeLaSemana, diasPorDefecto, faltaDeSemana, type TipoDeLecturaDePlan } from '@/shared/rules/plan-semanal';
import { planDeLaLectura, textoParaProponer, type PedidoDePropuesta, type PlanLeidoPorLaIa } from '@/shared/rules/plan-semanal-ia';
import { llaveDeItemPlanificado } from '@/shared/rules/planificacion';
import { textoParaLeer, type HojaDelLibro } from '@/shared/rules/planificacion-ia';

import { leerPlanDelExcel, proponerPlan } from './con-ia';
import { SE_PASO_DE_TIEMPO } from './estado-de-lectura';
import { planificacionVigente, SIN_PLANIFICACION } from './planes';

/** Tiene que pasar del tope de la IA: si venciera antes, otra podría arrancar con la primera viva. */
const VIGENCIA_DE_UNA_LECTURA_MS = TIEMPO_MAXIMO_DE_LECTURA_MS + 2 * 60 * 1000;

type PlanificacionVigente = NonNullable<Awaited<ReturnType<typeof planificacionVigente>>>;

export interface PedidoDeLectura {
  obraId: string;
  /** El lunes de la semana (RF-92: al subir un Excel, la escoge la persona). */
  semana: string;
  /** RF-52: la persona confirmó sustituir el borrador que hay. */
  sustituir: boolean;
}

/** RF-1 a RF-5, RF-52: lo que se puede rechazar sin mirar el archivo ni llamar a la IA. */
async function planificacionParaLeer(pedido: PedidoDeLectura): Promise<PlanificacionVigente | Response> {
  const falta = faltaDeSemana(pedido.semana, fechaDeJornada());
  if (falta) return errorDePeticion(falta, 400);
  const vigente = await planificacionVigente(pedido.obraId);
  if (!vigente) return errorDePeticion(SIN_PLANIFICACION, 409);

  const [borrador] = await baseServidor()
    .select({ id: planesSemanales.id })
    .from(planesSemanales)
    .where(and(eq(planesSemanales.obraId, pedido.obraId), eq(planesSemanales.semana, pedido.semana), eq(planesSemanales.estado, 'borrador')))
    .limit(1);
  if (borrador && !pedido.sustituir) {
    return Response.json(
      { error: 'Ya hay un borrador de esa semana. Confirme que quiere sustituirlo; el anterior queda descartado.', borrador },
      { status: 409 },
    );
  }
  return vigente;
}

/** RF-43: el libro, si es un `.xlsx` de verdad con algo a la vista; si no, por qué no. */
async function libroDelPlan(contenido: Uint8Array<ArrayBuffer>): Promise<{ texto: string; hojas: HojaDelLibro[] } | Response> {
  if (contenido.byteLength === 0) return errorDePeticion('El archivo llegó vacío.', 422);
  if (contenido.byteLength > TAMANO_MAXIMO) return errorDePeticion('El archivo pesa más de 20 MB.', 413);
  // Lo que manda es el contenido, no el nombre: un .xls renombrado no empieza por «PK».
  if (!pareceXlsx(contenido)) {
    return errorDePeticion(
      'Ese archivo no es un Excel (.xlsx), aunque su nombre lo diga. Ábralo en Excel y guárdelo como «Libro de Excel (.xlsx)».',
      422,
    );
  }
  let libro: HojaDelLibro[];
  try {
    libro = await libroConNombres(contenido.buffer);
  } catch {
    return errorDePeticion('No pude abrir el archivo como Excel. Revise que no esté dañado ni protegido.', 422);
  }
  const visibles = libro.filter((hoja) => hoja.visible);
  if (visibles.length === 0) return errorDePeticion('El libro no tiene ninguna hoja a la vista.', 422);
  // Un plan semanal es corto: van todas las hojas a la vista, sin escogerlas.
  const enviado = textoParaLeer({ hojas: visibles.map((hoja) => ({ nombre: hoja.nombre, usos: [] })) }, libro);
  if (!enviado) return errorDePeticion('El libro es demasiado largo para leerlo con IA. Deje a la vista solo las hojas del plan.', 422);
  if (enviado.filas === 0) return errorDePeticion('Las hojas a la vista están vacías.', 422);
  return enviado;
}

interface LecturaAbierta {
  lecturaId: string;
  /** El id que tendrá el borrador. */
  planId: string;
}

/**
 * RF-101: vence las que se pasaron de tiempo y reserva la obra y la semana. Si otra está en curso,
 * el índice lanza y `responder` lo vuelve un 409 con su explicación (`duplicadoDe`).
 */
async function abrirLectura(sesion: PersonaEnSesion, pedido: PedidoDeLectura, tipo: TipoDeLecturaDePlan): Promise<LecturaAbierta> {
  const db = baseServidor();
  const ahora = new Date();
  await db
    .update(planSemanalLecturas)
    .set({ estado: 'fallida', error: SE_PASO_DE_TIEMPO, actualizadoEn: ahora })
    .where(
      and(
        eq(planSemanalLecturas.obraId, pedido.obraId),
        eq(planSemanalLecturas.semana, pedido.semana),
        eq(planSemanalLecturas.estado, 'en_curso'),
        lt(planSemanalLecturas.venceEn, ahora),
      ),
    );

  const abierta = { lecturaId: uuidv7(), planId: uuidv7() };
  await db.insert(planSemanalLecturas).values({
    id: abierta.lecturaId,
    obraId: pedido.obraId,
    semana: pedido.semana,
    tipo,
    estado: 'en_curso',
    planId: abierta.planId,
    venceEn: new Date(ahora.getTime() + VIGENCIA_DE_UNA_LECTURA_MS),
    creadoPor: sesion.id,
  });
  return abierta;
}

async function fallar(lecturaId: string, error: string): Promise<void> {
  await baseServidor()
    .update(planSemanalLecturas)
    .set({ estado: 'fallida', error, actualizadoEn: new Date() })
    .where(and(eq(planSemanalLecturas.id, lecturaId), eq(planSemanalLecturas.estado, 'en_curso')));
}

/**
 * RF-35 a RF-39, RF-93, RF-96, RF-105: lo que ve la IA para proponer. La meta estimada, lo pendiente
 * y la semana anterior salen del informe de cumplimiento, la misma fuente de la pantalla, para que
 * la propuesta no parta de cifras distintas de las que la Directora ya vio.
 */
async function pedidoDePropuesta(obraId: string, semana: string, vigente: PlanificacionVigente): Promise<PedidoDePropuesta> {
  const [deLaSemana, anterior, flota, modulos] = await Promise.all([
    // Sin planes: la meta estimada es lo que daría la planificación, aunque esa semana ya tuviera un plan.
    informeDeLaObra(obraId, 'semana', semana, { sinPlanes: true }),
    informeDeLaObra(obraId, 'semana', sumarDias(semana, -7)),
    vehiculosDeLaObra(obraId),
    modulosDeLaObra(obraId),
  ]);
  const filas = new Map(deLaSemana.filas.map((f) => [f.llave, f]));
  const meses = new Set(diasDeLaSemana(semana).map((dia) => dia.slice(0, 7)));
  // RF-39, RF-105: sin almacén no hay existencias que mirar, y se le dice así a la IA.
  const existencias = modulos.almacen ? await materialesConStock(obraId) : null;

  return {
    semana,
    dias: diasPorDefecto(semana),
    items: vigente.estructura.items.map((i) => {
      const llave = llaveDeItemPlanificado(i);
      const fila = filas.get(llave);
      return {
        llave,
        item: i.delPresupuesto?.item ?? i.item,
        grupo: i.delPresupuesto?.grupo ?? i.grupo,
        capitulo: i.delPresupuesto?.capitulo ?? i.capitulo,
        descripcion: i.descripcion,
        unidad: i.unidad,
        cantidadesDelMes: Object.fromEntries(
          i.programacion.flatMap((p) => (meses.has(p.mes) && p.cantidad !== null ? [[p.mes, p.cantidad] as const] : [])),
        ),
        metaEstimada: fila?.meta ?? null,
        pendiente: fila?.pendienteTotal ?? null,
      };
    }),
    semanaAnterior: anterior.filas
      .filter((f) => f.meta !== null || f.ejecutado > 0)
      .map((f) => ({ llave: f.llave, meta: f.meta, ejecutado: f.ejecutado })),
    vehiculos: flota.map((v) => ({ id: v.id, placa: v.codigo, tipo: v.tipo })),
    // El stock viene en centésimas.
    existencias: existencias?.map((m) => ({ material: m.nombre, unidad: m.unidad, saldo: m.stock / 100 })) ?? null,
  };
}

interface TrabajoDeLectura {
  tipo: TipoDeLecturaDePlan;
  /** Lo que se le manda a la IA; se arma por detrás porque la propuesta lee media obra. */
  texto: () => Promise<string>;
  llamar: (texto: string) => Promise<RespuestaDeIa<PlanLeidoPorLaIa>>;
  /** Las hojas enviadas, si es un Excel. */
  hojas: readonly HojaDelLibro[] | null;
}

/**
 * RF-34, RF-40 a RF-49, RF-53, RF-55: llama a la IA, pasa lo que vuelve por la regla y deja el
 * borrador. No lanza: lo que falle queda escrito en la lectura.
 */
async function correrLectura(
  sesion: PersonaEnSesion,
  pedido: PedidoDeLectura,
  vigente: PlanificacionVigente,
  abierta: LecturaAbierta,
  trabajo: TrabajoDeLectura,
): Promise<void> {
  const queEs = trabajo.tipo === 'excel' ? 'leer el archivo' : 'armar la propuesta';
  try {
    const respuesta = await trabajo.llamar(await trabajo.texto());
    if (!respuesta.ok) {
      await fallar(abierta.lecturaId, `No se pudo ${queEs} con IA: ${respuesta.error} Puede volver a intentarlo.`);
      return;
    }

    const plan = planDeLaLectura(respuesta.datos, { items: vigente.estructura.items, semana: pedido.semana, hojas: trabajo.hojas });
    if (!plan.ok) {
      await fallar(abierta.lecturaId, plan.error);
      return;
    }

    // RF-38: una máquina propia apunta a un vehículo de la obra o a ninguno; un id que la IA no
    // recibió no se guarda, porque la pantalla lo mostraría como un vehículo que no existe.
    const deLaObra = new Set((await vehiculosDeLaObra(pedido.obraId)).map((v) => v.id));
    const estructura = {
      ...plan.estructura,
      maquinaria: plan.estructura.maquinaria.map((m) => (m.vehiculoId !== null && !deLaObra.has(m.vehiculoId) ? { ...m, vehiculoId: null } : m)),
    };

    const db = baseServidor();
    const [lectura] = await db.select({ estado: planSemanalLecturas.estado }).from(planSemanalLecturas).where(eq(planSemanalLecturas.id, abierta.lecturaId));
    if (lectura?.estado !== 'en_curso') return;

    const ahora = new Date();
    const crear = db.insert(planesSemanales).values({
      id: abierta.planId,
      obraId: pedido.obraId,
      semana: pedido.semana,
      origen: trabajo.tipo === 'excel' ? 'excel' : 'ia',
      estructura,
      rechazados: plan.rechazados,
      diferenciasExcel: plan.diferencias,
      planificacionId: vigente.id,
      creadoPor: sesion.id,
      actualizadoPor: sesion.id,
    });
    const marcarLista = db.update(planSemanalLecturas).set({ estado: 'lista', error: null, actualizadoEn: ahora }).where(eq(planSemanalLecturas.id, abierta.lecturaId));
    if (pedido.sustituir) {
      // RF-53: el sustituido queda descartado, con quién y cuándo. Si no había, no cambia nada.
      const descartar = db
        .update(planesSemanales)
        .set({ estado: 'descartado', descartadoEn: ahora, descartadoPor: sesion.id, actualizadoEn: ahora })
        .where(and(eq(planesSemanales.obraId, pedido.obraId), eq(planesSemanales.semana, pedido.semana), eq(planesSemanales.estado, 'borrador')));
      await db.batch([descartar, crear, marcarLista]);
    } else {
      await db.batch([crear, marcarLista]);
    }
  } catch (fallo) {
    console.error('[plan-semanal] la lectura falló:', fallo);
    await fallar(
      abierta.lecturaId,
      'No se pudo crear el borrador. Si ya hay uno de esa semana, confirme que quiere sustituirlo y vuelva a intentarlo.',
    ).catch((otro) => console.error('[plan-semanal] tampoco se pudo cerrar la lectura:', otro));
  }
}

/** RF-34 a RF-41, RF-96, RF-101, RF-105: empieza la propuesta y responde sin esperarla. */
export async function iniciarPropuesta(sesion: PersonaEnSesion, pedido: PedidoDeLectura): Promise<LecturaDePlanIniciada | Response> {
  const vigente = await planificacionParaLeer(pedido);
  if (vigente instanceof Response) return vigente;

  const abierta = await abrirLectura(sesion, pedido, 'propuesta');
  void correrLectura(sesion, pedido, vigente, abierta, {
    tipo: 'propuesta',
    texto: async () => textoParaProponer(await pedidoDePropuesta(pedido.obraId, pedido.semana, vigente)),
    llamar: proponerPlan,
    hojas: null,
  });
  return { lecturaId: abierta.lecturaId };
}

/** RF-42 a RF-49, RF-92, RF-101: valida el archivo, empieza la lectura y responde sin esperarla. */
export async function iniciarLecturaDeExcel(
  sesion: PersonaEnSesion,
  pedido: PedidoDeLectura,
  contenido: Uint8Array<ArrayBuffer>,
): Promise<LecturaDePlanIniciada | Response> {
  const vigente = await planificacionParaLeer(pedido);
  if (vigente instanceof Response) return vigente;
  const libro = await libroDelPlan(contenido);
  if (libro instanceof Response) return libro;

  const abierta = await abrirLectura(sesion, pedido, 'excel');
  void correrLectura(sesion, pedido, vigente, abierta, {
    tipo: 'excel',
    texto: async () => libro.texto,
    llamar: leerPlanDelExcel,
    hojas: libro.hojas,
  });
  return { lecturaId: abierta.lecturaId };
}
