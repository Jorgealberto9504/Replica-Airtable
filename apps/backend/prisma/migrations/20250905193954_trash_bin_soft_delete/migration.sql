/*
  Warnings:

  - A unique constraint covering the columns `[ownerId,name,isTrashed]` on the table `Base` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[baseId,name,isTrashed]` on the table `TableDef` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."Base_ownerId_name_key";

-- DropIndex
DROP INDEX "public"."TableDef_baseId_name_key";

-- AlterTable
ALTER TABLE "public"."Base" ADD COLUMN     "isTrashed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "trashedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."TableDef" ADD COLUMN     "isTrashed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "trashedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Base_trashedAt_idx" ON "public"."Base"("trashedAt");

-- CreateIndex
CREATE INDEX "Base_isTrashed_idx" ON "public"."Base"("isTrashed");

-- CreateIndex
CREATE UNIQUE INDEX "Base_ownerId_name_isTrashed_key" ON "public"."Base"("ownerId", "name", "isTrashed");

-- CreateIndex
CREATE INDEX "TableDef_trashedAt_idx" ON "public"."TableDef"("trashedAt");

-- CreateIndex
CREATE INDEX "TableDef_isTrashed_idx" ON "public"."TableDef"("isTrashed");

-- CreateIndex
CREATE UNIQUE INDEX "TableDef_baseId_name_isTrashed_key" ON "public"."TableDef"("baseId", "name", "isTrashed");
