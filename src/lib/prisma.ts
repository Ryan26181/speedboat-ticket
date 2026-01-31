import { PrismaClient } from "@prisma/client";

/**
 * Prisma Client Singleton with Connection Pooling
 * 
 * This pattern prevents multiple Prisma Client instances during development
 * due to hot-reloading. In production, only one instance is created.
 * 
 * For Prisma 7+, the database URL is configured in prisma.config.ts
 * and passed via accelerateUrl for Prisma Postgres/Accelerate
 * 
 * Connection Pool Settings (via DATABASE_URL):
 * - connection_limit: Max connections in pool (default: 20)
 * - pool_timeout: Seconds to wait for connection (default: 10)
 * 
 * @see https://www.prisma.io/docs/guides/database/troubleshooting-orm/help-articles/nextjs-prisma-client-dev-practices
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    // Prisma 7+ requires accelerateUrl for Prisma Postgres
    accelerateUrl: process.env.DATABASE_URL,
    log:
      process.env.NODE_ENV === "development"
        ? [
            { level: 'query', emit: 'event' },
            { level: 'error', emit: 'stdout' },
            { level: 'warn', emit: 'stdout' },
          ]
        : [{ level: 'error', emit: 'stdout' }],
  });

  // Query logging in development - log slow queries
  if (process.env.NODE_ENV === 'development') {
    client.$on('query', (e: { query: string; duration: number; params: string }) => {
      if (e.duration > 100) {
        console.warn('[SLOW_QUERY]', {
          query: e.query.substring(0, 200),
          duration: e.duration,
          params: e.params,
        });
      }
    });
  }

  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Gracefully disconnect Prisma on application shutdown
 * Call this manually in your shutdown handler if needed
 */
export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}

export default prisma;
