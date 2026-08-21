import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL ?? "postgresql://lalea:lalea_dev_only@127.0.0.1:5432/lalea_dev" },
  strict: true,
  verbose: true,
});

