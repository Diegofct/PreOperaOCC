/**
 * Verificación de las reglas del preoperacional contra los formatos reales.
 *
 *   npx tsx scripts/verificar-reglas.ts
 *
 * No sustituye a una prueba en el teléfono, pero cubre lo que más caro sale
 * equivocarse: que un hallazgo en un ítem `AI` deje el vehículo NO APTO, que
 * no se pueda enviar un formato incompleto, y que los medidores no retrocedan.
 */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import {
  generarClaveTemporal,
  hashDeClave,
  medirCostoDeClave,
  verificarClave,
} from '../src/features/auth/servidor/cripto';
import { firmarPeticion } from '../src/features/media/servidor/firma-s3';
import { respuestaEnviada } from '../src/features/servidor/envios';
import {
  conReintentoSiChoca,
  duplicadoDe,
  MENSAJE_DE_CHOQUE,
  responder,
} from '../src/features/servidor/respuestas';

import {
  debeOlvidarEquipo,
  esperaPorFallos,
  intentosRestantes,
  mensajeDeEspera,
} from '../src/features/auth/escalera';
import type { PlantillaChecklist, RespuestaItem } from '../src/features/checklists/types';
import {
  evaluarPreoperacional,
  itemsAplicables,
  itemsMarcablesEnBloque,
  periodicidadesAplicables,
  respuestasDeMedidores,
  validarMedidor,
} from '../src/shared/rules/inspeccion';
import { fusionarVehiculo, mayorMedidor, type VehiculoLocal } from '../src/shared/rules/fusion';
import {
  alcanza,
  avisoDeModuloAjeno,
  moduloDeEntrada,
  MODULOS,
  motivoDeRechazo,
  motivoParaNoDarRol,
  sinObraAsignada,
  modulosVisibles,
  puedeCambiarRol,
  type Rol,
} from '../src/shared/rules/permisos';
import {
  CARGOS,
  cargoPorId,
  nombreDeCargo,
  operaVehiculos,
  rolSugerido,
} from '../src/shared/catalogos/cargos';
import {
  abreviaturaDeUnidad,
  IDS_UNIDAD,
  nombreDeUnidad,
  UNIDADES_ALMACEN,
} from '../src/shared/catalogos/almacen';
import { CLAVE_OTRO_MATERIAL, MATERIALES_DE_OCC } from '../src/shared/catalogos/materiales';
import { PLANTILLAS_POR_TIPO } from '../src/features/checklists/plantillas';
import {
  DESGASTE_PARA_CAMBIO,
  hayQueCambiar,
  nombreDePosicion,
  posicionesDe,
  vidaUtilRestante,
} from '../src/shared/catalogos/llantas';
import {
  diaDeLaSemana,
  domingoDePascua,
  esDominicalOFestivo,
  esFestivo,
  festivosDe,
} from '../src/shared/rules/festivos';
import {
  cubrenLaJornada,
  desglosarJornada,
  minutosCubiertos,
  minutosDeHora,
  validarFranjas,
  validarHorario,
} from '../src/shared/rules/horas';
import {
  ENSAYOS_DE_CALIDAD,
  nombreDeClima,
  nombreDeEnsayo,
} from '../src/shared/catalogos/bitacora';
import {
  ACTIVIDADES_DEL_PRESUPUESTO,
  actividadPorItem,
  CLAVE_OTRA_ACTIVIDAD,
  etiquetaDeActividad,
  etiquetaDeUnidad,
  IDS_UNIDAD_DE_ACTIVIDAD,
} from '../src/shared/catalogos/presupuesto';
import { Colors, Estado, Panel } from '../src/constants/paleta';
import {
  AnchoContenidoConIndice,
  MaxContentWidthPanel,
  Spacing,
} from '../src/constants/medidas';
import { filtrarOpciones, normalizar, ofreceBusqueda } from '../src/shared/rules/texto';
import { colocarLista } from '../src/shared/rules/flotante';
import { barraCabeEnUnRenglon } from '../src/shared/rules/barra';
import { TIPOS_VEHICULO } from '../src/shared/catalogos/tipos-vehiculo';
import { vehiculos } from '../src/db/servidor/esquema';
import { alcanzaLaObra, filtroDeObra } from '../src/features/servidor/alcance';
import type { PersonaEnSesion } from '../src/features/auth/servidor/sesion';
import {
  debeRendirse,
  esperaDeReintento,
  ESPERA_MAXIMA_MS,
  INTENTOS_MAXIMOS,
  siguienteIntento,
} from '../src/shared/rules/reintentos';
import {
  esBitacoraCompleta,
  medidorDeClase,
  mensajeDeAvance,
  validarAvance,
  fechaDeJornada,
  fechaLocalISO,
  horaLocal,
  horasDeMaquina,
  maquinasSinBitacora,
  PERIODOS,
  restarDias,
  sumarDias,
  validarHorometros,
} from '../src/shared/rules/jornada';
import {
  bloqueosDelCierre,
  faltaObservacionDelEnsayo,
  faltasDeActividad,
  MENSAJES_DE_ACTIVIDAD,
  mensajeDeDiaSinTrabajo,
  mensajeDelRechazoDeCierre,
  resolverDiaSinTrabajo,
  seccionesDelParte,
  validarDiaSinTrabajo,
  type ConteosDelParte,
  type FotosDelParte,
  type ParteEvaluable,
} from '../src/shared/rules/parte';
import { calcularDimensiones, resolverCantidad } from '../src/shared/rules/dimensiones';
import {
  aCentesimas,
  aDecimal,
  filtrarMovimientos,
  formatearCantidad,
  historialConSaldo,
  rechazoDeAnulacion,
  rechazoDeBaja,
  rechazoDeCambioDeUnidad,
  rechazoDeSalida,
  totalesDelMaterial,
  validarMovimiento,
  type MovimientoRegistrado,
} from '../src/shared/rules/almacen';
import {
  canteraDelParte,
  conductorElegible,
  DESTINO_OBRA,
  filtrarViajes,
  formatearAbscisa,
  OPCIONES_DE_METROS,
  OPCIONES_DE_PR,
  validarAbscisa,
  validarViaje,
  volquetaElegible,
} from '../src/shared/rules/cantera';
import {
  conservarHeredadas,
  construirActividadDelParte,
  construirEnsayo,
  construirMaquina,
  esActividadHeredada,
  esMaterialHeredado,
} from '../src/features/bitacoras/parte';
import {
  esEnsayo,
  type ActividadDelParte,
  type FilaDeControlDeCalidad,
} from '../src/features/bitacoras/tipos';
import {
  actividadDelParte,
  ensayoDelParte,
  materialDeCanteraEditado,
  materialDeCanteraNuevo,
  materialEditado,
  materialNuevo,
  movimientoNuevo,
  parteEditado,
  sitioEditado,
  sitioNuevo,
  viajeNuevo,
} from '../src/features/panel/contratos';

import camioneta from '../src/features/checklists/plantillas/camioneta.v2.json';
import retroexcavadora from '../src/features/checklists/plantillas/retroexcavadora.v1.json';
import volqueta from '../src/features/checklists/plantillas/volqueta.v2.json';

const VOLQUETA = volqueta as PlantillaChecklist;
const CAMIONETA = camioneta as PlantillaChecklist;
const RETROEXCAVADORA = retroexcavadora as PlantillaChecklist;

const MS_DIA = 86_400_000;
let pruebas = 0;

function prueba(nombre: string, fn: () => void) {
  fn();
  pruebas++;
  console.log(`  ✓ ${nombre}`);
}

/** Igual, para lo que hay que esperar: derivar una contraseña tarda ~300 ms. */
async function pruebaAsync(nombre: string, fn: () => Promise<void>) {
  await fn();
  pruebas++;
  console.log(`  ✓ ${nombre}`);
}

/** Responde todo "conforme" salvo las excepciones indicadas. */
function responderTodo(
  plantilla: PlantillaChecklist,
  periodicidades: ReturnType<typeof periodicidadesAplicables>,
  excepciones: Record<string, 'no_conforme' | 'na'> = {},
  omitir: string[] = [],
): RespuestaItem[] {
  const omitidos = new Set(omitir);
  return plantilla.secciones.flatMap((seccion) =>
    seccion.items
      .filter((item) => periodicidades.includes(item.periodicidad) && !omitidos.has(item.key))
      .map((item) => ({
        itemKey: item.key,
        seccionKey: seccion.key,
        label: item.label,
        sistema: item.sistema,
        tipo: item.tipo,
        inmoviliza: item.inmoviliza,
        valor: excepciones[item.key] ?? ('conforme' as const),
        respondidoEn: Date.now(),
      })),
  );
}

console.log('\nReglas del preoperacional\n');

prueba('la volqueta importada tiene los 86 ítems del formato', () => {
  const items = VOLQUETA.secciones.flatMap((s) => s.items);
  assert.equal(items.length, 86);
  assert.equal(items.filter((i) => i.inmoviliza).length, 16);
});

prueba('sin hallazgos, el vehículo queda apto', () => {
  const p = periodicidadesAplicables(Date.now(), VOLQUETA);
  const evaluacion = evaluarPreoperacional(VOLQUETA, p, responderTodo(VOLQUETA, p));
  assert.equal(evaluacion.resultado, 'apto');
  assert.equal(evaluacion.completo, true);
  assert.equal(evaluacion.inmovilizantes.length, 0);
});

prueba('un hallazgo en un ítem AI deja el vehículo NO APTO', () => {
  const p = periodicidadesAplicables(Date.now(), VOLQUETA);
  const items = VOLQUETA.secciones.flatMap((s) => s.items);
  const critico = items.find((i) => i.inmoviliza);
  assert.ok(critico, 'la volqueta debe tener al menos un ítem que inmovilice');

  const evaluacion = evaluarPreoperacional(
    VOLQUETA,
    p,
    responderTodo(VOLQUETA, p, { [critico.key]: 'no_conforme' }),
  );
  assert.equal(evaluacion.resultado, 'no_apto');
  assert.equal(evaluacion.inmovilizantes.length, 1);
  assert.equal(evaluacion.inmovilizantes[0].label, critico.label);
});

prueba('un hallazgo que no inmoviliza deja el vehículo apto con observaciones', () => {
  const p = periodicidadesAplicables(Date.now(), VOLQUETA);
  const items = VOLQUETA.secciones.flatMap((s) => s.items);
  const normal = items.find((i) => !i.inmoviliza && i.tipo === 'conformidad');
  assert.ok(normal);

  const evaluacion = evaluarPreoperacional(
    VOLQUETA,
    p,
    responderTodo(VOLQUETA, p, { [normal.key]: 'no_conforme' }),
  );
  assert.equal(evaluacion.resultado, 'apto_con_observaciones');
  assert.equal(evaluacion.observaciones.length, 1);
});

prueba('un formato incompleto no se puede dar por terminado', () => {
  const p = periodicidadesAplicables(Date.now(), VOLQUETA);
  const items = VOLQUETA.secciones.flatMap((s) => s.items);
  const evaluacion = evaluarPreoperacional(
    VOLQUETA,
    p,
    responderTodo(VOLQUETA, p, {}, [items[5].key, items[20].key]),
  );
  assert.equal(evaluacion.completo, false);
  assert.equal(evaluacion.faltantes.length, 2);
});

/**
 * Estas tres reproducen lo que arma la pantalla, no lo que arma `responderTodo`.
 * La pantalla solo responde los ítems de conformidad —los medidores se capturan
 * con otro teclado—, y por eso el fallo pasó desapercibido: el ayudante de
 * pruebas respondía también los de tipo `numero`, que es justo lo que la app no
 * hacía. Con la volqueta el operador llenaba sus 85 ítems y el formato seguía
 * diciendo que le faltaban dos.
 */
function responderSoloLaLista(
  plantilla: PlantillaChecklist,
  periodicidades: ReturnType<typeof periodicidadesAplicables>,
): RespuestaItem[] {
  return responderTodo(plantilla, periodicidades).filter((r) => r.tipo === 'conformidad');
}

prueba('las lecturas de los medidores completan el formato', () => {
  const p = periodicidadesAplicables(Date.now(), VOLQUETA);
  const deLaLista = responderSoloLaLista(VOLQUETA, p);

  const sinMedidores = evaluarPreoperacional(VOLQUETA, p, deLaLista);
  assert.equal(sinMedidores.completo, false);
  // Desde la spec 003 la volqueta solo lleva kilometraje: el horómetro salió de
  // su formato porque no se controla por horas de motor.
  assert.deepEqual(sinMedidores.faltantes.map((i) => i.label).sort(), ['Odómetro']);

  const conMedidores = evaluarPreoperacional(VOLQUETA, p, [
    ...deLaLista,
    ...respuestasDeMedidores(VOLQUETA, p, { horometro: null, odometro: 88_310 }, Date.now()),
  ]);
  assert.equal(conMedidores.completo, true);
  assert.equal(conMedidores.resultado, 'apto');
});

prueba('cada lectura va al ítem de su unidad', () => {
  // El vínculo lectura-ítem es la unidad, no la clave. La volqueta solo tiene
  // ítem en kilómetros, así que la lectura de horas sobrante se descarta en vez
  // de colarse en el ítem equivocado.
  const p = periodicidadesAplicables(Date.now(), VOLQUETA);
  const medidores = respuestasDeMedidores(
    VOLQUETA,
    p,
    { horometro: 1204.5, odometro: 88_310 },
    Date.now(),
  );

  assert.equal(medidores.length, 1);
  assert.equal(medidores[0].itemKey, 'tablero_de_control__odometro');
  assert.equal(medidores[0].valor, 88_310);
  // Se auto-describen igual que el resto: la sección tiene que venir de verdad.
  assert.equal(medidores.every((r) => r.seccionKey !== ''), true);
});

prueba('camioneta y volqueta ya no piden horómetro', () => {
  // Spec 003 / RF-4. Si alguien vuelve a importar los formatos sin aplicar los
  // ajustes, esto es lo que lo va a decir.
  for (const plantilla of [CAMIONETA, VOLQUETA]) {
    assert.equal(plantilla.version, 2, plantilla.tipoVehiculo);
    assert.equal(plantilla.medidores.horometro, 'oculto', plantilla.tipoVehiculo);
    assert.equal(plantilla.medidores.odometro, 'requerido', plantilla.tipoVehiculo);
    const enHoras = plantilla.secciones
      .flatMap((s) => s.items)
      .filter((i) => i.tipo === 'numero' && i.unidad === 'h');
    assert.equal(enHoras.length, 0, plantilla.tipoVehiculo);
  }
});

prueba('un formato sin odómetro no pide uno', () => {
  const p = periodicidadesAplicables(Date.now(), RETROEXCAVADORA);
  const medidores = respuestasDeMedidores(
    RETROEXCAVADORA,
    p,
    { horometro: 3410, odometro: null },
    Date.now(),
  );

  assert.equal(medidores.length, 1);
  assert.equal(medidores[0].valor, 3410);

  const evaluacion = evaluarPreoperacional(RETROEXCAVADORA, p, [
    ...responderSoloLaLista(RETROEXCAVADORA, p),
    ...medidores,
  ]);
  assert.equal(evaluacion.completo, true);
});

prueba('el servidor acepta tal cual lo que arma el móvil', () => {
  const p = periodicidadesAplicables(Date.now(), VOLQUETA);
  const items = VOLQUETA.secciones.flatMap((s) => s.items);

  const envio = [
    // Un hallazgo con su comentario y su foto: lo que más caro sale perder.
    {
      ...responderSoloLaLista(VOLQUETA, p)[0],
      valor: 'no_conforme' as const,
      comentario: 'Fuga por el retén del cilindro derecho.',
      mediaIds: ['01a06446-7fc7-7c5e-9f4f-29f9c5fa0016'],
      marcadoEnBloque: false,
    },
    ...responderSoloLaLista(VOLQUETA, p).slice(1),
    ...respuestasDeMedidores(VOLQUETA, p, { horometro: 1204, odometro: 88_310 }, Date.now()),
  ];

  for (const respuesta of envio) {
    // `parse` y no `safeParse`: si esto lanza, el móvil está mandando algo que
    // el servidor contesta con un 400, y un 400 es definitivo — el
    // preoperacional se marca rechazado y no vuelve a intentarse jamás.
    respuestaEnviada.parse(JSON.parse(JSON.stringify(respuesta)));
  }

  assert.equal(envio.length, items.length);
});

prueba('la ingesta no se traga el comentario ni las fotos de un hallazgo', () => {
  const validada = respuestaEnviada.parse({
    itemKey: 'frenos__freno_de_servicio',
    seccionKey: 'frenos',
    label: 'Freno de servicio',
    sistema: 'FRENOS - AI',
    tipo: 'conformidad',
    inmoviliza: true,
    valor: 'no_conforme',
    comentario: 'Pedal se va al fondo.',
    mediaIds: ['una-foto'],
    respondidoEn: Date.now(),
  });

  // Zod descarta callado lo que no declara: el día que el nombre de un campo se
  // desalinee, esto falla aquí y no en la obra, seis meses después.
  assert.equal(validada.comentario, 'Pedal se va al fondo.');
  assert.deepEqual(validada.mediaIds, ['una-foto']);
});

prueba('"marcar todo bien" nunca alcanza a los ítems que inmovilizan', () => {
  for (const seccion of VOLQUETA.secciones) {
    const marcables = itemsMarcablesEnBloque(seccion.items);
    assert.equal(
      marcables.some((i) => i.inmoviliza),
      false,
      `la sección ${seccion.titulo} dejó pasar un ítem que inmoviliza`,
    );
  }
});

prueba('la camioneta suma los ítems quincenales y mensuales cuando toca', () => {
  const hoy = Date.now();

  const soloDiaria = periodicidadesAplicables(hoy, CAMIONETA, {
    quincenal: hoy - 2 * MS_DIA,
    mensual: hoy - 2 * MS_DIA,
  });
  assert.deepEqual(soloDiaria, ['diaria']);
  assert.equal(itemsAplicables(CAMIONETA, soloDiaria).length, 35);

  const conQuincenal = periodicidadesAplicables(hoy, CAMIONETA, {
    quincenal: hoy - 16 * MS_DIA,
    mensual: hoy - 2 * MS_DIA,
  });
  assert.deepEqual(conQuincenal, ['diaria', 'quincenal']);
  assert.equal(itemsAplicables(CAMIONETA, conQuincenal).length, 35 + 16);

  // Un equipo que nunca ha tenido revisión periódica las debe todas.
  const primeraVez = periodicidadesAplicables(hoy, CAMIONETA);
  assert.deepEqual(primeraVez, ['diaria', 'quincenal', 'mensual']);
  assert.equal(itemsAplicables(CAMIONETA, primeraVez).length, 58);
});

prueba('un formato sin revisión periódica no inventa una', () => {
  // La retroexcavadora solo trae hoja diaria; nunca debe pedir ítems de otra
  // periodicidad por más tiempo que lleve sin revisarse.
  const hace90Dias = Date.now() - 90 * MS_DIA;
  const p = periodicidadesAplicables(Date.now(), RETROEXCAVADORA, {
    quincenal: hace90Dias,
    mensual: hace90Dias,
  });
  assert.deepEqual(p, ['diaria']);
  assert.equal(itemsAplicables(RETROEXCAVADORA, p).length, 52);
});

prueba('un medidor no puede retroceder', () => {
  const v = validarMedidor('horometro', 1180, 1240);
  assert.equal(v.estado, 'retrocede');
  assert.match(v.mensaje, /1.240/);
});

prueba('un salto anormal pide confirmación en vez de rechazar', () => {
  const v = validarMedidor('horometro', 12_400, 1_240);
  assert.equal(v.estado, 'salto_sospechoso');
  assert.match(v.mensaje, /¿Está seguro\?/);
});

prueba('una jornada normal pasa sin molestar al operador', () => {
  assert.equal(validarMedidor('horometro', 1248, 1240).estado, 'ok');
  assert.equal(validarMedidor('odometro', 210_700, 210_450).estado, 'ok');
  assert.equal(validarMedidor('horometro', 500, null).estado, 'ok');
});

