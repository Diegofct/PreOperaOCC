ALTER TABLE `bitacoras` ADD `preoperacional_id` text REFERENCES preoperacionales(id);--> statement-breakpoint
ALTER TABLE `bitacoras` ADD `jornada_iniciada_en` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `bitacoras` ADD `jornada_cerrada_en` integer;