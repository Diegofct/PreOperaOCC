CREATE TYPE "public"."estado_mensaje_asistente" AS ENUM('respondido', 'fallido');--> statement-breakpoint
CREATE TYPE "public"."rol_mensaje_asistente" AS ENUM('persona', 'asistente');--> statement-breakpoint
ALTER TYPE "public"."dueno_media" ADD VALUE 'asistente';--> statement-breakpoint
CREATE TABLE "asistente_conversaciones" (
	"id" text PRIMARY KEY NOT NULL,
	"usuario_id" text NOT NULL,
	"titulo" text NOT NULL,
	"obras" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"modulos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"archivada" boolean DEFAULT false NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "asistente_limites" (
	"clave" text PRIMARY KEY NOT NULL,
	"usuario_id" text,
	"limite" integer NOT NULL,
	"actualizado_por" text NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_asistente_limite_rango" CHECK ("asistente_limites"."limite" between 0 and 500),
	CONSTRAINT "ck_asistente_limite_clave" CHECK (("asistente_limites"."clave" = 'todos' and "asistente_limites"."usuario_id" is null) or ("asistente_limites"."clave" = "asistente_limites"."usuario_id"))
);
--> statement-breakpoint
CREATE TABLE "asistente_mensajes" (
	"id" text PRIMARY KEY NOT NULL,
	"conversacion_id" text NOT NULL,
	"rol" "rol_mensaje_asistente" NOT NULL,
	"texto" text NOT NULL,
	"fuentes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"adjuntos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"estado" "estado_mensaje_asistente" DEFAULT 'respondido' NOT NULL,
	"modelo" text,
	"tokens_entrada" integer DEFAULT 0 NOT NULL,
	"tokens_salida" integer DEFAULT 0 NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_asistente_mensaje_tokens" CHECK ("asistente_mensajes"."tokens_entrada" >= 0 and "asistente_mensajes"."tokens_salida" >= 0)
);
--> statement-breakpoint
CREATE TABLE "asistente_uso" (
	"id" text PRIMARY KEY NOT NULL,
	"usuario_id" text NOT NULL,
	"dia" date NOT NULL,
	"obra_id" text,
	"preguntas" integer DEFAULT 0 NOT NULL,
	"tokens_entrada" integer DEFAULT 0 NOT NULL,
	"tokens_salida" integer DEFAULT 0 NOT NULL,
	"costo" bigint DEFAULT 0 NOT NULL,
	CONSTRAINT "ck_asistente_uso_positivo" CHECK ("asistente_uso"."preguntas" >= 0 and "asistente_uso"."costo" >= 0)
);
--> statement-breakpoint
ALTER TABLE "asistente_conversaciones" ADD CONSTRAINT "asistente_conversaciones_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asistente_limites" ADD CONSTRAINT "asistente_limites_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asistente_limites" ADD CONSTRAINT "asistente_limites_actualizado_por_usuarios_id_fk" FOREIGN KEY ("actualizado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asistente_mensajes" ADD CONSTRAINT "asistente_mensajes_conversacion_id_asistente_conversaciones_id_fk" FOREIGN KEY ("conversacion_id") REFERENCES "public"."asistente_conversaciones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asistente_uso" ADD CONSTRAINT "asistente_uso_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asistente_uso" ADD CONSTRAINT "asistente_uso_obra_id_obras_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_asistente_conversaciones_usuario" ON "asistente_conversaciones" USING btree ("usuario_id","archivada","actualizado_en");--> statement-breakpoint
CREATE INDEX "ix_asistente_mensajes_conversacion" ON "asistente_mensajes" USING btree ("conversacion_id","creado_en");--> statement-breakpoint
CREATE INDEX "ix_asistente_uso_dia" ON "asistente_uso" USING btree ("dia");--> statement-breakpoint
CREATE INDEX "ix_asistente_uso_usuario" ON "asistente_uso" USING btree ("usuario_id","dia");