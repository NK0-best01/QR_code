import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export async function seedUsers() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed database in production environment!");
  }

  const defaultPassword = "1234";
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  const admin = await prisma.user.upsert({
    where: { username: "admin1" },
    update: {
      passwordHash,
      role: "admin",
    },
    create: {
      username: "admin1",
      passwordHash,
      role: "admin",
    },
  });

  const user = await prisma.user.upsert({
    where: { username: "user1" },
    update: {
      passwordHash,
      role: "user",
    },
    create: {
      username: "user1",
      passwordHash,
      role: "user",
    },
  });

  return { admin, user };
}

async function main() {
  console.log("Seeding users...");
  const result = await seedUsers();
  console.log(`Seeded users: ${result.admin.username} (admin), ${result.user.username} (user)`);
}

if (process.env.NODE_ENV !== "test") {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
