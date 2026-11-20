-- CreateTable
CREATE TABLE "SyncOperation" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "memberId" UUID NOT NULL,
    "operation" TEXT NOT NULL,
    "entityId" UUID NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "errorCode" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncOperation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SyncOperation_organizationId_receivedAt_idx" ON "SyncOperation"("organizationId", "receivedAt");

