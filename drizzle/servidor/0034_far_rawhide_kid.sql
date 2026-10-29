ALTER TYPE "public"."rol_usuario" ADD VALUE 'auxiliar_rrhh';--> statement-breakpoint
CREATE TABLE "ficha_eventos" (
	"id" text PRIMARY KEY NOT NULL,
	"usuario_id" text NOT NULL,
	"accion" text NOT NULL,
	"campos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"por" text NOT NULL,
	"en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_ficha_evento_accion" CHECK ("ficha_eventos"."accion" in ('guardado', 'retirado'))
);
--> statement-breakpoint
CREATE TABLE "fichas_laborales" (
	"usuario_id" text PRIMARY KEY NOT NULL,
	"tipo_documento" text,
	"fecha_nacimiento" date,
	"telefono" text,
	"correo" text,
	"direccion" text,
	"ciudad" text,
	"emergencia_nombre" text,
	"emergencia_parentesco" text,
	"emergencia_telefono" text,
	"fecha_ingreso" date,
	"tipo_contrato" text,
	"fin_contrato" date,
	"salario" bigint,
	"eps" text,
	"arl" text,
	"pension" text,
	"caja" text,
	"notas" text,
	"estado" text DEFAULT 'activo' NOT NULL,
	"retiro_fecha" date,
	"retiro_motivo" text,
	"version" integer DEFAULT 1 NOT NULL,
	"actualizado_por" text,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_ficha_estado" CHECK ("fichas_laborales"."estado" in ('activo', 'vacaciones', 'incapacidad', 'licencia', 'retirado')),
	CONSTRAINT "ck_ficha_fin" CHECK ("fichas_laborales"."fin_contrato" is null or "fichas_laborales"."fecha_ingreso" is null or "fichas_laborales"."fin_contrato" >= "fichas_laborales"."fecha_ingreso"),
	CONSTRAINT "ck_ficha_salario" CHECK ("fichas_laborales"."salario" is null or "fichas_laborales"."salario" > 0),
	CONSTRAINT "ck_ficha_retiro" CHECK (("fichas_laborales"."estado" = 'retirado') = ("fichas_laborales"."retiro_fecha" is not null and "fichas_laborales"."retiro_motivo" is not null and length(trim("fichas_laborales"."retiro_motivo")) > 0))
);
--> statement-breakpoint
ALTER TABLE "documentos_del_grupo" DROP CONSTRAINT "ck_documento_grupo_dueno";--> statement-breakpoint
ALTER TABLE "documentos_del_grupo" ADD COLUMN "persona_id" text;--> statement-breakpoint
ALTER TABLE "ficha_eventos" ADD CONSTRAINT "ficha_eventos_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ficha_eventos" ADD CONSTRAINT "ficha_eventos_por_usuarios_id_fk" FOREIGN KEY ("por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fichas_laborales" ADD CONSTRAINT "fichas_laborales_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fichas_laborales" ADD CONSTRAINT "fichas_laborales_actualizado_por_usuarios_id_fk" FOREIGN KEY ("actualizado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_ficha_eventos" ON "ficha_eventos" USING btree ("usuario_id","en");--> statement-breakpoint
ALTER TABLE "documentos_del_grupo" ADD CONSTRAINT "documentos_del_grupo_persona_id_usuarios_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_documento_grupo_persona" ON "documentos_del_grupo" USING btree ("persona_id","fecha");--> statement-breakpoint
ALTER TABLE "documentos_del_grupo" ADD CONSTRAINT "ck_documento_grupo_dueno" CHECK ((("documentos_del_grupo"."empresa_id" is not null)::int + ("documentos_del_grupo"."obra_id" is not null)::int + ("documentos_del_grupo"."persona_id" is not null)::int) = 1
       and ("documentos_del_grupo"."empresa_id" is null or "documentos_del_grupo"."empresa_id" <> 'proyectos'));