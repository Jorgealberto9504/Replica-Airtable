-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."FieldType" ADD VALUE 'TIME';
ALTER TYPE "public"."FieldType" ADD VALUE 'SINGLE_SELECT';
ALTER TYPE "public"."FieldType" ADD VALUE 'MULTI_SELECT';

-- AlterTable
ALTER TABLE "public"."RecordCell" ADD COLUMN     "selectOptionId" INTEGER,
ADD COLUMN     "timeMinutes" INTEGER;

-- CreateTable
CREATE TABLE "public"."SelectOption" (
    "id" SERIAL NOT NULL,
    "fieldId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isTrashed" BOOLEAN NOT NULL DEFAULT false,
    "trashedAt" TIMESTAMP(3),

    CONSTRAINT "SelectOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RecordCellOption" (
    "recordCellId" INTEGER NOT NULL,
    "optionId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecordCellOption_pkey" PRIMARY KEY ("recordCellId","optionId")
);

-- CreateIndex
CREATE INDEX "SelectOption_fieldId_position_idx" ON "public"."SelectOption"("fieldId", "position");

-- CreateIndex
CREATE INDEX "SelectOption_isTrashed_idx" ON "public"."SelectOption"("isTrashed");

-- CreateIndex
CREATE INDEX "SelectOption_trashedAt_idx" ON "public"."SelectOption"("trashedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SelectOption_fieldId_label_isTrashed_key" ON "public"."SelectOption"("fieldId", "label", "isTrashed");

-- CreateIndex
CREATE INDEX "RecordCellOption_optionId_idx" ON "public"."RecordCellOption"("optionId");

-- AddForeignKey
ALTER TABLE "public"."SelectOption" ADD CONSTRAINT "SelectOption_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "public"."Field"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecordCell" ADD CONSTRAINT "RecordCell_selectOptionId_fkey" FOREIGN KEY ("selectOptionId") REFERENCES "public"."SelectOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecordCellOption" ADD CONSTRAINT "RecordCellOption_recordCellId_fkey" FOREIGN KEY ("recordCellId") REFERENCES "public"."RecordCell"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecordCellOption" ADD CONSTRAINT "RecordCellOption_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "public"."SelectOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;
