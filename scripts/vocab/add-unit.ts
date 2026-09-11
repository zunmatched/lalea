import { loadEnvConfig } from "@next/env";
import { readFile } from "node:fs/promises";
import { z } from "zod";

loadEnvConfig(process.cwd());

const wordSchema = z.object({ form: z.string().min(1), partOfSpeech: z.string().min(1), definition: z.string().min(1), translation: z.string().min(1), example: z.string().min(1), exampleTranslation: z.string().min(1), note: z.string().min(1).optional() });
const groupSchema = z.object({ slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "slug 只能用小寫字母、數字與連字號"), title: z.string().min(1) });
const unitSchema = z.object({ slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "slug 只能用小寫字母、數字與連字號"), title: z.string().min(1), group: groupSchema.optional(), words: z.array(wordSchema).min(1) });

function normalize(form: string) {
  return form.trim().toLowerCase();
}

async function main() {
  const path = process.argv[2];
  if (!path) throw new Error("Usage: tsx scripts/vocab/add-unit.ts <word-list.json>");
  const raw = JSON.parse(await readFile(path, "utf8"));
  const { slug: courseSlug, title: courseTitle, group, words } = unitSchema.parse(raw);

  const { db, pool } = await import("../../src/db/client");
  const s = await import("../../src/db/schema");
  const { and, eq, inArray } = await import("drizzle-orm");

  try {
    const [learningPath] = await db.select().from(s.learningPaths).limit(1);
    if (!learningPath) throw new Error("No learning path found; run pnpm db:seed first.");
    const [userLearningPath] = await db.select().from(s.userLearningPaths).where(eq(s.userLearningPaths.learningPathId, learningPath.id)).limit(1);
    if (!userLearningPath) throw new Error("No user learning path found; run pnpm db:seed first.");

    let [course] = await db.select().from(s.courses).where(and(eq(s.courses.learningPathId, learningPath.id), eq(s.courses.slug, courseSlug))).limit(1);
    if (!course) [course] = await db.insert(s.courses).values({ learningPathId: learningPath.id, slug: courseSlug, title: courseTitle }).returning();

    // 跨課程重複字：不再自動跳過，一律先攔下來回報，由人來決定要不要繼續（加 --allow-duplicates 略過）
    const normalizedForms = [...new Set(words.map((word) => normalize(word.form)))];
    const existingLexemes = normalizedForms.length
      ? await db.select({ id: s.lexemes.id, canonicalForm: s.lexemes.canonicalForm }).from(s.lexemes).where(and(eq(s.lexemes.languageId, learningPath.targetLanguageId), inArray(s.lexemes.normalizedForm, normalizedForms)))
      : [];
    if (existingLexemes.length && !process.argv.includes("--allow-duplicates")) {
      const duplicates: { form: string; courses: string[] }[] = [];
      for (const lexeme of existingLexemes) {
        const usages = await db.select({ courseId: s.courses.id, courseTitle: s.courses.title })
          .from(s.lexemeSenses)
          .innerJoin(s.lessonVocabulary, eq(s.lessonVocabulary.lexemeSenseId, s.lexemeSenses.id))
          .innerJoin(s.learningUnits, eq(s.learningUnits.id, s.lessonVocabulary.learningUnitId))
          .innerJoin(s.courseVersions, eq(s.courseVersions.id, s.learningUnits.courseVersionId))
          .innerJoin(s.courses, eq(s.courses.id, s.courseVersions.courseId))
          .where(eq(s.lexemeSenses.lexemeId, lexeme.id));
        const otherCourses = [...new Set(usages.filter((u) => u.courseId !== course.id).map((u) => u.courseTitle))];
        if (otherCourses.length) duplicates.push({ form: lexeme.canonicalForm, courses: otherCourses });
      }
      if (duplicates.length) {
        console.error(`發現 ${duplicates.length} 個字已存在於其他課程，先跟使用者確認要不要匯入：`);
        for (const d of duplicates) console.error(`  - ${d.form}（已存在於：${d.courses.join("、")}）`);
        console.error("確認後可加上 --allow-duplicates 參數重新執行以繼續匯入。");
        process.exitCode = 1;
        return;
      }
    }

    if (group) {
      let [vocabGroup] = await db.select().from(s.vocabGroups).where(eq(s.vocabGroups.slug, group.slug)).limit(1);
      if (!vocabGroup) [vocabGroup] = await db.insert(s.vocabGroups).values({ slug: group.slug, title: group.title, position: 2 }).returning();
      await db.insert(s.vocabGroupMembers).values({ groupId: vocabGroup.id, sourceKey: course.id }).onConflictDoUpdate({ target: s.vocabGroupMembers.sourceKey, set: { groupId: vocabGroup.id } });
    }

    let [version] = await db.select().from(s.courseVersions).where(and(eq(s.courseVersions.courseId, course.id), eq(s.courseVersions.version, 1))).limit(1);
    if (!version) [version] = await db.insert(s.courseVersions).values({ courseId: course.id, version: 1 }).returning();

    let [unit] = await db.select().from(s.learningUnits).where(eq(s.learningUnits.courseVersionId, version.id)).limit(1);
    if (!unit) {
      const existingPositions = await db.select({ position: s.learningUnits.position }).from(s.learningUnits);
      const nextPosition = (existingPositions.length ? Math.max(...existingPositions.map((row) => row.position)) : 0) + 1;
      [unit] = await db.insert(s.learningUnits).values({ courseVersionId: version.id, position: nextPosition, title: courseTitle, estimatedSeconds: 180 }).returning();
    }

    for (let index = 0; index < words.length; index++) {
      const word = words[index];
      const normalizedForm = normalize(word.form);

      let [lexeme] = await db.select().from(s.lexemes).where(and(eq(s.lexemes.languageId, learningPath.targetLanguageId), eq(s.lexemes.normalizedForm, normalizedForm))).limit(1);
      if (!lexeme) [lexeme] = await db.insert(s.lexemes).values({ languageId: learningPath.targetLanguageId, canonicalForm: word.form, normalizedForm, type: word.partOfSpeech === "phrase" ? "phrase" : "word", metadata: { source: "LaLea authored prototype" } }).returning();

      let [sense] = await db.select().from(s.lexemeSenses).where(and(eq(s.lexemeSenses.lexemeId, lexeme.id), eq(s.lexemeSenses.definition, word.definition))).limit(1);
      if (!sense) [sense] = await db.insert(s.lexemeSenses).values({ lexemeId: lexeme.id, partOfSpeech: word.partOfSpeech, definitionLanguageId: learningPath.targetLanguageId, definition: word.definition, status: "approved", source: { type: "project_authored" } }).returning();

      if (word.note) {
        await db.insert(s.senseTranslations).values({ lexemeSenseId: sense.id, languageId: learningPath.supportLanguageId, translation: word.translation, usageNote: word.note, status: "approved" }).onConflictDoUpdate({ target: [s.senseTranslations.lexemeSenseId, s.senseTranslations.languageId, s.senseTranslations.translation], set: { usageNote: word.note } });
      } else {
        await db.insert(s.senseTranslations).values({ lexemeSenseId: sense.id, languageId: learningPath.supportLanguageId, translation: word.translation, status: "approved" }).onConflictDoNothing();
      }
      await db.insert(s.vocabularyExamples).values({ lexemeSenseId: sense.id, textLanguageId: learningPath.targetLanguageId, text: word.example, translationLanguageId: learningPath.supportLanguageId, translation: word.exampleTranslation, status: "approved", source: { type: "project_authored" } }).onConflictDoNothing();
      await db.insert(s.lessonVocabulary).values({ learningUnitId: unit.id, lexemeSenseId: sense.id, position: index + 1 }).onConflictDoNothing();
      await db.insert(s.userVocabulary).values({ userLearningPathId: userLearningPath.id, lexemeSenseId: sense.id, status: "ready_to_learn" }).onConflictDoNothing();

      console.log(`✓ ${word.form}`);
    }

    console.log(`已新增關卡「${courseTitle}」，共 ${words.length} 個字。`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
