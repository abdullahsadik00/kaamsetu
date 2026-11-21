-- CreateEnum
CREATE TYPE "EnquirySource" AS ENUM ('WHATSAPP', 'PHONE', 'WALK_IN', 'SERVICE_CENTRE', 'B2B', 'OTHER');

-- CreateEnum
CREATE TYPE "EnquiryStatus" AS ENUM ('OPEN', 'CONVERTED', 'CLOSED');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "nextRequestNumber" INTEGER NOT NULL DEFAULT 201;

-- AlterTable
ALTER TABLE "ServiceJob" ADD COLUMN     "serviceRequestId" UUID;

-- CreateTable
CREATE TABLE "ServiceRequest" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "requestNumber" INTEGER NOT NULL,
    "customerId" UUID NOT NULL,
    "siteId" UUID NOT NULL,
    "source" "EnquirySource" NOT NULL DEFAULT 'WHATSAPP',
    "type" "JobType" NOT NULL DEFAULT 'SERVICE',
    "complaint" TEXT,
    "preferredDate" DATE,
    "preferredSlot" "TimeSlot",
    "status" "EnquiryStatus" NOT NULL DEFAULT 'OPEN',
    "closeReason" TEXT,
    "createdByMemberId" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceRequestEquipment" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "equipmentId" UUID NOT NULL,

    CONSTRAINT "ServiceRequestEquipment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceRequest_organizationId_status_createdAt_idx" ON "ServiceRequest"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceRequest_organizationId_requestNumber_key" ON "ServiceRequest"("organizationId", "requestNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceRequestEquipment_requestId_equipmentId_key" ON "ServiceRequestEquipment"("requestId", "equipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceJob_serviceRequestId_key" ON "ServiceJob"("serviceRequestId");

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequestEquipment" ADD CONSTRAINT "ServiceRequestEquipment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ServiceRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

