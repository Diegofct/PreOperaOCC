CREATE TABLE `app_kv` (
	`clave` text PRIMARY KEY NOT NULL,
	`valor` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `asignaciones` (
	`id` text PRIMARY KEY NOT NULL,
	`vehiculo_id` text NOT NULL,
	`usuario_id` text NOT NULL,
	`obra_id` text,
	`desde` integer NOT NULL,
	`hasta` integer,
	FOREIGN KEY (`vehiculo_id`) REFERENCES `vehiculos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`obra_id`) REFERENCES `obras`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_asignaciones_usuario` ON `asignaciones` (`usuario_id`,`hasta`);--> statement-breakpoint
CREATE TABLE `bitacoras` (
	`id` text PRIMARY KEY NOT NULL,
	`vehiculo_id` text NOT NULL,
	`usuario_id` text NOT NULL,
	`obra_id` text,
	`fecha` text NOT NULL,
	`entradas` text NOT NULL,
	`estado_sync` text DEFAULT 'borrador' NOT NULL,
	`ultimo_error` text,
	`actualizado_en` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`vehiculo_id`) REFERENCES `vehiculos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`obra_id`) REFERENCES `obras`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_bitacora_vehiculo_fecha` ON `bitacoras` (`vehiculo_id`,`fecha`);--> statement-breakpoint
CREATE TABLE `estado_sincronizacion` (
	`entidad` text PRIMARY KEY NOT NULL,
	`cursor` text,
	`ultimo_pull_en` integer,
	`ultimo_push_en` integer
);
--> statement-breakpoint
CREATE TABLE `media` (
	`id` text PRIMARY KEY NOT NULL,
	`dueno_tipo` text NOT NULL,
	`dueno_id` text NOT NULL,
	`proposito` text NOT NULL,
	`item_key` text,
	`uri_local` text NOT NULL,
	`mime` text DEFAULT 'image/jpeg' NOT NULL,
	`bytes` integer,
	`sha256` text,
	`estado_subida` text DEFAULT 'pendiente' NOT NULL,
	`intentos` integer DEFAULT 0 NOT NULL,
	`purgar_despues_de` integer,
	`creado_en` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ix_media_dueno` ON `media` (`dueno_tipo`,`dueno_id`);--> statement-breakpoint
CREATE INDEX `ix_media_pendiente` ON `media` (`estado_subida`);--> statement-breakpoint
CREATE TABLE `obras` (
	`id` text PRIMARY KEY NOT NULL,
	`codigo` text NOT NULL,
	`nombre` text NOT NULL,
	`municipio` text,
	`activa` integer DEFAULT true NOT NULL,
	`eliminado_en` integer
);
--> statement-breakpoint
CREATE TABLE `outbox` (
	`seq` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entidad` text NOT NULL,
	`entidad_id` text NOT NULL,
	`operacion` text DEFAULT 'upsert' NOT NULL,
	`payload` text NOT NULL,
	`clave_idempotencia` text NOT NULL,
	`estado` text DEFAULT 'pendiente' NOT NULL,
	`intentos` integer DEFAULT 0 NOT NULL,
	`proximo_intento_en` integer DEFAULT 0 NOT NULL,
	`ultimo_error` text,
	`creado_en` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_outbox_idempotencia` ON `outbox` (`clave_idempotencia`);--> statement-breakpoint
CREATE INDEX `ix_outbox_listas` ON `outbox` (`estado`,`proximo_intento_en`);--> statement-breakpoint
CREATE TABLE `plantillas` (
	`id` text PRIMARY KEY NOT NULL,
	`tipo_vehiculo_id` text NOT NULL,
	`version` integer NOT NULL,
	`hash` text NOT NULL,
	`esquema` text NOT NULL,
	`publicada_en` integer,
	FOREIGN KEY (`tipo_vehiculo_id`) REFERENCES `tipos_vehiculo`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_plantilla_tipo_version` ON `plantillas` (`tipo_vehiculo_id`,`version`);--> statement-breakpoint
CREATE TABLE `preoperacionales` (
	`id` text PRIMARY KEY NOT NULL,
	`vehiculo_id` text NOT NULL,
	`usuario_id` text NOT NULL,
	`obra_id` text,
	`plantilla_tipo_vehiculo` text NOT NULL,
	`plantilla_version` integer NOT NULL,
	`plantilla_hash` text NOT NULL,
	`periodicidades` text NOT NULL,
	`iniciado_en` integer NOT NULL,
	`enviado_en` integer,
	`odometro_km` integer,
	`horometro_h` integer,
	`respuestas` text NOT NULL,
	`resultado` text,
	`cantidad_inmovilizantes` integer DEFAULT 0 NOT NULL,
	`observaciones` text,
	`firma_operador_media_id` text,
	`foto_horometro_media_id` text,
	`desfase_reloj_ms` integer DEFAULT 0 NOT NULL,
	`estado_sync` text DEFAULT 'borrador' NOT NULL,
	`ultimo_error` text,
	`actualizado_en` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`vehiculo_id`) REFERENCES `vehiculos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`obra_id`) REFERENCES `obras`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_preop_vehiculo` ON `preoperacionales` (`vehiculo_id`,`iniciado_en`);--> statement-breakpoint
CREATE INDEX `ix_preop_estado` ON `preoperacionales` (`estado_sync`);--> statement-breakpoint
CREATE TABLE `tipos_vehiculo` (
	`id` text PRIMARY KEY NOT NULL,
	`nombre` text NOT NULL,
	`clase_medidor` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `usuarios` (
	`id` text PRIMARY KEY NOT NULL,
	`usuario` text NOT NULL,
	`nombre_completo` text NOT NULL,
	`documento` text,
	`rol` text DEFAULT 'operador' NOT NULL,
	`activo` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `vehiculos` (
	`id` text PRIMARY KEY NOT NULL,
	`codigo_interno` text NOT NULL,
	`placa` text,
	`tipo_vehiculo_id` text NOT NULL,
	`marca` text,
	`modelo` text,
	`obra_id` text,
	`odometro_km` integer,
	`horometro_h` integer,
	`medidor_actualizado_en` integer,
	`estado` text DEFAULT 'operativo' NOT NULL,
	`eliminado_en` integer,
	FOREIGN KEY (`tipo_vehiculo_id`) REFERENCES `tipos_vehiculo`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`obra_id`) REFERENCES `obras`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_vehiculos_tipo` ON `vehiculos` (`tipo_vehiculo_id`);