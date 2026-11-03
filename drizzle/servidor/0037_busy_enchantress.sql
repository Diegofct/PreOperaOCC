ALTER TYPE "public"."tipo_reporte_whatsapp" ADD VALUE 'lista_equipos';--> statement-breakpoint
ALTER TYPE "public"."tipo_reporte_whatsapp" ADD VALUE 'informe_mantenimiento';--> statement-breakpoint
CREATE TABLE "bitacoras_empresa" (
	"id" text PRIMARY KEY NOT NULL,
	"empresa_id" text NOT NULL,
	"fecha" date NOT NULL,
	"estado_equipos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"trabajos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"actividades" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"pendientes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"lista" jsonb,
	"listas" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"fecha_dudosa" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"cerrado_en" timestamp with time zone,
	"cerrado_por" text,
	"anulado_en" timestamp with time zone,
	"anulado_por" text,
	"motivo_anulacion" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_bitacora_empresa_version" CHECK ("bitacoras_empresa"."version" >= 0),
	CONSTRAINT "ck_bitacora_empresa_cierre" CHECK ("bitacoras_empresa"."cerrado_en" is null or "bitacoras_empresa"."cerrado_por" is not null),
	CONSTRAINT "ck_bitacora_empresa_anulacion" CHECK ("bitacoras_empresa"."anulado_en" is null
       or ("bitacoras_empresa"."anulado_por" is not null and "bitacoras_empresa"."motivo_anulacion" is not null and length(trim("bitacoras_empresa"."motivo_anulacion")) > 0))
);
--> statement-breakpoint
CREATE TABLE "whatsapp_dias_empresa" (
	"empresa_id" text NOT NULL,
	"fecha" date NOT NULL,
	"estado" "estado_dia_whatsapp" DEFAULT 'en_espera' NOT NULL,
	"faltaron" jsonb,
	"bitacora_empresa_id" text,
	"armada_en" timestamp with time zone,
	"armada_por" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "whatsapp_dias_empresa_empresa_id_fecha_pk" PRIMARY KEY("empresa_id","fecha")
);
--> statement-breakpoint
DROP INDEX "ux_bitacora_foto_media";--> statement-breakpoint
DROP INDEX "ux_bitacora_foto_huella";--> statement-breakpoint
DROP INDEX "ux_whatsapp_esperado";--> statement-breakpoint
ALTER TABLE "bitacora_fotos" ALTER COLUMN "parte_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "whatsapp_reportes_esperados" ALTER COLUMN "obra_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "bitacora_fotos" ADD COLUMN "bitacora_empresa_id" text;--> statement-breakpoint
ALTER TABLE "vehiculos" ADD COLUMN "nombres_whatsapp" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "whatsapp_grupos" ADD COLUMN "empresa_id" text;--> statement-breakpoint
ALTER TABLE "whatsapp_mensajes" ADD COLUMN "empresa_decidida_id" text;--> statement-breakpoint
ALTER TABLE "whatsapp_reportes_esperados" ADD COLUMN "empresa_id" text;--> statement-breakpoint
ALTER TABLE "bitacoras_empresa" ADD CONSTRAINT "bitacoras_empresa_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bitacoras_empresa" ADD CONSTRAINT "bitacoras_empresa_cerrado_por_usuarios_id_fk" FOREIGN KEY ("cerrado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bitacoras_empresa" ADD CONSTRAINT "bitacoras_empresa_anulado_por_usuarios_id_fk" FOREIGN KEY ("anulado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_dias_empresa" ADD CONSTRAINT "whatsapp_dias_empresa_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_dias_empresa" ADD CONSTRAINT "whatsapp_dias_empresa_bitacora_empresa_id_bitacoras_empresa_id_fk" FOREIGN KEY ("bitacora_empresa_id") REFERENCES "public"."bitacoras_empresa"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_dias_empresa" ADD CONSTRAINT "whatsapp_dias_empresa_armada_por_usuarios_id_fk" FOREIGN KEY ("armada_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ux_bitacora_empresa_fecha" ON "bitacoras_empresa" USING btree ("empresa_id","fecha") WHERE anulado_en is null;--> statement-breakpoint
CREATE INDEX "ix_bitacora_empresa_fecha" ON "bitacoras_empresa" USING btree ("fecha");--> statement-breakpoint
ALTER TABLE "bitacora_fotos" ADD CONSTRAINT "bitacora_fotos_bitacora_empresa_id_bitacoras_empresa_id_fk" FOREIGN KEY ("bitacora_empresa_id") REFERENCES "public"."bitacoras_empresa"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_grupos" ADD CONSTRAINT "whatsapp_grupos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_mensajes" ADD CONSTRAINT "whatsapp_mensajes_empresa_decidida_id_empresas_id_fk" FOREIGN KEY ("empresa_decidida_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_reportes_esperados" ADD CONSTRAINT "whatsapp_reportes_esperados_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_whatsapp_grupo_empresa" ON "whatsapp_grupos" USING btree ("empresa_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_bitacora_foto_media" ON "bitacora_fotos" USING btree (coalesce("parte_id", "bitacora_empresa_id"),"media_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_bitacora_foto_huella" ON "bitacora_fotos" USING btree (coalesce("parte_id", "bitacora_empresa_id"),"sha256") WHERE "bitacora_fotos"."sha256" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "ux_whatsapp_esperado" ON "whatsapp_reportes_esperados" USING btree (coalesce("obra_id", "empresa_id"),"tipo_reporte",coalesce("autor_id", '')) WHERE eliminado_en is null;--> statement-breakpoint
ALTER TABLE "bitacora_fotos" ADD CONSTRAINT "ck_bitacora_foto_dueno" CHECK (("bitacora_fotos"."parte_id" is null) <> ("bitacora_fotos"."bitacora_empresa_id" is null));--> statement-breakpoint
ALTER TABLE "whatsapp_grupos" ADD CONSTRAINT "ck_whatsapp_grupo_dueno" CHECK ("whatsapp_grupos"."obra_id" is null or "whatsapp_grupos"."empresa_id" is null);--> statement-breakpoint
ALTER TABLE "whatsapp_grupos" ADD CONSTRAINT "ck_whatsapp_grupo_empresa" CHECK ("whatsapp_grupos"."empresa_id" is null or "whatsapp_grupos"."empresa_id" in ('occ', 'geolab'));--> statement-breakpoint
ALTER TABLE "whatsapp_reportes_esperados" ADD CONSTRAINT "ck_whatsapp_esperado_dueno" CHECK (("whatsapp_reportes_esperados"."obra_id" is null) <> ("whatsapp_reportes_esperados"."empresa_id" is null));