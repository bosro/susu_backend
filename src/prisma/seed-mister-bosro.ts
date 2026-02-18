import { PrismaClient } from "@prisma/client";
import { BcryptUtil } from "../utils/bcrypt.util";
import { UserRole } from "../types/enums";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Mister Bosro Admin...");

  const hashedPassword = await BcryptUtil.hash("@El_bosro");

  const user = await prisma.user.upsert({
    where: { email: "misterbosro@gmail.com" },
    update: {},
    create: {
      email: "benardbosro@lazylogiclimited.com",
      password: hashedPassword,
      firstName: "Mister",
      lastName: "Bosro",
      phone: "+233593706706",
      role: UserRole.SUPER_ADMIN, // Change if needed
      isActive: true,
    },
  });

  console.log("✅ Admin created:", user.email);
  console.log("🎉 Done!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
