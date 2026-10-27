ALTER TABLE "partes_de_obra" ADD COLUMN "sin_actividades" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "partes_de_obra" ADD COLUMN "motivo_sin_actividades" text;--> statement-breakpoint
ALTER TABLE "partes_de_obra" ADD COLUMN "sin_ensayos" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "partes_de_obra" ADD COLUMN "motivo_sin_ensayos" text;--> statement-breakpoint
ALTER TABLE "vehiculos" ADD COLUMN "codigo_anterior" text;