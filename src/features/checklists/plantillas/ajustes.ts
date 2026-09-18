/**
 * Lo que el Excel de OCC no puede expresar.
 *
 * `scripts/import-formatos.ts` traduce las hojas de cálculo tal cual, y eso es
 * deliberado: el formato de la app tiene que ser el formato firmado por OCC. Pero
 * hay decisiones que el Excel no sabe decir —una casilla que existe en el papel y
 * que en la práctica no se llena, por ejemplo— y que no pueden resolverse editando
 * el JSON generado, porque el JSON se regenera y el ajuste se perdería.
 *
 * Este archivo es ese lugar. Cada ajuste va con el motivo escrito y la spec que
 * lo pidió, porque un ajuste sin motivo es indistinguible de un error de
 * importación.
 *
 * **Un ajuste que cambia los ítems cambia el formato, y por tanto la versión.**
 * El identificador de una plantilla es `<tipo>-v<version>` y su huella se firma
 * con cada acta: si se altera lo que se pregunta sin subir la versión, las actas
 * viejas dejarían de cuadrar con la plantilla que dicen haber usado.
 */
import type { PlantillaChecklist } from '../types';

/**
 * Spec 003 / RF-4: camioneta y volqueta se controlan por kilometraje.
 *
 * El formato de OCC trae una casilla de horómetro para las dos, pero esos
 * equipos no trabajan por horas de motor: lo que se controla son los kilómetros.
 * Pedir una lectura que nadie mira convierte el preoperacional en un trámite, y
 * un trámite se llena con cualquier número.
 *
 * Se quita el ítem y se oculta el medidor. Las dos cosas: dejar el ítem dentro
 * de las secciones con el medidor oculto haría que el operador nunca pudiera
 * firmar, porque la evaluación lo contaría como una respuesta que falta.
 */
const SIN_HOROMETRO = new Set(['camioneta', 'volqueta']);

/**
 * Spec 011: los ítems que se retiran de cada formato.
 *
 * OCC pidió acortar los formatos porque nadie llena 86 ítems con guantes a las
 * seis de la mañana, y un formato que se contesta a la carrera no controla nada.
 * Se van los que el operador **no puede responder mirando**: lo que hay que
 * desarmar, levantar o mirar desde debajo de la máquina —bombas, valvulinas,
 * estructuras internas, depósitos— y lo que el Excel pregunta dos veces.
 *
 * ── Por qué claves completas y no posiciones ──
 *
 * Se escriben enteras, no como «el ítem 4 de la sección 3». La clave es el
 * identificador estable del ítem; una tabla por posición se rompería sola la
 * próxima vez que OCC inserte una fila en su Excel, y estaríamos retirando un
 * ítem distinto del acordado **sin que nada fallara a la vista**. Por eso el
 * guion de verificación comprueba que cada una de estas claves existe de verdad
 * en el formato anterior.
 *
 * La lista por tipo y el motivo de cada grupo están en el anexo A de la spec 011.
 */
