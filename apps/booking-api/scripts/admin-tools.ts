/*
  Admin user helper for local/dev environments.

  Commands:
    pnpm --filter booking-api admin:list
    pnpm --filter booking-api admin:create --email=you@example.com --password=YourPass123 --first=Admin --last=User
    pnpm --filter booking-api admin:set-role --email=you@example.com --role=ADMIN
    pnpm --filter booking-api admin:set-password --email=you@example.com --password=NewPass123

  The script loads env from apps/booking-api/.env (DB connection etc.).
*/
import { config as loadEnv } from 'dotenv';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import * as bcrypt from 'bcryptjs';
import { PrismaClient, UserRole } from '@prisma/client';

// Load app env first, then root env as fallback
const appEnv = join(process.cwd(), 'apps', 'booking-api', '.env');
if (existsSync(appEnv)) loadEnv({ path: appEnv });
loadEnv();

const prisma = new PrismaClient();

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const found = process.argv.find((a) => a.startsWith(prefix));
  return found ? found.slice(prefix.length) : undefined;
}

async function listUsers() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, email: true, role: true, createdAt: true },
  });
  if (!users.length) {
    console.log('No users found.');
    return;
  }
  console.table(users.map((u) => ({ id: u.id, email: u.email, role: u.role, createdAt: u.createdAt.toISOString() })));
}

async function createAdmin() {
  const email = ((arg('email') || process.env.ADMIN_EMAIL) || '').trim().toLowerCase();
  const password = arg('password') || process.env.ADMIN_PASSWORD;
  const firstName = arg('first') || process.env.ADMIN_FIRST_NAME || 'Admin';
  const lastName = arg('last') || process.env.ADMIN_LAST_NAME || 'User';

  if (!email || !password) {
    console.error('Usage: admin:create --email=you@example.com --password=YourPass123 [--first=Admin] [--last=User]');
    process.exit(2);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`User already exists: ${email} (role=${existing.role})`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: UserRole.ADMIN,
      emailVerified: true,
      firstName,
      lastName,
    },
  });
  console.log(`Created ADMIN user ${user.email} (id=${user.id})`);
}

async function setRole() {
  const email = (arg('email') || '').trim().toLowerCase();
  const role = (arg('role') || '').trim().toUpperCase() as UserRole;
  if (!email || !role || !Object.values(UserRole).includes(role)) {
    console.error('Usage: admin:set-role --email=you@example.com --role=ADMIN|STAFF|CUSTOMER');
    process.exit(2);
  }
  const updated = await prisma.user.update({ where: { email }, data: { role } });
  console.log(`Updated role for ${updated.email} -> ${updated.role}`);
}

async function setPassword() {
  const email = (arg('email') || '').trim().toLowerCase();
  const password = arg('password');
  if (!email || !password) {
    console.error('Usage: admin:set-password --email=you@example.com --password=NewPass123');
    process.exit(2);
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const updated = await prisma.user.update({ where: { email }, data: { passwordHash } });
  console.log(`Updated password for ${updated.email}`);
}

async function main() {
  const cmd = process.argv[2];
  switch (cmd) {
    case 'list':
      await listUsers();
      break;
    case 'create-admin':
      await createAdmin();
      break;
    case 'set-role':
      await setRole();
      break;
    case 'set-password':
      await setPassword();
      break;
    default:
      console.log('Commands: list | create-admin | set-role | set-password');
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
