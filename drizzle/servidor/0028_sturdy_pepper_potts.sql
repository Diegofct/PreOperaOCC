CREATE TYPE "public"."accion_contrato" AS ENUM('guardado', 'aprobado', 'a_borrador');--> statement-breakpoint
CREATE TYPE "public"."estado_contrato" AS ENUM('borrador', 'aprobado');--> statement-breakpoint
CREATE TYPE "public"."estado_poliza_registro" AS ENUM('activa', 'reemplazada', 'anulada');--> statement-breakpoint
CREATE TYPE "public"."estado_presupuesto" AS ENUM('borrador', 'vigente', 'reemplazado', 'descartado');--> statement-breakpoint
CREATE TYPE "public"."origen_presupuesto" AS ENUM('excel', 'blanco', 'copia');--> statement-breakpoint
ALTER TYPE "public"."dueno_media" ADD VALUE 'contrato';--> statement-breakpoint
CREATE TABLE "contrato_documentos" (
	"id" text PRIMARY KEY NOT NULL,
	"contrato_id" text NOT NULL,
	"clase" text NOT NULL,
	"fecha" date NOT NULL,
	"descripcion" text DEFAULT '' NOT NULL,
	"media_id" text NOT NULL,
	"anulado_en" timestamp with time zone,
	"anulado_por" text,
	"motivo_anulacion" text,
	"subido_por" text NOT NULL,
	"subido_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_documento_anulacion" CHECK ("contrato_documentos"."anulado_en" is null
       or ("contrato_documentos"."motivo_anulacion" is not null and length(trim("contrato_documentos"."motivo_anulacion")) > 0))
);
--> statement-breakpoint
CREATE TABLE "contrato_eventos" (
	"id" text PRIMARY KEY NOT NULL,
	"contrato_id" text NOT NULL,
	"accion" "accion_contrato" NOT NULL,
	"motivo" text,
	"usuario_id" text NOT NULL,
	"en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_contrato_evento_motivo" CHECK ("contrato_eventos"."accion" <> 'a_borrador' or ("contrato_eventos"."motivo" is not null and length(trim("contrato_eventos"."motivo")) > 0))
);
--> statement-breakpoint
CREATE TABLE "contrato_polizas" (
	"id" text PRIMARY KEY NOT NULL,
	"contrato_id" text NOT NULL,
	"amparo" text NOT NULL,
	"aseguradora" text NOT NULL,
	"numero" text NOT NULL,
	"valor" bigint,
	"desde" date NOT NULL,
	"hasta" date NOT NULL,
	"media_id" text,
	"estado" "estado_poliza_registro" DEFAULT 'activa' NOT NULL,
	"reemplazada_por" text,
	"anulada_en" timestamp with time zone,
	"anulada_por" text,
	"motivo_anulacion" text,
	"creada_por" text NOT NULL,
	"creada_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_poliza_vigencia" CHECK ("contrato_polizas"."hasta" >= "contrato_polizas"."desde"),
	CONSTRAINT "ck_poliza_anulada" CHECK (("contrato_polizas"."estado" = 'anulada') = ("contrato_polizas"."anulada_en" is not null)
       and ("contrato_polizas"."anulada_en" is null or ("contrato_polizas"."motivo_anulacion" is not null and length(trim("contrato_polizas"."motivo_anulacion")) > 0))),
	CONSTRAINT "ck_poliza_reemplazada" CHECK (("contrato_polizas"."estado" = 'reemplazada') = ("contrato_polizas"."reemplazada_por" is not null))
);
--> statement-breakpoint
CREATE TABLE "contratos" (
	"id" text PRIMARY KEY NOT NULL,
	"obra_id" text NOT NULL,
	"estado" "estado_contrato" DEFAULT 'borrador' NOT NULL,
	"contratante_nombre" text DEFAULT '' NOT NULL,
	"contratante_nit" text DEFAULT '' NOT NULL,
	"contratante_direccion" text DEFAULT '' NOT NULL,
	"contratante_ciudad" text DEFAULT '' NOT NULL,
	"contratante_correo" text DEFAULT '' NOT NULL,
	"contratante_telefono" text DEFAULT '' NOT NULL,
	"representante_nombre" text DEFAULT '' NOT NULL,
	"representante_identificacion" text DEFAULT '' NOT NULL,
	"es_consorcio" boolean DEFAULT false NOT NULL,
	"nombre_consorcio" text DEFAULT '' NOT NULL,
	"integrantes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tipo" text,
	"numero" text DEFAULT '' NOT NULL,
	"objeto" text DEFAULT '' NOT NULL,
	"fecha_inicio" date,
	"fecha_fin" date,
	"plazo_dias" integer,
	"valor" bigint,
	"anticipo_porcentaje" numeric(5, 2),
	"retencion_porcentaje" numeric(5, 2),
	"impuestos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"aprobado_en" timestamp with time zone,
	"aprobado_por" text,
	"actualizado_por" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_contrato_porcentajes" CHECK (("contratos"."anticipo_porcentaje" is null or "contratos"."anticipo_porcentaje" between 0 and 100)
       and ("contratos"."retencion_porcentaje" is null or "contratos"."retencion_porcentaje" between 0 and 100)),
	CONSTRAINT "ck_contrato_fechas" CHECK ("contratos"."fecha_inicio" is null or "contratos"."fecha_fin" is null or "contratos"."fecha_fin" >= "contratos"."fecha_inicio"),
	CONSTRAINT "ck_contrato_aprobado" CHECK ("contratos"."estado" = 'borrador' or "contratos"."aprobado_en" is not null)
);
--> statement-breakpoint
CREATE TABLE "presupuestos" (
	"id" text PRIMARY KEY NOT NULL,
	"obra_id" text NOT NULL,
	"nombre" text NOT NULL,
	"numero_version" integer NOT NULL,
	"nota_version" text DEFAULT '' NOT NULL,
	"estado" "estado_presupuesto" DEFAULT 'borrador' NOT NULL,
	"estructura" jsonb NOT NULL,
	"valor" bigint DEFAULT 0 NOT NULL,
	"valor_excel" bigint,
	"revisar" boolean DEFAULT false NOT NULL,
	"origen" "origen_presupuesto" NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"aprobado_en" timestamp with time zone,
	"aprobado_por" text,
	"descartado_en" timestamp with time zone,
	"descartado_por" text,
	"motivo_descarte" text,
	"creado_por" text NOT NULL,
	"actualizado_por" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_presupuesto_descarte" CHECK (("presupuestos"."estado" = 'descartado') = ("presupuestos"."descartado_en" is not null)
       and ("presupuestos"."descartado_en" is null or ("presupuestos"."motivo_descarte" is not null and length(trim("presupuestos"."motivo_descarte")) > 0))),
	CONSTRAINT "ck_presupuesto_aprobado" CHECK ("presupuestos"."estado" not in ('vigente', 'reemplazado') or "presupuestos"."aprobado_en" is not null)
);
--> statement-breakpoint
ALTER TABLE "contrato_documentos" ADD CONSTRAINT "contrato_documentos_contrato_id_contratos_id_fk" FOREIGN KEY ("contrato_id") REFERENCES "public"."contratos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contrato_documentos" ADD CONSTRAINT "contrato_documentos_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contrato_documentos" ADD CONSTRAINT "contrato_documentos_anulado_por_usuarios_id_fk" FOREIGN KEY ("anulado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contrato_documentos" ADD CONSTRAINT "contrato_documentos_subido_por_usuarios_id_fk" FOREIGN KEY ("subido_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contrato_eventos" ADD CONSTRAINT "contrato_eventos_contrato_id_contratos_id_fk" FOREIGN KEY ("contrato_id") REFERENCES "public"."contratos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contrato_eventos" ADD CONSTRAINT "contrato_eventos_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contrato_polizas" ADD CONSTRAINT "contrato_polizas_contrato_id_contratos_id_fk" FOREIGN KEY ("contrato_id") REFERENCES "public"."contratos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contrato_polizas" ADD CONSTRAINT "contrato_polizas_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contrato_polizas" ADD CONSTRAINT "contrato_polizas_reemplazada_por_contrato_polizas_id_fk" FOREIGN KEY ("reemplazada_por") REFERENCES "public"."contrato_polizas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contrato_polizas" ADD CONSTRAINT "contrato_polizas_anulada_por_usuarios_id_fk" FOREIGN KEY ("anulada_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contrato_polizas" ADD CONSTRAINT "contrato_polizas_creada_por_usuarios_id_fk" FOREIGN KEY ("creada_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_obra_id_obras_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_aprobado_por_usuarios_id_fk" FOREIGN KEY ("aprobado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_actualizado_por_usuarios_id_fk" FOREIGN KEY ("actualizado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "presupuestos" ADD CONSTRAINT "presupuestos_obra_id_obras_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "presupuestos" ADD CONSTRAINT "presupuestos_aprobado_por_usuarios_id_fk" FOREIGN KEY ("aprobado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "presupuestos" ADD CONSTRAINT "presupuestos_descartado_por_usuarios_id_fk" FOREIGN KEY ("descartado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "presupuestos" ADD CONSTRAINT "presupuestos_creado_por_usuarios_id_fk" FOREIGN KEY ("creado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "presupuestos" ADD CONSTRAINT "presupuestos_actualizado_por_usuarios_id_fk" FOREIGN KEY ("actualizado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_contrato_documentos" ON "contrato_documentos" USING btree ("contrato_id","fecha");--> statement-breakpoint
CREATE INDEX "ix_contrato_eventos" ON "contrato_eventos" USING btree ("contrato_id","en");--> statement-breakpoint
CREATE INDEX "ix_contrato_polizas" ON "contrato_polizas" USING btree ("contrato_id","hasta");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_contrato_obra" ON "contratos" USING btree ("obra_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_presupuesto_version" ON "presupuestos" USING btree ("obra_id","numero_version");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_presupuesto_vigente" ON "presupuestos" USING btree ("obra_id") WHERE estado = 'vigente';--> statement-breakpoint
CREATE UNIQUE INDEX "ux_presupuesto_borrador" ON "presupuestos" USING btree ("obra_id") WHERE estado = 'borrador';