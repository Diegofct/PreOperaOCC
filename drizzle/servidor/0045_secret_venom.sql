CREATE TYPE "public"."origen_planificacion" AS ENUM('excel', 'presupuesto', 'copia');--> statement-breakpoint
CREATE TYPE "public"."tipo_lectura_planificacion" AS ENUM('excel', 'calendario');--> statement-breakpoint
ALTER TABLE "planificaciones" ALTER COLUMN "huella" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "planificaciones" ALTER COLUMN "hojas" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "planificaciones" ALTER COLUMN "media_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "planificacion_lecturas" ADD COLUMN "tipo" "tipo_lectura_planificacion" DEFAULT 'excel' NOT NULL;--> statement-breakpoint
ALTER TABLE "planificacion_lecturas" ADD COLUMN "pedido" jsonb;--> statement-breakpoint
ALTER TABLE "planificaciones" ADD COLUMN "origen" "origen_planificacion" DEFAULT 'excel' NOT NULL;--> statement-breakpoint
ALTER TABLE "planificaciones" ADD COLUMN "copiada_de" text;--> statement-breakpoint
ALTER TABLE "planificaciones" ADD CONSTRAINT "planificaciones_copiada_de_planificaciones_id_fk" FOREIGN KEY ("copiada_de") REFERENCES "public"."planificaciones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planificaciones" ADD CONSTRAINT "ck_planificacion_origen" CHECK (("planificaciones"."origen" = 'excel') = ("planificaciones"."media_id" is not null));