-- CreateEnum
CREATE TYPE "public"."PlatformRole" AS ENUM ('USER', 'SYSADMIN');

-- CreateEnum
CREATE TYPE "public"."BaseRole" AS ENUM ('EDITOR', 'COMMENTER', 'VIEWER');

-- CreateEnum
CREATE TYPE "public"."BaseVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "public"."FieldType" AS ENUM ('TEXT', 'LONG_TEXT', 'NUMBER', 'CURRENCY', 'CHECKBOX', 'DATE', 'DATETIME');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "passwordUpdatedAt" TIMESTAMP(3),
    "platformRole" "public"."PlatformRole" NOT NULL DEFAULT 'USER',
    "canCreateBases" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Workspace" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "isTrashed" BOOLEAN NOT NULL DEFAULT false,
    "trashedAt" TIMESTAMP(3),

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Base" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workspaceId" INTEGER,
    "ownerId" INTEGER NOT NULL,
    "visibility" "public"."BaseVisibility" NOT NULL DEFAULT 'PRIVATE',
    "isTrashed" BOOLEAN NOT NULL DEFAULT false,
    "trashedAt" TIMESTAMP(3),

    CONSTRAINT "Base_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BaseMember" (
    "id" SERIAL NOT NULL,
    "baseId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "role" "public"."BaseRole" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BaseMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TableDef" (
    "id" SERIAL NOT NULL,
    "baseId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isTrashed" BOOLEAN NOT NULL DEFAULT false,
    "trashedAt" TIMESTAMP(3),

    CONSTRAINT "TableDef_pkey" PRIMARY KEY ("id")
);

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

    CONSTRAINT "RecordCell_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "Workspace_ownerId_idx" ON "public"."Workspace"("ownerId");

-- CreateIndex
CREATE INDEX "Workspace_isTrashed_idx" ON "public"."Workspace"("isTrashed");

-- CreateIndex
CREATE INDEX "Workspace_trashedAt_idx" ON "public"."Workspace"("trashedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_ownerId_name_isTrashed_key" ON "public"."Workspace"("ownerId", "name", "isTrashed");

-- CreateIndex
CREATE INDEX "Base_ownerId_idx" ON "public"."Base"("ownerId");

-- CreateIndex
CREATE INDEX "Base_visibility_idx" ON "public"."Base"("visibility");

-- CreateIndex
CREATE INDEX "Base_workspaceId_idx" ON "public"."Base"("workspaceId");

-- CreateIndex
CREATE INDEX "Base_trashedAt_idx" ON "public"."Base"("trashedAt");

-- CreateIndex
CREATE INDEX "Base_isTrashed_idx" ON "public"."Base"("isTrashed");

-- CreateIndex
CREATE UNIQUE INDEX "Base_ownerId_name_isTrashed_key" ON "public"."Base"("ownerId", "name", "isTrashed");

-- CreateIndex
CREATE UNIQUE INDEX "BaseMember_baseId_userId_key" ON "public"."BaseMember"("baseId", "userId");

-- CreateIndex
CREATE INDEX "TableDef_baseId_idx" ON "public"."TableDef"("baseId");

-- CreateIndex
CREATE INDEX "TableDef_trashedAt_idx" ON "public"."TableDef"("trashedAt");

-- CreateIndex
CREATE INDEX "TableDef_isTrashed_idx" ON "public"."TableDef"("isTrashed");

-- CreateIndex
CREATE INDEX "TableDef_baseId_position_idx" ON "public"."TableDef"("baseId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "TableDef_baseId_name_isTrashed_key" ON "public"."TableDef"("baseId", "name", "isTrashed");

-- CreateIndex
CREATE INDEX "Field_tableId_position_idx" ON "public"."Field"("tableId", "position");

-- CreateIndex
CREATE INDEX "Field_isTrashed_idx" ON "public"."Field"("isTrashed");

-- CreateIndex
CREATE INDEX "Field_trashedAt_idx" ON "public"."Field"("trashedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Field_tableId_name_isTrashed_key" ON "public"."Field"("tableId", "name", "isTrashed");

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
CREATE INDEX "RecordCell_numberValue_idx" ON "public"."RecordCell"("numberValue");

-- CreateIndex
CREATE INDEX "RecordCell_datetimeValue_idx" ON "public"."RecordCell"("datetimeValue");

-- CreateIndex
CREATE UNIQUE INDEX "RecordCell_recordId_fieldId_key" ON "public"."RecordCell"("recordId", "fieldId");

-- AddForeignKey
ALTER TABLE "public"."Workspace" ADD CONSTRAINT "Workspace_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Base" ADD CONSTRAINT "Base_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Base" ADD CONSTRAINT "Base_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BaseMember" ADD CONSTRAINT "BaseMember_baseId_fkey" FOREIGN KEY ("baseId") REFERENCES "public"."Base"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BaseMember" ADD CONSTRAINT "BaseMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TableDef" ADD CONSTRAINT "TableDef_baseId_fkey" FOREIGN KEY ("baseId") REFERENCES "public"."Base"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Field" ADD CONSTRAINT "Field_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Field" ADD CONSTRAINT "Field_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Field" ADD CONSTRAINT "Field_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "public"."TableDef"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