export const ITEMS_RETIRADOS: Record<string, readonly string[]> = {
  volqueta: [
    'tablero_de_control__conexiones_electricas',
    'tablero_de_control__torpedo',
    'cabina__asientos',
    'cabina__vidrios_de_ventanas',
    'motor__deposito_de_refrigerante',
    'motor__correas_patin_tensor_y_bomba_de_agua',
    'motor__tanque_combustible',
    'motor__estructura_motor',
    // FRENOS entera: solo se revisan en taller. La reemplaza «Los frenos
    // responden bien», que el operador sí puede juzgar pisando el pedal.
    'frenos__valvulas_relay_y_mangueras',
    'frenos__camaras_de_seguridad',
    'frenos__bandas_y_campanas',
    'frenos__rachets',
    'frenos__mangueras_tubos_conexiones_y_racores',
    'transmision_de_cambios__liquido_del_embrague',
    'transmision_de_cambios__estructura_transmision',
    'diferenciales__estructura_diferenciales',
    'diferenciales__valvulina',
    'diferenciales__kit_central',
    'suspencion__corbatines',
    // DIRRECCIÓN entera, por lo mismo que FRENOS.
    'dirreccion__botella',
    'dirreccion__bomba_hidraulica',
    'dirreccion__aceite_hidraulico',
    'dirreccion__mangueras',
    'dirreccion__biela',
    'dirreccion__brazo_pitman',
    'dirreccion__barra_y_terminales',
    'dirreccion__crucetas',
    'volteo__camara_apertura_compuerta',
    'volteo__aceite_hidraulico',
    'volteo__bomba_hidraulica',
    'volteo__chasis',
    'ruedas__tapa_valvulas',
    // Los dos documentos se funden en uno solo: «Documentos al día».
    'adicionales__soat_y_tcm',
    'adicionales__licencia_de_propiedad',
  ],
  camioneta: [
    'cabina__vidrios_de_ventanas',
    'cabina__asientos',
    'capot_o_careta__botella',
    'capot_o_careta__cruceta',
    'capot_o_careta__mangueras_y_acoples',
    // Las tres siguientes ya están dentro de «Ventilador, correas y bomba de
    // agua», que es diario: la misma correa preguntada cuatro veces.
    'capot_o_careta__correas_del_motor',
    'capot_o_careta__patin_tensor',
    'capot_o_careta__bomba_de_agua',
    'chasis__diferenciales',
    'chasis__transmision_de_velocidades',
    'chasis__terminales_de_la_direccion',
    'chasis__barras_de_direccion_o_cremallera',
    'chasis__valvulinas',
    'chasis__kit_central',
    'chasis__embrague',
    'ruedas__tapa_valvulas',
    'carroceria__tanque_de_combustible',
    // RODAJE entera: repite lo que ya preguntan RUEDAS y ADICIONALES, solo que
    // con otra periodicidad. El operador contesta lo mismo tres veces.
    'rodaje__llantas',
    'rodaje__llanta_de_repuesto',
    'rodaje__llantas__mensual',
  ],
  motoniveladora: [
    'cabina__asiento_s',
    'estructura_exterior__mangueras_tubos_y_acoples',
    'estructura_exterior__aceite_del_mando_del_circulo_o_tornamesa',
    'estructura_exterior__aceite_de_la_transmicion',
    'estructura_exterior__puntos_de_remolque_e_izaje',
    'capot_o_careta__aceite_del_diferencial',
    'capot_o_careta__deposito_refrigerante',
    'capot_o_careta__tanque_de_combustible',
    'capot_o_careta__bomba_de_inyeccion',
    'capot_o_careta__estructura_motor',
    'ruedas__tapa_valvulas',
  ],
  retrocargador: [
    'cabina__asiento',
    'estructura_exterior__mangueras_tubos_acoples_y_racores',
    'estructura_exterior__tanque_de_combustible',
    'estructura_exterior__puntos_de_remolque_e_izaje',
    'capot_o_careta__deposito_refrigerante',
    'capot_o_careta__bomba_de_inyeccion',
    'capot_o_careta__estructura_motor',
    'ruedas__tapa_valvulas',
  ],
  retroexcavadora: [
    'cabina__asiento',
    'estructura_exterior__mangueras_tubos_acoples_y_racores',
    'estructura_exterior__aceite_del_mando_del_circulo_o_tornamesa',
    'estructura_exterior__tanque_de_combustible',
    'estructura_exterior__puntos_de_remolque_e_izaje',
    'capot_o_careta__bomba_de_llenado_de_combustible',
    'capot_o_careta__deposito_refrigerante',
    'capot_o_careta__bomba_de_inyeccion',
    'capot_o_careta__estructura_motor',
  ],
};

/** Un ítem que no viene del Excel de OCC, sino de la spec 011 (anexo B). */
export interface ItemNuevo {
  /** Clave estable, con la forma `<seccion>__<slug>` que usa el importador. */
  clave: string;
  /** La sección donde entra. Tiene que existir ya en el formato. */
  seccion: string;
  label: string;
  /** El sistema al que pertenece, con los mismos nombres que usa el Excel. */
  sistema: string;
  /** El instructivo: qué tiene que mirar el operador para contestarlo. */
  ayuda: string;
}

