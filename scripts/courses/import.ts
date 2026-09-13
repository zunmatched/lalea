import { loadEnvConfig } from "@next/env";
import { stat, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

loadEnvConfig(process.cwd());

const imageFileNamePattern = /^[a-z0-9-]+\.(jpg|jpeg|png|webp)$/;
const optionSchema = z.object({ id: z.string().min(1), text: z.string().min(1) });
const baseExercise = { id: z.string().uuid().optional(), prompt: z.string().min(1), options: z.array(optionSchema).min(1), correctIds: z.array(z.string().min(1)).min(1), feedbackCorrect: z.string().min(1), feedbackIncorrect: z.string().min(1) };
const groupQuestionSchema = z.object({ id: z.string().uuid().optional(), prompt: z.string().min(1), options: z.array(optionSchema).min(1), correctIds: z.array(z.string().min(1)).min(1), feedbackCorrect: z.string().min(1), feedbackIncorrect: z.string().min(1) });
// group：多題共用一段文章／音檔／圖片（多益 Part 1/3/4/6/7 那種一份素材配多題），不分組的單句題（Part 5）繼續用原本的獨立題型
const groupSchema = z.object({ type: z.literal("group"), id: z.string().uuid().optional(), context: z.string().optional(), image: z.string().regex(imageFileNamePattern, "圖檔名只能用小寫字母、數字、連字號，副檔名限 jpg/jpeg/png/webp").optional(), speech: z.string().optional(), speechTranslation: z.string().optional(), generateAudio: z.boolean().default(true), questions: z.array(groupQuestionSchema).min(1) });
const exerciseSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("reading_choice"), context: z.string().optional(), ...baseExercise }),
  z.object({ type: z.literal("listening_choice"), speech: z.string().min(1), speechTranslation: z.string().optional(), generateAudio: z.boolean().default(true), ...baseExercise }),
  z.object({ type: z.literal("branched_dialogue"), ...baseExercise }),
  groupSchema,
]);
const unitSchema = z.object({ id: z.string().uuid().optional(), title: z.string().min(1), estimatedSeconds: z.number().int().positive().default(180), exercises: z.array(exerciseSchema).min(1) });
const courseSchema = z.object({ id: z.string().uuid().optional(), versionId: z.string().uuid().optional(), slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "slug 只能用小寫字母、數字與連字號"), title: z.string().min(1), units: z.array(unitSchema).min(1) });

type StandaloneExercise = Exclude<z.infer<typeof exerciseSchema>, { type: "group" }>;
type GroupQuestion = z.infer<typeof groupQuestionSchema>;
type FlatItem = { kind: "standalone"; exercise: StandaloneExercise } | { kind: "group-question"; groupId: string; type: "reading_choice" | "listening_choice"; question: GroupQuestion };

function questionJson(question: GroupQuestion) {
  return { content: { options: question.options }, answer: { correctIds: question.correctIds }, feedback: { correct: question.feedbackCorrect, incorrect: question.feedbackIncorrect } };
}
function exerciseJson(exercise: StandaloneExercise) {
  const answer = { correctIds: exercise.correctIds };
  const feedback = { correct: exercise.feedbackCorrect, incorrect: exercise.feedbackIncorrect };
  if (exercise.type === "reading_choice") return { content: { context: exercise.context, options: exercise.options }, answer, feedback };
  if (exercise.type === "listening_choice") return { content: { speech: exercise.speech, options: exercise.options }, answer, feedback };
  return { content: { options: exercise.options }, answer, feedback };
}

