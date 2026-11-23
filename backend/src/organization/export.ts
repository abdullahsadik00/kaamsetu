import type { PrismaClient } from '../generated/prisma/client.js';

/** Bumped when the shape changes, so a reader knows what it has. */
export const EXPORT_VERSION = 1;

/**
 * Everything a business has entered, as plain JSON (doc 03, doc 10 §4:
 * business data export). Logins are left out: Google ids, phones' sessions,
 * OTPs, invite codes and the sync log are not the business's records.
 * Used by GET /organization/export and `npm run pilot -- export`.
 */
export async function exportBusiness(db: PrismaClient, organizationId: string) {
  const where = { organizationId };
  const business = await db.organization.findUniqueOrThrow({
    where: { id: organizationId },
    omit: { logoKey: true, nextJobNumber: true, nextRequestNumber: true, nextBillNumber: true, nextQuoteNumber: true },
  });
  const [
    people,
    customers,
    sites,
    acs,
    teams,
    teamMembers,
    dayHelpers,
    enquiries,
    enquiryAcs,
    jobs,
    jobAcs,
    assignments,
    statusHistory,
    updates,
    reports,
    cash,
    rates,
    invoices,
    invoiceItems,
    payments,
    auditLog,
  ] = await Promise.all([
    db.organizationMember.findMany({
      where,
      select: { id: true, role: true, status: true, joinedAt: true, deactivatedAt: true, user: { select: { name: true, phone: true } } },
      orderBy: { joinedAt: 'asc' },
    }),
    db.customer.findMany({ where, orderBy: { createdAt: 'asc' } }),
    db.site.findMany({ where, orderBy: { createdAt: 'asc' } }),
    db.equipment.findMany({ where, orderBy: { createdAt: 'asc' } }),
    db.team.findMany({ where, orderBy: { createdAt: 'asc' } }),
    db.teamMember.findMany({ where, orderBy: { joinedAt: 'asc' } }),
    db.teamDayHelper.findMany({ where }),
    db.serviceRequest.findMany({ where, orderBy: { requestNumber: 'asc' } }),
    db.serviceRequestEquipment.findMany({ where }),
    // syncSeq is the phone sync cursor: internal, and a BigInt that JSON cannot hold.
    db.serviceJob.findMany({ where, orderBy: { jobNumber: 'asc' }, omit: { syncSeq: true } }),
    db.jobEquipment.findMany({ where }),
    db.jobAssignment.findMany({ where }),
    db.jobStatusHistory.findMany({ where }),
    db.jobUpdate.findMany({ where }),
    db.serviceReport.findMany({ where }),
    db.cashCollection.findMany({ where }),
    db.rateItem.findMany({ where }),
    db.invoice.findMany({ where, orderBy: [{ kind: 'asc' }, { number: 'asc' }] }),
    db.invoiceItem.findMany({ where, orderBy: [{ invoiceId: 'asc' }, { position: 'asc' }] }),
    db.payment.findMany({ where, omit: { idempotencyKey: true } }),
    db.auditLog.findMany({ where, orderBy: { createdAt: 'asc' } }),
  ]);
  return {
    format: 'kaamsetu-business-export',
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    notes: 'Amounts are in paise (divide by 100 for rupees). Times are UTC.',
    business,
    people: people.map(({ user, ...m }) => ({ ...m, name: user.name, phone: user.phone })),
    customers,
    sites,
    acs,
    teams,
    teamMembers,
    dayHelpers,
    enquiries,
    enquiryAcs,
    jobs,
    jobAcs,
    assignments,
    statusHistory,
    updates,
    reports,
    cash,
    rates,
    invoices,
    invoiceItems,
    payments,
    auditLog,
  };
}

/** How many of each list, for the audit row and the pilot command's summary. */
export const exportCounts = (data: Awaited<ReturnType<typeof exportBusiness>>) =>
  Object.fromEntries(
    Object.entries(data)
      .filter(([, v]) => Array.isArray(v))
      .map(([k, v]) => [k, (v as unknown[]).length]),
  );
