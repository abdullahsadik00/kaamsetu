-- AlterTable
ALTER TABLE "ServiceJob" ADD COLUMN     "syncSeq" BIGINT NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "SyncOperation" ADD COLUMN     "payload" JSONB;

-- CreateTable
CREATE TABLE "SyncCounter" (
    "organizationId" UUID NOT NULL,
    "seq" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "SyncCounter_pkey" PRIMARY KEY ("organizationId")
);

-- CreateIndex
CREATE INDEX "ServiceJob_organizationId_syncSeq_idx" ON "ServiceJob"("organizationId", "syncSeq");

-- Sync cursor (T4.9, D-035, docs/09 §6). Every insert or update of a job takes
-- the business's next change number. The counter row stays locked until the
-- transaction commits, so change numbers of one business commit in order and
-- a phone that has seen number N has seen every change up to N.
CREATE FUNCTION "ks_job_sync_seq"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO "SyncCounter" ("organizationId", "seq") VALUES (NEW."organizationId", 1)
  ON CONFLICT ("organizationId") DO UPDATE SET "seq" = "SyncCounter"."seq" + 1
  RETURNING "seq" INTO NEW."syncSeq";
  RETURN NEW;
END $$;

CREATE TRIGGER "ServiceJob_sync_seq" BEFORE INSERT OR UPDATE ON "ServiceJob"
FOR EACH ROW EXECUTE FUNCTION "ks_job_sync_seq"();

-- Changes that show on a job card (customer name/phone, address, AC, team and
-- its members) touch the open (and recently finished) jobs they appear on, so
-- those jobs reach the phones again. Someone who left a team then receives the
-- team's jobs as removals.
CREATE FUNCTION "ks_touch_jobs"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME = 'Customer' THEN
    UPDATE "ServiceJob" SET "updatedAt" = CURRENT_TIMESTAMP WHERE "customerId" = NEW."id"
      AND ("status" IN ('NEW', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD') OR "completedAt" > CURRENT_TIMESTAMP - INTERVAL '2 days');
  ELSIF TG_TABLE_NAME = 'Site' THEN
    UPDATE "ServiceJob" SET "updatedAt" = CURRENT_TIMESTAMP WHERE "siteId" = NEW."id"
      AND ("status" IN ('NEW', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD') OR "completedAt" > CURRENT_TIMESTAMP - INTERVAL '2 days');
  ELSIF TG_TABLE_NAME = 'Team' THEN
    UPDATE "ServiceJob" SET "updatedAt" = CURRENT_TIMESTAMP WHERE "assignedTeamId" = NEW."id"
      AND ("status" IN ('NEW', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD') OR "completedAt" > CURRENT_TIMESTAMP - INTERVAL '2 days');
  ELSIF TG_TABLE_NAME = 'TeamMember' THEN
    UPDATE "ServiceJob" SET "updatedAt" = CURRENT_TIMESTAMP WHERE "assignedTeamId" = NEW."teamId"
      AND ("status" IN ('NEW', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD') OR "completedAt" > CURRENT_TIMESTAMP - INTERVAL '2 days');
  ELSIF TG_TABLE_NAME = 'Equipment' THEN
    UPDATE "ServiceJob" SET "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" IN (SELECT "jobId" FROM "JobEquipment" WHERE "equipmentId" = NEW."id")
      AND ("status" IN ('NEW', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD') OR "completedAt" > CURRENT_TIMESTAMP - INTERVAL '2 days');
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER "Customer_sync_touch" AFTER UPDATE ON "Customer"
FOR EACH ROW WHEN (OLD.* IS DISTINCT FROM NEW.*) EXECUTE FUNCTION "ks_touch_jobs"();
CREATE TRIGGER "Site_sync_touch" AFTER UPDATE ON "Site"
FOR EACH ROW WHEN (OLD.* IS DISTINCT FROM NEW.*) EXECUTE FUNCTION "ks_touch_jobs"();
CREATE TRIGGER "Equipment_sync_touch" AFTER UPDATE ON "Equipment"
FOR EACH ROW WHEN (OLD.* IS DISTINCT FROM NEW.*) EXECUTE FUNCTION "ks_touch_jobs"();
CREATE TRIGGER "Team_sync_touch" AFTER UPDATE ON "Team"
FOR EACH ROW WHEN (OLD.* IS DISTINCT FROM NEW.*) EXECUTE FUNCTION "ks_touch_jobs"();
CREATE TRIGGER "TeamMember_sync_touch" AFTER INSERT OR UPDATE ON "TeamMember"
FOR EACH ROW EXECUTE FUNCTION "ks_touch_jobs"();
