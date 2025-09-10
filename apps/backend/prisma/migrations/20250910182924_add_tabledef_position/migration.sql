-- AlterTable
ALTER TABLE "public"."TableDef" ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "TableDef_baseId_position_idx" ON "public"."TableDef"("baseId", "position");
