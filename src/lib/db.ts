import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

export async function ensurePrismaSqliteConfig(client: PrismaClient = prisma) {
  try {
    await client.$queryRawUnsafe('PRAGMA journal_mode = WAL;');
    await client.$queryRawUnsafe('PRAGMA busy_timeout = 10000;');
  } catch {
    // Non-fatal if database is not sqlite
  }
}

// Initial fire-and-forget for local dev
ensurePrismaSqliteConfig(prisma);

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
