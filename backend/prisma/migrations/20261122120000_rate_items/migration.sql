-- CreateTable
CREATE TABLE "RateItem" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "unitPrice" INTEGER NOT NULL,
    "gstRate" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RateItem_organizationId_active_name_idx" ON "RateItem"("organizationId", "active", "name");

-- AddForeignKey
ALTER TABLE "RateItem" ADD CONSTRAINT "RateItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

