CREATE TYPE "public"."estado_requisicion_occ" AS ENUM('borrador', 'en_autorizacion', 'devuelta', 'autorizada', 'pagada_en_parte', 'pagada', 'no_autorizada', 'cancelada');--> statement-breakpoint
ALTER TYPE "public"."dueno_media" ADD VALUE 'requisicion_occ';--> statement-breakpoint
CREATE TABLE "requisicion_occ_eventos" (
	"id" text PRIMARY KEY NOT NULL,
	"requisicion_id" text NOT NULL,
	"paso" text NOT NULL,
	"motivo" text,
	"cambios" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"por" text NOT NULL,
	"en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "requisicion_occ_importaciones" (
	"id" text PRIMARY KEY NOT NULL,
	"requisicion_id" text,
	"media_id" text NOT NULL,
	"nombre_archivo" text NOT NULL,
	"estado" "estado_importacion_almacen" DEFAULT 'en_curso' NOT NULL,
	"error" text,
	"propuesta" jsonb,
	"version" integer DEFAULT 1 NOT NULL,
	"vence_lectura_en" timestamp with time zone NOT NULL,
	"vence_propuesta_en" timestamp with time zone,
	"creado_por" text NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"confirmada_en" timestamp with time zone,
	"confirmada_por" text,
	"descartada_en" timestamp with time zone,
	CONSTRAINT "ck_requisicion_occ_importacion_confirmada" CHECK (("requisicion_occ_importaciones"."estado" = 'confirmada') = ("requisicion_occ_importaciones"."confirmada_en" is not null)),
	CONSTRAINT "ck_requisicion_occ_importacion_descartada" CHECK (("requisicion_occ_importaciones"."estado" = 'descartada') = ("requisicion_occ_importaciones"."descartada_en" is not null))
);
--> statement-breakpoint
CREATE TABLE "requisicion_occ_lineas" (
	"id" text PRIMARY KEY NOT NULL,
	"requisicion_id" text NOT NULL,
	"orden" integer NOT NULL,
	"fecha_solicitud" date NOT NULL,
	"beneficiario" text NOT NULL,
	"concepto" text NOT NULL,
	"especificaciones" text DEFAULT '' NOT NULL,
	"proveedor" text DEFAULT '' NOT NULL,
	"valor" bigint NOT NULL,
	"observaciones" text DEFAULT '' NOT NULL,
	"rut_media_id" text,
	"cuenta_media_id" text,
	"respuesta" text,
	"motivo_respuesta" text,
	"respondida_por" text,
	"respondida_en" timestamp with time zone,
	"quitada_en" timestamp with time zone,
	"quitada_por" text,
	"reemplazada_en" timestamp with time zone,
	"reemplazada_por_linea" text,
	"creada_por" text NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_requisicion_occ_linea_valor" CHECK ("requisicion_occ_lineas"."valor" > 0),
	CONSTRAINT "ck_requisicion_occ_linea_textos" CHECK (length(trim("requisicion_occ_lineas"."beneficiario")) > 0 and length(trim("requisicion_occ_lineas"."concepto")) > 0),
	CONSTRAINT "ck_requisicion_occ_linea_respuesta" CHECK (("requisicion_occ_lineas"."respuesta" is null or "requisicion_occ_lineas"."respuesta" in ('autorizada', 'no_autorizada'))
       and (("requisicion_occ_lineas"."respuesta" is null) = ("requisicion_occ_lineas"."respondida_en" is null))
       and ("requisicion_occ_lineas"."respuesta" is distinct from 'no_autorizada' or length(trim(coalesce("requisicion_occ_lineas"."motivo_respuesta", ''))) > 0)),
	CONSTRAINT "ck_requisicion_occ_linea_baja" CHECK ("requisicion_occ_lineas"."quitada_en" is null or "requisicion_occ_lineas"."reemplazada_en" is null)
);
--> statement-breakpoint
CREATE TABLE "requisiciones_occ" (
	"id" text PRIMARY KEY NOT NULL,
	"numero_requisicion" integer NOT NULL,
	"viernes" date NOT NULL,
	"estado" "estado_requisicion_occ" DEFAULT 'borrador' NOT NULL,
	"elaborada_por" text NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"enviada_en" timestamp with time zone,
	"ronda" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"actualizada_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_requisicion_occ_viernes" CHECK (extract(isodow from "requisiciones_occ"."viernes") = 5)
);
--> statement-breakpoint
ALTER TABLE "pagos" DROP CONSTRAINT "ck_pago_dueno";--> statement-breakpoint
ALTER TABLE "pagos" ADD COLUMN "requisicion_occ_linea_id" text;--> statement-breakpoint
ALTER TABLE "requisicion_occ_eventos" ADD CONSTRAINT "requisicion_occ_eventos_requisicion_id_requisiciones_occ_id_fk" FOREIGN KEY ("requisicion_id") REFERENCES "public"."requisiciones_occ"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requisicion_occ_eventos" ADD CONSTRAINT "requisicion_occ_eventos_por_usuarios_id_fk" FOREIGN KEY ("por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requisicion_occ_importaciones" ADD CONSTRAINT "requisicion_occ_importaciones_requisicion_id_requisiciones_occ_id_fk" FOREIGN KEY ("requisicion_id") REFERENCES "public"."requisiciones_occ"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requisicion_occ_importaciones" ADD CONSTRAINT "requisicion_occ_importaciones_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requisicion_occ_importaciones" ADD CONSTRAINT "requisicion_occ_importaciones_creado_por_usuarios_id_fk" FOREIGN KEY ("creado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requisicion_occ_importaciones" ADD CONSTRAINT "requisicion_occ_importaciones_confirmada_por_usuarios_id_fk" FOREIGN KEY ("confirmada_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requisicion_occ_lineas" ADD CONSTRAINT "requisicion_occ_lineas_requisicion_id_requisiciones_occ_id_fk" FOREIGN KEY ("requisicion_id") REFERENCES "public"."requisiciones_occ"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requisicion_occ_lineas" ADD CONSTRAINT "requisicion_occ_lineas_rut_media_id_media_id_fk" FOREIGN KEY ("rut_media_id") REFERENCES "public"."media"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requisicion_occ_lineas" ADD CONSTRAINT "requisicion_occ_lineas_cuenta_media_id_media_id_fk" FOREIGN KEY ("cuenta_media_id") REFERENCES "public"."media"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requisicion_occ_lineas" ADD CONSTRAINT "requisicion_occ_lineas_respondida_por_usuarios_id_fk" FOREIGN KEY ("respondida_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requisicion_occ_lineas" ADD CONSTRAINT "requisicion_occ_lineas_quitada_por_usuarios_id_fk" FOREIGN KEY ("quitada_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requisicion_occ_lineas" ADD CONSTRAINT "requisicion_occ_lineas_reemplazada_por_linea_requisicion_occ_lineas_id_fk" FOREIGN KEY ("reemplazada_por_linea") REFERENCES "public"."requisicion_occ_lineas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requisicion_occ_lineas" ADD CONSTRAINT "requisicion_occ_lineas_creada_por_usuarios_id_fk" FOREIGN KEY ("creada_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requisiciones_occ" ADD CONSTRAINT "requisiciones_occ_elaborada_por_usuarios_id_fk" FOREIGN KEY ("elaborada_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_requisicion_occ_eventos" ON "requisicion_occ_eventos" USING btree ("requisicion_id","en");--> statement-breakpoint
CREATE INDEX "ix_requisicion_occ_importacion_pendientes" ON "requisicion_occ_importaciones" USING btree ("creado_por","estado");--> statement-breakpoint
CREATE INDEX "ix_requisicion_occ_importacion_requisicion" ON "requisicion_occ_importaciones" USING btree ("requisicion_id");--> statement-breakpoint
CREATE INDEX "ix_requisicion_occ_lineas" ON "requisicion_occ_lineas" USING btree ("requisicion_id","orden");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_requisicion_occ_numero" ON "requisiciones_occ" USING btree ("numero_requisicion");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_requisicion_occ_viernes_abierta" ON "requisiciones_occ" USING btree ("viernes") WHERE "requisiciones_occ"."estado" not in ('pagada', 'no_autorizada', 'cancelada');--> statement-breakpoint
CREATE INDEX "ix_requisicion_occ_estado" ON "requisiciones_occ" USING btree ("estado","viernes");--> statement-breakpoint
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_requisicion_occ_linea_id_requisicion_occ_lineas_id_fk" FOREIGN KEY ("requisicion_occ_linea_id") REFERENCES "public"."requisicion_occ_lineas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_pagos_requisicion_occ_linea" ON "pagos" USING btree ("requisicion_occ_linea_id");--> statement-breakpoint
ALTER TABLE "pagos" ADD CONSTRAINT "ck_pago_dueno" CHECK ((("pagos"."solicitud_pago_id" is not null)::int + ("pagos"."compra_id" is not null)::int
         + ("pagos"."requisicion_occ_linea_id" is not null)::int) = 1);