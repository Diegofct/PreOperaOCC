CREATE TABLE "partes_de_obra" (
	"id" text PRIMARY KEY NOT NULL,
	"obra_id" text NOT NULL,
	"usuario_id" text NOT NULL,
	"fecha" date NOT NULL,
	"maquinaria" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"personal" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"actividades" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"clima" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"laboratorio" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notas" text,
	"cerrado_en" timestamp with time zone,
	"anulado_en" timestamp with time zone,
	"anulado_por" text,
	"motivo_anulacion" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "partes_de_obra" ADD CONSTRAINT "partes_de_obra_obra_id_obras_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partes_de_obra" ADD CONSTRAINT "partes_de_obra_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partes_de_obra" ADD CONSTRAINT "partes_de_obra_anulado_por_usuarios_id_fk" FOREIGN KEY ("anulado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ux_parte_obra_fecha" ON "partes_de_obra" USING btree ("obra_id","fecha") WHERE anulado_en is null;--> statement-breakpoint
CREATE INDEX "ix_parte_fecha" ON "partes_de_obra" USING btree ("fecha");