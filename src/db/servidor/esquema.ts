/**
 * Base del servidor (Postgres).
 *
 * Es el espejo de `src/db/local/schema.ts`, y esa correspondencia es deliberada:
 * los nombres de tabla y de columna son los mismos para que leer las dos bases
 * en paralelo no exija traducir nada. Donde se apartan, se apartan a propósito y
 * queda dicho aquí mismo.
 *
 * Las tres diferencias estructurales frente al teléfono:
 *
 *  1. **`actualizado_en` en todas las réplicas.** Es el `server_updated_at` que
 *     ya prescribe el cursor de sincronización (`schema.ts:312`). Lo mantiene un
 *     disparador —ver `disparadores.ts`— y no la aplicación, porque un pull que
 *     se pierda un cambio por un `UPDATE` hecho a mano en la consola de Neon es
 *     un fallo silencioso: el celular se queda con datos viejos sin que nadie se
 *     entere.
 *
 *  2. **Lápidas en todas las réplicas.** `usuarios`, `asignaciones` y
 *     `tipos_vehiculo` no tenían `eliminado_en` en local. Sin lápida no hay
 *     manera de propagar una baja: la fila simplemente deja de venir en el
 *     snapshot y el teléfono no puede distinguir "la borraron" de "no me toca".
 *
 *  3. **Las capturas no llevan `estado_sync` ni `ultimo_error`.** Esos dos son
 *     conceptos del dispositivo —dónde va *mi* copia— y aquí no significan nada.
 *     En su lugar van `recibido_en` y el trío de anulación: un preoperacional
 *     firmado es evidencia y se corrige anulándolo, nunca sobrescribiéndolo.
 *
 * Nada de este archivo puede entrar al bundle del cliente: lo importan solo las
 * rutas `+api.ts` y los scripts de Node.
 */
import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// Rutas relativas y no el alias `@/`: drizzle-kit empaqueta este archivo con
// esbuild por su cuenta y no lee los `paths` del tsconfig, igual que en
// `src/db/local/schema.ts`.
import type {
  ActividadBitacora,
  ActividadDelParte,
  FilaDeControlDeCalidad,
  FranjaDeClima,
  MaquinaDelParte,
  PersonaDelParte,
  ViajeDelParte,
} from '../../features/bitacoras/tipos';
import type { EventoDelEnsayo, GranulometriaDelParte } from '../../features/laboratorio/tipos';
import type { UnidadAlmacen } from '../../shared/catalogos/almacen';
import type { Cargo } from '../../shared/catalogos/cargos';
import { ESTADOS_ENSAYO } from '../../shared/catalogos/estados-ensayo';
import type { FranjaGranulometrica } from '../../shared/catalogos/franjas-granulometricas';
import { HORARIO_PROPUESTO, type HorarioDeObra } from '../../shared/rules/horas';
import type {
  MasasDelEnsayo,
  ResultadoGranulometria,
  RetenidosDelEnsayo,
} from '../../shared/rules/granulometria';
import { ROLES } from '../../shared/rules/permisos';
import type {
  PlantillaChecklist,
  RespuestaItem,
  ResultadoPreoperacional,
} from '../../features/checklists/types';

/* ------------------------------------------------------------------------ */
/* Enumeraciones                                                             */
/* ------------------------------------------------------------------------ */

/**
 * Los mismos conjuntos cerrados que declara el esquema local, pero como tipos
 * de Postgres: aquí escriben varios clientes a la vez y la integridad no puede
 * depender de que todos se porten bien.
 *
 * Los roles salen de `shared/rules/permisos`, que es quien decide qué puede cada
 * uno: una lista escrita aquí y otra allá acabarían diciendo cosas distintas. Los
 * cargos reales de OCC se mapean —residente y director de obra son `supervisor`,
 * gerencia es `admin`— y el oficio va en su propia columna. La spec 008 añadió
 * `almacenista` y `encargado_planta`; ver el porqué en `permisos.ts`.
 */
export const rolUsuario = pgEnum('rol_usuario', ROLES);
export const claseMedidor = pgEnum('clase_medidor', ['odometro', 'horometro', 'ambos']);
export const estadoVehiculo = pgEnum('estado_vehiculo', [
  'operativo',
  'en_mantenimiento',
  'fuera_servicio',
  'no_apto',
]);
export const origenAsignacion = pgEnum('origen_asignacion', ['supervisor', 'autoasignada']);
export const duenoMedia = pgEnum('dueno_media', ['preoperacional', 'bitacora', 'documento']);
export const propositoMedia = pgEnum('proposito_media', [
  'hallazgo',
  'firma_operador',
  'foto_horometro',
  'evidencia',
]);
export const operacionSync = pgEnum('operacion_sync', ['upsert', 'delete']);

/**
 * Los dos códigos que se le entregan a un operador, emitidos juntos.
 *
 *  · `activacion` — un solo uso, caduca. Enrola el equipo, y es el único momento
 *    en que la app necesita señal.
 *  · `respaldo` — la salida cuando el operador olvida su PIN **sin señal**. Se
 *    imprime y se guarda en la carpeta de la obra; el teléfono guarda su
 *    verificador al activarse, y por eso se puede comprobar en modo avión.
 */
export const tipoCodigo = pgEnum('tipo_codigo', ['activacion', 'respaldo']);

/**
 * Lo que le pasa a un material del almacén (spec 009): entra o sale. Como enum de
 * la base y no como catálogo, a diferencia de las unidades: son dos, no van a
 * crecer sin una spec, y el stock es una suma con signo que depende de este valor.
 */
export const tipoMovimientoAlmacen = pgEnum('tipo_movimiento_almacen', ['ingreso', 'salida']);

/** Qué es un sitio de origen o destino de un viaje de cantera (spec 010, RF-1). */
export const tipoSitioCantera = pgEnum('tipo_sitio_cantera', ['cantera', 'planta', 'otro']);

/**
 * En qué punto del flujo está un ensayo de laboratorio (spec 018). Anulado y
 * descartado son marcas de tiempo aparte: ver `shared/catalogos/estados-ensayo`.
 */
export const estadoEnsayo = pgEnum('estado_ensayo', ESTADOS_ENSAYO);

/** Columna de reloj del servidor, presente en toda tabla que el celular replica. */
const actualizadoEn = () =>
  timestamp('actualizado_en', { withTimezone: true, mode: 'date' })
    .notNull()
    .default(sql`now()`);

const creadoEn = () =>
  timestamp('creado_en', { withTimezone: true, mode: 'date' })
    .notNull()
    .default(sql`now()`);

/** Lápida. El pull la traduce a baja lógica en el teléfono; nunca a un DELETE. */
const eliminadoEn = () => timestamp('eliminado_en', { withTimezone: true, mode: 'date' });

