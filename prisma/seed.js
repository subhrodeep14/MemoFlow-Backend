// prisma/seed.js
const prisma =
  require(
    "../config/prisma"
  );
const bcrypt = require('bcryptjs');


async function main() {
  const existingAdmin = await prisma.user.findFirst({ where: { role: 'admin' } });
  if (existingAdmin) {
    console.log('Admin already exists, skipping seed.');
    return;
  }

  const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin@SecureDoc2024!', 12);

  await prisma.user.create({
    data: {
      email: process.env.ADMIN_EMAIL || 'admin@example.com',
      password: hashedPassword,
      role: 'admin',
    },
  });

  console.log('✅ Admin user created successfully');
  console.log('📧 Email:', process.env.ADMIN_EMAIL || 'admin@example.com');
  console.log('🔑 Password:', process.env.ADMIN_PASSWORD || 'Admin@SecureDoc2024!');
  console.log('⚠️  CHANGE THESE CREDENTIALS IMMEDIATELY IN PRODUCTION!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
