CREATE TABLE "llantas" (
	"id" text PRIMARY KEY NOT NULL,
	"vehiculo_id" text NOT NULL,
	"posicion" text NOT NULL,
	"marca" text,
	"rin" integer,
	"ancho" integer,
	"alto" integer,
	"porcentaje_desgaste" integer,
	"retirada_en" timestamp with time zone,
	"motivo_retiro" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "llantas" ADD CONSTRAINT "llantas_vehiculo_id_vehiculos_id_fk" FOREIGN KEY ("vehiculo_id") REFERENCES "public"."vehiculos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_llantas_vehiculo" ON "llantas" USING btree ("vehiculo_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_llantas_posicion" ON "llantas" USING btree ("vehiculo_id","posicion") WHERE retirada_en is null;