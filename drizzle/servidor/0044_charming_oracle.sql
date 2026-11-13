CREATE TYPE "public"."estado_importacion_almacen" AS ENUM('en_curso', 'lista', 'fallida', 'confirmada', 'descartada');--> statement-breakpoint
ALTER TYPE "public"."dueno_media" ADD VALUE 'almacen';--> statement-breakpoint
CREATE TABLE "almacen_importaciones" (
	"id" text PRIMARY KEY NOT NULL,
	"obra_id" text NOT NULL,
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
	CONSTRAINT "ck_almacen_importacion_confirmada" CHECK (("almacen_importaciones"."estado" = 'confirmada') = ("almacen_importaciones"."confirmada_en" is not null)),
	CONSTRAINT "ck_almacen_importacion_descartada" CHECK (("almacen_importaciones"."estado" = 'descartada') = ("almacen_importaciones"."descartada_en" is not null))
);
--> statement-breakpoint
ALTER TABLE "almacen_movimientos" ADD COLUMN "proveedor" text;--> statement-breakpoint
ALTER TABLE "almacen_movimientos" ADD COLUMN "documento_tipo" text;--> statement-breakpoint
ALTER TABLE "almacen_movimientos" ADD COLUMN "documento_numero" text;--> statement-breakpoint
ALTER TABLE "almacen_movimientos" ADD COLUMN "documento_clave" text;--> statement-breakpoint
ALTER TABLE "almacen_movimientos" ADD COLUMN "valor_unitario" numeric(16, 2);--> statement-breakpoint
ALTER TABLE "almacen_movimientos" ADD COLUMN "valor_unidad" text;--> statement-breakpoint
ALTER TABLE "almacen_movimientos" ADD COLUMN "importacion_id" text;--> statement-breakpoint
ALTER TABLE "almacen_importaciones" ADD CONSTRAINT "almacen_importaciones_obra_id_obras_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "almacen_importaciones" ADD CONSTRAINT "almacen_importaciones_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "almacen_importaciones" ADD CONSTRAINT "almacen_importaciones_creado_por_usuarios_id_fk" FOREIGN KEY ("creado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "almacen_importaciones" ADD CONSTRAINT "almacen_importaciones_confirmada_por_usuarios_id_fk" FOREIGN KEY ("confirmada_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_almacen_importacion_pendientes" ON "almacen_importaciones" USING btree ("obra_id","creado_por","estado");--> statement-breakpoint
ALTER TABLE "almacen_movimientos" ADD CONSTRAINT "almacen_movimientos_importacion_id_almacen_importaciones_id_fk" FOREIGN KEY ("importacion_id") REFERENCES "public"."almacen_importaciones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_almacen_movimiento_documento" ON "almacen_movimientos" USING btree ("obra_id","documento_clave");--> statement-breakpoint
ALTER TABLE "almacen_movimientos" ADD CONSTRAINT "ck_almacen_movimiento_documento_tipo" CHECK ("almacen_movimientos"."documento_tipo" is null or "almacen_movimientos"."documento_tipo" in ('factura', 'remision', 'otro'));