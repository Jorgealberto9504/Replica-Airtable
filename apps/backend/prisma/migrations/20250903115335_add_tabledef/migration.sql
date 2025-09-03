-- CreateTable
CREATE TABLE "public"."TableDef" (
    "id" SERIAL NOT NULL,
    "baseId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TableDef_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TableDef_baseId_idx" ON "public"."TableDef"("baseId");

-- CreateIndex
CREATE UNIQUE INDEX "TableDef_baseId_name_key" ON "public"."TableDef"("baseId", "name");

-- AddForeignKey
ALTER TABLE "public"."TableDef" ADD CONSTRAINT "TableDef_baseId_fkey" FOREIGN KEY ("baseId") REFERENCES "public"."Base"("id") ON DELETE CASCADE ON UPDATE CASCADE;
