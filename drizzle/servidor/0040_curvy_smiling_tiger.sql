-- Spec 041, escrita a mano. Ver specs/041-cargos-de-obra/plan.md, «Decisiones técnicas».
--
-- 1. drizzle-kit, ante un valor de enum renombrado, propone borrar el tipo y volver a crearlo con un
--    cast de texto, que falla con las filas que tienen el valor viejo. RENAME VALUE es una sola
--    sentencia y conserva cada fila, su contraseña y su sesión (RF-50), como la 0039.
-- 2. El migrador de neon-http ejecuta cada sentencia por separado, **sin transacción**: si esto falla
--    a medias, queda a medias y se vuelve a correr. Por eso cada sentencia se puede repetir sin
--    daño: el rename va con guarda en pg_enum, los ADD VALUE con IF NOT EXISTS, las tablas y los
--    índices con IF NOT EXISTS, y los INSERT con NOT EXISTS. La otra cara: el ADD VALUE ya está
--    confirmado cuando corre el UPDATE que usa el valor nuevo.
-- 3. El orden de los valores nuevos es el de ROLES en permisos.ts (director_proyectos, luego
--    director_obra): ADD VALUE solo añade al final.
-- 4. El paso de las personas imita `accesoTrasLaMigracion` (src/shared/rules/cargos-de-obra.ts),
--    que es la regla probada. Si una cambia, la otra también.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'rol_usuario' AND e.enumlabel = 'supervisor'
  ) THEN
    ALTER TYPE "public"."rol_usuario" RENAME VALUE 'supervisor' TO 'residente';
  END IF;
END $$;--> statement-breakpoint
ALTER TYPE "public"."rol_usuario" ADD VALUE IF NOT EXISTS 'director_proyectos';--> statement-breakpoint
ALTER TYPE "public"."rol_usuario" ADD VALUE IF NOT EXISTS 'director_obra';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "usuarios_accesos" (
	"id" text PRIMARY KEY NOT NULL,
	"usuario_id" text NOT NULL CONSTRAINT "usuarios_accesos_usuario_id_usuarios_id_fk" REFERENCES "public"."usuarios"("id"),
	"rol" text NOT NULL,
	"cargo" text,
	"desde" timestamp with time zone DEFAULT now() NOT NULL,
	"hasta" timestamp with time zone,
	"cambiado_por" text CONSTRAINT "usuarios_accesos_cambiado_por_usuarios_id_fk" REFERENCES "public"."usuarios"("id"),
	"revisar" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "usuarios_obras" (
	"id" text PRIMARY KEY NOT NULL,
	"usuario_id" text NOT NULL CONSTRAINT "usuarios_obras_usuario_id_usuarios_id_fk" REFERENCES "public"."usuarios"("id"),
	"obra_id" text NOT NULL CONSTRAINT "usuarios_obras_obra_id_obras_id_fk" REFERENCES "public"."obras"("id"),
	"desde" timestamp with time zone DEFAULT now() NOT NULL,
	"hasta" timestamp with time zone,
	"asignado_por" text CONSTRAINT "usuarios_obras_asignado_por_usuarios_id_fk" REFERENCES "public"."usuarios"("id"),
	"retirado_por" text CONSTRAINT "usuarios_obras_retirado_por_usuarios_id_fk" REFERENCES "public"."usuarios"("id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ux_usuarios_accesos_vigente" ON "usuarios_accesos" USING btree ("usuario_id") WHERE hasta is null;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_usuarios_accesos_usuario" ON "usuarios_accesos" USING btree ("usuario_id","desde");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ux_usuarios_obras_vigente" ON "usuarios_obras" USING btree ("usuario_id","obra_id") WHERE hasta is null;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_usuarios_obras_obra" ON "usuarios_obras" USING btree ("obra_id") WHERE hasta is null;--> statement-breakpoint
-- RF-46: cargo «Director» → Director de Obra. Tras el rename, los de antes son 'residente'.
UPDATE "usuarios" SET "rol" = 'director_obra' WHERE "rol" = 'residente' AND "cargo" = 'director';--> statement-breakpoint
-- RF-49: el Director de Obra conserva la obra que tenía, ahora en usuarios_obras.
INSERT INTO "usuarios_obras" ("id", "usuario_id", "obra_id", "desde")
SELECT gen_random_uuid()::text, u."id", u."obra_id", now()
FROM "usuarios" u
WHERE u."rol" = 'director_obra' AND u."obra_id" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "usuarios_obras" uo
    WHERE uo."usuario_id" = u."id" AND uo."obra_id" = u."obra_id" AND uo."hasta" IS NULL
  );--> statement-breakpoint
-- Para el Director de Obra, usuarios_obras es la única fuente: su obra_id queda vacío (plan, Datos).
UPDATE "usuarios" u SET "obra_id" = NULL
WHERE u."rol" = 'director_obra' AND u."obra_id" IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM "usuarios_obras" uo
    WHERE uo."usuario_id" = u."id" AND uo."obra_id" = u."obra_id" AND uo."hasta" IS NULL
  );--> statement-breakpoint
-- RF-42, RF-48, RF-51, RF-52, RF-65: la historia de accesos de cada persona, en **una** sentencia
-- para que el fin de «Residente / Director» y el principio del acceso nuevo lleven el mismo now().
-- Quien era Residente / Director (hoy residente o director_obra) lleva una fila cerrada con
-- 'supervisor' desde que se registró; todos llevan su fila vigente. `revisar` marca a quien pasó
-- a Residente sin ser «Residente 1» o «Residente 2», y a quien quedó sin obra.
WITH sin_historia AS (
  SELECT u.* FROM "usuarios" u
  WHERE NOT EXISTS (SELECT 1 FROM "usuarios_accesos" a WHERE a."usuario_id" = u."id")
),
de_antes AS (
  INSERT INTO "usuarios_accesos" ("id", "usuario_id", "rol", "cargo", "desde", "hasta")
  SELECT gen_random_uuid()::text, s."id", 'supervisor', s."cargo", s."creado_en", now()
  FROM sin_historia s
  WHERE s."rol" IN ('residente', 'director_obra')
  RETURNING 1
)
INSERT INTO "usuarios_accesos" ("id", "usuario_id", "rol", "cargo", "desde", "revisar")
SELECT
  gen_random_uuid()::text,
  s."id",
  s."rol"::text,
  s."cargo",
  CASE WHEN s."rol" IN ('residente', 'director_obra') THEN now() ELSE s."creado_en" END,
  (
    (s."rol" = 'residente' AND (s."cargo" IS NULL OR s."cargo" NOT IN ('residente_1', 'residente_2')))
    OR (s."rol" = 'residente' AND s."obra_id" IS NULL)
    OR (s."rol" = 'director_obra' AND NOT EXISTS (
      SELECT 1 FROM "usuarios_obras" uo WHERE uo."usuario_id" = s."id" AND uo."hasta" IS NULL
    ))
  )
FROM sin_historia s;
