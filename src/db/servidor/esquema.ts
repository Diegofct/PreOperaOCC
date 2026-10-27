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
  doublePrecision,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  type AnyPgColumn,
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
import { CLASES_CON_INTERVALO, CLASES_DE_MANTENIMIENTO } from '../../shared/rules/mantenimiento';
import type { ImpuestoDelContrato, IntegranteDelConsorcio } from '../../shared/rules/contrato';
import { ESTADOS_DE_REGISTRO_DE_POLIZA } from '../../shared/rules/polizas';
import type { AdjuntoGuardado, FuenteDeRespuesta, ModuloConsultable } from '../../shared/rules/asistente';
import type { LecturaDeIa } from '../../shared/rules/formulario-presupuesto-ia';
import { ESTADOS_DE_PRESUPUESTO, type EstructuraDePresupuesto } from '../../shared/rules/presupuesto';
import type {
  MasasDelEnsayo,
  ResultadoGranulometria,
  RetenidosDelEnsayo,
} from '../../shared/rules/granulometria';
import { ROLES } from '../../shared/rules/permisos';
import { ESTADOS_MENSAJE_WHATSAPP } from '../../shared/rules/whatsapp';
import {
  ESTADOS_DE_EXCEPCION,
  ESTADOS_DEL_DIA,
  TIPOS_CREADOS,
  TIPOS_DE_REPORTE,
} from '../../shared/rules/whatsapp-automatico';
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
/**
 * De quién es un archivo. `whatsapp` (spec 021): la foto o el documento de un
 * mensaje, con `dueno_id` = el id del mensaje. Al aprobar, la foto elegida gana
 * otra fila con dueño `bitacora` que apunta **al mismo objeto** de R2 (RF-50).
 */
export const duenoMedia = pgEnum('dueno_media', [
  'preoperacional',
  'bitacora',
  'documento',
  'whatsapp',
  // Spec 031: las pólizas y los documentos del contrato de una obra.
  'contrato',
  // Spec 028, RF-71: los archivos adjuntos a una pregunta al asistente.
  'asistente',
]);
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

/** Dónde está un mensaje en la bandeja de WhatsApp (spec 021). Ver `rules/whatsapp`. */
export const estadoMensajeWhatsapp = pgEnum('estado_mensaje_whatsapp', ESTADOS_MENSAJE_WHATSAPP);

/** Spec 024: las listas cerradas del guardado automático. Ver `rules/whatsapp-automatico`. */
export const tipoReporteWhatsapp = pgEnum('tipo_reporte_whatsapp', TIPOS_DE_REPORTE);
export const estadoDiaWhatsapp = pgEnum('estado_dia_whatsapp', ESTADOS_DEL_DIA);
export const estadoExcepcionWhatsapp = pgEnum('estado_excepcion_whatsapp', ESTADOS_DE_EXCEPCION);
export const tipoCreadoWhatsapp = pgEnum('tipo_creado_whatsapp', TIPOS_CREADOS);

/** Spec 030: las clases de mantenimiento, y las que tienen intervalo. Ver `rules/mantenimiento`. */
export const claseMantenimiento = pgEnum('clase_mantenimiento', CLASES_DE_MANTENIMIENTO);
export const claseConIntervalo = pgEnum('clase_con_intervalo', CLASES_CON_INTERVALO);
export const origenMantenimiento = pgEnum('origen_mantenimiento', ['panel', 'whatsapp']);

