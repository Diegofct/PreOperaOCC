PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_bitacoras` (
	`id` text PRIMARY KEY NOT NULL,
	`vehiculo_id` text NOT NULL,
	`usuario_id` text NOT NULL,
	`obra_id` text,
	`operador_id` text,
	`preoperacional_id` text,
	`fecha` text NOT NULL,
	`horometro_inicial` integer,
	`horometro_final` integer,
	`actividades` text DEFAULT '[]' NOT NULL,
	`cerrada_en` integer,
	`jornada_iniciada_en` integer DEFAULT 0 NOT NULL,
	`jornada_cerrada_en` integer,
	`entradas` text DEFAULT '[]' NOT NULL,
	`estado_sync` text DEFAULT 'borrador' NOT NULL,
	`ultimo_error` text,
	`actualizado_en` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`vehiculo_id`) REFERENCES `vehiculos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`obra_id`) REFERENCES `obras`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`operador_id`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`preoperacional_id`) REFERENCES `preoperacionales`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_bitacoras`("id", "vehiculo_id", "usuario_id", "obra_id", "preoperacional_id", "fecha", "jornada_iniciada_en", "jornada_cerrada_en", "entradas", "estado_sync", "ultimo_error", "actualizado_en") SELECT "id", "vehiculo_id", "usuario_id", "obra_id", "preoperacional_id", "fecha", "jornada_iniciada_en", "jornada_cerrada_en", "entradas", "estado_sync", "ultimo_error", "actualizado_en" FROM `bitacoras`;--> statement-breakpoint
DROP TABLE `bitacoras`;--> statement-breakpoint
ALTER TABLE `__new_bitacoras` RENAME TO `bitacoras`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_bitacora_vehiculo_fecha` ON `bitacoras` (`vehiculo_id`,`fecha`);--> statement-breakpoint
ALTER TABLE `usuarios` ADD `obra_id` text;