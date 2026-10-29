CREATE TABLE "cortes_financieros" (
	"id" text PRIMARY KEY NOT NULL,
	"empresa_id" text,
	"obra_id" text,
	"fecha_corte" date NOT NULL,
	"saldo" bigint NOT NULL,
	"cuentas_por_pagar" bigint NOT NULL,
	"cuentas_por_cobrar" bigint NOT NULL,
	"notas" text DEFAULT '' NOT NULL,
	"registrado_por" text NOT NULL,
	"registrado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"anulado_en" timestamp with time zone,
	"anulado_por" text,
	"motivo_anulacion" text,
	CONSTRAINT "ck_corte_dueno" CHECK (("cortes_financieros"."empresa_id" is null) <> ("cortes_financieros"."obra_id" is null) and ("cortes_financieros"."empresa_id" is null or "cortes_financieros"."empresa_id" <> 'proyectos')),
	CONSTRAINT "ck_corte_cuentas" CHECK ("cortes_financieros"."cuentas_por_pagar" >= 0 and "cortes_financieros"."cuentas_por_cobrar" >= 0),
	CONSTRAINT "ck_corte_anulado" CHECK (("cortes_financieros"."anulado_en" is null) = ("cortes_financieros"."motivo_anulacion" is null))
);
--> statement-breakpoint
CREATE TABLE "empresas" (
	"id" text PRIMARY KEY NOT NULL,
	"razon_social" text DEFAULT '' NOT NULL,
	"nit" text DEFAULT '' NOT NULL,
	"direccion" text DEFAULT '' NOT NULL,
	"ciudad" text DEFAULT '' NOT NULL,
	"telefono" text DEFAULT '' NOT NULL,
	"correo" text DEFAULT '' NOT NULL,
	"representante_legal" text DEFAULT '' NOT NULL,
	"actualizado_por" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_empresas_id" CHECK ("empresas"."id" in ('elemental', 'occ', 'geolab', 'proyectos'))
);
--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "empresa" text;--> statement-breakpoint
ALTER TABLE "cortes_financieros" ADD CONSTRAINT "cortes_financieros_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cortes_financieros" ADD CONSTRAINT "cortes_financieros_obra_id_obras_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cortes_financieros" ADD CONSTRAINT "cortes_financieros_registrado_por_usuarios_id_fk" FOREIGN KEY ("registrado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cortes_financieros" ADD CONSTRAINT "cortes_financieros_anulado_por_usuarios_id_fk" FOREIGN KEY ("anulado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "empresas" ADD CONSTRAINT "empresas_actualizado_por_usuarios_id_fk" FOREIGN KEY ("actualizado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ux_corte_dueno_fecha" ON "cortes_financieros" USING btree (coalesce("empresa_id", "obra_id"),"fecha_corte") WHERE anulado_en is null;--> statement-breakpoint
CREATE INDEX "ix_corte_empresa" ON "cortes_financieros" USING btree ("empresa_id","fecha_corte");--> statement-breakpoint
CREATE INDEX "ix_corte_obra" ON "cortes_financieros" USING btree ("obra_id","fecha_corte");--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "ck_usuarios_empresa" CHECK ("usuarios"."empresa" is null or "usuarios"."empresa" in ('elemental', 'occ', 'geolab', 'proyectos'));--> statement-breakpoint
-- Spec 033: las cuatro empresas del grupo son fijas (RF-31); se siembran vacías. Igual en
-- las dos bases, y repetirla no falla.
INSERT INTO "empresas" ("id") VALUES ('elemental'), ('occ'), ('geolab'), ('proyectos') ON CONFLICT ("id") DO NOTHING;
