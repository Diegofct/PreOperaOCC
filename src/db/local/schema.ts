/**
 * Base local del dispositivo (SQLite).
 *
 * Es la única fuente que lee la interfaz del operador. La red nunca está en el
 * camino de una pantalla: el motor de sincronización alimenta estas tablas por
 * detrás y drena `outbox` cuando puede.
 *
 * Dos familias de tablas:
 *   · Réplicas   — el servidor manda, aquí solo se leen. Un pull las sobrescribe.
 *   · Capturas   — nacen en el dispositivo con su UUID definitivo y viajan
 *                  hacia arriba una sola vez (insert-once).
 */
import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import type { ActividadBitacora } from '../../features/bitacoras/tipos';
import type { Cargo } from '../../shared/catalogos/cargos';
import type {
  PlantillaChecklist,
  RespuestaItem,
  ResultadoPreoperacional,
} from '../../features/checklists/types';

// Se reexporta para que quien ya lo importaba desde aquí siga funcionando: el
// tipo se mudó a la capa de dominio porque el esquema del servidor también lo
// usa y ese no puede tocar `src/db/local/*`.
export type { ActividadBitacora };

/** Estado de un registro capturado frente al servidor. */
export type EstadoSync = 'borrador' | 'pendiente' | 'sincronizado' | 'rechazado';

const ahora = sql`(unixepoch() * 1000)`;

/* ------------------------------------------------------------------------ */
/* Réplicas (el servidor manda)                                              */
/* ------------------------------------------------------------------------ */

export const obras = sqliteTable('obras', {
  id: text('id').primaryKey(),
  codigo: text('codigo').notNull(),
  nombre: text('nombre').notNull(),
  municipio: text('municipio'),
  activa: integer('activa', { mode: 'boolean' }).notNull().default(true),
  eliminadoEn: integer('eliminado_en'),
});

export const usuarios = sqliteTable(
  'usuarios',
  {
  id: text('id').primaryKey(),
  usuario: text('usuario').notNull(),
  nombreCompleto: text('nombre_completo').notNull(),
  documento: text('documento'),
  rol: text('rol', { enum: ['admin', 'supervisor', 'operador'] })
    .notNull()
    .default('operador'),
  /**
   * El oficio en la obra, réplica del servidor. Ver el comentario en el esquema
   * del servidor: el cargo no es el acceso. Hoy el celular solo lo guarda; lo
   * va a necesitar la bitácora para mostrar quién es quién al elegir personal.
   */
  cargo: text('cargo').$type<Cargo>(),
  /**
   * La obra a la que pertenece. Solo importa para quien lleva las bitácoras:
   * un jefe de operadores no tiene vehículo asignado, así que sin esto no hay
   * forma de saber qué máquinas le tocan.
   */
  obraId: text('obra_id'),
  activo: integer('activo', { mode: 'boolean' }).notNull().default(true),
},
  (t) => [
    // El índice que `src/features/auth/servicio.ts` daba por hecho desde la
    // Fase 1 y que no existía. Sin él, dos personas pueden acabar compartiendo
    // nombre de usuario y el desbloqueo se vuelve ambiguo — y con el pull ya no
    // es hipotético: el servidor manda usuarios reales a un equipo que puede
    // traer todavía los de demostración.
    uniqueIndex('ux_usuarios_usuario').on(t.usuario),
  ],
);

export const tiposVehiculo = sqliteTable('tipos_vehiculo', {
  /** Slug: 'camioneta', 'volqueta', 'retroexcavadora'… */
  id: text('id').primaryKey(),
  nombre: text('nombre').notNull(),
  claseMedidor: text('clase_medidor', { enum: ['odometro', 'horometro', 'ambos'] }).notNull(),
});

export const vehiculos = sqliteTable(
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
    /** Últimas lecturas conocidas. Sirven para validar la del día. */
    odometroKm: integer('odometro_km'),
    horometroH: integer('horometro_h'),
    medidorActualizadoEn: integer('medidor_actualizado_en'),
    estado: text('estado', {
      enum: ['operativo', 'en_mantenimiento', 'fuera_servicio', 'no_apto'],
    })
      .notNull()
      .default('operativo'),
    eliminadoEn: integer('eliminado_en'),
  },
  (t) => [index('ix_vehiculos_tipo').on(t.tipoVehiculoId)],
);