/* ------------------------------------------------------------------------ */
/* Bloqueo por PIN fallido                                                   */
/* ------------------------------------------------------------------------ */

prueba('los dos primeros errores de PIN no cuestan espera', () => {
  assert.equal(esperaPorFallos(0), 0);
  assert.equal(esperaPorFallos(1), 0);
  assert.equal(esperaPorFallos(2), 0);
});

prueba('la escalera de bloqueo sube en 3, 5 y 7 fallos', () => {
  assert.equal(esperaPorFallos(3), 30_000);
  assert.equal(esperaPorFallos(4), 30_000);
  assert.equal(esperaPorFallos(5), 5 * 60_000);
  assert.equal(esperaPorFallos(6), 5 * 60_000);
  assert.equal(esperaPorFallos(7), 30 * 60_000);
  assert.equal(esperaPorFallos(9), 30 * 60_000);
});

prueba('el equipo solo se desactiva al décimo fallo', () => {
  assert.equal(debeOlvidarEquipo(9), false);
  assert.equal(debeOlvidarEquipo(10), true);
  assert.equal(intentosRestantes(3), 7);
  assert.equal(intentosRestantes(10), 0);
});

prueba('la espera se le explica al operador sin decimales', () => {
  assert.equal(mensajeDeEspera(30_000), 'Espere 30 segundos e intente de nuevo.');
  assert.equal(mensajeDeEspera(5 * 60_000), 'Espere 5 minutos e intente de nuevo.');
  assert.equal(mensajeDeEspera(61_000), 'Espere 2 minutos e intente de nuevo.');
});

/* ------------------------------------------------------------------------ */
/* Bitácora diaria                                                           */
/* ------------------------------------------------------------------------ */

/** Un instante de hoy en hora local, para no depender del día en que se corra. */
function hoyALas(hora: number, minuto = 0): number {
  const fecha = new Date();
  fecha.setHours(hora, minuto, 0, 0);
  return fecha.getTime();
}

