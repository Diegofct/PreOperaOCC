DROP INDEX "ux_bitacora_vehiculo_fecha";--> statement-breakpoint
CREATE UNIQUE INDEX "ux_bitacora_vehiculo_fecha" ON "bitacoras" USING btree ("vehiculo_id","fecha") WHERE anulado_en is null;