-- CreateEnum
CREATE TYPE "public"."AuditAction" AS ENUM ('BASE_CREATED', 'BASE_RENAMED', 'BASE_VISIBILITY_CHANGED', 'BASE_TRASHED', 'BASE_RESTORED', 'TABLE_CREATED', 'TABLE_RENAMED', 'TABLE_TRASHED', 'TABLE_RESTORED', 'TABLE_REORDERED', 'FIELD_CREATED', 'FIELD_UPDATED', 'FIELD_TRASHED', 'FIELD_RESTORED', 'RECORD_CREATED', 'RECORD_UPDATED', 'RECORD_TRASHED', 'RECORD_RESTORED', 'COMMENT_CREATED', 'COMMENT_EDITED', 'COMMENT_TRASHED', 'MEMBER_INVITED', 'MEMBER_ROLE_CHANGED', 'MEMBER_REMOVED');

-- CreateTable
CREATE TABLE "public"."AuditEvent" (
    "id" BIGSERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER,
    "ip" TEXT,
    "baseId" INTEGER NOT NULL,
    "tableId" INTEGER,
    "recordId" INTEGER,
    "fieldId" INTEGER,
    "action" "public"."AuditAction" NOT NULL,
    "summary" TEXT NOT NULL,
    "details" JSONB,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditEvent_baseId_createdAt_idx" ON "public"."AuditEvent"("baseId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_tableId_idx" ON "public"."AuditEvent"("tableId");

-- CreateIndex
CREATE INDEX "AuditEvent_recordId_idx" ON "public"."AuditEvent"("recordId");

-- CreateIndex
CREATE INDEX "AuditEvent_fieldId_idx" ON "public"."AuditEvent"("fieldId");

-- CreateIndex
CREATE INDEX "AuditEvent_userId_idx" ON "public"."AuditEvent"("userId");

-- AddForeignKey
ALTER TABLE "public"."AuditEvent" ADD CONSTRAINT "AuditEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditEvent" ADD CONSTRAINT "AuditEvent_baseId_fkey" FOREIGN KEY ("baseId") REFERENCES "public"."Base"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditEvent" ADD CONSTRAINT "AuditEvent_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "public"."TableDef"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditEvent" ADD CONSTRAINT "AuditEvent_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "public"."RecordRow"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditEvent" ADD CONSTRAINT "AuditEvent_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "public"."Field"("id") ON DELETE SET NULL ON UPDATE CASCADE;
