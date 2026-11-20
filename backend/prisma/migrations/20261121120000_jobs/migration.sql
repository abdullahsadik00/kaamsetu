-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('SERVICE', 'REPAIR', 'INSTALLATION', 'UNINSTALLATION', 'GAS_FILLING', 'OTHER');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('NEW', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TimeSlot" AS ENUM ('MORNING', 'AFTERNOON', 'EVENING');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "nextJobNumber" INTEGER NOT NULL DEFAULT 1001;

-- CreateTable
CREATE TABLE "ServiceJob" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "jobNumber" INTEGER NOT NULL,
    "customerId" UUID NOT NULL,
    "siteId" UUID NOT NULL,
    "type" "JobType" NOT NULL DEFAULT 'SERVICE',
    "complaint" TEXT,
    "scheduledDate" DATE,
    "timeSlot" "TimeSlot",
    "assignedTeamId" UUID,
    "status" "JobStatus" NOT NULL DEFAULT 'NEW',
    "amountToCollect" INTEGER,
    "cancelReason" TEXT,
    "followUpOfJobId" UUID,
    "createdByMemberId" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobEquipment" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "equipmentId" UUID NOT NULL,

    CONSTRAINT "JobEquipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobAssignment" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "teamId" UUID NOT NULL,
    "assignedByMemberId" UUID NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassignedAt" TIMESTAMP(3),

    CONSTRAINT "JobAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobStatusHistory" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "fromStatus" "JobStatus",
    "toStatus" "JobStatus" NOT NULL,
    "byMemberId" UUID NOT NULL,
    "note" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceJob_organizationId_status_scheduledDate_idx" ON "ServiceJob"("organizationId", "status", "scheduledDate");

-- CreateIndex
CREATE INDEX "ServiceJob_organizationId_assignedTeamId_idx" ON "ServiceJob"("organizationId", "assignedTeamId");

-- CreateIndex
CREATE INDEX "ServiceJob_organizationId_customerId_idx" ON "ServiceJob"("organizationId", "customerId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceJob_organizationId_jobNumber_key" ON "ServiceJob"("organizationId", "jobNumber");

-- CreateIndex
CREATE UNIQUE INDEX "JobEquipment_jobId_equipmentId_key" ON "JobEquipment"("jobId", "equipmentId");

-- CreateIndex
CREATE INDEX "JobAssignment_jobId_idx" ON "JobAssignment"("jobId");

-- CreateIndex
CREATE INDEX "JobStatusHistory_jobId_at_idx" ON "JobStatusHistory"("jobId", "at");

-- AddForeignKey
ALTER TABLE "ServiceJob" ADD CONSTRAINT "ServiceJob_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobEquipment" ADD CONSTRAINT "JobEquipment_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ServiceJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobAssignment" ADD CONSTRAINT "JobAssignment_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ServiceJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobStatusHistory" ADD CONSTRAINT "JobStatusHistory_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ServiceJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

