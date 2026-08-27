import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

type WordInput = { form: string; partOfSpeech: string; definition: string; translation: string; example: string; exampleTranslation: string };

const courseSlug = "recognition-and-appreciation";
const courseTitle = "頒獎與感謝致詞";
const unitTitle = "頒獎與感謝致詞";

const words: WordInput[] = [
  { form: "certificate", partOfSpeech: "noun", definition: "an official document that proves a fact or achievement", translation: "證書", example: "She received a certificate of completion after the training.", exampleTranslation: "她完成訓練後拿到了結業證書。" },
  { form: "confer", partOfSpeech: "verb", definition: "to formally give an award, honor, or qualification to someone", translation: "頒授；授予", example: "The company will confer an award on employees who show dedication.", exampleTranslation: "公司會將獎項頒發給展現奉獻精神的員工。" },
  { form: "recognition", partOfSpeech: "noun", definition: "public acknowledgment or praise for someone's achievement", translation: "表揚；肯定", example: "She received recognition for her hard work this year.", exampleTranslation: "她今年的努力獲得了肯定。" },
  { form: "participation", partOfSpeech: "noun", definition: "the act of taking part in an activity or event", translation: "參與", example: "Thank you for your participation in this project.", exampleTranslation: "感謝你參與這個專案。" },
  { form: "dedication", partOfSpeech: "noun", definition: "a strong commitment or devotion to a task or purpose", translation: "奉獻；敬業精神", example: "His dedication to the team inspired everyone.", exampleTranslation: "他對團隊的奉獻精神激勵了大家。" },
  { form: "contribute", partOfSpeech: "verb", definition: "to give something, such as effort or ideas, to help achieve a shared goal", translation: "貢獻；付出", example: "Everyone is encouraged to contribute their ideas.", exampleTranslation: "鼓勵每個人貢獻自己的想法。" },
  { form: "embrace", partOfSpeech: "verb", definition: "to accept something willingly and enthusiastically", translation: "欣然接受；擁抱", example: "We should embrace new challenges as they come.", exampleTranslation: "我們應該欣然接受隨之而來的新挑戰。" },
  { form: "look forward to", partOfSpeech: "phrase", definition: "to feel excited about something that is going to happen", translation: "期待", example: "I look forward to working with you on this project.", exampleTranslation: "我期待在這個專案上與你合作。" },
  { form: "opportunity", partOfSpeech: "noun", definition: "a favorable chance to do something", translation: "機會", example: "This is a great opportunity for growth.", exampleTranslation: "這是一個成長的絕佳機會。" },
];

function normalize(form: string) {
  return form.trim().toLowerCase();
}

async function main() {
  const { db, pool } = await import("../../src/db/client");
  const s = await import("../../src/db/schema");
  const { and, eq } = await import("drizzle-orm");

  try {
    const [learningPath] = await db.select().from(s.learningPaths).limit(1);
    if (!learningPath) throw new Error("No learning path found; run pnpm db:seed first.");
    const [userLearningPath] = await db.select().from(s.userLearningPaths).where(eq(s.userLearningPaths.learningPathId, learningPath.id)).limit(1);
    if (!userLearningPath) throw new Error("No user learning path found; run pnpm db:seed first.");

    let [course] = await db.select().from(s.courses).where(and(eq(s.courses.learningPathId, learningPath.id), eq(s.courses.slug, courseSlug))).limit(1);
    if (!course) [course] = await db.insert(s.courses).values({ learningPathId: learningPath.id, slug: courseSlug, title: courseTitle }).returning();

    let [version] = await db.select().from(s.courseVersions).where(and(eq(s.courseVersions.courseId, course.id), eq(s.courseVersions.version, 1))).limit(1);
    if (!version) [version] = await db.insert(s.courseVersions).values({ courseId: course.id, version: 1 }).returning();

    let [unit] = await db.select().from(s.learningUnits).where(eq(s.learningUnits.courseVersionId, version.id)).limit(1);
    if (!unit) {
      const existingPositions = await db.select({ position: s.learningUnits.position }).from(s.learningUnits);
      const nextPosition = (existingPositions.length ? Math.max(...existingPositions.map((row) => row.position)) : 0) + 1;
      [unit] = await db.insert(s.learningUnits).values({ courseVersionId: version.id, position: nextPosition, title: unitTitle, estimatedSeconds: 180 }).returning();
    }

    for (let index = 0; index < words.length; index++) {
      const word = words[index];
      const normalizedForm = normalize(word.form);

      let [lexeme] = await db.select().from(s.lexemes).where(and(eq(s.lexemes.languageId, learningPath.targetLanguageId), eq(s.lexemes.normalizedForm, normalizedForm))).limit(1);
      if (!lexeme) [lexeme] = await db.insert(s.lexemes).values({ languageId: learningPath.targetLanguageId, canonicalForm: word.form, normalizedForm, type: word.partOfSpeech === "phrase" ? "phrase" : "word", metadata: { source: "LaLea authored prototype" } }).returning();

      let [sense] = await db.select().from(s.lexemeSenses).where(and(eq(s.lexemeSenses.lexemeId, lexeme.id), eq(s.lexemeSenses.definition, word.definition))).limit(1);
      if (!sense) [sense] = await db.insert(s.lexemeSenses).values({ lexemeId: lexeme.id, partOfSpeech: word.partOfSpeech, definitionLanguageId: learningPath.targetLanguageId, definition: word.definition, status: "approved", source: { type: "project_authored" } }).returning();

      await db.insert(s.senseTranslations).values({ lexemeSenseId: sense.id, languageId: learningPath.supportLanguageId, translation: word.translation, status: "approved" }).onConflictDoNothing();
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