/* ------------------------------------------------------------------------ */
/* Réplicas (nacen aquí, el celular las recibe)                              */
/* ------------------------------------------------------------------------ */

export const obras = pgTable(
  'obras',
  {
    id: text('id').primaryKey(),
    codigo: text('codigo').notNull(),
    nombre: text('nombre').notNull(),
    municipio: text('municipio'),
    activa: boolean('activa').notNull().default(true),
    /**
     * El horario acordado en la obra (spec 016): contra él se cuentan las horas
     * extra de su gente. Not null con el propuesto por defecto, y no nulo con el
     * propuesto «en el código»: cada lectura tendría que acordarse del respaldo, y
     * la que se olvide calcula con otro horario sin que se note. El default es
     * además lo que les dio horario a las obras que ya existían (RF-9).
     */
    horario: jsonb('horario').$type<HorarioDeObra>().notNull().default(HORARIO_PROPUESTO),
    /**
     * Qué módulos lleva esta obra (spec 017): hay obras sin almacén propio y obras
     * que no mueven material de cantera, y para ellas esos dos módulos son ruido.
     *
     * Not null con default `true`, y ese default **es** RF-2: deja encendidas las
     * obras que ya existían sin tocar ninguna fila. Apagar no borra nada —lo
     * registrado sigue en su tabla y vuelve a verse al encender (RF-14, RF-15)—:
     * esto solo decide quién ve el módulo y dónde se puede registrar.
     */
    almacenActivo: boolean('almacen_activo').notNull().default(true),
    canteraActivo: boolean('cantera_activo').notNull().default(true),
    /**
     * Laboratorio (spec 018). **Default `false`, al revés que los dos de arriba**, y
     * ese default es RF-12: el módulo es nuevo, y encenderlo en todas las obras que ya
     * existían le pondría a cada residente un módulo vacío en el menú. La gerencia lo
     * enciende donde hay laboratorio. El «propuesto encendido» de una obra nueva
     * (RF-13) lo pone el alta, no la base.
     */
    laboratorioActivo: boolean('laboratorio_activo').notNull().default(false),
    eliminadoEn: eliminadoEn(),
    creadoEn: creadoEn(),
    actualizadoEn: actualizadoEn(),
  },
  (t) => [
    // Parcial: un código puede reutilizarse después de dar la obra de baja, pero
    // no puede haber dos obras vivas con el mismo.
    uniqueIndex('ux_obras_codigo')
      .on(t.codigo)
      .where(sql`eliminado_en is null`),
  ],
);

export const usuarios = pgTable(
  'usuarios',
  {
    id: text('id').primaryKey(),
    usuario: text('usuario').notNull(),
    nombreCompleto: text('nombre_completo').notNull(),
    documento: text('documento'),
    rol: rolUsuario('rol').notNull().default('operador'),
    /**
     * Qué hace en la obra: topógrafo, cadenero, maestro… El `rol` de arriba es
     * el acceso al sistema, y solo se amplía cuando cambia lo que alguien puede
     * hacer (spec 008: almacenista y encargado de planta); esto es el oficio, y
     * son dos cosas distintas. Los valores viven en `shared/catalogos/cargos`,
     * no en un enum de la base: son la llave que une a una persona con su cargo
     * en las dos bases, y un enum aquí obligaría a una migración de tipo por
     * cada cargo nuevo.
     *
     * Nullable porque las personas registradas antes de la spec 002 no tienen
     * cargo, y eso es un estado real, no un dato que falte por descuido.
     */
    cargo: text('cargo').$type<Cargo>(),
    /**
     * La obra a la que pertenece. Solo importa para quien lleva las bitácoras:
     * un jefe de operadores no tiene vehículo asignado, así que sin esto no hay
     * forma de saber qué máquinas le tocan.
     */
    obraId: text('obra_id').references(() => obras.id),
    activo: boolean('activo').notNull().default(true),
    eliminadoEn: eliminadoEn(),
    creadoEn: creadoEn(),
    actualizadoEn: actualizadoEn(),
  },
  (t) => [
    // El índice que `src/features/auth/servicio.ts` da por hecho desde la Fase 1
    // y que no existe en ninguna de las dos bases. Sin él, dos personas pueden
    // acabar compartiendo nombre de usuario y el ingreso se vuelve ambiguo.
    uniqueIndex('ux_usuarios_usuario')
      .on(t.usuario)
      .where(sql`eliminado_en is null`),
    index('ix_usuarios_obra').on(t.obraId),
  ],
);

export const tiposVehiculo = pgTable('tipos_vehiculo', {
  /** Slug estable: 'camioneta', 'volqueta', 'retroexcavadora'… Ver `@/shared/catalogos/tipos-vehiculo`. */
  id: text('id').primaryKey(),
  nombre: text('nombre').notNull(),
  claseMedidor: claseMedidor('clase_medidor').notNull(),
  eliminadoEn: eliminadoEn(),
  actualizadoEn: actualizadoEn(),
});

export const vehiculos = pgTable(
  'vehiculos',
  {
    id: text('id').primaryKey(),
    codigoInterno: text('codigo_interno').notNull(),
    placa: text('placa'),
    tipoVehiculoId: text('tipo_vehiculo_id')
      .notNull()
      .references(() => tiposVehiculo.id),
    marca: text('marca'),
    modelo: text('modelo'),
    obraId: text('obra_id').references(() => obras.id),
    /**
     * Últimas lecturas conocidas. En el teléfono las adelanta la captura del
     * día; aquí llegarán con el push y siempre por el mayor valor, nunca hacia
     * atrás: un medidor que retrocede es un error de digitación, no un hecho.
     */
    odometroKm: integer('odometro_km'),
    horometroH: integer('horometro_h'),
    medidorActualizadoEn: timestamp('medidor_actualizado_en', {
      withTimezone: true,
      mode: 'date',
    }),
    estado: estadoVehiculo('estado').notNull().default('operativo'),
    eliminadoEn: eliminadoEn(),
    creadoEn: creadoEn(),
    actualizadoEn: actualizadoEn(),
  },
  (t) => [
    index('ix_vehiculos_tipo').on(t.tipoVehiculoId),
    index('ix_vehiculos_obra').on(t.obraId),
    uniqueIndex('ux_vehiculos_codigo')
      .on(t.codigoInterno)
      .where(sql`eliminado_en is null`),
  ],
);

/**
 * Las llantas de cada equipo, una fila por rueda. Spec 003.
 *
 * Por llanta y no por vehículo porque el desgaste es de cada rueda: en una
 * volqueta de diez, saber que «las llantas están al 40%» no dice cuál hay que
 * cambiar, que es justo el dato por el que existe este registro.
 *
 * **Solo en el servidor.** El celular no las necesita: el operador no las
 * registra ni las consulta, y replicar una tabla que nadie lee al teléfono es
 * peso muerto en la bajada. El día que el preoperacional mida el desgaste, esto
 * se replica.
 *
 * La posición sale de `shared/catalogos/llantas` y es una lista fija por tipo de
 * equipo. Se guarda el slug, no el rótulo.
 */
