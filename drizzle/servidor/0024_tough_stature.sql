ALTER TABLE "cantera_viajes" DROP CONSTRAINT "ck_cantera_viaje_destino";--> statement-breakpoint
ALTER TABLE "cantera_viajes" ADD CONSTRAINT "ck_cantera_viaje_destino" CHECK (("cantera_viajes"."destino_obra" and "cantera_viajes"."destino_id" is null
            and "cantera_viajes"."pr" is not null and "cantera_viajes"."metros" is not null
            and "cantera_viajes"."pr" between 0 and 25
            and "cantera_viajes"."metros" between 0 and 999)
       or (not "cantera_viajes"."destino_obra" and "cantera_viajes"."destino_id" is not null
            and "cantera_viajes"."pr" is null and "cantera_viajes"."metros" is null));