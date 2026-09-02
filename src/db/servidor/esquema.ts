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
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// Rutas relativas y no el alias `@/`: drizzle-kit empaqueta este archivo con
// esbuild por su cuenta y no lee los `paths` del tsconfig, igual que en
// `src/db/local/schema.ts`.
import type { ActividadBitacora } from '../../features/bitacoras/tipos';
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
 * El rol no se amplía. Los cargos reales de OCC se mapean —residente y director
 * de obra son `supervisor`, gerencia es `admin`—; si hace falta mostrar el cargo
 * exacto, va en una columna aparte.
 */
export const rolUsuario = pgEnum('rol_usuario', ['admin', 'supervisor', 'operador']);
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
     * Quién decidió esta asignación. `autoasignada` la escogió el propio
     * operador porque no tenía ninguna vigente; el panel la muestra destacada
     * para que el supervisor la confirme.
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
    // La idempotencia natural de la entidad: una bitácora por máquina y día.
    uniqueIndex('ux_bitacora_vehiculo_fecha').on(t.vehiculoId, t.fecha),
    index('ix_bitacora_obra_fecha').on(t.obraId, t.fecha),
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
    /** El código no se guarda en claro: si se filtra la tabla, no sirve de nada. */
    hash: text('hash').notNull(),
    expiraEn: timestamp('expira_en', { withTimezone: true, mode: 'date' }).notNull(),
    usadoEn: timestamp('usado_en', { withTimezone: true, mode: 'date' }),
    intentos: integer('intentos').notNull().default(0),
    creadoEn: creadoEn(),
  },
  (t) => [index('ix_codigos_usuario').on(t.usuarioId, t.usadoEn)],
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
