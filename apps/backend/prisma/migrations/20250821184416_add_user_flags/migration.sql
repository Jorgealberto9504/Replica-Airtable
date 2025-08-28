-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "passwordUpdatedAt" TIMESTAMP(3);
