import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { config } from "dotenv";

// Load environment variables
config();

const prisma = new PrismaClient({
  accelerateUrl: process.env.DATABASE_URL,
});

async function main() {
  const email = "febryan26@gmail.com";
  const password = "Admin@123";
  
  const hash = await bcrypt.hash(password, 12);
  
  const user = await prisma.user.upsert({
    where: { email },
    update: { password: hash, role: "ADMIN" },
    create: {
      email,
      name: "Admin Speedboat",
      password: hash,
      role: "ADMIN",
      emailVerified: new Date(),
    },
  });
  
  console.log("✅ Admin created successfully!");
  console.log(`   Email: ${user.email}`);
  console.log(`   Password: ${password}`);
  
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
