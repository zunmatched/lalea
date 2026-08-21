import { loadEnvConfig } from "@next/env";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { wavDurationMs } from "../../src/lib/wav";

loadEnvConfig(process.cwd());
const metadataSchema = z.object({ engine: z.object({ name:z.string(), version:z.string(), modelId:z.string(), modelSha256:z.string(), engineLicense:z.string(), voiceLicense:z.string() }), assets:z.array(z.object({ id:z.string().uuid(), file:z.string().regex(/^[a-z0-9-]+\.wav$/), text:z.string(), checksum:z.string().regex(/^[a-f0-9]{64}$/), durationMs:z.number().int().positive(), storagePath:z.string() })) });
async function main() {
  const input = process.argv[2] ?? path.resolve(process.env.LALEA_AUDIO_OUTPUT ?? "audio/generated", "metadata.json");
  const metadata = metadataSchema.parse(JSON.parse(await readFile(input, "utf8")));
  const { db, pool } = await import("../../src/db/client");
  const { audioAssets } = await import("../../src/db/schema");
  try {
    for (const asset of metadata.assets) {
      const bytes = await readFile(path.resolve(path.dirname(input), asset.file));
      const checksum = createHash("sha256").update(bytes).digest("hex");
      if (checksum !== asset.checksum) throw new Error(`Checksum mismatch for ${asset.id}`);
      if (wavDurationMs(bytes) !== asset.durationMs) throw new Error(`Duration mismatch for ${asset.id}`);
      const [existing] = await db.select({ text:audioAssets.text }).from(audioAssets).where(eq(audioAssets.id, asset.id)).limit(1);
      if (!existing) throw new Error(`Unknown audio asset ${asset.id}`);
      if (existing.text !== asset.text) throw new Error(`Text/version mismatch for ${asset.id}`);
      await db.update(audioAssets).set({ generationMethod:metadata.engine.name, engineVersion:metadata.engine.version, voice:metadata.engine.modelId, modelId:metadata.engine.modelId, modelChecksum:metadata.engine.modelSha256, durationMs:asset.durationMs, checksum:asset.checksum, storagePath:asset.storagePath, provenance:{ engineLicense:metadata.engine.engineLicense, voiceLicense:metadata.engine.voiceLicense }, reviewStatus:"needs_review" }).where(eq(audioAssets.id, asset.id));
    }
    console.log(`Imported ${metadata.assets.length} assets; human review is still required.`);
  } finally { await pool.end(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