/** Qué operador tiene qué vehículo. Es la consulta del arranque de la app. */
export const asignaciones = sqliteTable(
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
    desde: integer('desde').notNull(),
    hasta: integer('hasta'),
    /**
     * Quién decidió esta asignación. `autoasignada` la escogió el propio
     * operador porque no tenía ninguna vigente: el dashboard la muestra en
     * amarillo para que el supervisor la confirme. Dejarlo trabajar y marcarlo
     * es mejor que bloquearlo — un operador bloqueado arranca la máquina sin
     * preoperacional, que es justo lo que este sistema existe para evitar.
     */
    origen: text('origen', { enum: ['supervisor', 'autoasignada'] })
      .notNull()
      .default('supervisor'),
  },
  (t) => [index('ix_asignaciones_usuario').on(t.usuarioId, t.hasta)],
);

export const plantillas = sqliteTable(
  'plantillas',
  {
    id: text('id').primaryKey(),
    tipoVehiculoId: text('tipo_vehiculo_id')
      .notNull()
      .references(() => tiposVehiculo.id),
    version: integer('version').notNull(),
    /** SHA-256 del JSON canónico: detecta que la plantilla fue alterada. */
    hash: text('hash').notNull(),
    /** El `PlantillaChecklist` completo. */
    esquema: text('esquema', { mode: 'json' }).notNull().$type<PlantillaChecklist>(),
    publicadaEn: integer('publicada_en'),
  },
  (t) => [uniqueIndex('ux_plantilla_tipo_version').on(t.tipoVehiculoId, t.version)],
);

/* ------------------------------------------------------------------------ */
/* Capturas (nacen aquí)                                                     */
/* ------------------------------------------------------------------------ */

export const preoperacionales = sqliteTable(
  'preoperacionales',
  {
    /** UUID v7 generado en el dispositivo: el registro nace con su ID final. */
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
    /** Periodicidades que aplicaron ese día: ['diaria'] o ['diaria','quincenal']. */
    periodicidades: text('periodicidades', { mode: 'json' }).notNull().$type<string[]>(),

    iniciadoEn: integer('iniciado_en').notNull(),
    enviadoEn: integer('enviado_en'),

    odometroKm: integer('odometro_km'),
    horometroH: integer('horometro_h'),

    /** Cada respuesta se auto-describe. Ver `RespuestaItem`. */
    respuestas: text('respuestas', { mode: 'json' }).notNull().$type<RespuestaItem[]>(),
    resultado: text('resultado').$type<ResultadoPreoperacional>(),
    cantidadInmovilizantes: integer('cantidad_inmovilizantes').notNull().default(0),
    observaciones: text('observaciones'),

    firmaOperadorMediaId: text('firma_operador_media_id'),
    fotoHorometroMediaId: text('foto_horometro_media_id'),

    /** Desfase del reloj del equipo contra el servidor, en ms. */
    desfaseRelojMs: integer('desfase_reloj_ms').notNull().default(0),

    estadoSync: text('estado_sync').notNull().default('borrador').$type<EstadoSync>(),
    ultimoError: text('ultimo_error'),
    actualizadoEn: integer('actualizado_en').notNull().default(ahora),
  },
  (t) => [
    index('ix_preop_vehiculo').on(t.vehiculoId, t.iniciadoEn),
    index('ix_preop_estado').on(t.estadoSync),
  ],
);

export const bitacoras = sqliteTable(
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
     * Quién operó la máquina ese día.
     *
     * Es distinto de `usuarioId`: la bitácora la lleva el jefe de operadores,
     * pero lo que documenta es el trabajo del operador. "Cuál equipo, con cuál
     * operador" es literalmente lo que OCC quiere saber.
     */
    operadorId: text('operador_id').references(() => usuarios.id),
    /**
     * El preoperacional del día, si lo hubo. Informativo: le sirve al dashboard
     * para cruzar "máquinas que operaron sin preoperacional firmado", pero no
     * condiciona nada — la bitácora la abre el jefe, no la firma del operador.
     */
    preoperacionalId: text('preoperacional_id').references(() => preoperacionales.id),
    /** Día de trabajo en formato ISO (YYYY-MM-DD), hora local de Colombia. */
    fecha: text('fecha').notNull(),
    /**
     * Lecturas del día completo, no de cada actividad. El jefe no está en la
     * cabina: pedirle una lectura por hora garantiza cifras inventadas.
     */
    horometroInicial: integer('horometro_inicial'),
    horometroFinal: integer('horometro_final'),
    /** Normalmente una. Ver `ActividadBitacora`. */
    actividades: text('actividades', { mode: 'json' })
      .notNull()
      .$type<ActividadBitacora[]>()
      .default([]),
    cerradaEn: integer('cerrada_en'),
    estadoSync: text('estado_sync').notNull().default('borrador').$type<EstadoSync>(),
    ultimoError: text('ultimo_error'),
    actualizadoEn: integer('actualizado_en').notNull().default(ahora),
  },
  (t) => [uniqueIndex('ux_bitacora_vehiculo_fecha').on(t.vehiculoId, t.fecha)],
);

