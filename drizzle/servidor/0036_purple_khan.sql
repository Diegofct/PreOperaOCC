CREATE TYPE "public"."estado_solicitud_pago" AS ENUM('enviada', 'devuelta', 'aprobada', 'pagada_en_parte', 'pagada', 'rechazada', 'cancelada');--> statement-breakpoint
CREATE TABLE "pagos" (
	"id" text PRIMARY KEY NOT NULL,
	"solicitud_pago_id" text,
	"compra_id" text,
	"fecha" date NOT NULL,
	"valor" bigint NOT NULL,
	"medio" text NOT NULL,
	"referencia" text DEFAULT '' NOT NULL,
	"documento_id" text,
	"registrado_por" text NOT NULL,
	"registrado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"anulado_en" timestamp with time zone,
	"anulado_por" text,
	"motivo_anulacion" text,
	CONSTRAINT "ck_pago_dueno" CHECK ((("pagos"."solicitud_pago_id" is not null)::int + ("pagos"."compra_id" is not null)::int) = 1),
	CONSTRAINT "ck_pago_valor" CHECK ("pagos"."valor" > 0),
	CONSTRAINT "ck_pago_medio" CHECK ("pagos"."medio" in ('transferencia', 'consignacion', 'cheque', 'efectivo')),
	CONSTRAINT "ck_pago_anulado" CHECK (("pagos"."anulado_en" is null) = ("pagos"."motivo_anulacion" is null)
       and ("pagos"."motivo_anulacion" is null or length(trim("pagos"."motivo_anulacion")) > 0))
);
--> statement-breakpoint
CREATE TABLE "solicitud_pago_eventos" (
	"id" text PRIMARY KEY NOT NULL,
	"solicitud_pago_id" text NOT NULL,
	"paso" text NOT NULL,
	"motivo" text,
	"cambios" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"por" text NOT NULL,
	"en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "solicitudes_pago" (
	"id" text PRIMARY KEY NOT NULL,
	"numero" integer GENERATED ALWAYS AS IDENTITY (sequence name "solicitudes_pago_numero_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"empresa_id" text,
	"obra_id" text,
	"estado" "estado_solicitud_pago" DEFAULT 'enviada' NOT NULL,
	"beneficiario" text NOT NULL,
	"beneficiario_documento" text DEFAULT '' NOT NULL,
	"concepto" text NOT NULL,
	"para_que" text NOT NULL,
	"valor" bigint NOT NULL,
	"valor_aprobado" bigint,
	"para_cuando" date NOT NULL,
	"urgente" boolean DEFAULT false NOT NULL,
	"pedida_por" text NOT NULL,
	"pedida_en" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"actualizada_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_solicitud_pago_lugar" CHECK ((("solicitudes_pago"."empresa_id" is not null)::int + ("solicitudes_pago"."obra_id" is not null)::int) = 1
       and ("solicitudes_pago"."empresa_id" is null or "solicitudes_pago"."empresa_id" in ('occ', 'geolab'))),
	CONSTRAINT "ck_solicitud_pago_concepto" CHECK ("solicitudes_pago"."concepto" in ('proveedor', 'anticipo', 'alquiler', 'transporte', 'servicios', 'caja_menor', 'viaticos', 'otro')),
	CONSTRAINT "ck_solicitud_pago_valor" CHECK ("solicitudes_pago"."valor" > 0),
	CONSTRAINT "ck_solicitud_pago_aprobado" CHECK ("solicitudes_pago"."valor_aprobado" is null or ("solicitudes_pago"."valor_aprobado" > 0 and "solicitudes_pago"."valor_aprobado" <= "solicitudes_pago"."valor")),
	CONSTRAINT "ck_solicitud_pago_beneficiario" CHECK (length(trim("solicitudes_pago"."beneficiario")) > 0)
);
--> statement-breakpoint
ALTER TABLE "documentos_del_grupo" DROP CONSTRAINT "ck_documento_grupo_dueno";--> statement-breakpoint
ALTER TABLE "documentos_del_grupo" ADD COLUMN "solicitud_pago_id" text;--> statement-breakpoint
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_solicitud_pago_id_solicitudes_pago_id_fk" FOREIGN KEY ("solicitud_pago_id") REFERENCES "public"."solicitudes_pago"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_compra_id_compras_id_fk" FOREIGN KEY ("compra_id") REFERENCES "public"."compras"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_documento_id_documentos_del_grupo_id_fk" FOREIGN KEY ("documento_id") REFERENCES "public"."documentos_del_grupo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_registrado_por_usuarios_id_fk" FOREIGN KEY ("registrado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_anulado_por_usuarios_id_fk" FOREIGN KEY ("anulado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitud_pago_eventos" ADD CONSTRAINT "solicitud_pago_eventos_solicitud_pago_id_solicitudes_pago_id_fk" FOREIGN KEY ("solicitud_pago_id") REFERENCES "public"."solicitudes_pago"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitud_pago_eventos" ADD CONSTRAINT "solicitud_pago_eventos_por_usuarios_id_fk" FOREIGN KEY ("por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitudes_pago" ADD CONSTRAINT "solicitudes_pago_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitudes_pago" ADD CONSTRAINT "solicitudes_pago_obra_id_obras_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitudes_pago" ADD CONSTRAINT "solicitudes_pago_pedida_por_usuarios_id_fk" FOREIGN KEY ("pedida_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_pagos_solicitud" ON "pagos" USING btree ("solicitud_pago_id");--> statement-breakpoint
CREATE INDEX "ix_pagos_compra" ON "pagos" USING btree ("compra_id");--> statement-breakpoint
CREATE INDEX "ix_pagos_fecha" ON "pagos" USING btree ("fecha");--> statement-breakpoint
CREATE INDEX "ix_solicitud_pago_eventos" ON "solicitud_pago_eventos" USING btree ("solicitud_pago_id","en");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_solicitud_pago_numero" ON "solicitudes_pago" USING btree ("numero");--> statement-breakpoint
CREATE INDEX "ix_solicitud_pago_obra" ON "solicitudes_pago" USING btree ("obra_id","estado");--> statement-breakpoint
CREATE INDEX "ix_solicitud_pago_empresa" ON "solicitudes_pago" USING btree ("empresa_id","estado");--> statement-breakpoint
CREATE INDEX "ix_solicitud_pago_bandeja" ON "solicitudes_pago" USING btree ("estado","urgente","para_cuando");--> statement-breakpoint
ALTER TABLE "documentos_del_grupo" ADD CONSTRAINT "documentos_del_grupo_solicitud_pago_id_solicitudes_pago_id_fk" FOREIGN KEY ("solicitud_pago_id") REFERENCES "public"."solicitudes_pago"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_documento_grupo_solicitud_pago" ON "documentos_del_grupo" USING btree ("solicitud_pago_id","fecha");--> statement-breakpoint
ALTER TABLE "documentos_del_grupo" ADD CONSTRAINT "ck_documento_grupo_dueno" CHECK ((("documentos_del_grupo"."empresa_id" is not null)::int + ("documentos_del_grupo"."obra_id" is not null)::int + ("documentos_del_grupo"."persona_id" is not null)::int
         + ("documentos_del_grupo"."solicitud_id" is not null)::int + ("documentos_del_grupo"."solicitud_pago_id" is not null)::int) = 1
       and ("documentos_del_grupo"."empresa_id" is null or "documentos_del_grupo"."empresa_id" <> 'proyectos'));