export const llantas = pgTable(
  'llantas',
  {
    id: text('id').primaryKey(),
    vehiculoId: text('vehiculo_id')
      .notNull()
      .references(() => vehiculos.id),
    /** Slug de `posicionesDe(tipoVehiculo)`: 'delantera_izquierda', 'eje2_derecha_externa'… */
    posicion: text('posicion').notNull(),
    marca: text('marca'),
    /** Diámetro del rin en pulgadas. Entero: no existen rines de 17,5 y medio. */
    rin: integer('rin'),
    /** Medidas de la llanta en milímetros, como vienen en el flanco. */
    ancho: integer('ancho'),
    alto: integer('alto'),
    /** De 0 a 100. Lo actualiza la gerencia en una revisión. */
    porcentajeDesgaste: integer('porcentaje_desgaste'),
    /**
     * Cuándo se retiró. Una llanta retirada no se borra: es el histórico de lo
     * que rodó en esa posición, y es lo que permite ver más adelante cada cuánto
     * hay que cambiarla.
     */
    retiradaEn: timestamp('retirada_en', { withTimezone: true, mode: 'date' }),
    motivoRetiro: text('motivo_retiro'),
    creadoEn: creadoEn(),
    actualizadoEn: actualizadoEn(),
  },
  (t) => [
    index('ix_llantas_vehiculo').on(t.vehiculoId),
    // Parcial: una posición puede volver a ocuparse cuando se retira la llanta
    // que estaba ahí, pero no puede haber dos puestas a la vez en el mismo sitio.
    uniqueIndex('ux_llantas_posicion')
      .on(t.vehiculoId, t.posicion)
      .where(sql`retirada_en is null`),
  ],
);

export const asignaciones = pgTable(
  'asignaciones',
  {
    id: text('id').primaryKey(),
    vehiculoId: text('vehiculo_id')
      .notNull()
      .references(() => vehiculos.id),
    usuarioId: text('usuario_id')
      .notNull()
      .references(() => usuarios.id),
    obraId: text('obra_id').references(() => obras.id),
    desde: timestamp('desde', { withTimezone: true, mode: 'date' }).notNull(),
    hasta: timestamp('hasta', { withTimezone: true, mode: 'date' }),
    /**
     * Quién decidió esta asignación. Hoy siempre `supervisor`: desde la spec 012
     * solo la administración asigna, y el endpoint del celular responde 422.
     *
     * `autoasignada` se conserva para las filas de antes del cambio, que el
     * panel sigue mostrando con su etiqueta. El valor **no se retira del enum**:
     * describe cómo se operó esa máquina y quitarlo sería reescribir la
     * historia.
     */
    origen: origenAsignacion('origen').notNull().default('supervisor'),
    /**
     * Rastro de la confirmación, que el teléfono no necesita y por eso no
     * replica. Confirmar pasa `origen` a 'supervisor' —es lo que apaga el aviso
     * en el celular— y eso, por sí solo, borraría el hecho de que la máquina se
     * tomó sin asignación previa. Estas dos columnas lo conservan.
     */
    confirmadaEn: timestamp('confirmada_en', { withTimezone: true, mode: 'date' }),
    confirmadaPor: text('confirmada_por').references(() => usuarios.id),
    eliminadoEn: eliminadoEn(),
    creadoEn: creadoEn(),
    actualizadoEn: actualizadoEn(),
  },
  (t) => [
    index('ix_asignaciones_usuario').on(t.usuarioId, t.hasta),
    index('ix_asignaciones_vehiculo').on(t.vehiculoId, t.hasta),
  ],
);

export const plantillas = pgTable(
  'plantillas',
  {
    id: text('id').primaryKey(),
    tipoVehiculoId: text('tipo_vehiculo_id')
      .notNull()
      .references(() => tiposVehiculo.id),
    version: integer('version').notNull(),
    /** SHA-256 de `cadenaCanonicaDePlantilla`: detecta que el formato fue alterado. */
    hash: text('hash').notNull(),
    esquema: jsonb('esquema').notNull().$type<PlantillaChecklist>(),
    publicadaEn: timestamp('publicada_en', { withTimezone: true, mode: 'date' }),
    eliminadoEn: eliminadoEn(),
    actualizadoEn: actualizadoEn(),
  },
  (t) => [uniqueIndex('ux_plantilla_tipo_version').on(t.tipoVehiculoId, t.version)],
);

/* ------------------------------------------------------------------------ */
/* Capturas (nacen en el teléfono, aquí se reciben)                          */
/* ------------------------------------------------------------------------ */

/**
 * Nadie escribe en estas tablas todavía: la subida es el entregable siguiente.
 * Se crean ya para no volver a migrar con datos de producción dentro, que es
 * cuando una migración pasa de trámite a riesgo.
 */

export const preoperacionales = pgTable(
  'preoperacionales',
  {
    /** UUID v7 generado en el dispositivo: el registro llega con su ID final. */
    id: text('id').primaryKey(),
    vehiculoId: text('vehiculo_id')
      .notNull()
      .references(() => vehiculos.id),
    usuarioId: text('usuario_id')
      .notNull()
      .references(() => usuarios.id),
    obraId: text('obra_id').references(() => obras.id),

    plantillaTipoVehiculo: text('plantilla_tipo_vehiculo').notNull(),
    plantillaVersion: integer('plantilla_version').notNull(),
    plantillaHash: text('plantilla_hash').notNull(),
    periodicidades: jsonb('periodicidades').notNull().$type<string[]>(),

    iniciadoEn: timestamp('iniciado_en', { withTimezone: true, mode: 'date' }).notNull(),
    enviadoEn: timestamp('enviado_en', { withTimezone: true, mode: 'date' }),

    odometroKm: integer('odometro_km'),
    horometroH: integer('horometro_h'),

    /**
     * JSONB tal cual, sin normalizar. Cada respuesta se auto-describe a
     * propósito: guarda el nombre del ítem además de su clave, para que un
     * registro de 2026 se siga pudiendo imprimir aunque el formato de OCC haya
     * cambiado tres veces. Repartirlo en tablas rompería justamente eso.
     */
    respuestas: jsonb('respuestas').notNull().$type<RespuestaItem[]>(),
    resultado: text('resultado').$type<ResultadoPreoperacional>(),
    cantidadInmovilizantes: integer('cantidad_inmovilizantes').notNull().default(0),
    observaciones: text('observaciones'),

    firmaOperadorMediaId: text('firma_operador_media_id'),
    fotoHorometroMediaId: text('foto_horometro_media_id'),

    /** Desfase del reloj del equipo contra el servidor, en ms, tal como lo reportó. */
    desfaseRelojMs: bigint('desfase_reloj_ms', { mode: 'number' }).notNull().default(0),

    recibidoEn: timestamp('recibido_en', { withTimezone: true, mode: 'date' })
      .notNull()
      .default(sql`now()`),

    /**
     * Anulación. Un preoperacional firmado es evidencia: se corrige anulándolo
     * desde el panel, con quién y por qué, nunca sobrescribiendo las respuestas.
     */
    anuladoEn: timestamp('anulado_en', { withTimezone: true, mode: 'date' }),
    anuladoPor: text('anulado_por').references(() => usuarios.id),
    motivoAnulacion: text('motivo_anulacion'),

    actualizadoEn: actualizadoEn(),
  },
  (t) => [
    index('ix_preop_vehiculo').on(t.vehiculoId, t.iniciadoEn),
    index('ix_preop_obra').on(t.obraId, t.iniciadoEn),
    index('ix_preop_usuario').on(t.usuarioId, t.iniciadoEn),
  ],
);

