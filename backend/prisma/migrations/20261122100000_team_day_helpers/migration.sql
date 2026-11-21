-- CreateTable
CREATE TABLE "TeamDayHelper" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "teamId" UUID NOT NULL,
    "organizationMemberId" UUID NOT NULL,
    "day" DATE NOT NULL,
    "createdByMemberId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedAt" TIMESTAMP(3),
    "removedByMemberId" UUID,

    CONSTRAINT "TeamDayHelper_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeamDayHelper_organizationId_day_idx" ON "TeamDayHelper"("organizationId", "day");

-- CreateIndex
CREATE INDEX "TeamDayHelper_organizationMemberId_day_idx" ON "TeamDayHelper"("organizationMemberId", "day");

-- CreateIndex
CREATE INDEX "TeamDayHelper_teamId_day_idx" ON "TeamDayHelper"("teamId", "day");

-- AddForeignKey
ALTER TABLE "TeamDayHelper" ADD CONSTRAINT "TeamDayHelper_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamDayHelper" ADD CONSTRAINT "TeamDayHelper_organizationMemberId_fkey" FOREIGN KEY ("organizationMemberId") REFERENCES "OrganizationMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- One-day helper swap (T4.6, D-038). Lending a helper to a team for a day, or
-- undoing it, touches the open (and recently finished) jobs of that day of the
-- team they go to and of their own teams, so those jobs get new change numbers
-- (D-035) and reach the phones again: the helper receives the borrowed team's
-- jobs, and their own team's jobs of that day come back as removals (and the
-- other way round on undo).
CREATE FUNCTION "ks_touch_day_helper_jobs"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE "ServiceJob" SET "updatedAt" = CURRENT_TIMESTAMP
  WHERE "organizationId" = NEW."organizationId"
    AND "scheduledDate" = NEW."day"
    AND ("assignedTeamId" = NEW."teamId" OR "assignedTeamId" IN (
      SELECT "teamId" FROM "TeamMember" WHERE "organizationMemberId" = NEW."organizationMemberId" AND "leftAt" IS NULL))
    AND ("status" IN ('NEW', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD') OR "completedAt" > CURRENT_TIMESTAMP - INTERVAL '2 days');
  RETURN NULL;
END $$;

CREATE TRIGGER "TeamDayHelper_sync_touch" AFTER INSERT OR UPDATE ON "TeamDayHelper"
FOR EACH ROW EXECUTE FUNCTION "ks_touch_day_helper_jobs"();