prueba('la hora y la fecha se escriben en hora local, no en UTC', () => {
  assert.equal(horaLocal(hoyALas(7, 5)), '07:05');
  assert.equal(horaLocal(hoyALas(16, 30)), '16:30');
  assert.match(fechaLocalISO(hoyALas(23, 30)), /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(fechaLocalISO(hoyALas(23, 30)), fechaLocalISO(hoyALas(0, 30)));
});

prueba('las horas de máquina salen de la diferencia de horómetros', () => {
  assert.equal(horasDeMaquina(9840, 9848), 8);
  assert.equal(horasDeMaquina(9840, 9840), 0);
});

prueba('sin las dos lecturas no hay horas de máquina', () => {
  assert.equal(horasDeMaquina(9840, null), null);
  assert.equal(horasDeMaquina(null, 9848), null);
  assert.equal(horasDeMaquina(null, null), null);
});

prueba('un horómetro final menor que el inicial se rechaza', () => {
  assert.equal(validarHorometros(9840, 9835), 'final_menor');
  // Y no se cuela como jornada negativa.
  assert.equal(horasDeMaquina(9840, 9835), null);
});

prueba('un salto imposible en un solo día se rechaza', () => {
  // 9840 → 98450 metería 88.610 horas de golpe y dispararía todos los
  // mantenimientos preventivos del vehículo.
  assert.equal(validarHorometros(9840, 98_450), 'salto_enorme');
  assert.equal(validarHorometros(9840, 9864), null);
});

prueba('faltar una lectura se distingue de tenerla mal', () => {
  assert.equal(validarHorometros(null, 9848), 'falta_inicial');
  assert.equal(validarHorometros(9840, null), 'falta_final');
});

prueba('una bitácora sin operador o sin actividad no está completa', () => {
  const buena = {
    operadorId: 'demo-usuario-01',
    horometroInicial: 9840,
    horometroFinal: 9848,
    actividades: [{ clave: 'excavacion', nombre: 'Excavación' }],
  };
  assert.equal(esBitacoraCompleta(buena), true);
  assert.equal(esBitacoraCompleta({ ...buena, operadorId: null }), false);
  assert.equal(esBitacoraCompleta({ ...buena, actividades: [] }), false);
  assert.equal(esBitacoraCompleta({ ...buena, horometroFinal: null }), false);
  assert.equal(esBitacoraCompleta({ ...buena, horometroFinal: 9835 }), false);
});

prueba('la jornada en obra no cambia de día por la zona del navegador', () => {
  // El residente puede mirar el panel desde cualquier parte; el día de trabajo
  // siempre es el de la obra. A las 02:00 UTC del 4 de marzo, en Colombia
  // todavía son las 21:00 del 3: la jornada es la del 3.
  assert.equal(fechaDeJornada(Date.parse('2026-03-04T02:00:00Z')), '2026-03-03');
  // Y a las 06:00 UTC ya son las 01:00 del 4 en obra.
  assert.equal(fechaDeJornada(Date.parse('2026-03-04T06:00:00Z')), '2026-03-04');
  // La frontera exacta: 05:00 UTC es medianoche en Colombia.
  assert.equal(fechaDeJornada(Date.parse('2026-03-04T05:00:00Z')), '2026-03-04');
  assert.equal(fechaDeJornada(Date.parse('2026-03-04T04:59:59Z')), '2026-03-03');
});

prueba('sumar y restar días no se tropieza con los meses ni con los bisiestos', () => {
  // Spec 006 / T2. La misma aritmética estaba copiada en cuatro sitios —festivos,
  // dos pantallas del panel y el resumen—, así que es la primera vez que se
  // comprueba. Se calcula por mediodía UTC justamente para que ninguno de estos
  // saltos cruce de día por un huso horario.
  assert.equal(sumarDias('2026-01-31', 1), '2026-02-01');
  assert.equal(restarDias('2026-03-01', 1), '2026-02-28');

  // Cambio de año.
  assert.equal(sumarDias('2026-12-31', 1), '2027-01-01');
  assert.equal(restarDias('2027-01-01', 1), '2026-12-31');

  // 2028 es bisiesto y tiene 29 de febrero; 2026 no.
  assert.equal(sumarDias('2028-02-28', 1), '2028-02-29');
  assert.equal(sumarDias('2028-02-29', 1), '2028-03-01');
  assert.equal(restarDias('2028-03-01', 1), '2028-02-29');
  assert.equal(sumarDias('2026-02-28', 1), '2026-03-01');

  // Sumar cero no mueve nada, y restar es sumar con el signo cambiado.
  assert.equal(sumarDias('2026-09-11', 0), '2026-09-11');
  assert.equal(restarDias('2026-09-11', 6), sumarDias('2026-09-11', -6));
});

prueba('los periodos del panel abarcan los días que dicen', () => {
  // Spec 006 / RF-19. «hoy» es un solo día, así que el desde es el mismo día.
  assert.equal(restarDias('2026-09-11', PERIODOS.hoy), '2026-09-11');
  // La última semana son siete días contando hoy, no ocho.
  assert.equal(restarDias('2026-09-11', PERIODOS.semana), '2026-09-05');
  // El último mes, treinta.
  assert.equal(restarDias('2026-09-11', PERIODOS.mes), '2026-08-13');
});

prueba('el acta que llegó tarde queda fuera por su inicio y dentro por su llegada', () => {
  // Spec 006 / RF-20, con las fechas reales del caso que originó la spec: el
  // preoperacional de VOL-01 se inició el 3 de septiembre y el servidor lo
  // recibió el 7, porque el celular tardó cuatro días en agarrar señal.
  //
  // Mirando hoy —11 de septiembre— la última semana empieza el día 5. Filtrar
  // solo por la fecha de inicio deja el acta fuera y la vuelve invisible en el
  // panel, que es exactamente el fallo. Por eso la ventana mira las dos fechas.
  const desde = restarDias('2026-09-11', PERIODOS.semana);
  assert.ok('2026-09-03' < desde, 'el inicio del acta cae fuera de la última semana');
  assert.ok('2026-09-07' >= desde, 'pero su llegada sí cae dentro');
});

/* ------------------------------------------------------------------------ */
/* El índice del parte diario (spec 006)                                     */
/* ------------------------------------------------------------------------ */

/** Un parte recién abierto: todo vacío y nada cerrado. */
const PARTE_VACIO: ConteosDelParte = {
  maquinaria: 0,
  personal: 0,
  actividades: 0,
  clima: 0,
  laboratorio: 0,
  notas: '',
  fotos: 0,
  historicoCerradas: 0,
  cerrado: false,
  anulado: false,
};

/** El estado de una sección por su id, para no depender del orden al afirmar. */
function estadoDe(conteos: ConteosDelParte, id: string) {
  return seccionesDelParte(conteos).find((s) => s.id === id);
}

prueba('un parte recién abierto tiene todas sus secciones sin registrar', () => {
  const secciones = seccionesDelParte(PARTE_VACIO);
  // Ocho: las siete del parte más el cierre. El histórico no está porque no hay
  // ninguna bitácora vieja cerrada ese día.
  assert.equal(secciones.length, 8);
  assert.ok(secciones.every((s) => s.estado === 'vacio'));
  // El orden es dato de la regla y no del JSX: si se desalinean, el índice
  // llevaría a la sección equivocada.
  assert.deepEqual(
    secciones.map((s) => s.id),
    [
      'maquinaria',
      'personal',
      'actividades',
      'clima',
      'laboratorio',
      'notas',
      'fotografia',
      'cierre',
    ],
  );
});

prueba('solo se encienden las secciones que tienen algo guardado', () => {
  const conteos = { ...PARTE_VACIO, maquinaria: 1, personal: 2 };
  assert.equal(estadoDe(conteos, 'maquinaria')?.estado, 'lleno');
  assert.equal(estadoDe(conteos, 'maquinaria')?.cuantos, 1);
  assert.equal(estadoDe(conteos, 'personal')?.estado, 'lleno');
  assert.equal(estadoDe(conteos, 'personal')?.cuantos, 2);
  // Las demás siguen apagadas.
  assert.equal(estadoDe(conteos, 'actividades')?.estado, 'vacio');
  assert.equal(estadoDe(conteos, 'clima')?.estado, 'vacio');
});

prueba('unas notas en blanco no cuentan como notas', () => {
  // Spec 006 / RF-9. Tres espacios es lo que queda cuando alguien escribió algo
  // y lo borró; el índice no puede darlo por escrito.
  assert.equal(estadoDe({ ...PARTE_VACIO, notas: '   ' }, 'notas')?.estado, 'vacio');
  assert.equal(estadoDe({ ...PARTE_VACIO, notas: '\n' }, 'notas')?.estado, 'vacio');
  assert.equal(estadoDe({ ...PARTE_VACIO, notas: 'Se varó la 02.' }, 'notas')?.estado, 'lleno');
});

prueba('mientras las fotos no hayan cargado, el índice no dice que no hay', () => {
  // Spec 006 / RF-8. El conteo de fotos llega por su cuenta, y `null` significa
  // «todavía no se sabe». Pintarlo como vacío sería mentir durante un segundo, y
  // es el segundo en que alguien decide que le falta subir la foto del día.
  assert.equal(estadoDe({ ...PARTE_VACIO, fotos: null }, 'fotografia')?.estado, 'desconocido');
  assert.equal(estadoDe({ ...PARTE_VACIO, fotos: null }, 'fotografia')?.cuantos, null);
  assert.equal(estadoDe({ ...PARTE_VACIO, fotos: 0 }, 'fotografia')?.estado, 'vacio');
  assert.equal(estadoDe({ ...PARTE_VACIO, fotos: 2 }, 'fotografia')?.estado, 'lleno');
});

prueba('las bitácoras por máquina solo entran si están cerradas', () => {
  // Spec 006 / RF-28. Las seis que hay en la base están abiertas: son restos de
  // cuando se probaba el formato viejo, no trabajo registrado.
  assert.equal(estadoDe(PARTE_VACIO, 'historico'), undefined);
  const conHistorico = { ...PARTE_VACIO, historicoCerradas: 3 };
  assert.equal(estadoDe(conHistorico, 'historico')?.estado, 'lleno');
  assert.equal(estadoDe(conHistorico, 'historico')?.cuantos, 3);
  // Y va al final, después del cierre: es de otro formato.
  assert.equal(seccionesDelParte(conHistorico).at(-1)?.id, 'historico');
});

prueba('el cierre se da por resuelto tanto si se cerró como si se anuló', () => {
  assert.equal(estadoDe(PARTE_VACIO, 'cierre')?.estado, 'vacio');
  assert.equal(estadoDe({ ...PARTE_VACIO, cerrado: true }, 'cierre')?.estado, 'lleno');
  // Un parte anulado ya no se llena: informar de que falta cerrarlo sería pedir
  // algo que no se puede hacer.
  assert.equal(estadoDe({ ...PARTE_VACIO, anulado: true }, 'cierre')?.estado, 'lleno');
});

/** Un parte con las siete secciones llenas y todo en regla. */
const PARTE_COMPLETO: ParteEvaluable = {
  maquinaria: [
    {
      codigo: 'VOL-01',
      claseMedidor: 'odometro',
      medidorInicial: 45210,
      medidorFinal: 45388,
      observaciones: 'Tres viajes a la cantera.',
    },
  ],
  personal: [{ nombre: 'Pedro Cartagena', entrada: '07:30', salida: '17:00' }],
  actividades: [{ id: 'act-1' }, { id: 'act-2' }],
  clima: [{}],
  laboratorio: [{}],
  notas: 'Sin novedad.',
};

/** Foto del día subida y una de las dos actividades con la suya. */
const FOTOS_COMPLETAS: FotosDelParte = { delDia: 1, itemsConFoto: ['act-2'] };

const SIN_FOTOS: FotosDelParte = { delDia: 0, itemsConFoto: [] };

prueba('un parte completo no tiene ningún bloqueo', () => {
  assert.deepEqual(bloqueosDelCierre(PARTE_COMPLETO, FOTOS_COMPLETAS), []);
});

prueba('un parte vacío nombra las siete secciones que faltan', () => {
  // Spec 004 / RF-50. Antes bastaba una máquina, una persona o una actividad;
  // OCC pidió que no se cierre sin haber diligenciado todo el parte.
  const vacio: ParteEvaluable = {
    maquinaria: [],
    personal: [],
    actividades: [],
    clima: [],
    laboratorio: [],
    notas: null,
  };
  assert.deepEqual(bloqueosDelCierre(vacio, SIN_FOTOS), [
    'Falta llenar: Maquinaria, Personal, Actividades, Clima, Control Calidad de Obra, Notas ' +
      'y Fotografía del día.',
  ]);
});

prueba('una sola sección vacía se nombra sola', () => {
  // Unas notas en blanco son notas sin escribir (006/RF-9).
  const bloqueos = bloqueosDelCierre({ ...PARTE_COMPLETO, notas: '   ' }, FOTOS_COMPLETAS);
  assert.deepEqual(bloqueos, ['Falta llenar: Notas.']);
});

prueba('una máquina sin observaciones no deja cerrar, y se nombra', () => {
  // Spec 004 / RF-51. Las observaciones de un parte anterior al cambio no
  // existen: se leen como vacías, y por eso se piden igual.
  const [maquina] = PARTE_COMPLETO.maquinaria;
  const sinObservaciones = { ...PARTE_COMPLETO, maquinaria: [{ ...maquina, observaciones: ' ' }] };
  assert.deepEqual(bloqueosDelCierre(sinObservaciones, FOTOS_COMPLETAS), [
    'VOL-01: faltan las observaciones del día.',
  ]);
  const { observaciones: _, ...anterior } = maquina;
  assert.deepEqual(
    bloqueosDelCierre({ ...PARTE_COMPLETO, maquinaria: [anterior] }, FOTOS_COMPLETAS),
    ['VOL-01: faltan las observaciones del día.'],
  );
});

prueba('una máquina sin lectura final no deja cerrar, y se nombra', () => {
  const [maquina] = PARTE_COMPLETO.maquinaria;
  const bloqueos = bloqueosDelCierre(
    { ...PARTE_COMPLETO, maquinaria: [{ ...maquina, medidorFinal: null }] },
    FOTOS_COMPLETAS,
  );
  assert.deepEqual(bloqueos, ['VOL-01: Falta la lectura final (km).']);
});

prueba('una persona sin hora de salida no deja cerrar, y se nombra', () => {
  const bloqueos = bloqueosDelCierre(
    {
      ...PARTE_COMPLETO,
      personal: [{ nombre: 'Pedro Cartagena', entrada: '07:30', salida: null }],
    },
    FOTOS_COMPLETAS,
  );
  assert.deepEqual(bloqueos, ['A Pedro Cartagena le falta la hora de entrada o de salida.']);
});

prueba('basta con que una actividad tenga foto', () => {
  // Spec 004 / RF-52, corregido el 2026-09-15: una, no todas.
  assert.deepEqual(
    bloqueosDelCierre(PARTE_COMPLETO, { delDia: 1, itemsConFoto: [] }),
    ['Falta la fotografía de al menos una actividad.'],
  );
  assert.deepEqual(
    bloqueosDelCierre(PARTE_COMPLETO, { delDia: 1, itemsConFoto: ['act-1'] }),
    [],
  );
});

prueba('la foto de una actividad que no se guardó no cuenta', () => {
  // Spec 004 / RF-48. La foto se sube mientras se llena la actividad; si esa
  // actividad se quita sin guardar, su foto queda en el almacén pero no es de
  // ninguna actividad del parte.
  assert.deepEqual(
    bloqueosDelCierre(PARTE_COMPLETO, { delDia: 1, itemsConFoto: ['act-descartada'] }),
    ['Falta la fotografía de al menos una actividad.'],
  );
});

prueba('los bloqueos salen agrupados: secciones, máquinas, personas y fotos', () => {
  const bloqueos = bloqueosDelCierre(
    {
      ...PARTE_COMPLETO,
      maquinaria: [
        {
          codigo: 'RET-02',
          claseMedidor: 'horometro',
          medidorInicial: null,
          medidorFinal: null,
          observaciones: '',
        },
      ],
      personal: [{ nombre: 'Ana Ruiz', entrada: null, salida: '17:00' }],
      clima: [],
    },
    { delDia: 1, itemsConFoto: [] },
  );
  assert.deepEqual(bloqueos, [
    'Falta llenar: Clima.',
    'RET-02: Falta la lectura inicial (h).',
    'RET-02: faltan las observaciones del día.',
    'A Ana Ruiz le falta la hora de entrada o de salida.',
    'Falta la fotografía de al menos una actividad.',
  ]);
});

/** Un domingo sin trabajo, con lo único que se le exige. */
const DIA_SIN_TRABAJO: ParteEvaluable = {
  maquinaria: [],
  personal: [],
  actividades: [],
  clima: [{}],
  laboratorio: [],
  notas: 'Domingo, obra cerrada.',
  sinTrabajo: true,
  motivoSinTrabajo: 'Domingo.',
};

prueba('un día sin trabajo se cierra con clima, notas y foto del día', () => {
  // Spec 004 / RF-54.
  assert.deepEqual(bloqueosDelCierre(DIA_SIN_TRABAJO, { delDia: 1, itemsConFoto: [] }), []);
  assert.deepEqual(bloqueosDelCierre(DIA_SIN_TRABAJO, SIN_FOTOS), [
    'Falta llenar: Fotografía del día.',
  ]);
  assert.deepEqual(
    bloqueosDelCierre({ ...DIA_SIN_TRABAJO, clima: [], notas: '' }, { delDia: 1, itemsConFoto: [] }),
    ['Falta llenar: Clima y Notas.'],
  );
});

prueba('un día sin trabajo exige el motivo', () => {
  // Spec 004 / RF-53.
  const sinMotivo = { ...DIA_SIN_TRABAJO, motivoSinTrabajo: '  ' };
  assert.equal(validarDiaSinTrabajo(sinMotivo), 'sin_motivo');
  assert.equal(validarDiaSinTrabajo({ ...DIA_SIN_TRABAJO, motivoSinTrabajo: null }), 'sin_motivo');
  assert.deepEqual(bloqueosDelCierre(sinMotivo, { delDia: 1, itemsConFoto: [] }), [
    mensajeDeDiaSinTrabajo('sin_motivo'),
  ]);
});

prueba('un día con trabajo registrado no se marca como día sin trabajo', () => {
  // Spec 004 / RF-55. Trabajar la mañana y llover la tarde no es día sin
  // trabajo: se cierra completo y la lluvia va en el clima.
  const conMaquina = { ...DIA_SIN_TRABAJO, maquinaria: PARTE_COMPLETO.maquinaria };
  assert.equal(validarDiaSinTrabajo(conMaquina), 'con_trabajo');
  assert.equal(
    validarDiaSinTrabajo({ ...DIA_SIN_TRABAJO, personal: PARTE_COMPLETO.personal }),
    'con_trabajo',
  );
  assert.equal(
    validarDiaSinTrabajo({ ...DIA_SIN_TRABAJO, actividades: PARTE_COMPLETO.actividades }),
    'con_trabajo',
  );
  assert.deepEqual(bloqueosDelCierre(conMaquina, { delDia: 1, itemsConFoto: [] })[0],
    mensajeDeDiaSinTrabajo('con_trabajo'));
  // Sin la marca, no hay nada que validar.
  assert.equal(validarDiaSinTrabajo(PARTE_COMPLETO), null);
  assert.equal(validarDiaSinTrabajo(DIA_SIN_TRABAJO), null);
});

prueba('en un día sin trabajo, el índice dice qué secciones no aplican', () => {
  // Spec 004 / RF-54. Maquinaria, personal, actividades y control de calidad
  // no se exigen; decir «sin registrar» invitaría a llenarlas.
  const conteos = { ...PARTE_VACIO, sinTrabajo: true };
  for (const id of ['maquinaria', 'personal', 'actividades', 'laboratorio']) {
    assert.equal(estadoDe(conteos, id)?.estado, 'no_aplica', id);
  }
  for (const id of ['clima', 'notas', 'fotografia']) {
    assert.equal(estadoDe(conteos, id)?.estado, 'vacio', id);
  }
});

prueba('la sección de laboratorio se llama Control Calidad de Obra', () => {
  // Spec 004 / RF-49. El id no cambia: es la llave con la que el índice salta.
  assert.equal(estadoDe(PARTE_VACIO, 'laboratorio')?.titulo, 'Control Calidad de Obra');
});

prueba('el rechazo del cierre nombra todo lo que falta, no solo lo primero', () => {
  // Spec 004 / RF-50. La ruta mandaba el primer bloqueo y paraba; el residente
  // descubría lo que faltaba de uno en uno a base de pulsar Cerrar.
  const bloqueos = [
    'Falta llenar: Clima y Notas.',
    'VOL-01: faltan las observaciones del día.',
    'Falta la fotografía de al menos una actividad.',
  ];
  assert.equal(
    mensajeDelRechazoDeCierre(bloqueos),
    'No se puede cerrar el parte todavía:\n' +
      '• Falta llenar: Clima y Notas.\n' +
      '• VOL-01: faltan las observaciones del día.\n' +
      '• Falta la fotografía de al menos una actividad.',
  );
  // Todos, sin recortar: con veinte máquinas sin observaciones son veinte renglones.
  const muchos = Array.from({ length: 20 }, (_, i) => `M-${i}: faltan las observaciones del día.`);
  assert.equal(mensajeDelRechazoDeCierre(muchos).split('\n').length, 21);
});

/* ── Guardar el parte (spec 004, T16) ── */

prueba('guardar una sección no borra las notas del día', () => {
  // Fallo encontrado en T15: `notas` convertía lo ausente en `null`, y guardar
  // la maquinaria vaciaba las notas. Ausente no toca; vacío sí borra.
  const soloMaquinaria = parteEditado.parse({ maquinaria: [] });
  assert.equal(soloMaquinaria.notas, undefined);
  assert.equal(parteEditado.parse({ notas: '' }).notas, null);
  assert.equal(parteEditado.parse({ notas: '   ' }).notas, null);
  assert.equal(parteEditado.parse({ notas: null }).notas, null);
  assert.equal(parteEditado.parse({ notas: ' Llovió. ' }).notas, 'Llovió.');
  // Lo mismo con el motivo del día sin trabajo.
  assert.equal(soloMaquinaria.motivoSinTrabajo, undefined);
  assert.equal(soloMaquinaria.sinTrabajo, undefined);
});

prueba('el contrato del parte pide unidad a «otra» y observación a cada ensayo', () => {
  // Spec 004, RF-67, RF-70, RF-72 y RF-73.
  const camposCon = (resultado: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) =>
    (resultado.error?.issues ?? []).map((i) => [i.path.join('.'), i.message]);
  const actividad = {
    id: 'act-1',
    descripcion: '',
    observaciones: '',
    longitud: null,
    ancho: null,
    alto: null,
    area: null,
    volumen: null,
  };

  // Otra sin unidad: el error va bajo `unidad`, con el texto de la regla.
  assert.deepEqual(
    camposCon(actividadDelParte.safeParse({ ...actividad, clave: 'otra', texto: 'Limpieza' })),
    [['unidad', MENSAJES_DE_ACTIVIDAD.sinUnidad]],
  );
  assert.deepEqual(
    camposCon(actividadDelParte.safeParse({ ...actividad, clave: 'otra', unidad: 'm3' })),
    [['texto', MENSAJES_DE_ACTIVIDAD.sinCual]],
  );
  // Una unidad que no es de las seis.
  const inventada = actividadDelParte.safeParse({ ...actividad, clave: 'otra', texto: 'Limpieza', unidad: 'mts' });
  assert.equal(inventada.success, false);
  assert.deepEqual(camposCon(inventada).map(([campo]) => campo), ['unidad']);
  // Completa, con cantidad; y una del presupuesto sin unidad ni cantidad.
  const otra = actividadDelParte.parse({ ...actividad, clave: 'otra', texto: 'Limpieza', unidad: 'm3', cantidad: 12.5 });
  assert.equal(otra.unidad, 'm3');
  assert.equal(otra.cantidad, 12.5);
  const delPresupuesto = actividadDelParte.parse({ ...actividad, clave: '4.1.8' });
  assert.equal(delPresupuesto.cantidad, null);
  assert.equal(actividadDelParte.safeParse({ ...actividad, clave: '10.1', cantidad: -3 }).success, false);

  // Un ensayo sin observación: bajo `observacion`, con el texto de la regla.
  assert.deepEqual(
    camposCon(ensayoDelParte.safeParse({ ensayo: 'espesor', observacion: '  ' })),
    [['observacion', faltaObservacionDelEnsayo('')]],
  );
  // Sin ensayo ni id no es nada.
  assert.deepEqual(camposCon(ensayoDelParte.safeParse({ observacion: 'x' })).map(([c]) => c), ['ensayo']);
  // Solo el id: una fila heredada que se conserva.
  assert.equal(ensayoDelParte.safeParse({ id: 'mat-1' }).success, true);

  // En el parte: el mismo ensayo dos veces y un material heredado por su id.
  const parte = parteEditado.parse({
    laboratorio: [
      { ensayo: 'densidad_en_campo', observacion: 'Lote 1' },
      { ensayo: 'densidad_en_campo', observacion: 'Sin observaciones' },
      { id: 'mat-1' },
    ],
  });
  assert.equal(parte.laboratorio?.length, 3);
  // Sin la unión transitoria (004/T29): el error del ensayo sale bajo su campo en el
  // parte, y un material nuevo con cantidad ya no entra.
  const sinObservacion = parteEditado.safeParse({ laboratorio: [{ ensayo: 'espesor', observacion: '' }] });
  assert.equal(sinObservacion.success, false);
  assert.deepEqual(camposCon(sinObservacion).map(([campo]) => campo), ['laboratorio.0.observacion']);
  assert.equal(parteEditado.safeParse({ laboratorio: [{ material: 'cemento', cantidad: 4 }] }).success, false);

  // Una actividad heredada viaja solo con su id: una «otra» vieja no tiene unidad y
  // no pasaría las exigencias de hoy, pero el servidor la conserva sin mirarla (T28).
  const conHeredada = parteEditado.parse({ actividades: [{ id: 'act-vieja' }, { ...actividad, clave: '4.1.8' }] });
  assert.equal(conHeredada.actividades?.length, 2);
  // Pero un id con más campos no es una heredada: sigue pidiendo lo de siempre, y el
  // error de «otra» sin unidad sigue saliendo bajo su campo.
  const otraIncompleta = parteEditado.safeParse({ actividades: [{ ...actividad, clave: 'otra', texto: 'Limpieza' }] });
  assert.equal(otraIncompleta.success, false);
  assert.ok(
    camposCon(otraIncompleta).some(([campo, mensaje]) => campo === 'actividades.0.unidad' && mensaje === MENSAJES_DE_ACTIVIDAD.sinUnidad),
    JSON.stringify(camposCon(otraIncompleta)),
  );
});

prueba('el servidor recalcula el área aunque llegue otra', () => {
  // Spec 004 / RF-58. Una petición hecha por fuera con área 99 no la guarda.
  const actividad = construirActividadDelParte({
    id: 'act-1',
    clave: 'otra',
    texto: 'Excavación',
    descripcion: '',
    observaciones: '',
    longitud: 3,
    ancho: 4,
    alto: null,
    area: 99,
    volumen: 7,
    unidad: 'm3',
  })!;
  assert.equal(actividad.area, 12);
  // Sin alto, el volumen es el que se escribió (RF-60).
  assert.equal(actividad.volumen, 7);
  // Y el id que trae se conserva: es a lo que apuntan sus fotos (RF-47).
  assert.equal(actividad.id, 'act-1');
});

prueba('una actividad del presupuesto se guarda con lo que dice el catálogo', () => {
  // Spec 004, RF-64, RF-66 a RF-70 y RF-74.
  const base = {
    id: 'act-2',
    texto: null,
    descripcion: 'Box coulvert PR 5',
    observaciones: '',
    longitud: 3,
    ancho: 4,
    alto: 0.5,
    area: null,
    volumen: null,
  };

  // La 4.1.8: nombre = descripción completa, ítem y unidad del catálogo aunque el
  // cliente mande otra unidad y otro texto; cantidad del volumen, no la escrita.
  const excavacion = construirActividadDelParte({
    ...base,
    clave: '4.1.8',
    texto: 'Otra cosa',
    unidad: 'kg',
    cantidad: 99,
  })!;
  assert.equal(excavacion.clave, '4.1.8');
  assert.equal(excavacion.item, '4.1.8');
  assert.equal(excavacion.nombre, actividadPorItem('4.1.8')!.descripcion);
  assert.equal(excavacion.unidad, 'm³');
  assert.equal(excavacion.cantidad, 6);
  assert.equal(excavacion.volumen, 6);
  assert.equal(excavacion.descripcion, 'Box coulvert PR 5');

  // La 10.1 (kg): con medidas, la cantidad es la escrita.
  const acero = construirActividadDelParte({ ...base, clave: '10.1', cantidad: 500 })!;
  assert.equal(acero.unidad, 'kg');
  assert.equal(acero.cantidad, 500);
  // Sin cantidad escrita, queda en blanco (RF-74).
  assert.equal(construirActividadDelParte({ ...base, clave: '10.1' })!.cantidad, null);

  // Otra actividad: su texto es el nombre, su unidad la elegida, sin ítem.
  const otra = construirActividadDelParte({
    ...base,
    clave: CLAVE_OTRA_ACTIVIDAD,
    texto: '  Limpieza de derrumbe ',
    unidad: 'm3',
    cantidad: null,
  })!;
  assert.equal(otra.nombre, 'Limpieza de derrumbe');
  assert.equal(otra.item, null);
  assert.equal(otra.unidad, 'm³');
  // En m³ con sus tres medidas, la cantidad sale del volumen como en una de la lista.
  assert.equal(otra.cantidad, 6);

  // Una clave que no es del presupuesto ni «otra» no se construye: ni las de la lista
  // de prueba, ni una otra sin unidad válida.
  assert.equal(construirActividadDelParte({ ...base, clave: 'excavacion' }), null);
  assert.equal(
    construirActividadDelParte({ ...base, clave: CLAVE_OTRA_ACTIVIDAD, texto: 'Algo', unidad: 'mts' }),
    null,
  );
});

prueba('un ensayo se guarda con su nombre y su observación, y puede repetirse', () => {
  // Spec 004, RF-61, RF-72 y RF-73.
  const densidad = construirEnsayo({ ensayo: 'densidad_en_campo', observacion: '  98 %, PR 5 + 300 ' })!;
  assert.equal(densidad.ensayo, 'densidad_en_campo');
  assert.equal(densidad.nombre, 'Densidad en campo');
  assert.equal(densidad.observacion, '98 %, PR 5 + 300');
  assert.ok(esEnsayo(densidad));
  assert.ok(densidad.id.length > 0);
  // Dos del mismo ensayo: dos filas distintas.
  const otraDensidad = construirEnsayo({ ensayo: 'densidad_en_campo', observacion: 'Sin observaciones' })!;
  assert.notEqual(otraDensidad.id, densidad.id);
  // Un ensayo que no es de la lista, o sin observación, no se construye.
  assert.equal(construirEnsayo({ ensayo: 'cemento', observacion: 'x' }), null);
  assert.equal(construirEnsayo({ ensayo: 'espesor', observacion: '  ' }), null);
  assert.equal(construirEnsayo({ id: 'mat-1' }), null);
});

prueba('las filas guardadas antes de los catálogos de OCC se conservan tal cual', () => {
  // Spec 004, RF-63 y RF-71. Lo que llega del navegador no las toca.
  const actividadVieja: ActividadDelParte = {
    id: 'act-vieja',
    clave: 'excavacion',
    nombre: 'Excavación',
    descripcion: 'Zanja',
    longitud: 2,
    ancho: 1,
    alto: null,
    area: 2,
    volumen: null,
    observaciones: '',
  };
  const actividadNueva = construirActividadDelParte({
    id: 'act-nueva',
    clave: '10.1',
    descripcion: '',
    observaciones: '',
    longitud: null,
    ancho: null,
    alto: null,
    area: null,
    volumen: null,
    cantidad: 300,
  })!;
  assert.equal(esActividadHeredada(actividadVieja), true);
  assert.equal(esActividadHeredada(actividadNueva), false);

  const pedidas = [
    // La heredada, con un nombre y unas medidas que no son las suyas.
    { id: 'act-vieja', clave: 'excavacion', texto: 'Otro nombre', descripcion: 'Cambiada', observaciones: '', longitud: 9, ancho: 9, alto: 9, area: null, volumen: null },
    // Una nueva que reclama el id de una fila **no** heredada: se construye, no se copia.
    { id: 'act-nueva', clave: '10.1', descripcion: '', observaciones: '', longitud: null, ancho: null, alto: null, area: null, volumen: null, cantidad: 450 },
    // Un id que no está guardado, con clave de prueba: no se construye.
    { id: 'act-ajena', clave: 'excavacion', descripcion: '', observaciones: '', longitud: null, ancho: null, alto: null, area: null, volumen: null },
  ];
  const actividades = conservarHeredadas(
    pedidas,
    [actividadVieja, actividadNueva],
    esActividadHeredada,
    construirActividadDelParte,
  );
  assert.deepEqual(actividades[0], actividadVieja);
  assert.equal(actividades[1]!.cantidad, 450);
  assert.equal(actividades[2], null);

  // Control de calidad: el material viejo llega solo con su id y se queda como estaba.
  const materialViejo: FilaDeControlDeCalidad = {
    id: 'mat-1',
    material: 'cemento',
    nombre: 'Cemento',
    cantidad: 4,
    unidad: 'bultos',
  };
  assert.equal(esMaterialHeredado(materialViejo), true);
  assert.equal(esEnsayo(materialViejo), false);
  const control = conservarHeredadas(
    [{ id: 'mat-1', ensayo: 'espesor', observacion: 'Intento de cambiarlo' }, { ensayo: 'espesor', observacion: 'Sin observaciones' }, { id: 'mat-ajeno' }],
    [materialViejo],
    esMaterialHeredado,
    construirEnsayo,
  );
  assert.deepEqual(control[0], materialViejo);
  assert.ok(control[1] && esEnsayo(control[1]));
  assert.equal(control[2], null);
});

prueba('un material heredado cuenta como Control Calidad de Obra lleno al cerrar', () => {
  // Spec 004, RF-50 con RF-63: la sección no se vacía por venir de la lista vieja.
  const bloqueos = bloqueosDelCierre(
    { ...PARTE_COMPLETO, laboratorio: [{ id: 'mat-1', material: 'cemento', nombre: 'Cemento', cantidad: 4, unidad: 'bultos' }] },
    FOTOS_COMPLETAS,
  );
  assert.ok(!bloqueos.some((b) => b.includes('Control Calidad de Obra')), bloqueos.join(' | '));
});

prueba('las observaciones de la máquina se guardan con ella', () => {
  // Spec 004 / RF-45.
  const maquina = construirMaquina(
    { vehiculoId: 'v-1', medidorInicial: 10, medidorFinal: 12, observaciones: 'Se varó a las 10.' },
    'RET-01',
    'horometro',
  );
  assert.equal(maquina.observaciones, 'Se varó a las 10.');
  assert.equal(
    construirMaquina({ vehiculoId: 'v-1' }, 'RET-01', 'horometro').observaciones,
    '',
  );
});

/** Un parte guardado normal, sin marca de día sin trabajo. */
const GUARDADO = {
  sinTrabajo: false,
  motivoSinTrabajo: null,
  maquinaria: [],
  personal: [],
  actividades: [],
};

prueba('marcar día sin trabajo guarda la marca y su motivo', () => {
  // Spec 004 / RF-53.
  assert.deepEqual(
    resolverDiaSinTrabajo(GUARDADO, { sinTrabajo: true, motivoSinTrabajo: 'Domingo.' }),
    { sinTrabajo: true, motivoSinTrabajo: 'Domingo.', error: null },
  );
  assert.equal(
    resolverDiaSinTrabajo(GUARDADO, { sinTrabajo: true, motivoSinTrabajo: null }).error,
    'sin_motivo',
  );
  // Sin motivo en la petición, vale el que ya estaba guardado.
  assert.equal(
    resolverDiaSinTrabajo(
      { ...GUARDADO, sinTrabajo: true, motivoSinTrabajo: 'Paro por lluvia.' },
      { sinTrabajo: true },
    ).error,
    null,
  );
});

prueba('no se marca día sin trabajo si ya hay trabajo guardado', () => {
  // Spec 004 / RF-55. Se mira lo guardado cuando la petición no trae la sección.
  const conMaquina = { ...GUARDADO, maquinaria: [{}] };
  assert.equal(
    resolverDiaSinTrabajo(conMaquina, { sinTrabajo: true, motivoSinTrabajo: 'Lluvia.' }).error,
    'con_trabajo',
  );
  // Y si la misma petición quita las máquinas, ya no hay contradicción.
  assert.equal(
    resolverDiaSinTrabajo(conMaquina, {
      sinTrabajo: true,
      motivoSinTrabajo: 'Lluvia.',
      maquinaria: [],
    }).error,
    null,
  );
});

prueba('en un día marcado sin trabajo no se registran máquinas', () => {
  // La misma contradicción, entrando por el otro lado.
  const marcado = { ...GUARDADO, sinTrabajo: true, motivoSinTrabajo: 'Domingo.' };
  assert.equal(resolverDiaSinTrabajo(marcado, { personal: [{}] }).error, 'con_trabajo');
});

prueba('quitar la marca de día sin trabajo borra su motivo', () => {
  // Un motivo sin marca no dice nada, y dejarlo haría creer que ese día no se trabajó.
  assert.deepEqual(
    resolverDiaSinTrabajo(
      { ...GUARDADO, sinTrabajo: true, motivoSinTrabajo: 'Domingo.' },
      { sinTrabajo: false },
    ),
    { sinTrabajo: false, motivoSinTrabajo: null, error: null },
  );
});


prueba('el jefe ve exactamente las máquinas que le faltan', () => {
  const flota = ['vol-01', 'vol-02', 'ret-01'];
  const completas = new Map([
    ['vol-01', true],
    ['ret-01', false],
  ]);
  assert.deepEqual(maquinasSinBitacora(flota, completas), ['vol-02', 'ret-01']);
  assert.deepEqual(maquinasSinBitacora(flota, new Map()), flota);
});


/* ------------------------------------------------------------------------ */
/* Fusión del pull con lo que ya hay en el teléfono                          */
/* ------------------------------------------------------------------------ */

const BASE: VehiculoLocal = {
  codigoInterno: 'RET-01',
  placa: null,
  tipoVehiculoId: 'retroexcavadora',
  marca: 'Case',
  modelo: 'CX210',
  obraId: 'obra-1',
  odometroKm: null,
  horometroH: 6430,
  medidorActualizadoEn: 1_000,
  estado: 'operativo',
  eliminadoEn: null,
};

console.log('\nFusión del pull\n');

prueba('el catálogo siempre lo manda el servidor', () => {
  const local: VehiculoLocal = { ...BASE, placa: 'VIEJA', marca: 'Mal escrito', obraId: 'obra-0' };
  const servidor: VehiculoLocal = { ...BASE, placa: 'ABC123', marca: 'Case', obraId: 'obra-2' };
  const fusionado = fusionarVehiculo(servidor, local);
  assert.equal(fusionado.placa, 'ABC123');
  assert.equal(fusionado.marca, 'Case');
  assert.equal(fusionado.obraId, 'obra-2');
});

prueba('el medidor se queda con el mayor valor, venga de donde venga', () => {
  // El caso normal: el teléfono va por delante porque acaba de capturar una
  // lectura que todavía no ha subido.
  const local: VehiculoLocal = { ...BASE, horometroH: 6439, medidorActualizadoEn: 9_000 };
  const servidor: VehiculoLocal = { ...BASE, horometroH: 6430, medidorActualizadoEn: 5_000 };
  const fusionado = fusionarVehiculo(servidor, local);
  assert.equal(fusionado.horometroH, 6439);
  assert.equal(fusionado.medidorActualizadoEn, 9_000);

  // Y al revés: si el servidor sabe más, gana el servidor.
  const alReves = fusionarVehiculo({ ...BASE, horometroH: 6500, medidorActualizadoEn: 9_000 }, BASE);
  assert.equal(alReves.horometroH, 6500);

  assert.equal(mayorMedidor(null, 10), 10);
  assert.equal(mayorMedidor(10, null), 10);
  assert.equal(mayorMedidor(null, null), null);
});

prueba('un NO APTO local sobrevive mientras quede una captura sin subir', () => {
  // El peor error posible del sistema sería poner en verde una máquina que el
  // operador inmovilizó. El servidor todavía no sabe por qué está roja.
  const local: VehiculoLocal = { ...BASE, estado: 'no_apto' };
  const servidor: VehiculoLocal = { ...BASE, estado: 'operativo' };
  const fusionado = fusionarVehiculo(servidor, local, { hayCapturaSinSubir: true });
  assert.equal(fusionado.estado, 'no_apto');
});

prueba('y deja de sobrevivir cuando ya no queda ninguna', () => {
  // Sin esto, una máquina reparada se quedaría roja para siempre: el servidor
  // no tendría forma de volver a ponerla operativa.
  const local: VehiculoLocal = { ...BASE, estado: 'no_apto' };
  const servidor: VehiculoLocal = { ...BASE, estado: 'operativo' };
  const fusionado = fusionarVehiculo(servidor, local, { hayCapturaSinSubir: false });
  assert.equal(fusionado.estado, 'operativo');
});

prueba('la baja del servidor se aplica aunque queden capturas pendientes', () => {
  // La fila se conserva —los preoperacionales guardados la referencian— pero
  // queda apagada.
  const fusionado = fusionarVehiculo(
    { ...BASE, eliminadoEn: 7_000 },
    { ...BASE, estado: 'no_apto' },
    { hayCapturaSinSubir: true },
  );
  assert.equal(fusionado.eliminadoEn, 7_000);
  assert.equal(fusionado.estado, 'no_apto');
});

prueba('un vehículo que este equipo no conocía entra tal cual', () => {
  const fusionado = fusionarVehiculo({ ...BASE, horometroH: 99 }, null);
  assert.equal(fusionado.horometroH, 99);
  assert.equal(fusionado.estado, 'operativo');
});


/* ------------------------------------------------------------------------ */
/* Reintentos de la cola de salida                                           */
/* ------------------------------------------------------------------------ */

console.log('\nReintentos de la subida\n');

prueba('la espera crece con cada fallo y no pasa del tope', () => {
  // En obra la señal va y viene: reintentar cada segundo no adelanta el envío y
  // sí vacía la batería de un equipo que tiene que aguantar la jornada.
  const esperas = [1, 2, 3, 4].map(esperaDeReintento);
  assert.deepEqual(esperas, [5_000, 10_000, 20_000, 40_000]);

  for (let intentos = 1; intentos < 40; intentos++) {
    assert.ok(esperaDeReintento(intentos) <= ESPERA_MAXIMA_MS);
  }
  assert.equal(esperaDeReintento(30), ESPERA_MAXIMA_MS);

  // Sin fallos no hay espera: el primer envío sale de inmediato.
  assert.equal(esperaDeReintento(0), 0);
});

prueba('los reintentos se acaban y la fila deja de volver sola a la cola', () => {
  const ahora = 1_000_000;

  const primero = siguienteIntento(0, ahora);
  assert.equal(primero.estado, 'pendiente');
  assert.equal(primero.intentos, 1);
  assert.equal(primero.proximoIntentoEn, ahora + 5_000);

  // Justo antes del tope todavía se reintenta.
  const penultimo = siguienteIntento(INTENTOS_MAXIMOS - 2, ahora);
  assert.equal(penultimo.estado, 'pendiente');
  assert.ok(penultimo.proximoIntentoEn > ahora);

  // Y al llegar, se rinde. `proximoIntentoEn` queda en 0: una fecha futura
  // sugeriría que va a volver sola, y no va.
  const ultimo = siguienteIntento(INTENTOS_MAXIMOS - 1, ahora);
  assert.equal(ultimo.estado, 'fallida');
  assert.equal(ultimo.intentos, INTENTOS_MAXIMOS);
  assert.equal(ultimo.proximoIntentoEn, 0);

  assert.equal(debeRendirse(INTENTOS_MAXIMOS - 1), false);
  assert.equal(debeRendirse(INTENTOS_MAXIMOS), true);
});

prueba('un error que reintentar no arregla se rinde de una vez', () => {
  // El vehículo ya no existe en el servidor, o el envío no valida. Gastar ocho
  // reintentos en eso solo retrasa que el operador se entere.
  const resultado = siguienteIntento(0, 1_000_000, { definitivo: true });
  assert.equal(resultado.estado, 'fallida');
  assert.equal(resultado.intentos, INTENTOS_MAXIMOS);
});


console.log('\nPermisos del panel\n');

prueba('la gerencia alcanza todos los módulos', () => {
  for (const modulo of MODULOS) {
    assert.ok(alcanza('admin', modulo, 'ver'), `gerencia debería entrar a ${modulo}`);
  }
  assert.deepEqual(modulosVisibles('admin'), [...MODULOS]);
});

prueba('el residente entra a inicio, asignaciones, bitácoras, preoperacionales, almacén y cantera', () => {
  // Spec 001 / RF-1, ampliado por 008 / RF-12: almacén y cantera, en consulta.
  assert.deepEqual(modulosVisibles('supervisor'), [
    'inicio',
    'asignaciones',
    'bitacoras',
    'preoperacionales',
    'almacen',
    'cantera',
  ]);
});

prueba('el residente no escribe en el maestro de la empresa', () => {
  // Esto es lo que hoy sí puede hacer, y es el motivo de la spec 001.
  for (const modulo of ['obras', 'personas', 'vehiculos'] as const) {
    assert.equal(alcanza('supervisor', modulo, 'escribir'), false, modulo);
    assert.equal(alcanza('supervisor', modulo, 'ver'), false, modulo);
  }
});

prueba('pero sí puede listar personas y vehículos', () => {
  // El caso que evita que alguien "arregle" el permiso de más y deje sin datos
  // a los selectores de Asignaciones y Bitácoras.
  assert.ok(alcanza('supervisor', 'personas', 'listar'));
  assert.ok(alcanza('supervisor', 'vehiculos', 'listar'));
});

prueba('el residente trabaja en asignaciones y bitácoras, y anula bitácoras', () => {
  assert.ok(alcanza('supervisor', 'asignaciones', 'escribir'));
  assert.ok(alcanza('supervisor', 'bitacoras', 'escribir'));
  assert.ok(alcanza('supervisor', 'bitacoras', 'anular'));
});

prueba('anular un preoperacional es solo de la gerencia', () => {
  assert.ok(alcanza('supervisor', 'preoperacionales', 'ver'));
  assert.equal(alcanza('supervisor', 'preoperacionales', 'anular'), false);
  assert.ok(alcanza('admin', 'preoperacionales', 'anular'));
});

prueba('emitir códigos de activación es solo de la gerencia', () => {
  assert.ok(alcanza('admin', 'personas', 'activar'));
  assert.equal(alcanza('supervisor', 'personas', 'activar'), false);
});

prueba('el operador no alcanza nada del panel', () => {
  assert.deepEqual(modulosVisibles('operador'), []);
  for (const modulo of MODULOS) {
    for (const accion of ['ver', 'listar', 'escribir', 'anular', 'activar'] as const) {
      assert.equal(alcanza('operador', modulo, accion), false, `${modulo}/${accion}`);
    }
  }
});

prueba('nadie reparte más permisos de los que tiene', () => {
  assert.equal(puedeCambiarRol('supervisor', 'admin'), false);
  assert.ok(puedeCambiarRol('supervisor', 'supervisor'));
  assert.ok(puedeCambiarRol('supervisor', 'operador'));
  assert.ok(puedeCambiarRol('admin', 'admin'));
});

/* ── Almacenista y Encargado de Planta (spec 008) ── */

prueba('el almacenista solo entra al almacén', () => {
  // Spec 008 / RF-2.
  assert.deepEqual(modulosVisibles('almacenista'), ['almacen']);
});

prueba('el encargado de planta solo entra a control cantera', () => {
  // Spec 008 / RF-3.
  assert.deepEqual(modulosVisibles('encargado_planta'), ['cantera']);
});

prueba('los roles nuevos no tocan nada de los módulos que ya había', () => {
  // Spec 008 / RF-8 y H3: ni ver, ni listar, ni escribir. Tampoco el inicio.
  const existentes = ['inicio', 'obras', 'personas', 'vehiculos', 'asignaciones', 'bitacoras', 'preoperacionales'] as const;
  for (const rol of ['almacenista', 'encargado_planta'] as const) {
    for (const modulo of existentes) {
      for (const accion of ['ver', 'listar', 'escribir', 'anular', 'activar'] as const) {
        assert.equal(alcanza(rol, modulo, accion), false, `${rol} ${modulo}/${accion}`);
      }
    }
  }
  // Y cada uno está fuera del módulo del otro.
  assert.equal(alcanza('almacenista', 'cantera', 'ver'), false);
  assert.equal(alcanza('encargado_planta', 'almacen', 'ver'), false);
});

prueba('almacenista y encargado de planta llevan su módulo entero', () => {
  for (const [rol, modulo] of [['almacenista', 'almacen'], ['encargado_planta', 'cantera']] as const) {
    for (const accion of ['ver', 'listar', 'escribir'] as const) {
      assert.ok(alcanza(rol, modulo, accion), `${rol} ${modulo}/${accion}`);
    }
  }
  // El encargado de planta sigue anulando sus viajes (spec 010); el almacenista
  // ya no anula sus movimientos (spec 009, RF-38).
  assert.ok(alcanza('encargado_planta', 'cantera', 'anular'));
  assert.equal(alcanza('almacenista', 'almacen', 'anular'), false);
});

prueba('en el almacén solo anula la gerencia', () => {
  // Spec 009 / RF-38 y RF-39: lo pidió gerencia el 2026-09-17. Escribir no cambia.
  assert.ok(alcanza('almacenista', 'almacen', 'escribir'));
  assert.equal(alcanza('almacenista', 'almacen', 'anular'), false);
  assert.ok(alcanza('admin', 'almacen', 'anular'));
  assert.equal(alcanza('supervisor', 'almacen', 'anular'), false);
  // Y el 403 de la guardia nombra a quien sí puede (spec 008, RF-13).
  assert.equal(
    motivoDeRechazo('almacen', 'anular'),
    'No puede anular este registro: lo hace la gerencia.',
  );
});

prueba('la gerencia registra en almacén y cantera; el residente solo consulta', () => {
  // Spec 008 / RF-11, RF-12, RF-13.
  for (const modulo of ['almacen', 'cantera'] as const) {
    for (const accion of ['ver', 'listar', 'escribir', 'anular'] as const) {
      assert.ok(alcanza('admin', modulo, accion), `admin ${modulo}/${accion}`);
    }
    assert.ok(alcanza('supervisor', modulo, 'ver'), `supervisor ${modulo}/ver`);
    assert.ok(alcanza('supervisor', modulo, 'listar'), `supervisor ${modulo}/listar`);
    assert.equal(alcanza('supervisor', modulo, 'escribir'), false, `supervisor ${modulo}/escribir`);
    assert.equal(alcanza('supervisor', modulo, 'anular'), false, `supervisor ${modulo}/anular`);
  }
  assert.deepEqual(modulosVisibles('supervisor'), [
    'inicio',
    'asignaciones',
    'bitacoras',
    'preoperacionales',
    'almacen',
    'cantera',
  ]);
});

prueba('solo la gerencia da los accesos de almacén y de planta', () => {
  // Spec 008 / RF-17. No están «por encima» del residente: son otros.
  for (const destino of ['almacenista', 'encargado_planta'] as const) {
    assert.ok(puedeCambiarRol('admin', destino), destino);
    assert.equal(puedeCambiarRol('supervisor', destino), false, destino);
    assert.equal(puedeCambiarRol('almacenista', destino), false, destino);
    assert.equal(puedeCambiarRol('encargado_planta', destino), false, destino);
  }
  // Y ellos no reparten acceso a nadie.
  assert.equal(puedeCambiarRol('almacenista', 'operador'), false);
  assert.equal(puedeCambiarRol('encargado_planta', 'supervisor'), false);
});

prueba('el rechazo de dar un acceso dice quién puede darlo', () => {
  // Spec 008 / RF-17 y el requisito no funcional de 001: qué no se puede y quién sí.
  assert.equal(
    motivoParaNoDarRol('supervisor', 'almacenista'),
    'Solo la gerencia puede dar el acceso de Almacenista.',
  );
  assert.equal(
    motivoParaNoDarRol('supervisor', 'encargado_planta'),
    'Solo la gerencia puede dar el acceso de Encargado de Planta.',
  );
  assert.equal(
    motivoParaNoDarRol('supervisor', 'admin'),
    'Solo la gerencia puede dar el acceso de Gerencia.',
  );
  // Si se puede, no hay motivo.
  assert.equal(motivoParaNoDarRol('admin', 'almacenista'), null);
  assert.equal(motivoParaNoDarRol('supervisor', 'operador'), null);
});

prueba('el rechazo del servidor dice quién sí puede hacerlo', () => {
  // Spec 008 / RF-13: al residente no se le dice que registrar en el almacén «es
  // de la gerencia», porque también lo hace el almacenista.
  assert.equal(
    motivoDeRechazo('almacen', 'escribir'),
    'No puede crear o modificar este registro: lo hacen la gerencia y el almacenista.',
  );
  assert.equal(
    motivoDeRechazo('cantera', 'anular'),
    'No puede anular este registro: lo hacen la gerencia y el encargado de planta.',
  );
  // Donde solo escribe la gerencia, el texto dice lo mismo que antes, con otras palabras.
  assert.equal(
    motivoDeRechazo('obras', 'escribir'),
    'No puede crear o modificar este registro: lo hace la gerencia.',
  );
  // Al almacenista que abre Bitácoras se le dice quién la lleva.
  assert.equal(
    motivoDeRechazo('bitacoras', 'listar'),
    'No puede consultar este listado: lo hacen la gerencia y el residente o el director.',
  );
});

prueba('una cuenta sin obra se detecta para todo el que no es gerencia', () => {
  // Spec 008 / RF-6: el almacenista sin obra no ve nada y se le dice por qué.
  assert.equal(sinObraAsignada('almacenista', null), true);
  assert.equal(sinObraAsignada('encargado_planta', null), true);
  assert.equal(sinObraAsignada('supervisor', null), true);
  assert.equal(sinObraAsignada('almacenista', 'obra-1'), false);
  // La gerencia no está adscrita a ninguna obra, y eso no es un fallo de su cuenta.
  assert.equal(sinObraAsignada('admin', null), false);
});

prueba('la barra de la gerencia con nueve módulos no cabe en un renglón', () => {
  // Las medidas de Chrome del 2026-09-15: nueve enlaces que suman 884 más 8
  // separaciones de 4, en 1232 de ancho útil. Con la marca de 229 y la cuenta de
  // 160, el lado más ancho manda en los dos: 458 + 916 + 32 = 1406 > 1232.
  const nueve = [67, 70, 88, 92, 115, 90, 141, 89, 132];
  const base = { anchoDisponible: 1232, marca: 229, cuenta: 160, separacionEnlaces: 4, separacionLados: 16 };
  assert.equal(barraCabeEnUnRenglon({ ...base, enlaces: nueve }), false);
  // Los seis del residente sí caben: 458 + (634 + 5 × 4) + 32 = 1144.
  assert.equal(barraCabeEnUnRenglon({ ...base, enlaces: [67, 115, 90, 141, 89, 132] }), true);
  // El lado más ancho es el que manda, no la suma de los dos.
  assert.equal(
    barraCabeEnUnRenglon({ anchoDisponible: 100, marca: 30, cuenta: 10, enlaces: [20], separacionEnlaces: 0, separacionLados: 5 }),
    true,
  );
  assert.equal(
    barraCabeEnUnRenglon({ anchoDisponible: 89, marca: 30, cuenta: 10, enlaces: [20], separacionEnlaces: 0, separacionLados: 5 }),
    false,
  );
});

prueba('cada rol entra por su módulo', () => {
  // Spec 008 / RF-4.
  assert.equal(moduloDeEntrada('admin'), 'inicio');
  assert.equal(moduloDeEntrada('supervisor'), 'inicio');
  assert.equal(moduloDeEntrada('almacenista'), 'almacen');
  assert.equal(moduloDeEntrada('encargado_planta'), 'cantera');
  assert.equal(moduloDeEntrada('operador'), null);
});

prueba('el aviso de módulo ajeno dice dónde está el trabajo de cada quien', () => {
  // Spec 008 / RF-7: a un almacenista no se le dice que Bitácoras «es de la gerencia».
  assert.equal(
    avisoDeModuloAjeno('almacenista', 'bitacoras'),
    'Este módulo no es de su cargo. Su trabajo está en Almacén.',
  );
  assert.equal(
    avisoDeModuloAjeno('encargado_planta', 'almacen'),
    'Este módulo no es de su cargo. Su trabajo está en Control Cantera.',
  );
  // Para el residente se conserva el texto de 001/RF-3.
  assert.equal(
    avisoDeModuloAjeno('supervisor', 'obras'),
    'Este módulo es de la gerencia. Si necesita registrar o corregir algo aquí, pídaselo a quien lleve la administración.',
  );
  // Si sí lo alcanza, no hay aviso.
  assert.equal(avisoDeModuloAjeno('almacenista', 'almacen'), null);
});

/** Una sesión de mentira, con lo justo para preguntarle al alcance. */
function sesionDe(rol: Rol, obraId: string | null): PersonaEnSesion {
  return {
    id: 'u1',
    usuario: 'prueba',
    nombreCompleto: 'Persona de prueba',
    rol,
    obraId,
    debeCambiarClave: false,
  };
}

prueba('la gerencia alcanza cualquier obra y no filtra por ninguna', () => {
  const gerencia = sesionDe('admin', null);
  assert.equal(filtroDeObra(gerencia, vehiculos.obraId), undefined);
  assert.ok(alcanzaLaObra(gerencia, 'obra-a'));
  assert.ok(alcanzaLaObra(gerencia, null));
});

prueba('el residente alcanza su obra y las filas sin obra', () => {
  const residente = sesionDe('supervisor', 'obra-a');
  assert.notEqual(filtroDeObra(residente, vehiculos.obraId), undefined);
  assert.ok(alcanzaLaObra(residente, 'obra-a'));
  assert.ok(alcanzaLaObra(residente, null));
  assert.equal(alcanzaLaObra(residente, 'obra-b'), false);
});

prueba('un residente sin obra asignada no alcanza nada', () => {
  // Antes de la spec 001 esto devolvía «sin filtro» y `true`: una cuenta a
  // medio configurar veía más que una bien puesta. Si alguien vuelve a
  // ponerlo así, esta comprobación es lo único que lo va a decir.
  const suelto = sesionDe('supervisor', null);
  assert.notEqual(filtroDeObra(suelto, vehiculos.obraId), undefined);
  assert.equal(alcanzaLaObra(suelto, 'obra-a'), false);
  assert.equal(alcanzaLaObra(suelto, null), false);
});

console.log('\nCargos de la obra\n');

prueba('la marca de «sin formato» cuadra con las plantillas que existen', () => {
  // Spec 003 / RF-3. Es la comprobación que impide que la marca y la realidad
  // se separen: el día que llegue el Excel de la recicladora, quitar la marca
  // sin añadir la plantilla —o al revés— falla aquí y no en obra.
  for (const tipo of TIPOS_VEHICULO) {
    const tiene = PLANTILLAS_POR_TIPO.has(tipo.id);
    assert.equal(tiene, !tipo.sinFormato, `${tipo.id}: marca y plantilla no cuadran`);
  }
  assert.deepEqual(
    TIPOS_VEHICULO.filter((x) => x.sinFormato).map((x) => x.id),
    ['vibrocompactadora', 'recicladora'],
  );
});

prueba('cada tipo de equipo con formato tiene posiciones de llanta', () => {
  // Spec 003 / RF-9. La lista es fija a propósito: si la posición se escribiera
  // a mano, la misma rueda acabaría registrada de tres maneras y no habría
  // seguimiento posible.
  for (const tipo of TIPOS_VEHICULO) {
    const posiciones = posicionesDe(tipo.id);
    const ids = posiciones.map((p) => p.id);
    assert.equal(new Set(ids).size, ids.length, `${tipo.id}: posiciones repetidas`);
  }
  assert.equal(posicionesDe('camioneta').length, 5);
  // Doble troque: dirección sencilla, dos ejes de rueda doble y el repuesto.
  assert.equal(posicionesDe('volqueta').length, 11);
  assert.equal(posicionesDe('motoniveladora').length, 6);
});

prueba('una posición inventada no pertenece a ningún equipo', () => {
  assert.equal(posicionesDe('volqueta').some((p) => p.id === 'tandem_izquierda_trasera'), false);
  assert.deepEqual(posicionesDe('inventado'), []);
  assert.equal(nombreDePosicion('camioneta', 'delantera_izquierda'), 'Delantera izquierda');
});

prueba('se avisa cuando a la llanta le queda 30% de vida o menos', () => {
  // Spec 003 / RF-14. El acuerdo fue «cuando llegue al 30%», que en obra
  // significa 30% de vida restante: gastada al 70%. Leerlo al revés marcaría la
  // flota entera, así que esta comprobación es la que fija el sentido.
  assert.equal(hayQueCambiar(69), false);
  assert.equal(hayQueCambiar(70), true);
  assert.equal(hayQueCambiar(100), true);
  assert.equal(vidaUtilRestante(DESGASTE_PARA_CAMBIO), 30);
});

prueba('una llanta sin medir no se marca como gastada', () => {
  // Marcar en rojo lo que no se sabe hace que se deje de mirar el rojo.
  assert.equal(hayQueCambiar(null), false);
  assert.equal(hayQueCambiar(undefined), false);
  assert.equal(hayQueCambiar(0), false);
});

console.log('\nFestivos y horas de la obra\n');

prueba('los festivos de un año no se repiten', () => {
  for (const anio of [2025, 2026, 2027]) {
    const dias = festivosDe(anio);
    assert.equal(new Set(dias).size, dias.length, `${anio}: hay festivos repetidos`);
  }
  // Normalmente son dieciocho, pero dos celebraciones pueden caer en el mismo
  // lunes: en 2025 el Sagrado Corazón y San Pedro coincidieron el 30 de junio,
  // y ese año tuvo diecisiete días festivos.
  assert.equal(festivosDe(2026).length, 18);
  assert.equal(festivosDe(2025).length, 17);
  assert.ok(esFestivo('2025-06-30'));
});

prueba('los de la ley Emiliani caen siempre en lunes', () => {
  // Reyes, San José, San Pedro, Asunción, Raza, Todos los Santos y Cartagena se
  // corren al lunes siguiente; los de Semana Santa que se corren, también.
  const anio = 2026;
  const dias = festivosDe(anio);
  const fijos = new Set([
    `${anio}-01-01`,
    `${anio}-05-01`,
    `${anio}-07-20`,
    `${anio}-08-07`,
    `${anio}-12-08`,
    `${anio}-12-25`,
  ]);
  const santos = new Set([`${anio}-04-02`, `${anio}-04-03`]);
  for (const dia of dias) {
    if (fijos.has(dia) || santos.has(dia)) continue;
    assert.equal(diaDeLaSemana(dia), 1, `${dia} debería ser lunes`);
  }
});

prueba('la Semana Santa de 2026 cae donde dice el calendario', () => {
  // Anclado a una fecha comprobada: Domingo de Resurrección el 5 de abril de
  // 2026, con Jueves y Viernes Santo el 2 y el 3. Si el cálculo de la Pascua se
  // desviara una semana, todo lo demás seguiría cuadrando menos esto.
  assert.equal(domingoDePascua(2026), '2026-04-05');
  assert.ok(esFestivo('2026-04-02'));
  assert.ok(esFestivo('2026-04-03'));
  assert.equal(esFestivo('2026-04-05'), false, 'el domingo de Pascua no es festivo de ley');
});

prueba('domingos y festivos se tratan igual', () => {
  assert.ok(esDominicalOFestivo('2026-04-05')); // domingo
  assert.ok(esDominicalOFestivo('2026-01-01')); // festivo fijo
  assert.equal(esDominicalOFestivo('2026-09-09'), false); // miércoles cualquiera
});

prueba('la jornada completa son ocho horas y ninguna extra', () => {
  const d = desglosarJornada('2026-09-09', '07:30', '17:00');
  assert.ok(d);
  assert.equal(d.trabajados, 480);
  assert.equal(d.ordinarios, 480);
  assert.equal(d.extra, 0);
  assert.equal(d.nocturnos, 0);
  assert.equal(d.dominicalOFestivo, false);
});

prueba('el almuerzo no se cuenta como trabajado', () => {
  // Quien entra a las 13:30 no almorzó dentro de su jornada: sus tres horas y
  // media son tres horas y media, no cinco.
  const d = desglosarJornada('2026-09-09', '13:30', '17:00');
  assert.ok(d);
  assert.equal(d.trabajados, 210);
  assert.equal(d.extra, 0);
});

prueba('lo que pasa de la jornada es hora extra', () => {
  const d = desglosarJornada('2026-09-09', '07:30', '19:00');
  assert.ok(d);
  assert.equal(d.trabajados, 600); // 11 h y media menos hora y media de almuerzo
  assert.equal(d.ordinarios, 480);
  assert.equal(d.extra, 120);
  assert.equal(d.nocturnos, 0, 'a las 19:00 en punto todavía no hay recargo');
});

prueba('el recargo nocturno empieza a las siete de la noche', () => {
  // Ley 2466 de 2025: antes empezaba a las nueve. Si alguien vuelve a poner las
  // 21:00, esto es lo que lo va a decir.
  const d = desglosarJornada('2026-09-09', '13:30', '21:00');
  assert.ok(d);
  assert.equal(d.nocturnos, 120);
});

prueba('una jornada que cruza la medianoche se cuenta entera', () => {
  const d = desglosarJornada('2026-09-09', '20:00', '02:00');
  assert.ok(d);
  assert.equal(d.trabajados, 360);
  assert.equal(d.nocturnos, 360, 'de 20:00 a 02:00 todo es nocturno');
  assert.equal(d.extra, 0, 'seis horas seguidas no llegan a la jornada ordinaria');
});

prueba('trabajar en domingo queda marcado', () => {
  const d = desglosarJornada('2026-04-05', '07:30', '17:00');
  assert.ok(d);
  assert.equal(d.dominicalOFestivo, true);
});

prueba('un horario imposible se rechaza y no se desglosa', () => {
  assert.equal(validarHorario(null, '17:00'), 'falta_entrada');
  assert.equal(validarHorario('07:30', null), 'falta_salida');
  assert.equal(validarHorario('07:30', '07:30'), 'salida_antes');
  assert.equal(validarHorario('07:30', '01:00'), 'jornada_imposible');
  assert.equal(desglosarJornada('2026-09-09', '07:30', '07:30'), null);
  assert.equal(minutosDeHora('25:00'), null);
});

prueba('los tramos de clima no pueden pisarse', () => {
  const bien = [
    { desde: '07:30', hasta: '10:00' },
    { desde: '10:00', hasta: '15:00' },
    { desde: '15:30', hasta: '17:30' },
  ];
  assert.equal(validarFranjas(bien), null, 'tocarse en el borde no es pisarse');

  const pisados = [
    { desde: '07:00', hasta: '11:00' },
    { desde: '10:00', hasta: '12:00' },
  ];
  assert.deepEqual(validarFranjas(pisados), { tipo: 'solape', primera: 0, segunda: 1 });
});

prueba('un tramo de clima que termina antes de empezar se rechaza', () => {
  // Al contrario que la jornada de una persona, aquí no hay medianoche que
  // cruzar: el clima se registra dentro del día de la obra.
  assert.deepEqual(validarFranjas([{ desde: '15:00', hasta: '09:00' }]), {
    tipo: 'invertida',
    indice: 0,
  });
});

prueba('los tramos de clima pueden cubrir la jornada completa', () => {
  // El ejemplo que se pidió: llovió de 7 a 10, salió el sol hasta las 3 y
  // quedó nublado hasta las 5:30.
  const dia = [
    { desde: '07:00', hasta: '10:00' },
    { desde: '10:00', hasta: '15:00' },
    { desde: '15:00', hasta: '17:30' },
  ];
  assert.equal(validarFranjas(dia), null);
  assert.equal(cubrenLaJornada(dia), true);
  assert.equal(minutosCubiertos(dia), 630);

  // Con un hueco entre las 12 y las 13:30 no se cubre.
  assert.equal(
    cubrenLaJornada([
      { desde: '07:30', hasta: '12:00' },
      { desde: '13:30', hasta: '17:00' },
    ]),
    false,
  );
});

prueba('el área de una actividad es largo por ancho', () => {
  // Spec 004 / RF-58. Lo escrito a mano en el área no cuenta cuando se puede
  // calcular: si no, un 99 tecleado por error se quedaría como dato.
  const medidas = calcularDimensiones({ longitud: 3, ancho: 4, alto: null, area: 99, volumen: null });
  assert.equal(medidas.area, 12);
  assert.equal(medidas.areaCalculada, true);
});

prueba('la cantidad de una actividad sale de la medida que corresponde a su unidad', () => {
  // Spec 004, RF-67 a RF-69 y RF-74. Se resuelve sobre las medidas ya resueltas:
  // el volumen y el área son los que se ven, calculados o escritos.
  const medidas = (longitud: number | null, ancho: number | null, alto: number | null, area: number | null = null, volumen: number | null = null) =>
    calcularDimensiones({ longitud, ancho, alto, area, volumen });

  // m³ con sus tres medidas: el volumen, y lo escrito a mano no cuenta.
  assert.deepEqual(resolverCantidad('m3', medidas(3, 4, 0.5), 99), {
    cantidad: 6,
    cantidadCalculada: true,
    origen: 'volumen',
  });
  // m³ sin alto: no hay volumen, se escribe a mano.
  assert.deepEqual(resolverCantidad('m3', medidas(3, 4, null), 9), {
    cantidad: 9,
    cantidadCalculada: false,
    origen: null,
  });
  // m³ con el volumen escrito a mano y sin medidas: RF-68 dice «tenga volumen».
  assert.deepEqual(resolverCantidad('m3', medidas(null, null, null, null, 7), null), {
    cantidad: 7,
    cantidadCalculada: true,
    origen: 'volumen',
  });
  // m²: el área. m: la longitud.
  assert.equal(resolverCantidad('m2', medidas(3, 4, null), null).cantidad, 12);
  assert.equal(resolverCantidad('m2', medidas(3, 4, null), null).origen, 'area');
  assert.deepEqual(resolverCantidad('m', medidas(25, null, null), 3), {
    cantidad: 25,
    cantidadCalculada: true,
    origen: 'longitud',
  });
  // kg, Und y m³-km: las medidas no dan cuánto se hizo, aunque las haya.
  assert.deepEqual(resolverCantidad('kg', medidas(3, 4, 0.5), 500), {
    cantidad: 500,
    cantidadCalculada: false,
    origen: null,
  });
  assert.equal(resolverCantidad('m3_km', medidas(3, 4, 0.5), 1200).cantidad, 1200);
  // Und sin nada escrito: queda en blanco, no es obligatoria (RF-74).
  assert.deepEqual(resolverCantidad('und', medidas(null, null, null), null), {
    cantidad: null,
    cantidadCalculada: false,
    origen: null,
  });
  // Sin unidad (una actividad heredada): nada se calcula.
  assert.equal(resolverCantidad(null, medidas(3, 4, 0.5), null).cantidad, null);
  // La regla escribe las claves m3, m2 y m sin importar el catálogo: tienen que
  // seguir siendo claves del catálogo, o la cantidad dejaría de calcularse sin avisar.
  for (const clave of ['m3', 'm2', 'm']) assert.ok(IDS_UNIDAD_DE_ACTIVIDAD.includes(clave), clave);
});

prueba('a «Otra actividad» se le exige cuál fue y su unidad', () => {
  // Spec 004, RF-24 y RF-70. Cada falta bajo su campo.
  assert.deepEqual(faltasDeActividad({ otra: true, texto: '', unidad: null }), [
    { campo: 'texto', mensaje: MENSAJES_DE_ACTIVIDAD.sinCual },
    { campo: 'unidad', mensaje: MENSAJES_DE_ACTIVIDAD.sinUnidad },
  ]);
  assert.deepEqual(faltasDeActividad({ otra: true, texto: '   ', unidad: 'm3' }), [
    { campo: 'texto', mensaje: MENSAJES_DE_ACTIVIDAD.sinCual },
  ]);
  assert.deepEqual(faltasDeActividad({ otra: true, texto: 'Limpieza de derrumbe', unidad: null }), [
    { campo: 'unidad', mensaje: MENSAJES_DE_ACTIVIDAD.sinUnidad },
  ]);
  assert.deepEqual(faltasDeActividad({ otra: true, texto: 'Limpieza de derrumbe', unidad: 'm3' }), []);
  // Una actividad del presupuesto trae nombre y unidad del catálogo: no le falta nada.
  assert.deepEqual(faltasDeActividad({ otra: false, texto: null, unidad: null }), []);
});

prueba('un ensayo sin observación se rechaza y «Sin observaciones» vale', () => {
  // Spec 004, RF-72.
  const falta = faltaObservacionDelEnsayo('');
  assert.ok(falta);
  assert.match(falta, /Sin observaciones/);
  assert.equal(faltaObservacionDelEnsayo('   \n  '), falta);
  assert.equal(faltaObservacionDelEnsayo(null), falta);
  assert.equal(faltaObservacionDelEnsayo('Sin observaciones'), null);
  assert.equal(faltaObservacionDelEnsayo('Densidad 98 %, lote PR 5'), null);
});

prueba('sin ancho, el área es la que se escribió', () => {
  // Spec 004 / RF-60. No todas las actividades se miden en largo y ancho: una
  // limpieza de zona puede traer solo el área.
  const medidas = calcularDimensiones({ longitud: 3, ancho: null, alto: null, area: 25, volumen: null });
  assert.equal(medidas.area, 25);
  assert.equal(medidas.areaCalculada, false);
  // Y sin nada escrito, queda en blanco: cero sería inventarse una medida.
  assert.equal(
    calcularDimensiones({ longitud: 3, ancho: null, alto: null, area: null, volumen: null }).area,
    null,
  );
});

prueba('el volumen de una actividad es largo por ancho por alto', () => {
  // Spec 004 / RF-59.
  const medidas = calcularDimensiones({ longitud: 2, ancho: 3, alto: 0.5, area: null, volumen: 7 });
  assert.equal(medidas.volumen, 3);
  assert.equal(medidas.volumenCalculado, true);
  assert.equal(medidas.area, 6);
});

prueba('sin alto, el volumen es el que se escribió', () => {
  // Spec 004 / RF-60. El área sí se calcula, porque tiene sus dos factores.
  const medidas = calcularDimensiones({ longitud: 2, ancho: 3, alto: null, area: null, volumen: 40 });
  assert.equal(medidas.volumen, 40);
  assert.equal(medidas.volumenCalculado, false);
  assert.equal(medidas.area, 6);
  assert.equal(medidas.areaCalculada, true);
});

prueba('área y volumen calculados se redondean a dos decimales', () => {
  // 1,15 × 1,15 = 1,3225 y 0,1 × 0,2 da 0,020000000000000004 en coma flotante:
  // ninguno de los dos debe llegar así a la pantalla ni a la base.
  assert.equal(
    calcularDimensiones({ longitud: 1.15, ancho: 1.15, alto: null, area: null, volumen: null }).area,
    1.32,
  );
  assert.equal(
    calcularDimensiones({ longitud: 0.1, ancho: 0.2, alto: 1, area: null, volumen: null }).volumen,
    0.02,
  );
  // Un valor escrito a mano no se toca: es lo que el residente midió.
  assert.equal(
    calcularDimensiones({ longitud: null, ancho: null, alto: null, area: 10.456, volumen: null }).area,
    10.456,
  );
});

prueba('las condiciones de clima se nombran como se leen', () => {
  // Spec 004, RF-26. Hasta el 2026-09-16 este caso probaba también los materiales de
  // laboratorio, que salieron con la tarea 004/T29.
  assert.equal(nombreDeClima('lloviendo'), 'Lloviendo');
  assert.equal(nombreDeClima('inventado'), 'inventado');
});

prueba('las actividades del parte son las del presupuesto de OCC, cada una con su unidad', () => {
  // Spec 004, RF-64 a RF-66 y anexo B.
  const items = ACTIVIDADES_DEL_PRESUPUESTO.map((a) => a.item);
  assert.equal(ACTIVIDADES_DEL_PRESUPUESTO.length, 31);
  assert.equal(new Set(items).size, 31, 'un ítem repetido');
  // «otra» es la salida para lo que no está en la lista, no una actividad de ella.
  assert.ok(!items.includes(CLAVE_OTRA_ACTIVIDAD));
  // El JSON generado solo puede usar las seis claves del catálogo.
  for (const actividad of ACTIVIDADES_DEL_PRESUPUESTO) {
    assert.ok(IDS_UNIDAD_DE_ACTIVIDAD.includes(actividad.unidad), `${actividad.item}: ${actividad.unidad}`);
    assert.ok(actividad.descripcion.length > 0, actividad.item);
  }

  const unidadDe = (item: string) => etiquetaDeUnidad(actividadPorItem(item)!.unidad);
  assert.equal(unidadDe('4.1.8'), 'm³');
  assert.equal(unidadDe('10.1'), 'kg');
  assert.equal(unidadDe('12.9'), 'Und');
  assert.equal(unidadDe('13.1'), 'm³-km');
  assert.equal(unidadDe('13.9'), 'm³-km');
  assert.equal(unidadDe('6.1.18.1'), 'm²');
  assert.equal(unidadDe('14.3'), 'm');
  assert.equal(actividadPorItem('excavacion'), undefined);
  assert.equal(etiquetaDeUnidad('inventada'), 'inventada');

  // La descripción completa, con su número delante (RF-65).
  assert.ok(
    etiquetaDeActividad(actividadPorItem('4.1.8')!).startsWith(
      '4.1.8 · Excavación para estructuras varias en material común en seco. Incluye entibado.',
    ),
  );
  assert.ok(actividadPorItem('8.27')!.descripcion.endsWith('900 mm (36")'));

  // Se encuentra por número o por palabras, sin tildes (RF-65).
  const opciones = ACTIVIDADES_DEL_PRESUPUESTO.map((a) => ({
    valor: a.item,
    etiqueta: etiquetaDeActividad(a),
  }));
  assert.deepEqual(filtrarOpciones(opciones, '4.1.8').map((o) => o.valor), ['4.1.8']);
  assert.ok(filtrarOpciones(opciones, 'excavacion').some((o) => o.valor === '4.1.8'));
  assert.deepEqual(filtrarOpciones(opciones, 'acero').map((o) => o.valor), ['10.1']);
});

prueba('los ensayos de Control Calidad de Obra son los 17 de la guía de OCC', () => {
  // Spec 004, RF-61 y anexo A, en su orden.
  assert.deepEqual(
    ENSAYOS_DE_CALIDAD.map((e) => e.nombre),
    [
      'Granulometría',
      'Límite líquido',
      'Índice de plasticidad',
      'Equivalente de arena',
      'Azul de metileno',
      'Materia orgánica',
      'Proctor / compactación',
      'CBR sin cemento',
      'Sulfatos solubles',
      'Contenido de cemento',
      'Muestreo para resistencia',
      'Moldeo de probetas',
      'Compresión simple',
      'Densidad en campo',
      'Compactación',
      'Espesor',
      'Planicidad',
    ],
  );
  assert.equal(new Set(ENSAYOS_DE_CALIDAD.map((e) => e.id)).size, 17);
  assert.equal(nombreDeEnsayo('densidad_en_campo'), 'Densidad en campo');
  assert.equal(nombreDeEnsayo('inventado'), 'inventado');
});

prueba('cada equipo se mide con lo que le corresponde', () => {
  // Spec 004 / RF-43. La camioneta y la volqueta van por kilómetros desde la
  // spec 003; pedirles horas de motor es pedir un dato que su tablero no da.
  assert.equal(medidorDeClase('odometro'), 'odometro');
  assert.equal(medidorDeClase('horometro'), 'horometro');
  // `ambos` ya no lo usa ningún tipo, pero el enum lo admite y hay que decidir.
  assert.equal(medidorDeClase('ambos'), 'horometro');
  assert.equal(medidorDeClase(null), 'horometro');
});

prueba('el tope del avance depende del medidor', () => {
  // Spec 004 / RF-12. Veinte horas de motor son mucho pero posibles; veinte
  // horas de más en un odómetro son veinte kilómetros, que no son nada.
  assert.equal(validarAvance('horometro', 100, 120), null);
  assert.equal(validarAvance('horometro', 100, 130), 'salto_enorme');
  assert.equal(validarAvance('odometro', 1000, 1600), null);
  assert.equal(validarAvance('odometro', 1000, 2000), 'salto_enorme');
  assert.equal(validarAvance('odometro', 1000, 900), 'final_menor');
  assert.equal(validarAvance('horometro', null, 120), 'falta_inicial');
});

prueba('el mensaje del avance habla en la unidad del equipo', () => {
  assert.match(mensajeDeAvance('odometro', 'salto_enorme', 1000), /km/);
  assert.match(mensajeDeAvance('horometro', 'salto_enorme', 100), / h/);
  assert.match(mensajeDeAvance('odometro', 'final_menor', 1000), /1000 km/);
});

prueba('buscar encuentra aunque no se escriban las tildes', () => {
  // Spec 005 / RF-12. En una obra nadie escribe con tildes en un buscador, y un
  // buscador que las exige es un buscador que no se usa.
  assert.equal(normalizar('Topógrafo'), 'topografo');
  assert.equal(normalizar('  MOTONIVELADORA  '), 'motoniveladora');
  assert.equal(normalizar('Bitácoras'), 'bitacoras');
  assert.equal(normalizar('Peña'), 'pena', 'la eñe no es una ene con tilde, pero se busca igual');
});

/* ── Errores del servidor debajo de su campo (spec 007, RF-18) ── */

prueba('un duplicado dice qué campo del formulario lo causó', () => {
  // Las claves son las del contrato del formulario: así la pantalla pinta el
  // mensaje debajo del campo sin traducir nombres de índices de la base.
  assert.deepEqual(duplicadoDe('ux_obras_codigo'), {
    mensaje: 'Ya existe una obra con ese código.',
    campo: 'codigo',
  });
  assert.deepEqual(duplicadoDe('ux_usuarios_usuario'), {
    mensaje: 'Ese nombre de usuario ya está en uso.',
    campo: 'usuario',
  });
  assert.deepEqual(duplicadoDe('ux_vehiculos_codigo'), {
    mensaje: 'Ya existe un vehículo con ese código interno.',
    campo: 'codigoInterno',
  });
  // Spec 009 / RF-3: el material repetido se pinta bajo su nombre.
  assert.deepEqual(duplicadoDe('ux_almacen_material_nombre'), {
    mensaje: 'Ya hay un material con ese nombre en el almacén de esta obra.',
    campo: 'nombre',
  });
  // Spec 010 / RF-3: sitios y materiales de cantera, también bajo su nombre.
  assert.deepEqual(duplicadoDe('ux_cantera_sitio_nombre'), {
    mensaje: 'Ya hay un sitio con ese nombre en esta obra.',
    campo: 'nombre',
  });
  assert.deepEqual(duplicadoDe('ux_cantera_material_nombre'), {
    mensaje: 'Ya hay un material de cantera con ese nombre en esta obra.',
    campo: 'nombre',
  });
  // Un índice que no se conoce no inventa campo: el mensaje va arriba, como antes.
  assert.deepEqual(duplicadoDe('ux_inventado'), { mensaje: 'Ya existe un registro con esos datos.' });
  assert.deepEqual(duplicadoDe(undefined), { mensaje: 'Ya existe un registro con esos datos.' });
});

/* ── Los selectores del panel (spec 007) ── */

const TIPOS_DE_PRUEBA = [
  { valor: 'camioneta', etiqueta: 'Camioneta' },
  { valor: 'retro', etiqueta: 'Retroexcavadora', detalle: 'Maquinaria amarilla' },
  { valor: 'vol', etiqueta: 'Volqueta', detalle: 'Camión de carga' },
];

prueba('el filtro de un selector no distingue tildes ni mayúsculas', () => {
  // Spec 007 / RF-13. Escribir «camion» tiene que encontrar «Camión».
  // «Camioneta» por su rótulo, y la volqueta por su detalle: «Camión de carga».
  assert.deepEqual(filtrarOpciones(TIPOS_DE_PRUEBA, 'camion').map((o) => o.valor), [
    'camioneta',
    'vol',
  ]);
  assert.deepEqual(filtrarOpciones(TIPOS_DE_PRUEBA, 'RETRO').map((o) => o.valor), ['retro']);
  assert.deepEqual(filtrarOpciones(TIPOS_DE_PRUEBA, 'amarilla').map((o) => o.valor), ['retro']);
  // Sin texto, están todas, en su orden.
  assert.deepEqual(filtrarOpciones(TIPOS_DE_PRUEBA, '  ').map((o) => o.valor), [
    'camioneta',
    'retro',
    'vol',
  ]);
});

prueba('un filtro sin coincidencias deja la lista vacía', () => {
  // Spec 007 / RF-14. La pantalla lo dice; la regla solo no inventa opciones.
  assert.deepEqual(filtrarOpciones(TIPOS_DE_PRUEBA, 'grúa'), []);
});

prueba('el selector ofrece buscar a partir de nueve opciones', () => {
  // Spec 007 / RF-12: «más de ocho».
  assert.equal(ofreceBusqueda(8), false);
  assert.equal(ofreceBusqueda(9), true);
});

/** Una pantalla de portátil y una lista de 240 de alto, con 4 de separación y 8 de margen. */
const PANTALLA = { altoPantalla: 640, separacion: 4, margen: 8, altoMinimo: 120 };

prueba('la lista abre hacia abajo cuando cabe', () => {
  // Spec 007 / RF-3.
  assert.deepEqual(colocarLista({ ...PANTALLA, botonY: 100, botonAlto: 38, altoLista: 240 }), {
    hacia: 'abajo',
    top: 142,
    alto: 240,
  });
});

prueba('la lista abre hacia arriba si abajo no cabe y arriba sí', () => {
  // El filtro de estado al fondo de la pantalla de Vehículos: se abría fuera de la vista.
  assert.deepEqual(colocarLista({ ...PANTALLA, botonY: 560, botonAlto: 38, altoLista: 240 }), {
    hacia: 'arriba',
    top: 316,
    alto: 240,
  });
});

prueba('la lista se recorta al espacio que tiene', () => {
  // Abajo caben 200: más que el mínimo, así que se queda abajo pero más corta.
  assert.deepEqual(colocarLista({ ...PANTALLA, botonY: 390, botonAlto: 38, altoLista: 240 }), {
    hacia: 'abajo',
    top: 432,
    alto: 200,
  });
  // Arriba caben 88 y abajo 50: ninguno llega al mínimo, y va donde cabe más.
  assert.deepEqual(colocarLista({ ...PANTALLA, botonY: 100, botonAlto: 478, altoLista: 240 }), {
    hacia: 'arriba',
    top: 8,
    alto: 88,
  });
  // Nunca un alto negativo, aunque el botón esté fuera de la pantalla.
  assert.equal(colocarLista({ ...PANTALLA, botonY: 700, botonAlto: 38, altoLista: 240 }).alto >= 0, true);
});

prueba('ninguna tabla del panel se sale del ancho de la pantalla', () => {
  // Spec 005 / RF-20. Cuando una tabla se pasa, la columna que queda fuera de
  // la vista es siempre la última —la de los botones—, que es justo la que hay
  // que pulsar. Y no se nota en un monitor grande: se nota en el portátil de la
  // obra. Por eso se cuenta aquí y no se mira a ojo.
  // Los números salen de los tokens, no de literales con un comentario al lado.
  // Antes estaban escritos a mano porque `theme.ts` no es importable desde Node
  // —abre con `global.css` y `react-native`—; desde la spec 006 las medidas
  // viven en `medidas.ts`, que sí es puro. Un número escrito dos veces es un
  // número que un día deja de coincidir sin que nadie se entere.
  const SEPARACION = Spacing.three;
  const MARGEN = Spacing.three * 2;

  /**
   * Cuánto ancho tiene de verdad cada pantalla.
   *
   * El parte diario tiene **menos**: desde la spec 006 lleva un índice a la
   * izquierda, así que sus tablas viven dentro de un marco más estrecho y con su
   * propio relleno. Sin esta distinción la prueba seguiría en verde mientras la
   * tabla se sale de su marco — y eso no se nota en un monitor grande, se nota
   * en el portátil de la obra.
   */
  const LIMITE_POR_ARCHIVO: Record<string, number> = {
    // El relleno que se descuenta aquí es el de la **banda** (`Spacing.four` a
    // cada lado), no el de la tabla: el de la tabla ya va dentro de `MARGEN`.
    // Restar el equivocado deja el presupuesto 16 puntos largo, que es
    // justamente lo que no se vería hasta tener la pantalla delante.
    'pantalla-partes.tsx': AnchoContenidoConIndice - Spacing.four * 2,
  };

  const carpeta = path.join(__dirname, '..', 'src', 'features', 'panel');
  const pantallas = readdirSync(carpeta).filter((f) => f.endsWith('.tsx'));

  let tablas = 0;
  for (const archivo of pantallas) {
    const fuente = readFileSync(path.join(carpeta, archivo), 'utf8');
    for (const bloque of fuente.matchAll(/const columnas[^=]*=\s*\[(.*?)\n {2}\];/gs)) {
      const anchos = [...bloque[1].matchAll(/ancho:\s*(\d+)/g)].map((m) => Number(m[1]));
      if (anchos.length === 0) continue;
      tablas++;
      const gasto =
        anchos.reduce((suma, a) => suma + a, 0) + SEPARACION * (anchos.length - 1) + MARGEN;
      const limite = LIMITE_POR_ARCHIVO[archivo] ?? MaxContentWidthPanel;
      assert.ok(gasto <= limite, `${archivo}: la tabla gasta ${gasto} de ${limite}`);
    }
  }

  assert.ok(tablas >= 8, `se esperaban al menos 8 tablas y se encontraron ${tablas}`);
});

/**
 * Relación de contraste de la WCAG entre dos colores.
 *
 * Se calcula y no se mira a ojo: el contraste es el ajuste que más fácil se
 * rompe sin que nadie lo note —basta con aclarar un gris «para que se vea más
 * suave»— y el que más caro sale en una pantalla de obra con sol de frente.
 */
function luminancia(hex: string): number {
  const n = parseInt(hex.replace('#', ''), 16);
  const canales = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * canales[0] + 0.7152 * canales[1] + 0.0722 * canales[2];
}

function contraste(texto: string, fondo: string): number {
  const a = luminancia(texto);
  const b = luminancia(fondo);
  const [claro, oscuro] = a > b ? [a, b] : [b, a];
  return (claro + 0.05) / (oscuro + 0.05);
}

prueba('el texto del panel contrasta lo suficiente con su fondo', () => {
  // Spec 005 / RF-22: mínimo 4.5:1.
  const pares: [string, string, string][] = [
    ['texto principal sobre blanco', Colors.light.text, Colors.light.background],
    ['texto secundario sobre blanco', Colors.light.textSecondary, Colors.light.background],
    ['texto secundario sobre el lienzo', Colors.light.textSecondary, Panel.fondo],
    ['texto secundario sobre cabecera', Colors.light.textSecondary, Panel.fondoCabecera],
    ['texto secundario sobre fila alterna', Colors.light.textSecondary, Panel.fondoAlterno],
    ['botón principal', Panel.sobreAccion, Panel.accion],
    ['conforme', Estado.conforme, Estado.conformeFondo],
    ['no conforme', Estado.noConforme, Estado.noConformeFondo],
    ['atención', Estado.atencion, Estado.atencionFondo],
    ['información', Estado.info, Estado.infoFondo],
    ['no aplica', Estado.na, Estado.naFondo],
  ];

  for (const [que, texto, fondo] of pares) {
    const razon = contraste(texto, fondo);
    assert.ok(razon >= 4.5, `${que}: ${razon.toFixed(2)}:1, por debajo de 4.5:1`);
  }
});

prueba('están los diecisiete cargos, con slug y rótulo únicos', () => {
  // Quince de la spec 002 más Almacenista y Encargado de Planta (008/RF-14).
  assert.equal(CARGOS.length, 17);
  assert.equal(new Set(CARGOS.map((c) => c.id)).size, 17);
  assert.equal(new Set(CARGOS.map((c) => c.nombre)).size, 17);
});

prueba('almacenista y encargado de planta proponen su propio acceso', () => {
  // Spec 008 / RF-15 y RF-16.
  assert.equal(nombreDeCargo('almacenista'), 'Almacenista');
  assert.equal(rolSugerido('almacenista'), 'almacenista');
  assert.equal(nombreDeCargo('encargado_planta'), 'Encargado de Planta');
  assert.equal(rolSugerido('encargado_planta'), 'encargado_planta');
});

prueba('almacenista y encargado de planta no reciben celular', () => {
  // Spec 008 / RF-10: sin máquina, sin código de activación.
  assert.equal(operaVehiculos('almacenista'), false);
  assert.equal(operaVehiculos('encargado_planta'), false);
});

prueba('solo la dirección y las residencias entran al panel como residente', () => {
  const alPanel = CARGOS.filter((c) => c.rolSugerido === 'supervisor').map((c) => c.id);
  assert.deepEqual(alPanel, ['director', 'residente_1', 'residente_2']);
});

prueba('solo el conductor y el operador llevan máquina', () => {
  const conMaquina = CARGOS.filter((c) => c.operaVehiculos).map((c) => c.id);
  assert.deepEqual(conMaquina, ['conductor', 'operador']);
  // El caso que da sentido a todo esto: un cadenero no recibe celular.
  assert.equal(operaVehiculos('cadenero_1'), false);
  assert.equal(operaVehiculos('topografo'), false);
});

prueba('un cargo que no existe no sugiere acceso ni máquina', () => {
  assert.equal(cargoPorId('jefe_de_todo'), undefined);
  assert.equal(rolSugerido('jefe_de_todo'), 'operador');
  assert.equal(operaVehiculos('jefe_de_todo'), false);
  assert.equal(nombreDeCargo(null), 'Sin definir');
});

/* ── Almacén de obra (spec 009) ── */

prueba('están las once unidades del almacén, con id, nombre y abreviatura únicos', () => {
  // Spec 009 / RF-31: lista cerrada. Una unidad repetida con otro nombre es
  // justo el «bulto» y «bultos» que la lista existe para evitar.
  assert.equal(UNIDADES_ALMACEN.length, 11);
  assert.equal(new Set(IDS_UNIDAD).size, 11);
  assert.equal(new Set(UNIDADES_ALMACEN.map((u) => u.nombre)).size, 11);
  assert.equal(new Set(UNIDADES_ALMACEN.map((u) => u.abreviatura)).size, 11);
  assert.deepEqual(
    [...IDS_UNIDAD],
    ['bulto', 'kilogramo', 'tonelada', 'metro', 'metro_cuadrado', 'metro_cubico', 'litro', 'galon', 'unidad', 'rollo', 'caja'],
  );
});

prueba('la lista de materiales de OCC llega entera y sin repetidos', () => {
  // Spec 009 / RF-32 y RF-35, anexo A: 367 filas del documento, 351 nombres. La
  // cuenta se comprueba aquí y no en el script porque es lo que ve el almacenista.
  assert.equal(MATERIALES_DE_OCC.length, 351);
  assert.equal(new Set(MATERIALES_DE_OCC.map((m) => normalizar(m))).size, 351);
  for (const nombre of MATERIALES_DE_OCC) {
    assert.ok(nombre.trim().length > 0, 'un nombre vacío');
    assert.equal(nombre, nombre.trim());
  }

  // Tal como los escribe OCC, con sus tildes: si se perdieran, nadie los encuentra.
  for (const nombre of ['Agua', 'Cemento gris', 'Adoquín e=8cm', 'Acero PDR-60']) {
    assert.ok(MATERIALES_DE_OCC.includes(nombre), nombre);
  }

  // «Otro» es la salida para lo que no está en la lista (RF-33), no un material
  // de ella: ninguno se llama así.
  assert.ok(!MATERIALES_DE_OCC.some((m) => normalizar(m) === CLAVE_OTRO_MATERIAL));
});

prueba('un material se encuentra escribiendo parte de su nombre', () => {
  // Spec 009 / RF-36, con el mismo buscador del selector (007/RF-13).
  const opciones = MATERIALES_DE_OCC.map((m) => ({ valor: m, etiqueta: m }));
  const nombres = (texto: string) => filtrarOpciones(opciones, texto).map((o) => o.valor);

  assert.ok(nombres('cemento').includes('Cemento gris'));
  assert.ok(nombres('acero').includes('Acero PDR-60'));
  // Sin tildes y en minúsculas, que es como se escribe en una obra.
  assert.ok(nombres('adoquin').includes('Adoquín e=8cm'));
  assert.deepEqual(nombres('material que no existe'), []);
});

prueba('una unidad se nombra y se abrevia, y una desconocida no se esconde', () => {
  // Spec 009 / RF-2 y RF-31.
  assert.equal(nombreDeUnidad('metro_cubico'), 'Metro cúbico');
  assert.equal(abreviaturaDeUnidad('metro_cubico'), 'm³');
  assert.equal(abreviaturaDeUnidad('bulto'), 'bultos');
  assert.equal(nombreDeUnidad('barril'), 'barril');
});

prueba('una cantidad se lee con coma o punto y hasta dos decimales', () => {
  // Spec 009, requisito no funcional: medio bulto, 2,5 m de tubería.
  assert.equal(aCentesimas('2,5'), 250);
  assert.equal(aCentesimas('2.5'), 250);
  assert.equal(aCentesimas(' 70 '), 7000);
  assert.equal(aCentesimas('0,25'), 25);
  assert.equal(aCentesimas(2.5), 250);
  assert.equal(aCentesimas('-3'), -300);
  // Tres decimales no son una cantidad: «1.000» no se lee como un bulto.
  assert.equal(aCentesimas('0,001'), null);
  assert.equal(aCentesimas('1.000'), null);
  assert.equal(aCentesimas('abc'), null);
  assert.equal(aCentesimas(''), null);
  // La suma en centésimas no arrastra el error de la coma flotante.
  assert.equal((aCentesimas('0,1') ?? 0) + (aCentesimas('0,2') ?? 0), aCentesimas('0,3'));
});

prueba('una cantidad va y vuelve de la base sin perder nada', () => {
  // `numeric(14,2)` se escribe «2.50» y se lee igual.
  assert.equal(aDecimal(250), '2.50');
  assert.equal(aDecimal(7000), '70.00');
  assert.equal(aDecimal(5), '0.05');
  assert.equal(aDecimal(-3000), '-30.00');
  for (const centesimas of [0, 5, 250, 7000, 125075, 99999999999999]) {
    assert.equal(aCentesimas(aDecimal(centesimas)), centesimas);
  }
});

prueba('una cantidad se muestra en su unidad, igual en cualquier entorno', () => {
  assert.equal(formatearCantidad(7000, 'bulto'), '70 bultos');
  assert.equal(formatearCantidad(250, 'metro_cubico'), '2,5 m³');
  assert.equal(formatearCantidad(125075, 'kilogramo'), '1.250,75 kg');
  assert.equal(formatearCantidad(5, 'litro'), '0,05 L');
  assert.equal(formatearCantidad(-3000, 'bulto'), '−30 bultos');
});

prueba('un movimiento sin cantidad válida, con fecha futura o salida sin destino se rechaza', () => {
  // Spec 009 / RF-9, RF-10 y RF-13: cada falta en su campo, todas a la vez.
  const hoy = '2026-09-15';
  const campos = (m: Parameters<typeof validarMovimiento>[0]) =>
    validarMovimiento(m, hoy).map((f) => f.campo);

  assert.deepEqual(campos({ tipo: 'ingreso', fecha: hoy, cantidad: 0 }), ['cantidad']);
  assert.deepEqual(campos({ tipo: 'ingreso', fecha: hoy, cantidad: -500 }), ['cantidad']);
  assert.deepEqual(campos({ tipo: 'ingreso', fecha: hoy, cantidad: null }), ['cantidad']);
  assert.deepEqual(campos({ tipo: 'ingreso', fecha: '2026-09-16', cantidad: 100 }), ['fecha']);
  assert.deepEqual(campos({ tipo: 'salida', fecha: hoy, cantidad: 3000, paraQue: '   ' }), ['paraQue']);
  assert.deepEqual(campos({ tipo: 'salida', fecha: '2026-09-16', cantidad: 0 }), [
    'cantidad',
    'fecha',
    'paraQue',
  ]);
  assert.equal(
    validarMovimiento({ tipo: 'ingreso', fecha: hoy, cantidad: 0 }, hoy)[0]?.mensaje,
    'La cantidad tiene que ser mayor que cero.',
  );
});

prueba('un ingreso de hoy sin observación y una salida con destino se aceptan', () => {
  // La observación del ingreso es opcional (RF-8); un día pasado vale (RF-10).
  const hoy = '2026-09-15';
  assert.deepEqual(validarMovimiento({ tipo: 'ingreso', fecha: hoy, cantidad: 10000 }, hoy), []);
  assert.deepEqual(
    validarMovimiento(
      { tipo: 'salida', fecha: '2026-09-01', cantidad: 3000, paraQue: 'Cuneta PR 3' },
      hoy,
    ),
    [],
  );
});

/** El recorrido de la demo de la spec 009: 100 bultos de cemento entran y salen 30. */
function movimientosDeCemento(salidaAnulada = false): MovimientoRegistrado[] {
  return [
    { id: 'm1', tipo: 'ingreso', fecha: '2026-09-10', cantidad: 10000, registradoEn: '2026-09-10T13:00:00.000Z', anulado: false },
    { id: 'm2', tipo: 'salida', fecha: '2026-09-12', cantidad: 3000, registradoEn: '2026-09-12T15:00:00.000Z', anulado: salidaAnulada },
  ];
}

prueba('el stock sale de los movimientos vigentes: 100 entran, 30 salen, quedan 70', () => {
  // Spec 009 / RF-17, RF-18 y RF-25.
  assert.deepEqual(totalesDelMaterial(movimientosDeCemento()), {
    ingresado: 10000,
    salido: 3000,
    stock: 7000,
  });
  // Anular la salida la deja de contar: el stock vuelve a 100.
  assert.deepEqual(totalesDelMaterial(movimientosDeCemento(true)), {
    ingresado: 10000,
    salido: 0,
    stock: 10000,
  });
  assert.deepEqual(totalesDelMaterial([]), { ingresado: 0, salido: 0, stock: 0 });
});

prueba('una salida mayor que el stock se rechaza diciendo cuánto queda', () => {
  // Spec 009 / RF-15. Por exactamente el stock, se acepta y queda en cero.
  assert.equal(
    rechazoDeSalida(7000, 8000, 'bulto'),
    'No alcanza: quedan 70 bultos y la salida es de 80 bultos.',
  );
  assert.equal(rechazoDeSalida(7000, 7000, 'bulto'), null);
  assert.equal(rechazoDeSalida(7000, 2550, 'bulto'), null);
});

prueba('anular un ingreso que ya salió se rechaza; anular una salida, no', () => {
  // Spec 009 / RF-26: con 70 en stock, anular el ingreso de 100 dejaría −30.
  const [ingreso, salida] = movimientosDeCemento();
  assert.equal(
    rechazoDeAnulacion(ingreso, 7000, 'bulto'),
    'No se puede anular este ingreso: el stock quedaría en −30 bultos, porque parte de lo que ' +
      'entró ya salió. Anule antes las salidas que correspondan.',
  );
  assert.equal(rechazoDeAnulacion(salida, 7000, 'bulto'), null);
  // Con la salida ya anulada, el stock es 100 y el ingreso sí se puede anular.
  assert.equal(rechazoDeAnulacion(ingreso, 10000, 'bulto'), null);
  assert.equal(
    rechazoDeAnulacion({ ...salida, anulado: true }, 10000, 'bulto'),
    'Este movimiento ya estaba anulado.',
  );
});

prueba('un material con stock no se da de baja; sin stock, sí', () => {
  // Spec 009 / RF-6 y RF-7.
  assert.equal(
    rechazoDeBaja(1200, 'bulto'),
    'No se puede dar de baja: todavía quedan 12 bultos. Registre la salida de lo que queda antes.',
  );
  assert.equal(rechazoDeBaja(0, 'bulto'), null);
});

prueba('la unidad no cambia si hay movimientos, aunque estén anulados', () => {
  // Spec 009 / RF-5: un movimiento anulado sigue a la vista con su cantidad.
  assert.match(rechazoDeCambioDeUnidad(1, 'bulto', 'kilogramo') ?? '', /registrados en bultos/);
  assert.equal(rechazoDeCambioDeUnidad(0, 'bulto', 'kilogramo'), null);
  assert.equal(rechazoDeCambioDeUnidad(5, 'bulto', 'bulto'), null);
});

prueba('el historial va en orden de registro, con el stock que dejó cada movimiento', () => {
  // Spec 009 / RF-20 y RF-25: los anulados siguen en la lista, sin saldo.
  const otroIngreso: MovimientoRegistrado = {
    id: 'm3', tipo: 'ingreso', fecha: '2026-09-11', cantidad: 2050, registradoEn: '2026-09-13T08:00:00.000Z', anulado: false,
  };
  // Llegan desordenados; la fecha del 11 se registró después que la salida del 12.
  const historial = historialConSaldo([otroIngreso, ...movimientosDeCemento(true)]);
  assert.deepEqual(
    historial.map((m) => [m.id, m.saldo]),
    [
      ['m1', 10000],
      ['m2', null],
      ['m3', 12050],
    ],
  );
  assert.deepEqual(
    historialConSaldo(movimientosDeCemento()).map((m) => m.saldo),
    [10000, 7000],
  );
});

/** El primer mensaje que el contrato le pone a un campo, o `undefined` si pasa. */
function faltaDelContrato(
  esquema: { safeParse: (dato: unknown) => { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } } },
  dato: unknown,
  campo: string,
): string | undefined {
  const resultado = esquema.safeParse(dato);
  return resultado.error?.issues.find((i) => i.path.join('.') === campo)?.message;
}

