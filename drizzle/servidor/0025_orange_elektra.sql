CREATE TABLE "bitacora_fotos" (
	"id" text PRIMARY KEY NOT NULL,
	"parte_id" text NOT NULL,
	"media_id" text NOT NULL,
	"mensaje_id" text NOT NULL,
	"sha256" text,
	"agregada_en" timestamp with time zone DEFAULT now() NOT NULL,
	"quitada_en" timestamp with time zone,
	"quitada_por" text,
	"motivo_quitada" text,
	CONSTRAINT "ck_bitacora_foto_quitada" CHECK ("bitacora_fotos"."quitada_en" is null
       or ("bitacora_fotos"."quitada_por" is not null and "bitacora_fotos"."motivo_quitada" is not null and length(trim("bitacora_fotos"."motivo_quitada")) > 0))
);
--> statement-breakpoint
ALTER TABLE "bitacora_fotos" ADD CONSTRAINT "bitacora_fotos_parte_id_partes_de_obra_id_fk" FOREIGN KEY ("parte_id") REFERENCES "public"."partes_de_obra"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bitacora_fotos" ADD CONSTRAINT "bitacora_fotos_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bitacora_fotos" ADD CONSTRAINT "bitacora_fotos_mensaje_id_whatsapp_mensajes_id_fk" FOREIGN KEY ("mensaje_id") REFERENCES "public"."whatsapp_mensajes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bitacora_fotos" ADD CONSTRAINT "bitacora_fotos_quitada_por_usuarios_id_fk" FOREIGN KEY ("quitada_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ux_bitacora_foto_media" ON "bitacora_fotos" USING btree ("parte_id","media_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_bitacora_foto_huella" ON "bitacora_fotos" USING btree ("parte_id","sha256") WHERE "bitacora_fotos"."sha256" is not null;