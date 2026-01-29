import { PrismaClient } from "@prisma/client";

/**
 * Prisma Client Singleton
 * 
 * This pattern prevents multiple Prisma Client instances during development
 * due to hot-reloading. In production, only one instance is created.
 * 
 * For Prisma 7+, the database URL is configured in prisma.config.ts
 * and passed via accelerateUrl for Prisma Postgres/Accelerate
 * 
 * @see https://www.prisma.io/docs/guides/database/troubleshooting-orm/help-articles/nextjs-prisma-client-dev-practices
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    // Prisma 7+ requires accelerateUrl for Prisma Postgres
    accelerateUrl: process.env.DATABASE_URL,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Gracefully disconnect Prisma on application shutdown
 */
export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}

export default prisma;