prueba('el contrato de una salida exige para qué, con el mismo texto que la regla', () => {
  // Spec 009 / RF-11 y RF-13. Una petición hecha por fuera no se salta la falta.
  const salida = { tipo: 'salida', materialId: 'mat-1', fecha: '2026-09-15', cantidad: '30' };
  assert.equal(
    faltaDelContrato(movimientoNuevo, salida, 'paraQue'),
    'Escriba para qué se usará lo que sale.',
  );
  assert.equal(
    faltaDelContrato(movimientoNuevo, { ...salida, paraQue: '  ' }, 'paraQue'),
    'Escriba para qué se usará lo que sale.',
  );
  const valida = movimientoNuevo.parse({ ...salida, paraQue: 'Cuneta PR 3' });
  assert.equal(valida.cantidad, 3000);
  // La salida no acepta quién la recibe ni quién la registra (RF-30): se descartan.
  assert.equal('registradoPor' in movimientoNuevo.parse({ ...salida, paraQue: 'x', registradoPor: 'otro' }), false);
});

prueba('el contrato convierte la cantidad escrita y rechaza la que no sirve', () => {
  // Spec 009 / RF-8 y RF-9, con la misma lectura que `aCentesimas`.
  const ingreso = { tipo: 'ingreso', materialId: 'mat-1', fecha: '2026-09-15' };
  const parsed = movimientoNuevo.parse({ ...ingreso, cantidad: '2,5' });
  assert.equal(parsed.cantidad, 250);
  assert.equal(parsed.tipo === 'ingreso' ? parsed.observacion : 'no', null);
  assert.equal(faltaDelContrato(movimientoNuevo, { ...ingreso, cantidad: '0' }, 'cantidad'), 'La cantidad tiene que ser mayor que cero.');
  assert.equal(faltaDelContrato(movimientoNuevo, { ...ingreso, cantidad: '1.000' }, 'cantidad'), 'Escriba la cantidad, con hasta dos decimales.');
  assert.equal(faltaDelContrato(movimientoNuevo, { ...ingreso, cantidad: 10 }, 'cantidad'), undefined);
  assert.equal(faltaDelContrato(movimientoNuevo, { ...ingreso, cantidad: '5', fecha: '15/09/2026' }, 'fecha'), 'La fecha va en formato AAAA-MM-DD.');
  assert.equal(movimientoNuevo.safeParse({ ...ingreso, tipo: 'traslado', cantidad: '5' }).success, false);
});

