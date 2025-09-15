-- CreateEnum
CREATE TYPE "public"."FieldType" AS ENUM ('TEXT', 'LONG_TEXT', 'NUMBER', 'CURRENCY', 'CHECKBOX', 'DATE', 'DATETIME', 'SINGLE_SELECT', 'MULTI_SELECT');

-- CreateTable
CREATE TABLE "public"."Field" (
    "id" SERIAL NOT NULL,
    "tableId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."FieldType" NOT NULL,
    "config" JSONB,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,
    "isTrashed" BOOLEAN NOT NULL DEFAULT false,
    "trashedAt" TIMESTAMP(3),

    CONSTRAINT "Field_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FieldOption" (
    "id" SERIAL NOT NULL,
    "fieldId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FieldOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RecordRow" (
    "id" SERIAL NOT NULL,
    "tableId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,
    "isTrashed" BOOLEAN NOT NULL DEFAULT false,
    "trashedAt" TIMESTAMP(3),

    CONSTRAINT "RecordRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RecordCell" (
    "id" SERIAL NOT NULL,
    "recordId" INTEGER NOT NULL,
    "fieldId" INTEGER NOT NULL,
    "stringValue" TEXT,
    "numberValue" DECIMAL(65,30),
    "boolValue" BOOLEAN,
    "dateValue" TIMESTAMP(3),
    "datetimeValue" TIMESTAMP(3),
    "optionId" INTEGER,

    CONSTRAINT "RecordCell_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RecordCellOption" (
    "recordId" INTEGER NOT NULL,
    "fieldId" INTEGER NOT NULL,
    "optionId" INTEGER NOT NULL,

    CONSTRAINT "RecordCellOption_pkey" PRIMARY KEY ("recordId","fieldId","optionId")
);

-- CreateIndex
CREATE INDEX "Field_tableId_position_idx" ON "public"."Field"("tableId", "position");

-- CreateIndex
CREATE INDEX "Field_isTrashed_idx" ON "public"."Field"("isTrashed");

-- CreateIndex
CREATE INDEX "Field_trashedAt_idx" ON "public"."Field"("trashedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Field_tableId_name_isTrashed_key" ON "public"."Field"("tableId", "name", "isTrashed");

-- CreateIndex
CREATE INDEX "FieldOption_fieldId_position_idx" ON "public"."FieldOption"("fieldId", "position");

-- CreateIndex
CREATE INDEX "RecordRow_tableId_idx" ON "public"."RecordRow"("tableId");

-- CreateIndex
CREATE INDEX "RecordRow_updatedAt_idx" ON "public"."RecordRow"("updatedAt");

-- CreateIndex
CREATE INDEX "RecordRow_isTrashed_idx" ON "public"."RecordRow"("isTrashed");

-- CreateIndex
CREATE INDEX "RecordRow_trashedAt_idx" ON "public"."RecordRow"("trashedAt");

-- CreateIndex
CREATE INDEX "RecordCell_fieldId_idx" ON "public"."RecordCell"("fieldId");

-- CreateIndex
CREATE INDEX "RecordCell_optionId_idx" ON "public"."RecordCell"("optionId");

-- CreateIndex
CREATE INDEX "RecordCell_numberValue_idx" ON "public"."RecordCell"("numberValue");

-- CreateIndex
CREATE INDEX "RecordCell_datetimeValue_idx" ON "public"."RecordCell"("datetimeValue");

-- CreateIndex
CREATE UNIQUE INDEX "RecordCell_recordId_fieldId_key" ON "public"."RecordCell"("recordId", "fieldId");

-- CreateIndex
CREATE INDEX "RecordCellOption_fieldId_idx" ON "public"."RecordCellOption"("fieldId");

-- CreateIndex
CREATE INDEX "RecordCellOption_optionId_idx" ON "public"."RecordCellOption"("optionId");

-- AddForeignKey
ALTER TABLE "public"."Field" ADD CONSTRAINT "Field_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Field" ADD CONSTRAINT "Field_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Field" ADD CONSTRAINT "Field_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "public"."TableDef"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FieldOption" ADD CONSTRAINT "FieldOption_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "public"."Field"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecordRow" ADD CONSTRAINT "RecordRow_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecordRow" ADD CONSTRAINT "RecordRow_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecordRow" ADD CONSTRAINT "RecordRow_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "public"."TableDef"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecordCell" ADD CONSTRAINT "RecordCell_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "public"."RecordRow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecordCell" ADD CONSTRAINT "RecordCell_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "public"."Field"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecordCell" ADD CONSTRAINT "RecordCell_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "public"."FieldOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecordCellOption" ADD CONSTRAINT "RecordCellOption_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "public"."RecordRow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecordCellOption" ADD CONSTRAINT "RecordCellOption_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "public"."Field"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecordCellOption" ADD CONSTRAINT "RecordCellOption_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "public"."FieldOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;
