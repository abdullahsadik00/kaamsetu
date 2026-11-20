/**
 * Demo data for local development and demos (docs/12 §3, task T3.3).
 *
 * - Entirely made up: the names come from the clickable prototype, the phone
 *   numbers are fake (+91 90000 0xxxx). Never put real customer data here.
 * - Safe to run again: it updates the demo records instead of duplicating them.
 * - Grows with each module (teams, customers, ACs, jobs…) as those tables arrive.
 *
 * Run: npm run db:seed   (or: npx prisma db seed)
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  PrismaClient,
  type MemberRole,
} from '../src/generated/prisma/client.js';
import { issueInvite } from './invite-tools.js';

if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to seed demo data in production.');
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

interface DemoBusiness {
  name: string;
  phone: string;
  city: string;
  gstin?: string;
  owner: { name: string; phone: string };
  teams: { senior: string; helper: string }[];
  /** 8-digit prefix; seniors get 1NN, helpers 2NN after it */
  staffPrefix: string;
}

const BUSINESSES: DemoBusiness[] = [
  {
    // Mirrors the prototype's demo business (6 teams in Pune).
    name: 'Cool Care AC Services (demo)',
    phone: '+919000002000',
    city: 'Pune',
    gstin: '27ABCDE1234F1Z5',
    owner: { name: 'Demo Owner', phone: '+919000002001' },
    staffPrefix: '9000002',
    teams: [
      { senior: 'Imran Shaikh', helper: 'Vikas Gaikwad' },
      { senior: 'Prakash Deshmukh', helper: 'Sunil More' },
      { senior: 'Santosh Pawar', helper: 'Akash Shinde' },
      { senior: 'Nitin Kale', helper: 'Rohit Lonkar' },
      { senior: 'Ganesh More', helper: 'Rahul Jadhav' },
      { senior: 'Sameer Patil', helper: 'Kiran Bhosale' },
    ],
  },
  {
    // A second, unrelated business, for trying tenant isolation by hand.
    name: 'Arctic Air (demo B)',
    phone: '+919000003000',
    city: 'Mumbai',
    owner: { name: 'Demo Owner B', phone: '+919000003001' },
    staffPrefix: '9000003',
    teams: [{ senior: 'Asif Khan', helper: 'Manoj Yadav' }],
  },
];

async function upsertMember(
  organizationId: string,
  person: { name: string; phone: string },
  role: MemberRole,
): Promise<string> {
  const user = await prisma.user.upsert({
    where: { phone: person.phone },
    create: { phone: person.phone, name: person.name },
    update: { name: person.name },
  });
  const member = await prisma.organizationMember.upsert({
    where: { organizationId_userId: { organizationId, userId: user.id } },
    create: { organizationId, userId: user.id, role },
    update: { role, status: 'ACTIVE', deactivatedAt: null },
  });
  return member.id;
}

async function seedBusiness(
  b: DemoBusiness,
): Promise<{ people: number; invite: { code: string; qr: string } }> {
  const existing = await prisma.organization.findFirst({
    where: { phone: b.phone },
  });
  const data = {
    name: b.name,
    phone: b.phone,
    city: b.city,
    gstin: b.gstin ?? null,
  };
  const org = existing
    ? await prisma.organization.update({ where: { id: existing.id }, data })
    : await prisma.organization.create({ data });

  const ownerId = await upsertMember(org.id, b.owner, 'OWNER');
  for (const [i, team] of b.teams.entries()) {
    const n = String(i + 1).padStart(2, '0');
    await upsertMember(
      org.id,
      { name: team.senior, phone: `+91${b.staffPrefix}1${n}` },
      'SENIOR_TECHNICIAN',
    );
    await upsertMember(
      org.id,
      { name: team.helper, phone: `+91${b.staffPrefix}2${n}` },
      'HELPER',
    );
  }
  return {
    people: 1 + b.teams.length * 2,
    // Google login (D-025) needs an invite to claim the owner record.
    invite: await issueInvite(prisma, org.id, ownerId),
  };
}

async function main(): Promise<void> {
  for (const b of BUSINESSES) {
    const { people, invite } = await seedBusiness(b);
    console.log(
      `✓ ${b.name}: ${people} people. Owner invite (7 days): phone ${b.owner.phone} + code ${invite.code}`,
    );
  }
  console.log(
    '\nGoogle login (D-025): sign in with any Google account, choose "Enter code" and type the\n' +
      "owner's phone + code above; then invite staff from More › Employees. Running the seed\n" +
      'again makes new owner codes. Phone OTP still works in development (seniors\n' +
      '+91 9000002101…106, helpers 201…206; the code is printed in the backend console).',
  );
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