prueba('un material se registra con una unidad de la lista y nada más', () => {
  // Spec 009 / RF-2 y RF-31.
  assert.equal(
    faltaDelContrato(materialNuevo, { nombre: 'Cemento', unidad: 'bultos' }, 'unidad'),
    'Elija una unidad de la lista.',
  );
  assert.equal(faltaDelContrato(materialNuevo, { nombre: '  ', unidad: 'bulto' }, 'nombre'), 'Falta el nombre del material.');
  assert.deepEqual(materialNuevo.parse({ nombre: ' Cemento ', unidad: 'bulto' }), {
    nombre: 'Cemento',
    unidad: 'bulto',
    obraId: null,
  });
  // Corregir solo el nombre no manda la unidad: ausente es «no se toca» (RF-4).
  assert.deepEqual(materialEditado.parse({ nombre: 'Cemento gris' }), { nombre: 'Cemento gris' });
  assert.equal(materialEditado.safeParse({ unidad: 'barril' }).success, false);
});

prueba('los movimientos se filtran por periodo y por tipo, sin esconder los anulados', () => {
  // Spec 009 / RF-21. El periodo es de la fecha del movimiento, con los dos extremos.
  const todos = movimientosDeCemento(true);
  assert.deepEqual(filtrarMovimientos(todos, { tipo: 'salida' }).map((m) => m.id), ['m2']);
  assert.deepEqual(
    filtrarMovimientos(todos, { desde: '2026-09-11', hasta: '2026-09-12' }).map((m) => m.id),
    ['m2'],
  );
  assert.deepEqual(filtrarMovimientos(todos, { hasta: '2026-09-10' }).map((m) => m.id), ['m1']);
  assert.deepEqual(filtrarMovimientos(todos, {}).map((m) => m.id), ['m1', 'm2']);
  assert.deepEqual(
    filtrarMovimientos(todos, { desde: '2026-09-11', tipo: 'ingreso' }).map((m) => m.id),
    [],
  );
});

