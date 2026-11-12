CREATE TYPE "public"."estado_lectura_plan_semanal" AS ENUM('en_curso', 'lista', 'fallida');--> statement-breakpoint
CREATE TYPE "public"."estado_plan_semanal" AS ENUM('borrador', 'vigente', 'anulado', 'descartado');--> statement-breakpoint
CREATE TYPE "public"."origen_plan_semanal" AS ENUM('ia', 'excel', 'manual');--> statement-breakpoint
CREATE TYPE "public"."tipo_lectura_plan_semanal" AS ENUM('propuesta', 'excel');--> statement-breakpoint
CREATE TABLE "plan_semanal_lecturas" (
	"id" text PRIMARY KEY NOT NULL,
	"obra_id" text NOT NULL,
	"semana" date NOT NULL,
	"tipo" "tipo_lectura_plan_semanal" NOT NULL,
	"estado" "estado_lectura_plan_semanal" DEFAULT 'en_curso' NOT NULL,
	"plan_id" text NOT NULL,
	"error" text,
	"vence_en" timestamp with time zone NOT NULL,
	"creado_por" text NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "planes_semanales" (
	"id" text PRIMARY KEY NOT NULL,
	"obra_id" text NOT NULL,
	"semana" date NOT NULL,
	"estado" "estado_plan_semanal" DEFAULT 'borrador' NOT NULL,
	"origen" "origen_plan_semanal" NOT NULL,
	"estructura" jsonb NOT NULL,
	"rechazados" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"diferencias_excel" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"planificacion_id" text NOT NULL,
	"rige_desde" date,
	"rige_hasta" date,
	"aprobado_en" timestamp with time zone,
	"aprobado_por" text,
	"anulado_en" timestamp with time zone,
	"anulado_por" text,
	"motivo_anulacion" text,
	"descartado_en" timestamp with time zone,
	"descartado_por" text,
	"version" integer DEFAULT 0 NOT NULL,
	"creado_por" text NOT NULL,
	"actualizado_por" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_plan_semanal_anulado" CHECK (("planes_semanales"."estado" = 'anulado') = ("planes_semanales"."anulado_en" is not null)
       and ("planes_semanales"."anulado_en" is null or ("planes_semanales"."motivo_anulacion" is not null and length(trim("planes_semanales"."motivo_anulacion")) > 0))),
	CONSTRAINT "ck_plan_semanal_descartado" CHECK (("planes_semanales"."estado" = 'descartado') = ("planes_semanales"."descartado_en" is not null)),
	CONSTRAINT "ck_plan_semanal_aprobado" CHECK ("planes_semanales"."estado" not in ('vigente', 'anulado') or ("planes_semanales"."aprobado_en" is not null and "planes_semanales"."rige_desde" is not null))
);
--> statement-breakpoint
ALTER TABLE "plan_semanal_lecturas" ADD CONSTRAINT "plan_semanal_lecturas_obra_id_obras_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_semanal_lecturas" ADD CONSTRAINT "plan_semanal_lecturas_creado_por_usuarios_id_fk" FOREIGN KEY ("creado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planes_semanales" ADD CONSTRAINT "planes_semanales_obra_id_obras_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planes_semanales" ADD CONSTRAINT "planes_semanales_planificacion_id_planificaciones_id_fk" FOREIGN KEY ("planificacion_id") REFERENCES "public"."planificaciones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planes_semanales" ADD CONSTRAINT "planes_semanales_aprobado_por_usuarios_id_fk" FOREIGN KEY ("aprobado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planes_semanales" ADD CONSTRAINT "planes_semanales_anulado_por_usuarios_id_fk" FOREIGN KEY ("anulado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planes_semanales" ADD CONSTRAINT "planes_semanales_descartado_por_usuarios_id_fk" FOREIGN KEY ("descartado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planes_semanales" ADD CONSTRAINT "planes_semanales_creado_por_usuarios_id_fk" FOREIGN KEY ("creado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planes_semanales" ADD CONSTRAINT "planes_semanales_actualizado_por_usuarios_id_fk" FOREIGN KEY ("actualizado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ux_plan_semanal_lectura_en_curso" ON "plan_semanal_lecturas" USING btree ("obra_id","semana") WHERE estado = 'en_curso';--> statement-breakpoint
CREATE UNIQUE INDEX "ux_plan_semanal_borrador" ON "planes_semanales" USING btree ("obra_id","semana") WHERE estado = 'borrador';--> statement-breakpoint
CREATE UNIQUE INDEX "ux_plan_semanal_vigente" ON "planes_semanales" USING btree ("obra_id","semana") WHERE estado = 'vigente';