-- Spec 040, escrita a mano. drizzle-kit, ante un valor de enum renombrado, propone borrar el tipo y
-- volver a crearlo con un cast de texto, que falla con las filas que tienen el valor viejo. RENAME VALUE
-- es una sola sentencia y conserva cada fila: las auxiliares siguen con su acceso, su contraseña y su
-- sesión (RF-2).
ALTER TYPE "public"."rol_usuario" RENAME VALUE 'auxiliar_rrhh' TO 'auxiliar_administrativa';--> statement-breakpoint
UPDATE "usuarios" SET "cargo" = 'auxiliar_administrativa' WHERE "cargo" = 'auxiliar_rrhh';--> statement-breakpoint
ALTER TYPE "public"."proposito_media" ADD VALUE IF NOT EXISTS 'archivo_generado';--> statement-breakpoint
ALTER TABLE "asistente_conversaciones" ADD COLUMN "empresas" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "asistente_mensajes" ADD COLUMN "archivos" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "asistente_mensajes" ADD COLUMN "aclaracion" jsonb;