export const bitacoras = pgTable(
  'bitacoras',
  {
    id: text('id').primaryKey(),
    vehiculoId: text('vehiculo_id')
      .notNull()
      .references(() => vehiculos.id),
    usuarioId: text('usuario_id')
      .notNull()
      .references(() => usuarios.id),
    obraId: text('obra_id').references(() => obras.id),
    /**
     * Quién operó la máquina ese día, distinto de `usuarioId`: la bitácora la
     * lleva el jefe de operadores, pero lo que documenta es el trabajo del
     * operador. "Cuál equipo, con cuál operador" es literalmente lo que OCC
     * quiere saber.
     */
    operadorId: text('operador_id').references(() => usuarios.id),
    preoperacionalId: text('preoperacional_id').references(() => preoperacionales.id),
    /**
     * Día de trabajo, `YYYY-MM-DD` en hora local de Colombia. Se guarda como
     * `date` en modo texto, no como instante: la jornada del 3 de marzo es el 3
     * de marzo en obra, y convertirla a UTC la correría de día en la frontera de
     * la medianoche.
     */
    fecha: date('fecha', { mode: 'string' }).notNull(),
    horometroInicial: integer('horometro_inicial'),
    horometroFinal: integer('horometro_final'),
    actividades: jsonb('actividades').notNull().$type<ActividadBitacora[]>().default([]),
    cerradaEn: timestamp('cerrada_en', { withTimezone: true, mode: 'date' }),

    recibidoEn: timestamp('recibido_en', { withTimezone: true, mode: 'date' })
      .notNull()
      .default(sql`now()`),
    anuladoEn: timestamp('anulado_en', { withTimezone: true, mode: 'date' }),
    anuladoPor: text('anulado_por').references(() => usuarios.id),
    motivoAnulacion: text('motivo_anulacion'),

    actualizadoEn: actualizadoEn(),
  },
  (t) => [
    /**
     * Una bitácora **viva** por máquina y día.
     *
     * Parcial, igual que los demás índices únicos de este esquema. Sin el
     * `where`, anular una bitácora dejaría ese día bloqueado para siempre: la
     * fila anulada seguiría ocupando el par (máquina, día) y no habría forma de
     * volver a levantarla bien — que es justamente para lo que se anula.
     *
     * Sigue siendo la idempotencia natural de la entidad: un envío repetido
     * desde el celular encuentra la que ya existe en vez de duplicarla.
     */
    uniqueIndex('ux_bitacora_vehiculo_fecha')
      .on(t.vehiculoId, t.fecha)
      .where(sql`anulado_en is null`),
    index('ix_bitacora_obra_fecha').on(t.obraId, t.fecha),
  ],
);

/**
 * El parte diario de obra. Spec 004.
 *
 * Reemplaza a `bitacoras` como documento vivo. La tabla de arriba **no se
 * borra**: guarda los partes por máquina que se registraron antes de este
 * cambio, y siguen consultándose de solo lectura.
 *
 * Uno por obra y día, con sus siete secciones dentro. Las secciones van como
 * listas JSON en la misma fila y no en tablas hijas porque el driver de Postgres
 * habla por HTTP y no da transacciones interactivas: guardar el parte en cinco
 * tablas serían cinco sentencias que pueden quedarse a medias, y en una sola
 * fila es un UPDATE que ocurre entero o no ocurre. Ver `bitacoras/tipos.ts`.
 *
 * **Solo en el servidor.** El parte se llena desde el panel web, no desde el
 * celular: siete secciones con fotografías funcionando sin conexión cuestan
 * varias veces más que la versión web, y quien lo llena —el residente— trabaja
 * con computador.
 */
