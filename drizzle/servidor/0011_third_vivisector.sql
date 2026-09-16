CREATE TYPE "public"."tipo_sitio_cantera" AS ENUM('cantera', 'planta', 'otro');--> statement-breakpoint
CREATE TABLE "cantera_materiales" (
	"id" text PRIMARY KEY NOT NULL,
	"obra_id" text NOT NULL,
	"nombre" text NOT NULL,
	"nombre_normalizado" text NOT NULL,
	"creado_por" text NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"eliminado_en" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "cantera_sitios" (
	"id" text PRIMARY KEY NOT NULL,
	"obra_id" text NOT NULL,
	"nombre" text NOT NULL,
	"nombre_normalizado" text NOT NULL,
	"tipo" "tipo_sitio_cantera" NOT NULL,
	"creado_por" text NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"eliminado_en" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "cantera_viajes" (
	"id" text PRIMARY KEY NOT NULL,
	"obra_id" text NOT NULL,
	"fecha" date NOT NULL,
	"hora" text NOT NULL,
	"material_id" text NOT NULL,
	"vehiculo_id" text NOT NULL,
	"conductor_id" text NOT NULL,
	"origen_id" text NOT NULL,
	"destino_id" text,
	"destino_obra" boolean NOT NULL,
	"pr" integer,
	"metros" integer,
	"registrado_por" text NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"anulado_en" timestamp with time zone,
	"anulado_por" text,
	"motivo_anulacion" text,
	CONSTRAINT "ck_cantera_viaje_destino" CHECK (("cantera_viajes"."destino_obra" and "cantera_viajes"."destino_id" is null
            and "cantera_viajes"."pr" is not null and "cantera_viajes"."metros" is not null
            and "cantera_viajes"."pr" between 0 and 25
            and "cantera_viajes"."metros" between 0 and 975 and "cantera_viajes"."metros" % 25 = 0)
       or (not "cantera_viajes"."destino_obra" and "cantera_viajes"."destino_id" is not null
            and "cantera_viajes"."pr" is null and "cantera_viajes"."metros" is null)),
	CONSTRAINT "ck_cantera_viaje_origen_destino" CHECK ("cantera_viajes"."destino_id" is null or "cantera_viajes"."destino_id" <> "cantera_viajes"."origen_id"),
	CONSTRAINT "ck_cantera_viaje_hora" CHECK ("cantera_viajes"."hora" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
);
--> statement-breakpoint
ALTER TABLE "partes_de_obra" ADD COLUMN "cantera" jsonb;--> statement-breakpoint
ALTER TABLE "cantera_materiales" ADD CONSTRAINT "cantera_materiales_obra_id_obras_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cantera_materiales" ADD CONSTRAINT "cantera_materiales_creado_por_usuarios_id_fk" FOREIGN KEY ("creado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cantera_sitios" ADD CONSTRAINT "cantera_sitios_obra_id_obras_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cantera_sitios" ADD CONSTRAINT "cantera_sitios_creado_por_usuarios_id_fk" FOREIGN KEY ("creado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cantera_viajes" ADD CONSTRAINT "cantera_viajes_obra_id_obras_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cantera_viajes" ADD CONSTRAINT "cantera_viajes_material_id_cantera_materiales_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."cantera_materiales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cantera_viajes" ADD CONSTRAINT "cantera_viajes_vehiculo_id_vehiculos_id_fk" FOREIGN KEY ("vehiculo_id") REFERENCES "public"."vehiculos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cantera_viajes" ADD CONSTRAINT "cantera_viajes_conductor_id_usuarios_id_fk" FOREIGN KEY ("conductor_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cantera_viajes" ADD CONSTRAINT "cantera_viajes_origen_id_cantera_sitios_id_fk" FOREIGN KEY ("origen_id") REFERENCES "public"."cantera_sitios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cantera_viajes" ADD CONSTRAINT "cantera_viajes_destino_id_cantera_sitios_id_fk" FOREIGN KEY ("destino_id") REFERENCES "public"."cantera_sitios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cantera_viajes" ADD CONSTRAINT "cantera_viajes_registrado_por_usuarios_id_fk" FOREIGN KEY ("registrado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cantera_viajes" ADD CONSTRAINT "cantera_viajes_anulado_por_usuarios_id_fk" FOREIGN KEY ("anulado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ux_cantera_material_nombre" ON "cantera_materiales" USING btree ("obra_id","nombre_normalizado") WHERE eliminado_en is null;--> statement-breakpoint
CREATE UNIQUE INDEX "ux_cantera_sitio_nombre" ON "cantera_sitios" USING btree ("obra_id","nombre_normalizado") WHERE eliminado_en is null;--> statement-breakpoint
CREATE INDEX "ix_cantera_viaje_obra_fecha" ON "cantera_viajes" USING btree ("obra_id","fecha");