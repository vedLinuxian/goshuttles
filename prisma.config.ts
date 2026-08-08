import "dotenv/config";
import { defineConfig } from "prisma/config";

const dbUrl = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/goshuttles";
const hasQuery = dbUrl.includes("?");
const finalUrl = dbUrl.includes("connect_timeout")
  ? dbUrl
  : dbUrl + (hasQuery ? "&" : "?") + "connect_timeout=30&pool_timeout=30";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: finalUrl,
  },
});
