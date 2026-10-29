ALTER TYPE "public"."dueno_media" ADD VALUE 'repositorio';--> statement-breakpoint
ALTER TYPE "public"."rol_usuario" ADD VALUE 'encargado_occ';--> statement-breakpoint
CREATE TABLE "documentos_del_grupo" (
	"id" text PRIMARY KEY NOT NULL,
	"empresa_id" text,
	"obra_id" text,
	"clase" text NOT NULL,
	"clase_nombre" text NOT NULL,
	"nombre" text NOT NULL,
	"proveedor" text DEFAULT '' NOT NULL,
	"descripcion" text DEFAULT '' NOT NULL,
	"fecha" date NOT NULL,
	"vence" date,
	"media_id" text NOT NULL,
	"nombre_archivo" text NOT NULL,
	"subido_por" text NOT NULL,
	"subido_en" timestamp with time zone DEFAULT now() NOT NULL,
	"anulado_en" timestamp with time zone,
	"anulado_por" text,
	"motivo_anulacion" text,
	CONSTRAINT "ck_documento_grupo_dueno" CHECK (("documentos_del_grupo"."empresa_id" is null) <> ("documentos_del_grupo"."obra_id" is null) and ("documentos_del_grupo"."empresa_id" is null or "documentos_del_grupo"."empresa_id" <> 'proyectos')),
	CONSTRAINT "ck_documento_grupo_vence" CHECK ("documentos_del_grupo"."vence" is null or "documentos_del_grupo"."vence" >= "documentos_del_grupo"."fecha"),
	CONSTRAINT "ck_documento_grupo_anulado" CHECK (("documentos_del_grupo"."anulado_en" is null) = ("documentos_del_grupo"."motivo_anulacion" is null)
       and ("documentos_del_grupo"."motivo_anulacion" is null or length(trim("documentos_del_grupo"."motivo_anulacion")) > 0)),
	CONSTRAINT "ck_documento_grupo_nombre" CHECK (length(trim("documentos_del_grupo"."nombre")) > 0)
);
--> statement-breakpoint
ALTER TABLE "documentos_del_grupo" ADD CONSTRAINT "documentos_del_grupo_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documentos_del_grupo" ADD CONSTRAINT "documentos_del_grupo_obra_id_obras_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documentos_del_grupo" ADD CONSTRAINT "documentos_del_grupo_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documentos_del_grupo" ADD CONSTRAINT "documentos_del_grupo_subido_por_usuarios_id_fk" FOREIGN KEY ("subido_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documentos_del_grupo" ADD CONSTRAINT "documentos_del_grupo_anulado_por_usuarios_id_fk" FOREIGN KEY ("anulado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_documento_grupo_empresa" ON "documentos_del_grupo" USING btree ("empresa_id","fecha");--> statement-breakpoint
CREATE INDEX "ix_documento_grupo_obra" ON "documentos_del_grupo" USING btree ("obra_id","fecha");