ALTER TABLE "partes_de_obra" ADD COLUMN "sin_trabajo" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "partes_de_obra" ADD COLUMN "motivo_sin_trabajo" text;