CREATE TYPE "public"."estado_ensayo" AS ENUM('borrador', 'enviado', 'devuelto', 'aprobado');--> statement-breakpoint
CREATE TABLE "ensayos_granulometria" (
	"id" text PRIMARY KEY NOT NULL,
	"obra_id" text NOT NULL,
	"material" text,
	"fuente" text,
	"localizacion" text,
	"numero_informe" text,
	"clave_informe" text,
	"fecha_recepcion" date,
	"fecha_ejecucion" date,
	"franja_id" text,
	"franja" jsonb,
	"masas" jsonb DEFAULT '{"humeda":null,"seca":null,"tara":null,"lavada":null}'::jsonb NOT NULL,
	"retenidos" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"observaciones" text,
	"resultado" jsonb,
	"veredicto" text,
	"estado" "estado_ensayo" DEFAULT 'borrador' NOT NULL,
	"registrado_por" text NOT NULL,
	"revisado_por" text,
	"revisado_en" timestamp with time zone,
	"aprobado_por" text,
	"aprobado_en" timestamp with time zone,
	"comentario_devolucion" text,
	"descartado_en" timestamp with time zone,
	"anulado_en" timestamp with time zone,
	"anulado_por" text,
	"motivo_anulacion" text,
	"historia" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_ensayo_granulometria_veredicto" CHECK ("ensayos_granulometria"."veredicto" is null or "ensayos_granulometria"."veredicto" in ('cumple', 'no_cumple')),
	CONSTRAINT "ck_ensayo_granulometria_anulado" CHECK ("ensayos_granulometria"."anulado_en" is null
       or ("ensayos_granulometria"."estado" = 'aprobado' and "ensayos_granulometria"."anulado_por" is not null
           and "ensayos_granulometria"."motivo_anulacion" is not null and btrim("ensayos_granulometria"."motivo_anulacion") <> '')),
	CONSTRAINT "ck_ensayo_granulometria_descartado" CHECK ("ensayos_granulometria"."descartado_en" is null or "ensayos_granulometria"."estado" in ('borrador', 'devuelto')),
	CONSTRAINT "ck_ensayo_granulometria_firmas" CHECK (("ensayos_granulometria"."estado" not in ('enviado', 'aprobado') or "ensayos_granulometria"."revisado_por" is not null)
       and ("ensayos_granulometria"."estado" <> 'aprobado' or ("ensayos_granulometria"."aprobado_por" is not null and "ensayos_granulometria"."aprobado_en" is not null))
       and ("ensayos_granulometria"."estado" <> 'devuelto' or "ensayos_granulometria"."comentario_devolucion" is not null))
);
--> statement-breakpoint
ALTER TABLE "partes_de_obra" ADD COLUMN "granulometrias" jsonb;--> statement-breakpoint
ALTER TABLE "ensayos_granulometria" ADD CONSTRAINT "ensayos_granulometria_obra_id_obras_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ensayos_granulometria" ADD CONSTRAINT "ensayos_granulometria_registrado_por_usuarios_id_fk" FOREIGN KEY ("registrado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ensayos_granulometria" ADD CONSTRAINT "ensayos_granulometria_revisado_por_usuarios_id_fk" FOREIGN KEY ("revisado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ensayos_granulometria" ADD CONSTRAINT "ensayos_granulometria_aprobado_por_usuarios_id_fk" FOREIGN KEY ("aprobado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ensayos_granulometria" ADD CONSTRAINT "ensayos_granulometria_anulado_por_usuarios_id_fk" FOREIGN KEY ("anulado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ux_ensayo_granulometria_informe" ON "ensayos_granulometria" USING btree ("obra_id","clave_informe") WHERE anulado_en is null and descartado_en is null and clave_informe is not null;--> statement-breakpoint
CREATE INDEX "ix_ensayo_granulometria_obra_fecha" ON "ensayos_granulometria" USING btree ("obra_id","fecha_ejecucion");