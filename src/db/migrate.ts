import { loadEnvConfig } from "@next/env";
async function main() {
loadEnvConfig(process.cwd());
const { migrate } = await import("drizzle-orm/node-postgres/migrator");
const { db, pool } = await import("./client");
await migrate(db, { migrationsFolder: "drizzle" });
await pool.end();
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
