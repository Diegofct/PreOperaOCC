ALTER TABLE "almacen_movimientos" ADD COLUMN "mensaje_whatsapp_id" text;--> statement-breakpoint
ALTER TABLE "cantera_viajes" ADD COLUMN "vale" text;--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "registrado_por" text;--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "mensaje_whatsapp_id" text;--> statement-breakpoint
ALTER TABLE "almacen_movimientos" ADD CONSTRAINT "almacen_movimientos_mensaje_whatsapp_id_whatsapp_mensajes_id_fk" FOREIGN KEY ("mensaje_whatsapp_id") REFERENCES "public"."whatsapp_mensajes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_registrado_por_usuarios_id_fk" FOREIGN KEY ("registrado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_mensaje_whatsapp_id_whatsapp_mensajes_id_fk" FOREIGN KEY ("mensaje_whatsapp_id") REFERENCES "public"."whatsapp_mensajes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_cantera_viaje_vale" ON "cantera_viajes" USING btree ("obra_id",lower("vale")) WHERE "cantera_viajes"."vale" is not null;--> statement-breakpoint
ALTER TABLE "cantera_viajes" ADD CONSTRAINT "ck_cantera_viaje_vale" CHECK ("cantera_viajes"."vale" is null or char_length("cantera_viajes"."vale") between 1 and 30);