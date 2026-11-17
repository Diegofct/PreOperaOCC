CREATE TYPE "public"."paso_requisicion" AS ENUM('residente', 'director_obra', 'director_proyectos', 'administradora');--> statement-breakpoint
ALTER TYPE "public"."rol_usuario" ADD VALUE 'administradora_elemental';--> statement-breakpoint
CREATE SEQUENCE "public"."requisicion_numero" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
ALTER TABLE "solicitud_compra_renglones" ADD COLUMN "necesita_el" date;--> statement-breakpoint
ALTER TABLE "solicitud_compra_renglones" ADD COLUMN "para_que" text;--> statement-breakpoint
ALTER TABLE "solicitudes_compra" ADD COLUMN "numero_requisicion" integer;--> statement-breakpoint
ALTER TABLE "solicitudes_compra" ADD COLUMN "paso" "paso_requisicion";--> statement-breakpoint
ALTER TABLE "solicitudes_pago" ADD COLUMN "numero_requisicion" integer;--> statement-breakpoint
ALTER TABLE "solicitudes_pago" ADD COLUMN "paso" "paso_requisicion";--> statement-breakpoint
CREATE UNIQUE INDEX "ux_solicitud_compra_requisicion" ON "solicitudes_compra" USING btree ("numero_requisicion") WHERE "solicitudes_compra"."numero_requisicion" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "ux_solicitud_pago_requisicion" ON "solicitudes_pago" USING btree ("numero_requisicion") WHERE "solicitudes_pago"."numero_requisicion" is not null;--> statement-breakpoint
ALTER TABLE "solicitud_compra_renglones" ADD CONSTRAINT "ck_solicitud_compra_renglon_requisicion" CHECK (("solicitud_compra_renglones"."necesita_el" is null) = ("solicitud_compra_renglones"."para_que" is null) and ("solicitud_compra_renglones"."para_que" is null or length(trim("solicitud_compra_renglones"."para_que")) > 0));--> statement-breakpoint
ALTER TABLE "solicitudes_compra" ADD CONSTRAINT "ck_solicitud_compra_paso" CHECK ("solicitudes_compra"."paso" is null or ("solicitudes_compra"."numero_requisicion" is not null and "solicitudes_compra"."estado" = 'enviada'));--> statement-breakpoint
ALTER TABLE "solicitudes_pago" ADD CONSTRAINT "ck_solicitud_pago_paso" CHECK ("solicitudes_pago"."paso" is null or ("solicitudes_pago"."numero_requisicion" is not null and "solicitudes_pago"."estado" = 'enviada'));