export const partesDeObra = pgTable(
  'partes_de_obra',
  {
    id: text('id').primaryKey(),
    obraId: text('obra_id')
      .notNull()
      .references(() => obras.id),
    /** Quién lo lleva. El trabajo que documenta es el de toda la obra. */
    usuarioId: text('usuario_id')
      .notNull()
      .references(() => usuarios.id),
    /** `YYYY-MM-DD` en hora de Colombia. Es un día del calendario, no un instante. */
    fecha: date('fecha', { mode: 'string' }).notNull(),

    maquinaria: jsonb('maquinaria').$type<MaquinaDelParte[]>().notNull().default([]),
    personal: jsonb('personal').$type<PersonaDelParte[]>().notNull().default([]),
    actividades: jsonb('actividades').$type<ActividadDelParte[]>().notNull().default([]),
    clima: jsonb('clima').$type<FranjaDeClima[]>().notNull().default([]),
    laboratorio: jsonb('laboratorio').$type<FilaDeControlDeCalidad[]>().notNull().default([]),
    /**
     * Los viajes de cantera fijados al cerrar (spec 010, RF-29 y RF-37). **Nula y
     * sin valor por defecto, a diferencia de las demás secciones**: `null` es «nunca
     * se fijó» —el parte sigue abierto, o se cerró antes de esta spec— y `[]` es «se
     * cerró y ese día no hubo viajes». Con `default []`, los partes cerrados antes
     * afirmarían que no hubo viajes un día que nadie contó.
     */
    cantera: jsonb('cantera').$type<ViajeDelParte[]>(),
    /**
     * Los ensayos de granulometría fijados al cerrar (spec 018, RF-111). Nula y sin
     * default por lo mismo que `cantera`: `null` es «nunca se fijó» —abierto, o
     * cerrado antes de esta spec— y `[]` es «se cerró sin ensayos ese día».
     */
    granulometrias: jsonb('granulometrias').$type<GranulometriaDelParte[]>(),
    /**
     * El horario de la obra con que se calcularon las horas del personal, fijado
     * al cerrar o anular el parte (spec 016, RF-23 y RF-24). Nulo y sin default por
     * lo mismo que `cantera`: `null` es «todavía abierto» —manda el horario vigente
     * de la obra— o «cerrado antes de esta spec» —manda `HORARIO_ANTERIOR`—, y
     * `cerrado_en` distingue los dos. Un parte cerrado es evidencia: sus horas no
     * pueden cambiar porque después se corrija el horario de la obra.
     */
    horario: jsonb('horario').$type<HorarioDeObra>(),
    notas: text('notas'),
    /**
     * Un domingo o un paro por lluvia: el día se cierra sin máquinas ni
     * actividades, con clima, notas y foto (spec 004, RF-53 a RF-55). Columna
     * propia y no una frase en las notas, porque el cierre tiene que saber qué
     * exigir sin interpretar lo escrito.
     */
    sinTrabajo: boolean('sin_trabajo').notNull().default(false),
    motivoSinTrabajo: text('motivo_sin_trabajo'),

    cerradoEn: timestamp('cerrado_en', { withTimezone: true, mode: 'date' }),
    anuladoEn: timestamp('anulado_en', { withTimezone: true, mode: 'date' }),
    anuladoPor: text('anulado_por').references(() => usuarios.id),
    motivoAnulacion: text('motivo_anulacion'),
    creadoEn: creadoEn(),
    actualizadoEn: actualizadoEn(),
  },
  (t) => [
    // Parcial sobre la anulación, por lo mismo que el de la bitácora por
    // máquina: sin el predicado, anular un parte dejaría ese día bloqueado para
    // siempre y la obra se quedaría sin poder registrar lo que hizo.
    uniqueIndex('ux_parte_obra_fecha')
      .on(t.obraId, t.fecha)
      .where(sql`anulado_en is null`),
    index('ix_parte_fecha').on(t.fecha),
  ],
);

export const media = pgTable(
  'media',
  {
    id: text('id').primaryKey(),
    duenoTipo: duenoMedia('dueno_tipo').notNull(),
    duenoId: text('dueno_id').notNull(),
    proposito: propositoMedia('proposito').notNull(),
    /** Ítem del checklist al que pertenece la foto, si aplica. */
    itemKey: text('item_key'),
    mime: text('mime').notNull().default('image/jpeg'),
    bytes: integer('bytes'),
    /** Lo calcula el dispositivo antes de subir; el servidor lo reverifica. */
    sha256: text('sha256'),
    /** Ruta del objeto en R2. El archivo no vive en Postgres. */
    claveR2: text('clave_r2'),
    subidoEn: timestamp('subido_en', { withTimezone: true, mode: 'date' }),
    recibidoEn: timestamp('recibido_en', { withTimezone: true, mode: 'date' })
      .notNull()
      .default(sql`now()`),
    actualizadoEn: actualizadoEn(),
  },
  (t) => [index('ix_media_dueno').on(t.duenoTipo, t.duenoId)],
);

/**
 * El registro de lo ya procesado.
 *
 * La clave llega del dispositivo con formato `entidad:uuid:operacion` y es
 * estable entre reintentos (`src/features/sync/outbox.ts`). Con ella, un envío
 * repetido —porque se cayó la red justo después de que el servidor grabara—
 * responde `duplicate` en vez de duplicar el registro.
 */
export const operacionesIdempotentes = pgTable('operaciones_idempotentes', {
  clave: text('clave').primaryKey(),
  entidad: text('entidad').notNull(),
  entidadId: text('entidad_id').notNull(),
  operacion: operacionSync('operacion').notNull().default('upsert'),
  respuesta: jsonb('respuesta'),
  procesadoEn: timestamp('procesado_en', { withTimezone: true, mode: 'date' })
    .notNull()
    .default(sql`now()`),
});

/* ------------------------------------------------------------------------ */
/* Almacén de obra (solo del servidor, spec 009)                             */
/* ------------------------------------------------------------------------ */

/**
 * Los materiales del almacén de cada obra.
 *
 * **No hay columna de stock.** El stock se calcula siempre sumando los
 * movimientos vigentes (RF-18): una columna que se actualiza en cada movimiento es
 * una cifra que un día deja de cuadrar con su historial, y en un inventario lo que
 * vale es el historial. Ver la decisión en `specs/009-almacen/plan.md`.
 *
 * `nombre_normalizado` lo escribe el servidor con `normalizar` (sin tildes, en
 * minúsculas) y es lo que lleva el índice único: «Cemento» y «cemento» chocan
 * aunque lleguen a la vez (RF-3). El índice es **parcial** sobre la baja, así que
 * un material dado de baja puede volver a registrarse con el mismo nombre.
 */
export const almacenMateriales = pgTable(
  'almacen_materiales',
  {
    id: text('id').primaryKey(),
    obraId: text('obra_id')
      .notNull()
      .references(() => obras.id),
    nombre: text('nombre').notNull(),
    nombreNormalizado: text('nombre_normalizado').notNull(),
    /** Slug de `shared/catalogos/almacen`. Texto y no enum, como el cargo (RF-31). */
    unidad: text('unidad').$type<UnidadAlmacen>().notNull(),
    creadoPor: text('creado_por')
      .notNull()
      .references(() => usuarios.id),
    creadoEn: creadoEn(),
    actualizadoEn: actualizadoEn(),
    eliminadoEn: eliminadoEn(),
  },
  (t) => [
    uniqueIndex('ux_almacen_material_nombre')
      .on(t.obraId, t.nombreNormalizado)
      .where(sql`eliminado_en is null`),
  ],
);

/**
 * Cada ingreso y cada salida. **Evidencia: no se edita ni se borra** (RF-23), por
 * eso no lleva `actualizado_en`. Un movimiento equivocado se anula con motivo, y
 * desde ese momento deja de contar en el stock sin desaparecer (RF-24, RF-25).
 *
 * `obra_id` repite la del material a propósito: el filtro por obra de
 * `alcance.ts` recibe una columna, y sin ella cada consulta de movimientos tendría
 * que unirse a los materiales solo para saber de quién son.
 *
 * La cantidad es `numeric(14,2)`: exacta, con dos decimales. El `check` repite en la
 * base lo que ya exigen el contrato y la regla (RF-9), para que ni una petición
 * hecha por fuera ni una sentencia a mano en la consola dejen una cantidad cero.
 *
 * `registrado_por` sale siempre de la sesión: en una salida es el almacenista que
 * responde por ella (RF-27, RF-30).
 */
