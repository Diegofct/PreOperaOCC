ALTER TYPE "public"."origen_presupuesto" ADD VALUE 'excel_ia';--> statement-breakpoint
CREATE TABLE "presupuesto_lecturas_ia" (
	"huella" text PRIMARY KEY NOT NULL,
	"lectura" jsonb NOT NULL,
	"modelo" text NOT NULL,
	"tokens_entrada" integer NOT NULL,
	"tokens_salida" integer NOT NULL,
	"creado_por" text NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "presupuesto_lecturas_ia" ADD CONSTRAINT "presupuesto_lecturas_ia_creado_por_usuarios_id_fk" FOREIGN KEY ("creado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;