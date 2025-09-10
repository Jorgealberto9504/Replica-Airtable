-- AlterTable
ALTER TABLE "public"."Base" ADD COLUMN     "workspaceId" INTEGER;

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

-- CreateIndex
CREATE INDEX "Workspace_ownerId_idx" ON "public"."Workspace"("ownerId");

-- CreateIndex
CREATE INDEX "Workspace_isTrashed_idx" ON "public"."Workspace"("isTrashed");

-- CreateIndex
CREATE INDEX "Workspace_trashedAt_idx" ON "public"."Workspace"("trashedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_ownerId_name_isTrashed_key" ON "public"."Workspace"("ownerId", "name", "isTrashed");

-- CreateIndex
CREATE INDEX "Base_workspaceId_idx" ON "public"."Base"("workspaceId");

-- AddForeignKey
ALTER TABLE "public"."Workspace" ADD CONSTRAINT "Workspace_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Base" ADD CONSTRAINT "Base_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
