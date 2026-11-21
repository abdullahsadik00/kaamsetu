-- CreateEnum
CREATE TYPE "ReportOutcome" AS ENUM ('COMPLETED', 'NEEDS_FOLLOW_UP', 'NOT_COMPLETED');

-- CreateEnum
CREATE TYPE "CollectionMode" AS ENUM ('CASH', 'UPI');

-- CreateEnum
CREATE TYPE "CollectionStatus" AS ENUM ('WITH_TEAM', 'CONFIRMED');

-- CreateTable
CREATE TABLE "ServiceReport" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "byMemberId" UUID NOT NULL,
    "outcome" "ReportOutcome" NOT NULL,
    "note" TEXT,
    "work" JSONB NOT NULL DEFAULT '[]',
    "parts" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashCollection" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "collectedByMemberId" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "mode" "CollectionMode" NOT NULL,
    "status" "CollectionStatus" NOT NULL DEFAULT 'WITH_TEAM',
    "confirmedByMemberId" UUID,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashCollection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ServiceReport_jobId_key" ON "ServiceReport"("jobId");

-- CreateIndex
CREATE INDEX "ServiceReport_organizationId_createdAt_idx" ON "ServiceReport"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "CashCollection_organizationId_status_idx" ON "CashCollection"("organizationId", "status");

-- CreateIndex
CREATE INDEX "CashCollection_jobId_idx" ON "CashCollection"("jobId");

-- AddForeignKey
ALTER TABLE "ServiceReport" ADD CONSTRAINT "ServiceReport_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ServiceJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashCollection" ADD CONSTRAINT "CashCollection_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ServiceJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
