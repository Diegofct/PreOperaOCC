CREATE TYPE "public"."clase_con_intervalo" AS ENUM('aceite', 'preventivo');--> statement-breakpoint
CREATE TYPE "public"."clase_mantenimiento" AS ENUM('aceite', 'preventivo', 'correctivo');--> statement-breakpoint
CREATE TYPE "public"."origen_mantenimiento" AS ENUM('panel', 'whatsapp');--> statement-breakpoint
CREATE TABLE "mantenimiento_intervalos" (
	"tipo_vehiculo_id" text NOT NULL,
	"clase" "clase_con_intervalo" NOT NULL,
	"cada" double precision NOT NULL,
	"aviso_porcentaje" integer DEFAULT 90 NOT NULL,
	"actualizado_por" text,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mantenimiento_intervalos_tipo_vehiculo_id_clase_pk" PRIMARY KEY("tipo_vehiculo_id","clase"),
	CONSTRAINT "ck_mantenimiento_intervalo" CHECK ("mantenimiento_intervalos"."cada" > 0 and "mantenimiento_intervalos"."aviso_porcentaje" between 50 and 99)
);
--> statement-breakpoint
CREATE TABLE "mantenimiento_intervalos_vehiculo" (
	"vehiculo_id" text NOT NULL,
	"clase" "clase_con_intervalo" NOT NULL,
	"cada" double precision NOT NULL,
	"aviso_porcentaje" integer DEFAULT 90 NOT NULL,
	"actualizado_por" text,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mantenimiento_intervalos_vehiculo_vehiculo_id_clase_pk" PRIMARY KEY("vehiculo_id","clase"),
	CONSTRAINT "ck_mantenimiento_intervalo_vehiculo" CHECK ("mantenimiento_intervalos_vehiculo"."cada" > 0 and "mantenimiento_intervalos_vehiculo"."aviso_porcentaje" between 50 and 99)
);
--> statement-breakpoint
CREATE TABLE "mantenimientos" (
	"id" text PRIMARY KEY NOT NULL,
	"vehiculo_id" text NOT NULL,
	"obra_id" text,
	"clase" "clase_mantenimiento" NOT NULL,
	"fecha" date NOT NULL,
	"lectura" double precision,
	"nota" text DEFAULT '' NOT NULL,
	"origen" "origen_mantenimiento" NOT NULL,
	"mensaje_id" text,
	"registrado_por" text NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"resuelto_en" date,
	"resuelto_por" text,
	"nota_resuelto" text,
	"anulado_en" timestamp with time zone,
	"anulado_por" text,
	"motivo_anulacion" text,
	CONSTRAINT "ck_mantenimiento_anulacion" CHECK ("mantenimientos"."anulado_en" is null
       or ("mantenimientos"."motivo_anulacion" is not null and length(trim("mantenimientos"."motivo_anulacion")) > 0)),
	CONSTRAINT "ck_mantenimiento_resuelto" CHECK ("mantenimientos"."resuelto_en" is null or "mantenimientos"."clase" = 'correctivo'),
	CONSTRAINT "ck_mantenimiento_origen" CHECK (("mantenimientos"."origen" = 'whatsapp') = ("mantenimientos"."mensaje_id" is not null))
);
--> statement-breakpoint
ALTER TABLE "mantenimiento_intervalos" ADD CONSTRAINT "mantenimiento_intervalos_tipo_vehiculo_id_tipos_vehiculo_id_fk" FOREIGN KEY ("tipo_vehiculo_id") REFERENCES "public"."tipos_vehiculo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mantenimiento_intervalos" ADD CONSTRAINT "mantenimiento_intervalos_actualizado_por_usuarios_id_fk" FOREIGN KEY ("actualizado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mantenimiento_intervalos_vehiculo" ADD CONSTRAINT "mantenimiento_intervalos_vehiculo_vehiculo_id_vehiculos_id_fk" FOREIGN KEY ("vehiculo_id") REFERENCES "public"."vehiculos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mantenimiento_intervalos_vehiculo" ADD CONSTRAINT "mantenimiento_intervalos_vehiculo_actualizado_por_usuarios_id_fk" FOREIGN KEY ("actualizado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mantenimientos" ADD CONSTRAINT "mantenimientos_vehiculo_id_vehiculos_id_fk" FOREIGN KEY ("vehiculo_id") REFERENCES "public"."vehiculos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mantenimientos" ADD CONSTRAINT "mantenimientos_obra_id_obras_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mantenimientos" ADD CONSTRAINT "mantenimientos_mensaje_id_whatsapp_mensajes_id_fk" FOREIGN KEY ("mensaje_id") REFERENCES "public"."whatsapp_mensajes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mantenimientos" ADD CONSTRAINT "mantenimientos_registrado_por_usuarios_id_fk" FOREIGN KEY ("registrado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mantenimientos" ADD CONSTRAINT "mantenimientos_resuelto_por_usuarios_id_fk" FOREIGN KEY ("resuelto_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mantenimientos" ADD CONSTRAINT "mantenimientos_anulado_por_usuarios_id_fk" FOREIGN KEY ("anulado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_mantenimiento_vehiculo" ON "mantenimientos" USING btree ("vehiculo_id","clase","fecha");--> statement-breakpoint
CREATE INDEX "ix_mantenimiento_obra" ON "mantenimientos" USING btree ("obra_id","fecha");