/* ── Control Cantera (spec 010) ── */

prueba('el PR se elige de 0 a 25 y los metros de 0 a 975, de 25 en 25', () => {
  // Spec 010 / RF-12 y RF-13.
  assert.equal(OPCIONES_DE_PR.length, 26);
  assert.equal(OPCIONES_DE_PR[0], 0);
  assert.equal(OPCIONES_DE_PR.at(-1), 25);
  assert.equal(OPCIONES_DE_METROS.length, 40);
  assert.deepEqual(OPCIONES_DE_METROS.slice(0, 3), [0, 25, 50]);
  assert.equal(OPCIONES_DE_METROS.at(-1), 975);
});

prueba('la llegada a la obra se escribe como abscisa, con los metros en tres cifras', () => {
  // Spec 010 / RF-17, precisado el 2026-09-16.
  assert.equal(formatearAbscisa(5, 300), 'PR 5 + 300');
  assert.equal(formatearAbscisa(25, 975), 'PR 25 + 975');
  assert.equal(formatearAbscisa(0, 50), 'PR 0 + 050');
  assert.equal(formatearAbscisa(0, 0), 'PR 0 + 000');
});

prueba('una abscisa incompleta nombra lo que falta y una fuera de rango se rechaza', () => {
  // Spec 010 / RF-14 y RF-16.
  const faltas = (pr: number | null, metros: number | null) =>
    validarAbscisa(pr, metros).map((f) => `${f.campo}: ${f.mensaje}`);
  assert.deepEqual(faltas(null, 300), ['pr: Falta el PR de llegada.']);
  assert.deepEqual(faltas(5, null), ['metros: Faltan los metros de llegada.']);
  assert.deepEqual(faltas(null, null), ['pr: Falta el PR de llegada.', 'metros: Faltan los metros de llegada.']);
  assert.deepEqual(faltas(26, 300), ['pr: El PR va de 0 a 25.']);
  assert.deepEqual(faltas(-1, 300), ['pr: El PR va de 0 a 25.']);
  assert.deepEqual(faltas(2.5, 300), ['pr: El PR va de 0 a 25.']);
  assert.deepEqual(faltas(5, 980), ['metros: Los metros van de 0 a 975, de 25 en 25.']);
  assert.deepEqual(faltas(5, 310), ['metros: Los metros van de 0 a 975, de 25 en 25.']);
  assert.deepEqual(faltas(25, 975), []);
  assert.deepEqual(faltas(0, 0), []);
});

