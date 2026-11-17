ALTER TABLE "compra_renglones" ADD COLUMN "valor" bigint;--> statement-breakpoint
ALTER TABLE "solicitud_compra_renglones" ADD COLUMN "valor_estimado" bigint;--> statement-breakpoint
ALTER TABLE "solicitud_compra_renglones" ADD COLUMN "imputacion" jsonb;--> statement-breakpoint
ALTER TABLE "solicitudes_pago" ADD COLUMN "imputacion" jsonb;--> statement-breakpoint
ALTER TABLE "compra_renglones" ADD CONSTRAINT "ck_compra_renglon_valor" CHECK ("compra_renglones"."valor" is null or "compra_renglones"."valor" > 0);--> statement-breakpoint
ALTER TABLE "solicitud_compra_renglones" ADD CONSTRAINT "ck_solicitud_compra_renglon_valor_estimado" CHECK ("solicitud_compra_renglones"."valor_estimado" is null or "solicitud_compra_renglones"."valor_estimado" > 0);--> statement-breakpoint
ALTER TABLE "solicitud_compra_renglones" ADD CONSTRAINT "ck_solicitud_compra_renglon_imputacion" CHECK ("solicitud_compra_renglones"."imputacion" is null or "solicitud_compra_renglones"."imputacion" ? 'tipo');--> statement-breakpoint
ALTER TABLE "solicitudes_pago" ADD CONSTRAINT "ck_solicitud_pago_imputacion" CHECK ("solicitudes_pago"."imputacion" is null or "solicitudes_pago"."imputacion" ? 'tipo');