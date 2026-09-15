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
import { duplicadoDe } from '../src/features/servidor/respuestas';

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
  MODULOS,
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
  cantidadLegible,
  MATERIALES_LABORATORIO,
  nombreDeClima,
  nombreDeMaterial,
} from '../src/shared/catalogos/bitacora';
import { Colors, Estado, Panel } from '../src/constants/paleta';
import {
  AnchoContenidoConIndice,
  MaxContentWidthPanel,
  Spacing,
} from '../src/constants/medidas';
import { filtrarOpciones, normalizar, ofreceBusqueda } from '../src/shared/rules/texto';
import { colocarLista } from '../src/shared/rules/flotante';
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
  mensajeDeDiaSinTrabajo,
  mensajeDelRechazoDeCierre,
  resolverDiaSinTrabajo,
  seccionesDelParte,
  validarDiaSinTrabajo,
  type ConteosDelParte,
  type FotosDelParte,
  type ParteEvaluable,
} from '../src/shared/rules/parte';
import { calcularDimensiones } from '../src/shared/rules/dimensiones';
import { construirActividadDelParte, construirMaquina } from '../src/features/bitacoras/parte';
import { parteEditado } from '../src/features/panel/contratos';

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
  });
  assert.equal(actividad.area, 12);
  // Sin alto, el volumen es el que se escribió (RF-60).
  assert.equal(actividad.volumen, 7);
  // Y el id que trae se conserva: es a lo que apuntan sus fotos (RF-47).
  assert.equal(actividad.id, 'act-1');
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

prueba('el residente solo entra a inicio, asignaciones, bitácoras y preoperacionales', () => {
  assert.deepEqual(modulosVisibles('supervisor'), [
    'inicio',
    'asignaciones',
    'bitacoras',
    'preoperacionales',
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

prueba('los materiales de laboratorio traen su unidad pegada', () => {
  // Un «3» de cemento sin decir si son bultos o metros cúbicos es el dato que
  // después nadie sabe interpretar.
  assert.equal(new Set(MATERIALES_LABORATORIO.map((m) => m.id)).size, MATERIALES_LABORATORIO.length);
  assert.equal(cantidadLegible('cemento', 4), '4 bultos');
  assert.equal(cantidadLegible('base_granular', 12), '12 m³');
  assert.equal(nombreDeMaterial('inventado'), 'inventado');
  assert.equal(nombreDeClima('lloviendo'), 'Lloviendo');
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

prueba('están los quince cargos, con slug y rótulo únicos', () => {
  assert.equal(CARGOS.length, 15);
  assert.equal(new Set(CARGOS.map((c) => c.id)).size, 15);
  assert.equal(new Set(CARGOS.map((c) => c.nombre)).size, 15);
});

prueba('solo la dirección y las residencias entran al panel', () => {
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

verificarFirmaS3()
  .then(verificarCripto)
  .then(() => console.log(`\n${pruebas} verificaciones correctas.\n`))
  .catch((error) => {
    console.error('\nFalló una verificación:', error);
    process.exit(1);
  });
