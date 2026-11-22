/**
 * Pilot setup, until the app has business signup (T4.1) and "Add staff" (T4.2).
 * Works on whichever database DATABASE_URL points at, so it prints the
 * target and changes nothing without --yes.
 *
 *   npm run pilot -- create-business --name "Cool Care AC" --phone 98xxxxxxxx --city Pune \
 *       --owner-name "Owner Name" --owner-phone 98xxxxxxxx --yes
 *   npm run pilot -- add-staff --business-phone 98xxxxxxxx --name "Name" --phone 98xxxxxxxx \
 *       --role senior|helper --yes
 *   npm run pilot -- owner-invite --business-phone 98xxxxxxxx --yes
 *   npm run pilot -- list --business-phone 98xxxxxxxx
 *   npm run pilot -- purge-closed [--yes]   (closed > 30 days ago; run monthly)
 *   npm run pilot -- sign-out --phone 98xxxxxxxx [--yes]   (lost or stolen phone, docs/RUNBOOK.md)
 *
 * Needs DATABASE_URL and, for invites, the server's OTP_HASH_SECRET.
 * Staff are invited by the owner in the app (More › Employees).
 */
import 'dotenv/config';
import { parseArgs } from 'node:util';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  PrismaClient,
  type MemberRole,
} from '../src/generated/prisma/client.js';
import { normalizeIndianMobile } from '../src/auth/phone.js';
import { issueInvite } from './invite-tools.js';

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    name: { type: 'string' },
    phone: { type: 'string' },
    city: { type: 'string' },
    'owner-name': { type: 'string' },
    'owner-phone': { type: 'string' },
    'business-phone': { type: 'string' },
    role: { type: 'string' },
    yes: { type: 'boolean', default: false },
  },
});

const ROLES: Record<string, MemberRole> = {
  senior: 'SENIOR_TECHNICIAN',
  helper: 'HELPER',
};

class UsageError extends Error {}

function need(key: keyof typeof values): string {
  const v = values[key];
  if (typeof v !== 'string' || !v.trim()) throw new UsageError(`Missing --${key}`);
  return v.trim();
}

function mobile(key: keyof typeof values): string {
  const e164 = normalizeIndianMobile(need(key));
  if (!e164) throw new UsageError(`--${key} must be a 10-digit Indian mobile number`);
  return e164;
}

function target(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new UsageError('DATABASE_URL is not set');
  try {
    const u = new URL(url);
    return `${u.hostname}${u.pathname}`; // never print the password
  } catch {
    return '(unparsable DATABASE_URL)';
  }
}

