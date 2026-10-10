CREATE TYPE "public"."estado_dia_whatsapp" AS ENUM('en_espera', 'armada', 'incompleta');--> statement-breakpoint
CREATE TYPE "public"."estado_excepcion_whatsapp" AS ENUM('pendiente', 'guardada', 'descartada');--> statement-breakpoint
CREATE TYPE "public"."tipo_creado_whatsapp" AS ENUM('persona', 'vehiculo', 'material_cantera', 'sitio_cantera', 'material_almacen');--> statement-breakpoint
CREATE TYPE "public"."tipo_reporte_whatsapp" AS ENUM('reporte_diario', 'personal', 'control_calidad', 'inicio_actividades', 'viajes');--> statement-breakpoint
ALTER TYPE "public"."estado_mensaje_whatsapp" ADD VALUE 'en_espera';--> statement-breakpoint
ALTER TYPE "public"."estado_mensaje_whatsapp" ADD VALUE 'guardado';--> statement-breakpoint
CREATE TABLE "whatsapp_creados" (
	"tipo" "tipo_creado_whatsapp" NOT NULL,
	"registro_id" text NOT NULL,
	"obra_id" text NOT NULL,
	"mensaje_id" text NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"revisado_por" text,
	"revisado_en" timestamp with time zone,
	"unido_a" text,
	CONSTRAINT "whatsapp_creados_tipo_registro_id_pk" PRIMARY KEY("tipo","registro_id")
);
--> statement-breakpoint
CREATE TABLE "whatsapp_dias" (
	"obra_id" text NOT NULL,
	"fecha" date NOT NULL,
	"estado" "estado_dia_whatsapp" DEFAULT 'en_espera' NOT NULL,
	"faltaron" jsonb,
	"parte_id" text,
	"armada_en" timestamp with time zone,
	"armada_por" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "whatsapp_dias_obra_id_fecha_pk" PRIMARY KEY("obra_id","fecha")
);
--> statement-breakpoint
CREATE TABLE "whatsapp_excepciones" (
	"id" text PRIMARY KEY NOT NULL,
	"mensaje_id" text NOT NULL,
	"seccion" text NOT NULL,
	"renglon" integer,
	"motivo" text NOT NULL,
	"datos" jsonb,
	"estado" "estado_excepcion_whatsapp" DEFAULT 'pendiente' NOT NULL,
	"resuelta_por" text,
	"resuelta_en" timestamp with time zone,
	"motivo_descarte" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_whatsapp_excepcion_descarte" CHECK ("whatsapp_excepciones"."estado" <> 'descartada'
       or ("whatsapp_excepciones"."motivo_descarte" is not null and length(trim("whatsapp_excepciones"."motivo_descarte")) > 0))
);
--> statement-breakpoint
CREATE TABLE "whatsapp_reportes_esperados" (
	"id" text PRIMARY KEY NOT NULL,
	"obra_id" text NOT NULL,
	"tipo_reporte" "tipo_reporte_whatsapp" NOT NULL,
	"autor_id" text,
	"autor_nombre" text,
	"creado_por" text NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"eliminado_en" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "whatsapp_mensajes" ADD COLUMN "fecha_hecho" date;--> statement-breakpoint
ALTER TABLE "whatsapp_mensajes" ADD COLUMN "tipo_reporte" "tipo_reporte_whatsapp";--> statement-breakpoint
ALTER TABLE "whatsapp_mensajes" ADD COLUMN "procesado_en" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "whatsapp_mensajes" ADD COLUMN "intentos" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "whatsapp_mensajes" ADD COLUMN "error_proceso" text;--> statement-breakpoint
ALTER TABLE "whatsapp_mensajes" ADD COLUMN "resultado" jsonb;--> statement-breakpoint
ALTER TABLE "whatsapp_creados" ADD CONSTRAINT "whatsapp_creados_obra_id_obras_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_creados" ADD CONSTRAINT "whatsapp_creados_mensaje_id_whatsapp_mensajes_id_fk" FOREIGN KEY ("mensaje_id") REFERENCES "public"."whatsapp_mensajes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_creados" ADD CONSTRAINT "whatsapp_creados_revisado_por_usuarios_id_fk" FOREIGN KEY ("revisado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_dias" ADD CONSTRAINT "whatsapp_dias_obra_id_obras_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_dias" ADD CONSTRAINT "whatsapp_dias_parte_id_partes_de_obra_id_fk" FOREIGN KEY ("parte_id") REFERENCES "public"."partes_de_obra"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_dias" ADD CONSTRAINT "whatsapp_dias_armada_por_usuarios_id_fk" FOREIGN KEY ("armada_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_excepciones" ADD CONSTRAINT "whatsapp_excepciones_mensaje_id_whatsapp_mensajes_id_fk" FOREIGN KEY ("mensaje_id") REFERENCES "public"."whatsapp_mensajes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_excepciones" ADD CONSTRAINT "whatsapp_excepciones_resuelta_por_usuarios_id_fk" FOREIGN KEY ("resuelta_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_reportes_esperados" ADD CONSTRAINT "whatsapp_reportes_esperados_obra_id_obras_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_reportes_esperados" ADD CONSTRAINT "whatsapp_reportes_esperados_creado_por_usuarios_id_fk" FOREIGN KEY ("creado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_whatsapp_creado_obra" ON "whatsapp_creados" USING btree ("obra_id","revisado_en");--> statement-breakpoint
CREATE INDEX "ix_whatsapp_excepcion_mensaje" ON "whatsapp_excepciones" USING btree ("mensaje_id");--> statement-breakpoint
CREATE INDEX "ix_whatsapp_excepcion_estado" ON "whatsapp_excepciones" USING btree ("estado");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_whatsapp_esperado" ON "whatsapp_reportes_esperados" USING btree ("obra_id","tipo_reporte",coalesce("autor_id", '')) WHERE eliminado_en is null;--> statement-breakpoint
CREATE INDEX "ix_whatsapp_mensaje_dia" ON "whatsapp_mensajes" USING btree ("fecha_hecho","estado");--> statement-breakpoint
-- Spec 024, RF-10: el autor de lo que se guarda sin una persona. Sin obra, sin cargo y sin
-- credenciales: no entra al sistema ni sale como conductor (ver rules/whatsapp-automatico).
INSERT INTO "usuarios" ("id", "usuario", "nombre_completo", "rol", "activo") VALUES ('00000000-0000-5000-8000-000000000024', 'sistema.ia-whatsapp', 'IA WhatsApp', 'operador', true) ON CONFLICT ("id") DO NOTHING;
