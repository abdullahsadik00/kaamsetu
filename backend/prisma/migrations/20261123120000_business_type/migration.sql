-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('SOLO', 'CREW', 'VENDOR');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "businessType" "BusinessType" NOT NULL DEFAULT 'VENDOR';