export const almacenMovimientos = pgTable(
  'almacen_movimientos',
  {
    id: text('id').primaryKey(),
    obraId: text('obra_id')
      .notNull()
      .references(() => obras.id),
    materialId: text('material_id')
      .notNull()
      .references(() => almacenMateriales.id),
    tipo: tipoMovimientoAlmacen('tipo').notNull(),
    /** `YYYY-MM-DD`, el día en la obra. Un día del calendario, no un instante. */
    fecha: date('fecha', { mode: 'string' }).notNull(),
    cantidad: numeric('cantidad', { precision: 14, scale: 2 }).notNull(),
    /** Para qué se usará lo que sale. Solo en salidas, y en ellas obligatorio (RF-13). */
    paraQue: text('para_que'),
    /** Nota libre de un ingreso (RF-8). */
    observacion: text('observacion'),
    /**
     * Quién entregó lo que ingresa o quién recibió lo que sale, escrito a mano
     * (cambio del 2026-09-22, RF-40 y RF-41). El rótulo cambia con el tipo; el dato es
     * el mismo: la persona del otro lado del mostrador, que no siempre tiene cuenta.
     *
     * **Nula a propósito**: los movimientos anteriores no lo tienen y no se inventa
     * (RF-44). Que sea obligatorio en los nuevos lo exigen la regla y el contrato; un
     * `NOT NULL` obligaría a escribir en la evidencia un nombre que nadie dijo.
     */
    responsable: text('responsable'),
    registradoPor: text('registrado_por')
      .notNull()
      .references(() => usuarios.id),
    creadoEn: creadoEn(),
    anuladoEn: timestamp('anulado_en', { withTimezone: true, mode: 'date' }),
    anuladoPor: text('anulado_por').references(() => usuarios.id),
    motivoAnulacion: text('motivo_anulacion'),
  },
  (t) => [
    // Lo lee cada salida y cada anulación para calcular el stock, dentro de un
    // lote serializable: sin índice, Postgres vigilaría la tabla entera para
    // detectar choques y abortaría salidas de materiales que no tienen nada que
    // ver entre sí.
    index('ix_almacen_movimiento_material').on(t.materialId),
    index('ix_almacen_movimiento_obra_fecha').on(t.obraId, t.fecha),
    check('ck_almacen_movimiento_cantidad', sql`${t.cantidad} > 0`),
  ],
);

/* ------------------------------------------------------------------------ */
/* Control Cantera (solo del servidor, spec 010)                             */
/* ------------------------------------------------------------------------ */

/**
 * Canteras, plantas y otros sitios de donde sale o a donde llega material.
 *
 * **La obra no es un sitio**: como destino es una marca del viaje (`destino_obra`)
 * y como origen no existe (fuera de alcance). Un sitio «Obra» se podría renombrar,
 * dar de baja o elegir como origen, y la abscisa no tendría de qué colgarse.
 *
 * Mismo esquema de nombres que el almacén: índice único parcial sobre el nombre
 * normalizado, para que «La Esperanza» y «la esperanza» choquen (RF-3) y un sitio
 * dado de baja pueda volver a registrarse.
 */
export const canteraSitios = pgTable(
  'cantera_sitios',
  {
    id: text('id').primaryKey(),
    obraId: text('obra_id')
      .notNull()
      .references(() => obras.id),
    nombre: text('nombre').notNull(),
    nombreNormalizado: text('nombre_normalizado').notNull(),
    tipo: tipoSitioCantera('tipo').notNull(),
    creadoPor: text('creado_por')
      .notNull()
      .references(() => usuarios.id),
    creadoEn: creadoEn(),
    actualizadoEn: actualizadoEn(),
    eliminadoEn: eliminadoEn(),
  },
  (t) => [
    uniqueIndex('ux_cantera_sitio_nombre')
      .on(t.obraId, t.nombreNormalizado)
      .where(sql`eliminado_en is null`),
  ],
);

/**
 * Los materiales de cantera de una obra: afirmado, subbase, arena, triturado.
 *
 * Aparte de los del almacén a propósito: estos no tienen stock ni unidad (la
 * cantidad por viaje está fuera de alcance), y mezclarlos ofrecería «Cemento» en un
 * viaje de volqueta y «Afirmado» en una salida de bodega.
 */
export const canteraMateriales = pgTable(
  'cantera_materiales',
  {
    id: text('id').primaryKey(),
    obraId: text('obra_id')
      .notNull()
      .references(() => obras.id),
    nombre: text('nombre').notNull(),
    nombreNormalizado: text('nombre_normalizado').notNull(),
    creadoPor: text('creado_por')
      .notNull()
      .references(() => usuarios.id),
    creadoEn: creadoEn(),
    actualizadoEn: actualizadoEn(),
    eliminadoEn: eliminadoEn(),
  },
  (t) => [
    uniqueIndex('ux_cantera_material_nombre')
      .on(t.obraId, t.nombreNormalizado)
      .where(sql`eliminado_en is null`),
  ],
);

/**
 * Cada viaje de volqueta. **Evidencia: no se edita ni se borra** (RF-23), por eso
 * no lleva `actualizado_en`; se anula con motivo y sigue a la vista (RF-24, RF-25).
 *
 * `fecha` y `hora` van separadas y como la obra las escribe, no como un instante:
 * el viaje cuenta en el día que se escribe (caso límite de la spec), y un instante
 * con zona horaria se correría de día en la frontera de la medianoche.
 *
 * Los `check` repiten en la base lo que exige la regla, para que ni una petición
 * hecha por fuera ni una sentencia a mano dejen un viaje imposible:
 *  · destino obra ⇒ sin sitio de destino y con una abscisa de las listas (RF-11,
 *    RF-16); destino sitio ⇒ con sitio y sin abscisa (RF-15);
 *  · origen distinto del destino (RF-18).
 */