/** Un viaje completo de la demo: VOL-01 de La Esperanza a la obra en PR 5 + 300. */
function viajeALaObra(): Parameters<typeof validarViaje>[0] {
  return {
    fecha: '2026-09-16',
    hora: '07:30',
    materialId: 'afirmado',
    vehiculoId: 'vol-01',
    conductorId: 'pedro',
    origenId: 'la-esperanza',
    destino: DESTINO_OBRA,
    pr: 5,
    metros: 300,
  };
}

prueba('un viaje completo a la obra o entre sitios se acepta', () => {
  // Spec 010 / RF-7, RF-11 y RF-15: de una planta a otra, sin abscisa.
  const hoy = '2026-09-16';
  assert.deepEqual(validarViaje(viajeALaObra(), hoy), []);
  assert.deepEqual(
    validarViaje({ ...viajeALaObra(), destino: 'planta-norte', pr: null, metros: null }, hoy),
    [],
  );
  // Un día pasado, y una hora de hoy todavía por llegar, valen: solo se mira el día.
  assert.deepEqual(validarViaje({ ...viajeALaObra(), fecha: '2026-09-01', hora: '23:59' }, hoy), []);
});

prueba('un viaje con fecha futura, sin conductor o entre el mismo sitio se rechaza en su campo', () => {
  // Spec 010 / RF-15, RF-18, RF-19 y RF-34.
  const hoy = '2026-09-16';
  const campos = (cambios: Partial<Parameters<typeof validarViaje>[0]>) =>
    validarViaje({ ...viajeALaObra(), ...cambios }, hoy).map((f) => `${f.campo}: ${f.mensaje}`);

  assert.deepEqual(campos({ fecha: '2026-09-17' }), ['fecha: La fecha no puede ser posterior a hoy.']);
  assert.deepEqual(campos({ conductorId: null }), ['conductorId: Elija el conductor.']);
  assert.deepEqual(campos({ hora: '7:30' }), ['hora: La hora va como HH:MM, de 00:00 a 23:59.']);
  assert.deepEqual(campos({ hora: '24:00' }), ['hora: La hora va como HH:MM, de 00:00 a 23:59.']);
  assert.deepEqual(campos({ destino: 'la-esperanza', pr: null, metros: null }), [
    'destino: El origen y el destino no pueden ser el mismo sitio.',
  ]);
  // Con otro destino, una abscisa que se quedó en el formulario no se guarda: se rechaza.
  assert.deepEqual(campos({ destino: 'planta-norte' }), [
    'pr: El PR y los metros solo se anotan cuando el destino es la obra.',
    'metros: El PR y los metros solo se anotan cuando el destino es la obra.',
  ]);
  assert.deepEqual(campos({ metros: null }), ['metros: Faltan los metros de llegada.']);
  // Todo vacío: se nombra cada campo, de una vez.
  assert.deepEqual(
    validarViaje(
      { fecha: '', hora: '', materialId: null, vehiculoId: null, conductorId: null, origenId: null, destino: null, pr: null, metros: null },
      hoy,
    ).map((f) => f.campo),
    ['fecha', 'hora', 'materialId', 'vehiculoId', 'conductorId', 'origenId', 'destino'],
  );
});

