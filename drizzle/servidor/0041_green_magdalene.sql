CREATE TABLE "claves_generadas" (
	"id" text PRIMARY KEY NOT NULL,
	"usuario_id" text NOT NULL,
	"generada_por" text NOT NULL,
	"generada_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "claves_generadas" ADD CONSTRAINT "claves_generadas_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claves_generadas" ADD CONSTRAINT "claves_generadas_generada_por_usuarios_id_fk" FOREIGN KEY ("generada_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_claves_generadas_usuario" ON "claves_generadas" USING btree ("usuario_id","generada_en");