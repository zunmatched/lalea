import { loadEnvConfig } from "@next/env";
import { readFile, writeFile } from "node:fs/promises";
import { z } from "zod";

loadEnvConfig(process.cwd());

const optionSchema = z.object({ id: z.string().min(1), text: z.string().min(1) });
const baseExercise = { id: z.string().uuid().optional(), prompt: z.string().min(1), options: z.array(optionSchema).min(1), correctIds: z.array(z.string().min(1)).min(1), feedbackCorrect: z.string().min(1), feedbackIncorrect: z.string().min(1) };
const exerciseSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("reading_choice"), context: z.string().optional(), ...baseExercise }),
  z.object({ type: z.literal("listening_choice"), speech: z.string().min(1), speechTranslation: z.string().optional(), generateAudio: z.boolean().default(true), ...baseExercise }),
  z.object({ type: z.literal("chunk_ordering"), ...baseExercise }),
  z.object({ type: z.literal("branched_dialogue"), ...baseExercise }),
]);
const unitSchema = z.object({ id: z.string().uuid().optional(), title: z.string().min(1), estimatedSeconds: z.number().int().positive().default(180), exercises: z.array(exerciseSchema).min(1) });
const courseSchema = z.object({ id: z.string().uuid().optional(), versionId: z.string().uuid().optional(), slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "slug 只能用小寫字母、數字與連字號"), title: z.string().min(1), units: z.array(unitSchema).min(1) });

function exerciseJson(exercise: z.infer<typeof exerciseSchema>) {
  const answer = { correctIds: exercise.correctIds };
  const feedback = { correct: exercise.feedbackCorrect, incorrect: exercise.feedbackIncorrect };
  if (exercise.type === "reading_choice") return { content: { context: exercise.context, options: exercise.options }, answer, feedback };
  if (exercise.type === "listening_choice") return { content: { speech: exercise.speech, options: exercise.options }, answer, feedback };
  return { content: { options: exercise.options }, answer, feedback };
}

async function main() {
  const path = process.argv[2];
  if (!path) throw new Error("Usage: tsx scripts/courses/import.ts <course-file.json>");
  const raw = JSON.parse(await readFile(path, "utf8"));
  const course = courseSchema.parse(raw);

  const { db, pool } = await import("../../src/db/client");
  const s = await import("../../src/db/schema");
  const { and, eq } = await import("drizzle-orm");

  try {
    const [learningPath] = await db.select().from(s.learningPaths).limit(1);
    if (!learningPath) throw new Error("No learning path found; run pnpm db:seed first.");

    let courseId = course.id;
    if (courseId) {
      await db.update(s.courses).set({ title: course.title, slug: course.slug }).where(eq(s.courses.id, courseId));
    } else {
      const [existing] = await db.select({ id: s.courses.id }).from(s.courses).where(and(eq(s.courses.learningPathId, learningPath.id), eq(s.courses.slug, course.slug))).limit(1);
      if (existing) { courseId = existing.id; await db.update(s.courses).set({ title: course.title }).where(eq(s.courses.id, courseId)); }
      else { const [created] = await db.insert(s.courses).values({ learningPathId: learningPath.id, slug: course.slug, title: course.title }).returning({ id: s.courses.id }); courseId = created.id; }
    }

    let versionId = course.versionId;
    if (!versionId) {
      const [existingVersion] = await db.select({ id: s.courseVersions.id }).from(s.courseVersions).where(and(eq(s.courseVersions.courseId, courseId), eq(s.courseVersions.version, 1))).limit(1);
      if (existingVersion) versionId = existingVersion.id;
      else { const [created] = await db.insert(s.courseVersions).values({ courseId, version: 1 }).returning({ id: s.courseVersions.id }); versionId = created.id; }
    }

    const existingPositions = await db.select({ position: s.learningUnits.position }).from(s.learningUnits);
    let nextPosition = (existingPositions.length ? Math.max(...existingPositions.map((row) => row.position)) : 0) + 1;

    for (const unit of course.units) {
      let unitId = unit.id;
      const unitValues = { courseVersionId: versionId, title: unit.title, estimatedSeconds: unit.estimatedSeconds };
      if (unitId) await db.update(s.learningUnits).set(unitValues).where(eq(s.learningUnits.id, unitId));
      else { const [created] = await db.insert(s.learningUnits).values({ ...unitValues, position: nextPosition++ }).returning({ id: s.learningUnits.id }); unitId = created.id; unit.id = unitId; }

      for (let index = 0; index < unit.exercises.length; index++) {
        const exercise = unit.exercises[index];
        const { content, answer, feedback } = exerciseJson(exercise);
        const exerciseValues = { learningUnitId: unitId, position: index + 1, type: exercise.type, prompt: exercise.prompt, content, answer, feedback };
        let exerciseId = exercise.id;
        if (exerciseId) await db.update(s.exercises).set(exerciseValues).where(eq(s.exercises.id, exerciseId));
        else { const [created] = await db.insert(s.exercises).values(exerciseValues).returning({ id: s.exercises.id }); exerciseId = created.id; exercise.id = exerciseId; }

        if (exercise.type === "listening_choice" && exercise.generateAudio) {
          const [existingAudio] = await db.select({ id: s.audioAssets.id, text: s.audioAssets.text }).from(s.audioAssets).where(and(eq(s.audioAssets.exerciseId, exerciseId), eq(s.audioAssets.contentVersion, 1))).limit(1);
          if (!existingAudio) {
            await db.insert(s.audioAssets).values({ learningUnitId: unitId, exerciseId, languageId: learningPath.targetLanguageId, text: exercise.speech, translation: exercise.speechTranslation, generationMethod: "local_tts", reviewStatus: "pending_generation", contentVersion: 1 });
          } else if (existingAudio.text !== exercise.speech) {
            await db.update(s.audioAssets).set({ text: exercise.speech, translation: exercise.speechTranslation, reviewStatus: "pending_generation", storagePath: null, checksum: null, durationMs: null }).where(eq(s.audioAssets.id, existingAudio.id));
            console.log(`音檔文字已變更，${exerciseId} 重設為 pending_generation，需要重新產生與審核。`);
          }
        }
      }
    }

    course.id = courseId;
    course.versionId = versionId;
    await writeFile(path, JSON.stringify(course, null, 2) + "\n", "utf8");
    console.log(`已匯入課程「${course.title}」，${course.units.length} 個單元。id 已寫回 ${path}，之後重跑同一個檔案會更新而不是重複建立。`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
