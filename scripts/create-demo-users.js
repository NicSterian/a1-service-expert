const { PrismaClient, UserRole } = require('../apps/booking-api/node_modules/@prisma/client');
const bcrypt = require('../apps/booking-api/node_modules/bcryptjs');

const prisma = new PrismaClient();

const USERS = [
  {
    email: 'admin@a1serviceexpert.com',
    password: 'AdminPass123!',
    role: UserRole.ADMIN,
    emailVerified: true,
  },
  {
    email: 'customer.one@example.com',
    password: 'CustomerOne!',
    role: UserRole.CUSTOMER,
    emailVerified: true,
  },
  {
    email: 'customer.two@example.com',
    password: 'CustomerTwo!',
    role: UserRole.CUSTOMER,
    emailVerified: true,
  },
];

async function main() {
  for (const user of USERS) {
    const passwordHash = await bcrypt.hash(user.password, 12);
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        passwordHash,
        role: user.role,
        emailVerified: user.emailVerified,
      },
      create: {
        email: user.email,
        passwordHash,
        role: user.role,
        emailVerified: user.emailVerified,
      },
    });
    console.log(`User ready: ${user.email} (${user.role})`);
  }
}

main()
  .catch((error) => {
    console.error('Failed to prepare demo users', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });