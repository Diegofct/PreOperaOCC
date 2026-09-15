CREATE TYPE "public"."tipo_movimiento_almacen" AS ENUM('ingreso', 'salida');--> statement-breakpoint
CREATE TABLE "almacen_materiales" (
	"id" text PRIMARY KEY NOT NULL,
	"obra_id" text NOT NULL,
	"nombre" text NOT NULL,
	"nombre_normalizado" text NOT NULL,
	"unidad" text NOT NULL,
	"creado_por" text NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"eliminado_en" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "almacen_movimientos" (
	"id" text PRIMARY KEY NOT NULL,
	"obra_id" text NOT NULL,
	"material_id" text NOT NULL,
	"tipo" "tipo_movimiento_almacen" NOT NULL,
	"fecha" date NOT NULL,
	"cantidad" numeric(14, 2) NOT NULL,
	"para_que" text,
	"observacion" text,
	"registrado_por" text NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"anulado_en" timestamp with time zone,
	"anulado_por" text,
	"motivo_anulacion" text,
	CONSTRAINT "ck_almacen_movimiento_cantidad" CHECK ("almacen_movimientos"."cantidad" > 0)
);
--> statement-breakpoint
ALTER TABLE "almacen_materiales" ADD CONSTRAINT "almacen_materiales_obra_id_obras_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "almacen_materiales" ADD CONSTRAINT "almacen_materiales_creado_por_usuarios_id_fk" FOREIGN KEY ("creado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "almacen_movimientos" ADD CONSTRAINT "almacen_movimientos_obra_id_obras_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "almacen_movimientos" ADD CONSTRAINT "almacen_movimientos_material_id_almacen_materiales_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."almacen_materiales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "almacen_movimientos" ADD CONSTRAINT "almacen_movimientos_registrado_por_usuarios_id_fk" FOREIGN KEY ("registrado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "almacen_movimientos" ADD CONSTRAINT "almacen_movimientos_anulado_por_usuarios_id_fk" FOREIGN KEY ("anulado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ux_almacen_material_nombre" ON "almacen_materiales" USING btree ("obra_id","nombre_normalizado") WHERE eliminado_en is null;--> statement-breakpoint
CREATE INDEX "ix_almacen_movimiento_material" ON "almacen_movimientos" USING btree ("material_id");--> statement-breakpoint
CREATE INDEX "ix_almacen_movimiento_obra_fecha" ON "almacen_movimientos" USING btree ("obra_id","fecha");