export const media = sqliteTable(
  'media',
  {
    id: text('id').primaryKey(),
    duenoTipo: text('dueno_tipo', { enum: ['preoperacional', 'bitacora', 'documento'] }).notNull(),
    duenoId: text('dueno_id').notNull(),
    proposito: text('proposito', {
      enum: ['hallazgo', 'firma_operador', 'foto_horometro', 'evidencia'],
    }).notNull(),
    /** Ítem del checklist al que pertenece la foto, si aplica. */
    itemKey: text('item_key'),
    uriLocal: text('uri_local').notNull(),
    mime: text('mime').notNull().default('image/jpeg'),
    bytes: integer('bytes'),
    sha256: text('sha256'),
    estadoSubida: text('estado_subida', { enum: ['pendiente', 'subiendo', 'subida', 'fallida'] })
      .notNull()
      .default('pendiente'),
    intentos: integer('intentos').notNull().default(0),
    /** Cuándo se puede borrar el archivo local (ya está a salvo arriba). */
    purgarDespuesDe: integer('purgar_despues_de'),
    creadoEn: integer('creado_en').notNull().default(ahora),
  },
  (t) => [
    index('ix_media_dueno').on(t.duenoTipo, t.duenoId),
    index('ix_media_pendiente').on(t.estadoSubida),
  ],
);

/* ------------------------------------------------------------------------ */
/* Sincronización                                                            */
/* ------------------------------------------------------------------------ */

/**
 * Cola de salida. El orden de `seq` es el orden de dependencia, porque es el
 * orden en que se crearon los registros.
 */
export const outbox = sqliteTable(
  'outbox',
  {
    seq: integer('seq').primaryKey({ autoIncrement: true }),
    entidad: text('entidad').notNull(),
    entidadId: text('entidad_id').notNull(),
    operacion: text('operacion', { enum: ['upsert', 'delete'] })
      .notNull()
      .default('upsert'),
    payload: text('payload', { mode: 'json' }).notNull(),
    /** Estable entre reintentos: es lo que hace idempotente el reenvío. */
    claveIdempotencia: text('clave_idempotencia').notNull(),
    estado: text('estado', { enum: ['pendiente', 'enviando', 'fallida', 'lista'] })
      .notNull()
      .default('pendiente'),
    intentos: integer('intentos').notNull().default(0),
    proximoIntentoEn: integer('proximo_intento_en').notNull().default(0),
    ultimoError: text('ultimo_error'),
    creadoEn: integer('creado_en').notNull().default(ahora),
  },
  (t) => [
    uniqueIndex('ux_outbox_idempotencia').on(t.claveIdempotencia),
    index('ix_outbox_listas').on(t.estado, t.proximoIntentoEn),
  ],
);

export const estadoSincronizacion = sqliteTable('estado_sincronizacion', {
  entidad: text('entidad').primaryKey(),
  /** Cursor compuesto "<server_updated_at>|<id>". */
  cursor: text('cursor'),
  ultimoPullEn: integer('ultimo_pull_en'),
  ultimoPushEn: integer('ultimo_push_en'),
});

/** Preferencias y banderas locales. No guarda nada sensible: eso va a SecureStore. */
export const appKv = sqliteTable('app_kv', {
  clave: text('clave').primaryKey(),
  valor: text('valor').notNull(),
});

export const esquemaLocal = {
  obras,
  usuarios,
  tiposVehiculo,
  vehiculos,
  asignaciones,
  plantillas,
  preoperacionales,
  bitacoras,
  media,
  outbox,
  estadoSincronizacion,
  appKv,
};