export const canteraViajes = pgTable(
  'cantera_viajes',
  {
    id: text('id').primaryKey(),
    obraId: text('obra_id')
      .notNull()
      .references(() => obras.id),
    /** `YYYY-MM-DD`, el día en la obra. */
    fecha: date('fecha', { mode: 'string' }).notNull(),
    /** "HH:MM", en la obra. */
    hora: text('hora').notNull(),
    materialId: text('material_id')
      .notNull()
      .references(() => canteraMateriales.id),
    vehiculoId: text('vehiculo_id')
      .notNull()
      .references(() => vehiculos.id),
    /** Quien condujo (RF-34). No es quien registra: eso es `registrado_por`. */
    conductorId: text('conductor_id')
      .notNull()
      .references(() => usuarios.id),
    origenId: text('origen_id')
      .notNull()
      .references(() => canteraSitios.id),
    destinoId: text('destino_id').references(() => canteraSitios.id),
    destinoObra: boolean('destino_obra').notNull(),
    pr: integer('pr'),
    metros: integer('metros'),
    registradoPor: text('registrado_por')
      .notNull()
      .references(() => usuarios.id),
    creadoEn: creadoEn(),
    anuladoEn: timestamp('anulado_en', { withTimezone: true, mode: 'date' }),
    anuladoPor: text('anulado_por').references(() => usuarios.id),
    motivoAnulacion: text('motivo_anulacion'),
  },
  (t) => [
    // Lo lee el listado por periodo, la sección de la bitácora de un día y el
    // cierre del parte, que fija los viajes de su obra y su fecha.
    index('ix_cantera_viaje_obra_fecha').on(t.obraId, t.fecha),
    check(
      'ck_cantera_viaje_destino',
      // `is not null` explícito: un `check` que da desconocido (por un nulo) se
      // acepta, y sin esto un viaje a la obra sin PR pasaría la restricción.
      sql`(${t.destinoObra} and ${t.destinoId} is null
            and ${t.pr} is not null and ${t.metros} is not null
            and ${t.pr} between 0 and 25
            and ${t.metros} between 0 and 975 and ${t.metros} % 25 = 0)
       or (not ${t.destinoObra} and ${t.destinoId} is not null
            and ${t.pr} is null and ${t.metros} is null)`,
    ),
    check(
      'ck_cantera_viaje_origen_destino',
      sql`${t.destinoId} is null or ${t.destinoId} <> ${t.origenId}`,
    ),
    check('ck_cantera_viaje_hora', sql`${t.hora} ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'`),
  ],
);

/* ------------------------------------------------------------------------ */
/* Laboratorio (spec 018, solo del servidor)                                 */
/* ------------------------------------------------------------------------ */

/**
 * Un ensayo de granulometría (formato LAB-FR-01-2025, INV E-123-13).
 *
 * ── Qué va en columna y qué en `jsonb` ──
 *
 * En columna, lo que se filtra o se ordena: obra, fechas, franja, estado, veredicto.
 * En `jsonb`, las masas por id de tamiz: dieciséis columnas obligarían a una
 * migración si cambia la serie, y una tabla hija de renglones serían dos escrituras
 * por guardado sin transacción (Neon por HTTP no la da).
 *
 * ── Lo que calcula el servidor ──
 *
 * `resultado` y `veredicto` salen de `calcularGranulometria` al guardar, con la
 * misma función que usa la pantalla; nunca se aceptan hechos (RF-42). El veredicto
 * va además en columna para que el listado filtre por él sin abrir el `jsonb`.
 *
 * ── Borrador a medias ──
 *
 * El encabezado es nulo mientras el ensayo es borrador (RF-31): la muestra se recibe
 * un día y se tamiza otro. Lo que exige el envío lo decide la regla, no la base.
 *
 * Los `check` repiten en la base lo que el flujo garantiza, para que ni una petición
 * hecha por fuera ni una sentencia a mano dejen un ensayo imposible.
 */
export const ensayosGranulometria = pgTable(
  'ensayos_granulometria',
  {
    id: text('id').primaryKey(),
    obraId: text('obra_id')
      .notNull()
      .references(() => obras.id),

    material: text('material'),
    fuente: text('fuente'),
    localizacion: text('localizacion'),
    numeroInforme: text('numero_informe'),
    /** `claveDeInforme(numero_informe)`: con esta se compara la unicidad (RF-40). */
    claveInforme: text('clave_informe'),
    /** `YYYY-MM-DD`, días en la obra. */
    fechaRecepcion: date('fecha_recepcion', { mode: 'string' }),
    fechaEjecucion: date('fecha_ejecucion', { mode: 'string' }),

    /** Para filtrar. Lo que vale para juzgar es la copia de abajo. */
    franjaId: text('franja_id'),
    /**
     * La franja **entera**, copiada del catálogo al escogerla (RF-21): si el catálogo
     * se corrige, los ensayos ya hechos siguen juzgándose con la suya.
     */
    franja: jsonb('franja').$type<FranjaGranulometrica>(),

    masas: jsonb('masas')
      .$type<MasasDelEnsayo>()
      .notNull()
      .default({ humeda: null, seca: null, tara: null, lavada: null }),
    retenidos: jsonb('retenidos').$type<RetenidosDelEnsayo>().notNull().default({}),
    observaciones: text('observaciones'),

    resultado: jsonb('resultado').$type<ResultadoGranulometria>(),
    veredicto: text('veredicto').$type<'cumple' | 'no_cumple'>(),

    estado: estadoEnsayo('estado').notNull().default('borrador'),
    registradoPor: text('registrado_por')
      .notNull()
      .references(() => usuarios.id),
    /** «Revisó»: quien lo envió (RF-75). */
    revisadoPor: text('revisado_por').references(() => usuarios.id),
    revisadoEn: timestamp('revisado_en', { withTimezone: true, mode: 'date' }),
    /** «Aprobó» (RF-83). Su fecha es la de emisión del informe (RF-84). */
    aprobadoPor: text('aprobado_por').references(() => usuarios.id),
    aprobadoEn: timestamp('aprobado_en', { withTimezone: true, mode: 'date' }),
    /** El de la última devolución; la historia guarda todos. */
    comentarioDevolucion: text('comentario_devolucion'),

    descartadoEn: timestamp('descartado_en', { withTimezone: true, mode: 'date' }),
    anuladoEn: timestamp('anulado_en', { withTimezone: true, mode: 'date' }),
    anuladoPor: text('anulado_por').references(() => usuarios.id),
    motivoAnulacion: text('motivo_anulacion'),

    /** RF-94. Se anexa en la misma sentencia que cambia el estado, nunca aparte. */
    historia: jsonb('historia').$type<EventoDelEnsayo[]>().notNull().default([]),
    creadoEn: creadoEn(),
    actualizadoEn: actualizadoEn(),
  },
  (t) => [
    // Parcial por lo mismo que el del parte: anular o descartar un ensayo deja libre
    // su número (RF-41), y sin número todavía —un borrador— no choca con nadie.
    uniqueIndex('ux_ensayo_granulometria_informe')
      .on(t.obraId, t.claveInforme)
      .where(sql`anulado_en is null and descartado_en is null and clave_informe is not null`),
    // El listado por periodo y la sección del parte de un día.
    index('ix_ensayo_granulometria_obra_fecha').on(t.obraId, t.fechaEjecucion),
    check(
      'ck_ensayo_granulometria_veredicto',
      sql`${t.veredicto} is null or ${t.veredicto} in ('cumple', 'no_cumple')`,
    ),
    // Solo se anula lo aprobado (RF-86), con motivo escrito (RF-87).
    check(
      'ck_ensayo_granulometria_anulado',
      sql`${t.anuladoEn} is null
       or (${t.estado} = 'aprobado' and ${t.anuladoPor} is not null
           and ${t.motivoAnulacion} is not null and btrim(${t.motivoAnulacion}) <> '')`,
    ),
    // Solo se descarta lo que el laboratorista todavía tiene en sus manos (RF-90).
    check(
      'ck_ensayo_granulometria_descartado',
      sql`${t.descartadoEn} is null or ${t.estado} in ('borrador', 'devuelto')`,
    ),
    // Enviado o aprobado ⇒ alguien lo revisó; aprobado ⇒ alguien lo aprobó; devuelto
    // ⇒ con el comentario de por qué (RF-75, RF-79, RF-83).
    check(
      'ck_ensayo_granulometria_firmas',
      sql`(${t.estado} not in ('enviado', 'aprobado') or ${t.revisadoPor} is not null)
       and (${t.estado} <> 'aprobado' or (${t.aprobadoPor} is not null and ${t.aprobadoEn} is not null))
       and (${t.estado} <> 'devuelto' or ${t.comentarioDevolucion} is not null)`,
    ),
  ],
);