/**
 * Spec 011: los ítems que entran donde se fue un sistema entero.
 *
 * Quitar FRENOS y DIRRECCIÓN de la volqueta dejaría el preoperacional sin una
 * sola pregunta sobre los dos sistemas por los que una volqueta cargada mata a
 * alguien. En vez de conservar los ítems de taller, entra uno que el operador sí
 * puede responder antes de arrancar, y ese sí inmoviliza la máquina (spec 011,
 * RF-9 a RF-11).
 *
 * Las claves se escogen cortas y estables; no salen de ningún Excel porque estos
 * ítems no están en ninguno, y por eso mismo no pueden chocar con una retirada:
 * el guion lo comprueba.
 */
export const ITEMS_NUEVOS: Record<string, readonly ItemNuevo[]> = {
  volqueta: [
    {
      clave: 'frenos__los_frenos_responden_bien',
      seccion: 'frenos',
      label: 'Los frenos responden bien',
      sistema: 'MECANICO',
      ayuda: 'El pedal responde sin hundirse hasta el fondo y la máquina frena derecho.',
    },
    {
      clave: 'dirreccion__direccion_sin_juego_ni_ruidos',
      seccion: 'dirreccion',
      label: 'Dirección sin juego ni ruidos',
      sistema: 'MECANICO',
      ayuda: 'El timón responde sin juego muerto, sin ruidos y sin tirar hacia un lado.',
    },
    {
      clave: 'adicionales__documentos_al_dia',
      seccion: 'adicionales',
      label: 'Documentos al día (SOAT, técnicomecánica y tarjeta de propiedad)',
      sistema: 'DOCUMENTO',
      ayuda: 'Los tres vigentes y dentro del vehículo.',
    },
  ],
  camioneta: [
    {
      clave: 'chasis__direccion_sin_juego_ni_ruidos',
      seccion: 'chasis',
      label: 'Dirección sin juego ni ruidos',
      sistema: 'MECANICO',
      ayuda: 'El timón responde sin juego muerto, sin ruidos y sin tirar hacia un lado.',
    },
  ],
};

/**
 * Spec 011: los ítems que pasan a inmovilizar la máquina.
 *
 * El sufijo «- AI» del Excel lo puso OCC en las volquetas y las camionetas, pero
 * **sus tres formatos de maquinaria amarilla no traen ni uno**: tal como venían,
 * una motoniveladora con la cabina rota, sin frenos o sin cinturón salía APTA, y
 * el preoperacional no podía parar nada. El importador ya lo avisaba en cada
 * corrida («0 inmovilizan ← revisar con SST») y nadie lo había resuelto.
 *
 * Lo que entra es lo que deja a una persona herida si falla, no lo que deja la
 * máquina parada: la jaula que la protege si vuelca, lo que evita atropellar a
 * alguien en reversa, lo que impide que el brazo se mueva solo, los frenos y el
 * tren de rodaje. Lo aprobó Diego el 2026-09-18 (spec 011, anexo C); OCC no ha
 * mandado su lista, y cuando la mande esto se corrige subiendo otra versión.
 */
const ITEMS_QUE_INMOVILIZAN: Record<string, readonly string[]> = {
  volqueta: [
    // Los tres resumidos del anexo B: son los que reemplazan a sistemas enteros.
    'frenos__los_frenos_responden_bien',
    'dirreccion__direccion_sin_juego_ni_ruidos',
    'adicionales__documentos_al_dia',
  ],
  camioneta: [
    'chasis__direccion_sin_juego_ni_ruidos',
    // Hereda la marca de «Correas del motor», que se retiró por repetirlo: la
    // correa que se revienta deja la camioneta tirada igual que antes.
    'capot_o_careta__ventilador_correas_y_bomba_de_agua',
  ],
  motoniveladora: [
    'cabina__cinturon_de_seguridad',
    'cabina__alarma_de_retroceso_y_bocina_pito',
    'cabina__estructura_cabina',
    // Los únicos tres ítems de freno que tiene el formato.
    'cabina__freno_de_servicio',
    'cabina__freno_de_estacionamiento',
    'cabina__parada_de_emergencia',
    'luces_y_senales__farolas_delanteras',
    'ruedas__pastillas_y_rotor_del_freno',
    'ruedas__llantas_eje_1',
    'ruedas__llantas_eje_2',
    'ruedas__llantas_eje_3',
    'adicionales__kit_de_seguridad',
  ],
  retrocargador: [
    'cabina__cinturon_de_seguridad',
    'cabina__alarma_de_retroceso_y_bocina_claxon_pito',
    'cabina__estructura_cabina',
    // Sin ella el brazo se mueve solo con la máquina apagada.
    'cabina__palanca_de_bloqueo_de_seguridad',
    'luces_y_senales__farolas_delanteras',
    'ruedas__llantas_eje_1',
    'ruedas__llantas_eje_2',
    'adicionales__kit_de_seguridad',
  ],
  retroexcavadora: [
    'cabina__cinturon_de_seguridad',
    'cabina__alarma_de_retroceso_y_bocina_claxon_pito',
    'cabina__estructura_cabina',
    'cabina__palanca_de_bloqueo_de_seguridad',
    'luces_y_senales__farolas_delanteras',
    'tren_de_rodaje__orugas_eslabones_zapatas_y_pernos',
    'adicionales__kit_de_seguridad',
  ],
};

