/*
  Warnings:

  - A unique constraint covering the columns `[ownerId,name]` on the table `Base` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Base_ownerId_name_key" ON "public"."Base"("ownerId", "name");
