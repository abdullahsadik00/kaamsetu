-- CreateEnum
CREATE TYPE "JobUpdateType" AS ENUM ('APPOINTMENT_FIXED', 'PART_NEEDED', 'NOTE');

-- AlterTable
ALTER TABLE "OrganizationMember" ADD COLUMN     "updatesSeenAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "JobUpdate" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "type" "JobUpdateType" NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "byMemberId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobUpdate_organizationId_receivedAt_idx" ON "JobUpdate"("organizationId", "receivedAt");

-- CreateIndex
CREATE INDEX "JobUpdate_jobId_receivedAt_idx" ON "JobUpdate"("jobId", "receivedAt");

-- CreateIndex
CREATE INDEX "JobStatusHistory_organizationId_at_idx" ON "JobStatusHistory"("organizationId", "at");

-- CreateIndex
CREATE INDEX "SyncOperation_organizationId_entityId_idx" ON "SyncOperation"("organizationId", "entityId");

-- AddForeignKey
ALTER TABLE "JobUpdate" ADD CONSTRAINT "JobUpdate_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ServiceJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

