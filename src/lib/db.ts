import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not configured. Add it to .env.local and restart the Next.js server.");
}

let parsedDatabaseUrl: URL;
try {
  parsedDatabaseUrl = new URL(databaseUrl);
} catch {
  throw new Error("DATABASE_URL must be a valid PostgreSQL connection URL.");
}

if (parsedDatabaseUrl.protocol !== "postgres:" && parsedDatabaseUrl.protocol !== "postgresql:") {
  throw new Error("DATABASE_URL must use the postgres:// or postgresql:// scheme.");
}

if (!parsedDatabaseUrl.username || !parsedDatabaseUrl.password) {
  throw new Error("DATABASE_URL must include both a database username and password.");
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

function getOrCreatePool() {
  if (!globalForPrisma.pool) {
    globalForPrisma.pool = new Pool({
      connectionString: databaseUrl,
      max: 15,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      keepAlive: true,
    });
  }
  return globalForPrisma.pool;
}

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg(getOrCreatePool());
  return new PrismaClient({ adapter });
}

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = createPrismaClient();
}

export const db: PrismaClient = globalForPrisma.prisma;
