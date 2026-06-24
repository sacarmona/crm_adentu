import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const { DATABASE_URL, ADMIN_EMAIL, ADMIN_NAME, ADMIN_PASSWORD } = process.env;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is required.");
}
if (!ADMIN_EMAIL || !ADMIN_EMAIL.includes("@")) {
  throw new Error("ADMIN_EMAIL must be a valid email.");
}
if (!ADMIN_NAME?.trim()) {
  throw new Error("ADMIN_NAME is required.");
}
if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 12) {
  throw new Error("ADMIN_PASSWORD must contain at least 12 characters.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg(DATABASE_URL),
});

try {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const user = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL.toLowerCase() },
    update: {
      name: ADMIN_NAME.trim(),
      passwordHash,
      role: "ADMIN",
      deletedAt: null,
    },
    create: {
      name: ADMIN_NAME.trim(),
      email: ADMIN_EMAIL.toLowerCase(),
      passwordHash,
      role: "ADMIN",
    },
  });

  console.log(`Admin ready: ${user.email}`);
} finally {
  await prisma.$disconnect();
}
