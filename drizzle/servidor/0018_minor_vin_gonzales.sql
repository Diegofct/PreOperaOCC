CREATE TYPE "public"."estado_mensaje_whatsapp" AS ENUM('pendiente', 'ignorado', 'aprobado', 'descartado');--> statement-breakpoint
ALTER TYPE "public"."dueno_media" ADD VALUE 'whatsapp';--> statement-breakpoint
CREATE TABLE "whatsapp_grupos" (
	"id" text PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"obra_id" text,
	"asociado_por" text,
	"asociado_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatsapp_mensajes" (
	"id" text PRIMARY KEY NOT NULL,
	"grupo_id" text NOT NULL,
	"autor_id" text NOT NULL,
	"autor_nombre" text,
	"enviado_en" timestamp with time zone NOT NULL,
	"tipo" text NOT NULL,
	"texto" text,
	"categoria" text,
	"complementa_a" text,
	"propuesta_ia" jsonb NOT NULL,
	"propuesta" jsonb,
	"estado" "estado_mensaje_whatsapp" DEFAULT 'pendiente' NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"viajes_aprobados_en" timestamp with time zone,
	"aprobado_por" text,
	"aprobado_en" timestamp with time zone,
	"descartado_por" text,
	"descartado_en" timestamp with time zone,
	"motivo_descarte" text,
	"parte_id" text,
	"recibido_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_whatsapp_mensaje_descarte" CHECK ("whatsapp_mensajes"."estado" <> 'descartado'
       or ("whatsapp_mensajes"."motivo_descarte" is not null and length(trim("whatsapp_mensajes"."motivo_descarte")) > 0
           and "whatsapp_mensajes"."descartado_por" is not null and "whatsapp_mensajes"."descartado_en" is not null)),
	CONSTRAINT "ck_whatsapp_mensaje_aprobacion" CHECK ("whatsapp_mensajes"."estado" <> 'aprobado'
       or ("whatsapp_mensajes"."aprobado_por" is not null and "whatsapp_mensajes"."aprobado_en" is not null)),
	CONSTRAINT "ck_whatsapp_mensaje_version" CHECK ("whatsapp_mensajes"."version" >= 0)
);
--> statement-breakpoint
ALTER TABLE "cantera_viajes" ADD COLUMN "mensaje_whatsapp_id" text;--> statement-breakpoint
ALTER TABLE "whatsapp_grupos" ADD CONSTRAINT "whatsapp_grupos_obra_id_obras_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_grupos" ADD CONSTRAINT "whatsapp_grupos_asociado_por_usuarios_id_fk" FOREIGN KEY ("asociado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_mensajes" ADD CONSTRAINT "whatsapp_mensajes_grupo_id_whatsapp_grupos_id_fk" FOREIGN KEY ("grupo_id") REFERENCES "public"."whatsapp_grupos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_mensajes" ADD CONSTRAINT "whatsapp_mensajes_aprobado_por_usuarios_id_fk" FOREIGN KEY ("aprobado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_mensajes" ADD CONSTRAINT "whatsapp_mensajes_descartado_por_usuarios_id_fk" FOREIGN KEY ("descartado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_mensajes" ADD CONSTRAINT "whatsapp_mensajes_parte_id_partes_de_obra_id_fk" FOREIGN KEY ("parte_id") REFERENCES "public"."partes_de_obra"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_whatsapp_grupo_obra" ON "whatsapp_grupos" USING btree ("obra_id");--> statement-breakpoint
CREATE INDEX "ix_whatsapp_mensaje_bandeja" ON "whatsapp_mensajes" USING btree ("grupo_id","estado","enviado_en");--> statement-breakpoint
CREATE INDEX "ix_whatsapp_mensaje_complementa" ON "whatsapp_mensajes" USING btree ("complementa_a");--> statement-breakpoint
ALTER TABLE "cantera_viajes" ADD CONSTRAINT "cantera_viajes_mensaje_whatsapp_id_whatsapp_mensajes_id_fk" FOREIGN KEY ("mensaje_whatsapp_id") REFERENCES "public"."whatsapp_mensajes"("id") ON DELETE no action ON UPDATE no action;