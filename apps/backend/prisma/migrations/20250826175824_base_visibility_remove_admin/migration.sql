-- 0) Normalizar filas ADMIN -> EDITOR (si existen)
UPDATE "BaseMember" SET "role" = 'EDITOR' WHERE "role" = 'ADMIN';

-- 1) Quitar DEFAULT antes de cambiar el tipo de la columna
ALTER TABLE "BaseMember"
  ALTER COLUMN "role" DROP DEFAULT;

-- 2) Crear enum nuevo sin 'ADMIN' y castear la columna
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BaseRole_new') THEN
    DROP TYPE "BaseRole_new";
  END IF;
END$$;

CREATE TYPE "BaseRole_new" AS ENUM ('EDITOR', 'COMMENTER', 'VIEWER');

ALTER TABLE "BaseMember"
  ALTER COLUMN "role" TYPE "BaseRole_new"
  USING ("role"::text::"BaseRole_new");

-- 3) Reemplazar el tipo original por el nuevo
DROP TYPE "BaseRole";
ALTER TYPE "BaseRole_new" RENAME TO "BaseRole";

-- 4) (¡Clave!) Crear el enum BaseVisibility si no existe (shadow DB no lo tiene)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BaseVisibility') THEN
    CREATE TYPE "BaseVisibility" AS ENUM ('PUBLIC', 'PRIVATE');
  END IF;
END$$;

-- 5) Agregar columnas en Base si faltan
ALTER TABLE "Base"
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "visibility" "BaseVisibility" NOT NULL DEFAULT 'PRIVATE';

-- 6) Índices útiles
CREATE INDEX IF NOT EXISTS "Base_ownerId_idx" ON "Base"("ownerId");
CREATE INDEX IF NOT EXISTS "Base_visibility_idx" ON "Base"("visibility");

-- 7) Restaurar DEFAULT de BaseMember.role
ALTER TABLE "BaseMember"
  ALTER COLUMN "role" SET DEFAULT 'VIEWER';