prueba('solo la volqueta operativa de la obra se ofrece para un viaje', () => {
  // Spec 010 / RF-8, precisado el 2026-09-16, y sus casos límite.
  const vol01 = { obraId: 'antioquia', tipoVehiculoId: 'volqueta', estado: 'operativo', dadoDeBaja: false };
  assert.equal(volquetaElegible(vol01, 'antioquia'), true);
  assert.equal(volquetaElegible({ ...vol01, obraId: 'otra' }, 'antioquia'), false, 'trasladada');
  assert.equal(volquetaElegible({ ...vol01, obraId: null }, 'antioquia'), false, 'sin obra');
  assert.equal(volquetaElegible({ ...vol01, estado: 'en_mantenimiento' }, 'antioquia'), false);
  assert.equal(volquetaElegible({ ...vol01, estado: 'no_apto' }, 'antioquia'), false);
  assert.equal(volquetaElegible({ ...vol01, estado: 'fuera_servicio' }, 'antioquia'), false);
  assert.equal(volquetaElegible({ ...vol01, dadoDeBaja: true }, 'antioquia'), false);
  assert.equal(volquetaElegible({ ...vol01, tipoVehiculoId: 'camioneta' }, 'antioquia'), false);
});

prueba('como conductor solo sale quien conduce u opera, activo y de la obra', () => {
  // Spec 010 / RF-35. El cargo lo decide el mismo catálogo que da celular.
  const pedro = { obraId: 'antioquia', cargo: 'conductor', activo: true, dadoDeBaja: false };
  assert.equal(conductorElegible(pedro, 'antioquia'), true);
  assert.equal(conductorElegible({ ...pedro, cargo: 'operador' }, 'antioquia'), true);
  assert.equal(conductorElegible({ ...pedro, cargo: 'cadenero_1' }, 'antioquia'), false);
  assert.equal(conductorElegible({ ...pedro, cargo: 'encargado_planta' }, 'antioquia'), false);
  assert.equal(conductorElegible({ ...pedro, cargo: null }, 'antioquia'), false);
  assert.equal(conductorElegible({ ...pedro, activo: false }, 'antioquia'), false);
  assert.equal(conductorElegible({ ...pedro, dadoDeBaja: true }, 'antioquia'), false);
  assert.equal(conductorElegible({ ...pedro, obraId: 'otra' }, 'antioquia'), false);
});

prueba('los viajes se filtran por volqueta, material, origen y destino, sin esconder anulados', () => {
  // Spec 010 / RF-21 y RF-25.
  const viajes = [
    { id: 'v1', vehiculoId: 'vol-01', materialId: 'afirmado', origenId: 'esperanza', destinoId: null, destinoObra: true, anulado: false },
    { id: 'v2', vehiculoId: 'vol-02', materialId: 'afirmado', origenId: 'esperanza', destinoId: 'planta', destinoObra: false, anulado: true },
    { id: 'v3', vehiculoId: 'vol-01', materialId: 'arena', origenId: 'planta', destinoId: null, destinoObra: true, anulado: false },
  ];
  const ids = (filtro: Parameters<typeof filtrarViajes>[1]) => filtrarViajes(viajes, filtro).map((v) => v.id);
  assert.deepEqual(ids({}), ['v1', 'v2', 'v3']);
  assert.deepEqual(ids({ vehiculoId: 'vol-01' }), ['v1', 'v3']);
  assert.deepEqual(ids({ materialId: 'afirmado' }), ['v1', 'v2']);
  assert.deepEqual(ids({ origenId: 'planta' }), ['v3']);
  assert.deepEqual(ids({ destino: DESTINO_OBRA }), ['v1', 'v3']);
  assert.deepEqual(ids({ destino: 'planta' }), ['v2']);
  assert.deepEqual(ids({ vehiculoId: 'vol-01', materialId: 'arena', destino: DESTINO_OBRA }), ['v3']);
});

prueba('la bitácora dice qué pasó con la cantera, también cuando no hubo viajes', () => {
  // Spec 010 / RF-26, RF-29, RF-31 y RF-37.
  const viaje = { id: 'v1' };
  const abierta = canteraDelParte({ cerrado: false, fijados: null, vigentes: [viaje] });
  assert.deepEqual([abierta.estado, abierta.viajes.length, abierta.aviso], ['vigentes', 1, null]);

  const abiertaSinViajes = canteraDelParte({ cerrado: false, fijados: null, vigentes: [] });
  assert.equal(abiertaSinViajes.aviso, 'Todavía no hay viajes de cantera registrados para este día.');

  // Cerrada: manda lo fijado, aunque hoy haya otros vigentes (RF-30).
  const cerrada = canteraDelParte({ cerrado: true, fijados: [viaje], vigentes: [] });
  assert.deepEqual([cerrada.estado, cerrada.viajes.length, cerrada.aviso], ['fijados', 1, null]);

  const cerradaSinViajes = canteraDelParte({ cerrado: true, fijados: [], vigentes: [viaje] });
  assert.deepEqual(
    [cerradaSinViajes.estado, cerradaSinViajes.viajes.length, cerradaSinViajes.aviso],
    ['fijados', 0, 'Ese día no se registraron viajes de cantera.'],
  );

  // Cerrada antes del módulo: no se afirma que no hubo viajes.
  const antigua = canteraDelParte({ cerrado: true, fijados: null, vigentes: [viaje] });
  assert.deepEqual(
    [antigua.estado, antigua.viajes.length, antigua.aviso],
    ['antes_del_control', 0, 'Esta bitácora se cerró antes de que existiera el control de cantera.'],
  );
});

prueba('Control Cantera sale en el índice con su conteo y nunca como pendiente', () => {
  // Spec 010 / RF-28 y RF-36.
  // Sin conteo, la pantalla todavía no la pide y no sale.
  assert.equal(estadoDe(PARTE_VACIO, 'cantera'), undefined);
  // Va justo después de Control Calidad de Obra.
  const ids = seccionesDelParte({ ...PARTE_VACIO, cantera: 3 }).map((s) => s.id);
  assert.equal(ids[ids.indexOf('laboratorio') + 1], 'cantera');
  assert.deepEqual(
    { ...estadoDe({ ...PARTE_VACIO, cantera: 3 }, 'cantera') },
    { id: 'cantera', titulo: 'Control Cantera', estado: 'lleno', cuantos: 3 },
  );
  assert.equal(estadoDe({ ...PARTE_VACIO, cantera: null }, 'cantera')?.estado, 'desconocido');
  // Cero viajes: «–» y «sin viajes», no «○ sin registrar».
  const sinViajes = estadoDe({ ...PARTE_VACIO, cantera: 0 }, 'cantera');
  assert.equal(sinViajes?.estado, 'no_aplica');
  assert.equal(sinViajes?.detalle, 'sin viajes');
  // Las demás secciones no cambian por tenerla.
  assert.equal(seccionesDelParte({ ...PARTE_VACIO, cantera: 0 }).length, seccionesDelParte(PARTE_VACIO).length + 1);
});

prueba('el contrato del viaje exige la abscisa con la obra y la rechaza con un sitio', () => {
  // Spec 010 / RF-11, RF-14, RF-15, RF-16, RF-18 y RF-34. Mismos textos que la regla.
  const base = {
    fecha: '2026-09-16',
    hora: '07:30',
    materialId: 'afirmado',
    vehiculoId: 'vol-01',
    conductorId: 'pedro',
    origenId: 'la-esperanza',
  };
  const aLaObra = viajeNuevo.parse({ ...base, destino: DESTINO_OBRA, pr: 5, metros: 300 });
  assert.deepEqual([aLaObra.pr, aLaObra.metros, aLaObra.obraId], [5, 300, null]);

  const faltas = (dato: unknown) =>
    viajeNuevo.safeParse(dato).error?.issues.map((i) => `${i.path.join('.')}: ${i.message}`) ?? [];

  assert.deepEqual(faltas({ ...base, destino: DESTINO_OBRA, pr: 5 }), [
    'metros: Faltan los metros de llegada.',
  ]);
  assert.deepEqual(faltas({ ...base, destino: DESTINO_OBRA, pr: 5, metros: 310 }), [
    'metros: Los metros van de 0 a 975, de 25 en 25.',
  ]);
  assert.deepEqual(faltas({ ...base, destino: 'planta', pr: 5, metros: null }), [
    'pr: El PR y los metros solo se anotan cuando el destino es la obra.',
  ]);
  assert.deepEqual(faltas({ ...base, destino: 'la-esperanza' }), [
    'destino: El origen y el destino no pueden ser el mismo sitio.',
  ]);
  assert.deepEqual(faltas({ ...base, conductorId: '', destino: 'planta' }), [
    'conductorId: Elija el conductor.',
  ]);
  // Un viaje entre sitios sin abscisa pasa, con pr y metros en null.
  const entreSitios = viajeNuevo.parse({ ...base, destino: 'planta' });
  assert.deepEqual([entreSitios.pr, entreSitios.metros], [null, null]);
});

prueba('sitios y materiales de cantera se registran con nombre, y el sitio con su tipo', () => {
  // Spec 010 / RF-1, RF-2 y RF-4.
  assert.deepEqual(sitioNuevo.parse({ nombre: ' La Esperanza ', tipo: 'cantera' }), {
    nombre: 'La Esperanza',
    tipo: 'cantera',
    obraId: null,
  });
  assert.equal(
    sitioNuevo.safeParse({ nombre: 'La Esperanza', tipo: 'botadero' }).error?.issues[0]?.message,
    'Elija si es cantera, planta u otro.',
  );
  assert.equal(
    materialDeCanteraNuevo.safeParse({ nombre: '  ' }).error?.issues[0]?.message,
    'Falta el nombre del material.',
  );
  // Corregir solo el nombre no manda el tipo: ausente es «no se toca».
  assert.deepEqual(sitioEditado.parse({ nombre: 'La Esperanza 2' }), { nombre: 'La Esperanza 2' });
  assert.deepEqual(materialDeCanteraEditado.parse({}), {});
});

/* ------------------------------------------------------------------------ */
/* Criptografía de las contraseñas web                                       */
/* ------------------------------------------------------------------------ */

/**
 * Corre aquí, en Node, y no en un entorno de pruebas aparte, porque
 * `crypto.subtle` es exactamente la misma API que usará Cloudflare Workers: lo
 * que se comprueba aquí es lo que va a correr en producción.
 */
async function verificarCripto() {
  await pruebaAsync('una contraseña verifica contra su hash y no contra otro', async () => {
    const hash = await hashDeClave('caterpillar-120k');
    assert.equal(await verificarClave('caterpillar-120k', hash), true);
    assert.equal(await verificarClave('caterpillar-120K', hash), false);
    assert.equal(await verificarClave('', hash), false);
  });

  await pruebaAsync('dos hashes de la misma contraseña son distintos', async () => {
    // Si el salt no fuera por fila, dos personas con la misma contraseña
    // tendrían el mismo hash y quedarían delatadas la una por la otra.
    const [a, b] = await Promise.all([hashDeClave('la-misma'), hashDeClave('la-misma')]);
    assert.notEqual(a, b);
    assert.equal(await verificarClave('la-misma', a), true);
    assert.equal(await verificarClave('la-misma', b), true);
  });

  await pruebaAsync('el hash lleva sus propios parámetros dentro', async () => {
    // Es lo que permitirá subir el coste sin migrar ni una fila: las
    // credenciales viejas se siguen verificando con el suyo.
    const [algoritmo, digest, iteraciones, salt, dk] = (await hashDeClave('x')).split('$');
    assert.equal(algoritmo, 'pbkdf2');
    assert.equal(digest, 'sha256');
    assert.ok(Number(iteraciones) >= 100_000);
    assert.equal(salt.length, 32);
    assert.equal(dk.length, 64);
  });

  await pruebaAsync('un hash con formato roto no autentica a nadie', async () => {
    for (const roto of ['', 'x', 'pbkdf2$sha256$abc$00$00', 'bcrypt$sha256$1$00$00', '$$$$']) {
      assert.equal(await verificarClave('lo-que-sea', roto), false);
    }
  });

  await pruebaAsync('la contraseña temporal no trae caracteres que se confundan', async () => {
    // Se dicta por teléfono: un cero confundido con una O es una llamada de
    // vuelta. La `L` sí vale — la que se parece a un uno es la minúscula, y
    // aquí todo va en mayúscula. Y dos claves iguales delatarían un generador
    // roto, que es el peor fallo posible de esta función.
    const generadas = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const clave = generarClaveTemporal();
      assert.match(clave, /^[A-Z2-9]{4}(-[A-Z2-9]{4})+$/);
      assert.ok(!/[O0I1]/.test(clave), `caracter ambiguo en ${clave}`);
      generadas.add(clave);
    }
    assert.equal(generadas.size, 50);
  });

  const costo = await medirCostoDeClave();
  console.log(`\n  · derivar una contraseña cuesta ${costo} ms en este equipo`);
  if (costo > 1000) {
    console.log('    (por encima de 1 s: convendría bajar ITERACIONES_CLAVE)');
  }
}

/* ------------------------------------------------------------------------ */

/**
 * La firma SigV4, contra los vectores publicados por AWS.
 *
 * Estos dos ejemplos salen de la documentación de Amazon —"Signature
 * Calculations for the Authorization Header: Transferring Payload in a Single
 * Chunk"— y son la única forma de saber que `firma-s3.ts` está bien **sin
 * llamar a Cloudflare**. Importa mucho: una firma mal calculada no se degrada
 * ni avisa, responde 403 sin decir qué parte del cálculo falló, y se puede ir
 * un día entero buscándolo en el sitio equivocado.
 *
 * Los dos casos no son redundantes. El PUT cubre el cuerpo firmado por su
 * hash, las cabeceras extra y una clave con carácter especial (`$`, que hay que
 * codificar); el GET cubre el cuerpo vacío y una cabecera —`range`— que se
 * ordena entre las demás.
 */
const CREDENCIALES_DE_EJEMPLO = {
  llaveId: 'AKIAIOSFODNN7EXAMPLE',
  // Ojo: los ejemplos de S3 usan la variante con barra (`…MDENG/bPxRfiCY…`).
  // El otro juego de vectores de AWS, el genérico, lleva un `+` en esa
  // posición, y confundirlos da una firma perfecta sobre una clave distinta:
  // todo el cálculo cuadra y solo falla el último HMAC.
  llaveSecreta: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  region: 'us-east-1',
  servicio: 's3',
};

async function verificarFirmaS3() {
  const instante = new Date('2013-05-24T00:00:00Z');

  await pruebaAsync('el hash del cuerpo coincide con el vector de AWS', async () => {
    const cabeceras = await firmarPeticion(
      {
        metodo: 'PUT',
        url: 'https://examplebucket.s3.amazonaws.com/test%24file.text',
        cuerpo: new TextEncoder().encode('Welcome to Amazon S3.'),
        instante,
      },
      CREDENCIALES_DE_EJEMPLO,
    );
    assert.equal(
      cabeceras['x-amz-content-sha256'],
      '44ce7dd67c959e0d3524ffac1771dfbba87d2b6b4b4e99e42034a8b803f8b072',
    );
  });

  await pruebaAsync('firma un PUT con cuerpo igual que el vector de AWS', async () => {
    const cabeceras = await firmarPeticion(
      {
        metodo: 'PUT',
        url: 'https://examplebucket.s3.amazonaws.com/test%24file.text',
        cabeceras: {
          date: 'Fri, 24 May 2013 00:00:00 GMT',
          'x-amz-storage-class': 'REDUCED_REDUNDANCY',
        },
        cuerpo: new TextEncoder().encode('Welcome to Amazon S3.'),
        instante,
      },
      CREDENCIALES_DE_EJEMPLO,
    );

    assert.equal(
      cabeceras.Authorization,
      'AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request, ' +
        'SignedHeaders=date;host;x-amz-content-sha256;x-amz-date;x-amz-storage-class, ' +
        'Signature=98ad721746da40c64f1a55b78f14c238d841ea1380cd77a1b5971af0ece108bd',
    );
  });

  await pruebaAsync('firma un GET sin cuerpo igual que el vector de AWS', async () => {
    const cabeceras = await firmarPeticion(
      {
        metodo: 'GET',
        url: 'https://examplebucket.s3.amazonaws.com/test.txt',
        cabeceras: { range: 'bytes=0-9' },
        instante,
      },
      CREDENCIALES_DE_EJEMPLO,
    );

    assert.equal(
      cabeceras.Authorization,
      'AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request, ' +
        'SignedHeaders=host;range;x-amz-content-sha256;x-amz-date, ' +
        'Signature=f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41',
    );
  });

  await pruebaAsync('la firma cambia con el día, la región y el servicio', async () => {
    // El encadenamiento de HMAC existe justamente para esto: una firma
    // interceptada no se puede reusar mañana ni contra otro servicio.
    const base = {
      metodo: 'GET',
      url: 'https://examplebucket.s3.amazonaws.com/test.txt',
      instante,
    };
    const hoy = await firmarPeticion(base, CREDENCIALES_DE_EJEMPLO);
    const manana = await firmarPeticion(
      { ...base, instante: new Date('2013-05-25T00:00:00Z') },
      CREDENCIALES_DE_EJEMPLO,
    );
    const otraRegion = await firmarPeticion(base, {
      ...CREDENCIALES_DE_EJEMPLO,
      region: 'eu-west-1',
    });

    assert.notEqual(hoy.Authorization, manana.Authorization);
    assert.notEqual(hoy.Authorization, otraRegion.Authorization);
  });

  await pruebaAsync('una clave con espacios y acentos se codifica sin romper la firma', async () => {
    // No es teórico: el nombre del objeto lo arma el servidor a partir de ids,
    // pero la ruta pasa por el mismo camino que cualquier otra. Si esto se
    // codificara dos veces —el error clásico en S3— fallaría solo a veces.
    const cabeceras = await firmarPeticion(
      {
        metodo: 'PUT',
        url: 'https://examplebucket.s3.amazonaws.com/obra%20norte/motoniveladora%20a%C3%B1o.jpg',
        cuerpo: new TextEncoder().encode('x'),
        instante,
      },
      CREDENCIALES_DE_EJEMPLO,
    );
    assert.match(cabeceras.Authorization, /^AWS4-HMAC-SHA256 Credential=/);
    assert.ok(cabeceras.Authorization.includes('SignedHeaders=host;x-amz-content-sha256;x-amz-date'));
  });
}

/* ------------------------------------------------------------------------ */
/* Escrituras simultáneas del almacén (spec 009, RF-16)                      */
/* ------------------------------------------------------------------------ */

/**
 * El choque se simula con la misma forma que tiene de verdad: Drizzle envuelve el
 * error del driver y el código de Postgres queda en `cause`. Contra Neon se
 * comprueba en T8, con dos salidas lanzadas a la vez.
 */
function choqueDePostgres(): Error {
  return new Error('Failed query: insert into "almacen_movimientos"…', {
    cause: { code: '40001', message: 'could not serialize access' },
  });
}

async function verificarChoques() {
  await pruebaAsync('un choque de dos salidas simultáneas se repite una vez', async () => {
    // El primer intento choca y no guardó nada; el segundo ve el stock nuevo.
    let intentos = 0;
    const resultado = await conReintentoSiChoca(async () => {
      intentos += 1;
      if (intentos === 1) throw choqueDePostgres();
      return 'guardada';
    });
    assert.equal(resultado, 'guardada');
    assert.equal(intentos, 2);
  });

  await pruebaAsync('un segundo choque se responde 409 con qué hacer', async () => {
    let intentos = 0;
    const respuesta = await responder(() =>
      conReintentoSiChoca(async () => {
        intentos += 1;
        throw choqueDePostgres();
      }),
    );
    assert.equal(intentos, 2);
    assert.equal(respuesta.status, 409);
    assert.deepEqual(await respuesta.json(), { error: MENSAJE_DE_CHOQUE });
  });

  await pruebaAsync('cualquier otro fallo no se reintenta', async () => {
    let intentos = 0;
    await assert.rejects(
      conReintentoSiChoca(async () => {
        intentos += 1;
        throw new Error('Failed query', { cause: { code: '23505' } });
      }),
    );
    assert.equal(intentos, 1);
  });
}

verificarFirmaS3()
  .then(verificarChoques)
  .then(verificarCripto)
  .then(() => console.log(`\n${pruebas} verificaciones correctas.\n`))
  .catch((error) => {
    console.error('\nFalló una verificación:', error);
    process.exit(1);
  });