/**
 * La versión de cada formato después de los ajustes.
 *
 * El identificador de una plantilla es `<tipo>-v<version>` y su huella se firma
 * con cada acta, así que **cada vez que cambia lo que se pregunta, sube aquí**.
 * Camioneta y volqueta ya iban por la v2 desde la spec 003 (el horómetro) y la
 * poda de la 011 las lleva a la v3; las tres amarillas estrenan v2 con esa poda.
 *
 * Un tipo que no esté en esta tabla no lleva ajustes y se queda tal como lo
 * importó el script, en su v1.
 */
const VERSIONES: Record<string, number> = {
  camioneta: 3,
  volqueta: 3,
  motoniveladora: 2,
  retrocargador: 2,
  retroexcavadora: 2,
};

/** Aplica a una plantilla recién importada lo que el Excel no sabe decir. */
export function aplicarAjustes(plantilla: PlantillaChecklist): PlantillaChecklist {
  const tipo = plantilla.tipoVehiculo;
  const version = VERSIONES[tipo];
  if (version === undefined) return plantilla;

  const sinHorometro = SIN_HOROMETRO.has(tipo);
  const retirados = new Set(ITEMS_RETIRADOS[tipo] ?? []);

  const nuevos = ITEMS_NUEVOS[tipo] ?? [];
  const inmovilizan = new Set(ITEMS_QUE_INMOVILIZAN[tipo] ?? []);

  const secciones = plantilla.secciones
    .map((seccion) => ({
      ...seccion,
      items: [
        ...seccion.items
          .filter(
            (item) =>
              !retirados.has(item.key) &&
              !(sinHorometro && item.tipo === 'numero' && item.unidad === 'h'),
          )
          // Se añade a lo que ya marcó OCC con su «- AI»; nunca se le quita.
          .map((item) =>
            inmovilizan.has(item.key) ? { ...item, inmoviliza: true } : item,
          ),
        // Los ítems resumidos entran **antes** de descartar las secciones vacías:
        // FRENOS y DIRRECCIÓN de la volqueta se quedan sin ninguno de los suyos, y
        // si se filtrara primero, el ítem nuevo no tendría dónde ir y habría que
        // reinventar el título de su sección.
        ...nuevos
          .filter((nuevo) => nuevo.seccion === seccion.key)
          .map((nuevo) => ({
            key: nuevo.clave,
            label: nuevo.label,
            sistema: nuevo.sistema,
            tipo: 'conformidad' as const,
            periodicidad: 'diaria' as const,
            inmoviliza: inmovilizan.has(nuevo.clave),
            ayuda: nuevo.ayuda,
            exigirFoto: 'no_conforme' as const,
          })),
      ],
    }))
    // Una sección sin ítems no se enseña. Así desaparece RODAJE de la camioneta,
    // que repetía lo que ya preguntan RUEDAS y ADICIONALES.
    .filter((seccion) => seccion.items.length > 0);

  const items = secciones.flatMap((s) => s.items);

  return {
    ...plantilla,
    version,
    medidores: sinHorometro
      ? { ...plantilla.medidores, horometro: 'oculto' }
      : plantilla.medidores,
    // Se recalculan sobre lo que quedó: la camioneta pierde sus seis ítems
    // mensuales con la poda, y anunciar un ciclo que ya no tiene ningún ítem
    // le ofrecería al operador una revisión vacía.
    periodicidades: plantilla.periodicidades.filter((p) =>
      items.some((item) => item.periodicidad === p),
    ),
    secciones,
  };
}
