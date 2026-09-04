CREATE TYPE "public"."tipo_codigo" AS ENUM('activacion', 'respaldo');--> statement-breakpoint
DROP INDEX "ix_codigos_usuario";--> statement-breakpoint
ALTER TABLE "codigos_activacion" ADD COLUMN "tipo" "tipo_codigo" DEFAULT 'activacion' NOT NULL;--> statement-breakpoint
ALTER TABLE "dispositivos" ADD COLUMN "hash_refresh" text;--> statement-breakpoint
CREATE INDEX "ix_codigos_usuario" ON "codigos_activacion" USING btree ("usuario_id","tipo","usado_en");