async function main() {
  const jsonPath = process.argv[2];
  if (!jsonPath) throw new Error("Usage: tsx scripts/courses/import.ts <course-file.json>");
  const raw = JSON.parse(await readFile(jsonPath, "utf8"));
  const course = courseSchema.parse(raw);

  const { db, pool } = await import("../../src/db/client");
  const s = await import("../../src/db/schema");
  const { and, eq } = await import("drizzle-orm");
  const imageDir = path.resolve(process.env.LALEA_IMAGE_DIR ?? "images/uploaded");

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

      // 把 group 展開成一題一題的紀錄，跟獨立題目混在一起依序編號
      const flat: FlatItem[] = [];
      for (const item of unit.exercises) {
        if (item.type !== "group") { flat.push({ kind: "standalone", exercise: item }); continue }

        if (item.image) {
          const imagePath = path.join(imageDir, item.image);
          try { await stat(imagePath) } catch { throw new Error(`圖片 "${item.image}" 在 ${imageDir} 找不到，請先跑 pnpm images:import <來源檔案> ${item.image}`) }
        }
        let groupId = item.id;
        const groupValues = { learningUnitId: unitId, context: item.context ?? null, speech: item.speech ?? null, imagePath: item.image ? `/media/images/${item.image}` : null };
        if (groupId) await db.update(s.exerciseGroups).set(groupValues).where(eq(s.exerciseGroups.id, groupId));
        else { const [created] = await db.insert(s.exerciseGroups).values(groupValues).returning({ id: s.exerciseGroups.id }); groupId = created.id; item.id = groupId }

        if (item.speech && item.generateAudio) {
          const [existingAudio] = await db.select({ id: s.audioAssets.id, text: s.audioAssets.text }).from(s.audioAssets).where(and(eq(s.audioAssets.groupId, groupId), eq(s.audioAssets.contentVersion, 1))).limit(1);
          if (!existingAudio) {
            await db.insert(s.audioAssets).values({ learningUnitId: unitId, groupId, languageId: learningPath.targetLanguageId, text: item.speech, translation: item.speechTranslation, generationMethod: "local_tts", reviewStatus: "pending_generation", contentVersion: 1 });
          } else if (existingAudio.text !== item.speech) {
            await db.update(s.audioAssets).set({ text: item.speech, translation: item.speechTranslation, reviewStatus: "pending_generation", storagePath: null, checksum: null, durationMs: null }).where(eq(s.audioAssets.id, existingAudio.id));
            console.log(`音檔文字已變更，group ${groupId} 重設為 pending_generation，需要重新產生與審核。`);
          }
        }

        const questionType = item.speech ? "listening_choice" as const : "reading_choice" as const;
        for (const question of item.questions) flat.push({ kind: "group-question", groupId, type: questionType, question });
      }

      for (let index = 0; index < flat.length; index++) {
        const position = index + 1;
        const flatItem = flat[index];

        if (flatItem.kind === "group-question") {
          const { question, groupId, type } = flatItem;
          const { content, answer, feedback } = questionJson(question);
          const exerciseValues = { learningUnitId: unitId, groupId, position, type, prompt: question.prompt, content, answer, feedback };
          let exerciseId = question.id;
          if (exerciseId) await db.update(s.exercises).set(exerciseValues).where(eq(s.exercises.id, exerciseId));
          else { const [created] = await db.insert(s.exercises).values(exerciseValues).returning({ id: s.exercises.id }); exerciseId = created.id; question.id = exerciseId }
          continue;
        }

        const { exercise } = flatItem;
        const { content, answer, feedback } = exerciseJson(exercise);
        const exerciseValues = { learningUnitId: unitId, position, type: exercise.type, prompt: exercise.prompt, content, answer, feedback };
        let exerciseId = exercise.id;
        if (exerciseId) await db.update(s.exercises).set(exerciseValues).where(eq(s.exercises.id, exerciseId));
        else { const [created] = await db.insert(s.exercises).values(exerciseValues).returning({ id: s.exercises.id }); exerciseId = created.id; exercise.id = exerciseId }

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
    await writeFile(jsonPath, JSON.stringify(course, null, 2) + "\n", "utf8");
    console.log(`已匯入課程「${course.title}」，${course.units.length} 個單元。id 已寫回 ${jsonPath}，之後重跑同一個檔案會更新而不是重複建立。`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