/** Spec 031: los estados del contrato, del presupuesto y del registro de una póliza. */
export const estadoContrato = pgEnum('estado_contrato', ['borrador', 'aprobado']);
export const estadoPresupuesto = pgEnum('estado_presupuesto', ESTADOS_DE_PRESUPUESTO);
export const estadoPolizaRegistro = pgEnum('estado_poliza_registro', ESTADOS_DE_REGISTRO_DE_POLIZA);
export const accionContrato = pgEnum('accion_contrato', ['guardado', 'aprobado', 'a_borrador']);
/** `excel_ia`: el Excel lo leyó la IA porque el lector no lo entendió (031/RF-83). */
export const origenPresupuesto = pgEnum('origen_presupuesto', ['excel', 'blanco', 'copia', 'excel_ia']);

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
    /**
     * Quién la registró y desde qué mensaje, cuando se registró desde la bandeja de
     * WhatsApp (spec 023, RF-68). Nulos en las registradas en Personas: ahí no se
     * llevaba y no se inventa.
     */
    registradoPor: text('registrado_por').references((): AnyPgColumn => usuarios.id),
    mensajeWhatsappId: text('mensaje_whatsapp_id').references(
      (): AnyPgColumn => whatsappMensajes.id,
    ),
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
    /**
     * El código que tenía antes de la spec 032, cuando `codigo_interno` pasó a ser la
     * placa normalizada. Solo para que un reporte de WhatsApp que todavía diga
     * «VOL-MAG-04» lo reconozca (RF-19); no se muestra en ninguna pantalla. Nulo en
     * lo creado después del cambio.
     */
    codigoAnterior: text('codigo_anterior'),
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
     *
     * Con decimal desde la spec 026 (RF-20): el horómetro se lee «5828.4 h», y con
     * entero cada día se perdían décimas que al mes son horas.
     */
    odometroKm: doublePrecision('odometro_km'),
    horometroH: doublePrecision('horometro_h'),
    medidorActualizadoEn: timestamp('medidor_actualizado_en', {
      withTimezone: true,
      mode: 'date',
    }),
    /**
     * El día de la obra del que es la última lectura (spec 026, RF-42): el del reporte,
     * el de la bitácora o el del preoperacional, no el de cuando se procesó. Un reporte
     * de un día anterior no la cambia (RF-43). Nulo en lo de antes del cambio.
     */
    medidorDia: date('medidor_dia', { mode: 'string' }),
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
    /**
     * Un día con trabajo en que no se ejecutó ninguna actividad o no se hizo ningún
     * ensayo (spec 032, RF-21 a RF-35): con la marca y su motivo la sección cuenta
     * como llena al cerrar. Columnas y no una fila especial dentro de la lista,
     * porque esas listas se cuentan, se fusionan con WhatsApp y se exportan. El
     * default `false` deja como estaban las bitácoras anteriores (RF-38).
     */
    sinActividades: boolean('sin_actividades').notNull().default(false),
    motivoSinActividades: text('motivo_sin_actividades'),
    sinEnsayos: boolean('sin_ensayos').notNull().default(false),
    motivoSinEnsayos: text('motivo_sin_ensayos'),

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
    /**
     * El reporte de WhatsApp del que salió, si se aprobó desde la bandeja (spec 023,
     * RF-37 y RF-38). Nulo en lo registrado en el módulo; `registrado_por` es
     * entonces quien aprobó.
     */
    mensajeWhatsappId: text('mensaje_whatsapp_id').references(
      (): AnyPgColumn => whatsappMensajes.id,
    ),
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
    /**
     * El número del vale de despacho de la cantera (spec 023, RF-41 a RF-45). Opcional,
     * y **tal como se escribe** —«F-0458», «0458 A»—, solo sin espacios en los
     * extremos. No es único: uno repetido se avisa y se deja guardar (RF-45); el
     * índice de abajo es para encontrar el repetido, sin distinguir mayúsculas (RF-56).
     */
    vale: text('vale'),
    /**
     * El mensaje de WhatsApp del que salió, si se aprobó desde la bandeja (spec
     * 021, RF-46 y RF-47). Nulo en lo registrado en el módulo. `registrado_por` es
     * entonces quien aprobó.
     */
    mensajeWhatsappId: text('mensaje_whatsapp_id').references(() => whatsappMensajes.id),
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
    index('ix_cantera_viaje_vale')
      .on(t.obraId, sql`lower(${t.vale})`)
      .where(sql`${t.vale} is not null`),
    // RF-44 y RF-55: ni vacío ni de más de 30. La regla ya lo exige; esto es para
    // lo que llegue por fuera de ella.
    check(
      'ck_cantera_viaje_vale',
      sql`${t.vale} is null or char_length(${t.vale}) between 1 and 30`,
    ),
    check(
      'ck_cantera_viaje_destino',
      // `is not null` explícito: un `check` que da desconocido (por un nulo) se
      // acepta, y sin esto un viaje a la obra sin PR pasaría la restricción.
      // Los metros, cualquier entero de 0 a 999 (spec 026, RF-52; antes de 25 en 25).
      sql`(${t.destinoObra} and ${t.destinoId} is null
            and ${t.pr} is not null and ${t.metros} is not null
            and ${t.pr} between 0 and 25
            and ${t.metros} between 0 and 999)
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
/* Reportes de WhatsApp (spec 021, solo del servidor)                        */
/* ------------------------------------------------------------------------ */

/**
 * Un grupo de WhatsApp y la obra a la que pertenece (RF-8 a RF-13).
 *
 * El id es el de WhatsApp (`…@g.us`): la integración lo manda con cada mensaje y
 * así el grupo se crea solo la primera vez, sin obra, para que la gerencia lo
 * asocie (RF-10). Mientras no tenga obra, sus mensajes no salen en ninguna bandeja
 * (RF-11), porque **la obra de un mensaje sin decidir sale de su grupo** y no se
 * copia en él: cambiar la obra del grupo mueve los pendientes sin reescribir nada
 * (RF-13). Lo ya decidido se queda donde se decidió: ver `obra_decidida_id`.
 */
export const whatsappGrupos = pgTable(
  'whatsapp_grupos',
  {
    id: text('id').primaryKey(),
    nombre: text('nombre').notNull(),
    obraId: text('obra_id').references(() => obras.id),
    asociadoPor: text('asociado_por').references(() => usuarios.id),
    asociadoEn: timestamp('asociado_en', { withTimezone: true, mode: 'date' }),
    creadoEn: creadoEn(),
    actualizadoEn: actualizadoEn(),
  },
  (t) => [index('ix_whatsapp_grupo_obra').on(t.obraId)],
);

/**
 * Un mensaje capturado, con lo que propuso la IA y lo que decidió una persona.
 *
 * ── El id ──
 *
 * El de WhatsApp. Es la llave de idempotencia de la integración (RF-4): una
 * entrega repetida cae sobre la misma fila, y la sentencia que la recibe decide en
 * una sola vuelta si reemplaza la propuesta o la conserva (RF-5, RF-6).
 *
 * ── Dos propuestas ──
 *
 * `propuesta_ia` es la de la IA tal como llegó y no se toca nunca (RF-27).
 * `propuesta` es la corregida por el residente, nula mientras nadie corrija. Van
 * en `jsonb` porque una propuesta es un documento que se corrige y se aprueba
 * entero; partirla en tablas serían varias escrituras sin transacción.
 *
 * ── La versión ──
 *
 * Sube en cada corrección o decisión. Quien corrige o decide manda la que leyó, y
 * si otra persona se le adelantó, su sentencia no encuentra la fila y recibe un
 * 409 (RF-29).
 *
 * ── Nada se borra ──
 *
 * Ni el mensaje, ni la propuesta, ni la decisión (RF-58): descartar es un estado,
 * con motivo, quién y cuándo (RF-56).
 */
export const whatsappMensajes = pgTable(
  'whatsapp_mensajes',
  {
    id: text('id').primaryKey(),
    grupoId: text('grupo_id')
      .notNull()
      .references(() => whatsappGrupos.id),
    /** El `lid` de WhatsApp del autor. */
    autorId: text('autor_id').notNull(),
    /** Como se llama en WhatsApp. Lo que se muestra si no está registrado (RF-22). */
    autorNombre: text('autor_nombre'),
    enviadoEn: timestamp('enviado_en', { withTimezone: true, mode: 'date' }).notNull(),
    /** texto, imagen, documento, audio o video. */
    tipo: text('tipo').notNull(),
    texto: text('texto'),
    /** La de la IA (`CATEGORIAS_DE_WHATSAPP`). Texto y no enum: la IA puede estrenar una. */
    categoria: text('categoria'),
    /** El mensaje al que esta foto o respuesta pertenece, según la IA (RF-20). */
    complementaA: text('complementa_a'),
    propuestaIa: jsonb('propuesta_ia').$type<Record<string, unknown>>().notNull(),
    propuesta: jsonb('propuesta').$type<Record<string, unknown>>(),
    estado: estadoMensajeWhatsapp('estado').notNull().default('pendiente'),
    version: integer('version').notNull().default(0),
    /** Con la bitácora cerrada, los viajes se aprueban solos (RF-96 a RF-98). */
    viajesAprobadosEn: timestamp('viajes_aprobados_en', { withTimezone: true, mode: 'date' }),
    aprobadoPor: text('aprobado_por').references(() => usuarios.id),
    aprobadoEn: timestamp('aprobado_en', { withTimezone: true, mode: 'date' }),
    descartadoPor: text('descartado_por').references(() => usuarios.id),
    descartadoEn: timestamp('descartado_en', { withTimezone: true, mode: 'date' }),
    motivoDescarte: text('motivo_descarte'),
    /** La bitácora a la que fue al aprobarse. */
    parteId: text('parte_id').references(() => partesDeObra.id),
    /**
     * La obra en la que se aprobó o descartó, escrita en la misma sentencia que la
     * decisión. Nula mientras no se decide: entonces manda la obra del grupo.
     *
     * Existe por RF-13. Si la obra saliera siempre del grupo, cambiar un grupo de
     * obra llevaría también lo ya decidido, y el historial de aprobados de la obra
     * nueva mostraría reportes que nunca fueron suyos. Añadida en la tarea T13
     * (migración 0019); el plan original no la tenía.
     */
    obraDecididaId: text('obra_decidida_id').references(() => obras.id),
    recibidoEn: timestamp('recibido_en', { withTimezone: true, mode: 'date' })
      .notNull()
      .default(sql`now()`),
    /*
     * Spec 024: el guardado automático. `fecha_hecho` y `tipo_reporte` dicen a qué día
     * y a qué reporte esperado cuenta el mensaje (RF-5, RF-38); `resultado`, qué se
     * guardó y dónde, para el historial (RF-58, RF-59). `intentos` y `error_proceso`
     * dejan ver un mensaje que falla una y otra vez en vez de reintentarlo para siempre.
     */
    fechaHecho: date('fecha_hecho', { mode: 'string' }),
    tipoReporte: tipoReporteWhatsapp('tipo_reporte'),
    procesadoEn: timestamp('procesado_en', { withTimezone: true, mode: 'date' }),
    intentos: integer('intentos').notNull().default(0),
    errorProceso: text('error_proceso'),
    resultado: jsonb('resultado').$type<Record<string, unknown>>(),
    actualizadoEn: actualizadoEn(),
  },
  (t) => [
    // Spec 024: los mensajes en espera de un día, y los pendientes del pulso.
    index('ix_whatsapp_mensaje_dia').on(t.fechaHecho, t.estado),
    // La bandeja: los de un grupo, en un estado, por fecha (RF-16, RF-24).
    index('ix_whatsapp_mensaje_bandeja').on(t.grupoId, t.estado, t.enviadoEn),
    // Las fotos y respuestas que cuelgan de un reporte (RF-20).
    index('ix_whatsapp_mensaje_complementa').on(t.complementaA),
    check(
      'ck_whatsapp_mensaje_descarte',
      // Descartar exige motivo (RF-55), y no basta con espacios.
      sql`${t.estado} <> 'descartado'
       or (${t.motivoDescarte} is not null and length(trim(${t.motivoDescarte})) > 0
           and ${t.descartadoPor} is not null and ${t.descartadoEn} is not null)`,
    ),
    check(
      'ck_whatsapp_mensaje_aprobacion',
      sql`${t.estado} <> 'aprobado'
       or (${t.aprobadoPor} is not null and ${t.aprobadoEn} is not null)`,
    ),
    check('ck_whatsapp_mensaje_version', sql`${t.version} >= 0`),
    // El historial de aprobados y descartados de una obra (RF-24, RF-13).
    index('ix_whatsapp_mensaje_obra_decidida').on(t.obraDecididaId),
  ],
);

/**
 * Los reportes que la bitácora de cada día de una obra espera (spec 024, RF-37 a
 * RF-42). Sin filas, la bitácora se arma con el primer mensaje del día (RF-41).
 * `autor_id` es el `lid` de WhatsApp de quien lo manda, o nulo si vale cualquiera
 * (RF-39). Se quita con baja lógica, como todo.
 */
export const whatsappReportesEsperados = pgTable(
  'whatsapp_reportes_esperados',
  {
    id: text('id').primaryKey(),
    obraId: text('obra_id')
      .notNull()
      .references(() => obras.id),
    tipoReporte: tipoReporteWhatsapp('tipo_reporte').notNull(),
    autorId: text('autor_id'),
    autorNombre: text('autor_nombre'),
    creadoPor: text('creado_por')
      .notNull()
      .references(() => usuarios.id),
    creadoEn: creadoEn(),
    eliminadoEn: eliminadoEn(),
  },
  (t) => [
    uniqueIndex('ux_whatsapp_esperado')
      .on(t.obraId, t.tipoReporte, sql`coalesce(${t.autorId}, '')`)
      .where(sql`eliminado_en is null`),
  ],
);

/**
 * En qué va la bitácora de un día armada desde WhatsApp (spec 024, RF-43 a RF-57).
 * Una fila por obra y día con mensajes. Cerrada no se guarda aquí: se lee de la
 * bitácora, que es la que manda (RF-56).
 */
export const whatsappDias = pgTable(
  'whatsapp_dias',
  {
    obraId: text('obra_id')
      .notNull()
      .references(() => obras.id),
    fecha: date('fecha', { mode: 'string' }).notNull(),
    estado: estadoDiaWhatsapp('estado').notNull().default('en_espera'),
    /** Los reportes esperados que no llegaron, si se armó incompleta (RF-47). */
    faltaron: jsonb('faltaron').$type<{ tipoReporte: string; autorNombre: string | null }[]>(),
    parteId: text('parte_id').references(() => partesDeObra.id),
    armadaEn: timestamp('armada_en', { withTimezone: true, mode: 'date' }),
    /** Quién pulsó «Guardar con lo que hay» (RF-48); nulo si la armó el sistema. */
    armadaPor: text('armada_por').references(() => usuarios.id),
    creadoEn: creadoEn(),
  },
  (t) => [primaryKey({ columns: [t.obraId, t.fecha] })],
);

/**
 * Un renglón de un mensaje que no se pudo guardar solo (spec 024, RF-19, RF-60 a
 * RF-63). El id es fijo —mensaje, sección y renglón—, así que procesar otra vez el
 * mensaje no lo duplica. `datos` es el renglón como quedó, para completarlo.
 */
export const whatsappExcepciones = pgTable(
  'whatsapp_excepciones',
  {
    id: text('id').primaryKey(),
    mensajeId: text('mensaje_id')
      .notNull()
      .references(() => whatsappMensajes.id),
    seccion: text('seccion').notNull(),
    renglon: integer('renglon'),
    motivo: text('motivo').notNull(),
    datos: jsonb('datos').$type<Record<string, unknown>>(),
    estado: estadoExcepcionWhatsapp('estado').notNull().default('pendiente'),
    resueltaPor: text('resuelta_por').references(() => usuarios.id),
    resueltaEn: timestamp('resuelta_en', { withTimezone: true, mode: 'date' }),
    motivoDescarte: text('motivo_descarte'),
    creadoEn: creadoEn(),
  },
  (t) => [
    index('ix_whatsapp_excepcion_mensaje').on(t.mensajeId),
    index('ix_whatsapp_excepcion_estado').on(t.estado),
    check(
      'ck_whatsapp_excepcion_descarte',
      // Descartar exige motivo (RF-63), como en la bandeja (021/RF-55).
      sql`${t.estado} <> 'descartada'
       or (${t.motivoDescarte} is not null and length(trim(${t.motivoDescarte})) > 0)`,
    ),
  ],
);

/**
 * La marca «creado desde WhatsApp» (spec 024, RF-32 a RF-36): una fila por persona,
 * volqueta, material o sitio que el sistema registró solo. En una tabla aparte y no
 * en una columna de cada una, porque «revisado» y «unido a» harían falta en las
 * cinco (decisión del plan).
 */
export const whatsappCreados = pgTable(
  'whatsapp_creados',
  {
    tipo: tipoCreadoWhatsapp('tipo').notNull(),
    registroId: text('registro_id').notNull(),
    obraId: text('obra_id')
      .notNull()
      .references(() => obras.id),
    mensajeId: text('mensaje_id')
      .notNull()
      .references(() => whatsappMensajes.id),
    creadoEn: creadoEn(),
    revisadoPor: text('revisado_por').references(() => usuarios.id),
    revisadoEn: timestamp('revisado_en', { withTimezone: true, mode: 'date' }),
    /** El registro con el que se unió (RF-36); el creado queda dado de baja. */
    unidoA: text('unido_a'),
  },
  (t) => [
    primaryKey({ columns: [t.tipo, t.registroId] }),
    index('ix_whatsapp_creado_obra').on(t.obraId, t.revisadoEn),
  ],
);

/**
 * Las «Fotos del día» de una bitácora (spec 027): cada foto de WhatsApp de la obra y el
 * día que entró a ella.
 *
 * Apunta a la foto de WhatsApp y no la copia (RF-32): el archivo es el mismo objeto de R2,
 * y quién la mandó, a qué hora, en qué tipo de mensaje y qué dijo la IA se leen del
 * mensaje. Por eso es una tabla aparte y no otra fila de `media` como la foto principal:
 * `media` no tiene dónde decir quién la quitó y por qué.
 *
 * Quitar es lógico (principio 4, RF-25): la fila se queda con quién, cuándo y por qué, y
 * su existencia es justo lo que impide que la foto vuelva a entrar al reprocesar (RF-27).
 */
export const bitacoraFotos = pgTable(
  'bitacora_fotos',
  {
    /** `idDeterminista(parteId, 'foto-del-dia', mediaId)`: reintentar no duplica. */
    id: text('id').primaryKey(),
    parteId: text('parte_id')
      .notNull()
      .references(() => partesDeObra.id),
    mediaId: text('media_id')
      .notNull()
      .references(() => media.id),
    /**
     * El mensaje de WhatsApp del que salió; `null` si se subió en el panel (cambio del
     * 2026-10-14, RF-34, RF-38): su hora es entonces la de subida de la foto.
     */
    mensajeId: text('mensaje_id').references(() => whatsappMensajes.id),
    /** La huella del archivo, para no repetir la misma foto mandada dos veces (RF-8). */
    sha256: text('sha256'),
    agregadaEn: timestamp('agregada_en', { withTimezone: true, mode: 'date' })
      .notNull()
      .default(sql`now()`),
    quitadaEn: timestamp('quitada_en', { withTimezone: true, mode: 'date' }),
    quitadaPor: text('quitada_por').references(() => usuarios.id),
    motivoQuitada: text('motivo_quitada'),
  },
  (t) => [
    uniqueIndex('ux_bitacora_foto_media').on(t.parteId, t.mediaId),
    uniqueIndex('ux_bitacora_foto_huella')
      .on(t.parteId, t.sha256)
      .where(sql`${t.sha256} is not null`),
    check(
      'ck_bitacora_foto_quitada',
      // Quitar exige quién y por qué (RF-24, RF-25).
      sql`${t.quitadaEn} is null
       or (${t.quitadaPor} is not null and ${t.motivoQuitada} is not null and length(trim(${t.motivoQuitada})) > 0)`,
    ),
  ],
);

/**
 * El intervalo de mantenimiento de un tipo de equipo (spec 030, RF-24). Sin fila vale
 * el de arranque de su clase de medidor, que vive en `rules/mantenimiento`: nada que
 * sembrar, y un tipo nuevo lo hereda solo.
 */
export const mantenimientoIntervalos = pgTable(
  'mantenimiento_intervalos',
  {
    tipoVehiculoId: text('tipo_vehiculo_id')
      .notNull()
      .references(() => tiposVehiculo.id),
    clase: claseConIntervalo('clase').notNull(),
    /** Cada cuántas horas o kilómetros, según el medidor del tipo. */
    cada: doublePrecision('cada').notNull(),
    avisoPorcentaje: integer('aviso_porcentaje').notNull().default(90),
    actualizadoPor: text('actualizado_por').references(() => usuarios.id),
    actualizadoEn: actualizadoEn(),
  },
  (t) => [
    primaryKey({ columns: [t.tipoVehiculoId, t.clase] }),
    check('ck_mantenimiento_intervalo', sql`${t.cada} > 0 and ${t.avisoPorcentaje} between 50 and 99`),
  ],
);

/** El de una máquina concreta, que manda sobre el de su tipo (spec 030, RF-25). */
export const mantenimientoIntervalosVehiculo = pgTable(
  'mantenimiento_intervalos_vehiculo',
  {
    vehiculoId: text('vehiculo_id')
      .notNull()
      .references(() => vehiculos.id),
    clase: claseConIntervalo('clase').notNull(),
    cada: doublePrecision('cada').notNull(),
    avisoPorcentaje: integer('aviso_porcentaje').notNull().default(90),
    actualizadoPor: text('actualizado_por').references(() => usuarios.id),
    actualizadoEn: actualizadoEn(),
  },
  (t) => [
    primaryKey({ columns: [t.vehiculoId, t.clase] }),
    check('ck_mantenimiento_intervalo_vehiculo', sql`${t.cada} > 0 and ${t.avisoPorcentaje} between 50 and 99`),
  ],
);

/**
 * Un mantenimiento hecho a una máquina (spec 030, RF-32 a RF-42). **Evidencia: no se
 * edita** (RF-35): se anula con motivo, y el anulado deja de contar. El correctivo
 * queda pendiente hasta que se marca resuelto (RF-29).
 *
 * Lo que llega por WhatsApp lleva un id determinista de máquina, clase y día, así que
 * el mismo mantenimiento dos veces se guarda una (RF-42).
 */
export const mantenimientos = pgTable(
  'mantenimientos',
  {
    id: text('id').primaryKey(),
    vehiculoId: text('vehiculo_id')
      .notNull()
      .references(() => vehiculos.id),
    /** La obra donde estaba la máquina al registrarlo: para el alcance del residente. */
    obraId: text('obra_id').references(() => obras.id),
    clase: claseMantenimiento('clase').notNull(),
    /** `YYYY-MM-DD`, el día en que se hizo. */
    fecha: date('fecha', { mode: 'string' }).notNull(),
    /** La lectura del medidor al hacerlo; nula solo si la máquina no tenía ninguna. */
    lectura: doublePrecision('lectura'),
    nota: text('nota').notNull().default(''),
    origen: origenMantenimiento('origen').notNull(),
    mensajeId: text('mensaje_id').references(() => whatsappMensajes.id),
    registradoPor: text('registrado_por')
      .notNull()
      .references(() => usuarios.id),
    creadoEn: creadoEn(),
    resueltoEn: date('resuelto_en', { mode: 'string' }),
    resueltoPor: text('resuelto_por').references(() => usuarios.id),
    notaResuelto: text('nota_resuelto'),
    anuladoEn: timestamp('anulado_en', { withTimezone: true, mode: 'date' }),
    anuladoPor: text('anulado_por').references(() => usuarios.id),
    motivoAnulacion: text('motivo_anulacion'),
  },
  (t) => [
    index('ix_mantenimiento_vehiculo').on(t.vehiculoId, t.clase, t.fecha),
    index('ix_mantenimiento_obra').on(t.obraId, t.fecha),
    // Anular exige motivo (RF-35), como los viajes y las bitácoras.
    check(
      'ck_mantenimiento_anulacion',
      sql`${t.anuladoEn} is null
       or (${t.motivoAnulacion} is not null and length(trim(${t.motivoAnulacion})) > 0)`,
    ),
    // Solo un correctivo se resuelve (RF-29).
    check('ck_mantenimiento_resuelto', sql`${t.resueltoEn} is null or ${t.clase} = 'correctivo'`),
    check('ck_mantenimiento_origen', sql`(${t.origen} = 'whatsapp') = (${t.mensajeId} is not null)`),
  ],
);

/* ------------------------------------------------------------------------ */
/* Contrato y presupuesto de la obra (spec 031, solo del servidor)           */
/* ------------------------------------------------------------------------ */

/**
 * El contrato de una obra con su cliente (spec 031, RF-7 a RF-22). Uno por obra.
 *
 * Los integrantes del consorcio y los impuestos van en jsonb: se editan con el
 * formulario entero, son listas cortas y los cortes de la 032 los leen completos (plan,
 * decisiones). `version` sube en cada guardado: quien guarda con una vieja recibe un
 * 409 en vez de pisar lo que otra persona cambió.
 */
export const contratos = pgTable(
  'contratos',
  {
    id: text('id').primaryKey(),
    obraId: text('obra_id')
      .notNull()
      .references(() => obras.id),
    estado: estadoContrato('estado').notNull().default('borrador'),
    contratanteNombre: text('contratante_nombre').notNull().default(''),
    contratanteNit: text('contratante_nit').notNull().default(''),
    contratanteDireccion: text('contratante_direccion').notNull().default(''),
    contratanteCiudad: text('contratante_ciudad').notNull().default(''),
    contratanteCorreo: text('contratante_correo').notNull().default(''),
    contratanteTelefono: text('contratante_telefono').notNull().default(''),
    representanteNombre: text('representante_nombre').notNull().default(''),
    representanteIdentificacion: text('representante_identificacion').notNull().default(''),
    esConsorcio: boolean('es_consorcio').notNull().default(false),
    nombreConsorcio: text('nombre_consorcio').notNull().default(''),
    integrantes: jsonb('integrantes').$type<IntegranteDelConsorcio[]>().notNull().default([]),
    /** Uno de `TIPOS_DE_CONTRATO`; nulo mientras el borrador no lo dice. */
    tipo: text('tipo'),
    numero: text('numero').notNull().default(''),
    objeto: text('objeto').notNull().default(''),
    fechaInicio: date('fecha_inicio', { mode: 'string' }),
    fechaFin: date('fecha_fin', { mode: 'string' }),
    plazoDias: integer('plazo_dias'),
    /** Pesos, sin decimales. */
    valor: bigint('valor', { mode: 'number' }),
    anticipoPorcentaje: numeric('anticipo_porcentaje', { precision: 5, scale: 2, mode: 'number' }),
    retencionPorcentaje: numeric('retencion_porcentaje', { precision: 5, scale: 2, mode: 'number' }),
    impuestos: jsonb('impuestos').$type<ImpuestoDelContrato[]>().notNull().default([]),
    version: integer('version').notNull().default(0),
    aprobadoEn: timestamp('aprobado_en', { withTimezone: true, mode: 'date' }),
    aprobadoPor: text('aprobado_por').references(() => usuarios.id),
    actualizadoPor: text('actualizado_por').references(() => usuarios.id),
    creadoEn: creadoEn(),
    actualizadoEn: actualizadoEn(),
  },
  (t) => [
    uniqueIndex('ux_contrato_obra').on(t.obraId),
    check(
      'ck_contrato_porcentajes',
      sql`(${t.anticipoPorcentaje} is null or ${t.anticipoPorcentaje} between 0 and 100)
       and (${t.retencionPorcentaje} is null or ${t.retencionPorcentaje} between 0 and 100)`,
    ),
    check(
      'ck_contrato_fechas',
      sql`${t.fechaInicio} is null or ${t.fechaFin} is null or ${t.fechaFin} >= ${t.fechaInicio}`,
    ),
    check('ck_contrato_aprobado', sql`${t.estado} = 'borrador' or ${t.aprobadoEn} is not null`),
  ],
);

/** Quién guardó, aprobó o devolvió a borrador el contrato, y cuándo (RF-6, RF-19). */
export const contratoEventos = pgTable(
  'contrato_eventos',
  {
    id: text('id').primaryKey(),
    contratoId: text('contrato_id')
      .notNull()
      .references(() => contratos.id),
    accion: accionContrato('accion').notNull(),
    /** Obligatorio al volver a borrador (RF-19). */
    motivo: text('motivo'),
    usuarioId: text('usuario_id')
      .notNull()
      .references(() => usuarios.id),
    en: timestamp('en', { withTimezone: true, mode: 'date' })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index('ix_contrato_eventos').on(t.contratoId, t.en),
    check(
      'ck_contrato_evento_motivo',
      sql`${t.accion} <> 'a_borrador' or (${t.motivo} is not null and length(trim(${t.motivo})) > 0)`,
    ),
  ],
);

/**
 * Las pólizas del contrato (RF-23 a RF-26). Nada se borra: se reemplaza por otra o se
 * anula con motivo. La vigencia (por vencer, vencida) no se guarda: la calcula
 * `vigenciaDePoliza` con la fecha de hoy.
 */
export const contratoPolizas = pgTable(
  'contrato_polizas',
  {
    id: text('id').primaryKey(),
    contratoId: text('contrato_id')
      .notNull()
      .references(() => contratos.id),
    /** Uno de `AMPAROS`. */
    amparo: text('amparo').notNull(),
    aseguradora: text('aseguradora').notNull(),
    numero: text('numero').notNull(),
    valor: bigint('valor', { mode: 'number' }),
    desde: date('desde', { mode: 'string' }).notNull(),
    hasta: date('hasta', { mode: 'string' }).notNull(),
    /** El archivo de la póliza, opcional: una fila de `media` con dueño `contrato`. */
    mediaId: text('media_id').references(() => media.id),
    estado: estadoPolizaRegistro('estado').notNull().default('activa'),
    reemplazadaPor: text('reemplazada_por').references((): AnyPgColumn => contratoPolizas.id),
    anuladaEn: timestamp('anulada_en', { withTimezone: true, mode: 'date' }),
    anuladaPor: text('anulada_por').references(() => usuarios.id),
    motivoAnulacion: text('motivo_anulacion'),
    creadaPor: text('creada_por')
      .notNull()
      .references(() => usuarios.id),
    creadaEn: timestamp('creada_en', { withTimezone: true, mode: 'date' })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index('ix_contrato_polizas').on(t.contratoId, t.hasta),
    check('ck_poliza_vigencia', sql`${t.hasta} >= ${t.desde}`),
    check(
      'ck_poliza_anulada',
      sql`(${t.estado} = 'anulada') = (${t.anuladaEn} is not null)
       and (${t.anuladaEn} is null or (${t.motivoAnulacion} is not null and length(trim(${t.motivoAnulacion})) > 0))`,
    ),
    check('ck_poliza_reemplazada', sql`(${t.estado} = 'reemplazada') = (${t.reemplazadaPor} is not null)`),
  ],
);

/** Los documentos del contrato (RF-27 a RF-30): se anulan con motivo, nunca se borran. */
export const contratoDocumentos = pgTable(
  'contrato_documentos',
  {
    id: text('id').primaryKey(),
    contratoId: text('contrato_id')
      .notNull()
      .references(() => contratos.id),
    /** Contrato firmado, acta de inicio, otrosí… */
    clase: text('clase').notNull(),
    fecha: date('fecha', { mode: 'string' }).notNull(),
    descripcion: text('descripcion').notNull().default(''),
    mediaId: text('media_id')
      .notNull()
      .references(() => media.id),
    anuladoEn: timestamp('anulado_en', { withTimezone: true, mode: 'date' }),
    anuladoPor: text('anulado_por').references(() => usuarios.id),
    motivoAnulacion: text('motivo_anulacion'),
    subidoPor: text('subido_por')
      .notNull()
      .references(() => usuarios.id),
    subidoEn: timestamp('subido_en', { withTimezone: true, mode: 'date' })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index('ix_contrato_documentos').on(t.contratoId, t.fecha),
    check(
      'ck_documento_anulacion',
      sql`${t.anuladoEn} is null
       or (${t.motivoAnulacion} is not null and length(trim(${t.motivoAnulacion})) > 0)`,
    ),
  ],
);

/**
 * Los presupuestos de una obra, uno por versión (RF-31 a RF-57).
 *
 * La estructura entera —grupos, capítulos, ítems, rubros y AIU— va en un jsonb y se
 * reemplaza entera al guardar, con `where version = ?` (plan, decisiones): Neon por HTTP
 * no da transacciones, y un cambio del editor tocaría muchas filas. `valor` es la copia
 * del resumen, para listar sin leer la estructura.
 *
 * A lo sumo un vigente y un borrador por obra (RF-49, RF-57): lo garantizan los dos
 * índices parciales, no la pantalla.
 */
export const presupuestos = pgTable(
  'presupuestos',
  {
    id: text('id').primaryKey(),
    obraId: text('obra_id')
      .notNull()
      .references(() => obras.id),
    nombre: text('nombre').notNull(),
    numeroVersion: integer('numero_version').notNull(),
    /** El motivo de la versión: «Otrosí 1». */
    notaVersion: text('nota_version').notNull().default(''),
    estado: estadoPresupuesto('estado').notNull().default('borrador'),
    estructura: jsonb('estructura').$type<EstructuraDePresupuesto>().notNull(),
    /** Pesos: obras + rubros. Lo calcula el servidor al guardar. */
    valor: bigint('valor', { mode: 'number' }).notNull().default(0),
    /** El «VALOR TOTAL» del Excel importado (RF-43). */
    valorExcel: bigint('valor_excel', { mode: 'number' }),
    /** Importado con diferencias (RF-44). */
    revisar: boolean('revisar').notNull().default(false),
    origen: origenPresupuesto('origen').notNull(),
    version: integer('version').notNull().default(0),
    aprobadoEn: timestamp('aprobado_en', { withTimezone: true, mode: 'date' }),
    aprobadoPor: text('aprobado_por').references(() => usuarios.id),
    descartadoEn: timestamp('descartado_en', { withTimezone: true, mode: 'date' }),
    descartadoPor: text('descartado_por').references(() => usuarios.id),
    motivoDescarte: text('motivo_descarte'),
    creadoPor: text('creado_por')
      .notNull()
      .references(() => usuarios.id),
    actualizadoPor: text('actualizado_por').references(() => usuarios.id),
    creadoEn: creadoEn(),
    actualizadoEn: actualizadoEn(),
  },
  (t) => [
    uniqueIndex('ux_presupuesto_version').on(t.obraId, t.numeroVersion),
    uniqueIndex('ux_presupuesto_vigente')
      .on(t.obraId)
      .where(sql`estado = 'vigente'`),
    uniqueIndex('ux_presupuesto_borrador')
      .on(t.obraId)
      .where(sql`estado = 'borrador'`),
    check(
      'ck_presupuesto_descarte',
      sql`(${t.estado} = 'descartado') = (${t.descartadoEn} is not null)
       and (${t.descartadoEn} is null or (${t.motivoDescarte} is not null and length(trim(${t.motivoDescarte})) > 0))`,
    ),
    check(
      'ck_presupuesto_aprobado',
      sql`${t.estado} not in ('vigente', 'reemplazado') or ${t.aprobadoEn} is not null`,
    ),
  ],
);

/**
 * Lo que leyó la IA de un Excel de presupuesto, por la huella del archivo (031/RF-84,
 * RF-85). La vista previa la guarda y al confirmar se crea el borrador con esta misma
 * lectura: no se paga dos veces y la vista previa y el borrador salen iguales. Se guarda
 * lo que devolvió la IA, no la estructura: la comprobación contra las filas se repite
 * con el archivo cada vez, y es pura.
 */
export const presupuestoLecturasIa = pgTable('presupuesto_lecturas_ia', {
  /** SHA-256 en hexadecimal del archivo tal como se subió. */
  huella: text('huella').primaryKey(),
  lectura: jsonb('lectura').$type<LecturaDeIa>().notNull(),
  modelo: text('modelo').notNull(),
  tokensEntrada: integer('tokens_entrada').notNull(),
  tokensSalida: integer('tokens_salida').notNull(),
  creadoPor: text('creado_por')
    .notNull()
    .references(() => usuarios.id),
  creadoEn: creadoEn(),
});

/* ------------------------------------------------------------------------ */
/* Spec 028: el asistente                                                    */
/* ------------------------------------------------------------------------ */

export const rolMensajeAsistente = pgEnum('rol_mensaje_asistente', ['persona', 'asistente']);
export const estadoMensajeAsistente = pgEnum('estado_mensaje_asistente', ['respondido', 'fallido']);

/**
 * Las conversaciones con el asistente (RF-38 a RF-49). De una sola persona, que es la
 * única que las ve (RF-40); nadie las borra (RF-48), solo se archivan (RF-45).
 *
 * `obras` y `modulos` son lo que consultó en todas sus preguntas: con eso se decide si
 * la persona todavía alcanza su contenido (RF-49, `conversacionVisible`).
 */
export const asistenteConversaciones = pgTable(
  'asistente_conversaciones',
  {
    id: text('id').primaryKey(),
    usuarioId: text('usuario_id')
      .notNull()
      .references(() => usuarios.id),
    titulo: text('titulo').notNull(),
    obras: jsonb('obras').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    modulos: jsonb('modulos').$type<ModuloConsultable[]>().notNull().default(sql`'[]'::jsonb`),
    archivada: boolean('archivada').notNull().default(false),
    creadoEn: creadoEn(),
    actualizadoEn: actualizadoEn(),
  },
  (t) => [index('ix_asistente_conversaciones_usuario').on(t.usuarioId, t.archivada, t.actualizadoEn)],
);

/**
 * Las preguntas y las respuestas, en orden (RF-38, RF-42). Una respuesta se guarda como
 * se dio, con sus fuentes, y no se vuelve a calcular (RF-27, RF-42). Una que falló queda
 * `fallido` para poder reintentarla (RF-61, RF-62) y no cuenta en el día (RF-55).
 */
export const asistenteMensajes = pgTable(
  'asistente_mensajes',
  {
    id: text('id').primaryKey(),
    conversacionId: text('conversacion_id')
      .notNull()
      .references(() => asistenteConversaciones.id),
    rol: rolMensajeAsistente('rol').notNull(),
    texto: text('texto').notNull(),
    fuentes: jsonb('fuentes').$type<FuenteDeRespuesta[]>().notNull().default(sql`'[]'::jsonb`),
    adjuntos: jsonb('adjuntos').$type<AdjuntoGuardado[]>().notNull().default(sql`'[]'::jsonb`),
    estado: estadoMensajeAsistente('estado').notNull().default('respondido'),
    modelo: text('modelo'),
    tokensEntrada: integer('tokens_entrada').notNull().default(0),
    tokensSalida: integer('tokens_salida').notNull().default(0),
    creadoEn: creadoEn(),
  },
  (t) => [
    index('ix_asistente_mensajes_conversacion').on(t.conversacionId, t.creadoEn),
    check('ck_asistente_mensaje_tokens', sql`${t.tokensEntrada} >= 0 and ${t.tokensSalida} >= 0`),
  ],
);

/**
 * El uso por persona, día de Colombia y obra (RF-50 a RF-57). Solo suma lo que se
 * respondió bien (RF-55). La obra es la que consultó la pregunta, o nula si consultó
 * varias o ninguna. `id` es «usuario|día|obra», porque una llave con una columna nula no
 * sirve para sumar con `on conflict`.
 */
export const asistenteUso = pgTable(
  'asistente_uso',
  {
    id: text('id').primaryKey(),
    usuarioId: text('usuario_id')
      .notNull()
      .references(() => usuarios.id),
    dia: date('dia', { mode: 'string' }).notNull(),
    obraId: text('obra_id').references(() => obras.id),
    preguntas: integer('preguntas').notNull().default(0),
    tokensEntrada: integer('tokens_entrada').notNull().default(0),
    tokensSalida: integer('tokens_salida').notNull().default(0),
    /** RF-57, en microdólares (`costoEstimado`). */
    costo: bigint('costo', { mode: 'number' }).notNull().default(0),
  },
  (t) => [
    index('ix_asistente_uso_dia').on(t.dia),
    index('ix_asistente_uso_usuario').on(t.usuarioId, t.dia),
    check('ck_asistente_uso_positivo', sql`${t.preguntas} >= 0 and ${t.costo} >= 0`),
  ],
);

/**
 * Los límites que pone la gerencia (RF-59): `clave` es «todos» o el id de la persona.
 * Sin fila, vale `LIMITE_DEL_DIA` (30).
 */
export const asistenteLimites = pgTable(
  'asistente_limites',
  {
    clave: text('clave').primaryKey(),
    usuarioId: text('usuario_id').references(() => usuarios.id),
    limite: integer('limite').notNull(),
    actualizadoPor: text('actualizado_por')
      .notNull()
      .references(() => usuarios.id),
    actualizadoEn: actualizadoEn(),
  },
  (t) => [
    check('ck_asistente_limite_rango', sql`${t.limite} between 0 and 500`),
    check(
      'ck_asistente_limite_clave',
      sql`(${t.clave} = 'todos' and ${t.usuarioId} is null) or (${t.clave} = ${t.usuarioId})`,
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