/* ------------------------------------------------------------------------ */
/* Identidad (solo del servidor)                                             */
/* ------------------------------------------------------------------------ */

/**
 * Estas cinco tablas quedan creadas y vacías: las llena el entregable del
 * ingreso. Van aquí, y no en una migración posterior, porque para entonces la
 * base ya tendrá los datos reales de OCC dentro.
 *
 * Una sola identidad para las dos superficies: la misma persona es una fila de
 * `usuarios` con contraseña en la web y PIN en el celular. El PIN nunca sale del
 * teléfono; aquí no hay ni una columna donde pudiera caber.
 */

export const credencialesWeb = pgTable('credenciales_web', {
  usuarioId: text('usuario_id')
    .primaryKey()
    .references(() => usuarios.id),
  /** `pbkdf2$sha256$<iteraciones>$<salt>$<dk>`, auto-descriptivo para poder rotar parámetros. */
  hash: text('hash').notNull(),
  /**
   * La contraseña es temporal y hay que cambiarla al entrar.
   *
   * Por defecto `true` porque casi toda credencial nace de un administrador
   * generando una temporal que le dicta a otra persona. La excepción es la que
   * crea `scripts/crear-admin.ts`, donde quien la teclea es su propio dueño.
   */
  debeCambiar: boolean('debe_cambiar').notNull().default(true),
  /** Vacío significa que esa persona nunca ha entrado al panel. */
  ultimoIngresoEn: timestamp('ultimo_ingreso_en', { withTimezone: true, mode: 'date' }),
  actualizadoEn: actualizadoEn(),
});

export const codigosActivacion = pgTable(
  'codigos_activacion',
  {
    id: text('id').primaryKey(),
    usuarioId: text('usuario_id')
      .notNull()
      .references(() => usuarios.id),
    tipo: tipoCodigo('tipo').notNull().default('activacion'),
    /** El código no se guarda en claro: si se filtra la tabla, no sirve de nada. */
    hash: text('hash').notNull(),
    /**
     * El de respaldo no caduca —tiene que servir el día que haga falta— así que
     * lleva una fecha muy lejana en vez de un nulo: una sola forma de comprobar
     * la vigencia, sin ramas.
     */
    expiraEn: timestamp('expira_en', { withTimezone: true, mode: 'date' }).notNull(),
    usadoEn: timestamp('usado_en', { withTimezone: true, mode: 'date' }),
    intentos: integer('intentos').notNull().default(0),
    creadoEn: creadoEn(),
  },
  (t) => [index('ix_codigos_usuario').on(t.usuarioId, t.tipo, t.usadoEn)],
);

export const dispositivos = pgTable(
  'dispositivos',
  {
    id: text('id').primaryKey(),
    usuarioId: text('usuario_id')
      .notNull()
      .references(() => usuarios.id),
    /** El identificador del equipo que ya calcula `idDelDispositivo()` en el móvil. */
    identificadorEquipo: text('identificador_equipo').notNull(),
    etiqueta: text('etiqueta'),
    /**
     * SHA-256 del refresh token. El original solo existe en el teléfono.
     *
     * El access token es un JWT corto que no toca la base; este es el que
     * permite renovarlo, vive meses, y por eso se guarda hasheado igual que la
     * cookie del panel.
     */
    hashRefresh: text('hash_refresh'),
    altaEn: creadoEn(),
    ultimaVistaEn: timestamp('ultima_vista_en', { withTimezone: true, mode: 'date' }),
    revocadoEn: timestamp('revocado_en', { withTimezone: true, mode: 'date' }),
  },
  (t) => [index('ix_dispositivos_usuario').on(t.usuarioId, t.revocadoEn)],
);

export const sesionesWeb = pgTable(
  'sesiones_web',
  {
    id: text('id').primaryKey(),
    usuarioId: text('usuario_id')
      .notNull()
      .references(() => usuarios.id),
    /** SHA-256 de la cookie. Son 32 bytes aleatorios: ya tienen entropía completa. */
    hashCookie: text('hash_cookie').notNull(),
    creadoEn: creadoEn(),
    expiraEn: timestamp('expira_en', { withTimezone: true, mode: 'date' }).notNull(),
    /** Cada petición lo adelanta: es lo que hace deslizante la ventana de 12 h. */
    ultimoUsoEn: timestamp('ultimo_uso_en', { withTimezone: true, mode: 'date' }),
    revocadoEn: timestamp('revocado_en', { withTimezone: true, mode: 'date' }),
  },
  (t) => [uniqueIndex('ux_sesiones_hash').on(t.hashCookie)],
);

/**
 * Intentos fallidos, para que la escalera de espera de `@/features/auth/escalera`
 * —que ya es pura y estaba escrita pensando en esto— tenga dónde persistir.
 * La política no se duplica aquí: esta tabla solo cuenta.
 */
export const intentosAcceso = pgTable(
  'intentos_acceso',
  {
    id: text('id').primaryKey(),
    /** Nombre de usuario tal como se tecleó, aunque no exista. */
    identidad: text('identidad').notNull(),
    superficie: text('superficie').notNull(),
    exito: boolean('exito').notNull(),
    ocurridoEn: timestamp('ocurrido_en', { withTimezone: true, mode: 'date' })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [index('ix_intentos_identidad').on(t.identidad, t.ocurridoEn)],
);

export const esquemaServidor = {
  obras,
  usuarios,
  tiposVehiculo,
  vehiculos,
  asignaciones,
  plantillas,
  preoperacionales,
  bitacoras,
  media,
  operacionesIdempotentes,
  credencialesWeb,
  codigosActivacion,
  dispositivos,
  sesionesWeb,
  intentosAcceso,
};
