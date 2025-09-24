-- CreateTable
CREATE TABLE "public"."Comment" (
    "id" SERIAL NOT NULL,
    "recordId" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,
    "isTrashed" BOOLEAN NOT NULL DEFAULT false,
    "trashedAt" TIMESTAMP(3),

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Comment_recordId_createdAt_idx" ON "public"."Comment"("recordId", "createdAt");

-- CreateIndex
CREATE INDEX "Comment_isTrashed_idx" ON "public"."Comment"("isTrashed");

-- CreateIndex
CREATE INDEX "Comment_trashedAt_idx" ON "public"."Comment"("trashedAt");

-- AddForeignKey
ALTER TABLE "public"."Comment" ADD CONSTRAINT "Comment_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "public"."RecordRow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Comment" ADD CONSTRAINT "Comment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Comment" ADD CONSTRAINT "Comment_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
