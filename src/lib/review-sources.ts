import { db } from "@/db/client";
import { courseVersions,courses,learningUnits,lessonVocabulary,userLearningPaths,vocabGroupMembers,vocabGroups } from "@/db/schema";
import { eq,inArray } from "drizzle-orm";

export const MANUAL_SOURCE_KEY = "manual";
export const MANUAL_SOURCE_LABEL = "自建詞彙";
export const CUSTOM_GROUP_SLUG = "custom";
export const CUSTOM_GROUP_TITLE = "自定義";

// Every 關卡 (source) must belong to a 課程 (group). Anything not yet explicitly organized
// falls into "自定義" by default so nothing becomes invisible; add-unit.ts can assign a
// different group up front, and this only needs to backfill what it didn't specify.
export async function ensureGroupAssignments(sourceKeys: string[]) {
  const keys = [...new Set(sourceKeys)];
  if (!keys.length) return new Map<string, string>();

  const existing = await db.select().from(vocabGroupMembers).where(inArray(vocabGroupMembers.sourceKey, keys));
  const assigned = new Map(existing.map((row) => [row.sourceKey, row.groupId]));
  const missing = keys.filter((key) => !assigned.has(key));
  if (missing.length) {
    let [customGroup] = await db.select().from(vocabGroups).where(eq(vocabGroups.slug, CUSTOM_GROUP_SLUG)).limit(1);
    if (!customGroup) [customGroup] = await db.insert(vocabGroups).values({ slug: CUSTOM_GROUP_SLUG, title: CUSTOM_GROUP_TITLE, position: 1 }).onConflictDoNothing().returning();
    if (!customGroup) [customGroup] = await db.select().from(vocabGroups).where(eq(vocabGroups.slug, CUSTOM_GROUP_SLUG)).limit(1);
    await db.insert(vocabGroupMembers).values(missing.map((sourceKey) => ({ groupId: customGroup.id, sourceKey }))).onConflictDoNothing();
    for (const key of missing) assigned.set(key, customGroup.id);
  }
  return assigned;
}

export async function loadCourseSources(userId: string) {
  const rows = await db.select({ lexemeSenseId: lessonVocabulary.lexemeSenseId, courseId: courses.id, courseTitle: courses.title })
    .from(lessonVocabulary)
    .innerJoin(learningUnits, eq(lessonVocabulary.learningUnitId, learningUnits.id))
    .innerJoin(courseVersions, eq(learningUnits.courseVersionId, courseVersions.id))
    .innerJoin(courses, eq(courseVersions.courseId, courses.id))
    .innerJoin(userLearningPaths, eq(courses.learningPathId, userLearningPaths.learningPathId))
    .where(eq(userLearningPaths.userId, userId));

  const bySense = new Map<string, { key: string; label: string }>();
  const courseLabels = new Map<string, string>();
  for (const row of rows) {
    if (!bySense.has(row.lexemeSenseId)) bySense.set(row.lexemeSenseId, { key: row.courseId, label: row.courseTitle });
    courseLabels.set(row.courseId, row.courseTitle);
  }
  return { bySense, courseLabels };
}

export function sourceFor(bySense: Map<string, { key: string; label: string }>, lexemeSenseId: string) {
  return bySense.get(lexemeSenseId) ?? { key: MANUAL_SOURCE_KEY, label: MANUAL_SOURCE_LABEL };
}
