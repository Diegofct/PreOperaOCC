CREATE TYPE "public"."clase_medidor" AS ENUM('odometro', 'horometro', 'ambos');--> statement-breakpoint
CREATE TYPE "public"."dueno_media" AS ENUM('preoperacional', 'bitacora', 'documento');--> statement-breakpoint
CREATE TYPE "public"."estado_vehiculo" AS ENUM('operativo', 'en_mantenimiento', 'fuera_servicio', 'no_apto');--> statement-breakpoint
CREATE TYPE "public"."operacion_sync" AS ENUM('upsert', 'delete');--> statement-breakpoint
CREATE TYPE "public"."origen_asignacion" AS ENUM('supervisor', 'autoasignada');--> statement-breakpoint
CREATE TYPE "public"."proposito_media" AS ENUM('hallazgo', 'firma_operador', 'foto_horometro', 'evidencia');--> statement-breakpoint
CREATE TYPE "public"."rol_usuario" AS ENUM('admin', 'supervisor', 'operador');--> statement-breakpoint
CREATE TABLE "asignaciones" (
	"id" text PRIMARY KEY NOT NULL,
	"vehiculo_id" text NOT NULL,
	"usuario_id" text NOT NULL,
	"obra_id" text,
	"desde" timestamp with time zone NOT NULL,
	"hasta" timestamp with time zone,
	"origen" "origen_asignacion" DEFAULT 'supervisor' NOT NULL,
	"confirmada_en" timestamp with time zone,
	"confirmada_por" text,
	"eliminado_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bitacoras" (
	"id" text PRIMARY KEY NOT NULL,
	"vehiculo_id" text NOT NULL,
	"usuario_id" text NOT NULL,
	"obra_id" text,
	"operador_id" text,
	"preoperacional_id" text,
	"fecha" date NOT NULL,
	"horometro_inicial" integer,
	"horometro_final" integer,
	"actividades" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"cerrada_en" timestamp with time zone,
	"recibido_en" timestamp with time zone DEFAULT now() NOT NULL,
	"anulado_en" timestamp with time zone,
	"anulado_por" text,
	"motivo_anulacion" text,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "codigos_activacion" (
	"id" text PRIMARY KEY NOT NULL,
	"usuario_id" text NOT NULL,
	"hash" text NOT NULL,
	"expira_en" timestamp with time zone NOT NULL,
	"usado_en" timestamp with time zone,
	"intentos" integer DEFAULT 0 NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credenciales_web" (
	"usuario_id" text PRIMARY KEY NOT NULL,
	"hash" text NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dispositivos" (
	"id" text PRIMARY KEY NOT NULL,
	"usuario_id" text NOT NULL,
	"identificador_equipo" text NOT NULL,
	"etiqueta" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"ultima_vista_en" timestamp with time zone,
	"revocado_en" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "intentos_acceso" (
	"id" text PRIMARY KEY NOT NULL,
	"identidad" text NOT NULL,
	"superficie" text NOT NULL,
	"exito" boolean NOT NULL,
	"ocurrido_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" text PRIMARY KEY NOT NULL,
	"dueno_tipo" "dueno_media" NOT NULL,
	"dueno_id" text NOT NULL,
	"proposito" "proposito_media" NOT NULL,
	"item_key" text,
	"mime" text DEFAULT 'image/jpeg' NOT NULL,
	"bytes" integer,
	"sha256" text,
	"clave_r2" text,
	"subido_en" timestamp with time zone,
	"recibido_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "obras" (
	"id" text PRIMARY KEY NOT NULL,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"municipio" text,
	"activa" boolean DEFAULT true NOT NULL,
	"eliminado_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operaciones_idempotentes" (
	"clave" text PRIMARY KEY NOT NULL,
	"entidad" text NOT NULL,
	"entidad_id" text NOT NULL,
	"operacion" "operacion_sync" DEFAULT 'upsert' NOT NULL,
	"respuesta" jsonb,
	"procesado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plantillas" (
	"id" text PRIMARY KEY NOT NULL,
	"tipo_vehiculo_id" text NOT NULL,
	"version" integer NOT NULL,
	"hash" text NOT NULL,
	"esquema" jsonb NOT NULL,
	"publicada_en" timestamp with time zone,
	"eliminado_en" timestamp with time zone,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "preoperacionales" (
	"id" text PRIMARY KEY NOT NULL,
	"vehiculo_id" text NOT NULL,
	"usuario_id" text NOT NULL,
	"obra_id" text,
	"plantilla_tipo_vehiculo" text NOT NULL,
	"plantilla_version" integer NOT NULL,
	"plantilla_hash" text NOT NULL,
	"periodicidades" jsonb NOT NULL,
	"iniciado_en" timestamp with time zone NOT NULL,
	"enviado_en" timestamp with time zone,
	"odometro_km" integer,
	"horometro_h" integer,
	"respuestas" jsonb NOT NULL,
	"resultado" text,
	"cantidad_inmovilizantes" integer DEFAULT 0 NOT NULL,
	"observaciones" text,
	"firma_operador_media_id" text,
	"foto_horometro_media_id" text,
	"desfase_reloj_ms" bigint DEFAULT 0 NOT NULL,
	"recibido_en" timestamp with time zone DEFAULT now() NOT NULL,
	"anulado_en" timestamp with time zone,
	"anulado_por" text,
	"motivo_anulacion" text,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sesiones_web" (
	"id" text PRIMARY KEY NOT NULL,
	"usuario_id" text NOT NULL,
	"hash_cookie" text NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"expira_en" timestamp with time zone NOT NULL,
	"revocado_en" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "tipos_vehiculo" (
	"id" text PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"clase_medidor" "clase_medidor" NOT NULL,
	"eliminado_en" timestamp with time zone,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" text PRIMARY KEY NOT NULL,
	"usuario" text NOT NULL,
	"nombre_completo" text NOT NULL,
	"documento" text,
	"rol" "rol_usuario" DEFAULT 'operador' NOT NULL,
	"obra_id" text,
	"activo" boolean DEFAULT true NOT NULL,
	"eliminado_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehiculos" (
	"id" text PRIMARY KEY NOT NULL,
	"codigo_interno" text NOT NULL,
	"placa" text,
	"tipo_vehiculo_id" text NOT NULL,
	"marca" text,
	"modelo" text,
	"obra_id" text,
	"odometro_km" integer,
	"horometro_h" integer,
	"medidor_actualizado_en" timestamp with time zone,
	"estado" "estado_vehiculo" DEFAULT 'operativo' NOT NULL,
	"eliminado_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "asignaciones" ADD CONSTRAINT "asignaciones_vehiculo_id_vehiculos_id_fk" FOREIGN KEY ("vehiculo_id") REFERENCES "public"."vehiculos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asignaciones" ADD CONSTRAINT "asignaciones_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asignaciones" ADD CONSTRAINT "asignaciones_obra_id_obras_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asignaciones" ADD CONSTRAINT "asignaciones_confirmada_por_usuarios_id_fk" FOREIGN KEY ("confirmada_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bitacoras" ADD CONSTRAINT "bitacoras_vehiculo_id_vehiculos_id_fk" FOREIGN KEY ("vehiculo_id") REFERENCES "public"."vehiculos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bitacoras" ADD CONSTRAINT "bitacoras_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bitacoras" ADD CONSTRAINT "bitacoras_obra_id_obras_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bitacoras" ADD CONSTRAINT "bitacoras_operador_id_usuarios_id_fk" FOREIGN KEY ("operador_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bitacoras" ADD CONSTRAINT "bitacoras_preoperacional_id_preoperacionales_id_fk" FOREIGN KEY ("preoperacional_id") REFERENCES "public"."preoperacionales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bitacoras" ADD CONSTRAINT "bitacoras_anulado_por_usuarios_id_fk" FOREIGN KEY ("anulado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "codigos_activacion" ADD CONSTRAINT "codigos_activacion_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credenciales_web" ADD CONSTRAINT "credenciales_web_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispositivos" ADD CONSTRAINT "dispositivos_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plantillas" ADD CONSTRAINT "plantillas_tipo_vehiculo_id_tipos_vehiculo_id_fk" FOREIGN KEY ("tipo_vehiculo_id") REFERENCES "public"."tipos_vehiculo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preoperacionales" ADD CONSTRAINT "preoperacionales_vehiculo_id_vehiculos_id_fk" FOREIGN KEY ("vehiculo_id") REFERENCES "public"."vehiculos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preoperacionales" ADD CONSTRAINT "preoperacionales_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preoperacionales" ADD CONSTRAINT "preoperacionales_obra_id_obras_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preoperacionales" ADD CONSTRAINT "preoperacionales_anulado_por_usuarios_id_fk" FOREIGN KEY ("anulado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sesiones_web" ADD CONSTRAINT "sesiones_web_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_obra_id_obras_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehiculos" ADD CONSTRAINT "vehiculos_tipo_vehiculo_id_tipos_vehiculo_id_fk" FOREIGN KEY ("tipo_vehiculo_id") REFERENCES "public"."tipos_vehiculo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehiculos" ADD CONSTRAINT "vehiculos_obra_id_obras_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_asignaciones_usuario" ON "asignaciones" USING btree ("usuario_id","hasta");--> statement-breakpoint
CREATE INDEX "ix_asignaciones_vehiculo" ON "asignaciones" USING btree ("vehiculo_id","hasta");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_bitacora_vehiculo_fecha" ON "bitacoras" USING btree ("vehiculo_id","fecha");--> statement-breakpoint
CREATE INDEX "ix_bitacora_obra_fecha" ON "bitacoras" USING btree ("obra_id","fecha");--> statement-breakpoint
CREATE INDEX "ix_codigos_usuario" ON "codigos_activacion" USING btree ("usuario_id","usado_en");--> statement-breakpoint
CREATE INDEX "ix_dispositivos_usuario" ON "dispositivos" USING btree ("usuario_id","revocado_en");--> statement-breakpoint
CREATE INDEX "ix_intentos_identidad" ON "intentos_acceso" USING btree ("identidad","ocurrido_en");--> statement-breakpoint
CREATE INDEX "ix_media_dueno" ON "media" USING btree ("dueno_tipo","dueno_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_obras_codigo" ON "obras" USING btree ("codigo") WHERE eliminado_en is null;--> statement-breakpoint
CREATE UNIQUE INDEX "ux_plantilla_tipo_version" ON "plantillas" USING btree ("tipo_vehiculo_id","version");--> statement-breakpoint
CREATE INDEX "ix_preop_vehiculo" ON "preoperacionales" USING btree ("vehiculo_id","iniciado_en");--> statement-breakpoint
CREATE INDEX "ix_preop_obra" ON "preoperacionales" USING btree ("obra_id","iniciado_en");--> statement-breakpoint
CREATE INDEX "ix_preop_usuario" ON "preoperacionales" USING btree ("usuario_id","iniciado_en");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_sesiones_hash" ON "sesiones_web" USING btree ("hash_cookie");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_usuarios_usuario" ON "usuarios" USING btree ("usuario") WHERE eliminado_en is null;--> statement-breakpoint
CREATE INDEX "ix_usuarios_obra" ON "usuarios" USING btree ("obra_id");--> statement-breakpoint
CREATE INDEX "ix_vehiculos_tipo" ON "vehiculos" USING btree ("tipo_vehiculo_id");--> statement-breakpoint
CREATE INDEX "ix_vehiculos_obra" ON "vehiculos" USING btree ("obra_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_vehiculos_codigo" ON "vehiculos" USING btree ("codigo_interno") WHERE eliminado_en is null;