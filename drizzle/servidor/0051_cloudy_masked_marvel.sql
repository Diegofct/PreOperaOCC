CREATE TYPE "public"."estado_lectura_drive" AS ENUM('pendiente', 'leyendo', 'leido', 'no_se_pudo');--> statement-breakpoint
ALTER TYPE "public"."dueno_media" ADD VALUE 'drive';--> statement-breakpoint
CREATE TABLE "drive_archivos" (
	"id" text PRIMARY KEY NOT NULL,
	"carpeta_id" text NOT NULL,
	"drive_id" text NOT NULL,
	"enlace" text,
	"nombre" text NOT NULL,
	"subcarpeta" text DEFAULT '' NOT NULL,
	"mime" text NOT NULL,
	"retirado_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drive_carpetas" (
	"id" text PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"obra_id" text,
	"asociado_por" text,
	"asociado_en" timestamp with time zone,
	"ultima_entrega_en" timestamp with time zone,
	"archivos_en_la_ultima_entrega" integer,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drive_fragmentos" (
	"id" text PRIMARY KEY NOT NULL,
	"version_id" text NOT NULL,
	"orden" integer NOT NULL,
	"pagina" integer NOT NULL,
	"texto" text NOT NULL,
	"buscable" "tsvector" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drive_versiones" (
	"id" text PRIMARY KEY NOT NULL,
	"archivo_id" text NOT NULL,
	"modificado_en_drive" timestamp with time zone NOT NULL,
	"media_id" text,
	"bytes" bigint,
	"estado" "estado_lectura_drive" DEFAULT 'pendiente' NOT NULL,
	"motivo" text,
	"intentos" integer DEFAULT 0 NOT NULL,
	"leyendo_desde" timestamp with time zone,
	"resumen" text,
	"paginas" integer,
	"tokens_entrada" integer DEFAULT 0 NOT NULL,
	"tokens_salida" integer DEFAULT 0 NOT NULL,
	"leido_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_drive_version_intentos" CHECK ("drive_versiones"."intentos" >= 0),
	CONSTRAINT "ck_drive_version_tokens" CHECK ("drive_versiones"."tokens_entrada" >= 0 and "drive_versiones"."tokens_salida" >= 0)
);
--> statement-breakpoint
ALTER TABLE "drive_archivos" ADD CONSTRAINT "drive_archivos_carpeta_id_drive_carpetas_id_fk" FOREIGN KEY ("carpeta_id") REFERENCES "public"."drive_carpetas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drive_carpetas" ADD CONSTRAINT "drive_carpetas_obra_id_obras_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drive_carpetas" ADD CONSTRAINT "drive_carpetas_asociado_por_usuarios_id_fk" FOREIGN KEY ("asociado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drive_fragmentos" ADD CONSTRAINT "drive_fragmentos_version_id_drive_versiones_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."drive_versiones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drive_versiones" ADD CONSTRAINT "drive_versiones_archivo_id_drive_archivos_id_fk" FOREIGN KEY ("archivo_id") REFERENCES "public"."drive_archivos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drive_versiones" ADD CONSTRAINT "drive_versiones_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ux_drive_archivo" ON "drive_archivos" USING btree ("carpeta_id","drive_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_drive_carpeta_obra" ON "drive_carpetas" USING btree ("obra_id") WHERE obra_id is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "ux_drive_fragmento" ON "drive_fragmentos" USING btree ("version_id","orden");--> statement-breakpoint
CREATE INDEX "ix_drive_fragmento_buscable" ON "drive_fragmentos" USING gin ("buscable");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_drive_version" ON "drive_versiones" USING btree ("archivo_id","modificado_en_drive");--> statement-breakpoint
CREATE INDEX "ix_drive_version_estado" ON "drive_versiones" USING btree ("estado");