function confirmWrite(what: string) {
  console.log(`Target database: ${target()}`);
  if (!values.yes) {
    throw new UsageError(`Would ${what}. Check the target above, then add --yes to do it.`);
  }
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function businessByPhone() {
  const phone = mobile('business-phone');
  const org = await prisma.organization.findFirst({ where: { phone } });
  if (!org) throw new UsageError(`No business with phone ${phone}`);
  return org;
}

async function upsertPerson(phone: string, name: string) {
  return prisma.user.upsert({
    where: { phone },
    create: { phone, name },
    update: { name },
  });
}

function printInvite(phone: string, inv: { code: string; expiresAt: Date }) {
  console.log(
    `\nOwner invite: in the app, Continue with Google › Join your business › Enter code instead\n` +
      `  mobile ${phone.replace(/^\+91/, '')}  code ${inv.code}  (works once, until ${inv.expiresAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST)`,
  );
}

async function createBusiness() {
  const name = need('name');
  const phone = mobile('phone');
  const city = need('city');
  const ownerName = need('owner-name');
  const ownerPhone = mobile('owner-phone');
  confirmWrite(`create business "${name}" (${phone}) with owner ${ownerName} (${ownerPhone})`);

  if (await prisma.organization.findFirst({ where: { phone } })) {
    throw new UsageError(`A business with phone ${phone} already exists. Use owner-invite or add-staff.`);
  }
  // Same 30-day trial as signup in the app (D-014, D-027).
  const trialEnd = new Date(Date.now() + 30 * 24 * 3600_000);
  const org = await prisma.organization.create({
    data: {
      name,
      phone,
      city,
      subscription: { create: { currentPeriodEnd: trialEnd, trialEndsAt: trialEnd } },
    },
  });
  const owner = await upsertPerson(ownerPhone, ownerName);
  const member = await prisma.organizationMember.create({
    data: { organizationId: org.id, userId: owner.id, role: 'OWNER' },
  });
  console.log(`✓ Created business "${org.name}" with owner ${ownerName}`);
  printInvite(ownerPhone, await issueInvite(prisma, org.id, member.id));
}

async function addStaff() {
  const org = await businessByPhone();
  const name = need('name');
  const phone = mobile('phone');
  const role = ROLES[need('role')];
  if (!role) throw new UsageError('--role must be senior or helper');
  confirmWrite(`add ${name} (${phone}) as ${role} to "${org.name}"`);

  const user = await upsertPerson(phone, name);
  await prisma.organizationMember.upsert({
    where: { organizationId_userId: { organizationId: org.id, userId: user.id } },
    create: { organizationId: org.id, userId: user.id, role },
    update: { role, status: 'ACTIVE', deactivatedAt: null },
  });
  console.log(
    `✓ ${name} is ${role} in "${org.name}". The owner invites them in the app: More › Employees › ${name} › Show invite QR.`,
  );
}

async function ownerInvite() {
  const org = await businessByPhone();
  confirmWrite(`issue a new owner invite for "${org.name}" (cancels the previous one)`);
  const owner = await prisma.organizationMember.findFirst({
    where: { organizationId: org.id, role: 'OWNER', status: 'ACTIVE' },
    include: { user: true },
  });
  if (!owner) throw new UsageError(`"${org.name}" has no active owner`);
  printInvite(owner.user.phone ?? '', await issueInvite(prisma, org.id, owner.id));
}

async function list() {
  const org = await businessByPhone();
  console.log(`Target database: ${target()}\n${org.name} (${org.phone}, ${org.city ?? '-'})`);
  const members = await prisma.organizationMember.findMany({
    where: { organizationId: org.id },
    include: { user: true },
    orderBy: { joinedAt: 'asc' },
  });
  for (const m of members) {
    const linked = m.user.googleSubject ? 'joined' : 'not joined';
    console.log(`  ${m.role.padEnd(17)} ${m.user.name.padEnd(24)} ${m.user.phone ?? '-'}  ${m.status}  ${linked}`);
  }
}

/**
 * Signs a person out on every phone (lost or stolen phone). Works for the
 * owner too, who cannot reset their own login in the app. Each request
 * checks the device, so the old phone stops at once; their Google login
 * stays, so they sign in again on the new phone. Unsent work on the lost
 * phone is lost with it.
 */
async function signOut() {
  const phone = mobile('phone');
  const user = await prisma.user.findUnique({
    where: { phone },
    include: { devices: { where: { revokedAt: null }, select: { id: true, lastSeenAt: true } } },
  });
  if (!user) throw new UsageError(`No user with mobile ${phone}`);
  console.log(`Target database: ${target()}
${user.name} (${phone}): ${user.devices.length} signed-in phone(s)`);
  if (!user.devices.length) return;
  if (!values.yes) throw new UsageError('Would sign them out on every phone. Add --yes.');
  const done = await prisma.device.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
  console.log(`Signed out on ${done.count} phone(s).`);
}

/**
 * Permanently removes businesses closed by "Delete my account" more than
 * 30 days ago (privacy policy), with their members, invites and
 * subscription, and the anonymised users left without any business.
 * Lists them first; deletes only with --yes.
 */
async function purgeClosed() {
  const cutoff = new Date(Date.now() - 30 * 24 * 3600_000);
  const orgs = await prisma.organization.findMany({
    where: { status: 'INACTIVE', subscription: { currentPeriodEnd: { lt: cutoff } } },
    select: { id: true, name: true },
  });
  console.log(`Target database: ${target()}`);
  for (const o of orgs) console.log(`  closed: ${o.name}`);
  if (!orgs.length) console.log('  nothing to purge');
  if (!orgs.length) return;
  if (!values.yes) throw new UsageError(`Would permanently delete ${orgs.length} closed business(es). Add --yes.`);
  const ids = orgs.map((o) => o.id);
  const members = await prisma.organizationMember.findMany({
    where: { organizationId: { in: ids } },
    select: { userId: true },
  });
  await prisma.$transaction([
    prisma.memberInvite.deleteMany({ where: { organizationId: { in: ids } } }),
    prisma.subscription.deleteMany({ where: { organizationId: { in: ids } } }),
    prisma.syncOperation.deleteMany({ where: { organizationId: { in: ids } } }),
    prisma.serviceReport.deleteMany({ where: { organizationId: { in: ids } } }),
    prisma.cashCollection.deleteMany({ where: { organizationId: { in: ids } } }),
    prisma.jobEquipment.deleteMany({ where: { organizationId: { in: ids } } }),
    prisma.jobAssignment.deleteMany({ where: { organizationId: { in: ids } } }),
    prisma.jobStatusHistory.deleteMany({ where: { organizationId: { in: ids } } }),
    prisma.serviceJob.deleteMany({ where: { organizationId: { in: ids } } }),
    prisma.teamMember.deleteMany({ where: { organizationId: { in: ids } } }),
    prisma.team.deleteMany({ where: { organizationId: { in: ids } } }),
    prisma.equipment.deleteMany({ where: { organizationId: { in: ids } } }),
    prisma.site.deleteMany({ where: { organizationId: { in: ids } } }),
    prisma.customer.deleteMany({ where: { organizationId: { in: ids } } }),
    prisma.organizationMember.deleteMany({ where: { organizationId: { in: ids } } }),
    prisma.organization.deleteMany({ where: { id: { in: ids } } }),
  ]);
  // Deleted (anonymised) people who now belong nowhere.
  const gone = await prisma.user.findMany({
    where: {
      id: { in: members.map((m) => m.userId) },
      status: 'INACTIVE',
      googleSubject: null,
      phone: null,
      memberships: { none: {} },
    },
    select: { id: true },
  });
  const userIds = gone.map((u) => u.id);
  await prisma.$transaction([
    prisma.refreshToken.deleteMany({ where: { device: { userId: { in: userIds } } } }),
    prisma.device.deleteMany({ where: { userId: { in: userIds } } }),
    prisma.user.deleteMany({ where: { id: { in: userIds } } }),
  ]);
  console.log(`✓ Purged ${orgs.length} business(es) and ${userIds.length} deleted user record(s).`);
}

const COMMANDS: Record<string, () => Promise<void>> = {
  'create-business': createBusiness,
  'add-staff': addStaff,
  'owner-invite': ownerInvite,
  list,
  'purge-closed': purgeClosed,
  'sign-out': signOut,
};

async function main() {
  const command = COMMANDS[positionals[0] ?? ''];
  if (!command) {
    throw new UsageError(
      `Commands: ${Object.keys(COMMANDS).join(', ')}. See the top of backend/prisma/pilot.ts.`,
    );
  }
  await command();
}

main()
  .catch((e: unknown) => {
    console.error(e instanceof UsageError ? `✗ ${e.message}` : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
