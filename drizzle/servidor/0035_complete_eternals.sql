CREATE TYPE "public"."estado_solicitud_compra" AS ENUM('enviada', 'devuelta', 'aprobada', 'comprada', 'recibida_en_parte', 'recibida', 'rechazada', 'cancelada');--> statement-breakpoint
CREATE TABLE "compra_renglones" (
	"compra_id" text NOT NULL,
	"renglon_id" text NOT NULL,
	CONSTRAINT "compra_renglones_compra_id_renglon_id_pk" PRIMARY KEY("compra_id","renglon_id")
);
--> statement-breakpoint
CREATE TABLE "compras" (
	"id" text PRIMARY KEY NOT NULL,
	"solicitud_id" text NOT NULL,
	"proveedor" text NOT NULL,
	"valor" bigint NOT NULL,
	"fecha" date NOT NULL,
	"factura" text DEFAULT '' NOT NULL,
	"registrada_por" text NOT NULL,
	"registrada_en" timestamp with time zone DEFAULT now() NOT NULL,
	"anulada_en" timestamp with time zone,
	"anulada_por" text,
	"motivo_anulacion" text,
	CONSTRAINT "ck_compra_valor" CHECK ("compras"."valor" > 0),
	CONSTRAINT "ck_compra_proveedor" CHECK (length(trim("compras"."proveedor")) > 0),
	CONSTRAINT "ck_compra_anulada" CHECK (("compras"."anulada_en" is null) = ("compras"."motivo_anulacion" is null)
       and ("compras"."motivo_anulacion" is null or length(trim("compras"."motivo_anulacion")) > 0))
);
--> statement-breakpoint
CREATE TABLE "recepciones_compra" (
	"id" text PRIMARY KEY NOT NULL,
	"solicitud_id" text NOT NULL,
	"renglon_id" text NOT NULL,
	"cantidad" numeric(14, 2) NOT NULL,
	"fecha" date NOT NULL,
	"nota" text DEFAULT '' NOT NULL,
	"documento_id" text,
	"por" text NOT NULL,
	"en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_recepcion_compra_cantidad" CHECK ("recepciones_compra"."cantidad" > 0)
);
--> statement-breakpoint
CREATE TABLE "solicitud_compra_eventos" (
	"id" text PRIMARY KEY NOT NULL,
	"solicitud_id" text NOT NULL,
	"paso" text NOT NULL,
	"motivo" text,
	"cambios" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"por" text NOT NULL,
	"en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "solicitud_compra_renglones" (
	"id" text PRIMARY KEY NOT NULL,
	"solicitud_id" text NOT NULL,
	"orden" integer NOT NULL,
	"descripcion" text NOT NULL,
	"material_id" text,
	"cantidad" numeric(14, 2) NOT NULL,
	"cantidad_aprobada" numeric(14, 2),
	"unidad" text NOT NULL,
	CONSTRAINT "ck_solicitud_compra_renglon_cantidad" CHECK ("solicitud_compra_renglones"."cantidad" > 0),
	CONSTRAINT "ck_solicitud_compra_renglon_aprobada" CHECK ("solicitud_compra_renglones"."cantidad_aprobada" is null or ("solicitud_compra_renglones"."cantidad_aprobada" >= 0 and "solicitud_compra_renglones"."cantidad_aprobada" <= "solicitud_compra_renglones"."cantidad")),
	CONSTRAINT "ck_solicitud_compra_renglon_descripcion" CHECK (length(trim("solicitud_compra_renglones"."descripcion")) > 0)
);
--> statement-breakpoint
CREATE TABLE "solicitudes_compra" (
	"id" text PRIMARY KEY NOT NULL,
	"numero" integer GENERATED ALWAYS AS IDENTITY (sequence name "solicitudes_compra_numero_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"empresa_id" text,
	"obra_id" text,
	"estado" "estado_solicitud_compra" DEFAULT 'enviada' NOT NULL,
	"para_cuando" date NOT NULL,
	"urgente" boolean DEFAULT false NOT NULL,
	"para_que" text DEFAULT '' NOT NULL,
	"proveedor_sugerido" text DEFAULT '' NOT NULL,
	"valor_estimado" bigint,
	"pedida_por" text NOT NULL,
	"pedida_en" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"actualizada_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_solicitud_compra_lugar" CHECK ((("solicitudes_compra"."empresa_id" is not null)::int + ("solicitudes_compra"."obra_id" is not null)::int) = 1
       and ("solicitudes_compra"."empresa_id" is null or "solicitudes_compra"."empresa_id" in ('occ', 'geolab'))),
	CONSTRAINT "ck_solicitud_compra_valor" CHECK ("solicitudes_compra"."valor_estimado" is null or "solicitudes_compra"."valor_estimado" > 0)
);
--> statement-breakpoint
ALTER TABLE "documentos_del_grupo" DROP CONSTRAINT "ck_documento_grupo_dueno";--> statement-breakpoint
ALTER TABLE "documentos_del_grupo" ADD COLUMN "solicitud_id" text;--> statement-breakpoint
ALTER TABLE "compra_renglones" ADD CONSTRAINT "compra_renglones_compra_id_compras_id_fk" FOREIGN KEY ("compra_id") REFERENCES "public"."compras"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compra_renglones" ADD CONSTRAINT "compra_renglones_renglon_id_solicitud_compra_renglones_id_fk" FOREIGN KEY ("renglon_id") REFERENCES "public"."solicitud_compra_renglones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compras" ADD CONSTRAINT "compras_solicitud_id_solicitudes_compra_id_fk" FOREIGN KEY ("solicitud_id") REFERENCES "public"."solicitudes_compra"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compras" ADD CONSTRAINT "compras_registrada_por_usuarios_id_fk" FOREIGN KEY ("registrada_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compras" ADD CONSTRAINT "compras_anulada_por_usuarios_id_fk" FOREIGN KEY ("anulada_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recepciones_compra" ADD CONSTRAINT "recepciones_compra_solicitud_id_solicitudes_compra_id_fk" FOREIGN KEY ("solicitud_id") REFERENCES "public"."solicitudes_compra"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recepciones_compra" ADD CONSTRAINT "recepciones_compra_renglon_id_solicitud_compra_renglones_id_fk" FOREIGN KEY ("renglon_id") REFERENCES "public"."solicitud_compra_renglones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recepciones_compra" ADD CONSTRAINT "recepciones_compra_documento_id_documentos_del_grupo_id_fk" FOREIGN KEY ("documento_id") REFERENCES "public"."documentos_del_grupo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recepciones_compra" ADD CONSTRAINT "recepciones_compra_por_usuarios_id_fk" FOREIGN KEY ("por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitud_compra_eventos" ADD CONSTRAINT "solicitud_compra_eventos_solicitud_id_solicitudes_compra_id_fk" FOREIGN KEY ("solicitud_id") REFERENCES "public"."solicitudes_compra"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitud_compra_eventos" ADD CONSTRAINT "solicitud_compra_eventos_por_usuarios_id_fk" FOREIGN KEY ("por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitud_compra_renglones" ADD CONSTRAINT "solicitud_compra_renglones_solicitud_id_solicitudes_compra_id_fk" FOREIGN KEY ("solicitud_id") REFERENCES "public"."solicitudes_compra"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitud_compra_renglones" ADD CONSTRAINT "solicitud_compra_renglones_material_id_almacen_materiales_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."almacen_materiales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitudes_compra" ADD CONSTRAINT "solicitudes_compra_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitudes_compra" ADD CONSTRAINT "solicitudes_compra_obra_id_obras_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitudes_compra" ADD CONSTRAINT "solicitudes_compra_pedida_por_usuarios_id_fk" FOREIGN KEY ("pedida_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_compra_renglones_renglon" ON "compra_renglones" USING btree ("renglon_id");--> statement-breakpoint
CREATE INDEX "ix_compras_solicitud" ON "compras" USING btree ("solicitud_id");--> statement-breakpoint
CREATE INDEX "ix_compras_fecha" ON "compras" USING btree ("fecha");--> statement-breakpoint
CREATE INDEX "ix_recepciones_compra_solicitud" ON "recepciones_compra" USING btree ("solicitud_id");--> statement-breakpoint
CREATE INDEX "ix_solicitud_compra_eventos" ON "solicitud_compra_eventos" USING btree ("solicitud_id","en");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_solicitud_compra_renglon_orden" ON "solicitud_compra_renglones" USING btree ("solicitud_id","orden");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_solicitud_compra_numero" ON "solicitudes_compra" USING btree ("numero");--> statement-breakpoint
CREATE INDEX "ix_solicitud_compra_obra" ON "solicitudes_compra" USING btree ("obra_id","estado");--> statement-breakpoint
CREATE INDEX "ix_solicitud_compra_empresa" ON "solicitudes_compra" USING btree ("empresa_id","estado");--> statement-breakpoint
CREATE INDEX "ix_solicitud_compra_bandeja" ON "solicitudes_compra" USING btree ("estado","urgente","para_cuando");--> statement-breakpoint
ALTER TABLE "documentos_del_grupo" ADD CONSTRAINT "documentos_del_grupo_solicitud_id_solicitudes_compra_id_fk" FOREIGN KEY ("solicitud_id") REFERENCES "public"."solicitudes_compra"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_documento_grupo_solicitud" ON "documentos_del_grupo" USING btree ("solicitud_id","fecha");--> statement-breakpoint
ALTER TABLE "documentos_del_grupo" ADD CONSTRAINT "ck_documento_grupo_dueno" CHECK ((("documentos_del_grupo"."empresa_id" is not null)::int + ("documentos_del_grupo"."obra_id" is not null)::int + ("documentos_del_grupo"."persona_id" is not null)::int
         + ("documentos_del_grupo"."solicitud_id" is not null)::int) = 1
       and ("documentos_del_grupo"."empresa_id" is null or "documentos_del_grupo"."empresa_id" <> 'proyectos'));