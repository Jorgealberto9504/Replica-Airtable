// apps/backend/scripts/create-sysadmin.mjs
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const EMAIL = 'sysadmin@example.com';     // <-- cambia si quieres
const PASSWORD = 'Admin123!';             // <-- cambia si quieres (mínimo fuerte)

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const user = await prisma.user.upsert({
    where: { email: EMAIL },
    update: {
      platformRole: 'SYSADMIN',
      isActive: true,
      mustChangePassword: false,
      canCreateBases: true,
      passwordHash,
    },
    create: {
      email: EMAIL,
      fullName: 'Super Admin',
      passwordHash,
      platformRole: 'SYSADMIN',
      isActive: true,
      mustChangePassword: false,
      canCreateBases: true,
    },
    select: {
      id: true,
      email: true,
      platformRole: true,
      isActive: true,
      mustChangePassword: true,
      canCreateBases: true,
    },
  });

  console.log('SYSADMIN listo:\n', user);
  console.log('\nCredenciales para login:');
  console.log(`  email:    ${EMAIL}`);
  console.log(`  password: ${PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });