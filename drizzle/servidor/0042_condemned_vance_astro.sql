CREATE TYPE "public"."estado_lectura_planificacion" AS ENUM('en_curso', 'lista', 'falta_grupo', 'fallida');--> statement-breakpoint
CREATE TYPE "public"."estado_planificacion" AS ENUM('borrador', 'vigente', 'reemplazada', 'anulada', 'descartada');--> statement-breakpoint
ALTER TYPE "public"."dueno_media" ADD VALUE 'planificacion';--> statement-breakpoint
ALTER TYPE "public"."proposito_media" ADD VALUE 'planificacion_excel';--> statement-breakpoint
CREATE TABLE "planificacion_lecturas" (
	"id" text PRIMARY KEY NOT NULL,
	"obra_id" text NOT NULL,
	"planificacion_id" text NOT NULL,
	"estado" "estado_lectura_planificacion" DEFAULT 'en_curso' NOT NULL,
	"error" text,
	"candidatos" jsonb,
	"vence_en" timestamp with time zone NOT NULL,
	"creado_por" text NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "planificacion_lecturas_ia" (
	"llave" text PRIMARY KEY NOT NULL,
	"lectura" jsonb NOT NULL,
	"modelo" text NOT NULL,
	"tokens_entrada" integer NOT NULL,
	"tokens_salida" integer NOT NULL,
	"creado_por" text NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "planificaciones" (
	"id" text PRIMARY KEY NOT NULL,
	"obra_id" text NOT NULL,
	"numero_version" integer NOT NULL,
	"estado" "estado_planificacion" DEFAULT 'borrador' NOT NULL,
	"estructura" jsonb NOT NULL,
	"hallazgos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"resumen" jsonb NOT NULL,
	"rechazados" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"huella" text NOT NULL,
	"hojas" jsonb NOT NULL,
	"media_id" text NOT NULL,
	"presupuesto_id" text NOT NULL,
	"presupuesto_version" integer NOT NULL,
	"rige_desde" date,
	"rige_hasta" date,
	"meses_cumplidos" jsonb DEFAULT '[]'::jsonb NOT NULL,
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
	CONSTRAINT "ck_planificacion_anulada" CHECK (("planificaciones"."estado" = 'anulada') = ("planificaciones"."anulado_en" is not null)
       and ("planificaciones"."anulado_en" is null or ("planificaciones"."motivo_anulacion" is not null and length(trim("planificaciones"."motivo_anulacion")) > 0))),
	CONSTRAINT "ck_planificacion_descartada" CHECK (("planificaciones"."estado" = 'descartada') = ("planificaciones"."descartado_en" is not null)),
	CONSTRAINT "ck_planificacion_aprobada" CHECK ("planificaciones"."estado" not in ('vigente', 'reemplazada', 'anulada') or ("planificaciones"."aprobado_en" is not null and "planificaciones"."rige_desde" is not null))
);
--> statement-breakpoint
ALTER TABLE "planificacion_lecturas" ADD CONSTRAINT "planificacion_lecturas_obra_id_obras_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planificacion_lecturas" ADD CONSTRAINT "planificacion_lecturas_creado_por_usuarios_id_fk" FOREIGN KEY ("creado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planificacion_lecturas_ia" ADD CONSTRAINT "planificacion_lecturas_ia_creado_por_usuarios_id_fk" FOREIGN KEY ("creado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planificaciones" ADD CONSTRAINT "planificaciones_obra_id_obras_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planificaciones" ADD CONSTRAINT "planificaciones_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planificaciones" ADD CONSTRAINT "planificaciones_presupuesto_id_presupuestos_id_fk" FOREIGN KEY ("presupuesto_id") REFERENCES "public"."presupuestos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planificaciones" ADD CONSTRAINT "planificaciones_aprobado_por_usuarios_id_fk" FOREIGN KEY ("aprobado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planificaciones" ADD CONSTRAINT "planificaciones_anulado_por_usuarios_id_fk" FOREIGN KEY ("anulado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planificaciones" ADD CONSTRAINT "planificaciones_descartado_por_usuarios_id_fk" FOREIGN KEY ("descartado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planificaciones" ADD CONSTRAINT "planificaciones_creado_por_usuarios_id_fk" FOREIGN KEY ("creado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planificaciones" ADD CONSTRAINT "planificaciones_actualizado_por_usuarios_id_fk" FOREIGN KEY ("actualizado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ux_planificacion_lectura_en_curso" ON "planificacion_lecturas" USING btree ("obra_id") WHERE estado = 'en_curso';--> statement-breakpoint
CREATE UNIQUE INDEX "ux_planificacion_vigente" ON "planificaciones" USING btree ("obra_id") WHERE estado = 'vigente';--> statement-breakpoint
CREATE UNIQUE INDEX "ux_planificacion_borrador" ON "planificaciones" USING btree ("obra_id") WHERE estado = 'borrador';--> statement-breakpoint
CREATE UNIQUE INDEX "ux_planificacion_version" ON "planificaciones" USING btree ("obra_id","numero_version") WHERE estado <> 'descartada';