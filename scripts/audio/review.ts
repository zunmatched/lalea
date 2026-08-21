import { loadEnvConfig } from "@next/env";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

loadEnvConfig(process.cwd());
const input = z.object({ id:z.string().uuid(), decision:z.enum(["approved","rejected"]) }).parse({ id:process.argv[2], decision:process.argv[3] });
const { db, pool } = await import("../../src/db/client");
const { audioAssets } = await import("../../src/db/schema");
try {
  const changed = await db.update(audioAssets).set({ reviewStatus:input.decision }).where(and(eq(audioAssets.id,input.id),eq(audioAssets.reviewStatus,"needs_review"))).returning({ id:audioAssets.id });
  if (!changed.length) throw new Error("Asset was not found or is not awaiting review");
  console.log(`${input.id}: ${input.decision}`);
} finally { await pool.end(); }
