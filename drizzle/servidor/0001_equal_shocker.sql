ALTER TABLE "credenciales_web" ADD COLUMN "debe_cambiar" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "credenciales_web" ADD COLUMN "ultimo_ingreso_en" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sesiones_web" ADD COLUMN "ultimo_uso_en" timestamp with time zone;